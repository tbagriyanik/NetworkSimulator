import { logger } from '@/lib/logger';
import { safeGetItem, safeSetItem, safeRemoveItem, safeClearStorage } from './safeStorage';

/**
 * Secure Storage Wrapper
 * Adds a basic layer of obfuscation (XOR + Base64) to localStorage to prevent casual tampering.
 */

const LEGACY_SECRET_KEY = 'netsim_secure_storage_key';
const PREFIX = 'ENC:';
const DEVICE_SALT_KEY = 'netsim_secure_storage_device_salt';

function hashKey(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${hash >>> 0}-${input.length}`;
}

function getDeviceSalt(): string {
  try {
    const stored = safeGetItem(DEVICE_SALT_KEY);
    if (stored) return stored;
    const bytes = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    }
    const salt = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    safeSetItem(DEVICE_SALT_KEY, salt);
    return salt;
  } catch {
    return 'fallback-device-salt';
  }
}

function getBaseFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  return [
    navigator.userAgent,
    navigator.platform,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
}

function getCandidateKeys(): string[] {
  const keys: string[] = [LEGACY_SECRET_KEY];

  if (typeof window !== 'undefined') {
    const salt = getDeviceSalt();
    const baseFingerprint = getBaseFingerprint();

    // 1. Primary stable key (base fingerprint + device salt)
    keys.push(hashKey(`${LEGACY_SECRET_KEY}|${baseFingerprint}|${salt}`));

    // 2. Legacy key with screen metrics & current devicePixelRatio (if previously encoded this way)
    if (window.screen) {
      const screenFingerprint = [
        baseFingerprint,
        window.screen.width,
        window.screen.height,
        window.devicePixelRatio,
      ].join('|');
      keys.push(hashKey(`${LEGACY_SECRET_KEY}|${screenFingerprint}|${salt}`));

      // 3. Screen metrics with 100% zoom (devicePixelRatio = 1)
      const unzoomedFingerprint = [
        baseFingerprint,
        window.screen.width,
        window.screen.height,
        1,
      ].join('|');
      keys.push(hashKey(`${LEGACY_SECRET_KEY}|${unzoomedFingerprint}|${salt}`));
    }

    // 4. Fallback salt keys
    keys.push(hashKey(`${LEGACY_SECRET_KEY}|${baseFingerprint}|fallback-device-salt`));
    keys.push(hashKey(`${LEGACY_SECRET_KEY}|${salt}`));
    keys.push(hashKey(`${LEGACY_SECRET_KEY}|fallback-device-salt`));
  }

  // Deduplicate while preserving trial order
  return Array.from(new Set(keys));
}

function getSecretKey(): string {
  return LEGACY_SECRET_KEY;
}

function xorCipher(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function safeDecodeURIComponent(uri: string): string | null {
  try {
    return decodeURIComponent(uri);
  } catch {
    return null;
  }
}

function encode(data: string): string {
  try {
    // Use encodeURIComponent to handle non-ascii characters properly.
    const uriEncoded = encodeURIComponent(data);
    const xorData = xorCipher(uriEncoded, getSecretKey());
    return PREFIX + btoa(xorData);
  } catch (e) {
    logger.warn('Error encoding data in secureStorage', e);
    return data;
  }
}

function decode(data: string, maxDepth: number = 3): string | null {
  if (typeof data !== 'string') return null;
  // Fallback to legacy plain text for backward compatibility
  if (!data.startsWith(PREFIX)) {
    return data;
  }
  if (maxDepth <= 0) {
    return null;
  }

  const base64Data = data.substring(PREFIX.length);
  let xorData: string;
  try {
    xorData = atob(base64Data);
  } catch (error) {
    logger.warn('Failed to decode base64 in secureStorage', error);
    return null;
  }

  const candidateKeys = getCandidateKeys();
  for (const key of candidateKeys) {
    try {
      const decodedUri = xorCipher(xorData, key);
      const decoded = safeDecodeURIComponent(decodedUri);
      if (decoded !== null) {
        // If data was double-encoded historically, recursively unwrap inner layer
        if (decoded.startsWith(PREFIX)) {
          const inner = decode(decoded, maxDepth - 1);
          if (inner !== null) return inner;
        }
        return decoded;
      }
    } catch {
      // Continue to next candidate key
    }
  }

  // If candidate keys fail, attempt safe decode on raw base64 data as fallback
  try {
    const rawDecoded = safeDecodeURIComponent(xorData);
    if (rawDecoded !== null) {
      return rawDecoded;
    }
  } catch {
    // Ignore fallback failure
  }

  logger.warn('Unable to decode secureStorage payload with candidate keys');
  return null;
}

export const secureStorage = {
  setItem(key: string, value: string): void {
    try {
      const encoded = encode(value);
      safeSetItem(key, encoded);
    } catch (e) {
      logger.warn(`Error setting secureStorage key ${key}`, e);
    }
  },

  getItem(key: string): string | null {
    try {
      const value = safeGetItem(key);
      if (value === null) return null;
      return decode(value);
    } catch (e) {
      logger.warn(`Error getting secureStorage key ${key}`, e);
      return null;
    }
  },

  removeItem(key: string): void {
    try {
      safeRemoveItem(key);
    } catch (e) {
      logger.warn(`Error removing secureStorage key ${key}`, e);
    }
  },

  clear(): void {
    try {
      safeClearStorage();
    } catch (e) {
      logger.warn('Error clearing secureStorage', e);
    }
  }
};


