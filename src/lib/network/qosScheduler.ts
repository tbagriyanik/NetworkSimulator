export type QosDiscipline = 'wfq' | 'llq' | 'cbwfq';

export interface QosPacket {
  id: string;
  className?: string;
  flow?: string;
  bytes: number;
  dscp?: number;
  cos?: number;
}

export interface QosClass {
  name: string;
  bandwidthPercent?: number;
  weight?: number;
  priority?: boolean;
  queueLimit?: number;
  policeConfig?: PoliceConfig;
  shapeConfig?: ShapeConfig;
}

export type PoliceAction = 'transmit' | 'drop' | 'set-dscp-transmit' | 'set-cos-transmit';

export interface PoliceConfig {
  cirBps: number;       // Committed Information Rate in bps
  pirBps?: number;      // Peak Information Rate in bps
  burstBytes: number;   // Committed Burst (Bc) in bytes
  peakBurstBytes?: number; // Excess Burst (Be) in bytes
  conformAction: PoliceAction;
  exceedAction: PoliceAction;
  violateAction?: PoliceAction;
  remarkDscp?: number;
}

export interface ShapeConfig {
  type: 'average' | 'peak';
  rateBps: number;
  burstBytes?: number;
}

export interface TokenBucket {
  tokens: number;       // Current tokens in bytes
  peakTokens?: number;  // Current PIR tokens in bytes
  lastUpdatedMs: number;
}

export interface PoliceResult {
  actionTaken: PoliceAction;
  conformed: boolean;
  exceeded: boolean;
  violated: boolean;
  packet: QosPacket;
  nextBucketState: TokenBucket;
}

export interface ShapeResult {
  transmitted: QosPacket[];
  buffered: QosPacket[];
  totalDelayMs: number;
}

export interface QosScheduleResult {
  transmitted: QosPacket[];
  dropped: QosPacket[];
  byClass: Record<string, { transmitted: number; dropped: number; bytes: number }>;
}

/**
 * Single/Two-Rate Token Bucket Traffic Policing Engine.
 */
export function policePacket(
  bucket: TokenBucket,
  packet: QosPacket,
  config: PoliceConfig,
  nowMs: number = Date.now()
): PoliceResult {
  const elapsedSec = Math.max(0, (nowMs - bucket.lastUpdatedMs) / 1000);

  // Refill tokens
  const addedTokens = (config.cirBps / 8) * elapsedSec;
  const newTokens = Math.min(config.burstBytes, bucket.tokens + addedTokens);

  let newPeakTokens = bucket.peakTokens;
  if (config.pirBps && config.peakBurstBytes) {
    const addedPeak = (config.pirBps / 8) * elapsedSec;
    newPeakTokens = Math.min(config.peakBurstBytes, (bucket.peakTokens ?? config.peakBurstBytes) + addedPeak);
  }

  const pktBytes = packet.bytes;

  let actionTaken: PoliceAction = config.conformAction;
  let conformed = false;
  let exceeded = false;
  let violated = false;
  let finalTokens = newTokens;

  // Single Rate / Two Rate Bucket Check
  if (newTokens >= pktBytes) {
    // Conform
    conformed = true;
    finalTokens = newTokens - pktBytes;
    actionTaken = config.conformAction;
  } else if (newPeakTokens !== undefined && newPeakTokens >= pktBytes) {
    // Exceed
    exceeded = true;
    newPeakTokens = newPeakTokens - pktBytes;
    actionTaken = config.exceedAction;
  } else {
    // Violated (or Exceeded if no dual rate)
    if (config.pirBps) {
      violated = true;
      actionTaken = config.violateAction || 'drop';
    } else {
      exceeded = true;
      actionTaken = config.exceedAction;
    }
  }

  // Handle remark action
  const modifiedPacket = { ...packet };
  if ((actionTaken === 'set-dscp-transmit' || actionTaken === 'set-cos-transmit') && config.remarkDscp !== undefined) {
    modifiedPacket.dscp = config.remarkDscp;
  }

  return {
    actionTaken,
    conformed,
    exceeded,
    violated,
    packet: modifiedPacket,
    nextBucketState: {
      tokens: finalTokens,
      peakTokens: newPeakTokens,
      lastUpdatedMs: nowMs
    }
  };
}

/**
 * Traffic Shaping Queue Delay Engine.
 * Buffers excess packets and computes transmission timing.
 */
export function shapePacketQueue(
  packets: QosPacket[],
  config: ShapeConfig
): ShapeResult {
  const transmitted: QosPacket[] = [];
  const buffered: QosPacket[] = [];
  const rateBytesPerSec = config.rateBps / 8;

  let totalBytes = 0;
  let totalDelayMs = 0;

  for (const pkt of packets) {
    totalBytes += pkt.bytes;
    const pktDelayMs = (pkt.bytes / rateBytesPerSec) * 1000;

    // Standard shape buffer limit check (max 64 packets in queue)
    if (buffered.length < 64) {
      transmitted.push(pkt);
      totalDelayMs += pktDelayMs;
    } else {
      buffered.push(pkt); // Dropped/Tail-dropped if shape queue overflows
    }
  }

  return {
    transmitted,
    buffered,
    totalDelayMs: Math.round(totalDelayMs)
  };
}

