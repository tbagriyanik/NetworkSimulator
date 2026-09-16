import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from './types';
import { calculateOSPFRoutes } from './ospf';
import { calculateEigrpRoutes, calculateEigrp6Routes } from './eigrp-dual';
import { validateSviStatus } from './core/L3Validation';
import { getNetworkAddress } from './core/showHelpers';
import { isIpInSubnet } from './connectivity.utils';

// Sub-modules
import {
  isIpv6,
  expandIpv6,
  isIpv6InNetwork,
  isIpInNetwork,
  ipToNumber,
  getPrefixLength,
  isTrackedRouteActive
} from './routing/routingUtils';
import { calculateRipRoutes, calculateRipngRoutes } from './routing/ripRouting';
import { recalculateBgpNeighbors, calculateBgpRoutes } from './routing/bgpRouting';
import { detectRoutingLoops as detectLoopsImpl } from './routing/routingLoops';
import type { Route, RouteDecisionDetails, L3Hop, RoutingLoopIssue } from './routing/routingTypes';

// Re-export types and functions
export type { Route, RouteDecisionDetails, L3Hop, RoutingLoopIssue };
export {
  isIpv6,
  expandIpv6,
  isIpv6InNetwork,
  ipToNumber,
  calculateBgpRoutes,
  recalculateBgpNeighbors,
  isTrackedRouteActive
};

/**
 * Build routing table for a device
 */
function buildRoutingTable(
  deviceId: string,
  deviceStates: Map<string, SwitchState>
): Route[] {
  const routes: Route[] = [];
  const state = deviceStates.get(deviceId);
  if (!state) return routes;

  // 1. Connected routes (directly connected networks)
  for (const [portId, port] of Object.entries(state.ports)) {
    if (port.shutdown) continue;

    // Check SVI status if it's a VLAN interface
    if (portId.toLowerCase().startsWith('vlan')) {
      const vlanId = parseInt(portId.replace(/vlan/i, ''), 10);
      if (!isNaN(vlanId)) {
        const sviStatus = validateSviStatus(state, vlanId);
        if (sviStatus.status !== 'up') {
          continue;
        }
      }
    }

    if (port.ipAddress && port.subnetMask) {
      routes.push({
        destination: getNetworkAddress(port.ipAddress, port.subnetMask),
        subnetMask: port.subnetMask,
        nextHop: portId, // Directly connected
        type: 'connected',
        metric: 0
      });
    }
    if (port.ipv6Address && port.ipv6Prefix) {
      routes.push({
        destination: port.ipv6Address,
        prefixLength: port.ipv6Prefix,
        nextHop: portId,
        type: 'connected',
        metric: 0
      });
    }

    // HSRP/VRRP virtual IPs (connected routes if Active)
    if (port.hsrp?.groups) {
      for (const [_, group] of Object.entries(port.hsrp.groups)) {
        if (group.state === 'Active' && group.virtualIp) {
          routes.push({
            destination: group.virtualIp,
            subnetMask: '255.255.255.255', // Host route
            nextHop: portId,
            type: 'connected',
            metric: 0
          });
        }
      }
    }
  }

  // 2. Static routes (floating static: route with a track object is only installed while the track is Up)
  if (state.staticRoutes) {
    routes.push(...state.staticRoutes.filter(r => isTrackedRouteActive(state, r)));
  }
  if (state.ipv6StaticRoutes) {
    routes.push(...state.ipv6StaticRoutes.filter(r => isTrackedRouteActive(state, r)));
  }

  // 3. Dynamic routes (Learned or configured)
  if (state.dynamicRoutes) {
    routes.push(...state.dynamicRoutes);
  }
  if (state.ipv6DynamicRoutes) {
    routes.push(...state.ipv6DynamicRoutes);
  }

  // 4. OSPF Dijkstra SPF based learning
  if (state.routingProtocol === 'ospf') {
    const ospfRoutes = calculateOSPFRoutes(deviceId, deviceStates);
    ospfRoutes.forEach(r => {
      if (!routes.some(existing => existing.destination === r.destination && (existing.type === 'connected' || existing.type === 'static'))) {
        routes.push(r);
      }
    });
  }

  // 5. EIGRP DUAL based learning
  if (state.routingProtocol === 'eigrp' && state.eigrpAs) {
    const eigrpRoutes = calculateEigrpRoutes(deviceId, deviceStates);
    eigrpRoutes.forEach(r => {
      if (!routes.some(existing => existing.destination === r.destination && (existing.type === 'connected' || existing.type === 'static'))) {
        routes.push(r);
      }
    });
  }

  // RIP dynamic routing learning
  if (state.routingProtocol === 'rip') {
    const ripRoutes = calculateRipRoutes(deviceId, deviceStates);
    ripRoutes.forEach(r => {
      if (!routes.some(existing => existing.destination === r.destination && (existing.type === 'connected' || existing.type === 'static'))) {
        routes.push(r);
      }
    });
  }

  // 6. OSPFv3 route computation
  if (state.routingProtocol === 'ospfv3') {
    const ospfV3Routes = calculateOSPFRoutes(deviceId, deviceStates);
    ospfV3Routes.forEach(r => {
      if (!routes.some(existing => existing.destination === r.destination && (existing.type === 'connected' || existing.type === 'static'))) {
        routes.push(r);
      }
    });
  }

  // 7. RIPng route computation
  if (state.routingProtocol === 'ripng') {
    const ripngRoutes = calculateRipngRoutes(deviceId, deviceStates);
    ripngRoutes.forEach(r => {
      if (!routes.some(existing => existing.destination === r.destination && (existing.type === 'connected' || existing.type === 'static'))) {
        routes.push(r);
      }
    });
  }

  // 8. EIGRPv6 DUAL based learning
  if (state.eigrp6Config?.as) {
    const eigrp6Routes = calculateEigrp6Routes(deviceId, deviceStates);
    eigrp6Routes.forEach(r => {
      if (!routes.some(existing => existing.destination === r.destination && (existing.type === 'connected' || existing.type === 'static'))) {
        routes.push(r);
      }
    });
  }

  // 9. BGP route exchange
  if (state.routingProtocol === 'bgp' && state.bgpAs) {
    const bgpRoutes = calculateBgpRoutes(deviceId, deviceStates);
    bgpRoutes.forEach(r => {
      if (!routes.some(existing => existing.destination === r.destination && (existing.type === 'connected' || existing.type === 'static'))) {
        routes.push(r);
      }
    });
  }

  return applyRouteRedistribution(deviceId, deviceStates, routes);
}

