/**
 * Performance Detection Utility
 * Detects low-end hardware and automatically adjusts graphics quality
 * for optimal performance on older CPUs, low RAM, integrated/no GPU and slow links.
 */

export type GraphicsQuality = 'high' | 'low';

/**
 * Global the pre-paint script in `app/layout.tsx` fills in before React boots.
 * It runs the same cheap heuristics on raw DOM APIs (a head script cannot
 * import modules), so the first frame is already painted in the right mode
 * instead of starting heavy and being corrected a few seconds later.
 */
declare global {
  interface Window {
    __NETSIM_GRAPHICS_QUALITY__?: GraphicsQuality;
  }
}

/** Explicit user choice — wins over every automatic heuristic. */
export const GRAPHICS_PREFERENCE_KEY = 'graphics-quality-preference';
/** Last automatically detected value. Informational only: never treated as a user choice. */
export const GRAPHICS_AUTO_KEY = 'graphics-quality-auto';
/**
 * Marker that separates a deliberate choice from a value an older build wrote
 * during first-run auto detection. Older builds stored the detected quality in
 * the preference key, which permanently pinned slow machines to high graphics;
 * values without the current marker are therefore discarded and re-detected.
 */
const GRAPHICS_PREFERENCE_VERSION_KEY = 'graphics-quality-preference-version';
const GRAPHICS_PREFERENCE_VERSION = '2';

export interface PerformanceMetrics {
  // Hardware capabilities
  cpuCores: number;
  deviceMemory: number; // in GB
  hardwareConcurrency: number;

  // Runtime performance
  frameRate: number;
  renderTime: number; // ms per frame
  memoryUsage: number; // MB

  // Detected performance level
  performanceLevel: 'high' | 'medium' | 'low';
  recommendedGraphicsQuality: GraphicsQuality;
}

interface SoftwareRendererState {
  checked: boolean;
  software: boolean;
}

const softwareRendererState: SoftwareRendererState = { checked: false, software: false };

/**
 * Detect software rasterization (no usable GPU).
 * Chrome/Firefox fall back to SwiftShader/llvmpipe when hardware acceleration is
 * unavailable or disabled — exactly the machines that choke on blurs, filters
 * and large composited layers.
 */
export function detectSoftwareRendering(): boolean {
  if (softwareRendererState.checked) return softwareRendererState.software;
  softwareRendererState.checked = true;

  if (typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false })) as WebGLRenderingContext | null;

    if (!gl) {
      // No WebGL at all: the compositor has nothing to accelerate with.
      softwareRendererState.software = true;
      return true;
    }

    let renderer = String(gl.getParameter(gl.RENDERER) || '');
    if (!renderer || /webgl|generic/i.test(renderer)) {
      try {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || renderer);
        }
      } catch {
        // Fallback silently if extension is unsupported or deprecated
      }
    }

    const software = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen|angle \(google, vulkan 1\.\d+ \(swiftshader/i.test(
      renderer
    );

    softwareRendererState.software = software;
    return software;
  } catch {
    return false;
  }
}

/** Effective network quality, when the Network Information API is available. */
export function getConnectionQuality(): { slow: boolean; effectiveType: string | null; saveData: boolean } {
  if (typeof navigator === 'undefined') return { slow: false, effectiveType: null, saveData: false };
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean; downlink?: number; rtt?: number };
  }).connection;

  if (!connection) return { slow: false, effectiveType: null, saveData: false };

  const effectiveType = connection.effectiveType ?? null;
  const saveData = connection.saveData === true;
  const slowType = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
  const slowDownlink = typeof connection.downlink === 'number' && connection.downlink > 0 && connection.downlink < 1.5;
  const slowRtt = typeof connection.rtt === 'number' && connection.rtt > 300;

  return { slow: saveData || slowType || slowDownlink || slowRtt, effectiveType, saveData };
}

/**
 * Score how likely the current machine is to struggle with the full graphics
 * pipeline. Anything at or above 3 selects the light rendering path.
 *
 * Calibrated so that the classic "old i3 / 8 GB DDR3 / no discrete GPU"
 * desktop lands in low mode instead of running every blur, filter and
 * infinite animation.
 */
