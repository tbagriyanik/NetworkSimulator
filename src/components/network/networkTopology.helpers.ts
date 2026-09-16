import { DeviceType } from './networkTopology.types';
import { PORT_SPACING, PORT_START_X, PORT_START_Y, PC_PORT_SPACING } from './networkTopology.constants';
import { CanvasDevice, CanvasConnection } from './networkTopology.types';
import { isCableCompatible, CABLE_COMPATIBILITY } from '@/lib/network/types';
import { isModulePort } from '@/lib/network/portUtils';

// Device dimension constants
const DEVICE_DIMENSIONS = {
  pc: { width: 90, height: 85 },
  mobile: { width: 90, height: 85 },
  iot: { width: 90, height: 85 },
  router: { width: 90, height: 80 },
  switch: { width: 130, height: 80 },
  firewall: { width: 90, height: 80 },
  wlc: { width: 90, height: 80 },
} as const;

const getDeviceDimensions = (type: DeviceType | string) => {
  if (type === 'mobile') return DEVICE_DIMENSIONS.mobile;
  if (type === 'pc' || type === 'iot') return DEVICE_DIMENSIONS.pc;
  if (type === 'router') return DEVICE_DIMENSIONS.router;
  if (type === 'firewall') return DEVICE_DIMENSIONS.firewall;
  if (type === 'wlc') return DEVICE_DIMENSIONS.wlc;
  return DEVICE_DIMENSIONS.switch;
};

export const getDeviceWidth = (type: DeviceType | string): number => {
  return getDeviceDimensions(type).width;
};

export const getDeviceHeight = (deviceType: DeviceType | string, portCount: number): number => {
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
    const normalize = (t: string) =>
      t === 'switchL2' || t === 'switchL3' || t === 'hub'
        ? 'switch'
        : t === 'iot' || t === 'mobile' || t === 'printer' || t === 'cloud'
          ? 'pc'
          : t;
    const key = `${normalize(sourceDevice.type)}-${normalize(targetDevice.type)}`;
    if (!CABLE_COMPATIBILITY[key]) return language === 'tr' ? 'Bu cihaz çifti desteklenmiyor' : 'Device pair not supported';
    return language === 'tr' ? 'Kablo türü bu cihazlar için uygun değil' : 'Cable type not suitable for these devices';
  }

  if (sourceDevice.status === 'offline' || targetDevice.status === 'offline') return language === 'tr' ? 'Cihaz kapalı' : 'Device is offline';
  // Wireless links use the Wi-Fi association state, not the physical
  // wlan0 placeholder port. PCs/IoT devices keep that placeholder shutdown
  // until an association is established, and WLCs do not expose a physical
  // wlan0 port at all.
  if (conn.cableType === 'wireless') return language === 'tr' ? 'Bağlantı sorunsuz' : 'Connection OK';
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
  // IoT wireless links terminate at the visible Wi-Fi indicator, not at a
  // second physical port circle.
  if (device.type === 'iot' && portId.toLowerCase() === 'wlan0') {
    const deviceWidth = getDeviceWidth(device.type);
    return { x: device.x + deviceWidth - 15, y: device.y + 14 };
  }
  const portIndex = device.ports.findIndex(p => p.id === portId);
  if (portIndex === -1) return getDeviceCenter(device);

  const portsPerRow = (device.type === 'pc' || device.type === 'iot') ? 2 : 8;
  const col = portIndex % portsPerRow;
  const row = Math.floor(portIndex / portsPerRow);

  if (device.type === 'pc' || device.type === 'iot') {
    const pcPortSpacing = PC_PORT_SPACING;
    const pcStartY = 85 / 2 - ((device.ports.length - 1) * pcPortSpacing) / 2;
    const devWidth = getDeviceWidth(device.type);
    return {
      x: device.x + devWidth - 8,
      y: device.y + pcStartY + portIndex * pcPortSpacing
    };
  }

  // Router/WLC: Gi ports row 0, Console+Serial ports row 1
  let actualCol: number;
  let actualRow: number;
  
  // Handle routers and switches with module ports
  const isRouterOrSwitch = device.type === 'router' || device.type === 'switchL2' || device.type === 'switchL3';
  
  if (device.type === 'wlc') {
    const filteredPorts = device.ports.filter(p => p.id !== 'wlan0' && !p.id.startsWith('service'));
    const portIdLower = portId.toLowerCase();
    const giPorts = filteredPorts.filter(p => p.id.toLowerCase().startsWith('gi'));
    const otherPorts = filteredPorts.filter(p => !p.id.toLowerCase().startsWith('gi'));
    const isGi = portIdLower.startsWith('gi');
    
    // WLC: all ports in single row, console after gi ports
    if (isGi) {
      actualCol = giPorts.findIndex(p => p.id === portId);
    } else {
      actualCol = giPorts.length + otherPorts.findIndex(p => p.id === portId);
    }
    actualRow = 0;
  } else if (isRouterOrSwitch) {
    // Check if current port is a module port
    const isModulePortId = isModulePort(portId);
    
    if (isModulePortId) {
      // Module ports go strictly on the row below all built-in ports
      const builtInPorts = device.ports.filter(p => !isModulePort(p.id) && p.id !== 'wlan0' && !p.id.startsWith('service'));
      const modulePorts = device.ports.filter(p => isModulePort(p.id));
      const modulePortIndex = modulePorts.findIndex(p => p.id === portId);
      
      let maxBuiltInRow = 0;
      if (device.type === 'router') {
        maxBuiltInRow = 1; // Router built-in ports occupy row 0 (gi) and row 1 (console + serial), so module ports start on row 2 (3rd row)
      } else {
        maxBuiltInRow = Math.max(0, Math.floor((builtInPorts.length - 1) / portsPerRow));
      }

      actualCol = modulePortIndex % portsPerRow;
      actualRow = (maxBuiltInRow + 1) + Math.floor(modulePortIndex / portsPerRow);
    } else if (device.type === 'router') {
      // Router built-in ports: gi ports row 0, other ports row 1
      const filteredPorts = device.ports.filter(p => p.id !== 'wlan0' && !p.id.startsWith('service') && !isModulePort(p.id));
      const portIdLower = portId.toLowerCase();
      const giPorts = filteredPorts.filter(p => p.id.toLowerCase().startsWith('gi'));
      const otherPorts = filteredPorts.filter(p => !p.id.toLowerCase().startsWith('gi'));
      const isGi = portIdLower.startsWith('gi');
      
      if (isGi) {
        actualCol = giPorts.findIndex(p => p.id === portId);
        actualRow = 0;
      } else {
        actualCol = otherPorts.findIndex(p => p.id === portId);
        actualRow = 1;
      }
    } else {
      // Switch built-in ports maintain their original order
      actualCol = col;
      actualRow = row;
    }
  } else {
    // Other devices: standard positioning
    actualCol = col;
    actualRow = row;
  }

  const startX = device.type === 'cloud' ? 44 : PORT_START_X;
  return {
    x: device.x + startX + actualCol * PORT_SPACING,
    y: device.y + PORT_START_Y + actualRow * PORT_SPACING
  };
};

