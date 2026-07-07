'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback } from 'react';
import type { CanvasConnection, CanvasDevice } from '../networkTopology.types';
import { buildHopPacketInfos as buildHopPacketInfosFn } from '../PingPacketInfoPanel';
import { checkDeviceConnectivity as checkDeviceConnectivityFn, getPingDiagnostics as getPingDiagnosticsFn, getWirelessDistance as getWirelessDistanceFn } from '@/lib/network/connectivity';

export interface BroadcastAnimTarget {
  targetId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export type PingAnimationState = {
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
  failedAtHop?: number;
  isReturn?: boolean;
  broadcastTargets: string[];
  broadcastAnim: BroadcastAnimTarget[];
  broadcastProgress: number;
};

type PingSequenceDeps = {
  isTR: boolean;
  isSimulationMode: boolean;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates?: Map<string, import('@/lib/network/types').SwitchState>;
  deviceMap: Map<string, CanvasDevice>;
  latestDevicesRef: React.MutableRefObject<CanvasDevice[]>;
  latestConnectionsRef: React.MutableRefObject<CanvasConnection[]>;
  pingAnimationRef: React.MutableRefObject<number | null>;
  pingCleanupTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  pingIsPausedRef: React.MutableRefObject<boolean>;
  pingStepModeRef: React.MutableRefObject<boolean>;
  pingResumeCallbackRef: React.MutableRefObject<(() => void) | null>;
  pingPathRef: React.MutableRefObject<string[]>;
  cancelPingDueToInterruptionRef: React.MutableRefObject<((reasonMessage: string) => void) | null>;
  setPingAnimation: React.Dispatch<React.SetStateAction<PingAnimationState | null>>;
  setHopPacketInfos: React.Dispatch<React.SetStateAction<any>>;
  setErrorToast: React.Dispatch<React.SetStateAction<any>>;
  setPingMode: (value: boolean) => void;
  getPingDiagnostics: typeof getPingDiagnosticsFn;
  checkDeviceConnectivity: typeof checkDeviceConnectivityFn;
  getWirelessDistance: typeof getWirelessDistanceFn;
  easeInOutCubic: (value: number) => number;
  flushSync: (cb: () => void) => void;
  cancelAnimationFrame: typeof globalThis.cancelAnimationFrame;
  requestAnimationFrame: typeof globalThis.requestAnimationFrame;
};

export function usePingSequence(deps: PingSequenceDeps) {
  const {
    isTR,
    isSimulationMode,
    devices,
    connections,
    deviceStates,
    deviceMap,
    latestDevicesRef,
    latestConnectionsRef,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    pingIsPausedRef,
    pingStepModeRef,
    pingResumeCallbackRef,
    pingPathRef,
    cancelPingDueToInterruptionRef,
    setPingAnimation,
    setHopPacketInfos,
    setErrorToast,
    setPingMode,
    getPingDiagnostics,
    checkDeviceConnectivity,
    getWirelessDistance,
    easeInOutCubic,
    flushSync,
    cancelAnimationFrame,
    requestAnimationFrame,
  } = deps;

  const startPingAnimation = useCallback((sourceId: string, targetId: string) => {
    if (pingAnimationRef.current) cancelAnimationFrame(pingAnimationRef.current);
    if (pingCleanupTimeoutRef.current) {
      clearTimeout(pingCleanupTimeoutRef.current);
      pingCleanupTimeoutRef.current = null;
    }

    setPingAnimation(null);
    setErrorToast(null);

    const getDevicePrimaryIp = (deviceId: string): string => {
      const device = deviceMap.get(deviceId);
      if (device?.ip) return device.ip;
      if (device?.ipv6) return device.ipv6;
      const state = deviceStates?.get(deviceId);
      if (!state) return '';
      for (const port of Object.values(state.ports ?? {})) {
        const p = port as { ipAddress?: string; ipv6Address?: string };
        if (p.ipAddress) return p.ipAddress;
        if (p.ipv6Address) return p.ipv6Address;
      }
      return '';
    };

    const sourceIp = getDevicePrimaryIp(sourceId);
    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F:]{1,4}$/i;
    const isIpValid = (ip: string) => ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip.includes(':');

    const targetIp = getDevicePrimaryIp(targetId);
    if (!isIpValid(sourceIp) || !isIpValid(targetIp)) {
      const errorMessage = !isIpValid(sourceIp)
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
        hopCount: 0,
        broadcastTargets: [],
        broadcastAnim: [],
        broadcastProgress: 0
      });
      setErrorToast({ message: isTR ? 'Ping başarısız!' : 'Ping failed!', details: errorMessage });
      pingCleanupTimeoutRef.current = setTimeout(() => { setPingAnimation(null); setPingMode(false); }, 3000);
      return;
    }

