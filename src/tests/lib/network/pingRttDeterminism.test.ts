import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePingLatencies,
  formatHopTimes,
  deterministicRandom,
  resetDeterministicRandomSeed,
} from '@/lib/network/core/privilegedConnectivity';
import {
  createIpSlaOperation,
  recordIpSlaProbe,
  runSyntheticIpSlaProbe,
} from '@/lib/network/ipSlaEngine';

describe('Ping RTT Determinism & Latency Regression Suite', () => {
  beforeEach(() => {
    resetDeterministicRandomSeed(42);
  });

  describe('deterministicRandom PRNG', () => {
    it('produces an identical pseudorandom stream when seed is reset', () => {
      resetDeterministicRandomSeed(12345);
      const seq1 = [deterministicRandom(), deterministicRandom(), deterministicRandom(), deterministicRandom()];

      resetDeterministicRandomSeed(12345);
      const seq2 = [deterministicRandom(), deterministicRandom(), deterministicRandom(), deterministicRandom()];

      expect(seq1).toEqual(seq2);
    });

    it('generates values strictly in the range [0, 1)', () => {
      for (let i = 0; i < 100; i++) {
        const val = deterministicRandom();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('generatePingLatencies (proportional WiFi RTT)', () => {
    it('is strictly deterministic for repeatable simulation runs', () => {
      resetDeterministicRandomSeed(999);
      const run1 = generatePingLatencies(300);

      resetDeterministicRandomSeed(999);
      const run2 = generatePingLatencies(300);

      expect(run1).toEqual(run2);
      expect(typeof run1.min).toBe('number');
      expect(typeof run1.avg).toBe('number');
      expect(typeof run1.max).toBe('number');
    });

    it('enforces min <= avg <= max invariant at all distances', () => {
      const distances = [0, 50, 100, 200, 350, 450, 549, 600];
      for (const dist of distances) {
        const rtt = generatePingLatencies(dist);
        expect(rtt.min).toBeLessThanOrEqual(rtt.avg);
        expect(rtt.avg).toBeLessThanOrEqual(rtt.max);
        expect(rtt.min).toBeGreaterThanOrEqual(1);
      }
    });

    it('scales RTT exponentially with distance', () => {
      resetDeterministicRandomSeed(42);
      const rttZero = generatePingLatencies(0);

      resetDeterministicRandomSeed(42);
      const rttMid = generatePingLatencies(260);

      resetDeterministicRandomSeed(42);
      const rttFar = generatePingLatencies(500);

      expect(rttZero.avg).toBeLessThan(rttMid.avg);
      expect(rttMid.avg).toBeLessThan(rttFar.avg);
      expect(rttZero.min).toBe(1);
    });
  });

  describe('formatHopTimes (traceroute per-hop timing)', () => {
    it('formats wired hops (<1ms) properly', () => {
      const result = formatHopTimes(1);
      expect(result).toMatch(/<1 ms/);
    });

    it('formats higher latency hops with determinism', () => {
      resetDeterministicRandomSeed(777);
      const hop1 = formatHopTimes(25);

      resetDeterministicRandomSeed(777);
      const hop2 = formatHopTimes(25);

      expect(hop1).toBe(hop2);
      expect(hop1).toContain('25 ms');
    });
  });

  describe('IP SLA Deterministic Probe & Latency Computation', () => {
    it('records direct probes and updates deterministic latency metrics', () => {
      let op = createIpSlaOperation('sla-direct', '192.168.1.1', 'icmp-echo', 10);
      op = recordIpSlaProbe(op, 20, 1000);
      op = recordIpSlaProbe(op, 40, 2000);

      expect(op.statistics.attempts).toBe(2);
      expect(op.statistics.successes).toBe(2);
      expect(op.statistics.min).toBe(20);
      expect(op.statistics.max).toBe(40);
      expect(op.statistics.avg).toBe(30);
      expect(op.statistics.jitter).toBe(20);
    });

    it('computes deterministic statistics from synthetic probes', () => {
      let op = createIpSlaOperation('sla-1', '192.168.1.1', 'icmp-echo', 10);
      const probeLatencies = [12, 14, 11, 15, 13];

      for (const lat of probeLatencies) {
        op = runSyntheticIpSlaProbe(op, { reachable: true, latency: lat }, 1000);
      }

      expect(op.statistics.attempts).toBe(5);
      expect(op.statistics.successes).toBe(5);
      expect(op.statistics.failures).toBe(0);
      expect(op.statistics.min).toBe(11);
      expect(op.statistics.max).toBe(15);
      expect(op.statistics.avg).toBe(13);
      expect(op.statistics.last).toBe(13);
      expect(op.statistics.jitter).toBeDefined();
    });

    it('handles unreachable synthetic probes gracefully with zero division safety', () => {
      let op = createIpSlaOperation('sla-2', '10.0.0.1', 'icmp-echo', 10);
      op = runSyntheticIpSlaProbe(op, { reachable: false }, 2000);

      expect(op.statistics.attempts).toBe(1);
      expect(op.statistics.successes).toBe(0);
      expect(op.statistics.failures).toBe(1);
      expect(op.statistics.min).toBeUndefined();
      expect(op.statistics.avg).toBeUndefined();
      expect(op.statistics.max).toBeUndefined();
    });
  });
});
