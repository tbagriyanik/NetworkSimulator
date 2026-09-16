import { CABLE_COLORS } from '../networkTopology.constants';
import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { HopPacketInfo } from '../PingPacketInfoPanel';
import { tr } from './translations';
type PacketInfoTranslations = typeof tr;

export function getCableLabel(cableType: string, t: PacketInfoTranslations) {
  if (cableType === 'wireless') return t.wireless;
  if (cableType === 'crossover') return t.crossover;
  if (cableType === 'fiber') return t.fiber;
  if (cableType === 'console') return t.console;
  if (cableType === 'serial') return t.serial;
  return t.wired;
}

export function getCableColor(cableType: string) {
  if (cableType === 'crossover') return CABLE_COLORS.crossover.primary;
  if (cableType === 'fiber') return CABLE_COLORS.fiber.primary;
  if (cableType === 'console') return CABLE_COLORS.console.primary;
  if (cableType === 'serial') return CABLE_COLORS.serial.primary;
  if (cableType === 'straight') return CABLE_COLORS.straight.primary;
  return 'var(--color-secondary-400)';
}

export function buildHopPacketInfos(
  path: string[],
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  initialTTL = 64,
  targetIp?: string
): HopPacketInfo[] {
  if (!path || path.length < 2) return [];

  const targetDevice = devices.find(d => d.id === path[path.length - 1]);
  const originalDstIp = targetDevice?.ip || targetDevice?.ipv6 || '0.0.0.0';
  const isIPv6 = (targetIp && targetIp.includes(':')) || originalDstIp.includes(':');

  const getMac = (device: CanvasDevice | undefined, fallback: string): string => {
    if (!device) return fallback;
    if (device.macAddress) return device.macAddress;
    const hash = device.id.replace(/[^a-f0-9]/gi, '').padEnd(12, '0').slice(0, 12);
    return `${hash.slice(0, 2)}:${hash.slice(2, 4)}:${hash.slice(4, 6)}:${hash.slice(6, 8)}:${hash.slice(8, 10)}:${hash.slice(10, 12)}`.toUpperCase();
  };

  const isWirelessConnection = (fromId: string, toId: string): boolean => {
    const fromDev = devices.find(d => d.id === fromId);
    const toDev = devices.find(d => d.id === toId);

    if (!fromDev || !toDev) return false;

    const conn = connections.find(c =>
      (c.sourceDeviceId === fromId && c.targetDeviceId === toId) ||
      (c.sourceDeviceId === toId && c.targetDeviceId === fromId)
    );

    if (conn) {
      return conn.cableType === 'wireless';
    }

    const isFromClient = fromDev.type === 'pc' || fromDev.type === 'iot';
    const isToAP = toDev.type === 'router' || toDev.type.startsWith('switch');
    const isToClient = toDev.type === 'pc' || toDev.type === 'iot';
    const isFromAP = fromDev.type === 'router' || fromDev.type.startsWith('switch');

    if ((isFromClient && isToAP) || (isFromAP && isToClient)) {
      return true;
    }

    return false;
  };

  const infos: HopPacketInfo[] = [];
  let ttl = initialTTL;
  let icmpSeq = 1;

  for (let i = 0; i < path.length - 1; i++) {
    const fromDev = devices.find(d => d.id === path[i]);
    const toDev = devices.find(d => d.id === path[i + 1]);

    if (!fromDev || !toDev) continue;

    const conn = connections.find(c =>
      (c.sourceDeviceId === fromDev.id && c.targetDeviceId === toDev.id) ||
      (c.sourceDeviceId === toDev.id && c.targetDeviceId === fromDev.id)
    );

    const cableType = conn?.cableType || (isWirelessConnection(fromDev.id, toDev.id) ? 'wireless' : 'straight');

    const srcMac = getMac(fromDev, '00:00:00:00:00:01');
    const dstMac = getMac(toDev, '00:00:00:00:00:02');

    const layer3 = isIPv6 ? 'IPv6' : 'IPv4';
    const layer4 = isIPv6 ? 'ICMPv6' : 'ICMP';

    infos.push({
      hopIndex: i,
      fromDevice: {
        id: fromDev.id,
        name: fromDev.name,
        type: fromDev.type,
        ip: fromDev.ip || fromDev.ipv6 || '0.0.0.0',
        mac: srcMac
      },
      toDevice: {
        id: toDev.id,
        name: toDev.name,
        type: toDev.type,
        ip: toDev.ip || toDev.ipv6 || '0.0.0.0',
        mac: dstMac
      },
      cableType,
      srcMac,
      dstMac,
      etherType: isIPv6 ? '0x86DD' : '0x0800',
      srcIp: fromDev.ip || fromDev.ipv6 || '0.0.0.0',
      dstIp: toDev.ip || toDev.ipv6 || '0.0.0.0',
      ttl,
      protocol: layer4,
      icmpType: 'Echo Request',
      icmpCode: 0,
      icmpSeq,
      layer2: 'Ethernet',
      layer3,
      layer4,
      actionDescription: `Forwarding from ${fromDev.name} to ${toDev.name}`
    });

    if (fromDev.type === 'router' || fromDev.type.startsWith('switch')) {
      ttl--;
    }
    icmpSeq++;
  }

  return infos;
}