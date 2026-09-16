import { CanvasDevice, CanvasPort } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState, Port } from '@/lib/network/types';
import { IndexedConnection } from '@/lib/network/connectionIndex';
import { portsFormTrunk } from '../vlanAndSwitching';

export type VlanHelperDeps = {
  adjacency: Map<string, IndexedConnection[]>;
  deviceMap: Map<string, CanvasDevice>;
  deviceStates?: Map<string, SwitchState>;
};

export const isSwitchDeviceType = (type: string): boolean => type === 'switchL2' || type === 'switchL3' || type === 'hub';

export const getPortVlan = (port: Port | CanvasPort | undefined): number => {
  return Number(port?.accessVlan || port?.vlan || 1);
};

export const isPortMemberOfVlan = (port: Port | CanvasPort | undefined, vlanId: number, deviceType?: string): boolean => {
  if (!port) return false;
  if (deviceType === 'hub') return true;
  const mode = (port as Port).mode;

  if (mode === 'trunk' || mode === 'dynamic-auto' || mode === 'dynamic-desirable' || mode === 'dot1q-tunnel') {
    const allowed = (port as Port).allowedVlans ?? (port as Port).trunkAllowedVlans;
    if (!allowed || allowed === 'all') return true;
    if (Array.isArray(allowed)) return allowed.map(Number).includes(vlanId);
    if (typeof allowed === 'string') {
      if (allowed.trim().toLowerCase() === 'all') return true;
      return allowed.split(',').some(part => {
        const trimmed = part.trim();
        if (!trimmed) return false;
        const [startRaw, endRaw] = trimmed.split('-');
        const start = Number(startRaw);
        const end = endRaw ? Number(endRaw) : start;
        return Number.isFinite(start) && Number.isFinite(end) && vlanId >= start && vlanId <= end;
      });
    }
    return true;
  }
  return getPortVlan(port) === vlanId;
};

export const getDeviceVlan = (device: CanvasDevice, state: SwitchState | undefined, deps: VlanHelperDeps): number | null => {
  const { adjacency, deviceStates } = deps;
  if (device.type === 'pc' || device.type === 'iot' || device.type === 'mobile' || device.type === 'printer') {

    // BOLT: Use pre-calculated adjList for O(1) connection lookup
    const neighbors = adjacency.get(device.id);
    const connectedConn = neighbors?.[0]?.connection;

    if (connectedConn && deviceStates) {
      const peerDeviceId = connectedConn.sourceDeviceId === device.id ? connectedConn.targetDeviceId : connectedConn.sourceDeviceId;
      const peerPortId = connectedConn.sourceDeviceId === device.id ? connectedConn.targetPort : connectedConn.sourcePort;
      const peerState = deviceStates.get(peerDeviceId);
      const peerPort = peerState?.ports?.[peerPortId];
      if (peerPort) {
        if (portsFormTrunk(undefined, peerPort.mode)) return 1;
        return getPortVlan(peerPort);
      }
    }
    return Number(device.vlan || 1);
  }
  if (!state) return 1;

  // Prefer any SVI / management VLAN tied to the device's IP
  const ip = device.ip || state.ports['vlan1']?.ipAddress || '';
  for (const [portId, port] of Object.entries(state.ports)) {
    if (portId.startsWith('vlan') && port.ipAddress === ip) {
      const vlanMatch = portId.match(/vlan(\d+)/);
      return vlanMatch ? parseInt(vlanMatch[1], 10) : 1;
    }
  }

  // For access ports, the VLAN assigned to the active port is the device VLAN
  const accessPort = Object.values(state.ports).find((port: Port) => !port.shutdown && port.mode === 'access' && getPortVlan(port) !== 1);
  if (accessPort) return getPortVlan(accessPort);

  return 1;
};

export const getFallbackVlanFromPath = (deviceId: string, deps: VlanHelperDeps): number => {
  const device = deps.deviceMap.get(deviceId);
  const state = deps.deviceStates?.get(deviceId);
  if (!device) return 1;
  const vlan = getDeviceVlan(device, state, deps);
  if (vlan && vlan > 0) return vlan;
  return 1;
};

