import { describe, it, expect } from 'vitest';
import {
  isFrameAllowedOnDot1xPort,
  processEapolFrame,
  simulateDot1xAuthExchange,
  EAPOL_ETHERTYPE,
  EAPOL_MULTICAST_MAC,
  RadiusServerConfig,
} from '@/lib/network/dot1x';
import { cmdShowAuth, cmdShowDot1x } from '@/lib/network/core/show/showSecurityDisplay';
import type { SwitchState } from '@/lib/network/types';
import type { CommandContext } from '@/lib/network/core/commandTypes';

describe('802.1X / RADIUS Transport E2E Pipeline (Port Security -> EAPOL FSM -> RADIUS Auth -> Data Forwarding -> Show)', () => {
  const ctx = {} as CommandContext;

  it('blocks regular traffic until 802.1X EAP-MD5 RADIUS authentication succeeds, then unblocks port', () => {
    // 1. Initial Switch State with 802.1X globally enabled
    const switchState = {
      hostname: 'Access-Switch-01',
      dot1xSystemAuthControl: true,
      dot1xSessions: {
        'Fa0/1': {
          port: 'Fa0/1',
          portControl: 'auto',
          state: 'unauthorized',
        },
      },
      ports: {
        'Fa0/1': { id: 'Fa0/1', status: 'connected', shutdown: false },
      },
    } as unknown as SwitchState;

    // 2. Data Plane Filter: Regular data frame (IPv4 EtherType 0x0800) is blocked
    const hostMac = '00:50:79:66:68:01';
    const dataAllowedInitial = isFrameAllowedOnDot1xPort(switchState, 'Fa0/1', 0x0800, hostMac);
    expect(dataAllowedInitial).toBe(false);

    // EAPOL frame (EtherType 0x888e or EAPOL Multicast MAC) is always allowed through
    const eapolAllowed = isFrameAllowedOnDot1xPort(switchState, 'Fa0/1', EAPOL_ETHERTYPE, hostMac);
    expect(eapolAllowed).toBe(true);

    const multicastMacAllowed = isFrameAllowedOnDot1xPort(switchState, 'Fa0/1', 0x0800, EAPOL_MULTICAST_MAC);
    expect(multicastMacAllowed).toBe(true);

    // 3. RADIUS Server Configuration
    const radiusConfig: RadiusServerConfig = {
      ip: '192.168.10.254',
      secret: 'radiusSecretKey99',
      users: {
        'networkAdmin': 'StrongPasswd@2026',
      },
    };

    // 4. EAPOL Handshake with RADIUS server
    let session = switchState.dot1xSessions!['Fa0/1'];

    // Step 1: EAPOL-Start -> Switch replies with EAP-Request/Identity
    const startRes = processEapolFrame(session, { type: 'start' }, radiusConfig);
    expect(startRes.nextSession.state).toBe('connecting');
    expect(startRes.responseFrame?.eapType).toBe('identity');
    session = startRes.nextSession;

    // Step 2: Supplicant responds with EAP-Response/Identity -> Switch issues MD5-Challenge
    const idRes = processEapolFrame(
      session,
      { type: 'eap', eapCode: 'response', eapType: 'identity', identity: 'networkAdmin' },
      radiusConfig
    );
    expect(idRes.nextSession.state).toBe('authenticating');
    expect(idRes.nextSession.identity).toBe('networkAdmin');
    expect(idRes.responseFrame?.eapType).toBe('md5-challenge');
    session = idRes.nextSession;

    // Step 3: Supplicant responds with correct challenge response -> RADIUS confirms SUCCESS
    const chalRes = processEapolFrame(
      session,
      { type: 'eap', eapCode: 'response', eapType: 'md5-challenge', responseValue: 'StrongPasswd@2026' },
      radiusConfig
    );
    expect(chalRes.nextSession.state).toBe('authorized');
    expect(chalRes.responseFrame?.eapCode).toBe('success');
    session = chalRes.nextSession;

    // Apply authorized session back to live switch state
    switchState.dot1xSessions!['Fa0/1'] = session;

    // 5. Data Plane Filter: Now regular IPv4 data packets are allowed
    const dataAllowedAfterAuth = isFrameAllowedOnDot1xPort(switchState, 'Fa0/1', 0x0800, hostMac);
    expect(dataAllowedAfterAuth).toBe(true);

    // 6. CLI Show Output Verification
    const authOutput = cmdShowAuth(switchState, 'show authentication', ctx);
    expect(authOutput.output).toContain('Fa0/1');
    expect(authOutput.output).toContain('networkAdmin');
    expect(authOutput.output).toContain('authorized');

    const dot1xOutput = cmdShowDot1x(switchState, 'show dot1x', ctx);
    expect(dot1xOutput.output).toContain('Sysauthcontrol: Enabled');
    expect(dot1xOutput.output).toContain('PortControl = auto');
    expect(dot1xOutput.output).toContain('ControlState = AUTHORIZED');
    expect(dot1xOutput.output).toContain('Supplicant = networkAdmin');
  });

  it('runs automated multi-step simulation exchange via simulateDot1xAuthExchange', () => {
    const radiusConfig: RadiusServerConfig = {
      ip: '10.10.10.10',
      secret: 'radiusPass',
      users: { staff1: 'StaffPass123' },
    };

    const simSuccess = simulateDot1xAuthExchange('Gi0/1', 'staff1', 'StaffPass123', radiusConfig);
    expect(simSuccess.success).toBe(true);
    expect(simSuccess.finalState).toBe('authorized');
    expect(simSuccess.logs.some((l) => l.includes('Access-Accept'))).toBe(true);

    const simFail = simulateDot1xAuthExchange('Gi0/1', 'staff1', 'WrongPassword', radiusConfig);
    expect(simFail.success).toBe(false);
    expect(simFail.finalState).toBe('unauthorized');
    expect(simFail.logs.some((l) => l.includes('Access-Reject'))).toBe(true);
  });
});
