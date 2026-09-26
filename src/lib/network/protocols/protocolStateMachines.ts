/**
 * Protocol State Machines
 *
 * This module implements RFC-compliant state machines for:
 * - OSPF Neighbor (RFC 2328 §10.3)
 * - STP Port (IEEE 802.1D / 802.1W RSTP)
 * - DHCP Client (RFC 2131 §4.4)
 * - EIGRP Neighbor (proprietary)
 * - LACP Port (IEEE 802.3ad)
 *
 * All state machines are PURE FUNCTIONS: given current state + event,
 * they return next state + side-effects list. No timers are stored here;
 * the caller (eventPipeline or usePeriodicNetworkPackets) drives ticks.
 */

// ─────────────────────────────────────────────
// OSPF Neighbor State Machine  (RFC 2328 §10.3)
// ─────────────────────────────────────────────

/** Deterministic monotonic counters for protocol transaction IDs. */
let ddSeqCounter = 0x100000;
let dhcpXidCounter = 0x20000000;

function nextDdSeq(): number {
  ddSeqCounter = (ddSeqCounter + 1) % 0xFFFFFF;
  return ddSeqCounter;
}

function nextDhcpXid(): number {
  dhcpXidCounter = (dhcpXidCounter + 1) >>> 0;
  return dhcpXidCounter;
}

/** OSPF neighbor states per RFC 2328 Table 10.1 */
export type OspfNeighborState =
  | 'Down'
  | 'Attempt'
  | 'Init'
  | '2-Way'
  | 'ExStart'
  | 'Exchange'
  | 'Loading'
  | 'Full';

export interface OspfNeighborRecord {
  neighborId: string;       // Neighbor Router-ID
  neighborIp: string;       // Neighbor IP address
  interfaceId: string;      // Local interface where neighbor was seen
  areaId: string;           // OSPF area
  state: OspfNeighborState;
  priority: number;         // Neighbor DR priority
  deadTimer: number;        // Seconds remaining before neighbor declared Down
  helloInterval: number;    // Hello interval in seconds (default 10)
  deadInterval: number;     // Dead interval (default 4 × hello)
  drIp?: string;            // Designated Router IP
  bdrIp?: string;           // Backup DR IP
  ddSeq?: number;           // Database Description sequence number
  lsaCount?: number;        // LSAs in exchange
  lastHelloAt: number;      // Timestamp of last received Hello (ms)
}

/** OSPF events that drive the state machine */
export type OspfNeighborEvent =
  | 'HelloReceived'        // Valid Hello received from neighbor
  | 'Start'                // NBMA start event
  | '2-WayReceived'        // Router sees itself in Hello neighbor list
  | 'NegotiationDone'      // DD exchange started
  | 'ExchangeDone'         // All DD packets acknowledged
  | 'LoadingDone'          // All LSAs received
  | 'AdjOK'                // Adjacency still OK (periodic check)
  | 'SeqNumberMismatch'    // DD sequence error → ExStart
  | 'BadLSReq'             // Bad LS-Request → ExStart
  | 'KillNbr'              // Neighbor should be killed (interface down)
  | 'LLDown'               // Link Layer down
  | 'InactivityTimer'      // Dead interval expired
  | '1-WayReceived';       // Router no longer sees itself in Hello

export interface OspfNeighborTransitionResult {
  nextState: OspfNeighborRecord;
  events: OspfProtocolEvent[];
}

export type OspfProtocolEvent =
  | { type: 'SendHello'; interfaceId: string }
  | { type: 'SendDD'; neighborId: string; interfaceId: string; isMaster: boolean }
  | { type: 'SendLsRequest'; neighborId: string; interfaceId: string }
  | { type: 'RouteUpdate'; neighborId: string; removed: boolean }
  | { type: 'LogEvent'; message: string };

/**
 * Advances one OSPF neighbor's state machine given an event.
 * Returns the new neighbor record and any protocol events to dispatch.
 */
