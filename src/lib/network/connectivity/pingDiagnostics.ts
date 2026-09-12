import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { resolveHostname } from '@/lib/network/dns';
import { buildConnectionIndex } from '@/lib/network/connectionIndex';
import {
  getPrimaryDeviceIp,
  getSubnetForDeviceIp,
  isIpInSubnet,
  isPortShutdown,
} from '@/lib/network/connectivity.utils';
import { checkConnectivity } from './pathResolution/algorithm';

export function checkDeviceConnectivity(
  sourceId: string,
  targetId: string,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>,
  options?: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string }
): { success: boolean; hops: string[]; hopIds: string[]; targetId?: string; error?: string; capturedPackets?: Array<{ connectionId: string; sourceIp: string; targetIp: string; protocol: string; length: number; info: string }> } {
  // BOLT: Use pre-resolved safeDeviceStates
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const deviceMap = new Map<string, CanvasDevice>();
  for (const d of devices) {
    deviceMap.set(d.id, d);
  }
  const sourceDevice = deviceMap.get(sourceId);
  const targetDevice = deviceMap.get(targetId);

  if (!sourceDevice || !targetDevice) {
    return { success: false, hops: [], hopIds: [], error: 'Destination host unreachable.' };
  }

  let resolvedTargetIp = targetDevice.ip;
  // BOLT: Use pre-resolved safeDeviceStates
  const sourcePrimaryIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates);
  const sourcePrimarySubnet = getSubnetForDeviceIp(sourceId, sourcePrimaryIp, devices, safeDeviceStates) || '255.255.255.0';
  if (!resolvedTargetIp && deviceStates) {
    // BOLT: Use pre-resolved safeDeviceStates
    const targetState = safeDeviceStates.get(targetId);
    if (targetState) {
      for (const pId in targetState.ports) {
        if (targetState.ports[pId].ipAddress) {
          if (sourcePrimaryIp) {
            if (isIpInSubnet(sourcePrimaryIp, targetState.ports[pId].ipAddress, sourcePrimarySubnet)) {
              resolvedTargetIp = targetState.ports[pId].ipAddress;
              break;
            }
          }
          if (!resolvedTargetIp) resolvedTargetIp = targetState.ports[pId].ipAddress;
        }
      }
    }
  }
  const targetIp = resolvedTargetIp || '';
  if (!targetIp) {
    return { success: false, hops: [], hopIds: [], error: 'Request timed out.' };
  }

  // BOLT: Pass pre-resolved safeDeviceStates
  return checkConnectivity(sourceId, targetIp, devices, connections, safeDeviceStates, undefined, options);
}

/**
 * Detailed ping diagnostics - checks all conditions and returns specific failure reasons
 */
