import { cliModeError } from '../cliErrors';
import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port, EtherChannelMode } from '../../types';
import { getPvstUpdate } from '../commandHelpers';
import {
  isInInterfaceMode,
  applyToSelectedPorts,
  mutatePortAtInterface
} from './helpers';

export function cmdSpanningTreePortfast(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return mutatePortAtInterface(state, (port) => {
    const spanningTree = port.spanningTree ?? {};
    return { ...port, spanningTree: { ...spanningTree, portfast: true } };
  });
}

/**
 * Spanning-Tree BPDU Guard
 */
export function cmdSpanningTreeBpduguard(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^spanning-tree\s+bpduguard(?:\s+(enable|disable))?$/i);
  const isDisable = match && match[1]?.toLowerCase() === 'disable';
  const enableState = !isDisable;

  const updatePort = (port: Port) => {
    const spanningTree = port.spanningTree ?? {};
    return {
      ...port,
      bpduGuard: enableState,
      spanningTree: { ...spanningTree, bpduguard: enableState }
    };
  };

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {} as Port);
  return {
    success: true,
    output: enableState ? 'BPDU guard enabled' : 'BPDU guard disabled',
    newState: { ports: newPorts }
  };
}

export function cmdNoSpanningTree(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    spanningTreeEnabled: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

export function cmdChannelGroup(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^channel-group\s+(\d+)\s+mode\s+(active|passive|on|desirable|auto)$/i);
  if (!match) {
    return { success: false, error: '% Invalid channel-group command. Use: channel-group <1-48> mode {active|passive|on|desirable|auto}' };
  }

  const group = parseInt(match[1]);
  const mode = match[2].toLowerCase() as EtherChannelMode;

  const updatePort = (port: Port) => ({ ...port, channelGroup: group, channelMode: mode });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {} as Port);
  return { success: true, output: `Channel-group ${group} mode ${mode} configured`, newState: { ports: newPorts } };
}

export function cmdNoChannelGroup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    channelGroup: undefined,
    channelProtocol: undefined
  }));

  return { success: true, newState: { ports: newPorts } };
}

export function cmdSpanningTreeBpduguardDisable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: cliModeError() };
  }

  const updatePort = (port: Port) => {
    const spanningTree = port.spanningTree ?? {};
    return { ...port, bpduGuard: false, spanningTree: { ...spanningTree, bpduguard: false } };
  };

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {} as Port);
  return { success: true, output: 'BPDU guard disabled', newState: { ports: newPorts } };
}

export function cmdSpanningTreeCost(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^spanning-tree\s+(?:vlan\s+\d+\s+)?cost\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid spanning-tree cost command. Use: spanning-tree cost <1-200000000>' };
  }

  const cost = parseInt(match[1]);
  if (cost < 1 || cost > 200000000) {
    return { success: false, error: '% Cost must be between 1 and 200000000' };
  }

  const updatePort = (port: Port) => ({ ...port, stpCost: cost });

  let newPorts;
  if (state.selectedInterfaces?.length) {
    newPorts = applyToSelectedPorts(state, updatePort);
  } else {
    if (!state.currentInterface) return { success: false, error: '% No interface selected' };
    newPorts = { ...state.ports };
    newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {} as Port);
  }

  const sourceDevId = ctx?.sourceDeviceId;
  if (sourceDevId) {
    const effectiveCtx = { ...ctx, sourceDeviceId: sourceDevId };
    const updatedCurrentState = { ...state, ports: newPorts };
    const pvst = getPvstUpdate(updatedCurrentState, effectiveCtx);
    if (!('error' in pvst)) {
      const { allUpdatedStates, myUpdatedState } = pvst;
      return {
        success: true,
        output: `STP cost set to ${cost}`,
        newState: myUpdatedState || ({ ports: newPorts } as Partial<SwitchState>),
        deviceStates: allUpdatedStates
      };
    }
  }

  return {
    success: true,
    output: `STP cost set to ${cost}`,
    newState: { ports: newPorts }
  };
}

export function cmdNoSpanningTreeCost(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: cliModeError() };
  }

  const updatePort = (port: Port) => {
    const nextPort = { ...port };
    delete nextPort.stpCost;
    return nextPort;
  };

  let newPorts;
  if (state.selectedInterfaces?.length) {
    newPorts = applyToSelectedPorts(state, updatePort);
  } else {
    if (!state.currentInterface) return { success: false, error: '% No interface selected' };
    newPorts = { ...state.ports };
    newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {} as Port);
  }

  const sourceDevId = ctx?.sourceDeviceId;
  if (sourceDevId) {
    const effectiveCtx = { ...ctx, sourceDeviceId: sourceDevId };
    const updatedCurrentState = { ...state, ports: newPorts };
    const pvst = getPvstUpdate(updatedCurrentState, effectiveCtx);
    if (!('error' in pvst)) {
      const { allUpdatedStates, myUpdatedState } = pvst;
      return {
        success: true,
        output: 'STP cost reset to default',
        newState: myUpdatedState || ({ ports: newPorts } as Partial<SwitchState>),
        deviceStates: allUpdatedStates
      };
    }
  }

  return {
    success: true,
    output: 'STP cost reset to default',
    newState: { ports: newPorts }
  };
}

export function cmdSpanningTreePriority(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^spanning-tree\s+priority\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid spanning-tree priority command. Use: spanning-tree priority <0-240>' };
  }

  const priority = parseInt(match[1]);
  if (priority < 0 || priority > 240 || priority % 16 !== 0) {
    return {
      success: false,
      error: '% Port priority must be in increments of 16 between 0 and 240 (allowed values: 0, 16, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240). Lower 4 bits are reserved for Port ID indexing.'
    };
  }

  const updatePort = (port: Port) => ({ ...port, stpPriority: priority });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {} as Port);
  return { success: true, output: `STP port priority set to ${priority}`, newState: { ports: newPorts } };
}
