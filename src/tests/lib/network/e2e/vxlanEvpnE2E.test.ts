import { describe, it, expect } from 'vitest';
import {
  getOrCreateVxlanConfig,
  getOrCreateNveInterface,
  mapVlanToVni,
  encapsulateVxlanPacket,
  addEvpnMacRoute,
  lookupEvpnMacTable,
  establishEvpnNeighbor,
  getEvpnMacTable,
  getEvpnNeighborTable,
  getNveInterfaceTable,
} from '@/lib/network/vxlanEvpn';
import type { SwitchState } from '@/lib/network/types';

describe('VXLAN / EVPN Overlay E2E Pipeline (CLI -> NVE/VNI -> BGP EVPN -> VXLAN Encapsulation -> Show)', () => {
  it('configures NVE, establishes BGP EVPN peering, advertises Type-2 MAC routes, and encapsulates UDP 4789 packets', () => {
    // 1. Leaf-1 Switch State
    const leaf1State = {
      hostname: 'Leaf-01',
      routerId: '10.255.0.1',
      ports: {
        'Loopback0': { id: 'Loopback0', ipAddress: '10.255.0.1', shutdown: false },
        'GigabitEthernet0/1': { id: 'GigabitEthernet0/1', ipAddress: '10.0.12.1', shutdown: false },
      },
    } as unknown as SwitchState;

    // 2. CLI -> State: Create NVE interface and map VLAN 10 to VNI 10010
    const nve = getOrCreateNveInterface(leaf1State, 'nve1');
    nve.sourceInterface = 'Loopback0';
    mapVlanToVni(leaf1State, 'nve1', 10, 10010, true);

    const config = getOrCreateVxlanConfig(leaf1State);
    config.enabled = true;
    config.bgpEvpnEnabled = true;

    expect(config.nveInterfaces['nve1']?.vniMappings[10010]?.vlanId).toBe(10);
    expect(config.evpnVniMapping[10010]?.vlanId).toBe(10);

    // 3. Control Plane: Establish BGP EVPN peering with Spine / Route Reflector (10.255.0.100)
    establishEvpnNeighbor(leaf1State, '10.255.0.100', 65000);
    expect(config.evpnNeighbors[0].vtepIp).toBe('10.255.0.100');
    expect(config.evpnNeighbors[0].state).toBe('Established');

    // 4. Host attaches to Leaf-1 -> Learned local MAC -> Add EVPN Type-2 Route
    addEvpnMacRoute(leaf1State, 10010, '00:11:22:33:44:55', '192.168.10.10', '10.255.0.1');

    // Remote Leaf-2 announces remote host (192.168.10.20 / 00:aa:bb:cc:dd:ee at VTEP 10.255.0.2)
    addEvpnMacRoute(leaf1State, 10010, '00:aa:bb:cc:dd:ee', '192.168.10.20', '10.255.0.2');

    // 5. Data Plane Lookup: Forwarding lookup in EVPN MAC table
    const remoteHostRoute = lookupEvpnMacTable(config.evpnMacRoutes, 10010, '00:AA:BB:CC:DD:EE');
    expect(remoteHostRoute).toBeDefined();
    expect(remoteHostRoute?.nextHopVtep).toBe('10.255.0.2');
    expect(remoteHostRoute?.routeType).toBe('Type-2');

    // 6. Data Plane Encapsulation: Encapsulate inner Ethernet frame into VXLAN UDP 4789 packet
    const innerFrame = 'ETHERNET_SRC_001122334455_DST_00AABBCCDDEE_PAYLOAD';
    const vxlanPacket = encapsulateVxlanPacket(10010, '10.255.0.1', remoteHostRoute!.nextHopVtep, innerFrame);

    expect(vxlanPacket.outerHeader.udpPort).toBe(4789);
    expect(vxlanPacket.outerHeader.vni).toBe(10010);
    expect(vxlanPacket.outerHeader.srcIp).toBe('10.255.0.1');
    expect(vxlanPacket.outerHeader.dstIp).toBe('10.255.0.2');
    expect(vxlanPacket.payload).toBe(innerFrame);

    // 7. Show Command Outputs Verification
    const showMac = getEvpnMacTable(leaf1State);
    expect(showMac).toContain('10010');
    expect(showMac).toContain('00:AA:BB:CC:DD:EE');
    expect(showMac).toContain('192.168.10.20');
    expect(showMac).toContain('10.255.0.2');

    const showNeighbors = getEvpnNeighborTable(leaf1State);
    expect(showNeighbors).toContain('10.255.0.100');
    expect(showNeighbors).toContain('65000');
    expect(showNeighbors).toContain('Established');

    const showNve = getNveInterfaceTable(leaf1State);
    expect(showNve).toContain('nve1');
    expect(showNve).toContain('Loopback0');
    expect(showNve).toContain('10010');
  });

  it('supports Type-3 Inclusive Multicast Ethernet Tag routes for BUM traffic', () => {
    const leafState = {} as SwitchState;
    const r3 = addEvpnMacRoute(leafState, 10020, '00:00:00:00:00:00', undefined, '10.255.0.3');
    expect(r3.routeType).toBe('Type-3');
    expect(r3.nextHopVtep).toBe('10.255.0.3');
  });
});
