import { describe, expect, it } from 'vitest';
import { generateRouterAdminPage } from '@/components/network/WifiControlPanel';
import type { CanvasDevice } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

const baseDevice: CanvasDevice = {
  id: 'router-1',
  type: 'router',
  name: 'R1',
  ip: '192.168.1.1',
  status: 'online',
  x: 0,
  y: 0,
  ports: [
    { id: 'wlan0', label: 'WLAN0', status: 'disconnected', shutdown: false },
  ],
};

describe('WifiControlPanel', () => {
  it('keeps max clients from device wifi config', () => {
    const html = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'LabWiFi',
        security: 'wpa2',
        password: 'password123',
        channel: '2.4GHz',
        mode: 'ap',
        maxClients: 7,
      },
    }, 'tr');

    expect(html).toContain('id="max-clients"');
    expect(html).toContain('value="7"');
  });

  it('prefers max clients from live wlan state', () => {
    const state = {
      ports: {
        wlan0: {
          id: 'wlan0',
          label: 'WLAN0',
          status: 'connected',
          shutdown: false,
          wifi: {
            ssid: 'StateWiFi',
            security: 'wpa2',
            password: 'password123',
            channel: '5GHz',
            mode: 'ap',
            maxClients: 11,
          },
        },
      },
    } as unknown as SwitchState;

    const html = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'DeviceWiFi',
        security: 'wpa2',
        password: 'password123',
        channel: '2.4GHz',
        mode: 'ap',
        maxClients: 7,
      },
    }, 'tr', state);

    expect(html).toContain('value="11"');
  });
});