export function ospfNeighborTransition(
  neighbor: OspfNeighborRecord,
  event: OspfNeighborEvent,
  now: number,
  myRouterId: string
): OspfNeighborTransitionResult {
  const next = { ...neighbor };
  const events: OspfProtocolEvent[] = [];

  switch (event) {
    case 'HelloReceived': {
      next.lastHelloAt = now;
      next.deadTimer = neighbor.deadInterval;
      if (neighbor.state === 'Down' || neighbor.state === 'Attempt') {
        next.state = 'Init';
        events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → Init (Hello received)` });
      }
      break;
    }

    case '2-WayReceived': {
      // Router sees its own Router-ID in the neighbor's Hello neighbor list
      if (neighbor.state === 'Init') {
        next.state = '2-Way';
        events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → 2-Way` });
        // Decide whether to form adjacency (P2P or DR/BDR involved)
        // For simplicity: always proceed to ExStart on P2P links
        next.state = 'ExStart';
        next.ddSeq = nextDdSeq();
        events.push({ type: 'SendDD', neighborId: neighbor.neighborId, interfaceId: neighbor.interfaceId, isMaster: myRouterId > neighbor.neighborId });
        events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → ExStart` });
      }
      break;
    }

    case 'NegotiationDone': {
      if (neighbor.state === 'ExStart') {
        next.state = 'Exchange';
        events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → Exchange` });
      }
      break;
    }

    case 'ExchangeDone': {
      if (neighbor.state === 'Exchange') {
        // Check if we need to request any LSAs
        if (!neighbor.lsaCount || neighbor.lsaCount === 0) {
          next.state = 'Full';
          events.push({ type: 'RouteUpdate', neighborId: neighbor.neighborId, removed: false });
          events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → Full (no LSA requests needed)` });
        } else {
          next.state = 'Loading';
          events.push({ type: 'SendLsRequest', neighborId: neighbor.neighborId, interfaceId: neighbor.interfaceId });
          events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → Loading` });
        }
      }
      break;
    }

    case 'LoadingDone': {
      if (neighbor.state === 'Loading') {
        next.state = 'Full';
        events.push({ type: 'RouteUpdate', neighborId: neighbor.neighborId, removed: false });
        events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → Full` });
      }
      break;
    }

    case 'SeqNumberMismatch':
    case 'BadLSReq': {
      if (['Exchange', 'Loading', 'Full'].includes(neighbor.state)) {
        next.state = 'ExStart';
        next.ddSeq = (neighbor.ddSeq || 0) + 1;
        events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → ExStart (${event})` });
      }
      break;
    }

    case 'InactivityTimer': {
      // Dead interval expired — neighbor is Down
      next.state = 'Down';
      next.deadTimer = 0;
      events.push({ type: 'RouteUpdate', neighborId: neighbor.neighborId, removed: true });
      events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → Down (Dead timer expired)` });
      break;
    }

    case 'KillNbr':
    case 'LLDown': {
      next.state = 'Down';
      next.deadTimer = 0;
      events.push({ type: 'RouteUpdate', neighborId: neighbor.neighborId, removed: true });
      events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → Down (${event})` });
      break;
    }

    case '1-WayReceived': {
      if (['2-Way', 'ExStart', 'Exchange', 'Loading', 'Full'].includes(neighbor.state)) {
        next.state = 'Init';
        events.push({ type: 'RouteUpdate', neighborId: neighbor.neighborId, removed: true });
        events.push({ type: 'LogEvent', message: `OSPF: Neighbor ${neighbor.neighborId} → Init (1-Way)` });
      }
      break;
    }
  }

  return { nextState: next, events };
}

/**
 * Tick the OSPF dead timer.  Call once per second of simulated time.
 * Returns updated neighbor record; if timer hits 0, fires InactivityTimer.
 */
export function ospfTickDeadTimer(
  neighbor: OspfNeighborRecord,
  elapsedSeconds: number,
  now: number,
  myRouterId: string
): OspfNeighborTransitionResult {
  const next = { ...neighbor, deadTimer: Math.max(0, neighbor.deadTimer - elapsedSeconds) };
  if (next.deadTimer === 0 && neighbor.state !== 'Down') {
    return ospfNeighborTransition(next, 'InactivityTimer', now, myRouterId);
  }
  return { nextState: next, events: [] };
}

