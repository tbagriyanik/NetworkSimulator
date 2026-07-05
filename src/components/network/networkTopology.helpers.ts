// Device dimension constants
const DEVICE_DIMENSIONS = {
  pc: { width: 90, height: 99 },
  iot: { width: 90, height: 99 },
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

import { CanvasDevice, CanvasConnection } from './networkTopology.types';
import { isCableCompatible, CABLE_COMPATIBILITY } from '@/lib/network/types';

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
