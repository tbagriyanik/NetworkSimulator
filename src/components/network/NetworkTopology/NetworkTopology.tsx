'use client';

import { useRef, useEffect, useLayoutEffect, useCallback, useMemo, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { useNetworkRefreshWithPositions } from '@/hooks/useNetworkRefreshWithPositions';
import { toast } from '@/hooks/use-toast';
import { CanvasDevice, ContextMenuState, NetworkTopologyProps } from './types/networkTopology.types';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import {
  isSwitchDeviceType,
  getPortPosition,
  getCounterKey,
  getDistance,
} from './utils/networkTopology.helpers';
import { CABLE_COLORS, DRAG_THRESHOLD, LONG_PRESS_DURATION, MIN_ZOOM, MAX_ZOOM, NOTE_FONTS_DESKTOP as NOTE_FONTS } from './utils/networkTopology.constants';

import { useCanvasActions } from '@/hooks/useCanvasActions';
import { exportTopologyToPNG } from '@/utils/exportPNG';
import { useCanvasZoomPan } from '@/hooks/networkTopology/useCanvasZoomPan';
import { useTopologyTouch } from '@/hooks/networkTopology/useTopologyTouch';
import { useTopologyMouse } from '@/hooks/networkTopology/useTopologyMouse';
import { useCanvasClipboard } from '@/hooks/networkTopology/useCanvasClipboard';
import { useDeviceDrag } from '@/hooks/networkTopology/useDeviceDrag';
import { useCanvasSelection } from '@/hooks/networkTopology/useCanvasSelection';
import { useNoteEditing } from '@/hooks/networkTopology/useNoteEditing';
import { useIotSensorDetection } from '@/hooks/networkTopology/useIotSensorDetection';
import { usePeriodicNetworkPackets } from '@/hooks/networkTopology/usePeriodicNetworkPackets';
import { useTopologySync } from '@/hooks/networkTopology/useTopologySync';
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
import { useTopologyDerivedState } from '@/hooks/networkTopology/useTopologyDerivedState';
import { useTopologyWindowEvents } from '@/hooks/networkTopology/useTopologyWindowEvents';
import { useTopologyPingState } from '@/hooks/networkTopology/useTopologyPingState';
import { useVisualConnectionActions } from '@/hooks/networkTopology/useVisualConnectionActions';
import { useTopologyDeviceMouseHandlers } from '@/hooks/networkTopology/useTopologyDeviceMouseHandlers';
import { useTopologyInteractionState } from '@/hooks/networkTopology/useTopologyInteractionState';
import type { PingAnimationState } from '@/hooks/networkTopology/usePingSequence';

import { TopologyCanvasArea } from '../topology/TopologyCanvasArea';
import { TopologyDeviceRenderer } from '../topology/TopologyDeviceRenderer';
import { useTopologyCanvasLifecycle } from '@/hooks/networkTopology/useTopologyCanvasLifecycle';
import { useTopologyKeyboardShortcuts } from '@/hooks/networkTopology/useTopologyKeyboardShortcuts';

import { useTopologyStateHandlers } from '@/hooks/networkTopology/useTopologyStateHandlers';

export function NetworkTopology(props: NetworkTopologyProps) {
  const {
    cableInfo,
    onCableChange,
    onDeviceSelect,
    onDeviceDoubleClick,
    onTopologyChange,
    onDeviceDelete,
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
    isFullscreen = false,
    onFullscreenChange,
    onOpenTasks,
    clearSelectionTrigger,
    onPacketPanelFocus,
    packetPanelZIndex,
    isExamActive = false,
    isExamEditorOpen = false,
    onPingPanelOpenChange,
  } = props;

  const {
    language,
    t,
    isDark,
    isTR,
    isExporting,
    setIsExporting,
    isMinimapOpen,
    setIsMinimapOpen,
    topologyDevices,
    topologyConnections,
    topologyNotes,
    setDevices,
    setConnections,
    setNotes,
    graphicsQuality,
    isSimulationMode,
    activeCaptureConnectionId,
    setActiveCaptureConnection,
    capturedPacketsMap,
    clearCapturedPackets,
    clearAllCapturedPackets,
    networkEventLogs,
    showLogPanel,
    setShowLogPanel,
    showShortcutsModal,
    setShowShortcutsModal,
    preferences,
    snapToGrid,
    setSnapToGrid,
    zoom,
    setZoom,
    pan,
    setPan,
    isMobile,
    selectedDeviceIds,
    setSelectedDeviceIds,
    selectedDeviceSet,
    selectedNoteIds,
    setSelectedNoteIds,
    environment,
    iotUpdateTrigger,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    setSelectAllMode,
    selectionBox,
    setSelectionBox,
    isSelecting,
    setIsSelecting,
    isDrawingConnection,
    setIsDrawingConnection,
    connectionStart,
    setConnectionStart,
    mousePos,
    setMousePos,
    contextMenu,
    setContextMenu,
    configuringDevice,
    setConfiguringDevice,
    isPaletteOpen,
    setIsPaletteOpen,
    mobilePaletteOpen,
    setMobilePaletteOpen,
    mobileConnectionSource,
    setMobileConnectionSource,
    showPortSelector,
    setShowPortSelector,
    portSelectorStep,
    setPortSelectorStep,
    selectedSourcePort,
    setSelectedSourcePort,
    connectionError,
    setConnectionError,
    toggleFullscreen,
  } = useTopologyStateHandlers(props);

  // Canvas Lifecycle & Window Resize Hook
  const {
    canvasRef,
    canvasRectRef,
    canvasDimensions,
    getCanvasDimensions,
  } = useTopologyCanvasLifecycle({
    isMobile,
    activeDeviceId,
    focusDeviceId,
    deviceMap: useMemo(() => new Map(topologyDevices.map((d: CanvasDevice) => [d.id, d])), [topologyDevices]),
    setSelectedDeviceIds,
  });

  // Custom hook for derived topology states, lookup maps, and spatial culling
  const {
    deviceMap,
    visualConnections,
    deviceToConnectionsMap,
    connectionMeta,
    visibleConnections,
    visibleNotes,
    devicesSortedForRender,
  } = useTopologyDerivedState({
    topologyDevices,
    topologyConnections,
    topologyNotes,
    deviceStates,
    isActive,
    isExporting,
    graphicsQuality,
    pan,
    zoom,
    canvasDimensions,
    activeDeviceId,
  });

  const devices = topologyDevices;
  const connections = visualConnections;
  const notes = topologyNotes;

  // Sync state functions for local component logic
  const setDevicesState = setDevices;
  const setConnectionsState = setConnections;
  const setNotesState = setNotes;

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
  const {
    pingMode,
    setPingMode,
    pingModeRef,
    pingSource,
    setPingSource,
    pingSourceRef,
    setPingResult,
    pingCursorPos,
    setPingCursorPos,
    pingAnimation,
    setPingAnimation,
    errorToast,
    setErrorToast,
    hopPacketInfos,
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
  } = useTopologyPingState({ onPingPanelOpenChange });

  useEffect(() => {
    selectedDeviceIdsRef.current = [...selectedDeviceIds];
  }, [selectedDeviceIds]);

  // Handle external clear selection trigger
  useEffect(() => {
    if (clearSelectionTrigger !== undefined) {
      queueMicrotask(() => {
        setSelectedDeviceIds([]);
        selectedDeviceIdsRef.current = [];
        setSelectAllMode(false);
      });
    }
  }, [clearSelectionTrigger]);

  // Ref and interaction state hook
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
  } = useTopologyInteractionState();

  const {
    saveToHistory,
    handleUndo,
    handleRedo,
    historyIndex,
    historyLength,
  } = useCanvasHistory({
    setDevices: setDevicesState,
    setConnections: setConnectionsState,
    setNotes: setNotesState,
    latestDevicesRef,
    latestConnectionsRef,
    latestNotesRef,
  });

  const {
    handleZoomWheel,
    handleZoomMouseDown,
    isDraggingZoom,
    resetView,
    zoomToFit,
  } = useCanvasZoomPan({
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
    syncingPanFromPropRef,
  });

  const handleRefresh = useCallback(() => {
    setPacketPopupHop(null);
    setPingAnimation(null);
    onRefreshNetwork?.();
  }, [onRefreshNetwork, setPacketPopupHop, setPingAnimation]);

  useEffect(() => {
    pingStepModeRef.current = isSimulationMode;
  }, [isSimulationMode, pingStepModeRef]);

  const {
    getLivePort,
    getLiveDeviceVlan,
    getIotDeviceStatus,
    getIotPowerStatus,
    getIotOpenCloseStatus,
    getIotMeasuredValue,
    getLivePortVlanText,
  } = useTopologyIot({
    connections,
    deviceStates,
    deviceMap,
    language,
    environment,
    mousePosRef,
    t,
  });

  const {
    generateUniqueLinkLocalIp,
    generateUniqueLinkLocalIpv6,
    generateUniqueHostname,
    addDevice,
    deleteDevice,
    getNextNoteId,
    addNote,
    addSummaryNote,
    deleteNote,
    duplicateNote,
  } = useCanvasActions({
    devices,
    setDevices: setDevicesState,
    connections,
    setConnections: setConnectionsState,
    notes,
    setNotes: setNotesState,
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

  const {
    noteClipboard,
    setNoteTextSelection,
    handleNoteTextCopy,
    handleNoteTextCut,
    handleNoteTextDelete,
    handleNoteTextPaste,
    handleNoteTextSelectAll,
    bringNoteToFront,
  } = useNoteEditing({
    setNotesState,
    latestNotesRef,
    saveToHistory,
    noteTextareaRefs,
  });

  const {
    draggedDevice,
    setDraggedDevice,
    isActuallyDragging,
    setIsActuallyDragging,
    startDeviceDrag,
  } = useDeviceDrag({
    saveToHistory,
    draggedDeviceRef,
    dragStartPosRef,
    isActuallyDraggingRef,
    dragStartDevicePositionsRef,
  });

  const {
    hoveredConnectionId,
    connectionTooltip,
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
  } = useTopologyTooltipHandlers({
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
    TOOLTIP_DELAY: 300,
    TOOLTIP_OFFSET_Y: 20,
  });

  const { selectAllDevices } = useCanvasSelection({
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

  const { cancelConnectionDrawing } = useConnectionDrawing({
    setIsDrawingConnection,
    setConnectionStart,
    setMobileConnectionSource,
    isDrawingConnectionRef,
    connectionStartRef,
    onCableChange,
    cableInfo,
    previousCableTypeRef,
  });

  const {
    startPingAnimation,
    startPingAnimationRef,
    cancelPingDueToInterruption,
    handlePingPause,
    handlePingPlay,
    handlePingNext,
    handleEnvelopeClick,
  } = useTopologyPingController({
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

  const {
    startDeviceConfig,
    cancelDeviceConfig,
    saveDeviceConfig,
    togglePowerDevices,
    handleAlign,
    toggleConnectionActive,
    deleteConnection,
  } = useTopologyDeviceActions({
    devices,
    setDevices: setDevicesState,
    connections,
    setConnections: setConnectionsState,
    selectedDeviceIds,
    saveToHistory,
    activeCaptureConnectionId,
    setActiveCaptureConnection,
    setConfiguringDevice,
    setContextMenu: setContextMenu as React.Dispatch<React.SetStateAction<ContextMenuState | null>>,
  });

  // Visual Connection Actions Hook
  const { deleteVisualConnection, toggleVisualConnectionActive } = useVisualConnectionActions({
    topologyConnections,
    visualConnections,
    deleteConnection,
    toggleConnectionActive,
    saveToHistory,
    setDevicesState,
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
  }, [contextMenu?.x, contextMenu?.y, contextMenu?.mode, contextMenu?.noteId, contextMenu?.deviceId]);

  const { openContextMenu, handleContextMenu } = useTopologyContextMenu({
    setContextMenu,
    pingMode,
    isDrawingConnection,
    cancelConnectionDrawing,
  });

  useLayoutEffect(() => {
    isPanningRef.current = isPanning;
    panStartRef.current = panStart;
    zoomRef.current = zoom;
    if (!isPanning && !isActuallyDragging && !touchMomentumFrameRef.current) {
      panRef.current = pan;
    }
    draggedDeviceRef.current = draggedDevice;
    isActuallyDraggingRef.current = isActuallyDragging;
    snapToGridRef.current = snapToGrid;
    isDrawingConnectionRef.current = isDrawingConnection;
    connectionStartRef.current = connectionStart;
    connectionMetaRef.current = connectionMeta;
    selectedDeviceIdsRef.current = selectedDeviceIds;
  }, [isPanning, panStart, zoom, pan, draggedDevice, isActuallyDragging, snapToGrid, isDrawingConnection, connectionStart, selectedDeviceIds, connectionMeta]);

  useLayoutEffect(() => {
    if (isPanning || isActuallyDragging) return;
    if (wheelSyncTimerRef.current) return;
    if (touchMomentumFrameRef.current) return;
    const g = svgContentGroupRef.current;
    if (!g) return;
    g.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`;
  }, [pan, zoom, isPanning, isActuallyDragging]);

  const {
    handleDeviceMouseDown,
    handleDeviceClick,
    handleDeviceDoubleClick,
    handleDevicePointerDown,
  } = useTopologyDeviceMouseHandlers({
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
    startDeviceDrag,
    startPingAnimationRef,
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
  });

  const { handleDeviceKeyDown } = useDeviceNavigation({
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

  const {
    handleDeviceTouchStart,
    handleDeviceTouchMove,
    handleDeviceTouchEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isTouchDragging,
    touchDraggedDevice,
    touchMomentumFrameRef,
  } = useTopologyTouch({
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
    openContextMenu,
    handleDeviceDoubleClick,
    onDeviceSelect,
    isDrawingConnection,
    mobileConnectionSource,
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
    setDeviceTooltip,
    setPortTooltip,
    pingMode,
    pingSource,
    pingModeRef,
    pingSourceRef,
  });

  const isDraggingInteractionDisabled = isActuallyDragging || isTouchDragging;

  const { handleCanvasMouseDown } = useTopologyMouse({
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
    setIsActuallyDragging,
    setDraggedDevice,
    setIsDrawingConnection,
    setConnectionStart,
    setDeviceTooltip,
    setPortTooltip,
    setContextMenu,
    setSelectAllMode,
    setPingMode,
    setPingSource,
    setPingResult,
    setPanStart,
    setSelectedNoteIds,
    openContextMenu,
    cancelConnectionDrawing,
    onDeviceSelect,
    pingMode,
    pingSource,
    language,
  });

  const { handlePortClick } = useTopologyPortConnection({
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
    cancelConnectionDrawing,
    isDrawingConnectionRef,
    connectionStartRef,
    isActuallyDraggingRef,
    isTouchDraggingRef,
    language,
    t: { portInUse: t.portInUse },
    previousCableTypeRef,
  });

  const {
    draggedNoteId,
    resizingNoteId,
    noteDragStart,
    noteResizeStart,
    noteResizeDirection,
    updateNoteText,
    updateNoteStyle,
    cycleNoteColor,
    cycleNoteFont,
    cycleNoteFontSize,
    cycleNoteOpacity,
    handleNoteHeaderMouseDown,
    handleNoteHeaderTouchStart,
    handleNoteResizeStart,
    handleNoteResizeTouchStart,
  } = useTopologyNoteActions({
    notes,
    setNotes: setNotesState,
    latestNotesRef,
    saveToHistory,
    bringNoteToFront,
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
    draggedNoteIdRef.current = draggedNoteId;
    resizingNoteIdRef.current = resizingNoteId;
    noteDragStartRef.current = noteDragStart;
    noteResizeStartRef.current = noteResizeStart;
    noteResizeDirectionRef.current = noteResizeDirection;
    isTouchDraggingRef.current = isTouchDragging;
    touchDraggedDeviceRef.current = touchDraggedDevice;
  }, [
    devices,
    connections,
    notes,
    draggedNoteId,
    resizingNoteId,
    noteDragStart,
    noteResizeStart,
    noteResizeDirection,
    isTouchDragging,
    touchDraggedDevice,
  ]);

  const handleExportPNG = useCallback(() => {
    setIsExporting(true);
    setTimeout(() => {
      if (!canvasRef.current) {
        setIsExporting(false);
        return;
      }
      const svg = canvasRef.current.querySelector('svg');
      if (!svg) {
        setIsExporting(false);
        return;
      }

      try {
        exportTopologyToPNG({
          svgElement: svg,
          devices,
          notes,
          connections,
          deviceStates: deviceStates || undefined,
          getPortPosition: getPortPositionRef.current,
        });
      } finally {
        setIsExporting(false);
      }
    }, 300);
  }, [devices, connections, notes, deviceStates]);

  useTopologyEventListeners({
    isExamActive,
    isExamEditorOpen,
    addDevice,
    addNote,
    addSummaryNote,
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
    setDevices: setDevicesState,
    deleteConnection,
  });

  // Custom Window Event Listeners & Side-effect Hook
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
    setDevices: setDevicesState,
    deleteConnection,
    focusDeviceId,
    deviceMap,
    zoom,
    onPanChange,
    onTopologyChange,
    devices,
    topologyConnections,
    notes,
    portTooltipTimerRef,
    connectionTooltipTimerRef,
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

  const {
    clipboard,
    copyDevice,
    cutDevice,
    pasteDevice,
    pasteNotes,
  } = useCanvasClipboard({
    devices,
    setDevices,
    deleteDevice,
    setSelectedDeviceIds,
    saveToHistory,
    deviceCounterRef,
    generateUniqueHostname,
    generateUniqueLinkLocalIp,
    generateUniqueLinkLocalIpv6,
    getCounterKey,
    setContextMenu,
    notesClipboard,
    getNextNoteId,
    setNotes,
    setSelectedNoteIds,
  });

  useLayoutEffect(() => {
    cancelPingDueToInterruptionRef.current = cancelPingDueToInterruption;
  }, [cancelPingDueToInterruption]);

  useLayoutEffect(() => {
    startPingAnimationRef.current = startPingAnimation;
  }, [startPingAnimation]);

  useEffect(() => {
    getPortPositionRef.current = getPortPosition;
  }, []);

  const renderDevice = (device: CanvasDevice, isDragging: boolean = false) => {
    return (
      <TopologyDeviceRenderer
        device={device}
        topologyDevices={devices}
        isDragging={isDragging}
        selectedDeviceIds={selectedDeviceSet}
        isDark={isDark}
        language={language}
        t={t}
        deviceStates={deviceStates}
        deviceToConnectionsMap={deviceToConnectionsMap}
        graphicsQuality={graphicsQuality}
        isDraggingInteractionDisabled={isDraggingInteractionDisabled}
        getLiveDeviceVlan={getLiveDeviceVlan}
        getIotMeasuredValue={getIotMeasuredValue}
        handlePortHover={handlePortHover}
        handlePortMouseLeave={handlePortMouseLeave}
        handlePortClick={handlePortClick}
        handleDeviceMouseDown={(e, id) => handleDeviceMouseDown(e as unknown as ReactMouseEvent, id)}
        handleDevicePointerDown={handleDevicePointerDown}
        handleDeviceClick={(e, selectedDevice) => handleDeviceClick(e as unknown as ReactMouseEvent, selectedDevice)}
        handleDeviceKeyDown={handleDeviceKeyDown}
        handleDeviceDoubleClick={handleDeviceDoubleClick}
        handleDeviceMouseLeave={handleDeviceMouseLeave}
        handleDeviceTouchStart={(e, id) => handleDeviceTouchStart(e as unknown as ReactTouchEvent, id)}
        handleDeviceTouchMove={handleDeviceTouchMove}
        handleDeviceTouchEnd={handleDeviceTouchEnd}
        _mousePosRef={mousePosRef}
        isDrawingConnection={isDrawingConnection}
        connectionStart={connectionStart}
      />
    );
  };

  useTopologyKeyboardShortcuts({
    selectedDeviceIds,
    selectedNoteIds,
    deleteDevice,
    deleteNote,
    configuringDevice,
    cancelDeviceConfig,
    selectAllDevices,
    saveToHistory,
    onDeviceDelete,
    isDrawingConnection,
    copyDevice,
    cutDevice,
    pasteDevice,
    pingSource,
    pingMode,
    setPingSource: setPingSource as (src: unknown) => void,
    setPingMode,
    setPingResult: setPingResult as (res: unknown) => void,
    toggleFullscreen,
    resetView,
    isExamActive,
    cancelConnectionDrawing,
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
    onFullscreenChange,
    isPingPanelVisible,
    onOpenShortcutsModal: () => setShowShortcutsModal(true),
  });

  return (
    <TopologyCanvasArea
      isFullscreen={isFullscreen}
      isDark={isDark}
      t={t}
      language={language}
      toggleFullscreen={toggleFullscreen}
      isPaletteOpen={isPaletteOpen}
      setIsPaletteOpen={setIsPaletteOpen}
      isTR={isTR}
      addDevice={addDevice}
      cableInfo={cableInfo}
      onCableChange={onCableChange}
      pingMode={pingMode}
      setPingMode={setPingMode}
      pingCursorPos={pingCursorPos}
      pingSource={pingSource}
      selectedDeviceIds={selectedDeviceIds}
      deviceMap={deviceMap}
      handleAlign={handleAlign}
      setSelectedDeviceIds={setSelectedDeviceIds}
      onDeviceSelect={onDeviceSelect}
      saveToHistory={saveToHistory}
      deleteDevice={deleteDevice}

      canvasRef={canvasRef}
      svgContentGroupRef={svgContentGroupRef}
      isPanning={isPanning}
      isSelecting={isSelecting}
      selectedDeviceSet={selectedDeviceSet}
      selectedNoteIds={selectedNoteIds}
      connectionStart={connectionStart}
      mousePos={mousePos}
      isDrawingConnection={isDrawingConnection}
      contextMenu={contextMenu}
      noteTextareaRefs={noteTextareaRefs}
      isActuallyDragging={isActuallyDragging}
      isTouchDragging={isTouchDragging}
      deviceStates={deviceStates}
      devices={devices}
      connections={connections}
      notes={notes}
      visibleConnections={visibleConnections}
      visibleNotes={visibleNotes}
      devicesSortedForRender={devicesSortedForRender}
      activeDeviceId={activeDeviceId}
      iotUpdateTrigger={iotUpdateTrigger}
      graphicsQuality={graphicsQuality}
      zoom={zoom}
      environment={environment}
      selectionBox={selectionBox}
      hoveredConnectionId={hoveredConnectionId}

      handleCanvasMouseDown={handleCanvasMouseDown}
      handleTouchStart={handleTouchStart}
      handleTouchMove={handleTouchMove}
      handleTouchEnd={handleTouchEnd}
      handleContextMenu={handleContextMenu}
      handleNoteHeaderMouseDown={handleNoteHeaderMouseDown}
      handleNoteHeaderTouchStart={handleNoteHeaderTouchStart}
      cycleNoteColor={cycleNoteColor}
      cycleNoteFont={cycleNoteFont}
      cycleNoteFontSize={cycleNoteFontSize}
      cycleNoteOpacity={cycleNoteOpacity}
      duplicateNote={duplicateNote}
      deleteNote={deleteNote}
      updateNoteText={updateNoteText}
      setNoteTextSelection={setNoteTextSelection}
      handleNoteResizeStart={handleNoteResizeStart}
      handleNoteResizeTouchStart={handleNoteResizeTouchStart}
      bringNoteToFront={bringNoteToFront}
      setSelectedNoteIds={setSelectedNoteIds}
      setContextMenu={setContextMenu}
      setSelectAllMode={setSelectAllMode}
      cancelConnectionDrawing={cancelConnectionDrawing}
      setPingCursorPos={setPingCursorPos}
      setZoom={setZoom}
      setPan={setPan}
      handleZoomWheel={handleZoomWheel}
      resetView={resetView}
      getCanvasDimensions={getCanvasDimensions}
      renderDevice={renderDevice}
      handleConnectionMouseEnter={handleConnectionMouseEnter}
      handleConnectionMouseLeave={handleConnectionMouseLeave}
      handleConnectionClick={handleConnectionClick}
      onDeleteConnection={deleteVisualConnection}
      onToggleConnectionActive={toggleVisualConnectionActive}
      pingAnimation={pingAnimation}
      handleEnvelopeClick={handleEnvelopeClick}

      showZoomToolbar={preferences.showZoomToolbar}
      zoomToFit={zoomToFit}
      handleZoomMouseDown={handleZoomMouseDown}
      isDraggingZoom={isDraggingZoom}
      MIN_ZOOM={MIN_ZOOM}
      MAX_ZOOM={MAX_ZOOM}
      setShowLogPanel={setShowLogPanel}
      networkEventLogsCount={networkEventLogs.length}
      setIsMinimapOpen={setIsMinimapOpen}
      isMinimapOpen={isMinimapOpen}
      snapToGrid={snapToGrid}
      setSnapToGrid={setSnapToGrid}
      setShowShortcutsModal={setShowShortcutsModal}

      contextMenuRef={contextMenuRef}
      NOTE_FONTS={Array.from(NOTE_FONTS)}
      clipboardLength={clipboard.length}
      noteClipboardLength={noteClipboard.length}
      historyIndex={historyIndex}
      historyLength={historyLength}
      isExamActive={isExamActive}
      isPingPanelVisible={isPingPanelVisible}
      updateNoteStyle={updateNoteStyle}
      handleNoteTextCut={handleNoteTextCut}
      handleNoteTextCopy={handleNoteTextCopy}
      handleNoteTextPaste={handleNoteTextPaste}
      handleNoteTextDelete={handleNoteTextDelete}
      handleNoteTextSelectAll={handleNoteTextSelectAll}
      pasteNotes={pasteNotes}
      handleUndo={handleUndo}
      handleRedo={handleRedo}
      selectAllDevices={selectAllDevices}
      handleDeviceDoubleClick={handleDeviceDoubleClick}
      cutDevice={(ids) => {
        saveToHistory();
        cutDevice(ids);
      }}
      copyDevice={copyDevice}
      pasteDevice={pasteDevice}
      startDeviceConfig={startDeviceConfig}
      pingModeRef={pingModeRef}
      setPingSource={setPingSource}
      pingSourceRef={pingSourceRef}
      setPingResult={setPingResult}
      togglePowerDevices={(ids) => {
        saveToHistory();
        togglePowerDevices(ids);
      }}
      onOpenTasks={onOpenTasks}
      handleRefresh={handleRefresh}
      portTooltip={portTooltip}
      getIotDeviceStatus={getIotDeviceStatus}
      getIotPowerStatus={getIotPowerStatus}
      getIotOpenCloseStatus={getIotOpenCloseStatus}
      getLivePortVlanText={getLivePortVlanText}
      connectionTooltip={connectionTooltip}
      CABLE_COLORS={CABLE_COLORS}
      deviceTooltip={deviceTooltip}
      isDraggingInteractionDisabled={isDraggingInteractionDisabled}
      configuringDevice={configuringDevice}
      cancelDeviceConfig={cancelDeviceConfig}
      saveDeviceConfig={saveDeviceConfig}
      isMobile={isMobile}
      hopPacketInfos={hopPacketInfos}
      handlePingPlay={handlePingPlay}
      handlePingPause={handlePingPause}
      handlePingNext={handlePingNext}
      handlePingClose={handlePingClose}
      onPacketPanelFocus={onPacketPanelFocus}
      packetPanelZIndex={packetPanelZIndex}
      packetPopupHop={packetPopupHop}
      setPacketPopupHop={setPacketPopupHop}
      errorToast={errorToast}
      setErrorToast={setErrorToast}
      connectionError={connectionError}
      mobilePaletteOpen={mobilePaletteOpen}
      setMobilePaletteOpen={setMobilePaletteOpen}
      showPortSelector={showPortSelector}
      portSelectorStep={portSelectorStep}
      selectedSourcePort={selectedSourcePort}
      setShowPortSelector={setShowPortSelector}
      setPortSelectorStep={setPortSelectorStep}
      setSelectedSourcePort={setSelectedSourcePort}
      setConnections={setConnections}
      setDevices={setDevices}
      activeCaptureConnectionId={activeCaptureConnectionId}
      clearCapturedPackets={clearCapturedPackets}
      clearAllCapturedPackets={clearAllCapturedPackets}
      setActiveCaptureConnection={setActiveCaptureConnection}
      capturedPacketsMap={capturedPacketsMap}
      showMinimap={preferences.showMinimap}
      pan={pan}
      showShortcutsModal={showShortcutsModal}
      showEventLogs={preferences.showEventLogs}
      showLogPanel={showLogPanel}
    />
  );
}