export function getPingDiagnostics(
  sourceId: string,
  targetIp: string,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>,
  language: 'tr' | 'en' = 'tr',
  options?: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string }
): { success: boolean; reasons: string[] } {
  // BOLT: Resolve safeDeviceStates once
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const reasons: string[] = [];
  const deviceMap = new Map<string, CanvasDevice>();
  const ipMap = new Map<string, string>(); // IP -> deviceId

  for (const d of devices) {
    deviceMap.set(d.id, d);
    if (d.ip) ipMap.set(d.ip, d.id);
    if (d.ipv6) ipMap.set(d.ipv6.toLowerCase(), d.id);
  }

  if (deviceStates) {
    for (const [id, state] of deviceStates.entries()) {
      for (const portId in state.ports) {
        const port = state.ports[portId];
        if (port.ipAddress) ipMap.set(port.ipAddress, id);
        if (port.ipv6Address) ipMap.set(port.ipv6Address.toLowerCase(), id);
      }
    }
  }

  const sourceDevice = deviceMap.get(sourceId);

  // Resolve hostname to IP if necessary
  let resolvedTargetIp = targetIp;
  const isIpAddress = (val: string) => {
    if (val.includes(':')) return true;
    const parts = val.split('.');
    return parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
  };
  if (!isIpAddress(targetIp)) {
    const resolvedIp = resolveHostname(targetIp, devices, deviceStates, deviceMap);
    if (!resolvedIp) {
      reasons.push('Hostname could not be resolved');
      return { success: false, reasons };
    }
    resolvedTargetIp = resolvedIp;
  }

  const isTargetIpv6 = resolvedTargetIp.includes(':');
  const targetDeviceId = ipMap.get(resolvedTargetIp.toLowerCase());
  const initialTargetDevice = targetDeviceId ? deviceMap.get(targetDeviceId) : undefined;

  // 1. Check source device exists and is powered on
  if (!sourceDevice) {
    reasons.push('Kaynak cihaz bulunamadı');
    return { success: false, reasons };
  }

  if (sourceDevice.status === 'offline') {
    reasons.push('Kaynak cihaz kapalı (offline)');
    return { success: false, reasons };
  }

  // 2. Check source has IP address (IPv4 or IPv6)
  let sourceIp = sourceDevice.ip || sourceDevice.ipv6 || '';
  if (!sourceIp && deviceStates) {
    // BOLT: Use pre-resolved safeDeviceStates
    const state = safeDeviceStates.get(sourceId);
    if (state) {
      for (const pId in state.ports) {
        const port = state.ports[pId];
        const addr = isTargetIpv6 ? (port.ipv6Address || port.ipAddress) : (port.ipAddress || port.ipv6Address);
        if (addr) { sourceIp = addr; break; }
      }
    }
  }
  if (!sourceIp) {
    reasons.push('Kaynak cihazın IP adresi yok');
    return { success: false, reasons };
  }

  // 3. Check target device exists
  let targetDevice = initialTargetDevice;
  if (!targetDevice) {
    const cloudDev = devices.find(d => d.type === 'cloud');
    if (cloudDev && (resolvedTargetIp === '8.8.8.8' || resolvedTargetIp === '8.8.4.4' || resolvedTargetIp === '1.1.1.1' || resolvedTargetIp === '1.0.0.1')) {
      targetDevice = cloudDev;
    } else {
      reasons.push('Hedef IP adresi bulunamadı');
      return { success: false, reasons };
    }
  }

  if (targetDevice.status === 'offline') {
    reasons.push('Hedef cihaz kapalı (offline)');
    return { success: false, reasons };
  }

  // 4. Check target has IP address
  if (!resolvedTargetIp) {
    reasons.push('Hedef cihazın IP adresi yok');
    return { success: false, reasons };
  }

  // 5. Check subnet compatibility (IPv4 only — IPv6 routing handled separately)
  let isSourceInSameSubnet = true;
  let isTargetInSameSubnet = true;
  if (!isTargetIpv6 && targetDevice.type !== 'cloud') {
    const sourceSubnet = sourceDevice.subnet || '255.255.255.0';
    const targetSubnet = targetDevice.subnet || '255.255.255.0';
    isSourceInSameSubnet = isIpInSubnet(sourceIp, resolvedTargetIp, sourceSubnet);
    isTargetInSameSubnet = isIpInSubnet(resolvedTargetIp, sourceIp, targetSubnet);

    const hasRouterInTopology = devices.some(d => d.type === 'router' || d.type === 'switchL3');
    if (!isSourceInSameSubnet && !isTargetInSameSubnet && !hasRouterInTopology) {
      reasons.push(language === 'tr'
        ? `Subnet uyumsuzluğu: Kaynak ${sourceIp}/${sourceSubnet}, Hedef ${resolvedTargetIp}/${targetSubnet}. Router ile routing gerekli.`
        : `Subnet mismatch: Source ${sourceIp}/${sourceSubnet}, Target ${resolvedTargetIp}/${targetSubnet}. Router required for routing.`);
      return { success: false, reasons };
    }

    // 6. Check gateway configuration if different subnets
    if (!isSourceInSameSubnet) {
      if (!sourceDevice.gateway) {
        reasons.push(language === 'tr' ? "Kaynak cihazın varsayılan ağ geçidi (Default Gateway) yok" : "Source device has no default gateway configured");
      } else if (!isIpInSubnet(sourceIp, sourceDevice.gateway, sourceSubnet)) {
        reasons.push(language === 'tr' ? "Kaynak cihazın varsayılan ağ geçidi aynı ağ bloğunda değil" : "Source default gateway is not in the same subnet");
      }
    }

    if (!isTargetInSameSubnet) {
      if (!targetDevice.gateway) {
        reasons.push(language === 'tr' ? "Hedef cihazın varsayılan ağ geçidi (Default Gateway) yok" : "Target device has no default gateway configured");
      } else if (!isIpInSubnet(resolvedTargetIp, targetDevice.gateway, targetSubnet)) {
        reasons.push(language === 'tr' ? "Hedef cihazın varsayılan ağ geçidi aynı ağ bloğunda değil" : "Target default gateway is not in the same subnet");
      }
    }
  }

  // 7. Check physical connectivity
  // BOLT: Use pre-resolved safeDeviceStates
  const result = checkConnectivity(sourceId, resolvedTargetIp, devices, connections, safeDeviceStates, language, options);
  if (!result.success) {
    if (result.error) {
      reasons.push(result.error);
    } else {
      reasons.push('Fiziksel bağlantı yok');
    }
    return { success: false, reasons };
  }

  // 8. Check interfaces are up
  // BOLT: Build connection index for O(1) device connection lookups
  const connectionIndex = buildConnectionIndex(connections);
  const sourceConn = connectionIndex.byDevice.get(sourceId)?.[0];
  if (sourceConn) {
    const sourcePortId = sourceConn.sourceDeviceId === sourceId ? sourceConn.sourcePort : sourceConn.targetPort;
    // BOLT: Use pre-resolved safeDeviceStates
    if (isPortShutdown(sourceId, sourcePortId, devices, safeDeviceStates)) {
      reasons.push(`Kaynak interface kapalı: ${sourcePortId}`);
      return { success: false, reasons };
    }
  }

  const targetConn = connectionIndex.byDevice.get(targetDevice.id)?.[0];
  if (targetConn) {
    const targetPortId = targetConn.sourceDeviceId === targetDevice.id ? targetConn.targetPort : targetConn.sourcePort;
    // BOLT: Use pre-resolved safeDeviceStates
    if (isPortShutdown(targetDevice.id, targetPortId, devices, safeDeviceStates)) {
      reasons.push(`Hedef interface kapalı: ${targetPortId}`);
      return { success: false, reasons };
    }
  }

  // 9. Check VLAN configuration - Only if not already routed
  if (sourceDevice.vlan && targetDevice.vlan && sourceDevice.vlan !== targetDevice.vlan) {
    // Check if there's a router in path (ROAS)
    let hasL3RouterInPath = false;
    for (const pathDeviceId of result.hopIds) {
      const pathDevice = deviceMap.get(pathDeviceId);
      // BOLT: Use pre-resolved safeDeviceStates
      const pathState = safeDeviceStates.get(pathDeviceId);
      if ((pathDevice?.type === 'router' || pathDevice?.type === 'switchL3') && pathState?.ipRouting) {
        hasL3RouterInPath = true;
        break;
      }
    }

    if (!hasL3RouterInPath) {
      reasons.push(`VLAN uyumsuzluğu: Kaynak VLAN ${sourceDevice.vlan}, Hedef VLAN ${targetDevice.vlan}`);
      return { success: false, reasons };
    }
  }

  // 10. Check routing if different subnets (only when routing is relevant)
  if (!isTargetIpv6 && !isSourceInSameSubnet) {
    const sourceDeviceObj = sourceDevice;
    const isSourceL3Capable = sourceDeviceObj?.type === 'router' || sourceDeviceObj?.type === 'switchL3';

    // If source is a router/L3-switch, it must have ip routing enabled
    if (isSourceL3Capable) {
      // BOLT: Use pre-resolved safeDeviceStates
      const sourceState = safeDeviceStates.get(sourceId);
      if (!sourceState?.ipRouting) {
        reasons.push(language === 'tr' ? 'Kaynak cihazda IP routing etkin değil' : 'IP routing is not enabled on the source device');
        return { success: false, reasons };
      }
    }

    // Check if there's a router or L3 switch in path (already calculated in section 9)
    let hasL3RouterInPath = false;
    for (const pathDeviceId of result.hopIds) {
      const pathDevice = deviceMap.get(pathDeviceId);
      // BOLT: Use pre-resolved safeDeviceStates
      const pathState = safeDeviceStates.get(pathDeviceId);
      if ((pathDevice?.type === 'router' || pathDevice?.type === 'switchL3') && pathState?.ipRouting) {
        hasL3RouterInPath = true;
        break;
      }
    }

    // If source is not a router, there must be a router/L3-switch in the path
    if (!hasL3RouterInPath && !isSourceL3Capable) {
      reasons.push(language === 'tr' ? 'Farklı subnetler arası iletişim için bir router/L3-switch gereklidir' : 'A router/L3-switch is required for communication between different subnets');
      return { success: false, reasons };
    }
  }

  return { success: true, reasons };
}
