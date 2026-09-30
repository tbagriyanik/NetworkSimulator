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
});
