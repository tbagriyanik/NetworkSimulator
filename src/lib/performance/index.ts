/**
 * Performance Optimization Library
 * Exports used performance monitoring and spatial partitioning modules
 */

// Monitoring
export {
    performanceMonitor,
    usePerformanceMonitoring,
    type PerformanceMetrics,
    type PerformanceThresholds,
} from './monitoring';

// Performance optimization modules
export * from './spatial';
