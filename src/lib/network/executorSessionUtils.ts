import type { SwitchState } from './types';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';

export function findDeviceByHost(ctx: { devices?: CanvasDevice[]; deviceStates?: Map<string, SwitchState> }, host: string): CanvasDevice | undefined {
  const normalized = host.trim().toLowerCase();
  const devices = ctx.devices || [];
  const direct = devices.find(device => device.ip === host || device.name.toLowerCase() === normalized || device.id.toLowerCase() === normalized);
  if (direct) return direct;
  return devices.find(device => (device.ip || '').toLowerCase() === normalized || device.name.toLowerCase().includes(normalized) || device.id.toLowerCase().includes(normalized));
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
  if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${Math.max(1, bytes)} B`;
}


