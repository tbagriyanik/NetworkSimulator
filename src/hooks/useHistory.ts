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

export interface SerializedProjectStateMaps {
  deviceStates: [string, SwitchState][];
  deviceOutputs: [string, TerminalOutput[]][];
  pcOutputs: [string, PCOutputLine[]][];
  pcHistories: [string, string[]][];
}

export interface SerializedHistoryEntry {
  state: Omit<ProjectState, 'deviceStates' | 'deviceOutputs' | 'pcOutputs' | 'pcHistories'> & SerializedProjectStateMaps;
  operationType: HistoryOperationType;
  signature: string;
  estimatedBytes: number;
  description?: string;
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

function findUndoIndex(
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

function findRedoIndex(
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
  const [state, setState] = useState<HistoryState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('netsim_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
            const deserializedItems = parsed.items.map((item: SerializedHistoryEntry) => ({
              ...item,
              state: {
                ...item.state,
                deviceStates: new Map(item.state.deviceStates || []),
                deviceOutputs: new Map(item.state.deviceOutputs || []),
                pcOutputs: new Map(item.state.pcOutputs || []),
                pcHistories: new Map(item.state.pcHistories || []),
              }
            }));
            return {
              items: deserializedItems,
              index: typeof parsed.index === 'number' ? parsed.index : 0
            };
          }
        }
      } catch (e) {
        console.warn('Could not load history from localStorage', e);
      }
    }
    return {
      items: [initialEntry],
      index: 0
    };
  });
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

  const pushState = useCallback((newState: ProjectState, operationType: HistoryOperationType = 'topology', explicitDescription?: string) => {
    setState(prev => {
      const newItems = prev.items.slice(0, prev.index + 1);
      const stateToPush = cloneProjectState(newState);
      const signature = getStateSignature(stateToPush, operationType);

      const prevState = prev.items[prev.index]?.state;
      let description = explicitDescription || 'Değişiklik';
      if (!explicitDescription && prevState) {
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
                const pd = prevState.topologyDevices.find(old => old.id === changedDev.id);
                const changes: string[] = [];
                if (pd) {
                  if (pd.name !== changedDev.name) changes.push(`hostname '${changedDev.name}' olarak`);
                  if (pd.ip !== changedDev.ip) changes.push('IP adresi');
                  if (pd.subnet !== changedDev.subnet) changes.push('Alt Ağ Maskesi');
                  if (pd.gateway !== changedDev.gateway) changes.push('Ağ Geçidi');
                  if (pd.dns !== changedDev.dns) changes.push('DNS');
                  if (pd.ipConfigMode !== changedDev.ipConfigMode) changes.push('IP yapılandırma modu');
                  if (pd.status !== changedDev.status) changes.push('Cihaz durumu');
                  if (JSON.stringify(pd.ports) !== JSON.stringify(changedDev.ports)) changes.push('Port ayarları');
                  if (JSON.stringify(pd.wifi) !== JSON.stringify(changedDev.wifi)) changes.push('Wi-Fi ayarları');
                  if (JSON.stringify(pd.services) !== JSON.stringify(changedDev.services)) changes.push('Servisler');
                  if (JSON.stringify(pd.iot) !== JSON.stringify(changedDev.iot)) changes.push('IoT ayarları');
                  if (JSON.stringify(pd.firewallRules) !== JSON.stringify(changedDev.firewallRules)) changes.push('Firewall kuralları');
                  if (pd.vlan !== changedDev.vlan) changes.push('VLAN');
                  if (pd.macAddress !== changedDev.macAddress) changes.push('MAC adresi');
                }
                if (changes.length > 0) {
                  description = `${changedDev.name}: ${changes.join(', ')} değiştirildi`;
                } else {
                  description = `${changedDev.name} yapılandırması güncellendi`;
                }
              } else {
                description = 'Topoloji güncellendi';
              }
            }
          } else if (operationType === 'device') {
          let changedDevice = '';
          for (const [id, st] of stateToPush.deviceStates.entries()) {
            const pState = prevState.deviceStates.get(id);
            if (pState && JSON.stringify(pState) !== JSON.stringify(st)) {
              changedDevice = stateToPush.topologyDevices.find(d => d.id === id)?.name || id;
              const changes: string[] = [];
              if (pState.hostname !== st.hostname) changes.push(`hostname`);
              if (JSON.stringify(pState.ports) !== JSON.stringify(st.ports)) changes.push('interface');
              if (JSON.stringify(pState.vlans) !== JSON.stringify(st.vlans)) changes.push('vlan');
              if (JSON.stringify(pState.dhcpPools) !== JSON.stringify(st.dhcpPools)) changes.push('dhcp');
              if (pState.ipRouting !== st.ipRouting) changes.push('ip routing');
              if (JSON.stringify(pState.staticRoutes) !== JSON.stringify(st.staticRoutes)) changes.push('static route');
              if (JSON.stringify(pState.dynamicRoutes) !== JSON.stringify(st.dynamicRoutes)) changes.push('dynamic route');
              if (JSON.stringify(pState.routingProtocol) !== JSON.stringify(st.routingProtocol)) changes.push('routing protocol');
              if (JSON.stringify(pState.security) !== JSON.stringify(st.security)) changes.push('security');
              if (JSON.stringify(pState.bannerMOTD) !== JSON.stringify(st.bannerMOTD)) changes.push('banner');
              if (JSON.stringify(pState.bannerLogin) !== JSON.stringify(st.bannerLogin)) changes.push('login banner');
              if (JSON.stringify(pState.bannerExec) !== JSON.stringify(st.bannerExec)) changes.push('exec banner');
              if (pState.domainName !== st.domainName) changes.push('domain name');
              if (pState.defaultGateway !== st.defaultGateway) changes.push('default gateway');
              if (pState.dnsServer !== st.dnsServer) changes.push('dns server');
              if (pState.domainLookup !== st.domainLookup) changes.push('domain lookup');
              if (JSON.stringify(pState.services) !== JSON.stringify(st.services)) changes.push('services');
              if (JSON.stringify(pState.spanningTreeMode) !== JSON.stringify(st.spanningTreeMode)) changes.push('spanning-tree');
              if (JSON.stringify(pState.vtpMode) !== JSON.stringify(st.vtpMode)) changes.push('vtp');
              if (JSON.stringify(pState.firewallRules) !== JSON.stringify(st.firewallRules)) changes.push('firewall');
              if (JSON.stringify(pState.wirelessConfig) !== JSON.stringify(st.wirelessConfig)) changes.push('wireless');
              if (JSON.stringify(pState.ntpServers) !== JSON.stringify(st.ntpServers)) changes.push('ntp');
              if (JSON.stringify(pState.ipv6Enabled) !== JSON.stringify(st.ipv6Enabled)) changes.push('ipv6');
              if (JSON.stringify(pState.cdpEnabled) !== JSON.stringify(st.cdpEnabled)) changes.push('cdp');
              if (JSON.stringify(pState.sshVersion) !== JSON.stringify(st.sshVersion)) changes.push('ssh');
              if (changes.length === 0) {
                const allKeys = new Set([...Object.keys(pState), ...Object.keys(st)]);
                for (const key of allKeys) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  if (JSON.stringify((pState as any)[key]) !== JSON.stringify((st as any)[key])) {
                    changes.push(key);
                  }
                }
              }
              const diffDetail = changes.length > 0 ? changes.join(', ') : '';

              let cmdDetail = '';
              const out = stateToPush.deviceOutputs.get(id) || [];
              const prevOut = prevState.deviceOutputs.get(id) || [];
              if (out.length > prevOut.length) {
                const newOuts = out.slice(prevOut.length);
                const lastCmd = [...newOuts].reverse().find(o => o.type === 'command');
                if (lastCmd) {
                  cmdDetail = lastCmd.content;
                }
              }
              
              if (cmdDetail && diffDetail) {
                description = `${changedDevice}: ${diffDetail} değiştirildi ('${cmdDetail}')`;
              } else if (cmdDetail) {
                description = `${changedDevice}: '${cmdDetail}' komutu girildi`;
              } else if (diffDetail) {
                description = `${changedDevice}: ${diffDetail} değiştirildi`;
              } else {
                description = `${changedDevice} yapılandırması güncellendi`;
              }
              break;
            }
          }

          if (!changedDevice) {
            for (const [id, out] of stateToPush.pcOutputs.entries()) {
              const prevOut = prevState.pcOutputs.get(id) || [];
              if (out.length > prevOut.length) {
                const last = out[out.length - 1];
                if (last.type === 'command') {
                  changedDevice = stateToPush.topologyDevices.find(d => d.id === id)?.name || id;
                  description = `${changedDevice}: '${last.content}' komutu girildi`;
                  break;
                }
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
    localStorage.removeItem('netsim_history');
    setState({
      items: [resetEntry],
      index: 0
    });
  }, []);

  const loadHistory = useCallback((items: HistoryEntry[], index: number) => {
    setState({
      items,
      index
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
    historyIndex: state.index,
    loadHistory
  };
}
