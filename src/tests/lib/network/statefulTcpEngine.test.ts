import { describe, it, expect, beforeEach } from 'vitest';
import { TcpStateMachine, generateTcpHandshakeSequence } from '../../../lib/network/statefulTcpEngine';

describe('statefulTcpEngine - Dedicated RFC 793 FSM & Handshake Suite', () => {
  let fsm: TcpStateMachine;

  beforeEach(() => {
    fsm = new TcpStateMachine();
  });

  describe('TcpStateMachine Core State Transitions', () => {
    it('creates a new connection on initial SYN', () => {
      const conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { syn: true }, 1000);
      expect(conn.localIp).toBe('192.168.1.10');
      expect(conn.localPort).toBe(49152);
      expect(conn.remoteIp).toBe('192.168.1.20');
      expect(conn.remotePort).toBe(80);
      expect(['SYN_SENT', 'SYN_RECEIVED']).toContain(conn.state);
      expect(conn.sendSequence).toBe(1000);
    });

    it('creates connection in SYN_RECEIVED on passive response (SYN+ACK)', () => {
      const conn = fsm.processSegment('192.168.1.20', 80, '192.168.1.10', 49152, { syn: true, ack: true }, 5000, 1001);
      expect(conn.state).toBe('SYN_RECEIVED');
      expect(conn.receiveSequence).toBe(5000);
      expect(conn.sendUnacknowledged).toBe(1001);
    });

    it('creates connection in CLOSED on invalid initial segment (no SYN)', () => {
      const conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { ack: true }, 1000);
      expect(conn.state).toBe('CLOSED');
    });

    it('transitions to ESTABLISHED after 3-way handshake', () => {
      // Step 1: SYN
      let conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { syn: true }, 1000);
      expect(['SYN_SENT', 'SYN_RECEIVED']).toContain(conn.state);

      // Step 2: SYN-ACK (server response)
      conn = fsm.processSegment('192.168.1.20', 80, '192.168.1.10', 49152, { syn: true, ack: true }, 5000, 1001);
      expect(conn.state).toBe('SYN_RECEIVED');

      // Step 3: ACK from client
      conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { ack: true }, 1001, 5001);
      expect(conn.state).toBe('ESTABLISHED');
    });

    it('transitions immediately to CLOSED upon RST in any state', () => {
      // In SYN state
      let conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { syn: true }, 1000);
      conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { rst: true });
      expect(conn.state).toBe('CLOSED');

      // In ESTABLISHED
      conn = fsm.processSegment('10.0.0.1', 50000, '10.0.0.2', 443, { syn: true });
      conn = fsm.processSegment('10.0.0.1', 50000, '10.0.0.2', 443, { ack: true });
      expect(conn.state).toBe('ESTABLISHED');
      conn = fsm.processSegment('10.0.0.1', 50000, '10.0.0.2', 443, { rst: true });
      expect(conn.state).toBe('CLOSED');
    });

    it('handles graceful connection teardown (ESTABLISHED -> CLOSE_WAIT -> LAST_ACK -> CLOSED)', () => {
      // Establish
      let conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { syn: true }, 1000);
      conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { ack: true }, 1001, 5001);
      expect(conn.state).toBe('ESTABLISHED');

      // Remote sends FIN (passive close)
      conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { fin: true });
      expect(conn.state).toBe('CLOSE_WAIT');

      // Local sends FIN
      conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { fin: true });
      expect(conn.state).toBe('LAST_ACK');

      // Final ACK
      conn = fsm.processSegment('192.168.1.10', 49152, '192.168.1.20', 80, { ack: true });
      expect(conn.state).toBe('CLOSED');
    });

    it('handles active close teardown with simultaneous close transitions', () => {
      // Establish
      const conn = fsm.processSegment('172.16.0.1', 30000, '172.16.0.2', 8080, { syn: true });
      fsm.processSegment('172.16.0.1', 30000, '172.16.0.2', 8080, { ack: true });
      expect(conn.state).toBe('ESTABLISHED');

      // Local sends FIN -> enters FIN_WAIT_1
      conn.state = 'FIN_WAIT_1';

      // Remote sends FIN without ACK (Simultaneous close -> CLOSING)
      fsm.processSegment('172.16.0.1', 30000, '172.16.0.2', 8080, { fin: true });
      expect(conn.state).toBe('CLOSING');

      // ACK arrives -> TIME_WAIT
      fsm.processSegment('172.16.0.1', 30000, '172.16.0.2', 8080, { ack: true });
      expect(conn.state).toBe('TIME_WAIT');
    });

    it('handles FIN_WAIT_1 to TIME_WAIT on simultaneous FIN+ACK', () => {
      const conn = fsm.processSegment('172.16.0.1', 30001, '172.16.0.2', 8080, { syn: true });
      conn.state = 'FIN_WAIT_1';

      fsm.processSegment('172.16.0.1', 30001, '172.16.0.2', 8080, { fin: true, ack: true });
      expect(conn.state).toBe('TIME_WAIT');
    });

    it('handles FIN_WAIT_2 transition to TIME_WAIT on remote FIN', () => {
      const conn = fsm.processSegment('172.16.0.1', 30002, '172.16.0.2', 8080, { syn: true });
      conn.state = 'FIN_WAIT_2';

      fsm.processSegment('172.16.0.1', 30002, '172.16.0.2', 8080, { fin: true });
      expect(conn.state).toBe('TIME_WAIT');
    });
  });

  describe('Connection Table Management & Queries', () => {
    it('stores, queries, and deletes connections cleanly', () => {
      fsm.processSegment('10.0.0.1', 1111, '10.0.0.2', 2222, { syn: true });
      fsm.processSegment('10.0.0.1', 3333, '10.0.0.2', 4444, { syn: true });

      expect(fsm.getAllConnections()).toHaveLength(2);

      const found = fsm.getConnection('10.0.0.1', 1111, '10.0.0.2', 2222);
      expect(found).toBeDefined();
      expect(found?.localPort).toBe(1111);

      const notFound = fsm.getConnection('10.0.0.1', 9999, '10.0.0.2', 8888);
      expect(notFound).toBeUndefined();

      const deleted = fsm.closeConnection('10.0.0.1', 1111, '10.0.0.2', 2222);
      expect(deleted).toBe(true);
      expect(fsm.getAllConnections()).toHaveLength(1);

      fsm.clear();
      expect(fsm.getAllConnections()).toHaveLength(0);
    });

    it('updates sequence and acknowledgment numbers accurately', () => {
      const conn = fsm.processSegment('10.1.1.1', 4000, '10.1.1.2', 80, { syn: true }, 77777, 88888);
      expect(conn.receiveSequence).toBe(77777);
      expect(conn.sendUnacknowledged).toBe(88888);
      expect(conn.lastActivity).toBeGreaterThan(0);
      expect(conn.receiveWindow).toBe(65535);
    });
  });

  describe('generateTcpHandshakeSequence Generator', () => {
    it('generates full handshake sequence with custom target port and custom protocol', () => {
      const seq = generateTcpHandshakeSequence('10.20.30.40', '50.60.70.80', 443, 'HTTPS');
      expect(seq).toHaveLength(8);

      expect(seq[0].protocol).toBe('TCP');
      expect(seq[0].targetPort).toBe(443);
      expect(seq[0].state).toBe('SYN_SENT');

      expect(seq[1].flags).toContain('SYN');
      expect(seq[1].flags).toContain('ACK');
      expect(seq[1].state).toBe('SYN_RECEIVED');

      expect(seq[2].state).toBe('ESTABLISHED');
      expect(seq[3].protocol).toBe('HTTPS');
      expect(seq[3].info).toContain('HTTPS');

      expect(seq[4].state).toBe('FIN_WAIT_1');
      expect(seq[5].state).toBe('FIN_WAIT_2');
      expect(seq[6].state).toBe('TIME_WAIT');
      expect(seq[7].state).toBe('CLOSED');
    });

    it('maintains strict sequence and acknowledgment increments across steps', () => {
      const seq = generateTcpHandshakeSequence('1.1.1.1', '2.2.2.2', 80);
      // Client initial seq -> Server ACK is seq + 1
      expect(seq[1].ackNumber).toBe(seq[0].seqNumber + 1);
      // Server initial seq -> Client ACK is server seq + 1
      expect(seq[2].ackNumber).toBe(seq[1].seqNumber + 1);
      // Teardown ACK checks
      expect(seq[5].ackNumber).toBe(seq[4].seqNumber + 1);
      expect(seq[7].ackNumber).toBe(seq[6].seqNumber + 1);
    });
  });
});
