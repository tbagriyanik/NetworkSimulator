import { IOS_ERRORS, iosModeError } from './iosErrors';

import type { CommandHandler, CommandContext } from './commandTypes';
import type { SwitchState, CommandResult, Route } from '../types';
import type { CanvasDevice } from '@/components/network/networkTopology.types';
import { buildRunningConfig } from './configBuilder';
import { canAssignIPToPhysicalPort, isLayer3Switch } from '../switchModels';
import { encryptMd5Password, encryptType7Password } from '../crypto';
import { getPvstUpdate } from './commandHelpers';
import { getDeviceCapabilities } from '../capabilities';
import { validateIpRoutingSupport } from './L3Validation';
import { createStubHandler } from './stubCommandHints';

// Global config (hostname, vlan, vtp, spanning-tree, security, ip domain-name, etc.)

export const globalConfigHandlers: Record<string, CommandHandler> = {
  'hostname': cmdHostname,
  'no hostname': cmdNoHostname,
  'vlan': cmdVlan,
  'no vlan': cmdNoVlan,
  'name': cmdVlanName,
  'no name': cmdNoVlanName,
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
  'no ip domain-name': cmdNoIpDomainName,
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
  'no ip arp inspection': cmdNoIpArpInspection,
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
  'cdp timer': createStubHandler('cdp timer'),
  'cdp holdtime': createStubHandler('cdp holdtime'),
  'snmp-server community': createStubHandler('snmp-server community'),
  'snmp-server contact': createStubHandler('snmp-server contact'),
  'snmp-server location': createStubHandler('snmp-server location'),
  'archive': createStubHandler('archive'),
  'alias': cmdAliasExec,
  'no alias': cmdNoAliasExec,
  'macro': createStubHandler('macro'),
  'default interface': createStubHandler('default interface'),
  'configure replace': createStubHandler('configure replace'),
  'mac access-list': createStubHandler('mac access-list'),
  'class-map': createStubHandler('class-map'),
  'policy-map': createStubHandler('policy-map'),
  'template': createStubHandler('template'),
  'ip access-list': cmdIpAccessList,
  'permit (named-acl)': cmdNamedAclPermit,
  'deny (named-acl)': cmdNamedAclDeny,
  'no permit (named-acl)': cmdNamedAclNoPermit,
  'no deny (named-acl)': cmdNamedAclNoDeny,
  'permit (ext-named-acl)': cmdExtAclPermit,
  'deny (ext-named-acl)': cmdExtAclDeny,
  'no permit (ext-named-acl)': cmdExtAclNoPermit,
  'no deny (ext-named-acl)': cmdExtAclNoDeny,
  'no ip access-list': cmdNoIpAccessList,
  'ip host': cmdIpHost,
  'no ip host': cmdNoIpHost,
  'no ipv6 dhcp pool': cmdNoIpv6DhcpPool,

  'ip nat pool': cmdIpNatPool,
  'ip nat inside source static': cmdIpNatInsideSourceStatic,
  'ip nat inside source list': cmdIpNatInsideSourceList,
};

/**
 * Hostname - Set device hostname
 */
function cmdHostname(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^hostname\s+(.+)$/i);
  if (!match) {
    return { success: false, error: IOS_ERRORS.invalidInput };
  }

  const hostname = match[1].trim();
  // hostname: max 63 chars, must start with a letter, alphanumeric + hyphens only
  if (hostname.length > 63 || !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(hostname)) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }

  return {
    success: true,
    newState: { hostname },
    hint: {
      tr: '💡 Gerçek dünyada: Anlamlı bir hostname cihazı ağda tanımlamayı kolaylaştırır (örn: Kat2-SW).',
      en: '💡 In the real world: A meaningful hostname makes it easier to identify the device in the network (e.g., Floor2-SW).'
    }
  };
}

function cmdNoHostname(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }
  return {
    success: true,
    newState: { hostname: 'Switch' }
  };
}

/**
 * IP Routing - Enable IP routing
 */
