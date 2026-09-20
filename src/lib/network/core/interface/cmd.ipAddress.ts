import { cliModeError } from '../cliErrors';
import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port } from '../../types';
import { buildRunningConfig } from '../configBuilder';
import { canAssignIPToPhysicalPort, isLayer3Switch } from '../../switchModels';
import { validateSviStatus } from '../L3Validation';
import {
  isInInterfaceMode,
  isVlanInterfaceName,
  getVlanPortKey,
  isValidIP,
  isValidSubnetMask,
  isNetworkOrBroadcastAddress,
  applyToSelectedPorts
} from './helpers';
import { mapVlanToVni, getOrCreateNveInterface } from '../../vxlanEvpn';

export function cmdIpAddress(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const match = input.match(/^ip\s+address\s+(?:(\d{1,3}(?:\.\d{1,3}){3})(?:\s+(\d{1,3}(?:\.\d{1,3}){3}))|dhcp)$/i);
  if (!match) {
    return { success: false, error: '% Invalid input: ip address <ip> <mask> or ip address dhcp' };
  }

  const isDhcp = input.toLowerCase().endsWith('dhcp');

  if (isDhcp) {
    const newPorts = applyToSelectedPorts(state, (port: Port) => ({
      ...port,
      ipConfigMode: 'dhcp',
      ipAddress: undefined,
      subnetMask: undefined,
      mode: 'routed',
      isRoutedPort: true
    }));
    return {
      success: true,
      output: `\nInterface ${state.currentInterface} configured to acquire IP via DHCP\n`,
      newState: { ports: newPorts }
    };
  }

  const [, ip, dottedMask] = match;
  const mask = dottedMask;

  if (!isValidIP(ip) || !mask || !isValidIP(mask)) {
    return { success: false, error: '% Invalid IP address format' };
  }
  if (!isValidSubnetMask(mask)) {
    return { success: false, error: '% Invalid subnet mask format' };
  }
  if (isNetworkOrBroadcastAddress(ip, mask)) {
    return { success: false, error: '% Invalid host address (network or broadcast address)' };
  }

  // VLAN interface IP assignment
  if (isVlanInterfaceName(state.currentInterface)) {
    const vlanPortKey = getVlanPortKey(state.currentInterface);
    const vlanId = parseInt(vlanPortKey.replace(/^vlan/, ''), 10);
    const newPorts = { ...state.ports };

    if (newPorts[vlanPortKey]) {
      newPorts[vlanPortKey] = {
        ...newPorts[vlanPortKey],
        ipAddress: ip,
        subnetMask: mask,
        mode: 'routed'
      };
    }

    const updatedState = { ...state, ports: newPorts };
    let output = `Interface Vlan${vlanId} configured with IP ${ip} ${mask}\n`;

    // Add status indicator
    const sviStatus = validateSviStatus(state, vlanId);
    if (sviStatus.activePorts.length > 0) {
      output += `Vlan${vlanId} will be up (Active ports: ${sviStatus.activePorts.join(', ')})\n`;
    } else {
      output += `Vlan${vlanId} status: down (no active ports assigned)\n`;
    }

    return {
      success: true,
      output,
      newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) }
    };
  }

  // Layer 2 switch check - prevent IP assignment on physical ports
  // Apply this guard only for switch devices; routers must allow physical IP addressing.
  const isSwitchDevice =
    ((state.deviceType as string) === 'switchL2' ||
      (state.deviceType as string) === 'switchL3' ||
      state.switchLayer === 'L2' ||
      state.switchLayer === 'L3' ||
      state.switchModel === 'NS-L2-24TT-L' ||
      state.switchModel === 'NS-L3-24PS') &&
    state.deviceType !== 'router'; // Routers must be excluded from this check
  if (isSwitchDevice && !canAssignIPToPhysicalPort(state.switchModel)) {
    const port = state.ports[state.currentInterface];
    if (port && (port.type === 'fastethernet' || port.type === 'gigabitethernet')) {
      return {
        success: false,
        error: `% Invalid command. Layer 2 switch (${state.switchModel}) does not support IP addressing on physical ports.\nUse VLAN interface instead: interface vlan <vlan-id>`
      };
    }
  }

  // L3 switch physical ports: require either global ip routing OR routed port mode (no switchport)
  const currentPort = state.ports?.[state.currentInterface];
  const isPhysicalInterface = !!currentPort && (currentPort.type === 'fastethernet' || currentPort.type === 'gigabitethernet');
  const isL3Sw = isLayer3Switch(state.switchModel);
  const hasIpRouting = !!state.ipRouting;
  const isRoutedPort = currentPort?.mode === 'routed' || currentPort?.isRoutedPort === true;

  if (isL3Sw && isPhysicalInterface && !hasIpRouting && !isRoutedPort) {
    return {
      success: false,
      error: `% Invalid input detected at '^' marker.`
    };
  }

  // Physical routed port IP assignment (Layer 3 switch or router)
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    ipAddress: ip,
    subnetMask: mask,
    mode: 'routed',
    isRoutedPort: true
  }));

  const updatedState = { ...state, ports: newPorts };
  const output = `\nInterface ${state.currentInterface} configured with IP ${ip} ${mask}\n`;

  return {
    success: true,
    output,
    newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) },
    hint: {
      tr: '💡 Gerçek dünyada: Bir arayüze IP verildiğinde o arayüz L3 (katman 3) çalışmaya başlar. Cihazlar arası yönlendirme için IP gereklidir.',
      en: '💡 In the real world: When an IP is assigned to an interface, it starts operating at L3 (layer 3). IPs are required for routing between devices.'
    }
  };
}

