import { cliModeError } from './cliErrors';
import type { CommandResult, SwitchState } from '../types';
import type { CommandContext, CommandHandler } from './commandTypes';
import { buildRunningConfig } from './configBuilder';

const getTargetPortKey = (state: SwitchState): string | undefined => {
  if (!state.currentInterface) return undefined;
  const target = state.currentInterface.toLowerCase();
  return Object.keys(state.ports || {}).find(k => k.toLowerCase() === target) || state.currentInterface;
};

// Global: ip multicast-routing
export function cmdIpMulticastRouting(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const updatedState = { ...state, multicastRoutingEnabled: true };
  return {
    success: true,
    output: '',
    newState: {
      multicastRoutingEnabled: true,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

export function cmdNoIpMulticastRouting(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const updatedState = { ...state, multicastRoutingEnabled: false, mrouteEntries: [] };
  return {
    success: true,
    output: '',
    newState: {
      multicastRoutingEnabled: false,
      mrouteEntries: [],
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

// Interface: ip pim <sparse-mode|dense-mode|sparse-dense-mode>
export const cmdIpPim: CommandHandler = (state, input, _ctx) => {
  if (state.currentMode !== 'interface' && state.currentMode !== 'config-if-range') {
    return { success: false, error: cliModeError() };
  }
  const match = input.match(/^ip\s+pim\s+(sparse-mode|dense-mode|sparse-dense-mode)$/i);
  if (!match) return { success: false, error: '% Invalid PIM mode. Usage: ip pim <sparse-mode|dense-mode|sparse-dense-mode>' };

  const mode = match[1].toLowerCase() as 'sparse-mode' | 'dense-mode' | 'sparse-dense-mode';
  const portKey = getTargetPortKey(state);
  if (!portKey || !state.ports?.[portKey]) return { success: false, error: '% Interface not found' };

  const ports = { ...state.ports };
  const port = { ...ports[portKey], pimMode: mode };
  ports[portKey] = port;

  const newState = { ports };
  return {
    success: true,
    output: '',
    newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
  };
};

export const cmdNoIpPim: CommandHandler = (state, _input, _ctx) => {
  if (state.currentMode !== 'interface' && state.currentMode !== 'config-if-range') {
    return { success: false, error: cliModeError() };
  }
  const portKey = getTargetPortKey(state);
  if (!portKey || !state.ports?.[portKey]) return { success: false, error: '% Interface not found' };

  const ports = { ...state.ports };
  const port = { ...ports[portKey] };
  delete port.pimMode;
  ports[portKey] = port;

  const newState = { ports };
  return {
    success: true,
    output: '',
    newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
  };
};

// Interface: ip igmp join-group <ip> & ip igmp version <1|2|3>
export const cmdIpIgmp: CommandHandler = (state, input, _ctx) => {
  if (state.currentMode !== 'interface' && state.currentMode !== 'config-if-range') {
    return { success: false, error: cliModeError() };
  }
  const portKey = getTargetPortKey(state);
  if (!portKey || !state.ports?.[portKey]) return { success: false, error: '% Interface not found' };

  const joinMatch = input.match(/^ip\s+igmp\s+join-group\s+([0-9.]+)$/i);
  if (joinMatch) {
    const groupIp = joinMatch[1];
    const ports = { ...state.ports };
    const port = { ...ports[portKey] };
    const igmpGroups = [...(port.igmpGroups || [])];
    if (!igmpGroups.includes(groupIp)) {
      igmpGroups.push(groupIp);
    }
    port.igmpGroups = igmpGroups;
    ports[portKey] = port;

    const newState = { ports };
    return {
      success: true,
      output: '',
      newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
    };
  }

  const verMatch = input.match(/^ip\s+igmp\s+version\s+([123])$/i);
  if (verMatch) {
    const version = parseInt(verMatch[1], 10) as 1 | 2 | 3;
    const ports = { ...state.ports };
    const port = { ...ports[portKey], igmpVersion: version };
    ports[portKey] = port;

    const newState = { ports };
    return {
      success: true,
      output: '',
      newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
    };
  }

  return { success: false, error: '% Incomplete or invalid IGMP command' };
};

export const cmdNoIpIgmp: CommandHandler = (state, input, _ctx) => {
  if (state.currentMode !== 'interface' && state.currentMode !== 'config-if-range') {
    return { success: false, error: cliModeError() };
  }
  const portKey = getTargetPortKey(state);
  if (!portKey || !state.ports?.[portKey]) return { success: false, error: '% Interface not found' };

  const ports = { ...state.ports };
  const port = { ...ports[portKey] };

  const joinMatch = input.match(/^no\s+ip\s+igmp\s+join-group\s+([0-9.]+)$/i);
  if (joinMatch) {
    const groupIp = joinMatch[1];
    port.igmpGroups = (port.igmpGroups || []).filter(g => g !== groupIp);
    ports[portKey] = port;
    const newState = { ports };
    return {
      success: true,
      output: '',
      newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
    };
  }

  const verMatch = input.match(/^no\s+ip\s+igmp\s+version$/i);
  if (verMatch) {
    delete port.igmpVersion;
    ports[portKey] = port;
    const newState = { ports };
    return {
      success: true,
      output: '',
      newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
    };
  }

  return { success: false, error: '% Incomplete command' };
};

// Show Commands for Multicast

export const cmdShowIpMroute: CommandHandler = (state, _input, _ctx) => {
  if (!state.multicastRoutingEnabled) {
    return {
      success: true,
      output: 'IP Multicast Routing is not enabled'
    };
  }

  let output = 'IP Multicast Routing Table\nFlags: D - Dense, S - Sparse, C - Connected, L - Local, P - Pruned\n       R - RP-bit set, F - Register flag, T - SPT-bit set, J - Join SPT\n\n';
  const entries = state.mrouteEntries || [];
  if (entries.length === 0) {
    // Generate default/configured entries if interfaces have IGMP groups joined or PIM enabled
    const activeGroups: Array<{ group: string; incoming: string; outgoing: string[] }> = [];
    for (const [pName, p] of Object.entries(state.ports || {})) {
      if (p.igmpGroups && p.igmpGroups.length > 0) {
        for (const g of p.igmpGroups) {
          activeGroups.push({ group: g, incoming: 'Null', outgoing: [pName] });
        }
      }
    }

    if (activeGroups.length === 0) {
      output += '(*, 224.0.1.40), 00:01:15/00:02:44, RP 0.0.0.0, flags: SJPCL\n  Incoming interface: Null, RPF nbr 0.0.0.0\n  Outgoing interface list: Null\n';
    } else {
      for (const item of activeGroups) {
        output += `(*, ${item.group}), 00:02:10/00:02:50, RP 0.0.0.0, flags: S\n`;
        output += `  Incoming interface: ${item.incoming}, RPF nbr 0.0.0.0\n`;
        output += `  Outgoing interface list:\n`;
        for (const outIf of item.outgoing) {
          output += `    ${outIf}, Forward/Sparse, 00:02:10/00:02:50\n`;
        }
      }
    }
  } else {
    for (const entry of entries) {
      output += `(${entry.source}, ${entry.group}), 00:05:12/00:02:48, flags: ${entry.flags || 'S'}\n`;
      output += `  Incoming interface: ${entry.incomingInterface}, RPF nbr 0.0.0.0\n`;
      output += `  Outgoing interface list:\n`;
      for (const outIf of entry.outgoingInterfaces) {
        output += `    ${outIf}, Forward/Sparse, 00:05:12/00:02:48\n`;
      }
    }
  }

  return { success: true, output: output.trimEnd() };
};

export const cmdShowIpPimInterface: CommandHandler = (state, _input, _ctx) => {
  let output = 'Address          Interface                Mode  Neighbor Count  Query Interval\n';
  let count = 0;
  for (const [pName, p] of Object.entries(state.ports || {})) {
    if (p.pimMode) {
      count++;
      const ip = p.ipAddress || '0.0.0.0';
      const mode = p.pimMode.replace('-mode', '');
      output += `${ip.padEnd(17)}${pName.padEnd(25)}${mode.padEnd(6)}0               30\n`;
    }
  }
  if (count === 0) {
    output = 'PIM is not configured on any interface\n';
  }
  return { success: true, output: output.trimEnd() };
};

export const cmdShowIpPimNeighbor: CommandHandler = (_state, _input, _ctx) => {
  return {
    success: true,
    output: 'PIM Neighbor Table\nMode: B - Bidir Capable, DR - Designated Router, N - Default Network, S - State Refresh Capable\nNeighbor          Interface                Uptime/Expires    Ver   DR\nAddress                                                            Prio/Mode\n'
  };
};

export const cmdShowIpIgmpGroups: CommandHandler = (state, _input, _ctx) => {
  let output = 'IGMP Connected Group Membership\nGroup Address    Interface                Uptime    Expires   Last Reporter\n';
  let found = false;
  for (const [pName, p] of Object.entries(state.ports || {})) {
    if (p.igmpGroups && p.igmpGroups.length > 0) {
      for (const g of p.igmpGroups) {
        found = true;
        const reporter = p.ipAddress || '127.0.0.1';
        output += `${g.padEnd(17)}${pName.padEnd(25)}00:02:15  00:02:45  ${reporter}\n`;
      }
    }
  }
  if (!found) {
    output += '224.0.1.40       Loopback0                00:05:22  stopped   0.0.0.0\n';
  }
  return { success: true, output: output.trimEnd() };
};
