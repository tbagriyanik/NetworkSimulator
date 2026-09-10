import { SwitchState } from '@/lib/network/types';
import { evaluateAcl } from '../connectivity/acl';

export interface NatSessionRecord {
  protocol: 'tcp' | 'udp' | 'icmp' | string;
  insideLocalIp: string;
  insideLocalPort?: number;
  insideGlobalIp: string;
  insideGlobalPort?: number;
  outsideLocalIp?: string;
  outsideLocalPort?: number;
  outsideGlobalIp?: string;
  outsideGlobalPort?: number;
  type: 'static' | 'dynamic' | 'pat';
  createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
}

export interface NatEngineTranslationResult {
  translated: boolean;
  newSourceIp?: string;
  newTargetIp?: string;
  newSourcePort?: number;
  newTargetPort?: number;
  updatedState?: SwitchState;
  logMessage?: string;
  error?: string;
}

const DEFAULT_TIMEOUTS = {
  tcp: 120_000,   // 120 seconds
  udp: 30_000,    // 30 seconds
  icmp: 10_000,   // 10 seconds
  default: 60_000 // 60 seconds
};

/**
 * Finds an available global port for PAT overload (1024 - 65535)
 */
function allocateGlobalPort(
  existingTranslations: Array<{ globalIp?: string; globalPort?: number }> = [],
  globalIp: string,
  preferredPort?: number
): number {
  if (preferredPort && preferredPort >= 1024) {
    const isUsed = existingTranslations.some(t => t.globalIp === globalIp && t.globalPort === preferredPort);
    if (!isUsed) return preferredPort;
  }

  // Find next available port starting from 1024
  const usedPorts = new Set(
    existingTranslations
      .filter(t => t.globalIp === globalIp && t.globalPort !== undefined)
      .map(t => t.globalPort as number)
  );

  for (let port = 1024; port <= 65535; port++) {
    if (!usedPorts.has(port)) {
      return port;
    }
  }

  return 1024 + Math.floor(Math.random() * 60000);
}

/**
 * Performs Stateful NAT / PAT translation for a packet traversing a router.
 */
