import type { CommandHandler } from './commandTypes';
import type { SwitchState } from '../types';
import { buildRunningConfig } from './configBuilder';

const getTargetPortKey = (state: SwitchState): string | undefined => {
  if (!state.currentInterface) return undefined;
  const target = state.currentInterface.toLowerCase();
  return Object.keys(state.ports || {}).find(k => k.toLowerCase() === target) || state.currentInterface;
};

const cmdIpv6Eigrp: CommandHandler = (state, input, _ctx) => {
  const match = input.match(/^ipv6\s+eigrp\s+(\d+)$/i);
  if (!match || !state.currentInterface) return { success: false, error: '% Invalid ipv6 eigrp command syntax' };
  const as = match[1];
  const portKey = getTargetPortKey(state);
  if (!portKey) return { success: false, error: '% Interface not found' };

  const ports = { ...state.ports };
  const port = ports[portKey];
  if (!port) return { success: false, error: '% Interface not found' };

  ports[portKey] = {
    ...port,
    ipv6Eigrp: { enabled: true, as }
  };

  const newState = { ports };
  return {
    success: true,
    output: '',
    newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
  };
};

const cmdGlbp: CommandHandler = (state, input, _ctx) => {
  const portKey = getTargetPortKey(state);
  if (!portKey) return { success: false, error: '% No interface selected' };
  const ipMatch = input.match(/^glbp\s+(\d+)\s+ip(?:\s+(\S+))?/i);
  const prioMatch = input.match(/^glbp\s+(\d+)\s+priority\s+(\d+)/i);
  const preemptMatch = input.match(/^glbp\s+(\d+)\s+preempt/i);
  const lbMatch = input.match(/^glbp\s+(\d+)\s+load-balancing\s+(round-robin|weighted|host-dependent)/i);

  const ports = { ...state.ports };
  const port = ports[portKey];
  if (!port) return { success: false, error: '% Interface not found' };

  const glbp = { ...port.glbp, groups: { ...port.glbp?.groups } };

  if (ipMatch) {
    const groupId = parseInt(ipMatch[1], 10);
    const virtualIp = ipMatch[2];
    glbp.groups[groupId] = {
      ...glbp.groups[groupId],
      virtualIp: virtualIp || glbp.groups[groupId]?.virtualIp
    };
  } else if (prioMatch) {
    const groupId = parseInt(prioMatch[1], 10);
    glbp.groups[groupId] = {
      ...glbp.groups[groupId],
      priority: parseInt(prioMatch[2], 10)
    };
  } else if (preemptMatch) {
    const groupId = parseInt(preemptMatch[1], 10);
    glbp.groups[groupId] = {
      ...glbp.groups[groupId],
      preempt: true
    };
  } else if (lbMatch) {
    const groupId = parseInt(lbMatch[1], 10);
    glbp.groups[groupId] = {
      ...glbp.groups[groupId],
      loadBalancing: lbMatch[2].toLowerCase() as 'round-robin' | 'weighted' | 'host-dependent'
    };
  } else {
    return { success: false, error: '% Invalid glbp command syntax' };
  }

  ports[portKey] = { ...port, glbp };
  const newState = { ports };
  return {
    success: true,
    output: '',
    newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
  };
};

const cmdSpanningTreeGuardLoop: CommandHandler = (state, input, _ctx) => {
  const portKey = getTargetPortKey(state);
  if (!portKey) return { success: false, error: '% No interface selected' };
  const ports = { ...state.ports };
  const port = ports[portKey];
  if (!port) return { success: false, error: '% Interface not found' };

  const isNone = /none/i.test(input) || /^no\s+/i.test(input);
  const stp = { ...port.spanningTree, loopguard: (isNone ? 'disable' : 'enable') as 'enable' | 'disable' };
  ports[portKey] = { ...port, spanningTree: stp };

  const newState = { ports };
  return {
    success: true,
    output: '',
    newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
  };
};

