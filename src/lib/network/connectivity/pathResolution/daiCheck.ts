import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { normalizePortId } from '@/lib/network/initialState';
import type { ConnectivityResult, CheckOptions } from './types';
import { isSwitchDeviceType, getPortVlan } from './pathUtils';
import { evaluateDai } from '@/lib/network/dai';

export type DaiCheckDeps = {
  deviceStates?: Map<string, SwitchState>;
  path: string[];
  deviceMap: Map<string, CanvasDevice>;
  safeDeviceStates: Map<string, SwitchState>;
  pathConnections: Map<string, CanvasConnection>;
  options?: CheckOptions;
  language: 'tr' | 'en';
  hopNames: string[];
  targetDevice: CanvasDevice;
  srcMac?: string;
  srcIp?: string;
};

export type DaiCheckResult = { type: 'error'; result: ConnectivityResult } | { type: 'ok' };

/**
 * Enforces Dynamic ARP Inspection along the packet path.
 * Mirrors the dhcpSnooping.ts pattern for consistent pipeline integration.
 */
export function enforceDai(deps: DaiCheckDeps): DaiCheckResult {
  const {
    deviceStates, path, deviceMap, safeDeviceStates,
    pathConnections, options, language, hopNames, targetDevice,
    srcMac, srcIp,
  } = deps;

  // Only run DAI check for ARP packets
  if (options?.packetType !== 'arp' && !options?.arpMessage) {
    return { type: 'ok' };
  }

  if (!srcIp || !srcMac) return { type: 'ok' };
  if (!deviceStates) return { type: 'ok' };

  for (let i = 0; i < path.length; i++) {
    const deviceId = path[i];
    const state = safeDeviceStates.get(deviceId);
    const device = deviceMap.get(deviceId);

    if (!state || !device || !isSwitchDeviceType(device.type)) continue;
    if (!state.daiEnabled && !(state.arpInspectionVlans?.length)) continue;

    const prevDeviceId = i > 0 ? path[i - 1] : null;
    if (!prevDeviceId) continue;

    const ingressConn = pathConnections.get(`${prevDeviceId}-${deviceId}`);
    if (!ingressConn) continue;

    const rawIngressPortId = ingressConn.sourceDeviceId === deviceId
      ? ingressConn.sourcePort
      : ingressConn.targetPort;
    if (!rawIngressPortId) continue;

    const normalizedPortId = normalizePortId(rawIngressPortId) || rawIngressPortId;
    const ingressPort = state.ports[normalizedPortId];
    if (!ingressPort) continue;

    // Skip trusted ports
    if (ingressPort.arpInspectionTrust) continue;

    const vlan = getPortVlan(ingressPort);
    const daiVlans = state.arpInspectionVlans || [];
    if (daiVlans.length > 0 && !daiVlans.includes(String(vlan))) continue;

    const result = evaluateDai(state, srcIp, srcMac, vlan, normalizedPortId);

    if (!result.permitted) {
      return {
        type: 'error',
        result: {
          success: false,
          hops: hopNames.slice(0, i + 1),
          hopIds: path.slice(0, i + 1),
          targetId: targetDevice.id,
          error: language === 'tr'
            ? `DAI: ${device.name} cihazında ${normalizedPortId} portunda ARP paketi engellendi. ${result.reason ?? ''}`
            : `DAI: ARP packet blocked on ${device.name} port ${normalizedPortId}. ${result.reason ?? ''}`,
        },
      };
    }
  }

  return { type: 'ok' };
}
