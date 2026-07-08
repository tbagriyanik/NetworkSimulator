import { useCallback } from 'react';
import { generateRandomLinkLocalIpv4 } from '@/lib/network/linkLocal';
import { useAppStore } from '@/lib/store/appStore';
import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { TerminalOutput } from '@/components/network/Terminal';
import { PCOutputLine, TabType } from '@/types/pageTypes';
import type { ProjectState } from '@/hooks/useHistory';
import type { RefreshNetworkReport } from '@/hooks/useRefreshReport';

interface UseProjectResetProps {
  setDeviceStates: (val: Map<string, SwitchState>) => void;
  setDeviceOutputs: (val: Map<string, TerminalOutput[]>) => void;
  setPcOutputs: (val: Map<string, PCOutputLine[]>) => void;
  setPcHistories: (val: Map<string, string[]>) => void;
  setTopologyDevices: (val: CanvasDevice[]) => void;
  setTopologyConnections: (val: CanvasConnection[]) => void;
  setTopologyNotes: (val: CanvasNote[]) => void;
  setActiveDeviceId: (id: string) => void;
  setActiveDeviceType: (type: DeviceType) => void;
  setSelectedDevice: (val: DeviceType | null) => void;
  setShowPCPanel: (show: boolean) => void;
  setShowRouterPanel: (show: boolean) => void;
  setActiveTab: (tab: TabType) => void;
  setHasUnsavedChanges: (val: boolean) => void;
  setTopologyKey: React.Dispatch<React.SetStateAction<number>>;
  setZoom: (val: number) => void;
  setPan: (val: { x: number; y: number }) => void;
  closeGuidedMode: () => void;
  closeExam: () => void;
  setProjectName: (name: string) => void;
  setRefreshNetworkReport: (val: RefreshNetworkReport | null) => void;
  resetHistory: (initialState: ProjectState) => void;
}

export function useProjectReset({
  setDeviceStates,
  setDeviceOutputs,
  setPcOutputs,
  setPcHistories,
  setTopologyDevices,
  setTopologyConnections,
  setTopologyNotes,
  setActiveDeviceId,
  setActiveDeviceType,
  setSelectedDevice,
  setShowPCPanel,
  setShowRouterPanel,
  setActiveTab,
  setHasUnsavedChanges,
  setTopologyKey,
  setZoom,
  setPan,
  closeGuidedMode,
  closeExam,
  setProjectName,
  setRefreshNetworkReport,
  resetHistory
}: UseProjectResetProps) {
  const resetToEmptyProject = useCallback(() => {
    // Clear packet capture and simulation states (trigger recompile)
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
    const usedIps = new Set<string>();
    const pc1LinkLocal = generateRandomLinkLocalIpv4(usedIps);
    usedIps.add(pc1LinkLocal);
    const pc2LinkLocal = generateRandomLinkLocalIpv4(usedIps);
    usedIps.add(pc2LinkLocal);

    // Clear all states and set defaults
    setDeviceStates(new Map());
    setDeviceOutputs(new Map());
    setPcOutputs(new Map());
    setPcHistories(new Map());
    setTopologyDevices([
      {
        id: 'pc-1',
        type: 'pc',
        name: 'PC-1',
        x: 50,
        y: 50,
        ip: pc1LinkLocal,
        subnet: '255.255.0.0',
        gateway: '0.0.0.0',
        dns: '0.0.0.0',
        macAddress: '00-e0-f7-01-a1-b1',
        status: 'online',
        ports: [
          { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
          { id: 'com1', label: 'COM1', status: 'disconnected' as const }
        ]
      },
      {
        id: 'pc-2',
        type: 'pc',
        name: 'PC-2',
        x: 50,
        y: 150,
        ip: pc2LinkLocal,
        subnet: '255.255.0.0',
        gateway: '0.0.0.0',
        dns: '0.0.0.0',
        macAddress: '00-e0-f7-01-a1-b2',
        status: 'online',
        ports: [
          { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
          { id: 'com1', label: 'COM1', status: 'disconnected' as const }
        ]
      },
      {
        id: 'switch-1',
        type: 'switchL2',
        name: 'SWITCH-1',
        x: 200,
        y: 50,
        macAddress: '0011.2233.4401',
        ip: '',
        status: 'online',
        switchModel: 'WS-C2960-24TT-L',
        ports: [
          ...Array.from({ length: 24 }, (_, i) => ({ id: `fa0/${i + 1}`, label: `Fa0/${i + 1}`, status: 'disconnected' as const })),
          { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
          { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const },
          { id: 'console', label: 'Console', status: 'disconnected' as const }
        ]
      }
    ]);
    setTopologyConnections([]);
    setTopologyNotes([]);

    // Reset zoom and pan to top-left
    setZoom(1.0);
    setPan({ x: 0, y: 0 });

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }

    // Reset active selections
    setActiveDeviceId('');
    setActiveDeviceType('switchL2');
    setSelectedDevice(null);
    setShowPCPanel(false);
    setShowRouterPanel(false);

    // Close guided/exam mode panel if open
    closeGuidedMode();
    closeExam();
    setProjectName('Untitled');

    // Close network refresh report if open
    setRefreshNetworkReport(null);

    // Close packet analysis popup explicitly
    window.dispatchEvent(new CustomEvent('network-refresh'));

    // Force return to topology
    setActiveTab('topology');
    setHasUnsavedChanges(false);

    // Increment key to force NetworkTopology remount
    setTopologyKey(prev => prev + 1);

    // Reset history with the new initial state
    resetHistory({
      topologyDevices: [
        {
          id: 'pc-1',
          type: 'pc',
          name: 'PC-1',
          x: 50,
          y: 50,
          ip: pc1LinkLocal,
          subnet: '255.255.0.0',
          gateway: '0.0.0.0',
          dns: '0.0.0.0',
          macAddress: '00-e0-f7-01-a1-b1',
          status: 'online',
          ports: [
            { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
            { id: 'com1', label: 'COM1', status: 'disconnected' as const }
          ]
        },
        {
          id: 'switch-1',
          type: 'switchL2',
          name: 'SWITCH-1',
          x: 200,
          y: 50,
          macAddress: '0011.2233.4401',
          ip: '',
          status: 'online',
          switchModel: 'WS-C2960-24TT-L',
          ports: [
            { id: 'console', label: 'Console', status: 'disconnected' as const },
            ...Array.from({ length: 24 }, (_, i) => ({ id: `fa0/${i + 1}`, label: `Fa0/${i + 1}`, status: 'disconnected' as const })),
            { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
            { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }
          ]
        }
      ],
      topologyConnections: [],
      topologyNotes: [],
      deviceStates: new Map(),
      deviceOutputs: new Map(),
      pcOutputs: new Map(),
      pcHistories: new Map(),
      cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
      activeDeviceId: '',
      activeDeviceType: 'switchL2',
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      activeTab: 'topology'
    });
  }, [resetHistory, setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories, setTopologyDevices, setTopologyConnections, setTopologyNotes, setActiveDeviceId, setActiveDeviceType, setSelectedDevice, setShowPCPanel, setShowRouterPanel, setActiveTab, setHasUnsavedChanges, setTopologyKey, setZoom, setPan, closeGuidedMode, setProjectName, closeExam, setRefreshNetworkReport]);

  return { resetToEmptyProject };
}
