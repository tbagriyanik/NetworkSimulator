import { CLI_ERRORS } from './cliErrors';
import type { CommandHandler, CommandContext } from './commandTypes';
import { buildRunningConfig } from './configBuilder';
import { SwitchState, CommandResult } from '../types';
import { formatIpSlaStatistics } from '../ipSlaEngine';

import {
  cmdShowWireless, cmdShowWlanSummary,
  cmdShowApSummary, cmdShowApConfig, cmdShowApJoinStats,
  cmdShowDot11Associations, cmdShowDot11Statistics, cmdShowWlan,
} from './showWlcDisplay';

import {
  cmdShowVersion, cmdShowClock, cmdShowFlash, cmdShowBoot,
  cmdShowStartupConfig, cmdShowRunningConfig as cmdShowRunningConfigSystem,
} from './showSystemDisplay';

import {
  cmdShowInterfaces, cmdShowInterface, cmdShowInterfaceTrunk,
  cmdShowIpInterfaceBrief, cmdShowInterfacesStatus,
  cmdShowIpInterface, cmdShowIpv6InterfaceBrief,
  cmdShowNameif, cmdShowControllers, cmdShowIpAccessGroup,
  cmdShowInterfacesCounters,
} from './showInterfaceDisplay';

import {
  cmdShowVlan, cmdShowMacAddressTable,
  cmdShowSpanningTree, cmdShowSpanningTreeInterface,
  cmdShowEtherchannel, cmdShowArp, cmdShowPortSecurity,
  cmdShowVtpStatus, cmdShowVtpPassword, cmdShowMacStatic,
  cmdShowCdpNeighbors, cmdShowCdp, cmdShowLldp,
} from './showSwitchingDisplay';

import {
  cmdShowIpRoute, cmdShowIpv6Route, cmdShowIpOspf,
  cmdShowIpOspfNeighbor, cmdShowIpOspfDatabase,
  cmdShowIpOspfInterface, cmdShowIpProtocols,
  cmdShowStandby, cmdShowHosts,
  cmdShowIpNatTranslations, cmdShowIpNatStatistics,
  cmdShowIpDhcpPool, cmdShowIpDhcpBinding,
  cmdShowIpv6DhcpPool, cmdShowIpDhcpSnooping,
  cmdShowIpSourceBinding, cmdShowIpVerifySource,
  cmdShowIpArpInspection,
  cmdShowIpEigrpNeighbors, cmdShowIpEigrpInterfaces, cmdShowIpBgpSummary,
  cmdShowIpBgp, cmdShowIpBgpNeighbors, cmdShowIpv6Rip, cmdShowIpv6Ospf,
  cmdShowVrrp, cmdShowVrrpBrief, cmdShowIpv6AccessList,
  cmdShowPrefixList, cmdShowRouteMap, cmdShowIpv6EigrpNeighbors, cmdShowIpv6EigrpTopology, cmdShowIpv6EigrpInterfaces,
  cmdShowGlbp, cmdShowIpFlowExport, cmdShowIpCacheFlow, cmdShowIpv6Neighbors,
  cmdShowFlowRecord, cmdShowFlowExporter, cmdShowFlowMonitor,
  cmdShowIpv6DhcpBinding, cmdShowPppoeSession, cmdShowCaller,
  cmdShowTrack, cmdShowIpSlaSummary, cmdShowIpSlaConfiguration,
  cmdShowVrf, cmdShowMpls,
  cmdShowIpCef,
} from './showRoutingDisplay';

import {
  cmdShowCryptoIsakmpSa, cmdShowCryptoIpsecSa, cmdShowCryptoMap,
} from './cryptoCommands';

import {
  cmdShowVlanPrivateVlan, cmdShowInterfacesBackup, cmdShowLisp, cmdShowControlPlane,
  cmdShowNveInterface, cmdShowEvpn,
} from './showServicesDisplay';

