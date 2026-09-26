import { CanvasDevice, CanvasConnection, CanvasPort } from '../NetworkTopology/types/networkTopology.types';
import { isModulePort } from '@/lib/network/portUtils';

export const PORT_FRAME_OK = 'var(--color-secondary-50)';
export const PORT_STP_BLOCKED = 'var(--color-pink-500)';
export const PORT_STP_BLOCKED_STROKE = 'var(--color-pink-300)';
export const PORT_GIGABIT_UP = 'var(--color-warning-500)';
export const PORT_GIGABIT_UP_STROKE = 'var(--color-warning-300)';

export const isGigabitPort = (portId: string) => portId.toLowerCase().startsWith('gi');

export const isSwitchOrHubDeviceType = (type: string) =>
  type === 'switchL2' || type === 'switchL3' || type === 'hub';

export const isPcLikeDeviceType = (type: string) =>
  type === 'pc' || type === 'iot' || type === 'mobile' || type === 'printer';

/** Cloud device Ethernet port id → display number */
const CLOUD_ETH_PORT_NUMBERS: Record<string, string> = {
  eth0: '1',
  eth1: '2',
  eth2: '3',
  eth3: '4',
};

export const getConnectionForPort = (
  device: CanvasDevice,
  deviceConnections: CanvasConnection[],
  portId: string
): CanvasConnection | undefined =>
  deviceConnections.find(
    (connection) =>
      (connection.sourceDeviceId === device.id && connection.sourcePort === portId) ||
      (connection.targetDeviceId === device.id && connection.targetPort === portId)
  );

export const isPortConnectionHealthy = (
  device: CanvasDevice,
  deviceConnections: CanvasConnection[],
  portId: string
): boolean => {
  const connection = getConnectionForPort(device, deviceConnections, portId);
  return Boolean(connection && connection.active !== false);
};

export const getPortFrameColor = (
  isDark: boolean,
  hasProblem: boolean,
  isConnected: boolean,
  connectionHealthy: boolean
): string => {
  if (hasProblem) return isDark ? 'var(--color-secondary-700)' : 'var(--color-secondary-300)';
  if (isConnected && connectionHealthy) return isDark ? PORT_FRAME_OK : 'var(--color-secondary-900)';
  return isDark ? 'var(--color-secondary-600)' : 'var(--color-secondary-400)';
};

export const getDeviceFill = (device: CanvasDevice, isDark: boolean): string => {
  const pcLike = isPcLikeDeviceType(device.type);
  if (isDark) {
    return device.type === 'hub'
      ? 'url(#hubGradientDark)'
      : device.type === 'mobile'
        ? 'url(#mobileGradientDark)'
        : device.type === 'printer'
          ? 'url(#printerGradientDark)'
          : device.type === 'cloud'
            ? 'url(#cloudGradientDark)'
            : device.type === 'iot'
              ? 'url(#iotGradientDark)'
              : device.type === 'firewall'
                ? 'url(#firewallGradientDark)'
                : device.type === 'wlc'
                  ? 'url(#wlcGradientDark)'
                  : pcLike
                    ? 'url(#pcGradientDark)'
                    : isSwitchOrHubDeviceType(device.type)
                      ? (device.type === 'switchL3' ? 'url(#routerGradientDark)' : 'url(#switchGradientDark)')
                      : 'url(#routerGradientDark)';
  }
  return device.type === 'hub'
    ? 'url(#hubGradientLight)'
    : device.type === 'mobile'
      ? 'url(#mobileGradientLight)'
      : device.type === 'printer'
        ? 'url(#printerGradientLight)'
        : device.type === 'cloud'
          ? 'url(#cloudGradientLight)'
          : device.type === 'iot'
            ? 'url(#iotGradientLight)'
            : device.type === 'firewall'
              ? 'url(#firewallGradientLight)'
              : device.type === 'wlc'
                ? 'url(#wlcGradientLight)'
                : pcLike
                  ? 'url(#pcGradientLight)'
                  : isSwitchOrHubDeviceType(device.type)
                    ? (device.type === 'switchL3' ? 'url(#routerGradientLight)' : 'url(#switchGradientLight)')
                    : 'url(#routerGradientLight)';
};

export const getGridPortDisplayNumber = (
  deviceType: CanvasDevice['type'],
  port: CanvasPort,
  portIdLower: string,
  isConsole: boolean,
  isSerial: boolean,
  serialShortFallback: 'parsed' | 'char'
): string => {
  const portNum = port.label.replace(/\D/g, '');
  let displayNum = isConsole ? 'C' : (portNum ? parseInt(portNum, 10).toString() : 'C');
  if (deviceType === 'cloud') {
    displayNum = CLOUD_ETH_PORT_NUMBERS[port.id] ?? '1';
  } else if (isSerial) {
    const parts = portIdLower.split('/');
    if (parts.length >= 3) {
      displayNum = `${parts[1]}/${parts[2]}`;
    } else if (serialShortFallback === 'char') {
      displayNum = portNum ? parseInt(portNum, 10).toString() : 'S';
    } else {
      displayNum = parseInt(portNum, 10).toString();
    }
  }
  return displayNum;
};

