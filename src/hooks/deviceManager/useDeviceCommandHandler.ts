import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { SwitchState, Port, CommandResult } from '@/lib/network/types';
import { createInitialState, createInitialRouterState, applyStartupConfig, buildStartupConfig } from '@/lib/network/initialState';
import { buildRunningConfig } from '@/lib/network/core/configBuilder';
import { executeCommand, getPrompt } from '@/lib/network/executor';
import type { TerminalOutput } from '@/components/network/Terminal';
import { BOOT_PROGRESS_MARKER } from '@/components/network/Terminal';
import { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { isSwitchDeviceType, resolveSwitchBootType } from '../deviceManager.rules';
import { useDeviceManagerHelpers } from '../useDeviceManagerHelpers';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface UseDeviceCommandHandlerProps {
  deviceStatesRef: React.MutableRefObject<Map<string, SwitchState>>;
  setDeviceStates: (updater: Map<string, SwitchState> | ((prev: Map<string, SwitchState>) => Map<string, SwitchState>)) => void;
  setDeviceOutputs: React.Dispatch<React.SetStateAction<Map<string, TerminalOutput[]>>>;
  setIsLoading: (loading: boolean) => void;
  setConfirmDialog: (dialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null) => void;
  getOrCreateDeviceState: (deviceId: string, deviceType: DeviceType, initialHostname?: string, initialMac?: string, switchModel?: string, initialServices?: CanvasDevice['services']) => SwitchState;
  getOrCreateDeviceOutputs: (deviceId: string, deviceStateArg?: SwitchState) => TerminalOutput[];
}

export function useDeviceCommandHandler({
  deviceStatesRef,
  setDeviceStates,
  setDeviceOutputs,
  setIsLoading,
  setConfirmDialog,
  getOrCreateDeviceState,
  getOrCreateDeviceOutputs,
}: UseDeviceCommandHandlerProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { getBootMessage } = useDeviceManagerHelpers();

  const handleCommandForDevice = useCallback(async function execute(
    deviceId: string,
    command: string,
    topologyDevices: CanvasDevice[] | null,
    setActiveDeviceId: (id: string) => void,
    setActiveDeviceType: (type: DeviceType) => void,
    topologyConnections: CanvasConnection[] | null = null,
    skipConfirm = false
  ): Promise<unknown> {
    // Handle cancellation token
    if (command === '__CANCEL__') {
      setIsLoading(false);
      getOrCreateDeviceOutputs(deviceId);
      setDeviceOutputs(prev => {
        const newMap = new Map(prev);
        const outputs = newMap.get(deviceId) || [];
        newMap.set(deviceId, [
          ...outputs,
          {
            id: `${Date.now()}-cancel`,
            type: 'output',
            content: language === 'tr' ? '\n^C\nKomut iptal edildi.' : '\n^C\nCommand cancelled.',
            timestamp: Date.now()
          }
        ]);
        return newMap;
      });
      return { success: false, error: 'Cancelled' };
    }

    if (command.includes('\n')) {
      for (const line of command.split('\n').filter(l => l.trim())) {
        await execute(deviceId, line.trim(), topologyDevices, setActiveDeviceId, setActiveDeviceType, topologyConnections, skipConfirm);
      }
      return { success: true };
    }

    setIsLoading(true);
    try {
      // Use deviceStatesRef to get fresh state
      const deviceState = deviceStatesRef.current.get(deviceId) || (deviceId.includes('router') ? createInitialRouterState() : createInitialState());
      const devicePrompt = getPrompt(deviceState);
      const result = executeCommand(
        deviceState,
        command,
        language,
        topologyDevices ?? undefined,
        topologyConnections ?? undefined,
        deviceStatesRef.current,
        deviceId,
        skipConfirm
      );

      const { requiresConfirmation, confirmationMessage, confirmationAction, success, newState, error, triggerPingAnimation, deviceStates: resultDeviceStates, updatedDeviceStates } = result as CommandResult;
      const trimmedCommand = command.trim().toLowerCase();
      const isInternalCommand = command === '__CONSOLE_CONNECT__';

      // Handle cross-device state updates (e.g., port security violations)
      if (resultDeviceStates && resultDeviceStates instanceof Map && resultDeviceStates !== deviceStatesRef.current) {
        setDeviceStates(resultDeviceStates);
      }

      if (requiresConfirmation && !skipConfirm) {
        setIsLoading(false);
        setConfirmDialog({
          show: true,
          message: confirmationMessage || 'Are you sure?',
          action: confirmationAction || command,
          onConfirm: () => {
            setConfirmDialog(null);
            execute(deviceId, command, topologyDevices, setActiveDeviceId, setActiveDeviceType, topologyConnections, true);
          }
        });

        if (triggerPingAnimation) {
          window.dispatchEvent(new CustomEvent('trigger-ping-animation', {
            detail: { sourceId: deviceId, targetId: triggerPingAnimation, openPacketPanel: false }
          }));
        }

        return result;
      }

      // Check if command is VLAN-related
      const isVlanCommand = /^vlan\s+\d+$|^no\s+vlan\s+\d+$|^name\s+.+$|^state\s+(active|suspend)$/i.test(trimmedCommand);

      const newOutputs: TerminalOutput[] = [];
      const now = Date.now();
      if (!isInternalCommand && !deviceState.awaitingPassword && !deviceState.awaitingConfigSource) {
        newOutputs.push({ id: now.toString(), type: 'command', content: command, prompt: devicePrompt, timestamp: now });
      }

      if (success) {
        if (result.requiresPassword && result.passwordPrompt) {
          newOutputs.push({ id: `${now}-pw`, type: 'password-prompt', content: result.passwordPrompt, timestamp: now });
        } else if (result.output) {
          newOutputs.push({
            id: `${now}-out`,
            type: 'output',
            content: result.output,
            timestamp: now,
            realismLevel: result.realismLevel,
            hint: result.hint
          });
        }

        // Apply updatedDeviceStates if present (for global STP recalculation)
        if (updatedDeviceStates && updatedDeviceStates instanceof Map) {
          setDeviceStates(prev => {
            const next = new Map(prev);
            updatedDeviceStates.forEach((state, id: string) => {
              next.set(id, state);
            });
            return next;
          });
        }

        if (newState) {
          const currentState = deviceStatesRef.current.get(deviceId) || deviceState;
          if (newState.hostname && newState.hostname !== currentState.hostname) {
            window.dispatchEvent(new CustomEvent('update-topology-device-config', {
              detail: { deviceId, config: { name: newState.hostname } }
            }));
          }

          const shouldPropagateVlans = !!topologyConnections && !!topologyDevices && (
            /^(no\s+)?vlan\s+\d+/i.test(command.trim()) ||
            /^switchport\s+access\s+vlan\s+\d+/i.test(command.trim())
          );
          setDeviceStates(prev => {
            const next = new Map(prev);
            const current = deviceStatesRef.current.get(deviceId) || deviceState;
            const mergedState = { ...current, ...newState, runningConfig: buildRunningConfig({ ...current, ...newState }) };
            next.set(deviceId, mergedState);
            deviceStatesRef.current = next;

            if (shouldPropagateVlans) {
              const beforeVlans = new Set(Object.keys(currentState.vlans || {}).map(Number));
              const afterVlans = new Set(Object.keys(mergedState.vlans || {}).map(Number));
              const addedVlans = Array.from(afterVlans).filter(v => !beforeVlans.has(v));
              const removedVlans = Array.from(beforeVlans).filter(v => !afterVlans.has(v));

              const sourceDevice = topologyDevices.find(d => d.id === deviceId);
              if (isSwitchDeviceType(sourceDevice?.type)) {
                const sourceMode = mergedState.vtpMode;
                if (sourceMode !== 'transparent' && sourceMode !== 'off' && sourceMode !== 'client') {
                  const sourceDomain = mergedState.vtpDomain || '';

                  topologyConnections.forEach(conn => {
                    const isSource = conn.sourceDeviceId === deviceId || conn.targetDeviceId === deviceId;
                    if (!isSource) return;

                    const neighborId = conn.sourceDeviceId === deviceId ? conn.targetDeviceId : conn.sourceDeviceId;
                    const neighborDevice = topologyDevices.find(d => d.id === neighborId);
                    if (!isSwitchDeviceType(neighborDevice?.type)) return;

                    const sourcePortId = conn.sourceDeviceId === deviceId ? conn.sourcePort : conn.targetPort;
                    const neighborPortId = conn.sourceDeviceId === deviceId ? conn.targetPort : conn.sourcePort;
                    const sourcePort = mergedState.ports[sourcePortId];
                    const neighborState = next.get(neighborId);
                    if (!neighborState || !sourcePort) return;

                    const neighborPort = neighborState.ports[neighborPortId];
                    if (!neighborPort) return;

                    if (sourcePort.mode !== 'trunk' || neighborPort.mode !== 'trunk') return;

                    const neighborMode = neighborState.vtpMode;
                    if (neighborMode === 'transparent' || neighborMode === 'off') return;

                    const neighborDomain = neighborState.vtpDomain || '';
                    if (sourceDomain !== neighborDomain) return;

                    const isAllowed = (port: typeof sourcePort, vlanId: number) => {
                      if (!port.allowedVlans || port.allowedVlans === 'all') return true;
                      if (Array.isArray(port.allowedVlans)) return port.allowedVlans.includes(vlanId);
                      return port.allowedVlans.split(',').map(s => parseInt(s.trim(), 10)).includes(vlanId);
                    };

                    const nextVlans = { ...neighborState.vlans };
                    let changed = false;

                    addedVlans.forEach(vlanId => {
                      if (!isAllowed(sourcePort, vlanId) || !isAllowed(neighborPort, vlanId)) return;
                      if (!nextVlans[vlanId]) {
                        nextVlans[vlanId] = { id: vlanId, name: `VLAN${vlanId}`, status: 'active', ports: [] };
                        changed = true;
                      }
                    });

                    removedVlans.forEach(vlanId => {
                      if ([1, 1002, 1003, 1004, 1005].includes(vlanId)) return;
                      if (nextVlans[vlanId]) {
                        delete nextVlans[vlanId];
                        changed = true;
                      }
                    });

                    if (changed) {
                      const nextPorts = { ...neighborState.ports };
                      removedVlans.forEach(vlanId => {
                        Object.values(nextPorts).forEach(port => {
                          if (port.vlan === vlanId) {
                            nextPorts[port.id] = { ...port, vlan: 1 };
                          }
                        });
                      });
                      next.set(neighborId, { ...neighborState, vlans: nextVlans, ports: nextPorts });
                    }
                  });
                }
              }
            }

            return next;
          });

          if (isVlanCommand && topologyDevices && topologyConnections) {
            window.dispatchEvent(new CustomEvent('vtp-propagation-needed', {
              detail: { deviceId, topologyDevices, topologyConnections, deviceStates: deviceStatesRef.current }
            }));
          }
        }
        if (result.saveConfig) {
          setDeviceStates(prev => {
            const next = new Map(prev);
            const current = next.get(deviceId);
            if (current) {
              next.set(deviceId, { ...current, startupConfig: buildStartupConfig(current) });
            }
            return next;
          });

          const device = topologyDevices?.find(d => d.id === deviceId);
          const deviceName = device?.name || deviceId;
          const timestamp = new Date().toLocaleString();

          toast({
            title: language === 'tr' ? 'YapÄ±landÄ±rma Kaydedildi' : 'Configuration Saved',
            description: language === 'tr'
              ? `${deviceName} - running-config â†’ startup-config (${timestamp})`
              : `${deviceName} - running-config â†’ startup-config (${timestamp})`,
            variant: 'default'
          });
        }
        if (result.saveFlashConfig) {
          const flashFilename = (result.flashFilename || 'running-config').trim();
          setDeviceStates(prev => {
            const next = new Map(prev);
            const current = next.get(deviceId);
            if (current) {
              const flashFiles = { ...current.flashFiles };
              const flashStartupConfigs = { ...current.flashStartupConfigs };
              flashFiles[flashFilename] = buildRunningConfig(current);
              flashStartupConfigs[flashFilename] = buildStartupConfig(current);
              next.set(deviceId, { ...current, flashFiles, flashStartupConfigs });
            }
            return next;
          });

          const device = topologyDevices?.find(d => d.id === deviceId);
          const deviceName = device?.name || deviceId;
          const timestamp = new Date().toLocaleString();

          toast({
            title: language === 'tr' ? 'Flash KaydÄ± TamamlandÄ±' : 'Flash Save Complete',
            description: language === 'tr'
              ? `${deviceName} - running-config â†’ flash:${flashFilename} (${timestamp})`
              : `${deviceName} - running-config â†’ flash:${flashFilename} (${timestamp})`,
            variant: 'default'
          });
        }
        if (result.restoreFlashConfig) {
          const sourceFilename = (result.flashSourceFilename || 'running-config').trim();
          const currentState = deviceStatesRef.current.get(deviceId);
          const startupFromFlash = currentState?.flashStartupConfigs?.[sourceFilename];
          const restored = !!(currentState && startupFromFlash);

          if (restored) {
            setDeviceStates(prev => {
              const next = new Map(prev);
              const current = next.get(deviceId);
              if (current && startupFromFlash) {
                next.set(deviceId, { ...current, startupConfig: startupFromFlash });
              }
              return next;
            });
          }

          const device = topologyDevices?.find(d => d.id === deviceId);
          const deviceName = device?.name || deviceId;
          const timestamp = new Date().toLocaleString();

          if (restored) {
            toast({
              title: language === 'tr' ? 'Flash Geri YÃ¼kleme TamamlandÄ±' : 'Flash Restore Complete',
              description: language === 'tr'
                ? `${deviceName} - flash:${sourceFilename} â†’ startup-config (${timestamp})`
                : `${deviceName} - flash:${sourceFilename} â†’ startup-config (${timestamp})`,
              variant: 'default'
            });
          } else {
            toast({
              title: language === 'tr' ? 'Flash DosyasÄ± BulunamadÄ±' : 'Flash File Not Found',
              description: language === 'tr'
                ? `${deviceName} Ã¼zerinde flash:${sourceFilename} bulunamadÄ±`
                : `flash:${sourceFilename} was not found on ${deviceName}`,
              variant: 'destructive'
            });
          }
        }
        if (result.eraseConfig) {
          setDeviceStates(prev => {
            const next = new Map(prev);
            const current = next.get(deviceId);
            if (current) {
              next.set(deviceId, {
                ...current,
                startupConfig: undefined,
                commandHistory: [],
                historyIndex: -1,
                awaitingPassword: false,
                passwordContext: undefined,
              });
            }
            return next;
          });

          const device = topologyDevices?.find(d => d.id === deviceId);
          const deviceName = device?.name || deviceId;
          const timestamp = new Date().toLocaleString();

          toast({
            title: language === 'tr' ? 'YapÄ±landÄ±rma Silindi' : 'Configuration Erased',
            description: language === 'tr'
              ? `${deviceName} - startup-config silindi (${timestamp})`
              : `${deviceName} - startup-config erased (${timestamp})`,
            variant: 'destructive'
          });

          setDeviceOutputs(prev => new Map(prev).set(deviceId, []));
        }
        if (result.deleteVlanDat) {
          setDeviceStates(prev => {
            const next = new Map(prev);
            const current = next.get(deviceId);
            if (current) {
              next.set(deviceId, {
                ...current,
                vlans: { '1': { id: 1, name: 'default', status: 'active', ports: [] } },
                ports: Object.fromEntries(
                  Object.entries(current.ports || {}).map(([key, port]: [string, Port]) => [
                    key,
                    { ...port, vlan: port.vlan !== undefined ? 1 : undefined }
                  ])
                ) as Record<string, Port>
              });
            }
            return next;
          });

          const device = topologyDevices?.find(d => d.id === deviceId);
          const deviceName = device?.name || deviceId;

          toast({
            title: language === 'tr' ? 'VLAN VeritabanÄ± Silindi' : 'VLAN Database Deleted',
            description: language === 'tr'
              ? `${deviceName} - vlan.dat silindi`
              : `${deviceName} - vlan.dat deleted`,
          });
        }
        if (result.reloadDevice) {
          const baseState = deviceId.includes('router')
            ? createInitialRouterState(deviceState.macAddress)
            : createInitialState(deviceState.macAddress, deviceState.switchModel as 'NS-L2-24TT-L' | 'NS-L3-24PS');
          const startupConfig = deviceState.startupConfig;
          const hasStartupConfig = !!startupConfig;
          const baseIdentityState = {
            ...baseState,
            hostname: hasStartupConfig ? deviceState.hostname : baseState.hostname,
            macAddress: deviceState.macAddress,
            version: deviceState.version,
            flashFiles: deviceState.flashFiles || {},
            flashStartupConfigs: deviceState.flashStartupConfigs || {}
          };
          const appliedState = hasStartupConfig
            ? applyStartupConfig(baseIdentityState, startupConfig)
            : baseIdentityState;
          const reloadedState = {
            ...appliedState,
            startupConfig: deviceState.startupConfig,
            flashFiles: deviceState.flashFiles || {},
            flashStartupConfigs: deviceState.flashStartupConfigs || {},
            sdmPreferConfigured: deviceState.sdmPreferConfigured,
            sdmTemplate: deviceState.sdmTemplate,
            reloaded: deviceState.sdmPreferConfigured ? true : undefined,
            currentMode: 'user' as const,
            currentInterface: undefined,
            selectedInterfaces: undefined,
            currentLine: undefined,
            currentVlan: undefined,
            awaitingPassword: false,
            commandHistory: [],
            historyIndex: -1
          };
          setDeviceStates(prev => new Map(prev).set(deviceId, reloadedState));
          const isRouter = deviceId.includes('router');
          const isWLC = deviceId.includes('wlc');
          const bootInfo = getBootMessage(isWLC ? 'wlc' : isRouter ? 'router' : resolveSwitchBootType(reloadedState.switchModel), reloadedState.switchModel, language);
          const mac = reloadedState.macAddress;
          const bootTs = Date.now();
          setDeviceOutputs(prev => new Map(prev).set(deviceId, [
            { id: `loading-${mac}`, type: 'output', content: 'Reloading...' }
          ]));
          (async () => {
            await sleep(600);
            const bootOutputs: TerminalOutput[] = [
              { id: `boot-1-${mac}`, type: 'output', content: bootInfo.boot1 },
              { id: `boot-2-${mac}`, type: 'output', content: bootInfo.boot2 },
              { id: `boot-3-${mac}`, type: 'output', content: bootInfo.boot3 },
              ...(reloadedState.bannerMOTD ? [{ id: `banner-${mac}`, type: 'output' as const, content: `\n${reloadedState.bannerMOTD}\n` }] : []),
              { id: `boot-ready-${mac}-${bootTs}`, type: 'output', content: BOOT_PROGRESS_MARKER }
            ];
            setDeviceOutputs(prev => new Map(prev).set(deviceId, bootOutputs));
          })();

          if (triggerPingAnimation) {
            window.dispatchEvent(new CustomEvent('trigger-ping-animation', {
              detail: { sourceId: deviceId, targetId: triggerPingAnimation }
            }));
          }

          return result;
        }

        if (result.telnetTarget && topologyDevices) {
          const telnetTarget = result.telnetTarget;
          const targetDevice = topologyDevices.find(d => d.ip === telnetTarget.host);
          if (targetDevice && targetDevice.type !== 'pc') {
            newOutputs.push({ id: `${now}-telnet`, type: 'output', content: ` Open\n\n**** Connected to ${targetDevice.name} (${telnetTarget.host}) via VTY ****\n`, timestamp: now });
            const targetType = targetDevice.type;
            getOrCreateDeviceState(targetDevice.id, targetType, targetDevice.name, targetDevice.macAddress, targetDevice.switchModel, targetDevice.services);
            getOrCreateDeviceOutputs(targetDevice.id);
            setActiveDeviceId(targetDevice.id);
            setActiveDeviceType(targetType);
          } else {
            newOutputs.push({ id: `${now}-telnet-fail`, type: 'error', content: `\n% Connection timed out; remote host not responding\n`, timestamp: now });
          }
        }
      } else {
        newOutputs.push({ id: `${now}-err`, type: 'error', content: error || 'Unknown error', timestamp: now });
        if (newState) {
          setDeviceStates(prev => new Map(prev).set(deviceId, { ...deviceState, ...newState }));
        }
      }
      if (newOutputs.length > 0) {
        setDeviceOutputs(prev => new Map(prev).set(deviceId, [...(prev.get(deviceId) || []), ...newOutputs]));
      }

      if (triggerPingAnimation) {
        window.dispatchEvent(new CustomEvent('trigger-ping-animation', {
          detail: { sourceId: deviceId, targetId: triggerPingAnimation, openPacketPanel: false }
        }));
      }

      return result;

    } catch (e) {
      const errorMsg = (e as Error).message;
      if (errorMsg.toLowerCase().includes('password') || errorMsg.toLowerCase().includes('auth')) {
        toast({
          title: language === 'tr' ? 'Hata' : 'Error',
          description: language === 'tr' ? 'Konsol ÅŸifresi hatalÄ±!' : 'Invalid console password!',
          variant: 'destructive',
        });
      }
      setDeviceOutputs(prev => new Map(prev).set(deviceId, [...(prev.get(deviceId) || []), { id: `${Date.now()}-sys-err`, type: 'error', content: `System error: ${errorMsg}`, timestamp: Date.now() }]));
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [
    deviceStatesRef,
    getOrCreateDeviceOutputs,
    getOrCreateDeviceState,
    language,
    setConfirmDialog,
    setDeviceOutputs,
    setDeviceStates,
    setIsLoading,
    toast,
    getBootMessage
  ]);

  return { handleCommandForDevice };
}
