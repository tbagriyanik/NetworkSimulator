'use client';

import { useEffect, useCallback } from 'react';
import type { CanvasDevice, CanvasNote } from '../networkTopology.types';

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3.0;
export const DEFAULT_ZOOM = 1.0;

interface CanvasZoomPanProps {
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
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

  // Sync zoom and pan state from props (parent controls) — no setTimeout to avoid 1-frame lag
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

  const handleZoomWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    // Use refs for fresh values (pan state may be stale during direct DOM pan writes)
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const zoomDelta = e.deltaY * -0.001; // Reverse direction and adjust sensitivity
    let newZoom = currentZoom + zoomDelta;

    // Clamp to min/max zoom
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

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

    // PERFORMANCE: Write transform directly to DOM for immediate visual feedback.
    // Defer React state sync until wheel activity stops (debounce) to avoid
    // React re-renders overwriting the DOM transform on every wheel tick.
    const g = svgContentGroupRef.current;
    if (g) {
      g.style.transform = `translate(${newPan.x}px, ${newPan.y}px) scale(${newZoom})`;
    }
    pendingPanRef.current = newPan;
    pendingZoomRef.current = newZoom;
    panRef.current = newPan;
    zoomRef.current = newZoom;

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

  // Reset view
  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    if (devices.length === 0 && notes.length === 0) {
      setPan({ x: 0, y: 0 });
      return;
    }

    const padding = 10;
    const minDeviceX = devices.length ? Math.min(...devices.map(d => d.x)) : Infinity;
    const minDeviceY = devices.length ? Math.min(...devices.map(d => d.y)) : Infinity;
    const minNoteX = notes.length ? Math.min(...notes.map(n => n.x)) : Infinity;
    const minNoteY = notes.length ? Math.min(...notes.map(n => n.y)) : Infinity;

    const minX = Math.min(minDeviceX, minNoteX);
    const minY = Math.min(minDeviceY, minNoteY);

    setPan({ x: padding - minX * DEFAULT_ZOOM, y: padding - minY * DEFAULT_ZOOM });
    window.scrollTo(0, 0);
  }, [devices, notes, setZoom, setPan]);

  return {
    handleZoomWheel,
    resetView
  };
}

