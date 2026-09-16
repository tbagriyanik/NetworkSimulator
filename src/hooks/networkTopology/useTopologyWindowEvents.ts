import { useEffect, useRef, RefObject, Dispatch, SetStateAction } from 'react';
import { CanvasDevice, CanvasConnection, CanvasNote, ContextMenuState } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { getDeviceCenter } from '@/components/network/NetworkTopology/utils/networkTopology.helpers';
import { MIN_ZOOM, MAX_ZOOM } from '@/components/network/NetworkTopology/utils/networkTopology.constants';
import type { PingAnimationState } from './usePingSequence';

interface UseTopologyWindowEventsProps {
  canvasRef: RefObject<HTMLDivElement | null>;
  setZoom: Dispatch<SetStateAction<number>>;
  setPan: Dispatch<SetStateAction<{ x: number; y: number }>>;
  zoomToFit: () => void;
  setIsMinimapOpen: Dispatch<SetStateAction<boolean>>;
  setShowLogPanel: Dispatch<SetStateAction<boolean>>;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  setPacketPopupHop: Dispatch<SetStateAction<number | null>>;
  setPingAnimation: Dispatch<SetStateAction<PingAnimationState | null>>;
  setHopPacketInfos: Dispatch<SetStateAction<any>>;
  saveToHistory: () => void;
  setDevices: Dispatch<SetStateAction<CanvasDevice[]>>;
  deleteConnection: (connectionId: string) => void;
  focusDeviceId?: string | null;
  deviceMap: Map<string, CanvasDevice>;
  zoom: number;
  onPanChange?: (pan: { x: number; y: number }) => void;
  onTopologyChange?: (devices: CanvasDevice[], connections: CanvasConnection[], notes: CanvasNote[]) => void;
  devices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  notes: CanvasNote[];
  portTooltipTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  connectionTooltipTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  wheelSyncTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
}

export function useTopologyWindowEvents({
  canvasRef,
  setZoom,
  setPan,
  zoomToFit,
  setIsMinimapOpen,
  setShowLogPanel,
  setContextMenu,
  setPacketPopupHop,
  setPingAnimation,
  setHopPacketInfos,
  saveToHistory,
  setDevices,
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
}: UseTopologyWindowEventsProps) {
  const lastStateRef = useRef<string>('');
  const topologyChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wheel and middle-click auto-scroll prevention on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
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
        if (isEditable || noteScrollHost) return;
      }

      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const viewportCenterX = rect.width / 2;
      const viewportCenterY = rect.height / 2;

      const zoomSensitivity = 0.0015;
      const delta = -e.deltaY;

      setZoom((prevZoom) => {
        let newZoom = prevZoom * Math.exp(delta * zoomSensitivity);
        newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));

        if (newZoom !== prevZoom) {
          setPan((prevPan) => {
            const zoomFactor = newZoom / prevZoom;
            return {
              x: viewportCenterX - (viewportCenterX - prevPan.x) * zoomFactor,
              y: viewportCenterY - (viewportCenterY - prevPan.y) * zoomFactor,
            };
          });
        }

        return newZoom;
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, [canvasRef, setPan, setZoom]);

  // Window shortcut and reset custom event listeners
  useEffect(() => {
    const handleZoomToFitEvent = () => zoomToFit();
    const handleToggleMinimapEvent = () => setIsMinimapOpen((prev) => !prev);
    const handleToggleLogEvent = () => setShowLogPanel((prev) => !prev);

    window.addEventListener('trigger-topology-zoom-to-fit', handleZoomToFitEvent);
    window.addEventListener('trigger-topology-toggle-minimap', handleToggleMinimapEvent);
    window.addEventListener('trigger-topology-toggle-network-log', handleToggleLogEvent);

    return () => {
      window.removeEventListener('trigger-topology-zoom-to-fit', handleZoomToFitEvent);
      window.removeEventListener('trigger-topology-toggle-minimap', handleToggleMinimapEvent);
      window.removeEventListener('trigger-topology-toggle-network-log', handleToggleLogEvent);
    };
  }, [zoomToFit, setIsMinimapOpen, setShowLogPanel]);

  // Mobile back event listener
  useEffect(() => {
    const handleMobileBack = () => {
      setContextMenu(null);
      setPacketPopupHop(null);
    };
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack);
  }, [setContextMenu, setPacketPopupHop]);

  // Network refresh listener
  useEffect(() => {
    const handler = () => {
      setPacketPopupHop(null);
      setPingAnimation(null);
      setHopPacketInfos([]);
    };
    window.addEventListener('network-refresh', handler);
    return () => window.removeEventListener('network-refresh', handler);
  }, [setPacketPopupHop, setPingAnimation, setHopPacketInfos]);

  // Device config updates & connection deletions from external panels
  useEffect(() => {
    const handleUpdateDeviceConfig = (event: CustomEvent<{ deviceId: string; config: Partial<CanvasDevice> }>) => {
      const { deviceId, config } = event.detail;
      if (!deviceId) return;

      saveToHistory();
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, ...config } : d))
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

  // External focus device centering
  useEffect(() => {
    if (focusDeviceId && deviceMap.get(focusDeviceId)) {
      const device = deviceMap.get(focusDeviceId);
      if (device && canvasRef.current) {
        const deviceCenter = getDeviceCenter(device);
        const { width: canvasWidth, height: canvasHeight } = canvasRef.current.getBoundingClientRect();

        const targetPanX = canvasWidth / 2 - deviceCenter.x * zoom;
        const targetPanY = canvasHeight / 2 - deviceCenter.y * zoom;

        setPan({ x: targetPanX, y: targetPanY });

        if (onPanChange) {
          onPanChange({ x: targetPanX, y: targetPanY });
        }
      }
    }
  }, [focusDeviceId, zoom, onPanChange, deviceMap, canvasRef, setPan]);

  // Debounced topology change notifications
  useEffect(() => {
    if (!onTopologyChange) return;
    if (topologyChangeTimerRef.current) clearTimeout(topologyChangeTimerRef.current);
    topologyChangeTimerRef.current = setTimeout(() => {
      const currentState = JSON.stringify({ devices, connections: topologyConnections, notes });
      if (currentState !== lastStateRef.current) {
        lastStateRef.current = currentState;
        onTopologyChange(devices, topologyConnections, notes);
      }
      topologyChangeTimerRef.current = null;
    }, 150);
    return () => {
      if (topologyChangeTimerRef.current) clearTimeout(topologyChangeTimerRef.current);
    };
  }, [devices, topologyConnections, notes, onTopologyChange]);

  // Timer cleanup on unmount
  useEffect(() => {
    return () => {
      if (portTooltipTimerRef.current) clearTimeout(portTooltipTimerRef.current);
      if (connectionTooltipTimerRef.current) clearTimeout(connectionTooltipTimerRef.current);
      if (wheelSyncTimerRef.current) clearTimeout(wheelSyncTimerRef.current);
    };
  }, [portTooltipTimerRef, connectionTooltipTimerRef, wheelSyncTimerRef]);
}


