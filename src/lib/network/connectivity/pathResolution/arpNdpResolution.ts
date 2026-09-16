import { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { IndexedConnection } from '@/lib/network/connectionIndex';
import { performArpResolution, getMacFromArpCache } from '@/lib/network/arp';
import { performNdpResolution, getMacFromNdpCache } from '@/lib/network/ndp';
import { getPrimaryDeviceIp, getSubnetForDeviceIp, isIpInSubnet } from '@/lib/network/connectivity.utils';
import { isIpv6InNetwork } from '@/lib/network/routing';
import { CapturedPacket } from './types';

export type ArpBroadcast = { sourceIp: string; targetIp: string; isIpv6?: boolean } | null;

export type ArpNdpDeps = {
  sourceId: string;
  devices: CanvasDevice[];
  deviceMap: Map<string, CanvasDevice>;
  adjacency: Map<string, IndexedConnection[]>;
  safeDeviceStates: Map<string, SwitchState>;
  resolvedTargetIp: string;
  targetDevice: CanvasDevice;
  capturedPackets: CapturedPacket[];
};

export function performArpNdpResolution(deps: ArpNdpDeps): ArpBroadcast {
  const { sourceId, devices, deviceMap, adjacency, safeDeviceStates, resolvedTargetIp, targetDevice, capturedPackets } = deps;

  // 1.5. Perform ARP/NDP resolution if target is in same subnet
  const sourceDeviceForArp = deviceMap.get(sourceId);
  let arpBroadcast: ArpBroadcast = null;
  if (sourceDeviceForArp && targetDevice?.macAddress) {
    const sourceState = safeDeviceStates.get(sourceId);
    if (sourceState || safeDeviceStates.size === 0) {
      const isIpv6 = resolvedTargetIp.includes(':');
      const sourceIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates, isIpv6, sourceDeviceForArp);
      let isInSameSubnet = false;

      if (isIpv6) {
        let prefix = 64;
        if (sourceState) {
          for (const p of Object.values(sourceState.ports)) {
            if (p.ipv6Address?.toLowerCase() === sourceIp.toLowerCase() && p.ipv6Prefix) {
              prefix = p.ipv6Prefix;
              break;
            }
          }
        }
        // Need to import isIpv6InNetwork from routing, but we already have it at the top
        isInSameSubnet = isIpv6InNetwork(sourceIp, resolvedTargetIp, prefix);
      } else {
        const sourceSubnet = getSubnetForDeviceIp(sourceId, sourceIp, devices, safeDeviceStates, sourceDeviceForArp) || '255.255.255.0';
        isInSameSubnet = isIpInSubnet(sourceIp, resolvedTargetIp, sourceSubnet);
      }

      if (isInSameSubnet) {
        const sourceConn = adjacency.get(sourceId)?.[0]?.connection;
        const interfaceName = sourceConn ? (sourceConn.sourceDeviceId === sourceId ? sourceConn.sourcePort : sourceConn.targetPort) : 'unknown';

        if (isIpv6) {
          const cachedMac = getMacFromNdpCache(sourceId, resolvedTargetIp, safeDeviceStates);
          performNdpResolution(sourceId, resolvedTargetIp, targetDevice.macAddress, interfaceName, safeDeviceStates, targetDevice.type === 'router');

          if (!cachedMac && sourceConn) {
            arpBroadcast = { sourceIp, targetIp: resolvedTargetIp, isIpv6: true }; // piggyback on arpBroadcast flag for packet flooding
            // NS: Solicited-node multicast
            const parts = resolvedTargetIp.split(':');
            const lastPart = parts[parts.length - 1];
            // Format ff02::1:ff...
            capturedPackets.push({
              connectionId: sourceConn.id,
              sourceIp: sourceIp,
              targetIp: `ff02::1:ff00:${lastPart}`, // simplified multicast IP format
              protocol: 'ICMPv6',
              length: 72,
              info: `ICMPv6 NS: Who has ${resolvedTargetIp}?`
            });
          }
        } else {
          const cachedMac = getMacFromArpCache(sourceId, resolvedTargetIp, safeDeviceStates);
          performArpResolution(sourceId, resolvedTargetIp, targetDevice.macAddress, interfaceName, safeDeviceStates);

          if (!cachedMac && sourceConn) {
            arpBroadcast = { sourceIp, targetIp: resolvedTargetIp, isIpv6: false };
            capturedPackets.push({
              connectionId: sourceConn.id,
              sourceIp: sourceIp,
              targetIp: '255.255.255.255',
              protocol: 'ARP',
              length: 42,
              info: `ARP Request: Who has ${resolvedTargetIp}? Tell ${sourceIp}`
            });
          }
        }
      }
    }
  }

  return arpBroadcast;
}

