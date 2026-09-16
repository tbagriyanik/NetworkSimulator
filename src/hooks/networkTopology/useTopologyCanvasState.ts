'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useNetworkRefreshWithPositions } from '@/hooks/useNetworkRefreshWithPositions';
import { CanvasDevice, NetworkTopologyProps } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { useCanvasZoomPan } from '@/hooks/networkTopology/useCanvasZoomPan';
import { useIotSensorDetection } from '@/hooks/networkTopology/useIotSensorDetection';
import { usePeriodicNetworkPackets } from '@/hooks/networkTopology/usePeriodicNetworkPackets';
import { useTopologyDerivedState } from '@/hooks/networkTopology/useTopologyDerivedState';
import { useTopologyPingState } from '@/hooks/networkTopology/useTopologyPingState';
import { useTopologyInteractionState } from '@/hooks/networkTopology/useTopologyInteractionState';
import { useTopologyCanvasLifecycle } from '@/hooks/networkTopology/useTopologyCanvasLifecycle';
import { useTopologyStateHandlers } from '@/hooks/networkTopology/useTopologyStateHandlers';

export function useTopologyCanvasState(props: NetworkTopologyProps) {
  const {
    isActive = true,
    activeDeviceId,
    deviceStates,
    onDeviceStatesChange,
    onRefreshNetwork,
    focusDeviceId,
    zoom: zoomProp,
    onZoomChange,
    pan: panProp,
    onPanChange,
    clearSelectionTrigger,
    onPingPanelOpenChange,
  } = props;

  const stateHandlers = useTopologyStateHandlers(props);
  const {
    topologyDevices,
    topologyConnections,
    topologyNotes,
    setDevices,
    setConnections,
    setNotes,
    graphicsQuality,
    isExporting,
    pan,
    setPan,
    zoom,
    setZoom,
    isMobile,
    setSelectedDeviceIds,
    selectedDeviceIds,
    setSelectAllMode,
  } = stateHandlers;

  // Canvas Lifecycle & Window Resize Hook
  const canvasLifecycle = useTopologyCanvasLifecycle({
    isMobile,
    activeDeviceId,
    focusDeviceId,
    deviceMap: useMemo(() => new Map(topologyDevices.map((d: CanvasDevice) => [d.id, d])), [topologyDevices]),
    setSelectedDeviceIds,
  });

  // Custom hook for derived topology states, lookup maps, and spatial culling
  const derivedState = useTopologyDerivedState({
    topologyDevices,
    topologyConnections,
    topologyNotes,
    deviceStates,
    isActive,
    isExporting,
    graphicsQuality,
    pan,
    zoom,
    canvasDimensions: canvasLifecycle.canvasDimensions,
    activeDeviceId,
  });

  const devices = topologyDevices;
  const connections = derivedState.visualConnections;
  const notes = topologyNotes;

  // Track deviceStates dependency
  useEffect(() => {}, [deviceStates]);

  // Use hook to preserve window positions during network refresh
  useNetworkRefreshWithPositions(onRefreshNetwork || (() => {}));

  const mousePosRef = useRef({ x: 0, y: 0 });

  useIotSensorDetection({
    setDevices,
    mousePosRef,
  });

  usePeriodicNetworkPackets({
    devices,
    connections,
    deviceStates,
    onDeviceStatesChange,
  });

  // Ping Mode State Hook
  const pingState = useTopologyPingState({ onPingPanelOpenChange });

  // Ref and interaction state hook
  const interactionState = useTopologyInteractionState();
  const { selectedDeviceIdsRef } = interactionState;

  useEffect(() => {
    selectedDeviceIdsRef.current = [...selectedDeviceIds];
  }, [selectedDeviceIds, selectedDeviceIdsRef]);

  // Handle external clear selection trigger
  useEffect(() => {
    if (clearSelectionTrigger !== undefined) {
      queueMicrotask(() => {
        setSelectedDeviceIds([]);
        selectedDeviceIdsRef.current = [];
        setSelectAllMode(false);
      });
    }
  }, [clearSelectionTrigger, setSelectedDeviceIds, selectedDeviceIdsRef, setSelectAllMode]);

  const history = useCanvasHistory({
    setDevices,
    setConnections,
    setNotes,
    latestDevicesRef: interactionState.latestDevicesRef,
    latestConnectionsRef: interactionState.latestConnectionsRef,
    latestNotesRef: interactionState.latestNotesRef,
  });

  const zoomPan = useCanvasZoomPan({
    zoom,
    setZoom,
    pan,
    setPan,
    zoomProp,
    onZoomChange,
    panProp,
    onPanChange,
    canvasRef: canvasLifecycle.canvasRef,
    svgContentGroupRef: interactionState.svgContentGroupRef,
    devices,
    notes,
    zoomRef: interactionState.zoomRef,
    panRef: interactionState.panRef,
    pendingPanRef: interactionState.pendingPanRef,
    pendingZoomRef: interactionState.pendingZoomRef,
    wheelSyncTimerRef: interactionState.wheelSyncTimerRef,
    syncingZoomFromPropRef: interactionState.syncingZoomFromPropRef,
    syncingPanFromPropRef: interactionState.syncingPanFromPropRef,
  });

  return {
    stateHandlers,
    canvasLifecycle,
    derivedState,
    pingState,
    interactionState,
    history,
    zoomPan,
    mousePosRef,
    devices,
    connections,
    notes,
  };
}
