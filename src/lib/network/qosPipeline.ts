import type { SwitchState, Port } from './types';
import type { NetworkPacketFrame } from './forwarding/packetFrame';
import {
  evaluateWredDrop,
  policePacket,
  type WredProfile,
  type TokenBucket,
} from './qosScheduler';

export interface QosProcessingResult {
  allowed: boolean;
  markedDscp?: number;
  markedPriority?: number;
  computedDelayMs?: number;
  dropReason?: string;
  dropType?: 'none' | 'wred-probabilistic' | 'tail-drop' | 'policing-drop';
}

/**
 * Classifies packet and assigns DSCP / CoS priority markings.
 */
export function classifyAndMarkFrame(frame: NetworkPacketFrame): { dscp: number; priority: number } {
  let dscp = frame.dscp ?? 0;
  let priority = frame.priority ?? 0;

  // VoIP / Real-time Audio
  if (frame.info.toLowerCase().includes('voip') || frame.dstPort === 5060 || frame.dstPort === 5061) {
    dscp = 46; // EF (Expedited Forwarding)
    priority = 7;
  } else if (frame.protocol === 'OSPF' || frame.protocol === 'EIGRP' || frame.protocol === 'STP') {
    dscp = 48; // CS6 (Control Plane)
    priority = 6;
  } else if (frame.info.toLowerCase().includes('video')) {
    dscp = 26; // AF31 (Multimedia Streaming)
    priority = 4;
  }

  return { dscp, priority };
}

/**
 * Evaluates QoS Policing, WRED Congestion Avoidance, and LLQ / CBWFQ Scheduling for egress forwarding.
 */
export function processQosEgress(
  state: SwitchState,
  port: Port,
  frame: NetworkPacketFrame,
  nowMs: number = Date.now()
): QosProcessingResult {
  if (!state.mlsQosEnabled && !port.bandwidthLimitMbps && !port.wredProfile && !port.qosServicePolicyOut) {
    return { allowed: true };
  }

  // 1. Classification & Marking
  const { dscp, priority } = classifyAndMarkFrame(frame);

  // 2. Traffic Policing Rate Limiter
  if (port.bandwidthLimitMbps && port.bandwidthLimitMbps > 0) {
    const cirBps = port.bandwidthLimitMbps * 1_000_000;
    const burstBytes = Math.max(8000, Math.floor(cirBps / 8 / 10)); // 100ms burst
    const lastTime = (port as Port & { _qosLastTokenMs?: number })._qosLastTokenMs ?? (nowMs - 1000);
    const prevTokens = (port as Port & { _qosTokens?: number })._qosTokens ?? burstBytes;

    const bucket: TokenBucket = { tokens: prevTokens, lastUpdatedMs: lastTime };
    const polRes = policePacket(
      bucket,
      { id: frame.id, bytes: frame.length, dscp, cos: priority },
      {
        cirBps,
        burstBytes,
        conformAction: 'transmit',
        exceedAction: 'drop',
      },
      nowMs
    );

    (port as Port & { _qosLastTokenMs?: number })._qosLastTokenMs = polRes.nextBucketState.lastUpdatedMs;
    (port as Port & { _qosTokens?: number })._qosTokens = polRes.nextBucketState.tokens;

    if (polRes.actionTaken === 'drop') {
      return {
        allowed: false,
        dropReason: `Dropped by QoS Rate Limiter / Traffic Policing (${port.bandwidthLimitMbps} Mbps exceeded)`,
        dropType: 'policing-drop',
      };
    }
  }

  // 3. WRED & Tail Drop Congestion Avoidance
  const queueDepth = port.currentQueueDepth ?? 0;
  const defaultWredProfile: WredProfile = port.wredProfile || {
    dscpOrPrec: dscp,
    minThreshold: 20,
    maxThreshold: 64,
    maxDropProbability: 0.2,
  };

  if (queueDepth >= defaultWredProfile.minThreshold) {
    const wredRes = evaluateWredDrop(queueDepth, defaultWredProfile);
    if (wredRes.shouldDrop) {
      return {
        allowed: false,
        dropReason: wredRes.reason,
        dropType: wredRes.dropType,
      };
    }
  }

  // 4. LLQ / Priority Scheduling Delay Computation
  let computedDelayMs = 0;
  if (priority >= 6 || dscp === 46) {
    // LLQ Expedited Forwarding (Voice / Control Plane) -> Minimal Latency Queue
    computedDelayMs = 0.1;
  } else {
    // Normal / Best Effort Queue Delay based on queue depth
    computedDelayMs = Math.round((queueDepth * 0.5) * 10) / 10;
  }

  return {
    allowed: true,
    markedDscp: dscp,
    markedPriority: priority,
    computedDelayMs,
  };
}
