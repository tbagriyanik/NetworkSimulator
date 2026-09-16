'use client';

import { useRef, useState } from 'react';
import { DEFAULT_ZOOM } from '@/components/network/NetworkTopology/utils/networkTopology.constants';
import type { CanvasDevice, CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { CableType } from '@/lib/network/types';

export function useTopologyInteractionState() {
  const selectionBoxRef = useRef<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);
  const selectionAdditiveRef = useRef(false);
  const selectionBaseIdsRef = useRef<string[]>([]);
  const isSelectingRef = useRef(false);

  const dragAnimationFrameRef = useRef<number | null>(null);
  const selectionAnimationFrameRef = useRef<number | null>(null);
  const lastDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const wasDraggingRef = useRef(false);
  const liveDeviceDragPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastDragEventRef = useRef<{ clientX: number; clientY: number; ctrlKey: boolean } | null>(null);

  const getPortPositionRef = useRef<(device: CanvasDevice, portId: string) => { x: number; y: number }>((_d, _p) => ({ x: 0, y: 0 }));
  const connectionMetaRef = useRef<Map<string, { index: number; total: number }>>(new Map());
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(DEFAULT_ZOOM);
  const panRef = useRef({ x: 0, y: 0 });
  const draggedDeviceRef = useRef<string | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartDevicePositionsRef = useRef<{ [key: string]: { x: number; y: number } }>({});
  const isActuallyDraggingRef = useRef(false);
  const selectedDeviceIdsRef = useRef<string[]>([]);
  const snapToGridRef = useRef(true);
  const isDrawingConnectionRef = useRef(false);
  const panAnimationFrameRef = useRef<number | null>(null);
  const momentumAnimationFrameRef = useRef<number | null>(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMouseMoveTimeRef = useRef<number>(0);
  const lastMouseMovePosRef = useRef({ x: 0, y: 0 });

  const svgContentGroupRef = useRef<SVGGElement | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);
  const pendingZoomRef = useRef<number | null>(null);
  const wheelSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTouchDraggingRef = useRef(false);
  const touchDraggedDeviceRef = useRef<CanvasDevice | null>(null);
  const activePointerDragRef = useRef(false);
  const activeDragPointerIdRef = useRef<number | null>(null);
  const mousePosAnimationFrameRef = useRef<number | null>(null);

  const connectionStartRef = useRef<{
    deviceId: string;
    portId: string;
    point: { x: number; y: number };
  } | null>(null);

  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [notesClipboard] = useState<CanvasNote[]>([]);

  const latestDevicesRef = useRef<CanvasDevice[]>([]);
  const latestConnectionsRef = useRef<CanvasConnection[]>([]);
  const latestNotesRef = useRef<CanvasNote[]>([]);

  const draggedNoteIdRef = useRef<string | null>(null);
  const resizingNoteIdRef = useRef<string | null>(null);
  const noteDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const noteResizeStartRef = useRef<{ x: number; y: number; width: number; height: number; noteX: number; noteY: number } | null>(null);
  const noteResizeDirectionRef = useRef<string>('se');

  const syncingZoomFromPropRef = useRef(false);
  const syncingPanFromPropRef = useRef(false);
  const deviceCounterRef = useRef<Record<string, number>>({ pc: 0, iot: 0, switch: 0, router: 0, firewall: 0, wlc: 0, hub: 0, cloud: 0, mobile: 0, printer: 0 });
  const noteCounterRef = useRef<number>(0);
  const noteTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const previousCableTypeRef = useRef<CableType | null>(null);

  return {
    selectionBoxRef,
    selectionAdditiveRef,
    selectionBaseIdsRef,
    isSelectingRef,
    dragAnimationFrameRef,
    selectionAnimationFrameRef,
    lastDragPositionRef,
    wasDraggingRef,
    liveDeviceDragPositionsRef,
    lastDragEventRef,
    getPortPositionRef,
    connectionMetaRef,
    isPanningRef,
    panStartRef,
    zoomRef,
    panRef,
    draggedDeviceRef,
    dragStartPosRef,
    dragStartDevicePositionsRef,
    isActuallyDraggingRef,
    selectedDeviceIdsRef,
    snapToGridRef,
    isDrawingConnectionRef,
    panAnimationFrameRef,
    momentumAnimationFrameRef,
    velocityRef,
    lastMouseMoveTimeRef,
    lastMouseMovePosRef,
    svgContentGroupRef,
    pendingPanRef,
    pendingZoomRef,
    wheelSyncTimerRef,
    isTouchDraggingRef,
    touchDraggedDeviceRef,
    activePointerDragRef,
    activeDragPointerIdRef,
    mousePosAnimationFrameRef,
    connectionStartRef,
    contextMenuRef,
    notesClipboard,
    latestDevicesRef,
    latestConnectionsRef,
    latestNotesRef,
    draggedNoteIdRef,
    resizingNoteIdRef,
    noteDragStartRef,
    noteResizeStartRef,
    noteResizeDirectionRef,
    syncingZoomFromPropRef,
    syncingPanFromPropRef,
    deviceCounterRef,
    noteCounterRef,
    noteTextareaRefs,
    previousCableTypeRef,
  };
}


