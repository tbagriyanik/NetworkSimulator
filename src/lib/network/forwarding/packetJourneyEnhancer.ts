import { PacketSimulationResult, PacketHopTrace } from './packetPipeline';
import { NetworkPacketFrame } from './packetFrame';
import { generatePduHexAndAscii, PduLayerDetail } from './pduDecoder';

export interface EnhancedJourneyHop {
  stepIndex: number;
  deviceId: string;
  deviceName?: string;
  ingressPort?: string;
  egressPort?: string;
  status: 'forwarded' | 'dropped' | 'delivered';
  dropReason?: string;
  inboundLayers: PduLayerDetail[];
  outboundLayers?: PduLayerDetail[];
  decisionLog: string[];
  hexDump: string;
  asciiDump: string;
}

export interface EnhancedPacketJourney {
  packetId: string;
  protocol: string;
  sourceIp: string;
  destinationIp: string;
  overallSuccess: boolean;
  totalHops: number;
  hops: EnhancedJourneyHop[];
  summaryMessage: string;
}

/**
 * Transforms a raw PacketTrace into a rich, detailed Packet Journey / PDU analysis.
 */
export function buildEnhancedPacketJourney(trace: PacketSimulationResult, frame: NetworkPacketFrame): EnhancedPacketJourney {
  const enhancedHops: EnhancedJourneyHop[] = [];

  trace.hops.forEach((hop: PacketHopTrace, idx: number) => {
    const isLast = idx === trace.hops.length - 1;
    const isDelivered = isLast && trace.success;
    const isDropped = isLast && !trace.success;

    const { hexDump, asciiDump } = generatePduHexAndAscii(frame);

    const inboundLayers: PduLayerDetail[] = [
      {
        layer: 1,
        name: 'Physical',
        title: 'Layer 1: Physical',
        fields: [{ label: 'Port', value: hop.portId || 'Internal' }]
      },
      {
        layer: 2,
        name: 'DataLink',
        title: 'Layer 2: Ethernet II',
        fields: [
          { label: 'Source MAC', value: frame.srcMac || '00:00:00:00:00:00' },
          { label: 'Destination MAC', value: frame.dstMac || 'FF:FF:FF:FF:FF:FF' },
          { label: 'EtherType', value: frame.protocol === 'ARP' ? '0x0806 (ARP)' : '0x0800 (IPv4)' },
          { label: 'VLAN ID', value: frame.vlanId || 1 }
        ]
      },
      {
        layer: 3,
        name: 'Network',
        title: 'Layer 3: IP Header',
        fields: [
          { label: 'Source IP', value: frame.srcIp || '0.0.0.0' },
          { label: 'Destination IP', value: frame.dstIp || '0.0.0.0' },
          { label: 'Protocol', value: frame.protocol },
          { label: 'TTL', value: frame.ttl || 64 }
        ]
      }
    ];

    if (frame.srcPort || frame.dstPort) {
      inboundLayers.push({
        layer: 4,
        name: 'Transport',
        title: `Layer 4: ${frame.protocol}`,
        fields: [
          { label: 'Source Port', value: frame.srcPort || 0 },
          { label: 'Destination Port', value: frame.dstPort || 0 }
        ]
      });
    }

    const decisionLog: string[] = [];

    // Ingest decisions from hop trace
    if (hop.details) {
      decisionLog.push(hop.details);
    }
    if (hop.vlan) {
      decisionLog.push(`VLAN Tag: ${hop.vlan}`);
    }
    if (isDropped) {
      decisionLog.push(`[DROP] Packet dropped: ${trace.dropReason || 'Unknown drop reason'}`);
    } else if (isDelivered) {
      decisionLog.push(`[SUCCESS] Packet successfully delivered to target ${frame.dstIp}`);
    } else {
      decisionLog.push(`Forwarded to next hop via ${hop.nextHopDevice || 'connected link'}`);
    }

    enhancedHops.push({
      stepIndex: idx + 1,
      deviceId: hop.deviceId,
      deviceName: hop.deviceId,
      ingressPort: hop.portId,
      egressPort: hop.nextHopDevice ? hop.portId : undefined,
      status: isDropped ? 'dropped' : (isDelivered ? 'delivered' : 'forwarded'),
      dropReason: isDropped ? trace.dropReason : undefined,
      inboundLayers,
      outboundLayers: isDropped ? undefined : inboundLayers,
      decisionLog,
      hexDump,
      asciiDump
    });
  });

  const summaryMessage = trace.success
    ? `Packet successfully traversed ${trace.hops.length} hop(s) from ${frame.srcIp} to ${frame.dstIp}.`
    : `Packet delivery failed at hop ${trace.hops.length}. Reason: ${trace.dropReason || 'Path failure'}.`;

  return {
    packetId: frame.id || 'pkt-0',
    protocol: frame.protocol,
    sourceIp: frame.srcIp ?? '0.0.0.0',
    destinationIp: frame.dstIp ?? '0.0.0.0',
    overallSuccess: trace.success,
    totalHops: trace.hops.length,
    hops: enhancedHops,
    summaryMessage
  };
}
