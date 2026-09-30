export interface ConntrackEntry {
  id: string;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  state: 'NEW' | 'ESTABLISHED' | 'SYN_SENT' | 'SYN_RECV' | 'FIN_WAIT_1' | 'FIN_WAIT_2' | 'TIME_WAIT' | 'CLOSED';
  timeoutSeconds: number;
  createdAtMs: number;
  lastActivityMs: number;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
}

export interface InspectionResult {
  allowed: boolean;
  reason: string;
  entry?: ConntrackEntry;
}

/**
 * Stateful Firewall Connection Tracking (ConnTrack) Motoru
 * Implements full TCP state machine with timeout aging, RST/FIN handling
 */
export class ConntrackEngine {
  private table: Map<string, ConntrackEntry> = new Map();

  private buildKey(protocol: string, srcIp: string, srcPort: number, dstIp: string, dstPort: number): string {
    return `${protocol}:${srcIp}:${srcPort}->${dstIp}:${dstPort}`;
  }

  /**
   * TCP State Machine Transitions
   * Based on RFC 793 TCP state transitions
   */
  private transitionTcpState(
    currentState: ConntrackEntry['state'],
    tcpFlags: { syn?: boolean; ack?: boolean; fin?: boolean; rst?: boolean }
  ): ConntrackEntry['state'] {
    const { syn, ack, fin, rst } = tcpFlags;

    // RST always resets to CLOSED
    if (rst) {
      return 'CLOSED';
    }

    switch (currentState) {
      case 'NEW':
      case 'CLOSED':
        if (syn && !ack) {
          return 'SYN_SENT';
        }
        return currentState;

      case 'SYN_SENT':
        if (syn && ack) {
          return 'SYN_RECV';
        }
        return currentState;

      case 'SYN_RECV':
        if (ack && !syn && !fin) {
          return 'ESTABLISHED';
        }
        return currentState;

      case 'ESTABLISHED':
        if (fin) {
          return 'FIN_WAIT_1';
        }
        return currentState;

      case 'FIN_WAIT_1':
        if (ack && !fin) {
          return 'FIN_WAIT_2';
        } else if (fin && ack) {
          return 'TIME_WAIT';
        }
        return currentState;

      case 'FIN_WAIT_2':
        if (fin) {
          return 'TIME_WAIT';
        }
        return currentState;

      case 'TIME_WAIT':
        // After 2MSL timeout, transitions to CLOSED
        return currentState;

      default:
        return currentState;
    }
  }

  /**
   * Get timeout based on protocol and state
   */
  private getTimeout(protocol: string, state: ConntrackEntry['state']): number {
    if (protocol === 'TCP') {
      switch (state) {
        case 'SYN_SENT':
        case 'SYN_RECV':
          return 60; // 60 seconds for handshake states
        case 'ESTABLISHED':
          return 86400; // 24 hours for established connections
        case 'FIN_WAIT_1':
        case 'FIN_WAIT_2':
          return 300; // 5 minutes for teardown states
        case 'TIME_WAIT':
          return 60; // 60 seconds for TIME_WAIT
        case 'CLOSED':
        case 'NEW':
        default:
          return 30;
      }
    }
    // UDP and ICMP have shorter timeouts
    return 300; // 5 minutes for UDP/ICMP
  }

  /**
   * Age out expired entries based on timeout
   */
  private ageOutEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.table.forEach((entry, key) => {
      const elapsedSeconds = (now - entry.lastActivityMs) / 1000;
      if (elapsedSeconds > entry.timeoutSeconds) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.table.delete(key));
  }

  /**
   * Yeni bir bağlantı takibi kaydı ekler veya günceller
   */
  trackPacket(
    protocol: 'TCP' | 'UDP' | 'ICMP',
    srcIp: string,
    srcPort: number,
    dstIp: string,
    dstPort: number,
    tcpFlags: { syn?: boolean; ack?: boolean; fin?: boolean; rst?: boolean } = {},
    bytes: number = 0
  ): ConntrackEntry {
    // Age out expired entries before processing
    this.ageOutEntries();

    const key = this.buildKey(protocol, srcIp, srcPort, dstIp, dstPort);
    let entry = this.table.get(key);

    let state: ConntrackEntry['state'] = 'NEW';

    if (protocol === 'TCP') {
      if (entry) {
        state = this.transitionTcpState(entry.state, tcpFlags);
      } else {
        // New connection
        if (tcpFlags.syn && !tcpFlags.ack) {
          state = 'SYN_SENT';
        } else {
          state = 'NEW';
        }
      }
    } else {
      // UDP and ICMP are stateless but tracked
      state = 'ESTABLISHED';
    }

    const now = Date.now();
    const timeout = this.getTimeout(protocol, state);

    if (!entry) {
      entry = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        protocol,
        srcIp,
        srcPort,
        dstIp,
        dstPort,
        state,
        timeoutSeconds: timeout,
        createdAtMs: now,
        lastActivityMs: now,
        bytesIn: 0,
        bytesOut: bytes,
        packetsIn: 0,
        packetsOut: 1
      };
      this.table.set(key, entry);
    } else {
      entry.state = state;
      entry.lastActivityMs = now;
      entry.timeoutSeconds = timeout;
      entry.bytesOut += bytes;
      entry.packetsOut += 1;
    }

