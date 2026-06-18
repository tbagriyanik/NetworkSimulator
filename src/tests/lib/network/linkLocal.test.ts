import { describe, it, expect } from 'vitest';
import { isLinkLocalIpv4, generateRandomLinkLocalIpv4, generateRandomLinkLocalIpv6 } from '@/lib/network/linkLocal';

describe('Link Local Module', () => {
  describe('isLinkLocalIpv4', () => {
    it('should return true for 169.254.x.x addresses', () => {
      expect(isLinkLocalIpv4('169.254.1.1')).toBe(true);
      expect(isLinkLocalIpv4('169.254.255.254')).toBe(true);
    });

    it('should return false for non-link-local addresses', () => {
      expect(isLinkLocalIpv4('192.168.1.1')).toBe(false);
      expect(isLinkLocalIpv4('10.0.0.1')).toBe(false);
      expect(isLinkLocalIpv4('172.16.0.1')).toBe(false);
    });

    it('should return false for invalid IPs', () => {
      expect(isLinkLocalIpv4('')).toBe(false);
      expect(isLinkLocalIpv4('not-an-ip')).toBe(false);
      expect(isLinkLocalIpv4('256.1.1.1')).toBe(false);
      expect(isLinkLocalIpv4('169.254.1')).toBe(false);
    });
  });

  describe('generateRandomLinkLocalIpv4', () => {
    it('should generate address in 169.254.0.0/16', () => {
      const ip = generateRandomLinkLocalIpv4();
      expect(isLinkLocalIpv4(ip)).toBe(true);
    });

    it('should not return used IPs from the set', () => {
      const used = new Set<string>(['169.254.1.1', '169.254.1.2', '169.254.1.3']);
      const ip = generateRandomLinkLocalIpv4(used);
      expect(used.has(ip)).toBe(false);
      expect(isLinkLocalIpv4(ip)).toBe(true);
    });

    it('should avoid .0 and .255 in last octet', () => {
      for (let i = 0; i < 50; i++) {
        const ip = generateRandomLinkLocalIpv4();
        const parts = ip.split('.').map(Number);
        expect(parts[3]).not.toBe(0);
        expect(parts[3]).not.toBe(255);
      }
    });
  });

  describe('generateRandomLinkLocalIpv6', () => {
    it('should generate address starting with fe80::', () => {
      const ip = generateRandomLinkLocalIpv6();
      expect(ip.startsWith('fe80::')).toBe(true);
    });

    it('should not return used IPs from the set', () => {
      const used = new Set<string>(['fe80::1:2:3:4']);
      const ip = generateRandomLinkLocalIpv6(used);
      expect(used.has(ip)).toBe(false);
      expect(ip.startsWith('fe80::')).toBe(true);
    });
  });
});
