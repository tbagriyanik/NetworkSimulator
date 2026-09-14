import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { IndexedConnection } from '@/lib/network/connectionIndex';
import { findRoute, getRoutingTable, isIpv6InNetwork } from '@/lib/network/routing';
import { getPrimaryDeviceIp, getSubnetForDeviceIp, isIpInSubnet } from '@/lib/network/connectivity.utils';
import { ConnectivityResult } from './types';

export type L3RoutingDeps = {
  sourceId: string;
  deviceStates?: Map<string, SwitchState>;
  sourceDeviceForSubnet: CanvasDevice | undefined;
  targetDevice: CanvasDevice;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceMap: Map<string, CanvasDevice>;
  safeDeviceStates: Map<string, SwitchState>;
  adjacency: Map<string, IndexedConnection[]>;
  path: string[];
  hopNames: string[];
  sourceIp: string;
  resolvedTargetIp: string;
  language: 'tr' | 'en';
};

export type L3RoutingResult =
  | { type: 'error'; result: ConnectivityResult }
  | { type: 'ok'; routingRequired: boolean };

export function validateL3Routing(deps: L3RoutingDeps): L3RoutingResult {
  const { sourceId, deviceStates, sourceDeviceForSubnet, targetDevice, devices, connections, deviceMap, safeDeviceStates, adjacency, path, hopNames, sourceIp, resolvedTargetIp, language } = deps;

  const isTargetIpv6 = resolvedTargetIp.includes(':');
  let routingRequired = false;

  // 2.5. Check subnet compatibility (Layer 3)
  if (sourceDeviceForSubnet && targetDevice) {
    const isSourceIpv6 = sourceIp.includes(':');

    let isInSameSubnet = false;
    if (isTargetIpv6 && isSourceIpv6) {
      // Find prefix length for source
      let prefixLength = 64;
      if (deviceStates) {
        // BOLT: Use pre-resolved safeDeviceStates
        const state = safeDeviceStates.get(sourceId);
        if (state) {
          for (const pId in state.ports) {
            if (state.ports[pId].ipv6Address === sourceIp) {
              prefixLength = state.ports[pId].ipv6Prefix || 64;
              break;
            }
          }
        }
      }
      isInSameSubnet = isIpv6InNetwork(resolvedTargetIp, sourceIp, prefixLength);
    } else if (!isTargetIpv6 && !isSourceIpv6) {
      // BOLT: Use pre-resolved safeDeviceStates
      const sourceSubnet = getSubnetForDeviceIp(sourceId, sourceIp, devices, safeDeviceStates) || sourceDeviceForSubnet.subnet || '255.255.255.0';
      const targetSubnet = targetDevice.subnet || '255.255.255.0';

      const isSourceInSameSubnet = isIpInSubnet(sourceIp, resolvedTargetIp, sourceSubnet);
      const isTargetInSameSubnet = isIpInSubnet(resolvedTargetIp, sourceIp, targetSubnet);

      // Both sides must consider each other in their local subnet for direct L2 communication without a gateway/router
      isInSameSubnet = isSourceInSameSubnet && isTargetInSameSubnet;
    }

    routingRequired = !isInSameSubnet;

    if (!isInSameSubnet) {
      // 1. Source host (PC/IoT/Mobile/Printer) needs a configured gateway in its own subnet to reach an outside subnet
      if (sourceDeviceForSubnet.type === 'pc' || sourceDeviceForSubnet.type === 'iot' || sourceDeviceForSubnet.type === 'mobile' || sourceDeviceForSubnet.type === 'printer') {
        const sourceGateway = sourceDeviceForSubnet.gateway;
        if (!sourceGateway) {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames.slice(0, 1),
              hopIds: path.slice(0, 1),
              targetId: targetDevice.id,
              error: language === 'tr'
                ? `Ağ geçidi (Default Gateway) yapılandırılmamış.`
                : `Default Gateway is not configured on source host.`
            }
          };
        }
        // Gateway must be within the source's own subnet
        const sourceSubnet = getSubnetForDeviceIp(sourceId, sourceIp, devices, safeDeviceStates) || sourceDeviceForSubnet.subnet || '255.255.255.0';
        if (!isIpInSubnet(sourceIp, sourceGateway, sourceSubnet)) {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames.slice(0, 1),
              hopIds: path.slice(0, 1),
              targetId: targetDevice.id,
              error: language === 'tr'
                ? `Ağ geçidi (Default Gateway) kaynak cihaz ile aynı ağ bloğunda değil.`
                : `Default Gateway is not in the same subnet as the source host.`
            }
          };
        }
      }

      // 2. Target host (PC/IoT/Mobile/Printer) needs a configured gateway in its own subnet to send replies back to an outside subnet
      if (targetDevice.type === 'pc' || targetDevice.type === 'iot' || targetDevice.type === 'mobile' || targetDevice.type === 'printer') {

        const targetGateway = targetDevice.gateway;
        const targetIpToCheck = resolvedTargetIp;
        const targetSubnet = targetDevice.subnet || '255.255.255.0';
        if (!targetGateway) {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames,
              hopIds: path,
              targetId: targetDevice.id,
              error: language === 'tr'
                ? `Hedef cihazın Ağ Geçidi (Default Gateway) yapılandırılmamış.`
                : `Default Gateway is not configured on target host.`
            }
          };
        }
        if (!isIpInSubnet(targetIpToCheck, targetGateway, targetSubnet)) {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames,
              hopIds: path,
              targetId: targetDevice.id,
              error: language === 'tr'
                ? `Hedef cihazın Ağ Geçidi (Default Gateway) hedef ağ bloğunda değil.`
                : `Default Gateway is not in the same subnet as the target host.`
            }
          };
        }
      }

      // Different subnets - check if there's a Layer-3 routing device in path with proper routes
      let hasL3Gateway = false;

      // Find the first L3 device in the path (the one that will actually route the packet)
      for (const deviceId of path) {
        const device = deviceMap.get(deviceId);
        // BOLT: Use pre-resolved safeDeviceStates
        const state = safeDeviceStates.get(deviceId);
        if (device && (device.type === 'router' || device.type === 'switchL3') && state?.ipRouting) {
          // Check for PBR (Policy-Based Routing)
          let hasPbrRoute = false;
          for (const p of Object.values(state.ports || {})) {
            if (p.policyRouteMap && state.routeMaps?.[p.policyRouteMap]) {
              const clauses = state.routeMaps[p.policyRouteMap];
              const pbrClause = clauses.find(c => c.setRules?.nextHop);
              if (pbrClause) {
                hasPbrRoute = true;
                break;
              }
            }
          }

          // Check if this router has a route to the destination network
          const routingTable = getRoutingTable(deviceId, safeDeviceStates, devices, connections);
          const route = findRoute(resolvedTargetIp, routingTable);
          if (hasPbrRoute || route || targetDevice.type === 'cloud') {
            hasL3Gateway = true;
            break;
          } else {
            // First L3 device in path doesn't have a route - packet will be dropped
            return {
              type: 'error',
              result: {
                success: false,
                hops: hopNames,
                hopIds: path,
                targetId: targetDevice.id,
                error: language === 'tr'
                  ? `Hedefe rota bulunamadı. Statik rota yapılandırması gerekli.`
                  : `No route to destination. Static route configuration required.`
              }
            };
          }
        }
      }

      // If no router in path with proper route, try to find a connected router
      if (!hasL3Gateway) {
        // Find all routers in the topology
        const routers = devices.filter(d => (d.type === 'router' || d.type === 'switchL3'));
        for (const router of routers) {
          // BOLT: Use pre-resolved safeDeviceStates
          const routerState = safeDeviceStates.get(router.id);
          if (routerState?.ipRouting) {
            // Check if router has a route to destination
            const routingTable = getRoutingTable(router.id, safeDeviceStates, devices, connections);
            const route = findRoute(resolvedTargetIp, routingTable);
            if (!route && targetDevice.type !== 'cloud') continue; // Skip routers without proper route

            // Check if router is connected to any device in the path
            for (const pathDeviceId of path) {
              const conn = adjacency.get(router.id)?.find(n => n.neighborId === pathDeviceId)?.connection;
              if (conn) {
                hasL3Gateway = true;
                // Add router to path (insert before the connected device)
                const pathIndex = path.indexOf(pathDeviceId);
                if (pathIndex !== -1) {
                  path.splice(pathIndex, 0, router.id);
                  hopNames.splice(pathIndex, 0, router.name);
                }
                break;
              }
            }
            if (hasL3Gateway) break;
          }
        }
      }

      if (!hasL3Gateway && targetDevice.type !== 'cloud') {
        return {
          type: 'error',
          result: {
            success: false,
            hops: hopNames,
            hopIds: path,
            targetId: targetDevice.id,
            error: language === 'tr'
              ? `Hedefe rota bulunamadı. Statik rota yapılandırması gerekli.`
              : `No route to destination. Static route configuration required.`
          }
        };
      }
    }
  }

  return { type: 'ok', routingRequired };
}

