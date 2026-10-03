'use client';

import { useRef, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  VIRTUAL_CANVAS_WIDTH_DESKTOP,
  VIRTUAL_CANVAS_HEIGHT_DESKTOP,
  VIRTUAL_CANVAS_WIDTH_MOBILE,
  VIRTUAL_CANVAS_HEIGHT_MOBILE,
} from '@/components/network/NetworkTopology/utils/networkTopology.constants';

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

    // A window resize or a page scroll is not the only thing that moves the
    // canvas. Opening/closing a side panel, the minimap, a device window or a
    // modal all shift it without a `resize`, and moving a window between
    // displays changes `devicePixelRatio`. `canvasRectRef` is read on every pan
    // frame, by the in-progress cable endpoint and by hover hit-testing, so a
    // stale rect offsets all three while the device drag — which re-measures —
    // stays correct. A ResizeObserver catches layout shifts the window events
    // never see.
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current) {
      observer = new ResizeObserver(() => updateCanvasRect());
      observer.observe(canvasRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, { capture: true } as EventListenerOptions);
      observer?.disconnect();
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


