import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '../types';
import type { Route, RoutingLoopIssue, RouteDecisionDetails } from './routingTypes';

/**
 * Proactively detect routing loops by walking each device's routing table
 * next-hop chain. A loop exists when chasing a destination's next-hop path
 * revisits a device that was already on the path for the same destination.
 */
export function detectRoutingLoops(
  devices: CanvasDevice[],
  deviceStates: Map<string, SwitchState>,
  connections: CanvasConnection[] = [],
  buildRoutingTableFn: (deviceId: string, deviceStates: Map<string, SwitchState>) => Route[],
  findRouteDetailedFn: (destinationIp: string, routingTable: Route[]) => RouteDecisionDetails | null
): RoutingLoopIssue[] {
  const issues: RoutingLoopIssue[] = [];
  if (deviceStates.size === 0) return issues;

  // Map every configured IP (device-level + interface) to its owning device id.
  const ipToDevice = new Map<string, string>();
  devices.forEach(d => {
    if (d.ip) ipToDevice.set(d.ip, d.id);
    if (d.ipv6) ipToDevice.set(d.ipv6, d.id);
  });
  deviceStates.forEach((state, devId) => {
    Object.values(state.ports || {}).forEach(port => {
      if (port.ipAddress) ipToDevice.set(port.ipAddress, devId);
      if (port.ipv6Address) ipToDevice.set(port.ipv6Address, devId);
    });
  });

  // Resolve a (device, interface) to the peer device at the other end of the link.
  const interfaceToPeer = new Map<string, string>();
  connections.forEach(conn => {
    interfaceToPeer.set(`${conn.sourceDeviceId}:${conn.sourcePort}`, conn.targetDeviceId);
    interfaceToPeer.set(`${conn.targetDeviceId}:${conn.targetPort}`, conn.sourceDeviceId);
  });

  const resolveNextHop = (deviceId: string, nextHop: string): string | null => {
    const byIp = ipToDevice.get(nextHop);
    if (byIp) return byIp;
    const byInterface = interfaceToPeer.get(`${deviceId}:${nextHop}`);
    if (byInterface) return byInterface;
    if (nextHop === deviceId) return deviceId;
    return null;
  };

  const deviceNameById = (id: string) => devices.find(d => d.id === id)?.name || id;
  const isL3Device = (d: CanvasDevice) => d.type === 'router' || d.type === 'firewall' || d.type === 'switchL3';

  devices
    .filter(isL3Device)
    .forEach(source => {
      const table = buildRoutingTableFn(source.id, deviceStates);
      table
        .filter(r => r.type !== 'connected' && r.nextHop && r.nextHop !== '0.0.0.0')
        .forEach(route => {
          const dstKey = `${route.destination}/${route.subnetMask || route.prefixLength || ''}`;
          const path: string[] = [];
          const visitedKeys = new Set<string>();

          let currentDeviceId = resolveNextHop(source.id, route.nextHop);
          if (!currentDeviceId) return;

          let guard = 0;
          while (currentDeviceId && guard++ < 64) {
            // A next hop resolving back to the source device itself is not a
            // loop (dangling/interface route); stop the walk for this route.
            if (currentDeviceId === source.id && path.length === 0) break;

            const key = `${currentDeviceId}:${dstKey}`;
            if (visitedKeys.has(key)) {
              const startIdx = path.indexOf(deviceNameById(currentDeviceId));
              const loopPath = startIdx >= 0
                ? [...path.slice(startIdx), deviceNameById(currentDeviceId)]
                : [...path, deviceNameById(currentDeviceId)];
              issues.push({
                type: 'ROUTING_LOOP',
                deviceId: source.id,
                deviceName: source.name,
                destination: dstKey,
                nextHop: route.nextHop,
                loopPath,
                message: `%ROUTING-3-LOOP_DETECTED: Routing loop detected for ${dstKey}: ${loopPath.join(' \u2192 ')}`
              });
              break;
            }
            visitedKeys.add(key);
            path.push(deviceNameById(currentDeviceId));

            const nextState = deviceStates.get(currentDeviceId);
            if (!nextState) break;
            const nextTable = buildRoutingTableFn(currentDeviceId, deviceStates);
            const decision = findRouteDetailedFn(route.destination, nextTable);
            if (!decision?.route || decision.route.type === 'connected') break;
            const nextHopTarget = resolveNextHop(currentDeviceId, decision.route.nextHop);
            if (!nextHopTarget) break;
            currentDeviceId = nextHopTarget;
          }
        });
    });

  return issues;
}


