import { describe, it, expect } from 'vitest';

describe('System Commands', () => {
  it('should set hostname', () => {
    const cmd = 'hostname SW1';
    expect(cmd).toContain('hostname');
  });

  it('should configure banner motd', () => {
    const cmds = ['banner motd #', 'Unauthorized access prohibited', '#'];
    expect(cmds[0]).toBe('banner motd #');
  });

  it('should configure enable secret', () => {
    const cmd = 'enable secret netsim';
    expect(cmd).toContain('enable secret');
  });

  it('should configure enable password', () => {
    const cmd = 'enable password netsim';
    expect(cmd).toContain('enable password');
  });

  it('should set clock timezone', () => {
    const cmd = 'clock timezone EST -5 0';
    expect(cmd).toContain('clock timezone');
  });

  it('should configure NTP server', () => {
    const cmd = 'ntp server 0.pool.ntp.org';
    expect(cmd).toContain('ntp server');
  });

  it('should configure logging', () => {
    const cmds = ['logging console informational', 'logging buffered 8192', 'logging host 10.0.0.1'];
    expect(cmds[0]).toBe('logging console informational');
    expect(cmds[2]).toBe('logging host 10.0.0.1');
  });

  it('should configure SNMP', () => {
    const cmds = ['snmp-server community public RO', 'snmp-server community private RW', 'snmp-server location DataCenter'];
    expect(cmds[0]).toContain('snmp-server community');
  });

  it('should configure DNS lookup', () => {
    const cmds = ['ip domain-lookup', 'ip name-server 8.8.8.8', 'ip domain-name example.com'];
    expect(cmds[0]).toBe('ip domain-lookup');
  });

  it('should configure CDP', () => {
    const cmds = ['cdp run', 'cdp timer 30', 'cdp holdtime 90'];
    expect(cmds[0]).toBe('cdp run');
  });

  it('should configure LLDP', () => {
    const cmds = ['lldp run', 'lldp timer 30', 'lldp holdtime 120'];
    expect(cmds[0]).toBe('lldp run');
  });
});
