import { describe, it, expect } from 'vitest';
import { SwitchState } from '../../../lib/network/types';
import { runNetworkEventPipeline } from '../../../lib/network/forwarding/eventPipeline';
import { calculateOSPFRoutes } from '../../../lib/network/ospf';
import { interfaceHandlers } from '../../../lib/network/core/interfaceCommands';
import { buildRunningConfig } from '../../../lib/network/core/configBuilder';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

function makeRouter(id: string, opts: Partial<SwitchState> = {}): SwitchState {
  return {
    hostname: id,
    routingProtocol: 'ospf',
    ospfRouterId: id,
    ospfAreas: [0],
    ip: id === 'R1' ? '10.0.0.1' : '10.0.0.2',
    ports: {},
    dynamicRoutes: [],
    runningConfig: [],
    commandHistory: [],
    bootTime: Date.now(),
    ...opts,
  } as unknown as SwitchState;
}

function makeConnection(srcId: string, srcPort: string, dstId: string, dstPort: string): CanvasConnection {
  return {
    id: `${srcId}-${srcPort}-${dstId}-${dstPort}`,
    sourceDeviceId: srcId,
    targetDeviceId: dstId,
    sourcePort: srcPort,
    targetPort: dstPort,
  } as unknown as CanvasConnection;
}

function makeDevice(id: string, ip: string): CanvasDevice {
  return { id, name: id, type: 'router', x: 0, y: 0, ip, macAddress: `00:00:00:00:00:${id.slice(-1)}` } as unknown as CanvasDevice;
}

function ospfPort(ip: string, area: string = '0', overrides: Record<string, unknown> = {}) {
  return {
    id: overrides['id'] || `eth0`,
    name: 'Eth0',
    status: 'connected',
    shutdown: false,
    ipAddress: ip,
    subnetMask: '255.255.255.252',
    type: 'gigabitethernet',
    ospfEnabled: true,
    ospfProcessId: '1',
    ospfArea: area,
    ...overrides,
  } as unknown as SwitchState['ports'][string];
}

describe('OSPF Advanced Interface Commands', () => {
  it('ip ospf cost sets port.ospfCost', () => {
    const state = makeRouter('R1');
    state.ports = { eth0: ospfPort('10.0.0.1') };
    state.currentInterface = 'eth0';
    const res = interfaceHandlers['ip ospf cost'](state, 'ip ospf cost 500', {} as never);
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['eth0']?.ospfCost).toBe(500);
  });

  it('no ip ospf cost clears it', () => {
    const state = makeRouter('R1');
    state.ports = { eth0: ospfPort('10.0.0.1', '0', { ospfCost: 100 }) };
    state.currentInterface = 'eth0';
    const res = interfaceHandlers['no ip ospf cost'](state, 'no ip ospf cost', {} as never);
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['eth0']?.ospfCost).toBeUndefined();
  });

  it('ip ospf authentication message-digest sets md5 auth', () => {
    const state = makeRouter('R1');
    state.ports = { eth0: ospfPort('10.0.0.1') };
    state.currentInterface = 'eth0';
    const res = interfaceHandlers['ip ospf authentication'](state, 'ip ospf authentication message-digest', {} as never);
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['eth0']?.ospfAuthType).toBe('md5');
  });

  it('ip ospf message-digest-key sets key id and key', () => {
    const state = makeRouter('R1');
    state.ports = { eth0: ospfPort('10.0.0.1') };
    state.currentInterface = 'eth0';
    const res = interfaceHandlers['ip ospf message-digest-key'](
      state,
      'ip ospf message-digest-key 1 md5 MySecret123',
      {} as never
    );
    expect(res.success).toBe(true);
    const port = res.newState?.ports?.['eth0'];
    expect(port?.ospfMd5KeyId).toBe(1);
    expect(port?.ospfAuthKey).toBe('MySecret123');
    expect(port?.ospfAuthType).toBe('md5');
  });

  it('ip ospf hello-interval and dead-interval set correctly', () => {
    const state = makeRouter('R1');
    state.ports = { eth0: ospfPort('10.0.0.1') };
    state.currentInterface = 'eth0';
    const hello = interfaceHandlers['ip ospf hello-interval'](state, 'ip ospf hello-interval 5', {} as never);
    expect(hello.success).toBe(true);
    expect(hello.newState?.ports?.['eth0']?.ospfHelloInterval).toBe(5);
    const stateAfter = { ...state, ...hello.newState, currentInterface: 'eth0' } as SwitchState;
    const dead = interfaceHandlers['ip ospf dead-interval'](
      stateAfter,
      'ip ospf dead-interval 20',
      {} as never
    );
    expect(dead.success).toBe(true);
    expect(dead.newState?.ports?.['eth0']?.ospfDeadInterval).toBe(20);
  });

  it('ip ospf priority sets correctly', () => {
    const state = makeRouter('R1');
    state.ports = { eth0: ospfPort('10.0.0.1') };
    state.currentInterface = 'eth0';
    const res = interfaceHandlers['ip ospf priority'](state, 'ip ospf priority 200', {} as never);
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['eth0']?.ospfPriority).toBe(200);
  });
});

