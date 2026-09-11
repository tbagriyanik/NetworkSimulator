import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';

export function cmdAaaNewModel(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  return {
    success: true,
    output: '',
    newState: { aaaNewModel: true }
  };
}

export function cmdNoAaaNewModel(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  return {
    success: true,
    output: '',
    newState: { aaaNewModel: false }
  };
}

export function cmdAaaAuthentication(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^aaa\s+authentication\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid AAA authentication command' };

  const authList = [...(state.aaaAuthentication || []), match[1]];
  return {
    success: true,
    output: '',
    newState: { aaaAuthentication: authList }
  };
}

export function cmdRadiusServerHost(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^radius-server\s+host\s+([0-9.]+)(?:\s+key\s+(\S+))?/i);
  if (!match) return { success: false, error: '% Invalid radius-server host command' };

  const host = match[1];
  const key = match[2];

  const currentServers = [...(state.radiusServers || [])];
  const updatedServers = currentServers.filter(s => s.host !== host);
  updatedServers.push({ host, key });

  return {
    success: true,
    output: `RADIUS server host ${host} configured`,
    newState: { radiusServers: updatedServers }
  };
}

export function cmdTacacsServerHost(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^tacacs-server\s+host\s+([0-9.]+)(?:\s+key\s+(\S+))?/i);
  if (!match) return { success: false, error: '% Invalid tacacs-server host command' };

  const host = match[1];
  const key = match[2];

  const currentServers = [...(state.tacacsServers || [])];
  const updatedServers = currentServers.filter(s => s.host !== host);
  updatedServers.push({ host, key });

  return {
    success: true,
    output: `TACACS+ server host ${host} configured`,
    newState: { tacacsServers: updatedServers }
  };
}

export function cmdRadiusServerKey(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^radius-server\s+key\s+(\S+)/i);
  if (!match) return { success: false, error: '% Invalid radius-server key command' };
  return {
    success: true,
    output: '',
    newState: { radiusKey: match[1] }
  };
}

export function cmdTacacsServerKey(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^tacacs-server\s+key\s+(\S+)/i);
  if (!match) return { success: false, error: '% Invalid tacacs-server key command' };
  return {
    success: true,
    output: '',
    newState: { tacacsKey: match[1] }
  };
}

export function cmdDot1xSystem(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: '% Invalid mode' };
  return { success: true, output: 'dot1x system-auth-control enabled', newState: { dot1xSystemAuthControl: true } };
}

export function cmdDot1xPort(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const m = input.match(/^dot1x\s+port-control\s+(auto|force-authorized|force-unauthorized)$/i);
  if (!m || !state.currentInterface) return { success: false, error: '% Invalid dot1x command' };
  const mode = m[1].toLowerCase() as 'auto' | 'force-authorized' | 'force-unauthorized';
  const newSession = {
    port: state.currentInterface,
    portControl: mode,
    state: mode === 'force-authorized' ? ('authorized' as const) : ('unauthorized' as const)
  };
  return {
    success: true,
    output: `802.1X port-control ${m[1]} configured`,
    newState: { dot1xSessions: { ...state.dot1xSessions, [state.currentInterface]: newSession } }
  };
}