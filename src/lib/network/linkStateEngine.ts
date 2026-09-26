/**
 * linkStateEngine.ts — Central Link-State Change Propagation
 *
 * Single canonical fan-out point for interface/link state changes. When a
 * port goes down (or comes up), every engine that depends on link liveness
 * is notified from HERE instead of each subsystem re-detecting the change
 * independently:
 *
 *   1. L2 tables:   ARP cache / MAC CAM / NDP cache entries on the changed
 *                   port (and peer-facing port of the same links) are flushed.
 *   2. OSPF FSM:    neighbors on the interface receive KillNbr → Down.
 *   3. EIGRP FSM:   neighbors on the interface receive InterfaceDown → Down.
 *   4. BGP:         sessions whose peer is reachable only via the changed
 *                   port drop to Idle and BGP-learned routes via that peer
 *                   are withdrawn (route reinstated automatically on
 *                   re-establishment by the routing engine).
 *   5. NAT:         dynamic translations on the device are purged (egress
 *                   path lost — return traffic could not be delivered).
 *   6. DHCP:        client FSM on the interface receives LinkDown → INIT.
 *   7. Syslog:      %LINK-3-UPDOWN / %LINEPROTO-5-UPDOWN style event logs.
 *
 * Pure functions: callers pass the working state map, it returns a new map.
 */

import type { SwitchState } from './types';
import { eigrpNeighborTransition, dhcpClientTransition } from './protocols';
import type { EigrpNeighborRecord, DhcpClientRecord } from './protocols';
import type { BgpSessionRecord } from './protocols/bgpStateMachine';

export type LinkStateDirection = 'down' | 'up';

export interface LinkStateEvent {
  deviceId: string;
  portId: string;
  direction: LinkStateDirection;
  message: string;
  level: 'info' | 'warning' | 'error';
}

export interface LinkStatePropagationResult {
  deviceStates: Map<string, SwitchState>;
  events: LinkStateEvent[];
}

/** Flush ARP/MAC/NDP entries learned on the given ports of a device. */
function flushPortTables(state: SwitchState, portSet: Set<string>): SwitchState {
  let next = state;
  if (Array.isArray(next.arpCache)) {
    const filtered = next.arpCache.filter(e => !portSet.has(e.interface));
    if (filtered.length !== next.arpCache.length) next = { ...next, arpCache: filtered };
  }
  if (Array.isArray(next.macAddressTable)) {
    const filtered = next.macAddressTable.filter(m => !portSet.has(m.port));
    if (filtered.length !== next.macAddressTable.length) next = { ...next, macAddressTable: filtered };
  }
  if (Array.isArray(next.ndpCache)) {
    const filtered = next.ndpCache.filter(e => !portSet.has(e.interface));
    if (filtered.length !== next.ndpCache.length) next = { ...next, ndpCache: filtered };
  }
  return next;
}

/**
 * Fire the OSPF KillNbr event for every neighbor FSM record attached to
 * one of the changed ports (direction 'down' only).
 */
function fireOspfKillNbr(state: SwitchState, portSet: Set<string>, deviceId: string, events: LinkStateEvent[]): SwitchState {
  const nbrStates = state.ospfNeighborStates;
  if (!nbrStates) return state;
  let changed = false;
  const updated: typeof nbrStates = {};
  for (const [nbrId, nbr] of Object.entries(nbrStates)) {
    const interfaceId = nbr.interfaceId || '';
    if (portSet.has(interfaceId) && nbr.state !== 'Down') {
      updated[nbrId] = { ...nbr, state: 'Down', deadTimer: 0 };
      changed = true;
      events.push({
        deviceId, portId: interfaceId, direction: 'down', level: 'warning',
        message: `%OSPF-5-ADJCHG: Process ${state.ospfProcessId ?? 1}, Nbr ${nbrId} on ${interfaceId} from ${nbr.state.toUpperCase()} to DOWN (link state change)`,
      });
    } else {
      updated[nbrId] = nbr;
    }
  }
  if (!changed) return state;
  const legacy = Object.values(updated).filter(n => n.state !== 'Down').map(n => n.neighborId);
  return { ...state, ospfNeighborStates: updated, ospfNeighbors: legacy };
}

/**
 * Fire the EIGRP InterfaceDown event for every neighbor FSM record on the
 * changed ports.
 */
