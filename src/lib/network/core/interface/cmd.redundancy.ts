import { cliModeError } from '../cliErrors';
import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port } from '../../types';
import { isInInterfaceMode, applyToSelectedPorts } from './helpers';

/**
 * standby <group> ip <virtual-ip>
 */
export function cmdStandbyIp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^standby\s+(\d+)\s+ip\s+([0-9.]+)$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);
  const virtualIp = match[2];

  const updatePort = (port: Port) => {
    const hsrp = port.hsrp || { groups: {} };
    const groups = hsrp.groups || {};
    groups[group] = { ...groups[group], virtualIp, state: 'Active' };
    return { ...port, hsrp: { ...hsrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * standby <group> priority <priority>
 */
export function cmdStandbyPriority(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^standby\s+(\d+)\s+priority\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);
  const priority = parseInt(match[2]);

  const updatePort = (port: Port) => {
    const hsrp = port.hsrp || { groups: {} };
    const groups = hsrp.groups || {};
    groups[group] = { ...groups[group], priority };
    return { ...port, hsrp: { ...hsrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * standby <group> ipv6 <virtual-ipv6>
 */
export function cmdStandbyIpv6(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^standby\s+(\d+)\s+ipv6\s+([0-9a-fA-F:]+)$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);
  const ipv6VirtualIp = match[2];

  const updatePort = (port: Port) => {
    const hsrp = port.hsrp || { groups: {} };
    const groups = hsrp.groups || {};
    (groups[group] as Record<string, unknown>).ipv6VirtualIp = ipv6VirtualIp;
    (groups[group] as Record<string, unknown>).state = 'Active';
    return { ...port, hsrp: { ...hsrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

export function cmdStandbyPreempt(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^standby\s+(\d+)\s+preempt$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);

  const updatePort = (port: Port) => {
    const hsrp = port.hsrp || { groups: {} };
    const groups = hsrp.groups || {};
    groups[group] = { ...groups[group], preempt: true };
    return { ...port, hsrp: { ...hsrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * vrrp <group> ip <virtual-ip>
 */
export function cmdVrrpIp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^vrrp\s+(\d+)\s+ip\s+([0-9.]+)$/i);
  if (!match) return { success: false, error: '% Invalid vrrp command' };

  const group = parseInt(match[1]);
  const virtualIp = match[2];

  const updatePort = (port: Port) => {
    const vrrp = port.vrrp || { groups: {} };
    const groups = vrrp.groups || {};
    groups[group] = { priority: 100, preempt: true, ...groups[group], virtualIp, state: 'Master' };
    return { ...port, vrrp: { ...vrrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * vrrp <group> priority <priority>
 */
export function cmdVrrpPriority(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^vrrp\s+(\d+)\s+priority\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid vrrp command' };

  const group = parseInt(match[1]);
  const priority = parseInt(match[2]);

  const updatePort = (port: Port) => {
    const vrrp = port.vrrp || { groups: {} };
    const groups = vrrp.groups || {};
    groups[group] = { preempt: true, ...groups[group], priority };
    return { ...port, vrrp: { ...vrrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * vrrp <group> preempt
 */
export function cmdVrrpPreempt(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^vrrp\s+(\d+)\s+preempt$/i);
  if (!match) return { success: false, error: '% Invalid vrrp command' };

  const group = parseInt(match[1]);

  const updatePort = (port: Port) => {
    const vrrp = port.vrrp || { groups: {} };
    const groups = vrrp.groups || {};
    groups[group] = { priority: 100, ...groups[group], preempt: true };
    return { ...port, vrrp: { ...vrrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * no vrrp <group> [ip|priority|preempt]
 */
export function cmdNoVrrp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  return noVrrpImpl(state, input);
}

/**
 * no vrrp <group> preempt
 */
export function cmdNoVrrpPreempt(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  return noVrrpImpl(state, input);
}

function noVrrpImpl(state: SwitchState, input: string): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+vrrp\s+(\d+)(?:\s+(ip|priority|preempt))?$/i);
  if (!match) return { success: false, error: '% Invalid vrrp command' };

  const group = parseInt(match[1], 10);
  const sub = match[2] ? match[2].toLowerCase() : undefined;

  const updatePort = (port: Port) => {
    const vrrp = port.vrrp || { groups: {} };
    const groups = { ...vrrp.groups };
    const existing = groups[group];

    if (!sub) {
      delete groups[group];
    } else if (existing) {
      if (sub === 'ip') {
        const { virtualIp: _removed, ...rest } = existing;
        groups[group] = { ...rest, state: 'Backup' };
      } else if (sub === 'priority') {
        groups[group] = { ...existing, priority: 100, basePriority: 100 };
      } else if (sub === 'preempt') {
        groups[group] = { ...existing, preempt: false };
      }
    }
    return { ...port, vrrp: { ...vrrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}
