'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CanvasDevice, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;
const DEFAULT_ZOOM = 1.0;

interface CanvasZoomPanProps {
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  zoomProp?: number;
  onZoomChange?: (zoom: number) => void;
  panProp?: { x: number; y: number };
  onPanChange?: (pan: { x: number; y: number }) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  svgContentGroupRef: React.RefObject<SVGGElement | null>;
  devices: CanvasDevice[];
  notes: CanvasNote[];
  
  // Refs
  zoomRef: React.MutableRefObject<number>;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  pendingPanRef: React.MutableRefObject<{ x: number; y: number } | null>;
  pendingZoomRef: React.MutableRefObject<number | null>;
  wheelSyncTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  syncingZoomFromPropRef: React.MutableRefObject<boolean>;
  syncingPanFromPropRef: React.MutableRefObject<boolean>;
}

export function useCanvasZoomPan({
  zoom,
  setZoom,
  pan,
  setPan,
  zoomProp,
  onZoomChange,
  panProp,
  onPanChange,
  canvasRef,
  svgContentGroupRef,
  devices,
  notes,
  zoomRef,
  panRef,
  pendingPanRef,
  pendingZoomRef,
  wheelSyncTimerRef,
  syncingZoomFromPropRef,
  syncingPanFromPropRef
}: CanvasZoomPanProps) {

  // Sync zoom and pan state from props (parent controls) â€” no setTimeout to avoid 1-frame lag
  useEffect(() => {
    if (zoomProp !== undefined && zoomProp !== zoom) {
      syncingZoomFromPropRef.current = true;
      requestAnimationFrame(() => setZoom(zoomProp));
    }
  }, [zoomProp]);

  useEffect(() => {
    if (panProp !== undefined && (panProp.x !== pan.x || panProp.y !== pan.y)) {
      syncingPanFromPropRef.current = true;
      requestAnimationFrame(() => setPan(panProp));
    }
  }, [panProp]);

  // Sync zoom and pan state to props (notify parent of internal changes)
  useEffect(() => {
    if (syncingZoomFromPropRef.current) {
      syncingZoomFromPropRef.current = false;
      return;
    }
    if (onZoomChange && zoom !== zoomProp) {
      onZoomChange(zoom);
    }
  }, [zoom, onZoomChange]);

  useEffect(() => {
    if (syncingPanFromPropRef.current) {
      syncingPanFromPropRef.current = false;
      return;
    }
    if (onPanChange && (pan.x !== panProp?.x || pan.y !== panProp?.y)) {
      onPanChange(pan);
    }
  }, [pan, onPanChange]);

  // RAF throttling for wheel zoom: high-frequency trackpads emit many wheel
  // events per second, so batching the direct DOM writes to one per animation
  // frame keeps the zoom buttery smooth and prevents the compositor from
  // stuttering under load.
  const wheelRafRef = useRef<number | null>(null);

  // Cancel any pending wheel RAF on unmount.
  useEffect(() => {
    return () => {
      if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
    };
  }, []);

  const handleZoomWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;

    // Normalize wheel delta across browsers and hardware (deltaMode 0: pixels, 1: lines, 2: pages)
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 16;
    else if (e.deltaMode === 2) delta *= 800;

    // Limit maximum step jump per wheel event tick for extra smoothness
    delta = Math.max(-100, Math.min(100, delta));

    // Gentle exponential scaling factor: a smaller base produces finer, more
    // fluid zoom steps (~7-10% per notch instead of the old ~14-16%), and it
    // stays scale-independent for a consistent feel at any zoom level.
    const factor = Math.pow(0.999, delta);
    let newZoom = currentZoom * factor;

    // Clamp to min/max zoom
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    if (Math.abs(newZoom - currentZoom) < 0.0001) return;

    if (!canvasRef.current) {
      setZoom(newZoom);
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Keep the canvas point under the cursor fixed while zooming
    const canvasCursorX = (cursorX - currentPan.x) / currentZoom;
    const canvasCursorY = (cursorY - currentPan.y) / currentZoom;

    const newPan = {
      x: cursorX - canvasCursorX * newZoom,
      y: cursorY - canvasCursorY * newZoom
    };

    pendingPanRef.current = newPan;
    pendingZoomRef.current = newZoom;
    panRef.current = newPan;
    zoomRef.current = newZoom;

    // PERFORMANCE: Write transform directly to DOM for immediate visual feedback,
    // but batch the writes to one per animation frame so fast trackpad scrolling
    // doesn't overload the compositor and cause jank.
    if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
    wheelRafRef.current = requestAnimationFrame(() => {
      wheelRafRef.current = null;
      const g = svgContentGroupRef.current;
      if (!g) return;
      const finalPan = pendingPanRef.current ?? newPan;
      const finalZoom = pendingZoomRef.current ?? newZoom;
      g.style.transform = `translate3d(${finalPan.x}px, ${finalPan.y}px, 0px) scale(${finalZoom})`;
    });

    // Debounced state sync: commit to React state 80ms after last wheel tick
    if (wheelSyncTimerRef.current) clearTimeout(wheelSyncTimerRef.current);
    wheelSyncTimerRef.current = setTimeout(() => {
      const finalPan = pendingPanRef.current;
      const finalZoom = pendingZoomRef.current;
      if (finalPan) setPan(finalPan);
      if (finalZoom !== null) setZoom(finalZoom);
      pendingPanRef.current = null;
      pendingZoomRef.current = null;
      wheelSyncTimerRef.current = null;
    }, 80);
  }, []);  // Empty deps - uses only refs, stable for the lifetime of the component

  // Reset view to top-left corner starting directly under canvas header
  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
    window.scrollTo(0, 0);
  }, [setZoom, setPan]);

  const [isDraggingZoom, setIsDraggingZoom] = useState(false);
  const zoomDragRef = useRef({ isDragging: false, startX: 0, startZoom: 1 });

  const handleZoomMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startZoom = zoom;

    setIsDraggingZoom(true);
    zoomDragRef.current = { isDragging: true, startX, startZoom };

    let animationFrameId: number;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!zoomDragRef.current.isDragging) return;

      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        if (!zoomDragRef.current.isDragging) return;

        const deltaX = moveEvent.clientX - zoomDragRef.current.startX;
        const zoomDelta = deltaX * 0.002;
        let newZoom = zoomDragRef.current.startZoom + zoomDelta;
        newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

        if (!canvasRef.current) {
          setZoom(newZoom);
          return;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const cursorX = rect.width / 2;
        const cursorY = rect.height / 2;
        setPan(prevPan => ({
          x: cursorX - (cursorX - prevPan.x) * (newZoom / zoomRef.current),
          y: cursorY - (cursorY - prevPan.y) * (newZoom / zoomRef.current)
        }));
        setZoom(newZoom);
      });
    };

    const handleMouseUp = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      setIsDraggingZoom(false);
      zoomDragRef.current = { isDragging: false, startX: 0, startZoom: 0 };
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
  }, [zoom, setZoom, setPan, canvasRef, zoomRef]);

  // Zoom to Fit (TÃ¼mÃ¼nÃ¼ Ekrana SÄ±ÄŸdÄ±r)
  const zoomToFit = useCallback(() => {
    if (devices.length === 0 && notes.length === 0) {
      resetView();
      return;
    }

    const deviceWidth = 80;
    const deviceHeight = 60;

    const minDeviceX = devices.length ? Math.min(...devices.map(d => d.x)) : Infinity;
    const maxDeviceX = devices.length ? Math.max(...devices.map(d => d.x + deviceWidth)) : -Infinity;
    const minDeviceY = devices.length ? Math.min(...devices.map(d => d.y)) : Infinity;
    const maxDeviceY = devices.length ? Math.max(...devices.map(d => d.y + deviceHeight)) : -Infinity;

    const minNoteX = notes.length ? Math.min(...notes.map(n => n.x)) : Infinity;
    const maxNoteX = notes.length ? Math.max(...notes.map(n => n.x + n.width)) : -Infinity;
    const minNoteY = notes.length ? Math.min(...notes.map(n => n.y)) : Infinity;
    const maxNoteY = notes.length ? Math.max(...notes.map(n => n.y + n.height)) : -Infinity;

    const minX = Math.min(minDeviceX, minNoteX);
    const maxX = Math.max(maxDeviceX, maxNoteX);
    const minY = Math.min(minDeviceY, minNoteY);
    const maxY = Math.max(maxDeviceY, maxNoteY);

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;

    if (!canvasRef.current || boundsWidth <= 0 || boundsHeight <= 0) {
      resetView();
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const padding = 60;
    const availableWidth = Math.max(100, rect.width - padding * 2);
    const availableHeight = Math.max(100, rect.height - padding * 2);

    const targetZoomX = availableWidth / boundsWidth;
    const targetZoomY = availableHeight / boundsHeight;
    let targetZoom = Math.min(targetZoomX, targetZoomY);

    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const targetPanX = rect.width / 2 - centerX * targetZoom;
    const targetPanY = rect.height / 2 - centerY * targetZoom;

    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
  }, [devices, notes, setZoom, setPan, canvasRef, resetView]);

  return {
    handleZoomWheel,
    handleZoomMouseDown,
    isDraggingZoom,
    resetView,
    zoomToFit
  };
}


