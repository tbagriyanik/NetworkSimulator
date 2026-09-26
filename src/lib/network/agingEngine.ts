/**
 * agingEngine.ts — Real-time ARP and MAC Aging Engine
 *
 * Runs background aging checks to prune expired ARP cache entries and dynamic MAC entries.
 */

import { SwitchState } from './types';
import { cleanExpiredMacEntries, MacLifecycleEvent } from './macLearning';
import { cleanExpiredArpEntries } from './arp';
import { ageOutNatTranslations } from './forwarding/natEngine';

export interface AgingArpEvent {
  deviceId: string;
  ip: string;
  mac: string;
  interface: string;
}

export interface AgingResult {
  agedMacCount: number;
  agedArpCount: number;
  agedNatCount: number;
  events: MacLifecycleEvent[];
  arpEvents: AgingArpEvent[];
}

// Protocol-aware NAT timeouts live in forwarding/natEngine.ts (TCP 120s /
// UDP 30s / ICMP 10s / default 60s). The aging engine delegates to it so
// both paths share one set of timeout constants.

/**
 * Execute real-time aging tick across all device states.
 */
export function runAgingTick(deviceStates: Map<string, SwitchState>): AgingResult {
  let agedMacCount = 0;
  let agedArpCount = 0;
  let agedNatCount = 0;
  const events: MacLifecycleEvent[] = [];
  const arpEvents: AgingArpEvent[] = [];

  for (const [deviceId, state] of deviceStates.entries()) {
    if (!state) continue;

    // MAC aging
    if (state.macAddressTable && state.macAddressTable.length > 0) {
      const prevCount = state.macAddressTable.length;
      const macEvents = cleanExpiredMacEntries(state, deviceId);
      const afterCount = state.macAddressTable.length;
      const removed = prevCount - afterCount;
      if (removed > 0) {
        agedMacCount += removed;
        events.push(...macEvents);
      }
    }

    // ARP aging
    if (state.arpCache && state.arpCache.length > 0) {
      const expiredArp = cleanExpiredArpEntries(state);
      if (expiredArp.length > 0) {
        agedArpCount += expiredArp.length;
        arpEvents.push(...expiredArp.map(e => ({ deviceId, ip: e.ip, mac: e.mac, interface: e.interface })));
      }
    }

    // NAT translation session aging (delegates to the protocol-aware
    // timeouts in natEngine so CLI/legacy and pipeline paths agree)
    if (state.natTranslations && state.natTranslations.length > 0) {
      const natRes = ageOutNatTranslations(state, Date.now());
      if (natRes.expiredCount > 0) {
        agedNatCount += natRes.expiredCount;
        Object.assign(state, natRes.updatedState);
      }
    }
  }

  return { agedMacCount, agedArpCount, agedNatCount, events, arpEvents };
}