const cmdIpFlowInterface: CommandHandler = (state, input, _ctx) => {
  const portKey = getTargetPortKey(state);
  if (!portKey) return { success: false, error: '% No interface selected' };
  const ports = { ...state.ports };
  const port = ports[portKey];
  if (!port) return { success: false, error: '% Interface not found' };

  const isNo = /^no\s+/i.test(input);
  const isIngress = /ingress/i.test(input);
  const isEgress = /egress/i.test(input);

  if (isNo) {
    if (isIngress) port.netflowIngress = false;
    if (isEgress) port.netflowEgress = false;
  } else {
    if (isIngress) port.netflowIngress = true;
    if (isEgress) port.netflowEgress = true;
  }

  const newState = { ports };
  return {
    success: true,
    output: '',
    newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
  };
};
const cmdServicePolicy: CommandHandler = (state, input) => {
  const m = input.match(/^service-policy\s+(input|output)\s+(\S+)$/i);
  if (!m || !state.currentInterface) return { success: false, error: '% Invalid service-policy syntax' };
  return { success: true, output: `Service-policy ${m[2]} applied ${m[1]} on ${state.currentInterface}`, newState: { qosServicePolicies: { ...state.qosServicePolicies, [state.currentInterface]: { direction: m[1].toLowerCase() as 'input' | 'output', policy: m[2] } } } };
};
import { cmdStormControl, cmdStormControlAction, cmdMlsQosTrust, cmdMlsQosCos, cmdPriorityQueueOut, cmdQueueSet, cmdTxQueue } from './interface/cmd.qos';
import { cmdDot1xPort } from './globalConfigAaaCommands';
import { cmdCdpEnable, cmdNoCdpEnable, cmdUdldEnable, cmdNoUdld, cmdChannelProtocol } from './interface/cmd.cdp';
import { cmdEncapsulationDot1q, cmdEncapsulationHdlc, cmdEncapsulationPpp, cmdNoEncapsulation, cmdClockRate, cmdNoClockRate, cmdPppAuthPap, cmdPppAuthChap, cmdNoPppAuth, cmdPppPapSentUsername, cmdPppChapCredentials } from './interface/cmd.ppp';
import { cmdBandwidth, cmdDelay, cmdMtu, cmdKeepalive, cmdNoKeepalive, cmdDirectedBroadcast, cmdCarrierDelay, cmdLoadInterval, cmdPowerInline, cmdPowerInlineConsumption, cmdArpInspectionLimit } from './interface/cmd.physical';
import { cmdLldpTransmit, cmdLldpReceive, cmdNoLldpTransmit, cmdNoLldpReceive } from './interface/cmd.misc';

// cmd modülleri
import {
  cmdInterface,
  cmdShutdown,
  cmdNoShutdown,
  cmdSpeed,
  cmdDuplex,
  cmdDescription,
  cmdNoDescription,
} from './interface/cmd.interface';

import {
  cmdNoSwitchport,
  cmdSwitchportMode,
  cmdSwitchportAccessVlan,
  cmdSwitchportTrunkNativeVlan,
  cmdSwitchportTrunkAllowedVlan,
  cmdSwitchportPortSecurity,
  cmdSwitchportPortSecurityMaximum,
  cmdSwitchportPortSecurityViolation,
  cmdSwitchportPortSecuritySticky,
  cmdNoSwitchportMode,
  cmdNoSwitchportAccessVlan,
  cmdNoSwitchportPortSecurity,
  cmdSwitchportNonegotiate,
  cmdSwitchportVoiceVlan,
  cmdSwitchportProtected,
  cmdSwitchportBlock,
  cmdSwitchportPortSecurityMacAddress,
  cmdSwitchportTrunkEncapsulation,
  cmdSwitchportPortSecurityAgingTime,
  cmdSwitchportPortSecurityAgingType,
} from './interface/cmd.switchport';

