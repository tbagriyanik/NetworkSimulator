import { Route, ipToNumber } from './routing';
import { Port, SwitchState } from './types';

/**
 * EIGRP Topology Table Entry
 */
export interface EigrpTopologyEntry {
  destination: string;
  subnetMask: string;
  neighborId: string;
  neighborIp: string;
  interfaceId: string;

  // Metrics
  reportedDistance: number;    // RD (AD): Distance from neighbor to destination
  computedDistance: number;    // CD: Total distance from local router to destination via this neighbor
  feasibleDistance: number;    // FD: Lowest CD to destination seen by local router

  // DUAL Status
  isSuccessor: boolean;
  isFeasibleSuccessor: boolean;
  state: 'Passive' | 'Active';
}

const EIGRP_BANDWIDTH_REF = 10000000; // 10^7
const EIGRP_METRIC_SCALE = 256;

/**
 * Calculate EIGRP Metric (K1=1, K3=1, others=0)
 * Formula: 256 * ((10^7 / Bandwidth_min_kbps) + Total_Delay_tens_of_usec)
 */
export function calculateEigrpMetric(bandwidthKbps: number, delayMicroseconds: number): number {
  const bwComponent = Math.floor(EIGRP_BANDWIDTH_REF / Math.max(1, bandwidthKbps));
  const delayComponent = Math.floor(delayMicroseconds / 10);
  return EIGRP_METRIC_SCALE * (bwComponent + delayComponent);
}

/**
 * Build EIGRP Topology Table from device states
 */
export function buildEigrpTopologyTable(
  deviceId: string,
  deviceStates: Map<string, SwitchState>
): EigrpTopologyEntry[] {
  const state = deviceStates.get(deviceId);
  if (!state || state.routingProtocol !== 'eigrp' || !state.eigrpAs) return [];

  const topologyTable: EigrpTopologyEntry[] = [];
  const myAs = state.eigrpAs;

  deviceStates.forEach((otherState, otherId) => {
    if (otherId === deviceId) return;
    if (otherState.routingProtocol !== 'eigrp' || otherState.eigrpAs !== myAs) return;

    // Find the link to this neighbor
    let connectedPort: Port | undefined;
    let neighborIp: string | undefined;

    for (const port of Object.values(state.ports)) {
      if (!port.ipAddress || !port.subnetMask || port.shutdown) continue;

      const portIp = port.ipAddress;
      const portMask = port.subnetMask;
      if (!portIp || !portMask) continue;

      const neighborPort = Object.values(otherState.ports).find(p =>
        p.ipAddress && p.subnetMask && !p.shutdown &&
        getNetworkAddress(portIp, portMask) === getNetworkAddress(p.ipAddress, p.subnetMask)
      );

      if (neighborPort) {
        connectedPort = port;
        neighborIp = neighborPort.ipAddress;
        break;
      }
    }

    if (!connectedPort || !neighborIp) return;
    const port = connectedPort;
    const nip = neighborIp;

    // 1. Neighbor's connected networks
    Object.values(otherState.ports).forEach(otherPort => {
      if (!otherPort.ipAddress || !otherPort.subnetMask || otherPort.shutdown) return;

      const dest = getNetworkAddress(otherPort.ipAddress, otherPort.subnetMask);
      const rd = 0;
      const linkBw = getPortBandwidthKbps(port);
      const linkDelay = getPortDelayUsec(port);
      const cd = calculateEigrpMetric(linkBw, linkDelay) + rd;

      topologyTable.push({
        destination: dest,
        subnetMask: otherPort.subnetMask,
        neighborId: otherId,
        neighborIp: nip,
        interfaceId: port.id,
        reportedDistance: rd,
        computedDistance: cd,
        feasibleDistance: cd,
        isSuccessor: false,
        isFeasibleSuccessor: false,
        state: 'Passive'
      });
    });

    // 2. Routes neighbor learned (propagated RD)
    (otherState.dynamicRoutes || []).forEach(route => {
      if (route.type !== 'dynamic') return;

      const dest = route.destination;
      const mask = route.subnetMask || '255.255.255.0';
      const rd = route.metric || 0;

      const linkBw = getPortBandwidthKbps(port);
      const linkDelay = getPortDelayUsec(port);
      const cd = calculateEigrpMetric(linkBw, linkDelay) + rd;

      topologyTable.push({
        destination: dest,
        subnetMask: mask,
        neighborId: otherId,
        neighborIp: nip,
        interfaceId: port.id,
        reportedDistance: rd,
        computedDistance: cd,
        feasibleDistance: cd,
        isSuccessor: false,
        isFeasibleSuccessor: false,
        state: 'Passive'
      });
    });
  });

  return topologyTable;
}

/**
 * Run DUAL Algorithm to select successors and feasible successors
 */
export function runEigrpDual(topologyTable: EigrpTopologyEntry[]): EigrpTopologyEntry[] {
  const destinations = new Set(topologyTable.map(e => `${e.destination}/${e.subnetMask}`));

  destinations.forEach(destStr => {
    const [dest, mask] = destStr.split('/');
    const entries = topologyTable.filter(e => e.destination === dest && e.subnetMask === mask);
    if (entries.length === 0) return;

    // 1. Select Successor (Lowest CD)
    entries.sort((a, b) => a.computedDistance - b.computedDistance);
    const successor = entries[0];
    successor.isSuccessor = true;
    const fd = successor.computedDistance;

    // Update FD for all entries of this destination
    entries.forEach(e => e.feasibleDistance = fd);

    // 2. Select Feasible Successors (Feasibility Condition: RD < FD)
    entries.slice(1).forEach(e => {
      if (e.reportedDistance < fd) {
        e.isFeasibleSuccessor = true;
      }
    });
  });

  return topologyTable;
}

/**
 * Calculate EIGRP routes for a device
 */
export function calculateEigrpRoutes(
  deviceId: string,
  deviceStates: Map<string, SwitchState>
): Route[] {
  const table = buildEigrpTopologyTable(deviceId, deviceStates);
  const convergedTable = runEigrpDual(table);

  const routes: Route[] = [];
  convergedTable.forEach(entry => {
    if (entry.isSuccessor) {
      routes.push({
        destination: entry.destination,
        subnetMask: entry.subnetMask,
        nextHop: entry.neighborIp,
        type: 'dynamic',
        metric: entry.computedDistance
      });
    }
  });

  return routes;
}

function getPortBandwidthKbps(port: Port): number {
  if (port.bandwidth) return port.bandwidth;
  if (port.type === 'gigabitethernet') return 1000000;
  if (port.type === 'fastethernet') return 100000;
  if (port.type === 'serial') return 1544;
  return 100000;
}

function getPortDelayUsec(port: Port): number {
  if (port.delay !== undefined) return port.delay;
  if (port.type === 'gigabitethernet') return 10;
  if (port.type === 'fastethernet') return 100;
  if (port.type === 'serial') return 20000;
  return 100;
}

function getNetworkAddress(ip: string, subnetMask: string): string {
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(subnetMask);
  const networkNum = ipNum & maskNum;
  return numberToIp(networkNum);
}

function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.');
}
