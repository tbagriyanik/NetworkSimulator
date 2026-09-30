/**
 * networkAudit.ts — Automatic topology/configuration validation ("audit").
 *
 * The report generator used to be purely descriptive. This module turns it into
 * an active validator: it inspects the canvas topology plus every device state
 * and returns deterministic findings with severities, so a student (or a CI
 * job) can see configuration mistakes without opening the device CLIs.
 *
 * Ownership: this module owns *finding generation* only. Formatting lives in
 * networkReportGenerator (Markdown) so the same findings can be rendered by the
 * UI, exported to JSON or asserted in tests.
 */

import type { SwitchState } from './types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

export type AuditSeverity = 'critical' | 'warning' | 'info';

export interface AuditFinding {
  /** Stable machine-readable code (e.g. 'duplicate-ip'). */
  code: string;
  severity: AuditSeverity;
  title: string;
  detail: string;
  deviceIds: string[];
  remediation?: string;
}

export interface AuditReport {
  findings: AuditFinding[];
  counts: Record<AuditSeverity, number>;
  /** True when no CRITICAL finding exists (warnings/info still allowed). */
  passed: boolean;
  score: number; // 0-100 health score
}

const SEVERITY_PENALTY: Record<AuditSeverity, number> = {
  critical: 25,
  warning: 8,
  info: 2,
};

function ipToLong(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return -1;
  return parts.reduce((acc, part) => {
    const n = Number(part);
    return acc * 256 + (Number.isInteger(n) && n >= 0 && n <= 255 ? n : NaN);
  }, 0);
}

function sameSubnet(a: string, aMask: string, b: string, bMask: string): boolean {
  const la = ipToLong(a);
  const lb = ipToLong(b);
  const ma = ipToLong(aMask);
  const mb = ipToLong(bMask);
  if (la < 0 || lb < 0 || ma < 0 || mb < 0) return false;
  return ((la & ma) >>> 0) === ((lb & ma) >>> 0) && ma === mb;
}

function isDefaultRoute(destination: string | undefined, mask: string | undefined): boolean {
  return destination === '0.0.0.0' && (mask === '0.0.0.0' || mask === '0' || mask === undefined);
}

/** All IPv4 addresses configured on the topology, with their owner device. */
export function collectInterfaceIps(
  devices: CanvasDevice[],
  deviceStates: Map<string, SwitchState>
): Array<{ deviceId: string; deviceName: string; portId: string; ipAddress: string; subnetMask: string; shutdown: boolean; vlan?: number }> {
  const entries: Array<{ deviceId: string; deviceName: string; portId: string; ipAddress: string; subnetMask: string; shutdown: boolean; vlan?: number }> = [];
  for (const device of devices) {
    const state = deviceStates.get(device.id);
    if (!state?.ports) continue;
    for (const [portId, port] of Object.entries(state.ports)) {
      if (!port.ipAddress || port.ipAddress === '0.0.0.0') continue;
      entries.push({
        deviceId: device.id,
        deviceName: device.name,
        portId,
        ipAddress: port.ipAddress,
        subnetMask: port.subnetMask || '255.255.255.0',
        shutdown: Boolean(port.shutdown),
        vlan: port.vlan,
      });
    }
  }
  return entries;
}

/**
 * Run every validation rule over the topology and return sorted findings.
 * Findings are ordered: critical → warning → info, then by code.
 */
