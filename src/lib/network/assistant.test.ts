import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommand, getPrompt } from './executor';
import { SwitchState } from './types';

describe('CLI Assistant & Logic', () => {
  let state: SwitchState;

  beforeEach(() => {
    state = {
      hostname: 'Switch',
      currentMode: 'privileged',
      ports: {},
      vlans: {},
      security: {
        consoleLine: { login: false },
        vtyLines: { login: false }
      },
      commandHistory: []
    } as any;
  });

  it('should expand unique command prefixes correctly', () => {
    // 'en' is unique for 'enable' in user mode
    state.currentMode = 'user';
    const result = executeCommand(state, 'en');
    expect(result.newState?.currentMode).toBe('privileged');
  });

  it('should return ambiguous error for non-unique prefixes', () => {
    // In privileged mode, 's' matches 'show', 'ssh', 'setup', etc.
    const result = executeCommand(state, 's');
    expect(result.success).toBe(false);
    expect(result.error).toContain('% Ambiguous command');
  });

  it('should provide contextual help for "show ?"', () => {
    const result = executeCommand(state, 'show ?');
    expect(result.success).toBe(true);
    expect(result.output).toContain('running-config');
    expect(result.output).toContain('interfaces');
    expect(result.output).toContain('vlan');
  });

  it('should handle "do" command help recursively', () => {
    state.currentMode = 'config';
    const result = executeCommand(state, 'do show ?');
    expect(result.success).toBe(true);
    // Should show privileged-mode 'show' options even in config mode
    expect(result.output).toContain('running-config');
  });

  it('should indicate <cr> for valid complete commands in help', () => {
    const result = executeCommand(state, 'write ?');
    expect(result.success).toBe(true);
    expect(result.output).toContain('<cr>');
  });

  it('should position caret correctly for invalid input', () => {
    const result = executeCommand(state, 'show invalidcommand');
    expect(result.success).toBe(false);
    // Caret should be under 'invalidcommand'
    // "show invalidcommand"
    //  012345
    expect(result.error).toContain('show invalidcommand\n     ^');
    expect(result.error).toContain('% Invalid input detected at \'^\' marker');
  });
});
