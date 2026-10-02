import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Regression cover for the low-end hardware detection layer.
 *
 * The bug these tests guard against: the module used to auto-select "high"
 * graphics on a 4-thread / 8 GB machine (the classic old-i3 desktop), write that
 * auto-detected value into the *user preference* key, and thereby permanently
 * disable both hardware detection and the runtime frame-time monitor.
 */

// jsdom in this setup does not expose localStorage, so provide a minimal one.
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => Array.from(store.keys())[index] ?? null,
  get length() {
    return store.size;
  },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true });

const originalCreateElement = document.createElement.bind(document);

interface GlobalWithDeviceMemory {
  deviceMemory?: number;
}

function setHardware(cpuCores: number, deviceMemory?: number) {
  Object.defineProperty(navigator, 'hardwareConcurrency', { value: cpuCores, configurable: true });
  if (deviceMemory === undefined) {
    delete (navigator as unknown as GlobalWithDeviceMemory).deviceMemory;
  } else {
    Object.defineProperty(navigator, 'deviceMemory', { value: deviceMemory, configurable: true });
  }
}

/** Make the WebGL probe report a real GPU so the software-renderer heuristic stays neutral. */
function stubHardwareGpu(renderer = 'ANGLE (NVIDIA GeForce GTX 1050 Direct3D11 vs_5_0 ps_5_0)') {
  document.createElement = ((tagName: string, options?: ElementCreationOptions) => {
    const element = originalCreateElement(tagName, options);
    if (tagName === 'canvas') {
      (element as HTMLCanvasElement).getContext = ((contextId: string) => {
        if (contextId === 'webgl' || contextId === 'experimental-webgl') {
          return {
            getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 0x9246 }),
            getParameter: () => renderer,
            RENDERER: 0x1f01,
          } as unknown as WebGLRenderingContext;
        }
        return null;
      }) as HTMLCanvasElement['getContext'];
    }
    return element;
  }) as typeof document.createElement;
}

/** Software rasterizer: exactly the "no GPU" machine the low path exists for. */
function stubSoftwareGpu() {
  document.createElement = ((tagName: string, options?: ElementCreationOptions) => {
    const element = originalCreateElement(tagName, options);
    if (tagName === 'canvas') {
      (element as HTMLCanvasElement).getContext = (() =>
        null) as unknown as HTMLCanvasElement['getContext'];
    }
    return element;
  }) as typeof document.createElement;
}

async function loadDetector() {
  vi.resetModules();
  return import('@/lib/performance/performanceDetector');
}

