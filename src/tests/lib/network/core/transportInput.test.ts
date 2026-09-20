import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { createInitialState } from '@/lib/network/initialState';
import { lineAllowsProtocol } from '@/lib/network/core/lineCommands';
import type { SwitchState } from '@/lib/network/types';

function run(state: SwitchState, input: string, mode: SwitchState['currentMode'] = 'config'): SwitchState {
  const result = executeCommand({ ...state, currentMode: mode }, input, 'en');
  expect(result.success, `command failed: ${input} -> ${result.error ?? ''}`).toBe(true);
  return { ...state, ...result.newState } as SwitchState;
}

function enterVty(state: SwitchState): SwitchState {
  return run(state, 'line vty 0 4');
}

describe('transport input semantics', () => {
  it("'all' allows both telnet and ssh", () => {
    let state = enterVty(createInitialState() as SwitchState);
    state = run(state, 'transport input all', 'line');
    expect(state.security?.vtyLines?.transportInput).toEqual(['all']);
    expect(lineAllowsProtocol(state.security?.vtyLines?.transportInput, 'ssh')).toBe(true);
    expect(lineAllowsProtocol(state.security?.vtyLines?.transportInput, 'telnet')).toBe(true);
  });

  it("'none' blocks both telnet and ssh", () => {
    let state = enterVty(createInitialState() as SwitchState);
    state = run(state, 'transport input none', 'line');
    expect(state.security?.vtyLines?.transportInput).toEqual(['none']);
    expect(lineAllowsProtocol(state.security?.vtyLines?.transportInput, 'ssh')).toBe(false);
    expect(lineAllowsProtocol(state.security?.vtyLines?.transportInput, 'telnet')).toBe(false);
  });

  it("'ssh' allows only ssh", () => {
    let state = enterVty(createInitialState() as SwitchState);
    state = run(state, 'transport input ssh', 'line');
    expect(lineAllowsProtocol(state.security?.vtyLines?.transportInput, 'ssh')).toBe(true);
    expect(lineAllowsProtocol(state.security?.vtyLines?.transportInput, 'telnet')).toBe(false);
  });

  it('deduplicates repeated protocols preserving order', () => {
    let state = enterVty(createInitialState() as SwitchState);
    state = run(state, 'transport input ssh telnet ssh', 'line');
    expect(state.security?.vtyLines?.transportInput).toEqual(['ssh', 'telnet']);
  });

  it('rejects mixing all/none with specific protocols', () => {
    let state = enterVty(createInitialState() as SwitchState);
    for (const cmd of ['transport input all ssh', 'transport input none telnet', 'transport input all none']) {
      const result = executeCommand({ ...state, currentMode: 'line' }, cmd, 'en');
      expect(result.success, `should reject: ${cmd}`).toBe(false);
      expect(result.error).toContain('all/none cannot be combined');
    }
  });

  it('applies to the console line as well', () => {
    let state = run(createInitialState() as SwitchState, 'line console 0');
    state = run(state, 'transport input ssh', 'line');
    expect(state.security?.consoleLine?.transportInput).toEqual(['ssh']);
    expect(state.security?.vtyLines?.transportInput).toEqual(['all']);
  });

  it("'no transport input' clears the vty list", () => {
    let state = enterVty(createInitialState() as SwitchState);
    state = run(state, 'transport input ssh', 'line');
    state = run(state, 'no transport input', 'line');
    expect(state.security?.vtyLines?.transportInput).toEqual([]);
    expect(lineAllowsProtocol(state.security?.vtyLines?.transportInput, 'ssh')).toBe(false);
  });
});