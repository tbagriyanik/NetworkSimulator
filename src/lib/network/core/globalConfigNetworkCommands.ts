import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import { buildRunningConfig } from './configBuilder';
import { createIpSlaOperation } from '../ipSlaEngine';

export function cmdNtpServer(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
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

export function cmdNtpMaster(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^ntp\s+master\s+(\d{1,2})$/i);
  if (!match) return { success: false, error: '% Invalid ntp master command' };
  const stratum = Number(match[1]);
  if (stratum < 1 || stratum > 15) return { success: false, error: '% Stratum must be between 1 and 15' };
  const updatedState = { ...state, ntpMasterStratum: stratum };
  return {
    success: true,
    output: `NTP master clock configured at stratum ${stratum}`,
    newState: {
      ntpMasterStratum: stratum,
      runningConfig: buildRunningConfig(updatedState)
    },
  };
}

export function cmdNoNtpServer(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+ntp\s+server(?:\s+(\S+))?$/i);
  if (!match) return { success: false, error: '% Invalid no ntp server command' };
  if (match[1]) {
    const servers = (state.ntpServers || []).filter(s => s !== match[1]);
    const updatedState = { ...state, ntpServers: servers };
    return {
      success: true,
      output: `NTP server ${match[1]} removed`,
      newState: {
        ntpServers: servers,
        runningConfig: buildRunningConfig(updatedState)
      },
    };
  }
  const updatedState = { ...state, ntpServers: [] };
  return {
    success: true,
    output: 'All NTP servers removed',
    newState: {
      ntpServers: [],
      runningConfig: buildRunningConfig(updatedState)
    },
  };
}

export function cmdClockTimezone(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^clock\s+timezone\s+(\S+)\s+([+-]?\d+)(?:\s+(\d+))?$/i);
  if (!match) return { success: false, error: '% Invalid clock timezone command. Usage: clock timezone <name> <hours-offset> [minutes-offset]' };
  const name = match[1];
  const hoursOffset = parseInt(match[2], 10);
  const minutesOffset = match[3] ? parseInt(match[3], 10) : undefined;
  const clockTimezone = { name, hoursOffset, minutesOffset };
  const updatedState = { ...state, clockTimezone };
  return {
    success: true,
    output: `Timezone set to ${name} UTC${hoursOffset >= 0 ? '+' : ''}${hoursOffset}${minutesOffset ? `:${minutesOffset}` : ''}`,
    newState: {
      clockTimezone,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

export function cmdIpNameServer(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^ip\s+name-server\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid ip name-server command' };
  return { success: true, output: `Name server ${match[1]} configured`, newState: { dnsServer: match[1] } };
}

export function cmdIpHost(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };

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

export function cmdAliasExec(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
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

  const execAliases = { ...state.execAliases };
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

export function cmdNoAliasExec(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
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

export function cmdIpNatPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^ip\s+nat\s+pool\s+(\S+)\s+([0-9.]+)\s+([0-9.]+)\s+netmask\s+([0-9.]+)$/i);
  if (!match) return { success: false, error: '% Invalid NAT pool command' };

  const [_, name, startIp, endIp, netmask] = match;
  const pools = { ...state.natPools };
  pools[name] = { startIp, endIp, netmask };

  return { success: true, newState: { natPools: pools } };
}

export function cmdIpNatInsideSourceStatic(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^ip\s+nat\s+inside\s+source\s+static\s+([0-9.]+)\s+([0-9.]+)$/i);
  if (!match) return { success: false, error: '% Invalid static NAT command' };

  const [_, localIp, globalIp] = match;
  const staticTranslations = [...(state.natStaticTranslations || [])];
  staticTranslations.push({ localIp, globalIp });

  return { success: true, newState: { natStaticTranslations: staticTranslations } };
}

export function cmdIpNatInsideSourceList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };

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
 * Logging host & trap commands (Syslog support)
 */
export function cmdLoggingHost(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^logging\s+(?:host\s+)?([0-9.]+)/i);
  if (!match) return { success: false, error: '% Invalid logging host command' };

  const hostIp = match[1];
  const updatedState = { ...state, syslogHost: hostIp };
  return {
    success: true,
    output: `Syslog server set to ${hostIp}`,
    newState: { syslogHost: hostIp, runningConfig: buildRunningConfig(updatedState) }
  };
}