function fireEigrpInterfaceDown(state: SwitchState, portSet: Set<string>, now: number, events: LinkStateEvent[]): SwitchState {
  const nbrStates = state.eigrpNeighborStates;
  if (!nbrStates) return state;
  let changed = false;
  const updated: Record<string, EigrpNeighborRecord> = {};
  for (const [nbrIp, nbr] of Object.entries(nbrStates)) {
    if (portSet.has(nbr.interfaceId || '') && nbr.state !== 'Down') {
      const res = eigrpNeighborTransition(nbr, 'InterfaceDown', now);
      updated[nbrIp] = res.nextNeighbor;
      changed = true;
      events.push({
        deviceId: '', portId: nbr.interfaceId || '', direction: 'down', level: 'warning',
        message: res.logMessage || `%DUAL-5-NBRCHANGE: IP-EIGRP AS ${nbr.asNumber}: Neighbor ${nbrIp} is down: interface down`,
      });
    } else {
      updated[nbrIp] = nbr;
    }
  }
  if (!changed) return state;
  // The deviceId is patched by the caller (needs device context).
  return { ...state, eigrpNeighborStates: updated, eigrpNeighbors: Object.values(updated).filter(n => n.state === 'Up').map(n => n.neighborIp) };
}

/**
 * Drop BGP sessions whose peer next-hop is only reachable via the changed
 * ports to Idle and withdraw BGP-learned routes through that peer.
 */
function fireBgpSessionDown(state: SwitchState, portSet: Set<string>, deviceId: string, events: LinkStateEvent[]): SwitchState {
  if (!state.bgpNeighbors || state.bgpNeighbors.length === 0) return state;

  // Port-local IPs of this device — any peer configured toward one of these
  // IPs is considered directly attached to the changed ports.
  const localIps = new Set<string>();
  for (const [portId, port] of Object.entries(state.ports || {})) {
    if (port.ipAddress) localIps.add(`${portId}|${port.ipAddress}`);
  }
  const localIpSet = new Set(Object.values(state.ports || {}).map(p => p.ipAddress).filter(Boolean) as string[]);

  let touched = false;
  const newSessionState: Record<string, string> = { ...state.bgpNeighborState };
  const droppedPeers = new Set<string>();

  for (const nbr of state.bgpNeighbors) {
    // Peer belongs to a dropped link when one of our changed ports carries
    // the IP the neighbor is configured toward (direct BGP peering), OR the
    // peer was already Established via that port. We approximate: if the
    // changed ports hold an IP address that the neighbor's `ip` points at
    // (peer == interface peer) or any of our local IPs is on a changed port.
    const peerOnChangedPort = [...portSet].some(pid => {
      const entry = [...localIps].find(e => e.startsWith(`${pid}|`));
      return entry !== undefined;
    }) && localIpSet.size > 0 && state.bgpNeighborState?.[nbr.ip] === 'Established';

    if (peerOnChangedPort) {
      newSessionState[nbr.ip] = 'Idle';
      droppedPeers.add(nbr.ip);
      touched = true;
      events.push({
        deviceId, portId: '', direction: 'down', level: 'warning',
        message: `%BGP-5-ADJCHANGE: neighbor ${nbr.ip} Down interface state change (session Idle)`,
      });
    }
  }

  if (!touched) return state;

  // Withdraw BGP-learned routes via dropped peers.
  const dynamicRoutes = (state.dynamicRoutes || []).filter(r => !(r.code === 'B' && r.nextHop && droppedPeers.has(r.nextHop)));

  // Drive BGP FSM session records through TransportClosed → Idle.
  const sessionStates = { ...state.bgpSessionStates };
  for (const peer of droppedPeers) {
    const session = sessionStates[peer] as BgpSessionRecord | undefined;
    if (session && session.state !== 'Idle') {
      sessionStates[peer] = { ...session, state: 'Idle', holdTimer: 0, sessionStart: undefined, connectRetry: 5 };
    }
  }

  return { ...state, bgpNeighborState: newSessionState, dynamicRoutes, bgpSessionStates: sessionStates };
}

/**
 * Purge dynamic NAT translations on the device (static entries survive).
 */
function purgeDynamicNatTranslations(state: SwitchState, deviceId: string, events: LinkStateEvent[]): SwitchState {
  const translations = state.natTranslations;
  if (!translations || translations.length === 0) return state;
  const remaining = translations.filter(t => t.type === 'static' || !t.timestamp);
  const removed = translations.length - remaining.length;
  if (removed === 0) return state;
  events.push({
    deviceId, portId: '', direction: 'down', level: 'info',
    message: `%NAT-6-SESSIONS_PURGED: ${removed} dynamic translation(s) flushed on link state change`,
  });
  return { ...state, natTranslations: remaining };
}

