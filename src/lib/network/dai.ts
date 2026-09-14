/**
 * dai.ts — Dynamic ARP Inspection (DAI) Engine
 *
 * Validates ARP packets against the DHCP Snooping binding table.
 * equivalent: `ip arp inspection vlan <vlan>` + `ip arp inspection trust`
 */
import type { SwitchState } from './types';

export interface DaiBindingEntry {
  ip: string;
  mac: string;
  vlan: number;
  portId: string;
}

export interface DaiValidationResult {
  permitted: boolean;
  reason?: string;
}

/**
 * Evaluates an ARP packet against DAI rules on the given switch.
 * Called during connectivity checks when arpMessage option is set.
 */
export function evaluateDai(
  state: SwitchState,
  arpSrcIp: string,
  arpSrcMac: string,
  vlan: number,
  ingressPortId: string
): DaiValidationResult {
  // DAI not enabled on this device
  if (!state.daiEnabled) return { permitted: true };

  // Check if this VLAN is protected by DAI
  const daiVlans = state.arpInspectionVlans || [];
  if (daiVlans.length > 0 && !daiVlans.includes(String(vlan))) {
    return { permitted: true }; // VLAN not inspected
  }

  // Check if ingress port is trusted
  const port = state.ports[ingressPortId];
  if (port?.arpInspectionTrust) {
    return { permitted: true }; // Trusted port — bypass DAI
  }

  // Build combined binding table: DHCP snooping + static DAI bindings
  const bindingTable = buildDaiBindingTable(state);

  // Validate: find a matching entry for this IP
  const matchingEntry = bindingTable.find(
    (b) => b.ip === arpSrcIp && b.vlan === vlan
  );

  if (!matchingEntry) {
    // No binding for this IP — could be legitimate static host or spoofing
    // Strict mode: drop if no binding found
    recordDaiDrop(state, ingressPortId, vlan);
    return {
      permitted: false,
      reason: `DAI: No binding found for IP ${arpSrcIp} on VLAN ${vlan}. Add static binding or configure DHCP snooping.`,
    };
  }

  // Validate MAC matches binding
  const normalizedArpMac = normalizeMac(arpSrcMac);
  const normalizedBindingMac = normalizeMac(matchingEntry.mac);

  if (normalizedArpMac !== normalizedBindingMac) {
    recordDaiDrop(state, ingressPortId, vlan);
    return {
      permitted: false,
      reason: `DAI: ARP MAC ${arpSrcMac} does not match binding MAC ${matchingEntry.mac} for IP ${arpSrcIp}. Possible ARP spoofing attack!`,
    };
  }

  // Validate sender IP options (if ip validation enabled)
  if (state.daiValidate?.ip) {
    if (!isValidUnicastIp(arpSrcIp)) {
      recordDaiDrop(state, ingressPortId, vlan);
      return {
        permitted: false,
        reason: `DAI: ARP sender IP ${arpSrcIp} is invalid (broadcast/multicast not permitted).`,
      };
    }
  }

  // Permitted — record forwarded stat
  recordDaiForward(state, ingressPortId, vlan);
  return { permitted: true };
}

/** Builds unified binding table from DHCP snooping bindings + DAI static bindings */
export function buildDaiBindingTable(state: SwitchState): DaiBindingEntry[] {
  const entries: DaiBindingEntry[] = [];

  // From DHCP Snooping
  for (const binding of state.dhcpSnoopingBindings || []) {
    entries.push({
      ip: binding.ipAddress,
      mac: binding.macAddress,
      vlan: binding.vlan,
      portId: binding.portId,
    });
  }

  // From DAI static bindings (arp access-list / ip arp inspection filter)
  for (const binding of state.daiStaticBindings || []) {
    // Static bindings override dynamic
    const existingIdx = entries.findIndex(
      (e) => e.ip === binding.ip && e.vlan === binding.vlan
    );
    if (existingIdx >= 0) {
      entries[existingIdx] = binding;
    } else {
      entries.push(binding);
    }
  }

  return entries;
}

/** Adds a static DAI binding (from `ip arp inspection filter` or `arp access-list permit`) */
export function addDaiStaticBinding(
  state: SwitchState,
  ip: string,
  mac: string,
  vlan: number,
  portId: string
): void {
  if (!state.daiStaticBindings) state.daiStaticBindings = [];
  const existing = state.daiStaticBindings.findIndex(
    (b) => b.ip === ip && b.vlan === vlan
  );
  const entry: DaiBindingEntry = { ip, mac, vlan, portId };
  if (existing >= 0) {
    state.daiStaticBindings[existing] = entry;
  } else {
    state.daiStaticBindings.push(entry);
  }
}

/** Returns DAI statistics for a given device */
export function getDaiStats(state: SwitchState): {
  portId: string;
  vlan: number;
  forwarded: number;
  dropped: number;
}[] {
  return Object.values(state.daiStats || {});
}

function recordDaiDrop(state: SwitchState, portId: string, vlan: number): void {
  const key = `${portId}:${vlan}`;
  if (!state.daiStats) state.daiStats = {};
  if (!state.daiStats[key]) {
    state.daiStats[key] = { forwarded: 0, dropped: 0, portId, vlan };
  }
  state.daiStats[key].dropped++;
}

function recordDaiForward(state: SwitchState, portId: string, vlan: number): void {
  const key = `${portId}:${vlan}`;
  if (!state.daiStats) state.daiStats = {};
  if (!state.daiStats[key]) {
    state.daiStats[key] = { forwarded: 0, dropped: 0, portId, vlan };
  }
  state.daiStats[key].forwarded++;
}

function normalizeMac(mac: string): string {
  return mac.replace(/[.:-]/g, '').toLowerCase();
}

function isValidUnicastIp(ip: string): boolean {
  // Reject broadcast (255.x.x.x), multicast (224-239.x.x.x), 0.0.0.0
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  if (parts[0] === 0) return false;
  if (parts[0] >= 224 && parts[0] <= 239) return false;
  if (parts.every((p) => p === 255)) return false;
  return true;
}
