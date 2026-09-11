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

  it('renders WEP security option in security selector', () => {
    const htmlTr = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'WepWiFi',
        security: 'wep',
        password: 'wepkey12345',
        channel: '2.4GHz',
        mode: 'ap',
      },
    }, 'tr');

    expect(htmlTr).toContain('<option value="wep" selected>WEP (Wired Equivalent Privacy)</option>');
    expect(htmlTr).toContain('WEP');

    const htmlEn = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'WepWiFiEn',
        security: 'wep',
        password: 'wepkey12345',
        channel: '2.4GHz',
        mode: 'ap',
      },
    }, 'en');

    expect(htmlEn).toContain('<option value="wep" selected>WEP (Wired Equivalent Privacy)</option>');
    expect(htmlEn).toContain('minlength="5"');
  });

  it('renders broadcast channel optgroups and selections', () => {
    const htmlTr = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'ChannelTestWiFi',
        security: 'wpa2',
        password: 'password123',
        channel: '6',
        mode: 'ap',
      },
    }, 'tr');

    expect(htmlTr).toContain('id="wifi-channel"');
    expect(htmlTr).toContain('optgroup');
    expect(htmlTr).toContain('2.4 GHz Bandı');
    expect(htmlTr).toContain('<option value="6" selected>Kanal 6 (2.437 GHz) - Önerilen</option>');
    expect(htmlTr).toContain('<option value="11" >Kanal 11 (2.462 GHz) - Önerilen</option>');
    expect(htmlTr).toContain('5 GHz Bandı');
    expect(htmlTr).toContain('<option value="36" >Kanal 36 (5.180 GHz)</option>');

    // Status tab formatting
    expect(htmlTr).toContain('Kanal 6 (2.437 GHz)');

    const htmlEn = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'ChannelTestWiFiEn',
        security: 'wpa2',
        password: 'password123',
        channel: '36',
        mode: 'ap',
      },
    }, 'en');

    expect(htmlEn).toContain('<option value="36" selected>Channel 36 (5.180 GHz)</option>');
    expect(htmlEn).toContain('Channel 36 (5.180 GHz)');
  });

  it('renders MAC address filtering settings in advanced tab and status tab', () => {
    const htmlTr = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'MacFilterWiFi',
        security: 'wpa2',
        password: 'password123',
        channel: '6',
        mode: 'ap',
        macFilterEnabled: true,
        macFilterMode: 'allow',
        macFilterList: ['00:11:22:33:44:55', 'AA:BB:CC:DD:EE:FF'],
      },
    }, 'tr');

    expect(htmlTr).toContain('id="mac-filter-enabled"');
    expect(htmlTr).toContain('checked');
    expect(htmlTr).toContain('value="allow" checked');
    expect(htmlTr).toContain('00:11:22:33:44:55');
    expect(htmlTr).toContain('AA:BB:CC:DD:EE:FF');
    expect(htmlTr).toContain('Etkin (Erişim: 2 adres)');

    const htmlDenyEn = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'MacFilterWiFiDeny',
        security: 'wpa2',
        password: 'password123',
        channel: '6',
        mode: 'ap',
        macFilterEnabled: true,
        macFilterMode: 'deny',
        macFilterList: ['00:11:22:33:44:55'],
      },
    }, 'en');

    expect(htmlDenyEn).toContain('value="deny" checked');
    expect(htmlDenyEn).toContain('Enabled (Deny: 1 items)');

    const htmlDisabled = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'DisabledMacFilter',
        security: 'wpa2',
        password: 'password123',
        channel: '6',
        mode: 'ap',
        macFilterEnabled: false,
      },
    }, 'tr');

    expect(htmlDisabled).toContain('○ Devre Dışı');
  });

  it('renders multi-SSID management section and default profiles', () => {
    const html = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'MultiSsidWiFi',
        security: 'wpa2',
        password: 'password123',
        channel: '2.4GHz',
        mode: 'ap',
        ssids: [
          { id: 'ssid-1', name: 'Ana Ağ (Primary)', ssid: 'Primary_SSID', security: 'wpa2', password: 'pass1', band: 'both', enabled: true },
          { id: 'ssid-2', name: 'Misafir Ağ (Guest)', ssid: 'Guest_SSID', security: 'open', band: '2.4GHz', enabled: true },
        ],
      },
    }, 'tr');

    expect(html).toContain('Çoklu SSID &amp; Misafir Ağ Profilleri');
    expect(html).toContain('ssid-profiles-container');
    expect(html).toContain('profile-ssid');
    expect(html).toContain('profile-band');
    expect(html).toContain('btn-save-ssid-profile');
  });

  it('renders connected wireless devices list container in status tab', () => {
    const html = generateRouterAdminPage({
      ...baseDevice,
      wifi: {
        enabled: true,
        ssid: 'StatusTestWiFi',
        security: 'wpa2',
        password: 'password123',
        channel: '5GHz',
        mode: 'ap',
      },
    }, 'tr', undefined, [
      { id: 'iot-1', name: 'Smart Plug 1', sensorType: 'light', connected: true, ip: '192.168.1.105' },
    ]);

    expect(html).toContain('Bağlı Kablosuz İstemciler Listesi');
    expect(html).toContain('connected-wireless-clients-container');
    expect(html).toContain('Smart Plug 1');
  });

  it('requires login with default admin:admin credentials', () => {
    const html = generateRouterAdminPage(baseDevice, 'tr');

    // Login overlay must be visible by default and main content hidden
    expect(html).toContain('id="login-form" class="login-overlay" style="display:flex;"');
    expect(html).toContain('id="main-content" style="display:none;"');
    expect(html).toContain('id="login-username"');
    expect(html).toContain('id="login-password"');
    // Default credentials admin/admin are baked into the page script
    expect(html).toContain('var currentAdminUser = "admin";');
    expect(html).toContain('var currentAdminPass = "admin";');
  });

  it('uses persisted credentials from services.http over defaults', () => {
    const html = generateRouterAdminPage({
      ...baseDevice,
      services: {
        http: { enabled: true, content: '', username: 'netadmin', password: 'S3cret!' },
      },
    }, 'tr');

    expect(html).toContain('var currentAdminUser = "netadmin";');
    expect(html).toContain('var currentAdminPass = "S3cret!"');
    expect(html).not.toContain('var currentAdminUser = "admin";');
  });

  it('renders admin tab with change password form and posts save message', () => {
    const html = generateRouterAdminPage(baseDevice, 'en');

    expect(html).toContain('data-tab="admin"');
    expect(html).toContain('id="admin-tab"');
    expect(html).toContain('id="admin-credentials-form"');
    expect(html).toContain('handleSaveCredentials');
    expect(html).toContain("type: 'router-admin-save-credentials'");
    expect(html).toContain('cred-current-password');
    expect(html).toContain('cred-new-password');
    expect(html).toContain('cred-confirm-password');
  });
});

