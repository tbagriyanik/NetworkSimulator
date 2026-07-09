import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRateLimited, cleanupRateLimits } from '@/lib/security/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cleanupRateLimits();
  });

  it('should allow requests within limit', async () => {
    const key = 'test_key';
    const limit = 2;
    const windowMs = 1000;

    const res1 = await isRateLimited(key, limit, windowMs);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = await isRateLimited(key, limit, windowMs);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);
  });

  it('should block requests exceeding limit', async () => {
    const key = 'test_key_blocked';
    const limit = 1;
    const windowMs = 1000;

    await isRateLimited(key, limit, windowMs);
    const res2 = await isRateLimited(key, limit, windowMs);

    expect(res2.allowed).toBe(false);
    expect(res2.remaining).toBe(0);
  });

  it('should reset after window expires', async () => {
    const key = 'test_key_reset';
    const limit = 1;
    const windowMs = 1000;

    await isRateLimited(key, limit, windowMs);

    // Advance time past window
    vi.advanceTimersByTime(1001);

    const res2 = await isRateLimited(key, limit, windowMs);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);
  });
});
