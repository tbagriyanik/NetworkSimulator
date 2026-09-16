'use client';

import { useCallback } from 'react';
import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { checkConnectivity, getWirelessSignalStrength, getDeviceWifiConfig } from '@/lib/network/connectivity';
import { dispatchCapturedPackets } from '../../../utils/packetCapture';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { validateIP, validateIPv6 } from './pcPanelHelpers';
import {
  hasGatewayForTarget,
  normalizeLookupTarget,
  resolveDeviceNameTarget,
  resolveDomainWithDnsServices,
  findHttpServerByTarget,
  isDhcpPoolCompatibleForClient
} from './pcBrowser.utils';

export interface UsePCPanelNetworkSupportOptions {
  deviceId: string;
  deviceFromTopology: CanvasDevice | undefined;
  internalPcHostname: string;
  pcIP: string;
  pcSubnet: string;
  pcGateway: string;
  pcDNS: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: {
    sourceDeviceId: string;
    sourcePort: string;
    targetDeviceId: string;
    targetPort: string;
    cableType?: string;
    active?: boolean;
  }[];
  deviceStates: Map<string, SwitchState> | undefined;
  serviceDnsRecords: Array<{ domain: string; address: string }>;
  language: string;
}

export function usePCPanelNetworkSupport({
  deviceId,
  deviceFromTopology,
  internalPcHostname,
  pcIP,
  pcSubnet,
  pcGateway,
  pcDNS,
  topologyDevices,
  topologyConnections,
  deviceStates,
  serviceDnsRecords,
  language,
}: UsePCPanelNetworkSupportOptions) {
  const canReachTargetIp = useCallback((targetIp: string, options: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string } = { protocol: 'icmp' }) => {
    const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', options);

    // Global packet capture integration
    dispatchCapturedPackets(result.capturedPackets);

    return result.success;
  }, [deviceId, topologyDevices, topologyConnections, deviceStates, language]);

  const isValidIpv4 = useCallback((value: string) => validateIP(value), []);
  const isValidIpv6 = useCallback((value: string) => validateIPv6(value), []);

  const isDhcpPoolCompatibleForClientCallback = useCallback((
    poolGateway: string,
    poolStartIp: string,
    poolSubnetMask: string,
    serverDevice: CanvasDevice | undefined,
    serverState?: SwitchState
  ) => {
    return isDhcpPoolCompatibleForClient({
      poolGateway,
      poolStartIp,
      poolSubnetMask,
      serverDevice,
      serverState,
      clientDevice: deviceFromTopology,
      deviceStates,
      topologyConnections: topologyConnections as unknown as CanvasConnection[],
      isValidIpv4,
      getDeviceWifiConfig,
    });
  }, [deviceFromTopology, deviceStates, topologyConnections, isValidIpv4]);

  const deviceName = deviceFromTopology?.name;
  const isLoopbackTarget = useCallback((target: string): boolean => {
    const trimmed = target.trim().toLowerCase();
    return Boolean(
      trimmed === '127.0.0.1' ||
      trimmed === 'localhost' ||
      (deviceId && trimmed === deviceId.toLowerCase()) ||
      (deviceName && trimmed === deviceName.toLowerCase()) ||
      (internalPcHostname && trimmed === internalPcHostname.toLowerCase()) ||
      (pcIP && trimmed === pcIP.toLowerCase())
    );
  }, [deviceId, deviceName, internalPcHostname, pcIP]);

  const hasGatewayForTargetCallback = useCallback((targetIp: string) => {
    return hasGatewayForTarget({
      pcIP,
      targetIp,
      pcSubnet,
      pcGateway,
      isValidIpv4
    });
  }, [pcGateway, pcIP, pcSubnet, isValidIpv4]);

  const normalizeLookupTargetCallback = useCallback((raw: string) => {
    return normalizeLookupTarget(raw);
  }, []);

  const resolveDeviceNameTargetCallback = useCallback((raw: string) => {
    return resolveDeviceNameTarget({
      raw,
      internalPcHostname,
      deviceId,
      topologyDevices,
      deviceStates,
      isValidIpv4
    });
  }, [deviceId, deviceStates, internalPcHostname, isValidIpv4, topologyDevices]);

  const resolveDomainWithDnsServicesCallback = useCallback((domain: string) => {
    return resolveDomainWithDnsServices({
      domain,
      pcDNS,
      topologyDevices,
      deviceStates,
      canReachTargetIp,
      isValidIpv4,
      isValidIpv6
    });
  }, [canReachTargetIp, isValidIpv4, isValidIpv6, pcDNS, topologyDevices, deviceStates]);

  const getDnsRecordDisplay = useCallback((record: { domain: string; address: string }) => {
    const chain: string[] = [record.domain, record.address.trim()];
    const startAddress = record.address.trim().toLowerCase();
    const isIp = !startAddress || isValidIpv4(startAddress) || isValidIpv6(startAddress);
    const recordType = isIp
      ? (isValidIpv6(startAddress)
        ? (language === 'tr' ? 'AAAA KaydÄ±' : 'AAAA Record')
        : (language === 'tr' ? 'A KaydÄ±' : 'A Record'))
      : (language === 'tr' ? 'CNAME KaydÄ±' : 'CNAME Record');
    if (isIp) {
      return `${recordType}: ${chain.join(' -> ')}`;
    }

    const visited = new Set<string>([record.domain.toLowerCase(), startAddress]);
    let currentDomain = startAddress;

    for (let depth = 0; depth < 10; depth += 1) {
      const nextRecord = serviceDnsRecords.find((r) => r.domain.toLowerCase() === currentDomain);
      if (!nextRecord) break;

      const nextAddress = nextRecord.address.trim();
      if (!nextAddress) break;
      chain.push(nextAddress);

      const normalizedNext = nextAddress.toLowerCase();
      if (isValidIpv4(normalizedNext) || isValidIpv6(normalizedNext)) break;
      if (visited.has(normalizedNext)) break;

      visited.add(normalizedNext);
      currentDomain = normalizedNext;
    }

    return `${recordType}: ${chain.join(' -> ')}`;
  }, [isValidIpv4, isValidIpv6, language, serviceDnsRecords]);

  const findHttpServerByTargetCallback = useCallback((target: string) => {
    return findHttpServerByTarget({
      target,
      deviceId,
      topologyDevices,
      deviceStates,
      canReachTargetIp,
      resolveDomainWithDnsServices: resolveDomainWithDnsServicesCallback,
    });
  }, [canReachTargetIp, resolveDomainWithDnsServicesCallback, topologyDevices, deviceStates, deviceId]);

  const hasPhysicalPathToDevice = useCallback((targetDeviceId: string) => {
    if (!targetDeviceId || targetDeviceId === deviceId) return false;
    const sourceDevice = topologyDevices.find((d) => d.id === deviceId);
    const targetDevice = topologyDevices.find((d) => d.id === targetDeviceId);
    if (!sourceDevice || !targetDevice) return false;
    if (sourceDevice.status === 'offline' || targetDevice.status === 'offline') return false;

    // DHCP discover can also traverse an implicit Wi-Fi link.
    const sourceWifi = getDeviceWifiConfig(sourceDevice, deviceStates);
    const targetWifi = getDeviceWifiConfig(targetDevice, deviceStates);
    const safeStates = ensureDeviceStatesMap(deviceStates);
    const targetState = safeStates.get(targetDeviceId);

    const isTargetApMatching = (() => {
      if (!sourceWifi?.ssid) return false;
      const targetSsid = sourceWifi.ssid.toLowerCase();

      // Check standard AP wifi
      if (targetWifi?.enabled && targetWifi.mode === 'ap' && targetWifi.ssid && targetWifi.ssid.toLowerCase() === targetSsid) {
        return true;
      }

      // Check WLC centralized WLANs
      if (targetDevice.type === 'wlc' && targetState?.wlcWlans) {
        const wlan = Object.values(targetState.wlcWlans).find(
          w => w.status === 'enabled' && w.ssid?.toLowerCase() === targetSsid
        );
        if (wlan) return true;
      }

      return false;
    })();

    if (
      sourceDevice.type === 'pc' &&
      sourceWifi?.enabled &&
      (sourceWifi.mode === 'client' || sourceWifi.mode === 'sta') &&
      isTargetApMatching &&
      getWirelessSignalStrength(sourceDevice, topologyDevices, deviceStates) > 0
    ) {
      return true;
    }

    const queue: string[] = [deviceId];
    const visited = new Set<string>([deviceId]);

    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (current === targetDeviceId) return true;

      const neighbors = topologyConnections
        .filter((c) => c.active !== false && (c.sourceDeviceId === current || c.targetDeviceId === current))
        .map((c) => (c.sourceDeviceId === current ? c.targetDeviceId : c.sourceDeviceId));

      for (const next of neighbors) {
        if (visited.has(next)) continue;
        const nextDevice = topologyDevices.find((d) => d.id === next);
        if (!nextDevice || nextDevice.status === 'offline') continue;
        visited.add(next);
        queue.push(next);
      }
    }

    return false;
  }, [deviceId, topologyConnections, topologyDevices, deviceStates]);

  return {
    canReachTargetIp,
    isValidIpv4,
    isValidIpv6,
    isDhcpPoolCompatibleForClientCallback,
    isLoopbackTarget,
    hasGatewayForTargetCallback,
    normalizeLookupTargetCallback,
    resolveDeviceNameTargetCallback,
    resolveDomainWithDnsServicesCallback,
    getDnsRecordDisplay,
    findHttpServerByTargetCallback,
    hasPhysicalPathToDevice,
  };
}