describe('OSPF Passive Interface â€” Adjacency & Route Effect', () => {
  it('passive interface blocks adjacency formation', () => {
    const r1 = makeRouter('R1');
    r1.ports = { eth0: ospfPort('10.0.0.1', '0', { passiveInterface: true }) };
    const r2 = makeRouter('R2');
    r2.ports = { eth0: ospfPort('10.0.0.2', '0') };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
    const devices = [makeDevice('R1', '10.0.0.1'), makeDevice('R2', '10.0.0.2')];
    const connections = [makeConnection('R1', 'eth0', 'R2', 'eth0')];

    runNetworkEventPipeline(states, devices, connections, Date.now());

    const r1After = states.get('R1')!;
    const r2After = states.get('R2')!;
    expect(r1After.ospfNeighbors ?? []).toHaveLength(0);
    expect(r2After.ospfNeighbors ?? []).toHaveLength(0);
  });

  it('router-mode passive-interface also blocks adjacency', () => {
    const r1 = makeRouter('R1', { passiveInterfaces: ['eth0'] });
    r1.ports = { eth0: ospfPort('10.0.0.1') };
    const r2 = makeRouter('R2');
    r2.ports = { eth0: ospfPort('10.0.0.2') };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
    const devices = [makeDevice('R1', '10.0.0.1'), makeDevice('R2', '10.0.0.2')];
    const connections = [makeConnection('R1', 'eth0', 'R2', 'eth0')];

    runNetworkEventPipeline(states, devices, connections, Date.now());

    const r1After = states.get('R1')!;
    expect(r1After.ospfNeighbors ?? []).toHaveLength(0);
  });

  it('non-passive neighbors form adjacency normally', () => {
    const r1 = makeRouter('R1');
    r1.ports = { eth0: ospfPort('10.0.0.1') };
    const r2 = makeRouter('R2');
    r2.ports = { eth0: ospfPort('10.0.0.2') };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
    const devices = [makeDevice('R1', '10.0.0.1'), makeDevice('R2', '10.0.0.2')];
    const connections = [makeConnection('R1', 'eth0', 'R2', 'eth0')];

    runNetworkEventPipeline(states, devices, connections, Date.now());

    const r1After = states.get('R1')!;
    const r2After = states.get('R2')!;
    expect(r1After.ospfNeighbors ?? []).toContain('R2');
    expect(r2After.ospfNeighbors ?? []).toContain('R1');
  });

  it('passive link excluded from SPF transit â€” remote networks not learned', () => {
    // R1 â€”(eth0 passive)--- R2 â€”(eth1)--- 192.168.10.0/24
    const r1 = makeRouter('R1');
    r1.ports = { eth0: ospfPort('10.0.0.1', '0', { passiveInterface: true }) };
    const r2 = makeRouter('R2');
    r2.ports = {
      eth0: ospfPort('10.0.0.2', '0'),
      eth1: {
        id: 'eth1',
        name: 'Eth1',
        status: 'connected',
        shutdown: false,
        ipAddress: '192.168.10.1',
        subnetMask: '255.255.255.0',
        type: 'gigabitethernet',
        ospfEnabled: true,
        ospfProcessId: '1',
        ospfArea: '0',
      } as unknown as SwitchState['ports']['eth1'],
    };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
    const routes = calculateOSPFRoutes('R1', states);
    // R1 should NOT learn 192.168.10.0 via transit across the passive link
    expect(routes.some(r => r.destination === '192.168.10.0')).toBe(false);
  });

  it('non-passive link still allows transit route learning', () => {
    const r1 = makeRouter('R1');
    r1.ports = { eth0: ospfPort('10.0.0.1') };
    const r2 = makeRouter('R2');
    r2.ports = {
      eth0: ospfPort('10.0.0.2'),
      eth1: {
        id: 'eth1',
        name: 'Eth1',
        status: 'connected',
        shutdown: false,
        ipAddress: '192.168.10.1',
        subnetMask: '255.255.255.0',
        type: 'gigabitethernet',
        ospfEnabled: true,
        ospfProcessId: '1',
        ospfArea: '0',
      } as unknown as SwitchState['ports']['eth1'],
    };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
    const routes = calculateOSPFRoutes('R1', states);
    expect(routes.some(r => r.destination === '192.168.10.0')).toBe(true);
  });
});

