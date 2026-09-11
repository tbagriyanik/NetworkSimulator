import { describe, it, expect } from 'vitest';
import { cmdIpArpInspectionTrust, cmdNoIpArpInspectionTrust } from '@/lib/network/core/interface/cmd.ipAddress';
import { SwitchState, Port, SwitchModel, SwitchLayer, Vlan, SecurityConfig } from '@/lib/network/types';
import type { CommandContext } from '@/lib/network/core/commandTypes';

describe('IP ARP Inspection Command Support', () => {
  const commandContext: CommandContext = {
    language: 'en',
    deviceStates: new Map(),
  };

  const createMockState = (): SwitchState => ({
    hostname: 'Switch-1',
    macAddress: '00:11:22:33:44:55',
    switchModel: 'NS-L2-24TT-L' as SwitchModel,
    switchLayer: 'L2' as SwitchLayer,
    currentMode: 'config',
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

  it('configures ip arp inspection trust on interface mode', () => {
    const state = createMockState();
    state.currentMode = 'interface';
    state.currentInterface = 'gi0/1';
    const res = cmdIpArpInspectionTrust(state, 'ip arp inspection trust', commandContext);
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['gi0/1']?.arpInspectionTrust).toBe(true);
  });

  it('removes ip arp inspection trust on interface mode', () => {
    const state = createMockState();
    state.currentMode = 'interface';
    state.currentInterface = 'gi0/1';
    state.ports['gi0/1'].arpInspectionTrust = true;
    const res = cmdNoIpArpInspectionTrust(state, 'no ip arp inspection trust', commandContext);
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['gi0/1']?.arpInspectionTrust).toBe(false);
  });
});
