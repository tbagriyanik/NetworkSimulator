import type { Port } from '@/lib/network/types';
import type { NetworkPacketFrame } from './packetFrame';

export interface Ipv6FhsCheckResult {
  action: 'pass' | 'drop';
  dropReason?: string;
  isViolation: boolean;
  violationType?: 'RA_GUARD' | 'DHCPV6_GUARD';
}

/**
 * Evaluates IPv6 First-Hop Security (RA Guard and DHCPv6 Guard) on an ingress switch port.
 */
export function evaluateIpv6FirstHopSecurity(
  port: Port | undefined,
  frame: NetworkPacketFrame
): Ipv6FhsCheckResult {
  if (!port) return { action: 'pass', isViolation: false };

  // 1. IPv6 Router Advertisement Guard (RA Guard)
  if (port.ipv6RaGuard) {
    const isIcmpv6Ra =
      frame.protocol === 'IPV6' &&
      (frame.info?.toLowerCase().includes('router advertisement') ||
        frame.info?.toLowerCase().includes('ra') ||
        frame.ipProtocol === 58); // ICMPv6

    if (isIcmpv6Ra) {
      return {
        action: 'drop',
        isViolation: true,
        violationType: 'RA_GUARD',
        dropReason: `%IPV6_FHS-4-RA_GUARD_DROPPED: Rogue Router Advertisement packet dropped on untrusted port ${port.id}`,
      };
    }
  }

  // 2. IPv6 DHCPv6 Guard
  if (port.ipv6DhcpGuard) {
    const isDhcpv6ServerPacket =
      frame.protocol === 'DHCPV6' &&
      (frame.dhcpPayload?.messageType === 'offer' ||
        frame.dhcpPayload?.messageType === 'ack' ||
        frame.info?.toLowerCase().includes('advertise') ||
        frame.info?.toLowerCase().includes('reply'));

    if (isDhcpv6ServerPacket) {
      return {
        action: 'drop',
        isViolation: true,
        violationType: 'DHCPV6_GUARD',
        dropReason: `%IPV6_FHS-4-DHCPV6_GUARD_DROPPED: Rogue DHCPv6 Server advertisement dropped on untrusted port ${port.id}`,
      };
    }
  }

  return { action: 'pass', isViolation: false };
}
