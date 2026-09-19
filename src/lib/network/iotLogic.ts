
import { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { EnvironmentSettings } from '@/lib/store/appStore';
import type { CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

const getSensorReading = (sensor: string, environment: EnvironmentSettings): number => {
  switch (sensor) {
    case 'temperature':
      return environment.temperature;
    case 'humidity':
      return environment.humidity;
    case 'light':
      return environment.light;
    case 'sound':
      return 0;
    case 'motion':
      return 0; // Controlled by proximity in NetworkTopology
    default:
      return 0;
  }
};

const getRuleSensorReading = (
  sensorReference: string,
  devices: CanvasDevice[],
  environment: EnvironmentSettings,
  currentDeviceId?: string
): number => {
  if (!sensorReference.startsWith('iot:')) {
    if (currentDeviceId) {
      const currentDevice = devices.find(d => d.id === currentDeviceId);
      if (currentDevice?.type === 'iot' && currentDevice.iot?.sensorType === sensorReference) {
        if (sensorReference === 'motion') {
          return currentDevice.iot?.value ? 1 : 0;
        }
        if (sensorReference === 'sound') {
          return (currentDevice.iot?.value as number) ?? 0;
        }
      }
    }
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
  if (sensorDevice.iot && 'value' in sensorDevice.iot && sensorDevice.iot.value !== undefined && sensorDevice.iot.value !== null) {
    if (typeof sensorDevice.iot.value === 'boolean') {
      return sensorDevice.iot.value ? 1 : 0;
    }
    return Number(sensorDevice.iot.value) || 0;
  }
  if (sensorType === 'motion') {
    return sensorDevice.iot?.value ? 1 : 0;
  }
  if (sensorType === 'sound') {
    return (sensorDevice.iot?.value as number) ?? 0;
  }
  return getSensorReading(sensorType, environment);
};

export const processIotRules = (
  devices: CanvasDevice[],
  environment: EnvironmentSettings,
  updateDevice: (deviceId: string, updates: Partial<CanvasDevice>) => void,
  connections: CanvasConnection[] = []
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
        if (Number.isNaN(threshold)) return;

        const sensorValue = getRuleSensorReading(sensor, devices, environment, device.id);

        let conditionMet = false;
        switch (operator) {
          case '>': conditionMet = sensorValue > threshold; break;
          case '<': conditionMet = sensorValue < threshold; break;
          case '==': conditionMet = Math.abs(sensorValue - threshold) < 0.1; break;
        }

        if (conditionMet) {
          // Parse action: can be "ON", "OFF", or "deviceId:ON", "deviceId:OFF"
          const parts = action.split(':');
          const targetId = parts.length === 2 ? parts[0] : device.id;
          const finalAction = parts.length === 2 ? parts[1] : parts[0];

          // Find target device in the whole network
          const targetDevice = devices.find(d => d.id === targetId);
          if (!targetDevice || targetDevice.type !== 'iot' || !targetDevice.iot) return;

          if (targetDevice.status === 'offline' || targetDevice.iot.collaborationEnabled === false) {
            return;
          }

          const isCurrentlyPoweredOn = targetDevice.iot.value ?? false;

          if (finalAction === 'ON' && !isCurrentlyPoweredOn) {
            updateDevice(targetId, {
              iot: { ...targetDevice.iot, value: true }
            });
            deviceUpdated = true;
            dispatchIotMqttTraffic(device, targetDevice, connections, `MQTT PUBLISH topic=iot/${targetId}/command payload=ON QoS=1 clientId=${device.id}`);
          } else if (finalAction === 'OFF' && isCurrentlyPoweredOn) {
            updateDevice(targetId, {
              iot: { ...targetDevice.iot, value: false }
            });
            deviceUpdated = true;
            dispatchIotMqttTraffic(device, targetDevice, connections, `MQTT PUBLISH topic=iot/${targetId}/command payload=OFF QoS=1 clientId=${device.id}`);
          }
        }
      });
    }
  });
  
  // Return flag to trigger topology re-render if any device was updated
  return deviceUpdated;
};

function dispatchIotMqttTraffic(
  source: CanvasDevice,
  target: CanvasDevice,
  connections: CanvasConnection[],
  info: string
) {
  if (typeof window === 'undefined') return;
  const relatedConnections = connections.filter(connection =>
    connection.sourceDeviceId === source.id || connection.targetDeviceId === source.id ||
    connection.sourceDeviceId === target.id || connection.targetDeviceId === target.id
  );
  relatedConnections.forEach(connection => {
    window.dispatchEvent(new CustomEvent('packet-captured', {
      detail: {
        connectionId: connection.id,
        sourceIp: source.ip || source.id,
        targetIp: target.ip || target.id,
        protocol: 'MQTT',
        info,
      },
    }));
  });
}