// ─────────────────────────────────────────────
// STP Port State Machine  (IEEE 802.1D / 802.1W)
// ─────────────────────────────────────────────

export type StpPortState =
  | 'Disabled'
  | 'Blocking'
  | 'Listening'
  | 'Learning'
  | 'Forwarding'
  | 'Discarding'; // RSTP

export type StpPortRole =
  | 'Root'
  | 'Designated'
  | 'Alternate'
  | 'Backup'
  | 'Disabled';

export interface StpPortRecord {
  portId: string;
  vlanId: number;
  role: StpPortRole;
  state: StpPortState;
  stateTimer: number;     // Seconds in current state (for transitions)
  forwardDelay: number;   // Default 15s
  helloTime: number;      // Default 2s
  maxAge: number;         // Default 20s
  bpduAge: number;        // Seconds since last BPDU received
  portFast: boolean;      // PortFast enabled (skip Listening/Learning)
  isRstp: boolean;        // RSTP mode (802.1W)
}

export type StpPortEvent =
  | 'BpduReceived'          // BPDU received on port
  | 'SelectedAsRoot'        // Port selected as Root port
  | 'SelectedAsDesignated'  // Port selected as Designated port
  | 'SelectedAsAlternate'   // Port selected as Alternate port
  | 'ForwardDelayExpired'   // Timer expired (Listening→Learning or Learning→Forwarding)
  | 'MaxAgeExpired'         // Max age expired (BPDU timeout → Blocking)
  | 'PortEnabled'           // Interface came up
  | 'PortDisabled';         // Interface went down

export interface StpPortTransitionResult {
  nextPort: StpPortRecord;
  stateChanged: boolean;
  logMessage?: string;
}

export function stpPortTransition(
  port: StpPortRecord,
  event: StpPortEvent
): StpPortTransitionResult {
  const next = { ...port };
  let stateChanged = false;
  let logMessage: string | undefined;

  switch (event) {
    case 'PortEnabled': {
      if (port.portFast) {
        next.state = 'Forwarding';
        next.role = 'Designated';
        stateChanged = true;
        logMessage = `STP: Port ${port.portId} VLAN${port.vlanId} → Forwarding (PortFast)`;
      } else {
        next.state = port.isRstp ? 'Discarding' : 'Blocking';
        next.stateTimer = 0;
        stateChanged = true;
        logMessage = `STP: Port ${port.portId} VLAN${port.vlanId} → ${next.state}`;
      }
      break;
    }

    case 'PortDisabled': {
      next.state = 'Disabled';
      next.role = 'Disabled';
      stateChanged = true;
      logMessage = `STP: Port ${port.portId} VLAN${port.vlanId} → Disabled`;
      break;
    }

    case 'BpduReceived': {
      next.bpduAge = 0; // Reset BPDU age timer
      break;
    }

    case 'SelectedAsRoot': {
      if (port.role !== 'Root') {
        next.role = 'Root';
        if (port.isRstp) {
          next.state = 'Forwarding'; // RSTP: rapid transition
        } else {
          next.state = 'Listening';
          next.stateTimer = 0;
        }
        stateChanged = true;
        logMessage = `STP: Port ${port.portId} VLAN${port.vlanId} selected as Root port → ${next.state}`;
      }
      break;
    }

    case 'SelectedAsDesignated': {
      if (port.role !== 'Designated') {
        next.role = 'Designated';
        if (port.isRstp) {
          next.state = 'Forwarding';
        } else {
          next.state = 'Listening';
          next.stateTimer = 0;
        }
        stateChanged = true;
        logMessage = `STP: Port ${port.portId} VLAN${port.vlanId} selected as Designated → ${next.state}`;
      }
      break;
    }

    case 'SelectedAsAlternate': {
      if (port.role !== 'Alternate') {
        next.role = 'Alternate';
        next.state = port.isRstp ? 'Discarding' : 'Blocking';
        stateChanged = true;
        logMessage = `STP: Port ${port.portId} VLAN${port.vlanId} selected as Alternate → ${next.state}`;
      }
      break;
    }

    case 'ForwardDelayExpired': {
      if (port.state === 'Listening') {
        next.state = 'Learning';
        next.stateTimer = 0;
        stateChanged = true;
        logMessage = `STP: Port ${port.portId} VLAN${port.vlanId} → Learning`;
      } else if (port.state === 'Learning') {
        next.state = 'Forwarding';
        next.stateTimer = 0;
        stateChanged = true;
        logMessage = `STP: Port ${port.portId} VLAN${port.vlanId} → Forwarding`;
      }
      break;
    }

    case 'MaxAgeExpired': {
      if (['Blocking', 'Listening', 'Learning'].includes(port.state)) {
        next.state = port.isRstp ? 'Discarding' : 'Blocking';
        next.bpduAge = 0;
        stateChanged = true;
        logMessage = `STP: Port ${port.portId} VLAN${port.vlanId} BPDU timeout → ${next.state}`;
      }
      break;
    }
  }

  return { nextPort: next, stateChanged, logMessage };
}

