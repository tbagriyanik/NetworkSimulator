import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { NetworkPacketFrame } from './packetFrame';
import { getRoutingTable, findRouteDetailed } from '@/lib/network/routing';
import { buildConnectionIndex } from '@/lib/network/connectionIndex';
import { checkRpf, getPrunedPorts } from './multicastEngine';

/**
 * Determine egress ports for a frame on a device.
 * Returns port IDs, next-hop device ID, and route decision details if applicable.
 */
export function resolveEgress(
  frame: NetworkPacketFrame,
  device: CanvasDevice,
  state: SwitchState,
  connections: CanvasConnection[],
  deviceMap: Map<string, CanvasDevice>
): { egressPorts: string[]; nextDeviceId?: string; routeDecision?: string } {
  const egressPorts: string[] = [];
  let nextDeviceId: string | undefined;
  let routeDecision: string | undefined;
  const connectionIndex = buildConnectionIndex(connections);

  // Check if frame reached its final destination host
  if ((device.type === 'pc' || device.type === 'iot' || device.type === 'printer') && frame.ingressDeviceId === device.id) {
    return { egressPorts: [], nextDeviceId: undefined, routeDecision: `Packet delivered to destination host ${device.name}` };
  }

  const multicastGroup = frame.dstIp && frame.dstIp.split('.').length === 4
    ? Number(frame.dstIp.split('.')[0]) >= 224 && Number(frame.dstIp.split('.')[0]) <= 239
    : false;

  if (device.type === 'switchL2' || device.type === 'switchL3' || device.type === 'hub') {
    if (multicastGroup && (state.multicastRoutingEnabled || state.igmpSnoopingEnabled !== false)) {
      // Multicast forwarding to joined IGMP receiver ports or PIM interfaces
      Object.values(state.ports || {}).forEach((port) => {
        const joined = port.igmpGroups?.includes(frame.dstIp as string);
        const pimForwarding = Boolean(port.pimMode);
        if (port.id !== frame.ingressPortId && !port.shutdown && port.status === 'connected' && (joined || pimForwarding)) {
          egressPorts.push(port.id);
        }
      });
      if (egressPorts.length > 0) {
        routeDecision = `L2 Multicast IGMP/PIM forwarding to joined ports: ${egressPorts.join(', ')}`;
        const firstPort = egressPorts[0];
        const conn = connectionIndex.byPort.get(`${device.id}:${firstPort}`);
        if (conn) {
          nextDeviceId = conn.sourceDeviceId === device.id ? conn.targetDeviceId : conn.sourceDeviceId;
        }
      } else if (state.multicastRoutingEnabled) {
        routeDecision = `L2 Multicast drop: No active IGMP members or PIM neighbors for group ${frame.dstIp}`;
      } else {
        // Plain L2 broadcast flood fallback for un-snooped multicast
        Object.values(state.ports || {}).forEach((p) => {
          if (p.id !== frame.ingressPortId && !p.shutdown && p.status === 'connected') {
            egressPorts.push(p.id);
          }
        });
        routeDecision = `L2 Multicast Flood across active ports for group ${frame.dstIp}`;
      }
    } else if (device.type === 'hub' || frame.dstMac === 'ff:ff:ff:ff:ff:ff' || !frame.dstMac) {
      // Flood to all active ports except ingress
      Object.values(state.ports || {}).forEach(p => {
        if (p.id !== frame.ingressPortId && !p.shutdown && p.status === 'connected') {
          egressPorts.push(p.id);
        }
      });
      routeDecision = 'L2 Broadcast/Multicast — Flooding frame to all active ports';
    } else {
      const match = state.macAddressTable?.find(m => m.mac.toLowerCase() === frame.dstMac?.toLowerCase());
      if (match?.port && match.port !== frame.ingressPortId && !state.ports?.[match.port]?.shutdown) {
        egressPorts.push(match.port);
        routeDecision = `L2 Unicast match: MAC ${frame.dstMac} learned on port ${match.port} (VLAN ${match.vlan})`;
        const conn = connectionIndex.byPort.get(`${device.id}:${match.port}`);
        if (conn) {
          nextDeviceId = conn.sourceDeviceId === device.id ? conn.targetDeviceId : conn.sourceDeviceId;
        }
      } else {
        // Unicast miss — flood
        Object.values(state.ports || {}).forEach(p => {
          if (p.id !== frame.ingressPortId && !p.shutdown && p.status === 'connected') {
            egressPorts.push(p.id);
          }
        });
        routeDecision = `L2 Unicast miss for MAC ${frame.dstMac} — Flooding frame across VLAN ${frame.vlanId || 1}`;
      }
    }
  } else if (device.type === 'router' || device.type === 'firewall') {
    if (multicastGroup) {
      if (state.multicastRoutingEnabled) {
        // RPF check: drop if packet arrives on wrong interface
        if (frame.srcIp && frame.ingressPortId) {
          const rpf = checkRpf(state, frame.srcIp, frame.ingressPortId);
          if (!rpf.passed) {
            routeDecision = `L3 Multicast RPF check failed: expected ingress on ${rpf.expectedInterface ?? '?'}, got ${frame.ingressPortId}. Packet dropped.`;
            return { egressPorts: [], routeDecision };
          }
        }

        // TTL decrement check
        if (frame.ttl !== undefined && frame.ttl <= 1) {
          routeDecision = `L3 Multicast TTL exhausted (TTL=${frame.ttl}). Packet dropped.`;
          return { egressPorts: [], routeDecision };
        }

        const prunedPorts = getPrunedPorts(state, frame.dstIp as string);

        Object.values(state.ports || {}).forEach((port) => {
          const joined = port.igmpGroups?.includes(frame.dstIp as string);
          const pimForwarding = Boolean(port.pimMode);
          const isDensePruned = prunedPorts.includes(port.id);
          if (
            port.id !== frame.ingressPortId &&
            !port.shutdown &&
            (joined || pimForwarding) &&
            !isDensePruned
          ) {
            egressPorts.push(port.id);
          }
        });
        if (state.mrouteEntries && Array.isArray(state.mrouteEntries)) {
          state.mrouteEntries.forEach((entry) => {
            if (entry.group === frame.dstIp || entry.group === '224.0.0.0/4' || entry.group === '*') {
              (entry.outgoingInterfaces || []).forEach((outPort: string) => {
                const portKey = Object.keys(state.ports || {}).find((k) => k.toLowerCase() === outPort.toLowerCase()) || outPort;
                if (portKey !== frame.ingressPortId && !state.ports?.[portKey]?.shutdown && !egressPorts.includes(portKey)) {
                  egressPorts.push(portKey);
                }
              });
            }
          });
        }
        if (egressPorts.length > 0) {
          routeDecision = `L3 Multicast forwarding for group ${frame.dstIp} via PIM/IGMP OIL (${egressPorts.join(', ')})`;
          const firstPort = egressPorts[0];
          const conn = connectionIndex.byPort.get(`${device.id}:${firstPort}`);
          if (conn) {
            nextDeviceId = conn.sourceDeviceId === device.id ? conn.targetDeviceId : conn.sourceDeviceId;
            if (nextDeviceId) {
              const nextDevice = deviceMap.get(nextDeviceId);
              if (!nextDevice) nextDeviceId = undefined;
            }
          }
        } else {
          routeDecision = `L3 Multicast drop: No active PIM/IGMP receivers or mroute OIL for group ${frame.dstIp}`;
        }
      } else {
        routeDecision = `L3 Multicast drop: 'ip multicast-routing' is disabled on router`;
      }
    } else if (frame.dstIp) {
      const deviceMap2 = new Map<string, SwitchState>([[device.id, state]]);
      const table = getRoutingTable(device.id, deviceMap2);
      const detailed = findRouteDetailed(frame.dstIp, table);
      if (detailed && (detailed.route.interfaceId || detailed.route.nextHop)) {
        const portId = detailed.route.interfaceId || detailed.route.nextHop;
        egressPorts.push(portId);
        routeDecision = detailed.explanation;
        const conn = connectionIndex.byPort.get(`${device.id}:${portId}`);
        if (conn) {
          nextDeviceId = conn.sourceDeviceId === device.id ? conn.targetDeviceId : conn.sourceDeviceId;
          if (nextDeviceId) {
            const nextDevice = deviceMap.get(nextDeviceId);
            if (!nextDevice) nextDeviceId = undefined;
          }
        }
      }
    }
  } else if (device.type === 'cloud') {
    (device.ports || []).forEach(p => {
      if (p.id !== frame.ingressPortId && !p.shutdown && p.status === 'connected') {
        egressPorts.push(p.id);
      }
    });
    routeDecision = 'Cloud hub forwarding to attached interfaces';
  } else {
    // End devices (PC, IoT, Server, etc.): send via connected active link
    const conn = connections.find(c => c.active && (c.sourceDeviceId === device.id || c.targetDeviceId === device.id));
    if (conn) {
      const portId = conn.sourceDeviceId === device.id ? conn.sourcePort : conn.targetPort;
      egressPorts.push(portId);
      nextDeviceId = conn.sourceDeviceId === device.id ? conn.targetDeviceId : conn.sourceDeviceId;
      routeDecision = `Host egress via port ${portId} toward ${nextDeviceId}`;
    } else if (device.ports && device.ports.length > 0) {
      const p = device.ports.find(pt => pt.status === 'connected' && !pt.shutdown) || device.ports[0];
      if (p) {
        egressPorts.push(p.id);
        routeDecision = `Host egress via port ${p.id}`;
      }
    }
  }

  return { egressPorts, nextDeviceId, routeDecision };
}
