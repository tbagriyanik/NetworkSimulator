import React from 'react';
import { STATUS_COLORS } from '../networkTopology.constants';

interface DeviceIconSvgProps {
  type: string;
  isPoweredOff: boolean;
  isDark: boolean;
  activeVoipCall?: { status: string; callerId: string } | null;
  deviceId?: string;
  name?: string;
  iotSensorType?: string;
  iotMeasuredValue?: string;
  switchModel?: string;
}

export const DeviceIconSvg: React.FC<DeviceIconSvgProps> = React.memo(({
  type,
  isPoweredOff,
  isDark,
  activeVoipCall,
  deviceId,
  name,
  iotSensorType,
  iotMeasuredValue,
  switchModel
}) => {
  const isSwitchDeviceType = (t: string) => t === 'switchL2' || t === 'switchL3';

  if (type === 'pc') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ stroke: isPoweredOff ? STATUS_COLORS.offline : isDark ? 'var(--color-primary-200)' : 'var(--color-primary-700)' }} strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z" />
      </svg>
    );
  }

  if (type === 'mobile') {
    return (
      <g>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ stroke: isPoweredOff ? STATUS_COLORS.offline : (activeVoipCall ? (activeVoipCall.status === 'ringing' ? 'var(--color-warning-500)' : 'var(--color-success-500)') : (isDark ? 'var(--color-sky-300)' : 'var(--color-sky-600)')) }} strokeWidth="1.5">
          <rect x="7" y="2" width="10" height="20" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="11" y1="18" x2="13" y2="18" strokeLinecap="round" />
          <line x1="10" y1="5" x2="14" y2="5" strokeLinecap="round" />
        </svg>
        {activeVoipCall && (
          (() => {
            const isCaller = activeVoipCall.callerId === deviceId;
            const isRinging = activeVoipCall.status === 'ringing';
            const badgeBg = isRinging ? 'var(--color-amber-500)' : 'var(--color-emerald-500)';
            return (
              <g transform="translate(-10, -6)">
                <circle cx="8" cy="8" r="9" fill={badgeBg} />
                <path d="M3.5 3.5C3.5 3.22 3.72 3 4 3H5.3C5.54 3 5.74 3.17 5.79 3.41L6.18 5.37C6.22 5.59 6.14 5.81 5.97 5.95L5.11 6.67C5.77 8.01 6.87 9.1 8.21 9.77L8.93 8.91C9.07 8.74 9.29 8.66 9.51 8.7L11.47 9.09C11.71 9.14 11.88 9.34 11.88 9.58V10.88C11.88 11.16 11.66 11.38 11.38 11.38C7.03 11.38 3.5 7.85 3.5 3.5Z" fill="white" />
                {isCaller ? (
                  <path d="M11 1L16 1L16 6M16 1L11 6" stroke="var(--color-success-500)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M16 6L11 6L11 1M11 6L16 1" stroke="var(--color-error-500)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </g>
            );
          })()
        )}
      </g>
    );
  }

  if (type === 'printer') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ stroke: isPoweredOff ? STATUS_COLORS.offline : isDark ? 'var(--color-pink-200)' : 'var(--color-pink-700)' }} strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
      </svg>
    );
  }

  if (type === 'hub') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ stroke: isPoweredOff ? STATUS_COLORS.offline : isDark ? 'var(--color-teal-200)' : 'var(--color-teal-700)' }} strokeWidth="1.5">
        <rect x="2" y="7" width="20" height="10" rx="2" />
        <circle cx="6" cy="12" r="1" fill="currentColor" />
        <circle cx="10" cy="12" r="1" fill="currentColor" />
        <circle cx="14" cy="12" r="1" fill="currentColor" />
        <circle cx="18" cy="12" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (type === 'iot') {
    return (
      <svg width="32" height="32" viewBox="0 -2 27 27" fill="none" style={{ stroke: isPoweredOff ? STATUS_COLORS.offline : isDark ? 'var(--color-warning-100)' : 'var(--color-warning-800)' }} strokeWidth="1.5">
        <title>{`${name || 'IoT'} • ${iotSensorType || 'sensor'} • ${iotMeasuredValue || ''}`}</title>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.247 7.761a6 6 0 0 1 0 8.478" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.075 4.933a10 10 0 0 1 0 14.134" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.925 19.067a10 10 0 0 1 0-14.134" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.753 16.239a6 6 0 0 1 0-8.478" />
        <circle strokeLinecap="round" strokeLinejoin="round" cx="12" cy="12" r="2" />
      </svg>
    );
  }

  if (isSwitchDeviceType(type)) {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ stroke: isPoweredOff ? STATUS_COLORS.offline : (type === 'switchL3' || switchModel === 'NS-L3-24PS' ? (isDark ? 'var(--color-purple-200)' : 'var(--color-purple-700)') : (isDark ? 'var(--color-accent-200)' : 'var(--color-accent-700)')) }} strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
      </svg>
    );
  }

  if (type === 'router') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ stroke: isPoweredOff ? STATUS_COLORS.offline : isDark ? 'var(--color-purple-200)' : 'var(--color-purple-700)' }} strokeWidth="1.5">
        <circle strokeLinecap="round" strokeLinejoin="round" cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
      </svg>
    );
  }

  if (type === 'wlc') {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ stroke: isPoweredOff ? STATUS_COLORS.offline : isDark ? 'var(--color-indigo-200)' : 'var(--color-indigo-600)' }} strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
      </svg>
    );
  }

  return null;
});
