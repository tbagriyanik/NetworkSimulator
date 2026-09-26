/**
 * bgpStateMachine.ts — BGP Peer State Machine (RFC 4271 §8)
 *
 * Finite state machine for BGP peer sessions:
 *   Idle → Connect → Active → OpenSent → OpenConfirm → Established
 *
 * Pure functions: the caller (eventPipeline or linkStateEngine) drives
 * ticks and events; timers are stored on the session record.
 */

/** RFC 4271 BGP peer states */
export type BgpPeerState =
  | 'Idle'
  | 'Connect'
  | 'Active'
  | 'OpenSent'
  | 'OpenConfirm'
  | 'Established';

export interface BgpSessionRecord {
  peerIp: string;
  localAs: number;
  remoteAs: number;
  state: BgpPeerState;
  keepaliveTime: number;   // Configured keepalive seconds (default 60)
  holdTime: number;        // Negotiated hold time (default 180)
  holdTimer: number;       // Seconds remaining on hold timer
  connectRetry: number;    // Seconds until ConnectRetry fires (Idle/Active)
  connectRetryCounter: number;
  sessionStart?: number;   // Timestamp when Established (ms)
  lastActivityAt: number;  // Timestamp of last received keepalive/update (ms)
  prefixesReceived?: number;
  prefixesSent?: number;
}

export type BgpSessionEvent =
  | 'Start'              // Manual session start / neighbor activated
  | 'TransportOpen'      // TCP connection established
  | 'TransportClosed'    // TCP connection lost (link down, peer reset)
  | 'OpenSentReceived'   // OPEN message received valid
  | 'OpenConfirmReceived'// KEEPALIVE after OPEN → Established
  | 'KeepaliveReceived'  // Periodic keepalive received
  | 'UpdateReceived'     // UPDATE received (refreshes hold timer)
  | 'HoldTimerExpired'   // Hold timer reached zero
  | 'ConnectRetryExpired'// ConnectRetry timer reached zero
  | 'Stop';              // Administrative stop (neighbor shutdown, clear)

export interface BgpSessionTransitionResult {
  nextSession: BgpSessionRecord;
  stateChanged: boolean;
  logMessage?: string;
  /** true when the session left the Established state (routes withdrawn) */
  sessionDropped: boolean;
  /** true when the session reached Established */
  sessionEstablished: boolean;
}

/** Default RFC 4271 timers */
export const BGP_DEFAULT_KEEPALIVE = 60;
export const BGP_DEFAULT_HOLDTIME = 180;

function baseRecord(session: BgpSessionRecord): BgpSessionRecord {
  return { ...session };
}

/**
 * Advance one BGP session's state machine given an event.
 */
export function bgpSessionTransition(
  session: BgpSessionRecord,
  event: BgpSessionEvent,
  now: number
): BgpSessionTransitionResult {
  const next = baseRecord(session);
  let logMessage: string | undefined;
  let sessionDropped = false;
  let sessionEstablished = false;

  switch (event) {
    case 'Start': {
      if (next.state === 'Idle') {
        next.state = 'Connect';
        next.connectRetry = 5; // short simulated ConnectRetry
        logMessage = `BGP: neighbor ${next.peerIp} → Connect (start)`;
      }
      break;
    }

    case 'TransportOpen': {
      if (next.state === 'Connect' || next.state === 'Active') {
        next.state = 'OpenSent';
        next.holdTimer = 4 * BGP_DEFAULT_KEEPALIVE; // large hold during OPEN negotiation
        logMessage = `BGP: neighbor ${next.peerIp} → OpenSent (TCP open)`;
      }
      break;
    }

    case 'OpenSentReceived': {
      if (next.state === 'OpenSent') {
        next.state = 'OpenConfirm';
        next.holdTimer = next.holdTime;
        logMessage = `BGP: neighbor ${next.peerIp} → OpenConfirm (OPEN received)`;
      }
      break;
    }

    case 'OpenConfirmReceived': {
      if (next.state === 'OpenConfirm') {
        next.state = 'Established';
        next.sessionStart = now;
        next.lastActivityAt = now;
        next.holdTimer = next.holdTime;
        sessionEstablished = true;
        logMessage = `%BGP-5-ADJCHANGE: neighbor ${next.peerIp} Up`;
      }
      break;
    }

    case 'KeepaliveReceived':
    case 'UpdateReceived': {
      next.lastActivityAt = now;
      if (next.state === 'Established') {
        next.holdTimer = next.holdTime;
        if (event === 'UpdateReceived') {
          next.prefixesReceived = (next.prefixesReceived ?? 0) + 1;
        }
      } else if (next.state === 'OpenConfirm' && event === 'KeepaliveReceived') {
        // Delegate to OpenConfirmReceived semantics
        return bgpSessionTransition(session, 'OpenConfirmReceived', now);
      }
      break;
    }

    case 'HoldTimerExpired': {
      if (next.state !== 'Idle' && next.state !== 'Established' && next.holdTimer <= 0) {
        // Hold expiry during negotiation → back to Active
        next.state = 'Active';
        next.connectRetry = 5;
        logMessage = `BGP: neighbor ${next.peerIp} → Active (hold timer expired during negotiation)`;
      }
      break;
    }

    case 'ConnectRetryExpired': {
      if (next.state === 'Connect' || next.state === 'Active') {
        next.state = 'Connect';
        next.connectRetry = 5;
        logMessage = `BGP: neighbor ${next.peerIp} ConnectRetry fired → Connect`;
      }
      break;
    }

    case 'TransportClosed': {
      if (next.state !== 'Idle') {
        const wasEstablished = next.state === 'Established';
        next.state = 'Idle';
        next.holdTimer = 0;
        next.sessionStart = undefined;
        next.connectRetry = 5;
        next.connectRetryCounter += 1;
        if (wasEstablished) sessionDropped = true;
        logMessage = `%BGP-3-NOTIFICATION: neighbor ${next.peerIp} — transport closed → Idle${wasEstablished ? ' (Established session dropped)' : ''}`;
      }
      break;
    }

    case 'Stop': {
      if (next.state !== 'Idle') {
        const wasEstablished = next.state === 'Established';
        next.state = 'Idle';
        next.holdTimer = 0;
        next.sessionStart = undefined;
        if (wasEstablished) sessionDropped = true;
        logMessage = `%BGP-5-ADJCHANGE: neighbor ${next.peerIp} Down — administrative reset`;
      }
      break;
    }
  }

  return {
    nextSession: next,
    stateChanged: next.state !== session.state,
    logMessage,
    sessionDropped,
    sessionEstablished,
  };
}

