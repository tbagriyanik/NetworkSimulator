import { describe, it, expect } from 'vitest';
import { getTabCompletion } from '@/lib/network/core/cliAutocomplete';
import { parseCommand, validateCommand, getInvalidCommandError } from '@/lib/network/parser';
import { createInitialState } from '@/lib/network/initialState';

describe('CLI Abbreviation, Autocomplete, Error Messaging & Mode Validation', () => {
  const switchState = createInitialState('00:aa:bb:cc:dd:01', 'NS-L2-24TT-L');

  it('1. Tab Autocomplete prefix completion for single match', () => {
    const res = getTabCompletion('conf', 'privileged', switchState);
    expect(res.completed).toBe('configure');
    expect(res.isUnique).toBe(true);
  });

  it('2. Tab Autocomplete candidate listing for ambiguous tokens', () => {
    const res = getTabCompletion('c', 'privileged', switchState);
    expect(res.suggestions.length).toBeGreaterThan(1);
    expect(res.suggestions).toContain('configure');
  });

  it('3. Tab Autocomplete for interface names', () => {
    const res = getTabCompletion('interface Fast', 'config');
    expect(res.suggestions.some(s => s.startsWith('FastEthernet'))).toBe(true);

    const resL2 = getTabCompletion('interface fa', 'config', switchState);
    expect(resL2.suggestions.some(s => s.startsWith('fa0/'))).toBe(true);
  });

  it("4. Tab Autocomplete with 'do' prefix in config mode", () => {
    const res = getTabCompletion('do sh', 'config', switchState);
    expect(res.completed).toBe('do show');
  });

  it('5. Command Abbreviation Expansion', () => {
    const parsed1 = parseCommand('sh ip ro', 'privileged', switchState);
    expect(parsed1?.resolvedInput).toBe('show ip route');

    const parsed2 = parseCommand('conf t', 'privileged', switchState);
    expect(parsed2?.resolvedInput).toBe('configure terminal');

    const parsed3 = parseCommand('int fa0/1', 'config', switchState);
    expect(parsed3?.resolvedInput).toBe('interface fa0/1');
  });

  it('6. Invalid Mode Rejection & Mode Context Validation', () => {
    // Attempting configure terminal in User EXEC mode
    const parsed = parseCommand('configure terminal', 'user', switchState);
    expect(parsed).not.toBeNull();
    if (parsed) {
      const val = validateCommand(parsed, 'user', switchState);
      expect(val.valid).toBe(false);
      expect(val.reason).toBe('invalid-mode');
    }
  });

  it("7. Caret Positioning '^' in Error Output", () => {
    const errOutput = getInvalidCommandError('interface FastEthernet0/1 invalidKeyword', 2, 'config');
    expect(errOutput).toContain('^');
    expect(errOutput).toContain("% Invalid input detected at '^' marker.");
  });

  it('8. Ambiguous Command Detection', () => {
    const parsed = parseCommand('c', 'privileged', switchState);
    if (parsed) {
      const val = validateCommand(parsed, 'privileged', switchState);
      expect(val.valid).toBe(false);
      expect(val.reason).toBe('ambiguous');
      expect(val.error).toContain('% Ambiguous command');
    }
  });

  it('9. Incomplete Command Detection', () => {
    const parsed = parseCommand('interface', 'config', switchState);
    if (parsed) {
      const val = validateCommand(parsed, 'config', switchState);
      expect(val.valid).toBe(false);
      expect(val.reason).toBe('incomplete');
      expect(val.error).toContain('% Incomplete command.');
    }
  });
});
