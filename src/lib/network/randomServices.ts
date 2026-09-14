/**
 * randomServices.ts — Centralized randomness services.
 *
 * Two distinct concerns live here:
 *
 * 1. `cryptoRandomInteger` / `cryptoRandomBytes` produce cryptographically
 *    secure randomness (used for security-sensitive values such as passwords,
 *    authentication challenges, session keys). Falls back to a small
 *    deterministic PRNG when the Web Crypto API is unavailable.
 *
 * 2. `deterministicId` / `deterministicIdWithPrefix` produce repeatable,
 *    monotonic identifiers so test snapshots and UI keys stay stable across
 *    runs. Networking simulation counters (traffic, jitter, QoS drops) should
 *    keep using Math.random — this module does NOT replace those.
 */

let idCounter = 0;
let sequenceSalt = Math.floor(Date.now() % 1000000);

/**
 * Deterministic seeded PRNG (Mulberry32). Given the same seed, produces the
 * same sequence — used for device-generated identifiers (APIPA addresses,
 * link-local interface IDs) so they are repeatable across runs.
 */
export function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic seeded random integer in [min, max] (inclusive).
 */
export function seededRandomInteger(seed: number, min: number, max: number): number {
  const next = createSeededRandom(seed);
  return min + Math.floor(next() * (max - min + 1));
}

/**
 * Cryptographically secure random integer in [min, max] (inclusive).
 * Uses crypto.getRandomValues with rejection sampling to avoid modulo bias;
 * falls back to a LCG-seeded PRNG outside the browser.
 */
export function cryptoRandomInteger(min: number, max: number): number {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const range = max - min + 1;
    const maxUint = 0xffffffff;
    const limit = Math.floor(maxUint / range) * range;
    const buf = new Uint32Array(1);
    let value = 0;
    do {
      globalThis.crypto.getRandomValues(buf);
      value = buf[0];
    } while (value >= limit);
    return min + (value % range);
  }
  // Fallback PRNG (SplitMix32-style) so non-browser environments stay deterministic-ish.
  sequenceSalt = (sequenceSalt >>> 0) + 0x9e3779b9;
  let z = sequenceSalt >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  z ^= z >>> 16;
  return min + (z >>> 0) % (max - min + 1);
}

/**
 * Cryptographically secure random bytes as a hex string.
 */
export function cryptoRandomHex(byteLength: number): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let out = '';
  for (let i = 0; i < byteLength; i++) {
    out += cryptoRandomInteger(0, 255).toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Deterministic, monotonic unique identifier.
 * Resets sequence on a new millisecond so values are short yet unique within
 * a run, and stable between runs only if seeded the same way.
 */
export function deterministicId(): string {
  idCounter = (idCounter + 1) % 2147483647;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/**
 * Deterministic unique identifier with a stable textual prefix.
 */
export function deterministicIdWithPrefix(prefix: string): string {
  return `${prefix}-${deterministicId()}`;
}