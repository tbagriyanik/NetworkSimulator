import { describe, it, expect } from 'vitest';
import {
  getOrCreateVrfInstance,
  setVrfRouteDistinguisher,
  assignInterfaceToVrf,
  filterRoutesByVrf,
} from '@/lib/network/vrfLite';
import type { SwitchState } from '@/lib/network/types';

describe('vrfLite (VRF-Lite Virtual Routing and Forwarding)', () => {
  it('should create VRF instance with RD and assign interfaces', () => {
    const mockState = {} as SwitchState;

    setVrfRouteDistinguisher(mockState, 'CUSTOMER_A', '65000:1');
    assignInterfaceToVrf(mockState, 'CUSTOMER_A', 'GigabitEthernet0/1');

    expect(mockState.vrfInstances?.['customer_a']?.rd).toBe('65000:1');
    expect(mockState.vrfInstances?.['customer_a']?.interfaces).toContain('gigabitethernet0/1');
  });

  it('should filter routing table based on VRF assignment', () => {
    const mockState = {} as SwitchState;
    assignInterfaceToVrf(mockState, 'VRF_RED', 'GigabitEthernet0/1');

    const routes = [
      { destination: '10.0.0.0', interface: 'GigabitEthernet0/1' },
      { destination: '192.168.1.0', interface: 'GigabitEthernet0/2' },
    ];

    const redRoutes = filterRoutesByVrf(mockState, 'VRF_RED', routes);
    expect(redRoutes).toHaveLength(1);
    expect(redRoutes[0].destination).toBe('10.0.0.0');

    const globalRoutes = filterRoutesByVrf(mockState, undefined, routes);
    expect(globalRoutes).toHaveLength(1);
    expect(globalRoutes[0].destination).toBe('192.168.1.0');
  });

  it('handles case-insensitivity in VRF names and prevents duplicate interface assignments', () => {
    const mockState = {} as SwitchState;

    const vrf1 = getOrCreateVrfInstance(mockState, 'Mgmt_Vrf');
    const vrf2 = getOrCreateVrfInstance(mockState, 'MGMT_VRF');
    expect(vrf1).toBe(vrf2);

    assignInterfaceToVrf(mockState, 'MGMT_VRF', 'GigabitEthernet0/1');
    assignInterfaceToVrf(mockState, 'mgmt_vrf', 'gigabitethernet0/1');
    assignInterfaceToVrf(mockState, 'MGMT_VRF', 'GIGABITETHERNET0/1');

    expect(mockState.vrfInstances?.['mgmt_vrf']?.interfaces).toEqual(['gigabitethernet0/1']);
  });

  it('returns empty array when filtering routes for non-existent VRF', () => {
    const mockState = {} as SwitchState;
    const routes = [{ destination: '10.0.0.0', interface: 'GigabitEthernet0/1' }];

    const filtered = filterRoutesByVrf(mockState, 'NON_EXISTENT_VRF', routes);
    expect(filtered).toEqual([]);
  });

  it('correctly isolates multiple distinct VRFs and global table', () => {
    const mockState = {} as SwitchState;
    assignInterfaceToVrf(mockState, 'VRF_ALPHA', 'GigabitEthernet0/1');
    assignInterfaceToVrf(mockState, 'VRF_BETA', 'GigabitEthernet0/2');

    const routes = [
      { destination: '10.1.0.0/16', interface: 'GigabitEthernet0/1' },
      { destination: '10.2.0.0/16', interface: 'GigabitEthernet0/2' },
      { destination: '172.16.0.0/24', interface: 'GigabitEthernet0/3' },
      { destination: '192.168.0.0/24', interface: 'Loopback0' },
    ];

    const alphaRoutes = filterRoutesByVrf(mockState, 'VRF_ALPHA', routes);
    expect(alphaRoutes.map((r) => r.destination)).toEqual(['10.1.0.0/16']);

    const betaRoutes = filterRoutesByVrf(mockState, 'VRF_BETA', routes);
    expect(betaRoutes.map((r) => r.destination)).toEqual(['10.2.0.0/16']);

    const globalRoutes = filterRoutesByVrf(mockState, undefined, routes);
    expect(globalRoutes.map((r) => r.destination)).toEqual(['172.16.0.0/24', '192.168.0.0/24']);
  });

  it('handles routes without interface property gracefully', () => {
    const mockState = {} as SwitchState;
    assignInterfaceToVrf(mockState, 'VRF_TEST', 'GigabitEthernet0/1');

    const routes = [
      { destination: '0.0.0.0/0', interface: undefined },
      { destination: '10.0.0.0/8', interface: 'GigabitEthernet0/1' },
    ];

    // VRF query should exclude routes with no interface
    const vrfRoutes = filterRoutesByVrf(mockState, 'VRF_TEST', routes);
    expect(vrfRoutes).toHaveLength(1);
    expect(vrfRoutes[0].destination).toBe('10.0.0.0/8');

    // Global query should retain routes with no interface
    const globalRoutes = filterRoutesByVrf(mockState, undefined, routes);
    expect(globalRoutes).toHaveLength(1);
    expect(globalRoutes[0].destination).toBe('0.0.0.0/0');
  });

  it('updates RD on existing VRF without losing assigned interfaces', () => {
    const mockState = {} as SwitchState;
    assignInterfaceToVrf(mockState, 'CORP_DATA', 'GigabitEthernet0/1');
    assignInterfaceToVrf(mockState, 'CORP_DATA', 'GigabitEthernet0/2');

    setVrfRouteDistinguisher(mockState, 'CORP_DATA', '65001:100');

    expect(mockState.vrfInstances?.['corp_data']?.rd).toBe('65001:100');
    expect(mockState.vrfInstances?.['corp_data']?.interfaces).toHaveLength(2);
  });
});
