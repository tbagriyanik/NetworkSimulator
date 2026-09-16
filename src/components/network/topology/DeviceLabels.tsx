'use client';

import { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { colors } from '@/lib/design-tokens/colors';

interface DeviceLabelsProps {
  device: CanvasDevice;
  deviceWidth: number;
  isSelected: boolean;
  isDark: boolean;
  isTR: boolean;
  t: Record<string, string>;
  getLiveDeviceVlan: (device: CanvasDevice) => number | string | null;
  getIotMeasuredValue: (device: CanvasDevice) => string;
}

export function DeviceLabels({ device, deviceWidth, isSelected, isDark, isTR, t, getLiveDeviceVlan, getIotMeasuredValue }: DeviceLabelsProps) {
  const SELECTION_HIGHLIGHT_COLOR = 'var(--color-success-400)';

  return (
    <>
      {/* Device name */}
      <text
        x={deviceWidth / 2}
        y={58}
        style={{ fill: isSelected ? SELECTION_HIGHLIGHT_COLOR : isDark ? 'var(--color-secondary-100)' : 'var(--color-secondary-800)' }}
        fontSize="10"
        textAnchor="middle"
        fontWeight={isSelected ? '800' : 'bold'}
        className="select-none pointer-events-none"
      >
        {device.name}
      </text>

      {/* Device IP */}
      {(device.type === 'pc' || device.type === 'mobile' || device.type === 'printer') && (
        <text x={deviceWidth / 2} y={70} style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} fontSize={device.type === 'mobile' ? "9" : "10"} textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none">
          {device.ip || (device.ipConfigMode === 'dhcp' ? 'DHCP' : '0.0.0.0')}
        </text>
      )}

      {/* Device VLAN */}
      {device.type === 'pc' && (
        <text x={deviceWidth / 2} y={81} style={{ fill: isDark ? 'var(--color-accent-400)' : 'var(--color-accent-700)' }} fontSize="9" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none">
          VLAN {String(getLiveDeviceVlan(device))}
        </text>
      )}

      {/* Printer Job Count */}
      {device.type === 'printer' && (
        <text x={deviceWidth / 2} y={81} style={{ fill: isDark ? 'var(--color-pink-400)' : 'var(--color-pink-700)' }} fontSize="9" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none">
          {(() => {
            const completedCount = (device.printJobs || []).filter(j => j.status === 'completed').length;
            const activeCount = (device.printJobs || []).filter(j => j.status === 'printing' || j.status === 'queued').length;
            return isTR
              ? `${completedCount} GÃ¶rev TamamlandÄ±${activeCount > 0 ? ` (${activeCount} YazdÄ±rÄ±lÄ±yor)` : ''}`
              : `${completedCount} Jobs Completed${activeCount > 0 ? ` (${activeCount} Printing)` : ''}`;
          })()}
        </text>
      )}

      {/* IoT Kind label */}
      {device.type === 'iot' && (
        (() => {
          const kind = device.iot?.kind || 'sensor';
          const kindLabel = isTR
            ? (kind === 'lamp' ? 'Lamba' : kind === 'heater' ? 'IsÄ±tÄ±cÄ±' : kind === 'cooler' ? 'SoÄŸutucu' : 'SensÃ¶r')
            : (kind === 'lamp' ? 'Lamp' : kind === 'heater' ? 'Heater' : kind === 'cooler' ? 'Cooler' : 'Sensor');

          return (
            <text
              x={deviceWidth / 2}
              y={46}
              style={{ fill: isDark ? 'var(--color-secondary-300)' : 'var(--color-secondary-500)' }}
              fontSize="8"
              textAnchor="middle"
              className="select-none pointer-events-none italic opacity-80"
            >
              ({kindLabel})
            </text>
          );
        })()
      )}

      {/* IoT Value */}
      {device.type === 'iot' && (
        (() => {
          const isIotPoweredOff = device.status === 'offline';
          const isPassive = device.iot?.collaborationEnabled === false;
          if (isIotPoweredOff) {
            return (
              <text x={deviceWidth / 2} y={70} style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} fontSize="10" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none" filter={`drop-shadow(0px 0px 1px ${colors.common.black})`}>
                <tspan x={deviceWidth / 2} dy="6">{isTR ? 'KapalÄ±' : 'Off'}</tspan>
              </text>
            );
          }
          if (isPassive) {
            return (
              <text x={deviceWidth / 2} y={70} style={{ fill: isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)' }} fontSize="10" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none" filter={`drop-shadow(0px 0px 1px ${colors.common.black})`}>
                <tspan x={deviceWidth / 2} dy="6">{t.passive}</tspan>
              </text>
            );
          }

          const kind = device.iot?.kind;
          const sensorType = device.iot?.sensorType || 'temperature';
          const value = getIotMeasuredValue(device);
          const isControllable = kind === 'lamp' || kind === 'heater' || kind === 'cooler';

          if (isControllable) {
            const isActive = device.iot?.value ?? false;
            const statusColor = isActive ? (isDark ? 'var(--color-warning-400)' : 'var(--color-warning-500)') : (isDark ? 'var(--color-secondary-400)' : 'var(--color-secondary-500)');
            return (
              <text x={deviceWidth / 2} y={70} style={{ fill: statusColor }} fontSize="10" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none" filter={`drop-shadow(0px 0px 1px ${colors.common.black})`}>
                <tspan x={deviceWidth / 2} dy="6">{value}</tspan>
              </text>
            );
          }

          switch (sensorType) {
            case 'temperature':
              return (
                <text x={deviceWidth / 2} y={70} style={{ fill: isDark ? 'var(--color-success-400)' : 'var(--color-success-600)' }} fontSize="10" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none" filter={`drop-shadow(0px 0px 1px ${colors.common.black})`}>
                  <tspan x={deviceWidth / 2} dy="0">{t.temperature}:</tspan>
                  <tspan x={deviceWidth / 2} dy="12">{value}</tspan>
                </text>
              );
            case 'humidity':
              return (
                <text x={deviceWidth / 2} y={70} style={{ fill: isDark ? 'var(--color-primary-500)' : 'var(--color-primary-600)' }} fontSize="10" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none" filter={`drop-shadow(0px 0px 1px ${colors.common.black})`}>
                  <tspan x={deviceWidth / 2} dy="0">{t.humidity}:</tspan>
                  <tspan x={deviceWidth / 2} dy="12">{value}</tspan>
                </text>
              );
            case 'light':
              return (
                <text x={deviceWidth / 2} y={70} style={{ fill: isDark ? 'var(--color-warning-400)' : 'var(--color-warning-500)' }} fontSize="10" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none" filter={`drop-shadow(0px 0px 1px ${colors.common.black})`}>
                  <tspan x={deviceWidth / 2} dy="0">{t.lightLevel}:</tspan>
                  <tspan x={deviceWidth / 2} dy="12">{value}</tspan>
                </text>
              );
            case 'sound':
              return (
                <text x={deviceWidth / 2} y={70} style={{ fill: isDark ? 'var(--color-warning-600)' : 'var(--color-warning-600)' }} fontSize="10" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none" filter={`drop-shadow(0px 0px 1px ${colors.common.black})`}>
                  <tspan x={deviceWidth / 2} dy="0">{t.sensorSound}:</tspan>
                  <tspan x={deviceWidth / 2} dy="12">{value}</tspan>
                </text>
              );
            case 'motion':
              return (
                <text x={deviceWidth / 2} y={70} style={{ fill: isDark ? 'var(--color-secondary-600)' : 'var(--color-secondary-600)' }} fontSize="10" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none" filter={`drop-shadow(0px 0px 1px ${colors.common.black})`}>
                  <tspan x={deviceWidth / 2} dy="0">{t.sensorMotion}:</tspan>
                  <tspan x={deviceWidth / 2} dy="12">{value}</tspan>
                </text>
              );
            default:
              return (
                <text x={deviceWidth / 2} y={70} style={{ fill: isDark ? 'var(--color-secondary-600)' : 'var(--color-secondary-600)' }} fontSize="9" textAnchor="middle" fontFamily="var(--font-geist-mono)" className="select-none pointer-events-none" filter={`drop-shadow(0px 0px 1px ${colors.common.black})`}>
                  {value}
                </text>
              );
          }
        })()
      )}
    </>
  );
}
