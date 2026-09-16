import type { CanvasDevice } from './NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { DeviceWifiSsidProfile } from '@/lib/network/wireless';

export interface WifiAdminConfig {
  enabled: boolean; ssid: string; security: 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3'; password?: string;
  channel: '2.4GHz' | '5GHz' | string; mode: 'ap' | 'client'; hidden?: boolean; maxClients?: number;
  macFilterEnabled?: boolean; macFilterMode?: 'allow' | 'deny'; macFilterList?: string[]; ssids?: DeviceWifiSsidProfile[];
}

export function getDefaultWifiConfig(device: CanvasDevice): WifiAdminConfig {
  const defaultSsids: DeviceWifiSsidProfile[] = Array.isArray(device.wifi?.ssids) && device.wifi.ssids.length > 0 ? device.wifi.ssids : [
    { id: 'ssid-1', name: 'Ana Ağ (Primary)', ssid: device.wifi?.ssid || `${device.name}_WiFi`, security: device.wifi?.security || 'wpa2', password: device.wifi?.password || 'password123', band: 'both', enabled: true, hidden: device.wifi?.hidden ?? false },
    { id: 'ssid-2', name: 'Misafir Ağ (Guest)', ssid: `${device.name}_Guest`, security: 'open', band: '2.4GHz', enabled: false, hidden: false },
  ];
  return { enabled: device.wifi?.enabled ?? false, ssid: device.wifi?.ssid || `${device.name}_WiFi`, security: device.wifi?.security || 'wpa2', password: device.wifi?.password || 'password123', channel: device.wifi?.channel || '2.4GHz', mode: (device.wifi?.mode === 'client' || device.wifi?.mode === 'sta') ? 'client' : 'ap', hidden: device.wifi?.hidden ?? false, maxClients: device.wifi?.maxClients ?? 32, macFilterEnabled: device.wifi?.macFilterEnabled ?? false, macFilterMode: device.wifi?.macFilterMode || 'allow', macFilterList: device.wifi?.macFilterList || [], ssids: defaultSsids };
}

export function getRouterWifiConfig(device: CanvasDevice, state?: SwitchState): WifiAdminConfig {
  const wlan = state?.ports?.['wlan0']; const wlanWifi = wlan?.wifi; const base = getDefaultWifiConfig(device);
  if (device.type === 'wlc' || state?.deviceType === 'wlc') {
    const wlans = state?.wlcWlans ? Object.values(state.wlcWlans) : []; const active = wlans.find(w => w.status === 'enabled') || wlans[0];
    if (active) { base.enabled = active.status === 'enabled'; base.ssid = active.ssid || base.ssid; base.security = active.security === 'open' ? 'open' : (active.security as WifiAdminConfig['security']) || 'open'; }
  }
  if (!wlanWifi) return base;
  return { enabled: !wlan?.shutdown && wlanWifi.mode !== 'disabled', ssid: wlanWifi.ssid || base.ssid, security: wlanWifi.security || base.security, password: wlanWifi.password || base.password, channel: wlanWifi.channel || base.channel, mode: wlanWifi.mode === 'client' ? 'client' : 'ap', hidden: wlanWifi.hidden ?? base.hidden, maxClients: wlanWifi.maxClients ?? base.maxClients, macFilterEnabled: wlanWifi.macFilterEnabled ?? base.macFilterEnabled, macFilterMode: wlanWifi.macFilterMode || base.macFilterMode, macFilterList: wlanWifi.macFilterList || base.macFilterList, ssids: Array.isArray(wlanWifi.ssids) && wlanWifi.ssids.length > 0 ? wlanWifi.ssids : base.ssids };
}

