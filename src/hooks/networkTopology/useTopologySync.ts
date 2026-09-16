'use client';

import { useEffect } from 'react';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';

interface UseTopologySyncProps {
  deviceStates?: Map<string, SwitchState>;
  connections: CanvasConnection[];
  setDevices: React.Dispatch<React.SetStateAction<CanvasDevice[]>>;
  devices: CanvasDevice[];
  getCounterKey: (type: string) => string;
  deviceCounterRef: React.MutableRefObject<Record<string, number>>;

}

export function useTopologySync({
  deviceStates,
  connections,
  setDevices,
  devices,
  getCounterKey,
  deviceCounterRef,
}: UseTopologySyncProps) {
  // Sync device counters with current devices to prevent ID collisions
  useEffect(() => {
    if (devices.length > 0) {
      const counters: Record<string, number> = { pc: 0, iot: 0, switch: 0, router: 0, firewall: 0, wlc: 0, hub: 0, cloud: 0, mobile: 0, printer: 0 };
      devices.forEach((d) => {
        const match = d.id.match(/^(\w+)-(\d+)$/);
        if (match) {
          const rawType = match[1];
          const type = getCounterKey(rawType);
          const num = parseInt(match[2]);
          if (counters[type] !== undefined) {
            counters[type] = Math.max(counters[type], num);
          } else {
            counters[type] = num;
          }
        }
      });
      deviceCounterRef.current = counters;

    }
  }, [devices, getCounterKey, deviceCounterRef]);

  // Sync port shutdown status from deviceStates
  useEffect(() => {
    if (!deviceStates) return;

    const connectedPortKeys = new Set<string>();
    const pcConnectionMap = new Map<string, CanvasConnection>();

    connections.forEach((conn) => {
      connectedPortKeys.add(`${conn.sourceDeviceId}:${conn.sourcePort}`);
      connectedPortKeys.add(`${conn.targetDeviceId}:${conn.targetPort}`);

      if ((conn.sourceDeviceId.startsWith('pc-') || conn.sourceDeviceId.startsWith('iot-')) && conn.sourcePort === 'eth0') {
        pcConnectionMap.set(conn.sourceDeviceId, conn);
      }
      if ((conn.targetDeviceId.startsWith('pc-') || conn.targetDeviceId.startsWith('iot-')) && conn.targetPort === 'eth0') {
        pcConnectionMap.set(conn.targetDeviceId, conn);
      }
    });

    setDevices((prev) => {
      if (prev.length === 0) return prev;
      let hasChanges = false;
      const updatedDevices = prev.map((device) => {
        const deviceState = deviceStates.get(device.id);
        if (!deviceState) return device;

        let portChanged = false;
        const updatedPorts = device.ports.map((port) => {
          const simulatorPort = deviceState.ports[port.id];
          if (simulatorPort) {
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
            const hasActiveConnection = connectedPortKeys.has(`${device.id}:${port.id}`);

            let uiStatus: 'connected' | 'disconnected';
            if (hasActiveConnection) {
              uiStatus = 'connected';
            } else {
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

        if (baseDevice.type === 'pc' || baseDevice.type === 'iot') {
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
            if (peerPort) {
              const peerVlan = Number(peerPort.accessVlan || peerPort.vlan || 1);

              if (Number(baseDevice.vlan || 1) !== peerVlan) {
                hasChanges = true;
                return { ...baseDevice, vlan: peerVlan };
              }
            }
          }
        }

        return baseDevice;
      });
      return hasChanges ? updatedDevices : prev;
    });
  }, [deviceStates, connections, setDevices]);
}


