import type { SwitchState } from './types';

export interface CoppClassPolicy {
  className: string;
  policeRatePps: number;  // Maximum packets per second allowed for CPU
  conformingPackets: number;
  exceededPackets: number;
}

export interface CoppConfig {
  enabled: boolean;
  policyName?: string;
  classPolicies: Record<string, CoppClassPolicy>;
}

export function getOrCreateCoppConfig(state: SwitchState): CoppConfig {
  if (!state.coppConfig) {
    state.coppConfig = {
      enabled: false,
      classPolicies: {
        'copp-system-class-icmp': { className: 'copp-system-class-icmp', policeRatePps: 100, conformingPackets: 0, exceededPackets: 0 },
        'copp-system-class-routing': { className: 'copp-system-class-routing', policeRatePps: 500, conformingPackets: 0, exceededPackets: 0 },
        'copp-system-class-management': { className: 'copp-system-class-management', policeRatePps: 200, conformingPackets: 0, exceededPackets: 0 }
      }
    };
  }
  return state.coppConfig;
}

export function evaluateCoppPacket(state: SwitchState, packetType: 'icmp' | 'routing' | 'management' | 'other'): { drop: boolean; reason?: string } {
  const copp = state.coppConfig;
  if (!copp || !copp.enabled) return { drop: false };

  const targetClass = packetType === 'icmp' ? 'copp-system-class-icmp'
    : (packetType === 'routing' ? 'copp-system-class-routing' : 'copp-system-class-management');

  const policy = copp.classPolicies[targetClass];
  if (!policy) return { drop: false };

  // Simple token bucket simulation based on police rate
  if (policy.exceededPackets > policy.policeRatePps * 10) {
    policy.exceededPackets++;
    return { drop: true, reason: `CoPP rate-limit exceeded for class ${targetClass}` };
  }

  policy.conformingPackets++;
  return { drop: false };
}
