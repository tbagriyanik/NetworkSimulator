'use client';

import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { getDevicePortLayout } from './deviceRenderer.helpers';
import { DeviceGridPortPin } from './DeviceGridPortPin';

interface DeviceNetworkPortsProps {
  device: CanvasDevice;
  deviceWidth: number;
  deviceHeight: number;
  isDark: boolean;
  deviceStates?: Map<string, SwitchState>;
  deviceConnections: CanvasConnection[];
  isDraggingInteractionDisabled: boolean;
  isDrawingConnection: boolean;
  connectionStart: { deviceId: string; portId: string } | null;
  isTargetingThisDevice: boolean;
  handlePortHover: (e: React.MouseEvent<SVGGElement>, deviceId: string, portId: string) => void;
  handlePortMouseLeave: () => void;
  handlePortClick: (e: React.MouseEvent, deviceId: string, portId: string) => void;
}

export function DeviceNetworkPorts({
  device,
  isDark,
  deviceStates,
  deviceConnections,
  isDraggingInteractionDisabled,
  isDrawingConnection,
  connectionStart,
  isTargetingThisDevice,
  handlePortHover,
  handlePortMouseLeave,
  handlePortClick,
}: DeviceNetworkPortsProps) {
  const entries = getDevicePortLayout(device);

  return (
    <>
      {entries.map((entry) => (
        <DeviceGridPortPin
          key={entry.port.id}
          entry={entry}
          device={device}
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
      ))}
    </>
  );
}