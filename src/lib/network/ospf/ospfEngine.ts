import { Route } from '../routing';
import { SwitchState } from '../types';
import {
  LSAType,
  OSPFAreaType,
  LSDB,
  SPFNode,
} from './ospfTypes';
import {
  isOspfProtocol,
  isOspfV3,
  isLSAAllowedInArea,
  buildOSPFLinkStateDatabase,
} from './ospfLsdb';

export function runOSPFDijkstra(
  sourceRouterId: string,
  area: number,
  lsdb: LSDB
): Map<string, SPFNode> {
  const areaData = lsdb[area];
  if (!areaData) return new Map();

  const spt = new Map<string, SPFNode>();
  const queue: SPFNode[] = [];

  queue.push({
    routerId: sourceRouterId,
    cost: 0,
    nextHop: 'self',
    area
  });

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (!current) continue;

    if (spt.has(current.routerId)) continue;
    spt.set(current.routerId, current);

    const lsa = areaData.routerLSAs.get(current.routerId);
    if (!lsa) continue;

    lsa.links.forEach(link => {
      areaData.routerLSAs.forEach((otherLsa, neighborId) => {
        if (neighborId === current.routerId) return;

        if (lsdb.passiveLinks?.has(`${current.routerId}|${area}|${link.id}`)) return;
        if (lsdb.passiveLinks?.has(`${neighborId}|${area}|${link.id}`)) return;

        const isNeighbor = otherLsa.links.some(otherLink =>
          (otherLink.id === link.id)
        );

        if (isNeighbor) {
          const newCost = current.cost + link.metric;
          const nextHop = current.nextHop === 'self' ? neighborId : current.nextHop;

          queue.push({
            routerId: neighborId,
            cost: newCost,
            nextHop,
            area
          });
        }
      });
    });
  }

  return spt;
}

