import { IOS_ERRORS } from './iosErrors';
import type { CommandHandler, CommandContext } from './commandTypes';
import { buildRunningConfig } from './configBuilder';
import { SwitchState, CommandResult } from '../types';
import type { CanvasDevice } from '@/components/network/networkTopology.types';
import { getSwitchDisplayProfile } from './showHelpers';
import { checkConnectivity } from '../connectivity';
import {
  cmdShowWireless, cmdShowWlanSummary,
  cmdShowApSummary, cmdShowApConfig, cmdShowApJoinStats,
  cmdShowDot11Associations, cmdShowDot11Statistics, cmdShowWlan,
} from './showWlcDisplay';
import {
  cmdShowInterfaces, cmdShowInterface, cmdShowInterfaceTrunk,
  cmdShowIpInterfaceBrief, cmdShowInterfacesStatus,
  cmdShowIpInterface, cmdShowIpv6InterfaceBrief,
  cmdShowNameif, cmdShowControllers, cmdShowIpAccessGroup,
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
  cmdShowIpEigrpNeighbors, cmdShowIpBgpSummary,
  cmdShowIpBgp, cmdShowIpv6Rip, cmdShowIpv6Ospf,
} from './showRoutingDisplay';

// Show komutları (show running-config, show vlan, show ip route, vs.)

export const showHandlers: Record<string, CommandHandler> = {
  'show running-config': cmdShowRunningConfig,
  'show running-config interface': cmdShowRunningConfigInterface,
  'show startup-config': cmdShowStartupConfig,
  'show version': cmdShowVersion,
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
  'do show': cmdDoShow,
  'show ip dhcp snooping': cmdShowIpDhcpSnooping,
  'show interfaces status': cmdShowInterfacesStatus,
  'show cdp': cmdShowCdp,
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
  'show ip verify source': cmdShowIpVerifySource,
  'show': cmdShowParent,
  'show ip interface': cmdShowIpInterface,
  'show ipv6 route': cmdShowIpv6Route,
  'show ipv6 interface brief': cmdShowIpv6InterfaceBrief,
  'show ipv6 dhcp pool': cmdShowIpv6DhcpPool,
  'show mac address-table static': cmdShowMacStatic,
  'show authentication': cmdShowAuth,
  'show sessions': cmdShowSessions,
  'show ntp associations': cmdShowNtp,
  'show ntp status': cmdShowNtp,
  'show ntp': cmdShowNtp,
  'show snmp': cmdShowSnmp,
  'show class-map': cmdShowClassMap,
  'show mac access-lists': cmdShowMacAcl,
  'show controllers': cmdShowControllers,
  'show diagnostic': cmdShowDiag,
  'show privilege': cmdShowPrivilege,
  'show lldp': cmdShowLldp,
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
  'show ip nat translations': cmdShowIpNatTranslations,
  'show ip nat statistics': cmdShowIpNatStatistics,

  // New: missing show commands
  'show nameif': cmdShowNameif,
  'show ip access-group': cmdShowIpAccessGroup,
  'show dot11 associations': cmdShowDot11Associations,
  'show dot11 statistics': cmdShowDot11Statistics,
  'show wlan': cmdShowWlan,
  'show vtp password': cmdShowVtpPassword,
  'show ip eigrp neighbors': cmdShowIpEigrpNeighbors,
  'show ip bgp summary': cmdShowIpBgpSummary,
  'show ip bgp': cmdShowIpBgp,
  'show ipv6 rip': cmdShowIpv6Rip,
  'show ipv6 ospf': cmdShowIpv6Ospf,
};

/**
 * Show Running Configuration
 */
function cmdShowRunningConfig(
  state: SwitchState,
  input: string,
  ctx: CommandContext
): CommandResult {
  // Check if specific interface is requested via interface keyword in parser
  const match = input.match(/show\s+(?:running-config|run|running)(?:\s+interface\s+(\S+))?/i);
  const interfaceName = match?.[1];

  if (interfaceName) {
    return cmdShowRunningConfigInterface(state, input, ctx);
  }

  let output = '\nBuilding configuration...\n\n';
  const lines = buildRunningConfig(state);
  const configText = lines.join('\n');
  output += `Current configuration : ${configText.length} bytes\n\n`;
  output += configText;

  output += '\nend\n';
  return { success: true, output };
}

/**
 * Show Running Configuration Interface
 */
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

/**
 * Show Startup Configuration
 */
