'use client';

import React from 'react';
import { CABLE_COLORS } from '../NetworkTopology/utils/networkTopology.constants';
import { getConnectionStatusMessage, getPortPosition, getDeviceCenter, getDevicePairKey } from '../NetworkTopology/utils/networkTopology.helpers';
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
import type { CanvasConnection, CanvasDevice, CanvasNote, ContextMenuState } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState, CableInfo } from '@/lib/network/types';
import { useUiPreferences } from '@/hooks/useUiPreferences';

// Above this many visible cables the per-cable drop-shadow filters and flowing
// particles cost more than they communicate, so they are skipped entirely.
const DECORATIVE_EFFECTS_CONNECTION_BUDGET = 120;

/** Shared empty group so a missing pair never allocates a fresh array per frame. */
const EMPTY_ID_LIST: string[] = [];
/** Stable fallback so the connection loop never allocates a pan object per frame. */
const ZERO_PAN = { x: 0, y: 0 } as const;
/** Screen-space slack around the canvas an animated cable may drift into. */
const CONNECTION_VIEWPORT_MARGIN = 80;

/**
 * True when either cable endpoint projects inside the canvas (plus a margin).
 *
 * Kept as a module-level helper rather than inline math so the hot connection
 * loop stays a single readable call; the previous inline version recomputed the
 * same pan/zoom projection expressions for both endpoints on every frame.
 */
