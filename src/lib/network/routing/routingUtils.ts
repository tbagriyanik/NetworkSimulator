/**
 * Convert IP string to number
 */
export function ipToNumber(ip: string): number {
  if (!ip) {
    throw new Error('IP address is undefined or empty');
  }
  const octets = ip.split('.');
  if (octets.length !== 4) {
    throw new Error('Invalid IP address format');
  }
  for (const octetStr of octets) {
    const octet = parseInt(octetStr, 10);
    if (isNaN(octet) || octet < 0 || octet > 255) {
      throw new Error('Invalid octet value');
    }
  }
  return octets.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Get prefix length from subnet mask
 */
export function getPrefixLength(subnetMask: string): number {
  if (!subnetMask) {
    return 0;
  }
  const maskNum = ipToNumber(subnetMask);
  let count = 0;
  let temp = maskNum;

  while (temp) {
    count += temp & 1;
    temp >>>= 1;
  }

  return count;
}

/**
 * Check if address is IPv6
 */
export function isIpv6(address: string): boolean {
  return address.includes(':');
}

/**
 * Expand IPv6 shorthand address
 */
export function expandIpv6(address: string): string {
  if (!address.includes('::')) return address;
  const parts = address.split('::');
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts[1] ? parts[1].split(':') : [];
  const missing = 8 - (left.length + right.length);
  const middle = Array(missing).fill('0');
  return [...left, ...middle, ...right].map(p => p.padStart(4, '0')).join(':');
}

/**
 * Check if IPv6 address is in network
 */
export function isIpv6InNetwork(address: string, network: string, prefixLength: number): boolean {
  if (!address || !network || !isIpv6(address) || !isIpv6(network)) {
    return false;
  }
  try {
    const fullAddress = expandIpv6(address).split(':').map(p => parseInt(p, 16));
    const fullNetwork = expandIpv6(network).split(':').map(p => parseInt(p, 16));

    let bitsRemaining = prefixLength;
    for (let i = 0; i < 8; i++) {
      if (bitsRemaining <= 0) break;
      const bitsInThisGroup = Math.min(bitsRemaining, 16);
      const mask = (0xFFFF << (16 - bitsInThisGroup)) & 0xFFFF;

      if ((fullAddress[i] & mask) !== (fullNetwork[i] & mask)) {
        return false;
      }
      bitsRemaining -= bitsInThisGroup;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if IP is in network
 */
export function isIpInNetwork(ip: string, network: string, subnetMask: string): boolean {
  if (!ip || !network || !subnetMask) {
    return false;
  }
  try {
    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(network);
    const maskNum = ipToNumber(subnetMask);

    return (ipNum & maskNum) === (networkNum & maskNum);
  } catch {
    return false;
  }
}

/** Build a subnet mask string from a prefix length (1-31 kept explicit). */
export function maskFromPrefixLength(length: number): string {
  if (length <= 0) return '0.0.0.0';
  const num = length >= 32 ? 0xffffffff : (0xffffffff << (32 - length)) >>> 0;
  return [24, 16, 8, 0].map(shift => (num >>> shift) & 0xff).join('.');
}