function cmdShowStartupConfig(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  const { systemImage } = getSwitchDisplayProfile(state);
  // Check if startup config exists
  if (!state.startupConfig) {
    return {
      success: true,
      output: '\n% No startup configuration available\n'
    };
  }

  let output = '\nBuilding configuration...\n\n';
  output += 'Startup configuration : 1024 bytes\n\n';
  output += '!\n';
  output += `version ${state.startupConfig.version || '15.0'}\n`;
  output += `hostname ${state.startupConfig.hostname || state.hostname || 'Switch'}\n`;

  // Banner MOTD from startup config
  if (state.startupConfig.bannerMOTD) {
    const escapedBanner = state.startupConfig.bannerMOTD.replace(/\n/g, '\\n');
    output += `banner motd #${escapedBanner}#\n`;
    output += '!\n';
  }

  // Boot system from startup config
  output += `boot system ${systemImage}\n`;
  output += '!\n';

  // Service passwords-encryption from startup config
  if (state.startupConfig.security?.servicePasswordEncryption) {
    output += 'service password-encryption\n';
  }
  output += '!\n';

  // Spanning-tree mode from startup config
  output += `spanning-tree mode ${state.startupConfig.spanningTree?.mode || 'pvst'}\n`;
  output += '!\n';

  // VLANs from startup config
  const startupVlans = state.startupConfig.vlans || {};
  const vlanIds = Object.keys(startupVlans).filter(v => v !== '1');
  if (vlanIds.length > 0) {
    vlanIds.forEach((vlanId: string) => {
      const vlan = startupVlans[Number(vlanId)];
      output += `vlan ${vlanId}\n`;
      output += ` name ${vlan?.name || `VLAN${vlanId}`}\n`;
      output += ` state ${vlan?.status || 'active'}\n`;
      output += '!\n';
    });
  }

  // Interfaces from startup config
  const startupPorts = state.startupConfig.ports || {};
  Object.keys(startupPorts).forEach(portName => {
    const port = startupPorts[portName];
    output += `interface ${portName}\n`;

    const portDescription = port.description || port.name;
    if (portDescription) {
      output += ` description ${portDescription}\n`;
    }

    if (port.mode === 'trunk') {
      output += ' switchport mode trunk\n';
      if (port.nativeVlan) {
        output += ` switchport trunk native vlan ${port.nativeVlan}\n`;
      }
      if (port.allowedVlans) {
        output += ` switchport trunk allowed vlan ${port.allowedVlans}\n`;
      }
    } else if (port.mode === 'dynamic-auto') {
      output += ' switchport mode dynamic auto\n';
    } else if (port.mode === 'dynamic-desirable') {
      output += ' switchport mode dynamic desirable\n';
    } else if (port.mode === 'dot1q-tunnel') {
      output += ' switchport mode dot1q-tunnel\n';
    } else {
      output += ` switchport access vlan ${port.accessVlan || 1}\n`;
    }

    if (port.speed && port.speed !== 'auto') {
      output += ` speed ${port.speed}\n`;
    }

    if (port.duplex && port.duplex !== 'auto') {
      output += ` duplex ${port.duplex}\n`;
    }

    if (port.shutdown) {
      output += ' shutdown\n';
    }

    if (port.ipAddress && port.subnetMask) {
      output += ` ip address ${port.ipAddress} ${port.subnetMask}\n`;
    }

    if (port.spanningTree?.portfast) {
      output += ' spanning-tree portfast\n';
    }

    if (port.spanningTree?.bpduguard) {
      output += ' spanning-tree bpduguard enable\n';
    }

    output += '!\n';
  });

  // Line console from startup config
  output += 'line console 0\n';
  if (state.startupConfig.security?.consoleLine?.password) {
    if (state.startupConfig.security.servicePasswordEncryption) {
      output += ` password 7 ********\n`;
    } else {
      output += ` password ${state.startupConfig.security.consoleLine.password}\n`;
    }
  }
  if (state.startupConfig.security?.consoleLine?.login) {
    output += ' login\n';
  }
  output += '!\n';

  // VTY lines from startup config
  output += 'line vty 0 4\n';
  if (state.startupConfig.security?.vtyLines?.password) {
    if (state.startupConfig.security.servicePasswordEncryption) {
      output += ` password 7 ********\n`;
    } else {
      output += ` password ${state.startupConfig.security.vtyLines.password}\n`;
    }
  }
  if (state.startupConfig.security?.vtyLines?.login) {
    output += ' login\n';
  }
  if (state.startupConfig.security?.vtyLines?.transportInput) {
    output += ` transport input ${state.startupConfig.security.vtyLines.transportInput.join(' ')}\n`;
  }
  output += '!\n';

  // Enable secret from startup config
  if (state.startupConfig.security?.enableSecret) {
    output += `enable secret ${state.startupConfig.security.enableSecret}\n`;
  } else if (state.startupConfig.security?.enablePassword) {
    if (state.startupConfig.security.servicePasswordEncryption) {
      output += `enable password 7 ${state.startupConfig.security.enablePassword}\n`;
    } else {
      output += `enable password ${state.startupConfig.security.enablePassword}\n`;
    }
  }

  output += 'end\n';

  return { success: true, output };
}


/**
 * Show Version
 */
