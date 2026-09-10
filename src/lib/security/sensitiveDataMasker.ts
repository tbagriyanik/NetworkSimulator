/**
 * Sensitive Data Masking Utility for Network Simulator CLI & Logging outputs.
 * Obfuscates passwords, pre-shared keys, enable secrets, and SNMP communities.
 */

const MASK_PLACEHOLDER = '••••••••';

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    // enable secret / enable password
    pattern: /(enable\s+(?:secret|password)\s+)(\S+)/gi,
    replacement: `$1${MASK_PLACEHOLDER}`,
  },
  {
    // user <name> secret/password <pwd>
    pattern: /(username\s+\S+\s+(?:secret|password)\s+)(\S+)/gi,
    replacement: `$1${MASK_PLACEHOLDER}`,
  },
  {
    // WPA/WPA2 pre-shared key
    pattern: /(wpa-psk\s+ascii\s+)(\S+)/gi,
    replacement: `$1${MASK_PLACEHOLDER}`,
  },
  {
    // SNMP community strings
    pattern: /(snmp-server\s+community\s+)(\S+)/gi,
    replacement: `$1${MASK_PLACEHOLDER}`,
  },
  {
    // line vty/console password
    pattern: /(password\s+)(\S+)/gi,
    replacement: `$1${MASK_PLACEHOLDER}`,
  },
];

/**
 * Masks sensitive authentication strings in CLI configuration outputs.
 */
export function maskSensitiveConfig(configText: string): string {
  if (!configText) return configText;
  let masked = configText;
  for (const item of SENSITIVE_PATTERNS) {
    masked = masked.replace(item.pattern, item.replacement);
  }
  return masked;
}

/**
 * Anonymizes an IPv4 address for privacy-focused logs.
 */
export function anonymizeIpAddress(ip: string): string {
  if (!ip || !ip.includes('.')) return ip;
  const parts = ip.split('.');
  if (parts.length !== 4) return ip;
  return `${parts[0]}.${parts[1]}.xxx.xxx`;
}
