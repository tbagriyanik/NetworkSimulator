'use client';

import React, { useState, useEffect } from 'react';

import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { getDeviceWidth, getDeviceHeight } from '../networkTopology.helpers';
import { DeviceIconSvg } from './DeviceIconSvg';
import { DeviceWifiStatus } from './DeviceWifiStatus';
import { DeviceFocusPulse } from './DeviceFocusPulse';
import { DeviceSelectionGlow } from './DeviceSelectionGlow';
import { DeviceIotEffects } from './DeviceIotEffects';
import { DeviceWirelessCoverage } from './DeviceWirelessCoverage';
import { DeviceBody } from './DeviceBody';
import { DeviceStpBadge } from './DeviceStpBadge';
import { DeviceLabels } from './DeviceLabels';
import { DevicePorts } from './DevicePorts';

export interface DeviceRendererProps {
  device: CanvasDevice;
  topologyDevices: CanvasDevice[];
  isDragging?: boolean;
  isSelected: boolean;
  isDark: boolean;
  language: string;
  t: Record<string, string>;
  deviceStates?: Map<string, SwitchState>;
  deviceToConnectionsMap: Map<string, CanvasConnection[]>;
  graphicsQuality: 'low' | 'medium' | 'high';
  isDraggingInteractionDisabled: boolean;
  getLiveDeviceVlan: (device: CanvasDevice) => number | string | null;
  getIotMeasuredValue: (device: CanvasDevice) => string;
  handlePortHover: (e: React.MouseEvent<SVGGElement>, deviceId: string, portId: string) => void;
  handlePortMouseLeave: () => void;
  handlePortClick: (e: React.MouseEvent, deviceId: string, portId: string) => void;
  handleDeviceMouseDown: (e: React.MouseEvent, deviceId: string) => void;
  handleDevicePointerDown: (e: React.PointerEvent<SVGGElement>, deviceId: string) => void;
  handleDeviceClick: (e: React.MouseEvent, device: CanvasDevice) => void;
  handleDeviceKeyDown: (e: React.KeyboardEvent<SVGGElement>, device: CanvasDevice) => void;
  handleDeviceDoubleClick: (device: CanvasDevice) => void;
  handleDeviceMouseLeave: () => void;
  handleDeviceTouchStart: (e: React.TouchEvent<SVGGElement>, deviceId: string) => void;
  handleDeviceTouchMove: (e: React.TouchEvent<SVGGElement>) => void;
  handleDeviceTouchEnd: (e: React.TouchEvent<SVGGElement>) => void;
  _mousePosRef: React.MutableRefObject<{ x: number; y: number }>;
  isDrawingConnection?: boolean;
  connectionStart?: { deviceId: string; portId: string } | null;
}

