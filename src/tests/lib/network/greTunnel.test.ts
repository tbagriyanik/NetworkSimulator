import { describe, it, expect } from 'vitest';
import { setGreTunnelSource, setGreTunnelDestination } from '@/lib/network/greTunnel';
import { cmdShowIpInterfaceBrief, cmdShowInterface } from '@/lib/network/core/showInterfaceDisplay';
import type { SwitchState } from '@/lib/network/types';
import type { CommandContext } from '@/lib/network/core/commandTypes';

describe('greTunnel (GRE Tunneling)', () => {
  it('should configure GRE tunnel source and destination endpoints', () => {
    const mockState = {} as SwitchState;

    setGreTunnelSource(mockState, 'Tunnel0', '10.0.0.1');
    setGreTunnelDestination(mockState, 'Tunnel0', '10.0.0.2');

    expect(mockState.greTunnels?.['tunnel0']?.source).toBe('10.0.0.1');
    expect(mockState.greTunnels?.['tunnel0']?.destination).toBe('10.0.0.2');
  });

  it('displays configured GRE tunnels in show ip interface brief and show interface tunnel0', () => {
    const mockState = {
      ports: {},
      greTunnels: {
        tunnel0: { id: 'tunnel0', source: '203.0.113.1', destination: '203.0.113.2', tunnelIp: '10.0.0.1' },
      },
    } as unknown as SwitchState;

    const ctx = {} as CommandContext;
    const briefRes = cmdShowIpInterfaceBrief(mockState, 'show ip interface brief', ctx);
    expect(briefRes.output).toContain('Tunnel0');
    expect(briefRes.output).toContain('10.0.0.1');
    expect(briefRes.output).toContain('manual');

    const ifaceRes = cmdShowInterface(mockState, 'show interface tunnel 0', ctx);
    expect(ifaceRes.output).toContain('Tunnel0 is up');
    expect(ifaceRes.output).toContain('Hardware is Tunnel');
    expect(ifaceRes.output).toContain('Tunnel source 203.0.113.1');
    expect(ifaceRes.output).toContain('destination 203.0.113.2');
    expect(ifaceRes.output).toContain('GRE/IP');
  });
});
