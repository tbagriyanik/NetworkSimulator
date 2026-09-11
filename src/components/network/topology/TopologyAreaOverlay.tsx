'use client';

import { useMemo } from 'react';
import type { CanvasDevice } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { computeAreaZones, type OverlayMode } from '@/lib/network/areaOverlayEngine';

interface TopologyAreaOverlayProps {
  devices: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
  overlayMode: OverlayMode;
  zoom: number;
  isDark?: boolean;
}

export function TopologyAreaOverlay({
  devices,
  deviceStates,
  overlayMode,
  zoom,
  isDark = true,
}: TopologyAreaOverlayProps) {
  const zones = useMemo(() => {
    return computeAreaZones(devices, deviceStates, overlayMode);
  }, [devices, deviceStates, overlayMode]);

  if (overlayMode === 'none' || zones.length === 0) return null;

  return (
    <g className="topology-area-overlay pointer-events-none transition-all duration-300">
      <defs>
        {zones.map((zone) => (
          <filter key={`glow-${zone.id}`} id={`glow-${zone.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        ))}
      </defs>

      {/* Render Area Polygons */}
      {zones.map((zone) => (
        <g key={`zone-group-${zone.id}`} className="transition-opacity duration-300">
          {/* Ambient Glow */}
          <path
            d={zone.pathData}
            fill={zone.color}
            fillOpacity={isDark ? 0.12 : 0.08}
            filter={`url(#glow-${zone.id})`}
          />

          {/* Core Shape Fill and Dashed Boundary */}
          <path
            d={zone.pathData}
            fill={zone.color}
            fillOpacity={isDark ? 0.15 : 0.10}
            stroke={zone.color}
            strokeWidth={2 / zoom}
            strokeDasharray={`${6 / zoom} ${4 / zoom}`}
            strokeOpacity={0.8}
            className="transition-all"
          />

          {/* Area Zone Badge / Label */}
          {(() => {
            const labelText = zone.badgeLabel.length > 20 ? `${zone.badgeLabel.slice(0, 19)}…` : zone.badgeLabel;
            const approxCharWidth = 6.5;
            const pillWidth = Math.max(90, (labelText.length * approxCharWidth) + 36);
            const halfWidth = pillWidth / 2;
            const dotX = -halfWidth + 14;
            const textX = -halfWidth + 24;

            return (
              <g transform={`translate(${zone.center.x}, ${zone.center.y})`} className="select-none">
                {/* Pill Background */}
                <rect
                  x={-halfWidth / zoom}
                  y={-12 / zoom}
                  width={pillWidth / zoom}
                  height={24 / zoom}
                  rx={12 / zoom}
                  fill={isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.90)'}
                  stroke={zone.color}
                  strokeWidth={1.5 / zoom}
                  strokeOpacity={0.9}
                />

                {/* Color Dot */}
                <circle
                  cx={dotX / zoom}
                  cy={0}
                  r={3.5 / zoom}
                  fill={zone.color}
                />

                {/* Badge Text */}
                <text
                  x={textX / zoom}
                  y={3.5 / zoom}
                  fontSize={10 / zoom}
                  fontWeight="bold"
                  fontFamily="var(--font-geist-mono), monospace"
                  fill={isDark ? '#f8fafc' : '#0f172a'}
                  textAnchor="start"
                >
                  {labelText}
                </text>
              </g>
            );
          })()}
        </g>
      ))}
    </g>
  );
}
