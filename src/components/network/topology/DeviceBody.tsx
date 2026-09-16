'use client';

import { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { isSwitchDeviceType } from '../NetworkTopology/utils/networkTopology.helpers';
import { isSwitchOrHubDeviceType, getDeviceFill } from './deviceRenderer.helpers';

interface DeviceBodyProps {
  device: CanvasDevice;
  deviceWidth: number;
  deviceHeight: number;
  isDark: boolean;
  isDragging: boolean;
}

export function DeviceBody({ device, deviceWidth, deviceHeight, isDark, isDragging }: DeviceBodyProps) {
  const deviceFill = getDeviceFill(device, isDark);

  return (
    <>
      {/* Device body */}
      {device.type === 'firewall' ? (
        <>
          <defs>
            <filter id="deviceShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity={isDark ? "0.15" : "0.1"} />
            </filter>
          </defs>
          <path
            d={`M 10 0 L ${deviceWidth - 10} 0 Q ${deviceWidth} 0 ${deviceWidth} 10 L ${deviceWidth} ${deviceHeight - 15} L ${deviceWidth / 2} ${deviceHeight} L 0 ${deviceHeight - 15} L 0 10 Q 0 0 10 0 Z`}
            fill={deviceFill}
            style={{ stroke: isDark ? 'var(--color-error-500)' : 'var(--color-secondary-300)' }}
            strokeWidth={1.5}
            className={isDragging ? '' : 'transition-all duration-150'}
            filter="url(#deviceShadow)"
          />
          {/* Shield Icon inside Firewall device */}
          <g transform={`translate(${deviceWidth / 2 - 17}, ${deviceHeight / 2 - 40})`} filter="url(#deviceShadow)">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ stroke: isDark ? 'var(--color-error-200)' : 'var(--color-error-600)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </g>
        </>
      ) : device.type === 'cloud' ? (
        <g>
          <path
            d={`M ${deviceWidth * 0.15} ${deviceHeight - 22}
                A 16 16 0 0 1 ${deviceWidth * 0.30} ${deviceHeight * 0.36}
                A 26 24 0 0 1 ${deviceWidth * 0.82} ${deviceHeight * 0.44}
                A 13 13 0 0 1 ${deviceWidth * 0.85} ${deviceHeight - 22}
                Z`}
            fill={deviceFill}
            style={{ stroke: isDark ? 'var(--color-sky-500)' : 'var(--color-secondary-300)' }}
            strokeWidth={1.5}
            className={isDragging ? '' : 'transition-all duration-150'}
            filter="url(#deviceShadow)"
          />
        </g>
      ) : device.type === 'router' ? (
        <path
          d={`M ${20} 0 L ${deviceWidth - 20} 0 Q ${deviceWidth} 0 ${deviceWidth} 20 L ${deviceWidth} ${deviceHeight} L 0 ${deviceHeight} L 0 20 Q 0 0 20 0`}
          fill={deviceFill}
          style={{ stroke: isDark ? 'var(--color-warning-500)' : 'var(--color-secondary-300)' }}
          strokeWidth={1.5}
          className={isDragging ? '' : 'transition-all duration-150'}
          filter="url(#deviceShadow)"
        />
      ) : device.type === 'mobile' ? (
        <rect
          width={deviceWidth}
          height={deviceHeight}
          rx={14}
          fill={deviceFill}
          style={{ stroke: isDark ? 'var(--color-sky-400)' : 'var(--color-sky-500)' }}
          strokeWidth={1.5}
          className={isDragging ? '' : 'transition-all duration-150'}
          filter="url(#deviceShadow)"
        />
      ) : device.type === 'printer' ? (
        <path
          d={`M 12 0 L ${deviceWidth - 12} 0 Q ${deviceWidth} 0 ${deviceWidth} 10 L ${deviceWidth} ${deviceHeight - 6} Q ${deviceWidth} ${deviceHeight} ${deviceWidth - 6} ${deviceHeight} L 6 ${deviceHeight} Q 0 ${deviceHeight} 0 ${deviceHeight - 6} L 0 10 Q 0 0 12 0 Z`}
          fill={deviceFill}
          style={{ stroke: isDark ? 'var(--color-amber-500)' : 'var(--color-secondary-300)' }}
          strokeWidth={1.5}
          className={isDragging ? '' : 'transition-all duration-150'}
          filter="url(#deviceShadow)"
        />
      ) : device.type === 'iot' ? (
        <path
          d={`M 0 0 L ${deviceWidth - 8} 0 Q ${deviceWidth} 0 ${deviceWidth} 8 L ${deviceWidth} ${deviceHeight} L 8 ${deviceHeight} Q 0 ${deviceHeight} 0 ${deviceHeight - 8} L 0 0 Z`}
          fill={deviceFill}
          style={{ stroke: isDark ? 'var(--color-secondary-500)' : 'var(--color-secondary-300)' }}
          strokeWidth={1.5}
          className={isDragging ? '' : 'transition-all duration-150'}
          filter="url(#deviceShadow)"
        />
      ) : isSwitchDeviceType(device.type) ? (
        <path
          d={`M 0 0 L ${deviceWidth} 0 L ${deviceWidth} ${deviceHeight - 8} Q ${deviceWidth} ${deviceHeight} ${deviceWidth - 8} ${deviceHeight} L 8 ${deviceHeight} Q 0 ${deviceHeight} 0 ${deviceHeight - 8} L 0 0 Z`}
          fill={deviceFill}
          style={{ stroke: isDark ? 'var(--color-accent-500)' : 'var(--color-secondary-300)' }}
          strokeWidth={1.5}
          className={isDragging ? '' : 'transition-all duration-150'}
          filter="url(#deviceShadow)"
        />
      ) : (
        <rect
          width={deviceWidth}
          height={deviceHeight}
          rx={8}
          fill={deviceFill}
          style={{
            stroke: isDark
              ? ((device.type as string) === 'pc' ? 'var(--color-primary-500)' : (device.type as string) === 'iot' ? 'var(--color-secondary-500)' : (device.type as string) === 'mobile' ? 'var(--color-emerald-500)' : (device.type as string) === 'printer' ? 'var(--color-amber-500)' : (device.type as string) === 'firewall' ? 'var(--color-error-500)' : isSwitchDeviceType(device.type) ? 'var(--color-accent-500)' : (device.type as string) === 'wlc' ? 'var(--color-warning-400)' : 'var(--color-warning-500)')
              : 'var(--color-secondary-300)'
          }}
          strokeWidth={1.5}
          className={isDragging ? '' : 'transition-all duration-150'}
          filter="url(#deviceShadow)"
        />
      )}

      {/* Device body highlight for 3D effect in dark mode */}
      {isDark && device.type !== 'mobile' && device.type !== 'printer' && device.type !== 'cloud' && (
        device.type === 'firewall' ? (
          <path
            d={`M 2 5 Q 2 2 5 2 L ${deviceWidth - 5} 2 Q ${deviceWidth - 2} 2 ${deviceWidth - 2} 5 L ${deviceWidth - 2} ${deviceHeight / 3} L 2 ${deviceHeight / 3} Z`}
            fill="white"
            opacity="0.08"
          />
        ) : device.type === 'router' ? (
          <path
            d={`M ${22} 2 L ${deviceWidth - 22} 2 Q ${deviceWidth - 2} 2 ${deviceWidth - 2} 20 L ${deviceWidth - 2} ${deviceHeight / 3} L 2 ${deviceHeight / 3} L 2 20 Q 2 2 22 2`}
            fill="white"
            opacity="0.08"
          />
        ) : device.type === 'iot' ? (
          <path
            d={`M 2 2 L ${deviceWidth - 2 - 6} 2 Q ${deviceWidth - 2} 2 ${deviceWidth - 2} 8 L ${deviceWidth - 2} ${deviceHeight / 3} L 8 ${deviceHeight / 3} Q 2 ${deviceHeight / 3} 2 ${deviceHeight / 3 - 6} L 2 2 Z`}
            fill="white"
            opacity="0.08"
          />
        ) : isSwitchOrHubDeviceType(device.type) ? (
          <path
            d={`M 2 2 L ${deviceWidth - 2} 2 L ${deviceWidth - 2} ${deviceHeight / 3} L 2 ${deviceHeight / 3} L 2 2 Z`}
            fill="white"
            opacity="0.08"
          />
        ) : (
          <rect
            x={2}
            y={2}
            width={deviceWidth - 4}
            height={deviceHeight / 3}
            rx={6}
            fill="white"
            opacity="0.08"
          />
        )
      )}
    </>
  );
}
