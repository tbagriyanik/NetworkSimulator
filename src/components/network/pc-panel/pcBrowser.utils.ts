import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import type { DeviceWifiConfig } from '@/lib/network/connectivity';

export function isSameSubnet(sourceIp: string, targetIp: string, subnetMask: string): boolean {
  try {
    const a = sourceIp.split('.').map(Number);
    const b = targetIp.split('.').map(Number);
    const m = subnetMask.split('.').map(Number);
    if (a.length !== 4 || b.length !== 4 || m.length !== 4) return false;
    for (let i = 0; i < 4; i += 1) {
      if ((a[i] & m[i]) !== (b[i] & m[i])) return false;
    }
    return true;
  } catch (_err) {
    return false;
  }
}

export function hasGatewayForTarget({
  pcIP,
  targetIp,
  pcSubnet,
  pcGateway,
  isValidIpv4,
}: {
  pcIP: string;
  targetIp: string;
  pcSubnet: string;
  pcGateway: string;
  isValidIpv4: (value: string) => boolean;
}): boolean {
  if (!isValidIpv4(pcIP) || !isValidIpv4(targetIp) || !isValidIpv4(pcSubnet)) return false;
  if (isSameSubnet(pcIP, targetIp, pcSubnet)) return true;
  return isValidIpv4(pcGateway);
}

export function normalizeLookupTarget(raw: string): string {
  const value = (raw || '').trim();
  if (!value) return '';
  try {
    const withScheme = value.startsWith('http://') || value.startsWith('https://')
      ? value
      : `http://${value}`;
    const parsed = new URL(withScheme);
    return parsed.hostname || value;
  } catch (_err) {
    return value.split('/')[0].split('?')[0].trim();
  }
}

export function resolveDeviceNameTarget({
  raw,
  internalPcHostname,
  deviceId,
  topologyDevices,
  deviceStates,
  isValidIpv4,
}: {
  raw: string;
  internalPcHostname: string;
  deviceId: string;
  topologyDevices: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
  isValidIpv4: (value: string) => boolean;
}) {
  const normalized = (raw || '').trim().toLowerCase();
  if (!normalized) return null;

  if (normalized === 'localhost' || normalized === internalPcHostname.toLowerCase() || normalized === deviceId.toLowerCase()) {
    return { ip: '127.0.0.1', label: internalPcHostname };
  }

  const matched = topologyDevices.find((d) =>
    d.name?.toLowerCase() === normalized || d.id?.toLowerCase() === normalized
  );
  if (!matched) return null;

  if (matched.ip && isValidIpv4(matched.ip)) {
    return { ip: matched.ip, label: matched.name || matched.id };
  }

  const state = deviceStates?.get(matched.id);
  if (state?.ports) {
    for (const port of Object.values(state.ports)) {
      if (port?.ipAddress && isValidIpv4(port.ipAddress)) {
        return { ip: port.ipAddress, label: matched.name || matched.id };
      }
    }
  }

  return null;
}

export function resolveDomainWithDnsServices({
  domain,
  pcDNS,
  topologyDevices,
  deviceStates,
  canReachTargetIp,
  isValidIpv4,
  isValidIpv6,
}: {
  domain: string;
  pcDNS: string;
  topologyDevices: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
  canReachTargetIp: (targetIp: string, options?: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string }) => boolean;
  isValidIpv4: (value: string) => boolean;
  isValidIpv6: (value: string) => boolean;
}) {
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return null;

  if (!isValidIpv4(pcDNS) && !isValidIpv6(pcDNS)) return null;

  let dnsServerDevice = topologyDevices.find(
    (d) => (d.ip === pcDNS || d.ipv6 === pcDNS) && d.services?.dns?.enabled && (d.services?.dns?.records?.length || 0) > 0
  );

  let records = dnsServerDevice?.services?.dns?.records || [];

  if (deviceStates) {
    for (const [id, state] of deviceStates.entries()) {
      if (state.services?.dns?.enabled && (state.services.dns.records?.length || 0) > 0) {
        const topoDev = topologyDevices.find(d => d.id === id);
        const hasIp = topoDev?.ip === pcDNS || topoDev?.ipv6 === pcDNS || Object.values(state.ports).some(p => p.ipAddress === pcDNS || p.ipv6Address === pcDNS);

        if (hasIp) {
          dnsServerDevice = topoDev || { id, name: state.hostname, ip: pcDNS } as unknown as CanvasDevice;
          records = state.services?.dns?.records || [];
          break;
        }
      }
    }
  }

  if ((!dnsServerDevice?.ip && !dnsServerDevice?.ipv6) || !canReachTargetIp(pcDNS, { protocol: 'udp', port: '53' })) return null;

  const visited = new Set<string>();
  let currentDomain = normalized;

  for (let depth = 0; depth < 10; depth += 1) {
    if (visited.has(currentDomain)) return null;
    visited.add(currentDomain);

    const record = (records || []).find((r: { domain: string }) => r.domain.toLowerCase() === currentDomain);
    if (!record) return null;

    const value = record.address.trim().toLowerCase();
    if (!value) return null;
    if (isValidIpv4(value) || isValidIpv6(value)) {
      return { address: value, server: dnsServerDevice };
    }

    currentDomain = value;
  }

  return null;
}

