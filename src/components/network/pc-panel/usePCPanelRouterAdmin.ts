'use client';

import { useEffect } from 'react';
import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { OutputLine } from './PCPanel.types';
import { generateRandomLinkLocalIpv4 } from '@/lib/network/linkLocal';
import { generateRouterAdminPage, isRouterDevice } from '@/components/network/WifiControlPanel';
import { logger } from '@/lib/logger';
import { useAppStore } from '@/lib/store/appStore';
import { getDeviceWifiConfig } from '@/lib/network/wireless';
import { setRouterAuthenticated, setIotPanelAuthenticated } from '@/lib/network/adminSessionManager';

interface ConnectedIoTDevice {
  id: string;
  name: string;
  sensorType: 'temperature' | 'sound' | 'motion' | 'humidity' | 'light' | string;
  connected: boolean;
  ip: string;
  isWired: boolean;
  mac?: string;
  ssid?: string;
}

interface AvailableIoTDevice {
  id: string;
  name: string;
  sensorType: 'temperature' | 'sound' | 'motion' | 'humidity' | 'light';
  currentSsid: string | undefined;
}

interface UsePCPanelRouterAdminOptions {
  language: string;
  httpAppDeviceId: string | null;
  setHttpAppDeviceId: (v: string | null) => void;
  setHttpAppContent: (v: string | null) => void;
  routerActiveTabRef: React.RefObject<string | undefined>;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState> | undefined;
  getConnectedIotDevices: (routerId: string) => ConnectedIoTDevice[];
  getAvailableIotDevices: (routerId: string) => AvailableIoTDevice[];
  openWebPage: (url: string) => void;
  addLocalOutput: (type: OutputLine['type'], content: string) => void;
  onDeleteDevice?: (id: string) => void;
}

