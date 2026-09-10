import type { SwitchState, Route } from './types';
import { isIpInSubnet } from './connectivity.utils';

export interface OspfAreaRange {
  areaId: string;
  network: string;
  mask: string;
  advertise: boolean;
}

export function getOrCreateOspfRanges(state: SwitchState): OspfAreaRange[] {
  if (!state.ospfAreaRanges) {
    state.ospfAreaRanges = [];
  }
  return state.ospfAreaRanges;
}

export function addOspfAreaRange(
  state: SwitchState,
  areaId: string,
  network: string,
  mask: string,
  advertise: boolean = true
): void {
  const ranges = getOrCreateOspfRanges(state);
  const existing = ranges.find((r) => r.areaId === areaId && r.network === network);
  if (existing) {
    existing.mask = mask;
    existing.advertise = advertise;
  } else {
    ranges.push({ areaId, network, mask, advertise });
  }
}

export function removeOspfAreaRange(state: SwitchState, areaId: string, network: string): boolean {
  if (!state.ospfAreaRanges) return false;
  const initialLen = state.ospfAreaRanges.length;
  state.ospfAreaRanges = state.ospfAreaRanges.filter(
    (r) => !(r.areaId === areaId && r.network === network)
  );
  return state.ospfAreaRanges.length < initialLen;
}

export function summarizeOspfRoutes(routes: Route[], ranges: OspfAreaRange[]): Route[] {
  if (!ranges.length || !routes.length) return routes;

  const resultRoutes: Route[] = [];
  const processedRouteDestinations = new Set<string>();

  for (const range of ranges) {
    // Find all subnets matching this area range
    const matchingRoutes = routes.filter((r) => {
      try {
        return isIpInSubnet(r.destination, range.network, range.mask);
      } catch {
        return false;
      }
    });

    if (matchingRoutes.length > 0) {
      // Mark matching routes as processed by this range
      matchingRoutes.forEach((r) => processedRouteDestinations.add(`${r.destination}/${r.mask || r.subnetMask || ''}`));

      // If advertise is true, output a single summarized route
      if (range.advertise) {
        const minMetric = Math.min(...matchingRoutes.map((r) => r.metric ?? 1));
        resultRoutes.push({
          destination: range.network,
          mask: range.mask,
          subnetMask: range.mask,
          nextHop: matchingRoutes[0].nextHop || '0.0.0.0',
          interface: matchingRoutes[0].interface,
          type: 'dynamic',
          metric: minMetric,
          administrativeDistance: 110,
        });
      }
      // If advertise is false (not-advertise), the matching routes are suppressed (filtered out)
    }
  }

  // Add remaining routes that were not suppressed or summarized by any area range
  for (const r of routes) {
    if (!processedRouteDestinations.has(`${r.destination}/${r.mask || r.subnetMask || ''}`)) {
      resultRoutes.push(r);
    }
  }

  return resultRoutes;
}
