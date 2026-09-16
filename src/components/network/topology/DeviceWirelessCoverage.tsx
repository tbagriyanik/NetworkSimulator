'use client';

import { CanvasDevice } from '../networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { getChannelBand } from '@/lib/network/wireless';
import { colors } from '@/lib/design-tokens/colors';

interface DeviceWirelessCoverageProps {
  device: CanvasDevice;
  deviceWidth: number;
  deviceHeight: number;
  isDark: boolean;
  deviceStates?: Map<string, SwitchState>;
  isPoweredOff: boolean;
}

export function DeviceWirelessCoverage({ device, deviceWidth, deviceHeight, isDark, deviceStates, isPoweredOff }: DeviceWirelessCoverageProps) {
  const isWirelessHost = device.type === 'router' || device.type === 'wlc';
  if (!isWirelessHost) return null;

  const wlanPort = device.ports.find(p => p.id === 'wlan0');
  const activeWifiConfig = deviceStates?.get(device.id)?.ports['wlan0']?.wifi || device.wifi;

  let isEnabled = false;
  if (device.type === 'wlc') isEnabled = true;
  else if (wlanPort) isEnabled = !wlanPort.shutdown;
  else if (activeWifiConfig) isEnabled = (activeWifiConfig as { enabled?: boolean }).enabled ?? true;

  if (!isEnabled || isPoweredOff) return null;

  const is5Ghz = getChannelBand(activeWifiConfig?.channel) === '5GHz';
  const coverageRadius = is5Ghz ? 250 : 150;

  return (
    <circle
      cx={deviceWidth / 2}
      cy={deviceHeight / 2}
      r={coverageRadius}
      fill={colors.indigo['500']}
      fillOpacity={isDark ? 0.03 : 0.04}
      stroke={colors.indigo['500']}
      strokeOpacity={isDark ? 0.15 : 0.2}
      strokeWidth="1"
      strokeDasharray="8 4"
      style={{ pointerEvents: 'none' }}
    />
  );
}