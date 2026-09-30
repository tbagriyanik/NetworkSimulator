/**
 * statefulTcpEngine.ts — Stateful TCP 3-Way Handshake & Teardown Simulator
 *
 * Implements RFC 793 TCP state machine with full state transitions:
 * - CLOSED: Initial state, no connection
 * - LISTEN: Passive open, waiting for SYN
 * - SYN_SENT: Active open, SYN sent, waiting for SYN-ACK
 * - SYN_RECEIVED: SYN received, sent SYN-ACK, waiting for ACK
 * - ESTABLISHED: Connection established, data transfer
 * - FIN_WAIT_1: FIN sent, waiting for ACK
 * - FIN_WAIT_2: ACK received for FIN, waiting for remote FIN
 * - CLOSING: FIN sent and received, waiting for ACK
 * - TIME_WAIT: Both sides closed, waiting for 2MSL timeout
 * - CLOSE_WAIT: Remote FIN received, waiting for application to close
 * - LAST_ACK: Application closed, sent FIN, waiting for final ACK
 */

export type TcpState =
  | 'CLOSED'
  | 'LISTEN'
  | 'SYN_SENT'
  | 'SYN_RECEIVED'
  | 'ESTABLISHED'
  | 'FIN_WAIT_1'
  | 'FIN_WAIT_2'
  | 'CLOSING'
  | 'TIME_WAIT'
  | 'CLOSE_WAIT'
  | 'LAST_ACK';

export interface TcpSegment {
  step: number;
  sourceIp: string;
  targetIp: string;
  sourcePort: number;
  targetPort: number;
  flags: string[];
  seqNumber: number;
  ackNumber: number;
  windowSize: number;
  info: string;
  protocol: string;
  state?: TcpState; // Current TCP state after this segment
}

export interface TcpConnection {
  id: string;
  localIp: string;
  localPort: number;
  remoteIp: string;
  remotePort: number;
  state: TcpState;
  sendSequence: number;
  receiveSequence: number;
  sendUnacknowledged: number;
  receiveWindow: number;
  createdAt: number;
  lastActivity: number;
}

/**
 * TCP State Machine Implementation
 * Based on RFC 793 TCP state transition diagram
 */
export class TcpStateMachine {
  private connections: Map<string, TcpConnection> = new Map();

  private buildConnectionKey(localIp: string, localPort: number, remoteIp: string, remotePort: number): string {
    return `${localIp}:${localPort}-${remoteIp}:${remotePort}`;
  }

  /**
   * Process incoming TCP segment and update state
   */
  processSegment(
    localIp: string,
    localPort: number,
    remoteIp: string,
    remotePort: number,
    flags: { syn?: boolean; ack?: boolean; fin?: boolean; rst?: boolean },
    seqNumber?: number,
    ackNumber?: number
  ): TcpConnection {
    const key = this.buildConnectionKey(localIp, localPort, remoteIp, remotePort);
    let connection = this.connections.get(key);

    if (!connection) {
      // New connection
      if (flags.syn && !flags.ack) {
        // Active open (CLOSED -> SYN_SENT)
        connection = this.createNewConnection(localIp, localPort, remoteIp, remotePort, 'SYN_SENT');
        connection.sendSequence = seqNumber || 1000;
      } else if (flags.syn && flags.ack) {
        // SYN-ACK received - this should only happen after SYN_SENT
        // For simplicity, we'll treat this as SYN_RECEIVED state
        connection = this.createNewConnection(localIp, localPort, remoteIp, remotePort, 'SYN_RECEIVED');
        connection.receiveSequence = (ackNumber || 0) - 1;
      } else {
        // No valid state transition
        connection = this.createNewConnection(localIp, localPort, remoteIp, remotePort, 'CLOSED');
      }
      this.connections.set(key, connection);
    }

    // Update state based on flags and current state
    connection.state = this.transitionState(connection.state, flags);
    connection.lastActivity = Date.now();

    // Update sequence numbers
    if (seqNumber !== undefined) {
      connection.receiveSequence = seqNumber;
    }
    if (ackNumber !== undefined) {
      connection.sendUnacknowledged = ackNumber;
    }

    // Handle RST - immediate transition to CLOSED
    if (flags.rst) {
      connection.state = 'CLOSED';
    }

    return connection;
  }

