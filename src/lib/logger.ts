const IS_DEV = process.env.NODE_ENV === 'development';

const LOG_PREFIX = {
  debug: '[DEBUG]',
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
};

function shouldLog(): boolean {
  return IS_DEV;
}

function formatMessage(prefix: string, message: unknown, ..._args: unknown[]): string {
  const msg = typeof message === 'string' ? message : JSON.stringify(message);
  return `${prefix} ${msg}`;
}

export const logger = {
  debug(message: unknown, ...args: unknown[]): void {
    if (shouldLog()) {
      console.debug(formatMessage(LOG_PREFIX.debug, message), ...args);
    }
  },

  info(message: unknown, ...args: unknown[]): void {
    if (shouldLog()) {
      console.info(formatMessage(LOG_PREFIX.info, message), ...args);
    }
  },

  warn(message: unknown, ...args: unknown[]): void {
    if (shouldLog()) {
      console.warn(formatMessage(LOG_PREFIX.warn, message), ...args);
    }
  },

  error(message: unknown, ...args: unknown[]): void {
    console.error(formatMessage(LOG_PREFIX.error, message), ...args);
  },
};

import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage/safeStorage';

export function getFromStorage(key: string, storage: Storage | null = null): string | null {
  if (storage) {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }
  return safeGetItem(key);
}

export function setToStorage(key: string, value: string, storage: Storage | null = null): boolean {
  if (storage) {
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
  return safeSetItem(key, value);
}

export function removeFromStorage(key: string, storage: Storage | null = null): boolean {
  if (storage) {
    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
  return safeRemoveItem(key);
}
