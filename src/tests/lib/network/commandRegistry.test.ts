import { describe, it, expect } from 'vitest';
import { commandHandlers } from '@/lib/network/executor';
import { commandPatterns } from '@/lib/network/parser';
import { executeCommand } from '@/lib/network/executor';
import { createInitialState } from '@/lib/network/initialState';
import type { SwitchState } from '@/lib/network/types';

/**
 * Every pattern registered in the parser MUST actually be bound to a handler
 * in the unified command registry. A validated command with no handler falls
 * through to `executeCommand`'s silent `{ success: true }` no-op, which looks
 * like success but produces no output and no state change.
 */

function isShowFamily(key: string): boolean {
  return key.startsWith('show ') || key === 'show';
}

// Mirrors the SHOW-family intent-first fallback in executor.ts: a show pattern
// key is "covered" when a showHandlers entry is an exact or prefix match.
function isCoveredByShowFallback(key: string): boolean {
  if (!isShowFamily(key)) return false;
  return Object.keys(commandHandlers).some(
    (handlerKey) => isShowFamily(handlerKey) && (key === handlerKey || key.startsWith(`${handlerKey} `))
  );
}

describe('Command Registry Completeness', () => {
  it('every command pattern key is bound to a handler (direct or show fallback)', () => {
    const uncovered = Object.keys(commandPatterns).filter(
      (key) => !commandHandlers[key] && !isCoveredByShowFallback(key)
    );
    expect(uncovered).toEqual([]);
  });

  it('explicit show patterns have an explicit show handler (no silent fallback dependency)', () => {
    // Patterns that are themselves show commands should be directly registered.
    const missingShowHandlers = Object.keys(commandPatterns).filter(
      (key) => isShowFamily(key) && !commandHandlers[key]
    );
    expect(missingShowHandlers).toEqual([]);
  });
});

describe('Executing every registered command reaches a handler', () => {
  const baseStates: Record<string, SwitchState> = {
    L2: { ...createInitialState('00:11:22:33:44:01', 'NS-L2-24TT-L'), currentMode: 'privileged' },
    L3: { ...createInitialState('00:11:22:33:44:02', 'NS-L3-24PS'), currentMode: 'privileged' },
  };

  it('no mode-valid pattern key falls through to the silent no-op handler', () => {
    // Executing the bare command first token of every pattern entry would be a
    // huge combinatorial problem; instead we assert the table level: no pattern
    // key maps to a handler that is undefined. The silent no-op in executor.ts
    // (`return { success: true }`) only triggers for unregistered keys, and the
    // registry completeness test above guarantees those do not exist.
    for (const [key, pattern] of Object.entries(commandPatterns)) {
      const direct = commandHandlers[key];
      if (!direct && isCoveredByShowFallback(key)) continue;
      expect(direct, `pattern "${key}" has no handler`).toBeDefined();
      expect(pattern.minArgs).toBeGreaterThanOrEqual(0);
      expect(pattern.maxArgs).toBeGreaterThanOrEqual(pattern.minArgs);
    }
  });

  it('run-config and switchport commands actually return output on L2/L3', () => {
    for (const [label, state] of Object.entries(baseStates)) {
      const showRun = executeCommand(state, 'show running-config');
      expect(showRun.success, `${label} show running-config`).toBe(true);
      expect(typeof showRun.output).toBe('string');
      expect(showRun.output!.length).toBeGreaterThan(0);

      const showInt = executeCommand(state, 'show ip interface brief');
      expect(showInt.success, `${label} show ip interface brief`).toBe(true);
      expect(typeof showInt.output).toBe('string');
    }
  });
});