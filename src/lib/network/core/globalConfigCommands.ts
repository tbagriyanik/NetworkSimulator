'use client';
import { IOS_ERRORS, iosModeError } from './iosErrors';

import type { CommandHandler } from './commandTypes';
import { buildRunningConfig } from './configBuilder';
import { canAssignIPToPhysicalPort, isLayer3Switch } from '../switchModels';
import { encryptMd5Password, encryptType7Password } from '../crypto';
import { calculatePVST } from './showCommands';
import { getDeviceCapabilities } from '../capabilities';
import {
  validateIpRoutingSupport,
  validateIpRoutingEnabled,
  getIpAddressPurpose,
  validateL3SwitchPrerequisites
} from './L3Validation';

// Global config (hostname, vlan, vtp, spanning-tree, security, ip domain-name, etc.)

export const globalConfigHandlers: Record<string, CommandHandler> = {
  'hostname': cmdHostname,
  'vlan': cmdVlan,
  'no vlan': cmdNoVlan,
  'name': cmdVlanName,
  'state': cmdVlanState,
  'vtp mode': cmdVtpMode,
  'vtp domain': cmdVtpDomain,
  'spanning-tree mode': cmdSpanningTreeMode,
  'spanning-tree vlan': cmdSpanningTreeVlan,
  'spanning-tree portfast': cmdSpanningTreePortfastDefault,
  'no spanning-tree': cmdNoSpanningTree,
  'service password-encryption': cmdServicePasswordEncryption,
  'no service password-encryption': cmdNoServicePasswordEncryption,
  'enable secret': cmdEnableSecret,
  'no enable secret': cmdNoEnableSecret,
  'enable password': cmdEnablePassword,
  'no enable password': cmdNoEnablePassword,
  'banner motd': cmdBannerMotd,
  'no banner motd': cmdNoBannerMotd,
  'banner login': cmdBannerLogin,
  'no banner login': cmdNoBannerLogin,
  'banner exec': cmdBannerExec,
  'no banner exec': cmdNoBannerExec,
  'ip default-gateway': cmdIpDefaultGateway,
  'no ip default-gateway': cmdNoIpDefaultGateway,
  'ip domain-name': cmdIpDomainName,
  'ip domain lookup': cmdIpDomainLookup,
  'ip domain-lookup': cmdIpDomainLookup,
  'no ip domain-lookup': cmdNoIpDomainLookup,
  'ip routing': cmdIpRouting,
  'no ip routing': cmdNoIpRouting,
  'ip route': cmdIpRoute,
  'no ip route': cmdNoIpRoute,
  'ip ssh time-out': cmdIpSshTimeOut,
  'no ip ssh time-out': cmdNoIpSshTimeOut,
  'ip dhcp snooping': cmdIpDhcpSnooping,
  'no ip dhcp snooping': cmdNoIpDhcpSnooping,
  'mls qos': cmdMlsQos,
  'no mls qos': cmdNoMlsQos,
  'cdp run': cmdCdpRun,
  'no cdp run': cmdNoCdpRun,
  'username': cmdUsername,
  'no username': cmdNoUsername,
  // 'interface' command handler is in interfaceCommands.ts for proper port validation
  // We handle VLAN interfaces here
  'no interface': cmdNoInterface,
  // Routing protocols
  'router rip': cmdRouterRip,
  'router ospf': cmdRouterOspf,
  'router eigrp': cmdRouterEigrp,
  'router bgp': cmdRouterBgp,
  'no router rip': cmdNoRouterRip,
  'no router ospf': cmdNoRouterOspf,
  'no router eigrp': cmdNoRouterEigrp,
  'no router bgp': cmdNoRouterBgp,
  // HTTP Server
  'ip http server': cmdIpHttpServer,
  'no ip http server': cmdNoIpHttpServer,
  // SSH version
  'ip ssh version': cmdIpSshVersion,
  'ip dhcp snooping vlan': cmdIpDhcpSnoopingVlan,
  'ip arp inspection': cmdIpArpInspection,
  'errdisable recovery': cmdErrdisableRecovery,
  'errdisable recovery cause': cmdErrdisableRecovery,
  'vtp password': cmdVtpPassword,
  'ntp server': cmdNtpServer,
  'clock timezone': cmdClockTimezone,
  'ip name-server': cmdIpNameServer,
  'system mtu': cmdSystemMtu,
  'sdm prefer': cmdSdmPrefer,
  'ipv6 unicast-routing': cmdIpv6UnicastRouting,
  'no ipv6 unicast-routing': cmdNoIpv6UnicastRouting,
  'ipv6 route': cmdIpv6Route,
  'no ipv6 route': cmdNoIpv6Route,
  'ipv6 router rip': cmdIpv6RouterRip,
  'ipv6 router ospf': cmdIpv6RouterOspf,
  'no ipv6 router rip': cmdNoIpv6RouterRip,
  'no ipv6 router ospf': cmdNoIpv6RouterOspf,
  'ip ssh authentication-retries': cmdIpSshAuthRetries,
  'crypto key generate rsa': cmdCryptoKeyGenerateRsa,
  'ip dhcp pool': cmdIpDhcpPool,
  'no ip dhcp pool': cmdNoIpDhcpPool,
  'ipv6 dhcp pool': cmdIpv6DhcpPool,
  'ip dhcp excluded-address': cmdIpDhcpExcludedAddress,
  'no ip dhcp excluded-address': cmdNoIpDhcpExcludedAddress,
  'cdp timer': cmdStubSuccess,
  'cdp holdtime': cmdStubSuccess,
  'snmp-server community': cmdStubSuccess,
  'snmp-server contact': cmdStubSuccess,
  'snmp-server location': cmdStubSuccess,
  'archive': cmdStubSuccess,
  'alias': cmdAliasExec,
  'no alias': cmdNoAliasExec,
  'macro': cmdStubSuccess,
  'default interface': cmdStubSuccess,
  'configure replace': cmdStubSuccess,
  'mac access-list': cmdStubSuccess,
  'class-map': cmdStubSuccess,
  'policy-map': cmdStubSuccess,
  'template': cmdStubSuccess,
  'ip access-list': cmdIpAccessList,
  'no ip access-list': cmdNoIpAccessList,
  'ip host': cmdIpHost,
  'no ip host': cmdNoIpHost,
  'no ipv6 dhcp pool': cmdNoIpv6DhcpPool,
  'iot sensor': cmdIotSensor,
  'iot name': cmdIotName,
  'iot wifi': cmdIotWifi,
  'ip nat pool': cmdIpNatPool,
  'ip nat inside source static': cmdIpNatInsideSourceStatic,
  'ip nat inside source list': cmdIpNatInsideSourceList,
};

/**
 * Hostname - Set device hostname
 */
function cmdHostname(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^hostname\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid hostname command' };
  }

  return {
    success: true,
    newState: { hostname: match[1] }
  };
}

