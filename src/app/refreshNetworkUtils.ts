import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

export const isSwitchDeviceType = (type: string): boolean =>
  type === 'switchL2' || type === 'switchL3';

export const normalizeWifiMode = (mode: string | undefined): 'ap' | 'client' | 'disabled' => {
  if (!mode) return 'disabled';
  const normalized = mode.toLowerCase().replace(/^wifi-/, '');
  if (normalized === 'client' || normalized === 'sta') return 'client';
  if (normalized === 'ap') return 'ap';
  return 'disabled';
};

export const hasValidIp = (ip: string | undefined): boolean =>
  !!ip && ip !== '0.0.0.0' && ip !== '169.254.0.0';

export const ipToNumber = (ip: string): number | null => {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
};

export const isIpInPoolRange = (ip: string, pool: { startIp: string; maxUsers: number }): boolean => {
  const ipNum = ipToNumber(ip);
  const startNum = ipToNumber(pool.startIp);
  if (ipNum === null || startNum === null) return false;
  const maxUsers = Math.max(1, Number(pool.maxUsers || 1));
  return ipNum >= startNum && ipNum < (startNum + maxUsers);
};

export const firstValue = (...values: Array<string | undefined | null>): string =>
  values.find((value) => !!value && value !== '0.0.0.0') || '-';

export const isWirelessMatch = (client: CanvasDevice, ap: CanvasDevice): boolean => {
  const clientWifi = client.wifi;
  const apWifi = ap.wifi;
  if (!clientWifi?.enabled || clientWifi.mode !== 'client' || !clientWifi.ssid) return false;
  if (!apWifi?.enabled || apWifi.mode !== 'ap' || !apWifi.ssid) return false;
  if (apWifi.ssid !== clientWifi.ssid) return false;
  if (clientWifi.bssid && clientWifi.bssid !== ap.id) return false;

  const apSecurity = apWifi.security || 'open';
  const clientSecurity = clientWifi.security || 'open';
  if (apSecurity !== clientSecurity) return false;
  return apSecurity === 'open' || apWifi.password === clientWifi.password;
};

export const propagateVtpVlans = (
  devices: CanvasDevice[],
  states: Map<string, SwitchState>,
  connections: CanvasConnection[]
): Map<string, SwitchState> => {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const nextStates = new Map(states);

  for (const conn of connections) {
    if (!conn.active) continue;
    const a = byId.get(conn.sourceDeviceId);
    const b = byId.get(conn.targetDeviceId);
    if (!a || !b) continue;
    if (!isSwitchDeviceType(a.type) || !isSwitchDeviceType(b.type)) continue;

    const aState = nextStates.get(a.id);
    const bState = nextStates.get(b.id);
    if (!aState || !bState) continue;

    const aPort = aState.ports?.[conn.sourcePort];
    const bPort = bState.ports?.[conn.targetPort];
    const aIsTrunk = !!aPort && !aPort.shutdown && aPort.mode === 'trunk';
    const bIsTrunk = !!bPort && !bPort.shutdown && bPort.mode === 'trunk';
    if (!aIsTrunk || !bIsTrunk) continue;

    const aMode = aState.vtpMode || 'server';
    const bMode = bState.vtpMode || 'server';
    const aDomain = (aState.vtpDomain || '').trim();
    const bDomain = (bState.vtpDomain || '').trim();
    if (!aDomain || !bDomain) continue;
    if (aDomain !== bDomain) continue;

    const aRev = aState.vtpRevision || 0;
    const bRev = bState.vtpRevision || 0;

    if (aMode === 'server' && bMode === 'client' && aRev >= bRev) {
      nextStates.set(b.id, { ...bState, vlans: { ...(aState.vlans || {}) }, vtpRevision: aRev });
    } else if (bMode === 'server' && aMode === 'client' && bRev >= aRev) {
      nextStates.set(a.id, { ...aState, vlans: { ...(bState.vlans || {}) }, vtpRevision: bRev });
    }
  }

  return nextStates;
};

export const validateTopologyConnections = (
  devices: CanvasDevice[],
  connections: CanvasConnection[]
): { sanitizedConnections: CanvasConnection[]; invalidCount: number } => {
  const byId = new Map(devices.map((device) => [device.id, device]));
  const usedPorts = new Set<string>();
  let invalidCount = 0;

  const sanitizedConnections = connections.map((connection) => {
    const sourceDevice = byId.get(connection.sourceDeviceId);
    const targetDevice = byId.get(connection.targetDeviceId);
    const sourcePortExists = !!sourceDevice?.ports?.some((port) => port.id === connection.sourcePort);
    const targetPortExists = !!targetDevice?.ports?.some((port) => port.id === connection.targetPort);
    const sourceKey = `${connection.sourceDeviceId}:${connection.sourcePort}`;
    const targetKey = `${connection.targetDeviceId}:${connection.targetPort}`;
    const duplicatePort = usedPorts.has(sourceKey) || usedPorts.has(targetKey);
    const invalid = !sourceDevice ||
      !targetDevice ||
      !sourcePortExists ||
      !targetPortExists ||
      connection.sourceDeviceId === connection.targetDeviceId ||
      duplicatePort;

    if (connection.active !== false) {
      if (invalid) {
        invalidCount++;
      } else {
        usedPorts.add(sourceKey);
        usedPorts.add(targetKey);
      }
    }

    return invalid ? { ...connection, active: false } : connection;
  });

  return { sanitizedConnections, invalidCount };
};

export const releaseDisconnectedPorts = (
  devices: CanvasDevice[],
  states: Map<string, SwitchState>,
  connections: CanvasConnection[]
): { devices: CanvasDevice[]; states: Map<string, SwitchState> } => {
  const activePortKeys = new Set<string>();
  connections.forEach((connection) => {
    if (connection.active === false) return;
    activePortKeys.add(`${connection.sourceDeviceId}:${connection.sourcePort}`);
    activePortKeys.add(`${connection.targetDeviceId}:${connection.targetPort}`);
  });

  const nextDevices = devices.map((device) => ({
    ...device,
    ports: device.ports.map((port) => {
      const key = `${device.id}:${port.id}`;
      if (port.shutdown || port.status === 'disabled' || port.status === 'err-disabled') return port;
      if (activePortKeys.has(key)) return { ...port, status: 'connected' as const };
      if (port.status === 'connected') {
        return { ...port, status: 'disconnected' as const };
      }
      return port;
    }),
  }));

  const nextStates = new Map(states);
  devices.forEach((device) => {
    const state = nextStates.get(device.id);
    if (!state?.ports) return;
    const nextPorts = { ...state.ports };
    let changed = false;

    Object.entries(nextPorts).forEach(([portId, port]) => {
      const key = `${device.id}:${portId}`;
      if (port.shutdown || port.status === 'disabled' || port.status === 'err-disabled') return;
      if (activePortKeys.has(key)) {
        if (port.status !== 'connected') {
          nextPorts[portId] = { ...port, status: 'connected' };
          changed = true;
        }
        return;
      }
      if (port.status === 'connected') {
        nextPorts[portId] = {
          ...port,
          status: 'notconnect',
          spanningTree: port.spanningTree
            ? { ...port.spanningTree, state: 'disabled', role: 'disabled' }
            : port.spanningTree,
        };
        changed = true;
      }
    });

    if (changed) {
      nextStates.set(device.id, { ...state, ports: nextPorts });
    }
  });

  return { devices: nextDevices, states: nextStates };
};
