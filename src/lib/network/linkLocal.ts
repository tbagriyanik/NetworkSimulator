export function isLinkLocalIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  return parts[0] === 169 && parts[1] === 254;
}

export function generateRandomLinkLocalIpv4(usedIps?: Set<string>, maxAttempts = 512): string {
  // RFC 3927: 169.254.0.0/16. In practice avoid .0 and .255 in last octet.
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const third = 1 + Math.floor(Math.random() * 254); // 1..254
    const fourth = 1 + Math.floor(Math.random() * 254); // 1..254
    const candidate = `169.254.${third}.${fourth}`;
    if (!usedIps || !usedIps.has(candidate)) return candidate;
  }
  // Fallback (deterministic-ish) if we somehow collide too often
  return `169.254.${(Date.now() >>> 8) % 254 + 1}.${Date.now() % 254 + 1}`;
}

export function generateRandomLinkLocalIpv6(usedIps?: Set<string>, maxAttempts = 512): string {
  // fe80::/10 is link-local. We generate a random /64 interface ID.
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const p1 = Math.floor(Math.random() * 65536).toString(16);
    const p2 = Math.floor(Math.random() * 65536).toString(16);
    const p3 = Math.floor(Math.random() * 65536).toString(16);
    const p4 = Math.floor(Math.random() * 65536).toString(16);
    const candidate = `fe80::${p1}:${p2}:${p3}:${p4}`;
    if (!usedIps || !usedIps.has(candidate)) return candidate;
  }
  return `fe80::${Math.floor(Math.random() * 65536).toString(16)}:${Math.floor(Math.random() * 65536).toString(16)}`;
}
