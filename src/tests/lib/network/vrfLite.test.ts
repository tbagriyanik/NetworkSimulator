import { describe, it, expect } from 'vitest';
import { setVrfRouteDistinguisher, assignInterfaceToVrf, filterRoutesByVrf } from '@/lib/network/vrfLite';
import type { SwitchState } from '@/lib/network/types';

describe('vrfLite (Cisco VRF-Lite Virtual Routing and Forwarding)', () => {
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
});

