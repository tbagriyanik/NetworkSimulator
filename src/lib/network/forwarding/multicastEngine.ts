/**
 * multicastEngine.ts — PIM/IGMP Simulation Tick Engine
 *
 * On each call to tickMulticast():
 *  1. Generates PIM Hello frames on all PIM-enabled interfaces (sparse & dense)
 *  2. Generates IGMP General Query frames on IGMP-snooping switches
 *  3. Builds (*,G) mroute entries for groups joined via igmpGroups per-port config
 *  4. Updates dynamic pimNeighbors & igmpMemberships tables
 *  5. Handles dense-mode prune: ports with no receivers are added to pimPrunedInterfaces
 *
 * Exported helpers used by packetPipeline:
 *  - isMulticastAddress()
 *  - checkRpf()       — RPF validation
 *  - getPrunedPorts() — dense-mode prune list
 */

import type { SwitchState } from '../types';
import type { NetworkPacketFrame } from './packetFrame';

/** Returns true if the IP address falls in the 224.0.0.0/4 multicast range */
export function isMulticastAddress(ip: string | undefined): boolean {
  if (!ip) return false;
  const first = Number(ip.split('.')[0]);
  return first >= 224 && first <= 239;
}

/** PIM Hello hold time in simulated milliseconds (105 s) */
const PIM_HELLO_HOLD_MS = 105_000;
/** IGMP Query interval in simulated milliseconds (60 s) */
const IGMP_QUERY_INTERVAL_MS = 60_000;
/** mroute entry lifetime in ms (simulated 210 s) */
const MROUTE_LIFETIME_MS = 210_000;

export interface MulticastTickResult {
  state: SwitchState;
  frames: NetworkPacketFrame[];
}

/**
 * Main multicast tick. Call once per event-pipeline iteration per device.
 * @param state     Current device state
 * @param deviceId  Used to build unique frame IDs
 * @param now       Current timestamp in ms
 */
export function tickMulticast(
  state: SwitchState,
  deviceId: string,
  now: number
): MulticastTickResult {
  if (!state.multicastRoutingEnabled && !state.igmpSnoopingEnabled) {
    return { state, frames: [] };
  }

  const frames: NetworkPacketFrame[] = [];
  let s = state;

  if (state.multicastRoutingEnabled) {
    s = tickPimHellos(s, deviceId, now, frames);
    s = buildMrouteEntries(s, now);
    s = tickDenseModePrune(s);
  }

  if (state.igmpSnoopingEnabled || state.multicastRoutingEnabled) {
    s = tickIgmpQueries(s, deviceId, now, frames);
    s = syncIgmpMemberships(s, now);
  }

  s = expirePimNeighbors(s, now);

  return { state: s, frames };
}

// ─── Internal tick helpers ────────────────────────────────────────────────────

function tickPimHellos(
  state: SwitchState,
  deviceId: string,
  now: number,
  frames: NetworkPacketFrame[]
): SwitchState {
  const neighbors: NonNullable<SwitchState['pimNeighbors']> = { ...state.pimNeighbors };

  for (const [portId, port] of Object.entries(state.ports ?? {})) {
    if (!port.pimMode || port.shutdown || port.status !== 'connected') continue;
    const srcIp = port.ipAddress ?? state.ip ?? '0.0.0.0';

    frames.push({
      id: `pim-hello-${deviceId}-${portId}-${now}`,
      protocol: 'PIM',
      timestamp: now,
      ingressDeviceId: deviceId,
      srcMac: state.macAddress ?? '00:00:00:00:00:00',
      dstMac: '01:00:5e:00:00:0d',
      etherType: '0x0800',
      srcIp,
      dstIp: '224.0.0.13',
      ipProtocol: 103,
      length: 34,
      info: `PIM Hello (${port.pimMode}) on ${portId}`,
    });

    const neighborKey = `${portId}/${srcIp}`;
    neighbors[neighborKey] = {
      interface: portId,
      ip: srcIp,
      uptime: neighbors[neighborKey]?.uptime ?? now,
      expires: now + PIM_HELLO_HOLD_MS,
      drPriority: port.pimDrPriority ?? 1,
      version: 2,
    };
  }

  return { ...state, pimNeighbors: neighbors };
}

function tickIgmpQueries(
  state: SwitchState,
  deviceId: string,
  now: number,
  frames: NetworkPacketFrame[]
): SwitchState {
  for (const [portId, port] of Object.entries(state.ports ?? {})) {
    if (port.shutdown || port.status !== 'connected') continue;
    const queryInterval = (port.igmpQueryInterval ?? IGMP_QUERY_INTERVAL_MS / 1000) * 1000;
    if (now % queryInterval > 500) continue;

    const srcIp = port.ipAddress ?? state.ip ?? '0.0.0.0';
    frames.push({
      id: `igmp-query-${deviceId}-${portId}-${now}`,
      protocol: 'IGMP',
      timestamp: now,
      ingressDeviceId: deviceId,
      srcMac: state.macAddress ?? '00:00:00:00:00:00',
      dstMac: '01:00:5e:00:00:01',
      etherType: '0x0800',
      srcIp,
      dstIp: '224.0.0.1',
      ipProtocol: 2,
      length: 28,
      info: `IGMP General Query on ${portId} (v${port.igmpVersion ?? 2})`,
    });
  }
  return state;
}

