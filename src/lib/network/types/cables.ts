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

// Kablo uyumluluk kuralları
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

// Console portu olup olmadığını kontrol et
function isConsolePort(portId: string | undefined): boolean {
  if (!portId) return false;
  const port = portId.toLowerCase();
  return port === 'console' || port === 'com1' || port === 'com';
}

// Serial portu olup olmadığını kontrol et
function isSerialPort(portId: string | undefined): boolean {
  if (!portId) return false;
  const port = portId.toLowerCase();
  return port.startsWith('se') || port.includes('serial');
}

export function isCableCompatible(cable: CableInfo): boolean {
  if (!cable.connected) return false;

  const sourceIsWireless = cable.sourcePort?.toLowerCase() === 'wlan0';
  const targetIsWireless = cable.targetPort?.toLowerCase() === 'wlan0';

  // Wireless links must terminate on WLAN ports at both ends.
  if (cable.cableType === 'wireless') return sourceIsWireless && targetIsWireless;

  // Physical cables cannot be plugged into a WLAN port.
  if (sourceIsWireless || targetIsWireless) return false;

  // Console portu bağlantıları için özel kontrol
  // Console kablosu: PC COM1 <-> Switch Console portu
  const sourceIsConsole = isConsolePort(cable.sourcePort);
  const targetIsConsole = isConsolePort(cable.targetPort);

  if (sourceIsConsole || targetIsConsole) {
    // Console portları için sadece console kablosu geçerli
    if (cable.cableType !== 'console') return false;
    // Bir taraf console portu ise diğer taraf da console portu olmalı
    return sourceIsConsole && targetIsConsole;
  }

  // Serial port bağlantıları için özel kontrol: Sadece Serial kablosu ve her iki taraf da Serial port olmalı
  const sourceIsSerial = isSerialPort(cable.sourcePort);
  const targetIsSerial = isSerialPort(cable.targetPort);

  if (sourceIsSerial || targetIsSerial) {
    if (cable.cableType !== 'serial') return false;
    return sourceIsSerial && targetIsSerial;
  }

  if (cable.cableType === 'serial') {
    return sourceIsSerial && targetIsSerial;
  }

  // Fiber optik kablo tüm Ethernet/Fiber ağ arayüzlerinde geçerlidir
  if (cable.cableType === 'fiber') {
    return true;
  }

  // Normal Ethernet bağlantıları için standart kurallar
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


