import { useCallback, useEffect } from 'react';
import { PingAnimationState } from './usePingSequence';

interface UseTopologyPingUIProps {
  pingIsPausedRef: React.MutableRefObject<boolean>;
  pingStepModeRef: React.MutableRefObject<boolean>;
  pingResumeCallbackRef: React.MutableRefObject<(() => void) | null>;
  pingSkipCallbackRef: React.MutableRefObject<(() => void) | null>;
  pingAnimationRef: React.MutableRefObject<number | null>;
  pingCleanupTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  pingPathRef: React.MutableRefObject<string[]>;
  cancelPingDueToInterruptionRef: React.MutableRefObject<(reason: string) => void>;
  setPingAnimation: React.Dispatch<React.SetStateAction<PingAnimationState | null>>;
  setPacketPopupHop: React.Dispatch<React.SetStateAction<number | null>>;
  onPacketPanelFocus?: () => void;
  pingAnimation: PingAnimationState | null;
  startPingAnimation: (sourceId: string, targetId: string, options?: { openPacketPanel?: boolean }) => void;
  isTR: boolean;
}

export function useTopologyPingUI({
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
  isTR
}: UseTopologyPingUIProps) {

  const handlePingPause = useCallback(() => {
    pingIsPausedRef.current = true;
    if (pingAnimationRef.current) {
      cancelAnimationFrame(pingAnimationRef.current);
      pingAnimationRef.current = null;
    }
    setPingAnimation((prev) => prev ? { ...prev, isPaused: true } : null);
  }, [setPingAnimation, pingAnimationRef, pingIsPausedRef]);

  const handlePingPlay = useCallback(() => {
    if (!pingIsPausedRef.current) {
      pingSkipCallbackRef.current?.();
      return;
    }

    pingIsPausedRef.current = false;
    pingStepModeRef.current = false;
    setPingAnimation((prev) => prev ? { ...prev, isPaused: false } : null);
    setPacketPopupHop(null);

    if (pingResumeCallbackRef.current) {
      const resume = pingResumeCallbackRef.current;
      pingResumeCallbackRef.current = null;
      resume();
    }
  }, [setPingAnimation, setPacketPopupHop, pingIsPausedRef, pingStepModeRef, pingResumeCallbackRef, pingSkipCallbackRef]);

  const handlePingNext = useCallback(() => {
    if (!pingIsPausedRef.current) return;

    const resume = pingResumeCallbackRef.current;
    if (!resume) return;

    pingStepModeRef.current = true;
    pingIsPausedRef.current = false;
    setPingAnimation((prev) => prev ? { ...prev, isPaused: false } : null);
    setPacketPopupHop(null);

    resume();
  }, [setPingAnimation, setPacketPopupHop, pingIsPausedRef, pingStepModeRef, pingResumeCallbackRef]);

  const handleEnvelopeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handlePingPause();
    setPingAnimation((prev) => prev ? { ...prev, showPacketPanel: true } : null);
    if (onPacketPanelFocus) onPacketPanelFocus();
    if (pingAnimation) setPacketPopupHop(pingAnimation.currentHopIndex);
  }, [handlePingPause, setPingAnimation, onPacketPanelFocus, pingAnimation, setPacketPopupHop]);

  useEffect(() => {
    return () => {
      pingIsPausedRef.current = false;
      pingStepModeRef.current = false;
      pingResumeCallbackRef.current = null;
      if (pingAnimationRef.current) {
        cancelAnimationFrame(pingAnimationRef.current);
        pingAnimationRef.current = null;
      }
      if (pingCleanupTimeoutRef.current) {
        clearTimeout(pingCleanupTimeoutRef.current);
        pingCleanupTimeoutRef.current = null;
      }
    };
  }, [pingIsPausedRef, pingStepModeRef, pingResumeCallbackRef, pingAnimationRef, pingCleanupTimeoutRef]);

  // Listen for global ping animation trigger
  useEffect(() => {
    const handlePingTrigger = (event: Event) => {
      const { sourceId, targetId, openPacketPanel } = (event as CustomEvent).detail as { sourceId: string; targetId: string; openPacketPanel?: boolean };
      if (sourceId && targetId) {
        startPingAnimation(sourceId, targetId, { openPacketPanel: openPacketPanel ?? true });
      }
    };
    window.addEventListener('trigger-ping-animation', handlePingTrigger as EventListener);
    return () => window.removeEventListener('trigger-ping-animation', handlePingTrigger as EventListener);
  }, [startPingAnimation]);

  // Listen for device power toggle events — cancel active ping if a device in the path is turned off
  useEffect(() => {
    const handlePowerToggle = (event: Event) => {
      const { deviceId, nextStatus } = (event as CustomEvent).detail as { deviceId: string; nextStatus: string };
      if (nextStatus === 'offline' && pingPathRef.current.includes(deviceId)) {
        cancelPingDueToInterruptionRef.current(
          isTR ? 'Cihaz kapatıldığı için ping iptal edildi.' : 'Ping cancelled because a device was powered off.'
        );
      }
    };
    window.addEventListener('trigger-topology-toggle-power', handlePowerToggle as EventListener);
    return () => window.removeEventListener('trigger-topology-toggle-power', handlePowerToggle as EventListener);
  }, [isTR, pingPathRef, cancelPingDueToInterruptionRef]);

  // If one EtherChannel member is powered off during a ping, restart the
  // sequence so path discovery can select the remaining active member.
  useEffect(() => {
    const handleConnectionPowerChange = (event: Event) => {
      const { active } = (event as CustomEvent).detail as { active: boolean };
      const path = pingPathRef.current;
      if (active || path.length < 2) return;
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('trigger-ping-animation', {
        detail: { sourceId: path[0], targetId: path[path.length - 1] }
      })), 100);
    };
    window.addEventListener('topology-connection-power-changed', handleConnectionPowerChange);
    return () => window.removeEventListener('topology-connection-power-changed', handleConnectionPowerChange);
  }, [pingPathRef]);

  return {
    handlePingPause,
    handlePingPlay,
    handlePingNext,
    handleEnvelopeClick
  };
}
