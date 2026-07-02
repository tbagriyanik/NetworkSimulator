'use client';

import React, { useState } from 'react';
import type { CanvasDevice } from '../networkTopology.types';

interface CanvasSelectionProps {
  devices: CanvasDevice[];
  setSelectedDeviceIds: (ids: string[]) => void;
  selectedDeviceIdsRef: React.MutableRefObject<string[]>;
  setIsSelecting: (selecting: boolean) => void;
  isSelectingRef: React.MutableRefObject<boolean>;
  selectionBoxRef: React.MutableRefObject<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>;
  setSelectionBox: (box: { start: { x: number; y: number }; current: { x: number; y: number } } | null) => void;
  setSelectAllMode: (val: boolean) => void;
  setContextMenu: (menu: unknown) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  zoomRef: React.MutableRefObject<number>;
}

export function useCanvasSelection({
  devices,
  setSelectedDeviceIds,
  selectedDeviceIdsRef,
  setIsSelecting,
  isSelectingRef,
  selectionBoxRef,
  setSelectionBox,
  setSelectAllMode,
  setContextMenu,
  canvasRef,
  panRef,
  zoomRef
}: CanvasSelectionProps) {
  const [localSelectionBox, setLocalSelectionBox] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);

  const selectAllDevices = () => {
    const allIds = devices.map(d => d.id);
    setSelectedDeviceIds(allIds);
    selectedDeviceIdsRef.current = allIds;
    setSelectAllMode(true);
    setContextMenu(null);
  };

  const startRectangleSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const startX = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
      const startY = (e.clientY - rect.top - panRef.current.y) / zoomRef.current;

      const box = { start: { x: startX, y: startY }, current: { x: startX, y: startY } };
      setSelectionBox(box);
      setLocalSelectionBox(box);
      selectionBoxRef.current = box;
      setIsSelecting(true);
      isSelectingRef.current = true;
    }

    setContextMenu(null);
    setSelectAllMode(false);
  };

  return {
    selectAllDevices,
    startRectangleSelection,
    localSelectionBox,
    setLocalSelectionBox
  };
}