/**
 * Fire the DHCP client LinkDown event on the changed ports.
 */
function fireDhcpLinkDown(state: SwitchState, portSet: Set<string>, now: number, events: LinkStateEvent[]): SwitchState {
  const clientStates = state.dhcpClientStates;
  if (!clientStates) return state;
  let changed = false;
  const updated: Record<string, DhcpClientRecord> = {};
  for (const [ifId, client] of Object.entries(clientStates)) {
    if (portSet.has(ifId) && client.state !== 'INIT') {
      const res = dhcpClientTransition(client, 'LinkDown', now);
      updated[ifId] = res.nextClient;
      changed = true;
      events.push({
        deviceId: '', portId: ifId, direction: 'down', level: 'info',
        message: res.logMessage || `DHCP: ${ifId} → INIT (link down)`,
      });
    } else {
      updated[ifId] = client;
    }
  }
  if (!changed) return state;
  return { ...state, dhcpClientStates: updated };
}

/**
 * Central link-state change propagation.
 *
 * @param deviceStates  Working state map (read-only; a new map is returned)
 * @param connections   Topology connections (used to flush peer-side tables)
 * @param deviceId      Device whose ports changed state
 * @param changedPortIds Port IDs that transitioned
 * @param direction     'down' or 'up'
 */
export function propagateLinkStateChange(
  deviceStates: Map<string, SwitchState>,
  connections: Array<{ sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string }>,
  deviceId: string,
  changedPortIds: string[],
  direction: LinkStateDirection,
  now: number = Date.now()
): LinkStatePropagationResult {
  const events: LinkStateEvent[] = [];
  const nextStates = new Map(deviceStates);
  if (changedPortIds.length === 0) return { deviceStates: nextStates, events };
  const portSet = new Set(changedPortIds);

  const state = nextStates.get(deviceId);
  if (!state) return { deviceStates: nextStates, events };

  let next = state;

  // 1. L2 table flush (both directions: stale entries must never survive)
  next = flushPortTables(next, portSet);

  // 2-6. Protocol fan-out only when the link went down
  if (direction === 'down') {
    next = fireOspfKillNbr(next, portSet, deviceId, events);
    next = fireEigrpInterfaceDown(next, portSet, now, events);
    next = fireBgpSessionDown(next, portSet, deviceId, events);
    next = purgeDynamicNatTranslations(next, deviceId, events);
    next = fireDhcpLinkDown(next, portSet, now, events);
  }

  // 7. Syslog-style link change records
  for (const portId of changedPortIds) {
    if (direction === 'down') {
      events.push({
        deviceId, portId, direction, level: 'warning',
        message: `%LINK-5-CHANGED: Interface ${portId}, changed state to administratively down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portId}, changed state to down`,
      });
    } else {
      events.push({
        deviceId, portId, direction, level: 'info',
        message: `%LINK-3-UPDOWN: Interface ${portId}, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portId}, changed state to up`,
      });
    }
  }

  // Append to the device event log (cap size defensively).
  if (events.length > 0) {
    const logs = [...(next.eventLogs || []), ...events.map(e => e.message)];
    next = { ...next, eventLogs: logs.slice(-1000) };
  }

  nextStates.set(deviceId, next);

  // Peer-side MAC flush: any learned MAC pointing out the far end of the
  // changed links is now stale.
  for (const conn of connections) {
    const peerDeviceId =
      conn.sourceDeviceId === deviceId && portSet.has(conn.sourcePort)
        ? conn.targetDeviceId
        : conn.targetDeviceId === deviceId && portSet.has(conn.targetPort)
          ? conn.sourceDeviceId
          : undefined;
    if (!peerDeviceId) continue;
    const peerPortId = conn.sourceDeviceId === peerDeviceId ? conn.sourcePort : conn.targetPort;
    const peerState = nextStates.get(peerDeviceId);
    if (!peerState || !Array.isArray(peerState.macAddressTable)) continue;
    const filtered = peerState.macAddressTable.filter(m => m.port !== peerPortId);
    if (filtered.length !== peerState.macAddressTable.length) {
      nextStates.set(peerDeviceId, { ...peerState, macAddressTable: filtered });
    }
  }

  // Fix device attribution on protocol events (they don't know their device).
  for (const ev of events) {
    if (!ev.deviceId) ev.deviceId = deviceId;
  }

  return { deviceStates: nextStates, events };
}
