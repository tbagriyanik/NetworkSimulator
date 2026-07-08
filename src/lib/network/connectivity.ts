import { CanvasDevice, CanvasConnection, CanvasPort } from '@/components/network/networkTopology.types';
import { CableInfo, SwitchState, isCableCompatible, Port } from './types';
import { findRoute, ipToNumber, getRoutingTable, isIpv6InNetwork } from './routing';
import { performArpResolution } from './arp';
import { learnMacAddress, findMacPort } from './macLearning';
import { ensureDeviceStatesMap } from './networkUtils';
import { recalculateStp } from './stp';

type WifiMode = 'ap' | 'client' | 'disabled' | 'sta';

export interface DeviceWifiConfig {
  enabled: boolean;
  ssid: string;
  bssid?: string;
  password?: string;
  security: 'open' | 'wpa' | 'wpa2' | 'wpa3';
  channel: '2.4GHz' | '5GHz';
  mode: WifiMode;
}

const normalizeWifiMode = (mode: string | undefined, fallback: WifiMode): WifiMode => {
  if (!mode) return fallback;
  const words = mode.toLowerCase();
  if (words === 'ap') return 'ap';
  if (words === 'client') return 'client';
  if (words === 'sta') return 'sta';
  if (words === 'disabled') return 'disabled';
  return fallback;
};

const normalizeSecurity = (security: string | undefined): DeviceWifiConfig['security'] => {
  const value = security ? security.toLowerCase() : 'open';
  if (value === 'wpa3') return 'wpa3';
  if (value === 'wpa2') return 'wpa2';
  if (value === 'wpa') return 'wpa';
  return 'open';
};

const normalizeChannel = (channel: string | undefined): DeviceWifiConfig['channel'] => {
  const value = channel ? channel.toLowerCase() : '2.4ghz';
  if (value === '5ghz') return '5GHz';
  return '2.4GHz';
};

/**
 * Calculate STP blocking state for a specific VLAN on a port
 * In PVST, each VLAN has its own STP instance with potentially different root bridges
 * Also updates the port's spanningTree.state to reflect the current VLAN's STP state
 */
const getVlanSpecificSTPBlocking = (
  deviceId: string,
  portId: string,
  vlanId: number,
  connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>,
  existingConnection?: CanvasConnection
): boolean => {
  if (!deviceStates) return false;

  const state = deviceStates.get(deviceId);
  if (!state) return false;

  const port: Port = state.ports[portId];
  if (!port) return false;

  // If port is shutdown, it's not blocking (it's just down)
  if (port.shutdown) return false;

  // Check if the connection is active - if the link is down, STP should reconverge
  // and blocked ports should become forwarding (backup path)
  const connection = existingConnection || connections.find(c =>
    (c.sourceDeviceId === deviceId && c.sourcePort === portId) ||
    (c.targetDeviceId === deviceId && c.targetPort === portId)
  );

  // If connection is down, STP would reconverge and this port would not block
  if (connection && connection.active === false) {
    return false;
  }

  // If connection is up, use the original STP configuration
  // First try to read the per-VLAN spanning tree instance (PVST)
  const vlanStp = port.spanningTree?.instances?.[vlanId];
  if (vlanStp) {
    return vlanStp.state === 'blocking';
  }

  // Fall back to the legacy single-instance state for VLAN 1 only.
  // This keeps classic STP behavior intact while avoiding false VLAN matches in PVST.
  if (vlanId === 1 && port.spanningTree?.state) {
    return port.spanningTree.state === 'blocking';
  }

  // If no VLAN-specific instance is defined, do NOT fall back to VLAN 1.
  // Returning false allows pathfinding to continue without incorrectly blocking a VLAN path.
  return false;
};

/**
 * Check port security for a switch port
 * Returns violation result if MAC is not allowed, null if allowed
 */
function checkPortSecurityViolation(
  switchId: string,
  portId: string,
  sourceMac: string,
  deviceStates?: Map<string, SwitchState>
): { violation: boolean; action: 'shutdown' | 'restrict' | 'protect'; reason: string } | null {
  if (!deviceStates) return null;

  const switchState = deviceStates.get(switchId);
  if (!switchState) return null;

  const port = switchState.ports[portId];
  if (!port?.portSecurity?.enabled) return null;

  // Normalize MAC address for comparison
  const normalizedSourceMac = sourceMac.toLowerCase().replace(/[-:.]/g, '');
  const staticMacs = port.staticMacs || [];
  const normalizedStaticMacs = staticMacs.map(m => m.toLowerCase().replace(/[-:.]/g, ''));

  // Check if source MAC is in the allowed list
  const isAllowed = normalizedStaticMacs.includes(normalizedSourceMac);

  if (!isAllowed) {
    const action = port.portSecurity.violationAction || 'shutdown';
    return {
      violation: true,
      action,
      reason: `Port security violation on ${switchId} ${portId}: MAC ${sourceMac} not in secure MAC list`
    };
  }

  return null;
}

export function getDeviceWifiConfig(device: CanvasDevice | undefined, deviceStates?: Map<string, SwitchState>): DeviceWifiConfig | undefined {
  if (!device) return undefined;
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const state = safeDeviceStates?.get(device.id);
  const wlanState: Port | undefined = state?.ports['wlan0'];
  const defaultMode: WifiMode = device.type === 'pc' ? 'client' : 'ap';

  if (wlanState?.wifi?.ssid) {
    const mode = normalizeWifiMode(wlanState.wifi.mode, defaultMode);
    const enabled = mode !== 'disabled' && !(wlanState.shutdown ?? false);
    return {
      enabled,
      ssid: wlanState.wifi.ssid,
      password: wlanState.wifi.password,
      security: normalizeSecurity(wlanState.wifi.security),
      channel: normalizeChannel(wlanState.wifi.channel),
      mode,
    };
  }

  if (device.wifi?.ssid) {
    const mode = normalizeWifiMode(device.wifi.mode, defaultMode);
    return {
      enabled: device.wifi.enabled ?? true,
      ssid: device.wifi.ssid,
      password: device.wifi.password,
      security: normalizeSecurity(device.wifi.security),
      channel: normalizeChannel(device.wifi.channel),
      mode,
    };
  }

  const wlanPort = device.ports.find(p => p.id === 'wlan0' && p.wifi?.ssid);
  if (wlanPort && wlanPort.wifi) {
    const mode = normalizeWifiMode(wlanPort.wifi.mode, defaultMode);
    return {
      enabled: mode !== 'disabled' && !(wlanPort.shutdown ?? false),
      ssid: wlanPort.wifi.ssid,
      password: wlanPort.wifi.password,
      security: normalizeSecurity(wlanPort.wifi.security),
      channel: normalizeChannel(wlanPort.wifi.channel),
      mode,
    };
  }

  return undefined;
}

export function getWirelessSignalStrength(
  device: CanvasDevice | undefined,
  devices: CanvasDevice[] = [],
  deviceStates?: Map<string, SwitchState>
): number {
  if (!device) return 0;
  // BOLT: Resolve safeDeviceStates once outside loops
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const pcWifi = getDeviceWifiConfig(device, safeDeviceStates);
  if (!pcWifi || !pcWifi.enabled || !pcWifi.ssid) return 0;
  if (pcWifi.mode !== 'client' && pcWifi.mode !== 'sta') return 0;

  const targetSsid = pcWifi.ssid.toLowerCase();
  let minDist = Infinity;

  devices.forEach(dev => {
    if (dev.id === device.id) return;
    // BOLT: Use pre-resolved safeDeviceStates
    const apWifi = getDeviceWifiConfig(dev, safeDeviceStates);
    if (!apWifi || apWifi.mode !== 'ap' || !apWifi.enabled) return;
    if (!apWifi.ssid || apWifi.ssid.toLowerCase() !== targetSsid) return;
    const dx = (device.x || 0) - (dev.x || 0);
    const dy = (device.y || 0) - (dev.y || 0);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) minDist = dist;
  });

  if (minDist === Infinity) return 0;
  if (minDist < 150) return 5;
  if (minDist < 250) return 4;
  if (minDist < 350) return 3;
  if (minDist < 450) return 2;
  if (minDist < 550) return 1;
  return 0;
}

/**
 * Returns the distance (px) to the nearest AP with matching SSID.
 * Returns Infinity if no AP found or device is not a WiFi client.
 */
export function getWirelessDistance(
  device: CanvasDevice | undefined,
  devices: CanvasDevice[] = [],
  deviceStates?: Map<string, SwitchState>
): number {
  if (!device) return Infinity;
  // BOLT: Resolve safeDeviceStates once outside loops
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const pcWifi = getDeviceWifiConfig(device, safeDeviceStates);
  if (!pcWifi || !pcWifi.enabled || !pcWifi.ssid) return Infinity;
  if (pcWifi.mode !== 'client' && pcWifi.mode !== 'sta') return Infinity;

  const targetSsid = pcWifi.ssid.toLowerCase();
  let minDist = Infinity;

  devices.forEach(dev => {
    if (dev.id === device.id) return;
    // BOLT: Use pre-resolved safeDeviceStates
    const apWifi = getDeviceWifiConfig(dev, safeDeviceStates);
    if (!apWifi || apWifi.mode !== 'ap' || !apWifi.enabled) return;
    if (!apWifi.ssid || apWifi.ssid.toLowerCase() !== targetSsid) return;
    const dx = (device.x || 0) - (dev.x || 0);
    const dy = (device.y || 0) - (dev.y || 0);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) minDist = dist;
  });

  return minDist;
}

/**
 * Check if a hostname is an external domain (not in local network)
 */