/**
 * Tick STP port timers.  Call once per second of simulated time.
 * Returns list of transition results if timers expire.
 */
export function stpTickPort(
  port: StpPortRecord,
  elapsedSeconds: number
): StpPortTransitionResult[] {
  const results: StpPortTransitionResult[] = [];
  const ticked = {
    ...port,
    stateTimer: port.stateTimer + elapsedSeconds,
    bpduAge: port.bpduAge + elapsedSeconds,
  };

  // Forward delay timer (Listening → Learning → Forwarding)
  if ((ticked.state === 'Listening' || ticked.state === 'Learning') &&
      ticked.stateTimer >= ticked.forwardDelay) {
    const res = stpPortTransition({ ...ticked, stateTimer: 0 }, 'ForwardDelayExpired');
    results.push(res);
    return results;
  }

  // Max age (BPDU timeout)
  if (ticked.bpduAge >= ticked.maxAge &&
      ['Blocking', 'Listening', 'Learning', 'Discarding'].includes(ticked.state)) {
    const res = stpPortTransition(ticked, 'MaxAgeExpired');
    results.push(res);
    return results;
  }

  results.push({ nextPort: ticked, stateChanged: false });
  return results;
}

// ─────────────────────────────────────────────
// DHCP Client State Machine  (RFC 2131 §4.4)
// ─────────────────────────────────────────────

export type DhcpClientState =
  | 'INIT'
  | 'SELECTING'
  | 'REQUESTING'
  | 'BOUND'
  | 'RENEWING'
  | 'REBINDING'
  | 'INIT-REBOOT'
  | 'REBOOTING';

export interface DhcpClientRecord {
  state: DhcpClientState;
  interfaceId: string;
  clientMac: string;
  offeredIp?: string;
  assignedIp?: string;
  subnetMask?: string;
  gateway?: string;
  dnsServer?: string;
  leaseTime: number;       // Total lease in seconds
  t1: number;              // Renewal time (0.5 × leaseTime)
  t2: number;              // Rebinding time (0.875 × leaseTime)
  leaseStart: number;      // Timestamp when lease was obtained
  serverIp?: string;       // DHCP server IP
  xid: number;             // Transaction ID
  retryCount: number;
  lastEventAt: number;     // Timestamp of last state change
}

export type DhcpClientEvent =
  | 'Discover'             // Client sends DISCOVER
  | 'OfferReceived'        // Server OFFER received
  | 'Request'              // Client sends REQUEST
  | 'AckReceived'          // Server ACK received
  | 'NakReceived'          // Server NAK received
  | 'T1Expired'            // T1 renewal timer expired
  | 'T2Expired'            // T2 rebinding timer expired
  | 'LeaseExpired'         // Full lease expired
  | 'Release'              // Client releases lease
  | 'LinkDown';            // Link went down

export interface DhcpClientTransitionResult {
  nextClient: DhcpClientRecord;
  frameToSend?: 'DISCOVER' | 'REQUEST' | 'RELEASE' | 'DECLINE';
  logMessage?: string;
}

