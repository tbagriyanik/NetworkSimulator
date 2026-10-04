'use client';

import React, { useState, useEffect, useRef } from 'react';

import { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { getDeviceWidth, getDeviceHeight, isControllableIotDevice } from '../NetworkTopology/utils/networkTopology.helpers';
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
import { subscribeFocusDevice } from './focusDeviceEvent';

/**
 * Element-wise comparison of one device's cable list.
 *
 * `deviceToConnectionsMap` is rebuilt whenever any connection changes, which
 * hands every device a brand-new array; comparing the arrays element-wise keeps
 * a device's re-render scoped to its own links instead of the whole topology.
 */
function sameConnectionList(
  a: CanvasConnection[] | undefined,
  b: CanvasConnection[] | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

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
  /**
   * Ticks ~4x/second while a live sensor exists, because a measured reading is
   * sampled during render. Only devices that actually show such a reading opt
   * into repainting on it.
   */
  iotUpdateTrigger?: number;
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

/**
 * True for a device whose label shows a live sensor sample.
 *
 * The sample is read while rendering, so it can only change when something
 * forces a repaint. Controlled devices (lamp/heater/cooler) show their
 * open/close state instead, which already follows the device object.
 */
export function hasLiveSensorReading(device: CanvasDevice): boolean {
  return (
    device.type === 'iot' &&
    device.status !== 'offline' &&
    device.iot?.collaborationEnabled !== false &&
    !isControllableIotDevice(device)
  );
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
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Re-focusing the same device restarts the pulse, so drop the pending timer
    // instead of letting an older one cut the new pulse short.
    return () => {
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // A single shared listener serves every device instead of one per device.
    return subscribeFocusDevice(device.id, () => {
      setIsFocusedPulse(true);
      pulseTimerRef.current = setTimeout(() => setIsFocusedPulse(false), 2200);
    });
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
      aria-label={`${device.name || device.type} (${device.type})`}
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

      <DeviceBody device={device} deviceWidth={deviceWidth} deviceHeight={deviceHeight} isDark={isDark} />

      <DeviceWifiStatus
        device={device}
        topologyDevices={topologyDevices}
        deviceStates={deviceStates}
        deviceConnections={deviceConnections}
        isDark={isDark}
        deviceWidth={deviceWidth}
        isPoweredOff={isPoweredOff}
        language={language === 'tr' ? 'tr' : 'en'}
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
  // `device` and the per-device connection list are updated with structural
  // sharing, so identity is the precise signal: a new object means this device
  // (or one of its links) actually changed. Comparing only the Map identity
  // that holds both used to repaint every device on the canvas whenever any
  // single device's runtime state moved.
  if (prev.device !== next.device) return false;
  if (!sameConnectionList(
    prev.deviceToConnectionsMap?.get(prev.device.id),
    next.deviceToConnectionsMap?.get(next.device.id),
  )) return false;

  // A live sensor reading is sampled during render, so it needs the refresh
  // tick to reach this device — and only this device.
  if (
    prev.iotUpdateTrigger !== next.iotUpdateTrigger &&
    hasLiveSensorReading(prev.device)
  ) {
    return false;
  }

  const isWifiClientDevice =
    prev.device.type === 'pc' ||
    prev.device.type === 'iot' ||
    prev.device.type === 'mobile' ||
    prev.device.type === 'printer' ||
    Boolean(prev.device.wifi) ||
    Boolean(prev.device.ports?.some(p => p.id === 'wlan0'));

  if (isWifiClientDevice) {
    // A wifi client draws its signal bars against every candidate AP, so the
    // whole device list and state map are genuine inputs for it.
    if (prev.topologyDevices !== next.topologyDevices || prev.deviceStates !== next.deviceStates) return false;
  } else if (prev.deviceStates !== next.deviceStates) {
    // Everything else only reads its own slice (STP badge, port state, wireless
    // coverage), which keeps structural sharing intact for it.
    if (prev.deviceStates?.get(prev.device.id) !== next.deviceStates?.get(next.device.id)) return false;
  }

  return prev.isDragging === next.isDragging &&
    prev.isSelected === next.isSelected &&
    prev.isDark === next.isDark &&
    prev.language === next.language &&
    prev.t === next.t &&
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
    prev._mousePosRef === next._mousePosRef;
});
