import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { ConnectionIndex } from '@/lib/network/connectionIndex';
import {
  getPrimaryDeviceIp,
  getSubnetForDeviceIp,
  isConnectionCableCompatible,
  isDevicePoweredOn,
  isIpInSubnet,
  isPortShutdown,
} from '@/lib/network/connectivity.utils';
import { getVlanSpecificSTPBlocking } from '../vlanAndSwitching';
import { checkSerialEncapsulation } from '../security';
import { ConnectivityResult } from './types';
import { getFallbackVlanFromPath } from './pathUtils';

export type PathFindingDeps = {
  sourceId: string;
  devices: CanvasDevice[];
  deviceMap: Map<string, CanvasDevice>;
  deviceStates?: Map<string, SwitchState>;
  safeDeviceStates: Map<string, SwitchState>;
  connections: CanvasConnection[];
  connectionIndex: ConnectionIndex;
  adjacency: ConnectionIndex['adjacency'];
  stpDeviceStates: Map<string, SwitchState>;
  ipMap: Map<string, string>;
  resolvedTargetIp: string;
  targetDevice: CanvasDevice;
  language: 'tr' | 'en';
};

export type PathFindingResult =
  | { type: 'error'; result: ConnectivityResult }
  | {
      type: 'ok';
      path: string[];
      sourceVlan: number;
      sourceIp: string;
      sourceDeviceForSubnet: CanvasDevice | undefined;
    };

export function findPath(deps: PathFindingDeps): PathFindingResult {
  const { sourceId, devices, deviceMap, deviceStates, safeDeviceStates, connections, connectionIndex, adjacency, stpDeviceStates, ipMap, resolvedTargetIp, targetDevice } = deps;

  // 2. Pathfinding with Gateway Routing support for inter-subnet communication
  const sourceVlan = getFallbackVlanFromPath(sourceId, { adjacency, deviceMap, deviceStates });
  const sourceDeviceForSubnet = deviceMap.get(sourceId);
  const isTargetIpv6 = resolvedTargetIp.includes(':');
  const sourceIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates, isTargetIpv6);
  const sourceSubnet = getSubnetForDeviceIp(sourceId, sourceIp, devices, safeDeviceStates) || sourceDeviceForSubnet?.subnet || '255.255.255.0';
  const targetSubnet = targetDevice.subnet || '255.255.255.0';
  const isDirectSubnet = isIpInSubnet(sourceIp, resolvedTargetIp, sourceSubnet) && isIpInSubnet(resolvedTargetIp, sourceIp, targetSubnet);

  let path: string[] = [];

  // If different subnets and source host has a configured gateway, route via gateway
  const sourceGatewayIp = sourceDeviceForSubnet?.gateway;

  const findPathBetween = (startId: string, endId: string, allowedVlan?: number): string[] | null => {
    const q: string[] = [startId];
    const v = new Set<string>([startId]);
    const p = new Map<string, string>();

    while (q.length > 0) {
      const cur = q.shift();
      if (!cur) break;
      if (cur === endId) break;

      const neighbors = adjacency.get(cur) || [];
      for (const { neighborId, connection: conn } of neighbors) {
        if (!v.has(neighborId) && conn) {
          const srcPortId = conn.sourceDeviceId === cur ? conn.sourcePort : conn.targetPort;
          const dstPortId = conn.sourceDeviceId === neighborId ? conn.sourcePort : conn.targetPort;
          const srcDev = deviceMap.get(cur);
          const dstDev = deviceMap.get(neighborId);

          const isSrcShutdown = isPortShutdown(cur, srcPortId, devices, safeDeviceStates, srcDev);
          const isDstShutdown = isPortShutdown(neighborId, dstPortId, devices, safeDeviceStates, dstDev);
          const isSrcPoweredOff = !isDevicePoweredOn(srcDev);
          const isDstPoweredOff = !isDevicePoweredOn(dstDev);
          const isSrcSTPBlocking = allowedVlan ? getVlanSpecificSTPBlocking(cur, srcPortId, allowedVlan, connections, stpDeviceStates, conn, connectionIndex) : false;
          const isDstSTPBlocking = allowedVlan ? getVlanSpecificSTPBlocking(neighborId, dstPortId, allowedVlan, connections, stpDeviceStates, conn, connectionIndex) : false;
          const isCableOk = isConnectionCableCompatible(conn, srcDev, dstDev);
          const isSerialEncapOk = checkSerialEncapsulation(cur, srcPortId, neighborId, dstPortId, safeDeviceStates);

          if (!isSrcShutdown && !isDstShutdown && !isSrcPoweredOff && !isDstPoweredOff && !isSrcSTPBlocking && !isDstSTPBlocking && isCableOk && isSerialEncapOk) {
            v.add(neighborId);
            p.set(neighborId, cur);
            q.push(neighborId);
          }
        }
      }
    }

    if (!v.has(endId)) return null;
    const res: string[] = [];
    let curr: string | undefined = endId;
    while (curr) {
      res.unshift(curr);
      curr = p.get(curr);
    }
    return res;
  };

  if (!isDirectSubnet && sourceGatewayIp && (sourceDeviceForSubnet?.type === 'pc' || sourceDeviceForSubnet?.type === 'iot' || sourceDeviceForSubnet?.type === 'mobile' || sourceDeviceForSubnet?.type === 'printer')) {

    // Find gateway device ID by gateway IP
    const gatewayDeviceId = ipMap.get(sourceGatewayIp.toLowerCase());
    if (gatewayDeviceId && gatewayDeviceId !== targetDevice.id) {
      const pathToGateway = findPathBetween(sourceId, gatewayDeviceId, sourceVlan);
      const pathFromGateway = findPathBetween(gatewayDeviceId, targetDevice.id);
      if (pathToGateway && pathFromGateway) {
        path = [...pathToGateway, ...pathFromGateway.slice(1)];
      } else if (pathToGateway && targetDevice.type === 'cloud') {
        // Ensure cloud is physically reachable from gateway (or directly connected)
        const cloudPathFromGw = findPathBetween(gatewayDeviceId, targetDevice.id);
        if (cloudPathFromGw) {
          path = [...pathToGateway, ...cloudPathFromGw.slice(1)];
        }
      }
    }
  }

  if (path.length === 0) {
    const directPath = findPathBetween(sourceId, targetDevice.id, sourceVlan);
    if (!directPath) {
      if (targetDevice.type === 'cloud' && sourceGatewayIp) {
        const gwId = ipMap.get(sourceGatewayIp.toLowerCase());
        if (gwId) {
          const gwPath = findPathBetween(sourceId, gwId, sourceVlan);
          const cloudPathFromGw = findPathBetween(gwId, targetDevice.id);
          if (gwPath && cloudPathFromGw) {
            path = [...gwPath, ...cloudPathFromGw.slice(1)];
          }
        }
      }
      if (path.length === 0) {
        return { type: 'error', result: { success: false, hops: [], hopIds: [], error: 'Destination host unreachable.' } };
      }
    } else {
      path = directPath;
    }
  }

  return { type: 'ok', path, sourceVlan, sourceIp, sourceDeviceForSubnet };
}