export function dhcpClientTransition(
  client: DhcpClientRecord,
  event: DhcpClientEvent,
  now: number,
  offerData?: { ip: string; mask: string; gw: string; dns?: string; lease: number; serverIp: string }
): DhcpClientTransitionResult {
  const next = { ...client, lastEventAt: now };

  switch (event) {
    case 'Discover': {
      next.state = 'SELECTING';
      next.xid = nextDhcpXid();
      next.retryCount = 0;
      return { nextClient: next, frameToSend: 'DISCOVER', logMessage: `DHCP: ${client.interfaceId} SELECTING — sent DISCOVER` };
    }

    case 'OfferReceived': {
      if (client.state === 'SELECTING' && offerData) {
        next.state = 'REQUESTING';
        next.offeredIp = offerData.ip;
        next.serverIp = offerData.serverIp;
        return { nextClient: next, frameToSend: 'REQUEST', logMessage: `DHCP: ${client.interfaceId} REQUESTING ${offerData.ip}` };
      }
      break;
    }

    case 'AckReceived': {
      if ((client.state === 'REQUESTING' || client.state === 'RENEWING' || client.state === 'REBINDING') && offerData) {
        const lt = offerData.lease || 86400;
        next.state = 'BOUND';
        next.assignedIp = offerData.ip;
        next.subnetMask = offerData.mask;
        next.gateway = offerData.gw;
        next.dnsServer = offerData.dns;
        next.leaseTime = lt;
        next.t1 = lt * 0.5;
        next.t2 = lt * 0.875;
        next.leaseStart = now;
        return { nextClient: next, logMessage: `DHCP: ${client.interfaceId} BOUND — IP ${offerData.ip} lease ${lt}s` };
      }
      break;
    }

    case 'NakReceived': {
      next.state = 'INIT';
      next.assignedIp = undefined;
      next.offeredIp = undefined;
      return { nextClient: next, logMessage: `DHCP: ${client.interfaceId} → INIT (NAK received)` };
    }

    case 'T1Expired': {
      if (client.state === 'BOUND') {
        next.state = 'RENEWING';
        return { nextClient: next, frameToSend: 'REQUEST', logMessage: `DHCP: ${client.interfaceId} RENEWING (T1 expired)` };
      }
      break;
    }

    case 'T2Expired': {
      if (client.state === 'RENEWING') {
        next.state = 'REBINDING';
        return { nextClient: next, frameToSend: 'REQUEST', logMessage: `DHCP: ${client.interfaceId} REBINDING (T2 expired)` };
      }
      break;
    }

    case 'LeaseExpired': {
      next.state = 'INIT';
      next.assignedIp = undefined;
      next.offeredIp = undefined;
      next.serverIp = undefined;
      return { nextClient: next, logMessage: `DHCP: ${client.interfaceId} → INIT (lease expired)` };
    }

    case 'Release': {
      next.state = 'INIT';
      next.assignedIp = undefined;
      return { nextClient: next, frameToSend: 'RELEASE', logMessage: `DHCP: ${client.interfaceId} released IP` };
    }

    case 'LinkDown': {
      next.state = 'INIT';
      next.assignedIp = undefined;
      return { nextClient: next, logMessage: `DHCP: ${client.interfaceId} → INIT (link down)` };
    }
  }

  return { nextClient: next };
}

/**
 * Tick DHCP timers. elapsedSeconds = seconds since last tick.
 */
export function dhcpTickClient(
  client: DhcpClientRecord,
  _elapsedSeconds: number,
  now: number
): DhcpClientTransitionResult | null {
  if (client.state !== 'BOUND' && client.state !== 'RENEWING' && client.state !== 'REBINDING') return null;

  const elapsed = (now - client.leaseStart) / 1000;

  if (client.state === 'BOUND' && elapsed >= client.t1) {
    return dhcpClientTransition(client, 'T1Expired', now);
  }
  if (client.state === 'RENEWING' && elapsed >= client.t2) {
    return dhcpClientTransition(client, 'T2Expired', now);
  }
  if (elapsed >= client.leaseTime) {
    return dhcpClientTransition(client, 'LeaseExpired', now);
  }

  return null;
}