    return entry;
  }

  /**
   * Track return traffic (inbound packets matching existing connection)
   */
  trackReturnTraffic(
    protocol: 'TCP' | 'UDP' | 'ICMP',
    incomingSrcIp: string,
    incomingSrcPort: number,
    incomingDstIp: string,
    incomingDstPort: number,
    tcpFlags: { syn?: boolean; ack?: boolean; fin?: boolean; rst?: boolean } = {},
    bytes: number = 0
  ): ConntrackEntry | null {
    // Age out expired entries before processing
    this.ageOutEntries();

    const originalKey = this.buildKey(protocol, incomingDstIp, incomingDstPort, incomingSrcIp, incomingSrcPort);
    const entry = this.table.get(originalKey);

    if (!entry) {
      return null;
    }

    // Update state for TCP return traffic
    if (protocol === 'TCP') {
      entry.state = this.transitionTcpState(entry.state, tcpFlags);
    }

    entry.lastActivityMs = Date.now();
    entry.bytesIn += bytes;
    entry.packetsIn += 1;

    return entry;
  }

  /**
   * Gelen cevabın (Return Traffic) durumsal olarak izinli olup olmadığını doğrular
   */
  inspectReturnTraffic(
    protocol: 'TCP' | 'UDP' | 'ICMP',
    incomingSrcIp: string,
    incomingSrcPort: number,
    incomingDstIp: string,
    incomingDstPort: number
  ): InspectionResult {
    // Dönüş trafiği için kaynak ve hedef IP/Port yer değiştirmiştir
    const originalKey = this.buildKey(protocol, incomingDstIp, incomingDstPort, incomingSrcIp, incomingSrcPort);
    const entry = this.table.get(originalKey);

    if (!entry) {
      return {
        allowed: false,
        reason: `SPI Drop: No matching stateful connection entry found for return traffic ${incomingSrcIp}:${incomingSrcPort} -> ${incomingDstIp}:${incomingDstPort}`
      };
    }

    // Check if connection is in a valid state for return traffic
    if (entry.state === 'CLOSED' || entry.state === 'TIME_WAIT') {
      return {
        allowed: false,
        reason: `SPI Drop: Connection is in ${entry.state} state, return traffic not allowed`
      };
    }

    return {
      allowed: true,
      reason: `SPI Allow: Matched existing ${entry.state} session (${entry.id})`,
      entry
    };
  }

  /**
   * Aktif tüm oturumları listeler
   */
  getSessions(): ConntrackEntry[] {
    this.ageOutEntries();
    return Array.from(this.table.values());
  }

  /**
   * Get connection count by state
   */
  getConnectionStats(): Record<string, number> {
    this.ageOutEntries();
    const stats: Record<string, number> = {};
    this.table.forEach(entry => {
      stats[entry.state] = (stats[entry.state] || 0) + 1;
    });
    return stats;
  }

  /**
   * Tabloyu temizler
   */
  clear(): void {
    this.table.clear();
  }
  /**
   * Public method to purge expired entries (exposes private aging logic).
   */
  purgeExpired(): void {
    this.ageOutEntries();
  }

  /**
   * Inspect a forward packet against the connection tracking table.
   * Returns allowed status and reason similar to inspectReturnTraffic.
   */
  inspectPacket(
    protocol: 'TCP' | 'UDP' | 'ICMP',
    srcIp: string,
    srcPort: number,
    dstIp: string,
    dstPort: number
  ): InspectionResult {
    const key = this.buildKey(protocol, srcIp, srcPort, dstIp, dstPort);
    const entry = this.table.get(key);
    if (!entry) {
      return {
        allowed: false,
        reason: `SPI Drop: No matching connection entry for forward traffic ${srcIp}:${srcPort} -> ${dstIp}:${dstPort}`
      };
    }
    if (entry.state === 'CLOSED' || entry.state === 'TIME_WAIT') {
      return {
        allowed: false,
        reason: `SPI Drop: Connection is in ${entry.state} state, forward traffic not allowed`
      };
    }
    return {
      allowed: true,
      reason: `SPI Allow: Matched existing ${entry.state} session (${entry.id})`,
      entry
    };
  }
}