function cmdIpRouting(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // Validate IP routing support with comprehensive checks
  const validation = validateIpRoutingSupport(state.switchModel, state);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check device capabilities as backup
  const currentDevice = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
  const capabilities = getDeviceCapabilities(currentDevice || null, state.switchModel);
  if (!capabilities.routing) {
    const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support IP routing.\nIP routing is only supported on routers and Layer 3 switches.`
    };
  }

  let output = 'IP routing enabled\n';
  const newState: Partial<SwitchState> = { ipRouting: true };

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
function cmdIpRoute(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // Check if device supports routing (router or L3 switch)
  const currentDevice = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
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
    (route: Route) => !(route.destination === network && route.subnetMask === mask)
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
function cmdNoIpHost(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^no\s+ip\s+host\s+(\S+)(?:\s+[0-9.]+)?$/i);
  if (!match) return { success: false, error: '% Invalid no ip host command' };

  const hostName = match[1];
  const services = { ...state.services };
  if (services.dns && services.dns.records) {
    services.dns.records = services.dns.records.filter((r: { domain: string; address: string }) => r.domain !== hostName);
  }

  const updatedState = { ...state, services };
  return { success: true, newState: { services, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * no ipv6 dhcp pool <name>
 */
function cmdNoIpv6DhcpPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdRouterEigrp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
      currentMode: 'router-config',
      dynamicRoutes: state.routingProtocol !== 'eigrp' ? [] : state.dynamicRoutes
    }
  };
}

/**
 * No Router EIGRP
 */
function cmdNoRouterEigrp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdRouterBgp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
      currentMode: 'router-config',
      dynamicRoutes: state.routingProtocol !== 'bgp' ? [] : state.dynamicRoutes
    }
  };
}

/**
 * No Router BGP
 */
function cmdNoRouterBgp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoIpRoute(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // Check if device supports routing (router or L3 switch)
  const currentDevice = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
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
      (route: Route) => !(route.destination === network && route.subnetMask === mask && route.nextHop === nextHop)
    );
  } else {
    // Remove all routes for this network/mask
    newStaticRoutes = (state.staticRoutes || []).filter(
      (route: Route) => !(route.destination === network && route.subnetMask === mask)
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
function cmdIpSshTimeOut(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ip\s+ssh\s+time-out\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid SSH time-out command' };
  }

  return {
    success: true,
    newState: { sshTimeout: parseInt(match[1]) }
  };
}

/**
 * IP DHCP Snooping - Enable DHCP snooping
 */
function cmdIpDhcpSnooping(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdMlsQos(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdUsername(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^username\s+(\S+)(\s+(privilege\s+(\d+)|password|secret)\s+(.+))?$/i);
  if (!match) {
    return { success: false, error: IOS_ERRORS.invalidInput };
  }

  const username = match[1];
  const privilege = match[4] ? parseInt(match[4]) : 0;
  const password = match[5] || '';
  const currentUsers = Array.isArray(state.security?.users) ? state.security.users : [];
  const normalizedUsername = username.toLowerCase();
  const newUsers = currentUsers.filter((user: { username: string; password: string; privilege: number }) => (user?.username || '').toLowerCase() !== normalizedUsername);
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
 * VLAN - Create/enter VLAN configuration
 */
function cmdVlan(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: IOS_ERRORS.invalidInput };
  }

  const vlanId = match[1];
  const vlanNum = parseInt(vlanId, 10);

  if (vlanNum < 1 || vlanNum > 4094) {
    return { success: false, error: `% VLAN ID ${vlanId} is not in the range 1 to 4094.` };
  }
  if (vlanNum >= 1002 && vlanNum <= 1005) {
    return { success: false, error: `% VLAN ${vlanNum} is a reserved VLAN and cannot be created.` };
  }

  const newVlans = { ...state.vlans };

  if (!newVlans[vlanId]) {
    newVlans[vlanId] = {
      id: vlanNum,
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
    currentVlan: vlanNum
  };

  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

  return {
    success: true,
    newState: myUpdatedState || updatedCurrentState,
    updatedDeviceStates: allUpdatedStates,
    hint: {
      tr: `💡 İpucu: VLAN ${vlanId} oluşturuldu. Şimdi 'name' komutu ile isim verebilir veya arayüzleri bu VLAN'a atayabilirsiniz.`,
      en: `💡 Hint: VLAN ${vlanId} created. Now you can give it a name using the 'name' command or assign interfaces to this VLAN.`
    }
  };
}

/**
 * No VLAN - Delete VLAN
 */
