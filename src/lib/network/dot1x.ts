import type { SwitchState } from './types';
import { cryptoRandomInteger } from './randomServices';

export type Dot1xState = 'force-authorized' | 'force-unauthorized' | 'connecting' | 'authenticating' | 'authorized' | 'unauthorized' | 'held' | 'failed';

export type EapolFrameType = 'start' | 'logoff' | 'eap' | 'identity' | 'challenge' | 'success' | 'failure';
export type EapCode = 'request' | 'response' | 'success' | 'failure';
export type EapType = 'identity' | 'md5-challenge' | 'tls' | 'peap';

export interface EapolFrame {
  version?: number;
  type: EapolFrameType;
  eapCode?: EapCode;
  eapId?: number;
  eapType?: EapType;
  identity?: string;
  challenge?: string;
  responseValue?: string;
}

export interface RadiusServerConfig {
  ip: string;
  secret: string;
  users?: Record<string, string>; // username -> password
}

export interface Dot1xSession {
  port: string;
  portControl?: 'auto' | 'force-authorized' | 'force-unauthorized';
  state: Dot1xState;
  identity?: string;
  lastFrame?: EapolFrameType;
  lastEapolType?: EapolFrameType;
  lastEapCode?: EapCode;
  failureReason?: string;
  authenticatedAt?: number;
}

export interface EapolExchangeResult {
  nextSession: Dot1xSession;
  responseFrame?: EapolFrame;
  logMessage: string;
}

export const EAPOL_MULTICAST_MAC = '01:80:C2:00:00:03';
export const EAPOL_ETHERTYPE = 0x888e;

export function isFrameAllowedOnDot1xPort(
  switchState: SwitchState,
  portId: string,
  etherType?: number,
  dstMac?: string
): boolean {
  if (!switchState.dot1xSystemAuthControl) return true;

  const session = switchState.dot1xSessions?.[portId];
  if (!session) return true;

  if (session.portControl === 'force-authorized') return true;
  if (session.portControl === 'force-unauthorized') {
    return etherType === EAPOL_ETHERTYPE || dstMac?.toLowerCase() === EAPOL_MULTICAST_MAC;
  }

  if (session.state === 'authorized') return true;

  return etherType === EAPOL_ETHERTYPE || dstMac?.toLowerCase() === EAPOL_MULTICAST_MAC;
}

export function processEapol(
  session: Dot1xSession,
  frame: EapolFrame,
  radiusAvailable: boolean,
  validIdentity = true
): Dot1xSession {
  if (frame.type === 'start') return { ...session, state: 'authenticating', lastFrame: 'start' };
  if (frame.type === 'identity') return { ...session, state: 'authenticating', identity: frame.identity, lastFrame: 'identity' };
  if (frame.type === 'challenge') return { ...session, state: radiusAvailable && validIdentity ? 'authorized' : 'failed', lastFrame: radiusAvailable && validIdentity ? 'success' : 'failure' };
  return { ...session, state: frame.type === 'success' ? 'authorized' : 'failed', lastFrame: frame.type };
}

