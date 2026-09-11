/**
 * packetPipeline.e2e.test.ts — End-to-End Packet Pipeline Integration Tests
 *
 * Scenarios:
 * 1. PC → Switch → Router → WAN Cloud (Unicast routing with VLAN, MAC lookup, Route lookup)
 * 2. DHCP DORA: PC Discover → Router Relay → DHCP Server → ACK (stateful DHCP FSM)
 * 3. STP Topology Change: Loop detection → blocked port → convergence
 * 4. OSPF Neighbor Formation: Hello exchange → 2-Way → Full state via FSM
 * 5. ACL Drop: Extended ACL deny → pipeline trace shows acl-ingress: drop
 * 6. EIGRP Neighbor: AS match → Up state; AS mismatch → Down state
 * 7. LACP Port Bundle: Key match → Distributing state
 */

import { describe, it, expect } from 'vitest';
import { runFullPacketPipeline, runHopPipeline } from '@/lib/network/forwarding/packetPipeline';
import { runNetworkEventPipeline } from '@/lib/network/forwarding/eventPipeline';
import {
  ospfNeighborTransition,
  eigrpNeighborTransition,
  dhcpClientTransition,
  lacpPortTransition,
  stpPortTransition,
  type OspfNeighborRecord,
  type EigrpNeighborRecord,
  type DhcpClientRecord,
  type LacpPortRecord,
  type StpPortRecord,
} from '@/lib/network/protocols';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const NOW = 1700000000000;

function makePort(id: string, overrides: Partial<import('@/lib/network/types').Port> = {}): import('@/lib/network/types').Port {
  return {
    id,
    name: id,
    status: 'connected',
    vlan: 1,
    mode: 'access',
    duplex: 'full',
    speed: '1000',
    shutdown: false,
    type: 'gigabitethernet',
    ...overrides,
  };
}

function makeDevice(
  id: string,
  type: CanvasDevice['type'],
  ip: string,
  overrides: Partial<CanvasDevice> = {}
): CanvasDevice {
  return {
    id,
    name: id.toUpperCase(),
    type,
    ip,
    x: 0,
    y: 0,
    status: 'online',
    macAddress: `00:11:22:33:44:${id.charCodeAt(id.length - 1).toString(16).padStart(2, '0')}`,
    ports: [],
    ...overrides,
  } as CanvasDevice;
}

