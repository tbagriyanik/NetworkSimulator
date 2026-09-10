import { describe, it, expect } from 'vitest';
import { setVrfRouteDistinguisher, assignInterfaceToVrf } from '@/lib/network/vrfLite';
import type { SwitchState } from '@/lib/network/types';

describe('vrfLite (Cisco VRF-Lite Virtual Routing and Forwarding)', () => {
  it('should create VRF instance with RD and assign interfaces', () => {
    const mockState = {} as SwitchState;

    setVrfRouteDistinguisher(mockState, 'CUSTOMER_A', '65000:1');
    assignInterfaceToVrf(mockState, 'CUSTOMER_A', 'GigabitEthernet0/1');

    expect(mockState.vrfInstances?.['customer_a']?.rd).toBe('65000:1');
    expect(mockState.vrfInstances?.['customer_a']?.interfaces).toContain('gigabitethernet0/1');
  });
});
