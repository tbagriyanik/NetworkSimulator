import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { normalizePortId } from '@/lib/network/initialState';
import type { ConnectivityResult, CheckOptions } from './types';
import { isSwitchDeviceType } from './pathUtils';
import { isPvlanAllowed } from '@/lib/network/pvlan';

export type PvlanCheckDeps = {
  deviceStates?: Map<string, SwitchState>;
  path: string[];
  deviceMap: Map<string, CanvasDevice>;
  safeDeviceStates: Map<string, SwitchState>;
  pathConnections: Map<string, CanvasConnection>;
  options?: CheckOptions;
  language: 'tr' | 'en';
  hopNames: string[];
  targetDevice: CanvasDevice;
};

export type PvlanCheckResult = { type: 'error'; result: ConnectivityResult } | { type: 'ok' };

/**
 * Enforces Private VLAN isolation rules along the packet path.
 * Checks each switch hop for PVLAN domain configuration and applies
 * isolated/community/promiscuous communication rules.
 */
export function enforcePvlan(deps: PvlanCheckDeps): PvlanCheckResult {
  const {
    path, deviceMap, safeDeviceStates,
    pathConnections, language, hopNames, targetDevice,
  } = deps;

  for (let i = 0; i < path.length - 1; i++) {
    const deviceId = path[i];
    const state = safeDeviceStates.get(deviceId);
    const device = deviceMap.get(deviceId);

    if (!state || !device || !isSwitchDeviceType(device.type)) continue;
    if (!state.pvlanDomain?.primaryVlan) continue;

    const nextDeviceId = path[i + 1];

    // Find the connection between current and next hop
    const conn =
      pathConnections.get(`${deviceId}-${nextDeviceId}`) ||
      pathConnections.get(`${nextDeviceId}-${deviceId}`);
    if (!conn) continue;

    // Get the two ports involved on this switch
    const portOnThis = conn.sourceDeviceId === deviceId ? conn.sourcePort : conn.targetPort;
    const prevDeviceId = i > 0 ? path[i - 1] : null;
    let ingressPortId: string | null = null;

    if (prevDeviceId) {
      const ingressConn =
        pathConnections.get(`${prevDeviceId}-${deviceId}`) ||
        pathConnections.get(`${deviceId}-${prevDeviceId}`);
      if (ingressConn) {
        ingressPortId = ingressConn.sourceDeviceId === deviceId
          ? ingressConn.sourcePort
          : ingressConn.targetPort;
      }
    }

    if (!ingressPortId || !portOnThis) continue;

    const srcNorm = normalizePortId(ingressPortId) || ingressPortId;
    const dstNorm = normalizePortId(portOnThis) || portOnThis;

    const pvlanResult = isPvlanAllowed(srcNorm, dstNorm, state);

    if (!pvlanResult.allowed) {
      return {
        type: 'error',
        result: {
          success: false,
          hops: hopNames.slice(0, i + 1),
          hopIds: path.slice(0, i + 1),
          targetId: targetDevice.id,
          error: language === 'tr'
            ? `PVLAN: ${device.name} cihazında özel VLAN izolasyonu trafiği engelledi. ${pvlanResult.reason ?? ''}`
            : `PVLAN: Private VLAN isolation blocked traffic on ${device.name}. ${pvlanResult.reason ?? ''}`,
        },
      };
    }
  }

  return { type: 'ok' };
}