    const diagnostics = getPingDiagnostics(sourceId, targetIp, devices, connections, deviceStates, isTR ? 'tr' : 'en', { protocol: 'icmp' });
    const connectivity = checkDeviceConnectivity(sourceId, targetId, devices, connections, deviceStates, { protocol: 'icmp' });

    if (connectivity.capturedPackets?.length) {
      connectivity.capturedPackets.forEach((pkt: unknown) => window.dispatchEvent(new CustomEvent('packet-captured', { detail: pkt })));
    }

    if (!connectivity.success) {
      const errorMessage = diagnostics.reasons?.length > 0 ? diagnostics.reasons[0] : (isTR ? 'Ping başarısız' : 'Ping failed');
      const partialPath = connectivity.hopIds?.length >= 1 ? connectivity.hopIds : [sourceId];
      pingPathRef.current = partialPath;
      setHopPacketInfos(buildHopPacketInfosFn(partialPath, devices, connections, 64, targetIp));
      pingIsPausedRef.current = true;
      pingStepModeRef.current = isSimulationMode;
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
        broadcastTargets: [],
        broadcastAnim: [],
        broadcastProgress: 0,
      });

      const runFailedAnimation = () => {
        let startTime = Date.now();
        let currentHop = 0;
        let frameCount = 0;
        const hopDuration = 1500;

        const isWirelessHop = (fromId: string, toId: string): boolean => {
          const conn = connections.find(c => (c.sourceDeviceId === fromId && c.targetDeviceId === toId) || (c.sourceDeviceId === toId && c.targetDeviceId === fromId));
          if (conn?.cableType === 'wireless') return true;
          const fromDev = deviceMap.get(fromId);
          const toDev = deviceMap.get(toId);
          if (!fromDev || !toDev) return false;
          const isClient = (t: string | undefined) => t === 'pc' || t === 'iot';
          const isInfra = (t: string | undefined) => t === 'router' || t === 'switchL2' || t === 'switchL3';
          return (isClient(fromDev.type) && isInfra(toDev.type)) || (isClient(toDev.type) && isInfra(fromDev.type));
        };

        const animateFailed = () => {
          pingResumeCallbackRef.current = () => { startTime = Date.now(); pingAnimationRef.current = requestAnimationFrame(animateFailed); };
          if (pingIsPausedRef.current) return;
          if (partialPath.some((id: string) => !latestDevicesRef.current.find(dd => dd.id === id) || latestDevicesRef.current.find(dd => dd.id === id)?.status === 'offline')) {
            cancelPingDueToInterruptionRef.current?.(isTR ? 'Cihaz kapatıldığı için ping iptal edildi.' : 'Ping cancelled because a device was powered off.');
            return;
          }
          const fromId = partialPath[currentHop];
          const toId = partialPath[currentHop + 1];
          if (!toId) {
            flushSync(() => { setPingAnimation((prev: any | null) => prev ? { ...prev, success: false, isPaused: false } : null); });
            setErrorToast({ message: isTR ? 'Ping başarısız!' : 'Ping failed!', details: errorMessage });
            setPingMode(false);
            return;
          }
          const failedSegConn = latestConnectionsRef.current.find(c => (c.sourceDeviceId === fromId && c.targetDeviceId === toId) || (c.sourceDeviceId === toId && c.targetDeviceId === fromId));
          if ((!failedSegConn || failedSegConn.active === false) && !isWirelessHop(fromId, toId)) {
            cancelPingDueToInterruptionRef.current?.(isTR ? 'Bağlantı koptuğu için ping iptal edildi.' : 'Ping cancelled because a connection was lost.');
            return;
          }
          const fromDev = deviceMap.get(fromId);
          const toDev = deviceMap.get(toId);
          const dx = (toDev?.x ?? 0) - (fromDev?.x ?? 0);
          const dy = (toDev?.y ?? 0) - (fromDev?.y ?? 0);
          const dur = Math.min(hopDuration * Math.max(1, Math.sqrt(dx * dx + dy * dy) / 200), 3000);
          const progress = easeInOutCubic(Math.min((Date.now() - startTime) / dur, 1));
          frameCount++;
          if (progress < 1) {
            flushSync(() => { setPingAnimation((prev: any) => prev ? { ...prev, currentHopIndex: currentHop, progress, frame: frameCount } : null); });
            pingAnimationRef.current = requestAnimationFrame(animateFailed);
            return;
          }
          if (currentHop < partialPath.length - 2) {
            currentHop++;
            startTime = Date.now();
            const shouldPause = pingIsPausedRef.current || pingStepModeRef.current;
            flushSync(() => { setPingAnimation((prev: any) => prev ? { ...prev, currentHopIndex: currentHop, progress: 0, frame: frameCount, isPaused: shouldPause } : null); });
        if (!shouldPause) {
          pingAnimationRef.current = requestAnimationFrame(animateFailed);
        } else {
          pingIsPausedRef.current = true;
          pingResumeCallbackRef.current = () => { startTime = Date.now(); pingAnimationRef.current = requestAnimationFrame(animateFailed); };
        }
            return;
          }
          flushSync(() => { setPingAnimation((prev: any) => prev ? { ...prev, currentHopIndex: currentHop, progress: 1, frame: frameCount, success: false, isPaused: false } : null); });
          setErrorToast({ message: isTR ? 'Ping başarısız!' : 'Ping failed!', details: errorMessage });
          setPingMode(false);
        };

        pingAnimationRef.current = requestAnimationFrame(animateFailed);
      };

      pingResumeCallbackRef.current = runFailedAnimation;
      return;
    }

    const path = connectivity.hopIds;
    pingPathRef.current = path;
    if (!path || path.length < 2) {
      const errorMessage = isTR ? 'Fiziksel bağlantı yok' : 'No physical connection';
      setHopPacketInfos([]);
      setPingAnimation({ sourceId, targetId, path: [sourceId], currentHopIndex: 0, progress: 0, success: false, frame: 0, error: errorMessage, hopCount: 0, isPaused: false, showPacketPanel: true, broadcastTargets: [], broadcastAnim: [], broadcastProgress: 0 });
      setErrorToast({ message: isTR ? 'Ping başarısız!' : 'Ping failed!', details: errorMessage });
      pingCleanupTimeoutRef.current = setTimeout(() => { setPingAnimation(null); setPingMode(false); setErrorToast(null); }, 3000);
      return;
    }

      setHopPacketInfos(buildHopPacketInfosFn(path, devices, connections, 64, targetIp));
    pingIsPausedRef.current = true;
    pingStepModeRef.current = isSimulationMode;
    setPingAnimation({ sourceId, targetId, path, currentHopIndex: 0, progress: 0, success: null, frame: 0, hopCount: 0, isPaused: true, showPacketPanel: true, broadcastTargets: [], broadcastAnim: [], broadcastProgress: 0 });
    setErrorToast(null);

    const hopDuration = 1500;
    let startTime = Date.now();
    let currentHop = 0;
    let frameCount = 0;

    const isWirelessHop = (fromId: string, toId: string): boolean => {
      const conn = connections.find(c => (c.sourceDeviceId === fromId && c.targetDeviceId === toId) || (c.sourceDeviceId === toId && c.targetDeviceId === fromId));
      if (conn?.cableType === 'wireless') return true;
      const fromDev = deviceMap.get(fromId);
      const toDev = deviceMap.get(toId);
      if (!fromDev || !toDev) return false;
      const isClient = (t: string | undefined) => t === 'pc' || t === 'iot';
      const isInfra = (t: string | undefined) => t === 'router' || t === 'switchL2' || t === 'switchL3';
      return (isClient(fromDev.type) && isInfra(toDev.type)) || (isClient(toDev.type) && isInfra(fromDev.type));
    };

    const calculateHopDuration = (fromId: string, toId: string): number => {
      const fromDevice = deviceMap.get(fromId);
      const toDevice = deviceMap.get(toId);
      if (!fromDevice || !toDevice) return hopDuration;
      if (isWirelessHop(fromId, toId)) {
        const srcDist = getWirelessDistance(fromDevice, devices, deviceStates);
        const dstDist = getWirelessDistance(toDevice, devices, deviceStates);
        return Math.min(800 * Math.exp(Math.max(srcDist === Infinity ? 0 : srcDist, dstDist === Infinity ? 0 : dstDist) / 200), 3000);
      }
      const dx = toDevice.x - fromDevice.x;
      const dy = toDevice.y - fromDevice.y;
      return Math.min(hopDuration * Math.max(1, Math.sqrt(dx * dx + dy * dy) / 200), 3000);
    };

    const getBroadcastAnim = (switchId: string, exceptId?: string): BroadcastAnimTarget[] => {
      const sw = deviceMap.get(switchId);
      if (!sw || (sw.type !== 'switchL2' && sw.type !== 'switchL3')) return [];
      const result: BroadcastAnimTarget[] = [];
      for (const conn of connections) {
        let neighborId: string | null = null;
        let portId: string | null = null;
        if (conn.sourceDeviceId === switchId && conn.targetDeviceId !== exceptId) {
          neighborId = conn.targetDeviceId;
          portId = conn.sourcePort;
        } else if (conn.targetDeviceId === switchId && conn.sourceDeviceId !== exceptId) {
          neighborId = conn.sourceDeviceId;
          portId = conn.targetPort;
        }
        if (!neighborId || !portId) continue;
        const neighbor = deviceMap.get(neighborId);
        if (!neighbor || neighbor.status === 'offline') continue;
        const state = deviceStates?.get(switchId);
        const simPort = state?.ports?.[portId];
        const isSTPBlocked = simPort?.spanningTree?.state === 'blocking' || simPort?.spanningTree?.role === 'alternate';
        if (isSTPBlocked) continue;
        result.push({
          targetId: neighborId,
          fromX: sw.x,
          fromY: sw.y,
          toX: neighbor.x,
          toY: neighbor.y,
        });
      }
      return result;
    };

    const advanceToNextHop = (hopCountIncrement: number) => {
      if (currentHop < path.length - 2) {
        currentHop++;
        startTime = Date.now();
        const shouldPause = pingIsPausedRef.current || pingStepModeRef.current;
        const broadcastAnim = getBroadcastAnim(path[currentHop], path[currentHop - 1]);
        const broadcastTargets = broadcastAnim.map(b => b.targetId);
        flushSync(() => { setPingAnimation((prev) => prev ? { ...prev, currentHopIndex: currentHop, progress: 0, frame: frameCount, hopCount: prev.hopCount + hopCountIncrement, isPaused: shouldPause, broadcastTargets, broadcastAnim, broadcastProgress: 0 } : null); });
        if (!shouldPause) {
          pingAnimationRef.current = requestAnimationFrame(animate);
        } else {
          pingIsPausedRef.current = true;
          pingResumeCallbackRef.current = () => { startTime = Date.now(); pingAnimationRef.current = requestAnimationFrame(animate); };
        }
      } else {
        const returnPath = [...path].reverse();
        const returnPacketInfos = buildHopPacketInfosFn(returnPath, devices, connections, 64, sourceIp);
        setTimeout(() => {
          let returnHop = 0;
          let returnStartTime = Date.now();
          let returnFrameCount = frameCount;
          setPingAnimation((prev) => prev ? { ...prev, path: returnPath, currentHopIndex: 0, progress: 0, hopCount: prev.hopCount + hopCountIncrement, isPaused: pingStepModeRef.current, isReturn: true, broadcastTargets: [], broadcastAnim: [], broadcastProgress: 0 } : null);
          setHopPacketInfos(returnPacketInfos);
          const finishSuccess = () => { setPingAnimation((prev) => prev ? { ...prev, success: true, isPaused: false, broadcastTargets: [], broadcastAnim: [], broadcastProgress: 0 } : null); setPingMode(false); };
          const animateReturn = () => {
            pingResumeCallbackRef.current = () => { returnStartTime = Date.now(); pingAnimationRef.current = requestAnimationFrame(animateReturn); };
            if (pingIsPausedRef.current) return;
            const fromId = returnPath[returnHop];
            const toId = returnPath[returnHop + 1];
            if (!toId) return finishSuccess();
            const dur = calculateHopDuration(fromId, toId);
            const prog = easeInOutCubic(Math.min((Date.now() - returnStartTime) / dur, 1));
            returnFrameCount++;
            if (prog < 1) {
              flushSync(() => { setPingAnimation((prev) => prev ? { ...prev, currentHopIndex: returnHop, progress: prog, frame: returnFrameCount, broadcastProgress: prog } : null); });
              pingAnimationRef.current = requestAnimationFrame(animateReturn);
            } else if (returnHop < returnPath.length - 2) {
              returnHop++;
              returnStartTime = Date.now();
              const shouldPause = pingIsPausedRef.current || pingStepModeRef.current;
              const retAnim = getBroadcastAnim(returnPath[returnHop], returnPath[returnHop - 1]);
              const retTargets = retAnim.map(b => b.targetId);
              flushSync(() => { setPingAnimation((prev) => prev ? { ...prev, currentHopIndex: returnHop, progress: 0, frame: returnFrameCount, isPaused: shouldPause, broadcastTargets: retTargets, broadcastAnim: retAnim, broadcastProgress: 0 } : null); });
              if (!shouldPause) {
                pingAnimationRef.current = requestAnimationFrame(animateReturn);
              } else {
                pingIsPausedRef.current = true;
                pingResumeCallbackRef.current = () => { returnStartTime = Date.now(); pingAnimationRef.current = requestAnimationFrame(animateReturn); };
              }
            } else {
              finishSuccess();
            }
          };
          if (pingStepModeRef.current) {
            pingIsPausedRef.current = true;
            pingResumeCallbackRef.current = () => { returnStartTime = Date.now(); pingAnimationRef.current = requestAnimationFrame(animateReturn); };
          } else {
            pingAnimationRef.current = requestAnimationFrame(animateReturn);
          }
        }, 300);
      }
    };

    const animate = () => {
      pingResumeCallbackRef.current = () => { startTime = Date.now(); pingAnimationRef.current = requestAnimationFrame(animate); };
      if (pingIsPausedRef.current) return;
      if (path.some((id: string) => !latestDevicesRef.current.find(dd => dd.id === id) || latestDevicesRef.current.find(dd => dd.id === id)?.status === 'offline')) {
        cancelPingDueToInterruptionRef.current?.(isTR ? 'Cihaz kapatıldığı için ping iptal edildi.' : 'Ping cancelled because a device was powered off.');
        return;
      }
      const currentFromId = path[currentHop];
      const currentToId = path[currentHop + 1];
      if (currentToId) {
        const segmentConn = latestConnectionsRef.current.find(c => (c.sourceDeviceId === currentFromId && c.targetDeviceId === currentToId) || (c.sourceDeviceId === currentToId && c.targetDeviceId === currentFromId));
        if ((!segmentConn || segmentConn.active === false) && !isWirelessHop(currentFromId, currentToId)) {
          cancelPingDueToInterruptionRef.current?.(isTR ? 'Bağlantı koptuğu için ping iptal edildi.' : 'Ping cancelled because a connection was lost.');
          return;
        }
      }
      const fromId = path[currentHop];
      const toId = path[currentHop + 1];
      const progress = easeInOutCubic(Math.min((Date.now() - startTime) / calculateHopDuration(fromId, toId), 1));
      frameCount++;
      if (progress < 1) {
        flushSync(() => { setPingAnimation((prev) => prev ? { ...prev, currentHopIndex: currentHop, progress, frame: frameCount, broadcastProgress: progress } : null); });
        pingAnimationRef.current = requestAnimationFrame(animate);
      } else {
        flushSync(() => { setPingAnimation((prev) => prev ? { ...prev, currentHopIndex: currentHop, progress: 1, frame: frameCount, broadcastProgress: 1 } : null); });
        const isWifi = isWirelessHop(fromId, toId);
        const toDev = deviceMap.get(toId);
        const currentSegmentHopCountIncrement = (isWifi || toDev?.type === 'router') ? 1 : 0;
        advanceToNextHop(currentSegmentHopCountIncrement);
      }
    };

    pingResumeCallbackRef.current = () => { startTime = Date.now(); pingAnimationRef.current = requestAnimationFrame(animate); };
  }, [
    cancelAnimationFrame,
    checkDeviceConnectivity,
    connections,
    deviceMap,
    deviceStates,
    devices,
    easeInOutCubic,
    getPingDiagnostics,
    getWirelessDistance,
    isSimulationMode,
    isTR,
    latestConnectionsRef,
    latestDevicesRef,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    pingIsPausedRef,
    pingPathRef,
    pingResumeCallbackRef,
    pingStepModeRef,
    requestAnimationFrame,
    setErrorToast,
    setHopPacketInfos,
    setPingAnimation,
    setPingMode,
    flushSync,
    cancelPingDueToInterruptionRef,
  ]);

  return { startPingAnimation };
}
