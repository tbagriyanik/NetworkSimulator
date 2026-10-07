import { describe, it, expect } from 'vitest';
import { CLI_ERRORS, cliModeError, getStudentCliHint } from '@/lib/network/core/cliErrors';

describe('CLI_ERRORS', () => {
  it('should define invalidInput error', () => {
    expect(CLI_ERRORS.invalidInput).toContain("Invalid input detected");
  });

  it('should define incomplete command error', () => {
    expect(CLI_ERRORS.incomplete).toContain('Incomplete command');
  });

  it('should define ambiguous command error', () => {
    expect(CLI_ERRORS.ambiguous).toContain('Ambiguous command');
  });

  it('should define unknown command error', () => {
    expect(CLI_ERRORS.unknown).toContain('Unrecognized command');
  });

  it('should define access denied error', () => {
    expect(CLI_ERRORS.accessDenied).toContain('Access denied');
  });

  it('should define bad passwords error', () => {
    expect(CLI_ERRORS.badPasswords).toContain('Bad passwords');
  });

  it('should define marker', () => {
    expect(CLI_ERRORS.marker).toBe('^');
  });
});

describe('cliModeError', () => {
  it('should return error for user EXEC mode', () => {
    const result = cliModeError('user');
    expect(result).toContain('User EXEC');
    expect(result).toContain('not available');
  });

  it('should return error for privileged EXEC mode', () => {
    const result = cliModeError('privileged');
    expect(result).toContain('Privileged EXEC');
  });

  it('should return error for config mode', () => {
    const result = cliModeError('config');
    expect(result).toContain('Global Configuration');
  });

  it('should handle unknown mode gracefully', () => {
    const result = cliModeError('unknown-mode');
    expect(result).toContain('unknown');
  });
});

describe('getStudentCliHint', () => {
  it('should suggest enable when running privileged command in user mode', () => {
    const hint = getStudentCliHint('conf t', 'user');
    expect(hint).toBeDefined();
    expect(hint?.tr).toContain('enable');
  });

  it('should suggest configure terminal when configuring in privileged mode', () => {
    const hint = getStudentCliHint('int g0/1', 'privileged');
    expect(hint).toBeDefined();
    expect(hint?.tr).toContain('configure terminal');
  });

  it('should suggest entering interface mode when running no shutdown in global config', () => {
    const hint = getStudentCliHint('no shutdown', 'config');
    expect(hint).toBeDefined();
    expect(hint?.tr).toContain('interface');
  });

  it('should suggest correction for common typos like conft', () => {
    const hint = getStudentCliHint('conft', 'privileged');
    expect(hint).toBeDefined();
    expect(hint?.en).toContain('conf t');
  });

  it('should return undefined when no hint is necessary', () => {
    const hint = getStudentCliHint('show ip int brief', 'privileged');
    expect(hint).toBeUndefined();
  });

  it('should suggest subnet mask for incomplete ip address', () => {
    const hint = getStudentCliHint('ip address 192.168.1.1', 'interface');
    expect(hint).toBeDefined();
    expect(hint?.tr).toContain('subnet maskesi');
  });

  it('should warn against using subnet mask with ping', () => {
    const hint = getStudentCliHint('ping 192.168.1.1/24', 'user');
    expect(hint).toBeDefined();
    expect(hint?.tr).toContain('CIDR');
  });
});

