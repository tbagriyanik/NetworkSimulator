import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { normalizePortId } from '@/lib/network/initialState';
import { evaluateAcl, evaluateIpv6Acl } from '../acl';
import { evaluateNatForHop } from '../natEvaluation';
import { ConnectivityResult, CheckOptions, CapturedPacket, TraversedPort, PortSecurityViolation } from './types';

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
  capturedPackets?: CapturedPacket[];
  traversedPorts?: TraversedPort[];
  portSecurityViolations?: PortSecurityViolation[];
};

export type ForwardingControlsResult =
  | { type: 'error'; result: ConnectivityResult }
  | { type: 'ok'; currentSourceIp: string; currentTargetIp: string };

function matchesIpOrSubnet(ruleIp: string | undefined, actualIp: string): boolean {
  if (!ruleIp || ruleIp === '*' || ruleIp === 'any') return true;
  if (ruleIp === actualIp) return true;
  if (ruleIp.includes('/')) {
    const [network, prefixStr] = ruleIp.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (!isNaN(prefix)) {
      const mask = prefix === 0 ? 0 : ~((1 << (32 - prefix)) - 1);
      const ipToNum = (ip: string) => ip.split('.').reduce((acc, oct) => ((acc << 8) + parseInt(oct, 10)) >>> 0, 0);
      try {
        return (ipToNum(actualIp) & mask) === (ipToNum(network) & mask);
      } catch {
        return false;
      }
    }
  }
  return false;
}

