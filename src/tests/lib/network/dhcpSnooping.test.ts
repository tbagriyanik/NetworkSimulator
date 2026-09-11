import { describe, it, expect } from 'vitest';
import { cmdIpDhcpSnoopingTrust, cmdNoIpDhcpSnoopingTrust } from '@/lib/network/core/interface/cmd.ipAddress';
import { cmdIpDhcpSnoopingVlan } from '@/lib/network/core/globalConfigExtraCommands';
import { cmdShowIpDhcpSnooping } from '@/lib/network/core/showRoutingDisplay';
import { SwitchState, Port, SwitchModel, SwitchLayer, Vlan, SecurityConfig } from '@/lib/network/types';
import type { CommandContext } from '@/lib/network/core/commandTypes';

describe('DHCP Snooping Trust Command Support', () => {
  const commandContext: CommandContext = {
    language: 'en',
    deviceStates: new Map(),
  };

  const createMockState = (): SwitchState => ({
    hostname: 'Switch-1',
    macAddress: '00:11:22:33:44:55',
    switchModel: 'NS-L2-24TT-L' as SwitchModel,
    switchLayer: 'L2' as SwitchLayer,
    currentMode: 'interface',
    currentInterface: 'gi0/1',
    commandHistory: [],
    ports: {
      'gi0/1': { id: 'gi0/1', name: 'Gi0/1', status: 'connected', type: 'gigabitethernet' } as Port,
    },
    vlans: {} as Record<string, Vlan>,
    security: {} as SecurityConfig,
    runningConfig: [],
    historyIndex: 0,
    bootTime: Date.now(),
    ipRouting: false,
    macAddressTable: [],
    arpCache: [],
    version: { nosVersion: '', modelName: '', serialNumber: '', uptime: '' },
  });

  it('configures ip dhcp snooping trust on interface', () => {
    const state = createMockState();
    const res = cmdIpDhcpSnoopingTrust(state, 'ip dhcp snooping trust', commandContext);
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['gi0/1']?.dhcpSnoopingTrust).toBe(true);
  });

  it('removes ip dhcp snooping trust with no ip dhcp snooping trust', () => {
    const state = createMockState();
    state.ports['gi0/1'].dhcpSnoopingTrust = true;
    const res = cmdNoIpDhcpSnoopingTrust(state, 'no ip dhcp snooping trust', commandContext);
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['gi0/1']?.dhcpSnoopingTrust).toBe(false);
  });

  it('enables snooping when a VLAN scope is configured', () => {
    const state = createMockState();
    state.currentMode = 'config';
    const res = cmdIpDhcpSnoopingVlan(state, 'ip dhcp snooping vlan 10', commandContext);
    expect(res.success).toBe(true);
    expect(res.newState?.dhcpSnoopingEnabled).toBe(true);
    expect(res.newState?.dhcpSnoopingVlans).toEqual(['10']);
  });

  it('displays dhcp snooping status and binding table via show ip dhcp snooping', () => {
    const state = createMockState();
    state.dhcpSnoopingEnabled = true;
    state.dhcpSnoopingVlans = ['10'];
    state.dhcpSnoopingBindings = [
      { macAddress: '0050.56a1.b2c3', ipAddress: '192.168.1.50', leaseTime: 86400, type: 'dynamic', vlan: 10, portId: 'Gi0/1' }
    ];

    const showRes = cmdShowIpDhcpSnooping(state, 'show ip dhcp snooping', commandContext);
    expect(showRes.success).toBe(true);
    expect(showRes.output).toContain('DHCP snooping is enabled');
    expect(showRes.output).toContain('10');

    const bindingRes = cmdShowIpDhcpSnooping(state, 'show ip dhcp snooping binding', commandContext);
    expect(bindingRes.success).toBe(true);
    expect(bindingRes.output).toContain('0050.56a1.b2c3');
    expect(bindingRes.output).toContain('192.168.1.50');
  });
});
