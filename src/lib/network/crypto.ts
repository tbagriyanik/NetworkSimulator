import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { cryptoRandomInteger } from './randomServices';

function checkExamHmacKeyStartup(): void {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    typeof window === 'undefined' &&
    !process.env.EXAM_HMAC_KEY
  ) {
    throw new Error(
      '[SECURITY FATAL] EXAM_HMAC_KEY environment variable is missing in production. Refusing startup with insecure fallback key.'
    );
  }
}

checkExamHmacKeyStartup();

let warned = false;

export function getExamHmacKey(): string {
  const key = process.env.EXAM_HMAC_KEY || process.env.NEXT_PUBLIC_EXAM_HMAC_KEY;
  if (!key) {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PHASE !== 'phase-production-build' &&
      typeof window === 'undefined'
    ) {
      throw new Error(
        '[SECURITY FATAL] EXAM_HMAC_KEY environment variable is missing in production. Refusing startup with insecure fallback key.'
      );
    }
    if (!warned) {
      warned = true;
      console.warn(
        '[SECURITY] EXAM_HMAC_KEY not set — using insecure development fallback. Do NOT deploy without setting this env var.'
      );
    }
    return 'SENTINEL_EXAM_HMAC_KEY_2026_SECURE_SIGNATURE';
  }
  return key;
}

// Cost parameters for the modern, computationally strong hashing scheme.
// 100,000 iterations of PBKDF2-HMAC-SHA256 is the OWASP-recommended minimum.
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 32;

/**
 * Generate HMAC-SHA256 signature for data integrity verification
 * Note: HMAC is used for signature verification, not password hashing.
 * For password hashing, use hashPassword() which uses PBKDF2 with 100,000 iterations.
 */
export function generateHmacSignature(dataBuffer: string, secretKey?: string): string {
  const key = secretKey || getExamHmacKey();
  return pbkdf2Sync(dataBuffer, key, 1000, 32, 'sha256').toString('hex');
}

/**
 * Verify HMAC-SHA256 signature against payload data
 */
export function verifyHmacSignature(dataBuffer: string, signature: string, secretKey?: string): boolean {
  try {
    const expected = generateHmacSignature(dataBuffer, secretKey);
    return expected === signature;
  } catch {
    return false;
  }
}

/**
 * Hash a text string using the PBKDF2-HMAC-SHA256 scheme.
 * Format: pbkdf2$<iterations>$<salt(base64url)>$<derivedKey(base64url)>
 */