function isExternalDomain(hostname: string, devices: CanvasDevice[], deviceStates?: Map<string, SwitchState>): boolean {
  // Clean hostname
  const cleanHostname = hostname.toLowerCase().replace(/^www\./, '');

  // Check if it's an IP address (not external)
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipRegex.test(cleanHostname)) {
    return false;
  }

  // Check if it matches any local device name
  for (const device of devices) {
    const deviceName = device.name?.toLowerCase();
    if (deviceName === cleanHostname) {
      return false;
    }
  }

  // Check if it matches any configured hostname
  if (deviceStates) {
    const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
    for (const [, state] of safeDeviceStates.entries()) {
      const deviceHostname = state.hostname?.toLowerCase();
      if (deviceHostname === cleanHostname) {
        return false;
      }
    }
  }

  // Check if it's a known external domain (has dots and not local)
  if (cleanHostname.includes('.')) {
    const parts = cleanHostname.split('.');
    if (parts.length >= 2) {
      const tld = parts[parts.length - 1];
      // Common TLDs indicate external domains
      const commonTlds = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'io', 'co', 'us', 'uk', 'de', 'fr', 'jp', 'cn', 'au', 'ca'];
      return commonTlds.includes(tld);
    }
  }

  return false;
}

/**
 * Simulate external DNS lookup for domain names
 * Generates consistent IP addresses for known domains
 */
