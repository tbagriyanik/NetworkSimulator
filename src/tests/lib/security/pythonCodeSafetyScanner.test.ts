import { describe, it, expect } from 'vitest';
import { scanPythonCodeSafety } from '@/lib/security/pythonCodeSafetyScanner';

describe('pythonCodeSafetyScanner', () => {
  it('should allow valid standard python code', () => {
    const validCode = `
def calculate_ping(ip):
    print(f"Pinging {ip}...")
    return True

res = calculate_ping("192.168.1.1")
`;
    const result = scanPythonCodeSafety(validCode, 'tr');
    expect(result.isSafe).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should block unsafe eval and exec expressions', () => {
    const unsafeCode = `
user_input = "print('hacked')"
eval(user_input)
`;
    const result = scanPythonCodeSafety(unsafeCode, 'tr');
    expect(result.isSafe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toContain('eval');
  });

  it('should block system calls and dunder reflection attributes', () => {
    const unsafeCode = `
import subprocess
print(object.__subclasses__())
`;
    const result = scanPythonCodeSafety(unsafeCode, 'en');
    expect(result.isSafe).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });
});
