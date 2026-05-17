import { describe, it, expect } from 'vitest';
import { getInvalidCommandError, checkDeviceCompatibility } from './parser';
import { SwitchState } from './types';

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
    expect(result.error).toContain('L3');
  });

  it('allows compatible commands', () => {
    const validCommand = 'vlan 10';
    const result = checkDeviceCompatibility(validCommand, mockState);
    expect(result.valid).toBe(true);
  });
});
