'use client';

import React from 'react';
import { CABLE_COLORS } from '../networkTopology.constants';
import { getConnectionStatusMessage, getPortPosition, getDeviceCenter, getDevicePairKey } from '../networkTopology.helpers';
import { ConnectionLine } from '../ConnectionLine';
import { ConnectionHandle } from '../ConnectionHandle';
import { NoteNode } from './NoteNode';
import { TempConnection } from './TempConnection';
import { EnvironmentBackgrounds } from './EnvironmentBackgrounds';
import { CanvasDefs } from './CanvasDefs';
import { SelectionBoxOverlay } from './SelectionBoxOverlay';
import { PingAnimationOverlay } from './PingAnimationOverlay';
import { TopologyAreaOverlay } from './TopologyAreaOverlay';
import type { PingAnimationOverlayProps } from './PingAnimationOverlay';
import type { CanvasConnection, CanvasDevice, CanvasNote, ContextMenuState } from '../networkTopology.types';
import type { SwitchState, CableInfo } from '@/lib/network/types';
import { useUiPreferences } from '@/hooks/useUiPreferences';

export interface TopologyCanvasLayerProps {
    canvasRef: React.RefObject<HTMLDivElement | null>;
    svgContentGroupRef: React.RefObject<SVGGElement | null>;
    isDark: boolean;
    isPanning: boolean;
    isSelecting: boolean;
    pingMode: boolean;
    pingSource: CanvasDevice | null;
    selectedDeviceIds: string[];
    selectedDeviceSet: Set<string>;
    selectedNoteIds: string[];
    connectionStart: { deviceId: string; portId: string; point: { x: number; y: number } } | null;
    mousePos: { x: number; y: number };
    isDrawingConnection: boolean;
    cableInfo: CableInfo;
    contextMenu: ContextMenuState | null;
    noteTextareaRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
    isActuallyDragging: boolean;
    isTouchDragging: boolean;
    deviceMap: Map<string, CanvasDevice>;
    deviceStates?: Map<string, SwitchState>;
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    notes: CanvasNote[];
    visibleConnections: CanvasConnection[];
    visibleNotes: CanvasNote[];
    devicesSortedForRender: CanvasDevice[];
    activeDeviceId?: string | null;
    mobileConnectionSource?: string | null;
    iotUpdateTrigger: number;
    graphicsQuality: 'high' | 'low';
    zoom: number;
    environment: { background?: 'none' | 'house' | 'twoStoryGarage' | 'greenhouse' } | null;
    t: Record<string, string>;
    language: 'tr' | 'en';
    selectionBox: { start: { x: number; y: number }; current: { x: number; y: number } } | null;
    hoveredConnectionId?: string | null;
    activeCaptureConnectionId?: string | null;
    handleCanvasMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    handleTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
    handleTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
    handleTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void;
    handleContextMenu: (e: React.MouseEvent<HTMLDivElement>, deviceId?: string) => void;
    handleNoteHeaderMouseDown: (e: React.MouseEvent, noteId: string) => void;
    handleNoteHeaderTouchStart: (e: React.TouchEvent, noteId: string) => void;
    cycleNoteColor: (noteId: string) => void;
    cycleNoteFont: (noteId: string) => void;
    cycleNoteFontSize: (noteId: string) => void;
    cycleNoteOpacity: (noteId: string) => void;
    duplicateNote: (noteId: string) => void;
    deleteNote: (noteId: string) => void;
    updateNoteText: (noteId: string, text: string) => void;
    setNoteTextSelection: React.Dispatch<React.SetStateAction<{ noteId: string; start: number; end: number } | null>>;
    handleNoteResizeStart: (e: React.MouseEvent, noteId: string, direction?: string) => void;
    handleNoteResizeTouchStart: (e: React.TouchEvent, noteId: string, direction?: string) => void;
    bringNoteToFront: (noteId: string) => void;
    setSelectedNoteIds: React.Dispatch<React.SetStateAction<string[]>>;
    setSelectedDeviceIds: React.Dispatch<React.SetStateAction<string[]>>;
    setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
    setSelectAllMode: React.Dispatch<React.SetStateAction<boolean>>;
    cancelConnectionDrawing: () => void;
    setPingCursorPos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
    handleZoomWheel?: (e: React.WheelEvent) => void;
    resetView?: () => void;
    getCanvasDimensions: () => { width: number; height: number };
    renderDevice: (device: CanvasDevice, isDragging?: boolean) => React.ReactNode;
    handleConnectionMouseEnter: (e: React.MouseEvent<SVGPathElement>, connectionId: string, sourceName: string, sourcePort: string, targetName: string, targetPort: string, cableType: string, statusText: string) => void;
    handleConnectionMouseLeave: () => void;
    handleConnectionClick: (e: React.MouseEvent, connectionId: string) => void;
    onDeleteConnection: (connectionId: string) => void;
    onToggleConnectionActive: (connectionId: string) => void;
    pingAnimation: PingAnimationOverlayProps['pingAnimation'];
    handleEnvelopeClick: PingAnimationOverlayProps['handleEnvelopeClick'];
    isDarkForPing: boolean;
    tForPing: Record<string, string>;
}

