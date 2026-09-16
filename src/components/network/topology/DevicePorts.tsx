'use client';

import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { isPcLikeDeviceType } from './deviceRenderer.helpers';
import { DevicePcPorts } from './DevicePcPorts';
import { DeviceNetworkPorts } from './DeviceNetworkPorts';

interface DevicePortsProps {
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

export function DevicePorts(props: DevicePortsProps) {
  const { device } = props;

  if (isPcLikeDeviceType(device.type)) {
    return <DevicePcPorts {...props} />;
  }

  return <DeviceNetworkPorts {...props} />;
}