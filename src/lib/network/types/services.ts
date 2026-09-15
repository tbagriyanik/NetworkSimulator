// Service, SLA, Redistribution, and MST Types

export interface RedistributeRule {
  targetProtocol: string; // 'ospf' | 'rip' | 'eigrp' | 'bgp'
  sourceProtocol: 'ospf' | 'rip' | 'eigrp' | 'bgp' | 'static' | 'connected';
  processId?: string;
  metric?: number;
  subnets?: boolean;
}

export interface MstConfig {
  name?: string;
  revision?: number;
  instances?: Record<number, number[]>; // instanceId -> vlanIds
  instancePriorities?: Record<number, number>; // instanceId -> priority
  pendingInstances?: Record<number, number[]>;
  pendingName?: string;
  pendingRevision?: number;
}
