/**
 * multicastEngine.ts — Multicast Routing & IGMP Snooping Engine
 *
 * Implements:
 * - IGMPv2 / IGMPv3 Host Membership Reports & Group Joins/Leaves
 * - Layer 2 IGMP Snooping Table (VLAN + Multicast IP -> Port mapping)
 * - PIM-SM (Protocol Independent Multicast Sparse Mode) Rendezvous Point (RP) Shared Tree (*, G) lookup
 */

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
