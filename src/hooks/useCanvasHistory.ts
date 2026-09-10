import { useState, useRef, useCallback } from 'react';
import { CanvasDevice, CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

interface HistorySnapshot {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    notes: CanvasNote[];
    deviceStates?: Record<string, SwitchState>;
}

interface UseCanvasHistoryOptions {
    setDevices: (devices: CanvasDevice[]) => void;
    setConnections: (connections: CanvasConnection[]) => void;
    setNotes: (notes: CanvasNote[]) => void;
    latestDevicesRef: React.MutableRefObject<CanvasDevice[]>;
    latestConnectionsRef: React.MutableRefObject<CanvasConnection[]>;
    latestNotesRef: React.MutableRefObject<CanvasNote[]>;
    setDeviceStates?: (states: Record<string, SwitchState>) => void;
    latestDeviceStatesRef?: React.MutableRefObject<Record<string, SwitchState>>;
    maxHistory?: number;
    onAction?: (desc: string) => void;
}

/**
 * Manages undo/redo history for the canvas topology.
 * Call `saveToHistory()` BEFORE making any change to capture the current state.
 */
export function useCanvasHistory({
    setDevices,
    setConnections,
    setNotes,
    latestDevicesRef,
    latestConnectionsRef,
    latestNotesRef,
    setDeviceStates,
    latestDeviceStatesRef,
    maxHistory = 100,
    onAction
}: UseCanvasHistoryOptions) {
    const historyRef = useRef<HistorySnapshot[]>([]);
    const historyIndexRef = useRef<number>(-1);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [historyLength, setHistoryLength] = useState(0);

    const saveToHistory = useCallback((desc?: string) => {
        if (desc && onAction) {
            onAction(desc);
        }

        const snapshot: HistorySnapshot = {
            devices: structuredClone(latestDevicesRef.current),
            connections: structuredClone(latestConnectionsRef.current),
            notes: structuredClone(latestNotesRef.current),
            deviceStates: latestDeviceStatesRef ? structuredClone(latestDeviceStatesRef.current) : undefined,
        };

        const truncated = historyRef.current.slice(0, historyIndexRef.current + 1);

        // Skip if identical to last entry
        const last = truncated[truncated.length - 1];
        if (
            last &&
            JSON.stringify(last.devices) === JSON.stringify(snapshot.devices) &&
            JSON.stringify(last.connections) === JSON.stringify(snapshot.connections) &&
            JSON.stringify(last.notes) === JSON.stringify(snapshot.notes) &&
            (!latestDeviceStatesRef || JSON.stringify(last.deviceStates) === JSON.stringify(snapshot.deviceStates))
        ) {
            return;
        }

        truncated.push(snapshot);
        if (truncated.length > maxHistory) truncated.shift();

        historyRef.current = truncated;
        historyIndexRef.current = truncated.length - 1;
        setHistoryIndex(historyIndexRef.current);
        setHistoryLength(truncated.length);
    }, [latestDevicesRef, latestConnectionsRef, latestNotesRef, latestDeviceStatesRef, maxHistory, onAction]);

    const handleUndo = useCallback(() => {
        if (historyIndexRef.current >= 0) {
            // If at the tip of history, capture current live state first so the latest state is not lost for Redo
            if (historyIndexRef.current === historyRef.current.length - 1) {
                const currentSnapshot: HistorySnapshot = {
                    devices: structuredClone(latestDevicesRef.current),
                    connections: structuredClone(latestConnectionsRef.current),
                    notes: structuredClone(latestNotesRef.current),
                    deviceStates: latestDeviceStatesRef ? structuredClone(latestDeviceStatesRef.current) : undefined,
                };
                const last = historyRef.current[historyRef.current.length - 1];
                if (
                    !last ||
                    JSON.stringify(last.devices) !== JSON.stringify(currentSnapshot.devices) ||
                    JSON.stringify(last.connections) !== JSON.stringify(currentSnapshot.connections) ||
                    JSON.stringify(last.notes) !== JSON.stringify(currentSnapshot.notes)
                ) {
                    historyRef.current.push(currentSnapshot);
                    setHistoryLength(historyRef.current.length);
                }
            }

            if (historyIndexRef.current > 0) {
                historyIndexRef.current -= 1;
                const state = historyRef.current[historyIndexRef.current];
                if (state) {
                    setDevices(structuredClone(state.devices));
                    setConnections(structuredClone(state.connections));
                    setNotes(structuredClone(state.notes));
                    if (setDeviceStates && state.deviceStates) {
                        setDeviceStates(structuredClone(state.deviceStates));
                    }
                    setHistoryIndex(historyIndexRef.current);
                }
            }
        }
    }, [setDevices, setConnections, setNotes, setDeviceStates, latestDevicesRef, latestConnectionsRef, latestNotesRef, latestDeviceStatesRef]);

    const handleRedo = useCallback(() => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current += 1;
            const state = historyRef.current[historyIndexRef.current];
            if (state) {
                setDevices(structuredClone(state.devices));
                setConnections(structuredClone(state.connections));
                setNotes(structuredClone(state.notes));
                if (setDeviceStates && state.deviceStates) {
                    setDeviceStates(structuredClone(state.deviceStates));
                }
                setHistoryIndex(historyIndexRef.current);
            }
        }
    }, [setDevices, setConnections, setNotes, setDeviceStates]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < historyLength - 1;

    return {
        saveToHistory,
        handleUndo,
        handleRedo,
        canUndo,
        canRedo,
        historyIndex,
        historyLength,
    };
}

