// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  encryptMd5Password,
  encryptType7Password,
  decryptType7Password,
  verifyType7Password,
  verifyMd5Password,
  hashPassword,
  verifyPassword,
  generateHmacSignature,
  verifyHmacSignature,
  getExamHmacKey,
} from '@/lib/network/crypto';

describe('Crypto Module', () => {
  describe('generateHmacSignature / verifyHmacSignature / EXAM_HMAC_KEY', () => {
    it('should generate and verify valid HMAC signatures', () => {
      const data = 'test-exam-data-payload';
      const sig = generateHmacSignature(data, 'custom-secret-key');
      expect(typeof sig).toBe('string');
      expect(sig.length).toBeGreaterThan(10);
      expect(verifyHmacSignature(data, sig, 'custom-secret-key')).toBe(true);
      expect(verifyHmacSignature(data, 'wrong-signature', 'custom-secret-key')).toBe(false);
      expect(verifyHmacSignature('tampered-data', sig, 'custom-secret-key')).toBe(false);
    });

    it('should resolve key from EXAM_HMAC_KEY', () => {
      const origKey = process.env.EXAM_HMAC_KEY;
      try {
        process.env.EXAM_HMAC_KEY = 'server-key-123';
        expect(getExamHmacKey()).toBe('server-key-123');
      } finally {
        if (origKey) process.env.EXAM_HMAC_KEY = origKey; else delete process.env.EXAM_HMAC_KEY;
      }
    });

    it('should throw an error in production server context when EXAM_HMAC_KEY is missing', () => {
      const origEnv = process.env.NODE_ENV;
      const origKey = process.env.EXAM_HMAC_KEY;
      const origPubKey = process.env.NEXT_PUBLIC_EXAM_HMAC_KEY;
      const origPhase = process.env.NEXT_PHASE;
      try {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true, enumerable: true });
        delete process.env.EXAM_HMAC_KEY;
        delete process.env.NEXT_PUBLIC_EXAM_HMAC_KEY;
        delete process.env.NEXT_PHASE;
        expect(() => getExamHmacKey()).toThrow(/EXAM_HMAC_KEY environment variable is missing in production/);
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', { value: origEnv, configurable: true, writable: true, enumerable: true });
        if (origKey) process.env.EXAM_HMAC_KEY = origKey;
        if (origPubKey) process.env.NEXT_PUBLIC_EXAM_HMAC_KEY = origPubKey;
        if (origPhase) process.env.NEXT_PHASE = origPhase;
      }
    });

    it('should not throw in browser client context when EXAM_HMAC_KEY is missing in production', () => {
      const origEnv = process.env.NODE_ENV;
      const origKey = process.env.EXAM_HMAC_KEY;
      const origPubKey = process.env.NEXT_PUBLIC_EXAM_HMAC_KEY;
      const origPhase = process.env.NEXT_PHASE;
      try {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true, enumerable: true });
        delete process.env.EXAM_HMAC_KEY;
        delete process.env.NEXT_PUBLIC_EXAM_HMAC_KEY;
        delete process.env.NEXT_PHASE;
        globalThis.window = {} as unknown as Window & typeof globalThis;
        expect(() => getExamHmacKey()).not.toThrow();
        expect(getExamHmacKey()).toBe('SENTINEL_EXAM_HMAC_KEY_2026_SECURE_SIGNATURE');
      } finally {
        delete (globalThis as { window?: unknown }).window;
        Object.defineProperty(process.env, 'NODE_ENV', { value: origEnv, configurable: true, writable: true, enumerable: true });
        if (origKey) process.env.EXAM_HMAC_KEY = origKey;
        if (origPubKey) process.env.NEXT_PUBLIC_EXAM_HMAC_KEY = origPubKey;
        if (origPhase) process.env.NEXT_PHASE = origPhase;
      }
    });
  });

  describe('hashPassword / verifyPassword (PBKDF2-SHA256)', () => {
    it('should produce a strong hash with the expected format', () => {
      const result = hashPassword('secret123');
      expect(result.startsWith('pbkdf2$')).toBe(true);
      const parts = result.split('$');
      expect(parts.length).toBe(4);
      expect(parseInt(parts[1], 10)).toBeGreaterThanOrEqual(100000);
      expect(parts[2].length).toBeGreaterThan(0);
      expect(parts[3].length).toBeGreaterThan(0);
    });

    it('should be salted (different hash each time)', () => {
      const h1 = hashPassword('samepassword');
      const h2 = hashPassword('samepassword');
      expect(h1).not.toBe(h2);
    });

    it('should verify a valid password', () => {
      const hash = hashPassword('S3cret!pass');
      expect(verifyPassword('S3cret!pass', hash)).toBe(true);
      expect(verifyPassword('wrong', hash)).toBe(false);
    });

    it('should verify a legacy MD5 Type 5 hash for compatibility', () => {
      const legacy = encryptMd5Password('legacypass', 'saltsalt');
      expect(verifyPassword('legacypass', legacy)).toBe(true);
      expect(verifyPassword('nope', legacy)).toBe(false);
    });

    it('should return false for malformed/empty stored hashes', () => {
      expect(verifyPassword('x', '')).toBe(false);
      expect(verifyPassword('x', 'pbkdf2$abc')).toBe(false);
      expect(verifyPassword('x', 'pbkdf2$100000$!!$!!')).toBe(false);
    });
  });


  describe('encryptMd5Password', () => {
    it('should produce consistent hash with given salt', () => {
      const result = encryptMd5Password('password', 'abcdefgh');
      expect(result).toMatch(/^\$1\$abcdefgh\$[a-f0-9]{32}$/);
    });

    it('should produce different hashes with different salts', () => {
      const h1 = encryptMd5Password('password', 'aaaaaaaa');
      const h2 = encryptMd5Password('password', 'bbbbbbbb');
      expect(h1).not.toBe(h2);
    });

    it('should return a string starting with $1$', () => {
      const result = encryptMd5Password('password');
      expect(result.startsWith('$1$')).toBe(true);
    });

    it('should include the salt and a hex hash', () => {
      const result = encryptMd5Password('test', 'mysalt!!');
      expect(result).toMatch(/^\$1\$mysalt!!\$[a-f0-9]{32}$/);
    });
  });

  describe('encryptType7Password', () => {
    it('should produce non-empty encrypted string', () => {
      const result = encryptType7Password('password');
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe('password');
    });

    it('should encrypt empty string to empty string', () => {
      const result = encryptType7Password('');
      expect(result).toBe('');
    });
  });

  describe('decryptType7Password', () => {
    it('should decrypt to original password', () => {
      const original = 'password123';
      const encrypted = encryptType7Password(original);
      const decrypted = decryptType7Password(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should round-trip various passwords', () => {
      const passwords = ['admin', 'class', 'P@ssw0rd!', 'a', 'abcdefghijklmnopqrstuvwxyz'];
      for (const pwd of passwords) {
        const encrypted = encryptType7Password(pwd);
        const decrypted = decryptType7Password(encrypted);
        expect(decrypted).toBe(pwd);
      }
    });

    it('should handle empty string', () => {
      expect(decryptType7Password('')).toBe('');
    });
  });

  describe('verifyType7Password', () => {
    it('should correctly verify valid Type 7 password', () => {
      const encrypted = encryptType7Password('net123');
      expect(verifyType7Password('net123', encrypted)).toBe(true);
      expect(verifyType7Password('wrongpass', encrypted)).toBe(false);
    });
  });

  describe('verifyMd5Password', () => {
    it('should correctly verify valid MD5 Type 5 password', () => {
      const hashed = encryptMd5Password('secret', 'saltsalt');
      expect(verifyMd5Password('secret', hashed)).toBe(true);
      expect(verifyMd5Password('wrongsecret', hashed)).toBe(false);
    });
  });
});
