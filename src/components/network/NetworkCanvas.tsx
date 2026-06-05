/**
 * NetworkCanvas Component (Part 2: Drag-and-Drop)
 * 
 * Central workspace where students build and visualize networks.
 * Provides SVG-based rendering with drag-and-drop, zoom/pan, and grid snapping.
 * 
 * Features:
 * - Device rendering with icons and labels
 * - Device selection and highlighting
 * - Zoom and pan controls
 * - Grid snapping functionality
 * - Device status indicators (online/offline)
 * - Real-time connection visualization
 * - Enhanced drag-and-drop with visual feedback
 * - Multi-device selection and movement
 * - Collision detection and boundary checking
 * - Alignment tools (left, center, right, distribute)
 * - Smooth animations to final position
 * 
 * Requirements: 3.1, 3.2, 3.5
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
    ZoomIn,
    ZoomOut,
    Maximize,
    Grid,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    MousePointer2,
    Hand
} from 'lucide-react';
import { CanvasDevice, CanvasConnection, CanvasPort } from './networkTopology.types';
import { DeviceIcon } from './DeviceIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './NetworkCanvas.module.css';
import { cn } from '@/lib/utils';

// Constants
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const GRID_SIZE = 16;
const DEVICE_WIDTH = 80;
const DEVICE_HEIGHT = 100;
const PORT_RADIUS = 6;
const DRAG_THRESHOLD = 5;
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;
const COLLISION_PADDING = 10; // Padding around device for collision detection

// Color palette from design system
const COLORS = {
    online: '#00CC66',      // Primary Green
    offline: '#999999',     // Gray
    selected: '#0066FF',    // Primary Blue
    hover: '#E6F2FF',       // Light Blue
    connection: '#0066FF',  // Primary Blue
    grid: '#F0F0F0',        // Light Gray
    text: '#1A1A1A',        // Dark Gray
    border: '#CCCCCC',      // Medium Gray
    warning: '#FF9900',     // Orange for warnings
    error: '#FF3333',       // Red for errors
    preview: '#0066FF',     // Blue for preview
    collision: '#FF3333',   // Red for collision
    alignment: '#00CC66',   // Green for alignment guides
};

interface NetworkCanvasProps {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    selectedDeviceIds: string[];
    onDeviceSelect: (deviceId: string, isMultiSelect: boolean) => void;
    onDeviceDeselect: (deviceId: string) => void;
    onDeviceMove: (deviceId: string, x: number, y: number) => void;
    onDevicesMove?: (deviceIds: string[], deltaX: number, deltaY: number) => void;
    onDeviceDoubleClick?: (deviceId: string) => void;
    zoom?: number;
    onZoomChange?: (zoom: number) => void;
    pan?: { x: number; y: number };
    onPanChange?: (pan: { x: number; y: number }) => void;
    snapToGrid?: boolean;
    onSnapToGridChange?: (enabled: boolean) => void;
    highContrastMode?: boolean;
    className?: string;
    onAlignDevices?: (deviceIds: string[], alignment: 'left' | 'center' | 'right' | 'distribute') => void;
}

/**
 * Collision detection: Check if two devices overlap
 */
const checkCollision = (
    device1: CanvasDevice,
    device2: CanvasDevice,
    padding: number = COLLISION_PADDING
): boolean => {
    const x1 = device1.x;
    const y1 = device1.y;
    const x2 = device2.x;
    const y2 = device2.y;

    return !(
        x1 + DEVICE_WIDTH + padding < x2 ||
        x2 + DEVICE_WIDTH + padding < x1 ||
        y1 + DEVICE_HEIGHT + padding < y2 ||
        y2 + DEVICE_HEIGHT + padding < y1
    );
};

/**
 * Check if device is within canvas bounds
 */
const isWithinBounds = (x: number, y: number): boolean => {
    return x >= 0 && y >= 0 && x + DEVICE_WIDTH <= CANVAS_WIDTH && y + DEVICE_HEIGHT <= CANVAS_HEIGHT;
};