export type L3ConnectivityDeps = {
  deviceStates?: Map<string, SwitchState>;
  sourceId: string;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceMap: Map<string, CanvasDevice>;
  safeDeviceStates: Map<string, SwitchState>;
  path: string[];
  hopNames: string[];
  resolvedTargetIp: string;
  targetDevice: CanvasDevice;
  routingRequired: boolean;
  language: 'tr' | 'en';
};

export type L3ConnectivityResult =
  | { type: 'error'; result: ConnectivityResult }
  | { type: 'ok'; l3ConnectivityPossible: boolean };

export function checkL3Connectivity(deps: L3ConnectivityDeps): L3ConnectivityResult {
  const { deviceStates, sourceId, devices, connections, deviceMap, safeDeviceStates, path, hopNames, resolvedTargetIp, targetDevice, routingRequired, language } = deps;

  // 6. Layer 3 Routing Logic - Check if routing is possible between different subnets/VLANs
  let l3ConnectivityPossible = false;
  if (deviceStates) {
    // BOLT: Use pre-resolved safeDeviceStates
    const sourceState = safeDeviceStates.get(sourceId);

    // Check if source has routing capability and a route to target
    const isTargetIpv6 = resolvedTargetIp.includes(':');
    const sourceHasRouting = isTargetIpv6 ? (sourceState?.ipv6Enabled || sourceState?.ipRouting) : sourceState?.ipRouting;

    if (sourceHasRouting) {
      // BOLT: Use pre-resolved safeDeviceStates
      const sourceRoutes = getRoutingTable(sourceId, safeDeviceStates, devices, connections);
      const route = findRoute(resolvedTargetIp, sourceRoutes);

      if (route) {
        l3ConnectivityPossible = true;
      }
    }

    if (!l3ConnectivityPossible) {
      if (targetDevice.type === 'cloud') {
        l3ConnectivityPossible = true;
      } else {
        // Check if there's a router in the path that can route between VLANs
        for (const deviceId of path) {
          // BOLT: Use pre-resolved safeDeviceStates
          const state = safeDeviceStates.get(deviceId);
          const device = deviceMap.get(deviceId);
          const hasRouting = isTargetIpv6 ? (state?.ipv6Enabled || state?.ipRouting) : state?.ipRouting;

          if (hasRouting && (device?.type === 'router' || device?.type === 'switchL3')) {
            // Router in path - check if it has routes to both source and target networks
            // BOLT: Use pre-resolved safeDeviceStates
            const routes = getRoutingTable(deviceId, safeDeviceStates, devices, connections);
            // Get source IP from device data
            const srcIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates, isTargetIpv6);
            const sourceRoute = findRoute(srcIp, routes);
            const targetRoute = findRoute(resolvedTargetIp, routes);

            if (sourceRoute && (targetRoute || (targetDevice.type as string) === 'cloud')) {
              l3ConnectivityPossible = true;
              break;
            }
          }
        }
      }
    }

    // If routing was required but no router in the path could handle it
    if (routingRequired && !l3ConnectivityPossible) {
      // For different subnets, routing MUST be possible through an L3 device
      return {
        type: 'error',
        result: {
          success: false,
          hops: hopNames,
          hopIds: path,
          targetId: targetDevice.id,
          error: language === 'tr'
            ? 'Yönlendirme başarısız: Geçerli bir rota bulunamadı.'
            : 'Routing failed: No valid route found.'
        }
      };
    }
  }

  return { type: 'ok', l3ConnectivityPossible };
}