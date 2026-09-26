import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { Port } from '@/lib/network/types';
import type { NetworkPacketFrame } from './packetFrame';

export type PipelineStage =
  | 'ingress-l1'
  | 'port-security'
  | 'dhcp-snooping'
  | 'ipv6-fhs'
  | 'stp-state'
  | 'vlan-check'
  | 'acl-ingress'
  | 'control-plane'
  | 'arp-resolution'
  | 'mac-lookup'
  | 'route-lookup'
  | 'nat-translation'
  | 'zbf'
  | 'acl-egress'
  | 'qos'
  | 'netflow'
  | 'span-mirror'
  | 'multicast-rpf'
  | 'egress'
  | 'capture';

export type PipelineAction = 'pass' | 'drop' | 'trap' | 'flood' | 'forward' | 'skip';

export interface PacketTrace {
  hopIndex: number;
  deviceId: string;
  deviceName: string;
  portId: string;
  stage: PipelineStage;
  action: PipelineAction;
  reason: string;
  frameSnapshot: Readonly<NetworkPacketFrame>;
}

export interface HopResult {
  deviceId: string;
  accepted: boolean;
  trapToControlPlane: boolean;
  egressPorts: string[];
  nextDeviceId?: string;
  responseFrame?: NetworkPacketFrame;
  telemetryFrames?: NetworkPacketFrame[];
  traces: PacketTrace[];
}

export interface PipelineResult {
  success: boolean;
  hopResults: HopResult[];
  allTraces: PacketTrace[];
  capturedOnLinks: string[];
  finalFrame?: NetworkPacketFrame;
  dropReason?: string;
  telemetryFrames?: NetworkPacketFrame[];
}

export interface PacketHopTrace {
  deviceId: string;
  portId?: string;
  vlan?: number;
  nextHopDevice?: string;
  details?: string;
}

export interface PacketSimulationResult {
  success: boolean;
  dropReason?: string;
  hops: PacketHopTrace[];
}

export function makeTrace(
  hopIndex: number,
  device: CanvasDevice,
  portId: string,
  stage: PipelineStage,
  action: PipelineAction,
  reason: string,
  frame: NetworkPacketFrame
): PacketTrace {
  return {
    hopIndex,
    deviceId: device.id,
    deviceName: device.name,
    portId,
    stage,
    action,
    reason,
    frameSnapshot: Object.freeze({ ...frame }),
  };
}

export function checkVlan(port: Port, frame: NetworkPacketFrame): { allowed: boolean; reason: string } {
  const fvlan = frame.vlanId ?? 1;

  if (port.mode === 'trunk') {
    if (port.allowedVlans === 'all') {
      return { allowed: true, reason: `Trunk allows all VLANs (frame VLAN ${fvlan})` };
    }
    const allowed = Array.isArray(port.allowedVlans) && port.allowedVlans.includes(fvlan);
    return {
      allowed,
      reason: allowed
        ? `Trunk: VLAN ${fvlan} allowed`
        : `Trunk: VLAN ${fvlan} not in allowed-vlans`
    };
  }

  const portVlan = port.accessVlan ?? port.vlan ?? 1;
  const allowed = fvlan === portVlan || fvlan === 1;
  return {
    allowed,
    reason: allowed
      ? `Access port VLAN ${portVlan} OK`
      : `VLAN mismatch: frame VLAN ${fvlan} ≠ access VLAN ${portVlan}`
  };
}

export type PortStatKind = 'rx' | 'tx' | 'drop' | 'txdrop';

export function updatePortStats(port: Port | undefined, type: PortStatKind, bytes: number = 64): void {
  if (!port) return;
  if (!port.stats) {
    port.stats = { rxPackets: 0, rxBytes: 0, txPackets: 0, txBytes: 0, rxDrops: 0, txDrops: 0, rxErrors: 0, txErrors: 0 };
  }
  if (!port.statistics) {
    port.statistics = {};
  }
  const s = port.stats;
  const st = port.statistics;
  const now = Date.now();
  if (type === 'rx') {
    s.rxPackets = (s.rxPackets ?? 0) + 1;
    s.rxBytes = (s.rxBytes ?? 0) + bytes;
    st.inputPackets = (st.inputPackets ?? 0) + 1;
    st.inputBytes = (st.inputBytes ?? 0) + bytes;
    st.lastInput = now;
  } else if (type === 'tx') {
    s.txPackets = (s.txPackets ?? 0) + 1;
    s.txBytes = (s.txBytes ?? 0) + bytes;
    st.outputPackets = (st.outputPackets ?? 0) + 1;
    st.outputBytes = (st.outputBytes ?? 0) + bytes;
    st.lastOutput = now;
  } else if (type === 'drop') {
    s.rxDrops = (s.rxDrops ?? 0) + 1;
    st.drops = (st.drops ?? 0) + 1;
  } else if (type === 'txdrop') {
    s.txDrops = (s.txDrops ?? 0) + 1;
    st.drops = (st.drops ?? 0) + 1;
  }
}
