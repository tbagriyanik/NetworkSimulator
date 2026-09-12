// Types for pathResolution module

export type ConnectivityResult = {
  success: boolean;
  hops: string[];
  hopIds: string[];
  targetId?: string;
  error?: string;
  portSecurityViolations?: Array<{ deviceId: string; portId: string; action: string; mac: string }>;
  traversedPorts?: Array<{ deviceId: string; portId: string; type: 'ingress' | 'egress' }>;
  capturedPackets?: Array<{ connectionId: string; sourceIp: string; targetIp: string; protocol: string; length: number; info: string }>;
};
