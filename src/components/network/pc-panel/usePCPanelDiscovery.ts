'use client';

import { useMemo } from 'react';
import type { CanvasDevice } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { getWirelessSignalStrength, getDeviceWifiConfig, getApActiveSsids } from '@/lib/network/connectivity';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { errorHandler } from '@/lib/errors/errorHandler';

export interface UsePCPanelDiscoveryOptions {
  deviceFromTopology: CanvasDevice | undefined;
  deviceId: string;
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
  pcIP: string;
  pcSubnet: string;
  pcGateway: string;
  wifiEnabled: boolean;
  wifiSSID: string;
}

export function usePCPanelDiscovery({
  deviceFromTopology,
  deviceId,
  topologyDevices,
  topologyConnections,
  deviceStates,
  pcIP,
  pcSubnet,
  pcGateway,
  wifiEnabled,
  wifiSSID,
}: UsePCPanelDiscoveryOptions) {
  const wifiSignalStrength = useMemo(
    () => getWirelessSignalStrength(deviceFromTopology, topologyDevices, deviceStates),
    [deviceFromTopology, topologyDevices, deviceStates]
  );

  const iotDevices = useMemo(
    () => {
      const allIotDevices = topologyDevices.filter((d) => d.type === 'iot');
      // Filter IoT devices that are reachable from the PC
      return allIotDevices.filter(device => {
        // Check if device has an IP and is in the same subnet or reachable via gateway
        if (device.ip && pcIP && pcSubnet && pcGateway) {
          try {
            const a = pcIP.split('.').map(Number);
            const b = device.ip.split('.').map(Number);
            const m = pcSubnet.split('.').map(Number);
            if (a.length === 4 && b.length === 4 && m.length === 4) {
              let sameSubnet = true;
              for (let i = 0; i < 4; i++) {
                if ((a[i] & m[i]) !== (b[i] & m[i])) {
                  sameSubnet = false;
                  break;
                }
              }
              if (sameSubnet) return true;
            }
          } catch {
            // Invalid IP format, skip silently - this is expected for malformed IPs
            if (process.env.NODE_ENV === 'development') {
              errorHandler.logError(new Error('IP validation failed'), { deviceId: device.id, ip: device.ip, pcIP, pcSubnet });
            }
          }

          // Check if device is reachable via gateway
          if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(pcGateway.trim())) return true;
        }

        // Check if device is connected via WiFi to the same AP as PC
        if (device.wifi?.enabled && device.wifi?.ssid && wifiEnabled && wifiSSID) {
          if (device.wifi.ssid === wifiSSID) return true;
        }

        // Check if device is connected via cable to the PC or in the same network
        if (topologyConnections.some(c =>
          (c.sourceDeviceId === deviceId && c.targetDeviceId === device.id) ||
          (c.targetDeviceId === deviceId && c.sourceDeviceId === device.id)
        )) {
          return true;
        }

        // Check if device is connected to the same router/AP as PC
        const connectedToSameRouter = topologyConnections.some(c => {
          const otherDeviceId = c.sourceDeviceId === deviceId ? c.targetDeviceId : c.targetDeviceId === deviceId ? c.sourceDeviceId : null;
          if (!otherDeviceId) return false;

          const otherDevice = topologyDevices.find(d => d.id === otherDeviceId);
          if (!otherDevice || (otherDevice.type !== 'router' && otherDevice.type !== 'switchL2' && otherDevice.type !== 'switchL3')) return false;

          // Check if the router/switch is in the PC's network
          if (otherDevice.ip && pcIP && pcSubnet) {
            try {
              const a = pcIP.split('.').map(Number);
              const r = otherDevice.ip.split('.').map(Number);
              const m = pcSubnet.split('.').map(Number);
              if (a.length === 4 && r.length === 4 && m.length === 4) {
                let routerInSameSubnet = true;
                for (let i = 0; i < 4; i++) {
                  if ((a[i] & m[i]) !== (r[i] & m[i])) {
                    routerInSameSubnet = false;
                    break;
                  }
                }
                if (!routerInSameSubnet) return false;
              }
            } catch {
              // Invalid IP format, skip silently - expected for malformed IPs
              if (process.env.NODE_ENV === 'development') {
                errorHandler.logError(new Error('Router IP validation failed'), { deviceId: otherDevice.id, ip: otherDevice.ip, pcIP, pcSubnet });
              }
            }
          } else if (!otherDevice.ip) {
            // Router has no IP, cannot verify network - skip
            return false;
          }

          return topologyConnections.some(c2 =>
            (c2.sourceDeviceId === otherDeviceId && c2.targetDeviceId === device.id) ||
            (c2.targetDeviceId === otherDeviceId && c2.sourceDeviceId === device.id)
          );
        });

        if (connectedToSameRouter) return true;

        return false;
      });
    },
    [topologyDevices, pcIP, pcSubnet, pcGateway, wifiEnabled, wifiSSID, deviceId, topologyConnections]
  );

  // Scan for available APs and SSIDs in the network topology dynamically
  const availableSSIDs = useMemo(() => {
    const results: { ssid: string; deviceId: string; deviceName: string; channel?: string }[] = [];
    const addedKeys = new Set<string>();
    const safeStates = deviceStates ? ensureDeviceStatesMap(deviceStates) : undefined;

    topologyDevices.forEach((device) => {
      if (device.id === deviceId) return; // skip self
      if (device.type !== 'router' && device.type !== 'switchL2' && device.type !== 'switchL3' && device.type !== 'wlc') return;
      const state = safeStates?.get(device.id);
      const apWifi = getDeviceWifiConfig(device, safeStates);
      const activeSsids = getApActiveSsids(apWifi, state, safeStates);

      activeSsids.forEach(item => {
        if (!item.ssid) return;
        const uniqueKey = `${device.id}:${item.ssid}`;
        if (!addedKeys.has(uniqueKey)) {
          addedKeys.add(uniqueKey);
          results.push({
            ssid: item.ssid,
            deviceId: device.id,
            deviceName: device.name,
            channel: apWifi?.channel || '2.4GHz',
          });
        }
      });
    });

    return results;
  }, [deviceStates, deviceId, topologyDevices]);

  return { wifiSignalStrength, iotDevices, availableSSIDs };
}