export function calculateOSPFRoutes(
  deviceId: string,
  deviceStates: Map<string, SwitchState>
): Route[] {
  const state = deviceStates.get(deviceId);
  if (!state || !isOspfProtocol(state.routingProtocol)) return [];

  const isV6 = isOspfV3(state.routingProtocol);
  const routerId = state.ospfRouterId || state.routerId || state.ip || state.hostname || deviceId;
  const areas = state.ospfAreas || [0];
  const lsdb = buildOSPFLinkStateDatabase(deviceStates);
  const routes: Route[] = [];

  areas.forEach(area => {
    const areaData = lsdb[area];
    if (!areaData) return;
    const areaType = areaData.areaType || OSPFAreaType.Normal;

    const spt = runOSPFDijkstra(routerId, area, lsdb);

    spt.forEach((node, targetRouterId) => {
      if (targetRouterId === routerId) return;

      const lsa = areaData.routerLSAs.get(targetRouterId);
      if (!lsa) return;

      lsa.links.forEach(link => {
        if (link.type === 'stub') {
          const dest = link.id;
          const existing = routes.find(r => r.destination === dest);

          if (!existing || (existing.metric || 0) > node.cost + link.metric) {
            if (existing) {
              const idx = routes.indexOf(existing);
              routes.splice(idx, 1);
            }
            if (isV6) {
              routes.push({
                destination: dest,
                prefixLength: parseInt(link.data),
                nextHop: node.nextHop,
                type: 'dynamic',
                metric: node.cost + link.metric,
                area: area
              });
            } else {
              routes.push({
                destination: dest,
                subnetMask: link.data,
                nextHop: node.nextHop,
                type: 'dynamic',
                metric: node.cost + link.metric,
                area: area
              });
            }
          }
        }
      });
    });

    areaData.summaryLSAs.forEach(lsa => {
      if (!isLSAAllowedInArea(areaType, LSAType.Summary)) return;

      const abrNode = spt.get(lsa.advRouter);
      if (!abrNode && lsa.advRouter !== routerId) return;

      const costToAbr = abrNode ? abrNode.cost : 0;
      const totalCost = costToAbr + lsa.metric;
      const nextHop = abrNode ? abrNode.nextHop : 'self';

      const existing = routes.find(r => r.destination === lsa.network);
      if (!existing || (existing.metric || 0) > totalCost) {
        if (existing) {
          if (existing.area === area && !areaData.summaryLSAs.has(`${lsa.network}-${lsa.advRouter}`)) {
            return;
          }
          const idx = routes.indexOf(existing);
          routes.splice(idx, 1);
        }
        if (isV6) {
          routes.push({
            destination: lsa.network,
            prefixLength: parseInt(lsa.mask),
            nextHop: nextHop === 'self' ? lsa.network : nextHop,
            type: 'dynamic',
            metric: totalCost,
            area: area
          });
        } else {
          routes.push({
            destination: lsa.network,
            subnetMask: lsa.mask,
            nextHop: nextHop === 'self' ? lsa.network : nextHop,
            type: 'dynamic',
            metric: totalCost,
            area: area
          });
        }
      }
    });
  });

  areas.forEach(area => {
    const areaData = lsdb[area];
    if (!areaData?.nssaLsas) return;
    const areaType = areaData.areaType || OSPFAreaType.Normal;

    areaData.nssaLsas.forEach(lsa => {
      if (!isLSAAllowedInArea(areaType, LSAType.ASExternal)) return;

      const spt = runOSPFDijkstra(routerId, area, lsdb);
      const asbrNode = spt.get(lsa.advRouter);
      if (!asbrNode && lsa.advRouter !== routerId) return;

      const costToAsbr = asbrNode ? asbrNode.cost : 0;
      const n1Cost = costToAsbr + lsa.metric;
      const n2Cost = lsa.metric;
      const nextHop = asbrNode ? asbrNode.nextHop : 'self';

      const existingN1 = routes.find(r => r.destination === lsa.network && r.ospfRouteType === 'N1');
      if (!existingN1 || (existingN1.metric ?? 0) > n1Cost) {
        if (isV6) {
          routes.push({
            destination: lsa.network,
            prefixLength: parseInt(lsa.mask),
            nextHop: nextHop === 'self' ? lsa.network : nextHop,
            type: 'dynamic',
            metric: n1Cost,
            area: area,
            ospfRouteType: 'N1'
          });
        } else {
          routes.push({
            destination: lsa.network,
            subnetMask: lsa.mask,
            nextHop: nextHop === 'self' ? lsa.network : nextHop,
            type: 'dynamic',
            metric: n1Cost,
            area: area,
            ospfRouteType: 'N1'
          });
        }
      }

      const existingN2 = routes.find(r => r.destination === lsa.network && r.ospfRouteType === 'N2');
      if (!existingN2 || (existingN2.metric ?? 0) > n2Cost) {
        if (isV6) {
          routes.push({
            destination: lsa.network,
            prefixLength: parseInt(lsa.mask),
            nextHop: nextHop === 'self' ? lsa.network : nextHop,
            type: 'dynamic',
            metric: n2Cost,
            area: area
          });
        } else {
          routes.push({
            destination: lsa.network,
            subnetMask: lsa.mask,
            nextHop: nextHop === 'self' ? lsa.network : nextHop,
            type: 'dynamic',
            metric: n2Cost,
            area: area
          });
        }
      }
    });
  });

  areas.forEach(area => {
    const areaData = lsdb[area];
    if (!areaData?.asExternalLSAs) return;
    const areaType = areaData.areaType || OSPFAreaType.Normal;

    if (!isLSAAllowedInArea(areaType, LSAType.ASExternal)) return;

    const spt = runOSPFDijkstra(routerId, area, lsdb);

    areaData.asExternalLSAs.forEach(lsa => {
      const asbrNode = spt.get(lsa.advRouter);
      if (!asbrNode && lsa.advRouter !== routerId) return;

      const costToAsbr = asbrNode ? asbrNode.cost : 0;
      const e1Cost = costToAsbr + lsa.metric;
      const e2Cost = lsa.metric;
      const nextHop = asbrNode ? asbrNode.nextHop : 'self';

      const existingE1 = routes.find(r => r.destination === lsa.network && r.ospfRouteType === 'E1');
      if (!existingE1 || (existingE1.metric ?? 0) > e1Cost) {
        if (isV6) {
          routes.push({
            destination: lsa.network,
            prefixLength: parseInt(lsa.mask),
            nextHop: nextHop === 'self' ? lsa.network : nextHop,
            type: 'dynamic',
            metric: e1Cost,
            area: area,
            ospfRouteType: 'E1'
          });
        } else {
          routes.push({
            destination: lsa.network,
            subnetMask: lsa.mask,
            nextHop: nextHop === 'self' ? lsa.network : nextHop,
            type: 'dynamic',
            metric: e1Cost,
            area: area,
            ospfRouteType: 'E1'
          });
        }
      }

      const existingE2 = routes.find(r => r.destination === lsa.network && r.ospfRouteType === 'E2');
      if (!existingE2 || (existingE2.metric ?? 0) > e2Cost) {
        if (isV6) {
          routes.push({
            destination: lsa.network,
            prefixLength: parseInt(lsa.mask),
            nextHop: nextHop === 'self' ? lsa.network : nextHop,
            type: 'dynamic',
            metric: e2Cost,
            area: area,
            ospfRouteType: 'E2'
          });
        } else {
          routes.push({
            destination: lsa.network,
            subnetMask: lsa.mask,
            nextHop: nextHop === 'self' ? lsa.network : nextHop,
            type: 'dynamic',
            metric: e2Cost,
            area: area,
            ospfRouteType: 'E2'
          });
        }
      }
    });
  });

  return routes;
}
