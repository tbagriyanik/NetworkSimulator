import type { SwitchState, Port } from '@/lib/network/types';

export interface ZoneSecurity {
  name: string;
  description?: string;
}

export interface ZonePairSecurity {
  name: string;
  sourceZone: string;
  destinationZone: string;
  servicePolicy?: string;
  action: 'inspect' | 'pass' | 'drop';
}

export interface ZbfSession {
  id: string;
  protocol: string;
  srcIp: string;
  dstIp: string;
  srcPort?: number;
  dstPort?: number;
  sourceZone: string;
  destinationZone: string;
  createdAt: number;
  lastActivity: number;
}

export interface ZbfEvaluationResult {
  action: 'pass' | 'inspect' | 'drop' | 'skip';
  permitted: boolean;
  reason: string;
  sessionCreated?: boolean;
}

// In-memory stateful session table for active ZBFW flows
const activeZbfSessions: Map<string, ZbfSession> = new Map();

function buildSessionKey(protocol: string, srcIp: string, dstIp: string, srcPort?: number, dstPort?: number): string {
  return `${protocol.toLowerCase()}:${srcIp}:${srcPort ?? 0}->${dstIp}:${dstPort ?? 0}`;
}

function buildReverseSessionKey(protocol: string, srcIp: string, dstIp: string, srcPort?: number, dstPort?: number): string {
  return `${protocol.toLowerCase()}:${dstIp}:${dstPort ?? 0}->${srcIp}:${srcPort ?? 0}`;
}

export function evaluateZbf(
  state: SwitchState,
  ingressPort: Port | undefined,
  egressPort: Port | undefined,
  srcIp: string,
  dstIp: string,
  protocol: string = 'icmp',
  srcPort?: number,
  dstPort?: number,
  now: number = Date.now()
): ZbfEvaluationResult {
  const srcZone = ingressPort?.zoneMember;
  const dstZone = egressPort?.zoneMember;

  // If interfaces are not assigned to security zones, ZBF does not apply (skip)
  if (!srcZone && !dstZone) {
    return { action: 'skip', permitted: true, reason: 'No ZBF security zones configured on ports' };
  }

  // If one port has a zone and the other does not, traffic is blocked by default in ZBFW
  if (!srcZone || !dstZone) {
    return {
      action: 'drop',
      permitted: false,
      reason: `ZBF Policy Drop: Inter-zone boundary mismatch (${srcZone || 'no-zone'} -> ${dstZone || 'no-zone'})`,
    };
  }

  // Intra-zone traffic (same zone) is permitted by default
  if (srcZone.toLowerCase() === dstZone.toLowerCase()) {
    return {
      action: 'pass',
      permitted: true,
      reason: `ZBF Intra-zone traffic permitted within zone "${srcZone}"`,
    };
  }

  // Check stateful return session (Out-to-In returning traffic for an inspected session)
  const returnKey = buildReverseSessionKey(protocol, srcIp, dstIp, srcPort, dstPort);
  const existingSession = activeZbfSessions.get(returnKey);
  if (existingSession && now - existingSession.lastActivity < 60000) {
    existingSession.lastActivity = now;
    return {
      action: 'inspect',
      permitted: true,
      reason: `ZBF Stateful Return Traffic: Matched existing established session (${returnKey})`,
    };
  }

  // Inter-zone: lookup zone-pair
  const zonePairs = state.zonePairs || [];
  const matchingPair = zonePairs.find(
    (zp) =>
      zp.sourceZone.toLowerCase() === srcZone.toLowerCase() &&
      zp.destinationZone.toLowerCase() === dstZone.toLowerCase()
  );

  if (!matchingPair) {
    return {
      action: 'drop',
      permitted: false,
      reason: `ZBF Default Drop: No zone-pair configured for source "${srcZone}" to destination "${dstZone}"`,
    };
  }

  if (matchingPair.action === 'drop') {
    return {
      action: 'drop',
      permitted: false,
      reason: `ZBF Explicit Drop: Zone-pair "${matchingPair.name}" dropped traffic (${srcZone} -> ${dstZone})`,
    };
  }

  if (matchingPair.action === 'inspect') {
    const sessionKey = buildSessionKey(protocol, srcIp, dstIp, srcPort, dstPort);
    activeZbfSessions.set(sessionKey, {
      id: sessionKey,
      protocol: protocol.toLowerCase(),
      srcIp,
      dstIp,
      srcPort,
      dstPort,
      sourceZone: srcZone,
      destinationZone: dstZone,
      createdAt: now,
      lastActivity: now,
    });

    return {
      action: 'inspect',
      permitted: true,
      sessionCreated: true,
      reason: `ZBF Inspect: Zone-pair "${matchingPair.name}" inspected and tracked stateful flow (${srcZone} -> ${dstZone})`,
    };
  }

  return {
    action: 'pass',
    permitted: true,
    reason: `ZBF Pass: Zone-pair "${matchingPair.name}" permitted stateless traffic (${srcZone} -> ${dstZone})`,
  };
}

export function clearZbfSessions(): void {
  activeZbfSessions.clear();
}
