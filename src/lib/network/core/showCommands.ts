import { IOS_ERRORS, iosModeError } from './iosErrors';
import type { CommandHandler } from './commandTypes';
import { ensureDeviceStatesMap } from '../networkUtils';
import { isRouterModel } from '../switchModels';
import { buildRunningConfig } from './configBuilder';

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
  'show lldp': cmdShowLldp,
  'show banner motd': cmdShowBannerMotd,
  'show alias': cmdShowAlias,
  'show redundancy': cmdShowRedundancy,
  'show archive': cmdShowArchive,
  'show ip protocols': cmdShowIpProtocols,
  'show ip ospf neighbor': cmdShowIpOspfNeighbor,
  'show ip ospf': cmdShowIpOspf,
  'show ip ospf interface': cmdShowIpOspfInterface,
  'show standby': cmdShowStandby,
  'show hosts': cmdShowHosts,
};

function isPhysicalEthernetPort(portId: string): boolean {
  const p = portId.toLowerCase();
  return (p.startsWith('fa') || p.startsWith('gi')) && !p.includes('.') && !p.startsWith('vlan') && !p.startsWith('wlan') && p !== 'console';
}

function isDtpCapableMode(mode: any): mode is 'trunk' | 'dynamic-auto' | 'dynamic-desirable' {
  return mode === 'trunk' || mode === 'dynamic-auto' || mode === 'dynamic-desirable';
}

function getAllowedVlansString(port: any): string {
  const allowed = port?.allowedVlans ?? port?.trunkAllowedVlans;
  if (!allowed) return '1-4094';
  if (Array.isArray(allowed)) return allowed.join(',');
  if (allowed === 'all') return '1-4094';
  return String(allowed);
}

function getNativeVlanString(port: any): string {
  const native = port?.nativeVlan;
  return native ? String(native) : '1';
}

function getSTPCost(port: any): number {
  if (!port) return 19;
  // If manual STP cost is set, use it
  if (port.stpCost !== undefined) {
    return port.stpCost;
  }

  // Calculate cost based on actual speed (IEEE 802.1D standard)
  const speed = port.speed;
  if (speed === '10000') return 2;
  if (speed === '1000') return 4;
  if (speed === '100') return 19;
  if (speed === '10') return 100;

  // Fallback to port type if speed is auto or unknown
  if (port.type === 'gigabitethernet') return 4;
  return 19;
}

function getSwitchDisplayProfile(state: any) {
  const switchModel = state.switchModel || 'WS-C2960-24TT-L';
  const modelName = state.version?.modelName || '';
  const isRouter = isRouterModel(modelName) || isRouterModel(switchModel);
  const isL3 = switchModel === 'WS-C3650-24PS' || (isRouter && !switchModel.includes('2960'));
  const isFirewall = state.deviceType === 'firewall' || state.switchLayer === 'FW' || modelName.includes('ASA') || modelName.includes('Firepower');

  if (isFirewall) {
    const reportedGiCount = 2;

    return {
      switchModel: 'ASA 5506-X',
      isL3: false,
      isRouter: false,
      bootImage: 'asa-software.bin',
      softwareImage: 'Adaptive Security Appliance Software',
      rom: 'ASA boot loader',
      bootldr: 'ASA Boot Loader',
      systemImage: 'flash:asa-software.bin',
      processor: 'ASA 5506-X (Intel Celeron) processor (revision 01) with 8192K bytes of memory',
      reportedFeCount: 0,
      reportedGiCount,
    };
  }

  if (isRouter) {
    return {
      switchModel: modelName,
      isL3: true,
      isRouter: true,
      bootImage: 'router-software.bin',
      softwareImage: 'Network Simulator IOS Software, Version 1.0',
      rom: 'Router boot loader',
      bootldr: 'Router Boot Loader',
      systemImage: 'flash:router-software.bin',
      processor: `${modelName} (PowerPC405) processor (revision 01) with 4096K bytes of memory`,
      reportedFeCount: 0,
      reportedGiCount: 4,
    };
  }

  return {
    switchModel,
    isL3,
    isRouter: false,
    bootImage: isL3 ? 'l3switch-software.bin' : 'l2switch-software.bin',
    softwareImage: isL3 ? 'L3 Switch Software' : 'L2 Switch Software',
    rom: isL3 ? 'L3 Switch boot loader' : 'L2 Switch boot loader',
    bootldr: isL3 ? 'L3 Switch Boot Loader' : 'L2 Switch Boot Loader',
    systemImage: isL3 ? 'flash:l3switch-software.bin' : 'flash:l2switch-software.bin',
    processor: isL3 ? 'WS-C3650-24PS (PowerPC405) processor (revision 01) with 131072K bytes of memory' : 'WS-C2960-24TT-L (PowerPC405) processor (revision C0) with 65536K bytes of memory',
    reportedFeCount: isL3 ? 0 : 24,
    reportedGiCount: isL3 ? 28 : 2,
  };
}

/**
 * Show - Display summary information
 */
function cmdShow(
  state: any,
  input: string,
  ctx: any
): any {
  return { success: false, error: '% Incomplete command. Use "show ?" for available show commands' };
}

/**
 * Show Running Configuration
 */
function cmdShowRunningConfig(
  state: any,
  input: string,
  ctx: any
): any {
  // Check if specific interface is requested via interface keyword in parser
  const match = input.match(/show\s+(?:running-config|run|running)(?:\s+interface\s+(\S+))?/i);
  const interfaceName = match?.[1];

  if (interfaceName) {
    return cmdShowRunningConfigInterface(state, input, ctx);
  }

  let output = '\nBuilding configuration...\n\n';
  const lines = buildRunningConfig(state as any);
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
  state: any,
  input: string,
  ctx: any
): any {
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

  const lines = buildRunningConfig(state as any);
  const interfaceLines: string[] = [];
  let inInterface = false;

  const searchName = `interface ${interfaceName}`;
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
  state: any,
  input: string,
  ctx: any
): any {
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
    vlanIds.forEach(vlanId => {
      const vlan = startupVlans[vlanId];
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
 * Show IP OSPF Interface
 */
function cmdShowIpOspfInterface(state: any, input: string, ctx: any): any {
  if (state.routingProtocol !== 'ospf') {
    return { success: true, output: '\n% OSPF is not enabled\n' };
  }

  const match = input.match(/show\s+ip\s+ospf\s+interface\s*(\S+)?/i);
  const interfaceName = match?.[1];

  let output = '\n';

  const portEntries = interfaceName
    ? (state.ports?.[interfaceName.toLowerCase()] ? [[interfaceName.toLowerCase(), state.ports[interfaceName.toLowerCase()]]] : [])
    : Object.entries(state.ports || {});

  if (interfaceName && portEntries.length === 0) {
    return { success: false, error: `% Interface ${interfaceName} not found` };
  }

  let found = false;
  (portEntries as [string, any][]).forEach(([name, port]) => {
    if (port.ipAddress && !port.shutdown) {
      found = true;
      output += `${name} is up, line protocol is up\n`;
      output += `  Internet Address ${port.ipAddress}/${getPrefixLength(port.subnetMask)}, Area 0\n`;
      output += `  Process ID 1, Router ID ${state.ip || '192.168.1.1'}, Network Type BROADCAST, Cost: ${getSTPCost(port)}\n`;
      output += `  Transmit Delay is 1 sec, State DR, Priority 1\n`;
      output += `  Designated Router (ID) ${state.ip || '192.168.1.1'}, Interface address ${port.ipAddress}\n`;
      output += `  Backup Designated router (ID) 0.0.0.0, Interface address 0.0.0.0\n`;
      output += `  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5\n`;
      output += `    Hello due in 00:00:07\n`;
      output += `  Index 1/1, flood queue length 0\n`;
      output += `  Next 0x0(0)/0x0(0)\n`;
      output += `  Last flood scan length is 0, maximum is 0\n`;
      output += `  Last flood scan time is 0 msec, maximum is 0 msec\n`;
      output += `  Neighbor Count is 0, Adjacent neighbor count is 0\n`;
      output += `  Suppress hello for 0 neighbor(s)\n\n`;
    }
  });

  if (!found) {
    output += '% OSPF not enabled on any interface\n';
  }

  return { success: true, output };
}

/**
 * Show Version
 */
function cmdShowVersion(
  state: any,
  input: string,
  ctx: any
): any {
  const { switchModel, softwareImage, rom, bootldr, systemImage, processor, reportedFeCount, reportedGiCount } = getSwitchDisplayProfile(state);

  const wlanPortCount = Object.values(state.ports || {}).filter((p: any) => (p?.id || '').startsWith('wlan')).length;

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
 * Show Interfaces
 */
function cmdShowInterfaces(
  state: any,
  input: string,
  ctx: any
): any {
  let output = '';

  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    const description = port.description || port.name || '';
    const stats = port.statistics || {};

    // Admin and operational status
    const adminStatus = port.adminStatus || (port.shutdown ? 'down' : 'up');
    const operStatus = port.operStatus || (port.shutdown ? 'down' : 'up');
    const lineProtocol = port.lineProtocol || (port.shutdown ? 'down' : 'up');

    output += `${portName} is ${adminStatus}, line protocol is ${lineProtocol}\n`;

    const hardwareType = port.type === 'gigabitethernet' ? 'Gigabit Ethernet' : 'Fast Ethernet';
    output += `  Hardware is ${hardwareType}, address is ${port.macAddress || '0000.0000.0000'}\n`;

    if (port.ipAddress && port.subnetMask) {
      output += `  Internet address is ${port.ipAddress}/${port.subnetMask}\n`;
    }

    output += `  Description: ${description}\n`;

    // MTU and Bandwidth
    const mtu = port.mtu || 1500;
    const bandwidth = port.bandwidth || (port.type === 'gigabitethernet' ? 1000000 : 100000);
    output += `  MTU ${mtu} bytes, BW ${bandwidth} Kbit/sec\n`;

    // Speed and Duplex
    const actualSpeed = port.speed === 'auto' ? (port.type === 'gigabitethernet' ? '1000' : '100') : port.speed;
    const duplexMode = port.duplex === 'half' ? 'Half' : 'Full';
    output += `  ${duplexMode}-duplex, ${actualSpeed}Mb/s\n`;

    // Encapsulation for trunks
    if (port.mode === 'trunk' && port.encapsulation) {
      output += `  Encapsulation ${port.encapsulation}\n`;
    }

    output += `  input flow-control is off, output flow-control is unsupported\n`;
    output += `  ARP type: ARPA, ARP Timeout ${port.arpTimeout || '04:00:00'}\n`;

    // Last input/output times
    const lastInput = stats.lastInput ? new Date(stats.lastInput).toLocaleTimeString() : 'never';
    const lastOutput = stats.lastOutput ? new Date(stats.lastOutput).toLocaleTimeString() : 'never';
    output += `  Last input ${lastInput}, last output ${lastOutput}, output hang never\n`;

    // Queueing strategy
    const ingressQ = port.qos?.ingressQueue || 75;
    const egressQ = port.qos?.egressQueue || 40;
    output += `  Queueing strategy: fifo\n`;
    output += `  Output queue 0/${egressQ}, ${stats.drops || 0} drops; input queue 0/${ingressQ}, ${stats.drops || 0} drops\n`;

    output += `  5 minute input rate ${stats.inputBytes || 0} bits/sec, ${stats.inputPackets || 0} packets/sec\n`;
    output += `  5 minute output rate ${stats.outputBytes || 0} bits/sec, ${stats.outputPackets || 0} packets/sec\n`;

    // Statistics section
    output += `     ${stats.inputPackets || 0} packets input, ${stats.inputBytes || 0} bytes, 0 no buffer\n`;
    output += `     Received 0 broadcasts, ${stats.runts || 0} runts, ${stats.giants || 0} giants, ${stats.throttles || 0} throttles\n`;
    output += `     ${stats.inputErrors || 0} input errors, ${stats.crcErrors || 0} CRC, 0 frame, ${stats.overruns || 0} overrun, 0 ignored\n`;
    output += `     0 watchdog, 0 multicast, 0 pause input\n`;
    output += `     ${stats.outputPackets || 0} packets output, ${stats.outputBytes || 0} bytes, ${stats.underruns || 0} underruns\n`;
    output += `     ${stats.outputErrors || 0} output errors, ${stats.collisions || 0} collisions, ${stats.resets || 1} interface resets\n`;
    output += `     0 unknown protocol, ${stats.drops || 0} dropped\n`;
    output += `     0 babbles, 0 late collision, 0 deferred\n`;
    output += `     0 lost carrier, 0 no carrier, 0 PAUSE output\n`;
    output += '!\n\n';
  });

  return { success: true, output };
}

/**
 * Show Interface (specific)
 */
function cmdShowInterface(
  state: any,
  input: string,
  ctx: any
): any {
  const match = input.match(/^show\s+interface\s+(.+)$/i);
  if (!match) {
    return cmdShowInterfaces(state, input, ctx);
  }

  let requestedInterface = match[1].trim().toLowerCase();
  const originalInterface = match[1].trim();

  // Handle VLAN interfaces (SVI)
  if (/^vlan\s+\d+$/i.test(requestedInterface)) {
    const vlanId = parseInt(requestedInterface.replace(/\D/g, ''));
    const vlan = (state.vlans || {})[vlanId];

    if (!vlan) {
      return { success: false, error: `% Interface ${originalInterface} not found` };
    }

    // Extract IP address from running config if available
    let ipAddress = '';
    let subnetMask = '';
    const runningConfig = state.runningConfig || [];
    let inVlanInterface = false;

    for (const line of runningConfig) {
      if (line.toLowerCase().startsWith('interface vlan')) {
        const configVlanId = parseInt(line.replace(/\D/g, ''));
        inVlanInterface = (configVlanId === vlanId);
      } else if (inVlanInterface) {
        if (line.toLowerCase().startsWith('ip address')) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            ipAddress = parts[2];
            subnetMask = parts[3];
          }
        } else if (line === '!') {
          inVlanInterface = false;
        }
      }
    }

    let output = '';
    const isUp = vlan.status === 'active' && ipAddress;
    output += `Vlan${vlanId} is ${isUp ? 'up' : 'administratively down'}, line protocol is ${isUp ? 'up' : 'down'}\n`;
    output += `  Hardware is EtherSVI, address is ${state.macAddress || '0000.0000.0000'}\n`;
    if (ipAddress && subnetMask) {
      output += `  Internet address is ${ipAddress}/${subnetMask}\n`;
    }
    output += `  Description: ${vlan.name}\n`;
    const mtu = 1500;
    const bandwidth = 1000000;
    output += `  MTU ${mtu} bytes, BW ${bandwidth} Kbit/sec\n`;
    output += `  ARP type: ARPA, ARP Timeout 04:00:00\n`;
    output += `  Last input never, last output never, output hang never\n`;
    output += `  Queueing strategy: fifo\n`;
    output += `  Output queue 0/40, 0 drops; input queue 0/75, 0 drops\n`;
    output += `  5 minute input rate 0 bits/sec, 0 packets/sec\n`;
    output += `  5 minute output rate 0 bits/sec, 0 packets/sec\n`;
    output += `     0 packets input, 0 bytes, 0 no buffer\n`;
    output += `     Received 0 broadcasts, 0 runts, 0 giants, 0 throttles\n`;
    output += `     0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored\n`;
    output += `     0 watchdog, 0 multicast, 0 pause input\n`;
    output += `     0 packets output, 0 bytes, 0 underruns\n`;
    output += `     0 output errors, 0 collisions, 1 interface resets\n`;
    output += `     0 unknown protocol, 0 dropped\n`;
    output += `     0 babbles, 0 late collision, 0 deferred\n`;
    output += `     0 lost carrier, 0 no carrier, 0 PAUSE output\n`;
    output += '!\n\n';

    return { success: true, output };
  }

  // Handle physical interfaces
  if (/^vlan\s+\d+$/i.test(requestedInterface)) {
    requestedInterface = requestedInterface.replace(/\s+/g, '');
  }

  const port = (state.ports || {})[requestedInterface];
  if (!port) {
    return { success: false, error: `% Interface ${originalInterface} not found` };
  }

  const description = port.description || port.name || '';
  let output = '';
  output += `${requestedInterface} is ${port.shutdown ? 'administratively down' : 'up'}, line protocol is ${port.shutdown ? 'down' : 'up'}\n`;
  const hardwareType = port.type === 'gigabitethernet' ? 'Gigabit Ethernet' : 'Fast Ethernet';
  output += `  Hardware is ${hardwareType}, address is ${port.macAddress || '0000.0000.0000'}\n`;
  if (port.ipAddress && port.subnetMask) {
    output += `  Internet address is ${port.ipAddress}/${port.subnetMask}\n`;
  }
  output += `  Description: ${description}\n`;

  const stats = port.statistics || {};
  const mtu = port.mtu || 1500;
  const bandwidth = port.bandwidth || (port.type === 'gigabitethernet' ? 1000000 : 100000);
  output += `  MTU ${mtu} bytes, BW ${bandwidth} Kbit/sec\n`;

  const actualSpeed = port.speed === 'auto' ? (port.type === 'gigabitethernet' ? '1000' : '100') : port.speed;
  const duplexMode = port.duplex === 'half' ? 'Half' : 'Full';
  output += `  ${duplexMode}-duplex, ${actualSpeed}Mb/s\n`;

  if (port.mode === 'trunk' && port.encapsulation) {
    output += `  Encapsulation ${port.encapsulation}\n`;
  }

  output += `  input flow-control is off, output flow-control is unsupported\n`;
  output += `  ARP type: ARPA, ARP Timeout ${port.arpTimeout || '04:00:00'}\n`;

  const lastInput = stats.lastInput ? new Date(stats.lastInput).toLocaleTimeString() : 'never';
  const lastOutput = stats.lastOutput ? new Date(stats.lastOutput).toLocaleTimeString() : 'never';
  output += `  Last input ${lastInput}, last output ${lastOutput}, output hang never\n`;

  const ingressQ = port.qos?.ingressQueue || 75;
  const egressQ = port.qos?.egressQueue || 40;
  output += `  Queueing strategy: fifo\n`;
  output += `  Output queue 0/${egressQ}, ${stats.drops || 0} drops; input queue 0/${ingressQ}, ${stats.drops || 0} drops\n`;

  output += `  5 minute input rate ${stats.inputBytes || 0} bits/sec, ${stats.inputPackets || 0} packets/sec\n`;
  output += `  5 minute output rate ${stats.outputBytes || 0} bits/sec, ${stats.outputPackets || 0} packets/sec\n`;

  output += `     ${stats.inputPackets || 0} packets input, ${stats.inputBytes || 0} bytes, 0 no buffer\n`;
  output += `     Received 0 broadcasts, ${stats.runts || 0} runts, ${stats.giants || 0} giants, ${stats.throttles || 0} throttles\n`;
  output += `     ${stats.inputErrors || 0} input errors, ${stats.crcErrors || 0} CRC, 0 frame, ${stats.overruns || 0} overrun, 0 ignored\n`;
  output += `     0 watchdog, 0 multicast, 0 pause input\n`;
  output += `     ${stats.outputPackets || 0} packets output, ${stats.outputBytes || 0} bytes, ${stats.underruns || 0} underruns\n`;
  output += `     ${stats.outputErrors || 0} output errors, ${stats.collisions || 0} collisions, ${stats.resets || 1} interface resets\n`;
  output += `     0 unknown protocol, ${stats.drops || 0} dropped\n`;
  output += `     0 babbles, 0 late collision, 0 deferred\n`;
  output += `     0 lost carrier, 0 no carrier, 0 PAUSE output\n`;
  output += '!\n\n';

  return { success: true, output };
}

