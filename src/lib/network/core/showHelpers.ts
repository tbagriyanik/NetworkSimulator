import { isRouterModel } from '../switchModels';
import type { SwitchState, Port } from '../types';

export function isPhysicalEthernetPort(portId: string): boolean {
  const p = portId.toLowerCase();
  return (
    (p.startsWith('fa') || p.startsWith('gi') || p.startsWith('te') || p.startsWith('eth')) &&
    !p.includes('.') &&
    !p.startsWith('vlan') &&
    !p.startsWith('wlan') &&
    p !== 'console' &&
    !p.startsWith('s')
  );
}

export function getAllowedVlansString(port: Port | undefined): string {
  const allowed = port?.allowedVlans ?? port?.trunkAllowedVlans;
  if (!allowed) return '1-4094';
  if (Array.isArray(allowed)) return allowed.join(',');
  if (allowed === 'all') return '1-4094';
  return String(allowed);
}

export function getNativeVlanString(port: Port | undefined): string {
  const native = port?.nativeVlan;
  return native ? String(native) : '1';
}

export function getSTPCost(port: Port | undefined): number {
  if (!port) return 19;
  if (port.stpCost !== undefined) {
    return port.stpCost;
  }
  const speed = port.speed;
  if (speed === '10000') return 2;
  if (speed === '1000') return 4;
  if (speed === '100') return 19;
  if (speed === '10') return 100;
  if (port.type === 'gigabitethernet') return 4;
  return 19;
}

export function getSwitchDisplayProfile(state: SwitchState) {
  const switchModel = state.switchModel || 'NS-L2-24TT-L';
  const modelName = state.version?.modelName || '';
  const isRouter = isRouterModel(modelName) || isRouterModel(switchModel);
  const isL3 = switchModel === 'NS-L3-24PS' || (isRouter && !switchModel.includes('NS-L2'));
  const isFirewall = state.deviceType === 'firewall' || state.switchLayer === 'FW' || modelName.includes('NS-FW');

  if (isFirewall) {
    const reportedGiCount = 2;
    return {
      switchModel: 'Firewall',
      isL3: false,
      isRouter: false,
      bootImage: 'fw-software.bin',
      softwareImage: 'NetSim Firewall Software',
      rom: 'NetSim boot loader',
      bootldr: 'NetSim Boot Loader',
      systemImage: 'flash:fw-software.bin',
      processor: 'Firewall processor (revision 01) with 8192K bytes of memory',
      reportedFeCount: 0,
      reportedGiCount,
    };
  }

  if (isRouter) {
    return {
      switchModel: modelName,
      isL3: true,
      isRouter: true,
      bootImage: 'router-software.bin',
      softwareImage: 'Network Simulator nOS Software, Version',
      rom: 'Router boot loader',
      bootldr: 'Router Boot Loader',
      systemImage: 'flash:router-software.bin',
      processor: `${modelName} (PowerPC405) processor (revision 01) with 4096K bytes of memory`,
      reportedFeCount: 0,
      reportedGiCount: 4,
    };
  }

  return {
    switchModel,
    isL3,
    isRouter: false,
    bootImage: isL3 ? 'l3switch-software.bin' : 'l2switch-software.bin',
    softwareImage: isL3 ? 'L3 Switch Software' : 'L2 Switch Software',
    rom: isL3 ? 'L3 Switch boot loader' : 'L2 Switch boot loader',
    bootldr: isL3 ? 'L3 Switch Boot Loader' : 'L2 Switch Boot Loader',
    systemImage: isL3 ? 'flash:l3switch-software.bin' : 'flash:l2switch-software.bin',
    processor: isL3 ? 'Layer 3 switch processor (revision 01) with 131072K bytes of memory' : 'Layer 2 switch processor (revision C0) with 65536K bytes of memory',
    reportedFeCount: isL3 ? 0 : 24,
    reportedGiCount: isL3 ? 28 : 2,
  };
}

export function getPrefixLength(subnetMask: string | undefined): number {
  if (!subnetMask) return 0;
  const parts = subnetMask.split('.').map(Number);
  let count = 0;
  for (const part of parts) {
    if (part === 255) count += 8;
    else if (part === 254) { count += 7; break; }
    else if (part === 252) { count += 6; break; }
    else if (part === 248) { count += 5; break; }
    else if (part === 240) { count += 4; break; }
    else if (part === 224) { count += 3; break; }
    else if (part === 192) { count += 2; break; }
    else if (part === 128) { count += 1; break; }
    else break;
  }
  return count;
}

