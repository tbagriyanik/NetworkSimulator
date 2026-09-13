'use client';

import { useRef, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  VIRTUAL_CANVAS_WIDTH_DESKTOP,
  VIRTUAL_CANVAS_HEIGHT_DESKTOP,
  VIRTUAL_CANVAS_WIDTH_MOBILE,
  VIRTUAL_CANVAS_HEIGHT_MOBILE,
} from '../networkTopology.constants';

export interface UseTopologyCanvasLifecycleProps {
  isMobile: boolean;
  activeDeviceId?: string | null;
  focusDeviceId?: string | null;
  deviceMap: Map<string, unknown>;
  setSelectedDeviceIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useTopologyCanvasLifecycle({
  isMobile,
  activeDeviceId,
  focusDeviceId,
  deviceMap,
  setSelectedDeviceIds,
}: UseTopologyCanvasLifecycleProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const updateCanvasRect = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRectRef.current = canvasRef.current.getBoundingClientRect();
  }, []);

  // Update canvas dimensions on resize and mount
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const updateDimensions = () => {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        setCanvasDimensions({ width, height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    updateCanvasRect();
    const handleUpdate = () => updateCanvasRect();
    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, { capture: true } as EventListenerOptions);
    };
  }, [updateCanvasRect]);

  // Sync internal selection with activeDeviceId
  useEffect(() => {
    if (activeDeviceId) {
      queueMicrotask(() => {
        setSelectedDeviceIds((prev) => {
          if (prev.includes(activeDeviceId)) return prev;
          return [activeDeviceId];
        });
      });
    }
  }, [activeDeviceId, setSelectedDeviceIds]);

  // Handle external focus device request
  useEffect(() => {
    if (focusDeviceId && deviceMap.get(focusDeviceId)) {
      queueMicrotask(() => {
        setSelectedDeviceIds([focusDeviceId]);
      });
    }
  }, [focusDeviceId, deviceMap, setSelectedDeviceIds]);

  const getCanvasDimensions = useCallback(() => {
    if (typeof window === 'undefined') {
      return { width: VIRTUAL_CANVAS_WIDTH_DESKTOP, height: VIRTUAL_CANVAS_HEIGHT_DESKTOP };
    }
    return isMobile
      ? { width: VIRTUAL_CANVAS_WIDTH_MOBILE, height: VIRTUAL_CANVAS_HEIGHT_MOBILE }
      : { width: VIRTUAL_CANVAS_WIDTH_DESKTOP, height: VIRTUAL_CANVAS_HEIGHT_DESKTOP };
  }, [isMobile]);

  return {
    canvasRef,
    canvasRectRef,
    canvasDimensions,
    setCanvasDimensions,
    updateCanvasRect,
    getCanvasDimensions,
  };
}
