'use client';

import { useState, useCallback } from 'react';
import type { DeviceType } from '@/components/network/networkTopology.types';

export function useDeviceSelection() {
  const [activeDeviceId, setActiveDeviceId] = useState<string>('switch-1');
  const [activeDeviceType, setActiveDeviceType] = useState<DeviceType>('switchL2');
  const [selectedDevice, setSelectedDevice] = useState<DeviceType | null>(null);
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState<number>(0);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [focusDeviceId, setFocusDeviceId] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedDevice(null);
    setClearSelectionTrigger(prev => prev + 1);
  }, []);

  return {
    activeDeviceId, setActiveDeviceId,
    activeDeviceType, setActiveDeviceType,
    selectedDevice, setSelectedDevice,
    clearSelectionTrigger, setClearSelectionTrigger,
    deviceSearchQuery, setDeviceSearchQuery,
    focusDeviceId, setFocusDeviceId,
    clearSelection,
  };
}
