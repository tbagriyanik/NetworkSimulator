'use client';

import { useCallback } from 'react';
import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { isCableCompatible } from '@/lib/network/types';

interface PingAnimationProps {
  _devices?: Map<string, CanvasDevice>;
  connections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
  deviceMap: Map<string, CanvasDevice>;
  isTR: boolean;
  // State setters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setPingAnimation: React.Dispatch<React.SetStateAction<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setHopPacketInfos: (infos: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setErrorToast: (toast: any) => void;
  setPingMode: (val: boolean) => void;
  // Refs from parent
  pingAnimationRef: React.MutableRefObject<number | null>;
  pingCleanupTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  pingIsPausedRef: React.MutableRefObject<boolean>;
  _pingStepModeRef: React.MutableRefObject<boolean>;
}

export function usePingAnimation({
  _devices: _unused,
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
  _pingStepModeRef: _unused2
}: PingAnimationProps) {

  // BFS Path finder
  const findPath = useCallback((sourceId: string, targetId: string): string[] | null => {
    if (sourceId === targetId) return [sourceId];

    const visited = new Set<string>();
    const queue: { deviceId: string; path: string[] }[] = [{ deviceId: sourceId, path: [sourceId] }];
    visited.add(sourceId);

    while (queue.length > 0) {
      const current = queue.shift() as { deviceId: string; path: string[] };

      for (const conn of connections) {
        if (conn.cableType !== 'straight' && conn.cableType !== 'crossover' && conn.cableType !== 'wireless' && conn.cableType !== 'serial') continue;

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
            const sourceIsOffline = sourceDevice.status === 'offline';
            const targetIsOffline = targetDevice.status === 'offline';

            if (sourceIsOffline || targetIsOffline) continue;

            const isCompatible = isCableCompatible({
              connected: true,
              cableType: conn.cableType,
              sourceDevice: sourceDevice.type,
              targetDevice: targetDevice.type,
              sourcePort: conn.sourcePort,
              targetPort: conn.targetPort,
            });

            const sPort = sourceDevice.ports.find(p => p.id === sourcePortId);
            const tPort = targetDevice.ports.find(p => p.id === targetPortId);
            const isUp = sPort && !sPort.shutdown && tPort && !tPort.shutdown;

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

    return null;
  }, [connections, deviceMap, deviceStates]);

  const cancelPingDueToInterruption = useCallback((reasonMessage: string) => {
    pingIsPausedRef.current = false;
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
  }, [isTR, pingAnimationRef, pingCleanupTimeoutRef, pingIsPausedRef, setPingAnimation, setHopPacketInfos, setPingMode, setErrorToast]);

  return {
    findPath,
    cancelPingDueToInterruption
  };
}
