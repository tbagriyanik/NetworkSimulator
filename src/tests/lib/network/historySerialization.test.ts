import { describe, it, expect } from 'vitest';
import type { SwitchState, CableInfo, Port } from '@/lib/network/types';
import type { HistoryEntry, ProjectState } from '@/hooks/useHistory';
import { encodeHistoryForFile, decodeHistoryFile } from '@/lib/network/historySerialization';
import type { DeviceType } from '@/components/network/networkTopology.types';

function makeSwitchState(hostname: string, withStp: boolean): SwitchState {
  const ports: Record<string, Port> = {};
  for (let i = 0; i < 27; i++) {
    ports[`${i}`] = {
      id: `${i}`,
      name: `FastEthernet0/${i}`,
      type: 'fastethernet',
      status: 'notconnect',
      vlan: 1,
      mode: 'access',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
    };
  }
  const state: SwitchState = {
    hostname,
    ports,
    switchModel: 'NS-L2-24TT-L',
    switchLayer: 'L2',
    deviceType: 'switchL2',
    macAddress: '00:11:22:33:44:55',
    currentMode: 'user',
    ipRouting: false,
    vlans: { 1: { id: 1, name: 'default', status: 'active', ports: [] } },
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'] },
      vtyLines: { login: false, transportInput: ['all'] },
    },
    runningConfig: [],
    commandHistory: [],
    historyIndex: -1,
    bootTime: Date.now(),
    version: { nosVersion: '12.2', modelName: 'NS-L2-24TT-L', serialNumber: 'SN123', uptime: '1h' },
    macAddressTable: [],
    arpCache: [],
    stpState: withStp ? {
      1: { vlanId: 1, bridgeId: `32768.${hostname}`, rootBridgeId: `32768.${hostname}`, isRoot: true, rootCost: 0, ports: {} },
    } : {},
  };
  return state;
}

function makeState(hostname: string, withStp: boolean, outputs: string[]): ProjectState {
  return {
    topologyDevices: [
      { id: `sw-${hostname}`, name: hostname, type: 'switchL2' as DeviceType, ip: '', status: 'online', x: 0, y: 0, ports: [] },
    ],
    topologyConnections: [],
    topologyNotes: [],
    deviceStates: new Map([[`sw-${hostname}`, makeSwitchState(hostname, withStp)]]),
    deviceOutputs: new Map([[`sw-${hostname}`, outputs.map((content, i) => ({ id: `o${i}`, type: 'command' as const, content }))]]),
    pcOutputs: new Map(),
    pcHistories: new Map(),
    cableInfo: { connected: false, cableType: 'straight' as const, sourceDevice: 'pc' as const, targetDevice: 'switchL2' as const } as CableInfo,
    activeDeviceId: `sw-${hostname}`,
    activeDeviceType: 'switchL2' as DeviceType,
    zoom: 1,
    pan: { x: 0, y: 0 },
    activeTab: 'topology',
  };
}

function entry(state: ProjectState, operationType: HistoryEntry['operationType'], description?: string): HistoryEntry {
  return {
    state,
    operationType,
    signature: description || state.topologyDevices[0]?.id || '',
    estimatedBytes: 0,
    description,
  };
}

describe('historySerialization', () => {
  it('round-trips states and drops large derived fields', () => {
    const items: HistoryEntry[] = [
      entry(makeState('a', true, ['sh run']), 'device'),
      entry(makeState('a', true, ['sh run', 'sh vlan']), 'device'),
    ];
    const excluded = new Set<string>();
    const topologyIds = new Set(['sw-a']);

    const encoded = encodeHistoryForFile(items, 1, excluded, topologyIds);
    const decoded = decodeHistoryFile(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded).toHaveLength(2);

    // Large derived fields stripped from stored device states
    const stp0 = decoded?.[0].state.deviceStates.get('sw-a')?.stpState;
    expect(stp0).toBeUndefined();

    // Topology preserved
    expect(decoded?.[1].state.topologyDevices[0].name).toBe('a');
    // Appended device output preserved
    const outputs = decoded?.[1].state.deviceOutputs.get('sw-a') || [];
    expect(outputs.map(o => o.content)).toEqual(['sh run', 'sh vlan']);
  });

  it('stores only changed device states in deltas', () => {
    const s1 = makeState('a', true, []);
    const s2 = makeState('a', true, []);
    const sw2 = s2.deviceStates.get('sw-a');
    if (sw2) sw2.vlans['10'] = { id: 10, name: 'VLAN10', status: 'active', ports: [] };

    const items: HistoryEntry[] = [entry(s1, 'device'), entry(s2, 'device')];
    const encoded = encodeHistoryForFile(items, 1, new Set(), new Set(['sw-a']));

    expect(encoded.deltas).toHaveLength(1);
    const changed = encoded.deltas[0].deviceStatesChanged || [];
    expect(changed).toHaveLength(1);
    expect(changed[0][0]).toBe('sw-a');
    expect(changed[0][1].vlans['10'].id).toBe(10);

    const decoded = decodeHistoryFile(encoded);
    expect(decoded?.[1].state.deviceStates.get('sw-a')?.vlans['10'].id).toBe(10);
  });

  it('supports legacy full-snapshot format', () => {
    const legacy = {
      items: [
        { state: { topologyDevices: [{ id: 'sw-a', name: 'a', type: 'switchL2', x: 0, y: 0, ports: [] }], deviceStates: [['sw-a', makeSwitchState('a', false)]] as [string, SwitchState][], deviceOutputs: [], pcOutputs: [], pcHistories: [] }, operationType: 'device', signature: 'x', estimatedBytes: 0 },
      ],
    };
    const decoded = decodeHistoryFile(legacy as never);
    expect(decoded).toHaveLength(1);
    expect(decoded?.[0].state.deviceStates.get('sw-a')?.hostname).toBe('a');
  });

  it('caps exported history items to maxItems', () => {
    const items = Array.from({ length: 100 }, (_, i) => entry(makeState(`d${i}`, false, [`cmd${i}`]), 'device'));
    const encoded = encodeHistoryForFile(items, 99, new Set(), new Set());
    expect(encoded.deltas.length + 1).toBeLessThanOrEqual(60);
    expect(encoded.index).toBeLessThan(60);
    const decoded = decodeHistoryFile(encoded);
    expect(decoded).toHaveLength(60);
  });
});