export function findHttpServerByTarget({
  target,
  deviceId,
  topologyDevices,
  deviceStates,
  canReachTargetIp,
  resolveDomainWithDnsServices,
}: {
  target: string;
  deviceId: string;
  topologyDevices: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
  canReachTargetIp: (targetIp: string, options?: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string }) => boolean;
  resolveDomainWithDnsServices: (domain: string) => { address: string; server?: CanvasDevice } | null;
}) {
  const normalizedTarget = target.trim().toLowerCase();
  if (!normalizedTarget) return null;

  if (normalizedTarget === '127.0.0.1' || normalizedTarget === '::1') {
    const selfDevice = topologyDevices.find((d) => d.id === deviceId);
    if (selfDevice && selfDevice.services?.http?.enabled) return selfDevice;
  }

  const pcByIp = topologyDevices.find(
    (d) => (d.ip === target || d.ipv6?.toLowerCase() === normalizedTarget) && d.services?.http?.enabled
  );
  if (pcByIp) {
    const targetAddress = pcByIp.ipv6 && normalizedTarget === pcByIp.ipv6.toLowerCase() ? pcByIp.ipv6 : pcByIp.ip;
    if (targetAddress && canReachTargetIp(targetAddress, { protocol: 'tcp', port: '80' })) return pcByIp;
  }

  const routerByIp = topologyDevices.find(
    (d) => (d.type === 'router' || d.type === 'switchL2' || d.type === 'switchL3') && (d.ip === target || d.ipv6?.toLowerCase() === normalizedTarget) && d.services?.http?.enabled
  );
  if (routerByIp) {
    const targetAddress = routerByIp.ipv6 && normalizedTarget === routerByIp.ipv6.toLowerCase() ? routerByIp.ipv6 : routerByIp.ip;
    if (targetAddress && canReachTargetIp(targetAddress, { protocol: 'tcp', port: '80' })) return routerByIp;
  }

  if (deviceStates) {
    for (const [stateId, state] of deviceStates.entries()) {
      if (!state?.services?.http?.enabled) continue;
      const topoDevice = topologyDevices.find(d => d.id === stateId);
      if (!topoDevice || (topoDevice.type !== 'router' && topoDevice.type !== 'switchL2' && topoDevice.type !== 'switchL3')) continue;
      const ports = state.ports || {};
      const match = Object.values(ports).find((port: { ipAddress?: string; ipv6Address?: string }) => port?.ipAddress === target || port?.ipv6Address?.toLowerCase() === normalizedTarget);
      if (match) {
        const matchIp = match.ipv6Address && normalizedTarget === match.ipv6Address.toLowerCase() ? match.ipv6Address : (match.ipAddress || target);
        if (canReachTargetIp(matchIp, { protocol: 'tcp', port: '80' })) {
          return {
            ...topoDevice,
            ip: matchIp
          };
        }
      }
    }
  }

  const dnsResult = resolveDomainWithDnsServices(normalizedTarget);
  if (!dnsResult) return null;

  const resolvedPc = topologyDevices.find(
    (d) => (d.ip === dnsResult.address || d.ipv6?.toLowerCase() === dnsResult.address.toLowerCase()) && d.services?.http?.enabled
  ) || null;
  if (resolvedPc && canReachTargetIp(dnsResult.address, { protocol: 'tcp', port: '80' })) return resolvedPc;

  const resolvedRouter = topologyDevices.find(
    (d) => (d.type === 'router' || d.type === 'switchL2' || d.type === 'switchL3') && (d.ip === dnsResult.address || d.ipv6?.toLowerCase() === dnsResult.address.toLowerCase()) && d.services?.http?.enabled
  ) || null;
  if (resolvedRouter && canReachTargetIp(dnsResult.address, { protocol: 'tcp', port: '80' })) return resolvedRouter;

  if (deviceStates) {
    for (const [stateId, state] of deviceStates.entries()) {
      if (!state?.services?.http?.enabled) continue;
      const topoDevice = topologyDevices.find(d => d.id === stateId);
      if (!topoDevice || (topoDevice.type !== 'router' && topoDevice.type !== 'switchL2' && topoDevice.type !== 'switchL3')) continue;
      const ports = state.ports || {};
      const match = Object.values(ports).find((port: { ipAddress?: string; ipv6Address?: string }) => port?.ipAddress === dnsResult.address || port?.ipv6Address?.toLowerCase() === dnsResult.address.toLowerCase());
      if (match) {
        const matchIp = match.ipv6Address && dnsResult.address.toLowerCase() === match.ipv6Address.toLowerCase() ? match.ipv6Address : (match.ipAddress || dnsResult.address);
        if (canReachTargetIp(matchIp, { protocol: 'tcp', port: '80' })) {
          return {
            ...topoDevice,
            ip: matchIp
          };
        }
      }
    }
  }

  return null;
}

