/**
 * fib.ts — Forwarding Information Base (FIB)
 *
 * Separates the Routing Information Base (RIB — all protocol-learned routes)
 * from the Forwarding Information Base (FIB — the installed, best-per-prefix
 * forwarding entries that the packet pipeline actually uses).
 *
 * Responsibilities:
 *  - Build FIB entries from a RIB: per-prefix LPM winner with ECMP next-hop
 *    lists (equal AD + equal metric routes install together).
 *  - Install/withdraw diffing: given a previous FIB, produce the set of
 *    added/removed/changed entries so the packet pipeline and UI can show
 *    what a topology change actually did to forwarding.
 *  - Fast FIB lookup: longest-prefix match with numeric IP comparison
 *    instead of linear route scans.
 *
 * Pure functions — no I/O, no timers.
 */

import type { Route } from './routingTypes';
import { ipToNumber, getPrefixLength, isIpv6, isIpv6InNetwork } from './routingUtils';

export interface FibNextHop {
  nextHop: string;       // IP or exit interface for connected routes
  interfaceId?: string;  // Resolved egress interface
  routeType: Route['type'];
  code?: string;         // Route source code (O, D, B, S, C, ...)
}

export interface FibEntry {
  prefix: string;        // destination network, e.g. '192.168.2.0'
  prefixLength: number;  // CIDR length
  administrativeDistance: number;
  metric: number;
  nextHops: FibNextHop[]; // ≥1; more than one = ECMP
  trafficShare: 'per-packet' | undefined; // simulation: undefined (single winner semantics)
  installedAt: number;
}

export type FibOperation = 'install' | 'withdraw' | 'modify';

export interface FibDiff {
  operation: FibOperation;
  prefix: string;
  prefixLength: number;
  entry: FibEntry | null; // new entry for install/modify; prior entry for withdraw
}

export interface FibBuildResult {
  fib: FibEntry[];
  diff: FibDiff[];
}

/** Resolve AD from a route using the same precedence as the routing engine. */
function routeAd(route: Route): number {
  if (route.administrativeDistance !== undefined) return route.administrativeDistance;
  switch (route.type) {
    case 'connected': return 0;
    case 'static': return 1;
    case 'dynamic':
      if (route.code?.startsWith('D') || route.code === 'EX') return 90;
      if (route.code?.startsWith('O') || route.ospfRouteType) return 110;
      if (route.code === 'R') return 120;
      if (route.code === 'B') return 20;
      return 110;
    default: return 110;
  }
}

function routePrefixInfo(route: Route): { prefix: string; prefixLength: number } | null {
  if (!route.destination) return null;
  if (isIpv6(route.destination)) {
    return { prefix: route.destination, prefixLength: route.prefixLength ?? 0 };
  }
  const mask = route.subnetMask;
  if (!mask) return null;
  try {
    return { prefix: route.destination, prefixLength: getPrefixLength(mask) };
  } catch {
    return null;
  }
}

function sameNextHops(a: FibNextHop[], b: FibNextHop[]): boolean {
  if (a.length !== b.length) return false;
  const key = (nh: FibNextHop) => `${nh.nextHop}|${nh.interfaceId ?? ''}|${nh.routeType}|${nh.code ?? ''}`;
  const setA = new Set(a.map(key));
  return b.every(nh => setA.has(key(nh)));
}

/**
 * Build a FIB from a RIB (the full route list produced by buildRoutingTable).
 *
 * Selection per prefix: lowest AD wins; ties broken by lowest metric; equal
 * AD+metric routes install as an ECMP group. Most specific prefix always
 * beats less specific ones at lookup time (FIB stores all prefixes).
 */
export function buildFibFromRib(rib: Route[], now: number = Date.now()): FibEntry[] {
  // Group candidate routes by prefix key
  const byPrefix = new Map<string, Route[]>();
  for (const route of rib) {
    const info = routePrefixInfo(route);
    if (!info) continue;
    const key = `${info.prefix}/${info.prefixLength}`;
    const bucket = byPrefix.get(key);
    if (bucket) bucket.push(route);
    else byPrefix.set(key, [route]);
  }

  const fib: FibEntry[] = [];
  byPrefix.forEach((candidates, key) => {
    const [prefix, plenStr] = [key.slice(0, key.lastIndexOf('/')), parseInt(key.slice(key.lastIndexOf('/') + 1), 10)];

    let bestAd = Infinity;
    let bestMetric = Infinity;
    for (const r of candidates) {
      const ad = routeAd(r);
      const metric = r.metric ?? 0;
      if (ad < bestAd || (ad === bestAd && metric < bestMetric)) {
        bestAd = ad;
        bestMetric = metric;
      }
    }

    // ECMP group: all routes matching winning AD+metric
    const winners = candidates.filter(r => routeAd(r) === bestAd && (r.metric ?? 0) === bestMetric);
    const nextHops: FibNextHop[] = [];
    for (const w of winners) {
      const nh: FibNextHop = {
        nextHop: w.nextHop,
        interfaceId: w.interfaceId,
        routeType: w.type,
        code: w.code,
      };
      if (!nextHops.some(e => e.nextHop === nh.nextHop && e.interfaceId === nh.interfaceId)) {
        nextHops.push(nh);
      }
    }

    fib.push({
      prefix,
      prefixLength: plenStr,
      administrativeDistance: bestAd,
      metric: bestMetric,
      nextHops,
      trafficShare: undefined,
      installedAt: now,
    });
  });

  // Most specific first (canonical FIB display/lookup order)
  return fib.sort((a, b) => b.prefixLength - a.prefixLength || a.prefix.localeCompare(b.prefix));
}

