/**
 * Helper to calculate IPv6 EUI-64 Host Address from MAC Address and Prefix
 */
export function calculateEui64(macAddress: string | undefined, prefixStr: string): string {
  // 1. Clean & normalize MAC address
  let cleanMac = (macAddress || '').replace(/[^0-9a-fA-F]/g, '');
  if (cleanMac.length !== 12) {
    cleanMac = '001122334455'; // Fallback MAC if not provided or invalid
  }

  // 2. Parse 6 bytes of MAC address
  const bytes = [];
  for (let i = 0; i < 12; i += 2) {
    bytes.push(parseInt(cleanMac.substring(i, i + 2), 16));
  }

  // 3. Flip the 7th bit (Universal/Local bit: 0x02) of byte 0
  bytes[0] = bytes[0] ^ 0x02;

  // 4. Insert 0xFF, 0xFE in the middle (between byte 2 and byte 3)
  const euiBytes = [
    bytes[0], bytes[1], bytes[2],
    0xff, 0xfe,
    bytes[3], bytes[4], bytes[5]
  ];

  // 5. Combine into 4 16-bit hex words (lower case, trim leading zeros)
  const w1 = ((euiBytes[0] << 8) | euiBytes[1]).toString(16);
  const w2 = ((euiBytes[2] << 8) | euiBytes[3]).toString(16);
  const w3 = ((euiBytes[4] << 8) | euiBytes[5]).toString(16);
  const w4 = ((euiBytes[6] << 8) | euiBytes[7]).toString(16);
  const interfaceId = `${w1}:${w2}:${w3}:${w4}`;

  // 6. Clean prefix (remove trailing /64, trailing ::, etc.)
  let cleanPrefix = prefixStr.split('/')[0].trim();
  if (cleanPrefix.endsWith('::')) {
    cleanPrefix = cleanPrefix.slice(0, -2);
  }

  // Handle prefix expansion if short (e.g. "2001:db8:1:1" or "2001:db8")
  let prefixParts = cleanPrefix ? cleanPrefix.split(':') : ['2001', 'db8', '0', '0'];
  // Pad prefix parts to 4 blocks if needed
  while (prefixParts.length < 4) {
    prefixParts.push('0');
  }
  if (prefixParts.length > 4) {
    prefixParts = prefixParts.slice(0, 4);
  }

  const prefixFormatted = prefixParts.join(':');
  return `${prefixFormatted}:${interfaceId}`;
}