export function getNetworkAddress(ipAddress: string, subnetMask: string): string {
  if (!ipAddress || !subnetMask) {
    return '0.0.0.0';
  }
  const ipParts = ipAddress.split('.').map(Number);
  const maskParts = subnetMask.split('.').map(Number);
  return ipParts.map((part, index) => part & maskParts[index]).join('.');
}

export function formatPortName(portName: string): string {
  if (!portName) return '';
  const trimmed = portName.trim();
  const lower = trimmed.toLowerCase();

  // FastEthernet: fa0/1, fastethernet0/1, fa0/1/0, fastethernet0/1/0, fastethernetstethernet0/1/0 etc.
  const faMatch = lower.match(/^(?:fastethernet(?:stethernet)?|fast|fa|f)(\d+.*)$/i);
  if (faMatch) {
    return `FastEthernet${faMatch[1]}`;
  }

  // GigabitEthernet: gi0/1, gigabitethernet0/1, gi0/1/0, etc.
  const giMatch = lower.match(/^(?:gigabitethernet|gigabit|gig|gi|g)(\d+.*)$/i);
  if (giMatch) {
    return `GigabitEthernet${giMatch[1]}`;
  }

  // TenGigabitEthernet: te0/1/0, tengigabitethernet0/1/0, te0/1, etc.
  const teMatch = lower.match(/^(?:tengigabitethernet|tengigabit|tengig|teng|te)(\d+.*)$/i);
  if (teMatch) {
    return `TenGigabitEthernet${teMatch[1]}`;
  }

  // Serial: s0/0/0, serial0/0/0, se0/0/0, s0/1, etc.
  const serialMatch = lower.match(/^(?:serial|se|s)(\d+.*)$/i);
  if (serialMatch) {
    return `Serial${serialMatch[1]}`;
  }

  // Ethernet: eth0, ethernet0, e0, eth0/1, etc.
  const ethMatch = lower.match(/^(?:ethernet|eth|e)(\d+.*)$/i);
  if (ethMatch) {
    return `Ethernet${ethMatch[1]}`;
  }

  // Loopback: lo0, loopback0, etc.
  const loMatch = lower.match(/^(?:loopback|lo)(\d+.*)$/i);
  if (loMatch) {
    return `Loopback${loMatch[1]}`;
  }

  // VLAN: vlan1, vlan10, etc.
  const vlanMatch = lower.match(/^vlan(\d+.*)$/i);
  if (vlanMatch) {
    return `Vlan${vlanMatch[1]}`;
  }

  // Port-channel: po1, port-channel1, etc.
  const poMatch = lower.match(/^(?:port-channel|portchannel|po)(\d+.*)$/i);
  if (poMatch) {
    return `Port-channel${poMatch[1]}`;
  }

  // Tunnel: tunnel0, tun0, etc.
  const tunMatch = lower.match(/^(?:tunnel|tun)(\d+.*)$/i);
  if (tunMatch) {
    return `Tunnel${tunMatch[1]}`;
  }

  return trimmed;
}

export function formatMacAddressSimple(mac: string): string {
  if (!mac) return '0000.0000.0000';
  const cleanMac = mac.replace(/[-:.]/g, '').toUpperCase();
  const padded = cleanMac.padStart(12, '0').slice(0, 12);
  return padded.match(/.{1,4}/g)?.join('.') || padded;
}

export function getPortNumber(portId: string): number {
  const match = portId.match(/\/(\d+)$/);
  return match ? parseInt(match[1], 10) : 1;
}

export function isIpInNetwork(ip: string, network: string, mask: string): boolean {
  try {
    const ipParts = ip.split('.').map(Number);
    const netParts = network.split('.').map(Number);
    const maskParts = mask.split('.').map(Number);
    if (ipParts.length !== 4 || netParts.length !== 4 || maskParts.length !== 4) return false;
    for (let i = 0; i < 4; i++) {
      if ((ipParts[i] & maskParts[i]) !== (netParts[i] & maskParts[i])) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
