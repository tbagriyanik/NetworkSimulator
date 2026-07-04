import type { SwitchState, StpVlanState, Port } from './types';
import type { CanvasConnection } from '@/components/network/networkTopology.types';

/**
 * Format a Bridge ID from priority and MAC address.
 * Format: priority.mac (e.g., "32768.0000.0000.0001")
 */
export function calculateBridgeId(priority: number, mac: string): string {
  const cleanMac = mac.replace(/[:.-]/g, '').toLowerCase();
  // Ensure MAC is formatted as XXXX.XXXX.XXXX
  const formattedMac = cleanMac.match(/.{1,4}/g)?.join('.') || cleanMac;
  // Pad priority to 5 digits to ensure correct lexicographical comparison
  return `${priority.toString().padStart(5, '0')}.${formattedMac}`;
}

/**
 * Get the IEEE 802.1D standard cost based on port speed.
 */
function getPortCost(port: Port): number {
  if (port.stpCost !== undefined) return port.stpCost;

  const speed = port.speed;
  if (speed === '10000') return 2;
  if (speed === '1000') return 4;
  if (speed === '100') return 19;
  if (speed === '10') return 100;

  // Fallback to port type if speed is auto or unknown
  if (port.type === 'gigabitethernet') return 4;
  return 19;
}

/**
 * Helper to extract port number from port ID (fa0/1 -> 1, gi0/24 -> 24)
 */
