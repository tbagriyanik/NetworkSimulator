import { describe, it, expect } from 'vitest';
import { TrafficGeneratorEngine } from '../../../lib/network/trafficGeneratorEngine';

describe('TrafficGeneratorEngine', () => {
  it('starts traffic session, updates stats on tick, and calculates link telemetry', () => {
    const engine = new TrafficGeneratorEngine();
    const session = engine.startSession('dev1', 'dev2', 'HTTP', 40, 1000);

    expect(session.active).toBe(true);
    expect(engine.getActiveSessions()).toHaveLength(1);

    const packets = engine.tick(2); // 2 seconds
    expect(session.packetsSent).toBeGreaterThan(0);
    expect(packets.length).toBeGreaterThan(0);
    expect(packets[0].protocol).toBe('TCP');
    expect(packets[0].ingressDeviceId).toBe('dev1');
    expect(packets[0].egressDeviceId).toBe('dev2');

    const telemetry = engine.calculateLinkTelemetry('conn1', [session], 100);
    expect(telemetry.utilizationPercent).toBe(40);
    expect(telemetry.status).toBe('NORMAL');

    const heavySession = engine.startSession('dev1', 'dev3', 'UDP_FLOW', 55, 1000);
    const telemetryHeavy = engine.calculateLinkTelemetry('conn1', [session, heavySession], 100);
    expect(telemetryHeavy.utilizationPercent).toBe(95);
    expect(telemetryHeavy.status).toBe('CONGESTED');
  });

  it('generates valid packet frames with correct structure', () => {
    const engine = new TrafficGeneratorEngine();
    engine.startSession('dev1', 'dev2', 'HTTP', 10, 1500);

    const packets = engine.tick(1);
    expect(packets.length).toBeGreaterThan(0);

    const packet = packets[0];
    expect(packet.id).toBeDefined();
    expect(packet.protocol).toBe('TCP');
    expect(packet.srcMac).toMatch(/^00:1A:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/);
    expect(packet.dstMac).toMatch(/^00:1A:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/);
    expect(packet.srcIp).toMatch(/^192\.168\.1\.\d+$/);
    expect(packet.dstIp).toMatch(/^192\.168\.1\.\d+$/);
    expect(packet.srcPort).toBe(49152);
    expect(packet.dstPort).toBe(80);
    expect(packet.length).toBe(1500);
  });

  it('uses correct ports for different protocols', () => {
    const engine = new TrafficGeneratorEngine();

    const httpSession = engine.startSession('dev1', 'dev2', 'HTTP', 10, 1500);
    engine.tick(1);
    const httpPackets = engine.getSessionPackets(httpSession.id);
    expect(httpPackets[0].srcPort).toBe(49152);
    expect(httpPackets[0].dstPort).toBe(80);

    const voipSession = engine.startSession('dev1', 'dev3', 'VoIP', 10, 1500);
    engine.tick(1);
    const voipPackets = engine.getSessionPackets(voipSession.id);
    expect(voipPackets[0].srcPort).toBe(49153);
    expect(voipPackets[0].dstPort).toBe(5060);

    const ftpSession = engine.startSession('dev1', 'dev4', 'FTP', 10, 1500);
    engine.tick(1);
    const ftpPackets = engine.getSessionPackets(ftpSession.id);
    expect(ftpPackets[0].srcPort).toBe(49154);
    expect(ftpPackets[0].dstPort).toBe(21);
  });

  it('tracks generated packets per session', () => {
    const engine = new TrafficGeneratorEngine();
    const session = engine.startSession('dev1', 'dev2', 'HTTP', 10, 1500);

    engine.tick(1);
    const sessionPackets = engine.getSessionPackets(session.id);
    const firstCount = sessionPackets.length;
    expect(firstCount).toBeGreaterThan(0);

    engine.tick(1);
    const sessionPacketsAfter = engine.getSessionPackets(session.id);
    expect(sessionPacketsAfter.length).toBeGreaterThan(firstCount);
  });

  it('can clear session packets to manage memory', () => {
    const engine = new TrafficGeneratorEngine();
    const session = engine.startSession('dev1', 'dev2', 'HTTP', 10, 1500);

    engine.tick(1);
    expect(engine.getSessionPackets(session.id).length).toBeGreaterThan(0);

    engine.clearSessionPackets(session.id);
    expect(engine.getSessionPackets(session.id).length).toBe(0);
  });
});
