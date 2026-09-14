/**
 * pvlan.ts — Private VLAN (PVLAN) Engine
 *
 * Implements Private VLAN isolation rules:
 * - Isolated ports: can only communicate with promiscuous ports
 * - Community ports: can communicate within same community + promiscuous
 * - Promiscuous ports: can communicate with all secondary VLAN ports
 *
 * commands: `switchport mode private-vlan host/promiscuous`
 */
import type { SwitchState, Port } from './types';

export type PvlanPortRole = 'isolated' | 'community' | 'promiscuous' | 'none';

export interface PvlanPortInfo {
  role: PvlanPortRole;
  primaryVlan?: number;
  secondaryVlan?: number;
}

/**
 * Determines if communication between two ports is allowed under PVLAN rules.
 * Returns false if PVLAN isolation blocks the traffic.
 */
export function isPvlanAllowed(
  srcPortId: string,
  dstPortId: string,
  state: SwitchState
): { allowed: boolean; reason?: string } {
  const domain = state.pvlanDomain;
  if (!domain || !domain.primaryVlan) {
    return { allowed: true }; // No PVLAN configured
  }

  const srcPort = state.ports[srcPortId];
  const dstPort = state.ports[dstPortId];

  if (!srcPort || !dstPort) return { allowed: true };

  const srcInfo = getPvlanPortInfo(srcPort, domain.primaryVlan, domain.isolatedVlan, domain.communityVlans);
  const dstInfo = getPvlanPortInfo(dstPort, domain.primaryVlan, domain.isolatedVlan, domain.communityVlans);

  // Ports not participating in PVLAN
  if (srcInfo.role === 'none' || dstInfo.role === 'none') return { allowed: true };

  // Promiscuous ↔ any: always allowed
  if (srcInfo.role === 'promiscuous' || dstInfo.role === 'promiscuous') {
    return { allowed: true };
  }

  // Isolated ↔ Isolated: BLOCKED
  if (srcInfo.role === 'isolated' && dstInfo.role === 'isolated') {
    return {
      allowed: false,
      reason: `PVLAN: Isolated port ${srcPortId} cannot communicate with isolated port ${dstPortId}. Traffic must go through a promiscuous (uplink) port.`,
    };
  }

  // Isolated ↔ Community: BLOCKED
  if (
    (srcInfo.role === 'isolated' && dstInfo.role === 'community') ||
    (srcInfo.role === 'community' && dstInfo.role === 'isolated')
  ) {
    return {
      allowed: false,
      reason: `PVLAN: Isolated port cannot communicate with community port. Traffic must go through a promiscuous port.`,
    };
  }

  // Community ↔ Community (same community): allowed
  if (srcInfo.role === 'community' && dstInfo.role === 'community') {
    if (srcInfo.secondaryVlan === dstInfo.secondaryVlan) {
      return { allowed: true };
    }
    // Different communities: BLOCKED
    return {
      allowed: false,
      reason: `PVLAN: Community ports from different community VLANs (${srcInfo.secondaryVlan} ↔ ${dstInfo.secondaryVlan}) cannot communicate directly.`,
    };
  }

  return { allowed: true };
}

/**
 * Returns PVLAN role information for a port given the domain configuration.
 */
export function getPvlanPortInfo(
  port: Port,
  primaryVlan: number,
  isolatedVlan?: number,
  communityVlans?: number[]
): PvlanPortInfo {
  if (!port.pvlanMode) return { role: 'none' };

  if (port.pvlanMode === 'promiscuous') {
    return { role: 'promiscuous', primaryVlan };
  }

  if (port.pvlanMode === 'host' && port.pvlanHostAssociation) {
    const { primary, secondary } = port.pvlanHostAssociation;
    if (primary !== primaryVlan) return { role: 'none' };

    if (secondary === isolatedVlan) {
      return { role: 'isolated', primaryVlan, secondaryVlan: secondary };
    }
    if (communityVlans?.includes(secondary)) {
      return { role: 'community', primaryVlan, secondaryVlan: secondary };
    }
  }

  return { role: 'none' };
}

/**
 * Returns the effective VLAN for PVLAN forwarding.
 * Promiscuous ports map secondary VLANs to the primary for upstream routing.
 */
export function getEffectivePvlanVlan(port: Port, primaryVlan: number): number {
  if (port.pvlanMode === 'promiscuous') return primaryVlan;
  if (port.pvlanMode === 'host' && port.pvlanHostAssociation) {
    return port.pvlanHostAssociation.secondary;
  }
  return port.vlan || primaryVlan;
}

/**
 * Returns a summary of PVLAN configuration for `show vlan private-vlan`.
 */
export function getPvlanSummary(state: SwitchState): {
  primaryVlan: number;
  type: 'isolated' | 'community';
  secondaryVlan: number;
  ports: string[];
}[] {
  const domain = state.pvlanDomain;
  if (!domain || !domain.primaryVlan) return [];

  const result: ReturnType<typeof getPvlanSummary> = [];

  // Isolated VLAN
  if (domain.isolatedVlan) {
    const ports = Object.entries(state.ports)
      .filter(([, p]) => p.pvlanMode === 'host' && p.pvlanHostAssociation?.secondary === domain.isolatedVlan)
      .map(([id]) => id);
    result.push({ primaryVlan: domain.primaryVlan, type: 'isolated', secondaryVlan: domain.isolatedVlan, ports });
  }

  // Community VLANs
  for (const communityVlan of domain.communityVlans || []) {
    const ports = Object.entries(state.ports)
      .filter(([, p]) => p.pvlanMode === 'host' && p.pvlanHostAssociation?.secondary === communityVlan)
      .map(([id]) => id);
    result.push({ primaryVlan: domain.primaryVlan, type: 'community', secondaryVlan: communityVlan, ports });
  }

  return result;
}
