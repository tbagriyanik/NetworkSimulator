/**
 * Shared browser-global test helpers.
 *
 * The jsdom environment used by Vitest does not expose a working
 * `globalThis.localStorage`, and `src/tests/setup.ts` deliberately defines the
 * property as `undefined` to silence Node's experimental-storage warning. Tests
 * that need storage previously wrote the property through an
 * `as unknown as { localStorage: unknown }` assertion in every file.
 *
 * These helpers install the globals through `Object.defineProperty` with a
 * value that satisfies the real DOM interface (`Storage`), so no assertion is
 * needed at the call site and the shape is checked by the compiler.
 */

import type { SwitchState } from '@/lib/network/types';
import type { Port } from '@/lib/network/types/ports';
import type { CanvasDevice, CanvasPort } from '@/components/network/NetworkTopology/types/networkTopology.types';

/** In-memory `Storage` implementation backed by a plain object. */
export function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const store: Record<string, string> = { ...seed };

  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
}

/**
 * Install an in-memory `localStorage` on `globalThis` unless a usable one is
 * already present. Returns the storage that callers should assert against.
 */
export function installMemoryLocalStorage(): Storage {
  const existing = globalThis.localStorage as Storage | undefined;
  if (existing && typeof existing.setItem === 'function') {
    return existing;
  }

  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
  return storage;
}

/**
 * Install a minimal `window.dispatchEvent` shim for tests that run outside
 * jsdom. The value satisfies the `Window` member it replaces, so it can be
 * assigned without an `as unknown as` assertion.
 */
export function installWindowDispatchEventShim(): void {
  if (typeof globalThis.window !== 'undefined') return;

  const shim: Pick<Window, 'dispatchEvent'> = {
    dispatchEvent: () => true,
  };

  Object.defineProperty(globalThis, 'window', {
    value: shim,
    configurable: true,
    writable: true,
  });
}/**
 * Build a fully-typed `SwitchState` for tests.
 *
 * `SwitchState` has many required fields, so tests used to assemble a partial
 * object and close the gap with `as unknown as SwitchState`. This factory
 * supplies every required field with a sane default and lets callers override
 * just what the case under test needs — the result is a real `SwitchState`
 * with no assertion.
 */
export function makeSwitchState(overrides: Partial<SwitchState> = {}): SwitchState {
  return {
    hostname: 'TEST-SW',
    macAddress: '00:00:00:00:00:01',
    switchModel: 'NS-L3-24PS',
    switchLayer: 'L3',
    currentMode: 'privileged',
    ports: {},
    vlans: { '1': { id: 1, name: 'default', status: 'active', ports: [] } },
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'] },
      vtyLines: { login: false, transportInput: ['all'] },
    },
    runningConfig: [],
    commandHistory: [],
    historyIndex: -1,
    bootTime: 0,
    ipRouting: true,
    macAddressTable: [],
    arpCache: [],
    version: { nosVersion: '15.0', modelName: 'Test', serialNumber: 'TEST001', uptime: '1 hour' },
    ...overrides,
  };
}

/**
 * Build a `Port` with every required field populated. Callers override the
 * fields the case needs (for example `wifi` for the wireless admin page).
 */
export function makePort(id: string, overrides: Partial<Port> = {}): Port {
  return {
    id,
    name: id,
    status: 'disconnected',
    vlan: 1,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ...overrides,
  };
}/**
 * Build a `CanvasPort` with the three required fields populated.
 * `CanvasDevice.ports` is a `CanvasPort[]`, not a string array, so tests that
 * used `ports: ['Fa0/1']` needed a cast to compile.
 */
export function makeCanvasPort(id: string, overrides: Partial<CanvasPort> = {}): CanvasPort {
  return {
    id,
    label: id,
    status: 'disconnected',
    ...overrides,
  };
}

/**
 * Build a `CanvasDevice` with the required fields populated. `ip` is required
 * on the interface even for switches, which is why partial literals previously
 * had to be forced through `as unknown as CanvasDevice`.
 */
export function makeCanvasDevice(
  overrides: Partial<CanvasDevice> & Pick<CanvasDevice, 'id' | 'type' | 'name'>,
): CanvasDevice {
  return {
    x: 0,
    y: 0,
    status: 'online',
    ports: [],
    ...overrides,
    ip: overrides.ip ?? '0.0.0.0',
  };
}