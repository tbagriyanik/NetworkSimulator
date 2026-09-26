'use client';

import { useCallback } from 'react';
import { CanvasDevice, NetworkTopologyProps } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { getPortPosition } from '@/components/network/NetworkTopology/utils/networkTopology.helpers';
import { CABLE_COLORS, MIN_ZOOM, MAX_ZOOM, NOTE_FONTS_DESKTOP as NOTE_FONTS } from '@/components/network/NetworkTopology/utils/networkTopology.constants';
import { exportTopologyToPNG } from '@/utils/exportPNG';
import { TopologyDeviceRenderer } from '@/components/network/topology/TopologyDeviceRenderer';
import { useTopologyCanvasState } from './useTopologyCanvasState';
import { useTopologyCanvasInteractions } from './useTopologyCanvasInteractions';

export function useNetworkTopologyController(props: NetworkTopologyProps) {
  const canvasState = useTopologyCanvasState(props);
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
    isDark,
    isTR,
    setIsExporting,
    isMinimapOpen,
    setIsMinimapOpen,
    setDevices,
    setConnections,
    graphicsQuality,
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
    setSelectAllMode,
    selectionBox,
    isSelecting,
    isDrawingConnection,
    connectionStart,
    mousePos,
    contextMenu,
    setContextMenu,
    configuringDevice,
    isPaletteOpen,
    setIsPaletteOpen,
    mobilePaletteOpen,
    setMobilePaletteOpen,
    showPortSelector,
    setShowPortSelector,
    portSelectorStep,
    setPortSelectorStep,
    selectedSourcePort,
    setSelectedSourcePort,
    connectionError,
    toggleFullscreen,
  } = stateHandlers;

  const isFullscreen = props.isFullscreen || false;

  const { canvasRef, getCanvasDimensions } = canvasLifecycle;
  const { deviceMap, deviceToConnectionsMap, visibleConnections, visibleNotes, devicesSortedForRender } = derivedState;

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
          deviceStates: props.deviceStates || undefined,
          getPortPosition: interactionState.getPortPositionRef.current || getPortPosition,
        });
      } finally {
        setIsExporting(false);
      }
    }, 300);
  }, [devices, connections, notes, props.deviceStates, canvasRef, interactionState.getPortPositionRef, setIsExporting]);

  const interactions = useTopologyCanvasInteractions(props, canvasState, handleExportPNG);

  const {
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
    touchHandlers,
    mouseHandlers,
    noteActions,
    canvasClipboard,
    isDraggingInteractionDisabled,
  } = interactions;

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
        deviceStates={props.deviceStates}
        deviceToConnectionsMap={deviceToConnectionsMap}
        graphicsQuality={graphicsQuality}
        isDraggingInteractionDisabled={isDraggingInteractionDisabled}
        getLiveDeviceVlan={iot.getLiveDeviceVlan}
        getIotMeasuredValue={iot.getIotMeasuredValue}
        handlePortHover={tooltipHandlers.handlePortHover}
        handlePortMouseLeave={tooltipHandlers.handlePortMouseLeave}
        handlePortClick={interactions.portConnection.handlePortClick}
        handleDeviceMouseDown={deviceMouseHandlers.handleDeviceMouseDown}
        handleDevicePointerDown={deviceMouseHandlers.handleDevicePointerDown}
        handleDeviceClick={deviceMouseHandlers.handleDeviceClick}
        handleDeviceKeyDown={interactions.deviceNavigation.handleDeviceKeyDown}
        handleDeviceDoubleClick={deviceMouseHandlers.handleDeviceDoubleClick}
        handleDeviceMouseLeave={tooltipHandlers.handleDeviceMouseLeave}
        handleDeviceTouchStart={touchHandlers.handleDeviceTouchStart}
        handleDeviceTouchMove={touchHandlers.handleDeviceTouchMove}
        handleDeviceTouchEnd={touchHandlers.handleDeviceTouchEnd}
        _mousePosRef={mousePosRef}
        isDrawingConnection={isDrawingConnection}
        connectionStart={connectionStart}
      />
    );
  };

  return {
    isFullscreen,
    isDark,
    t,
    language,
    toggleFullscreen,
    isPaletteOpen,
    setIsPaletteOpen,
    isTR,
    addDevice: canvasActions.addDevice,
    cableInfo: props.cableInfo,
    onCableChange: props.onCableChange,
    pingMode: pingState.pingMode,
    setPingMode: pingState.setPingMode,
    pingCursorPos: pingState.pingCursorPos,
    pingSource: pingState.pingSource,
    selectedDeviceIds,
    deviceMap,
    handleAlign: deviceActions.handleAlign,
    setSelectedDeviceIds,
    onDeviceSelect: props.onDeviceSelect,
    saveToHistory: history.saveToHistory,
    deleteDevice: canvasActions.deleteDevice,

    canvasRef,
    svgContentGroupRef: interactionState.svgContentGroupRef,
    isPanning,
    isSelecting,
    selectedDeviceSet,
    selectedNoteIds,
    connectionStart,
    mousePos,
    isDrawingConnection,
    contextMenu,
    noteTextareaRefs: interactionState.noteTextareaRefs,
    isActuallyDragging: deviceDrag.isActuallyDragging,
    isTouchDragging: touchHandlers.isTouchDragging,
    deviceStates: props.deviceStates,
    devices,
    connections,
    notes,
    visibleConnections,
    visibleNotes,
    devicesSortedForRender,
    activeDeviceId: props.activeDeviceId,
    iotUpdateTrigger,
    graphicsQuality,
    zoom,
    environment,
    selectionBox,
    hoveredConnectionId: tooltipHandlers.hoveredConnectionId,

    handleCanvasMouseDown: mouseHandlers.handleCanvasMouseDown,
    handleTouchStart: touchHandlers.handleTouchStart,
    handleTouchMove: touchHandlers.handleTouchMove,
    handleTouchEnd: touchHandlers.handleTouchEnd,
    handleContextMenu: topologyContextMenu.handleContextMenu,
    handleNoteHeaderMouseDown: noteActions.handleNoteHeaderMouseDown,
    handleNoteHeaderTouchStart: noteActions.handleNoteHeaderTouchStart,
    cycleNoteColor: noteActions.cycleNoteColor,
    cycleNoteFont: noteActions.cycleNoteFont,
    cycleNoteFontSize: noteActions.cycleNoteFontSize,
    cycleNoteOpacity: noteActions.cycleNoteOpacity,
    duplicateNote: canvasActions.duplicateNote,
    deleteNote: canvasActions.deleteNote,
    updateNoteText: noteActions.updateNoteText,
    setNoteTextSelection: noteEditing.setNoteTextSelection,
    handleNoteResizeStart: noteActions.handleNoteResizeStart,
    handleNoteResizeTouchStart: noteActions.handleNoteResizeTouchStart,
    bringNoteToFront: noteEditing.bringNoteToFront,
    setSelectedNoteIds,
    setContextMenu,
    setSelectAllMode,
    cancelConnectionDrawing: connectionDrawing.cancelConnectionDrawing,
    setPingCursorPos: pingState.setPingCursorPos,
    setZoom,
    setPan,
    handleZoomWheel: zoomPan.handleZoomWheel,
    resetView: zoomPan.resetView,
    getCanvasDimensions,
    renderDevice,
    handleConnectionMouseEnter: tooltipHandlers.handleConnectionMouseEnter,
    handleConnectionMouseLeave: tooltipHandlers.handleConnectionMouseLeave,
    handleConnectionClick: tooltipHandlers.handleConnectionClick,
    onDeleteConnection: visualConnectionActions.deleteVisualConnection,
    onToggleConnectionActive: visualConnectionActions.toggleVisualConnectionActive,
    pingAnimation: pingState.pingAnimation,
    handleEnvelopeClick: pingController.handleEnvelopeClick,

    showZoomToolbar: preferences.showZoomToolbar,
    zoomToFit: zoomPan.zoomToFit,
    handleZoomMouseDown: zoomPan.handleZoomMouseDown,
    isDraggingZoom: zoomPan.isDraggingZoom,
    MIN_ZOOM,
    MAX_ZOOM,
    setShowLogPanel,
    networkEventLogsCount: networkEventLogs.length,
    setIsMinimapOpen,
    isMinimapOpen,
    snapToGrid,
    setSnapToGrid,
    setShowShortcutsModal,

    contextMenuRef: interactionState.contextMenuRef,
    NOTE_FONTS: Array.from(NOTE_FONTS),
    clipboardLength: canvasClipboard.clipboard.length,
    noteClipboardLength: noteEditing.noteClipboard.length,
    historyIndex: history.historyIndex,
    historyLength: history.historyLength,
    isExamActive: props.isExamActive || false,
    isPingPanelVisible: pingState.isPingPanelVisible,
    updateNoteStyle: noteActions.updateNoteStyle,
    handleNoteTextCut: noteEditing.handleNoteTextCut,
    handleNoteTextCopy: noteEditing.handleNoteTextCopy,
    handleNoteTextPaste: noteEditing.handleNoteTextPaste,
    handleNoteTextDelete: noteEditing.handleNoteTextDelete,
    handleNoteTextSelectAll: noteEditing.handleNoteTextSelectAll,
    pasteNotes: canvasClipboard.pasteNotes,
    handleUndo: history.handleUndo,
    handleRedo: history.handleRedo,
    selectAllDevices: canvasSelection.selectAllDevices,
    handleDeviceDoubleClick: deviceMouseHandlers.handleDeviceDoubleClick,
    cutDevice: (ids: string[]) => {
      history.saveToHistory();
      canvasClipboard.cutDevice(ids);
    },
    copyDevice: canvasClipboard.copyDevice,
    pasteDevice: canvasClipboard.pasteDevice,
    startDeviceConfig: deviceActions.startDeviceConfig,
    pingModeRef: pingState.pingModeRef,
    setPingSource: pingState.setPingSource,
    pingSourceRef: pingState.pingSourceRef,
    setPingResult: pingState.setPingResult,
    togglePowerDevices: (ids: string[]) => {
      history.saveToHistory();
      deviceActions.togglePowerDevices(ids);
    },
    onOpenTasks: props.onOpenTasks,
    handleRefresh,
    portTooltip: tooltipHandlers.portTooltip,
    getIotDeviceStatus: iot.getIotDeviceStatus,
    getIotPowerStatus: iot.getIotPowerStatus,
    getIotOpenCloseStatus: iot.getIotOpenCloseStatus,
    getLivePortVlanText: iot.getLivePortVlanText,
    connectionTooltip: tooltipHandlers.connectionTooltip,
    CABLE_COLORS,
    deviceTooltip: tooltipHandlers.deviceTooltip,
    isDraggingInteractionDisabled,
    configuringDevice,
    cancelDeviceConfig: deviceActions.cancelDeviceConfig,
    saveDeviceConfig: deviceActions.saveDeviceConfig,
    isMobile,
    hopPacketInfos: pingState.hopPacketInfos,
    handlePingPlay: pingController.handlePingPlay,
    handlePingPause: pingController.handlePingPause,
    handlePingNext: pingController.handlePingNext,
    handlePingClose: pingState.handlePingClose,
    onPacketPanelFocus: props.onPacketPanelFocus,
    packetPanelZIndex: props.packetPanelZIndex,
    packetPopupHop: pingState.packetPopupHop,
    setPacketPopupHop: pingState.setPacketPopupHop,
    errorToast: pingState.errorToast,
    setErrorToast: pingState.setErrorToast,
    connectionError,
    mobilePaletteOpen,
    setMobilePaletteOpen,
    showPortSelector,
    portSelectorStep,
    selectedSourcePort,
    setShowPortSelector,
    setPortSelectorStep,
    setSelectedSourcePort,
    setConnections,
    setDevices,
    activeCaptureConnectionId,
    clearCapturedPackets,
    clearAllCapturedPackets,
    setActiveCaptureConnection,
    capturedPacketsMap,
    showMinimap: preferences.showMinimap,
    pan,
    showShortcutsModal,
    showEventLogs: preferences.showEventLogs,
    showLogPanel,
  };
}