import {
  cmdIpAddress,
  cmdNoIpAddress,
  cmdIpDefaultGateway,
  cmdNoIpDefaultGateway,
  cmdIpv6Address,
  cmdIpv6AddressAutoconfig,
  cmdIpv6TrafficFilter,
  cmdIpv6Rip,
  cmdIpv6Ospf,
  cmdIpOspfArea,
  cmdNoIpOspfArea,
  cmdNoIpv6Rip,
  cmdIpv6DhcpServer,
  cmdNoIpv6Ospf,
  cmdIpHelperAddress,
  cmdNoIpHelperAddress,
  cmdIpNatInside,
  cmdIpNatOutside,
  cmdNoIpNatInside,
  cmdNoIpNatOutside,
  cmdIpAccessGroup,
  cmdNoIpAccessGroup,
  cmdIpProxyArp,
  cmdNoIpProxyArp,
  cmdIpVerifySource,
  cmdIpDhcpSnoopingTrust,
  cmdNoIpDhcpSnoopingTrust,
  cmdIpArpInspectionTrust,
  cmdNoIpArpInspectionTrust,
  cmdIpv6NdSuppressRa,
  cmdNoIpv6NdSuppressRa,
  cmdTunnelSource,
  cmdTunnelDestination,
  cmdTunnelMode,
  cmdMplsIpInterface,
  cmdIpVrfForwarding,
  cmdZoneMember,
} from './interface/cmd.ipAddress';

import {
  cmdSpanningTreePortfast,
  cmdSpanningTreeBpduguard,
  cmdSpanningTreeBpduguardDisable,
  cmdSpanningTreeCost,
  cmdNoSpanningTreeCost,
  cmdSpanningTreePriority,
  cmdNoSpanningTree,
  cmdChannelGroup,
  cmdNoChannelGroup,
} from './interface/cmd.spanningTree';

import {
  cmdStandbyIp,
  cmdStandbyPriority,
  cmdStandbyIpv6,
  cmdStandbyPreempt,
  cmdSsid,
  cmdEncryption,
  cmdWlan,
  cmdNoWlan,
  cmdSecurityWpaPsk,
  cmdSecurityWepKey,
  cmdChannel,
  cmdStationRole,
  cmdDebug,
  cmdNoDebug,
  cmdMonitorSession,
  cmdNoMonitorSession,
  cmdAccessList,
  cmdNoAccessList,
  cmdVrrpIp,
  cmdVrrpPriority,
  cmdVrrpPreempt,
  cmdQosSetDscp,
  cmdIpDhcpSnoopingLimitRate,
} from './interface/cmd.misc';

// Interface-level komutlar (interface, shutdown, speed, duplex, switchport, ip address, vs.)

