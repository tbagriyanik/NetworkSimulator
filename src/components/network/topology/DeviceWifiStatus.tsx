import React from 'react';
import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { SwitchState, Port } from '@/lib/network/types';
import { getWirelessSignalStrength } from '@/lib/network/connectivity';
import { getChannelBand, getDeviceWifiConfig, getApActiveSsids, wifiChannelMatches, wifiMacFilterMatches } from '@/lib/network/wireless';

interface DeviceWifiStatusProps {
  device: CanvasDevice;
  topologyDevices: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
  deviceConnections: CanvasConnection[];
  isDark: boolean;
  deviceWidth: number;
  isPoweredOff: boolean;
}

const wifiBarRects = [
  { x: 1, y: 10.5, width: 2.5, height: 3 },
  { x: 5, y: 8.5, width: 2.5, height: 5 },
  { x: 9, y: 6.5, width: 2.5, height: 7 },
  { x: 13, y: 4.5, width: 2.5, height: 9 },
  { x: 17, y: 2.5, width: 2.5, height: 11 },
];

export const DeviceWifiStatus: React.FC<DeviceWifiStatusProps> = React.memo(({
  device,
  topologyDevices,
  deviceStates,
  deviceConnections,
  isDark,
  deviceWidth,
  isPoweredOff
}) => {
  const wlanPort = device.ports.find(p => p.id === 'wlan0');
  const pcWifi = device.wifi;
  const usesWifiBars = device.type === 'pc' || device.type === 'iot' || device.type === 'mobile' || device.type === 'printer';
  const isSwitchL3 = device.type === 'switchL3';
  const isRouter = device.type === 'router';
  const isWlc = device.type === 'wlc';
  const devState = deviceStates?.get(device.id);
  const wlanState = devState?.ports['wlan0'];

  let wifiColor = isDark ? 'var(--color-secondary-600)' : 'var(--color-secondary-400)';
  const showWifi = usesWifiBars || isSwitchL3 || isRouter || isWlc;

  let isEnabled = false;
  if (showWifi) {
    if (isWlc) isEnabled = true;
    else if (wlanPort) isEnabled = !wlanPort.shutdown;
    else isEnabled = pcWifi?.enabled !== false;
  }

  const hasActiveWirelessConn = deviceConnections.some(c => c.cableType === 'wireless' && c.active !== false);
  const hasWirelessConnLine = deviceConnections.some(c => c.cableType === 'wireless');
  if (usesWifiBars && isEnabled && !hasActiveWirelessConn && hasWirelessConnLine) {
    isEnabled = false;
  }

  const isConnected = wlanState?.status === 'connected' ||
    (isEnabled && (hasActiveWirelessConn || !hasWirelessConnLine));

  const activeWifiConfig = wlanState?.wifi || pcWifi;
  const isMacBlocked = usesWifiBars && !isConnected && !!pcWifi?.ssid && topologyDevices.some(ap => {
    if (ap.id === device.id || ap.status === 'offline') return false;
    const apState = deviceStates?.get(ap.id);
    const apWifi = getDeviceWifiConfig(ap, deviceStates);
    if (!apWifi || !pcWifi) return false;
    const matchingSsid = getApActiveSsids(apWifi, apState, deviceStates)
      .find(item => item.ssid.toLowerCase() === pcWifi.ssid.toLowerCase());
    if (!matchingSsid) return false;

    const normalizedApWifi = {
      ...apWifi,
      security: apWifi.security || 'open',
      channel: apWifi.channel || '2.4GHz',
    };
    const normalizedPcWifi = {
      ...pcWifi,
      security: pcWifi.security || 'open',
      channel: pcWifi.channel || '2.4GHz',
    };

    if (!wifiChannelMatches(normalizedApWifi, normalizedPcWifi)) return false;
    const clientSecurity = (pcWifi.security || 'open').toLowerCase();
    const apSecurity = (matchingSsid.security || 'open').toLowerCase();
    if (clientSecurity !== apSecurity) return false;
    if (apSecurity !== 'open' && matchingSsid.password !== pcWifi.password) return false;
    return !wifiMacFilterMatches(apWifi, device, deviceStates);
  });

  if (showWifi && isEnabled && !isPoweredOff) {
    const isNetworkHost = isRouter || isWlc || isSwitchL3;
    if (isNetworkHost) {
      const needsConfig = !activeWifiConfig || activeWifiConfig.security === 'open' || activeWifiConfig.password === 'password123' || !activeWifiConfig.ssid;
      const hasError = isWlc && Object.values(devState?.ports || {}).some((p: Port) => p.status === 'err-disabled');
      if (hasError || needsConfig) {
        wifiColor = 'var(--color-warning-500)';
      } else {
        wifiColor = 'var(--color-success-500)';
      }
    } else {
      wifiColor = isConnected ? 'var(--color-success-500)' : 'var(--color-warning-500)';
    }
  }

  if (!showWifi) return null;

  const is5Ghz = getChannelBand(activeWifiConfig?.channel) === '5GHz';
  const hasPassword = activeWifiConfig?.security && activeWifiConfig.security !== 'open';

  if (usesWifiBars) {
    const activeColor = 'var(--color-success-500)';
    const dimColor = isDark ? 'var(--color-secondary-600)' : 'var(--color-secondary-400)';
    const strength = (isPoweredOff || !isConnected) ? 0 : getWirelessSignalStrength(device, topologyDevices, deviceStates);

    return (
      <g transform={`translate(${deviceWidth - 23}, 7)`}>
        <title>{[`SSID: ${pcWifi?.ssid ?? 'N/A'}`, isConnected ? 'Bağlı' : 'Bağlı değil', `Sinyal: ${strength}/5`, `Güvenlik: ${pcWifi?.security ?? 'open'}`, `Kanal: ${pcWifi?.channel ?? 'N/A'}`, `Parola: ${pcWifi?.password ? 'Evet' : 'Hayır'}`].join(' • ')}</title>
        <svg x="-2" y="1" width="22" height="14" viewBox="0 0 22 14" className="pointer-events-none">
          {wifiBarRects.map((bar, index) => (
            <rect
              key={index}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={strength >= index + 1 ? activeColor : dimColor}
              rx="0.3"
            />
          ))}
        </svg>
        {is5Ghz && (
          <text x="0" y="14" fontSize="4.5" fontWeight="900" fill={strength > 0 ? activeColor : dimColor} textAnchor="middle" style={{ pointerEvents: 'none' }}>
            5
          </text>
        )}
        {hasPassword && (
          <g transform="translate(14, 10)">
            <rect x="0" y="2" width="3.5" height="2.5" rx="0.5" fill={isDark ? 'var(--color-warning-400)' : 'var(--color-warning-500)'} />
            <path d="M0.5 2V1.2C0.5 0.5 1 0 1.75 0C2.5 0 3 0.5 3 1.2V2" fill="none" stroke={isDark ? 'var(--color-warning-400)' : 'var(--color-warning-500)'} strokeWidth="0.8" />
          </g>
        )}
        {isMacBlocked && (
          <g transform="translate(13, 0)" aria-label="MAC blocked">
            <circle cx="2.5" cy="2.5" r="2.5" fill="var(--color-error-500)" />
            <path d="M1.2 1.2l2.6 2.6M3.8 1.2L1.2 3.8" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
          </g>
        )}
      </g>
    );
  }

  return (
    <g transform={`translate(${deviceWidth - 22}, 6)`}>
      <circle cx="8" cy="8" r="9" fill={isDark ? 'var(--color-secondary-900)' : 'var(--color-secondary-50)'} stroke={isDark ? 'var(--color-secondary-800)' : 'var(--color-secondary-200)'} strokeWidth="1" opacity="0.8" />
      <path
        d="M3 5.5a7.5 7.5 0 0 1 10 0M4.8 7.3a4.8 4.8 0 0 1 6.4 0M6.5 9.1a2.3 2.3 0 0 1 3 0M8 10.5a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1"
        fill="none"
        stroke={wifiColor}
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      {is5Ghz && (
        <text x="4" y="14" fontSize="4.5" fontWeight="900" fill={wifiColor} textAnchor="middle" style={{ pointerEvents: 'none' }}>
          5
        </text>
      )}
      {hasPassword && (
        <g transform="translate(10, 10)">
          <rect x="0" y="2" width="3.5" height="2.5" rx="0.5" fill={isDark ? 'var(--color-warning-400)' : 'var(--color-warning-500)'} />
          <path d="M0.5 2V1.2C0.5 0.5 1 0 1.75 0C2.5 0 3 0.5 3 1.2V2" fill="none" stroke={isDark ? 'var(--color-warning-400)' : 'var(--color-warning-500)'} strokeWidth="0.8" />
        </g>
      )}
    </g>
  );
});
