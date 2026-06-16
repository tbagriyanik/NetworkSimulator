'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { flushSync } from 'react-dom';
import dynamic from 'next/dynamic';
import useAppStore, { useTopologyDevices, useTopologyConnections, useTopologyNotes } from '@/lib/store/appStore';
import { CableType, isCableCompatible } from '@/lib/network/types';
import { checkDeviceConnectivity, getPingDiagnostics, getWirelessSignalStrength, getWirelessDistance } from '@/lib/network/connectivity';
import { generateRandomLinkLocalIpv4, generateRandomLinkLocalIpv6 } from '@/lib/network/linkLocal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNetworkRefreshWithPositions } from '@/hooks/useNetworkRefreshWithPositions';
import { useSpatialPartitioning } from '@/lib/performance/spatial';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipWrapper } from "@/components/ui/TooltipWrapper";
import { ShortcutBadge } from "@/components/ui/ShortcutBadge";
import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType, NetworkTopologyProps } from './networkTopology.types';
import { generateSwitchPorts, generateL3SwitchPorts, generateRouterPorts } from './networkTopology.portGenerators';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { ConnectionLine } from './ConnectionLine';
import { DeviceNode } from './DeviceNode';
import LazyNetworkTopologyContextMenu from './LazyNetworkTopologyContextMenu';
import { LazyNetworkTopologyPortSelectorModal } from './LazyNetworkTopologyPortSelectorModal';
import { useEnvironment } from '@/lib/store/appStore';
import { Plus, Power, Trash2, Monitor, Network, Laptop, X, Cable, Strikethrough, Usb } from "lucide-react";
import { normalizeMAC } from '@/lib/utils';
import { getDeviceWidth, getDeviceHeight } from './networkTopology.helpers';
import { CABLE_COLORS, DRAG_THRESHOLD, LONG_PRESS_DURATION, VIRTUAL_CANVAS_WIDTH_MOBILE, VIRTUAL_CANVAS_HEIGHT_MOBILE, VIRTUAL_CANVAS_WIDTH_DESKTOP, VIRTUAL_CANVAS_HEIGHT_DESKTOP, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, NOTE_COLORS, NOTE_FONTS_DESKTOP as NOTE_FONTS, NOTE_FONT_SIZES, NOTE_OPACITY as NOTE_OPACITY_OPTIONS, PC_PORT_SPACING, PORT_SPACING, PORT_START_X, PORT_START_Y, PORT_COLORS, STATUS_COLORS } from './networkTopology.constants';
import { errorHandler, CLIPBOARD_ERRORS } from '@/lib/errors/errorHandler';
import { buildHopPacketInfos } from './PingPacketInfoPanel';
import { logger } from '@/lib/logger';

const PingPacketInfoPanel = dynamic(
  () => import('./PingPacketInfoPanel').then((m) => m.PingPacketInfoPanel),
  { ssr: false }
);

const generateMacAddress = (seed?: number): string => {
  const chars = '0123456789ABCDEF';
  let hex = '';
  // Simple deterministic generation if seed is provided, else random
  // For hydration safety, we prefer a passed seed when possible
  for (let i = 0; i < 12; i++) {
    const idx = seed !== undefined
      ? (seed + i) % 16
      : Math.floor(Math.random() * 16);
    hex += chars[idx];
  }
  return `${hex.slice(0, 4)}.${hex.slice(4, 8)}.${hex.slice(8, 12)}`;
};

const DEVICE_ICONS: Record<DeviceType | 'switch', React.ReactNode> = {
  pc: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z" />
    </svg>
  ),
  iot: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="#16cbf9" viewBox="0 -2 27 27">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.247 7.761a6 6 0 0 1 0 8.478" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.075 4.933a10 10 0 0 1 0 14.134" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.925 19.067a10 10 0 0 1 0-14.134" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.753 16.239a6 6 0 0 1 0-8.478" />
      <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} cx="12" cy="12" r="2" />
    </svg>
  ),
  switch: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  switchL2: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  switchL3: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  router: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="#a855f7" viewBox="0 0 24 24">
      <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
    </svg>
  ),
  firewall: (
    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="#ef4444" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  ),
};

const isSwitchDeviceType = (type: DeviceType) => type === 'switchL2' || type === 'switchL3';