/**
 * Tick a BGP session's timers (call once per simulated second).
 * When the session is Established, keepalives arrive on schedule in the
 * simulation, so the hold timer only matters when the peer stops responding
 * (e.g. after a link-state down that did not hit this session directly).
 * When the session is in a pre-establishment state, ConnectRetry advances.
 */
export function bgpTickSession(
  session: BgpSessionRecord,
  elapsedSeconds: number,
  now: number
): BgpSessionTransitionResult {
  const next = baseRecord(session);

  if (next.state === 'Established') {
    // In simulation, established sessions are refreshed by the pipeline's
    // keepalive generation; the hold timer decays only if nothing refreshes
    // the record (peer silent).
    next.holdTimer = Math.max(0, next.holdTimer - elapsedSeconds);
    if (next.holdTimer === 0) {
      return bgpSessionTransition(next, 'TransportClosed', now);
    }
    return { nextSession: next, stateChanged: false, sessionDropped: false, sessionEstablished: false };
  }

  if (next.state === 'Connect' || next.state === 'Active') {
    next.connectRetry = Math.max(0, next.connectRetry - elapsedSeconds);
    if (next.connectRetry === 0) {
      return bgpSessionTransition(next, 'ConnectRetryExpired', now);
    }
    return { nextSession: next, stateChanged: false, sessionDropped: false, sessionEstablished: false };
  }

  if (next.state === 'OpenSent' || next.state === 'OpenConfirm') {
    next.holdTimer = Math.max(0, next.holdTimer - elapsedSeconds);
    if (next.holdTimer === 0) {
      return bgpSessionTransition(next, 'HoldTimerExpired', now);
    }
    return { nextSession: next, stateChanged: false, sessionDropped: false, sessionEstablished: false };
  }

  // Idle: ConnectRetry counts toward automatic re-connection attempt
  if (next.state === 'Idle' && next.connectRetry > 0) {
    next.connectRetry = Math.max(0, next.connectRetry - elapsedSeconds);
    if (next.connectRetry === 0) {
      return bgpSessionTransition(next, 'Start', now);
    }
  }
  return { nextSession: next, stateChanged: false, sessionDropped: false, sessionEstablished: false };
}

/**
 * Create a session record for a configured neighbor, seeded at Idle.
 */
export function createBgpSessionRecord(
  peerIp: string,
  localAs: number,
  remoteAs: number,
  keepaliveTime: number = BGP_DEFAULT_KEEPALIVE,
  holdTime: number = BGP_DEFAULT_HOLDTIME,
  now: number = Date.now()
): BgpSessionRecord {
  return {
    peerIp,
    localAs,
    remoteAs,
    state: 'Idle',
    keepaliveTime,
    holdTime,
    holdTimer: 0,
    connectRetry: 5,
    connectRetryCounter: 0,
    lastActivityAt: now,
  };
}
