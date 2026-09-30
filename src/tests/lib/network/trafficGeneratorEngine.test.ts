import { describe, it, expect } from 'vitest';
import { TrafficGeneratorEngine } from '../../../lib/network/trafficGeneratorEngine';

describe('TrafficGeneratorEngine', () => {
  it('starts traffic session, updates stats on tick, and calculates link telemetry', () => {
    const engine = new TrafficGeneratorEngine();
    const session = engine.startSession('dev1', 'dev2', 'HTTP', 40, 1000);

    expect(session.active).toBe(true);
    expect(engine.getActiveSessions()).toHaveLength(1);

    engine.tick(2); // 2 seconds
    expect(session.packetsSent).toBeGreaterThan(0);

    const telemetry = engine.calculateLinkTelemetry('conn1', [session], 100);
    expect(telemetry.utilizationPercent).toBe(40);
    expect(telemetry.status).toBe('NORMAL');

    const heavySession = engine.startSession('dev1', 'dev3', 'UDP_FLOW', 55, 1000);
    const telemetryHeavy = engine.calculateLinkTelemetry('conn1', [session, heavySession], 100);
    expect(telemetryHeavy.utilizationPercent).toBe(95);
    expect(telemetryHeavy.status).toBe('CONGESTED');
  });
});
