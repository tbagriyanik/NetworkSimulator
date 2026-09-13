import { SwitchState, Port } from '../types';
import { getNetworkAddress } from '../core/showHelpers';
import { isIpv6InNetwork } from './routingUtils';
import type { Route } from './routingTypes';

/**
 * Calculate RIP (RIP for IPv4) routes for a device
 */
export function calculateRipRoutes(
  deviceId: string,
  deviceStates: Map<string, SwitchState>
): Route[] {
  const routes: Route[] = [];
  const state = deviceStates.get(deviceId);
  if (!state || state.routingProtocol !== 'rip') return routes;

  const visitedAds = new Set<string>();

  for (const [otherId, otherState] of deviceStates) {
    if (otherState.routingProtocol !== 'rip') continue;
    if (otherId === deviceId) continue;

    // Check adjacency
    let isAdjacent = false;
    let neighborIp: string | undefined;
    let localPort: Port | undefined;

    for (const otherPort of Object.values(otherState.ports)) {
      if (!otherPort.ipAddress || !otherPort.subnetMask || otherPort.shutdown) continue;

      for (const thisPort of Object.values(state.ports)) {
        if (!thisPort.ipAddress || !thisPort.subnetMask || thisPort.shutdown) continue;

        if (getNetworkAddress(otherPort.ipAddress, otherPort.subnetMask) === getNetworkAddress(thisPort.ipAddress, thisPort.subnetMask)) {
          isAdjacent = true;
          neighborIp = otherPort.ipAddress;
          localPort = thisPort;
          break;
        }
      }
      if (isAdjacent) break;
    }

    if (!isAdjacent || !neighborIp || !localPort) continue;

    // Collect networks from adjacent RIP neighbor
    for (const otherPort of Object.values(otherState.ports)) {
      if (!otherPort.ipAddress || !otherPort.subnetMask || otherPort.shutdown) continue;

      const dest = getNetworkAddress(otherPort.ipAddress, otherPort.subnetMask);
      const routeKey = `${dest}/${otherPort.subnetMask}`;
      if (visitedAds.has(routeKey)) continue;
      visitedAds.add(routeKey);

      const alreadyHas = Object.values(state.ports).some(
        p => p.ipAddress && p.subnetMask && getNetworkAddress(p.ipAddress, p.subnetMask) === dest
      );
      if (alreadyHas) continue;

      routes.push({
        destination: dest,
        subnetMask: otherPort.subnetMask,
        nextHop: neighborIp,
        type: 'dynamic',
        metric: 120,
        code: 'R',
        administrativeDistance: 120
      });
    }

    // Propagate dynamically learned or configured RIP networks
    for (const route of otherState.dynamicRoutes || []) {
      if (route.type !== 'dynamic' || !route.destination || !route.subnetMask) continue;

      const routeKey = `${route.destination}/${route.subnetMask}`;
      if (visitedAds.has(routeKey)) continue;
      visitedAds.add(routeKey);

      const alreadyHas = Object.values(state.ports).some(
        p => p.ipAddress && p.subnetMask && getNetworkAddress(p.ipAddress, p.subnetMask) === route.destination
      );
      if (alreadyHas) continue;

      routes.push({
        destination: route.destination,
        subnetMask: route.subnetMask,
        nextHop: neighborIp,
        type: 'dynamic',
        metric: 120,
        code: 'R',
        administrativeDistance: 120
      });
    }
  }

  return routes;
}

/**
 * Calculate RIPng (RIP for IPv6) routes for a device
 * Shares connected IPv6 networks from RIPng-enabled interfaces
 */
export function calculateRipngRoutes(
  deviceId: string,
  deviceStates: Map<string, SwitchState>
): Route[] {
  const routes: Route[] = [];
  const state = deviceStates.get(deviceId);
  if (!state || state.routingProtocol !== 'ripng') return routes;

  const visitedAds = new Set<string>();

  // Collect RIPng routes from all RIPng-enabled devices
  for (const [otherId, otherState] of deviceStates) {
    if (otherState.routingProtocol !== 'ripng') continue;
    if (otherId === deviceId) continue;

    // Check adjacency: both must share a common subnet
    let isAdjacent = false;
    for (const otherPort of Object.values(otherState.ports)) {
      if (!otherPort.ipv6Address || !otherPort.ipv6Prefix) continue;
      if (!otherPort.ipv6Rip?.enabled) continue;
      if (otherPort.shutdown) continue;

      for (const thisPort of Object.values(state.ports)) {
        if (!thisPort.ipv6Address || !thisPort.ipv6Prefix) continue;
        if (!thisPort.ipv6Rip?.enabled) continue;
        if (thisPort.shutdown) continue;

        if (isIpv6InNetwork(otherPort.ipv6Address, thisPort.ipv6Address, Math.min(otherPort.ipv6Prefix, thisPort.ipv6Prefix))) {
          isAdjacent = true;
          break;
        }
      }
      if (isAdjacent) break;
    }

    if (!isAdjacent) continue;

    // Collect networks advertised by the adjacent RIPng neighbor
    for (const otherPort of Object.values(otherState.ports)) {
      if (!otherPort.ipv6Address || !otherPort.ipv6Prefix) continue;
      if (!otherPort.ipv6Rip?.enabled) continue;
      if (otherPort.shutdown) continue;

      const routeKey = `${otherPort.ipv6Address}/${otherPort.ipv6Prefix}`;
      if (visitedAds.has(routeKey)) continue;
      visitedAds.add(routeKey);

      // Don't add route for the same network this device already has
      const alreadyHas = Object.values(state.ports).some(
        p => p.ipv6Address === otherPort.ipv6Address && p.ipv6Prefix === otherPort.ipv6Prefix
      );
      if (alreadyHas) continue;

      routes.push({
        destination: otherPort.ipv6Address,
        prefixLength: otherPort.ipv6Prefix,
        nextHop: otherPort.ipv6Address,
        type: 'dynamic',
        metric: 1
      });
    }
  }

  return routes;
}