export const DeviceRenderer = React.memo(function DeviceRenderer({
  device,
  topologyDevices,
  isDragging = false,
  isSelected,
  isDark,
  language,
  t,
  deviceStates,
  deviceToConnectionsMap,
  graphicsQuality,
  isDraggingInteractionDisabled,
  getLiveDeviceVlan,
  getIotMeasuredValue,
  handlePortHover,
  handlePortMouseLeave,
  handlePortClick,
  handleDeviceMouseDown,
  handleDevicePointerDown,
  handleDeviceClick,
  handleDeviceKeyDown,
  handleDeviceDoubleClick,
  handleDeviceMouseLeave,
  handleDeviceTouchStart,
  handleDeviceTouchMove,
  handleDeviceTouchEnd,
  _mousePosRef,
  isDrawingConnection = false,
  connectionStart = null
}: DeviceRendererProps) {
  void _mousePosRef;
  const [isFocusedPulse, setIsFocusedPulse] = useState(false);

  useEffect(() => {
    const handleFocusDevice = (e: Event) => {
      const customEvent = e as CustomEvent<{ deviceId?: string }>;
      if (customEvent.detail?.deviceId !== device.id) return;
      setIsFocusedPulse(true);
      const timer = setTimeout(() => setIsFocusedPulse(false), 2200);
      return () => clearTimeout(timer);
    };
    window.addEventListener('focus-device', handleFocusDevice);
    return () => window.removeEventListener('focus-device', handleFocusDevice);
  }, [device.id]);

  const isTargetingThisDevice = (isDrawingConnection && connectionStart && connectionStart.deviceId !== device.id) ?? false;
  const isTR = language === 'tr';

  const deviceConnections = deviceToConnectionsMap.get(device.id) || [];
  const isPoweredOff = device.status === 'offline';

  const portCount = device.ports.length;
  const deviceHeight = getDeviceHeight(device.type, portCount);
  const deviceWidth = getDeviceWidth(device.type);

  return (
    <g
      key={device.id}
      transform={`translate(${device.x}, ${device.y})`}
      className={`topology-device-draggable ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isDragging ? 'opacity-40' : ''}`}
      data-device-id={device.id}
      role="button"
      tabIndex={0}
      style={{ transition: isDragging ? 'none' : 'transform 0.12s ease-out' }}
      onMouseDown={(e) => handleDeviceMouseDown(e, device.id)}
      onPointerDown={(e) => handleDevicePointerDown(e, device.id)}
      onClick={(e) => handleDeviceClick(e, device)}
      onKeyDown={(e) => handleDeviceKeyDown(e, device)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleDeviceDoubleClick(device);
      }}
      onMouseLeave={handleDeviceMouseLeave}
      onTouchStart={(e) => {
        if (typeof window !== 'undefined' && 'PointerEvent' in window) return;
        handleDeviceTouchStart(e, device.id);
      }}
      onTouchMove={(e) => {
        if (typeof window !== 'undefined' && 'PointerEvent' in window) return;
        handleDeviceTouchMove(e);
      }}
      onTouchEnd={(e) => {
        if (typeof window !== 'undefined' && 'PointerEvent' in window) return;
        handleDeviceTouchEnd(e);
      }}
    >
      <DeviceFocusPulse deviceWidth={deviceWidth} deviceHeight={deviceHeight} visible={isFocusedPulse} />

      {isSelected && (
        <DeviceSelectionGlow device={device} deviceWidth={deviceWidth} deviceHeight={deviceHeight} isDark={isDark} />
      )}

      <DeviceIotEffects
        device={device}
        deviceWidth={deviceWidth}
        deviceHeight={deviceHeight}
        isDark={isDark}
        isSelected={isSelected}
        graphicsQuality={graphicsQuality}
      />

      <DeviceWirelessCoverage
        device={device}
        deviceWidth={deviceWidth}
        deviceHeight={deviceHeight}
        isDark={isDark}
        deviceStates={deviceStates}
        isPoweredOff={isPoweredOff}
      />

      <DeviceBody device={device} deviceWidth={deviceWidth} deviceHeight={deviceHeight} isDark={isDark} isDragging={isDragging} />

      <DeviceWifiStatus
        device={device}
        topologyDevices={topologyDevices}
        deviceStates={deviceStates}
        deviceConnections={deviceConnections}
        isDark={isDark}
        deviceWidth={deviceWidth}
        isPoweredOff={isPoweredOff}
      />

      <g transform={`translate(${deviceWidth / 2 - 16}, 12)`}>
        <DeviceIconSvg
          type={device.type}
          isPoweredOff={isPoweredOff}
          isDark={isDark}
          activeVoipCall={device.activeVoipCall}
          deviceId={device.id}
          name={device.name}
          iotSensorType={device.iot?.sensorType}
          iotMeasuredValue={getIotMeasuredValue(device)}
          switchModel={device.switchModel}
        />
      </g>

      <DeviceStpBadge device={device} deviceWidth={deviceWidth} isDark={isDark} deviceStates={deviceStates} />

      <DeviceLabels
        device={device}
        deviceWidth={deviceWidth}
        isSelected={isSelected}
        isDark={isDark}
        isTR={isTR}
        t={t}
        getLiveDeviceVlan={getLiveDeviceVlan}
        getIotMeasuredValue={getIotMeasuredValue}
      />

      <DevicePorts
        device={device}
        deviceWidth={deviceWidth}
        deviceHeight={deviceHeight}
        isDark={isDark}
        deviceStates={deviceStates}
        deviceConnections={deviceConnections}
        isDraggingInteractionDisabled={isDraggingInteractionDisabled}
        isDrawingConnection={isDrawingConnection}
        connectionStart={connectionStart}
        isTargetingThisDevice={isTargetingThisDevice}
        handlePortHover={handlePortHover}
        handlePortMouseLeave={handlePortMouseLeave}
        handlePortClick={handlePortClick}
      />
    </g>
  );
}, (prev, next) => {
  const isWifiClientDevice =
    prev.device.type === 'pc' ||
    prev.device.type === 'iot' ||
    prev.device.type === 'mobile' ||
    prev.device.type === 'printer' ||
    Boolean(prev.device.wifi) ||
    Boolean(prev.device.ports?.some(p => p.id === 'wlan0'));

  const wifiContextChanged = isWifiClientDevice
    ? prev.topologyDevices !== next.topologyDevices || prev.deviceStates !== next.deviceStates
    : false;
  return prev.device === next.device &&
    prev.isDragging === next.isDragging &&
    prev.isSelected === next.isSelected &&
    prev.isDark === next.isDark &&
    prev.language === next.language &&
    prev.t === next.t &&
    prev.deviceStates === next.deviceStates &&
    prev.deviceToConnectionsMap === next.deviceToConnectionsMap &&
    prev.graphicsQuality === next.graphicsQuality &&
    prev.isDraggingInteractionDisabled === next.isDraggingInteractionDisabled &&
    prev.getLiveDeviceVlan === next.getLiveDeviceVlan &&
    prev.getIotMeasuredValue === next.getIotMeasuredValue &&
    prev.handlePortHover === next.handlePortHover &&
    prev.handlePortMouseLeave === next.handlePortMouseLeave &&
    prev.handlePortClick === next.handlePortClick &&
    prev.handleDeviceMouseDown === next.handleDeviceMouseDown &&
    prev.handleDevicePointerDown === next.handleDevicePointerDown &&
    prev.handleDeviceClick === next.handleDeviceClick &&
    prev.handleDeviceKeyDown === next.handleDeviceKeyDown &&
    prev.handleDeviceDoubleClick === next.handleDeviceDoubleClick &&
    prev.handleDeviceMouseLeave === next.handleDeviceMouseLeave &&
    prev.handleDeviceTouchStart === next.handleDeviceTouchStart &&
    prev.handleDeviceTouchMove === next.handleDeviceTouchMove &&
    prev.handleDeviceTouchEnd === next.handleDeviceTouchEnd &&
    prev.isDrawingConnection === next.isDrawingConnection &&
    prev.connectionStart === next.connectionStart &&
    prev._mousePosRef === next._mousePosRef &&
    !wifiContextChanged;
});