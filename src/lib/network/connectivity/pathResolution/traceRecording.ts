import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { IndexedConnection } from '@/lib/network/connectionIndex';
import { learnMacAddress, findMacPort } from '@/lib/network/macLearning';
import { performArpResolution } from '@/lib/network/arp';
import { performNdpResolution } from '@/lib/network/ndp';
import { ConnectivityResult, CheckOptions, CapturedPacket, TraversedPort } from './types';
import { isSwitchDeviceType, isPortMemberOfVlan } from './pathUtils';
import { ArpBroadcast } from './arpNdpResolution';

export type TraceRecordingDeps = {
  sourceId: string;
  path: string[];
  deviceMap: Map<string, CanvasDevice>;
  adjacency: Map<string, IndexedConnection[]>;
  connections: CanvasConnection[];
  safeDeviceStates: Map<string, SwitchState>;
  resolvedTargetIp: string;
  targetDevice: CanvasDevice;
  sourceIp: string;
  sourceVlan: number;
  arpBroadcast: ArpBroadcast;
  language: 'tr' | 'en';
  options?: CheckOptions;
  traversedPorts: TraversedPort[];
  capturedPackets: CapturedPacket[];
};

export type TraceRecordingResult =
  | { type: 'error'; result: ConnectivityResult }
  | { type: 'ok'; pathConnections: Map<string, CanvasConnection> };

