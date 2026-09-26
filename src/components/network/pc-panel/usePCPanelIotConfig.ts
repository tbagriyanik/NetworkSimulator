import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { toast } from '@/hooks/use-toast';

export type IotSensorType = 'temperature' | 'sound' | 'motion' | 'humidity' | 'light';
export type IotKind = 'cooler' | 'lamp' | 'heater' | 'sensor';

interface UsePCPanelIotConfigTexts {
  iotSaved?: string;
  iotSavedDescription?: string;
  [key: string]: string | undefined;
}

interface UsePCPanelIotConfigOptions {
  iotDevices: CanvasDevice[];
  language: 'tr' | 'en';
  t: UsePCPanelIotConfigTexts;
}

/**
 * IoT device selection + configuration state, extracted from PCPanel orchestrator.
 * Owns the selected-device form state and debounced auto-save to topology.
 */
export function usePCPanelIotConfig({ iotDevices, language, t }: UsePCPanelIotConfigOptions) {
  const [selectedIotDeviceId, setSelectedIotDeviceId] = useState<string>('');
  const selectedIotDevice = useMemo(
    () => iotDevices.find((d) => d.id === selectedIotDeviceId) || null,
    [iotDevices, selectedIotDeviceId]
  );

  const [iotSensorType, setIotSensorType] = useState<IotSensorType>('temperature');
  const [iotKind, setIotKind] = useState<IotKind>('sensor');
  const [iotCollaborationEnabled, setIotCollaborationEnabled] = useState(false);
  const [iotDataStore, setIotDataStore] = useState('');

  useEffect(() => {
    const handleSelectIotEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ deviceId: string }>;
      if (customEv.detail?.deviceId) {
        setSelectedIotDeviceId(customEv.detail.deviceId);
      }
    };
    window.addEventListener('pc-select-iot-device', handleSelectIotEvent);
    return () => window.removeEventListener('pc-select-iot-device', handleSelectIotEvent);
  }, []);

  useEffect(() => {
    if (!iotDevices.length) {
      setTimeout(() => setSelectedIotDeviceId(''), 0);
      return;
    }
    if (!selectedIotDeviceId || !iotDevices.some((d) => d.id === selectedIotDeviceId)) {
      setTimeout(() => setSelectedIotDeviceId(iotDevices[0].id), 0);
    }
  }, [iotDevices, selectedIotDeviceId]);

  useEffect(() => {
    if (!selectedIotDeviceId) return;
    const device = iotDevices.find((d) => d.id === selectedIotDeviceId);
    if (!device) return;
    // Defer state updates outside the effect to avoid cascading renders
    const timer = setTimeout(() => {
      setIotSensorType(device.iot?.sensorType || 'temperature');
      setIotKind(device.iot?.kind || 'sensor');
      setIotCollaborationEnabled(!!device.iot?.collaborationEnabled);
      setIotDataStore(device.iot?.dataStore || '');
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedIotDeviceId, iotDevices]);

  const saveIotConfig = useCallback((showToast: boolean = true) => {
    if (!selectedIotDeviceId) return;
    // Determine data flow direction based on kind
    const dataFlowDirection: 'input' | 'output' | 'input/output' =
      iotKind === 'sensor' ? 'input' :
        (iotKind === 'cooler' || iotKind === 'lamp' || iotKind === 'heater') ? 'output' : 'input';
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId: selectedIotDeviceId,
        config: {
          iot: {
            ...selectedIotDevice?.iot,
            sensorType: iotSensorType,
            kind: iotKind,
            dataFlowDirection,
            collaborationEnabled: iotCollaborationEnabled,
            dataStore: iotDataStore,
          }
        }
      }
    }));
    if (showToast) {
      toast({
        title: t.iotSaved,
        description: t.iotSavedDescription,
      });
    }
  }, [selectedIotDeviceId, selectedIotDevice, iotSensorType, iotKind, iotCollaborationEnabled, iotDataStore, language, t]);

  // Keep saveIotConfig in a ref to avoid circular dependency
  const saveIotConfigRef = useRef(saveIotConfig);
  useEffect(() => {
    saveIotConfigRef.current = saveIotConfig;
  }, [saveIotConfig]);

  // Auto-save IoT config on change (debounced) - uses ref to avoid circular dependency
  useEffect(() => {
    if (!selectedIotDeviceId) return;
    const handler = setTimeout(() => {
      saveIotConfigRef.current(false);
    }, 500);
    return () => clearTimeout(handler);
  }, [selectedIotDeviceId, iotSensorType, iotKind, iotCollaborationEnabled, iotDataStore]);

  return {
    selectedIotDeviceId,
    setSelectedIotDeviceId,
    selectedIotDevice,
    iotSensorType,
    setIotSensorType,
    iotKind,
    setIotKind,
    iotCollaborationEnabled,
    setIotCollaborationEnabled,
    iotDataStore,
    setIotDataStore,
  };
}