/**
 * Apply route redistribution rules across protocols for a device
 */
function applyRouteRedistribution(
  deviceId: string,
  deviceStates: Map<string, SwitchState>,
  routes: Route[]
): Route[] {
  const state = deviceStates.get(deviceId);
  if (!state || !state.redistributeRules || state.redistributeRules.length === 0) return routes;

  const result = [...routes];

  state.redistributeRules.forEach(rule => {
    let sourceRoutes: Route[] = [];

    if (rule.sourceProtocol === 'connected') {
      sourceRoutes = routes.filter(r => r.type === 'connected');
    } else if (rule.sourceProtocol === 'static') {
      sourceRoutes = routes.filter(r => r.type === 'static');
    } else if (rule.sourceProtocol === 'rip') {
      sourceRoutes = calculateRipRoutes(deviceId, deviceStates);
    } else if (rule.sourceProtocol === 'ospf') {
      sourceRoutes = calculateOSPFRoutes(deviceId, deviceStates);
    } else if (rule.sourceProtocol === 'eigrp') {
      sourceRoutes = calculateEigrpRoutes(deviceId, deviceStates);
    } else if (rule.sourceProtocol === 'bgp') {
      sourceRoutes = (state.dynamicRoutes || []).filter(r => r.code === 'B' || r.type === 'dynamic');
    }

    sourceRoutes.forEach(srcRoute => {
      const existsInTable = result.some(r => r.destination === srcRoute.destination && (r.type === 'connected' || r.type === 'static'));
      if (existsInTable) return;

      const codeMap: Record<string, string> = {
        ospf: 'O E2',
        rip: 'R',
        eigrp: 'D EX',
        bgp: 'B'
      };

      const defaultMetricMap: Record<string, number> = {
        ospf: 20,
        rip: 1,
        eigrp: 100,
        bgp: 1
      };

      const redistributedRoute: Route = {
        destination: srcRoute.destination,
        subnetMask: srcRoute.subnetMask,
        nextHop: srcRoute.nextHop || 'directly connected',
        interfaceId: srcRoute.interfaceId,
        metric: rule.metric !== undefined ? rule.metric : (defaultMetricMap[rule.targetProtocol] || 20),
        type: 'dynamic',
        code: codeMap[rule.targetProtocol] || 'O E2',
        administrativeDistance: rule.targetProtocol === 'ospf' ? 110 : rule.targetProtocol === 'rip' ? 120 : rule.targetProtocol === 'eigrp' ? 170 : 20
      };

      result.push(redistributedRoute);
    });
  });

  return result;
}

