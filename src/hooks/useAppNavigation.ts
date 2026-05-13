'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { CanvasDevice, DeviceType } from '@/components/network/networkTopology.types';

type TabType = 'topology' | 'cmd' | 'terminal' | 'tasks';

interface UseAppNavigationOptions {
  setActiveTab: (tab: TabType) => void;
  setActiveDeviceId: (id: string) => void;
  setActiveDeviceType: (type: DeviceType) => void;
  setSelectedDevice: (device: DeviceType | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  topologyDevices: CanvasDevice[];
  getOrCreatePCOutputs: (deviceId: string, devices: CanvasDevice[]) => void;
  getOrCreateDeviceState: (deviceId: string, type: DeviceType, name?: string, mac?: string, model?: string) => any;
  getOrCreateDeviceOutputs: (deviceId: string, state: any) => any[];
}

export function useAppNavigation(options: UseAppNavigationOptions) {
  const {
    setActiveTab, setActiveDeviceId, setActiveDeviceType, setSelectedDevice,
    setZoom, setPan, topologyDevices,
    getOrCreatePCOutputs, getOrCreateDeviceState, getOrCreateDeviceOutputs,
  } = options;

  const navigationHistoryRef = useRef<{ tab: TabType; deviceId?: string; program?: string }[]>([{ tab: 'topology' }]);
  const currentNavIndexRef = useRef(0);
  const isInternalNavRef = useRef(false);
  const activeTabRef = useRef<TabType>('topology');
  const pendingFocusDeviceRef = useRef<string | null>(null);
  const topologyContainerRef = useRef<HTMLDivElement | null>(null);

  // Track bridge observer for navigation cleanup
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isInternalNavRef.current) {
        isInternalNavRef.current = false;
        return;
      }

