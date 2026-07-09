import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;
const redis = (redisUrl && redisToken) ? new Redis({ url: redisUrl, token: redisToken }) : null;

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitRecord>();
const MAX_ENTRIES = 1000;

/**
 * Redis-backed rate limiter with in-memory fallback
 */
export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  if (redis) {
    try {
      const redisKey = `ratelimit:${key}`;
      const count = await redis.incr(redisKey);
      
      let ttl = await redis.ttl(redisKey);
      if (ttl < 0) {
        await redis.expire(redisKey, Math.ceil(windowMs / 1000));
        ttl = Math.ceil(windowMs / 1000);
      }
      
      const allowed = count <= limit;
      const remaining = Math.max(0, limit - count);
      const resetTime = Date.now() + (ttl * 1000);
      
      if (!allowed) {
        logger.warn(`Rate limit exceeded for key: ${key}`);
      }
      
      return { allowed, remaining, resetTime };
    } catch (e) {
      logger.error(`Redis rate limiting failed, falling back to memory: ${e}`);
    }
  }

  // Memory fallback
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