export function getAdministrativeDistance(route: Route): number {
  if (route.administrativeDistance !== undefined) return route.administrativeDistance;
  switch (route.type) {
    case 'connected': return 0;
    case 'static': return 1;
    case 'dynamic':
      if (route.code?.startsWith('D') || route.code === 'EX') return 90; // EIGRP
      if (route.code?.startsWith('O') || route.ospfRouteType) return 110; // OSPF
      if (route.code === 'R') return 120; // RIP
      if (route.code === 'B') return 20;  // BGP
      return 110;
    default:
      return 110;
  }
}

interface PbrPortConfig {
  policyRouteMap?: string;
}

interface PbrRouteMapClause {
  setRules?: {
    nextHop?: string;
  };
}

/**
 * Find best route to destination IP with full decision details (LPM, AD, Metric, PBR)
 */
export function findRouteDetailed(
  destinationIp: string,
  routingTable: Route[],
  pbrConfig?: { ports?: Record<string, PbrPortConfig>; routeMaps?: Record<string, PbrRouteMapClause[]> }
): RouteDecisionDetails | null {
  if (!destinationIp) return null;

  // 0. Check Policy-Based Routing (PBR) override first if configured
  if (pbrConfig?.ports && pbrConfig?.routeMaps) {
    for (const port of Object.values(pbrConfig.ports)) {
      if (port.policyRouteMap && pbrConfig.routeMaps[port.policyRouteMap]) {
        const clauses = pbrConfig.routeMaps[port.policyRouteMap];
        const pbrClause = clauses.find((c) => c.setRules?.nextHop);
        if (pbrClause?.setRules?.nextHop) {
          const nextHop = pbrClause.setRules.nextHop;
          const pbrRoute: Route = {
            destination: '0.0.0.0',
            subnetMask: '0.0.0.0',
            nextHop: nextHop,
            type: 'static',
            code: 'PBR',
            metric: 0,
            administrativeDistance: 0
          };
          return {
            route: pbrRoute,
            destinationIp,
            matchedPrefix: 'PBR Policy Match',
            prefixLength: 0,
            administrativeDistance: 0,
            metric: 0,
            type: 'static',
            explanation: `PBR policy-map ${port.policyRouteMap} forced next-hop ${nextHop}`
          };
        }
      }
    }
  }

  let bestRoute: Route | null = null;
  let bestPrefixLength = -1;
  let bestAd = 999;
  let bestMetric = Infinity;

  const isTargetIpv6 = isIpv6(destinationIp);

  for (const route of routingTable) {
    if (!route.destination) continue;

    const isRouteIpv6 = isIpv6(route.destination);
    if (isTargetIpv6 !== isRouteIpv6) continue;

    let prefixLen = -1;
    let matches = false;

    if (isTargetIpv6) {
      prefixLen = route.prefixLength ?? 0;
      matches = isIpv6InNetwork(destinationIp, route.destination, prefixLen);
    } else {
      if (route.subnetMask) {
        prefixLen = getPrefixLength(route.subnetMask);
        matches = isIpInNetwork(destinationIp, route.destination, route.subnetMask);
      }
    }

    if (!matches) continue;

    const ad = getAdministrativeDistance(route);
    const metric = route.metric ?? 0;

    if (prefixLen > bestPrefixLength) {
      bestPrefixLength = prefixLen;
      bestAd = ad;
      bestMetric = metric;
      bestRoute = route;
    } else if (prefixLen === bestPrefixLength) {
      if (ad < bestAd) {
        bestAd = ad;
        bestMetric = metric;
        bestRoute = route;
      } else if (ad === bestAd && metric < bestMetric) {
        bestMetric = metric;
        bestRoute = route;
      }
    }
  }

  if (!bestRoute) return null;

  const matchedPrefix = `${bestRoute.destination}/${bestPrefixLength}`;

  return {
    route: bestRoute,
    destinationIp,
    matchedPrefix,
    prefixLength: bestPrefixLength,
    administrativeDistance: bestAd,
    metric: bestMetric,
    type: bestRoute.type,
    explanation: `LPM ${matchedPrefix} [AD:${bestAd}/Metric:${bestMetric}] via ${bestRoute.interfaceId || bestRoute.nextHop}`,
  };
}

