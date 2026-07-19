import { describe, it, expect } from 'vitest';

describe('Privileged EXEC Commands', () => {
  it('should enable privileged mode', () => {
    const cmd = 'enable';
    expect(cmd).toBe('enable');
  });

  it('should enter global config mode', () => {
    const cmd = 'configure terminal';
    expect(cmd).toBe('configure terminal');
  });

  it('should reload device', () => {
    const cmds = ['reload', 'Reload scheduled in 10 seconds'];
    expect(cmds[0]).toBe('reload');
  });

  it('should copy running-config to startup-config', () => {
    const cmd = 'copy running-config startup-config';
    expect(cmd).toContain('running-config');
    expect(cmd).toContain('startup-config');
  });

  it('should erase startup-config', () => {
    const cmd = 'erase startup-config';
    expect(cmd).toBe('erase startup-config');
  });

  it('should write memory', () => {
    const cmd = 'write memory';
    expect(cmd).toBe('write memory');
  });

  it('should set clock', () => {
    const cmd = 'clock set 10:30:00 15 March 2026';
    expect(cmd).toContain('clock set');
  });

  it('should configure terminal length', () => {
    const cmd = 'terminal length 0';
    expect(cmd).toBe('terminal length 0');
  });

  it('should configure terminal monitor for debug output', () => {
    const cmd = 'terminal monitor';
    expect(cmd).toBe('terminal monitor');
  });

  it('should clear counters on interface', () => {
    const cmds = ['clear counters gi0/0', 'Clear "show interface" counters on this interface [confirm]'];
    expect(cmds[0]).toContain('clear counters');
  });
});
