'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import React from 'react';
import { flushSync } from 'react-dom';
import { useAppStore, useTopologyDevices, useTopologyConnections, useTopologyNotes, useGraphicsQuality, useIsSimulationMode, useEnvironment } from '@/lib/store/appStore';
import { isCableCompatible } from '@/lib/network/types';
import { checkDeviceConnectivity, getPingDiagnostics, getWirelessDistance } from '@/lib/network/connectivity';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { useNetworkRefreshWithPositions } from '@/hooks/useNetworkRefreshWithPositions';
import { useSpatialPartitioning } from '@/lib/performance/spatial';
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipWrapper } from "@/components/ui/TooltipWrapper";
import { ShortcutBadge } from "@/components/ui/ShortcutBadge";
import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType, ContextMenuState, ContextMenuMode, NetworkTopologyProps } from './networkTopology.types';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { ConnectionLine } from './ConnectionLine';
import { ConnectionHandle } from './ConnectionHandle';
import { DeviceNode } from './DeviceNode';
import LazyNetworkTopologyContextMenu from './LazyNetworkTopologyContextMenu';
import { X } from "lucide-react";


import {
  getDeviceWidth,
  getDeviceHeight,
  getConnectionStatusMessage,
  isSwitchDeviceType,
  easeInOutCubic,
  getDeviceCenter,
  getPortPosition,
} from './networkTopology.helpers';
import { CABLE_COLORS, DRAG_THRESHOLD, LONG_PRESS_DURATION, TOOLTIP_DELAY, TOOLTIP_OFFSET_Y, VIRTUAL_CANVAS_WIDTH_MOBILE, VIRTUAL_CANVAS_HEIGHT_MOBILE, VIRTUAL_CANVAS_WIDTH_DESKTOP, VIRTUAL_CANVAS_HEIGHT_DESKTOP, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, NOTE_COLORS, NOTE_FONTS_DESKTOP as NOTE_FONTS, NOTE_FONT_SIZES, NOTE_OPACITY as NOTE_OPACITY_OPTIONS, PC_PORT_SPACING, PORT_SPACING, PORT_START_X } from './networkTopology.constants';

import { NoteNode } from './topology/NoteNode';

import { useCanvasActions } from '../../hooks/useCanvasActions';
import { exportTopologyToPNG } from '../../utils/exportPNG';

import { useCanvasZoomPan } from './hooks/useCanvasZoomPan';
import { useTopologyTouch } from './hooks/useTopologyTouch';
import { useTopologyMouse } from './hooks/useTopologyMouse';
import { useCanvasKeyboard } from './hooks/useCanvasKeyboard';
import { useCanvasClipboard } from './hooks/useCanvasClipboard';
import { useDeviceDrag } from './hooks/useDeviceDrag';
import { useCanvasSelection } from './hooks/useCanvasSelection';
import { useNoteEditing } from './hooks/useNoteEditing';
import { useConnectionDrawing } from './hooks/useConnectionDrawing';
import { useTopologyDeviceActions } from './hooks/useTopologyDeviceActions';
import { usePingAnimation } from './hooks/usePingAnimation';
import { useTopologyPingUI } from './hooks/useTopologyPingUI';
import { usePingSequence, type PingAnimationState, type BroadcastAnimTarget } from './hooks/usePingSequence';
import { useTopologyIot } from './hooks/useTopologyIot';
import { useTopologyTooltipHandlers } from './hooks/useTopologyTooltipHandlers';
import { CanvasToolbar } from './topology/CanvasToolbar';
import { DeviceRenderer } from './topology/DeviceRenderer';

import { CanvasDefs } from './topology/CanvasDefs';
import { TopologyPrintPreview } from './topology/TopologyPrintPreview';
import { TopologyPaletteSheet } from './topology/TopologyPaletteSheet';
import { TopologyTooltips } from './topology/TopologyTooltips';
import { TopologyModals } from './topology/TopologyModals';
import { TempConnection } from './topology/TempConnection';
import { EnvironmentBackgrounds } from './topology/EnvironmentBackgrounds';
import { DEVICE_ICONS } from './topology/DeviceIcons';
import { TopologySelectionToolbar } from './topology/TopologySelectionToolbar';
import { SelectionBoxOverlay } from './topology/SelectionBoxOverlay';
import { PingAnimationOverlay } from './topology/PingAnimationOverlay';



