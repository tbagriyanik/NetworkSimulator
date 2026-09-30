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

/** Parsed TCP header flags used by the state machine. */
export interface TcpFlagSet {
  syn?: boolean;
  ack?: boolean;
  fin?: boolean;
  rst?: boolean;
}

/** Trust direction of a frame entering a firewall, derived from its ingress port. */
export type IngressDirection = 'inbound' | 'outbound' | 'unknown';

/**
 * Parse a textual TCP flag description (e.g. 'SYN', 'SYN-ACK', 'PSH, ACK', 'KEEPALIVE')
 * into individual boolean flags. Unknown tokens are ignored; an empty/missing
 * input yields an empty flag set (no flags asserted).
 */
export function parseTcpFlags(raw?: string): TcpFlagSet {
  if (!raw) return {};
  const flags: TcpFlagSet = {};
  for (const token of raw.toUpperCase().split(/[\s,+/|]+/).filter(Boolean)) {
    if (token === 'KEEPALIVE') {
      flags.ack = true;
      continue;
    }
    if (token.includes('SYN')) flags.syn = true;
    if (token.includes('ACK')) flags.ack = true;
    if (token.includes('FIN')) flags.fin = true;
    if (token.includes('RST')) flags.rst = true;
  }
  return flags;
}

/**
 * Derive the direction of traffic arriving on a firewall interface.
 *  - ingress on 'outside'/security-level 0 → inbound (untrusted)
 *  - ingress on 'inside'/security-level > 0 → outbound (trusted)
 *  - no firewall interface profile configured → unknown (permissive)
 */
export function resolveIngressDirection(port?: {
  nameif?: string;
  securityLevel?: number;
  natSide?: 'inside' | 'outside';
}): IngressDirection {
  if (!port) return 'unknown';
  const nameif = port.nameif?.toLowerCase();
  if (nameif === 'outside') return 'inbound';
  if (nameif === 'inside') return 'outbound';
  if (port.securityLevel !== undefined) return port.securityLevel > 0 ? 'outbound' : 'inbound';
  if (port.natSide) return port.natSide === 'outside' ? 'inbound' : 'outbound';
  return 'unknown';
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
   * Stateful firewall decision for a single packet:
   *  1. Existing forward session  → advance TCP state machine, allow.
   *  2. Existing reverse session  → return traffic, advance counters, allow.
   *  3. No session at all:
   *     - ingress on an untrusted (inbound) interface → drop unsolicited traffic.
   *     - otherwise → create the session (outbound/unknown initiation) and allow.
   *
   * This is what lets the very first outbound TCP SYN open a session instead of
   * being dropped by a "no matching connection entry" lookup.
   */
  inspectAndTrack(
    protocol: 'TCP' | 'UDP' | 'ICMP',
    srcIp: string,
    srcPort: number,
    dstIp: string,
    dstPort: number,
    options: { tcpFlags?: TcpFlagSet; direction?: IngressDirection; bytes?: number } = {}
  ): InspectionResult {
    this.ageOutEntries();

    const flags = options.tcpFlags ?? {};
    const direction = options.direction ?? 'unknown';
    const bytes = options.bytes ?? 0;
    const flow = `${srcIp}:${srcPort} -> ${dstIp}:${dstPort}`;

    const forward = this.table.get(this.buildKey(protocol, srcIp, srcPort, dstIp, dstPort));
    if (forward) {
      if (this.isTerminal(forward)) {
        // A fresh SYN re-opens a closed/timed-out flow instead of being refused.
        if (protocol === 'TCP' && flags.syn && !flags.ack) {
          const entry = this.trackPacket(protocol, srcIp, srcPort, dstIp, dstPort, flags, bytes);
          return { allowed: true, reason: `SPI Allow: new SYN re-opened session ${entry.id} (${flow})`, entry };
        }
        return {
          allowed: false,
          reason: `SPI Drop: connection is in ${forward.state} state (${flow})`
        };
      }
      const entry = this.trackPacket(protocol, srcIp, srcPort, dstIp, dstPort, flags, bytes);
      return { allowed: true, reason: `SPI Allow: matched existing ${entry.state} session ${entry.id} (${flow})`, entry };
    }

    const reverseEntry = this.table.get(this.buildKey(protocol, dstIp, dstPort, srcIp, srcPort));
    if (reverseEntry) {
      if (this.isTerminal(reverseEntry)) {
        return {
          allowed: false,
          reason: `SPI Drop: return traffic for ${reverseEntry.state} session (${flow})`
        };
      }
      const entry = this.trackReturnTraffic(protocol, srcIp, srcPort, dstIp, dstPort, flags, bytes);
      if (!entry) {
        return { allowed: false, reason: `SPI Drop: no matching stateful entry for return traffic (${flow})` };
      }
      return { allowed: true, reason: `SPI Allow: stateful return traffic of session ${entry.id} (${flow})`, entry };
    }

    if (direction === 'inbound') {
      return {
        allowed: false,
        reason: `SPI Drop: unsolicited inbound packet on untrusted interface, no session exists (${flow})`
      };
    }

    const entry = this.trackPacket(protocol, srcIp, srcPort, dstIp, dstPort, flags, bytes);
    return {
      allowed: true,
      reason: `SPI Allow: new ${protocol} session ${entry.id} created in ${entry.state} state (${flow})`,
      entry
    };
  }

  /** True when a session can no longer carry traffic (RST'd or timed out of FIN). */
  private isTerminal(entry: ConntrackEntry): boolean {
    return entry.state === 'CLOSED' || entry.state === 'TIME_WAIT';
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