/**
 * IP Routing - Enable IP routing
 */
function cmdIpRouting(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // Validate IP routing support with comprehensive checks
  const validation = validateIpRoutingSupport(state.switchModel, state);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check device capabilities as backup
  const currentDevice = ctx.devices?.find((d: any) => d.id === ctx.sourceDeviceId);
  const capabilities = getDeviceCapabilities(currentDevice || null, state.switchModel);
  if (!capabilities.routing) {
    const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support IP routing.\nIP routing is only supported on routers and Layer 3 switches.`
    };
  }

  let output = 'IP routing enabled\n';
  const newState: any = { ipRouting: true };

  // If sdm prefer was configured, show helpful message
  if (state.sdmPreferConfigured) {
    output += 'SDM preference configuration is active. Routing table has been allocated.\n';
  }

  return {
    success: true,
    output,
    newState
  };
}

/**
 * IP Route - Add static route
 */
function cmdIpRoute(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // Check if device supports routing (router or L3 switch)
  const currentDevice = ctx.devices?.find((d: any) => d.id === ctx.sourceDeviceId);
  const capabilities = getDeviceCapabilities(currentDevice || null, state.switchModel);
  if (!capabilities.routing) {
    const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support static routing.\nStatic routing is only supported on routers and Layer 3 switches.`
    };
  }

  const match = input.match(/^ip\s+route\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+|\S+)(?:\s+(\d+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid ip route command. Use: ip route <network> <mask> <next-hop|interface> [administrative-distance]' };
  }

  const [, network, mask, nextHop, adminDistance] = match;
  const metric = adminDistance ? parseInt(adminDistance, 10) : 1;

  const newStaticRoutes = [...(state.staticRoutes || [])];
  // Remove existing route to same destination if exists
  const filteredRoutes = newStaticRoutes.filter(
    (route: any) => !(route.destination === network && route.subnetMask === mask)
  );
  filteredRoutes.push({ destination: network, subnetMask: mask, nextHop, metric, type: 'static' });

  return {
    success: true,
    newState: {
      staticRoutes: filteredRoutes,
      ipRouting: true
    }
  };
}

/**
 * no ip host <name>
 */
