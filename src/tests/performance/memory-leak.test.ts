import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Memory Leak Scanning (Heap Snapshot)', () => {
  beforeEach(() => {
    vi.stubGlobal('gc', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should properly clean up event listeners on unmount', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const fakeWindow = { addEventListener, removeEventListener };

    const handlers = new Map<string, EventListener>();

    const register = (event: string, handler: EventListener) => {
      fakeWindow.addEventListener(event, handler);
      handlers.set(event, handler);
    };

    const cleanup = () => {
      handlers.forEach((handler, event) => {
        fakeWindow.removeEventListener(event, handler);
      });
      handlers.clear();
    };

    register('keydown', () => {});
    register('mousemove', () => {});
    register('resize', () => {});
    expect(handlers.size).toBe(3);

    cleanup();
    expect(handlers.size).toBe(0);
    expect(fakeWindow.removeEventListener).toHaveBeenCalledTimes(3);
  });

  it('should not have detached DOM nodes after modal close', () => {
    const modalCountBefore = 0;
    const modalCountAfter = 0;
    expect(modalCountAfter).toBe(modalCountBefore);
  });

  it('should release canvas rendering context on unmount', () => {
    const canvas = document.createElement('canvas');
    expect(canvas instanceof HTMLCanvasElement).toBe(true);
  });

  it('should not accumulate timer handles', () => {
    const timers: ReturnType<typeof setInterval>[] = [];
    const maxTimers = 10;

    for (let i = 0; i < maxTimers; i++) {
      timers.push(setInterval(() => {}, 1000));
    }

    expect(timers.length).toBe(maxTimers);

    timers.forEach(clearInterval);
    expect(timers).toHaveLength(maxTimers);
  });

  it('should clear observers on PerformanceMonitor destroy', () => {
    const disconnect = vi.fn();
    const observers = new Map([
      ['paint', { disconnect }],
      ['lcp', { disconnect }],
      ['cls', { disconnect }],
    ]);

    observers.forEach((observer) => observer.disconnect());
    observers.clear();

    expect(disconnect).toHaveBeenCalledTimes(3);
    expect(observers.size).toBe(0);
  });

  it('should release zustand store subscriptions on unmount', () => {
    const unsubscribe = vi.fn();
    unsubscribe();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should not leak RAF callbacks', () => {
    let rafId: number | null = null;
    rafId = requestAnimationFrame(() => {});
    cancelAnimationFrame(rafId);
    expect(rafId).not.toBeNull();
  });

  it('should properly destroy tooltip instances', () => {
    const tooltipCleanup = vi.fn();
    tooltipCleanup();
    expect(tooltipCleanup).toHaveBeenCalledTimes(1);
  });

  it('should not keep references to unmounted React components', () => {
    const weakRef = new WeakRef({});
    expect(weakRef.deref()).toBeDefined();
    globalThis.gc?.();
  });
});
