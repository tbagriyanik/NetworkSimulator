import { describe, it, expect } from 'vitest';
import { generateIotWebPanelContent, generateIotDevicePageContent } from '@/lib/network/iotWebPanel';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import type { IotRule } from '@/lib/network/iotWebPanel';

describe('iotWebPanel', () => {
  const createIotDevice = (overrides: Partial<CanvasDevice> = {}): CanvasDevice => ({
    id: 'sensor-1',
    type: 'iot',
    name: 'Test Sensor',
    x: 100,
    y: 100,
    ip: '192.168.1.10',
    macAddress: '00:E0:F7:00:00:01',
    status: 'online',
    iot: {
      sensorType: 'temperature',
      collaborationEnabled: true,
    },
    wifi: { enabled: true, ssid: 'IoT-Network', security: 'open', password: '', channel: '2.4GHz', mode: 'client' },
    ports: [
      { id: 'wlan0', label: 'WLAN0', status: 'disconnected', wifi: { ssid: 'IoT-Network', security: 'open', channel: '2.4GHz', mode: 'client' } },
    ],
    ...overrides,
  });

  describe('generateIotWebPanelContent', () => {
    it('should return HTML string', () => {
      const result = generateIotWebPanelContent([createIotDevice()], 'en');

      expect(typeof result).toBe('string');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('IoT Web Panel');
    });

    it('should include Turkish text when language is tr', () => {
      const result = generateIotWebPanelContent([createIotDevice()], 'tr');

      expect(result).toContain('IoT Web Paneli');
      expect(result).toContain('Giriş Yap');
    });

    it('should include English text when language is en', () => {
      const result = generateIotWebPanelContent([createIotDevice()], 'en');

      expect(result).toContain('IoT Web Panel');
      expect(result).toContain('Login');
    });

    it('should show no devices message when device list is empty', () => {
      const result = generateIotWebPanelContent([], 'en');

      expect(result).toContain('No IoT devices found');
    });

    it('should include device name and IP in card', () => {
      const result = generateIotWebPanelContent([
        createIotDevice({ name: 'Living Room', ip: '192.168.1.50' }),
      ], 'en');

      expect(result).toContain('Living Room');
      expect(result).toContain('192.168.1.50');
    });

    it('should filter devices by routerId when provided', () => {
      const onlineDevice = createIotDevice({
        id: 'sensor-1',
        name: 'Online Sensor',
      });

      const offlineDevice = createIotDevice({
        id: 'sensor-2',
        name: 'Unconnected Sensor',
      });

      const connections: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'router-1', sourcePort: 'gi0/0', targetDeviceId: 'sensor-1', targetPort: 'wlan0', cableType: 'straight', active: true },
      ];

      const result = generateIotWebPanelContent(
        [onlineDevice, offlineDevice],
        'en',
        'router-1',
        'MyWiFi',
        connections,
      );

      expect(result).toContain('Online Sensor');
      expect(result).not.toContain('Unconnected Sensor');
    });

    it('should show Simple Programming badge when device has rules', () => {
      const device = createIotDevice({
        iot: {
          sensorType: 'temperature',
          collaborationEnabled: true,
          rules: [
            { id: 'rule-1', condition: 'temperature > 30', action: 'ON', enabled: true },
          ],
        },
      });

      const result = generateIotWebPanelContent([device], 'en');
      expect(result).toContain('Simple Programming');
      expect(result).toContain('Rule Count');
    });

    it('should handle powered off device', () => {
      const device = createIotDevice({ status: 'offline' });
      const result = generateIotWebPanelContent([device], 'en');

      expect(result).toContain('powered-off');
      expect(result).toContain('Offline');
    });

    it('should sanitize device name to prevent XSS', () => {
      const device = createIotDevice({ name: '<script>alert("xss")</script>' });
      const result = generateIotWebPanelContent([device], 'en');

      expect(result).toContain('&lt;script&gt;alert');
      expect(result).not.toContain('>alert');
    });

    it('should show online status for connected active device', () => {
      const device = createIotDevice({ id: 'sensor-1' });
      const connections: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'router-1', sourcePort: 'gi0/0', targetDeviceId: 'sensor-1', targetPort: 'wlan0', cableType: 'straight', active: true },
      ];

      const result = generateIotWebPanelContent(
        [device],
        'en',
        'router-1',
        'IoT-Network',
        connections,
      );

      expect(result).toContain('Online');
      expect(result).toContain('device-status online');
    });

    it('should connect button with postMessage for device interaction', () => {
      const device = createIotDevice({ id: 'sensor-42' });
      const result = generateIotWebPanelContent([device], 'en');

      expect(result).toContain('open-iot-device');
      expect(result).toContain('sensor-42');
    });

    it('should include login form', () => {
      const result = generateIotWebPanelContent([createIotDevice()], 'en');

      expect(result).toContain('id="loginSection"');
      expect(result).toContain('id="password"');
      expect(result).toContain('checkPassword');
    });

    it('should include device section', () => {
      const result = generateIotWebPanelContent([createIotDevice()], 'en');

      expect(result).toContain('id="deviceSection"');
      expect(result).toContain('class="device-list"');
    });

    it('should include settings popup', () => {
      const result = generateIotWebPanelContent([createIotDevice()], 'en');

      expect(result).toContain('Settings');
      expect(result).toContain('Change Password');
      expect(result).toContain('Logout');
    });

    it('should display device status with correct CSS class based on connection state', () => {
      const wiredDevice = createIotDevice({ id: 'sensor-wired', name: 'Wired' });
      const connections: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'router-1', sourcePort: 'gi0/0', targetDeviceId: 'sensor-wired', targetPort: 'eth0', cableType: 'straight', active: true },
      ];

      const result = generateIotWebPanelContent(
        [wiredDevice],
        'en',
        'router-1',
        undefined,
        connections,
      );

      expect(result).toContain('connected');
    });

    it('should handle device with WiFi connection via SSID', () => {
      const device = createIotDevice({
        id: 'wifi-sensor',
        name: 'WiFi Sensor',
        wifi: { enabled: true, ssid: 'IoT-Network', security: 'open', password: '', channel: '2.4GHz', mode: 'client' },
      });
      const connections: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'router-1', sourcePort: 'gi0/0', targetDeviceId: 'wifi-sensor', targetPort: 'wlan0', cableType: 'straight', active: true },
      ];

      const result = generateIotWebPanelContent(
        [device],
        'en',
        'router-1',
        'IoT-Network',
        connections,
      );

      expect(result).toContain('WiFi Sensor');
      expect(result).toContain('Online');
    });
  });

  describe('generateIotDevicePageContent', () => {
    it('should return HTML string for device management page', () => {
      const result = generateIotDevicePageContent(
        'sensor-1',
        'Living Room Sensor',
        'en',
        true,
        false,
        'sensor',
        [],
        'temperature',
        [],
        'input',
        [],
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('IoT Device Management');
      expect(result).toContain('Living Room Sensor');
    });

    it('should show Turkish text when language is tr', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'tr');

      expect(result).toContain('IoT Cihaz Yönetimi');
      expect(result).toContain('Cihaz ID');
      expect(result).toContain('Listeye Dön');
    });

    it('should show powered off warning when device is off', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, true);

      expect(result).toContain('Device is powered off');
      expect(result).toContain('toggle-disabled');
    });

    it('should not show powered off warning when device is on', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, false);

      expect(result).not.toContain('Device is powered off');
    });

    it('should include toggle switch for device status', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, false);

      expect(result).toContain('deviceToggle');
      expect(result).toContain('Device Status');
    });

    it('should check toggle when device is active', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, false);

      expect(result).toContain('checked');
    });

    it('should not check toggle when device is inactive', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', false, false);

      expect(result).toContain('status-inactive');
      expect(result).toContain('Inactive');
    });

    it('should include simple programming section', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, false);

      expect(result).toContain('Simple Programming');
      expect(result).toContain('Add New Rule');
      expect(result).toContain('THEN');
      expect(result).toContain('IF');
    });

    it('should display existing rules', () => {
      const rules: IotRule[] = [
            { id: 'r1', condition: 'temperature > 30', action: 'ON', enabled: true },
            { id: 'r2', condition: 'humidity < 20', action: 'OFF', enabled: true },
          ];

      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, false, 'sensor', rules);

      expect(result).toContain('temperature &gt; 30 &rarr; ON');
      expect(result).toContain('humidity &lt; 20 &rarr; OFF');
    });

    it('should include sensor options in the rule form', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, false, 'sensor', [], 'temperature', [], 'input', []);

      expect(result).toContain('Temperature');
      expect(result).toContain('Light');
      expect(result).toContain('Humidity');
    });

    it('should include target device options for actuators', () => {
      const allDevices = [
        createIotDevice({ id: 'cooler-1', name: 'Cooler', iot: { sensorType: 'temperature', collaborationEnabled: true, kind: 'cooler', dataFlowDirection: 'output' } }),
        createIotDevice({ id: 'lamp-1', name: 'Lamp', iot: { sensorType: 'light', collaborationEnabled: true, kind: 'lamp', dataFlowDirection: 'output' } }),
      ];

      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, false, 'sensor', [], 'temperature', allDevices, 'input', allDevices);

      expect(result).toContain('Cooler');
      expect(result).toContain('Lamp');
    });

    it('should include "This Device" option in target select', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en');

      expect(result).toContain('This Device');
    });

    it('should show active status in device info', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, false);

      expect(result).toContain('Active');
      expect(result).toContain('status-active');
    });

    it('should show inactive status in device info', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', false, false);

      expect(result).toContain('Inactive');
      expect(result).toContain('status-inactive');
    });

    it('should sanitize device name to prevent XSS', () => {
      const result = generateIotDevicePageContent('sensor-1', '<script>alert("xss")</script>', 'en');

      expect(result).toContain('&lt;script&gt;alert');
      expect(result).not.toContain('>alert');
    });

    it('should embed deviceId in inline script', () => {
      const result = generateIotDevicePageContent('sensor-42', 'Test', 'en');

      expect(result).toContain('"sensor-42"');
    });

    it('should include back button', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en');

      expect(result).toContain('Back to List');
      expect(result).toContain('goBack()');
    });

    it('should include JavaScript functions for rules management', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en');

      expect(result).toContain('function addRule()');
      expect(result).toContain('function deleteRule(');
      expect(result).toContain('function updateRuleList()');
      expect(result).toContain('function saveRules()');
    });

    it('should include JavaScript functions for device management', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en');

      expect(result).toContain('function toggleDevice()');
      expect(result).toContain('function goBack()');
    });

    it('should include inline rules data in script', () => {
      const rules = [
        { id: 'r1', condition: 'temperature > 30', action: 'cooler-1:ON', enabled: true },
      ];

      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, false, 'sensor', rules);

      expect(result).toContain('cooler-1:ON');
    });

    it('should handle empty allDevices gracefully', () => {
      const result = generateIotDevicePageContent('sensor-1', 'Test', 'en', true, false, 'sensor', [], 'temperature', [], 'input', []);

      expect(result).toContain('This Device');
    });
  });
});