/**
 * Show Interface Trunk
 */
function cmdShowInterfaceTrunk(
  state: any,
  input: string,
  ctx: any
): any {
  const connections = ctx.connections || [];
  const sourceDeviceId = ctx.sourceDeviceId;

  const portIds = Object.keys(state.ports || {}).filter(isPhysicalEthernetPort);

  const hasActiveConnection = (portId: string) =>
    connections.some((conn: any) =>
      (conn.sourceDeviceId === sourceDeviceId && conn.sourcePort === portId) ||
      (conn.targetDeviceId === sourceDeviceId && conn.targetPort === portId)
    );

  const getPeerPortState = (portId: string) => {
    const conn = connections.find((c: any) =>
      (c.sourceDeviceId === sourceDeviceId && c.sourcePort === portId) ||
      (c.targetDeviceId === sourceDeviceId && c.targetPort === portId)
    );
    if (!conn) return null;
    const peerDeviceId = conn.sourceDeviceId === sourceDeviceId ? conn.targetDeviceId : conn.sourceDeviceId;
    const peerPortId = conn.sourceDeviceId === sourceDeviceId ? conn.targetPort : conn.sourcePort;
    const peerState = ctx.deviceStates?.get(peerDeviceId);
    const peerPort = peerState?.ports?.[peerPortId];
    return { peerPortId, peerPort };
  };

  // Only include ports that are actually trunking (not just DTP-capable)
  const trunkPorts = portIds.filter((portId) => {
    const port = state.ports?.[portId];
    if (!isDtpCapableMode(port?.mode)) return false;

    const connected = hasActiveConnection(portId);
    const peer = connected ? getPeerPortState(portId) : null;
    const peerCapable = peer?.peerPort ? isDtpCapableMode(peer.peerPort.mode) : false;
    const isActuallyTrunking = connected && (port.mode === 'trunk' || peerCapable);

    return isActuallyTrunking;
  });

  if (trunkPorts.length === 0) {
    return { success: true, output: '\nNo trunking ports found\n!\n' };
  }

  let output = '\nPort        Mode         Encapsulation  Status        Native vlan\n';

  trunkPorts.forEach((portId) => {
    const port = state.ports?.[portId] || {};
    const connected = hasActiveConnection(portId);
    const peer = connected ? getPeerPortState(portId) : null;

    // Mode column : on/auto/desirable
    const mode =
      port.mode === 'trunk' ? 'on' :
        port.mode === 'dynamic-auto' ? 'auto' :
          port.mode === 'dynamic-desirable' ? 'desirable' :
            'on';

    const peerCapable = peer?.peerPort ? isDtpCapableMode(peer.peerPort.mode) : false;
    const status = connected && (port.mode === 'trunk' || peerCapable) ? 'trunking' : 'not-trunking';
    const nativeVlan = getNativeVlanString(port);

    output += `${String(portId).padEnd(11)} ${String(mode).padEnd(12)} ${'802.1q'.padEnd(13)} ${String(status).padEnd(12)} ${nativeVlan}\n`;
  });

  output += '\nPort        Vlans allowed on trunk\n';
  trunkPorts.forEach((portId) => {
    const port = state.ports?.[portId] || {};
    output += `${String(portId).padEnd(11)} ${getAllowedVlansString(port)}\n`;
  });

  output += '\nPort        Vlans allowed and active in management domain\n';
  const activeVlans = Object.keys(state.vlans || {}).length > 0
    ? Object.keys(state.vlans || {}).sort((a, b) => Number(a) - Number(b)).join(',')
    : '1';
  trunkPorts.forEach((portId) => {
    output += `${String(portId).padEnd(11)} ${activeVlans}\n`;
  });

  output += '\nPort        Vlans in spanning tree forwarding state and not pruned\n';
  trunkPorts.forEach((portId) => {
    output += `${String(portId).padEnd(11)} ${activeVlans}\n`;
  });

  output += '!\n';
  return { success: true, output };
}

/**
 * Show Standby - Display HSRP status
 */
function cmdShowStandby(state: any, input: string, ctx: any): any {
  let output = '\n';
  let found = false;

  Object.entries(state.ports || {}).forEach(([portName, port]: [string, any]) => {
    if (port.hsrp?.groups) {
      found = true;
      Object.entries(port.hsrp.groups).forEach(([groupId, config]: [string, any]) => {
        output += `${portName} - Group ${groupId}\n`;
        output += `  State is ${config.state || 'Active'}\n`;
        output += `  Virtual IP address is ${config.virtualIp || 'unknown'}\n`;
        output += `  Active virtual MAC address is 0000.0c07.ac${parseInt(groupId).toString(16).padStart(2, '0')}\n`;
        output += `  Local virtual MAC address is 0000.0c07.ac${parseInt(groupId).toString(16).padStart(2, '0')} (v1 default)\n`;
        output += `  Hello time 3 sec, hold time 10 sec\n`;
        output += `  Next hello sent in 1.234 secs\n`;
        output += `  Preemption ${config.preempt ? 'enabled' : 'disabled'}\n`;
        output += `  Active router is local\n`;
        output += `  Standby router is unknown\n`;
        output += `  Priority ${config.priority ?? 100} (configured ${config.priority ?? 100})\n`;
        output += `  Group name is "hsrp-${portName}-${groupId}" (default)\n`;
      });
    }
  });

  if (!found) {
    output += '% HSRP not configured on any interface\n';
  }

  return { success: true, output };
}

/**
 * Show Hosts - Display DNS host mapping
 */
function cmdShowHosts(state: any, input: string, ctx: any): any {
  let output = '\nDefault domain is not set\n';
  output += 'Name servers are unassigned\n\n';
  output += 'Host                      Address\n';

  const records = state.services?.dns?.records || [];
  if (records.length === 0) {
    output += '(No host mappings configured)\n';
  } else {
    records.forEach((record: any) => {
      output += `${record.domain.padEnd(25)} ${record.address}\n`;
    });
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show IP Interface Brief
 */
function cmdShowIpInterfaceBrief(
  state: any,
  input: string,
  ctx: any
): any {
  // Check if specific interface requested instead of brief
  const match = input.match(/show\s+ip\s+interface\s+(?!brief|br)(\S+)/i);
  if (match) {
    return cmdShowIpInterface(state, input, ctx);
  }

  let output = '\nInterface              IP-Address      OK? Method Status                Protocol \n';
  const modelName = String(state?.version?.modelName || '');
  const isRouter = isRouterModel(modelName) || isRouterModel(state?.switchModel) || state?.deviceType === 'router';
  const toDisplayName = (portName: string) => {
    if (!isRouter) return portName;
    const p = String(portName);
    if (/^gi\d+\/\d+$/i.test(p)) return `GigabitEthernet${p.slice(2)}`;
    if (/^fa\d+\/\d+$/i.test(p)) return `FastEthernet${p.slice(2)}`;
    if (/^vlan\d+$/i.test(p)) return `Vlan${p.slice(4)}`;
    return p;
  };

  // Build channel groups map
  const channelGroups: Record<number, string[]> = {};
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.channelGroup) {
      if (!channelGroups[port.channelGroup]) channelGroups[port.channelGroup] = [];
      channelGroups[port.channelGroup].push(portName);
    }
  });

  // Show port-channel interfaces first
  Object.entries(channelGroups).forEach(([group, ports]) => {
    const poName = `Po${group}`;
    const status = 'up';
    const protocol = ports.every(p => !state.ports[p]?.shutdown) ? 'up' : 'down';
    output += `${poName.padEnd(22)} unassigned      YES manual ${status.padEnd(23)} ${protocol.padEnd(8)} \n`;
  });

  // Show regular interfaces
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    // Skip ports that are part of a channel group (show in PoX instead)
    if (port.channelGroup) return;

    const status = port.shutdown ? 'administratively down' : 'up';
    const protocol = port.shutdown ? 'down' : 'up';
    const displayPortName = toDisplayName(portName);

    if (port.ipAddress && port.subnetMask) {
      output += `${displayPortName.padEnd(22)} ${port.ipAddress.padEnd(15)} YES manual ${status.padEnd(23)} ${protocol.padEnd(8)} \n`;
    } else {
      output += `${displayPortName.padEnd(22)} unassigned      YES unset  ${status.padEnd(23)} ${protocol.padEnd(8)} \n`;
    }
  });

  output += '!\n';
  return { success: true, output };
}

/**
 * Show VLAN
 */
function cmdShowVlan(
  state: any,
  input: string,
  ctx: any
): any {
  let output = '\n\nVLAN Name                             Status    Ports\n';
  output += '---- -------------------------------- --------- -------------------------------\n';

  // Default VLAN 1
  output += '1    default                          active    ';
  const vlan1Ports = Object.keys(state.ports || {}).filter(p => {
    const port = state.ports[p];
    return String(port.accessVlan || port.vlan || 1) === '1';
  });
  output += vlan1Ports.join(', ') || '-';
  output += '\n';

  // Other VLANs
  Object.keys(state.vlans || {}).forEach(vlanId => {
    if (vlanId !== '1') {
      const vlan = state.vlans[vlanId];
      const vlanName = (vlan?.name || `VLAN${vlanId}`).padEnd(32);
      const vlanStatus = vlan?.status || 'active';
      const vlanPorts = Object.keys(state.ports || {}).filter(p => {
        const port = state.ports[p];
        return String(port.accessVlan || port.vlan || 1) === vlanId;
      });

      output += `${vlanId.padEnd(4)}${vlanName}${vlanStatus.padEnd(10)}${vlanPorts.join(', ') || '-'}\n`;
    }
  });

  const knownVlanIds = Object.keys(state.vlans || {});
  Object.values(state.ports || {}).forEach((port: any) => {
    const vlanId = String(port.accessVlan || port.vlan || 1);
    if (!knownVlanIds.includes(vlanId) && vlanId !== '1') {
      const vlanName = `VLAN${vlanId}`.padEnd(32);
      output += `${vlanId.padEnd(4)}${vlanName}${'active'.padEnd(10)}${port.id}\n`;
    }
  });

  output += '\n\nVLAN Type  SAID       MTU   Parent RingNo BridgeNo Stp  BrdgMode Trans1 Trans2\n';
  output += '---- ----- ---------- ----- ------ ------ -------- ---- -------- ------ ------\n';
  output += '1    enet  100001     1500  -      -      -        -    -        0      0\n';

  Object.keys(state.vlans || {}).forEach(vlanId => {
    if (vlanId !== '1') {
      output += `${vlanId.padEnd(4)}enet  ${100000 + parseInt(vlanId)}         1500  -      -      -        -    -        0      0\n`;
    }
  });

  output += '!\n';
  return { success: true, output };
}

/**
 * Show MAC Address Table
 */
