import type { NetworkPacketFrame } from './forwarding/packetFrame';

import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { simulatePacketFlow } from './forwarding/packetPipeline';
import type { PacketSimulationResult } from './forwarding/packetPipelineTypes';

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
  // Packet forwarding integration
  generatedPackets: NetworkPacketFrame[];
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
   * Generate a packet frame for traffic simulation
   */
  private generatePacketFrame(
    session: TrafficSession,
    packetIndex: number,
    srcIp: string,
    dstIp: string,
    srcPort: number,
    dstPort: number
  ): NetworkPacketFrame {
    const protocolType = session.protocol === 'UDP_FLOW' ? 'UDP' : 'TCP';
    const timestamp = Date.now();

    return {
      id: `pkt-${session.id}-${packetIndex}`,
      protocol: protocolType,
      timestamp,
      ingressDeviceId: session.sourceDeviceId,
      egressDeviceId: session.targetDeviceId,
      srcMac: this.generateMacAddress(session.sourceDeviceId),
      dstMac: this.generateMacAddress(session.targetDeviceId),
      etherType: '0x0800',
      srcIp,
      dstIp,
      srcPort,
      dstPort,
      length: session.packetSizeByte,
      info: `${session.protocol} traffic packet ${packetIndex} (${session.rateMbps} Mbps)`,
      tcpFlags: protocolType === 'TCP' ? 'ACK' : undefined
    };
  }

  /**
   * Generate a MAC address based on device ID
   */
  private generateMacAddress(deviceId: string): string {
    // Simple deterministic MAC generation for simulation
    const hash = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const macPart = (hash % 0xFFFFFF).toString(16).padStart(6, '0');
    return `00:1A:${macPart.substring(0, 2)}:${macPart.substring(2, 4)}:${macPart.substring(4, 6)}`;
  }

  /**
   * Get IP addresses for devices (simplified for simulation)
   */
  private getDeviceIp(deviceId: string): string {
    // Simplified IP assignment based on device ID
    const hash = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const lastOctet = (hash % 254) + 1;
    return `192.168.1.${lastOctet}`;
  }

  /**
   * Get port based on protocol
   */
  private getProtocolPort(protocol: string, isSource: boolean): number {
    const ports: Record<string, { src: number; dst: number }> = {
      HTTP: { src: 49152, dst: 80 },
      VoIP: { src: 49153, dst: 5060 },
      FTP: { src: 49154, dst: 21 },
      UDP_FLOW: { src: 49155, dst: 12345 }
    };
    const portInfo = ports[protocol] || ports.HTTP;
    return isSource ? portInfo.src : portInfo.dst;
  }

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
      bytesTransferred: 0,
      generatedPackets: []
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
   * ve gerçek packet frame'leri oluşturur
   */
  tick(elapsedSeconds: number): NetworkPacketFrame[] {
    const generatedPackets: NetworkPacketFrame[] = [];

    this.sessions.forEach(session => {
      if (!session.active) return;
      const bytesPerSecond = (session.rateMbps * 1_000_000) / 8;
      const bytesAdded = bytesPerSecond * elapsedSeconds;
      const packetsAdded = Math.floor(bytesAdded / session.packetSizeByte);

      session.bytesTransferred += bytesAdded;
      session.packetsSent += packetsAdded;

      // Generate actual packet frames for forwarding pipeline
      const srcIp = this.getDeviceIp(session.sourceDeviceId);
      const dstIp = this.getDeviceIp(session.targetDeviceId);
      const srcPort = this.getProtocolPort(session.protocol, true);
      const dstPort = this.getProtocolPort(session.protocol, false);

      for (let i = 0; i < packetsAdded; i++) {
        const packetIndex = session.packetsSent - packetsAdded + i + 1;
        const packetFrame = this.generatePacketFrame(
          session,
          packetIndex,
          srcIp,
          dstIp,
          srcPort,
          dstPort
        );
        session.generatedPackets.push(packetFrame);
        generatedPackets.push(packetFrame);
      }
    });

    return generatedPackets;
  }

  /**
   * Execute a tick and immediately forward generated packets through the pipeline.
   */
  tickAndForward(
    elapsedSeconds: number,
    devices: CanvasDevice[],
    connections: CanvasConnection[],
    deviceStates: Map<string, SwitchState>
  ): PacketSimulationResult[] {
    // Generate packets for this tick
    this.tick(elapsedSeconds);
    // Forward all generated packets
    const results = this.runGeneratedPacketsThroughPipeline(devices, connections, deviceStates);
    // Clear packets to avoid re‑processing on subsequent ticks
    this.clear();
    return results;
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
   * Get generated packets for a specific session
   */
  getSessionPackets(sessionId: string): NetworkPacketFrame[] {
    const session = this.sessions.get(sessionId);
    return session?.generatedPackets || [];
  }

  /**
   * Get all generated packets across all active sessions
   */
  getAllGeneratedPackets(): NetworkPacketFrame[] {
    const allPackets: NetworkPacketFrame[] = [];
    this.sessions.forEach(session => {
      if (session.active) {
        allPackets.push(...session.generatedPackets);
      }
    });
    return allPackets;
  }

  /**
   * Clear generated packets for a session (to manage memory)
   */
  clearSessionPackets(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.generatedPackets = [];
    }
  }

  /**
   * Tüm seansları temizler
   */
  clear(): void {
    this.sessions.clear();
  }
  /**
   * Run all generated packets through the forwarding pipeline.
   * Returns an array of simulation results for each packet.
   */
  runGeneratedPacketsThroughPipeline(
    devices: CanvasDevice[],
    connections: CanvasConnection[],
    deviceStates: Map<string, SwitchState>
  ): PacketSimulationResult[] {
    const results: PacketSimulationResult[] = [];
    const packets = this.getAllGeneratedPackets();
    for (const pkt of packets) {
      const srcId = pkt.ingressDeviceId;
      // buildPacket() always populates ingressDeviceId from the session's required
      // sourceDeviceId, so this is unreachable for frames made here. The field is
      // optional on the shared NetworkPacketFrame type (other producers omit it),
      // and a frame without an ingress device has no upstream to forward from.
      if (!srcId) continue;
      const simResult = simulatePacketFlow(srcId, '', pkt, devices, connections, deviceStates);
      results.push(simResult);
    }
    return results;
  }
}


export const globalTrafficGenerator = new TrafficGeneratorEngine();
