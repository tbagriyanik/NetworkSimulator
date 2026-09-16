import { CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState, Port } from '@/lib/network/types';
import { buildConnectionIndex } from '@/lib/network/connectionIndex';

/**
 * DTP (Dynamic Trunking Protocol) negotiation.
 * Returns true if two switch ports would establish a trunk.
 * - Either side explicitly trunk  => trunk
 * - Both dynamic (auto/desirable) => trunk only if at least one side is desirable
 * - Otherwise                    => access
 */
export function portsFormTrunk(
  modeA: Port['mode'] | undefined,
  modeB: Port['mode'] | undefined
): boolean {
  if (modeA === 'routed' || modeB === 'routed') return false;
  if (modeA === 'trunk' || modeB === 'trunk') return true;
  const aDynamic = modeA === 'dynamic-auto' || modeA === 'dynamic-desirable';
  const bDynamic = modeB === 'dynamic-auto' || modeB === 'dynamic-desirable';
  if (aDynamic && bDynamic) return modeA === 'dynamic-desirable' || modeB === 'dynamic-desirable';
  return false;
}

/**
 * Calculate STP blocking state for a specific VLAN on a port
 * In PVST, each VLAN has its own STP instance with potentially different root bridges
 * Also updates the port's spanningTree.state to reflect the current VLAN's STP state
 */
export const getVlanSpecificSTPBlocking = (
  deviceId: string,
  portId: string,
  vlanId: number,
  connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>,
  existingConnection?: CanvasConnection,
  connectionIndex?: ReturnType<typeof buildConnectionIndex>
): boolean => {
  if (!deviceStates) return false;

  const state = deviceStates.get(deviceId);
  if (!state) return false;

  const port: Port = state.ports[portId];
  if (!port) return false;

  // If port is shutdown, it's not blocking (it's just down)
  if (port.shutdown) return false;

  // Check if the connection is active - if the link is down, STP should reconverge
  // and blocked ports should become forwarding (backup path)
  const connection = existingConnection || (connectionIndex
    ? connectionIndex.byPort.get(`${deviceId}:${portId}`)
    : connections.find(c =>
      (c.sourceDeviceId === deviceId && c.sourcePort === portId) ||
      (c.targetDeviceId === deviceId && c.targetPort === portId)
    )
  );

  // If connection is down, STP would reconverge and this port would not block
  if (connection && connection.active === false) {
    return false;
  }

  // If connection is up, use the original STP configuration
  // First try to read the per-VLAN spanning tree instance (PVST)
  const vlanStp = port.spanningTree?.instances?.[vlanId];
  if (vlanStp) {
    return vlanStp.state === 'blocking';
  }

  // Fall back to the legacy single-instance state for VLAN 1 only.
  // This keeps classic STP behavior intact while avoiding false VLAN matches in PVST.
  if (vlanId === 1 && port.spanningTree?.state) {
    return port.spanningTree.state === 'blocking';
  }

  // If no VLAN-specific instance is defined, do NOT fall back to VLAN 1.
  // Returning false allows pathfinding to continue without incorrectly blocking a VLAN path.
  return false;
};


