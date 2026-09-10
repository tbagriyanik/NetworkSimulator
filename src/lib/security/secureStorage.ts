/**
 * Web Crypto API (AES-GCM) secure storage utility.
 * Provides hardware-accelerated, authenticated encryption for sensitive client-side data.
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
const KEY_LENGTH = 256;
const IV_LENGTH_BYTES = 12;
const SALT_BYTES = 16;
const PBKDF2_ITERATIONS = 100000;

// Device-bound salt stored in localStorage to keep consistent key derivation
const SALT_STORAGE_KEY = '__ns_sec_salt__';

function getOrCreateSalt(): Uint8Array {
  if (typeof window === 'undefined') {
    return new Uint8Array(SALT_BYTES);
  }

  let existing = localStorage.getItem(SALT_STORAGE_KEY);
  if (!existing) {
    const saltBytes = new Uint8Array(SALT_BYTES);
    crypto.getRandomValues(saltBytes);
    existing = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    try {
      localStorage.setItem(SALT_STORAGE_KEY, existing);
    } catch {
      // Ignore quota errors
    }
  }

  const matches = existing.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(SALT_BYTES);
  return new Uint8Array(matches.map(byteHex => parseInt(byteHex, 16)));
}

async function deriveCryptoKey(secretPassphrase?: string): Promise<CryptoKey> {
  const salt = getOrCreateSalt();
  const pass = secretPassphrase || (typeof window !== 'undefined' ? window.location.hostname : 'ns-default-secret');
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pass),
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plain text payload using AES-GCM.
 * Returns Base64-encoded string containing IV + CipherText.
 */
export async function encryptData(plainText: string, secretPassphrase?: string): Promise<string> {
  if (typeof window === 'undefined' || !crypto.subtle) {
    // Fallback for non-browser / SSG environments
    return btoa(encodeURIComponent(plainText));
  }

  try {
    const key = await deriveCryptoKey(secretPassphrase);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
    const encoder = new TextEncoder();
    const encodedPayload = encoder.encode(plainText);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      encodedPayload
    );

    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.warn('Secure storage encryption fallback triggered:', err);
    return btoa(encodeURIComponent(plainText));
  }
}

/**
 * Decrypts a Base64-encoded payload (IV + CipherText) using AES-GCM.
 */
export async function decryptData(cipherTextWithIv: string, secretPassphrase?: string): Promise<string | null> {
  if (!cipherTextWithIv) return null;

  if (typeof window === 'undefined' || !crypto.subtle) {
    try {
      return decodeURIComponent(atob(cipherTextWithIv));
    } catch {
      return null;
    }
  }

  try {
    const combinedBinary = atob(cipherTextWithIv);
    const combined = new Uint8Array(combinedBinary.length);
    for (let i = 0; i < combinedBinary.length; i++) {
      combined[i] = combinedBinary.charCodeAt(i);
    }

    if (combined.length <= IV_LENGTH_BYTES) {
      return null;
    }

    const iv = combined.slice(0, IV_LENGTH_BYTES);
    const cipherText = combined.slice(IV_LENGTH_BYTES);

    const key = await deriveCryptoKey(secretPassphrase);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      cipherText
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    // Fallback for legacy obfuscated payload formats (Base64 / URL encoded)
    try {
      return decodeURIComponent(atob(cipherTextWithIv));
    } catch {
      return null;
    }
  }
}

/**
 * Saves JSON-serializable data to localStorage encrypted with AES-GCM.
 */
export async function setSecureItem(key: string, value: unknown): Promise<void> {
  if (typeof window === 'undefined') return;
  const jsonString = JSON.stringify(value);
  const encrypted = await encryptData(jsonString);
  localStorage.setItem(key, encrypted);
}

/**
 * Retrieves and decrypts data from localStorage.
 */
export async function getSecureItem<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  const decrypted = await decryptData(raw);
  if (!decrypted) return null;

  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}
