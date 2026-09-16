import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState, Port } from '@/lib/network/types';
import { IndexedConnection } from '@/lib/network/connectionIndex';
import { getPrimaryDeviceIp } from '@/lib/network/connectivity.utils';
import { portsFormTrunk } from '../vlanAndSwitching';
import { checkPortSecurityViolation } from '../security';
import { ConnectivityResult, PortSecurityViolation } from './types';
import { getPortVlan, isPortMemberOfVlan, isSwitchDeviceType, getDeviceVlan, getFallbackVlanFromPath } from './pathUtils';

export type L2ChecksDeps = {
  deviceStates?: Map<string, SwitchState>;
  sourceId: string;
  devices: CanvasDevice[];
  deviceMap: Map<string, CanvasDevice>;
  safeDeviceStates: Map<string, SwitchState>;
  adjacency: Map<string, IndexedConnection[]>;
  path: string[];
  hopNames: string[];
  pathConnections: Map<string, CanvasConnection>;
  resolvedTargetIp: string;
  targetDevice: CanvasDevice;
  routingRequired: boolean;
  language: 'tr' | 'en';
  portSecurityViolations: PortSecurityViolation[];
};

export type L2ChecksResult =
  | { type: 'error'; result: ConnectivityResult }
  | { type: 'ok'; routingRequired: boolean; l2ConnectivityPossible: boolean };

