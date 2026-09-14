// Types for pathResolution module

export type PortSecurityViolation = { deviceId: string; portId: string; action: string; mac: string };
export type TraversedPort = { deviceId: string; portId: string; type: 'ingress' | 'egress' };
export type CapturedPacket = { connectionId: string; sourceIp: string; targetIp: string; protocol: string; length: number; info: string };
export type CheckOptions = {
  protocol?: 'tcp' | 'udp' | 'icmp' | 'any';
  port?: string;
  dhcpMessage?: 'discover' | 'offer' | 'request' | 'ack';
  packetType?: string;
  arpMessage?: string;
};

export type ConnectivityResult = {
  success: boolean;
  hops: string[];
  hopIds: string[];
  targetId?: string;
  error?: string;
  portSecurityViolations?: PortSecurityViolation[];
  traversedPorts?: TraversedPort[];
  capturedPackets?: CapturedPacket[];
};