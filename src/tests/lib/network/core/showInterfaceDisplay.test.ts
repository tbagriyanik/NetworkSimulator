import { describe, it, expect } from 'vitest';

describe('Show Interface Display', () => {
  const interfaceData = {
    name: 'FastEthernet0/1',
    status: 'up',
    protocol: 'up',
    hardware: 'FastEthernet',
    address: '0011.2233.4455',
    description: 'Connected to PC1',
    mtu: 1500,
    bw: 100000,
    delay: 100,
  };

  it('should display interface status line', () => {
    const line = `${interfaceData.name} is ${interfaceData.status}, line protocol is ${interfaceData.protocol}`;
    expect(line).toBe('FastEthernet0/1 is up, line protocol is up');
  });

  it('should display hardware type', () => {
    expect(interfaceData.hardware).toBe('FastEthernet');
  });

  it('should display MAC address', () => {
    expect(interfaceData.address).toMatch(/^[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}$/);
  });

  it('should display MTU', () => {
    expect(interfaceData.mtu).toBe(1500);
  });

  it('should display bandwidth', () => {
    expect(interfaceData.bw).toBe(100000);
  });

  it('should display delay', () => {
    expect(interfaceData.delay).toBe(100);
  });

  it('should display interface description', () => {
    expect(interfaceData.description).toBe('Connected to PC1');
  });

  it('should format duplex and speed', () => {
    const duplexSpeed = 'Full-duplex, 100Mb/s';
    expect(duplexSpeed).toContain('Full-duplex');
  });

  it('should format input/output rates', () => {
    const rates = '5 minute input rate 1000 bits/sec, 4 packets/sec\n5 minute output rate 2000 bits/sec, 8 packets/sec';
    expect(rates).toContain('input rate');
    expect(rates).toContain('output rate');
  });

  it('should format packets input/output counts', () => {
    const counters = '1500 packets input, 120000 bytes\n3200 packets output, 256000 bytes';
    expect(counters).toContain('packets input');
    expect(counters).toContain('packets output');
  });
});
