import { describe, it, expect } from 'vitest';
import { CLI_ERRORS, cliModeError } from '@/lib/network/core/cliErrors';

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
