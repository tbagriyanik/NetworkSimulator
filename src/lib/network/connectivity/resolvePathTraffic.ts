import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { scheduleQosPackets, type QosPacket, type QosScheduleResult } from '@/lib/network/qosScheduler';
import { establishIpsecSa, encapsulateEsp, type EspPacket } from '@/lib/network/ipsec';
import { checkConnectivity } from './pathResolution/algorithm';

/** Resolves a path and applies configured QoS/IPsec simulation to its packet batch. */
export function resolvePathTraffic(
  sourceId: string, targetIp: string, packets: QosPacket[], devices: CanvasDevice[], connections: CanvasConnection[], deviceStates: Map<string, SwitchState>, language: 'tr' | 'en' = 'tr'
): { connectivity: ReturnType<typeof checkConnectivity>; qos?: QosScheduleResult; esp?: EspPacket } {
  const connectivity = checkConnectivity(sourceId, targetIp, devices, connections, deviceStates, language);
  if (!connectivity.success) return { connectivity };
  const source = deviceStates.get(sourceId);
  const service = source?.qosServicePolicies && Object.values(source.qosServicePolicies)[0];
  const policy = service && source.qosPolicyMaps?.[service.policy];
  const qos = policy ? scheduleQosPackets('cbwfq', packets, 1500, Object.entries(policy.classes).map(([name, c]) => ({ name, ...c }))) : undefined;
  const crypto = source?.cryptoMaps && Object.values(source.cryptoMaps).flatMap(m => Object.values(m)).find(m => m.setPeer && m.setTransformSet);
  const esp = crypto?.setPeer && crypto.setTransformSet ? encapsulateEsp('ip', establishIpsecSa(crypto.setPeer, crypto.setTransformSet)) : undefined;
  return { connectivity, qos, esp };
}
