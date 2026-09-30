import { describe, expect, it } from 'vitest';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import { tickMulticast, checkRpf, getPrunedPorts } from '@/lib/network/forwarding/multicastEngine';
import { forwardPacketFrame } from '@/lib/network/forwarding/commonForwardingEngine';

describe('PIM & IGMP End-to-End Multicast Forwarding Engine', () => {
  const routerDevice: CanvasDevice = {
    id: 'm-router-1',
    name: 'Multicast-Router',
    type: 'router',
    ip: '10.0.0.1',
    status: 'online',
    ports: [],
    x: 0,
    y: 0,
  };

  const routerState: SwitchState = {
    hostname: 'Multicast-Router',
    multicastRoutingEnabled: true,
    igmpSnoopingEnabled: true,
    ports: {
      'Gi0/0': {
        id: 'Gi0/0',
        name: 'Gi0/0',
        ipAddress: '10.0.0.1',
        subnetMask: '255.255.255.0',
        pimMode: 'sparse-mode',
        shutdown: false,
        status: 'connected',
      },
      'Gi0/1': {
        id: 'Gi0/1',
        name: 'Gi0/1',
        ipAddress: '10.0.1.1',
        subnetMask: '255.255.255.0',
        pimMode: 'sparse-mode',
        igmpGroups: ['239.1.1.100'],
        shutdown: false,
        status: 'connected',
      },
    },
    mrouteEntries: [
      {
        source: '*',
        group: '239.1.1.100',
        incomingInterface: 'Gi0/0',
        outgoingInterfaces: ['Gi0/1'],
        flags: 'S',
      },
    ],
  } as unknown as SwitchState;

  it('generates PIM Hello & IGMP Query frames during multicast tick execution', () => {
    const tickResult = tickMulticast(routerState, 'm-router-1', 60_000);
    expect(tickResult.frames.length).toBeGreaterThan(0);
    expect(tickResult.frames.some(f => f.protocol === 'PIM')).toBe(true);
    expect(tickResult.frames.some(f => f.protocol === 'IGMP')).toBe(true);
  });

  it('enforces Reverse Path Forwarding (RPF) check to drop illegal ingress multicast packets', () => {
    // Correct RPF: 10.0.0.50 arrives on Gi0/0 (10.0.0.0/24 subnet)
    const validRpf = checkRpf(routerState, '10.0.0.50', 'Gi0/0');
    expect(validRpf.passed).toBe(true);

    // Invalid RPF: 10.0.0.50 arrives on Gi0/1 (Gi0/1 is 10.0.1.0/24, expected Gi0/0)
    const invalidRpf = checkRpf(routerState, '10.0.0.50', 'Gi0/1');
    expect(invalidRpf.passed).toBe(false);
    expect(invalidRpf.expectedInterface).toBe('Gi0/0');
  });

  it('drops multicast packets failing RPF check during forwardPacketFrame execution', () => {
    const rpfFailureFrame: NetworkPacketFrame = {
      id: 'mcast-rpf-fail',
      protocol: 'IPV4',
      timestamp: Date.now(),
      ingressPortId: 'Gi0/1', // Arrives on wrong interface
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:01:01:64',
      etherType: '0x0800',
      srcIp: '10.0.0.50', // Belongs to Gi0/0 subnet
      dstIp: '239.1.1.100',
      length: 128,
      info: 'Multicast Stream',
    };

    const res = forwardPacketFrame(rpfFailureFrame, routerDevice, routerState);
    expect(res.accepted).toBe(false);
    expect(res.actionReason).toContain('RPF check failure');
  });

  it('replicates multicast packets to Outgoing Interface List (OIL) when RPF passes', () => {
    const validMulticastFrame: NetworkPacketFrame = {
      id: 'mcast-valid',
      protocol: 'IPV4',
      timestamp: Date.now(),
      ingressPortId: 'Gi0/0', // Correct RPF interface
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:01:01:64',
      etherType: '0x0800',
      srcIp: '10.0.0.50',
      dstIp: '239.1.1.100',
      length: 128,
      info: 'Multicast Stream',
    };

    const res = forwardPacketFrame(validMulticastFrame, routerDevice, routerState);
    expect(res.accepted).toBe(true);
    expect(res.egressPorts).toContain('Gi0/1');
  });

  it('filters dense-mode pruned interfaces from multicast replication', () => {
    const stateWithPrune: SwitchState = {
      ...routerState,
      pimPrunedInterfaces: {
        '239.1.1.100': ['Gi0/1'],
      },
    };

    const prunedPorts = getPrunedPorts(stateWithPrune, '239.1.1.100');
    expect(prunedPorts).toContain('Gi0/1');

    const validFrame: NetworkPacketFrame = {
      id: 'mcast-pruned-test',
      protocol: 'IPV4',
      timestamp: Date.now(),
      ingressPortId: 'Gi0/0',
      srcMac: '00:11:22:33:44:55',
      dstMac: '01:00:5e:01:01:64',
      etherType: '0x0800',
      srcIp: '10.0.0.50',
      dstIp: '239.1.1.100',
      length: 128,
      info: 'Multicast Stream to Pruned Group',
    };

    const res = forwardPacketFrame(validFrame, routerDevice, stateWithPrune);
    expect(res.egressPorts).not.toContain('Gi0/1');
  });
});