import type { SwitchState } from './types';
import type { CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

/**
 * Evaluate SLAAC (IPv6 Router Advertisement auto-configuration) for a device
 */
export function evaluateSlaacForDevice(
  deviceId: string,
  deviceStates: Map<string, SwitchState>,
  connections: CanvasConnection[]
): { ipv6Address?: string; ipv6Prefix?: number; ipv6Gateway?: string } | null {
  const state = deviceStates.get(deviceId);
  if (!state) return null;

  const deviceConns = connections.filter(c => c.active && (c.sourceDeviceId === deviceId || c.targetDeviceId === deviceId));

  for (const conn of deviceConns) {
    const remoteDeviceId = conn.sourceDeviceId === deviceId ? conn.targetDeviceId : conn.sourceDeviceId;
    const remotePortId = conn.sourceDeviceId === deviceId ? conn.targetPort : conn.sourcePort;

    const remoteState = deviceStates.get(remoteDeviceId);
    if (!remoteState) continue;

    const isRouter = remoteState.deviceType === 'router' || remoteState.isLayer3Switch || remoteState.ipv6UnicastRouting || remoteState.ipv6Enabled;
    if (!isRouter) continue;
    if (remoteState.ipv6UnicastRouting === false) continue;

    const remotePort = remoteState.ports[remotePortId];
    if (!remotePort || remotePort.shutdown) continue;

    if (remotePort.ipv6NdSuppressRa === false) {
      const mac = state.macAddress || '0050.56a1.b2c3';
      const prefixStr = remotePort.ipv6Address || remotePort.ipv6LinkLocal || 'fe80::';
      const autoIpv6 = calculateEui64(mac, prefixStr);
      return {
        ipv6Address: autoIpv6,
        ipv6Prefix: remotePort.ipv6Prefix || 64,
        ipv6Gateway: remotePort.ipv6Address || remotePort.ipv6LinkLocal || 'fe80::1'
      };
    }
  }

  return null;
}

/**
 * Evaluate DHCPv6 address assignment for a PC.
 * When a connected router interface has 'ipv6 dhcp server <pool>' configured,
 * the PC gets a global IPv6 address from that pool's prefix.
 */
export function evaluateDhcpv6ForDevice(
  deviceId: string,
  deviceStates: Map<string, SwitchState>,
  connections: CanvasConnection[]
): { ipv6Address?: string; ipv6Prefix?: number; ipv6Gateway?: string } | null {
  const state = deviceStates.get(deviceId);
  if (!state) return null;

  const deviceConns = connections.filter(c => c.active && (c.sourceDeviceId === deviceId || c.targetDeviceId === deviceId));

  for (const conn of deviceConns) {
    const remoteDeviceId = conn.sourceDeviceId === deviceId ? conn.targetDeviceId : conn.sourceDeviceId;
    const remotePortId = conn.sourceDeviceId === deviceId ? conn.targetPort : conn.sourcePort;

    const remoteState = deviceStates.get(remoteDeviceId);
    if (!remoteState) continue;

    const remotePort = remoteState.ports[remotePortId];
    if (!remotePort || remotePort.shutdown) continue;

    // Check if the remote interface has 'ipv6 dhcp server <pool>' configured
    const poolName = remotePort.ipv6DhcpServerPool || remotePort.ipv6DhcpServer;
    if (!poolName) continue;

    // Find the pool on the remote router
    const pool = remoteState.ipv6DhcpPools?.[poolName];
    if (!pool?.addressPrefix) continue;

    // Generate a client address from the pool prefix using a deterministic host ID based on MAC
    const mac = state.macAddress || '0050.56a1.b2c3';
    const cleanMac = mac.replace(/[^0-9a-fA-F]/g, '');
    // Use last 4 bytes of MAC as host suffix (e.g., ::abcd:efff:1234:5678)
    const hostId = cleanMac.slice(-8);
    const prefix = pool.addressPrefix.split('/')[0].replace(/:+$/, '');

    // Format: <prefix>:<hostId with colons>
    const formattedHost = `${hostId.slice(0, 4)}:${hostId.slice(4)}`;
    const ipv6Address = `${prefix}:${formattedHost}`;

    const gateway = remotePort.ipv6Address || remotePort.ipv6LinkLocal || 'fe80::1';

    // Store DHCPv6 binding entry on the server router
    const bindingDuid = `00:03:00:01:${cleanMac.slice(0, 4)}:${cleanMac.slice(4, 8)}:${cleanMac.slice(8, 12)}`;
    const existingBindings = remoteState.dhcpv6Bindings || [];
    if (!existingBindings.some(b => b.ipv6Address === ipv6Address || b.duid === bindingDuid)) {
      remoteState.dhcpv6Bindings = [
        ...existingBindings,
        {
          iaid: '0x00010001',
          duid: bindingDuid,
          ipv6Address,
          type: 'IA_NA',
          preferredLifetime: 604800,
          validLifetime: 2592000,
          interfaceId: remotePortId,
          clientHostname: state.hostname,
          leaseTime: Date.now()
        }
      ];
    }

    return {
      ipv6Address,
      ipv6Prefix: pool.addressPrefix.split('/')[1] ? parseInt(pool.addressPrefix.split('/')[1]) : 64,
      ipv6Gateway: gateway,
    };
  }

  return null;
}