export function processEapolFrame(
  session: Dot1xSession,
  frame: EapolFrame,
  radiusConfig?: RadiusServerConfig
): EapolExchangeResult {
  if (session.portControl === 'force-authorized') {
    return {
      nextSession: { ...session, state: 'authorized' },
      logMessage: '802.1X Port force-authorized, frame ignored'
    };
  }

  if (session.portControl === 'force-unauthorized') {
    return {
      nextSession: { ...session, state: 'unauthorized' },
      logMessage: '802.1X Port force-unauthorized'
    };
  }

  if (frame.type === 'start') {
    const nextSession: Dot1xSession = {
      ...session,
      state: 'connecting',
      lastEapolType: 'start'
    };
    const responseFrame: EapolFrame = {
      version: 1,
      type: 'eap',
      eapCode: 'request',
      eapId: 1,
      eapType: 'identity'
    };
    return {
      nextSession,
      responseFrame,
      logMessage: '802.1X: Received EAPOL-Start. Sending EAP-Request/Identity'
    };
  }

  if (frame.type === 'logoff') {
    return {
      nextSession: {
        ...session,
        state: 'unauthorized',
        identity: undefined,
        lastEapolType: 'logoff'
      },
      logMessage: '802.1X: Received EAPOL-Logoff. Port unauthorized.'
    };
  }

  if (frame.type === 'eap' && frame.eapCode === 'response' && frame.eapType === 'identity') {
    const identity = frame.identity || 'anonymous';
    const nextSession: Dot1xSession = {
      ...session,
      state: 'authenticating',
      identity,
      lastEapolType: 'eap',
      lastEapCode: 'response'
    };

    const responseFrame: EapolFrame = {
      version: 1,
      type: 'eap',
      eapCode: 'request',
      eapId: 2,
      eapType: 'md5-challenge',
      challenge: `CHALLENGE_${cryptoRandomInteger(100000, 999999)}`
    };

    return {
      nextSession,
      responseFrame,
      logMessage: `802.1X: Received EAP-Response/Identity (${identity}). Forwarding RADIUS Challenge.`
    };
  }

  if (frame.type === 'eap' && frame.eapCode === 'response' && frame.eapType === 'md5-challenge') {
    const username = session.identity || 'user';
    const userPass = frame.responseValue;

    let authenticated = false;
    if (radiusConfig?.users) {
      authenticated = radiusConfig.users[username] !== undefined && (userPass === undefined || radiusConfig.users[username] === userPass);
    } else {
      authenticated = username.length > 0 && !username.includes('invalid');
    }

    if (authenticated) {
      const nextSession: Dot1xSession = {
        ...session,
        state: 'authorized',
        lastEapolType: 'eap',
        lastEapCode: 'success',
        authenticatedAt: Date.now()
      };
      const responseFrame: EapolFrame = {
        version: 1,
        type: 'eap',
        eapCode: 'success',
        eapId: 2
      };
      return {
        nextSession,
        responseFrame,
        logMessage: `802.1X: Authentication Success for user "${username}". Port state: AUTHORIZED.`
      };
    } else {
      const nextSession: Dot1xSession = {
        ...session,
        state: 'unauthorized',
        lastEapolType: 'eap',
        lastEapCode: 'failure',
        failureReason: 'Invalid user credentials or RADIUS Reject'
      };
      const responseFrame: EapolFrame = {
        version: 1,
        type: 'eap',
        eapCode: 'failure',
        eapId: 2
      };
      return {
        nextSession,
        responseFrame,
        logMessage: `802.1X: Authentication Failure for user "${username}". Port state: UNAUTHORIZED.`
      };
    }
  }

  return {
    nextSession: session,
    logMessage: '802.1X: Unhandled EAPOL frame type'
  };
}

export function simulateDot1xAuthExchange(
  portId: string,
  username: string,
  password?: string,
  radiusConfig?: RadiusServerConfig
): { success: boolean; logs: string[]; finalState: Dot1xState } {
  const logs: string[] = [];
  let session: Dot1xSession = {
    port: portId,
    portControl: 'auto',
    state: 'unauthorized'
  };

  logs.push(`[Supplicant -> Switch ${portId}] EAPOL-Start`);
  let res = processEapolFrame(session, { version: 1, type: 'start' }, radiusConfig);
  session = res.nextSession;
  logs.push(`[Switch ${portId}] ${res.logMessage}`);

  logs.push(`[Supplicant -> Switch ${portId}] EAP-Response/Identity (${username})`);
  res = processEapolFrame(session, { version: 1, type: 'eap', eapCode: 'response', eapType: 'identity', identity: username }, radiusConfig);
  session = res.nextSession;
  logs.push(`[Switch ${portId}] ${res.logMessage}`);

  logs.push(`[Supplicant -> Switch ${portId}] EAP-Response/MD5-Challenge`);
  res = processEapolFrame(session, { version: 1, type: 'eap', eapCode: 'response', eapType: 'md5-challenge', responseValue: password }, radiusConfig);
  session = res.nextSession;
  logs.push(`[Switch ${portId}] ${res.logMessage}`);

  return {
    success: session.state === 'authorized',
    logs,
    finalState: session.state
  };
}
