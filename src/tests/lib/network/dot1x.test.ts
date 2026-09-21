import { describe, expect, it } from 'vitest';
import {
  processEapol,
  processEapolFrame,
  isFrameAllowedOnDot1xPort,
  simulateDot1xAuthExchange,
  EAPOL_ETHERTYPE,
  EAPOL_MULTICAST_MAC,
} from '@/lib/network/dot1x';
import type { Dot1xSession, RadiusServerConfig } from '@/lib/network/dot1x';
import type { SwitchState } from '@/lib/network/types';

describe('802.1X EAP state machine', () => {
  it('authorizes a valid RADIUS-backed exchange', () => {
    let s: Dot1xSession = { port: 'gi0/1', state: 'unauthorized' };
    s = processEapol(s, { type: 'start' }, true);
    s = processEapol(s, { type: 'identity', identity: 'alice' }, true);
    s = processEapol(s, { type: 'challenge' }, true);
    expect(s.state).toBe('authorized');
  });

  it('fails without RADIUS', () => {
    const s = processEapol({ port: 'gi0/2', state: 'authenticating' }, { type: 'challenge' }, false);
    expect(s.state).toBe('failed');
  });

  it('filters data vs EAPOL control frames via isFrameAllowedOnDot1xPort', () => {
    const baseState = {
      dot1xSystemAuthControl: true,
      dot1xSessions: {
        'gi0/1': { port: 'gi0/1', portControl: 'auto', state: 'unauthorized' },
        'gi0/2': { port: 'gi0/2', portControl: 'auto', state: 'authorized' },
        'gi0/3': { port: 'gi0/3', portControl: 'force-unauthorized', state: 'unauthorized' },
        'gi0/4': { port: 'gi0/4', portControl: 'force-authorized', state: 'authorized' },
      },
    } as unknown as SwitchState;

    // Disabled dot1xSystemAuthControl allows all
    const disabledState = { dot1xSystemAuthControl: false } as unknown as SwitchState;
    expect(isFrameAllowedOnDot1xPort(disabledState, 'gi0/1', 0x0800, '00:11:22:33:44:55')).toBe(true);

    // Unauthorized port in auto mode: data dropped, EAPOL allowed
    expect(isFrameAllowedOnDot1xPort(baseState, 'gi0/1', 0x0800, '00:11:22:33:44:55')).toBe(false);
    expect(isFrameAllowedOnDot1xPort(baseState, 'gi0/1', EAPOL_ETHERTYPE, '00:11:22:33:44:55')).toBe(true);
    expect(isFrameAllowedOnDot1xPort(baseState, 'gi0/1', 0x0800, EAPOL_MULTICAST_MAC)).toBe(true);

    // Authorized port in auto mode: data allowed
    expect(isFrameAllowedOnDot1xPort(baseState, 'gi0/2', 0x0800, '00:11:22:33:44:55')).toBe(true);

    // Force-unauthorized: data dropped, EAPOL allowed
    expect(isFrameAllowedOnDot1xPort(baseState, 'gi0/3', 0x0800, '00:11:22:33:44:55')).toBe(false);
    expect(isFrameAllowedOnDot1xPort(baseState, 'gi0/3', EAPOL_ETHERTYPE)).toBe(true);

    // Force-authorized: all allowed
    expect(isFrameAllowedOnDot1xPort(baseState, 'gi0/4', 0x0800, '00:11:22:33:44:55')).toBe(true);
  });

  it('performs step-by-step EAPOL negotiation with RADIUS credentials', () => {
    const radiusConfig: RadiusServerConfig = {
      ip: '192.168.10.50',
      secret: 'radiusKey123',
      users: {
        engineer: 'SecretPass!1',
      },
    };

    let session: Dot1xSession = {
      port: 'gi0/1',
      portControl: 'auto',
      state: 'unauthorized',
    };

    // Step 1: EAPOL-Start
    const startRes = processEapolFrame(session, { type: 'start' }, radiusConfig);
    expect(startRes.nextSession.state).toBe('connecting');
    expect(startRes.responseFrame?.eapType).toBe('identity');
    session = startRes.nextSession;

    // Step 2: EAP-Response/Identity
    const identRes = processEapolFrame(
      session,
      { type: 'eap', eapCode: 'response', eapType: 'identity', identity: 'engineer' },
      radiusConfig
    );
    expect(identRes.nextSession.state).toBe('authenticating');
    expect(identRes.nextSession.identity).toBe('engineer');
    expect(identRes.responseFrame?.eapType).toBe('md5-challenge');
    expect(identRes.responseFrame?.challenge).toBeDefined();
    session = identRes.nextSession;

    // Step 3: EAP-Response/MD5-Challenge with valid password
    const chalRes = processEapolFrame(
      session,
      { type: 'eap', eapCode: 'response', eapType: 'md5-challenge', responseValue: 'SecretPass!1' },
      radiusConfig
    );
    expect(chalRes.nextSession.state).toBe('authorized');
    expect(chalRes.responseFrame?.eapCode).toBe('success');
    expect(chalRes.nextSession.authenticatedAt).toBeDefined();
  });

  it('rejects invalid password or unknown user during RADIUS authentication', () => {
    const radiusConfig: RadiusServerConfig = {
      ip: '192.168.10.50',
      secret: 'radiusKey123',
      users: {
        engineer: 'SecretPass!1',
      },
    };

    const session: Dot1xSession = {
      port: 'gi0/1',
      portControl: 'auto',
      state: 'authenticating',
      identity: 'engineer',
    };

    // Wrong password
    const failRes = processEapolFrame(
      session,
      { type: 'eap', eapCode: 'response', eapType: 'md5-challenge', responseValue: 'wrongpassword' },
      radiusConfig
    );
    expect(failRes.nextSession.state).toBe('unauthorized');
    expect(failRes.nextSession.failureReason).toContain('Invalid user credentials');
    expect(failRes.responseFrame?.eapCode).toBe('failure');

    // Unknown user
    const unknownSession: Dot1xSession = {
      port: 'gi0/1',
      portControl: 'auto',
      state: 'authenticating',
      identity: 'ghost_user',
    };
    const unknownRes = processEapolFrame(
      unknownSession,
      { type: 'eap', eapCode: 'response', eapType: 'md5-challenge', responseValue: 'SecretPass!1' },
      radiusConfig
    );
    expect(unknownRes.nextSession.state).toBe('unauthorized');
  });

  it('handles EAPOL-Logoff to transition authorized port to unauthorized', () => {
    const session: Dot1xSession = {
      port: 'gi0/1',
      portControl: 'auto',
      state: 'authorized',
      identity: 'alice',
      authenticatedAt: Date.now(),
    };

    const logoffRes = processEapolFrame(session, { type: 'logoff' });
    expect(logoffRes.nextSession.state).toBe('unauthorized');
    expect(logoffRes.nextSession.identity).toBeUndefined();
    expect(logoffRes.nextSession.lastEapolType).toBe('logoff');
  });

  it('respects force-authorized and force-unauthorized overrides in processEapolFrame', () => {
    const forceAuthSession: Dot1xSession = {
      port: 'gi0/1',
      portControl: 'force-authorized',
      state: 'unauthorized',
    };
    const authRes = processEapolFrame(forceAuthSession, { type: 'start' });
    expect(authRes.nextSession.state).toBe('authorized');

    const forceUnauthSession: Dot1xSession = {
      port: 'gi0/2',
      portControl: 'force-unauthorized',
      state: 'authorized',
    };
    const unauthRes = processEapolFrame(forceUnauthSession, { type: 'start' });
    expect(unauthRes.nextSession.state).toBe('unauthorized');
  });

  it('simulates full 802.1X exchange via simulateDot1xAuthExchange', () => {
    const radiusConfig: RadiusServerConfig = {
      ip: '10.0.0.10',
      secret: 'topSecret',
      users: {
        adminUser: 'AdminPass456',
      },
    };

    const successSim = simulateDot1xAuthExchange('gi0/1', 'adminUser', 'AdminPass456', radiusConfig);
    expect(successSim.success).toBe(true);
    expect(successSim.finalState).toBe('authorized');
    expect(successSim.logs.length).toBeGreaterThan(3);

    const failSim = simulateDot1xAuthExchange('gi0/1', 'adminUser', 'BadPass', radiusConfig);
    expect(failSim.success).toBe(false);
    expect(failSim.finalState).toBe('unauthorized');
  });
});