/**
 * Discrete, deterministic QoS scheduler. capacity is the available bytes for one scheduling interval.
 */
export function scheduleQosPackets(
  discipline: QosDiscipline,
  packets: QosPacket[],
  capacity: number,
  classes: QosClass[] = []
): QosScheduleResult {
  const byName = new Map(classes.map(c => [c.name, c]));
  const queues = new Map<string, QosPacket[]>();

  for (const p of packets) {
    const key = p.className || 'default';
    queues.set(key, [...(queues.get(key) || []), p]);
  }

  const transmitted: QosPacket[] = [], dropped: QosPacket[] = [];
  let remaining = Math.max(0, capacity);

  const order = [...queues.keys()].sort((a, b) => {
    const ca = byName.get(a), cb = byName.get(b);
    if (discipline === 'llq') return Number(Boolean(cb?.priority)) - Number(Boolean(ca?.priority));
    return (cb?.weight ?? cb?.bandwidthPercent ?? 1) - (ca?.weight ?? ca?.bandwidthPercent ?? 1);
  });

  for (const name of order) {
    const queue = queues.get(name)!;
    const cls = byName.get(name);

    // Apply Policing filter if configured on this class
    if (cls?.policeConfig) {
      let bucketState: TokenBucket = { tokens: cls.policeConfig.burstBytes, lastUpdatedMs: Date.now() - 1000 };
      const policedQueue: QosPacket[] = [];
      for (const pkt of queue) {
        const polRes = policePacket(bucketState, pkt, cls.policeConfig);
        bucketState = polRes.nextBucketState;
        if (polRes.actionTaken !== 'drop') {
          policedQueue.push(polRes.packet);
        } else {
          dropped.push(pkt);
        }
      }
      queues.set(name, policedQueue);
    }
  }

  for (const name of order) {
    const queue = queues.get(name)!;
    const cls = byName.get(name);
    const quota = discipline === 'llq' && cls?.priority ? remaining : discipline === 'wfq' ? remaining : Math.floor(capacity * (cls?.bandwidthPercent ?? 100) / 100);
    let used = 0;
    while (queue.length && used + queue[0].bytes <= quota && queue[0].bytes <= remaining) {
      const p = queue.shift()!;
      transmitted.push(p);
      used += p.bytes;
      remaining -= p.bytes;
    }
    dropped.push(...queue.splice(0));
  }

  const stats: QosScheduleResult['byClass'] = {};
  for (const p of packets) {
    const n = p.className || 'default';
    stats[n] ||= { transmitted: 0, dropped: 0, bytes: 0 };
    if (transmitted.includes(p)) {
      stats[n].transmitted++;
      stats[n].bytes += p.bytes;
    } else {
      stats[n].dropped++;
    }
  }

  return { transmitted, dropped, byClass: stats };
}

export interface WredProfile {
  dscpOrPrec: number;
  minThreshold: number; // in packets or KB
  maxThreshold: number; // in packets or KB
  maxDropProbability: number; // e.g., 0.1 for 10%
}

export interface WredEvaluationResult {
  shouldDrop: boolean;
  dropType: 'none' | 'wred-probabilistic' | 'tail-drop';
  dropProbability: number;
  reason: string;
}

/**
 * Weighted Random Early Detection (WRED) Congestion Avoidance Engine.
 */
export function evaluateWredDrop(
  currentQueueDepth: number,
  profile: WredProfile,
  randomValue: number = Math.random()
): WredEvaluationResult {
  const { minThreshold, maxThreshold, maxDropProbability } = profile;

  // Below minimum threshold: never drop
  if (currentQueueDepth < minThreshold) {
    return {
      shouldDrop: false,
      dropType: 'none',
      dropProbability: 0,
      reason: `Queue depth (${currentQueueDepth}) is below min threshold (${minThreshold}). No drop.`,
    };
  }

  // Above maximum threshold: 100% Tail drop
  if (currentQueueDepth >= maxThreshold) {
    return {
      shouldDrop: true,
      dropType: 'tail-drop',
      dropProbability: 1.0,
      reason: `Queue depth (${currentQueueDepth}) reached or exceeded max threshold (${maxThreshold}). Tail drop applied.`,
    };
  }

  // Between min and max threshold: calculate drop probability slope
  const slope = (currentQueueDepth - minThreshold) / (maxThreshold - minThreshold);
  const dropProb = slope * maxDropProbability;

  const shouldDrop = randomValue < dropProb;
  return {
    shouldDrop,
    dropType: shouldDrop ? 'wred-probabilistic' : 'none',
    dropProbability: parseFloat(dropProb.toFixed(4)),
    reason: shouldDrop
      ? `WRED Early Drop triggered (Prob: ${(dropProb * 100).toFixed(1)}%, Queue: ${currentQueueDepth}/${maxThreshold}).`
      : `WRED checked: packet admitted (Prob: ${(dropProb * 100).toFixed(1)}%).`,
  };
}

