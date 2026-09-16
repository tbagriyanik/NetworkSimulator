import type { CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

export interface IndexedConnection {
  neighborId: string;
  connection: CanvasConnection;
}

export interface ConnectionIndex {
  byDevice: Map<string, CanvasConnection[]>;
  byPort: Map<string, CanvasConnection>;
  adjacency: Map<string, IndexedConnection[]>;
}

const portKey = (deviceId: string, portId: string) => `${deviceId}:${portId}`;

/** Builds all hot-path connection lookups in one pass. */
export function buildConnectionIndex(connections: CanvasConnection[]): ConnectionIndex {
  const byDevice = new Map<string, CanvasConnection[]>();
  const byPort = new Map<string, CanvasConnection>();
  const adjacency = new Map<string, IndexedConnection[]>();

  const addDeviceConnection = (deviceId: string, connection: CanvasConnection) => {
    const list = byDevice.get(deviceId);
    if (list) list.push(connection);
    else byDevice.set(deviceId, [connection]);
  };
  const addAdjacent = (deviceId: string, neighborId: string, connection: CanvasConnection) => {
    const list = adjacency.get(deviceId);
    const entry = { neighborId, connection };
    if (list) list.push(entry);
    else adjacency.set(deviceId, [entry]);
  };

  for (const connection of connections) {
    addDeviceConnection(connection.sourceDeviceId, connection);
    addDeviceConnection(connection.targetDeviceId, connection);
    // A shared wireless AP radio can have multiple connections; physical
    // ports remain one-to-one and the last entry is the useful direct lookup.
    if (connection.cableType !== 'wireless') {
      byPort.set(portKey(connection.sourceDeviceId, connection.sourcePort), connection);
      byPort.set(portKey(connection.targetDeviceId, connection.targetPort), connection);
    }
    if (connection.active === false) continue;
    addAdjacent(connection.sourceDeviceId, connection.targetDeviceId, connection);
    addAdjacent(connection.targetDeviceId, connection.sourceDeviceId, connection);
  }

  return { byDevice, byPort, adjacency };
}

export const getConnectionAtPort = (index: ConnectionIndex, deviceId: string, portId: string) =>
  index.byPort.get(portKey(deviceId, portId));