export const interfaceHandlers: Record<string, CommandHandler> = {
  'interface': cmdInterface,
  'interface range': cmdInterface,
  'shutdown': cmdShutdown,
  'no shutdown': cmdNoShutdown,
  'speed': cmdSpeed,
  'duplex': cmdDuplex,
  'description': cmdDescription,
  'switchport mode': cmdSwitchportMode,
  'switchport access vlan': cmdSwitchportAccessVlan,
  'switchport trunk native vlan': cmdSwitchportTrunkNativeVlan,
  'switchport trunk allowed vlan': cmdSwitchportTrunkAllowedVlan,
  'switchport port-security': cmdSwitchportPortSecurity,
  'switchport port-security maximum': cmdSwitchportPortSecurityMaximum,
  'switchport port-security violation': cmdSwitchportPortSecurityViolation,
  'switchport port-security mac-address sticky': cmdSwitchportPortSecuritySticky,
  'no switchport': cmdNoSwitchport,
  'spanning-tree portfast': cmdSpanningTreePortfast,
  'spanning-tree bpduguard': cmdSpanningTreeBpduguard,
  'ip address': cmdIpAddress,
  'no ip address': cmdNoIpAddress,
  'ip default-gateway': cmdIpDefaultGateway,
  'no ip default-gateway': cmdNoIpDefaultGateway,
  'wlan': cmdWlan,
  'no wlan': cmdNoWlan,
  'security wpa psk set-key': cmdSecurityWpaPsk,
  'security wep key set-key': cmdSecurityWepKey,
  'channel': cmdChannel,
  'station-role': cmdStationRole,
  'ssid': cmdSsid,
  'encryption': cmdEncryption,
  // No commands for interface
  'no description': cmdNoDescription,
  'no switchport mode': cmdNoSwitchportMode,
  'no switchport access vlan': cmdNoSwitchportAccessVlan,
  'no switchport port-security': cmdNoSwitchportPortSecurity,
  'no cdp enable': cmdNoCdpEnable,
  'no lldp transmit': cmdNoLldpTransmit,
  'no lldp receive': cmdNoLldpReceive,
  'no udld': cmdNoUdld,
  'no ip proxy-arp': cmdNoIpProxyArp,
  'no keepalive': cmdNoKeepalive,
  'no spanning-tree': cmdNoSpanningTree,
  // Debug and monitor
  'debug': cmdDebug,
  'no debug': cmdNoDebug,
  'undebug all': cmdNoDebug,
  'undebug': cmdNoDebug,
  'monitor session': cmdMonitorSession,
  'no monitor session': cmdNoMonitorSession,
  // Access-list
  'access-list': cmdAccessList,
  'no access-list': cmdNoAccessList,
  'ip access-group': cmdIpAccessGroup,
  'no ip access-group': cmdNoIpAccessGroup,
  // EtherChannel
  'channel-group': cmdChannelGroup,
  'no channel-group': cmdNoChannelGroup,
  // DHCP relay
  'ip helper-address': cmdIpHelperAddress,
  'no ip helper-address': cmdNoIpHelperAddress,
  // Switchport extras
  'switchport nonegotiate': cmdSwitchportNonegotiate,
  'switchport voice vlan': cmdSwitchportVoiceVlan,
  // CDP
  'cdp enable': cmdCdpEnable,
  'lldp transmit': cmdLldpTransmit,
  'lldp receive': cmdLldpReceive,
  // Spanning-tree extras
  'spanning-tree bpduguard enable': cmdSpanningTreeBpduguard,
  'spanning-tree bpduguard disable': cmdSpanningTreeBpduguardDisable,
  'no spanning-tree bpduguard': cmdSpanningTreeBpduguardDisable,
  'no spanning-tree bpduguard enable': cmdSpanningTreeBpduguardDisable,
  'spanning-tree cost': cmdSpanningTreeCost,
  'no spanning-tree cost': cmdNoSpanningTreeCost,
  'spanning-tree priority': cmdSpanningTreePriority,
  'ipv6 address autoconfig': cmdIpv6AddressAutoconfig,
  'ipv6 address': cmdIpv6Address,
  'ipv6 nd suppress-ra': cmdIpv6NdSuppressRa,
  'no ipv6 nd suppress-ra': cmdNoIpv6NdSuppressRa,
  'ipv6 rip enable': cmdIpv6Rip,
  'ipv6 ospf area': cmdIpv6Ospf,
  'ip ospf area': cmdIpOspfArea,
  'no ip ospf area': cmdNoIpOspfArea,
  'ipv6 dhcp server': cmdIpv6DhcpServer,
  'no ipv6 rip enable': cmdNoIpv6Rip,
  'no ipv6 ospf area': cmdNoIpv6Ospf,
  'switchport voice': cmdSwitchportVoiceVlan,
  'channel-protocol': cmdChannelProtocol,
  'priority-queue out': cmdPriorityQueueOut,
  'queue-set': cmdQueueSet,
  'tx-queue': cmdTxQueue,
  'power inline': cmdPowerInline,
  'power inline consumption': cmdPowerInlineConsumption,
  'ip directed-broadcast': (state, input, _ctx) => cmdDirectedBroadcast(state, input, true),
  'no ip directed-broadcast': (state, input, _ctx) => cmdDirectedBroadcast(state, input, false),
  'ip arp inspection limit': cmdArpInspectionLimit,
  'carrier-delay': cmdCarrierDelay,
  'delay': cmdDelay,
  'load-interval': cmdLoadInterval,
  'mtu': cmdMtu,
  'switchport trunk encapsulation': cmdSwitchportTrunkEncapsulation,
  'encapsulation dot1q': cmdEncapsulationDot1q,
  'encapsulation hdlc': cmdEncapsulationHdlc,
  'encapsulation ppp': cmdEncapsulationPpp,
  'no encapsulation': cmdNoEncapsulation,
  'clock rate': cmdClockRate,
  'no clock rate': cmdNoClockRate,
  'ppp authentication pap': cmdPppAuthPap,
  'ppp authentication chap': cmdPppAuthChap,
  'ppp chap hostname': cmdPppChapCredentials,
  'ppp chap password': cmdPppChapCredentials,
  'no ppp authentication': cmdNoPppAuth,
  'ppp pap sent-username': cmdPppPapSentUsername,
  'switchport protected': cmdSwitchportProtected,
  'no switchport protected': cmdSwitchportProtected,
  'switchport block': cmdSwitchportBlock,
  'no switchport block': cmdSwitchportBlock,
  'switchport port-security mac-address': cmdSwitchportPortSecurityMacAddress,
  'switchport port-security aging time': cmdSwitchportPortSecurityAgingTime,
  'switchport port-security aging type': cmdSwitchportPortSecurityAgingType,
  'storm-control': cmdStormControl,
  'storm-control action': cmdStormControlAction,
  'mls qos trust': cmdMlsQosTrust,
  'mls qos cos': cmdMlsQosCos,
  'service-policy': cmdServicePolicy,
  'dot1x port-control': cmdDot1xPort,
  'set dscp': cmdQosSetDscp,
  'ip dhcp snooping trust': cmdIpDhcpSnoopingTrust,
  'tunnel source': cmdTunnelSource,
  'tunnel destination': cmdTunnelDestination,
  'tunnel mode': cmdTunnelMode,
  'mpls ip': cmdMplsIpInterface,
  'no mpls ip': cmdMplsIpInterface,
  'ip vrf forwarding': cmdIpVrfForwarding,
  'no ip vrf forwarding': cmdIpVrfForwarding,
  'zone-member security': cmdZoneMember,
  'no zone-member security': cmdZoneMember,
  'no ip dhcp snooping trust': cmdNoIpDhcpSnoopingTrust,
  'ip dhcp snooping limit rate': cmdIpDhcpSnoopingLimitRate,
  'no ip dhcp snooping limit rate': cmdIpDhcpSnoopingLimitRate,
  'ip arp inspection trust': cmdIpArpInspectionTrust,
  'no ip arp inspection trust': cmdNoIpArpInspectionTrust,
  'bandwidth': cmdBandwidth,
  'keepalive': cmdKeepalive,
  'ip proxy-arp': cmdIpProxyArp,
  'ip verify source': cmdIpVerifySource,
  'udld enable': cmdUdldEnable,
  'udld port': cmdUdldEnable,
  'standby ip': cmdStandbyIp,
  'standby priority': cmdStandbyPriority,
  'standby ipv6': cmdStandbyIpv6,
  'standby preempt': cmdStandbyPreempt,
  'vrrp ip': cmdVrrpIp,
  'vrrp priority': cmdVrrpPriority,
  'vrrp preempt': cmdVrrpPreempt,
  'vrrp': cmdVrrpIp,
  'ipv6 traffic-filter': cmdIpv6TrafficFilter,
  'no ipv6 traffic-filter': cmdIpv6TrafficFilter,
  'ip nat inside': cmdIpNatInside,
  'no ip nat inside': cmdNoIpNatInside,
  'ip nat outside': cmdIpNatOutside,
  'no ip nat outside': cmdNoIpNatOutside,
  'ipv6 eigrp': cmdIpv6Eigrp,
  'glbp': cmdGlbp,
  'spanning-tree guard loop': cmdSpanningTreeGuardLoop,
  'spanning-tree guard none': cmdSpanningTreeGuardLoop,
  'ip flow ingress': cmdIpFlowInterface,
  'ip flow egress': cmdIpFlowInterface,
  'no ip flow ingress': cmdIpFlowInterface,
  'no ip flow egress': cmdIpFlowInterface,
};
