import { describe, it, expect } from 'vitest';
import { evaluateWredDrop } from '@/lib/network/qosScheduler';

describe('qosQueueDrop (WRED & Tail Drop Congestion Simulation)', () => {
  it('does not drop packets when queue depth is below minThreshold', () => {
    const res = evaluateWredDrop(20, {
      dscpOrPrec: 0,
      minThreshold: 30,
      maxThreshold: 50,
      maxDropProbability: 0.1,
    });

    expect(res.shouldDrop).toBe(false);
    expect(res.dropType).toBe('none');
    expect(res.dropProbability).toBe(0);
  });

  it('triggers tail drop when queue depth reaches or exceeds maxThreshold', () => {
    const res = evaluateWredDrop(50, {
      dscpOrPrec: 0,
      minThreshold: 30,
      maxThreshold: 50,
      maxDropProbability: 0.1,
    });

    expect(res.shouldDrop).toBe(true);
    expect(res.dropType).toBe('tail-drop');
    expect(res.dropProbability).toBe(1.0);
  });

  it('calculates deterministic WRED drop probability in the congestion zone', () => {
    // Queue depth 40 is exactly halfway between 30 and 50 -> prob is 0.5 * 0.1 = 0.05
    const resAdmitted = evaluateWredDrop(
      40,
      {
        dscpOrPrec: 0,
        minThreshold: 30,
        maxThreshold: 50,
        maxDropProbability: 0.1,
      },
      0.06 // random value > dropProb (0.05) -> admitted
    );

    expect(resAdmitted.dropProbability).toBe(0.05);
    expect(resAdmitted.shouldDrop).toBe(false);

    const resDropped = evaluateWredDrop(
      40,
      {
        dscpOrPrec: 0,
        minThreshold: 30,
        maxThreshold: 50,
        maxDropProbability: 0.1,
      },
      0.03 // random value < dropProb (0.05) -> dropped early
    );

    expect(resDropped.dropProbability).toBe(0.05);
    expect(resDropped.shouldDrop).toBe(true);
    expect(resDropped.dropType).toBe('wred-probabilistic');
  });
});
