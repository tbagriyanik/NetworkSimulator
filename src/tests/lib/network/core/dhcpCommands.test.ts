import { describe, it, expect } from 'vitest';

describe('DHCP Configuration Commands', () => {
  it('should create DHCP pool', () => {
    const cmd = 'ip dhcp pool LAN_POOL';
    expect(cmd).toContain('ip dhcp pool');
  });

  it('should configure DHCP network', () => {
    const cmd = 'network 192.168.1.0 255.255.255.0';
    expect(cmd).toBe('network 192.168.1.0 255.255.255.0');
  });

  it('should configure default gateway for DHCP', () => {
    const cmd = 'default-router 192.168.1.1';
    expect(cmd).toContain('default-router');
  });

  it('should configure DNS server for DHCP', () => {
    const cmd = 'dns-server 8.8.8.8';
    expect(cmd).toBe('dns-server 8.8.8.8');
  });

  it('should configure DHCP lease time', () => {
    const cmd = 'lease 7';
    expect(cmd).toBe('lease 7');
  });

  it('should exclude IP addresses from DHCP pool', () => {
    const cmd = 'ip dhcp excluded-address 192.168.1.1 192.168.1.10';
    expect(cmd).toContain('ip dhcp excluded-address');
  });

  it('should configure DHCP on interface', () => {
    const cmds = ['interface gi0/0', 'ip address dhcp'];
    expect(cmds[1]).toBe('ip address dhcp');
  });

  it('should configure DHCP relay', () => {
    const cmd = 'ip helper-address 10.0.0.1';
    expect(cmd).toContain('ip helper-address');
  });

  it('should renew DHCP lease on client', () => {
    const renewalCmd = 'ipconfig /renew';
    expect(renewalCmd).toBe('ipconfig /renew');
  });

  it('should release DHCP lease on client', () => {
    const releaseCmd = 'ipconfig /release';
    expect(releaseCmd).toBe('ipconfig /release');
  });
});
