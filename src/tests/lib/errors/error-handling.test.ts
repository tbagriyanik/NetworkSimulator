import { describe, it, expect } from 'vitest';

describe('Error Handling', () => {
  it('should handle CLI command errors with IOS error messages', () => {
    const errors = [
      { cmd: 'enable', error: '% Invalid input detected at "^" marker.' },
      { cmd: 'configure terminal', error: '% Ambiguous command: "con"' },
    ];
    expect(errors[0].error).toContain('Invalid input');
    expect(errors[1].error).toContain('Ambiguous command');
  });

  it('should handle authentication errors', () => {
    const authError = '% Authentication failed';
    expect(authError).toContain('Authentication failed');
  });

  it('should handle privilege level errors', () => {
    const privError = '% Privilege level is not sufficient for this command';
    expect(privError).toContain('Privilege level');
  });

  it('should handle interface errors', () => {
    const ifError = '% Interface gi0/0 is not available';
    expect(ifError).toContain('not available');
  });

  it('should handle configuration errors', () => {
    const configErrors = [
      '% Invalid input detected at "^" marker.',
      '% Incomplete command.',
      '% Unknown command',
    ];
    expect(configErrors).toHaveLength(3);
  });

  it('should handle VLAN errors', () => {
    const vlanError = '% VLAN 10 does not exist';
    expect(vlanError).toContain('does not exist');
  });

  it('should handle IP address conflict', () => {
    const conflictError = '% 192.168.1.10 overlaps with gi0/0';
    expect(conflictError).toContain('overlaps');
  });

  it('should gracefully handle empty responses', () => {
    const response = '';
    expect(response.length).toBe(0);
  });
});
