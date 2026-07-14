import { describe, it, expect, vi } from 'vitest';
import { parseCommand, validateCommand, resolveAliases, getLevenshteinDistance, expandKeywordPrefixes, getInvalidCommandError } from '@/lib/network/parser';
import type { ParsedCommand } from '@/lib/network/types';


vi.mock('@/lib/network/capabilities', () => ({
  getDeviceCapabilities: vi.fn(() => undefined),
}));

describe('Command Parser Functions', () => {
  describe('getLevenshteinDistance', () => {
    it('should calculate edit distance correctly for identical strings', () => {
      expect(getLevenshteinDistance('enable', 'enable')).toBe(0);
    });

    it('should calculate edit distance for one character difference', () => {
      expect(getLevenshteinDistance('enable', 'enable!')).toBe(1);
    });

    it('should handle empty strings', () => {
      expect(getLevenshteinDistance('', 'enable')).toBe(6);
      expect(getLevenshteinDistance('enable', '')).toBe(6);
      expect(getLevenshteinDistance('', '')).toBe(0);
    });
  });

  describe('resolveAliases', () => {
    it('should resolve exact alias matches', () => {
      expect(resolveAliases('en', {})).toBe('enable');
    });

    it('should handle non-aliased commands', () => {
      expect(resolveAliases('enable', {})).toBe('enable');
      expect(resolveAliases('show version', {})).toBe('show version');
    });

    it('should prefer longer aliases for prefix matching', () => {
      const stateWithAliases = {
        execAliases: {
          'sh': 'show',
          'sh ver': 'show version',
        }
      };
      expect(resolveAliases('sh ver', stateWithAliases)).toBe('show version');
      expect(resolveAliases('sh', stateWithAliases)).toBe('show');
    });

    it('should handle case insensitivity', () => {
      expect(resolveAliases('EN', {})).toBe('enable');
      expect(resolveAliases('En', {})).toBe('enable');
    });
  });

  describe('expandKeywordPrefixes', () => {
    it('should expand unambiguous keywords', () => {
      const result = expandKeywordPrefixes('en', 'user');
      expect(result).toBe('enable');
    });

    it('should not expand when ambiguous', () => {
      const result = expandKeywordPrefixes('c', 'privileged');
      expect(result).toBe('c');
    });

    it('should handle multi-token prefixes', () => {
      // Test a case that's not ambiguous! Use "sh interfac" which is ambiguous between "interface" and "interfaces"!
      const result1 = expandKeywordPrefixes('sh interfac', 'privileged');
      expect(result1).toBe('show interfac');
      // Also, test that "sh int" stays because it's ambiguous between "interface" and "interfaces"!
      const result2 = expandKeywordPrefixes('sh int', 'privileged');
      expect(result2).toBe('show int');
    });
  });

  describe('parseCommand', () => {
    it('should parse simple commands', () => {
      const result = parseCommand('enable', 'user');
      expect(result).not.toBeNull();
      expect(result?.command).toBe('enable');
      expect(result?.args).toEqual([]);
    });

    it('should parse commands with arguments', () => {
      const result = parseCommand('interface fastethernet0/1', 'config');
      expect(result).not.toBeNull();
      expect(result?.command).toBe('interface');
      expect(result?.args).toEqual(['fastethernet0/1']);
    });

    it('should handle alias resolution', () => {
      const state = {
        execAliases: { en: 'enable' }
      } as const;
      const result = parseCommand('en', 'user', state);
      expect(result).not.toBeNull();
      expect(result?.command).toBe('enable');
    });

    it('should infer command intent', () => {
      const result = parseCommand('show ip route', 'privileged');
      expect(result).not.toBeNull();
      expect(result?.intent?.family).toBe('show');
    });

    it('should return null for empty input', () => {
      const result = parseCommand('', 'user');
      expect(result).toBeNull();
    });
  });

  describe('validateCommand', () => {
    const mockState = {
      switchModel: 'WS-C2960-24TT-L' as const,
      switchLayer: 'L2' as const,
      currentMode: 'user' as const,
      isLayer3Switch: false
    } as const;

    it('should validate known commands', () => {
      const parsed: ParsedCommand = { command: 'enable', args: [], rawInput: 'enable', resolvedInput: 'enable' };
      const result = validateCommand(parsed, 'user', mockState);
      expect(result.valid).toBe(true);
      expect(result.reason).toBe('ok');
    });

    it('should reject invalid commands', () => {
      const parsed: ParsedCommand = { command: 'invalidcommand', args: [], rawInput: 'invalidcommand', resolvedInput: 'invalidcommand' };
      const result = validateCommand(parsed, 'user', mockState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('unknown-command');
    });

    it('should check mode compatibility', () => {
      const parsed: ParsedCommand = { command: 'configure terminal', args: [], rawInput: 'configure terminal', resolvedInput: 'configure terminal' };
      const result = validateCommand(parsed, 'privileged', mockState);
      expect(result.valid).toBe(true);
    });

    it('should reject commands for wrong mode', () => {
      const parsed: ParsedCommand = { command: 'enable', args: [], rawInput: 'enable', resolvedInput: 'enable' };
      const result = validateCommand(parsed, 'config', mockState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid-mode');
    });

    it('should check device compatibility', () => {
      const l2SwitchState = {
        ...mockState,
        switchLayer: 'L2' as const
      } as const;
      const parsed: ParsedCommand = { command: 'ip routing', args: [], rawInput: 'ip routing', resolvedInput: 'ip routing' };
      const result = validateCommand(parsed, 'config', l2SwitchState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('unknown-command');
    });

    it('should handle ambiguous commands', () => {
      const parsedConf: ParsedCommand = { command: 'conf', args: [], rawInput: 'conf', resolvedInput: 'conf' };
      const resultConf = validateCommand(parsedConf, 'privileged', mockState);
      expect(resultConf.valid).toBe(true);
      expect(resultConf.reason).toBe('ok');
    });
  });

  describe('Command Length Limit', () => {
    it('should handle commands longer than 256 characters in parseCommand', () => {
      const longInput = 'a'.repeat(257);
      const parsed = parseCommand(longInput, 'user');
      expect(parsed).not.toBeNull();
      expect(parsed?.rawInput).toBe(longInput);
      expect(parsed?.command).toBe('');
    });

    it('should reject commands longer than 256 characters in validateCommand', () => {
      const longInput = 'a'.repeat(257);
      const parsed = parseCommand(longInput, 'user')!;
      const validation = validateCommand(parsed, 'user');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('unknown-command');
      expect(validation.error).toContain('Command exceeds maximum length of 256 characters.');
    });
  });

  describe('getInvalidCommandError', () => {
    it('should generate error message for unknown command', () => {
      const result = getInvalidCommandError('enable');
      expect(result).toContain('enable');
      expect(result).toContain('^');
      expect(result).toContain('Invalid input detected');
    });

    it('should handle empty command', () => {
      const result = getInvalidCommandError('');
      expect(result).toContain('^');
      expect(result).toContain('Invalid input detected');
    });
  });
});