describe('OSPF Authentication Adjacency', () => {
  it('MD5 auth mismatch blocks adjacency', () => {
    const r1 = makeRouter('R1');
    r1.ports = {
      eth0: ospfPort('10.0.0.1', '0', { ospfAuthType: 'md5', ospfMd5KeyId: 1, ospfAuthKey: 'secret1' }),
    };
    const r2 = makeRouter('R2');
    r2.ports = {
      eth0: ospfPort('10.0.0.2', '0', { ospfAuthType: 'md5', ospfMd5KeyId: 1, ospfAuthKey: 'WRONG' }),
    };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
    const devices = [makeDevice('R1', '10.0.0.1'), makeDevice('R2', '10.0.0.2')];
    const connections = [makeConnection('R1', 'eth0', 'R2', 'eth0')];

    runNetworkEventPipeline(states, devices, connections, Date.now());

    expect(states.get('R1')!.ospfNeighbors ?? []).toHaveLength(0);
    expect(states.get('R2')!.ospfNeighbors ?? []).toHaveLength(0);
  });

  it('matching MD5 auth allows adjacency', () => {
    const r1 = makeRouter('R1');
    r1.ports = {
      eth0: ospfPort('10.0.0.1', '0', { ospfAuthType: 'md5', ospfMd5KeyId: 1, ospfAuthKey: 'secret1' }),
    };
    const r2 = makeRouter('R2');
    r2.ports = {
      eth0: ospfPort('10.0.0.2', '0', { ospfAuthType: 'md5', ospfMd5KeyId: 1, ospfAuthKey: 'secret1' }),
    };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
    const devices = [makeDevice('R1', '10.0.0.1'), makeDevice('R2', '10.0.0.2')];
    const connections = [makeConnection('R1', 'eth0', 'R2', 'eth0')];

    runNetworkEventPipeline(states, devices, connections, Date.now());

    expect(states.get('R1')!.ospfNeighbors ?? []).toContain('R2');
    expect(states.get('R2')!.ospfNeighbors ?? []).toContain('R1');
  });

  it('MD5 vs simple auth type mismatch blocks adjacency', () => {
    const r1 = makeRouter('R1');
    r1.ports = { eth0: ospfPort('10.0.0.1', '0', { ospfAuthType: 'md5', ospfMd5KeyId: 1, ospfAuthKey: 'k' }) };
    const r2 = makeRouter('R2');
    r2.ports = { eth0: ospfPort('10.0.0.2', '0', { ospfAuthType: 'simple', ospfAuthKey: 'k' }) };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
    const devices = [makeDevice('R1', '10.0.0.1'), makeDevice('R2', '10.0.0.2')];
    const connections = [makeConnection('R1', 'eth0', 'R2', 'eth0')];

    runNetworkEventPipeline(states, devices, connections, Date.now());

    expect(states.get('R1')!.ospfNeighbors ?? []).toHaveLength(0);
  });

  it('simple auth mismatch blocks adjacency', () => {
    const r1 = makeRouter('R1');
    r1.ports = { eth0: ospfPort('10.0.0.1', '0', { ospfAuthType: 'simple', ospfAuthKey: 'pass1' }) };
    const r2 = makeRouter('R2');
    r2.ports = { eth0: ospfPort('10.0.0.2', '0', { ospfAuthType: 'simple', ospfAuthKey: 'pass2' }) };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
    const devices = [makeDevice('R1', '10.0.0.1'), makeDevice('R2', '10.0.0.2')];
    const connections = [makeConnection('R1', 'eth0', 'R2', 'eth0')];

    runNetworkEventPipeline(states, devices, connections, Date.now());

    expect(states.get('R1')!.ospfNeighbors ?? []).toHaveLength(0);
  });
});

