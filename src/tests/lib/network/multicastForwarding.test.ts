import { describe, it, expect } from 'vitest';
import { runHopPipeline } from '@/lib/network/forwarding/packetPipeline';
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
});
