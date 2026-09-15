// VLAN and L2 STP/Snooping Types

export interface Vlan {
  id: number;
  name: string;
  status: 'active' | 'suspend';
  ports: string[];
  ipAddress?: string;
  subnetMask?: string;
}

export interface StpVlanState {
  vlanId: number;
  bridgeId: string;        // priority + MAC, e.g. "32768.AABB.CC00.0100"
  rootBridgeId: string;
  isRoot: boolean;
  rootCost: number;
  ports: Record<string, {
    role: 'root' | 'designated' | 'alternate' | 'backup' | 'disabled';
    state: 'forwarding' | 'blocking' | 'listening' | 'learning' | 'disabled';
    cost: number;
    proposal?: boolean;
    agreement?: boolean;
  }>;
}

export interface DhcpSnoopingBinding {
  macAddress: string;
  ipAddress: string;
  vlan: number;
  portId: string;
  leaseTime?: number;
  type: 'dynamic' | 'static';
}
