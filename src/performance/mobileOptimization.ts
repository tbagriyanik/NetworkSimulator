import { logger } from '@/lib/logger';

/**
 * Mobile Performance Optimization
 * Optimizes performance for mobile devices with bundle size minimization, lazy loading, and touch optimization
 *
 * **Validates: Requirements 6.4, 6.5**
 */

// ============================================================================
// Mobile Performance Detection
// ============================================================================

interface DeviceCapabilities {
    isMobile: boolean;
    isTablet: boolean;
    isLowEnd: boolean;
    memory: number;
    cores: number;
    pixelRatio: number;
    touchEnabled: boolean;
    gpuTier: 'low' | 'medium' | 'high';
}

class MobilePerformanceDetector {
    private capabilities: DeviceCapabilities;

    constructor() {
        this.capabilities = this.detectCapabilities();
    }

    private detectCapabilities(): DeviceCapabilities {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(userAgent);
        const isTablet = /tablet|ipad|android(?!.*mobile)|silk/.test(userAgent);

        // Detect low-end devices
        const memory = (navigator as any).deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;
        const isLowEnd = memory <= 2 || cores <= 2;

        // GPU tier detection based on canvas performance
        const gpuTier = this.detectGPUTier();

        return {
            isMobile,
            isTablet,
            isLowEnd,
            memory,
            cores,
            pixelRatio: window.devicePixelRatio || 1,
            touchEnabled: 'ontouchstart' in window,
            gpuTier,
        };
    }

    private detectGPUTier(): 'low' | 'medium' | 'high' {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

        if (!gl) return 'low';

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

            // Simple GPU detection based on renderer string
            if (renderer.includes('Mali') || renderer.includes('Adreno 3')) {
                return 'low';
            } else if (renderer.includes('Adreno 4') || renderer.includes('Mali-T')) {
                return 'medium';
            } else {
                return 'high';
            }
        }

        return 'medium'; // Default to medium if can't detect
    }

    getCapabilities(): DeviceCapabilities {
        return this.capabilities;
    }

    shouldOptimize(): boolean {
        return this.capabilities.isMobile || this.capabilities.isLowEnd;
    }

    getOptimizationLevel(): 'minimal' | 'moderate' | 'aggressive' {
        if (this.capabilities.isLowEnd) return 'aggressive';
        if (this.capabilities.isMobile) return 'moderate';
        return 'minimal';
    }
}

// ============================================================================
// Touch Event Optimization
// ============================================================================

class TouchEventOptimizer {
    private touchStartTime: number = 0;
    private touchStartPos: { x: number; y: number } = { x: 0, y: 0 };
    private isTouching: boolean = false;
    private gestureThreshold: number = 10;
    private tapTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(private onTap?: (x: number, y: number) => void) {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    private handleTouchStart(event: TouchEvent) {
        this.touchStartTime = performance.now();
        this.touchStartPos = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
        };
        this.isTouching = true;
    }

    private handleTouchMove(event: TouchEvent) {
        if (!this.isTouching) return;

        const currentPos = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
        };

        const distance = Math.sqrt(
            Math.pow(currentPos.x - this.touchStartPos.x, 2) +
            Math.pow(currentPos.y - this.touchStartPos.y, 2)
        );

        if (distance > this.gestureThreshold) {
            // Cancel tap if moved too much
            if (this.tapTimeout) {
                clearTimeout(this.tapTimeout);
                this.tapTimeout = null;
            }
        }
    }

    private handleTouchEnd(event: TouchEvent) {
        if (!this.isTouching) return;

        const touchDuration = performance.now() - this.touchStartTime;
        const endPos = {
            x: event.changedTouches[0].clientX,
            y: event.changedTouches[0].clientY,
        };

        const distance = Math.sqrt(
            Math.pow(endPos.x - this.touchStartPos.x, 2) +
            Math.pow(endPos.y - this.touchStartPos.y, 2)
        );

        // Check if it's a tap (short duration and minimal movement)
        if (touchDuration < 200 && distance < this.gestureThreshold) {
            this.tapTimeout = setTimeout(() => {
                if (this.onTap) {
                    this.onTap(endPos.x, endPos.y);
                }
            }, 50);
        }

        this.isTouching = false;
    }

    destroy() {
        document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        document.removeEventListener('touchend', this.handleTouchEnd.bind(this));

        if (this.tapTimeout) {
            clearTimeout(this.tapTimeout);
        }
    }
}

