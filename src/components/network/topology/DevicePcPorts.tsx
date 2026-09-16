'use client';

import { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { STATUS_COLORS, PORT_COLORS } from '../NetworkTopology/utils/networkTopology.constants';
import { isPortConnectionHealthy, getPortFrameColor } from './deviceRenderer.helpers';

interface DevicePcPortsProps {
  device: CanvasDevice;
  deviceWidth: number;
  deviceHeight: number;
  isDark: boolean;
  isDraggingInteractionDisabled: boolean;
  isDrawingConnection: boolean;
  connectionStart: { deviceId: string; portId: string } | null;
  isTargetingThisDevice: boolean;
  deviceConnections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
  handlePortHover: (e: React.MouseEvent<SVGGElement>, deviceId: string, portId: string) => void;
  handlePortMouseLeave: () => void;
  handlePortClick: (e: React.MouseEvent, deviceId: string, portId: string) => void;
}

export function DevicePcPorts({
  device,
  deviceWidth,
  deviceHeight,
  isDark,
  isDraggingInteractionDisabled,
  isDrawingConnection,
  connectionStart,
  isTargetingThisDevice,
  deviceConnections,
  handlePortHover,
  handlePortMouseLeave,
  handlePortClick,
}: DevicePcPortsProps) {
  const visiblePorts = device.ports.filter(p => p.id !== 'wlan0');
  const visiblePortCount = visiblePorts.length;
  const portSpacing = 18;
  const portX = deviceWidth - 8;
  const startY = deviceHeight / 2 - ((visiblePortCount - 1) * portSpacing) / 2;

  return (
    <>
      {visiblePorts.map((port, idx) => {
        const portY = startY + idx * portSpacing;
        const isConnected = port.status === 'connected';
        const isShutdown = port.shutdown;
        const isDeviceOffline = device.status === 'offline';
        const isStartPort = isDrawingConnection && connectionStart?.deviceId === device.id && connectionStart?.portId === port.id;
        const isTargetPort = isTargetingThisDevice && !isConnected;
        const hasProblem = isShutdown || isDeviceOffline || (isConnected && !isPortConnectionHealthy(device, deviceConnections, port.id));

        const isConsolePort = port.id.toLowerCase().startsWith('com') || port.id.toLowerCase() === 'console';
        const portLabel = isConsolePort ? 'C' : 'E';

        const portColor = isStartPort ? 'var(--color-success-500)' :
          isTargetPort ? 'var(--color-warning-500)' :
            (isShutdown || isDeviceOffline) ? STATUS_COLORS.offline :
              isConsolePort
                ? (isConnected ? PORT_COLORS.console.connected : PORT_COLORS.console.disconnected)
                : device.type === 'iot'
                  ? PORT_COLORS.ethernet.connected
                  : (isConnected ? PORT_COLORS.ethernet.connected : PORT_COLORS.ethernet.disconnected);

        return (
          <g
            key={port.id}
            transform={`translate(${portX}, ${portY})`}
            style={{ cursor: isDraggingInteractionDisabled ? 'default' : 'pointer', pointerEvents: isDraggingInteractionDisabled ? 'none' : 'all' }}
            onMouseEnter={(e) => handlePortHover(e, device.id, port.id)}
            onMouseLeave={handlePortMouseLeave}
          >
            {isTargetPort && (
              <circle
                r={12}
                className="animate-pulse"
                style={{ fill: 'var(--color-warning-500)', opacity: 0.3 }}
              />
            )}
            <circle
              r={9}
              fill="transparent"
              style={{ pointerEvents: isDraggingInteractionDisabled ? 'none' : 'all', cursor: isDraggingInteractionDisabled ? 'default' : 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                handlePortClick(e, device.id, port.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            />
            <circle
              r={7}
              fill={portColor}
              stroke={isTargetPort ? 'var(--color-warning-400)' : getPortFrameColor(isDark, hasProblem, isConnected, isPortConnectionHealthy(device, deviceConnections, port.id))}
              strokeWidth={isShutdown || isDeviceOffline || isConnected || isTargetPort ? 2 : 1}
              opacity={hasProblem && !isTargetPort ? 0.45 : 1}
              style={{ pointerEvents: 'none' }}
            />
            <text y={1} fill="var(--color-background)" fontSize="7" fontWeight="700" textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {portLabel}
            </text>
          </g>
        );
      })}
    </>
  );
}
