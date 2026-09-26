/**
 * Safe Storage Module
 * Provides resilient, SSR-safe, and private-mode-safe wrappers around localStorage and sessionStorage.
 * Automatically falls back to in-memory storage when storage access is restricted or throws SecurityError / QuotaExceededError.
 */

const memoryStorage = new Map<string, string>();
const memorySessionStorage = new Map<string, string>();

export function isStorageAvailable(type: 'localStorage' | 'sessionStorage' = 'localStorage'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const storage = window[type];
    if (!storage) return false;
    const testKey = `__netsim_storage_test_${type}__`;
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely retrieve an item from localStorage.
 */
export function safeGetItem(key: string, fallback: string | null = null): string | null {
  if (typeof window === 'undefined') return fallback;
  try {
    if (window.localStorage) {
      const val = window.localStorage.getItem(key);
      return val !== null ? val : (memoryStorage.get(key) ?? fallback);
    }
  } catch {
    // Fall back to in-memory store
  }
  return memoryStorage.get(key) ?? fallback;
}

/**
 * Safely write an item to localStorage with quota-exceeded handling.
 */
export function safeSetItem(key: string, value: string): boolean {
  memoryStorage.set(key, value);
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)) {
      try {
        if (key !== 'netsim_history') {
          window.localStorage.removeItem('netsim_history');
        }
        window.localStorage.setItem(key, value);
        return true;
      } catch {
        // Quota exceeded retry failed, memory store remains populated
      }
    }
  }
  return false;
}

/**
 * Safely remove an item from localStorage.
 */
export function safeRemoveItem(key: string): boolean {
  memoryStorage.delete(key);
  if (typeof window === 'undefined') return true;
  try {
    if (window.localStorage) {
      window.localStorage.removeItem(key);
      return true;
    }
  } catch {
    // Suppress error
  }
  return false;
}

/**
 * Safely clear all items from localStorage or in-memory fallback.
 */
export function safeClearStorage(): boolean {
  memoryStorage.clear();
  if (typeof window === 'undefined') return true;
  try {
    if (window.localStorage) {
      window.localStorage.clear();
      return true;
    }
  } catch {
    // Suppress error
  }
  return false;
}

/**
 * Safely parse JSON from localStorage with default fallback.
 */
export function safeGetJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely serialize and store JSON in localStorage.
 */
export function safeSetJSON<T>(key: string, value: T): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

/**
 * Safely get all keys from storage matching an optional prefix.
 */
export function safeGetStorageKeys(prefix?: string): string[] {
  const keys = new Set<string>();
  for (const key of memoryStorage.keys()) {
    if (!prefix || key.startsWith(prefix)) {
      keys.add(key);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (!prefix || key.startsWith(prefix))) {
            keys.add(key);
          }
        }
      }
    } catch {
      // Return memory keys
    }
  }
  return Array.from(keys);
}

/**
 * Safely retrieve an item from sessionStorage.
 */
export function safeGetSessionItem(key: string, fallback: string | null = null): string | null {
  if (typeof window === 'undefined') return fallback;
  try {
    if (window.sessionStorage) {
      const val = window.sessionStorage.getItem(key);
      return val !== null ? val : (memorySessionStorage.get(key) ?? fallback);
    }
  } catch {
    // Fall back to in-memory store
  }
  return memorySessionStorage.get(key) ?? fallback;
}

/**
 * Safely write an item to sessionStorage.
 */
export function safeSetSessionItem(key: string, value: string): boolean {
  memorySessionStorage.set(key, value);
  if (typeof window === 'undefined') return false;
  try {
    if (window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
      return true;
    }
  } catch {
    // Memory store remains populated
  }
  return false;
}

/**
 * Safely remove an item from sessionStorage.
 */
export function safeRemoveSessionItem(key: string): boolean {
  memorySessionStorage.delete(key);
  if (typeof window === 'undefined') return true;
  try {
    if (window.sessionStorage) {
      window.sessionStorage.removeItem(key);
      return true;
    }
  } catch {
    // Suppress error
  }
  return false;
}
