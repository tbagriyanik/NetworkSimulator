import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommand } from './executor';
import { SwitchState } from './types';
import { initialSwitchState } from './initialState';

describe('IPv6 Routing CLI', () => {
  let state: SwitchState;

  beforeEach(() => {
    state = {
      ...initialSwitchState,
      hostname: 'Router',
      switchLayer: 'L3',
      ports: {
        'gi0/1': {
          id: 'gi0/1',
          name: 'GigabitEthernet0/1',
          status: 'connected',
          vlan: 1,
          mode: 'routed',
          type: 'gigabitethernet',
          duplex: 'full',
          speed: '1000',
          shutdown: false,
        }
      }
    };
  });

  it('should enable ipv6 unicast-routing', () => {
    state.currentMode = 'config';
    const result = executeCommand(state, 'ipv6 unicast-routing', 'en');
    expect(result.success).toBe(true);
    expect(result.newState?.ipv6Enabled).toBe(true);
  });

  it('should add an ipv6 static route', () => {
    state.currentMode = 'config';
    const result = executeCommand(state, 'ipv6 route 2001:db8:1::/64 2001:db8:2::1', 'en');
    expect(result.success).toBe(true);
    expect(result.newState?.ipv6StaticRoutes).toHaveLength(1);
    expect(result.newState?.ipv6StaticRoutes?.[0].destination).toBe('2001:db8:1::');
    expect(result.newState?.ipv6StaticRoutes?.[0].prefixLength).toBe(64);
  });

  it('should enable RIPng on an interface', () => {
    state.currentMode = 'interface';
    state.currentInterface = 'gi0/1';
    state.ports['gi0/1'].ipv6Address = '2001:db8:1::1';
    state.ports['gi0/1'].ipv6Prefix = 64;

    const result = executeCommand(state, 'ipv6 rip test enable', 'en');
    expect(result.success).toBe(true);
    expect(state.ports['gi0/1'].ipv6Rip?.enabled).toBeUndefined(); // verify newState
    expect(result.newState?.ports?.['gi0/1'].ipv6Rip?.enabled).toBe(true);
    expect(result.newState?.ports?.['gi0/1'].ipv6Rip?.processName).toBe('test');
    expect(result.newState?.ipv6DynamicRoutes).toHaveLength(1);
  });

  it('should enable OSPFv3 on an interface', () => {
    state.currentMode = 'interface';
    state.currentInterface = 'gi0/1';
    state.ports['gi0/1'].ipv6Address = '2001:db8:1::1';
    state.ports['gi0/1'].ipv6Prefix = 64;

    const result = executeCommand(state, 'ipv6 ospf 1 area 0', 'en');
    expect(result.success).toBe(true);
    expect(result.newState?.ports?.['gi0/1'].ipv6Ospf?.enabled).toBe(true);
    expect(result.newState?.ports?.['gi0/1'].ipv6Ospf?.processId).toBe('1');
    expect(result.newState?.ports?.['gi0/1'].ipv6Ospf?.area).toBe('0');
  });

  it('should show ipv6 route', () => {
    state.currentMode = 'privileged';
    state.ipv6Enabled = true;
    state.ipv6StaticRoutes = [{
        destination: '2001:db8:1::',
        prefixLength: 64,
        nextHop: '2001:db8:2::1',
        type: 'static'
    }];

    const result = executeCommand(state, 'show ipv6 route', 'en');
    expect(result.success).toBe(true);
    expect(result.output).toContain('2001:db8:1::/64');
    expect(result.output).toContain('via 2001:db8:2::1');
  });
});
