import { describe, it, expect } from 'vitest';
import { areArraysEqual, areWifiConfigsEqual } from '@/lib/network/equality';

describe('equality helpers', () => {
  describe('areArraysEqual', () => {
    it('should return true for same array reference', () => {
      const a = ['1', '2'];
      expect(areArraysEqual(a, a)).toBe(true);
    });

    it('should return true for identical content', () => {
      expect(areArraysEqual(['1', '2'], ['1', '2'])).toBe(true);
    });

    it('should return false for different length', () => {
      expect(areArraysEqual(['1', '2'], ['1', '2', '3'])).toBe(false);
    });

    it('should return false for different content', () => {
      expect(areArraysEqual(['1', '2'], ['1', '3'])).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(areArraysEqual(null, null)).toBe(true);
      expect(areArraysEqual([], null)).toBe(false);
    });
  });

  describe('areWifiConfigsEqual', () => {
    it('should return true for identical configs', () => {
      const a = { ssid: 'test', security: 'wpa2', channel: '1', mode: 'ap' };
      const b = { ssid: 'test', security: 'wpa2', channel: '1', mode: 'ap' };
      expect(areWifiConfigsEqual(a, b)).toBe(true);
    });

    it('should return false for different ssid', () => {
      const a = { ssid: 'test1', security: 'wpa2', channel: '1' };
      const b = { ssid: 'test2', security: 'wpa2', channel: '1' };
      expect(areWifiConfigsEqual(a, b)).toBe(false);
    });

    it('should handle missing optional fields', () => {
      const a = { ssid: 'test', security: 'wpa2', channel: '1' };
      const b = { ssid: 'test', security: 'wpa2', channel: '1' };
      expect(areWifiConfigsEqual(a, b)).toBe(true);
    });
  });
});
