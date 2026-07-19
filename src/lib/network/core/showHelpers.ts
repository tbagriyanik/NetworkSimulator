import { isRouterModel } from '../switchModels';
import type { SwitchState, Port } from '../types';

export function isPhysicalEthernetPort(portId: string): boolean {
  const p = portId.toLowerCase();
  return (p.startsWith('fa') || p.startsWith('gi')) && !p.includes('.') && !p.startsWith('vlan') && !p.startsWith('wlan') && p !== 'console' && !p.startsWith('s');
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
  const switchModel = state.switchModel || 'WS-C2960-24TT-L';
  const modelName = state.version?.modelName || '';
  const isRouter = isRouterModel(modelName) || isRouterModel(switchModel);
  const isL3 = switchModel === 'WS-C3650-24PS' || (isRouter && !switchModel.includes('2960'));
  const isFirewall = state.deviceType === 'firewall' || state.switchLayer === 'FW' || modelName.includes('ASA') || modelName.includes('Firepower');

  if (isFirewall) {
    const reportedGiCount = 2;
    return {
      switchModel: 'ASA 5506-X',
      isL3: false,
      isRouter: false,
      bootImage: 'asa-software.bin',
      softwareImage: 'Adaptive Security Appliance Software',
      rom: 'ASA boot loader',
      bootldr: 'ASA Boot Loader',
      systemImage: 'flash:asa-software.bin',
      processor: 'ASA 5506-X (Intel Celeron) processor (revision 01) with 8192K bytes of memory',
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
    processor: isL3 ? 'WS-C3650-24PS (PowerPC405) processor (revision 01) with 131072K bytes of memory' : 'WS-C2960-24TT-L (PowerPC405) processor (revision C0) with 65536K bytes of memory',
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
  const ipParts = ipAddress.split('.').map(Number);
  const maskParts = subnetMask.split('.').map(Number);
  return ipParts.map((part, index) => part & maskParts[index]).join('.');
}

export function formatPortName(portName: string): string {
  const lowerName = portName.toLowerCase();
  if (lowerName.startsWith('fa')) {
    return 'FastEthernet' + lowerName.slice(2);
  } else if (lowerName.startsWith('gi')) {
    return 'GigabitEthernet' + lowerName.slice(2);
  } else if (lowerName.startsWith('eth')) {
    return 'Ethernet' + lowerName.slice(4);
  }
  return portName;
}

export function formatMacAddressSimple(mac: string): string {
  if (!mac) return '0000.0000.0000';
  const cleanMac = mac.replace(/[-:.]/g, '').toLowerCase();
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
