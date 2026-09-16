import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState, CableInfo } from '@/lib/network/types';
import { TerminalOutput } from '@/components/network/Terminal';
import { PCOutputLine } from '@/types/pageTypes';
import type { HistoryEntry, ProjectState, SerializedHistoryEntry, HistoryOperationType, SerializedProjectStateMaps } from '@/hooks/useHistory';

const DELTA_FORMAT = 'delta-v1';

export type SerializedCleanProjectState = Omit<ProjectState, 'deviceStates' | 'deviceOutputs' | 'pcOutputs' | 'pcHistories'> & SerializedProjectStateMaps;

export interface SerializedHistoryDelta {
  operationType: HistoryOperationType;
  description?: string;
  topologyDevices?: CanvasDevice[];
  topologyConnections?: CanvasConnection[];
  topologyNotes?: CanvasNote[];
  cableInfo?: CableInfo;
  activeDeviceId?: string;
  activeDeviceType?: DeviceType;
  zoom?: number;
  pan?: { x: number; y: number };
  activeTab?: string;
  deviceStatesChanged?: [string, SwitchState][];
  deviceStatesRemoved?: string[];
  deviceOutputsDelta?: { id: string; values: TerminalOutput[]; append: boolean }[];
  pcOutputsDelta?: { id: string; values: PCOutputLine[]; append: boolean }[];
  pcHistoriesDelta?: { id: string; values: string[]; append: boolean }[];
}

export interface SerializedHistoryFile {
  format: typeof DELTA_FORMAT;
  base: SerializedHistoryEntry;
  deltas: SerializedHistoryDelta[];
  index: number;
}

interface CleanProjectState extends ProjectState {
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  topologyNotes: CanvasNote[];
  cableInfo: CableInfo;
}

function stripLargeDerivedFields(state: SwitchState): SwitchState {
  const { stpState: _stpState, macAddressTable: _macAddressTable, ...rest } = state;
  return rest as SwitchState;
}

function cleanState(
  state: ProjectState,
  excludedDeviceIds: Set<string>,
  topologyDeviceIds: Set<string>
): CleanProjectState {
  const deviceStates = new Map<string, SwitchState>();
  for (const [id, st] of state.deviceStates) {
    if (excludedDeviceIds.has(id) || !topologyDeviceIds.has(id)) continue;
    deviceStates.set(id, stripLargeDerivedFields(st));
  }
  const deviceOutputs = new Map<string, TerminalOutput[]>();
  for (const [id, out] of state.deviceOutputs) {
    if (topologyDeviceIds.has(id)) deviceOutputs.set(id, out);
  }
  const pcOutputs = new Map<string, PCOutputLine[]>();
  for (const [id, out] of state.pcOutputs) {
    if (topologyDeviceIds.has(id)) pcOutputs.set(id, out);
  }
  const pcHistories = new Map<string, string[]>();
  for (const [id, hist] of state.pcHistories) {
    if (topologyDeviceIds.has(id)) pcHistories.set(id, hist);
  }

  return {
    topologyDevices: state.topologyDevices,
    topologyConnections: state.topologyConnections,
    topologyNotes: state.topologyNotes,
    cableInfo: state.cableInfo,
    activeDeviceId: state.activeDeviceId,
    activeDeviceType: state.activeDeviceType,
    zoom: state.zoom,
    pan: state.pan,
    activeTab: state.activeTab,
    deviceStates,
    deviceOutputs,
    pcOutputs,
    pcHistories,
  };
}


function serializeState(state: CleanProjectState): SerializedCleanProjectState {
  return {
    topologyDevices: state.topologyDevices,
    topologyConnections: state.topologyConnections,
    topologyNotes: state.topologyNotes,
    cableInfo: state.cableInfo,
    activeDeviceId: state.activeDeviceId,
    activeDeviceType: state.activeDeviceType,
    zoom: state.zoom,
    pan: state.pan,
    activeTab: state.activeTab,
    deviceStates: Array.from(state.deviceStates.entries()),
    deviceOutputs: Array.from(state.deviceOutputs.entries()),
    pcOutputs: Array.from(state.pcOutputs.entries()),
    pcHistories: Array.from(state.pcHistories.entries()),
  };
}


function deserializeState(serialized?: Partial<SerializedCleanProjectState> | null): ProjectState {
  if (!serialized || typeof serialized !== 'object') {
    return {
      topologyDevices: [],
      topologyConnections: [],
      topologyNotes: [],
      cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
      activeDeviceId: '',
      activeDeviceType: 'switchL2',
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      activeTab: 'topology',
      deviceStates: new Map(),
      deviceOutputs: new Map(),
      pcOutputs: new Map(),
      pcHistories: new Map(),
    };
  }
  return {
    topologyDevices: Array.isArray(serialized.topologyDevices) ? serialized.topologyDevices : [],
    topologyConnections: Array.isArray(serialized.topologyConnections) ? serialized.topologyConnections : [],
    topologyNotes: Array.isArray(serialized.topologyNotes) ? serialized.topologyNotes : [],
    cableInfo: serialized.cableInfo || { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
    activeDeviceId: serialized.activeDeviceId || '',
    activeDeviceType: serialized.activeDeviceType || 'switchL2',
    zoom: typeof serialized.zoom === 'number' ? serialized.zoom : 1.0,
    pan: serialized.pan || { x: 0, y: 0 },
    activeTab: serialized.activeTab,
    deviceStates: new Map(Array.isArray(serialized.deviceStates) ? serialized.deviceStates : []),
    deviceOutputs: new Map(Array.isArray(serialized.deviceOutputs) ? serialized.deviceOutputs : []),
    pcOutputs: new Map(Array.isArray(serialized.pcOutputs) ? serialized.pcOutputs : []),
    pcHistories: new Map(Array.isArray(serialized.pcHistories) ? serialized.pcHistories : []),
  };
}


function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
  }
  return true;
}

