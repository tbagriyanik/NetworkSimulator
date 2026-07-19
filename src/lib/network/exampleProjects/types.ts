import type { SwitchState, CableInfo } from '../types';
import type { CanvasDevice, CanvasConnection, CanvasNote, DeviceType } from '@/components/network/networkTopology.types';
import { FaultDefinition } from '../faults';

export type ProjectData = {
  version: string;
  timestamp: string;
  devices: { id: string; state: SwitchState }[];
  deviceOutputs: { id: string; outputs: unknown[] }[];
  pcOutputs: { id: string; outputs: unknown[] }[];
  pcHistories: { id: string; history: string[] }[];
  topology: {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    notes: CanvasNote[];
  };
  cableInfo: CableInfo;
  activeDeviceId: string;
  activeDeviceType: DeviceType;
  activeTab: 'topology' | 'cmd' | 'terminal' | 'ports' | 'vlan' | 'security';
  zoom: number;
  pan: { x: number; y: number };
};

export type FirewallProtocol = 'icmp' | 'tcp' | 'udp' | 'any';
export type FirewallAction = 'allow' | 'deny';
export type FirewallRule = {
  id: string;
  sourceIp: string;
  targetIp: string;
  port: string;
  protocol: FirewallProtocol;
  action: FirewallAction;
  enabled: boolean;
};

export type ExampleProjectLevel = 'basic' | 'intermediate' | 'advanced';

export type ExampleProject = {
  id: string;
  tag: string;
  title: string;
  description: string;
  detail?: string;
  data: ProjectData;
  level: ExampleProjectLevel;
  injectedFaults?: FaultDefinition[];
};
