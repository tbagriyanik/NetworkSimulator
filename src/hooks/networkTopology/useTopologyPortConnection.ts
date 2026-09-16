'use client';

import { useCallback, useRef, MouseEvent as ReactMouseEvent } from 'react';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { CableInfo, CableType } from '@/lib/network/types';
import { isCableCompatible } from '@/lib/network/types';
import { getDeviceWidth, getDeviceHeight } from '@/components/network/NetworkTopology/utils/networkTopology.helpers';
import { PC_PORT_SPACING, PORT_SPACING, PORT_START_X } from '@/components/network/NetworkTopology/utils/networkTopology.constants';
import { getInferredCableTypeForPort } from '@/components/network/helpers/cableAutoSelection';

interface UseTopologyPortConnectionProps {
  deviceMap: Map<string, CanvasDevice>;
  topologyConnections: CanvasConnection[];
  connections: CanvasConnection[];
  devices: CanvasDevice[];
  cableInfo: CableInfo;
  onCableChange: (cable: CableInfo) => void;
  saveToHistory: () => void;
  setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
  setDevices: React.Dispatch<React.SetStateAction<CanvasDevice[]>>;
  setIsDrawingConnection: React.Dispatch<React.SetStateAction<boolean>>;
  setConnectionStart: React.Dispatch<React.SetStateAction<{ deviceId: string; portId: string; point: { x: number; y: number } } | null>>;
  setConnectionError: React.Dispatch<React.SetStateAction<string | null>>;
  cancelConnectionDrawing: () => void;
  isDrawingConnectionRef: React.MutableRefObject<boolean>;
  connectionStartRef: React.MutableRefObject<{ deviceId: string; portId: string; point: { x: number; y: number } } | null>;
  isActuallyDraggingRef: React.MutableRefObject<boolean>;
  isTouchDraggingRef: React.MutableRefObject<boolean>;
  language: 'tr' | 'en';
  t: { portInUse: string };
  previousCableTypeRef?: React.MutableRefObject<CableType | null>;
}

export function useTopologyPortConnection({
  deviceMap,
  topologyConnections,
  connections,
  devices,
  cableInfo,
  onCableChange,
  saveToHistory,
  setConnections,
  setDevices,
  setIsDrawingConnection,
  setConnectionStart,
  setConnectionError,
  cancelConnectionDrawing,
  isDrawingConnectionRef,
  connectionStartRef,
  isActuallyDraggingRef,
  isTouchDraggingRef,
  language,
  t,
  previousCableTypeRef: externalPreviousCableTypeRef,
}: UseTopologyPortConnectionProps) {
  const localRef = useRef<CableType | null>(null);
  const previousCableTypeRef = externalPreviousCableTypeRef || localRef;

  const handlePortClick = useCallback((e: ReactMouseEvent, deviceId: string, portId: string) => {
    e.stopPropagation();
    if (isActuallyDraggingRef.current || isTouchDraggingRef.current) return;

    const isDrawingConnection = isDrawingConnectionRef.current;
    const connectionStart = connectionStartRef.current;

    const device = deviceMap.get(deviceId);
    if (!device) return;

    const port = device.ports.find((p) => p.id === portId);
    if (!port) return;

    // Check if port is already connected
    const hasPersistedPortConnection = topologyConnections.some((connection) =>
      (connection.sourceDeviceId === deviceId && connection.sourcePort === portId) ||
      (connection.targetDeviceId === deviceId && connection.targetPort === portId)
    );
    if (port.status === 'connected' && hasPersistedPortConnection) {
      if (isDrawingConnection) {
        setConnectionError(t.portInUse);
        setTimeout(() => setConnectionError(null), 3000);
        if (previousCableTypeRef.current) {
          onCableChange({ ...cableInfo, cableType: previousCableTypeRef.current });
          previousCableTypeRef.current = null;
        }
        setIsDrawingConnection(false);
        setConnectionStart(null);
      }
      return;
    }

    if (isDrawingConnection && connectionStart) {
      // Check if trying to connect to itself
      if (connectionStart.deviceId === deviceId) {
        const errorMsg = language === 'tr'
          ? 'Bir cihaz kendisine baÄŸlanamaz!'
          : 'A device cannot connect to itself!';
        setConnectionError(errorMsg);
        setTimeout(() => setConnectionError(null), 3000);
        if (previousCableTypeRef.current) {
          onCableChange({ ...cableInfo, cableType: previousCableTypeRef.current });
          previousCableTypeRef.current = null;
        }
        setIsDrawingConnection(false);
        setConnectionStart(null);
        return;
      }

      // Check cable compatibility
      const sourceDevice = deviceMap.get(connectionStart.deviceId);
      const targetDevice = deviceMap.get(deviceId);

      if (sourceDevice && targetDevice) {
        const activeCableType = getInferredCableTypeForPort(portId, port.type, cableInfo.cableType);

        const cableCheck: CableInfo = {
          connected: true,
          cableType: activeCableType,
          sourceDevice: sourceDevice.type,
          targetDevice: targetDevice.type,
          sourcePort: connectionStart.portId,
          targetPort: portId,
        };

        if (!isCableCompatible(cableCheck)) {
          const errorMsg = language === 'tr'
            ? 'Bu cihaz tÃ¼rÃ¼ seÃ§ilen baÄŸlantÄ± tipini desteklememektedir!'
            : 'This device type does not support the selected connection type!';
          setConnectionError(errorMsg);
          setTimeout(() => setConnectionError(null), 3000);
          if (previousCableTypeRef.current) {
            onCableChange({ ...cableInfo, cableType: previousCableTypeRef.current });
            previousCableTypeRef.current = null;
          }
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
          cableType: activeCableType,
          active: true,
        };

        setConnections((prev) => [...prev, newConnection]);

        // Update port status on both devices
        setDevices((prev) =>
          prev.map((d) => {
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

        window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
          detail: { topologyDevices: devices, topologyConnections: [...connections, newConnection] }
        }));

        window.dispatchEvent(new CustomEvent('connection-created', {
          detail: { connection: newConnection, topologyDevices: devices }
        }));

        const prevCableType = previousCableTypeRef.current || cableInfo.cableType || 'straight';
        previousCableTypeRef.current = null;

        onCableChange({
          ...cableInfo,
          cableType: prevCableType,
          connected: true,
          sourceDevice: sourceDevice.type,
          targetDevice: targetDevice.type,
        });
      }

      setIsDrawingConnection(false);
      setConnectionStart(null);
    } else {
      // Start connection
      const portIndex = device.ports.findIndex(p => p.id === portId);
      previousCableTypeRef.current = cableInfo.cableType || 'straight';
      const inferredCableType = getInferredCableTypeForPort(portId, port.type, cableInfo.cableType);

      onCableChange({
        ...cableInfo,
        cableType: inferredCableType,
        connected: false,
        sourceDevice: device.type,
        targetDevice: device.type,
      });
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
  }, [
    deviceMap,
    topologyConnections,
    connections,
    devices,
    cableInfo,
    onCableChange,
    saveToHistory,
    setConnections,
    setDevices,
    setIsDrawingConnection,
    setConnectionStart,
    setConnectionError,
    cancelConnectionDrawing,
    isDrawingConnectionRef,
    connectionStartRef,
    isActuallyDraggingRef,
    isTouchDraggingRef,
    language,
    t
  ]);

  return { handlePortClick, previousCableTypeRef };
}



