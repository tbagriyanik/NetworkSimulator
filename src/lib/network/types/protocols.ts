export interface IpSlaOperation {
  id: string;
  type: 'icmp-echo' | 'http' | 'dns' | 'jitter';
  target: string;
  frequency: number;
  timeout?: number;
  running: boolean;
  lastRunAt?: number;
  statistics: {
    attempts: number;
    successes: number;
    failures: number;
    rttMs?: number;
    min?: number;
    avg?: number;
    max?: number;
    jitter?: number;
    last?: number;
    samples?: Array<{ success: boolean; rtt?: number; timestamp?: number }>;
  };
}

export interface ErrdisableConfig {
  autoRecovery: boolean;
  recoveryInterval: number;
  causes: Record<string, boolean>;
}

export interface GreTunnel {
  name: string;
  source: string;
  destination: string;
  ipAddress?: string;
  subnetMask?: string;
  keepalive?: { interval: number; retries: number };
}

export interface VrfInstance {
  name: string;
  rd?: string;
  interfaces: string[];
}

export interface QosPolicy {
  name: string;
  classes: Array<{
    className: string;
    bandwidthPercent?: number;
    priority?: boolean;
    policeRateKbps?: number;
  }>;
}

export interface NveInterface {
  name: string;
  sourceInterface: string;
  vniMappings: Record<number, { vlanId: number; ingressReplication?: boolean }>;
  status: 'up' | 'down';
}

export interface EigrpNamedInstance {
  name: string;
  addressFamilies: Record<string, {
    asNumber: number;
    networks: string[];
    routerId?: string;
    metrics64Bit?: boolean;
  }>;
}

export interface OspfVirtualLinkConfig {
  transitAreaId: string;
  neighborRouterId: string;
  authType?: 'null' | 'simple' | 'md5';
  authKey?: string;
  status: 'up' | 'down';
}