export function scoreHardwareCapability(): number {
  if (typeof navigator === 'undefined') return 0;

  const cpuCores = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  let score = 0;

  if (cpuCores <= 2) score += 3;
  else if (cpuCores <= 4) score += 2;
  else if (cpuCores <= 6) score += 1;

  if (typeof deviceMemory === 'number') {
    if (deviceMemory <= 4) score += 3;
    else if (deviceMemory <= 8) score += 2;
  }

  if (detectSoftwareRendering()) score += 4;

  const connection = getConnectionQuality();
  if (connection.slow) score += 1;

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice && window.innerWidth <= 900) score += 1;

  return score;
}

/**
 * Detect if the device is likely low-end hardware.
 * Prefers an explicit, cheap heuristic and falls back to a short CPU probe.
 */
export function detectLowEndHardware(): boolean {
  if (typeof window === 'undefined') return false;
  return scoreHardwareCapability() >= 3;
}

/**
 * Run a quick performance benchmark to measure rendering capability.
 * The work is chunked across animation frames so a slow machine still paints
 * instead of freezing for the whole probe.
 */
export async function runPerformanceBenchmark(): Promise<number> {
  const iterations = 700;

  function fibonacci(n: number): number {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  const started = performance.now();

  // Chunk so the main thread can still paint between slices.
  const chunk = 100;
  for (let done = 0; done < iterations; done += chunk) {
    const end = Math.min(iterations, done + chunk);
    for (let i = done; i < end; i++) fibonacci(10);
    if (typeof requestAnimationFrame === 'function' && end < iterations) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }

  return performance.now() - started;
}

/**
 * Get comprehensive performance metrics.
 * The probe only runs when the static heuristics are inconclusive, so a
 * degraded machine does not pay for it.
 */
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  const cpuCores = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8;

  const hardwareScore = scoreHardwareCapability();
  const benchmarkTime = hardwareScore >= 3 ? 0 : await runPerformanceBenchmark();

  // Static heuristics are authoritative: anything that scores at or above the
  // low-end threshold keeps the light rendering path even if the short CPU
  // probe happens to pass (an idle i3 can still spike a trivial benchmark).
  const wantsLowGraphics = hardwareScore >= 3 || benchmarkTime > 35;

  let performanceLevel: 'high' | 'medium' | 'low';
  if (wantsLowGraphics && (hardwareScore >= 5 || benchmarkTime > 60)) {
    performanceLevel = 'low';
  } else if (wantsLowGraphics || hardwareScore >= 1 || benchmarkTime > 30) {
    performanceLevel = 'medium';
  } else {
    performanceLevel = 'high';
  }

  const recommendedGraphicsQuality: GraphicsQuality = wantsLowGraphics ? 'low' : 'high';

  return {
    cpuCores,
    deviceMemory,
    hardwareConcurrency: cpuCores,
    frameRate: benchmarkTime > 0 ? Math.min(60, Math.max(15, 1000 / (benchmarkTime + 1))) : 60,
    renderTime: benchmarkTime,
    memoryUsage: 0,
    performanceLevel,
    recommendedGraphicsQuality,
  };
}

