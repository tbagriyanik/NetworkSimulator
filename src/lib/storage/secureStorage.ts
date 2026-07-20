/**
 * Secure Storage Wrapper
 * Adds a basic layer of obfuscation (XOR + Base64) to localStorage to prevent casual tampering.
 */

const SECRET_KEY = 'netsim_secure_storage_key';
const PREFIX = 'ENC:';

function xorCipher(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function encode(data: string): string {
  try {
    // Use encodeURIComponent to handle non-ascii (e.g., Turkish) characters properly.
    // This turns all characters into ASCII.
    const uriEncoded = encodeURIComponent(data);
    // XORing ASCII with ASCII (our secret key) keeps the output in the 0-127 range.
    const xorData = xorCipher(uriEncoded, SECRET_KEY);
    // Since xorData is pure ASCII, btoa will not throw InvalidCharacterError.
    return PREFIX + btoa(xorData);
  } catch (e) {
    console.error('Error encoding data', e);
    return data;
  }
}

function decode(data: string): string {
  // Fallback to legacy plain text for backward compatibility
  if (!data.startsWith(PREFIX)) {
    return data;
  }
  
  try {
    const base64Data = data.substring(PREFIX.length);
    const xorData = atob(base64Data);
    const decodedUri = xorCipher(xorData, SECRET_KEY);
    return decodeURIComponent(decodedUri);
  } catch (e) {
    console.error('Error decoding data', e);
    return data; // Return original on failure
  }
}

export const secureStorage = {
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      const encoded = encode(value);
      window.localStorage.setItem(key, encoded);
    } catch (e) {
      console.error(`Error setting secureStorage key ${key}`, e);
    }
  },

  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const value = window.localStorage.getItem(key);
      if (value === null) return null;
      return decode(value);
    } catch (e) {
      console.error(`Error getting secureStorage key ${key}`, e);
      return null;
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.clear();
  }
};
