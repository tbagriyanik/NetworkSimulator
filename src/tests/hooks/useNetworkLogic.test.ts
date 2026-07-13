import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNetworkLogic } from '@/hooks/useNetworkLogic';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasConnection } from '@/components/network/networkTopology.types';
import type { EnvironmentSettings } from '@/lib/store/appStore';

describe('useNetworkLogic pure functions', () => {
  const dummyDeviceStates = new Map<string, SwitchState>();
  const dummyConnections: CanvasConnection[] = [];
  const dummyEnvironment: EnvironmentSettings = {
    background: 'none',
    temperature: 25,
    humidity: 50,
    light: 70,
  };

  it('isValidIpv4 should validate IPv4 correctly', () => {
    const { result } = renderHook(() => useNetworkLogic(dummyDeviceStates, dummyConnections, dummyEnvironment));
    
    expect(result.current.isValidIpv4('192.168.1.1')).toBe(true);
    expect(result.current.isValidIpv4('10.0.0.0')).toBe(true);
    expect(result.current.isValidIpv4('255.255.255.255')).toBe(true);
    
    expect(result.current.isValidIpv4('256.0.0.1')).toBe(false);
    expect(result.current.isValidIpv4('192.168.1')).toBe(false);
    expect(result.current.isValidIpv4('192.168.1.1.1')).toBe(false);
    expect(result.current.isValidIpv4('abc.def.ghi.jkl')).toBe(false);
    expect(result.current.isValidIpv4('')).toBe(false);
    expect(result.current.isValidIpv4(undefined)).toBe(false);
  });

  it('isSameSubnetByMask should verify subnets correctly', () => {
    const { result } = renderHook(() => useNetworkLogic(dummyDeviceStates, dummyConnections, dummyEnvironment));
    
    // Class C
    expect(result.current.isSameSubnetByMask('192.168.1.10', '192.168.1.20', '255.255.255.0')).toBe(true);
    expect(result.current.isSameSubnetByMask('192.168.1.10', '192.168.2.20', '255.255.255.0')).toBe(false);
    
    // Class B
    expect(result.current.isSameSubnetByMask('172.16.10.10', '172.16.20.20', '255.255.0.0')).toBe(true);
    expect(result.current.isSameSubnetByMask('172.16.10.10', '172.17.20.20', '255.255.0.0')).toBe(false);
    
    // Class A
    expect(result.current.isSameSubnetByMask('10.0.0.1', '10.255.255.254', '255.0.0.0')).toBe(true);
    
    // Invalid inputs
    expect(result.current.isSameSubnetByMask('192.168.1.10', '192.168.1.20', 'invalid.mask')).toBe(false);
    expect(result.current.isSameSubnetByMask(undefined, '192.168.1.20', '255.255.255.0')).toBe(false);
  });

  it('normalizeDeviceType should handle valid and invalid types', () => {
    const { result } = renderHook(() => useNetworkLogic(dummyDeviceStates, dummyConnections, dummyEnvironment));
    
    expect(result.current.normalizeDeviceType('switch')).toBe('switchL2');
    expect(result.current.normalizeDeviceType('switchL3')).toBe('switchL3');
    expect(result.current.normalizeDeviceType('pc')).toBe('pc');
    expect(result.current.normalizeDeviceType('router')).toBe('router');
    
    expect(() => result.current.normalizeDeviceType('unknown')).toThrowError('Unknown device type: unknown');
  });

  it('getPortAccessVlan should extract the correct VLAN', () => {
    const { result } = renderHook(() => useNetworkLogic(dummyDeviceStates, dummyConnections, dummyEnvironment));
    
    expect(result.current.getPortAccessVlan({ accessVlan: 10 })).toBe(10);
    expect(result.current.getPortAccessVlan({ accessVlan: '20' })).toBe(20);
    expect(result.current.getPortAccessVlan({ vlan: 30 })).toBe(30);
    expect(result.current.getPortAccessVlan({})).toBe(1); // Default to VLAN 1
  });
});
