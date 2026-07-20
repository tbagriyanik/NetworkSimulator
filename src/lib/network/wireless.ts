import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState, Port } from './types';
import { ensureDeviceStatesMap } from './networkUtils';

export type WifiMode = 'ap' | 'client' | 'disabled' | 'sta';

export interface DeviceWifiConfig {
  enabled: boolean;
  ssid: string;
  bssid?: string;
  password?: string;
  security: 'open' | 'wpa' | 'wpa2' | 'wpa3';
  channel: '2.4GHz' | '5GHz';
  mode: WifiMode;
  hidden?: boolean;
  maxClients?: number;
}

const normalizeWifiMode = (mode: string | undefined, fallback: WifiMode): WifiMode => {
  if (!mode) return fallback;
  const words = mode.toLowerCase();
  if (words === 'ap') return 'ap';
  if (words === 'client') return 'client';
  if (words === 'sta') return 'sta';
  if (words === 'disabled') return 'disabled';
  return fallback;
};

const normalizeSecurity = (security: string | undefined): DeviceWifiConfig['security'] => {
  const value = security ? security.toLowerCase() : 'open';
  if (value === 'wpa3') return 'wpa3';
  if (value === 'wpa2') return 'wpa2';
  if (value === 'wpa') return 'wpa';
  return 'open';
};

const normalizeChannel = (channel: string | undefined): DeviceWifiConfig['channel'] => {
  const value = channel ? channel.toLowerCase() : '2.4ghz';
  if (value === '5ghz') return '5GHz';
  return '2.4GHz';
};

export function getDeviceWifiConfig(device: CanvasDevice | undefined, deviceStates?: Map<string, SwitchState>): DeviceWifiConfig | undefined {
  if (!device) return undefined;
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const state = safeDeviceStates?.get(device.id);
  const wlanState: Port | undefined = state?.ports['wlan0'];
  const defaultMode: WifiMode = device.type === 'pc' ? 'client' : 'ap';

  if (wlanState?.wifi?.ssid) {
    const mode = normalizeWifiMode(wlanState.wifi.mode, defaultMode);
    const enabled = mode !== 'disabled' && !(wlanState.shutdown ?? false);
    return {
      enabled,
      ssid: wlanState.wifi.ssid,
      password: wlanState.wifi.password,
      security: normalizeSecurity(wlanState.wifi.security),
      channel: normalizeChannel(wlanState.wifi.channel),
      mode,
      hidden: wlanState.wifi.hidden,
      maxClients: wlanState.wifi.maxClients,
    };
  }

  if (device.wifi?.ssid) {
    const mode = normalizeWifiMode(device.wifi.mode, defaultMode);
    return {
      enabled: device.wifi.enabled ?? true,
      ssid: device.wifi.ssid,
      password: device.wifi.password,
      security: normalizeSecurity(device.wifi.security),
      channel: normalizeChannel(device.wifi.channel),
      mode,
      hidden: device.wifi.hidden,
      maxClients: device.wifi.maxClients,
    };
  }

  const wlanPort = device.ports.find(p => p.id === 'wlan0' && p.wifi?.ssid);
  if (wlanPort && wlanPort.wifi) {
    const mode = normalizeWifiMode(wlanPort.wifi.mode, defaultMode);
    return {
      enabled: mode !== 'disabled' && !(wlanPort.shutdown ?? false),
      ssid: wlanPort.wifi.ssid,
      password: wlanPort.wifi.password,
      security: normalizeSecurity(wlanPort.wifi.security),
      channel: normalizeChannel(wlanPort.wifi.channel),
      mode,
      hidden: wlanPort.wifi.hidden,
      maxClients: wlanPort.wifi.maxClients,
    };
  }

  return undefined;
}

export function getWirelessSignalStrength(
  device: CanvasDevice | undefined,
  devices: CanvasDevice[] = [],
  deviceStates?: Map<string, SwitchState>
): number {
  if (!device) return 0;
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const pcWifi = getDeviceWifiConfig(device, safeDeviceStates);
  if (!pcWifi || !pcWifi.enabled || !pcWifi.ssid) return 0;
  if (pcWifi.mode !== 'client' && pcWifi.mode !== 'sta') return 0;

  const targetSsid = pcWifi.ssid.toLowerCase();
  let minDist = Infinity;

  devices.forEach(dev => {
    if (dev.id === device.id) return;
    const apWifi = getDeviceWifiConfig(dev, safeDeviceStates);
    if (!apWifi || apWifi.mode !== 'ap' || !apWifi.enabled) {
      const devState = safeDeviceStates.get(dev.id);
      if (devState?.wlcWlans) {
        const wlan = Object.values(devState.wlcWlans).find(w => w.status === 'enabled' && w.ssid?.toLowerCase() === targetSsid);
        if (!wlan) return;
      } else {
        return;
      }
    } else if (apWifi.ssid?.toLowerCase() !== targetSsid) {
      return;
    }
    const dx = (device.x || 0) - (dev.x || 0);
    const dy = (device.y || 0) - (dev.y || 0);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) minDist = dist;
  });

  if (minDist === Infinity) return 0;
  if (minDist < 150) return 5;
  if (minDist < 250) return 4;
  if (minDist < 350) return 3;
  if (minDist < 450) return 2;
  if (minDist < 550) return 1;
  return 0;
}