function cmdShowMacAddressTable(
  state: any,
  input: string,
  ctx: any
): any {
  let output = '\nMac Address Table\n';
  output += '-------------------------------------------\n\n';
  output += 'Vlan    Mac Address       Type        Ports\n';
  output += '----    -----------       --------    -----\n';

  // Build MAC table from real connections (topologyConnections)
  const connections = ctx.connections || [];
  const sourceDeviceId = ctx.sourceDeviceId;

  // Collect MAC entries from connections only - no legacy data
  const macTable: { vlan: number; mac: string; port: string; type: string }[] = [];

  if (connections && connections.length > 0) {
    // Find all connections to this device using CanvasConnection format
    const deviceConnections = connections.filter(
      (conn: any) => conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId
    );

    deviceConnections.forEach((conn: any) => {
      // Determine which port on the device is connected
      const isSource = conn.sourceDeviceId === sourceDeviceId;
      const portId = isSource ? conn.sourcePort : conn.targetPort;

      // Get the connected device's MAC address
      const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
      const connectedDevice = ctx.devices?.find((d: any) => d.id === connectedDeviceId);

      if (connectedDevice?.macAddress) {
        // Format MAC address: 0000.0000.0000
        const mac = formatMacAddressSimple(connectedDevice.macAddress);

        // Get VLAN from the port - check if trunk mode
        const portState = state.ports?.[portId];

        if (portState?.mode === 'trunk') {
          // For trunk ports, show all VLANs
          const vlans = Object.keys(state.vlans || {}).filter(v => v !== '1').slice(0, 5);
          if (vlans.length === 0) {
            // Default VLAN 1 for trunk
            macTable.push({
              vlan: 1,
              mac: mac,
              port: portId,
              type: 'DYNAMIC'
            });
          } else {
            // Add entries for each VLAN on trunk
            vlans.forEach((vlanId) => {
              macTable.push({
                vlan: parseInt(vlanId),
                mac: mac,
                port: portId,
                type: 'DYNAMIC'
              });
            });
          }
        } else {
          // Access port - get VLAN from accessVlan or default to 1
          const vlan = portState?.accessVlan || portState?.vlan || 1;
          macTable.push({
            vlan: vlan,
            mac: mac,
            port: portId,
            type: 'DYNAMIC'
          });
        }
      }
    });
  }

  // Remove duplicates based on VLAN + MAC + Port
  const uniqueMacTable = macTable.filter((entry, index, self) =>
    index === self.findIndex(e => e.vlan === entry.vlan && e.mac === entry.mac && e.port === entry.port)
  );

  // Show learned MAC addresses from connections
  if (uniqueMacTable.length > 0) {
    uniqueMacTable.forEach((entry) => {
      output += `${String(entry.vlan).padEnd(8)}${entry.mac.padEnd(18)}${entry.type.padEnd(11)}${entry.port}\n`;
    });
  }

  // If no MAC addresses found, show default
  if (uniqueMacTable.length === 0) {
    output += 'All    0000.0000.0000    STATIC      CPU\n';
  }

  output += '\nTotal Mac Addresses for this criterion: ' + uniqueMacTable.length + '\n';
  output += '!\n';
  return { success: true, output };
}

// Helper function to format MAC address: xxxx.xxxx.xxxx
function formatMacAddressSimple(mac: string): string {
  if (!mac) return '0000.0000.0000';
  // Remove all separators (dots, dashes, colons)
  const cleanMac = mac.replace(/[-:.]/g, '').toLowerCase();
  // Pad with zeros to ensure 12 characters
  const padded = cleanMac.padStart(12, '0').slice(0, 12);
  // Add dots every 4 characters for format
  return padded.match(/.{1,4}/g)?.join('.') || padded;
}

/**
 * Show CDP Neighbors
 */
function cmdShowCdpNeighbors(
  state: any,
  input: string,
  ctx: any
): any {
  let output = '\nCapability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge\n';
  output += '                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone\n\n';
  output += 'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID\n';

  // Get real neighbors from topology
  const connections = ctx.connections || [];
  const sourceDeviceId = ctx.sourceDeviceId;
  const devices = ctx.devices || [];
  const cdpEnabled = state.cdpEnabled !== false;

  if (!cdpEnabled) {
    output += 'CDP is not enabled\n';
  } else {
    // Find connections to this device
    const deviceConnections = connections.filter(
      (conn: any) => conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId
    );

    if (deviceConnections.length === 0) {
      output += 'No CDP neighbors found\n';
    } else {
      deviceConnections.forEach((conn: any) => {
        const isSource = conn.sourceDeviceId === sourceDeviceId;
        const localPort = isSource ? conn.sourcePort : conn.targetPort;
        const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
        const remotePort = isSource ? conn.targetPort : conn.sourcePort;

        const connectedDevice = devices.find((d: any) => d.id === connectedDeviceId);

        if (connectedDevice) {
          // Determine capability based on device type
          const deviceType = connectedDevice.type;
          let capability = 'S'; // Switch
          if (deviceType === 'router') capability = 'R';
          else if (deviceType === 'pc') capability = 'H';
          else if (deviceType === 'iot') capability = 'H';

          // Platform based on device type
          let platform = 'WS-C2960-24TT-L';
          if (deviceType === 'router') platform = 'C2911';
          else if (deviceType === 'pc') platform = 'PC';
          else if (deviceType === 'iot') platform = 'IoT';

          output += `${connectedDevice.name.padEnd(16)}${localPort.padEnd(18)}${'140'.padEnd(12)}${capability.padEnd(12)}${platform.padEnd(11)}${remotePort}\n`;
        }
      });
    }
  }

  output += '\nTotal entries displayed: ' + (cdpEnabled ? connections.filter((c: any) => c.sourceDeviceId === sourceDeviceId || c.targetDeviceId === sourceDeviceId).length : 0) + '\n';
  output += '!\n';
  return { success: true, output };
}

/**
 * Show IP Route
 */
function cmdShowIpRoute(
  state: any,
  input: string,
  ctx: any
): any {
  let output = '\n';

  if (!state.ipRouting) {
    output += '% IP routing is not enabled\n';
    return { success: true, output };
  }

  // Parse filter
  const match = input.match(/show\s+ip\s+route\s*(ospf|rip|static|connected)?/i);
  const filter = match?.[1]?.toLowerCase();

  output += 'Codes: C - connected, S - static, I - IGRP, R - RIP, M - mobile, B - BGP\n';
  output += '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area\n';
  output += '       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2\n';
  output += '       E1 - OSPF external type 1, E2 - OSPF external type 2, E - EGP\n';
  output += '       i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, ia - IS-IS inter area\n';
  output += '       * - candidate default, U - per-user static route, o - ODR\n';
  output += '       P - periodic downloaded static route\n';
  output += '\n';
  output += 'Gateway of last resort is not set\n\n';

  // Connected routes - show network address instead of interface IP
  let hasConnectedRoutes = false;
  if (!filter || filter === 'connected') {
    Object.keys(state.ports || {}).forEach(portName => {
      const port = state.ports[portName];
      if (port.ipAddress && port.subnetMask && !port.shutdown) {
        hasConnectedRoutes = true;
        const prefixLength = getPrefixLength(port.subnetMask);
        const networkAddress = getNetworkAddress(port.ipAddress, port.subnetMask);
        const formattedPortName = formatPortName(portName);
        output += `C     ${networkAddress}/${prefixLength} is directly connected, ${formattedPortName}\n`;
      }
    });

    // Add routes to connected networks via topology
    const connections = ctx.connections || [];
    const sourceDeviceId = ctx.sourceDeviceId;
    const devices = ctx.devices || [];

    if (connections && connections.length > 0) {
      connections.forEach((conn: any) => {
        if (conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId) {
          const isSource = conn.sourceDeviceId === sourceDeviceId;
          const localPort = isSource ? conn.sourcePort : conn.targetPort;
          const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;

          const connectedDevice = devices.find((d: any) => d.id === connectedDeviceId);

          if (connectedDevice?.ip && connectedDevice?.subnet) {
            const prefixLength = getPrefixLength(connectedDevice.subnet);
            const networkAddress = getNetworkAddress(connectedDevice.ip, connectedDevice.subnet);
            const formattedPortName = formatPortName(localPort);
            output += `C     ${networkAddress}/${prefixLength} is directly connected, ${formattedPortName}\n`;
            hasConnectedRoutes = true;
          }
        }
      });
    }
  }

  // Static routes - convert subnet mask to CIDR notation
  // Support both 'mask' and 'subnetMask', 'network' and 'destination' property names
  if (!filter || filter === 'static') {
    if (state.staticRoutes && state.staticRoutes.length > 0) {
      state.staticRoutes.forEach((route: any) => {
        const mask = route.mask || route.subnetMask;
        const network = route.network || route.destination;
        if (mask && network) {
          const prefixLength = getPrefixLength(mask);
          const metric = route.metric || 1;
          output += `S     ${network}/${prefixLength} [${metric}/0] via ${route.nextHop}${route.interface ? ` ${route.interface}` : ''}\n`;
        }
      });
    }
  }

  // Dynamic routes (RIP, OSPF, EIGRP, BGP)
  if (state.dynamicRoutes && state.dynamicRoutes.length > 0) {
    state.dynamicRoutes.forEach((route: any) => {
      const mask = route.mask || route.subnetMask;
      const network = route.network || route.destination;
      if (mask && network) {
        const prefixLength = getPrefixLength(mask);
        let code = 'R';
        let ad = 120;
        let protocol = 'rip';
        if (state.routingProtocol === 'ospf') { code = 'O'; ad = 110; protocol = 'ospf'; }
        else if (state.routingProtocol === 'eigrp') { code = 'D'; ad = 90; protocol = 'eigrp'; }
        else if (state.routingProtocol === 'bgp') { code = 'B'; ad = 20; protocol = 'bgp'; }

        if (!filter || filter === protocol) {
          const metric = route.metric || 1;
          output += `${code.padEnd(6)}${network}/${prefixLength} [${ad}/${metric}] via ${route.nextHop}, 00:00:11, ${route.interface || ''}\n`;
        }
      }
    });
  }

  if (!hasConnectedRoutes && (!state.staticRoutes || state.staticRoutes.length === 0) && (!state.dynamicRoutes || state.dynamicRoutes.length === 0)) {
    output += 'No routes in routing table\n';
  }

  output += '  Time Since Last Boot: 01:00:00\n';
  output += '!\n';
  return { success: true, output };
}

/**
 * Show IP Protocols
 */
function cmdShowIpProtocols(state: any, input: string, ctx: any): any {
  if (!state.routingProtocol) {
    return { success: true, output: '\n% No routing protocols configured\n' };
  }

  let output = '\n';
  if (state.routingProtocol === 'ospf') {
    const processId = state.ospfProcessId || 1;
    const routerId = state.ospfRouterId || state.ip || '192.168.1.1';
    output += `Routing Protocol is "ospf ${processId}"\n`;
    output += '  Outgoing update filter list for all interfaces is not set\n';
    output += '  Incoming update filter list for all interfaces is not set\n';
    output += `  Router ID ${routerId}\n`;
    output += '  Number of areas in this router is 1. 1 normal 0 stub 0 nssa\n';
    output += '  Maximum path: 4\n';
    output += '  Routing for Networks:\n';
    if (state.dynamicRoutes && state.dynamicRoutes.length > 0) {
      state.dynamicRoutes.forEach((route: any) => {
        if (route.network && route.mask) {
          // Wildcard mask approximation from subnet
          const wildcard = route.mask.split('.').map((p: string) => 255 - parseInt(p)).join('.');
          output += `    ${route.network} ${wildcard} area ${route.area || 0}\n`;
        }
      });
    } else {
      output += '    (No networks advertised)\n';
    }
    output += '  Routing Information Sources:\n';
    output += '    Gateway         Distance      Last Update\n';
    if (state.dynamicRoutes) {
      state.dynamicRoutes.forEach((route: any) => {
        if (route.nextHop) {
          output += `    ${route.nextHop.padEnd(15)} 110           00:00:15\n`;
        }
      });
    }
    output += '  Distance: (default is 110)\n';
  } else if (state.routingProtocol === 'eigrp') {
    const asNum = state.eigrpAs || 1;
    output += `Routing Protocol is "eigrp ${asNum}"\n`;
    output += '  Outgoing update filter list for all interfaces is not set\n';
    output += '  Incoming update filter list for all interfaces is not set\n';
    output += '  Default networks accepted in routing updates\n';
    output += '  Default networks will not be sent in routing updates\n';
    output += '  EIGRP-IPv4 Protocol for AS(1)\n';
    output += `    Metric weight K1=1, K2=0, K3=1, K4=0, K5=0\n`;
    output += '    NSF-aware route hold timer is 240\n';
    output += '    Router-ID: 10.0.0.1\n';
    output += '    Topology : 0 (base)\n';
    output += '      Active Timer: 3 min\n';
    output += '      Distance: internal 90 external 170\n';
    output += '      Maximum path: 4\n';
    output += '      Maximum hopcount 100\n';
    output += '      Maximum metric variance 1\n';
  } else {
    output += `Routing Protocol is "${state.routingProtocol}"\n`;
    output += '  No detailed information available for this protocol.\n';
  }

  return { success: true, output };
}

/**
 * Show IP OSPF Neighbor
 */
function cmdShowIpOspfNeighbor(state: any, input: string, ctx: any): any {
  if (state.routingProtocol !== 'ospf') {
    return { success: true, output: '\n% OSPF is not enabled\n' };
  }

  let output = '\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n';

  // Simulate neighbors from dynamic routes
  if (state.dynamicRoutes && state.dynamicRoutes.length > 0) {
    const neighbors = new Set<string>();
    state.dynamicRoutes.forEach((r: any) => {
      if (r.nextHop && !neighbors.has(r.nextHop)) {
        neighbors.add(r.nextHop);
        // Mocking OSPF neighbor entry
        const routerId = r.nextHop; // Fallback to IP
        const address = r.nextHop;
        const intf = r.interface || 'FastEthernet0/0';
        output += `${routerId.padEnd(15)} 1     FULL/DR         00:00:32    ${address.padEnd(15)} ${intf}\n`;
      }
    });
  }

  return { success: true, output };
}

/**
 * Show IP OSPF
 */
function cmdShowIpOspf(state: any, input: string, ctx: any): any {
  if (state.routingProtocol !== 'ospf') {
    return { success: true, output: '\n% OSPF is not enabled\n' };
  }

  const processId = state.ospfProcessId || 1;
  const routerId = state.ospfRouterId || state.ip || '192.168.1.1';
  let output = `\n Routing Process "ospf ${processId}" with ID ${routerId}\n`;
  output += ' Start time: 00:00:01.000, Time elapsed: 00:02:15.000\n';
  output += ' Supports only single TOS(TOS0) routes\n';
  output += ' Supports opaque LSA\n';
  output += ' Supports Link-local Signaling (LLS)\n';
  output += ' Supports area transit capability\n';
  output += ' Initial SPF schedule delay 5000 msecs\n';
  output += ' Minimum hold time between two consecutive SPFs 10000 msecs\n';
  output += ' Maximum wait time between two consecutive SPFs 10000 msecs\n';
  output += ' Incremental-SPF disabled\n';
  output += ' Minimum LSA interval 5 secs\n';
  output += ' Minimum LSA arrival 1000 msecs\n';
  output += ' LSA group pacing timer 240 secs\n';
  output += ' Interface flood pacing timer 33 msecs\n';
  output += ' Retransmission pacing timer 66 msecs\n';
  output += ' Number of external LSA 0. Checksum Sum 0x000000\n';
  output += ' Number of opaque AS LSA 0. Checksum Sum 0x000000\n';
  output += ' Number of DCbitless external and opaque AS LSA 0\n';
  output += ' Number of DoNotAge external and opaque AS LSA 0\n';
  output += ' Number of areas in this router is 1. 1 normal 0 stub 0 nssa\n';
  output += ' Number of areas transit capable is 0\n';
  output += ' External flood list length 0\n';
  output += ' IETF NSF helper support enabled\n';
  output += ' Reference bandwidth unit is 100 mbps\n';

  output += '    Area BACKBONE(0)\n';
  output += '        Number of interfaces in this area is 1\n';
  output += '        Area has no authentication\n';
  output += '        SPF algorithm last executed 00:01:15.000 ago\n';
  output += '        SPF algorithm executed 2 times\n';
  output += '        Area ranges are\n';
  output += '        Number of LSA 3. Checksum Sum 0x01A3B1\n';
  output += '        Number of opaque link LSA 0. Checksum Sum 0x000000\n';
  output += '        Number of DCbitless LSA 0\n';
  output += '        Number of indication LSA 0\n';
  output += '        Number of DoNotAge LSA 0\n';
  output += '        Flood list length 0\n';

  return { success: true, output };
}

