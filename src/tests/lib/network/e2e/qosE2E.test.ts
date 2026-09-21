import { describe, it, expect } from 'vitest';
import {
  scheduleQosPackets,
  policePacket,
  shapePacketQueue,
  PoliceConfig,
  ShapeConfig,
  TokenBucket,
} from '@/lib/network/qosScheduler';
import { getOrCreateQosPolicy, addClassToQosPolicy } from '@/lib/network/qosClassMapPolicyMap';
import type { SwitchState } from '@/lib/network/types';

describe('QoS E2E Pipeline (Policy Definition -> Policing/Shaping -> LLQ/CBWFQ Scheduling -> Drop Counting)', () => {
  it('creates class/policy map in state and applies bandwidth/priority guarantees in LLQ schedule', () => {
    // 1. Initial Router State
    const routerState = {} as SwitchState;

    // 2. Policy-map configuration: VOICE (Priority), VIDEO (Bandwidth 30%), BEST-EFFORT (Default)
    addClassToQosPolicy(routerState, 'EDGE-QOS-POLICY', 'VOICE', 30, undefined);
    addClassToQosPolicy(routerState, 'EDGE-QOS-POLICY', 'VIDEO', undefined, 3000);
    addClassToQosPolicy(routerState, 'EDGE-QOS-POLICY', 'class-default', undefined, 1000);

    const policy = getOrCreateQosPolicy(routerState, 'EDGE-QOS-POLICY');
    expect(policy.classes.length).toBe(3);
    expect(policy.classes.find((c) => c.name === 'VOICE')?.priorityPercent).toBe(30);

    // 3. Scheduler input with Low Latency Queueing (LLQ)
    const packets = [
      { id: 'be-1', className: 'class-default', bytes: 1500, dscp: 0 },
      { id: 'be-2', className: 'class-default', bytes: 1500, dscp: 0 },
      { id: 'video-1', className: 'VIDEO', bytes: 600, dscp: 34 },
      { id: 'voice-1', className: 'VOICE', bytes: 200, dscp: 46 }, // EF Voice packet
      { id: 'voice-2', className: 'VOICE', bytes: 200, dscp: 46 },
    ];

    const classes = [
      { name: 'VOICE', priority: true, weight: 10 },
      { name: 'VIDEO', bandwidthPercent: 30, weight: 5 },
      { name: 'class-default', bandwidthPercent: 10, weight: 1 },
    ];

    // Total available interface capacity = 2500 bytes (VOICE priority 400B + VIDEO quota 750B allows 600B)
    const scheduleRes = scheduleQosPackets('llq', packets, 2500, classes);

    // LLQ guarantees priority queue (VOICE) transmitted first
    const transmittedIds = scheduleRes.transmitted.map((p) => p.id);
    expect(transmittedIds).toContain('voice-1');
    expect(transmittedIds).toContain('voice-2');
    expect(transmittedIds).toContain('video-1');

    // Excess Best-Effort traffic dropped due to queue congestion
    expect(scheduleRes.dropped.length).toBeGreaterThan(0);
    const droppedIds = scheduleRes.dropped.map((p) => p.id);
    expect(droppedIds).toContain('be-2');
  });

  it('policing engine remarks DSCP and drops out-of-profile traffic', () => {
    const policeConfig: PoliceConfig = {
      cirBps: 64000, // 64 Kbps (8000 bytes/sec)
      burstBytes: 1500, // Committed Burst (Bc)
      conformAction: 'transmit',
      exceedAction: 'set-dscp-transmit',
      violateAction: 'drop',
      remarkDscp: 10, // Remark to AF11
    };

    const initialBucket: TokenBucket = {
      tokens: 1500,
      lastUpdatedMs: Date.now(),
    };

    // Packet 1: 1000 bytes -> Conforms
    const p1 = { id: 'pkt-1', bytes: 1000, dscp: 46 };
    const res1 = policePacket(initialBucket, p1, policeConfig);
    expect(res1.conformed).toBe(true);
    expect(res1.actionTaken).toBe('transmit');
    expect(res1.packet.dscp).toBe(46);

    // Packet 2: 1000 bytes -> Exceeds bucket (only 500 tokens left) -> Remark DSCP
    const p2 = { id: 'pkt-2', bytes: 1000, dscp: 46 };
    const res2 = policePacket(res1.nextBucketState, p2, policeConfig);
    expect(res2.exceeded).toBe(true);
    expect(res2.actionTaken).toBe('set-dscp-transmit');
    expect(res2.packet.dscp).toBe(10); // Remarked to 10
  });

  it('shaping engine computes transmission delay without dropping conformant packets', () => {
    const shapeConfig: ShapeConfig = {
      type: 'average',
      rateBps: 80000, // 10,000 bytes/sec
    };

    const packets = [
      { id: 'sh-1', bytes: 1000 },
      { id: 'sh-2', bytes: 1000 },
      { id: 'sh-3', bytes: 1000 },
    ];

    const shapeRes = shapePacketQueue(packets, shapeConfig);
    expect(shapeRes.transmitted.length).toBe(3);
    expect(shapeRes.buffered.length).toBe(0);
    expect(shapeRes.totalDelayMs).toBeGreaterThan(0);
  });
});
