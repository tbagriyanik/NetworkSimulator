export interface HopPacketInfo {
  hopIndex: number;
  fromDevice: { id: string; name: string; type: string; ip: string; mac: string };
  toDevice: { id: string; name: string; type: string; ip: string; mac: string };
  cableType: string;
  srcMac: string;
  dstMac: string;
  etherType: string;
  srcIp: string;
  dstIp: string;
  ttl: number;
  protocol: string;
  icmpType: string;
  icmpCode: number;
  icmpSeq: number;
  layer2: string;
  layer3: string;
  layer4: string;
  actionDescription?: string;
}