// ─────────────────────────────────────────────
// EIGRP Neighbor State Machine
// ─────────────────────────────────────────────

export type EigrpNeighborState =
  | 'Down'
  | 'Pending'       // Hello sent, waiting for response
  | 'Up';           // Bidirectional communication established

export interface EigrpNeighborRecord {
  neighborIp: string;
  interfaceId: string;
  asNumber: number;
  state: EigrpNeighborState;
  holdTime: number;       // Negotiated hold time in seconds (default 15)
  holdTimer: number;      // Remaining hold time
  kValues: [number, number, number, number, number]; // K1-K5 metric weights
  srtt: number;           // Smooth Round Trip Time (ms)
  rto: number;            // Retransmission Timeout (ms)
  seqNumber: number;
  lastHelloAt: number;
}

export type EigrpNeighborEvent =
  | 'HelloReceived'
  | 'HoldExpired'
  | 'KValueMismatch'
  | 'AsMismatch'
  | 'InterfaceDown';

export interface EigrpNeighborTransitionResult {
  nextNeighbor: EigrpNeighborRecord;
  neighborLost: boolean;
  neighborGained: boolean;
  logMessage?: string;
}

export function eigrpNeighborTransition(
  neighbor: EigrpNeighborRecord,
  event: EigrpNeighborEvent,
  now: number,
  incomingKValues?: [number, number, number, number, number]
): EigrpNeighborTransitionResult {
  const next = { ...neighbor };
  let neighborLost = false;
  let neighborGained = false;
  let logMessage: string | undefined;

  switch (event) {
    case 'HelloReceived': {
      // Verify K-value compatibility
      if (incomingKValues) {
        const kMatch = incomingKValues.every((k, i) => k === neighbor.kValues[i]);
        if (!kMatch) {
          return eigrpNeighborTransition(neighbor, 'KValueMismatch', now);
        }
      }

      next.lastHelloAt = now;
      next.holdTimer = neighbor.holdTime;

      if (neighbor.state === 'Down' || neighbor.state === 'Pending') {
        next.state = 'Up';
        neighborGained = true;
        logMessage = `EIGRP: Neighbor ${neighbor.neighborIp} AS${neighbor.asNumber} → Up`;
      }
      break;
    }

    case 'HoldExpired': {
      if (neighbor.state !== 'Down') {
        next.state = 'Down';
        next.holdTimer = 0;
        neighborLost = true;
        logMessage = `EIGRP: Neighbor ${neighbor.neighborIp} AS${neighbor.asNumber} → Down (Hold timer expired)`;
      }
      break;
    }

    case 'KValueMismatch':
    case 'AsMismatch': {
      next.state = 'Down';
      neighborLost = neighbor.state !== 'Down';
      logMessage = `EIGRP: Neighbor ${neighbor.neighborIp} → Down (${event})`;
      break;
    }

    case 'InterfaceDown': {
      next.state = 'Down';
      next.holdTimer = 0;
      neighborLost = neighbor.state !== 'Down';
      logMessage = `EIGRP: Neighbor ${neighbor.neighborIp} → Down (interface down)`;
      break;
    }
  }

  return { nextNeighbor: next, neighborLost, neighborGained, logMessage };
}

export function eigrpTickHoldTimer(
  neighbor: EigrpNeighborRecord,
  elapsedSeconds: number,
  now: number
): EigrpNeighborTransitionResult {
  const next = { ...neighbor, holdTimer: Math.max(0, neighbor.holdTimer - elapsedSeconds) };
  if (next.holdTimer === 0 && neighbor.state !== 'Down') {
    return eigrpNeighborTransition(next, 'HoldExpired', now);
  }
  return { nextNeighbor: next, neighborLost: false, neighborGained: false };
}

// ─────────────────────────────────────────────
// LACP Port State Machine  (IEEE 802.3ad)
// ─────────────────────────────────────────────

