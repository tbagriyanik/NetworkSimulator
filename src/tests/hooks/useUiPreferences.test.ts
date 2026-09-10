import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUiPreferences } from '@/hooks/useUiPreferences';

describe('useUiPreferences Hook', () => {
  beforeEach(() => {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.clear();
    }
  });

  it('should return default UI preferences initially', () => {
    const { result } = renderHook(() => useUiPreferences());
    expect(result.current.preferences.showMinimap).toBe(true);
    expect(result.current.preferences.showZoomToolbar).toBe(true);
    expect(result.current.preferences.showEventLogs).toBe(true);
    expect(result.current.preferences.showFooter).toBe(true);
    expect(result.current.preferences.showDevicePopovers).toBe(true);
  });

  it('should update preference value and toggle sections', () => {
    const { result } = renderHook(() => useUiPreferences());

    act(() => {
      result.current.updatePreference('showMinimap', false);
      result.current.updatePreference('showFooter', false);
    });

    expect(result.current.preferences.showMinimap).toBe(false);
    expect(result.current.preferences.showFooter).toBe(false);
    expect(result.current.preferences.showZoomToolbar).toBe(true);
  });

  it('should reset preferences to defaults on reset', () => {
    const { result } = renderHook(() => useUiPreferences());

    act(() => {
      result.current.updatePreference('showMinimap', false);
    });
    expect(result.current.preferences.showMinimap).toBe(false);

    act(() => {
      result.current.resetPreferences();
    });
    expect(result.current.preferences.showMinimap).toBe(true);
  });
});
