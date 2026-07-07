'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import React from 'react';
import { flushSync } from 'react-dom';
import dynamic from 'next/dynamic';
import { useAppStore, useTopologyDevices, useTopologyConnections, useTopologyNotes, useGraphicsQuality, useIsSimulationMode, useEnvironment } from '@/lib/store/appStore';
import { isCableCompatible } from '@/lib/network/types';
import { checkDeviceConnectivity, getPingDiagnostics, getWirelessDistance } from '@/lib/network/connectivity';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { useNetworkRefreshWithPositions } from '@/hooks/useNetworkRefreshWithPositions';
import { useSpatialPartitioning } from '@/lib/performance/spatial';
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipWrapper } from "@/components/ui/TooltipWrapper";
import { ShortcutBadge } from "@/components/ui/ShortcutBadge";
import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType, NetworkTopologyProps } from './networkTopology.types';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { ConnectionLine } from './ConnectionLine';
import { ConnectionHandle } from './ConnectionHandle';
import { DeviceNode } from './DeviceNode';
import LazyNetworkTopologyContextMenu from './LazyNetworkTopologyContextMenu';
import { LazyNetworkTopologyPortSelectorModal } from './LazyNetworkTopologyPortSelectorModal';
import { PacketCapturePanel } from './PacketCapturePanel';
import { Trash2, X, Cable, LineSquiggle, Plug, TrendingUpDown, Wifi } from "lucide-react";

import { areArraysEqual } from '@/lib/network/equality';
import { getDeviceWidth, getDeviceHeight, getConnectionStatusMessage } from './networkTopology.helpers';
import { CABLE_COLORS, DRAG_THRESHOLD, LONG_PRESS_DURATION, TOOLTIP_DELAY, TOOLTIP_OFFSET_Y, VIRTUAL_CANVAS_WIDTH_MOBILE, VIRTUAL_CANVAS_HEIGHT_MOBILE, VIRTUAL_CANVAS_WIDTH_DESKTOP, VIRTUAL_CANVAS_HEIGHT_DESKTOP, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, NOTE_COLORS, NOTE_FONTS_DESKTOP as NOTE_FONTS, NOTE_FONT_SIZES, NOTE_OPACITY as NOTE_OPACITY_OPTIONS, PC_PORT_SPACING, PORT_SPACING, PORT_START_X, PORT_START_Y, MOMENTUM_THRESHOLD, MOMENTUM_DECAY, MOMENTUM_MIN_SPEED } from './networkTopology.constants';
import { logger } from '@/lib/logger';
import { PacketPopup } from './topology/PacketPopup';
import { DeviceTooltip } from './topology/DeviceTooltip';
import { NoteNode } from './topology/NoteNode';
import { DeviceConfigModal } from './DeviceConfigModal';
import { useCanvasActions } from '../../hooks/useCanvasActions';
import { exportTopologyToPNG } from '../../utils/exportPNG';

import { useCanvasZoomPan } from './hooks/useCanvasZoomPan';
import { useCanvasKeyboard } from './hooks/useCanvasKeyboard';
import { useDeviceDrag } from './hooks/useDeviceDrag';
import { useCanvasSelection } from './hooks/useCanvasSelection';
import { useNoteEditing } from './hooks/useNoteEditing';
import { useConnectionDrawing } from './hooks/useConnectionDrawing';
import { usePingAnimation } from './hooks/usePingAnimation';
import { usePingSequence, type PingAnimationState, type BroadcastAnimTarget } from './hooks/usePingSequence';
import { CanvasToolbar } from './topology/CanvasToolbar';
import { DeviceRenderer } from './topology/DeviceRenderer';

import { CanvasDefs } from './topology/CanvasDefs';
import { TopologyPrintPreview } from './topology/TopologyPrintPreview';
import { TopologyPaletteSheet } from './topology/TopologyPaletteSheet';
import { PortTooltip } from './topology/PortTooltip';
import { ConnectionTooltip } from './topology/ConnectionTooltip';
import { TempConnection } from './topology/TempConnection';
import { EnvironmentBackgrounds } from './topology/EnvironmentBackgrounds';

const PingPacketInfoPanel = dynamic(
  () => import('./PingPacketInfoPanel').then((m) => m.PingPacketInfoPanel),
  { ssr: false }
);

const DEVICE_ICONS: Record<DeviceType | 'switch', React.ReactNode> = {
  pc: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-primary-500)' }} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z" />
    </svg>
  ),
  iot: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-secondary-500)' }} viewBox="0 -2 27 27">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.247 7.761a6 6 0 0 1 0 8.478" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.075 4.933a10 10 0 0 1 0 14.134" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.925 19.067a10 10 0 0 1 0-14.134" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.753 16.239a6 6 0 0 1 0-8.478" />
      <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} cx="12" cy="12" r="2" />
    </svg>
  ),
  switch: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-accent-500)' }} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  switchL2: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-success-500)' }} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  switchL3: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-purple-500)' }} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  router: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-purple-500)' }} viewBox="0 0 24 24">
      <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
    </svg>
  ),
  firewall: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-error-500)' }} viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  ),
  wlc: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-warning-400)' }} viewBox="0 0 24 24" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
    </svg>
  ),
};

