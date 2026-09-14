import { createSeededRandom } from './randomServices';

export function isLinkLocalIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  return parts[0] === 169 && parts[1] === 254;
}

export function generateRandomLinkLocalIpv4(usedIps?: Set<string>, maxAttempts = 512): string {
  // RFC 3927: 169.254.0.0/16. In practice avoid .0 and .255 in last octet.
  const seed = linkLocalSeed(usedIps);
  const next = createSeededRandom(seed);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const third = 1 + Math.floor(next() * 254); // 1..254
    const fourth = 1 + Math.floor(next() * 254); // 1..254
    const candidate = `169.254.${third}.${fourth}`;
    if (!usedIps || !usedIps.has(candidate)) return candidate;
  }
  // Fallback (deterministic-ish) if we somehow collide too often
  return `169.254.${(Date.now() >>> 8) % 254 + 1}.${Date.now() % 254 + 1}`;
}

export function generateRandomLinkLocalIpv6(usedIps?: Set<string>, maxAttempts = 512): string {
  // fe80::/10 is link-local. We generate a random /64 interface ID.
  const seed = linkLocalSeed(usedIps);
  const next = createSeededRandom(seed);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const p1 = Math.floor(next() * 65536).toString(16);
    const p2 = Math.floor(next() * 65536).toString(16);
    const p3 = Math.floor(next() * 65536).toString(16);
    const p4 = Math.floor(next() * 65536).toString(16);
    const candidate = `fe80::${p1}:${p2}:${p3}:${p4}`;
    if (!usedIps || !usedIps.has(candidate)) return candidate;
  }
  return `fe80::${Math.floor(next() * 65536).toString(16)}:${Math.floor(next() * 65536).toString(16)}`;
}

/**
 * Derive a stable seed from the already-used address set content so repeated
 * calls for the same devices yield repeatable addresses.
 */
function linkLocalSeed(usedIps?: Set<string>): number {
  if (!usedIps || usedIps.size === 0) return 0x17ad6b;
  let hash = 0x811c9dc5;
  for (const ip of usedIps) {
    for (let i = 0; i < ip.length; i += 1) {
      hash = (hash ^ ip.charCodeAt(i)) >>> 0;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash;
}