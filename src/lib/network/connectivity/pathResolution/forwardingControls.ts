import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { normalizePortId } from '@/lib/network/initialState';
import { evaluateAcl, evaluateIpv6Acl } from '../acl';
import { evaluateNatForHop } from '../natEvaluation';
import { ConnectivityResult, CheckOptions } from './types';

export type ForwardingControlsDeps = {
  path: string[];
  deviceMap: Map<string, CanvasDevice>;
  safeDeviceStates: Map<string, SwitchState>;
  pathConnections: Map<string, CanvasConnection>;
  options?: CheckOptions;
  language: 'tr' | 'en';
  hopNames: string[];
  targetDevice: CanvasDevice;
  currentSourceIp: string;
  currentTargetIp: string;
};

export type ForwardingControlsResult =
  | { type: 'error'; result: ConnectivityResult }
  | { type: 'ok'; currentSourceIp: string; currentTargetIp: string };

export function applyForwardingControls(deps: ForwardingControlsDeps): ForwardingControlsResult {
  const { path, deviceMap, safeDeviceStates, pathConnections, options, language, hopNames, targetDevice } = deps;

  let currentSourceIp = deps.currentSourceIp;
  let currentTargetIp = deps.currentTargetIp;

  // 7. ACL, NAT & Firewall Logic - Check rules for any firewalls or ACLs in the path
  // BOLT: Use pre-resolved safeDeviceStates
  for (let i = 0; i < path.length; i++) {
    const stepDeviceId = path[i];
    const state = safeDeviceStates.get(stepDeviceId);
    const device = deviceMap.get(stepDeviceId);

    if (state) {
      const prevDeviceId = i > 0 ? path[i - 1] : null;
      const nextDeviceId = i < path.length - 1 ? path[i + 1] : null;

      const ingressConn = prevDeviceId ? pathConnections.get(`${prevDeviceId}-${stepDeviceId}`) : null;
      const egressConn = nextDeviceId ? pathConnections.get(`${stepDeviceId}-${nextDeviceId}`) : null;

      const rawIngressPortId = ingressConn ? (ingressConn.sourceDeviceId === stepDeviceId ? ingressConn.sourcePort : ingressConn.targetPort) : null;
      const rawEgressPortId = egressConn ? (egressConn.sourceDeviceId === stepDeviceId ? egressConn.sourcePort : egressConn.targetPort) : null;

      const ingressPortId = rawIngressPortId ? (normalizePortId(rawIngressPortId) || rawIngressPortId) : null;
      const egressPortId = rawEgressPortId ? (normalizePortId(rawEgressPortId) || rawEgressPortId) : null;

      const ingressPort = ingressPortId ? state.ports[ingressPortId] : null;
      const egressPort = egressPortId ? state.ports[egressPortId] : null;

      // 7.1. Check Inbound ACLs
      if (ingressPort?.accessGroupIn) {
        const aclResult = evaluateAcl(
          ingressPort.accessGroupIn,
          state,
          currentSourceIp,
          currentTargetIp,
          options?.protocol,
          options?.port
        );
        if (aclResult === 'deny') {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames.slice(0, i + 1),
              hopIds: path.slice(0, i + 1),
              targetId: targetDevice.id,
              error: language === 'tr'
                ? `Paket ${device?.name} ingress port ${ingressPortId} ACL kuralı nedeniyle engellendi.`
                : `Packet blocked by inbound ACL on ${device?.name} interface ${ingressPortId}.`
            }
          };
        }
      }

      if (ingressPort?.ipv6TrafficFilterIn && currentSourceIp.includes(':')) {
        const aclResult = evaluateIpv6Acl(
          ingressPort.ipv6TrafficFilterIn,
          state,
          currentSourceIp,
          currentTargetIp,
          options?.protocol || 'ipv6'
        );
        if (aclResult === 'deny') {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames.slice(0, i + 1),
              hopIds: path.slice(0, i + 1),
              targetId: targetDevice.id,
              error: language === 'tr'
                ? `Paket ${device?.name} ingress port ${ingressPortId} IPv6 ACL kuralı nedeniyle engellendi.`
                : `Packet blocked by inbound IPv6 ACL on ${device?.name} interface ${ingressPortId}.`
            }
          };
        }
      }

      // 7.1.5 NAT Logic (Inside -> Outside or Outside -> Inside)
      if (ingressPortId && egressPortId) {
        const natResult = evaluateNatForHop(
          stepDeviceId,
          state,
          ingressPortId,
          egressPortId,
          currentSourceIp,
          currentTargetIp,
          options,
          language
        );
        if (natResult.error) {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames.slice(0, i + 1),
              hopIds: path.slice(0, i + 1),
              targetId: targetDevice.id,
              error: natResult.error,
            }
          };
        }
        if (natResult.newSourceIp) currentSourceIp = natResult.newSourceIp;
        if (natResult.newTargetIp) currentTargetIp = natResult.newTargetIp;
      }

      // 7.2. Check Outbound ACLs
      if (egressPort?.accessGroupOut) {
        const aclResult = evaluateAcl(
          egressPort.accessGroupOut,
          state,
          currentSourceIp,
          currentTargetIp,
          options?.protocol,
          options?.port
        );
        if (aclResult === 'deny') {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames.slice(0, i + 1),
              hopIds: path.slice(0, i + 1),
              targetId: targetDevice.id,
              error: language === 'tr'
                ? `Paket ${device?.name} egress port ${egressPortId} ACL kuralı nedeniyle engellendi.`
                : `Packet blocked by outbound ACL on ${device?.name} interface ${egressPortId}.`
            }
          };
        }
      }

      if (egressPort?.ipv6TrafficFilterOut && currentSourceIp.includes(':')) {
        const aclResult = evaluateIpv6Acl(
          egressPort.ipv6TrafficFilterOut,
          state,
          currentSourceIp,
          currentTargetIp,
          options?.protocol || 'ipv6'
        );
        if (aclResult === 'deny') {
          return {
            type: 'error',
            result: {
              success: false,
              hops: hopNames.slice(0, i + 1),
              hopIds: path.slice(0, i + 1),
              targetId: targetDevice.id,
              error: language === 'tr'
                ? `Paket ${device?.name} egress port ${egressPortId} IPv6 ACL kuralı nedeniyle engellendi.`
                : `Packet blocked by outbound IPv6 ACL on ${device?.name} interface ${egressPortId}.`
            }
          };
        }
      }
    }

    // 7.3. Legacy Firewall Logic
    if (device?.type === 'firewall') {
      const rules = device.firewallRules || [];
      const enabledRules = rules.filter(r => r.enabled);
      let allowed = enabledRules.length === 0; // Default: ALLOW ALL if no enabled rules

      // Evaluate enabled rules in order
      for (const rule of enabledRules) {
        const sourceMatch = rule.sourceIp === '*' || rule.sourceIp === 'any' || rule.sourceIp === currentSourceIp;
        const targetMatch = rule.targetIp === '*' || rule.targetIp === 'any' || rule.targetIp === currentTargetIp;

        // Protocol matching
        const requestedProtocol = options?.protocol || 'any';
        const protocolMatch = requestedProtocol === 'any' || rule.protocol === 'any' || rule.protocol === requestedProtocol;

        // Port matching
        let portMatch = true;
        if (rule.port !== '*' && rule.port !== 'any') {
          if (options?.port && options.port !== '*') {
            portMatch = rule.port === options.port;
          }
          else if (requestedProtocol !== 'any') {
            if (requestedProtocol === 'tcp' || requestedProtocol === 'udp') {
              portMatch = false;
            }
          }
        }

        if (sourceMatch && targetMatch && protocolMatch && portMatch) {
          allowed = rule.action === 'allow';
          break;
        }
      }

      if (!allowed) {
        return {
          type: 'error',
          result: {
            success: false,
            hops: hopNames.slice(0, i + 1),
            hopIds: path.slice(0, i + 1),
            targetId: targetDevice.id,
            error: language === 'tr'
              ? `Paket firewall (${device.name}) kuralı nedeniyle engellendi.`
              : `Packet blocked by firewall (${device.name}) rule.`
          }
        };
      }
    }
  }

  return { type: 'ok', currentSourceIp, currentTargetIp };
}