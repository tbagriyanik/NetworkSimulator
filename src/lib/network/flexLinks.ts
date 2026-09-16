/**
 * flexLinks.ts â€” Flex-Links Engine
 *
 * Implements Flex-Links: a pair of Layer 2 interfaces where one
 * acts as the active link and the other as a standby backup.
 * When the active link fails, the standby automatically takes over.
 *
 * command: `switchport backup interface <interface>`
 */
import type { SwitchState } from './types';
import type { CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

export type FlexLinkStatus = 'active' | 'standby' | 'failed' | 'none';

export interface FlexLinkPair {
  activePortId: string;
  backupPortId: string;
  deviceId: string;
}

export interface FlexLinkPortState {
  portId: string;
  role: 'active' | 'backup';
  status: FlexLinkStatus;
  backupOf?: string;
}

/**
 * Evaluates Flex-Link pairs for all devices and updates port active/standby state.
 * Called from the event pipeline on topology changes.
 */
export function evaluateFlexLinks(
  states: Map<string, SwitchState>,
  connections: CanvasConnection[]
): Map<string, SwitchState> {
  const updatedStates = new Map(states);

  for (const [deviceId, state] of states) {
    let stateModified = false;
    const newState = { ...state, ports: { ...state.ports } };

    for (const [portId, port] of Object.entries(state.ports)) {
      const backupPortId = port.flexLinkBackup;
      if (!backupPortId) continue;

      const backupPort = state.ports[backupPortId];
      if (!backupPort) continue;

      // Determine if primary port is physically "up" (connected and not shutdown)
      const primaryUp = isPortPhysicallyUp(deviceId, portId, state, connections);
      const backupUp = isPortPhysicallyUp(deviceId, backupPortId, state, connections);

      const previousActiveState = port.flexLinkActive;

      if (primaryUp) {
        // Primary is up â†’ primary active, backup standby
        if (port.flexLinkActive !== true || backupPort.flexLinkActive !== false) {
          newState.ports[portId] = { ...port, flexLinkActive: true };
          newState.ports[backupPortId] = { ...backupPort, flexLinkActive: false };
          stateModified = true;
        }
      } else if (!primaryUp && backupUp) {
        // Primary failed, backup takes over
        if (port.flexLinkActive !== false || backupPort.flexLinkActive !== true) {
          newState.ports[portId] = { ...port, flexLinkActive: false };
          newState.ports[backupPortId] = { ...backupPort, flexLinkActive: true };
          if (previousActiveState !== false) {
            // Log failover event
            const log = `%FLEXLINKS-5-CHANGED: Interface ${portId} changed state to standby; ${backupPortId} changed state to active`;
            newState.eventLogs = [...(newState.eventLogs || []), log];
          }
          stateModified = true;
        }
      } else {
        // Both down â€” primary remains designated active (just both down)
        if (port.flexLinkActive === undefined) {
          newState.ports[portId] = { ...port, flexLinkActive: true };
          newState.ports[backupPortId] = { ...backupPort, flexLinkActive: false };
          stateModified = true;
        }
      }
    }

    if (stateModified) {
      updatedStates.set(deviceId, newState);
    }
  }

  return updatedStates;
}

/**
 * Returns the current Flex-Link status for a port.
 */
export function getFlexLinkStatus(state: SwitchState, portId: string): FlexLinkStatus {
  const port = state.ports[portId];
  if (!port) return 'none';

  // This port is a primary (has a backup configured)
  if (port.flexLinkBackup) {
    if (port.shutdown) return 'failed';
    return port.flexLinkActive !== false ? 'active' : 'standby';
  }

  // This port might be a backup of another port
  const isPrimaryOf = Object.values(state.ports).find(
    (p) => p.flexLinkBackup === portId
  );
  if (isPrimaryOf) {
    if (port.shutdown) return 'failed';
    return port.flexLinkActive === true ? 'active' : 'standby';
  }

  return 'none';
}

/**
 * Returns a summary of all flex-link pairs on a device.
 * Used by `show interfaces <if> backup detail`.
 */
export function getFlexLinkSummary(state: SwitchState): {
  activePort: string;
  backupPort: string;
  activeStatus: FlexLinkStatus;
  backupStatus: FlexLinkStatus;
  preemptionMode: string;
  bandwidth: string;
}[] {
  const result: ReturnType<typeof getFlexLinkSummary> = [];
  const seen = new Set<string>();

  for (const [portId, port] of Object.entries(state.ports)) {
    if (!port.flexLinkBackup || seen.has(portId)) continue;
    const backupPortId = port.flexLinkBackup;
    seen.add(portId);
    seen.add(backupPortId);

    result.push({
      activePort: portId,
      backupPort: backupPortId,
      activeStatus: getFlexLinkStatus(state, portId),
      backupStatus: getFlexLinkStatus(state, backupPortId),
      preemptionMode: 'off',
      bandwidth: state.ports[portId]?.bandwidth ? `${state.ports[portId].bandwidth}Kbit` : '--',
    });
  }

  return result;
}

/** Checks if a port has a physical connection and is not shutdown */
function isPortPhysicallyUp(
  deviceId: string,
  portId: string,
  state: SwitchState,
  connections: CanvasConnection[]
): boolean {
  const port = state.ports[portId];
  if (!port || port.shutdown) return false;

  // Check if there is an active connection on this port
  const hasConnection = connections.some(
    (c) =>
      (c.sourceDeviceId === deviceId && c.sourcePort === portId) ||
      (c.targetDeviceId === deviceId && c.targetPort === portId)
  );

  return hasConnection;
}


