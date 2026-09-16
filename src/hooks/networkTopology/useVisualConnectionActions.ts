import { useCallback } from 'react';
import { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';

interface UseVisualConnectionActionsProps {
  topologyConnections: CanvasConnection[];
  visualConnections: CanvasConnection[];
  deleteConnection: (connectionId: string) => void;
  toggleConnectionActive: (connectionId: string) => void;
  saveToHistory: () => void;
  setDevicesState: React.Dispatch<React.SetStateAction<CanvasDevice[]>>;
}

export function useVisualConnectionActions({
  topologyConnections,
  visualConnections,
  deleteConnection,
  toggleConnectionActive,
  saveToHistory,
  setDevicesState,
}: UseVisualConnectionActionsProps) {
  const deleteVisualConnection = useCallback(
    (connectionId: string) => {
      if (topologyConnections.some((connection) => connection.id === connectionId)) {
        deleteConnection(connectionId);
        return;
      }

      const connection = visualConnections.find((item) => item.id === connectionId);
      if (!connection || connection.cableType !== 'wireless') return;

      saveToHistory();
      setDevicesState((previous) =>
        previous.map((device) => {
          if (device.id !== connection.sourceDeviceId) return device;
          return {
            ...device,
            wifi: device.wifi ? { ...device.wifi, enabled: false, ssid: '' } : device.wifi,
            ip: '',
            subnet: '',
            gateway: '',
            ports: device.ports.map((port) =>
              port.id === 'wlan0'
                ? {
                    ...port,
                    status: 'disconnected' as const,
                    wifi: port.wifi ? { ...port.wifi, ssid: '' } : port.wifi,
                    ipAddress: undefined,
                    subnetMask: undefined,
                  }
                : port
            ),
          };
        })
      );
    },
    [deleteConnection, saveToHistory, setDevicesState, topologyConnections, visualConnections]
  );

  const toggleVisualConnectionActive = useCallback(
    (connectionId: string) => {
      if (topologyConnections.some((connection) => connection.id === connectionId)) {
        toggleConnectionActive(connectionId);
      }
    },
    [toggleConnectionActive, topologyConnections]
  );

  return {
    deleteVisualConnection,
    toggleVisualConnectionActive,
  };
}


