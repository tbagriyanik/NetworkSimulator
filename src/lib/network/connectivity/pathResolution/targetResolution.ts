import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { recalculateStp } from '@/lib/network/stp';
import { isExternalDomain, resolveHostname } from '@/lib/network/dns';
import { ConnectivityResult, CheckOptions } from './types';

export type ResolveTargetDeps = {
  sourceId: string;
  targetIp: string;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceMap: Map<string, CanvasDevice>;
  deviceStates?: Map<string, SwitchState>;
  safeDeviceStates: Map<string, SwitchState>;
  language: 'tr' | 'en';
  options?: CheckOptions;
};

export type TargetResolutionResult =
  | { type: 'error'; result: ConnectivityResult }
  | {
      type: 'ok';
      resolvedTargetIp: string;
      targetDevice: CanvasDevice;
      targetDeviceId: string | undefined;
      stpDeviceStates: Map<string, SwitchState>;
      ipMap: Map<string, string>;
    };

export function resolveTarget(deps: ResolveTargetDeps): TargetResolutionResult {
  const { sourceId, targetIp, devices, connections, deviceMap, deviceStates, safeDeviceStates, language, options } = deps;

  // 0. Resolve hostname to IP if necessary
  let resolvedTargetIp = targetIp;
  let isExternal = false;

  // Check if targetIp is a hostname (not an IP address)
  const isIp = (val: string) => {
    if (val.includes(':')) return true;
    const parts = val.split('.');
    return parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
  };
  const isDhcpBroadcast = targetIp === '255.255.255.255' && options?.protocol === 'udp' && (options.port === '67' || options.port === '68');
  if (!isIp(targetIp) && !isDhcpBroadcast) {
    // Check if source device has domain lookup disabled
    const sourceState = deviceStates?.get(sourceId);
    if (sourceState?.domainLookup === false) {
      const dnsServer = sourceState?.dnsServer || '255.255.255.255';
      return {
        type: 'error',
        result: { success: false, hops: [], hopIds: [], error: `% Unknown command or domain lookup disabled.\nTranslating "${targetIp}"...domain server (${dnsServer})\n% Unrecognized host or address, or protocol not running.` }
      };
    }

    // Check if this is an external domain
    isExternal = isExternalDomain(targetIp, devices, deviceStates);

    const resolvedIp = resolveHostname(targetIp, devices, deviceStates, deviceMap);
    if (!resolvedIp) {
      return { type: 'error', result: { success: false, hops: [], hopIds: [], error: 'Request timed out.' } };
    }
    resolvedTargetIp = resolvedIp;
  }

  // For external domains, simulate successful internet routing
  const hasCloudDevice = devices.some(d => d.type === 'cloud');
  if (isExternal && !hasCloudDevice) {
    const sourceDevice = deviceMap.get(sourceId);
    if (sourceDevice) {
      // Simulate internet routing path
      const hops = ['Internet Gateway', 'ISP Router', 'External Network'];
      const hopIds = [sourceId, 'internet-gateway', 'external-network'];

      return {
        type: 'error',
        result: {
          success: true,
          hops,
          hopIds,
          targetId: 'external-domain',
          error: undefined,
          portSecurityViolations: []
        }
      };
    }
  }

  // 1. Find target device by IP (supports both IPv4 and IPv6)
  // Recalculate STP states for accurate blocking
  let stpDeviceStates = safeDeviceStates;
  if (safeDeviceStates.size > 0) {
    stpDeviceStates = recalculateStp(safeDeviceStates, connections, { silent: true });
  }

  // BOLT: Pre-calculate an ipMap for O(1) device resolution
  const ipMap = new Map<string, string>(); // IP -> deviceId
  for (const d of devices) {
    if (d.ip) ipMap.set(d.ip, d.id);
    if (d.ipv6) ipMap.set(d.ipv6.toLowerCase(), d.id);
    if (d.type === 'cloud') {
      ipMap.set('8.8.8.8', d.id);
      ipMap.set('8.8.4.4', d.id);
      ipMap.set('1.1.1.1', d.id);
      ipMap.set('1.0.0.1', d.id);
      if (d.ip) ipMap.set(d.ip, d.id);
      else ipMap.set('203.0.113.1', d.id);
    }
  }

  if (deviceStates) {
    for (const [id, state] of deviceStates.entries()) {
      for (const portId in state.ports) {
        const port = state.ports[portId];
        if (port.ipAddress) ipMap.set(port.ipAddress, id);
        if (port.ipv6Address) ipMap.set(port.ipv6Address.toLowerCase(), id);
      }
      // Also map NAT global IPs to this router so that outside->inside traffic
      // (e.g. ping to a static NAT global address) can be path-resolved correctly.
      if (state.natStaticTranslations) {
        for (const entry of state.natStaticTranslations) {
          if (!ipMap.has(entry.globalIp)) {
            ipMap.set(entry.globalIp, id);
          }
        }
      }
    }

    // Inject FHRP virtual IPs: map virtual IP to the Active/Master device
    for (const [deviceId, state] of safeDeviceStates) {
      for (const portId in state.ports) {
        const port = state.ports[portId];

        // HSRP: Map virtual IP to Active device
        if (port.hsrp?.groups) {
          for (const [_groupId, group] of Object.entries(port.hsrp.groups)) {
            if (group.virtualIp && group.state === 'Active') {
              ipMap.set(group.virtualIp, deviceId);
            }
            if (group.ipv6VirtualIp && group.state === 'Active') {
              ipMap.set(group.ipv6VirtualIp.toLowerCase(), deviceId);
            }
          }
        }

        // VRRP: Map virtual IP to Master device
        if (port.vrrp?.groups) {
          for (const [_groupId, group] of Object.entries(port.vrrp.groups)) {
            if (group.virtualIp && group.state === 'Master') {
              ipMap.set(group.virtualIp, deviceId);
            }
          }
        }
      }
    }
  }

  // DHCP Discover/Request is broadcast; relay it to the first configured helper.
  if (isDhcpBroadcast && deviceStates) {
    // Find helper addresses on the source device's directly connected router
    const sourceDevice = deviceMap.get(sourceId);
    let helperIp: string | undefined;

    if (sourceDevice && (sourceDevice.type === 'pc' || sourceDevice.type === 'iot' || sourceDevice.type === 'mobile' || sourceDevice.type === 'printer')) {

      const sourceGatewayIp = sourceDevice.gateway;
      if (sourceGatewayIp) {
        for (const [deviceId, state] of safeDeviceStates) {
          const device = deviceMap.get(deviceId);
          if (device?.type === 'router' || device?.type === 'switchL3') {
            for (const portId in state.ports) {
              const port = state.ports[portId];
              if (port.ipAddress === sourceGatewayIp && port.helperAddresses && port.helperAddresses.length > 0 && !port.shutdown) {
                helperIp = port.helperAddresses[0];
                break;
              }
            }
            if (helperIp) break;
          }
        }
      }
      if (!helperIp) {
        for (const [deviceId, state] of safeDeviceStates) {
          const device = deviceMap.get(deviceId);
          if (device?.type === 'router' || device?.type === 'switchL3') {
            for (const portId in state.ports) {
              const port = state.ports[portId];
              if (port.helperAddresses && port.helperAddresses.length > 0 && !port.shutdown) {
                helperIp = port.helperAddresses[0];
                break;
              }
            }
            if (helperIp) break;
          }
        }
      }
    }

    // Fallback: search all devices for helper addresses if not found on gateway
    if (!helperIp) {
      for (const state of safeDeviceStates.values()) {
        for (const port of Object.values(state.ports || {})) {
          if (port.helperAddresses && port.helperAddresses.length > 0 && !port.shutdown) {
            helperIp = port.helperAddresses[0];
            break;
          }
        }
        if (helperIp) break;
      }
    }

    if (helperIp) resolvedTargetIp = helperIp;
  }
  let targetDeviceId = ipMap.get(resolvedTargetIp.toLowerCase());
  // HSRP/VRRP virtual IPs resolve to the elected active/master device.
  if (!targetDeviceId && deviceStates) {
    const virtualCandidates: Array<{ deviceId: string; priority: number; active: boolean; virtualMac?: string }> = [];
    for (const [deviceId, state] of safeDeviceStates) {
      Object.values(state.ports || {}).forEach(port => {
        Object.values(port.hsrp?.groups || {}).forEach(group => {
          if (group.virtualIp === resolvedTargetIp || group.ipv6VirtualIp?.toLowerCase() === resolvedTargetIp.toLowerCase()) {
            virtualCandidates.push({ deviceId, priority: group.priority ?? 100, active: group.state === 'Active', virtualMac: group.virtualMac });
          }
        });
        Object.values(port.vrrp?.groups || {}).forEach(group => {
          if (group.virtualIp === resolvedTargetIp) {
            virtualCandidates.push({ deviceId, priority: group.priority ?? 100, active: group.state === 'Master', virtualMac: group.virtualMac });
          }
        });
      });
    }
    targetDeviceId = virtualCandidates.sort((a, b) => Number(b.active) - Number(a.active) || b.priority - a.priority)[0]?.deviceId;
  }
  let targetDevice = targetDeviceId ? deviceMap.get(targetDeviceId) : undefined;

  // If the resolved target is a NAT global IP, the actual end device is the
  // mapped local IP. Override targetDevice so that BFS finds the full path
  // Server -> R1 -> PC-1, and the NAT outside->inside translation fires at R1.
  if (targetDeviceId && deviceStates) {
    const routerState = deviceStates.get(targetDeviceId);
    const staticEntry = routerState?.natStaticTranslations?.find(
      t => t.globalIp === resolvedTargetIp
    );
    if (staticEntry) {
      // Find the actual end device (the one with localIp)
      const realDevId = (() => {
        for (const d of devices) {
          if (d.ip === staticEntry.localIp) return d.id;
        }
        if (deviceStates) {
          for (const [id, s] of deviceStates.entries()) {
            for (const portId in s.ports) {
              if (s.ports[portId].ipAddress === staticEntry.localIp) return id;
            }
          }
        }
        return null;
      })();
      if (realDevId) {
        const realDev = deviceMap.get(realDevId);
        if (realDev) {
          targetDevice = realDev;
          // Also update resolvedTargetIp so isDirectSubnet / gateway routing
          // uses the real inner address, not the NAT global address.
          resolvedTargetIp = staticEntry.localIp;
        }
      }
    }
  }

  if (!targetDevice) {
    const isPublicCloudIp = (ip: string, cDev?: CanvasDevice) => {
      const lower = ip.toLowerCase();
      if (['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1'].includes(lower)) return true;
      if (cDev?.ip && cDev.ip.toLowerCase() === lower) return true;
      return false;
    };
    const cloudDev = devices.find(d => d.type === 'cloud');
    if (cloudDev && cloudDev.status !== 'offline' && isPublicCloudIp(resolvedTargetIp, cloudDev)) {
      const isCloudConn = connections.some(c => (c.sourceDeviceId === cloudDev.id || c.targetDeviceId === cloudDev.id) && c.active !== false);
      if (!isCloudConn) {
        return {
          type: 'error',
          result: {
            success: false,
            hops: [],
            hopIds: [],
            targetId: cloudDev.id,
            error: language === 'tr' ? 'Bulut (Cloud) cihazı ağa bağlı değil.' : 'Cloud device is not connected to the network.'
          }
        };
      }
      targetDeviceId = cloudDev.id;
      targetDevice = cloudDev;
    } else {
      return { type: 'error', result: { success: false, hops: [], hopIds: [], error: 'Request timed out.' } };
    }
  }

  return { type: 'ok', resolvedTargetIp, targetDevice, targetDeviceId, stpDeviceStates, ipMap };
}

