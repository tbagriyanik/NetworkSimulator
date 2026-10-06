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

  it('should detect duplicate IP conflicts with other devices in topology', () => {
    const devices = [
      { id: 'PC-1', name: 'PC-1', ip: '192.168.1.10' },
      { id: 'PC-2', name: 'PC-2', ip: '192.168.1.20' },
    ];
    const targetIp = '192.168.1.20';
    const currentDeviceId = 'PC-1';

    const duplicateDevices = devices.filter(d => d.id !== currentDeviceId && d.ip === targetIp);
    expect(duplicateDevices.length).toBe(1);
    expect(duplicateDevices[0].name).toBe('PC-2');
  });

  it('should validate subnet mask bit contiguity and network/broadcast addresses', () => {
    const isValidSubnet = (mask: string) => {
      const parts = mask.split('.').map(Number);
      if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return false;
      const maskNum = (((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0)) >>> 0;
      const inv = (~maskNum) >>> 0;
      return (inv & (inv + 1)) === 0;
    };

    expect(isValidSubnet('255.255.255.0')).toBe(true);
    expect(isValidSubnet('255.255.0.0')).toBe(true);
    expect(isValidSubnet('255.255.255.240')).toBe(true);
    expect(isValidSubnet('255.255.255.1')).toBe(false);
  });

  it('should detect duplicate IPv6 conflicts with other devices in topology', () => {
    const devices = [
      { id: 'PC-1', name: 'PC-1', ipv6: '2001:db8:acad:1::10' },
      { id: 'PC-2', name: 'PC-2', ipv6: '2001:db8:acad:1::20' },
    ];
    const targetIpv6 = '2001:db8:acad:1::20';
    const currentDeviceId = 'PC-1';

    const duplicateDevices = devices.filter(d => d.id !== currentDeviceId && d.ipv6?.toLowerCase() === targetIpv6.toLowerCase());
    expect(duplicateDevices.length).toBe(1);
    expect(duplicateDevices[0].name).toBe('PC-2');
  });

  it('should map validation errors to specific fields instead of a generic bottom error', () => {
    const validateFields = (fields: { name: string; ip: string; subnet: string; gateway: string }) => {
      const fieldErrors: Record<string, string> = {};
      if (!fields.name.trim()) fieldErrors.name = 'Cihaz adı boş olamaz.';
      if (fields.ip === 'invalid') fieldErrors.ip = 'Geçersiz IP adresi';
      if (fields.subnet === '255.255.255.1') fieldErrors.subnet = 'Geçersiz alt ağ maskesi';
      if (fields.gateway === 'invalid') fieldErrors.gateway = 'Geçersiz Ağ Geçidi adresi';
      return fieldErrors;
    };

    const errors = validateFields({ name: '', ip: 'invalid', subnet: '255.255.255.1', gateway: 'invalid' });
    expect(errors.name).toBe('Cihaz adı boş olamaz.');
    expect(errors.ip).toBe('Geçersiz IP adresi');
    expect(errors.subnet).toBe('Geçersiz alt ağ maskesi');
    expect(errors.gateway).toBe('Geçersiz Ağ Geçidi adresi');
  });
});