/**
 * Show Clock
 */
function cmdShowClock(
  state: any,
  input: string,
  ctx: any
): any {
  const now = new Date();
  return {
    success: true,
    output: `\n*${now.toTimeString().split(' ')[0]} UTC ${now.toLocaleDateString()}\n`
  };
}

/**
 * Show Flash
 */
function cmdShowFlash(
  state: any,
  input: string,
  ctx: any
): any {
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
  state: any,
  input: string,
  ctx: any
): any {
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
 * Helper to extract port number from port ID (fa0/1 -> 1, gi0/24 -> 24)
 */
function getPortNumber(portId: string): number {
  const match = portId.match(/\/(\d+)$/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Calculate Spanning Tree Protocol state for a device
 * Returns a map of port IDs to their STP role and state
 */
export function calculateSTPState(
  state: any,
  ctx: any,
  vlanId: number = 1
): Map<string, { role: string; state: string }> {
  const stpState = new Map<string, { role: string; state: string }>();

  // Get topology connections from context
  const connections = ctx.connections || [];
  const sourceDeviceId = ctx.sourceDeviceId;
  const devices = ctx.devices || [];
  const deviceStates = ctx.deviceStates || new Map();

  // Find all switch devices connected to this device
  const deviceConnections = connections.filter(
    (conn: any) => conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId
  );

  const isPortVlanMember = (p: any, vId: number) => {
    if (!p) return false;
    if (p.mode === 'trunk' || p.mode === 'dynamic-auto' || p.mode === 'dynamic-desirable' || p.mode === 'dot1q-tunnel') {
      if (!p.allowedVlans || p.allowedVlans === 'all') return true;
      return Array.isArray(p.allowedVlans) && p.allowedVlans.includes(vId);
    }
    return Number(p.accessVlan || p.vlan || 1) === Number(vId);
  };

  // Find connected switches and their MAC addresses for root bridge election
  // Filter out connections to powered-off devices and shutdown ports
  const connectedSwitches: { deviceId: string; macAddress: string; portId: string; isSource: boolean }[] = [];
  deviceConnections.forEach((conn: any) => {
    const isSource = conn.sourceDeviceId === sourceDeviceId;
    const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
    const localPortId = isSource ? conn.sourcePort : conn.targetPort;
    const remotePortId = isSource ? conn.targetPort : conn.sourcePort;
    const connectedDevice = devices.find((d: any) => d.id === connectedDeviceId);
    const connectedState = deviceStates.get?.(connectedDeviceId);

    // Skip connections to powered-off devices
    if (connectedDevice && connectedDevice.status === 'offline') {
      return;
    }

    // Skip connections where local port or remote port is shutdown
    const localPort = state.ports[localPortId];
    const remotePort = connectedState?.ports?.[remotePortId];
    if (localPort?.shutdown || remotePort?.shutdown) {
      return;
    }

    // Only consider this switched link for the VLAN if both ports are members
    if (!isPortVlanMember(localPort, vlanId) || !isPortVlanMember(remotePort, vlanId)) {
      return;
    }

    if (connectedDevice && (connectedDevice.type === 'switchL2' || connectedDevice.type === 'switchL3')) {
      connectedSwitches.push({
        deviceId: connectedDeviceId,
        macAddress: connectedState?.macAddress || connectedDevice.macAddress || 'FFFF.FFFF.FFFF',
        portId: localPortId,
        isSource
      });
    }
  });

  // First, build adjacency list for this VLAN
  const adjacency = new Map<string, { deviceId: string; portId: string; cost: number }[]>();
  connections.forEach((conn: any) => {
    if (conn.active === false) return;

    const srcId = conn.sourceDeviceId;
    const tgtId = conn.targetDeviceId;
    const srcPort = conn.sourcePort;
    const tgtPort = conn.targetPort;

    const srcState = deviceStates.get?.(srcId);
    const srcPortObj = srcState?.ports?.[srcPort];
    const tgtState = deviceStates.get?.(tgtId);
    const tgtPortObj = tgtState?.ports?.[tgtPort];

    // PVST: Connection is only viable for this VLAN if both ports are members
    const isPortVlanMember = (p: any, vId: number) => {
      if (!p) return false;
      if (p.mode === 'trunk' || p.mode === 'dynamic-auto' || p.mode === 'dynamic-desirable' || p.mode === 'dot1q-tunnel') {
        if (!p.allowedVlans || p.allowedVlans === 'all') return true;
        return Array.isArray(p.allowedVlans) && p.allowedVlans.includes(vId);
      }
      return Number(p.accessVlan || p.vlan || 1) === Number(vId);
    };

    if (!isPortVlanMember(srcPortObj, vlanId) || !isPortVlanMember(tgtPortObj, vlanId)) {
      return;
    }

    // Skip connection if either port is shutdown
    if (srcPortObj?.shutdown || tgtPortObj?.shutdown) {
      return;
    }

    const portCost = getSTPCost(srcPortObj);
    if (!adjacency.has(srcId)) adjacency.set(srcId, []);
    if (!adjacency.has(tgtId)) adjacency.set(tgtId, []);

    adjacency.get(srcId)!.push({ deviceId: tgtId, portId: srcPort, cost: portCost });
    adjacency.get(tgtId)!.push({ deviceId: srcId, portId: tgtPort, cost: portCost });
  });

  // Find all switches reachable from this device in this VLAN
  const reachableSwitches = new Set<string>();
  const queue = [sourceDeviceId];
  reachableSwitches.add(sourceDeviceId);

  let head = 0;
  while (head < queue.length) {
    const currentId = queue[head++];
    const neighbors = adjacency.get(currentId) || [];
    for (const n of neighbors) {
      if (!reachableSwitches.has(n.deviceId)) {
        const d = devices.find((dev: any) => dev.id === n.deviceId);
        if (d && (d.type === 'switchL2' || d.type === 'switchL3')) {
          reachableSwitches.add(n.deviceId);
          queue.push(n.deviceId);
        }
      }
    }
  }

  // Determine root bridge among REACHABLE switches
  const myMac = state.macAddress || 'FFFF.FFFF.FFFF';
  const vlanStr = String(vlanId);
  const spanningTreeVlans = state.spanningTreeVlans || {};
  const myPriority = spanningTreeVlans[vlanStr]?.priority ? parseInt(spanningTreeVlans[vlanStr].priority) : (state.spanningTreePriority || 32768);

  let lowestPriority = myPriority;
  let lowestMac = myMac;
  let rootBridgeId = sourceDeviceId;

  reachableSwitches.forEach((deviceId) => {
    const d = devices.find((dev: any) => dev.id === deviceId);
    const swState = deviceStates.get?.(deviceId);
    if (!swState) return;

    const swSpanningTreeVlans = swState.spanningTreeVlans || {};
    const swPriority = swSpanningTreeVlans[vlanStr]?.priority ? parseInt(swSpanningTreeVlans[vlanStr].priority) : (swState.spanningTreePriority || 32768);
    const swMac = swState.macAddress || d.macAddress || 'FFFF.FFFF.FFFF';

    if (swPriority < lowestPriority ||
      (swPriority === lowestPriority && swMac.localeCompare(lowestMac) < 0)) {
      lowestPriority = swPriority;
      lowestMac = swMac;
      rootBridgeId = deviceId;
    }
  });

  // Now find the path to root bridge among directly connected switches
  let rootPortId: string | null = null;
  let lowestRootPortNum = Infinity;
  const connectionsToRoot = connectedSwitches.filter(sw => sw.deviceId === rootBridgeId);

  // Check if there are multiple paths to the root bridge
  if (connectionsToRoot.length > 1) {
    let bestPathCost = Infinity;
    let bestNeighborPriority = Infinity;
    let bestNeighborMac = '';
    let bestNeighborPortNum = Infinity;
    let bestPortId = '';

    connectionsToRoot.forEach(conn => {
      const port = state.ports[conn.portId];
      const portCost = getSTPCost(port);
      const connectedState = deviceStates.get?.(conn.deviceId);
      const neighborPriority = connectedState?.spanningTreePriority || 32768;
      const neighborMac = conn.macAddress;
      const neighborPortNum = getPortNumber(conn.portId);

      // Compare path cost first, then neighbor BID (priority + MAC), then neighbor port ID
      if (portCost < bestPathCost ||
        (portCost === bestPathCost && neighborPriority < bestNeighborPriority) ||
        (portCost === bestPathCost && neighborPriority === bestNeighborPriority &&
          neighborMac.localeCompare(bestNeighborMac) < 0) ||
        (portCost === bestPathCost && neighborPriority === bestNeighborPriority &&
          neighborMac === bestNeighborMac && neighborPortNum < bestNeighborPortNum)) {
        bestPathCost = portCost;
        bestNeighborPriority = neighborPriority;
        bestNeighborMac = neighborMac;
        bestNeighborPortNum = neighborPortNum;
        bestPortId = conn.portId;
      }
    });

    rootPortId = bestPortId;
    lowestRootPortNum = getPortNumber(bestPortId);
  } else if (connectionsToRoot.length === 1) {
    rootPortId = connectionsToRoot[0].portId;
    lowestRootPortNum = getPortNumber(rootPortId);
  }

  const isRootBridge = rootBridgeId === sourceDeviceId;

  // Dijkstra's algorithm to find shortest path to root bridge
  const shortestPathToRoot = (fromDeviceId: string): { pathCost: number; nextHopPort: string | null } => {
    if (fromDeviceId === rootBridgeId) return { pathCost: 0, nextHopPort: null };

    const distances = new Map<string, number>();
    const previous = new Map<string, { deviceId: string; portId: string }>();
    const visited = new Set<string>();

    devices.forEach((d: any) => distances.set(d.id, Infinity));
    distances.set(fromDeviceId, 0);

    while (visited.size < distances.size) {
      // Find unvisited node with minimum distance
      let current: string | null = null;
      let minDist = Infinity;
      distances.forEach((dist, deviceId) => {
        if (!visited.has(deviceId) && dist < minDist) {
          minDist = dist;
          current = deviceId;
        }
      });

      if (current === null || minDist === Infinity) break;
      visited.add(current);

      if (current === rootBridgeId) break;

      const neighbors = adjacency.get(current!) || [];
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor.deviceId)) {
          const newDist = distances.get(current!)! + neighbor.cost;
          if (newDist < distances.get(neighbor.deviceId)!) {
            distances.set(neighbor.deviceId, newDist);
            previous.set(neighbor.deviceId, { deviceId: current!, portId: neighbor.portId });
          }
        }
      });
    }

    // Reconstruct path to find next hop port
    const pathCost = distances.get(rootBridgeId) ?? Infinity;
    if (pathCost === Infinity) return { pathCost: Infinity, nextHopPort: null };

    // Find the first hop from source device
    let current: string | null = rootBridgeId;
    let nextHopPort: string | null = null;

    while (current !== null && current !== fromDeviceId && previous.has(current)) {
      const prev = previous.get(current)!;
      if (prev.deviceId === fromDeviceId) {
        nextHopPort = prev.portId;
        break;
      }
      current = prev.deviceId;
    }

    return { pathCost, nextHopPort };
  };

  // Pre-calculate root path cost for all switches in topology
  // This simulates BPDU propagation where each switch learns the best path to root
  const switchRootPathCosts = new Map<string, { pathCost: number; rootPort: string | null }>();

  // Root bridge has path cost 0 and no root port
  switchRootPathCosts.set(rootBridgeId, { pathCost: 0, rootPort: null });

  // For other switches, calculate shortest path to root
  devices.forEach((d: any) => {
    if (d.id === rootBridgeId) return;
    if (d.type !== 'switchL2' && d.type !== 'switchL3') return;

    const { pathCost, nextHopPort } = shortestPathToRoot(d.id);
    switchRootPathCosts.set(d.id, { pathCost, rootPort: nextHopPort });
  });

  // Calculate STP state for each port using real STP logic
  // Designated port selection: Compare root path costs on each link segment
  Object.keys(state.ports || {}).forEach((portId: string) => {
    const port = state.ports[portId];
    if (portId.toLowerCase().startsWith('vlan') || portId.toLowerCase().startsWith('console')) {
      return;
    }

    // PVST: Only process ports that are members of this VLAN
    const isVlanMember = isPortVlanMember(port, vlanId);
    if (!isVlanMember) {
      return;
    }

    let role: string;
    let portState: string;
    if (port.shutdown) {
      role = 'Desg';
      portState = 'BLK';
    } else if (isRootBridge) {
      // Root bridge: All active ports are designated (forwarding)
      role = 'Desg';
      portState = 'FWD';
    } else {
      // Get this switch's root path info
      const myRootInfo = switchRootPathCosts.get(sourceDeviceId);
      const myPathCost = myRootInfo?.pathCost ?? Infinity;
      const myRootPort = myRootInfo?.rootPort ?? null;

      // Check if this port is the root port
      if (portId === myRootPort) {
        role = 'Root';
        portState = 'FWD';
      } else {
        // Non-root port: Determine designated vs alternate
        const neighbor = connectedSwitches.find(sw => sw.portId === portId);

        if (neighbor) {
          // This port connects to another switch - use STP designated port election
          // The switch with lower root path cost wins designated role
          // If equal, lower bridge ID wins
          const neighborRootInfo = switchRootPathCosts.get(neighbor.deviceId);
          const neighborPathCost = neighborRootInfo?.pathCost ?? Infinity;

          // Get port costs
          const myPortCost = getSTPCost(port);
          const neighborDevice = devices.find((d: any) => d.id === neighbor.deviceId);
          const neighborState = deviceStates.get?.(neighbor.deviceId);
          const neighborPortObj = neighborState?.ports?.[neighbor.portId];
          const neighborPortCost = getSTPCost(neighborPortObj);

          // Calculate root path cost if we use this port
          // My advertised cost = my path cost to root
          const myAdvertisedCost = myPathCost;

          // Neighbor's advertised cost = neighbor's path cost to root
          const neighborAdvertisedCost = neighborPathCost;

          // STP Designated Port Election Rules:
          // 1. Lower root path cost wins
          // 2. If equal, lower sender bridge ID (MAC) wins
          // 3. If equal, lower sender port ID wins
          let iAmDesignated: boolean;

          if (myAdvertisedCost < neighborAdvertisedCost) {
            // I have better (lower) path to root -> I win designated
            iAmDesignated = true;
          } else if (myAdvertisedCost > neighborAdvertisedCost) {
            // Neighbor has better path -> I lose, become alternate
            iAmDesignated = false;
          } else {
            // Equal path costs - compare bridge IDs (lower MAC wins)
            const myMac = state.macAddress || 'FFFF.FFFF.FFFF';
            const neighborMac = neighborState?.macAddress || neighborDevice?.macAddress || 'FFFF.FFFF.FFFF';
            const macComparison = myMac.localeCompare(neighborMac);

            if (macComparison < 0) {
              // My MAC is lower -> I win designated
              iAmDesignated = true;
            } else if (macComparison > 0) {
              // Neighbor MAC is lower -> I lose
              iAmDesignated = false;
            } else {
              // Equal MACs (same device?) - compare port IDs
              const myPortNum = getPortNumber(portId);
              const neighborPortNum = getPortNumber(neighbor.portId);
              iAmDesignated = myPortNum < neighborPortNum;
            }
          }

          if (iAmDesignated) {
            role = 'Desg';
            portState = 'FWD';
          } else {
            // I lost the election - this port is alternate (blocking)
            role = 'Altn';
            portState = 'BLK';
          }
        } else {
          // Port not connected to another switch (edge port) - designated
          role = 'Desg';
          portState = 'FWD';
        }
      }
    }

    stpState.set(portId, { role, state: portState });
  });

  return stpState;
}

