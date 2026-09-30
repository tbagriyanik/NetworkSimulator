/**
 * multicastEngine.ts — Multicast CONTROL-PLANE HELPERS (pure functions).
 *
 * ── Ownership contract (tek sahiplik) ────────────────────────────────────────
 * This module owns *pure, stateless* multicast logic:
 *   - multicast address classification (224.0.0.0/4)
 *   - Layer 2 IGMP snooping table construction (VLAN + group → ports)
 *   - PIM-SM Rendezvous Point shared-tree (*, G) resolution
 *
 * It does NOT own any runtime state, timers or frame generation. Those belong
 * to `lib/network/forwarding/multicastEngine.ts` (per-device PIM Hello / IGMP
 * Query tick + pimNeighbors / mrouteEntries state), while the actual forwarding
 * decision (which ports a multicast frame leaves) is owned by
 * `lib/network/forwarding/packetPipelineResolution.ts`.
 *
 * Keeping the split this way means: helpers can be unit-tested without any
 * state, and only ONE module ever mutates each piece of switch state.
 */

import type { SwitchState } from './types';

export interface IgmpGroupMember {
  groupIp: string;      // e.g. "239.1.1.100"
  deviceId: string;
  portId: string;
  vlanId: number;
  joinedAtMs: number;
  lastReportMs: number;
}

export interface IgmpSnoopingEntry {
  vlanId: number;
  groupIp: string;
  egressPorts: string[];
}

export interface PimRendezvousPoint {
  rpIp: string;         // e.g. "10.255.255.1"
  groupRange: string;   // e.g. "224.0.0.0/4"
  rpDeviceId: string;
}

export interface PimRouteEntry {
  source: string;       // "*" for (*, G) or specific IP (S, G)
  group: string;        // e.g. "239.1.1.100"
  rpIp: string;
  upstreamInterface: string;
  downstreamInterfaces: string[];
  flags: string[];      // ["SPT", "JOINED", "RP"]
}

export function buildIgmpSnoopingTable(members: IgmpGroupMember[]): IgmpSnoopingEntry[] {
  const map = new Map<string, Set<string>>();

  members.forEach(member => {
    const key = `${member.vlanId}:${member.groupIp}`;
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    map.get(key)!.add(member.portId);
  });

  const entries: IgmpSnoopingEntry[] = [];
  map.forEach((ports, key) => {
    const [vlanStr, groupIp] = key.split(':');
    entries.push({
      vlanId: parseInt(vlanStr, 10),
      groupIp,
      egressPorts: Array.from(ports),
    });
  });

  return entries;
}

export function resolvePimSharedTree(
  groupIp: string,
  rpConfig: PimRendezvousPoint,
  members: IgmpGroupMember[]
): PimRouteEntry {
  const groupMembers = members.filter(m => m.groupIp === groupIp);
  const downstreamInterfaces = Array.from(new Set(groupMembers.map(m => m.portId)));

  return {
    source: '*',
    group: groupIp,
    rpIp: rpConfig.rpIp,
    upstreamInterface: 'GigabitEthernet0/0 (towards RP)',
    downstreamInterfaces,
    flags: ['SHARED_TREE', 'JOINED'],
  };
}

export function isValidMulticastIp(ip: string): boolean {
  const firstOctet = parseInt(ip.split('.')[0] || '0', 10);
  return firstOctet >= 224 && firstOctet <= 239;
}

/**
 * Single source of truth for multicast address classification. The runtime tick
 * engine re-exports this instead of keeping its own copy, so the two engines can
 * never disagree about what counts as multicast.
 */
export function isMulticastAddress(ip: string | undefined): boolean {
  return ip ? isValidMulticastIp(ip) : false;
}

/** Machine-readable map of which module owns which multicast concern. */
export const MULTICAST_OWNERSHIP = {
  controlPlaneHelpers: 'lib/network/multicastEngine',
  runtimeStateTick: 'lib/network/forwarding/multicastEngine',
  forwardingDecision: 'lib/network/forwarding/packetPipelineResolution',
} as const;

/**
 * Derive the L2 IGMP snooping table directly from a device state's per-port
 * IGMP group configuration (the state-driven counterpart of
 * buildIgmpSnoopingTable, which takes raw membership reports).
 */
export function buildIgmpSnoopingTableFromState(state: SwitchState): IgmpSnoopingEntry[] {
  const members: IgmpGroupMember[] = [];

  for (const [portId, port] of Object.entries(state.ports ?? {})) {
    for (const group of port.igmpGroups ?? []) {
      members.push({
        groupIp: group,
        deviceId: state.hostname ?? 'device',
        portId,
        vlanId: port.vlan ?? 1,
        joinedAtMs: 0,
        lastReportMs: 0,
      });
    }
  }

  return buildIgmpSnoopingTable(members);
}
