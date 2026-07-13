import { logger } from '@/lib/logger';
import { CanvasDevice } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { REFRESH_DEVICE_TYPE_ORDER } from '@/components/network/LiveDeviceList';

/**
 * Refresh network connections and WiFi status.
 * Extracted from the original page component to keep it modular.
 */
export const handleRefreshNetwork = (params: {
  setActiveDeviceId: (id: string) => void;
  setSelectedDevice: (dev: CanvasDevice | null) => void;
  deviceStates: Map<string, SwitchState>;
  topologyDevices: CanvasDevice[];
  topologyConnections: unknown[];
  language: string;
}) => {
  const { setActiveDeviceId, setSelectedDevice, deviceStates, language } = params;

  // Close floating panels on network refresh
  setActiveDeviceId('');
  setSelectedDevice(null);
  window.dispatchEvent(new CustomEvent('network-refresh'));

  const normalizeWifiMode = (mode: string | undefined): 'ap' | 'client' | 'disabled' => {
    if (!mode) return 'disabled';
    const normalized = mode.toLowerCase().replace(/^wifi-/, '');
    if (normalized === 'client' || normalized === 'sta') return 'client';
    if (normalized === 'ap') return 'ap';
    return 'disabled';
  };

  const hasValidIp = (ip: string | undefined) => !!ip && ip !== '0.0.0.0' && ip !== '169.254.0.0';

  const getEffectiveWifi = (device: CanvasDevice) => {
    const state = deviceStates?.get(device.id);
    const wlan = state?.ports?.['wlan0'];
    const runtimeWifi = wlan?.wifi;
    if (!runtimeWifi) return device.wifi;

    const normalizedMode = normalizeWifiMode(runtimeWifi.mode);
    const enabled = !wlan.shutdown && normalizedMode !== 'disabled';
    const fallbackMode: 'ap' | 'client' = device.type === 'pc' ? 'client' : 'ap';
    const resolvedMode: 'ap' | 'client' = normalizedMode === 'disabled'
      ? device.wifi?.mode || fallbackMode
      : normalizedMode === 'client'
      ? 'client'
      : 'ap';
    return {
      ...device.wifi,
      enabled,
      ssid: runtimeWifi.ssid || device.wifi?.ssid || '',
      security: runtimeWifi.security || device.wifi?.security || 'open',
      password: runtimeWifi.password || device.wifi?.password,
      channel: runtimeWifi.channel || device.wifi?.channel || '2.4GHz',
      mode: resolvedMode,
    };
  };

  const firstValue = (...values: Array<string | undefined | null>) =>
    values.find((value) => !!value && value !== '0.0.0.0') || '-';

  const getOpenServices = (device: CanvasDevice, state?: SwitchState) => {
    const services = new Set<string>();
    if (device.services?.dhcp?.enabled || state?.services?.dhcp?.enabled) services.add('DHCP');
    if (device.services?.dns?.enabled || state?.services?.dns?.enabled) services.add('DNS');
    if (device.services?.http?.enabled || state?.services?.http?.enabled) services.add('HTTP');
    const effectiveWifi = getEffectiveWifi(device);
    if (effectiveWifi?.enabled) services.add(effectiveWifi.mode === 'ap' ? 'WiFi AP' : 'WiFi Client');
    if (state?.security?.vtyLines?.transportInput?.some((input: string) => input === 'ssh' || input === 'all')) services.add('SSH');
    if (state?.security?.vtyLines?.transportInput?.some((input: string) => input === 'telnet' || input === 'all')) services.add('Telnet');
    return Array.from(services).join(', ') || '-';
  };

  const buildRefreshDeviceSummaries = (devices: CanvasDevice[], states: Map<string, SwitchState>) => {
    const summaries = devices.map((device) => {
      const state = states.get(device.id);
      const ports = state?.ports || {};
      const statePorts = Object.values(ports) as Array<{ ipAddress?: string; macAddress?: string; ipv6Address?: string }>;
      const topologyPorts = device.ports || [];
      const portIp = statePorts.find((p) => hasValidIp(p.ipAddress))?.ipAddress
        || topologyPorts.find((p) => hasValidIp(p.ipAddress))?.ipAddress;
      const portMac = statePorts.find((p) => p.macAddress)?.macAddress
        || topologyPorts.find((p) => p.macAddress)?.macAddress;
      const portIpv6 = statePorts.find((p) => p.ipv6Address)?.ipv6Address;

      return {
        id: device.id,
        name: device.name || device.id,
        type: device.type,
        ip: firstValue(device.ip, portIp),
        mac: firstValue(device.macAddress, state?.macAddress, portMac),
        gateway: device.gateway || state?.defaultGateway || '0.0.0.0',
        ipv6: device.ipv6 || portIpv6 || '::',
        services: getOpenServices(device, state),
      };
    });
    return summaries.sort((a, b) => {
      const typeDiff = REFRESH_DEVICE_TYPE_ORDER.indexOf(a.type) - REFRESH_DEVICE_TYPE_ORDER.indexOf(b.type);
      if (typeDiff !== 0) return typeDiff;
      return a.name.localeCompare(b.name, language === 'tr' ? 'tr' : 'en');
    });
  };

  logger.debug('Network refresh executed');
  return { buildRefreshDeviceSummaries };
};
