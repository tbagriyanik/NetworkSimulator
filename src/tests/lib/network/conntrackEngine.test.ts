import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConntrackEngine,
  parseTcpFlags,
  resolveIngressDirection,
} from '../../../lib/network/conntrackEngine';

describe('conntrackEngine - Dedicated Stateful Connection Tracking Suite', () => {
  let engine: ConntrackEngine;

  beforeEach(() => {
    engine = new ConntrackEngine();
  });

  describe('Utility Functions', () => {
    it('parseTcpFlags parses textual flags correctly', () => {
      expect(parseTcpFlags(undefined)).toEqual({});
      expect(parseTcpFlags('')).toEqual({});
      expect(parseTcpFlags('SYN')).toEqual({ syn: true });
      expect(parseTcpFlags('SYN, ACK')).toEqual({ syn: true, ack: true });
      expect(parseTcpFlags('SYN-ACK')).toEqual({ syn: true, ack: true });
      expect(parseTcpFlags('PSH, ACK')).toEqual({ ack: true });
      expect(parseTcpFlags('FIN/ACK')).toEqual({ fin: true, ack: true });
      expect(parseTcpFlags('RST')).toEqual({ rst: true });
      expect(parseTcpFlags('KEEPALIVE')).toEqual({ ack: true });
      expect(parseTcpFlags('SYN+FIN+RST+ACK')).toEqual({ syn: true, fin: true, rst: true, ack: true });
    });

    it('resolveIngressDirection resolves interface trust directions', () => {
      expect(resolveIngressDirection(undefined)).toBe('unknown');
      expect(resolveIngressDirection({ nameif: 'outside' })).toBe('inbound');
      expect(resolveIngressDirection({ nameif: 'inside' })).toBe('outbound');
      expect(resolveIngressDirection({ securityLevel: 100 })).toBe('outbound');
      expect(resolveIngressDirection({ securityLevel: 0 })).toBe('inbound');
      expect(resolveIngressDirection({ natSide: 'inside' })).toBe('outbound');
      expect(resolveIngressDirection({ natSide: 'outside' })).toBe('inbound');
      expect(resolveIngressDirection({})).toBe('unknown');
    });
  });

  describe('Core State Tracking & 3-Way Handshake', () => {
    it('tracks outbound TCP SYN and permits stateful return traffic', () => {
      const entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
      expect(entry.state).toBe('SYN_SENT');

      const res = engine.inspectReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152);
      expect(res.allowed).toBe(true);
      expect(res.reason).toContain('SPI Allow');
      expect(res.entry?.id).toBe(entry.id);
    });

    it('drops unsolicited inbound traffic with no stateful entry', () => {
      const res = engine.inspectReturnTraffic('TCP', '1.2.3.4', 443, '192.168.1.10', 50000);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('SPI Drop');
    });

    it('progresses full TCP state transitions: SYN -> SYN_RECV -> ESTABLISHED -> FIN_WAIT_1 -> FIN_WAIT_2 -> TIME_WAIT', () => {
      // 1. Client SYN
      let entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
      expect(entry.state).toBe('SYN_SENT');

      // 2. Server SYN-ACK
      const ret1 = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { syn: true, ack: true });
      expect(ret1).not.toBeNull();
      entry = ret1!;
      expect(entry.state).toBe('SYN_RECV');

      // 3. Client ACK
      entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { ack: true });
      expect(entry.state).toBe('ESTABLISHED');
      expect(entry.timeoutSeconds).toBe(86400);

      // 4. Client FIN
      entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { fin: true });
      expect(entry.state).toBe('FIN_WAIT_1');

      // 5. Server ACK
      const ret2 = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { ack: true });
      expect(ret2).not.toBeNull();
      entry = ret2!;
      expect(entry.state).toBe('FIN_WAIT_2');

      // 6. Server FIN
      const ret3 = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { fin: true, ack: true });
      expect(ret3).not.toBeNull();
      entry = ret3!;
      expect(entry.state).toBe('TIME_WAIT');
    });

    it('transitions to CLOSED on RST and denies further return traffic', () => {
      engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
      engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { syn: true, ack: true });
      engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { ack: true });

      const returnEntry = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { rst: true });
      expect(returnEntry?.state).toBe('CLOSED');

      const res = engine.inspectReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('CLOSED');
    });
  });

  describe('inspectAndTrack Pipeline Engine', () => {
    it('drops unsolicited inbound packet on untrusted interface', () => {
      const res = engine.inspectAndTrack('TCP', '203.0.113.5', 44444, '192.168.1.50', 80, {
        direction: 'inbound',
        tcpFlags: { syn: true },
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('unsolicited inbound packet');
      expect(engine.getSessions()).toHaveLength(0);
    });

    it('creates new session for outbound SYN initiation', () => {
      const res = engine.inspectAndTrack('TCP', '192.168.1.50', 44444, '203.0.113.5', 80, {
        direction: 'outbound',
        tcpFlags: { syn: true },
        bytes: 64,
      });
      expect(res.allowed).toBe(true);
      expect(res.reason).toContain('new TCP session');
      expect(res.entry?.state).toBe('SYN_SENT');
      expect(res.entry?.bytesOut).toBe(64);
      expect(res.entry?.packetsOut).toBe(1);
    });

    it('allows and updates return traffic for active outbound session', () => {
      // Outbound SYN
      engine.inspectAndTrack('TCP', '192.168.1.50', 44444, '203.0.113.5', 80, {
        direction: 'outbound',
        tcpFlags: { syn: true },
        bytes: 64,
      });

      // Inbound return SYN-ACK
      const res = engine.inspectAndTrack('TCP', '203.0.113.5', 80, '192.168.1.50', 44444, {
        direction: 'inbound',
        tcpFlags: { syn: true, ack: true },
        bytes: 64,
      });
      expect(res.allowed).toBe(true);
      expect(res.reason).toContain('stateful return traffic');
      expect(res.entry?.state).toBe('SYN_RECV');
      expect(res.entry?.bytesIn).toBe(64);
      expect(res.entry?.packetsIn).toBe(1);
    });

    it('re-opens terminal CLOSED/TIME_WAIT session when new SYN arrives', () => {
      // Initial session closed via RST
      engine.inspectAndTrack('TCP', '10.0.0.1', 5000, '10.0.0.2', 80, { direction: 'outbound', tcpFlags: { syn: true } });
      engine.inspectAndTrack('TCP', '10.0.0.2', 80, '10.0.0.1', 5000, { direction: 'inbound', tcpFlags: { rst: true } });

      // Non-SYN packet should be dropped
      const dropped = engine.inspectAndTrack('TCP', '10.0.0.1', 5000, '10.0.0.2', 80, { direction: 'outbound', tcpFlags: { ack: true } });
      expect(dropped.allowed).toBe(false);

      // Fresh SYN re-opens session
      const reopened = engine.inspectAndTrack('TCP', '10.0.0.1', 5000, '10.0.0.2', 80, { direction: 'outbound', tcpFlags: { syn: true } });
      expect(reopened.allowed).toBe(true);
      expect(reopened.entry?.state).toBe('SYN_SENT');
    });

    it('inspectPacket validates forward packet status', () => {
      const nonExistent = engine.inspectPacket('TCP', '1.1.1.1', 1234, '2.2.2.2', 80);
      expect(nonExistent.allowed).toBe(false);
      expect(nonExistent.reason).toContain('No matching connection entry');

      engine.trackPacket('TCP', '1.1.1.1', 1234, '2.2.2.2', 80, { syn: true });
      const existent = engine.inspectPacket('TCP', '1.1.1.1', 1234, '2.2.2.2', 80);
      expect(existent.allowed).toBe(true);
      expect(existent.reason).toContain('SPI Allow');
    });
  });

  describe('UDP & ICMP Stateless Tracking, Aging and Stats', () => {
    it('tracks UDP and ICMP traffic with 300s timeout', () => {
      const udp = engine.trackPacket('UDP', '192.168.1.100', 5353, '8.8.8.8', 53, {}, 70);
      expect(udp.state).toBe('ESTABLISHED');
      expect(udp.timeoutSeconds).toBe(300);

      const icmp = engine.trackPacket('ICMP', '192.168.1.100', 0, '8.8.8.8', 0, {}, 32);
      expect(icmp.state).toBe('ESTABLISHED');
      expect(icmp.timeoutSeconds).toBe(300);

      const stats = engine.getConnectionStats();
      expect(stats['ESTABLISHED']).toBe(2);
    });

    it('ages out expired entries and purges correctly', () => {
      const entry = engine.trackPacket('TCP', '10.1.1.1', 12345, '10.1.1.2', 80, { syn: true });
      entry.timeoutSeconds = 0.001;
      entry.lastActivityMs = Date.now() - 500;

      engine.purgeExpired();
      expect(engine.getSessions()).toHaveLength(0);
    });

    it('clears all sessions on clear()', () => {
      engine.trackPacket('TCP', '10.1.1.1', 1000, '10.1.1.2', 80, { syn: true });
      engine.trackPacket('UDP', '10.1.1.1', 2000, '10.1.1.2', 53);
      expect(engine.getSessions()).toHaveLength(2);

      engine.clear();
      expect(engine.getSessions()).toHaveLength(0);
    });
  });
});
