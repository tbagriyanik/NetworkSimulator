'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from "@/hooks/use-toast";
import { safeParse, safeStringify } from '@/lib/network/serialization';
import { errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';
import { BOOT_PROGRESS_MARKER } from '@/components/network/Terminal';
import type { TerminalOutput } from '@/components/network/Terminal';
import type { CanvasDevice, CanvasConnection, CanvasNote, DeviceType } from '@/components/network/networkTopology.types';
import type { SwitchState, CableInfo } from '@/lib/network/types';
import type { Translations } from '@/contexts/LanguageContext';

interface PCOutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success';
  content: string;
}

interface ProjectPersistenceOptions {
  t: Translations;
  language: 'tr' | 'en';
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  topologyNotes: CanvasNote[];
  deviceStates: Map<string, SwitchState>;
  deviceOutputs: Map<string, TerminalOutput[]>;
  pcOutputs: Map<string, PCOutputLine[]>;
  pcHistories: Map<string, string[]>;
  cableInfo: CableInfo;
  activeDeviceId: string;
  activeDeviceType: DeviceType;
  activeTab: string;
  zoom: number;
  pan: { x: number; y: number };
  normalizeDeviceType: (type: string) => DeviceType;
  applyLinkLocalToUnconfiguredHosts: (devices: CanvasDevice[]) => CanvasDevice[];
  // Setters
  setDeviceStates: (states: Map<string, SwitchState>) => void;
  setDeviceOutputs: (outputs: Map<string, TerminalOutput[]>) => void;
  setPcOutputs: (outputs: Map<string, PCOutputLine[]>) => void;
  setPcHistories: (histories: Map<string, string[]>) => void;
  setTopologyDevices: (devices: CanvasDevice[] | ((prev: CanvasDevice[]) => CanvasDevice[])) => void;
  setTopologyConnections: (connections: CanvasConnection[]) => void;
  setTopologyNotes: (notes: CanvasNote[]) => void;
  setCableInfo: (info: CableInfo) => void;
  setActiveDeviceId: (id: string) => void;
  setActiveDeviceType: (type: DeviceType) => void;
  setSelectedDevice: (device: DeviceType | null) => void;
  setActiveTab: (tab: string) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setHasUnsavedChanges: (v: boolean) => void;
  setLastSaveTime: (v: string | null) => void;
  setShowPCPanel: (v: boolean) => void;
  setShowRouterPanel: (v: boolean) => void;
  setShowUnifiedDeviceModal: (v: boolean) => void;
  setRefreshNetworkReport: (v: any) => void;
  setIsAppLoading: (v: boolean) => void;
  resetHistory: (state: any) => void;
  setTopologyKey: (fn: (prev: number) => number) => void;
  handleRefreshNetwork?: () => void;
}