export function cmdLoggingTrap(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^logging\s+trap\s+(\w+)/i);
  if (!match) return { success: false, error: '% Invalid logging trap command' };

  const level = match[1];
  const updatedState = { ...state, syslogTrapLevel: level };
  return {
    success: true,
    output: `Syslog trap level configured to ${level}`,
    newState: { syslogTrapLevel: level, runningConfig: buildRunningConfig(updatedState) }
  };
}

/**
 * IP SLA & MSTP CLI configuration handlers
 */
export function cmdIpSla(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };

  // ip sla schedule <id> life <life> start-time <now|time>
  const schedule = input.match(/^ip\s+sla\s+schedule\s+(\d+)(?:\s+life\s+(\S+))?(?:\s+start-time\s+(\S+))?/i);
  if (schedule) {
    const slaId = schedule[1];
    const life = schedule[2] || 'forever';
    const startTime = schedule[3] || 'now';

    const existingOp = state.ipSlaOperations?.[slaId] || createIpSlaOperation(slaId, '127.0.0.1');
    const updatedOp = {
      ...existingOp,
      running: true,
      startTime,
      life
    };

    return {
      success: true,
      output: `IP SLA operation ${slaId} scheduled (life=${life}, start-time=${startTime})`,
      newState: {
        ipSlaOperations: {
          ...state.ipSlaOperations,
          [slaId]: updatedOp
        }
      }
    };
  }

  const match = input.match(/^ip\s+sla\s+(\d+)/i);
  if (!match) return { success: false, error: '% Invalid IP SLA command syntax' };

  const slaId = match[1];
  const detail = input.match(/^ip\s+sla\s+(\d+)\s+(?:icmp-echo|jitter)\s+(\S+)(?:\s+frequency\s+(\d+))?(?:\s+timeout\s+(\d+))?/i);
  const operations = { ...state.ipSlaOperations };

  if (detail) {
    const target = detail[2];
    const isJitter = /jitter/i.test(input);
    const freq = detail[3] ? Number(detail[3]) : 60;
    const timeout = detail[4] ? Number(detail[4]) : 5000;
    operations[slaId] = createIpSlaOperation(slaId, target, isJitter ? 'jitter' : 'icmp-echo', freq, timeout);
  } else if (!operations[slaId]) {
    operations[slaId] = createIpSlaOperation(slaId, '127.0.0.1');
  }

  return {
    success: true,
    output: `IP SLA operation ${slaId} configured`,
    newState: { currentSlaId: slaId, ipSlaOperations: operations }
  };
}

export function cmdTrack(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };

  // no track <num>
  const noTrack = input.match(/^no\s+track\s+(\d+)/i);
  if (noTrack) {
    const tracks = { ...state.ipSlaTracks };
    delete tracks[noTrack[1]];
    return { success: true, output: `Track object ${noTrack[1]} removed`, newState: { ipSlaTracks: tracks } };
  }

  // track <num> ip sla <slaId> reachability
  const trackMatch = input.match(/^track\s+(\d+)\s+ip\s+sla\s+(\d+)(?:\s+(reachability|state))?/i);
  if (!trackMatch) return { success: false, error: '% Invalid track command syntax' };

  const trackId = trackMatch[1];
  const slaId = trackMatch[2];
  const slaOp = state.ipSlaOperations?.[slaId];
  const initialPortState = slaOp?.statistics?.successes ? 'up' : 'down';

  const tracks = {
    ...state.ipSlaTracks,
    [trackId]: {

      operationId: slaId,
      state: initialPortState as 'up' | 'down',
      lastChange: Date.now()
    }
  };

  return {
    success: true,
    output: `Track ${trackId} object configured (tracking IP SLA ${slaId})`,
    newState: { ipSlaTracks: tracks }
  };
}


export function cmdLldpTlvSelect(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^lldp\s+tlv-select\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid LLDP TLV selection' };
  const selected = match[1].trim().split(/\s+/).map(v => v.toLowerCase());
  return { success: true, output: `LLDP TLV-MED selection configured: ${selected.join(', ')}`, newState: { lldpTlvSelect: selected, lldpMed: { capabilities: true, networkPolicy: selected.includes('network-policy') || selected.includes('all'), power: selected.includes('power') || selected.includes('all'), location: selected.includes('location') || selected.includes('all') } } };
}

export function cmdSpanningTreeMst(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  return {
    success: true,
    output: '',
    newState: { currentMode: 'config-mst', spanningTreeMode: 'mst' }
  };
}

