import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Map, ChevronDown, ChevronUp } from 'lucide-react';
import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { useUiPreferences } from '@/hooks/useUiPreferences';

interface MinimapNavigatorProps {
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  zoom: number;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isDark: boolean;
  language: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

// Device icon width & height on topology canvas (centered target point offsets)
const DEVICE_CENTER_X = 40;
const DEVICE_CENTER_Y = 30;

export function MinimapNavigator({
  devices,
  connections,
  zoom,
  pan,
  setPan,
  canvasRef,
  isDark,
  language,
  isOpen: externalIsOpen,
  onToggle,
}: MinimapNavigatorProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const minimapRef = useRef<HTMLDivElement>(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const toggleOpen = onToggle || (() => setInternalIsOpen(!internalIsOpen));

  // Compute bounding box of all topology elements based on device centers
  const bounds = useMemo(() => {
    if (devices.length === 0) {
      return { minX: 0, maxX: 1000, minY: 0, maxY: 800, width: 1000, height: 800 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    devices.forEach((d) => {
      const cx = d.x + DEVICE_CENTER_X;
      const cy = d.y + DEVICE_CENTER_Y;
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);
    });

    const padding = 120;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(400, maxX - minX),
      height: Math.max(300, maxY - minY),
    };
  }, [devices]);

  const MAP_WIDTH = 200;
  const MAP_HEIGHT = 135;

  const scaleX = MAP_WIDTH / bounds.width;
  const scaleY = MAP_HEIGHT / bounds.height;
  const scale = Math.min(scaleX, scaleY);

  const viewWidth = canvasRef.current ? canvasRef.current.clientWidth : 800;
  const viewHeight = canvasRef.current ? canvasRef.current.clientHeight : 600;

  // Map world center coordinates to minimap coordinates
  const mapX = useCallback((x: number) => (x - bounds.minX) * scale, [bounds.minX, scale]);
  const mapY = useCallback((y: number) => (y - bounds.minY) * scale, [bounds.minY, scale]);

  // Visible viewport bounding box on topology:
  const visibleWorldMinX = -pan.x / zoom;
  const visibleWorldMinY = -pan.y / zoom;
  const visibleWorldWidth = viewWidth / zoom;
  const visibleWorldHeight = viewHeight / zoom;

  const viewportRect = {
    x: mapX(visibleWorldMinX),
    y: mapY(visibleWorldMinY),
    width: visibleWorldWidth * scale,
    height: visibleWorldHeight * scale,
  };

  const isDraggingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  const updatePanFromMinimap = useCallback(
    (clientX: number, clientY: number) => {
      if (!minimapRef.current) return;
      const rect = minimapRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(MAP_WIDTH, clientX - rect.left));
      const clickY = Math.max(0, Math.min(MAP_HEIGHT, clientY - rect.top));

      // Convert minimap click position to world coordinates
      const targetWorldX = bounds.minX + clickX / scale;
      const targetWorldY = bounds.minY + clickY / scale;

      // Center viewport on target world coordinates
      setPan({
        x: viewWidth / 2 - targetWorldX * zoom,
        y: viewHeight / 2 - targetWorldY * zoom,
      });
    },
    [bounds.minX, bounds.minY, scale, setPan, viewHeight, viewWidth, zoom]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);
    updatePanFromMinimap(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      updatePanFromMinimap(clientX, clientY);
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    isDraggingRef.current = false;
    setIsDragging(false);
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  const { preferences } = useUiPreferences();

  return (
    <div
      className={`fixed ${preferences.showFooter ? 'bottom-[110px]' : 'bottom-[70px]'} right-[10px] z-40 transition-all duration-200 select-none ${
        isDark ? 'text-white' : 'text-slate-900'
      }`}
    >
      {/* Minimap Card Header / Toggle Button */}
      <div
        onClick={toggleOpen}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-t-xl cursor-pointer border shadow-md backdrop-blur-md transition-colors ${
          isOpen ? 'rounded-b-none' : 'rounded-b-xl'
        } ${
          isDark
            ? 'bg-secondary-800/90 border-secondary-700/60 hover:bg-secondary-700/90'
            : 'bg-white/95 border-secondary-200/80 hover:bg-secondary-100/90'
        }`}
        title={language === 'tr' ? 'Mini Haritayı Aç/Kapat' : 'Toggle Mini-map Navigator'}
      >
        <div className="flex items-center gap-1.5">
          <Map className="w-3.5 h-3.5 text-primary-500" />
          <span className="text-[11px] font-bold">
            {language === 'tr' ? 'Mini Harita' : 'Mini-map'}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 opacity-60" />
        )}
      </div>

      {/* Minimap Body */}
      {isOpen && (
        <div
          ref={minimapRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: MAP_WIDTH, height: MAP_HEIGHT, touchAction: 'none' }}
          className={`relative border border-t-0 rounded-b-xl overflow-hidden cursor-grab active:cursor-grabbing shadow-2xl backdrop-blur-md transition-shadow ${
            isDark ? 'bg-secondary-955/85 border-secondary-700/70' : 'bg-slate-900/90 border-secondary-300'
          } ${isDragging ? 'ring-2 ring-amber-400/50' : ''}`}
        >
          {/* Render Connection Lines (Precise node-to-node centers) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map((conn) => {
              const srcDev = devices.find((d) => d.id === conn.sourceDeviceId);
              const tgtDev = devices.find((d) => d.id === conn.targetDeviceId);
              if (!srcDev || !tgtDev) return null;
              const x1 = mapX(srcDev.x + DEVICE_CENTER_X);
              const y1 = mapY(srcDev.y + DEVICE_CENTER_Y);
              const x2 = mapX(tgtDev.x + DEVICE_CENTER_X);
              const y2 = mapY(tgtDev.y + DEVICE_CENTER_Y);
              return (
                <line
                  key={conn.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={conn.active !== false ? 'rgba(56, 189, 248, 0.6)' : 'rgba(239, 68, 68, 0.5)'}
                  strokeWidth="1.5"
                  strokeDasharray={conn.cableType === 'wireless' ? '3 2' : undefined}
                />
              );
            })}
          </svg>

          {/* Render Device Nodes (Circles centered exactly at node coordinate) */}
          {devices.map((d) => {
            const cx = mapX(d.x + DEVICE_CENTER_X);
            const cy = mapY(d.y + DEVICE_CENTER_Y);
            return (
              <div
                key={d.id}
                style={{
                  left: `${cx}px`,
                  top: `${cy}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute w-2.5 h-2.5 rounded-full border border-white/60 shadow-sm pointer-events-none ${
                  d.type === 'router'
                    ? 'bg-purple-500'
                    : d.type.startsWith('switch')
                    ? 'bg-emerald-400'
                    : 'bg-sky-400'
                }`}
                title={d.name}
              />
            );
          })}

          {/* Render Active Viewport Rect */}
          <div
            style={{
              left: `${Math.max(0, Math.min(MAP_WIDTH - 16, viewportRect.x))}px`,
              top: `${Math.max(0, Math.min(MAP_HEIGHT - 16, viewportRect.y))}px`,
              width: `${Math.min(MAP_WIDTH, Math.max(16, viewportRect.width))}px`,
              height: `${Math.min(MAP_HEIGHT, Math.max(16, viewportRect.height))}px`,
            }}
            className={`absolute border-2 border-amber-400 bg-amber-400/20 rounded pointer-events-none shadow-[0_0_10px_rgba(251,191,36,0.6)] ${
              isDragging ? 'border-amber-300 bg-amber-400/35' : ''
            }`}
          />
        </div>
      )}
    </div>
  );
}