/**
 * Perform PVST (Per-VLAN Spanning Tree) calculation for all devices in topology.
 * Returns a map of updated device states.
 */
export function calculatePVST(
  updatedCurrentState: any,
  ctx: any,
  sourceDeviceId: string
): Map<string, any> {
  const deviceStates = ensureDeviceStatesMap(ctx.deviceStates);
  const allUpdatedStates = new Map<string, any>();
  const devices = ctx.devices || [];

  // Update current device state in our working set
  const workingDeviceStates = new Map(deviceStates);
  workingDeviceStates.set(sourceDeviceId, updatedCurrentState);

  // We need to calculate STP for all switch devices
  workingDeviceStates.forEach((deviceState: any, deviceId: unknown) => {
    const deviceIdStr = deviceId as string;
    const device = devices.find((d: any) => d.id === deviceIdStr);
    if (!device || (device.type !== 'switchL2' && device.type !== 'switchL3')) {
      allUpdatedStates.set(deviceIdStr, deviceState);
      return;
    }

    const updatedPorts = { ...deviceState.ports };

    // Clear/Initialize STP instances for each port
    Object.keys(updatedPorts).forEach(portId => {
      const port = updatedPorts[portId];
      // Skip VLAN and Console interfaces
      if (portId.toLowerCase().startsWith('vlan') || portId.toLowerCase().startsWith('console')) {
        return;
      }

      if (port.spanningTree) {
        updatedPorts[portId] = {
          ...port,
          spanningTree: {
            ...port.spanningTree,
            instances: {} // Reset instances
          }
        };
      } else {
        updatedPorts[portId] = {
          ...port,
          spanningTree: {
            instances: {}
          }
        };
      }
    });

    // Each switch calculates STP for all VLANs it has in its database
    const vlanIds = Object.keys(deviceState.vlans || {}).map(Number);
    if (vlanIds.length === 0) vlanIds.push(1); // Always at least VLAN 1

    vlanIds.forEach(vlanId => {
      // Calculate STP for this device for this specific VLAN
      const stpResult = calculateSTPState(deviceState, { ...ctx, deviceStates: workingDeviceStates, sourceDeviceId: deviceId }, vlanId);

      stpResult.forEach((stpInfo: any, portId: string) => {
        if (updatedPorts[portId]) {
          const stateMap: Record<string, 'forwarding' | 'blocking' | 'listening' | 'learning' | 'disabled'> = {
            'FWD': 'forwarding',
            'BLK': 'blocking',
            'LIS': 'listening',
            'LRN': 'learning',
            'DIS': 'disabled'
          };

          const portStpState = stateMap[stpInfo.state] || 'forwarding';

          if (!updatedPorts[portId].spanningTree.instances) {
            updatedPorts[portId].spanningTree.instances = {};
          }

          updatedPorts[portId].spanningTree.instances[vlanId] = {
            role: stpInfo.role,
            state: portStpState
          };

          // For backward compatibility (especially for UI port indicators), use VLAN 1
          // Skip blocking for EtherChannel member ports - they should stay connected
          if (vlanId === 1 && !updatedPorts[portId].channelGroup) {
            updatedPorts[portId].spanningTree.role = stpInfo.role;
            updatedPorts[portId].spanningTree.state = portStpState;
            updatedPorts[portId].status = updatedPorts[portId].shutdown ? 'disabled' : (stpInfo.state === 'BLK' ? 'blocked' : 'connected');
          }
        }
      });
    });

    allUpdatedStates.set(deviceIdStr, { ...deviceState, ports: updatedPorts });
  });

  return allUpdatedStates;
}

/** Show Spanning Tree
 */
function cmdShowSpanningTree(
  state: any,
  input: string,
  ctx: any
): any {
  let output = '';

  // Get spanning tree mode
  const stpMode = state.spanningTreeMode || 'pvst';

  // Parse input to check if specific VLAN is requested
  const vlanMatch = input.match(/vlan\s+(\d+)/i);
  const requestedVlan = vlanMatch ? vlanMatch[1] : null;

  // Show for each VLAN
  let vlans = Object.keys(state.vlans || {});
  if (vlans.length === 0) {
    vlans.push('1'); // Default VLAN
  }

  // Filter to specific VLAN if requested
  if (requestedVlan) {
    vlans = vlans.filter(v => v === requestedVlan);
    if (vlans.length === 0) {
      return `% Invalid VLAN ID: ${requestedVlan}`;
    }
  }

  // Determine root bridge info (shared across VLANs)
  const connections = ctx.connections || [];
  const sourceDeviceId = ctx.sourceDeviceId;
  const devices = ctx.devices || [];
  const deviceStates = ctx.deviceStates || new Map();

  const deviceConnections = connections.filter(
    (conn: any) => conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId
  );

  const connectedSwitches: { deviceId: string; macAddress: string; portId: string }[] = [];
  deviceConnections.forEach((conn: any) => {
    const isSource = conn.sourceDeviceId === sourceDeviceId;
    const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
    const localPortId = isSource ? conn.sourcePort : conn.targetPort;
    const connectedDevice = devices.find((d: any) => d.id === connectedDeviceId);
    const connectedState = deviceStates.get?.(connectedDeviceId);

    if (connectedDevice && (connectedDevice.type === 'switchL2' || connectedDevice.type === 'switchL3')) {
      connectedSwitches.push({
        deviceId: connectedDeviceId,
        macAddress: connectedState?.macAddress || connectedDevice.macAddress || 'FFFF.FFFF.FFFF',
        portId: localPortId
      });
    }
  });

  const myMac = state.macAddress || 'FFFF.FFFF.FFFF';
  let lowestMac = myMac;
  let rootBridgeId = sourceDeviceId;

  connectedSwitches.forEach((sw) => {
    if (sw.macAddress.localeCompare(lowestMac) < 0) {
      lowestMac = sw.macAddress;
      rootBridgeId = sw.deviceId;
    }
  });

  const isRootBridge = rootBridgeId === sourceDeviceId;
  let rootPortId: string | null = null;

  if (!isRootBridge) {
    const connectionsToRoot = connectedSwitches.filter(sw => sw.deviceId === rootBridgeId);
    if (connectionsToRoot.length > 0) {
      let minPortNum = Infinity;
      connectionsToRoot.forEach(conn => {
        const portNum = getPortNumber(conn.portId);
        if (portNum < minPortNum) {
          minPortNum = portNum;
          rootPortId = conn.portId;
        }
      });
    }
  }

  // Get VLAN-based spanning tree configuration
  const spanningTreeVlans = state.spanningTreeVlans || {};

  vlans.forEach((vlanId: string) => {
    const vlan = state.vlans?.[vlanId];
    const vlanName = vlan?.name || `VLAN${vlanId}`;

    // Get VLAN-based priority for this switch
    const myVlanPriority = (spanningTreeVlans[vlanId]?.priority ? parseInt(spanningTreeVlans[vlanId].priority) : state.spanningTreePriority) || 32768;

    // Use the newly implemented calculateSTPState to get accurate roles/states for this VLAN
    const vlanStpState = calculateSTPState(state, ctx, parseInt(vlanId));

    // We also need root bridge info for this specific VLAN from the perspective of the reachable network
    let lowestPriority = myVlanPriority;
    let lowestMac = myMac;
    let rootBridgeId = sourceDeviceId;

    // Build root election results manually here for display, following the same logic as calculateSTPState
    // First, find adjacency for this VLAN to find reachable switches
    const adjacency = new Map<string, { deviceId: string; portId: string; cost: number }[]>();
    connections.forEach((conn: any) => {
      if (conn.active === false) return;
      const sState = deviceStates.get?.(conn.sourceDeviceId);
      const tState = deviceStates.get?.(conn.targetDeviceId);
      const sPort = sState?.ports?.[conn.sourcePort];
      const tPort = tState?.ports?.[conn.targetPort];
      const isPortVlanMember = (p: any, vId: number) => {
        if (!p) return false;
        if (p.mode === 'trunk' || p.mode === 'dynamic-auto' || p.mode === 'dynamic-desirable' || p.mode === 'dot1q-tunnel') {
          if (!p.allowedVlans || p.allowedVlans === 'all') return true;
          return Array.isArray(p.allowedVlans) && p.allowedVlans.includes(vId);
        }
        return Number(p.accessVlan || p.vlan || 1) === Number(vId);
      };
      if (!isPortVlanMember(sPort, parseInt(vlanId)) || !isPortVlanMember(tPort, parseInt(vlanId))) return;
      if (sPort?.shutdown || tPort?.shutdown) return;
      if (!adjacency.has(conn.sourceDeviceId)) adjacency.set(conn.sourceDeviceId, []);
      if (!adjacency.has(conn.targetDeviceId)) adjacency.set(conn.targetDeviceId, []);
      adjacency.get(conn.sourceDeviceId)!.push({ deviceId: conn.targetDeviceId, portId: conn.sourcePort, cost: getSTPCost(sPort) });
      adjacency.get(conn.targetDeviceId)!.push({ deviceId: conn.sourceDeviceId, portId: conn.targetPort, cost: getSTPCost(tPort) });
    });

    const reachableSwitches = new Set<string>();
    const queue = [sourceDeviceId];
    reachableSwitches.add(sourceDeviceId);
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      (adjacency.get(cur) || []).forEach(n => {
        if (!reachableSwitches.has(n.deviceId)) {
          const d = devices.find((dev: any) => dev.id === n.deviceId);
          if (d && (d.type === 'switchL2' || d.type === 'switchL3')) {
            reachableSwitches.add(n.deviceId);
            queue.push(n.deviceId);
          }
        }
      });
    }

    reachableSwitches.forEach(id => {
      const swState = deviceStates.get?.(id);
      if (!swState) return;
      const swPriority = swState.spanningTreeVlans?.[vlanId]?.priority ? parseInt(swState.spanningTreeVlans[vlanId].priority) : (swState.spanningTreePriority || 32768);
      const swMac = swState.macAddress || devices.find((d: any) => d.id === id)?.macAddress || 'FFFF.FFFF.FFFF';
      if (swPriority < lowestPriority || (swPriority === lowestPriority && swMac.localeCompare(lowestMac) < 0)) {
        lowestPriority = swPriority;
        lowestMac = swMac;
        rootBridgeId = id;
      }
    });

    const isRootBridge = rootBridgeId === sourceDeviceId;
    let rootPortId: string | null = null;

    // Sort ports by their number
    const portEntries = Object.entries(state.ports || {})
      .filter(([portName, _]) => !portName.toLowerCase().startsWith('vlan') && !portName.toLowerCase().startsWith('console'))
      .filter(([_, port]: [string, any]) => {
        // Include trunk ports and access ports that belong to this VLAN
        const isTrunk = port.mode === 'trunk';
        const portVlan = port.vlan || port.accessVlan || 1;
        return isTrunk || String(portVlan) === String(vlanId);
      })
      .filter(([_, port]: [string, any]) => !port.shutdown && (port.status === 'connected' || port.status === 'blocked'))
      .sort(([a], [b]) => getPortNumber(a) - getPortNumber(b));

    // Skip entire VLAN block if there are no ports to display
    if (portEntries.length === 0) {
      return;
    }

    output += `\nVLAN${String(vlanId).padStart(4, '0')}\n`;
    output += `  Spanning tree enabled protocol ${stpMode === 'mst' ? 'mstp' : 'ieee'}\n`;

    // Get VLAN-based priority
    const vlanPriority = spanningTreeVlans[vlanId]?.priority ? parseInt(spanningTreeVlans[vlanId].priority) : 32768;
    const bridgePriority = vlanPriority + parseInt(vlanId);

    // Reuse the VLAN adjacency map above to compute dynamic root path cost for display.
    const shortestRootPath = (() => {
      if (sourceDeviceId === rootBridgeId) {
        return { pathCost: 0, rootPortId: null as string | null };
      }

      const distances = new Map<string, number>();
      const previous = new Map<string, { deviceId: string; portId: string }>();
      const visited = new Set<string>();

      devices.forEach((d: any) => distances.set(d.id, Infinity));
      distances.set(sourceDeviceId, 0);

      while (visited.size < distances.size) {
        let current: string | null = null;
        let minDist = Infinity;

        distances.forEach((dist, deviceId) => {
          if (!visited.has(deviceId) && dist < minDist) {
            current = deviceId;
            minDist = dist;
          }
        });

        if (current === null || minDist === Infinity) break;
        visited.add(current);
        if (current === rootBridgeId) break;

        (adjacency.get(current) || []).forEach(neighbor => {
          if (visited.has(neighbor.deviceId)) return;
          const newDist = minDist + neighbor.cost;
          if (newDist < (distances.get(neighbor.deviceId) ?? Infinity)) {
            distances.set(neighbor.deviceId, newDist);
            previous.set(neighbor.deviceId, { deviceId: current!, portId: neighbor.portId });
          }
        });
      }

      const pathCost = distances.get(rootBridgeId) ?? Infinity;
      if (pathCost === Infinity) {
        return { pathCost: Infinity, rootPortId: null as string | null };
      }

      let current: string | null = rootBridgeId;
      let computedRootPortId: string | null = null;
      while (current && current !== sourceDeviceId && previous.has(current)) {
        const prev = previous.get(current)!;
        if (prev.deviceId === sourceDeviceId) {
          computedRootPortId = prev.portId;
          break;
        }
        current = prev.deviceId;
      }

      return { pathCost, rootPortId: computedRootPortId };
    })();

    rootPortId = shortestRootPath.rootPortId;

    if (isRootBridge) {
      output += `  Root ID    Priority    ${bridgePriority}\n`;
      output += `             Address     ${state.macAddress || '0000.0000.0000'}\n`;
      output += `             This bridge is the root\n`;
    } else {
      output += `  Root ID    Priority    ${lowestPriority + parseInt(vlanId)}\n`;
      output += `             Address     ${lowestMac}\n`;
      if (rootPortId) {
        const rootPortNum = getPortNumber(rootPortId);
        const rootPathCost = Number.isFinite(shortestRootPath.pathCost) ? shortestRootPath.pathCost : getSTPCost(state.ports[rootPortId]);
        output += `             Cost        ${rootPathCost}\n`;
        output += `             Port        ${rootPortNum} (${rootPortId})\n`;
      }
    }
    output += `             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec\n\n`;
    output += `  Bridge ID  Priority    ${bridgePriority}  (priority ${vlanPriority} sys-id-ext ${vlanId})\n`;
    output += `             Address     ${state.macAddress || '001A.2B3C.4D5E'}\n`;
    output += `             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec\n`;
    output += `             Aging Time  300\n\n`;

    output += `Interface           Role Sts Cost      Prio.Nbr Type\n`;
    output += `------------------- ---- --- --------- -------- --------------------------------\n`;

    portEntries.forEach(([portName, port]: [string, any]) => {
      const portNum = getPortNumber(portName);
      const stpInfo = vlanStpState.get(portName) || { role: 'Desg', state: 'FWD' };
      const role = stpInfo.role;
      const status = stpInfo.state;
      const cost = getSTPCost(port);
      const prioNbr = `${port.stpPriority ?? 128}.${portNum}`;

      // Format: Interface, Role, Status, Cost, Prio.Nbr, Type
      // Example: Fa0/1            Desg FWD 19        128.1    P2p
      const interfaceName = portName.length <= 18 ? portName : portName.substring(0, 18);
      output += `${interfaceName.padEnd(19)}${role.padStart(4)} ${status.padStart(3)} ${cost.toString().padStart(9)} ${prioNbr.padStart(8)}    P2p\n`;
    });
  });

  output += '\n';

  // Update port spanningTree states in the returned newState
  // Map STP role/state to the spanningTree property format
  const updatedPorts: Record<string, any> = {};
  // Use VLAN 1's STP state for the return value (simplified)
  const vlan1StpState = new Map<string, { role: string; state: string }>();
  // Calculate VLAN 1 STP state for return value
  const vlan1Id = vlans.length > 0 ? vlans[0] : '1';
  const vlan1Priority = (spanningTreeVlans[vlan1Id]?.priority ? parseInt(spanningTreeVlans[vlan1Id].priority) : state.spanningTreePriority) || 32768;
  let vlan1LowestPriority = vlan1Priority;
  let vlan1LowestMac = myMac;
  let vlan1RootBridgeId = sourceDeviceId;

  devices.forEach((d: any) => {
    if (d.type === 'switchL2' || d.type === 'switchL3') {
      const swState = deviceStates.get?.(d.id);
      const swVlan1Priority = swState?.spanningTreeVlans?.[vlan1Id]?.priority ? parseInt(swState.spanningTreeVlans[vlan1Id].priority) : null;
      const swPriority = swVlan1Priority || swState?.spanningTreePriority || 32768;
      const swMac = swState?.macAddress || d.macAddress || 'FFFF.FFFF.FFFF';

      if (swPriority < vlan1LowestPriority || (swPriority === vlan1LowestPriority && swMac.localeCompare(vlan1LowestMac) < 0)) {
        vlan1LowestPriority = swPriority;
        vlan1LowestMac = swMac;
        vlan1RootBridgeId = d.id;
      }
    }
  });

  const vlan1IsRootBridge = vlan1RootBridgeId === sourceDeviceId;
  let vlan1RootPortId: string | null = null;

  if (!vlan1IsRootBridge) {
    const connectionsToRoot = connectedSwitches.filter(sw => sw.deviceId === vlan1RootBridgeId);
    if (connectionsToRoot.length > 0) {
      let minPortNum = Infinity;
      connectionsToRoot.forEach(conn => {
        const portNum = getPortNumber(conn.portId);
        if (portNum < minPortNum) {
          minPortNum = portNum;
          vlan1RootPortId = conn.portId;
        }
      });
    }
  }

  if (vlan1IsRootBridge) {
    Object.entries(state.ports || {}).forEach(([portName, port]: [string, any]) => {
      if (!portName.toLowerCase().startsWith('vlan') && !portName.toLowerCase().startsWith('console') && port.status === 'connected') {
        vlan1StpState.set(portName, { role: 'Desg', state: 'FWD' });
      }
    });
  } else if (vlan1RootPortId) {
    vlan1StpState.set(vlan1RootPortId, { role: 'Root', state: 'FWD' });
    Object.entries(state.ports || {}).forEach(([portName, port]: [string, any]) => {
      if (!portName.toLowerCase().startsWith('vlan') && !portName.toLowerCase().startsWith('console') && port.status === 'connected') {
        if (!vlan1StpState.has(portName)) {
          vlan1StpState.set(portName, { role: 'Desg', state: 'FWD' });
        }
      }
    });
  }

  vlan1StpState.forEach((stpInfo, portId) => {
    const port = state.ports?.[portId];
    if (port) {
      const roleMap: Record<string, 'root' | 'designated' | 'alternate' | 'backup' | 'disabled'> = {
        'Root': 'root',
        'Desg': 'designated',
        'Altn': 'alternate',
        'Back': 'backup',
        'Disa': 'disabled'
      };
      const stateMap: Record<string, 'forwarding' | 'blocking' | 'listening' | 'learning' | 'disabled'> = {
        'FWD': 'forwarding',
        'BLK': 'blocking',
        'LIS': 'listening',
        'LRN': 'learning',
        'DIS': 'disabled'
      };

      updatedPorts[portId] = {
        ...port,
        spanningTree: {
          ...(port.spanningTree || {}),
          role: roleMap[stpInfo.role] || 'designated',
          state: stateMap[stpInfo.state] || 'forwarding'
        }
      };
    }
  });

  // Return updated state with spanningTree info
  const newState: any = { ports: { ...state.ports, ...updatedPorts } };

  return { success: true, output, newState };
}