function computeDelta(prev: CleanProjectState, cur: CleanProjectState): SerializedHistoryDelta {
  const delta: SerializedHistoryDelta = {} as SerializedHistoryDelta;

  if (JSON.stringify(prev.topologyDevices) !== JSON.stringify(cur.topologyDevices)) delta.topologyDevices = cur.topologyDevices;
  if (JSON.stringify(prev.topologyConnections) !== JSON.stringify(cur.topologyConnections)) delta.topologyConnections = cur.topologyConnections;
  if (JSON.stringify(prev.topologyNotes) !== JSON.stringify(cur.topologyNotes)) delta.topologyNotes = cur.topologyNotes;
  if (JSON.stringify(prev.cableInfo) !== JSON.stringify(cur.cableInfo)) delta.cableInfo = cur.cableInfo;
  if (prev.activeDeviceId !== cur.activeDeviceId) delta.activeDeviceId = cur.activeDeviceId;
  if (prev.activeDeviceType !== cur.activeDeviceType) delta.activeDeviceType = cur.activeDeviceType;
  if (prev.zoom !== cur.zoom) delta.zoom = cur.zoom;
  if (JSON.stringify(prev.pan) !== JSON.stringify(cur.pan)) delta.pan = cur.pan;
  if (prev.activeTab !== cur.activeTab) delta.activeTab = cur.activeTab;

  const deviceStatesChanged: [string, SwitchState][] = [];
  for (const [id, st] of cur.deviceStates) {
    const prevSt = prev.deviceStates.get(id);
    if (!prevSt || JSON.stringify(prevSt) !== JSON.stringify(st)) deviceStatesChanged.push([id, st]);
  }
  if (deviceStatesChanged.length > 0) delta.deviceStatesChanged = deviceStatesChanged;

  const deviceStatesRemoved: string[] = [];
  for (const id of prev.deviceStates.keys()) {
    if (!cur.deviceStates.has(id)) deviceStatesRemoved.push(id);
  }
  if (deviceStatesRemoved.length > 0) delta.deviceStatesRemoved = deviceStatesRemoved;

  const deviceOutputsDelta: SerializedHistoryDelta['deviceOutputsDelta'] = [];
  for (const [id, curArr] of cur.deviceOutputs) {
    const prevArr = prev.deviceOutputs.get(id);
    if (!prevArr) {
      deviceOutputsDelta.push({ id, values: curArr, append: false });
      continue;
    }
    if (arraysEqual(prevArr, curArr)) continue;
    if (curArr.length > prevArr.length && arraysEqual(prevArr, curArr.slice(0, prevArr.length))) {
      deviceOutputsDelta.push({ id, values: curArr.slice(prevArr.length), append: true });
    } else {
      deviceOutputsDelta.push({ id, values: curArr, append: false });
    }
  }
  if (deviceOutputsDelta.length > 0) delta.deviceOutputsDelta = deviceOutputsDelta;

  const pcOutputsDelta: SerializedHistoryDelta['pcOutputsDelta'] = [];
  for (const [id, curArr] of cur.pcOutputs) {
    const prevArr = prev.pcOutputs.get(id);
    if (!prevArr) {
      pcOutputsDelta.push({ id, values: curArr, append: false });
      continue;
    }
    if (arraysEqual(prevArr, curArr)) continue;
    if (curArr.length > prevArr.length && arraysEqual(prevArr, curArr.slice(0, prevArr.length))) {
      pcOutputsDelta.push({ id, values: curArr.slice(prevArr.length), append: true });
    } else {
      pcOutputsDelta.push({ id, values: curArr, append: false });
    }
  }
  if (pcOutputsDelta.length > 0) delta.pcOutputsDelta = pcOutputsDelta;

  const pcHistoriesDelta: SerializedHistoryDelta['pcHistoriesDelta'] = [];
  for (const [id, curArr] of cur.pcHistories) {
    const prevArr = prev.pcHistories.get(id);
    if (!prevArr) {
      pcHistoriesDelta.push({ id, values: curArr, append: false });
      continue;
    }
    if (arraysEqual(prevArr, curArr)) continue;
    if (curArr.length > prevArr.length && arraysEqual(prevArr, curArr.slice(0, prevArr.length))) {
      pcHistoriesDelta.push({ id, values: curArr.slice(prevArr.length), append: true });
    } else {
      pcHistoriesDelta.push({ id, values: curArr, append: false });
    }
  }
  if (pcHistoriesDelta.length > 0) delta.pcHistoriesDelta = pcHistoriesDelta;

  return delta;
}

