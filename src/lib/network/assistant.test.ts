import { describe, it, expect } from 'vitest';
import { getInvalidCommandError, checkDeviceCompatibility } from './parser';
import { SwitchState } from './types';
import { executeCommand } from './executor';

describe('CLI Assistant Logic', () => {
  const mockState: SwitchState = {
    hostname: 'SWITCH-1',
    switchModel: 'WS-C2960-24TT-L',
    currentMode: 'config',
    deviceType: 'switchL2',
    ports: {},
    vlans: {},
    security: { users: [] },
  } as any;

  it('fuzzy matching works for common typos', () => {
    // Note: getInvalidCommandError expects currentMode as 3rd arg for suggestions
    // Pattern 'configure terminal' matches for 'privileged' mode
    const error = getInvalidCommandError('confgure', mockState, 'privileged' as any);
    expect(error).toContain('Did you mean');
    expect(error).toContain('configure');
  });

  it('detects device incompatibility', () => {
    // Router command on L2 Switch
    const routerCommand = 'ip routing';
    const result = checkDeviceCompatibility(routerCommand, mockState);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid input detected at '^' marker.");
  });

  it('allows compatible commands', () => {
    const validCommand = 'vlan 10';
    const result = checkDeviceCompatibility(validCommand, mockState);
    expect(result.valid).toBe(true);
  });

  it('smart suggestions are appended to executeCommand errors in user mode', () => {
    const state: SwitchState = {
      hostname: 'Switch',
      switchModel: 'WS-C2960-24TT-L',
      currentMode: 'user',
      deviceType: 'switch',
      switchLayer: 'L2',
      ports: {},
      vlans: {},
      security: { users: [] },
    } as any;

    const result = executeCommand(state, 'shw', 'tr');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tahmini Öneriler');
    expect(result.error).toContain('show');
  });

  it('smart suggestions are appended to executeCommand errors in global config mode with "do"', () => {
    const state: SwitchState = {
      hostname: 'Switch',
      switchModel: 'WS-C2960-24TT-L',
      currentMode: 'config',
      deviceType: 'switch',
      switchLayer: 'L2',
      ports: {},
      vlans: {},
      security: { users: [] },
    } as any;

    const result = executeCommand(state, 'do shw', 'tr');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tahmini Öneriler');
    expect(result.error).toContain('show');
  });

  it('general suggestion fallback is triggered for completely unknown subcommands', () => {
    const state: SwitchState = {
      hostname: 'Switch',
      switchModel: 'WS-C2960-24TT-L',
      currentMode: 'config',
      deviceType: 'switch',
      switchLayer: 'L2',
      ports: {},
      vlans: {},
      security: { users: [] },
    } as any;

    const result = executeCommand(state, 'do xyzzy', 'tr');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tahmini Öneriler');
    expect(result.error).toContain('show');
    expect(result.error).toContain('ping');
    expect(result.error).toContain('write');
  });
});