describe('performanceDetector — hardware heuristics', () => {
  beforeEach(() => {
    localStorage.clear();
    stubHardwareGpu();
  });

  afterEach(() => {
    document.createElement = originalCreateElement as typeof document.createElement;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('treats a 4-thread / 8 GB machine (old i3 class) as low-end', async () => {
    setHardware(4, 8);
    const detector = await loadDetector();
    expect(detector.detectLowEndHardware()).toBe(true);
  });

  it('keeps a many-core, high-memory machine on the full graphics path', async () => {
    setHardware(16, 32);
    const detector = await loadDetector();
    expect(detector.detectLowEndHardware()).toBe(false);
  });

  it('falls back to low when no WebGL renderer is available at all', async () => {
    setHardware(16, 32);
    stubSoftwareGpu();
    const detector = await loadDetector();
    expect(detector.detectSoftwareRendering()).toBe(true);
    expect(detector.detectLowEndHardware()).toBe(true);
  });

  it('reports low graphics for detected low-end hardware and high for strong hardware', async () => {
    setHardware(4, 8);
    let detector = await loadDetector();
    expect(detector.shouldUseLowGraphicsMode(null)).toBe('low');

    setHardware(16, 32);
    detector = await loadDetector();
    expect(detector.shouldUseLowGraphicsMode(null)).toBe('high');
  });
});

describe('performanceDetector — preference handling', () => {
  beforeEach(() => {
    localStorage.clear();
    stubHardwareGpu();
  });

  afterEach(() => {
    document.createElement = originalCreateElement as typeof document.createElement;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('never overrides an explicit user preference', async () => {
    setHardware(2, 2); // would auto-detect as low
    const detector = await loadDetector();

    detector.setGraphicsQualityPreference('high');
    expect(detector.hasExplicitGraphicsPreference()).toBe(true);
    expect(detector.shouldUseLowGraphicsMode('high')).toBe('high');
  });

  it('discards a legacy auto-detected value written by an older build', async () => {
    // Older builds wrote the *detected* quality into the preference key with no
    // version marker, which pinned weak machines to high graphics forever.
    localStorage.setItem('graphics-quality-preference', 'high');
    const detector = await loadDetector();

    expect(detector.hasExplicitGraphicsPreference()).toBe(false);
    expect(localStorage.getItem('graphics-quality-preference')).toBeNull();
  });

  it('records the auto-detected value under its own key only', async () => {
    setHardware(4, 8);
    const detector = await loadDetector();

    detector.shouldUseLowGraphicsMode(null);
    expect(localStorage.getItem('graphics-quality-auto')).toBe('low');
    expect(localStorage.getItem('graphics-quality-preference')).toBeNull();
  });
});

describe('performanceDetector — startup quality', () => {
  beforeEach(() => {
    localStorage.clear();
    stubHardwareGpu();
    delete window.__NETSIM_GRAPHICS_QUALITY__;
  });

  afterEach(() => {
    document.createElement = originalCreateElement as typeof document.createElement;
    localStorage.clear();
    delete window.__NETSIM_GRAPHICS_QUALITY__;
    vi.restoreAllMocks();
  });

  it('starts low-end hardware on the light path before the first render', async () => {
    setHardware(4, 8);
    const detector = await loadDetector();
    expect(detector.getInitialGraphicsQuality()).toBe('low');
  });

  it('starts strong hardware on the full path before the first render', async () => {
    setHardware(16, 32);
    const detector = await loadDetector();
    expect(detector.getInitialGraphicsQuality()).toBe('high');
  });

  it('reuses the pre-paint verdict instead of probing again', async () => {
    setHardware(16, 32);
    window.__NETSIM_GRAPHICS_QUALITY__ = 'low';
    const detector = await loadDetector();
    expect(detector.getInitialGraphicsQuality()).toBe('low');
  });

  it('lets an explicit choice win over the pre-paint verdict', async () => {
    setHardware(4, 8);
    window.__NETSIM_GRAPHICS_QUALITY__ = 'low';
    const detector = await loadDetector();

    detector.setGraphicsQualityPreference('high');
    expect(detector.getInitialGraphicsQuality()).toBe('high');
  });
});

describe('performanceDetector — graphics-low class', () => {
  beforeEach(() => {
    localStorage.clear();
    stubHardwareGpu();
  });

  afterEach(() => {
    document.createElement = originalCreateElement as typeof document.createElement;
    document.documentElement.className = '';
    document.body.className = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('marks both the document element and the body, and clears them again', async () => {
    setHardware(4, 8);
    const detector = await loadDetector();

    detector.applyGraphicsQualityClass('low');
    expect(document.documentElement.classList.contains('graphics-low')).toBe(true);
    expect(document.body.classList.contains('graphics-low')).toBe(true);

    detector.applyGraphicsQualityClass('high');
    expect(document.documentElement.classList.contains('graphics-low')).toBe(false);
    expect(document.body.classList.contains('graphics-low')).toBe(false);
    expect(document.body.classList.contains('graphics-high')).toBe(true);
  });
});

describe('PerformanceMonitor — hysteresis', () => {
  it('degrades after a sustained slow trend and upgrades only after a long fast run', async () => {
    const detector = await loadDetector();
    const recommendations: Array<'high' | 'low'> = [];
    const monitor = new detector.PerformanceMonitor((quality) => recommendations.push(quality));

    // One isolated slow frame must not be enough.
    monitor.recordFrame(120);
    monitor.checkPerformance(10_000);
    expect(recommendations).toEqual([]);

    // Sustained slow frames across two consecutive checks -> degrade once.
    for (let i = 0; i < 40; i++) monitor.recordFrame(60);
    monitor.checkPerformance(20_000);
    monitor.checkPerformance(30_000);
    expect(recommendations).toEqual(['low']);

    // The callback must not repeat the same recommendation.
    monitor.checkPerformance(40_000);
    expect(recommendations).toEqual(['low']);

    // Healthy frames need a long confirmation window before upgrading, and the
    // whole sample window has to flush first.
    for (let i = 0; i < 90; i++) monitor.recordFrame(10);
    for (let i = 0; i < 6; i++) monitor.checkPerformance(50_000 + i * 10_000);
    expect(recommendations).toEqual(['low', 'high']);
  });
});

describe('performanceDetector — connection quality', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports a slow connection when the Network Information API says so', async () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '2g', saveData: false, downlink: 0.3, rtt: 800 },
      configurable: true,
    });
    const detector = await loadDetector();
    expect(detector.getConnectionQuality().slow).toBe(true);
  });

  it('reports a fast connection as not slow', async () => {
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '4g', saveData: false, downlink: 10, rtt: 40 },
      configurable: true,
    });
    const detector = await loadDetector();
    expect(detector.getConnectionQuality().slow).toBe(false);
  });
});
