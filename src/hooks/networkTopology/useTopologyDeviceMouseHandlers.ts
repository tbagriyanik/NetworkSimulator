import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasConnection, CanvasDevice, DeviceType, ContextMenuState } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { TopologyActivationEvent, TopologyPositionedEvent } from './topologyEventTypes';
import type { PingAnimationState } from './usePingSequence';
import type { HopPacketInfo } from '@/components/network/PingPacketInfoPanel';
import { isSwitchDeviceType, getOptimalTargetPort } from '@/components/network/NetworkTopology/utils/networkTopology.helpers';

export interface UseTopologyDeviceMouseHandlersOptions {
  devices: CanvasDevice[];
  deviceMap: Map<string, CanvasDevice>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  selectedDeviceIds: string[];
  selectedDeviceIdsRef: React.MutableRefObject<string[]>;
  wasDraggingRef: React.MutableRefObject<boolean>;
  activePointerDragRef: React.MutableRefObject<boolean>;
  activeDragPointerIdRef: React.MutableRefObject<number | null>;
  setSelectedDeviceIds: (ids: string[]) => void;
  setSelectedNoteIds: (ids: string[]) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  onDeviceSelect: (type: DeviceType, id?: string, model?: string, name?: string) => void;
  onDeviceDoubleClick?: (type: DeviceType, id: string) => void;
  saveToHistory: () => void;
  startDeviceDrag: (e: TopologyPositionedEvent, deviceId: string, newSelectedIds: string[], initialPositions: { [key: string]: { x: number; y: number } }) => void;
  startPingAnimationRef: React.MutableRefObject<((sourceId: string, targetId: string) => void) | null>;
  pingMode: boolean;
  pingModeRef: React.MutableRefObject<boolean>;
  pingSource: CanvasDevice | null;
  pingSourceRef: React.MutableRefObject<CanvasDevice | null>;
  pingIsPausedRef: React.MutableRefObject<boolean>;
  pingStepModeRef: React.MutableRefObject<boolean>;
  pingAnimationRef: React.MutableRefObject<number | null>;
  pingCleanupTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setPingMode: (value: boolean) => void;
  setPingSource: (source: CanvasDevice | null) => void;
  setPingResult: (result: { success: boolean; message: string } | null) => void;
  setPingAnimation: React.Dispatch<React.SetStateAction<PingAnimationState | null>>;
  setHopPacketInfos: React.Dispatch<React.SetStateAction<HopPacketInfo[]>>;
  setPacketPopupHop: React.Dispatch<React.SetStateAction<number | null>>;
  isDrawingConnectionRef?: React.MutableRefObject<boolean>;
  connectionStartRef?: React.MutableRefObject<{ deviceId: string; portId: string; point: { x: number; y: number } } | null>;
  topologyConnections?: CanvasConnection[];
  handlePortClick?: (e: TopologyActivationEvent, deviceId: string, portId: string) => void;
}

