import { describe, it, expect } from 'vitest';
import {
  getOrCreateVxlanConfig,
  getOrCreateNveInterface,
  mapVlanToVni,
  encapsulateVxlanPacket,
  lookupEvpnMacTable,
  addEvpnMacRoute,
  establishEvpnNeighbor,
  getEvpnMacTable,
  getEvpnNeighborTable,
  getNveInterfaceTable,
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
        local: true,
        uptime: 100,
      },
      {
        vni: 10020,
        macAddress: '00:aa:bb:cc:dd:ee',
        ipAddress: '10.1.2.200',
        nextHopVtep: '192.168.0.3',
        routeType: 'Type-2',
        local: true,
        uptime: 100,
      },
    ];

    const match = lookupEvpnMacTable(evpnRoutes, 10010, '00:11:22:33:44:55');
    expect(match).toBeDefined();
    expect(match?.nextHopVtep).toBe('192.168.0.2');
    expect(match?.ipAddress).toBe('10.1.1.100');

    const noMatch = lookupEvpnMacTable(evpnRoutes, 10010, '00:00:00:00:00:00');
    expect(noMatch).toBeUndefined();
  });

  it('handles case-insensitive MAC lookup and mismatched VNIs in lookupEvpnMacTable', () => {
    const evpnRoutes: EvpnMacRoute[] = [
      {
        vni: 20050,
        macAddress: 'aa:bb:cc:11:22:33',
        ipAddress: '192.168.50.10',
        nextHopVtep: '10.255.0.5',
        routeType: 'Type-2',
        local: true,
        uptime: 60,
      },
    ];

    // Uppercase MAC matching
    const upperMatch = lookupEvpnMacTable(evpnRoutes, 20050, 'AA:BB:CC:11:22:33');
    expect(upperMatch).toBeDefined();
    expect(upperMatch?.nextHopVtep).toBe('10.255.0.5');

    // Mismatched VNI with same MAC should return undefined
    const wrongVniMatch = lookupEvpnMacTable(evpnRoutes, 99999, 'AA:BB:CC:11:22:33');
    expect(wrongVniMatch).toBeUndefined();
  });

  it('adds and updates EVPN MAC routes (Type-2 vs Type-3) without duplication', () => {
    const mockState = {} as SwitchState;

    // Add Type-2 (with IP)
    const r1 = addEvpnMacRoute(mockState, 10010, '00:aa:00:bb:00:cc', '10.0.0.5', '192.168.1.1');
    expect(r1.routeType).toBe('Type-2');
    expect(mockState.vxlanConfig?.evpnMacRoutes).toHaveLength(1);

    // Add Type-3 (without IP)
    const r2 = addEvpnMacRoute(mockState, 10020, '00:dd:00:ee:00:ff', undefined, '192.168.1.2');
    expect(r2.routeType).toBe('Type-3');
    expect(mockState.vxlanConfig?.evpnMacRoutes).toHaveLength(2);

    // Update existing MAC route for same VNI/MAC
    addEvpnMacRoute(mockState, 10010, '00:aa:00:bb:00:cc', '10.0.0.99', '192.168.1.100');
    expect(mockState.vxlanConfig?.evpnMacRoutes).toHaveLength(2);
    const updated = mockState.vxlanConfig?.evpnMacRoutes.find((r) => r.vni === 10010);
    expect(updated?.ipAddress).toBe('10.0.0.99');
    expect(updated?.nextHopVtep).toBe('192.168.1.100');
  });

  it('establishes and updates EVPN BGP neighbors', () => {
    const mockState = {} as SwitchState;

    const n1 = establishEvpnNeighbor(mockState, '10.0.0.2', 65000);
    expect(n1.state).toBe('Established');
    expect(n1.vtepIp).toBe('10.0.0.2');
    expect(mockState.vxlanConfig?.evpnNeighbors).toHaveLength(1);

    // Update existing neighbor
    establishEvpnNeighbor(mockState, '10.0.0.2', 65001);
    expect(mockState.vxlanConfig?.evpnNeighbors).toHaveLength(1);
    expect(mockState.vxlanConfig?.evpnNeighbors[0].bgpAs).toBe(65001);
  });

  it('renders EVPN MAC table and neighbor table with fallback when empty or disabled', () => {
    const emptyState = {} as SwitchState;
    expect(getEvpnMacTable(emptyState)).toBe('% No EVPN MAC routes');
    expect(getEvpnNeighborTable(emptyState)).toBe('% No EVPN neighbors');
    expect(getNveInterfaceTable(emptyState)).toBe('% No NVE interfaces configured');

    const activeState = {} as SwitchState;
    const config = getOrCreateVxlanConfig(activeState);
    config.enabled = true;

    addEvpnMacRoute(activeState, 10010, '00:11:22:33:44:55', '10.1.1.1', '192.168.0.2');
    establishEvpnNeighbor(activeState, '192.168.0.2', 65000);
    mapVlanToVni(activeState, 'nve1', 10, 10010, true);

    const macTable = getEvpnMacTable(activeState);
    expect(macTable).toContain('10010');
    expect(macTable).toContain('00:11:22:33:44:55'.toUpperCase());
    expect(macTable).toContain('10.1.1.1');

    const neighborTable = getEvpnNeighborTable(activeState);
    expect(neighborTable).toContain('192.168.0.2');
    expect(neighborTable).toContain('65000');
    expect(neighborTable).toContain('Established');

    const nveTable = getNveInterfaceTable(activeState);
    expect(nveTable).toContain('nve1');
    expect(nveTable).toContain('10010');
  });

  it('supports multiple VNI mappings on the same NVE interface', () => {
    const mockState = {} as SwitchState;
    mapVlanToVni(mockState, 'nve1', 10, 10010, true);
    mapVlanToVni(mockState, 'nve1', 20, 10020, false);

    const nve = mockState.nveInterfaces?.['nve1'];
    expect(nve?.vniMappings[10010]).toEqual({ vlanId: 10, ingressReplication: true });
    expect(nve?.vniMappings[10020]).toEqual({ vlanId: 20, ingressReplication: false });
    expect(mockState.vxlanConfig?.evpnVniMapping[10010].vlanId).toBe(10);
    expect(mockState.vxlanConfig?.evpnVniMapping[10020].vlanId).toBe(20);
  });
});
