import type { SwitchState, CommandResult } from '../types';
import type { CommandContext } from './commandTypes';
import { recalculateStp } from '../stp';
import { propagateLinkStateChange, type LinkStateEvent } from '../linkStateEngine';

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

/**
 * Interface state update: recalculate STP AND flush stale ARP/MAC entries for
 * the changed ports. When an interface goes down/up, learned forwarding state
 * pointing at that port must be invalidated so routing/ARP/MAC lookups do not
 * keep using a dead link.
 *
 * Since the Network Engine upgrade this delegates the protocol-level fan-out
 * (OSPF KillNbr, EIGRP InterfaceDown, BGP session drop, NAT purge, DHCP
 * LinkDown) to the central `propagateLinkStateChange` engine, then still runs
 * the STP recalculation on top.
 */
export function getInterfaceStateUpdate(
  updatedCurrentState: SwitchState,
  ctx: CommandContext,
  changedPortIds: string[]
): PvstUpdateResult {
  const sourceDeviceId = ctx.sourceDeviceId;
  if (!sourceDeviceId) {
    return { error: { success: false, error: '% Internal error: source device not available' } };
  }

  const workingDeviceStates = new Map(ctx.deviceStates);
  workingDeviceStates.set(sourceDeviceId, updatedCurrentState);

  const hadChangedPorts = changedPortIds.length > 0;
  if (hadChangedPorts) {
    const wentDown = changedPortIds.some(id => updatedCurrentState.ports[id]?.shutdown);
    const direction = wentDown ? 'down' as const : 'up' as const;

    // Central protocol fan-out for the link-state transition.
    const propagated = propagateLinkStateChange(
      workingDeviceStates,
      ctx.connections || [],
      sourceDeviceId,
      changedPortIds,
      direction
    );

    // Re-apply the current device's latest port mutation (propagation may
    // have worked on a snapshot taken before the port flags were merged).
    const current = propagated.deviceStates.get(sourceDeviceId);
    if (current) {
      propagated.deviceStates.set(sourceDeviceId, { ...current, ports: updatedCurrentState.ports });
    }

    for (const [id, st] of propagated.deviceStates) {
      workingDeviceStates.set(id, st);
    }
  } else {
    // No changed ports — still flush stale ARP/MAC/NDP entries for safety
    // (legacy behaviour for callers that pass an empty list).
    const current = workingDeviceStates.get(sourceDeviceId);
    if (current) {
      const portSet = new Set<string>();
      let next: SwitchState = current;
      if (Array.isArray(next.arpCache)) {
        const filtered = next.arpCache.filter(e => !portSet.has(e.interface));
        if (filtered.length !== next.arpCache.length) next = { ...next, arpCache: filtered };
      }
      workingDeviceStates.set(sourceDeviceId, next);
    }
  }

  // Recalculate STP across the topology with the cleaned state.
  const allUpdatedStates = recalculateStp(workingDeviceStates, ctx.connections || []);
  return { allUpdatedStates, myUpdatedState: allUpdatedStates.get(sourceDeviceId) };
}

export type { LinkStateEvent };