export function auditNetwork(
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates: Map<string, SwitchState>
): AuditReport {
  const findings: AuditFinding[] = [];
  const push = (finding: AuditFinding) => findings.push(finding);

  // ── Rule 1: duplicate IP addresses ─────────────────────────────────────────
  const ipOwners = new Map<string, Array<{ deviceId: string; deviceName: string; portId: string }>>();
  for (const entry of collectInterfaceIps(devices, deviceStates)) {
    const owners = ipOwners.get(entry.ipAddress) ?? [];
    owners.push({ deviceId: entry.deviceId, deviceName: entry.deviceName, portId: entry.portId });
    ipOwners.set(entry.ipAddress, owners);
  }
  ipOwners.forEach((owners, ip) => {
    if (owners.length < 2) return;
    push({
      code: 'duplicate-ip',
      severity: 'critical',
      title: `Duplicate IP address ${ip}`,
      detail: `The address ${ip} is configured on ${owners.map(o => `${o.deviceName}:${o.portId}`).join(', ')}.`,
      deviceIds: owners.map(o => o.deviceId),
      remediation: 'Assign a unique address per interface or remove the duplicate configuration.',
    });
  });

  // ── Rule 2: connections referencing missing endpoints ──────────────────────
  const deviceIds = new Set(devices.map(d => d.id));
  for (const conn of connections) {
    const missing: string[] = [];
    if (!deviceIds.has(conn.sourceDeviceId)) missing.push(conn.sourceDeviceId);
    if (!deviceIds.has(conn.targetDeviceId)) missing.push(conn.targetDeviceId);
    if (missing.length === 0) continue;
    push({
      code: 'dangling-cable',
      severity: 'critical',
      title: 'Cable references a device that no longer exists',
      detail: `Connection ${conn.id} points at missing device(s): ${missing.join(', ')}.`,
      deviceIds: missing,
      remediation: 'Delete and re-create the cable between existing devices.',
    });
  }

  // ── Rule 3: duplicate device MAC addresses ─────────────────────────────────
  const macOwners = new Map<string, string[]>();
  for (const device of devices) {
    if (!device.macAddress) continue;
    const key = device.macAddress.toLowerCase();
    macOwners.set(key, [...(macOwners.get(key) ?? []), device.name]);
  }
  macOwners.forEach((names, mac) => {
    if (names.length < 2) return;
    push({
      code: 'duplicate-mac',
      severity: 'critical',
      title: `Duplicate MAC address ${mac}`,
      detail: `Devices sharing the same MAC: ${names.join(', ')}.`,
      deviceIds: devices.filter(d => d.macAddress?.toLowerCase() === mac).map(d => d.id),
      remediation: 'Regenerate the device MAC addresses so L2 forwarding stays unambiguous.',
    });
  });

  // ── Rule 4: duplicate hostnames ────────────────────────────────────────────
  const hostnames = new Map<string, string[]>();
  deviceStates.forEach((state, deviceId) => {
    if (!state.hostname) return;
    hostnames.set(state.hostname, [...(hostnames.get(state.hostname) ?? []), deviceId]);
  });
  hostnames.forEach((ids, hostname) => {
    if (ids.length < 2) return;
    push({
      code: 'duplicate-hostname',
      severity: 'warning',
      title: `Duplicate hostname "${hostname}"`,
      detail: `${ids.length} devices answer to the same hostname, which breaks DNS and troubleshooting clarity.`,
      deviceIds: ids,
      remediation: 'Rename one of the devices (hostname <name>).',
    });
  });

  // ── Per-device rules ───────────────────────────────────────────────────────
  for (const device of devices) {
    const state = deviceStates.get(device.id);
    if (!state) continue;

    const ports = Object.entries(state.ports ?? {});

    // Rule 5: IP configured on an administratively down interface
    const shutWithIp = ports.filter(([, p]) => p.ipAddress && p.shutdown);
    if (shutWithIp.length > 0) {
      push({
        code: 'shutdown-interface-with-ip',
        severity: 'warning',
        title: `${device.name}: address configured on a shutdown interface`,
        detail: `Interfaces ${shutWithIp.map(([id]) => id).join(', ')} carry an IP address but are administratively down.`,
        deviceIds: [device.id],
        remediation: 'Run "no shutdown" or remove the address.',
      });
    }

    // Rule 6: VLAN referenced by a port but never defined on the device
    const definedVlans = new Set(Object.keys(state.vlans ?? {}).map(v => Number(v)));
    const undefinedVlans = new Set<number>();
    for (const [, port] of ports) {
      const vlan = port.vlan;
      if (vlan && vlan !== 1 && !definedVlans.has(vlan)) undefinedVlans.add(vlan);
    }
    if (undefinedVlans.size > 0) {
      push({
        code: 'vlan-undefined',
        severity: 'warning',
        title: `${device.name}: ports use undefined VLAN(s)`,
        detail: `VLAN(s) ${Array.from(undefinedVlans).sort((a, b) => a - b).join(', ')} are assigned to ports but missing from the VLAN database.`,
        deviceIds: [device.id],
        remediation: 'Create the VLAN in global config (vlan <id> / name <name>).',
      });
    }

    // Rule 7: IP helper address that no device in the topology owns
    const allIps = new Set(Array.from(ipOwners.keys()));
    const orphanHelpers: string[] = [];
    for (const [, port] of ports) {
      for (const helper of port.helperAddresses ?? []) {
        if (helper && helper !== '0.0.0.0' && !allIps.has(helper)) orphanHelpers.push(helper);
      }
    }
    if (orphanHelpers.length > 0) {
      push({
        code: 'dhcp-helper-unreachable',
        severity: 'warning',
        title: `${device.name}: DHCP helper address not present in the topology`,
        detail: `Helper address(es) ${Array.from(new Set(orphanHelpers)).join(', ')} cannot be reached: no interface owns those addresses.`,
        deviceIds: [device.id],
        remediation: 'Point ip helper-address at the real DHCP server interface or add the server.',
      });
    }

    // Rule 8: static route next-hop outside every directly connected subnet
    const localSubnets = ports
      .filter(([, p]) => p.ipAddress && p.subnetMask && !p.shutdown)
      .map(([, p]) => ({ ip: p.ipAddress as string, mask: p.subnetMask as string }));
    for (const route of state.staticRoutes ?? []) {
      const destination = route.destination ?? route.network;
      const nextHop = route.nextHop;
      if (!nextHop || nextHop === '0.0.0.0' || isDefaultRoute(destination, route.subnetMask ?? route.mask)) continue;
      const reachable = localSubnets.some(sub => sameSubnet(sub.ip, sub.mask, nextHop, sub.mask));
      if (reachable) continue;
      push({
        code: 'static-route-unreachable',
        severity: 'warning',
        title: `${device.name}: static route next-hop is unreachable`,
        detail: `Route to ${destination} points at next-hop ${nextHop}, which is not inside any directly connected subnet of this device.`,
        deviceIds: [device.id],
        remediation: 'Fix the next-hop address or configure the missing interface.',
      });
    }

    // Rule 9: routing device without a default route
    const isRouter = device.type === 'router' || device.type === 'firewall' || device.type === 'switchL3';
    if (isRouter && state.ipRouting !== false) {
      const hasDefault = (state.staticRoutes ?? []).some(r => isDefaultRoute(r.destination ?? r.network, r.subnetMask ?? r.mask))
        || (state.dynamicRoutes ?? []).some(r => r.destination === '0.0.0.0' || r.destination === '0.0.0.0/0');
      if (!hasDefault) {
        push({
          code: 'no-default-route',
          severity: 'info',
          title: `${device.name}: no default route`,
          detail: 'Traffic to unknown destinations has nowhere to go (no 0.0.0.0/0 entry in the routing table).',
          deviceIds: [device.id],
          remediation: 'Add "ip route 0.0.0.0 0.0.0.0 <next-hop>".',
        });
      }
    }

    // Rule 10: firewall with no ACL / policy bound to any interface
    if (device.type === 'firewall') {
      const hasPolicy = ports.some(([, p]) => Boolean(p.accessGroupIn || p.accessGroupOut));
      if (!hasPolicy) {
        push({
          code: 'firewall-implicit-permit',
          severity: 'warning',
          title: `${device.name}: no ACL or policy bound to any interface`,
          detail: 'The firewall forwards everything its connection table allows: no ACL/policy is enforcing an explicit rule set.',
          deviceIds: [device.id],
          remediation: 'Bind an access group (ip access-group <acl> in|out) or configure zone-based policy.',
        });
      }
    }

    // Rule 11: BGP neighbors that never reached Established
    const bgpConfig = state.bgpConfig as
      | { neighbors?: Record<string, { ip: string; remoteAs: number; state: string }> }
      | undefined;
    for (const neighbor of Object.values(bgpConfig?.neighbors ?? {})) {
      if (neighbor.state === 'Established') continue;
      push({
        code: 'bgp-neighbor-not-established',
        severity: 'warning',
        title: `${device.name}: BGP neighbor ${neighbor.ip} is ${neighbor.state}`,
        detail: `The session with AS ${neighbor.remoteAs} is not Established, so no prefixes are exchanged.`,
        deviceIds: [device.id],
        remediation: 'Verify reachability, AS numbers, and the neighbor address on both sides.',
      });
    }

    // Rule 12: ports marked connected but with no cable attached
    const cabledPorts = new Set<string>();
    for (const conn of connections) {
      if (conn.sourceDeviceId === device.id) cabledPorts.add(conn.sourcePort);
      if (conn.targetDeviceId === device.id) cabledPorts.add(conn.targetPort);
    }
    const dangling = ports
      .filter(([portId, p]) => p.status === 'connected' && !cabledPorts.has(portId) && !p.shutdown)
      .map(([portId]) => portId);
    if (dangling.length > 0) {
      push({
        code: 'port-without-cable',
        severity: 'info',
        title: `${device.name}: port(s) marked up without a cable`,
        detail: `Interfaces ${dangling.join(', ')} report status "connected" but no link exists in the topology.`,
        deviceIds: [device.id],
        remediation: 'Re-cable the interface or shut it down to reflect reality.',
      });
    }
  }

  // ── Rule 13: OSPF neighbours configured with mismatched areas ──────────────
  for (const conn of connections) {
    const a = deviceStates.get(conn.sourceDeviceId);
    const b = deviceStates.get(conn.targetDeviceId);
    if (!a?.ospfNetworks || !b?.ospfNetworks) continue;
    const areasA = new Set(a.ospfNetworks.map(n => n.area));
    const areasB = new Set(b.ospfNetworks.map(n => n.area));
    const shared = Array.from(areasA).some(area => areasB.has(area));
    if (!shared) {
      push({
        code: 'ospf-area-mismatch',
        severity: 'warning',
        title: 'OSPF link between different areas',
        detail: `Devices ${conn.sourceDeviceId} and ${conn.targetDeviceId} are linked but share no common OSPF area (${Array.from(areasA).join('/')} vs ${Array.from(areasB).join('/')}).`,
        deviceIds: [conn.sourceDeviceId, conn.targetDeviceId],
        remediation: 'Put both interfaces in the same area or design the link as an ABR/backbone connection.',
      });
    }
  }

  const counts: Record<AuditSeverity, number> = { critical: 0, warning: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] += 1;

  const order: Record<AuditSeverity, number> = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.code.localeCompare(b.code));

  const penalty = findings.reduce((acc, f) => acc + SEVERITY_PENALTY[f.severity], 0);
  const score = Math.max(0, 100 - penalty);

  return { findings, counts, passed: counts.critical === 0, score };
}

/** Human-readable one-line summary used in report headers and notifications. */
export function summarizeAudit(report: AuditReport): string {
  return `${report.passed ? 'PASS' : 'FAIL'} — health ${report.score}/100 ` +
    `(${report.counts.critical} critical, ${report.counts.warning} warning, ${report.counts.info} info)`;
}
