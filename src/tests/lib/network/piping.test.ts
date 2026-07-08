import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { createInitialState } from '@/lib/network/initialState';
import type { SwitchState } from '@/lib/network/types';

describe('CLI Piping Support', () => {
  const baseState = createInitialState();
  const state = {
    ...baseState,
    currentMode: 'privileged' as const,
    hostname: 'Switch',
    vlans: {
      ...baseState.vlans,
      '10': { id: 10, name: 'Marketing', status: 'active', ports: [] }
    }
  } as SwitchState;

  it('should support "| include" filter', () => {
    const result = executeCommand(state, 'show running-config | include interface');
    expect(result.success).toBe(true);
    expect(result.output).toContain('interface FastEthernet0/1');
    expect(result.output).toContain('interface FastEthernet0/2');
    expect(result.output).not.toContain('shutdown');
  });

  it('should support "| i" shortcut', () => {
    const result = executeCommand(state, 'show running-config | i vlan 10');
    expect(result.success).toBe(true);
    expect(result.output).toContain('vlan 10');
    expect(result.output).not.toContain('interface Vlan1');
  });

  it('should support "| exclude" filter', () => {
    const result = executeCommand(state, 'show running-config | exclude interface');
    expect(result.success).toBe(true);
    expect(result.output).not.toContain('interface FastEthernet0/1');
    expect(result.output).toContain('shutdown');
  });

  it('should support "| ex" shortcut', () => {
    const result = executeCommand(state, 'show running-config | ex interface');
    expect(result.success).toBe(true);
    expect(result.output).not.toContain('interface');
  });

  it('should support "| begin" filter', () => {
    const result = executeCommand(state, 'show running-config | begin vlan 10');
    expect(result.success).toBe(true);
    const lines = (result.output ?? '').split('\n');
    expect(lines[0]).toContain('vlan 10');
  });

  it('should support "| b" shortcut', () => {
    const result = executeCommand(state, 'show running-config | b vlan 10');
    expect(result.success).toBe(true);
    const lines = (result.output ?? '').split('\n');
    expect(lines[0]).toContain('vlan 10');
  });
});