function cmdNoVlan(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
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

  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

  return {
    success: true,
    newState: myUpdatedState || updatedCurrentState,
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * VLAN Name
 */
function cmdVlanName(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
 * No Name - Clear VLAN name (only valid in vlan mode)
 */
function cmdNoVlanName(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'vlan') {
    return { success: false, error: '% Invalid command. no name is only valid in VLAN configuration mode.\nUsage: vlan <id> -> no name' };
  }

  const newVlans = { ...state.vlans };
  const currentVlanId = state.currentVlan;
  if (currentVlanId && newVlans[currentVlanId]) {
    newVlans[currentVlanId] = { ...newVlans[currentVlanId], name: `VLAN${currentVlanId}` };
    return { success: true, newState: { vlans: newVlans } };
  }

  return { success: false, error: '% VLAN not found' };
}

/**
 * VLAN State
 */
function cmdVlanState(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
          status: match[1].toLowerCase() as 'active' | 'suspend'
        }
      },
      vtpRevision: nextVtpRevision,
    }
  };
}

/**
 * VTP Mode
 */
function cmdVtpMode(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // valid VTP modes: server, client, transparent (NOT 'off')
  const match = input.match(/^vtp\s+mode\s+(server|client|transparent)$/i);
  if (!match) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }

  return {
    success: true,
    newState: { vtpMode: match[1].toLowerCase() as 'server' | 'client' | 'transparent' }
  };
}

/**
 * VTP Domain
 */
function cmdVtpDomain(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdSpanningTreeMode(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^spanning-tree\s+mode\s+(pvst|rapid-pvst|mst)$/i);
  if (!match) {
    return { success: false, error: IOS_ERRORS.invalidInput };
  }

  return {
    success: true,
    newState: { spanningTreeMode: match[1].toLowerCase() as 'pvst' | 'rapid-pvst' | 'mst' }
  };
}

/**
 * Service Password-Encryption
 */
function cmdServicePasswordEncryption(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoServicePasswordEncryption(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdEnableSecret(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^enable\s+secret\s+(.+)$/i);
  if (!match) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
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
function cmdEnablePassword(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoEnableSecret(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoEnablePassword(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdBannerMotd(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^banner\s+motd\s+(.)([\s\S]*?)\1\s*$/i);
  if (!match) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }

  return {
    success: true,
    newState: { bannerMOTD: match[2] }
  };
}

/**
 * No Banner MOTD
 */
function cmdNoBannerMotd(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdBannerLogin(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoBannerLogin(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdBannerExec(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoBannerExec(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdIpDefaultGateway(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ip\s+default-gateway\s+([0-9.]+)$/i);
  if (!match) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }

  return {
    success: true,
    newState: { defaultGateway: match[1] }
  };
}

/**
 * No IP Default-Gateway
 */
function cmdNoIpDefaultGateway(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdIpDomainName(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ip\s+domain-name\s+(.+)$/i);
  if (!match) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }

  return {
    success: true,
    newState: { domainName: match[1] }
  };
}

/**
 * CDP Run
 */
function cmdCdpRun(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoCdpRun(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdRouterRip(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // Check if device supports routing (routers and L3 switches only)
  const deviceType: string | undefined = state.deviceType;
  if (deviceType !== 'router' && !canAssignIPToPhysicalPort(state.switchModel)) {
    const deviceLabel = (deviceType as string | undefined) === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
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
      currentMode: 'router-config',
      dynamicRoutes: state.routingProtocol !== 'rip' ? [] : state.dynamicRoutes
    }
  };
}

/**
 * Router OSPF - Enable OSPF routing
 */
function cmdRouterOspf(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  // Check if device supports routing (routers and L3 switches only)
  const deviceType2: string | undefined = state.deviceType;
  if (deviceType2 !== 'router' && !canAssignIPToPhysicalPort(state.switchModel)) {
    const deviceLabel = (deviceType2 as string | undefined) === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
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
      currentMode: 'router-config',
      dynamicRoutes: state.routingProtocol !== 'ospf' ? [] : state.dynamicRoutes
    }
  };
}

/**
 * No Router RIP - Disable RIP routing
 */
function cmdNoRouterRip(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
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
function cmdNoRouterOspf(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
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
function cmdIpHttpServer(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
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
          content: '',
          fontSize: 14
        }
      }
    }
  };
}

/**
 * No IP HTTP Server - Disable HTTP server
 */
function cmdNoIpHttpServer(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
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
          content: '',
          fontSize: 14
        }
      }
    }
  };
}

/**
 * No IP Domain Lookup - Disable domain lookup
 */
function cmdNoIpDomainLookup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { domainLookup: false }
  };
}

