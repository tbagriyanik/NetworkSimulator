// Cable and Physical Link Types

import type { DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';

export type CableType = 'straight' | 'crossover' | 'console' | 'wireless' | 'serial' | 'fiber';

export interface CableInfo {
  connected: boolean;
  cableType: CableType;
  sourceDevice: DeviceType;
  targetDevice: DeviceType;
  sourcePort?: string;  // Port ID (e.g., 'eth0', 'com1', 'console', 'fa0/1')
  targetPort?: string;  // Port ID
}

// Kablo uyumluluk kurallarÄ±
export const CABLE_COMPATIBILITY: Record<string, CableType[]> = {
  'pc-switch': ['straight', 'crossover'],
  'iot-switch': ['straight', 'crossover'],
  'switch-iot': ['straight', 'crossover'],
  'switch-pc': ['straight', 'crossover'],
  'pc-router': ['straight', 'crossover'],
  'iot-router': ['straight', 'crossover'],
  'router-iot': ['straight', 'crossover'],
  'router-pc': ['straight', 'crossover'],
  'switch-router': ['straight', 'crossover'],
  'router-switch': ['straight', 'crossover'],
  'router-router': ['straight', 'crossover', 'serial'],
  'pc-pc': ['crossover'],
  'pc-iot': ['crossover'],
  'iot-pc': ['crossover'],
  'iot-iot': ['crossover'],
  'switch-switch': ['straight', 'crossover'],
  'pc-console': ['console'],
  'console-pc': ['console'],
  'firewall-switch': ['straight', 'crossover'],
  'switch-firewall': ['straight', 'crossover'],
  'firewall-router': ['straight', 'crossover'],
  'router-firewall': ['straight', 'crossover'],
  'firewall-pc': ['straight', 'crossover'],
  'pc-firewall': ['straight', 'crossover'],
  'firewall-firewall': ['crossover'],
  'router-serial': ['serial'],
  'serial-router': ['serial'],
  'wlc-switch': ['straight', 'crossover'],
  'switch-wlc': ['straight', 'crossover'],
  'wlc-router': ['straight', 'crossover'],
  'router-wlc': ['straight', 'crossover'],
  'wlc-pc': ['straight', 'crossover'],
  'pc-wlc': ['straight', 'crossover'],
};

// Console portu olup olmadÄ±ÄŸÄ±nÄ± kontrol et
function isConsolePort(portId: string | undefined): boolean {
  if (!portId) return false;
  const port = portId.toLowerCase();
  return port === 'console' || port === 'com1' || port === 'com';
}

export function isCableCompatible(cable: CableInfo): boolean {
  if (!cable.connected) return false;

  const sourceIsWireless = cable.sourcePort?.toLowerCase() === 'wlan0';
  const targetIsWireless = cable.targetPort?.toLowerCase() === 'wlan0';

  // Wireless links must terminate on WLAN ports at both ends.
  if (cable.cableType === 'wireless') return sourceIsWireless && targetIsWireless;

  // Physical cables cannot be plugged into a WLAN port.
  if (sourceIsWireless || targetIsWireless) return false;

  // Console portu baÄŸlantÄ±larÄ± iÃ§in Ã¶zel kontrol
  // Console kablosu: PC COM1 <-> Switch Console portu
  const sourceIsConsole = isConsolePort(cable.sourcePort);
  const targetIsConsole = isConsolePort(cable.targetPort);

  if (sourceIsConsole || targetIsConsole) {
    // Console portlarÄ± iÃ§in sadece console kablosu geÃ§erli
    if (cable.cableType !== 'console') return false;
    // Bir taraf console portu ise diÄŸer taraf da console portu olmalÄ±
    return sourceIsConsole && targetIsConsole;
  }

  // Normal Ethernet baÄŸlantÄ±larÄ± iÃ§in standart kurallar
  const normalize = (t: CableInfo['sourceDevice']): 'pc' | 'switch' | 'router' | 'firewall' | 'wlc' =>
    t === 'switchL2' || t === 'switchL3' || t === 'hub'
      ? 'switch'
      : t === 'iot' || t === 'mobile' || t === 'printer' || t === 'cloud'
        ? 'pc'
        : (t as 'pc' | 'switch' | 'router' | 'firewall' | 'wlc');

  const connection = `${normalize(cable.sourceDevice)}-${normalize(cable.targetDevice)}`;
  const allowedTypes = CABLE_COMPATIBILITY[connection];
  return allowedTypes ? allowedTypes.includes(cable.cableType) : false;
}


