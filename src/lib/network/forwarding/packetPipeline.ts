import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState, Port } from '@/lib/network/types';
import type { NetworkPacketFrame } from './packetFrame';
import { checkIngressSanity, processControlPlaneProtocols } from './commonForwardingEngine';
import { buildNetflowExportFrame, captureNetFlow } from './netflowEngine';
import { buildSflowExportFrame, captureSflow } from './sflowEngine';
import { evaluateAcl } from '@/lib/network/connectivity/acl';
import { learnMacAddress } from '@/lib/network/macLearning';
import { dispatchCapturedPackets } from '@/utils/packetCapture';
import { buildConnectionIndex } from '@/lib/network/connectionIndex';
import { generateIcmpUnreachable } from './icmpUtils';
import { DropReasonCode, formatDropReason } from './dropReasons';
import { processNatPacket } from './natEngine';
import { evaluateWredDrop, scheduleQosPackets, shapePacketQueue, type QosClass } from '@/lib/network/qosScheduler';
import { evaluateZbf } from './zbfEngine';
import { evaluateIpv6FirstHopSecurity } from './ipv6FirstHopSecurity';
import { getSpanMirrorDestinations, getRspanDestinationSessions } from '@/lib/network/portMirroring';
import {
  PipelineStage,
  PipelineAction,
  PacketTrace,
  HopResult,
  PipelineResult,
  PacketHopTrace,
  PacketSimulationResult,
  makeTrace,
  checkVlan,
  updatePortStats
} from './packetPipelineTypes';
import { resolveEgress } from './packetPipelineResolution';

export type {
  PipelineStage,
  PipelineAction,
  PacketTrace,
  HopResult,
  PipelineResult,
  PacketHopTrace,
  PacketSimulationResult,
};

/**
 * Run the full pipeline for a single hop (one device).
 */
