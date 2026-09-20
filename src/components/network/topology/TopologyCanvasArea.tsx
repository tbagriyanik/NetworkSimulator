'use client';

import React, { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { CanvasDevice, CanvasConnection, ContextMenuState } from '../NetworkTopology/types/networkTopology.types';
import { SwitchState, CableInfo } from '@/lib/network/types';
import { PingAnimationState } from '@/hooks/networkTopology/usePingSequence';

import { TopologyFullscreenButton } from './TopologyFullscreenButton';
import { TopologyPaletteSheet } from './TopologyPaletteSheet';
import { PingCursorOverlay } from './PingCursorOverlay';
import { TopologySelectionToolbar } from './TopologySelectionToolbar';
import { NetworkCanvas } from '../NetworkTopology/NetworkCanvas';
import { CanvasToolbar } from './CanvasToolbar';
import { TopologyModalsContainer } from './TopologyModalsContainer';
import { DEVICE_ICONS } from './DeviceIcons';

export interface TopologyCanvasAreaProps {
  isFullscreen: boolean;
  isDark: boolean;
  t: Record<string, any>;
  language: string;
  toggleFullscreen: () => void;
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  isTR: boolean;
  addDevice: (type: 'pc' | 'iot' | 'switch' | 'router' | 'firewall' | 'wlc' | 'hub' | 'cloud' | 'mobile' | 'printer', layer?: 'L2' | 'L3') => void;
  cableInfo: CableInfo;
  onCableChange?: (cable: CableInfo) => void;
  pingMode: boolean;
  setPingMode: (active: boolean) => void;
  pingCursorPos: { x: number; y: number } | null;
  pingSource: CanvasDevice | null;
  selectedDeviceIds: string[];
  deviceMap: Map<string, CanvasDevice>;
  handleAlign: (alignment: any) => void;
  setSelectedDeviceIds: React.Dispatch<React.SetStateAction<string[]>>;
  onDeviceSelect?: any;
  saveToHistory: () => void;
  deleteDevice: (id: string) => void;

  canvasRef: React.RefObject<HTMLDivElement | null>;
  svgContentGroupRef: React.RefObject<SVGGElement | null>;
  isPanning: boolean;
  isSelecting: boolean;
  selectedDeviceSet: Set<string>;
  selectedNoteIds: string[];
  connectionStart: { deviceId: string; portId: string; point: { x: number; y: number } } | null;
  mousePos: { x: number; y: number };
  isDrawingConnection: boolean;
  contextMenu: ContextMenuState | null;
  noteTextareaRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  isActuallyDragging: boolean;
  isTouchDragging: boolean;
  deviceStates?: Map<string, SwitchState>;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  notes: any[];
  visibleConnections: CanvasConnection[];
  visibleNotes: any[];
  devicesSortedForRender: CanvasDevice[];
  activeDeviceId?: string | null;
  iotUpdateTrigger: number;
  graphicsQuality: string;
  zoom: number;
  environment: any;
  selectionBox: { start: { x: number; y: number }; current: { x: number; y: number } } | null;
  hoveredConnectionId: string | null;

  handleCanvasMouseDown: (e: ReactMouseEvent) => void;
  handleTouchStart: (e: ReactTouchEvent) => void;
  handleTouchMove: (e: ReactTouchEvent) => void;
  handleTouchEnd: (e: ReactTouchEvent) => void;
  handleContextMenu: (e: ReactMouseEvent) => void;
  handleNoteHeaderMouseDown: (e: ReactMouseEvent, id: string) => void;
  handleNoteHeaderTouchStart: (e: ReactTouchEvent, id: string) => void;
  cycleNoteColor: (id: string) => void;
  cycleNoteFont: (id: string) => void;
  cycleNoteFontSize: (id: string) => void;
  cycleNoteOpacity: (id: string) => void;
  duplicateNote: (id: string) => void;
  deleteNote: (id: string) => void;
  updateNoteText: (id: string, text: string) => void;
  setNoteTextSelection: any;
  handleNoteResizeStart: (e: ReactMouseEvent, id: string, dir: string) => void;
  handleNoteResizeTouchStart: (e: ReactTouchEvent, id: string, dir: string) => void;
  bringNoteToFront: (id: string) => void;
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<string[]>>;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  setSelectAllMode: React.Dispatch<React.SetStateAction<boolean>>;
  cancelConnectionDrawing: () => void;
  setPingCursorPos: (pos: { x: number; y: number } | null) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  handleZoomWheel: (e: React.WheelEvent) => void;
  resetView: () => void;
  getCanvasDimensions: () => { width: number; height: number };
  renderDevice: (device: CanvasDevice, isDragging?: boolean) => React.ReactNode;
  handleConnectionMouseEnter: any;
  handleConnectionMouseLeave: () => void;
  handleConnectionClick: any;
  onDeleteConnection: (connId: string) => void;
  onToggleConnectionActive: (connId: string) => void;
  pingAnimation: PingAnimationState | null;
  handleEnvelopeClick: (packet: any) => void;

  showZoomToolbar: boolean;
  zoomToFit: () => void;
  handleZoomMouseDown: (e: ReactMouseEvent) => void;
  isDraggingZoom: boolean;
  MIN_ZOOM: number;
  MAX_ZOOM: number;
  setShowLogPanel: React.Dispatch<React.SetStateAction<boolean>>;
  networkEventLogsCount: number;
  setIsMinimapOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMinimapOpen: boolean;
  snapToGrid: boolean;
  setSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcutsModal: React.Dispatch<React.SetStateAction<boolean>>;

  // Modals Container Props
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  NOTE_FONTS: string[];
  clipboardLength: number;
  noteClipboardLength: number;
  historyIndex: number;
  historyLength: number;
  isExamActive: boolean;
  isPingPanelVisible: boolean;
  updateNoteStyle: (id: string, style: any) => void;
  handleNoteTextCut: (id: string) => void;
  handleNoteTextCopy: (id: string) => void;
  handleNoteTextPaste: (id: string) => void;
  handleNoteTextDelete: (id: string) => void;
  handleNoteTextSelectAll: (id: string) => void;
  pasteNotes: (x: number, y: number) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  selectAllDevices: () => void;
  handleDeviceDoubleClick: (d: CanvasDevice) => void;
  cutDevice: (ids: string[]) => void;
  copyDevice: (ids: string[]) => void;
  pasteDevice: () => void;
  startDeviceConfig: (id: string) => void;
  pingModeRef: React.MutableRefObject<boolean>;
  setPingSource: (src: CanvasDevice | null) => void;
  pingSourceRef: React.MutableRefObject<CanvasDevice | null>;
  setPingResult: (res: any) => void;
  togglePowerDevices: (ids: string[]) => void;
  onOpenTasks?: (deviceId: string) => void;
  handleRefresh?: () => void;
  portTooltip: any;
  getIotDeviceStatus: (d: CanvasDevice) => any;
  getIotPowerStatus: (d: CanvasDevice) => any;
  getIotOpenCloseStatus: (d: CanvasDevice) => any;
  getLivePortVlanText: (deviceId: string, portId: string) => string;
  connectionTooltip: any;
  CABLE_COLORS: any;
  deviceTooltip: any;
  isDraggingInteractionDisabled: boolean;
  configuringDevice: string | null;
  cancelDeviceConfig: () => void;
  saveDeviceConfig: (deviceId: string, updates: Partial<CanvasDevice>) => void;
  isMobile: boolean;
  hopPacketInfos: any[];
  handlePingPlay: () => void;
  handlePingPause: () => void;
  handlePingNext: () => void;
  handlePingClose: () => void;
  onPacketPanelFocus?: () => void;
  packetPanelZIndex?: number;
  packetPopupHop: number | null;
  setPacketPopupHop: (hop: number | null) => void;
  errorToast: any;
  setErrorToast: (toast: any) => void;
  connectionError: any;
  mobilePaletteOpen: boolean;
  setMobilePaletteOpen: (open: boolean) => void;
  showPortSelector: boolean;
  portSelectorStep: any;
  selectedSourcePort: any;
  setShowPortSelector: (show: boolean) => void;
  setPortSelectorStep: (step: any) => void;
  setSelectedSourcePort: (port: any) => void;
  setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
  setDevices: React.Dispatch<React.SetStateAction<CanvasDevice[]>>;
  activeCaptureConnectionId: string | null;
  clearCapturedPackets: (id: string) => void;
  clearAllCapturedPackets: () => void;
  setActiveCaptureConnection: (id: string | null) => void;
  capturedPacketsMap: any;
  showMinimap: boolean;
  pan: { x: number; y: number };
  showShortcutsModal: boolean;
  showEventLogs: boolean;
  showLogPanel: boolean;
}

export function TopologyCanvasArea(props: TopologyCanvasAreaProps) {
  const {
    isFullscreen,
    isDark,
    t,
    language,
    toggleFullscreen,
    isPaletteOpen,
    setIsPaletteOpen,
    isTR,
    addDevice,
    cableInfo,
    onCableChange,
    pingMode,
    setPingMode,
    pingCursorPos,
    pingSource,
    selectedDeviceIds,
    deviceMap,
    handleAlign,
    setSelectedDeviceIds,
    onDeviceSelect,
    saveToHistory,
    deleteDevice,

    canvasRef,
    svgContentGroupRef,
    isPanning,
    isSelecting,
    selectedDeviceSet,
    selectedNoteIds,
    connectionStart,
    mousePos,
    isDrawingConnection,
    contextMenu,
    noteTextareaRefs,
    isActuallyDragging,
    isTouchDragging,
    deviceStates,
    devices,
    connections,
    notes,
    visibleConnections,
    visibleNotes,
    devicesSortedForRender,
    activeDeviceId,
    iotUpdateTrigger,
    graphicsQuality,
    zoom,
    environment,
    selectionBox,
    hoveredConnectionId,

    handleCanvasMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleContextMenu,
    handleNoteHeaderMouseDown,
    handleNoteHeaderTouchStart,
    cycleNoteColor,
    cycleNoteFont,
    cycleNoteFontSize,
    cycleNoteOpacity,
    duplicateNote,
    deleteNote,
    updateNoteText,
    setNoteTextSelection,
    handleNoteResizeStart,
    handleNoteResizeTouchStart,
    bringNoteToFront,
    setSelectedNoteIds,
    setContextMenu,
    setSelectAllMode,
    cancelConnectionDrawing,
    setPingCursorPos,
    setZoom,
    setPan,
    handleZoomWheel,
    resetView,
    getCanvasDimensions,
    renderDevice,
    handleConnectionMouseEnter,
    handleConnectionMouseLeave,
    handleConnectionClick,
    onDeleteConnection,
    onToggleConnectionActive,
    pingAnimation,
    handleEnvelopeClick,

    showZoomToolbar,
    zoomToFit,
    handleZoomMouseDown,
    isDraggingZoom,
    MIN_ZOOM,
    MAX_ZOOM,
    setShowLogPanel,
    networkEventLogsCount,
    setIsMinimapOpen,
    isMinimapOpen,
    snapToGrid,
    setSnapToGrid,
    setShowShortcutsModal,

    contextMenuRef,
    NOTE_FONTS,
    clipboardLength,
    noteClipboardLength,
    historyIndex,
    historyLength,
    isExamActive,
    isPingPanelVisible,
    updateNoteStyle,
    handleNoteTextCut,
    handleNoteTextCopy,
    handleNoteTextPaste,
    handleNoteTextDelete,
    handleNoteTextSelectAll,
    pasteNotes,
    handleUndo,
    handleRedo,
    selectAllDevices,
    handleDeviceDoubleClick,
    cutDevice,
    copyDevice,
    pasteDevice,
    startDeviceConfig,
    pingModeRef,
    setPingSource,
    pingSourceRef,
    setPingResult,
    togglePowerDevices,
    onOpenTasks,
    handleRefresh,
    portTooltip,
    getIotDeviceStatus,
    getIotPowerStatus,
    getIotOpenCloseStatus,
    getLivePortVlanText,
    connectionTooltip,
    CABLE_COLORS,
    deviceTooltip,
    isDraggingInteractionDisabled,
    configuringDevice,
    cancelDeviceConfig,
    saveDeviceConfig,
    isMobile,
    hopPacketInfos,
    handlePingPlay,
    handlePingPause,
    handlePingNext,
    handlePingClose,
    onPacketPanelFocus,
    packetPanelZIndex,
    packetPopupHop,
    setPacketPopupHop,
    errorToast,
    setErrorToast,
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
    showMinimap,
    pan,
    showShortcutsModal,
    showEventLogs,
    showLogPanel,
  } = props;

  React.useEffect(() => {
    const handleStartConfig = (e: Event) => {
      const customEvent = e as CustomEvent<{ deviceId: string }>;
      if (customEvent.detail?.deviceId && startDeviceConfig) {
        startDeviceConfig(customEvent.detail.deviceId);
      }
    };
    window.addEventListener('trigger-start-device-config', handleStartConfig);
    return () => window.removeEventListener('trigger-start-device-config', handleStartConfig);
  }, [startDeviceConfig]);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className={`${isFullscreen ? 'fixed inset-0 z-[9999] overflow-hidden' : 'relative w-full h-full'} flex flex-col ${
        isDark
          ? 'bg-gradient-to-br from-secondary-800/90 via-secondary-700/80 to-secondary-800/90'
          : 'bg-gradient-to-br from-primary-50/50 via-white to-secondary-50/80'
      }`}
    >
      {isFullscreen && (
        <TopologyFullscreenButton isDark={isDark} label={t.exit} onClick={toggleFullscreen} />
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative flex flex-col">
          {/* Palette Sheet */}
          <TopologyPaletteSheet
            isPaletteOpen={isPaletteOpen}
            setIsPaletteOpen={setIsPaletteOpen}
            isDark={isDark}
            isTR={isTR}
            t={t}
            addDevice={addDevice}
            cableInfo={cableInfo}
            onCableChange={onCableChange || (() => {})}
            DEVICE_ICONS={DEVICE_ICONS}
          />
          
          {/* Ping Mode Target/Source Overlay Badge */}
          <PingCursorOverlay
            pingMode={pingMode}
            pingCursorPos={pingCursorPos}
            pingSource={pingSource}
            isDark={isDark}
            t={{ selectTarget: t.selectTarget, selectSource: t.selectSource }}
          />

          {/* Multiple Selection Indicator & Tools */}
          <TopologySelectionToolbar
            isDark={isDark}
            t={t}
            selectedDeviceIds={selectedDeviceIds}
            deviceMap={deviceMap}
            handleAlign={handleAlign}
            setSelectedDeviceIds={setSelectedDeviceIds}
            onDeviceSelect={onDeviceSelect || (() => {})}
            saveToHistory={saveToHistory}
            deleteDevice={deleteDevice}
            togglePowerDevices={togglePowerDevices}
          />

          <NetworkCanvas
            canvasRef={canvasRef}
            svgContentGroupRef={svgContentGroupRef}
            isDark={isDark}
            isPanning={isPanning}
            isSelecting={isSelecting}
            pingMode={pingMode}
            pingSource={pingSource}
            selectedDeviceIds={selectedDeviceIds}
            selectedDeviceSet={selectedDeviceSet}
            selectedNoteIds={selectedNoteIds}
            connectionStart={connectionStart}
            mousePos={mousePos}
            isDrawingConnection={isDrawingConnection}
            cableInfo={cableInfo}
            contextMenu={contextMenu}
            noteTextareaRefs={noteTextareaRefs}
            isActuallyDragging={isActuallyDragging}
            isTouchDragging={isTouchDragging}
            deviceMap={deviceMap}
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
            pan={pan}
            environment={environment}
            t={t}
            language={language}
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
            setSelectedDeviceIds={setSelectedDeviceIds}
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
            onDeleteConnection={onDeleteConnection}
            onToggleConnectionActive={onToggleConnectionActive}
            pingAnimation={pingAnimation}
            handleEnvelopeClick={handleEnvelopeClick}
            isDarkForPing={isDark}
            tForPing={t}
          />

          {/* Zoom Controls */}
          {showZoomToolbar && (
            <CanvasToolbar
              zoom={zoom}
              setZoom={setZoom}
              setPan={setPan}
              canvasRef={canvasRef}
              resetView={resetView}
              zoomToFit={zoomToFit}
              handleZoomMouseDown={handleZoomMouseDown}
              handleZoomWheel={handleZoomWheel}
              isDraggingZoom={isDraggingZoom}
              isDark={isDark}
              t={t}
              MIN_ZOOM={MIN_ZOOM}
              MAX_ZOOM={MAX_ZOOM}
              onToggleLogPanel={() => setShowLogPanel((prev) => !prev)}
              logCount={networkEventLogsCount}
              onToggleMinimap={() => setIsMinimapOpen((prev) => !prev)}
              isMinimapOpen={isMinimapOpen}
              snapToGrid={snapToGrid}
              onToggleSnapToGrid={() => setSnapToGrid((prev) => !prev)}
              onOpenShortcutsModal={() => setShowShortcutsModal(true)}
            />
          )}
        </div>
      </div>

      <TopologyModalsContainer
        contextMenu={contextMenu}
        contextMenuRef={contextMenuRef}
        isDark={isDark}
        language={language as 'tr' | 'en'}
        noteFonts={NOTE_FONTS}
        notes={notes}
        devices={devices}
        selectedDeviceIds={selectedDeviceIds}
        clipboardLength={clipboardLength}
        noteClipboardLength={noteClipboardLength}
        historyIndex={historyIndex}
        historyLength={historyLength}
        isExamActive={isExamActive}
        isPingPanelVisible={isPingPanelVisible}
        setContextMenu={setContextMenu}
        updateNoteStyle={(id, style) => updateNoteStyle(id, style)}
        handleNoteTextCut={(id) => handleNoteTextCut(id)}
        handleNoteTextCopy={(id) => handleNoteTextCopy(id)}
        handleNoteTextPaste={(id) => handleNoteTextPaste(id)}
        handleNoteTextDelete={(id) => handleNoteTextDelete(id)}
        handleNoteTextSelectAll={(id) => handleNoteTextSelectAll(id)}
        duplicateNote={(id) => duplicateNote(id)}
        pasteNotes={(x, y) => pasteNotes(x, y)}
        handleUndo={() => handleUndo()}
        handleRedo={() => handleRedo()}
        selectAllDevices={() => selectAllDevices()}
        handleDeviceDoubleClick={(d) => handleDeviceDoubleClick(d)}
        saveToHistory={() => saveToHistory()}
        cutDevice={(ids) => cutDevice(ids)}
        copyDevice={(ids) => copyDevice(ids)}
        pasteDevice={() => pasteDevice()}
        deleteDevice={(id) => deleteDevice(id)}
        setSelectedDeviceIds={setSelectedDeviceIds}
        startDeviceConfig={startDeviceConfig}
        deviceMap={deviceMap}
        setPingMode={setPingMode}
        pingModeRef={pingModeRef}
        setPingSource={setPingSource}
        pingSourceRef={pingSourceRef}
        setPingResult={setPingResult}
        togglePowerDevices={(ids) => togglePowerDevices(ids)}
        onOpenTasks={onOpenTasks}
        handleRefresh={handleRefresh || (() => {})}
        portTooltip={portTooltip}
        deviceStates={deviceStates}
        getIotDeviceStatus={getIotDeviceStatus}
        getIotPowerStatus={getIotPowerStatus}
        getIotOpenCloseStatus={getIotOpenCloseStatus}
        getLivePortVlanText={getLivePortVlanText}
        connectionTooltip={connectionTooltip}
        CABLE_COLORS={CABLE_COLORS}
        deviceTooltip={deviceTooltip}
        isTR={isTR}
        isDraggingInteractionDisabled={isDraggingInteractionDisabled}
        t={t}
        configuringDevice={configuringDevice}
        cancelDeviceConfig={cancelDeviceConfig}
        saveDeviceConfig={saveDeviceConfig}
        isMobile={isMobile}
        pingAnimation={pingAnimation}
        hopPacketInfos={hopPacketInfos}
        handlePingPlay={handlePingPlay}
        handlePingPause={handlePingPause}
        handlePingNext={handlePingNext}
        handlePingClose={handlePingClose}
        graphicsQuality={graphicsQuality as 'high' | 'low'}
        onPacketPanelFocus={onPacketPanelFocus}
        packetPanelZIndex={packetPanelZIndex}
        packetPopupHop={packetPopupHop}
        setPacketPopupHop={setPacketPopupHop}
        errorToast={errorToast}
        setErrorToast={setErrorToast}
        connectionError={connectionError}
        mobilePaletteOpen={mobilePaletteOpen}
        setMobilePaletteOpen={setMobilePaletteOpen}
        addDevice={addDevice}
        cableInfo={cableInfo}
        onCableChange={onCableChange || (() => {})}
        showPortSelector={showPortSelector}
        portSelectorStep={portSelectorStep}
        selectedSourcePort={selectedSourcePort}
        setShowPortSelector={setShowPortSelector}
        setPortSelectorStep={setPortSelectorStep}
        setSelectedSourcePort={setSelectedSourcePort}
        setConnections={setConnections}
        setDevices={setDevices}
        connections={connections}
        activeCaptureConnectionId={activeCaptureConnectionId}
        clearCapturedPackets={clearCapturedPackets}
        clearAllCapturedPackets={clearAllCapturedPackets}
        setActiveCaptureConnection={setActiveCaptureConnection}
        capturedPacketsMap={capturedPacketsMap}
        showMinimap={showMinimap}
        isMinimapOpen={isMinimapOpen}
        setIsMinimapOpen={setIsMinimapOpen}
        zoom={zoom}
        pan={pan}
        setPan={setPan}
        setZoom={setZoom}
        zoomToFit={zoomToFit}
        canvasRef={canvasRef}
        showShortcutsModal={showShortcutsModal}
        setShowShortcutsModal={setShowShortcutsModal}
        showEventLogs={showEventLogs}
        showLogPanel={showLogPanel}
        setShowLogPanel={setShowLogPanel}
      />
    </div>
  );
}

