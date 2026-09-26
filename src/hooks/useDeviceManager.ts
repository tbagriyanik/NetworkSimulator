import { useState, useCallback, useEffect, useRef } from 'react';
import { SwitchState, SwitchModel } from '@/lib/network/types';
import { createInitialState, createInitialRouterState, createInitialFirewallState, createInitialWLCState, applyStartupConfig } from '@/lib/network/initialState';
import { buildRunningConfig } from '@/lib/network/core/configBuilder';
import type { TerminalOutput } from '@/components/network/Terminal';
import { BOOT_PROGRESS_MARKER } from '@/components/network/Terminal';
import { CanvasDevice, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { useLanguage } from '@/contexts/LanguageContext';

import { logger } from '@/lib/logger';
import { safeGetItem } from '@/lib/storage/safeStorage';

import { runFhrpElection } from '@/lib/network/fhrp';
import { isSwitchDeviceType, resolveSwitchBootType } from './deviceManager.rules';
import { useDeviceManagerHelpers } from './useDeviceManagerHelpers';
import { getDefaultDeviceName, getDefaultDeviceModel, resolvePowerOnModel, PCOutputLine } from './deviceManager/deviceManagerDefaults';
import { useDeviceCommandHandler } from './deviceManager/useDeviceCommandHandler';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type { PCOutputLine };

export function useDeviceManager() {
  const { language } = useLanguage();
  const { getBootMessage, ensureSwitchModelConsistency } = useDeviceManagerHelpers();

  const [deviceStates, rawSetDeviceStates] = useState<Map<string, SwitchState>>(new Map());
  const setDeviceStates = useCallback((updater: Map<string, SwitchState> | ((prev: Map<string, SwitchState>) => Map<string, SwitchState>)) => {
    rawSetDeviceStates(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return runFhrpElection(next);
    });
  }, []);
  const deviceStatesRef = useRef<Map<string, SwitchState>>(deviceStates);
  useEffect(() => { deviceStatesRef.current = deviceStates; }, [deviceStates]);

  const [deviceOutputs, setDeviceOutputs] = useState<Map<string, TerminalOutput[]>>(() => new Map());

  const [pcOutputs, setPcOutputs] = useState<Map<string, PCOutputLine[]>>(new Map());
  const [pcHistories, setPcHistories] = useState<Map<string, string[]>>(new Map());

  // Handle initial hydration safely to avoid SSR mismatches
  useEffect(() => {
    try {
      const savedData = safeGetItem('netsim_autosave');
      if (savedData) {
        const projectData = JSON.parse(savedData);

        if (projectData.pcOutputs && Array.isArray(projectData.pcOutputs)) {
          const newPcOutputs = new Map<string, PCOutputLine[]>();
          projectData.pcOutputs.forEach((item: { id: string; outputs: PCOutputLine[] }) => {
            newPcOutputs.set(item.id, item.outputs || []);
          });
          setPcOutputs(newPcOutputs);
        }

        if (projectData.pcHistories && Array.isArray(projectData.pcHistories)) {
          const newPcHistories = new Map<string, string[]>();
          projectData.pcHistories.forEach((item: { id: string; history: string[] }) => {
            newPcHistories.set(item.id, item.history || []);
          });
          setPcHistories(newPcHistories);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; message: string; action: string; onConfirm: () => void; } | null>(null);

  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Listen for power toggle events from topology and handle device reset
  useEffect(() => {
    const handlePowerToggle = (event: CustomEvent<{ deviceId: string; nextStatus: 'online' | 'offline'; switchModel?: string; deviceType?: DeviceType }>) => {
      const { deviceId, nextStatus, switchModel: incomingModel, deviceType } = event.detail;

      if (nextStatus === 'online') {
        // Non-CLI / end devices should not get switch boot messages or switch state reset
        const isEndDevice = deviceType === 'pc' || deviceId.includes('pc-') ||
          deviceType === 'iot' || deviceId.includes('iot-') ||
          deviceType === 'printer' || deviceId.includes('printer') ||
          deviceType === 'mobile' || deviceId.includes('mobile') ||
          deviceType === 'hub' || deviceId.includes('hub') ||
          deviceType === 'cloud' || deviceId.includes('cloud');

        if (isEndDevice) {
          // Initialize end device outputs if not present
          const existingOutputs = pcOutputs.get(deviceId);
          if (!existingOutputs) {
            setPcOutputs(prev => new Map(prev).set(deviceId, []));
          }
          return;
        }

        // Power on: reset device state and show boot sequence
        const existingState = deviceStates.get(deviceId);
        const isRouter = deviceType === 'router' || deviceId.includes('router') || existingState?.switchLayer === 'L3';
        const isSwitchL3 = deviceType === 'switchL3' || existingState?.switchLayer === 'L3' || existingState?.switchModel === 'NS-L3-24PS';
        const isWLC = deviceType === 'wlc' || deviceId.includes('wlc') || existingState?.switchLayer === 'WLC';
        const isFirewall = deviceType === 'firewall' || deviceId.includes('firewall') || deviceId.includes('fw');

        const switchModel = resolvePowerOnModel(existingState?.switchModel, incomingModel, {
          isWLC,
          isRouterOrL3: isRouter || isSwitchL3,
          isFirewall,
        });
        const baseState = isRouter
          ? createInitialRouterState(existingState?.macAddress)
          : isWLC
            ? createInitialWLCState(existingState?.macAddress)
            : isFirewall
              ? createInitialFirewallState(existingState?.macAddress)
              : createInitialState(existingState?.macAddress, switchModel as 'NS-L2-24TT-L' | 'NS-L3-24PS');

        const startupConfig = existingState?.startupConfig;
        let inferredDeviceType: DeviceType = 'switchL2';
        if (isRouter) inferredDeviceType = 'router';
        else if (isWLC) inferredDeviceType = 'wlc';
        else if (isFirewall) inferredDeviceType = 'firewall';
        const targetDeviceType: DeviceType = (deviceType as DeviceType) || inferredDeviceType;
        const defaultHostname = getDefaultDeviceName(targetDeviceType);
        const hostname = startupConfig ? (existingState?.hostname || defaultHostname) : (existingState?.hostname || defaultHostname);

        const baseIdentityState: SwitchState = {
          ...baseState,
          hostname,
          macAddress: existingState?.macAddress || baseState.macAddress,
          switchModel: switchModel as SwitchModel,
          switchLayer: baseState.switchLayer,
          version: existingState?.version || baseState.version,
          flashFiles: existingState?.flashFiles || {},
          flashStartupConfigs: existingState?.flashStartupConfigs || {}
        };

        const restoredState = startupConfig
          ? applyStartupConfig(baseIdentityState, startupConfig)
          : baseIdentityState;

        const reloadedState: SwitchState = {
          ...restoredState,
          startupConfig,
          flashFiles: existingState?.flashFiles || {},
          flashStartupConfigs: existingState?.flashStartupConfigs || {},
          currentMode: 'user',
          currentInterface: undefined,
          selectedInterfaces: undefined,
          currentLine: undefined,
          currentVlan: undefined,
          awaitingPassword: false,
          commandHistory: [],
          historyIndex: -1
        };

        setDeviceStates(prev => new Map(prev).set(deviceId, reloadedState));

        const runBootSequence = async () => {
          setDeviceOutputs(prev => new Map(prev).set(deviceId, [
            { id: `loading-${reloadedState.macAddress}`, type: 'output', content: 'Initializing system...' }
          ]));
          await sleep(600);
          if (!isMounted.current) return;

          const bootInfo = getBootMessage(isWLC ? 'wlc' : isRouter ? 'router' : resolveSwitchBootType(reloadedState.switchModel), reloadedState.switchModel, language);
          const bootTs = 1715600000000;
          const bootOutputs: TerminalOutput[] = [
            { id: `boot-1-${reloadedState.macAddress}`, type: 'output', content: bootInfo.boot1 },
            { id: `boot-2-${reloadedState.macAddress}`, type: 'output', content: bootInfo.boot2 },
            { id: `boot-3-${reloadedState.macAddress}`, type: 'output', content: bootInfo.boot3 },
            ...(reloadedState.bannerMOTD ? [{ id: `banner-${reloadedState.macAddress}`, type: 'output' as const, content: `\n${reloadedState.bannerMOTD}\n` }] : []),
            { id: `boot-ready-${reloadedState.macAddress}-${bootTs}`, type: 'output', content: BOOT_PROGRESS_MARKER }
          ];

          setDeviceOutputs(prev => new Map(prev).set(deviceId, bootOutputs));
        };
        runBootSequence();
      } else {
        setDeviceOutputs(prev => {
          const next = new Map(prev);
          next.set(deviceId, []);
          return next;
        });
      }
    };

    window.addEventListener('trigger-topology-toggle-power', handlePowerToggle as EventListener);
    return () => window.removeEventListener('trigger-topology-toggle-power', handlePowerToggle as EventListener);
  }, [deviceStates, pcOutputs, setDeviceStates, getBootMessage, language]);

  const getOrCreateDeviceState = useCallback((deviceId: string, deviceType: DeviceType, initialHostname?: string, initialMac?: string, switchModel?: string, initialServices?: CanvasDevice['services']): SwitchState => {
    if (!deviceId || deviceId.trim() === '') {
      logger.warn('Attempted to create device state with empty ID');
      return createInitialState(initialMac || '', 'NS-L2-24TT-L');
    }

    let deviceState = deviceStates.get(deviceId);
    const defaultName = getDefaultDeviceName(deviceType);

    if (!deviceState) {
      const model = switchModel || getDefaultDeviceModel(deviceType);

      let newState: SwitchState;
      if (deviceType === 'firewall') {
        newState = createInitialFirewallState(initialMac);
      } else if (deviceType === 'router') {
        newState = createInitialRouterState(initialMac);
      } else if (deviceType === 'wlc') {
        newState = createInitialWLCState(initialMac);
      } else {
        newState = createInitialState(initialMac, model as 'NS-L2-24TT-L' | 'NS-L3-24PS');
      }

      let hostname = initialHostname || defaultName;
      if (hostname === 'Switch' && (deviceType === 'hub' || deviceType === 'cloud' || deviceType === 'printer' || deviceType === 'mobile')) {
        hostname = defaultName;
      }
      const stateDeviceType = ((deviceType === 'switchL2' || deviceType === 'switchL3') ? 'switch' : deviceType) as SwitchState['deviceType'];
      newState = { ...newState, hostname, deviceType: stateDeviceType };
      if (deviceType === 'hub' || deviceType === 'cloud' || deviceType === 'printer' || deviceType === 'mobile') {
        const { switchModel: _removedSwitchModel, ...newStateWithoutModel } = newState;
        newState = { ...newStateWithoutModel, switchModel: 'NS-L2-24TT-L', hostname, deviceType: stateDeviceType };
      }

      if (initialServices?.http && stateDeviceType === 'pc') {
        newState = {
          ...newState,
          services: {
            ...newState.services,
            http: {
              ...newState.services?.http,
              ...initialServices.http,
            },
          },
        };
      }

      if (deviceType === 'iot' && newState.ports['wlan0']) {
        newState = {
          ...newState,
          ports: {
            ...newState.ports,
            wlan0: {
              ...newState.ports['wlan0'],
              wifi: {
                ...newState.ports['wlan0'].wifi,
                ssid: newState.ports['wlan0'].wifi?.ssid || '',
                security: newState.ports['wlan0'].wifi?.security || 'open',
                password: newState.ports['wlan0'].wifi?.password || '',
                channel: newState.ports['wlan0'].wifi?.channel || '2.4GHz',
                mode: 'client',
                hidden: false
              }
            }
          }
        };
      }

      newState = { ...newState, runningConfig: buildRunningConfig(newState) };

      const finalState = newState;
      setTimeout(() => {
        if (isMounted.current) {
          setDeviceStates(prev => new Map(prev).set(deviceId, finalState));
        }
      }, 0);
      deviceState = newState;
    } else {
      const stateDeviceType = ((deviceType === 'switchL2' || deviceType === 'switchL3') ? 'switch' : deviceType) as SwitchState['deviceType'];
      if (!deviceState.deviceType || deviceState.deviceType !== stateDeviceType) {
        const updatedState = { ...deviceState, deviceType: stateDeviceType };
        setTimeout(() => {
          if (isMounted.current) {
            setDeviceStates(prev => new Map(prev).set(deviceId, updatedState));
          }
        }, 0);
        deviceState = updatedState;
      }

      if (switchModel && deviceState.switchModel !== switchModel) {
        const updatedState = ensureSwitchModelConsistency(deviceState, switchModel, initialMac, deviceType === 'router' || deviceType === 'wlc');
        setTimeout(() => {
          if (isMounted.current) {
            setDeviceStates(prev => new Map(prev).set(deviceId, updatedState));
          }
        }, 0);
        deviceState = updatedState;
      }

      if (!deviceState.switchModel) {
        const fallbackModel = switchModel || getDefaultDeviceModel(deviceType);
        const updatedState = ensureSwitchModelConsistency(deviceState, fallbackModel, initialMac, deviceType === 'router');
        setTimeout(() => {
          if (isMounted.current) {
            setDeviceStates(prev => new Map(prev).set(deviceId, updatedState));
          }
        }, 0);
        deviceState = updatedState;
      }

      if (isSwitchDeviceType(deviceType) && deviceState.switchModel === 'NS-L3-24PS' && (!deviceState.ports['gi1/1/3'] || !deviceState.ports['gi1/1/4'])) {
        const healedState = ensureSwitchModelConsistency(deviceState, deviceState.switchModel, initialMac, false);
        setTimeout(() => {
          if (isMounted.current) {
            setDeviceStates(prev => new Map(prev).set(deviceId, healedState));
          }
        }, 0);
        deviceState = healedState;
      }

      if (deviceState && initialHostname && (deviceState.hostname === 'Switch' || deviceState.hostname === 'Router') && initialHostname !== deviceState.hostname) {
        const updatedState = { ...deviceState, hostname: initialHostname };
        if (updatedState.runningConfig) {
          updatedState.runningConfig = updatedState.runningConfig.map(line =>
            line.startsWith('hostname') ? `hostname ${initialHostname}` : line
          );
        }
        setTimeout(() => {
          if (isMounted.current) {
            setDeviceStates(prev => new Map(prev).set(deviceId, updatedState));
          }
        }, 0);
        deviceState = updatedState;
      }
    }
    return deviceState;
  }, [deviceStates, ensureSwitchModelConsistency, setDeviceStates]);

  const getOrCreateDeviceOutputs = useCallback((deviceId: string, deviceStateArg?: SwitchState): TerminalOutput[] => {
    let outputs = deviceOutputs.get(deviceId);
    const hasBootMessages = outputs?.some(o => o.id?.startsWith('boot-'));

    if (deviceId.includes('pc-') || deviceId.includes('iot-')) {
      if (!outputs) {
        const emptyOutputs: TerminalOutput[] = [];
        setTimeout(() => {
          if (isMounted.current) {
            setDeviceOutputs(prev => new Map(prev).set(deviceId, emptyOutputs));
          }
        }, 0);
        return emptyOutputs;
      }
      return outputs;
    }

    if (!outputs || !hasBootMessages) {
      const state = deviceStateArg || deviceStates.get(deviceId);
      const isRouter = deviceId.includes('router');
      const isFirewall = deviceId.includes('firewall') || state?.switchLayer === 'FW';
      const isWLC = deviceId.includes('wlc') || state?.switchLayer === 'WLC';
      const inferredDeviceType: Exclude<DeviceType, 'pc'> = isFirewall
        ? 'firewall'
        : isRouter
          ? 'router'
          : isWLC
            ? 'wlc'
            : state?.switchLayer === 'L3'
              ? 'switchL3'
              : 'switchL2';

      const bootInfo = getBootMessage(inferredDeviceType, state?.switchModel, language);
      const fallbackSwitchModel = state?.switchModel || deviceStates.get(deviceId)?.switchModel;
      const fallbackState = state || (isRouter ? createInitialRouterState() : isWLC ? createInitialWLCState() : createInitialState(undefined, fallbackSwitchModel as 'NS-L2-24TT-L' | 'NS-L3-24PS'));
      const suffix = fallbackState?.macAddress || deviceId;

      const newBootMessages: TerminalOutput[] = [
        { id: `boot-1-${suffix}`, type: 'output', content: bootInfo.boot1 },
        { id: `boot-2-${suffix}`, type: 'output', content: bootInfo.boot2 },
        { id: `boot-3-${suffix}`, type: 'output', content: bootInfo.boot3 },
        ...(fallbackState?.bannerMOTD ? [{ id: `banner-${suffix}`, type: 'output' as const, content: `\n${fallbackState.bannerMOTD}\n` }] : []),
        { id: `boot-ready-${suffix}`, type: 'output', content: BOOT_PROGRESS_MARKER }
      ];

      if (outputs && hasBootMessages === false && outputs.length > 0) {
        outputs = [...newBootMessages, ...outputs] as TerminalOutput[];
      } else {
        outputs = newBootMessages;
      }

      const finalOutputs = outputs;
      setTimeout(() => {
        if (isMounted.current) {
          setDeviceOutputs(prev => new Map(prev).set(deviceId, finalOutputs as TerminalOutput[]));
        }
      }, 0);
    }
    return outputs;
  }, [deviceOutputs, deviceStates, getBootMessage, language]);

  const getOrCreatePCOutputs = useCallback((deviceId: string, topologyDevices?: CanvasDevice[]): PCOutputLine[] => {
    let outputs = pcOutputs.get(deviceId);
    if (!outputs) {
      const device = topologyDevices?.find(d => d.id === deviceId);
      outputs = [
        { id: '0', type: 'output', content: 'NOS Network Operation System\n' },
        { id: '1', type: 'output', content: '\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ' + (device?.ip || '0.0.0.0') + '\n   Subnet Mask . . . . . . . . . . : ' + (device?.subnet || '255.255.255.0') + '\n   Default Gateway . . . . . . . . . : ' + (device?.gateway || '0.0.0.0') + '\n' }
      ];
      const finalOutputs = outputs;
      setTimeout(() => {
        if (isMounted.current) {
          setPcOutputs(prev => new Map(prev).set(deviceId, finalOutputs as PCOutputLine[]));
        }
      }, 0);
    }
    return outputs;
  }, [pcOutputs]);

  const { handleCommandForDevice } = useDeviceCommandHandler({
    deviceStatesRef,
    setDeviceStates,
    setDeviceOutputs,
    setIsLoading,
    setConfirmDialog,
    getOrCreateDeviceState,
    getOrCreateDeviceOutputs
  });

  const resetAll = (topologyDevices?: CanvasDevice[]) => {
    const pc1Device = topologyDevices?.find(d => d.id === 'pc-1');
    setDeviceStates(new Map([['switch-1', createInitialState()]]));
    setDeviceOutputs(new Map());
    setPcOutputs(new Map([['pc-1', [
      { id: '0', type: 'output', content: 'NOS Network Operation System\n' },
      { id: '1', type: 'output', content: '\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ' + (pc1Device?.ip || '0.0.0.0') + '\n   Subnet Mask . . . . . . . . . . : ' + (pc1Device?.subnet || '255.255.255.0') + '\n   Default Gateway . . . . . . . . . : ' + (pc1Device?.gateway || '0.0.0.0') + '\n' }
    ]]]));
  };

  return {
    deviceStates,
    setDeviceStates,
    deviceOutputs,
    setDeviceOutputs,
    pcOutputs,
    setPcOutputs,
    pcHistories,
    setPcHistories,
    isLoading,
    confirmDialog,
    setConfirmDialog,
    getOrCreateDeviceState,
    getOrCreateDeviceOutputs,
    getOrCreatePCOutputs,
    handleCommandForDevice,
    resetAll
  };
}