export function getPortAccessVlan(port: { accessVlan?: unknown; vlan?: unknown } | null | undefined): number {
  return Number(port?.accessVlan || port?.vlan || 1);
}

export function getPeerPortVlan({
  ownerDeviceId,
  ownerPortId,
  topologyConnections,
  deviceStates,
}: {
  ownerDeviceId: string;
  ownerPortId: string;
  topologyConnections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
}): number | null {
  const connection = topologyConnections.find((conn) =>
    conn.active !== false &&
    (
      (conn.sourceDeviceId === ownerDeviceId && conn.sourcePort === ownerPortId) ||
      (conn.targetDeviceId === ownerDeviceId && conn.targetPort === ownerPortId)
    )
  );
  if (!connection) return null;

  const peerDeviceId = connection.sourceDeviceId === ownerDeviceId ? connection.targetDeviceId : connection.sourceDeviceId;
  const peerPortId = connection.sourceDeviceId === ownerDeviceId ? connection.targetPort : connection.sourcePort;
  const peerPort = deviceStates?.get(peerDeviceId)?.ports?.[peerPortId];
  if (!peerPort) return null;
  if (peerPort.mode === 'trunk') return 1;
  return getPortAccessVlan(peerPort);
}

export function inferEndpointVlan({
  endpoint,
  topologyConnections,
  deviceStates,
}: {
  endpoint: CanvasDevice | undefined;
  topologyConnections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
}): number {
  if (!endpoint) return 1;

  const connection = topologyConnections.find((conn) =>
    conn.active !== false &&
    (conn.sourceDeviceId === endpoint.id || conn.targetDeviceId === endpoint.id)
  );
  if (!connection) {
    return Number(endpoint.vlan || 1);
  }

  const peerDeviceId = connection.sourceDeviceId === endpoint.id ? connection.targetDeviceId : connection.sourceDeviceId;
  const peerPortId = connection.sourceDeviceId === endpoint.id ? connection.targetPort : connection.sourcePort;
  const peerPort = deviceStates?.get(peerDeviceId)?.ports?.[peerPortId];
  if (!peerPort) {
    return Number(endpoint.vlan || 1);
  }
  if (peerPort.mode === 'trunk') return 1;
  return getPortAccessVlan(peerPort);
}

