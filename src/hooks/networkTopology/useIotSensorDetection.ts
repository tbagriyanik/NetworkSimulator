'use client';

import { useEffect, useRef } from 'react';
import { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { getDeviceWidth, getDeviceHeight } from '@/components/network/NetworkTopology/utils/networkTopology.helpers';

interface UseIotSensorDetectionProps {
  setDevices: React.Dispatch<React.SetStateAction<CanvasDevice[]>>;
  mousePosRef: React.MutableRefObject<{ x: number; y: number }>;
  devices?: CanvasDevice[];
}

export function useIotSensorDetection({
  setDevices,
  mousePosRef,
  devices,
}: UseIotSensorDetectionProps) {
  // Whether any device can actually react to the pointer. Without this guard
  // the 100ms loop walks the whole device array forever, even in topologies
  // that contain no motion/sound sensors at all.
  const hasActiveSensorRef = useRef(false);
  useEffect(() => {
    if (!devices) {
      hasActiveSensorRef.current = true;
      return;
    }
    hasActiveSensorRef.current = devices.some(
      (device) =>
        device.type === 'iot' &&
        device.status !== 'offline' &&
        device.iot?.collaborationEnabled !== false &&
        (device.iot?.sensorType === 'motion' || device.iot?.sensorType === 'sound')
    );
  }, [devices]);

  // Motion/Sound detection state update logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (!hasActiveSensorRef.current) return;
      if (document.hidden) return;

      setDevices((prev) => {
        let changed = false;
        const next = prev.map((device) => {
          if (
            device.type === 'iot' &&
            device.status !== 'offline' &&
            device.iot?.collaborationEnabled !== false &&
            (device.iot?.sensorType === 'motion' || device.iot?.sensorType === 'sound')
          ) {
            const dWidth = getDeviceWidth(device.type);
            const dHeight = getDeviceHeight(device.type, device.ports?.length || 0);
            const dx = mousePosRef.current.x - device.x - dWidth / 2;
            const dy = mousePosRef.current.y - device.y - dHeight / 2;
            const distance = Math.sqrt(dx * dx + dy * dy);

            let newValue: number | boolean = false;

            if (device.iot.sensorType === 'motion') {
              newValue = distance < 75;
            } else if (device.iot.sensorType === 'sound') {
              newValue = distance < 150 ? Math.round(120 * (1 - distance / 150)) : 0;
            }

            if (device.iot.value !== newValue) {
              changed = true;
              return { ...device, iot: { ...device.iot, value: newValue } };
            }
          }
          return device;
        });
        return changed ? next : prev;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [setDevices, mousePosRef]);
}