/**
 * Show Spanning Tree Interface
 */
function cmdShowSpanningTreeInterface(
  state: any,
  input: string,
  ctx: any
): any {
  const match = input.match(/show\s+spanning-tree\s+interface\s+(\S+)(?:\s+detail)?/i);
  const interfaceName = match?.[1];
  const isDetail = input.toLowerCase().includes('detail');

  if (!interfaceName) {
    return { success: false, error: '% Incomplete command.' };
  }

  const port = (state.ports || {})[interfaceName.toLowerCase()];
  if (!port) {
    return { success: false, error: `% Interface ${interfaceName} not found` };
  }

  let output = `\nSpanning Tree Protocol for interface ${interfaceName}\n`;
  const stp = port.spanningTree;

  if (!stp) {
    output += '  Spanning Tree not configured on this interface\n';
  } else {
    output += `  Port Role: ${stp.role || 'disabled'}\n`;
    output += `  Port State: ${stp.state || 'disabled'}\n`;

    if (stp.portfast) {
      output += `  Portfast: enabled\n`;
    }
    if (stp.bpduguard) {
      output += `  BPDU Guard: enabled\n`;
    }

    if (isDetail) {
      output += `\n  Designated Root Maintenance\n`;
      output += `    Priority: 32768\n`;
      output += `    Cost: 0\n`;
      output += `    Port: 0\n`;
      output += `    Hello Time: 2\n`;
      output += `    Max Age: 20\n`;
      output += `    Forward Delay: 15\n`;

      output += `\n  Port Role State Transitions\n`;
      output += `    Forward Transitions: 1\n`;
      output += `    Blocked Transitions: 0\n`;

      if (stp.instances && Object.keys(stp.instances).length > 0) {
        output += `\n  MSTP Instances:\n`;
        Object.keys(stp.instances).forEach(instId => {
          const inst = stp.instances![instId as any];
          output += `    Instance ${instId}:\n`;
          output += `      Role: ${inst.role || 'disabled'}\n`;
          output += `      State: ${inst.state || 'disabled'}\n`;
        });
      }
    }
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show Port Security
 */
function cmdShowPortSecurity(
  state: any,
  input: string,
  ctx: any
): any {
  let output = '\nSecure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action\n';
  output += '-----------------------------------------------------------------------\n';

  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.portSecurity?.enabled) {
      const maxAddr = port.portSecurity.maxAddresses || 1;
      const currentAddr = (port.staticMacs?.length || 0) + (port.portSecurity.sticky ? 1 : 0);
      const violations = port.portSecurity.violations || 0;
      const action = port.portSecurity.violationAction || 'Shutdown';
      output += `${portName.padEnd(12)}${String(maxAddr).padEnd(15)}${String(currentAddr).padEnd(13)}${String(violations).padEnd(20)}${action}\n`;
    }
  });

  output += '!\n';

  // Show aging information if configured
  let hasAging = false;
  let agingOutput = '\nAging Configuration:\n';
  agingOutput += '--------------------\n';
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.portSecurity?.enabled && port.portSecurity.aging?.enabled) {
      hasAging = true;
      const agingTime = port.portSecurity.aging.time || 0;
      const agingType = port.portSecurity.aging.type || 'absolute';
      agingOutput += `${portName.padEnd(12)}Time: ${agingTime} min, Type: ${agingType}\n`;
    }
  });

  if (hasAging) {
    output += agingOutput;
  }

  return { success: true, output };
}

/**
 * Helper function to get prefix length from subnet mask
 */
function getPrefixLength(subnetMask: string | undefined): number {
  if (!subnetMask) return 0;
  const parts = subnetMask.split('.').map(Number);
  let count = 0;

  for (const part of parts) {
    if (part === 255) count += 8;
    else if (part === 254) { count += 7; break; }
    else if (part === 252) { count += 6; break; }
    else if (part === 248) { count += 5; break; }
    else if (part === 240) { count += 4; break; }
    else if (part === 224) { count += 3; break; }
    else if (part === 192) { count += 2; break; }
    else if (part === 128) { count += 1; break; }
    else break;
  }

  return count;
}

/**
 * Helper function to calculate network address from IP and subnet mask
 */
function getNetworkAddress(ipAddress: string, subnetMask: string): string {
  const ipParts = ipAddress.split('.').map(Number);
  const maskParts = subnetMask.split('.').map(Number);

  const networkParts = ipParts.map((part, index) => part & maskParts[index]);

  return networkParts.join('.');
}

/**
 * Helper function to format port name (fa0/1 -> FastEthernet0/1, gi0/1 -> GigabitEthernet0/1)
 */
function formatPortName(portName: string): string {
  const lowerName = portName.toLowerCase();

  if (lowerName.startsWith('fa')) {
    return 'FastEthernet' + lowerName.slice(2);
  } else if (lowerName.startsWith('gi')) {
    return 'GigabitEthernet' + lowerName.slice(2);
  } else if (lowerName.startsWith('eth')) {
    return 'Ethernet' + lowerName.slice(4);
  }

  return portName;
}

/**
 * Do Show - Execute show command from config mode
 */
