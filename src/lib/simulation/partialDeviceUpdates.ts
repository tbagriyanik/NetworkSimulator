import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';

export interface DeviceUpdateResult {
  devices: CanvasDevice[];
  changedDeviceIds: string[];
}

/**
 * Pure, structural-sharing update for device collections.
 * The input is never mutated; unchanged devices keep their object reference.
 */
export function updateChangedDevices(
  devices: CanvasDevice[],
  updates: ReadonlyMap<string, Partial<CanvasDevice>>
): DeviceUpdateResult {
  if (updates.size === 0) return { devices, changedDeviceIds: [] };

  let nextDevices: CanvasDevice[] | undefined;
  const changedDeviceIds: string[] = [];

  devices.forEach((device, index) => {
    const update = updates.get(device.id);
    if (!update) return;

    const nextDevice = { ...device, ...update };
    if (nextDevice === device) return;
    if (!nextDevices) nextDevices = devices.slice();
    nextDevices[index] = nextDevice;
    changedDeviceIds.push(device.id);
  });

  return { devices: nextDevices || devices, changedDeviceIds };
}



