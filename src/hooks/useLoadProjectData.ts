import { useCallback } from 'react';
import { useAppStore } from '@/lib/store/appStore';
import type { SwitchState, CableInfo } from '@/lib/network/types';
import type { CanvasDevice, CanvasNote, DeviceType } from '@/components/network/networkTopology.types';
import type { TerminalOutput } from '@/components/network/Terminal';
import { BOOT_PROGRESS_MARKER } from '@/components/network/Terminal';
import type { PCOutputLine } from '@/types/pageTypes';
import type { ProjectState, HistoryEntry, SerializedHistoryEntry } from '@/hooks/useHistory';
import type { ExamProject } from '@/lib/network/examMode';
import { errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { logger } from '@/lib/logger';

export interface UseLoadProjectDataProps {
  setDeviceStates: (states: Map<string, SwitchState>) => void;
  setDeviceOutputs: (outputs: Map<string, TerminalOutput[]>) => void;
  setPcOutputs: (outputs: Map<string, PCOutputLine[]>) => void;
  setPcHistories: (histories: Map<string, string[]>) => void;
  setActiveDeviceId: (id: string) => void;
  setActiveDeviceType: (type: DeviceType) => void;
  setSelectedDevice: (device: DeviceType | null) => void;
  setCableInfo: (info: CableInfo) => void;
  setTopologyKey: (updater: (prev: number) => number) => void;
  setHasUnsavedChanges: (val: boolean) => void;
  resetHistory: (state: ProjectState) => void;
  loadHistory: (items: HistoryEntry[], index: number) => void;
  normalizeDeviceType: (type: string) => DeviceType;
  applyLinkLocalToUnconfiguredHosts: (devices: CanvasDevice[]) => CanvasDevice[];
  resetWorkspaceUiState: () => void;
  startExamProject: (exam: ExamProject) => void;
}

export function useLoadProjectData({
  setDeviceStates,
  setDeviceOutputs,
  setPcOutputs,
  setPcHistories,
  setActiveDeviceId,
  setActiveDeviceType,
  setSelectedDevice,
  setCableInfo,
  setTopologyKey,
  setHasUnsavedChanges,
  resetHistory,
  loadHistory,
  normalizeDeviceType,
  applyLinkLocalToUnconfiguredHosts,
  resetWorkspaceUiState,
  startExamProject,
}: UseLoadProjectDataProps) {
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const setTopologyDevices = useAppStore(state => state.setDevices);
  const setTopologyConnections = useAppStore(state => state.setConnections);
  const setTopologyNotes = useAppStore(state => state.setNotes);
  const setZoom = useAppStore(state => state.setZoom);
  const setPan = useAppStore(state => state.setPan);
  const setActiveTab = useAppStore(state => state.setActiveTab);

  return useCallback((projectData: unknown, options?: { keepActiveDevice?: boolean }) => {
    try {
      // Clear packet capture, simulation states, and device state caches
      useAppStore.setState(state => ({
        topology: {
          ...state.topology,
          capturedPackets: {},
          activeCaptureConnectionId: null,
          isSimulationMode: false
        },
        deviceStates: {
          switchStates: {},
          pcOutputs: {}
        }
      }));

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

      // Load device states
      if (safeDevices.length > 0) {
        const newDeviceStates = new Map<string, SwitchState>();
        safeDevices.forEach((item: { id: string; state: SwitchState }) => {
          if (item.id && item.id.trim() !== '') {
            newDeviceStates.set(item.id, item.state);
          }
        });
        setDeviceStates(newDeviceStates);
      } else {
        setDeviceStates(new Map());
      }

      // Load device outputs
      if (safeDeviceOutputs.length > 0) {
        const newDeviceOutputs = new Map<string, TerminalOutput[]>();
        safeDeviceOutputs.forEach((item: { id: string; outputs: TerminalOutput[] }) => {
          let outputs = item.outputs || [];

          const stateItem = safeDevices.find((d: { id: string; state?: SwitchState }) => d.id === item.id);
          if (stateItem?.state?.bannerMOTD && !outputs.some(o => o.content?.includes(stateItem.state.bannerMOTD))) {
            outputs = [
              {
                id: 'banner-load-static',
                type: 'output',
                content: stateItem.state.bannerMOTD + '\n'
              },
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
              { id: `boot-1-${suffix}`, type: 'output', content: '\n\nSystem Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n' },
              { id: `boot-2-${suffix}`, type: 'output', content: `ISR4451/K9 platform with 4096 K bytes of memory\n\n${syslog}\nLoad/bootstrap symbols loaded, GOXR initialization\nReading all bootflash vectors\nPOST: CPU PCIe port Check PASS\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n` },
              { id: `boot-3-${suffix}`, type: 'output', content: '\nBooting flash:c1900-universalk9-mz.SPA.154-3.M.bin...OK!\nExtracting files from flash:c1900-universalk9-mz.SPA.154-3.M.bin...\n  ########## [OK]\n  0 bytes remaining in flash device\n' },
              ...(state?.bannerMOTD ? [{ id: `banner-${suffix}`, type: 'output' as const, content: `\n${state.bannerMOTD}\n` }] : []),
              { id: `boot-ready-${suffix}`, type: 'output', content: BOOT_PROGRESS_MARKER }
            ];
          } else if (isL3Switch) {
            const syslog = t.syslogStarted;
            bootMessages = [
              { id: `boot-1-${suffix}`, type: 'output', content: '\n\nSystem Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n' },
              { id: `boot-2-${suffix}`, type: 'output', content: `C3650 platform with 131072 K bytes of memory\n\n${syslog}\nLoad/bootstrap symbols loaded\nReading all bootflash vectors\nPOST: CPU PCIe port Check PASS\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n` },
              { id: `boot-3-${suffix}`, type: 'output', content: '\nBooting flash:C3650-ipbase-mz.152-2.SE4.bin...OK!\nExtracting files from flash:C3650-ipbase-mz.152-2.SE4.bin...\n  ########## [OK]\n  0 bytes remaining in flash device\n' },
              ...(state?.bannerMOTD ? [{ id: `banner-${suffix}`, type: 'output' as const, content: `\n${state.bannerMOTD}\n` }] : []),
              { id: `boot-ready-${suffix}`, type: 'output', content: BOOT_PROGRESS_MARKER }
            ];
          } else {
            const syslog = t.syslogStarted;
            bootMessages = [
              { id: `boot-1-${suffix}`, type: 'output', content: '\n\nSystem Bootstrap\nTechnical Support: http://yunus.sf.net\nCopyright (c) 1996-2026 by Network Systems, Inc.\n' },
              { id: `boot-2-${suffix}`, type: 'output', content: `C2960 platform with 65536 K bytes of memory\n\n${syslog}\nLoad/bootstrap symbols loaded\nReading all bootflash vectors\nPOST: CPU Ethernet port Check PASS\nCPU memory test . . . . . . . . . . . . . OK\nBoard initialization completed\nInitializing flash file system\n` },
              { id: `boot-3-${suffix}`, type: 'output', content: '\nBooting flash:c2960-lanbase-mz.152-2.E6.bin...OK!\nExtracting files from flash:c2960-lanbase-mz.152-2.E6.bin...\n  ########## [OK]\n  0 bytes remaining in flash device\n' },
              ...(state?.bannerMOTD ? [{ id: `banner-${suffix}`, type: 'output' as const, content: `\n${state.bannerMOTD}\n` }] : []),
              { id: `boot-ready-${suffix}`, type: 'output', content: BOOT_PROGRESS_MARKER }
            ];
          }
          newDeviceOutputs.set(deviceId, bootMessages);
        });
        setDeviceOutputs(newDeviceOutputs);
      } else {
        setDeviceOutputs(new Map());
      }

      // Load PC outputs
      if (safePcOutputs.length > 0) {
        const newPcOutputs = new Map<string, PCOutputLine[]>();
        safePcOutputs.forEach((item: { id: string; outputs: PCOutputLine[] }) => {
          newPcOutputs.set(item.id, item.outputs || []);
        });
        setPcOutputs(newPcOutputs);
      } else {
        setPcOutputs(new Map());
      }

      // Load PC histories
      if (safePcHistories.length > 0) {
        const newPcHistories = new Map<string, string[]>();
        safePcHistories.forEach((item: { id: string; history: string[] }) => {
          newPcHistories.set(item.id, item.history || []);
        });
        setPcHistories(newPcHistories);
      } else {
        setPcHistories(new Map());
      }

      const resolveNoteOverlap = (notes: CanvasNote[], devices: CanvasDevice[]): CanvasNote[] => {
        const deviceBoxes = devices.map((d) => ({ x: d.x - 50, y: d.y - 35, w: 100, h: 70 }));
        const placed: CanvasNote[] = [];
        const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
          a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

        for (const note of notes) {
          const w = Math.max(160, Number(note.width) || 260);
          const h = Math.max(80, Number(note.height) || 120);
          let x = Number(note.x) || 0;
          let y = Number(note.y) || 0;
          let tries = 0;

          while (tries < 80) {
            const box = { x, y, w, h };
            const collidesDevice = deviceBoxes.some((d) => overlaps(box, d));
            const collidesNote = placed.some((n) => overlaps(box, { x: n.x, y: n.y, w: Math.max(160, Number(n.width) || 260), h: Math.max(80, Number(n.height) || 120) }));
            if (!collidesDevice && !collidesNote) break;
            x += 36;
            if (x > 1200) {
              x = 40;
              y += 28;
            }
            tries += 1;
          }

          placed.push({ ...note, x, y });
        }

        return placed;
      };

      // Load topology
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
        setTopologyNotes(resolveNoteOverlap(safeTopologyNotes, normalizedDevices));
        if (typeof topology.zoom === 'number') setZoom(topology.zoom);
        if (safeTopologyPan && typeof safeTopologyPan.x === 'number' && typeof safeTopologyPan.y === 'number') setPan({ x: safeTopologyPan.x, y: safeTopologyPan.y });
      } else {
        setTopologyDevices([]);
        setTopologyConnections([]);
        setTopologyNotes([]);
        setZoom(typeof data.zoom === 'number' ? data.zoom : 1.0);
        setPan(safePan && typeof safePan.x === 'number' && typeof safePan.y === 'number' ? { x: safePan.x, y: safePan.y } : { x: 0, y: 0 });
      }

      // Sync STP state from deviceStates to topologyDevices ports
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
              return {
                ...port,
                spanningTree: statePort.spanningTree
              };
            }
            return port;
          });

          return {
            ...device,
            ports: updatedPorts
          };
        });

        setTopologyDevices(stpSyncedDevices);
      }

      // Load cable info
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

      // Load active device
      if (shouldKeepActiveDevice && typeof data.activeDeviceId === 'string' && data.activeDeviceId.trim() !== '') {
        setActiveDeviceId(data.activeDeviceId);
      } else {
        setActiveDeviceId('');
        setSelectedDevice(null);
      }
      setActiveDeviceType(normalizeDeviceType(typeof data.activeDeviceType === 'string' ? data.activeDeviceType : 'switchL2'));

      // Load active tab
      setActiveTab(resolvedActiveTab);

      // Restore exam state if present
      if (data.examData && typeof data.examData === 'object') {
        const exam = data.examData as { id: string; title: string | { tr: string; en: string }; tasks: unknown[]; durationMinutes: number; difficulty: string; isCustom: boolean };
        startExamProject(({
          ...exam,
          isExam: true,
          data: projectData,
          tag: 'EDIT',
          description: { tr: 'Düzenleniyor...', en: 'Editing...' }
        }) as unknown as ExamProject);
      }

      // Close transient UI state
      resetWorkspaceUiState();

      // Close packet analysis popup explicitly
      window.dispatchEvent(new CustomEvent('network-refresh'));

      // Increment topology key
      setTopologyKey(prev => prev + 1);
      setHasUnsavedChanges(false);

      const newState = {
        topologyDevices: applyLinkLocalToUnconfiguredHosts(
          (safeTopologyDevices || [])
            .filter((device: CanvasDevice) => device.id && device.id.trim() !== '')
            .map((device: CanvasDevice) => ({
              ...device,
              type: normalizeDeviceType(device.type),
            }))
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
          : { connected: false, cableType: 'straight' as const, sourceDevice: 'pc' as const, targetDevice: 'switchL2' as const },
        activeDeviceId: shouldKeepActiveDevice ? (typeof data.activeDeviceId === 'string' ? data.activeDeviceId : 'switch-1') : '',
        activeDeviceType: normalizeDeviceType(typeof data.activeDeviceType === 'string' ? data.activeDeviceType : 'switchL2'),
        zoom: typeof data.zoom === 'number' ? data.zoom : 1.0,
        pan: safePan && typeof safePan.x === 'number' && typeof safePan.y === 'number' ? { x: safePan.x, y: safePan.y } : { x: 0, y: 0 },
        activeTab: resolvedActiveTab
      };

      if (data.history && typeof data.history === 'object') {
        const hData = data.history as { items: SerializedHistoryEntry[]; index?: number };
        if (Array.isArray(hData.items) && hData.items.length > 0) {
          try {
            const deserializedItems = hData.items.map((item: SerializedHistoryEntry) => ({
              ...item,
              state: {
                ...item.state,
                deviceStates: new Map(item.state.deviceStates || []),
                deviceOutputs: new Map(item.state.deviceOutputs || []),
                pcOutputs: new Map(item.state.pcOutputs || []),
                pcHistories: new Map(item.state.pcHistories || []),
              }
            }));
            setTimeout(() => loadHistory(deserializedItems, typeof hData.index === 'number' ? hData.index : 0), 100);
          } catch (e) {
            logger.warn('Could not deserialize history from project file', e);
            setTimeout(() => resetHistory(newState), 100);
          }
        } else {
          setTimeout(() => resetHistory(newState), 100);
        }
      } else {
        setTimeout(() => resetHistory(newState), 100);
      }

      return true;
    } catch (error) {
      errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'loadProjectData', error: String(error) }));
      try { localStorage.removeItem('netsim_autosave'); } catch { /* ignore */ }
      toast({
        variant: 'destructive',
        title: t.invalidProject,
        description: t.corruptedProject,
      });
      return false;
    }
  }, [
    setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories,
    setActiveDeviceId, setActiveDeviceType, setSelectedDevice, setCableInfo,
    setTopologyKey, setHasUnsavedChanges, resetHistory, loadHistory,
    normalizeDeviceType, applyLinkLocalToUnconfiguredHosts, resetWorkspaceUiState,
    startExamProject, setTopologyDevices, setTopologyConnections, setTopologyNotes,
    setZoom, setPan, setActiveTab, language, t, toast
  ]);
}