export function encodeHistoryForFile(
  historyItems: HistoryEntry[],
  historyIndex: number,
  excludedDeviceIds: Set<string>,
  topologyDeviceIds: Set<string>,
  maxItems = 60
): SerializedHistoryFile {
  let items = historyItems;
  let index = historyIndex;
  if (items.length > maxItems) {
    const start = items.length - maxItems;
    items = items.slice(start);
    index = Math.max(0, index - start);
  }
  index = Math.min(Math.max(0, index), items.length - 1);

  const clean = items.map(item => ({
    ...item,
    state: cleanState(item.state, excludedDeviceIds, topologyDeviceIds),
  }));

  const base: SerializedHistoryEntry = {
    state: serializeState(clean[0].state),
    operationType: clean[0].operationType,
    signature: clean[0].signature,
    estimatedBytes: clean[0].estimatedBytes,
    description: clean[0].description,
  };

  const deltas: SerializedHistoryDelta[] = [];
  for (let i = 1; i < clean.length; i++) {
    const d = computeDelta(clean[i - 1].state, clean[i].state);
    deltas.push({
      ...d,
      operationType: clean[i].operationType,
      description: clean[i].description,
    });
  }

  return { format: DELTA_FORMAT, base, deltas, index };
}

export function decodeHistoryFile(
  hData: { format?: string; base?: SerializedHistoryEntry; deltas?: SerializedHistoryDelta[]; items?: SerializedHistoryEntry[] }
): HistoryEntry[] | null {
  if (hData.format === DELTA_FORMAT && hData.base && Array.isArray(hData.deltas)) {
    const items: HistoryEntry[] = [];
    const baseState = deserializeState(hData.base.state);
    items.push({
      state: baseState,
      operationType: hData.base.operationType,
      signature: hData.base.signature,
      estimatedBytes: hData.base.estimatedBytes,
      description: hData.base.description,
    });

    let current = baseState;
    for (const d of hData.deltas) {
      current = applyDelta(current, d);
      items.push({
        state: current,
        operationType: d.operationType,
        signature: '',
        estimatedBytes: 0,
        description: d.description,
      });
    }
    return items;
  }

  if (Array.isArray(hData.items) && hData.items.length > 0) {
    return hData.items.map((item: SerializedHistoryEntry) => ({
      ...item,
      state: deserializeState(item.state),
    }));
  }

  return null;
}

function applyDelta(prev: ProjectState, delta: SerializedHistoryDelta): ProjectState {
  const deviceStates = new Map(prev.deviceStates);
  if (delta.deviceStatesRemoved) delta.deviceStatesRemoved.forEach(id => deviceStates.delete(id));
  if (delta.deviceStatesChanged) delta.deviceStatesChanged.forEach(([id, st]) => deviceStates.set(id, st));

  const deviceOutputs = new Map(prev.deviceOutputs);
  if (delta.deviceOutputsDelta) {
    delta.deviceOutputsDelta.forEach(({ id, values, append }) => {
      deviceOutputs.set(id, append ? [...(deviceOutputs.get(id) || []), ...values] : values);
    });
  }

  const pcOutputs = new Map(prev.pcOutputs);
  if (delta.pcOutputsDelta) {
    delta.pcOutputsDelta.forEach(({ id, values, append }) => {
      pcOutputs.set(id, append ? [...(pcOutputs.get(id) || []), ...values] : values);
    });
  }

  const pcHistories = new Map(prev.pcHistories);
  if (delta.pcHistoriesDelta) {
    delta.pcHistoriesDelta.forEach(({ id, values, append }) => {
      pcHistories.set(id, append ? [...(pcHistories.get(id) || []), ...values] : values);
    });
  }

  return {
    topologyDevices: delta.topologyDevices !== undefined ? structuredClone(delta.topologyDevices) : prev.topologyDevices,
    topologyConnections: delta.topologyConnections !== undefined ? structuredClone(delta.topologyConnections) : prev.topologyConnections,
    topologyNotes: delta.topologyNotes !== undefined ? structuredClone(delta.topologyNotes) : prev.topologyNotes,
    cableInfo: delta.cableInfo !== undefined ? { ...delta.cableInfo } : prev.cableInfo,
    activeDeviceId: delta.activeDeviceId !== undefined ? delta.activeDeviceId : prev.activeDeviceId,
    activeDeviceType: delta.activeDeviceType !== undefined ? delta.activeDeviceType : prev.activeDeviceType,
    zoom: delta.zoom !== undefined ? delta.zoom : prev.zoom,
    pan: delta.pan !== undefined ? { ...delta.pan } : prev.pan,
    activeTab: delta.activeTab !== undefined ? delta.activeTab : prev.activeTab,
    deviceStates,
    deviceOutputs,
    pcOutputs,
    pcHistories,
  };
}

