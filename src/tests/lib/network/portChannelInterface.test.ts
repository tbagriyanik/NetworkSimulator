import { describe, it, expect } from 'vitest';
import { cmdInterface } from '@/lib/network/core/interface/cmd.interface';
import { cmdChannelGroup } from '@/lib/network/core/interface/cmd.spanningTree';
import { SwitchState, Port, SwitchModel, SwitchLayer, Vlan, SecurityConfig } from '@/lib/network/types';
import { normalizePortId } from '@/lib/network/portUtils';
import type { CommandContext } from '@/lib/network/core/commandTypes';

describe('Port-channel Interface Command Support', () => {
  const commandContext: CommandContext = {
    language: 'en',
    deviceStates: new Map(),
  };

  const createMockState = (): SwitchState => ({
    hostname: 'Switch',
    macAddress: '00:11:22:33:44:55',
    switchModel: 'NS-L2-24TT-L' as SwitchModel,
    switchLayer: 'L2' as SwitchLayer,
    currentMode: 'config',
    commandHistory: [],
    ports: {
      'gi0/1': { id: 'gi0/1', name: 'Gi0/1', status: 'connected', type: 'gigabitethernet' } as Port,
      'gi0/2': { id: 'gi0/2', name: 'Gi0/2', status: 'connected', type: 'gigabitethernet' } as Port,
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

  it('normalizes port-channel names properly', () => {
    expect(normalizePortId('port-channel 1')).toBe('po1');
    expect(normalizePortId('port-channel1')).toBe('po1');
    expect(normalizePortId('po 1')).toBe('po1');
    expect(normalizePortId('po1')).toBe('po1');
  });

  it('enters interface configuration for port-channel 1', () => {
    const state = createMockState();
    const res = cmdInterface(state, 'interface port-channel 1', commandContext);
    expect(res.success).toBe(true);
    expect(res.newState?.currentMode).toBe('interface');
    expect(res.newState?.currentInterface).toBe('po1');
    expect(res.newState?.ports?.po1).toBeDefined();
    expect(res.newState?.ports?.po1.name).toBe('Port-channel1');
  });

  it('enters interface configuration for po 1 and selects member ports', () => {
    const state = createMockState();
    // Assign gi0/1 and gi0/2 to channel-group 1
    state.currentMode = 'interface';
    state.currentInterface = 'gi0/1';
    state.selectedInterfaces = ['gi0/1', 'gi0/2'];
    const cgRes = cmdChannelGroup(state, 'channel-group 1 mode active', commandContext);
    expect(cgRes.success).toBe(true);

    if (!cgRes.newState?.ports) {
      throw new Error('channel-group command did not return updated ports');
    }

    const updatedState = { ...state, ports: cgRes.newState.ports, currentMode: 'config' as const };
    const res = cmdInterface(updatedState, 'interface po 1', commandContext);
    expect(res.success).toBe(true);
    expect(res.newState?.currentInterface).toBe('po1');
    expect(res.newState?.selectedInterfaces).toEqual(['po1', 'gi0/1', 'gi0/2']);
  });
});