/**
 * No IP Address - Remove IP from interface
 */
export function cmdNoIpAddress(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  if (isVlanInterfaceName(state.currentInterface)) {
    const vlanPortKey = getVlanPortKey(state.currentInterface);
    const newPorts = { ...state.ports };

    if (newPorts[vlanPortKey]) {
      newPorts[vlanPortKey] = {
        ...newPorts[vlanPortKey],
        ipAddress: undefined,
        subnetMask: undefined
      };
    }

    const updatedState = { ...state, ports: newPorts };
    return {
      success: true,
      newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) }
    };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, ipAddress: undefined, subnetMask: undefined, mode: 'access' }));

  const updatedState = { ...state, ports: newPorts };
  return {
    success: true,
    newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) }
  };
}

/**
 * IP ARP Inspection Trust
 */
export function cmdIpArpInspectionTrust(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, arpInspectionTrust: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'ARP inspection trust configured', newState: { ports: newPorts } };
}

/**
 * No IP ARP Inspection Trust
 */
export function cmdNoIpArpInspectionTrust(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, arpInspectionTrust: false });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'ARP inspection trust removed', newState: { ports: newPorts } };
}

/**
 * IP Default-Gateway - Configured from interface mode
 */
export function cmdIpDefaultGateway(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
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
 * No IP Default-Gateway - Configured from interface mode
 */
export function cmdNoIpDefaultGateway(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  return {
    success: true,
    newState: { defaultGateway: undefined }
  };
}

export function cmdNoIpProxyArp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    ipProxyArp: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * IP Access-Group - Apply ACL to interface
 */
export function cmdIpAccessGroup(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^ip\s+access-group\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Invalid ip access-group command' };

  const [_, aclName, direction] = match;
  const prop = direction.toLowerCase() === 'in' ? 'accessGroupIn' : 'accessGroupOut';

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    [prop]: aclName
  }));

  return {
    success: true,
    output: `IP access-group ${aclName} ${direction} applied to ${state.currentInterface}`,
    newState: { ports: newPorts }
  };
}

/**
 * No IP Access-Group
 */
export function cmdNoIpAccessGroup(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^no\s+ip\s+access-group\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const direction = match[2];
  const prop = direction.toLowerCase() === 'in' ? 'accessGroupIn' : 'accessGroupOut';

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    [prop]: undefined
  }));

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * IP Helper-Address - Configure DHCP relay address
 */
export function cmdIpHelperAddress(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^ip\s+helper-address\s+(\d+\.\d+\.\d+\.\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid ip helper-address command. Use: ip helper-address <ip>' };
  }

  const helperIp = match[1];
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  const port = newPorts[state.currentInterface] || {} as Port;
  const helpers: string[] = [...((port as unknown as Record<string, unknown>).helperAddresses as string[] || [])];
  if (!helpers.includes(helperIp)) helpers.push(helperIp);
  newPorts[state.currentInterface] = { ...port, helperAddresses: helpers } as Port;

  return { success: true, output: `Helper address ${helperIp} added`, newState: { ports: newPorts } };
}

/**
 * No IP Helper-Address - Remove DHCP relay address
 */
