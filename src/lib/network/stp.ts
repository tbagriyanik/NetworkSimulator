import { Port, SwitchState } from './types';
import { CanvasConnection } from '@/components/network/networkTopology.types';

/**
 * BPDU (Bridge Protocol Data Unit) structure
 */
export interface BPDU {
  rootBridgeId: string;   // Priority + MAC
  rootPathCost: number;   // Cost to reach root
  senderBridgeId: string; // Priority + MAC
  senderPortId: string;   // Port priority + index
  vlanId: number;
}

export type PortRole = 'root' | 'designated' | 'alternate' | 'backup' | 'disabled';
export type PortState = 'forwarding' | 'blocking' | 'listening' | 'learning' | 'disabled';

/**
 * 802.1D Path Costs
 */
export const STP_PATH_COSTS: Record<string, number> = {
  '10000': 2,      // 10 Gbps
  '1000': 4,       // 1 Gbps
  '100': 19,       // 100 Mbps
  '10': 100        // 10 Mbps
};

export function getPortStpCost(port: Port): number {
  if (port.stpCost !== undefined) return port.stpCost;
  const speed = port.speed === 'auto' ? (port.type === 'gigabitethernet' ? '1000' : '100') : port.speed;
  return STP_PATH_COSTS[speed] || 19;
}

export function compareBridgeIds(id1: string, id2: string): number {
  const [prio1, mac1] = id1.split('/');
  const [prio2, mac2] = id2.split('/');
  const p1 = parseInt(prio1);
  const p2 = parseInt(prio2);
  if (p1 !== p2) return p1 - p2;
  return mac1.localeCompare(mac2);
}

function compareBpdus(b1: BPDU, b2: BPDU): number {
  const rootComp = compareBridgeIds(b1.rootBridgeId, b2.rootBridgeId);
  if (rootComp !== 0) return rootComp;
  if (b1.rootPathCost !== b2.rootPathCost) return b1.rootPathCost - b2.rootPathCost;
  const senderComp = compareBridgeIds(b1.senderBridgeId, b2.senderBridgeId);
  if (senderComp !== 0) return senderComp;
  return b1.senderPortId.localeCompare(b2.senderPortId);
}

/**
 * STP Calculation for a single VLAN
 */
