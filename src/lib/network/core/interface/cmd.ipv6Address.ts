import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port } from '../../types';
import { calculateEui64 } from '../../eui64';
import { isInInterfaceMode, applyToSelectedPorts } from './helpers';

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

export function cmdIpv6DhcpServer(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+dhcp\s+server\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ipv6 dhcp server command' };
  const poolName = match[1];
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, ipv6DhcpServerPool: poolName }));
  return { success: true, newState: { ports: newPorts } };
}