import { cmdShowNetworkHealth } from './show/showHealthDisplay';
import {
  cmdShowMlsQos, cmdShowPolicyMap, cmdShowPolicyMapInterface,
  cmdShowQosInterface, cmdShowQueuingInterface, cmdShowClassMap,
} from './show/showQosDisplay';
import {
  cmdShowAccessLists, cmdShowMacAcl, cmdShowAuth, cmdShowSsh,
} from './show/showSecurityDisplay';
import {
  cmdShowHistory, cmdShowUsers, cmdShowEnvironment, cmdShowInventory,
  cmdShowErrdisableRecovery, cmdShowStormControl, cmdShowUdld,
  cmdShowMonitor, cmdShowDebug, cmdShowProcesses, cmdShowMemory,
  cmdShowSdmPrefer, cmdShowSystemMtu, cmdShowSessions, cmdShowSnmp,
  cmdShowSnmpGroup, cmdShowSnmpUser,
  cmdShowDiag, cmdShowPrivilege, cmdShowBannerMotd, cmdShowAlias,
  cmdShowRedundancy, cmdShowArchive, cmdShowLogging,
} from './show/showMiscDisplay';
import {
  cmdShowIpMroute,
  cmdShowIpPimInterface,
  cmdShowIpPimNeighbor,
  cmdShowIpIgmpGroups
} from './multicastCommands';
import { cmdShowIpInspect } from './cbacCommands';
import { cmdShowEventManager, cmdShowNetconfYang } from './eemCommands';

export { cmdShowNtp } from './show/showNtpDisplay';

function cmdShowIpSlaStatistics(state: SwitchState): CommandResult {
  return { success: true, output: formatIpSlaStatistics(state.ipSlaOperations) };
}

function cmdShowRunningConfig(
  state: SwitchState,
  input: string,
  ctx: CommandContext
): CommandResult {
  return cmdShowRunningConfigSystem(state, input, ctx, buildRunningConfig, cmdShowRunningConfigInterface);
}

function cmdShowRunningConfigInterface(
  state: SwitchState,
  input: string,
  _ctx: CommandContext
): CommandResult {
  const match = input.match(/show\s+(?:running-config|run|running)\s+interface\s+(\S+)/i);
  const interfaceName = match?.[1];

  if (!interfaceName) {
    return { success: false, error: '% Incomplete command.' };
  }

  const normalized = interfaceName.toLowerCase();
  const port = state.ports?.[normalized];

  if (!port) {
    return { success: false, error: `% Interface ${interfaceName} not found` };
  }

  const lines = buildRunningConfig(state);
  const interfaceLines: string[] = [];
  let inInterface = false;

  for (const line of lines) {
    if (line.toLowerCase().startsWith('interface ') && line.toLowerCase().includes(normalized)) {
      inInterface = true;
      interfaceLines.push(line);
    } else if (inInterface) {
      if (line === '!') {
        inInterface = false;
        interfaceLines.push(line);
        break;
      }
      interfaceLines.push(line);
    }
  }

  if (interfaceLines.length === 0) {
    return { success: true, output: '\n% Interface configuration not found\n' };
  }

  return { success: true, output: '\nBuilding configuration...\n\n' + interfaceLines.join('\n') + '\n' };
}

function cmdShowParent(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: false, error: CLI_ERRORS.incomplete };
}

export { cmdShowLogging, cmdShowNetworkHealth, cmdShowMonitor };