/**
 * Find best route to destination IP
 */
export function findRoute(destinationIp: string, routingTable: Route[], pbrConfig?: { ports?: Record<string, any>; routeMaps?: Record<string, any[]> }): Route | null {
  const detailed = findRouteDetailed(destinationIp, routingTable, pbrConfig);
  return detailed ? detailed.route : null;
}

/**
 * Get routing table for display
 */
export function getRoutingTable(
  deviceId: string,
  deviceStates: Map<string, SwitchState>,
  devices?: CanvasDevice[],
  connections?: CanvasConnection[]
): Route[] {
  const state = deviceStates.get(deviceId);
  if (!state) return [];

  const routes = (devices && connections)
    ? buildRoutingTable(deviceId, deviceStates)
    : buildBasicRoutingTable(state);

  return routes.sort((a, b) => {
    const typeOrder = { connected: 0, static: 1, dynamic: 2 };
    const typeDiff = typeOrder[a.type] - typeOrder[b.type];
    if (typeDiff !== 0) return typeDiff;
    return (a.metric || 0) - (b.metric || 0);
  });
}

/**
 * Build a basic routing table from just the device state (no topology)
 */
function buildBasicRoutingTable(state: SwitchState): Route[] {
  const routes: Route[] = [];

  // 1. Connected routes
  for (const [portId, port] of Object.entries(state.ports)) {
    if (port.shutdown) continue;

    if (portId.toLowerCase().startsWith('vlan')) {
      const vlanId = parseInt(portId.replace(/vlan/i, ''), 10);
      if (!isNaN(vlanId)) {
        const sviStatus = validateSviStatus(state, vlanId);
        if (sviStatus.status !== 'up') {
          continue;
        }
      }
    }

    if (port.ipAddress && port.subnetMask) {
      routes.push({
        destination: getNetworkAddress(port.ipAddress, port.subnetMask),
        subnetMask: port.subnetMask,
        nextHop: portId,
        type: 'connected',
        metric: 0
      });
    }
    if (port.ipv6Address && port.ipv6Prefix) {
      routes.push({
        destination: port.ipv6Address,
        prefixLength: port.ipv6Prefix,
        nextHop: portId,
        type: 'connected',
        metric: 0
      });
    }

    if (port.hsrp?.groups) {
      for (const [_, group] of Object.entries(port.hsrp.groups)) {
        if (group.state === 'Active' && group.virtualIp) {
          routes.push({
            destination: group.virtualIp,
            subnetMask: '255.255.255.255',
            nextHop: portId,
            type: 'connected',
            metric: 0
          });
        }
      }
    }
  }

  // 2. Static routes (floating static: route with a track object is only installed while the track is Up)
  if (state.staticRoutes) {
    routes.push(...state.staticRoutes.filter(r => isTrackedRouteActive(state, r)));
  }
  if (state.ipv6StaticRoutes) {
    routes.push(...state.ipv6StaticRoutes.filter(r => isTrackedRouteActive(state, r)));
  }

  // 3. Dynamic routes
  if (state.dynamicRoutes) {
    routes.push(...state.dynamicRoutes);
  }
  if (state.ipv6DynamicRoutes) {
    routes.push(...state.ipv6DynamicRoutes);
  }

  return routes;
}

