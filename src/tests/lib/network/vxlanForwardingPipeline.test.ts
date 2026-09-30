import { describe, expect, it } from 'vitest';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import {
  mapVlanToVni,
  addEvpnMacRoute,
  establishEvpnNeighbor,
  processVxlanEncapsulation,
  processVxlanDecapsulation,
} from '@/lib/network/vxlanEvpn';
import { forwardPacketFrame } from '@/lib/network/forwarding/commonForwardingEngine';

describe('VXLAN & EVPN Deep Forwarding Pipeline Integration', () => {
  const vtepDevice: CanvasDevice = {
    id: 'vtep-1',
    name: 'Leaf-VTEP-1',
    type: 'switchL3',
    ip: '192.168.255.1',
    status: 'online',
    ports: [],
    x: 0,
    y: 0,
  };

  const vtepState: SwitchState = {
    hostname: 'Leaf-VTEP-1',
    switchLayer: 'L3',
    ipRouting: true,
    ports: {
      'Gi0/1': { id: 'Gi0/1', name: 'Gi0/1', vlan: 10, shutdown: false, status: 'connected' },
      'Gi0/24': { id: 'Gi0/24', name: 'Gi0/24', ipAddress: '10.0.0.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' },
      'Loopback0': { id: 'Loopback0', name: 'Loopback0', ipAddress: '192.168.255.1', subnetMask: '255.255.255.255', shutdown: false, status: 'connected' },
    },
    vxlanConfig: {
      enabled: true,
      nveInterfaces: {
        nve1: { name: 'nve1', sourceInterface: 'Loopback0', vniMappings: {}, status: 'up' },
      },
      evpnMacRoutes: [],
      evpnNeighbors: [],
      bgpEvpnEnabled: true,
      evpnVniMapping: {},
    },
  } as unknown as SwitchState;

  // Map VLAN 10 to VNI 10010 and add EVPN neighbor VTEP-2 (192.168.255.2)
  mapVlanToVni(vtepState, 'nve1', 10, 10010);
  establishEvpnNeighbor(vtepState, '192.168.255.2', 65000);
  addEvpnMacRoute(vtepState, 10010, '00:aa:bb:cc:dd:ee', '10.10.10.20', '192.168.255.2');

  it('encapsulates incoming access frame into VXLAN packet with target VTEP', () => {
    const innerFrame: NetworkPacketFrame = {
      id: 'frame-1',
      protocol: 'IPV4',
      timestamp: Date.now(),
      srcMac: '00:11:22:33:44:55',
      dstMac: '00:aa:bb:cc:dd:ee',
      etherType: '0x0800',
      vlanId: 10,
      srcIp: '10.10.10.10',
      dstIp: '10.10.10.20',
      length: 100,
      info: 'Ping Request',
    };

    const encapRes = processVxlanEncapsulation(vtepState, innerFrame);
    expect(encapRes.encapsulated).toBe(true);
    expect(encapRes.targetVtep).toBe('192.168.255.2');
    expect(encapRes.vxlanFrame?.protocol).toBe('VXLAN');
    expect(encapRes.vxlanFrame?.vxlanPayload?.vni).toBe(10010);
    expect(encapRes.vxlanFrame?.dstIp).toBe('192.168.255.2');
  });

  it('decapsulates incoming VXLAN UDP 4789 frame and restores inner payload with mapped VLAN', () => {
    const vxlanPacket: NetworkPacketFrame = {
      id: 'vxlan-in-1',
      protocol: 'VXLAN',
      timestamp: Date.now(),
      srcMac: '00:55:44:33:22:11',
      dstMac: '00:11:22:33:44:55',
      etherType: '0x0800',
      srcIp: '192.168.255.2',
      dstIp: '192.168.255.1',
      dstPort: 4789,
      vxlanPayload: {
        vni: 10010,
        outerSrcIp: '192.168.255.2',
        outerDstIp: '192.168.255.1',
        innerFrame: {
          id: 'inner-1',
          protocol: 'IPV4',
          timestamp: Date.now(),
          srcMac: '00:aa:bb:cc:dd:ee',
          dstMac: '00:11:22:33:44:55',
          etherType: '0x0800',
          vlanId: 1,
          srcIp: '10.10.10.20',
          dstIp: '10.10.10.10',
          length: 100,
          info: 'Ping Reply',
        },
      },
      length: 150,
      info: 'VXLAN Transit Packet',
    };

    const decapRes = processVxlanDecapsulation(vtepState, vxlanPacket);
    expect(decapRes.decapsulated).toBe(true);
    expect(decapRes.innerFrame?.vlanId).toBe(10); // Restored mapped VLAN 10 from VNI 10010
    expect(decapRes.innerFrame?.srcIp).toBe('10.10.10.20');
  });

  it('executes VXLAN encapsulation directly inside forwardPacketFrame pipeline', () => {
    const accessFrame: NetworkPacketFrame = {
      id: 'access-1',
      protocol: 'IPV4',
      timestamp: Date.now(),
      ingressPortId: 'Gi0/1',
      srcMac: '00:11:22:33:44:55',
      dstMac: '00:aa:bb:cc:dd:ee',
      etherType: '0x0800',
      vlanId: 10,
      srcIp: '10.10.10.10',
      dstIp: '10.10.10.20',
      length: 100,
      info: 'Access Frame',
    };

    const res = forwardPacketFrame(accessFrame, vtepDevice, vtepState);
    expect(res.accepted).toBe(true);
    expect(res.actionReason).toContain('Encapsulated into VXLAN VNI 10010');
    expect(res.responseFrame?.protocol).toBe('VXLAN');
  });
});
