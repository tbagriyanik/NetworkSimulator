'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Map,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Scan,
  Filter,
} from 'lucide-react';
import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { useUiPreferences } from '@/hooks/useUiPreferences';
import { getSubnetPrefix } from '@/lib/network/areaOverlayEngine';

interface MinimapNavigatorProps {
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  zoom: number;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setZoom?: React.Dispatch<React.SetStateAction<number>>;
  zoomToFit?: () => void;
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
  setZoom,
  zoomToFit,
  canvasRef,
  isDark,
  language,
  isOpen: externalIsOpen,
  onToggle,
}: MinimapNavigatorProps) {
  const isTR = language === 'tr';
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSubnet, setSelectedSubnet] = useState<string>('all');
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

  // Detected subnets list for rapid focus
  const detectedSubnets = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => {
      if (d.ip && d.ip.includes('.')) {
        const prefix = getSubnetPrefix(d.ip, d.subnet);
        if (prefix !== 'Unknown') {
          set.add(prefix);
        }
      }
    });
    return Array.from(set);
  }, [devices]);

  const MAP_WIDTH = isExpanded ? 300 : 210;
  const MAP_HEIGHT = isExpanded ? 190 : 135;

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
    [bounds.minX, bounds.minY, scale, setPan, viewHeight, viewWidth, zoom, MAP_WIDTH, MAP_HEIGHT]
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

  /**
   * Smoothly focus & zoom into a selected subnet's devices
   */
  const handleFocusSubnet = (subnet: string) => {
    setSelectedSubnet(subnet);
    if (subnet === 'all') {
      if (zoomToFit) zoomToFit();
      return;
    }

    const subnetDevices = devices.filter(
      (d) => d.ip && getSubnetPrefix(d.ip, d.subnet) === subnet
    );

    if (subnetDevices.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    subnetDevices.forEach((d) => {
      const cx = d.x + DEVICE_CENTER_X;
      const cy = d.y + DEVICE_CENTER_Y;
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);
    });

    const pad = 100;
    const subWidth = Math.max(300, maxX - minX + pad * 2);
    const subHeight = Math.max(200, maxY - minY + pad * 2);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const targetZoom = Math.min(1.5, Math.max(0.6, Math.min(viewWidth / subWidth, viewHeight / subHeight)));

    if (setZoom) {
      setZoom(targetZoom);
    }
    setPan({
      x: viewWidth / 2 - centerX * targetZoom,
      y: viewHeight / 2 - centerY * targetZoom,
    });
  };

  const { preferences } = useUiPreferences();

  return (
    <div
      className={`fixed ${preferences.showFooter ? 'bottom-[110px]' : 'bottom-[70px]'} right-[10px] z-40 transition-all duration-200 select-none ${
        isDark ? 'text-white' : 'text-slate-900'
      }`}
    >
      {/* Minimap Card Header */}
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-t-xl border shadow-md backdrop-blur-md transition-colors ${
          isOpen ? 'rounded-b-none' : 'rounded-b-xl cursor-pointer'
        } ${
          isDark
            ? 'bg-secondary-800/90 border-secondary-700/60'
            : 'bg-white/95 border-secondary-200/80'
        }`}
      >
        <div onClick={toggleOpen} className="flex items-center gap-1.5 cursor-pointer">
          <Map className="w-3.5 h-3.5 text-primary-500" />
          <span className="text-[11px] font-bold">
            {isTR ? 'Mini Harita' : 'Mini-map'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">({devices.length})</span>
        </div>

        <div className="flex items-center gap-1">
          {isOpen && (
            <>
              {/* Fit to Screen Quick Button */}
              {zoomToFit && (
                <button
                  onClick={zoomToFit}
                  title={isTR ? 'Tüm Topolojiyi Ekrana Sığdır' : 'Fit Topology to Screen'}
                  className="p-1 rounded hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
                >
                  <Scan className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Expand/Collapse Map Size Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? (isTR ? 'Küçült' : 'Shrink') : (isTR ? 'Genişlet' : 'Expand')}
                className="p-1 rounded hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}

          <button onClick={toggleOpen} className="p-0.5 rounded hover:bg-slate-700/40">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronUp className="w-3.5 h-3.5 opacity-60" />}
          </button>
        </div>
      </div>

      {/* Minimap Body & Subnet Selector */}
      {isOpen && (
        <div className="flex flex-col shadow-2xl rounded-b-xl border border-t-0 border-secondary-700/70 overflow-hidden backdrop-blur-md">
          {/* Subnet Focus Quick Filter Bar */}
          {detectedSubnets.length > 0 && (
            <div className={`px-2 py-1 flex items-center gap-1 text-[10px] border-b ${
              isDark ? 'bg-secondary-900/95 border-secondary-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <Filter className="w-3 h-3 text-primary-400 shrink-0" />
              <select
                value={selectedSubnet}
                onChange={(e) => handleFocusSubnet(e.target.value)}
                className={`w-full bg-transparent border-0 text-[10px] font-mono outline-none cursor-pointer py-0.5 ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                <option value="all" className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                  {isTR ? '🔍 Alt Ağ Odakla (Tümü)' : '🔍 Focus Subnet (All)'}
                </option>
                {detectedSubnets.map((sub) => (
                  <option key={sub} value={sub} className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                    Subnet: {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Canvas Map Viewport */}
          <div
            ref={minimapRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ width: MAP_WIDTH, height: MAP_HEIGHT, touchAction: 'none' }}
            className={`relative overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
              isDark ? 'bg-secondary-955/90' : 'bg-slate-900/90'
            } ${isDragging ? 'ring-2 ring-amber-400/50' : ''}`}
          >
            {/* Render Connection Lines */}
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

            {/* Render Device Nodes */}
            {devices.map((d) => {
              const cx = mapX(d.x + DEVICE_CENTER_X);
              const cy = mapY(d.y + DEVICE_CENTER_Y);
              const isMatch = selectedSubnet === 'all' || (d.ip && getSubnetPrefix(d.ip, d.subnet) === selectedSubnet);

              return (
                <div
                  key={d.id}
                  style={{
                    left: `${cx}px`,
                    top: `${cy}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute rounded-full border shadow-sm pointer-events-none transition-all ${
                    isMatch ? 'w-2.5 h-2.5 border-white/70' : 'w-1.5 h-1.5 opacity-30 border-white/20'
                  } ${
                    d.type === 'router'
                      ? 'bg-purple-500'
                      : d.type.startsWith('switch')
                      ? 'bg-emerald-400'
                      : d.type === 'firewall'
                      ? 'bg-rose-500'
                      : 'bg-sky-400'
                  }`}
                  title={`${d.name} (${d.ip || 'No IP'})`}
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
        </div>
      )}
    </div>
  );
}
