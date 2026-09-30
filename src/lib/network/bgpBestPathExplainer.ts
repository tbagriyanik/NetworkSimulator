import type { BgpRoute } from './bgpEngine';

export interface BgpDecisionExplanation {
  bestRoute: BgpRoute;
  comparedRoute: BgpRoute;
  stepIndex: number;
  stepName: string;
  reason: string;
}

/**
 * BGP En İyi Yol (Best Path) Karar Nedeni Açıklayıcısı
 * İki BGP rotasını karşılaştırır ve BGP yol seçimi algoritmasına göre kazananı ve nedenini döndürür.
 *
 * Cisco BGP Best Path Selection Algorithm (13 steps):
 * 1. Highest Weight
 * 2. Highest Local Preference
 * 3. Locally Originated
 * 4. Shortest AS-Path
 * 5. Lowest Origin Type
 * 6. Lowest MED
 * 7. eBGP over iBGP
 * 8. Lowest IGP metric to next-hop
 * 9. Oldest path (longest-established)
 * 10. Lowest Router ID
 * 11. Lowest Neighbor IP
 * 12. Prefer the path that comes from the lowest neighbor address
 * 13. Prefer the path with the minimum cluster list length
 */
export function explainBgpBestPath(
  routeA: BgpRoute,
  routeB: BgpRoute,
  localRouterId: string = '1.1.1.1'
): BgpDecisionExplanation {
  // 1. Highest Weight
  const weightA = routeA.weight ?? 0;
  const weightB = routeB.weight ?? 0;
  if (weightA !== weightB) {
    const winner = weightA > weightB ? routeA : routeB;
    return {
      bestRoute: winner,
      comparedRoute: winner === routeA ? routeB : routeA,
      stepIndex: 1,
      stepName: 'Highest Weight',
      reason: `Route via ${winner.nextHop} has higher Weight (${Math.max(weightA, weightB)} vs ${Math.min(weightA, weightB)}).`
    };
  }

  // 2. Highest Local Preference
  const lpA = routeA.localPref ?? 100;
  const lpB = routeB.localPref ?? 100;
  if (lpA !== lpB) {
    const winner = lpA > lpB ? routeA : routeB;
    return {
      bestRoute: winner,
      comparedRoute: winner === routeA ? routeB : routeA,
      stepIndex: 2,
      stepName: 'Highest Local Preference',
      reason: `Route via ${winner.nextHop} has higher Local Preference (${Math.max(lpA, lpB)} vs ${Math.min(lpA, lpB)}).`
    };
  }

  // 3. Locally Originated
  const localA = routeA.nextHop === '0.0.0.0' || routeA.nextHop === localRouterId;
  const localB = routeB.nextHop === '0.0.0.0' || routeB.nextHop === localRouterId;
  if (localA !== localB) {
    const winner = localA ? routeA : routeB;
    return {
      bestRoute: winner,
      comparedRoute: winner === routeA ? routeB : routeA,
      stepIndex: 3,
      stepName: 'Locally Originated',
      reason: `Route via ${winner.nextHop} is locally originated on this router.`
    };
  }

  // 4. Shortest AS-Path Length
  const asLenA = routeA.asPath.length;
  const asLenB = routeB.asPath.length;
  if (asLenA !== asLenB) {
    const winner = asLenA < asLenB ? routeA : routeB;
    return {
      bestRoute: winner,
      comparedRoute: winner === routeA ? routeB : routeA,
      stepIndex: 4,
      stepName: 'Shortest AS-Path',
      reason: `Route via ${winner.nextHop} has shorter AS-Path length (${Math.min(asLenA, asLenB)} vs ${Math.max(asLenA, asLenB)} AS hops).`
    };
  }

  // 5. Lowest Origin (IGP < EGP < INCOMPLETE)
  const originVal = (o: 'IGP' | 'EGP' | 'INCOMPLETE') => (o === 'IGP' ? 1 : o === 'EGP' ? 2 : 3);
  if (originVal(routeA.origin) !== originVal(routeB.origin)) {
    const winner = originVal(routeA.origin) < originVal(routeB.origin) ? routeA : routeB;
    return {
      bestRoute: winner,
      comparedRoute: winner === routeA ? routeB : routeA,
      stepIndex: 5,
      stepName: 'Lowest Origin Type',
      reason: `Route via ${winner.nextHop} has preferred Origin type (${winner.origin}).`
    };
  }

  // 6. Lowest MED (Metric)
  const medA = routeA.metric ?? 0;
  const medB = routeB.metric ?? 0;
  if (medA !== medB) {
    const winner = medA < medB ? routeA : routeB;
    return {
      bestRoute: winner,
      comparedRoute: winner === routeA ? routeB : routeA,
      stepIndex: 6,
      stepName: 'Lowest MED (Multi-Exit Discriminator)',
      reason: `Route via ${winner.nextHop} has lower MED metric (${Math.min(medA, medB)} vs ${Math.max(medA, medB)}).`
    };
  }

  // 7. Prefer eBGP over iBGP
  const isIbgpA = routeA.isIbgp ?? false;
  const isIbgpB = routeB.isIbgp ?? false;
  if (isIbgpA !== isIbgpB) {
    const winner = isIbgpA ? routeB : routeA; // Prefer eBGP (not iBGP)
    return {
      bestRoute: winner,
      comparedRoute: winner === routeA ? routeB : routeA,
      stepIndex: 7,
      stepName: 'Prefer eBGP over iBGP',
      reason: `Route via ${winner.nextHop} is from eBGP neighbor (preferred over iBGP).`
    };
  }

  // 8. Lowest IGP metric to next-hop
  const igpMetricA = routeA.igpMetric ?? 0;
  const igpMetricB = routeB.igpMetric ?? 0;
  if (igpMetricA !== igpMetricB) {
    const winner = igpMetricA < igpMetricB ? routeA : routeB;
    return {
      bestRoute: winner,
      comparedRoute: winner === routeA ? routeB : routeA,
      stepIndex: 8,
      stepName: 'Lowest IGP Metric to Next-Hop',
      reason: `Route via ${winner.nextHop} has lower IGP metric to next-hop (${Math.min(igpMetricA, igpMetricB)} vs ${Math.max(igpMetricA, igpMetricB)}).`
    };
  }

  // 9. Oldest path (longest-established)
  const receivedTimeA = routeA.receivedTime ?? 0;
  const receivedTimeB = routeB.receivedTime ?? 0;
  if (receivedTimeA !== receivedTimeB) {
    const winner = receivedTimeA < receivedTimeB ? routeA : routeB; // Older timestamp wins
    return {
      bestRoute: winner,
      comparedRoute: winner === routeA ? routeB : routeA,
      stepIndex: 9,
      stepName: 'Oldest Path (Longest-Established)',
      reason: `Route via ${winner.nextHop} is the oldest path (longest-established).`
    };
  }

  // 10. Lowest Router ID
  const routerIdA = routeA.routerId ?? '0.0.0.0';
  const routerIdB = routeB.routerId ?? '0.0.0.0';
  if (routerIdA !== routerIdB) {
    const winner = routerIdA < routerIdB ? routeA : routeB;
    return {
      bestRoute: winner,
      comparedRoute: winner === routeA ? routeB : routeA,
      stepIndex: 10,
      stepName: 'Lowest Router ID',
      reason: `Route via ${winner.nextHop} has lower advertising router ID (${winner.routerId}).`
    };
  }

  // 11. Lowest Neighbor IP (Tie-Breaker)
  const winner = routeA.nextHop < routeB.nextHop ? routeA : routeB;
  return {
    bestRoute: winner,
    comparedRoute: winner === routeA ? routeB : routeA,
    stepIndex: 11,
    stepName: 'Lowest Neighbor IP (Tie-Breaker)',
    reason: `Route via ${winner.nextHop} was selected as tie-breaker based on lower Neighbor IP address.`
  };
}
