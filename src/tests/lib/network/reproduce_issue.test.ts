import { describe, it, expect } from 'vitest';
import { parseCommand, validateCommand } from '@/lib/network/parser';
import { createInitialState } from '@/lib/network/initialState';

describe('CLI Case Insensitivity', () => {
  const state = createInitialState();

  it('should parse "Configure Terminal" correctly', () => {
    const input = 'Configure Terminal';
    const parsed = parseCommand(input, 'privileged', state);
    expect(parsed).not.toBeNull();
    expect(parsed?.command).toBe('configure');

    if (!parsed) return;
    const validation = validateCommand(parsed, 'privileged', state);
    expect(validation.valid).toBe(true);
    expect(validation.matchedPattern).toBe('configure terminal');
  });

  it('should parse "No Shutdown" correctly', () => {
    const input = 'No Shutdown';
    const interfaceState = { ...state, currentMode: 'interface' as const, currentInterface: 'fa0/1' };
    const parsed = parseCommand(input, 'interface', interfaceState);
    expect(parsed).not.toBeNull();

    if (!parsed) return;
    const validation = validateCommand(parsed, 'interface', interfaceState);
    expect(validation.valid).toBe(true);
    expect(validation.matchedPattern).toBe('no shutdown');
  });
});
