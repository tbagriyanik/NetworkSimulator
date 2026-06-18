import { describe, it, expect } from 'vitest';
import { encryptMd5Password, encryptType7Password, decryptType7Password } from '@/lib/network/crypto';

describe('Crypto Module', () => {
  describe('encryptMd5Password', () => {
    it('should produce consistent hash with given salt', () => {
      const result = encryptMd5Password('cisco', 'abcdefgh');
      expect(result).toMatch(/^\$1\$abcdefgh\$[a-f0-9]{32}$/);
    });

    it('should produce different hashes with different salts', () => {
      const h1 = encryptMd5Password('cisco', 'aaaaaaaa');
      const h2 = encryptMd5Password('cisco', 'bbbbbbbb');
      expect(h1).not.toBe(h2);
    });

    it('should return a string starting with $1$', () => {
      const result = encryptMd5Password('cisco');
      expect(result.startsWith('$1$')).toBe(true);
    });

    it('should include the salt and a hex hash', () => {
      const result = encryptMd5Password('test', 'mysalt!!');
      expect(result).toMatch(/^\$1\$mysalt!!\$[a-f0-9]{32}$/);
    });
  });

  describe('encryptType7Password', () => {
    it('should produce non-empty encrypted string', () => {
      const result = encryptType7Password('cisco');
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe('cisco');
    });

    it('should encrypt empty string to empty string', () => {
      const result = encryptType7Password('');
      expect(result).toBe('');
    });
  });

  describe('decryptType7Password', () => {
    it('should decrypt to original password', () => {
      const original = 'cisco123';
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
});