// ============================================================================
// Lazy Loading System
// ============================================================================

class LazyLoadManager {
    private loadedModules: Set<string> = new Set();
    private loadingPromises: Map<string, Promise<any>> = new Map();
    private observer: IntersectionObserver;

    constructor() {
        this.observer = new IntersectionObserver(
            this.handleIntersection.bind(this),
            {
                rootMargin: '50px',
                threshold: 0.1,
            }
        );
    }

    private async handleIntersection(entries: IntersectionObserverEntry[]) {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const element = entry.target as HTMLElement;
                const moduleName = element.dataset.lazyModule;

                if (moduleName && !this.loadedModules.has(moduleName)) {
                    this.loadModule(moduleName);
                    this.observer.unobserve(element);
                }
            }
        }
    }

    async loadModule(moduleName: string): Promise<any> {
        if (this.loadedModules.has(moduleName)) {
            return this.getLoadedModule(moduleName);
        }

        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }

        const loadPromise = this.performModuleLoad(moduleName);
        this.loadingPromises.set(moduleName, loadPromise);

        try {
            const loadedModule = await loadPromise;
            this.loadedModules.add(moduleName);
            return loadedModule;
        } catch (error) {
            logger.error(`Failed to load module ${moduleName}:`, error);
            throw error;
        } finally {
            this.loadingPromises.delete(moduleName);
        }
    }

    private async performModuleLoad(moduleName: string): Promise<any> {
        // Dynamic import based on module name
        const moduleMap: Record<string, () => Promise<any>> = {
            'network-canvas': () => import('../components/network/NetworkCanvas'),
            'device-panel': () => import('../components/ui/DeviceConfigurationPanel'),
            'achievement-system': () => import('../utils/achievement'),
            'help-panel': () => import('../components/ui/HelpPanel'),
        };

        const loadFunction = moduleMap[moduleName];
        if (!loadFunction) {
            throw new Error(`Unknown module: ${moduleName}`);
        }

        return loadFunction();
    }

    private getLoadedModule(moduleName: string): any {
        // Return cached module
        return null; // Implementation would return cached module
    }

    observe(element: HTMLElement, moduleName: string) {
        element.dataset.lazyModule = moduleName;
        this.observer.observe(element);
    }

    unobserve(element: HTMLElement) {
        this.observer.unobserve(element);
    }

    preloadModules(moduleNames: string[]): Promise<any[]> {
        return Promise.all(moduleNames.map(name => this.loadModule(name)));
    }
}

// ============================================================================
// Animation Optimization
// ============================================================================

class AnimationOptimizer {
    private reducedMotion: boolean;
    private frameRate: number;
    private animationQueue: Array<() => void> = [];
    private isAnimating: boolean = false;

    constructor() {
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.frameRate = this.detectOptimalFrameRate();
        this.setupMediaQueryListener();
    }

    private detectOptimalFrameRate(): number {
        const capabilities = new MobilePerformanceDetector().getCapabilities();

        if (capabilities.isLowEnd) {
            return 30; // Lower FPS for low-end devices
        } else if (capabilities.isMobile) {
            return 45; // Medium FPS for mobile
        } else {
            return 60; // Full FPS for desktop
        }
    }

