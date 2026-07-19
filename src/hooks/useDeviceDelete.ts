import { useCallback } from 'react';
import type { SwitchState } from '@/lib/network/types';
import type { TerminalOutput } from '@/components/network/Terminal';
import type { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/networkTopology.types';
import type { PCOutputLine, TabType } from '@/app/page.types';

interface UseDeviceDeleteParams {
  showPCDeviceId: string | null;
  showRouterDeviceId: string | null;
  activeDeviceId: string;
  selectedDevice: DeviceType | null;
  setShowPCPanel: (v: boolean) => void;
  setShowPCDeviceId: (id: string) => void;
  setShowRouterPanel: (v: boolean) => void;
  setShowRouterDeviceId: (id: string) => void;
  setSelectedDevice: React.Dispatch<React.SetStateAction<DeviceType | null>>;
  setActiveDeviceId: (id: string) => void;
  setActiveDeviceType: (type: DeviceType) => void;
  setTopologyConnections: (connections: CanvasConnection[] | ((prev: CanvasConnection[]) => CanvasConnection[])) => void;
  setDeviceStates: React.Dispatch<React.SetStateAction<Map<string, SwitchState>>>;
  setDeviceOutputs: React.Dispatch<React.SetStateAction<Map<string, TerminalOutput[]>>>;
  setPcOutputs: React.Dispatch<React.SetStateAction<Map<string, PCOutputLine[]>>>;
  setTopologyDevices: (devices: CanvasDevice[] | ((prev: CanvasDevice[]) => CanvasDevice[])) => void;
  setActiveTab: (tab: TabType) => void;
  setHasUnsavedChanges: (v: boolean) => void;
}

export function useDeviceDelete(params: UseDeviceDeleteParams) {
  const {
    showPCDeviceId,
    showRouterDeviceId,
    activeDeviceId,
    selectedDevice,
    setShowPCPanel,
    setShowPCDeviceId,
    setShowRouterPanel,
    setShowRouterDeviceId,
    setSelectedDevice,
    setActiveDeviceId,
    setActiveDeviceType,
    setTopologyConnections,
    setDeviceStates,
    setDeviceOutputs,
    setPcOutputs,
    setTopologyDevices,
    setActiveTab,
    setHasUnsavedChanges,
  } = params;

  const handleDeviceDelete = useCallback((deviceId: string) => {
    if (showPCDeviceId === deviceId) {
      setShowPCPanel(false);
      setShowPCDeviceId('pc-1');
    }

    if (showRouterDeviceId === deviceId) {
      setShowRouterPanel(false);
      setShowRouterDeviceId('router-1');
    }

    if (activeDeviceId === deviceId) {
      setSelectedDevice(null);
      setActiveDeviceId('');
    }

    if (selectedDevice) {
      setSelectedDevice(null);
    }

    setTopologyConnections(prevConnections => {
      const connectionsToRemove = prevConnections.filter(conn =>
        conn.sourceDeviceId === deviceId || conn.targetDeviceId === deviceId
      );

      const portsToDisconnect = connectionsToRemove.map(conn => {
        if (conn.sourceDeviceId === deviceId) {
          return { deviceId: conn.targetDeviceId, portId: conn.targetPort };
        } else {
          return { deviceId: conn.sourceDeviceId, portId: conn.sourcePort };
        }
      });

      const remainingConnections = prevConnections.filter(conn =>
        conn.sourceDeviceId !== deviceId && conn.targetDeviceId !== deviceId
      );

      setDeviceStates(prev => {
        const newMap = new Map(prev);
        portsToDisconnect.forEach(p => {
          const targetState = newMap.get(p.deviceId);
          if (targetState && targetState.ports) {
            const updatedPorts = { ...targetState.ports };
            const portToReset = updatedPorts[p.portId];
            if (portToReset) {
              updatedPorts[p.portId] = {
                ...portToReset,
                status: 'notconnect'
              };
              newMap.set(p.deviceId, {
                ...targetState,
                ports: updatedPorts
              });
            }
          }
        });
        newMap.delete(deviceId);
        return newMap;
      });

      setDeviceOutputs(prev => {
        const newMap = new Map(prev);
        newMap.delete(deviceId);
        return newMap;
      });

      setPcOutputs(prev => {
        const newMap = new Map(prev);
        newMap.delete(deviceId);
        return newMap;
      });

      setTopologyDevices(prev => {
        const nextDevices = prev.filter(d => d.id !== deviceId).map(device => {
          const updatedPorts = device.ports.map(port => {
            const isActuallyConnected = remainingConnections.some(conn =>
              (conn.sourceDeviceId === device.id && conn.sourcePort === port.id) ||
              (conn.targetDeviceId === device.id && conn.targetPort === port.id)
            );
            return {
              ...port,
              status: isActuallyConnected ? 'connected' as const : 'disconnected' as const
            };
          });
          return { ...device, ports: updatedPorts };
        });

        window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
          detail: { topologyDevices: nextDevices, topologyConnections: remainingConnections }
        }));

        return nextDevices;
      });

      return remainingConnections;
    });

    if (activeDeviceId === deviceId) {
      setTopologyDevices(prev => {
        const currentDevices = prev.filter(d => d.id !== deviceId);
        if (currentDevices.length > 0) {
          const nextDevice = currentDevices[0];
          setActiveDeviceId(nextDevice.id);
          setActiveDeviceType(nextDevice.type as DeviceType);
          setActiveTab('topology');
        } else {
          setActiveDeviceId('');
          setActiveDeviceType('switchL2');
          setActiveTab('topology');
        }
        return prev;
      });
    }
    setHasUnsavedChanges(true);
  }, [
    activeDeviceId, showPCDeviceId, showRouterDeviceId, selectedDevice,
    setShowPCPanel, setShowPCDeviceId, setShowRouterPanel, setShowRouterDeviceId,
    setSelectedDevice, setActiveDeviceId, setActiveDeviceType,
    setTopologyConnections, setDeviceStates, setDeviceOutputs, setPcOutputs,
    setTopologyDevices, setActiveTab, setHasUnsavedChanges
  ]);

  return handleDeviceDelete;
}
