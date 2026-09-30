// src/lib/network/conntrackEngine.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConntrackEngine } from './conntrackEngine';

/**
 * Helper to mock Date.now for aging tests.
 */
function mockDateNow(start: number) {
  let now = start;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  return {
    advance(ms: number) {
      now += ms;
    }
  };
}

describe('ConntrackEngine', () => {
  let engine: ConntrackEngine;
  const startTime = 1_600_000_000_000; // arbitrary epoch ms

  beforeEach(() => {
    engine = new ConntrackEngine();
    vi.restoreAllMocks();
  });

  it('tracks TCP handshake state transitions correctly', () => {
    const syn = engine.trackPacket('TCP', '10.0.0.1', 12345, '10.0.0.2', 80, { syn: true });
    expect(syn.state).toBe('SYN_SENT');
    const synAck = engine.trackPacket('TCP', '10.0.0.2', 80, '10.0.0.1', 12345, { syn: true, ack: true });
    expect(synAck.state).toBe('SYN_RECV');
    const ack = engine.trackPacket('TCP', '10.0.0.1', 12345, '10.0.0.2', 80, { ack: true });
    expect(ack.state).toBe('ESTABLISHED');
  });

  it('handles RST resetting to CLOSED', () => {
    const entry = engine.trackPacket('TCP', '10.0.0.1', 12345, '10.0.0.2', 80, { syn: true });
    expect(entry.state).toBe('SYN_SENT');
    const reset = engine.trackPacket('TCP', '10.0.0.1', 12345, '10.0.0.2', 80, { rst: true });
    expect(reset.state).toBe('CLOSED');
  });

  it('purgeExpired removes timed‑out entries', () => {
    const mock = mockDateNow(startTime);
    engine.trackPacket('TCP', '10.0.0.1', 1111, '10.0.0.2', 2222);
    expect(engine.getSessions()).toHaveLength(1);
    mock.advance(31_000);
    engine.purgeExpired();
    expect(engine.getSessions()).toHaveLength(0);
  });

  it('inspectPacket returns correct allow/deny decisions', () => {
    // Build a simple ESTABLISHED connection
    engine.trackPacket('TCP', '10.0.0.1', 1234, '10.0.0.2', 80, { syn: true, ack: true });
    engine.trackPacket('TCP', '10.0.0.2', 80, '10.0.0.1', 1234, { ack: true });
    const result = engine.inspectPacket('TCP', '10.0.0.1', 1234, '10.0.0.2', 80);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('Allow');
    const miss = engine.inspectPacket('TCP', '1.1.1.1', 5555, '2.2.2.2', 80);
    expect(miss.allowed).toBe(false);
  });
});
