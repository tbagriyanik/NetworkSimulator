import { createHash } from 'crypto';

/**
 * MD5 password encryption (Type 5)
 * Format: $1$salt$hash
 */
export function encryptMd5Password(password: string, salt?: string): string {
  // Generate random salt if not provided (8 characters)
  const actualSalt = salt || generateSalt();
  
  // Create MD5 hash: salt + password
  const hash = createHash('md5')
    .update(actualSalt + password)
    .digest('hex');
  
  return `$1$${actualSalt}$${hash}`;
}

/**
 * Generate random salt for MD5 encryption (8 characters)
 * Uses cryptographically secure random values (CSPRNG) if available.
 */
function generateSalt(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./';
  let salt = '';
  const bytes = new Uint8Array(8);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    for (let i = 0; i < 8; i++) {
      salt += chars.charAt(bytes[i] % chars.length);
    }
  } else {
    // Fallback if CSPRNG is not supported in the environment
    for (let i = 0; i < 8; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return salt;
}

/**
 * Type 7 password encryption/decryption
 * This is a simple XOR-based encryption with a fixed key
 */
const TYPE7_KEY = 'dsfd;kfoA,.0ewthl2,7djh3fng,vho1mrqinhjge,4dju7s,rb/0p5l;8q7,6lyo,4acc.4iui,;76.ujmu5f,.;0,6,wfn3rpcdj9,ly6,ojd3,fngi,vhoqmrqinhjge,k4dju7s,rb/0p5l;8q7,6lyo,4acc.4iui,;76.ujmu5f,.;0,6,wfn3rpcdj9,ly6,ojd3,fngi,vhoqmrqinhjge';

/**
 * Encrypt password using Type 7 algorithm
 */
export function encryptType7Password(password: string): string {
  let result = '';
  for (let i = 0; i < password.length; i++) {
    const charCode = password.charCodeAt(i);
    const keyChar = TYPE7_KEY.charCodeAt(i % TYPE7_KEY.length);
    const encrypted = (charCode ^ keyChar) + 1; // add 1 to the result
    const hex = encrypted.toString(16).padStart(2, '0');
    result += hex;
  }
  return result;
}

/**
 * Decrypt password using Type 7 algorithm
 */
export function decryptType7Password(encrypted: string): string {
  let result = '';
  for (let i = 0; i < encrypted.length; i += 2) {
    const hexPair = encrypted.substr(i, 2);
    const encryptedValue = parseInt(hexPair, 16) - 1; // subtracts 1
    const keyChar = TYPE7_KEY.charCodeAt((i / 2) % TYPE7_KEY.length);
    const decrypted = encryptedValue ^ keyChar;
    result += String.fromCharCode(decrypted);
  }
  return result;
}
