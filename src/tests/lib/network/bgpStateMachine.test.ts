import { describe, it, expect } from 'vitest';
import {
  createBgpSessionRecord,
  bgpSessionTransition,
  bgpTickSession,
  BGP_DEFAULT_KEEPALIVE,
  BGP_DEFAULT_HOLDTIME
} from '@/lib/network/protocols/bgpStateMachine';

describe('BGP State Machine & Timer Management (RFC 4271)', () => {
  const now = 1700000000000;

  it('1. Initializes BGP session record correctly in Idle state', () => {
    const session = createBgpSessionRecord('192.168.1.2', 65001, 65002, BGP_DEFAULT_KEEPALIVE, BGP_DEFAULT_HOLDTIME, now);
    expect(session.peerIp).toBe('192.168.1.2');
    expect(session.localAs).toBe(65001);
    expect(session.remoteAs).toBe(65002);
    expect(session.state).toBe('Idle');
    expect(session.holdTime).toBe(180);
    expect(session.keepaliveTime).toBe(60);
  });

  it('2. Follows standard FSM progression: Idle -> Connect -> OpenSent -> OpenConfirm -> Established', () => {
    let session = createBgpSessionRecord('10.0.0.2', 65000, 65001, 60, 180, now);

    // 1. Start event
    let transition = bgpSessionTransition(session, 'Start', now);
    expect(transition.stateChanged).toBe(true);
    expect(transition.nextSession.state).toBe('Connect');
    session = transition.nextSession;

    // 2. TransportOpen (TCP connected)
    transition = bgpSessionTransition(session, 'TransportOpen', now + 100);
    expect(transition.stateChanged).toBe(true);
    expect(transition.nextSession.state).toBe('OpenSent');
    session = transition.nextSession;

    // 3. OpenSentReceived (Valid OPEN message received)
    transition = bgpSessionTransition(session, 'OpenSentReceived', now + 200);
    expect(transition.stateChanged).toBe(true);
    expect(transition.nextSession.state).toBe('OpenConfirm');
    session = transition.nextSession;

    // 4. OpenConfirmReceived (KEEPALIVE received confirming OPEN)
    transition = bgpSessionTransition(session, 'OpenConfirmReceived', now + 300);
    expect(transition.stateChanged).toBe(true);
    expect(transition.nextSession.state).toBe('Established');
    expect(transition.sessionEstablished).toBe(true);
    expect(transition.nextSession.sessionStart).toBe(now + 300);
    expect(transition.nextSession.holdTimer).toBe(180);
  });

  it('3. Refreshes hold timer on Keepalive and Update in Established state', () => {
    let session = createBgpSessionRecord('10.0.0.2', 65000, 65001, 60, 180, now);
    session = bgpSessionTransition(session, 'Start', now).nextSession;
    session = bgpSessionTransition(session, 'TransportOpen', now).nextSession;
    session = bgpSessionTransition(session, 'OpenSentReceived', now).nextSession;
    session = bgpSessionTransition(session, 'OpenConfirmReceived', now).nextSession;

    expect(session.state).toBe('Established');

    // Simulate 30 seconds passing
    session = bgpTickSession(session, 30, now + 30000).nextSession;
    expect(session.holdTimer).toBe(150);

    // Receive Keepalive -> hold timer resets to full negotiated hold time
    const keepaliveRes = bgpSessionTransition(session, 'KeepaliveReceived', now + 30500);
    expect(keepaliveRes.nextSession.holdTimer).toBe(180);
    expect(keepaliveRes.nextSession.lastActivityAt).toBe(now + 30500);

    // Simulate 50 seconds passing
    session = bgpTickSession(keepaliveRes.nextSession, 50, now + 80500).nextSession;
    expect(session.holdTimer).toBe(130);

    // Receive Update -> hold timer resets and prefixesReceived increments
    const updateRes = bgpSessionTransition(session, 'UpdateReceived', now + 81000);
    expect(updateRes.nextSession.holdTimer).toBe(180);
    expect(updateRes.nextSession.prefixesReceived).toBe(1);
  });

  it('4. Drops Established session when hold timer expires via timer ticking', () => {
    let session = createBgpSessionRecord('10.0.0.2', 65000, 65001, 60, 180, now);
    session = bgpSessionTransition(session, 'Start', now).nextSession;
    session = bgpSessionTransition(session, 'TransportOpen', now).nextSession;
    session = bgpSessionTransition(session, 'OpenSentReceived', now).nextSession;
    session = bgpSessionTransition(session, 'OpenConfirmReceived', now).nextSession;

    expect(session.state).toBe('Established');

    // Peer goes completely silent: tick 180 seconds
    const tickResult = bgpTickSession(session, 180, now + 180000);

    // Should transition to Idle and flag sessionDropped
    expect(tickResult.nextSession.state).toBe('Idle');
    expect(tickResult.sessionDropped).toBe(true);
    expect(tickResult.nextSession.sessionStart).toBeUndefined();
    expect(tickResult.logMessage).toContain('transport closed');
  });

  it('5. Handles administrative stop from Established state', () => {
    let session = createBgpSessionRecord('10.0.0.2', 65000, 65001, 60, 180, now);
    session = bgpSessionTransition(session, 'Start', now).nextSession;
    session = bgpSessionTransition(session, 'TransportOpen', now).nextSession;
    session = bgpSessionTransition(session, 'OpenSentReceived', now).nextSession;
    session = bgpSessionTransition(session, 'OpenConfirmReceived', now).nextSession;

    const stopRes = bgpSessionTransition(session, 'Stop', now + 5000);
    expect(stopRes.nextSession.state).toBe('Idle');
    expect(stopRes.sessionDropped).toBe(true);
    expect(stopRes.logMessage).toContain('%BGP-5-ADJCHANGE');
  });
});