/**
 * Generates a deterministic device pair key without allocating temporary arrays or running sorting algorithms.
 * E.g., getDevicePairKey('devA', 'devB') -> 'devA:devB' or 'devB:devA'
 */
export const getDevicePairKey = (id1: string, id2: string, separator: string = ':'): string => {
  return id1 < id2 ? `${id1}${separator}${id2}` : `${id2}${separator}${id1}`;
};

/**
 * Normalizes a device type into a stable counter key so that L2/L3 switches and
 * generic 'switch' entries share a single name/IP generation counter.
 */
export const getCounterKey = (type: DeviceType | string): string => {
  if (type === 'switchL2' || type === 'switchL3' || type === 'switch') return 'switch';
  return type;
};

/**
 * Euclidean distance between two points, used for touch gesture thresholds.
 */
export const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export interface SelectionBox {
  start: { x: number; y: number };
  current: { x: number; y: number };
}

/**
 * Returns the ids of every device whose bounding rectangle intersects the given
 * selection box. Box coordinates are normalized (min/max) so any drag direction works.
 */
export const getDeviceIdsInSelectionBox = (devices: CanvasDevice[], box: SelectionBox): string[] => {
  const x1 = Math.min(box.start.x, box.current.x);
  const y1 = Math.min(box.start.y, box.current.y);
  const x2 = Math.max(box.start.x, box.current.x);
  const y2 = Math.max(box.start.y, box.current.y);

  return devices
    .filter((d) => {
      const deviceWidth = getDeviceWidth(d.type);
      const deviceHeight = getDeviceHeight(d.type, d.ports?.length || 0);
      const dX1 = d.x;
      const dY1 = d.y;
      const dX2 = d.x + deviceWidth;
      const dY2 = d.y + deviceHeight;
      return dX1 < x2 && dX2 > x1 && dY1 < y2 && dY2 > y1;
    })
    .map((d) => d.id);
};

/**
 * Merges box-selected ids with any base selection when additive (ctrl/shift) mode
 * is active; otherwise the box selection alone wins.
 */
export const mergeSelectionIds = (boxSelectedIds: string[], isAdditive: boolean, baseIds: string[]): string[] => {
  if (!isAdditive) return boxSelectedIds;
  return Array.from(new Set([...baseIds, ...boxSelectedIds]));
};