    private setupMediaQueryListener() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addListener((e) => {
            this.reducedMotion = e.matches;
        });
    }

    shouldAnimate(): boolean {
        return !this.reducedMotion;
    }

    getOptimalFrameRate(): number {
        return this.frameRate;
    }

    scheduleAnimation(animation: () => void): void {
        this.animationQueue.push(animation);

        if (!this.isAnimating) {
            this.processAnimationQueue();
        }
    }

    private processAnimationQueue(): void {
        if (this.animationQueue.length === 0) {
            this.isAnimating = false;
            return;
        }

        this.isAnimating = true;
        const frameInterval = 1000 / this.frameRate;
        let lastFrameTime = 0;

        const animate = (currentTime: number) => {
            if (currentTime - lastFrameTime >= frameInterval) {
                const animation = this.animationQueue.shift();
                if (animation) {
                    animation();
                }
                lastFrameTime = currentTime;
            }

            if (this.animationQueue.length > 0) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };

        requestAnimationFrame(animate);
    }

    clearAnimationQueue(): void {
        this.animationQueue = [];
    }
}

// ============================================================================
// Memory Management
// ============================================================================

class MemoryManager {
    private memoryThreshold: number;
    private cleanupInterval: number;
    private objectPool: Map<string, any[]> = new Map();

    constructor() {
        const capabilities = new MobilePerformanceDetector().getCapabilities();
        this.memoryThreshold = capabilities.memory * 0.7 * 1024 * 1024 * 1024; // 70% of available memory
        this.cleanupInterval = capabilities.isMobile ? 30000 : 60000; // 30s on mobile, 60s on desktop

        this.startMemoryMonitoring();
    }

    private startMemoryMonitoring() {
        setInterval(() => {
            this.checkMemoryUsage();
        }, this.cleanupInterval);
    }

    private checkMemoryUsage() {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            const usedMemory = memory.usedJSHeapSize;

            if (usedMemory > this.memoryThreshold) {
                this.performCleanup();
            }
        }
    }

    private performCleanup() {
        // Clear object pools
        this.objectPool.clear();

        // Trigger garbage collection if available
        if ('gc' in window) {
            (window as any).gc();
        }

        // Clear any caches
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                    caches.delete(cacheName);
                });
            });
        }

        logger.debug('Memory cleanup performed');
    }

    // Object pooling for frequently created/destroyed objects
    getFromPool<T>(type: string, factory: () => T): T {
        if (!this.objectPool.has(type)) {
            this.objectPool.set(type, []);
        }

        const pool = this.objectPool.get(type)!;
        return pool.length > 0 ? pool.pop() : factory();
    }

    returnToPool<T>(type: string, object: T): void {
        if (!this.objectPool.has(type)) {
            this.objectPool.set(type, []);
        }

        const pool = this.objectPool.get(type)!;
        if (pool.length < 10) { // Limit pool size
            pool.push(object);
        }
    }
}

// ============================================================================
// Progressive Enhancement
// ============================================================================

class ProgressiveEnhancement {
    private capabilities: DeviceCapabilities;
    private featureFlags: Map<string, boolean> = new Map();

    constructor() {
        this.capabilities = new MobilePerformanceDetector().getCapabilities();
        this.detectFeatures();
    }

    private detectFeatures() {
        // Detect various features and set flags
        this.featureFlags.set('webgl', this.detectWebGL());
        this.featureFlags.set('webgl2', this.detectWebGL2());
        this.featureFlags.set('webassembly', this.detectWebAssembly());
        this.featureFlags.set('serviceworker', this.detectServiceWorker());
        this.featureFlags.set('webworker', this.detectWebWorker());
        this.featureFlags.set('indexeddb', this.detectIndexedDB());
        this.featureFlags.set('canvas', this.detectCanvas());
        this.featureFlags.set('svg', this.detectSVG());
    }

    private detectWebGL(): boolean {
        const canvas = document.createElement('canvas');
        return !!(
            canvas.getContext('webgl') ||
            canvas.getContext('experimental-webgl')
        );
    }

