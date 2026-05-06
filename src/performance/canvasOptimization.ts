/**
 * Canvas Rendering Optimization
 * Optimizes canvas rendering for large networks with viewport culling, throttling, and lazy loading
 *
 * **Validates: Requirements 3.1, 3.2, 3.5**
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

interface Viewport {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
}

interface Device {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    icon?: HTMLImageElement;
    isLoaded: boolean;
}

interface Connection {
    id: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    type: string;
}

interface RenderStats {
    totalDevices: number;
    renderedDevices: number;
    culledDevices: number;
    totalConnections: number;
    renderedConnections: number;
    culledConnections: number;
    renderTime: number;
    frameRate: number;
}

interface PerformanceMetrics {
    averageRenderTime: number;
    averageFrameRate: number;
    memoryUsage: number;
    droppedFrames: number;
    totalFrames: number;
}

// ============================================================================
// Viewport Culling System
// ============================================================================

class ViewportCulling {
    private viewport: Viewport;
    private padding: number = 100; // Extra padding around viewport

    constructor(viewport: Viewport) {
        this.viewport = viewport;
    }

    updateViewport(viewport: Viewport) {
        this.viewport = viewport;
    }

    isDeviceInViewport(device: Device): boolean {
        const bounds = this.getExpandedViewport();
        
        return (
            device.x + device.width >= bounds.x &&
            device.x <= bounds.x + bounds.width &&
            device.y + device.height >= bounds.y &&
            device.y <= bounds.y + bounds.height
        );
    }

    isConnectionInViewport(connection: Connection): boolean {
        const bounds = this.getExpandedViewport();
        
        // Check if either endpoint is in viewport
        return (
            (connection.sourceX >= bounds.x && connection.sourceX <= bounds.x + bounds.width &&
             connection.sourceY >= bounds.y && connection.sourceY <= bounds.y + bounds.height) ||
            (connection.targetX >= bounds.x && connection.targetX <= bounds.x + bounds.width &&
             connection.targetY >= bounds.y && connection.targetY <= bounds.y + bounds.height)
        );
    }

    private getExpandedViewport(): Viewport {
        return {
            x: this.viewport.x - this.padding,
            y: this.viewport.y - this.padding,
            width: this.viewport.width + (this.padding * 2),
            height: this.viewport.height + (this.padding * 2),
            zoom: this.viewport.zoom,
        };
    }

    cullDevices(devices: Device[]): Device[] {
        return devices.filter(device => this.isDeviceInViewport(device));
    }

    cullConnections(connections: Connection[]): Connection[] {
        return connections.filter(connection => this.isConnectionInViewport(connection));
    }
}

// ============================================================================
// Throttled Drag Operations
// ============================================================================

class ThrottledDragOperations {
    private isDragging: boolean = false;
    private dragTarget: Device | null = null;
    private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
    private lastFrameTime: number = 0;
    private targetFPS: number = 60;
    private frameInterval: number = 1000 / this.targetFPS;
    private animationId: number | null = null;

    startDrag(device: Device, mouseX: number, mouseY: number) {
        this.isDragging = true;
        this.dragTarget = device;
        this.dragOffset = {
            x: mouseX - device.x,
            y: mouseY - device.y,
        };
        this.startAnimationLoop();
    }

    updateDrag(mouseX: number, mouseY: number) {
        if (!this.isDragging || !this.dragTarget) return;

        this.dragTarget.x = mouseX - this.dragOffset.x;
        this.dragTarget.y = mouseY - this.dragOffset.y;
    }

    endDrag() {
        this.isDragging = false;
        this.dragTarget = null;
        this.stopAnimationLoop();
    }

    private startAnimationLoop() {
        const animate = (currentTime: number) => {
            if (!this.isDragging) return;

            const deltaTime = currentTime - this.lastFrameTime;

            if (deltaTime >= this.frameInterval) {
                this.render();
                this.lastFrameTime = currentTime;
            }

            this.animationId = requestAnimationFrame(animate);
        };

        this.animationId = requestAnimationFrame(animate);
    }

    private stopAnimationLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    private render() {
        // This would be called to render the current state
        // In a real implementation, this would trigger canvas redraw
    }

    isCurrentlyDragging(): boolean {
        return this.isDragging;
    }

    getDragTarget(): Device | null {
        return this.dragTarget;
    }
}

// ============================================================================
// Lazy Loading System for Device Icons
// ============================================================================

class LazyIconLoader {
    private iconCache: Map<string, HTMLImageElement> = new Map();
    private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
    private loadedIcons: Set<string> = new Set();
    private defaultIcon: HTMLImageElement;

    constructor() {
        this.defaultIcon = this.createDefaultIcon();
    }

    private createDefaultIcon(): HTMLImageElement {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;

        // Draw a simple default icon
        ctx.fillStyle = '#666';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText('?', 12, 20);

        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }

    async loadIcon(deviceType: string): Promise<HTMLImageElement> {
        // Return cached icon if available
        if (this.iconCache.has(deviceType)) {
            return this.iconCache.get(deviceType)!;
        }

        // Return loading promise if already loading
        if (this.loadingPromises.has(deviceType)) {
            return this.loadingPromises.get(deviceType)!;
        }

        // Create loading promise
        const loadingPromise = this.createIconForDeviceType(deviceType);
        this.loadingPromises.set(deviceType, loadingPromise);

        try {
            const icon = await loadingPromise;
            this.iconCache.set(deviceType, icon);
            this.loadedIcons.add(deviceType);
            return icon;
        } catch (error) {
            console.warn(`Failed to load icon for ${deviceType}:`, error);
            return this.defaultIcon;
        } finally {
            this.loadingPromises.delete(deviceType);
        }
    }

    private async createIconForDeviceType(deviceType: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const iconPath = `/icons/devices/${deviceType}.png`;
            const img = new Image();

            img.onload = () => resolve(img);
            img.onerror = () => {
                // Fallback to generated icon
                const generatedIcon = this.generateIcon(deviceType);
                resolve(generatedIcon);
            };

            img.src = iconPath;

            // Timeout after 2 seconds
            setTimeout(() => {
                if (!img.complete) {
                    const generatedIcon = this.generateIcon(deviceType);
                    resolve(generatedIcon);
                }
            }, 2000);
        });
    }

    private generateIcon(deviceType: string): HTMLImageElement {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;

        // Generate different colors for different device types
        const colors: Record<string, string> = {
            pc: '#007ACC',
            router: '#FF6B35',
            switch: '#4CAF50',
            server: '#9C27B0',
            firewall: '#F44336',
        };

        ctx.fillStyle = colors[deviceType] || '#666';
        ctx.fillRect(0, 0, 32, 32);

        // Add device type initial
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(deviceType[0]?.toUpperCase() || '?', 16, 16);

        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }

    getIcon(deviceType: string): HTMLImageElement {
        return this.iconCache.get(deviceType) || this.defaultIcon;
    }

    isIconLoaded(deviceType: string): boolean {
        return this.loadedIcons.has(deviceType);
    }

    preloadIcons(deviceTypes: string[]): Promise<HTMLImageElement[]> {
        return Promise.all(deviceTypes.map(type => this.loadIcon(type)));
    }

    getCacheStats(): { loaded: number; cached: number; loading: number } {
        return {
            loaded: this.loadedIcons.size,
            cached: this.iconCache.size,
            loading: this.loadingPromises.size,
        };
    }
}

// ============================================================================
// Efficient Canvas Renderer
// ============================================================================

class EfficientCanvasRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private viewportCulling: ViewportCulling;
    private iconLoader: LazyIconLoader;
    private renderStats: RenderStats;
    private performanceMetrics: PerformanceMetrics;
    private frameCount: number = 0;
    private lastFrameTime: number = 0;
    private renderQueue: Array<() => void> = [];

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.viewportCulling = new ViewportCulling({
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
            zoom: 1,
        });
        this.iconLoader = new LazyIconLoader();
        this.renderStats = this.createEmptyRenderStats();
        this.performanceMetrics = this.createEmptyPerformanceMetrics();
    }

    private createEmptyRenderStats(): RenderStats {
        return {
            totalDevices: 0,
            renderedDevices: 0,
            culledDevices: 0,
            totalConnections: 0,
            renderedConnections: 0,
            culledConnections: 0,
            renderTime: 0,
            frameRate: 0,
        };
    }

    private createEmptyPerformanceMetrics(): PerformanceMetrics {
        return {
            averageRenderTime: 0,
            averageFrameRate: 0,
            memoryUsage: 0,
            droppedFrames: 0,
            totalFrames: 0,
        };
    }

    updateViewport(viewport: Viewport) {
        this.viewportCulling.updateViewport(viewport);
    }

    render(devices: Device[], connections: Connection[]): RenderStats {
        const startTime = performance.now();

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply viewport transformations
        this.ctx.save();
        this.ctx.scale(this.viewportCulling['viewport'].zoom, this.viewportCulling['viewport'].zoom);
        this.ctx.translate(-this.viewportCulling['viewport'].x, -this.viewportCulling['viewport'].y);

        // Cull devices and connections
        const visibleDevices = this.viewportCulling.cullDevices(devices);
        const visibleConnections = this.viewportCulling.cullConnections(connections);

        // Render connections first (behind devices)
        this.renderConnections(visibleConnections);

        // Render devices
        this.renderDevices(visibleDevices);

        // Restore context
        this.ctx.restore();

        // Calculate render stats
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        this.renderStats = {
            totalDevices: devices.length,
            renderedDevices: visibleDevices.length,
            culledDevices: devices.length - visibleDevices.length,
            totalConnections: connections.length,
            renderedConnections: visibleConnections.length,
            culledConnections: connections.length - visibleConnections.length,
            renderTime,
            frameRate: this.calculateFrameRate(),
        };

        this.updatePerformanceMetrics(renderTime);

        return this.renderStats;
    }

    private renderDevices(devices: Device[]) {
        devices.forEach(device => {
            this.ctx.save();

            // Draw device background
            this.ctx.fillStyle = '#fff';
            this.ctx.strokeStyle = '#007ACC';
            this.ctx.lineWidth = 2;
            this.ctx.fillRect(device.x, device.y, device.width, device.height);
            this.ctx.strokeRect(device.x, device.y, device.width, device.height);

            // Draw device icon if loaded
            const icon = this.iconLoader.getIcon(device.type);
            if (icon.complete) {
                this.ctx.drawImage(icon, device.x + 4, device.y + 4, 24, 24);
            } else {
                // Draw placeholder
                this.ctx.fillStyle = '#666';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('?', device.x + device.width / 2, device.y + device.height / 2);
            }

            // Draw device label
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(device.type, device.x + device.width / 2, device.y + device.height - 4);

            this.ctx.restore();
        });
    }

    private renderConnections(connections: Connection[]) {
        connections.forEach(connection => {
            this.ctx.save();

            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);

            this.ctx.beginPath();
            this.ctx.moveTo(connection.sourceX, connection.sourceY);
            this.ctx.lineTo(connection.targetX, connection.targetY);
            this.ctx.stroke();

            this.ctx.restore();
        });
    }

    private calculateFrameRate(): number {
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;

        if (delta > 0) {
            return 1000 / delta;
        }
        return 0;
    }

    private updatePerformanceMetrics(renderTime: number) {
        this.frameCount++;
        this.performanceMetrics.totalFrames++;

        // Update running averages
        const alpha = 0.1; // Smoothing factor
        this.performanceMetrics.averageRenderTime = 
            this.performanceMetrics.averageRenderTime * (1 - alpha) + renderTime * alpha;
        this.performanceMetrics.averageFrameRate = 
            this.performanceMetrics.averageFrameRate * (1 - alpha) + this.renderStats.frameRate * alpha;

        // Track dropped frames (below 30 FPS)
        if (this.renderStats.frameRate < 30) {
            this.performanceMetrics.droppedFrames++;
        }

        // Update memory usage (if available)
        if ('memory' in performance) {
            this.performanceMetrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
        }
    }

    getRenderStats(): RenderStats {
        return { ...this.renderStats };
    }

    getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    preloadDeviceIcons(deviceTypes: string[]): Promise<void> {
        return this.iconLoader.preloadIcons(deviceTypes).then(() => {
            // Icons preloaded
        });
    }

    getIconLoaderStats() {
        return this.iconLoader.getCacheStats();
    }
}

// ============================================================================
// Performance Monitoring System
// ============================================================================

class PerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();
    private alerts: Array<{ type: string; message: string; timestamp: Date }> = [];
    private thresholds: Record<string, number> = {
        renderTime: 16.67, // 60 FPS target
        memoryUsage: 100 * 1024 * 1024, // 100MB
        frameRate: 30, // Minimum acceptable FPS
    };

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

        this.checkThresholds(name, value);
    }

    private checkThresholds(metric: string, value: number) {
        const threshold = this.thresholds[metric];
        if (threshold && value > threshold) {
            this.addAlert(metric, this.createAlertMessage(metric, value, threshold));
        }
    }

    private createAlertMessage(metric: string, value: number, threshold: number): string {
        const messages: Record<string, string> = {
            renderTime: `Render time ${value.toFixed(2)}ms exceeds threshold ${threshold.toFixed(2)}ms`,
            memoryUsage: `Memory usage ${(value / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(threshold / 1024 / 1024).toFixed(2)}MB`,
            frameRate: `Frame rate ${value.toFixed(2)}FPS below threshold ${threshold}FPS`,
        };

        return messages[metric] || `${metric} value ${value} exceeds threshold ${threshold}`;
    }

    private addAlert(type: string, message: string) {
        this.alerts.push({
            type,
            message,
            timestamp: new Date(),
        });

        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts.shift();
        }
    }

    getAverageMetric(name: string): number {
        const values = this.metrics.get(name);
        if (!values || values.length === 0) return 0;

        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    getMetricHistory(name: string): number[] {
        return this.metrics.get(name) || [];
    }

    getAlerts(): Array<{ type: string; message: string; timestamp: Date }> {
        return [...this.alerts];
    }

    clearAlerts() {
        this.alerts = [];
    }

    setThreshold(metric: string, threshold: number) {
        this.thresholds[metric] = threshold;
    }

    getPerformanceReport(): string {
        const report = [
            '=== Performance Report ===',
            `Average Render Time: ${this.getAverageMetric('renderTime').toFixed(2)}ms`,
            `Average Frame Rate: ${this.getAverageMetric('frameRate').toFixed(2)}FPS`,
            `Memory Usage: ${(this.getAverageMetric('memoryUsage') / 1024 / 1024).toFixed(2)}MB`,
            `Active Alerts: ${this.alerts.length}`,
            '',
        ];

        if (this.alerts.length > 0) {
            report.push('Recent Alerts:');
            this.alerts.slice(-5).forEach(alert => {
                report.push(`- ${alert.message}`);
            });
        }

        return report.join('\n');
    }
}

// ============================================================================
// Render Cycle Optimizer
// ============================================================================

class RenderCycleOptimizer {
    private renderQueue: Array<() => void> = [];
    private isRendering: boolean = false;
    private renderCallbacks: Array<(stats: RenderStats) => void> = [];
    private targetFPS: number = 60;
    private lastRenderTime: number = 0;
    private frameSkipThreshold: number = 2; // Skip frames if behind schedule

    constructor(private renderer: EfficientCanvasRenderer, private monitor: PerformanceMonitor) {}

    scheduleRender(renderFunction: () => void) {
        this.renderQueue.push(renderFunction);
        this.processRenderQueue();
    }

    private async processRenderQueue() {
        if (this.isRendering || this.renderQueue.length === 0) return;

        this.isRendering = true;

        try {
            while (this.renderQueue.length > 0) {
                const renderFunction = this.renderQueue.shift()!;
                
                // Check if we should skip this frame
                const now = performance.now();
                const timeSinceLastRender = now - this.lastRenderTime;
                const targetFrameTime = 1000 / this.targetFPS;

                if (timeSinceLastRender < targetFrameTime) {
                    // Wait until it's time to render
                    await new Promise(resolve => setTimeout(resolve, targetFrameTime - timeSinceLastRender));
                }

                // Execute render
                const startTime = performance.now();
                renderFunction();
                const renderTime = performance.now() - startTime;

                this.lastRenderTime = performance.now();
                this.monitor.recordMetric('renderTime', renderTime);

                // Notify callbacks
                const stats = this.renderer.getRenderStats();
                this.renderCallbacks.forEach(callback => callback(stats));
            }
        } finally {
            this.isRendering = false;
        }
    }

    addRenderCallback(callback: (stats: RenderStats) => void) {
        this.renderCallbacks.push(callback);
    }

    removeRenderCallback(callback: (stats: RenderStats) => void) {
        const index = this.renderCallbacks.indexOf(callback);
        if (index > -1) {
            this.renderCallbacks.splice(index, 1);
        }
    }

    setTargetFPS(fps: number) {
        this.targetFPS = fps;
    }

    getQueueSize(): number {
        return this.renderQueue.length;
    }

    isCurrentlyRendering(): boolean {
        return this.isRendering;
    }
}

// ============================================================================
// Export Classes
// ============================================================================

export {
    ViewportCulling,
    ThrottledDragOperations,
    LazyIconLoader,
    EfficientCanvasRenderer,
    PerformanceMonitor,
    RenderCycleOptimizer,
    type Viewport,
    type Device,
    type Connection,
    type RenderStats,
    type PerformanceMetrics,
};
