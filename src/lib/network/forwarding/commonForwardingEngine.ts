import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState, Port } from '@/lib/network/types';
import type { NetworkPacketFrame } from './packetFrame';
import { getRoutingTable, findRoute, Route } from '@/lib/network/routing';
import { learnMacAddress } from '@/lib/network/macLearning';
import { generateIcmpUnreachable } from './icmpUtils';
import { deterministicIdWithPrefix } from '@/lib/network/randomServices';
import { processSnmpPacket } from '@/lib/network/snmp';
import { establishIpsecSa, decapsulateEsp } from '@/lib/network/ipsec';
import { isFrameAllowedOnDot1xPort } from '@/lib/network/dot1x';
import { processEapolFrame } from '@/lib/network/dot1x';
import { processMqtt, processCoap } from '@/lib/network/applicationProtocols';
import { processNetconfFrame } from '@/lib/network/netconfTransport';

export interface ForwardingEngineResult {
  accepted: boolean;
  trapToControlPlane: boolean;
  egressPorts: string[];
  nextHopDevice?: CanvasDevice;
  actionReason: string;
  responseFrame?: NetworkPacketFrame;
}

/**
 * Stage 1: Ingress Layer 1 / Layer 2 Sanity & Security Filtering
 */
export function checkIngressSanity(
  frame: NetworkPacketFrame,
  device: CanvasDevice,
  _state: SwitchState | undefined,
  ingressPort: Port | undefined
): { allowed: boolean; reason: string } {
  if (device.status === 'offline') {
    return { allowed: false, reason: 'Device is powered off' };
  }

  if (!ingressPort) {
    return { allowed: true, reason: 'Ingress port not specified' };
  }

  if (ingressPort.shutdown) {
    return { allowed: false, reason: `Port ${ingressPort.name || ingressPort.id} is shutdown` };
  }

  if (_state && !isFrameAllowedOnDot1xPort(_state, ingressPort.id, parseInt(frame.etherType, 16), frame.dstMac)) {
    return { allowed: false, reason: `802.1X port ${ingressPort.id} is unauthorized` };
  }

  // STP State check: Allow BPDUs even when port is Discarding/Learning
  if (frame.protocol === 'STP') {
    return { allowed: true, reason: 'STP BPDU allowed' };
  }

  if (ingressPort.status === 'blocked' || ingressPort.status === 'disabled') {
    return { allowed: false, reason: `Port status is ${ingressPort.status}` };
  }

  // MAC Access-List Filtering (Ingress L2 Port ACL)
  if (ingressPort.macAccessGroupIn && _state?.macAcls) {
    const aclName = ingressPort.macAccessGroupIn;
    const rules = _state.macAcls[aclName] || [];
    if (rules.length > 0) {
      const srcMacNorm = (frame.srcMac || '').toLowerCase().replace(/[:-]/g, '.');
      const dstMacNorm = (frame.dstMac || '').toLowerCase().replace(/[:-]/g, '.');

      const matchesMac = (pattern: string, targetMac: string) => {
        if (!pattern || pattern === 'any') return true;
        const normPat = pattern.toLowerCase().replace(/[:-]/g, '.');
        return targetMac.includes(normPat) || normPat.includes(targetMac);
      };

      for (const ruleItem of rules) {
        const ruleStr = typeof ruleItem === 'string' ? ruleItem : JSON.stringify(ruleItem);
        // Format e.g. "permit host 0011.2233.4455 any" or "deny any any" or "permit any any"
        const permitMatch = ruleStr.match(/^permit\s+(?:host\s+)?(\S+)\s+(?:host\s+)?(\S+)/i);
        const denyMatch = ruleStr.match(/^deny\s+(?:host\s+)?(\S+)\s+(?:host\s+)?(\S+)/i);

        if (permitMatch) {
          const [, ruleSrc, ruleDst] = permitMatch;
          if (matchesMac(ruleSrc, srcMacNorm) && matchesMac(ruleDst, dstMacNorm)) {
            return { allowed: true, reason: `Permitted by MAC ACL ${aclName}` };
          }
        } else if (denyMatch) {
          const [, ruleSrc, ruleDst] = denyMatch;
          if (matchesMac(ruleSrc, srcMacNorm) && matchesMac(ruleDst, dstMacNorm)) {
            return { allowed: false, reason: `Dropped by MAC ACL ${aclName}` };
          }
        }
      }
      // Implicit deny if list exists but no permit matched
      return { allowed: false, reason: `Implicitly dropped by MAC ACL ${aclName}` };
    }
  }

  return { allowed: true, reason: 'Ingress checks passed' };
}

