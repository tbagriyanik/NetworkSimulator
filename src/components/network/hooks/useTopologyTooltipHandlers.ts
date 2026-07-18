'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CanvasDevice, ContextMenuState } from '../networkTopology.types';
import { getDeviceWidth, getDeviceHeight } from '../networkTopology.helpers';

interface UseTopologyTooltipHandlersProps {
  devices: CanvasDevice[];
  canvasRef: React.RefObject<HTMLDivElement | null>;
  deviceMap: Map<string, CanvasDevice>;
  getLivePort: (deviceId: string, portId: string) => unknown;
  activeCaptureConnectionId: string | null;
  setActiveCaptureConnection: (id: string | null) => void;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  zoomRef: React.MutableRefObject<number>;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  isDrawingConnection: boolean;
  isPanning: boolean;
  isSelecting: boolean;
  isActuallyDragging: boolean;
  isTouchDraggingRef: React.MutableRefObject<boolean>;
  TOOLTIP_DELAY: number;
  TOOLTIP_OFFSET_Y: number;
}

export function useTopologyTooltipHandlers({
  devices,
  canvasRef,
  deviceMap,
  getLivePort,
  activeCaptureConnectionId,
  setActiveCaptureConnection,
  setContextMenu,
  zoomRef,
  panRef,
  isDrawingConnection,
  isPanning,
  isSelecting,
  isActuallyDragging,
  isTouchDraggingRef,
  TOOLTIP_DELAY,
  TOOLTIP_OFFSET_Y,
}: UseTopologyTooltipHandlersProps) {
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const [connectionTooltip, setConnectionTooltip] = useState<{
    x: number;
    y: number;
    sourceDeviceName: string;
    sourcePort: string;
    targetDeviceName: string;
    targetPort: string;
    cableType: string;
    statusMessage: string;
    visible: boolean;
  } | null>(null);
  
  const [portTooltip, setPortTooltip] = useState<{
    deviceId: string;
    portId: string;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);

  const [deviceTooltip, setDeviceTooltip] = useState<{
    deviceId: string;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);

  const portTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (portTooltipTimerRef.current) clearTimeout(portTooltipTimerRef.current);
      if (connectionTooltipTimerRef.current) clearTimeout(connectionTooltipTimerRef.current);
      if (deviceTooltipTimerRef.current) clearTimeout(deviceTooltipTimerRef.current);
    };
  }, []);

  const showPortTooltip = useCallback((e: React.MouseEvent | MouseEvent, deviceId: string, portId: string) => {
    const device = deviceMap.get(deviceId);
    const port = getLivePort(deviceId, portId);
    if (!device || !port) return;

    if (portTooltipTimerRef.current) {
      clearTimeout(portTooltipTimerRef.current);
    }

    portTooltipTimerRef.current = setTimeout(() => {
      setPortTooltip({
        deviceId,
        portId,
        x: e.clientX,
        y: e.clientY,
        visible: true,
      });

      portTooltipTimerRef.current = setTimeout(() => {
        setPortTooltip(prev => prev ? { ...prev, visible: false } : null);
      }, 2000);
    }, TOOLTIP_DELAY);
  }, [deviceMap, getLivePort, TOOLTIP_DELAY]);

  const handlePortHover = useCallback((e: React.MouseEvent, deviceId: string, portId: string) => {
    if (isDrawingConnection || isPanning || isSelecting || isActuallyDragging || isTouchDraggingRef.current) return;
    showPortTooltip(e, deviceId, portId);
  }, [showPortTooltip, isDrawingConnection, isPanning, isSelecting, isActuallyDragging, isTouchDraggingRef]);

  const handlePortMouseLeave = useCallback(() => {
    if (portTooltipTimerRef.current) {
      clearTimeout(portTooltipTimerRef.current);
    }
    setPortTooltip(null);
  }, []);

  const handleConnectionClick = useCallback((e: React.MouseEvent, connId: string) => {
    e.stopPropagation();
    if (activeCaptureConnectionId === connId) {
      setActiveCaptureConnection(null);
    } else {
      setActiveCaptureConnection(connId);
    }
    setContextMenu(null);
  }, [activeCaptureConnectionId, setActiveCaptureConnection, setContextMenu]);

  const handleConnectionMouseEnter = useCallback((
    e: React.MouseEvent<SVGPathElement>,
    connId: string,
    sourceDeviceName: string,
    sourcePort: string,
    targetDeviceName: string,
    targetPort: string,
    cableType: string,
    statusMessage: string
  ) => {
    setHoveredConnectionId(connId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cz = zoomRef.current;
    const cp = panRef.current;
    let tx = e.clientX;
    let ty = e.clientY;
    const tooltipW = 200;
    const tooltipH = 70;
    for (const d of devices) {
      const devW = getDeviceWidth(d.type);
      const devH = getDeviceHeight(d.type, d.ports.length);
      const cx = rect.left + d.x * cz + cp.x + devW * cz / 2;
      const cy = rect.top + d.y * cz + cp.y + devH * cz / 2;
      if (Math.abs(tx - cx) < devW * cz / 2 + tooltipW / 2 && Math.abs(ty - cy) < devH * cz / 2 + tooltipH / 2) {
        tx = e.clientX + 130;
        ty = e.clientY - 40;
      }
    }
    if (connectionTooltipTimerRef.current) clearTimeout(connectionTooltipTimerRef.current);
    connectionTooltipTimerRef.current = setTimeout(() => {
      setConnectionTooltip({
        x: tx,
        y: ty + TOOLTIP_OFFSET_Y,
        sourceDeviceName,
        sourcePort,
        targetDeviceName,
        targetPort,
        cableType,
        statusMessage,
        visible: true
      });
      connectionTooltipTimerRef.current = setTimeout(() => {
        setConnectionTooltip(prev => prev ? { ...prev, visible: false } : null);
      }, 3000);
    }, TOOLTIP_DELAY);
  }, [devices, canvasRef, zoomRef, panRef, TOOLTIP_DELAY, TOOLTIP_OFFSET_Y]);

  const handleConnectionMouseLeave = useCallback(() => {
    setHoveredConnectionId(null);
    if (connectionTooltipTimerRef.current) clearTimeout(connectionTooltipTimerRef.current);
    setConnectionTooltip(null);
  }, []);

  const handleDeviceMouseLeave = useCallback(() => {
    if (deviceTooltipTimerRef.current) {
      clearTimeout(deviceTooltipTimerRef.current);
      deviceTooltipTimerRef.current = null;
    }
    setDeviceTooltip(null);
  }, []);

  return {
    hoveredConnectionId,
    setHoveredConnectionId,
    connectionTooltip,
    setConnectionTooltip,
    portTooltip,
    setPortTooltip,
    deviceTooltip,
    setDeviceTooltip,
    handlePortHover,
    handlePortMouseLeave,
    handleConnectionClick,
    handleConnectionMouseEnter,
    handleConnectionMouseLeave,
    handleDeviceMouseLeave,
    portTooltipTimerRef,
    connectionTooltipTimerRef,
    deviceTooltipTimerRef,
  };
}
