import { describe, it, expect } from 'vitest';
import { computeLiveSummary } from '@/lib/network/liveSummary';
import { SwitchState, SecurityConfig, CableType, Port } from '@/lib/network/types';
import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

const defaultSecurity: SecurityConfig = {
  enableSecretEncrypted: false, servicePasswordEncryption: false,
  users: [], consoleLine: { login: false, transportInput: [] },
  vtyLines: { login: false, transportInput: [] },
};

const basePort: Port = {
  id: '', name: '', status: 'notconnect', vlan: 1, mode: 'access',
  duplex: 'auto', speed: 'auto', shutdown: false, type: 'fastethernet',
};

function mockDevice(id: string, type: CanvasDevice['type']): CanvasDevice {
  return { id, type, name: id, ip: '0.0.0.0', x: 0, y: 0, status: 'online', ports: [] };
}

function mockConnection(id: string, active: boolean): CanvasConnection {
  return { id, sourceDeviceId: '', sourcePort: '', targetDeviceId: '', targetPort: '', cableType: 'straight' as CableType, active };
}

function mockState(overrides: Partial<SwitchState> = {}): SwitchState {
  return {
    hostname: 'sw1', macAddress: '0011.0000.0000', switchModel: 'WS-C2960-24TT-L',
    switchLayer: 'L2', currentMode: 'privileged', commandHistory: [],
    ports: {}, vlans: {}, security: defaultSecurity, runningConfig: [],
    historyIndex: 0, bootTime: Date.now(), ipRouting: false,
    macAddressTable: [], arpCache: [],
    version: { nosVersion: '', modelName: '', serialNumber: '', uptime: '' },
    ...overrides,
  };
}

function assertResult<T>(val: T | null): NonNullable<T> {
  expect(val).not.toBeNull();
  return val as NonNullable<T>;
}

describe('computeLiveSummary', () => {
  it('should return null when devices is null', () => {
    const result = computeLiveSummary(null as unknown as CanvasDevice[], [], new Map());
    expect(result).toBeNull();
  });

  it('should return null when states is null', () => {
    const result = computeLiveSummary([], [], null as unknown as Map<string, SwitchState>);
    expect(result).toBeNull();
  });

  it('should count device types correctly', () => {
    const devices = [
      mockDevice('pc1', 'pc'), mockDevice('sw1', 'switchL2'), mockDevice('r1', 'router'),
      mockDevice('iot1', 'iot'), mockDevice('fw1', 'firewall'), mockDevice('wlc1', 'wlc'),
    ];
    const result = assertResult(computeLiveSummary(devices, [], new Map()));
    expect(result.deviceCount).toEqual({ total: 6, routers: 1, switches: 1, pcs: 1, iot: 1, firewalls: 1, wlcs: 1 });
  });

  it('should count active links', () => {
    const connections = [mockConnection('c1', true), mockConnection('c2', false), mockConnection('c3', true)];
    const result = assertResult(computeLiveSummary([], connections, new Map()));
    expect(result.activeLinks).toBe(2);
  });

  it('should count VLANs from states', () => {
    const state = mockState({ vlans: { '10': { id: 10, name: 'vlan10', status: 'active', ports: [] }, '20': { id: 20, name: 'vlan20', status: 'active', ports: [] } } });
    const result = assertResult(computeLiveSummary([], [], new Map([['sw1', state]])));
    expect(result.vlanCount).toBe(2);
  });

  it('should count routes from staticRoutes and dynamicRoutes', () => {
    const state = mockState({
      staticRoutes: [{ destination: '10.0.0.0', prefixLength: 24, nextHop: '192.168.1.1', type: 'static', interface: 'Fa0/1', metric: 1 }],
      dynamicRoutes: [{ destination: '20.0.0.0', prefixLength: 24, nextHop: '192.168.1.2', type: 'dynamic', interface: 'Fa0/2', metric: 120 }],
    });
    const result = assertResult(computeLiveSummary([], [], new Map([['sw1', state]])));
    expect(result.routingTableSummary).toEqual({ totalRoutes: 2, connected: 0, static: 1, dynamic: 1 });
  });

  it('should count connected routes from route entries', () => {
    const state = mockState({
      staticRoutes: [{ destination: '10.0.0.0', subnetMask: '255.255.255.0', nextHop: '0.0.0.0', type: 'connected', interface: 'Fa0/1' }],
    });
    const result = assertResult(computeLiveSummary([], [], new Map([['sw1', state]])));
    expect(result.routingTableSummary).toEqual({ totalRoutes: 1, connected: 1, static: 0, dynamic: 0 });
  });

  it('should count OSPF areas and neighbors', () => {
    const state = mockState({ ospfAreas: [0, 1], ospfNeighbors: ['10.0.0.2'] });
    const result = assertResult(computeLiveSummary([], [], new Map([['sw1', state]])));
    expect(result.protocolStats.ospf).toEqual({ count: 1, neighbors: 1 });
  });

  it('should count STP blocked ports and root switches', () => {
    const state = mockState({
      ports: {
        'Fa0/1': { ...basePort, id: 'Fa0/1', name: 'Fa0/1', status: 'connected', spanningTree: { role: 'root', state: 'forwarding' } },
        'Fa0/2': { ...basePort, id: 'Fa0/2', name: 'Fa0/2', status: 'connected', spanningTree: { state: 'blocking' } },
      },
    });
    const devices = [mockDevice('sw1', 'switchL2')];
    const result = assertResult(computeLiveSummary(devices, [], new Map([['sw1', state]])));
    expect(result.protocolStats.stp).toEqual({ roots: 0, blocked: 1 });
  });

  it('should count HSRP active and standby groups', () => {
    const state = mockState({
      ports: { 'Fa0/1': { ...basePort, id: 'Fa0/1', name: 'Fa0/1', status: 'connected', hsrp: { groups: { 1: { state: 'Active' }, 2: { state: 'Standby' } } } } },
    });
    const result = assertResult(computeLiveSummary([], [], new Map([['sw1', state]])));
    expect(result.protocolStats.hsrp).toEqual({ active: 1, standby: 1 });
  });

  it('should count EIGRP AS and neighbors', () => {
    const state = mockState({ eigrpAs: '100', eigrpNeighbors: ['10.0.0.2', '10.0.0.3'] });
    const result = assertResult(computeLiveSummary([], [], new Map([['sw1', state]])));
    expect(result.protocolStats.eigrp).toEqual({ count: 1, neighbors: 2 });
  });
});