/**
 * Clamp coordinates to canvas bounds
 */
const clampToBounds = (x: number, y: number): { x: number; y: number } => {
    return {
        x: Math.max(0, Math.min(x, CANVAS_WIDTH - DEVICE_WIDTH)),
        y: Math.max(0, Math.min(y, CANVAS_HEIGHT - DEVICE_HEIGHT)),
    };
};

/**
 * NetworkCanvas Component
 * 
 * Renders a network topology canvas with SVG for efficient rendering.
 * Supports device placement, selection, zoom/pan, and grid snapping.
 */
export const NetworkCanvas = React.memo(React.forwardRef<HTMLDivElement, NetworkCanvasProps>(
    (
        {
            devices,
            connections,
            selectedDeviceIds,
            onDeviceSelect,
            onDeviceDeselect,
            onDeviceMove,
            onDeviceDoubleClick,
            zoom = DEFAULT_ZOOM,
            onZoomChange,
            pan = { x: 0, y: 0 },
            onPanChange,
            snapToGrid = true,
            onSnapToGridChange,
            highContrastMode = false,
            className,
        },
        ref
    ) => {
        const { t } = useLanguage();
        // Local state
        const [internalZoom, setInternalZoom] = useState(zoom);
        const [internalPan, setInternalPan] = useState(pan);
        const [isPanning, setIsPanning] = useState(false);
        const [draggedDeviceId, setDraggedDeviceId] = useState<string | null>(null);
        const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null);
        const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
        const [deviceStartPos, setDeviceStartPos] = useState<{ x: number; y: number } | null>(null);
        const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null);
        const [collisionDetected, setCollisionDetected] = useState(false);
        const [isRectSelecting, setIsRectSelecting] = useState(false);
        const [rectSelectStart, setRectSelectStart] = useState<{ x: number; y: number } | null>(null);
        const [rectSelectEnd, setRectSelectEnd] = useState<{ x: number; y: number } | null>(null);
        const [selectedDeviceStartPositions, setSelectedDeviceStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

        // Refs
        const containerRef = useRef<HTMLDivElement>(null);
        const svgRef = useRef<SVGSVGElement>(null);
        const panStartRef = useRef<{ x: number; y: number } | null>(null);
        const isDraggingRef = useRef(false);

        // Sync internal zoom/pan with props
        useEffect(() => {
            setInternalZoom(zoom);
        }, [zoom]);

        useEffect(() => {
            setInternalPan(pan);
        }, [pan]);

        /**
         * Convert screen coordinates to canvas coordinates
         */
        const screenToCanvas = useCallback(
            (screenX: number, screenY: number) => {
                if (!containerRef.current) return { x: 0, y: 0 };
                const rect = containerRef.current.getBoundingClientRect();
                return {
                    x: (screenX - rect.left - internalPan.x) / internalZoom,
                    y: (screenY - rect.top - internalPan.y) / internalZoom,
                };
            },
            [internalPan, internalZoom]
        );

        /**
         * Convert canvas coordinates to screen coordinates
         */
        const canvasToScreen = useCallback(
            (canvasX: number, canvasY: number) => {
                return {
                    x: canvasX * internalZoom + internalPan.x,
                    y: canvasY * internalZoom + internalPan.y,
                };
            },
            [internalPan, internalZoom]
        );

        /**
         * Apply grid snapping to coordinates
         */
        const snapToGridCoords = useCallback(
            (x: number, y: number) => {
                if (!snapToGrid) return { x, y };
                return {
                    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
                    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
                };
            },
            [snapToGrid]
        );

        /**
         * Handle zoom with mouse wheel
         */
        const handleWheel = useCallback(
            (e: React.WheelEvent) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, internalZoom + delta));

                if (onZoomChange) {
                    onZoomChange(newZoom);
                }
                setInternalZoom(newZoom);
            },
            [internalZoom, onZoomChange]
        );

        /**
         * Handle pan start (middle mouse button or spacebar + drag)
         */
        const handlePanStart = useCallback((e: React.MouseEvent) => {
            if (e.button !== 1) return; // Middle mouse button only
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = { x: e.clientX - internalPan.x, y: e.clientY - internalPan.y };
        }, [internalPan]);

        /**
         * Handle pan move
         */
        const handlePanMove = useCallback(
            (e: React.MouseEvent) => {
                if (!isPanning || !panStartRef.current) return;
                const newPan = {
                    x: e.clientX - panStartRef.current.x,
                    y: e.clientY - panStartRef.current.y,
                };
                setInternalPan(newPan);
                if (onPanChange) {
                    onPanChange(newPan);
                }
            },
            [isPanning, onPanChange]
        );

        /**
         * Handle pan end
         */
        const handlePanEnd = useCallback(() => {
            setIsPanning(false);
            panStartRef.current = null;
        }, []);

        /**
         * Handle device drag start
         */
        const handleDeviceDragStart = useCallback(
            (e: React.MouseEvent, deviceId: string) => {
                e.preventDefault();
                e.stopPropagation();

                const device = devices.find((d) => d.id === deviceId);
                if (!device) return;

                // Select device if not already selected
                if (!selectedDeviceIds.includes(deviceId)) {
                    onDeviceSelect(deviceId, e.shiftKey);
                }

                // Store start positions for all selected devices
                const startPositions = new Map<string, { x: number; y: number }>();
                selectedDeviceIds.forEach((id) => {
                    const dev = devices.find((d) => d.id === id);
                    if (dev) {
                        startPositions.set(id, { x: dev.x, y: dev.y });
                    }
                });

                setDraggedDeviceId(deviceId);
                setDragStartPos({ x: e.clientX, y: e.clientY });
                setDeviceStartPos({ x: device.x, y: device.y });
                setSelectedDeviceStartPositions(startPositions);
                setCollisionDetected(false);
                isDraggingRef.current = true;
            },
            [devices, selectedDeviceIds, onDeviceSelect]
        );

        /**
         * Handle device drag move with collision detection and multi-device support
         */
        const handleDeviceDragMove = useCallback(
            (e: React.MouseEvent) => {
                if (!isDraggingRef.current || !dragStartPos || !deviceStartPos || !draggedDeviceId) return;

                const deltaX = (e.clientX - dragStartPos.x) / internalZoom;
                const deltaY = (e.clientY - dragStartPos.y) / internalZoom;

                // Calculate preview position for the dragged device
                let previewX = deviceStartPos.x + deltaX;
                let previewY = deviceStartPos.y + deltaY;

                // Apply grid snapping
                if (snapToGrid) {
                    previewX = Math.round(previewX / GRID_SIZE) * GRID_SIZE;
                    previewY = Math.round(previewY / GRID_SIZE) * GRID_SIZE;
                }

                // Clamp to canvas bounds
                const clamped = clampToBounds(previewX, previewY);
                previewX = clamped.x;
                previewY = clamped.y;

                setDragPreviewPos({ x: previewX, y: previewY });

                // Check for collisions with other devices
                let hasCollision = false;
                const draggedDevice = devices.find((d) => d.id === draggedDeviceId);
                if (draggedDevice) {
                    const testDevice = { ...draggedDevice, x: previewX, y: previewY };
                    for (const device of devices) {
                        if (device.id !== draggedDeviceId && !selectedDeviceIds.includes(device.id)) {
                            if (checkCollision(testDevice, device)) {
                                hasCollision = true;
                                break;
                            }
                        }
                    }
                }
                setCollisionDetected(hasCollision);

                // Move all selected devices together
                selectedDeviceIds.forEach((id) => {
                    const startPos = selectedDeviceStartPositions.get(id);
                    if (startPos) {
                        let newX = startPos.x + deltaX;
                        let newY = startPos.y + deltaY;

                        if (snapToGrid) {
                            newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                            newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
                        }

                        const clampedPos = clampToBounds(newX, newY);
                        onDeviceMove(id, clampedPos.x, clampedPos.y);
                    }
                });
            },
            [dragStartPos, deviceStartPos, draggedDeviceId, internalZoom, snapToGrid, onDeviceMove, devices, selectedDeviceIds, selectedDeviceStartPositions]
        );

        /**
         * Handle device drag end
         */
        const handleDeviceDragEnd = useCallback(() => {
            isDraggingRef.current = false;
            setDraggedDeviceId(null);
            setDragStartPos(null);
            setDeviceStartPos(null);
            setDragPreviewPos(null);
            setCollisionDetected(false);
            setSelectedDeviceStartPositions(new Map());
        }, []);

        /**
         * Handle device click
         */
        const handleDeviceClick = useCallback(
            (e: React.MouseEvent, deviceId: string) => {
                e.stopPropagation();
                onDeviceSelect(deviceId, e.shiftKey);
            },
            [onDeviceSelect]
        );

        /**
         * Handle device double click
         */
        const handleDeviceDoubleClick = useCallback(
            (e: React.MouseEvent, deviceId: string) => {
                e.stopPropagation();
                if (onDeviceDoubleClick) {
                    onDeviceDoubleClick(deviceId);
                }
            },
            [onDeviceDoubleClick]
        );

        /**
         * Align selected devices to the left
         */
        const alignDevicesLeft = useCallback(() => {
            if (selectedDeviceIds.length < 2) return;

            const selectedDevices = devices.filter((d) => selectedDeviceIds.includes(d.id));
            const minX = Math.min(...selectedDevices.map((d) => d.x));

            selectedDevices.forEach((device) => {
                onDeviceMove(device.id, minX, device.y);
            });
        }, [selectedDeviceIds, devices, onDeviceMove]);

        /**
         * Align selected devices to center
         */
        const alignDevicesCenter = useCallback(() => {
            if (selectedDeviceIds.length < 2) return;

            const selectedDevices = devices.filter((d) => selectedDeviceIds.includes(d.id));
            const minX = Math.min(...selectedDevices.map((d) => d.x));
            const maxX = Math.max(...selectedDevices.map((d) => d.x));
            const centerX = (minX + maxX) / 2;

            selectedDevices.forEach((device) => {
                const newX = centerX - DEVICE_WIDTH / 2;
                onDeviceMove(device.id, newX, device.y);
            });
        }, [selectedDeviceIds, devices, onDeviceMove]);

        /**
         * Align selected devices to the right
         */
        const alignDevicesRight = useCallback(() => {
            if (selectedDeviceIds.length < 2) return;

            const selectedDevices = devices.filter((d) => selectedDeviceIds.includes(d.id));
            const maxX = Math.max(...selectedDevices.map((d) => d.x + DEVICE_WIDTH));

            selectedDevices.forEach((device) => {
                onDeviceMove(device.id, maxX - DEVICE_WIDTH, device.y);
            });
        }, [selectedDeviceIds, devices, onDeviceMove]);

        /**
         * Distribute selected devices evenly
         */
        const distributeDevices = useCallback(() => {
            if (selectedDeviceIds.length < 3) return;

            const selectedDevices = devices.filter((d) => selectedDeviceIds.includes(d.id));
            const sortedByX = [...selectedDevices].sort((a, b) => a.x - b.x);

            const minX = sortedByX[0].x;
            const maxX = sortedByX[sortedByX.length - 1].x + DEVICE_WIDTH;
            const spacing = (maxX - minX) / (sortedByX.length - 1);

            sortedByX.forEach((device, index) => {
                const newX = minX + index * spacing;
                onDeviceMove(device.id, newX, device.y);
            });
        }, [selectedDeviceIds, devices, onDeviceMove]);

        /**
         * Handle canvas click (deselect all or start rectangle selection)
         */
        const handleCanvasClick = useCallback(
            (e: React.MouseEvent) => {
                if (e.target === containerRef.current || e.target === svgRef.current) {
                    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        selectedDeviceIds.forEach((id) => onDeviceDeselect(id));
                    }
                }
            },
            [selectedDeviceIds, onDeviceDeselect]
        );

        /**
         * Handle canvas mouse down for rectangle selection
         */
        const handleCanvasMouseDown = useCallback(
            (e: React.MouseEvent) => {
                if (e.button !== 0) return; // Left mouse button only
                if (e.target !== svgRef.current) return;

                const canvasCoords = screenToCanvas(e.clientX, e.clientY);
                setRectSelectStart(canvasCoords);
                setIsRectSelecting(true);
            },
            [screenToCanvas]
        );

        /**
         * Handle canvas mouse move for rectangle selection
         */
        const handleCanvasMouseMove = useCallback(
            (e: React.MouseEvent) => {
                if (!isRectSelecting || !rectSelectStart) return;

                const canvasCoords = screenToCanvas(e.clientX, e.clientY);
                setRectSelectEnd(canvasCoords);
            },
            [isRectSelecting, rectSelectStart, screenToCanvas]
        );

        /**
         * Handle canvas mouse up for rectangle selection
         */
        const handleCanvasMouseUp = useCallback(
            (e: React.MouseEvent) => {
                if (!isRectSelecting || !rectSelectStart || !rectSelectEnd) {
                    setIsRectSelecting(false);
                    setRectSelectStart(null);
                    setRectSelectEnd(null);
                    return;
                }

                // Find devices within selection rectangle
                const minX = Math.min(rectSelectStart.x, rectSelectEnd.x);
                const maxX = Math.max(rectSelectStart.x, rectSelectEnd.x);
                const minY = Math.min(rectSelectStart.y, rectSelectEnd.y);
                const maxY = Math.max(rectSelectStart.y, rectSelectEnd.y);

                const selectedIds: string[] = [];
                devices.forEach((device) => {
                    if (
                        device.x < maxX &&
                        device.x + DEVICE_WIDTH > minX &&
                        device.y < maxY &&
                        device.y + DEVICE_HEIGHT > minY
                    ) {
                        selectedIds.push(device.id);
                    }
                });

                // Update selection
                if (selectedIds.length > 0) {
                    selectedIds.forEach((id) => {
                        if (!selectedDeviceIds.includes(id)) {
                            onDeviceSelect(id, true);
                        }
                    });
                }

                setIsRectSelecting(false);
                setRectSelectStart(null);
                setRectSelectEnd(null);
            },
            [isRectSelecting, rectSelectStart, rectSelectEnd, devices, selectedDeviceIds, onDeviceSelect]
        );

        /**
         * Render grid background
         */
        const renderGrid = useMemo(() => {
            const gridSpacing = GRID_SIZE * internalZoom;
            const offsetX = internalPan.x % gridSpacing;
            const offsetY = internalPan.y % gridSpacing;

            if (gridSpacing < 5) return null; // Don't render grid if too small

            const lines = [];
            const containerWidth = containerRef.current?.clientWidth || 1000;
            const containerHeight = containerRef.current?.clientHeight || 800;

            // Vertical lines
            for (let x = offsetX; x < containerWidth; x += gridSpacing) {
                lines.push(
                    <line
                        key={`grid-v-${x}`}
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={containerHeight}
                        stroke={COLORS.grid}
                        strokeWidth={0.5}
                    />
                );
            }

            // Horizontal lines
            for (let y = offsetY; y < containerHeight; y += gridSpacing) {
                lines.push(
                    <line
                        key={`grid-h-${y}`}
                        x1={0}
                        y1={y}
                        x2={containerWidth}
                        y2={y}
                        stroke={COLORS.grid}
                        strokeWidth={0.5}
                    />
                );
            }

            return lines;
        }, [internalZoom, internalPan]);

        /**
         * Render connections
         */
        const renderConnections = useMemo(() => {
            return connections.map((conn) => {
                const source = devices.find((d) => d.id === conn.sourceDeviceId);
                const target = devices.find((d) => d.id === conn.targetDeviceId);

                if (!source || !target) return null;

                const x1 = source.x * internalZoom + internalPan.x + (DEVICE_WIDTH / 2) * internalZoom;
                const y1 = source.y * internalZoom + internalPan.y + DEVICE_HEIGHT * internalZoom;
                const x2 = target.x * internalZoom + internalPan.x + (DEVICE_WIDTH / 2) * internalZoom;
                const y2 = target.y * internalZoom + internalPan.y;

                return (
                    <line
                        key={conn.id}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={conn.active ? COLORS.connection : COLORS.offline}
                        strokeWidth={2}
                        strokeDasharray={conn.active ? 'none' : '5,5'}
                        opacity={0.7}
                    />
                );
            });
        }, [connections, devices, internalZoom, internalPan]);

        /**
         * Render devices with collision detection, drag preview, and smooth transitions
         */
        const renderDevices = useMemo(() => {
            return devices.map((device) => {
                const isSelected = selectedDeviceIds.includes(device.id);
                const isHovered = hoveredDeviceId === device.id;
                const isDragging = draggedDeviceId === device.id;

                const x = device.x * internalZoom + internalPan.x;
                const y = device.y * internalZoom + internalPan.y;
                const width = DEVICE_WIDTH * internalZoom;
                const height = DEVICE_HEIGHT * internalZoom;

                // Status color
                const statusColor = device.status === 'online' ? COLORS.online : COLORS.offline;

                // Check if this device has collision during drag
                let hasCollision = false;
                if (isDragging && dragPreviewPos && collisionDetected) {
                    hasCollision = true;
                }

                return (
                    <g
                        key={device.id}
                        data-device-id={device.id}
                        transform={`translate(${x}, ${y})`}
                        onMouseDown={(e) => handleDeviceDragStart(e as any, device.id)}
                        onMouseMove={(e) => handleDeviceDragMove(e as any)}
                        onMouseUp={handleDeviceDragEnd}
                        onMouseEnter={() => setHoveredDeviceId(device.id)}
                        onMouseLeave={() => setHoveredDeviceId(null)}
                        onClick={(e) => handleDeviceClick(e as any, device.id)}
                        onDoubleClick={(e) => handleDeviceDoubleClick(e as any, device.id)}
                        className={cn(styles.deviceGroup, {
                            [styles.selected]: isSelected,
                            [styles.dragging]: isDragging,
                            [styles.noTransition]: isDragging || isDraggingRef.current
                        })}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        {/* Device background */}
                        <rect
                            width={width}
                            height={height}
                            fill={isHovered ? COLORS.hover : '#FFFFFF'}
                            stroke={hasCollision ? COLORS.collision : (isSelected ? COLORS.selected : COLORS.border)}
                            strokeWidth={hasCollision ? 3 : (isSelected ? 3 : 1)}
                            rx={4}
                            filter={isSelected ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : (hasCollision ? 'drop-shadow(0 0 8px rgba(255,51,51,0.5))' : 'none')}
                        />

                        {/* Collision warning indicator */}
                        {hasCollision && (
                            <circle
                                cx={width - 8}
                                cy={8}
                                r={6}
                                fill={COLORS.collision}
                                stroke={highContrastMode ? '#000000' : 'none'}
                                strokeWidth={highContrastMode ? 1 : 0}
                            />
                        )}

                        {/* Status indicator */}
                        {!hasCollision && (
                            <circle
                                cx={width - 8}
                                cy={8}
                                r={4}
                                fill={statusColor}
                                stroke={highContrastMode ? '#000000' : 'none'}
                                strokeWidth={highContrastMode ? 1 : 0}
                            />
                        )}

                        {/* Device icon */}
                        <svg
                            x={width * 0.1}
                            y={height * 0.1}
                            width={width * 0.8}
                            height={height * 0.5}
                            viewBox="0 0 24 24"
                        >
                            <DeviceIcon
                                type={device.type as any}
                                size="100%"
                                color={isSelected ? COLORS.selected : (hasCollision ? COLORS.collision : COLORS.text)}
                            />
                        </svg>

                        {/* Device label */}
                        <text
                            x={width / 2}
                            y={height - 8}
                            textAnchor="middle"
                            fontSize={Math.max(10, 12 * internalZoom)}
                            fill={COLORS.text}
                            fontWeight={isSelected ? 'bold' : 'normal'}
                        >
                            {device.name}
                        </text>

                        {/* IP address label (if available) */}
                        {device.ip && (
                            <text
                                x={width / 2}
                                y={height - 2}
                                textAnchor="middle"
                                fontSize={Math.max(8, 10 * internalZoom)}
                                fill={COLORS.text}
                                opacity={0.7}
                            >
                                {device.ip}
                            </text>
                        )}
                    </g>
                );
            });
        }, [
            devices,
            selectedDeviceIds,
            hoveredDeviceId,
            draggedDeviceId,
            internalZoom,
            internalPan,
            highContrastMode,
            dragPreviewPos,
            collisionDetected,
            handleDeviceDragStart,
            handleDeviceDragMove,
            handleDeviceDragEnd,
            handleDeviceClick,
            handleDeviceDoubleClick,
        ]);

        /**
         * Render drag preview line and collision warning
         */
        const renderDragFeedback = useMemo(() => {
            if (!isDraggingRef.current || !dragPreviewPos || !draggedDeviceId) return null;

            const draggedDevice = devices.find((d) => d.id === draggedDeviceId);
            if (!draggedDevice) return null;

            const previewX = dragPreviewPos.x * internalZoom + internalPan.x;
            const previewY = dragPreviewPos.y * internalZoom + internalPan.y;
            const previewWidth = DEVICE_WIDTH * internalZoom;
            const previewHeight = DEVICE_HEIGHT * internalZoom;

            return (
                <g key="drag-feedback" opacity={0.6}>
                    {/* Preview rectangle showing where device will be placed */}
                    <rect
                        x={previewX}
                        y={previewY}
                        width={previewWidth}
                        height={previewHeight}
                        fill={COLORS.preview}
                        stroke={collisionDetected ? COLORS.collision : COLORS.preview}
                        strokeWidth={2}
                        strokeDasharray="4,4"
                        rx={4}
                    />

                    {/* Collision warning text */}
                    {collisionDetected && (
                        <text
                            x={previewX + previewWidth / 2}
                            y={previewY - 10}
                            textAnchor="middle"
                            fontSize={12}
                            fill={COLORS.collision}
                            fontWeight="bold"
                        >
                            ⚠ Collision
                        </text>
                    )}
                </g>
            );
        }, [isDraggingRef.current, dragPreviewPos, draggedDeviceId, devices, internalZoom, internalPan, collisionDetected]);

        /**
         * Render rectangle selection box
         */
        const renderRectSelection = useMemo(() => {
            if (!isRectSelecting || !rectSelectStart || !rectSelectEnd) return null;

            const minX = Math.min(rectSelectStart.x, rectSelectEnd.x) * internalZoom + internalPan.x;
            const maxX = Math.max(rectSelectStart.x, rectSelectEnd.x) * internalZoom + internalPan.x;
            const minY = Math.min(rectSelectStart.y, rectSelectEnd.y) * internalZoom + internalPan.y;
            const maxY = Math.max(rectSelectStart.y, rectSelectEnd.y) * internalZoom + internalPan.y;

            return (
                <rect
                    key="rect-selection"
                    x={minX}
                    y={minY}
                    width={maxX - minX}
                    height={maxY - minY}
                    fill={`${COLORS.preview}20`}
                    stroke={COLORS.preview}
                    strokeWidth={2}
                    strokeDasharray="4,4"
                />
            );
        }, [isRectSelecting, rectSelectStart, rectSelectEnd, internalZoom, internalPan]);

        return (
            <div
                ref={containerRef}
                className={`${styles.networkCanvas} ${className || ''}`}
                onWheel={handleWheel}
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
                onClick={handleCanvasClick}
                style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    backgroundColor: '#FAFAFA',
                    position: 'relative',
                    cursor: isPanning ? 'grabbing' : 'default',
                }}
            >
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                    }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                >
                    {/* Grid background */}
                    {renderGrid}

                    {/* Connections */}
                    {renderConnections}

                    {/* Devices */}
                    {renderDevices}

                    {/* Drag feedback (preview and collision warning) */}
                    {renderDragFeedback}

                    {/* Rectangle selection box */}
                    {renderRectSelection}
                </svg>

                {/* Controls */}
                <div className={styles.controls}>
                    {/* Zoom controls */}
                    <div className={styles.controlGroup}>
                        <button
                            className={styles.controlButton}
                            onClick={() => onZoomChange?.(Math.min(MAX_ZOOM, internalZoom + 0.1))}
                            title={t.zoomIn}
                            aria-label="Zoom In"
                        >
                            <ZoomIn size={16} />
                        </button>
                        <div className={styles.zoomLevel} aria-label="Zoom Level">
                            {Math.round(internalZoom * 100)}%
                        </div>
                        <button
                            className={styles.controlButton}
                            onClick={() => onZoomChange?.(Math.max(MIN_ZOOM, internalZoom - 0.1))}
                            title={t.zoomOut}
                            aria-label="Zoom Out"
                        >
                            <ZoomOut size={16} />
                        </button>
                        <button
                            className={styles.controlButton}
                            onClick={() => onZoomChange?.(1)}
                            title={t.resetZoom}
                            aria-label="Reset Zoom"
                        >
                            <Maximize size={16} />
                        </button>
                    </div>

                    {/* Grid controls */}
                    <button
                        className={cn(styles.gridToggle, { [styles.active]: snapToGrid })}
                        onClick={() => onSnapToGridChange?.(!snapToGrid)}
                        title={t.gridSnapping}
                        aria-label={t.language === 'tr' ? 'Izgaraya Yapıştırmayı Aç/Kapat' : 'Toggle Grid Snapping'}
                    >
                        <Grid size={16} />
                        <span className={styles.controlLabel}>{t.language === 'tr' ? 'Izgara' : 'Grid'}</span>
                    </button>

                    {/* Alignment controls - only show if multiple devices selected */}
                    {selectedDeviceIds.length >= 2 && (
                        <div className={styles.controlGroup}>
                            <button
                                className={styles.controlButton}
                                onClick={alignDevicesLeft}
                                title={t.alignLeft}
                                aria-label={t.language === 'tr' ? 'Sola Hizala' : 'Align Left'}
                            >
                                <AlignLeft size={16} />
                            </button>
                            <button
                                className={styles.controlButton}
                                onClick={alignDevicesCenter}
                                title={t.alignCenter}
                                aria-label={t.language === 'tr' ? 'Ortala' : 'Align Center'}
                            >
                                <AlignCenter size={16} />
                            </button>
                            <button
                                className={styles.controlButton}
                                onClick={alignDevicesRight}
                                title={t.alignRight}
                                aria-label="Align Right"
                            >
                                <AlignRight size={16} />
                            </button>
                            {selectedDeviceIds.length >= 3 && (
                                <button
                                    className={styles.controlButton}
                                    onClick={distributeDevices}
                                    title={t.distributeHorizontally}
                                    aria-label="Distribute Horizontally"
                                >
                                    <AlignJustify size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }
));

NetworkCanvas.displayName = 'NetworkCanvas';
