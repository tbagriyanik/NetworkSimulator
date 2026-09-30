import type { BgpRoute } from './bgpEngine';

export interface BgpDecisionExplanation {
  bestRoute: BgpRoute;
  comparedRoute: BgpRoute;
  stepIndex: number;
  stepName: string;
  reason: string;
}

/**
 * Result of comparing two routes without needing a human-readable reason.
 * -1 → routeA wins, 1 → routeB wins, 0 → complete tie.
 */
export interface BgpRouteComparison {
  winner: -1 | 0 | 1;
  stepIndex: number;
  stepName: string;
}

/** Full ordered list of BGP best-path decision steps (IOS order). */
export const BGP_BEST_PATH_STEPS: readonly string[] = [
  'Highest Weight',
  'Highest Local Preference',
  'Locally Originated',
  'Shortest AS-Path',
  'Lowest Origin Type',
  'Lowest MED (Multi-Exit Discriminator)',
  'Prefer eBGP over iBGP',
  'Lowest IGP Metric to Next-Hop',
  'Oldest Path (Longest-Established)',
  'Lowest Router ID',
  'Minimum Cluster List Length',
  'Lowest Neighbor IP (Tie-Breaker)',
];

/** Origin preference: IGP (0) < EGP (1) < INCOMPLETE (2). */
function originValue(origin: BgpRoute['origin']): number {
  return origin === 'IGP' ? 0 : origin === 'EGP' ? 1 : 2;
}

/** Compare two IPv4 addresses numerically (used for router-ID / neighbor tie-breaks). */
function compareIp(a: string, b: string): number {
  const toNum = (ip: string) =>
    ip.split('.').reduce((acc, part) => acc * 256 + (Number(part) || 0), 0);
  const na = toNum(a);
  const nb = toNum(b);
  return na === nb ? 0 : na < nb ? -1 : 1;
}

/**
 * Compare two BGP routes using every tie-break step of the BGP decision process.
 * Returns which route wins and the step that decided it. A result of
 * `winner: 0` means both routes are fully equivalent (multipath candidates).
 */
export function compareBgpRoutes(
  routeA: BgpRoute,
  routeB: BgpRoute,
  localRouterId: string = '1.1.1.1'
): BgpRouteComparison {
  /** Decide a winner from a boolean preference of routeA. */
  const decide = (aWins: boolean, stepIndex: number): BgpRouteComparison => ({
    winner: aWins ? -1 : 1,
    stepIndex,
    stepName: BGP_BEST_PATH_STEPS[stepIndex - 1],
  });

  // 1. Highest Weight
  const weightA = routeA.weight ?? 0;
  const weightB = routeB.weight ?? 0;
  if (weightA !== weightB) return decide(weightA > weightB, 1);

  // 2. Highest Local Preference
  const lpA = routeA.localPref ?? 100;
  const lpB = routeB.localPref ?? 100;
  if (lpA !== lpB) return decide(lpA > lpB, 2);

  // 3. Locally originated routes (network/redistribute/aggregate) win
  const localA = routeA.nextHop === '0.0.0.0' || routeA.nextHop === localRouterId;
  const localB = routeB.nextHop === '0.0.0.0' || routeB.nextHop === localRouterId;
  if (localA !== localB) return decide(localA, 3);

  // 4. Shortest AS-Path (AS_SET counts as 1)
  const asLenA = routeA.asPath.length;
  const asLenB = routeB.asPath.length;
  if (asLenA !== asLenB) return decide(asLenA < asLenB, 4);

  // 5. Lowest Origin type
  const originA = originValue(routeA.origin);
  const originB = originValue(routeB.origin);
  if (originA !== originB) return decide(originA < originB, 5);

  // 6. Lowest MED — only comparable between routes learned from the same
  // neighbouring AS ("unless bgp always-compare-med is configured").
  // Different origin AS means MED is not a valid discriminator here.
  const sameOriginAs = (routeA.originAs ?? 0) === (routeB.originAs ?? 0) && (routeA.originAs ?? 0) !== 0;
  const medA = routeA.metric ?? 0;
  const medB = routeB.metric ?? 0;
  if (sameOriginAs && medA !== medB) return decide(medA < medB, 6);

  // 7. Prefer eBGP over iBGP (also: eBGP is always better than confed-external)
  const isIbgpA = routeA.isIbgp ?? false;
  const isIbgpB = routeB.isIbgp ?? false;
  if (isIbgpA !== isIbgpB) return decide(!isIbgpA, 7);

  // 8. Lowest IGP metric to the next-hop
  const igpA = routeA.igpMetric ?? 0;
  const igpB = routeB.igpMetric ?? 0;
  if (igpA !== igpB) return decide(igpA < igpB, 8);

  // 9. Oldest path (longest-established). Only applies to eBGP-learned paths;
  // iBGP paths skip this step and go straight to the router-ID tie-break.
  if (!isIbgpA && !isIbgpB) {
    const recvA = routeA.receivedTime ?? 0;
    const recvB = routeB.receivedTime ?? 0;
    if (recvA !== recvB) return decide(recvA < recvB, 9);
  }

  // 10. Lowest Router ID (originator ID for reflected routes)
  const ridA = routeA.originatorId ?? routeA.routerId ?? '0.0.0.0';
  const ridB = routeB.originatorId ?? routeB.routerId ?? '0.0.0.0';
  if (ridA !== ridB) return decide(compareIp(ridA, ridB) < 0, 10);

  // 11. Shortest cluster list (fewer route reflectors traversed)
  const clusterA = routeA.clusterListLength ?? 0;
  const clusterB = routeB.clusterListLength ?? 0;
  if (clusterA !== clusterB) return decide(clusterA < clusterB, 11);

  // 12. Lowest neighbor (peer) address
  const peerA = routeA.neighborAddress ?? routeA.advertisedBy ?? routeA.nextHop;
  const peerB = routeB.neighborAddress ?? routeB.advertisedBy ?? routeB.nextHop;
  if (peerA !== peerB) return decide(compareIp(peerA, peerB) < 0, 12);

  return { winner: 0, stepIndex: 12, stepName: BGP_BEST_PATH_STEPS[11] };
}

