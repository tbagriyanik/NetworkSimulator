import { describe, it, expect, beforeEach } from 'vitest';
import { ConntrackEngine } from '../../../lib/network/conntrackEngine';

describe('ConntrackEngine', () => {
  let engine: ConntrackEngine;

  beforeEach(() => {
    engine = new ConntrackEngine();
  });

  it('tracks outbound TCP SYN and permits stateful return traffic', () => {
    // Outbound SYN: 192.168.1.10:49152 -> 8.8.8.8:80
    const entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
    expect(entry.state).toBe('SYN_SENT');

    // Return traffic: 8.8.8.8:80 -> 192.168.1.10:49152
    const res = engine.inspectReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152);
    expect(res.allowed).toBe(true);
    expect(res.reason).toContain('SPI Allow');
  });

  it('drops unsolicited inbound traffic with no stateful entry', () => {
    const res = engine.inspectReturnTraffic('TCP', '1.2.3.4', 443, '192.168.1.10', 50000);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('SPI Drop');
  });

  it('implements TCP 3-way handshake state transitions', () => {
    // SYN
    let entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
    expect(entry.state).toBe('SYN_SENT');

    // SYN-ACK (return traffic)
    const returnEntry1 = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { syn: true, ack: true });
    expect(returnEntry1).not.toBeNull();
    entry = returnEntry1!;
    expect(entry.state).toBe('SYN_RECV');

    // ACK (completing handshake)
    entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { ack: true });
    expect(entry.state).toBe('ESTABLISHED');
  });

  it('handles RST flag by transitioning to CLOSED state', () => {
    // Establish connection first
    let entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
    const returnEntry1 = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { syn: true, ack: true });
    expect(returnEntry1).not.toBeNull();
    entry = returnEntry1!;
    entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { ack: true });
    expect(entry.state).toBe('ESTABLISHED');

    // RST received
    const returnEntry2 = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { rst: true });
    expect(returnEntry2).not.toBeNull();
    entry = returnEntry2!;
    expect(entry.state).toBe('CLOSED');

    // Return traffic should be dropped after RST
    const res = engine.inspectReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152);
    expect(res.allowed).toBe(false);
  });

  it('handles FIN-based connection teardown', () => {
    // Establish connection
    let entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
    const returnEntry1 = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { syn: true, ack: true });
    expect(returnEntry1).not.toBeNull();
    entry = returnEntry1!;
    entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { ack: true });
    expect(entry.state).toBe('ESTABLISHED');

    // FIN from client
    entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { fin: true });
    expect(entry.state).toBe('FIN_WAIT_1');

    // ACK from server
    const returnEntry2 = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { ack: true });
    expect(returnEntry2).not.toBeNull();
    entry = returnEntry2!;
    expect(entry.state).toBe('FIN_WAIT_2');

    // FIN from server
    const returnEntry3 = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { fin: true, ack: true });
    expect(returnEntry3).not.toBeNull();
    entry = returnEntry3!;
    expect(entry.state).toBe('TIME_WAIT');
  });

  it('tracks byte and packet counters', () => {
    const entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true }, 100);
    expect(entry.bytesOut).toBe(100);
    expect(entry.packetsOut).toBe(1);
    expect(entry.bytesIn).toBe(0);
    expect(entry.packetsIn).toBe(0);

    const returnEntry = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { syn: true, ack: true }, 50);
    expect(returnEntry).not.toBeNull();
    expect(returnEntry!.bytesIn).toBe(50);
    expect(returnEntry!.packetsIn).toBe(1);
  });

  it('sets appropriate timeouts based on protocol and state', () => {
    // SYN_SENT should have 60 second timeout
    let entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
    expect(entry.timeoutSeconds).toBe(60);

    // Complete handshake to reach ESTABLISHED
    const returnEntry1 = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { syn: true, ack: true });
    expect(returnEntry1).not.toBeNull();
    entry = returnEntry1!;
    entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { ack: true });
    expect(entry.state).toBe('ESTABLISHED');
    expect(entry.timeoutSeconds).toBe(86400);

    // UDP should have 5 minute timeout
    entry = engine.trackPacket('UDP', '192.168.1.10', 49154, '8.8.8.8', 53);
    expect(entry.timeoutSeconds).toBe(300);
  });

  it('drops return traffic for CLOSED or TIME_WAIT connections', () => {
    // Establish and then RST connection
    let entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
    const returnEntry = engine.trackReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152, { rst: true });
    expect(returnEntry).not.toBeNull();
    entry = returnEntry!;
    expect(entry.state).toBe('CLOSED');

    const res = engine.inspectReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('CLOSED');
  });

  it('provides connection statistics by state', () => {
    engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
    engine.trackPacket('TCP', '192.168.1.10', 49153, '8.8.8.8', 443, { syn: true });
    engine.trackPacket('UDP', '192.168.1.10', 49154, '8.8.8.8', 53);

    const stats = engine.getConnectionStats();
    expect(stats['SYN_SENT']).toBe(2);
    expect(stats['ESTABLISHED']).toBe(1);
  });

  it('ages out expired entries', () => {
    // Create an entry with a very short timeout
    const entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
    entry.timeoutSeconds = 0.001; // 1ms
    entry.lastActivityMs = Date.now() - 100; // 100ms ago

    // Force aging by calling getSessions which triggers ageOutEntries
    const sessions = engine.getSessions();
    expect(sessions.length).toBe(0);
  });

  it('updates lastActivity timestamp on packet tracking', () => {
    const entry1 = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
    expect(entry1.lastActivityMs).toBeGreaterThan(0);

    const entry2 = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { ack: true });
    expect(entry2.lastActivityMs).toBeGreaterThan(0);
  });
});
