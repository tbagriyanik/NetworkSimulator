const portNormalizeCache = new Map<string, string | null>();

/** Canonicalizes interface names used by the simulator. */
export function normalizePortId(input: string): string | null {
  if (!input) return null;
  const cached = portNormalizeCache.get(input);
  if (cached !== undefined) return cached;

  const result = ((): string | null => {
    const lower = input.toLowerCase().trim().replace(/\s+/g, '');

    const threePart = lower.match(/^(?:gigabitethernet|gigabit|gig|gi|g|fastethernet|fast|fa|f)(\d+)\/(\d+)\/(\d+)$/);
    if (threePart) return `${lower.startsWith('f') ? 'fa' : 'gi'}${threePart[1]}/${threePart[2]}/${threePart[3]}`;

    const subinterface = lower.match(/^(?:fa|fastethernet|fast|f|gi|gig|gigabit|gigabitethernet|g)(\d+)\/(\d+)\.(\d+)$/);
    if (subinterface) return `${lower.startsWith('f') ? 'fa' : 'gi'}${subinterface[1]}/${subinterface[2]}.${subinterface[3]}`;

    const twoPart = lower.match(/^(?:fastethernet|fast|fa|f|gigabitethernet|gigabit|gig|gi|g)(\d+)\/(\d+)$/);
    if (twoPart) return `${lower.startsWith('f') ? 'fa' : 'gi'}${twoPart[1]}/${twoPart[2]}`;

    const serial = lower.match(/^(?:serial|se|s)(\d+)\/(\d+)\/(\d+)$/);
    if (serial) return `s${serial[1]}/${serial[2]}/${serial[3]}`;

    const serialTwoPart = lower.match(/^(?:serial|se|s)(\d+)\/(\d+)$/);
    if (serialTwoPart) return `s${serialTwoPart[1]}/${serialTwoPart[2]}/0`;

    const loopback = lower.match(/^(?:loopback|lo)\s*(\d+)$/);
    if (loopback) return `loopback${loopback[1]}`;

    const portChannel = lower.match(/^(?:port-channel|portchannel|po)\s*(\d+)$/);
    if (portChannel) return `po${portChannel[1]}`;

    if (lower === 'wlan0') return 'wlan0';
    return null;
  })();

  if (portNormalizeCache.size < 1000) {
    portNormalizeCache.set(input, result);
  }
  return result;
}

/**
 * Determines if a port ID belongs to an expansion module (as opposed to built-in ports).
 * This logic is shared between networkTopology.helpers.ts and modularExpansion.ts to ensure consistency.
 */
export const isModulePort = (portId: string): boolean => {
  const lower = portId.toLowerCase();
  // Base built-in router ports: gi0/0 - gi0/3, console, s0/0/0, s0/1/0, s0/2/0.
  if (lower === 'console' || lower === 'wlan0' || lower.startsWith('vlan')) return false;
  
  // Standard built-in router ports: gi0/0 to gi0/3, s0/0/0 to s0/2/0
  if (/^gi0\/[0-3]$/.test(lower) || /^s0\/[0-2]\/0$/.test(lower)) {
    return false;
  }

  // Switch base ports: fa0/1 - fa0/24, gi1/0/1 - gi1/0/4, etc.
  if (/^fa0\/([1-9]|1[0-9]|2[0-4])$/.test(lower) || /^gi1\/0\/[1-4]$/.test(lower)) {
    return false;
  }

  // Switch base ports: gi0/1, gi0/2 (built-in uplink ports for L2 switches)
  if (/^gi0\/[1-2]$/.test(lower)) {
    return false;
  }

  // Expansion card ports follow slot notation like Serial1/0/0, Serial0/1/0, FastEthernet1/0/0, GigabitEthernet1/0/0
  // Or 3-part notation with non-zero slot index or full interface names (Serial, FastEthernet, GigabitEthernet, TenGigabitEthernet)
  if (/^[a-z]+[1-9]\d*\/\d+(\/\d+)?$/i.test(lower)) {
    return true;
  }

  if (/^(serial|fastethernet|gigabitethernet|tengigabitethernet)\d+\/\d+(\/\d+)?$/i.test(lower)) {
    const parts = lower.split('/');
    if (parts.length >= 3) {
      const middlePart = parseInt(parts[1], 10);
      const lastPart = parseInt(parts[2], 10);
      // Built-in serial ports use short 's0/0/0', 's0/1/0', 's0/2/0' format
      if (lower.startsWith('serial0/')) {
        if (middlePart >= 0 && middlePart <= 2 && lastPart === 0) {
          // If it starts with full 'Serial0/1/0' or 'Serial0/2/0' module naming
          return true;
        }
      }
    }
    return true;
  }

  if (/^[a-z]+\d*\/[1-9]\d*(\/\d+)?$/i.test(lower)) {
    return true;
  }

  return false;
};