function simulateDnsLookup(hostname: string): string | null {
  // Clean hostname
  const cleanHostname = hostname.toLowerCase().replace(/^www\./, '');

  // Known domain mappings (simulated DNS records)
  const knownDomains: Record<string, string> = {
    'portal.local': '192.0.2.10',
    'docs.local': '192.0.2.20',
    'search.local': '192.0.2.30',
    'mail.local': '192.0.2.40',
    'files.local': '192.0.2.50',
    'video.local': '192.0.2.60',
    'social.local': '192.0.2.70',
    'wiki.local': '192.0.2.80',
    'forum.local': '192.0.2.90',
    'a10.com': '52.8.34.123', // Added for the specific case
  };

  // Return known domain IP if exists
  if (knownDomains[cleanHostname]) {
    return knownDomains[cleanHostname];
  }

  // Generate consistent pseudo-random IP for unknown domains
  // This ensures the same domain always gets the same IP
  let hash = 0;
  for (let i = 0; i < cleanHostname.length; i++) {
    const char = cleanHostname.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate IP from hash (ensuring valid public IP ranges)
  const octet1 = Math.abs(hash % 224) + 1; // 1-224 (avoid multicast/reserved)
  const octet2 = Math.abs((hash >> 8) % 256);
  const octet3 = Math.abs((hash >> 16) % 256);
  const octet4 = Math.abs((hash >> 24) % 256);

  // Avoid private IP ranges
  if (octet1 === 10 || (octet1 === 192 && octet2 === 168) || (octet1 === 172 && octet2 >= 16 && octet2 <= 31)) {
    return simulateDnsLookup(cleanHostname + '1'); // Recurse with slight variation
  }

  return `${octet1}.${octet2}.${octet3}.${octet4}`;
}

/**
 * Resolve hostname to IP address
 * Checks device hostnames and domain names to find matching IP
 * Falls back to external DNS lookup for unknown domains
 */
function resolveHostname(
  hostname: string,
  devices: CanvasDevice[],
  deviceStates?: Map<string, SwitchState>,
  deviceMap?: Map<string, CanvasDevice>
): string | null {
  // Clean hostname (remove www., convert to lowercase)
  const cleanHostname = hostname.toLowerCase().replace(/^www\./, '');

  // 1. Check exact hostname matches against device names
  if (deviceMap) {
    for (const device of deviceMap.values()) {
      const deviceName = device.name?.toLowerCase();
      if (deviceName === cleanHostname && device.ip) {
        return device.ip;
      }
    }
  } else {
    for (const device of devices) {
      const deviceName = device.name?.toLowerCase();
      if (deviceName === cleanHostname && device.ip) {
        return device.ip;
      }
    }
  }

  // 2. Check against device hostnames in device states
  if (deviceStates) {
    const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
    for (const [deviceId, state] of safeDeviceStates.entries()) {
      const deviceHostname = state.hostname?.toLowerCase();
      if (deviceHostname === cleanHostname) {
        // Find the device and get its IP
        const device = deviceMap ? deviceMap.get(deviceId) : devices.find(d => d.id === deviceId);
        if (device?.ip) return device.ip;

        // Check interfaces for IP if device IP is not set
        for (const portId in state.ports) {
          const port = state.ports[portId];
          if (port.ipAddress) {
            return port.ipAddress;
          }
        }
      }
    }
  }

  // 3. Check domain name matches (hostname.domain.com)
  const parts = cleanHostname.split('.');
  if (parts.length > 1) {
    const baseHostname = parts[0];
    const domain = parts.slice(1).join('.');

    // Check devices with matching domain
    if (deviceStates) {
      const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
    for (const [deviceId, state] of safeDeviceStates.entries()) {
        const deviceDomain = state.domainName?.toLowerCase();
        const deviceHostname = state.hostname?.toLowerCase();

        if (deviceDomain === domain && deviceHostname === baseHostname) {
          const device = deviceMap ? deviceMap.get(deviceId) : devices.find(d => d.id === deviceId);
          if (device?.ip) return device.ip;

          // Check interfaces for IP
          for (const portId in state.ports) {
            const port = state.ports[portId];
            if (port.ipAddress) {
              return port.ipAddress;
            }
          }
        }
      }
    }
  }

  // 4. Fallback: check if any device name contains the hostname as substring
  if (deviceMap) {
    for (const device of deviceMap.values()) {
      const deviceName = device.name?.toLowerCase();
      if (deviceName && deviceName.includes(cleanHostname) && device.ip) {
        return device.ip;
      }
    }
  } else {
    for (const device of devices) {
      const deviceName = device.name?.toLowerCase();
      if (deviceName && deviceName.includes(cleanHostname) && device.ip) {
        return device.ip;
      }
    }
  }

  // 5. External DNS lookup for unknown domains
  // This handles external domain names like a10.com, etc.
  const externalIp = simulateDnsLookup(cleanHostname);
  if (externalIp) {
    return externalIp;
  }

  return null;
}

/**
 * Check serial encapsulation compatibility between two ports on a serial link.
 * Both ends must use the same encapsulation (HDLC or PPP).
 * For PPP with authentication, checks that auth is configured on both sides.
 */
function checkSerialEncapsulation(
  srcDeviceId: string,
  srcPortId: string,
  dstDeviceId: string,
  dstPortId: string,
  deviceStates: Map<string, SwitchState>
): boolean {
  const srcState = deviceStates.get(srcDeviceId);
  const dstState = deviceStates.get(dstDeviceId);
  if (!srcState || !dstState) return true;

  const srcPort = srcState.ports[srcPortId];
  const dstPort = dstState.ports[dstPortId];
  if (!srcPort || !dstPort) return true;

  // Only check serial ports
  if (srcPort.type !== 'serial' && dstPort.type !== 'serial') return true;
  if (srcPort.type === 'serial' && dstPort.type !== 'serial') return false;
  if (srcPort.type !== 'serial' && dstPort.type === 'serial') return false;

  const srcEncap = srcPort.serialEncapsulation || 'hdlc';
  const dstEncap = dstPort.serialEncapsulation || 'hdlc';

  // Both ends must use the same encapsulation
  if (srcEncap !== dstEncap) return false;

  // PPP authentication check
  if (srcEncap === 'ppp') {
    const srcAuth = srcPort.pppAuth || 'none';
    const dstAuth = dstPort.pppAuth || 'none';

    // If one side requires authentication, both must authenticate
    if (srcAuth !== 'none' || dstAuth !== 'none') {
      // Both sides must have authentication configured
      if (srcAuth === 'none' || dstAuth === 'none') return false;

      // PAP: validate credentials match
      if (srcAuth === 'pap' && dstAuth === 'pap') {
        const srcUser = srcPort.pppPapUsername || '';
        const srcPass = srcPort.pppPapPassword || '';
        const dstUser = dstPort.pppPapUsername || '';
        const dstPass = dstPort.pppPapPassword || '';
        // In a real PPP link, the credentials are sent and verified
        // Source's sent-username/password should match target's expected credentials
        if (srcUser && srcPass && dstUser && dstPass) {
          if (srcUser !== dstUser || srcPass !== dstPass) return false;
        }
      }

      // CHAP: shared secret must match (simplified)
      if (srcAuth === 'chap' && dstAuth === 'chap') {
        const srcUser = srcPort.pppPapUsername || '';
        const srcPass = srcPort.pppPapPassword || '';
        const dstUser = dstPort.pppPapUsername || '';
        const dstPass = dstPort.pppPapPassword || '';
        if (srcUser && srcPass && dstUser && dstPass) {
          if (srcUser !== dstUser || srcPass !== dstPass) return false;
        }
      }
    }
  }

  return true;
}

/**
 * Robust Network connectivity checker for simulation
 * Checks if two devices can communicate based on:
 * 1. Physical connection (Topology)
 * 2. Layer 3 configuration (IP/Subnet)
 * 3. VLAN configuration (for Switches)
 * 4. Port status (Shutdown/Connected)
 */
export function checkConnectivity(
  sourceId: string,
  targetIp: string,
  devices: CanvasDevice[],
  _connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>,
  language: 'tr' | 'en' = 'tr',
  options?: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string }
): {
  success: boolean;
  hops: string[];
  hopIds: string[];
  targetId?: string;
  error?: string;
  portSecurityViolations?: Array<{ deviceId: string; portId: string; action: string; mac: string }>;
  traversedPorts?: Array<{ deviceId: string; portId: string; type: 'ingress' | 'egress' }>;
  capturedPackets?: Array<{ connectionId: string; sourceIp: string; targetIp: string; protocol: string; length: number; info: string }>;
} {
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const isSwitchDeviceType = (type: string): boolean => type === 'switchL2' || type === 'switchL3';

  // Track port security violations for React state updates
  const portSecurityViolations: Array<{ deviceId: string; portId: string; action: string; mac: string }> = [];
  const traversedPorts: Array<{ deviceId: string; portId: string; type: 'ingress' | 'egress' }> = [];
  const capturedPackets: Array<{ connectionId: string; sourceIp: string; targetIp: string; protocol: string; length: number; info: string }> = [];

  // BOLT: Use a device map for O(1) lookups
  const deviceMap = new Map<string, CanvasDevice>();
  for (const d of devices) {
    deviceMap.set(d.id, d);
  }

  // 1.5. Implicit Wireless Connections
  const connections = [..._connections];
  if (deviceStates) {
    // Get AP devices - routers/switches from topology
    const apDevices = devices.filter(d => isSwitchDeviceType(d.type) || d.type === 'router');
    // Get PC/IoT devices that have WiFi configured - check both device.wifi and deviceStates
    const pcDevices = devices.filter(d => {
      // BOLT: Use pre-resolved safeDeviceStates
      const wifi = getDeviceWifiConfig(d, safeDeviceStates);
      // PC/IoT must have wifi with a non-empty ssid and must be in client mode (not ap)
      return (d.type === 'pc' || d.type === 'iot') && !!wifi && wifi.enabled && !!wifi.ssid && (wifi.mode === 'client' || wifi.mode === 'sta');
    });

    for (const pc of pcDevices) {
      // BOLT: Use pre-resolved safeDeviceStates
      const pcWifi = getDeviceWifiConfig(pc, safeDeviceStates);
      if (!pcWifi || !pcWifi.enabled || !pcWifi.ssid || (pcWifi.mode !== 'client' && pcWifi.mode !== 'sta')) continue;

      const targetSsid = pcWifi.ssid.toLowerCase();
      const connectedAps: Array<{ ap: CanvasDevice, dist: number }> = [];

      for (const ap of apDevices) {
        // Check AP in deviceStates first
        // BOLT: Use pre-resolved safeDeviceStates
        const apState = safeDeviceStates.get(ap.id);
        const wlan = apState?.ports['wlan0'];
        let apWifi = wlan?.wifi;

        // If no wlan in deviceStates, check if AP has WiFi config in topology
        if (!apWifi && ap.wifi && ap.wifi.ssid) {
          apWifi = ap.wifi;
        }

        if (apWifi && (wlan?.shutdown === false || !wlan?.shutdown) && (apWifi.mode || 'ap').toLowerCase() === 'ap' && (apWifi.ssid || '').toLowerCase() === targetSsid) {
          if (!pcWifi.bssid || pcWifi.bssid === ap.id) {
            const apSecurity = (apWifi.security || 'open').toLowerCase();
            const pcSecurity = (pcWifi.security || 'open').toLowerCase();
            if (apSecurity === pcSecurity) {
              if (apSecurity === 'open' || apWifi.password === pcWifi.password) {
                // BOLT: Calculate distance directly to avoid redundant O(N) scans
                const dx = (pc.x || 0) - (ap.x || 0);
                const dy = (pc.y || 0) - (ap.y || 0);
                const dist = Math.sqrt(dx * dx + dy * dy);

                // No signal if too far
                if (dist < 550) {
                  connectedAps.push({ ap, dist });
                }
              }
            }
          }
        }
      }

      // Add all reachable APs as potential paths
      for (const { ap } of connectedAps) {
        connections.push({
          id: `wireless-${pc.id}-${ap.id}`,
          sourceDeviceId: pc.id,
          sourcePort: 'wlan0',
          targetDeviceId: ap.id,
          targetPort: 'wlan0',
          cableType: 'wireless',
          active: true
        } as CanvasConnection);
      }
    }
  }

  // BOLT: Pre-calculate adjacency list for O(V + C) BFS
  const adjList = new Map<string, Array<{ neighborId: string, conn: CanvasConnection }>>();
  for (const conn of connections) {
    if (conn.active === false) continue;

    const srcList = adjList.get(conn.sourceDeviceId);
    if (srcList) srcList.push({ neighborId: conn.targetDeviceId, conn });
    else adjList.set(conn.sourceDeviceId, [{ neighborId: conn.targetDeviceId, conn }]);

    const tgtList = adjList.get(conn.targetDeviceId);
    if (tgtList) tgtList.push({ neighborId: conn.sourceDeviceId, conn });
    else adjList.set(conn.targetDeviceId, [{ neighborId: conn.sourceDeviceId, conn }]);
  }

  // 0. Resolve hostname to IP if necessary
  let resolvedTargetIp = targetIp;
  let isExternal = false;
  let routingRequired = false;

  // Check if targetIp is a hostname (not an IP address)
  const isIp = (val: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(val) || val.includes(':');
  if (!isIp(targetIp)) {
    // Check if source device has domain lookup disabled
    const sourceState = deviceStates?.get(sourceId);
    if (sourceState?.domainLookup === false) {
      const dnsServer = sourceState?.dnsServer || '255.255.255.255';
      return { success: false, hops: [], hopIds: [], error: `% Unknown command or domain lookup disabled.\nTranslating "${targetIp}"...domain server (${dnsServer})\n% Unrecognized host or address, or protocol not running.` };
    }

    // Check if this is an external domain
    isExternal = isExternalDomain(targetIp, devices, deviceStates);

    const resolvedIp = resolveHostname(targetIp, devices, deviceStates, deviceMap);
    if (!resolvedIp) {
      return { success: false, hops: [], hopIds: [], error: 'Request timed out.' };
    }
    resolvedTargetIp = resolvedIp;
  }

  // For external domains, simulate successful internet routing
  if (isExternal) {
    const sourceDevice = deviceMap.get(sourceId);
    if (sourceDevice) {
      // Simulate internet routing path
      const hops = ['Internet Gateway', 'ISP Router', 'External Network'];
      const hopIds = [sourceId, 'internet-gateway', 'external-network'];

      return {
        success: true,
        hops,
        hopIds,
        targetId: 'external-domain',
        error: undefined,
        portSecurityViolations
      };
    }
  }

  // 1. Find target device by IP (supports both IPv4 and IPv6)
  // Recalculate STP states for accurate blocking
  let stpDeviceStates = safeDeviceStates;
  if (safeDeviceStates.size > 0) {
    stpDeviceStates = recalculateStp(safeDeviceStates, connections);
  }

  // BOLT: Pre-calculate an ipMap for O(1) device resolution
  const ipMap = new Map<string, string>(); // IP -> deviceId
  for (const d of devices) {
    if (d.ip) ipMap.set(d.ip, d.id);
    if (d.ipv6) ipMap.set(d.ipv6.toLowerCase(), d.id);
  }

  if (deviceStates) {
    for (const [id, state] of deviceStates.entries()) {
      for (const portId in state.ports) {
        const port = state.ports[portId];
        if (port.ipAddress) ipMap.set(port.ipAddress, id);
        if (port.ipv6Address) ipMap.set(port.ipv6Address.toLowerCase(), id);
      }
    }
  }

  const targetDeviceId = ipMap.get(resolvedTargetIp.toLowerCase());
  const targetDevice = targetDeviceId ? deviceMap.get(targetDeviceId) : undefined;

  if (!targetDevice) {
    return { success: false, hops: [], hopIds: [], error: 'Request timed out.' };
  }

  // 1.5. Perform ARP resolution if target is in same subnet
  // ARP is needed for L2 communication to resolve IP to MAC
  const sourceDeviceForArp = deviceMap.get(sourceId);
  if (sourceDeviceForArp && deviceStates && targetDevice?.macAddress) {
    const sourceState = deviceStates.get(sourceId);
    if (sourceState) {
      // Check if source and target are in same subnet
      // BOLT: Use pre-resolved safeDeviceStates
      const sourceIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates, false, sourceDeviceForArp);
      const sourceSubnet = getSubnetForDeviceIp(sourceId, sourceIp, devices, safeDeviceStates, sourceDeviceForArp) || '255.255.255.0';

      if (isIpInSubnet(sourceIp, resolvedTargetIp, sourceSubnet)) {
        // Same subnet - perform ARP resolution
        // Find the interface through which we'll send the ARP
        // BOLT: Use pre-calculated adjList for O(1) connection lookup
        const sourceConn = adjList.get(sourceId)?.[0]?.conn;
        const interfaceName = sourceConn ? (sourceConn.sourceDeviceId === sourceId ? sourceConn.sourcePort : sourceConn.targetPort) : 'unknown';

        // Check if ARP is already in cache to avoid redundant capture logs
        const cachedMac = sourceState.arpCache?.find(e => e.ip === resolvedTargetIp);

        // Perform ARP resolution (simulated)
        performArpResolution(
          sourceId,
          resolvedTargetIp,
          targetDevice.macAddress,
          interfaceName,
          deviceStates
        );

        if (!cachedMac && sourceConn) {
          // Record ARP Broadcast Request
          capturedPackets.push({
            connectionId: sourceConn.id,
            sourceIp: sourceIp,
            targetIp: '255.255.255.255',
            protocol: 'ARP',
            length: 42,
            info: `ARP Request: Who has ${resolvedTargetIp}? Tell ${sourceIp}`
          });
          // Record ARP Unicast Reply
          capturedPackets.push({
            connectionId: sourceConn.id,
            sourceIp: resolvedTargetIp,
            targetIp: sourceIp,
            protocol: 'ARP',
            length: 42,
            info: `ARP Reply: ${resolvedTargetIp} is at ${targetDevice.macAddress}`
          });
        }
      }
    }
  }

  const getPortVlan = (port: Port | CanvasPort | undefined): number => {
    return Number(port?.accessVlan || port?.vlan || 1);
  };

  const getDeviceVlan = (device: CanvasDevice, state?: SwitchState): number | null => {
    if (device.type === 'pc' || device.type === 'iot') {
      // BOLT: Use pre-calculated adjList for O(1) connection lookup
      const neighbors = adjList.get(device.id);
      const connectedConn = neighbors?.[0]?.conn;

      if (connectedConn && deviceStates) {
        const peerDeviceId = connectedConn.sourceDeviceId === device.id ? connectedConn.targetDeviceId : connectedConn.sourceDeviceId;
        const peerPortId = connectedConn.sourceDeviceId === device.id ? connectedConn.targetPort : connectedConn.sourcePort;
        const peerState = deviceStates.get(peerDeviceId);
        const peerPort = peerState?.ports?.[peerPortId];
        if (peerPort) {
          if (peerPort.mode === 'trunk') return 1;
          return getPortVlan(peerPort);
        }
      }
      return Number(device.vlan || 1);
    }
    if (!state) return 1;

    // Prefer any SVI / management VLAN tied to the device's IP
    const ip = device.ip || state.ports['vlan1']?.ipAddress || '';
    for (const [portId, port] of Object.entries(state.ports)) {
      if (portId.startsWith('vlan') && port.ipAddress === ip) {
        const vlanMatch = portId.match(/vlan(\d+)/);
        return vlanMatch ? parseInt(vlanMatch[1], 10) : 1;
      }
    }

    // For access ports, the VLAN assigned to the active port is the device VLAN
    const accessPort = Object.values(state.ports).find((port: Port) => !port.shutdown && port.mode === 'access' && getPortVlan(port) !== 1);
    if (accessPort) return getPortVlan(accessPort);

    return 1;
  };

  const getFallbackVlanFromPath = (deviceId: string): number => {
    const device = deviceMap.get(deviceId);
    const state = deviceStates?.get(deviceId);
    if (!device) return 1;
    const vlan = getDeviceVlan(device, state);
    if (vlan && vlan > 0) return vlan;
    return 1;
  };

  // 2. Simple Pathfinding (BFS) to check physical connectivity
  const queue: string[] = [sourceId];
  const visited = new Set<string>([sourceId]);
  const parent = new Map<string, string>();

  // Determine source device VLAN for STP calculation
  const sourceVlan = getFallbackVlanFromPath(sourceId);

  // Initialize traversal IPs for NAT simulation
  let currentSourceIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates, resolvedTargetIp.includes(':'));
  let currentTargetIp = resolvedTargetIp;

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;
    if (currentId === targetDevice.id) break;

    // BOLT: Use pre-calculated adjacency list for O(1) neighbor lookup
    const neighbors = adjList.get(currentId) || [];

    for (const { neighborId, conn } of neighbors) {
      if (!visited.has(neighborId)) {
        // Check if port is shutdown or device is powered off on either side
        if (conn) {
          // Check source side port
          const srcPortId = conn.sourceDeviceId === currentId ? conn.sourcePort : conn.targetPort;
          const dstPortId = conn.sourceDeviceId === neighborId ? conn.sourcePort : conn.targetPort;

          // BOLT: Use pre-calculated deviceMap for O(1) device lookup
          const srcDevice = deviceMap.get(currentId);
          const dstDevice = deviceMap.get(neighborId);

          // BOLT: Use pre-resolved safeDeviceStates
          const isSrcShutdown = isPortShutdown(currentId, srcPortId, devices, safeDeviceStates, srcDevice);
          const isDstShutdown = isPortShutdown(neighborId, dstPortId, devices, safeDeviceStates, dstDevice);
          const isSrcPoweredOff = !isDevicePoweredOn(srcDevice);
          const isDstPoweredOff = !isDevicePoweredOn(dstDevice);

          // Check STP blocking state using VLAN-specific STP calculation
          // In PVST, each VLAN has its own STP instance with potentially different root bridges
          // BOLT: Use pre-resolved safeDeviceStates
          const isSrcSTPBlocking = getVlanSpecificSTPBlocking(currentId, srcPortId, sourceVlan, connections, stpDeviceStates, conn);
          const isDstSTPBlocking = getVlanSpecificSTPBlocking(neighborId, dstPortId, sourceVlan, connections, stpDeviceStates, conn);

           // Validate cable type for this physical link (e.g. console vs ethernet, straight vs crossover).
          const isCableOk = isConnectionCableCompatible(conn, srcDevice, dstDevice);

           // Check serial encapsulation match on both ends of a serial link
          const isSerialEncapOk = checkSerialEncapsulation(currentId, srcPortId, neighborId, dstPortId, safeDeviceStates);

          if (!isSrcShutdown && !isDstShutdown && !isSrcPoweredOff && !isDstPoweredOff && !isSrcSTPBlocking && !isDstSTPBlocking && isCableOk && isSerialEncapOk) {
            visited.add(neighborId);
            parent.set(neighborId, currentId);
            queue.push(neighborId);
          }
        }
      }
    }
  }

  if (!visited.has(targetDevice.id)) {
    return { success: false, hops: [], hopIds: [], error: 'Destination host unreachable.' };
  }

  // Construct path
  const path: string[] = [];
  let curr: string | undefined = targetDevice.id;
  while (curr) {
    path.unshift(curr);
    curr = parent.get(curr);
  }

  // BOLT: Pre-calculate path-related connections for O(1) lookup in later stages
  const pathConnections = new Map<string, CanvasConnection>();
  let ttl = 64; // Default TTL

  for (let i = 0; i < path.length - 1; i++) {
    const aId = path[i];
    const bId = path[i + 1];
    const conn = adjList.get(aId)?.find(n => n.neighborId === bId)?.conn;
    if (conn) {
      pathConnections.set(`${aId}-${bId}`, conn);

      // Track ports used in this hop
      const srcPortId = conn.sourceDeviceId === aId ? conn.sourcePort : conn.targetPort;
      const dstPortId = conn.sourceDeviceId === bId ? conn.sourcePort : conn.targetPort;

      if (srcPortId) traversedPorts.push({ deviceId: aId, portId: srcPortId, type: 'egress' });
      if (dstPortId) traversedPorts.push({ deviceId: bId, portId: dstPortId, type: 'ingress' });

      const aDevice = deviceMap.get(aId);
      const bDevice = deviceMap.get(bId);
      const bState = safeDeviceStates.get(bId);
      const sourceMac = deviceMap.get(sourceId)?.macAddress;
      const targetMac = targetDevice.macAddress;

      // TTL Control: Decrement TTL at each hop through a router
      if (aDevice && (aDevice.type === 'router' || aDevice.type === 'switchL3')) {
        ttl--;
        if (ttl <= 0) {
          return {
            success: false,
            hops: path.slice(0, i + 1).map(id => deviceMap.get(id)?.name || id),
            hopIds: path.slice(0, i + 1),
            targetId: targetDevice.id,
            error: language === 'tr' ? 'ICMP Zaman Aşımı (TTL exceeded)' : 'ICMP Time Exceeded (TTL expired)'
          };
        }
      }

      // MAC Learning on switch (ingress)
      if (bDevice && isSwitchDeviceType(bDevice.type) && bState && sourceMac) {
        learnMacAddress(bId, sourceMac, dstPortId, sourceVlan, safeDeviceStates);
      }

      let packetInfo = options?.protocol === 'icmp' ? 'Echo Request' : 'Data Packet';

      // If current device is a switch, check if it knows where targetMac is (Flooding logic)
      if (aDevice && isSwitchDeviceType(aDevice.type) && targetMac) {
        const knownPort = findMacPort(aId, targetMac, sourceVlan, safeDeviceStates);
        if (!knownPort) {
          packetInfo += ' (Flooded)';
        }
      }

      // Track packets for capture
      capturedPackets.push({
        connectionId: conn.id,
        sourceIp: currentSourceIp,
        targetIp: currentTargetIp,
        protocol: options?.protocol?.toUpperCase() || 'ICMP',
        length: 74,
        info: packetInfo
      });
    }
  }

  // 2.5 Block ping over console-only links (console is management, no ICMP)
  // Only block if the ENTIRE path is console connections (no other data path available)
  let hasConsoleConnection = false;
  let hasNonConsoleConnection = false;

  for (let i = 0; i < path.length - 1; i++) {
    const aId = path[i];
    const bId = path[i + 1];
    const conn = pathConnections.get(`${aId}-${bId}`);
    if (conn?.cableType === 'console') {
      hasConsoleConnection = true;
    } else {
      hasNonConsoleConnection = true;
    }
  }

  // Only block if path has console connection AND no other data connections (like wireless)
  if (hasConsoleConnection && !hasNonConsoleConnection) {
    return {
      success: false,
      hops: path.map(id => deviceMap.get(id)?.name || id),
      hopIds: path,
      targetId: targetDevice.id,
      error: language === 'tr'
        ? 'Console bağlantısı üzerinden ping yapılamaz.'
        : 'Ping cannot be sent over a console connection.'
    };
  }

  const hopNames = path.map(id => deviceMap.get(id)?.name || id);

  // 2.5. Check subnet compatibility (Layer 3)
  const sourceDeviceForSubnet = deviceMap.get(sourceId);
  if (sourceDeviceForSubnet && targetDevice) {
    const isTargetIpv6 = resolvedTargetIp.includes(':');
    // BOLT: Use pre-resolved safeDeviceStates
    const sourceIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates, isTargetIpv6);
    const isSourceIpv6 = sourceIp.includes(':');

    let isInSameSubnet = false;
    if (isTargetIpv6 && isSourceIpv6) {
      // Find prefix length for source
      let prefixLength = 64;
      if (deviceStates) {
        // BOLT: Use pre-resolved safeDeviceStates
        const state = safeDeviceStates.get(sourceId);
        if (state) {
          for (const pId in state.ports) {
            if (state.ports[pId].ipv6Address === sourceIp) {
              prefixLength = state.ports[pId].ipv6Prefix || 64;
              break;
            }
          }
        }
      }
      isInSameSubnet = isIpv6InNetwork(resolvedTargetIp, sourceIp, prefixLength);
    } else if (!isTargetIpv6 && !isSourceIpv6) {
      // BOLT: Use pre-resolved safeDeviceStates
      const sourceSubnet = getSubnetForDeviceIp(sourceId, sourceIp, devices, safeDeviceStates) || sourceDeviceForSubnet.subnet || '255.255.255.0';
      isInSameSubnet = isIpInSubnet(sourceIp, resolvedTargetIp, sourceSubnet);
    }

    routingRequired = !isInSameSubnet;

    if (!isInSameSubnet) {
      // Different subnets - check if there's a Layer-3 routing device in path with proper routes
      let hasL3Gateway = false;

      // Find the first L3 device in the path (the one that will actually route the packet)
      for (const deviceId of path) {
        const device = deviceMap.get(deviceId);
        // BOLT: Use pre-resolved safeDeviceStates
        const state = safeDeviceStates.get(deviceId);
        if ((device?.type === 'router' || device?.type === 'switchL3') && state?.ipRouting) {
          // Check if this router has a route to the destination network
          const routingTable = getRoutingTable(deviceId, safeDeviceStates, devices, connections);
          const route = findRoute(resolvedTargetIp, routingTable);
          if (route) {
            hasL3Gateway = true;
            break;
          } else {
            // First L3 device in path doesn't have a route - packet will be dropped
            return {
              success: false,
              hops: hopNames,
              hopIds: path,
              targetId: targetDevice.id,
              error: language === 'tr'
                ? `Hedefe rota bulunamadı. Statik rota yapılandırması gerekli.`
                : `No route to destination. Static route configuration required.`
            };
          }
        }
      }

      // If no router in path with proper route, try to find a connected router
      if (!hasL3Gateway) {
        // Find all routers in the topology
        const routers = devices.filter(d => (d.type === 'router' || d.type === 'switchL3'));
        for (const router of routers) {
          // BOLT: Use pre-resolved safeDeviceStates
          const routerState = safeDeviceStates.get(router.id);
          if (routerState?.ipRouting) {
            // Check if router has a route to destination
            const routingTable = getRoutingTable(router.id, safeDeviceStates, devices, connections);
            const route = findRoute(resolvedTargetIp, routingTable);
            if (!route) continue; // Skip routers without proper route

            // Check if router is connected to any device in the path
            for (const pathDeviceId of path) {
              const conn = adjList.get(router.id)?.find(n => n.neighborId === pathDeviceId)?.conn;
              if (conn) {
                hasL3Gateway = true;
                // Add router to path (insert before the connected device)
                const pathIndex = path.indexOf(pathDeviceId);
                if (pathIndex !== -1) {
                  path.splice(pathIndex, 0, router.id);
                  hopNames.splice(pathIndex, 0, router.name);
                }
                break;
              }
            }
            if (hasL3Gateway) break;
          }
        }
      }

      if (!hasL3Gateway) {
        return {
          success: false,
          hops: hopNames,
          hopIds: path,
          targetId: targetDevice.id,
          error: language === 'tr'
            ? `Hedefe rota bulunamadı. Statik rota yapılandırması gerekli.`
            : `No route to destination. Static route configuration required.`
        };
      }
    }
  }

  // 3. Validate endpoint VLANs when PCs are involved (PC VLAN must match adjacent switch access VLAN).
  if (deviceStates && path.length >= 2) {
    for (let i = 0; i < path.length - 1; i++) {
      const aId = path[i];
      const bId = path[i + 1];
      const a = deviceMap.get(aId);
      const b = deviceMap.get(bId);
      const conn = pathConnections.get(`${aId}-${bId}`);
      if (!a || !b || !conn) continue;

      // If a PC connects to a switch, enforce VLAN match unless the switch port is trunk.
      const pc = a.type === 'pc' ? a : b.type === 'pc' ? b : null;
      const sw = isSwitchDeviceType(a.type) ? a : isSwitchDeviceType(b.type) ? b : null;
      if (pc && sw) {
        const swPortId = conn.sourceDeviceId === sw.id ? conn.sourcePort : conn.targetPort;
        // BOLT: Use pre-resolved safeDeviceStates
        const swState = safeDeviceStates.get(sw.id);
        const swPort = swState?.ports?.[swPortId];
        const swVlan = getPortVlan(swPort);
        const pcVlan = Number(pc.vlan || 1);

        // Allow ping if switch port is trunk OR if VLANs match
        if (swPort?.mode !== 'trunk' && swVlan !== pcVlan) {
          return {
            success: false,
            hops: hopNames.slice(0, i + 2),
            hopIds: path.slice(0, i + 2),
            targetId: targetDevice.id,
            error: `VLAN mismatch: ${pc.name} is in VLAN ${pcVlan}, but ${sw.name} port ${swPortId} is VLAN ${swVlan}.`,
          };
        }

        // Check port security on switch port
        if (swPort?.portSecurity?.enabled && pc.macAddress) {
          // BOLT: Use pre-resolved safeDeviceStates
          const violation = checkPortSecurityViolation(sw.id, swPortId, pc.macAddress, safeDeviceStates);
          if (violation) {
            // Track violation for React state update
            portSecurityViolations.push({
              deviceId: sw.id,
              portId: swPortId,
              action: violation.action,
              mac: pc.macAddress
            });

            // Handle violation action
            if (violation.action === 'shutdown') {
              return {
                success: false,
                hops: hopNames.slice(0, i + 2),
                hopIds: path.slice(0, i + 2),
                targetId: targetDevice.id,
                error: `Port security violation: ${sw.name} port ${swPortId} has been shut down due to unauthorized MAC ${pc.macAddress}.`,
                portSecurityViolations
              };
            } else if (violation.action === 'restrict') {
              // Allow traffic but log violation
              return {
                success: false,
                hops: hopNames.slice(0, i + 2),
                hopIds: path.slice(0, i + 2),
                targetId: targetDevice.id,
                error: `Port security violation: ${sw.name} port ${swPortId} - unauthorized MAC ${pc.macAddress}. Traffic restricted.`,
                portSecurityViolations
              };
            } else if (violation.action === 'protect') {
              // Drop traffic silently (no error message, just drop)
              return {
                success: false,
                hops: hopNames.slice(0, i + 2),
                hopIds: path.slice(0, i + 2),
                targetId: targetDevice.id,
                error: `Request timed out.`,
                portSecurityViolations
              };
            }
          }
        }
      }
    }
  }

  // 3.5. A switch-to-switch trunk is operational only when both link endpoints are trunk.
  if (deviceStates && path.length >= 2) {
    for (let i = 0; i < path.length - 1; i++) {
      const aId = path[i];
      const bId = path[i + 1];
      const a = deviceMap.get(aId);
      const b = deviceMap.get(bId);
      const conn = pathConnections.get(`${aId}-${bId}`);
      if (!a || !b || !conn || !isSwitchDeviceType(a.type) || !isSwitchDeviceType(b.type)) continue;

      const aPortId = conn.sourceDeviceId === aId ? conn.sourcePort : conn.targetPort;
      const bPortId = conn.sourceDeviceId === bId ? conn.sourcePort : conn.targetPort;
      // BOLT: Use pre-resolved safeDeviceStates
      const aPort = safeDeviceStates.get(aId)?.ports?.[aPortId];
      const bPort = safeDeviceStates.get(bId)?.ports?.[bPortId];
      const aIsTrunk = aPort?.mode === 'trunk';
      const bIsTrunk = bPort?.mode === 'trunk';

      if (aIsTrunk !== bIsTrunk) {
        return {
          success: false,
          hops: hopNames.slice(0, i + 2),
          hopIds: path.slice(0, i + 2),
          targetId: targetDevice.id,
          error: language === 'tr'
            ? `Trunk kurulamadı: ${a.name} ${aPortId} ve ${b.name} ${bPortId} portlarının ikisi de trunk modunda olmalı.`
            : `Trunk failed: both ${a.name} ${aPortId} and ${b.name} ${bPortId} must be in trunk mode.`
        };
      }
    }
  }

  // 4. VLAN check across the path
  if (deviceStates) {
    for (let i = 1; i < path.length - 1; i++) {
      const deviceId = path[i];
      const device = deviceMap.get(deviceId);
      if (device && isSwitchDeviceType(device.type)) {
        // BOLT: Use pre-resolved safeDeviceStates
        const switchState = safeDeviceStates.get(deviceId);
        if (!switchState) continue;

        const prevDeviceId = path[i - 1];
        const nextDeviceId = path[i + 1];

        const ingressConn = pathConnections.get(`${prevDeviceId}-${deviceId}`);
        const egressConn = pathConnections.get(`${deviceId}-${nextDeviceId}`);

        if (ingressConn && egressConn) {
          const ingressPortId = ingressConn.sourceDeviceId === deviceId ? ingressConn.sourcePort : ingressConn.targetPort;
          const egressPortId = egressConn.sourceDeviceId === deviceId ? egressConn.sourcePort : egressConn.targetPort;

          const ingressPort = switchState.ports[ingressPortId];
          const egressPort = switchState.ports[egressPortId];

          // Default to VLAN 1 if not specified
          const ingressVlan = getPortVlan(ingressPort);
          const egressVlan = getPortVlan(egressPort);

          // Check for VLAN mismatch on access ports
          if (ingressVlan !== egressVlan) {
            // Allow if one or both ports are trunks
            if (ingressPort?.mode !== 'trunk' && egressPort?.mode !== 'trunk') {
              // Check if there's a router with ipRouting in the path (L3 routing scenario)
              let hasL3RouterInPath = false;
              for (const pathDeviceId of path) {
                const pathDevice = deviceMap.get(pathDeviceId);
                // BOLT: Use pre-resolved safeDeviceStates
                const pathState = safeDeviceStates.get(pathDeviceId);
                if ((pathDevice?.type === 'router' || pathDevice?.type === 'switchL3') && pathState?.ipRouting) {
                  hasL3RouterInPath = true;
                  break;
                }
              }

              // If router with routing is in path, allow different VLANs (router handles inter-VLAN routing)
              if (!hasL3RouterInPath) {
                return {
                  success: false,
                  hops: hopNames.slice(0, i + 1),
                  hopIds: path.slice(0, i + 1),
                  targetId: targetDevice.id,
                  error: `VLAN mismatch on ${device.name}. Port ${ingressPortId} is in VLAN ${ingressVlan}, but port ${egressPortId} is in VLAN ${egressVlan}.`
                };
              }
            }
          }
        }
      }
    }
  }

  // 5. Enforce same-VLAN communication for L2-only simulation
  let l2ConnectivityPossible = false;
  if (deviceStates) {
    const getDeviceVlanForIp = (deviceId: string, ip: string): number | null => {
      const device = deviceMap.get(deviceId);
      if (!device) return null;
      // BOLT: Use pre-resolved safeDeviceStates
      const state = safeDeviceStates.get(deviceId);
      if (!state) return (device.type === 'pc' || device.type === 'iot') ? Number(device.vlan || 1) : 1;

      if (device.type === 'pc' || device.type === 'iot') return getDeviceVlan(device, state);

      // Check all VLAN SVIs first (vlan1, vlan10, vlan20, etc.)
      for (const [portId, port] of Object.entries(state.ports)) {
        if (portId.startsWith('vlan') && port.ipAddress === ip) {
          const vlanMatch = portId.match(/vlan(\d+)/);
          if (vlanMatch) {
            return parseInt(vlanMatch[1], 10);
          }
          return 1;
        }
      }

      // Check routed physical interfaces (L3)
      const onPhysical = Object.values(state.ports).some((p: Port) => p.ipAddress === ip && p.mode === 'routed');
      if (onPhysical) return null;

      return getDeviceVlan(device, state);
    };

    // BOLT: Use pre-resolved safeDeviceStates
    const sourceIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates);
    const sourceVlan = sourceIp ? getDeviceVlanForIp(sourceId, sourceIp) : null;
    const targetVlan = getDeviceVlanForIp(targetDevice.id, resolvedTargetIp);

    // Skip VLAN enforcement for L3 routing scenarios
    const isSourceL3 = sourceVlan === null;
    const isTargetL3 = targetVlan === null;

    // Only block if both are L2 devices AND in different VLANs
    if (!isSourceL3 && !isTargetL3 && sourceVlan !== null && targetVlan !== null) {
      // Same VLAN: allow communication
      if (sourceVlan === targetVlan) {
        l2ConnectivityPossible = true;
      } else {
        // Different VLANs: check if router with ipRouting is in path
        let hasL3RouterInPath = false;
        for (const pathDeviceId of path) {
          const pathDevice = deviceMap.get(pathDeviceId);
          // BOLT: Use pre-resolved safeDeviceStates
          const pathState = safeDeviceStates.get(pathDeviceId);
          if ((pathDevice?.type === 'router' || pathDevice?.type === 'switchL3') && pathState?.ipRouting) {
            hasL3RouterInPath = true;
            break;
          }
        }

        // If router with routing is in path, allow different VLANs (router handles inter-VLAN routing)
        if (hasL3RouterInPath) {
          routingRequired = true; // Different VLANs require routing
        } else {
          return {
            success: false,
            hops: hopNames,
            hopIds: path,
            targetId: targetDevice.id,
            error: `VLAN mismatch: source VLAN ${sourceVlan}, target VLAN ${targetVlan}.`
          };
        }
      }
    }
  }

  // 6. Layer 3 Routing Logic - Check if routing is possible between different subnets/VLANs
  let l3ConnectivityPossible = false;
  if (deviceStates) {
    // BOLT: Use pre-resolved safeDeviceStates
    const sourceState = safeDeviceStates.get(sourceId);

    // Check if source has routing capability and a route to target
    const isTargetIpv6 = resolvedTargetIp.includes(':');
    const sourceHasRouting = isTargetIpv6 ? (sourceState?.ipv6Enabled || sourceState?.ipRouting) : sourceState?.ipRouting;
    
    if (sourceHasRouting) {
      // BOLT: Use pre-resolved safeDeviceStates
      const sourceRoutes = getRoutingTable(sourceId, safeDeviceStates, devices, connections);
      const route = findRoute(resolvedTargetIp, sourceRoutes);

      if (route) {
        l3ConnectivityPossible = true;
      }
    }

    if (!l3ConnectivityPossible) {
      // Check if there's a router in the path that can route between VLANs
      for (const deviceId of path) {
        // BOLT: Use pre-resolved safeDeviceStates
        const state = safeDeviceStates.get(deviceId);
        const device = deviceMap.get(deviceId);
        const hasRouting = isTargetIpv6 ? (state?.ipv6Enabled || state?.ipRouting) : state?.ipRouting;

        if (hasRouting && (device?.type === 'router' || device?.type === 'switchL3')) {
          // Router in path - check if it has routes to both source and target networks
          // BOLT: Use pre-resolved safeDeviceStates
          const routes = getRoutingTable(deviceId, safeDeviceStates, devices, connections);
          // Get source IP from device data
          const srcIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates, isTargetIpv6);
          const sourceRoute = findRoute(srcIp, routes);
          const targetRoute = findRoute(resolvedTargetIp, routes);

          if (sourceRoute && targetRoute) {
            l3ConnectivityPossible = true;
            break;
          }
        }
      }
    }

    // If routing was required but no router in the path could handle it
    if (routingRequired && !l3ConnectivityPossible) {
      // For different subnets, routing MUST be possible through an L3 device
      return {
        success: false,
        hops: hopNames,
        hopIds: path,
        targetId: targetDevice.id,
        error: language === 'tr' 
          ? 'Yönlendirme başarısız: Geçerli bir rota bulunamadı.' 
          : 'Routing failed: No valid route found.'
      };
    }
  }

  // Fallback for simple topologies without advanced device states
  const basicConnectivityPossible = !deviceStates && !routingRequired;

  // 7. ACL, NAT & Firewall Logic - Check rules for any firewalls or ACLs in the path
  // BOLT: Use pre-resolved safeDeviceStates
  for (let i = 0; i < path.length; i++) {
    const stepDeviceId = path[i];
    const state = safeDeviceStates.get(stepDeviceId);
    const device = deviceMap.get(stepDeviceId);

    if (state) {
      const prevDeviceId = i > 0 ? path[i - 1] : null;
      const nextDeviceId = i < path.length - 1 ? path[i + 1] : null;

      const ingressConn = prevDeviceId ? pathConnections.get(`${prevDeviceId}-${stepDeviceId}`) : null;
      const egressConn = nextDeviceId ? pathConnections.get(`${stepDeviceId}-${nextDeviceId}`) : null;

      const ingressPortId = ingressConn ? (ingressConn.sourceDeviceId === stepDeviceId ? ingressConn.sourcePort : ingressConn.targetPort) : null;
      const egressPortId = egressConn ? (egressConn.sourceDeviceId === stepDeviceId ? egressConn.sourcePort : egressConn.targetPort) : null;

      const ingressPort = ingressPortId ? state.ports[ingressPortId] : null;
      const egressPort = egressPortId ? state.ports[egressPortId] : null;

      // 7.1. Check Inbound ACLs
      if (ingressPort?.accessGroupIn) {
        const aclResult = evaluateAcl(
          ingressPort.accessGroupIn,
          state,
          currentSourceIp,
          currentTargetIp,
          options?.protocol,
          options?.port
        );
        if (aclResult === 'deny') {
          return {
            success: false,
            hops: hopNames.slice(0, i + 1),
            hopIds: path.slice(0, i + 1),
            targetId: targetDevice.id,
            error: language === 'tr'
              ? `Paket ${device?.name} ingress port ${ingressPortId} ACL kuralı nedeniyle engellendi.`
              : `Packet blocked by inbound ACL on ${device?.name} interface ${ingressPortId}.`
          };
        }
      }

      // 7.1.5 NAT Logic (Inside -> Outside or Outside -> Inside)
      if (ingressPort?.natSide && egressPort?.natSide && ingressPort.natSide !== egressPort.natSide) {
        if (ingressPort.natSide === 'inside' && egressPort.natSide === 'outside') {
          // Source NAT (Inside -> Outside)
          let translated = false;

          // 1. Static NAT
          if (state.natStaticTranslations) {
            const staticEntry = state.natStaticTranslations.find(t => t.localIp === currentSourceIp);
            if (staticEntry) {
              currentSourceIp = staticEntry.globalIp;
              translated = true;
            }
          }

          // 2. Dynamic PAT (Overload) / Pool
          if (!translated && state.natDynamicRules) {
            for (const rule of state.natDynamicRules) {
              const aclResult = evaluateAcl(rule.aclId, state, currentSourceIp, currentTargetIp, options?.protocol, options?.port);
              if (aclResult === 'permit') {
                if (rule.overload && rule.interface) {
                  const outPort = state.ports[rule.interface];
                  if (outPort?.ipAddress) {
                    currentSourceIp = outPort.ipAddress;
                    translated = true;
                    break;
                  }
                } else if (rule.poolName && state.natPools?.[rule.poolName]) {
                  currentSourceIp = state.natPools[rule.poolName].startIp;
                  translated = true;
                  break;
                }
              }
            }
          }
        } else if (ingressPort.natSide === 'outside' && egressPort.natSide === 'inside') {
          // Destination NAT (Outside -> Inside) - Typically for return traffic or port forwarding
          let translated = false;

          // 1. Static NAT (Outside -> Inside)
          if (state.natStaticTranslations) {
            const staticEntry = state.natStaticTranslations.find(t => t.globalIp === currentTargetIp);
            if (staticEntry) {
              currentTargetIp = staticEntry.localIp;
              translated = true;
            }
          }

          // 2. Check Translation Table (Return traffic)
          if (!translated && state.natTranslations) {
            const entry = state.natTranslations.find(t => t.globalIp === currentTargetIp && t.remoteIp === currentSourceIp);
            if (entry) {
              currentTargetIp = entry.localIp;
              translated = true;
            }
          }
        }
      }

      // 7.2. Check Outbound ACLs
      if (egressPort?.accessGroupOut) {
        const aclResult = evaluateAcl(
          egressPort.accessGroupOut,
          state,
          currentSourceIp,
          currentTargetIp,
          options?.protocol,
          options?.port
        );
        if (aclResult === 'deny') {
          return {
            success: false,
            hops: hopNames.slice(0, i + 1),
            hopIds: path.slice(0, i + 1),
            targetId: targetDevice.id,
            error: language === 'tr'
              ? `Paket ${device?.name} egress port ${egressPortId} ACL kuralı nedeniyle engellendi.`
              : `Packet blocked by outbound ACL on ${device?.name} interface ${egressPortId}.`
          };
        }
      }
    }

    // 7.3. Legacy Firewall Logic
    if (device?.type === 'firewall') {
      const rules = device.firewallRules || [];
      const enabledRules = rules.filter(r => r.enabled);
      let allowed = enabledRules.length === 0; // Default: ALLOW ALL if no enabled rules

      // Evaluate enabled rules in order
      for (const rule of enabledRules) {
        const sourceMatch = rule.sourceIp === '*' || rule.sourceIp === 'any' || rule.sourceIp === currentSourceIp;
        const targetMatch = rule.targetIp === '*' || rule.targetIp === 'any' || rule.targetIp === currentTargetIp;

        // Protocol matching
        const requestedProtocol = options?.protocol || 'any';
        const protocolMatch = requestedProtocol === 'any' || rule.protocol === 'any' || rule.protocol === requestedProtocol;

        // Port matching
        let portMatch = true;
        if (rule.port !== '*' && rule.port !== 'any') {
          if (options?.port && options.port !== '*') {
            portMatch = rule.port === options.port;
          }
          else if (requestedProtocol !== 'any') {
            if (requestedProtocol === 'tcp' || requestedProtocol === 'udp') {
              portMatch = false;
            }
          }
        }

        if (sourceMatch && targetMatch && protocolMatch && portMatch) {
          allowed = rule.action === 'allow';
          break;
        }
      }

      if (!allowed) {
        return {
          success: false,
          hops: hopNames.slice(0, i + 1),
          hopIds: path.slice(0, i + 1),
          targetId: targetDevice.id,
          error: language === 'tr'
            ? `Paket firewall (${device.name}) kuralı nedeniyle engellendi.`
            : `Packet blocked by firewall (${device.name}) rule.`
        };
      }
    }
  }

  if (!l2ConnectivityPossible && !l3ConnectivityPossible && !basicConnectivityPossible) {
      // If we got here and no connectivity was confirmed, double check management IPs
      // BOLT: Use pre-resolved safeDeviceStates
      if (!getPrimaryDeviceIp(sourceId, devices, safeDeviceStates) && !isManagementIpSet(sourceId, safeDeviceStates)) {
        return { success: false, hops: [], hopIds: [], error: 'Source has no IP address.' };
      }
  }

  return {
    success: true,
    hops: hopNames,
    hopIds: path,
    targetId: targetDevice.id,
    portSecurityViolations,
    traversedPorts,
    capturedPackets
  };
}

