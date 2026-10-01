'use client';

/**
 * Shared subscription for the `focus-device` window event.
 *
 * Every rendered device used to register its own `window` listener, so a
 * topology with N devices meant N listeners being invoked on each focus event
 * and N closures kept alive for the lifetime of the canvas. This module keeps
 * a single listener and dispatches straight to the one subscriber that cares,
 * so the cost is independent of how many devices are on screen.
 */

type FocusListener = (deviceId: string) => void;

const listeners = new Map<string, Set<FocusListener>>();
let windowListenerAttached = false;

function handleWindowFocusDevice(event: Event) {
  const deviceId = (event as CustomEvent<{ deviceId?: string }>).detail?.deviceId;
  if (!deviceId) return;
  const bucket = listeners.get(deviceId);
  if (!bucket) return;
  // Copy first: a listener may unsubscribe while we iterate.
  Array.from(bucket).forEach((listener) => listener(deviceId));
}

/**
 * Subscribes to focus events for a single device. Returns an unsubscribe
 * function. The shared window listener is attached on first subscription and
 * detached again once nobody is listening.
 */
export function subscribeFocusDevice(deviceId: string, listener: FocusListener): () => void {
  if (typeof window === 'undefined') return () => {};

  if (!windowListenerAttached) {
    window.addEventListener('focus-device', handleWindowFocusDevice);
    windowListenerAttached = true;
  }

  let bucket = listeners.get(deviceId);
  if (!bucket) {
    bucket = new Set<FocusListener>();
    listeners.set(deviceId, bucket);
  }
  bucket.add(listener);

  return () => {
    const current = listeners.get(deviceId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      listeners.delete(deviceId);
    }
    if (windowListenerAttached && listeners.size === 0) {
      window.removeEventListener('focus-device', handleWindowFocusDevice);
      windowListenerAttached = false;
    }
  };
}

/** Dispatches a focus event. Mirrors the previous `window.dispatchEvent` usage. */
export function dispatchFocusDevice(deviceId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('focus-device', { detail: { deviceId } }));
}