export function cmdIpPrefixList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^(?:ip|ipv6)\s+prefix-list\s+(\S+)(?:\s+seq\s+(\d+))?\s+(permit|deny)\s+(\S+)(?:\s+ge\s+(\d+))?(?:\s+le\s+(\d+))?$/i);
  const isIpv6 = /^ipv6/i.test(input);
  if (!match) return { success: false, error: `% Invalid ${isIpv6 ? 'ipv6' : 'ip'} prefix-list command syntax` };

  const name = match[1];
  const seq = match[2] ? parseInt(match[2], 10) : 5;
  const action = match[3].toLowerCase() as 'permit' | 'deny';
  const prefix = match[4];
  const ge = match[5] ? parseInt(match[5], 10) : undefined;
  const le = match[6] ? parseInt(match[6], 10) : undefined;

  const targetKey = isIpv6 ? 'ipv6PrefixLists' : 'prefixLists';
  const existingMap: Record<string, { seq: number; action: 'permit' | 'deny'; prefix: string; ge?: number; le?: number }[]> = { ...state[targetKey] };
  const entries = [...(existingMap[name] ?? [])];

  entries.push({ seq, action, prefix, ge, le });
  entries.sort((a, b) => a.seq - b.seq);
  existingMap[name] = entries;

  const newState = { [targetKey]: existingMap };
  const updatedState = { ...state, ...newState };

  return {
    success: true,
    output: '',
    newState: { ...newState, runningConfig: buildRunningConfig(updatedState) }
  };
}

export function cmdRouteMap(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^route-map\s+(\S+)(?:\s+(permit|deny))?(?:\s+(\d+))?$/i);
  if (!match) return { success: false, error: '% Invalid route-map command syntax' };

  const name = match[1];
  const action = (match[2] || 'permit').toLowerCase() as 'permit' | 'deny';
  const seq = match[3] ? parseInt(match[3], 10) : 10;

  const existingMap = { ...state.routeMaps };
  const clauses = [...(existingMap[name] || [])];
  if (!clauses.some(c => c.seq === seq)) {
    clauses.push({ seq, action, matchRules: {}, setRules: {} });
    clauses.sort((a, b) => a.seq - b.seq);
    existingMap[name] = clauses;
  }

  return {
    success: true,
    output: '',
    newState: {
      currentMode: 'config-route-map',
      currentRouteMap: `${name}:${seq}`,
      routeMaps: existingMap
    }
  };
}

export function cmdIpv6RouterEigrp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^ipv6\s+router\s+eigrp\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid ipv6 router eigrp command syntax' };

  const as = match[1];
  const eigrp6Config = { ...state.eigrp6Config, as, shutdown: false };

  return {
    success: true,
    output: '',
    newState: {
      currentMode: 'router-config',
      eigrp6Config,
      routingProtocol: 'eigrp'
    }
  };
}

export function cmdSpanningTreeLoopguardDefault(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const isNo = /^no\s+/i.test(input);
  return {
    success: true,
    output: isNo ? 'Spanning-tree loopguard default disabled' : 'Spanning-tree loopguard default enabled',
    newState: { loopguardDefault: !isNo }
  };
}

export function cmdIpFlowExport(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  if (/^no\s+ip\s+flow-export/i.test(input)) {
    return { success: true, output: 'NetFlow export disabled', newState: { netflowConfig: undefined } };
  }

  const destMatch = input.match(/^ip\s+flow-export\s+destination\s+(\S+)\s+(\d+)$/i);
  if (destMatch) {
    const netflowConfig = { ...state.netflowConfig, exportDestination: destMatch[1], exportPort: parseInt(destMatch[2], 10) };
    return { success: true, output: `NetFlow destination ${destMatch[1]}:${destMatch[2]} configured`, newState: { netflowConfig } };
  }

  const verMatch = input.match(/^ip\s+flow-export\s+version\s+(5|9)$/i);
  if (verMatch) {
    const netflowConfig = { ...state.netflowConfig, version: parseInt(verMatch[1], 10) };
    return { success: true, output: `NetFlow export version ${verMatch[1]} configured`, newState: { netflowConfig } };
  }

  return { success: false, error: '% Invalid ip flow-export command syntax' };
}

export function cmdNoIpPrefixList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+ip\s+prefix-list\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no ip prefix-list syntax' };
  const name = match[1];
  const existingMap = { ...state.prefixLists };
  delete existingMap[name];
  const updatedState = { ...state, prefixLists: existingMap };
  return { success: true, output: `Prefix-list ${name} removed`, newState: { prefixLists: existingMap, runningConfig: buildRunningConfig(updatedState) } };
}

