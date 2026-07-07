'use client';

import { useState, useEffect, useMemo } from 'react';
import { SwitchState } from '@/lib/network/types';
import { normalizeMAC } from '@/lib/utils';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { CanvasDevice, DeviceType } from '@/components/network/networkTopology.types';

// ─── Types & Constants ────────────────────────────────────────────────────────

export type RefreshDeviceSummary = {
  id: string;
  name: string;
  type: DeviceType;
  ip: string;
  mac: string;
  gateway: string;
  ipv6: string;
  services: string;
};

export const REFRESH_DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  router: 'Router',
  switchL3: 'L3 SW',
  switchL2: 'L2 SW',
  pc: 'PC',
  iot: 'IoT',
  firewall: 'Firewall',
  wlc: 'WLC',
};

export const REFRESH_DEVICE_TYPE_ORDER: DeviceType[] = ['router', 'switchL3', 'switchL2', 'pc', 'iot', 'firewall'];

// ─── RefreshDeviceListToast ───────────────────────────────────────────────────

function RefreshDeviceListToast({
  devices,
  language,
}: {
  devices: RefreshDeviceSummary[];
  language: string;
}) {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(devices[0]?.id ?? null);
  const selected = devices.find((device) => device.id === selectedId) || null;
  const isTR = language === 'tr';
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!devices.length) {
      setTimeout(() => setSelectedId(null), 0);
      return;
    }
    if (!selectedId || !devices.some((device) => device.id === selectedId)) {
      setTimeout(() => setSelectedId(devices[0].id), 0);
    }
  }, [devices, selectedId]);

  if (devices.length === 0) {
    return <div>{isTR ? 'Listelenecek cihaz yok.' : 'No devices to list.'}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 pt-1">
        {devices.map((device) => (
          <button
            key={device.id}
            type="button"
            onClick={() => setSelectedId(device.id)}
            className={`w-24 px-2 py-0.5 text-[10px] font-bold rounded transition-all border ${selectedId === device.id
              ? 'bg-primary-600 border-primary-700 text-white shadow-sm scale-105 z-10'
              : isDark
                ? 'bg-secondary-800 border-secondary-700 text-secondary-400 hover:bg-secondary-700 hover:text-secondary-300'
                : 'bg-secondary-100 border-secondary-200 text-secondary-600 hover:bg-secondary-200 hover:text-secondary-800'
              }`}
          >
            {device.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="overflow-hidden rounded-md border border-secondary-200 dark:border-secondary-700">
          <table className="w-full text-[11px]">
            <tbody>
              {([
                [isTR ? 'Cihaz' : 'Device', `${selected.name} (${REFRESH_DEVICE_TYPE_LABELS[selected.type]})`, false],
                ['IP', selected.ip, true],
                ['MAC', selected.mac ? normalizeMAC(selected.mac) : '-', true],
                ['GW', selected.gateway, true],
                ['IPv6', selected.ipv6, true],
                [isTR ? 'Açık hizmetler' : 'Open services', selected.services, false],
              ] as Array<[string, string, boolean]>).map(([label, value, copyable]) => (
                <tr key={label} className="border-t first:border-t-0 border-secondary-200 dark:border-secondary-700">
                  <td className="w-24 bg-secondary-100 px-2 py-1 font-semibold dark:bg-secondary-800">{label}</td>
                  <TooltipWrapper title={copyable ? t.copy : undefined}>
                    <td
                      className={`px-2 py-1 font-mono ${copyable ? 'cursor-pointer hover:bg-secondary-200 dark:hover:bg-secondary-700 rounded' : ''}`}
                      onClick={copyable && value !== '-' ? () => navigator.clipboard.writeText(value) : undefined}
                    >
                      {value}
                    </td>
                  </TooltipWrapper>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── LiveDeviceList ───────────────────────────────────────────────────────────

export function LiveDeviceList({
  devices,
  deviceStates,
  language,
}: {
  devices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  language: string;
}) {
  const { t } = useLanguage();

  const hasValidIp = (ip: string | undefined) => !!ip && ip !== '0.0.0.0' && ip !== '169.254.0.0';
  const firstValue = (...values: Array<string | undefined | null>) =>
    values.find((value) => !!value && value !== '0.0.0.0') || '-';
  const normalizeWifiMode = (mode: string | undefined): 'ap' | 'client' | 'disabled' => {
    if (!mode) return 'disabled';
    const normalized = mode.toLowerCase().replace(/^wifi-/, '');
    if (normalized === 'client' || normalized === 'sta') return 'client';
    if (normalized === 'ap') return 'ap';
    return 'disabled';
  };
  const getEffectiveWifi = (device: CanvasDevice): CanvasDevice['wifi'] => {
    const state = deviceStates?.get(device.id);
    const wlan = state?.ports?.['wlan0'];
    const runtimeWifi = wlan?.wifi;
    if (!runtimeWifi) return device.wifi;
    const normalizedMode = normalizeWifiMode(runtimeWifi.mode);
    const enabled = !wlan.shutdown && normalizedMode !== 'disabled';
    const fallbackMode: 'ap' | 'client' = device.type === 'pc' ? 'client' : 'ap';
    const resolvedMode: 'ap' | 'client' = normalizedMode === 'disabled'
      ? (device.wifi?.mode || fallbackMode)
      : (normalizedMode === 'client' ? 'client' : 'ap');
    return { ...device.wifi, enabled, ssid: runtimeWifi.ssid || device.wifi?.ssid || '',
      security: runtimeWifi.security || device.wifi?.security || 'open',
      password: runtimeWifi.password || device.wifi?.password,
      channel: runtimeWifi.channel || device.wifi?.channel || '2.4GHz', mode: resolvedMode };
  };
  const getOpenServices = (device: CanvasDevice, state?: SwitchState) => {
    const services = new Set<string>();
    if (device.services?.dhcp?.enabled || state?.services?.dhcp?.enabled) services.add('DHCP');
    if (device.services?.dns?.enabled || state?.services?.dns?.enabled) services.add('DNS');
    if (device.services?.http?.enabled || state?.services?.http?.enabled) services.add('HTTP');
    const effectiveWifi = getEffectiveWifi(device);
    if (effectiveWifi?.enabled) services.add(effectiveWifi.mode === 'ap' ? 'WiFi AP' : 'WiFi Client');
    if (state?.security?.vtyLines?.transportInput?.some((input) => input === 'ssh' || input === 'all')) services.add('SSH');
    if (state?.security?.vtyLines?.transportInput?.some((input) => input === 'telnet' || input === 'all')) services.add('Telnet');
    return Array.from(services).join(', ') || t.none;
  };

  const liveDevices = useMemo(() => {
    if (!devices || !deviceStates) return [];
    return devices.map((device) => {
      const state = deviceStates.get(device.id);
      const statePorts = Object.values(state?.ports || {});
      const topologyPorts = device.ports || [];
      const portIp = statePorts.find((port) => hasValidIp(port.ipAddress))?.ipAddress
        || topologyPorts.find((port) => hasValidIp(port.ipAddress))?.ipAddress;
      const portMac = statePorts.find((port) => port.macAddress)?.macAddress
        || topologyPorts.find((port) => port.macAddress)?.macAddress;
      const portIpv6 = statePorts.find((port) => port.ipv6Address)?.ipv6Address;
      return {
        id: device.id,
        name: device.name || device.id,
        type: device.type,
        ip: firstValue(device.ip, portIp),
        mac: firstValue(device.macAddress, state?.macAddress, portMac),
        gateway: device.gateway || state?.defaultGateway || '0.0.0.0',
        ipv6: device.ipv6 || portIpv6 || '::',
        services: getOpenServices(device, state),
      } as RefreshDeviceSummary;
    }).sort((a, b) => {
      const typeDiff = REFRESH_DEVICE_TYPE_ORDER.indexOf(a.type) - REFRESH_DEVICE_TYPE_ORDER.indexOf(b.type);
      if (typeDiff !== 0) return typeDiff;
      return a.name.localeCompare(b.name, language === 'tr' ? 'tr' : 'en');
    });
  }, [devices, deviceStates, language]);

  return <RefreshDeviceListToast devices={liveDevices} language={language} />;
}
