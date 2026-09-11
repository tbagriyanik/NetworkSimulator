import { cliModeError } from '../cliErrors';
import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port } from '../../types';
import { buildRunningConfig } from '../configBuilder';
import { canAssignIPToPhysicalPort, isLayer3Switch } from '../../switchModels';
import { validateSviStatus } from '../L3Validation';
import { calculateEui64 } from '../../eui64';
import {
  isInInterfaceMode,
  isVlanInterfaceName,
  getVlanPortKey,
  isValidIP,
  isValidSubnetMask,
  isNetworkOrBroadcastAddress,
  applyToSelectedPorts
} from './helpers';

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

/**
 * Configure IPv6 Address (supports standard prefix and eui-64)
 */
export function cmdIpv6Address(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };

  // Check EUI-64 variant
  const euiMatch = input.match(/^ipv6\s+address\s+([0-9a-fA-F:]+)(?:\/(\d+))?\s+eui-64$/i);
  if (euiMatch) {
    const prefixStr = euiMatch[1];
    const prefixLen = euiMatch[2] ? parseInt(euiMatch[2]) : 64;
    const updatePort = (port: Port) => {
      const mac = port.macAddress || '0050.56a1.b2c3';
      const fullIpv6 = calculateEui64(mac, prefixStr);
      return { ...port, ipv6Address: fullIpv6, ipv6Prefix: prefixLen };
    };
    const newPorts = applyToSelectedPorts(state, updatePort);
    return { success: true, newState: { ports: newPorts } };
  }

  const match = input.match(/^ipv6\s+address\s+([0-9a-fA-F:]+)\/(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid IPv6 address' };
  const updatePort = (port: Port) => ({ ...port, ipv6Address: match[1], ipv6Prefix: parseInt(match[2]) });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * Configure IPv6 Address Autoconfig (SLAAC)
 */
export function cmdIpv6AddressAutoconfig(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const updatePort = (port: Port) => {
    // Generate SLAAC address prefix 2001:db8:1::/64 + EUI-64 derived from MAC or port ID
    const mac = port.macAddress || state.macAddress || '0011.2233.4455';
    const slaacIp = calculateEui64(mac, '2001:db8:1::');
    return {
      ...port,
      ipv6Autoconfig: true,
      ipv6Address: slaacIp,
      ipv6Prefix: 64,
    };
  };
  const newPorts = applyToSelectedPorts(state, updatePort);
  return {
    success: true,
    output: `IPv6 SLAAC autoconfig enabled on ${state.currentInterface}`,
    newState: { ports: newPorts }
  };
}

/**
 * Configure IPv6 ND Suppress RA
 */
export function cmdIpv6NdSuppressRa(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const updatePort = (port: Port) => ({ ...port, ipv6NdSuppressRa: true });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

export function cmdNoIpv6NdSuppressRa(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const updatePort = (port: Port) => ({ ...port, ipv6NdSuppressRa: false });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * IPv6 Traffic Filter (Inbound/Outbound IPv6 ACL)
 */
export function cmdIpv6TrafficFilter(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };

  if (input.toLowerCase().startsWith('no ')) {
    const updatePort = (port: Port) => ({ ...port, ipv6TrafficFilterIn: undefined, ipv6TrafficFilterOut: undefined });
    const newPorts = applyToSelectedPorts(state, updatePort);
    return { success: true, newState: { ports: newPorts } };
  }

  const match = input.match(/^ipv6\s+traffic-filter\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Invalid ipv6 traffic-filter command' };

  const aclName = match[1];
  const direction = match[2].toLowerCase();
  const updatePort = (port: Port) => {
    if (direction === 'in') {
      return { ...port, ipv6TrafficFilterIn: aclName };
    } else {
      return { ...port, ipv6TrafficFilterOut: aclName };
    }
  };
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * IPv6 RIP Enable
 */
export function cmdIpv6Rip(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+rip\s+(\S+)\s+enable$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const processName = match[1];
  const updatePort = (port: Port) => ({
    ...port,
    ipv6Rip: { enabled: true, processName }
  });
  const newPorts = applyToSelectedPorts(state, updatePort);

  // Also add route if IP exists
  const targetPorts = Array.isArray(state.selectedInterfaces) ? state.selectedInterfaces : [state.currentInterface];
  const ipv6DynamicRoutes = [...(state.ipv6DynamicRoutes || [])];

  targetPorts.forEach((pId: string) => {
    const port = state.ports[pId];
    if (port && port.ipv6Address && port.ipv6Prefix) {
      ipv6DynamicRoutes.push({
        destination: port.ipv6Address,
        prefixLength: port.ipv6Prefix,
        nextHop: 'directly connected',
        metric: 1,
        type: 'dynamic'
      });
    }
  });

  return { success: true, newState: { ports: newPorts, ipv6DynamicRoutes } };
}

/**
 * No IPv6 RIP
 */
export function cmdNoIpv6Rip(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const updatePort = (port: Port) => ({
    ...port,
    ipv6Rip: { enabled: false }
  });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * IPv6 OSPF Area
 */
export function cmdIpv6Ospf(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+ospf\s+(\d+)\s+area\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const processId = match[1];
  const area = match[2];
  const updatePort = (port: Port) => ({
    ...port,
    ipv6Ospf: { enabled: true, processId, area }
  });
  const newPorts = applyToSelectedPorts(state, updatePort);

  // Also add route if IP exists
  const targetPorts = Array.isArray(state.selectedInterfaces) ? state.selectedInterfaces : [state.currentInterface];
  const ipv6DynamicRoutes = [...(state.ipv6DynamicRoutes || [])];

  targetPorts.forEach((pId: string) => {
    const port = state.ports[pId];
    if (port && port.ipv6Address && port.ipv6Prefix) {
      ipv6DynamicRoutes.push({
        destination: port.ipv6Address,
        prefixLength: port.ipv6Prefix,
        nextHop: 'directly connected',
        metric: 1,
        type: 'dynamic',
        area: parseInt(area)
      });
    }
  });

  return { success: true, newState: { ports: newPorts, ipv6DynamicRoutes } };
}

/**
 * No IPv6 OSPF Area
 */
export function cmdNoIpv6Ospf(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const updatePort = (port: Port) => ({
    ...port,
    ipv6Ospf: { enabled: false }
  });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

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
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, vrfName }));
  return { success: true, newState: { ports: newPorts } };
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