describe('OSPF Area Mismatch Adjacency', () => {
  it('different areas on each side block adjacency', () => {
    const r1 = makeRouter('R1');
    r1.ports = { eth0: ospfPort('10.0.0.1', '0') };
    const r2 = makeRouter('R2');
    r2.ports = { eth0: ospfPort('10.0.0.2', '1') };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
    const devices = [makeDevice('R1', '10.0.0.1'), makeDevice('R2', '10.0.0.2')];
    const connections = [makeConnection('R1', 'eth0', 'R2', 'eth0')];

    runNetworkEventPipeline(states, devices, connections, Date.now());

    expect(states.get('R1')!.ospfNeighbors ?? []).toHaveLength(0);
    expect(states.get('R2')!.ospfNeighbors ?? []).toHaveLength(0);
  });
});

describe('OSPF Cost Override', () => {
  it('ip ospf cost affects SPF route metric', () => {
    const r1 = makeRouter('R1');
    r1.ports = { eth0: ospfPort('10.0.0.1', '0', { ospfCost: 1000 }) };
    const r2 = makeRouter('R2');
    r2.ports = {
      eth0: ospfPort('10.0.0.2', '0'),
      eth1: {
        id: 'eth1',
        name: 'Eth1',
        status: 'connected',
        shutdown: false,
        ipAddress: '172.16.1.1',
        subnetMask: '255.255.0.0',
        type: 'gigabitethernet',
        ospfEnabled: true,
        ospfProcessId: '1',
        ospfArea: '0',
      } as unknown as SwitchState['ports']['eth1'],
    };

    const states = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);

    // With manual cost: R1â†’eth0 cost=1000, R2â†’172.16.0.0 cost=1
    const routes = calculateOSPFRoutes('R1', states);
    const route = routes.find(r => r.destination === '172.16.0.0');
    expect(route).toBeDefined();
    expect(route!.metric).toBe(1000 + 1);
  });
});

describe('OSPF Interface Config Builder', () => {
  it('running-config emits OSPF interface sub-commands', () => {
    const state = makeRouter('R1');
    state.ports = {
      eth0: ospfPort('10.0.0.1', '0', {
        ospfCost: 500,
        ospfAuthType: 'md5',
        ospfMd5KeyId: 1,
        ospfAuthKey: 'mySecret',
        ospfHelloInterval: 5,
        ospfDeadInterval: 20,
        ospfPriority: 200,
      }),
    };
    state.runningConfig = buildRunningConfig(state);
    const config = state.runningConfig.join('\n');
    expect(config).toContain('ip ospf 1 area 0');
    expect(config).toContain('ip ospf authentication message-digest');
    expect(config).toContain('ip ospf message-digest-key 1 md5 mySecret');
    expect(config).toContain('ip ospf cost 500');
    expect(config).toContain('ip ospf hello-interval 5');
    expect(config).toContain('ip ospf dead-interval 20');
    expect(config).toContain('ip ospf priority 200');
  });

  it('running-config emits passive-interface under router ospf', () => {
    const state = makeRouter('R1', { passiveInterfaces: ['eth0'] });
    state.ports = { eth0: ospfPort('10.0.0.1') };
    state.runningConfig = buildRunningConfig(state);
    const config = state.runningConfig.join('\n');
    expect(config).toContain('passive-interface eth0');
  });
});

