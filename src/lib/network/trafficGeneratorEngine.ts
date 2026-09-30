export interface TrafficSession {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  protocol: 'HTTP' | 'VoIP' | 'FTP' | 'UDP_FLOW';
  rateMbps: number;
  packetSizeByte: number;
  active: boolean;
  startTimeMs: number;
  packetsSent: number;
  bytesTransferred: number;
}

export interface LinkTelemetry {
  connectionId: string;
  utilizationPercent: number; // 0 - 100%
  currentMbps: number;
  maxMbps: number;
  latencyMs: number;
  status: 'NORMAL' | 'HEAVY' | 'CONGESTED';
}

export class TrafficGeneratorEngine {
  private sessions: Map<string, TrafficSession> = new Map();

  /**
   * Yeni bir trafik simülasyon seansı başlatır
   */
  startSession(
    sourceDeviceId: string,
    targetDeviceId: string,
    protocol: 'HTTP' | 'VoIP' | 'FTP' | 'UDP_FLOW' = 'HTTP',
    rateMbps: number = 10,
    packetSizeByte: number = 1500
  ): TrafficSession {
    const id = `traffic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const session: TrafficSession = {
      id,
      sourceDeviceId,
      targetDeviceId,
      protocol,
      rateMbps,
      packetSizeByte,
      active: true,
      startTimeMs: Date.now(),
      packetsSent: 0,
      bytesTransferred: 0
    };
    this.sessions.set(id, session);
    return session;
  }

  /**
   * Aktif seansı durdurur
   */
  stopSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.active = false;
    return true;
  }

  /**
   * Aktif tüm seansları listeler
   */
  getActiveSessions(): TrafficSession[] {
    return Array.from(this.sessions.values()).filter(s => s.active);
  }

  /**
   * Zamana bağlı olarak paket ve bayt istatistiklerini günceller
   */
  tick(elapsedSeconds: number): void {
    this.sessions.forEach(session => {
      if (!session.active) return;
      const bytesPerSecond = (session.rateMbps * 1_000_000) / 8;
      const bytesAdded = bytesPerSecond * elapsedSeconds;
      const packetsAdded = Math.floor(bytesAdded / session.packetSizeByte);

      session.bytesTransferred += bytesAdded;
      session.packetsSent += packetsAdded;
    });
  }

  /**
   * Belirtilen hattın bant genişliği doluluk oranını (% Utilization) ve durumunu hesaplar
   */
  calculateLinkTelemetry(
    connectionId: string,
    activeSessionsOnLink: TrafficSession[],
    linkCapacityMbps: number = 100
  ): LinkTelemetry {
    const totalMbps = activeSessionsOnLink
      .filter(s => s.active)
      .reduce((sum, s) => sum + s.rateMbps, 0);

    const utilizationPercent = Math.min(100, Math.round((totalMbps / linkCapacityMbps) * 100));
    
    let status: 'NORMAL' | 'HEAVY' | 'CONGESTED' = 'NORMAL';
    let baseLatency = 2; // ms

    if (utilizationPercent > 85) {
      status = 'CONGESTED';
      baseLatency += Math.round((utilizationPercent - 85) * 1.5);
    } else if (utilizationPercent > 50) {
      status = 'HEAVY';
      baseLatency += Math.round((utilizationPercent - 50) * 0.3);
    }

    return {
      connectionId,
      utilizationPercent,
      currentMbps: totalMbps,
      maxMbps: linkCapacityMbps,
      latencyMs: baseLatency,
      status
    };
  }

  /**
   * Tüm seansları temizler
   */
  clear(): void {
    this.sessions.clear();
  }
}

export const globalTrafficGenerator = new TrafficGeneratorEngine();
