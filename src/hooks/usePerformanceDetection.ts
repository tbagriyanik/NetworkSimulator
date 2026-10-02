/**
 * Performance Detection Hook
 * Automatically detects hardware capabilities and adjusts graphics quality
 * for optimal performance on low-end devices.
 *
 * Two rules keep this predictable:
 *  1. An explicit user preference always wins — auto detection never overrides it.
 *  2. The auto-detected value is never stored as a user preference, so the
 *     runtime monitor stays active and can still degrade a machine that turns
 *     out to be slower than its specs suggested.
 */

import { useEffect, useRef, useState } from 'react';
import {
  shouldUseLowGraphicsMode,
  getPerformanceMetrics,
  PerformanceMonitor,
  hasExplicitGraphicsPreference,
  detectLowEndHardware,
} from '@/lib/performance/performanceDetector';

export function usePerformanceDetection(
  currentGraphicsQuality: 'high' | 'low',
  onQualityChange: (quality: 'high' | 'low') => void
) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getPerformanceMetrics>> | null>(null);

  useEffect(() => {
    // An explicit choice from the UI is final; do not probe at all.
    if (hasExplicitGraphicsPreference()) return;

    setIsDetecting(true);

    let cancelled = false;

    const detectAndSetQuality = async () => {
      try {
        // Cheap static heuristics first: on an obviously low-end machine this
        // already settles the answer without running the CPU probe.
        onQualityChange(shouldUseLowGraphicsMode(null));

        const detailedMetrics = await getPerformanceMetrics();
        if (cancelled) return;
        setMetrics(detailedMetrics);
      } catch (error) {
        console.error('Performance detection failed:', error);
      } finally {
        if (!cancelled) setIsDetecting(false);
      }
    };

    detectAndSetQuality();

    return () => {
      cancelled = true;
    };
  }, []);

  // Hardware verdict from the static heuristics. A machine that is weak on
  // paper keeps the light rendering path even while it looks idle (an idle
  // frame is still 16.7ms, which no frame-time monitor can tell apart from a
  // healthy machine).
  const hardwareRequiresLowRef = useRef<boolean | null>(null);
  if (hardwareRequiresLowRef.current === null) {
    hardwareRequiresLowRef.current = typeof window === 'undefined' ? false : detectLowEndHardware();
  }

  // Runtime monitoring: only ever reacts when the user has made no explicit
  // choice, and degrades faster than it upgrades so a bad frame budget is
  // corrected quickly while a recovery is confirmed slowly.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const monitor = new PerformanceMonitor((recommendedQuality) => {
      if (hasExplicitGraphicsPreference()) return;
      if (recommendedQuality === 'high' && hardwareRequiresLowRef.current) return;
      onQualityChange(recommendedQuality);
    });

    let animationFrameId = 0;
    let samplingTimeoutId = 0;
    let lastTime = performance.now();

    // The monitor exists to catch a frame budget that cannot be met. Once the
    // picture is stable there is nothing left to learn from a 60Hz sample
    // loop, and waking the main thread every frame competes with the very
    // canvas work it is measuring. So the loop sleeps while the tab is hidden
    // (rAF already stalls, but the handler stays parked rather than racing
    // ahead on restore) and backs off to a cheap periodic sample once the
    // recommendation has been unchanged for a while.
    const STABLE_SAMPLES = 900; // ~15s of frames at 60Hz
    const BURST_SAMPLE_COUNT = 30;
    const IDLE_SAMPLE_INTERVAL = 5000;
    let stableSamples = 0;
    let burstSampleCount = 0;
    let reducedSampling = false;

    const scheduleNextSample = () => {
      if (document.hidden) return;
      if (reducedSampling && burstSampleCount === 0) {
        samplingTimeoutId = window.setTimeout(() => {
          samplingTimeoutId = 0;
          lastTime = performance.now();
          animationFrameId = requestAnimationFrame(monitorPerformance);
        }, IDLE_SAMPLE_INTERVAL);
        return;
      }
      animationFrameId = requestAnimationFrame(monitorPerformance);
    };

    const monitorPerformance = (timestamp: number) => {
      const frameTime = timestamp - lastTime;
      lastTime = timestamp;

      if (!reducedSampling) {
        monitor.recordFrame(frameTime);
        monitor.checkPerformance(timestamp);
        stableSamples += 1;
        if (stableSamples >= STABLE_SAMPLES) reducedSampling = true;
      } else {
        monitor.recordFrame(frameTime);
        monitor.checkPerformance(timestamp);
        burstSampleCount = (burstSampleCount + 1) % BURST_SAMPLE_COUNT;
      }

      scheduleNextSample();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (samplingTimeoutId) clearTimeout(samplingTimeoutId);
        animationFrameId = 0;
        samplingTimeoutId = 0;
      } else if (animationFrameId === 0) {
        // Resuming: drop the accumulated gap instead of reporting it as a stall.
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(monitorPerformance);
      }
    };

    animationFrameId = requestAnimationFrame(monitorPerformance);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (samplingTimeoutId) clearTimeout(samplingTimeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [onQualityChange]);

  return {
    isDetecting,
    metrics,
    isLowEndHardware: currentGraphicsQuality === 'low',
  };
}
