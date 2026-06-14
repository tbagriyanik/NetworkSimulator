'use client';

import { useCallback, useRef, useEffect } from 'react';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { getDeviceWifiConfig } from '@/lib/network/connectivity';
import { generateRandomLinkLocalIpv4 } from '@/lib/network/linkLocal';
import { processIotRules } from '@/lib/network/iotLogic';
import type { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { EnvironmentSettings } from '@/lib/store/appStore';

export function useNetworkLogic(
  deviceStates: Map<string, SwitchState>,
  topologyConnections: CanvasConnection[],
  environment: EnvironmentSettings
) {
  const deviceStatesRef = useRef(deviceStates);
  const topologyConnectionsRef = useRef(topologyConnections);
  const environmentRef = useRef(environment);

  useEffect(() => { deviceStatesRef.current = deviceStates; }, [deviceStates]);
  useEffect(() => { topologyConnectionsRef.current = topologyConnections; }, [topologyConnections]);
  useEffect(() => { environmentRef.current = environment; }, [environment]);

  const normalizeDeviceType = useCallback((type: string): DeviceType => {
    if (type === 'switch') return 'switchL2';
    if (type === 'switchL2' || type === 'switchL3' || type === 'pc' || type === 'iot' || type === 'router' || type === 'firewall') return type;
    throw new Error(`Unknown device type: ${type}`);
  }, []);

  const isValidIpv4 = useCallback((value?: string): boolean => {
    if (!value) return false;
    const parts = value.split('.');
    if (parts.length !== 4) return false;
    return parts.every((part) => {
      const n = Number(part);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }, []);

  const isSameSubnetByMask = useCallback((left?: string, right?: string, mask?: string): boolean => {
    if (!isValidIpv4(left) || !isValidIpv4(right) || !isValidIpv4(mask)) return false;
    const leftParts = (left as string).split('.').map(Number);
    const rightParts = (right as string).split('.').map(Number);
    const maskParts = (mask as string).split('.').map(Number);
    return leftParts.every((part, index) => (part & maskParts[index]) === (rightParts[index] & maskParts[index]));
  }, [isValidIpv4]);

  const getPortAccessVlan = useCallback((port: { accessVlan?: string | number; vlan?: number }): number => {
    return Number(port.accessVlan) || port.vlan || 1;
  }, []);

  const getPeerPortVlan = useCallback((ownerDeviceId: string, ownerPortId: string, _devices: CanvasDevice[]): number | null => {
    const conns = topologyConnectionsRef.current;
    const dStates = deviceStatesRef.current;
    const connection = conns.find((conn) =>
      conn.active !== false &&
      (
        (conn.sourceDeviceId === ownerDeviceId && conn.sourcePort === ownerPortId) ||
        (conn.targetDeviceId === ownerDeviceId && conn.targetPort === ownerPortId)
      )
    );
    if (!connection) return null;

    const peerDeviceId = connection.sourceDeviceId === ownerDeviceId ? connection.targetDeviceId : connection.sourceDeviceId;
    const peerPortId = connection.sourceDeviceId === ownerDeviceId ? connection.targetPort : connection.sourcePort;
    const peerPort = dStates?.get(peerDeviceId)?.ports?.[peerPortId];
    if (!peerPort) return null;
    if (peerPort.mode === 'trunk') return 1;
    return getPortAccessVlan(peerPort);
  }, []);

  const inferEndpointVlan = useCallback((device: CanvasDevice, devices: CanvasDevice[]): number => {
    const dStates = deviceStatesRef.current;
    const conns = topologyConnectionsRef.current;

    if (device.wifi?.enabled && device.wifi?.mode === 'client' && device.wifi?.bssid) {
      const ap = devices.find(d => d.id === device.wifi?.bssid);
      if (ap) {
        const apWlan = dStates?.get(ap.id)?.ports?.['wlan0'];
        if (apWlan) return getPortAccessVlan(apWlan);
      }
    }

    const connection = conns.find((conn) =>
      conn.active !== false &&
      (conn.sourceDeviceId === device.id || conn.targetDeviceId === device.id)
    );
    if (!connection) return Number(device.vlan || 1);

    const peerDeviceId = connection.sourceDeviceId === device.id ? connection.targetDeviceId : connection.sourceDeviceId;
    const peerPortId = connection.sourceDeviceId === device.id ? connection.targetPort : connection.sourcePort;
    const peerPort = dStates?.get(peerDeviceId)?.ports?.[peerPortId];
    if (!peerPort) return Number(device.vlan || 1);
    if (peerPort.mode === 'trunk') return 1;
    return getPortAccessVlan(peerPort);
  }, []);

  const getServerPoolVlan = useCallback((
    serverDevice: CanvasDevice,
    serverState: SwitchState | undefined,
    poolGateway: string,
    poolStartIp: string,
    poolSubnetMask: string,
    devices: CanvasDevice[]
  ): number | null => {
    if (!isValidIpv4(poolSubnetMask)) return null;
    const anchorIp = isValidIpv4(poolGateway) ? poolGateway : poolStartIp;
    if (!isValidIpv4(anchorIp)) return null;

    const ports = serverState?.ports || {};
    for (const [portId, port] of Object.entries(ports)) {
      if (!port?.ipAddress || port.shutdown) continue;
      const effectiveMask = port.subnetMask || poolSubnetMask;
      if (!isValidIpv4(effectiveMask) || !isSameSubnetByMask(port.ipAddress, anchorIp, effectiveMask)) continue;

      const sviMatch = portId.match(/^vlan(\d+)$/i);
      if (sviMatch) return parseInt(sviMatch[1], 10) || 1;
      if (port.mode === 'trunk') return 1;
      if (port.accessVlan || port.vlan) return getPortAccessVlan(port);

      const peerVlan = getPeerPortVlan(serverDevice.id, portId, devices);
      return peerVlan ?? 1;
    }

    if (isSameSubnetByMask(serverDevice.ip, anchorIp, poolSubnetMask)) {
      return inferEndpointVlan(serverDevice, devices);
    }

    return null;
  }, [isValidIpv4, isSameSubnetByMask, getPortAccessVlan, getPeerPortVlan, inferEndpointVlan]);

  const hasActivePathBetweenDevices = useCallback((
    sourceDeviceId: string,
    targetDeviceId: string,
    devices: CanvasDevice[],
    states?: Map<string, SwitchState>,
    connectionsOverride?: CanvasConnection[]
  ): boolean => {
    if (sourceDeviceId === targetDeviceId) return true;

    const dStates = deviceStatesRef.current;
    const conns = topologyConnectionsRef.current;
    const byId = new Map(devices.map((device) => [device.id, device]));
    const activeStates = states ?? dStates;
    const isDeviceUsable = (deviceId: string) => {
      const device = byId.get(deviceId);
      return !!device && device.status !== 'offline';
    };
    const isPortUsable = (deviceId: string, portId: string) => {
      const statePort = activeStates?.get(deviceId)?.ports?.[portId];
      if (statePort?.shutdown || statePort?.status === 'err-disabled' || statePort?.status === 'disabled') return false;
      const devicePort = byId.get(deviceId)?.ports?.find((port) => port.id === portId);
      return !(devicePort?.shutdown || devicePort?.status === 'err-disabled' || devicePort?.status === 'disabled');
    };

    if (!isDeviceUsable(sourceDeviceId) || !isDeviceUsable(targetDeviceId)) return false;

    const visited = new Set<string>([sourceDeviceId]);
    const queue = [sourceDeviceId];
    const activeConnections = [...(connectionsOverride ?? conns)];

    devices.forEach(pc => {
      const pcWifi = getDeviceWifiConfig(pc, activeStates);
      if (pcWifi?.enabled && (pcWifi.mode === 'client' || pcWifi.mode === 'sta') && pcWifi.ssid) {
        devices.forEach(ap => {
          if (ap.id === pc.id) return;
          const apWifi = getDeviceWifiConfig(ap, activeStates);
          if (apWifi?.enabled && apWifi.mode === 'ap' && apWifi.ssid === pcWifi.ssid) {
            if ((apWifi.security || 'open') === (pcWifi.security || 'open') &&
              (apWifi.security === 'open' || apWifi.password === pcWifi.password)) {
              activeConnections.push({
                id: `wireless-dhcp-${pc.id}-${ap.id}`,
                sourceDeviceId: pc.id,
                sourcePort: 'wlan0',
                targetDeviceId: ap.id,
                targetPort: 'wlan0',
                cableType: 'wireless',
                active: true
              } as any);
            }
          }
        });
      }
    });

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) continue;
      if (currentId === targetDeviceId) return true;

      for (const connection of activeConnections) {
        if (connection.active === false) continue;
        const isSourceSide = connection.sourceDeviceId === currentId;
        const isTargetSide = connection.targetDeviceId === currentId;
        if (!isSourceSide && !isTargetSide) continue;
        const neighborId = isSourceSide ? connection.targetDeviceId : connection.sourceDeviceId;
        if (visited.has(neighborId) || !isDeviceUsable(neighborId)) continue;
        if (!isPortUsable(connection.sourceDeviceId, connection.sourcePort)) continue;
        if (!isPortUsable(connection.targetDeviceId, connection.targetPort)) continue;
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }

    return false;
  }, []);

  const isDhcpPoolCompatibleForClient = useCallback((
    pcDevice: CanvasDevice,
    serverDevice: CanvasDevice,
    serverState: SwitchState | undefined,
    poolGateway: string,
    poolStartIp: string,
    poolSubnetMask: string,
    devices: CanvasDevice[],
    activeStates?: Map<string, SwitchState>,
    connectionsOverride?: CanvasConnection[]
  ): boolean => {
    const states = activeStates ?? deviceStatesRef.current;
    if (!hasActivePathBetweenDevices(pcDevice.id, serverDevice.id, devices, states, connectionsOverride)) return false;
    const clientVlan = inferEndpointVlan(pcDevice, devices);
    const serverVlan = getServerPoolVlan(serverDevice, serverState, poolGateway, poolStartIp, poolSubnetMask, devices);
    return serverVlan !== null && clientVlan === serverVlan;
  }, [hasActivePathBetweenDevices, inferEndpointVlan, getServerPoolVlan]);

  const buildLinkLocalLease = useCallback((pcDevice: CanvasDevice, devices: CanvasDevice[]) => {
    const usedIps = new Set(
      devices
        .filter((d) => d.id !== pcDevice.id && isValidIpv4(d.ip) && d.ip !== '0.0.0.0')
        .map((d) => d.ip as string)
    );
    return {
      ip: generateRandomLinkLocalIpv4(usedIps),
      subnet: '255.255.0.0',
      gateway: '0.0.0.0',
      dns: '0.0.0.0',
    };
  }, [isValidIpv4]);

  const assignDhcpLeaseForPc = useCallback((
    pcDevice: CanvasDevice,
    currentDevices: CanvasDevice[],
    currentStates?: Map<string, SwitchState>,
    currentConnections?: CanvasConnection[]
  ): { ip: string; subnet: string; gateway: string; dns: string } | null => {
    const dStates = deviceStatesRef.current;
    const safeDeviceStates = ensureDeviceStatesMap(currentStates ?? dStates);
    const usedIps = () => new Set(currentDevices.filter((d) => d.id !== pcDevice.id && d.ip && d.ip !== '0.0.0.0').map((d) => d.ip));

    for (const serverDevice of currentDevices) {
      if (serverDevice.id === pcDevice.id || serverDevice.type !== 'pc') continue;
      const pools = serverDevice.services?.dhcp?.enabled ? (serverDevice.services?.dhcp?.pools || []) : [];
      for (const pool of pools) {
        if (!pool.startIp || !pool.subnetMask) continue;
        if (!isDhcpPoolCompatibleForClient(pcDevice, serverDevice, undefined, pool.defaultGateway || '', pool.startIp, pool.subnetMask, currentDevices, safeDeviceStates, currentConnections)) continue;
        const startParts = pool.startIp.split('.').map(Number);
        if (startParts.length !== 4) continue;
        const assignedIps = usedIps();
        for (let i = 0; i < (pool.maxUsers || 50); i++) {
          const candidate = `${startParts[0]}.${startParts[1]}.${startParts[2]}.${startParts[3] + i}`;
          if (!assignedIps.has(candidate)) return { ip: candidate, subnet: pool.subnetMask || '255.255.255.0', gateway: pool.defaultGateway || '0.0.0.0', dns: pool.dnsServer || '8.8.8.8' };
        }
      }
    }

    for (const [deviceId_, state] of safeDeviceStates.entries()) {
      if (deviceId_ === pcDevice.id) continue;
      const serverDevice = currentDevices.find((d) => d.id === deviceId_);
      if (!serverDevice || (serverDevice.type !== 'router' && serverDevice.type !== 'switchL2' && serverDevice.type !== 'switchL3')) continue;
      const cliPools = state.dhcpPools || {};
      for (const poolName in cliPools) {
        const pool = cliPools[poolName];
        if (!pool.network || !pool.subnetMask) continue;
        const networkParts = pool.network.split('.').map(Number);
        if (networkParts.length !== 4) continue;
        const poolGateway = pool.defaultRouter || `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.1`;
        const poolStartIp = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.100`;
        if (!isDhcpPoolCompatibleForClient(pcDevice, serverDevice, state, poolGateway, poolStartIp, pool.subnetMask, currentDevices, safeDeviceStates, currentConnections)) continue;
        const assignedIps = usedIps();
        for (let i = 100; i < 254; i++) {
          const candidate = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${i}`;
          if (!assignedIps.has(candidate)) return { ip: candidate, subnet: pool.subnetMask || '255.255.255.0', gateway: poolGateway, dns: pool.dnsServer || '8.8.8.8' };
        }
      }
      const pools = state.services?.dhcp?.pools || [];
      for (const pool of pools) {
        if (!pool.startIp || !pool.subnetMask) continue;
        if (!isDhcpPoolCompatibleForClient(pcDevice, serverDevice, state, pool.defaultGateway || '', pool.startIp, pool.subnetMask, currentDevices, safeDeviceStates, currentConnections)) continue;
        const startParts = pool.startIp.split('.').map(Number);
        if (startParts.length !== 4) continue;
        const assignedIps = usedIps();
        for (let i = 0; i < (pool.maxUsers || 50); i++) {
          const candidate = `${startParts[0]}.${startParts[1]}.${startParts[2]}.${startParts[3] + i}`;
          if (!assignedIps.has(candidate)) return { ip: candidate, subnet: pool.subnetMask || '255.255.255.0', gateway: pool.defaultGateway || '0.0.0.0', dns: pool.dnsServer || '8.8.8.8' };
        }
      }
    }
    return null;
  }, [isDhcpPoolCompatibleForClient]);

  const applyLinkLocalToUnconfiguredHosts = useCallback((devices: CanvasDevice[]): CanvasDevice[] => {
    const usedIps = new Set<string>();
    devices.forEach((device) => {
      if (isValidIpv4(device.ip) && device.ip !== '0.0.0.0') usedIps.add(device.ip);
    });
    return devices.map((device) => {
      if (device.type !== 'pc' && device.type !== 'iot') return device;
      if (isValidIpv4(device.ip) && device.ip !== '0.0.0.0') return device;
      const linkLocalIp = generateRandomLinkLocalIpv4(usedIps);
      usedIps.add(linkLocalIp);
      return { ...device, ip: linkLocalIp, subnet: device.subnet || '255.255.0.0', gateway: device.gateway || '0.0.0.0', dns: device.dns || '0.0.0.0' };
    });
  }, [isValidIpv4]);

  const applyIotAutomationPass = useCallback((devices: CanvasDevice[]): CanvasDevice[] => {
    const env = environmentRef.current;
    if (!devices.some((device) => device.type === 'iot' && device.iot?.rules?.some((rule) => rule.enabled !== false))) return devices;
    let nextDevices = devices;
    let didUpdate = false;
    processIotRules(devices, env, (deviceId, updates) => {
      didUpdate = true;
      nextDevices = nextDevices.map((device) =>
        device.id === deviceId ? { ...device, ...updates, iot: updates.iot ? { ...device.iot, ...updates.iot } : device.iot } : device
      );
    });
    return didUpdate ? nextDevices : devices;
  }, []);

  return {
    normalizeDeviceType,
    isValidIpv4,
    isSameSubnetByMask,
    getPortAccessVlan,
    getPeerPortVlan,
    inferEndpointVlan,
    getServerPoolVlan,
    hasActivePathBetweenDevices,
    isDhcpPoolCompatibleForClient,
    buildLinkLocalLease,
    assignDhcpLeaseForPc,
    applyLinkLocalToUnconfiguredHosts,
    applyIotAutomationPass,
  };
}
