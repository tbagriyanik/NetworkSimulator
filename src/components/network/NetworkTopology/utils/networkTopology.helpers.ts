import { DeviceType, CanvasPort, CanvasDevice, CanvasConnection } from '../types/networkTopology.types';
import { PORT_SPACING, PORT_START_X, PORT_START_Y, PC_PORT_SPACING } from './networkTopology.constants';
import { isCableCompatible, CABLE_COMPATIBILITY, SwitchState } from '@/lib/network/types';
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

export function getConnectionStatusMessage(
  conn: CanvasConnection,
  devices: readonly CanvasDevice[] | ReadonlyMap<string, CanvasDevice>,
  language: 'tr' | 'en',
  deviceStates?: Map<string, SwitchState>
): string {
  // Accepting a Map matters: the canvas layer already keeps one, so callers do
  // not have to rebuild a lookup for every cable they want to describe.
  const byId = devices as ReadonlyMap<string, CanvasDevice>;
  const byList = devices as readonly CanvasDevice[];
  const isMap = devices instanceof Map;
  const lookup = (id: string): CanvasDevice | undefined =>
    isMap ? byId.get(id) : byList.find((d) => d.id === id);
  const sourceDevice = lookup(conn.sourceDeviceId);
  const targetDevice = lookup(conn.targetDeviceId);
  if (!sourceDevice || !targetDevice) return language === 'tr' ? 'Cihaz bulunamadı' : 'Device not found';

  const sourcePort = sourceDevice.ports.find(p => p.id === conn.sourcePort);
  const targetPort = targetDevice.ports.find(p => p.id === conn.targetPort);

  const cableInfo = { connected: true, cableType: conn.cableType, sourceDevice: sourceDevice.type, targetDevice: targetDevice.type, sourcePort: conn.sourcePort, targetPort: conn.targetPort } as import('@/lib/network/types').CableInfo;
  const isCableOk = isCableCompatible(cableInfo);

  if (!isCableOk) {
    if (conn.cableType === 'wireless') return language === 'tr' ? '⚡ Kablosuz Bağlantı' : '⚡ Wireless Connection';
    const normalize = (t: string) =>
      t === 'switchL2' || t === 'switchL3' || t === 'hub'
        ? 'switch'
        : t === 'iot' || t === 'mobile' || t === 'printer' || t === 'cloud'
          ? 'pc'
          : t;
    const key = `${normalize(sourceDevice.type)}-${normalize(targetDevice.type)}`;
    if (!CABLE_COMPATIBILITY[key]) return language === 'tr' ? '❌ Bu cihaz çifti desteklenmiyor' : '❌ Device pair not supported';
    return language === 'tr' ? '❌ Kablo türü bu cihazlar için uygun değil' : '❌ Cable type not suitable for these devices';
  }

  if (sourceDevice.status === 'offline' || targetDevice.status === 'offline') {
    return language === 'tr' ? '🔌 Cihaz kapalı' : '🔌 Device is offline';
  }

  if (conn.cableType === 'wireless') return language === 'tr' ? '⚡ Kablosuz Bağlantı Aktif' : '⚡ Wireless Link Active';

  if (sourcePort?.status === 'err-disabled' || targetPort?.status === 'err-disabled') {
    return language === 'tr' ? '⛔ Port devre dışı (Errdisable)' : '⛔ Port Errdisable';
  }

  if (sourcePort?.shutdown || targetPort?.shutdown) {
    return language === 'tr' ? '⏹ Port kapalı (Admin Down)' : '⏹ Port is shutdown';
  }

  const isSpeedMismatch = !!(sourcePort?.speed && targetPort?.speed && sourcePort.speed !== 'auto' && targetPort.speed !== 'auto' && sourcePort.speed !== targetPort.speed);
  if (isSpeedMismatch) return language === 'tr' ? '⚠️ Hız uyuşmazlığı (Speed Mismatch)' : '⚠️ Speed Mismatch';

  const isDuplexMismatch = !!(sourcePort?.duplex && targetPort?.duplex && sourcePort.duplex !== 'auto' && targetPort.duplex !== 'auto' && sourcePort.duplex !== targetPort.duplex);
  if (isDuplexMismatch) return language === 'tr' ? '⚠️ Çift yönlülük uyuşmazlığı (Duplex Mismatch)' : '⚠️ Duplex Mismatch';

  const getSTPBlocking = (device: CanvasDevice, portId: string) => {
    if (deviceStates) {
      const sp = deviceStates.get(device.id)?.ports?.[portId];
      if (sp) return sp.spanningTree?.state === 'blocking' || sp.spanningTree?.role === 'alternate';
    }
    return device.ports.find(p => p.id === portId)?.spanningTree?.state === 'blocking';
  };

  if (getSTPBlocking(sourceDevice, conn.sourcePort) || getSTPBlocking(targetDevice, conn.targetPort)) {
    return language === 'tr' ? '🟠 STP engelliyor (Blocking)' : '🟠 STP Blocking';
  }

  const speedVal = sourcePort?.speed || '1000';
  const speedStr = speedVal === '1000' || speedVal === 'auto' ? '1 Gbps' : `${speedVal} Mbps`;
  const duplexStr = sourcePort?.duplex ? sourcePort.duplex.toUpperCase() : 'FULL';

  return `⚡ ${speedStr} | UP (${duplexStr})`;
}

