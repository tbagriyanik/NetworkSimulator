import { useCallback, useRef, useEffect, MutableRefObject } from 'react';
import { useHistory, ProjectState } from '@/hooks/useHistory';
import { serializeState } from './page.utils';
import { TabType, PCOutputLine } from './page.types';
import { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/networkTopology.types';
import { SwitchState, CableInfo } from '@/lib/network/types';
import type { TerminalOutput } from '@/components/network/Terminal';

interface UsePageHistoryManagerOptions {
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  topologyNotes: any[];
  deviceStates: Map<string, SwitchState>;
  deviceOutputs: Map<string, TerminalOutput[]>;
  pcOutputs: Map<string, PCOutputLine[]>;
  pcHistories: Map<string, string[]>;
  cableInfo: CableInfo;
  activeDeviceId: string;
  activeDeviceType: DeviceType;
  zoom: number;
  pan: { x: number; y: number };
  activeTab: TabType;
  isAppLoading: boolean;
  activeTabRef: MutableRefObject<TabType>;
  setTopologyDevices: (devices: CanvasDevice[]) => void;
  setTopologyConnections: (connections: CanvasConnection[]) => void;
  setTopologyNotes: (notes: any[]) => void;
  setDeviceStates: React.Dispatch<React.SetStateAction<Map<string, SwitchState>>>;
  setDeviceOutputs: React.Dispatch<React.SetStateAction<Map<string, TerminalOutput[]>>>;
  setPcOutputs: React.Dispatch<React.SetStateAction<Map<string, PCOutputLine[]>>>;
  setPcHistories: React.Dispatch<React.SetStateAction<Map<string, string[]>>>;
  setCableInfo: (info: CableInfo) => void;
  setActiveDeviceId: (id: string) => void;
  setActiveDeviceType: (type: DeviceType) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setActiveTab: (tab: TabType) => void;
}

export function usePageHistoryManager({
  topologyDevices,
  topologyConnections,
  topologyNotes,
  deviceStates,
  deviceOutputs,
  pcOutputs,
  pcHistories,
  cableInfo,
  activeDeviceId,
  activeDeviceType,
  zoom,
  pan,
  activeTab,
  isAppLoading,
  activeTabRef,
  setTopologyDevices,
  setTopologyConnections,
  setTopologyNotes,
  setDeviceStates,
  setDeviceOutputs,
  setPcOutputs,
  setPcHistories,
  setCableInfo,
  setActiveDeviceId,
  setActiveDeviceType,
  setZoom,
  setPan,
  setActiveTab,
}: UsePageHistoryManagerOptions) {
  const isApplyingHistoryRef = useRef(false);
  const pendingHistoryActionRef = useRef<'undo' | 'redo' | 'jumpTo' | null>(null);
  const lastAppliedHistoryStateRef = useRef<ProjectState | null>(null);
  const lastPushedStateRef = useRef<string>('');
  const historyApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingActionDesc = useRef<string | null>(null);

  const getCurrentState = useCallback((): ProjectState => ({
    topologyDevices: Array.isArray(topologyDevices) ? [...topologyDevices] : [],
    topologyConnections: Array.isArray(topologyConnections) ? [...topologyConnections] : [],
    topologyNotes: Array.isArray(topologyNotes) ? [...topologyNotes] : [],
    deviceStates: new Map(deviceStates || []),
    deviceOutputs: new Map(deviceOutputs || []),
    pcOutputs: new Map(pcOutputs || []),
    pcHistories: new Map(pcHistories || []),
    cableInfo: { ...cableInfo },
    activeDeviceId: activeDeviceId || '',
    activeDeviceType: activeDeviceType || 'switchL2',
    zoom,
    pan: { ...pan },
    activeTab,
  }), [topologyDevices, topologyConnections, topologyNotes, deviceStates, deviceOutputs, pcOutputs, pcHistories, cableInfo, activeDeviceId, activeDeviceType, zoom, pan, activeTab]);

  const getCurrentStateRef = useRef(getCurrentState);
  getCurrentStateRef.current = getCurrentState;

  const { pushState, undo, redo, canUndo, canRedo, resetHistory, currentState, historyItems, historyIndex, jumpTo, loadHistory } = useHistory(getCurrentState());

  const markApplyingHistory = useCallback(() => {
    isApplyingHistoryRef.current = true;
    if (historyApplyTimerRef.current) {
      clearTimeout(historyApplyTimerRef.current);
    }
    historyApplyTimerRef.current = setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 1200);
  }, []);

  const commitAction = useCallback((desc: string) => {
    pendingActionDesc.current = desc;
  }, []);

  const applyProjectState = useCallback((state: ProjectState) => {
    markApplyingHistory();
    setTopologyDevices(state.topologyDevices);
    setTopologyConnections(state.topologyConnections);
    setTopologyNotes(state.topologyNotes || []);
    setDeviceStates(new Map(state.deviceStates));
    setDeviceOutputs(new Map(state.deviceOutputs));
    setPcOutputs(new Map(state.pcOutputs));
    setPcHistories(new Map(state.pcHistories || []));
    setCableInfo(state.cableInfo);
    setActiveDeviceId(state.activeDeviceId);
    setActiveDeviceType(state.activeDeviceType);
    setZoom(state.zoom);
    setPan(state.pan);
    if (state.activeTab) {
      setActiveTab(state.activeTab as TabType);
    }
    lastPushedStateRef.current = serializeState(state);
  }, [markApplyingHistory, setTopologyDevices, setTopologyConnections, setTopologyNotes, setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories, setCableInfo, setActiveDeviceId, setActiveDeviceType, setZoom, setPan, setActiveTab]);

  const handleUndo = useCallback(() => {
    if (activeTabRef.current !== 'topology') return;
    markApplyingHistory();
    pendingHistoryActionRef.current = 'undo';
    undo();
  }, [undo, markApplyingHistory, activeTabRef]);

  const handleRedo = useCallback(() => {
    if (activeTabRef.current !== 'topology') return;
    markApplyingHistory();
    pendingHistoryActionRef.current = 'redo';
    redo();
  }, [redo, markApplyingHistory, activeTabRef]);

  const handleJumpTo = useCallback((index: number) => {
    markApplyingHistory();
    pendingHistoryActionRef.current = 'jumpTo';
    jumpTo(index);
  }, [jumpTo, markApplyingHistory]);

  useEffect(() => {
    if (!isApplyingHistoryRef.current) return;
    if (!currentState) return;
    if (lastAppliedHistoryStateRef.current === currentState) return;

    applyProjectState(currentState);
    lastAppliedHistoryStateRef.current = currentState;
  }, [currentState, applyProjectState]);

  useEffect(() => {
    lastPushedStateRef.current = serializeState(getCurrentStateRef.current());
  }, []);

  useEffect(() => {
    if (isAppLoading) return;

    const timer = setTimeout(() => {
      if (isApplyingHistoryRef.current) return;

      const s = getCurrentStateRef.current();
      const stateString = serializeState(s);

      if (stateString !== lastPushedStateRef.current) {
        if (pendingActionDesc.current) {
          pushState(s, activeTab === 'topology' ? 'topology' : 'ui', pendingActionDesc.current);
          pendingActionDesc.current = null;
        } else if (historyIndex === historyItems.length - 1) {
          pushState(s, activeTab === 'topology' ? 'topology' : 'ui', undefined);
        }
        lastPushedStateRef.current = stateString;
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [topologyDevices, topologyConnections, topologyNotes, deviceStates, deviceOutputs, pcOutputs, pcHistories, cableInfo, activeDeviceId, activeDeviceType, zoom, pan, activeTab, isAppLoading, pushState, historyIndex, historyItems.length]);

  return {
    getCurrentState,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    currentState,
    historyItems,
    historyIndex,
    jumpTo,
    loadHistory,
    handleUndo,
    handleRedo,
    handleJumpTo,
    commitAction,
  };
}