function cmdNoIpDomainName(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }
  return {
    success: true,
    newState: { domainName: undefined }
  };
}

/**
 * No IP Routing - Disable IP routing
 */
function cmdNoIpRouting(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoIpSshTimeOut(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  return {
    success: true,
    newState: { sshTimeout: undefined }
  };
}

/**
 * No Spanning-Tree - Disable spanning-tree globally or per-VLAN
 */
function cmdNoSpanningTree(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
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

    const pvst = getPvstUpdate(updatedCurrentState, ctx);
    if ('error' in pvst) return pvst.error;
    const { allUpdatedStates, myUpdatedState } = pvst;

    return {
      success: true,
      output: lang === 'tr' ?
        `Spanning-tree VLAN ${vlanId} devre disi birakildi` :
        `Spanning-tree disabled on VLAN ${vlanId}`,
      newState: myUpdatedState || { spanningTreeVlans: updatedVlans },
      updatedDeviceStates: allUpdatedStates
    };
  }

  // Global spanning-tree disable - not supported (only per-VLAN)
  return {
    success: false,
    error: '% Command not available in Global Configuration mode.'
  };
}

/**
 * No MLS QoS - Disable MLS QoS
 */
function cmdNoMlsQos(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoIpDhcpSnooping(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoUsername(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+username\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid username command' };
  }

  const username = match[1];
  const currentUsers = Array.isArray(state.security?.users) ? state.security.users : [];
  const newUsers = currentUsers.filter((user: { username: string; password: string; privilege: number }) => (user?.username || '').toLowerCase() !== username.toLowerCase());

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
function cmdNoInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdIpSshVersion(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
    newState: { sshVersion: version as 1 | 2 }
  };
}

/**
 * IP DHCP Snooping VLAN
 */
function cmdIpDhcpSnoopingVlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^ip\s+dhcp\s+snooping\s+vlan\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };
  const vlans = match[1].split(',').map((v: string) => v.trim());
  return { success: true, output: `DHCP snooping enabled on VLAN(s): ${vlans.join(', ')}`, newState: { dhcpSnoopingVlans: vlans } };
}

/**
 * IP ARP Inspection VLAN
 */
function cmdIpArpInspection(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, output: 'ARP inspection configured', newState: { arpInspectionEnabled: true } };
}

function cmdNoIpArpInspection(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, output: 'ARP inspection disabled', newState: { arpInspectionEnabled: false } };
}

/**
 * Spanning-Tree VLAN - Enable STP on VLAN or configure priority/root
 */
function cmdSpanningTreeVlan(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
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

  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

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
function cmdSpanningTreePortfastDefault(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, output: 'PortFast will be configured in all non-trunking ports', newState: { spanningTreePortfastDefault: true } };
}

/**
 * Errdisable Recovery
 */
function cmdErrdisableRecovery(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, output: 'Errdisable recovery configured' };
}

/**
 * VTP Password
 */
function cmdVtpPassword(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^vtp\s+password\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid vtp password command' };
  return { success: true, newState: { vtpPassword: match[1] } };
}

/**
 * NTP Server
 */
function cmdNtpServer(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdClockTimezone(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^clock\s+timezone\s+(\S+)\s+([+-]?\d+)(?:\s+(\d+))?$/i);
  if (!match) return { success: false, error: '% Invalid clock timezone command' };
  return { success: true, output: `Timezone set to ${match[1]} UTC${match[2]}` };
}

/**
 * IP Name-Server
 */
function cmdIpNameServer(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^ip\s+name-server\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ip name-server command' };
  return { success: true, output: `Name server ${match[1]} configured`, newState: { dnsServer: match[1] } };
}

/**
 * IP Domain Lookup (re-enable)
 */
function cmdIpDomainLookup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, newState: { domainLookup: true } };
}

/**
 * System MTU
 */