/**
 * Select the best route out of a candidate set (e.g. all paths for one prefix
 * in the BGP RIB) using the full decision process.
 */
export function selectBestBgpPath(
  routes: BgpRoute[],
  localRouterId: string = '1.1.1.1'
): BgpRoute | undefined {
  if (routes.length === 0) return undefined;
  return routes.reduce((best, candidate) => {
    const cmp = compareBgpRoutes(best, candidate, localRouterId);
    return cmp.winner === 1 ? candidate : best;
  });
}

/**
 * BGP En İyi Yol (Best Path) Karar Nedeni Açıklayıcısı
 * İki BGP rotasını karşılaştırır ve BGP yol seçimi algoritmasına göre kazananı ve nedenini döndürür.
 *
 * BGP Best Path Selection Algorithm (12 steps):
 * 1. Highest Weight
 * 2. Highest Local Preference
 * 3. Locally Originated
 * 4. Shortest AS-Path
 * 5. Lowest Origin Type
 * 6. Lowest MED (same neighbouring AS only)
 * 7. eBGP over iBGP
 * 8. Lowest IGP metric to next-hop
 * 9. Oldest path (longest-established, eBGP only)
 * 10. Lowest Router ID / Originator ID
 * 11. Minimum cluster list length
 * 12. Lowest neighbor (peer) address
 */
export function explainBgpBestPath(
  routeA: BgpRoute,
  routeB: BgpRoute,
  localRouterId: string = '1.1.1.1'
): BgpDecisionExplanation {
  const cmp = compareBgpRoutes(routeA, routeB, localRouterId);
  const winner = cmp.winner === 1 ? routeB : routeA;
  const loser = cmp.winner === 1 ? routeA : routeB;

  let reason: string;
  switch (cmp.stepIndex) {
    case 1:
      reason = `Route via ${winner.nextHop} has higher Weight (${Math.max(routeA.weight ?? 0, routeB.weight ?? 0)} vs ${Math.min(routeA.weight ?? 0, routeB.weight ?? 0)}).`;
      break;
    case 2:
      reason = `Route via ${winner.nextHop} has higher Local Preference (${Math.max(routeA.localPref ?? 100, routeB.localPref ?? 100)} vs ${Math.min(routeA.localPref ?? 100, routeB.localPref ?? 100)}).`;
      break;
    case 3:
      reason = `Route via ${winner.nextHop} is locally originated on this router.`;
      break;
    case 4:
      reason = `Route via ${winner.nextHop} has shorter AS-Path length (${Math.min(routeA.asPath.length, routeB.asPath.length)} vs ${Math.max(routeA.asPath.length, routeB.asPath.length)} AS hops).`;
      break;
    case 5:
      reason = `Route via ${winner.nextHop} has preferred Origin type (${winner.origin}).`;
      break;
    case 6:
      reason = `Route via ${winner.nextHop} has lower MED metric (${Math.min(routeA.metric ?? 0, routeB.metric ?? 0)} vs ${Math.max(routeA.metric ?? 0, routeB.metric ?? 0)}).`;
      break;
    case 7:
      reason = `Route via ${winner.nextHop} is from eBGP neighbor (preferred over iBGP).`;
      break;
    case 8:
      reason = `Route via ${winner.nextHop} has lower IGP metric to next-hop (${Math.min(routeA.igpMetric ?? 0, routeB.igpMetric ?? 0)} vs ${Math.max(routeA.igpMetric ?? 0, routeB.igpMetric ?? 0)}).`;
      break;
    case 9:
      reason = `Route via ${winner.nextHop} is the oldest path (longest-established).`;
      break;
    case 10:
      reason = `Route via ${winner.nextHop} has lower advertising router ID (${winner.originatorId ?? winner.routerId}).`;
      break;
    case 11:
      reason = `Route via ${winner.nextHop} has a shorter cluster list (${Math.min(routeA.clusterListLength ?? 0, routeB.clusterListLength ?? 0)} vs ${Math.max(routeA.clusterListLength ?? 0, routeB.clusterListLength ?? 0)} reflectors).`;
      break;
    default:
      if (cmp.winner === 0) {
        reason = `Routes via ${routeA.nextHop} and ${routeB.nextHop} are equivalent on all 12 decision steps (ECMP multipath candidates).`;
      } else {
        reason = `Route via ${winner.nextHop} was selected as tie-breaker based on lower Neighbor IP address.`;
      }
      break;
  }

  return {
    bestRoute: cmp.winner === 0 ? routeA : winner,
    comparedRoute: cmp.winner === 0 ? routeB : loser,
    stepIndex: cmp.stepIndex,
    stepName: cmp.stepName,
    reason,
  };
}
