import { describe, expect, it } from 'vitest';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import { policePacket, evaluateWredDrop, scheduleQosPackets } from '@/lib/network/qosScheduler';
import { classifyAndMarkFrame } from '@/lib/network/qosPipeline';
import { forwardPacketFrame } from '@/lib/network/forwarding/commonForwardingEngine';

describe('QoS Packet Scheduling, Policing, WRED & Drop Pipeline', () => {
  const switchDevice: CanvasDevice = {
    id: 'sw-qos-1',
    name: 'QoS-Switch',
    type: 'switchL3',
    ip: '10.0.0.1',
    status: 'online',
    ports: [],
    x: 0,
    y: 0,
  };

  const switchState: SwitchState = {
    hostname: 'QoS-Switch',
    mlsQosEnabled: true,
    ports: {
      'Gi0/1': { id: 'Gi0/1', name: 'Gi0/1', vlan: 1, shutdown: false, status: 'connected' },
      'Gi0/2': {
        id: 'Gi0/2',
        name: 'Gi0/2',
        vlan: 1,
        bandwidthLimitMbps: 1, // 1 Mbps rate limit
        shutdown: false,
        status: 'connected',
      },
    },
    macAddressTable: [
      { mac: '00:aa:bb:cc:dd:ee', vlan: 1, port: 'Gi0/2', type: 'dynamic' },
    ],
  } as unknown as SwitchState;

  it('classifies VoIP traffic into EF (DSCP 46) and Expedited Priority', () => {
    const voipFrame: NetworkPacketFrame = {
      id: 'f-voip-1',
      protocol: 'UDP',
      timestamp: Date.now(),
      srcMac: '00:11:22:33:44:55',
      dstMac: '00:aa:bb:cc:dd:ee',
      etherType: '0x0800',
      dstPort: 5060,
      length: 200,
      info: 'VoIP SIP Call Signaling',
    };

    const marking = classifyAndMarkFrame(voipFrame);
    expect(marking.dscp).toBe(46); // EF
    expect(marking.priority).toBe(7);
  });

  it('polices traffic exceeding rate limit using Token Bucket algorithm', () => {
    const bucket = { tokens: 1000, lastUpdatedMs: Date.now() - 1000 };
    const polConfig = {
      cirBps: 8000, // 8 kbps = 1000 bytes/sec
      burstBytes: 1000,
      conformAction: 'transmit' as const,
      exceedAction: 'drop' as const,
    };

    const conformingPkt = policePacket(bucket, { id: 'p1', bytes: 500 }, polConfig);
    expect(conformingPkt.actionTaken).toBe('transmit');

    const exceedingPkt = policePacket(conformingPkt.nextBucketState, { id: 'p2', bytes: 8000 }, polConfig);
    expect(exceedingPkt.actionTaken).toBe('drop');
  });

  it('evaluates WRED probabilistic drop and max threshold tail drop', () => {
    const wredProfile = {
      dscpOrPrec: 0,
      minThreshold: 10,
      maxThreshold: 50,
      maxDropProbability: 0.1,
    };

    // Below min threshold -> no drop
    const belowRes = evaluateWredDrop(5, wredProfile);
    expect(belowRes.shouldDrop).toBe(false);

    // Exceeding max threshold -> 100% Tail Drop
    const tailRes = evaluateWredDrop(60, wredProfile);
    expect(tailRes.shouldDrop).toBe(true);
    expect(tailRes.dropType).toBe('tail-drop');
  });

  it('schedules packets using LLQ (Low Latency Queueing) giving priority to voice EF class', () => {
    const voicePkt = { id: 'v1', className: 'voice', bytes: 200, dscp: 46 };
    const dataPkt = { id: 'd1', className: 'data', bytes: 1000, dscp: 0 };

    const res = scheduleQosPackets(
      'llq',
      [dataPkt, voicePkt],
      1500,
      [
        { name: 'voice', priority: true },
        { name: 'data', bandwidthPercent: 50 },
      ]
    );

    expect(res.transmitted).toHaveLength(2);
    expect(res.transmitted[0].id).toBe('v1'); // Voice priority first
  });

  it('drops packets during forwardPacketFrame when QoS rate limiting threshold is exceeded', () => {
    const largeFrame: NetworkPacketFrame = {
      id: 'f-overflow',
      protocol: 'IPV4',
      timestamp: Date.now(),
      ingressPortId: 'Gi0/1',
      srcMac: '00:11:22:33:44:55',
      dstMac: '00:aa:bb:cc:dd:ee',
      etherType: '0x0800',
      srcIp: '10.0.0.10',
      dstIp: '10.0.0.20',
      length: 2_000_000, // 2MB packet far exceeding 1Mbps CIR bucket
      info: 'Bulk File Transfer',
    };

    const res = forwardPacketFrame(largeFrame, switchDevice, switchState);
    expect(res.accepted).toBe(false);
    expect(res.actionReason).toContain('QoS Rate Limiter');
  });
});
