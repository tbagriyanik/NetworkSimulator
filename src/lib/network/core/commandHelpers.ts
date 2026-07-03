import type { SwitchState, CommandResult } from '../types';
import type { CommandContext } from './commandTypes';
import { recalculateStp } from '../stp';

export type PvstUpdateResult =
  | { error: CommandResult }
  | { allUpdatedStates: Map<string, SwitchState>; myUpdatedState: SwitchState | undefined };

export function getPvstUpdate(
  updatedCurrentState: SwitchState,
  ctx: CommandContext
): PvstUpdateResult {
  const sourceDeviceId = ctx.sourceDeviceId;
  if (!sourceDeviceId) {
    return { error: { success: false, error: '% Internal error: source device not available' } };
  }

  const workingDeviceStates = new Map(ctx.deviceStates);
  workingDeviceStates.set(sourceDeviceId, updatedCurrentState);

  const allUpdatedStates = recalculateStp(workingDeviceStates, ctx.connections || []);
  return { allUpdatedStates, myUpdatedState: allUpdatedStates.get(sourceDeviceId) };
}
