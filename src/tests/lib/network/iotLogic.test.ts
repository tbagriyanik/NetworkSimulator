import { describe, it, expect, vi } from 'vitest';
import { processIotRules } from '@/lib/network/iotLogic';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';

describe('iotLogic', () => {
  describe('processIotRules', () => {
    const createIotDevice = (overrides: Partial<CanvasDevice> = {}): CanvasDevice => ({
      id: 'sensor-1',
      type: 'iot',
      name: 'Temp Sensor',
      x: 100,
      y: 100,
      ip: '192.168.1.10',
      macAddress: '00:E0:F7:00:00:01',
      status: 'online',
      iot: {
        sensorType: 'temperature',
        collaborationEnabled: true,
        rules: [],
      },
      wifi: { enabled: true, ssid: '', security: 'open', password: '', channel: '2.4GHz', mode: 'client' },
      ports: [],
      ...overrides,
    });

    const defaultEnvironment = { background: 'none' as const, temperature: 30, humidity: 50, light: 200, sound: 0 };

    it('should turn target device ON when source sensor exceeds threshold', () => {
      const updateDevice = vi.fn();

      const devices: CanvasDevice[] = [
        createIotDevice({
          id: 'sensor-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, rules: [
            { id: 'rule-1', condition: 'temperature > 25', action: 'actuator-1:ON', enabled: true },
          ]},
        }),
        createIotDevice({
          id: 'actuator-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, value: false },
        }),
      ];

      const result = processIotRules(devices, defaultEnvironment, updateDevice);

      expect(result).toBe(true);
      expect(updateDevice).toHaveBeenCalledWith('actuator-1', {
        iot: expect.objectContaining({ value: true }),
      });
    });

    it('should turn device OFF when temperature drops below threshold', () => {
      const updateDevice = vi.fn();

      const devices: CanvasDevice[] = [
        createIotDevice({
          id: 'sensor-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, rules: [
            { id: 'rule-1', condition: 'temperature < 20', action: 'actuator-1:OFF', enabled: true },
          ]},
        }),
        createIotDevice({
          id: 'actuator-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, value: true },
        }),
      ];

      const coldEnvironment = { ...defaultEnvironment, temperature: 15 };
      const result = processIotRules(devices, coldEnvironment, updateDevice);

      expect(result).toBe(true);
      expect(updateDevice).toHaveBeenCalledWith('actuator-1', {
        iot: expect.objectContaining({ value: false }),
      });
    });

    it('should handle equality condition within tolerance', () => {
      const updateDevice = vi.fn();

      const devices: CanvasDevice[] = [
        createIotDevice({
          id: 'sensor-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, rules: [
            { id: 'rule-1', condition: 'humidity == 50', action: 'actuator-1:ON', enabled: true },
          ]},
        }),
        createIotDevice({
          id: 'actuator-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, value: false },
        }),
      ];

      const result = processIotRules(devices, defaultEnvironment, updateDevice);

      expect(result).toBe(true);
      expect(updateDevice).toHaveBeenCalled();
    });

    it('should not process rules for offline devices', () => {
      const updateDevice = vi.fn();

      const devices: CanvasDevice[] = [
        createIotDevice({
          id: 'sensor-1',
          status: 'offline',
          iot: { sensorType: 'temperature', collaborationEnabled: true, rules: [
            { id: 'rule-1', condition: 'temperature > 0', action: 'actuator-1:ON', enabled: true },
          ]},
        }),
      ];

      const result = processIotRules(devices, defaultEnvironment, updateDevice);

      expect(result).toBe(false);
      expect(updateDevice).not.toHaveBeenCalled();
    });

    it('should not process rules when collaboration is disabled', () => {
      const updateDevice = vi.fn();

      const devices: CanvasDevice[] = [
        createIotDevice({
          id: 'sensor-1',
          iot: { sensorType: 'temperature', collaborationEnabled: false, rules: [
            { id: 'rule-1', condition: 'temperature > 0', action: 'actuator-1:ON', enabled: true },
          ]},
        }),
      ];

      const result = processIotRules(devices, defaultEnvironment, updateDevice);

      expect(result).toBe(false);
      expect(updateDevice).not.toHaveBeenCalled();
    });

    it('should skip disabled rules', () => {
      const updateDevice = vi.fn();

      const devices: CanvasDevice[] = [
        createIotDevice({
          id: 'sensor-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, rules: [
            { id: 'rule-1', condition: 'temperature > 0', action: 'actuator-1:ON', enabled: false },
          ]},
        }),
      ];

      const result = processIotRules(devices, defaultEnvironment, updateDevice);

      expect(result).toBe(false);
      expect(updateDevice).not.toHaveBeenCalled();
    });

    it('should handle self-targeted rule', () => {
      const updateDevice = vi.fn();

      const devices: CanvasDevice[] = [
        createIotDevice({
          id: 'sensor-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, value: false, rules: [
            { id: 'rule-1', condition: 'temperature > 25', action: 'ON', enabled: true },
          ]},
        }),
      ];

      const result = processIotRules(devices, defaultEnvironment, updateDevice);

      expect(result).toBe(true);
      expect(updateDevice).toHaveBeenCalledWith('sensor-1', {
        iot: expect.objectContaining({ value: true }),
      });
    });

    it('should not update if device is already powered ON and action is ON', () => {
      const updateDevice = vi.fn();

      const devices: CanvasDevice[] = [
        createIotDevice({
          id: 'sensor-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, rules: [
            { id: 'rule-1', condition: 'temperature > 25', action: 'actuator-1:ON', enabled: true },
          ]},
        }),
        createIotDevice({
          id: 'actuator-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, value: true },
        }),
      ];

      const result = processIotRules(devices, defaultEnvironment, updateDevice);

      expect(result).toBe(false);
      expect(updateDevice).not.toHaveBeenCalled();
    });

    it('should handle iot: prefixed sensor references', () => {
      const updateDevice = vi.fn();

      const devices: CanvasDevice[] = [
        createIotDevice({
          id: 'external-sensor',
          iot: { sensorType: 'temperature', collaborationEnabled: true, value: 35 },
        }),
        createIotDevice({
          id: 'actuator-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, rules: [
            { id: 'rule-1', condition: 'iot:external-sensor:temperature > 30', action: 'ON', enabled: true },
          ], value: false },
        }),
      ];

      const result = processIotRules(devices, defaultEnvironment, updateDevice);

      expect(result).toBe(true);
      expect(updateDevice).toHaveBeenCalledWith('actuator-1', {
        iot: expect.objectContaining({ value: true }),
      });
    });

    it('should do nothing for unavailable remote sensor', () => {
      const updateDevice = vi.fn();

      const devices: CanvasDevice[] = [
        createIotDevice({
          id: 'actuator-1',
          iot: { sensorType: 'temperature', collaborationEnabled: true, rules: [
            { id: 'rule-1', condition: 'iot:nonexistent-sensor:temperature > 0', action: 'ON', enabled: true },
          ], value: false },
        }),
      ];

      const result = processIotRules(devices, defaultEnvironment, updateDevice);

      expect(result).toBe(false);
    });
  });
});