export function cmdNoIpHelperAddress(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^no\s+ip\s+helper-address(?:\s+(\d+\.\d+\.\d+\.\d+|[\w.-]+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid command' };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const targetIp = match[1];
  const newPorts = { ...state.ports };
  const port = newPorts[state.currentInterface] || {} as Port;
  let helpers: string[] = port.helperAddresses ? [...port.helperAddresses] : [];

  if (targetIp) {
    helpers = helpers.filter(h => h !== targetIp);
  } else {
    helpers = [];
  }

  newPorts[state.currentInterface] = { ...port, helperAddresses: helpers } as Port;

  return { success: true, output: targetIp ? `Helper address ${targetIp} removed` : 'Helper address(es) removed', newState: { ports: newPorts } };
}

export * from './cmd.ipv6Address';


/**
 * IP OSPF Area - Enable OSPF on interface (IPv4)
 */
export function cmdIpOspfArea(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ip\s+ospf\s+(\d+)\s+area\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const processId = match[1];
  const area = match[2];
  const areaNum = parseInt(area, 10);
  const updatePort = (port: Port) => ({
    ...port,
    ospfEnabled: true,
    ospfProcessId: processId,
    ospfArea: area
  });
  const newPorts = applyToSelectedPorts(state, updatePort);
  const currentAreas = new Set(state.ospfAreas || []);
  currentAreas.add(areaNum);

  const updatedState = {
    ...state,
    routingProtocol: state.routingProtocol || 'ospf',
    ospfProcessId: state.ospfProcessId || processId,
    ospfAreas: Array.from(currentAreas),
    ports: newPorts,
  };

  return {
    success: true,
    newState: {
      ...updatedState,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

/**
 * No IP OSPF Area - Disable OSPF on interface (IPv4)
 */
export function cmdNoIpOspfArea(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^no\s+ip\s+ospf\s+(\d+)\s+area\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const updatePort = (port: Port) => ({
    ...port,
    ospfEnabled: false,
    ospfProcessId: undefined,
    ospfArea: undefined
  });
  const newPorts = applyToSelectedPorts(state, updatePort);

  return { success: true, newState: { ports: newPorts } };
}

/**
 * IP Proxy ARP
 */
export function cmdIpProxyArp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, proxyArp: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Proxy ARP enabled', newState: { ports: newPorts } };
}

/**
 * IP Verify Source
 */
export function cmdIpVerifySource(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const hasPortSecurity = input.includes('port-security');
  const updatePort = (port: Port) => ({
    ...port,
    ipVerifySource: true,
    ipVerifySourcePortSecurity: hasPortSecurity || port.ipVerifySourcePortSecurity
  });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'IP verify source configured', newState: { ports: newPorts } };
}

/**
 * IP NAT Inside
 */
export function cmdIpNatInside(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, natSide: 'inside' }));
  return { success: true, newState: { ports: newPorts } };
}

/**
 * IP NAT Outside
 */
export function cmdIpNatOutside(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, natSide: 'outside' }));
  return { success: true, newState: { ports: newPorts } };
}

/**
 * No IP NAT Inside - Remove NAT inside designation from interface
 */
export function cmdNoIpNatInside(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, natSide: undefined }));
  return { success: true, newState: { ports: newPorts } };
}

/**
 * No IP NAT Outside - Remove NAT outside designation from interface
 */
export function cmdNoIpNatOutside(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, natSide: undefined }));
  return { success: true, newState: { ports: newPorts } };
}

export function cmdIpDhcpSnoopingTrust(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, dhcpSnoopingTrust: true }));
  return { success: true, newState: { ports: newPorts } };
}

export function cmdTunnelSource(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface?.startsWith('tunnel')) return { success: false, error: cliModeError() };
  const match = input.match(/^tunnel\s+source\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid tunnel source command' };
  const port = state.ports[state.currentInterface];
  return { success: true, newState: { ports: { ...state.ports, [state.currentInterface]: { ...port, tunnel: { ...port?.tunnel, protocol: 'gre', source: match[1] } } } } };
}

export function cmdTunnelDestination(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface?.startsWith('tunnel')) return { success: false, error: cliModeError() };
  const match = input.match(/^tunnel\s+destination\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid tunnel destination command' };
  const port = state.ports[state.currentInterface];
  return { success: true, newState: { ports: { ...state.ports, [state.currentInterface]: { ...port, tunnel: { ...port?.tunnel, protocol: 'gre', destination: match[1] } } } } };
}