export type LacpPortState =
  | 'Detached'
  | 'Waiting'
  | 'Attached'
  | 'Collecting'
  | 'Distributing'
  | 'Defaulted'   // Using default partner info
  | 'Expired';    // LACPDU timeout

export interface LacpPortRecord {
  portId: string;
  channelGroupId: number;
  actorKey: number;          // Aggregation key (must match partner)
  actorPriority: number;
  actorSystemId: string;     // MAC-based system ID
  actorState: number;        // Bit flags: Activity, Timeout, Aggregation, Sync, Collecting, Distributing, Defaulted, Expired
  partnerKey?: number;
  partnerPriority?: number;
  partnerSystemId?: string;
  partnerState?: number;
  state: LacpPortState;
  lacpduTimer: number;       // Seconds since last LACPDU received
  lacpduTimeout: number;     // 3s (fast) or 90s (slow)
  isActive: boolean;         // LACP mode: active vs passive
}

export type LacpPortEvent =
  | 'LacpduReceived'
  | 'LacpduTimeout'
  | 'Selected'             // Port selected for aggregation
  | 'Standby'              // Port put in standby
  | 'PortMoved'            // Port moved to different aggregator
  | 'PortDisabled';

export interface LacpPortTransitionResult {
  nextPort: LacpPortRecord;
  inBundle: boolean;
  logMessage?: string;
}

export function lacpPortTransition(
  port: LacpPortRecord,
  event: LacpPortEvent,
  partnerInfo?: { key: number; priority: number; systemId: string; state: number }
): LacpPortTransitionResult {
  const next = { ...port };
  let inBundle = port.state === 'Distributing';
  let logMessage: string | undefined;

  switch (event) {
    case 'LacpduReceived': {
      next.lacpduTimer = 0;
      if (partnerInfo) {
        next.partnerKey = partnerInfo.key;
        next.partnerPriority = partnerInfo.priority;
        next.partnerSystemId = partnerInfo.systemId;
        next.partnerState = partnerInfo.state;
      }

      // Key must match for aggregation
      const keyMatch = !partnerInfo || partnerInfo.key === port.actorKey;
      if (keyMatch && port.state === 'Detached') {
        next.state = 'Waiting';
        logMessage = `LACP: Port ${port.portId} → Waiting (LACPDU received, key match)`;
      } else if (keyMatch && port.state === 'Waiting') {
        next.state = 'Attached';
        logMessage = `LACP: Port ${port.portId} → Attached`;
      }
      break;
    }

    case 'Selected': {
      if (port.state === 'Attached') {
        next.state = 'Collecting';
        logMessage = `LACP: Port ${port.portId} → Collecting`;
      } else if (port.state === 'Collecting') {
        next.state = 'Distributing';
        inBundle = true;
        logMessage = `LACP: Port ${port.portId} → Distributing (in bundle, channel-group ${port.channelGroupId})`;
      }
      break;
    }

    case 'LacpduTimeout': {
      next.state = 'Expired';
      inBundle = false;
      logMessage = `LACP: Port ${port.portId} → Expired (LACPDU timeout)`;
      break;
    }

    case 'Standby': {
      next.state = 'Waiting';
      inBundle = false;
      logMessage = `LACP: Port ${port.portId} → Waiting (standby)`;
      break;
    }

    case 'PortMoved':
    case 'PortDisabled': {
      next.state = 'Detached';
      inBundle = false;
      next.partnerKey = undefined;
      next.partnerSystemId = undefined;
      logMessage = `LACP: Port ${port.portId} → Detached (${event})`;
      break;
    }
  }

  return { nextPort: next, inBundle, logMessage };
}

export function lacpTickTimer(
  port: LacpPortRecord,
  elapsedSeconds: number
): LacpPortTransitionResult {
  const next = { ...port, lacpduTimer: port.lacpduTimer + elapsedSeconds };
  if (next.lacpduTimer >= port.lacpduTimeout && port.state !== 'Detached' && port.state !== 'Expired') {
    return lacpPortTransition(next, 'LacpduTimeout');
  }
  return { nextPort: next, inBundle: port.state === 'Distributing' };
}