const isSwitchDeviceType = (type: DeviceType) => type === 'switchL2' || type === 'switchL3';

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};




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

  // Use spatial partitioning for efficient visibility culling
  const { visibleDeviceIds, visibleConnectionIds, updateViewport } = useSpatialPartitioning(
    devices,
    connections,
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

    // Update viewport for spatial partitioning
    updateViewport({
      x: pan.x,
      y: pan.y,
      width,
      height,
      zoom,
    });

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
  }, [devices, connections, notes, zoom, pan, isActive, canvasDimensions, visibleDeviceIds, visibleConnectionIds, updateViewport]);

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
      // BOLT: Use selectedDeviceSet for O(1) membership checks during sorting
      if (selectedDeviceSet.has(a.id) && !selectedDeviceSet.has(b.id)) return 1;
      if (!selectedDeviceSet.has(a.id) && selectedDeviceSet.has(b.id)) return -1;
      return 0;
    });
  }, [visibleDevices, activeDeviceId, selectedDeviceSet]);

  // Sync internal selection with prop from parent
  useEffect(() => {
    if (activeDeviceId) {
      // Only sync if the prop device is not already part of our selection
      setTimeout(() => setSelectedDeviceIds(prev => {
        if (prev.includes(activeDeviceId)) return prev;
        return [activeDeviceId];
      }), 0);
    }
    // If activeDeviceId becomes null (panel closed), we specifically DON'T clear 
    // the selection here to satisfy the user request.
  }, [activeDeviceId]);

  // Handle external focus device request (e.g., from WiFi admin panel) - selection only
  useEffect(() => {
    if (focusDeviceId && deviceMap.get(focusDeviceId)) {
      setTimeout(() => setSelectedDeviceIds([focusDeviceId]), 0);
    }
  }, [focusDeviceId, deviceMap]);

  // Select all state
  const [_selectAllMode, setSelectAllMode] = useState(false);

  // Handle external clear selection trigger (e.g., from Tab key)
  useEffect(() => {
    if (clearSelectionTrigger !== undefined) {
      setTimeout(() => setSelectedDeviceIds([]), 0);
      selectedDeviceIdsRef.current = [];
      setTimeout(() => setSelectAllMode(false), 0);
    }
  }, [clearSelectionTrigger]);

  // Selection box state
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);
  const selectionBoxRef = useRef<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const isSelectingRef = useRef(false);

  // draggedDevice and isActuallyDragging are now managed by useDeviceDrag hook

  // Drag performance - use ref for animation frame throttling
  const dragAnimationFrameRef = useRef<number | null>(null);
  const lastDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  // Ref to track if we were dragging (for click handler to check without stale closure)
  const wasDraggingRef = useRef(false);
  // Direct DOM drag positions - bypasses React state during drag, synced on mouseup
  const liveDeviceDragPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Ref to track if shift key was pressed during mousedown
  const shiftKeyPressedRef = useRef(false);

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
  const touchDragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchDragOffsetRef = useRef({ x: 0, y: 0 });
  const activePointerDragRef = useRef(false);
  const activeDragPointerIdRef = useRef<number | null>(null);

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
  // cancelConnectionDrawing is now managed by useConnectionDrawing hook

  type ContextMenuMode = 'device' | 'note-edit' | 'canvas';
  type ContextMenuState = {
    x: number;
    y: number;
    deviceId: string | null;
    noteId: string | null;
    mode: ContextMenuMode;
  };
  // Context menu state - device, note, or empty canvas
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Clipboard state for copy/cut/paste
  const [clipboard, setClipboard] = useState<CanvasDevice[]>([]);
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
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchDraggedDevice, setTouchDraggedDevice] = useState<CanvasDevice | null>(null);
  const [touchDragStartPos, setTouchDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [touchDragOffset, setTouchDragOffset] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [_touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTimeRef = useRef(0);
  const lastTappedDeviceRef = useRef<string | null>(null);

  // Advanced Canvas Pan/Zoom Touch state
  const [lastTouchCenter, setLastTouchCenter] = useState<{ x: number; y: number } | null>(null);

  // Tap-tap connection state
  const [mobileConnectionSource, setMobileConnectionSource] = useState<string | null>(null);

  // Ping and port selector state
  const [showPortSelector, setShowPortSelector] = useState(false);
  const [portSelectorStep, setPortSelectorStep] = useState<'source' | 'target'>('source');
  const [selectedSourcePort, setSelectedSourcePort] = useState<{ deviceId: string; portId: string } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
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
  const connectionTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const portTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const {
    generateUniqueLinkLocalIp,
    generateUniqueLinkLocalIpv6,
    generateUniqueHostname,
    addDevice,
    deleteDevice,
    getNextNoteId,
    addNote,
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

  const isDraggingInteractionDisabled = isActuallyDragging || isTouchDragging;


  // Start device config
  const startDeviceConfig = useCallback((deviceId: string) => {
    setConfiguringDevice(deviceId);
    setContextMenu(null);
  }, []);

  // Cancel device config
  const cancelDeviceConfig = useCallback(() => {
    setConfiguringDevice(null);
  }, []);

  // Save device config
  const saveDeviceConfig = useCallback((deviceId: string, updates: Partial<CanvasDevice>) => {
    saveToHistory();
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, ...updates }
          : d
      )
    );
    setConfiguringDevice(null);
  }, [saveToHistory, setDevices]);

  // Delete device and its connections
  // Toggle power for devices (bulk operation)
  const togglePowerDevices = useCallback((deviceIds: string[]) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (deviceIds.includes(d.id)) {
          return {
            ...d,
            status: d.status === 'online' ? 'offline' : 'online'
          };
        }
        return d;
      })
    );
  }, []);

  // selectAllDevices is now managed by useCanvasSelection hook

  // Handle alignment for multiple selected devices
  const handleAlign = useCallback((type: 'top' | 'bottom' | 'left' | 'right' | 'h-center' | 'v-center') => {
    logger.debug('[handleAlign] called with type:', type, 'selectedDeviceIds:', selectedDeviceIds);
    if (selectedDeviceIds.length < 2) {
      logger.debug('[handleAlign] early return - less than 2 devices selected');
      return;
    }
    saveToHistory();

    setDevices(prev => {
      const selectedDevices = prev.filter(d => selectedDeviceIds.includes(d.id));
      logger.debug('[handleAlign] selectedDevices:', selectedDevices.map(d => ({ id: d.id, x: d.x, y: d.y })));
      if (selectedDevices.length < 2) {
        logger.debug('[handleAlign] early return from setDevices - less than 2 devices found');
        return prev;
      }

      let targetX = 0;
      let targetY = 0;

      switch (type) {
        case 'top':
          targetY = Math.min(...selectedDevices.map(sd => sd.y));
          logger.debug('[handleAlign] top alignment - targetY:', targetY);
          break;
        case 'bottom':
          targetY = Math.max(...selectedDevices.map(sd => sd.y));
          break;
        case 'left':
          targetX = Math.min(...selectedDevices.map(sd => sd.x));
          logger.debug('[handleAlign] left alignment - targetX:', targetX);
          break;
        case 'right':
          targetX = Math.max(...selectedDevices.map(sd => sd.x));
          break;
        case 'h-center':
          targetX = selectedDevices.reduce((sum, sd) => sum + sd.x, 0) / selectedDevices.length;
          break;
        case 'v-center':
          targetY = selectedDevices.reduce((sum, sd) => sum + sd.y, 0) / selectedDevices.length;
          break;
      }

      const result = prev.map(d => {
        if (!selectedDeviceIds.includes(d.id)) return d;

        const updatedDevice = { ...d };

        if (type === 'top' || type === 'bottom' || type === 'v-center') {
          updatedDevice.y = targetY;
        }
        if (type === 'left' || type === 'right' || type === 'h-center') {
          updatedDevice.x = targetX;
        }

        return updatedDevice;
      });

      logger.debug('[handleAlign] result:', result.filter(d => selectedDeviceIds.includes(d.id)).map(d => ({ id: d.id, x: d.x, y: d.y })));
      return result;
    });
  }, [selectedDeviceIds, saveToHistory]);

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

    window.addEventListener('trigger-topology-palette', openPalette as EventListener);
    window.addEventListener('trigger-topology-connect', openConnect as EventListener);
    return () => {
      window.removeEventListener('trigger-topology-palette', openPalette as EventListener);
      window.removeEventListener('trigger-topology-connect', openConnect as EventListener);
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

  // Handle canvas pan start
  // Reads pan via ref to avoid re-creating callback on every pan state change
  const handleCanvasMouseDown = useCallback((e: ReactMouseEvent) => {
    const targetEl = e.target as HTMLElement;
    const isOnDevice = !!targetEl.closest('[data-device-id]');
    const isOnNote = !!targetEl.closest('[data-note-id]');
    const isOnEditable = targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'INPUT' || targetEl.isContentEditable;

    if (e.button === 0 && !isOnDevice && !isOnNote && !isOnEditable) {
      // Left click on empty canvas - PAN start
      e.preventDefault();

      // Cancel active interaction modes on empty canvas click
      setSelectedDeviceIds([]);
      setSelectedNoteIds([]);
      setSelectAllMode(false);
      if (pingMode || pingSource) {
        setPingMode(false);
        setPingSource(null);
        setPingResult(null);
      }
      cancelConnectionDrawing();

      const currentPan = panRef.current;
      const ps = { x: e.clientX - currentPan.x, y: e.clientY - currentPan.y };
      setPanStart(ps);
      panStartRef.current = ps;
      setIsPanning(true);
      isPanningRef.current = true;
      // PERFORMANCE: Hint browser that transform will change during pan (promotes to GPU layer)
      if (svgContentGroupRef.current) {
        svgContentGroupRef.current.style.willChange = 'transform';
        svgContentGroupRef.current.style.transition = 'none';
      }
      setContextMenu(null);
      return;
    } else if (e.button === 1 && !isOnEditable) {
      // Middle click on canvas - RECTANGLE SELECTION (no Shift required)
      e.preventDefault();
      // Prevent default browser auto-scroll behavior
      e.stopPropagation();
      // Cancel ping mode on middle click
      if (pingMode) {
        setPingMode(false);
        setPingSource(null);
        setPingResult(null);
        return;
      }

      // Start rectangle selection
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const startX = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
        const startY = (e.clientY - rect.top - panRef.current.y) / zoomRef.current;

        const box = { start: { x: startX, y: startY }, current: { x: startX, y: startY } };
        setSelectionBox(box);
        selectionBoxRef.current = box;
        setIsSelecting(true);
        isSelectingRef.current = true;
      }

      setContextMenu(null);
      setSelectAllMode(false);
    }
    // Right click (button === 2) - handled by onContextMenu event for context menu only
  }, [openContextMenu, pingMode, cancelConnectionDrawing]);

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
    g.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  }, [pan, zoom, isPanning, isActuallyDragging]);

  // Handle mouse move for panning and dragging
  // Registered ONCE (empty deps) - reads all mutable values through refs to avoid stale closures
  useEffect(() => {
    const CANVAS_W_D = VIRTUAL_CANVAS_WIDTH_DESKTOP;
    const CANVAS_H_D = VIRTUAL_CANVAS_HEIGHT_DESKTOP;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      // Always update mouse position ref for motion detection and other proximity features
      if (canvasRef.current) {
        const rect = canvasRectRef.current ?? canvasRef.current.getBoundingClientRect();
        const currentPan = panRef.current;
        const currentZoom = zoomRef.current;
        mousePosRef.current = {
          x: (e.clientX - rect.left - currentPan.x) / currentZoom,
          y: (e.clientY - rect.top - currentPan.y) / currentZoom,
        };
        setMousePos(mousePosRef.current);
      }

      if (isPanningRef.current) {
        // Track velocity for momentum
        const now = Date.now();
        const dt = now - lastMouseMoveTimeRef.current;
        if (dt > 0) {
          const dx = e.clientX - lastMouseMovePosRef.current.x;
          const dy = e.clientY - lastMouseMovePosRef.current.y;
          // Exponential moving average for velocity to smooth out noise
          velocityRef.current = {
            x: velocityRef.current.x * 0.2 + (dx / dt) * 0.8,
            y: velocityRef.current.y * 0.2 + (dy / dt) * 0.8,
          };
        }
        lastMouseMoveTimeRef.current = now;
        lastMouseMovePosRef.current = { x: e.clientX, y: e.clientY };

        // PERFORMANCE: Write transform directly to DOM to bypass React re-render on every frame.
        // The full React state (setPan) is only synced on mouseUp.
        // Capture mouse position immediately — cancel any pending RAF so we always
        // use the LATEST cursor position rather than skipping frames.
        const capturedX = e.clientX;
        const capturedY = e.clientY;
        if (panAnimationFrameRef.current !== null) {
          cancelAnimationFrame(panAnimationFrameRef.current);
        }
        panAnimationFrameRef.current = requestAnimationFrame(() => {
          const newPanX = capturedX - panStartRef.current.x;
          const newPanY = capturedY - panStartRef.current.y;
          // Write directly to the SVG <g> element's transform (no React re-render)
          const g = svgContentGroupRef.current;
          if (g) {
            g.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${zoomRef.current})`;
          }
          // Store pending pan for sync to React state on mouseUp
          pendingPanRef.current = { x: newPanX, y: newPanY };
          // Also update panRef so other code that reads it gets fresh values
          panRef.current = { x: newPanX, y: newPanY };
          panAnimationFrameRef.current = null;
        });
      } else if (isSelectingRef.current && canvasRef.current) {
        // Rectangle selection update
        const rect = canvasRectRef.current ?? canvasRef.current.getBoundingClientRect();
        const currentX = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
        const currentY = (e.clientY - rect.top - panRef.current.y) / zoomRef.current;

        const currentBox = selectionBoxRef.current;
        if (currentBox) {
          const newBox = { ...currentBox, current: { x: currentX, y: currentY } };
          selectionBoxRef.current = newBox;
          setSelectionBox(newBox);

          // Real-time selection update
          const x1 = Math.min(newBox.start.x, newBox.current.x);
          const y1 = Math.min(newBox.start.y, newBox.current.y);
          const x2 = Math.max(newBox.start.x, newBox.current.x);
          const y2 = Math.max(newBox.start.y, newBox.current.y);

          // Detect devices intersecting selection box (any overlap counts)
          const selectedIds = latestDevicesRef.current.filter(d => {
            const deviceWidth = getDeviceWidth(d.type);
            const deviceHeight = 100;

            // Device bounds
            const dX1 = d.x;
            const dY1 = d.y;
            const dX2 = d.x + deviceWidth;
            const dY2 = d.y + deviceHeight;

            // Intersection check: device overlaps with selection box
            return dX1 < x2 && dX2 > x1 && dY1 < y2 && dY2 > y1;
          }).map(d => d.id);

          // Update selection instantly for visual feedback
          // BOLT: Use fast array equality check instead of JSON.stringify in O(mousemove) path
          if (!areArraysEqual(selectedIds, selectedDeviceIdsRef.current)) {
            setSelectedDeviceIds(selectedIds);
            selectedDeviceIdsRef.current = selectedIds;
          }
        }
      } else if (draggedDeviceRef.current && canvasRef.current) {
        // Check if we've moved enough to consider it a drag
        const dsp = dragStartPosRef.current;
        if (dsp) {
          const dx2 = e.clientX - dsp.x;
          const dy2 = e.clientY - dsp.y;
          const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (dist > DRAG_THRESHOLD) {
            if (!isActuallyDraggingRef.current) {
              setIsActuallyDragging(true);
              isActuallyDraggingRef.current = true;
              setDeviceTooltip(null);
              setPortTooltip(null);
              // Set grabbing cursor when drag starts
              document.body.style.cursor = 'grabbing';
              // GPU layer promotion for dragged devices
              const currentDragged = draggedDeviceRef.current;
              if (!currentDragged) return;
              const dragIds = selectedDeviceIdsRef.current.includes(currentDragged)
                ? selectedDeviceIdsRef.current
                : [currentDragged];
              for (let wi = 0; wi < dragIds.length; wi++) {
                const we = document.querySelector('[data-device-id="' + dragIds[wi] + '"]') as SVGGElement | null;
                if (we) {
                  we.style.willChange = 'transform';
                  const ichild = we.querySelector('g');
                  if (ichild) ichild.style.willChange = 'transform';
                }
              }
            }
            wasDraggingRef.current = true;
          }
        }

        if (isActuallyDraggingRef.current) {
          // Throttle drag with RAF
          if (dragAnimationFrameRef.current !== null) return;

          const clientX = e.clientX;
          const clientY = e.clientY;
          const ctrlKey = e.ctrlKey;

          dragAnimationFrameRef.current = requestAnimationFrame(() => {
            if (!canvasRef.current) { dragAnimationFrameRef.current = null; return; }
            const rect = canvasRef.current.getBoundingClientRect();
            const currentPan = panRef.current;
            const currentZoom = zoomRef.current;
            const currentDragStartPos = dragStartPosRef.current;
            const currentDraggedDevice = draggedDeviceRef.current;
            const currentSnapToGrid = snapToGridRef.current;
            const currentSelectedIds = selectedDeviceIdsRef.current;
            const currentStartPositions = dragStartDevicePositionsRef.current;

            if (!currentDragStartPos || !currentDraggedDevice) {
              dragAnimationFrameRef.current = null;
              return;
            }

            const mouseX = (clientX - rect.left - currentPan.x) / currentZoom;
            const mouseY = (clientY - rect.top - currentPan.y) / currentZoom;
            const startMouseX = (currentDragStartPos.x - rect.left - currentPan.x) / currentZoom;
            const startMouseY = (currentDragStartPos.y - rect.top - currentPan.y) / currentZoom;
            const dx = mouseX - startMouseX;
            const dy = mouseY - startMouseY;

            const canvasW = CANVAS_W_D;
            const canvasH = CANVAS_H_D;

            // PERFORMANCE: Direct DOM updates during drag - bypass React/Zustand entirely.
            // Positions are synced back to Zustand state on mouseup (handleMouseUp).
            const devicesToMove = currentSelectedIds.includes(currentDraggedDevice)
              ? currentSelectedIds
              : [currentDraggedDevice];

            const newPositions = new Map<string, { x: number; y: number }>();
            const doSnap = currentSnapToGrid && ctrlKey;

            devicesToMove.forEach(id => {
              const initialPos = currentStartPositions[id];
              if (!initialPos) return;
              let newX = initialPos.x + dx;
              let newY = initialPos.y + dy;
              if (doSnap) {
                newX = Math.round(newX / 16) * 16;
                newY = Math.round(newY / 16) * 16;
              }
              const clampedX = Math.max(20, Math.min(newX, canvasW - 100));
              const clampedY = Math.max(20, Math.min(newY, canvasH - 100));
              newPositions.set(id, { x: clampedX, y: clampedY });

              // Direct DOM: update device <g> transform
              const outerG = document.querySelector('[data-device-id="' + id + '"]');
              if (outerG) {
                const innerG = outerG.querySelector('g');
                if (innerG) innerG.setAttribute('transform', 'translate(' + clampedX + ', ' + clampedY + ')');
              }
            });

            // Also update connection paths attached to moved devices directly in DOM
            if (newPositions.size > 0) {
              const movedSet = new Set(devicesToMove);
              const liveConns = latestConnectionsRef.current;
              for (let ci = 0; ci < liveConns.length; ci++) {
                const conn = liveConns[ci];
                if (!movedSet.has(conn.sourceDeviceId) && !movedSet.has(conn.targetDeviceId)) continue;

                const srcDev = latestDevicesRef.current.find(function (d) { return d.id === conn.sourceDeviceId; });
                const tgtDev = latestDevicesRef.current.find(function (d) { return d.id === conn.targetDeviceId; });
                if (!srcDev || !tgtDev) continue;

                const sp = newPositions.get(conn.sourceDeviceId) || { x: srcDev.x, y: srcDev.y };
                const tp = newPositions.get(conn.targetDeviceId) || { x: tgtDev.x, y: tgtDev.y };

                // Calculate port positions using the same logic as getPortPosition
                const srcPort = getPortPositionRef.current(
                  Object.assign({}, srcDev, { x: sp.x, y: sp.y }),
                  conn.sourcePort
                );
                const tgtPort = getPortPositionRef.current(
                  Object.assign({}, tgtDev, { x: tp.x, y: tp.y }),
                  conn.targetPort
                );

                const isWireless = conn.cableType === 'wireless';
                const midX = (srcPort.x + tgtPort.x) / 2;
                const meta = connectionMetaRef.current.get(conn.id) || { index: 0, total: 1 };
                const sameConnIndex = meta.index;
                const totalSameConns = meta.total;
                const maxOffset = 20;
                const offset = totalSameConns > 1
                  ? (sameConnIndex - (totalSameConns - 1) / 2) * (maxOffset / Math.max(totalSameConns - 1, 1))
                  : 0;

                const dxVal = tgtPort.x - srcPort.x;
                const dyVal = tgtPort.y - srcPort.y;
                const len = Math.sqrt(dxVal * dxVal + dyVal * dyVal) || 1;
                const perpX = -dyVal / len * offset;
                const perpY = dxVal / len * offset;

                const controlPoint1 = {
                  x: midX + perpX,
                  y: srcPort.y + perpY + Math.abs(offset) * 0.5
                };
                const controlPoint2 = {
                  x: midX + perpX,
                  y: tgtPort.y + perpY - Math.abs(offset) * 0.5
                };

                const buildWavePath = (sx: number, sy: number, tx: number, ty: number) => {
                  const dx = tx - sx;
                  const dy = ty - sy;
                  const length = Math.sqrt(dx * dx + dy * dy) || 1;
                  const ux = dx / length;
                  const uy = dy / length;
                  const px = -uy;
                  const py = ux;
                  const waveCount = Math.max(3, Math.round(length / 28));
                  const amplitude = 8;
                  const points = [`M ${sx} ${sy}`];
                  for (let i = 0; i < waveCount; i++) {
                    const t1 = (i + 0.5) / waveCount;
                    const t2 = (i + 1) / waveCount;
                    const mx = sx + ux * length * t1 + px * amplitude * (i % 2 === 0 ? 1 : -1);
                    const my = sy + uy * length * t1 + py * amplitude * (i % 2 === 0 ? 1 : -1);
                    const ex = sx + ux * length * t2;
                    const ey = sy + uy * length * t2;
                    points.push(`Q ${mx} ${my} ${ex} ${ey}`);
                  }
                  return points.join(' ');
                };

                const pathD = isWireless
                  ? buildWavePath(srcPort.x, srcPort.y, tgtPort.x, tgtPort.y)
                  : `M ${srcPort.x} ${srcPort.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${tgtPort.x} ${tgtPort.y}`;

                const connEl = document.querySelector('[data-connection-id="' + conn.id + '"]');
                if (connEl) {
                  const pathNodes = connEl.querySelectorAll('path');
                  for (let pi2 = 0; pi2 < pathNodes.length; pi2++) {
                    pathNodes[pi2].setAttribute('d', pathD);
                  }

                  // Update text labels in real-time
                  const bezierPoint = (tVal: number) => {
                    if (isWireless) {
                      return { x: srcPort.x + (tgtPort.x - srcPort.x) * tVal, y: srcPort.y + (tgtPort.y - srcPort.y) * tVal };
                    }
                    const mt = 1 - tVal;
                    return {
                      x: mt*mt*mt*srcPort.x + 3*mt*mt*tVal*controlPoint1.x + 3*mt*tVal*tVal*controlPoint2.x + tVal*tVal*tVal*tgtPort.x,
                      y: mt*mt*mt*srcPort.y + 3*mt*mt*tVal*controlPoint1.y + 3*mt*tVal*tVal*controlPoint2.y + tVal*tVal*tVal*tgtPort.y
                    };
                  };

                  const srcPos = bezierPoint(0.42);
                  const tgtPos = bezierPoint(0.58);
                  const srcLabel = { x: srcPos.x + perpX, y: srcPos.y + perpY };
                  const tgtLabel = { x: tgtPos.x + perpX, y: tgtPos.y + perpY };
                  const labelOffsetY = -10;

                  const textNodes = connEl.querySelectorAll('text');
                  if (textNodes.length >= 4) {
                    textNodes[0].setAttribute('x', String(srcLabel.x));
                    textNodes[0].setAttribute('y', String(srcLabel.y + labelOffsetY));
                    textNodes[1].setAttribute('x', String(srcLabel.x));
                    textNodes[1].setAttribute('y', String(srcLabel.y + labelOffsetY));
                    textNodes[2].setAttribute('x', String(tgtLabel.x));
                    textNodes[2].setAttribute('y', String(tgtLabel.y + labelOffsetY));
                    textNodes[3].setAttribute('x', String(tgtLabel.x));
                    textNodes[3].setAttribute('y', String(tgtLabel.y + labelOffsetY));
                  }
                }

                // Update connection handle position in real-time
                const tTrash = 0.5;
                const invT = 1 - tTrash;
                const trashX =
                  invT * invT * invT * srcPort.x +
                  3 * invT * invT * tTrash * controlPoint1.x +
                  3 * invT * tTrash * tTrash * controlPoint2.x +
                  tTrash * tTrash * tTrash * tgtPort.x;
                const trashY =
                  invT * invT * invT * srcPort.y +
                  3 * invT * invT * tTrash * controlPoint1.y +
                  3 * invT * tTrash * tTrash * controlPoint2.y +
                  tTrash * tTrash * tTrash * tgtPort.y;

                const handleEl = document.querySelector('[data-connection-handle-id="' + conn.id + '"]');
                if (handleEl) {
                  const innerG = handleEl.querySelector('[data-handle-inner="true"]');
                  if (innerG) {
                    innerG.setAttribute('transform', 'translate(' + trashX + ', ' + trashY + ')');
                  }
                }
              }
            }

            liveDeviceDragPositionsRef.current = newPositions;
            dragAnimationFrameRef.current = null;
          });
        }
      } else if (isDrawingConnectionRef.current && canvasRef.current) {
        // Smooth mouse position tracking for connection drawing
        if (mousePosAnimationFrameRef.current !== null) return;

        mousePosAnimationFrameRef.current = requestAnimationFrame(() => {
          const rect = canvasRectRef.current ?? canvasRef.current?.getBoundingClientRect();
          if (!rect) {
            mousePosAnimationFrameRef.current = null;
            return;
          }

          const currentPan = panRef.current;
          const currentZoom = zoomRef.current;
          const newPos = {
            x: (e.clientX - rect.left - currentPan.x) / currentZoom,
            y: (e.clientY - rect.top - currentPan.y) / currentZoom,
          };
          mousePosRef.current = newPos;
          mousePosAnimationFrameRef.current = null;
        });
      }
    };

    const handleMouseUp = (e: globalThis.MouseEvent) => {
      activePointerDragRef.current = false;
      activeDragPointerIdRef.current = null;

      // Cancel any pending animation frames
      if (dragAnimationFrameRef.current) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
        dragAnimationFrameRef.current = null;
      }
      if (panAnimationFrameRef.current) {
        cancelAnimationFrame(panAnimationFrameRef.current);
        panAnimationFrameRef.current = null;
      }
      if (mousePosAnimationFrameRef.current) {
        cancelAnimationFrame(mousePosAnimationFrameRef.current);
        mousePosAnimationFrameRef.current = null;
      }
      if (momentumAnimationFrameRef.current) {
        cancelAnimationFrame(momentumAnimationFrameRef.current);
        momentumAnimationFrameRef.current = null;
      }

      // Right-click context menu handled by onContextMenu event only

      if (isSelectingRef.current && selectionBoxRef.current) {
        const box = selectionBoxRef.current;
        const x1 = Math.min(box.start.x, box.current.x);
        const y1 = Math.min(box.start.y, box.current.y);
        const x2 = Math.max(box.start.x, box.current.x);
        const y2 = Math.max(box.start.y, box.current.y);

        // Detect devices intersecting selection box (any overlap counts)
        const selectedIds = latestDevicesRef.current.filter(d => {
          const deviceWidth = getDeviceWidth(d.type);
          const deviceHeight = 100;

          // Device bounds
          const dX1 = d.x;
          const dY1 = d.y;
          const dX2 = d.x + deviceWidth;
          const dY2 = d.y + deviceHeight;

          // Intersection check: device overlaps with selection box
          return dX1 < x2 && dX2 > x1 && dY1 < y2 && dY2 > y1;
        }).map(d => d.id);

        if (selectedIds.length > 0) {
          setSelectedDeviceIds(selectedIds);
          selectedDeviceIdsRef.current = selectedIds;

          // Select first device of selection to update parent state (for panel sync)
          const firstDevice = latestDevicesRef.current.find(d => d.id === selectedIds[0]);
          if (firstDevice) {
            onDeviceSelect(firstDevice.type, firstDevice.id, isSwitchDeviceType(firstDevice.type) ? firstDevice.switchModel : undefined, firstDevice.name);
          }
        } else {
          // Only clear selection if we actually dragged a box of significant size
          const dragDistance = Math.sqrt(
            Math.pow(box.current.x - box.start.x, 2) +
            Math.pow(box.current.y - box.start.y, 2)
          );

          if (dragDistance > 10) {
            setSelectedDeviceIds([]);
            selectedDeviceIdsRef.current = [];
          }
        }

        setIsSelecting(false);
        isSelectingRef.current = false;
        setSelectionBox(null);
        selectionBoxRef.current = null;
      } else if (!isPanningRef.current && !isActuallyDraggingRef.current && !wasDraggingRef.current) {
        // Simple click on background (not device, not note, not drag)
        const targetEl = e.target as HTMLElement;
        const isOnDevice = !!targetEl.closest?.('[data-device-id]');
        const isOnNote = !!targetEl.closest?.('[data-note-id]');
        const isOnMenu = !!targetEl.closest?.('.context-menu') || !!targetEl.closest?.('.palette') || !!targetEl.closest?.('.modal') || !!targetEl.closest?.('.selection-toolbar');

        if (!isOnDevice && !isOnNote && !isOnMenu) {
          setSelectedDeviceIds([]);
          selectedDeviceIdsRef.current = [];
          if (onDeviceSelect) onDeviceSelect(null as unknown as DeviceType, null as unknown as string | undefined, undefined, null as unknown as string | undefined);
          setSelectedNoteIds([]);
          setPingMode(false);
          setPingSource(null);
          setPingResult(null);
          setIsDrawingConnection(false);
          setConnectionStart(null);
          setContextMenu(null);
        }
      }

      setIsPanning(false);
      isPanningRef.current = false;
      // PERFORMANCE: Sync the final pan value from direct DOM writes back to React state.
      // During panning, we wrote directly to svgContentGroupRef.current.style.transform to avoid
      // re-rendering the entire component on every mouse move frame.
      if (pendingPanRef.current) {
        setPan(pendingPanRef.current);
        pendingPanRef.current = null;
      }

      // MOMENTUM SCROLL: Smooth inertia effect on pan release
      if (!isActuallyDraggingRef.current && !document.body.classList.contains('graphics-low')) {
        const vel = velocityRef.current;
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        if (speed > MOMENTUM_THRESHOLD && svgContentGroupRef.current) {
          const g = svgContentGroupRef.current;
          g.style.willChange = 'transform';
          let mVelX = vel.x;
          let mVelY = vel.y;
          let mPanX = panRef.current.x;
          let mPanY = panRef.current.y;
          const animateMomentum = () => {
            mVelX *= MOMENTUM_DECAY;
            mVelY *= MOMENTUM_DECAY;
            mPanX += mVelX;
            mPanY += mVelY;
            g.style.transform = `translate(${mPanX}px, ${mPanY}px) scale(${zoomRef.current})`;
            panRef.current = { x: mPanX, y: mPanY };
            const remainingSpeed = Math.sqrt(mVelX * mVelX + mVelY * mVelY);
            if (remainingSpeed > MOMENTUM_MIN_SPEED) {
              momentumAnimationFrameRef.current = requestAnimationFrame(animateMomentum);
            } else {
              momentumAnimationFrameRef.current = null;
              setPan({ x: mPanX, y: mPanY });
              g.style.willChange = '';
            }
          };
          momentumAnimationFrameRef.current = requestAnimationFrame(animateMomentum);
        }
      }
      velocityRef.current = { x: 0, y: 0 };

      // Remove will-change hint after pan/momentum ends
      if (!momentumAnimationFrameRef.current && svgContentGroupRef.current) {
        svgContentGroupRef.current.style.willChange = '';
      }

      // PERFORMANCE: Sync device drag positions from direct DOM writes back to Zustand state
      const finalDragPositions = liveDeviceDragPositionsRef.current;
      const finalDragDeviceIds = [...finalDragPositions.keys()];
      if (finalDragPositions.size > 0) {
        setDevices(prev => {
          const newDevices = [...prev];
          let changed = false;
          finalDragPositions.forEach((pos, id) => {
            const idx = newDevices.findIndex(d => d.id === id);
            if (idx !== -1) {
              if (Math.abs(newDevices[idx].x - pos.x) > 0.1 || Math.abs(newDevices[idx].y - pos.y) > 0.1) {
                newDevices[idx] = { ...newDevices[idx], x: pos.x, y: pos.y };
                changed = true;
              }
            }
          });
          return changed ? newDevices : prev;
        });
        finalDragPositions.clear();
      }

      // Remove GPU will-change hints from dragged devices
      for (let wi = 0; wi < finalDragDeviceIds.length; wi++) {
        const we = document.querySelector('[data-device-id="' + finalDragDeviceIds[wi] + '"]') as SVGGElement | null;
        if (we) {
          we.style.willChange = '';
          const ichild = we.querySelector('g');
          if (ichild) ichild.style.willChange = '';
        }
      }

      setDraggedDevice(null);
      draggedDeviceRef.current = null;
      dragStartPosRef.current = null;

      // Eğer cihaz gerçekten sürüklendiyse ve kablo çizimi başlamışsa iptal et
      if (isActuallyDraggingRef.current && isDrawingConnectionRef.current) {
        setIsDrawingConnection(false);
        setConnectionStart(null);
      }

      setIsActuallyDragging(false);
      isActuallyDraggingRef.current = false;
      lastDragPositionRef.current = null;

      // Reset cursor when drag ends
      document.body.style.cursor = '';
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && activeDragPointerIdRef.current === e.pointerId) {
        handleMouseMove(e as unknown as globalThis.MouseEvent);
      }
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && activeDragPointerIdRef.current === e.pointerId) {
        handleMouseUp(e as unknown as globalThis.MouseEvent);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      if (dragAnimationFrameRef.current) cancelAnimationFrame(dragAnimationFrameRef.current);
      if (panAnimationFrameRef.current) cancelAnimationFrame(panAnimationFrameRef.current);
      if (mousePosAnimationFrameRef.current) cancelAnimationFrame(mousePosAnimationFrameRef.current);
      if (momentumAnimationFrameRef.current) cancelAnimationFrame(momentumAnimationFrameRef.current);
    };
  }, []);
  // Global touch event handlers for device dragging on mobile
  // FIXED: uses refs to avoid re-registering the listener on ogni state change
  useEffect(() => {
    const handleGlobalTouchMove = (e: globalThis.TouchEvent) => {
      const currentTouchDraggedDevice = touchDraggedDeviceRef.current;
      if (e.touches.length !== 1 || !currentTouchDraggedDevice || !canvasRef.current) return;

      const touch = e.touches[0];
      const currentTouchDragStartPos = touchDragStartPosRef.current;

      // Check if we've moved enough to consider it a drag
      if (currentTouchDragStartPos && !isTouchDraggingRef.current) {
        const distance = getDistance(currentTouchDragStartPos.x, currentTouchDragStartPos.y, touch.clientX, touch.clientY);
        if (distance > DRAG_THRESHOLD) {
          setIsTouchDragging(true);
          isTouchDraggingRef.current = true;
          setDeviceTooltip(null);
          setPortTooltip(null);
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
          }
        }
      }

      if (isTouchDraggingRef.current) {
        if (e.cancelable) e.preventDefault();
        const currentZoom = zoomRef.current;
        const currentTouchDragStartPos = touchDragStartPosRef.current;

        if (!currentTouchDragStartPos) return;
        const dx = (touch.clientX - currentTouchDragStartPos.x) / currentZoom;
        const dy = (touch.clientY - currentTouchDragStartPos.y) / currentZoom;
        const initialPositions = dragStartDevicePositionsRef.current;
        const canvasDims = getCanvasDimensions();

        if (!dragAnimationFrameRef.current) {
          dragAnimationFrameRef.current = requestAnimationFrame(() => {
            const touchNewPositions = new Map<string, { x: number; y: number }>();
            const initialKeys = Object.keys(initialPositions);
            for (let ti = 0; ti < initialKeys.length; ti++) {
              const id = initialKeys[ti];
              const init = initialPositions[id];
              if (!init) continue;
              const clampedX = Math.max(50, Math.min(init.x + dx, canvasDims.width - 120));
              const clampedY = Math.max(50, Math.min(init.y + dy, canvasDims.height - 150));
              touchNewPositions.set(id, { x: clampedX, y: clampedY });
              const touchOuterG = document.querySelector('[data-device-id="' + id + '"]');
              if (touchOuterG) {
                const touchInnerG = touchOuterG.querySelector('g');
                if (touchInnerG) touchInnerG.setAttribute('transform', 'translate(' + clampedX + ', ' + clampedY + ')');
              }
            }
            liveDeviceDragPositionsRef.current = touchNewPositions;
            dragAnimationFrameRef.current = null;
          });
        }
      }
    };

    const handleGlobalTouchEnd = () => {
      // Cancel any pending animation frame
      if (dragAnimationFrameRef.current) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
        dragAnimationFrameRef.current = null;
      }

      const currentTouchDraggedDevice = touchDraggedDeviceRef.current;
      const currentIsTouchDragging = isTouchDraggingRef.current;

      // If we weren't dragging, treat it as a tap (select)
      if (currentTouchDraggedDevice && !currentIsTouchDragging) {
        const device = latestDevicesRef.current.find(d => d.id === currentTouchDraggedDevice.id);
        if (device) {
          // Keep multi-selection if device was already selected
          const currentSelected = selectedDeviceIdsRef.current;
          if (currentSelected.length > 1 && currentSelected.includes(device.id)) {
            // already set, keep as-is
          } else {
            setSelectedDeviceIds([device.id]);
          }
          onDeviceSelect(device.type, device.id, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);
        }
      }

      // Save to history if we were dragging (already saved at touch start)
      if (currentIsTouchDragging && currentTouchDraggedDevice) {
        // no-op: saved at touch start
      }

      // PERFORMANCE: Sync touch drag positions back to Zustand state
      const touchFinalPositions = liveDeviceDragPositionsRef.current;
      const touchFinalDeviceIds = [...touchFinalPositions.keys()];
      if (touchFinalPositions.size > 0) {
        setDevices(prev => {
          const newDevices = [...prev];
          let changed = false;
          touchFinalPositions.forEach((pos, id) => {
            const idx = newDevices.findIndex(d => d.id === id);
            if (idx !== -1) {
              if (Math.abs(newDevices[idx].x - pos.x) > 0.1 || Math.abs(newDevices[idx].y - pos.y) > 0.1) {
                newDevices[idx] = { ...newDevices[idx], x: pos.x, y: pos.y };
                changed = true;
              }
            }
          });
          return changed ? newDevices : prev;
        });
        touchFinalPositions.clear();
      }

      // Remove GPU will-change hints from touch-dragged devices
      for (let wi = 0; wi < touchFinalDeviceIds.length; wi++) {
        const we = document.querySelector('[data-device-id="' + touchFinalDeviceIds[wi] + '"]') as SVGGElement | null;
        if (we) {
          we.style.willChange = '';
          const ichild = we.querySelector('g');
          if (ichild) ichild.style.willChange = '';
        }
      }

      setTouchDraggedDevice(null);
      touchDraggedDeviceRef.current = null;
      setTouchDragStartPos(null);
      touchDragStartPosRef.current = null;

      // Touch sürükleme olduysa ve kablo çizimi başlamışsa iptal et
      if (currentIsTouchDragging && isDrawingConnectionRef.current) {
        setIsDrawingConnection(false);
        setConnectionStart(null);
      }

      setIsTouchDragging(false);
      isTouchDraggingRef.current = false;
      setLastTouchDistance(null);
      setTouchStart(null);
      lastDragPositionRef.current = null;

      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    };

    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
      if (dragAnimationFrameRef.current) {
        cancelAnimationFrame(dragAnimationFrameRef.current);
      }
    };
  }, [onDeviceSelect, saveToHistory, getCanvasDimensions]);

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

    // Shift key for multi-selection
    let newSelectedIds: string[];

    if (e.shiftKey) {
      // Toggle selection when Shift is pressed
      newSelectedIds = selectedDeviceIds.includes(deviceId)
        ? selectedDeviceIds.filter(id => id !== deviceId)
        : [...selectedDeviceIds, deviceId];

      // Update parent component with the first selected device
      const firstSelectedDevice = deviceMap.get(newSelectedIds[0]);
      if (firstSelectedDevice && newSelectedIds.length > 0) {
        onDeviceSelect(firstSelectedDevice.type, newSelectedIds[0], undefined, firstSelectedDevice.name);
      }

      setSelectedDeviceIds(newSelectedIds);

      // Mark that shift was used so handleClick knows to skip
      shiftKeyPressedRef.current = true;
    } else {
      // Reset shift key flag for normal clicks
      shiftKeyPressedRef.current = false;

      // If clicking a device that's not selected, make it the only selection
      // If it IS already selected, keep selection for group dragging
      if (!selectedDeviceIds.includes(deviceId)) {
        newSelectedIds = [deviceId];
        setSelectedDeviceIds(newSelectedIds);
        onDeviceSelect(device.type, deviceId, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);
      } else {
        newSelectedIds = selectedDeviceIds;
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

    // Don't handle click if Shift was used (already handled in mousedown)
    if (shiftKeyPressedRef.current) {
      shiftKeyPressedRef.current = false; // Reset for next click
      return;
    }

    // Ping mode is now handled in handleDeviceMouseDown for better browser compatibility
    // This click handler only handles normal device selection
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

    // Only handle selection if Shift was NOT pressed during mousedown
    setSelectedDeviceIds([device.id]);
    setSelectedNoteIds([]);
    // Notify parent component - select device, don't open terminal
    onDeviceSelect(device.type, device.id, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);
    // Focus canvas for keyboard navigation
    canvasRef.current?.focus();
  }, [onDeviceSelect, pingMode, pingSource, devices, connections, deviceStates, setContextMenu, isMobile, isDrawingConnection, mobileConnectionSource, isTR]);

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

  // Handle device touch start - for mobile dragging
  const handleDeviceTouchStart = useCallback((e: ReactTouchEvent, deviceId: string) => {
    // If pointer drag was already active, we want touch events to take precedence
    // especially on mobile devices where pointer events might be less reliable for dragging.
    if (activePointerDragRef.current) {
      activePointerDragRef.current = false;
      // We don't reset draggedDeviceRef here because it might be needed for the new touch drag
    }

    if (e.touches.length !== 1) return;
    e.stopPropagation();

    if (!canvasRef.current) return;

    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const device = deviceMap.get(deviceId);
    if (!device) return;

    saveToHistory();

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    setTouchDragStartPos({ x: touch.clientX, y: touch.clientY });
    touchDragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    setIsTouchDragging(false);
    setTouchDraggedDevice(device);
    touchDraggedDeviceRef.current = device;

    // Determine selection: if device is already selected, keep all for group drag
    const alreadySelected = selectedDeviceIds.length > 1 && selectedDeviceIds.includes(deviceId);
    const idsForDrag = alreadySelected ? selectedDeviceIds : [deviceId];
    if (!alreadySelected) setSelectedDeviceIds(idsForDrag);

    setTouchDragOffset({
      x: (touch.clientX - rect.left - pan.x) - device.x * zoom,
      y: (touch.clientY - rect.top - pan.y) - device.y * zoom,
    });
    touchDragOffsetRef.current = {
      x: (touch.clientX - rect.left - pan.x) - device.x * zoom,
      y: (touch.clientY - rect.top - pan.y) - device.y * zoom,
    };

    // Store initial positions of all devices that will be dragged
    const initialPositions: { [key: string]: { x: number; y: number } } = {};
    devices.forEach(d => {
      if (idsForDrag.includes(d.id)) {
        initialPositions[d.id] = { x: d.x, y: d.y };
      }
    });
    dragStartDevicePositionsRef.current = initialPositions;

    const now = Date.now();
    if (now - lastTapTimeRef.current < 300 && lastTappedDeviceRef.current === deviceId) {
      handleDeviceDoubleClick(device);
      lastTapTimeRef.current = 0;
      lastTappedDeviceRef.current = null;
    } else {
      lastTapTimeRef.current = now;
      lastTappedDeviceRef.current = deviceId;

      // Start long-press timer to open device context menu on mobile
      const timer = setTimeout(() => {
        openContextMenu(touch.clientX, touch.clientY, deviceId, 'device');
        setLongPressTimer(null);
        setTouchDraggedDevice(null);
        touchDraggedDeviceRef.current = null;
      }, LONG_PRESS_DURATION);
      setLongPressTimer(timer);
    }
  }, [devices, pan, zoom, longPressTimer, handleDeviceDoubleClick, selectedDeviceIds, openContextMenu]);

  // Handle device touch move - for mobile dragging
  const handleDeviceTouchMove = useCallback((e: ReactTouchEvent) => {
    if (e.touches.length !== 1 || !touchDraggedDevice || !canvasRef.current) return;
    // e.stopPropagation(); // Removed to allow event bubbling
    // e.preventDefault(); // Removed to allow browser-native behavior

    const touch = e.touches[0];

    if (touchDragStartPos) {
      const distance = getDistance(touchDragStartPos.x, touchDragStartPos.y, touch.clientX, touch.clientY);
      if (distance > DRAG_THRESHOLD) {
        setIsTouchDragging(true);
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
      }
    }

    if (isTouchDragging && touchDragStartPos) {
      const dx = (touch.clientX - touchDragStartPos.x) / zoom;
      const dy = (touch.clientY - touchDragStartPos.y) / zoom;
      const initialPositions = dragStartDevicePositionsRef.current;
      const canvasDims = getCanvasDimensions();
      setDevices((prev) =>
        prev.map((d) => {
          const init = initialPositions[d.id];
          if (!init) return d;
          return {
            ...d,
            x: Math.max(50, Math.min(init.x + dx, canvasDims.width - 120)),
            y: Math.max(50, Math.min(init.y + dy, canvasDims.height - 150)),
          };
        })
      );
    }
  }, [touchDraggedDevice, touchDragStartPos, isTouchDragging, zoom, getCanvasDimensions, getDistance]);

  // Handle device touch end - for mobile dragging
  const handleDeviceTouchEnd = useCallback(() => {
    // If we weren't dragging, treat it as a tap (select)
    if (touchDraggedDevice && !isTouchDragging) {
      const deviceId = touchDraggedDevice.id;

      // Tap-tap connection logic
      if (isMobile && !isDrawingConnection) {
        if (!mobileConnectionSource) {
          setMobileConnectionSource(deviceId);
          toast({
            title: isTR ? "Bağlantı Başlatıldı" : "Connection Started",
            description: isTR ? "Hedef cihazı seçin." : "Select the target device.",
            duration: 3000,
          });
        } else {
          // Tap same device again: cancel
          setMobileConnectionSource(null);
        }
      }

      // touchDraggedDevice is already CanvasDevice, no need to find again
      setSelectedDeviceIds([touchDraggedDevice.id]);
      onDeviceSelect(touchDraggedDevice.type, touchDraggedDevice.id, isSwitchDeviceType(touchDraggedDevice.type) ? touchDraggedDevice.switchModel : undefined, touchDraggedDevice.name);
    }

    setTouchDraggedDevice(null);
    touchDraggedDeviceRef.current = null;
    setTouchDragStartPos(null);
    touchDragStartPosRef.current = null;
    setIsTouchDragging(false);
  }, [touchDraggedDevice, isTouchDragging, onDeviceSelect]);

  // Canvas-level touch handlers (pan, pinch, long-press for context)
  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    if (!canvasRef.current) return;

    // Check if target is not a device
    const isDevice = (e.target as HTMLElement).closest('[data-device-id]') || false;
    if (isDevice) return; // handled by handleDeviceTouchStart

    // Cancel any existing long-press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const currentPan = panRef.current;
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setIsPanning(true);
      const ps = { x: touch.clientX - currentPan.x, y: touch.clientY - currentPan.y };
      setPanStart(ps);
      panStartRef.current = ps;
      isPanningRef.current = true;
      // Hint browser for GPU acceleration during touch pan
      if (svgContentGroupRef.current) {
        svgContentGroupRef.current.style.willChange = 'transform';
        svgContentGroupRef.current.style.transition = 'none';
      }

      // Start long-press to open context menu
      const timer = setTimeout(() => {
        openContextMenu(touch.clientX, touch.clientY, null);
        setLongPressTimer(null);
        setIsPanning(false);
        isPanningRef.current = false;
      }, LONG_PRESS_DURATION);
      setLongPressTimer(timer);
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      isPanningRef.current = false;
      // Pinch start - track initial distance and center
      const a = e.touches[0];
      const b = e.touches[1];
      setLastTouchDistance(getDistance(a.clientX, a.clientY, b.clientX, b.clientY));
      setLastTouchCenter({
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2
      });
    }
  }, [longPressTimer, getDistance]);  // Removed pan dep - uses panRef.current instead

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    if (!canvasRef.current) return;
    const isDevice = (e.target as HTMLElement).closest('[data-device-id]') || false;
    if (isDevice) return;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (e.touches.length === 1 && isPanningRef.current) {
      // PERFORMANCE: Write transform directly to DOM during touch pan to bypass React re-renders
      const touch = e.touches[0];
      const ps = panStartRef.current;
      const newPanX = touch.clientX - ps.x;
      const newPanY = touch.clientY - ps.y;
      const g = svgContentGroupRef.current;
      if (g) {
        g.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${zoomRef.current})`;
      }
      pendingPanRef.current = { x: newPanX, y: newPanY };
      panRef.current = { x: newPanX, y: newPanY };
    } else if (e.touches.length === 2 && lastTouchDistance !== null && lastTouchCenter !== null) {
      const a = e.touches[0];
      const b = e.touches[1];

      const newDistance = getDistance(a.clientX, a.clientY, b.clientX, b.clientY);
      const newCenter = {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2
      };

      // Calculate zoom factor with smoothing
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const zoomFactor = newDistance / lastTouchDistance;
      let newZoom = currentZoom * zoomFactor;
      newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));

      if (Math.abs(newZoom - currentZoom) > 0.01) {
        // Adjust pan to zoom relative to the gesture center
        const rect = canvasRef.current.getBoundingClientRect();
        const cursorX = newCenter.x - rect.left;
        const cursorY = newCenter.y - rect.top;

        const deltaX = cursorX - (cursorX - currentPan.x) * (newZoom / currentZoom);
        const deltaY = cursorY - (cursorY - currentPan.y) * (newZoom / currentZoom);

        // Also add the pan movement of the center point itself
        const panDeltaX = newCenter.x - lastTouchCenter.x;
        const panDeltaY = newCenter.y - lastTouchCenter.y;

        const newPan = { x: deltaX + panDeltaX, y: deltaY + panDeltaY };
        setZoom(newZoom);
        setPan(newPan);
        // Also write to DOM directly for immediate feedback
        const g = svgContentGroupRef.current;
        if (g) {
          g.style.transform = `translate(${newPan.x}px, ${newPan.y}px) scale(${newZoom})`;
        }
      } else {
        // If zoom didn't change (hit limits), at least we can pan
        const panDeltaX = newCenter.x - lastTouchCenter.x;
        const panDeltaY = newCenter.y - lastTouchCenter.y;
        const newPan = { x: currentPan.x + panDeltaX, y: currentPan.y + panDeltaY };
        setPan(newPan);
        const g = svgContentGroupRef.current;
        if (g) {
          g.style.transform = `translate(${newPan.x}px, ${newPan.y}px) scale(${zoomRef.current})`;
        }
      }

      setLastTouchDistance(newDistance);
      setLastTouchCenter(newCenter);
    }
  }, [longPressTimer, lastTouchDistance, lastTouchCenter, getDistance]);  // Removed isPanning, panStart, pan, zoom deps

  const handleTouchEnd = useCallback((e: globalThis.TouchEvent | ReactTouchEvent) => {
    // Clear long-press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // If no more touches, reset pinch/touch tracking
    const touchesLength = (e as ReactTouchEvent).touches ? (e as ReactTouchEvent).touches.length : 0;
    if (touchesLength === 0) {
      setLastTouchDistance(null);
      setLastTouchCenter(null);
      setTouchStart(null);
      setIsPanning(false);
      isPanningRef.current = false;
      // PERFORMANCE: Sync pending pan from direct DOM writes back to React state
      if (pendingPanRef.current) {
        setPan(pendingPanRef.current);
        pendingPanRef.current = null;
      }
      // Remove will-change hint
      if (svgContentGroupRef.current) {
        svgContentGroupRef.current.style.willChange = '';
      }
    } else if (touchesLength === 1) {
      // Revert to panning with one finger if the other is lifted
      const touch = (e as ReactTouchEvent).touches[0];
      setIsPanning(true);
      isPanningRef.current = true;
      const currentPan = panRef.current;
      const ps = { x: touch.clientX - currentPan.x, y: touch.clientY - currentPan.y };
      setPanStart(ps);
      panStartRef.current = ps;
      setLastTouchDistance(null);
      setLastTouchCenter(null);
    }
  }, [longPressTimer]);  // Removed pan dep - uses panRef.current

  // Handle Wheel Event for Zooming
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

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // Handle Keyboard Navigation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if canvas is focused
      if (document.activeElement !== canvas) return;

      const moveAmount = 20 * zoom;

      switch (e.key) {
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
  }, [zoom, selectedDeviceIds, onDeviceDelete]);

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
            ? 'Seçilen kablo bu portlar için uygun değil!'
            : 'Selected cable is not suitable for these ports!';
          setConnectionError(errorMsg);
          setTimeout(() => setConnectionError(null), 3000);
          setIsDrawingConnection(false);
          setConnectionStart(null);
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

  // All refs are now updated in useEffect to avoid accessing refs during render
  // This keeps refs fresh for event handlers without violating React rules
  useEffect(() => {
    latestDevicesRef.current = devices;
    latestConnectionsRef.current = connections;
    latestNotesRef.current = notes;
    draggedNoteIdRef.current = draggedNoteId;
    resizingNoteIdRef.current = resizingNoteId;
    noteDragStartRef.current = noteDragStart;
    noteResizeStartRef.current = noteResizeStart;
    noteResizeDirectionRef.current = noteResizeDirection;
    isPanningRef.current = isPanning;
    panStartRef.current = panStart;
    zoomRef.current = zoom;
    panRef.current = pan;
    draggedDeviceRef.current = draggedDevice;
    isActuallyDraggingRef.current = isActuallyDragging;
    snapToGridRef.current = snapToGrid;
    isDrawingConnectionRef.current = isDrawingConnection;
    isTouchDraggingRef.current = isTouchDragging;
    touchDraggedDeviceRef.current = touchDraggedDevice;
    touchDragStartPosRef.current = touchDragStartPos;
    touchDragOffsetRef.current = touchDragOffset;
  }, [
    devices,
    connections,
    notes,
    draggedNoteId,
    resizingNoteId,
    noteDragStart,
    noteResizeStart,
    isPanning,
    panStart,
    zoom,
    pan,
    draggedDevice,
    isActuallyDragging,
    snapToGrid,
    isDrawingConnection,
    isTouchDragging,
    touchDraggedDevice,
    touchDragStartPos,
    touchDragOffset,
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
    }, 150);
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

    window.addEventListener('add-device', handleAddDevice as EventListener);
    window.addEventListener('toggle-ping-mode', handleTogglePingMode as EventListener);
    window.addEventListener('add-note', handleAddNote as EventListener);
    window.addEventListener('trigger-topology-export-png', handleExportPNG as EventListener);
    return () => {
      window.removeEventListener('add-device', handleAddDevice as EventListener);
      window.removeEventListener('toggle-ping-mode', handleTogglePingMode as EventListener);
      window.removeEventListener('add-note', handleAddNote as EventListener);
      window.removeEventListener('trigger-topology-export-png', handleExportPNG as EventListener);
    };
  }, [addDevice, addNote, handleExportPNG]);

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
  const getLivePort = useCallback((deviceId: string, portId: string) => {
    const deviceState = deviceStates?.get(deviceId);
    if (deviceState?.ports?.[portId]) {
      return deviceState.ports[portId];
    }
    const device = deviceMap.get(deviceId);
    return device?.ports.find(p => p.id === portId);
  }, [deviceStates, devices]);

  const hasPortMode = (port: ReturnType<typeof getLivePort>): port is NonNullable<ReturnType<typeof getLivePort>> & { mode: 'access' | 'trunk' | 'routed' } => {
    return !!port && typeof port === 'object' && 'mode' in port;
  };

  const getLiveDeviceVlan = useCallback((device: CanvasDevice) => {
    if (device.type !== 'pc') return null;
    if (typeof device.vlan === 'number' && device.vlan > 0) {
      return device.vlan;
    }

    const connectedPort = connections.find(conn => conn.sourceDeviceId === device.id || conn.targetDeviceId === device.id);
    if (!connectedPort) return 1;

    const otherDeviceId = connectedPort.sourceDeviceId === device.id ? connectedPort.targetDeviceId : connectedPort.sourceDeviceId;
    const otherPortId = connectedPort.sourceDeviceId === device.id ? connectedPort.targetPort : connectedPort.sourcePort;
    const otherPort = getLivePort(otherDeviceId, otherPortId);

    if (!otherPort) return 1;
    if (hasPortMode(otherPort) && otherPort.mode === 'trunk') return 'Trunk';
    return Number(otherPort.accessVlan || otherPort.vlan || 1);
  }, [connections, getLivePort]);

  const getIotDeviceStatus = useCallback((device: CanvasDevice) => {
    return device.iot?.collaborationEnabled === false
      ? (language === 'tr' ? 'Pasif' : 'Inactive')
      : (language === 'tr' ? 'Aktif' : 'Active');
  }, [language]);

  const getIotPowerStatus = useCallback((device: CanvasDevice) => {
    return device.status === 'offline'
      ? (language === 'tr' ? 'Kapalı' : 'Off')
      : (language === 'tr' ? 'Açık' : 'On');
  }, [language]);

  const getIotOpenCloseStatus = useCallback((device: CanvasDevice) => {
    const isOn = device.status !== 'offline' && device.iot?.collaborationEnabled !== false && (device.iot?.value ?? false);
    return language === 'tr' ? (isOn ? 'Açık' : 'Kapalı') : (isOn ? 'On' : 'Off');
  }, [language]);

  const getIotMeasuredValue = useCallback((device: CanvasDevice) => {
    const kind = device.iot?.kind;
    const sensorType = device.iot?.sensorType || 'temperature';
    const baseTemp = environment?.temperature ?? 22;
    const baseHumidity = environment?.humidity ?? 50;
    const baseLight = environment?.light ?? 70;

    // Controllable devices use open/close state, not sensor measurements
    if (kind === 'lamp' || kind === 'heater' || kind === 'cooler') {
      return getIotOpenCloseStatus(device);
    }

    if (device.status === 'offline') {
      return language === 'tr' ? 'Kapalı' : 'Off';
    }

    if (device.iot?.collaborationEnabled === false) {
      return t.passive;
    }

    // Add small random fluctuation to simulate real sensor readings
    const tempFluctuation = (Math.random() - 0.5) * 2; // ±1°C
    const humidityFluctuation = (Math.random() - 0.5) * 4; // ±2%
    const lightFluctuation = (Math.random() - 0.5) * 10; // ±5%

    switch (sensorType) {
      case 'temperature':
        return `${(baseTemp + tempFluctuation).toFixed(1)} °C`;
      case 'humidity':
        return `${(baseHumidity + humidityFluctuation).toFixed(1)} %`;
      case 'light':
        return `${(baseLight + lightFluctuation).toFixed(0)} lx`;
      case 'sound':
        // Ses sensörü: device.iot.value'dan gerçek dB değerini al
        const sounddB = typeof device.iot?.value === 'number' ? device.iot.value : 0;
        return `${sounddB} dB`;
      case 'motion':
        const deviceWidth = getDeviceWidth(device.type);
        const deviceHeight = getDeviceHeight(device.type, device.ports?.length || 0);
        const dx = mousePosRef.current.x - device.x - (deviceWidth / 2);
        const dy = mousePosRef.current.y - device.y - (deviceHeight / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 75 ? t.motionYes : t.motionNo;
      default:
        return '-';
    }
  }, [language, environment, getIotOpenCloseStatus, t.passive, t.motionYes, t.motionNo]);

  const getLivePortVlanText = useCallback((deviceId: string, portId: string) => {
    const device = deviceMap.get(deviceId);
    const livePort = getLivePort(deviceId, portId);
    if (!device || !livePort) return '1';

    if (device.type === 'pc' || device.type === 'iot') {
      const conn = connections.find(c =>
        (c.sourceDeviceId === deviceId && c.sourcePort === portId) ||
        (c.targetDeviceId === deviceId && c.targetPort === portId)
      );
      if (!conn) return '1';

      const peerDeviceId = conn.sourceDeviceId === deviceId ? conn.targetDeviceId : conn.sourceDeviceId;
      const peerPortId = conn.sourceDeviceId === deviceId ? conn.targetPort : conn.sourcePort;
      const peerPort = getLivePort(peerDeviceId, peerPortId);
      if (!peerPort) return '1';
      if (hasPortMode(peerPort) && peerPort.mode === 'trunk') return 'Trunk';
      return String(peerPort.accessVlan || peerPort.vlan || 1);
    }

    if (hasPortMode(livePort) && livePort.mode === 'trunk') return 'Trunk';
    return String(livePort.accessVlan || livePort.vlan || 1);
  }, [connections, devices, getLivePort]);

  const showPortTooltip = useCallback((e: ReactMouseEvent | MouseEvent, deviceId: string, portId: string) => {
    const device = deviceMap.get(deviceId);
    const port = getLivePort(deviceId, portId);
    if (!device || !port) return;

    if (portTooltipTimerRef.current) {
      clearTimeout(portTooltipTimerRef.current);
    }

    // Hemen tooltip'i göster
    portTooltipTimerRef.current = setTimeout(() => {
      setPortTooltip({
        deviceId,
        portId,
        x: e.clientX,
        y: e.clientY,
        visible: true,
      });

      // 2000ms sonra tooltip'i gizle
      portTooltipTimerRef.current = setTimeout(() => {
        setPortTooltip(prev => prev ? { ...prev, visible: false } : null);
      }, 2000);
    }, TOOLTIP_DELAY);
  }, [devices, getLivePort, setPortTooltip]);

  const handlePortHover = useCallback((e: ReactMouseEvent, deviceId: string, portId: string) => {
    // Kablo takarken, ekranı kaydırırken veya seçim yaparken port ipuçlarını gösterme
    if (isDrawingConnection || isPanning || isSelecting || isActuallyDragging || isTouchDragging) return;
    showPortTooltip(e, deviceId, portId);
  }, [showPortTooltip, isDrawingConnection, isPanning, isSelecting, isActuallyDragging, isTouchDragging]);

  const handlePortMouseLeave = useCallback(() => {
    if (portTooltipTimerRef.current) {
      clearTimeout(portTooltipTimerRef.current);
    }
    setPortTooltip(null);
  }, [setPortTooltip]);

  const handleConnectionClick = useCallback((e: React.MouseEvent, connId: string) => {
    e.stopPropagation();
    if (activeCaptureConnectionId === connId) {
      setActiveCaptureConnection(null);
    } else {
      setActiveCaptureConnection(connId);
    }
    setContextMenu(null);
  }, [activeCaptureConnectionId, setActiveCaptureConnection]);

  const handleConnectionMouseEnter = useCallback((e: React.MouseEvent<SVGPathElement>, connId: string, sourceDeviceName: string, sourcePort: string, targetDeviceName: string, targetPort: string, cableType: string, statusMessage: string) => {
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
      setConnectionTooltip({ x: tx, y: ty + TOOLTIP_OFFSET_Y, sourceDeviceName, sourcePort, targetDeviceName, targetPort, cableType, statusMessage, visible: true });
      connectionTooltipTimerRef.current = setTimeout(() => {
        setConnectionTooltip(prev => prev ? { ...prev, visible: false } : null);
      }, 3000);
    }, TOOLTIP_DELAY);
  }, [devices, setHoveredConnectionId, setConnectionTooltip]);

  const handleConnectionMouseLeave = useCallback(() => {
    setHoveredConnectionId(null);
    if (connectionTooltipTimerRef.current) clearTimeout(connectionTooltipTimerRef.current);
    setConnectionTooltip(null);
  }, [setHoveredConnectionId, setConnectionTooltip]);

  const handleDeviceMouseLeave = useCallback(() => {
    if (deviceTooltipTimerRef.current) {
      clearTimeout(deviceTooltipTimerRef.current);
      deviceTooltipTimerRef.current = null;
    }
    setDeviceTooltip(null);
  }, [setDeviceTooltip]);

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

  const toggleConnectionActive = useCallback((connId: string) => {
    saveToHistory();
    const updatedConnections = connections.map((c) => (c.id === connId ? { ...c, active: !c.active } : c));
    setConnections(updatedConnections);

    // Trigger STP recalculation for all switches
    window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
      detail: { topologyDevices: devices, topologyConnections: updatedConnections }
    }));
  }, [saveToHistory, setConnections, connections, devices]);

  // Delete connection
  const deleteConnection = useCallback((connectionId: string) => {
    if (activeCaptureConnectionId === connectionId) {
      setActiveCaptureConnection(null);
    }
    saveToHistory();
    const conn = connections.find((c) => c.id === connectionId);
    if (conn) {
      // Port durumlarını güncelle - her iki cihazda da
      setDevices((prev) =>
        prev.map((d) => {
          // Source veya target device ise port'ları güncelle
          if (d.id === conn.sourceDeviceId || d.id === conn.targetDeviceId) {
            return {
              ...d,
              ports: d.ports.map((p) => {
                // Bu bağlantıya ait portları disconnected yap
                if (p.id === conn.sourcePort || p.id === conn.targetPort) {
                  return { ...p, status: 'disconnected' as const };
                }
                return p;
              }),
            };
          }
          return d;
        })
      );
      // Bağlantıyı sil
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));

      // Trigger STP recalculation for all switches
      window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
        detail: { topologyDevices: devices, topologyConnections: connections.filter(c => c.id !== connectionId) }
      }));
    }
  }, [connections, saveToHistory, devices, activeCaptureConnectionId, setActiveCaptureConnection]);

  // Reset view
  // resetView is now provided by useCanvasZoomPan hook

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (onFullscreenChange) {
      onFullscreenChange(!isFullscreen);
    }
  }, [isFullscreen, onFullscreenChange]);


  // Copy devices
  const copyDevice = useCallback((ids: string[]) => {
    const selectedDevices = devices.filter(d => ids.includes(d.id));
    if (selectedDevices.length > 0) {
      setClipboard(selectedDevices.map(d => ({ ...d })));
    }
    setContextMenu(null);
  }, [devices]);

  // Cut devices
  const cutDevice = useCallback((ids: string[]) => {
    const selectedDevices = devices.filter(d => ids.includes(d.id));
    if (selectedDevices.length > 0) {
      setClipboard(selectedDevices.map(d => ({ ...d })));
      ids.forEach(id => deleteDevice(id));
      setSelectedDeviceIds([]);
    }
    setContextMenu(null);
  }, [devices, deleteDevice]);

  // Paste devices
  const pasteDevice = useCallback(() => {
    if (clipboard.length === 0) return;

    saveToHistory();

    const newDevices: CanvasDevice[] = [];
    const reservedIps: string[] = [];
    const reservedIpv6s: string[] = [];
    const reservedHostnames: string[] = [];

    clipboard.forEach(device => {
      const type = device.type;
      const counterKey = getCounterKey(type);
      deviceCounterRef.current[counterKey]++;
      const newId = `${type}-${deviceCounterRef.current[counterKey]}`;

      const baseName = `${type.toUpperCase()}-${deviceCounterRef.current[counterKey]}`;
      const hostname = generateUniqueHostname(baseName, reservedHostnames);
      const generatedIp = type === 'pc' || type === 'iot' ? generateUniqueLinkLocalIp(reservedIps) : '';
      const generatedIpv6 = type === 'pc' || type === 'iot' ? generateUniqueLinkLocalIpv6(reservedIpv6s) : '';

      if (generatedIp) {
        reservedIps.push(generatedIp);
      }
      if (generatedIpv6) {
        reservedIpv6s.push(generatedIpv6);
      }
      reservedHostnames.push(hostname);

      newDevices.push({
        ...device,
        id: newId,
        name: hostname,
        ip: generatedIp,
        subnet: (type === 'pc' || type === 'iot') ? '255.255.0.0' : device.subnet,
        gateway: (type === 'pc' || type === 'iot') ? '0.0.0.0' : device.gateway,
        dns: (type === 'pc' || type === 'iot') ? '0.0.0.0' : device.dns,
        x: device.x + 30,
        y: device.y + 30,
        ports: device.ports.map(p => ({ ...p, status: 'disconnected' as const })),
      });
    });

    setDevices(prev => [...prev, ...newDevices]);
    setContextMenu(null);
  }, [clipboard, saveToHistory, generateUniqueHostname, generateUniqueLinkLocalIp, generateUniqueLinkLocalIpv6, getCounterKey]);

  // Paste notes
  const pasteNotes = useCallback((x: number, y: number) => {
    if (notesClipboard.length === 0) return;

    saveToHistory();

    const newNotes: CanvasNote[] = notesClipboard.map((note) => ({
      ...note,
      id: getNextNoteId(),
      x: x + 20,
      y: y + 20,
    }));

    setNotes((prev) => [...prev, ...newNotes]);
    setSelectedNoteIds(newNotes.map(n => n.id));
    setContextMenu(null);
  }, [notesClipboard, saveToHistory, getNextNoteId, setNotes, setSelectedNoteIds]);

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

  // Handle key events: ESC to close context menu, DELETE to remove devices, Ctrl+A to select all
  useEffect(() => {
    const handleCloseBroadcast = (e: Event) => {
      const source = (e as CustomEvent)?.detail?.source;
      if (source && source !== 'topology') {
        setContextMenu(null);
        if (source === 'escape') {
          if (configuringDevice) cancelDeviceConfig();
          if (pingSource) setPingSource(null);
          if (showPortSelector) {
            setShowPortSelector(false);
            setPortSelectorStep('source');
            setSelectedSourcePort(null);
          }
          if (selectedDeviceIds.length > 0) {
            const firstId = selectedDeviceIds[0];
            const firstDevice = deviceMap.get(firstId);
            setSelectedDeviceIds([firstId]);
            if (firstDevice) onDeviceSelect(firstDevice.type === 'router' ? 'router' : firstDevice.type, firstId, undefined, firstDevice.name);
          }
        }
      }
    };
    window.addEventListener('close-menus-broadcast', handleCloseBroadcast);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
      const key = e.key.toLowerCase();

      // Check if an input element is focused
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

      // ESC to close context menu
      if (key === 'escape') {
        if (packetPopupHop !== null) {
          setPacketPopupHop(null);
          return;
        }
        if (pingAnimation) {
          handlePingClose();
          return;
        }
        setContextMenu(null);
        // Cancel ping mode
        if (pingMode) {
          setPingMode(false);
          setPingSource(null);
          setPingResult(null);
        }
        // Also cancel drawing connection
        if (isDrawingConnection) {
          cancelConnectionDrawing();
        }
        // Close palette
        if (isPaletteOpen) {
          setIsPaletteOpen(false);
        }
        // Exit fullscreen
        if (isFullscreen && onFullscreenChange) {
          onFullscreenChange(false);
        }
      }

      // Don't handle other keys if a modal is open
      if (configuringDevice) {
        return;
      }

      // Delete selected device(s) or note(s) ONLY with plain Del key.
      // Backspace and modified delete combos are intentionally ignored.
      if (e.key === 'Delete' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        if (!isEditable) {
          if (selectedDeviceIds.length > 0) {
            saveToHistory();
            selectedDeviceIds.forEach(id => deleteDevice(id));
            setSelectedDeviceIds([]);
          } else if (selectedNoteIds.length > 0) {
            saveToHistory();
            selectedNoteIds.forEach(id => deleteNote(id));
            setSelectedNoteIds([]);
          }
        }
      }

      // Arrow keys move selected devices on topology (disabled during exam)
      if (!isEditable && !isExamActive && selectedDeviceIds.length > 0 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const step = e.shiftKey ? 32 : 16;
        let deltaX = 0;
        let deltaY = 0;

        if (e.key === 'ArrowUp') deltaY = -step;
        if (e.key === 'ArrowDown') deltaY = step;
        if (e.key === 'ArrowLeft') deltaX = -step;
        if (e.key === 'ArrowRight') deltaX = step;

        if (deltaX !== 0 || deltaY !== 0) {
          e.preventDefault();
          e.stopPropagation();
          saveToHistory();
          setDevices((prev) =>
            prev.map((device) =>
              selectedDeviceIds.includes(device.id)
                ? { ...device, x: device.x + deltaX, y: device.y + deltaY }
                : device
            )
          );
          return;
        }
      }

      // Ctrl Shortcuts - skip if input is focused
      if ((e.ctrlKey || e.metaKey) && !isEditable) {
        // Ctrl+A to select all
        if (key === 'a') {
          e.preventDefault();
          selectAllDevices();
        }

        // Ctrl+C to copy
        if (key === 'c' && !isExamActive) {
          if (selectedDeviceIds.length > 0) {
            copyDevice(selectedDeviceIds);
          }
        }
        // Ctrl+X to cut (disabled during exam)
        if (key === 'x' && !isExamActive) {
          if (selectedDeviceIds.length > 0) {
            cutDevice(selectedDeviceIds);
          }
        }
        // Ctrl+V to paste (disabled during exam)
        if (key === 'v' && pasteDevice && !isExamActive) {
          e.preventDefault();
          pasteDevice();
        }

        // Ctrl+F to toggle fullscreen
        if (key === 'f') {
          e.preventDefault();
          toggleFullscreen();
        }
      }

      // Alt+R to reset zoom/pan view
      if (e.altKey && !e.ctrlKey && !e.metaKey && key === 'r') {
        e.preventDefault();
        resetView();
      }

      // P to enter ping mode
      if (!isEditable && key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !isPingPanelVisible) {
        e.preventDefault();
        if (!pingMode) {
          if (selectedDeviceIds.length === 1) {
            const selectedDevice = deviceMap.get(selectedDeviceIds[0]);
            setPingSource(selectedDevice || null);
          } else {
            setPingSource(null);
          }
          setPingMode(true);
          setPingResult(null);
        } else {
          setPingMode(false);
          setPingSource(null);
          setPingResult(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('close-menus-broadcast', handleCloseBroadcast);
    };
  }, [selectedDeviceIds, selectedNoteIds, deleteDevice, deleteNote, configuringDevice, cancelDeviceConfig, selectAllDevices, saveToHistory, devices, onDeviceDelete, isDrawingConnection, isPaletteOpen, handleUndo, handleRedo, copyDevice, cutDevice, pasteDevice, pingSource, pingMode, showPortSelector, toggleFullscreen, isFullscreen, resetView, onFullscreenChange, isExamActive, cancelConnectionDrawing, handlePingClose, packetPopupHop, setPacketPopupHop, pingAnimation, setPingResult, deviceMap, onDeviceSelect]);

  // findPath and cancelPingDueToInterruption are now managed by usePingAnimation hook

  // Keep ref updated for RAF closures
  useLayoutEffect(() => {
    cancelPingDueToInterruptionRef.current = cancelPingDueToInterruption;
  }, [cancelPingDueToInterruption]);

  // Sync ref after declaration to avoid TDZ
  useLayoutEffect(() => {
    startPingAnimationRef.current = startPingAnimation;
  }, [startPingAnimation]);

  // Ping pause/play/next handlers
  const handlePingPause = useCallback(() => {
    pingIsPausedRef.current = true;
    // Don't reset pingStepModeRef here - preserve step mode state
    // pingStepModeRef.current = false;

    // Cancel the current animation frame
    if (pingAnimationRef.current) {
      cancelAnimationFrame(pingAnimationRef.current);
      pingAnimationRef.current = null;
    }

    // Note: We don't need to set pingResumeCallbackRef here because:
    // 1. If we're in the middle of a hop, the animate() function will be called again by play
    // 2. If we're at a hop boundary, the callback is already set by advanceToNextHop
    // The key is that animate() checks pingIsPausedRef at the start and returns early

    setPingAnimation(prev => prev ? { ...prev, isPaused: true } : null);
  }, []);

  const handlePingPlay = useCallback(() => {
    if (!pingIsPausedRef.current) return;

    pingIsPausedRef.current = false;
    pingStepModeRef.current = false;
    setPingAnimation(prev => prev ? { ...prev, isPaused: false } : null);
    setPacketPopupHop(null);

    if (pingResumeCallbackRef.current) {
      const resume = pingResumeCallbackRef.current;
      pingResumeCallbackRef.current = null;
      resume();
    }
  }, []);

  const handlePingNext = useCallback(() => {
    if (!pingIsPausedRef.current) return;

    const resume = pingResumeCallbackRef.current;
    if (!resume) return;

    pingStepModeRef.current = true;
    pingIsPausedRef.current = false;
    setPingAnimation(prev => prev ? { ...prev, isPaused: false } : null);
    setPacketPopupHop(null);

    resume();
  }, []);

  const handleEnvelopeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handlePingPause();
    setPingAnimation(prev => prev ? { ...prev, showPacketPanel: true } : null);
    if (onPacketPanelFocus) onPacketPanelFocus();
    if (pingAnimation) setPacketPopupHop(pingAnimation.currentHopIndex);
  }, [handlePingPause, onPacketPanelFocus, pingAnimation]);

  useEffect(() => {
    return () => {
      pingIsPausedRef.current = false;
      pingStepModeRef.current = false;
      pingResumeCallbackRef.current = null;
      if (pingAnimationRef.current) {
        cancelAnimationFrame(pingAnimationRef.current);
        pingAnimationRef.current = null;
      }
      if (pingCleanupTimeoutRef.current) {
        clearTimeout(pingCleanupTimeoutRef.current);
        pingCleanupTimeoutRef.current = null;
      }
    };
  }, []);

  // Listen for global ping animation trigger
  useEffect(() => {
    const handlePingTrigger = (event: Event) => {
      const { sourceId, targetId } = (event as CustomEvent).detail as { sourceId: string; targetId: string };
      if (sourceId && targetId) {
        startPingAnimation(sourceId, targetId);
      }
    };
    window.addEventListener('trigger-ping-animation', handlePingTrigger as EventListener);
    return () => window.removeEventListener('trigger-ping-animation', handlePingTrigger as EventListener);
  }, [startPingAnimation]);

  // Listen for device power toggle events — cancel active ping if a device in the path is turned off
  useEffect(() => {
    const handlePowerToggle = (event: Event) => {
      const { deviceId, nextStatus } = (event as CustomEvent).detail as { deviceId: string; nextStatus: string };
      if (nextStatus === 'offline' && pingPathRef.current.includes(deviceId)) {
        cancelPingDueToInterruptionRef.current(
          isTR ? 'Cihaz kapatıldığı için ping iptal edildi.' : 'Ping cancelled because a device was powered off.'
        );
      }
    };
    window.addEventListener('trigger-topology-toggle-power', handlePowerToggle as EventListener);
    return () => window.removeEventListener('trigger-topology-toggle-power', handlePowerToggle as EventListener);
  }, [isTR]);

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

  // Get device position (center based on device type)
  const getDeviceCenter = useCallback((device: CanvasDevice) => {
    const deviceWidth = getDeviceWidth(device.type);
    const deviceHeight = getDeviceHeight(device.type, device.ports.length);
    return { x: device.x + deviceWidth / 2, y: device.y + deviceHeight / 2 };
  }, []);

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
  }, [focusDeviceId, devices, zoom, getDeviceCenter]);

  // Get port position on device
  const getPortPosition = useCallback((device: CanvasDevice, portId: string) => {
    const portIndex = device.ports.findIndex(p => p.id === portId);
    if (portIndex === -1) return getDeviceCenter(device);

    const deviceWidth = getDeviceWidth(device.type);
    const portsPerRow = (device.type === 'pc' || device.type === 'iot') ? 2 : 8;
    const col = portIndex % portsPerRow;
    const row = Math.floor(portIndex / portsPerRow);

    if (device.type === 'pc' || device.type === 'iot') {
      const pcPortSpacing = PC_PORT_SPACING;
      const pcStartY = 85 / 2 - ((device.ports.length - 1) * pcPortSpacing) / 2;
      return {
        x: device.x + deviceWidth - 8,
        y: device.y + pcStartY + portIndex * pcPortSpacing
      };
    }

    // Router/WLC: Gi ports row 0, Console+Serial ports row 1
    let actualCol: number;
    let actualRow: number;
    if (device.type === 'router' || device.type === 'wlc') {
      const filteredPorts = device.ports.filter(p => p.id !== 'wlan0' && !p.id.startsWith('service'));
      const portIdLower = portId.toLowerCase();
      const giPorts = filteredPorts.filter(p => p.id.toLowerCase().startsWith('gi'));
      const otherPorts = filteredPorts.filter(p => !p.id.toLowerCase().startsWith('gi'));
      const isGi = portIdLower.startsWith('gi');
      if (device.type === 'wlc') {
        // WLC: all ports in single row, console after gi ports
        if (isGi) {
          actualCol = giPorts.findIndex(p => p.id === portId);
        } else {
          actualCol = giPorts.length + otherPorts.findIndex(p => p.id === portId);
        }
        actualRow = 0;
      } else {
        // Router: gi ports row 0, other ports row 1
        if (isGi) {
          actualCol = giPorts.findIndex(p => p.id === portId);
          actualRow = 0;
        } else {
          actualCol = otherPorts.findIndex(p => p.id === portId);
          actualRow = 1;
        }
      }
    } else {
      actualCol = col;
      actualRow = row;
    }

    const portSpacing = PORT_SPACING;
    const rowSpacing = PORT_SPACING;
    const startX = PORT_START_X;
    const startY = PORT_START_Y;

    return {
      x: device.x + startX + actualCol * portSpacing,
      y: device.y + startY + actualRow * rowSpacing
    };
  }, [getDeviceCenter]);

  // Sync getPortPosition ref for direct DOM connection updates during drag
  useEffect(() => {
    getPortPositionRef.current = getPortPosition;
  }, [getPortPosition]);

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
    deviceMap
  });

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

          {/* Selection Toolbar */}
          {selectedDeviceIds.length > 1 && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                pointerEvents: 'auto'
              }}
              className={`px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 selection-toolbar panel-ambient-glow ${isDark ? 'bg-secondary-800/95 text-white border border-secondary-700' : 'bg-white text-secondary-900 border border-secondary-200'
                } backdrop-blur-md`}
              onClick={(e) => {
                e.stopPropagation();
                logger.debug('[Toolbar] Container clicked');
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                // preventDefault removed to ensure button clicks fire correctly
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
              }}
            >
              <TooltipWrapper title={t.alignLeft}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    logger.debug('[Toolbar] Align left clicked');
                    handleAlign('left');
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-secondary-700 text-secondary-300' : 'hover:bg-secondary-100 text-secondary-600'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 2v20M8 5h10M8 11h7M8 17h12" />
                  </svg>
                </button>
              </TooltipWrapper>
              <TooltipWrapper title={t.alignTop}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    logger.debug('[Toolbar] Align top clicked');
                    handleAlign('top');
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-secondary-700 text-secondary-300' : 'hover:bg-secondary-100 text-secondary-600'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 4h20M5 8v10M11 8v7M17 8v12" />
                  </svg>
                </button>
              </TooltipWrapper>
              <div className="w-px h-4 bg-secondary-700/30 mx-1" />
              <span className="text-xs font-semibold whitespace-nowrap bg-secondary-700/30 px-2 py-0.5 rounded">
                {selectedDeviceIds.length}
              </span>
              <TooltipWrapper title={t.cancel}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    logger.debug('[Toolbar] Cancel clicked');
                    const firstId = selectedDeviceIds[0];
                    const firstDevice = deviceMap.get(firstId);
                    setSelectedDeviceIds(firstId ? [firstId] : []);
                    if (firstDevice) onDeviceSelect(firstDevice.type === 'router' ? 'router' : firstDevice.type, firstId, undefined, firstDevice.name);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-secondary-700 text-secondary-200' : 'hover:bg-secondary-100 text-secondary-600'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </TooltipWrapper>
              <TooltipWrapper title={t.delete}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    logger.debug('[Toolbar] Delete clicked');
                    saveToHistory();
                    selectedDeviceIds.forEach(id => deleteDevice(id));
                    setSelectedDeviceIds([]);
                  }}
                  className="p-1.5 rounded-lg hover:bg-error-500/20 text-error-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </TooltipWrapper>
            </div>
          )}

          {/* Canvas */}
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

                  {/* Broadcast flood icons – animated envelopes flying from switch to each connected device */}
                  {pingAnimation && pingAnimation.broadcastAnim.map((bcast) => {
                    const prog = pingAnimation.broadcastProgress;
                    const ex = bcast.fromX + (bcast.toX - bcast.fromX) * prog;
                    const ey = bcast.fromY + (bcast.toY - bcast.fromY) * prog - 35;
                    const opacity = prog < 0.1 ? prog * 10 : prog > 0.9 ? (1 - prog) * 10 : 1;
                    return (
                      <g key={`bcast-${bcast.targetId}`}>
                        <circle cx={ex} cy={ey} r="14" fill="#ef4444" opacity={0.2 * opacity} className="animate-ping-glow" />
                        <rect x={ex - 10} y={ey - 7} width="20" height="14" rx="2" fill="#ef4444" stroke="#dc2626" strokeWidth="1.5" opacity={opacity} />
                        <path d={`M${ex - 8} ${ey - 3} L${ex} ${ey + 4} L${ex + 8} ${ey - 3}`} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
                      </g>
                    );
                  })}
                  {/* Ping Animation - rendered LAST for top z-order */}
                  {pingAnimation && (() => {
                    const { path, currentHopIndex, progress, success, error } = pingAnimation;

                    // Show error message if ping failed
                    if (success === false && error) {
                      return (
                        <g key="ping-error" opacity={0.95}>
                          <foreignObject x="20" y="20" width="300" height="auto">
                            <div className={`p-3 rounded-lg shadow-lg border ${isDark ? 'bg-error-500/20 border-error-500/50' : 'bg-error-50 border-error-200'}`}>
                              <div className={`text-sm font-bold ${isDark ? 'text-error-300' : 'text-error-700'}`}>
                                {t.pingFailed}
                              </div>
                              <div className={`text-xs mt-1 ${isDark ? 'text-error-200' : 'text-error-600'}`}>
                                {error}
                              </div>
                            </div>
                          </foreignObject>
                        </g>
                      );
                    }

                    // Show success message if ping succeeded
                    if (success === true) {
                      return (
                        <g key="ping-success" opacity={0.95}>
                          <foreignObject x="20" y="20" width="300" height="auto">
                            <div className={`p-3 rounded-lg shadow-lg border ${isDark ? 'bg-success-500/20 border-success-500/50' : 'bg-success-50 border-success-200'}`}>
                              <div className={`text-sm font-bold ${isDark ? 'text-success-300' : 'text-success-700'}`}>
                                {t.pingSuccess}
                              </div>
                            </div>
                          </foreignObject>
                        </g>
                      );
                    }

                    if (!path || path.length < 2 || success !== null) return null;

                    const fromDevice = deviceMap.get(path[currentHopIndex]);
                    const toDevice = deviceMap.get(path[currentHopIndex + 1]);
                    if (!fromDevice || !toDevice) return null;

                    const conn = connections.find(
                      c => (c.sourceDeviceId === fromDevice.id && c.targetDeviceId === toDevice.id) ||
                        (c.sourceDeviceId === toDevice.id && c.targetDeviceId === fromDevice.id)
                    );

                    let source: { x: number; y: number };
                    let target: { x: number; y: number };

                    if (conn) {
                      source = getPortPosition(fromDevice, conn.sourceDeviceId === fromDevice.id ? conn.sourcePort : conn.targetPort);
                      target = getPortPosition(toDevice, conn.sourceDeviceId === toDevice.id ? conn.sourcePort : conn.targetPort);
                    } else {
                      source = getDeviceCenter(fromDevice);
                      target = getDeviceCenter(toDevice);
                    }

                    const midX = (source.x + target.x) / 2;
                    const sameDeviceConnections = connections.filter(
                      c => (c.sourceDeviceId === fromDevice.id && c.targetDeviceId === toDevice.id) ||
                        (c.sourceDeviceId === toDevice.id && c.targetDeviceId === fromDevice.id)
                    );
                    const sameConnIndex = conn ? sameDeviceConnections.findIndex(c => c.id === conn.id) : 0;
                    const totalSameConns = sameDeviceConnections.length;
                    const maxOffset = 20;
                    const offset = totalSameConns > 1
                      ? (sameConnIndex - (totalSameConns - 1) / 2) * (maxOffset / Math.max(totalSameConns - 1, 1))
                      : 0;

                    const dx = target.x - source.x;
                    const dy = target.y - source.y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    const perpX = -dy / len * offset;
                    const perpY = dx / len * offset;

                    const controlPoint1 = { x: midX + perpX, y: source.y + perpY + Math.abs(offset) * 0.5 };
                    const controlPoint2 = { x: midX + perpX, y: target.y + perpY - Math.abs(offset) * 0.5 };

                    const progressVal = progress;
                    const p2 = progressVal * progressVal; const p3 = p2 * progressVal;
                    const mt = 1 - progressVal; const mt2 = mt * mt; const mt3 = mt2 * mt;

                    const bezierX = mt3 * source.x + 3 * mt2 * progressVal * controlPoint1.x + 3 * mt * p2 * controlPoint2.x + p3 * target.x;
                    const bezierY = mt3 * source.y + 3 * mt2 * progressVal * controlPoint1.y + 3 * mt * p2 * controlPoint2.y + p3 * target.y;

                    const tangentDx = -3 * mt2 * source.x + 3 * (mt2 - 2 * mt * progressVal) * controlPoint1.x + 3 * (2 * mt * progressVal - p2) * controlPoint2.x + 3 * p2 * target.x;
                    const tangentDy = -3 * mt2 * source.y + 3 * (mt2 - 2 * mt * progressVal) * controlPoint1.y + 3 * (2 * mt * progressVal - p2) * controlPoint2.y + 3 * p2 * target.y;
                    const tangentLen = Math.sqrt(tangentDx * tangentDx + tangentDy * tangentDy) || 1;

                    const envelopeX = bezierX + (tangentDy / tangentLen * 20);
                    const envelopeY = bezierY + (-tangentDx / tangentLen * 20);

                    const getBezierPoint = (t: number) => {
                      const mt = 1 - t;
                      return {
                        x: mt * mt * mt * source.x + 3 * mt * mt * t * controlPoint1.x + 3 * mt * t * t * controlPoint2.x + t * t * t * target.x,
                        y: mt * mt * mt * source.y + 3 * mt * mt * t * controlPoint1.y + 3 * mt * t * t * controlPoint2.y + t * t * t * target.y,
                      };
                    };

                    return (
                      <g key="ping-animation" opacity={0.9}>

                        {/* Packet trail - fading circles behind envelope in high graphics */}
                        {graphicsQuality === 'high' && (
                          [0.03, 0.06, 0.09, 0.12, 0.15].map((offset, i) => {
                            const trailT = progressVal - offset;
                            if (trailT < 0) return null;
                            const pt = getBezierPoint(trailT);
                            const mtT = 1 - trailT;
                            const tDx = -3 * mtT * mtT * source.x + 3 * (mtT * mtT - 2 * mtT * trailT) * controlPoint1.x + 3 * (2 * mtT * trailT - trailT * trailT) * controlPoint2.x + 3 * trailT * trailT * target.x;
                            const tDy = -3 * mtT * mtT * source.y + 3 * (mtT * mtT - 2 * mtT * trailT) * controlPoint1.y + 3 * (2 * mtT * trailT - trailT * trailT) * controlPoint2.y + 3 * trailT * trailT * target.y;
                            const tLen = Math.sqrt(tDx * tDx + tDy * tDy) || 1;
                            const tx = pt.x + (tDy / tLen * 20);
                            const ty = pt.y + (-tDx / tLen * 20);
                            const opacity = Math.max(0, 0.4 - i * 0.07);
                            const radius = Math.max(1.5, 5 - i * 0.7);
                            return (
                              <circle
                                key={i}
                                cx={tx}
                                cy={ty}
                                r={radius}
fill="var(--color-accent-500)"
                                opacity={opacity}
                                filter={i === 0 ? 'url(#packetGlow)' : undefined}
                                className={i === 0 ? 'animate-ping-trail' : undefined}
                                style={{ pointerEvents: 'none' }}
                              />
                            );
                          })
                        )}

                        <g
                          transform={`translate(${envelopeX}, ${envelopeY})`}
                          className="cursor-pointer"
                          onClick={handleEnvelopeClick}
                        >
                          {/* Glow highlight */}
{graphicsQuality === 'high' ? (
                             <circle cx="0" cy="0" r="16" style={{ fill: 'var(--color-accent-500)' }} opacity="0.2" filter="url(#packetGlow)" className="animate-ping-glow" />
                           ) : (
                             <circle cx="0" cy="0" r="14" style={{ fill: 'var(--color-accent-500)' }} opacity="0.1" className="animate-ping-glow-low" />
                           )}
                          <rect x="-10" y="-7" width="20" height="14" rx="2" fill="var(--color-accent-500)" style={{ stroke: 'var(--color-accent-600)', strokeWidth: '1.5' }} />
                          <path d="M-8 -3 L0 4 L8 -3" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                      </g>
                    );
                  })()}

                  {/* Rectangle Selection Box */}
                  {selectionBox && (
                    <rect
                      x={Math.min(selectionBox.start.x, selectionBox.current.x)}
                      y={Math.min(selectionBox.start.y, selectionBox.current.y)}
                      width={Math.abs(selectionBox.current.x - selectionBox.start.x)}
                      height={Math.abs(selectionBox.current.y - selectionBox.start.y)}
                      fill={isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.15)"}
                      stroke={isDark ? "rgba(34, 197, 94, 1)" : "rgba(34, 197, 94, 0.9)"}
                      strokeWidth={2 / zoom}
                      strokeDasharray={`${6 / zoom}, ${6 / zoom}`}
                      pointerEvents="none"
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
      {/* Device Configuration Modal (Name & IP) */}
      {(() => {
        if (!configuringDevice) return null;
        const d = deviceMap.get(configuringDevice);
        return d ? (
          <DeviceConfigModal
            device={d}
            onClose={cancelDeviceConfig}
            onSave={saveDeviceConfig}
            isMobile={isMobile}
            isDark={isDark}
          />
        ) : null;
      })()}

      {/* Success/failure result is shown inside PingPacketInfoPanel */}

      {/* Ping Packet Info Panel - shows during animation AND on success/failure result */}
      {pingAnimation && (
        <PingPacketInfoPanel
          isVisible={!!(pingAnimation.showPacketPanel)}
          isPaused={!!pingAnimation.isPaused}
          hopPacketInfos={hopPacketInfos}
          currentHopIndex={pingAnimation.currentHopIndex}
          totalHops={pingAnimation.path.length - 1}
          onPlay={handlePingPlay}
          onPause={handlePingPause}
          onNext={handlePingNext}
          onClose={handlePingClose}
          language={language}
          isDark={isDark}
          graphicsQuality={graphicsQuality}
          isMobile={isMobile}
          onFocus={onPacketPanelFocus}
          zIndex={packetPanelZIndex}
          success={pingAnimation.success}
          isReturn={!!pingAnimation.isReturn}
          errorMessage={pingAnimation.error}
          sourceName={deviceMap.get(pingAnimation.sourceId)?.name ?? pingAnimation.sourceId}
          targetName={deviceMap.get(pingAnimation.targetId)?.name ?? pingAnimation.targetId}
          sourceIp={deviceMap.get(pingAnimation.sourceId)?.ip ?? ''}
          targetIp={deviceMap.get(pingAnimation.targetId)?.ip ?? ''}
          isFocused={true}
        />
      )}

      {/* Packet Content Popup - mektup tıklandığında açılır */}
      {packetPopupHop !== null && hopPacketInfos[packetPopupHop] && (
        <PacketPopup
          hopIndex={packetPopupHop}
          info={hopPacketInfos[packetPopupHop]}
          language={language}
          isDark={isDark}
          onClose={() => setPacketPopupHop(null)}
          isFocused={true}
        />
      )}

      {/* Persistent Error Toast - ping başarısız olduğunda göster, kullanıcı kapatana kadar açık kalır */}
      {errorToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-3 rounded-lg shadow-2xl shadow-black/25 flex items-start gap-2 bg-error-600 text-white max-w-md">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex flex-col flex-grow">
              <span className="text-sm font-medium">{errorToast.message}</span>
              {errorToast.details && (
                <span className="text-xs opacity-90 mt-0.5">{errorToast.details}</span>
              )}
            </div>
            <TooltipWrapper title={t.close}>
              <button
                onClick={() => setErrorToast(null)}
                className="flex-shrink-0 ml-2 hover:bg-error-700 rounded p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </TooltipWrapper>
          </div>
        </div>
      )}

      {/* Connection Error Toast */}
      {connectionError && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-3 rounded-lg shadow-2xl shadow-black/25 flex items-center gap-2 bg-error-600 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">{connectionError}</span>
          </div>
        </div>
      )}

      {/* Mobile Device Palette Sheet */}
      <Sheet open={mobilePaletteOpen} onOpenChange={setMobilePaletteOpen}>
        <SheetContent side="bottom" className={`rounded-t-[2rem] px-6 pb-10 border-t-2 border-primary/20 backdrop-blur-xl ${isDark ? 'bg-secondary-900/95' : 'bg-white/95'}`}>
          <SheetHeader className="mb-4 pt-2">
            <SheetTitle className={`text-center font-black tracking-tighter text-xl uppercase ${isDark ? 'text-white' : 'text-secondary-900'}`}>
              {isTR ? 'Cihaz & Kablo Ekle' : 'Add Device & Cable'}
            </SheetTitle>
          </SheetHeader>

          {/* Devices */}
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
            {isTR ? 'Cihazlar' : 'Devices'}
          </p>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {([
              { type: 'pc'      as const, label: 'PC',       layer: undefined as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.pc },
              { type: 'switch'  as const, label: 'L2 SW',    layer: 'L2'      as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.switchL2 },
              { type: 'switch'  as const, label: 'L3 SW',    layer: 'L3'      as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.switchL3 },
              { type: 'router'  as const, label: 'Router',   layer: undefined as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.router },
              { type: 'firewall'as const, label: 'Firewall', layer: undefined as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.firewall },
              { type: 'iot'     as const, label: 'IoT',      layer: undefined as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.iot },
              { type: 'wlc'     as const, label: 'WLC',      layer: undefined as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.wlc },
            ]).map((item) => (
              <button
                key={`${item.type}-${item.layer || ''}`}
                onClick={() => {
                  addDevice(item.type, item.layer);
                  setMobilePaletteOpen(false);
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95 ${isDark
                  ? 'border-secondary-700 bg-secondary-800/50 hover:bg-secondary-800'
                  : 'border-secondary-200 bg-secondary-50 hover:bg-secondary-100'}`}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  {item.icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-secondary-300' : 'text-secondary-600'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Cables */}
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
            {isTR ? 'Kablolar' : 'Cables'}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {([
              { type: 'straight'  as const, label: isTR ? 'Düz'    : 'Straight',  icon: <Cable         className="w-5 h-5" />, activeColor: 'text-primary-400',  color: 'text-primary-500'  },
              { type: 'crossover' as const, label: isTR ? 'Çapraz' : 'Crossover', icon: <LineSquiggle  className="w-5 h-5" />, activeColor: 'text-warning-400',  color: 'text-warning-500'  },
              { type: 'serial'    as const, label: isTR ? 'Seri'   : 'Serial',    icon: <Plug          className="w-5 h-5" />, activeColor: 'text-success-400',  color: 'text-success-500'  },
              { type: 'console'   as const, label: isTR ? 'Konsol' : 'Console',   icon: <TrendingUpDown className="w-5 h-5" />, activeColor: 'text-accent-400',   color: 'text-accent-500'   },
              { type: 'wireless'  as const, label: isTR ? 'Kablo-' : 'Wireless',  icon: <Wifi          className="w-5 h-5" />, activeColor: 'text-purple-400',   color: 'text-purple-500'   },
            ]).map((item) => {
              const isActive = cableInfo.cableType === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => { onCableChange({ ...cableInfo, cableType: item.type }); setMobilePaletteOpen(false); }}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all active:scale-95 ${
                    isActive
                      ? isDark
                        ? 'border-secondary-500 bg-secondary-700/80'
                        : 'border-secondary-400 bg-secondary-200/80'
                      : isDark
                        ? 'border-secondary-700 bg-secondary-800/50 hover:bg-secondary-800'
                        : 'border-secondary-200 bg-secondary-50 hover:bg-secondary-100'}`}
                >
                  <div className={`relative flex items-center justify-center ${isActive ? item.activeColor : item.color}`}>
                    {item.icon}
                    {isActive && <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary-500 rounded-full" />}
                  </div>
                  <span className={`text-[9px] font-bold text-center leading-tight ${isActive ? item.activeColor : item.color}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <LazyNetworkTopologyPortSelectorModal
        isOpen={showPortSelector}
        isDark={isDark}
        graphicsQuality={graphicsQuality}
        devices={devices}
        cableType={cableInfo.cableType}
        portSelectorStep={portSelectorStep}
        selectedSourcePort={selectedSourcePort}
        onClose={() => {
          setShowPortSelector(false);
          setPortSelectorStep('source');
          setSelectedSourcePort(null);
        }}
        onCableTypeChange={(nextType) => onCableChange({ ...cableInfo, cableType: nextType })}
        onSelectPort={(deviceId, portId) => {
          if (portSelectorStep === 'source') {
            flushSync(() => {
              setSelectedSourcePort({ deviceId, portId });
              setPortSelectorStep('target');
            });
          } else {
            // Complete connection only if not clicking same source port
            const srcPort = selectedSourcePort as { deviceId: string; portId: string };
            if (srcPort.deviceId === deviceId && srcPort.portId === portId) return;

            const newConnection: CanvasConnection = {
              id: `conn-${Date.now()}`,
              sourceDeviceId: srcPort.deviceId,
              sourcePort: srcPort.portId,
              targetDeviceId: deviceId,
              targetPort: portId,
              cableType: cableInfo.cableType,
              active: true,
            };

            flushSync(() => {
              setConnections((prev) => [...prev, newConnection]);

              // Update port status
              setDevices((prev) =>
                prev.map((d) => {
                  if (d.id === srcPort.deviceId) {
                    return {
                      ...d,
                      ports: d.ports.map((p) =>
                        p.id === srcPort.portId ? { ...p, status: 'connected' as const } : p
                      ),
                    };
                  }
                  if (d.id === deviceId) {
                    return {
                      ...d,
                      ports: d.ports.map((p) =>
                        p.id === portId ? { ...p, status: 'connected' as const } : p
                      ),
                    };
                  }
                  return d;
                })
              );

              // Update cable info
              const sourceDevice = deviceMap.get(srcPort.deviceId);
              const targetDevice = deviceMap.get(deviceId);
              if (sourceDevice && targetDevice) {
                onCableChange({
                  ...cableInfo,
                  connected: true,
                  sourceDevice: sourceDevice.type,
                  targetDevice: targetDevice.type,
                });
              }

              setShowPortSelector(false);
              setPortSelectorStep('source');
              setSelectedSourcePort(null);
            });

            // Trigger STP recalculation for all switches AFTER UI update to prevent stuttering
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
                detail: { topologyDevices: devices, topologyConnections: [...connections, newConnection] }
              }));
            }, 0);
          }
        }}
      />
      {/* Port Tooltip */}
      <PortTooltip portTooltip={portTooltip} deviceMap={deviceMap} deviceStates={deviceStates} isDark={isDark} language={language} getIotDeviceStatus={getIotDeviceStatus} getIotPowerStatus={getIotPowerStatus} getIotOpenCloseStatus={getIotOpenCloseStatus} getLivePortVlanText={getLivePortVlanText} />

      {/* Connection Tooltip */}
      <ConnectionTooltip connectionTooltip={connectionTooltip} isDark={isDark} language={language} CABLE_COLORS={CABLE_COLORS} />

      {/* Device Tooltip */}
      {deviceTooltip && (
        <DeviceTooltip
          tooltip={deviceTooltip}
          deviceMap={deviceMap}
          isDark={isDark}
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
      )}
      {/* Packet Capture Panel */}
      {activeCaptureConnectionId && (
        <PacketCapturePanel
          activeCaptureConnectionId={activeCaptureConnectionId}
          clearCapturedPackets={clearCapturedPackets}
          setActiveCaptureConnection={setActiveCaptureConnection}
          capturedPacketsMap={capturedPacketsMap}
          t={t}
          isDark={isDark}
        />
      )}

      {/* Toast Notification */}
      {errorToast && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed bottom-4 left-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 z-40 ${errorToast.type === 'success'
            ? isDark ? 'bg-success-500/20 border border-success-500/50 text-success-300' : 'bg-success-50 border border-success-200 text-success-700'
            : isDark ? 'bg-error-500/20 border border-error-500/50 text-error-300' : 'bg-error-50 border border-error-200 text-error-700'
            }`}
        >
          {errorToast.message}
        </div>
      )}

    </div>
  );
};
