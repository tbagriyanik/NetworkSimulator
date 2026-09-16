import type { CableType } from '@/lib/network/types';
import type { CanvasDevice, CanvasPort, DeviceType } from '../NetworkTopology/types/networkTopology.types';

/**
 * Automatically infers the cable type based on the port ID and port type.
 * - Console ports ('console', 'com1', 'com2', 'rs232', or type='console') -> 'console'
 * - Serial ports ('s0/*', 's1/*', 's2/*', 'se*', 'serial*', or type='serial') -> 'serial'
 * - Wireless ports ('wlan0' or type='wireless') -> 'wireless'
 * - Default: retains current cable type
 */
export function getInferredCableTypeForPort(
  portId: string,
  portType?: string,
  currentCableType: CableType = 'straight'
): CableType {
  const norm = portId.toLowerCase();
  if (norm === 'com1' || norm === 'com2' || norm === 'console' || norm === 'rs232' || portType === 'console') {
    return 'console';
  }
  if (
    portType === 'serial' ||
    norm.startsWith('s0/') ||
    norm.startsWith('s1/') ||
    norm.startsWith('s2/') ||
    norm.startsWith('se') ||
    norm.startsWith('serial')
  ) {
    return 'serial';
  }
  if (norm === 'wlan0' || portType === 'wireless') {
    return 'wireless';
  }
  return currentCableType;
}

/**
 * Determines the ideal cable type between two devices based on their types:
 * - Same layer devices (Router-Router, Switch-Switch, PC-PC, Router-PC) -> crossover (or serial if serial ports)
 * - Different layer devices (PC-Switch, Router-Switch) -> straight-through
 */
export function getAutoCableTypeBetweenDevices(
  sourceType: DeviceType,
  targetType: DeviceType
): CableType {
  const isRouter = (t: DeviceType) => t === 'router' || t === 'firewall';
  const isSwitch = (t: DeviceType) => t === 'switchL2' || t === 'switchL3' || t === 'wlc';
  const isHost = (t: DeviceType) => t === 'pc' || t === 'iot';

  if ((isHost(sourceType) && isHost(targetType)) ||
    (isSwitch(sourceType) && isSwitch(targetType)) ||
    (isRouter(sourceType) && isRouter(targetType)) ||
    (isRouter(sourceType) && isHost(targetType)) ||
    (isHost(sourceType) && isRouter(targetType))) {
    return 'crossover';
  }

  return 'straight';
}

/**
 * Finds the first available non-console, non-shutdown, non-connected physical port for auto-cabling.
 */
export function findOptimalFreePort(
  device: CanvasDevice,
  connectedPortIds: Set<string>
): CanvasPort | null {
  if (!device.ports || device.ports.length === 0) return null;

  // Filter out console, management, wireless, and already connected ports
  const availablePorts = device.ports.filter(port => {
    const pId = port.id.toLowerCase();
    const isSpecial = pId === 'console' || pId === 'rs232' || pId === 'com1' || pId === 'com2' ||
      pId.startsWith('wlan') || port.type === 'console' || port.type === 'wireless';
    if (isSpecial) return false;
    if (connectedPortIds.has(`${device.id}-${port.id}`)) return false;
    if (port.status === 'connected') return false;
    return true;
  });

  if (availablePorts.length === 0) return null;

  // Prefer GigabitEthernet/FastEthernet ports in natural order
  return availablePorts[0];
}