  /**
   * State transition logic based on RFC 793
   */
  private transitionState(currentState: TcpState, flags: { syn?: boolean; ack?: boolean; fin?: boolean; rst?: boolean }): TcpState {
    const { syn, ack, fin, rst } = flags;

    // RST always transitions to CLOSED
    if (rst) {
      return 'CLOSED';
    }

    switch (currentState) {
      case 'CLOSED':
        if (syn && !ack) {
          return 'SYN_SENT'; // Active open
        }
        return 'CLOSED';

      case 'LISTEN':
        if (syn && !ack) {
          return 'SYN_RECEIVED'; // Passive open received SYN
        }
        return 'LISTEN';

      case 'SYN_SENT':
        if (syn && ack) {
          return 'ESTABLISHED'; // Received SYN-ACK
        } else if (syn && !ack) {
          return 'SYN_RECEIVED'; // Simultaneous open
        }
        return 'SYN_SENT';

      case 'SYN_RECEIVED':
        if (ack && !syn && !fin) {
          return 'ESTABLISHED'; // Received ACK for SYN-ACK
        }
        return 'SYN_RECEIVED';

      case 'ESTABLISHED':
        if (fin) {
          return 'CLOSE_WAIT'; // Remote close initiated
        }
        return 'ESTABLISHED';

      case 'FIN_WAIT_1':
        if (ack && !fin) {
          return 'FIN_WAIT_2'; // ACK for our FIN
        } else if (fin && ack) {
          return 'TIME_WAIT'; // Simultaneous close
        } else if (fin && !ack) {
          return 'CLOSING'; // Remote FIN before our ACK
        }
        return 'FIN_WAIT_1';

      case 'FIN_WAIT_2':
        if (fin) {
          return 'TIME_WAIT'; // Remote FIN received
        }
        return 'FIN_WAIT_2';

      case 'CLOSING':
        if (ack) {
          return 'TIME_WAIT'; // ACK for our FIN
        }
        return 'CLOSING';

      case 'TIME_WAIT':
        // After 2MSL timeout, transitions to CLOSED
        return 'TIME_WAIT';

      case 'CLOSE_WAIT':
        if (fin) {
          return 'LAST_ACK'; // Application close
        }
        return 'CLOSE_WAIT';

      case 'LAST_ACK':
        if (ack) {
          return 'CLOSED'; // Final ACK received
        }
        return 'LAST_ACK';

      default:
        return currentState;
    }
  }

