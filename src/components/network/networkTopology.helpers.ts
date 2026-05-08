// Device dimension constants
export const DEVICE_DIMENSIONS = {
  pc: { width: 90, height: 99 },
  iot: { width: 90, height: 99 },
  router: { width: 90, height: 80 },
  switch: { width: 130, height: 80 },
  firewall: { width: 90, height: 80 },
} as const;

export const getDeviceDimensions = (type: string) => {
  if (type === 'pc' || type === 'iot') return DEVICE_DIMENSIONS.pc;
  if (type === 'router') return DEVICE_DIMENSIONS.router;
  if (type === 'firewall') return DEVICE_DIMENSIONS.firewall;
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

// Device type checks
export const isPcLike = (type: string): boolean => type === 'pc' || type === 'iot';
export const isSwitchDevice = (type: string): boolean =>
  type === 'switchL2' || type === 'switchL3' || type === 'switch';
export const isRouterDevice = (type: string): boolean => type === 'router';

// Port type detection
export type PortType = 'ethernet' | 'console' | 'gigabit' | 'unknown';

export const getPortType = (portId: string): PortType => {
  const lower = portId.toLowerCase();
  if (lower === 'console') return 'console';
  if (lower.startsWith('gi')) return 'gigabit';
  if (lower.startsWith('fa') || lower.startsWith('eth')) return 'ethernet';
  return 'unknown';
};