function PacketPopup({ hopIndex, info, language, onClose, isDark }: {
  hopIndex: number;
  info: import('./PingPacketInfoPanel').HopPacketInfo;
  language: 'tr' | 'en';
  onClose: () => void;
  isDark: boolean;
}) {
  const HEADER_SAFE_TOP = 72;
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('draggable_position_packet-popup');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          return {
            x: Math.max(0, Math.min(parsed.x, vw - 320)),
            y: Math.max(HEADER_SAFE_TOP, Math.min(parsed.y, vh - 200)),
          };
        }
      }
    } catch { }
    return typeof window !== 'undefined'
      ? { x: Math.max(16, (window.innerWidth - 320) / 2), y: Math.max(HEADER_SAFE_TOP, (window.innerHeight - 340) / 2) }
      : { x: 100, y: 100 };
  });
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const clamp = (x: number, y: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      return {
        x: Math.max(0, Math.min(x, vw - 320)),
        y: Math.max(HEADER_SAFE_TOP, Math.min(y, vh - 200)),
      };
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos(clamp(
        dragRef.current.startPosX + ev.clientX - dragRef.current.startX,
        dragRef.current.startPosY + ev.clientY - dragRef.current.startY,
      ));
    };
    const onUp = () => {
      if (dragRef.current) {
        setPos(prev => clamp(prev.x, prev.y));
      }
      dragRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
  }, [pos]);

  useEffect(() => {
    try { localStorage.setItem('draggable_position_packet-popup', JSON.stringify(pos)); } catch { }
  }, [pos]);

  const p = info;
  return (
    <div
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
      onClick={e => e.stopPropagation()}
    >
      <div className={`rounded-xl border w-80 backdrop-blur-md ${isDark ? 'bg-zinc-950/40 border-zinc-800/50 shadow-black/40' : 'bg-white/40 border-zinc-200/50 shadow-zinc-200/50'}`}>
        <div
          className={`flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing select-none ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
          onMouseDown={handleDragStart}
        >
          <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {language === 'tr' ? `Paket İçeriği — Hop ${hopIndex + 1}` : `Packet Contents — Hop ${hopIndex + 1}`}
          </h3>
          <button
            onClick={onClose}
            className="w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
          >
            <X className="w-3 h-3 text-white pointer-events-none" />
          </button>
        </div>
        <div className={`px-4 py-3 space-y-2 text-xs font-mono ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>L2:</span> {p.layer2}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>L3:</span> {p.layer3}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>L4:</span> {p.layer4}</div>
          <div className={`border-t pt-2 mt-2 ${isDark ? 'border-white/10' : 'border-black/10'}`} />
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{language === 'tr' ? 'Kaynak IP' : 'Src IP'}:</span> {p.srcIp}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{language === 'tr' ? 'Hedef IP' : 'Dst IP'}:</span> {p.dstIp}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>TTL:</span> {p.ttl}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>MAC (Src):</span> {p.srcMac}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>MAC (Dst):</span> {p.dstMac}</div>
          <div><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>ICMP:</span> {p.icmpType} (Seq: {p.icmpSeq})</div>
        </div>
      </div>
    </div>
  );
}

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
}: NetworkTopologyProps) {
  const { language, t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isTR = language === 'tr';

  // Zustand store state - using granular selectors to prevent cascading re-renders
  const topologyDevices = useTopologyDevices();
  // BOLT: Memoize device map for O(1) lookups instead of repeated O(n) .find() calls
  const deviceMap = useMemo(() => {
    const map = new Map<string, CanvasDevice>();
    topologyDevices.forEach(d => map.set(d.id, d));
    return map;
  }, [topologyDevices]);

  const topologyConnections = useTopologyConnections();

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
  const { setDevices, setConnections, setNotes, graphicsQuality } = useAppStore();

  const devices = topologyDevices;
  const connections = topologyConnections;
  const notes = topologyNotes;

  // Sync state functions for local component logic
  const setDevicesState = setDevices;
  const setConnectionsState = setConnections;
  const setNotesState = setNotes;

  // Force re-render when deviceStates changes (for WiFi icon updates)
  const [, setDeviceStatesVersion] = useState(0);
  useEffect(() => {
    setTimeout(() => setDeviceStatesVersion(prev => prev + 1), 0);
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

  // Sync zoom and pan state from props (parent controls)
  useEffect(() => {
    if (zoomProp !== undefined && zoomProp !== zoom) {
      syncingZoomFromPropRef.current = true;
      setTimeout(() => setZoom(zoomProp), 0);
    }
  }, [zoomProp]);

  useEffect(() => {
    if (panProp !== undefined && (panProp.x !== pan.x || panProp.y !== pan.y)) {
      syncingPanFromPropRef.current = true;
      setTimeout(() => setPan(panProp), 0);
    }
  }, [panProp]);

  // Sync zoom and pan state to props (notify parent of internal changes)
  useEffect(() => {
    if (syncingZoomFromPropRef.current) {
      syncingZoomFromPropRef.current = false;
      return;
    }
    if (onZoomChange && zoom !== zoomProp) {
      onZoomChange(zoom);
    }
  }, [zoom, onZoomChange]);

  useEffect(() => {
    if (syncingPanFromPropRef.current) {
      syncingPanFromPropRef.current = false;
      return;
    }
    if (onPanChange && (pan.x !== panProp?.x || pan.y !== panProp?.y)) {
      onPanChange(pan);
    }
  }, [pan, onPanChange]);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>(activeDeviceId ? [activeDeviceId] : []);
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
  const [pingSource, setPingSource] = useState<CanvasDevice | null>(null);
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
    if (!isActive || canvasDimensions.width === 0) return { visibleDevices: devices, visibleConnections: connections, visibleNotes: notes };

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

    // Filter devices and connections using spatial partitioning results
    const vDevices = devices.filter(d => visibleDeviceIds.includes(d.id));
    const vConnections = connections.filter(c => visibleConnectionIds.includes(c.id));

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
      if (selectedDeviceIds.includes(a.id) && !selectedDeviceIds.includes(b.id)) return 1;
      if (!selectedDeviceIds.includes(a.id) && selectedDeviceIds.includes(b.id)) return -1;
      return 0;
    });
  }, [visibleDevices, activeDeviceId, selectedDeviceIds]);

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

  // Drag state with position tracking
  const [draggedDevice, setDraggedDevice] = useState<string | null>(null);
  const [_dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null);
  const [dragStartDevicePositions, setDragStartDevicePositions] = useState<{ [key: string]: { x: number, y: number } }>({});
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);

  // Drag performance - use ref for animation frame throttling
  const dragAnimationFrameRef = useRef<number | null>(null);
  const lastDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  // Ref to track if we were dragging (for click handler to check without stale closure)
  const wasDraggingRef = useRef(false);

  // Ref to track if shift key was pressed during mousedown
  const shiftKeyPressedRef = useRef(false);

  // ─── Performance refs: always hold latest values to avoid stale closures ───
  // These allow event handlers registered once (on mount) to always use fresh state
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
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMouseMoveTimeRef = useRef<number>(0);
  const lastMouseMovePosRef = useRef({ x: 0, y: 0 });

  // ─── Touch performance refs ───
  const isTouchDraggingRef = useRef(false);
  const touchDraggedDeviceRef = useRef<CanvasDevice | null>(null);
  const touchDragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchDragOffsetRef = useRef({ x: 0, y: 0 });
  const activePointerDragRef = useRef(false);

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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const cancelConnectionDrawing = useCallback(() => {
    isDrawingConnectionRef.current = false;
    connectionStartRef.current = null;
    setIsDrawingConnection(false);
    setConnectionStart(null);
  }, []);

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

  // Configuration state (Name, IP, etc.)
  const [configuringDevice, setConfiguringDevice] = useState<string | null>(null);
  const [tempNameValue, setTempNameValue] = useState('');
  const [ipValue, setIpValue] = useState('');
  const [subnetValue, setSubnetValue] = useState('');
  const [ipv6Value, setIpv6Value] = useState('');
  const [gatewayValue, setGatewayValue] = useState('');
  const [dnsValue, setDnsValue] = useState('');
  const [configError, setConfigError] = useState('');
  const configInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);


  // Touch/Mobile state
  const isMobile = useIsMobile();
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const isDraggingInteractionDisabled = isActuallyDragging || isTouchDragging;
  const [touchDraggedDevice, setTouchDraggedDevice] = useState<CanvasDevice | null>(null);
  const [touchDragStartPos, setTouchDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [touchDragOffset, setTouchDragOffset] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [_touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [lastTappedDevice, setLastTappedDevice] = useState<string | null>(null);

  // Advanced Canvas Pan/Zoom Touch state
  const [lastTouchCenter, setLastTouchCenter] = useState<{ x: number; y: number } | null>(null);

  // Ping and port selector state
  const [showPortSelector, setShowPortSelector] = useState(false);
  const [portSelectorStep, setPortSelectorStep] = useState<'source' | 'target'>('source');
  const [selectedSourcePort, setSelectedSourcePort] = useState<{ deviceId: string; portId: string } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
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
  } | null>(null);
  const [errorToast, setErrorToast] = useState<{ message: string; details?: string; type?: 'success' | 'error' } | null>(null);
  // Hop packet infos for the packet analysis panel
  const [hopPacketInfos, setHopPacketInfos] = useState<import('./PingPacketInfoPanel').HopPacketInfo[]>([]);
  const [packetPopupHop, setPacketPopupHop] = useState<number | null>(null);

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
  const deviceCounterRef = useRef<{ pc: number; iot: number; switch: number; router: number; firewall: number }>({ pc: 0, iot: 0, switch: 0, router: 0, firewall: 0 });
  const getCounterKey = useCallback((type: DeviceType | string): 'pc' | 'iot' | 'switch' | 'router' | 'firewall' => {
    if (type === 'switchL2' || type === 'switchL3' || type === 'switch') return 'switch';
    if (type === 'pc' || type === 'router' || type === 'firewall') return type as 'pc' | 'router' | 'firewall';
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

  // Added refs moved from below to avoid TDZ and sync issues
  const noteCounterRef = useRef<number>(0);
  const noteTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const lastStateRef = useRef<string>('');
  const topologyChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configuringDeviceData = useMemo(
    () => (configuringDevice ? deviceMap.get(configuringDevice) : null) || null,
    [configuringDevice, deviceMap]
  );

  const isValidIpv4 = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    const parts = trimmed.split('.');
    return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
  }, []);

  const isValidIpv6 = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Regex.test(trimmed);
  }, []);

  // Start device config (Name and IP)
  const startDeviceConfig = useCallback((deviceId: string) => {
    const device = deviceMap.get(deviceId);
    if (device) {
      setConfiguringDevice(deviceId);
      setTempNameValue(device.name);
      setIpValue(device.ip || '');
      setSubnetValue(device.subnet || '255.255.255.0');
      setIpv6Value(device.ipv6 || '');

      if (device.gateway) {
        setGatewayValue(device.gateway);
      } else {
        const ipParts = (device.ip || '192.168.1.10').split('.');
        ipParts[3] = '1';
        setGatewayValue(ipParts.join('.'));
      }

      setDnsValue(device.dns || '8.8.8.8');
      setConfigError('');

      setContextMenu(null);
      // Focus input after render
      setTimeout(() => configInputRef.current?.focus(), 0);
    }
  }, [devices]);

  // Cancel device config
  const cancelDeviceConfig = useCallback(() => {
    setConfiguringDevice(null);
    setTempNameValue('');
    setIpValue('');
    setSubnetValue('');
    setIpv6Value('');
    setGatewayValue('');
    setDnsValue('');
    setConfigError('');
  }, []);

  // Confirm device config
  const confirmDeviceConfig = useCallback(() => {
    if (!configuringDevice) return;
    const nextIp = ipValue.trim();
    const nextSubnet = subnetValue.trim();
    const nextGateway = gatewayValue.trim();
    const nextDns = dnsValue.trim();
    const nextIpv6 = ipv6Value.trim();

    if (!isValidIpv4(nextIp)) {
      setConfigError(t.invalidIpv4Address || 'Enter a valid IPv4 address.');
      return;
    }
    if (!isValidIpv4(nextSubnet)) {
      setConfigError(t.invalidSubnetMask);
      return;
    }
    if (!isValidIpv4(nextGateway)) {
      setConfigError(t.invalidGatewayAddress);
      return;
    }
    if (!isValidIpv4(nextDns)) {
      setConfigError(t.invalidDnsAddress);
      return;
    }
    if (!isValidIpv6(nextIpv6)) {
      setConfigError(t.invalidIpv6Address);
      return;
    }

    setConfigError('');

    saveToHistory();
    setDevices((prev) =>
      prev.map((d) =>
        d.id === configuringDevice
          ? {
            ...d,
            name: tempNameValue.trim() || d.name,
            ip: nextIp,
            subnet: nextSubnet,
            ipv6: nextIpv6,
            gateway: nextGateway,
            dns: nextDns
          }
          : d
      )
    );
    setConfiguringDevice(null);
    setTempNameValue('');
    setIpValue('');
    setSubnetValue('');
    setIpv6Value('');
    setGatewayValue('');
    setDnsValue('');
    setConfigError('');
  }, [configuringDevice, dnsValue, gatewayValue, ipValue, ipv6Value, isValidIpv4, isValidIpv6, language, saveToHistory, subnetValue, tempNameValue]);

  // Delete device and its connections
  const deleteDevice = useCallback((deviceId: string) => {
    if (isExamActive) return;
    saveToHistory();
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    setConnections((prev) =>
      prev.filter((c) => c.sourceDeviceId !== deviceId && c.targetDeviceId !== deviceId)
    );
    // Eğer kablo çizimi bu cihazdan başlamışsa iptal et
    setConnectionStart((prev) => {
      if (prev?.deviceId === deviceId) {
        setIsDrawingConnection(false);
        return null;
      }
      return prev;
    });
    if (onDeviceDelete) {
      onDeviceDelete(deviceId);
    }
  }, [saveToHistory, onDeviceDelete, isExamActive]);

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

  // Select all devices
  const selectAllDevices = useCallback(() => {
    const allIds = devices.map(d => d.id);
    setSelectedDeviceIds(allIds);
    setSelectAllMode(true);
    setContextMenu(null);
  }, [devices, setSelectAllMode]);

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

  const handleZoomWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.001; // Reverse direction and adjust sensitivity
    let newZoom = zoom + zoomDelta;

    // Clamp to min/max zoom
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    if (!canvasRef.current) {
      setZoom(newZoom);
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Keep the canvas point under the cursor fixed while zooming
    const canvasCursorX = (cursorX - pan.x) / zoom;
    const canvasCursorY = (cursorY - pan.y) / zoom;

    setPan({
      x: cursorX - canvasCursorX * newZoom,
      y: cursorY - canvasCursorY * newZoom
    });
  }, [zoom, pan]);


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
      if (isDrawingConnectionRef.current) {
        cancelConnectionDrawing();
      }

      const currentPan = panRef.current;
      const ps = { x: e.clientX - currentPan.x, y: e.clientY - currentPan.y };
      setPanStart(ps);
      panStartRef.current = ps;
      setIsPanning(true);
      isPanningRef.current = true;
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
    dragStartPosRef.current = dragStartPos;
    dragStartDevicePositionsRef.current = dragStartDevicePositions;
    isActuallyDraggingRef.current = isActuallyDragging;
    snapToGridRef.current = snapToGrid;
    isDrawingConnectionRef.current = isDrawingConnection;
    connectionStartRef.current = connectionStart;
    // eslint-disable-next-line react-hooks/immutability
    selectedDeviceIdsRef.current = selectedDeviceIds;
  }, [isPanning, panStart, zoom, pan, draggedDevice, dragStartPos, dragStartDevicePositions, isActuallyDragging, snapToGrid, isDrawingConnection, connectionStart, selectedDeviceIds]);

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

        // Throttle pan with RAF for smooth rendering
        if (panAnimationFrameRef.current !== null) return;
        const ps = panStartRef.current;
        panAnimationFrameRef.current = requestAnimationFrame(() => {
          setPan({ x: e.clientX - ps.x, y: e.clientY - ps.y });
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
          if (JSON.stringify(selectedIds) !== JSON.stringify(selectedDeviceIdsRef.current)) {
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
            const rect = canvasRectRef.current ?? canvasRef.current.getBoundingClientRect();
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

            setDevices(prev => {
              const newDevices = [...prev];
              let changed = false;

              const devicesToMove = currentSelectedIds.includes(currentDraggedDevice)
                ? currentSelectedIds
                : [currentDraggedDevice];

              devicesToMove.forEach(id => {
                const deviceIndex = newDevices.findIndex(d => d.id === id);
                if (deviceIndex === -1) return;

                const initialPos = currentStartPositions[id];
                if (!initialPos) return;

                let newX = initialPos.x + dx;
                let newY = initialPos.y + dy;

                if (currentSnapToGrid && ctrlKey) {
                  newX = Math.round(newX / 16) * 16;
                  newY = Math.round(newY / 16) * 16;
                }

                const clampedX = Math.max(20, Math.min(newX, canvasW - 100));
                const clampedY = Math.max(20, Math.min(newY, canvasH - 100));

                if (Math.abs(newDevices[deviceIndex].x - clampedX) > 0.1 || Math.abs(newDevices[deviceIndex].y - clampedY) > 0.1) {
                  newDevices[deviceIndex] = { ...newDevices[deviceIndex], x: clampedX, y: clampedY };
                  changed = true;
                }
              });

              return changed ? newDevices : prev;
            });

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
          setMousePos(newPos);
          mousePosAnimationFrameRef.current = null;
        });
      }
    };

    const handleMouseUp = (e: globalThis.MouseEvent) => {
      activePointerDragRef.current = false;

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
      setDraggedDevice(null);
      draggedDeviceRef.current = null;
      setDragStartPos(null);
      dragStartPosRef.current = null;

      // Eğer cihaz gerçekten sürüklendiyse ve kablo çizimi başlamışsa iptal et
      if (isActuallyDraggingRef.current && isDrawingConnectionRef.current) {
        setIsDrawingConnection(false);
        setConnectionStart(null);
      }

      setIsActuallyDragging(false);
      isActuallyDraggingRef.current = false;
      setDragStartDevicePositions({});
      lastDragPositionRef.current = null;

      // Reset cursor when drag ends
      document.body.style.cursor = '';
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') handleMouseMove(e as unknown as globalThis.MouseEvent);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') handleMouseUp(e as unknown as globalThis.MouseEvent);
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

    const rect = canvasRef.current.getBoundingClientRect();
    const device = deviceMap.get(deviceId);
    if (!device) return;

    // Ping mode: handle immediately on mousedown for better Chrome compatibility
    if (pingMode) {
      if (!pingSource) {
        // First click: select source
        setPingSource(device);
        setPingResult(null);
        return; // Don't proceed with drag/selection logic
      } else {
        // Second click: run ping immediately
        if (device.id === pingSource.id) return; // same device, ignore
        // Exit ping mode immediately, then run animation
        setPingMode(false);
        setPingSource(null);
        // Trigger full ping animation (includes connectivity check + toast)
        startPingAnimationRef.current?.(pingSource.id, device.id);
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
    // Update ref immediately so drag logic has correct positions without waiting for state
    dragStartDevicePositionsRef.current = initialPositions;
    setDragStartDevicePositions(initialPositions);

    // Store the starting position for distance calculation
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setIsActuallyDragging(false);
    isActuallyDraggingRef.current = false;
    draggedDeviceRef.current = deviceId;
    setDraggedDevice(deviceId);
    setDragOffset({
      x: (e.clientX - rect.left - pan.x) - device.x * zoom,
      y: (e.clientY - rect.top - pan.y) - device.y * zoom,
    });
  }, [devices, pan, zoom, selectedDeviceIds, onDeviceSelect, pingMode, pingSource]);

  const handleDevicePointerDown = useCallback((e: React.PointerEvent<SVGGElement>, deviceId: string) => {
    if (e.pointerType === 'mouse') return;

    e.preventDefault();
    e.stopPropagation();
    activePointerDragRef.current = true;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // SVG pointer capture can fail in older mobile browsers; global pointermove still handles drag.
    }

    handleDeviceMouseDown(e as unknown as ReactMouseEvent, deviceId);
  }, [handleDeviceMouseDown]);

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

    // Only handle selection if Shift was NOT pressed during mousedown
    setSelectedDeviceIds([device.id]);
    setSelectedNoteIds([]);
    // Notify parent component - select device, don't open terminal
    onDeviceSelect(device.type, device.id, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);
    // Focus canvas for keyboard navigation
    canvasRef.current?.focus();
  }, [onDeviceSelect, pingMode, pingSource, devices, connections, deviceStates, setContextMenu]);

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

  // Handle right-click context menu with viewport clamping
  const handleContextMenu = useCallback((e: ReactMouseEvent, deviceId?: string) => {
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
  }, [openContextMenu]);

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
    if (now - lastTapTime < 300 && lastTappedDevice === deviceId) {
      handleDeviceDoubleClick(device);
      setLastTapTime(0);
      setLastTappedDevice(null);
    } else {
      setLastTapTime(now);
      setLastTappedDevice(deviceId);
    }
  }, [devices, pan, zoom, longPressTimer, lastTapTime, lastTappedDevice, handleDeviceDoubleClick, selectedDeviceIds]);

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
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setIsPanning(true);
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });

      // Start long-press to open context menu
      const timer = setTimeout(() => {
        openContextMenu(touch.clientX, touch.clientY, null);
        setLongPressTimer(null);
        setIsPanning(false);
      }, LONG_PRESS_DURATION);
      setLongPressTimer(timer);
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      // Pinch start - track initial distance and center
      const a = e.touches[0];
      const b = e.touches[1];
      setLastTouchDistance(getDistance(a.clientX, a.clientY, b.clientX, b.clientY));
      setLastTouchCenter({
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2
      });
    }
  }, [longPressTimer, pan, getDistance]);

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    if (!canvasRef.current) return;
    const isDevice = (e.target as HTMLElement).closest('[data-device-id]') || false;
    if (isDevice) return;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      setPan({ x: touch.clientX - panStart.x, y: touch.clientY - panStart.y });
    } else if (e.touches.length === 2 && lastTouchDistance !== null && lastTouchCenter !== null) {
      const a = e.touches[0];
      const b = e.touches[1];

      const newDistance = getDistance(a.clientX, a.clientY, b.clientX, b.clientY);
      const newCenter = {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2
      };

      // Calculate zoom factor with smoothing
      const zoomFactor = newDistance / lastTouchDistance;
      let newZoom = zoom * zoomFactor;
      newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));

      if (Math.abs(newZoom - zoom) > 0.01) {
        // Adjust pan to zoom relative to the gesture center
        const rect = canvasRef.current.getBoundingClientRect();
        const cursorX = newCenter.x - rect.left;
        const cursorY = newCenter.y - rect.top;

        const deltaX = cursorX - (cursorX - pan.x) * (newZoom / zoom);
        const deltaY = cursorY - (cursorY - pan.y) * (newZoom / zoom);

        // Also add the pan movement of the center point itself
        const panDeltaX = newCenter.x - lastTouchCenter.x;
        const panDeltaY = newCenter.y - lastTouchCenter.y;

        setZoom(newZoom);
        setPan({ x: deltaX + panDeltaX, y: deltaY + panDeltaY });
      } else {
        // If zoom didn't change (hit limits), at least we can pan
        const panDeltaX = newCenter.x - lastTouchCenter.x;
        const panDeltaY = newCenter.y - lastTouchCenter.y;
        setPan(prev => ({ x: prev.x + panDeltaX, y: prev.y + panDeltaY }));
      }

      setLastTouchDistance(newDistance);
      setLastTouchCenter(newCenter);
    }
  }, [isPanning, panStart, longPressTimer, pan, zoom, lastTouchDistance, lastTouchCenter, getDistance]);

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
    } else if (touchesLength === 1) {
      // Revert to panning with one finger if the other is lifted
      const touch = (e as ReactTouchEvent).touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setLastTouchDistance(null);
      setLastTouchCenter(null);
    }
  }, [longPressTimer, pan]);

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
          if (selectedDeviceIds.length === 1) {
            const selectedDevice = deviceMap.get(selectedDeviceIds[0]);
            if (selectedDevice) {
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

      // Update cable info
      const sourceDevice = deviceMap.get(connectionStart.deviceId);
      const targetDevice = deviceMap.get(deviceId);
      if (sourceDevice && targetDevice) {
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
  }, [devices, isDrawingConnection, connectionStart, cableInfo, onCableChange, saveToHistory, language, t]);

  const generateUniqueLinkLocalIp = useCallback((reservedIps: string[] = []) => {
    const usedIps = new Set([
      ...devices.map((d) => d.ip).filter(Boolean),
      ...reservedIps.filter(Boolean),
    ]);
    return generateRandomLinkLocalIpv4(usedIps);
  }, [devices]);

  const generateUniqueLinkLocalIpv6 = useCallback((reservedIps: string[] = []) => {
    const usedIps = new Set([
      ...devices.map((d) => d.ipv6).filter(Boolean) as string[],
      ...reservedIps.filter(Boolean),
    ]);
    return generateRandomLinkLocalIpv6(usedIps);
  }, [devices]);

  const generateUniqueHostname = useCallback((baseName: string, reservedNames: string[] = []) => {
    const normalize = (value: string) => value.trim().toLowerCase();
    const usedNames = new Set<string>();

    devices.forEach((d) => usedNames.add(normalize(d.name)));
    deviceStates?.forEach((state) => {
      if (state?.hostname) {
        usedNames.add(normalize(state.hostname));
      }
    });
    reservedNames.forEach((name) => usedNames.add(normalize(name)));

    if (!usedNames.has(normalize(baseName))) return baseName;

    let suffix = 2;
    let candidate = `${baseName}-${suffix}`;
    while (usedNames.has(normalize(candidate))) {
      suffix++;
      candidate = `${baseName}-${suffix}`;
    }
    return candidate;
  }, [devices, deviceStates]);

  // Add device from palette button
  const addDevice = useCallback((type: 'pc' | 'iot' | 'switch' | 'router' | 'firewall', layer?: 'L2' | 'L3') => {
    if (isExamActive && !isExamEditorOpen) return;
    saveToHistory();
    deviceCounterRef.current[type]++;

    // Calculate position at the center of the current viewport
    let spawnX = 100 + Math.random() * 30;
    let spawnY = 80 + Math.random() * 30;

    if (canvasDimensions.width > 0 && canvasDimensions.height > 0) {
      // Adjust for device size roughly (estimate center)
      const estimatedDeviceWidth = getDeviceWidth(type);
      const estimatedDeviceHeight = getDeviceHeight(type, type === 'pc' || type === 'iot' ? 2 : 24);

      spawnX = (canvasDimensions.width / 2 - pan.x) / zoom - estimatedDeviceWidth / 2;
      spawnY = (canvasDimensions.height / 2 - pan.y) / zoom - estimatedDeviceHeight / 2;
    }

    // Determine switch layer (default L2)
    const switchLayer = layer || 'L2';
    const switchModel = switchLayer === 'L3' ? 'WS-C3650-24PS' : 'WS-C2960-24TT-L';
    const resolvedType = type === 'switch'
      ? (switchLayer === 'L3' ? 'switchL3' : 'switchL2')
      : type;

    const baseName =
      type === 'switch' && switchLayer === 'L3'
        ? `Switch-${deviceCounterRef.current[type]}`
        : `${type.toUpperCase()}-${deviceCounterRef.current[type]}`;

    const initialLinkLocalIp = (type === 'pc' || type === 'iot') ? generateUniqueLinkLocalIp() : '';
    const initialLinkLocalIpv6 = (type === 'pc' || type === 'iot') ? generateUniqueLinkLocalIpv6() : '';
    const newDevice: CanvasDevice = {
      id: `${type}-${deviceCounterRef.current[type]}`,
      type: resolvedType,
      name: generateUniqueHostname(baseName),
      macAddress: generateMacAddress(),
      ip: initialLinkLocalIp,
      ipv6: initialLinkLocalIpv6,
      subnet: (type === 'pc' || type === 'iot') ? '255.255.0.0' : undefined,
      gateway: (type === 'pc' || type === 'iot') ? '0.0.0.0' : undefined,
      dns: (type === 'pc' || type === 'iot') ? '0.0.0.0' : undefined,
      ipConfigMode: type === 'iot' ? 'dhcp' : undefined,
      // Positioned at center of viewport
      x: spawnX,
      y: spawnY,
      status: 'online',
      switchModel: type === 'switch' ? switchModel : undefined,
      ports:
        type === 'pc' || type === 'iot'
          ? [
            { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
            ...(type === 'pc' ? [{ id: 'com1', label: 'COM1', status: 'disconnected' as const }] : []),
          ]
          : type === 'switch'
            ? switchLayer === 'L3' ? generateL3SwitchPorts() : generateSwitchPorts()
            : type === 'firewall'
              ? [
                { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const },
                { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
              ]
              : generateRouterPorts(),
      iot: type === 'iot'
        ? { sensorType: 'temperature', collaborationEnabled: false, dataStore: '' }
        : undefined,
      wifi: type === 'iot'
        ? { enabled: true, ssid: '', security: 'open', password: '', channel: '2.4GHz', mode: 'client' }
        : (type === 'router' || (type === 'switch' && switchLayer === 'L3'))
          ? { enabled: false, ssid: 'Network-AP', security: 'open', password: '', channel: '2.4GHz', mode: 'ap' }
          : undefined,
    };
    setDevices((prev) => [...prev, newDevice]);
    setSelectedDeviceIds([newDevice.id]);
    // Pass the switchModel directly to avoid race condition
    onDeviceSelect(resolvedType, newDevice.id, newDevice.switchModel, newDevice.name, true, newDevice);

  }, [devices.length, saveToHistory, generateUniqueHostname, generateUniqueLinkLocalIp, generateUniqueLinkLocalIpv6, onDeviceSelect, canvasDimensions, pan, zoom, isExamActive, isExamEditorOpen]);

  // Note management functions
  const [noteClipboard, setNoteClipboard] = useState('');
  const [noteTextSelection, setNoteTextSelection] = useState<{ noteId: string; start: number; end: number } | null>(null);

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
    dragStartPosRef.current = dragStartPos;
    dragStartDevicePositionsRef.current = dragStartDevicePositions;
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
    dragStartPos,
    dragStartDevicePositions,
    isActuallyDragging,
    snapToGrid,
    isDrawingConnection,
    isTouchDragging,
    touchDraggedDevice,
    touchDragStartPos,
    touchDragOffset,
  ]);
  const getNextNoteId = useCallback(() => {
    const existingIds = new Set(latestNotesRef.current.map((n) => n.id));
    let next = noteCounterRef.current + 1;
    while (existingIds.has(`note-${next}`)) {
      next++;
    }
    noteCounterRef.current = next;
    return `note-${next}`;
  }, []);

  const addNote = useCallback(() => {
    saveToHistory();
    const newNote: CanvasNote = {
      id: getNextNoteId(),
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      width: 200,
      height: 150,
      text: t.newNote,
      color: '#fef3c7',
      font: 'Arial',
      fontSize: 12,
      opacity: 1,
    };
    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteIds([newNote.id]);
  }, [saveToHistory, language, getNextNoteId]);

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
    };
    const handleTogglePingMode = () => {
      setPingMode(m => !m);
      setPingSource(null);
      setPingResult(null);
    };
    const handleAddNote = () => addNote();

    window.addEventListener('add-device', handleAddDevice as EventListener);
    window.addEventListener('toggle-ping-mode', handleTogglePingMode as EventListener);
    window.addEventListener('add-note', handleAddNote as EventListener);
    return () => {
      window.removeEventListener('add-device', handleAddDevice as EventListener);
      window.removeEventListener('toggle-ping-mode', handleTogglePingMode as EventListener);
      window.removeEventListener('add-note', handleAddNote as EventListener);
    };
  }, [addDevice, addNote]);

  const deleteNote = useCallback((noteId: string) => {
    saveToHistory();
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setSelectedNoteIds((prev) => prev.filter((id) => id !== noteId));
  }, [saveToHistory]);

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

  const getNoteGradientFill = useCallback((color: string) => {
    const colorToGradientMap: Record<string, string> = {
      '#3b82f6': isDark ? 'url(#noteBlueDark)' : 'url(#noteBlueLight)',
      '#10b981': isDark ? 'url(#noteEmeraldDark)' : 'url(#noteEmeraldLight)',
      '#8b5cf6': isDark ? 'url(#noteVioletDark)' : 'url(#noteVioletLight)',
      '#f59e0b': isDark ? 'url(#noteAmberDark)' : 'url(#noteAmberLight)',
      '#ef4444': isDark ? 'url(#noteRedDark)' : 'url(#noteRedLight)',
      '#06b6d4': isDark ? 'url(#noteCyanDark)' : 'url(#noteCyanLight)',
      '#ec4899': isDark ? 'url(#notePinkDark)' : 'url(#notePinkLight)',
      '#f97316': isDark ? 'url(#noteOrangeDark)' : 'url(#noteOrangeLight)',
      '#84cc16': isDark ? 'url(#noteLimeDark)' : 'url(#noteLimeLight)',
      '#64748b': isDark ? 'url(#noteSlateDark)' : 'url(#noteSlateLight)',
      '#a78bfa': isDark ? 'url(#notePurpleDark)' : 'url(#notePurpleLight)',
      '#60a5fa': isDark ? 'url(#noteLightBlueDark)' : 'url(#noteLightBlueLight)',
      '#4ade80': isDark ? 'url(#noteLightGreenDark)' : 'url(#noteLightGreenLight)',
    };
    return colorToGradientMap[color] || color;
  }, [isDark]);

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

  const duplicateNote = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    saveToHistory();
    const duplicatedNote: CanvasNote = {
      ...note,
      id: getNextNoteId(),
      x: note.x + 20,
      y: note.y + 20,
    };
    setNotes((prev) => [...prev, duplicatedNote]);
    setSelectedNoteIds([duplicatedNote.id]);
    setSelectedDeviceIds([]);
  }, [saveToHistory, getNextNoteId]);

  const getNoteSelection = useCallback((noteId: string) => {
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!note) return null;

    const cachedSelection = noteTextSelection?.noteId === noteId ? noteTextSelection : null;
    const textarea = noteTextareaRefs.current[noteId];
    const start = cachedSelection?.start ?? textarea?.selectionStart ?? 0;
    const end = cachedSelection?.end ?? textarea?.selectionEnd ?? 0;
    const from = Math.max(0, Math.min(start, end));
    const to = Math.max(0, Math.max(start, end));

    return {
      note,
      start: from,
      end: to,
      selectedText: note.text.slice(from, to),
      hasSelection: to > from,
    };
  }, [noteTextSelection]);

  const updateNoteTextRange = useCallback((noteId: string, start: number, end: number, insertText: string) => {
    saveToHistory();
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        const safeStart = Math.max(0, Math.min(start, n.text.length));
        const safeEnd = Math.max(0, Math.min(end, n.text.length));
        return {
          ...n,
          text: `${n.text.slice(0, safeStart)}${insertText}${n.text.slice(safeEnd)}`
        };
      })
    );
  }, [saveToHistory]);

  const handleNoteTextCopy = useCallback(async (noteId: string) => {
    const textarea = noteTextareaRefs.current[noteId];
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!textarea || !note) return;

    const selection = getNoteSelection(noteId);
    if (!selection?.hasSelection) return;

    // Focus textarea ve seçili metni seç
    textarea.focus();
    textarea.setSelectionRange(selection.start, selection.end);

    setNoteClipboard(selection.selectedText);
    try {
      await navigator.clipboard.writeText(selection.selectedText);
    } catch (err) {
      errorHandler.logError(CLIPBOARD_ERRORS.COPY_FAILED({ noteId, contentLength: selection.selectedText.length, error: String(err) }));
    }
  }, [getNoteSelection]);

  const handleNoteTextCut = useCallback(async (noteId: string) => {
    const textarea = noteTextareaRefs.current[noteId];
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!textarea || !note) return;

    const selection = getNoteSelection(noteId);
    if (!selection?.hasSelection) return;

    // Focus textarea ve seçili metni seç
    textarea.focus();
    textarea.setSelectionRange(selection.start, selection.end);

    setNoteClipboard(selection.selectedText);
    try {
      await navigator.clipboard.writeText(selection.selectedText);
    } catch (err) {
      errorHandler.logError(CLIPBOARD_ERRORS.COPY_FAILED({ noteId, contentLength: selection.selectedText.length, operation: 'cut', error: String(err) }));
    }
    updateNoteTextRange(noteId, selection.start, selection.end, '');
    setNoteTextSelection(null);
  }, [getNoteSelection, updateNoteTextRange]);

  const handleNoteTextDelete = useCallback((noteId: string) => {
    const textarea = noteTextareaRefs.current[noteId];
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!textarea || !note) return;

    const selection = getNoteSelection(noteId);
    if (!selection?.hasSelection) return;

    // Focus textarea ve seçili metni seç
    textarea.focus();
    textarea.setSelectionRange(selection.start, selection.end);

    updateNoteTextRange(noteId, selection.start, selection.end, '');
    setNoteTextSelection(null);
  }, [getNoteSelection, updateNoteTextRange]);

  const handleNoteTextPaste = useCallback(async (noteId: string) => {
    const textarea = noteTextareaRefs.current[noteId];
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!textarea || !note) return;

    // Focus textarea
    textarea.focus();

    const selection = getNoteSelection(noteId);
    if (!selection) return;

    let pastedText = '';
    try {
      pastedText = await navigator.clipboard.readText();
    } catch (err) {
      errorHandler.logError(CLIPBOARD_ERRORS.PASTE_FAILED({ noteId, fallbackUsed: true, error: String(err) }));
      pastedText = noteClipboard;
    }

    if (!pastedText) return;
    updateNoteTextRange(noteId, selection.start, selection.end, pastedText);
    setNoteTextSelection({
      noteId,
      start: selection.start + pastedText.length,
      end: selection.start + pastedText.length,
    });
  }, [getNoteSelection, noteClipboard, updateNoteTextRange]);

  const handleNoteTextSelectAll = useCallback((noteId: string) => {
    const textarea = noteTextareaRefs.current[noteId];
    const note = latestNotesRef.current.find((n) => n.id === noteId);
    if (!textarea || !note) return;

    textarea.focus();
    textarea.setSelectionRange(0, note.text.length);
    setNoteTextSelection({
      noteId,
      start: 0,
      end: note.text.length,
    });
  }, []);

  // Handle note header drag start
  const handleNoteHeaderMouseDown = useCallback((e: ReactMouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    saveToHistory();
    setDraggedNoteId(noteId);
    setNoteDragStart({ x: e.clientX, y: e.clientY });
    setSelectedNoteIds([noteId]);
  }, [notes, saveToHistory, setSelectedNoteIds]);

  // Handle note header touch start (mobile)
  const handleNoteHeaderTouchStart = useCallback((e: React.TouchEvent, noteId: string) => {
    e.stopPropagation();
    if (!canvasRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    saveToHistory();
    setDraggedNoteId(noteId);
    setNoteDragStart({ x: touch.clientX, y: touch.clientY });
    setSelectedNoteIds([noteId]);
  }, [notes, saveToHistory, setSelectedNoteIds]);

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

          if (dir.includes('e')) newW = Math.max(150, origW + dx);
          if (dir.includes('w')) { newW = Math.max(150, origW - dx); newX = resizeStart.noteX + (origW - newW); }
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

          if (dir.includes('e')) newW = Math.max(150, origW + dx);
          if (dir.includes('w')) { newW = Math.max(150, origW - dx); newX = resizeStart.noteX + (origW - newW); }
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
    }, 0);
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

  const showDeviceTooltip = useCallback((deviceId: string) => {
    const device = deviceMap.get(deviceId);
    if (!device) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect?.();
    if (!canvasRect) return;

    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const deviceWidth = getDeviceWidth(device.type);
    const x = canvasRect.left + device.x * currentZoom + currentPan.x + deviceWidth * currentZoom / 2;
    const y = canvasRect.top + device.y * currentZoom + currentPan.y;

    setDeviceTooltip({
      deviceId,
      x,
      y,
      visible: true,
    });
  }, [devices, setDeviceTooltip]);

  const handleDeviceHover = useCallback((deviceId: string) => {
    if (isDrawingConnection || draggedDevice || isPanning || isSelecting || isActuallyDragging || isTouchDragging || selectedDeviceIds.length > 1) return;
    showDeviceTooltip(deviceId);
  }, [showDeviceTooltip, isDrawingConnection, draggedDevice, isPanning, isSelecting, isActuallyDragging, isTouchDragging, selectedDeviceIds]);

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
      const counters = { pc: 0, iot: 0, switch: 0, router: 0, firewall: 0 };
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


  // Delete connection
  const deleteConnection = useCallback((connectionId: string) => {
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
  }, [connections, saveToHistory, devices]);

  // Reset view
  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    if (devices.length === 0 && notes.length === 0) {
      setPan({ x: 0, y: 0 });
      return;
    }

    const padding = 10;
    const minDeviceX = devices.length ? Math.min(...devices.map(d => d.x)) : Infinity;
    const minDeviceY = devices.length ? Math.min(...devices.map(d => d.y)) : Infinity;
    const minNoteX = notes.length ? Math.min(...notes.map(n => n.x)) : Infinity;
    const minNoteY = notes.length ? Math.min(...notes.map(n => n.y)) : Infinity;

    const minX = Math.min(minDeviceX, minNoteX);
    const minY = Math.min(minDeviceY, minNoteY);

    setPan({ x: padding - minX * DEFAULT_ZOOM, y: padding - minY * DEFAULT_ZOOM });
    window.scrollTo(0, 0);
  }, [devices, notes]);

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
  }, []);

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

        // Ctrl+Z to undo
        if (key === 'z') {
          e.preventDefault();
          handleUndo();
        }

        // Ctrl+Y to redo
        if (key === 'y') {
          e.preventDefault();
          handleRedo();
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
      if (!isEditable && key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
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

  // Find path between devices using BFS
  const findPath = useCallback((sourceId: string, targetId: string): string[] | null => {
    if (sourceId === targetId) return [sourceId];

    const visited = new Set<string>();
    const queue: { deviceId: string; path: string[] }[] = [{ deviceId: sourceId, path: [sourceId] }];
    visited.add(sourceId);

    while (queue.length > 0) {
      const current = queue.shift() as { deviceId: string; path: string[] };

      // Find all connected devices
      for (const conn of connections) {
        // Only allow data path cables: Ethernet (straight/crossover) and WiFi (wireless)
        if (conn.cableType !== 'straight' && conn.cableType !== 'crossover' && conn.cableType !== 'wireless') continue;

        let nextDeviceId: string | null = null;
        let sourcePortId: string | null = null;
        let targetPortId: string | null = null;

        if (conn.sourceDeviceId === current.deviceId && !visited.has(conn.targetDeviceId)) {
          nextDeviceId = conn.targetDeviceId;
          sourcePortId = conn.sourcePort;
          targetPortId = conn.targetPort;
        } else if (conn.targetDeviceId === current.deviceId && !visited.has(conn.sourceDeviceId)) {
          nextDeviceId = conn.sourceDeviceId;
          sourcePortId = conn.targetPort;
          targetPortId = conn.sourcePort;
        }

        if (nextDeviceId && sourcePortId && targetPortId) {
          const sourceDevice = deviceMap.get(current.deviceId);
          const targetDevice = deviceMap.get(nextDeviceId);

          if (sourceDevice && targetDevice) {
            // Check if devices are powered on
            const sourceIsOffline = sourceDevice.status === 'offline';
            const targetIsOffline = targetDevice.status === 'offline';

            if (sourceIsOffline || targetIsOffline) {
              // Cannot traverse through powered off devices
              continue;
            }

            // Check if cable is compatible
            const isCompatible = isCableCompatible({
              connected: true,
              cableType: conn.cableType,
              sourceDevice: sourceDevice.type,
              targetDevice: targetDevice.type,
              sourcePort: conn.sourcePort,
              targetPort: conn.targetPort,
            });

            // Check if both ports are NOT shutdown
            const sPort = sourceDevice.ports.find(p => p.id === sourcePortId);
            const tPort = targetDevice.ports.find(p => p.id === targetPortId);
            const isUp = sPort && !sPort.shutdown && tPort && !tPort.shutdown;

            // Check if either port is STP blocked
            const sourceState = deviceStates?.get(current.deviceId);
            const targetState = deviceStates?.get(nextDeviceId);
            const sourceSimPort = sourceState?.ports?.[sourcePortId];
            const targetSimPort = targetState?.ports?.[targetPortId];
            const isSourceSTPBlocked = sourceSimPort?.spanningTree?.state === 'blocking' || sourceSimPort?.spanningTree?.role === 'alternate';
            const isTargetSTPBlocked = targetSimPort?.spanningTree?.state === 'blocking' || targetSimPort?.spanningTree?.role === 'alternate';
            const isSTPBlocked = isSourceSTPBlocked || isTargetSTPBlocked;

            if (isCompatible && isUp && !isSTPBlocked) {
              const newPath = [...current.path, nextDeviceId];

              if (nextDeviceId === targetId) {
                return newPath;
              }

              visited.add(nextDeviceId);
              queue.push({ deviceId: nextDeviceId, path: newPath });
            }
          }
        }
      }
    }

    return null; // No path found
  }, [connections, devices]);

  // Cancel active ping due to external interruption (device power off, connection lost, etc.)
  const cancelPingDueToInterruption = useCallback((reasonMessage: string) => {
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
    setErrorToast({
      message: isTR ? 'Ping başarısız!' : 'Ping failed!',
      details: reasonMessage
    });
  }, [isTR]);

  // Keep ref updated for RAF closures
  useLayoutEffect(() => {
    cancelPingDueToInterruptionRef.current = cancelPingDueToInterruption;
  }, [cancelPingDueToInterruption]);

  // Ping animation between devices with multi-hop support
  const startPingAnimation = useCallback((sourceId: string, targetId: string) => {
    // Cancel any existing animation
    if (pingAnimationRef.current) {
      cancelAnimationFrame(pingAnimationRef.current);
    }

    // Cancel any existing cleanup timeout to prevent it from cancelling the new ping
    if (pingCleanupTimeoutRef.current) {
      clearTimeout(pingCleanupTimeoutRef.current);
      pingCleanupTimeoutRef.current = null;
    }

    // Clear previous ping state to avoid conflicts
    setPingAnimation(null);
    setErrorToast(null);

    const getDevicePrimaryIp = (deviceId: string): string => {
      const device = deviceMap.get(deviceId);
      if (device?.ip) return device.ip;
      if (device?.ipv6) return device.ipv6;

      const state = deviceStates?.get(deviceId);
      if (!state) return '';

      for (const port of Object.values(state.ports)) {
        if (port.ipAddress) return port.ipAddress;
        if (port.ipv6Address) return port.ipv6Address;
      }

      return '';
    };

    // Validate source device IP
    const sourceIp = getDevicePrimaryIp(sourceId);
    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F:]{1,4}$/i; // Basic IPv6 check
    const isIpValid = (ip: string) => ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip.includes(':');

    const isSourceIpValid = isIpValid(sourceIp);

    // Validate target device IP
    const targetIp = getDevicePrimaryIp(targetId);
    const isTargetIpValid = isIpValid(targetIp);

    // Check if both IPs are valid
    if (!isSourceIpValid || !isTargetIpValid) {
      const errorMessage = !isSourceIpValid
        ? (isTR ? 'Kaynak cihazın IP adresi geçersiz' : 'Source device IP is invalid')
        : (isTR ? 'Hedef cihazın IP adresi geçersiz' : 'Target device IP is invalid');

      setPingAnimation({
        sourceId,
        targetId,
        path: [sourceId, targetId],
        currentHopIndex: 0,
        progress: 1,
        success: false,
        frame: 0,
        error: errorMessage,
        hopCount: 0
      });

      setErrorToast({
        message: isTR ? 'Ping başarısız!' : 'Ping failed!',
        details: errorMessage
      });

      pingCleanupTimeoutRef.current = setTimeout(() => { setPingAnimation(null); setPingMode(false); }, 3000);
      return;
    }

    // Get detailed diagnostics - Using ICMP for standard ping animation
    const diagnostics = getPingDiagnostics(sourceId, targetIp, devices, connections, deviceStates, language, { protocol: 'icmp' });

    const connectivity = checkDeviceConnectivity(sourceId, targetId, devices, connections, deviceStates, { protocol: 'icmp' });
    if (!connectivity.success) {
      const errorMessage = diagnostics.reasons.length > 0
        ? diagnostics.reasons[0]
        : (isTR ? 'Ping başarısız' : 'Ping failed');

      // Use partial path if available (animate to where it fails), else just source
      const partialPath = (connectivity.hopIds && connectivity.hopIds.length >= 1)
        ? connectivity.hopIds
        : [sourceId];
      pingPathRef.current = partialPath;

      const packetInfos = buildHopPacketInfos(partialPath, devices, connections, 64, targetIp);
      setHopPacketInfos(packetInfos);

      pingIsPausedRef.current = true;
      pingStepModeRef.current = false;
      setPingAnimation({
        sourceId,
        targetId,
        path: partialPath,
        currentHopIndex: 0,
        progress: 0,
        success: false,
        frame: 0,
        error: errorMessage,
        hopCount: 0,
        isPaused: true,
        showPacketPanel: true,
        failedAtHop: Math.max(0, partialPath.length - 2),
      });

      // Store resume callback — animation will run to the last reachable hop then stop with error
      const runFailedAnimation = () => {
        let startTime = Date.now();
        let currentHop = 0;
        let frameCount = 0;

        const hopDuration = 1500;

        // Animate failed - last know[n] good position
        const animateFailed = () => {
          // Update resume callback at the start of each frame
          pingResumeCallbackRef.current = () => {
            startTime = Date.now();
            pingAnimationRef.current = requestAnimationFrame(animateFailed);
          };

          if (pingIsPausedRef.current) return;

          // Check if any device in the path has been turned off during animation
          if (partialPath.some(id => {
            const d = latestDevicesRef.current.find(dd => dd.id === id);
            return !d || d.status === 'offline';
          })) {
            cancelPingDueToInterruptionRef.current(isTR ? 'Cihaz kapatıldığı için ping iptal edildi.' : 'Ping cancelled because a device was powered off.');
            return;
          }

          const fromId = partialPath[currentHop];
          const toId = partialPath[currentHop + 1];
          if (!toId) {
            // Reached end of partial path — show error
            flushSync(() => {
              setPingAnimation(prev => prev ? { ...prev, success: false, isPaused: false } : null);
            });
            setErrorToast({ message: isTR ? 'Ping başarısız!' : 'Ping failed!', details: errorMessage });
            // Panel stays open — user closes it manually
            setPingMode(false);
            return;
          }
          const failedSegConn = latestConnectionsRef.current.find(c =>
            (c.sourceDeviceId === fromId && c.targetDeviceId === toId) ||
            (c.sourceDeviceId === toId && c.targetDeviceId === fromId)
          );
          if (!failedSegConn || failedSegConn.active === false) {
            if (!isWirelessHop(fromId, toId)) {
              cancelPingDueToInterruptionRef.current(isTR ? 'Bağlantı koptuğu için ping iptal edildi.' : 'Ping cancelled because a connection was lost.');
              return;
            }
          }
          const fromDev = deviceMap.get(fromId);
          const toDev = deviceMap.get(toId);
          const dx = (toDev?.x ?? 0) - (fromDev?.x ?? 0);
          const dy = (toDev?.y ?? 0) - (fromDev?.y ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const dur = Math.min(hopDuration * Math.max(1, dist / 200), 3000);

          const elapsed = Date.now() - startTime;
          const rawProgress = Math.min(elapsed / dur, 1);
          const progress = easeInOutCubic(rawProgress);
          frameCount++;

          if (progress < 1) {
            flushSync(() => {
              setPingAnimation(prev => prev ? { ...prev, currentHopIndex: currentHop, progress, frame: frameCount } : null);
            });
            pingAnimationRef.current = requestAnimationFrame(animateFailed);
          } else {
            if (currentHop < partialPath.length - 2) {
              currentHop++;
              startTime = Date.now();
              const shouldPause = pingIsPausedRef.current || pingStepModeRef.current;
              flushSync(() => {
                setPingAnimation(prev => prev ? { ...prev, currentHopIndex: currentHop, progress: 0, frame: frameCount, isPaused: shouldPause } : null);
              });
              if (!shouldPause) {
                pingAnimationRef.current = requestAnimationFrame(animateFailed);
              } else {
                // Only set paused if we're not in step mode (step mode will be handled by handlePingNext)
                if (!pingStepModeRef.current) {
                  pingIsPausedRef.current = true;
                }
                pingResumeCallbackRef.current = () => { startTime = Date.now(); pingAnimationRef.current = requestAnimationFrame(animateFailed); };
              }
            } else {
              // Last reachable hop — show failure
              flushSync(() => {
                setPingAnimation(prev => prev ? { ...prev, currentHopIndex: currentHop, progress: 1, frame: frameCount, success: false, isPaused: false } : null);
              });
              setErrorToast({ message: isTR ? 'Ping başarısız!' : 'Ping failed!', details: errorMessage });
              // Panel stays open — user closes it manually
              setPingMode(false);
            }
          }
        };
        pingAnimationRef.current = requestAnimationFrame(animateFailed);
      };

      pingResumeCallbackRef.current = runFailedAnimation;
      return;
    }

    // Find path between source and target
    const path = connectivity.hopIds;
    pingPathRef.current = path;

    if (!path || path.length < 2) {
      const errorMessage = isTR ? 'Fiziksel bağlantı yok' : 'No physical connection';
      setHopPacketInfos([]);
      setPingAnimation({
        sourceId,
        targetId,
        path: [sourceId],
        currentHopIndex: 0,
        progress: 0,
        success: false,
        frame: 0,
        error: errorMessage,
        hopCount: 0,
        isPaused: false,
        showPacketPanel: true,
      });
      setErrorToast({ message: isTR ? 'Ping başarısız!' : 'Ping failed!', details: errorMessage });
      pingCleanupTimeoutRef.current = setTimeout(() => { setPingAnimation(null); setPingMode(false); setErrorToast(null); }, 3000);
      return;
    }

    // Build packet infos for all hops upfront
    const packetInfos = buildHopPacketInfos(path, devices, connections, 64, targetIp);
    setHopPacketInfos(packetInfos);

    // Start ping animation — begin PAUSED so the packet panel is visible immediately
    pingIsPausedRef.current = true;
    pingStepModeRef.current = false;
    setPingAnimation({
      sourceId,
      targetId,
      path,
      currentHopIndex: 0,
      progress: 0,
      success: null,
      frame: 0,
      hopCount: 0,
      isPaused: true,
      showPacketPanel: true,
    });

    // Clear any previous error toast
    setErrorToast(null);

    // Animate ping - dynamic duration based on cable distance
    const hopDuration = 1500; // Base duration
    let startTime = Date.now();
    let currentHop = 0;
    let frameCount = 0;

    // Helper: detect wireless hop (persisted or implicit WiFi)
    const isWirelessHop = (fromId: string, toId: string): boolean => {
      const conn = connections.find(c =>
        (c.sourceDeviceId === fromId && c.targetDeviceId === toId) ||
        (c.sourceDeviceId === toId && c.targetDeviceId === fromId)
      );
      if (conn?.cableType === 'wireless') return true;
      // Implicit wireless: IoT/PC ↔ Router/Switch via WiFi (not in persisted connections)
      const fromDev = deviceMap.get(fromId);
      const toDev = deviceMap.get(toId);
      if (!fromDev || !toDev) return false;
      const isClient = (t: string | undefined) => t === 'pc' || t === 'iot';
      const isInfra = (t: string | undefined) => t === 'router' || t === 'switchL2' || t === 'switchL3';
      return (isClient(fromDev.type) && isInfra(toDev.type)) ||
        (isClient(toDev.type) && isInfra(fromDev.type));
    };

    // Calculate distance-based duration for stable animation on long cables
    const calculateHopDuration = (fromId: string, toId: string): number => {
      const fromDevice = deviceMap.get(fromId);
      const toDevice = deviceMap.get(toId);

      if (!fromDevice || !toDevice) return hopDuration;

      const isWifi = isWirelessHop(fromId, toId);

      if (isWifi) {
        // For WiFi hops: use the weaker signal of the two endpoints
        // Exponential slowdown matching ping ms logic: 0px→fast, 549px→slow
        const srcDist = getWirelessDistance(fromDevice, devices, deviceStates);
        const dstDist = getWirelessDistance(toDevice, devices, devices ? deviceStates : undefined);
        // Use the larger distance (weaker signal dominates)
        const effectiveDist = Math.max(
          srcDist === Infinity ? 0 : srcDist,
          dstDist === Infinity ? 0 : dstDist
        );
        // Map 0px→800ms, 549px→3000ms using exponential curve
        const wifiBase = 800 * Math.exp(effectiveDist / 200);
        return Math.min(wifiBase, 3000);
      }

      // Wired: scale by pixel distance and port speed
      const conn = connections.find(c =>
        (c.sourceDeviceId === fromId && c.targetDeviceId === toId) ||
        (c.sourceDeviceId === toId && c.targetDeviceId === fromId)
      );
      const getPortSpeed = (deviceId: string, portId: string | undefined): number => {
        if (!portId) return 100;
        const st = deviceStates?.get(deviceId);
        const port = st?.ports?.[portId];
        if (!port?.speed || port.speed === 'auto') return 100;
        return parseInt(port.speed, 10) || 100;
      };
      const srcSpeed = getPortSpeed(fromId, conn?.sourceDeviceId === fromId ? conn?.sourcePort : conn?.targetPort);
      const dstSpeed = getPortSpeed(toId, conn?.sourceDeviceId === toId ? conn?.sourcePort : conn?.targetPort);
      const linkSpeed = Math.min(srcSpeed, dstSpeed);
      const speedFactor = linkSpeed >= 1000 ? 0.75 : linkSpeed >= 100 ? 1 : linkSpeed >= 10 ? 1.5 : 1;
      const dx = toDevice.x - fromDevice.x;
      const dy = toDevice.y - fromDevice.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const baseDistance = 200;
      const scaleFactor = Math.max(1, distance / baseDistance);
      return Math.min(hopDuration * scaleFactor * speedFactor, 3000);
    };

    // Smooth easing function for fluent animation
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const advanceToNextHop = (hopCountIncrement: number) => {
      if (currentHop < path.length - 1) {
        const nextFromId = path[currentHop + 1];
        const nextToId = path[currentHop + 2];
        if (nextFromId && nextToId) {
          const nextSegConn = latestConnectionsRef.current.find(c =>
            (c.sourceDeviceId === nextFromId && c.targetDeviceId === nextToId) ||
            (c.sourceDeviceId === nextToId && c.targetDeviceId === nextFromId)
          );
          if ((!nextSegConn || nextSegConn.active === false) && !isWirelessHop(nextFromId, nextToId)) {
            cancelPingDueToInterruptionRef.current(isTR ? 'Bağlantı koptuğu için ping iptal edildi.' : 'Ping cancelled because a connection was lost.');
            return;
          }
        }
        currentHop++;
        startTime = Date.now();
        // Pause at hop boundary if: explicitly paused OR in step mode
        const shouldPause = pingIsPausedRef.current || pingStepModeRef.current;
        flushSync(() => {
          setPingAnimation(prev => {
            if (!prev) return null;
            return {
              ...prev,
              currentHopIndex: currentHop,
              progress: 0,
              frame: frameCount,
              hopCount: prev.hopCount + hopCountIncrement,
              isPaused: shouldPause,
            };
          });
        });
        if (!shouldPause) {
          pingAnimationRef.current = requestAnimationFrame(animate);
        } else {
          // Always mark as paused so handlePingNext / handlePingPlay can detect it
          pingIsPausedRef.current = true;
          // Store resume callback so play/next button can continue
          pingResumeCallbackRef.current = () => {
            startTime = Date.now();
            pingAnimationRef.current = requestAnimationFrame(animate);
          };
        }
      } else {
        // Last forward segment done — start return animation (Echo Reply)
        const returnPath = [...path].reverse();
        const returnPacketInfos = buildHopPacketInfos(returnPath, devices, connections, 64, sourceIp);

        // Keep step mode if it was active during forward path
        // pingStepModeRef.current = false;
        // pingIsPausedRef.current = false;

        // Brief pause at destination before returning
        setTimeout(() => {
          let returnHop = 0;
          let returnStartTime = Date.now();
          let returnFrameCount = frameCount;

          setPingAnimation(prev => {
            if (!prev) return null;
            return {
              ...prev,
              path: returnPath,
              currentHopIndex: 0,
              progress: 0,
              hopCount: prev.hopCount + hopCountIncrement,
              isPaused: pingStepModeRef.current, // Pause if in step mode
              isReturn: true,
            };
          });
          setHopPacketInfos(returnPacketInfos);

          const finishSuccess = () => {
            setPingAnimation(prev => prev ? { ...prev, success: true, isPaused: false } : null);
            // Panel stays open — user closes it manually via the X button
            setPingMode(false);
          };

          const animateReturn = () => {
            // Update resume callback at the start of each frame
            pingResumeCallbackRef.current = () => {
              returnStartTime = Date.now();
              pingAnimationRef.current = requestAnimationFrame(animateReturn);
            };

            if (pingIsPausedRef.current) return;

            // Check if any device in return path has been powered off during animation
            if (returnPath.some(id => {
              const d = latestDevicesRef.current.find(dd => dd.id === id);
              return !d || d.status === 'offline';
            })) {
              cancelPingDueToInterruptionRef.current(isTR ? 'Cihaz kapatıldığı için ping iptal edildi.' : 'Ping cancelled because a device was powered off.');
              return;
            }

            const fromId = returnPath[returnHop];
            const toId = returnPath[returnHop + 1];

            // No more hops — done
            if (!toId) {
              finishSuccess();
              return;
            }
            const returnSegConn = latestConnectionsRef.current.find(c =>
              (c.sourceDeviceId === fromId && c.targetDeviceId === toId) ||
              (c.sourceDeviceId === toId && c.targetDeviceId === fromId)
            );
            if (!returnSegConn || returnSegConn.active === false) {
              if (!isWirelessHop(fromId, toId)) {
                cancelPingDueToInterruptionRef.current(isTR ? 'Bağlantı koptuğu için ping iptal edildi.' : 'Ping cancelled because a connection was lost.');
                return;
              }
            }

            const dur = calculateHopDuration(fromId, toId);
            const elapsed = Date.now() - returnStartTime;
            const rawP = Math.min(elapsed / dur, 1);
            const prog = easeInOutCubic(rawP);
            returnFrameCount++;

            if (prog < 1) {
              flushSync(() => {
                setPingAnimation(prev => prev ? { ...prev, currentHopIndex: returnHop, progress: prog, frame: returnFrameCount } : null);
              });
              pingAnimationRef.current = requestAnimationFrame(animateReturn);
            } else {
              // Snap to end
              flushSync(() => {
                setPingAnimation(prev => prev ? { ...prev, currentHopIndex: returnHop, progress: 1, frame: returnFrameCount } : null);
              });

              if (returnHop < returnPath.length - 2) {
                // More return hops
                returnHop++;
                returnStartTime = Date.now();
                const shouldPause = pingIsPausedRef.current || pingStepModeRef.current;
                flushSync(() => {
                  setPingAnimation(prev => prev ? { ...prev, currentHopIndex: returnHop, progress: 0, frame: returnFrameCount, isPaused: shouldPause } : null);
                });
                if (!shouldPause) {
                  pingAnimationRef.current = requestAnimationFrame(animateReturn);
                } else {
                  // Always mark as paused so handlePingNext / handlePingPlay can detect it
                  pingIsPausedRef.current = true;
                  // Store resume callback for next step
                  pingResumeCallbackRef.current = () => {
                    returnStartTime = Date.now();
                    pingAnimationRef.current = requestAnimationFrame(animateReturn);
                  };
                }
              } else {
                // Last return hop done
                finishSuccess();
              }
            }
          };

          // Start return animation paused if in step mode
          if (pingStepModeRef.current) {
            pingIsPausedRef.current = true;
            pingResumeCallbackRef.current = () => {
              returnStartTime = Date.now();
              pingAnimationRef.current = requestAnimationFrame(animateReturn);
            };
          } else {
            pingAnimationRef.current = requestAnimationFrame(animateReturn);
          }
        }, 300);
      }
    };

    const animate = () => {
      // Update resume callback at the start of each frame
      pingResumeCallbackRef.current = () => {
        startTime = Date.now();
        pingAnimationRef.current = requestAnimationFrame(animate);
      };

      // If paused, don't advance
      if (pingIsPausedRef.current) return;

      // Check if any device in path has been powered off during animation
      if (path.some(id => {
        const d = latestDevicesRef.current.find(dd => dd.id === id);
        return !d || d.status === 'offline';
      })) {
        cancelPingDueToInterruptionRef.current(isTR ? 'Cihaz kapatıldığı için ping iptal edildi.' : 'Ping cancelled because a device was powered off.');
        return;
      }

      // Check if the current connection segment is still active
      const currentFromId = path[currentHop];
      const currentToId = path[currentHop + 1];
      if (currentToId) {
        const segmentConn = latestConnectionsRef.current.find(c =>
          (c.sourceDeviceId === currentFromId && c.targetDeviceId === currentToId) ||
          (c.sourceDeviceId === currentToId && c.targetDeviceId === currentFromId)
        );
        if (!segmentConn || segmentConn.active === false) {
          // Connection not found in persisted connections — check if this is an
          // implicit wireless hop (IoT/PC ↔ Router/Switch via WiFi), which is
          // dynamically generated in checkConnectivity but not stored in state
          if (!isWirelessHop(currentFromId, currentToId)) {
            cancelPingDueToInterruptionRef.current(isTR ? 'Bağlantı koptuğu için ping iptal edildi.' : 'Ping cancelled because a connection was lost.');
            return;
          }
        }
      }

      const fromId = path[currentHop];
      const toId = path[currentHop + 1];
      const currentHopDuration = calculateHopDuration(fromId, toId);

      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / currentHopDuration, 1);
      const progress = easeInOutCubic(rawProgress);
      frameCount++;

      if (progress < 1) {
        flushSync(() => {
          setPingAnimation(prev => {
            if (!prev) return null;
            return { ...prev, currentHopIndex: currentHop, progress, frame: frameCount };
          });
        });
        pingAnimationRef.current = requestAnimationFrame(animate);
      } else {
        const fromId = path[currentHop];
        const toId = path[currentHop + 1];

        const isWifi = isWirelessHop(fromId, toId);
        const toDev = deviceMap.get(toId);
        const isRouter = toDev?.type === 'router';
        const currentSegmentHopCountIncrement = (isWifi || isRouter) ? 1 : 0;

        // Snap to end of this segment
        flushSync(() => {
          setPingAnimation(prev => {
            if (!prev) return null;
            return { ...prev, currentHopIndex: currentHop, progress: 1, frame: frameCount };
          });
        });

        advanceToNextHop(currentSegmentHopCountIncrement);
      }
    };

    // Store the first hop's start callback so Play/Next can kick it off
    // (animation starts paused, so we don't call requestAnimationFrame directly)
    pingResumeCallbackRef.current = () => {
      startTime = Date.now();
      pingAnimationRef.current = requestAnimationFrame(animate);
    };
  }, [connections, deviceStates, devices, findPath]);

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
      const pcStartY = 99 / 2 - ((device.ports.length - 1) * pcPortSpacing) / 2;
      return {
        x: device.x + deviceWidth - 8,
        y: device.y + pcStartY + portIndex * pcPortSpacing
      };
    }

    const portSpacing = PORT_SPACING;
    const rowSpacing = PORT_SPACING;
    const startX = PORT_START_X;
    const startY = PORT_START_Y;

    return {
      x: device.x + startX + col * portSpacing,
      y: device.y + startY + row * rowSpacing
    };
  }, [getDeviceCenter]);

  // Render connection interaction handles (Trash Icon) - Should be rendered LAST to stay on top
  const renderConnectionHandle = (conn: CanvasConnection) => {
    const sourceDevice = deviceMap.get(conn.sourceDeviceId);
    const targetDevice = deviceMap.get(conn.targetDeviceId);
    if (!sourceDevice || !targetDevice) return null;

    const source = getPortPosition(sourceDevice, conn.sourcePort);
    const target = getPortPosition(targetDevice, conn.targetPort);

    // BOLT: Optimized lookup for parallel connection metadata
    const meta = connectionMeta.get(conn.id) || { index: 0, total: 1 };
    const sameConnIndex = meta.index;
    const totalSameConns = meta.total;

    const offset = totalSameConns > 1
      ? (sameConnIndex - (totalSameConns - 1) / 2) * (20 / Math.max(totalSameConns - 1, 1))
      : 0;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const midX = (source.x + target.x) / 2;
    const perpX = -dy / len * offset;
    const perpY = dx / len * offset;

    const controlPoint1 = {
      x: midX + perpX,
      y: source.y + perpY + Math.abs(offset) * 0.5
    };
    const controlPoint2 = {
      x: midX + perpX,
      y: target.y + perpY - Math.abs(offset) * 0.5
    };

    // Position trash icon in the center of the connection
    const tTrash = 0.5;
    const invT = 1 - tTrash;
    const trashX = invT * invT * invT * source.x +
      3 * invT * invT * tTrash * controlPoint1.x +
      3 * invT * tTrash * tTrash * controlPoint2.x +
      tTrash * tTrash * tTrash * target.x;
    const trashY = invT * invT * invT * source.y +
      3 * invT * invT * tTrash * controlPoint1.y +
      3 * invT * tTrash * tTrash * controlPoint2.y +
      tTrash * tTrash * tTrash * target.y;

    const isCompatible = conn.cableType === 'console'
      ? isCableCompatible({
        connected: true,
        cableType: conn.cableType,
        sourceDevice: sourceDevice.type,
        targetDevice: targetDevice.type,
        sourcePort: conn.sourcePort,
        targetPort: conn.targetPort,
      })
      : true;

    return (
      <g key={`handle-${conn.id}`}>
        {/* Larger Hit Area */}
        <path
          d={`M ${source.x} ${source.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${target.x} ${target.y}`}
          stroke="transparent"
          strokeWidth={22}
          fill="none"
          className="cursor-pointer"
          onClick={() => deleteConnection(conn.id)}
        />

        {/* Delete Handle (Trash Icon) */}
        {isCompatible && (
          <g
            transform={`translate(${trashX}, ${trashY})`}
            className="cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              deleteConnection(conn.id);
            }}
          >
            <rect x="-8" y="-8" width="15" height="15" rx="5" fill={isDark ? '#0f172a' : '#ffffff'} opacity="0.92" className="drop-shadow-sm" />
            <Trash2 className="w-4 h-4 text-red-500" width={15} height={15} style={{ transform: 'translate(-8px, -8px)' }} />
          </g>
        )}

        {/* Warning Icon if incompatible */}
        {!isCompatible && (
          <g
            transform={`translate(${midX + perpX}, ${(source.y + target.y) / 2 + perpY})`}
            className="cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              deleteConnection(conn.id);
            }}
          >
            <path d="M 0 -9 L -10 7 L 10 7 Z" fill="#ef4444" stroke="#fff" strokeWidth="1" />
            <text y="4" fontSize="10" fontStyle="normal" fontWeight="bold" fill="white" textAnchor="middle">!</text>
          </g>
        )}
      </g>
    );
  };

  const isSwitchDevice = (t: CanvasDevice['type']) => t === 'switchL2' || t === 'switchL3';

  // Render device
  const renderDevice = (device: CanvasDevice, isDragging: boolean = false) => {
    const isSelected = selectedDeviceIds.includes(device.id);
    // Check if device has any connections
    const deviceConnections = connections.filter(c => c.sourceDeviceId === device.id || c.targetDeviceId === device.id);
    const hasConnection = deviceConnections.length > 0;
    const hasError = deviceConnections.some(conn => {
      const source = deviceMap.get(conn.sourceDeviceId);
      const target = deviceMap.get(conn.targetDeviceId);
      if (!source || !target) return false;
      return conn.cableType === 'console'
        ? !isCableCompatible({
          connected: true,
          cableType: conn.cableType,
          sourceDevice: source.type,
          targetDevice: target.type,
          sourcePort: conn.sourcePort,
          targetPort: conn.targetPort,
        })
        : false;
    });

    const isPoweredOff = device.status === 'offline';
    const isPcLike = device.type === 'pc' || device.type === 'iot';
    const statusColor = isPoweredOff
      ? (isDark ? 'fill-red-500' : 'fill-red-600')
      : hasError
        ? (isDark ? 'fill-red-500' : 'fill-red-600')
        : (hasConnection ? (isDark ? 'fill-green-500' : 'fill-green-600') : (isDark ? 'fill-slate-800' : 'fill-slate-300'));

    const deviceFill = isDark
      ? (device.type === 'iot'
        ? 'url(#iotGradientDark)'
        : device.type === 'firewall'
          ? 'url(#firewallGradientDark)'
          : isPcLike
            ? 'url(#pcGradientDark)'
            : isSwitchDevice(device.type)
              ? 'url(#switchGradientDark)'
              : 'url(#routerGradientDark)')
      : (device.type === 'iot'
        ? 'url(#iotGradientLight)'
        : device.type === 'firewall'
          ? 'url(#firewallGradientLight)'
          : isPcLike
            ? 'url(#pcGradientLight)'
            : isSwitchDevice(device.type)
              ? 'url(#switchGradientLight)'
              : 'url(#routerGradientLight)');

    // Calculate device height based on number of ports (8 per row for switch/router)
    const portsPerRow = isPcLike ? 2 : 8;
    const numRows = Math.ceil(device.ports.length / portsPerRow);
    const deviceHeight = isPcLike ? 85 : 80 + numRows * 14 + 5;

    // Calculate device width to fit all ports with proper spacing
    // For switch/router: startX=12, portSpacing=13, portRadius=6
    // Width needed = startX + (portsPerRow - 1) * portSpacing + portRadius + margin
    // For 8 ports: 12 + 7*13 + 6 + 10 = 119, so we use 130 for more breathing room
    const deviceWidth = getDeviceWidth(device.type);
    const iconColor = isPoweredOff
      ? STATUS_COLORS.offline
      : (hasConnection
        ? (isSwitchDevice(device.type) && device.switchModel === 'WS-C3650-24PS' ? '#a855f7' : STATUS_COLORS.online)
        : (device.type === 'pc'
          ? '#3b82f6'
          : device.type === 'iot'
            ? '#f97316'
            : isSwitchDevice(device.type)
              ? (device.switchModel === 'WS-C3650-24PS' ? '#a855f7' : STATUS_COLORS.online)
              : '#a855f7'));
    const isIotEffectivelyOn = device.type === 'iot' &&
      device.status !== 'offline' &&
      device.iot?.collaborationEnabled !== false &&
      device.iot?.value === true;
    const iotGlowColor = isIotEffectivelyOn
      ? (device.iot?.kind === 'lamp'
        ? '#facc15'
        : device.iot?.kind === 'cooler'
          ? '#38bdf8'
          : device.iot?.kind === 'heater'
            ? '#ef4444'
            : null)
      : null;

    return (
      <g
        key={device.id}
        transform={`translate(${device.x}, ${device.y})`}
        className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isDragging ? 'opacity-80' : ''}`}
        data-device-id={device.id}
      >
        {/* Selection glow effect */}
        {isSelected && (
          <>
            <defs>
              <filter id="selectionGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f97316" floodOpacity="0.50" />
              </filter>
            </defs>
            {device.type === 'firewall' ? (
              <>
                <path d={`M 6 -4 L ${deviceWidth - 6} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 6 L ${deviceWidth + 4} ${deviceHeight - 11} L ${deviceWidth / 2} ${deviceHeight + 4} L -4 ${deviceHeight - 11} L -4 6 Q -4 -4 6 -4 Z`} fill="none" stroke="#f97316" strokeWidth="4" opacity="0.5" filter="url(#selectionGlowFilter)" className="selection-glow" />
                <path d={`M 6 -4 L ${deviceWidth - 6} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 6 L ${deviceWidth + 4} ${deviceHeight - 11} L ${deviceWidth / 2} ${deviceHeight + 4} L -4 ${deviceHeight - 11} L -4 6 Q -4 -4 6 -4 Z`} fill="none" stroke="#f97316" strokeWidth="2" opacity="0.35" className="selection-glow-outer" />
              </>
            ) : device.type === 'router' ? (
              <>
                <path d={`M ${16} -4 L ${deviceWidth - 16} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 16 L ${deviceWidth + 4} ${deviceHeight + 4} L -4 ${deviceHeight + 4} L -4 16 Q -4 -4 16 -4`} fill="none" stroke="#f97316" strokeWidth="4" opacity="0.5" filter="url(#selectionGlowFilter)" className="selection-glow" />
                <path d={`M ${16} -4 L ${deviceWidth - 16} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 16 L ${deviceWidth + 4} ${deviceHeight + 4} L -4 ${deviceHeight + 4} L -4 16 Q -4 -4 16 -4`} fill="none" stroke="#f97316" strokeWidth="2" opacity="0.35" className="selection-glow-outer" />
              </>
            ) : device.type === 'iot' ? (
              <>
                {device.iot?.sensorType === 'motion' && (
                  <circle
                    cx={deviceWidth / 2}
                    cy={deviceHeight / 2}
                    r={75}
                    fill={isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)'}
                    stroke={isDark ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.2)'}
                    strokeWidth="1"
                    strokeDasharray="4 2"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <path d={`M -4 -4 L ${deviceWidth + 4 - 10} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 6 L ${deviceWidth + 4} ${deviceHeight + 4} L 6 ${deviceHeight + 4} Q -4 ${deviceHeight + 4} -4 ${deviceHeight + 4 - 10} L -4 -4 Z`} fill="none" stroke="#f97316" strokeWidth="4" opacity="0.5" filter="url(#selectionGlowFilter)" className="selection-glow" />
                <path d={`M -4 -4 L ${deviceWidth + 4 - 10} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 6 L ${deviceWidth + 4} ${deviceHeight + 4} L 6 ${deviceHeight + 4} Q -4 ${deviceHeight + 4} -4 ${deviceHeight + 4 - 10} L -4 -4 Z`} fill="none" stroke="#f97316" strokeWidth="2" opacity="0.35" className="selection-glow-outer" />
              </>
            ) : isSwitchDeviceType(device.type) ? (
              <>
                <path d={`M -4 -4 L ${deviceWidth + 4} -4 L ${deviceWidth + 4} ${deviceHeight + 4 - 10} Q ${deviceWidth + 4} ${deviceHeight + 4} ${deviceWidth + 4 - 10} ${deviceHeight + 4} L 6 ${deviceHeight + 4} Q -4 ${deviceHeight + 4} -4 ${deviceHeight + 4 - 10} L -4 -4 Z`} fill="none" stroke="#f97316" strokeWidth="4" opacity="0.5" filter="url(#selectionGlowFilter)" className="selection-glow" />
                <path d={`M -4 -4 L ${deviceWidth + 4} -4 L ${deviceWidth + 4} ${deviceHeight + 4 - 10} Q ${deviceWidth + 4} ${deviceHeight + 4} ${deviceWidth + 4 - 10} ${deviceHeight + 4} L 6 ${deviceHeight + 4} Q -4 ${deviceHeight + 4} -4 ${deviceHeight + 4 - 10} L -4 -4 Z`} fill="none" stroke="#f97316" strokeWidth="2" opacity="0.35" className="selection-glow-outer" />
              </>
            ) : (
              <>
                <rect x="-4" y="-4" width={deviceWidth + 8} height={deviceHeight + 8} rx={10} fill="none" stroke="#f97316" strokeWidth="4" opacity="0.5" filter="url(#selectionGlowFilter)" className="selection-glow" />
                <rect x="-4" y="-4" width={deviceWidth + 8} height={deviceHeight + 8} rx={10} fill="none" stroke="#f97316" strokeWidth="2" opacity="0.35" className="selection-glow-outer" />
              </>
            )}
          </>
        )}

        {/* Radius indicator for motion/sound sensors */}
        {device.type === 'iot' && device.status !== 'offline' && device.iot?.collaborationEnabled !== false && (
          <>
            {device.iot?.sensorType === 'motion' && (
              <>
                <circle
                  cx={deviceWidth / 2}
                  cy={deviceHeight / 2}
                  r={75}
                  fill={isDark ? 'rgba(6, 182, 212, 0.05)' : 'rgba(6, 182, 212, 0.05)'}
                  stroke={isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)'}
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  style={{ pointerEvents: 'none' }}
                />
                {graphicsQuality === 'high' && device.iot?.value === true && (
                  <>
                    <circle
                      cx={deviceWidth / 2}
                      cy={deviceHeight / 2}
                      r={20}
                      fill="none"
                      stroke={isDark ? 'rgba(6, 182, 212, 0.6)' : 'rgba(6, 182, 212, 0.5)'}
                      strokeWidth="2"
                      className="iot-motion-ping"
                      style={{ pointerEvents: 'none', transformOrigin: `${deviceWidth / 2}px ${deviceHeight / 2}px` }}
                    />
                    <circle
                      cx={deviceWidth / 2}
                      cy={deviceHeight / 2}
                      r={20}
                      fill="none"
                      stroke={isDark ? 'rgba(6, 182, 212, 0.4)' : 'rgba(6, 182, 212, 0.3)'}
                      strokeWidth="2"
                      className="iot-motion-ping-delayed"
                      style={{ pointerEvents: 'none', transformOrigin: `${deviceWidth / 2}px ${deviceHeight / 2}px` }}
                    />
                  </>
                )}
              </>
            )}
            {device.iot?.sensorType === 'sound' && (
              <>
                {(() => {
                  const dBValue = typeof device.iot?.value === 'number' ? device.iot.value : 0;
                  const radius = Math.min(150, 50 + (dBValue / 120) * 100);
                  const opacity = 0.1 + (dBValue / 120) * 0.3;

                  return (
                    <circle
                      cx={deviceWidth / 2}
                      cy={deviceHeight / 2}
                      r={radius}
                      fill={isDark ? `rgba(34, 197, 94, ${opacity * 0.5})` : `rgba(34, 197, 94, ${opacity * 0.3})`}
                      stroke={isDark ? `rgba(34, 197, 94, ${opacity})` : `rgba(34, 197, 94, ${opacity * 0.8})`}
                      strokeWidth="1"
                      strokeDasharray="4 2"
                      className={graphicsQuality === 'high' ? 'iot-sound-pulse' : ''}
                      style={{ pointerEvents: 'none', ...(graphicsQuality === 'high' ? { transformOrigin: `${deviceWidth / 2}px ${deviceHeight / 2}px` } : {}) }}
                    />
                  );
                })()}
              </>
            )}
          </>
        )}


        {device.type === 'iot' && iotGlowColor && (
          <path
            d={`M -6 -6 L ${deviceWidth + 6 - 10} -6 Q ${deviceWidth + 6} -6 ${deviceWidth + 6} 8 L ${deviceWidth + 6} ${deviceHeight + 6} L 8 ${deviceHeight + 6} Q -6 ${deviceHeight + 6} -6 ${deviceHeight + 6 - 10} L -6 -6 Z`}
            fill="none"
            stroke={iotGlowColor}
            strokeWidth="7"
            opacity={isSelected ? 0.4 : 0.7}
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${iotGlowColor}) drop-shadow(0 100px 112px ${iotGlowColor})` }}
          />
        )}

        {/* Device body */}
        {device.type === 'firewall' ? (
          <>
            <defs>
              <filter id="deviceShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="2" dy="3" stdDeviation="3" floodOpacity={isDark ? "0.3" : "0.2"} />
              </filter>
            </defs>
            <path
              d={`M 10 0 L ${deviceWidth - 10} 0 Q ${deviceWidth} 0 ${deviceWidth} 10 L ${deviceWidth} ${deviceHeight - 15} L ${deviceWidth / 2} ${deviceHeight} L 0 ${deviceHeight - 15} L 0 10 Q 0 0 10 0 Z`}
              fill={deviceFill}
              stroke={isDark ? '#ef4444' : '#cbd5e1'}
              strokeWidth={1.5}
              className={isDragging ? '' : 'transition-all duration-150'}
              filter="url(#deviceShadow)"
            />
            {/* Shield Icon inside Firewall device */}
            <g transform={`translate(${deviceWidth / 2 - 17}, ${deviceHeight / 2 - 40})`} filter="url(#deviceShadow)">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#ea7171' : '#e75c5c'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </g>
          </>
        ) : device.type === 'router' ? (
          <path
            d={`M ${20} 0 L ${deviceWidth - 20} 0 Q ${deviceWidth} 0 ${deviceWidth} 20 L ${deviceWidth} ${deviceHeight} L 0 ${deviceHeight} L 0 20 Q 0 0 20 0`}
            fill={deviceFill}
            stroke={isDark ? '#a855f7' : '#cbd5e1'}
            strokeWidth={1.5}
            className={isDragging ? '' : 'transition-all duration-150'}
            filter="url(#deviceShadow)"
          />
        ) : device.type === 'iot' ? (
          <path
            d={`M 0 0 L ${deviceWidth - 8} 0 Q ${deviceWidth} 0 ${deviceWidth} 8 L ${deviceWidth} ${deviceHeight} L 8 ${deviceHeight} Q 0 ${deviceHeight} 0 ${deviceHeight - 8} L 0 0 Z`}
            fill={deviceFill}
            stroke={isDark ? '#f97316' : '#cbd5e1'}
            strokeWidth={1.5}
            className={isDragging ? '' : 'transition-all duration-150'}
            filter="url(#deviceShadow)"
          />
        ) : isSwitchDeviceType(device.type) ? (
          <path
            d={`M 0 0 L ${deviceWidth} 0 L ${deviceWidth} ${deviceHeight - 8} Q ${deviceWidth} ${deviceHeight} ${deviceWidth - 8} ${deviceHeight} L 8 ${deviceHeight} Q 0 ${deviceHeight} 0 ${deviceHeight - 8} L 0 0 Z`}
            fill={deviceFill}
            stroke={isDark ? '#22c55e' : '#cbd5e1'}
            strokeWidth={1.5}
            className={isDragging ? '' : 'transition-all duration-150'}
            filter="url(#deviceShadow)"
          />
        ) : (
          <rect
            width={deviceWidth}
            height={deviceHeight}
            rx={8}
            fill={deviceFill}
            stroke={isDark
              ? (device.type === 'pc' ? '#3b82f6' : device.type === 'iot' ? '#f97316' : device.type === 'firewall' ? '#ef4444' : isSwitchDeviceType(device.type) ? '#22c55e' : '#a855f7')
              : '#cbd5e1'}
            strokeWidth={1.5}
            className={isDragging ? '' : 'transition-all duration-150'}
            filter="url(#deviceShadow)"
          />
        )}
        {/* Device body highlight for 3D effect in dark mode */}
        {isDark && (
          device.type === 'firewall' ? (
            <path
              d={`M 2 5 Q 2 2 5 2 L ${deviceWidth - 5} 2 Q ${deviceWidth - 2} 2 ${deviceWidth - 2} 5 L ${deviceWidth - 2} ${deviceHeight / 3} L 2 ${deviceHeight / 3} Z`}
              fill="white"
              opacity="0.08"
            />
          ) : device.type === 'router' ? (
            <path
              d={`M ${22} 2 L ${deviceWidth - 22} 2 Q ${deviceWidth - 2} 2 ${deviceWidth - 2} 20 L ${deviceWidth - 2} ${deviceHeight / 3} L 2 ${deviceHeight / 3} L 2 20 Q 2 2 22 2`}
              fill="white"
              opacity="0.08"
            />
          ) : device.type === 'iot' ? (
            <path
              d={`M 2 2 L ${deviceWidth - 2 - 6} 2 Q ${deviceWidth - 2} 2 ${deviceWidth - 2} 8 L ${deviceWidth - 2} ${deviceHeight / 3} L 8 ${deviceHeight / 3} Q 2 ${deviceHeight / 3} 2 ${deviceHeight / 3 - 6} L 2 2 Z`}
              fill="white"
              opacity="0.08"
            />
          ) : isSwitchDeviceType(device.type) ? (
            <path
              d={`M 2 2 L ${deviceWidth - 2} 2 L ${deviceWidth - 2} ${deviceHeight / 3} L 2 ${deviceHeight / 3} L 2 2 Z`}
              fill="white"
              opacity="0.08"
            />
          ) : (
            <rect
              x={2}
              y={2}
              width={deviceWidth - 4}
              height={deviceHeight / 3}
              rx={6}
              fill="white"
              opacity="0.08"
            />
          )
        )}

        {/* WiFi Status Icon */}
        {(() => {
          const wlanPort = device.ports.find(p => p.id === 'wlan0');
          const pcWifi = device.wifi;
          const isPC = isPcLike;
          const isSwitchL3 = device.type === 'switchL3'; // Only L3 switches have WiFi (not L2)
          const isRouter = device.type === 'router';
          const devState = deviceStates?.get(device.id);
          const wlanState = devState?.ports['wlan0'];

          let wifiColor = '#94a3b8'; // Grey (Off)
          const showWifi = isPC || isSwitchL3 || isRouter;

          // Check if WiFi is enabled
          let isEnabled = false;
          if (isPC) {
            isEnabled = pcWifi?.enabled || (wlanState ? (normalizeWifiMode(wlanState.wifi?.mode) !== 'disabled') : false);
          } else if (isSwitchL3 || isRouter) {
            // Enhanced check for switch/router even if port is not in visual ports list
            const resolvedWifiMode = normalizeWifiMode(wlanState?.wifi?.mode);
            isEnabled = wlanState
              ? (resolvedWifiMode === 'disabled' ? false : !wlanState.shutdown)
              : (wlanPort ? !wlanPort.shutdown : false);
          }

          if (showWifi) {
            let isConnected = false;
            let connectedDevices = 0;

            if (!isEnabled || device.status === 'offline') {
              wifiColor = isDark ? '#475569' : '#94a3b8'; // Grey
            } else {
              if (isPC && deviceStates) {
                // PC/IoT: check if SSID matches an active AP wlan0 on another device
                const pcSsid = pcWifi?.ssid || wlanState?.wifi?.ssid || '';
                const pcPass = pcWifi?.password || wlanState?.wifi?.password || '';
                const pcSecurity = pcWifi?.security || wlanState?.wifi?.security || 'open';
                const pcBssid = pcWifi?.bssid;
                if (pcSsid) {
                  deviceStates.forEach((state, stateId) => {
                    if (stateId === device.id) return;
                    const apWlan = state.ports['wlan0'];
                    if (!apWlan || apWlan.shutdown || apWlan.wifi?.mode !== 'ap') return;
                    if (pcBssid && pcBssid !== stateId) return; // Must match specific bssid if set
                    if (apWlan.wifi?.ssid !== pcSsid) return;
                    const apSecurity = apWlan.wifi?.security || 'open';
                    if (apSecurity !== pcSecurity) return;
                    if (apSecurity !== 'open' && apWlan.wifi?.password !== pcPass) return;
                    isConnected = true;
                  });
                }
              } else if ((isSwitchL3 || isRouter) && deviceStates) {
                // Switch acting as AP: check if any PC is associated to this device
                const apSsid = wlanState?.wifi?.ssid || '';
                const apPass = wlanState?.wifi?.password || '';
                const apSecurity = wlanState?.wifi?.security || 'open';
                if (apSsid && normalizeWifiMode(wlanState?.wifi?.mode) === 'ap') {
                  devices.forEach(otherDev => {
                    if (otherDev.id === device.id || (otherDev.type !== 'pc' && otherDev.type !== 'iot')) return;
                    const pcwifi = otherDev.wifi;
                    const otherState = deviceStates.get(otherDev.id);
                    const otherWlan = otherState?.ports['wlan0'];
                    const clientSsid = pcwifi?.ssid || otherWlan?.wifi?.ssid || '';
                    const clientPass = pcwifi?.password || otherWlan?.wifi?.password || '';
                    const clientSecurity = pcwifi?.security || otherWlan?.wifi?.security || 'open';
                    const clientBssid = pcwifi?.bssid;
                    if ((!clientBssid || clientBssid === device.id) && clientSsid === apSsid && clientSecurity === apSecurity && (apSecurity === 'open' || apPass === clientPass)) {
                      isConnected = true;
                    }
                  });
                }
              }
              wifiColor = isConnected || connectedDevices > 0 ? '#22c55e' : '#f59e0b'; // Green or Orange
            }

            // Prepare WiFi info for tooltip
            let wifiSsid = '';
            let wifiSecurity = 'open';
            let wifiMode = 'disabled';
            let wifiChannel = '';
            const currentWifiIp = wlanState?.ipAddress || device.ip || '';

            if (isPC) {
              wifiSsid = pcWifi?.ssid || wlanState?.wifi?.ssid || '';
              wifiSecurity = pcWifi?.security || wlanState?.wifi?.security || 'open';
              wifiMode = normalizeWifiMode(wlanState?.wifi?.mode || (pcWifi?.enabled ? 'client' : 'disabled'));
              wifiChannel = wlanState?.wifi?.channel?.toString() || '';
            } else if (isSwitchL3 || isRouter) {
              wifiSsid = wlanState?.wifi?.ssid || '';
              wifiSecurity = wlanState?.wifi?.security || 'open';
              wifiMode = wlanState?.wifi?.mode === 'client'
                ? 'ap'
                : normalizeWifiMode(wlanState?.wifi?.mode);
              wifiChannel = wlanState?.wifi?.channel?.toString() || '';

              // Count connected devices (PC and IoT)
              if (wifiMode === 'ap' && deviceStates && wifiSsid) {
                const apPass = wlanState?.wifi?.password || '';
                devices.forEach(otherDev => {
                  if (otherDev.id === device.id || (otherDev.type !== 'pc' && otherDev.type !== 'iot')) return;
                  const pcwifi = otherDev.wifi;
                  const otherWlan = deviceStates.get(otherDev.id)?.ports['wlan0'];
                  const clientSsid = pcwifi?.ssid || otherWlan?.wifi?.ssid || '';
                  const clientSecurity = pcwifi?.security || otherWlan?.wifi?.security || 'open';
                  const clientPass = pcwifi?.password || otherWlan?.wifi?.password || '';
                  const clientBssid = pcwifi?.bssid;
                  if ((!clientBssid || clientBssid === device.id) && clientSsid === wifiSsid && clientSecurity === wifiSecurity && (wifiSecurity === 'open' || apPass === clientPass)) {
                    connectedDevices++;
                  }
                });
              }
            }

            const getStatusText = () => {
              if (device.status === 'offline') return t.deviceOff;
              if (!isEnabled) return t.wifiOff;
              if (isConnected) return t.connected;
              return t.on;
            };

            const getModeText = () => {
              if (wifiMode === 'ap') return t.wifiAp;
              if (wifiMode === 'client') return t.wifiClient;
              return t.off;
            };

            const getSecurityText = () => {
              if (wifiSecurity === 'wpa3') return 'WPA3';
              if (wifiSecurity === 'wpa2') return 'WPA2';
              if (wifiSecurity === 'wpa') return 'WPA';
              return t.on;
            };

            const getStatusColor = () => {
              if (device.status === 'offline' || !isEnabled) return 'text-red-500';
              if (isConnected) return 'text-green-500';
              return 'text-orange-500';
            };

            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <g
                    transform="translate(2, 0) scale(0.9)"
                    filter="url(#wifiIconShadow)"
                    style={{ cursor: 'pointer' }}
                    aria-label={language === 'tr' ? 'WiFi durumu' : 'WiFi status'}
                  >
                    {/* Invisible rect for easier hover */}
                    <rect x="0" y="5" width="24" height="20" fill="transparent" />
                    {(() => {
                      const signalStrength = isPC
                        ? getWirelessSignalStrength(device, devices, deviceStates)
                        : (isEnabled ? 3 : 0); // AP devices show full signal when enabled

                      const dimColor = isDark ? '#334155' : '#cbd5e1';
                      const arc1Color = signalStrength >= 1 ? wifiColor : dimColor;
                      const arc2Color = signalStrength >= 2 ? wifiColor : dimColor;
                      const arc3Color = signalStrength >= 3 ? wifiColor : dimColor;

                      return (
                        <>
                          <path d="M5 10.55a11 11 0 0 1 14.08 0"
                            stroke={arc3Color} fill="none" strokeWidth="1" strokeLinecap="round"
                            className="transition-colors duration-300" />
                          <path d="M8.53 13.11a6 6 0 0 1 6.95 0"
                            stroke={arc2Color} fill="none" strokeWidth="1" strokeLinecap="round"
                            className="transition-colors duration-300" />
                          <circle cx="12" cy="16" r="1"
                            fill={arc1Color} className="transition-colors duration-300" />
                        </>
                      );
                    })()}
                  </g>
                </TooltipTrigger>
                {!isDraggingInteractionDisabled && !(isPanning || isSelecting || isDrawingConnection) && (
                  <TooltipContent
                    hideArrow
                    className="p-0 bg-transparent border-none shadow-none"
                    sideOffset={8}
                  >
                    <div
                      className={`relative px-3 py-2 rounded-xl shadow-2xl border backdrop-blur-md ${isDark
                        ? 'bg-slate-900/90 border-slate-700 text-white shadow-cyan-500/10'
                        : 'bg-white/90 border-slate-200 text-slate-900 shadow-slate-200/50'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${device.status === 'offline' || !isEnabled
                          ? 'bg-red-500'
                          : isConnected
                            ? 'bg-green-500'
                            : 'bg-orange-500'
                          }`} />
                        <span className="text-[10px] font-black tracking-widest opacity-30">
                          WIFI
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold">
                          {t.statusLabel}{' '}
                          <span className={getStatusColor()}>
                            {getStatusText()}
                          </span>
                        </div>
                        {wifiSsid && (
                          <div className="text-xs font-bold">
                            SSID:{' '}
                            <span className="text-cyan-500">{wifiSsid}</span>
                          </div>
                        )}
                        {isPC && currentWifiIp && (
                          <div className="text-xs font-bold">
                            IP:{' '}
                            <span className="text-cyan-500">{currentWifiIp}</span>
                          </div>
                        )}
                        <div className="text-xs font-bold">
                          {t.modeLabel}{' '}
                          <span>{getModeText()}</span>
                        </div>
                        {wifiMode !== 'disabled' && (
                          <>
                            <div className="text-xs font-bold">
                              {t.securityLabel}{' '}
                              <span>{getSecurityText()}</span>
                            </div>
                            {wifiChannel && (
                              <div className="text-xs font-bold">
                                {t.channelLabel}{' '}
                                <span>{wifiChannel}</span>
                              </div>
                            )}
                            {wifiMode === 'ap' && (
                              <div className="text-xs font-bold">
                                {t.connectedLabel}{' '}
                                <span className="text-cyan-500">{connectedDevices}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${isDark ? 'border-t-slate-800' : 'border-t-white'
                        }`} />
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          }
          return null;
        })()}

        {/* Connected Devices Count Badge - Hidden for now */}
        {(() => {
          return null;
        })()}

        {/* PC monitor stand */}
        {device.type === 'pc' && (
          <>
            <rect
              x={deviceWidth / 2 - 3}
              y={deviceHeight + 1}
              width={6}
              height={5}
              rx={2}
              fill={isDark ? '#334155' : '#94a3b8'}
            />
            <rect
              x={deviceWidth / 2 - 15}
              y={deviceHeight + 6}
              width={30}
              height={4}
              rx={2}
              fill={isDark ? '#475569' : '#cbd5e1'}
            />
          </>
        )}

        {/* Device icon */}
        {/* Removed powered-off icon background — keep original icon only */}

        <g
          transform={`translate(${deviceWidth / 2 - 12}, 10)`}
          filter="url(#deviceShadow)"
        >
          <g style={{ color: iconColor }}>
            {device.type === 'pc' && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                stroke={isDark ? '#60a5fa' : '#3b82f6'}
                fill="none"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z"
                transform="scale(1.2)"
              />
            )}
            {device.type === 'iot' && (
              (() => {
                const iotKind = device.iot?.kind;
                const isActive = device.iot?.collaborationEnabled ?? true;

                // Show different icons and colors based on IoT kind and state
                if (iotKind === 'lamp') {
                  return (
                    <g transform="translate(1, 1)" filter="url(#wifiIconShadow)">
                      <text x="12" y="16" textAnchor="middle" fontSize="15" opacity={isActive ? 1 : 0.45}>💡</text>
                    </g>
                  );
                } else if (iotKind === 'heater') {
                  return (
                    <g transform="translate(1, 1)" filter="url(#wifiIconShadow)">
                      <text x="12" y="16" textAnchor="middle" fontSize="15" opacity={isActive ? 1 : 0.45}>♨️</text>
                    </g>
                  );
                } else if (iotKind === 'cooler') {
                  return (
                    <g transform="translate(1, 1)" filter="url(#wifiIconShadow)">
                      <text x="12" y="16" textAnchor="middle" fontSize="15" opacity={isActive ? 1 : 0.45}>🧊</text>
                    </g>
                  );
                } else {
                  // Default IoT icon for sensors
                  return (
                    <g transform="translate(1, 1)" stroke="#14b8a6" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#wifiIconShadow)">
                      <path d="M16.247 7.761a6 6 0 0 1 0 8.478" />
                      <path d="M19.075 4.933a10 10 0 0 1 0 14.134" />
                      <path d="M4.925 19.067a10 10 0 0 1 0-14.134" />
                      <path d="M7.753 16.239a6 6 0 0 1 0-8.478" />
                      <circle cx="12" cy="12" r="2" fill="#14b8a6" />
                    </g>
                  );
                }
              })()
            )}
            {isSwitchDeviceType(device.type) && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                stroke={isDark ? (device.switchModel === 'WS-C3650-24PS' ? '#c084fc' : '#14b8a6') : (device.switchModel === 'WS-C3650-24PS' ? '#a855f7' : '#0d9488')}
                fill="none"
                d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01"
                transform="scale(1.2)"
              />
            )}
            {device.type === 'router' && (
              <g transform="scale(1.2)">
                <circle cx="12" cy="12" r="9" strokeWidth={2} stroke={isDark ? '#c084fc' : '#a855f7'} fill="none" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke={isDark ? '#c084fc' : '#a855f7'} fill="none" d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
              </g>
            )}
          </g>
        </g>

        {/* Power Status Icon with Lightning - Clickable with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <g
              className="cursor-pointer"
              filter="url(#deviceShadow)"
              onClick={(e) => {
                e.stopPropagation();
                saveToHistory();
                togglePowerDevices([device.id]);
              }}
              aria-label={isPoweredOff ? (language === 'tr' ? 'Gücü aç' : 'Power on') : (language === 'tr' ? 'Gücü kapat' : 'Power off')}
            >
              {/* Background circle - adjusted Y for routers */}
              <circle
                cx={deviceWidth - 12}
                cy={device.type === 'router' ? 14 : 10}
                r={8}
                className={isPoweredOff ? 'fill-red-500' : (isDark ? 'fill-slate-700' : 'fill-slate-100')}
              />
              {/* Lightning bolt - centered in circle */}
              <path
                d="M0 -4l-4 5h3l-1 4 4-5h-3l1-4z"
                transform={`translate(${deviceWidth - 11}, ${device.type === 'router' ? 14 : 10}) scale(1)`}
                className={isPoweredOff ? 'fill-white' : `${statusColor} transition-colors duration-300`}
                fill="currentColor"
              />
            </g>
          </TooltipTrigger>
          {!isDraggingInteractionDisabled && !(isPanning || isSelecting || isDrawingConnection) && (
            <TooltipContent>
              {(() => {
                // IoT cihazları için özel arkaplan görevi göster
                if (device.type === 'iot' && device.iot) {
                  const iotKind = device.iot.kind;
                  const isActive = device.iot.collaborationEnabled ?? true;
                  const rules = device.iot.rules || [];

                  if (iotKind === 'lamp' || iotKind === 'heater' || iotKind === 'cooler') {
                    return (
                      <div className="space-y-2">
                        <div className="font-bold text-sm mb-1">
                          {iotKind === 'lamp' ? (language === 'tr' ? '💡 Lamba' : '💡 Lamp') :
                            iotKind === 'heater' ? (language === 'tr' ? '♨️ Isıtıcı' : '♨️ Heater') :
                              (language === 'tr' ? '🧊 Soğutucu' : '🧊 Cooler')}
                        </div>
                        <div className="text-xs">
                          {language === 'tr' ? 'Cihaz Durumu:' : 'Device Status:'} {isActive ? (language === 'tr' ? 'Aktif' : 'Active') : (language === 'tr' ? 'Pasif' : 'Inactive')}
                        </div>
                        <div className="text-xs">
                          {language === 'tr' ? 'Güç Durumu:' : 'Power Status:'} {getIotPowerStatus(device)}
                        </div>
                        <div className="text-xs">
                          {language === 'tr' ? 'Açık/Kapalı:' : 'Open/Closed:'} {getIotOpenCloseStatus(device)}
                        </div>
                        {rules.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-600">
                            <div className="text-xs font-semibold mb-1">
                              {language === 'tr' ? '📋 Otomatik Kurallar:' : '📋 Auto Rules:'}
                            </div>
                            {rules.map((rule, index) => (
                              <div key={index} className="text-xs py-1">
                                <span className="font-mono">
                                  {language === 'tr' ? 'EĞER' : 'IF'} {rule.condition} → {rule.action}
                                </span>
                                <span className={`ml-2 ${rule.enabled ? 'text-green-500' : 'text-slate-400'}`}>
                                  {rule.enabled ? (language === 'tr' ? '✅ Aktif' : '✅ Active') : (language === 'tr' ? '❌ Pasif' : '❌ Inactive')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {language === 'tr' ? '💡 İpucu: Sensör değerlerine göre otomatik açılır/kapanır' : '💡 Tip: Automatically turns on/off based on sensor values'}
                        </div>
                      </div>
                    );
                  } else if (iotKind === 'sensor') {
                    return (
                      <div className="space-y-2">
                        <div className="font-bold text-sm mb-1">
                          📡 {language === 'tr' ? 'Sensör' : 'Sensor'}
                        </div>
                        <div className="text-xs">
                          {language === 'tr' ? 'Tür:' : 'Type:'} {device.iot.sensorType}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {language === 'tr' ? '💡 Sadece sensör verisi sağlar' : '💡 Provides sensor data only'}
                        </div>
                      </div>
                    );
                  }
                }

                // Default tooltip for other devices
                return isPoweredOff ? t.powerOn : t.powerOff;
              })()}
            </TooltipContent>
          )}
        </Tooltip>

        {/* Device name */}
        <text
          x={deviceWidth / 2}
          y={58}
          fill={isSelected ? (isDark ? '#fb923c' : '#f97316') : isDark ? '#f1f5f9' : '#1e293b'}
          fontSize="10"
          textAnchor="middle"
          fontWeight={isSelected ? '800' : 'bold'}
          className="select-none pointer-events-none"
        >
          {device.name}
        </text>

        {/* Device IP */}
        {device.type === 'pc' && (
          <text x={deviceWidth / 2} y={70} fill={isDark ? '#94a3b8' : '#64748b'} fontSize="10" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none">
            {device.ip}
          </text>
        )}

        {/* Device VLAN / IoT Measured Value */}
        {device.type === 'pc' && (
          <text x={deviceWidth / 2} y={81} fill={isDark ? '#38bdf8' : '#0f766e'} fontSize="9" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none">
            VLAN {String(getLiveDeviceVlan(device))}
          </text>
        )}
        {device.type === 'iot' && (
          (() => {
            const kind = device.iot?.kind || 'sensor';
            const kindLabel = language === 'tr'
              ? (kind === 'lamp' ? 'Lamba' : kind === 'heater' ? 'Isıtıcı' : kind === 'cooler' ? 'Soğutucu' : 'Sensör')
              : (kind === 'lamp' ? 'Lamp' : kind === 'heater' ? 'Heater' : kind === 'cooler' ? 'Cooler' : 'Sensor');

            return (
              <text
                x={deviceWidth / 2}
                y={46}
                fill={isDark ? '#cbd5e1' : '#475569'}
                fontSize="8"
                textAnchor="middle"
                className="select-none pointer-events-none italic opacity-80"
              >
                ({kindLabel})
              </text>
            );
          })()
        )}
        {device.type === 'iot' && (
          (() => {
            const isPoweredOff = device.status === 'offline';
            const isPassive = device.iot?.collaborationEnabled === false;
            if (isPoweredOff) {
              return (
                <text x={deviceWidth / 2} y={70} fill={isDark ? '#94a3b8' : '#64748b'} fontSize="10" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none" filter="drop-shadow(0px 0px 1px rgba(0,0,0,1))">
                  <tspan x={deviceWidth / 2} dy="6">{language === 'tr' ? 'Kapalı' : 'Off'}</tspan>
                </text>
              );
            }
            if (isPassive) {
              return (
                <text x={deviceWidth / 2} y={70} fill={isDark ? '#94a3b8' : '#64748b'} fontSize="10" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none" filter="drop-shadow(0px 0px 1px rgba(0,0,0,1))">
                  <tspan x={deviceWidth / 2} dy="6">{t.passive}</tspan>
                </text>
              );
            }

            const kind = device.iot?.kind;
            const sensorType = device.iot?.sensorType || 'temperature';
            const value = getIotMeasuredValue(device);
            const isControllable = kind === 'lamp' || kind === 'heater' || kind === 'cooler';

            // Controllable IoT devices should show status instead of measurements
            if (isControllable) {
              const isActive = device.iot?.value ?? false;
              const statusColor = isActive ? (isDark ? '#fbbf24' : '#f59e0b') : (isDark ? '#94a3b8' : '#64748b');
              return (
                <text x={deviceWidth / 2} y={70} fill={statusColor} fontSize="10" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none" filter="drop-shadow(0px 0px 1px rgba(0,0,0,1))">
                  <tspan x={deviceWidth / 2} dy="6">{value}</tspan>
                </text>
              );
            }

            // For sensors, show measured values
            switch (sensorType) {
              case 'temperature':
                return (
                  <text x={deviceWidth / 2} y={70} fill={isDark ? '#3cf916' : '#0c9849'} fontSize="10" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none" filter="drop-shadow(0px 0px 1px rgba(0,0,0,1))">
                    <tspan x={deviceWidth / 2} dy="0">{t.temperature}:</tspan>
                    <tspan x={deviceWidth / 2} dy="12">{value}</tspan>
                  </text>
                );
              case 'humidity':
                return (
                  <text x={deviceWidth / 2} y={70} fill={isDark ? '#3b82f6' : '#2563eb'} fontSize="10" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none" filter="drop-shadow(0px 0px 1px rgba(0,0,0,1))">
                    <tspan x={deviceWidth / 2} dy="0">{t.humidity}:</tspan>
                    <tspan x={deviceWidth / 2} dy="12">{value}</tspan>
                  </text>
                );
              case 'light':
                return (
                  <text x={deviceWidth / 2} y={70} fill={isDark ? '#eab308' : '#ca8a04'} fontSize="10" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none" filter="drop-shadow(0px 0px 1px rgba(0,0,0,1))">
                    <tspan x={deviceWidth / 2} dy="0">{t.lightLevel}:</tspan>
                    <tspan x={deviceWidth / 2} dy="12">{value}</tspan>
                  </text>
                );
              case 'sound':
                return (
                  <text x={deviceWidth / 2} y={70} fill={isDark ? '#d8b4fe' : '#9333ea'} fontSize="10" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none" filter="drop-shadow(0px 0px 1px rgba(0,0,0,1))">
                    <tspan x={deviceWidth / 2} dy="0">Sound:</tspan>
                    <tspan x={deviceWidth / 2} dy="12">{value}</tspan>
                  </text>
                );
              case 'motion':
                return (
                  <text x={deviceWidth / 2} y={70} fill={isDark ? '#22c55e' : '#16a34a'} fontSize="10" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none" filter="drop-shadow(0px 0px 1px rgba(0,0,0,1))">
                    <tspan x={deviceWidth / 2} dy="0">Motion:</tspan>
                    <tspan x={deviceWidth / 2} dy="12">{value}</tspan>
                  </text>
                );
              default:
                return (
                  <text x={deviceWidth / 2} y={70} fill={isDark ? '#fb923c' : '#ea580c'} fontSize="9" textAnchor="middle" fontFamily="monospace" className="select-none pointer-events-none" filter="drop-shadow(0px 0px 1px rgba(0,0,0,1))">
                    {value}
                  </text>
                );
            }
          })()
        )}

        {/* Ports - wrapped 6 per row */}
        {isPcLike ? (
          // PC/IoT have compact edge ports
          device.ports.map((port, idx) => {
            // İki portu yan yana göster
            const portSpacing = 18;
            const portX = deviceWidth - 8;
            const startY = deviceHeight / 2 - ((device.ports.length - 1) * portSpacing) / 2;
            const portY = startY + idx * portSpacing;
            const isConnected = port.status === 'connected';
            const isShutdown = port.shutdown;
            const isDeviceOffline = device.status === 'offline';

            // Determine port label: E for Ethernet, C for COM/Console
            const portLabel = port.id.toLowerCase().startsWith('com') ? 'C' : 'E';

            // Port colors:
            // PC Ethernet: Blue, PC COM (Console): Turquoise
            // Shutdown or device offline: Red
            const portColor = (isShutdown || isDeviceOffline) ? STATUS_COLORS.offline :
              port.id.toLowerCase().startsWith('com')
                ? (isConnected ? PORT_COLORS.console.connected : PORT_COLORS.console.disconnected)  // Turquoise for console
                : (isConnected ? PORT_COLORS.ethernet.connected : PORT_COLORS.ethernet.disconnected); // Blue for ethernet

            return (
              <g
                key={port.id}
                transform={`translate(${portX}, ${portY})`}
                style={{ cursor: isDraggingInteractionDisabled ? 'default' : 'pointer', pointerEvents: isDraggingInteractionDisabled ? 'none' : 'all' }}
                onMouseEnter={(e) => handlePortHover(e, device.id, port.id)}
                onMouseLeave={handlePortMouseLeave}
              >
                {/* Larger invisible hitbox for easier clicking */}
                <circle
                  r={12}
                  fill="transparent"
                  style={{ pointerEvents: isDraggingInteractionDisabled ? 'none' : 'all', cursor: isDraggingInteractionDisabled ? 'default' : 'pointer' }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePortClick(e as unknown as ReactMouseEvent, device.id, port.id);
                  }}
                />
                {/* Visible port circle */}
                <circle
                  r={7}
                  fill={portColor}
                  stroke={isShutdown || isDeviceOffline ? '#991b1b' : isConnected ? '#22c55e' : '#4b5563'}
                  strokeWidth={isShutdown || isDeviceOffline || isConnected ? 2 : 1}
                  style={{ pointerEvents: 'none' }}
                />
                <text y={1} fill="#fff" fontSize="7" textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {portLabel}
                </text>
              </g>
            );
          })
        ) : (
          // Switch/Router - wrap 8 ports per row for wider device
          device.type === 'router' ? (
            // Router: wrap 8 ports per row
            device.ports.filter(p => p.id !== 'wlan0').map((port, idx) => {
              const portsPerRow = 8;
              const col = idx % portsPerRow;
              const row = Math.floor(idx / portsPerRow);
              // Adjust port spacing for wider device (130px)
              const portSpacing = 14;
              const rowSpacing = 14;
              const startX = 14;
              const startY = 80;
              const portX = startX + col * portSpacing;
              const portY = startY + row * rowSpacing;
              const isConnected = port.status === 'connected';
              const isShutdown = port.shutdown;
              const isDeviceOffline = device.status === 'offline';

              // Determine port type
              const portId = port.id.toLowerCase();
              const isConsole = portId === 'console';
              const isGigabit = portId.startsWith('gi'); // GigabitEthernet
              const isFastEthernet = portId.startsWith('fa'); // FastEthernet

              // Extract port number - remove leading zeros
              const portNum = port.label.replace(/\D/g, '');
              const displayNum = isConsole ? 'C' : (portNum ? parseInt(portNum, 10).toString() : 'C');

              // Check STP state for router ports from deviceStates
              const deviceState = deviceStates?.get(device.id);
              const simulatorPort = deviceState?.ports?.[port.id];
              const isSTPBlocked = simulatorPort?.spanningTree?.state === 'blocking' || simulatorPort?.spanningTree?.role === 'alternate';

              // Determine device VLAN - only apply STP blocking color for VLAN 1
              const deviceVlan = device.vlan || simulatorPort?.accessVlan || simulatorPort?.vlan || 1;
              const isVlan1 = deviceVlan === 1;

              // Port colors:
              // Console: Turquoise, Fa: Blue, Gi: Orange
              // STP Blocked (VLAN 1 only): Pink
              // Shutdown or device offline: Red
              // Not connected: Gray
              let portFill: string;
              let portStroke: string;

              if (isShutdown || isDeviceOffline) {
                // Güç kapalı - içi kırmızı, çerçeve gri
                portFill = '#ef4444';
                portStroke = '#4b5563';
              } else if (isSTPBlocked && isVlan1) {
                // STP Bloke - Pembe renk (sadece VLAN 1 için)
                portFill = '#ec4899';  // Pink-500
                portStroke = '#f472b6';  // Pink-400
              } else if (isConnected) {
                // Güç açık ve bağlı - içi mavi, çerçeve açık mavi
                if (isConsole) {
                  portFill = '#06b6d4';
                  portStroke = '#67e8f9';
                } else if (isGigabit) {
                  portFill = '#f97316';
                  portStroke = '#fdba74';
                } else if (isFastEthernet) {
                  portFill = '#3b82f6';
                  portStroke = '#60a5fa';
                } else {
                  portFill = '#3b82f6';
                  portStroke = '#60a5fa';
                }
              } else {
                // Güç açık ama bağlı değil - içi mavi, çerçeve gri
                if (isConsole) {
                  portFill = '#06b6d4';
                  portStroke = '#4b5563';
                } else if (isGigabit) {
                  portFill = '#f97316';
                  portStroke = '#4b5563';
                } else if (isFastEthernet) {
                  portFill = '#3b82f6';
                  portStroke = '#4b5563';
                } else {
                  portFill = '#3b82f6';
                  portStroke = '#4b5563';
                }
              }

              return (
                <g
                  key={port.id}
                  transform={`translate(${portX}, ${portY})`}
                  style={{ cursor: isDraggingInteractionDisabled ? 'default' : 'pointer', pointerEvents: isDraggingInteractionDisabled ? 'none' : 'all' }}
                  onMouseEnter={(e) => handlePortHover(e, device.id, port.id)}
                  onMouseLeave={handlePortMouseLeave}
                >
                  {/* Larger invisible hitbox for easier clicking */}
                  <circle
                    r={10}
                    fill="transparent"
                    style={{ pointerEvents: isDraggingInteractionDisabled ? 'none' : 'all', cursor: isDraggingInteractionDisabled ? 'default' : 'pointer' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePortClick(e as unknown as ReactMouseEvent, device.id, port.id);
                    }}
                  />
                  {/* Visible port circle */}
                  <circle
                    r={6}
                    fill={portFill}
                    stroke={isShutdown || isDeviceOffline || isConnected ? portStroke : '#4b5563'}
                    strokeWidth={isShutdown || isDeviceOffline || isConnected ? 2 : 1}
                    style={{ pointerEvents: 'none' }}
                  />
                  <text y={1} fill="#fff" fontSize="6" textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {displayNum}
                  </text>
                </g>
              );
            })
          ) : (
            // Switch: wrap 8 ports per row
            device.ports.filter(p => !p.id.startsWith('vlan') && p.id !== 'wlan0').map((port, idx) => {
              const portsPerRow = 8;
              const col = idx % portsPerRow;
              const row = Math.floor(idx / portsPerRow);
              // Adjust port spacing for wider device (130px)
              const portSpacing = 14;
              const rowSpacing = 14;
              const startX = 14;
              const startY = 80;
              const portX = startX + col * portSpacing;
              const portY = startY + row * rowSpacing;
              const isConnected = port.status === 'connected';
              const isShutdown = port.shutdown;
              const isDeviceOffline = device.status === 'offline';

              // Determine port type
              const portId = port.id.toLowerCase();
              const isConsole = portId === 'console';
              const isGigabit = portId.startsWith('gi'); // GigabitEthernet
              const isFastEthernet = portId.startsWith('fa'); // FastEthernet

              // Extract port number - remove leading zeros
              const portNum = port.label.replace(/\D/g, '');
              const displayNum = isConsole ? 'C' : (portNum ? parseInt(portNum, 10).toString() : 'C');

              // Check STP state for switch ports from deviceStates
              const deviceState = deviceStates?.get(device.id);
              const simulatorPort = deviceState?.ports?.[port.id];
              const isSTPBlocked = simulatorPort?.spanningTree?.state === 'blocking' || simulatorPort?.spanningTree?.role === 'alternate';

              // Port colors:
              // Console: Turquoise, Fa: Blue, Gi: Orange
              // STP Blocked: Amber (yellow/orange)
              // Shutdown or device offline: Red
              // Not connected: Gray
              let portFill: string;
              let portStroke: string;

              if (isShutdown || isDeviceOffline) {
                // Güç kapalı - içi kırmızı, çerçeve gri
                portFill = '#ef4444';
                portStroke = '#4b5563';
              } else if (isSTPBlocked) {
                // STP Bloke - Pembe renk
                portFill = '#ec4899';  // Pink-500
                portStroke = '#f472b6';  // Pink-400
              } else if (isConnected) {
                // Güç açık ve bağlı - içi mavi, çerçeve açık mavi
                if (isConsole) {
                  portFill = '#06b6d4';
                  portStroke = '#67e8f9';
                } else if (isGigabit) {
                  portFill = '#f97316';
                  portStroke = '#fdba74';
                } else if (isFastEthernet) {
                  portFill = '#3b82f6';
                  portStroke = '#60a5fa';
                } else {
                  portFill = '#3b82f6';
                  portStroke = '#60a5fa';
                }
              } else {
                // Güç açık ama bağlı değil - içi mavi, çerçeve gri
                if (isConsole) {
                  portFill = '#06b6d4';
                  portStroke = '#4b5563';
                } else if (isGigabit) {
                  portFill = '#f97316';
                  portStroke = '#4b5563';
                } else if (isFastEthernet) {
                  portFill = '#3b82f6';
                  portStroke = '#4b5563';
                } else {
                  portFill = '#3b82f6';
                  portStroke = '#4b5563';
                }
              }

              return (
                <g
                  key={port.id}
                  transform={`translate(${portX}, ${portY})`}
                  style={{ cursor: isDraggingInteractionDisabled ? 'default' : 'pointer', pointerEvents: isDraggingInteractionDisabled ? 'none' : 'all' }}
                  onMouseEnter={(e) => handlePortHover(e, device.id, port.id)}
                  onMouseLeave={handlePortMouseLeave}
                >
                  {/* Larger invisible hitbox for easier clicking */}
                  <circle
                    r={10}
                    fill="transparent"
                    style={{ pointerEvents: isDraggingInteractionDisabled ? 'none' : 'all', cursor: isDraggingInteractionDisabled ? 'default' : 'pointer' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePortClick(e as unknown as ReactMouseEvent, device.id, port.id);
                    }}
                  />
                  {/* Visible port circle */}
                  <circle
                    r={6}
                    fill={portFill}
                    stroke={isShutdown || isDeviceOffline || isConnected ? portStroke : '#4b5563'}
                    strokeWidth={isShutdown || isDeviceOffline || isConnected ? 2 : 1}
                    style={{ pointerEvents: 'none' }}
                  />
                  <text y={1} fill="#fff" fontSize="6" textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {displayNum}
                  </text>
                </g>
              );
            })
          )
        )}
      </g>
    );
  };

  // Render temporary connection line while drawing
  const renderTempConnection = () => {
    if (!isDrawingConnection || !connectionStart) return null;

    // Use the port position stored in connectionStart.point
    const source = connectionStart.point;

    return (
      <>
        {/* Kablo takarken arka plan overlay */}
        <rect
          x={-10000}
          y={-10000}
          width={20000}
          height={20000}
          fill="rgba(0,0,0,0.1)"
          className="pointer-events-none"
        />

        {/* Connection line with gradient */}
        <line
          x1={source.x}
          y1={source.y}
          x2={mousePos.x}
          y2={mousePos.y}
          stroke={CABLE_COLORS[cableInfo.cableType].primary}
          strokeWidth={4}
          strokeDasharray="8,4"
          strokeLinecap="round"
          opacity="0.8"
          className="pointer-events-none"
        >
          <animate attributeName="stroke-dashoffset" from="12" to="0" dur="1s" repeatCount="indefinite" />
        </line>
        {/* Inner solid line */}
        <line
          x1={source.x}
          y1={source.y}
          x2={mousePos.x}
          y2={mousePos.y}
          stroke={CABLE_COLORS[cableInfo.cableType].primary}
          strokeWidth={2}
          opacity="1"
          className="pointer-events-none"
        />

        {/* Source port highlight */}
        <circle
          cx={source.x}
          cy={source.y}
          r={12}
          fill={CABLE_COLORS[cableInfo.cableType].primary}
          opacity="0.15"
          className="pointer-events-none"
        >
          <animate attributeName="r" values="12;16;12" dur="1.5s" repeatCount="indefinite" />
        </circle>

        {/* End point circle */}
        <circle
          cx={mousePos.x}
          cy={mousePos.y}
          r={8}
          fill={CABLE_COLORS[cableInfo.cableType].primary}
          opacity="0.4"
          className="pointer-events-none"
        >
          <animate attributeName="r" values="8;10;8" dur="1.5s" repeatCount="indefinite" />
        </circle>

        {/* Kablo tipi göstergesi */}
        <g transform={`translate(${(source.x + mousePos.x) / 2}, ${(source.y + mousePos.y) / 2 - 20})`}>
          <rect
            x={-35}
            y={-12}
            width={70}
            height={24}
            rx={8}
            fill={CABLE_COLORS[cableInfo.cableType].primary}
            opacity="0.9"
            className="pointer-events-none"
          />
          <text
            x={0}
            y={4}
            fill="white"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            className="select-none pointer-events-none"
          >
            {cableInfo.cableType === 'straight' ? 'Düz' : cableInfo.cableType === 'crossover' ? 'Çapraz' : 'Konsol'}
          </text>
        </g>
      </>
    );
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className={`${isFullscreen ? 'fixed inset-0 z-[9999] overflow-hidden' : 'relative w-full h-full'} flex flex-col ${isDark
        ? 'bg-gradient-to-br from-slate-800/90 via-slate-700/80 to-slate-800/90'
        : 'bg-gradient-to-br from-blue-50/50 via-white to-slate-50/80'
        }`}
    >
      {isFullscreen && (
        <TooltipWrapper title={t.exit}>
          <button
            onClick={toggleFullscreen}
            className={`fixed top-4 right-4 z-[10000] flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-colors ${isDark
              ? 'bg-slate-800/90 hover:bg-red-500/30 text-slate-300 hover:text-red-400 border border-slate-600'
              : 'bg-white/90 hover:bg-red-500/30 text-slate-600 hover:text-red-600 border border-slate-300'
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
          <Sheet open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
            <SheetContent side="left" className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'} p-0 palette w-[300px] sm:w-[350px] border-r border-slate-800/20 shadow-2xl transition-all duration-300 custom-scrollbar`}>
              <SheetHeader className="p-6 border-b border-slate-800/50">
                <SheetTitle className="text-lg font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-red-500" />
                  {t.addDeviceOrCable}
                </SheetTitle>
              </SheetHeader>
              <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar">
                {/* Devices Section */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold  tracking-widest text-slate-500 ml-1 uppercase">{t.devices}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { addDevice('pc'); setIsPaletteOpen(false); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-blue-500/50'
                        }`}
                    >
                      <div className='text-blue-500'>
                        {DEVICE_ICONS['pc']}
                      </div>
                      <span className="text-xs font-bold text-center">
                        {t.addPc}
                      </span>
                    </button>
                    <button
                      onClick={() => { addDevice('switch'); setIsPaletteOpen(false); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-green-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-green-500/50'
                        }`}
                    >
                      <div className='text-green-500'>
                        {DEVICE_ICONS['switch']}
                      </div>
                      <span className="text-xs font-bold text-center">
                        {isTR ? 'L2 Switch' : 'L2 Switch'}
                      </span>
                    </button>
                    <button
                      onClick={() => { addDevice('switch', 'L3'); setIsPaletteOpen(false); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-purple-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-purple-500/50'
                        }`}
                    >
                      <div className='text-purple-500'>
                        <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="#a855f7" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-center">
                        {isTR ? 'L3 Switch' : 'L3 Switch'}
                      </span>
                    </button>
                    <button
                      onClick={() => { addDevice('router'); setIsPaletteOpen(false); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-purple-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-purple-500/50'
                        }`}
                    >
                      <div className='text-purple-500'>
                        {DEVICE_ICONS['router']}
                      </div>
                      <span className="text-xs font-bold text-center">
                        {t.addRouter}
                      </span>
                    </button>
                    <button
                      onClick={() => { addDevice('iot'); setIsPaletteOpen(false); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-cyan-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-cyan-500/50'
                        }`}
                    >
                      <div className='text-cyan-500'>
                        {DEVICE_ICONS['iot']}
                      </div>
                      <span className="text-xs font-bold text-center">
                        {isTR ? 'IoT Ekle' : 'Add IoT'}
                      </span>
                    </button>
                    <button
                      onClick={() => { addDevice('firewall'); setIsPaletteOpen(false); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-red-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-red-500/50'
                        }`}
                    >
                      <div className='text-red-500'>
                        {DEVICE_ICONS['firewall']}
                      </div>
                      <span className="text-xs font-bold text-center">
                        {isTR ? 'Firewall' : 'Firewall'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Cables Section - Button Group with Color Coding */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 ml-1 uppercase">{t.cableTypes}</p>
                  <div className={`flex flex-col gap-2 rounded-xl border p-2 ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-slate-50/50'}`}>
                    {(['straight', 'crossover', 'console'] as CableType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => { onCableChange({ ...cableInfo, cableType: type }); setIsPaletteOpen(false); }}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all
                            ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200/50'}
                            ${cableInfo.cableType === type
                            ? isDark ? 'bg-slate-700/80 border border-slate-600' : 'bg-white border border-slate-200 shadow-sm'
                            : 'border border-transparent'
                          }
                            ${type === 'straight'
                            ? (cableInfo.cableType === type ? 'text-blue-400' : 'text-blue-500 hover:text-blue-400')
                            : type === 'crossover'
                              ? (cableInfo.cableType === type ? 'text-orange-400' : 'text-orange-500 hover:text-orange-400')
                              : (cableInfo.cableType === type ? 'text-cyan-400' : 'text-cyan-500 hover:text-cyan-400')
                          }`}
                      >
                        <div className={`p-2 rounded-md ${cableInfo.cableType === type ? (isDark ? 'bg-slate-800' : 'bg-slate-50') : ''}`}>
                          {type === 'straight' ? (
                            <Cable className="w-5 h-5" />
                          ) : type === 'crossover' ? (
                            <Strikethrough className="w-5 h-5" />
                          ) : (
                            <Usb className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-bold capitalize">
                            {type === 'straight' ? t.straight : type === 'crossover' ? t.crossover : t.console}
                          </span>
                          <span className="text-[9px] opacity-60">
                            {type === 'straight' ? (isTR ? 'Standart ethernet bağlantısı' : 'Standard ethernet connection') :
                              type === 'crossover' ? (isTR ? 'Benzer cihazlar arası' : 'Between similar devices') :
                                (isTR ? 'Yönetim konsol bağlantısı' : 'Management console connection')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-4" />
              </div>
            </SheetContent>
          </Sheet>
          {/* Multiple Selection Indicator & Tools */}
          {/* Ping mode cursor label */}
          {pingMode && pingCursorPos && (
            <div
              className="fixed z-[200] pointer-events-none select-none"
              style={{ left: pingCursorPos.x + 16, top: pingCursorPos.y + 16 }}
            >
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-lg ${pingSource
                ? (isDark ? 'bg-yellow-500 text-white' : 'bg-yellow-400 text-white')
                : (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white')
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
              className={`px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 selection-toolbar ${isDark ? 'bg-slate-800/95 text-white border border-slate-700' : 'bg-white text-slate-900 border border-slate-200'
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
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
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
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 4h20M5 8v10M11 8v7M17 8v12" />
                  </svg>
                </button>
              </TooltipWrapper>
              <div className="w-px h-4 bg-slate-700/30 mx-1" />
              <span className="text-xs font-semibold whitespace-nowrap bg-slate-700/30 px-2 py-0.5 rounded">
                {selectedDeviceIds.length}
              </span>
              <TooltipWrapper title={t.togglePower}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    logger.debug('[Toolbar] Power toggle clicked');
                    saveToHistory();
                    togglePowerDevices(selectedDeviceIds);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${isDark
                    ? 'hover:bg-amber-500/20 text-amber-300'
                    : 'hover:bg-amber-100 text-amber-700'
                    }`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </TooltipWrapper>
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
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-600'}`}
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
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
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
              if (isDrawingConnection) {
                setIsDrawingConnection(false);
                setConnectionStart(null);
              }
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
              if (e.key === 'Enter' && selectedDeviceIds.length === 1) {
                const selectedDevice = deviceMap.get(selectedDeviceIds[0]);
                if (selectedDevice) {
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
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  transition: isPanning ? 'none' : 'transform 0.05s linear',
                }}
              >
                {/* Clip path for canvas boundaries */}
                <defs>
                  <clipPath id="canvasClip">
                    <rect x="0" y="0" width={getCanvasDimensions().width} height={getCanvasDimensions().height} />
                  </clipPath>
                  {/* Device Shadow Filter */}
                  <filter id="deviceShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="2" dy="3" stdDeviation="3" floodOpacity={isDark ? "0.3" : "0.2"} />
                  </filter>
                  {/* WiFi Icon Shadow Filter - More pronounced for visibility */}
                  <filter id="wifiIconShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0.5" dy="1" stdDeviation="1.5" floodOpacity={isDark ? "0.9" : "0.5"} />
                  </filter>
                  {/* Canvas background gradient */}
                  <radialGradient id="canvasBgGradient" cx="46%" cy="30%" r="88%">
                    {isDark ? (
                      <>
                        <stop offset="0%" stopColor="#24344d" />
                        <stop offset="28%" stopColor="#1e2c43" />
                        <stop offset="55%" stopColor="#18253a" />
                        <stop offset="78%" stopColor="#142033" />
                        <stop offset="100%" stopColor="#0d1728" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#fcfdff" />
                        <stop offset="28%" stopColor="#f6faff" />
                        <stop offset="55%" stopColor="#eef4fc" />
                        <stop offset="78%" stopColor="#e7eff9" />
                        <stop offset="100%" stopColor="#dde8f4" />
                      </>
                    )}
                  </radialGradient>
                  {/* Grid pattern with improved visibility */}
                  <pattern id="gridPattern" width="16" height="16" patternUnits="userSpaceOnUse">
                    <circle cx="8" cy="8" r="1" fill={isDark ? '#475569' : '#64748b'} opacity="0.6" />
                  </pattern>
                  {/* Major grid lines pattern */}
                  <pattern id="majorGridPattern" width="80" height="80" patternUnits="userSpaceOnUse">
                    <rect width="80" height="80" fill="none" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="0.5" opacity="0.3" />
                  </pattern>
                  {/* Device 3D Gradients for Dark Mode */}
                  <linearGradient id="pcGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="30%" stopColor="#1e40af" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                  <linearGradient id="switchGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="30%" stopColor="#0f766e" />
                    <stop offset="100%" stopColor="#115e59" />
                  </linearGradient>
                  <linearGradient id="routerGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="30%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#5b21b6" />
                  </linearGradient>
                  <linearGradient id="firewallGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="30%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>
                  <linearGradient id="iotGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f89d5c" />
                    <stop offset="30%" stopColor="#ef9463" />
                    <stop offset="100%" stopColor="#ca643c" />
                  </linearGradient>
                  {/* Device 3D Gradients for Light Mode */}
                  <linearGradient id="pcGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#eff6ff" />
                    <stop offset="100%" stopColor="#dbeafe" />
                  </linearGradient>
                  <linearGradient id="switchGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f0fdfa" />
                    <stop offset="100%" stopColor="#ccfbf1" />
                  </linearGradient>
                  <linearGradient id="routerGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f5f3ff" />
                    <stop offset="100%" stopColor="#ede9fe" />
                  </linearGradient>
                  <linearGradient id="firewallGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fee2e2" />
                    <stop offset="100%" stopColor="#fecaca" />
                  </linearGradient>
                  <linearGradient id="iotGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffedd5" />
                    <stop offset="100%" stopColor="#fed7aa" />
                  </linearGradient>
                  {/* Note Gradients for Dark Mode */}
                  <linearGradient id="noteBlueDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="noteEmeraldDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                  <linearGradient id="noteVioletDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6d28d9" />
                  </linearGradient>
                  <linearGradient id="noteAmberDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  <linearGradient id="noteRedDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#b91c1c" />
                  </linearGradient>
                  <linearGradient id="noteCyanDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0e7490" />
                  </linearGradient>
                  <linearGradient id="notePinkDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#be185d" />
                  </linearGradient>
                  <linearGradient id="noteOrangeDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#c2410c" />
                  </linearGradient>
                  <linearGradient id="noteLimeDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#84cc16" />
                    <stop offset="100%" stopColor="#4d7c0f" />
                  </linearGradient>
                  <linearGradient id="noteSlateDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#334155" />
                  </linearGradient>
                  <linearGradient id="notePurpleDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                  <linearGradient id="noteLightBlueDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                  <linearGradient id="noteLightGreenDark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                  {/* Note Gradients for Light Mode */}
                  <linearGradient id="noteBlueLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#dbeafe" />
                    <stop offset="100%" stopColor="#bfdbfe" />
                  </linearGradient>
                  <linearGradient id="noteEmeraldLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#d1fae5" />
                    <stop offset="100%" stopColor="#a7f3d0" />
                  </linearGradient>
                  <linearGradient id="noteVioletLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ede9fe" />
                    <stop offset="100%" stopColor="#ddd6fe" />
                  </linearGradient>
                  <linearGradient id="noteAmberLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fef3c7" />
                    <stop offset="100%" stopColor="#fde68a" />
                  </linearGradient>
                  <linearGradient id="noteRedLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fee2e2" />
                    <stop offset="100%" stopColor="#fecaca" />
                  </linearGradient>
                  <linearGradient id="noteCyanLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#cffafe" />
                    <stop offset="100%" stopColor="#a5f3fc" />
                  </linearGradient>
                  <linearGradient id="notePinkLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fce7f3" />
                    <stop offset="100%" stopColor="#fbcfe8" />
                  </linearGradient>
                  <linearGradient id="noteOrangeLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffedd5" />
                    <stop offset="100%" stopColor="#fed7aa" />
                  </linearGradient>
                  <linearGradient id="noteLimeLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ecfccb" />
                    <stop offset="100%" stopColor="#d9f99d" />
                  </linearGradient>
                  <linearGradient id="noteSlateLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f1f5f9" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                  </linearGradient>
                  <linearGradient id="notePurpleLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f3e8ff" />
                    <stop offset="100%" stopColor="#e9d5ff" />
                  </linearGradient>
                  <linearGradient id="noteLightBlueLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#dbeafe" />
                    <stop offset="100%" stopColor="#bfdbfe" />
                  </linearGradient>
                  <linearGradient id="noteLightGreenLight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#dcfce7" />
                    <stop offset="100%" stopColor="#bbf7d0" />
                  </linearGradient>
                </defs>

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
                    x="0"
                    y="0"
                    width={getCanvasDimensions().width}
                    height={getCanvasDimensions().height}
                    fill="url(#majorGridPattern)"
                  />
                  {/* Grid Dots */}
                  <rect
                    x="0"
                    y="0"
                    width={getCanvasDimensions().width}
                    height={getCanvasDimensions().height}
                    fill="url(#gridPattern)"
                  />

                  {/* Environment Backgrounds */}
                  {environment?.background !== 'none' && (
                    <g opacity="0.15">
                      {environment?.background === 'house' && (
                        <svg x="0" y="0" width="1200" height="900" viewBox="0 0 1200 900">
                          {/* 3+1 Apartment - Top-down floor plan */}
                          <g fill="none" stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth="6">
                            {/* Outer walls */}
                            <rect x="150" y="150" width="900" height="600" rx="6" />
                            {/* Living room (large room at bottom) */}
                            <rect x="150" y="450" width="450" height="300" rx="4" />
                            {/* Kitchen (right of living room) */}
                            <rect x="600" y="450" width="450" height="300" rx="4" />
                            {/* Kitchen counter */}
                            <rect x="870" y="470" width="150" height="60" rx="4" fill={isDark ? '#94a3b820' : '#64748b20'} />
                            {/* Bedroom 1 (top left) */}
                            <rect x="150" y="150" width="300" height="300" rx="4" />
                            {/* Bedroom 2 (top middle) */}
                            <rect x="450" y="150" width="300" height="300" rx="4" />
                            {/* Bedroom 3 (top right) */}
                            <rect x="750" y="150" width="300" height="300" rx="4" />
                            {/* Bathroom (small room between living and bedrooms) */}
                            <rect x="600" y="360" width="150" height="90" rx="4" />
                            {/* Hallway */}
                            <rect x="450" y="360" width="150" height="90" rx="4" />
                            {/* Entrance door */}
                            <rect x="330" y="690" width="90" height="60" rx="4" fill={isDark ? '#94a3b820' : '#64748b20'} />
                            <line x1="375" y1="690" x2="375" y2="750" strokeDasharray="10,10" />
                            {/* Bedroom doors */}
                            <line x1="300" y1="450" x2="360" y2="450" strokeDasharray="10,10" />
                            <line x1="600" y1="450" x2="660" y2="450" strokeDasharray="10,10" />
                            <line x1="900" y1="450" x2="960" y2="450" strokeDasharray="10,10" />
                            {/* Kitchen doorway */}
                            <line x1="600" y1="540" x2="600" y2="660" strokeDasharray="10,10" />
                            {/* Bathroom door */}
                            <line x1="660" y1="405" x2="690" y2="405" strokeDasharray="10,10" />
                            {/* Room labels */}
                            <text x="300" y="330" fontSize="40" fill={isDark ? '#94a3b8' : '#64748b'} textAnchor="middle">{t.room1}</text>
                            <text x="600" y="330" fontSize="40" fill={isDark ? '#94a3b8' : '#64748b'} textAnchor="middle">{t.room2}</text>
                            <text x="900" y="330" fontSize="40" fill={isDark ? '#94a3b8' : '#64748b'} textAnchor="middle">{t.bedroom}</text>
                            <text x="375" y="630" fontSize="40" fill={isDark ? '#94a3b8' : '#64748b'} textAnchor="middle">{t.livingRoom}</text>
                            <text x="825" y="630" fontSize="40" fill={isDark ? '#94a3b8' : '#64748b'} textAnchor="middle">{t.kitchen}</text>
                            <text x="675" y="420" fontSize="28" fill={isDark ? '#94a3b8' : '#64748b'} textAnchor="middle">{t.bathroom}</text>
                          </g>
                        </svg>
                      )}
                      {environment?.background === 'twoStoryGarage' && (
                        <svg x="0" y="0" width="1500" height="1200" viewBox="0 0 1500 1200">
                          {/* Two story building with garage */}
                          <g fill="none" stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth="6">
                            {/* Main building - 2 stories */}
                            <rect x="150" y="240" width="600" height="720" rx="6" />
                            {/* First floor line */}
                            <line x1="150" y1="600" x2="750" y2="600" />
                            {/* Roof */}
                            <path d="M120 240 L450 60 L780 240" />
                            {/* Main entrance door */}
                            <rect x="390" y="660" width="120" height="300" rx="6" />
                            <circle cx="450" cy="810" r="9" fill={isDark ? '#94a3b8' : '#64748b'} />
                            {/* First floor windows - 3 windows */}
                            <rect x="210" y="390" width="135" height="150" rx="6" />
                            <line x1="276" y1="390" x2="276" y2="540" />
                            <line x1="210" y1="465" x2="345" y2="465" />
                            <rect x="381" y="390" width="135" height="150" rx="6" />
                            <line x1="447" y1="390" x2="447" y2="540" />
                            <line x1="381" y1="465" x2="516" y2="465" />
                            <rect x="555" y="390" width="135" height="150" rx="6" />
                            <line x1="621" y1="390" x2="621" y2="540" />
                            <line x1="555" y1="465" x2="690" y2="465" />
                            {/* Ground floor windows */}
                            <rect x="210" y="690" width="135" height="210" rx="6" />
                            <line x1="276" y1="690" x2="276" y2="900" />
                            <line x1="210" y1="795" x2="345" y2="795" />
                            <rect x="555" y="690" width="135" height="210" rx="6" />
                            <line x1="621" y1="690" x2="621" y2="900" />
                            <line x1="555" y1="795" x2="690" y2="795" />
                            {/* Attached garage */}
                            <rect x="810" y="540" width="480" height="420" rx="6" />
                            {/* Garage roof */}
                            <path d="M810 540 L1050 420 L1290 540" />
                            {/* Garage door */}
                            <rect x="930" y="660" width="240" height="300" rx="3" />
                            <line x1="930" y1="735" x2="1170" y2="735" />
                            <line x1="930" y1="810" x2="1170" y2="810" />
                            <line x1="930" y1="885" x2="1170" y2="885" />
                            {/* Garage side window */}
                            <rect x="855" y="630" width="60" height="90" rx="6" />
                            <line x1="885" y1="630" x2="885" y2="720" />
                            <line x1="855" y1="675" x2="915" y2="675" />
                            {/* Chimney */}
                            <rect x="600" y="105" width="75" height="150" rx="6" />
                            <ellipse cx="637.5" cy="90" rx="36" ry="12" />
                          </g>
                        </svg>
                      )}
                      {environment?.background === 'greenhouse' && (
                        <svg x="0" y="0" width="1600" height="1200" viewBox="0 0 1600 1200">
                          {/* Greenhouse / Sera Layout */}
                          <g fill="none" stroke={isDark ? '#10b981' : '#059669'} strokeWidth="6">
                            {/* Main greenhouse structure - rectangular with curved roof */}
                            <rect x="200" y="300" width="1200" height="600" rx="12" />
                            {/* Arched roof frame */}
                            <path d="M200 300 Q800 150 1400 300" />
                            <path d="M200 300 Q800 180 1400 300" />
                            <path d="M200 300 Q800 210 1400 300" />

                            {/* Support columns */}
                            <line x1="350" y1="300" x2="350" y2="900" />
                            <line x1="500" y1="300" x2="500" y2="900" />
                            <line x1="650" y1="300" x2="650" y2="900" />
                            <line x1="800" y1="300" x2="800" y2="900" />
                            <line x1="950" y1="300" x2="950" y2="900" />
                            <line x1="1100" y1="300" x2="1100" y2="900" />
                            <line x1="1250" y1="300" x2="1250" y2="900" />

                            {/* Horizontal support beams */}
                            <line x1="200" y1="450" x2="1400" y2="450" />
                            <line x1="200" y1="600" x2="1400" y2="600" />
                            <line x1="200" y1="750" x2="1400" y2="750" />

                            {/* Main entrance */}
                            <rect x="700" y="750" width="200" height="150" rx="6" />
                            <line x1="800" y1="750" x2="800" y2="900" />
                            <circle cx="780" cy="825" r="8" fill={isDark ? '#10b981' : '#059669'} />

                            {/* Ventilation windows on roof */}
                            <rect x="400" y="240" width="120" height="60" rx="6" />
                            <rect x="600" y="210" width="120" height="60" rx="6" />
                            <rect x="800" y="195" width="120" height="60" rx="6" />
                            <rect x="1000" y="210" width="120" height="60" rx="6" />
                            <rect x="1200" y="240" width="120" height="60" rx="6" />

                            {/* Plant rows inside */}
                            <g stroke={isDark ? '#22c55e' : '#16a34a'} strokeWidth="4">
                              <line x1="275" y1="400" x2="275" y2="700" />
                              <line x1="425" y1="400" x2="425" y2="700" />
                              <line x1="575" y1="400" x2="575" y2="700" />
                              <line x1="1025" y1="400" x2="1025" y2="700" />
                              <line x1="1175" y1="400" x2="1175" y2="700" />
                              <line x1="1325" y1="400" x2="1325" y2="700" />
                            </g>

                            {/* Irrigation pipes */}
                            <g stroke={isDark ? '#3b82f6' : '#2563eb'} strokeWidth="3" strokeDasharray="10,5">
                              <line x1="200" y1="500" x2="1400" y2="500" />
                              <line x1="200" y1="650" x2="1400" y2="650" />
                            </g>

                            {/* Control room / IoT hub */}
                            <rect x="1300" y="200" width="200" height="150" rx="8" />
                            <rect x="1350" y="250" width="100" height="60" rx="4" />
                            <circle cx="1400" cy="280" r="20" stroke={isDark ? '#f59e0b' : '#d97706'} strokeWidth="3" />
                            <line x1="1385" y1="280" x2="1415" y2="280" stroke={isDark ? '#f59e0b' : '#d97706'} strokeWidth="3" />
                            <line x1="1400" y1="265" x2="1400" y2="295" stroke={isDark ? '#f59e0b' : '#d97706'} strokeWidth="3" />
                          </g>
                        </svg>
                      )}
                    </g>
                  )}

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
                      />
                    );
                  })}

                  {/* Temporary connection line */}
                  {renderTempConnection()}

                  {/* Connection interaction handles (Trash icons) */}
                  {/* BOLT: Use visibleConnections for culling */}
                  {visibleConnections.map((conn) => renderConnectionHandle(conn))}

                  {/* Devices */}                  {devicesSortedForRender.map((device) => {
                    const isCurrentlyDragging = (draggedDevice === device.id && isActuallyDragging) ||
                      (touchDraggedDevice?.id === device.id && isTouchDragging);
                    return (
                      <DeviceNode
                        key={device.id}
                        device={device}
                        isSelected={selectedDeviceIds.includes(device.id) || activeDeviceId === device.id || (pingMode && pingSource?.id === device.id)}
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
                        renderDeviceContent={renderDevice}
                      />
                    );
                  })}

                  {/* Notes */}
                  {visibleNotes.map((note) => (
                    <foreignObject
                      key={note.id}
                      x={note.x}
                      y={note.y}
                      width={note.width}
                      height={note.height}
                      data-note-id={note.id}
                      className="pointer-events-none"
                    >
                      <div
                        className={`pointer-events-auto relative flex flex-col w-full h-full overflow-hidden rounded-lg shadow-lg border ${isDark
                          ? 'border-amber-300/60'
                          : 'border-yellow-200'
                          } ${selectedNoteIds.includes(note.id) ? 'ring-2 ring-emerald-400/70' : ''}`}
                        data-note-id={note.id}
                        style={{ backgroundColor: note.color, fontFamily: note.font, opacity: note.opacity }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu(null);
                          if (e.shiftKey) {
                            setSelectedNoteIds((prev) => prev.includes(note.id) ? prev.filter(id => id !== note.id) : [...prev, note.id]);
                          } else {
                            setSelectedNoteIds([note.id]);
                            setSelectedDeviceIds([]);
                          }
                        }}
                      >
                        {/* Note Header - Draggable */}
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleNoteHeaderMouseDown(e as unknown as ReactMouseEvent, note.id);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            handleNoteHeaderTouchStart(e, note.id);
                          }}
                          className={`flex items-center gap-2 px-2 text-[10px] font-semibold tracking-widest select-none ${isDark ? 'bg-black/10' : 'bg-black/5'
                            } ${draggedNoteId === note.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                          style={{ height: '24px' }}
                        >
                          <div
                            className="flex items-center gap-1"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cycleNoteColor(note.id);
                                  }}
                                  className="w-4 h-4 rounded border border-black/20"
                                  style={{ backgroundColor: note.color }}
                                  aria-label={t.colorLabel}
                                />
                              </TooltipTrigger>
                              <TooltipContent>{t.colorLabel}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cycleNoteFont(note.id);
                                  }}
                                  className="px-1 rounded text-[9px] leading-4 bg-black/10 hover:bg-black/20"
                                >
                                  F
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{t.fontLabel}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cycleNoteFontSize(note.id);
                                  }}
                                  className="px-1 rounded text-[9px] leading-4 bg-black/10 hover:bg-black/20"
                                >
                                  {note.fontSize}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{t.sizeLabel}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cycleNoteOpacity(note.id);
                                  }}
                                  className="px-1 rounded text-[9px] leading-4 bg-black/10 hover:bg-black/20"
                                >
                                  {Math.round(note.opacity * 100)}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{t.opacityLabel}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateNote(note.id);
                                  }}
                                  className="px-1 rounded text-[9px] leading-4 bg-black/10 hover:bg-black/20"
                                >
                                  D
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{t.duplicateLabel}</TooltipContent>
                            </Tooltip>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNote(note.id);
                                }}
                                className="ml-auto px-1.5 py-0.5 rounded hover:bg-black/10"
                                aria-label={t.delete}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1 -1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0 -1-1h-4a1 1 0 0 0 -1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{t.delete}</TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Note Content - Scrollable */}
                        <div
                          data-note-scroll
                          className="flex-1 min-h-0"
                          style={{
                            height: `calc(100% - 24px)`,
                            scrollBehavior: 'smooth',
                          }}
                          onWheel={(e) => {
                            // Allow scroll within note without affecting canvas zoom
                            e.stopPropagation();
                          }}
                          onTouchMove={(e) => {
                            // Allow touch scroll within note
                            e.stopPropagation();
                          }}
                        >
                          <textarea
                            aria-label={language === 'tr' ? 'Not içeriği' : 'Note content'}
                            ref={(el) => { noteTextareaRefs.current[note.id] = el; }}
                            value={note.text}
                            onChange={(e) => updateNoteText(note.id, e.target.value)}
                            onMouseDown={(e) => {
                              // Sadece textarea içine tıklandığında olay durdurulsun, 
                              // böylece canvas sürüklenmez ama scrollbar çalışır
                              e.stopPropagation();
                            }}
                            onTouchStart={(e) => {
                              // Mobilde textarea'ya dokunuş - drag'i durdur
                              e.stopPropagation();
                            }}
                            onTouchEnd={(e) => {
                              // Mobilde textarea'dan çıkış
                              e.stopPropagation();
                            }}
                            onSelect={(e) => {
                              setNoteTextSelection({
                                noteId: note.id,
                                start: e.currentTarget.selectionStart ?? 0,
                                end: e.currentTarget.selectionEnd ?? 0,
                              });
                            }}
                            onMouseUp={(e) => {
                              setNoteTextSelection({
                                noteId: note.id,
                                start: e.currentTarget.selectionStart ?? 0,
                                end: e.currentTarget.selectionEnd ?? 0,
                              });
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              // ESC tuşu ile context menu'yü kapat
                              if (e.key === 'Escape' && contextMenu?.noteId === note.id) {
                                setContextMenu(null);
                              }
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation();
                            }}
                            onBlur={() => {
                              // Textarea'nın dışında tıklanınca context menu'yü kapat
                              if (contextMenu?.noteId === note.id) {
                                setContextMenu(null);
                              }
                              if (onTopologyChange) {
                                onTopologyChange(devices, connections, notes);
                              }
                            }}
                            className="w-full h-full min-h-full px-2 py-1 bg-transparent outline-none resize-none overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words touch-manipulation custom-scrollbar"
                            style={{ fontSize: note.fontSize, lineHeight: 1.35, color: '#000000' }}
                          />
                        </div>

                        {/* Resize Handles */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e as unknown as ReactMouseEvent, note.id, 'w'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'w'); }} />
                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e as unknown as ReactMouseEvent, note.id, 'e'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'e'); }} />
                        <div className="absolute left-0 top-0 right-0 h-1 cursor-ns-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e as unknown as ReactMouseEvent, note.id, 'n'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'n'); }} />
                        <div className="absolute left-0 bottom-0 right-0 h-1 cursor-ns-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e as unknown as ReactMouseEvent, note.id, 's'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 's'); }} />
                        <div className="absolute left-0 top-0 w-4 h-4 cursor-nw-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e as unknown as ReactMouseEvent, note.id, 'nw'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'nw'); }} />
                        <div className="absolute right-0 top-0 w-4 h-4 cursor-ne-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e as unknown as ReactMouseEvent, note.id, 'ne'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'ne'); }} />
                        <div className="absolute left-0 bottom-0 w-4 h-4 cursor-sw-resize opacity-0 hover:opacity-40 transition-opacity z-10" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e as unknown as ReactMouseEvent, note.id, 'sw'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'sw'); }} />
                        <div className="absolute right-1 bottom-1 z-10 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity touch-manipulation" onMouseDown={(e) => { e.preventDefault(); handleNoteResizeStart(e as unknown as ReactMouseEvent, note.id, 'se'); }} onTouchStart={(e) => { e.preventDefault(); handleNoteResizeTouchStart(e, note.id, 'se'); }}>
                          <svg viewBox="0 0 12 12" className="w-full h-full text-black">
                            <path d="M4 12 L12 4" stroke="currentColor" strokeWidth="1" />
                            <path d="M7 12 L12 7" stroke="currentColor" strokeWidth="1" />
                            <path d="M10 12 L12 10" stroke="currentColor" strokeWidth="1" />
                          </svg>
                        </div>
                      </div>
                    </foreignObject>
                  ))}

                  {/* Ping Animation - rendered LAST for top z-order */}
                  {pingAnimation && (() => {
                    const { path, currentHopIndex, progress, success, error } = pingAnimation;

                    // Show error message if ping failed
                    if (success === false && error) {
                      return (
                        <g key="ping-error" opacity={0.95}>
                          <foreignObject x="20" y="20" width="300" height="auto">
                            <div className={`p-3 rounded-lg shadow-lg border ${isDark ? 'bg-red-500/20 border-red-500/50' : 'bg-red-50 border-red-200'}`}>
                              <div className={`text-sm font-bold ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                                {t.pingFailed}
                              </div>
                              <div className={`text-xs mt-1 ${isDark ? 'text-red-200' : 'text-red-600'}`}>
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
                            <div className={`p-3 rounded-lg shadow-lg border ${isDark ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-emerald-50 border-emerald-200'}`}>
                              <div className={`text-sm font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
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

                    return (
                      <g key="ping-animation" opacity={0.9}>
                        <g
                          transform={`translate(${envelopeX}, ${envelopeY})`}
                          className="cursor-pointer"
                          onClick={handleEnvelopeClick}
                        >
                          {/* Glow highlight */}
                          {graphicsQuality === 'high' ? (
                            <circle cx="0" cy="0" r="16" fill="#06b6d4" opacity="0.2" filter="url(#packetGlow)">
                              <animate attributeName="opacity" values="0.15;0.35;0.15" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                          ) : (
                            <circle cx="0" cy="0" r="14" fill="#06b6d4" opacity="0.1">
                              <animate attributeName="opacity" values="0.08;0.2;0.08" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                          )}
                          <rect x="-10" y="-7" width="20" height="14" rx="2" fill="#06b6d4" stroke="#0891b2" strokeWidth="1.5" />
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
                      fill={isDark ? "rgba(6, 182, 212, 0.1)" : "rgba(6, 182, 212, 0.1)"}
                      stroke={isDark ? "rgba(6, 182, 212, 0.6)" : "rgba(6, 182, 212, 0.5)"}
                      strokeWidth={1.5 / zoom}
                      strokeDasharray={`${4 / zoom}, ${4 / zoom}`}
                      pointerEvents="none"
                    />
                  )}

                </g>

                {/* Canvas Boundary Border */}
                <rect
                  x="0"
                  y="0"
                  width={getCanvasDimensions().width}
                  height={getCanvasDimensions().height}
                  fill="none"
                  stroke={isDark ? '#3b82f6' : '#2563eb'}
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${6 / zoom},${4 / zoom}`}
                  opacity={0.7}
                />

                {/* Canvas size label - bottom right only */}
                <text
                  x={getCanvasDimensions().width - 80}
                  y={getCanvasDimensions().height - 10}
                  fill={isDark ? '#64748b' : '#64748b'}
                  fontSize={12 / zoom}
                  fontFamily="monospace"
                >
                  {getCanvasDimensions().width} × {getCanvasDimensions().height}
                </text>
              </g>
            </svg>
          </div>


          {/* Zoom Controls - Mobile Float - Above Footer */}
          <div
            className={`fixed bottom-[60px] right-[10px] items-center gap-1 px-2 py-1 rounded-lg liquid-glass-strong ${isDark ? 'bg-slate-800/90' : 'bg-white/90'
              } shadow-lg flex z-40`}
          >
            <TooltipWrapper title={<div className="flex items-center gap-2"><span>{t.zoomOut}</span><ShortcutBadge shortcut="-" variant="primary" /></div>}>
              <button
                aria-label={t.zoomOut}
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
                className={`w-7 h-7 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                  }`}
              >
                −
              </button>
            </TooltipWrapper>
            <button
              type="button"
              onClick={resetView}
              onMouseDown={handleZoomMouseDown}
              onWheel={handleZoomWheel}
              className={`text-xs font-mono w-12 text-center cursor-pointer select-none rounded transition-colors ${isDraggingZoom
                ? 'text-blue-400'
                : isDark
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
              title={t.dragToZoomOrScroll}
            >
              {Math.round(zoom * 100)}%
            </button>
            <TooltipWrapper title={<div className="flex items-center gap-2"><span>{t.zoomIn}</span><ShortcutBadge shortcut="+" variant="primary" /></div>}>
              <button
                aria-label={t.zoomIn}
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
                className={`w-7 h-7 flex items-center justify-center rounded ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                  }`}
              >
                +
              </button>
            </TooltipWrapper>
            <div className={`w-px h-5 ${isDark ? 'bg-slate-600' : 'bg-slate-300'} mx-1`} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={resetView}
                  className={`px-2 py-1 text-xs rounded ui-hover-surface ${isDark
                    ? 'text-slate-300 hover:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900'
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
          </div>

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
              className={`w-7 h-7 flex items-center justify-center rounded ui-hover-surface ${isDark ? 'text-slate-300 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              −
            </button>
            <span
              onMouseDown={handleZoomMouseDown}
              onWheel={handleZoomWheel}
              className={`text-xs font-mono w-12 text-center cursor-pointer select-none rounded transition-colors ${isDraggingZoom
                ? 'text-blue-400'
                : isDark
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-slate-600 hover:bg-slate-100'
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
              className={`w-7 h-7 flex items-center justify-center rounded ui-hover-surface ${isDark ? 'text-slate-300 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              +
            </button>
            <div className={`w-px h-5 ${isDark ? 'bg-slate-600' : 'bg-slate-300'} mx-1`} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={resetView}
                  className={`px-2 py-1 text-xs rounded ui-hover-surface ${isDark
                    ? 'text-slate-300 hover:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'text-slate-300 hover:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900'
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
          <div
            className={`hidden print:block print:w-full print:h-auto`}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${getCanvasDimensions().width} ${getCanvasDimensions().height}`}
              className="print:w-full print:h-auto"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const canvasDims = getCanvasDimensions();
                const x = ((e.clientX - rect.left) / rect.width) * canvasDims.width;
                const y = ((e.clientY - rect.top) / rect.height) * canvasDims.height;
                // Pan to clicked location (center)
                const newPanX = -(x - 400 / zoom) * zoom;
                const newPanY = -(y - 200 / zoom) * zoom;
                setPan({ x: newPanX, y: newPanY });
              }}
            >
              {/* Canvas background */}
              <defs>
                <radialGradient id="canvasBgGradient" cx="46%" cy="30%" r="88%">
                  {isDark ? (
                    <>
                      <stop offset="0%" stopColor="#15243a" />
                      <stop offset="25%" stopColor="#132035" />
                      <stop offset="50%" stopColor="#101b2e" />
                      <stop offset="75%" stopColor="#0e1829" />
                      <stop offset="100%" stopColor="#0b1424" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#fbfdff" />
                      <stop offset="25%" stopColor="#f6faff" />
                      <stop offset="50%" stopColor="#f1f7ff" />
                      <stop offset="75%" stopColor="#ecf3fb" />
                      <stop offset="100%" stopColor="#e6eef8" />
                    </>
                  )}
                </radialGradient>
                <radialGradient id="canvasSoftGlow" cx="20%" cy="15%" r="75%">
                  {isDark ? (
                    <>
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
                      <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="#0b1220" stopOpacity="0" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.18" />
                      <stop offset="45%" stopColor="#a5b4fc" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#f8fbff" stopOpacity="0" />
                    </>
                  )}
                </radialGradient>
                <filter id="packetGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background */}
              <rect
                x="0"
                y="0"
                width={getCanvasDimensions().width}
                height={getCanvasDimensions().height}
                fill="url(#canvasBgGradient)"
              />
              <rect
                x="0"
                y="0"
                width={getCanvasDimensions().width}
                height={getCanvasDimensions().height}
                fill="url(#canvasSoftGlow)"
              />

              {/* Connections */}
              {connections.map((conn) => {
                const sourceDevice = deviceMap.get(conn.sourceDeviceId);
                const targetDevice = deviceMap.get(conn.targetDeviceId);
                if (!sourceDevice || !targetDevice) return null;

                const sourceX = sourceDevice.x + ((sourceDevice.type === 'pc' || sourceDevice.type === 'iot') ? 45 : 50);
                const sourceY = sourceDevice.y + ((sourceDevice.type === 'pc' || sourceDevice.type === 'iot') ? 45 : 60);
                const targetX = targetDevice.x + ((targetDevice.type === 'pc' || targetDevice.type === 'iot') ? 45 : 50);
                const targetY = targetDevice.y + ((targetDevice.type === 'pc' || targetDevice.type === 'iot') ? 45 : 60);

                return (
                  <line
                    key={conn.id}
                    x1={sourceX}
                    y1={sourceY}
                    x2={targetX}
                    y2={targetY}
                    stroke={conn.cableType === 'straight' ? '#3b82f6' : conn.cableType === 'crossover' ? '#f97316' : '#06b6d4'}
                    strokeWidth="2"
                    opacity="0.7"
                  />
                );
              })}

              {/* Devices */}
              {devicesSortedForRender.map((device) => {
                const deviceWidth = getDeviceWidth(device.type);
                const deviceHeight = getDeviceHeight(device.type, device.ports.length);
                const color = device.type === 'pc'
                  ? '#3b82f6'
                  : device.type === 'iot'
                    ? '#f97316'
                    : isSwitchDeviceType(device.type)
                      ? (device.switchModel === 'WS-C3650-24PS' ? '#a855f7' : '#22c55e')
                      : '#a855f7';

                return (
                  <g
                    key={device.id}
                    onMouseEnter={() => handleDeviceHover(device.id)}
                    onMouseLeave={handleDeviceMouseLeave}
                  >
                    {/* Device box */}
                    <rect
                      x={device.x}
                      y={device.y}
                      width={deviceWidth}
                      height={deviceHeight}
                      fill={color}
                      opacity="0.1"
                      stroke={color}
                      strokeWidth="2"
                      rx="4"
                    />

                    {/* Device label */}
                    <text
                      x={device.x + deviceWidth / 2}
                      y={device.y + deviceHeight / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="12"
                      fontWeight="bold"
                      fill={color}
                    >
                      {device.name}
                    </text>

                    {/* IP address if exists */}
                    {(() => {
                      // Validate IP format
                      const isValidIP = device.ip ? /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(device.ip) : false;
                      const isValidSubnet = device.subnet ? /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(device.subnet) : false;
                      const hasError = !isValidIP || !isValidSubnet;
                      const displayText = device.ip || t.noIp;

                      return (
                        <text
                          x={device.x + deviceWidth / 2}
                          y={device.y + deviceHeight / 2 + 16}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="10"
                          fill={hasError ? '#ef4444' : '#666'}
                          fontWeight={hasError ? '700' : '400'}
                        >
                          {hasError ? '⚠ ' : ''}{displayText}
                        </text>
                      );
                    })()}
                  </g>
                );
              })}

              {/* Notes */}
              {visibleNotes.map((note) => (
                <g key={note.id}>
                  {/* Note background */}
                  <rect
                    x={note.x}
                    y={note.y}
                    width={note.width}
                    height={note.height}
                    fill={getNoteGradientFill(note.color)}
                    opacity={note.opacity}
                    stroke="#999"
                    strokeWidth="1"
                    rx="4"
                  />

                  {/* Note text */}
                  <text
                    x={note.x + 8}
                    y={note.y + 20}
                    fontSize={note.fontSize}
                    fill="#000000"
                    fontFamily={note.font}
                    fontWeight={note.bold ? 'bold' : 'normal'}
                    fontStyle={note.italic ? 'italic' : 'normal'}
                    textDecoration={note.underline ? 'underline' : 'none'}
                  >
                    {note.text.split('\n').map((line, i) => (
                      <tspan key={i} x={note.x + 8} dy={i === 0 ? 0 : note.fontSize + 2}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              ))}
            </svg>
          </div>

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
      {configuringDevice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal" onClick={cancelDeviceConfig}>
          <div className="absolute inset-0 bg-slate-950/40" />
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-[2rem] border transition-all duration-500 hover:shadow-cyan-500/10 ${isDark ? 'bg-slate-900/80 border-slate-800/50 shadow-2xl' : 'bg-white/90 border-slate-200/50 shadow-2xl'
              }`}
            onClick={e => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelDeviceConfig();
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                confirmDeviceConfig();
              }
            }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-config-title"
          >
            {/* Modal Header */}
            <div className={`${isMobile ? 'px-4 pt-4 pb-3' : 'px-6 pt-6 pb-4'} border-b ${isDark ? 'border-slate-800/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50/50'}`}>
              <div className="flex items-center gap-4">
                <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-2xl shadow-inner ${isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-100'}`}>
                  <svg className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} drop-shadow-sm`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0 -2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0 -1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 1 1 -6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 id="device-config-title" className={`${isMobile ? 'text-lg' : 'text-xl'} font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {t.configure}
                  </h3>
                  <div className={`text-[10px] font-bold tracking-widest opacity-30 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {configuringDeviceData?.name}
                  </div>
                </div>
              </div>
            </div>

            <div className={`${isMobile ? 'p-4 space-y-4' : 'p-6 space-y-6'}`}>
              {/* Hostname */}
              <div className="space-y-2">
                <label className={`text-[10px] font-black tracking-widest ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t.deviceName}
                </label>
                <div className="relative group">
                  <input
                    ref={configInputRef}
                    type="text"
                    value={tempNameValue}
                    onChange={(e) => setTempNameValue(e.target.value)}
                    className={`w-full ${isMobile ? 'px-4 py-2.5' : 'px-4 py-3'} rounded-2xl border transition-all duration-300 font-bold ${isDark
                      ? 'bg-slate-950/50 border-slate-800 text-white placeholder-slate-700 focus:border-cyan-500/50 focus:bg-slate-950 focus:ring-4 focus:ring-cyan-500/10'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500/50 focus:bg-white focus:ring-4 focus:ring-cyan-500/10'
                      } outline-none`}
                    placeholder={language === 'tr' ? 'Örn: Router-X' : 'e.g. Router-X'}
                  />
                </div>
              </div>

              {/* Device Info (MAC Address) */}
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                <div className={`text-[10px] font-black tracking-widest mb-2 opacity-70 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  {t.deviceInfo}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>MAC Address</span>
                  <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {configuringDeviceData?.macAddress ? normalizeMAC(configuringDeviceData.macAddress) : 'N/A'}
                  </span>
                </div>
              </div>

              {/* IP Configuration Section - Only for PCs */}
              {(configuringDeviceData?.type === 'pc' || configuringDeviceData?.type === 'iot') && (
                <div className={`${isMobile ? 'p-3' : 'p-4'} rounded-2xl border ${isDark ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                  <div className={`text-[10px] font-black tracking-widest ${isMobile ? 'mb-3' : 'mb-4'} opacity-70 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    {t.ipConfiguration}
                  </div>

                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                    <div className="space-y-1">
                      <label className={`text-[10px] font-bold tracking-widest ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {language === 'tr' ? 'IP Adresi' : 'IP Address'}
                      </label>
                      <input
                        type="text"
                        value={ipValue}
                        onChange={(e) => setIpValue(e.target.value)}
                        className={`w-full px-4 ${isMobile ? 'py-2' : 'py-2.5'} rounded-xl border font-mono font-bold transition-all duration-300 ${isDark
                          ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-700 focus:border-cyan-500/50'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-300 focus:border-cyan-500/50'
                          } outline-none`}
                        placeholder="192.168.1.1"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={`text-[10px] font-bold tracking-widest ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {language === 'tr' ? 'Alt Ağ Maskesi' : 'Subnet Mask'}
                      </label>
                      <input
                        type="text"
                        value={subnetValue}
                        onChange={(e) => setSubnetValue(e.target.value)}
                        className={`w-full px-4 ${isMobile ? 'py-2' : 'py-2.5'} rounded-xl border font-mono font-bold transition-all duration-300 ${isDark
                          ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-700 focus:border-cyan-500/50'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-300 focus:border-cyan-500/50'
                          } outline-none`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={`text-[10px] font-bold tracking-widest ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {language === 'tr' ? 'Ağ Geçidi' : 'Gateway'}
                      </label>
                      <input
                        type="text"
                        value={gatewayValue}
                        onChange={(e) => setGatewayValue(e.target.value)}
                        className={`w-full px-4 ${isMobile ? 'py-2' : 'py-2.5'} rounded-xl border font-mono font-bold transition-all duration-300 ${isDark
                          ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-700 focus:border-cyan-500/50'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-300 focus:border-cyan-500/50'
                          } outline-none`}
                        placeholder="192.168.1.1"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={`text-[10px] font-bold tracking-widest ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        IPv6
                      </label>
                      <input
                        type="text"
                        value={ipv6Value}
                        onChange={(e) => setIpv6Value(e.target.value)}
                        className={`w-full px-4 ${isMobile ? 'py-2' : 'py-2.5'} rounded-xl border font-mono font-bold transition-all duration-300 ${isDark
                          ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-700 focus:border-cyan-500/50'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-300 focus:border-cyan-500/50'
                          } outline-none`}
                        placeholder="2001:db8::10"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={`text-[10px] font-bold tracking-widest ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {language === 'tr' ? 'DNS Sunucusu' : 'DNS Server'}
                      </label>
                      <input
                        type="text"
                        value={dnsValue}
                        onChange={(e) => setDnsValue(e.target.value)}
                        className={`w-full px-4 ${isMobile ? 'py-2' : 'py-2.5'} rounded-xl border font-mono font-bold transition-all duration-300 ${isDark
                          ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-700 focus:border-cyan-500/50'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-300 focus:border-cyan-500/50'
                          } outline-none`}
                        placeholder="8.8.8.8"
                      />
                    </div>
                  </div>
                </div>
              )}

              {configError && (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                  {configError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2">
                <div className="flex gap-4">
                  <button
                    onClick={cancelDeviceConfig}
                    className={`flex-1 py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all duration-300 border ${isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                      }`}
                  >
                    {language === 'tr' ? 'İptal' : 'Cancel'}
                  </button>
                  <button
                    onClick={confirmDeviceConfig}
                    className="flex-1 py-3.5 rounded-2xl text-xs font-black tracking-widest bg-cyan-500 text-white hover:bg-cyan-400 shadow-xl shadow-cyan-500/20 active:scale-95 transition-all duration-300"
                  >
                    {language === 'tr' ? 'Kaydet' : 'Save'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

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
        />
      )}

      {/* Persistent Error Toast - ping başarısız olduğunda göster, kullanıcı kapatana kadar açık kalır */}
      {errorToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-3 rounded-lg shadow-2xl shadow-black/25 flex items-start gap-2 bg-red-600 text-white max-w-md">
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
                className="flex-shrink-0 ml-2 hover:bg-red-700 rounded p-1 transition-colors"
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
          <div className="px-4 py-3 rounded-lg shadow-2xl shadow-black/25 flex items-center gap-2 bg-red-600 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">{connectionError}</span>
          </div>
        </div>
      )}

      <LazyNetworkTopologyPortSelectorModal
        isOpen={showPortSelector}
        isDark={isDark}
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
            setSelectedSourcePort({ deviceId, portId });
            setPortSelectorStep('target');
          } else {
            // Complete connection
            const srcPort = selectedSourcePort as { deviceId: string; portId: string };
            const newConnection: CanvasConnection = {
              id: `conn-${Date.now()}`,
              sourceDeviceId: srcPort.deviceId,
              sourcePort: srcPort.portId,
              targetDeviceId: deviceId,
              targetPort: portId,
              cableType: cableInfo.cableType,
              active: true,
            };

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
          }
        }}
      />
      {/* Port Tooltip */}
      {
        !isDraggingInteractionDisabled && portTooltip && portTooltip.visible && (
          <div
            className={`fixed z-[100] pointer-events-none transition-opacity duration-300 ${portTooltip.visible ? 'opacity-100' : 'opacity-0'
              }`}
            style={{
              left: portTooltip.x,
              top: portTooltip.y - 35, // Increased distance from port (was -10)
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div
              className={`px-3 py-2 rounded-xl border liquid-glass-strong animate-scale-in shadow-2xl ${isDark
                ? 'border-slate-700/50 text-white shadow-cyan-500/10'
                : 'border-slate-200/50 text-slate-900 shadow-slate-200/50'
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${(() => {
                  const dev = deviceMap.get(portTooltip.deviceId);
                  const prt = dev?.ports.find(p => p.id === portTooltip.portId);
                  const devState = deviceStates?.get(portTooltip.deviceId);
                  const simPort = devState?.ports?.[portTooltip.portId];
                  const isSTPBlocked = simPort?.spanningTree?.state === 'blocking' || simPort?.spanningTree?.role === 'alternate';
                  const deviceVlan = dev?.vlan || simPort?.accessVlan || simPort?.vlan || 1;
                  const isVlan1 = deviceVlan === 1;
                  if (isSTPBlocked && isVlan1) return 'bg-pink-500';
                  return dev?.status === 'offline' || prt?.shutdown ? 'bg-red-500' : prt?.status === 'connected' ? 'bg-green-500' : 'bg-slate-400';
                })()
                  }`} />
                <span className="text-[10px] font-black tracking-widest opacity-30">
                  {portTooltip.portId}
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="text-xs font-bold">
                  {(() => {
                    const dev = deviceMap.get(portTooltip.deviceId);
                    if (dev?.type === 'iot') {
                      const kind = dev.iot?.kind;
                      const isControllable = kind === 'lamp' || kind === 'heater' || kind === 'cooler';
                      return (
                        <div className="space-y-0.5">
                          <div>
                            {language === 'tr' ? 'Cihaz Durumu:' : 'Device Status:'}{' '}
                            <span className="text-cyan-500">{getIotDeviceStatus(dev)}</span>
                          </div>
                          <div>
                            {language === 'tr' ? 'Güç Durumu:' : 'Power Status:'}{' '}
                            <span className="text-cyan-500">{getIotPowerStatus(dev)}</span>
                          </div>
                          {isControllable && (
                            <div>
                              {language === 'tr' ? 'Açık/Kapalı:' : 'Open/Closed:'}{' '}
                              <span className="text-cyan-500">{getIotOpenCloseStatus(dev)}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <>
                        VLAN:{' '}
                        <span className="text-cyan-500">
                          {getLivePortVlanText(portTooltip.deviceId, portTooltip.portId)}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div className="text-xs font-bold">
                  {language === 'tr' ? 'Durum:' : 'Status:'}{' '}
                  <span className={
                    (() => {
                      const dev = deviceMap.get(portTooltip.deviceId);
                      const prt = dev?.ports.find(p => p.id === portTooltip.portId);
                      const devState = deviceStates?.get(portTooltip.deviceId);
                      const simPort = devState?.ports?.[portTooltip.portId];
                      const isSTPBlocked = simPort?.spanningTree?.state === 'blocking' || simPort?.spanningTree?.role === 'alternate';
                      const deviceVlan = dev?.vlan || simPort?.accessVlan || simPort?.vlan || 1;
                      const isVlan1 = deviceVlan === 1;
                      if (isSTPBlocked && isVlan1) return 'text-pink-500';
                      return dev?.status === 'offline' || prt?.shutdown ? 'text-red-500' : prt?.status === 'connected' ? 'text-green-500' : 'text-slate-400';
                    })()
                  }>
                    {(() => {
                      const dev = deviceMap.get(portTooltip.deviceId);
                      const prt = dev?.ports.find(p => p.id === portTooltip.portId);
                      const devState = deviceStates?.get(portTooltip.deviceId);
                      const simPort = devState?.ports?.[portTooltip.portId];
                      const isSTPBlocked = simPort?.spanningTree?.state === 'blocking' || simPort?.spanningTree?.role === 'alternate';

                      if (dev?.status === 'offline') {
                        return language === 'tr' ? 'Cihaz Kapalı' : 'Device Off';
                      }
                      if (isSTPBlocked) {
                        const role = simPort?.spanningTree?.role || '';
                        const state = simPort?.spanningTree?.state || '';
                        const roleMap: Record<string, string> = { 'root': 'Root', 'designated': 'Desg', 'alternate': 'Altn', 'backup': 'Back' };
                        const stateMap: Record<string, string> = { 'forwarding': 'FWD', 'blocking': 'BLK', 'listening': 'LIS', 'learning': 'LRN' };
                        const roleText = roleMap[role] || role;
                        const stateText = stateMap[state] || state;
                        return language === 'tr' ? `STP Bloke (${roleText} ${stateText})` : `STP Blocked (${roleText} ${stateText})`;
                      }
                      if (prt?.shutdown) {
                        return language === 'tr' ? 'Kapalı (Shutdown)' : 'Shutdown';
                      }
                      if (prt?.status === 'connected') {
                        return language === 'tr' ? 'Bağlı (Up)' : 'Connected (Up)';
                      }
                      return language === 'tr' ? 'Bağlı Değil (Down)' : 'Not Connected (Down)';
                    })()
                    }
                  </span>
                </div>

                {(() => {
                  const dev = deviceMap.get(portTooltip.deviceId);
                  const prt = dev?.ports.find(p => p.id === portTooltip.portId);
                  if (prt?.ipAddress) {
                    return (
                      <div className="text-xs font-bold">
                        IP:{' '}
                        <span className="text-amber-400">
                          {prt.ipAddress}{prt.subnetMask ? `/${prt.subnetMask}` : ''}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {deviceMap.get(portTooltip.deviceId)?.ports.find(p => p.id === portTooltip.portId)?.status === 'connected' && (
                  <div className="text-[10px] opacity-70">
                    {language === 'tr' ? 'Fiziksel bağlantı aktif' : 'Physical link active'}
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${isDark ? 'border-t-slate-800' : 'border-t-white'
                }`} />
            </div>
          </div>
        )}

      {/* Device Tooltip */}
      {
        !isDraggingInteractionDisabled && deviceTooltip && deviceTooltip.visible && (
          <div
            className={`fixed z-[100] pointer-events-none transition-opacity duration-300 ${deviceTooltip.visible ? 'opacity-100' : 'opacity-0'
              }`}
            style={{
              left: deviceTooltip.x,
              top: deviceTooltip.y + 20, // Display below the device icon
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className={`px-4 py-3 rounded-2xl border liquid-glass-strong min-w-[200px] animate-scale-in shadow-2xl ${isDark
                ? 'border-slate-700/50 text-white shadow-cyan-500/10'
                : 'border-slate-200/50 text-slate-900 shadow-slate-200/40'
                }`}
            >
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                  {(() => {
                    const dev = deviceMap.get(deviceTooltip.deviceId);
                    if (dev?.type === 'pc' || dev?.type === 'iot') return <Monitor className="w-3.5 h-3.5" />;
                    if (dev?.type === 'router') return <Network className="w-3.5 h-3.5" />;
                    return <Laptop className="w-3.5 h-3.5" />;
                  })()}
                </div>
                <div>
                  <div className="text-[10px] font-black tracking-widest opacity-30 leading-none">
                    {deviceMap.get(deviceTooltip.deviceId)?.type.toUpperCase()}
                  </div>
                  <div className="text-sm font-black tracking-tight leading-none mt-1">
                    {deviceMap.get(deviceTooltip.deviceId)?.name}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                {(() => {
                  const dev = deviceMap.get(deviceTooltip.deviceId);
                  if (!dev) return null;

                  return (
                    <>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.ipAddress}</span>
                        <span className="text-xs font-mono font-bold text-cyan-500">{dev.ip || '0.0.0.0'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.subnetMask}</span>
                        <span className="text-xs font-mono font-bold opacity-80">{dev.subnet || '255.255.255.0'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.gateway}</span>
                        <span className="text-xs font-mono font-bold opacity-80">{dev.gateway || '0.0.0.0'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">IPv6</span>
                        <span className="text-xs font-mono font-bold opacity-80">{dev.ipv6 || '::'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.dnsServer}</span>
                        <span className="text-xs font-mono font-bold opacity-80">{dev.dns || '0.0.0.0'}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.macAddress}</span>
                        <span className="text-[10px] font-mono opacity-30">{dev.macAddress ? normalizeMAC(dev.macAddress) : 'N/A'}</span>
                      </div>

                      {(dev.type === 'pc' || dev.type === 'iot') && (
                        <div className="flex justify-between items-center gap-4 mt-1 pt-1 border-t border-white/5">
                          <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.dhcpEnabled}</span>
                          <span className={`text-[10px] font-black tracking-widest ${dev.ipConfigMode === 'dhcp' ? 'text-green-500' : 'opacity-40'}`}>
                            {dev.ipConfigMode === 'dhcp' ? (isTR ? 'EVET' : 'YES') : (isTR ? 'HAYIR' : 'NO')}
                          </span>
                        </div>
                      )}

                      {dev.services && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <div className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-1">{t.openServices}</div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {dev.services.http?.enabled && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 text-[9px] font-black tracking-widest border border-amber-500/20">HTTP</span>
                            )}
                            {dev.services.dns?.enabled && (
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-500 text-[9px] font-black tracking-widest border border-blue-500/20">DNS</span>
                            )}
                            {dev.services.dhcp?.enabled && (
                              <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-500 text-[9px] font-black tracking-widest border border-purple-500/20">DHCP</span>
                            )}
                            {dev.services.ftp?.enabled && (
                              <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-500 text-[9px] font-black tracking-widest border border-cyan-500/20">FTP</span>
                            )}
                            {dev.services.mail?.enabled && (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-500 text-[9px] font-black tracking-widest border border-rose-500/20">MAIL</span>
                            )}
                            {(!dev.services.http?.enabled && !dev.services.dns?.enabled && !dev.services.dhcp?.enabled && !dev.services.ftp?.enabled && !dev.services.mail?.enabled) && (
                              <span className="text-[9px] opacity-40 italic">{isTR ? 'Servis yok' : 'No services'}</span>
                            )}
                          </div>

                          {dev.services?.dhcp?.pools && dev.services.dhcp.pools.length > 0 && (
                            <div className="space-y-1 mt-2 pt-2 border-t border-white/5">
                              <div className="text-[9px] font-bold opacity-30 uppercase tracking-wider">{isTR ? 'DHCP Pool' : 'DHCP Pool'}</div>
                              {dev.services.dhcp.pools.map((pool, idx) => (
                                <div key={idx} className="text-[9px] space-y-0.5 bg-purple-500/10 rounded p-1.5">
                                  <div className="flex justify-between"><span className="opacity-50">Pool:</span><span className="font-mono">{pool.poolName}</span></div>
                                  <div className="flex justify-between"><span className="opacity-50">IP:</span><span className="font-mono">{pool.startIp}</span></div>
                                  <div className="flex justify-between"><span className="opacity-50">Mask:</span><span className="font-mono">{pool.subnetMask}</span></div>
                                  <div className="flex justify-between"><span className="opacity-50">GW:</span><span className="font-mono">{pool.defaultGateway}</span></div>
                                  <div className="flex justify-between"><span className="opacity-50">Max:</span><span className="font-mono">{pool.maxUsers}</span></div>
                                </div>
                              ))}
                            </div>
                          )}

                          {dev.services?.dns?.records && dev.services.dns.records.length > 0 && (
                            <div className="space-y-1 mt-2 pt-2 border-t border-white/5">
                              <div className="text-[9px] font-bold opacity-30 uppercase tracking-wider">{isTR ? 'DNS Kayıtları' : 'DNS Records'}</div>
                              {dev.services.dns.records.map((record, idx) => (
                                <div key={idx} className="text-[9px] flex justify-between items-center gap-2 bg-blue-500/10 rounded px-1.5 py-0.5">
                                  <span className="font-mono text-blue-400 truncate max-w-[80px]">{record.domain}</span>
                                  <span className="opacity-50">→</span>
                                  <span className="font-mono">{record.address}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {dev.services.http?.enabled && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <div className="text-[9px] flex justify-between items-center">
                                <span className="opacity-60 uppercase tracking-wider">{isTR ? 'HTTP Sunucu' : 'HTTP Server'}</span>
                                <span className="text-green-500 text-[9px] font-bold">✓ {isTR ? 'Aktif' : 'Active'}</span>
                              </div>
                              {dev.services.http.content && (
                                <div className="text-[8px] opacity-50 mt-1 truncate">{dev.services.http.content.substring(0, 50)}...</div>
                              )}
                            </div>
                          )}

                          {dev.services.ftp?.enabled && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <div className="text-[9px] flex justify-between items-center">
                                <span className="opacity-60 uppercase tracking-wider">FTP Server</span>
                                <span className="text-cyan-500 text-[9px] font-bold">✓ {isTR ? 'Aktif' : 'Active'}</span>
                              </div>
                              <div className="text-[8px] opacity-50 mt-1">
                                {dev.services.ftp.anonymousAccess
                                  ? (isTR ? 'Anonim erişim açık' : 'Anonymous access enabled')
                                  : (isTR ? 'Kullanıcı girişi gerekli' : 'User login required')}
                              </div>
                            </div>
                          )}

                          {dev.services.mail?.enabled && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <div className="text-[9px] flex justify-between items-center">
                                <span className="opacity-60 uppercase tracking-wider">MAIL Server</span>
                                <span className="text-rose-500 text-[9px] font-bold">✓ {isTR ? 'Aktif' : 'Active'}</span>
                              </div>
                              <div className="text-[8px] opacity-50 mt-1 truncate">
                                {dev.services.mail.domain || 'local.lan'}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Arrow */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] ${isDark ? 'border-b-slate-900' : 'border-b-white'
                }`} />
            </div>
          </div>
        )}




      {/* Toast Notification */}
      {errorToast && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed bottom-4 left-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 z-40 ${errorToast.type === 'success'
            ? isDark ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : isDark ? 'bg-red-500/20 border border-red-500/50 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
            }`}
        >
          {errorToast.message}
        </div>
      )}
    </div>
  );
}



const normalizeWifiMode = (mode: string | undefined) => {
  const normalized = (mode || 'disabled').toLowerCase();
  if (normalized === 'sta') return 'client';
  if (normalized === 'ap' || normalized === 'client' || normalized === 'disabled') return normalized;
  return 'disabled';
};