export function recordTrace(deps: TraceRecordingDeps): TraceRecordingResult {
  const { sourceId, path, deviceMap, adjacency, connections, safeDeviceStates, resolvedTargetIp, targetDevice, sourceIp, sourceVlan, arpBroadcast, language, options, traversedPorts, capturedPackets } = deps;

  // BOLT: Pre-calculate path-related connections for O(1) lookup in later stages
  const pathConnections = new Map<string, CanvasConnection>();
  let ttl = 64; // Default TTL

  for (let i = 0; i < path.length - 1; i++) {
    const aId = path[i];
    const bId = path[i + 1];
    const conn = adjacency.get(aId)?.find(n => n.neighborId === bId)?.connection;
    if (conn) {
      pathConnections.set(`${aId}-${bId}`, conn);
      pathConnections.set(`${bId}-${aId}`, conn);

      // Track ports used in this hop
      const srcPortId = conn.sourceDeviceId === aId ? conn.sourcePort : conn.targetPort;
      const dstPortId = conn.sourceDeviceId === bId ? conn.sourcePort : conn.targetPort;

      if (srcPortId) traversedPorts.push({ deviceId: aId, portId: srcPortId, type: 'egress' });
      if (dstPortId) traversedPorts.push({ deviceId: bId, portId: dstPortId, type: 'ingress' });

      const aDevice = deviceMap.get(aId);
      const bDevice = deviceMap.get(bId);
      const bState = safeDeviceStates.get(bId);
      const sourceMac = deviceMap.get(sourceId)?.macAddress;
      const targetMac = targetDevice.macAddress;

      // TTL Control: Decrement TTL at each hop through a router
      if (aDevice && (aDevice.type === 'router' || aDevice.type === 'switchL3')) {
        ttl--;
        if (ttl <= 0) {
          return {
            type: 'error',
            result: {
              success: false,
              hops: path.slice(0, i + 1).map(id => deviceMap.get(id)?.name || id),
              hopIds: path.slice(0, i + 1),
              targetId: targetDevice.id,
              error: language === 'tr' ? 'ICMP Zaman AÅŸÄ±mÄ± (TTL exceeded)' : 'ICMP Time Exceeded (TTL expired)'
            }
          };
        }
      }

      // MAC Learning on switch (ingress) - Hubs do not learn MAC addresses
      if (bDevice && isSwitchDeviceType(bDevice.type) && bDevice.type !== 'hub' && bState && sourceMac) {
        learnMacAddress(bId, sourceMac, dstPortId, sourceVlan, safeDeviceStates);
      }

      // ARP/NDP learning on L3 devices (routers, L3 switches) when packet traverses
      if (aDevice && (aDevice.type === 'router' || aDevice.type === 'switchL3') && sourceMac && sourceIp) {
        if (sourceIp.includes(':')) {
          performNdpResolution(aId, sourceIp, sourceMac, srcPortId || 'Vlan1', safeDeviceStates, aDevice.type === 'router');
        } else {
          performArpResolution(aId, sourceIp, sourceMac, srcPortId || 'Vlan1', safeDeviceStates);
        }
      }
      if (bDevice && (bDevice.type === 'router' || bDevice.type === 'switchL3') && sourceMac && sourceIp) {
        if (sourceIp.includes(':')) {
          performNdpResolution(bId, sourceIp, sourceMac, dstPortId || 'Vlan1', safeDeviceStates, bDevice.type === 'router');
        } else {
          performArpResolution(bId, sourceIp, sourceMac, dstPortId || 'Vlan1', safeDeviceStates);
        }
      }

      // Learn target ARP/NDP on router / L3 switch next to destination
      if (i === path.length - 2 && (aDevice?.type === 'router' || aDevice?.type === 'switchL3') && targetMac && resolvedTargetIp) {
        if (resolvedTargetIp.includes(':')) {
          performNdpResolution(aId, resolvedTargetIp, targetMac, srcPortId || 'Vlan1', safeDeviceStates, targetDevice.type === 'router');
        } else {
          performArpResolution(aId, resolvedTargetIp, targetMac, srcPortId || 'Vlan1', safeDeviceStates);
        }
      }

      let packetInfo = options?.protocol === 'icmp' ? 'Echo Request' : 'Data Packet';

      // If current device is a switch or hub, check frame forwarding/flooding logic
      if (aDevice && isSwitchDeviceType(aDevice.type)) {
        if (aDevice.type === 'hub') {
          packetInfo += ' (Hub L1 Signal Repeated)';
        } else if (targetMac) {
          const knownPort = findMacPort(aId, targetMac, sourceVlan, safeDeviceStates);
          if (!knownPort) {
            packetInfo += ' (Flooded)';
          }
        }
      }

      // Track packets for capture
      capturedPackets.push({
        connectionId: conn.id,
        sourceIp: sourceIp,
        targetIp: resolvedTargetIp,
        protocol: options?.protocol?.toUpperCase() || 'ICMP',
        length: 74,
        info: packetInfo
      });

      // Record Layer-1 signal repetition on all other ports of a Hub
      if (bDevice && bDevice.type === 'hub') {
        const neighbors = adjacency.get(bId) || [];
        for (const { connection: hubConn } of neighbors) {
          if (!hubConn || hubConn.active === false || hubConn.id === conn.id) continue;
          capturedPackets.push({
            connectionId: hubConn.id,
            sourceIp: sourceIp,
            targetIp: resolvedTargetIp,
            protocol: options?.protocol?.toUpperCase() || 'ICMP',
            length: 74,
            info: `${packetInfo} (Hub L1 Broadcast)`
          });
        }
      }

    }
  }

  // Record the ARP broadcast request on every switch flood port (all ports except the incoming one)
  // and the ARP reply on every cable of the path, so both also appear in the capture list of
  // each cable the packets traverse.
  if (arpBroadcast) {
    // ARP Reply (unicast) traverses the full path back to the source
    for (let i = 0; i < path.length - 1; i++) {
      const aId = path[i];
      const bId = path[i + 1];
      const conn = pathConnections.get(`${aId}-${bId}`);
      if (conn) {
        if (arpBroadcast.isIpv6) {
          capturedPackets.push({
            connectionId: conn.id,
            sourceIp: arpBroadcast.targetIp,
            targetIp: arpBroadcast.sourceIp,
            protocol: 'ICMPv6',
            length: 72,
            info: `ICMPv6 NA: ${arpBroadcast.targetIp} is at ${targetDevice.macAddress}`
          });
        } else {
          capturedPackets.push({
            connectionId: conn.id,
            sourceIp: arpBroadcast.targetIp,
            targetIp: arpBroadcast.sourceIp,
            protocol: 'ARP',
            length: 42,
            info: `ARP Reply: ${arpBroadcast.targetIp} is at ${targetDevice.macAddress}`
          });
        }
      }
    }
    // ARP Request (broadcast) floods on every switch port except the incoming one
    // and every switch that receives the broadcast learns the source MAC on its
    // ingress port (switch MAC table update).
    const sourceMac = deviceMap.get(sourceId)?.macAddress;
    for (let i = 0; i < path.length - 1; i++) {
      const aId = path[i];
      const bId = path[i + 1];
      const bDev = deviceMap.get(bId);
      if (!bDev || !isSwitchDeviceType(bDev.type)) continue;
      const incomingConn = pathConnections.get(`${aId}-${bId}`);
      const neighbors = adjacency.get(bId) || [];
      for (const { connection: conn } of neighbors) {
        if (!conn || conn.active === false) continue;
        if (conn.id === incomingConn?.id) continue;
        const switchPortId = conn.sourceDeviceId === bId ? conn.sourcePort : conn.targetPort;
        const switchPort = safeDeviceStates.get(bId)?.ports?.[switchPortId];
        if (!isPortMemberOfVlan(switchPort, sourceVlan, bDev.type)) continue;

        if (arpBroadcast.isIpv6) {
          const parts = arpBroadcast.targetIp.split(':');
          const lastPart = parts[parts.length - 1];
          capturedPackets.push({
            connectionId: conn.id,
            sourceIp: arpBroadcast.sourceIp,
            targetIp: `ff02::1:ff00:${lastPart}`,
            protocol: 'ICMPv6',
            length: 72,
            info: `ICMPv6 NS: Who has ${arpBroadcast.targetIp}?`
          });
        } else {
          capturedPackets.push({
            connectionId: conn.id,
            sourceIp: arpBroadcast.sourceIp,
            targetIp: '255.255.255.255',
            protocol: 'ARP',
            length: 42,
            info: `ARP Request: Who has ${arpBroadcast.targetIp}? Tell ${arpBroadcast.sourceIp}`
          });
        }

        // The neighbor switch learns the broadcast source MAC on its ingress port (Hubs do not learn MACs)
        const floodNeighborId = conn.sourceDeviceId === bId ? conn.targetDeviceId : conn.sourceDeviceId;
        const floodNeighbor = deviceMap.get(floodNeighborId);
        if (floodNeighbor && isSwitchDeviceType(floodNeighbor.type) && floodNeighbor.type !== 'hub' && sourceMac) {
          const ingressPort = conn.sourceDeviceId === floodNeighborId ? conn.sourcePort : conn.targetPort;
          learnMacAddress(floodNeighborId, sourceMac, ingressPort, sourceVlan, safeDeviceStates);
        }

      }
    }
  }

  // 2.5 Block ping over console-only links (console is management, no ICMP)
  // Only block if the ENTIRE path is console connections (no other data path available)
  let hasConsoleConnection = false;
  let hasNonConsoleConnection = false;

  for (let i = 0; i < path.length - 1; i++) {
    const aId = path[i];
    const bId = path[i + 1];
    const conn = connections.find(c =>
      ((c.sourceDeviceId === aId && c.targetDeviceId === bId) ||
       (c.sourceDeviceId === bId && c.targetDeviceId === aId)) &&
      c.active !== false
    );
    if (conn?.cableType === 'console') {
      hasConsoleConnection = true;
    } else {
      hasNonConsoleConnection = true;
    }
  }

  // Only block if path has console connection AND no other data connections (like wireless)
  if (hasConsoleConnection && !hasNonConsoleConnection) {
    return {
      type: 'error',
      result: {
        success: false,
        hops: path.map(id => deviceMap.get(id)?.name || id),
        hopIds: path,
        targetId: targetDevice.id,
        error: language === 'tr'
          ? 'Console baÄŸlantÄ±sÄ± Ã¼zerinden ping yapÄ±lamaz.'
          : 'Ping cannot be sent over a console connection.'
      }
    };
  }

  return { type: 'ok', pathConnections };
}

