// © Network Simulator – mock multicast engine for unit tests (v7.1)
// ------------------------------------------------------------
// Provides a lightweight in‑memory implementation that satisfies the
// expectations of the `multicastEngine.test.ts` suite. It does **not**
// aim to be a full production engine; it merely offers the minimal API
// required for the tests: `processIGMP`, `processRP`, `markRPUnreachable`,
// `activeRP`, `defaultRP`, `groupMembers`, and `sourceTree`.

import type { SwitchState } from '@/lib/network/types/switchState';
import type { Port } from '@/lib/network/types/ports';

// Simple message definitions used by the test suite
export interface IGMPMessage {
  type: 'join' | 'leave';
  group: string;
  source: string;
}

export interface RPMessage {
  type: 'announce';
  rp: string;
  group: string;
}

// Public engine class
export class MulticastEngine {
  private state: SwitchState;
  private rpMap: Record<string, string[]> = {};
  private defaultRPAddress = '0.0.0.0';

  constructor(state: SwitchState) {
    this.state = state;
  }

  // Process an IGMP join/leave message
  processIGMP(msg: IGMPMessage) {
    const { type, group, source } = msg;
    const members = (this.state.ports ?? {}) as Record<string, Port>;
    // Find a port that matches the source IP (simplified lookup)
    let portId = Object.entries(members).find(([, p]) => p.ipAddress === source)?.[0];
    if (!portId) {
      portId = `dyn_${source}`;
      members[portId] = {
        id: portId,
        name: portId,
        status: 'connected',
        vlan: 1,
        mode: 'access',
        duplex: 'full',
        speed: '1000',
        shutdown: false,
        type: 'fastethernet',
        ipAddress: source,
        igmpGroups: [],
      } as Port;
    }
    if (!members[portId].igmpGroups) members[portId].igmpGroups = [];
    const groups = members[portId].igmpGroups!;
    if (type === 'join') {
      if (groups.includes(group)) {
        return { success: false, error: 'duplicate' };
      }
      groups.push(group);
      return { success: true };
    }
    // leave
    const idx = groups.indexOf(group);
    if (idx === -1) {
      return { success: false, error: 'not a member' };
    }
    groups.splice(idx, 1);
    return { success: true };
  }

  // Process an RP announcement
  processRP(msg: RPMessage) {
    const { rp, group } = msg;
    if (!this.rpMap[group]) this.rpMap[group] = [];
    if (!this.rpMap[group].includes(rp)) this.rpMap[group].push(rp);
    return { success: true };
  }

  // Simulate RP failure
  markRPUnreachable(rp: string) {
    for (const grp of Object.keys(this.rpMap)) {
      this.rpMap[grp] = this.rpMap[grp].filter((addr) => addr !== rp);
    }
  }

  // Return the active RP for a group – first in the list or default
  activeRP(group: string): string {
    const list = this.rpMap[group] ?? [];
    return list[0] ?? this.defaultRP();
  }

  defaultRP(): string {
    return this.defaultRPAddress;
  }

  // Helper to retrieve members of a group
  groupMembers(group: string): string[] {
    const members: string[] = [];
    for (const port of Object.values(this.state.ports ?? {})) {
      if (port.igmpGroups?.includes(group) && port.ipAddress) {
        members.push(port.ipAddress);
      }
    }
    return members;
  }

  // Source‑tree representation – list of distinct source IPs for a group
  sourceTree(group: string): string[] {
    const sources = new Set<string>();
    for (const port of Object.values(this.state.ports ?? {})) {
      if (port.igmpGroups?.includes(group) && port.ipAddress) {
        sources.add(port.ipAddress);
      }
    }
    return Array.from(sources);
  }
}

// Factory function used by the test suite
export function createMulticastEngine(state: SwitchState): MulticastEngine {
  return new MulticastEngine(state);
}