export function NetworkTopology({
  cableInfo,
  onCableChange,
  onDeviceSelect,
  onDeviceDoubleClick,
  onTopologyChange,
  onDeviceDelete,
  isActive = true,
  activeDeviceId,
  deviceStates,
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
}: NetworkTopologyProps) {
  const { language, t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isTR = language === 'tr';

  const [isExporting, setIsExporting] = useState(false);

  // Zustand store state - using granular selectors to prevent cascading re-renders
  const topologyDevices = useTopologyDevices();
  // BOLT: Memoize device map for O(1) lookups instead of repeated O(n) .find() calls
  const deviceMap = useMemo(() => {
    const map = new Map<string, CanvasDevice>();
    topologyDevices.forEach(d => map.set(d.id, d));
    return map;
  }, [topologyDevices]);

  const topologyConnections = useTopologyConnections();
  // BOLT: Memoize connection map for O(1) lookups during culling
  const connectionMap = useMemo(() => {
    const map = new Map<string, CanvasConnection>();
    topologyConnections.forEach(c => map.set(c.id, c));
    return map;
  }, [topologyConnections]);

  // BOLT: Memoize map of device ID to its connections for O(1) lookups in renderDevice
  const deviceToConnectionsMap = useMemo(() => {
    const map = new Map<string, CanvasConnection[]>();
    topologyConnections.forEach(conn => {
      const addConn = (deviceId: string) => {
        const list = map.get(deviceId);
        if (list) {
          list.push(conn);
        } else {
          map.set(deviceId, [conn]);
        }
      };

      addConn(conn.sourceDeviceId);
      // Avoid duplicate entry if device connects to itself
      if (conn.targetDeviceId !== conn.sourceDeviceId) {
        addConn(conn.targetDeviceId);
      }
    });
    return map;
  }, [topologyConnections]);

  // BOLT: Pre-calculate connection metadata (total and index for parallel cables)
  // This reduces O(C^2) operations in the render loop to O(C) pre-calculation + O(1) lookups.
  const connectionMeta = useMemo(() => {
    const meta = new Map<string, { index: number; total: number }>();
    const groupMap = new Map<string, string[]>();

    // Group connections by endpoint pairs (agnostic of direction)
    topologyConnections.forEach(conn => {
      const pair = [conn.sourceDeviceId, conn.targetDeviceId].sort().join(':');
      if (!groupMap.has(pair)) groupMap.set(pair, []);
      groupMap.get(pair)?.push(conn.id);
    });

    // Assign indices and totals
    groupMap.forEach(ids => {
      const total = ids.length;
      ids.forEach((id, index) => {
        meta.set(id, { index, total });
      });
    });

    return meta;
  }, [topologyConnections]);
  const topologyNotes = useTopologyNotes();
  const setDevices = useAppStore(state => state.setDevices);
  const setConnections = useAppStore(state => state.setConnections);
  const setNotes = useAppStore(state => state.setNotes);
  const graphicsQuality = useGraphicsQuality();
  const isSimulationMode = useIsSimulationMode();
  const activeCaptureConnectionId = useAppStore(state => state.topology.activeCaptureConnectionId);
  const setActiveCaptureConnection = useAppStore(state => state.setActiveCaptureConnection);
  const capturedPacketsMap = useAppStore(state => state.topology.capturedPackets);
  const clearCapturedPackets = useAppStore(state => state.clearCapturedPackets);

  const devices = topologyDevices;
  const connections = topologyConnections;
  const notes = topologyNotes;

  // Sync state functions for local component logic
  const setDevicesState = setDevices;
  const setConnectionsState = setConnections;
  const setNotesState = setNotes;

  // No-op effect to ensure deviceStates dependency is tracked.
  // The Map reference itself must change to trigger standard React updates in child components.
  useEffect(() => {
    // Empty effect: deviceStates is already a dependency of the main component.
  }, [deviceStates]);

  // Use hook to preserve window positions during network refresh
  useNetworkRefreshWithPositions(onRefreshNetwork || (() => { }));

  // Get environment settings (moved here to be used in useEffect below)
  const environment = useEnvironment();

  // Force continuous updates for IoT measurements
  const [iotUpdateTrigger, setIotUpdateTrigger] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setIotUpdateTrigger(prev => prev + 1);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Motion/Sound detection state update logic
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices((prev) => {
        let changed = false;
        const next = prev.map((device) => {
          if (device.type === 'iot' && device.status !== 'offline' && device.iot?.collaborationEnabled !== false && (device.iot?.sensorType === 'motion' || device.iot?.sensorType === 'sound')) {
            const dWidth = getDeviceWidth(device.type);
            const dHeight = getDeviceHeight(device.type, device.ports?.length || 0);
            const dx = mousePosRef.current.x - device.x - (dWidth / 2);
            const dy = mousePosRef.current.y - device.y - (dHeight / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            let newValue: number | boolean = false;

            if (device.iot.sensorType === 'motion') {
              newValue = distance < 75;
            } else if (device.iot.sensorType === 'sound') {
              newValue = distance < 150 ? Math.round(120 * (1 - distance / 150)) : 0;
            }

            if (device.iot.value !== newValue) {
              changed = true;
              return { ...device, iot: { ...device.iot, value: newValue } };
            }
          }
          return device;
        });
        return changed ? next : prev;
      });
    }, 100); // Increased frequency to 100ms for smoother dB transitions
    return () => clearInterval(interval);
  }, [setDevices]);

  const [zoom, setZoom] = useState(zoomProp ?? DEFAULT_ZOOM);
  const [pan, setPan] = useState(panProp ?? { x: 0, y: 0 });
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const syncingZoomFromPropRef = useRef(false);
  const syncingPanFromPropRef = useRef(false);

  // Update canvas dimensions on resize and mount
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const updateDimensions = () => {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        setCanvasDimensions({ width, height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Zoom & Pan syncing effects are now delegated to useCanvasZoomPan hook
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>(activeDeviceId ? [activeDeviceId] : []);

  // BOLT: Memoize set of selected device IDs for O(1) membership checks
  const selectedDeviceSet = useMemo(() => new Set(selectedDeviceIds), [selectedDeviceIds]);

  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [snapToGrid] = useState(true); // Snap-to-grid toggle
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);

  const updateCanvasRect = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRectRef.current = canvasRef.current.getBoundingClientRect();
  }, []);

  // Ping mode state
  const [pingMode, setPingMode] = useState(false);
  const pingModeRef = useRef(false);
  const [pingSource, setPingSource] = useState<CanvasDevice | null>(null);
  const pingSourceRef = useRef<CanvasDevice | null>(null);
  useEffect(() => { pingModeRef.current = pingMode; }, [pingMode]);
  useEffect(() => { pingSourceRef.current = pingSource; }, [pingSource]);
  const [_pingResult, setPingResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pingCursorPos, setPingCursorPos] = useState<{ x: number; y: number } | null>(null);
  const startPingAnimationRef = useRef<((sourceId: string, targetId: string) => void) | null>(null);

  // Zoom mouse drag state
  const [isDraggingZoom, setIsDraggingZoom] = useState(false);
  const zoomDragRef = useRef({ isDragging: false, startX: 0, startZoom: 0 });

  const currentViewport = useMemo(() => {
    if (canvasDimensions.width === 0 || canvasDimensions.height === 0 || !zoom || zoom <= 0) {
      return null;
    }
    return {
      x: pan.x,
      y: pan.y,
      width: canvasDimensions.width,
      height: canvasDimensions.height,
      zoom,
    };
  }, [pan.x, pan.y, canvasDimensions.width, canvasDimensions.height, zoom]);

  // Use spatial partitioning for efficient visibility culling
  const { visibleDeviceIds, visibleConnectionIds } = useSpatialPartitioning(
    devices,
    connections,
    currentViewport,
    { cellSize: 256, margin: 100, enabled: true }
  );

  const { visibleDevices, visibleConnections, visibleNotes } = useMemo(() => {
    // If not active, or no dimensions, return all items to prevent them from disappearing
    // when calculating visibility while the container has 0 width/height.
    // Also return all items if we are currently exporting to PNG to bypass object culling.
    if (!isActive || canvasDimensions.width === 0 || isExporting) return { visibleDevices: devices, visibleConnections: connections, visibleNotes: notes };

    const { width, height } = canvasDimensions;

    // If container has 0 width or height (e.g. hidden by CSS), don't filter out things
    if (width === 0 || height === 0 || !zoom || zoom <= 0) {
      return { visibleDevices: devices, visibleConnections: connections, visibleNotes: notes };
    }

    const margin = 100; // Extra margin to prevent pop-in

    // BOLT: Optimize to O(V) by mapping over visible IDs using pre-calculated maps
    const vDevices = visibleDeviceIds.map(id => deviceMap.get(id)).filter((d): d is CanvasDevice => !!d);
    const vConnections = visibleConnectionIds.map(id => connectionMap.get(id)).filter((c): c is CanvasConnection => !!c);

    // Simple viewport culling for notes (not in spatial partitioner)
    const vNotes = notes.filter(note => {
      const x = note.x * zoom + pan.x;
      const y = note.y * zoom + pan.y;
      const noteWidth = note.width * zoom;
      const noteHeight = note.height * zoom;

      return (
        x + noteWidth + margin > 0 &&
        x - margin < width &&
        y + noteHeight + margin > 0 &&
        y - margin < height
      );
    });

    return { visibleDevices: vDevices, visibleConnections: vConnections, visibleNotes: vNotes };
  }, [devices, connections, notes, zoom, pan, isActive, canvasDimensions, visibleDeviceIds, visibleConnectionIds, isExporting]);

  useEffect(() => {
    updateCanvasRect();
    const handleUpdate = () => updateCanvasRect();
    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, { capture: true } as EventListenerOptions);
    };
  }, [updateCanvasRect]);

  const devicesSortedForRender = useMemo(() => {
    return [...visibleDevices].sort((a, b) => {
      if (a.id === activeDeviceId) return 1;
      if (b.id === activeDeviceId) return -1;
      return 0;
    });
  }, [visibleDevices, activeDeviceId]);

  // Sync internal selection with prop from parent
  useEffect(() => {
    if (activeDeviceId) {
      // Only sync if the prop device is not already part of our selection
      queueMicrotask(() => {
        setSelectedDeviceIds(prev => {
          if (prev.includes(activeDeviceId)) return prev;
          return [activeDeviceId];
        });
      });
    }
    // If activeDeviceId becomes null (panel closed), we specifically DON'T clear 
    // the selection here to satisfy the user request.
  }, [activeDeviceId]);

  // Handle external focus device request (e.g., from WiFi admin panel) - selection only
  useEffect(() => {
    if (focusDeviceId && deviceMap.get(focusDeviceId)) {
      queueMicrotask(() => {
        setSelectedDeviceIds([focusDeviceId]);
      });
    }
  }, [focusDeviceId, deviceMap]);

  // Select all state
  const [_selectAllMode, setSelectAllMode] = useState(false);

  // Always keep selectedDeviceIdsRef.current in sync with selectedDeviceIds state
  useEffect(() => {
    selectedDeviceIdsRef.current = [...selectedDeviceIds];
  }, [selectedDeviceIds]);

  // Handle external clear selection trigger (e.g., from Tab key)
  useEffect(() => {
    if (clearSelectionTrigger !== undefined) {
      queueMicrotask(() => {
        setSelectedDeviceIds([]);
        selectedDeviceIdsRef.current = [];
        setSelectAllMode(false);
      });
    }
  }, [clearSelectionTrigger]);

  // Selection box state
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);
  const selectionBoxRef = useRef<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);
  const selectionAdditiveRef = useRef(false);
  const selectionBaseIdsRef = useRef<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const isSelectingRef = useRef(false);

  // draggedDevice and isActuallyDragging are now managed by useDeviceDrag hook

  // Drag performance - use ref for animation frame throttling
  const dragAnimationFrameRef = useRef<number | null>(null);
  const selectionAnimationFrameRef = useRef<number | null>(null);
  const lastDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  // Ref to track if we were dragging (for click handler to check without stale closure)
  const wasDraggingRef = useRef(false);
  // Direct DOM drag positions - bypasses React state during drag, synced on mouseup
  const liveDeviceDragPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastDragEventRef = useRef<{ clientX: number; clientY: number; ctrlKey: boolean } | null>(null);

  // Refs for direct DOM connection path updates during drag
  const getPortPositionRef = useRef<(device: CanvasDevice, portId: string) => { x: number; y: number }>((_d, _p) => ({ x: 0, y: 0 }));

  // ─── Performance refs: always hold latest values to avoid stale closures ───
  // These allow event handlers registered once (on mount) to always use fresh state
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

  // ─── Direct DOM pan/zoom transform refs (bypass React re-renders during interaction) ───
  const svgContentGroupRef = useRef<SVGGElement | null>(null);
  // Tracks the latest pan values written directly to DOM during pan; synced to React state on mouseUp
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);
  // Tracks zoom written directly to DOM during wheel scroll; synced after inactivity
  const pendingZoomRef = useRef<number | null>(null);
  // Timer to debounce wheel state sync
  const wheelSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Touch performance refs ───
  const isTouchDraggingRef = useRef(false);
  const touchDraggedDeviceRef = useRef<CanvasDevice | null>(null);
  const activePointerDragRef = useRef(false);
  const activeDragPointerIdRef = useRef<number | null>(null);
  // Double-tap detection refs for pointer events (used in handleDevicePointerDown)
  const lastTapTimeRef = useRef(0);
  const lastTappedDeviceRef = useRef<string | null>(null);

  // Mouse position animation frame ref for smooth tracking
  const mousePosAnimationFrameRef = useRef<number | null>(null);

  // Connection drawing state
  const [isDrawingConnection, setIsDrawingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{
    deviceId: string;
    portId: string;
    point: { x: number; y: number };
  } | null>(null);
  const connectionStartRef = useRef<{
    deviceId: string;
    portId: string;
    point: { x: number; y: number };
  } | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Context menu state - device, note, or empty canvas
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const [notesClipboard] = useState<CanvasNote[]>([]);

  // Always-fresh refs: updated on every render so event handlers never get stale values
  const latestDevicesRef = useRef<CanvasDevice[]>([]);
  const latestConnectionsRef = useRef<CanvasConnection[]>([]);
  const latestNotesRef = useRef<CanvasNote[]>([]);

  // Refs for note dragging/resizing to avoid stale closures
  const draggedNoteIdRef = useRef<string | null>(null);
  const resizingNoteIdRef = useRef<string | null>(null);
  const noteDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const noteResizeStartRef = useRef<{ x: number; y: number; width: number; height: number; noteX: number; noteY: number } | null>(null);
  const noteResizeDirectionRef = useRef<string>('se');

  // Undo/Redo — managed by useCanvasHistory hook
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

  // Configuration state
  const [configuringDevice, setConfiguringDevice] = useState<string | null>(null);

  // UI state
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);


  // Touch/Mobile state
  const isMobile = useIsMobile();


  // Tap-tap connection state
  const [mobileConnectionSource, setMobileConnectionSource] = useState<string | null>(null);

  // Ping and port selector state
  const [showPortSelector, setShowPortSelector] = useState(false);
  const [portSelectorStep, setPortSelectorStep] = useState<'source' | 'target'>('source');
  const [selectedSourcePort, setSelectedSourcePort] = useState<{ deviceId: string; portId: string } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Ping animation state
  const [pingAnimation, setPingAnimation] = useState<{
    sourceId: string;
    targetId: string;
    path: string[];
    currentHopIndex: number;
    progress: number;
    success: boolean | null;
    frame: number;
    error?: string;
    hopCount: number;
    isPaused?: boolean;
    showPacketPanel?: boolean;
    isReturn?: boolean;       // true = paket geri dönüyor (Echo Reply)
    failedAtHop?: number;     // başarısız olduğu hop index
    broadcastTargets: string[];
    broadcastAnim: BroadcastAnimTarget[];
    broadcastProgress: number;
  } | null>(null);
  const [errorToast, setErrorToast] = useState<{ message: string; details?: string; type?: 'success' | 'error' } | null>(null);
  // Hop packet infos for the packet analysis panel
  const [hopPacketInfos, setHopPacketInfos] = useState<import('./PingPacketInfoPanel').HopPacketInfo[]>([]);
  const [packetPopupHop, setPacketPopupHop] = useState<number | null>(null);

  // Synchronize ping panel visibility state with parent
  const isPingPanelVisible = !!(pingAnimation && pingAnimation.showPacketPanel);
  useEffect(() => {
    onPingPanelOpenChange?.(isPingPanelVisible);
  }, [isPingPanelVisible, onPingPanelOpenChange]);

  // Wrapped refresh handler: closes floating panels then delegates
  const handleRefresh = useCallback(() => {
    setPacketPopupHop(null);
    setPingAnimation(null);
    onRefreshNetwork?.();
  }, [onRefreshNetwork]);

  // Listen for network-refresh custom event (dispatched from page.tsx)
  useEffect(() => {
    const handler = () => {
      setPacketPopupHop(null);
      setPingAnimation(null);
      setHopPacketInfos([]);
      useAppStore.getState().setSimulationMode(false);
    };
    window.addEventListener('network-refresh', handler);
    return () => window.removeEventListener('network-refresh', handler);
  }, []);
  // Listen for mobile-back-pressed custom event
  useEffect(() => {
    const handleMobileBack = () => {
      setContextMenu(null);
      setPacketPopupHop(null);
    };
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack);
  }, []);

  // Refs
  const deviceCounterRef = useRef<{ pc: number; iot: number; switch: number; router: number; firewall: number; wlc: number }>({ pc: 0, iot: 0, switch: 0, router: 0, firewall: 0, wlc: 0 });
  const getCounterKey = useCallback((type: DeviceType | string): 'pc' | 'iot' | 'switch' | 'router' | 'firewall' | 'wlc' => {
    if (type === 'switchL2' || type === 'switchL3' || type === 'switch') return 'switch';
    if (type === 'pc' || type === 'router' || type === 'firewall' || type === 'wlc') return type as 'pc' | 'router' | 'firewall' | 'wlc';
    if (type === 'iot') return 'iot';
    return 'pc';
  }, []);
  const pingAnimationRef = useRef<number | null>(null);
  const pingCleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIsPausedRef = useRef<boolean>(false);
  const pingResumeCallbackRef = useRef<(() => void) | null>(null);
  const pingStepModeRef = useRef<boolean>(false); // When true, pause at each hop boundary
  // Track the current ping path for external interruption checks (power off, cable change)
  const pingPathRef = useRef<string[]>([]);
  // Ref for cancel function to avoid stale closure issues in RAF callbacks
  const cancelPingDueToInterruptionRef = useRef<(reason: string) => void>(() => { });

  // Sync simulation mode to the ping ref for use in non-reactive animation frames
  useEffect(() => {
    pingStepModeRef.current = isSimulationMode;
  }, [isSimulationMode]);

  // Added refs moved from below to avoid TDZ and sync issues
  const noteCounterRef = useRef<number>(0);
  const noteTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const lastStateRef = useRef<string>('');
  const topologyChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    duplicateNote
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
    t
  });

  // Zoom & Pan Hook
  const { handleZoomWheel, resetView } = useCanvasZoomPan({
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
    syncingPanFromPropRef
  });

  // Note Editing Hook
  const {
    noteClipboard,
    setNoteTextSelection,
    updateNoteText: _unusedUpdateNoteText, // we will keep updateNoteText local for safety or map it
    handleNoteTextCopy,
    handleNoteTextCut,
    handleNoteTextDelete,
    handleNoteTextPaste,
    handleNoteTextSelectAll,
    bringNoteToFront
  } = useNoteEditing({
    setNotesState,
    latestNotesRef,
    saveToHistory,
    noteTextareaRefs
  });

  // Device Drag Hook
  const {
    draggedDevice,
    setDraggedDevice,
    isActuallyDragging,
    setIsActuallyDragging,
    startDeviceDrag
  } = useDeviceDrag({
    saveToHistory,
    draggedDeviceRef,
    dragStartPosRef,
    isActuallyDraggingRef,
    dragStartDevicePositionsRef
  });

  // Canvas Selection Hook
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
    TOOLTIP_DELAY,
    TOOLTIP_OFFSET_Y,
  });

  // Canvas Selection Hook
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
    zoomRef
  });

  // Connection Drawing Hook
  const { cancelConnectionDrawing } = useConnectionDrawing({
    setIsDrawingConnection,
    setConnectionStart,
    setMobileConnectionSource,
    isDrawingConnectionRef,
    connectionStartRef
  });

  // Ping Animation Hook
  const { findPath: _findPath, cancelPingDueToInterruption } = usePingAnimation({
    connections,
    deviceStates,
    deviceMap,
    isTR,
    setPingAnimation,
    setHopPacketInfos,
    setErrorToast,
    setPingMode,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    pingIsPausedRef,
    _pingStepModeRef: pingStepModeRef
  });

  const { startPingAnimation } = usePingSequence({
    isTR,
    isSimulationMode,
    devices,
    connections,
    deviceStates,
    deviceMap,
    latestDevicesRef,
    latestConnectionsRef,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    pingIsPausedRef,
    pingStepModeRef,
    pingResumeCallbackRef,
    pingPathRef,
    cancelPingDueToInterruptionRef,
    setPingAnimation: setPingAnimation as React.Dispatch<React.SetStateAction<PingAnimationState | null>>,
    setHopPacketInfos: (infos) => setHopPacketInfos(infos),
    setErrorToast: (toast) => setErrorToast(toast),
    setPingMode,
    getPingDiagnostics,
    checkDeviceConnectivity,
    getWirelessDistance,
    easeInOutCubic,
    flushSync,
    cancelAnimationFrame,
    requestAnimationFrame,
  });

  const {
    handlePingPause,
    handlePingPlay,
    handlePingNext,
    handleEnvelopeClick
  } = useTopologyPingUI({
    pingIsPausedRef,
    pingStepModeRef,
    pingResumeCallbackRef,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    pingPathRef,
    cancelPingDueToInterruptionRef,
    setPingAnimation: setPingAnimation as React.Dispatch<React.SetStateAction<PingAnimationState | null>>,
    setPacketPopupHop,
    onPacketPanelFocus,
    pingAnimation,
    startPingAnimation,
    isTR
  });

  const {
    startDeviceConfig,
    cancelDeviceConfig,
    saveDeviceConfig,
    togglePowerDevices,
    handleAlign,
    toggleConnectionActive,
    deleteConnection
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






  // Get dynamic canvas dimensions based on screen size
  const getCanvasDimensions = useCallback(() => {
    if (typeof window === 'undefined') return { width: VIRTUAL_CANVAS_WIDTH_DESKTOP, height: VIRTUAL_CANVAS_HEIGHT_DESKTOP };
    return isMobile
      ? { width: VIRTUAL_CANVAS_WIDTH_MOBILE, height: VIRTUAL_CANVAS_HEIGHT_MOBILE }
      : { width: VIRTUAL_CANVAS_WIDTH_DESKTOP, height: VIRTUAL_CANVAS_HEIGHT_DESKTOP };
  }, [isMobile]);

  // Calculate distance between two points
  const getDistance = useCallback((x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Zoom mouse drag/scroll handlers
  const handleZoomMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startZoom = zoom;

    setIsDraggingZoom(true);
    zoomDragRef.current = { isDragging: true, startX, startZoom };

    let animationFrameId: number;

    // Add global mouse event listeners
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!zoomDragRef.current.isDragging) return;

      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        if (!zoomDragRef.current.isDragging) return;

        const deltaX = moveEvent.clientX - zoomDragRef.current.startX;
        const zoomDelta = deltaX * 0.002; // Sensitivity adjustment
        let newZoom = zoomDragRef.current.startZoom + zoomDelta;

        // Clamp to min/max zoom
        newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

        if (!canvasRef.current) {
          setZoom(newZoom);
          return;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const cursorX = rect.width / 2;
        const cursorY = rect.height / 2;
        setPan(prevPan => ({
          x: cursorX - (cursorX - prevPan.x) * (newZoom / zoomRef.current),
          y: cursorY - (cursorY - prevPan.y) * (newZoom / zoomRef.current)
        }));
        setZoom(newZoom);
      });
    };

    const handleMouseUp = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      setIsDraggingZoom(false);
      zoomDragRef.current = { isDragging: false, startX: 0, startZoom: 0 };
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
  }, [zoom]);

  // handleZoomWheel is now provided by useCanvasZoomPan hook


  // Context menu auto-close removed - should stay open per user request

  useEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;

    const rect = contextMenuRef.current.getBoundingClientRect();
    const padding = 10;
    const nextX = Math.max(padding, Math.min(contextMenu.x, window.innerWidth - rect.width - padding));
    const nextY = Math.max(padding, Math.min(contextMenu.y, window.innerHeight - rect.height - padding));

    if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
      setContextMenu(prev => prev ? { ...prev, x: nextX, y: nextY } : prev);
    }
  }, [contextMenu?.x, contextMenu?.y, contextMenu?.mode, contextMenu?.noteId, contextMenu?.deviceId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (portTooltipTimerRef.current) clearTimeout(portTooltipTimerRef.current);
      if (connectionTooltipTimerRef.current) clearTimeout(connectionTooltipTimerRef.current);
      if (wheelSyncTimerRef.current) clearTimeout(wheelSyncTimerRef.current);
    };
  }, []);

  // Mobile back button auto-close removed - modals should stay open per user request

  // Allow page-level header buttons (next to the device selector) to control topology UI on mobile.
  useEffect(() => {
    const openPalette = () => setIsPaletteOpen(true);
    const openConnect = () => {
      setShowPortSelector(true);
      setPortSelectorStep('source');
      setSelectedSourcePort(null);
    };
    const closeAllModals = () => {
      setIsPaletteOpen(false);
      setShowPortSelector(false);
      setContextMenu(null);
    };

    window.addEventListener('trigger-topology-palette', openPalette as EventListener);
    window.addEventListener('trigger-topology-connect', openConnect as EventListener);
    window.addEventListener('close-menus-broadcast', closeAllModals as EventListener);
    return () => {
      window.removeEventListener('trigger-topology-palette', openPalette as EventListener);
      window.removeEventListener('trigger-topology-connect', openConnect as EventListener);
      window.removeEventListener('close-menus-broadcast', closeAllModals as EventListener);
    };
  }, []);

  // Handle right-click context menu with viewport clamping
  const openContextMenu = useCallback((clientX: number, clientY: number, deviceId: string | null = null, mode: ContextMenuMode = deviceId ? 'device' : 'canvas', noteId: string | null = null) => {
    // Estimate menu dimensions (approximate)
    const menuWidth = 180;
    const menuHeight = deviceId ? 400 : 200; // Device menu is taller

    // Clamp coordinates to stay within viewport
    let x = clientX;
    let y = clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    // Ensure it doesn't go off the top/left either
    x = Math.max(10, x);
    y = Math.max(10, y);

    window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'topology' } }));
    setContextMenu({ x, y, deviceId, noteId, mode });
  }, []);

  const getDeviceIdsInSelectionBox = useCallback((box: { start: { x: number; y: number }; current: { x: number; y: number } }) => {
    const x1 = Math.min(box.start.x, box.current.x);
    const y1 = Math.min(box.start.y, box.current.y);
    const x2 = Math.max(box.start.x, box.current.x);
    const y2 = Math.max(box.start.y, box.current.y);

    return latestDevicesRef.current.filter(d => {
      const deviceWidth = getDeviceWidth(d.type);
      const deviceHeight = getDeviceHeight(d.type, d.ports?.length || 0);
      const dX1 = d.x;
      const dY1 = d.y;
      const dX2 = d.x + deviceWidth;
      const dY2 = d.y + deviceHeight;
      return dX1 < x2 && dX2 > x1 && dY1 < y2 && dY2 > y1;
    }).map(d => d.id);
  }, []);

  const mergeSelectionIds = useCallback((boxSelectedIds: string[]) => {
    if (!selectionAdditiveRef.current) return boxSelectedIds;
    return Array.from(new Set([...selectionBaseIdsRef.current, ...boxSelectedIds]));
  }, []);

  // handleCanvasMouseDown removed by patch3

  // Keep refs in sync with state on every render (no cost - just ref assignment)
  useLayoutEffect(() => {
    isPanningRef.current = isPanning;
    panStartRef.current = panStart;
    zoomRef.current = zoom;
    panRef.current = pan;
    draggedDeviceRef.current = draggedDevice;
    isActuallyDraggingRef.current = isActuallyDragging;
    snapToGridRef.current = snapToGrid;
    isDrawingConnectionRef.current = isDrawingConnection;
    connectionStartRef.current = connectionStart;
    connectionMetaRef.current = connectionMeta;
    // eslint-disable-next-line react-hooks/immutability
    selectedDeviceIdsRef.current = selectedDeviceIds;
  }, [isPanning, panStart, zoom, pan, draggedDevice, isActuallyDragging, snapToGrid, isDrawingConnection, connectionStart, selectedDeviceIds, connectionMeta]);

  // DOM-first transform sync: whenever pan or zoom state changes from a NON-interactive
  // source (reset view, zoom buttons, prop sync, etc.), write the transform to the DOM.
  // During active pan/drag the RAF handlers write to DOM directly, so we skip those frames
  // to avoid overwriting in-flight DOM transforms with stale React state.
  useLayoutEffect(() => {
    if (isPanning || isActuallyDragging) return; // RAF handlers own the DOM transform
    if (wheelSyncTimerRef.current) return;       // wheel handler owns the DOM transform
    const g = svgContentGroupRef.current;
    if (!g) return;
    g.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`;
  }, [pan, zoom, isPanning, isActuallyDragging]);

  // mouseMove useEffect removed by patch
  // Global touch event handlers removed by patch5

  // Handle device drag start
  const handleDeviceMouseDown = useCallback((e: ReactMouseEvent, deviceId: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const device = deviceMap.get(deviceId);
    if (!device) return;

    // Ping mode: handle immediately on mousedown for better Chrome compatibility
    const currentPingMode = pingModeRef.current;
    const currentPingSource = pingSourceRef.current;
    if (currentPingMode) {
      if (!currentPingSource) {
        // First click: select source
        setPingSource(device);
        pingSourceRef.current = device;
        setPingResult(null);

        pingIsPausedRef.current = false;
        pingStepModeRef.current = false;
        if (pingAnimationRef.current) {
          cancelAnimationFrame(pingAnimationRef.current);
          pingAnimationRef.current = null;
        }
        if (pingCleanupTimeoutRef.current) {
          clearTimeout(pingCleanupTimeoutRef.current);
          pingCleanupTimeoutRef.current = null;
        }
        setPingAnimation(null);
        setHopPacketInfos([]);
        setPacketPopupHop(null);

        return; // Don't proceed with drag/selection logic
      } else {
        // Second click: run ping immediately
        if (device.id === currentPingSource.id) return; // same device, ignore
        // Exit ping mode immediately, then run animation
        setPingMode(false);
        pingModeRef.current = false;
        setPingSource(null);
        pingSourceRef.current = null;
        setPacketPopupHop(null);
        // Trigger full ping animation (includes connectivity check + toast)
        startPingAnimationRef.current?.(currentPingSource.id, device.id);
        return; // Don't proceed with drag/selection logic
      }
    }

    // Save current state before drag starts (for undo)
    saveToHistory();

    // Reset drag tracking
    wasDraggingRef.current = false;

    // Ensure keyboard navigation stays active for topology interactions
    canvasRef.current?.focus();

    // Shift key for multi-selection
    let newSelectedIds: string[];
    const currentSelectedIds = [...selectedDeviceIdsRef.current]; // use ref to avoid stale state

    if (e.shiftKey) {
      // Toggle selection when Shift is pressed
      newSelectedIds = currentSelectedIds.includes(deviceId)
        ? currentSelectedIds.filter(id => id !== deviceId)
        : [...currentSelectedIds, deviceId];

      // Update parent component with the first selected device, or clear if nothing remains
      if (newSelectedIds.length > 0) {
        const firstSelectedDevice = deviceMap.get(newSelectedIds[0]);
        if (firstSelectedDevice) {
          onDeviceSelect(firstSelectedDevice.type, newSelectedIds[0], undefined, firstSelectedDevice.name);
        }
      } else if (onDeviceSelect) {
        onDeviceSelect(null as unknown as DeviceType, null as unknown as string | undefined, undefined, null as unknown as string | undefined);
      }

      setSelectedDeviceIds(newSelectedIds);
      
      // Visual feedback: change cursor to indicate multi-selection mode
      document.body.style.cursor = 'copy';
    } else {
      // If clicking a device that's not selected, make it the only selection
      // If it IS already selected, keep selection for group dragging
      if (!currentSelectedIds.includes(deviceId)) {
        newSelectedIds = [deviceId];
        setSelectedDeviceIds(newSelectedIds);
        onDeviceSelect(device.type, deviceId, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);
      } else {
        newSelectedIds = currentSelectedIds;
      }
    }

    // Store starting positions of all selected devices for group dragging
    // This applies to both shift-selected and normally selected devices
    const initialPositions: { [key: string]: { x: number, y: number } } = {};
    devices.forEach(d => {
      if (newSelectedIds.includes(d.id)) {
        initialPositions[d.id] = { x: d.x, y: d.y };
      }
    });
    // Store positions in refs immediately via useDeviceDrag hook
    startDeviceDrag(e, deviceId, newSelectedIds, initialPositions);
  }, [devices, pan, zoom, selectedDeviceIds, onDeviceSelect, pingMode, pingSource, startDeviceDrag]);

  // Handle device click (single click - select only)
  const handleDeviceClick = useCallback((e: ReactMouseEvent, device: CanvasDevice) => {
    e.stopPropagation();

    setContextMenu(null);

    // Don't handle click if we were dragging (check ref to avoid stale closure)
    if (wasDraggingRef.current) return;

    if (pingModeRef.current || pingSourceRef.current) {
      return;
    }

    if (isMobile && !isDrawingConnection) {
      if (!mobileConnectionSource) {
        setMobileConnectionSource(device.id);
        toast({
          title: isTR ? "Bağlantı Başlatıldı" : "Connection Started",
          description: isTR ? "Hedef cihazı seçin." : "Select the target device.",
          duration: 3000,
        });
      } else {
        setMobileConnectionSource(null);
      }
    }

    setSelectedNoteIds([]);
    
    // Only update onDeviceSelect and selection if it's not a shift-click,
    // or if it's a keyboard-activated (untrusted) click
    if (e.shiftKey) {
      // For shift-click (trusted), selection was already handled in handleDeviceMouseDown,
      // so don't override onDeviceSelect or setSelectedDeviceIds here
    } else {
      // Notify parent component - select device, don't open terminal
      onDeviceSelect(device.type, device.id, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);
      // Keyboard-activated clicks (Enter/Space) dispatch synthetic events.
      // For trusted (real mouse) clicks, selection is already handled in handleDeviceMouseDown.
      // For untrusted (synthetic) clicks, set the selection here.
      if (!e.isTrusted) {
        setSelectedDeviceIds([device.id]);
      }
    }
    // Focus canvas for keyboard navigation
    canvasRef.current?.focus();
  }, [onDeviceSelect, pingMode, pingSource, devices, connections, deviceStates, setContextMenu, isMobile, isDrawingConnection, mobileConnectionSource, isTR]);

  const navigateToNextDevice = useCallback((currentDeviceId: string | null, shift = false) => {
    if (devices.length === 0) return;

    const orderedDevices = [...devices].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return a.id.localeCompare(b.id);
    });

    const currentIndex = currentDeviceId
      ? orderedDevices.findIndex(d => d.id === currentDeviceId)
      : -1;

    const nextIndex = currentIndex >= 0
      ? (currentIndex + (shift ? -1 : 1) + orderedDevices.length) % orderedDevices.length
      : 0;

    const nextDevice = orderedDevices[nextIndex];
    if (!nextDevice) return;

    setSelectedDeviceIds([nextDevice.id]);
    setSelectedNoteIds([]);
    onDeviceSelect(nextDevice.type, nextDevice.id, isSwitchDeviceType(nextDevice.type) ? nextDevice.switchModel : undefined, nextDevice.name);
    
    // Smooth scroll to the next device and focus it
    const nextEl = document.querySelector<SVGGElement>(`[data-device-id="${nextDevice.id}"]`);
    if (nextEl && canvasRef.current) {
      nextEl.focus();
      
      // Calculate pan to center the device in viewport
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const deviceX = nextDevice.x;
      const deviceY = nextDevice.y;
      const currentZoom = zoomRef.current;
      
      // Center the device in viewport
      const targetPanX = canvasRect.width / 2 - deviceX * currentZoom;
      const targetPanY = canvasRect.height / 2 - deviceY * currentZoom;
      
      // Smooth pan animation
      const startPan = { ...panRef.current };
      const startTime = performance.now();
      const duration = 300; // ms
      
      const animatePan = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);
        
        panRef.current = {
          x: startPan.x + (targetPanX - startPan.x) * eased,
          y: startPan.y + (targetPanY - startPan.y) * eased
        };
        
        const g = svgContentGroupRef.current;
        if (g) {
          g.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0px) scale(${currentZoom})`;
        }
        
        if (progress < 1) {
          requestAnimationFrame(animatePan);
        } else {
          // Sync with React state after animation
          setPan(panRef.current);
        }
      };
      
      requestAnimationFrame(animatePan);
    }
  }, [devices, onDeviceSelect]);

  const handleDeviceKeyDown = useCallback((e: React.KeyboardEvent<SVGGElement>, device: CanvasDevice) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    e.stopPropagation();
    navigateToNextDevice(device.id, e.shiftKey);
  }, [navigateToNextDevice]);

  // Handle device double click - open terminal
  const handleDeviceDoubleClick = useCallback((device: CanvasDevice) => {
    // Open terminal for this specific device
    if (onDeviceDoubleClick) {
      onDeviceDoubleClick(device.type, device.id);
    } else {
      // Fallback to old behavior
      if (device.type === 'pc' || device.type === 'iot') {
        onDeviceSelect('pc', device.id, undefined, device.name);
      } else if (isSwitchDeviceType(device.type) || device.type === 'router') {
        onDeviceSelect(device.type, device.id, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);
      }
    }
  }, [onDeviceDoubleClick, onDeviceSelect]);

  const handleDevicePointerDown = useCallback((e: React.PointerEvent<SVGGElement>, deviceId: string) => {
    if (e.pointerType === 'mouse') return;
    if (activeDragPointerIdRef.current !== null) return;

    e.preventDefault();
    e.stopPropagation();
    activePointerDragRef.current = true;
    activeDragPointerIdRef.current = e.pointerId;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // SVG pointer capture can fail in older mobile browsers; global pointermove still handles drag.
    }

    const device = deviceMap.get(deviceId);
    if (device) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300 && lastTappedDeviceRef.current === deviceId) {
        handleDeviceDoubleClick(device);
        lastTapTimeRef.current = 0;
        lastTappedDeviceRef.current = null;
      } else {
        lastTapTimeRef.current = now;
        lastTappedDeviceRef.current = deviceId;
      }
    }

    handleDeviceMouseDown(e as unknown as ReactMouseEvent, deviceId);
  }, [handleDeviceMouseDown, deviceMap, handleDeviceDoubleClick]);

  // Handle right-click context menu with viewport clamping
  const handleContextMenu = useCallback((e: ReactMouseEvent, deviceId?: string) => {
    // If in ping mode, don't show context menu to avoid interfering with target selection
    if (pingMode) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Estimate menu dimensions (approximate)
    const menuWidth = 180;
    const menuHeight = deviceId ? 400 : 200;

    // Clamp coordinates to stay within viewport
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    // Ensure it doesn't go off the top/left either
    x = Math.max(10, x);
    y = Math.max(10, y);

    window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'topology' } }));
    openContextMenu(x, y, deviceId || null, deviceId ? 'device' : 'canvas');
  }, [openContextMenu, pingMode]);

  const {
    handleDeviceTouchStart,
    handleDeviceTouchMove,
    handleDeviceTouchEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isTouchDragging,
    touchDraggedDevice,
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
  });

  const isDraggingInteractionDisabled = isActuallyDragging || isTouchDragging;



  const { handleCanvasMouseDown } = useTopologyMouse({
    canvasRef, canvasRectRef, panRef, zoomRef, mousePosRef, isPanningRef, lastMouseMoveTimeRef, lastMouseMovePosRef,
    velocityRef, panAnimationFrameRef, panStartRef, svgContentGroupRef, pendingPanRef, isSelectingRef, selectionBoxRef,
    selectionAdditiveRef, selectionBaseIdsRef, selectedDeviceIdsRef, selectionAnimationFrameRef, draggedDeviceRef,
    dragStartPosRef, isActuallyDraggingRef, wasDraggingRef, lastDragEventRef, dragStartDevicePositionsRef, snapToGridRef,
    liveDeviceDragPositionsRef, isDrawingConnectionRef, activePointerDragRef, activeDragPointerIdRef, latestDevicesRef,
    latestConnectionsRef, getPortPositionRef, connectionMetaRef, lastDragPositionRef, dragAnimationFrameRef,
    mousePosAnimationFrameRef, momentumAnimationFrameRef, setMousePos, setDevices, setIsPanning, setPan, setIsSelecting,
    setSelectionBox, setSelectedDeviceIds, setIsActuallyDragging, setDraggedDevice, setIsDrawingConnection,
    setConnectionStart, setDeviceTooltip, setPortTooltip, setContextMenu, setSelectAllMode, setPingMode, setPingSource,
    setPingResult, setPanStart, setSelectedNoteIds, mergeSelectionIds, getDeviceIdsInSelectionBox,
    openContextMenu, cancelConnectionDrawing, onDeviceSelect, pingMode, pingSource
  });

  // Handle Wheel and Middle Click Auto-scroll Prevention
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      // In SVG <foreignObject> the wheel event target can be the SVG element,
      // so inspect the composed path to find note/text surfaces and let them scroll.
      const path = (typeof e.composedPath === 'function' ? e.composedPath() : []) as EventTarget[];
      for (const entry of path) {
        if (!(entry instanceof HTMLElement)) continue;
        const tag = entry.tagName;
        const isEditable = tag === 'TEXTAREA' || tag === 'INPUT' || entry.isContentEditable;
        const isNoteScrollHost = entry.hasAttribute('data-note-scroll') || !!entry.closest?.('[data-note-scroll]');
        if (isEditable || isNoteScrollHost) return;
      }

      const target = e.target as HTMLElement | null;
      if (target) {
        const isEditable = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable;
        const noteScrollHost = target.closest('[data-note-scroll]');
        if (isEditable || noteScrollHost) {
          return;
        }
      }

      e.preventDefault(); // prevent window scroll

      const rect = canvas.getBoundingClientRect();
      // Zoom to center of visible viewport (what user actually sees)
      const viewportCenterX = rect.width / 2;
      const viewportCenterY = rect.height / 2;

      const zoomSensitivity = 0.0015;
      const delta = -e.deltaY;

      setZoom(prevZoom => {
        let newZoom = prevZoom * Math.exp(delta * zoomSensitivity);
        newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));

        // Only adjust pan if zoom actually changed
        if (newZoom !== prevZoom) {
          setPan(prevPan => {
            // Keep viewport center fixed during zoom
            const zoomFactor = newZoom / prevZoom;
            return {
              x: viewportCenterX - (viewportCenterX - prevPan.x) * zoomFactor,
              y: viewportCenterY - (viewportCenterY - prevPan.y) * zoomFactor
            };
          });
        }

        return newZoom;
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        // Prevent default browser auto-scroll on middle click
        e.preventDefault();
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Handle Keyboard Navigation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if canvas or its children have focus
      if (document.activeElement !== canvas && !canvas.contains(document.activeElement)) return;

      const moveAmount = 20 * zoom;

      switch (e.key) {
        case 'Tab': {
          e.preventDefault();
          navigateToNextDevice(selectedDeviceIds[selectedDeviceIds.length - 1] ?? null, e.shiftKey);
          break;
        }
        case 'ArrowUp':
          e.preventDefault();
          setPan(prev => ({ ...prev, y: prev.y + moveAmount }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPan(prev => ({ ...prev, y: prev.y - moveAmount }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setPan(prev => ({ ...prev, x: prev.x + moveAmount }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPan(prev => ({ ...prev, x: prev.x - moveAmount }));
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(prev => Math.min(prev * 1.2, MAX_ZOOM));
          break;
        case '-':
          e.preventDefault();
          setZoom(prev => Math.max(prev / 1.2, MIN_ZOOM));
          break;
        case '0':
          e.preventDefault();
          setZoom(1);
          setPan({ x: 0, y: 0 });
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedDeviceIds.length > 0) {
            const lastId = selectedDeviceIds[selectedDeviceIds.length - 1];
            const selectedDevice = deviceMap.get(lastId);
            if (selectedDevice) {
              if (selectedDeviceIds.length > 1) {
                setSelectedDeviceIds([lastId]);
              }
              handleDeviceDoubleClick(selectedDevice);
            }
          }
          break;
        case 'Delete':
        case 'Backspace':
          // Handled by window keydown listener
          break;
      }
    };

    canvas.addEventListener('keydown', handleKeyDown);
    return () => canvas.removeEventListener('keydown', handleKeyDown);
  }, [zoom, selectedDeviceIds, devices, onDeviceSelect, onDeviceDelete]);

  // Handle port click for connection
  const handlePortClick = useCallback((e: ReactMouseEvent, deviceId: string, portId: string) => {
    e.stopPropagation();
    if (isActuallyDraggingRef.current || isTouchDraggingRef.current) return;

    // Use refs to avoid stale closures
    const isDrawingConnection = isDrawingConnectionRef.current;
    const connectionStart = connectionStartRef.current;

    const device = deviceMap.get(deviceId);
    if (!device) return;

    const port = device.ports.find((p) => p.id === portId);
    if (!port) return;

    // Check if port is already connected
    if (port.status === 'connected') {
      // Port is already in use - cannot connect
      if (isDrawingConnection) {
        setConnectionError(t.portInUse);
        setTimeout(() => setConnectionError(null), 3000);
        setIsDrawingConnection(false);
        setConnectionStart(null);
      }
      return;
    }

    if (isDrawingConnection && connectionStart) {
      // Check if trying to connect to itself (same device, different port)
      if (connectionStart.deviceId === deviceId) {
        // Show error message - cannot connect device to itself
        const errorMsg = language === 'tr'
          ? 'Bir cihaz kendisine bağlanamaz!'
          : 'A device cannot connect to itself!';
        setConnectionError(errorMsg);
        setTimeout(() => setConnectionError(null), 3000);
        setIsDrawingConnection(false);
        setConnectionStart(null);
        return;
      }

      // Check cable compatibility
      const sourceDevice = deviceMap.get(connectionStart.deviceId);
      const targetDevice = deviceMap.get(deviceId);

      if (sourceDevice && targetDevice) {
        const cableCheck: import('@/lib/network/types').CableInfo = {
          connected: true,
          cableType: cableInfo.cableType,
          sourceDevice: sourceDevice.type,
          targetDevice: targetDevice.type,
          sourcePort: connectionStart.portId,
          targetPort: portId,
        };

        if (!isCableCompatible(cableCheck)) {
          const errorMsg = language === 'tr'
            ? 'Bu cihaz türü seçilen bağlantı tipini desteklememektedir!'
            : 'This device type does not support the selected connection type!';
          setConnectionError(errorMsg);
          setTimeout(() => setConnectionError(null), 3000);
          cancelConnectionDrawing();
          return;
        }

        // Complete connection
        saveToHistory();
        const newConnection: CanvasConnection = {
          id: `conn-${Date.now()}`,
          sourceDeviceId: connectionStart.deviceId,
          sourcePort: connectionStart.portId,
          targetDeviceId: deviceId,
          targetPort: portId,
          cableType: cableInfo.cableType,
          active: true,
        };

        setConnections((prev) => [...prev, newConnection]);

        // Update port status - her iki cihazda da
        setDevices((prev) =>
          prev.map((d) => {
            // Source device port'unu güncelle
            if (d.id === connectionStart.deviceId) {
              return {
                ...d,
                ports: d.ports.map((p) =>
                  p.id === connectionStart.portId
                    ? { ...p, status: 'connected' as const }
                    : p
                ),
              };
            }
            // Target device port'unu güncelle
            if (d.id === deviceId) {
              return {
                ...d,
                ports: d.ports.map((p) =>
                  p.id === portId
                    ? { ...p, status: 'connected' as const }
                    : p
                ),
              };
            }
            return d;
          })
        );

        // Trigger STP recalculation when connection is added
        window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
          detail: { topologyDevices: devices, topologyConnections: [...connections, newConnection] }
        }));

        // Update cable info
        onCableChange({
          ...cableInfo,
          connected: true,
          sourceDevice: sourceDevice.type,
          targetDevice: targetDevice.type,
        });
      }

      setIsDrawingConnection(false);
      setConnectionStart(null);
    } else {
      // Start connection - calculate port position inline
      const portIndex = device.ports.findIndex(p => p.id === portId);
      const portsPerRow = (device.type === 'pc' || device.type === 'iot') ? 2 : 8;
      const col = portIndex % portsPerRow;
      const row = Math.floor(portIndex / portsPerRow);
      const deviceWidth = getDeviceWidth(device.type);
      const deviceHeight = getDeviceHeight(device.type, device.ports.length);
      let portX = 0;
      let portY = 0;

      if (device.type === 'pc' || device.type === 'iot') {
        const pcPortSpacing = PC_PORT_SPACING;
        const pcStartY = deviceHeight / 2 - ((device.ports.length - 1) * pcPortSpacing) / 2;
        portX = device.x + deviceWidth - 8;
        portY = device.y + pcStartY + portIndex * pcPortSpacing;
      } else {
        portX = device.x + PORT_START_X + col * PORT_SPACING;
        portY = device.y + 80 + row * 14;
      }

      setIsDrawingConnection(true);
      setConnectionStart({
        deviceId,
        portId,
        point: { x: portX, y: portY },
      });
    }
  }, [devices, connections, isDrawingConnection, connectionStart, cableInfo, onCableChange, saveToHistory, language, t]);

  // Note management functions
  // noteClipboard and noteTextSelection are now managed by useNoteEditing hook

  // Note dragging and resizing state
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [resizingNoteId, setResizingNoteId] = useState<string | null>(null);
  const [noteDragStart, setNoteDragStart] = useState<{ x: number; y: number } | null>(null);
  const [noteResizeStart, setNoteResizeStart] = useState<{ x: number; y: number; width: number; height: number; noteX: number; noteY: number } | null>(null);
  const [noteResizeDirection, setNoteResizeDirection] = useState<string>('se');

  // Keep refs fresh for event handlers - only non-overlapping refs (pan/zoom/drag refs
  // are synced via the per-render useLayoutEffect above)
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
          getPortPosition: getPortPositionRef.current
        });
      } finally {
        setIsExporting(false);
      }
    }, 300);
  }, [devices, connections, notes, deviceStates]);

  // Handle toolbar events from page.tsx
  useEffect(() => {
    const handleAddDevice = (event: CustomEvent) => {
      if (isExamActive && !isExamEditorOpen) return;
      const deviceType = event.detail;
      if (deviceType === 'pc') addDevice('pc');
      else if (deviceType === 'switchL2') addDevice('switch', 'L2');
      else if (deviceType === 'switchL3') addDevice('switch', 'L3');
      else if (deviceType === 'router') addDevice('router');
      else if (deviceType === 'iot') addDevice('iot');
      else if (deviceType === 'firewall') addDevice('firewall');
      else if (deviceType === 'wlc') addDevice('wlc');
    };
    const handleTogglePingMode = () => {
      setPingMode(m => {
        pingModeRef.current = !m;
        if (!m) {
          pingIsPausedRef.current = false;
          pingStepModeRef.current = false;
          if (pingAnimationRef.current) {
            cancelAnimationFrame(pingAnimationRef.current);
            pingAnimationRef.current = null;
          }
          if (pingCleanupTimeoutRef.current) {
            clearTimeout(pingCleanupTimeoutRef.current);
            pingCleanupTimeoutRef.current = null;
          }
          setPingAnimation(null);
          setHopPacketInfos([]);
          setPacketPopupHop(null);
        }
        return !m;
      });
      setPingSource(null);
      pingSourceRef.current = null;
      setPingResult(null);
    };
    const handleAddNote = () => addNote();
    const handleAddSummaryNote = () => addSummaryNote();

    window.addEventListener('add-device', handleAddDevice as EventListener);
    window.addEventListener('toggle-ping-mode', handleTogglePingMode as EventListener);
    window.addEventListener('add-note', handleAddNote as EventListener);
    window.addEventListener('add-summary-note', handleAddSummaryNote as EventListener);
    window.addEventListener('trigger-topology-export-png', handleExportPNG as EventListener);
    return () => {
      window.removeEventListener('add-device', handleAddDevice as EventListener);
      window.removeEventListener('toggle-ping-mode', handleTogglePingMode as EventListener);
      window.removeEventListener('add-note', handleAddNote as EventListener);
      window.removeEventListener('add-summary-note', handleAddSummaryNote as EventListener);
      window.removeEventListener('trigger-topology-export-png', handleExportPNG as EventListener);
    };
  }, [addDevice, addNote, addSummaryNote, handleExportPNG]);

  const updateNoteText = useCallback((noteId: string, text: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, text } : n))
    );
  }, []);

  const updateNoteStyle = useCallback((noteId: string, updates: Partial<CanvasNote>) => {
    saveToHistory();
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n))
    );
  }, [saveToHistory]);

  const cycleNoteColor = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    const idx = NOTE_COLORS.indexOf(note.color as typeof NOTE_COLORS[number]);
    const next = NOTE_COLORS[(idx >= 0 ? idx + 1 : 0) % NOTE_COLORS.length];
    updateNoteStyle(noteId, { color: next });
  }, [updateNoteStyle]);

  const cycleNoteFont = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    const idx = NOTE_FONTS.indexOf(note.font as typeof NOTE_FONTS[number]);
    const next = NOTE_FONTS[(idx >= 0 ? idx + 1 : 0) % NOTE_FONTS.length];
    updateNoteStyle(noteId, { font: next });
  }, [updateNoteStyle]);

  const cycleNoteFontSize = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    const idx = NOTE_FONT_SIZES.indexOf(note.fontSize);
    const next = NOTE_FONT_SIZES[(idx >= 0 ? idx + 1 : 0) % NOTE_FONT_SIZES.length];
    updateNoteStyle(noteId, { fontSize: next });
  }, [updateNoteStyle]);

  const cycleNoteOpacity = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    const idx = NOTE_OPACITY_OPTIONS.indexOf(note.opacity);
    const next = NOTE_OPACITY_OPTIONS[(idx >= 0 ? idx + 1 : 0) % NOTE_OPACITY_OPTIONS.length];
    updateNoteStyle(noteId, { opacity: next });
  }, [updateNoteStyle]);

  // Note editing helper functions are now managed by useNoteEditing hook

  // Handle note header drag start
  const handleNoteHeaderMouseDown = useCallback((e: ReactMouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    saveToHistory();
    bringNoteToFront(noteId);
    setDraggedNoteId(noteId);
    setNoteDragStart({ x: e.clientX, y: e.clientY });
    setSelectedNoteIds([noteId]);
  }, [notes, saveToHistory, bringNoteToFront, setSelectedNoteIds]);

  // Handle note header touch start (mobile)
  const handleNoteHeaderTouchStart = useCallback((e: React.TouchEvent, noteId: string) => {
    e.stopPropagation();
    if (!canvasRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    saveToHistory();
    bringNoteToFront(noteId);
    setDraggedNoteId(noteId);
    setNoteDragStart({ x: touch.clientX, y: touch.clientY });
    setSelectedNoteIds([noteId]);
  }, [notes, saveToHistory, bringNoteToFront, setSelectedNoteIds]);

  // Handle note resize start
  const handleNoteResizeStart = useCallback((e: ReactMouseEvent, noteId: string, direction: string = 'se') => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    saveToHistory();
    setResizingNoteId(noteId);
    setNoteResizeDirection(direction);
    setNoteResizeStart({ x: e.clientX, y: e.clientY, width: note.width, height: note.height, noteX: note.x, noteY: note.y });
    setSelectedNoteIds([noteId]);
  }, [notes, saveToHistory, setSelectedNoteIds]);

  const handleNoteResizeTouchStart = useCallback((e: React.TouchEvent, noteId: string, direction: string = 'se') => {
    e.stopPropagation();
    if (!canvasRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    saveToHistory();
    setResizingNoteId(noteId);
    setNoteResizeDirection(direction);
    setNoteResizeStart({ x: touch.clientX, y: touch.clientY, width: note.width, height: note.height, noteX: note.x, noteY: note.y });
    setSelectedNoteIds([noteId]);
  }, [notes, saveToHistory, setSelectedNoteIds]);

  // Handle note dragging and resizing with mouse move
  useEffect(() => {
    let animationFrameId: number;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!canvasRef.current) return;

      if (draggedNoteIdRef.current && noteDragStartRef.current) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const dragStart = noteDragStartRef.current;
        const draggedNoteId = draggedNoteIdRef.current;
        animationFrameId = requestAnimationFrame(() => {
          const currentZoom = zoomRef.current;

          const deltaX = (e.clientX - dragStart.x) / currentZoom;
          const deltaY = (e.clientY - dragStart.y) / currentZoom;

          setNotes((prev) =>
            prev.map((n) =>
              n.id === draggedNoteId
                ? { ...n, x: n.x + deltaX, y: n.y + deltaY }
                : n
            )
          );

          setNoteDragStart({ x: e.clientX, y: e.clientY });
        });
      } else if (resizingNoteIdRef.current && noteResizeStartRef.current) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const resizeStart = noteResizeStartRef.current;
        const dir = noteResizeDirectionRef.current;
        animationFrameId = requestAnimationFrame(() => {
          const currentZoom = zoomRef.current;
          const dx = (e.clientX - resizeStart.x) / currentZoom;
          const dy = (e.clientY - resizeStart.y) / currentZoom;
          const origW = resizeStart.width;
          const origH = resizeStart.height;
          let newW = origW, newH = origH, newX: number | undefined, newY: number | undefined;

          if (dir.includes('e')) newW = Math.max(180, origW + dx);
          if (dir.includes('w')) { newW = Math.max(180, origW - dx); newX = resizeStart.noteX + (origW - newW); }
          if (dir.includes('s')) newH = Math.max(100, origH + dy);
          if (dir.includes('n')) { newH = Math.max(100, origH - dy); newY = resizeStart.noteY + (origH - newH); }

          setNotes((prev) =>
            prev.map((n) => {
              if (n.id !== resizingNoteIdRef.current) return n;
              const updated: CanvasNote = { ...n, width: newW, height: newH };
              if (newX !== undefined) updated.x = newX;
              if (newY !== undefined) updated.y = newY;
              return updated;
            })
          );
        });
      }
    };

    const handleTouchMove = (e: globalThis.TouchEvent) => {
      if (!canvasRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];

      if (draggedNoteIdRef.current && noteDragStartRef.current) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const dragStart = noteDragStartRef.current;
        const draggedNoteId = draggedNoteIdRef.current;
        animationFrameId = requestAnimationFrame(() => {
          const currentZoom = zoomRef.current;

          const deltaX = (touch.clientX - dragStart.x) / currentZoom;
          const deltaY = (touch.clientY - dragStart.y) / currentZoom;

          setNotes((prev) =>
            prev.map((n) =>
              n.id === draggedNoteId
                ? { ...n, x: n.x + deltaX, y: n.y + deltaY }
                : n
            )
          );

          setNoteDragStart({ x: touch.clientX, y: touch.clientY });
        });
      } else if (resizingNoteIdRef.current && noteResizeStartRef.current) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const resizeStart = noteResizeStartRef.current;
        const dir = noteResizeDirectionRef.current;
        animationFrameId = requestAnimationFrame(() => {
          const currentZoom = zoomRef.current;
          const dx = (touch.clientX - resizeStart.x) / currentZoom;
          const dy = (touch.clientY - resizeStart.y) / currentZoom;
          const origW = resizeStart.width;
          const origH = resizeStart.height;
          let newW = origW, newH = origH, newX: number | undefined, newY: number | undefined;

          if (dir.includes('e')) newW = Math.max(180, origW + dx);
          if (dir.includes('w')) { newW = Math.max(180, origW - dx); newX = resizeStart.noteX + (origW - newW); }
          if (dir.includes('s')) newH = Math.max(100, origH + dy);
          if (dir.includes('n')) { newH = Math.max(100, origH - dy); newY = resizeStart.noteY + (origH - newH); }

          setNotes((prev) =>
            prev.map((n) => {
              if (n.id !== resizingNoteIdRef.current) return n;
              const updated: CanvasNote = { ...n, width: newW, height: newH };
              if (newX !== undefined) updated.x = newX;
              if (newY !== undefined) updated.y = newY;
              return updated;
            })
          );
        });
      }
    };

    const handleMouseUp = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      setDraggedNoteId(null);
      setNoteDragStart(null);
      setResizingNoteId(null);
      setNoteResizeStart(null);
      setNoteResizeDirection('se');
    };

    const handleTouchEnd = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      setDraggedNoteId(null);
      setNoteDragStart(null);
      setResizingNoteId(null);
      setNoteResizeStart(null);
      setNoteResizeDirection('se');
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Notify parent of topology changes — debounced to avoid calling at 60fps during drag
  useEffect(() => {
    if (!onTopologyChange) return;
    if (topologyChangeTimerRef.current) clearTimeout(topologyChangeTimerRef.current);
    topologyChangeTimerRef.current = setTimeout(() => {
      const currentState = JSON.stringify({ devices, connections, notes });
      if (currentState !== lastStateRef.current) {
        lastStateRef.current = currentState;
        onTopologyChange(devices, connections, notes);
      }
      topologyChangeTimerRef.current = null;
    }, 150);
    return () => {
      if (topologyChangeTimerRef.current) clearTimeout(topologyChangeTimerRef.current);
    };
  }, [devices, connections, notes, onTopologyChange]);


  // Sync device counters with current devices to prevent ID collisions
  useEffect(() => {
    if (devices.length > 0) {
      const counters = { pc: 0, iot: 0, switch: 0, router: 0, firewall: 0, wlc: 0 };
      devices.forEach(d => {
        const match = d.id.match(/^(\w+)-(\d+)$/);
        if (match) {
          const rawType = match[1];
          const type = getCounterKey(rawType);
          const num = parseInt(match[2]);
          if (counters[type] !== undefined) {
            counters[type] = Math.max(counters[type], num);
          }
        }
      });
      deviceCounterRef.current = counters;
    }
  }, [devices, getCounterKey]);

  // Sync port shutdown status from deviceStates
  // FIXED: removed `devices` from deps — using functional setState (prev =>) to read latest devices
  // Previously having `devices` in deps + calling setDevices caused an infinite re-render loop
  useEffect(() => {
    if (!deviceStates) return;

    // BOLT: Pre-calculate maps for O(1) lookups during device/port synchronization
    // Reducing complexity from O(D * P * C) to O(C + D * P)
    const connectedPortKeys = new Set<string>();
    const pcConnectionMap = new Map<string, CanvasConnection>();

    connections.forEach(conn => {
      connectedPortKeys.add(`${conn.sourceDeviceId}:${conn.sourcePort}`);
      connectedPortKeys.add(`${conn.targetDeviceId}:${conn.targetPort}`);

      if ((conn.sourceDeviceId.startsWith('pc-') || conn.sourceDeviceId.startsWith('iot-')) && conn.sourcePort === 'eth0') {
        pcConnectionMap.set(conn.sourceDeviceId, conn);
      }
      if ((conn.targetDeviceId.startsWith('pc-') || conn.targetDeviceId.startsWith('iot-')) && conn.targetPort === 'eth0') {
        pcConnectionMap.set(conn.targetDeviceId, conn);
      }
    });

    setDevices(prev => {
      if (prev.length === 0) return prev;
      let hasChanges = false;
      const updatedDevices = prev.map(device => {
        const deviceState = deviceStates.get(device.id);
        if (!deviceState) return device;

        let portChanged = false;
        const updatedPorts = device.ports.map(port => {
          const simulatorPort = deviceState.ports[port.id];
          if (simulatorPort) {
            // Skip wlan ports from status sync - they are managed separately
            if (port.id.toLowerCase().startsWith('wlan')) {
              const wifiChanged = JSON.stringify(port.wifi) !== JSON.stringify(simulatorPort.wifi);
              const shutdownChanged = port.shutdown !== simulatorPort.shutdown;
              if (!wifiChanged && !shutdownChanged) return port;
              portChanged = true;
              hasChanges = true;
              return {
                ...port,
                shutdown: simulatorPort.shutdown ?? port.shutdown,
                ...(simulatorPort.wifi ? { wifi: { ...simulatorPort.wifi } } : {}),
              } as typeof port;
            }
            // BOLT: Optimized O(1) lookup for connected ports
            const hasActiveConnection = connectedPortKeys.has(`${device.id}:${port.id}`);

            // Translate simulator status → UI status
            // Simulator: 'connected' | 'notconnect' | 'disabled' | 'blocked'
            // UI:        'connected' | 'disconnected'
            let uiStatus: 'connected' | 'disconnected';
            if (hasActiveConnection) {
              uiStatus = 'connected';
            } else {
              // If no active connection, port must be disconnected regardless of simulator state
              uiStatus = 'disconnected';
            }

            const nextPort = {
              ...port,
              status: uiStatus,
              vlan: simulatorPort.vlan ?? port.vlan,
              accessVlan: simulatorPort.accessVlan ?? port.accessVlan,
              mode: simulatorPort.mode ?? port.mode,
              name: simulatorPort.name ?? port.name,
              description: simulatorPort.description ?? port.description,
              speed: simulatorPort.speed ?? port.speed,
              duplex: simulatorPort.duplex ?? port.duplex,
              shutdown: simulatorPort.shutdown ?? port.shutdown,
              ipAddress: simulatorPort.ipAddress ?? port.ipAddress,
              subnetMask: simulatorPort.subnetMask ?? port.subnetMask,
              // Preserve wifi config from simulator state
              ...(simulatorPort.wifi ? { wifi: simulatorPort.wifi } : {}),
            };
            const changed =
              nextPort.status !== port.status ||
              nextPort.vlan !== port.vlan ||
              nextPort.accessVlan !== port.accessVlan ||
              nextPort.mode !== port.mode ||
              nextPort.name !== port.name ||
              nextPort.description !== port.description ||
              nextPort.speed !== port.speed ||
              nextPort.duplex !== port.duplex ||
              nextPort.shutdown !== port.shutdown ||
              nextPort.ipAddress !== port.ipAddress ||
              nextPort.subnetMask !== port.subnetMask ||
              JSON.stringify(nextPort.wifi) !== JSON.stringify(port.wifi);
            if (changed) {
              portChanged = true;
              hasChanges = true;
              return nextPort;
            }
          }
          return port;
        });

        const baseDevice = portChanged ? { ...device, ports: updatedPorts } : device;

        // Keep PC VLAN in sync with the connected switch/router access VLAN.
        if (baseDevice.type === 'pc' || baseDevice.type === 'iot') {
          // BOLT: Optimized O(1) lookup for PC connections
          const pcConnection = pcConnectionMap.get(baseDevice.id);

          if (pcConnection) {
            const peerDeviceId = pcConnection.sourceDeviceId === baseDevice.id
              ? pcConnection.targetDeviceId
              : pcConnection.sourceDeviceId;
            const peerPortId = pcConnection.sourceDeviceId === baseDevice.id
              ? pcConnection.targetPort
              : pcConnection.sourcePort;

            const peerState = deviceStates.get(peerDeviceId);
            const peerPort = peerState?.ports?.[peerPortId];
            const peerVlan = Number(peerPort?.accessVlan || peerPort?.vlan || 1);

            if (Number(baseDevice.vlan || 1) !== peerVlan) {
              hasChanges = true;
              return { ...baseDevice, vlan: peerVlan };
            }
          }
        }

        return baseDevice;
      });
      return hasChanges ? updatedDevices : prev;
    });
  }, [deviceStates, connections]); // ← added connections to check for active connections



  // Reset view
  // resetView is now provided by useCanvasZoomPan hook

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (onFullscreenChange) {
      onFullscreenChange(!isFullscreen);
    }
  }, [isFullscreen, onFullscreenChange]);


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

  const handlePingClose = useCallback(() => {
    pingIsPausedRef.current = false;
    pingStepModeRef.current = false;
    if (pingAnimationRef.current) {
      cancelAnimationFrame(pingAnimationRef.current);
      pingAnimationRef.current = null;
    }
    if (pingCleanupTimeoutRef.current) {
      clearTimeout(pingCleanupTimeoutRef.current);
      pingCleanupTimeoutRef.current = null;
    }
    setPingAnimation(null);
    setHopPacketInfos([]);
    setPingMode(false);
    setPingSource(null);
    setPingResult(null);
  }, [setPingSource, setPingResult]);

  // findPath and cancelPingDueToInterruption are now managed by usePingAnimation hook

  // Keep ref updated for RAF closures
  useLayoutEffect(() => {
    cancelPingDueToInterruptionRef.current = cancelPingDueToInterruption;
  }, [cancelPingDueToInterruption]);

  // Sync ref after declaration to avoid TDZ
  useLayoutEffect(() => {
    startPingAnimationRef.current = startPingAnimation;
  }, [startPingAnimation]);

  // Handle device config updates from WiFi control panel (e.g., IoT disconnect)
  useEffect(() => {
    const handleUpdateDeviceConfig = (event: CustomEvent<{ deviceId: string; config: Partial<CanvasDevice> }>) => {
      const { deviceId, config } = event.detail;
      if (!deviceId) return;

      saveToHistory();
      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId
            ? { ...d, ...config }
            : d
        )
      );
    };

    const handleDeleteConnection = (event: CustomEvent<{ connectionId: string }>) => {
      if (event.detail.connectionId) {
        deleteConnection(event.detail.connectionId);
      }
    };

    window.addEventListener('update-topology-device-config', handleUpdateDeviceConfig as EventListener);
    window.addEventListener('delete-topology-connection', handleDeleteConnection as EventListener);

    return () => {
      window.removeEventListener('update-topology-device-config', handleUpdateDeviceConfig as EventListener);
      window.removeEventListener('delete-topology-connection', handleDeleteConnection as EventListener);
    };
  }, [setDevices, saveToHistory, deleteConnection]);

  // Handle external focus device request - pan to center
  useEffect(() => {
    if (focusDeviceId && deviceMap.get(focusDeviceId)) {
      const device = deviceMap.get(focusDeviceId);
      if (device && canvasRef.current) {
        const deviceCenter = getDeviceCenter(device);
        const { width: canvasWidth, height: canvasHeight } = canvasRef.current.getBoundingClientRect();

        // Calculate pan to center the device
        const targetPanX = (canvasWidth / 2) - (deviceCenter.x * zoom);
        const targetPanY = (canvasHeight / 2) - (deviceCenter.y * zoom);

        setPan({ x: targetPanX, y: targetPanY });

        // Notify parent of pan change
        if (onPanChange) {
          onPanChange({ x: targetPanX, y: targetPanY });
        }
      }
    }
  }, [focusDeviceId, devices, zoom, onPanChange, deviceMap]);

  // Sync getPortPosition ref for direct DOM connection updates during drag
  useEffect(() => {
    getPortPositionRef.current = getPortPosition;
  }, []);

  // Render device
  const renderDevice = (device: CanvasDevice, isDragging: boolean = false) => {
    return (
      <DeviceRenderer
        device={device}
        topologyDevices={devices}
        isDragging={isDragging}
        isSelected={selectedDeviceSet.has(device.id)}
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
        _mousePosRef={mousePosRef}
        isDrawingConnection={isDrawingConnection}
        connectionStart={connectionStart}
      />
    );
  };


  // Keyboard Event Hook (moved below callback definitions to avoid TDZ / use-before-declaration errors)
  useCanvasKeyboard({
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
    isPingPanelVisible
  });

  const _liveRegionText = useMemo(() => {
    const selectedCount = selectedDeviceIds.length;
    const totalCount = devices.length;
    const deviceLabel = totalCount === 1
      ? (language === 'tr' ? 'cihaz' : 'device')
      : (language === 'tr' ? 'cihaz' : 'devices');
    let text = `${totalCount} ${deviceLabel}`;
    if (selectedCount > 0) {
      const selLabel = selectedCount === 1
        ? (language === 'tr' ? 'seçili' : 'selected')
        : (language === 'tr' ? 'seçili' : 'selected');
      text += `, ${selectedCount} ${selLabel}`;
    }
    return text;
  }, [devices.length, selectedDeviceIds.length, language]);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className={`${isFullscreen ? 'fixed inset-0 z-[9999] overflow-hidden' : 'relative w-full h-full'} flex flex-col ${isDark
        ? 'bg-gradient-to-br from-secondary-800/90 via-secondary-700/80 to-secondary-800/90'
        : 'bg-gradient-to-br from-primary-50/50 via-white to-secondary-50/80'
        }`}
    >
      {isFullscreen && (
        <TooltipWrapper title={t.exit}>
          <button
            onClick={toggleFullscreen}
            className={`fixed top-4 right-4 z-[10000] flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-colors ${isDark
              ? 'bg-secondary-800/90 hover:bg-error-500/30 text-secondary-300 hover:text-error-400 border border-secondary-600'
              : 'bg-white/90 hover:bg-error-500/30 text-secondary-600 hover:text-error-600 border border-secondary-300'
              }`}
          >
            <X className="w-4 h-4" />
          </button>
        </TooltipWrapper>
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative flex flex-col">
          {/* Palette Sheet (Triggered from Top Toolbar) */}
          <TopologyPaletteSheet isPaletteOpen={isPaletteOpen} setIsPaletteOpen={setIsPaletteOpen} isDark={isDark} isTR={isTR} t={t} addDevice={addDevice} cableInfo={cableInfo} onCableChange={onCableChange} DEVICE_ICONS={DEVICE_ICONS} />
          {/* Multiple Selection Indicator & Tools */}
          {/* Ping mode cursor label */}
          {pingMode && pingCursorPos && (
            <div
              className="fixed z-[200] pointer-events-none select-none"
              style={{ left: pingCursorPos.x + 16, top: pingCursorPos.y + 16 }}
            >
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-lg ${pingSource
                ? (isDark ? 'bg-yellow-500 text-white' : 'bg-yellow-400 text-white')
                : (isDark ? 'bg-primary-600 text-white' : 'bg-primary-500 text-white')
                }`}>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {pingSource
                  ? t.selectTarget
                  : t.selectSource
                }
              </div>
            </div>
          )}

          <TopologySelectionToolbar
            isDark={isDark}
            t={t}
            selectedDeviceIds={selectedDeviceIds}
            deviceMap={deviceMap}
            handleAlign={handleAlign}
            setSelectedDeviceIds={setSelectedDeviceIds}
            onDeviceSelect={onDeviceSelect}
            saveToHistory={saveToHistory}
            deleteDevice={deleteDevice}
          />

          {/* Canvas */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">{_liveRegionText}</div>
          <div
            ref={canvasRef}
            className={`w-full h-full flex-1 min-h-[500px] overflow-hidden relative touch-none select-none print:overflow-visible print:h-auto print:min-h-full topology-print-area ${pingMode || isSelecting ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
            role="application"
            aria-label={t.topologyAriaLabel}
            tabIndex={0}
            onMouseDown={handleCanvasMouseDown}

            onAuxClick={(e) => { if (e.button === 1) e.preventDefault(); }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseMove={(e) => {
              if (pingMode) setPingCursorPos({ x: e.clientX, y: e.clientY });
            }}
            onMouseLeave={() => setPingCursorPos(null)}
            onDoubleClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            onClick={() => {
              canvasRef.current?.focus();
              setSelectedDeviceIds([]);
              setSelectedNoteIds([]);
              setSelectAllMode(false);
              if (pingMode || pingSource) {
                setPingMode(false);
                setPingSource(null);
                setPingResult(null);
              }
              cancelConnectionDrawing();
              setContextMenu(null);
            }}
            onContextMenu={(e) => {
              // Show text editing options if editing a note
              const target = e.target as HTMLElement;
              const noteElement = target.closest('[data-note-id]');
              const textareaElement = noteElement?.querySelector('textarea');
              const contentEditableElement = noteElement?.querySelector('[contenteditable]');

              const isEditingNote = textareaElement?.matches(':focus') || contentEditableElement?.matches(':focus');

              if (isEditingNote) {
                e.preventDefault();
                e.stopPropagation();
                // Allow native text editing context menu on mobile/desktop
                // The browser will show copy, cut, paste, select all options
              } else {
                handleContextMenu(e as unknown as ReactMouseEvent);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelConnectionDrawing();
              }
              if (e.key === 'Enter' && selectedDeviceIds.length > 0) {
                const lastId = selectedDeviceIds[selectedDeviceIds.length - 1];
                const selectedDevice = deviceMap.get(lastId);
                if (selectedDevice) {
                  if (selectedDeviceIds.length > 1) {
                    setSelectedDeviceIds([lastId]);
                  }
                  handleDeviceDoubleClick(selectedDevice);
                }
              }
            }}
          >
            {/* SVG Layer with Grid and Content */}
            <svg
              width="100%"
              height="100%"
              className="block select-none print:w-full print:h-auto print:block"
            >
              <g
                ref={svgContentGroupRef}
                data-content-group="true"
                style={{
                  // transform is written directly to DOM via svgContentGroupRef during pan/zoom.
                  // A useLayoutEffect below syncs non-interactive state changes (e.g. reset view).
                  // We intentionally do NOT read from pan/zoom state here to prevent React
                  // re-renders from overwriting the DOM transform mid-interaction.
                   transformOrigin: '0 0',
                  transition: 'none',
                  willChange: 'transform',
                }}
              >
                {/* Clip path for canvas boundaries */}
                <CanvasDefs isDark={isDark} canvasWidth={getCanvasDimensions().width} canvasHeight={getCanvasDimensions().height} />

                {/* Canvas Background with Grid - clipped to boundaries */}
                <g clipPath="url(#canvasClip)">
                  {/* Background */}
                  <rect
                    x="0"
                    y="0"
                    width={getCanvasDimensions().width}
                    height={getCanvasDimensions().height}
                    fill="url(#canvasBgGradient)"
                  />
                  {/* Major Grid Lines (subtle) */}
                  <rect
                    data-export-hide="true"
                    x="0"
                    y="0"
                    width={getCanvasDimensions().width}
                    height={getCanvasDimensions().height}
                    fill="url(#majorGridPattern)"
                  />
                  {/* Grid Dots */}
                  <rect
                    data-export-hide="true"
                    x="0"
                    y="0"
                    width={getCanvasDimensions().width}
                    height={getCanvasDimensions().height}
                    fill="url(#gridPattern)"
                  />

                  {/* Environment Backgrounds */}
                  <EnvironmentBackgrounds environment={environment} isDark={isDark} t={t} />

                  {/* Visual Connection Lines (Behind devices) */}
                  {/* BOLT: Use visibleConnections for culling and O(1) meta lookup */}
                  {visibleConnections.map((conn) => {
                    const sourceDevice = deviceMap.get(conn.sourceDeviceId);
                    const targetDevice = deviceMap.get(conn.targetDeviceId);
                    if (!sourceDevice || !targetDevice) return null;

                    const meta = connectionMeta.get(conn.id) || { index: 0, total: 1 };
                    const sameConnIndex = meta.index;
                    const totalSameConns = meta.total;

                    return (
                      <ConnectionLine
                        key={`line-${conn.id}`}
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
                        isHovered={hoveredConnectionId === conn.id || activeCaptureConnectionId === conn.id}
                        onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => handleConnectionMouseEnter(e, conn.id, sourceDevice.name, conn.sourcePort, targetDevice.name, conn.targetPort, conn.cableType, getConnectionStatusMessage(conn, devices, language))}
                        onMouseLeave={handleConnectionMouseLeave}
                        onClick={(e: React.MouseEvent) => handleConnectionClick(e, conn.id)}
                        deviceStates={deviceStates}
                      />
                    );
                  })}

                  {/* Connection interaction handles (Trash icons) — kablo üstünde */}
                  {/* BOLT: Use visibleConnections for culling */}
                  {visibleConnections.map((conn) => {
                    const sourceDevice = deviceMap.get(conn.sourceDeviceId);
                    const targetDevice = deviceMap.get(conn.targetDeviceId);
                    if (!sourceDevice || !targetDevice) return null;
                    const meta = connectionMeta.get(conn.id) || { index: 0, total: 1 };
                    return (
                      <ConnectionHandle
                        key={`handle-${conn.id}`}
                        connection={conn}
                        sourceDevice={sourceDevice}
                        targetDevice={targetDevice}
                        isDark={isDark}
                        sameConnIndex={meta.index}
                        totalSameConns={meta.total}
                        getPortPosition={getPortPosition}
                        onDelete={deleteConnection}
                        onToggleActive={toggleConnectionActive}
                      />
                    );
                  })}

                  {/* Temporary connection line */}
                  <TempConnection
                    isDrawingConnection={isDrawingConnection}
                    connectionStart={connectionStart}
                    mousePos={mousePos}
                    cableInfo={cableInfo}
                    CABLE_COLORS={CABLE_COLORS}
                  />

                  {/* Devices */}
                  {devicesSortedForRender.map((device) => {
                    const isCurrentlyDragging = (draggedDevice === device.id && isActuallyDragging) ||
                      (touchDraggedDevice?.id === device.id && isTouchDragging);
                    return (
                      <DeviceNode
                        key={device.id}
                        device={device}
                        deviceState={deviceStates?.get(device.id)}
                        isSelected={selectedDeviceSet.has(device.id) || activeDeviceId === device.id || (pingMode && pingSource?.id === device.id) || (mobileConnectionSource === device.id)}
                        isDragging={isCurrentlyDragging}
                        isActive={activeDeviceId === device.id}
                        isDark={isDark}
                        iotUpdateTrigger={iotUpdateTrigger}
                        onMouseDown={(e, id) => handleDeviceMouseDown(e as unknown as ReactMouseEvent, id)}
                        onPointerDown={(e, id) => handleDevicePointerDown(e, id)}
                        onClick={(e, device) => handleDeviceClick(e as unknown as ReactMouseEvent, device)}
                        onDoubleClick={() => handleDeviceDoubleClick(device)}
                        onContextMenu={(e, id) => handleContextMenu(e as unknown as ReactMouseEvent, id)}
                        onKeyboardNavigation={(e) => handleDeviceKeyDown(e, device)}
                        onMouseLeave={() => handleDeviceMouseLeave()}
                        onTouchStart={(e, id) => handleDeviceTouchStart(e as unknown as ReactTouchEvent, id)}
                        onTouchMove={handleDeviceTouchMove}
                        onTouchEnd={handleDeviceTouchEnd}
                        isDrawingConnection={isDrawingConnection}
                        renderDeviceContent={renderDevice}
                      />
                    );
                  })}

                  {/* Notes */}
                  {visibleNotes.map((note) => (
                    <NoteNode
                      key={note.id}
                      note={note}
                      isDark={isDark}
                      selectedNoteIds={selectedNoteIds}
                      draggedNoteId={draggedNoteId}
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
                      onTopologyChange={onTopologyChange}
                      handleNoteResizeStart={handleNoteResizeStart}
                      handleNoteResizeTouchStart={handleNoteResizeTouchStart}
                      bringNoteToFront={bringNoteToFront}
                    />
                  ))}

                  {/* Broadcast flood icons – animated envelopes flying from switch to each connected device (Hidden) */}
                  {false && (() => {
                    const anim = pingAnimation as NonNullable<typeof pingAnimation>;
                    return anim.broadcastAnim.map((bcast: BroadcastAnimTarget) => {
                      const prog = anim.broadcastProgress ?? 0;
                      const ex = bcast.fromX + (bcast.toX - bcast.fromX) * prog;
                      const ey = bcast.fromY + (bcast.toY - bcast.fromY) * prog - 35;
                      const opacity = prog < 0.1 ? prog * 10 : prog > 0.9 ? (1 - prog) * 10 : 1;
                      return (
                        <g key={`bcast-${bcast.targetId}`}>
                          <circle cx={ex} cy={ey} r="14" fill="var(--color-error-500)" opacity={0.2 * opacity} className="animate-ping-glow" />
                          <rect x={ex - 10} y={ey - 7} width="20" height="14" rx="2" fill="var(--color-error-500)" stroke="var(--color-error-600)" strokeWidth="1.5" opacity={opacity} />
                          <path d={`M${ex - 8} ${ey - 3} L${ex} ${ey + 4} L${ex + 8} ${ey - 3}`} fill="none" stroke="var(--color-white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
                        </g>
                      );
                    });
                  })()}
                  {/* Ping Animation - rendered LAST for top z-order */}
                  <PingAnimationOverlay
                    pingAnimation={pingAnimation}
                    deviceMap={deviceMap}
                    connections={connections}
                    getPortPosition={getPortPosition}
                    getDeviceCenter={getDeviceCenter}
                    graphicsQuality={graphicsQuality}
                    isDark={isDark}
                    t={t}
                    handleEnvelopeClick={handleEnvelopeClick}
                  />

                  {/* Rectangle Selection Box */}
                  {selectionBox && (
                    <SelectionBoxOverlay
                      selectionBox={selectionBox}
                      isDark={isDark}
                      zoom={zoom}
                      selectedDeviceCount={selectedDeviceIds.length}
                    />
                  )}

                </g>

                {/* Canvas Boundary Border */}
                <rect
                  data-export-hide="true"
                  x="0"
                  y="0"
                  width={getCanvasDimensions().width}
                  height={getCanvasDimensions().height}
                  fill="none"
                  stroke={isDark ? 'var(--color-primary-600)' : 'var(--color-primary-700)'}
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${6 / zoom},${4 / zoom}`}
                  opacity={0.7}
                />

                {/* Canvas size label - bottom right only */}
                <text
                  data-export-hide="true"
                  x={getCanvasDimensions().width - 80}
                  y={getCanvasDimensions().height - 10}
                  style={{ fill: 'var(--color-secondary-500)' }}
                  fontSize={12 / zoom}
                  fontFamily="monospace"
                >
                  {getCanvasDimensions().width} × {getCanvasDimensions().height}
                </text>
              </g>
            </svg>
          </div>


          {/* Mobile FAB for Device Addition */}


          {/* Zoom Controls - Mobile Float - Above Footer */}
          <CanvasToolbar
            zoom={zoom}
            setZoom={setZoom}
            setPan={setPan}
            canvasRef={canvasRef}
            resetView={resetView}
            handleZoomMouseDown={handleZoomMouseDown}
            handleZoomWheel={handleZoomWheel}
            isDraggingZoom={isDraggingZoom}
            isDark={isDark}
            t={t}
            MIN_ZOOM={MIN_ZOOM}
            MAX_ZOOM={MAX_ZOOM}
          />

          {/* Zoom Controls - Desktop Only - Hidden (now in footer) */}
          <div
            className={`hidden`}
          >
            <button
              onClick={() => setZoom((z) => {
                const newZoom = Math.max(MIN_ZOOM, z - 0.25);
                if (!canvasRef.current) return newZoom;
                const rect = canvasRef.current.getBoundingClientRect();
                const cursorX = rect.width / 2;
                const cursorY = rect.height / 2;
                setPan(prevPan => ({
                  x: cursorX - (cursorX - prevPan.x) * (newZoom / z),
                  y: cursorY - (cursorY - prevPan.y) * (newZoom / z)
                }));
                return newZoom;
              })}
              className={`w-7 h-7 flex items-center justify-center rounded ui-hover-surface ${isDark ? 'text-secondary-300 hover:text-secondary-100' : 'text-secondary-600 hover:text-secondary-900'
                }`}
            >
              −
            </button>
            <span
              onMouseDown={handleZoomMouseDown}
              onWheel={handleZoomWheel}
              className={`text-xs font-mono w-12 text-center cursor-pointer select-none rounded transition-colors ${isDraggingZoom
                ? 'text-primary-400'
                : isDark
                  ? 'text-secondary-300 hover:bg-secondary-700'
                  : 'text-secondary-600 hover:bg-secondary-100'
                }`}
              title={t.dragToZoomOrScroll}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => {
                const newZoom = Math.min(MAX_ZOOM, z + 0.25);
                if (!canvasRef.current) return newZoom;
                const rect = canvasRef.current.getBoundingClientRect();
                const cursorX = rect.width / 2;
                const cursorY = rect.height / 2;
                setPan(prevPan => ({
                  x: cursorX - (cursorX - prevPan.x) * (newZoom / z),
                  y: cursorY - (cursorY - prevPan.y) * (newZoom / z)
                }));
                return newZoom;
              })}
              className={`w-7 h-7 flex items-center justify-center rounded ui-hover-surface ${isDark ? 'text-secondary-300 hover:text-secondary-100' : 'text-secondary-600 hover:text-secondary-900'
                }`}
            >
              +
            </button>
            <div className={`w-px h-5 ${isDark ? 'bg-secondary-600' : 'bg-secondary-300'} mx-1`} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={resetView}
                  className={`px-2 py-1 text-xs rounded ui-hover-surface ${isDark
                    ? 'text-secondary-300 hover:text-secondary-100'
                    : 'text-secondary-600 hover:text-secondary-900'
                    }`}
                >
                  {t.reset}
                </button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>{t.reset}</span>
                <ShortcutBadge shortcut="Alt+R" variant="primary" />
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleFullscreen}
                  className={`px-2 py-1 text-xs rounded flex items-center gap-1 ui-hover-surface ${isDark
                    ? 'text-secondary-300 hover:text-secondary-100'
                    : 'text-secondary-600 hover:text-secondary-900'
                    }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  {isFullscreen ? t.exit : t.fullScreen}
                </button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <ShortcutBadge shortcut="Ctrl+F" variant="warning" />
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Minimap (Preview) - Hidden */}
          <TopologyPrintPreview canvasWidth={getCanvasDimensions().width} canvasHeight={getCanvasDimensions().height} zoom={zoom} isDark={isDark} connections={connections} devicesSortedForRender={devicesSortedForRender} deviceMap={deviceMap} getDeviceWidth={getDeviceWidth} getDeviceHeight={getDeviceHeight} isSwitchDeviceType={isSwitchDeviceType} />

        </div>
      </div>

      {/* Context Menu - Using lazy-loaded NetworkTopologyContextMenu component */}
      <LazyNetworkTopologyContextMenu
        contextMenu={contextMenu}
        contextMenuRef={contextMenuRef}
        isDark={isDark}
        language={language}
        noteFonts={Array.from(NOTE_FONTS)}
        notes={notes}
        devices={devices}
        selectedDeviceIds={selectedDeviceIds}
        clipboardLength={clipboard.length}
        noteClipboardLength={noteClipboard.length}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < historyLength - 1}
        isExamActive={isExamActive}
        isPingPanelOpen={isPingPanelVisible}
        onClose={() => setContextMenu(null)}
        onUpdateNoteStyle={(id, style) => updateNoteStyle(id, style)}
        onNoteCut={(id) => handleNoteTextCut(id)}
        onNoteCopy={(id) => handleNoteTextCopy(id)}
        onNotePaste={(id) => handleNoteTextPaste(id)}
        onNoteDeleteText={(id) => handleNoteTextDelete(id)}
        onNoteSelectAllText={(id) => handleNoteTextSelectAll(id)}
        onDuplicateNote={(id) => duplicateNote(id)}
        onPasteNotes={(x, y) => pasteNotes(x, y)}
        onUndo={() => handleUndo()}
        onRedo={() => handleRedo()}
        onSelectAll={() => selectAllDevices()}
        onOpenDevice={(d) => handleDeviceDoubleClick(d)}
        onCutDevices={(ids) => { saveToHistory(); cutDevice(ids); }}
        onCopyDevices={(ids) => copyDevice(ids)}
        onPasteDevice={() => pasteDevice()}
        onDeleteDevices={(ids) => { saveToHistory(); ids.forEach(id => deleteDevice(id)); setSelectedDeviceIds([]); }}
        onStartConfig={startDeviceConfig}
        onStartPing={(id) => {
          const device = deviceMap.get(id);
          if (device) {
            setPingMode(true);
            setPingSource(device);
            setPingResult(null);
          }
        }}
        onTogglePowerDevices={(ids) => { saveToHistory(); togglePowerDevices(ids); }}
        onSaveToHistory={() => saveToHistory()}
        onClearDeviceSelection={() => setSelectedDeviceIds([])}
        onOpenTasks={onOpenTasks}
        onRefreshNetwork={handleRefresh}
        note={notes.find(n => n.id === contextMenu?.noteId)}
      />
      <TopologyTooltips
        portTooltip={portTooltip}
        deviceMap={deviceMap}
        deviceStates={deviceStates}
        isDark={isDark}
        language={language}
        getIotDeviceStatus={getIotDeviceStatus}
        getIotPowerStatus={getIotPowerStatus}
        getIotOpenCloseStatus={getIotOpenCloseStatus}
        getLivePortVlanText={getLivePortVlanText}
        connectionTooltip={connectionTooltip}
        CABLE_COLORS={CABLE_COLORS}
        deviceTooltip={deviceTooltip}
        isTR={isTR}
        isDraggingInteractionDisabled={isDraggingInteractionDisabled}
        t={{
          ipAddress: t.ipAddress,
          subnetMask: t.subnetMask,
          gateway: t.gateway,
          dnsServer: t.dnsServer,
          macAddress: t.macAddress,
          dhcpEnabled: t.dhcpEnabled,
          openServices: t.openServices,
          active: t.active,
        }}
      />
      <TopologyModals
        configuringDevice={configuringDevice}
        deviceMap={deviceMap}
        cancelDeviceConfig={cancelDeviceConfig}
        saveDeviceConfig={saveDeviceConfig}
        isMobile={isMobile}
        isDark={isDark}
        pingAnimation={pingAnimation}
        hopPacketInfos={hopPacketInfos}
        handlePingPlay={handlePingPlay}
        handlePingPause={handlePingPause}
        handlePingNext={handlePingNext}
        handlePingClose={handlePingClose}
        language={language}
        graphicsQuality={graphicsQuality}
        onPacketPanelFocus={onPacketPanelFocus}
        packetPanelZIndex={packetPanelZIndex}
        packetPopupHop={packetPopupHop}
        setPacketPopupHop={setPacketPopupHop}
        errorToast={errorToast}
        setErrorToast={setErrorToast}
        connectionError={connectionError}
        mobilePaletteOpen={mobilePaletteOpen}
        setMobilePaletteOpen={setMobilePaletteOpen}
        isTR={isTR}
        addDevice={addDevice}
        cableInfo={cableInfo}
        onCableChange={onCableChange}
        showPortSelector={showPortSelector}
        devices={devices}
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
        setActiveCaptureConnection={setActiveCaptureConnection}
        capturedPacketsMap={capturedPacketsMap}
        t={t}
      />

    </div>
  );
};
