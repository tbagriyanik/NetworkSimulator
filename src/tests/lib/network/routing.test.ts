import { describe, it, expect } from 'vitest';
import { isIpv6, expandIpv6, isIpv6InNetwork, ipToNumber } from '@/lib/network/routing';

describe('IPv6 Utilities', () => {
  describe('isIpv6', () => {
    it('should correctly identify IPv6 addresses', () => {
      expect(isIpv6('192.168.1.1')).toBe(false);
      expect(isIpv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(isIpv6('2001:db8::1')).toBe(true);
      expect(isIpv6('fe80::1')).toBe(true);
      expect(isIpv6('::1')).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(isIpv6('')).toBe(false);
    });
  });

  describe('expandIpv6', () => {
    it('should expand IPv6 shorthand addresses', () => {
      expect(expandIpv6('2001:db8::1')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
      expect(expandIpv6('fe80::')).toBe('fe80:0000:0000:0000:0000:0000:0000:0000');
      expect(expandIpv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
      expect(expandIpv6('2001:db8:0:0:0:0:0:1')).toBe('2001:db8:0:0:0:0:0:1');
    });

    it('should return unchanged for full addresses', () => {
      expect(expandIpv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });
  });

  describe('isIpv6InNetwork', () => {
    it('should correctly check IPv6 addresses in networks', () => {
      expect(isIpv6InNetwork('2001:db8:1::1', '2001:db8:1::', 64)).toBe(true);
      expect(isIpv6InNetwork('2001:db8:2::1', '2001:db8:1::', 64)).toBe(false);
      expect(isIpv6InNetwork('fe80::1', 'fe80::', 64)).toBe(true);
    });

    it('should handle invalid addresses gracefully', () => {
      expect(isIpv6InNetwork('', '::1', 64)).toBe(false);
      expect(isIpv6InNetwork('2001:db8::1', '', 64)).toBe(false);
    });
  });
});

describe('IPv4 Utilities', () => {
  describe('ipToNumber', () => {
    it('should correctly convert IPv4 to number', () => {
      expect(ipToNumber('192.168.1.1')).toBe(3232235777);
      expect(ipToNumber('10.0.0.1')).toBe(167772161);
      expect(ipToNumber('255.255.255.255')).toBe(4294967295);
    });

    it('should throw on invalid input', () => {
      expect(() => ipToNumber('')).toThrow('IP address is undefined or empty');
      expect(() => ipToNumber('256.0.0.1')).toThrow();
    });
  });
});
