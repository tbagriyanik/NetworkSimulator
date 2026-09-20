import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult, CommandMode } from '../types';
import { buildRunningConfig } from './configBuilder';
import { getOrCreateLispConfig, addLispMapping } from '../lispEngine';
import { getOrCreateCoppConfig } from '../coppEngine';
import { getOrCreateNveInterface, getOrCreateVxlanConfig } from '../vxlanEvpn';

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

export function cmdMplsLdpGracefulRestart(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const isNo = /^no\s+/i.test(input);
  const mplsConfig = { ...(state.mplsConfig as object), gracefulRestartEnabled: !isNo };
  return {
    success: true,
    output: !isNo ? 'MPLS LDP graceful restart enabled' : 'MPLS LDP graceful restart disabled',
    newState: { mplsConfig },
  };
}

export function cmdMplsLdpSessionProtection(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const isNo = /^no\s+/i.test(input);
  const mplsConfig = { ...(state.mplsConfig as object), sessionProtectionEnabled: !isNo };
  return {
    success: true,
    output: !isNo ? 'MPLS LDP session protection enabled' : 'MPLS LDP session protection disabled',
    newState: { mplsConfig },
  };
}

export function cmdVxlanInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^interface\s+(nve\d+)$/i);
  if (!match) return { success: false, error: '% Usage: interface nve<id>' };
  const nveName = match[1];

  const vxlan = getOrCreateVxlanConfig(state);
  vxlan.enabled = true;
  getOrCreateNveInterface(state, nveName);

  return {
    success: true,
    output: `NVE interface ${nveName} configured`,
    newState: {
      currentMode: 'config-if' as CommandMode,
      currentInterface: nveName,
      vxlanConfig: vxlan
    },
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
  return {
    success: true,
    output: `Template ${tName} configured`,
    newState: { templates },
  };
}

export function cmdLispRouter(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const isNo = /^no\s+/i.test(input);
  const lispConfig = getOrCreateLispConfig(state);
  lispConfig.enabled = !isNo;
  return {
    success: true,
    output: !isNo ? 'LISP routing enabled' : 'LISP routing disabled',
    newState: { lispConfig }
  };
}

export function cmdLispEidTable(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^database-mapping\s+(\S+)\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Usage: database-mapping <eid-prefix> <rloc-ip>' };
  addLispMapping(state, { eidPrefix: match[1], rlocIp: match[2] });
  return {
    success: true,
    output: `LISP EID mapping added: ${match[1]} -> ${match[2]}`,
    newState: { lispConfig: state.lispConfig }
  };
}

export function cmdControlPlane(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const coppConfig = getOrCreateCoppConfig(state);
  coppConfig.enabled = true;
  return {
    success: true,
    output: 'Control-plane configuration mode enabled',
    newState: { coppConfig }
  };
}