/**
 * Diff two FIBs and report install/withdraw/modify operations.
 */
export function diffFibs(previous: FibEntry[], next: FibEntry[]): FibDiff[] {
  const key = (e: FibEntry) => `${e.prefix}/${e.prefixLength}`;
  const prevMap = new Map(previous.map(e => [key(e), e]));
  const nextMap = new Map(next.map(e => [key(e), e]));
  const ops: FibDiff[] = [];

  nextMap.forEach((entry, k) => {
    const prev = prevMap.get(k);
    if (!prev) {
      ops.push({ operation: 'install', prefix: entry.prefix, prefixLength: entry.prefixLength, entry });
    } else if (prev.administrativeDistance !== entry.administrativeDistance ||
               prev.metric !== entry.metric ||
               !sameNextHops(prev.nextHops, entry.nextHops)) {
      ops.push({ operation: 'modify', prefix: entry.prefix, prefixLength: entry.prefixLength, entry });
    }
  });

  prevMap.forEach((entry, k) => {
    if (!nextMap.has(k)) {
      ops.push({ operation: 'withdraw', prefix: entry.prefix, prefixLength: entry.prefixLength, entry });
    }
  });

  return ops;
}

/**
 * Convenience: build the next FIB from a RIB and diff against the previous.
 */
export function updateFib(previous: FibEntry[], rib: Route[], now: number = Date.now()): FibBuildResult {
  const fib = buildFibFromRib(rib, now);
  return { fib, diff: diffFibs(previous, fib) };
}

/**
 * FIB longest-prefix match lookup for a destination IP.
 * Returns the entry and the selected next-hop (first of the ECMP group —
 * simulation uses deterministic per-flow selection, not per-packet).
 */
export function fibLookup(
  fib: FibEntry[],
  destinationIp: string
): { entry: FibEntry; nextHop: FibNextHop } | null {
  if (!destinationIp) return null;
  const isV6 = isIpv6(destinationIp);

  let destNum: number | undefined;
  if (!isV6) {
    try {
      destNum = ipToNumber(destinationIp);
    } catch {
      return null;
    }
  }

  for (const entry of fib) {
    if (isV6) {
      if (isIpv6(entry.prefix) && isIpv6InNetwork(destinationIp, entry.prefix, entry.prefixLength)) {
        return { entry, nextHop: entry.nextHops[0] };
      }
      continue;
    }
    if (isIpv6(entry.prefix)) continue;
    try {
      const prefixNum = ipToNumber(entry.prefix);
      const hostBits = 32 - entry.prefixLength;
      const mask = hostBits === 0 ? 0 : (0xFFFFFFFF >>> hostBits) << hostBits;
      if ((destNum! & mask) === (prefixNum & mask)) {
        return { entry, nextHop: entry.nextHops[0] };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Format a FIB for `show ip cef` / FIB display commands.
 */
export function formatFibTable(fib: FibEntry[]): string {
  let out = '\n';
  out += 'IP Forwarding Information Base (FIB)\n';
  out += 'Prefix              Next Hop           Interface        Source   AD/Metric\n';
  out += '------------------  -----------------  ---------------  -------  ---------\n';
  for (const e of fib) {
    const primary = e.nextHops[0];
    const nh = primary?.nextHop ?? 'attached';
    const iface = primary?.interfaceId ?? (primary?.routeType === 'connected' ? primary.nextHop : '');
    const source = primary?.code ?? (primary?.routeType === 'connected' ? 'C' : primary?.routeType === 'static' ? 'S' : '?');
    const adMetric = `${e.administrativeDistance}/${e.metric}`;
    out += `${`${e.prefix}/${e.prefixLength}`.padEnd(18)}  ${nh.padEnd(17)}  ${iface.padEnd(15)}  ${source.padEnd(7)}  ${adMetric}`;
    if (e.nextHops.length > 1) out += `  [${e.nextHops.length}-way ECMP]`;
    out += '\n';
  }
  return out;
}