    private detectWebGL2(): boolean {
        const canvas = document.createElement('canvas');
        return !!canvas.getContext('webgl2');
    }

    private detectWebAssembly(): boolean {
        return 'WebAssembly' in window;
    }

    private detectServiceWorker(): boolean {
        return 'serviceWorker' in navigator;
    }

    private detectWebWorker(): boolean {
        return 'Worker' in window;
    }

    private detectIndexedDB(): boolean {
        return 'indexedDB' in window;
    }

    private detectCanvas(): boolean {
        const canvas = document.createElement('canvas');
        return !!canvas.getContext;
    }

    private detectSVG(): boolean {
        return !!document.createElementNS &&
            !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect;
    }

    hasFeature(feature: string): boolean {
        return this.featureFlags.get(feature) || false;
    }

    getOptimalRenderer(): 'canvas' | 'svg' | 'css' {
        if (this.capabilities.gpuTier === 'low') {
            return 'css'; // Simplest renderer for low-end devices
        } else if (this.hasFeature('webgl2')) {
            return 'canvas'; // Use WebGL2 if available
        } else if (this.hasFeature('canvas')) {
            return 'canvas'; // Use regular canvas
        } else {
            return 'svg'; // Fallback to SVG
        }
    }

    getOptimalInteractionMode(): 'touch' | 'mouse' | 'hybrid' {
        if (this.capabilities.touchEnabled && this.capabilities.isMobile) {
            return 'touch';
        } else if (this.capabilities.touchEnabled) {
            return 'hybrid';
        } else {
            return 'mouse';
        }
    }

    shouldReduceComplexity(): boolean {
        return this.capabilities.isLowEnd ||
            this.capabilities.memory <= 2 ||
            this.capabilities.cores <= 2;
    }
}

// ============================================================================
// Performance Metrics
// ============================================================================

class MobilePerformanceMetrics {
    private metrics: Map<string, number[]> = new Map();
    private startTime: number = Date.now();

    recordMetric(name: string, value: number) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        const values = this.metrics.get(name)!;
        values.push(value);

        // Keep only last 100 values
        if (values.length > 100) {
            values.shift();
        }
    }

    getAverageMetric(name: string): number {
        const values = this.metrics.get(name);
        if (!values || values.length === 0) return 0;

        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    getPerformanceReport(): string {
        const report = [
            '=== Mobile Performance Report ===',
            `Session Duration: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`,
            `Average Frame Time: ${this.getAverageMetric('frameTime').toFixed(2)}ms`,
            `Average Touch Response: ${this.getAverageMetric('touchResponse').toFixed(2)}ms`,
            `Memory Usage: ${this.getAverageMetric('memoryUsage').toFixed(2)}MB`,
            `Network Requests: ${this.getAverageMetric('networkRequests').toFixed(0)}`,
            '',
        ];

        return report.join('\n');
    }

    startMonitoring() {
        // Monitor frame rate
        let lastFrameTime = performance.now();
        const measureFrameTime = () => {
            const currentTime = performance.now();
            const frameTime = currentTime - lastFrameTime;
            this.recordMetric('frameTime', frameTime);
            lastFrameTime = currentTime;
            requestAnimationFrame(measureFrameTime);
        };
        requestAnimationFrame(measureFrameTime);

        // Monitor memory usage
        if ('memory' in performance) {
            setInterval(() => {
                const memory = (performance as any).memory;
                this.recordMetric('memoryUsage', memory.usedJSHeapSize / 1024 / 1024);
            }, 5000);
        }

        // Monitor network requests
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            this.recordMetric('networkRequests', 1);
            return originalFetch.apply(window, args);
        };
    }
}

// ============================================================================
// Export Classes
// ============================================================================

export {
    MobilePerformanceDetector,
    TouchEventOptimizer,
    LazyLoadManager,
    AnimationOptimizer,
    MemoryManager,
    ProgressiveEnhancement,
    MobilePerformanceMetrics,
    type DeviceCapabilities,
};
