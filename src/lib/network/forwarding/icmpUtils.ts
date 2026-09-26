/**
 * ICMP Time Exceeded and Destination Unreachable message generator
 * RFC 792 / RFC 4443 Internet Control Message Protocol Specification
 *
 * Extended coverage (Network Engine upgrade):
 *  - Destination Unreachable codes 0/1/2/3/4/5/9/10/13
 *  - Time Exceeded codes 0/1
 *  - Redirect (Type 5, codes 0-3)
 *  - Fragmentation Needed helper for PMTUD
 */
import type { NetworkPacketFrame } from './packetFrame';

export type IcmpErrorType = 'time-exceeded' | 'destination-unreachable' | 'redirect';

export type IcmpUnreachableCode =
  | 0 // Net Unreachable
  | 1 // Host Unreachable
  | 2 // Protocol Unreachable
  | 3 // Port Unreachable
  | 4 // Fragmentation Needed and DF Set (PMTUD)
  | 5 // Source Route Failed
  | 9 // Network Administratively Prohibited
  | 10 // Host Administratively Prohibited
  | 13; // Communication Administratively Prohibited (ACL drop)

export type IcmpTimeExceededCode =
  | 0 // TTL Exceeded in Transit
  | 1; // Fragment Reassembly Time Exceeded

export type IcmpRedirectCode =
  | 0 // Redirect for Network
  | 1 // Redirect for Host
  | 2 // Redirect for TOS and Network
  | 3; // Redirect for TOS and Host

export interface IcmpErrorDetails {
  type: IcmpErrorType;
  icmpType: number; // 3 for Unreachable, 11 for Time Exceeded, 5 for Redirect
  code: number;
  codeName: string;
  reason: string;
}

export function getIcmpCodeDetails(
  type: IcmpErrorType,
  code: number = 0
): { icmpType: number; codeName: string } {
  if (type === 'time-exceeded') {
    return {
      icmpType: 11,
      codeName: code === 1 ? 'Fragment Reassembly Time Exceeded' : 'TTL Exceeded in Transit',
    };
  }
  if (type === 'redirect') {
    switch (code) {
      case 1: return { icmpType: 5, codeName: 'Redirect for Host' };
      case 2: return { icmpType: 5, codeName: 'Redirect for Type of Service and Network' };
      case 3: return { icmpType: 5, codeName: 'Redirect for Type of Service and Host' };
      default: return { icmpType: 5, codeName: 'Redirect for Network' };
    }
  }
  // destination-unreachable
  switch (code) {
    case 0: return { icmpType: 3, codeName: 'Network Unreachable' };
    case 1: return { icmpType: 3, codeName: 'Host Unreachable' };
    case 2: return { icmpType: 3, codeName: 'Protocol Unreachable' };
    case 3: return { icmpType: 3, codeName: 'Port Unreachable' };
    case 4: return { icmpType: 3, codeName: 'Fragmentation Needed and DF Set' };
    case 5: return { icmpType: 3, codeName: 'Source Route Failed' };
    case 9: return { icmpType: 3, codeName: 'Network Administratively Prohibited' };
    case 10: return { icmpType: 3, codeName: 'Host Administratively Prohibited' };
    case 13: return { icmpType: 3, codeName: 'Communication Administratively Prohibited' };
    default: return { icmpType: 3, codeName: 'Destination Unreachable' };
  }
}

function applyIcmpHeader(
  frame: NetworkPacketFrame,
  type: IcmpErrorType,
  code: number,
  reason: string,
  reportingIp: string | undefined
): NetworkPacketFrame {
  const icmp = { ...frame };

  // Swap source and destination IPs for the ICMP response
  const originalSrcIp = frame.srcIp;
  const originalDstIp = frame.dstIp;

  icmp.srcIp = reportingIp || originalDstIp || '127.0.0.1';
  icmp.dstIp = originalSrcIp || '127.0.0.1';

  // Swap source and destination MACs for the ICMP response
  const tempMac = icmp.srcMac;
  icmp.srcMac = icmp.dstMac;
  icmp.dstMac = tempMac;

  // Set protocol to ICMP and update info message
  icmp.protocol = 'ICMP';
  icmp.ttl = 64; // Fresh ICMP error packet TTL

  const { icmpType, codeName } = getIcmpCodeDetails(type, code);

  icmp.info = `ICMP (Type ${icmpType}, Code ${code}: ${codeName}) from ${icmp.srcIp}: ${reason}`;

  return icmp;
}

export function generateIcmpUnreachable(
  frame: NetworkPacketFrame,
  type: IcmpErrorType,
  reason: string,
  code: number = 0,
  reportingRouterIp?: string
): NetworkPacketFrame {
  return applyIcmpHeader(frame, type, code, reason, reportingRouterIp);
}

/**
 * Generate an ICMP Fragmentation Needed message (Type 3, Code 4).
 * Used when a packet exceeds the egress MTU with the DF bit set (PMTUD).
 * RFC 1191 carries the next-hop MTU in the ICMP payload - surfaced here in
 * the frame info so packet-trace consumers can show the correct MTU value.
 */
export function generateIcmpFragmentationNeeded(
  frame: NetworkPacketFrame,
  reason: string,
  nextHopMtu: number,
  reportingRouterIp?: string
): NetworkPacketFrame {
  const icmp = applyIcmpHeader(
    frame,
    'destination-unreachable',
    4,
    `${reason} (next-hop MTU ${nextHopMtu})`,
    reportingRouterIp
  );
  icmp.length = Math.min(frame.length, nextHopMtu);
  icmp.info = `ICMP (Type 3, Code 4: Fragmentation Needed and DF Set) from ${icmp.srcIp}: ${reason} - next-hop MTU ${nextHopMtu}`;
  return icmp;
}

/**
 * Generate an ICMP Redirect message (Type 5).
 * Sent when a router forwards a packet out the same interface it arrived on
 * and the source should use a better first-hop gateway directly.
 */
export function generateIcmpRedirect(
  frame: NetworkPacketFrame,
  betterGatewayIp: string,
  code: IcmpRedirectCode = 0,
  reportingRouterIp?: string
): NetworkPacketFrame {
  const icmp = applyIcmpHeader(
    frame,
    'redirect',
    code,
    `redirect to gateway ${betterGatewayIp}`,
    reportingRouterIp
  );
  icmp.info = `ICMP (Type 5, Code ${code}) Redirect - ${icmp.dstIp} advises ${frame.srcIp} to use gateway ${betterGatewayIp}`;
  return icmp;
}
