import { describe, it, expect } from 'vitest';
import { evaluateStormControl } from '../../../lib/network/stormControlEngine';

describe('stormControlEngine', () => {
  it('detects no storm when traffic is under threshold', () => {
    const res = evaluateStormControl(500, 1000, { broadcastLevelPercent: 70, action: 'DROP' });
    expect(res.stormDetected).toBe(false);
    expect(res.actionTaken).toBe('NONE');
    expect(res.droppedPackets).toBe(0);
  });

  it('throttles excess packets when broadcast storm exceeds limit in DROP mode', () => {
    const res = evaluateStormControl(900, 1000, { broadcastLevelPercent: 70, action: 'DROP' });
    expect(res.stormDetected).toBe(true);
    expect(res.actionTaken).toBe('DROPPED');
    expect(res.droppedPackets).toBe(200); // 900 - 700
  });

  it('triggers shutdown when broadcast storm exceeds limit in SHUTDOWN mode', () => {
    const res = evaluateStormControl(950, 1000, { broadcastLevelPercent: 80, action: 'SHUTDOWN' });
    expect(res.stormDetected).toBe(true);
    expect(res.actionTaken).toBe('SHUTDOWN');
    expect(res.reason).toContain('errdisabled');
  });

  it('uses multicast threshold when traffic type is multicast', () => {
    const res = evaluateStormControl(850, 1000, { broadcastLevelPercent: 70, multicastLevelPercent: 90, action: 'DROP' }, 'multicast');
    expect(res.stormDetected).toBe(false); // 85% < 90% multicast threshold
    expect(res.actionTaken).toBe('NONE');
  });

  it('uses broadcast threshold when traffic type is broadcast', () => {
    const res = evaluateStormControl(850, 1000, { broadcastLevelPercent: 70, multicastLevelPercent: 90, action: 'DROP' }, 'broadcast');
    expect(res.stormDetected).toBe(true); // 85% > 70% broadcast threshold
    expect(res.actionTaken).toBe('DROPPED');
  });

  it('falls back to broadcast threshold when multicast threshold is not defined', () => {
    const res = evaluateStormControl(850, 1000, { broadcastLevelPercent: 70, action: 'DROP' }, 'multicast');
    expect(res.stormDetected).toBe(true); // Should use broadcast threshold (70%)
    expect(res.actionTaken).toBe('DROPPED');
  });

  it('uses unicast threshold when traffic type is unicast', () => {
    const res = evaluateStormControl(750, 1000, { broadcastLevelPercent: 70, unicastLevelPercent: 80, action: 'DROP' }, 'unicast');
    expect(res.stormDetected).toBe(false); // 75% < 80% unicast threshold
    expect(res.actionTaken).toBe('NONE');
  });

  it('includes traffic type in storm detection reason', () => {
    const res = evaluateStormControl(900, 1000, { multicastLevelPercent: 70, action: 'DROP' }, 'multicast');
    expect(res.stormDetected).toBe(true);
    expect(res.reason).toContain('Multicast');
  });
});
