import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVersionCheck } from '@/hooks/useVersionCheck';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import { toast } from '@/hooks/use-toast';

describe('useVersionCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should notify user when a newer version is detected', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ latestVersion: '99.0.0' }),
    } as Response);

    renderHook(() => useVersionCheck('tr'));

    // Advance the initial 3s timer and let the async fetch callback settle.
    await vi.advanceTimersByTimeAsync(3500);

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '⚡ Yeni Sürüm Mevcut!',
        variant: 'default',
      })
    );
  });

  it('should not notify when version is current', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ latestVersion: '1.0.0' }),
    } as Response);

    renderHook(() => useVersionCheck('tr'));

    // Same as above: the fetch must settle for this to be a real assertion.
    await vi.advanceTimersByTimeAsync(3500);

    expect(toast).not.toHaveBeenCalled();
  });
});