function isEndpointNearViewport(
    source: { x: number; y: number },
    target: { x: number; y: number },
    zoom: number,
    pan: { x: number; y: number },
    canvasWidth: number,
    canvasHeight: number
): boolean {
    const margin = CONNECTION_VIEWPORT_MARGIN;
    const minX = -margin;
    const maxX = canvasWidth + margin;
    const minY = -margin;
    const maxY = canvasHeight + margin;

    for (const point of [source, target]) {
        const screenX = point.x * zoom + pan.x;
        const screenY = point.y * zoom + pan.y;
        if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
            return true;
        }
    }
    return false;
}

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
    pan?: { x: number; y: number };
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
    pan,
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

    // Survives re-runs of the `connectionHandlers` memo below so unchanged
    // cables keep their previous closures.
    const previousHandlersRef = React.useRef(new Map<string, {
        onMouseEnter: (e: React.MouseEvent<SVGPathElement>) => void;
        onClick: (e: React.MouseEvent) => void;
        signature: string;
    }>());

    // Each active cable can add an SVG filter and two infinite particle
    // animations. On a machine without GPU compositing those effects are
    // repainted every frame, so once the topology is wide enough the budget is
    // spent and the decorations are dropped. Cable color, hover highlighting
    // and deletion handles are untouched.
    const decorativeEffectsEnabled = visibleConnections.length <= DECORATIVE_EFFECTS_CONNECTION_BUDGET;

    // Hoisted out of the connection loop below: both are constant for the whole
    // render, and the loop runs once per visible cable on every pan frame.
    const resolvedPan = pan ?? ZERO_PAN;
    const hasMeasuredCanvas = canvasSize.width > 0 && canvasSize.height > 0;

    const connectionGroups = React.useMemo(() => {
        const groups = new Map<string, string[]>();
        // Cache the per-pair list index alongside the ids so the render loop can
        // ask "which slot is this cable?" in O(1) instead of running `indexOf`
        // over the group for every cable on every canvas render.
        const indexInGroup = new Map<string, number>();
        connections.forEach((item) => {
            const pair = getDevicePairKey(item.sourceDeviceId, item.targetDeviceId);
            const ids = groups.get(pair);
            if (ids) {
                ids.push(item.id);
                indexInGroup.set(item.id, ids.length - 1);
            } else {
                groups.set(pair, [item.id]);
                indexInGroup.set(item.id, 0);
            }
        });
        return { groups, indexInGroup };
    }, [connections]);

    // Stable per-cable event handlers.
    //
    // Inline arrow functions gave every `ConnectionLine` a fresh callback on
    // every canvas render, which defeats its `memo` and forces all of them to
    // re-render even when nothing about them changed.
    //
    // The `deviceMap` dependency means this memo runs again whenever any device
    // object is replaced — which the IoT automation pass does several times a
    // second. The captured values (endpoint names, ports, cable type) hardly
    // ever change in between, so a handler is reused whenever they do not.
    // On a wide topology that turns thousands of short-lived closures per tick
    // into a handful.
    const connectionHandlers = React.useMemo(() => {
        const handlers = new Map<string, {
            onMouseEnter: (e: React.MouseEvent<SVGPathElement>) => void;
            onClick: (e: React.MouseEvent) => void;
            signature: string;
        }>();

        for (const conn of visibleConnections) {
            const sourceDevice = deviceMap.get(conn.sourceDeviceId);
            const targetDevice = deviceMap.get(conn.targetDeviceId);
            if (!sourceDevice || !targetDevice) continue;

            const connId = conn.id;
            const sourceName = sourceDevice.name;
            const targetName = targetDevice.name;
            const sourcePort = conn.sourcePort;
            const targetPort = conn.targetPort;
            const cableType = conn.cableType;
            const signature = `${sourceName}|${sourcePort}|${targetName}|${targetPort}|${cableType}`;

            const previous = previousHandlersRef.current.get(connId);
            if (previous && previous.signature === signature) {
                handlers.set(connId, previous);
                continue;
            }

            // The status message is only read on hover, so it stays lazy.
            const statusMessage = () => getConnectionStatusMessage(conn, deviceMap, language, deviceStates);

            handlers.set(connId, {
                signature,
                onMouseEnter: (e) => handleConnectionMouseEnter(
                    e, connId, sourceName, sourcePort, targetName, targetPort, cableType, statusMessage()
                ),
                onClick: (e) => handleConnectionClick(e, connId),
            });
        }

        previousHandlersRef.current = handlers;
        return handlers;
    }, [visibleConnections, deviceMap, deviceStates, language, handleConnectionMouseEnter, handleConnectionClick]);

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
                    setPan({ x: 0, y: 0 });
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
            <svg width="100%" height="100%" className="block select-none print:w-full print:h-auto print:block overflow-visible">
                {/* Keep viewport movement as an SVG transform. CSS transforms on an SVG
                    group can detach foreignObject notes in WebKitGTK/WKWebView. */}
                <g ref={svgContentGroupRef} data-content-group="true" style={{ transition: 'none' }}>
                    <CanvasDefs isDark={isDark} canvasWidth={canvasSize.width} canvasHeight={canvasSize.height} />

                    {/* Empty State - Welcome Screen */}
                    {devices.length === 0 && (
                        <g className="pointer-events-none">
                            <rect x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="transparent" />
                            <foreignObject x="0" y="0" width={canvasSize.width} height={canvasSize.height}>
                                <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none">
                                    <div className={`text-center p-8 rounded-2xl max-w-md ${isDark ? 'bg-secondary-900/50 border border-secondary-700' : 'bg-white/80 border border-gray-200'}`}>
                                        <div className="text-6xl mb-4">🌐 </div>
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
                    {graphicsQuality !== 'low' && (
                        <>
                            <rect data-export-hide="true" x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="url(#canvasAmbientGlow)" />
                            <rect data-export-hide="true" x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="url(#canvasAmbientGlowSecondary)" />
                            <rect data-export-hide="true" x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="url(#majorGridPattern)" />
                        </>
                    )}
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
                        <React.Fragment key={note.id}>
                            <NoteNode
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
                        </React.Fragment>
                    ))}

                    {visibleConnections.map((conn) => {
                        const sourceDevice = deviceMap.get(conn.sourceDeviceId);
                        const targetDevice = deviceMap.get(conn.targetDeviceId);
                        if (!sourceDevice || !targetDevice) return null;

                        const ids = connectionGroups.groups.get(getDevicePairKey(conn.sourceDeviceId, conn.targetDeviceId)) ?? EMPTY_ID_LIST;
                        const sameConnIndex = connectionGroups.indexInGroup.get(conn.id) ?? 0;
                        const totalSameConns = ids.length || 1;

                        const handlers = connectionHandlers.get(conn.id);
                        if (!handlers) return null;

                        const sourcePos = getPortPosition(sourceDevice, conn.sourcePort);
                        const targetPos = getPortPosition(targetDevice, conn.targetPort);

                        // The endpoint test only decides whether the flowing
                        // particle animation runs for this cable. When the canvas
                        // has not been measured yet there is nothing to compare
                        // against, so the animation is skipped instead of assumed
                        // visible — the cable itself still renders either way.
                        const isVisibleInViewport = !hasMeasuredCanvas || isEndpointNearViewport(
                            sourcePos,
                            targetPos,
                            zoom,
                            resolvedPan,
                            canvasSize.width,
                            canvasSize.height
                        );

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
                                    showAnimation={isVisibleInViewport}
                                    showLabel={preferences.showPortLabels}
                                    enableDecorativeEffects={decorativeEffectsEnabled}
                                    isHovered={hoveredConnectionId === conn.id || activeCaptureConnectionId === conn.id}
                                    onMouseEnter={handlers.onMouseEnter}
                                    onMouseLeave={handleConnectionMouseLeave}
                                    onClick={handlers.onClick}
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
                        <React.Fragment key={device.id}>
                            {renderDevice(device, false)}
                        </React.Fragment>
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

                    <rect data-export-hide="true" x="0" y="0" width={canvasSize.width} height={canvasSize.height} fill="none" stroke={isDark ? 'var(--color-primary-600)' : 'var(--color-primary-700)'} strokeWidth={2 / zoom} strokeDasharray={`${6 / zoom},${4 / zoom}`} opacity={0.7} />
                    <text data-export-hide="true" x={canvasSize.width - 80} y={canvasSize.height - 10} style={{ fill: 'var(--color-secondary-500)', fontFamily: 'var(--font-geist-mono)' }} fontSize={12 / zoom}>
                        {canvasSize.width} × {canvasSize.height}
                    </text>
                </g>
            </svg>
        </div>
    );
}