export function applyForwardingControls(deps: ForwardingControlsDeps): ForwardingControlsResult {
  const { path, deviceMap, safeDeviceStates, pathConnections, options, language, hopNames, targetDevice } = deps;
  const capturedPackets = deps.capturedPackets || [];
  const traversedPorts = deps.traversedPorts || [];
  const portSecurityViolations = deps.portSecurityViolations || [];

  let currentSourceIp = deps.currentSourceIp;
  let currentTargetIp = deps.currentTargetIp;

  // Helper to record dropped packet and trim downstream unreached connections
  const handleDrop = (
    hopIdx: number,
    dropConnId: string | undefined,
    errorMessage: string,
    dropReasonTag: string
  ): ForwardingControlsResult => {
    // Keep connections up to hopIdx
    const validConnIds = new Set<string>();
    for (let k = 0; k < hopIdx; k++) {
      const c = pathConnections.get(`${path[k]}-${path[k + 1]}`);
      if (c) validConnIds.add(c.id);
    }
    if (dropConnId) validConnIds.add(dropConnId);

    // Filter existing captured packets to remove downstream ones
    for (let pIdx = capturedPackets.length - 1; pIdx >= 0; pIdx--) {
      const p = capturedPackets[pIdx];
      if (!validConnIds.has(p.connectionId) && p.protocol !== 'ARP' && p.protocol !== 'ICMPv6') {
        capturedPackets.splice(pIdx, 1);
      }
    }

    // Set or append the dropped packet on the connection arriving at this device
    if (dropConnId) {
      const existing = capturedPackets.find(p => p.connectionId === dropConnId && p.sourceIp === currentSourceIp);
      const dropInfo = `[DROP] ${dropReasonTag}`;
      if (existing) {
        existing.info = dropInfo;
      } else {
        capturedPackets.push({
          connectionId: dropConnId,
          sourceIp: currentSourceIp,
          targetIp: currentTargetIp,
          protocol: options?.protocol?.toUpperCase() || 'ICMP',
          length: 74,
          info: dropInfo,
        });
      }
    }

    return {
      type: 'error',
      result: {
        success: false,
        hops: hopNames.slice(0, hopIdx + 1),
        hopIds: path.slice(0, hopIdx + 1),
        targetId: targetDevice.id,
        error: errorMessage,
        capturedPackets,
        traversedPorts,
        portSecurityViolations,
      },
    };
  };

  // 7. ACL, NAT & Firewall Logic - Check rules for any firewalls or ACLs in the path
  for (let i = 0; i < path.length; i++) {
    const stepDeviceId = path[i];
    const state = safeDeviceStates.get(stepDeviceId);
    const device = deviceMap.get(stepDeviceId);

    const prevDeviceId = i > 0 ? path[i - 1] : null;
    const nextDeviceId = i < path.length - 1 ? path[i + 1] : null;

    const ingressConn = prevDeviceId ? pathConnections.get(`${prevDeviceId}-${stepDeviceId}`) : null;
    const egressConn = nextDeviceId ? pathConnections.get(`${stepDeviceId}-${nextDeviceId}`) : null;
    const currentHopConnId = ingressConn?.id || egressConn?.id || pathConnections.get(`${path[0]}-${path[1]}`)?.id;

    if (state) {
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
          const errMsg = language === 'tr'
            ? `Paket ${device?.name} ingress port ${ingressPortId} ACL kuralı nedeniyle engellendi.`
            : `Packet blocked by inbound ACL on ${device?.name} interface ${ingressPortId}.`;
          return handleDrop(i, ingressConn?.id || currentHopConnId, errMsg, `Blocked by Inbound ACL (${ingressPort.accessGroupIn}) on ${device?.name || stepDeviceId}`);
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
          const errMsg = language === 'tr'
            ? `Paket ${device?.name} ingress port ${ingressPortId} IPv6 ACL kuralı nedeniyle engellendi.`
            : `Packet blocked by inbound IPv6 ACL on ${device?.name} interface ${ingressPortId}.`;
          return handleDrop(i, ingressConn?.id || currentHopConnId, errMsg, `Blocked by Inbound IPv6 ACL (${ingressPort.ipv6TrafficFilterIn}) on ${device?.name || stepDeviceId}`);
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
          return handleDrop(i, ingressConn?.id || currentHopConnId, natResult.error, `NAT Translation Failure on ${device?.name || stepDeviceId}`);
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
          const errMsg = language === 'tr'
            ? `Paket ${device?.name} egress port ${egressPortId} ACL kuralı nedeniyle engellendi.`
            : `Packet blocked by outbound ACL on ${device?.name} interface ${egressPortId}.`;
          return handleDrop(i, ingressConn?.id || currentHopConnId, errMsg, `Blocked by Outbound ACL (${egressPort.accessGroupOut}) on ${device?.name || stepDeviceId}`);
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
          const errMsg = language === 'tr'
            ? `Paket ${device?.name} egress port ${egressPortId} IPv6 ACL kuralı nedeniyle engellendi.`
            : `Packet blocked by outbound IPv6 ACL on ${device?.name} interface ${egressPortId}.`;
          return handleDrop(i, ingressConn?.id || currentHopConnId, errMsg, `Blocked by Outbound IPv6 ACL (${egressPort.ipv6TrafficFilterOut}) on ${device?.name || stepDeviceId}`);
        }
      }
    }

    // 7.3. Firewall Logic (device or state rules)
    const isFirewallDevice = device?.type === 'firewall' || state?.deviceType === 'firewall' || state?.switchLayer === 'FW';
    const rules = (device?.firewallRules || (state as unknown as { firewallRules?: Array<Record<string, unknown>> })?.firewallRules || []) as Array<{
      enabled?: boolean;
      action: string;
      sourceIp?: string;
      srcIp?: string;
      targetIp?: string;
      dstIp?: string;
      protocol?: string;
      port?: string | number;
      dstPort?: string | number;
      desc?: string;
    }>;

    if (isFirewallDevice && rules.length > 0) {
      const enabledRules = rules.filter(r => r.enabled !== false);
      let allowed = enabledRules.length === 0; // Default: ALLOW ALL if no rules
      let matchedRuleDesc: string | undefined;

      // Evaluate enabled rules in order
      for (const rule of enabledRules) {
        const ruleSrc = rule.sourceIp || rule.srcIp;
        const ruleDst = rule.targetIp || rule.dstIp;
        const sourceMatch = matchesIpOrSubnet(ruleSrc, currentSourceIp);
        const targetMatch = matchesIpOrSubnet(ruleDst, currentTargetIp);

        // Protocol matching
        const requestedProtocol = (options?.protocol || 'any').toLowerCase();
        const ruleProto = (rule.protocol || 'any').toLowerCase();
        const protocolMatch =
          requestedProtocol === 'any' ||
          ruleProto === 'any' ||
          ruleProto === 'ip' ||
          ruleProto === requestedProtocol;

        // Port matching
        const rulePort = rule.port !== undefined ? String(rule.port) : rule.dstPort !== undefined ? String(rule.dstPort) : '*';
        let portMatch = true;
        if (rulePort !== '*' && rulePort !== 'any') {
          if (options?.port && options.port !== '*') {
            portMatch = rulePort === String(options.port);
          } else if (requestedProtocol !== 'any') {
            if (requestedProtocol === 'tcp' || requestedProtocol === 'udp') {
              portMatch = false;
            }
          }
        }

        if (sourceMatch && targetMatch && protocolMatch && portMatch) {
          const act = rule.action.toLowerCase();
          allowed = act === 'allow' || act === 'permit' || act === 'pass';
          matchedRuleDesc = rule.desc || `Rule: ${rule.action.toUpperCase()} ${ruleProto} ${ruleSrc || 'any'} -> ${ruleDst || 'any'}`;
          break;
        }
      }

      if (!allowed) {
        const devName = device?.name || state?.hostname || 'Firewall';
        const errMsg = language === 'tr'
          ? `Paket firewall (${devName}) kuralı nedeniyle engellendi.`
          : `Packet blocked by firewall (${devName}) rule.`;
        const dropTag = `Blocked by Firewall (${devName})${matchedRuleDesc ? `: ${matchedRuleDesc}` : ''}`;
        return handleDrop(i, ingressConn?.id || currentHopConnId, errMsg, dropTag);
      }
    }
  }

  return { type: 'ok', currentSourceIp, currentTargetIp };
}