      if (currentNavIndexRef.current > 0) {
        const prevState = navigationHistoryRef.current[currentNavIndexRef.current - 1];
        if (prevState) {
          isInternalNavRef.current = true;
          if (prevState.tab) setActiveTab(prevState.tab);
          if (prevState.deviceId) setActiveDeviceId(prevState.deviceId);
          currentNavIndexRef.current--;
        }
      } else {
        setActiveTab('topology');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveTab, setActiveDeviceId]);

  const setActiveTabWithHistory = useCallback((tab: TabType) => {
    if (isInternalNavRef.current) {
      isInternalNavRef.current = false;
      setActiveTab(tab);
      return;
    }

    const newState = { tab, deviceId: undefined, program: undefined };
    const currentIndex = currentNavIndexRef.current;

    if (currentIndex < navigationHistoryRef.current.length - 1) {
      navigationHistoryRef.current = navigationHistoryRef.current.slice(0, currentIndex + 1);
    }

    const lastState = navigationHistoryRef.current[navigationHistoryRef.current.length - 1];
    if (lastState && lastState.tab === tab) {
      setActiveTab(tab);
      return;
    }

    navigationHistoryRef.current.push(newState);
    currentNavIndexRef.current = navigationHistoryRef.current.length - 1;
    window.history.pushState({ tab }, '');
    setActiveTab(tab);
  }, [setActiveTab]);

  const setDeviceTabWithHistory = useCallback((tab: TabType, deviceId: string, deviceType: DeviceType) => {
    if (deviceType === 'pc' && tab === 'cmd') {
      getOrCreatePCOutputs(deviceId, topologyDevices);
    }

    if (isInternalNavRef.current) {
      isInternalNavRef.current = false;
      setActiveDeviceId(deviceId);
      setActiveDeviceType(deviceType);
      setActiveTab(tab);
      return;
    }

    const newState = { tab, deviceId, program: undefined };
    const currentIndex = currentNavIndexRef.current;

    if (currentIndex < navigationHistoryRef.current.length - 1) {
      navigationHistoryRef.current = navigationHistoryRef.current.slice(0, currentIndex + 1);
    }

    navigationHistoryRef.current.push(newState);
    currentNavIndexRef.current = navigationHistoryRef.current.length - 1;
    window.history.pushState({ tab, deviceId }, '');

    setActiveDeviceId(deviceId);
    setActiveDeviceType(deviceType);
    setActiveTab(tab);
  }, [setActiveTab, setActiveDeviceId, setActiveDeviceType, getOrCreatePCOutputs, topologyDevices]);

  const handlePCPanelNavigate = useCallback((program: string, activeDeviceId: string) => {
    if (program === 'home') {
      if (isInternalNavRef.current) {
        isInternalNavRef.current = false;
        return;
      }
      window.history.pushState({ tab: 'topology', deviceId: activeDeviceId }, '');
    } else if (program === 'terminal' || program === 'desktop') {
      if (isInternalNavRef.current) {
        isInternalNavRef.current = false;
        return;
      }
      window.history.pushState({ tab: 'cmd', deviceId: activeDeviceId, program }, '');
    }
  }, []);

  const focusDeviceInTopology = useCallback((deviceId?: string, targetZoom?: number, deviceData?: CanvasDevice) => {
    if (!deviceId && !deviceData) return;
    requestAnimationFrame(() => {
      const rect = topologyContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const targetDevice = deviceData ?? topologyDevices.find((device) => device.id === deviceId);
      if (!targetDevice) return;

      const currentZoom = targetZoom ?? 1;

      const deviceWidth = (targetDevice.type === 'pc' || targetDevice.type === 'iot') ? 90 : targetDevice.type === 'router' ? 90 : 130;
      const portsPerRow = 8;
      const numRows = Math.ceil(targetDevice.ports.length / portsPerRow);
      const deviceHeight = (targetDevice.type === 'pc' || targetDevice.type === 'iot') ? 99 : 80 + numRows * 14 + 5;
      const deviceCenter = {
        x: targetDevice.x + deviceWidth / 2,
        y: targetDevice.y + deviceHeight / 2
      };

      const isNearOrigin = deviceCenter.x < 100 && deviceCenter.y < 100;
      if (isNearOrigin) {
        setPan({ x: 20, y: 20 });
      } else {
        setPan({
          x: rect.width / 2 - deviceCenter.x * currentZoom,
          y: rect.height / 2 - deviceCenter.y * currentZoom,
        });
      }
    });
  }, [topologyDevices, setPan]);

  const applyDeviceSelection = useCallback((device: DeviceType, deviceId?: string, switchModel?: string, deviceName?: string) => {
    if (!deviceId) return;

    if (device !== 'pc') {
      const deviceObj = topologyDevices?.find(d => d.id === deviceId);
      const modelToUse = switchModel || deviceObj?.switchModel;
      const initialHostname = deviceObj?.name || deviceName;
      getOrCreateDeviceState(deviceId, device, initialHostname, deviceObj?.macAddress, modelToUse);
      getOrCreateDeviceOutputs(deviceId, getOrCreateDeviceState(deviceId, device, initialHostname, deviceObj?.macAddress, modelToUse));
    }

    queueMicrotask(() => {
      setSelectedDevice(device);
      setActiveDeviceId(deviceId);
      setActiveDeviceType(device);
      setActiveTabWithHistory('topology');
    });
  }, [topologyDevices, getOrCreateDeviceState, getOrCreateDeviceOutputs, setSelectedDevice, setActiveDeviceId, setActiveDeviceType, setActiveTabWithHistory]);

  const handleDeviceSelectFromCanvas = useCallback((device: DeviceType, deviceId?: string, switchModel?: string, deviceName?: string, isNew?: boolean, deviceData?: CanvasDevice) => {
    applyDeviceSelection(device, deviceId, switchModel, deviceName);

    if (isNew && deviceId) {
      setZoom(1.0);
      focusDeviceInTopology(deviceId, 1.0, deviceData);
      pendingFocusDeviceRef.current = null;
    }
  }, [applyDeviceSelection, focusDeviceInTopology, setZoom]);

  const handleDeviceSelectFromMenu = useCallback((device: DeviceType, deviceId?: string, switchModel?: string, deviceName?: string) => {
    applyDeviceSelection(device, deviceId, switchModel, deviceName);
    if (!deviceId) return;

    setZoom(1.0);
    focusDeviceInTopology(deviceId, 1.0);
    pendingFocusDeviceRef.current = null;
  }, [applyDeviceSelection, focusDeviceInTopology, setZoom]);

  const switchTabOrTopology = useCallback((tabId: TabType, activeDeviceId: string, activeDeviceType: DeviceType) => {
    const deviceObj = topologyDevices?.find(d => d.id === activeDeviceId);

    if (tabId === 'cmd') {
      if (deviceObj && deviceObj.type === 'pc') {
        getOrCreatePCOutputs(activeDeviceId, topologyDevices);
      }
      return;
    }

    if (tabId === 'terminal') {
      if (deviceObj && (deviceObj.type === 'router' || deviceObj.type === 'switchL2' || deviceObj.type === 'switchL3')) {
        const deviceState = getOrCreateDeviceState(activeDeviceId, deviceObj.type, deviceObj.name, deviceObj.macAddress, deviceObj.switchModel);
        getOrCreateDeviceOutputs(activeDeviceId, deviceState);
      }
      return;
    }

    const deviceVisible = activeDeviceId && topologyDevices.some(d => d.id === activeDeviceId);
    setActiveTab(tabId === 'topology' || (deviceVisible) ? tabId : 'topology');
  }, [topologyDevices, setActiveTab, getOrCreatePCOutputs, getOrCreateDeviceState, getOrCreateDeviceOutputs]);

  return {
    setActiveTabWithHistory,
    setDeviceTabWithHistory,
    handlePCPanelNavigate,
    switchTabOrTopology,
    applyDeviceSelection,
    handleDeviceSelectFromCanvas,
    handleDeviceSelectFromMenu,
    focusDeviceInTopology,
    navigationHistoryRef,
    currentNavIndexRef,
    isInternalNavRef,
    activeTabRef,
    pendingFocusDeviceRef,
    topologyContainerRef,
  };
}
