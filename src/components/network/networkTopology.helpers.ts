import { DeviceType } from './networkTopology.types';
import { PORT_SPACING, PORT_START_X, PORT_START_Y, PC_PORT_SPACING } from './networkTopology.constants';
import { CanvasDevice, CanvasConnection } from './networkTopology.types';
import { isCableCompatible, CABLE_COMPATIBILITY } from '@/lib/network/types';

// Device dimension constants
const DEVICE_DIMENSIONS = {
  pc: { width: 90, height: 85 },
  iot: { width: 90, height: 85 },
  router: { width: 90, height: 80 },
  switch: { width: 130, height: 80 },
  firewall: { width: 90, height: 80 },
  wlc: { width: 90, height: 80 },
} as const;

const getDeviceDimensions = (type: string) => {
  if (type === 'pc' || type === 'iot') return DEVICE_DIMENSIONS.pc;
  if (type === 'router') return DEVICE_DIMENSIONS.router;
  if (type === 'firewall') return DEVICE_DIMENSIONS.firewall;
  if (type === 'wlc') return DEVICE_DIMENSIONS.wlc;
  return DEVICE_DIMENSIONS.switch;
};

export const getDeviceWidth = (type: string): number => {
  return getDeviceDimensions(type).width;
};

export const getDeviceHeight = (deviceType: string, portCount: number): number => {
  const dims = getDeviceDimensions(deviceType);
  if (deviceType === 'pc' || deviceType === 'iot') return dims.height;
  const numRows = Math.ceil(portCount / 8);
  return 80 + numRows * 14 + 5;
};

export function getConnectionStatusMessage(conn: CanvasConnection, devices: CanvasDevice[], language: 'tr' | 'en'): string {
  const sourceDevice = devices.find(d => d.id === conn.sourceDeviceId);
  const targetDevice = devices.find(d => d.id === conn.targetDeviceId);
  if (!sourceDevice || !targetDevice) return language === 'tr' ? 'Cihaz bulunamadı' : 'Device not found';

  const sourcePort = sourceDevice.ports.find(p => p.id === conn.sourcePort);
  const targetPort = targetDevice.ports.find(p => p.id === conn.targetPort);

  const cableInfo = { connected: true, cableType: conn.cableType, sourceDevice: sourceDevice.type, targetDevice: targetDevice.type, sourcePort: conn.sourcePort, targetPort: conn.targetPort } as import('@/lib/network/types').CableInfo;
  const isCableOk = isCableCompatible(cableInfo);

  if (!isCableOk) {
    if (conn.cableType === 'wireless') return language === 'tr' ? 'Bağlantı sorunsuz' : 'Connection OK';
    const normalize = (t: string) => t === 'switchL2' || t === 'switchL3' ? 'switch' : t === 'iot' ? 'pc' : t;
    const key = `${normalize(sourceDevice.type)}-${normalize(targetDevice.type)}`;
    if (!CABLE_COMPATIBILITY[key]) return language === 'tr' ? 'Bu cihaz çifti desteklenmiyor' : 'Device pair not supported';
    return language === 'tr' ? 'Kablo türü bu cihazlar için uygun değil' : 'Cable type not suitable for these devices';
  }

  if (sourceDevice.status === 'offline' || targetDevice.status === 'offline') return language === 'tr' ? 'Cihaz kapalı' : 'Device is offline';
  if (sourcePort?.shutdown || targetPort?.shutdown) return language === 'tr' ? 'Port kapalı (shutdown)' : 'Port is shutdown';
  if (sourcePort?.spanningTree?.state === 'blocking' || targetPort?.spanningTree?.state === 'blocking') return language === 'tr' ? 'STP engelliyor (blocking)' : 'STP blocking';

  return language === 'tr' ? 'Bağlantı sorunsuz' : 'Connection OK';
}

export const isSwitchDeviceType = (type: DeviceType | string): boolean => {
  return type === 'switchL2' || type === 'switchL3';
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const getDeviceCenter = (device: CanvasDevice) => {
  const deviceWidth = getDeviceWidth(device.type);
  const deviceHeight = getDeviceHeight(device.type, device.ports.length);
  return { x: device.x + deviceWidth / 2, y: device.y + deviceHeight / 2 };
};

export const getPortPosition = (device: CanvasDevice, portId: string) => {
  const portIndex = device.ports.findIndex(p => p.id === portId);
  if (portIndex === -1) return getDeviceCenter(device);

  const deviceWidth = getDeviceWidth(device.type);
  const portsPerRow = (device.type === 'pc' || device.type === 'iot') ? 2 : 8;
  const col = portIndex % portsPerRow;
  const row = Math.floor(portIndex / portsPerRow);

  if (device.type === 'pc' || device.type === 'iot') {
    const pcPortSpacing = PC_PORT_SPACING;
    const pcStartY = 85 / 2 - ((device.ports.length - 1) * pcPortSpacing) / 2;
    return {
      x: device.x + deviceWidth - 8,
      y: device.y + pcStartY + portIndex * pcPortSpacing
    };
  }

  // Router/WLC: Gi ports row 0, Console+Serial ports row 1
  let actualCol: number;
  let actualRow: number;
  if (device.type === 'router' || device.type === 'wlc') {
    const filteredPorts = device.ports.filter(p => p.id !== 'wlan0' && !p.id.startsWith('service'));
    const portIdLower = portId.toLowerCase();
    const giPorts = filteredPorts.filter(p => p.id.toLowerCase().startsWith('gi'));
    const otherPorts = filteredPorts.filter(p => !p.id.toLowerCase().startsWith('gi'));
    const isGi = portIdLower.startsWith('gi');
    if (device.type === 'wlc') {
      // WLC: all ports in single row, console after gi ports
      if (isGi) {
        actualCol = giPorts.findIndex(p => p.id === portId);
      } else {
        actualCol = giPorts.length + otherPorts.findIndex(p => p.id === portId);
      }
      actualRow = 0;
    } else {
      // Router: gi ports row 0, other ports row 1
      if (isGi) {
        actualCol = giPorts.findIndex(p => p.id === portId);
        actualRow = 0;
      } else {
        actualCol = otherPorts.findIndex(p => p.id === portId);
        actualRow = 1;
      }
    }
  } else {
    actualCol = col;
    actualRow = row;
  }

  return {
    x: device.x + PORT_START_X + actualCol * PORT_SPACING,
    y: device.y + PORT_START_Y + actualRow * PORT_SPACING
  };
};
