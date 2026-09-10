import { describe, it, expect } from 'vitest';
import { setGreTunnelSource, setGreTunnelDestination } from '@/lib/network/greTunnel';
import type { SwitchState } from '@/lib/network/types';

describe('greTunnel (Cisco GRE Tunneling)', () => {
  it('should configure GRE tunnel source and destination endpoints', () => {
    const mockState = {} as SwitchState;

    setGreTunnelSource(mockState, 'Tunnel0', '10.0.0.1');
    setGreTunnelDestination(mockState, 'Tunnel0', '10.0.0.2');

    expect(mockState.greTunnels?.['tunnel0']?.source).toBe('10.0.0.1');
    expect(mockState.greTunnels?.['tunnel0']?.destination).toBe('10.0.0.2');
  });
});
