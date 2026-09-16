import React from 'react';
import { DeviceType } from '../NetworkTopology/types/networkTopology.types';

export const DEVICE_ICONS: Record<DeviceType | 'switch', React.ReactNode> = {
  pc: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-primary-500)' }} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z" />
    </svg>
  ),
  iot: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-secondary-500)' }} viewBox="0 -2 27 27">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.247 7.761a6 6 0 0 1 0 8.478" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.075 4.933a10 10 0 0 1 0 14.134" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.925 19.067a10 10 0 0 1 0-14.134" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.753 16.239a6 6 0 0 1 0-8.478" />
      <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} cx="12" cy="12" r="2" />
    </svg>
  ),
  switch: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-accent-500)' }} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  switchL2: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-success-500)' }} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  switchL3: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-purple-500)' }} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  router: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-purple-500)' }} viewBox="0 0 24 24">
      <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
    </svg>
  ),
  firewall: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-error-500)' }} viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  ),
  wlc: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-warning-400)' }} viewBox="0 0 24 24" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  hub: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-cyan-500)' }} viewBox="0 0 24 24" strokeWidth={1.5}>
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <circle cx="6" cy="12" r="1" fill="currentColor" />
      <circle cx="10" cy="12" r="1" fill="currentColor" />
      <circle cx="14" cy="12" r="1" fill="currentColor" />
      <circle cx="18" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  cloud: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-sky-500)' }} viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 0 1 4-4 5 5 0 0 1 9.9-1 4 4 0 0 1 2.1 7.9H7a4 4 0 0 1-4-2.9z" />
    </svg>
  ),
  mobile: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-emerald-500)' }} viewBox="0 0 24 24" strokeWidth={1.5}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="11" y1="18" x2="13" y2="18" strokeLinecap="round" />
    </svg>
  ),
  printer: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-amber-500)' }} viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
    </svg>
  ),
};


