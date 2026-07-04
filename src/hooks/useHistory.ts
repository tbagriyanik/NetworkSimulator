import { useState, useCallback, useMemo, useEffect } from 'react';
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
  description?: string;
}

const MAX_HISTORY_ITEMS = 80;
const MAX_HISTORY_BYTES = 8 * 1024 * 1024;

function estimateStateBytes(state: ProjectState): number {
  try {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeProjectState(state: ProjectState): any {
  return {
    ...state,
    deviceStates: Array.from(state.deviceStates.entries()),
    deviceOutputs: Array.from(state.deviceOutputs.entries()),
    pcOutputs: Array.from(state.pcOutputs.entries()),
    pcHistories: Array.from(state.pcHistories.entries()),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeProjectState(data: any): ProjectState {
  return {
    ...data,
    deviceStates: new Map(data.deviceStates || []),
    deviceOutputs: new Map(data.deviceOutputs || []),
    pcOutputs: new Map(data.pcOutputs || []),
    pcHistories: new Map(data.pcHistories || []),
  };
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
    description: 'Başlangıç Durumu'
  };
  const [state, setState] = useState<HistoryState>({
    items: [initialEntry],
    index: 0
  });
  useEffect(() => {
    try {
      const saved = localStorage.getItem('netsim_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const loadedItems = parsed.items.map((item: any) => ({
            ...item,
            state: deserializeProjectState(item.state)
          }));
          // eslint-disable-next-line
          setState({
            items: loadedItems,
            index: parsed.index ?? loadedItems.length - 1
          });
        }
      }
    } catch (e) {
      console.warn("Could not load history from localStorage", e);
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      if (state.items.length <= 1) {
        localStorage.removeItem('netsim_history');
        return;
      }
      
      const trySave = (itemsToSave: HistoryEntry[], idx: number) => {
        const serialized = {
          items: itemsToSave.map(item => ({
            ...item,
            state: serializeProjectState(item.state)
          })),
          index: idx
        };
        try {
          localStorage.setItem('netsim_history', JSON.stringify(serialized));
        } catch (e) {
          if (e instanceof DOMException && e.name === 'QuotaExceededError' && itemsToSave.length > 2) {
            const cutSize = Math.floor(itemsToSave.length / 2);
            trySave(itemsToSave.slice(cutSize), Math.max(0, idx - cutSize));
          } else {
            console.warn("Could not save history to localStorage", e);
          }
        }
      };
      
      trySave(state.items, state.index);
    } catch (e) {
      console.warn("Could not process history save", e);
    }
  }, [state]);

  const pushState = useCallback((newState: ProjectState, operationType: HistoryOperationType = 'topology') => {
    setState(prev => {
      const newItems = prev.items.slice(0, prev.index + 1);
      const stateToPush = cloneProjectState(newState);
      const signature = getStateSignature(stateToPush, operationType);

      const prevState = prev.items[prev.index]?.state;
      let description = 'Değişiklik';
      if (prevState) {
        if (stateToPush.topologyDevices.length > prevState.topologyDevices.length) {
          const newDev = stateToPush.topologyDevices.find(d => !prevState.topologyDevices.some(pd => pd.id === d.id));
          description = `Cihaz Eklendi: ${newDev?.name || 'Bilinmiyor'}`;
        } else if (stateToPush.topologyDevices.length < prevState.topologyDevices.length) {
          const removedDev = prevState.topologyDevices.find(d => !stateToPush.topologyDevices.some(pd => pd.id === d.id));
          description = `Cihaz Silindi: ${removedDev?.name || 'Bilinmiyor'}`;
        } else if (stateToPush.topologyConnections.length > prevState.topologyConnections.length) {
          const newConn = stateToPush.topologyConnections.find(c => !prevState.topologyConnections.some(pc => pc.id === c.id));
          if (newConn) {
             const sDev = stateToPush.topologyDevices.find(d => d.id === newConn.sourceDeviceId)?.name || newConn.sourceDeviceId;
             const tDev = stateToPush.topologyDevices.find(d => d.id === newConn.targetDeviceId)?.name || newConn.targetDeviceId;
             description = `${sDev} ve ${tDev} arasına bağlantı eklendi`;
          } else {
             description = 'Bağlantı Eklendi';
          }
        } else if (stateToPush.topologyConnections.length < prevState.topologyConnections.length) {
          const removedConn = prevState.topologyConnections.find(c => !stateToPush.topologyConnections.some(pc => pc.id === c.id));
          if (removedConn) {
             const sDev = prevState.topologyDevices.find(d => d.id === removedConn.sourceDeviceId)?.name || removedConn.sourceDeviceId;
             const tDev = prevState.topologyDevices.find(d => d.id === removedConn.targetDeviceId)?.name || removedConn.targetDeviceId;
             description = `${sDev} ve ${tDev} arasındaki bağlantı silindi`;
          } else {
             description = 'Bağlantı Silindi';
          }
        } else if (stateToPush.topologyNotes.length > prevState.topologyNotes.length) {
          description = 'Not Eklendi';
        } else if (stateToPush.topologyNotes.length < prevState.topologyNotes.length) {
          description = 'Not Silindi';
        }
        
        if (description === 'Değişiklik') {
          if (operationType === 'topology') {
            const movedDev = stateToPush.topologyDevices.find(d => {
              const pd = prevState.topologyDevices.find(old => old.id === d.id);
              return pd && (pd.x !== d.x || pd.y !== d.y);
            });
            if (movedDev) {
              description = `${movedDev.name} taşındı (Yeni Konum: ${Math.round(movedDev.x)}, ${Math.round(movedDev.y)})`;
            } else {
              const changedDev = stateToPush.topologyDevices.find(d => {
                const pd = prevState.topologyDevices.find(old => old.id === d.id);
                return pd && JSON.stringify(pd) !== JSON.stringify(d);
              });
              if (changedDev) {
                description = `${changedDev.name} yapılandırması değiştirildi (Arayüz/Ayar)`;
              } else {
                description = 'Topoloji güncellendi';
              }
            }
          } else if (operationType === 'device') {
          let changedDevice = '';
          for (const [id, out] of stateToPush.pcOutputs.entries()) {
            const prevOut = prevState.pcOutputs.get(id) || [];
            if (out.length > prevOut.length) {
              const last = out[out.length - 1];
              if (last.type === 'command') {
                changedDevice = stateToPush.topologyDevices.find(d => d.id === id)?.name || id;
                description = `${changedDevice} yapılandırması değiştirildi ('${last.content}' CLI komutu)`;
              }
            }
          }
          if (!changedDevice) {
             for (const [id, st] of stateToPush.deviceStates.entries()) {
                const pState = prevState.deviceStates.get(id);
                if (pState && JSON.stringify(pState) !== JSON.stringify(st)) {
                  changedDevice = stateToPush.topologyDevices.find(d => d.id === id)?.name || id;
                  let diffDetail = 'Arayüz/Ayar';
                  if (pState.hostname !== st.hostname) {
                    diffDetail = `hostname ${st.hostname}`;
                  } else if (JSON.stringify(pState.ports) !== JSON.stringify(st.ports)) {
                    diffDetail = 'interface ayarı';
                  } else if (JSON.stringify(pState.vlans) !== JSON.stringify(st.vlans)) {
                    diffDetail = 'vlan ayarı';
                  } else if (JSON.stringify(pState.dhcpPools) !== JSON.stringify(st.dhcpPools)) {
                    diffDetail = 'dhcp ayarı';
                  } else if (JSON.stringify(pState.ipRouting) !== JSON.stringify(st.ipRouting)) {
                    diffDetail = 'ip routing ayarı';
                  }

                  let cmdDetail = '';
                  const out = stateToPush.deviceOutputs.get(id) || [];
                  const prevOut = prevState.deviceOutputs.get(id) || [];
                  if (out.length > prevOut.length) {
                    const newOuts = out.slice(prevOut.length);
                    const lastCmd = [...newOuts].reverse().find(o => o.type === 'command');
                    if (lastCmd) {
                      cmdDetail = ` : '${lastCmd.content}'`;
                    }
                  }
                  
                  description = `${changedDevice} yapılandırması değiştirildi (${diffDetail}${cmdDetail})`;
                  break;
                }
             }
          }
          if (!changedDevice) description = 'Cihaz Değişikliği';
        } else if (operationType === 'ui') {
          description = 'Arayüz Değişikliği';
        }
      }
      }

      const entry: HistoryEntry = {
        state: stateToPush,
        operationType,
        signature,
        estimatedBytes: estimateStateBytes(stateToPush),
        description,
      };

      const currentPresent = prev.items[prev.index]?.signature;
      if (currentPresent && currentPresent === signature) {
        return prev;
      }

      newItems.push(entry);

      let nextIndex = newItems.length - 1;

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
      description: 'Başlangıç Durumu'
    };
    setState({
      items: [resetEntry],
      index: 0
    });
  }, []);

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
