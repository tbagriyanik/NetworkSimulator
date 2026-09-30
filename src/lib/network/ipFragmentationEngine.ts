/**
 * ipFragmentationEngine.ts — IP Packet Fragmentation & MTU Validation Engine
 *
 * Implements RFC 791 IP Fragmentation & Path MTU discovery rules:
 * - Checks Don't Fragment (DF) bit against interface MTU.
 * - Generates Fragment Offset (8-byte units) and More Fragments (MF) flag.
 * - Models OSPF EXSTART/EXCHANGE MTU mismatch state machine lockups.
 */

export interface IpPacketInfo {
  id: string;
  sourceIp: string;
  targetIp: string;
  protocol: string;
  totalLength: number;
  dontFragment?: boolean;
  moreFragments?: boolean;
  fragmentOffset?: number;
  identification?: number;
}

export interface FragmentResult {
  fragmented: boolean;
  dropped: boolean;
  error?: string;
  icmpDetail?: string;
  fragments: IpPacketInfo[];
}

export function processIpFragmentation(
  packet: IpPacketInfo,
  mtu: number = 1500
): FragmentResult {
  const ipHeaderSize = 20;
  const payloadSize = Math.max(0, packet.totalLength - ipHeaderSize);

  if (packet.totalLength <= mtu) {
    return {
      fragmented: false,
      dropped: false,
      fragments: [{ ...packet, moreFragments: false, fragmentOffset: 0 }],
    };
  }

  // MTU exceeded
  if (packet.dontFragment) {
    return {
      fragmented: false,
      dropped: true,
      error: `Packet size (${packet.totalLength}B) exceeds MTU (${mtu}B) with DF bit set`,
      icmpDetail: 'ICMP Type 3 Code 4 (Fragmentation Needed and DF Set)',
      fragments: [],
    };
  }

  // Fragment payload into MTU-compatible chunks
  const maxPayloadPerFragment = Math.floor((mtu - ipHeaderSize) / 8) * 8; // Must be 8-byte aligned
  const fragments: IpPacketInfo[] = [];
  let currentOffset = 0;
  let remainingPayload = payloadSize;
  const ident = packet.identification || Math.floor(Math.random() * 65535);

  let fragIndex = 1;
  while (remainingPayload > 0) {
    const chunkPayload = Math.min(remainingPayload, maxPayloadPerFragment);
    remainingPayload -= chunkPayload;
    const isLast = remainingPayload === 0;

    fragments.push({
      ...packet,
      id: `${packet.id}-frag${fragIndex++}`,
      totalLength: chunkPayload + ipHeaderSize,
      dontFragment: false,
      moreFragments: !isLast,
      fragmentOffset: Math.floor(currentOffset / 8),
      identification: ident,
    });

    currentOffset += chunkPayload;
  }

  return {
    fragmented: true,
    dropped: false,
    fragments,
  };
}

export interface OspfMtuCheckResult {
  isCompatible: boolean;
  state: 'FULL' | 'EXSTART' | 'EXCHANGE';
  stuck: boolean;
  detail: string;
}

export function checkOspfMtuCompatibility(
  localMtu: number,
  remoteMtu: number,
  ignoreMtuMismatch: boolean = false
): OspfMtuCheckResult {
  if (ignoreMtuMismatch || localMtu === remoteMtu) {
    return {
      isCompatible: true,
      state: 'FULL',
      stuck: false,
      detail: `MTU match (${localMtu}B = ${remoteMtu}B). OSPF adjacency reached FULL.`,
    };
  }

  return {
    isCompatible: false,
    state: 'EXSTART',
    stuck: true,
    detail: `MTU mismatch (Local: ${localMtu}B, Remote: ${remoteMtu}B). Neighbor stuck in EXSTART/EXCHANGE state (DBD payload rejected).`,
  };
}
