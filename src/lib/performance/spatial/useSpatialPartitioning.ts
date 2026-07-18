import { useCallback, useMemo } from 'react';
import { SpatialPartitioner, ViewportCuller, ViewportState } from './index';
import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

export interface UseSpatialPartitioningOptions {
    cellSize?: number;
    margin?: number;
    enabled?: boolean;
}

export interface UseSpatialPartitioningResult {
    visibleDeviceIds: string[];
    visibleConnectionIds: string[];
    updateViewport: (viewport: ViewportState) => void;
    invalidateCache: () => void;
    getStats: () => Record<string, number> | null;
}

/**
 * useSpatialPartitioning: Optimized React hook for grid-based viewport culling.
 *
 * Performance Optimization:
 * By calculating visible nodes and connections synchronously inside useMemo during
 * render, we completely eliminate React state updates and subsequent double-rendering
 * passes when panning and zooming.
 *
 * Complies with strict react-hooks/refs rules by avoiding useRef for values read/written
 * during render, using plain memoized tracking objects instead.
 */
export function useSpatialPartitioning(
    devices: CanvasDevice[],
    connections: CanvasConnection[],
    viewport?: ViewportState | null,
    options: UseSpatialPartitioningOptions = {}
): UseSpatialPartitioningResult {
    // If options was passed as the 3rd argument (legacy usage)
    const activeOptions = (viewport && !('zoom' in viewport))
        ? (viewport as UseSpatialPartitioningOptions)
        : options;
    const activeViewport = (viewport && 'zoom' in viewport) ? viewport : null;

    const { cellSize = 256, margin = 100, enabled = true } = activeOptions;

    // Use memoized values instead of useRef to comply with rendering rules
    const partitioner = useMemo(() => {
        if (!enabled) return null;
        return new SpatialPartitioner(cellSize);
    }, [cellSize, enabled]);

    const culler = useMemo(() => {
        if (!enabled || !partitioner) return null;
        return new ViewportCuller(partitioner, margin);
    }, [partitioner, margin, enabled]);

    // Plain JavaScript tracking object instead of useRef to allow safe render-time updates
    const prevTracker = useMemo(() => ({
        devices: [] as CanvasDevice[],
        connections: [] as CanvasConnection[]
    }), [partitioner]); // reset tracker if partitioner instance changes

    // Perform differential updates to the spatial partitioner synchronously during render
    useMemo(() => {
        if (!enabled || !partitioner || !culler) return;

        const prevDevices = prevTracker.devices;
        const prevDeviceMap = new Map(prevDevices.map(d => [d.id, d]));
        const currentDeviceMap = new Map(devices.map(d => [d.id, d]));

        // Check for added, removed, or moved devices differentially
        const deviceChanged = prevDevices.length !== devices.length;
        if (!deviceChanged) {
            for (const d of devices) {
                const prev = prevDeviceMap.get(d.id);
                if (!prev || prev.x !== d.x || prev.y !== d.y) {
                    partitioner.assignNode({ id: d.id, x: d.x, y: d.y });
                }
            }
            for (const d of prevDevices) {
                if (!currentDeviceMap.has(d.id)) {
                    partitioner.removeNode(d.id);
                }
            }
        } else {
            // Full rebuild on size mismatches or initial load
            partitioner.clear();
            const nodes = devices.map(d => ({ id: d.id, x: d.x, y: d.y }));
            partitioner.assignNodes(nodes);

            const nodeMap = new Map(nodes.map(n => [n.id, n]));
            connections.forEach(conn => {
                partitioner.assignConnection(
                    { id: conn.id, sourceNodeId: conn.sourceDeviceId, targetNodeId: conn.targetDeviceId },
                    nodeMap
                );
            });
        }

        // Keep the culler updated with the latest lists
        culler.setNodes(devices.map(d => ({ id: d.id, x: d.x, y: d.y })));
        culler.setConnections(connections.map(c => ({
            id: c.id,
            sourceNodeId: c.sourceDeviceId,
            targetNodeId: c.targetDeviceId,
        })));

        // eslint-disable-next-line react-hooks/immutability
        prevTracker.devices = devices;
        // eslint-disable-next-line react-hooks/immutability
        prevTracker.connections = connections;
    }, [devices, connections, enabled, partitioner, culler, prevTracker]);

    // Calculate visible nodes and connections synchronously in useMemo (zero React state updates)
    const visibleResult = useMemo(() => {
        if (!enabled || !culler || !activeViewport) {
            return {
                visibleDeviceIds: devices.map(d => d.id),
                visibleConnectionIds: connections.map(c => c.id)
            };
        }
        const result = culler.cull(activeViewport);
        return {
            visibleDeviceIds: result.visibleNodeIds,
            visibleConnectionIds: result.visibleConnectionIds
        };
    }, [devices, connections, activeViewport, enabled, culler]);

    const updateViewport = useCallback((_viewport: ViewportState) => {
        // No-op. Viewport culling is now completely synchronous and state-free.
    }, []);

    const invalidateCache = useCallback(() => {
        if (culler) {
            culler.invalidateCache();
        }
    }, [culler]);

    const getStats = useCallback(() => {
        if (!culler) return null;
        return culler.getStats();
    }, [culler]);

    return {
        visibleDeviceIds: visibleResult.visibleDeviceIds,
        visibleConnectionIds: visibleResult.visibleConnectionIds,
        updateViewport,
        invalidateCache,
        getStats,
    };
}