  /**
   * Create a new TCP connection
   */
  private createNewConnection(
    localIp: string,
    localPort: number,
    remoteIp: string,
    remotePort: number,
    initialState: TcpState
  ): TcpConnection {
    return {
      id: `tcp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      localIp,
      localPort,
      remoteIp,
      remotePort,
      state: initialState,
      sendSequence: 1000,
      receiveSequence: 0,
      sendUnacknowledged: 0,
      receiveWindow: 65535,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
  }

  /**
   * Get connection by key
   */
  getConnection(localIp: string, localPort: number, remoteIp: string, remotePort: number): TcpConnection | undefined {
    const key = this.buildConnectionKey(localIp, localPort, remoteIp, remotePort);
    return this.connections.get(key);
  }

  /**
   * Get all connections
   */
  getAllConnections(): TcpConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Close connection
   */
  closeConnection(localIp: string, localPort: number, remoteIp: string, remotePort: number): boolean {
    const key = this.buildConnectionKey(localIp, localPort, remoteIp, remotePort);
    return this.connections.delete(key);
  }

  /**
   * Clear all connections
   */
  clear(): void {
    this.connections.clear();
  }
}

export function generateTcpHandshakeSequence(
  sourceIp: string,
  targetIp: string,
  targetPort: number = 80,
  protocolName: string = 'TCP'
): TcpSegment[] {
  const clientPort = 54320 + Math.floor(Math.random() * 1000);
  const clientInitialSeq = 1000;
  const serverInitialSeq = 5000;

  return [
    {
      step: 1,
      sourceIp,
      targetIp,
      sourcePort: clientPort,
      targetPort,
      flags: ['SYN'],
      seqNumber: clientInitialSeq,
      ackNumber: 0,
      windowSize: 64240,
      info: `[SYN] Seq=${clientInitialSeq} Win=64240 Len=0 MSS=1460`,
      protocol: 'TCP',
      state: 'SYN_SENT',
    },
    {
      step: 2,
      sourceIp: targetIp,
      targetIp: sourceIp,
      sourcePort: targetPort,
      targetPort: clientPort,
      flags: ['SYN', 'ACK'],
      seqNumber: serverInitialSeq,
      ackNumber: clientInitialSeq + 1,
      windowSize: 65535,
      info: `[SYN, ACK] Seq=${serverInitialSeq} Ack=${clientInitialSeq + 1} Win=65535`,
      protocol: 'TCP',
      state: 'SYN_RECEIVED',
    },
    {
      step: 3,
      sourceIp,
      targetIp,
      sourcePort: clientPort,
      targetPort,
      flags: ['ACK'],
      seqNumber: clientInitialSeq + 1,
      ackNumber: serverInitialSeq + 1,
      windowSize: 64240,
      info: `[ACK] Seq=${clientInitialSeq + 1} Ack=${serverInitialSeq + 1} Win=64240 (Connection Established)`,
      protocol: 'TCP',
      state: 'ESTABLISHED',
    },
    {
      step: 4,
      sourceIp,
      targetIp,
      sourcePort: clientPort,
      targetPort,
      flags: ['PSH', 'ACK'],
      seqNumber: clientInitialSeq + 1,
      ackNumber: serverInitialSeq + 1,
      windowSize: 64240,
      info: `[PSH, ACK] Data Payload Transfer (${protocolName})`,
      protocol: protocolName,
      state: 'ESTABLISHED',
    },
    {
      step: 5,
      sourceIp,
      targetIp,
      sourcePort: clientPort,
      targetPort,
      flags: ['FIN', 'ACK'],
      seqNumber: clientInitialSeq + 250,
      ackNumber: serverInitialSeq + 1,
      windowSize: 64240,
      info: `[FIN, ACK] Client initiate graceful teardown`,
      protocol: 'TCP',
      state: 'FIN_WAIT_1',
    },
    {
      step: 6,
      sourceIp: targetIp,
      targetIp: sourceIp,
      sourcePort: targetPort,
      targetPort: clientPort,
      flags: ['ACK'],
      seqNumber: serverInitialSeq + 1,
      ackNumber: clientInitialSeq + 251,
      windowSize: 65535,
      info: `[ACK] Server acknowledges client FIN`,
      protocol: 'TCP',
      state: 'FIN_WAIT_2',
    },
    {
      step: 7,
      sourceIp: targetIp,
      targetIp: sourceIp,
      sourcePort: targetPort,
      targetPort: clientPort,
      flags: ['FIN', 'ACK'],
      seqNumber: serverInitialSeq + 1,
      ackNumber: clientInitialSeq + 251,
      windowSize: 65535,
      info: `[FIN, ACK] Server initiates close`,
      protocol: 'TCP',
      state: 'TIME_WAIT',
    },
    {
      step: 8,
      sourceIp,
      targetIp,
      sourcePort: clientPort,
      targetPort,
      flags: ['ACK'],
      seqNumber: clientInitialSeq + 251,
      ackNumber: serverInitialSeq + 2,
      windowSize: 64240,
      info: `[ACK] Client acknowledges server FIN (CLOSED)`,
      protocol: 'TCP',
      state: 'CLOSED',
    },
  ];
}