export function getServerPoolVlan({
  serverDevice,
  serverState,
  poolGateway,
  poolStartIp,
  poolSubnetMask,
  isValidIpv4,
  topologyConnections,
  deviceStates,
}: {
  serverDevice: CanvasDevice | undefined;
  serverState: SwitchState | undefined;
  poolGateway: string;
  poolStartIp: string;
  poolSubnetMask: string;
  isValidIpv4: (value: string) => boolean;
  topologyConnections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
}): number | null {
  if (!serverDevice || !isValidIpv4(poolSubnetMask)) return null;

  const anchorIp = isValidIpv4(poolGateway) ? poolGateway : poolStartIp;
  if (!isValidIpv4(anchorIp)) return null;

  if (serverDevice.type === 'pc') {
    if (isValidIpv4(serverDevice.ip || '') && isSameSubnet(serverDevice.ip || '', anchorIp, poolSubnetMask)) {
      return inferEndpointVlan({ endpoint: serverDevice, topologyConnections, deviceStates });
    }
    return null;
  }

  const ports = serverState?.ports || {};
  for (const [portId, port] of Object.entries(ports)) {
    if (!port?.ipAddress || port.shutdown) continue;
    const effectiveMask = port.subnetMask || poolSubnetMask;
    if (!isValidIpv4(effectiveMask) || !isSameSubnet(port.ipAddress, anchorIp, effectiveMask)) continue;

    const sviMatch = portId.match(/^vlan(\d+)$/i);
    if (sviMatch) return parseInt(sviMatch[1], 10) || 1;
    if (port.mode === 'trunk') return 1;
    if (port.accessVlan || port.vlan) return getPortAccessVlan(port);

    const peerVlan = getPeerPortVlan({ ownerDeviceId: serverDevice.id, ownerPortId: portId, topologyConnections, deviceStates });
    return peerVlan ?? 1;
  }

  if (isValidIpv4(serverDevice.ip || '') && isSameSubnet(serverDevice.ip || '', anchorIp, poolSubnetMask)) {
    return inferEndpointVlan({ endpoint: serverDevice, topologyConnections, deviceStates });
  }

  return null;
}

export function isDhcpPoolCompatibleForClient({
  poolGateway,
  poolStartIp,
  poolSubnetMask,
  serverDevice,
  serverState,
  clientDevice,
  deviceStates,
  topologyConnections,
  isValidIpv4,
  getDeviceWifiConfig,
}: {
  poolGateway: string;
  poolStartIp: string;
  poolSubnetMask: string;
  serverDevice: CanvasDevice | undefined;
  serverState?: SwitchState;
  clientDevice: CanvasDevice | undefined;
  deviceStates?: Map<string, SwitchState>;
  topologyConnections: CanvasConnection[];
  isValidIpv4: (value: string) => boolean;
  getDeviceWifiConfig: (device: CanvasDevice, states?: Map<string, SwitchState>) => DeviceWifiConfig | undefined;
}): boolean {
  if (!clientDevice) return false;

  const clientWifi = getDeviceWifiConfig(clientDevice, deviceStates);
  if (!serverDevice) return false;
  if (clientWifi?.enabled && clientWifi.mode === 'client' && clientWifi.ssid) {
    const serverWifi = getDeviceWifiConfig(serverDevice, deviceStates);
    if (!serverWifi?.enabled || serverWifi.mode !== 'ap' || serverWifi.ssid !== clientWifi.ssid) {
      return false;
    }
    return getServerPoolVlan({
      serverDevice,
      serverState,
      poolGateway,
      poolStartIp,
      poolSubnetMask,
      isValidIpv4,
      topologyConnections,
      deviceStates,
    }) !== null;
  }

  const clientVlan = inferEndpointVlan({ endpoint: clientDevice, topologyConnections, deviceStates });
  const serverVlan = getServerPoolVlan({
    serverDevice,
    serverState,
    poolGateway,
    poolStartIp,
    poolSubnetMask,
    isValidIpv4,
    topologyConnections,
    deviceStates,
  });
  return serverVlan !== null && clientVlan === serverVlan;
}
