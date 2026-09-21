import { describe, it, expect } from 'vitest';
import { getOrCreateGreTunnel, setGreTunnelSource, setGreTunnelDestination } from '@/lib/network/greTunnel';
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

  it('handles case-insensitive tunnel IDs and initializes state if undefined', () => {
    const mockState = {} as SwitchState;
    const tun = getOrCreateGreTunnel(mockState, 'TuNnEl5');
    expect(tun.id).toBe('tunnel5');
    expect(mockState.greTunnels?.['tunnel5']).toBeDefined();

    // Re-retrieving should return the same instance
    const tunAgain = getOrCreateGreTunnel(mockState, 'TUNNEL5');
    expect(tunAgain).toBe(tun);
  });

  it('updates tunnel properties incrementally without overwriting existing fields', () => {
    const mockState = {} as SwitchState;
    const tun = getOrCreateGreTunnel(mockState, 'tunnel1');
    tun.tunnelIp = '172.16.0.1';
    tun.subnetMask = '255.255.255.252';

    setGreTunnelSource(mockState, 'tunnel1', '198.51.100.1');
    expect(mockState.greTunnels?.['tunnel1']?.tunnelIp).toBe('172.16.0.1');
    expect(mockState.greTunnels?.['tunnel1']?.source).toBe('198.51.100.1');
    expect(mockState.greTunnels?.['tunnel1']?.destination).toBeUndefined();

    setGreTunnelDestination(mockState, 'tunnel1', '198.51.100.2');
    expect(mockState.greTunnels?.['tunnel1']?.source).toBe('198.51.100.1');
    expect(mockState.greTunnels?.['tunnel1']?.destination).toBe('198.51.100.2');
  });

  it('supports multiple isolated GRE tunnels simultaneously', () => {
    const mockState = {
      ports: {},
      greTunnels: {
        tunnel0: { id: 'tunnel0', source: '1.1.1.1', destination: '1.1.1.2', tunnelIp: '10.0.0.1' },
        tunnel1: { id: 'tunnel1', source: '2.2.2.1', destination: '2.2.2.2', tunnelIp: '10.1.1.1' },
      },
    } as unknown as SwitchState;

    const ctx = {} as CommandContext;
    const briefRes = cmdShowIpInterfaceBrief(mockState, 'show ip interface brief', ctx);
    expect(briefRes.output).toContain('Tunnel0');
    expect(briefRes.output).toContain('10.0.0.1');
    expect(briefRes.output).toContain('Tunnel1');
    expect(briefRes.output).toContain('10.1.1.1');

    const iface0 = cmdShowInterface(mockState, 'show interface tunnel 0', ctx);
    expect(iface0.output).toContain('Tunnel source 1.1.1.1');
    expect(iface0.output).not.toContain('Tunnel source 2.2.2.1');

    const iface1 = cmdShowInterface(mockState, 'show interface tunnel 1', ctx);
    expect(iface1.output).toContain('Tunnel source 2.2.2.1');
    expect(iface1.output).not.toContain('Tunnel source 1.1.1.1');
  });

  it('handles partial tunnel configuration gracefully in show interface', () => {
    const mockState = {
      ports: {},
      greTunnels: {
        tunnel100: { id: 'tunnel100', source: '192.0.2.1' }, // Missing destination and tunnelIp
      },
    } as unknown as SwitchState;

    const ctx = {} as CommandContext;
    const briefRes = cmdShowIpInterfaceBrief(mockState, 'show ip interface brief', ctx);
    expect(briefRes.output).toContain('Tunnel100');
    expect(briefRes.output).toContain('unassigned');

    const ifaceRes = cmdShowInterface(mockState, 'show interface tunnel 100', ctx);
    expect(ifaceRes.output).toContain('Tunnel source 192.0.2.1');
    expect(ifaceRes.output).toContain('destination not set');
  });

  it('handles show interface for non-existent tunnel interface gracefully', () => {
    const mockState = {
      ports: {},
      greTunnels: {},
    } as unknown as SwitchState;

    const ctx = {} as CommandContext;
    const ifaceRes = cmdShowInterface(mockState, 'show interface tunnel 99', ctx);
    expect(ifaceRes.success).toBe(false);
    expect(ifaceRes.error).toContain('not found');
  });
});
