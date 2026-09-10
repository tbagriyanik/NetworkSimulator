'use client';

import { useMemo } from 'react';
import type { CanvasDevice } from '../networkTopology.types';
import { cn } from '@/lib/utils';

export interface TopologyMiniMapProps {
  devices: CanvasDevice[];
  zoom: number;
  pan: { x: number; y: number };
  containerWidth?: number;
  containerHeight?: number;
  className?: string;
}

export function TopologyMiniMap({
  devices,
  zoom,
  pan,
  containerWidth = 1000,
  containerHeight = 700,
  className,
}: TopologyMiniMapProps) {
  if (!devices || devices.length === 0) return null;

  // Calculate bounding box of all devices
  const bounds = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    devices.forEach((d) => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const padding = 150;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
      width: Math.max(400, maxX - minX + padding * 2),
      height: Math.max(300, maxY - minY + padding * 2),
    };
  }, [devices]);

  const mapWidth = 140;
  const mapHeight = 90;

  const scaleX = mapWidth / bounds.width;
  const scaleY = mapHeight / bounds.height;

  // Viewport bounds in topology coordinates
  const viewportMinX = -pan.x / zoom;
  const viewportMinY = -pan.y / zoom;
  const viewportW = containerWidth / zoom;
  const viewportH = containerHeight / zoom;

  const rectX = Math.max(0, (viewportMinX - bounds.minX) * scaleX);
  const rectY = Math.max(0, (viewportMinY - bounds.minY) * scaleY);
  const rectW = Math.min(mapWidth, viewportW * scaleX);
  const rectH = Math.min(mapHeight, viewportH * scaleY);

  return (
    <div className={cn('bg-background/80 backdrop-blur border border-border/60 rounded-lg p-1 shadow-md overflow-hidden select-none', className)}>
      <svg width={mapWidth} height={mapHeight} className="bg-muted/40 rounded">
        {/* Render Device Dots */}
        {devices.map((dev) => {
          const cx = (dev.x - bounds.minX) * scaleX;
          const cy = (dev.y - bounds.minY) * scaleY;
          return (
            <circle
              key={dev.id}
              cx={cx}
              cy={cy}
              r={3}
              className={cn(
                dev.type === 'pc' ? 'fill-blue-500' : dev.type === 'router' ? 'fill-emerald-500' : 'fill-purple-500'
              )}
            />
          );
        })}

        {/* Viewport Bounds Rectangle */}
        <rect
          x={rectX}
          y={rectY}
          width={rectW}
          height={rectH}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-primary/70 stroke-dasharray-2"
        />
      </svg>
    </div>
  );
}