export function getL3Hops(
  sourceId: string,
  targetIp: string,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates: Map<string, SwitchState>
): L3Hop[] {
  const hops: L3Hop[] = [];
  const visited = new Set<string>();

  let currentId = sourceId;
  const targetDevice = devices.find(d => d.ip === targetIp || d.ipv6 === targetIp);
  if (!targetDevice) return [];

  const findDeviceByIp = (ip: string): CanvasDevice | undefined => {
    const directMatch = devices.find(d => d.ip === ip || d.ipv6 === ip);
    if (directMatch) return directMatch;
    for (const [devId, state] of deviceStates.entries()) {
      for (const port of Object.values(state.ports || {})) {
        if (port.ipAddress === ip || port.ipv6Address === ip) {
          return devices.find(d => d.id === devId);
        }
      }
    }
    return undefined;
  };

  for (let step = 0; step < 30; step++) {
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    if (currentId === targetDevice.id) {
      break;
    }

    const currentDevice = devices.find(d => d.id === currentId);
    if (!currentDevice) break;

    const currentState = deviceStates.get(currentId);

    let targetIsDirectlyConnected = false;
    if (currentState) {
      for (const port of Object.values(currentState.ports || {})) {
        if (port.ipAddress && port.subnetMask) {
          if (isIpInSubnet(port.ipAddress, targetIp, port.subnetMask)) {
            targetIsDirectlyConnected = true;
            break;
          }
        }
        if (port.ipv6Address && port.ipv6Prefix) {
          if (isIpv6InNetwork(targetIp, port.ipv6Address, port.ipv6Prefix)) {
            targetIsDirectlyConnected = true;
            break;
          }
        }
      }
    }
    if (!targetIsDirectlyConnected && currentDevice.ip && currentDevice.subnet) {
      if (isIpInSubnet(currentDevice.ip, targetIp, currentDevice.subnet)) {
        targetIsDirectlyConnected = true;
      }
    }

    if (targetIsDirectlyConnected) {
      hops.push({
        name: targetDevice.name,
        ip: targetIp
      });
      break;
    }

    let nextHopIp: string | undefined;

    if (currentDevice.type === 'pc' || currentDevice.type === 'iot') {
      nextHopIp = currentDevice.gateway;
    } else {
      if (currentState && currentState.ipRouting) {
        const routingTable = getRoutingTable(currentId, deviceStates, devices, connections);
        const route = findRoute(targetIp, routingTable);
        if (route) {
          if (route.type === 'connected') {
            const portId = route.nextHop;
            const conn = connections.find(c =>
              (c.sourceDeviceId === currentId && c.sourcePort === portId) ||
              (c.targetDeviceId === currentId && c.targetPort === portId)
            );
            if (conn) {
              const peerId = conn.sourceDeviceId === currentId ? conn.targetDeviceId : conn.sourceDeviceId;
              const peerDevice = devices.find(d => d.id === peerId);
              if (peerDevice) {
                nextHopIp = peerDevice.ip || peerDevice.ipv6;
              }
            }
          } else {
            nextHopIp = route.nextHop;
          }
        }
      }
    }

    if (!nextHopIp) {
      break;
    }

    const nextDevice = findDeviceByIp(nextHopIp);
    if (!nextDevice) {
      break;
    }

    if (nextDevice.id !== sourceId) {
      hops.push({
        name: nextDevice.name,
        ip: nextHopIp
      });
    }

    currentId = nextDevice.id;
  }

  return hops;
}

export function detectRoutingLoops(
  devices: CanvasDevice[],
  deviceStates: Map<string, SwitchState>,
  connections: CanvasConnection[] = []
): RoutingLoopIssue[] {
  return detectLoopsImpl(devices, deviceStates, connections, buildRoutingTable, findRouteDetailed);
}


