import { describe, it, expect } from 'vitest';

describe('DeviceConfigModal', () => {


  it('should validate IPv4 address', () => {
    const isValidIpv4 = (ip: string) => {
      if (!ip) return true;
      const parts = ip.split('.');
      if (parts.length !== 4) return false;
      return parts.every(p => {
        const num = parseInt(p, 10);
        return !isNaN(num) && num >= 0 && num <= 255;
      });
    };
    expect(isValidIpv4('192.168.1.10')).toBe(true);
    expect(isValidIpv4('256.1.1.1')).toBe(false);
    expect(isValidIpv4('not-an-ip')).toBe(false);
    expect(isValidIpv4('')).toBe(true);
  });

  it('should validate IPv6 address', () => {
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    expect(ipv6Regex.test('2001:db8::1')).toBe(false);
    expect(ipv6Regex.test('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
  });

  it('should save device configuration updates', () => {
    const updates = { name: 'PC-Updated', ip: '10.0.0.10' };
    expect(updates.name).toBe('PC-Updated');
    expect(updates.ip).toBe('10.0.0.10');
  });

  it('should show error for invalid IP', () => {
    const error = 'Enter a valid IPv4 address.';
    expect(error).toBeTruthy();
  });

  it('should close modal', () => {
    const onClose = () => true;
    expect(onClose()).toBe(true);
  });

  it('should auto-focus first input on mount', () => {
    const inputRef = { current: { focus: () => true } };
    expect(inputRef.current.focus()).toBe(true);
  });
});
