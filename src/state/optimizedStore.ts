/**
 * State Management Optimization
 * Optimized state management with Zustand, granular selectors, memoization, and persistence
 *
 * **Validates: Requirements 8.4, 8.5**
 */

import { create } from 'zustand';
import { subscribeWithSelector, devtools, persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { useMemo, useCallback, useRef, useEffect } from 'react';
// Simple debounce implementation
const debounce = <T extends (...args: any[]) => void>(
    func: T,
    delay: number
): T => {
    let timeoutId: NodeJS.Timeout;
    return ((...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
};

// ============================================================================
// Types and Interfaces
// ============================================================================

interface Device {
    id: string;
    type: 'pc' | 'router' | 'switch' | 'server' | 'firewall';
    name: string;
    position: { x: number; y: number };
    status: 'online' | 'offline';
    network: {
        ipv4: string;
        subnet: string;
        gateway: string;
        dns: string[];
        ipv6: string;
        dhcp: {
            enabled: boolean;
            server: boolean;
            startIP: string;
            endIP: string;
            leaseTime: number;
        };
    };
    isSelected: boolean;
    isHighlighted: boolean;
}

interface Connection {
    id: string;
    sourceDeviceId: string;
    sourcePortId: string;
    targetDeviceId: string;
    targetPortId: string;
    type: 'ethernet' | 'wireless' | 'serial';
    status: 'active' | 'inactive';
    isSelected: boolean;
}

interface NetworkState {
    devices: Record<string, Device>;
    connections: Record<string, Connection>;
    selectedDeviceIds: Set<string>;
    selectedConnectionIds: Set<string>;
    viewport: {
        x: number;
        y: number;
        zoom: number;
        width: number;
        height: number;
    };
    interactionMode: 'select' | 'connect' | 'delete' | 'move';
    clipboard: {
        devices: Device[];
        connections: Connection[];
    };
    history: {
        past: NetworkState[];
        present: NetworkState;
        future: NetworkState[];
    };
    performance: {
        renderTime: number;
        deviceCount: number;
        connectionCount: number;
        lastUpdate: Date;
    };
}

interface NetworkActions {
    // Device Actions
    addDevice: (device: Omit<Device, 'id'>) => string;
    updateDevice: (id: string, updates: Partial<Device>) => void;
    removeDevice: (id: string) => void;
    selectDevice: (id: string, multi?: boolean) => void;
    deselectDevice: (id: string) => void;
    clearDeviceSelection: () => void;
    moveDevice: (id: string, position: { x: number; y: number }) => void;

    // Connection Actions
    addConnection: (connection: Omit<Connection, 'id'>) => string;
    updateConnection: (id: string, updates: Partial<Connection>) => void;
    removeConnection: (id: string) => void;
    selectConnection: (id: string, multi?: boolean) => void;
    deselectConnection: (id: string) => void;
    clearConnectionSelection: () => void;

    // Viewport Actions
    setViewport: (viewport: Partial<NetworkState['viewport']>) => void;
    panViewport: (dx: number, dy: number) => void;
    zoomViewport: (factor: number, center?: { x: number; y: number }) => void;

    // Interaction Actions
    setInteractionMode: (mode: NetworkState['interactionMode']) => void;

    // Clipboard Actions
    copySelection: () => void;
    pasteClipboard: () => void;
    clearClipboard: () => void;

    // History Actions
    undo: () => void;
    redo: () => void;
    saveToHistory: () => void;

    // Performance Actions
    updatePerformanceMetrics: (metrics: Partial<NetworkState['performance']>) => void;
}

type NetworkStore = NetworkState & NetworkActions;

// ============================================================================
// Memoized Selectors
// ============================================================================

const createMemoizedSelector = <T, R>(
    selector: (state: T) => R,
    equalityFn?: (a: R, b: R) => boolean
) => {
    let lastState: T;
    let lastResult: R;

    return (state: T): R => {
        if (state !== lastState) {
            const newResult = selector(state);
            if (!equalityFn || !equalityFn(lastResult, newResult)) {
                lastResult = newResult;
            }
            lastState = state;
        }
        return lastResult;
    };
};

// Device Selectors
const selectDevices = (state: NetworkState) => state.devices;
const selectDeviceIds = (state: NetworkState) => Object.keys(state.devices);
const selectDeviceCount = (state: NetworkState) => Object.keys(state.devices).length;
const selectSelectedDevices = (state: NetworkState) =>
    Object.fromEntries(
        Object.entries(state.devices).filter(([id]) => state.selectedDeviceIds.has(id))
    );
const selectDeviceById = (id: string) => (state: NetworkState) => state.devices[id];
const selectDevicesByType = (type: Device['type']) => (state: NetworkState) =>
    Object.values(state.devices).filter(device => device.type === type);

// Connection Selectors
const selectConnections = (state: NetworkState) => state.connections;
const selectConnectionIds = (state: NetworkState) => Object.keys(state.connections);
const selectConnectionCount = (state: NetworkState) => Object.keys(state.connections).length;
const selectSelectedConnections = (state: NetworkState) =>
    Object.fromEntries(
        Object.entries(state.connections).filter(([id]) => state.selectedConnectionIds.has(id))
    );
const selectConnectionById = (id: string) => (state: NetworkState) => state.connections[id];
const selectConnectionsByDevice = (deviceId: string) => (state: NetworkState) =>
    Object.values(state.connections).filter(
        conn => conn.sourceDeviceId === deviceId || conn.targetDeviceId === deviceId
    );

// Viewport Selectors
const selectViewport = (state: NetworkState) => state.viewport;
const selectZoomLevel = (state: NetworkState) => state.viewport.zoom;
const selectViewportBounds = (state: NetworkState) => ({
    x: state.viewport.x,
    y: state.viewport.y,
    width: state.viewport.width,
    height: state.viewport.height,
});

// Computed Selectors
const selectNetworkStatistics = createMemoizedSelector((state: NetworkState) => ({
    deviceCount: Object.keys(state.devices).length,
    connectionCount: Object.keys(state.connections).length,
    selectedDeviceCount: state.selectedDeviceIds.size,
    selectedConnectionCount: state.selectedConnectionIds.size,
    onlineDeviceCount: Object.values(state.devices).filter(d => d.status === 'online').length,
}));

const selectDeviceClusters = createMemoizedSelector((state: NetworkState) => {
    const devices = Object.values(state.devices);
    const clusters: Device[][] = [];
    const visited = new Set<string>();

    const findCluster = (device: Device, cluster: Device[]) => {
        if (visited.has(device.id)) return;
        visited.add(device.id);
        cluster.push(device);

        // Find connected devices
        Object.values(state.connections).forEach(conn => {
            if (conn.sourceDeviceId === device.id) {
                const targetDevice = state.devices[conn.targetDeviceId];
                if (targetDevice) findCluster(targetDevice, cluster);
            } else if (conn.targetDeviceId === device.id) {
                const sourceDevice = state.devices[conn.sourceDeviceId];
                if (sourceDevice) findCluster(sourceDevice, cluster);
            }
        });
    };

    devices.forEach(device => {
        if (!visited.has(device.id)) {
            const cluster: Device[] = [];
            findCluster(device, cluster);
            clusters.push(cluster);
        }
    });

    return clusters;
});

// ============================================================================
// Debounced Actions
// ============================================================================

const createDebouncedAction = <T extends (...args: any[]) => void>(
    action: T,
    delay: number
): T => {
    return debounce(action, delay) as T;
};

// ============================================================================
// Optimized Store Implementation
// ============================================================================

const createOptimizedNetworkStore = () => {
    const initialState: NetworkState = {
        devices: {},
        connections: {},
        selectedDeviceIds: new Set(),
        selectedConnectionIds: new Set(),
        viewport: {
            x: 0,
            y: 0,
            zoom: 1,
            width: 800,
            height: 600,
        },
        interactionMode: 'select',
        clipboard: {
            devices: [],
            connections: [],
        },
        history: {
            past: [],
            present: {} as NetworkState,
            future: [],
        },
        performance: {
            renderTime: 0,
            deviceCount: 0,
            connectionCount: 0,
            lastUpdate: new Date(),
        },
    };

    return create<NetworkStore>()(
        devtools(
            subscribeWithSelector(
                persist(
                    (set, get) => ({
                        ...initialState,

                        // Device Actions
                        addDevice: (deviceData) => {
                            const id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            const device: Device = { ...deviceData, id, isSelected: false, isHighlighted: false };

                            set((state) => ({
                                devices: { ...state.devices, [id]: device },
                                performance: {
                                    ...state.performance,
                                    deviceCount: Object.keys(state.devices).length + 1,
                                    lastUpdate: new Date(),
                                },
                            }));

                            get().saveToHistory();
                            return id;
                        },

                        updateDevice: (id, updates) => {
                            set((state) => {
                                const device = state.devices[id];
                                if (!device) return state;

                                return {
                                    devices: {
                                        ...state.devices,
                                        [id]: { ...device, ...updates },
                                    },
                                    performance: {
                                        ...state.performance,
                                        lastUpdate: new Date(),
                                    },
                                };
                            });
                            get().saveToHistory();
                        },

                        removeDevice: (id) => {
                            set((state) => {
                                const { [id]: removed, ...remainingDevices } = state.devices;
                                const relatedConnections = Object.values(state.connections).filter(
                                    conn => conn.sourceDeviceId === id || conn.targetDeviceId === id
                                );

                                const remainingConnections = { ...state.connections };
                                relatedConnections.forEach(conn => delete remainingConnections[conn.id]);

                                return {
                                    devices: remainingDevices,
                                    connections: remainingConnections,
                                    selectedDeviceIds: new Set([...state.selectedDeviceIds].filter(deviceId => deviceId !== id)),
                                    performance: {
                                        ...state.performance,
                                        deviceCount: Object.keys(remainingDevices).length,
                                        connectionCount: Object.keys(remainingConnections).length,
                                        lastUpdate: new Date(),
                                    },
                                };
                            });
                            get().saveToHistory();
                        },

                        selectDevice: (id, multi = false) => {
                            set((state) => ({
                                selectedDeviceIds: multi
                                    ? new Set([...state.selectedDeviceIds, id])
                                    : new Set([id]),
                            }));
                        },

                        deselectDevice: (id) => {
                            set((state) => {
                                const newSelection = new Set(state.selectedDeviceIds);
                                newSelection.delete(id);
                                return { selectedDeviceIds: newSelection };
                            });
                        },

                        clearDeviceSelection: () => {
                            set({ selectedDeviceIds: new Set() });
                        },

                        moveDevice: (id, position) => {
                            set((state) => {
                                const device = state.devices[id];
                                if (!device) return state;

                                return {
                                    devices: {
                                        ...state.devices,
                                        [id]: { ...device, position },
                                    },
                                    performance: {
                                        ...state.performance,
                                        lastUpdate: new Date(),
                                    },
                                };
                            });
                        },

                        // Connection Actions
                        addConnection: (connectionData) => {
                            const id = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            const connection: Connection = { ...connectionData, id, isSelected: false };

                            set((state) => ({
                                connections: { ...state.connections, [id]: connection },
                                performance: {
                                    ...state.performance,
                                    connectionCount: Object.keys(state.connections).length + 1,
                                    lastUpdate: new Date(),
                                },
                            }));

                            get().saveToHistory();
                            return id;
                        },

                        updateConnection: (id, updates) => {
                            set((state) => {
                                const connection = state.connections[id];
                                if (!connection) return state;

                                return {
                                    connections: {
                                        ...state.connections,
                                        [id]: { ...connection, ...updates },
                                    },
                                    performance: {
                                        ...state.performance,
                                        lastUpdate: new Date(),
                                    },
                                };
                            });
                            get().saveToHistory();
                        },

                        removeConnection: (id) => {
                            set((state) => {
                                const { [id]: removed, ...remainingConnections } = state.connections;
                                return {
                                    connections: remainingConnections,
                                    selectedConnectionIds: new Set([...state.selectedConnectionIds].filter(connId => connId !== id)),
                                    performance: {
                                        ...state.performance,
                                        connectionCount: Object.keys(remainingConnections).length,
                                        lastUpdate: new Date(),
                                    },
                                };
                            });
                            get().saveToHistory();
                        },

                        selectConnection: (id, multi = false) => {
                            set((state) => ({
                                selectedConnectionIds: multi
                                    ? new Set([...state.selectedConnectionIds, id])
                                    : new Set([id]),
                            }));
                        },

                        deselectConnection: (id) => {
                            set((state) => {
                                const newSelection = new Set(state.selectedConnectionIds);
                                newSelection.delete(id);
                                return { selectedConnectionIds: newSelection };
                            });
                        },

                        clearConnectionSelection: () => {
                            set({ selectedConnectionIds: new Set() });
                        },

                        // Viewport Actions
                        setViewport: (viewportUpdates) => {
                            set((state) => ({
                                viewport: { ...state.viewport, ...viewportUpdates },
                            }));
                        },

                        panViewport: (dx, dy) => {
                            set((state) => ({
                                viewport: {
                                    ...state.viewport,
                                    x: state.viewport.x + dx,
                                    y: state.viewport.y + dy,
                                },
                            }));
                        },

                        zoomViewport: (factor, center) => {
                            set((state) => {
                                const newZoom = Math.max(0.1, Math.min(5, state.viewport.zoom * factor));
                                const zoomRatio = newZoom / state.viewport.zoom;

                                let newX = state.viewport.x;
                                let newY = state.viewport.y;

                                if (center) {
                                    newX = center.x - (center.x - state.viewport.x) * zoomRatio;
                                    newY = center.y - (center.y - state.viewport.y) * zoomRatio;
                                }

                                return {
                                    viewport: {
                                        ...state.viewport,
                                        x: newX,
                                        y: newY,
                                        zoom: newZoom,
                                    },
                                };
                            });
                        },

                        // Interaction Actions
                        setInteractionMode: (mode) => {
                            set({ interactionMode: mode });
                        },

                        // Clipboard Actions
                        copySelection: () => {
                            const state = get();
                            const selectedDevices = Object.values(state.devices).filter(
                                device => state.selectedDeviceIds.has(device.id)
                            );
                            const selectedConnections = Object.values(state.connections).filter(
                                connection => state.selectedConnectionIds.has(connection.id)
                            );

                            set({
                                clipboard: {
                                    devices: selectedDevices,
                                    connections: selectedConnections,
                                },
                            });
                        },

                        pasteClipboard: () => {
                            const state = get();
                            const offset = { x: 50, y: 50 };

                            // Create new devices from clipboard
                            const newDeviceIds: string[] = [];
                            state.clipboard.devices.forEach(device => {
                                const newId = state.addDevice({
                                    ...device,
                                    position: {
                                        x: device.position.x + offset.x,
                                        y: device.position.y + offset.y,
                                    },
                                });
                                newDeviceIds.push(newId);
                            });

                            // Create new connections from clipboard
                            const deviceIdMap: Record<string, string> = {};
                            state.clipboard.devices.forEach((device, index) => {
                                deviceIdMap[device.id] = newDeviceIds[index];
                            });

                            state.clipboard.connections.forEach(connection => {
                                const newSourceId = deviceIdMap[connection.sourceDeviceId];
                                const newTargetId = deviceIdMap[connection.targetDeviceId];
                                if (newSourceId && newTargetId) {
                                    state.addConnection({
                                        ...connection,
                                        sourceDeviceId: newSourceId,
                                        targetDeviceId: newTargetId,
                                    });
                                }
                            });
                        },

                        clearClipboard: () => {
                            set({ clipboard: { devices: [], connections: [] } });
                        },

                        // History Actions
                        saveToHistory: () => {
                            const state = get();
                            const currentState = {
                                ...state,
                                history: { past: [], present: state, future: [] }, // Don't save history in history
                            };

                            set((prevState) => ({
                                history: {
                                    past: [...prevState.history.past.slice(-49), prevState.history.present], // Keep last 50 states
                                    present: currentState,
                                    future: [],
                                },
                            }));
                        },

                        undo: () => {
                            const state = get();
                            if (state.history.past.length === 0) return;

                            const previous = state.history.past[state.history.past.length - 1];
                            const newPast = state.history.past.slice(0, -1);

                            set({
                                ...previous,
                                history: {
                                    past: newPast,
                                    present: previous,
                                    future: [state.history.present, ...state.history.future],
                                },
                            });
                        },

                        redo: () => {
                            const state = get();
                            if (state.history.future.length === 0) return;

                            const next = state.history.future[0];
                            const newFuture = state.history.future.slice(1);

                            set({
                                ...next,
                                history: {
                                    past: [...state.history.past, state.history.present],
                                    present: next,
                                    future: newFuture,
                                },
                            });
                        },

                        // Performance Actions
                        updatePerformanceMetrics: (metrics) => {
                            set((state) => ({
                                performance: {
                                    ...state.performance,
                                    ...metrics,
                                    lastUpdate: new Date(),
                                },
                            }));
                        },
                    }),
                    {
                        name: 'network-store',
                        partialize: (state) => ({
                            devices: state.devices,
                            connections: state.connections,
                            viewport: state.viewport,
                        }),
                    }
                )
            ),
            { name: 'network-store' }
        )
    );
};

// ============================================================================
// Store Instance
// ============================================================================

export const useNetworkStore = createOptimizedNetworkStore() as any;

// ============================================================================
// Optimized Hooks
// ============================================================================

// Device Hooks
export const useDevices = () => useNetworkStore(selectDevices);
export const useDeviceCount = () => useNetworkStore(selectDeviceCount);
export const useSelectedDevices = () => useNetworkStore(selectSelectedDevices);
export const useDeviceById = (id: string) => useNetworkStore(selectDeviceById(id));
export const useDevicesByType = (type: Device['type']) => useNetworkStore(selectDevicesByType(type));

// Connection Hooks
export const useConnections = () => useNetworkStore(selectConnections);
export const useConnectionCount = () => useNetworkStore(selectConnectionCount);
export const useSelectedConnections = () => useNetworkStore(selectSelectedConnections);
export const useConnectionById = (id: string) => useNetworkStore(selectConnectionById(id));
export const useConnectionsByDevice = (deviceId: string) => useNetworkStore(selectConnectionsByDevice(deviceId));

// Viewport Hooks
export const useViewport = () => useNetworkStore(selectViewport);
export const useZoomLevel = () => useNetworkStore(selectZoomLevel);
export const useViewportBounds = () => useNetworkStore(selectViewportBounds);

// Computed Hooks
export const useNetworkStatistics = () => useNetworkStore(selectNetworkStatistics);
export const useDeviceClusters = () => useNetworkStore(selectDeviceClusters);

// Action Hooks with Shallow Comparison
export const useNetworkActions = () => {
    const store = useNetworkStore();
    return useMemo(() => ({
        addDevice: store.addDevice,
        updateDevice: store.updateDevice,
        removeDevice: store.removeDevice,
        selectDevice: store.selectDevice,
        deselectDevice: store.deselectDevice,
        clearDeviceSelection: store.clearDeviceSelection,
        moveDevice: store.moveDevice,
        addConnection: store.addConnection,
        updateConnection: store.updateConnection,
        removeConnection: store.removeConnection,
        selectConnection: store.selectConnection,
        deselectConnection: store.deselectConnection,
        clearConnectionSelection: store.clearConnectionSelection,
        setViewport: store.setViewport,
        panViewport: store.panViewport,
        zoomViewport: store.zoomViewport,
        setInteractionMode: store.setInteractionMode,
        copySelection: store.copySelection,
        pasteClipboard: store.pasteClipboard,
        clearClipboard: store.clearClipboard,
        undo: store.undo,
        redo: store.redo,
        saveToHistory: store.saveToHistory,
        updatePerformanceMetrics: store.updatePerformanceMetrics,
    }), [store]);
};

// ============================================================================
// Debounced Action Hooks
// ============================================================================

export const useDebouncedViewportUpdate = (delay: number = 16) => {
    const actions = useNetworkActions();

    return useMemo(() => ({
        panViewport: createDebouncedAction(actions.panViewport, delay),
        zoomViewport: createDebouncedAction(actions.zoomViewport, delay),
        setViewport: createDebouncedAction(actions.setViewport, delay),
    }), [actions, delay]);
};

export const useDebouncedDeviceUpdate = (delay: number = 100) => {
    const actions = useNetworkActions();

    return useMemo(() => ({
        updateDevice: createDebouncedAction(actions.updateDevice, delay),
        moveDevice: createDebouncedAction(actions.moveDevice, delay),
    }), [actions, delay]);
};

// ============================================================================
// State Debugging Tools
// ============================================================================

export const useStateDebugger = () => {
    const store = useNetworkStore();
    const debugInfo = useRef({
        renderCount: 0,
        lastUpdate: new Date(),
        stateSize: 0,
    });

    /* eslint-disable react-hooks/refs */
    debugInfo.current.renderCount++;
    debugInfo.current.lastUpdate = new Date();
    debugInfo.current.stateSize = JSON.stringify(store).length;

    const renderCount = debugInfo.current.renderCount;
    const lastUpdate = debugInfo.current.lastUpdate;
    const stateSize = debugInfo.current.stateSize;

    return {
        renderCount,
        lastUpdate,
        stateSize,
        deviceCount: Object.keys(store.devices).length,
        connectionCount: Object.keys(store.connections).length,
        selectedDeviceCount: store.selectedDeviceIds.size,
        selectedConnectionCount: store.selectedConnectionIds.size,
    };
    /* eslint-enable react-hooks/refs */
};

export const useLogStateChanges = () => {
    const store = useNetworkStore();

    useEffect(() => {
        const unsubscribe = (store as any).subscribe(
            (state: any) => state,
            (state: any, prevState: any) => {
                console.group('State Change');
                console.log('Previous:', prevState);
                console.log('Current:', state);
                console.log('Changes:', {
                    devices: Object.keys(state.devices).length - Object.keys(prevState.devices).length,
                    connections: Object.keys(state.connections).length - Object.keys(prevState.connections).length,
                    selectedDevices: state.selectedDeviceIds.size - prevState.selectedDeviceIds.size,
                });
                console.groupEnd();
            },
            {
                equalityFn: shallow,
            }
        );

        return unsubscribe;
    }, [store]);
};

// ============================================================================
// Performance Monitoring
// ============================================================================

export const usePerformanceMonitor = () => {
    const store = useNetworkStore();
    const metrics = useRef({
        renderTimes: [] as number[],
        updateCount: 0,
        startTime: Date.now(),
    });

    const recordRenderTime = useCallback((renderTime: number) => {
        metrics.current.renderTimes.push(renderTime);
        if (metrics.current.renderTimes.length > 100) {
            metrics.current.renderTimes.shift();
        }
        metrics.current.updateCount++;
    }, []);

    const getPerformanceReport = useCallback(() => {
        const renderTimes = metrics.current.renderTimes;
        const avgRenderTime = renderTimes.length > 0
            ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
            : 0;
        const totalTime = Date.now() - metrics.current.startTime;
        const updatesPerSecond = metrics.current.updateCount / (totalTime / 1000);

        return {
            averageRenderTime: avgRenderTime,
            updatesPerSecond,
            totalUpdates: metrics.current.updateCount,
            totalTime,
            deviceCount: Object.keys(store.devices).length,
            connectionCount: Object.keys(store.connections).length,
        };
    }, [store]);

    return {
        recordRenderTime,
        getPerformanceReport,
    };
};

// ============================================================================
// Utility Functions
// ============================================================================

export const createOptimizedSelector = <T, R>(
    selector: (state: NetworkState) => R,
    equalityFn?: (a: R, b: R) => boolean
) => {
    // This should be used inside a React component or custom hook
    // Return the selector function to be used with useNetworkStore
    return selector;
};

export const batchUpdates = (updates: Array<() => void>) => {
    // In a real implementation, this would batch state updates
    updates.forEach(update => update());
};

export const resetStore = () => {
    // Reset store to initial state - this should be called from a component
    // that has access to the store hook
    console.warn('resetStore should be called from a React component with access to useNetworkStore');
};