function cmdNoIpHost(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^no\s+ip\s+host\s+(\S+)(?:\s+[0-9.]+)?$/i);
  if (!match) return { success: false, error: '% Invalid no ip host command' };

  const hostName = match[1];
  const services = { ...state.services };
  if (services.dns && services.dns.records) {
    services.dns.records = services.dns.records.filter((r: any) => r.domain !== hostName);
  }

  const updatedState = { ...state, services };
  return { success: true, newState: { services, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * no ipv6 dhcp pool <name>
 */
function cmdNoIpv6DhcpPool(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^no\s+ipv6\s+dhcp\s+pool\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no ipv6 dhcp pool command' };

  const poolName = match[1];
  const pools = { ...(state.ipv6DhcpPools || {}) };
  if (!pools[poolName]) return { success: false, error: `% DHCP pool ${poolName} not found` };
  delete pools[poolName];

  const updatedState = { ...state, ipv6DhcpPools: pools };
  return { success: true, newState: { ipv6DhcpPools: pools, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * Router EIGRP - Enable EIGRP routing
 */
function cmdRouterEigrp(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
  if (state.deviceType !== 'router' && !canAssignIPToPhysicalPort(state.switchModel)) {
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support routing protocols.`
    };
  }

  const match = input.match(/^router\s+eigrp\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: IOS_ERRORS.incomplete };
  }

  const asNumber = match[1];
  return {
    success: true,
    output: `EIGRP Routing Process enabled with AS ${asNumber}`,
    newState: {
      routingProtocol: 'eigrp',
      ipRouting: true,
      eigrpAs: asNumber,
      currentMode: 'router-config'
    }
  };
}

/**
 * No Router EIGRP
 */
function cmdNoRouterEigrp(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+router\s+eigrp\s+(\d+)$/i);
  if (!match) return { success: false, error: IOS_ERRORS.incomplete };

  return {
    success: true,
    output: 'EIGRP Routing Protocol disabled',
    newState: {
      routingProtocol: 'none',
      dynamicRoutes: [],
      eigrpAs: undefined
    }
  };
}

/**
 * Router BGP - Enable BGP routing
 */
function cmdRouterBgp(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
  if (!canAssignIPToPhysicalPort(state.switchModel)) {
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support routing protocols.`
    };
  }

  const match = input.match(/^router\s+bgp\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: IOS_ERRORS.incomplete };
  }

  const asNumber = match[1];
  return {
    success: true,
    output: `BGP Routing Process enabled with AS ${asNumber}`,
    newState: {
      routingProtocol: 'bgp',
      ipRouting: true,
      bgpAs: asNumber,
      currentMode: 'router-config'
    }
  };
}

/**
 * No Router BGP
 */
function cmdNoRouterBgp(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+router\s+bgp\s+(\d+)$/i);
  if (!match) return { success: false, error: IOS_ERRORS.incomplete };

  return {
    success: true,
    output: 'BGP Routing Protocol disabled',
    newState: {
      routingProtocol: 'none',
      dynamicRoutes: [],
      bgpAs: undefined
    }
  };
}

/**
 * No IP Route - Remove static route
 */
function cmdNoIpRoute(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // Check if device supports routing (router or L3 switch)
  const currentDevice = ctx.devices?.find((d: any) => d.id === ctx.sourceDeviceId);
  const capabilities = getDeviceCapabilities(currentDevice || null, state.switchModel);
  if (!capabilities.routing) {
    const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support static routing.\nStatic routing is only supported on routers and Layer 3 switches.`
    };
  }

  const match = input.match(/^no\s+ip\s+route\s+([0-9.]+)\s+([0-9.]+)(?:\s+([0-9.]+|\S+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid no ip route command' };
  }

  const [, network, mask, nextHop] = match;

  let newStaticRoutes;
  if (nextHop) {
    // Remove specific route
    newStaticRoutes = (state.staticRoutes || []).filter(
      (route: any) => !(route.destination === network && route.subnetMask === mask && route.nextHop === nextHop)
    );
  } else {
    // Remove all routes for this network/mask
    newStaticRoutes = (state.staticRoutes || []).filter(
      (route: any) => !(route.destination === network && route.subnetMask === mask)
    );
  }

  return {
    success: true,
    newState: { staticRoutes: newStaticRoutes }
  };
}

/**
 * IP SSH Time-Out
 */
function cmdIpSshTimeOut(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ip\s+ssh\s+time-out\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid SSH time-out command' };
  }

  return {
    success: true,
    newState: { sshTimeOut: parseInt(match[1]) }
  };
}

/**
 * IP DHCP Snooping - Enable DHCP snooping
 */
function cmdIpDhcpSnooping(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { dhcpSnoopingEnabled: true }
  };
}

/**
 * MLS QoS - Enable MLS QoS
 */
function cmdMlsQos(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { mlsQosEnabled: true }
  };
}

/**
 * Username - Create username
 */
function cmdUsername(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^username\s+(\S+)(\s+(privilege\s+(\d+)|password|secret)\s+(.+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid username command' };
  }

  const username = match[1];
  const privilege = match[4] ? parseInt(match[4]) : 0;
  const password = match[5] || '';
  const currentUsers = Array.isArray(state.security?.users) ? state.security.users : [];
  const normalizedUsername = username.toLowerCase();
  const newUsers = currentUsers.filter((user: any) => (user?.username || '').toLowerCase() !== normalizedUsername);
  newUsers.push({
    username,
    password,
    privilege
  });

  return {
    success: true,
    newState: {
      security: {
        ...state.security,
        users: newUsers
      }
    }
  };
}

/**
 * Normalize interface name to the short key used in state.ports
 * e.g. "FastEthernet 0/1" -> "fa0/1"
 *      "GigabitEthernet0/0" -> "gi0/0"
 *      "fastethernet0/1" -> "fa0/1"
 */
function normalizeInterfaceName(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (s.startsWith('gigabitethernet')) return 'gi' + s.slice('gigabitethernet'.length);
  if (s.startsWith('fastethernet')) return 'fa' + s.slice('fastethernet'.length);
  if (s.startsWith('ethernet')) return 'e' + s.slice('ethernet'.length);
  if (s.startsWith('port-channel')) return 'po' + s.slice('port-channel'.length);
  // already short (gi0/0, fa0/1, wlan0, vlan1 …)
  return s;
}

/**
 * Interface - Enter interface configuration
 * Note: Physical interfaces are handled by interfaceCommands.ts to validate port existence
 * Only VLAN interface handling is here
 */
function cmdInterface(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^interface\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid interface command' };
  }

  const iface = match[1].trim().toLowerCase();

  // Only handle VLAN interfaces here - physical interfaces handled by interfaceCommands.ts
  if (iface.startsWith('vlan')) {
    const vlanMatch = iface.match(/^vlan\s+(\d+)$/i);
    if (!vlanMatch) {
      return { success: false, error: '% Invalid VLAN interface' };
    }
    const vlanId = vlanMatch[1];
    const vlanIdNum = parseInt(vlanId, 10);
    const vlanPortId = `vlan${vlanIdNum}`;
    const newVlans = { ...state.vlans };
    const newPorts = { ...state.ports };
    if (!newVlans[vlanId]) {
      newVlans[vlanId] = {
        id: vlanIdNum,
        name: `VLAN${vlanId}`,
        status: 'active',
        ports: []
      };
    }
    if (!newPorts[vlanPortId]) {
      newPorts[vlanPortId] = {
        id: vlanPortId,
        name: `Vlan${vlanIdNum}`,
        type: 'vlan',
        vlan: vlanIdNum,
        status: 'up',
        shutdown: false,
        mode: 'routed'
      };
    }
    return {
      success: true,
      newState: {
        vlans: newVlans,
        ports: newPorts,
        currentMode: 'interface',
        currentInterface: vlanPortId
      }
    };
  }

  // Non-VLAN interfaces are handled by interfaceCommands.ts
  // This should not be reached since 'interface' is in interfaceHandlers
  return { success: false, error: '% Interface command not found' };
}

/**
 * VLAN - Create/enter VLAN configuration
 */
function cmdVlan(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN ID' };
  }

  const vlanId = match[1];
  const newVlans = { ...state.vlans };

  if (!newVlans[vlanId]) {
    newVlans[vlanId] = {
      id: parseInt(vlanId, 10),
      name: `VLAN${vlanId}`,
      status: 'active',
      ports: []
    };
  }

  const shouldBumpVtp = (state.vtpMode === 'server') && !!state.vtpDomain;
  const nextVtpRevision = shouldBumpVtp ? ((state.vtpRevision || 0) + 1) : state.vtpRevision;

  const updatedCurrentState = {
    ...state,
    vlans: newVlans,
    vtpRevision: nextVtpRevision,
    currentMode: 'vlan' as const,
    currentVlan: vlanId
  };

  const allUpdatedStates = calculatePVST(updatedCurrentState, ctx, ctx.sourceDeviceId);
  const myUpdatedState = allUpdatedStates.get(ctx.sourceDeviceId);

  return {
    success: true,
    newState: myUpdatedState || updatedCurrentState,
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * No VLAN - Delete VLAN
 */
function cmdNoVlan(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN ID' };
  }

  const vlanId = match[1];

  if (vlanId === '1') {
    return { success: false, error: '% Cannot remove VLAN 1.' };
  }

  const newVlans = { ...state.vlans };

  if (!newVlans[vlanId]) {
    return { success: false, error: `% VLAN ${vlanId} does not exist` };
  }

  delete newVlans[vlanId];

  const shouldBumpVtp = (state.vtpMode === 'server') && !!state.vtpDomain;
  const nextVtpRevision = shouldBumpVtp ? ((state.vtpRevision || 0) + 1) : state.vtpRevision;

  const updatedCurrentState = {
    ...state,
    vlans: newVlans,
    vtpRevision: nextVtpRevision,
  };

  const allUpdatedStates = calculatePVST(updatedCurrentState, ctx, ctx.sourceDeviceId);
  const myUpdatedState = allUpdatedStates.get(ctx.sourceDeviceId);

  return {
    success: true,
    newState: myUpdatedState || updatedCurrentState,
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * VLAN Name
 */
function cmdVlanName(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'vlan' || state.currentVlan == null) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^name\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN name command' };
  }

  const vlanId = String(state.currentVlan);
  const vlan = state.vlans?.[vlanId];
  if (!vlan) {
    return { success: false, error: '% VLAN not found' };
  }

  const shouldBumpVtp = (state.vtpMode === 'server') && !!state.vtpDomain;
  const nextVtpRevision = shouldBumpVtp ? ((state.vtpRevision || 0) + 1) : state.vtpRevision;

  return {
    success: true,
    newState: {
      vlans: {
        ...state.vlans,
        [vlanId]: {
          ...vlan,
          name: match[1]
        }
      },
      vtpRevision: nextVtpRevision,
    }
  };
}

/**
 * VLAN State
 */
function cmdVlanState(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'vlan' || state.currentVlan == null) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^state\s+(active|suspend)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN state command' };
  }

  const vlanId = String(state.currentVlan);
  const vlan = state.vlans?.[vlanId];
  if (!vlan) {
    return { success: false, error: '% VLAN not found' };
  }

  const shouldBumpVtp = (state.vtpMode === 'server') && !!state.vtpDomain;
  const nextVtpRevision = shouldBumpVtp ? ((state.vtpRevision || 0) + 1) : state.vtpRevision;

  return {
    success: true,
    newState: {
      vlans: {
        ...state.vlans,
        [vlanId]: {
          ...vlan,
          status: match[1].toLowerCase()
        }
      },
      vtpRevision: nextVtpRevision,
    }
  };
}

/**
 * VTP Mode
 */
function cmdVtpMode(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^vtp\s+mode\s+(server|client|transparent)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VTP mode' };
  }

  return {
    success: true,
    newState: { vtpMode: match[1].toLowerCase() }
  };
}

/**
 * VTP Domain
 */
function cmdVtpDomain(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^vtp\s+domain\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VTP domain command' };
  }

  return {
    success: true,
    newState: { vtpDomain: match[1] }
  };
}

/**
 * Spanning-Tree Mode
 */
function cmdSpanningTreeMode(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^spanning-tree\s+mode\s+(pvst|rapid-pvst|mst)$/i);
  if (!match) {
    return { success: false, error: '% Invalid spanning-tree mode' };
  }

  return {
    success: true,
    newState: {
      spanningTree: {
        ...state.spanningTree,
        mode: match[1].toLowerCase()
      }
    }
  };
}

/**
 * Service Password-Encryption
 */
function cmdServicePasswordEncryption(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: {
      security: {
        ...state.security,
        servicePasswordEncryption: true
      }
    }
  };
}

/**
 * No Service Password-Encryption
 */
function cmdNoServicePasswordEncryption(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: {
      security: {
        ...state.security,
        servicePasswordEncryption: false
      }
    }
  };
}

/**
 * Enable Secret
 */
function cmdEnableSecret(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^enable\s+secret\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid enable secret command' };
  }

  const password = match[1];
  const encryptedPassword = encryptMd5Password(password);

  return {
    success: true,
    newState: {
      security: {
        ...state.security,
        enableSecret: encryptedPassword,
        enableSecretEncrypted: true
      }
    }
  };
}

/**
 * Enable Password
 */
function cmdEnablePassword(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^enable\s+password\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid enable password command' };
  }

  const password = match[1];
  // Encrypt with Type 7 if service password encryption is enabled
  const encryptedPassword = state.security?.servicePasswordEncryption
    ? encryptType7Password(password)
    : password;

  return {
    success: true,
    newState: {
      security: {
        ...state.security,
        enablePassword: encryptedPassword
      }
    }
  };
}

/**
 * No Enable Secret
 */
function cmdNoEnableSecret(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const newSecurity = { ...state.security };
  delete newSecurity.enableSecret;
  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * No Enable Password
 */
function cmdNoEnablePassword(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const newSecurity = { ...state.security };
  delete newSecurity.enablePassword;
  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * Banner MOTD
 */
function cmdBannerMotd(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^banner\s+motd\s+(.)([\s\S]*?)\1\s*$/i);
  if (!match) {
    return { success: false, error: '% Invalid banner command. Use: banner motd #message#' };
  }

  return {
    success: true,
    newState: { bannerMOTD: match[2] }
  };
}

/**
 * No Banner MOTD
 */
function cmdNoBannerMotd(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { bannerMOTD: undefined }
  };
}

/**
 * Banner Login
 */
function cmdBannerLogin(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^banner\s+login\s+(.)([\s\S]*?)\1\s*$/i);
  if (!match) {
    return { success: false, error: '% Invalid banner command. Use: banner login #message#' };
  }

  return {
    success: true,
    newState: { bannerLogin: match[2] }
  };
}

/**
 * No Banner Login
 */
function cmdNoBannerLogin(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { bannerLogin: undefined }
  };
}

/**
 * Banner Exec
 */
function cmdBannerExec(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^banner\s+exec\s+(.)([\s\S]*?)\1\s*$/i);
  if (!match) {
    return { success: false, error: '% Invalid banner command. Use: banner exec #message#' };
  }

  return {
    success: true,
    newState: { bannerExec: match[2] }
  };
}

/**
 * No Banner Exec
 */
function cmdNoBannerExec(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { bannerExec: undefined }
  };
}

/**
 * IP Default-Gateway
 */
function cmdIpDefaultGateway(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ip\s+default-gateway\s+([0-9.]+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid default-gateway command' };
  }

  return {
    success: true,
    newState: { defaultGateway: match[1] }
  };
}

/**
 * No IP Default-Gateway
 */
function cmdNoIpDefaultGateway(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { defaultGateway: undefined }
  };
}

/**
 * IP Domain-Name
 */
function cmdIpDomainName(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ip\s+domain-name\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid domain-name command' };
  }

  return {
    success: true,
    newState: { domainName: match[1] }
  };
}

/**
 * CDP Run
 */
function cmdCdpRun(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { cdpEnabled: true }
  };
}

/**
 * No CDP Run
 */
function cmdNoCdpRun(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { cdpEnabled: false }
  };
}

/**
 * Router RIP - Enable RIP routing
 */
function cmdRouterRip(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // Check if device supports routing (routers and L3 switches only)
  if (state.deviceType !== 'router' && !canAssignIPToPhysicalPort(state.switchModel)) {
    const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support routing protocols.\nRouting protocols are only supported on Layer 3 switches.`
    };
  }

  const lang = ctx.language || 'en';
  return {
    success: true,
    output: lang === 'tr' ?
      'RIP Routing Protocol etkinleştirildi' :
      'RIP Routing Protocol enabled',
    newState: {
      routingProtocol: 'rip',
      ipRouting: true,
      currentMode: 'router-config'
    }
  };
}

/**
 * Router OSPF - Enable OSPF routing
 */
function cmdRouterOspf(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // Check if device supports routing (routers and L3 switches only)
  if (state.deviceType !== 'router' && !canAssignIPToPhysicalPort(state.switchModel)) {
    const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support routing protocols.\nRouting protocols are only supported on Layer 3 switches.`
    };
  }

  // Parse OSPF process ID (optional)
  const match = input.match(/^router\s+ospf\s*(\d*)$/i);
  const processId = match?.[1] || '1';

  return {
    success: true,
    output: `OSPF Routing Process enabled with Process ID ${processId}`,
    newState: {
      routingProtocol: 'ospf',
      ipRouting: true,
      ospfProcessId: processId,
      currentMode: 'router-config'
    }
  };
}

/**
 * No Router RIP - Disable RIP routing
 */
function cmdNoRouterRip(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const lang = ctx.language || 'en';
  return {
    success: true,
    output: lang === 'tr' ?
      'RIP Routing Protocol devre dışı bırakıldı' :
      'RIP Routing Protocol disabled',
    newState: {
      routingProtocol: 'none',
      dynamicRoutes: []
    }
  };
}

/**
 * No Router OSPF - Disable OSPF routing
 */
function cmdNoRouterOspf(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const lang = ctx.language || 'en';
  return {
    success: true,
    output: lang === 'tr' ?
      'OSPF Routing Protocol devre dışı bırakıldı' :
      'OSPF Routing Protocol disabled',
    newState: {
      routingProtocol: 'none',
      dynamicRoutes: []
    }
  };
}

/**
 * IP HTTP Server - Enable HTTP server
 */
function cmdIpHttpServer(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const lang = ctx.language || 'en';
  const services = state.services || {};
  return {
    success: true,
    output: lang === 'tr' ?
      'HTTP sunucusu etkinleştirildi' :
      'HTTP server enabled',
    newState: {
      services: {
        ...services,
        http: {
          enabled: true,
          content: ''
        }
      }
    }
  };
}

/**
 * No IP HTTP Server - Disable HTTP server
 */
function cmdNoIpHttpServer(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const lang = ctx.language || 'en';
  const services = state.services || {};
  return {
    success: true,
    output: lang === 'tr' ?
      'HTTP sunucusu devre dışı bırakıldı' :
      'HTTP server disabled',
    newState: {
      services: {
        ...services,
        http: {
          enabled: false,
          content: ''
        }
      }
    }
  };
}

/**
 * No IP Domain Lookup - Disable domain lookup
 */
function cmdNoIpDomainLookup(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { domainLookup: false }
  };
}

/**
 * No IP Routing - Disable IP routing
 */
function cmdNoIpRouting(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { ipRouting: false }
  };
}

/**
 * No IP SSH Time-Out
 */
function cmdNoIpSshTimeOut(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { sshTimeOut: undefined }
  };
}

/**
 * No Spanning-Tree - Disable spanning-tree globally or per-VLAN
 */
function cmdNoSpanningTree(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const lang = ctx.language || 'en';

  // Check if it's a per-VLAN disable: no spanning-tree vlan <vlan-id>
  const vlanMatch = input.match(/^no\s+spanning-tree\s+vlan\s+(\d+)$/i);
  if (vlanMatch) {
    const vlanId = parseInt(vlanMatch[1]);
    const spanningTreeVlans = state.spanningTreeVlans || {};

    // Mark this VLAN as disabled for spanning-tree
    const updatedVlans = {
      ...spanningTreeVlans,
      [vlanId]: {
        ...spanningTreeVlans[vlanId],
        enabled: false
      }
    };

    const updatedCurrentState = {
      ...state,
      spanningTreeVlans: updatedVlans
    };

    const allUpdatedStates = calculatePVST(updatedCurrentState, ctx, ctx.sourceDeviceId);
    const myUpdatedState = allUpdatedStates.get(ctx.sourceDeviceId);

    return {
      success: true,
      output: lang === 'tr' ?
        `Spanning-tree VLAN ${vlanId} devre disi birakildi` :
        `Spanning-tree disabled on VLAN ${vlanId}`,
      newState: myUpdatedState || { spanningTreeVlans: updatedVlans },
      updatedDeviceStates: allUpdatedStates
    };
  }

  // Global spanning-tree disable
  return {
    success: true,
    output: lang === 'tr' ?
      'Spanning-tree global olarak devre disi birakildi' :
      'Spanning-tree disabled globally',
    newState: { spanningTreeEnabled: false }
  };
}

/**
 * No MLS QoS - Disable MLS QoS
 */
function cmdNoMlsQos(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { mlsQosEnabled: false }
  };
}

/**
 * No IP DHCP Snooping - Disable DHCP snooping
 */
function cmdNoIpDhcpSnooping(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { dhcpSnoopingEnabled: false }
  };
}

/**
 * No Username - Remove username
 */
function cmdNoUsername(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+username\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid username command' };
  }

  const username = match[1];
  const currentUsers = Array.isArray(state.security?.users) ? state.security.users : [];
  const newUsers = currentUsers.filter((user: any) => (user?.username || '').toLowerCase() !== username.toLowerCase());

  return {
    success: true,
    newState: {
      security: {
        ...state.security,
        users: newUsers
      }
    }
  };
}

/**
 * No Interface - Delete interface config (for VLAN interfaces)
 */
function cmdNoInterface(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+interface\s+vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid interface command' };
  }

  const vlanId = match[1];
  const newVlans = { ...state.vlans };

  if (!newVlans[vlanId]) {
    return { success: false, error: `% VLAN ${vlanId} does not exist` };
  }

  // Remove the VLAN interface (keep VLAN but remove IP)
  newVlans[vlanId] = {
    ...newVlans[vlanId],
    ipAddress: undefined,
    subnetMask: undefined
  };

  return {
    success: true,
    newState: { vlans: newVlans }
  };
}

/**
 * IP SSH Version - Set SSH version
 */
function cmdIpSshVersion(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ip\s+ssh\s+version\s+(1|2)$/i);
  if (!match) {
    return { success: false, error: '% Invalid ip ssh version command. Use: ip ssh version {1|2}' };
  }

  const version = parseInt(match[1]);
  return {
    success: true,
    output: `SSH version ${version} configured`,
    newState: { sshVersion: version }
  };
}

/**
 * IP DHCP Snooping VLAN
 */
function cmdIpDhcpSnoopingVlan(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^ip\s+dhcp\s+snooping\s+vlan\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };
  const vlans = match[1].split(',').map((v: string) => v.trim());
  return { success: true, output: `DHCP snooping enabled on VLAN(s): ${vlans.join(', ')}`, newState: { dhcpSnoopingVlans: vlans } };
}

/**
 * IP ARP Inspection VLAN
 */
function cmdIpArpInspection(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, output: 'ARP inspection configured', newState: { arpInspectionEnabled: true } };
}

/**
 * Spanning-Tree VLAN - Enable STP on VLAN or configure priority/root
 */
function cmdSpanningTreeVlan(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };

  const match = input.match(/^spanning-tree\s+vlan\s+(\d+)(?:\s+(priority|root)(?:\s+(primary|secondary|\d+))?)?$/i);
  if (!match) return { success: false, error: '% Invalid spanning-tree vlan command' };

  const vlanId = parseInt(match[1]);
  const subCommand = match[2]; // 'priority' or 'root' or undefined
  const value = match[3]; // priority value, 'primary', 'secondary', or undefined

  const lang = ctx.language || 'en';

  // Initialize spanningTreeVlans if not exists
  const spanningTreeVlans = state.spanningTreeVlans || {};

  // If just enabling STP on VLAN (no priority/root)
  if (!subCommand) {
    const updatedVlans = {
      ...spanningTreeVlans,
      [vlanId]: {
        ...spanningTreeVlans[vlanId],
        enabled: true
      }
    };

    return {
      success: true,
      output: lang === 'tr' ?
        `Spanning-tree VLAN ${vlanId} etkinlestirildi` :
        `Spanning-tree enabled on VLAN ${vlanId}`,
      newState: { spanningTreeVlans: updatedVlans }
    };
  }

  // Handle priority or root configuration
  if (subCommand === 'priority' && value) {
    const priorityValue = parseInt(value);
    const allowedPriorities = [0, 4096, 8192, 12288, 16384, 20480, 24576, 28672, 32768, 36864, 40960, 45056, 49152, 53248, 57344, 61440];
    if (!allowedPriorities.includes(priorityValue)) {
      const firstLine = allowedPriorities.slice(0, 8).map(v => String(v).padStart(6)).join(' ');
      const secondLine = allowedPriorities.slice(8).map(v => String(v).padStart(6)).join(' ');
      return {
        success: false,
        error: `% Bridge Priority must be in increments of 4096.\n% Allowed values are:\n  ${firstLine}\n  ${secondLine}`
      };
    }
  }

  // Convert root primary/secondary to priority values
  let finalValue = value;
  if (subCommand === 'root') {
    if (value === 'primary') {
      finalValue = '24576';
    } else if (value === 'secondary') {
      finalValue = '28672';
    } else if (!value) {
      finalValue = '24576'; // Default to primary if no value specified
    }
  } else if (subCommand === 'priority' && !value) {
    return { success: false, error: '% Incomplete command.' };
  }

  const updatedVlans = {
    ...spanningTreeVlans,
    [vlanId]: {
      ...spanningTreeVlans[vlanId],
      enabled: true,
      priority: subCommand === 'root' || subCommand === 'priority' ? finalValue : value
    }
  };

  const updatedCurrentState = {
    ...state,
    spanningTreeVlans: updatedVlans
  };

  const allUpdatedStates = calculatePVST(updatedCurrentState, ctx, ctx.sourceDeviceId);
  const myUpdatedState = allUpdatedStates.get(ctx.sourceDeviceId);

  return {
    success: true,
    output: lang === 'tr' ?
      `Spanning-tree VLAN ${vlanId} ${subCommand} yapılandırıldı` :
      `Spanning-tree VLAN ${vlanId} ${subCommand} configured`,
    newState: myUpdatedState || { spanningTreeVlans: updatedVlans },
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * Spanning-Tree Portfast (global)
 */
function cmdSpanningTreePortfastDefault(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, output: 'PortFast will be configured in all non-trunking ports', newState: { spanningTreePortfastDefault: true } };
}

/**
 * Errdisable Recovery
 */
function cmdErrdisableRecovery(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, output: 'Errdisable recovery configured' };
}

/**
 * VTP Password
 */
function cmdVtpPassword(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^vtp\s+password\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid vtp password command' };
  return { success: true, newState: { vtpPassword: match[1] } };
}

/**
 * NTP Server
 */
function cmdNtpServer(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^ntp\s+server\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ntp server command' };
  const servers = [...(state.ntpServers || [])];
  if (!servers.includes(match[1])) servers.push(match[1]);
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8);
  const nextServices = {
    ...state.services,
    ntp: {
      enabled: true,
      server: match[1],
      timezone: state.services?.ntp?.timezone || 'UTC',
      date,
      time,
      timeOffset: state.services?.ntp?.timeOffset || 0,
    },
  };

  const updatedState = {
    ...state,
    ntpServers: servers,
    services: nextServices
  };

  return {
    success: true,
    output: `NTP server ${match[1]} configured`,
    newState: {
      ntpServers: servers,
      services: nextServices,
      runningConfig: buildRunningConfig(updatedState)
    },
  };
}

/**
 * Clock Timezone
 */
function cmdClockTimezone(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^clock\s+timezone\s+(\S+)\s+([+-]?\d+)(?:\s+(\d+))?$/i);
  if (!match) return { success: false, error: '% Invalid clock timezone command' };
  return { success: true, output: `Timezone set to ${match[1]} UTC${match[2]}` };
}

/**
 * IP Name-Server
 */
function cmdIpNameServer(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^ip\s+name-server\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ip name-server command' };
  return { success: true, output: `Name server ${match[1]} configured`, newState: { dnsServer: match[1] } };
}

/**
 * IP Domain Lookup (re-enable)
 */
function cmdIpDomainLookup(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, newState: { domainLookup: true } };
}

/**
 * System MTU
 */
function cmdSystemMtu(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^system\s+mtu\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid system mtu command' };
  return { success: true, output: `Changes to the MTU will take effect after reload\nSystem MTU size is ${match[1]} bytes` };
}

/**
 * SDM Prefer
 */
function cmdSdmPrefer(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };

  const match = input.match(/^sdm\s+prefer\s+(\S+)(?:\s+(\S+))?/i);
  if (!match) {
    return {
      success: false,
      error: `% Invalid sdm prefer command.\nUsage: sdm prefer {lanbase-routing | lanbase | desktop | default}`
    };
  }

  const template = match[1].toLowerCase();
  const validTemplates = ['lanbase-routing', 'lanbase', 'desktop', 'default', 'routing'];

  if (!validTemplates.includes(template)) {
    return {
      success: false,
      error: `% Invalid template: ${template}\nValid templates: lanbase-routing, lanbase, desktop, default`
    };
  }

  // Check if this is an L3 switch
  if (!isLayer3Switch(state.switchModel)) {
    return {
      success: false,
      error: `% SDM preference is not supported on ${state.switchModel}\nSDM prefer is only available on Layer 3 switches`
    };
  }

  let output = '';
  let requiresReload = false;

  if (template === 'lanbase-routing' || template === 'routing') {
    output = `Changes to the SDM preferences will take effect after reload.\n`;
    output += `This template will configure: 16384 IPv4 ACL entries, 2048 QoS labels, 16384 IPv4 Multicast entries\n`;
    requiresReload = true;
  } else if (template === 'lanbase') {
    output = `Changes to the SDM preferences will take effect after reload.\n`;
    output += `This template will configure: 8192 IPv4 ACL entries, 2048 QoS labels, 2048 IPv4 Multicast entries\n`;
    requiresReload = true;
  } else if (template === 'desktop') {
    output = `Changes to the SDM preferences will take effect after reload.\n`;
    output += `This template will configure: 4096 IPv4 ACL entries, 512 QoS labels, 256 IPv4 Multicast entries\n`;
    requiresReload = true;
  } else {
    output = `Current SDM template is: ${template}\n`;
  }

  output += `\n% System needs to be reloaded for the new template to take effect.\n% Use 'reload' command to reboot the device.\n`;

  return {
    success: true,
    output,
    newState: {
      sdmPreferConfigured: true,
      sdmTemplate: template,
      reloaded: false  // Mark that reload is needed
    }
  };
}

/**
 * IPv6 Unicast-Routing
 */
function cmdIpv6UnicastRouting(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, newState: { ipv6Enabled: true } };
}

/**
 * No IPv6 Unicast-Routing
 */
function cmdNoIpv6UnicastRouting(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, newState: { ipv6Enabled: false } };
}

/**
 * IPv6 Route - Add static IPv6 route
 */
function cmdIpv6Route(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ipv6\s+route\s+([0-9a-fA-F:]+\/\d+)\s+(\S+)(?:\s+(\d+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid ipv6 route command' };
  }

  const [, prefix, nextHop, adminDistance] = match;
  const [destination, prefixLength] = prefix.split('/');
  const metric = adminDistance ? parseInt(adminDistance, 10) : 1;

  const newStaticRoutes = [...(state.ipv6StaticRoutes || [])];
  const filteredRoutes = newStaticRoutes.filter(
    (route: any) => !(route.destination === destination && route.prefixLength === parseInt(prefixLength))
  );
  filteredRoutes.push({
    destination,
    prefixLength: parseInt(prefixLength),
    nextHop,
    metric,
    type: 'static'
  });

  return {
    success: true,
    newState: {
      ipv6StaticRoutes: filteredRoutes,
      ipv6Enabled: true
    }
  };
}

/**
 * No IPv6 Route - Remove static IPv6 route
 */
function cmdNoIpv6Route(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+ipv6\s+route\s+([0-9a-fA-F:]+\/\d+)(?:\s+(\S+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid no ipv6 route command' };
  }

  const [, prefix, nextHop] = match;
  const [destination, prefixLength] = prefix.split('/');

  const newStaticRoutes = (state.ipv6StaticRoutes || []).filter(
    (route: any) => {
      const matchDest = route.destination === destination && route.prefixLength === parseInt(prefixLength);
      if (nextHop) {
        return !(matchDest && route.nextHop === nextHop);
      }
      return !matchDest;
    }
  );

  return {
    success: true,
    newState: { ipv6StaticRoutes: newStaticRoutes }
  };
}

/**
 * IPv6 Router RIP
 */
function cmdIpv6RouterRip(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ipv6\s+router\s+rip\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  return {
    success: true,
    output: `RIPng process "${match[1]}" started`,
    newState: {
      routingProtocol: 'ripng',
      ipv6Enabled: true,
      currentMode: 'router-config'
    }
  };
}

/**
 * IPv6 Router OSPF
 */
function cmdIpv6RouterOspf(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ipv6\s+router\s+ospf\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  return {
    success: true,
    output: `OSPFv3 process ${match[1]} started`,
    newState: {
      routingProtocol: 'ospfv3',
      ipv6Enabled: true,
      ospfv3ProcessId: match[1],
      currentMode: 'router-config'
    }
  };
}

/**
 * No IPv6 Router RIP
 */
function cmdNoIpv6RouterRip(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: {
      routingProtocol: 'none',
      ipv6DynamicRoutes: []
    }
  };
}

/**
 * No IPv6 Router OSPF
 */
function cmdNoIpv6RouterOspf(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: {
      routingProtocol: 'none',
      ipv6DynamicRoutes: []
    }
  };
}

/**
 * IP SSH Authentication-Retries
 */
function cmdIpSshAuthRetries(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^ip\s+ssh\s+authentication-retries\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };
  const retries = parseInt(match[1], 10);
  if (retries < 0 || retries > 5) return { success: false, error: '% Value must be between 0 and 5' };
  return { success: true, output: `SSH authentication retries set to ${retries}` };
}

/**
 * Crypto Key Generate RSA
 */
function cmdCryptoKeyGenerateRsa(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, output: 'The name for the keys will be: ' + (state.hostname || 'Switch') + '.' + (state.domainName || 'local') + '\nChoose the size of the key modulus in the range of 360 to 4096 for your\nGeneral Purpose Keys. Choosing a key modulus greater than 512 may take\na few minutes.\n\nHow many bits in the modulus [512]: \n% Generating 1024 bit RSA keys, keys will be non-exportable...\n[OK] (elapsed time was 1 seconds)\n' };
}

/**
 * ip dhcp pool <name> - Enter DHCP pool configuration mode
 */
function cmdIpDhcpPool(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }
  const match = input.match(/^ip\s+dhcp\s+pool\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ip dhcp pool command' };

  const poolName = match[1];
  const pools = { ...(state.dhcpPools || {}) };
  if (!pools[poolName]) {
    pools[poolName] = {};
  }

  // Sync with services.dhcp.pools for PC DHCP functionality
  const services = { ...state.services };
  if (!services.dhcp) services.dhcp = { enabled: true, pools: [] };
  const existingServicePool = services.dhcp.pools?.find((p: any) => p.poolName === poolName);
  if (!existingServicePool) {
    services.dhcp.pools = services.dhcp.pools || [];
    services.dhcp.pools.push({
      poolName,
      subnetMask: '255.255.255.0',
      startIp: '192.168.1.100',
      defaultGateway: '192.168.1.1',
      dnsServer: '8.8.8.8',
      maxUsers: 50
    });
  }

  const updatedState = { ...state, dhcpPools: pools, services };
  return {
    success: true,
    newState: {
      currentMode: 'dhcp-config',
      currentDhcpPool: poolName,
      dhcpPools: pools,
      services,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

/**
 * no ip dhcp pool <name> - Remove a DHCP pool
 */
function cmdNoIpDhcpPool(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }
  const match = input.match(/^no\s+ip\s+dhcp\s+pool\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no ip dhcp pool command' };

  const poolName = match[1];
  const pools = { ...(state.dhcpPools || {}) };
  if (!pools[poolName]) {
    return { success: false, error: `% DHCP pool ${poolName} not found` };
  }
  delete pools[poolName];

  // Sync with services.dhcp.pools
  const services = { ...state.services };
  if (services.dhcp && services.dhcp.pools) {
    services.dhcp.pools = services.dhcp.pools.filter((p: any) => p.poolName !== poolName);
  }

  const updatedState = { ...state, dhcpPools: pools, services };
  return { success: true, newState: { dhcpPools: pools, services, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * ipv6 dhcp pool <name> - Enter IPv6 DHCP pool configuration mode
 */
function cmdIpv6DhcpPool(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }
  const match = input.match(/^ipv6\s+dhcp\s+pool\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ipv6 dhcp pool command' };

  const poolName = match[1];
  const pools = { ...(state.ipv6DhcpPools || {}) };
  if (!pools[poolName]) {
    pools[poolName] = {};
  }

  const updatedState = { ...state, ipv6DhcpPools: pools };
  return {
    success: true,
    newState: {
      currentMode: 'dhcp-config',
      currentIpv6DhcpPool: poolName,
      ipv6DhcpPools: pools,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

/**
 * ip dhcp excluded-address <low> [<high>]
 */
function cmdIpDhcpExcludedAddress(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }
  return { success: true };
}

/**
 * no ip dhcp excluded-address <low> [<high>]
 */
function cmdNoIpDhcpExcludedAddress(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }
  return { success: true };
}

/**
 * IP Access-List (Named)
 */
function cmdIpAccessList(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: '% Invalid command' };

  const match = input.match(/^ip\s+access-list\s+(standard|extended)\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ip access-list command' };

  // For simulation simplicity, we'll just success and maybe in the future add a sub-mode
  return { success: true, output: `IP access-list ${match[2]} configured` };
}

/**
 * No IP Access-List
 */
function cmdNoIpAccessList(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: '% Invalid command' };

  const match = input.match(/^no\s+ip\s+access-list\s+(standard|extended)\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const aclName = match[2];
  const accessLists = { ...(state.accessLists || {}) };
  delete accessLists[aclName];

  return { success: true, output: `IP access-list ${aclName} removed`, newState: { accessLists } };
}

/**
 * IP Host - DNS mapping
 */
function cmdIpHost(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };

  const match = input.match(/^ip\s+host\s+(\S+)\s+(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (!match) return { success: false, error: '% Invalid ip host command. Usage: ip host <name> <ip>' };

  const hostName = match[1];
  const ipAddress = match[2];

  const services = { ...state.services };
  if (!services.dns) services.dns = { enabled: true, records: [] };

  const records = [...(services.dns.records || [])];
  const existingIndex = records.findIndex(r => r.domain === hostName);
  if (existingIndex >= 0) {
    records[existingIndex] = { domain: hostName, address: ipAddress };
  } else {
    records.push({ domain: hostName, address: ipAddress });
  }

  services.dns.records = records;

  const updatedState = { ...state, services };
  return {
    success: true,
    newState: {
      services,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

/**
 * Alias Exec - Define a command alias in exec mode
 */
function cmdAliasExec(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^alias\s+(exec|configure|interface|line)\s+(\S+)\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid alias command' };
  }

  const mode = match[1].toLowerCase();
  const aliasName = match[2];
  const aliasCommand = match[3];

  if (mode !== 'exec') {
    return { success: true, output: `% ${mode} mode aliases not supported yet` };
  }

  const execAliases = { ...(state.execAliases || {}) };
  execAliases[aliasName.toLowerCase()] = aliasCommand;

  const updatedState = { ...state, execAliases };
  return {
    success: true,
    output: `% ${input.trim()} configured`,
    newState: {
      execAliases,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

/**
 * No Alias Exec - Remove a command alias
 */
function cmdNoAliasExec(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+alias\s+(exec|configure|interface|line)\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid no alias command' };
  }

  const mode = match[1].toLowerCase();
  const aliasName = match[2].toLowerCase();

  if (mode !== 'exec') {
    return { success: true, output: `% ${mode} mode aliases not supported yet` };
  }

  if (!state.execAliases || !state.execAliases[aliasName]) {
    return { success: false, error: `% Alias ${aliasName} not found` };
  }

  const execAliases = { ...state.execAliases };
  delete execAliases[aliasName];

  const updatedState = { ...state, execAliases };
  return {
    success: true,
    output: `% no alias exec ${aliasName} configured`,
    newState: {
      execAliases,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

// IoT Handlers

/**
 * iot sensor <type>
 */
function cmdIotSensor(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^iot\s+sensor\s+(.+)$/i);
  if (!match) return { success: false, error: '% Incomplete command' };
  const type = match[1];
  const iotConfig = { ...(state.iotConfig || {}), sensorType: type };
  const updatedState = { ...state, iotConfig };
  return {
    success: true,
    output: `IoT sensor type set to ${type}`,
    newState: { iotConfig, runningConfig: buildRunningConfig(updatedState) }
  };
}

/**
 * iot name <name>
 */
function cmdIotName(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^iot\s+name\s+(.+)$/i);
  if (!match) return { success: false, error: '% Incomplete command' };
  const name = match[1];
  const iotConfig = { ...(state.iotConfig || {}), name };
  const updatedState = { ...state, iotConfig };
  return {
    success: true,
    output: `IoT device name set to ${name}`,
    newState: { iotConfig, runningConfig: buildRunningConfig(updatedState) }
  };
}

/**
 * ip nat pool <name> <start> <end> netmask <mask>
 */
function cmdIpNatPool(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^ip\s+nat\s+pool\s+(\S+)\s+([0-9.]+)\s+([0-9.]+)\s+netmask\s+([0-9.]+)$/i);
  if (!match) return { success: false, error: '% Invalid NAT pool command' };

  const [_, name, startIp, endIp, netmask] = match;
  const pools = { ...(state.natPools || {}) };
  pools[name] = { startIp, endIp, netmask };

  return { success: true, newState: { natPools: pools } };
}

/**
 * ip nat inside source static <local> <global>
 */
function cmdIpNatInsideSourceStatic(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^ip\s+nat\s+inside\s+source\s+static\s+([0-9.]+)\s+([0-9.]+)$/i);
  if (!match) return { success: false, error: '% Invalid static NAT command' };

  const [_, localIp, globalIp] = match;
  const staticTranslations = [...(state.natStaticTranslations || [])];
  staticTranslations.push({ localIp, globalIp });

  return { success: true, newState: { natStaticTranslations: staticTranslations } };
}

/**
 * ip nat inside source list <acl> {pool <name> | interface <name>} overload
 */
function cmdIpNatInsideSourceList(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };

  const interfaceMatch = input.match(/^ip\s+nat\s+inside\s+source\s+list\s+(\d+)\s+interface\s+(\S+)\s+overload$/i);
  if (interfaceMatch) {
    const [_, aclId, iface] = interfaceMatch;
    const dynamicRules = [...(state.natDynamicRules || [])];
    dynamicRules.push({ aclId, interface: iface, overload: true });
    return { success: true, newState: { natDynamicRules: dynamicRules } };
  }

  const poolMatch = input.match(/^ip\s+nat\s+inside\s+source\s+list\s+(\d+)\s+pool\s+(\S+)(?:\s+overload)?$/i);
  if (poolMatch) {
    const [_, aclId, poolName] = poolMatch;
    const overload = input.toLowerCase().includes('overload');
    const dynamicRules = [...(state.natDynamicRules || [])];
    dynamicRules.push({ aclId, poolName, overload });
    return { success: true, newState: { natDynamicRules: dynamicRules } };
  }

  return { success: false, error: '% Invalid dynamic NAT command' };
}

/**
 * iot wifi <ssid>
 */
function cmdIotWifi(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^iot\s+wifi\s+(.+)$/i);
  if (!match) return { success: false, error: '% Incomplete command' };
  const ssid = match[1];
  const iotConfig = { ...(state.iotConfig || {}), wifiSsid: ssid };
  const updatedState = { ...state, iotConfig };
  return {
    success: true,
    output: `IoT wifi SSID set to ${ssid}`,
    newState: { iotConfig, runningConfig: buildRunningConfig(updatedState) }
  };
}

// Register new global config handlers

function cmdStubSuccess(state: any, input: string, ctx: any): any {
  return { success: true, output: `% ${input.trim()} configured` };
}

// ── End of Handlers ──────────────────────────────────────────────────────────