function cmdSystemMtu(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  const match = input.match(/^system\s+mtu\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid system mtu command' };
  return { success: true, output: `Changes to the MTU will take effect after reload\nSystem MTU size is ${match[1]} bytes` };
}

/**
 * SDM Prefer
 */
function cmdSdmPrefer(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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

  if (template === 'lanbase-routing' || template === 'routing') {
    output = `Changes to the SDM preferences will take effect after reload.\n`;
    output += `This template will configure: 16384 IPv4 ACL entries, 2048 QoS labels, 16384 IPv4 Multicast entries\n`;
  } else if (template === 'lanbase') {
    output = `Changes to the SDM preferences will take effect after reload.\n`;
    output += `This template will configure: 8192 IPv4 ACL entries, 2048 QoS labels, 2048 IPv4 Multicast entries\n`;
  } else if (template === 'desktop') {
    output = `Changes to the SDM preferences will take effect after reload.\n`;
    output += `This template will configure: 4096 IPv4 ACL entries, 512 QoS labels, 256 IPv4 Multicast entries\n`;
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
function cmdIpv6UnicastRouting(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, newState: { ipv6Enabled: true } };
}

/**
 * No IPv6 Unicast-Routing
 */
function cmdNoIpv6UnicastRouting(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };
  return { success: true, newState: { ipv6Enabled: false } };
}

/**
 * IPv6 Route - Add static IPv6 route
 */
function cmdIpv6Route(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
    (route: Route) => !(route.destination === destination && route.prefixLength === parseInt(prefixLength))
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
function cmdNoIpv6Route(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
    (route: Route) => {
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
function cmdIpv6RouterRip(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdIpv6RouterOspf(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoIpv6RouterRip(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoIpv6RouterOspf(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdIpSshAuthRetries(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdCryptoKeyGenerateRsa(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: iosModeError() };

  // Use the parser that already handles this; extract modulus from input
  const match = input.match(/^crypto\s+key\s+generate\s+rsa(?:\s+modulus\s+(\d+))?$/i);
  const modulus = match?.[1] ? parseInt(match[1], 10) : 1024;

  // Validate modulus range (allows 360-4096, default 512)
  const validModulus = modulus >= 360 && modulus <= 4096 ? modulus : 1024;

  const hostPart = state.hostname || 'Switch';
  const domainPart = state.domainName || 'local';

  return {
    success: true,
    output: `The name for the keys will be: ${hostPart}.${domainPart}\n`
      + `Choose the size of the key modulus in the range of 360 to 4096 for your\n`
      + `General Purpose Keys. Choosing a key modulus greater than 512 may take\n`
      + `a few minutes.\n\n`
      + `How many bits in the modulus [512]: ${validModulus}\n`
      + `% Generating ${validModulus} bit RSA keys, keys will be non-exportable...\n`
      + `[OK] (elapsed time was 1 seconds)\n`
  };
}

/**
 * ip dhcp pool <name> - Enter DHCP pool configuration mode
 */
function cmdIpDhcpPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
  const existingServicePool = services.dhcp.pools?.find((p: { poolName: string; subnetMask?: string; startIp?: string; defaultGateway?: string; dnsServer?: string; maxUsers?: number }) => p.poolName === poolName);
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
function cmdNoIpDhcpPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
    services.dhcp.pools = services.dhcp.pools.filter((p: { poolName: string; subnetMask?: string; startIp?: string; defaultGateway?: string; dnsServer?: string; maxUsers?: number }) => p.poolName !== poolName);
  }

  const updatedState = { ...state, dhcpPools: pools, services };
  return { success: true, newState: { dhcpPools: pools, services, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * ipv6 dhcp pool <name> - Enter IPv6 DHCP pool configuration mode
 */
function cmdIpv6DhcpPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdIpDhcpExcludedAddress(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }
  return { success: true };
}

/**
 * no ip dhcp excluded-address <low> [<high>]
 */
function cmdNoIpDhcpExcludedAddress(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }
  return { success: true };
}

/**
 * IP Access-List (Named)
 */
function cmdIpAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: '% Invalid command' };

  const match = input.match(/^ip\s+access-list\s+(standard|extended)\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ip access-list command' };

  const aclTypeRaw = match[1].toLowerCase();
  const aclType = aclTypeRaw === 'extended' ? 'extended' as const : 'standard' as const;
  const aclName = match[2];
  const accessLists = { ...(state.accessLists || {}) };
  const namedAclTypes = { ...(state.namedAclTypes || {}) };
  if (!accessLists[aclName]) {
    accessLists[aclName] = [];
  }
  namedAclTypes[aclName] = aclType;

  if (aclType === 'extended') {
    return {
      success: true,
      output: '',
      newState: {
        currentMode: 'config-ext-nacl',
        currentExtendedAcl: aclName,
        accessLists,
        namedAclTypes
      }
    };
  }

  return {
    success: true,
    output: '',
    newState: {
      currentMode: 'config-std-nacl',
      currentNamedAcl: aclName,
      accessLists,
      namedAclTypes
    }
  };
}

/**
 * Permit (Named ACL sub-mode) - Add permit rule to named ACL
 */
function cmdNamedAclPermit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-std-nacl' || !state.currentNamedAcl) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^permit\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid permit command' };

  const rule = `permit ${match[1]}`;
  const accessLists = { ...(state.accessLists || {}) };
  const aclName = state.currentNamedAcl;
  accessLists[aclName] = [...(accessLists[aclName] || []), rule];

  return {
    success: true,
    newState: { accessLists }
  };
}

/**
 * Deny (Named ACL sub-mode) - Add deny rule to named ACL
 */
function cmdNamedAclDeny(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-std-nacl' || !state.currentNamedAcl) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^deny\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid deny command' };

  const rule = `deny ${match[1]}`;
  const accessLists = { ...(state.accessLists || {}) };
  const aclName = state.currentNamedAcl;
  accessLists[aclName] = [...(accessLists[aclName] || []), rule];

  return {
    success: true,
    newState: { accessLists }
  };
}

/**
 * No Permit (Named ACL sub-mode) - Remove specific permit rule
 */
function cmdNamedAclNoPermit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-std-nacl' || !state.currentNamedAcl) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+permit\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const rule = `permit ${match[1]}`;
  const aclName = state.currentNamedAcl;
  const accessLists = { ...(state.accessLists || {}) };
  accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => r !== rule);

  return {
    success: true,
    newState: { accessLists }
  };
}

/**
 * No Deny (Named ACL sub-mode) - Remove specific deny rule
 */
function cmdNamedAclNoDeny(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-std-nacl' || !state.currentNamedAcl) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+deny\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const rule = `deny ${match[1]}`;
  const aclName = state.currentNamedAcl;
  const accessLists = { ...(state.accessLists || {}) };
  accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => r !== rule);

  return {
    success: true,
    newState: { accessLists }
  };
}