function buildMrouteEntries(state: SwitchState, now: number): SwitchState {
  const existing = [...(state.mrouteEntries ?? [])];

  for (const [portId, port] of Object.entries(state.ports ?? {})) {
    if (!port.igmpGroups?.length) continue;
    for (const group of port.igmpGroups) {
      const idx = existing.findIndex(e => e.source === '*' && e.group === group);
      if (idx >= 0) {
        const entry = { ...existing[idx] };
        if (!entry.outgoingInterfaces.includes(portId)) {
          entry.outgoingInterfaces = [...entry.outgoingInterfaces, portId];
        }
        entry.expires = now + MROUTE_LIFETIME_MS;
        existing[idx] = entry;
      } else {
        existing.push({
          source: '*',
          group,
          incomingInterface: 'Null',
          outgoingInterfaces: [portId],
          flags: 'S',
          uptime: now,
          expires: now + MROUTE_LIFETIME_MS,
          rpAddress: state.pimRpAddress,
        });
      }
    }
  }

  const alive = existing.filter(e => !e.expires || e.expires > now);
  return { ...state, mrouteEntries: alive };
}

function tickDenseModePrune(state: SwitchState): SwitchState {
  const pruned: Record<string, string[]> = {};
  const groups = new Set((state.mrouteEntries ?? []).map(e => e.group));

  for (const group of groups) {
    const receiverPorts = new Set<string>(
      Object.entries(state.ports ?? {})
        .filter(([, p]) => p.igmpGroups?.includes(group) && p.status === 'connected' && !p.shutdown)
        .map(([id]) => id)
    );

    const prunedPorts = Object.entries(state.ports ?? {})
      .filter(([portId, p]) =>
        p.pimMode && p.pimMode !== 'sparse-mode' &&
        !p.shutdown && p.status === 'connected' &&
        !receiverPorts.has(portId)
      )
      .map(([id]) => id);

    if (prunedPorts.length > 0) pruned[group] = prunedPorts;
  }

  const prev = state.pimPrunedInterfaces ?? {};
  const changed = JSON.stringify(prev) !== JSON.stringify(pruned);
  return changed ? { ...state, pimPrunedInterfaces: pruned } : state;
}

function syncIgmpMemberships(state: SwitchState, now: number): SwitchState {
  const memberships: NonNullable<SwitchState['igmpMemberships']> = {};

  for (const [portId, port] of Object.entries(state.ports ?? {})) {
    if (!port.igmpGroups?.length) continue;
    for (const group of port.igmpGroups) {
      memberships[group] = {
        interface: portId,
        lastReporter: port.ipAddress ?? '0.0.0.0',
        expires: now + IGMP_QUERY_INTERVAL_MS * 3,
        version: port.igmpVersion ?? 2,
      };
    }
  }

  return { ...state, igmpMemberships: memberships };
}

function expirePimNeighbors(state: SwitchState, now: number): SwitchState {
  if (!state.pimNeighbors) return state;
  const alive: NonNullable<SwitchState['pimNeighbors']> = {};
  for (const [key, nbr] of Object.entries(state.pimNeighbors)) {
    if (nbr.expires > now) alive[key] = nbr;
  }
  const changed = Object.keys(alive).length !== Object.keys(state.pimNeighbors).length;
  return changed ? { ...state, pimNeighbors: alive } : state;
}

// ─── Exported helpers for packetPipeline ─────────────────────────────────────

export interface RpfResult {
  passed: boolean;
  expectedInterface?: string;
}

/**
 * RPF check: verify that the ingress port is the expected upstream interface
 * for the given source IP, based on subnet matching across configured port IPs.
 * Returns passed=true if no subnet match found (cannot determine RPF).
 */
export function checkRpf(
  state: SwitchState,
  sourceIp: string,
  ingressPortId: string
): RpfResult {
  if (!sourceIp || !ingressPortId) return { passed: true };

  const srcOctets = sourceIp.split('.').map(Number);
  let rpfInterface: string | undefined;

  for (const [portId, port] of Object.entries(state.ports ?? {})) {
    if (!port.ipAddress || !port.subnetMask) continue;
    const portOctets = port.ipAddress.split('.').map(Number);
    const maskOctets = port.subnetMask.split('.').map(Number);
    const inSameSubnet = portOctets.every(
      (o, i) => (o & maskOctets[i]) === ((srcOctets[i] ?? 0) & maskOctets[i])
    );
    if (inSameSubnet) {
      rpfInterface = portId;
      break;
    }
  }

  if (!rpfInterface) return { passed: true };
  return {
    passed: rpfInterface === ingressPortId,
    expectedInterface: rpfInterface,
  };
}

/**
 * Returns ports that are dense-mode pruned for the given multicast group.
 */
export function getPrunedPorts(state: SwitchState, group: string): string[] {
  return state.pimPrunedInterfaces?.[group] ?? [];
}