export const isSwitchDeviceType = (type: DeviceType | string): boolean => {
  return type === 'switchL2' || type === 'switchL3';
};

// Lamp/heater/cooler report their own On/Off state instead of a live
// measurement, so they never need a refresh tick to stay visually accurate.
export const isControllableIotDevice = (device: CanvasDevice): boolean => {
  const kind = device.iot?.kind;
  return kind === 'lamp' || kind === 'heater' || kind === 'cooler';
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const getDeviceCenter = (device: CanvasDevice) => {
  const deviceWidth = getDeviceWidth(device.type);
  const deviceHeight = getDeviceHeight(device.type, device.ports.length);
  return { x: device.x + deviceWidth / 2, y: device.y + deviceHeight / 2 };
};



/**
 * Derived port layout for a device's port array.
 *
 * `getPortPosition` is called twice per cable on every render and again twice
 * per cable on every drag frame, and the router/WLC branches used to rebuild
 * three or four filtered arrays per call. Those splits depend only on the port
 * array itself, so they are computed once per array identity and reused. The
 * array is replaced whenever a device's ports actually change, so the cache
 * cannot go stale.
 */
interface PortLayout {
  /** Index of each port id within `device.ports`, by id. */
  indexById: Map<string, number>;
  /** Column offset for Gi-style ports on routers/WLCs. */
  giColById: Map<string, number>;
  /** Column offset for non-Gi built-in ports on routers/WLCs. */
  otherColById: Map<string, number>;
  /** Absolute row offset for module ports. */
  moduleRowById: Map<string, number>;
  /** Absolute column offset for module ports. */
  moduleColById: Map<string, number>;
  /** Index of each port id across the whole port array. */
  totalPortCount: number;
  /**
   * Column used for a port that exists but is excluded from the port row
   * (`wlan0`, `service*`). The straight-line version this replaces fell back to
   * `findIndex` returning -1, which for a WLC was `giPorts.length - 1`.
   */
  otherColFallback: number;
}

const portLayoutCache = new WeakMap<readonly CanvasPort[], PortLayout>();

/** First write wins, matching the `findIndex` lookups this replaces. */
const setFirst = (target: Map<string, number>, key: string, value: number): void => {
  if (!target.has(key)) target.set(key, value);
};

const buildPortLayout = (ports: readonly CanvasPort[], deviceType: DeviceType | string): PortLayout => {
  const indexById = new Map<string, number>();
  for (let i = 0; i < ports.length; i++) {
    setFirst(indexById, ports[i].id, i);
  }

  const layout: PortLayout = {
    indexById,
    giColById: new Map(),
    otherColById: new Map(),
    moduleRowById: new Map(),
    moduleColById: new Map(),
    totalPortCount: ports.length,
    otherColFallback: -1,
  };

  const isRouterOrSwitch = deviceType === 'router' || deviceType === 'switchL2' || deviceType === 'switchL3';

  if (deviceType === 'wlc') {
    // WLC: every non-service port in a single row, Gi first then the rest.
    // Module ports are part of that row, as they always have been here.
    const wlcPorts = ports.filter((p) => p.id !== 'wlan0' && !p.id.startsWith('service'));
    let giCount = 0;
    for (const p of wlcPorts) {
      if (p.id.toLowerCase().startsWith('gi')) giCount += 1;
    }
    layout.otherColFallback = giCount - 1;

    // Non-Gi ports continue after the Gi ports, matching
    // `giPorts.length + otherPorts.findIndex(...)`.
    let giCol = 0;
    let otherCol = giCount;
    for (const p of wlcPorts) {
      if (p.id.toLowerCase().startsWith('gi')) setFirst(layout.giColById, p.id, giCol++);
      else setFirst(layout.otherColById, p.id, otherCol++);
    }
    return layout;
  }

  if (!isRouterOrSwitch) return layout;

  const portsPerRow = 8;

  const builtInPorts = ports.filter(
    (p) => !isModulePort(p.id) && p.id !== 'wlan0' && !p.id.startsWith('service')
  );

  // Router: Gi ports row 0, other built-ins row 1.
  const giPorts = builtInPorts.filter((p) => p.id.toLowerCase().startsWith('gi'));
  const otherBuiltIns = builtInPorts.filter((p) => !p.id.toLowerCase().startsWith('gi'));
  giPorts.forEach((p, i) => setFirst(layout.giColById, p.id, i));
  otherBuiltIns.forEach((p, i) => setFirst(layout.otherColById, p.id, i));

  // Module ports go strictly on the row below all built-in ports.
  const modulePorts = ports.filter((p) => isModulePort(p.id));
  const maxBuiltInRow =
    deviceType === 'router'
      ? 1 // Gi row 0, console/serial row 1, so modules start on row 2.
      : Math.max(0, Math.floor((builtInPorts.length - 1) / portsPerRow));
  modulePorts.forEach((p, i) => {
    setFirst(layout.moduleColById, p.id, i % portsPerRow);
    setFirst(layout.moduleRowById, p.id, maxBuiltInRow + 1 + Math.floor(i / portsPerRow));
  });

  return layout;
};

const getPortLayout = (device: CanvasDevice): PortLayout => {
  const cached = portLayoutCache.get(device.ports);
  if (cached) return cached;
  const layout = buildPortLayout(device.ports, device.type);
  portLayoutCache.set(device.ports, layout);
  return layout;
};

export const getPortPosition = (device: CanvasDevice, portId: string) => {
  // IoT wireless links terminate at the visible Wi-Fi indicator, not at a
  // second physical port circle.
  if (device.type === 'iot' && portId.toLowerCase() === 'wlan0') {
    const deviceWidth = getDeviceWidth(device.type);
    return { x: device.x + deviceWidth - 15, y: device.y + 14 };
  }

  const layout = getPortLayout(device);
  const portIndex = layout.indexById.get(portId) ?? -1;
  if (portIndex === -1) return getDeviceCenter(device);

  const portsPerRow = (device.type === 'pc' || device.type === 'iot') ? 2 : 8;
  const col = portIndex % portsPerRow;
  const row = Math.floor(portIndex / portsPerRow);

  if (device.type === 'pc' || device.type === 'iot') {
    const pcPortSpacing = PC_PORT_SPACING;
    const pcStartY = 85 / 2 - ((layout.totalPortCount - 1) * pcPortSpacing) / 2;
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
    const isGi = portId.toLowerCase().startsWith('gi');
    // WLC: all ports in single row, console after gi ports
    // The `-1` fallbacks keep the `findIndex` miss behaviour of the original
    // lookups for ports that exist but sit outside the row (`wlan0`, `service*`).
    if (isGi) {
      actualCol = layout.giColById.get(portId) ?? -1;
    } else {
      actualCol = layout.otherColById.get(portId) ?? layout.otherColFallback;
    }
    actualRow = 0;
  } else if (isRouterOrSwitch) {
    // Check if current port is a module port
    const isModulePortId = isModulePort(portId);

    if (isModulePortId) {
      actualCol = layout.moduleColById.get(portId) ?? 0;
      actualRow = layout.moduleRowById.get(portId) ?? 0;
    } else if (device.type === 'router') {
      // Router built-in ports: gi ports row 0, other ports row 1
      if (portId.toLowerCase().startsWith('gi')) {
        actualCol = layout.giColById.get(portId) ?? -1;
        actualRow = 0;
      } else {
        actualCol = layout.otherColById.get(portId) ?? -1;
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

/**
 * Finds the optimal target port on a device based on whether the source connection is a console port.
 * If the source is a console/RS232 port or cable is console, prefers an available console port.
 * Otherwise, prefers an available standard (non-console/non-serial) network port.
 */
export const getOptimalTargetPort = (
  targetDevice: CanvasDevice,
  sourceConnection: { deviceId: string; portId: string } | null,
  topologyConnections: CanvasConnection[] | undefined,
  sourceDevice?: CanvasDevice | null
): CanvasPort | undefined => {
  if (!targetDevice.ports || targetDevice.ports.length === 0) return undefined;

  const isPortBusy = (portId: string) => {
    return (
      topologyConnections?.some(
        (c) =>
          (c.sourceDeviceId === targetDevice.id && c.sourcePort === portId) ||
          (c.targetDeviceId === targetDevice.id && c.targetPort === portId)
      ) || false
    );
  };

  const isConsolePort = (portId: string | undefined, portType?: string) => {
    if (!portId) return false;
    const lower = portId.toLowerCase();
    return (
      lower === 'console' ||
      lower === 'com1' ||
      lower === 'com2' ||
      lower === 'com' ||
      lower === 'rs232' ||
      portType === 'console'
    );
  };

  const sourcePortId = sourceConnection?.portId;
  const sourcePortType = sourceDevice?.ports?.find((p) => p.id === sourcePortId)?.type;
  const isSourceConsole = isConsolePort(sourcePortId, sourcePortType);

  if (isSourceConsole) {
    // Look for an available console port on target device
    const availableConsolePort = targetDevice.ports.find((p) => {
      if (!isConsolePort(p.id, p.type)) return false;
      if (p.status === 'connected' || isPortBusy(p.id)) return false;
      return true;
    });
    if (availableConsolePort) return availableConsolePort;
  } else {
    // Look for an available standard network port (exclude console, rs232, serial, wlan)
    const availableStandardPort = targetDevice.ports.find((p) => {
      if (isConsolePort(p.id, p.type)) return false;
      const lower = p.id.toLowerCase();
      if (lower.startsWith('wlan') || p.type === 'wireless') return false;
      if (p.status === 'connected' || isPortBusy(p.id)) return false;
      return true;
    });
    if (availableStandardPort) return availableStandardPort;
  }

  // Fallback to any first free port
  const anyFreePort = targetDevice.ports.find((p) => p.status !== 'connected' && !isPortBusy(p.id));
  return anyFreePort || targetDevice.ports[0];
};



