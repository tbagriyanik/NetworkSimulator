const IS_DEV = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_PREFIX = {
  debug: '[DEBUG]',
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
};

function shouldLog(): boolean {
  return IS_DEV;
}

function formatMessage(prefix: string, message: unknown, ...args: unknown[]): string {
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

export function safeLocalStorage(): Storage | null {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return localStorage;
  } catch {
    return null;
  }
}

export function safeSessionStorage(): Storage | null {
  try {
    const test = '__storage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return sessionStorage;
  } catch {
    return null;
  }
}

export function getFromStorage(key: string, storage: Storage | null = null): string | null {
  try {
    const s = storage ?? safeLocalStorage();
    if (!s) return null;
    return s.getItem(key);
  } catch {
    return null;
  }
}

export function setToStorage(key: string, value: string, storage: Storage | null = null): boolean {
  try {
    const s = storage ?? safeLocalStorage();
    if (!s) return false;
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeFromStorage(key: string, storage: Storage | null = null): boolean {
  try {
    const s = storage ?? safeLocalStorage();
    if (!s) return false;
    s.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
