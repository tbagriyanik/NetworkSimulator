'use client';

import React, { useRef, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { checkDeviceConnectivity, getPingDiagnostics, getWirelessDistance } from '@/lib/network/connectivity';
import { easeInOutCubic } from '@/components/network/NetworkTopology/utils/networkTopology.helpers';
import { usePingAnimation } from './usePingAnimation';
import { usePingSequence, type PingAnimationState } from './usePingSequence';
import { useTopologyPingUI } from './useTopologyPingUI';

interface UseTopologyPingControllerProps {
  connections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
  deviceMap: Map<string, CanvasDevice>;
  devices: CanvasDevice[];
  isTR: boolean;
  isSimulationMode: boolean;
  latestDevicesRef: React.MutableRefObject<CanvasDevice[]>;
  latestConnectionsRef: React.MutableRefObject<CanvasConnection[]>;
  pingAnimationRef: React.MutableRefObject<number | null>;
  pingCleanupTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  pingIsPausedRef: React.MutableRefObject<boolean>;
  pingStepModeRef: React.MutableRefObject<boolean>;
  pingResumeCallbackRef: React.MutableRefObject<(() => void) | null>;
  pingSkipCallbackRef: React.MutableRefObject<(() => void) | null>;
  pingPathRef: React.MutableRefObject<string[]>;
  cancelPingDueToInterruptionRef: React.MutableRefObject<(reason: string) => void>;
  setPingAnimation: React.Dispatch<React.SetStateAction<PingAnimationState | null>>;
  setHopPacketInfos: (infos: any) => void;
  setErrorToast: (toast: any) => void;
  setPingMode: (mode: boolean) => void;
  setPacketPopupHop: React.Dispatch<React.SetStateAction<number | null>>;
  onPacketPanelFocus?: () => void;
  pingAnimation: PingAnimationState | null;
}

export function useTopologyPingController({
  connections,
  deviceStates,
  deviceMap,
  devices,
  isTR,
  isSimulationMode,
  latestDevicesRef,
  latestConnectionsRef,
  pingAnimationRef,
  pingCleanupTimeoutRef,
  pingIsPausedRef,
  pingStepModeRef,
  pingResumeCallbackRef,
  pingSkipCallbackRef,
  pingPathRef,
  cancelPingDueToInterruptionRef,
  setPingAnimation,
  setHopPacketInfos,
  setErrorToast,
  setPingMode,
  setPacketPopupHop,
  onPacketPanelFocus,
  pingAnimation,
}: UseTopologyPingControllerProps) {
  const startPingAnimationRef = useRef<((sourceId: string, targetId: string) => void) | null>(null);

  const { cancelPingDueToInterruption } = usePingAnimation({
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
  });

  const { startPingAnimation } = usePingSequence({
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
    pingSkipCallbackRef,
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
  });

  const {
    handlePingPause,
    handlePingPlay,
    handlePingNext,
    handleEnvelopeClick,
  } = useTopologyPingUI({
    pingIsPausedRef,
    pingStepModeRef,
    pingResumeCallbackRef,
    pingSkipCallbackRef,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    pingPathRef,
    cancelPingDueToInterruptionRef,
    setPingAnimation,
    setPacketPopupHop,
    onPacketPanelFocus,
    pingAnimation,
    startPingAnimation,
    isTR,
  });

  useLayoutEffect(() => {
    cancelPingDueToInterruptionRef.current = cancelPingDueToInterruption;
  }, [cancelPingDueToInterruption, cancelPingDueToInterruptionRef]);

  useLayoutEffect(() => {
    startPingAnimationRef.current = startPingAnimation;
  }, [startPingAnimation]);

  return {
    startPingAnimation,
    startPingAnimationRef,
    cancelPingDueToInterruption,
    handlePingPause,
    handlePingPlay,
    handlePingNext,
    handleEnvelopeClick,
  };
}


