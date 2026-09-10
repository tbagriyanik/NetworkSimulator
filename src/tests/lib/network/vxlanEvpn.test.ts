import { describe, it, expect } from 'vitest';
import {
  getOrCreateNveInterface,
  mapVlanToVni,
  encapsulateVxlanPacket,
  lookupEvpnMacTable,
  EvpnMacRoute,
} from '@/lib/network/vxlanEvpn';
import type { SwitchState } from '@/lib/network/types';

describe('BGP EVPN and VXLAN Overlay Simulation', () => {
  it('should configure NVE interface and map VLAN to VNI', () => {
    const mockState = {} as SwitchState;
    const nve = getOrCreateNveInterface(mockState, 'nve1');
    expect(nve.name).toBe('nve1');
    expect(nve.status).toBe('up');

    mapVlanToVni(mockState, 'nve1', 10, 10010, true);
    expect(mockState.nveInterfaces?.['nve1']?.vniMappings[10010]).toEqual({
      vlanId: 10,
      ingressReplication: true,
    });
  });

  it('should encapsulate inner ethernet frames into UDP port 4789 VXLAN packet', () => {
    const packet = encapsulateVxlanPacket(
      10010,
      '192.168.0.1',
      '192.168.0.2',
      'ETH_FRAME_DATA'
    );

    expect(packet.outerHeader.udpPort).toBe(4789);
    expect(packet.outerHeader.vni).toBe(10010);
    expect(packet.outerHeader.srcIp).toBe('192.168.0.1');
    expect(packet.outerHeader.dstIp).toBe('192.168.0.2');
  });

  it('should look up EVPN Type-2 MAC/IP routes for destination VTEP forwarding', () => {
    const evpnRoutes: EvpnMacRoute[] = [
      {
        vni: 10010,
        macAddress: '00:11:22:33:44:55',
        ipAddress: '10.1.1.100',
        nextHopVtep: '192.168.0.2',
        routeType: 'Type-2',
      },
      {
        vni: 10020,
        macAddress: '00:aa:bb:cc:dd:ee',
        ipAddress: '10.1.2.200',
        nextHopVtep: '192.168.0.3',
        routeType: 'Type-2',
      },
    ];

    const match = lookupEvpnMacTable(evpnRoutes, 10010, '00:11:22:33:44:55');
    expect(match).toBeDefined();
    expect(match?.nextHopVtep).toBe('192.168.0.2');
    expect(match?.ipAddress).toBe('10.1.1.100');

    const noMatch = lookupEvpnMacTable(evpnRoutes, 10010, '00:00:00:00:00:00');
    expect(noMatch).toBeUndefined();
  });
});
