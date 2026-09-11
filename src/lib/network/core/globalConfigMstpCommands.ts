import { cliModeError } from './cliErrors';
import type { SwitchState, CommandResult } from '../types';

export function parseVlanRange(rangeStr: string): number[] {
  const vlans: number[] = [];
  const parts = rangeStr.split(',');
  parts.forEach(part => {
    const rangeMatch = part.trim().match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= 4094) vlans.push(i);
      }
    } else {
      const val = parseInt(part.trim(), 10);
      if (!isNaN(val) && val >= 1 && val <= 4094) vlans.push(val);
    }
  });
  return Array.from(new Set(vlans)).sort((a, b) => a - b);
}

export function cmdMstName(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config-mst') return { success: false, error: cliModeError() };
  const match = input.match(/^name\s+(\S+)/i);
  if (!match) return { success: false, error: '% Invalid name command' };
  const regionName = match[1];
  const mstConfig = { ...state.mstConfig, name: regionName, pendingName: regionName };
  return {
    success: true,
    output: '',
    newState: { mstConfig }
  };
}

export function cmdMstRevision(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config-mst') return { success: false, error: cliModeError() };
  const match = input.match(/^revision\s+(\d+)/i);
  if (!match) return { success: false, error: '% Invalid revision command' };
  const rev = parseInt(match[1], 10);
  const mstConfig = { ...state.mstConfig, revision: rev, pendingRevision: rev };
  return {
    success: true,
    output: '',
    newState: { mstConfig }
  };
}

export function cmdMstInstance(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config-mst') return { success: false, error: cliModeError() };
  const match = input.match(/^instance\s+(\d+)\s+vlan\s+([0-9,-]+)/i);
  if (!match) return { success: false, error: '% Invalid instance command. Usage: instance <id> vlan <range>' };
  const instanceId = parseInt(match[1], 10);
  const vlanRangeStr = match[2];
  const vlans = parseVlanRange(vlanRangeStr);

  const currentInstances = { ...state.mstConfig?.instances };
  currentInstances[instanceId] = vlans;
  const mstConfig = { ...state.mstConfig, instances: currentInstances };

  return {
    success: true,
    output: `Instance ${instanceId} configured for VLANs ${vlans.join(',')}`,
    newState: { mstConfig }
  };
}

export function cmdNoMstInstance(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config-mst') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+instance\s+(\d+)/i);
  if (!match) return { success: false, error: '% Invalid no instance command' };
  const instanceId = parseInt(match[1], 10);

  const currentInstances = { ...state.mstConfig?.instances };
  delete currentInstances[instanceId];
  const mstConfig = { ...state.mstConfig, instances: currentInstances };

  return {
    success: true,
    output: `Instance ${instanceId} removed`,
    newState: { mstConfig }
  };
}

export function cmdMstShowPending(state: SwitchState): CommandResult {
  const name = state.mstConfig?.name || 'none';
  const rev = state.mstConfig?.revision ?? 0;
  const instances = state.mstConfig?.instances || {};

  let output = `Pending MST configuration:\n  Name: ${name}\n  Revision: ${rev}\n  Instances:\n`;
  Object.keys(instances).forEach(id => {
    output += `    Instance ${id}: VLANs ${instances[Number(id)].join(',')}\n`;
  });
  return { success: true, output };
}

export function cmdSpanningTreeMstPriority(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^spanning-tree\s+mst\s+(\d+)\s+priority\s+(\d+)/i);
  if (!match) return { success: false, error: '% Invalid command format. Usage: spanning-tree mst <id> priority <val>' };

  const instId = parseInt(match[1], 10);
  const pri = parseInt(match[2], 10);

  const currentPriorities = { ...state.mstConfig?.instancePriorities };
  currentPriorities[instId] = pri;
  const mstConfig = { ...state.mstConfig, instancePriorities: currentPriorities };

  return {
    success: true,
    output: `MST instance ${instId} priority set to ${pri}`,
    newState: { mstConfig }
  };
}