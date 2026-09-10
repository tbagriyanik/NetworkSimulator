import { describe, it, expect } from 'vitest';
import { maskSensitiveConfig, anonymizeIpAddress } from '@/lib/security/sensitiveDataMasker';

describe('sensitiveDataMasker', () => {
  it('should mask enable secret and line passwords correctly', () => {
    const rawConfig = `
hostname Router1
enable secret 5 $1$mERr$bC
line vty 0 4
 password cisco123
login
`;
    const masked = maskSensitiveConfig(rawConfig);

    expect(masked).not.toContain('5 $1$mERr$bC');
    expect(masked).not.toContain('cisco123');
    expect(masked).toContain('enable secret ••••••••');
    expect(masked).toContain('password ••••••••');
  });

  it('should mask SNMP community strings and WPA keys', () => {
    const rawConfig = `
snmp-server community myPrivateStr RO
wpa-psk ascii SecretWifiKey123
`;
    const masked = maskSensitiveConfig(rawConfig);

    expect(masked).not.toContain('myPrivateStr');
    expect(masked).not.toContain('SecretWifiKey123');
    expect(masked).toContain('snmp-server community ••••••••');
    expect(masked).toContain('wpa-psk ascii ••••••••');
  });

  it('should anonymize IPv4 addresses for privacy logs', () => {
    const ip = '192.168.1.50';
    const anonymized = anonymizeIpAddress(ip);

    expect(anonymized).toBe('192.168.xxx.xxx');
  });
});
