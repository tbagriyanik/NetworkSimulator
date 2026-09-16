import { cliModeError } from './cliErrors';
import type { CommandResult, SwitchState } from '../types';
import type { CommandContext } from './commandTypes';
import { buildRunningConfig } from './configBuilder';

export function cmdNoIpHost(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
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

export function cmdNoIpv6DhcpPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+ipv6\s+dhcp\s+pool\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no ipv6 dhcp pool command' };

  const poolName = match[1];
  const pools = { ...state.ipv6DhcpPools };
  if (!pools[poolName]) return { success: false, error: `% DHCP pool ${poolName} not found` };
  delete pools[poolName];

  const updatedState = { ...state, ipv6DhcpPools: pools };
  return { success: true, newState: { ipv6DhcpPools: pools, runningConfig: buildRunningConfig(updatedState) } };
}

export function cmdIpSshTimeOut(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
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

export function cmdIpDhcpSnooping(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { dhcpSnoopingEnabled: true }
  };
}

export function cmdMlsQos(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config' && state.currentMode !== 'interface') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { mlsQosEnabled: true }
  };
}

export function cmdIpDomainName(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
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

export function cmdCdpRun(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { cdpEnabled: true }
  };
}

export function cmdNoCdpRun(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { cdpEnabled: false }
  };
}

export function cmdLldpRun(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { lldpEnabled: true }
  };
}

export function cmdNoLldpRun(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { lldpEnabled: false }
  };
}

export function cmdIpHttpServer(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
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

export function cmdCdpTimer(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^cdp\s+timer\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid CDP timer value' };
  const value = Number(match[1]);
  if (value < 5 || value > 65535) return { success: false, error: '% CDP timer must be between 5 and 65535 seconds' };
  return { success: true, output: `CDP timer set to ${value} seconds`, newState: { cdpTimer: value } };
}

export function cmdCdpHoldtime(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^cdp\s+holdtime\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid CDP holdtime value' };
  const value = Number(match[1]);
  if (value < 10 || value > 65535) return { success: false, error: '% CDP holdtime must be between 10 and 65535 seconds' };
  return { success: true, output: `CDP holdtime set to ${value} seconds`, newState: { cdpHoldtime: value } };
}

export function cmdLldpTimer(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^lldp\s+timer\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid LLDP timer value' };
  const value = Number(match[1]);
  if (value < 5 || value > 65535) return { success: false, error: '% LLDP timer must be between 5 and 65535 seconds' };
  return { success: true, output: `LLDP timer set to ${value} seconds`, newState: { lldpTimer: value } };
}

export function cmdLldpHoldtime(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^lldp\s+holdtime\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid LLDP holdtime value' };
  const value = Number(match[1]);
  if (value < 10 || value > 65535) return { success: false, error: '% LLDP holdtime must be between 10 and 65535 seconds' };
  return { success: true, output: `LLDP holdtime set to ${value} seconds`, newState: { lldpHoldtime: value } };
}

export function cmdLldpReinit(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^lldp\s+reinit\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid LLDP reinit value' };
  const value = Number(match[1]);
  if (value < 2 || value > 5) return { success: false, error: '% LLDP reinit must be between 2 and 5 seconds' };
  return { success: true, output: `LLDP reinit set to ${value} seconds`, newState: { lldpReinit: value } };
}

export function cmdSnmpCommunity(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^snmp-server\s+community\s+(\S+)(?:\s+(RO|RW))?$/i);
  if (!match) return { success: false, error: '% Invalid SNMP community command' };
  return { success: true, output: `SNMP community ${match[1]} configured`, newState: { snmpCommunities: { ...state.snmpCommunities, [match[1]]: (match[2] || 'RO').toUpperCase() as 'RO' | 'RW' } } };
}

export function cmdSnmpContact(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^snmp-server\s+contact\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid SNMP contact command' };
  return { success: true, output: 'SNMP contact configured', newState: { snmpContact: match[1].trim() } };
}

export function cmdSnmpLocation(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^snmp-server\s+location\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid SNMP location command' };
  return { success: true, output: 'SNMP location configured', newState: { snmpLocation: match[1].trim() } };
}

export function cmdIpDefaultGateway(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
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

export function cmdNoIpDefaultGateway(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { defaultGateway: undefined }
  };
}

export function cmdDefaultInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^default\s+interface\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid interface name' };
  const interfaceName = match[1];
  const port = state.ports?.[interfaceName];
  if (!port) return { success: false, error: `% Interface ${interfaceName} not found` };
  const defaultPort = { ...port };
  for (const key of ['description', 'ipAddress', 'ipv6Address', 'nativeVlan', 'allowedVlans', 'qos', 'bandwidth', 'delay', 'stpPriority', 'dhcpSnoopingTrust', 'dhcpSnoopingLimitRate', 'arpInspectionTrust', 'carrierDelay', 'loadInterval', 'directedBroadcast', 'powerInline', 'channelGroup', 'encapsulation', 'clockRate', 'pppAuthentication', 'pppUsername', 'helperAddress', 'proxyArp', 'ipVerifySource']) {
    delete (defaultPort as Record<string, unknown>)[key];
  }
  return { success: true, output: `Interface ${interfaceName} reset to default configuration`, newState: { ports: { ...state.ports, [interfaceName]: defaultPort } } };
}
