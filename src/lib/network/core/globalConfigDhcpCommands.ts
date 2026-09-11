import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import { buildRunningConfig } from './configBuilder';

/**
 * No IP DHCP Snooping - Disable DHCP snooping
 */
export function cmdNoIpDhcpSnooping(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { dhcpSnoopingEnabled: false }
  };
}

export function cmdIpDhcpSnoopingInformationOption(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }
  const isNo = input.trim().toLowerCase().startsWith('no ');
  return {
    success: true,
    newState: {
      dhcpOption82: !isNo
    }
  };
}

/**
 * IP DHCP Snooping VLAN
 */
export function cmdIpDhcpSnoopingVlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^ip\s+dhcp\s+snooping\s+vlan\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };
  const vlans = match[1].split(',').map((v: string) => v.trim());
  return {
    success: true,
    output: `DHCP snooping enabled on VLAN(s): ${vlans.join(', ')}`,
    // Router software enables snooping for the configured VLAN scope. Without this flag
    // the path resolver would never enforce the untrusted-port check.
    newState: { dhcpSnoopingEnabled: true, dhcpSnoopingVlans: vlans }
  };
}

export function cmdIpDhcpPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }
  const match = input.match(/^ip\s+dhcp\s+pool\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ip dhcp pool command' };

  const poolName = match[1];
  const pools = { ...state.dhcpPools };
  if (!pools[poolName]) {
    pools[poolName] = {};
  }

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

export function cmdNoIpDhcpPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }
  const match = input.match(/^no\s+ip\s+dhcp\s+pool\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no ip dhcp pool command' };

  const poolName = match[1];
  const pools = { ...state.dhcpPools };
  if (!pools[poolName]) {
    return { success: false, error: `% DHCP pool ${poolName} not found` };
  }
  delete pools[poolName];

  const services = { ...state.services };
  if (services.dhcp && services.dhcp.pools) {
    services.dhcp.pools = services.dhcp.pools.filter((p: { poolName: string; subnetMask?: string; startIp?: string; defaultGateway?: string; dnsServer?: string; maxUsers?: number }) => p.poolName !== poolName);
  }

  const updatedState = { ...state, dhcpPools: pools, services };
  return { success: true, newState: { dhcpPools: pools, services, runningConfig: buildRunningConfig(updatedState) } };
}

export function cmdIpv6DhcpPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }
  const match = input.match(/^ipv6\s+dhcp\s+pool\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ipv6 dhcp pool command' };

  const poolName = match[1];
  const pools = { ...state.ipv6DhcpPools };
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

export function cmdNoIpv6DhcpPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+ipv6\s+dhcp\s+pool\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no ipv6 dhcp pool command' };

  const poolName = match[1];
  const pools = { ...state.ipv6DhcpPools };
  if (!pools[poolName]) {
    return { success: false, error: `% DHCP pool ${poolName} not found` };
  }
  delete pools[poolName];

  const updatedState = { ...state, ipv6DhcpPools: pools };
  return { success: true, newState: { ipv6DhcpPools: pools, runningConfig: buildRunningConfig(updatedState) } };
}

export function cmdIpDhcpExcludedAddress(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }
  return { success: true };
}

export function cmdNoIpDhcpExcludedAddress(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }
  return { success: true };
}