export const showHandlers: Record<string, CommandHandler> = {
  'show network health': cmdShowNetworkHealth,
  'show health': cmdShowNetworkHealth,
  'show running-config': cmdShowRunningConfig,
  'show running-config interface': cmdShowRunningConfigInterface,
  'show startup-config': cmdShowStartupConfig,
  'show version': cmdShowVersion,
  'show logging': cmdShowLogging,
  'show interfaces': cmdShowInterfaces,
  'show interface': cmdShowInterface,
  'show interface trunk': cmdShowInterfaceTrunk,
  'show interfaces trunk': cmdShowInterfaceTrunk,
  'show ip interface brief': cmdShowIpInterfaceBrief,
  'show vlan brief': cmdShowVlan,
  'show vlan': cmdShowVlan,
  'show mac address-table': cmdShowMacAddressTable,
  'show cdp neighbors': cmdShowCdpNeighbors,
  'show ip route': cmdShowIpRoute,
  'show clock': cmdShowClock,
  'show flash': cmdShowFlash,
  'show boot': cmdShowBoot,
  'show spanning-tree': cmdShowSpanningTree,
  'show spanning-tree interface': cmdShowSpanningTreeInterface,
  'show port-security': cmdShowPortSecurity,
  'show wireless': cmdShowWireless,
  'show wlan summary': cmdShowWlanSummary,
  'show ap summary': cmdShowApSummary,
  'show ap config': cmdShowApConfig,
  'show ap join statistics': cmdShowApJoinStats,
  'show ap join stats': cmdShowApJoinStats,
  'show ssh': cmdShowSsh,
  'show ip ssh': cmdShowSsh,
  'show ip dhcp snooping': cmdShowIpDhcpSnooping,
  'show interfaces status': cmdShowInterfacesStatus,
  'show cdp': cmdShowCdp,
  'show lldp': cmdShowLldp,
  'show lldp neighbors': cmdShowLldp,
  'show vtp status': cmdShowVtpStatus,
  'show etherchannel': cmdShowEtherchannel,
  'show arp': cmdShowArp,
  'show ip arp': cmdShowArp,
  'show mls qos': cmdShowMlsQos,
  'show policy-map': cmdShowPolicyMap,
  'show policy-map interface': cmdShowPolicyMapInterface,
  'show qos interface': cmdShowQosInterface,
  'show queuing interface': cmdShowQueuingInterface,
  'show ip arp inspection': cmdShowIpArpInspection,
  'show access-lists': cmdShowAccessLists,
  'show history': cmdShowHistory,
  'show users': cmdShowUsers,
  'show environment': cmdShowEnvironment,
  'show inventory': cmdShowInventory,
  'show errdisable recovery': cmdShowErrdisableRecovery,
  'show errdisable detect': cmdShowErrdisableRecovery,
  'show storm-control': cmdShowStormControl,
  'show udld': cmdShowUdld,
  'show monitor': cmdShowMonitor,
  'show debugging': cmdShowDebug,
  'show processes': cmdShowProcesses,
  'show memory': cmdShowMemory,
  'show sdm prefer': cmdShowSdmPrefer,
  'show system mtu': cmdShowSystemMtu,
  'show ip dhcp pool': cmdShowIpDhcpPool,
  'show ip dhcp binding': cmdShowIpDhcpBinding,
  'show ip source binding': cmdShowIpSourceBinding,
  'show crypto isakmp sa': cmdShowCryptoIsakmpSa,
  'show crypto ipsec sa': cmdShowCryptoIpsecSa,
  'show crypto map': cmdShowCryptoMap,

  'show ip verify source': cmdShowIpVerifySource,
  'show': cmdShowParent,
  'show ip interface': cmdShowIpInterface,
  'show ipv6 route': cmdShowIpv6Route,
  'show ipv6 neighbors': cmdShowIpv6Neighbors,
  'show ipv6 interface brief': cmdShowIpv6InterfaceBrief,
  'show ipv6 dhcp pool': cmdShowIpv6DhcpPool,
  'show ipv6 dhcp binding': cmdShowIpv6DhcpBinding,
  'show pppoe session': cmdShowPppoeSession,
  'show pppoe summary': cmdShowPppoeSession,
  'show caller': cmdShowCaller,
  'show caller ip': cmdShowCaller,

  'show mac address-table static': cmdShowMacStatic,
  'show authentication': cmdShowAuth,
  'show sessions': cmdShowSessions,
  'show ntp associations': cmdShowNtpDisplay,
  'show ntp status': cmdShowNtpDisplay,
  'show ntp': cmdShowNtpDisplay,
  'show snmp': cmdShowSnmp,
  'show snmp group': cmdShowSnmpGroup,
  'show snmp user': cmdShowSnmpUser,
  'show class-map': cmdShowClassMap,
  'show mac access-lists': cmdShowMacAcl,
  'show controllers': cmdShowControllers,
  'show diagnostic': cmdShowDiag,
  'show privilege': cmdShowPrivilege,
  'show banner motd': cmdShowBannerMotd,
  'show alias': cmdShowAlias,
  'show redundancy': cmdShowRedundancy,
  'show archive': cmdShowArchive,
  'show ip protocols': cmdShowIpProtocols,
  'show ip ospf neighbor': cmdShowIpOspfNeighbor,
  'show ip ospf database': cmdShowIpOspfDatabase,
  'show ip ospf': cmdShowIpOspf,
  'show ip ospf interface': cmdShowIpOspfInterface,
  'show standby': cmdShowStandby,
  'show hosts': cmdShowHosts,
  'show ip mroute': cmdShowIpMroute,
  'show ip pim interface': cmdShowIpPimInterface,
  'show ip pim neighbor': cmdShowIpPimNeighbor,
  'show ip pim': cmdShowIpPimInterface,
  'show ip igmp groups': cmdShowIpIgmpGroups,
  'show ip igmp interface': cmdShowIpPimInterface,
  'show ip nat translations': cmdShowIpNatTranslations,
  'show ip nat statistics': cmdShowIpNatStatistics,
  'show ip sla statistics': cmdShowIpSlaStatistics,
  'show ip sla summary': cmdShowIpSlaSummary,
  'show ip sla configuration': cmdShowIpSlaConfiguration,
  'show ip sla application': cmdShowIpSlaConfiguration,
  'show ip sla responder': (state) => ({
    success: true,
    output: state.ipSlaResponder ? 'IP SLA Responder is: Enabled' : 'IP SLA Responder is: Disabled'
  }),
  'show ip inspect config': cmdShowIpInspect,
  'show ip inspect interfaces': cmdShowIpInspect,
  'show ip inspect': cmdShowIpInspect,
  'show track': cmdShowTrack,

  'show nameif': cmdShowNameif,
  'show ip access-group': cmdShowIpAccessGroup,
  'show dot11 associations': cmdShowDot11Associations,
  'show dot11 statistics': cmdShowDot11Statistics,
  'show wlan': cmdShowWlan,
  'show vtp password': cmdShowVtpPassword,
  'show ip eigrp': cmdShowIpEigrpNeighbors,
  'show ip eigrp neighbors': cmdShowIpEigrpNeighbors,
  'show ip eigrp interfaces': cmdShowIpEigrpInterfaces,
  'show ip bgp summary': cmdShowIpBgpSummary,
  'show ip bgp': cmdShowIpBgp,
  'show ip bgp neighbors': cmdShowIpBgpNeighbors,
  'show ipv6 rip': cmdShowIpv6Rip,
  'show ipv6 ospf': cmdShowIpv6Ospf,
  'show vrrp': cmdShowVrrp,
  'show vrrp brief': cmdShowVrrpBrief,
  'show ipv6 access-list': cmdShowIpv6AccessList,
  'show ipv6 access-lists': cmdShowIpv6AccessList,
  'show ip prefix-list': cmdShowPrefixList,
  'show ipv6 prefix-list': cmdShowPrefixList,
  'show route-map': cmdShowRouteMap,
  'show vrf': cmdShowVrf,
  'show vrf brief': cmdShowVrf,
  'show mpls': cmdShowMpls,
  'show mpls ip': cmdShowMpls,
  'show mpls ldp neighbor': cmdShowMpls,
  'show mpls ldp discovery': cmdShowMpls,
  'show mpls forwarding-table': cmdShowMpls,
  'show mpls bindings': cmdShowMpls,
  'show vlan private-vlan': cmdShowVlanPrivateVlan,
  'show interfaces backup': cmdShowInterfacesBackup,
  'show nve interface': cmdShowNveInterface,
  'show evpn': cmdShowEvpn,
  'show evpn mac': cmdShowEvpn,
  'show evpn neighbor': cmdShowEvpn,
  'show ipv6 eigrp neighbors': cmdShowIpv6EigrpNeighbors,
  'show ipv6 eigrp topology': cmdShowIpv6EigrpTopology,
  'show ipv6 eigrp interfaces': cmdShowIpv6EigrpInterfaces,

  'show glbp': cmdShowGlbp,
  'show glbp brief': cmdShowGlbp,
  'show ip flow export': cmdShowIpFlowExport,
  'show ip cache flow': cmdShowIpCacheFlow,
  'show lisp': cmdShowLisp,
  'show control-plane': cmdShowControlPlane,
  'show flow record': cmdShowFlowRecord,
  'show flow exporter': cmdShowFlowExporter,
  'show flow monitor': cmdShowFlowMonitor,
  'show event manager applet all': cmdShowEventManager,
  'show event manager': cmdShowEventManager,
  'show netconf-yang status': cmdShowNetconfYang,
  'show netconf-yang': cmdShowNetconfYang,
  'show interfaces counters': cmdShowInterfacesCounters,
  'show interfaces counters errors': cmdShowInterfacesCounters,
  'show ip cef': cmdShowIpCef,
  'show ip cef detail': cmdShowIpCef,
  'show ip dhcp snooping statistics': cmdShowIpDhcpSnooping,
};

import { cmdShowNtp as cmdShowNtpDisplay } from './show/showNtpDisplay';
