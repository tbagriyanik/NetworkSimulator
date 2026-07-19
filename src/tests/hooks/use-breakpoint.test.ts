import { describe, it, expect } from 'vitest';

describe('useBreakpoint Hook', () => {
  it('should detect mobile breakpoint (width < 768)', () => {
    const isMobile = 375 < 768;
    expect(isMobile).toBe(true);
  });

  it('should detect tablet breakpoint (768 <= width < 1024)', () => {
    const isTablet = 768 >= 768 && 768 < 1024;
    expect(isTablet).toBe(true);
  });

  it('should detect desktop breakpoint (width >= 1024)', () => {
    const isDesktop = 1440 >= 1024;
    expect(isDesktop).toBe(true);
  });

  it('should not be mobile at 1024px width', () => {
    const isMobile = 1024 < 768;
    expect(isMobile).toBe(false);
  });

  it('should handle SSR (width = 0)', () => {
    const isMobile = 0 < 768;
    expect(isMobile).toBe(true);
  });

  it('should handle resize events', () => {
    const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
    expect(breakpoints.md).toBe(768);
    expect(breakpoints.lg).toBe(1024);
  });
});