export function cmdTunnelMode(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface?.startsWith('tunnel')) return { success: false, error: cliModeError() };
  const match = input.match(/^tunnel\s+mode\s+(gre\s+ip|ipsec\s+ipv4|gre\s+ipv6)$/i);
  if (!match) return { success: false, error: '% Invalid tunnel mode command. Supported: gre ip, ipsec ipv4' };
  const modeStr = match[1].toLowerCase().startsWith('gre') ? 'gre' : 'ipsec';
  const port = state.ports[state.currentInterface];
  return {
    success: true,
    newState: {
      ports: {
        ...state.ports,
        [state.currentInterface]: {
          ...port,
          tunnel: { ...port?.tunnel, protocol: modeStr as 'gre' | 'ipsec' }
        }
      }
    }
  };
}

export function cmdTunnelProtection(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface?.startsWith('tunnel')) return { success: false, error: cliModeError() };
  const match = input.match(/^tunnel\s+protection\s+ipsec\s+profile\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid tunnel protection syntax. Usage: tunnel protection ipsec profile <profile-name>' };
  const profile = match[1];
  const port = state.ports[state.currentInterface];
  return {
    success: true,
    newState: {
      ports: {
        ...state.ports,
        [state.currentInterface]: {
          ...port,
          tunnelProtectionProfile: profile
        }
      }
    }
  };
}

export function cmdNoTunnelProtection(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface?.startsWith('tunnel')) return { success: false, error: cliModeError() };
  const port = state.ports[state.currentInterface];
  const newPort = { ...port };
  delete newPort.tunnelProtectionProfile;
  return {
    success: true,
    newState: {
      ports: {
        ...state.ports,
        [state.currentInterface]: newPort
      }
    }
  };
}

export function cmdNoIpDhcpSnoopingTrust(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, dhcpSnoopingTrust: false }));
  return { success: true, newState: { ports: newPorts } };
}

export function cmdIpv6DhcpServer(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^ipv6\s+dhcp\s+server\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ipv6 dhcp server command' };
  const poolName = match[1];
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, ipv6DhcpServerPool: poolName }));
  return { success: true, newState: { ports: newPorts } };
}

export function cmdMplsIpInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const isNo = /^no\s+/i.test(input);
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, mplsEnabled: !isNo }));
  return { success: true, newState: { ports: newPorts } };
}

export function cmdIpVrfForwarding(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^(?:no\s+)?ip\s+vrf\s+forwarding\s+(\S+)$/i);
  const isNo = /^no\s+/i.test(input);
  if (!match && !isNo) return { success: false, error: '% Usage: ip vrf forwarding <vrf-name>' };
  const vrfName = isNo ? undefined : match?.[1];

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    vrfForwarding: vrfName
  }));

  return {
    success: true,
    output: isNo ? `VRF forwarding removed from interface` : `VRF ${vrfName} forwarding configured on interface`,
    newState: { ports: newPorts }
  };
}

export function cmdVxlanMemberVniInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface?.startsWith('nve')) {
    return { success: false, error: '% Command only valid in NVE interface configuration mode' };
  }

  const match = input.match(/^member\s+vni\s+(\d+)(?:\s+vlan\s+(\d+))?/i);
  if (!match) return { success: false, error: '% Usage: member vni <vni> [vlan <vlan-id>]' };

  const vni = parseInt(match[1], 10);
  const vlanId = match[2] ? parseInt(match[2], 10) : 1;
  const nveName = state.currentInterface;

  mapVlanToVni(state, nveName, vlanId, vni);

  return {
    success: true,
    output: `VXLAN VNI ${vni} mapped to VLAN ${vlanId}`,
    newState: { vxlanConfig: state.vxlanConfig }
  };
}

export function cmdVxlanSourceInterfaceInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface?.startsWith('nve')) {
    return { success: false, error: '% Command only valid in NVE interface configuration mode' };
  }

  const match = input.match(/^source-interface\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: source-interface <interface>' };

  const sourceInterface = match[1];
  const nveName = state.currentInterface;

  const nve = getOrCreateNveInterface(state, nveName);
  nve.sourceInterface = sourceInterface;

  return {
    success: true,
    output: `NVE source interface set to ${sourceInterface}`,
    newState: { vxlanConfig: state.vxlanConfig }
  };
}

export function cmdVxlanIngressReplicationInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface?.startsWith('nve')) {
    return { success: false, error: '% Command only valid in NVE interface configuration mode' };
  }

  const match = input.match(/^ingress-replication\s+(protocol\s+)?bgp$/i);
  if (!match) return { success: false, error: '% Usage: ingress-replication [protocol] bgp' };

  return {
    success: true,
    output: 'NVE ingress-replication protocol set to BGP',
    newState: { vxlanConfig: state.vxlanConfig }
  };
}

export function cmdIpPolicyRouteMap(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% Command only valid in interface configuration mode' };
  }

  const match = input.match(/^ip\s+policy\s+route-map\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: ip policy route-map <map-name>' };

  const routeMapName = match[1];
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    policyRouteMap: routeMapName
  }));

  return {
    success: true,
    output: `Policy-based routing enabled using route-map ${routeMapName}`,
    newState: { ports: newPorts }
  };
}

export function cmdNoIpPolicyRouteMap(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% Command only valid in interface configuration mode' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    policyRouteMap: undefined
  }));

  return {
    success: true,
    output: 'Policy-based routing disabled on interface',
    newState: { ports: newPorts }
  };
}

export function cmdZoneMember(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^(?:no\s+)?zone-member\s+security\s+(\S+)$/i);
  const isNo = /^no\s+/i.test(input);
  if (!match && !isNo) return { success: false, error: '% Usage: zone-member security <zone-name>' };
  const zoneMember = isNo ? undefined : match?.[1];
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, zoneMember }));
  return { success: true, newState: { ports: newPorts } };
}

export function cmdMacAccessGroup(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^mac\s+access-group\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Usage: mac access-group <acl-name> {in | out}' };

  const aclName = match[1];
  const direction = match[2].toLowerCase();

  const newPorts = applyToSelectedPorts(state, (port: Port) => {
    if (direction === 'in') {
      return { ...port, macAccessGroupIn: aclName };
    } else {
      return { ...port, macAccessGroupOut: aclName };
    }
  });

  const updatedState = { ...state, ports: newPorts };
  return {
    success: true,
    output: '',
    newState: {
      ports: newPorts,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

export function cmdNoMacAccessGroup(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+mac\s+access-group(?:\s+(\S+)\s+(in|out))?$/i);

  const direction = match?.[2]?.toLowerCase();
  const newPorts = applyToSelectedPorts(state, (port: Port) => {
    if (direction === 'in') {
      return { ...port, macAccessGroupIn: undefined };
    } else if (direction === 'out') {
      return { ...port, macAccessGroupOut: undefined };
    } else {
      return { ...port, macAccessGroupIn: undefined, macAccessGroupOut: undefined };
    }
  });

  const updatedState = { ...state, ports: newPorts };
  return {
    success: true,
    output: '',
    newState: {
      ports: newPorts,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

export function cmdSourceTemplate(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^source\s+template\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: source template <template-name>' };

  const tName = match[1];
  const templates = state.templates || {};
  if (!templates[tName]) {
    return { success: false, error: `% Template ${tName} not found` };
  }

  const lines = templates[tName] || [];
  const newPorts = applyToSelectedPorts(state, (port: Port) => {
    const updated = { ...port };
    for (const rawLine of lines) {
      const line = rawLine.trim().toLowerCase();
      if (line === 'switchport mode access') {
        updated.mode = 'access';
      } else if (line === 'switchport mode trunk') {
        updated.mode = 'trunk';
      } else if (line.startsWith('switchport access vlan')) {
        const vlanMatch = line.match(/switchport\s+access\s+vlan\s+(\d+)/);
        if (vlanMatch) updated.accessVlan = parseInt(vlanMatch[1], 10);
      } else if (line === 'spanning-tree portfast') {
        updated.spanningTree = { ...updated.spanningTree, portfast: true };
      } else if (line.startsWith('speed')) {
        const spMatch = line.match(/speed\s+(\S+)/);
        if (spMatch) updated.speed = spMatch[1] as Port['speed'];
      } else if (line.startsWith('duplex')) {
        const dupMatch = line.match(/duplex\s+(\S+)/);
        if (dupMatch) updated.duplex = dupMatch[1] as Port['duplex'];
      }
    }
    return updated;
  });

  const updatedState = { ...state, ports: newPorts };
  return {
    success: true,
    output: `Template ${tName} applied to interface`,
    newState: {
      ports: newPorts,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}
