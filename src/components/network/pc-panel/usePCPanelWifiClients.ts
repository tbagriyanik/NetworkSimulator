'use client';

import { useCallback } from 'react';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { getDeviceWifiConfig, getDeviceMacAddress, wifiMacFilterMatches } from '@/lib/network/connectivity';

export interface UsePCPanelWifiClientsOptions {
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
}

export function usePCPanelWifiClients({
  topologyDevices,
  topologyConnections,
  deviceStates,
}: UsePCPanelWifiClientsOptions) {
  // Get connected wireless & IoT devices for a router/AP
  const getConnectedIotDevices = useCallback((routerId: string) => {
    const routerDevice = topologyDevices.find(d => d.id === routerId);
    if (!routerDevice) return [];

    const routerSsids = new Map<string, { security: string; password?: string }>();
    if (routerDevice.wifi?.ssid) {
      routerSsids.set(routerDevice.wifi.ssid.toLowerCase(), {
        security: routerDevice.wifi.security || 'open',
        password: routerDevice.wifi.password,
      });
    }
    if (Array.isArray(routerDevice.wifi?.ssids)) {
      for (const s of routerDevice.wifi.ssids) {
        if (s.enabled && s.ssid) {
          routerSsids.set(s.ssid.toLowerCase(), {
            security: s.security || 'open',
            password: s.password,
          });
        }
      }
    }
    const routerState = deviceStates?.get(routerId);
    if (routerState?.wlcWlans) {
      for (const wlan of Object.values(routerState.wlcWlans)) {
        if (wlan.status === 'enabled' && wlan.ssid) {
          routerSsids.set(wlan.ssid.toLowerCase(), {
            security: wlan.security || 'open',
            password: wlan.password,
          });
        }
      }
    }

    return topologyDevices
      .filter(d => {
        if (d.id === routerId) return false;
        if (d.type !== 'iot' && d.type !== 'pc' && d.type !== 'mobile' && d.type !== 'printer') return false;

        let isWifiConnected = false;
        const clientWifi = getDeviceWifiConfig(d, deviceStates);
        // Only client/STA radios are wireless clients. APs and WLCs can
        // advertise the same SSID but must never appear in this list.
        const isWirelessClient = clientWifi?.mode === 'client' || clientWifi?.mode === 'sta';
        if (isWirelessClient && clientWifi.enabled && !clientWifi.powerDisabled && clientWifi.ssid) {
          const clientSsidLower = clientWifi.ssid.toLowerCase();
          const matchedSsid = routerSsids.get(clientSsidLower);
          if (matchedSsid) {
            const clientSec = (clientWifi.security || 'open').toLowerCase();
            const apSec = (matchedSsid.security || 'open').toLowerCase();
            if (clientSec === apSec && (apSec === 'open' || matchedSsid.password === clientWifi.password)) {
              isWifiConnected = true;
            }
          }
        }
        if (isWirelessClient && (clientWifi?.bssid === routerId || d.wifi?.bssid === routerId)) {
          isWifiConnected = true;
        }

        if (isWifiConnected) {
          const routerApWifi = getDeviceWifiConfig(routerDevice, deviceStates);
          if (!wifiMacFilterMatches(routerApWifi, d, deviceStates)) {
            isWifiConnected = false;
          }
        }

        const isWiredConnected = topologyConnections.some(c =>
          (c.sourceDeviceId === routerId && c.targetDeviceId === d.id) ||
          (c.targetDeviceId === routerId && c.sourceDeviceId === d.id)
        );

        return isWifiConnected || isWiredConnected;
      })
      .map(d => {
        const isWiredConnected = topologyConnections.some(c =>
          (c.sourceDeviceId === routerId && c.targetDeviceId === d.id) ||
          (c.targetDeviceId === routerId && c.sourceDeviceId === d.id)
        );

        let deviceIp = d.ip;
        if (isWiredConnected && !deviceIp) {
          const routerIp = routerDevice?.ip || '192.168.1.1';
          const baseIpParts = routerIp.split('.');
          const usedIps = new Set<string>();
          topologyDevices.forEach(td => {
            if (td.ip && td.ip.startsWith(baseIpParts[0] + '.' + baseIpParts[1] + '.' + baseIpParts[2])) {
              usedIps.add(td.ip);
            }
          });
          for (let i = 100; i <= 254; i++) {
            const testIp = `${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.${i}`;
            if (!usedIps.has(testIp)) {
              deviceIp = testIp;
              break;
            }
          }
          if (!deviceIp) deviceIp = `${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.150`;

          // Assign IP asynchronously to avoid state mutation during render
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('update-topology-device-config', {
              detail: {
                deviceId: d.id,
                config: {
                  ip: deviceIp,
                  ipConfigMode: 'dhcp',
                  gateway: routerIp,
                  subnet: routerDevice?.subnet || '255.255.255.0',
                  dns: routerIp,
                },
              },
            }));
          }, 0);
        }

        const clientWifi = getDeviceWifiConfig(d, deviceStates);
        const routerWifi = getDeviceWifiConfig(routerDevice, deviceStates);
        const macAddr = getDeviceMacAddress(d, deviceStates) || d.macAddress || d.ports?.[0]?.macAddress || `00:11:22:${d.id.slice(-2)}:33:44`;

        // A device is "connected" if it is physically wired to the router OR it
        // is actually associated to this AP's SSID (wifi enabled + matching
        // SSID/security). A client whose wireless link was cut (wifi disabled
        // or ssid cleared) must not remain reported as connected.
        const clientMode = clientWifi?.mode || d.wifi?.mode;
        const isWirelessClient = clientMode === 'client' || clientMode === 'sta';
        let isAssociated = false;
        const clientSsid = clientWifi?.ssid || '';
        if (isWirelessClient && clientWifi?.enabled && clientSsid) {
          const matchedSsid = routerSsids.get(clientSsid.toLowerCase());
          if (matchedSsid) {
            const clientSec = (clientWifi.security || 'open').toLowerCase();
            const apSec = (matchedSsid.security || 'open').toLowerCase();
            if (clientSec === apSec && (apSec === 'open' || matchedSsid.password === clientWifi.password)) {
              const routerApWifi = routerWifi;
              if (wifiMacFilterMatches(routerApWifi, d, deviceStates)) {
                isAssociated = true;
              }
            }
          }
        }
        if (isWirelessClient && (clientWifi?.bssid === routerId || d.wifi?.bssid === routerId)) {
          isAssociated = true;
        }

        let signalPercent = 100;
        if (!isWiredConnected) {
          const dx = (d.x || 0) - (routerDevice.x || 0);
          const dy = (d.y || 0) - (routerDevice.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) signalPercent = 100;
          else if (dist < 250) signalPercent = 85;
          else if (dist < 350) signalPercent = 70;
          else if (dist < 450) signalPercent = 50;
          else if (dist < 550) signalPercent = 30;
          else signalPercent = 15;
        }
        const rssiDbm = isWiredConnected ? -30 : Math.min(-30, Math.max(-95, Math.round(-95 + (signalPercent * 0.65))));

        return {
          id: d.id,
          name: d.name,
          sensorType: (d.iot?.sensorType || (d.type === 'pc' ? 'Laptop/PC' : d.type)) as 'temperature' | 'sound' | 'motion' | 'humidity' | 'light',
          connected: !!(isWiredConnected || isAssociated),
          ip: deviceIp || d.ip,
          mac: macAddr,
          ssid: d.status !== 'offline' ? (clientSsid || routerDevice.wifi?.ssid || 'WiFi') : (clientSsid || 'WiFi'),
          isWired: isWiredConnected,
          signalPercent,
          rssiDbm,
        };
      });
  }, [topologyDevices, topologyConnections, deviceStates]);

  // Get available IoT devices that can be connected (not connected to this AP)
  const getAvailableIotDevices = useCallback((routerId: string) => {
    const routerDevice = topologyDevices.find(d => d.id === routerId);
    if (!routerDevice) return [];

    const routerSsid = routerDevice.wifi?.ssid || '';

    return topologyDevices
      .filter(d => {
        if (d.type !== 'iot') return false;

        const isWiredConnected = topologyConnections.some(c =>
          (c.sourceDeviceId === routerId && c.targetDeviceId === d.id) ||
          (c.targetDeviceId === routerId && c.sourceDeviceId === d.id)
        );

        if (isWiredConnected) return false;

        if (!routerSsid) return true;
        const isConnectedToThisAp = d.wifi?.bssid === routerId || d.wifi?.ssid === routerSsid;
        return !isConnectedToThisAp;
      })
      .map(d => ({
        id: d.id,
        name: d.name,
        sensorType: d.iot?.sensorType || 'temperature',
        currentSsid: d.wifi?.ssid || undefined,
      }));
  }, [topologyDevices, topologyConnections]);

  return { getConnectedIotDevices, getAvailableIotDevices };
}
