import { cliModeError } from './cliErrors';
import type { CommandResult, SwitchState } from '../types';
import type { CommandContext, CommandHandler } from './commandTypes';
import { buildRunningConfig } from './configBuilder';

// Global: ip inspect name <name> <protocol> [alert|timeout]
export function cmdIpInspectName(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^ip\s+inspect\s+name\s+(\S+)\s+(\S+)(?:\s+(alert\s+on|alert\s+off|timeout\s+\d+))?/i);
  if (!match) return { success: false, error: '% Invalid ip inspect name syntax. Usage: ip inspect name <name> <protocol>' };

  const name = match[1];
  const protocol = match[2].toLowerCase();
  const alert = /alert\s+on/i.test(input);

  const inspectRules = { ...state.inspectRules };
  const ruleList = [...(inspectRules[name] || [])];
  ruleList.push({ protocol, alert });
  inspectRules[name] = ruleList;

  const updatedState = { ...state, inspectRules };
  return {
    success: true,
    output: `CBAC inspection rule ${name} for ${protocol} configured`,
    newState: {
      inspectRules,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

export function cmdNoIpInspect(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+ip\s+inspect\s+name\s+(\S+)(?:\s+(\S+))?/i);
  if (!match) return { success: false, error: '% Invalid no ip inspect syntax' };

  const name = match[1];
  const protocol = match[2]?.toLowerCase();
  const inspectRules = { ...state.inspectRules };

  if (protocol && inspectRules[name]) {
    inspectRules[name] = inspectRules[name].filter(r => r.protocol !== protocol);
    if (inspectRules[name].length === 0) delete inspectRules[name];
  } else {
    delete inspectRules[name];
  }

  const updatedState = { ...state, inspectRules };
  return {
    success: true,
    output: `CBAC inspection rule ${name} removed`,
    newState: {
      inspectRules,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

// Interface: ip inspect <name> <in|out>
export const cmdIpInspectInterface: CommandHandler = (state, input, _ctx) => {
  if (state.currentMode !== 'interface' && state.currentMode !== 'config-if-range') {
    return { success: false, error: cliModeError() };
  }
  const match = input.match(/^ip\s+inspect\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Invalid ip inspect syntax. Usage: ip inspect <name> <in|out>' };

  const ruleName = match[1];
  const direction = match[2].toLowerCase() as 'in' | 'out';
  if (!state.currentInterface || !state.ports?.[state.currentInterface]) {
    return { success: false, error: '% Interface not found' };
  }

  const port = state.ports[state.currentInterface];
  const inspectRules = { ...port.inspectRules, [direction]: ruleName };
  const ports = {
    ...state.ports,
    [state.currentInterface]: { ...port, inspectRules }
  };

  const newState = { ports };
  return {
    success: true,
    output: '',
    newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
  };
};

export const cmdNoIpInspectInterface: CommandHandler = (state, input, _ctx) => {
  if (state.currentMode !== 'interface' && state.currentMode !== 'config-if-range') {
    return { success: false, error: cliModeError() };
  }
  const match = input.match(/^no\s+ip\s+inspect\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Invalid no ip inspect syntax' };

  const direction = match[2].toLowerCase() as 'in' | 'out';
  if (!state.currentInterface || !state.ports?.[state.currentInterface]) {
    return { success: false, error: '% Interface not found' };
  }

  const port = state.ports[state.currentInterface];
  const inspectRules = { ...port.inspectRules };
  delete inspectRules[direction];
  const ports = {
    ...state.ports,
    [state.currentInterface]: { ...port, inspectRules }
  };

  const newState = { ports };
  return {
    success: true,
    output: '',
    newState: { ...newState, runningConfig: buildRunningConfig({ ...state, ...newState }) }
  };
};

// Show: show ip inspect config | show ip inspect interfaces
export const cmdShowIpInspect: CommandHandler = (state, input, _ctx) => {
  if (/interfaces/i.test(input)) {
    let output = 'Interface Configuration\n';
    let count = 0;
    for (const [pName, p] of Object.entries(state.ports || {})) {
      if (p.inspectRules?.in || p.inspectRules?.out) {
        count++;
        output += ` Interface ${pName}\n`;
        if (p.inspectRules.in) output += `  Inbound inspection rule is ${p.inspectRules.in}\n`;
        if (p.inspectRules.out) output += `  Outbound inspection rule is ${p.inspectRules.out}\n`;
      }
    }
    if (count === 0) output += ' No interfaces configured for inspection\n';
    return { success: true, output: output.trimEnd() };
  }

  let output = 'Session audit trail is disabled\nOne-minute test interval is disabled\n\n';
  const rules = state.inspectRules || {};
  if (Object.keys(rules).length === 0) {
    output += 'No inspection rules configured\n';
  } else {
    for (const [name, list] of Object.entries(rules)) {
      output += `Inspection rule configuration\n  Inspection name ${name}\n`;
      for (const item of list) {
        output += `    ${item.protocol} alert: ${item.alert ? 'enabled' : 'disabled'} timeout: 30\n`;
      }
    }
  }
  return { success: true, output: output.trimEnd() };
};
