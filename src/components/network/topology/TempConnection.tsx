'use client';

import type { CableInfo, CableType } from '@/lib/network/types';

interface TempConnectionProps {
  isDrawingConnection: boolean;
  connectionStart: {
    deviceId: string;
    portId: string;
    point: { x: number; y: number };
  } | null;
  mousePos: { x: number; y: number };
  cableInfo: CableInfo;
  CABLE_COLORS: Record<CableType | 'error', { primary: string; bg: string; text: string; border: string }>;
}

export function TempConnection({
  isDrawingConnection,
  connectionStart,
  mousePos,
  cableInfo,
  CABLE_COLORS
}: TempConnectionProps) {
  if (!isDrawingConnection || !connectionStart) return null;

  const source = connectionStart.point;
  const mp = mousePos;
  const cableColor = CABLE_COLORS[cableInfo.cableType]?.primary || '#3b82f6';

  return (
    <>
      {/* Background overlay while drawing a cable */}
      <rect
        x={-10000}
        y={-10000}
        width={20000}
        height={20000}
        fill="rgba(0,0,0,0.1)"
        className="pointer-events-none"
      />

      {/* Connection line with gradient dashed style */}
      <line
        x1={source.x}
        y1={source.y}
        x2={mp.x}
        y2={mp.y}
        stroke={cableColor}
        strokeWidth={4}
        strokeDasharray="8,4"
        strokeLinecap="round"
        opacity="0.8"
        className="pointer-events-none"
      >
        <animate attributeName="stroke-dashoffset" from="12" to="0" dur="1s" repeatCount="indefinite" />
      </line>
      
      {/* Inner solid line */}
      <line
        x1={source.x}
        y1={source.y}
        x2={mp.x}
        y2={mp.y}
        stroke={cableColor}
        strokeWidth={2}
        opacity="1"
        className="pointer-events-none"
      />

      {/* Source port highlight glow */}
      <circle
        cx={source.x}
        cy={source.y}
        r={12}
        fill={cableColor}
        opacity="0.15"
        className="pointer-events-none animate-cable-source"
        style={{ transformOrigin: `${source.x}px ${source.y}px` }}
      />

      {/* End point circle pointer */}
      <circle
        cx={mp.x}
        cy={mp.y}
        r={8}
        fill={cableColor}
        opacity="0.4"
        className="pointer-events-none animate-cable-end"
        style={{ transformOrigin: `${mp.x}px ${mp.y}px` }}
      />

      {/* Cable type label indicator */}
      <g transform={`translate(${(source.x + mp.x) / 2}, ${(source.y + mp.y) / 2 - 20})`}>
        <rect
          x={-35}
          y={-12}
          width={70}
          height={24}
          rx={8}
          fill={cableColor}
          opacity="0.9"
          className="pointer-events-none"
        />
        <text
          x={0}
          y={4}
          fill="white"
          fontSize="11"
          fontWeight="bold"
          textAnchor="middle"
          className="select-none pointer-events-none"
        >
          {cableInfo.cableType === 'straight' ? 'Düz' : cableInfo.cableType === 'crossover' ? 'Çapraz' : 'Konsol'}
        </text>
      </g>
    </>
  );
}
