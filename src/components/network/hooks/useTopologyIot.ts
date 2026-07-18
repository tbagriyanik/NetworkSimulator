'use client';

import React, { useCallback } from 'react';
import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { getDeviceWidth, getDeviceHeight } from '../networkTopology.helpers';

interface UseTopologyIotProps {
  connections: CanvasConnection[];
  deviceStates: Map<string, unknown> | null | undefined;
  deviceMap: Map<string, CanvasDevice>;
  language: string;
  environment: unknown;
  mousePosRef: React.MutableRefObject<{ x: number; y: number }>;
  t: unknown;
}

export function useTopologyIot({
  connections,
  deviceStates,
  deviceMap,
  language,
  environment,
  mousePosRef,
  t,
}: UseTopologyIotProps) {

  const getLivePort = useCallback((deviceId: string, portId: string): unknown => {
    const deviceState = deviceStates?.get(deviceId) as { ports?: Record<string, unknown> } | undefined;
    if (deviceState?.ports?.[portId]) {
      return deviceState.ports[portId];
    }
    const device = deviceMap.get(deviceId);
    return device?.ports.find(p => p.id === portId);
  }, [deviceStates, deviceMap]);

  const hasPortMode = useCallback((port: unknown): port is { mode: 'access' | 'trunk' | 'routed'; accessVlan?: unknown; vlan?: unknown } => {
    return !!port && typeof port === 'object' && 'mode' in port;
  }, []);

  const getLiveDeviceVlan = useCallback((device: CanvasDevice) => {
    if (device.type !== 'pc') return null;
    if (typeof device.vlan === 'number' && device.vlan > 0) {
      return device.vlan;
    }

    const connectedPort = connections.find(conn => conn.sourceDeviceId === device.id || conn.targetDeviceId === device.id);
    if (!connectedPort) return 1;

    const otherDeviceId = connectedPort.sourceDeviceId === device.id ? connectedPort.targetDeviceId : connectedPort.sourceDeviceId;
    const otherPortId = connectedPort.sourceDeviceId === device.id ? connectedPort.targetPort : connectedPort.sourcePort;
    const otherPort = getLivePort(otherDeviceId, otherPortId);

    if (!otherPort) return 1;
    if (hasPortMode(otherPort) && otherPort.mode === 'trunk') return 'Trunk';
    const portData = otherPort as Record<string, unknown>;
    return Number(portData.accessVlan || portData.vlan || 1);
  }, [connections, getLivePort, hasPortMode]);

  const getIotDeviceStatus = useCallback((device: CanvasDevice) => {
    return device.iot?.collaborationEnabled === false
      ? (language === 'tr' ? 'Pasif' : 'Inactive')
      : (language === 'tr' ? 'Aktif' : 'Active');
  }, [language]);

  const getIotPowerStatus = useCallback((device: CanvasDevice) => {
    return device.status === 'offline'
      ? (language === 'tr' ? 'Kapalı' : 'Off')
      : (language === 'tr' ? 'Açık' : 'On');
  }, [language]);

  const getIotOpenCloseStatus = useCallback((device: CanvasDevice) => {
    const isOn = device.status !== 'offline' && device.iot?.collaborationEnabled !== false && (device.iot?.value ?? false);
    return language === 'tr' ? (isOn ? 'Açık' : 'Kapalı') : (isOn ? 'On' : 'Off');
  }, [language]);

  const getIotMeasuredValue = useCallback((device: CanvasDevice) => {
    const kind = device.iot?.kind;
    const sensorType = device.iot?.sensorType || 'temperature';
    const envData = (environment || {}) as Record<string, unknown>;
    const baseTemp = (envData.temperature as number) ?? 22;
    const baseHumidity = (envData.humidity as number) ?? 50;
    const baseLight = (envData.light as number) ?? 70;

    // Controllable devices use open/close state, not sensor measurements
    if (kind === 'lamp' || kind === 'heater' || kind === 'cooler') {
      return getIotOpenCloseStatus(device);
    }

    if (device.status === 'offline') {
      return language === 'tr' ? 'Kapalı' : 'Off';
    }

    const { passive, motionYes, motionNo } = t as Record<string, string>;

    if (device.iot?.collaborationEnabled === false) {
      return passive;
    }

    // Add small random fluctuation to simulate real sensor readings
    const tempFluctuation = (Math.random() - 0.5) * 2; // ±1°C
    const humidityFluctuation = (Math.random() - 0.5) * 4; // ±2%
    const lightFluctuation = (Math.random() - 0.5) * 10; // ±5%

    switch (sensorType) {
      case 'temperature':
        return `${(baseTemp + tempFluctuation).toFixed(1)} °C`;
      case 'humidity':
        return `${(baseHumidity + humidityFluctuation).toFixed(1)} %`;
      case 'light':
        return `${(baseLight + lightFluctuation).toFixed(0)} lx`;
      case 'sound':
        const sounddB = typeof device.iot?.value === 'number' ? device.iot.value : 0;
        return `${sounddB} dB`;
      case 'motion':
        const deviceWidth = getDeviceWidth(device.type);
        const deviceHeight = getDeviceHeight(device.type, device.ports?.length || 0);
        const dx = mousePosRef.current.x - device.x - (deviceWidth / 2);
        const dy = mousePosRef.current.y - device.y - (deviceHeight / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 75 ? motionYes : motionNo;
      default:
        return '-';
    }
  }, [language, environment, getIotOpenCloseStatus, t, mousePosRef]);

  const getLivePortVlanText = useCallback((deviceId: string, portId: string) => {
    const device = deviceMap.get(deviceId);
    const livePort = getLivePort(deviceId, portId);
    if (!device || !livePort) return '1';

    if (device.type === 'pc' || device.type === 'iot') {
      const conn = connections.find(c =>
        (c.sourceDeviceId === deviceId && c.sourcePort === portId) ||
        (c.targetDeviceId === deviceId && c.targetPort === portId)
      );
      if (!conn) return '1';

      const peerDeviceId = conn.sourceDeviceId === deviceId ? conn.targetDeviceId : conn.sourceDeviceId;
      const peerPortId = conn.sourceDeviceId === deviceId ? conn.targetPort : conn.sourcePort;
      const peerPort = getLivePort(peerDeviceId, peerPortId);
      if (!peerPort) return '1';
      if (hasPortMode(peerPort) && peerPort.mode === 'trunk') return 'Trunk';
      const peerData = peerPort as Record<string, unknown>;
      return String(peerData.accessVlan || peerData.vlan || 1);
    }

    if (hasPortMode(livePort) && livePort.mode === 'trunk') return 'Trunk';
    const liveData = livePort as Record<string, unknown>;
    return String(liveData.accessVlan || liveData.vlan || 1);
  }, [connections, getLivePort, deviceMap, hasPortMode]);

  return {
    getLivePort,
    hasPortMode,
    getLiveDeviceVlan,
    getIotDeviceStatus,
    getIotPowerStatus,
    getIotOpenCloseStatus,
    getIotMeasuredValue,
    getLivePortVlanText,
  };
}
