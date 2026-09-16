import type { CanvasDevice, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';

export function handlePageShortcut(
  shortcut: 'next-device' | 'windows' | 'minimize' | 'save',
  devices: CanvasDevice[],
  activeDeviceId: string | null,
  selectDevice: (device: DeviceType, id: string, model?: string, name?: string) => void,
): void {
  if (shortcut === 'next-device') {
    if (devices.length === 0) return;
    const currentIndex = devices.findIndex(device => device.id === activeDeviceId);
    const nextDevice = devices[(currentIndex + 1 + devices.length) % devices.length];
    if (nextDevice) selectDevice(nextDevice.type, nextDevice.id, nextDevice.switchModel, nextDevice.name);
    return;
  }
  const event = new KeyboardEvent('keydown', {
    key: shortcut === 'windows' ? 'Tab' : shortcut === 'minimize' ? 'm' : 's',
    code: shortcut === 'windows' ? 'Tab' : shortcut === 'minimize' ? 'KeyM' : 'KeyS',
    bubbles: true,
    cancelable: true,
    shiftKey: shortcut === 'windows',
    ctrlKey: shortcut === 'minimize' || shortcut === 'save',
  });
  window.dispatchEvent(event);
}


