'use client';

import { useState, useEffect, useCallback } from 'react';
import { breakpoints as designTokenBreakpoints, getBreakpointFromWidth as getDesignTokenBreakpoint } from '@/lib/design-tokens';
import type { Breakpoint as DesignBreakpoint } from '@/lib/design-tokens';

export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';

export interface BreakpointState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: DesignBreakpoint;
  deviceCategory: DeviceCategory;
}

// Unified breakpoint values (from design-tokens)
const MOBILE_MAX = designTokenBreakpoints.mobile.max;      // 640
const TABLET_MIN = designTokenBreakpoints.tablet.min;       // 641
const TABLET_MAX = designTokenBreakpoints.tablet.max;       // 1024
const DESKTOP_MIN = designTokenBreakpoints.desktop.min;     // 1025

function getDeviceCategory(width: number): DeviceCategory {
  if (width <= MOBILE_MAX) return 'mobile';
  if (width >= TABLET_MIN && width <= TABLET_MAX) return 'tablet';
  return 'desktop';
}

function getBreakpointInfo(width: number) {
  const deviceCategory = getDeviceCategory(width);
  return {
    isMobile: deviceCategory === 'mobile',
    isTablet: deviceCategory === 'tablet',
    isDesktop: deviceCategory === 'desktop',
    breakpoint: getDesignTokenBreakpoint(width),
    deviceCategory,
  };
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768, isMobile: false, isTablet: false, isDesktop: true, breakpoint: 'desktop', deviceCategory: 'desktop' };
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    return { width, height, ...getBreakpointInfo(width) };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setState(prev => {
        const info = getBreakpointInfo(width);
        if (prev.width === width && prev.height === height && prev.isMobile === info.isMobile) return prev;
        return { ...prev, width, height, ...info };
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}

// Convenience hooks
export function useIsMobile(): boolean {
  const { isMobile } = useBreakpoint();
  return isMobile;
}

export function useIsTablet(): boolean {
  const { isTablet } = useBreakpoint();
  return isTablet;
}

export function useIsDesktop(): boolean {
  const { isDesktop } = useBreakpoint();
  return isDesktop;
}

export function useDeviceCategory(): DeviceCategory {
  const { deviceCategory } = useBreakpoint();
  return deviceCategory;
}

export function useResponsiveValue<T>(values: { mobile?: T; tablet?: T; desktop?: T }): T | undefined {
  const { deviceCategory } = useBreakpoint();
  return values[deviceCategory];
}