export function useTopologyDeviceMouseHandlers({
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
  isDrawingConnectionRef,
  connectionStartRef,
  topologyConnections,
  handlePortClick,
}: UseTopologyDeviceMouseHandlersOptions) {
  const lastTapTimeRef = useRef(0);
  const lastTappedDeviceRef = useRef<string | null>(null);

  const handleDeviceMouseDown = useCallback(
    (e: TopologyPositionedEvent, deviceId: string) => {
      e.stopPropagation();
      if (!canvasRef.current) return;

      if (isDrawingConnectionRef?.current && connectionStartRef?.current) {
        return;
      }

      const device = deviceMap.get(deviceId);
      if (!device) return;

      const currentPingMode = pingModeRef.current || pingMode;
      const currentPingSource = pingSourceRef.current || pingSource;
      if (currentPingMode || currentPingSource) {
        if (!currentPingSource) {
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

          return;
        } else {
          if (device.id === currentPingSource.id) return;
          setPingMode(false);
          pingModeRef.current = false;
          setPingSource(null);
          pingSourceRef.current = null;
          setPacketPopupHop(null);
          startPingAnimationRef.current?.(currentPingSource.id, device.id);
          return;
        }
      }

      saveToHistory();
      wasDraggingRef.current = false;
      canvasRef.current?.focus();

      let newSelectedIds: string[];
      const currentSelectedIds = [...selectedDeviceIdsRef.current];

      if (e.shiftKey) {
        newSelectedIds = currentSelectedIds.includes(deviceId)
          ? currentSelectedIds.filter((id) => id !== deviceId)
          : [...currentSelectedIds, deviceId];

        if (newSelectedIds.length > 0) {
          const firstSelectedDevice = deviceMap.get(newSelectedIds[0]);
          if (firstSelectedDevice) {
            onDeviceSelect(firstSelectedDevice.type, newSelectedIds[0], undefined, firstSelectedDevice.name);
          }
        }
        // Deselecting the last shifted device needs no onDeviceSelect() call:
        // the selection is already cleared by setSelectedDeviceIds below, and
        // every implementation of onDeviceSelect returns early on a falsy
        // deviceId (see applyDeviceSelection in useAppNavigation.ts). The old
        // call passed nulls through three `as unknown as` assertions to reach
        // that no-op; keeping it would mean keeping those type lies.

        setSelectedDeviceIds(newSelectedIds);
        document.body.style.cursor = 'copy';
      } else {
        if (!currentSelectedIds.includes(deviceId)) {
          newSelectedIds = [deviceId];
          setSelectedDeviceIds(newSelectedIds);
          onDeviceSelect(device.type, deviceId, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);
        } else {
          newSelectedIds = currentSelectedIds;
        }
      }

      const initialPositions: { [key: string]: { x: number; y: number } } = {};
      devices.forEach((d) => {
        if (newSelectedIds.includes(d.id)) {
          initialPositions[d.id] = { x: d.x, y: d.y };
        }
      });
      startDeviceDrag(e, deviceId, newSelectedIds, initialPositions);
    },
    [
      devices,
      selectedDeviceIds,
      onDeviceSelect,
      pingMode,
      pingSource,
      startDeviceDrag,
      deviceMap,
      saveToHistory,
      setPingSource,
      setPingResult,
      setPingAnimation,
      setHopPacketInfos,
      setPacketPopupHop,
      setPingMode,
      isDrawingConnectionRef,
      connectionStartRef,
    ]
  );

  const handleDeviceClick = useCallback(
    (e: TopologyActivationEvent, device: CanvasDevice) => {
      e.stopPropagation();

      setContextMenu(null);

      if (isDrawingConnectionRef?.current && connectionStartRef?.current) {
        if (connectionStartRef.current.deviceId === device.id) {
          if (device.ports[0] && handlePortClick) {
            handlePortClick(e, device.id, device.ports[0].id);
          }
          return;
        }

        const sourceDevice = deviceMap.get(connectionStartRef.current.deviceId);
        const targetPort = getOptimalTargetPort(device, connectionStartRef.current, topologyConnections, sourceDevice);

        if (targetPort && handlePortClick) {
          handlePortClick(e, device.id, targetPort.id);
        } else if (device.ports[0] && handlePortClick) {
          handlePortClick(e, device.id, device.ports[0].id);
        }
        return;
      }

      if (wasDraggingRef.current) return;

      if (pingModeRef.current || pingSourceRef.current) {
        return;
      }

      setSelectedNoteIds([]);

      if (!e.shiftKey) {
        onDeviceSelect(device.type, device.id, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);
        if (!e.isTrusted) {
          setSelectedDeviceIds([device.id]);
        }
      }
      canvasRef.current?.focus();
    },
    [
      onDeviceSelect,
      pingMode,
      pingSource,
      setContextMenu,
      isDrawingConnectionRef,
      connectionStartRef,
      topologyConnections,
      handlePortClick,
      setSelectedNoteIds,
      setSelectedDeviceIds,
      canvasRef,
      wasDraggingRef,
      pingModeRef,
      pingSourceRef,
    ]
  );

  const handleDeviceDoubleClick = useCallback(
    (device: CanvasDevice) => {
      if (onDeviceDoubleClick) {
        onDeviceDoubleClick(device.type, device.id);
      } else {
        if (device.type === 'pc' || device.type === 'iot') {
          onDeviceSelect('pc', device.id, undefined, device.name);
        } else if (isSwitchDeviceType(device.type) || device.type === 'router') {
          onDeviceSelect(device.type, device.id, isSwitchDeviceType(device.type) ? device.switchModel : undefined, device.name);
        }
      }
    },
    [onDeviceDoubleClick, onDeviceSelect]
  );

  const handleDevicePointerDown = useCallback(
    (e: ReactPointerEvent<SVGGElement>, deviceId: string) => {
      if (e.pointerType === 'mouse') return;
      if (activeDragPointerIdRef.current !== null) return;

      if (isDrawingConnectionRef?.current && connectionStartRef?.current) {
        e.preventDefault();
        e.stopPropagation();
        const device = deviceMap.get(deviceId);
        if (device) {
          if (connectionStartRef.current.deviceId === deviceId) {
            if (device.ports[0] && handlePortClick) {
              handlePortClick(e, deviceId, device.ports[0].id);
            }
            return;
          }

          const availablePort = device.ports.find((p) => {
            const isConnected = topologyConnections?.some(
              (c) =>
                (c.sourceDeviceId === device.id && c.sourcePort === p.id) ||
                (c.targetDeviceId === device.id && c.targetPort === p.id)
            ) || p.status === 'connected';
            return !isConnected;
          });

          if (availablePort && handlePortClick) {
            handlePortClick(e, device.id, availablePort.id);
          } else if (device.ports[0] && handlePortClick) {
            handlePortClick(e, device.id, device.ports[0].id);
          }
        }
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      activePointerDragRef.current = true;
      activeDragPointerIdRef.current = e.pointerId;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // SVG pointer capture fallback
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

      handleDeviceMouseDown(e, deviceId);
    },
    [
      handleDeviceMouseDown,
      deviceMap,
      handleDeviceDoubleClick,
      isDrawingConnectionRef,
      connectionStartRef,
      topologyConnections,
      handlePortClick,
      activeDragPointerIdRef,
      activePointerDragRef,
    ]
  );

  return { handleDeviceMouseDown, handleDeviceClick, handleDeviceDoubleClick, handleDevicePointerDown };
}


