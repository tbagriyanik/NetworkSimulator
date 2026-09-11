import { describe, expect, it } from 'vitest';
import { createIpSlaOperation, formatIpSlaStatistics, isIpSlaDue, runSyntheticIpSlaProbe } from '@/lib/network/ipSla';
import { executeCommand } from '@/lib/network/executor';
import { createInitialState } from '@/lib/network/initialState';

describe('IP SLA active probes', () => {
  it('records synthetic RTT samples and calculates jitter', () => {
    let op = createIpSlaOperation('1', '10.0.0.1', 'jitter');
    op = runSyntheticIpSlaProbe(op, { reachable: true, latency: 10 }, 1);
    op = runSyntheticIpSlaProbe(op, { reachable: true, latency: 16 }, 2);
    expect(op.statistics).toMatchObject({ attempts: 2, successes: 2, failures: 0, min: 10, max: 16, avg: 13, jitter: 6 });
  });

  it('counts unreachable targets as timeouts without corrupting RTT values', () => {
    const op = runSyntheticIpSlaProbe(createIpSlaOperation('2', '192.0.2.1'), { reachable: false }, 1);
    expect(op.statistics).toMatchObject({ attempts: 1, successes: 0, failures: 1 });
    expect(formatIpSlaStatistics({ '2': op })).toContain('Packets: Sent = 1, Received = 0, Lost = 1');
  });

  it('honors the configured frequency for scheduled probes', () => {
    let op = createIpSlaOperation('3', '10.0.0.3');
    op = { ...op, running: true, lastRunAt: 1000 };
    expect(isIpSlaDue(op, 60000)).toBe(false);
    expect(isIpSlaDue(op, 61000)).toBe(true);
  });

  it('accepts the CLI operation and schedule forms', () => {
    let state = createInitialState('TestRouter', 'NS-L3-24PS');
    state = { ...state, currentMode: 'config' };
    let result = executeCommand(state, 'ip sla 10 icmp-echo 192.0.2.1 frequency 10', 'en');
    expect(result.success).toBe(true);
    state = { ...state, ...result.newState };
    result = executeCommand(state, 'ip sla schedule 10 life forever start now', 'en');
    expect(result.success).toBe(true);
    expect(result.newState?.ipSlaOperations?.['10']?.running).toBe(true);
  });
});
