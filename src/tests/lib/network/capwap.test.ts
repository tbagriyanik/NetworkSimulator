import { describe, expect, it } from 'vitest';
import { tickCapwap } from '@/lib/network/capwap';
import type { SwitchState } from '@/lib/network/types';

describe('CAPWAP state machine', () => {
  it('advances discovery through join, data channel and run', () => {
    let state = { wlcAps: { AP1: { name: 'AP1', macAddress: '00:11:22:33:44:55', status: 'joined' } } } as unknown as SwitchState;
    const states: string[] = [];
    for (let i = 0; i < 5; i++) {
      const result = tickCapwap(state, 1000 + i);
      state = result.state;
      states.push(result.sessions.AP1.state);
    }
    expect(states).toEqual(['joining', 'configuring', 'data', 'run', 'run']);
    expect(resultState(state).capwapSessions.AP1.dataChannel).toBe(true);
  });

  it('moves an AP to failed and drops channels when it disconnects', () => {
    const state = { wlcAps: { AP1: { name: 'AP1', macAddress: '00:11:22:33:44:55', status: 'disconnected' } } } as unknown as SwitchState;
    const result = tickCapwap(state, 1000);
    expect(result.sessions.AP1.state).toBe('failed');
    expect(result.sessions.AP1.controlChannel).toBe(false);
  });
});

function resultState(state: SwitchState): SwitchState & { capwapSessions: Record<string, { dataChannel: boolean }> } {
  return state as SwitchState & { capwapSessions: Record<string, { dataChannel: boolean }> };
}
