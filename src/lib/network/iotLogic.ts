
import { CanvasDevice } from '@/components/network/networkTopology.types';
import { EnvironmentSettings } from '@/lib/store/appStore';

const getSensorReading = (sensor: string, environment: EnvironmentSettings): number => {
  switch (sensor) {
    case 'temperature':
      return environment.temperature;
    case 'humidity':
      return environment.humidity;
    case 'light':
      return environment.light;
    case 'sound':
      return 40 + Math.random() * 10;
    case 'motion':
      return Math.random() > 0.5 ? 1 : 0;
    default:
      return 0;
  }
};

const getRuleSensorReading = (
  sensorReference: string,
  devices: CanvasDevice[],
  environment: EnvironmentSettings
): number => {
  if (!sensorReference.startsWith('iot:')) {
    return getSensorReading(sensorReference, environment);
  }

  const [, sensorDeviceId, fallbackSensorType] = sensorReference.split(':');
  const sensorDevice = devices.find(d => d.id === sensorDeviceId);

  if (!sensorDevice || sensorDevice.type !== 'iot') {
    return 0;
  }

  if (sensorDevice.status === 'offline' || sensorDevice.iot?.collaborationEnabled === false) {
    return 0;
  }

  const sensorType = sensorDevice.iot?.sensorType || fallbackSensorType;
  return getSensorReading(sensorType, environment);
};

export const processIotRules = (
  devices: CanvasDevice[],
  environment: EnvironmentSettings,
  updateDevice: (deviceId: string, updates: Partial<CanvasDevice>) => void
) => {
  let deviceUpdated = false;
  
  devices.forEach(device => {
    if (device.type !== 'iot') return;
    if (device.status === 'offline' || device.iot?.collaborationEnabled === false) return;

    if (device.type === 'iot' && device.iot?.rules && device.iot.rules.length > 0) {
      device.iot.rules.forEach(rule => {
        if (rule.enabled === false) return;

        const { condition, action } = rule;
        const [sensor, operator, thresholdStr] = condition.split(' ');
        const threshold = parseFloat(thresholdStr);

        const sensorValue = getRuleSensorReading(sensor, devices, environment);

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

          if (targetDevice.status === 'offline' || targetDevice.iot?.collaborationEnabled === false) {
            return;
          }

          const isCurrentlyPoweredOn = targetDevice.iot?.value ?? false;

          if (finalAction === 'ON' && !isCurrentlyPoweredOn) {
            updateDevice(targetId, {
              iot: { ...targetDevice.iot!, value: true }
            });
            deviceUpdated = true; // Mark that a device was updated
          } else if (finalAction === 'OFF' && isCurrentlyPoweredOn) {
            updateDevice(targetId, {
              iot: { ...targetDevice.iot!, value: false }
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
