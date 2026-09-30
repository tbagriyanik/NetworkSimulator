export interface ConntrackEntry {
  id: string;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  state: 'ESTABLISHED' | 'SYN_SENT' | 'SYN_RECV' | 'FIN_WAIT' | 'TIMED_WAIT';
  timeoutSeconds: number;
  createdAtMs: number;
}

export interface InspectionResult {
  allowed: boolean;
  reason: string;
  entry?: ConntrackEntry;
}

/**
 * Stateful Firewall Connection Tracking (ConnTrack) Motoru
 */
export class ConntrackEngine {
  private table: Map<string, ConntrackEntry> = new Map();

  private buildKey(protocol: string, srcIp: string, srcPort: number, dstIp: string, dstPort: number): string {
    return `${protocol}:${srcIp}:${srcPort}->${dstIp}:${dstPort}`;
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
    tcpFlags: { syn?: boolean; ack?: boolean; fin?: boolean; rst?: boolean } = {}
  ): ConntrackEntry {
    const key = this.buildKey(protocol, srcIp, srcPort, dstIp, dstPort);
    let entry = this.table.get(key);

    let state: ConntrackEntry['state'] = 'ESTABLISHED';

    if (protocol === 'TCP') {
      if (tcpFlags.syn && !tcpFlags.ack) {
        state = 'SYN_SENT';
      } else if (tcpFlags.syn && tcpFlags.ack) {
        state = 'SYN_RECV';
      } else if (tcpFlags.fin) {
        state = 'FIN_WAIT';
      } else {
        state = 'ESTABLISHED';
      }
    }

    if (!entry) {
      entry = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        protocol,
        srcIp,
        srcPort,
        dstIp,
        dstPort,
        state,
        timeoutSeconds: protocol === 'TCP' ? 86400 : 300,
        createdAtMs: Date.now()
      };
      this.table.set(key, entry);
    } else {
      entry.state = state;
    }

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
    return Array.from(this.table.values());
  }

  /**
   * Tabloyu temizler
   */
  clear(): void {
    this.table.clear();
  }
}
