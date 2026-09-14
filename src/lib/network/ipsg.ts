/**
 * ipsg.ts — IP Source Guard (IPSG) Engine
 *
 * Validates source IP (and optionally MAC) of frames against the
 * DHCP Snooping binding table. `ip verify source [port-security]`
 */
import type { SwitchState } from './types';

export interface IpsgBindingEntry {
  ip: string;
  mac?: string;
  vlan: number;
  portId: string;
}

export interface IpsgValidationResult {
  permitted: boolean;
  reason?: string;
}

/**
 * Enforces IP Source Guard on the given ingress port.
 * Returns permitted=false when the source IP/MAC is not in the binding table.
 */
export function enforceIpsg(
  state: SwitchState,
  srcIp: string,
  srcMac: string | undefined,
  vlan: number,
  ingressPortId: string
): IpsgValidationResult {
  const port = state.ports[ingressPortId];
  if (!port) return { permitted: true };

  // IPSG only active when `ip verify source` is configured on port
  if (!port.ipVerifySource) return { permitted: true };

  // Build effective binding table
  const table = buildIpsgBindingTable(state);

  // Find entry matching ingress port + VLAN + IP
  const match = table.find(
    (b) =>
      b.portId === ingressPortId &&
      b.vlan === vlan &&
      b.ip === srcIp
  );

  if (!match) {
    return {
      permitted: false,
      reason: `IPSG: Source IP ${srcIp} not found in binding table on port ${ingressPortId} VLAN ${vlan}. Traffic dropped.`,
    };
  }

  // Port-security mode: also validate MAC
  if (port.ipVerifySourcePortSecurity && srcMac) {
    if (match.mac && normalizeMac(match.mac) !== normalizeMac(srcMac)) {
      return {
        permitted: false,
        reason: `IPSG: Source MAC ${srcMac} does not match binding MAC ${match.mac} for IP ${srcIp} on port ${ingressPortId}.`,
      };
    }
  }

  return { permitted: true };
}

/**
 * Builds the IPSG binding table from DHCP Snooping bindings + explicit ipsg bindings.
 * Called by `show ip verify source` and the enforcement engine.
 */
export function buildIpsgBindingTable(state: SwitchState): IpsgBindingEntry[] {
  const entries: IpsgBindingEntry[] = [];

  // From DHCP Snooping (primary source)
  for (const b of state.dhcpSnoopingBindings || []) {
    entries.push({
      ip: b.ipAddress,
      mac: b.macAddress,
      vlan: b.vlan,
      portId: b.portId,
    });
  }

  // From explicit ipsg bindings (static)
  for (const b of state.ipsgBindings || []) {
    const existingIdx = entries.findIndex(
      (e) => e.portId === b.portId && e.vlan === b.vlan && e.ip === b.ip
    );
    if (existingIdx >= 0) {
      entries[existingIdx] = { ...entries[existingIdx], ...b };
    } else {
      entries.push(b);
    }
  }

  return entries;
}

/**
 * Returns IPSG-enabled ports and their binding summaries.
 * Used by `show ip verify source` CLI command.
 */
export function getIpsgPortSummary(state: SwitchState): {
  portId: string;
  filter: 'ip' | 'ip mac';
  vlan: number;
  ip: string;
  mac: string;
}[] {
  const table = buildIpsgBindingTable(state);
  const result: ReturnType<typeof getIpsgPortSummary> = [];

  for (const [portId, port] of Object.entries(state.ports)) {
    if (!port.ipVerifySource) continue;
    const portBindings = table.filter((b) => b.portId === portId);
    if (portBindings.length === 0) {
      result.push({
        portId,
        filter: port.ipVerifySourcePortSecurity ? 'ip mac' : 'ip',
        vlan: port.vlan || 1,
        ip: 'deny-all',
        mac: '--',
      });
    } else {
      for (const b of portBindings) {
        result.push({
          portId,
          filter: port.ipVerifySourcePortSecurity ? 'ip mac' : 'ip',
          vlan: b.vlan,
          ip: b.ip,
          mac: b.mac || '--',
        });
      }
    }
  }
  return result;
}

function normalizeMac(mac: string): string {
  return mac.replace(/[.:-]/g, '').toLowerCase();
}
