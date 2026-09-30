import { describe, it, expect } from 'vitest';
import { runHopPipeline } from '@/lib/network/forwarding/packetPipeline';
import { tickMulticast, checkRpf, getPrunedPorts, isMulticastAddress } from '@/lib/network/forwarding/multicastEngine';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';

function createMockFrame(overrides: Partial<NetworkPacketFrame> & { id: string; srcMac: string; dstMac: string }): NetworkPacketFrame {
  return {
    protocol: 'UDP',
    timestamp: Date.now(),
    etherType: '0800',
    length: 64,
    info: 'UDP Multicast Frame',
    ...overrides,
  };
}

describe('Multicast Forwarding Pipeline (PIM & IGMP)', () => {
  const switchDevice: CanvasDevice = {
    id: 'sw-1',
    name: 'Switch-1',
    type: 'switchL2',
    ip: '',
    status: 'online',
    ports: [],
    x: 0,
    y: 0,
  };

  const routerDevice: CanvasDevice = {
    id: 'r-1',
    name: 'Router-1',
    type: 'router',
    ip: '',
    status: 'online',
    ports: [],
    x: 100,
    y: 100,
  };

  const connections: CanvasConnection[] = [
    { id: 'c1', sourceDeviceId: 'r-1', sourcePort: 'GigabitEthernet0/0', targetDeviceId: 'sw-1', targetPort: 'Fa0/1', active: true, cableType: 'straight' },
    { id: 'c2', sourceDeviceId: 'sw-1', sourcePort: 'Fa0/2', targetDeviceId: 'pc-1', targetPort: 'Eth0', active: true, cableType: 'straight' },
    { id: 'c3', sourceDeviceId: 'sw-1', sourcePort: 'Fa0/3', targetDeviceId: 'pc-2', targetPort: 'Eth0', active: true, cableType: 'straight' },
  ];

  it('forwards multicast frames on L2 switch only to IGMP joined ports', () => {
    const switchState = {
      multicastRoutingEnabled: false,
      igmpSnoopingEnabled: true,
      ports: {
        'Fa0/1': { id: 'Fa0/1', status: 'connected', shutdown: false },
        'Fa0/2': { id: 'Fa0/2', status: 'connected', shutdown: false, igmpGroups: ['239.255.1.1'] },
        'Fa0/3': { id: 'Fa0/3', status: 'connected', shutdown: false }, // Not joined
      },
    } as unknown as SwitchState;

    const frame = createMockFrame({
      id: 'f1',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:7f:01:01',
      srcIp: '192.168.1.10',
      dstIp: '239.255.1.1',
      ingressPortId: 'Fa0/1',
      vlanId: 1,
      ttl: 64,
    });

    const res = runHopPipeline(0, frame, switchDevice, switchState, [switchDevice], connections);
    expect(res.accepted).toBe(true);
    expect(res.egressPorts).toContain('Fa0/2');
    expect(res.egressPorts).not.toContain('Fa0/3');
    expect(res.egressPorts).not.toContain('Fa0/1'); // Excludes ingress port
  });

  it('replicates multicast stream on L3 router to downstream PIM interfaces and IGMP receivers', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false, pimMode: 'sparse-mode' },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false, pimMode: 'sparse-mode' },
        'GigabitEthernet0/2': { id: 'GigabitEthernet0/2', status: 'connected', shutdown: false, igmpGroups: ['239.1.1.100'] },
        'GigabitEthernet0/3': { id: 'GigabitEthernet0/3', status: 'connected', shutdown: false }, // Unconfigured for multicast
      },
    } as unknown as SwitchState;

    const incomingFrame = createMockFrame({
      id: 'f2',
      srcMac: '00:aa:bb:cc:dd:ee',
      dstMac: '01:00:5e:01:01:64',
      srcIp: '10.0.0.5',
      dstIp: '239.1.1.100',
      ingressPortId: 'GigabitEthernet0/0',
      ttl: 64,
    });

    const res = runHopPipeline(0, incomingFrame, routerDevice, routerState, [routerDevice], connections);
    expect(res.accepted).toBe(true);
    // Egress should include PIM neighbor (Gi0/1) and IGMP receiver (Gi0/2), but not ingress (Gi0/0) or uninvolved (Gi0/3)
    expect(res.egressPorts).toContain('GigabitEthernet0/1');
    expect(res.egressPorts).toContain('GigabitEthernet0/2');
    expect(res.egressPorts).not.toContain('GigabitEthernet0/0');
    expect(res.egressPorts).not.toContain('GigabitEthernet0/3');
  });

  it('drops multicast packets on router when ip multicast-routing is disabled', () => {
    const routerState = {
      multicastRoutingEnabled: false,
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false, igmpGroups: ['239.1.1.100'] },
      },
    } as unknown as SwitchState;

    const incomingFrame = createMockFrame({
      id: 'f3',
      srcMac: '00:aa:bb:cc:dd:ee',
      dstMac: '01:00:5e:01:01:64',
      srcIp: '10.0.0.5',
      dstIp: '239.1.1.100',
      ingressPortId: 'GigabitEthernet0/0',
      ttl: 64,
    });

    const res = runHopPipeline(0, incomingFrame, routerDevice, routerState, [routerDevice], connections);
    expect(res.egressPorts).toEqual([]);
    const routeTrace = res.traces.find((t) => t.stage === 'route-lookup');
    expect(routeTrace?.reason).toContain('disabled');
  });

  it('forwards multicast based on explicit mrouteEntries OIL', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      mrouteEntries: [
        {
          group: '239.100.1.1',
          source: '10.0.0.1',
          incomingInterface: 'GigabitEthernet0/0',
          outgoingInterfaces: ['GigabitEthernet0/2'],
        },
      ],
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false },
        'GigabitEthernet0/2': { id: 'GigabitEthernet0/2', status: 'connected', shutdown: false },
      },
    } as unknown as SwitchState;

    const frame = createMockFrame({
      id: 'f4',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:64:01:01',
      srcIp: '10.0.0.1',
      dstIp: '239.100.1.1',
      ingressPortId: 'GigabitEthernet0/0',
      ttl: 32,
    });

    const res = runHopPipeline(0, frame, routerDevice, routerState, [routerDevice], connections);
    expect(res.egressPorts).toEqual(['GigabitEthernet0/2']);
  });

  it('drops multicast packets when RPF check fails', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      staticRoutes: [
        { destination: '10.0.0.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.1', interface: 'GigabitEthernet0/0' }
      ],
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false, pimMode: 'sparse-mode', ipAddress: '10.0.0.1', subnetMask: '255.255.255.0' },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false, pimMode: 'sparse-mode', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0' },
        'GigabitEthernet0/2': { id: 'GigabitEthernet0/2', status: 'connected', shutdown: false, igmpGroups: ['239.1.1.100'] },
      },
    } as unknown as SwitchState;

    // Arrives on Gi0/1 instead of Gi0/0 (RPF failure)
    const incomingFrame = createMockFrame({
      id: 'f-rpf-fail',
      srcMac: '00:aa:bb:cc:dd:ee',
      dstMac: '01:00:5e:01:01:64',
      srcIp: '10.0.0.5',
      dstIp: '239.1.1.100',
      ingressPortId: 'GigabitEthernet0/1',
      ttl: 64,
    });

    const res = runHopPipeline(0, incomingFrame, routerDevice, routerState, [routerDevice], connections);
    expect(res.egressPorts).toEqual([]);
    const routeTrace = res.traces.find((t) => t.stage === 'route-lookup');
    expect(routeTrace?.reason).toContain('RPF check failed');
  });

  it('drops multicast packets when TTL is 1 (TTL exhaustion)', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false, pimMode: 'sparse-mode' },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false, pimMode: 'sparse-mode' },
      },
    } as unknown as SwitchState;

    const incomingFrame = createMockFrame({
      id: 'f-ttl-drop',
      srcMac: '00:aa:bb:cc:dd:ee',
      dstMac: '01:00:5e:01:01:64',
      srcIp: '10.0.0.5',
      dstIp: '239.1.1.100',
      ingressPortId: 'GigabitEthernet0/0',
      ttl: 1,
    });

    const res = runHopPipeline(0, incomingFrame, routerDevice, routerState, [routerDevice], connections);
    expect(res.egressPorts).toEqual([]);
    const routeTrace = res.traces.find((t) => t.stage === 'route-lookup');
    expect(routeTrace?.reason).toContain('TTL exhausted');
  });

  it('floods multicast traffic to IGMP router ports on L2 switch even without receiver membership', () => {
    const switchState = {
      multicastRoutingEnabled: false,
      igmpSnoopingEnabled: true,
      ports: {
        'Fa0/1': { id: 'Fa0/1', status: 'connected', shutdown: false },
        'Fa0/2': { id: 'Fa0/2', status: 'connected', shutdown: false, isMrouterPort: true }, // IGMP Mrouter port
        'Fa0/3': { id: 'Fa0/3', status: 'connected', shutdown: false }, // Regular non-joined port
      },
    } as unknown as SwitchState;

    const frame = createMockFrame({
      id: 'f-mrouter-flood',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:7f:01:01',
      srcIp: '192.168.1.10',
      dstIp: '239.255.1.1',
      ingressPortId: 'Fa0/1',
      vlanId: 1,
      ttl: 64,
    });

    const res = runHopPipeline(0, frame, switchDevice, switchState, [switchDevice], connections);
    expect(res.accepted).toBe(true);
    expect(res.egressPorts).toContain('Fa0/2');
    expect(res.egressPorts).not.toContain('Fa0/3');
  });

  it('prunes L2 switch forwarding state when host leaves IGMP group', () => {
    const switchStateJoined = {
      multicastRoutingEnabled: false,
      igmpSnoopingEnabled: true,
      ports: {
        'Fa0/1': { id: 'Fa0/1', status: 'connected', shutdown: false },
        'Fa0/2': { id: 'Fa0/2', status: 'connected', shutdown: false, igmpGroups: ['239.5.5.5'] },
      },
    } as unknown as SwitchState;

    const switchStateLeft = {
      multicastRoutingEnabled: false,
      igmpSnoopingEnabled: true,
      ports: {
        'Fa0/1': { id: 'Fa0/1', status: 'connected', shutdown: false },
        'Fa0/2': { id: 'Fa0/2', status: 'connected', shutdown: false, igmpGroups: [] }, // Host left
      },
    } as unknown as SwitchState;

    const frame = createMockFrame({
      id: 'f-leave',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:05:05:05',
      srcIp: '192.168.1.10',
      dstIp: '239.5.5.5',
      ingressPortId: 'Fa0/1',
      vlanId: 1,
      ttl: 64,
    });

    const resJoined = runHopPipeline(0, frame, switchDevice, switchStateJoined, [switchDevice], connections);
    expect(resJoined.egressPorts).toContain('Fa0/2');

    const resLeft = runHopPipeline(0, frame, switchDevice, switchStateLeft, [switchDevice], connections);
    expect(resLeft.egressPorts).not.toContain('Fa0/2');
  });

  it('routes multicast via PIM-SM (*, G) Rendezvous Point (RP) state', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      pimRpAddress: '10.0.0.100',
      mrouteEntries: [
        {
          group: '239.2.2.2',
          source: '*',
          rpAddress: '10.0.0.100',
          incomingInterface: 'GigabitEthernet0/0',
          outgoingInterfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
        },
      ],
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false, pimMode: 'sparse-mode' },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false, pimMode: 'sparse-mode' },
        'GigabitEthernet0/2': { id: 'GigabitEthernet0/2', status: 'connected', shutdown: false, pimMode: 'sparse-mode' },
      },
    } as unknown as SwitchState;

    const frame = createMockFrame({
      id: 'f-pim-sm-star-g',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:02:02:02',
      srcIp: '10.0.0.50',
      dstIp: '239.2.2.2',
      ingressPortId: 'GigabitEthernet0/0',
      ttl: 64,
    });

    const res = runHopPipeline(0, frame, routerDevice, routerState, [routerDevice], connections);
    expect(res.accepted).toBe(true);
    expect(res.egressPorts).toContain('GigabitEthernet0/1');
    expect(res.egressPorts).toContain('GigabitEthernet0/2');
    expect(res.egressPorts).not.toContain('GigabitEthernet0/0');
  });

  it('isolates IGMP snooping multicast streams between different VLANs on L2 switch', () => {
    const switchState = {
      multicastRoutingEnabled: false,
      igmpSnoopingEnabled: true,
      ports: {
        'Fa0/1': { id: 'Fa0/1', status: 'connected', shutdown: false, vlan: 10 },
        'Fa0/2': { id: 'Fa0/2', status: 'connected', shutdown: false, vlan: 10, igmpGroups: ['239.10.10.10'] },
        'Fa0/3': { id: 'Fa0/3', status: 'connected', shutdown: false, vlan: 20, igmpGroups: ['239.10.10.10'] }, // Different VLAN
      },
    } as unknown as SwitchState;

    const frameVlan10 = createMockFrame({
      id: 'f-vlan10-mcast',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:0a:0a:0a',
      srcIp: '10.10.10.5',
      dstIp: '239.10.10.10',
      ingressPortId: 'Fa0/1',
      vlanId: 10,
      ttl: 64,
    });

    const res = runHopPipeline(0, frameVlan10, switchDevice, switchState, [switchDevice], connections);
    expect(res.accepted).toBe(true);
    expect(res.egressPorts).toContain('Fa0/2');
    expect(res.egressPorts).not.toContain('Fa0/3'); // VLAN 20 port must be isolated
  });

  it('handles PIM Dense-Mode (PIM-DM) flood to active interfaces', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      mrouteEntries: [
        {
          group: '239.20.20.20',
          source: '10.0.0.10',
          incomingInterface: 'GigabitEthernet0/0',
          outgoingInterfaces: ['GigabitEthernet0/1'],
          prunedInterfaces: ['GigabitEthernet0/2'], // Pruned port
        },
      ],
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false, pimMode: 'dense-mode' },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false, pimMode: 'dense-mode' },
        'GigabitEthernet0/2': { id: 'GigabitEthernet0/2', status: 'connected', shutdown: false, pimMode: 'dense-mode' },
      },
    } as unknown as SwitchState;

    const frame = createMockFrame({
      id: 'f-pim-dm',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:14:14:14',
      srcIp: '10.0.0.10',
      dstIp: '239.20.20.20',
      ingressPortId: 'GigabitEthernet0/0',
      ttl: 64,
    });

    const res = runHopPipeline(0, frame, routerDevice, routerState, [routerDevice], connections);
    expect(res.egressPorts).toContain('GigabitEthernet0/1');
    expect(res.egressPorts).not.toContain('GigabitEthernet0/2');
  });

  it('validates IP multicast address range helper correctly', () => {
    expect(isMulticastAddress('224.0.0.1')).toBe(true);
    expect(isMulticastAddress('239.255.255.250')).toBe(true);
    expect(isMulticastAddress('232.0.0.1')).toBe(true);
    expect(isMulticastAddress('192.168.1.1')).toBe(false);
    expect(isMulticastAddress('10.0.0.1')).toBe(false);
    expect(isMulticastAddress(undefined)).toBe(false);
    expect(isMulticastAddress('')).toBe(false);
  });

  it('RPF check detects expected interface based on subnet matching', () => {
    const routerState = {
      ports: {
        'GigabitEthernet0/0': { ipAddress: '10.1.1.1', subnetMask: '255.255.255.0' },
        'GigabitEthernet0/1': { ipAddress: '10.2.2.1', subnetMask: '255.255.255.0' },
      },
    } as unknown as SwitchState;

    const validRpf = checkRpf(routerState, '10.1.1.50', 'GigabitEthernet0/0');
    expect(validRpf.passed).toBe(true);
    expect(validRpf.expectedInterface).toBe('GigabitEthernet0/0');

    const invalidRpf = checkRpf(routerState, '10.1.1.50', 'GigabitEthernet0/1');
    expect(invalidRpf.passed).toBe(false);
    expect(invalidRpf.expectedInterface).toBe('GigabitEthernet0/0');
  });

  it('RPF check gracefully allows packets if source subnet is not directly attached', () => {
    const routerState = {
      ports: {
        'GigabitEthernet0/0': { ipAddress: '192.168.1.1', subnetMask: '255.255.255.0' },
      },
    } as unknown as SwitchState;

    const unknownRpf = checkRpf(routerState, '172.16.1.10', 'GigabitEthernet0/0');
    expect(unknownRpf.passed).toBe(true);
  });

  it('aggregates pruned ports from global state and mroute entries', () => {
    const state = {
      pimPrunedInterfaces: {
        '239.1.1.1': ['GigabitEthernet0/2'],
      },
      mrouteEntries: [
        {
          group: '239.1.1.1',
          source: '10.0.0.1',
          incomingInterface: 'GigabitEthernet0/0',
          outgoingInterfaces: ['GigabitEthernet0/1'],
          prunedInterfaces: ['GigabitEthernet0/3'],
        },
      ],
    } as unknown as SwitchState;

    const pruned = getPrunedPorts(state, '239.1.1.1');
    expect(pruned).toContain('GigabitEthernet0/2');
    expect(pruned).toContain('GigabitEthernet0/3');
    expect(pruned).not.toContain('GigabitEthernet0/1');
  });

  it('tickMulticast generates PIM Hello packets on PIM-enabled interfaces', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false, pimMode: 'sparse-mode', ipAddress: '10.0.0.1' },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false, pimMode: 'dense-mode', ipAddress: '10.0.1.1' },
        'GigabitEthernet0/2': { id: 'GigabitEthernet0/2', status: 'connected', shutdown: false }, // No PIM
      },
    } as unknown as SwitchState;

    const now = 100000;
    const { frames, state } = tickMulticast(routerState, 'r-1', now);
    const pimHellos = frames.filter(f => f.protocol === 'PIM');

    expect(pimHellos.length).toBe(2);
    expect(pimHellos.some(f => f.info?.includes('GigabitEthernet0/0'))).toBe(true);
    expect(pimHellos.some(f => f.info?.includes('GigabitEthernet0/1'))).toBe(true);
    expect(pimHellos.some(f => f.info?.includes('GigabitEthernet0/2'))).toBe(false);
    expect(state.pimNeighbors).toBeDefined();
  });

  it('tickMulticast generates IGMP General Query on IGMP snooping switches', () => {
    const switchState = {
      multicastRoutingEnabled: false,
      igmpSnoopingEnabled: true,
      ports: {
        'Fa0/1': { id: 'Fa0/1', status: 'connected', shutdown: false },
      },
    } as unknown as SwitchState;

    const now = 60000; // Aligns with 60s queryInterval
    const { frames } = tickMulticast(switchState, 'sw-1', now);
    const igmpQueries = frames.filter(f => f.protocol === 'IGMP');

    expect(igmpQueries.length).toBeGreaterThan(0);
    expect(igmpQueries[0].dstIp).toBe('224.0.0.1');
  });

  it('tickMulticast automatically builds (*, G) mroute entries from port igmpGroups', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      pimRpAddress: '10.0.0.254',
      ports: {
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false, igmpGroups: ['239.50.50.50'] },
      },
    } as unknown as SwitchState;

    const now = 200000;
    const { state } = tickMulticast(routerState, 'r-1', now);
    expect(state.mrouteEntries).toBeDefined();
    const starG = state.mrouteEntries?.find(e => e.group === '239.50.50.50' && e.source === '*');
    expect(starG).toBeDefined();
    expect(starG?.outgoingInterfaces).toContain('GigabitEthernet0/1');
    expect(starG?.rpAddress).toBe('10.0.0.254');
  });

  it('synchronizes IGMP memberships during multicast tick', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      ports: {
        'GigabitEthernet0/2': { id: 'GigabitEthernet0/2', status: 'connected', shutdown: false, ipAddress: '192.168.5.1', igmpGroups: ['239.9.9.9'], igmpVersion: 2 },
      },
    } as unknown as SwitchState;

    const now = 300000;
    const { state } = tickMulticast(routerState, 'r-1', now);
    expect(state.igmpMemberships).toBeDefined();
    expect(state.igmpMemberships?.['239.9.9.9']).toBeDefined();
    expect(state.igmpMemberships?.['239.9.9.9'].interface).toBe('GigabitEthernet0/2');
    expect(state.igmpMemberships?.['239.9.9.9'].lastReporter).toBe('192.168.5.1');
  });

  it('handles PIM Dense-Mode dynamic prune calculations when no receivers exist', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      mrouteEntries: [
        {
          group: '239.30.30.30',
          source: '10.0.0.10',
          incomingInterface: 'GigabitEthernet0/0',
          outgoingInterfaces: ['GigabitEthernet0/1'],
        },
      ],
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false, pimMode: 'dense-mode' },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false, pimMode: 'dense-mode' }, // Dense port without receivers
      },
    } as unknown as SwitchState;

    const now = 400000;
    const { state } = tickMulticast(routerState, 'r-1', now);
    expect(state.pimPrunedInterfaces).toBeDefined();
    expect(state.pimPrunedInterfaces?.['239.30.30.30']).toContain('GigabitEthernet0/1');
  });

  it('expires stale PIM neighbors after hold time expires', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      pimNeighbors: {
        '10.0.0.2': {
          ip: '10.0.0.2',
          interface: 'GigabitEthernet0/0',
          mode: 'sparse-mode' as const,
          uptime: 1000,
          expires: 5000,
          drPriority: 1,
        },
      },
    } as unknown as SwitchState;

    const nowAfterExpiry = 6000;
    const { state } = tickMulticast(routerState, 'r-1', nowAfterExpiry);
    expect(state.pimNeighbors?.['10.0.0.2']).toBeUndefined();
  });

  it('keeps active PIM neighbors before hold time expires', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      pimNeighbors: {
        '10.0.0.2': {
          ip: '10.0.0.2',
          interface: 'GigabitEthernet0/0',
          mode: 'sparse-mode' as const,
          uptime: 1000,
          expires: 10000,
          drPriority: 1,
        },
      },
    } as unknown as SwitchState;

    const nowBeforeExpiry = 5000;
    const { state } = tickMulticast(routerState, 'r-1', nowBeforeExpiry);
    expect(state.pimNeighbors?.['10.0.0.2']).toBeDefined();
  });

  it('handles source-tree (S, G) specific route preference over shared (*, G) tree', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      pimRpAddress: '10.0.0.100',
      mrouteEntries: [
        {
          group: '239.1.1.1',
          source: '*',
          rpAddress: '10.0.0.100',
          incomingInterface: 'GigabitEthernet0/0',
          outgoingInterfaces: ['GigabitEthernet0/1'],
        },
        {
          group: '239.1.1.1',
          source: '10.0.0.55',
          incomingInterface: 'GigabitEthernet0/0',
          outgoingInterfaces: ['GigabitEthernet0/2'], // Specific source tree OIL
        },
      ],
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false, pimMode: 'sparse-mode' },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: false, pimMode: 'sparse-mode' },
        'GigabitEthernet0/2': { id: 'GigabitEthernet0/2', status: 'connected', shutdown: false, pimMode: 'sparse-mode' },
      },
    } as unknown as SwitchState;

    const frameSpecific = createMockFrame({
      id: 'f-sg-specific',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:01:01:01',
      srcIp: '10.0.0.55',
      dstIp: '239.1.1.1',
      ingressPortId: 'GigabitEthernet0/0',
      ttl: 64,
    });

    const res = runHopPipeline(0, frameSpecific, routerDevice, routerState, [routerDevice], connections);
    expect(res.egressPorts).toContain('GigabitEthernet0/2');
  });

  it('drops multicast frame on L3 router if all downstream ports are shutdown', () => {
    const routerState = {
      multicastRoutingEnabled: true,
      mrouteEntries: [
        {
          group: '239.8.8.8',
          source: '10.0.0.1',
          incomingInterface: 'GigabitEthernet0/0',
          outgoingInterfaces: ['GigabitEthernet0/1'],
        },
      ],
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', status: 'connected', shutdown: false },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', status: 'connected', shutdown: true }, // Shutdown
      },
    } as unknown as SwitchState;

    const frame = createMockFrame({
      id: 'f-shutdown-oil',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:08:08:08',
      srcIp: '10.0.0.1',
      dstIp: '239.8.8.8',
      ingressPortId: 'GigabitEthernet0/0',
      ttl: 64,
    });

    const res = runHopPipeline(0, frame, routerDevice, routerState, [routerDevice], connections);
    expect(res.egressPorts).toEqual([]);
  });

  it('supports multiple multicast groups concurrently on the same interface', () => {
    const switchState = {
      multicastRoutingEnabled: false,
      igmpSnoopingEnabled: true,
      ports: {
        'Fa0/1': { id: 'Fa0/1', status: 'connected', shutdown: false },
        'Fa0/2': { id: 'Fa0/2', status: 'connected', shutdown: false, igmpGroups: ['239.1.1.1', '239.2.2.2'] },
      },
    } as unknown as SwitchState;

    const frame1 = createMockFrame({
      id: 'f-m1',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:01:01:01',
      srcIp: '192.168.1.10',
      dstIp: '239.1.1.1',
      ingressPortId: 'Fa0/1',
      vlanId: 1,
      ttl: 64,
    });
    const frame2 = createMockFrame({
      id: 'f-m2',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:02:02:02',
      srcIp: '192.168.1.10',
      dstIp: '239.2.2.2',
      ingressPortId: 'Fa0/1',
      vlanId: 1,
      ttl: 64,
    });

    const res1 = runHopPipeline(0, frame1, switchDevice, switchState, [switchDevice], connections);
    const res2 = runHopPipeline(0, frame2, switchDevice, switchState, [switchDevice], connections);

    expect(res1.egressPorts).toContain('Fa0/2');
    expect(res2.egressPorts).toContain('Fa0/2');
  });
});
