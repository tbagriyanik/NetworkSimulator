/**
 * Memory Cleanup Utilities for Low-Resource Desktop Builds
 * Prevents memory leaks and optimizes resource usage
 */

// Cleanup intervals and timeouts that might cause memory leaks
const activeTimers = new Set<ReturnType<typeof setTimeout>>();
const activeIntervals = new Set<ReturnType<typeof setInterval>>();
const activeEventListeners = new Map<EventTarget, Map<string, Set<EventListener>>>();

/**
 * Register a timer for automatic cleanup
 */
export function registerTimer(timer: ReturnType<typeof setTimeout>): void {
  activeTimers.add(timer);
}

/**
 * Register an interval for automatic cleanup
 */
export function registerInterval(interval: ReturnType<typeof setInterval>): void {
  activeIntervals.add(interval);
}

/**
 * Register an event listener for automatic cleanup
 */
export function registerEventListener(
  target: EventTarget,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions
): void {
  target.addEventListener(event, listener, options);
  
  if (!activeEventListeners.has(target)) {
    activeEventListeners.set(target, new Map());
  }
  
  const targetListeners = activeEventListeners.get(target)!;
  if (!targetListeners.has(event)) {
    targetListeners.set(event, new Set());
  }
  
  targetListeners.get(event)!.add(listener);
}

/**
 * Clear all registered timers
 */
export function clearAllTimers(): void {
  activeTimers.forEach(timer => {
    clearTimeout(timer);
    clearInterval(timer);
  });
  activeTimers.clear();
}

/**
 * Clear all registered intervals
 */
export function clearAllIntervals(): void {
  activeIntervals.forEach(interval => {
    clearInterval(interval);
  });
  activeIntervals.clear();
}

/**
 * Remove all registered event listeners
 */
export function removeAllEventListeners(): void {
  activeEventListeners.forEach((eventMap, target) => {
    eventMap.forEach((listeners, event) => {
      listeners.forEach(listener => {
        target.removeEventListener(event, listener);
      });
    });
  });
  activeEventListeners.clear();
}

/**
 * Cleanup all resources (timers, intervals, event listeners)
 * Call this when unmounting components or changing projects
 */
export function cleanupAllResources(): void {
  clearAllTimers();
  clearAllIntervals();
  removeAllEventListeners();
}

/**
 * Force garbage collection hint (works in some environments)
 */
export function forceGC(): void {
  if (process.env.NODE_ENV !== 'production') {
    const globalWithGc = globalThis as unknown as { gc?: () => void };
    if (typeof globalWithGc.gc === 'function') {
      globalWithGc.gc();
    }
  }
}

/**
 * Memory usage monitoring for development
 */
export function getMemoryUsage(): NodeJS.MemoryUsage | null {
  if (process.env.NODE_ENV !== 'production' && typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage();
  }
  return null;
}

/**
 * Log memory usage if available
 */
export function logMemoryUsage(context: string): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  const usage = getMemoryUsage();
  if (usage) {
    console.log(`[Memory ${context}]`, {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    });
  }
}

/**
 * Performance-optimized debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    registerTimer(timeout);
  };
}

/**
 * Performance-optimized throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}