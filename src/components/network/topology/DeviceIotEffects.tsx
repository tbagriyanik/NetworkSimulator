'use client';

import { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { colors } from '@/lib/design-tokens/colors';

interface DeviceIotEffectsProps {
  device: CanvasDevice;
  deviceWidth: number;
  deviceHeight: number;
  isDark: boolean;
  isSelected: boolean;
  graphicsQuality: 'low' | 'medium' | 'high';
}

export function DeviceIotEffects({ device, deviceWidth, deviceHeight, isDark, isSelected, graphicsQuality }: DeviceIotEffectsProps) {
  if (device.type !== 'iot') return null;

  const isIotEffectivelyOn =
    device.status !== 'offline' &&
    device.iot?.collaborationEnabled !== false &&
    device.iot?.value === true;

  const iotGlowColor = isIotEffectivelyOn
    ? (device.iot?.kind === 'lamp'
      ? 'var(--color-warning-400)'
      : device.iot?.kind === 'cooler'
        ? 'var(--color-accent-400)'
        : device.iot?.kind === 'heater'
          ? 'var(--color-error-500)'
          : null)
    : null;

  const sensorVisible = device.status !== 'offline' && device.iot?.collaborationEnabled !== false;

  return (
    <>
      {/* Radius indicator for motion/sound sensors */}
      {sensorVisible && (
        <>
          {device.iot?.sensorType === 'motion' && (
            <>
              <circle
                cx={deviceWidth / 2}
                cy={deviceHeight / 2}
                r={75}
                fill={colors.cables.wireless}
                fillOpacity={isDark ? 0.05 : 0.05}
                stroke={colors.cables.wireless}
                strokeOpacity={isDark ? 0.15 : 0.1}
                strokeWidth="1"
                strokeDasharray="4 2"
                style={{ pointerEvents: 'none' }}
              />
              {graphicsQuality === 'high' && device.iot?.value === true && (
                <>
                  <circle
                    cx={deviceWidth / 2}
                    cy={deviceHeight / 2}
                    r={20}
                    fill="none"
                    stroke={colors.cables.wireless}
                    strokeOpacity={isDark ? 0.6 : 0.5}
                    strokeWidth="2"
                    className="iot-motion-ping"
                    style={{ pointerEvents: 'none', transformOrigin: `${deviceWidth / 2}px ${deviceHeight / 2}px` }}
                  />
                  <circle
                    cx={deviceWidth / 2}
                    cy={deviceHeight / 2}
                    r={20}
                    fill="none"
                    stroke={colors.cables.wireless}
                    strokeOpacity={isDark ? 0.4 : 0.3}
                    strokeWidth="2"
                    className="iot-motion-ping-delayed"
                    style={{ pointerEvents: 'none', transformOrigin: `${deviceWidth / 2}px ${deviceHeight / 2}px` }}
                  />
                </>
              )}
            </>
          )}
          {device.iot?.sensorType === 'sound' && (
            <>
              {(() => {
                const dBValue = typeof device.iot?.value === 'number' ? device.iot.value : 0;
                const radius = Math.min(150, 50 + (dBValue / 120) * 100);
                const opacity = 0.1 + (dBValue / 120) * 0.3;

                return (
                  <circle
                    cx={deviceWidth / 2}
                    cy={deviceHeight / 2}
                    r={radius}
                    fill={colors.cables.active}
                    fillOpacity={isDark ? opacity * 0.5 : opacity * 0.3}
                    stroke={colors.cables.active}
                    strokeOpacity={isDark ? opacity : opacity * 0.8}
                    strokeWidth="1"
                    strokeDasharray="4 2"
                    className={graphicsQuality === 'high' ? 'iot-sound-pulse' : ''}
                    style={{ pointerEvents: 'none', ...(graphicsQuality === 'high' ? { transformOrigin: `${deviceWidth / 2}px ${deviceHeight / 2}px` } : {}) }}
                  />
                );
              })()}
            </>
          )}
        </>
      )}

      {/* IoT glow border */}
      {iotGlowColor && (
        <path
          d={`M -6 -6 L ${deviceWidth + 6 - 10} -6 Q ${deviceWidth + 6} -6 ${deviceWidth + 6} 8 L ${deviceWidth + 6} ${deviceHeight + 6} L 8 ${deviceHeight + 6} Q -6 ${deviceHeight + 6} -6 ${deviceHeight + 6 - 10} L -6 -6 Z`}
          fill="none"
          stroke={iotGlowColor}
          strokeWidth="7"
          opacity={isSelected ? 0.4 : 0.7}
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 2px ${iotGlowColor})` }}
        />
      )}
    </>
  );
}