export function runHopPipeline(
  hopIndex: number,
  frame: NetworkPacketFrame,
  device: CanvasDevice,
  state: SwitchState | undefined,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  now: number = Date.now()
): HopResult {
  const traces: PacketTrace[] = [];
  const ingressPortId = frame.ingressPortId || '';
  const ingressPort: Port | undefined = state?.ports?.[ingressPortId];
  const deviceMap = new Map<string, CanvasDevice>(devices.map(d => [d.id, d]));

  // Count ingress packet
  if (ingressPort) updatePortStats(ingressPort, 'rx', frame.length || 64);

  const drop = (stage: PipelineStage, reason: string, icmpCode?: number, isUnreachable = true): HopResult => {
    if (ingressPort) updatePortStats(ingressPort, 'drop');
    traces.push(makeTrace(hopIndex, device, ingressPortId, stage, 'drop', reason, frame));

    let responseFrame: NetworkPacketFrame | undefined;
    if (frame.srcIp && frame.protocol !== 'ICMP') {
      const type = isUnreachable ? 'destination-unreachable' : 'time-exceeded';
      const reportingIp = ingressPort?.ipAddress || state?.ports?.['Fa0/0']?.ipAddress || state?.ports?.['Gi0/0']?.ipAddress;
      responseFrame = generateIcmpUnreachable(frame, type, reason, icmpCode ?? 0, reportingIp);
    }

    return {
      deviceId: device.id,
      accepted: false,
      trapToControlPlane: false,
      egressPorts: [],
      responseFrame,
      traces
    };
  };

  // -- Stage 1: L1 Physical / Ingress Sanity -----------------------------
  const l1 = checkIngressSanity(frame, device, state, ingressPort);
  if (!l1.allowed) return drop('ingress-l1', formatDropReason(DropReasonCode.L1_PORT_SHUTDOWN, l1.reason));
  traces.push(makeTrace(hopIndex, device, ingressPortId, 'ingress-l1', 'pass', l1.reason, frame));

  // -- Stage 2: Port Security ---------------------------------------------
  if (ingressPort?.portSecurity?.enabled && ingressPort.portSecurity.macAddress) {
    if (ingressPort.portSecurity.macAddress !== frame.srcMac) {
      return drop('port-security', formatDropReason(DropReasonCode.L2_PORT_SECURITY_VIOLATION, `unexpected MAC ${frame.srcMac}`));
    }
  }
  traces.push(makeTrace(hopIndex, device, ingressPortId, 'port-security', 'pass', 'Port security OK', frame));

  // -- Stage 3: DHCP Snooping ---------------------------------------------
  if (state?.dhcpSnoopingEnabled && !ingressPort?.dhcpSnoopingTrust) {
    const isDhcpServer = frame.protocol === 'DHCP' && frame.dhcpPayload &&
      (frame.dhcpPayload.messageType === 'offer' || frame.dhcpPayload.messageType === 'ack');
    if (isDhcpServer) {
      return drop('dhcp-snooping', formatDropReason(DropReasonCode.DHCP_SNOOPING_UNTRUSTED_SERVER, `on port ${ingressPortId}`));
    }
  }
  traces.push(makeTrace(hopIndex, device, ingressPortId, 'dhcp-snooping', 'pass', 'DHCP snooping OK', frame));

  // -- Stage 3b: IPv6 First-Hop Security (RA Guard & DHCPv6 Guard) --------
  const fhsResult = evaluateIpv6FirstHopSecurity(ingressPort, frame);
  if (fhsResult.isViolation) {
    return drop('ipv6-fhs', fhsResult.dropReason || 'IPv6 First-Hop Security Violation');
  }
  traces.push(makeTrace(hopIndex, device, ingressPortId, 'ipv6-fhs', 'pass', 'IPv6 First-Hop Security OK', frame));

  // -- Stage 4: STP Port State --------------------------------------------
  if (frame.protocol !== 'STP') {
    const stpState = ingressPort?.spanningTree?.state;
    if (stpState === 'blocking' || stpState === 'listening') {
      return drop('stp-state', formatDropReason(DropReasonCode.L2_STP_BLOCKED, `port ${ingressPortId} in ${stpState} state`));
    }
  }
  traces.push(makeTrace(hopIndex, device, ingressPortId, 'stp-state', 'pass', 'STP port forwarding/disabled for STP frames', frame));

  // -- Stage 5: VLAN Check ------------------------------------------------
  if (ingressPort && (device.type === 'switchL2' || device.type === 'switchL3')) {
    const vlanCheck = checkVlan(ingressPort, frame);
    if (!vlanCheck.allowed) return drop('vlan-check', formatDropReason(DropReasonCode.L2_VLAN_MISMATCH, vlanCheck.reason));
    traces.push(makeTrace(hopIndex, device, ingressPortId, 'vlan-check', 'pass', vlanCheck.reason, frame));
  } else {
    traces.push(makeTrace(hopIndex, device, ingressPortId, 'vlan-check', 'skip', 'Not a switch — VLAN check skipped', frame));
  }

  // -- Stage 6: ACL Ingress ----------------------------------------------
  if (ingressPort?.accessGroupIn && state && frame.srcIp && frame.dstIp) {
    const aclResult = evaluateAcl(
      ingressPort.accessGroupIn, state,
      frame.srcIp, frame.dstIp,
      frame.ipProtocol === 6 ? 'tcp' : frame.ipProtocol === 17 ? 'udp' : 'icmp'
    );
    if (aclResult === 'deny') {
      return drop('acl-ingress', formatDropReason(DropReasonCode.ACL_DENY_INGRESS, `ACL ${ingressPort.accessGroupIn} denied ${frame.srcIp}→${frame.dstIp}`), 13);
    }
    traces.push(makeTrace(hopIndex, device, ingressPortId, 'acl-ingress', 'pass',
      `ACL ${ingressPort.accessGroupIn} (in) ${aclResult === 'none' ? 'implicit permit' : 'permit'}`, frame));
  } else {
    traces.push(makeTrace(hopIndex, device, ingressPortId, 'acl-ingress', 'skip', 'No ingress ACL configured', frame));
  }

  // -- Stage 7: Control Plane Trap --------------------------------------
  const cpResult = processControlPlaneProtocols(frame, device, state, now);
  if (cpResult.handled) {
    if (cpResult.rejected) {
      return drop('control-plane', `IPSec packet rejected by control plane`, 15);
    }
    traces.push(makeTrace(hopIndex, device, ingressPortId, 'control-plane', 'trap',
      'Handled by control plane protocol engine', frame));
    return {
      deviceId: device.id,
      accepted: true,
      trapToControlPlane: true,
      egressPorts: [],
      responseFrame: cpResult.responseFrame,
      traces
    };
  }
  traces.push(makeTrace(hopIndex, device, ingressPortId, 'control-plane', 'pass', 'Not a control plane frame — continue to data plane', frame));

  // -- Stage 8: MAC Learning (switches only) ----------------------------
  if (state && (device.type === 'switchL2' || device.type === 'switchL3') && ingressPortId) {
    const stateMap = new Map<string, SwitchState>([[device.id, state]]);
    learnMacAddress(device.id, frame.srcMac, ingressPortId, frame.vlanId || 1, stateMap);
  }

  // -- Stage 9: MAC Lookup / Route Lookup ------------------------------
  const { egressPorts, nextDeviceId, routeDecision } = resolveEgress(frame, device, state!, connections, deviceMap);

  if (egressPorts.length === 0) {
    if (routeDecision?.includes('delivered to destination host')) {
      traces.push(makeTrace(hopIndex, device, ingressPortId, 'egress', 'pass', routeDecision, frame));
      return {
        deviceId: device.id,
        accepted: true,
        trapToControlPlane: false,
        egressPorts: [],
        traces
      };
    }
    const isRouter = (device.type === 'router' || device.type === 'firewall');
    const code = isRouter ? DropReasonCode.L3_NO_ROUTE : DropReasonCode.L2_UNKNOWN_MAC_NO_EGRESS;
    return drop(isRouter ? 'route-lookup' : 'mac-lookup', routeDecision || formatDropReason(code, `No path for dst ${frame.dstIp || frame.dstMac}`), 0);
  }

  const forwardStage: PipelineStage = (device.type === 'router' || device.type === 'firewall') ? 'route-lookup' : 'mac-lookup';
  const forwardAction: PipelineAction = egressPorts.length > 1 ? 'flood' : 'forward';
  const reasonText = routeDecision || `${forwardAction === 'flood' ? 'Flooding' : 'Forwarding'} to ${egressPorts.join(', ')}`;
  traces.push(makeTrace(hopIndex, device, ingressPortId, forwardStage, forwardAction, reasonText, frame));

  // -- Stage 9b: NAT / PAT Translation --------------------------------
  if ((device.type === 'router' || device.type === 'firewall') && state && egressPorts[0] && frame.srcIp && frame.dstIp) {
    const natRes = processNatPacket(
      state,
      ingressPortId,
      egressPorts[0],
      frame.srcIp,
      frame.dstIp,
      undefined,
      undefined,
      frame.protocol,
      now
    );

    if (natRes.translated) {
      if (natRes.newSourceIp) frame.srcIp = natRes.newSourceIp;
      if (natRes.newTargetIp) frame.dstIp = natRes.newTargetIp;
      traces.push(makeTrace(
        hopIndex,
        device,
        egressPorts[0],
        'nat-translation',
        'pass',
        natRes.logMessage || `NAT translation applied: ${frame.srcIp} -> ${frame.dstIp}`,
        frame
      ));
    } else {
      traces.push(makeTrace(
        hopIndex,
        device,
        ingressPortId,
        'nat-translation',
        'skip',
        'No NAT translation required for this flow',
        frame
      ));
    }
  }

  // -- Stage 9c: Zone-Based Firewall (ZBFW) -----------------------------
  if (state && egressPorts[0] && frame.srcIp && frame.dstIp) {
    const egressPort: Port | undefined = state.ports?.[egressPorts[0]];
    const zbfResult = evaluateZbf(state, ingressPort, egressPort, frame.srcIp, frame.dstIp, frame.protocol, undefined, undefined, now);
    if (!zbfResult.permitted) {
      return drop('zbf', zbfResult.reason);
    }
    traces.push(makeTrace(
      hopIndex,
      device,
      egressPorts[0],
      'zbf',
      zbfResult.action === 'skip' ? 'skip' : 'pass',
      zbfResult.reason,
      frame
    ));
  }

  // -- Stage 10: ACL Egress ---------------------------------------------
  for (const egressPortId of egressPorts) {
    const egressPort: Port | undefined = state?.ports?.[egressPortId];
    if (egressPort?.accessGroupOut && state && frame.srcIp && frame.dstIp) {
      const aclResult = evaluateAcl(
        egressPort.accessGroupOut, state,
        frame.srcIp, frame.dstIp,
        frame.ipProtocol === 6 ? 'tcp' : frame.ipProtocol === 17 ? 'udp' : 'icmp'
      );
      if (aclResult === 'deny') {
        updatePortStats(egressPort, 'txdrop');
        return drop('acl-egress', formatDropReason(DropReasonCode.ACL_DENY_EGRESS, `ACL ${egressPort.accessGroupOut} denied ${frame.srcIp}→${frame.dstIp}`), 13);
      }
      traces.push(makeTrace(hopIndex, device, egressPortId, 'acl-egress', 'pass',
        `ACL ${egressPort.accessGroupOut} (out) permit`, frame));
    }
  }

  // -- Stage 10b: QoS Queue & Policing Check ----------------------------
  for (const egressPortId of egressPorts) {
    const egressPort: Port | undefined = state?.ports?.[egressPortId];
    if (egressPort?.qos) {
      const policyName = egressPort.qos.policyMap || state?.qosServicePolicies && Object.values(state.qosServicePolicies)
        .find(service => service.direction === 'output' && service.policy === egressPort.qos?.policyMap)?.policy;
      const policy = policyName ? state?.qosPolicyMaps?.[policyName] : undefined;
      if (policy) {
        const classes: QosClass[] = Object.entries(policy.classes).map(([name, config]) => ({
          name,
          priority: config.priority,
          bandwidthPercent: config.bandwidthPercent,
          ...(config.policeRate ? { policeConfig: { cirBps: config.policeRate, burstBytes: Math.max(frame.length * 2, 1500), conformAction: 'transmit' as const, exceedAction: 'drop' as const } } : {})
        }));
        const className = classes.find(cls => {
          const criteria = state?.qosClassMaps?.[cls.name]?.criteria || [];
          return criteria.some(criteriaItem => criteriaItem.toLowerCase().includes(frame.protocol.toLowerCase()) || criteriaItem.toLowerCase() === 'match-any');
        })?.name || classes[0]?.name;
        const qosResult = scheduleQosPackets('cbwfq', [{ id: frame.id, className, bytes: frame.length, cos: frame.priority }], Math.max(frame.length, 1500), classes);
        if (qosResult.dropped.length > 0) {
          updatePortStats(egressPort, 'txdrop');
          return drop('qos', `MQC policy ${policyName} dropped packet in class ${className || 'default'}`);
        }
        const selectedConfig = className ? policy.classes[className] : undefined;
        if (selectedConfig?.setDscp !== undefined) {
          const dscpValue = Number(String(selectedConfig.setDscp).replace(/^af|^cs/i, ''));
          if (Number.isFinite(dscpValue)) frame.dscp = dscpValue;
        }
        if (selectedConfig?.setCos !== undefined) frame.cos = selectedConfig.setCos;
        traces.push(makeTrace(hopIndex, device, egressPortId, 'qos', 'pass', `MQC policy ${policyName} class ${className || 'default'} admitted packet`, frame));
      }
      if (egressPort.qos.shaping?.enabled) {
        const rate = egressPort.qos.shaping.rate || 0;
        if (rate <= 0) {
          updatePortStats(egressPort, 'txdrop');
          return drop('qos', 'QoS shaping rate is zero; packet held/dropped');
        }
        const shaped = shapePacketQueue([{ id: frame.id, bytes: frame.length }], { type: 'average', rateBps: rate });
        frame.qosDelayMs = shaped.totalDelayMs;
        traces.push(makeTrace(hopIndex, device, egressPortId, 'qos', 'pass', `Traffic shaped at ${rate}bps; delay ${shaped.totalDelayMs}ms`, frame));
      }
      const qDepth = (egressPort.stats?.txPackets || 0) % 50; // simulated buffer occupancy
      const wredRes = evaluateWredDrop(qDepth, {
        dscpOrPrec: egressPort.qosCos || 0,
        minThreshold: 35,
        maxThreshold: 48,
        maxDropProbability: 0.1,
      });

      if (wredRes.shouldDrop) {
        updatePortStats(egressPort, 'txdrop');
        const code = wredRes.dropType === 'tail-drop' ? DropReasonCode.QOS_TAIL_DROP : DropReasonCode.QOS_WRED_DROP;
        return drop('qos', formatDropReason(code, wredRes.reason));
      }
      traces.push(makeTrace(hopIndex, device, egressPortId, 'qos', 'pass', wredRes.reason, frame));
    } else {
      traces.push(makeTrace(hopIndex, device, egressPortId, 'qos', 'skip', 'Best-effort queue (No QoS policy active)', frame));
    }
  }

  // -- Stage 10c: NetFlow Accounting -------------------------------------
  const telemetryFrames: NetworkPacketFrame[] = [];
  if (state) {
    captureNetFlow(state, frame, ingressPortId, egressPorts, now);
    const sflow = captureSflow(state, frame, ingressPortId, egressPorts, now);
    if (sflow) {
      const exportFrame = buildSflowExportFrame(state, sflow);
      if (exportFrame) telemetryFrames.push(exportFrame);
    }
    if (state.netflowConfig?.exportDestination) {
      telemetryFrames.push(buildNetflowExportFrame(state, `${state.netflowConfig.exportDestination}:${state.netflowConfig.exportPort || 2055}`, state.netflowConfig.version || 5, now));
    }
    traces.push(makeTrace(hopIndex, device, ingressPortId, 'netflow', 'pass',
      `NetFlow accounting: ${frame.srcIp || ''}→${frame.dstIp || ''} (${egressPorts.length} egress)`, frame));
    if (sflow) traces.push(makeTrace(hopIndex, device, ingressPortId, 'netflow', 'pass', `sFlow sample #${sflow.sequence} exported`, frame));
  }

  // -- Stage 10d: SPAN / RSPAN Port Mirroring ------------------------------
  if (state && ingressPortId) {
    const spanDests = getSpanMirrorDestinations(state, ingressPortId);
    for (const dest of spanDests) {
      if (dest.destinationInterface) {
        if (!egressPorts.includes(dest.destinationInterface)) {
          egressPorts.push(dest.destinationInterface);
        }
        traces.push(makeTrace(hopIndex, device, dest.destinationInterface, 'span-mirror', 'forward',
          `SPAN: Mirroring ingress traffic from ${ingressPortId} to analyzer port ${dest.destinationInterface}`, frame));
      } else if (dest.remoteVlan !== undefined) {
        const rspanVlan = dest.remoteVlan;
        const rspanTrunkPorts: string[] = [];
        if (state.ports) {
          for (const [pid, p] of Object.entries(state.ports)) {
            if (pid === ingressPortId) continue;
            if (p.shutdown) continue;
            if (p.mode === 'trunk') {
              const allowed = p.allowedVlans;
              if (allowed === 'all' || (Array.isArray(allowed) && allowed.includes(rspanVlan))) {
                rspanTrunkPorts.push(pid);
              }
            }
          }
        }
        for (const trunkPort of rspanTrunkPorts) {
          if (!egressPorts.includes(trunkPort)) {
            egressPorts.push(trunkPort);
          }
        }
        traces.push(makeTrace(hopIndex, device, ingressPortId, 'span-mirror', 'forward',
          `RSPAN: Mirroring ingress traffic from ${ingressPortId} onto remote VLAN ${rspanVlan} via trunk ${rspanTrunkPorts.length ? rspanTrunkPorts.join(',') : 'none'}`,
          { ...frame, vlanId: rspanVlan }));
      }
    }
    const rspanDestSessions = getRspanDestinationSessions(state, frame.vlanId);
    for (const dest of rspanDestSessions) {
      if (dest.destinationInterface && !egressPorts.includes(dest.destinationInterface)) {
        egressPorts.push(dest.destinationInterface);
      }
      traces.push(makeTrace(hopIndex, device, dest.destinationInterface || ingressPortId, 'span-mirror', 'forward',
        `RSPAN: Frame on remote VLAN ${frame.vlanId} delivered to analyzer port ${dest.destinationInterface}`, frame));
    }
  }

  // -- Stage 11: Egress + Packet Capture --------------------------------
  const capturedOnLinks: string[] = [];
  const connectionIndex = buildConnectionIndex(connections);

  for (const egressPortId of egressPorts) {
    const egressPort: Port | undefined = state?.ports?.[egressPortId];
    if (egressPort?.shutdown) {
      updatePortStats(egressPort, 'txdrop');
      return drop('egress', formatDropReason(DropReasonCode.L1_PORT_SHUTDOWN, `egress port ${egressPortId} is administratively down`));
    }
    if (egressPort) updatePortStats(egressPort, 'tx', frame.length || 64);

    const conn = connectionIndex.byPort.get(`${device.id}:${egressPortId}`);
    if (conn) {
      capturedOnLinks.push(conn.id);
      dispatchCapturedPackets([{
        connectionId: conn.id,
        sourceIp: frame.srcIp || '',
        targetIp: frame.dstIp || '',
        protocol: frame.mqttPayload ? 'MQTT' : frame.coapPayload ? 'CoAP' : frame.protocol,
        length: frame.length,
        info: frame.mqttPayload ? `MQTT ${frame.mqttPayload.type}${frame.mqttPayload.topic ? ` topic=${frame.mqttPayload.topic}` : ''}` : frame.coapPayload ? `CoAP ${frame.coapPayload.code} ${frame.coapPayload.path}` : frame.info,
      }]);
      traces.push(makeTrace(hopIndex, device, egressPortId, 'capture', 'pass',
        `Captured on link ${conn.id}`, frame));
    }
    traces.push(makeTrace(hopIndex, device, egressPortId, 'egress', 'pass',
      `Frame exiting port ${egressPortId}`, frame));
  }

  return {
    deviceId: device.id,
    accepted: true,
    trapToControlPlane: false,
    egressPorts,
    nextDeviceId,
    telemetryFrames,
    traces,
  };
}