export function validateVlanAndL2(deps: L2ChecksDeps): L2ChecksResult {
  const { deviceStates, sourceId, devices, deviceMap, safeDeviceStates, adjacency, path, hopNames, pathConnections, resolvedTargetIp, targetDevice, routingRequired, language, portSecurityViolations } = deps;

  let r = routingRequired;

  // 3. Validate endpoint VLANs when PCs are involved (PC VLAN must match adjacent switch access VLAN).
  if (deviceStates && path.length >= 2) {
    for (let i = 0; i < path.length - 1; i++) {
      const aId = path[i];
      const bId = path[i + 1];
      const a = deviceMap.get(aId);
      const b = deviceMap.get(bId);
      const conn = pathConnections.get(`${aId}-${bId}`);
      if (!a || !b || !conn) continue;

      // If a PC connects to a switch, enforce VLAN match unless the switch port is trunk.
      const pc = a.type === 'pc' ? a : b.type === 'pc' ? b : null;
      const sw = isSwitchDeviceType(a.type) ? a : isSwitchDeviceType(b.type) ? b : null;
      if (pc && sw) {
        const swPortId = conn.sourceDeviceId === sw.id ? conn.sourcePort : conn.targetPort;
        // BOLT: Use pre-resolved safeDeviceStates
        const swState = safeDeviceStates.get(sw.id);
        const swPort = swState?.ports?.[swPortId];
        const swVlan = getPortVlan(swPort);
        const pcVlan = Number(pc.vlan || 1);

        // Allow ping if switch port forms a trunk (explicit or DTP-negotiated) OR if VLANs match
        const pcPortId = conn.sourceDeviceId === sw.id ? conn.targetPort : conn.sourcePort;
        const pcDevice = deviceMap.get(pc.id);
        const pcPort = pcDevice?.ports?.find(p => p.id === pcPortId);
        if (!portsFormTrunk(pcPort?.mode, swPort?.mode) && swVlan !== pcVlan) {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames.slice(0, i + 2),
              hopIds: path.slice(0, i + 2),
              targetId: targetDevice.id,
              error: `VLAN mismatch: ${pc.name} is in VLAN ${pcVlan}, but ${sw.name} port ${swPortId} is VLAN ${swVlan}.`,
            }
          };
        }

        // Check port security on switch port
        if (swPort?.portSecurity?.enabled && pc.macAddress) {
          // BOLT: Use pre-resolved safeDeviceStates
          const violation = checkPortSecurityViolation(sw.id, swPortId, pc.macAddress, safeDeviceStates);
          if (violation) {
            // Track violation for React state update
            portSecurityViolations.push({
              deviceId: sw.id,
              portId: swPortId,
              action: violation.action,
              mac: pc.macAddress
            });

            // Handle violation action
            if (violation.action === 'shutdown') {
              return {
                type: 'error',
                result: {
                  success: false,
                  hops: hopNames.slice(0, i + 2),
                  hopIds: path.slice(0, i + 2),
                  targetId: targetDevice.id,
                  error: `Port security violation: ${sw.name} port ${swPortId} has been shut down due to unauthorized MAC ${pc.macAddress}.`,
                  portSecurityViolations
                }
              };
            } else if (violation.action === 'restrict') {
              // Allow traffic but log violation
              return {
                type: 'error',
                result: {
                  success: false,
                  hops: hopNames.slice(0, i + 2),
                  hopIds: path.slice(0, i + 2),
                  targetId: targetDevice.id,
                  error: `Port security violation: ${sw.name} port ${swPortId} - unauthorized MAC ${pc.macAddress}. Traffic restricted.`,
                  portSecurityViolations
                }
              };
            } else if (violation.action === 'protect') {
              // Drop traffic silently (no error message, just drop)
              return {
                type: 'error',
                result: {
                  success: false,
                  hops: hopNames.slice(0, i + 2),
                  hopIds: path.slice(0, i + 2),
                  targetId: targetDevice.id,
                  error: `Request timed out.`,
                  portSecurityViolations
                }
              };
            }
          }
        }
      }
    }
  }

  // 3.5. A switch-to-switch trunk is operational only when both link endpoints are trunk.
  if (deviceStates && path.length >= 2) {
    for (let i = 0; i < path.length - 1; i++) {
      const aId = path[i];
      const bId = path[i + 1];
      const a = deviceMap.get(aId);
      const b = deviceMap.get(bId);
      const conn = pathConnections.get(`${aId}-${bId}`);
      if (!a || !b || !conn || !isSwitchDeviceType(a.type) || !isSwitchDeviceType(b.type)) continue;

      const aPortId = conn.sourceDeviceId === aId ? conn.sourcePort : conn.targetPort;
      const bPortId = conn.sourceDeviceId === bId ? conn.sourcePort : conn.targetPort;
      // BOLT: Use pre-resolved safeDeviceStates
      const aPort = safeDeviceStates.get(aId)?.ports?.[aPortId];
      const bPort = safeDeviceStates.get(bId)?.ports?.[bPortId];
      const aIsTrunk = aPort?.mode === 'trunk';
      const bIsTrunk = bPort?.mode === 'trunk';

      if (aIsTrunk !== bIsTrunk) {
        return {
          type: 'error',
          result: {
            success: false,
            hops: hopNames.slice(0, i + 2),
            hopIds: path.slice(0, i + 2),
            targetId: targetDevice.id,
            error: language === 'tr'
              ? `Trunk kurulamadı: ${a.name} ${aPortId} ve ${b.name} ${bPortId} portlarının ikisi de trunk modunda olmalı.`
              : `Trunk failed: both ${a.name} ${aPortId} and ${b.name} ${bPortId} must be in trunk mode.`
          }
        };
      }

      if (aIsTrunk && bIsTrunk) {
        const activeVlan = getFallbackVlanFromPath(sourceId, { adjacency, deviceMap, deviceStates });
        if (!isPortMemberOfVlan(aPort, activeVlan) || !isPortMemberOfVlan(bPort, activeVlan)) {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames.slice(0, i + 2),
              hopIds: path.slice(0, i + 2),
              targetId: targetDevice.id,
              error: language === 'tr'
                ? `Trunk VLAN filtresi: ${a.name} ${aPortId} ve ${b.name} ${bPortId} üzerinde VLAN ${activeVlan} izinli değil.`
                : `Trunk VLAN filter: VLAN ${activeVlan} is not allowed on ${a.name} ${aPortId} or ${b.name} ${bPortId}.`
            }
          };
        }
      }
    }
  }

  // 4. VLAN check across the path
  if (deviceStates) {
    for (let i = 1; i < path.length - 1; i++) {
      const deviceId = path[i];
      const device = deviceMap.get(deviceId);
      if (device && isSwitchDeviceType(device.type)) {
        // BOLT: Use pre-resolved safeDeviceStates
        const switchState = safeDeviceStates.get(deviceId);
        if (!switchState) continue;

        const prevDeviceId = path[i - 1];
        const nextDeviceId = path[i + 1];

        const ingressConn = pathConnections.get(`${prevDeviceId}-${deviceId}`);
        const egressConn = pathConnections.get(`${deviceId}-${nextDeviceId}`);

        if (ingressConn && egressConn) {
          const ingressPortId = ingressConn.sourceDeviceId === deviceId ? ingressConn.sourcePort : ingressConn.targetPort;
          const egressPortId = egressConn.sourceDeviceId === deviceId ? egressConn.sourcePort : egressConn.targetPort;

          const ingressPort = switchState.ports[ingressPortId];
          const egressPort = switchState.ports[egressPortId];

          // Default to VLAN 1 if not specified
          const ingressVlan = getPortVlan(ingressPort);
          const egressVlan = getPortVlan(egressPort);

          // Check for VLAN mismatch on access ports
          if (ingressVlan !== egressVlan) {
            // Allow if ports form a trunk (explicit or DTP-negotiated)
            if (!portsFormTrunk(ingressPort?.mode, egressPort?.mode)) {
              // Check if there's a router with ipRouting in the path (L3 routing scenario)
              let hasL3RouterInPath = false;
              for (const pathDeviceId of path) {
                const pathDevice = deviceMap.get(pathDeviceId);
                // BOLT: Use pre-resolved safeDeviceStates
                const pathState = safeDeviceStates.get(pathDeviceId);
                if ((pathDevice?.type === 'router' || pathDevice?.type === 'switchL3') && pathState?.ipRouting) {
                  hasL3RouterInPath = true;
                  break;
                }
              }

              // If router with routing is in path, allow different VLANs (router handles inter-VLAN routing)
              if (!hasL3RouterInPath) {
                return {
                  type: 'error',
                  result: {
                    success: false,
                    hops: hopNames.slice(0, i + 1),
                    hopIds: path.slice(0, i + 1),
                    targetId: targetDevice.id,
                    error: `VLAN mismatch on ${device.name}. Port ${ingressPortId} is in VLAN ${ingressVlan}, but port ${egressPortId} is in VLAN ${egressVlan}.`
                  }
                };
              }
            }
          }
        }
      }
    }
  }

  // 5. Enforce same-VLAN communication for L2-only simulation
  let l2ConnectivityPossible = false;
  if (deviceStates) {
    const getDeviceVlanForIp = (deviceId: string, ip: string): number | null => {
      const device = deviceMap.get(deviceId);
      if (!device) return null;
      // BOLT: Use pre-resolved safeDeviceStates
      const state = safeDeviceStates.get(deviceId);
      if (!state) return (device.type === 'pc' || device.type === 'iot') ? Number(device.vlan || 1) : 1;

      if (device.type === 'pc' || device.type === 'iot') return getDeviceVlan(device, state, { adjacency, deviceMap, deviceStates });

      // Check all VLAN SVIs first (vlan1, vlan10, vlan20, etc.)
      for (const [portId, port] of Object.entries(state.ports)) {
        if (portId.startsWith('vlan') && port.ipAddress === ip) {
          const vlanMatch = portId.match(/vlan(\d+)/);
          if (vlanMatch) {
            return parseInt(vlanMatch[1], 10);
          }
          return 1;
        }
      }

      // Check routed physical interfaces (L3)
      const onPhysical = Object.values(state.ports).some((p: Port) => p.ipAddress === ip && p.mode === 'routed');
      if (onPhysical) return null;

      return getDeviceVlan(device, state, { adjacency, deviceMap, deviceStates });
    };

    // BOLT: Use pre-resolved safeDeviceStates
    const sourceIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates);
    const sourceVlan = sourceIp ? getDeviceVlanForIp(sourceId, sourceIp) : null;
    const targetVlan = getDeviceVlanForIp(targetDevice.id, resolvedTargetIp);

    // Skip VLAN enforcement for L3 routing scenarios
    const isSourceL3 = sourceVlan === null;
    const isTargetL3 = targetVlan === null;

    // Only block if both are L2 devices AND in different VLANs
    if (!isSourceL3 && !isTargetL3 && sourceVlan !== null && targetVlan !== null) {
      // Same VLAN: allow communication
      if (sourceVlan === targetVlan) {
        l2ConnectivityPossible = true;
      } else {
        // Different VLANs: check if router with ipRouting is in path
        let hasL3RouterInPath = false;
        for (const pathDeviceId of path) {
          const pathDevice = deviceMap.get(pathDeviceId);
          // BOLT: Use pre-resolved safeDeviceStates
          const pathState = safeDeviceStates.get(pathDeviceId);
          if ((pathDevice?.type === 'router' || pathDevice?.type === 'switchL3') && pathState?.ipRouting) {
            hasL3RouterInPath = true;
            break;
          }
        }

        // If router with routing is in path, allow different VLANs (router handles inter-VLAN routing)
        if (hasL3RouterInPath) {
          r = true; // Different VLANs require routing
        } else {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames,
              hopIds: path,
              targetId: targetDevice.id,
              error: `VLAN mismatch: source VLAN ${sourceVlan}, target VLAN ${targetVlan}.`
            }
          };
        }
      }
    }
  }

  return { type: 'ok', routingRequired: r, l2ConnectivityPossible };
}