function cmdShowVersion(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  const { switchModel, softwareImage, rom, bootldr, systemImage, processor, reportedFeCount, reportedGiCount } = getSwitchDisplayProfile(state);

  const wlanPortCount = Object.values(state.ports || {}).filter((p) => (p?.id || '').startsWith('wlan')).length;

  let output = `\nNetwork NOS Software, ${softwareImage}\n`;
  output += 'Technical Support: http://yunus.sf.net\n';
  output += 'Copyright (c) 1996-2026 by Network Systems, Inc.\n\n';
  output += `ROM: Bootstrap program is ${rom}\n`;
  output += `BOOTLDR: ${bootldr}\n\n`;
  const bootTime = state.bootTime || Date.now();
  const elapsedMs = Date.now() - bootTime;
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const weeks = Math.floor(totalSeconds / (7 * 24 * 3600));
  const days = Math.floor((totalSeconds % (7 * 24 * 3600)) / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const uptimeStr = `${weeks} week${weeks !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  output += `Switch uptime is ${uptimeStr}\n`;
  output += `System image file is "${systemImage}"\n\n`;
  output += `${processor}\n`;
  output += 'Processor board ID FOC1234X5YZ\n';
  output += 'Last reload reason: power-on\n\n';

  if (reportedFeCount > 0) {
    output += `${reportedFeCount} FastEthernet/IEEE 802.3 interface(s)\n`;
  }

  if (reportedGiCount > 0) {
    output += `${reportedGiCount} Gigabit Ethernet/IEEE 802.3 interface(s)\n`;
  }

  if (wlanPortCount > 0) {
    output += `${wlanPortCount} 802.11 Wireless interface(s)\n`;
  }
  output += '\n';
  output += '64K bytes of flash-simulated non-volatile configuration memory.\n';
  output += `Base ethernet MAC Address       : ${state.macAddress}\n`;
  output += 'Motherboard assembly number   : 73-10000-01\n';
  output += `Model number                  : ${switchModel}\n`;
  output += '!\n';

  return { success: true, output };
}

















/**
 * Show Clock
 */
function cmdShowClock(
  state: SwitchState,
  _input: string,
  ctx: CommandContext
): CommandResult {
  const serverIps = state.ntpServers || [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatNtpTime = (ntp: { time: string; date: string }): CommandResult => {
    const [y, m, d] = ntp.date.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m) - 1] || m;
    const dayName = days[new Date(`${y}-${m}-${d}`).getDay()];
    return { success: true, output: `\n*${ntp.time}.000 UTC ${dayName} ${monthName} ${parseInt(d)} ${y}\n` };
  };

  // Try to get time from NTP servers
  for (const serverIp of serverIps) {
    // 1. Try full connectivity check
    if (ctx.devices && ctx.connections && ctx.sourceDeviceId) {
      const reachable = checkConnectivity(
        ctx.sourceDeviceId, serverIp,
        ctx.devices, ctx.connections,
        ctx.deviceStates, ctx.language,
        { protocol: 'udp', port: '123' }
      );
      if (reachable.success) {
        const targetDev = ctx.devices.find((d: CanvasDevice) => d.id === reachable.targetId);
        if (targetDev && targetDev.type !== 'switchL2' && targetDev.type !== 'switchL3' && targetDev.type !== 'router') {
          const ntp = targetDev.services?.ntp;
          if (ntp?.enabled && ntp.date && ntp.time) return formatNtpTime({ time: ntp.time, date: ntp.date });
        }
        if (reachable.targetId && ctx.deviceStates) {
          const serverState = ctx.deviceStates.get(reachable.targetId);
          const toff = serverState?.services?.ntp?.timeOffset;
          if (toff !== undefined) {
            const now = new Date();
            const adj = new Date(now.getTime() + toff);
            return { success: true, output: `\n*${adj.toTimeString().slice(0, 8)}.000 UTC ${days[adj.getDay()]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][adj.getMonth()]} ${adj.getDate()} ${adj.getFullYear()}\n` };
          }
        }
        // reachable but no time data — return real time as synced
        const now = new Date();
        return { success: true, output: `\n*${now.toTimeString().slice(0, 8)}.000 UTC ${days[now.getDay()]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()]} ${now.getDate()} ${now.getFullYear()}\n` };
      }
    }

    // 2. Fallback: find NTP server device by IP directly
    const serverDev = ctx.devices?.find((d) => d.ip === serverIp);
    if (serverDev && serverDev.type !== 'switchL2' && serverDev.type !== 'switchL3' && serverDev.type !== 'router') {
      const ntp = serverDev.services?.ntp;
      if (ntp?.enabled && ntp.date && ntp.time) return formatNtpTime({ time: ntp.time, date: ntp.date });
    }
    if (serverIp && ctx.deviceStates) {
      for (const [, devState] of ctx.deviceStates) {
        if (devState.services?.ntp?.enabled) {
          const ports = Object.values(devState.ports);
          if (ports.some(p => p.ipAddress === serverIp || p.ipv6Address === serverIp)) {
            const toff = devState.services.ntp.timeOffset;
            if (toff !== undefined) {
              const now = new Date();
              const adj = new Date(now.getTime() + toff);
              return { success: true, output: `\n*${adj.toTimeString().slice(0, 8)}.000 UTC ${days[adj.getDay()]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][adj.getMonth()]} ${adj.getDate()} ${adj.getFullYear()}\n` };
            }
          }
        }
      }
    }
  }

  // Fallback: local NTP config
  const localNtp = state.services?.ntp;
  if (localNtp?.enabled) {
    if (localNtp.date && localNtp.time) return formatNtpTime(localNtp as { time: string; date: string });
    if (localNtp.timeOffset !== undefined) {
      const now = new Date();
      const adj = new Date(now.getTime() + localNtp.timeOffset);
      return { success: true, output: `\n*${adj.toTimeString().slice(0, 8)}.000 UTC ${days[adj.getDay()]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][adj.getMonth()]} ${adj.getDate()} ${adj.getFullYear()}\n` };
    }
  }

  // Fallback: systemClock
  if (state.systemClock) {
    const { time, day, month, year } = state.systemClock as { time: string; day: string; month: string; year: string };
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month) + 1;
    const dayName = days[new Date(`${year}-${String(monthIndex).padStart(2, '0')}-${String(day).padStart(2, '0')}`).getDay()];
    return { success: true, output: `\n*${time}.000 UTC ${dayName} ${month} ${parseInt(day)} ${year}\n` };
  }

  // Final fallback: real time
  const now = new Date();
  return { success: true, output: `\n*${now.toTimeString().split(' ')[0]}.000 UTC ${days[now.getDay()]} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()]} ${now.getDate()} ${now.getFullYear()}\n` };
}


/**
 * Show Flash
 */
function cmdShowFlash(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  const { bootImage } = getSwitchDisplayProfile(state);
  let output = '\n-#- --length-- -----date/time------ path\n';
  const staticFiles = [
    { name: 'vlan.dat', length: 616 },
    { name: 'config.text', length: 1599 },
    { name: 'private-config.text', length: 1464 },
    { name: bootImage, length: 3024 },
  ];

  const flashFiles = (state.flashFiles || {}) as Record<string, string[]>;
  const flashBackups: Array<{ name: string; length: number }> = Object.entries(flashFiles).map(
    ([name, lines]) => ({
      name,
      length: Array.isArray(lines) ? lines.join('\n').length : 0,
    })
  );

  const now = new Date();
  const dateText = now.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');

  const files = [...staticFiles, ...flashBackups];
  files.forEach((file, idx) => {
    output += `${String(idx + 1).padEnd(5)} ${String(file.length).padEnd(8)} ${dateText} +00:00  ${file.name}\n`;
  });

  const usedBytes = files.reduce((sum, f) => sum + f.length, 0);
  const totalBytes = 32505856;
  const availableBytes = Math.max(0, totalBytes - usedBytes);
  output += `\n${availableBytes} bytes available (${usedBytes} bytes used)\n`;

  return { success: true, output };
}

/**
 * Show Boot
 */
function cmdShowBoot(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  const { systemImage } = getSwitchDisplayProfile(state);
  let output = `\nBOOT path-list      : ${systemImage}\n`;
  output += 'Config file         : flash:config.text\n';
  output += 'Private Config file : flash:private-config.text\n';
  output += 'Enable Break        : no\n';
  output += 'Manual Boot         : no\n';
  output += 'Allow new Feature   : yes\n';
  output += 'Auto Boot           : no\n';

  return { success: true, output };
}




/**
 * Do Show - Execute show command from config mode
 */
function cmdDoShow(
  state: SwitchState,
  input: string,
  ctx: CommandContext
): CommandResult {
  // Extract the show command from "do show ..." or "do sh ..."
  const match = input.match(/^do\s+(sh(?:ow)?\s+.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid command' };
  }

  let showCommand = match[1];
  // Normalize "sh" to "show"
  if (showCommand.startsWith('sh ')) {
    showCommand = 'show ' + showCommand.substring(3);
  }

  // Parse the show command
  const parts = showCommand.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const subCmd = parts.slice(1).join(' ').toLowerCase();

  // Route to appropriate show handler
  if (cmd === 'show') {
    if (subCmd.startsWith('running-config') || subCmd.startsWith('run')) {
      return cmdShowRunningConfig(state, showCommand, ctx);
    } else if (subCmd.startsWith('startup-config') || subCmd.startsWith('start')) {
      return cmdShowStartupConfig(state, showCommand, ctx);
    } else if (subCmd.startsWith('version') || subCmd.startsWith('ver')) {
      return cmdShowVersion(state, showCommand, ctx);
    } else if (subCmd.startsWith('interfaces') || subCmd.startsWith('int')) {
      return cmdShowInterfaces(state, showCommand, ctx);
    } else if (subCmd.startsWith('interface')) {
      return cmdShowInterface(state, showCommand, ctx);
    } else if (subCmd.startsWith('ip interface brief') || subCmd.startsWith('ip interfaces brief') || subCmd.startsWith('ip int br')) {
      return cmdShowIpInterfaceBrief(state, showCommand, ctx);
    } else if (subCmd.startsWith('ip interface') || subCmd.startsWith('ip int')) {
      return cmdShowIpInterfaceBrief(state, showCommand, ctx);
    } else if (subCmd.startsWith('vlan') || subCmd.startsWith('vl')) {
      return cmdShowVlan(state, showCommand, ctx);
    } else if (subCmd.startsWith('mac address-table') || subCmd.startsWith('mac')) {
      return cmdShowMacAddressTable(state, showCommand, ctx);
    } else if (subCmd.startsWith('cdp neighbors') || subCmd.startsWith('cdp')) {
      return cmdShowCdpNeighbors(state, showCommand, ctx);
    } else if (subCmd.startsWith('ip route') || subCmd.startsWith('ip ro')) {
      return cmdShowIpRoute(state, showCommand, ctx);
    } else if (subCmd.startsWith('clock')) {
      return cmdShowClock(state, showCommand, ctx);
    } else if (subCmd.startsWith('flash')) {
      return cmdShowFlash(state, showCommand, ctx);
    } else if (subCmd.startsWith('boot')) {
      return cmdShowBoot(state, showCommand, ctx);
    } else if (subCmd.startsWith('spanning-tree') || subCmd.startsWith('sp')) {
      return cmdShowSpanningTree(state, showCommand, ctx);
    } else if (subCmd.startsWith('port-security') || subCmd.startsWith('port')) {
      return cmdShowPortSecurity(state, showCommand, ctx);
    } else if (subCmd.startsWith('wireless')) {
      return cmdShowWireless(state, showCommand, ctx);
    } else if (subCmd.startsWith('ssh')) {
      return cmdShowSsh(state, showCommand, ctx);
    } else {
      return { success: false, error: "% Invalid input detected at '^' marker." };
    }
  }

  return { success: false, error: '% Invalid command' };
}

/**
 * Show Wireless - Display WiFi settings
 */
/**
 * Show SSH - Display SSH server configuration and session summary
 */
function cmdShowSsh(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  const version = state.sshVersion || 2;
  const transportInput = state.security?.vtyLines?.transportInput || [];
  const sshEnabled = version > 0 && (transportInput.includes('ssh') || transportInput.includes('all'));
  const timeout = state.sshTimeout || 60;
  const retries = state.sshAuthenticationRetries || 3;
  const domainName = state.domainName || 'not set';

  let output = '\nSSH Server Status\n';
  output += '-----------------\n';
  output += `SSH Version: ${version}\n`;
  output += `SSH Status: ${sshEnabled ? 'enabled' : 'disabled'}\n`;
  output += `Authentication Retries: ${retries}\n`;
  output += `Timeout: ${timeout} seconds\n`;
  output += `Domain Name: ${domainName}\n`;
  output += `VTY Transport Input: ${transportInput.length > 0 ? transportInput.join(' ') : 'none'}\n`;

  const activeSessions = Array.isArray(state.sshSessions) ? state.sshSessions : [];
  const normalizedSessions = activeSessions;

  output += `\nActive SSH Sessions: ${normalizedSessions.length}\n`;
  if (normalizedSessions.length > 0) {
    output += 'Session   User       Source\n';
    output += '--------  ---------  ----------------\n';
    normalizedSessions.forEach((session: { user?: string; source?: string }, index: number) => {
      output += `${String(index + 1).padEnd(8)}  ${(session.user || 'unknown').padEnd(9)}  ${session.source || 'unknown'}\n`;
    });
  }

  output += '!\n';
  return { success: true, output };
}







/**
 * Show MLS QoS
 */
function cmdShowMlsQos(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const enabled = state.mlsQosEnabled ?? false;
  return { success: true, output: `\nQoS is ${enabled ? 'enabled' : 'disabled'}\n` };
}


/**
 * Show Access-Lists
 */
function cmdShowAccessLists(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const hasClassicAcls = !!state.accessLists && Object.keys(state.accessLists).length > 0;
  const firewallRules = Array.isArray(state.firewallRules) ? state.firewallRules : [];
  const hasFirewallAcls = firewallRules.length > 0;

  // Filter by ACL name if specified
  const filterAcl = input.match(/^show\s+access-lists?\s+(\S+)$/i)?.[1];

  if (!hasClassicAcls && !hasFirewallAcls) {
    return { success: true, output: '\n% No access lists configured\n' };
  }

  let output = '\n';

  if (hasClassicAcls) {
    Object.entries(state.accessLists || {}).forEach(([aclId, rules]: [string, string[]]) => {
      if (filterAcl && aclId !== filterAcl) return;

      const isNamed = isNaN(Number(aclId));
      const aclType = isNamed ? (state.namedAclTypes?.[aclId] || 'standard') : (parseInt(aclId) >= 100 ? 'extended' : 'standard');
      output += `${aclType === 'extended' ? 'Extended' : 'Standard'} IP access list ${aclId}\n`;
      rules.forEach((rule: string, ruleIndex: number) => {
        // Parse rule format: "seq permit|deny <conditions>"
        const seqMatch = rule.match(/^(\d+)\s+(.+)$/);
        let seq: string;
        let ruleText: string;
        if (seqMatch) {
          seq = seqMatch[1];
          ruleText = seqMatch[2];
        } else {
          seq = String((ruleIndex + 1) * 10);
          ruleText = rule;
        }
        const matches = state.aclMatchCounters?.[aclId]?.[ruleIndex] || 0;
        output += `    ${seq.padEnd(5)} ${ruleText} (${matches} ${matches === 1 ? 'match' : 'matches'})\n`;
      });
    });
  }

  if (hasFirewallAcls) {
    if (!filterAcl || filterAcl === 'OUTSIDE-IN') {
      output += 'access-list OUTSIDE-IN\n';
      firewallRules.forEach((rule: { enabled?: boolean; protocol?: string; action: string; sourceIp: string; targetIp: string; port: string | number }, index: number) => {
        const inactive = rule.enabled === false ? 'inactive ' : '';
        const protocol = rule.protocol === 'any' ? 'ip' : (rule.protocol || 'ip');
        output += `    line ${index + 1} extended ${inactive}${rule.action} ${protocol} ${rule.sourceIp} ${rule.targetIp} eq ${rule.port}\n`;
      });
    }
  }

  return { success: true, output };
}

/**
 * Show History
 */
function cmdShowHistory(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const history = state.commandHistory || [];
  let output = '\n';
  history.slice(-20).forEach((cmd: string) => { output += `  ${cmd}\n`; });
  return { success: true, output };
}

/**
 * Show Users
 */
function cmdShowUsers(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\n    Line       User       Host(s)              Idle       Location\n';
  output += '*   0 con 0                idle                 00:00:00\n';
  return { success: true, output };
}

/**
 * Show Environment
 */
function cmdShowEnvironment(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nSystem Temperature Value: 36 Degree Celsius\nSystem Temperature State: GREEN\nYellow Threshold : 46 Degree Celsius\nRed Threshold    : 56 Degree Celsius\n' };
}

/**
 * Show Inventory
 */
function cmdShowInventory(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const profile = getSwitchDisplayProfile(state);
  return { success: true, output: `\nNAME: "1", DESCR: "${profile.switchModel}"\nPID: ${profile.switchModel}  , VID: V01, SN: ${state.version?.serialNumber || 'FOC0000X000'}\n` };
}

/**
 * Show Errdisable Recovery
 */
function cmdShowErrdisableRecovery(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nErrDisable Reason            Timer Status\n-----------------            --------------\nbpduguard                    Disabled\npsecure-violation            Disabled\nport-security                Disabled\n\nTimer interval: 300 seconds\n' };
}

/**
 * Show Storm-Control
 */
function cmdShowStormControl(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/show\s+storm-control\s+(?:interface\s+)?(\S+)?/i);
  const interfaceName = match?.[1];

  if (interfaceName) {
    const port = (state.ports || {})[interfaceName.toLowerCase()];
    if (!port) {
      return { success: false, error: `% Interface ${interfaceName} not found` };
    }

    let output = `\nStorm Control for interface ${interfaceName}\n`;
    const sc = port.stormControl;

    if (!sc || (!sc.broadcast?.enabled && !sc.multicast?.enabled && !sc.unicast?.enabled)) {
      output += '  Storm control is not enabled on this interface\n';
    } else {
      if (sc.broadcast?.enabled) {
        output += `  Broadcast:\n`;
        output += `    Status: enabled\n`;
        output += `    Threshold: ${sc.broadcast.threshold || 'unlimited'}\n`;
        output += `    Action: ${sc.broadcast.action || 'shutdown'}\n`;
      }
      if (sc.multicast?.enabled) {
        output += `  Multicast:\n`;
        output += `    Status: enabled\n`;
        output += `    Threshold: ${sc.multicast.threshold || 'unlimited'}\n`;
        output += `    Action: ${sc.multicast.action || 'shutdown'}\n`;
      }
      if (sc.unicast?.enabled) {
        output += `  Unicast:\n`;
        output += `    Status: enabled\n`;
        output += `    Threshold: ${sc.unicast.threshold || 'unlimited'}\n`;
        output += `    Action: ${sc.unicast.action || 'shutdown'}\n`;
      }
    }
    output += '!\n';
    return { success: true, output };
  }

  // Global storm control list
  let output = '\nInterface   Broadcast      Multicast       Unicast\n';
  output += '---------   ----------     ----------     ----------\n';
  Object.keys(state.ports || {}).forEach(portName => {
    const port = (state.ports || {})[portName];
    const sc = port.stormControl;
    const bc = sc?.broadcast?.enabled ? 'enabled' : 'disabled';
    const mc = sc?.multicast?.enabled ? 'enabled' : 'disabled';
    const uc = sc?.unicast?.enabled ? 'enabled' : 'disabled';
    output += `${portName.padEnd(10)}${bc.padEnd(16)}${mc.padEnd(16)}${uc}\n`;
  });
  output += '!\n';
  return { success: true, output };
}

/**
 * Show UDLD
 */
function cmdShowUdld(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/show\s+udld\s+(?:interface\s+)?(\S+)?/i);
  const interfaceName = match?.[1];

  let output = '\nGlobal UDLD information\n';
  output += '  Message interval: 15 seconds\n';
  output += '  Time out interval: 5 seconds\n';
  output += '  Mode: normal\n\n';

  if (interfaceName) {
    const port = (state.ports || {})[interfaceName.toLowerCase()];
    if (!port) {
      return { success: false, error: `% Interface ${interfaceName} not found` };
    }

    output += `UDLD Status for interface ${interfaceName}\n`;
    const udld = port.udld;
    output += `  Admin: ${udld?.enabled ? 'enabled' : 'disabled'}\n`;
    output += `  Mode: ${udld?.mode || 'normal'}\n`;
    output += `  Bidirectional Status: ${udld?.bidirectionalStatus || 'unknown'}\n`;
    output += `  Last Probe Time: ${udld?.lastProbeTime ? new Date(udld.lastProbeTime).toLocaleString() : 'never'}\n`;
  } else {
    output += 'Interface        Admin  State\n';
    output += '--------         -----  -----\n';
    Object.keys(state.ports || {}).forEach(portName => {
      const port = (state.ports || {})[portName];
      if (port && port.udld) {
        const admin = port.udld.enabled ? 'enable' : 'disable';
        const state = port.udld.bidirectionalStatus || 'unknown';
        output += `${portName.padEnd(16)}${admin.padEnd(7)}${state}\n`;
      }
    });
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show Monitor (SPAN)
 */
function cmdShowMonitor(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n% No SPAN sessions configured\n' };
}

/**
 * Show Debug
 */
function cmdShowDebug(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nAll possible debugging has been turned off\n' };
}

/**
 * Show Processes
 */
function cmdShowProcesses(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nCPU utilization for five seconds: 1%/0%; one minute: 1%; five minutes: 1%\n' };
}

/**
 * Show Memory
 */
function cmdShowMemory(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n                Head    Total(b)     Used(b)     Free(b)   Lowest(b)  Largest(b)\nProcessor  65536000    65536000     8192000    57344000    57344000    57344000\n' };
}

/**
 * Show SDM Prefer
 */
function cmdShowSdmPrefer(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const template = state.sdmTemplate || 'default';
  let output = `\nThe current template is "${template}" template.\n`;
  if (template === 'lanbase-routing' || template === 'routing') {
    output += ` The selected template optimizes the resources in\n the switch to support this level of features for\n 16384 IPv4 ACL entries, 2048 QoS labels, 16384 IPv4 Multicast entries.\n`;
  } else if (template === 'lanbase') {
    output += ` The selected template optimizes the resources in\n the switch to support this level of features for\n 8192 IPv4 ACL entries, 2048 QoS labels, 2048 IPv4 Multicast entries.\n`;
  } else if (template === 'desktop') {
    output += ` The selected template optimizes the resources in\n the switch to support this level of features for\n 4096 IPv4 ACL entries, 512 QoS labels, 256 IPv4 Multicast entries.\n`;
  } else {
    output += ` The selected template optimizes the resources in\n the switch to support this level of features for\n 8 routed interfaces and 1024 VLANs.\n`;
  }
  return { success: true, output };
}

/**
 * Show System MTU
 */
function cmdShowSystemMtu(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nSystem MTU size is 1500 bytes\nSystem Jumbo MTU size is 1500 bytes\nRouting MTU size is 1500 bytes\n' };
}




/**
 * Show parent command (incomplete)
 */
function cmdShowParent(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: false, error: IOS_ERRORS.incomplete };
}






/**
 * Show Auth
 */
function cmdShowAuth(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nNo active authentication sessions.\n' };
}

/**
 * Show Sessions
 */
function cmdShowSessions(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n% No active sessions.\n' };
}

/**
 * Show NTP
 */
function cmdShowNtp(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  const servers = state.ntpServers || [];
  if (servers.length === 0) {
    return { success: true, output: '\nNTP is not enabled.\n' };
  }

  let output = '\nClock is synchronized, stratum 2, reference is .GPS.\n';
  output += ' actual frequency: 0.0000 Hz, precision: 2**10\n';
  output += ' reference time: ...\n';
  output += ' clock offset: 0.0000 msec, root delay: 1.23 msec\n';
  output += ' root dispersion: 3.45 msec, peer dispersion: 0.00 msec\n';
  output += ' loopfilter state: \'CTRL\' (Normal), drift: 0.00000000 s/s\n';
  output += ' system poll interval: 64 s, last update: 10 sec ago\n';
  output += `\n  NTP servers configured:\n\n`;

  for (const ip of servers) {
    const matchedDevice = ctx.devices?.find((d) => d.ip === ip);
    const isReachable = matchedDevice ? true : false;
    output += `  ${ip} ${isReachable ? '... reachable, syncing' : '... unreachable'}\n`;
  }

  output += '\n';
  return { success: true, output };
}

/**
 * Show SNMP
 */
function cmdShowSnmp(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nSNMP agent not enabled.\n' };
}

/**
 * Show Policy Map
 */
function cmdShowPolicyMap(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n% No policy maps configured.\n' };
}

/**
 * Show Class Map
 */
function cmdShowClassMap(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n% No class maps configured.\n' };
}

/**
 * Show MAC ACL
 */
function cmdShowMacAcl(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n% No MAC access lists configured.\n' };
}


/**
 * Show Diagnostic
 */
function cmdShowDiag(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nDiagnostic results: PASS\n' };
}

/**
 * Show Privilege
 */
function cmdShowPrivilege(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const level = state.currentMode === 'privileged' ? 15 : 1;
  return { success: true, output: `\nCurrent privilege level is ${level}\n` };
}


/**
 * Show Banner MOTD
 */
function cmdShowBannerMotd(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: state.bannerMOTD ? `\n${state.bannerMOTD}\n` : '\n% Banner not set\n' };
}

/**
 * Show Alias
 */
function cmdShowAlias(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nExec aliases:\n';
  const builtIn: Record<string, string> = { 'h': 'show history', 'lo': 'exit' };
  const allAliases = { ...builtIn, ...(state.execAliases || {}) };
  if (Object.keys(allAliases).length === 0) {
    output += '  (none)\n';
  } else {
    for (const [name, cmd] of Object.entries(allAliases)) {
      output += `  ${name.padEnd(20)} ${cmd}\n`;
    }
  }
  return { success: true, output };
}

/**
 * Show Redundancy
 */
function cmdShowRedundancy(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nRedundancy mode: NON-REDUNDANT\n' };
}

/**
 * Show Archive
 */
function cmdShowArchive(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nArchive configuration is not enabled.\n' };
}


/**
 * Show Policy Map Interface
 */
function cmdShowPolicyMapInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/show\s+policy-map\s+interface\s+(\S+)?/i);
  const interfaceName = match?.[1];

  let output = '';

  if (interfaceName) {
    const port = (state.ports || {})[interfaceName.toLowerCase()];
    if (!port) {
      return { success: false, error: `% Interface ${interfaceName} not found` };
    }

    if (!port.qos?.policyMap) {
      output += `\nInterface ${interfaceName}\n`;
      output += `  Service Policy output: not configured\n`;
      output += `  Service Policy input: not configured\n`;
    } else {
      output += `\nInterface ${interfaceName}\n`;
      output += `  Service Policy output: ${port.qos.policyMap}\n`;
      if (port.qos.enabled) {
        output += `    Class ${port.qos.policyMap}\n`;
        output += `      Output Queue: ${port.qos.egressQueue || 40}\n`;
        if (port.qos.shaping?.enabled) {
          output += `      Shaping rate: ${port.qos.shaping.rate} bps\n`;
        }
        if (port.qos.policing?.enabled) {
          output += `      Police rate: ${port.qos.policing.rate} bps\n`;
        }
      }
    }
  } else {
    output += '\nPolicy Map output\n';
    output += '  No configured policy maps\n';
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show QoS Interface
 */
function cmdShowQosInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/show\s+qos\s+interface\s+(\S+)?/i);
  const interfaceName = match?.[1];

  let output = '';

  if (interfaceName) {
    const port = (state.ports || {})[interfaceName.toLowerCase()];
    if (!port) {
      return { success: false, error: `% Interface ${interfaceName} not found` };
    }

    output += `\nInterface ${interfaceName}\n`;
    output += `QoS is ${port.qos?.enabled ? 'enabled' : 'disabled'}\n`;

    if (port.qos?.enabled) {
      output += `  Queue Strategy: FIFO\n`;
      output += `  Egress Queue Depth: ${port.qos.egressQueue || 40}\n`;
      output += `  Ingress Queue Depth: ${port.qos.ingressQueue || 75}\n`;

      if (port.qos.shaping?.enabled) {
        output += `  Traffic Shaping:\n`;
        output += `    Rate: ${port.qos.shaping.rate} bits/sec\n`;
      }

      if (port.qos.policing?.enabled) {
        output += `  Traffic Policing:\n`;
        output += `    Rate: ${port.qos.policing.rate} bits/sec\n`;
        output += `    Burst: ${port.qos.policing.burst} bytes\n`;
      }

      if (port.qos.priorityQueue?.enabled) {
        output += `  Priority Queue: enabled\n`;
        output += `    Limit: ${port.qos.priorityQueue.limit || 'unlimited'}\n`;
      }
    }
  } else {
    output += '\nInterface         QoS Status\n';
    output += '----------        ----------\n';
    Object.keys(state.ports || {}).forEach(portName => {
      const port = (state.ports || {})[portName];
      output += `${portName.padEnd(18)}${port.qos?.enabled ? 'enabled' : 'disabled'}\n`;
    });
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show Queueing Interface
 */
function cmdShowQueuingInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/show\s+queuing\s+interface\s+(\S+)?/i);
  const interfaceName = match?.[1];

  let output = '';

  if (interfaceName) {
    const port = (state.ports || {})[interfaceName.toLowerCase()];
    if (!port) {
      return { success: false, error: `% Interface ${interfaceName} not found` };
    }

    output += `\nInterface ${interfaceName}\n`;
    output += `  Queueing Strategy: FIFO\n`;
    output += `  Output Queue: ${port.qos?.egressQueue || 40} (max threshold)\n`;
    output += `  Input Queue: ${port.qos?.ingressQueue || 75} (max threshold)\n`;

    const stats = port.statistics || {};
    output += `\nQueue Statistics:\n`;
    output += `  Enqueued: ${stats.outputPackets || 0} packets\n`;
    output += `  Dropped: ${stats.drops || 0} packets\n`;
    output += `  Overruns: ${stats.overruns || 0}\n`;

    if (port.qos?.priorityQueue?.enabled) {
      output += `\nPriority Queue:\n`;
      output += `  Status: enabled\n`;
      output += `  Limit: ${port.qos.priorityQueue.limit || 'unlimited'}\n`;
    }
  } else {
    output += '\nInterface         Queue Strategy  Threshold\n';
    output += '----------        --------------  ---------\n';
    Object.keys(state.ports || {}).forEach(portName => {
      const port = (state.ports || {})[portName];
      const threshold = port.qos?.egressQueue || 40;
      output += `${portName.padEnd(18)}FIFO             ${threshold}\n`;
    });
  }

  output += '!\n';
  return { success: true, output };
}



/**
 * Show Dot11 Associations (wireless clients)
 */