export function cmdNoIpv6PrefixList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+ipv6\s+prefix-list\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no ipv6 prefix-list syntax' };
  const name = match[1];
  const existingMap = { ...state.ipv6PrefixLists };
  delete existingMap[name];
  const updatedState = { ...state, ipv6PrefixLists: existingMap };
  return { success: true, output: `IPv6 prefix-list ${name} removed`, newState: { ipv6PrefixLists: existingMap, runningConfig: buildRunningConfig(updatedState) } };
}

export function cmdNoRouteMap(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+route-map\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no route-map syntax' };
  const name = match[1];
  const existingMap = { ...state.routeMaps };
  delete existingMap[name];
  const updatedState = { ...state, routeMaps: existingMap };
  return { success: true, output: `Route-map ${name} removed`, newState: { routeMaps: existingMap, runningConfig: buildRunningConfig(updatedState) } };
}

export function cmdVrfDefinition(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^(?:vrf\s+definition|ip\s+vrf)\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: vrf definition <name> or ip vrf <name>' };
  const name = match[1];
  const vrfInstances = { ...state.vrfInstances };
  const key = name.toLowerCase();
  if (!vrfInstances[key]) {
    vrfInstances[key] = { name, interfaces: [] };
  }
  const updatedState = { ...state, vrfInstances };
  return {
    success: true,
    output: `VRF ${name} configured`,
    newState: { vrfInstances, runningConfig: buildRunningConfig(updatedState) },
  };
}

export function cmdVrfRd(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^rd\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: rd <asn:nn>' };
  const rd = match[1];
  return {
    success: true,
    output: `VRF Route Distinguisher set to ${rd}`,
  };
}

export function cmdVrfRouteTarget(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^route-target\s+(import|export|both)\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: route-target {import|export|both} <rt>' };
  const [_, action, rt] = match;
  return {
    success: true,
    output: `VRF Route Target ${action} ${rt} configured`,
  };
}

export function cmdMplsLdpRouterId(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^mpls\s+ldp\s+router-id\s+(\S+)(?:\s+force)?$/i);
  if (!match) return { success: false, error: '% Usage: mpls ldp router-id <interface|ip> [force]' };
  const target = match[1];
  const mplsConfig = { ...(state.mplsConfig as object), routerId: target };
  return {
    success: true,
    output: `MPLS LDP router-id set to ${target}`,
    newState: { mplsConfig },
  };
}

export function cmdVxlanInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^interface\s+(nve\d+)$/i);
  if (!match) return { success: false, error: '% Usage: interface nve<id>' };
  const nveName = match[1];
  const nveInterfaces = { ...state.nveInterfaces };
  const key = nveName.toLowerCase();
  if (!nveInterfaces[key]) {
    nveInterfaces[key] = {
      name: nveName,
      sourceInterface: 'Loopback0',
      vniMappings: {},
      status: 'up',
    };
  }
  return {
    success: true,
    output: `NVE interface ${nveName} configured`,
    newState: { nveInterfaces },
  };
}

export function cmdVxlanMemberVni(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^member\s+vni\s+(\d+)(?:\s+vlan\s+(\d+))?/i);
  if (!match) return { success: false, error: '% Usage: member vni <vni> [vlan <vlan-id>]' };
  const vni = parseInt(match[1], 10);
  const vlanId = match[2] ? parseInt(match[2], 10) : 1;
  return {
    success: true,
    output: `VXLAN VNI ${vni} mapped to VLAN ${vlanId}`,
  };
}

export function cmdZoneSecurity(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^zone\s+security\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: zone security <zone-name>' };
  const zoneName = match[1];
  const zones = Array.from(new Set([...(state.zones || []), zoneName]));
  return {
    success: true,
    output: `Security zone ${zoneName} created`,
    newState: { zones, runningConfig: buildRunningConfig({ ...state, zones }) },
  };
}

