import { cliModeError } from '../cliErrors';
import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port } from '../../types';
import { isInInterfaceMode, applyToSelectedPorts } from './helpers';

/**
 * Spanning-Tree BPDUGuard Disable / Encapsulation Dot1Q
 */
export function cmdEncapsulationDot1q(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^encapsulation\s+dot1[qQ]\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid encapsulation command' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = { ...(newPorts[state.currentInterface] || {} as Port), dot1qVlan: parseInt(match[1]) } as Port;
  return { success: true, output: `Encapsulation dot1Q VLAN ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * Encapsulation HDLC - Set serial encapsulation to HDLC (default)
 */
export function cmdEncapsulationHdlc(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% HDLC encapsulation is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, serialEncapsulation: 'hdlc' as const, encapsulation: 'hdlc' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Encapsulation set to HDLC', newState: { ports: newPorts } };
}

/**
 * Encapsulation PPP - Set serial encapsulation to PPP
 */
export function cmdEncapsulationPpp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP encapsulation is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, serialEncapsulation: 'ppp' as const, encapsulation: 'ppp' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Encapsulation set to PPP', newState: { ports: newPorts } };
}

/**
 * No Encapsulation - Reset serial encapsulation to default (HDLC)
 */
export function cmdNoEncapsulation(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% Encapsulation is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, serialEncapsulation: undefined, encapsulation: 'hdlc' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Encapsulation reset to default HDLC', newState: { ports: newPorts } };
}

/**
 * Clock Rate - Set DCE clock rate on serial interface
 */
export function cmdClockRate(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^clock\s+rate\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid clock rate command' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% Clock rate is only supported on serial interfaces' };
  const rate = parseInt(match[1]);
  const validRates = [1200, 2400, 4800, 9600, 19200, 38400, 56000, 64000, 72000, 125000, 148000, 256000, 500000, 512000, 2000000, 4000000, 8000000];
  if (!validRates.includes(rate)) {
    return { success: false, error: `% Invalid input detected at '^' marker.` };
  }
  const updatePort = (p: Port) => ({ ...p, clockRate: rate, dce: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Clock rate set to ${rate} bps`, newState: { ports: newPorts } };
}

/**
 * No Clock Rate - Remove clock rate from serial interface
 */
export function cmdNoClockRate(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% Clock rate is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, clockRate: undefined, dce: undefined });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Clock rate removed', newState: { ports: newPorts } };
}

/**
 * PPP Authentication PAP - Set PPP PAP authentication
 */
export function cmdPppAuthPap(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP authentication is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, pppAuth: 'pap' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'PPP PAP authentication enabled', newState: { ports: newPorts } };
}

/**
 * PPP Authentication CHAP - Set PPP CHAP authentication
 */
export function cmdPppAuthChap(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP authentication is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, pppAuth: 'chap' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'PPP CHAP authentication enabled', newState: { ports: newPorts } };
}

/** PPPoE CHAP credentials (Dialer/serial interfaces). */
export function cmdPppChapCredentials(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const port = state.ports[state.currentInterface];
  const hostname = input.match(/^ppp\s+chap\s+hostname\s+(\S+)$/i);
  const password = input.match(/^ppp\s+chap\s+password\s+(?:0\s+)?(\S+)$/i);
  if (!hostname && !password) return { success: false, error: '% Invalid PPP CHAP command' };
  return { success: true, newState: { ports: { ...state.ports, [state.currentInterface]: { ...port, pppAuth: 'chap', ...(hostname ? { pppPapUsername: hostname[1] } : { pppPapPassword: password![1] }) } } } };
}

/**
 * No PPP Authentication - Remove PPP authentication
 */
export function cmdNoPppAuth(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP authentication is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, pppAuth: undefined });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'PPP authentication removed', newState: { ports: newPorts } };
}

/**
 * PPP PAP Sent-Username - Set PPP PAP credentials
 */
export function cmdPppPapSentUsername(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^ppp\s+pap\s+sent-username\s+(\S+)\s+password\s+0\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid command. Usage: ppp pap sent-username <username> password 0 <password>' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP commands are only supported on serial interfaces' };
  const username = match[1];
  const password = match[2];
  const updatePort = (p: Port) => ({ ...p, pppPapUsername: username, pppPapPassword: password, pppAuth: 'pap' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `PPP PAP sent-username ${username} configured`, newState: { ports: newPorts } };
}