export function usePCPanelRouterAdmin({
  language,
  httpAppDeviceId,
  setHttpAppDeviceId,
  setHttpAppContent,
  routerActiveTabRef,
  topologyDevices,
  topologyConnections,
  deviceStates,
  getConnectedIotDevices,
  getAvailableIotDevices,
  openWebPage,
  addLocalOutput,
  onDeleteDevice,
}: UsePCPanelRouterAdminOptions) {

  useEffect(() => {
    const handleRouterAdminMessage = (event: MessageEvent) => {
      // Security: Validate origin to prevent cross-site scripting or data injection from malicious frames.
      // We allow window.location.origin for same-origin messages and 'null' for local srcdoc iframes.
      if (event.origin !== window.location.origin && event.origin !== 'null') {
        return;
      }

      const data = event.data;

      if (!data) {
        return;
      }

      if (data.type === 'router-admin-toast') {
        const payload = data.payload || {};
        logger.debug('[router-admin-toast]', payload.message || '');
        return;
      }

      if (data.type === 'router-admin-auth-success') {
        if (data.deviceId) setRouterAuthenticated(data.deviceId, true);
        return;
      }

      if (data.type === 'router-admin-logout') {
        if (data.deviceId) setRouterAuthenticated(data.deviceId, false);
        return;
      }

      if (data.type === 'iot-panel-auth-success') {
        setIotPanelAuthenticated(true);
        return;
      }

      if (data.type === 'iot-panel-logout') {
        setIotPanelAuthenticated(false);
        return;
      }

      // Track which tab is active in the router admin page
      if (data.type === 'router-admin-tab-change') {
        routerActiveTabRef.current = data.tab || 'wireless';
        return;
      }

      // For WiFi save operations, require httpAppDeviceId match
      const isRouterSpecificMessage = data.type === 'router-admin-save-wifi';
      if (isRouterSpecificMessage && httpAppDeviceId && data.deviceId && data.deviceId !== httpAppDeviceId) {
        return;
      }

      // IoT messages are always accepted (deviceId in payload)


      const allocateIotIpConfig = (routerDeviceId: string, excludeDeviceId?: string) => {
        const routerDevice = topologyDevices.find((d) => d.id === routerDeviceId);
        const routerState = routerDeviceId ? deviceStates?.get(routerDeviceId) : undefined;
        let routerIp = routerDevice?.ip || '';
        let routerSubnet = routerDevice?.subnet || '';

        // Prefer the actual configured interface IP/subnet when the topology card is stale.
        if (routerState?.ports) {
          for (const port of Object.values(routerState.ports)) {
            if (!port.shutdown && port.ipAddress) {
              routerIp = port.ipAddress;
              routerSubnet = port.subnetMask || routerSubnet;
              break;
            }
          }
        }

        if (!routerIp) routerIp = '192.168.1.1';
        if (!routerSubnet) routerSubnet = '255.255.255.0';
        const baseIpParts = routerIp.split('.');
        let newIp = '';

        const usedIps = new Set<string>();
        topologyDevices.forEach((d) => {
          if (d.id === excludeDeviceId) return;
          if (d.ip && d.ip.startsWith(baseIpParts[0] + '.' + baseIpParts[1] + '.' + baseIpParts[2])) {
            usedIps.add(d.ip);
          }
        });

        for (let i = 100; i <= 254; i++) {
          const testIp = `${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.${i}`;
          if (!usedIps.has(testIp)) {
            newIp = testIp;
            break;
          }
        }

        if (!newIp) {
          for (let i = 2; i < 100; i++) {
            const testIp = `${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.${i}`;
            if (!usedIps.has(testIp) && testIp !== routerIp) {
              newIp = testIp;
              break;
            }
          }
        }

        if (!newIp) {
          const fallbackUsedIps = new Set<string>();
          topologyDevices.forEach((d) => {
            if (d.id !== excludeDeviceId && d.ip) fallbackUsedIps.add(d.ip);
          });
          return {
            ip: generateRandomLinkLocalIpv4(fallbackUsedIps),
            gateway: '0.0.0.0',
            subnet: '255.255.0.0',
            dns: '0.0.0.0',
            source: 'apipa' as const,
          };
        }

        return {
          ip: newIp,
          gateway: routerIp,
          subnet: routerSubnet,
          dns: routerIp,
          source: 'dhcp' as const,
        };
      };

      // Handle WiFi settings save
      if (data.type === 'router-admin-save-wifi') {
        const device = topologyDevices.find((d) => d.id === httpAppDeviceId);
        const payload = data.payload || {};
        const nextWifi = {
          enabled: Boolean(payload.enabled),
          ssid: String(payload.ssid || ''),
          security: payload.security || 'open',
          password: String(payload.password || ''),
          channel: payload.channel || '2.4GHz',
          mode: payload.mode || 'ap',
          hidden: Boolean(payload.hidden),
          maxClients: Number(payload.maxClients || 32),
          macFilterEnabled: Boolean(payload.macFilterEnabled),
          macFilterMode: (payload.macFilterMode === 'deny' ? 'deny' : 'allow') as 'allow' | 'deny',
          macFilterList: Array.isArray(payload.macFilterList) ? payload.macFilterList : [],
          ssids: Array.isArray(payload.ssids) ? payload.ssids : (device?.wifi?.ssids || []),
          bssid: device?.wifi?.bssid || '',
        };

        // Changing the AP channel drops every associated wireless client.
        // Clear the client association as well as its DHCP data so the WLC
        // page cannot continue to show stale connected devices.
        const previousWifi = getDeviceWifiConfig(device, deviceStates);
        const channelChanged = Boolean(previousWifi?.channel && previousWifi.channel !== nextWifi.channel);
        if (channelChanged && httpAppDeviceId) {
          getConnectedIotDevices(httpAppDeviceId).forEach((client) => {
            const clientDevice = topologyDevices.find((candidate) => candidate.id === client.id);
            const disconnectedWifi = {
              enabled: false,
              ssid: '',
              security: 'open' as const,
              password: '',
              channel: '2.4GHz' as const,
              mode: 'client' as const,
              bssid: undefined,
            };
            window.dispatchEvent(new CustomEvent('update-topology-device-config', {
              detail: {
                deviceId: client.id,
                config: {
                  wifi: disconnectedWifi,
                  ip: '',
                  subnet: '',
                  gateway: '',
                  ports: clientDevice?.ports?.map((port) => port.id === 'wlan0'
                    ? { ...port, status: 'disconnected' as const, ipAddress: undefined, subnetMask: undefined, wifi: disconnectedWifi }
                    : port),
                },
              },
            }));
          });
        }

        const nextDhcp = payload.dhcp ? {
          enabled: Boolean(payload.dhcp.enabled),
          pools: [
            {
              poolName: 'default-pool',
              defaultGateway: String(payload.dhcp.gateway || '192.168.1.1'),
              dnsServer: String(payload.dhcp.dns || '192.168.1.1'),
              startIp: String(payload.dhcp.startIp || '192.168.1.100'),
              subnetMask: String(payload.dhcp.subnet || '255.255.255.0'),
              maxUsers: Number(payload.dhcp.leaseTime || 24),
            }
          ]
        } : undefined;

        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: httpAppDeviceId,
            config: {
              wifi: nextWifi,
              ...(nextDhcp ? { services: { ...device?.services, dhcp: nextDhcp } } : {}),
            },
          },
        }));

        if (httpAppDeviceId) {
          const targetDevice = topologyDevices.find((d) => d.id === httpAppDeviceId);
          if (targetDevice && isRouterDevice(targetDevice)) {
            const runtimeState = deviceStates?.get(httpAppDeviceId);
            const connectedIot = getConnectedIotDevices(httpAppDeviceId);
            const availableIot = getAvailableIotDevices(httpAppDeviceId);
            const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot, undefined, undefined, routerActiveTabRef.current);
            setHttpAppContent(refreshed);
          }
        }

        addLocalOutput(
          'success',
          language === 'tr'
            ? `${device?.name || 'Cihaz'} WiFi ayarları uygulandı.`
            : `${device?.name || 'Device'} WiFi settings applied.`
        );

        useAppStore.getState().addNetworkEventLog({
          level: 'info',
          category: 'Wireless',
          message: language === 'tr' ? `${device?.name || 'Cihaz'} WiFi ayarları güncellendi` : `${device?.name || 'Device'} WiFi settings updated`,
          detail: `SSID: ${nextWifi.ssid || '(yok)'}, Security: ${nextWifi.security}, Mode: ${nextWifi.mode}`,
        });
      }

      // Handle admin credential changes from the Admin tab
      if (data.type === 'router-admin-save-credentials') {
        if (!httpAppDeviceId || !data.deviceId || data.deviceId !== httpAppDeviceId) return;

        const device = topologyDevices.find((d) => d.id === httpAppDeviceId);
        const payload = data.payload || {};
        const nextUsername = String(payload.username || 'admin').trim() || 'admin';
        const nextPassword = String(payload.password || 'admin') || 'admin';

        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: httpAppDeviceId,
            config: {
              services: {
                ...device?.services,
                http: {
                  enabled: true,
                  content: '',
                  ...device?.services?.http,
                  username: nextUsername,
                  password: nextPassword,
                },
              },
            },
          },
        }));

        addLocalOutput(
          'success',
          language === 'tr'
            ? `${device?.name || 'Cihaz'} yönetici bilgileri güncellendi. Kullanıcı: ${nextUsername}`
            : `${device?.name || 'Device'} admin credentials updated. User: ${nextUsername}`
        );

        useAppStore.getState().addNetworkEventLog({
          level: 'info',
          category: 'Wireless',
          message: language === 'tr' ? `${device?.name || 'Cihaz'} yönetici şifresi değiştirildi` : `${device?.name || 'Device'} admin password changed`,
          detail: `User: ${nextUsername}`,
        });
        return;
      }

      // Handle IoT device connect (existing device)
      if (data.type === 'router-admin-connect-iot') {
        const payload = data.payload || {};
        const iotDeviceId = payload.iotDeviceId;

        if (!iotDeviceId) {
          logger.warn('No iotDeviceId provided');
          return;
        }

        const iotDevice = topologyDevices.find((d) => d.id === iotDeviceId);
        if (!iotDevice || iotDevice.type !== 'iot') {
          logger.warn('IoT device not found or wrong type:', iotDeviceId);
          return;
        }

        const ipConfig = allocateIotIpConfig(httpAppDeviceId || '', iotDeviceId);

        // Update the IoT device's WiFi config to connect to this AP
        const updatedWifi = {
          enabled: true,
          ssid: payload.ssid || '',
          security: payload.security || 'open',
          password: payload.password || '',
          channel: payload.channel || '2.4GHz',
          mode: 'client' as const,
          bssid: httpAppDeviceId,
        };

        // Dispatch event to update the IoT device with IP
        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: iotDeviceId,
            config: {
              wifi: updatedWifi,
              status: 'online',
              ip: ipConfig.ip,
              ipConfigMode: 'dhcp' as const,
              gateway: ipConfig.gateway,
              subnet: ipConfig.subnet,
              dns: ipConfig.dns,
            },
          },
        }));

        addLocalOutput(
          'success',
          language === 'tr'
            ? `IoT cihaz "${iotDevice.name}" ağa bağlandı. IP: ${ipConfig.ip}`
            : `IoT device "${iotDevice.name}" connected to the network. IP: ${ipConfig.ip}`
        );
      }

      if (data.type === 'router-admin-renew-iot') {
        const payload = data.payload || {};
        const iotDeviceId = payload.iotDeviceId;

        if (!iotDeviceId) return;

        const targetClient = topologyDevices.find((d) => d.id === iotDeviceId);
        if (!targetClient || (targetClient.type !== 'iot' && targetClient.type !== 'pc')) return;

        const ipConfig = allocateIotIpConfig(httpAppDeviceId || '', iotDeviceId);
        const updatedPorts = targetClient.ports ? targetClient.ports.map(p =>
          p.id === 'wlan0' || p.id === 'fa0'
            ? { ...p, ipAddress: ipConfig.ip, subnetMask: ipConfig.subnet }
            : p
        ) : undefined;

        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: iotDeviceId,
            config: {
              ip: ipConfig.ip,
              ipConfigMode: 'dhcp' as const,
              gateway: ipConfig.gateway,
              subnet: ipConfig.subnet,
              dns: ipConfig.dns,
              ...(updatedPorts ? { ports: updatedPorts } : {}),
            },
          },
        }));

        addLocalOutput(
          'success',
          language === 'tr'
            ? `Cihaz "${targetClient.name}" için IP yenilendi: ${ipConfig.ip}`
            : `Renewed IP for device "${targetClient.name}": ${ipConfig.ip}`
        );

        if (httpAppDeviceId) {
          const targetDevice = topologyDevices.find((d) => d.id === httpAppDeviceId);
          if (targetDevice && isRouterDevice(targetDevice)) {
            const runtimeState = deviceStates?.get(httpAppDeviceId);
            const connectedIot = getConnectedIotDevices(httpAppDeviceId);
            const availableIot = getAvailableIotDevices(httpAppDeviceId);
            const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot, undefined, undefined, routerActiveTabRef.current);
            setHttpAppContent(refreshed);
          }
        }
      }

      // Handle IoT / PC device delete
      if (data.type === 'router-admin-delete-iot') {
        const payload = data.payload || {};
        const iotDeviceId = payload.iotDeviceId;

        if (!iotDeviceId) return;

        if (onDeleteDevice) {
          onDeleteDevice(iotDeviceId);
        }
      }

      // Handle IoT / PC device disconnect
      if (data.type === 'router-admin-disconnect-iot') {
        const payload = data.payload || {};
        const iotDeviceId = payload.iotDeviceId;

        if (!iotDeviceId) {
          logger.warn('No iotDeviceId provided for disconnect');
          return;
        }

        const targetClient = topologyDevices.find((d) => d.id === iotDeviceId);
        if (!targetClient || (targetClient.type !== 'iot' && targetClient.type !== 'pc')) {
          logger.warn('Device not found or wrong type for disconnect:', iotDeviceId);
          return;
        }

        // Update device's WiFi config to disconnect (disable WiFi)
        const updatedWifi = {
          enabled: false,
          ssid: '',
          security: 'open' as const,
          password: '',
          channel: '2.4GHz' as const,
          mode: 'client' as const,
          bssid: undefined,
        };

        // Update ports to clear WiFi connection
        const updatedPorts = targetClient.ports ? targetClient.ports.map(p =>
          p.id === 'wlan0'
            ? { ...p, status: 'disconnected' as const, ipAddress: undefined, subnetMask: undefined, wifi: { ssid: '', security: 'open' as const, channel: '2.4GHz' as const, mode: 'client' as const } }
            : p
        ) : undefined;

        // Dispatch event to update device
        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: iotDeviceId,
            config: {
              wifi: updatedWifi,
              ip: '',
              subnet: '',
              gateway: '',
              ...(updatedPorts ? { ports: updatedPorts } : {}),
            },
          },
        }));

        // Delete any physical cable connections between this AP and the device
        if (topologyConnections) {
          topologyConnections.forEach(conn => {
            if ((conn.sourceDeviceId === httpAppDeviceId && conn.targetDeviceId === iotDeviceId) ||
              (conn.targetDeviceId === httpAppDeviceId && conn.sourceDeviceId === iotDeviceId)) {
              window.dispatchEvent(new CustomEvent('delete-topology-connection', {
                detail: { connectionId: (conn as CanvasConnection).id }
              }));
            }
          });
        }
        addLocalOutput(
          'success',
          language === 'tr'
            ? `Cihaz "${targetClient.name}" ağdan çıkarıldı.`
            : `Device "${targetClient.name}" disconnected from the network.`
        );

        // Refresh router admin page to update device list
        if (httpAppDeviceId) {
          const targetDevice = topologyDevices.find((d) => d.id === httpAppDeviceId);
          if (targetDevice && isRouterDevice(targetDevice)) {
            const runtimeState = deviceStates?.get(httpAppDeviceId);
            const connectedIot = getConnectedIotDevices(httpAppDeviceId);
            const availableIot = getAvailableIotDevices(httpAppDeviceId);
            const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot, undefined, undefined, routerActiveTabRef.current);
            setHttpAppContent(refreshed);
          }
        }
      }

      // Handle refresh devices request (after bulk operations)
      if (data.type === 'router-admin-refresh-devices') {
        if (httpAppDeviceId) {
          const targetDevice = topologyDevices.find((d) => d.id === httpAppDeviceId);
          if (targetDevice && isRouterDevice(targetDevice)) {
            const runtimeState = deviceStates?.get(httpAppDeviceId);
            const connectedIot = getConnectedIotDevices(httpAppDeviceId);
            const availableIot = getAvailableIotDevices(httpAppDeviceId);
            const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot, undefined, undefined, routerActiveTabRef.current);
            setHttpAppContent(refreshed);
          }
        }
      }

      // Handle messages from IoT Web Panel
      if (data.type === 'open-iot-device') {
        const { deviceId } = data;
        openWebPage(`iot://iot-device/${deviceId}`);
      }

      // Handle back to IoT list message
      if (data.type === 'back-to-iot-list') {
        setHttpAppDeviceId(null);
        setHttpAppContent(null); // Clear content to force regeneration
        setTimeout(() => {
          openWebPage('http://iot-panel');
        }, 50); // Small delay to ensure state updates
      }

      // Handle toggle IoT device status message
      if (data.type === 'toggle-iot-device') {
        const { deviceId, active } = data;
        const targetDevice = topologyDevices.find((d) => d.id === deviceId);
        if (targetDevice && targetDevice.type === 'iot') {
          window.dispatchEvent(new CustomEvent('update-topology-device-config', {
            detail: {
              deviceId: deviceId,
              config: {
                iot: {
                  ...targetDevice.iot,
                  collaborationEnabled: active,
                },
              },
            },
          }));
          addLocalOutput(
            'success',
            language === 'tr'
              ? `IoT cihaz "${targetDevice.name || deviceId}" durumu ${active ? 'aktif edildi.' : 'pasif edildi.'}`
              : `IoT device "${targetDevice.name || deviceId}" status ${active ? 'activated.' : 'deactivated.'}`
          );
        }
      }

      // Handle update IoT rules message
      if (data.type === 'update-iot-rules') {
        const { deviceId, rules } = data;
        const targetDevice = topologyDevices.find((d) => d.id === deviceId);
        if (targetDevice && targetDevice.type === 'iot') {
          window.dispatchEvent(new CustomEvent('update-topology-device-config', {
            detail: {
              deviceId: deviceId,
              config: {
                iot: {
                  ...targetDevice.iot,
                  rules: rules,
                },
              },
            },
          }));
          addLocalOutput(
            'success',
            language === 'tr'
              ? `IoT cihaz "${targetDevice.name || deviceId}" kuralları güncellendi.`
              : `IoT device "${targetDevice.name || deviceId}" rules updated.`
          );
        }
      }
    };

    window.addEventListener('message', handleRouterAdminMessage);
    return () => window.removeEventListener('message', handleRouterAdminMessage);
  }, [addLocalOutput, httpAppDeviceId, language, topologyDevices, topologyConnections, getConnectedIotDevices, getAvailableIotDevices, openWebPage]);
}
