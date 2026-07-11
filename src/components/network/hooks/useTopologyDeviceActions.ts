import { useCallback, Dispatch, SetStateAction } from 'react';
import { CanvasDevice, CanvasConnection, ContextMenuState } from '../networkTopology.types';
import { logger } from '@/lib/logger';

interface UseTopologyDeviceActionsProps {
  devices: CanvasDevice[];
  setDevices: Dispatch<SetStateAction<CanvasDevice[]>>;
  connections: CanvasConnection[];
  setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
  selectedDeviceIds: string[];
  saveToHistory: () => void;
  activeCaptureConnectionId: string | null;
  setActiveCaptureConnection: (id: string | null) => void;
  setConfiguringDevice: Dispatch<SetStateAction<string | null>>;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
}

export function useTopologyDeviceActions({
  devices,
  setDevices,
  connections,
  setConnections,
  selectedDeviceIds,
  saveToHistory,
  activeCaptureConnectionId,
  setActiveCaptureConnection,
  setConfiguringDevice,
  setContextMenu,
}: UseTopologyDeviceActionsProps) {

  // Start device config
  const startDeviceConfig = useCallback((deviceId: string) => {
    setConfiguringDevice(deviceId);
    setContextMenu(null);
  }, [setConfiguringDevice, setContextMenu]);

  // Cancel device config
  const cancelDeviceConfig = useCallback(() => {
    setConfiguringDevice(null);
  }, [setConfiguringDevice]);

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
  }, [saveToHistory, setDevices, setConfiguringDevice]);

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
  }, [setDevices]);

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
      if (selectedDevices.length < 2) {
        return prev;
      }

      let targetX = 0;
      let targetY = 0;

      switch (type) {
        case 'top':
          targetY = Math.min(...selectedDevices.map(sd => sd.y));
          break;
        case 'bottom':
          targetY = Math.max(...selectedDevices.map(sd => sd.y));
          break;
        case 'left':
          targetX = Math.min(...selectedDevices.map(sd => sd.x));
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

      return prev.map(d => {
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
    });
  }, [selectedDeviceIds, saveToHistory, setDevices]);

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
      const remainingConnections = connections.filter((c) => c.id !== connectionId);
      setConnections(remainingConnections);

      // Trigger STP recalculation for all switches
      window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
        detail: { topologyDevices: devices, topologyConnections: remainingConnections }
      }));
    }
  }, [connections, saveToHistory, devices, activeCaptureConnectionId, setActiveCaptureConnection, setDevices, setConnections]);

  return {
    startDeviceConfig,
    cancelDeviceConfig,
    saveDeviceConfig,
    togglePowerDevices,
    handleAlign,
    toggleConnectionActive,
    deleteConnection
  };
}
