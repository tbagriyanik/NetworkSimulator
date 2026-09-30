// src/lib/network/trafficGeneratorEngine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrafficGeneratorEngine } from './trafficGeneratorEngine';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { simulatePacketFlow } from './forwarding/packetPipeline';

// Mock the packet pipeline to avoid heavy dependencies
vi.mock('./forwarding/packetPipeline', () => ({
  simulatePacketFlow: vi.fn().mockReturnValue({ success: true, dropReason: undefined, hops: [] })
}));

describe('TrafficGeneratorEngine', () => {
  let engine: TrafficGeneratorEngine;
  const dummyDevices: CanvasDevice[] = [];
  const dummyConnections: CanvasConnection[] = [];
  const dummyDeviceStates = new Map<string, SwitchState>();

  beforeEach(() => {
    engine = new TrafficGeneratorEngine();
    vi.mocked(simulatePacketFlow).mockClear();
  });

  it('creates a session and generates packets on tick', () => {
    const session = engine.startSession('src1', 'dst1', 'HTTP', 10, 100);
    expect(session.id).toBeDefined();
    expect(engine.getAllGeneratedPackets()).toHaveLength(0);
    const packets = engine.tick(1);
    expect(packets.length).toBeGreaterThan(0);
    const stored = engine.getSessionPackets(session.id);
    expect(stored).toHaveLength(packets.length);
  });

  it('tickAndForward generates packets and forwards them through the pipeline', () => {
    engine.startSession('src2', 'dst2', 'HTTP', 10, 100);
    const results = engine.tickAndForward(1, dummyDevices, dummyConnections, dummyDeviceStates);
    const generated = engine.getAllGeneratedPackets();
    expect(vi.mocked(simulatePacketFlow)).toHaveBeenCalledTimes(generated.length);
    expect(results).toHaveLength(generated.length);
    expect(engine.getAllGeneratedPackets()).toHaveLength(0);
  });
});
