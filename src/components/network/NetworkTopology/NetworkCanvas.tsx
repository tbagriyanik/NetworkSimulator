import React from 'react';
import { TopologyCanvasLayer } from '../topology/TopologyCanvasLayer';
import { PingCursorOverlay } from '../topology/PingCursorOverlay';
import { TopologySelectionToolbar } from '../topology/TopologySelectionToolbar';
import { TopologyPaletteSheet } from '../topology/TopologyPaletteSheet';
import { ShortcutsModal } from '@/components/ui/ShortcutsModal';
import { NetworkEventLogPanel } from '../topology/NetworkEventLogPanel';

export const NetworkCanvas: React.FC<any> = ({
  canvasRef,
  svgContentGroupRef,
  isDark,
  isPanning,
  isSelecting,
  pingMode,
  pingSource,
  selectedDeviceIds,
  selectedDeviceSet,
  selectedNoteIds,
  connectionStart,
  mousePos,
  isDrawingConnection,
  cableInfo,
  contextMenu,
  noteTextareaRefs,
  isActuallyDragging,
  isTouchDragging,
  deviceMap,
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
  t,
  language,
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
  setSelectedDeviceIds,
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
  isDarkForPing,
  tForPing,
}) => {
  return (
    <>
      {/* Palette Sheet */}
      <TopologyPaletteSheet
        isPaletteOpen={false}
        setIsPaletteOpen={() => {}}
        isDark={isDark}
        isTR={false}
        t={t}
        addDevice={() => {}}
        cableInfo={cableInfo}
        onCableChange={() => {}}
        DEVICE_ICONS={{}}
      />

      {/* Ping Mode Target/Source Overlay Badge */}
      <PingCursorOverlay
        pingMode={pingMode}
        pingCursorPos={null}
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
        handleAlign={() => {}}
        setSelectedDeviceIds={setSelectedDeviceIds}
        onDeviceSelect={() => {}}
        saveToHistory={() => {}}
        deleteDevice={() => {}}
      />

      {/* Canvas */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {/* Live region placeholder */}
      </div>
      <TopologyCanvasLayer
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
        isDarkForPing={isDarkForPing}
        tForPing={tForPing}
      />

      {/* Zoom Controls placeholder */}

      <ShortcutsModal open={false} onOpenChange={() => {}} isDark={isDark} language={language} />

      {/* Event Logs */}
      <NetworkEventLogPanel isOpen={false} onClose={() => {}} isDark={isDark} />
    </>
  );
};
