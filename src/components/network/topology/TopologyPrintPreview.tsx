import React from 'react';
import { CanvasDevice, DeviceType } from '../networkTopology.types';

interface TopologyPrintPreviewProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  isDark: boolean;
  connections: { id: string; sourceDeviceId: string; targetDeviceId: string; cableType: string }[];
  devicesSortedForRender: CanvasDevice[];
  deviceMap: Map<string, CanvasDevice | undefined>;
  getDeviceWidth: (type: string) => number;
  getDeviceHeight: (type: string, portCount: number) => number;
  isSwitchDeviceType: (type: DeviceType) => boolean;
}

export const TopologyPrintPreview: React.FC<TopologyPrintPreviewProps> = ({
  canvasWidth,
  canvasHeight,
  zoom,
  isDark,
  connections,
  devicesSortedForRender,
  deviceMap,
  getDeviceWidth,
  getDeviceHeight,
  isSwitchDeviceType,
}) => {
  return (
    <div className={`hidden print:block print:w-full print:h-auto`}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="w-full h-auto bg-white"
        style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      >
        <g transform={`scale(${zoom}) translate(${0}, ${0})`}>
          {/* Print background grid */}
          <rect width={canvasWidth} height={canvasHeight} fill="url(#gridPattern)" />

          {/* Connections */}
          {connections.map(conn => {
            const sourceDev = deviceMap.get(conn.sourceDeviceId);
            const targetDev = deviceMap.get(conn.targetDeviceId);
            if (!sourceDev || !targetDev) return null;

            const isWireless = conn.cableType === 'wireless';
            if (isWireless) return null;

            const sourceWidth = getDeviceWidth(sourceDev.type);
            const sourceHeight = getDeviceHeight(sourceDev.type, 24);
            const targetWidth = getDeviceWidth(targetDev.type);
            const targetHeight = getDeviceHeight(targetDev.type, 24);

            const isSourceSwitch = isSwitchDeviceType(sourceDev.type);
            const isTargetSwitch = isSwitchDeviceType(targetDev.type);

            const sourceX = sourceDev.x + (isSourceSwitch ? sourceWidth / 2 : sourceWidth);
            const sourceY = sourceDev.y + (isSourceSwitch ? sourceHeight : sourceHeight / 2);
            const targetX = targetDev.x + (isTargetSwitch ? targetWidth / 2 : 0);
            const targetY = targetDev.y + (isTargetSwitch ? targetHeight : targetHeight / 2);

            return (
              <line
                key={conn.id}
                x1={sourceX}
                y1={sourceY}
                x2={targetX}
                y2={targetY}
                stroke={isDark ? "white" : "black"}
                strokeWidth={2}
                opacity={0.8}
              />
            );
          })}

          {/* Devices */}
          {devicesSortedForRender.map(device => {
            const width = getDeviceWidth(device.type);
            const height = getDeviceHeight(device.type, device.ports?.length || 24);

            return (
              <g key={device.id} transform={`translate(${device.x}, ${device.y})`}>
                <rect width={width} height={height} fill="none" stroke={isDark ? "white" : "black"} strokeWidth={1} />
                <text
                  x={width / 2}
                  y={height + 15}
                  textAnchor="middle"
                  fill={isDark ? "white" : "black"}
                  fontSize={12}
                  fontFamily="monospace"
                >
                  {device.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
