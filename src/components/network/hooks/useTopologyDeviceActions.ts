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

    // Dispatch so device state is reset on power-on (restore startup-config or defaults)
    devices.forEach((d) => {
      if (!deviceIds.includes(d.id)) return;
      window.dispatchEvent(new CustomEvent('trigger-topology-toggle-power', {
        detail: {
          deviceId: d.id,
          nextStatus: d.status === 'online' ? 'offline' : 'online',
          deviceType: d.type,
          switchModel: d.switchModel,
        },
      }));
    });
  }, [setDevices, devices]);

  // Handle alignment for multiple selected devices
  const handleAlign = useCallback((type: 'top' | 'bottom' | 'left' | 'right' | 'h-center' | 'v-center' | 'distribute-h' | 'distribute-v') => {
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

      if (type === 'distribute-h' && selectedDevices.length >= 3) {
        const sorted = [...selectedDevices].sort((a, b) => a.x - b.x);
        const minX = sorted[0].x;
        const maxX = sorted[sorted.length - 1].x;
        const gap = (maxX - minX) / (sorted.length - 1);
        const posMap = new Map(sorted.map((d, i) => [d.id, minX + i * gap]));
        return prev.map(d => posMap.has(d.id) ? { ...d, x: posMap.get(d.id)! } : d);
      }

      if (type === 'distribute-v' && selectedDevices.length >= 3) {
        const sorted = [...selectedDevices].sort((a, b) => a.y - b.y);
        const minY = sorted[0].y;
        const maxY = sorted[sorted.length - 1].y;
        const gap = (maxY - minY) / (sorted.length - 1);
        const posMap = new Map(sorted.map((d, i) => [d.id, minY + i * gap]));
        return prev.map(d => posMap.has(d.id) ? { ...d, y: posMap.get(d.id)! } : d);
      }

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
    const connection = connections.find((c) => c.id === connId);
    if (!connection) return;
    const nextActive = connection.active === false;
    const updatedConnections = connections.map((c) => (c.id === connId ? { ...c, active: nextActive } : c));
    setConnections(updatedConnections);

    // Powering a cable off must have the same operational effect as removing
    // it. This is especially important for EtherChannel member links: a
    // powered-off member must not remain usable on either switch.
    setDevices((prev) => prev.map((device) => {
      if (device.id !== connection.sourceDeviceId && device.id !== connection.targetDeviceId) return device;
      const portId = device.id === connection.sourceDeviceId ? connection.sourcePort : connection.targetPort;
      return {
        ...device,
        ports: device.ports.map((port) => port.id === portId
          ? { ...port, status: nextActive ? 'connected' : 'disconnected' as const }
          : port)
      };
    }));

    // Trigger STP recalculation for all switches
    window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
      detail: { topologyDevices: devices, topologyConnections: updatedConnections }
    }));
    window.dispatchEvent(new CustomEvent('topology-connection-power-changed', {
      detail: { connectionId: connId, active: nextActive }
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
