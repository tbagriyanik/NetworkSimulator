'use client';

import { useEffect, useLayoutEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { ContextMenuState, NetworkTopologyProps } from '@/components/network/NetworkTopology/types/networkTopology.types';
import {
  isSwitchDeviceType,
  getPortPosition,
  getCounterKey,
  getDistance,
} from '@/components/network/NetworkTopology/utils/networkTopology.helpers';
import { DRAG_THRESHOLD, LONG_PRESS_DURATION, MIN_ZOOM, MAX_ZOOM } from '@/components/network/NetworkTopology/utils/networkTopology.constants';

import { useCanvasActions } from '@/hooks/useCanvasActions';
import { useTopologyTouch } from '@/hooks/networkTopology/useTopologyTouch';
import { useTopologyMouse } from '@/hooks/networkTopology/useTopologyMouse';
import { useCanvasClipboard } from '@/hooks/networkTopology/useCanvasClipboard';
import { useDeviceDrag } from '@/hooks/networkTopology/useDeviceDrag';
import { useCanvasSelection } from '@/hooks/networkTopology/useCanvasSelection';
import { useNoteEditing } from '@/hooks/networkTopology/useNoteEditing';
import { useConnectionDrawing } from '@/hooks/networkTopology/useConnectionDrawing';
import { useTopologyDeviceActions } from '@/hooks/networkTopology/useTopologyDeviceActions';
import { useTopologyPingController } from '@/hooks/networkTopology/useTopologyPingController';
import { useTopologyIot } from '@/hooks/networkTopology/useTopologyIot';
import { useTopologyTooltipHandlers } from '@/hooks/networkTopology/useTopologyTooltipHandlers';
import { useTopologyNoteActions } from '@/hooks/networkTopology/useTopologyNoteActions';
import { useTopologyPortConnection } from '@/hooks/networkTopology/useTopologyPortConnection';
import { useTopologyEventListeners } from '@/hooks/networkTopology/useTopologyEventListeners';
import { useTopologyContextMenu } from '@/hooks/networkTopology/useTopologyContextMenu';
import { useDeviceNavigation } from '@/hooks/networkTopology/useDeviceNavigation';
import { useVisualConnectionActions } from '@/hooks/networkTopology/useVisualConnectionActions';
import { useTopologyDeviceMouseHandlers } from '@/hooks/networkTopology/useTopologyDeviceMouseHandlers';
import { useTopologySync } from '@/hooks/networkTopology/useTopologySync';
import { useTopologyWindowEvents } from '@/hooks/networkTopology/useTopologyWindowEvents';
import { useTopologyKeyboardShortcuts } from '@/hooks/networkTopology/useTopologyKeyboardShortcuts';
import type { PingAnimationState } from '@/hooks/networkTopology/usePingSequence';
import { useTopologyCanvasState } from './useTopologyCanvasState';

export function useTopologyCanvasInteractions(
  props: NetworkTopologyProps,
  canvasState: ReturnType<typeof useTopologyCanvasState>,
  handleExportPNG: () => void
) {
  const {
    cableInfo,
    onCableChange,
    onDeviceSelect,
    onDeviceDoubleClick,
    onTopologyChange,
    onDeviceDelete,
    deviceStates,
    onRefreshNetwork,
    focusDeviceId,
    onPacketPanelFocus,
    isExamActive = false,
    isExamEditorOpen = false,
  } = props;

  const {
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
  } = canvasState;

  const {
    language,
    t,
    isTR,
    topologyConnections,
    setDevices,
    setConnections,
    setNotes,
    isSimulationMode,
    activeCaptureConnectionId,
    setActiveCaptureConnection,
    setShowLogPanel,
    setShowShortcutsModal,
    setIsMinimapOpen,
    zoom,
    setZoom,
    pan,
    setPan,
    setPanStart,
    isMobile,
    selectedDeviceIds,
    setSelectedDeviceIds,
    selectedNoteIds,
    setSelectedNoteIds,
    environment,
    isPanning,
    setIsPanning,
    setSelectAllMode,
    setSelectionBox,
    setIsSelecting,
    isDrawingConnection,
    setIsDrawingConnection,
    connectionStart,
    setConnectionStart,
    setMousePos,
    contextMenu,
    setContextMenu,
    configuringDevice,
    setConfiguringDevice,
    isPaletteOpen,
    setIsPaletteOpen,
    setMobileConnectionSource,
    setShowPortSelector,
    setPortSelectorStep,
    setSelectedSourcePort,
    setConnectionError,
    toggleFullscreen,
  } = stateHandlers;

  const isFullscreen = props.isFullscreen || false;

  const { canvasRef, canvasRectRef, canvasDimensions, getCanvasDimensions } = canvasLifecycle;
  const { deviceMap, visualConnections, connectionMeta } = derivedState;
  const { saveToHistory } = history;
  const { zoomToFit, resetView } = zoomPan;

  const {
    pingMode,
    setPingMode,
    pingModeRef,
    pingSource,
    setPingSource,
    pingSourceRef,
    setPingResult,
    pingAnimation,
    setPingAnimation,
    setErrorToast,
    setHopPacketInfos,
    packetPopupHop,
    setPacketPopupHop,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    pingIsPausedRef,
    pingResumeCallbackRef,
    pingSkipCallbackRef,
    pingStepModeRef,
    pingPathRef,
    cancelPingDueToInterruptionRef,
    isPingPanelVisible,
    handlePingClose,
  } = pingState;

  const {
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
    deviceCounterRef,
    noteCounterRef,
    noteTextareaRefs,
    previousCableTypeRef,
  } = interactionState;

  const handleRefresh = useCallback(() => {
    setPacketPopupHop(null);
    setPingAnimation(null);
    onRefreshNetwork?.();
  }, [onRefreshNetwork, setPacketPopupHop, setPingAnimation]);

  useEffect(() => {
    pingStepModeRef.current = isSimulationMode;
  }, [isSimulationMode, pingStepModeRef]);

  const iot = useTopologyIot({
    connections,
    deviceStates,
    deviceMap,
    language,
    environment,
    mousePosRef,
    t,
  });

  const canvasActions = useCanvasActions({
    devices,
    setDevices,
    connections,
    setConnections,
    notes,
    setNotes,
    deviceStates,
    saveToHistory,
    isExamActive,
    isExamEditorOpen,
    pan,
    zoom,
    canvasDimensions,
    deviceCounterRef,
    noteCounterRef,
    latestNotesRef,
    setSelectedDeviceIds,
    setSelectedNoteIds,
    onDeviceSelect,
    onDeviceDelete,
    setConnectionStart,
    setIsDrawingConnection,
    language,
    t,
  });

  const noteEditing = useNoteEditing({
    setNotesState: setNotes,
    latestNotesRef,
    saveToHistory,
    noteTextareaRefs,
  });

  const deviceDrag = useDeviceDrag({
    saveToHistory,
    draggedDeviceRef,
    dragStartPosRef,
    isActuallyDraggingRef,
    dragStartDevicePositionsRef,
  });

  const tooltipHandlers = useTopologyTooltipHandlers({
    devices,
    canvasRef,
    deviceMap,
    getLivePort: iot.getLivePort,
    activeCaptureConnectionId,
    setActiveCaptureConnection,
    setContextMenu,
    zoomRef,
    panRef,
    isDrawingConnection,
    isPanning,
    isSelecting: stateHandlers.isSelecting,
    isActuallyDragging: deviceDrag.isActuallyDragging,
    isTouchDraggingRef,
    TOOLTIP_DELAY: 300,
    TOOLTIP_OFFSET_Y: 20,
  });

  const canvasSelection = useCanvasSelection({
    devices,
    setSelectedDeviceIds,
    selectedDeviceIdsRef,
    setIsSelecting,
    isSelectingRef,
    selectionBoxRef,
    setSelectionBox,
    setSelectAllMode,
    setContextMenu: setContextMenu as (menu: unknown) => void,
    canvasRef,
    panRef,
    zoomRef,
  });

  const connectionDrawing = useConnectionDrawing({
    setIsDrawingConnection,
    setConnectionStart,
    setMobileConnectionSource,
    isDrawingConnectionRef,
    connectionStartRef,
    onCableChange,
    cableInfo,
    previousCableTypeRef,
  });

  const portConnection = useTopologyPortConnection({
    deviceMap,
    topologyConnections,
    connections,
    devices,
    cableInfo,
    onCableChange,
    saveToHistory,
    setConnections,
    setDevices,
    setIsDrawingConnection,
    setConnectionStart,
    setConnectionError,
    cancelConnectionDrawing: connectionDrawing.cancelConnectionDrawing,
    isDrawingConnectionRef,
    connectionStartRef,
    isActuallyDraggingRef,
    isTouchDraggingRef,
    language,
    t: { portInUse: t.portInUse },
    previousCableTypeRef,
  });

  const pingController = useTopologyPingController({
    connections,
    deviceStates,
    deviceMap,
    devices,
    isTR,
    isSimulationMode,
    latestDevicesRef,
    latestConnectionsRef,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    pingIsPausedRef,
    pingStepModeRef,
    pingResumeCallbackRef,
    pingSkipCallbackRef,
    pingPathRef,
    cancelPingDueToInterruptionRef,
    setPingAnimation: setPingAnimation as React.Dispatch<React.SetStateAction<PingAnimationState | null>>,
    setHopPacketInfos: (infos) => setHopPacketInfos(infos),
    setErrorToast: (toast) => setErrorToast(toast),
    setPingMode,
    setPacketPopupHop,
    onPacketPanelFocus,
    pingAnimation,
  });

  const deviceActions = useTopologyDeviceActions({
    devices,
    setDevices,
    connections,
    setConnections,
    selectedDeviceIds,
    saveToHistory,
    activeCaptureConnectionId,
    setActiveCaptureConnection,
    setConfiguringDevice,
    setContextMenu: setContextMenu as React.Dispatch<React.SetStateAction<ContextMenuState | null>>,
  });

  const visualConnectionActions = useVisualConnectionActions({
    topologyConnections,
    visualConnections,
    deleteConnection: deviceActions.deleteConnection,
    toggleConnectionActive: deviceActions.toggleConnectionActive,
    saveToHistory,
    setDevicesState: setDevices,
  });

  useEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const rect = contextMenuRef.current.getBoundingClientRect();
    const padding = 10;
    const nextX = Math.max(padding, Math.min(contextMenu.x, window.innerWidth - rect.width - padding));
    const nextY = Math.max(padding, Math.min(contextMenu.y, window.innerHeight - rect.height - padding));

    if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
      setContextMenu((prev) => (prev ? { ...prev, x: nextX, y: nextY } : prev));
    }
  }, [contextMenu?.x, contextMenu?.y, contextMenu?.mode, contextMenu?.noteId, contextMenu?.deviceId, contextMenuRef, setContextMenu]);

  const topologyContextMenu = useTopologyContextMenu({
    setContextMenu,
    pingMode,
    isDrawingConnection,
    cancelConnectionDrawing: connectionDrawing.cancelConnectionDrawing,
  });

  useLayoutEffect(() => {
    isPanningRef.current = isPanning;
    panStartRef.current = stateHandlers.panStart;
    zoomRef.current = zoom;
    if (!isPanning && !deviceDrag.isActuallyDragging && !touchHandlers.touchMomentumFrameRef.current) {
      panRef.current = pan;
    }
    draggedDeviceRef.current = deviceDrag.draggedDevice;
    isActuallyDraggingRef.current = deviceDrag.isActuallyDragging;
    snapToGridRef.current = stateHandlers.snapToGrid;
    isDrawingConnectionRef.current = isDrawingConnection;
    connectionStartRef.current = connectionStart;
    connectionMetaRef.current = connectionMeta;
    selectedDeviceIdsRef.current = selectedDeviceIds;
  }, [isPanning, stateHandlers.panStart, zoom, pan, deviceDrag.draggedDevice, deviceDrag.isActuallyDragging, stateHandlers.snapToGrid, isDrawingConnection, connectionStart, selectedDeviceIds, connectionMeta, isPanningRef, panStartRef, zoomRef, panRef, draggedDeviceRef, isActuallyDraggingRef, snapToGridRef, isDrawingConnectionRef, connectionStartRef, connectionMetaRef, selectedDeviceIdsRef]);

  const deviceMouseHandlers = useTopologyDeviceMouseHandlers({
    devices,
    deviceMap,
    canvasRef,
    selectedDeviceIds,
    selectedDeviceIdsRef,
    wasDraggingRef,
    activePointerDragRef,
    activeDragPointerIdRef,
    setSelectedDeviceIds,
    setSelectedNoteIds,
    setContextMenu,
    onDeviceSelect,
    onDeviceDoubleClick,
    saveToHistory,
    startDeviceDrag: deviceDrag.startDeviceDrag,
    startPingAnimationRef: pingController.startPingAnimationRef,
    pingMode,
    pingModeRef,
    pingSource,
    pingSourceRef,
    pingIsPausedRef,
    pingStepModeRef,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    setPingMode,
    setPingSource,
    setPingResult,
    setPingAnimation,
    setHopPacketInfos,
    setPacketPopupHop,
    isDrawingConnectionRef,
    connectionStartRef,
    topologyConnections,
    handlePortClick: portConnection.handlePortClick,
  });

  const deviceNavigation = useDeviceNavigation({
    devices,
    deviceMap,
    onDeviceSelect,
    setSelectedDeviceIds,
    setSelectedNoteIds,
    setPan,
    canvasRef,
    zoomRef,
    panRef,
    svgContentGroupRef,
  });

  const touchHandlers = useTopologyTouch({
    canvasRef,
    deviceMap,
    devices,
    pan,
    panRef,
    zoom,
    zoomRef,
    selectedDeviceIds,
    setSelectedDeviceIds,
    saveToHistory,
    openContextMenu: topologyContextMenu.openContextMenu,
    handleDeviceDoubleClick: deviceMouseHandlers.handleDeviceDoubleClick,
    onDeviceSelect,
    isDrawingConnection,
    mobileConnectionSource: stateHandlers.mobileConnectionSource,
    setMobileConnectionSource,
    isMobile,
    isTR,
    toast,
    getCanvasDimensions,
    getDistance,
    setDevices,
    isSwitchDeviceType,
    LONG_PRESS_DURATION,
    DRAG_THRESHOLD,
    MIN_ZOOM,
    MAX_ZOOM,
    setZoom,
    setPan,
    panStartRef,
    svgContentGroupRef,
    pendingPanRef,
    activePointerDragRef,
    dragStartDevicePositionsRef,
    dragAnimationFrameRef,
    liveDeviceDragPositionsRef,
    latestDevicesRef,
    selectedDeviceIdsRef,
    isDrawingConnectionRef,
    setIsDrawingConnection,
    setConnectionStart,
    lastDragPositionRef,
    setDeviceTooltip: tooltipHandlers.setDeviceTooltip,
    setPortTooltip: tooltipHandlers.setPortTooltip,
    pingMode,
    pingSource,
    pingModeRef,
    pingSourceRef,
    connectionStartRef,
    topologyConnections,
    handlePortClick: portConnection.handlePortClick,
  });

  useLayoutEffect(() => {
    if (isPanning || deviceDrag.isActuallyDragging) return;
    if (wheelSyncTimerRef.current) return;
    if (touchHandlers.touchMomentumFrameRef.current) return;
    const g = svgContentGroupRef.current;
    if (!g) return;
    g.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`;
  }, [pan, zoom, isPanning, deviceDrag.isActuallyDragging, wheelSyncTimerRef, touchHandlers.touchMomentumFrameRef, svgContentGroupRef]);

  const isDraggingInteractionDisabled = deviceDrag.isActuallyDragging || touchHandlers.isTouchDragging;

  const mouseHandlers = useTopologyMouse({
    canvasRef,
    canvasRectRef,
    panRef,
    zoomRef,
    mousePosRef,
    isPanningRef,
    lastMouseMoveTimeRef,
    lastMouseMovePosRef,
    velocityRef,
    panAnimationFrameRef,
    panStartRef,
    svgContentGroupRef,
    pendingPanRef,
    isSelectingRef,
    selectionBoxRef,
    selectionAdditiveRef,
    selectionBaseIdsRef,
    selectedDeviceIdsRef,
    selectionAnimationFrameRef,
    draggedDeviceRef,
    dragStartPosRef,
    isActuallyDraggingRef,
    wasDraggingRef,
    lastDragEventRef,
    dragStartDevicePositionsRef,
    snapToGridRef,
    liveDeviceDragPositionsRef,
    isDrawingConnectionRef,
    activePointerDragRef,
    activeDragPointerIdRef,
    latestDevicesRef,
    latestConnectionsRef,
    getPortPositionRef,
    connectionMetaRef,
    lastDragPositionRef,
    dragAnimationFrameRef,
    mousePosAnimationFrameRef,
    momentumAnimationFrameRef,
    setMousePos,
    setDevices,
    setIsPanning,
    setPan,
    setIsSelecting,
    setSelectionBox,
    setSelectedDeviceIds,
    setIsActuallyDragging: deviceDrag.setIsActuallyDragging,
    setDraggedDevice: deviceDrag.setDraggedDevice,
    setIsDrawingConnection,
    setConnectionStart,
    setDeviceTooltip: tooltipHandlers.setDeviceTooltip,
    setPortTooltip: tooltipHandlers.setPortTooltip,
    setContextMenu,
    setSelectAllMode,
    setPingMode,
    setPingSource,
    setPingResult,
    setPanStart,
    setSelectedNoteIds,
    openContextMenu: topologyContextMenu.openContextMenu,
    cancelConnectionDrawing: connectionDrawing.cancelConnectionDrawing,
    onDeviceSelect,
    pingMode,
    pingSource,
    language,
  });

  const noteActions = useTopologyNoteActions({
    notes,
    setNotes,
    latestNotesRef,
    saveToHistory,
    bringNoteToFront: noteEditing.bringNoteToFront,
    setSelectedNoteIds,
    canvasRef,
    zoomRef,
    draggedNoteIdRef,
    resizingNoteIdRef,
    noteDragStartRef,
    noteResizeStartRef,
    noteResizeDirectionRef,
  });

  useEffect(() => {
    latestDevicesRef.current = devices;
    latestConnectionsRef.current = connections;
    latestNotesRef.current = notes;
    draggedNoteIdRef.current = noteActions.draggedNoteId;
    resizingNoteIdRef.current = noteActions.resizingNoteId;
    noteDragStartRef.current = noteActions.noteDragStart;
    noteResizeStartRef.current = noteActions.noteResizeStart;
    noteResizeDirectionRef.current = noteActions.noteResizeDirection;
    isTouchDraggingRef.current = touchHandlers.isTouchDragging;
    touchDraggedDeviceRef.current = touchHandlers.touchDraggedDevice;
  }, [
    devices,
    connections,
    notes,
    noteActions.draggedNoteId,
    noteActions.resizingNoteId,
    noteActions.noteDragStart,
    noteActions.noteResizeStart,
    noteActions.noteResizeDirection,
    touchHandlers.isTouchDragging,
    touchHandlers.touchDraggedDevice,
    latestDevicesRef,
    latestConnectionsRef,
    latestNotesRef,
    draggedNoteIdRef,
    resizingNoteIdRef,
    noteDragStartRef,
    noteResizeStartRef,
    noteResizeDirectionRef,
    isTouchDraggingRef,
    touchDraggedDeviceRef,
  ]);

  useTopologyEventListeners({
    isExamActive,
    isExamEditorOpen,
    addDevice: canvasActions.addDevice,
    addNote: canvasActions.addNote,
    addSummaryNote: canvasActions.addSummaryNote,
    handleExportPNG,
    setPingMode,
    pingModeRef,
    pingIsPausedRef,
    pingStepModeRef,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    setPingAnimation: setPingAnimation as React.Dispatch<React.SetStateAction<unknown>>,
    setHopPacketInfos: setHopPacketInfos as React.Dispatch<React.SetStateAction<unknown>>,
    setPacketPopupHop,
    setPingSource,
    pingSourceRef,
    setPingResult: setPingResult as React.Dispatch<React.SetStateAction<unknown>>,
    setContextMenu: setContextMenu as React.Dispatch<React.SetStateAction<unknown>>,
    setIsPaletteOpen,
    setShowPortSelector,
    setPortSelectorStep,
    setSelectedSourcePort,
    saveToHistory,
    setDevices,
    deleteConnection: deviceActions.deleteConnection,
  });

  useTopologyWindowEvents({
    canvasRef,
    setZoom,
    setPan,
    zoomToFit,
    setIsMinimapOpen,
    setShowLogPanel,
    setContextMenu,
    setPacketPopupHop,
    setPingAnimation,
    setHopPacketInfos: setHopPacketInfos as React.Dispatch<React.SetStateAction<unknown>>,
    saveToHistory,
    setDevices,
    deleteConnection: deviceActions.deleteConnection,
    focusDeviceId,
    deviceMap,
    zoom,
    onPanChange: props.onPanChange,
    onTopologyChange,
    devices,
    topologyConnections,
    notes,
    portTooltipTimerRef: tooltipHandlers.portTooltipTimerRef,
    connectionTooltipTimerRef: tooltipHandlers.connectionTooltipTimerRef,
    wheelSyncTimerRef,
  });

  useTopologySync({
    deviceStates,
    connections: topologyConnections,
    setDevices,
    devices,
    getCounterKey,
    deviceCounterRef,
  });

  const canvasClipboard = useCanvasClipboard({
    devices,
    setDevices,
    deleteDevice: canvasActions.deleteDevice,
    setSelectedDeviceIds,
    saveToHistory,
    deviceCounterRef,
    generateUniqueHostname: canvasActions.generateUniqueHostname,
    generateUniqueLinkLocalIp: canvasActions.generateUniqueLinkLocalIp,
    generateUniqueLinkLocalIpv6: canvasActions.generateUniqueLinkLocalIpv6,
    getCounterKey,
    setContextMenu,
    notesClipboard,
    getNextNoteId: canvasActions.getNextNoteId,
    setNotes,
    setSelectedNoteIds,
  });

  useLayoutEffect(() => {
    cancelPingDueToInterruptionRef.current = pingController.cancelPingDueToInterruption;
  }, [pingController.cancelPingDueToInterruption, cancelPingDueToInterruptionRef]);

  useLayoutEffect(() => {
    pingController.startPingAnimationRef.current = pingController.startPingAnimation;
  }, [pingController.startPingAnimation, pingController.startPingAnimationRef]);

  useEffect(() => {
    getPortPositionRef.current = getPortPosition;
  }, [getPortPositionRef]);

  useTopologyKeyboardShortcuts({
    selectedDeviceIds,
    selectedNoteIds,
    deleteDevice: canvasActions.deleteDevice,
    deleteNote: canvasActions.deleteNote,
    configuringDevice,
    cancelDeviceConfig: deviceActions.cancelDeviceConfig,
    selectAllDevices: canvasSelection.selectAllDevices,
    saveToHistory,
    onDeviceDelete,
    isDrawingConnection,
    copyDevice: canvasClipboard.copyDevice,
    cutDevice: canvasClipboard.cutDevice,
    pasteDevice: canvasClipboard.pasteDevice,
    pingSource,
    pingMode,
    setPingSource: setPingSource as (src: unknown) => void,
    setPingMode,
    setPingResult: setPingResult as (res: unknown) => void,
    toggleFullscreen,
    resetView,
    isExamActive,
    cancelConnectionDrawing: connectionDrawing.cancelConnectionDrawing,
    handlePingClose,
    packetPopupHop,
    setPacketPopupHop,
    pingAnimation,
    deviceMap,
    setDevices,
    setSelectedDeviceIds,
    setSelectedNoteIds,
    setContextMenu,
    isPaletteOpen,
    setIsPaletteOpen,
    isFullscreen,
    onFullscreenChange: props.onFullscreenChange,
    isPingPanelVisible,
    onOpenShortcutsModal: () => setShowShortcutsModal(true),
  });

  return {
    handleRefresh,
    iot,
    canvasActions,
    noteEditing,
    deviceDrag,
    tooltipHandlers,
    canvasSelection,
    connectionDrawing,
    pingController,
    deviceActions,
    visualConnectionActions,
    topologyContextMenu,
    deviceMouseHandlers,
    deviceNavigation,
    touchHandlers,
    mouseHandlers,
    portConnection,
    noteActions,
    canvasClipboard,
    isDraggingInteractionDisabled,
  };
}
