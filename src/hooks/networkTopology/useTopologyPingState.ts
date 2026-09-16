import { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { HopPacketInfo } from '@/components/network/PingPacketInfoPanel';
import type { PingAnimationState } from './usePingSequence';

interface UseTopologyPingStateProps {
  onPingPanelOpenChange?: (isOpen: boolean) => void;
}

export function useTopologyPingState({ onPingPanelOpenChange }: UseTopologyPingStateProps = {}) {
  const [pingMode, setPingMode] = useState(false);
  const pingModeRef = useRef(false);

  const [pingSource, setPingSource] = useState<CanvasDevice | null>(null);
  const pingSourceRef = useRef<CanvasDevice | null>(null);

  useEffect(() => {
    pingModeRef.current = pingMode;
  }, [pingMode]);

  useEffect(() => {
    pingSourceRef.current = pingSource;
  }, [pingSource]);

  const [pingResult, setPingResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pingCursorPos, setPingCursorPos] = useState<{ x: number; y: number } | null>(null);

  const [pingAnimation, setPingAnimation] = useState<PingAnimationState | null>(null);
  const [errorToast, setErrorToast] = useState<{ message: string; details?: string; type?: 'success' | 'error' } | null>(null);
  const [hopPacketInfos, setHopPacketInfos] = useState<HopPacketInfo[]>([]);
  const [packetPopupHop, setPacketPopupHop] = useState<number | null>(null);

  const pingAnimationRef = useRef<number | null>(null);
  const pingCleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIsPausedRef = useRef<boolean>(false);
  const pingResumeCallbackRef = useRef<(() => void) | null>(null);
  const pingSkipCallbackRef = useRef<(() => void) | null>(null);
  const pingStepModeRef = useRef<boolean>(false);
  const pingPathRef = useRef<string[]>([]);
  const cancelPingDueToInterruptionRef = useRef<(reason: string) => void>(() => {});

  const isPingPanelVisible = !!(pingAnimation && pingAnimation.showPacketPanel);

  useEffect(() => {
    onPingPanelOpenChange?.(isPingPanelVisible);
  }, [isPingPanelVisible, onPingPanelOpenChange]);

  const handlePingClose = useCallback(() => {
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
    setPingMode(false);
    setPingSource(null);
    setPingResult(null);
  }, []);

  return {
    pingMode,
    setPingMode,
    pingModeRef,
    pingSource,
    setPingSource,
    pingSourceRef,
    pingResult,
    setPingResult,
    pingCursorPos,
    setPingCursorPos,
    pingAnimation,
    setPingAnimation,
    errorToast,
    setErrorToast,
    hopPacketInfos,
    setHopPacketInfos,
    packetPopupHop,
    setPacketPopupHop,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    pingIsPausedRef,
    pingResumeCallbackRef,
    pingSkipCallbackRef,
    pingStepModeRef,
    pingPathRef,
    cancelPingDueToInterruptionRef,
    isPingPanelVisible,
    handlePingClose,
  };
}