export function getWirelessDistance(
  device: CanvasDevice | undefined,
  devices: CanvasDevice[] = [],
  deviceStates?: Map<string, SwitchState>
): number {
  if (!device) return Infinity;
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const pcWifi = getDeviceWifiConfig(device, safeDeviceStates);
  if (!pcWifi || !pcWifi.enabled || !pcWifi.ssid) return Infinity;
  if (pcWifi.mode !== 'client' && pcWifi.mode !== 'sta') return Infinity;

  const targetSsid = pcWifi.ssid.toLowerCase();
  let minDist = Infinity;

  devices.forEach(dev => {
    if (dev.id === device.id) return;
    const apWifi = getDeviceWifiConfig(dev, safeDeviceStates);
    if (!apWifi || apWifi.mode !== 'ap' || !apWifi.enabled) {
      const devState = safeDeviceStates.get(dev.id);
      if (devState?.wlcWlans) {
        const wlan = Object.values(devState.wlcWlans).find(w => w.status === 'enabled' && w.ssid?.toLowerCase() === targetSsid);
        if (!wlan) return;
      } else {
        return;
      }
    } else if (apWifi.ssid?.toLowerCase() !== targetSsid) {
      return;
    }
    const dx = (device.x || 0) - (dev.x || 0);
    const dy = (device.y || 0) - (dev.y || 0);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) minDist = dist;
  });

  return minDist;
}

function getApMaxClients(apWifi: DeviceWifiConfig | undefined): number {
  const value = Number(apWifi?.maxClients);
  if (!Number.isFinite(value) || value <= 0) return Number.POSITIVE_INFINITY;
  return Math.floor(value);
}

function wifiSecurityMatches(apWifi: DeviceWifiConfig, clientWifi: DeviceWifiConfig): boolean {
  const apSecurity = (apWifi.security || 'open').toLowerCase();
  const clientSecurity = (clientWifi.security || 'open').toLowerCase();
  return apSecurity === clientSecurity && (apSecurity === 'open' || apWifi.password === clientWifi.password);
}

export function buildImplicitWirelessConnections(
  devices: CanvasDevice[],
  deviceStates?: Map<string, SwitchState>,
  idPrefix = 'wireless'
): CanvasConnection[] {
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const apDevices = devices.filter(d => d.type === 'switchL2' || d.type === 'switchL3' || d.type === 'router' || d.type === 'wlc');
  const clientDevices = devices.filter(d => {
    const wifi = getDeviceWifiConfig(d, safeDeviceStates);
    return (d.type === 'pc' || d.type === 'iot') && !!wifi && wifi.enabled && !!wifi.ssid && (wifi.mode === 'client' || wifi.mode === 'sta');
  });

  const candidatesByAp = new Map<string, Array<{ client: CanvasDevice; dist: number }>>();

  for (const ap of apDevices) {
    const apWifi = getDeviceWifiConfig(ap, safeDeviceStates);
    if (!apWifi || !apWifi.enabled || apWifi.mode !== 'ap' || !apWifi.ssid) continue;

    const apSsid = apWifi.ssid.toLowerCase();
    for (const client of clientDevices) {
      const clientWifi = getDeviceWifiConfig(client, safeDeviceStates);
      if (!clientWifi || !clientWifi.enabled || !clientWifi.ssid) continue;
      if (clientWifi.bssid && clientWifi.bssid !== ap.id) continue;
      if (clientWifi.ssid.toLowerCase() !== apSsid) continue;
      if (!wifiSecurityMatches(apWifi, clientWifi)) continue;

      const dx = (client.x || 0) - (ap.x || 0);
      const dy = (client.y || 0) - (ap.y || 0);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= 550) continue;

      const list = candidatesByAp.get(ap.id) || [];
      list.push({ client, dist });
      candidatesByAp.set(ap.id, list);
    }
  }

  const wirelessConnections: CanvasConnection[] = [];

  for (const ap of apDevices) {
    const apWifi = getDeviceWifiConfig(ap, safeDeviceStates);
    const candidates = candidatesByAp.get(ap.id) || [];
    const limit = getApMaxClients(apWifi);
    candidates
      .sort((a, b) => a.dist - b.dist || a.client.id.localeCompare(b.client.id))
      .slice(0, limit)
      .forEach(({ client }) => {
        wirelessConnections.push({
          id: `${idPrefix}-${client.id}-${ap.id}`,
          sourceDeviceId: client.id,
          sourcePort: 'wlan0',
          targetDeviceId: ap.id,
          targetPort: 'wlan0',
          cableType: 'wireless',
          active: true,
        } as CanvasConnection);
      });
  }

  return wirelessConnections;
}