export function checkDeviceConnectivity(
  sourceId: string,
  targetId: string,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>,
  options?: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string }
): { success: boolean; hops: string[]; hopIds: string[]; targetId?: string; error?: string; capturedPackets?: Array<{ connectionId: string; sourceIp: string; targetIp: string; protocol: string; length: number; info: string }> } {
  // BOLT: Use pre-resolved safeDeviceStates
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const deviceMap = new Map<string, CanvasDevice>();
  for (const d of devices) {
    deviceMap.set(d.id, d);
  }
  const sourceDevice = deviceMap.get(sourceId);
  const targetDevice = deviceMap.get(targetId);

  if (!sourceDevice || !targetDevice) {
    return { success: false, hops: [], hopIds: [], error: 'Destination host unreachable.' };
  }

  let resolvedTargetIp = targetDevice.ip;
  // BOLT: Use pre-resolved safeDeviceStates
  const sourcePrimaryIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates);
  const sourcePrimarySubnet = getSubnetForDeviceIp(sourceId, sourcePrimaryIp, devices, safeDeviceStates) || '255.255.255.0';
  if (!resolvedTargetIp && deviceStates) {
    // BOLT: Use pre-resolved safeDeviceStates
    const targetState = safeDeviceStates.get(targetId);
    if (targetState) {
      for (const pId in targetState.ports) {
        if (targetState.ports[pId].ipAddress) {
          if (sourcePrimaryIp) {
            if (isIpInSubnet(sourcePrimaryIp, targetState.ports[pId].ipAddress, sourcePrimarySubnet)) {
              resolvedTargetIp = targetState.ports[pId].ipAddress;
              break;
            }
          }
          if (!resolvedTargetIp) resolvedTargetIp = targetState.ports[pId].ipAddress;
        }
      }
    }
  }
  const targetIp = resolvedTargetIp || '';
  if (!targetIp) {
    return { success: false, hops: [], hopIds: [], error: 'Request timed out.' };
  }

  // BOLT: Pass pre-resolved safeDeviceStates
  return checkConnectivity(sourceId, targetIp, devices, connections, safeDeviceStates, undefined, options);
}

