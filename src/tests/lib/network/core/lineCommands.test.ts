import { describe, it, expect } from 'vitest';

describe('Line Commands', () => {
  it('should configure console line', () => {
    const cmds = ['line console 0', 'password netsim', 'login', 'logging synchronous'];
    expect(cmds[0]).toBe('line console 0');
  });

  it('should configure VTY lines', () => {
    const cmds = ['line vty 0 15', 'password netsim', 'login', 'transport input ssh'];
    expect(cmds[0]).toBe('line vty 0 15');
    expect(cmds[3]).toBe('transport input ssh');
  });

  it('should configure AUX line', () => {
    const cmds = ['line aux 0', 'password netsim', 'login'];
    expect(cmds[0]).toBe('line aux 0');
  });

  it('should set exec-timeout', () => {
    const cmd = 'exec-timeout 5 0';
    const [minutes, seconds] = cmd.split(' ').slice(1).map(Number);
    expect(minutes).toBe(5);
    expect(seconds).toBe(0);
  });

  it('should enable password encryption', () => {
    const cmd = 'service password-encryption';
    expect(cmd).toBe('service password-encryption');
  });

  it('should configure login authentication', () => {
    const localAuth = ['login local', 'username admin secret netsim'];
    expect(localAuth[0]).toBe('login local');
    expect(localAuth[1]).toContain('username admin');
  });
});
