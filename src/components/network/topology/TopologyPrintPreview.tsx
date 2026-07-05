import React from 'react';
import { CanvasDevice, CanvasConnection, CanvasNote } from '../networkTopology.types';

export interface TopologyPrintPreviewProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  setPan: (pan: { x: number; y: number }) => void;
  isDark: boolean;
  t: Record<string, string>;
  connections: CanvasConnection[];
  devicesSortedForRender: CanvasDevice[];
  visibleNotes: CanvasNote[];
  deviceMap: Map<string, CanvasDevice>;
  getDeviceWidth: (type: string) => number;
  getDeviceHeight: (type: string, portCount: number) => number;
  isSwitchDeviceType: (type: string) => boolean;
  getNoteGradientFill: (color: string) => string;
}

export const TopologyPrintPreview: React.FC<TopologyPrintPreviewProps> = ({
  canvasWidth,
  canvasHeight,
  zoom,
  setPan,
  isDark,
  t,
  connections,
  devicesSortedForRender,
  visibleNotes,
  deviceMap,
  getDeviceWidth,
  getDeviceHeight,
  isSwitchDeviceType,
  getNoteGradientFill
}) => {
  return (
    <div className="hidden print:block print:w-full print:h-auto">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="print:w-full print:h-auto"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * canvasWidth;
          const y = ((e.clientY - rect.top) / rect.height) * canvasHeight;
          // Pan to clicked location (center)
          const newPanX = -(x - 400 / zoom) * zoom;
          const newPanY = -(y - 200 / zoom) * zoom;
          setPan({ x: newPanX, y: newPanY });
        }}
      >
        {/* Canvas background */}
        <defs>
          <radialGradient id="minimapCanvasBgGradient" cx="46%" cy="30%" r="88%">
            {isDark ? (
              <>
                <stop offset="0%" stopColor="#15243a" />
                <stop offset="25%" stopColor="#132035" />
                <stop offset="50%" stopColor="#101b2e" />
                <stop offset="75%" stopColor="#0e1829" />
                <stop offset="100%" stopColor="#0b1424" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#fbfdff" />
                <stop offset="25%" stopColor="#f6faff" />
                <stop offset="50%" stopColor="#f1f7ff" />
                <stop offset="75%" stopColor="#ecf3fb" />
                <stop offset="100%" stopColor="#e6eef8" />
              </>
            )}
          </radialGradient>
          <radialGradient id="minimapCanvasSoftGlow" cx="20%" cy="15%" r="75%">
            {isDark ? (
              <>
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
                <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#0b1220" stopOpacity="0" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.18" />
                <stop offset="45%" stopColor="#a5b4fc" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#f8fbff" stopOpacity="0" />
              </>
            )}
          </radialGradient>
        </defs>

        {/* Background */}
        <rect
          x="0"
          y="0"
          width={canvasWidth}
          height={canvasHeight}
          fill="url(#minimapCanvasBgGradient)"
        />
        <rect
          x="0"
          y="0"
          width={canvasWidth}
          height={canvasHeight}
          fill="url(#minimapCanvasSoftGlow)"
        />

        {/* Connections */}
        {connections.map((conn) => {
          const sourceDevice = deviceMap.get(conn.sourceDeviceId);
          const targetDevice = deviceMap.get(conn.targetDeviceId);
          if (!sourceDevice || !targetDevice) return null;

          const sourceX = sourceDevice.x + ((sourceDevice.type === 'pc' || sourceDevice.type === 'iot') ? 45 : 50);
          const sourceY = sourceDevice.y + ((sourceDevice.type === 'pc' || sourceDevice.type === 'iot') ? 45 : 60);
          const targetX = targetDevice.x + ((targetDevice.type === 'pc' || targetDevice.type === 'iot') ? 45 : 50);
          const targetY = targetDevice.y + ((targetDevice.type === 'pc' || targetDevice.type === 'iot') ? 45 : 60);

          return (
            <line
              key={conn.id}
              x1={sourceX}
              y1={sourceY}
              x2={targetX}
              y2={targetY}
              stroke={conn.cableType === 'straight' ? '#3b82f6' : conn.cableType === 'crossover' ? '#f97316' : '#06b6d4'}
              strokeWidth="2"
              opacity="0.7"
            />
          );
        })}

        {/* Devices */}
        {devicesSortedForRender.map((device) => {
          const deviceWidth = getDeviceWidth(device.type);
          const deviceHeight = getDeviceHeight(device.type, device.ports.length);
          const color = device.type === 'pc'
            ? '#3b82f6'
            : device.type === 'iot'
              ? '#f97316'
              : isSwitchDeviceType(device.type)
                ? (device.switchModel === 'WS-C3650-24PS' ? '#a855f7' : '#06b6d4')
                : '#a855f7';

          return (
            <g key={device.id}>
              {/* Device box */}
              <rect
                x={device.x}
                y={device.y}
                width={deviceWidth}
                height={deviceHeight}
                fill={color}
                opacity="0.1"
                stroke={color}
                strokeWidth="2"
                rx="4"
              />

              {/* Device label */}
              <text
                x={device.x + deviceWidth / 2}
                y={device.y + deviceHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fontWeight="bold"
                fill={color}
              >
                {device.name}
              </text>

              {/* IP address if exists */}
              {(() => {
                // Validate IP format
                const isValidIP = device.ip ? /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(device.ip) : false;
                const isValidSubnet = device.subnet ? /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(device.subnet) : false;
                const hasError = !isValidIP || !isValidSubnet;
                const displayText = device.ip || t.noIp;

                return (
                  <text
                    x={device.x + deviceWidth / 2}
                    y={device.y + deviceHeight / 2 + 16}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill={hasError ? '#ef4444' : '#666'}
                    fontWeight={hasError ? '700' : '400'}
                  >
                    {hasError ? '⚠ ' : ''}{displayText}
                  </text>
                );
              })()}
            </g>
          );
        })}

        {/* Notes */}
        {visibleNotes.map((note) => (
          <g key={note.id}>
            {/* Note background */}
            <rect
              x={note.x}
              y={note.y}
              width={note.width}
              height={note.height}
              fill={getNoteGradientFill(note.color)}
              opacity={note.opacity}
              stroke="#999"
              strokeWidth="1"
              rx="4"
            />

            {/* Note text */}
            <text
              x={note.x + 8}
              y={note.y + 20}
              fontSize={note.fontSize}
              fill="var(--color-secondary-800)"
              fontFamily={note.font}
              fontWeight={note.bold ? 'bold' : 'normal'}
              fontStyle={note.italic ? 'italic' : 'normal'}
              textDecoration={note.underline ? 'underline' : 'none'}
            >
              {note.text.split('\n').map((line, i) => (
                <tspan key={i} x={note.x + 8} dy={i === 0 ? 0 : note.fontSize + 2}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