export function TopologyCanvasLayer({
    canvasRef,
    svgContentGroupRef,
    isDark,
    isPanning,
    isSelecting,
    pingMode,
    pingSource: _pingSource,
    selectedDeviceIds,
    selectedDeviceSet: _selectedDeviceSet,
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
    activeDeviceId: _activeDeviceId,
    mobileConnectionSource: _mobileConnectionSource,
    iotUpdateTrigger: _iotUpdateTrigger,
    graphicsQuality,
    zoom,
    environment,
    t,
    language,
    selectionBox,
    hoveredConnectionId,
    activeCaptureConnectionId,
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
    setSelectAllMode: _setSelectAllMode,
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
    pingAnimation,
    handleEnvelopeClick,
    isDarkForPing,
    tForPing,
}: TopologyCanvasLayerProps) {
    const { preferences } = useUiPreferences();
    const canvasSize = getCanvasDimensions();
    const connectionGroups = React.useMemo(() => {
        const groups = new Map<string, string[]>();
        connections.forEach((item) => {
            const pair = getDevicePairKey(item.sourceDeviceId, item.targetDeviceId);
            const ids = groups.get(pair);
            if (ids) ids.push(item.id);
            else groups.set(pair, [item.id]);
        });
        return groups;
    }, [connections]);

    return (
        <div
            ref={canvasRef}
            className={`w-full h-full flex-1 min-h-[500px] overflow-hidden relative touch-none select-none print:overflow-visible print:h-auto print:min-h-full topology-print-area topology-canvas ${pingMode || isSelecting ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
            role="application"
            aria-label={t.topologyAriaLabel}
            tabIndex={0}
            onWheel={handleZoomWheel}
            onMouseDown={handleCanvasMouseDown}
            onAuxClick={(e) => { if (e.button === 1) e.preventDefault(); }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseMove={(e) => {
                if (pingMode) setPingCursorPos({ x: e.clientX, y: e.clientY });
            }}
            onMouseLeave={() => setPingCursorPos(null)}
            onDoubleClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('[data-device-id]') || target.closest('[data-note-id]')) {
                    return;
                }
                if (resetView) {
                    resetView();
                } else {
                    setZoom(1.0);
                    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
                    const topMargin = isMobile ? 110 : 55;
                    const sideMargin = isMobile ? 16 : 24;
                    if (devices.length === 0 && notes.length === 0) {
                        setPan({ x: sideMargin, y: topMargin });
                    } else {
                        const minDeviceX = devices.length ? Math.min(...devices.map(d => d.x)) : Infinity;
                        const minDeviceY = devices.length ? Math.min(...devices.map(d => d.y)) : Infinity;
                        const minNoteX = notes.length ? Math.min(...notes.map(n => n.x)) : Infinity;
                        const minNoteY = notes.length ? Math.min(...notes.map(n => n.y)) : Infinity;
                        const minX = Math.min(minDeviceX, minNoteX);
                        const minY = Math.min(minDeviceY, minNoteY);
                        setPan({
                            x: sideMargin - minX,
                            y: topMargin - minY
                        });
                    }
                }
            }}
            onClick={() => {
                canvasRef.current?.focus();
                cancelConnectionDrawing();
                setContextMenu(null);
            }}
            onContextMenu={(e) => {
                const target = e.target as HTMLElement;
                const noteElement = target.closest('[data-note-id]');
                const textareaElement = noteElement?.querySelector('textarea');
                const contentEditableElement = noteElement?.querySelector('[contenteditable]');
                const isEditingNote = Boolean(textareaElement?.matches(':focus') || contentEditableElement?.matches(':focus'));

                if (isEditingNote) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                const deviceId = target.closest('[data-device-id]')?.getAttribute('data-device-id') ?? undefined;
                handleContextMenu(e as unknown as React.MouseEvent<HTMLDivElement>, deviceId);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    cancelConnectionDrawing();
                }
            }}
        >
            <svg width="100%" height="100%" className="block select-none print:w-full print:h-auto print:block">
                <g ref={svgContentGroupRef} data-content-group="true" style={{ transformOrigin: '0 0', transition: 'none', willChange: 'transform' }}>
                    <CanvasDefs isDark={isDark} canvasWidth={canvasSize.width} canvasHeight={canvasSize.height} />

                    <g clipPath="url(#canvasClip)">
                        {/* Empty State - Welcome Screen */}
                        {devices.length === 0 && (
                            <g className="pointer-events-none">
                                <rect x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="transparent" />
                                <foreignObject x="0" y="0" width={canvasSize.width} height={canvasSize.height}>
                                    <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none">
                                        <div className={`text-center p-8 rounded-2xl max-w-md ${isDark ? 'bg-secondary-900/50 border border-secondary-700' : 'bg-white/80 border border-gray-200'}`}>
                                            <div className="text-6xl mb-4">🌐</div>
                                            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {language === 'tr' ? 'Network Simulator\'a Hoş Geldiniz' : 'Welcome to Network Simulator'}
                                            </h2>
                                            <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {language === 'tr'
                                                    ? 'Ağ topolojisi oluşturmak için bir cihaz ekleyin veya örnek projelerden birini yükleyin.'
                                                    : 'Add a device to start building your network topology or load an example project.'}
                                            </p>
                                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {language === 'tr' ? '💡 İpucu: Sol üst köşedeki cihaz paletini kullanın' : '💡 Tip: Use the device palette in the top left corner'}
                                            </div>
                                        </div>
                                    </div>
                                </foreignObject>
                            </g>
                        )}
                        <rect x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="url(#canvasBgGradient)" />
                        <rect data-export-hide="true" x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="url(#canvasAmbientGlow)" />
                        <rect data-export-hide="true" x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="url(#canvasAmbientGlowSecondary)" />
                        <rect data-export-hide="true" x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="url(#majorGridPattern)" />
                        <rect data-export-hide="true" x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="url(#gridPattern)" />

                        <EnvironmentBackgrounds environment={environment} isDark={isDark} t={t} />

                        {/* VLAN, OSPF, BGP Area Overlay Highlighting */}
                        <TopologyAreaOverlay
                            devices={devices}
                            deviceStates={deviceStates}
                            overlayMode={preferences.areaOverlayMode || 'none'}
                            zoom={zoom}
                            isDark={isDark}
                        />

                        {/* Notes are intentionally below cables and devices in SVG paint order. */}
                        {visibleNotes.map((note) => (
                            <NoteNode
                                key={note.id}
                                note={note}
                                isDark={isDark}
                                selectedNoteIds={selectedNoteIds}
                                draggedNoteId={null}
                                contextMenu={contextMenu}
                                language={language}
                                t={t}
                                noteTextareaRefs={noteTextareaRefs}
                                devices={devices}
                                connections={connections}
                                notes={notes}
                                setSelectedNoteIds={setSelectedNoteIds}
                                setSelectedDeviceIds={setSelectedDeviceIds}
                                setContextMenu={setContextMenu}
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
                                onTopologyChange={undefined}
                                handleNoteResizeStart={handleNoteResizeStart}
                                handleNoteResizeTouchStart={handleNoteResizeTouchStart}
                                bringNoteToFront={bringNoteToFront}
                            />
                        ))}

                        {visibleConnections.map((conn) => {
                            const sourceDevice = deviceMap.get(conn.sourceDeviceId);
                            const targetDevice = deviceMap.get(conn.targetDeviceId);
                            if (!sourceDevice || !targetDevice) return null;

                            const ids = connectionGroups.get(getDevicePairKey(conn.sourceDeviceId, conn.targetDeviceId)) ?? [];
                            const rawIndex = ids.indexOf(conn.id);
                            const sameConnIndex = rawIndex >= 0 ? rawIndex : 0;
                            const totalSameConns = ids.length || 1;

                            return (
                                <React.Fragment key={`connection-group-${conn.id}`}>
                                    <ConnectionLine
                                        connection={conn}
                                        sourceDevice={sourceDevice}
                                        targetDevice={targetDevice}
                                        isDark={isDark}
                                        isDragging={isActuallyDragging || isTouchDragging}
                                        totalSameConns={totalSameConns}
                                        sameConnIndex={sameConnIndex}
                                        getPortPosition={getPortPosition}
                                        CABLE_COLORS={CABLE_COLORS}
                                        zoom={zoom}
                                        graphicsQuality={graphicsQuality}
                                        showLabel={preferences.showPortLabels}
                                        isHovered={hoveredConnectionId === conn.id || activeCaptureConnectionId === conn.id}
                                        onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => handleConnectionMouseEnter(e, conn.id, sourceDevice.name, conn.sourcePort, targetDevice.name, conn.targetPort, conn.cableType, getConnectionStatusMessage(conn, devices, language))}
                                        onMouseLeave={handleConnectionMouseLeave}
                                        onClick={(e: React.MouseEvent) => handleConnectionClick(e, conn.id)}
                                        deviceStates={deviceStates}
                                        topologyDevices={devices}
                                    />
                                    <ConnectionHandle
                                        connection={conn}
                                        sourceDevice={sourceDevice}
                                        targetDevice={targetDevice}
                                        isDark={isDark}
                                        sameConnIndex={sameConnIndex}
                                        totalSameConns={totalSameConns}
                                        getPortPosition={getPortPosition}
                                        onDelete={onDeleteConnection}
                                    />
                                </React.Fragment>
                            );
                        })}

                        <TempConnection
                            isDrawingConnection={isDrawingConnection}
                            connectionStart={connectionStart}
                            mousePos={mousePos}
                            cableInfo={cableInfo}
                            CABLE_COLORS={CABLE_COLORS}
                        />

                        {devicesSortedForRender.map((device) => (
                            <React.Fragment key={device.id}>{renderDevice(device, false)}</React.Fragment>
                        ))}

                        <PingAnimationOverlay
                            pingAnimation={pingAnimation}
                            deviceMap={deviceMap}
                            connections={connections}
                            getPortPosition={getPortPosition}
                            getDeviceCenter={getDeviceCenter}
                            graphicsQuality={graphicsQuality}
                            isDark={isDarkForPing}
                            t={tForPing}
                            handleEnvelopeClick={handleEnvelopeClick}
                        />

                        {selectionBox && (
                            <SelectionBoxOverlay selectionBox={selectionBox} isDark={isDark} zoom={zoom} selectedDeviceCount={selectedDeviceIds.length} />
                        )}
                    </g>

                    <rect data-export-hide="true" x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="none" stroke={isDark ? 'var(--color-primary-600)' : 'var(--color-primary-700)'} strokeWidth={2 / zoom} strokeDasharray={`${6 / zoom},${4 / zoom}`} opacity={0.7} />
                    <text data-export-hide="true" x={canvasSize.width - 80} y={canvasSize.height - 10} style={{ fill: 'var(--color-secondary-500)', fontFamily: 'var(--font-geist-mono)' }} fontSize={12 / zoom}>
                        {canvasSize.width} × {canvasSize.height}
                    </text>
                </g>
            </svg>
        </div>
    );
}