/**
 * Run the packet pipeline across multiple hops until the destination
 * is reached, a packet is dropped, or we've exceeded the TTL.
 */
export function runFullPacketPipeline(
  frame: NetworkPacketFrame,
  sourceDeviceId: string,
  devices: CanvasDevice[],
  deviceStates: Map<string, SwitchState>,
  connections: CanvasConnection[],
  maxHops = 30,
  now: number = Date.now()
): PipelineResult {
  const allTraces: PacketTrace[] = [];
  const hopResults: HopResult[] = [];
  const capturedOnLinks: string[] = [];
  const telemetryFrames: NetworkPacketFrame[] = [];
  const deviceMap = new Map<string, CanvasDevice>(devices.map(d => [d.id, d]));

  let currentDeviceId = sourceDeviceId;
  let currentFrame = { ...frame, ttl: frame.ttl ?? 64 };
  let hopIndex = 0;

  const connectionIndex = buildConnectionIndex(connections);
  const visitedRouteKeys = new Map<string, number>();
  const visitOrder: string[] = [];

  while (hopIndex < maxHops) {
    const device = deviceMap.get(currentDeviceId);
    const state = deviceStates.get(currentDeviceId);

    if (!device) {
      return {
        success: false,
        hopResults,
        allTraces,
        capturedOnLinks,
        telemetryFrames,
        dropReason: formatDropReason(DropReasonCode.DEVICE_NOT_FOUND, `Device ${currentDeviceId} not found in topology`)
      };
    }

    const isL3 = device.type === 'router' || device.type === 'firewall' || device.type === 'switchL3';
    if (isL3) {
      const dstKey = currentFrame.dstIp || currentFrame.dstMac || 'unknown';
      const routeKey = `${currentDeviceId}:${dstKey}`;
      visitOrder.push(device.name);
      if (visitedRouteKeys.has(routeKey)) {
        const firstVisit = visitedRouteKeys.get(routeKey)!;
        const loopPath = firstVisit >= 0 ? visitOrder.slice(firstVisit).join(' \u2192 ') : visitOrder.join(' \u2192 ');
        const loopReason = formatDropReason(DropReasonCode.ROUTING_LOOP_DETECTED, `%ROUTING-3-LOOP_DETECTED: Routing loop detected: ${loopPath}`);
        if (state) {
          if (!state.eventLogs) state.eventLogs = [];
          state.eventLogs.push(`%ROUTING-3-LOOP_DETECTED: Packet loop detected on device ${device.name} (${loopPath})`);
        }
        const reportingIp = state?.ports ? Object.values(state.ports).find(p => p.ipAddress)?.ipAddress : undefined;
        const icmpErr = generateIcmpUnreachable(currentFrame, 'time-exceeded', loopReason, 0, reportingIp || '127.0.0.1');
        return {
          success: false,
          hopResults,
          allTraces,
          capturedOnLinks,
          telemetryFrames,
          dropReason: loopReason,
          finalFrame: icmpErr
        };
      }
      visitedRouteKeys.set(routeKey, visitOrder.length - 1);
    }

    const hopResult = runHopPipeline(hopIndex, currentFrame, device, state, devices, connections, now);
    hopResults.push(hopResult);
    telemetryFrames.push(...(hopResult.telemetryFrames || []));
    allTraces.push(...hopResult.traces);

    if (hopResult.traces.some(t => t.action === 'drop')) {
      const dropTrace = hopResult.traces.find(t => t.action === 'drop')!;
      const ingressPortId = currentFrame.ingressPortId;
      const ingressConn = ingressPortId ? connectionIndex.byPort.get(`${currentDeviceId}:${ingressPortId}`) : null;
      if (ingressConn) {
        capturedOnLinks.push(ingressConn.id);
        dispatchCapturedPackets([{
          connectionId: ingressConn.id,
          sourceIp: currentFrame.srcIp || '',
          targetIp: currentFrame.dstIp || '',
          protocol: currentFrame.protocol,
          length: currentFrame.length,
          info: `[DROP] Dropped at ${device.name}: ${dropTrace.reason}`,
        }]);
      }
      return {
        success: false,
        hopResults,
        allTraces,
        capturedOnLinks,
        telemetryFrames,
        dropReason: `Dropped at ${device.name}: ${dropTrace.reason}`,
        finalFrame: hopResult.responseFrame || currentFrame,
      };
    }

    if (hopResult.trapToControlPlane) {
      return {
        success: true,
        hopResults,
        allTraces,
        capturedOnLinks,
        telemetryFrames,
        finalFrame: hopResult.responseFrame || currentFrame,
      };
    }

    // Move to next hop
    if (hopResult.nextDeviceId) {
      const egressPortId = hopResult.egressPorts[0];
      const conn = connectionIndex.byPort.get(`${currentDeviceId}:${egressPortId}`);
      if (conn) {
        capturedOnLinks.push(conn.id);
        const nextPortId = conn.sourceDeviceId === currentDeviceId ? conn.targetPort : conn.sourcePort;

        if (isL3) {
          const newTtl = (currentFrame.ttl ?? 64) - 1;
          currentFrame = { ...currentFrame, ttl: newTtl };
          if (newTtl <= 0) {
            const ttlReason = formatDropReason(DropReasonCode.L3_TTL_EXCEEDED, `TTL reached 0 at ${device.name}`);
            const reportingIp = state?.ports?.[egressPortId]?.ipAddress || '127.0.0.1';
            const icmpErr = generateIcmpUnreachable(currentFrame, 'time-exceeded', ttlReason, 0, reportingIp);
            return {
              success: false,
              hopResults,
              allTraces,
              capturedOnLinks,
              telemetryFrames,
              dropReason: ttlReason,
              finalFrame: icmpErr
            };
          }
        }

        currentFrame = { ...currentFrame, ingressDeviceId: hopResult.nextDeviceId, ingressPortId: nextPortId };
        currentDeviceId = hopResult.nextDeviceId;
      } else {
        return { success: true, hopResults, allTraces, capturedOnLinks, finalFrame: currentFrame, telemetryFrames };
      }
    } else {
      return { success: true, hopResults, allTraces, capturedOnLinks, finalFrame: currentFrame, telemetryFrames };
    }

    hopIndex++;
  }

  return {
    success: false,
    hopResults,
    allTraces,
    capturedOnLinks,
    telemetryFrames,
    dropReason: formatDropReason(DropReasonCode.MAX_HOPS_EXCEEDED, `Maximum hop count (${maxHops}) exceeded — possible routing loop`)
  };
}

export function simulatePacketFlow(
  sourceDeviceId: string,
  _targetDeviceId: string,
  frame: NetworkPacketFrame,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates: Map<string, SwitchState>
): PacketSimulationResult {
  const result = runFullPacketPipeline(frame, sourceDeviceId, devices, deviceStates, connections);
  const hops: PacketHopTrace[] = (result.hopResults || []).map((h, i) => {
    return {
      deviceId: h.deviceId,
      portId: h.egressPorts[0],
      nextHopDevice: result.hopResults?.[i + 1]?.deviceId,
      details: h.traces.map(t => `${t.stage}: ${t.reason}`).join('; ')
    };
  });
  return {
    success: result.success,
    dropReason: result.dropReason,
    hops
  };
}