function cmdDoShow(
  state: any,
  input: string,
  ctx: any
): any {
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
function cmdShowWireless(
  state: any,
  input: string,
  ctx: any
): any {
  // Check if device is a switch - show wireless is not a switch command
  const device = ctx.devices?.find((d: any) => d.id === ctx.sourceDeviceId);
  if (device && (device.type === 'switchL2' || device.type === 'switchL3')) {
    return { success: false, error: '% Invalid command. show wireless is not a switch command.\nWireless summary is only available on Wireless LAN Controllers (WLC).\nWLC commands: show wlan summary, show ap summary' };
  }

  let output = '\nWireless Configuration Status\n';
  output += '-------------------------------------------\n';
  output += 'Interface   Mode     SSID           Security   Channel  Status\n';
  output += '---------   ------   -------------  ---------  -------  ----------\n';

  let found = false;
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (portName.toLowerCase().startsWith('wlan')) {
      found = true;
      const wifi = port.wifi || {};
      const mode = (wifi.mode || 'disabled').padEnd(8);
      const ssid = (wifi.ssid || '-').padEnd(14);
      const security = (wifi.security || 'open').padEnd(10);
      const channel = (wifi.channel || '2.4GHz').padEnd(8);
      const status = (port.shutdown ? 'Down' : 'Up');

      output += `${portName.padEnd(11)} ${mode}${ssid}${security}${channel}${status}\n`;
    }
  });

  if (!found) {
    output += 'No wireless interfaces found on this device.\n';
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show WLAN Summary - Display WLAN configuration summary (WLC only)
 */
function cmdShowWlanSummary(
  state: any,
  input: string,
  ctx: any
): any {
  // Check if device is a switch - show wlan summary is not a switch command
  const device = ctx.devices?.find((d: any) => d.id === ctx.sourceDeviceId);
  if (device && (device.type === 'switchL2' || device.type === 'switchL3')) {
    return { success: false, error: '% Invalid command. show wlan summary is only available on Wireless LAN Controllers (WLC).' };
  }

  let output = '\nWLAN Summary\n';
  output += '-----------\n';
  output += 'WLAN ID  Profile Name  SSID              Status  Security\n';
  output += '--------  ------------  ----------------  ------  --------\n';

  const wlans = state.wlans || {};
  Object.keys(wlans).forEach(wlanId => {
    const wlan = wlans[wlanId];
    output += `${wlanId.padEnd(8)}  ${wlan.name.padEnd(12)}  ${wlan.ssid.padEnd(16)}  Up      ${state.ports['wlan0']?.wifi?.security || 'open'}\n`;
  });

  if (Object.keys(wlans).length === 0) {
    output += 'No WLANs configured.\n';
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show AP Summary - Display AP summary (WLC only)
 */
function cmdShowApSummary(
  state: any,
  input: string,
  ctx: any
): any {
  // Check if device is a switch - show ap summary is not a switch command
  const device = ctx.devices?.find((d: any) => d.id === ctx.sourceDeviceId);
  if (device && (device.type === 'switchL2' || device.type === 'switchL3')) {
    return { success: false, error: '% Invalid command. show ap summary is only available on Wireless LAN Controllers (WLC).' };
  }

  let output = '\nAP Summary\n';
  output += '----------\n';
  output += 'AP Name  MAC Address  IP Address  Status  WLAN\n';
  output += '--------  -----------  ----------  ------  ----\n';

  // Display wlan0 interface as AP
  const wlan = state.ports['wlan0'];
  if (wlan && !wlan.shutdown && wlan.wifi?.ssid) {
    output += `${device?.name?.padEnd(8) || 'AP1'.padEnd(8)}  ${state.macAddress || '0000.0000.0000'}  ${wlan.ipAddress || '-'}  ${wlan.shutdown ? 'Down' : 'Up'}  ${wlan.wifi.ssid}\n`;
  } else {
    output += 'No APs configured.\n';
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show SSH - Display SSH server configuration and session summary
 */
function cmdShowSsh(
  state: any,
  input: string,
  ctx: any
): any {
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
    normalizedSessions.forEach((session: any, index: number) => {
      output += `${String(index + 1).padEnd(8)}  ${(session.user || 'unknown').padEnd(9)}  ${session.source || 'unknown'}\n`;
    });
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show IP DHCP Snooping
 */
function cmdShowIpDhcpSnooping(state: any, input: string, ctx: any): any {
  const enabled = state.dhcpSnoopingEnabled ?? false;
  const vlans: string[] = state.dhcpSnoopingVlans ?? [];

  let output = '\nDHCP snooping is ' + (enabled ? 'enabled' : 'disabled') + '\n';
  output += 'DHCP snooping is configured on following VLANs:\n';
  output += vlans.length > 0 ? vlans.join(',') + '\n' : 'none\n';
  output += '\nInsertion of option 82 is ' + (state.dhcpOption82 ? 'enabled' : 'disabled') + '\n';
  output += '\nInterface           Trusted   Rate limit (pps)\n';
  output += '-----------         -------   ----------------\n';

  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port?.dhcpSnoopingTrust) {
      output += `${portName.padEnd(20)}yes       unlimited\n`;
    }
  });

  output += '!\n';
  return { success: true, output };
}

/**
 * Show Interfaces Status
 */
function cmdShowInterfacesStatus(state: any, input: string, ctx: any): any {
  let output = '\nPort      Name               Status       Vlan       Duplex  Speed  Type                  Encap\n';
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    const status = port.shutdown ? 'notconnect' : 'connected';
    const operStatus = port.operStatus || status;
    const vlan = port.mode === 'trunk' ? 'trunk' : (port.accessVlan || port.vlan || 1);
    const duplex = port.duplex === 'half' ? 'half' : (port.duplex === 'full' ? 'full' : 'a-full');
    const speedVal = port.speed === 'auto' ? (port.type === 'gigabitethernet' ? 'a-1000' : 'a-100') : port.speed;
    const typeStr = port.type === 'gigabitethernet' ? '10/100/1000BaseTX' : '10/100BaseTX';
    const encap = port.encapsulation || (port.mode === 'trunk' ? '802.1q' : '-');

    output += `${portName.padEnd(10)}${(port.description || port.name || '').padEnd(19)}${String(operStatus).padEnd(13)}${String(vlan).padEnd(11)}${duplex.padEnd(8)}${speedVal.padEnd(7)}${typeStr.padEnd(21)}${encap}\n`;
  });
  return { success: true, output };
}

/**
 * Show CDP (brief)
 */
function cmdShowCdp(state: any, input: string, ctx: any): any {
  const enabled = state.cdpEnabled !== false;
  let output = '\nGlobal CDP information:\n';
  output += `  CDP is ${enabled ? 'enabled' : 'disabled'}\n`;
  output += `  Sending CDP packets every 60 seconds\n`;
  output += `  Sending a holdtime value of 180 seconds\n`;
  return { success: true, output };
}

/**
 * Show VTP Status
 */
function cmdShowVtpStatus(state: any, input: string, ctx: any): any {
  let output = '\nVTP Version capable             : 1 to 3\n';
  output += `VTP version running             : 2\n`;
  output += `VTP Domain Name                 : ${state.vtpDomain || ''}\n`;
  output += `VTP Pruning Mode                : Disabled\n`;
  output += `VTP Traps Generation            : Disabled\n`;
  output += `MD5 digest                      : 0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00\n`;
  output += `Configuration last modified by  : 0.0.0.0 at 0-0-00 00:00:00\n`;
  output += `Local updater ID is 0.0.0.0 (no valid interface found)\n\n`;
  output += `Feature VLAN:\n`;
  output += `--------------\n`;
  output += `VTP Operating Mode                : ${(state.vtpMode || 'server').charAt(0).toUpperCase() + (state.vtpMode || 'server').slice(1)}\n`;
  output += `Maximum VLANs supported locally   : 1005\n`;
  output += `Number of existing VLANs          : ${Object.keys(state.vlans || {}).length}\n`;
  output += `Configuration Revision            : ${state.vtpRevision || 0}\n`;
  output += `MD5 digest                       : 0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00\n`;
  return { success: true, output };
}

/**
 * Show EtherChannel Summary
 */
function cmdShowEtherchannel(state: any, input: string, ctx: any): any {
  const lowerInput = input.toLowerCase();

  // Parse options: summary, detail, port, load-balance
  let option = '';
  let subArg = '';
  const optMatch = input.match(/^show\s+etherchannel\s+(\w+)\s*(.*)$/i);
  if (optMatch) {
    option = optMatch[1].toLowerCase();
    subArg = optMatch[2].trim();
  }

  // show etherchannel load-balance
  if (option === 'load-balance') {
    const groups: Record<number, string[]> = {};
    Object.keys(state.ports || {}).forEach(portName => {
      const port = state.ports[portName];
      if (port.channelGroup) {
        if (!groups[port.channelGroup]) groups[port.channelGroup] = [];
        groups[port.channelGroup].push(portName);
      }
    });

    let output = '\nLoad-balanceing: Src-dst-ip-and-4\n';
    output += 'Hash aritmatic: Rotational\n';
    output += `Minimum load:  0    %<->100\n`;
    if (Object.keys(groups).length === 0) {
      output += 'Members : <empty>\n';
    } else {
      output += 'Members : ' + Object.entries(groups).map(([g, ps]) => `Po${g}: ${ps.join(', ')}`).join(', ') + '\n';
    }
    return { success: true, output };
  }

  // show etherchannel port-channel
  if (option === 'port-channel') {
    const groups: Record<number, string[]> = {};
    Object.keys(state.ports || {}).forEach(portName => {
      const port = state.ports[portName];
      if (port.channelGroup) {
        if (!groups[port.channelGroup]) groups[port.channelGroup] = [];
        groups[port.channelGroup].push(portName);
      }
    });

    let output = '\nPort-channels in the switch:\n\n';
    if (Object.keys(groups).length === 0) {
      output += 'No port-channels configured\n';
    } else {
      Object.entries(groups).forEach(([group, ports]) => {
        const mode = state.ports[ports[0]]?.channelMode || 'on';
        const protocol = state.ports[ports[0]]?.channelProtocol || (mode === 'on' ? '-' : 'LACP');
        output += `Port-channel ${group}\n`;
        output += `  Protocol: ${protocol.toUpperCase()}\n`;
        output += `  Mode: ${mode.toUpperCase()}\n`;
        output += `  Member ports: ${ports.join(', ')}\n\n`;
      });
    }
    return { success: true, output };
  }

  // show etherchannel summary
  if (option === 'summary') {
    const groups: Record<number, string[]> = {};
    Object.keys(state.ports || {}).forEach(portName => {
      const port = state.ports[portName];
      if (port.channelGroup) {
        if (!groups[port.channelGroup]) groups[port.channelGroup] = [];
        groups[port.channelGroup].push(portName);
      }
    });

    let output = '\nFlags:  D - down        P - bundled in port-channel\n';
    output += '        I - stand-alone s - suspended\n';
    output += '        H - Hot-standby (LACP only)\n';
    output += '        R - Layer3      S - Layer2\n';
    output += '        U - in use      f - failed to allocate aggregator\n\n';
    output += `Number of channel-groups in use: ${Object.keys(groups).length}\n`;
    output += `Number of aggregators:           ${Object.keys(groups).length}\n\n`;
    output += 'Group  Port-channel  Protocol    Ports\n';
    output += '------+-------------+-----------+-----------------------------------------------\n';

    Object.entries(groups).forEach(([group, ports]) => {
      const mode = state.ports[ports[0]]?.channelMode || 'on';
      const protocol = state.ports[ports[0]]?.channelProtocol || (mode === 'on' ? '-' : 'LACP');
      output += `${group.padEnd(7)}Po${group.padEnd(13)}${protocol.toUpperCase().padEnd(12)}${ports.join(', ')}\n`;
    });

    return { success: true, output };
  }

  // show etherchannel port
  if (option === 'port') {
    const groups: Record<number, string[]> = {};
    Object.keys(state.ports || {}).forEach(portName => {
      const port = state.ports[portName];
      if (port.channelGroup) {
        if (!groups[port.channelGroup]) groups[port.channelGroup] = [];
        groups[port.channelGroup].push(portName);
      }
    });

    let output = '\nChannel group listing:\n';
    output += '--------------------------------------------\n';
    if (Object.keys(groups).length === 0) {
      output += '<none>\n';
    } else {
      Object.entries(groups).forEach(([group, ports]) => {
        output += `Group ${group}: Po${group} -> ${ports.join(', ')}\n`;
      });
    }
    return { success: true, output };
  }

  // show etherchannel detail
  if (option === 'detail') {
    const groups: Record<number, string[]> = {};
    Object.keys(state.ports || {}).forEach(portName => {
      const port = state.ports[portName];
      if (port.channelGroup) {
        if (!groups[port.channelGroup]) groups[port.channelGroup] = [];
        groups[port.channelGroup].push(portName);
      }
    });

    let output = '\nFlags:  D - down        P - bundled in port-channel\n';
    output += '        I - stand-alone s - suspended\n';
    output += '        H - Hot-standby (LACP only)\n';
    output += '        R - Layer3      S - Layer2\n';
    output += '        U - in use      f - failed to allocate aggregator\n\n';
    output += `Number of channel-groups in use: ${Object.keys(groups).length}\n`;
    output += `Number of aggregators:           ${Object.keys(groups).length}\n\n`;
    output += 'Group Port-channel     Protocol Ports\n';
    output += '------+---------------+---------+------------------------\n';
    Object.entries(groups).forEach(([group, ports]) => {
      const mode = state.ports[ports[0]]?.channelMode || 'on';
      output += `${group.padEnd(7)}Po${group.padEnd(14)}${mode.toUpperCase().padEnd(10)}${ports.join(', ')}\n`;
    });
    return { success: true, output };
  }

  // Default: show etherchannel (or summary)
  const groups: Record<number, string[]> = {};
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.channelGroup) {
      if (!groups[port.channelGroup]) groups[port.channelGroup] = [];
      groups[port.channelGroup].push(portName);
    }
  });

  let output = '\nFlags:  D - down        P - bundled in port-channel\n';
  output += '        I - stand-alone s - suspended\n';
  output += '        H - Hot-standby (LACP only)\n';
  output += '        R - Layer3      S - Layer2\n';
  output += '        U - in use      f - failed to allocate aggregator\n\n';
  output += `Number of channel-groups in use: ${Object.keys(groups).length}\n`;
  output += `Number of aggregators:           ${Object.keys(groups).length}\n\n`;
  output += 'Group  Port-channel  Protocol    Ports\n';
  output += '------+-------------+-----------+-----------------------------------------------\n';

  Object.entries(groups).forEach(([group, ports]) => {
    const mode = state.ports[ports[0]]?.channelMode || 'on';
    const protocol = state.ports[ports[0]]?.channelProtocol || (mode === 'on' ? '-' : 'LACP');
    output += `${group.padEnd(7)}Po${group.padEnd(13)}${protocol.toUpperCase().padEnd(12)}${ports.join(', ')}\n`;
  });

  return { success: true, output };
}

/**
 * Show ARP / Show IP ARP
 */
function cmdShowArp(state: any, input: string, ctx: any): any {
  let output = '\nProtocol  Address          Age (min)  Hardware Addr   Type   Interface\n';

  // Use real ARP cache from state
  const arpCache = state.arpCache || [];
  const now = Date.now();
  const ARP_TIMEOUT = 14400000; // 4 hours in milliseconds

  const arpEntries: { protocol: string; address: string; age: string; mac: string; type: string; interface: string }[] = [];

  // Add entries from ARP cache
  arpCache.forEach((entry: any) => {
    // Calculate age in minutes
    const ageMs = now - entry.timestamp;
    const ageMin = Math.floor(ageMs / 60000); // Convert to minutes

    // Format MAC address
    const mac = formatMacAddressSimple(entry.mac);

    arpEntries.push({
      protocol: 'Internet',
      address: entry.ip,
      age: ageMin.toString(),
      mac: mac,
      type: 'ARPA',
      interface: entry.interface
    });
  });

  // Add static ARP entries from MAC table
  (state.macAddressTable || []).forEach((entry: any) => {
    if (entry.type === 'STATIC') {
      arpEntries.push({
        protocol: 'Internet',
        address: entry.ip || '',
        age: '-',
        mac: entry.mac,
        type: 'ARPA',
        interface: `Vlan${entry.vlan}`
      });
    }
  });

  // Display ARP entries
  if (arpEntries.length > 0) {
    arpEntries.forEach((entry) => {
      output += `${entry.protocol.padEnd(9)}${entry.address.padEnd(18)}${entry.age.padEnd(11)}${entry.mac.padEnd(17)}${entry.type.padEnd(7)}${entry.interface}\n`;
    });
  } else {
    output += 'No ARP entries found\n';
  }

  return { success: true, output };
}

/**
 * Show MLS QoS
 */
function cmdShowMlsQos(state: any, input: string, ctx: any): any {
  const enabled = state.mlsQosEnabled ?? false;
  return { success: true, output: `\nQoS is ${enabled ? 'enabled' : 'disabled'}\n` };
}

/**
 * Show IP ARP Inspection
 */
function cmdShowIpArpInspection(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nSource Mac Validation      : Disabled\nDestination Mac Validation : Disabled\nIP Address Validation      : Disabled\n\n Vlan     Configuration    Operation   ACL Match          Static ACL\n------   -------------    ---------   ---------          ----------\n' };
}

/**
 * Show Access-Lists
 */
function cmdShowAccessLists(state: any, input: string, ctx: any): any {
  const hasClassicAcls = !!state.accessLists && Object.keys(state.accessLists).length > 0;
  const firewallRules = Array.isArray(state.firewallRules) ? state.firewallRules : [];
  const hasFirewallAcls = firewallRules.length > 0;

  if (!hasClassicAcls && !hasFirewallAcls) {
    return { success: true, output: '\n% No access lists configured\n' };
  }

  let output = '\n';

  if (hasClassicAcls) {
    Object.entries(state.accessLists).forEach(([aclId, rules]: [string, any]) => {
      output += `Standard IP access list ${aclId}\n`;
      rules.forEach((rule: string, index: number) => {
        output += `    ${(index + 1) * 10} ${rule}\n`;
      });
    });
  }

  if (hasFirewallAcls) {
    output += 'access-list OUTSIDE-IN\n';
    firewallRules.forEach((rule: any, index: number) => {
      const inactive = rule.enabled === false ? 'inactive ' : '';
      const protocol = rule.protocol === 'any' ? 'ip' : (rule.protocol || 'ip');
      output += `    line ${index + 1} extended ${inactive}${rule.action} ${protocol} ${rule.sourceIp} ${rule.targetIp} eq ${rule.port}\n`;
    });
  }

  return { success: true, output };
}

/**
 * Show History
 */
function cmdShowHistory(state: any, input: string, ctx: any): any {
  const history = state.commandHistory || [];
  let output = '\n';
  history.slice(-20).forEach((cmd: string) => { output += `  ${cmd}\n`; });
  return { success: true, output };
}

/**
 * Show Users
 */
function cmdShowUsers(state: any, input: string, ctx: any): any {
  let output = '\n    Line       User       Host(s)              Idle       Location\n';
  output += '*   0 con 0                idle                 00:00:00\n';
  return { success: true, output };
}

/**
 * Show Environment
 */
function cmdShowEnvironment(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nSystem Temperature Value: 36 Degree Celsius\nSystem Temperature State: GREEN\nYellow Threshold : 46 Degree Celsius\nRed Threshold    : 56 Degree Celsius\n' };
}

/**
 * Show Inventory
 */
function cmdShowInventory(state: any, input: string, ctx: any): any {
  const profile = getSwitchDisplayProfile(state);
  return { success: true, output: `\nNAME: "1", DESCR: "${profile.switchModel}"\nPID: ${profile.switchModel}  , VID: V01, SN: ${state.version?.serialNumber || 'FOC0000X000'}\n` };
}

/**
 * Show Errdisable Recovery
 */
function cmdShowErrdisableRecovery(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nErrDisable Reason            Timer Status\n-----------------            --------------\nbpduguard                    Disabled\npsecure-violation            Disabled\nport-security                Disabled\n\nTimer interval: 300 seconds\n' };
}

/**
 * Show Storm-Control
 */
