import { useState, useCallback, useMemo } from 'react';
import { SwitchState, CableInfo } from '@/lib/network/types';
import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType } from '@/components/network/networkTopology.types';
import { TerminalOutput } from '@/components/network/Terminal';

interface PCOutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success';
  content: string;
}

export interface ProjectState {
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
  zoom: number;
  pan: { x: number; y: number };
  activeTab?: string;
}

interface HistoryState {
  items: HistoryEntry[];
  index: number;
}

export type HistoryOperationType = 'all' | 'topology' | 'device' | 'ui';

export interface HistoryEntry {
  state: ProjectState;
  operationType: HistoryOperationType;
  signature: string;
  estimatedBytes: number;
}

const MAX_HISTORY_ITEMS = 80;
const MAX_HISTORY_BYTES = 8 * 1024 * 1024;

function estimateStateBytes(state: ProjectState): number {
  try {
    // Estimate with the heavy mutable parts; enough for bounded pruning.
    return JSON.stringify({
      topologyDevices: state.topologyDevices,
      topologyConnections: state.topologyConnections,
      topologyNotes: state.topologyNotes,
      cableInfo: state.cableInfo,
      zoom: state.zoom,
      pan: state.pan,
      activeTab: state.activeTab,
      deviceStates: Array.from(state.deviceStates.entries()),
      deviceOutputs: Array.from(state.deviceOutputs.entries()),
      pcOutputs: Array.from(state.pcOutputs.entries()),
      pcHistories: Array.from(state.pcHistories.entries()),
    }).length;
  } catch {
    return 0;
  }
}

function cloneProjectState(newState: ProjectState): ProjectState {
  return {
    ...newState,
    deviceStates: new Map(newState.deviceStates),
    deviceOutputs: new Map(newState.deviceOutputs),
    pcOutputs: new Map(newState.pcOutputs),
    pcHistories: new Map(newState.pcHistories),
    topologyDevices: JSON.parse(JSON.stringify(newState.topologyDevices)),
    topologyConnections: JSON.parse(JSON.stringify(newState.topologyConnections)),
    topologyNotes: JSON.parse(JSON.stringify(newState.topologyNotes)),
    cableInfo: { ...newState.cableInfo }
  };
}

function getStateSignature(state: ProjectState, operationType: HistoryOperationType): string {
  switch (operationType) {
    case 'ui':
      return JSON.stringify({
        activeDeviceId: state.activeDeviceId,
        activeDeviceType: state.activeDeviceType,
        zoom: state.zoom,
        pan: state.pan,
        activeTab: state.activeTab,
      });
    case 'device':
      return JSON.stringify({
        deviceStates: Array.from(state.deviceStates.entries()),
        deviceOutputs: Array.from(state.deviceOutputs.entries()),
        pcOutputs: Array.from(state.pcOutputs.entries()),
        pcHistories: Array.from(state.pcHistories.entries()),
      });
    case 'all':
    case 'topology':
    default:
      return JSON.stringify({
        topologyDevices: state.topologyDevices,
        topologyConnections: state.topologyConnections,
        topologyNotes: state.topologyNotes,
        cableInfo: state.cableInfo,
      });
  }
}

export function findUndoIndex(
  items: HistoryEntry[],
  currentIndex: number,
  operationType: HistoryOperationType = 'all'
): number {
  if (currentIndex <= 0) return currentIndex;
  if (operationType === 'all') return currentIndex - 1;
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (items[i].operationType === operationType || items[i].operationType === 'all') {
      return i;
    }
  }
  return currentIndex;
}

export function findRedoIndex(
  items: HistoryEntry[],
  currentIndex: number,
  operationType: HistoryOperationType = 'all'
): number {
  if (currentIndex >= items.length - 1) return currentIndex;
  if (operationType === 'all') return currentIndex + 1;
  for (let i = currentIndex + 1; i < items.length; i++) {
    if (items[i].operationType === operationType || items[i].operationType === 'all') {
      return i;
    }
  }
  return currentIndex;
}

export function useHistory(initialState: ProjectState) {
  const initialEntry: HistoryEntry = {
    state: cloneProjectState(initialState),
    operationType: 'all',
    signature: getStateSignature(initialState, 'all'),
    estimatedBytes: estimateStateBytes(initialState),
  };
  const [state, setState] = useState<HistoryState>({
    items: [initialEntry],
    index: 0
  });

  const pushState = useCallback((newState: ProjectState, operationType: HistoryOperationType = 'topology') => {
    setState(prev => {
      const newItems = prev.items.slice(0, prev.index + 1);
      const stateToPush = cloneProjectState(newState);
      const signature = getStateSignature(stateToPush, operationType);
      const entry: HistoryEntry = {
        state: stateToPush,
        operationType,
        signature,
        estimatedBytes: estimateStateBytes(stateToPush),
      };

      // Optimization: don't push if it's the same as current present
      const currentPresent = prev.items[prev.index]?.signature;
      if (currentPresent && currentPresent === signature) {
        return prev;
      }

      newItems.push(entry);

      let nextIndex = newItems.length - 1;

      // Limit history size and memory usage
      while (newItems.length > MAX_HISTORY_ITEMS) {
        newItems.shift();
        nextIndex = Math.max(0, nextIndex - 1);
      }
      let totalBytes = newItems.reduce((sum, item) => sum + item.estimatedBytes, 0);
      while (totalBytes > MAX_HISTORY_BYTES && newItems.length > 1) {
        const removed = newItems.shift();
        totalBytes -= removed?.estimatedBytes || 0;
        nextIndex = Math.max(0, nextIndex - 1);
      }

      return {
        items: newItems,
        index: nextIndex
      };
    });
  }, []);

  const undo = useCallback((operationType: HistoryOperationType = 'all') => {
    setState(prev => {
      const nextIndex = findUndoIndex(prev.items, prev.index, operationType);
      if (nextIndex !== prev.index) {
        return { ...prev, index: nextIndex };
      }
      return prev;
    });
  }, []);

  const redo = useCallback((operationType: HistoryOperationType = 'all') => {
    setState(prev => {
      const nextIndex = findRedoIndex(prev.items, prev.index, operationType);
      if (nextIndex !== prev.index) {
        return { ...prev, index: nextIndex };
      }
      return prev;
    });
  }, []);

  const resetHistory = useCallback((newState: ProjectState) => {
    const resetEntry: HistoryEntry = {
      state: cloneProjectState(newState),
      operationType: 'all',
      signature: getStateSignature(newState, 'all'),
      estimatedBytes: estimateStateBytes(newState),
    };
    setState({
      items: [resetEntry],
      index: 0
    });
  }, []);

  // Current state based on index - useful for applying undo/redo
  const currentState = useMemo(() => {
    return state.items[state.index]?.state || null;
  }, [state.items, state.index]);

  const canUndo = useMemo(() => state.index > 0, [state.index]);
  const canRedo = useMemo(() => state.index < state.items.length - 1, [state.index, state.items.length]);

  const jumpTo = useCallback((index: number) => {
    setState(prev => {
      if (index >= 0 && index < prev.items.length) {
        return { ...prev, index };
      }
      return prev;
    });
  }, []);

  return {
    pushState,
    undo,
    redo,
    jumpTo,
    canUndo,
    canRedo,
    resetHistory,
    currentState,
    historyItems: state.items,
    historyIndex: state.index
  };
}