export function useProjectPersistence(options: ProjectPersistenceOptions) {
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    t, language, topologyDevices, topologyConnections, topologyNotes,
    deviceStates, deviceOutputs, pcOutputs, pcHistories,
    cableInfo, activeDeviceId, activeDeviceType, activeTab,
    zoom, pan, normalizeDeviceType, applyLinkLocalToUnconfiguredHosts,
    setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories,
    setTopologyDevices, setTopologyConnections, setTopologyNotes,
    setCableInfo, setActiveDeviceId, setActiveDeviceType, setSelectedDevice,
    setActiveTab, setZoom, setPan, setHasUnsavedChanges, setLastSaveTime,
    setShowPCPanel, setShowRouterPanel, setShowUnifiedDeviceModal,
    setRefreshNetworkReport, setIsAppLoading, resetHistory, setTopologyKey,
    handleRefreshNetwork,
  } = options;

  const loadProjectData = useCallback((projectData: unknown, options?: { keepActiveDevice?: boolean }): boolean => {
    try {
      const shouldKeepActiveDevice = options?.keepActiveDevice === true;
      const data = (projectData && typeof projectData === 'object') ? projectData as Record<string, unknown> : {};
      const topology = (data.topology && typeof data.topology === 'object') ? data.topology as Record<string, unknown> : {};
      const safeDevices = Array.isArray(data.devices) ? data.devices : [];
      const safeDeviceOutputs = Array.isArray(data.deviceOutputs) ? data.deviceOutputs : [];
      const safePcOutputs = Array.isArray(data.pcOutputs) ? data.pcOutputs : [];
      const safePcHistories = Array.isArray(data.pcHistories) ? data.pcHistories : [];
      const safeTopologyDevices = Array.isArray(topology.devices) ? topology.devices : [];
      const safeTopologyConnections = Array.isArray(topology.connections) ? topology.connections : [];
      const safeTopologyNotes = Array.isArray(topology.notes) ? topology.notes : [];
      const safeCableInfo = (data.cableInfo && typeof data.cableInfo === 'object') ? data.cableInfo as Record<string, unknown> : null;
      const safePan = (data.pan && typeof data.pan === 'object') ? data.pan as Record<string, unknown> : null;
      const safeTopologyPan = (topology.pan && typeof topology.pan === 'object') ? topology.pan as Record<string, unknown> : null;
      const resolvedActiveTab = data.activeTab === 'cmd' || data.activeTab === 'terminal' || data.activeTab === 'tasks' || data.activeTab === 'topology'
        ? data.activeTab
        : 'topology';
      const normalizeCableType = (value: unknown): 'straight' | 'crossover' | 'console' | 'wireless' => {
        if (value === 'straight' || value === 'crossover' || value === 'console' || value === 'wireless') return value;
        if (value === 'cross') return 'crossover';
        if (value === 'rollover') return 'console';
        if (value === 'fiber') return 'wireless';
        return 'straight';
      };

      if (safeDevices.length > 0) {
        const newDeviceStates = new Map<string, SwitchState>();
        safeDevices.forEach((item: { id: string; state: SwitchState }) => {
          if (item.id && item.id.trim() !== '') {
            newDeviceStates.set(item.id, item.state);
          }
        });
        setDeviceStates(newDeviceStates);
      }

      if (safeDeviceOutputs.length > 0) {
        const newDeviceOutputs = new Map<string, TerminalOutput[]>();
        safeDeviceOutputs.forEach((item: { id: string; outputs: TerminalOutput[] }) => {
          let outputs = item.outputs || [];
          const stateItem = safeDevices.find((d: any) => d.id === item.id);
          if (stateItem?.state?.bannerMOTD && !outputs.some(o => o.content?.includes(stateItem.state.bannerMOTD))) {
            outputs = [
              { id: 'banner-load-static', type: 'output', content: stateItem.state.bannerMOTD + '\n' },
              ...outputs
            ];
          }
          newDeviceOutputs.set(item.id, outputs);
        });
        setDeviceOutputs(newDeviceOutputs);
      } else if (safeDevices.length > 0) {
        const newDeviceOutputs = new Map<string, TerminalOutput[]>();
        safeDevices.forEach((item: { id: string; state: SwitchState }) => {
          const deviceId = item.id;
          const state = item.state;
          const isRouter = deviceId.includes('router');
          const isL3Switch = state?.switchLayer === 'L3' || state?.switchModel?.includes('3650');
          const isPC = deviceId.includes('pc-');
          const isIoT = deviceId.includes('iot-');

          if (isPC || isIoT) return;

          let bootMessages: TerminalOutput[] = [];
          const suffix = state?.macAddress || deviceId;

          if (isRouter) {
            const syslog = t.syslogStarted;
            bootMessages = [
              { id: `boot-1-${suffix}`, type: 'output', content: `\n\nSystem Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n` },
              { id: `boot-2-${suffix}`, type: 'output', content: `ISR4451/K9 platform with 4096 K bytes of memory\n\n${syslog}\nLoad/bootstrap symbols loaded, GOXR initialization\nReading all bootflash vectors\nPOST: CPU PCIe port Check PASS\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n` },
              { id: `boot-3-${suffix}`, type: 'output', content: `\nBooting flash:c1900-universalk9-mz.SPA.154-3.M.bin...OK!\nExtracting files from flash:c1900-universalk9-mz.SPA.154-3.M.bin...\n  ########## [OK]\n  0 bytes remaining in flash device\n` },
              ...(state?.bannerMOTD ? [{ id: `banner-${suffix}`, type: 'output' as const, content: `\n${state.bannerMOTD}\n` }] : []),
              { id: `boot-ready-${suffix}`, type: 'output', content: BOOT_PROGRESS_MARKER }
            ];
          } else if (isL3Switch) {
            const syslog = t.syslogStarted;
            bootMessages = [
              { id: `boot-1-${suffix}`, type: 'output', content: `\n\nSystem Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n` },
              { id: `boot-2-${suffix}`, type: 'output', content: `C3650 platform with 131072 K bytes of memory\n\n${syslog}\nLoad/bootstrap symbols loaded\nReading all bootflash vectors\nPOST: CPU PCIe port Check PASS\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n` },
              { id: `boot-3-${suffix}`, type: 'output', content: `\nBooting flash:C3650-ipbase-mz.152-2.SE4.bin...OK!\nExtracting files from flash:C3650-ipbase-mz.152-2.SE4.bin...\n  ########## [OK]\n  0 bytes remaining in flash device\n` },
              ...(state?.bannerMOTD ? [{ id: `banner-${suffix}`, type: 'output' as const, content: `\n${state.bannerMOTD}\n` }] : []),
              { id: `boot-ready-${suffix}`, type: 'output', content: BOOT_PROGRESS_MARKER }
            ];
          } else {
            const syslog = t.syslogStarted;
            bootMessages = [
              { id: `boot-1-${suffix}`, type: 'output', content: `\n\nSystem Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n` },
              { id: `boot-2-${suffix}`, type: 'output', content: `C2960 platform with 65536 K bytes of memory\n\n${syslog}\nLoad/bootstrap symbols loaded\nReading all bootflash vectors\nPOST: CPU Ethernet port Check PASS\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n` },
              { id: `boot-3-${suffix}`, type: 'output', content: `\nBooting flash:c2960-lanbase-mz.152-2.E6.bin...OK!\nExtracting files from flash:c2960-lanbase-mz.152-2.E6.bin...\n  ########## [OK]\n  0 bytes remaining in flash device\n` },
              ...(state?.bannerMOTD ? [{ id: `banner-${suffix}`, type: 'output' as const, content: `\n${state.bannerMOTD}\n` }] : []),
              { id: `boot-ready-${suffix}`, type: 'output', content: BOOT_PROGRESS_MARKER }
            ];
          }

          newDeviceOutputs.set(deviceId, bootMessages);
        });
        setDeviceOutputs(newDeviceOutputs);
      }

      if (safePcOutputs.length > 0) {
        const newPcOutputs = new Map<string, PCOutputLine[]>();
        safePcOutputs.forEach((item: { id: string; outputs: PCOutputLine[] }) => {
          newPcOutputs.set(item.id, item.outputs || []);
        });
        setPcOutputs(newPcOutputs);
      }

      if (safePcHistories.length > 0) {
        const newPcHistories = new Map<string, string[]>();
        safePcHistories.forEach((item: { id: string; history: string[] }) => {
          newPcHistories.set(item.id, item.history || []);
        });
        setPcHistories(newPcHistories);
      }

      if (safeTopologyDevices.length > 0 || safeTopologyConnections.length > 0 || safeTopologyNotes.length > 0) {
        const validDevices = safeTopologyDevices.filter(
          (device: CanvasDevice) => device.id && device.id.trim() !== ''
        );
        const normalizedDevices = applyLinkLocalToUnconfiguredHosts(validDevices.map((device: CanvasDevice) => ({
          ...device,
          type: normalizeDeviceType(device.type),
        })));
        setTopologyDevices(normalizedDevices);
        setTopologyConnections(safeTopologyConnections);
        setTopologyNotes(safeTopologyNotes);
        if (typeof topology.zoom === 'number') setZoom(topology.zoom);
        if (safeTopologyPan && typeof safeTopologyPan.x === 'number' && typeof safeTopologyPan.y === 'number') setPan({ x: safeTopologyPan.x, y: safeTopologyPan.y });
      } else {
        setTopologyDevices([]);
        setTopologyConnections([]);
        setTopologyNotes([]);
        setZoom(typeof data.zoom === 'number' ? data.zoom : 1.0);
        setPan(safePan && typeof safePan.x === 'number' && typeof safePan.y === 'number' ? { x: safePan.x, y: safePan.y } : { x: 0, y: 0 });
      }

      if (safeDevices.length > 0 && safeTopologyDevices.length > 0) {
        const newDeviceStates = new Map<string, SwitchState>();
        safeDevices.forEach((item: { id: string; state: SwitchState }) => {
          if (item.id && item.id.trim() !== '') {
            newDeviceStates.set(item.id, item.state);
          }
        });

        const validDevices = safeTopologyDevices.filter(
          (device: CanvasDevice) => device.id && device.id.trim() !== ''
        );
        const normalizedDevices = applyLinkLocalToUnconfiguredHosts(validDevices.map((device: CanvasDevice) => ({
          ...device,
          type: normalizeDeviceType(device.type),
        })));

        const stpSyncedDevices = normalizedDevices.map((device) => {
          const deviceState = newDeviceStates.get(device.id);
          if (!deviceState || !deviceState.ports) return device;
          const updatedPorts = device.ports.map((port) => {
            const statePort = deviceState.ports[port.id];
            if (statePort && statePort.spanningTree) {
              return { ...port, spanningTree: statePort.spanningTree };
            }
            return port;
          });
          return { ...device, ports: updatedPorts };
        });

        setTopologyDevices(stpSyncedDevices);
      }

      if (safeCableInfo) {
        setCableInfo({
          connected: typeof safeCableInfo.connected === 'boolean' ? safeCableInfo.connected : false,
          cableType: normalizeCableType(safeCableInfo.cableType),
          sourceDevice: normalizeDeviceType(typeof safeCableInfo.sourceDevice === 'string' ? safeCableInfo.sourceDevice : 'pc'),
          targetDevice: normalizeDeviceType(typeof safeCableInfo.targetDevice === 'string' ? safeCableInfo.targetDevice : 'switchL2'),
        });
      } else {
        setCableInfo({ connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' });
      }

      if (shouldKeepActiveDevice && typeof data.activeDeviceId === 'string' && data.activeDeviceId.trim() !== '') {
        setActiveDeviceId(data.activeDeviceId);
      } else {
        setActiveDeviceId('');
        setSelectedDevice(null);
      }
      setActiveDeviceType(normalizeDeviceType(typeof data.activeDeviceType === 'string' ? data.activeDeviceType : 'switchL2'));
      setActiveTab(resolvedActiveTab);

      setShowPCPanel(false);
      setShowRouterPanel(false);
      setShowUnifiedDeviceModal(false);
      setRefreshNetworkReport(null);
      setTopologyKey(prev => prev + 1);
      setHasUnsavedChanges(false);

      resetHistory({
        topologyDevices: applyLinkLocalToUnconfiguredHosts(
          (safeTopologyDevices || [])
            .filter((device: CanvasDevice) => device.id && device.id.trim() !== '')
            .map((device: CanvasDevice) => ({ ...device, type: normalizeDeviceType(device.type) }))
        ),
        topologyConnections: safeTopologyConnections,
        topologyNotes: safeTopologyNotes,
        deviceStates: new Map(
          safeDevices
            ?.filter((item: { id?: string; state?: SwitchState }) => !!item.id && item.id.trim() !== '')
            ?.map((item: { id: string; state: SwitchState }) => [item.id, item.state]) || []
        ),
        deviceOutputs: new Map(safeDeviceOutputs.map((item: { id: string; outputs: TerminalOutput[] }) => [item.id, item.outputs])),
        pcOutputs: new Map(safePcOutputs.map((item: { id: string; outputs: PCOutputLine[] }) => [item.id, item.outputs])),
        pcHistories: new Map(safePcHistories.map((item: { id: string; history: string[] }) => [item.id, item.history])),
        cableInfo: safeCableInfo
          ? {
            connected: typeof safeCableInfo.connected === 'boolean' ? safeCableInfo.connected : false,
            cableType: normalizeCableType(safeCableInfo.cableType),
            sourceDevice: normalizeDeviceType(typeof safeCableInfo.sourceDevice === 'string' ? safeCableInfo.sourceDevice : 'pc'),
            targetDevice: normalizeDeviceType(typeof safeCableInfo.targetDevice === 'string' ? safeCableInfo.targetDevice : 'switchL2'),
          }
          : { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: shouldKeepActiveDevice ? (typeof data.activeDeviceId === 'string' ? data.activeDeviceId : 'switch-1') : '',
        activeDeviceType: normalizeDeviceType(typeof data.activeDeviceType === 'string' ? data.activeDeviceType : 'switchL2'),
        zoom: typeof data.zoom === 'number' ? data.zoom : 1.0,
        pan: safePan && typeof safePan.x === 'number' && typeof safePan.y === 'number' ? { x: safePan.x, y: safePan.y } : { x: 0, y: 0 },
        activeTab: resolvedActiveTab
      });

      return true;
    } catch (error) {
      errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'loadProjectData', error: String(error) }));
      toast({
        variant: 'destructive',
        title: t.invalidProject,
        description: t.corruptedProject,
      });
      return false;
    }
  }, [
    t, language, setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories,
    setTopologyDevices, setTopologyConnections, setTopologyNotes,
    setCableInfo, setActiveDeviceId, setActiveDeviceType, setSelectedDevice,
    setActiveTab, setTopologyKey, setHasUnsavedChanges, resetHistory,
    setZoom, setPan, normalizeDeviceType, applyLinkLocalToUnconfiguredHosts,
    setShowPCPanel, setShowRouterPanel, setShowUnifiedDeviceModal, setRefreshNetworkReport
  ]);

  const handleSaveProjectInternal = useCallback((): string | null => {
    const excludedDeviceIds = new Set(
      topologyDevices.filter(d => d.type === 'pc' || d.type === 'iot').map(d => d.id)
    );

    const iotDeviceIds = new Set(topologyDevices.filter(d => d.type === 'iot').map(d => d.id));
    const adjustedDeviceOutputs = new Map(deviceOutputs);
    const adjustedPcOutputs = new Map(pcOutputs);
    iotDeviceIds.forEach(iotId => {
      const iotOutput = deviceOutputs.get(iotId);
      if (iotOutput) {
        const filteredOutput = iotOutput.filter(o => o.type !== 'password-prompt');
        adjustedPcOutputs.set(iotId, filteredOutput as any);
        adjustedDeviceOutputs.delete(iotId);
      }
    });

    const MAX_SAVED_OUTPUT_LINES = 100;
    const trimOutputs = (outputs: any[]) => {
      if (outputs.length <= MAX_SAVED_OUTPUT_LINES) return outputs;
      return outputs.slice(-MAX_SAVED_OUTPUT_LINES);
    };

    const syncedDeviceStates = new Map(deviceStates);
    const topologyDeviceIds = new Set(topologyDevices.map(d => d.id));
    topologyDevices.forEach(device => {
      const state = syncedDeviceStates.get(device.id);
      if (state) {
        if (device.macAddress && state.macAddress !== device.macAddress) {
          syncedDeviceStates.set(device.id, { ...state, macAddress: device.macAddress });
        }
        const updatedPorts = { ...state.ports };
        let portsChanged = false;
        device.ports.forEach(topoPort => {
          const statePort = updatedPorts[topoPort.id];
          if (statePort) {
            if (topoPort.macAddress && statePort.macAddress !== topoPort.macAddress) {
              updatedPorts[topoPort.id] = { ...statePort, macAddress: topoPort.macAddress };
              portsChanged = true;
            }
            if (topoPort.id === 'wlan0') {
              const targetStatus = topoPort.shutdown ? 'notconnect' : (topoPort.status === 'connected' ? 'connected' : 'notconnect');
              if (statePort.status !== targetStatus) {
                updatedPorts[topoPort.id] = { ...updatedPorts[topoPort.id], status: targetStatus };
                portsChanged = true;
              }
            }
          }
        });
        if (portsChanged) {
          syncedDeviceStates.set(device.id, { ...state, ports: updatedPorts });
        }
      }
    });

    const projectData = {
      version: '1.1',
      timestamp: new Date().toISOString(),
      devices: Array.from(syncedDeviceStates.entries())
        .filter(([id]) => !excludedDeviceIds.has(id) && topologyDeviceIds.has(id))
        .map(([id, state]) => ({
          id,
          state: {
            ...state,
            commandHistory: state.commandHistory.slice(-50),
            awaitingPassword: undefined,
            passwordContext: undefined,
            awaitingReloadConfirm: undefined
          }
        })),
      deviceOutputs: Array.from(adjustedDeviceOutputs.entries())
        .filter(([id]) => id && id.trim() !== '' && topologyDeviceIds.has(id))
        .map(([id, outputs]) => ({ id, outputs: trimOutputs(outputs) })),
      pcOutputs: Array.from(adjustedPcOutputs.entries())
        .filter(([id]) => id && id.trim() !== '' && topologyDeviceIds.has(id))
        .map(([id, outputs]) => ({ id, outputs: trimOutputs(outputs) })),
      pcHistories: Array.from(pcHistories.entries())
        .filter(([id]) => id && id.trim() !== '')
        .map(([id, history]) => ({ id, history: history.slice(-50) })),
      topology: {
        devices: topologyDevices.filter(d => d.id && d.id.trim() !== ''),
        connections: topologyConnections,
        notes: topologyNotes
      },
      cableInfo: topologyDevices.length > 0 && topologyConnections.length > 0 ? cableInfo : { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
      activeDeviceId: topologyDevices.find(d => d.id === activeDeviceId)?.id || '',
      activeDeviceType,
      activeTab
    };

    return safeStringify(projectData);
  }, [topologyDevices, topologyConnections, topologyNotes, deviceStates, deviceOutputs, pcOutputs, pcHistories, cableInfo, activeDeviceId, activeDeviceType, activeTab]);

  return {
    loadProjectData,
    handleSaveProjectInternal,
    autosaveTimerRef,
    fileInputRef,
  };
}