/** True when the user explicitly picked a quality level from the UI. */
export function hasExplicitGraphicsPreference(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const value = localStorage.getItem(GRAPHICS_PREFERENCE_KEY);
    if (value !== 'high' && value !== 'low') return false;

    if (localStorage.getItem(GRAPHICS_PREFERENCE_VERSION_KEY) !== GRAPHICS_PREFERENCE_VERSION) {
      // Written by an older build during auto detection — not a user choice.
      localStorage.removeItem(GRAPHICS_PREFERENCE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Quality the app should start with, resolved before the first React render.
 *
 * The pre-paint script already made the same call; reusing its verdict keeps
 * the stylesheet and the React tree from disagreeing about the starting mode.
 */
export function getInitialGraphicsQuality(): GraphicsQuality {
  if (hasExplicitGraphicsPreference()) {
    try {
      return localStorage.getItem(GRAPHICS_PREFERENCE_KEY) === 'low' ? 'low' : 'high';
    } catch {
      return 'high';
    }
  }

  const prePaint = typeof window !== 'undefined' ? window.__NETSIM_GRAPHICS_QUALITY__ : undefined;
  if (prePaint === 'high' || prePaint === 'low') return prePaint;

  return detectLowEndHardware() ? 'low' : 'high';
}

/**
 * Mirror the active quality onto a `graphics-low` class so the stylesheet can
 * drop blurs, filters and animations.
 *
 * The class is set on the document element as well as the body because the
 * pre-paint script can only reach `<html>` — it runs in `<head>`, before the
 * body exists. Both nodes are cleared here so switching back to high graphics
 * never leaves a stale low-graphics class behind.
 */
export function applyGraphicsQualityClass(quality: GraphicsQuality): void {
  if (typeof document === 'undefined') return;
  const useLow = quality === 'low';
  document.documentElement.classList.toggle('graphics-low', useLow);
  document.documentElement.classList.toggle('graphics-high', !useLow);
  if (document.body) {
    document.body.classList.toggle('graphics-low', useLow);
    document.body.classList.toggle('graphics-high', !useLow);
  }
}

/** Persist the user's explicit choice so detection never overrides it. */
export function setGraphicsQualityPreference(quality: GraphicsQuality): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(GRAPHICS_PREFERENCE_KEY, quality);
    localStorage.setItem(GRAPHICS_PREFERENCE_VERSION_KEY, GRAPHICS_PREFERENCE_VERSION);
  } catch {
    /* storage unavailable (private mode) — detection keeps working in memory */
  }
}

export function clearGraphicsQualityPreference(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(GRAPHICS_PREFERENCE_KEY);
    localStorage.removeItem(GRAPHICS_PREFERENCE_VERSION_KEY);
  } catch {
    /* ignore */
  }
}

function rememberAutoDetected(quality: GraphicsQuality): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(GRAPHICS_AUTO_KEY, quality);
  } catch {
    /* ignore */
  }
}

/**
 * Check if we should use low graphics mode based on stored user preference
 * or automatic detection.
 */
export function shouldUseLowGraphicsMode(storedPreference: GraphicsQuality | null): GraphicsQuality {
  if (storedPreference === 'high' || storedPreference === 'low') return storedPreference;

  const detected: GraphicsQuality = detectLowEndHardware() ? 'low' : 'high';
  rememberAutoDetected(detected);
  return detected;
}

/**
 * Monitor performance over time and suggest quality changes.
 *
 * Only meaningful signals move the recommendation:
 *  - sustained frame drops degrade,
 *  - a long run of comfortable frames upgrades,
 *  - a single outlier frame never flips the mode.
 */
export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private maxSamples = 90;
  private callback: (quality: GraphicsQuality) => void;
  private lastCheck = 0;
  private checkInterval = 4000;
  private lastRecommendation: GraphicsQuality | null = null;
  private consecutiveSlowChecks = 0;
  private consecutiveFastChecks = 0;

  constructor(callback: (quality: GraphicsQuality) => void) {
    this.callback = callback;
  }

  recordFrame(frameTime: number) {
    // Ignore absurd samples (tab restored, breakpoint hit) — they are not
    // representative of steady state and would cause flapping.
    if (!Number.isFinite(frameTime) || frameTime <= 0 || frameTime > 1000) return;
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }

  checkPerformance(timestamp: number, minSamples: number = 30) {
    if (timestamp - this.lastCheck < this.checkInterval) return;
    this.lastCheck = timestamp;

    if (this.frameTimes.length < minSamples) return;

    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    // Use the median: one janky frame should not condemn the whole window.
    const median = sorted[Math.floor(sorted.length / 2)];
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const effectiveFrameTime = Math.max(median, avg * 0.6);

    if (effectiveFrameTime > 28) {
      this.consecutiveSlowChecks++;
      this.consecutiveFastChecks = 0;
    } else if (effectiveFrameTime < 20) {
      this.consecutiveFastChecks++;
      this.consecutiveSlowChecks = 0;
    } else {
      return;
    }

    // Require a sustained trend before changing anything.
    if (this.consecutiveSlowChecks >= 2 && this.lastRecommendation !== 'low') {
      this.lastRecommendation = 'low';
      this.callback('low');
    } else if (this.consecutiveFastChecks >= 6 && this.lastRecommendation !== 'high') {
      this.lastRecommendation = 'high';
      this.callback('high');
    }
  }

  reset() {
    this.frameTimes = [];
    this.consecutiveSlowChecks = 0;
    this.consecutiveFastChecks = 0;
    this.lastRecommendation = null;
  }
}