export function cmdZonePairSecurity(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^zone-pair\s+security\s+(\S+)\s+source\s+(\S+)\s+destination\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: zone-pair security <name> source <src-zone> destination <dst-zone>' };
  const [_, name, sourceZone, destinationZone] = match;
  const zonePairs = [...(state.zonePairs || [])];
  const existingIndex = zonePairs.findIndex((zp) => zp.name.toLowerCase() === name.toLowerCase());
  const newPair = { name, sourceZone, destinationZone, action: 'inspect' as const };
  if (existingIndex >= 0) {
    zonePairs[existingIndex] = newPair;
  } else {
    zonePairs.push(newPair);
  }
  return {
    success: true,
    output: `Zone-pair ${name} (${sourceZone} -> ${destinationZone}) created`,
    newState: { zonePairs, runningConfig: buildRunningConfig({ ...state, zonePairs }) },
  };
}

export function cmdRestconfEnable(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const isNo = /^no\s+/i.test(input);
  const restconfEnabled = !isNo;
  const updatedState = { ...state, restconfEnabled };
  return {
    success: true,
    output: restconfEnabled ? 'RESTCONF service enabled' : 'RESTCONF service disabled',
    newState: { restconfEnabled, runningConfig: buildRunningConfig(updatedState) },
  };
}

export function cmdMplsIpGlobal(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const isNo = /^no\s+/i.test(input);
  const mplsConfig = { ...(state.mplsConfig as object), enabled: !isNo, ldpEnabled: !isNo };
  const updatedState = { ...state, mplsConfig };
  return {
    success: true,
    output: !isNo ? 'MPLS IP globally enabled' : 'MPLS IP globally disabled',
    newState: { mplsConfig, runningConfig: buildRunningConfig(updatedState) },
  };
}

export function cmdArchive(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  return {
    success: true,
    output: 'Archive configuration mode initialized',
    newState: { archiveConfig: { path: 'flash:/archive', maximum: 14 } },
  };
}

export function cmdMacroName(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^macro\s+name\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: macro name <name>' };
  const macroName = match[1];
  const macros = { ...state.macros };
  macros[macroName] = [];
  return {
    success: true,
    output: `Macro ${macroName} defined`,
    newState: { macros },
  };
}

export function cmdMacroApply(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^macro\s+apply\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: macro apply <macro-name>' };

  const macroName = match[1];
  const macros = state.macros || {};
  if (!macros[macroName]) {
    return { success: false, error: `% Macro ${macroName} not found` };
  }

  const lines = macros[macroName];
  if (lines.length === 0) {
    return { success: true, output: `Macro ${macroName} executed (empty)` };
  }

  return {
    success: true,
    output: `Applied macro: ${macroName}\nTotal lines executed: ${lines.length}`
  };
}

export function cmdConfigureReplace(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^configure\s+replace\s+(\S+)(?:\s+force)?$/i);
  if (!match) return { success: false, error: '% Usage: configure replace <filename> [force]' };

  const targetFile = match[1].toLowerCase();

  if (targetFile.includes('startup-config') || targetFile.includes('nvram:startup-config')) {
    const newRunningConfig = state.savedConfig ? state.savedConfig.split('\n') : buildRunningConfig(state);
    return {
      success: true,
      output: `[OK] Rollback to ${match[1]} completed successfully.\nTotal number of passes: 1\nRollback Done`,
      newState: {
        runningConfig: newRunningConfig
      }
    };
  } else if (state.flashStartupConfigs && state.flashStartupConfigs[match[1]]) {
    return {
      success: true,
      output: `[OK] Rollback to ${match[1]} completed successfully.\nTotal number of passes: 1\nRollback Done`,
      newState: {
        startupConfig: state.flashStartupConfigs[match[1]],
        runningConfig: buildRunningConfig({ ...state, startupConfig: state.flashStartupConfigs[match[1]] })
      }
    };
  }

  const fallbackConfig = state.savedConfig ? state.savedConfig.split('\n') : buildRunningConfig(state);
  return {
    success: true,
    output: `[OK] Rollback to ${match[1]} completed successfully.\nTotal number of passes: 1\nRollback Done`,
    newState: {
      runningConfig: fallbackConfig
    }
  };
}

export function cmdMacAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^mac\s+access-list\s+extended\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: mac access-list extended <name>' };
  const name = match[1];
  const macAcls = { ...state.macAcls };
  if (!macAcls[name]) macAcls[name] = [];
  return {
    success: true,
    output: `MAC access-list ${name} created`,
    newState: { macAcls },
  };
}

export function cmdTemplate(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^template\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: template <name>' };
  const tName = match[1];
  const templates = { ...state.templates };
  templates[tName] = [];
  return {
    success: true,
    output: `Template ${tName} configured`,
    newState: { templates },
  };
}
