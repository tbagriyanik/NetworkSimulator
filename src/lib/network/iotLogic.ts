
import { CanvasDevice } from '@/components/network/networkTopology.types';
import { EnvironmentSettings } from '@/lib/store/appStore';

export const processIotRules = (
  devices: CanvasDevice[],
  environment: EnvironmentSettings,
  updateDevice: (deviceId: string, updates: Partial<CanvasDevice>) => void
) => {
  let deviceUpdated = false;
  
  devices.forEach(device => {
    if (device.type === 'iot' && device.iot?.rules && device.iot.rules.length > 0) {
      device.iot.rules.forEach(rule => {
        if (!rule.enabled) return;

        const { condition, action } = rule;
        const [sensor, operator, thresholdStr] = condition.split(' ');
        const threshold = parseFloat(thresholdStr);

        let sensorValue = 0;
        switch (sensor) {
          case 'temperature': sensorValue = environment.temperature; break;
          case 'humidity': sensorValue = environment.humidity; break;
          case 'light': sensorValue = environment.light; break;
          // sound and motion are randomized in display, so here we just use fixed or semi-random values
          case 'sound': sensorValue = 40 + Math.random() * 10; break;
          case 'motion': sensorValue = Math.random() > 0.5 ? 1 : 0; break;
        }

        let conditionMet = false;
        switch (operator) {
          case '>': conditionMet = sensorValue > threshold; break;
          case '<': conditionMet = sensorValue < threshold; break;
          case '==': conditionMet = Math.abs(sensorValue - threshold) < 0.1; break;
        }

        if (conditionMet) {
          // Parse action: can be "ON", "OFF", or "deviceId:ON", "deviceId:OFF"
          const [targetId, targetAction] = action.includes(':')
            ? action.split(':')
            : [device.id, action];
          const finalAction = targetAction || action;

          // Find target device
          const targetDevice = devices.find(d => d.id === targetId);
          if (!targetDevice || targetDevice.type !== 'iot') return;

          const isCurrentlyActive = targetDevice.iot?.collaborationEnabled;
          if (finalAction === 'ON' && !isCurrentlyActive) {
            updateDevice(targetId, {
              iot: { ...targetDevice.iot!, collaborationEnabled: true }
            });
            deviceUpdated = true; // Mark that a device was updated
          } else if (finalAction === 'OFF' && isCurrentlyActive) {
            updateDevice(targetId, {
              iot: { ...targetDevice.iot!, collaborationEnabled: false }
            });
            deviceUpdated = true; // Mark that a device was updated
          }
        }
      });
    }
  });
  
  // Return flag to trigger topology re-render if any device was updated
  return deviceUpdated;
};
