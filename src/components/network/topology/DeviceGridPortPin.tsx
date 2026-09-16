'use client';

import { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { isSwitchDeviceType } from '../NetworkTopology/utils/networkTopology.helpers';
import { isPortConnectionHealthy, getPortFrameColor, isGigabitPort, getPortFillAndStroke, getGridPortDisplayNumber } from './deviceRenderer.helpers';
import type { DeviceGridPortLayoutEntry } from './deviceRenderer.helpers';

interface DeviceGridPortPinProps {
  entry: DeviceGridPortLayoutEntry;
  device: CanvasDevice;
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

export function DeviceGridPortPin({
  entry,
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
}: DeviceGridPortPinProps) {
  const { port, col, row, startX, startY, variant } = entry;
  const portX = startX + col * 14;
  const portY = startY + row * 14;
  const isConnected = port.status === 'connected';
  const isShutdown = Boolean(port.shutdown);
  const isDeviceOffline = device.status === 'offline';
  const portIdLower = port.id.toLowerCase();
  const isConsole = portIdLower === 'console';
  const isGigabit = isGigabitPort(port.id);
  const isFastEthernet = portIdLower.startsWith('fa');
  const isSerial = portIdLower.startsWith('s') && !portIdLower.startsWith('service');

  const displayNum = getGridPortDisplayNumber(device.type, port, portIdLower, isConsole, isSerial, variant === 'generic' ? 'char' : 'parsed');

  const deviceState = deviceStates?.get(device.id);
  const simulatorPort = deviceState?.ports?.[port.id];
  const isSTPBlocked = simulatorPort?.spanningTree?.state === 'blocking' || simulatorPort?.spanningTree?.role === 'alternate';
  const isStartPort = isDrawingConnection && connectionStart?.deviceId === device.id && connectionStart?.portId === port.id;
  const deviceVlan = device.vlan || simulatorPort?.accessVlan || simulatorPort?.vlan || 1;
  const isVlan1 = deviceVlan === 1;
  const isBlocked = isSTPBlocked && isVlan1;
  const isTargetPort = isTargetingThisDevice && !isConnected;
  const connectionHealthy = isPortConnectionHealthy(device, deviceConnections, port.id);
  const hasProblem = isShutdown || isDeviceOffline || isBlocked || (isConnected && !connectionHealthy);

  const { portFill, portStroke } = getPortFillAndStroke({
    isStartPort,
    isTargetPort,
    isShutdown,
    isDeviceOffline,
    isBlocked,
    isConnected,
    isConsole,
    isGigabit,
    isFastEthernet,
    isSerial,
    isDark,
  });

  const hasStpInfo = isSwitchDeviceType(device.type) && simulatorPort?.spanningTree;
  const stpRole = simulatorPort?.spanningTree?.role;
  const roleAbbr = stpRole === 'root' ? 'RP' : stpRole === 'alternate' ? 'AP' : stpRole === 'backup' ? 'BP' : '';

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
          r={10}
          className="animate-pulse"
          style={{ fill: 'var(--color-warning-500)', opacity: 0.3 }}
        />
      )}
      <circle
        r={7}
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
        r={6}
        fill={portFill}
        stroke={isBlocked || isTargetPort ? portStroke : getPortFrameColor(isDark, hasProblem, isConnected, connectionHealthy)}
        strokeWidth={isShutdown || isDeviceOffline || isConnected || isTargetPort ? 2 : 1}
        opacity={hasProblem && !isBlocked && !isTargetPort ? 0.45 : 1}
        style={{ pointerEvents: 'none' }}
      />
      <text y={1} style={{ fill: 'var(--color-background)', userSelect: 'none', pointerEvents: 'none' }} fontSize="6" textAnchor="middle" dominantBaseline="middle">
        {displayNum}
      </text>
      {hasStpInfo && roleAbbr && (
        <g transform={`translate(0, ${row === 0 ? -11 : 11})`}>
          <rect
            x="-7"
            y="-5"
            width="14"
            height="9"
            rx="2"
            fill={
              stpRole === 'root'
                ? 'var(--color-primary-500)'
                : stpRole === 'designated'
                  ? 'var(--color-success-500)'
                  : 'var(--color-warning-500)'
            }
            stroke={isDark ? 'var(--color-secondary-950)' : 'var(--color-secondary-50)'}
            strokeWidth="0.5"
          />
          <text
            y="-0.5"
            fill="white"
            fontSize="5"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {roleAbbr}
          </text>
        </g>
      )}
    </g>
  );
}