// ─── Extended ACL Sub-mode Handlers ───────────────────────────────────────

/**
 * Permit (Extended Named ACL sub-mode) - Add extended permit rule
 * Format: permit <protocol> <src> <src-wildcard> [eq|neq|lt|gt <port>] <dst> <dst-wildcard> [eq|neq|lt|gt <port>]
 */
function cmdExtAclPermit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-ext-nacl' || !state.currentExtendedAcl) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^permit\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid permit command' };

  const aclName = state.currentExtendedAcl;
  const accessLists = { ...(state.accessLists || {}) };
  accessLists[aclName] = [...(accessLists[aclName] || []), `permit ${match[1]}`];

  return { success: true, newState: { accessLists } };
}

/**
 * Deny (Extended Named ACL sub-mode) - Add extended deny rule
 */
function cmdExtAclDeny(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-ext-nacl' || !state.currentExtendedAcl) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^deny\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid deny command' };

  const aclName = state.currentExtendedAcl;
  const accessLists = { ...(state.accessLists || {}) };
  accessLists[aclName] = [...(accessLists[aclName] || []), `deny ${match[1]}`];

  return { success: true, newState: { accessLists } };
}

/**
 * No Permit (Extended Named ACL sub-mode)
 */
function cmdExtAclNoPermit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-ext-nacl' || !state.currentExtendedAcl) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+permit\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const rule = `permit ${match[1]}`;
  const aclName = state.currentExtendedAcl;
  const accessLists = { ...(state.accessLists || {}) };
  accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => r !== rule);

  return { success: true, newState: { accessLists } };
}

/**
 * No Deny (Extended Named ACL sub-mode)
 */
function cmdExtAclNoDeny(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config-ext-nacl' || !state.currentExtendedAcl) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+deny\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const rule = `deny ${match[1]}`;
  const aclName = state.currentExtendedAcl;
  const accessLists = { ...(state.accessLists || {}) };
  accessLists[aclName] = (accessLists[aclName] || []).filter((r: string) => r !== rule);

  return { success: true, newState: { accessLists } };
}

/**
 * No IP Access-List
 */
function cmdNoIpAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdIpHost(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdAliasExec(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoAliasExec(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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

/**
 * ip nat pool <name> <start> <end> netmask <mask>
 */
function cmdIpNatPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdIpNatInsideSourceStatic(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdIpNatInsideSourceList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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

// ── End of Handlers ──────────────────────────────────────────────────────────

