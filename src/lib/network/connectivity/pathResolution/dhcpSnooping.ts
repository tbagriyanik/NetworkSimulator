import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { normalizePortId } from '@/lib/network/initialState';
import { ConnectivityResult, CheckOptions } from './types';
import { isSwitchDeviceType, getPortVlan } from './pathUtils';

export type DhcpSnoopingDeps = {
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

export type DhcpSnoopingResult = { type: 'error'; result: ConnectivityResult } | { type: 'ok' };

export function enforceDhcpSnooping(deps: DhcpSnoopingDeps): DhcpSnoopingResult {
  const { deviceStates, path, deviceMap, safeDeviceStates, pathConnections, options, language, hopNames, targetDevice } = deps;

  // 6.5 DHCP Snooping Enforcement
  // Rogue DHCP server protection: DHCP OFFER/ACK blocked on untrusted ports
  if (deviceStates) {
    for (let i = 0; i < path.length; i++) {
      const deviceId = path[i];
      const state = safeDeviceStates.get(deviceId);
      const device = deviceMap.get(deviceId);

      if (state && device && isSwitchDeviceType(device.type)) {
        if (!state.dhcpSnoopingEnabled) continue;

        const prevDeviceId = i > 0 ? path[i - 1] : null;
        if (!prevDeviceId) continue;

        const ingressConn = pathConnections.get(`${prevDeviceId}-${deviceId}`);
        if (!ingressConn) continue;

        const rawIngressPortId = ingressConn.sourceDeviceId === deviceId ? ingressConn.sourcePort : ingressConn.targetPort;
        if (!rawIngressPortId) continue;

        const normalizedId = normalizePortId(rawIngressPortId) || rawIngressPortId;
        const ingressPort = state.ports[normalizedId];
        if (!ingressPort) continue;

        // Check if this VLAN is being snooped
        const portVlan = getPortVlan(ingressPort);
        const snoopingVlans = state.dhcpSnoopingVlans || [];
        if (snoopingVlans.length > 0 && !snoopingVlans.includes(String(portVlan))) continue;

        if (!ingressPort.dhcpSnoopingTrust) {
          // Untrusted port â€” block DHCP OFFER/ACK from any source
          // Allow DHCP DISCOVER/REQUEST from clients to pass through to trusted servers
          const isDhcpServerResponse = options?.dhcpMessage === 'offer' || options?.dhcpMessage === 'ack';

          if (isDhcpServerResponse) {
            // Check if the previous-hop device is a DHCP server for more specific error message
            const hopSourceState = safeDeviceStates.get(prevDeviceId);
            const isDhcpServer = hopSourceState ? (
              (hopSourceState.dhcpPools && Object.keys(hopSourceState.dhcpPools).length > 0) ||
              (hopSourceState.services?.dhcp?.pools && hopSourceState.services.dhcp.pools.length > 0)
            ) : false;

            if (isDhcpServer) {
              return {
                type: 'error',
                result: {
                  success: false,
                  hops: hopNames.slice(0, i + 1),
                  hopIds: path.slice(0, i + 1),
                  targetId: targetDevice.id,
                  error: language === 'tr'
                    ? `DHCP snooping: Yetkisiz DHCP sunucusu ${device.name} port ${normalizedId} Ã¼zerinden engellendi.`
                    : `DHCP snooping: Rogue DHCP server blocked on ${device.name} port ${normalizedId}.`
                }
              };
            } else {
              return {
                type: 'error',
                result: {
                  success: false,
                  hops: hopNames.slice(0, i + 1),
                  hopIds: path.slice(0, i + 1),
                  targetId: targetDevice.id,
                  error: language === 'tr'
                    ? `DHCP snooping: DHCP OFFER/ACK paketi yetkisiz port ${normalizedId} Ã¼zerinden engellendi.`
                    : `DHCP snooping: DHCP OFFER/ACK packet blocked on untrusted port ${normalizedId}.`
                }
              };
            }
          }
        }
      }
    }
  }

  return { type: 'ok' };
}

