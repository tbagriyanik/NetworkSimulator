import { logger } from '@/lib/logger';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitRecord>();
const MAX_ENTRIES = 1000;

/**
 * Simple memory-based rate limiter with DoS protection
 */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  let record = rateLimits.get(key);

  if (!record || now > record.resetTime) {
    if (rateLimits.size >= MAX_ENTRIES) {
      const firstKey = rateLimits.keys().next().value;
      if (firstKey) rateLimits.delete(firstKey);
    }
    record = { count: 0, resetTime: now + windowMs };
    rateLimits.set(key, record);
  }

  if (record.count >= limit) {
    logger.warn(`Rate limit exceeded for key: ${key}`);
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimits.entries()) {
    if (now > record.resetTime) rateLimits.delete(key);
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 60 * 60 * 1000);
}