function getPortNumber(portId: string): number {
  const match = portId.match(/\/(\d+)$/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Recalculate Spanning Tree Protocol for all switches in the topology.
 */
export function recalculateStp(
  deviceStates: Map<string, SwitchState>,
  connections: CanvasConnection[]
): Map<string, SwitchState> {
  const updatedStates = new Map<string, SwitchState>();
  const switchIds: string[] = [];
  const allVlanIds = new Set<number>([1]); // Always include default VLAN 1

  // First pass: identify switches and deep clone their states to avoid side effects
  deviceStates.forEach((state, id) => {
    const isSwitch = state?.deviceType === 'switch' || state?.switchLayer === 'L2' || state?.switchLayer === 'L3';

    if (isSwitch) {
      switchIds.push(id);

      // Clone state and nested objects that will be modified
      const clonedState: SwitchState = {
        ...state,
        ports: { ...state.ports },
        stpState: {} // Reset STP results for recalculation
      };

      // Clone ports and their spanningTree info
      Object.keys(clonedState.ports).forEach(portId => {
        const port = clonedState.ports[portId];
        clonedState.ports[portId] = {
          ...port,
          spanningTree: port.spanningTree ? {
            ...port.spanningTree,
            instances: port.spanningTree.instances ? { ...port.spanningTree.instances } : {}
          } : { instances: {} }
        };
      });

      if (state.vlans) {
        Object.keys(state.vlans).forEach(v => allVlanIds.add(Number(v)));
      }
      updatedStates.set(id, clonedState);
    } else {
      // For non-switches, we can keep the reference or do a shallow clone
      updatedStates.set(id, state);
    }
  });

  if (switchIds.length === 0) return updatedStates;

  // For each VLAN, run STP calculation
  allVlanIds.forEach(vlanId => {
    runStpForVlan(vlanId, switchIds, connections, updatedStates);
  });

  return updatedStates;
}

function runStpForVlan(
  vlanId: number,
  switchIds: string[],
  connections: CanvasConnection[],
  deviceStates: Map<string, SwitchState>
) {
  // 1. Root Election
  let rootBridgeId = "";
  let rootDeviceId = "";

  switchIds.forEach(id => {
    const state = deviceStates.get(id);
    if (!state) return;

    // Check if STP is enabled for this VLAN
    const vlanConfig = state.spanningTreeVlans?.[vlanId];
    if (vlanConfig?.enabled === false) return;

    const priority = vlanConfig?.priority ? parseInt(vlanConfig.priority) : (state.spanningTreePriority || 32768);
    // Real STP uses Priority + VLAN ID as the bridge priority
    const bridgeId = calculateBridgeId(priority + vlanId, state.macAddress);

    if (!rootBridgeId || bridgeId < rootBridgeId) {
      rootBridgeId = bridgeId;
      rootDeviceId = id;
    }
  });

  if (!rootDeviceId) return;

  // 2. Dijkstra to find shortest path costs to Root
  const rootCosts = new Map<string, number>();
  const rootPorts = new Map<string, string>(); // deviceId -> rootPortId
  const visited = new Set<string>();

  switchIds.forEach(id => rootCosts.set(id, Infinity));
  rootCosts.set(rootDeviceId, 0);

  while (visited.size < switchIds.length) {
    let currentId = "";
    let minCost = Infinity;

    switchIds.forEach(id => {
      if (!visited.has(id) && (rootCosts.get(id) ?? Infinity) < minCost) {
        minCost = rootCosts.get(id) ?? Infinity;
        currentId = id;
      }
    });

    if (!currentId || minCost === Infinity) break;
    visited.add(currentId);

    // Check neighbors
    const neighbors = getNeighbors(currentId, vlanId, connections, deviceStates);
    neighbors.forEach(n => {
      if (visited.has(n.deviceId)) return;

      const newCost = minCost + n.cost;
      const currentNeighborCost = rootCosts.get(n.deviceId) ?? Infinity;

      if (newCost < currentNeighborCost) {
        rootCosts.set(n.deviceId, newCost);
        rootPorts.set(n.deviceId, n.neighborPortId); // Port on neighbor pointing towards root
      } else if (newCost === currentNeighborCost) {
        // Tie-breaker: lowest sender bridge ID
        // (Simplified for now, real STP is more complex with BPDU propagation)
      }
    });
  }

  // 3. Assign Roles and States
  switchIds.forEach(deviceId => {
    const state = deviceStates.get(deviceId);
    if (!state) return;

    const isRoot = deviceId === rootDeviceId;
    const vlanPriority = state.spanningTreeVlans?.[vlanId]?.priority ? parseInt(state.spanningTreeVlans[vlanId].priority) : (state.spanningTreePriority || 32768);
    const bridgeId = calculateBridgeId(vlanPriority + vlanId, state.macAddress);

    const vlanStpState: StpVlanState = {
      vlanId,
      bridgeId,
      rootBridgeId,
      isRoot,
      rootCost: rootCosts.get(deviceId) ?? Infinity,
      ports: {}
    };

    // Determine roles for each port
    Object.keys(state.ports).forEach(portId => {
      const port = state.ports[portId];
      if (portId.startsWith('vlan') || portId.startsWith('console')) return;

      // Check if port is in VLAN
      if (!isPortVlanMember(port, vlanId)) return;

      if (port.shutdown) {
        vlanStpState.ports[portId] = { role: 'disabled', state: 'disabled', cost: getPortCost(port) };
        return;
      }

      if (isRoot) {
        // Root bridge: All ports are Designated / Forwarding
        vlanStpState.ports[portId] = { role: 'designated', state: 'forwarding', cost: getPortCost(port) };
      } else {
        // Non-root bridge
        const connection = connections.find(c =>
          (c.sourceDeviceId === deviceId && c.sourcePort === portId) ||
          (c.targetDeviceId === deviceId && c.targetPort === portId)
        );

        if (!connection || !connection.active) {
          vlanStpState.ports[portId] = { role: 'disabled', state: 'disabled', cost: getPortCost(port) };
          return;
        }

        const peerDeviceId = connection.sourceDeviceId === deviceId ? connection.targetDeviceId : connection.sourceDeviceId;
        const peerPortId = connection.sourceDeviceId === deviceId ? connection.targetPort : connection.sourcePort;
        const peerState = deviceStates.get(peerDeviceId);

        // If peer is not a switch, it's a Designated port (Edge)
        if (!peerState || (peerState.deviceType !== 'switch' && peerState.switchLayer !== 'L2' && peerState.switchLayer !== 'L3')) {
          vlanStpState.ports[portId] = { role: 'designated', state: 'forwarding', cost: getPortCost(port) };
          return;
        }

        // Determine if this port is the Root Port
        // The Dijkstra calculation already found the best path.
        // We need to find WHICH local port leads to that path.
        // Actually, Dijkstra gives us the path from Root -> Switch.
        // So we need to look at all ports and find the one that gives the lowest cost to root.

        const myRootPortId = findRootPort(deviceId, vlanId, connections, deviceStates, rootCosts);

        if (portId === myRootPortId) {
          vlanStpState.ports[portId] = { role: 'root', state: 'forwarding', cost: getPortCost(port) };
        } else {
          // It's either Designated or Alternate
          // Compare root path costs on this segment
          const myCost = rootCosts.get(deviceId) ?? Infinity;
          const peerCost = rootCosts.get(peerDeviceId) ?? Infinity;

          let isDesignated = false;
          if (myCost < peerCost) {
            isDesignated = true;
          } else if (myCost === peerCost) {
            const myBridgeId = calculateBridgeId(vlanPriority + vlanId, state.macAddress);
            const peerVlanConfig = peerState.spanningTreeVlans?.[vlanId];
            const peerPriority = peerVlanConfig?.priority ? parseInt(peerVlanConfig.priority) : (peerState.spanningTreePriority || 32768);
            const peerBridgeId = calculateBridgeId(peerPriority + vlanId, peerState.macAddress);

            if (myBridgeId < peerBridgeId) {
              isDesignated = true;
            } else if (myBridgeId === peerBridgeId) {
              // Same bridge? (Should not happen unless loopback)
              isDesignated = getPortNumber(portId) < getPortNumber(peerPortId);
            }
          }

          if (isDesignated) {
            vlanStpState.ports[portId] = { role: 'designated', state: 'forwarding', cost: getPortCost(port) };
          } else {
            vlanStpState.ports[portId] = { role: 'alternate', state: 'blocking', cost: getPortCost(port) };
          }
        }
      }
    });

    // Save calculation to state
    if (!state.stpState) state.stpState = {};
    state.stpState[vlanId] = vlanStpState;

    // Also update the port-level spanningTree for backward compatibility with UI
    if (vlanId === 1) {
      Object.keys(vlanStpState.ports).forEach(pId => {
        const pInfo = vlanStpState.ports[pId];
        const port = state.ports[pId];
        if (port) {
          if (!port.spanningTree) port.spanningTree = {};
          port.spanningTree.role = pInfo.role;
          port.spanningTree.state = pInfo.state;
          // Update status for color coding
          if (!port.shutdown) {
            port.status = pInfo.state === 'blocking' ? 'blocked' : 'connected';
          }
        }
      });
    }
  });
}

function findRootPort(
  deviceId: string,
  vlanId: number,
  connections: CanvasConnection[],
  deviceStates: Map<string, SwitchState>,
  rootCosts: Map<string, number>
): string | null {
  const state = deviceStates.get(deviceId);
  if (!state) return null;

  let bestPortId: string | null = null;
  let minPathCost = Infinity;
  let bestPeerBridgeId = "";
  let bestPeerPortId = "";

  Object.keys(state.ports).forEach(portId => {
    const port = state.ports[portId];
    if (port.shutdown || !isPortVlanMember(port, vlanId)) return;

    const conn = connections.find(c =>
      c.active && ((c.sourceDeviceId === deviceId && c.sourcePort === portId) ||
      (c.targetDeviceId === deviceId && c.targetPort === portId))
    );

    if (!conn) return;

    const peerDeviceId = conn.sourceDeviceId === deviceId ? conn.targetDeviceId : conn.sourceDeviceId;
    const peerPortId = conn.sourceDeviceId === deviceId ? conn.targetPort : conn.sourcePort;
    const peerState = deviceStates.get(peerDeviceId);

    if (!peerState || (peerState.deviceType !== 'switch' && peerState.switchLayer !== 'L2' && peerState.switchLayer !== 'L3')) return;

    const pathCost = (rootCosts.get(peerDeviceId) ?? Infinity) + getPortCost(port);
    const peerVlanConfig = peerState.spanningTreeVlans?.[vlanId];
    const peerPriority = peerVlanConfig?.priority ? parseInt(peerVlanConfig.priority) : (peerState.spanningTreePriority || 32768);
    const peerBridgeId = calculateBridgeId(peerPriority + vlanId, peerState.macAddress);

    // STP Path Selection Rules:
    // 1. Lowest root path cost
    // 2. Lowest sender bridge ID
    // 3. Lowest sender port ID
    if (pathCost < minPathCost) {
      minPathCost = pathCost;
      bestPortId = portId;
      bestPeerBridgeId = peerBridgeId;
      bestPeerPortId = peerPortId;
    } else if (pathCost === minPathCost && minPathCost !== Infinity) {
      if (peerBridgeId < bestPeerBridgeId) {
        bestPortId = portId;
        bestPeerBridgeId = peerBridgeId;
        bestPeerPortId = peerPortId;
      } else if (peerBridgeId === bestPeerBridgeId) {
        if (peerPortId < bestPeerPortId) {
          bestPortId = portId;
          bestPeerPortId = peerPortId;
        }
      }
    }
  });

  return bestPortId;
}

function getNeighbors(
  deviceId: string,
  vlanId: number,
  connections: CanvasConnection[],
  deviceStates: Map<string, SwitchState>
): Array<{ deviceId: string, neighborPortId: string, cost: number }> {
  const neighbors: Array<{ deviceId: string, neighborPortId: string, cost: number }> = [];
  const state = deviceStates.get(deviceId);
  if (!state) return neighbors;

  connections.forEach(conn => {
    if (!conn.active) return;

    if (conn.sourceDeviceId === deviceId) {
      const srcPort = state.ports[conn.sourcePort];
      const dstState = deviceStates.get(conn.targetDeviceId);
      const dstPort = dstState?.ports[conn.targetPort];

      if (srcPort && dstPort && !srcPort.shutdown && !dstPort.shutdown &&
          isPortVlanMember(srcPort, vlanId) && isPortVlanMember(dstPort, vlanId)) {
        neighbors.push({
          deviceId: conn.targetDeviceId,
          neighborPortId: conn.targetPort,
          cost: getPortCost(srcPort)
        });
      }
    } else if (conn.targetDeviceId === deviceId) {
      const dstPort = state.ports[conn.targetPort];
      const srcState = deviceStates.get(conn.sourceDeviceId);
      const srcPort = srcState?.ports[conn.sourcePort];

      if (srcPort && dstPort && !srcPort.shutdown && !dstPort.shutdown &&
          isPortVlanMember(srcPort, vlanId) && isPortVlanMember(dstPort, vlanId)) {
        neighbors.push({
          deviceId: conn.sourceDeviceId,
          neighborPortId: conn.sourcePort,
          cost: getPortCost(dstPort)
        });
      }
    }
  });

  return neighbors;
}

function isPortVlanMember(port: Port, vlanId: number): boolean {
  if (port.mode === 'trunk' || port.mode === 'dynamic-auto' || port.mode === 'dynamic-desirable' || port.mode === 'dot1q-tunnel') {
    if (!port.allowedVlans || port.allowedVlans === 'all') return true;
    if (Array.isArray(port.allowedVlans)) return port.allowedVlans.includes(vlanId);
    if (typeof port.allowedVlans === 'string') {
      // Very basic parsing for "1,2,10-20" type strings if needed
      return true; // Assume included for simplicity in first pass
    }
    return true;
  }
  return Number(port.accessVlan || port.vlan || 1) === vlanId;
}