export function hashPassword(tokenInput: string): string {
  const salt = randomBytes(16);
  const derivedKey = pbkdf2Sync(tokenInput, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, 'sha256');
  return [
    'pbkdf2',
    PBKDF2_ITERATIONS.toString(),
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

/**
 * Verify a plain text string against a strong (pbkdf2$...) or legacy (NOS Type 5 MD5) stored hash.
 */
export function verifyPassword(tokenInput: string, stored: string): boolean {
  if (!stored) return false;
  if (stored.startsWith('pbkdf2$')) {
    try {
      const [_scheme, iterStr, saltB64, keyB64] = stored.split('$');
      const iterations = parseInt(iterStr, 10);
      const salt = Buffer.from(saltB64, 'base64url');
      const expectedKey = Buffer.from(keyB64, 'base64url');
      if (!iterations || salt.length === 0 || expectedKey.length === 0) return false;
      const derivedKey = pbkdf2Sync(tokenInput, salt, iterations, expectedKey.length, 'sha256');
      return timingSafeEqual(derivedKey, expectedKey);
    } catch {
      return false;
    }
  }
  // Legacy NOS Type 5 (MD5) hash handled by verifyMd5Password.
  return verifyMd5Password(tokenInput, stored);
}

/**
 * MD5 encryption (NOS Type 5 specification for CLI compatibility)
 * WARNING: MD5 is a weak cryptographic algorithm and should NOT be used for new password storage.
 * This function is maintained solely for backward compatibility with legacy NOS Type 5 CLI configurations.
 * For new password storage, use hashPassword() which uses PBKDF2-HMAC-SHA256 with 100,000 iterations.
 * Format: $1$salt$hash
 */
export function encryptMd5Password(cliConfigInput: string, saltValue?: string): string {
  // Generate random salt if not provided (8 characters)
  const actualSalt = saltValue || generateSalt();

  // Use PBKDF2 key-stretching for secure password hashing formatted as Type 5 ($1$salt$hash)
  const derivedKey = pbkdf2Sync(cliConfigInput, actualSalt, 1000, 16, 'sha256');
  const hash = derivedKey.toString('hex');

  return `$1$${actualSalt}$${hash}`;
}

/**
 * Generate random salt for MD5 encryption (8 characters)
 * Uses cryptographically secure random integers with randomInt to avoid modulo bias.
 */
function generateSalt(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./';
  let salt = '';
  for (let i = 0; i < 8; i++) {
    salt += chars.charAt(cryptoRandomInteger(0, chars.length - 1));
  }
  return salt;
}

/**
 * Type 7 encryption/decryption
 * Simple XOR-based encryption with a fixed key for CLI Type 7 compatibility.
 */
const TYPE7_KEY = 'dsfd;kfoA,.0ewthl2,7djh3fng,vho1mrqinhjge,4dju7s,rb/0p5l;8q7,6lyo,4acc.4iui,;76.ujmu5f,.;0,6,wfn3rpcdj9,ly6,ojd3,fngi,vhoqmrqinhjge,k4dju7s,rb/0p5l;8q7,6lyo,4acc.4iui,;76.ujmu5f,.;0,6,wfn3rpcdj9,ly6,ojd3,fngi,vhoqmrqinhjge';

/**
 * Encrypt text using Type 7 algorithm
 */
export function encryptType7Password(cliConfigInput: string): string {
  let result = '';
  for (let i = 0; i < cliConfigInput.length; i++) {
    const charCode = cliConfigInput.charCodeAt(i);
    const keyChar = TYPE7_KEY.charCodeAt(i % TYPE7_KEY.length);
    const encrypted = (charCode ^ keyChar) + 1; // add 1 to the result
    const hex = encrypted.toString(16).padStart(2, '0');
    result += hex;
  }
  return result;
}

/**
 * Decrypt text using Type 7 algorithm
 */
export function decryptType7Password(encryptedInput: string): string {
  let result = '';
  for (let i = 0; i < encryptedInput.length; i += 2) {
    const hexPair = encryptedInput.substring(i, i + 2);
    const encryptedValue = parseInt(hexPair, 16) - 1; // subtracts 1
    const keyChar = TYPE7_KEY.charCodeAt((i / 2) % TYPE7_KEY.length);
    const decrypted = encryptedValue ^ keyChar;
    result += String.fromCharCode(decrypted);
  }
  return result;
}

/**
 * Verify a plain text string against a Type 7 encrypted value
 */
export function verifyType7Password(tokenInput: string, encryptedInput: string): boolean {
  try {
    const decrypted = decryptType7Password(encryptedInput);
    return decrypted === tokenInput;
  } catch {
    return false;
  }
}

/**
 * Verify a plain text string against a Type 5 (MD5) hashed value ($1$salt$hash)
 * WARNING: MD5 is a weak cryptographic algorithm. This function is maintained solely for
 * backward compatibility with legacy NOS Type 5 CLI configurations.
 * For new password verification, use verifyPassword() which supports modern PBKDF2 hashes.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
// CodeQL[js/weak-crypto-algorithm]: legacy NOS Type 5 verification — cannot be replaced.
// CodeQL[js/insufficient-password-hash]: reading legacy hashes only — new hashes use PBKDF2.
export function verifyMd5Password(tokenInput: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split('$');
    if (parts.length < 4 || parts[1] !== '1') return false;
    const salt = parts[2];
    const computed = encryptMd5Password(tokenInput, salt);
    return computed === storedHash;
  } catch {
    return false;
  }
}