/**
 * Stage 2: Control Plane Protocol Processing (STP, ARP, DHCP, OSPF, EIGRP, IP SLA)
 */
export function processControlPlaneProtocols(
  frame: NetworkPacketFrame,
  device: CanvasDevice,
  state: SwitchState | undefined,
  now: number = Date.now()
): { handled: boolean; rejected?: boolean; updatedState?: SwitchState; responseFrame?: NetworkPacketFrame } {
  if (!state) return { handled: false };

  const updatedState = { ...state };
  let handled = false;
  let responseFrame: NetworkPacketFrame | undefined;

  if (frame.mqttPayload && (frame.dstPort === undefined || frame.dstPort === 1883 || frame.dstPort === 8883)) {
    handled = true;
    const mqtt = processMqtt(state, frame.mqttPayload);
    responseFrame = mqtt.response ? { ...frame, id: `mqtt-response-${Date.now()}`, srcMac: frame.dstMac, dstMac: frame.srcMac,
      srcIp: frame.dstIp, dstIp: frame.srcIp, mqttPayload: mqtt.response, info: `MQTT ${mqtt.response.type}` } : undefined;
    return { handled, updatedState: mqtt.state, responseFrame };
  }
  if (frame.coapPayload && (frame.dstPort === undefined || frame.dstPort === 5683 || frame.dstPort === 5684)) {
    handled = true;
    const coap = processCoap(state, frame.coapPayload);
    responseFrame = { ...frame, id: `coap-response-${Date.now()}`, srcMac: frame.dstMac, dstMac: frame.srcMac,
      srcIp: frame.dstIp, dstIp: frame.srcIp, coapPayload: coap.response, info: `CoAP ${coap.response.code} ${coap.response.path}` };
    return { handled, updatedState: coap.state, responseFrame };
  }
  if (frame.netconfPayload && (frame.dstPort === undefined || frame.dstPort === 830)) {
    handled = true;
    const netconf = processNetconfFrame(state, frame.srcIp || frame.srcMac, frame.netconfPayload);
    responseFrame = { ...frame, id: `netconf-response-${Date.now()}`, srcMac: frame.dstMac, dstMac: frame.srcMac,
      srcIp: frame.dstIp, dstIp: frame.srcIp, srcPort: 830, dstPort: frame.srcPort, netconfPayload: netconf.response,
      info: `NETCONF ${netconf.response.operation}` };
    return { handled, updatedState: netconf.state, responseFrame };
  }

  if (frame.eapolPayload && frame.ingressPortId) {
    handled = true;
    const portId = frame.ingressPortId;
    const session = state.dot1xSessions?.[portId] || { port: portId, portControl: 'auto', state: 'unauthorized' as const };
    const radius = state.radiusServers?.[0];
    const exchange = processEapolFrame(session, frame.eapolPayload, radius ? { ip: radius.host, secret: radius.key || state.radiusKey || '' } : undefined);
    updatedState.dot1xSessions = { ...updatedState.dot1xSessions, [portId]: exchange.nextSession };
    updatedState.eventLogs = [...(updatedState.eventLogs || []), exchange.logMessage];
    if (exchange.responseFrame) {
      responseFrame = { id: `eapol-response-${Date.now()}`, protocol: 'IPV4', timestamp: now, ingressDeviceId: device.id,
        srcMac: device.macAddress || '00:00:00:00:00:00', dstMac: frame.srcMac, etherType: '0x888e',
        eapolPayload: exchange.responseFrame, length: 64, info: exchange.logMessage };
    }
  }

  if (frame.protocol === 'IPSEC' && frame.ipsecPayload) {
    handled = true;
    const profile = Object.values(state.cryptoMaps || {})
      .flatMap(entries => Object.values(entries))
      .find(entry => entry.setPeer && entry.setTransformSet);
    if (profile?.setPeer && profile.setTransformSet) {
      const clear = decapsulateEsp({ protocol: 50, ...frame.ipsecPayload }, establishIpsecSa(profile.setPeer, profile.setTransformSet));
      if (clear) {
        updatedState.eventLogs = [...(updatedState.eventLogs || []), `%IPSEC-5-REPLAY: ESP packet decapsulated (${clear.protocol})`];
      } else {
        return { handled: true, rejected: true, updatedState: { ...updatedState, eventLogs: [...(updatedState.eventLogs || []), '%IPSEC-4-ERROR: ESP packet rejected (SA/SPI mismatch)'] } };
      }
    } else {
      return { handled: true, rejected: true, updatedState: { ...updatedState, eventLogs: [...(updatedState.eventLogs || []), '%IPSEC-4-ERROR: No matching IPsec profile'] } };
    }
  }

  // SNMP requests terminate at the management plane (UDP/161) and produce a
  // real response frame from the current device state.
  if (frame.protocol === 'UDP' && frame.dstPort === 161 && frame.snmpPayload) {
    handled = true;
    const response = processSnmpPacket(device.id, frame.snmpPayload, new Map([[device.id, state]]));
    responseFrame = {
      id: deterministicIdWithPrefix('snmp-response'), protocol: 'UDP', timestamp: now,
      ingressDeviceId: device.id, srcMac: device.macAddress || '00:00:00:00:00:00', dstMac: frame.srcMac,
      etherType: '0x0800', srcIp: frame.dstIp, dstIp: frame.srcIp, srcPort: 161, dstPort: frame.srcPort,
      snmpPayload: { pdu: frame.snmpPayload.pdu, version: frame.snmpPayload.version, community: frame.snmpPayload.community,
        requestId: response.requestId, oids: frame.snmpPayload.oids,
        varBinds: response.varBinds.map(v => ({ oid: v.oid, value: v.value })), error: response.error },
      length: 80, info: `SNMP response ${response.error}`
    };
  }

  // 1. ARP Protocol Trap
  if (frame.protocol === 'ARP' && frame.arpPayload) {
    handled = true;
    const { operation, senderIp, senderMac, targetIp } = frame.arpPayload;

    // Learn ARP entry into local ARP cache
    const currentArp = updatedState.arpCache || [];
    if (!currentArp.some(a => a.ip === senderIp)) {
      updatedState.arpCache = [
        ...currentArp,
        { ip: senderIp, mac: senderMac, interface: frame.ingressPortId || 'eth0', timestamp: now }
      ];
    }

    // Check if target IP belongs to this device
    const localIps = Object.values(updatedState.ports || {})
      .map(p => p.ipAddress)
      .filter(Boolean) as string[];

    if (device.ip) localIps.push(device.ip);

    if (operation === 'request' && targetIp && localIps.includes(targetIp)) {
      const myMac = device.macAddress || Object.values(updatedState.ports || {})[0]?.macAddress || '00:00:00:00:00:00';
      responseFrame = {
        id: deterministicIdWithPrefix('arp-reply'),
        protocol: 'ARP',
        timestamp: now,
        ingressDeviceId: device.id,
        srcMac: myMac,
        dstMac: senderMac,
        etherType: '0x0806',
        srcIp: targetIp,
        dstIp: senderIp,
        arpPayload: {
          operation: 'reply',
          senderIp: targetIp,
          senderMac: myMac,
          targetIp: senderIp,
          targetMac: senderMac
        },
        length: 42,
        info: `ARP Reply ${targetIp} is at ${myMac}`
      };
    }
  }

  // 2. DHCP Protocol Trap
  if ((frame.protocol === 'DHCP' || frame.protocol === 'DHCPV6') && frame.dhcpPayload) {
    handled = true;
    const { messageType, clientMac } = frame.dhcpPayload;

    if (messageType === 'discover' || messageType === 'request') {
      const poolKeys = Object.keys(updatedState.dhcpPools || {});
      if (poolKeys.length > 0) {
        const pool = updatedState.dhcpPools![poolKeys[0]];
        const excludedList = updatedState.dhcpExcludedAddresses || [];

        const ipToNum = (ip: string): number => ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
        const numToIp = (num: number): string => [ (num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255 ].join('.');

        let assignedIp = '192.168.1.100';
        if (pool.network) {
          const parts = pool.network.split('.');
          const baseNum = (parseInt(parts[0], 10) << 24) | (parseInt(parts[1], 10) << 16) | (parseInt(parts[2], 10) << 8);
          // Find first available IP from .10 to .250 not in excluded ranges
          for (let host = 10; host <= 250; host++) {
            const candidateNum = (baseNum | host) >>> 0;
            const isExcluded = excludedList.some(exc => {
              const startNum = ipToNum(exc.startIp);
              const endNum = exc.endIp ? ipToNum(exc.endIp) : startNum;
              return candidateNum >= startNum && candidateNum <= endNum;
            });
            if (!isExcluded) {
              assignedIp = numToIp(candidateNum);
              break;
            }
          }
        }

        responseFrame = {
          id: `dhcp-ack-${Date.now()}`,
          protocol: 'DHCP',
          timestamp: now,
          ingressDeviceId: device.id,
          srcMac: device.macAddress || '00:00:00:00:00:00',
          dstMac: clientMac,
          etherType: '0x0800',
          srcIp: device.ip || '192.168.1.1',
          dstIp: assignedIp,
          dhcpPayload: {
            messageType: messageType === 'discover' ? 'offer' : 'ack',
            clientMac,
            offeredIp: assignedIp,
            subnetMask: pool.subnetMask || '255.255.255.0',
            gateway: pool.defaultRouter || device.ip
          },
          length: 300,
          info: `DHCP ${messageType === 'discover' ? 'Offer' : 'ACK'} ${assignedIp} for ${clientMac}`
        };
      }
    }
  }

  // 3. STP Protocol Trap
  if (frame.protocol === 'STP' && frame.stpPayload) {
    handled = true;
    if (frame.stpPayload.rootId) {
      updatedState.spanningTreePriority = Math.min(updatedState.spanningTreePriority || 32768, 32768);
    }
  }

  // 4. OSPF Protocol Trap
  if (frame.protocol === 'OSPF' && frame.ospfPayload) {
    handled = true;
    const { routerId } = frame.ospfPayload;
    if (routerId) {
      const existing = updatedState.ospfNeighbors || [];
      if (!existing.includes(routerId)) {
        updatedState.ospfNeighbors = [...existing, routerId];
      }
    }
  }

  // 5. EIGRP Protocol Trap
  if (frame.protocol === 'EIGRP' && frame.eigrpPayload) {
    handled = true;
    const { routes } = frame.eigrpPayload;
    const peerIp = frame.srcIp || '10.0.0.1';
    const existing = updatedState.eigrpNeighbors || [];
    if (!existing.includes(peerIp)) {
      updatedState.eigrpNeighbors = [...existing, peerIp];
    }

    if (routes && routes.length > 0) {
      const currentDynamic = updatedState.dynamicRoutes || [];
      routes.forEach(r => {
        if (!currentDynamic.some(e => e.destination === r.prefix)) {
          const newRoute: Route = {
            destination: r.prefix,
            subnetMask: r.mask,
            nextHop: r.nexthop,
            interfaceId: frame.ingressPortId || 'Gi0/0',
            type: 'dynamic',
            metric: r.delay + r.bandwidth,
            administrativeDistance: 90
          };
          currentDynamic.push(newRoute);
        }
      });
      updatedState.dynamicRoutes = currentDynamic;
    }
  }

  // 6. IP SLA Probe Trap
  if (frame.protocol === 'IP_SLA' && frame.ipSlaPayload) {
    handled = true;
    const { operationId } = frame.ipSlaPayload;
    if (updatedState.ipSlaOperations?.[operationId]) {
      const op = updatedState.ipSlaOperations[operationId];
      op.statistics.attempts += 1;
      op.statistics.successes += 1;
      op.statistics.last = 2;
      op.lastRunAt = now;

      if (updatedState.ipSlaTracks) {
        Object.entries(updatedState.ipSlaTracks).forEach(([_trackId, track]) => {
          if (track.operationId === operationId) {
            track.state = 'up';
            track.lastChange = now;
          }
        });
      }
    }
  }

  return { handled, updatedState, responseFrame };
}

/**
 * Stage 3: Common Data Plane Layer 2 / Layer 3 Forwarding Engine
 */
export function forwardPacketFrame(
  frame: NetworkPacketFrame,
  device: CanvasDevice,
  state: SwitchState | undefined,
  _devices: CanvasDevice[] = [],
  _connections: CanvasConnection[] = []
): ForwardingEngineResult {
  // Stage 1: Ingress checks
  const ingressPort = state?.ports?.[frame.ingressPortId || ''];
  const sanity = checkIngressSanity(frame, device, state, ingressPort);
  if (!sanity.allowed) {
    return {
      accepted: false,
      trapToControlPlane: false,
      egressPorts: [],
      actionReason: sanity.reason
    };
  }

  // TTL handling: Check incoming TTL
  let ttl = frame.ttl;
  if (ttl === undefined) ttl = 255; // Default TTL if not set

  // If TTL is 0, drop the packet and send ICMP Time Exceeded
  if (ttl <= 0) {
    const icmpMsg = generateIcmpUnreachable(frame, 'time-exceeded', 'ttl-zero');
    return {
      accepted: false,
      trapToControlPlane: true,
      egressPorts: [],
      actionReason: 'Packet dropped due to TTL zero',
      responseFrame: icmpMsg
    };
  }

  // Decrement TTL for this hop
  ttl--;
  frame.ttl = ttl; // Update frame TTL for propagation

  // Stage 2: Control plane traps
  const controlRes = processControlPlaneProtocols(frame, device, state);
  if (controlRes.handled) {
    return {
      accepted: true,
      trapToControlPlane: true,
      egressPorts: [],
      actionReason: 'Handled by Control Plane Protocol Engine',
      responseFrame: controlRes.responseFrame
    };
  }

  // Learn MAC Address if Switch
  if (state && (device.type === 'switchL2' || device.type === 'switchL3') && frame.ingressPortId) {
    const deviceMap = new Map<string, SwitchState>([[device.id, state]]);
    learnMacAddress(device.id, frame.srcMac, frame.ingressPortId, frame.vlanId || 1, deviceMap);
  }


  // Stage 3: Switching / Routing Forwarding Logic
  const egressPorts: string[] = [];
  const multicastGroup = frame.dstIp && frame.dstIp.split('.').length === 4
    ? Number(frame.dstIp.split('.')[0]) >= 224 && Number(frame.dstIp.split('.')[0]) <= 239
    : false;

  if (device.type === 'switchL2' || device.type === 'switchL3' || device.type === 'hub') {
    if (multicastGroup && state?.multicastRoutingEnabled) {
      // Multicast forwarding follows receiver state instead of unicast MAC flooding.
      Object.values(state.ports || {}).forEach((port) => {
        const joined = port.igmpGroups?.includes(frame.dstIp as string);
        const pimForwarding = Boolean(port.pimMode);
        if (port.id !== frame.ingressPortId && !port.shutdown && port.status === 'connected' && (joined || pimForwarding)) {
          egressPorts.push(port.id);
        }
      });
    } else if (device.type === 'hub' || frame.dstMac === 'ff:ff:ff:ff:ff:ff' || !frame.dstMac) {
      // L1 Flood to all active forwarding ports (except ingress port)
      Object.values(state?.ports || {}).forEach(p => {
        if (p.id !== frame.ingressPortId && !p.shutdown && p.status === 'connected') {
          egressPorts.push(p.id);
        }
      });
    } else {
      const matchEntry = state?.macAddressTable?.find(m => m.mac === frame.dstMac);
      if (matchEntry?.port && matchEntry.port !== frame.ingressPortId && !state?.ports?.[matchEntry.port]?.shutdown) {
        egressPorts.push(matchEntry.port);
      } else {
        // Unicast miss -> Flood
        Object.values(state?.ports || {}).forEach(p => {
          if (p.id !== frame.ingressPortId && !p.shutdown && p.status === 'connected') {
            egressPorts.push(p.id);
          }
        });
      }
    }
  } else if (device.type === 'router' || device.type === 'firewall') {
    // Router Layer 3 Route Lookup
    if (frame.dstIp && state) {
      const deviceMap = new Map<string, SwitchState>([[device.id, state]]);
      const fullTable = getRoutingTable(device.id, deviceMap);
      const route = findRoute(frame.dstIp, fullTable);
      if (route && (route.interfaceId || route.nextHop)) {
        const portId = route.interfaceId || route.nextHop;
        // Static routes may reference a shutdown interface; don't forward out.
        if (!state.ports?.[portId]?.shutdown) {
          egressPorts.push(portId);
        }
      }
    }
  } else if (device.type === 'cloud') {
    // Cloud WAN transit bridge forwarding
    (device.ports || []).forEach(p => {
      if (p.id !== frame.ingressPortId && !p.shutdown && p.status === 'connected') {
        egressPorts.push(p.id);
      }
    });
  }

  return {
    accepted: true,
    trapToControlPlane: false,
    egressPorts,
    actionReason: `Forwarded to ${egressPorts.length} egress ports`
  };
}


