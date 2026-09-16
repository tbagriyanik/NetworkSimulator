'use client';

import { useState } from 'react';
interface DeviceDragProps {
  saveToHistory: () => void;
  draggedDeviceRef: React.MutableRefObject<string | null>;
  dragStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  isActuallyDraggingRef: React.MutableRefObject<boolean>;
  dragStartDevicePositionsRef: React.MutableRefObject<{ [key: string]: { x: number; y: number } }>;
}

export function useDeviceDrag({
  saveToHistory,
  draggedDeviceRef,
  dragStartPosRef,
  isActuallyDraggingRef,
  dragStartDevicePositionsRef
}: DeviceDragProps) {
  const [draggedDevice, setDraggedDevice] = useState<string | null>(null);
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);

  const startDeviceDrag = (
    e: React.MouseEvent,
    deviceId: string,
    selectedDeviceIds: string[],
    initialPositions: { [key: string]: { x: number; y: number } }
  ) => {
    saveToHistory();

    const deviceIdsToMove = selectedDeviceIds.includes(deviceId)
      ? selectedDeviceIds
      : [deviceId];

    dragStartDevicePositionsRef.current = Object.fromEntries(
      deviceIdsToMove
        .map((id) => [id, initialPositions[id]] as const)
        .filter(([, position]) => position !== undefined)
    );
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    draggedDeviceRef.current = deviceId;
    setDraggedDevice(deviceId);
    setIsActuallyDragging(false);
    isActuallyDraggingRef.current = false;
  };

  return {
    draggedDevice,
    setDraggedDevice,
    isActuallyDragging,
    setIsActuallyDragging,
    startDeviceDrag
  };
}
