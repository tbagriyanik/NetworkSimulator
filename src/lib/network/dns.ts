import { CanvasDevice } from '@/components/network/networkTopology.types';
import { SwitchState } from './types';
import { ensureDeviceStatesMap } from './networkUtils';

export function isExternalDomain(hostname: string, devices: CanvasDevice[], deviceStates?: Map<string, SwitchState>): boolean {
  const cleanHostname = hostname.toLowerCase().replace(/^www\./, '');
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipRegex.test(cleanHostname)) return false;

  for (const device of devices) {
    if (device.name?.toLowerCase() === cleanHostname) return false;
  }

  if (deviceStates) {
    const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
    for (const [, state] of safeDeviceStates.entries()) {
      if (state.hostname?.toLowerCase() === cleanHostname) return false;
    }
  }

  if (cleanHostname.includes('.')) {
    const parts = cleanHostname.split('.');
    if (parts.length >= 2) {
      const tld = parts[parts.length - 1];
      const commonTlds = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'io', 'co', 'us', 'uk', 'de', 'fr', 'jp', 'cn', 'au', 'ca'];
      return commonTlds.includes(tld);
    }
  }

  return false;
}

export function simulateDnsLookup(hostname: string): string | null {
  const cleanHostname = hostname.toLowerCase().replace(/^www\./, '');

  // TODO: Replace this mock implementation with actual DNS server lookups from topology
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
  };

  if (knownDomains[cleanHostname]) {
    return knownDomains[cleanHostname];
  }

  let hash = 0;
  for (let i = 0; i < cleanHostname.length; i++) {
    const char = cleanHostname.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }

  const octet1 = Math.abs(hash % 224) + 1; 
  const octet2 = Math.abs((hash >> 8) % 256);
  const octet3 = Math.abs((hash >> 16) % 256);
  const octet4 = Math.abs((hash >> 24) % 256);

  if (octet1 === 10 || (octet1 === 192 && octet2 === 168) || (octet1 === 172 && octet2 >= 16 && octet2 <= 31)) {
    return simulateDnsLookup(cleanHostname + '1'); 
  }

  return `${octet1}.${octet2}.${octet3}.${octet4}`;
}

export function resolveHostname(
  hostname: string,
  devices: CanvasDevice[],
  deviceStates?: Map<string, SwitchState>,
  deviceMap?: Map<string, CanvasDevice>
): string | null {
  const cleanHostname = hostname.toLowerCase().replace(/^www\./, '');

  if (deviceMap) {
    for (const device of deviceMap.values()) {
      if (device.name?.toLowerCase() === cleanHostname && device.ip) return device.ip;
    }
  } else {
    for (const device of devices) {
      if (device.name?.toLowerCase() === cleanHostname && device.ip) return device.ip;
    }
  }

  if (deviceStates) {
    const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
    for (const [deviceId, state] of safeDeviceStates.entries()) {
      if (state.hostname?.toLowerCase() === cleanHostname) {
        const device = deviceMap ? deviceMap.get(deviceId) : devices.find(d => d.id === deviceId);
        if (device?.ip) return device.ip;
        for (const portId in state.ports) {
          if (state.ports[portId].ipAddress) return state.ports[portId].ipAddress;
        }
      }
    }
  }

  const parts = cleanHostname.split('.');
  if (parts.length > 1) {
    const baseHostname = parts[0];
    const domain = parts.slice(1).join('.');

    if (deviceStates) {
      const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
      for (const [deviceId, state] of safeDeviceStates.entries()) {
        if (state.domainName?.toLowerCase() === domain && state.hostname?.toLowerCase() === baseHostname) {
          const device = deviceMap ? deviceMap.get(deviceId) : devices.find(d => d.id === deviceId);
          if (device?.ip) return device.ip;
          for (const portId in state.ports) {
            if (state.ports[portId].ipAddress) return state.ports[portId].ipAddress;
          }
        }
      }
    }
  }

  if (deviceMap) {
    for (const device of deviceMap.values()) {
      if (device.name?.toLowerCase().includes(cleanHostname) && device.ip) return device.ip;
    }
  } else {
    for (const device of devices) {
      if (device.name?.toLowerCase().includes(cleanHostname) && device.ip) return device.ip;
    }
  }

  const externalIp = simulateDnsLookup(cleanHostname);
  if (externalIp) return externalIp;

  return null;
}
