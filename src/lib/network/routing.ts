import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from './types';
import { calculateOSPFRoutes } from './ospf';
import { calculateEigrpRoutes } from './eigrp-dual';

export interface Route {
  destination: string;      // e.g., "192.168.2.0" or "2001:db8:1::"
  subnetMask?: string;       // e.g., "255.255.255.0" (for IPv4)
  prefixLength?: number;     // e.g., 64 (for IPv6)
  nextHop: string;          // e.g., "192.168.1.1" or "2001:db8:1::1" or interface name
  metric?: number;          // Administrative distance/metric
  type: 'connected' | 'static' | 'dynamic'; // Route type
  area?: number;            // For OSPF
}

/**
 * Build routing table for a device
 */
function buildRoutingTable(
  deviceId: string,
  _devices: CanvasDevice[],
  _connections: CanvasConnection[],
  deviceStates: Map<string, SwitchState>
): Route[] {
  const routes: Route[] = [];
  const state = deviceStates.get(deviceId);
  if (!state) return routes;

  // 1. Connected routes (directly connected networks)
  for (const [portId, port] of Object.entries(state.ports)) {
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

  // 2. Static routes
  if (state.staticRoutes) {
    routes.push(...state.staticRoutes);
  }
  if (state.ipv6StaticRoutes) {
    routes.push(...state.ipv6StaticRoutes);
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
      // Don't learn if already have it as connected or static
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

  return routes;
}


/**
 * Find best route to destination IP
 */
export function findRoute(destinationIp: string, routingTable: Route[]): Route | null {
  if (!destinationIp) {
    return null;
  }
  let bestRoute: Route | null = null;
  let bestPrefixLength = -1;

  const isTargetIpv6 = isIpv6(destinationIp);

  for (const route of routingTable) {
    if (!route.destination) {
      continue;
    }

    const isRouteIpv6 = isIpv6(route.destination);
    if (isTargetIpv6 !== isRouteIpv6) continue;

    if (isTargetIpv6) {
      if (route.prefixLength !== undefined && isIpv6InNetwork(destinationIp, route.destination, route.prefixLength)) {
        if (route.prefixLength > bestPrefixLength) {
          bestPrefixLength = route.prefixLength;
          bestRoute = route;
        }
      }
    } else {
      if (route.subnetMask && isIpInNetwork(destinationIp, route.destination, route.subnetMask)) {
        const prefixLength = getPrefixLength(route.subnetMask);
        if (prefixLength > bestPrefixLength) {
          bestPrefixLength = prefixLength;
          bestRoute = route;
        }
      }
    }
  }

  return bestRoute;
}

/**
 * Check if IP is in network
 */
function isIpInNetwork(ip: string, network: string, subnetMask: string): boolean {
  if (!ip || !network || !subnetMask) {
    return false;
  }
  try {
    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(network);
    const maskNum = ipToNumber(subnetMask);

    return (ipNum & maskNum) === (networkNum & maskNum);
  } catch {
    return false;
  }
}

/**
 * Check if address is IPv6
 */
export function isIpv6(address: string): boolean {
  return address.includes(':');
}

/**
 * Expand IPv6 shorthand address
 */
export function expandIpv6(address: string): string {
  if (!address.includes('::')) return address;
  const parts = address.split('::');
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts[1] ? parts[1].split(':') : [];
  const missing = 8 - (left.length + right.length);
  const middle = Array(missing).fill('0');
  return [...left, ...middle, ...right].map(p => p.padStart(4, '0')).join(':');
}

/**
 * Check if IPv6 address is in network
 */
export function isIpv6InNetwork(address: string, network: string, prefixLength: number): boolean {
  if (!address || !network || !isIpv6(address) || !isIpv6(network)) {
    return false;
  }
  try {
    const fullAddress = expandIpv6(address).split(':').map(p => parseInt(p, 16));
    const fullNetwork = expandIpv6(network).split(':').map(p => parseInt(p, 16));

    let bitsRemaining = prefixLength;
    for (let i = 0; i < 8; i++) {
      if (bitsRemaining <= 0) break;
      const bitsInThisGroup = Math.min(bitsRemaining, 16);
      const mask = (0xFFFF << (16 - bitsInThisGroup)) & 0xFFFF;

      if ((fullAddress[i] & mask) !== (fullNetwork[i] & mask)) {
        return false;
      }
      bitsRemaining -= bitsInThisGroup;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert IP string to number
 */
export function ipToNumber(ip: string): number {
  if (!ip) {
    throw new Error('IP address is undefined or empty');
  }
  const octets = ip.split('.');
  if (octets.length !== 4) {
    throw new Error('Invalid IP address format');
  }
  for (const octetStr of octets) {
    const octet = parseInt(octetStr, 10);
    if (isNaN(octet) || octet < 0 || octet > 255) {
      throw new Error('Invalid octet value');
    }
  }
  return octets.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Get network address from IP and subnet mask
 */
function getNetworkAddress(ip: string, subnetMask: string): string {
  if (!ip || !subnetMask) {
    return '0.0.0.0';
  }
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(subnetMask);
  const networkNum = ipNum & maskNum;

  return numberToIp(networkNum);
}

/**
 * Convert number to IP string
 */
function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.');
}

/**
 * Get prefix length from subnet mask
 */
function getPrefixLength(subnetMask: string): number {
  if (!subnetMask) {
    return 0;
  }
  const maskNum = ipToNumber(subnetMask);
  let count = 0;
  let temp = maskNum;

  while (temp) {
    count += temp & 1;
    temp >>>= 1;
  }

  return count;
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
    ? buildRoutingTable(deviceId, devices, connections, deviceStates)
    : buildBasicRoutingTable(state);

  return routes.sort((a, b) => {
    // Sort by type priority: connected < static < dynamic
    const typeOrder = { connected: 0, static: 1, dynamic: 2 };
    const typeDiff = typeOrder[a.type] - typeOrder[b.type];
    if (typeDiff !== 0) return typeDiff;

    // Then by metric
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
    if (port.ipAddress && port.subnetMask && !port.shutdown) {
      routes.push({
        destination: getNetworkAddress(port.ipAddress, port.subnetMask),
        subnetMask: port.subnetMask,
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
            subnetMask: '255.255.255.255',
            nextHop: portId,
            type: 'connected',
            metric: 0
          });
        }
      }
    }
  }

  // 2. Static routes
  if (state.staticRoutes) {
    routes.push(...state.staticRoutes);
  }

  // 3. Dynamic routes
  if (state.dynamicRoutes) {
    routes.push(...state.dynamicRoutes);
  }

  return routes;
}

export interface L3Hop {
  name: string;
  ip: string;
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

  // Helper to find a device by IP address
  const findDeviceByIp = (ip: string): CanvasDevice | undefined => {
    // 1. Check direct device properties
    const directMatch = devices.find(d => d.ip === ip || d.ipv6 === ip);
    if (directMatch) return directMatch;
    // 2. Check port configurations in deviceStates
    for (const [devId, state] of deviceStates.entries()) {
      for (const port of Object.values(state.ports || {})) {
        if (port.ipAddress === ip || port.ipv6Address === ip) {
          return devices.find(d => d.id === devId);
        }
      }
    }
    return undefined;
  };

  const isIpInSubnetLocal = (ip1: string, ip2: string, mask: string): boolean => {
    try {
      return getNetworkAddress(ip1, mask) === getNetworkAddress(ip2, mask);
    } catch {
      return false;
    }
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
    
    // Check if targetIp is directly connected
    let targetIsDirectlyConnected = false;
    if (currentState) {
      for (const port of Object.values(currentState.ports || {})) {
        if (port.ipAddress && port.subnetMask) {
          if (isIpInSubnetLocal(port.ipAddress, targetIp, port.subnetMask)) {
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
    } else {
      if (currentDevice.ip && currentDevice.subnet) {
        if (isIpInSubnetLocal(currentDevice.ip, targetIp, currentDevice.subnet)) {
          targetIsDirectlyConnected = true;
        }
      }
    }

    if (targetIsDirectlyConnected) {
      hops.push({
        name: targetDevice.name,
        ip: targetIp
      });
      break;
    }

    // Not directly connected - Route it
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