export interface PortPinColorsState {
  isStartPort: boolean;
  isTargetPort: boolean;
  isShutdown: boolean;
  isDeviceOffline: boolean;
  isBlocked: boolean;
  isConnected: boolean;
  isConsole: boolean;
  isGigabit: boolean;
  isFastEthernet: boolean;
  isSerial: boolean;
  isDark: boolean;
}

export const getPortFillAndStroke = (state: PortPinColorsState): { portFill: string; portStroke: string } => {
  const disconnectedStroke = state.isDark ? 'var(--color-secondary-600)' : 'var(--color-secondary-400)';
  if (state.isStartPort) return { portFill: 'var(--color-success-500)', portStroke: 'var(--color-success-400)' };
  if (state.isTargetPort) return { portFill: 'var(--color-warning-500)', portStroke: 'var(--color-warning-400)' };
  if (state.isShutdown || state.isDeviceOffline) return { portFill: 'var(--color-error-500)', portStroke: disconnectedStroke };
  if (state.isBlocked) return { portFill: PORT_STP_BLOCKED, portStroke: PORT_STP_BLOCKED_STROKE };
  if (state.isConnected) {
    if (state.isConsole) return { portFill: 'var(--color-accent-500)', portStroke: 'var(--color-accent-400)' };
    if (state.isGigabit) return { portFill: PORT_GIGABIT_UP, portStroke: PORT_GIGABIT_UP_STROKE };
    if (state.isFastEthernet) return { portFill: 'var(--color-primary-500)', portStroke: 'var(--color-primary-400)' };
    if (state.isSerial) return { portFill: 'var(--color-success-500)', portStroke: 'var(--color-success-300)' };
    return { portFill: 'var(--color-primary-500)', portStroke: 'var(--color-primary-400)' };
  }
  if (state.isConsole) return { portFill: 'var(--color-accent-500)', portStroke: disconnectedStroke };
  if (state.isGigabit) return { portFill: 'var(--color-secondary-500)', portStroke: disconnectedStroke };
  if (state.isFastEthernet) return { portFill: 'var(--color-primary-500)', portStroke: disconnectedStroke };
  if (state.isSerial) return { portFill: 'var(--color-success-500)', portStroke: disconnectedStroke };
  return { portFill: 'var(--color-primary-500)', portStroke: disconnectedStroke };
};

export interface DeviceGridPortLayoutEntry {
  port: CanvasPort;
  col: number;
  row: number;
  startX: number;
  startY: number;
  variant: 'router' | 'generic';
}

const NETWORK_PORT_START_Y = 80;

export const getDevicePortLayout = (device: CanvasDevice): DeviceGridPortLayoutEntry[] => {
  if (device.type === 'router' || device.type === 'wlc') {
    const filteredPorts = device.ports.filter(p => p.id !== 'wlan0' && !p.id.startsWith('service'));
    const builtInPorts = filteredPorts.filter(p => !isModulePort(p.id));
    const modulePorts = filteredPorts.filter(p => isModulePort(p.id));
    const giPorts = builtInPorts.filter(p => p.id.toLowerCase().startsWith('gi'));
    const otherPorts = builtInPorts.filter(p => !p.id.toLowerCase().startsWith('gi'));
    const startX = 14;
    const startY = NETWORK_PORT_START_Y;

    if (device.type === 'wlc') {
      return [...giPorts, ...otherPorts, ...modulePorts].map((port, col): DeviceGridPortLayoutEntry => ({
        port,
        col,
        row: 0,
        startX,
        startY,
        variant: 'router',
      }));
    }

    return [
      ...giPorts.map((port, col): DeviceGridPortLayoutEntry => ({ port, col, row: 0, startX, startY, variant: 'router' })),
      ...otherPorts.map((port, col): DeviceGridPortLayoutEntry => ({ port, col, row: 1, startX, startY, variant: 'router' })),
      ...modulePorts.map((port, idx): DeviceGridPortLayoutEntry => ({
        port,
        col: idx % 8,
        row: 2 + Math.floor(idx / 8),
        startX,
        startY,
        variant: 'router',
      })),
    ];
  }

  const filteredPorts = device.ports.filter(p => !p.id.startsWith('vlan') && p.id !== 'wlan0');
  const startX = device.type === 'cloud' ? 44 : 14;
  return filteredPorts.map((port, idx): DeviceGridPortLayoutEntry => ({
    port,
    col: idx % 8,
    row: Math.floor(idx / 8),
    startX,
    startY: NETWORK_PORT_START_Y,
    variant: 'generic',
  }));
};

export const isNetworkHostDevice = (device: CanvasDevice): boolean =>
  device.type === 'router' || device.type === 'wlc';