export function processNatPacket(
  state: SwitchState,
  ingressPortId: string,
  egressPortId: string,
  sourceIp: string,
  targetIp: string,
  sourcePort?: number,
  targetPort?: number,
  protocol: string = 'icmp',
  currentTime: number = Date.now()
): NatEngineTranslationResult {
  const ingressPort = state.ports[ingressPortId];
  const egressPort = state.ports[egressPortId];

  if (!ingressPort?.natSide || !egressPort?.natSide || ingressPort.natSide === egressPort.natSide) {
    return { translated: false };
  }

  const normalizedProto = protocol.toLowerCase();
  const translations = [...(state.natTranslations || [])];

  // ─────────────────────────────────────────────────────────────
  // 1. Inside -> Outside (Source NAT / PAT)
  // ─────────────────────────────────────────────────────────────
  if (ingressPort.natSide === 'inside' && egressPort.natSide === 'outside') {
    let newSourceIp = sourceIp;
    let newSourcePort = sourcePort;
    let isTranslated = false;

    // A. Static NAT lookup
    if (state.natStaticTranslations) {
      const staticMatch = state.natStaticTranslations.find(t => t.localIp === sourceIp);
      if (staticMatch) {
        newSourceIp = staticMatch.globalIp;
        isTranslated = true;
      }
    }

    // B. Existing Dynamic / PAT Session Lookup
    if (!isTranslated && translations.length > 0) {
      const existingSession = translations.find(
        t =>
          t.localIp === sourceIp &&
          (t.protocol?.toLowerCase() === normalizedProto || !t.protocol) &&
          (sourcePort === undefined || t.localPort === sourcePort || !t.localPort)
      );

      if (existingSession && existingSession.globalIp) {
        newSourceIp = existingSession.globalIp;
        if (existingSession.globalPort && sourcePort) {
          newSourcePort = existingSession.globalPort;
        }
        existingSession.timestamp = currentTime;
        existingSession.remoteIp = targetIp;
        isTranslated = true;
      }
    }

    // C. Dynamic PAT (Overload) & Pool evaluation
    if (!isTranslated && state.natDynamicRules) {
      for (const rule of state.natDynamicRules) {
        const aclResult = evaluateAcl(rule.aclId, state, sourceIp, targetIp, protocol, sourcePort ? `${sourcePort}` : undefined);
        if (aclResult === 'permit') {
          let globalIp: string | undefined;

          if (rule.overload && rule.interface) {
            const outPort = state.ports[rule.interface];
            if (outPort?.ipAddress) {
              globalIp = outPort.ipAddress;
            }
          } else if (rule.poolName && state.natPools?.[rule.poolName]) {
            globalIp = state.natPools[rule.poolName].startIp;
          }

          if (globalIp) {
            newSourceIp = globalIp;
            const allocatedPort = (rule.overload || sourcePort)
              ? allocateGlobalPort(translations, globalIp, sourcePort)
              : 0;

            if (allocatedPort > 0) {
              newSourcePort = allocatedPort;
            }

            // Create dynamic translation table entry
            translations.push({
              protocol: normalizedProto,
              localIp: sourceIp,
              localPort: sourcePort ?? 0,
              globalIp: globalIp,
              globalPort: allocatedPort,
              remoteIp: targetIp,
              timestamp: currentTime,
              flags: rule.overload ? 'extended, dynamic' : 'dynamic'
            });

            isTranslated = true;
            break;
          }
        }
      }
    }


    if (isTranslated) {
      const updatedState: SwitchState = {
        ...state,
        natTranslations: translations,
      };

      return {
        translated: true,
        newSourceIp,
        newSourcePort,
        updatedState,
        logMessage: `%NAT: Translated Inside ${sourceIp}:${sourcePort ?? 0} -> Global ${newSourceIp}:${newSourcePort ?? 0} (Dst ${targetIp}:${targetPort ?? 0})`
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Outside -> Inside (Destination NAT / Return Traffic)
  // ─────────────────────────────────────────────────────────────
  if (ingressPort.natSide === 'outside' && egressPort.natSide === 'inside') {
    let newTargetIp = targetIp;
    let newTargetPort = targetPort;
    let isTranslated = false;

    // A. Static NAT lookup (Outside -> Inside)
    if (state.natStaticTranslations) {
      const staticMatch = state.natStaticTranslations.find(t => t.globalIp === targetIp);
      if (staticMatch) {
        newTargetIp = staticMatch.localIp;
        isTranslated = true;
      }
    }

    // B. Stateful Translation Table Matching (Return Traffic)
    if (!isTranslated && translations.length > 0) {
      const sessionIndex = translations.findIndex(
        t =>
          t.globalIp === targetIp &&
          (targetPort === undefined || t.globalPort === targetPort || !t.globalPort) &&
          (t.protocol?.toLowerCase() === normalizedProto || !t.protocol)
      );

      if (sessionIndex >= 0) {
        const session = translations[sessionIndex];
        newTargetIp = session.localIp;
        if (session.localPort && targetPort) {
          newTargetPort = session.localPort;
        }
        // Refresh timestamp on activity
        translations[sessionIndex] = {
          ...session,
          timestamp: currentTime,
        };
        isTranslated = true;
      }
    }

    if (isTranslated) {
      const updatedState: SwitchState = {
        ...state,
        natTranslations: translations,
      };

      return {
        translated: true,
        newTargetIp,
        newTargetPort,
        updatedState,
        logMessage: `%NAT: Return packet translated Dst Global ${targetIp}:${targetPort ?? 0} -> Local ${newTargetIp}:${newTargetPort ?? 0}`
      };
    }
  }

  return { translated: false };
}

/**
 * Ages out inactive NAT translation entries based on protocol timeouts.
 */
export function ageOutNatTranslations(state: SwitchState, currentTime: number = Date.now()): { updatedState: SwitchState; expiredCount: number } {
  if (!state.natTranslations || state.natTranslations.length === 0) {
    return { updatedState: state, expiredCount: 0 };
  }

  const initialCount = state.natTranslations.length;
  const filtered = state.natTranslations.filter(t => {
    // Keep static entries or entries without timestamp
    if (!t.timestamp) return true;

    const proto = (t.protocol || 'icmp').toLowerCase();
    const timeout = DEFAULT_TIMEOUTS[proto as keyof typeof DEFAULT_TIMEOUTS] || DEFAULT_TIMEOUTS.default;
    return (currentTime - t.timestamp) < timeout;
  });

  const expiredCount = initialCount - filtered.length;
  if (expiredCount === 0) {
    return { updatedState: state, expiredCount: 0 };
  }

  return {
    updatedState: {
      ...state,
      natTranslations: filtered,
    },
    expiredCount,
  };
}