/**
 * Detailed ping diagnostics - checks all conditions and returns specific failure reasons
 */
export function getPingDiagnostics(
  sourceId: string,
  targetIp: string,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>,
  language: 'tr' | 'en' = 'tr',
  options?: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string }
): { success: boolean; reasons: string[] } {
  // BOLT: Resolve safeDeviceStates once
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const reasons: string[] = [];
  const deviceMap = new Map<string, CanvasDevice>();
  const ipMap = new Map<string, string>(); // IP -> deviceId

  for (const d of devices) {
    deviceMap.set(d.id, d);
    if (d.ip) ipMap.set(d.ip, d.id);
    if (d.ipv6) ipMap.set(d.ipv6.toLowerCase(), d.id);
  }

  if (deviceStates) {
    for (const [id, state] of deviceStates.entries()) {
      for (const portId in state.ports) {
        const port = state.ports[portId];
        if (port.ipAddress) ipMap.set(port.ipAddress, id);
        if (port.ipv6Address) ipMap.set(port.ipv6Address.toLowerCase(), id);
      }
    }
  }

  const sourceDevice = deviceMap.get(sourceId);

  // Resolve hostname to IP if necessary
  let resolvedTargetIp = targetIp;
  const isIpAddress = (val: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(val) || val.includes(':');
  if (!isIpAddress(targetIp)) {
    const resolvedIp = resolveHostname(targetIp, devices, deviceStates, deviceMap);
    if (!resolvedIp) {
      reasons.push('Hostname could not be resolved');
      return { success: false, reasons };
    }
    resolvedTargetIp = resolvedIp;
  }

  const isTargetIpv6 = resolvedTargetIp.includes(':');
  const targetDeviceId = ipMap.get(resolvedTargetIp.toLowerCase());
  const targetDevice = targetDeviceId ? deviceMap.get(targetDeviceId) : undefined;

  // 1. Check source device exists and is powered on
  if (!sourceDevice) {
    reasons.push('Kaynak cihaz bulunamadı');
    return { success: false, reasons };
  }

  if (sourceDevice.status === 'offline') {
    reasons.push('Kaynak cihaz kapalı (offline)');
    return { success: false, reasons };
  }

  // 2. Check source has IP address (IPv4 or IPv6)
  let sourceIp = sourceDevice.ip || sourceDevice.ipv6 || '';
  if (!sourceIp && deviceStates) {
    // BOLT: Use pre-resolved safeDeviceStates
    const state = safeDeviceStates.get(sourceId);
    if (state) {
      for (const pId in state.ports) {
        const port = state.ports[pId];
        const addr = isTargetIpv6 ? (port.ipv6Address || port.ipAddress) : (port.ipAddress || port.ipv6Address);
        if (addr) { sourceIp = addr; break; }
      }
    }
  }
  if (!sourceIp) {
    reasons.push('Kaynak cihazın IP adresi yok');
    return { success: false, reasons };
  }

  // 3. Check target device exists
  if (!targetDevice) {
    reasons.push('Hedef IP adresi bulunamadı');
    return { success: false, reasons };
  }

  if (targetDevice.status === 'offline') {
    reasons.push('Hedef cihaz kapalı (offline)');
    return { success: false, reasons };
  }

  // 4. Check target has IP address
  if (!resolvedTargetIp) {
    reasons.push('Hedef cihazın IP adresi yok');
    return { success: false, reasons };
  }

  // 5. Check subnet compatibility (IPv4 only — IPv6 routing handled separately)
  let isSourceInSameSubnet = true;
  let isTargetInSameSubnet = true;
  if (!isTargetIpv6) {
    const sourceSubnet = sourceDevice.subnet || '255.255.255.0';
    const targetSubnet = targetDevice.subnet || '255.255.255.0';
    isSourceInSameSubnet = isIpInSubnet(sourceIp, resolvedTargetIp, sourceSubnet);
    isTargetInSameSubnet = isIpInSubnet(resolvedTargetIp, sourceIp, targetSubnet);
    if (!isSourceInSameSubnet && !isTargetInSameSubnet) {
      reasons.push(`Subnet uyumsuzluğu: Kaynak ${sourceIp}/${sourceSubnet}, Hedef ${resolvedTargetIp}/${targetSubnet}. Router ile routing gerekli.`);
      return { success: false, reasons };
    }

    // 6. Check gateway configuration if different subnets
    if (!isSourceInSameSubnet) {
      if (!sourceDevice.gateway) {
        reasons.push("Kaynak cihazın gateway'i yok (farklı subnet)");
      }
    }

    if (!isTargetInSameSubnet) {
      if (!targetDevice.gateway) {
        reasons.push("Hedef cihazın gateway'i yok (farklı subnet)");
      }
    }
  }

  // 7. Check physical connectivity
  // BOLT: Use pre-resolved safeDeviceStates
  const result = checkConnectivity(sourceId, resolvedTargetIp, devices, connections, safeDeviceStates, language, options);
  if (!result.success) {
    if (result.error) {
      reasons.push(result.error);
    } else {
      reasons.push('Fiziksel bağlantı yok');
    }
    return { success: false, reasons };
  }

  // 8. Check interfaces are up
  const sourceConn = connections.find(c => c.sourceDeviceId === sourceId || c.targetDeviceId === sourceId);
  if (sourceConn) {
    const sourcePortId = sourceConn.sourceDeviceId === sourceId ? sourceConn.sourcePort : sourceConn.targetPort;
    // BOLT: Use pre-resolved safeDeviceStates
    if (isPortShutdown(sourceId, sourcePortId, devices, safeDeviceStates)) {
      reasons.push(`Kaynak interface kapalı: ${sourcePortId}`);
      return { success: false, reasons };
    }
  }

  const targetConn = connections.find(c => c.sourceDeviceId === targetDevice.id || c.targetDeviceId === targetDevice.id);
  if (targetConn) {
    const targetPortId = targetConn.sourceDeviceId === targetDevice.id ? targetConn.targetPort : targetConn.sourcePort;
    // BOLT: Use pre-resolved safeDeviceStates
    if (isPortShutdown(targetDevice.id, targetPortId, devices, safeDeviceStates)) {
      reasons.push(`Hedef interface kapalı: ${targetPortId}`);
      return { success: false, reasons };
    }
  }

  // 9. Check VLAN configuration - Only if not already routed
  if (sourceDevice.vlan && targetDevice.vlan && sourceDevice.vlan !== targetDevice.vlan) {
    // Check if there's a router in path (ROAS)
    let hasL3RouterInPath = false;
    for (const pathDeviceId of result.hopIds) {
      const pathDevice = deviceMap.get(pathDeviceId);
      // BOLT: Use pre-resolved safeDeviceStates
      const pathState = safeDeviceStates.get(pathDeviceId);
      if ((pathDevice?.type === 'router' || pathDevice?.type === 'switchL3') && pathState?.ipRouting) {
        hasL3RouterInPath = true;
        break;
      }
    }

    if (!hasL3RouterInPath) {
      reasons.push(`VLAN uyumsuzluğu: Kaynak VLAN ${sourceDevice.vlan}, Hedef VLAN ${targetDevice.vlan}`);
      return { success: false, reasons };
    }
  }

  // 10. Check routing if different subnets (only when routing is relevant)
  if (!isTargetIpv6 && !isSourceInSameSubnet) {
    const sourceDeviceObj = sourceDevice;
    const isSourceL3Capable = sourceDeviceObj?.type === 'router' || sourceDeviceObj?.type === 'switchL3';

    // If source is a router/L3-switch, it must have ip routing enabled
    if (isSourceL3Capable) {
      // BOLT: Use pre-resolved safeDeviceStates
      const sourceState = safeDeviceStates.get(sourceId);
      if (!sourceState?.ipRouting) {
        reasons.push(language === 'tr' ? 'Kaynak cihazda IP routing etkin değil' : 'IP routing is not enabled on the source device');
        return { success: false, reasons };
      }
    }
    
    // Check if there's a router or L3 switch in path (already calculated in section 9)
    let hasL3RouterInPath = false;
    for (const pathDeviceId of result.hopIds) {
      const pathDevice = deviceMap.get(pathDeviceId);
      // BOLT: Use pre-resolved safeDeviceStates
      const pathState = safeDeviceStates.get(pathDeviceId);
      if ((pathDevice?.type === 'router' || pathDevice?.type === 'switchL3') && pathState?.ipRouting) {
        hasL3RouterInPath = true;
        break;
      }
    }

    // If source is not a router, there must be a router/L3-switch in the path
    if (!hasL3RouterInPath && !isSourceL3Capable) {
      reasons.push(language === 'tr' ? 'Farklı subnetler arası iletişim için bir router/L3-switch gereklidir' : 'A router/L3-switch is required for communication between different subnets');
      return { success: false, reasons };
    }
  }

  return { success: true, reasons };
}

/**
 * Check if an IP is in a subnet
 */
function isIpInSubnet(ip: string, targetIp: string, subnet: string): boolean {
  try {
    const ipParts = ip.split('.').map(Number);
    const targetParts = targetIp.split('.').map(Number);
    const subnetParts = subnet.split('.').map(Number);

    for (let i = 0; i < 4; i++) {
      const ipMasked = ipParts[i] & subnetParts[i];
      const targetMasked = targetParts[i] & subnetParts[i];
      if (ipMasked !== targetMasked) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function getPrimaryDeviceIp(
  deviceId: string,
  devices: CanvasDevice[],
  deviceStates?: Map<string, SwitchState>,
  preferIpv6: boolean = false,
  device?: CanvasDevice
): string {
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  if (!device) {
    device = devices.find(d => d.id === deviceId);
  }

  if (preferIpv6 && device?.ipv6) return device.ipv6;
  if (device?.ip) return device.ip;
  if (device?.ipv6) return device.ipv6;

  const state = safeDeviceStates.get(deviceId);
  if (!state) return '';

  for (const port of Object.values(state.ports)) {
    if (preferIpv6 && port.ipv6Address) return port.ipv6Address;
    if (port.ipAddress) return port.ipAddress;
    if (port.ipv6Address) return port.ipv6Address;
  }

  return '';
}

function getSubnetForDeviceIp(
  deviceId: string,
  ip: string,
  devices: CanvasDevice[],
  deviceStates?: Map<string, SwitchState>,
  device?: CanvasDevice
): string {
  if (!ip) return '';

  const state = deviceStates?.get(deviceId);
  if (state) {
    for (const port of Object.values(state.ports)) {
      if (port.ipAddress === ip && port.subnetMask) {
        return port.subnetMask;
      }
    }
  }

  if (!device) {
    device = devices.find(d => d.id === deviceId);
  }
  return device?.subnet || '';
}

function isPortShutdown(deviceId: string, portId: string, devices: CanvasDevice[], deviceStates?: Map<string, SwitchState>, device?: CanvasDevice): boolean {
  // Check deviceStates (Switch/Router)
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  if (safeDeviceStates) {
    const state = safeDeviceStates.get(deviceId);
    if (state && state.ports[portId]) {
      return state.ports[portId].shutdown;
    }
  }

  // Check topology (PCs)
  if (!device) {
    device = devices.find(d => d.id === deviceId);
  }
  if (device) {
    const port = device.ports.find(p => p.id === portId);
    if (portId === 'wlan0' && device.type === 'pc') {
      return !device.wifi?.enabled;
    }
    return port?.status === 'disabled';
  }

  return false;
}

function isManagementIpSet(deviceId: string, deviceStates?: Map<string, SwitchState>): boolean {
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
  const state = safeDeviceStates.get(deviceId);
  if (!state) return false;
  return Object.values(state.ports).some(port => !!port.ipAddress);
}

/**
 * Evaluate ACL (Standard or Extended)
 */
function incrementAclCounter(state: SwitchState, aclId: string, ruleIndex: number): void {
  if (!state.aclMatchCounters) state.aclMatchCounters = {};
  if (!state.aclMatchCounters[aclId]) state.aclMatchCounters[aclId] = {};
  state.aclMatchCounters[aclId][ruleIndex] = (state.aclMatchCounters[aclId][ruleIndex] || 0) + 1;
}

export function evaluateAcl(
  aclId: string,
  state: SwitchState,
  sourceIp: string,
  targetIp: string,
  protocol: string = 'any',
  port: string = 'any'
): 'permit' | 'deny' | 'none' {
  const rules = state.accessLists?.[aclId];
  if (!rules || rules.length === 0) return 'none';

  const aclNum = parseInt(aclId);
  // Named ACLs and extended numbered ACLs (100-199, 2000-2699 modern)
  const isExtended = (aclNum >= 100 && aclNum <= 199) || (aclNum >= 2000 && aclNum <= 2699) || isNaN(aclNum);

  for (let ruleIdx = 0; ruleIdx < rules.length; ruleIdx++) {
    const rule = rules[ruleIdx];
    // Extract rule body: skip optional sequence number prefix
    const seqMatch = rule.match(/^\d+\s+(.+)$/);
    const ruleContent = seqMatch ? seqMatch[1] : rule;
    const parts = ruleContent.trim().split(/\s+/);
    const action = parts[0].toLowerCase() as 'permit' | 'deny';
    const body = parts.slice(1);

    if (!isExtended) {
      // Standard ACL: [permit|deny] <source> [wildcard]
      let srcIp = body[0];
      let srcWildcard = '0.0.0.0';
      if (srcIp === 'any') {
        srcIp = '0.0.0.0';
        srcWildcard = '255.255.255.255';
      } else if (srcIp === 'host') {
        srcIp = body[1];
        srcWildcard = '0.0.0.0';
      } else if (body[1] && /^\d+\./.test(body[1])) {
        srcWildcard = body[1];
      }

      if (matchIpWithWildcard(sourceIp, srcIp, srcWildcard)) {
        incrementAclCounter(state, aclId, ruleIdx);
        return action;
      }
    } else {
      // Extended ACL: [permit|deny] <protocol> <source> [src-wildcard] <destination> [dst-wildcard] [eq <port>]
      let currentIdx = 0;
      const ruleProto = body[currentIdx++]?.toLowerCase();

      // Protocol match
      if (ruleProto !== 'ip' && ruleProto !== protocol && protocol !== 'any') {
        continue;
      }

      // Match source
      let srcIp = body[currentIdx++];
      let srcWildcard = '0.0.0.0';
      if (srcIp === 'host') {
        srcIp = body[currentIdx++];
      } else if (srcIp === 'any') {
        srcIp = '0.0.0.0';
        srcWildcard = '255.255.255.255';
      } else {
        if (body[currentIdx] && /^\d+\./.test(body[currentIdx])) {
          srcWildcard = body[currentIdx++];
        }
      }

      if (!matchIpWithWildcard(sourceIp, srcIp, srcWildcard)) continue;

      // Match destination
      let dstIp = body[currentIdx++];
      let dstWildcard = '0.0.0.0';
      if (dstIp === 'host') {
        dstIp = body[currentIdx++];
      } else if (dstIp === 'any') {
        dstIp = '0.0.0.0';
        dstWildcard = '255.255.255.255';
      } else {
        if (body[currentIdx] && /^\d+\./.test(body[currentIdx])) {
          dstWildcard = body[currentIdx++];
        }
      }

      if (!matchIpWithWildcard(targetIp, dstIp, dstWildcard)) continue;

      // Match port (optional)
      if (body[currentIdx] === 'eq') {
        const rulePort = body[currentIdx + 1];
        if (port !== 'any' && port !== rulePort) continue;
      }

      incrementAclCounter(state, aclId, ruleIdx);
      return action;
    }
  }

  return 'deny'; // Implicit deny
}

/**
 * Match IP with wildcard mask (inverse mask)
 */
function matchIpWithWildcard(ip: string, ruleIp: string, wildcard: string): boolean {
  try {
    const ipNum = ipToNumber(ip);
    const ruleIpNum = ipToNumber(ruleIp);
    const wildcardNum = ipToNumber(wildcard);
    const mask = (~wildcardNum) >>> 0;
    return (ipNum & mask) === (ruleIpNum & mask);
  } catch {
    return false;
  }
}

function isDevicePoweredOn(device: CanvasDevice | undefined): boolean {
  if (!device) return false;
  return device.status !== 'offline';
}

function isConnectionCableCompatible(conn: CanvasConnection, a?: CanvasDevice, b?: CanvasDevice): boolean {
  if (!a || !b) return true;

  const cable: CableInfo = {
    connected: true,
    cableType: conn.cableType,
    sourceDevice: a.type,
    targetDevice: b.type,
    sourcePort: conn.sourceDeviceId === a.id ? conn.sourcePort : conn.targetPort,
    targetPort: conn.sourceDeviceId === a.id ? conn.targetPort : conn.sourcePort,
  };

  return isCableCompatible(cable);
}