export function calculateSTPVlan(
  deviceStates: Map<string, SwitchState>,
  connections: CanvasConnection[],
  vlanId: number = 1
): Map<string, Record<string, { role: string; state: string }>> {
  const bridgeBpdus = new Map<string, BPDU>();
  const rootPortIds = new Map<string, string>();

  // 1. Init
  deviceStates.forEach((state, deviceId) => {
    const bridgeId = `${state.spanningTreePriority || 32768}/${state.macAddress}`;
    bridgeBpdus.set(deviceId, {
      rootBridgeId: bridgeId,
      rootPathCost: 0,
      senderBridgeId: bridgeId,
      senderPortId: '128/0',
      vlanId
    });
  });

  // 2. Converge (BPDU propagation)
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    connections.forEach(conn => {
      if (!conn.active) return;
      const srcId = conn.sourceDeviceId;
      const tgtId = conn.targetDeviceId;
      const srcState = deviceStates.get(srcId);
      const tgtState = deviceStates.get(tgtId);
      if (!srcState || !tgtState) return;

      const srcPort = srcState.ports[conn.sourcePort];
      const tgtPort = tgtState.ports[conn.targetPort];
      if (srcPort?.shutdown || tgtPort?.shutdown) return;

      // Propagate src -> tgt
      const srcBpdu = bridgeBpdus.get(srcId)!;
      const toTgt: BPDU = {
        ...srcBpdu,
        rootPathCost: srcBpdu.rootPathCost + getPortStpCost(srcPort),
        senderBridgeId: `${srcState.spanningTreePriority || 32768}/${srcState.macAddress}`,
        senderPortId: `${srcPort.stpPriority || 128}/${conn.sourcePort}`
      };
      if (compareBpdus(toTgt, bridgeBpdus.get(tgtId)!) < 0) {
        bridgeBpdus.set(tgtId, toTgt);
        rootPortIds.set(tgtId, conn.targetPort);
        changed = true;
      }

      // Propagate tgt -> src
      const tgtBpdu = bridgeBpdus.get(tgtId)!;
      const toSrc: BPDU = {
        ...tgtBpdu,
        rootPathCost: tgtBpdu.rootPathCost + getPortStpCost(tgtPort),
        senderBridgeId: `${tgtState.spanningTreePriority || 32768}/${tgtState.macAddress}`,
        senderPortId: `${tgtPort.stpPriority || 128}/${conn.targetPort}`
      };
      if (compareBpdus(toSrc, bridgeBpdus.get(srcId)!) < 0) {
        bridgeBpdus.set(srcId, toSrc);
        rootPortIds.set(srcId, conn.sourcePort);
        changed = true;
      }
    });
  }

  // 3. Assign roles
  const results = new Map<string, Record<string, { role: string; state: string }>>();
  deviceStates.forEach((state, deviceId) => {
    const bridgeId = `${state.spanningTreePriority || 32768}/${state.macAddress}`;
    const bestBpdu = bridgeBpdus.get(deviceId)!;
    const isRoot = bestBpdu.rootBridgeId === bridgeId;
    const rootPortId = rootPortIds.get(deviceId);
    const deviceResult: Record<string, { role: string; state: string }> = {};

    Object.keys(state.ports).forEach(portId => {
      const port = state.ports[portId];
      if (port.type === 'vlan' || port.id === 'console') return;
      if (port.shutdown) {
        deviceResult[portId] = { role: 'Desg', state: 'DIS' };
        return;
      }

      if (!isRoot && portId === rootPortId) {
        deviceResult[portId] = { role: 'Root', state: 'FWD' };
        return;
      }

      const conn = connections.find(c => c.active !== false && ((c.sourceDeviceId === deviceId && c.sourcePort === portId) || (c.targetDeviceId === deviceId && c.targetPort === portId)));
      if (!conn) {
        deviceResult[portId] = { role: 'Desg', state: 'FWD' };
        return;
      }

      const neighborId = conn.sourceDeviceId === deviceId ? conn.targetDeviceId : conn.sourceDeviceId;
      const neighborState = deviceStates.get(neighborId);
      const neighborBpdu = bridgeBpdus.get(neighborId);

      if (!neighborState || !neighborBpdu) {
        deviceResult[portId] = { role: 'Desg', state: 'FWD' };
        return;
      }

      // Designated Election logic
      // In P2P, if my Bridge ID is lower than neighbor's, OR if my cost to root is lower
      if (isRoot) {
        deviceResult[portId] = { role: 'Desg', state: 'FWD' };
      } else {
        const myCost = bestBpdu.rootPathCost;
        const nCost = neighborBpdu.rootPathCost;

        if (myCost < nCost) {
          deviceResult[portId] = { role: 'Desg', state: 'FWD' };
        } else if (myCost > nCost) {
          deviceResult[portId] = { role: 'Altn', state: 'BLK' };
        } else {
          const neighborBridgeId = `${neighborState.spanningTreePriority || 32768}/${neighborState.macAddress}`;
          if (compareBridgeIds(bridgeId, neighborBridgeId) < 0) {
            deviceResult[portId] = { role: 'Desg', state: 'FWD' };
          } else {
            deviceResult[portId] = { role: 'Altn', state: 'BLK' };
          }
        }
      }
    });
    results.set(deviceId, deviceResult);
  });

  return results;
}

/**
 * Full PVST calculation
 */
export function calculatePVST(
  deviceStates: Map<string, SwitchState>,
  connections: CanvasConnection[]
): Map<string, SwitchState> {
  const nextStates = new Map(deviceStates);
  const allVlans = new Set<number>();
  deviceStates.forEach(s => {
    Object.keys(s.vlans || {}).forEach(v => allVlans.add(Number(v)));
    if (allVlans.size === 0) allVlans.add(1);
  });

  allVlans.forEach(vlanId => {
    const vlanResults = calculateSTPVlan(deviceStates, connections, vlanId);
    vlanResults.forEach((ports, deviceId) => {
      const state = nextStates.get(deviceId);
      if (!state) return;
      const updatedPorts = { ...state.ports };
      Object.keys(ports).forEach(portId => {
        const info = ports[portId];
        const port = updatedPorts[portId];
        if (!port) return;
        if (!port.spanningTree) port.spanningTree = { instances: {} };
        if (!port.spanningTree.instances) port.spanningTree.instances = {};

        const roleMap: Record<string, PortRole> = { 'Root': 'root', 'Desg': 'designated', 'Altn': 'alternate' };
        const stateMap: Record<string, PortState> = { 'FWD': 'forwarding', 'BLK': 'blocking', 'DIS': 'disabled' };

        port.spanningTree.instances[vlanId] = {
          role: roleMap[info.role] || 'designated',
          state: stateMap[info.state] || 'forwarding'
        };

        if (vlanId === 1) {
          port.spanningTree.role = port.spanningTree.instances[vlanId].role;
          port.spanningTree.state = port.spanningTree.instances[vlanId].state;
          port.status = port.shutdown ? 'disabled' : (info.state === 'BLK' ? 'blocked' : 'connected');
        }
      });
      nextStates.set(deviceId, { ...state, ports: updatedPorts });
    });
  });

  return nextStates;
}