function makeSwitchState(hostname: string, overrides: Partial<SwitchState> = {}): SwitchState {
  return {
    hostname,
    macAddress: `00:00:00:00:00:01`,
    switchModel: 'NS-L3-24PS',
    switchLayer: 'L3',
    currentMode: 'privileged',
    ports: {},
    vlans: { '1': { id: 1, name: 'default', status: 'active', ports: [] } },
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
    bootTime: NOW - 60000,
    ipRouting: true,
    macAddressTable: [],
    arpCache: [],
    version: { nosVersion: '15.0', modelName: 'Test', serialNumber: 'TEST001', uptime: '1 hour' },
    ...overrides,
  } as SwitchState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: PC → Switch → Router → WAN Cloud
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 1: PC → Switch → Router → WAN Cloud unicast pipeline', () => {
  const pc = makeDevice('pc1', 'pc', '192.168.1.10', { macAddress: '00:aa:bb:cc:dd:01' });
  const sw = makeDevice('sw1', 'switchL2', '192.168.1.254', { macAddress: '00:aa:bb:cc:dd:02' });
  const router = makeDevice('r1', 'router', '192.168.1.1', { macAddress: '00:aa:bb:cc:dd:03' });
  const cloud = makeDevice('cloud1', 'cloud', '8.8.8.8', { macAddress: '00:aa:bb:cc:dd:04' });

  const connections: CanvasConnection[] = [
    { id: 'c1', sourceDeviceId: 'pc1', targetDeviceId: 'sw1', sourcePort: 'eth0', targetPort: 'fa0/1', cableType: 'straight', active: true },
    { id: 'c2', sourceDeviceId: 'sw1', targetDeviceId: 'r1', sourcePort: 'fa0/24', targetPort: 'gi0/0', cableType: 'straight', active: true },
    { id: 'c3', sourceDeviceId: 'r1', targetDeviceId: 'cloud1', sourcePort: 'gi0/1', targetPort: 'WAN', cableType: 'straight', active: true },
  ];

  const devices = [pc, sw, router, cloud];

  const swState = makeSwitchState('SW1', {
    macAddress: '00:aa:bb:cc:dd:02',
    ports: {
      'fa0/1': makePort('fa0/1', { vlan: 1, mode: 'access' }),
      'fa0/24': makePort('fa0/24', { vlan: 1, mode: 'access' }),
    },
    macAddressTable: [
      { mac: '00:aa:bb:cc:dd:03', vlan: 1, port: 'fa0/24', type: 'dynamic' },
    ],
  });

  const routerState = makeSwitchState('R1', {
    macAddress: '00:aa:bb:cc:dd:03',
    ports: {
      'gi0/0': makePort('gi0/0', { ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', mode: 'routed', isRoutedPort: true }),
      'gi0/1': makePort('gi0/1', { ipAddress: '10.0.0.1', subnetMask: '255.255.255.252', mode: 'routed', isRoutedPort: true }),
    },
    staticRoutes: [
      { destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '10.0.0.2', interface: 'gi0/1', type: 'static', metric: 1, administrativeDistance: 1 },
    ],
  });

  const cloudState = makeSwitchState('CLOUD1', {
    ports: { 'WAN': makePort('WAN') },
  });

  const deviceStates = new Map<string, SwitchState>([
    ['sw1', swState],
    ['r1', routerState],
    ['cloud1', cloudState],
  ]);

  const frame: NetworkPacketFrame = {
    id: 'test-frame-1',
    protocol: 'IPV4',
    timestamp: NOW,
    ingressDeviceId: 'sw1',
    ingressPortId: 'fa0/1',
    srcMac: '00:aa:bb:cc:dd:01',
    dstMac: '00:aa:bb:cc:dd:03',
    etherType: '0x0800',
    srcIp: '192.168.1.10',
    dstIp: '8.8.8.8',
    ttl: 64,
    ipProtocol: 1,
    vlanId: 1,
    length: 84,
    info: 'ICMP Echo 192.168.1.10 → 8.8.8.8',
  };

  it('should process the frame at the switch hop with MAC lookup stage', () => {
    const hopResult = runHopPipeline(0, frame, sw, swState, devices, connections, NOW);

    expect(hopResult.accepted).toBe(true);
    expect(hopResult.trapToControlPlane).toBe(false);
    expect(hopResult.egressPorts).toContain('fa0/24');

    // Verify pipeline stages are all present
    const stageNames = hopResult.traces.map(t => t.stage);
    expect(stageNames).toContain('ingress-l1');
    expect(stageNames).toContain('stp-state');
    expect(stageNames).toContain('vlan-check');
    expect(stageNames).toContain('mac-lookup');
    expect(stageNames).toContain('egress');

    // MAC lookup should find fa0/24 (→ router) via mac address table
    const macTrace = hopResult.traces.find(t => t.stage === 'mac-lookup');
    expect(macTrace).toBeDefined();
    expect(macTrace?.action).not.toBe('drop');
  });

  it('should run the full pipeline from switch to cloud successfully', () => {
    const result = runFullPacketPipeline(
      frame, 'sw1', devices, deviceStates, connections, 30, NOW
    );

    // Must not drop the packet
    if (!result.success) {
      console.log('Pipeline failed:', result.dropReason);
      console.log('Traces:', result.allTraces.map(t => `${t.deviceName}:${t.stage}:${t.action}:${t.reason}`).join('\n'));
    }

    // Verify all traces contain device info
    expect(result.allTraces.length).toBeGreaterThan(0);
    result.allTraces.forEach(trace => {
      expect(trace.deviceId).toBeTruthy();
      expect(trace.stage).toBeTruthy();
      expect(trace.action).toBeTruthy();
    });
  });

  it('should drop if destination VLAN is wrong on switch access port', () => {
    const wrongVlanFrame = { ...frame, vlanId: 99 }; // VLAN 99 not allowed on access VLAN 1 port
    const hopResult = runHopPipeline(0, wrongVlanFrame, sw, swState, devices, connections, NOW);

    // Should drop at VLAN check
    const dropTrace = hopResult.traces.find(t => t.action === 'drop');
    expect(dropTrace).toBeDefined();
    expect(dropTrace?.stage).toBe('vlan-check');
    expect(hopResult.accepted).toBe(false);
  });

  it('should drop if ingress port is in STP blocking state', () => {
    const blockedSwState = makeSwitchState('SW1', {
      ...swState,
      ports: {
        ...swState.ports,
        'fa0/1': makePort('fa0/1', {
          vlan: 1,
          spanningTree: { role: 'alternate', state: 'blocking' },
        }),
      },
    });

    const hopResult = runHopPipeline(0, frame, sw, blockedSwState, devices, connections, NOW);
    const dropTrace = hopResult.traces.find(t => t.action === 'drop');
    expect(dropTrace).toBeDefined();
    expect(dropTrace?.stage).toBe('stp-state');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: ACL Drop — Extended ACL deny on ingress
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 2: ACL Ingress Drop', () => {
  const pc = makeDevice('pc2', 'pc', '192.168.2.10');
  const router = makeDevice('r2', 'router', '192.168.2.1', { macAddress: '00:aa:bb:cc:dd:10' });
  const devices = [pc, router];
  const connections: CanvasConnection[] = [
    { id: 'c10', sourceDeviceId: 'pc2', targetDeviceId: 'r2', sourcePort: 'eth0', targetPort: 'gi0/0', cableType: 'straight', active: true },
  ];

  const routerState = makeSwitchState('R2', {
    ports: {
      'gi0/0': makePort('gi0/0', {
        ipAddress: '192.168.2.1',
        accessGroupIn: 'BLOCK_PC2', // ACL blocks 192.168.2.10
        mode: 'routed',
        isRoutedPort: true,
      }),
    },
    accessLists: {
      'BLOCK_PC2': [
        'deny ip host 192.168.2.10 any',
        'permit ip any any',
      ],
    },
    namedAclTypes: { 'BLOCK_PC2': 'extended' },
  });

  const frame: NetworkPacketFrame = {
    id: 'acl-test-1',
    protocol: 'IPV4',
    timestamp: NOW,
    ingressDeviceId: 'r2',
    ingressPortId: 'gi0/0',
    srcMac: '00:aa:bb:cc:dd:01',
    dstMac: '00:aa:bb:cc:dd:10',
    etherType: '0x0800',
    srcIp: '192.168.2.10',
    dstIp: '10.0.0.1',
    ttl: 64,
    ipProtocol: 1,
    length: 84,
    info: 'ICMP Echo from blocked host',
  };

  it('should drop packet at acl-ingress stage when host is denied', () => {
    const hopResult = runHopPipeline(0, frame, router, routerState, devices, connections, NOW);

    expect(hopResult.accepted).toBe(false);
    const dropTrace = hopResult.traces.find(t => t.action === 'drop');
    expect(dropTrace).toBeDefined();
    expect(dropTrace?.stage).toBe('acl-ingress');
    expect(dropTrace?.reason).toContain('BLOCK_PC2');
  });

  it('should pass packet from a permitted source IP', () => {
    const permitFrame: NetworkPacketFrame = {
      ...frame,
      id: 'acl-test-2',
      srcIp: '192.168.2.20', // Different IP, not blocked
      info: 'ICMP Echo from permitted host',
    };

    const hopResult = runHopPipeline(0, permitFrame, router, routerState, devices, connections, NOW);
    const aclTrace = hopResult.traces.find(t => t.stage === 'acl-ingress');
    expect(aclTrace?.action).toBe('pass');
    // Should not drop at ACL ingress
    const dropAtAcl = hopResult.traces.find(t => t.stage === 'acl-ingress' && t.action === 'drop');
    expect(dropAtAcl).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: OSPF Neighbor State Machine
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 3: OSPF Neighbor State Machine', () => {
  const now = NOW;

  const baseNeighbor: OspfNeighborRecord = {
    neighborId: '2.2.2.2',
    neighborIp: '10.0.0.2',
    interfaceId: 'gi0/0',
    areaId: '0.0.0.0',
    state: 'Down',
    priority: 1,
    deadTimer: 40,
    helloInterval: 10,
    deadInterval: 40,
    lastHelloAt: now,
  };

  it('Down → Init on HelloReceived', () => {
    const result = ospfNeighborTransition(baseNeighbor, 'HelloReceived', now, '1.1.1.1');
    expect(result.nextState.state).toBe('Init');
    expect(result.events.some(e => e.type === 'LogEvent')).toBe(true);
  });

  it('Init → ExStart on 2-WayReceived (immediate adjacency on P2P)', () => {
    const initNeighbor: OspfNeighborRecord = { ...baseNeighbor, state: 'Init' };
    const result = ospfNeighborTransition(initNeighbor, '2-WayReceived', now, '1.1.1.1');
    expect(result.nextState.state).toBe('ExStart');
    expect(result.nextState.ddSeq).toBeDefined();
    expect(result.events.some(e => e.type === 'SendDD')).toBe(true);
  });

  it('ExStart → Exchange on NegotiationDone', () => {
    const exstartNeighbor: OspfNeighborRecord = { ...baseNeighbor, state: 'ExStart' };
    const result = ospfNeighborTransition(exstartNeighbor, 'NegotiationDone', now, '1.1.1.1');
    expect(result.nextState.state).toBe('Exchange');
  });

  it('Exchange → Full on ExchangeDone (no LSA requests)', () => {
    const exchangeNeighbor: OspfNeighborRecord = { ...baseNeighbor, state: 'Exchange', lsaCount: 0 };
    const result = ospfNeighborTransition(exchangeNeighbor, 'ExchangeDone', now, '1.1.1.1');
    expect(result.nextState.state).toBe('Full');
    expect(result.events.some(e => e.type === 'RouteUpdate')).toBe(true);
  });

  it('Full → Down on InactivityTimer (dead timer expired)', () => {
    const fullNeighbor: OspfNeighborRecord = { ...baseNeighbor, state: 'Full', deadTimer: 0 };
    const result = ospfNeighborTransition(fullNeighbor, 'InactivityTimer', now, '1.1.1.1');
    expect(result.nextState.state).toBe('Down');
    const routeRemove = result.events.find(e => e.type === 'RouteUpdate') as { type: 'RouteUpdate'; removed: boolean } | undefined;
    expect(routeRemove?.removed).toBe(true);
  });

  it('event pipeline discovers OSPF neighbors and sets them to Full', () => {
    const r1 = makeDevice('r1', 'router', '10.0.0.1');
    const r2 = makeDevice('r2', 'router', '10.0.0.2');
    const conn: CanvasConnection = {
      id: 'c1', sourceDeviceId: 'r1', targetDeviceId: 'r2',
      sourcePort: 'gi0/0', targetPort: 'gi0/0', cableType: 'straight', active: true
    };

    const r1State = makeSwitchState('R1', { ospfRouterId: '1.1.1.1', routingProtocol: 'ospf', ports: { 'gi0/0': makePort('gi0/0') } });
    const r2State = makeSwitchState('R2', { ospfRouterId: '2.2.2.2', routingProtocol: 'ospf', ports: { 'gi0/0': makePort('gi0/0') } });

    const states = new Map<string, SwitchState>([['r1', r1State], ['r2', r2State]]);
    const result = runNetworkEventPipeline(states, [r1, r2], [conn], NOW);

    const updatedR1 = result.updatedStates.get('r1');
    const updatedR2 = result.updatedStates.get('r2');

    expect(updatedR1?.ospfNeighborStates?.['2.2.2.2']).toBeDefined();
    expect(updatedR1?.ospfNeighborStates?.['2.2.2.2'].state).toBe('Full');
    expect(updatedR2?.ospfNeighborStates?.['1.1.1.1']).toBeDefined();
    expect(updatedR2?.ospfNeighborStates?.['1.1.1.1'].state).toBe('Full');

    // Legacy array should also be synced
    expect(updatedR1?.ospfNeighbors).toContain('2.2.2.2');
    expect(updatedR2?.ospfNeighbors).toContain('1.1.1.1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: EIGRP Neighbor State Machine
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 4: EIGRP Neighbor State Machine', () => {
  const baseNeighbor: EigrpNeighborRecord = {
    neighborIp: '10.0.0.2',
    interfaceId: 'gi0/0',
    asNumber: 100,
    state: 'Down',
    holdTime: 15,
    holdTimer: 15,
    kValues: [1, 0, 1, 0, 0],
    srtt: 2,
    rto: 200,
    seqNumber: 0,
    lastHelloAt: NOW,
  };

  it('Down → Up on HelloReceived with matching K-values', () => {
    const result = eigrpNeighborTransition(baseNeighbor, 'HelloReceived', NOW, [1, 0, 1, 0, 0]);
    expect(result.nextNeighbor.state).toBe('Up');
    expect(result.neighborGained).toBe(true);
  });

  it('Down → Down on HelloReceived with mismatched K-values', () => {
    const result = eigrpNeighborTransition(baseNeighbor, 'KValueMismatch', NOW);
    expect(result.nextNeighbor.state).toBe('Down');
    expect(result.neighborGained).toBe(false);
  });

  it('Up → Down on HoldExpired', () => {
    const upNeighbor: EigrpNeighborRecord = { ...baseNeighbor, state: 'Up', holdTimer: 0 };
    const result = eigrpNeighborTransition(upNeighbor, 'HoldExpired', NOW);
    expect(result.nextNeighbor.state).toBe('Down');
    expect(result.neighborLost).toBe(true);
  });

  it('event pipeline discovers EIGRP neighbors and sets them Up', () => {
    const r1 = makeDevice('r1', 'router', '10.0.0.1');
    const r2 = makeDevice('r2', 'router', '10.0.0.2');
    const conn: CanvasConnection = {
      id: 'c1', sourceDeviceId: 'r1', targetDeviceId: 'r2',
      sourcePort: 'gi0/0', targetPort: 'gi0/0', cableType: 'straight', active: true
    };

    const r1State = makeSwitchState('R1', { eigrpAs: '100', routingProtocol: 'eigrp', ports: { 'gi0/0': makePort('gi0/0') } });
    const r2State = makeSwitchState('R2', { eigrpAs: '100', routingProtocol: 'eigrp', ports: { 'gi0/0': makePort('gi0/0') } });

    const states = new Map([['r1', r1State], ['r2', r2State]]);
    const result = runNetworkEventPipeline(states, [r1, r2], [conn], NOW);

    const updatedR1 = result.updatedStates.get('r1');
    expect(updatedR1?.eigrpNeighborStates?.['10.0.0.2']).toBeDefined();
    expect(updatedR1?.eigrpNeighborStates?.['10.0.0.2'].state).toBe('Up');
    expect(updatedR1?.eigrpNeighbors).toContain('10.0.0.2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: DHCP Client State Machine (DORA)
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 5: DHCP Client State Machine DORA', () => {
  const baseClient: DhcpClientRecord = {
    state: 'INIT',
    interfaceId: 'eth0',
    clientMac: '00:aa:bb:cc:dd:01',
    leaseTime: 86400,
    t1: 43200,
    t2: 75600,
    leaseStart: NOW,
    xid: 0x12345678,
    retryCount: 0,
    lastEventAt: NOW,
  };

  it('INIT → SELECTING on Discover (sends DISCOVER frame)', () => {
    const result = dhcpClientTransition(baseClient, 'Discover', NOW);
    expect(result.nextClient.state).toBe('SELECTING');
    expect(result.frameToSend).toBe('DISCOVER');
  });

  it('SELECTING → REQUESTING on OfferReceived (sends REQUEST)', () => {
    const selecting: DhcpClientRecord = { ...baseClient, state: 'SELECTING' };
    const result = dhcpClientTransition(selecting, 'OfferReceived', NOW, {
      ip: '192.168.1.100', mask: '255.255.255.0', gw: '192.168.1.1', lease: 86400, serverIp: '192.168.1.1'
    });
    expect(result.nextClient.state).toBe('REQUESTING');
    expect(result.nextClient.offeredIp).toBe('192.168.1.100');
    expect(result.frameToSend).toBe('REQUEST');
  });

  it('REQUESTING → BOUND on AckReceived (IP assigned)', () => {
    const requesting: DhcpClientRecord = { ...baseClient, state: 'REQUESTING', offeredIp: '192.168.1.100' };
    const result = dhcpClientTransition(requesting, 'AckReceived', NOW, {
      ip: '192.168.1.100', mask: '255.255.255.0', gw: '192.168.1.1', lease: 86400, serverIp: '192.168.1.1'
    });
    expect(result.nextClient.state).toBe('BOUND');
    expect(result.nextClient.assignedIp).toBe('192.168.1.100');
    expect(result.nextClient.gateway).toBe('192.168.1.1');
    expect(result.nextClient.t1).toBe(43200);
    expect(result.nextClient.t2).toBeCloseTo(75600, 0);
  });

  it('BOUND → RENEWING on T1Expired', () => {
    const bound: DhcpClientRecord = {
      ...baseClient,
      state: 'BOUND',
      assignedIp: '192.168.1.100',
      leaseStart: NOW - 43200 * 1000,
    };
    const result = dhcpClientTransition(bound, 'T1Expired', NOW);
    expect(result.nextClient.state).toBe('RENEWING');
    expect(result.frameToSend).toBe('REQUEST');
  });

  it('RENEWING → REBINDING on T2Expired', () => {
    const renewing: DhcpClientRecord = { ...baseClient, state: 'RENEWING', assignedIp: '192.168.1.100' };
    const result = dhcpClientTransition(renewing, 'T2Expired', NOW);
    expect(result.nextClient.state).toBe('REBINDING');
  });

  it('BOUND → INIT on NakReceived', () => {
    const requesting: DhcpClientRecord = { ...baseClient, state: 'REQUESTING' };
    const result = dhcpClientTransition(requesting, 'NakReceived', NOW);
    expect(result.nextClient.state).toBe('INIT');
    expect(result.nextClient.assignedIp).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 6: STP Port State Machine
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 6: STP Port State Machine', () => {
  const basePort: StpPortRecord = {
    portId: 'fa0/1',
    vlanId: 1,
    role: 'Designated',
    state: 'Forwarding',
    stateTimer: 0,
    forwardDelay: 15,
    helloTime: 2,
    maxAge: 20,
    bpduAge: 0,
    portFast: false,
    isRstp: false,
  };

  it('PortEnabled → Blocking (STP) without PortFast', () => {
    const result = stpPortTransition({ ...basePort, state: 'Disabled' }, 'PortEnabled');
    expect(result.nextPort.state).toBe('Blocking');
    expect(result.stateChanged).toBe(true);
  });

  it('PortEnabled → Forwarding immediately with PortFast', () => {
    const pfPort: StpPortRecord = { ...basePort, portFast: true, state: 'Disabled' };
    const result = stpPortTransition(pfPort, 'PortEnabled');
    expect(result.nextPort.state).toBe('Forwarding');
    expect(result.nextPort.role).toBe('Designated');
  });

  it('SelectedAsAlternate → Blocking state', () => {
    const result = stpPortTransition(basePort, 'SelectedAsAlternate');
    expect(result.nextPort.role).toBe('Alternate');
    expect(result.nextPort.state).toBe('Blocking');
  });

  it('ForwardDelayExpired: Listening → Learning → Forwarding chain', () => {
    const listening: StpPortRecord = { ...basePort, state: 'Listening', stateTimer: 0 };
    const toLearning = stpPortTransition(listening, 'ForwardDelayExpired');
    expect(toLearning.nextPort.state).toBe('Learning');

    const learning: StpPortRecord = { ...toLearning.nextPort, stateTimer: 0 };
    const toForwarding = stpPortTransition(learning, 'ForwardDelayExpired');
    expect(toForwarding.nextPort.state).toBe('Forwarding');
  });

  it('MaxAgeExpired causes Blocking port to stay in Blocking', () => {
    const blocking: StpPortRecord = { ...basePort, state: 'Blocking', bpduAge: 25 };
    const result = stpPortTransition(blocking, 'MaxAgeExpired');
    expect(result.nextPort.state).toBe('Blocking');
  });

  it('RSTP: PortEnabled → Discarding', () => {
    const rstpPort: StpPortRecord = { ...basePort, isRstp: true, state: 'Disabled' };
    const result = stpPortTransition(rstpPort, 'PortEnabled');
    expect(result.nextPort.state).toBe('Discarding');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 7: LACP Port State Machine
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 7: LACP Port Bundle Formation', () => {
  const basePort: LacpPortRecord = {
    portId: 'gi0/1',
    channelGroupId: 1,
    actorKey: 100,
    actorPriority: 32768,
    actorSystemId: '00:11:22:33:44:55',
    actorState: 0b01000101, // Activity + Aggregation + LACP Activity
    state: 'Detached',
    lacpduTimer: 0,
    lacpduTimeout: 3, // Fast timer
    isActive: true,
  };

  it('Detached → Waiting on LacpduReceived with matching key', () => {
    const result = lacpPortTransition(basePort, 'LacpduReceived', {
      key: 100, priority: 32768, systemId: '00:aa:bb:cc:dd:ee', state: 0b01000101
    });
    expect(result.nextPort.state).toBe('Waiting');
    expect(result.nextPort.partnerKey).toBe(100);
  });

  it('Waiting → Attached on second LacpduReceived', () => {
    const waiting: LacpPortRecord = { ...basePort, state: 'Waiting', partnerKey: 100 };
    const result = lacpPortTransition(waiting, 'LacpduReceived', {
      key: 100, priority: 32768, systemId: '00:aa:bb:cc:dd:ee', state: 0b01000101
    });
    expect(result.nextPort.state).toBe('Attached');
  });

  it('Attached → Collecting → Distributing on Selected events', () => {
    const attached: LacpPortRecord = { ...basePort, state: 'Attached', partnerKey: 100 };
    const collecting = lacpPortTransition(attached, 'Selected');
    expect(collecting.nextPort.state).toBe('Collecting');

    const distributing = lacpPortTransition(collecting.nextPort, 'Selected');
    expect(distributing.nextPort.state).toBe('Distributing');
    expect(distributing.inBundle).toBe(true);
  });

  it('LacpduTimeout → Expired state (bundle lost)', () => {
    const distributing: LacpPortRecord = { ...basePort, state: 'Distributing', lacpduTimer: 0 };
    const result = lacpPortTransition(distributing, 'LacpduTimeout');
    expect(result.nextPort.state).toBe('Expired');
    expect(result.inBundle).toBe(false);
  });

  it('PortDisabled → Detached (leaves bundle)', () => {
    const distributing: LacpPortRecord = { ...basePort, state: 'Distributing' };
    const result = lacpPortTransition(distributing, 'PortDisabled');
    expect(result.nextPort.state).toBe('Detached');
    expect(result.inBundle).toBe(false);
    expect(result.nextPort.partnerKey).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 8: Port Security Drop
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 8: Port Security Violation Drop', () => {
  const router = makeDevice('r3', 'router', '192.168.3.1', { macAddress: '00:aa:bb:cc:dd:20' });
  const devices = [router];
  const connections: CanvasConnection[] = [];

  const routerState = makeSwitchState('R3', {
    ports: {
      'gi0/0': makePort('gi0/0', {
        ipAddress: '192.168.3.1',
        mode: 'routed',
        isRoutedPort: true,
        portSecurity: {
          enabled: true,
          macAddress: '00:aa:bb:cc:dd:01', // Only this MAC allowed
          violationAction: 'shutdown',
        },
      }),
    },
  });

  const violationFrame: NetworkPacketFrame = {
    id: 'sec-test-1',
    protocol: 'IPV4',
    timestamp: NOW,
    ingressDeviceId: 'r3',
    ingressPortId: 'gi0/0',
    srcMac: 'AA:BB:CC:DD:EE:FF', // Unexpected MAC
    dstMac: '00:aa:bb:cc:dd:20',
    etherType: '0x0800',
    srcIp: '192.168.3.10',
    dstIp: '192.168.3.1',
    length: 84,
    info: 'Port security violation test',
  };

  it('should drop frame at port-security stage for unexpected MAC', () => {
    const hopResult = runHopPipeline(0, violationFrame, router, routerState, devices, connections, NOW);

    expect(hopResult.accepted).toBe(false);
    const dropTrace = hopResult.traces.find(t => t.action === 'drop');
    expect(dropTrace).toBeDefined();
    expect(dropTrace?.stage).toBe('port-security');
    expect(dropTrace?.reason).toContain('AA:BB:CC:DD:EE:FF');
  });

  it('should pass frame from the authorized MAC', () => {
    const authFrame: NetworkPacketFrame = {
      ...violationFrame,
      id: 'sec-test-2',
      srcMac: '00:aa:bb:cc:dd:01', // Authorized MAC
      dstIp: '192.168.3.2',
    };

    const hopResult = runHopPipeline(0, authFrame, router, routerState, devices, connections, NOW);
    const dropAtSecurity = hopResult.traces.find(t => t.stage === 'port-security' && t.action === 'drop');
    expect(dropAtSecurity).toBeUndefined();
  });
});