function cmdShowStormControl(state: any, input: string, ctx: any): any {
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
function cmdShowUdld(state: any, input: string, ctx: any): any {
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
function cmdShowMonitor(state: any, input: string, ctx: any): any {
  return { success: true, output: '\n% No SPAN sessions configured\n' };
}

/**
 * Show Debug
 */
function cmdShowDebug(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nAll possible debugging has been turned off\n' };
}

/**
 * Show Processes
 */
function cmdShowProcesses(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nCPU utilization for five seconds: 1%/0%; one minute: 1%; five minutes: 1%\n' };
}

/**
 * Show Memory
 */
function cmdShowMemory(state: any, input: string, ctx: any): any {
  return { success: true, output: '\n                Head    Total(b)     Used(b)     Free(b)   Lowest(b)  Largest(b)\nProcessor  65536000    65536000     8192000    57344000    57344000    57344000\n' };
}

/**
 * Show SDM Prefer
 */
function cmdShowSdmPrefer(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nThe current template is "default" template.\n The selected template optimizes the resources in\n the switch to support this level of features for\n 8 routed interfaces and 1024 VLANs.\n' };
}

/**
 * Show System MTU
 */
function cmdShowSystemMtu(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nSystem MTU size is 1500 bytes\nSystem Jumbo MTU size is 1500 bytes\nRouting MTU size is 1500 bytes\n' };
}

function cmdShowIpDhcpPool(state: any, input: string, ctx: any): any {
  const pools = state.dhcpPools || {};
  const poolNames = Object.keys(pools);
  if (poolNames.length === 0) {
    return { success: true, output: '\n% No DHCP pools configured\n' };
  }
  let output = '\n';
  poolNames.forEach(name => {
    const p = pools[name];
    output += `Pool ${name} :\n`;
    output += ` Utilization mark (high/low)    : 100 / 0\n`;
    output += ` Subnet size (first/next)        : 0 / 0\n`;
    output += ` Total addresses                 : 254\n`;
    output += ` Leased addresses                : 0\n`;
    output += ` Pending event                   : none\n`;
    if (p.network && p.subnetMask) {
      output += ` 1 subnet is currently in the pool :\n`;
      output += ` Current index        IP address range                    Leased addresses\n`;
      output += ` ${(p.network + '').padEnd(21)} ${p.network} - ${p.network.replace(/\.\d+$/, '.254')}   0\n`;
    }
    output += `\n`;
    output += `Pool ${name}:\n`;
    output += ` Network             : ${p.network || 'not set'} ${p.subnetMask || ''}\n`;
    output += ` Default router      : ${p.defaultRouter || 'not set'}\n`;
    output += ` DNS server          : ${p.dnsServer || 'not set'}\n`;
    if (p.domainName) output += ` Domain name         : ${p.domainName}\n`;
    if (p.leaseTime) output += ` Lease               : ${p.leaseTime}\n`;
    output += '\n';
  });
  return { success: true, output };
}

function cmdShowIpDhcpBinding(state: any, input: string, ctx: any): any {
  let output = '\nIP address       Client-ID/              Lease expiration        Type\n' +
    '                 Hardware address\n';

  const devices = ctx.devices || [];
  const sourceDeviceId = ctx.sourceDeviceId;
  const connections = ctx.connections || [];

  // Find devices that received DHCP from this device
  // A device is considered a DHCP client if its ipConfigMode is 'dhcp' 
  // and it's connected (directly or indirectly) to this device.
  const dhcpClients = devices.filter((d: any) =>
    (d.type === 'pc' || d.type === 'iot') &&
    d.ipConfigMode === 'dhcp' &&
    d.ip &&
    d.ip !== '0.0.0.0' &&
    !d.ip.startsWith('169.254.')
  );

  if (dhcpClients.length === 0) {
    output += '% No bindings found\n';
  } else {
    dhcpClients.forEach((client: any) => {
      // Check if this client's IP belongs to one of our pools
      const cliPools = state.dhcpPools || {};
      const servicePools = state.services?.dhcp?.pools || [];

      let belongsToOurPool = false;

      // Check CLI pools
      for (const poolName in cliPools) {
        const pool = cliPools[poolName];
        if (pool.network && pool.subnetMask) {
          if (isIpInNetwork(client.ip, pool.network, pool.subnetMask)) {
            belongsToOurPool = true;
            break;
          }
        }
      }

      // Check Service pools
      if (!belongsToOurPool) {
        for (const pool of servicePools) {
          if (pool.startIp && pool.subnetMask) {
            // Simple check: same subnet
            if (isIpInNetwork(client.ip, pool.startIp, pool.subnetMask)) {
              belongsToOurPool = true;
              break;
            }
          }
        }
      }

      if (belongsToOurPool) {
        const mac = client.macAddress || '0000.0000.0000';
        const formattedMac = mac.replace(/[:-]/g, '').toLowerCase();
        const clientId = `01${formattedMac}`; // Format: 01 + mac
        output += `${client.ip.padEnd(16)} ${clientId.padEnd(23)} Infinite                Automatic\n`;
      }
    });

    if (output.endsWith('Hardware address\n')) {
      output += '% No bindings found\n';
    }
  }

  return { success: true, output };
}

// Helper for DHCP check
function isIpInNetwork(ip: string, network: string, mask: string): boolean {
  try {
    const ipParts = ip.split('.').map(Number);
    const netParts = network.split('.').map(Number);
    const maskParts = mask.split('.').map(Number);

    if (ipParts.length !== 4 || netParts.length !== 4 || maskParts.length !== 4) return false;

    for (let i = 0; i < 4; i++) {
      if ((ipParts[i] & maskParts[i]) !== (netParts[i] & maskParts[i])) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Show IP Source Binding
 */
function cmdShowIpSourceBinding(state: any, input: string, ctx: any): any {
  // Parse optional filter (vlan or interface)
  const match = input.match(/show\s+ip\s+source\s+binding(?:\s+(vlan\s+\d+|interface\s+\S+))?/i);
  const filter = match?.[1];

  let output = '\nMacAddress          IpAddress       Lease(sec)  Type           VLAN  Interface\n';
  output += '------------------  --------------  ----------  -------------  ----  --------------------\n';

  // Check if DHCP snooping is enabled
  if (!state.dhcpSnoopingEnabled) {
    output += '% DHCP snooping not enabled\n';
    return { success: true, output };
  }

  // Build bindings from port data
  const bindings: any[] = [];
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.dhcpSnoopingTrust && port.ipAddress) {
      bindings.push({
        mac: port.macAddress || '0000.0000.0000',
        ip: port.ipAddress,
        vlan: port.vlan || 1,
        interface: portName,
        type: 'dhcp-snooping'
      });
    }
  });

  if (bindings.length === 0) {
    output += '% No bindings found\n';
  } else {
    bindings.forEach(b => {
      output += `${b.mac.padEnd(18)}  ${b.ip.padEnd(14)}  0           ${b.type.padEnd(13)}  ${String(b.vlan).padEnd(4)}  ${b.interface}\n`;
    });
  }

  return { success: true, output };
}

/**
 * Show parent command (incomplete)
 */
function cmdShowParent(state: any, input: string, ctx: any): any {
  return { success: false, error: IOS_ERRORS.incomplete };
}

/**
 * Show IP Interface (specific)
 */
function cmdShowIpInterface(state: any, input: string, ctx: any): any {
  const match = input.match(/show\s+ip\s+interface\s*(\S+)?/i);
  const interfaceName = match?.[1];

  const renderInterfaceIPInfo = (name: string, port: any) => {
    let out = `${name} is ${port.shutdown ? 'administratively down' : 'up'}, line protocol is ${port.shutdown ? 'down' : 'up'}\n`;
    out += `  Internet address is ${port.ipAddress || 'unassigned'}/${port.subnetMask || ''}\n`;
    out += `  Broadcast address is 255.255.255.255\n`;
    out += `  Address determined by setup command\n`;
    out += `  MTU is 1500 bytes\n`;
    out += `  Helper address is ${port.helperAddresses?.join(', ') || 'not set'}\n`;
    out += `  Directed broadcast forwarding is disabled\n`;
    out += `  Outgoing access list is ${port.accessGroupOut || 'not set'}\n`;
    out += `  Inbound  access list is ${port.accessGroupIn || 'not set'}\n`;
    out += `  Proxy ARP is ${port.proxyArp ? 'enabled' : 'disabled'}\n`;
    out += `  Local Proxy ARP is disabled\n`;
    out += `  Security level is not set\n`;
    out += `  Split horizon is enabled\n`;
    out += `  ICMP redirects are always sent\n`;
    out += `  ICMP unreachables are always sent\n`;
    out += `  ICMP mask replies are never sent\n`;
    out += `  IP fast switching is enabled\n`;
    out += `  IP flow switching is disabled\n`;
    out += `  IP CEF switching is enabled\n`;
    return out;
  };

  if (!interfaceName) {
    let output = '\n';
    Object.entries(state.ports || {}).forEach(([name, port]: [string, any]) => {
      output += renderInterfaceIPInfo(name, port) + '!\n';
    });
    return { success: true, output };
  }

  const normalized = interfaceName.toLowerCase();
  const port = state.ports?.[normalized];

  if (!port) {
    return { success: false, error: `% Interface ${interfaceName} not found` };
  }

  return { success: true, output: '\n' + renderInterfaceIPInfo(interfaceName, port) };
}

/**
 * Show IPv6 Interface Brief
 */
function cmdShowIpv6InterfaceBrief(state: any, input: string, ctx: any): any {
  let output = '\nInterface              IPv6-Address                                Status                Protocol\n';

  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    const status = port.shutdown ? 'administratively down' : 'up';
    const protocol = port.shutdown ? 'down' : 'up';

    if (port.ipv6Address && port.ipv6Prefix) {
      const addr = `${port.ipv6Address}/${port.ipv6Prefix}`;
      output += `${portName.padEnd(22)} ${addr.padEnd(43)} ${status.padEnd(21)} ${protocol}\n`;
    } else {
      output += `${portName.padEnd(22)} unassigned                                  ${status.padEnd(21)} ${protocol}\n`;
    }
  });

  return { success: true, output };
}

/**
 * Show IPv6 Route
 */
function cmdShowIpv6Route(state: any, input: string, ctx: any): any {
  let output = '\n';

  if (!state.ipv6Enabled) {
    output += '% IPv6 routing is not enabled\n';
    return { success: true, output };
  }

  const routes: string[] = [];

  // Connected routes
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.ipv6Address && port.ipv6Prefix && !port.shutdown) {
      routes.push(`C   ${port.ipv6Address}/${port.ipv6Prefix} [0/0]\n     via ${portName}, directly connected`);
      routes.push(`L   ${port.ipv6Address}/128 [0/0]\n     via ${portName}, receive`);
    }
  });

  // Static routes
  if (state.ipv6StaticRoutes && state.ipv6StaticRoutes.length > 0) {
    state.ipv6StaticRoutes.forEach((route: any) => {
      const metric = route.metric || 1;
      routes.push(`S   ${route.destination}/${route.prefixLength} [${metric}/0]\n     via ${route.nextHop}`);
    });
  }

  // Dynamic routes
  if (state.ipv6DynamicRoutes && state.ipv6DynamicRoutes.length > 0) {
    state.ipv6DynamicRoutes.forEach((route: any) => {
      const metric = route.metric || 1;
      const code = state.routingProtocol === 'ospfv3' ? 'O' : 'R';
      routes.push(`${code}   ${route.destination}/${route.prefixLength} [${code === 'O' ? 110 : 120}/${metric}]\n     via ${route.nextHop}`);
    });
  }

  output += `IPv6 Routing Table - default - ${routes.length} entries\n`;
  output += 'Codes: C - Connected, L - Local, S - Static, U - Per-user Static route\n';
  output += '       B - BGP, R - RIP, I1 - ISIS L1, I2 - IS-IS L2\n';
  output += '       IA - IS-IS interarea, IS - IS-IS summary, D - EIGRP, EX - EIGRP external\n';
  output += '       O - OSPF Intra, OI - OSPF Inter, OE1 - OSPF ext 1, OE2 - OSPF ext 2\n';
  output += '       ON1 - OSPF NSSA ext 1, ON2 - OSPF NSSA ext 2\n\n';

  if (routes.length === 0) {
    output += 'No IPv6 routes found\n';
  } else {
    output += routes.join('\n') + '\n';
  }

  return { success: true, output };
}

/**
 * Show IPv6 DHCP Pool
 */
function cmdShowIpv6DhcpPool(state: any, input: string, ctx: any): any {
  const pools = state.ipv6DhcpPools || {};
  const poolNames = Object.keys(pools);
  if (poolNames.length === 0) {
    return { success: true, output: '\n% No IPv6 DHCP pools configured\n' };
  }

  const match = input.match(/show\s+ipv6\s+dhcp\s+pool\s*(\S+)?/i);
  const requestedPool = match?.[1];

  let output = '\n';
  const targetPools = requestedPool ? (pools[requestedPool] ? [requestedPool] : []) : poolNames;

  if (targetPools.length === 0 && requestedPool) {
    return { success: false, error: `% DHCPv6 pool ${requestedPool} not found` };
  }

  targetPools.forEach(name => {
    const p = pools[name];
    output += `DHCPv6 pool: ${name}\n`;
    output += `  Address allocation prefix: ${p.addressPrefix || 'not set'}\n`;
    output += `  Active clients: 0\n`;
  });

  return { success: true, output };
}

/**
 * Show MAC Static
 */
function cmdShowMacStatic(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nMac Address Table\n-------------------------------------------\n\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\nAll    0100.0ccc.cccc    STATIC      CPU\nAll    0100.0ccc.cccd    STATIC      CPU\n' };
}

/**
 * Show Auth
 */
function cmdShowAuth(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nNo active authentication sessions.\n' };
}

/**
 * Show Sessions
 */
function cmdShowSessions(state: any, input: string, ctx: any): any {
  return { success: true, output: '\n% No active sessions.\n' };
}

/**
 * Show NTP
 */
function cmdShowNtp(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nNTP is not enabled.\n' };
}

/**
 * Show SNMP
 */
function cmdShowSnmp(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nSNMP agent not enabled.\n' };
}

/**
 * Show Policy Map
 */
function cmdShowPolicyMap(state: any, input: string, ctx: any): any {
  return { success: true, output: '\n% No policy maps configured.\n' };
}

/**
 * Show Class Map
 */
function cmdShowClassMap(state: any, input: string, ctx: any): any {
  return { success: true, output: '\n% No class maps configured.\n' };
}

/**
 * Show MAC ACL
 */
function cmdShowMacAcl(state: any, input: string, ctx: any): any {
  return { success: true, output: '\n% No MAC access lists configured.\n' };
}

/**
 * Show Controllers
 */
function cmdShowControllers(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nInterface FastEthernet0/1\nHardware is QUICC Ethernet\n' };
}

/**
 * Show Diagnostic
 */
function cmdShowDiag(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nDiagnostic results: PASS\n' };
}

/**
 * Show LLDP
 */
function cmdShowLldp(state: any, input: string, ctx: any): any {
  return { success: true, output: '\n% LLDP is not enabled\n' };
}

/**
 * Show Banner MOTD
 */
function cmdShowBannerMotd(state: any, input: string, ctx: any): any {
  return { success: true, output: state.bannerMOTD ? `\n${state.bannerMOTD}\n` : '\n% Banner not set\n' };
}

/**
 * Show Alias
 */
function cmdShowAlias(state: any, input: string, ctx: any): any {
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
function cmdShowRedundancy(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nRedundancy mode: NON-REDUNDANT\n' };
}

/**
 * Show Archive
 */
function cmdShowArchive(state: any, input: string, ctx: any): any {
  return { success: true, output: '\nArchive configuration is not enabled.\n' };
}

/**
 * Show IP Verify Source
 */
function cmdShowIpVerifySource(state: any, input: string, ctx: any): any {
  let output = '\nInterface        Filter Type    Filter Mode    IP Address      MacAddress       Vlan\n';
  output += '---------------  -------------  -------------  --------------  ---------------  ----\n';

  let hasEntries = false;
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.ipVerifySource) {
      hasEntries = true;
      const filterType = port.ipVerifySourcePortSecurity ? 'ip+mac' : 'ip';
      const filterMode = 'active';
      output += `${portName.padEnd(15)}  ${filterType.padEnd(13)}  ${filterMode.padEnd(13)}  ${(port.ipAddress || 'N/A').padEnd(14)}  ${(port.macAddress || 'N/A').padEnd(15)}  ${port.vlan || 1}\n`;
    }
  });

  if (!hasEntries) {
    output += '% No interfaces configured with IP verify source\n';
  }

  return { success: true, output };
}

/**
 * Show Policy Map Interface
 */
function cmdShowPolicyMapInterface(state: any, input: string, ctx: any): any {
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
function cmdShowQosInterface(state: any, input: string, ctx: any): any {
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
function cmdShowQueuingInterface(state: any, input: string, ctx: any): any {
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


