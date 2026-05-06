'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { DeviceConfig, Connection, ConnectionType, Port } from '@/types/ui-ux';
import { Card, CardContent } from './card';

export interface NetworkCanvasProps {
    devices: DeviceConfig[];
    connections: Connection[];
    onDeviceSelect?: (deviceId: string) => void;
    onDeviceDeselect?: (deviceId: string) => void;
    onCanvasClick?: (x: number, y: number) => void;
    onDeviceMove?: (deviceId: string, x: number, y: number) => void;
    onMultipleDevicesMove?: (deviceIds: string[], deltaX: number, deltaY: number) => void;
    onDevicesAlign?: (deviceIds: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => void;
    onConnectionCreate?: (sourceDeviceId: string, sourcePortId: string, targetDeviceId: string, targetPortId: string, type: ConnectionType) => void;
    onConnectionDelete?: (connectionId: string) => void;
    onConnectionSelect?: (connectionId: string) => void;
    selectedDeviceIds?: string[];
    selectedConnectionIds?: string[];
    className?: string;
    width?: number;
    height?: number;
    gridSize?: number;
    showGrid?: boolean;
    zoomLevel?: number;
    onZoomChange?: (zoom: number) => void;
    canvasBounds?: { minX: number; maxX: number; minY: number; maxY: number };
    enableCollisionDetection?: boolean;
    enableGridSnapping?: boolean;
    defaultConnectionType?: ConnectionType;
}

/**
 * Network Canvas Component
 * Central workspace where students build and visualize networks
 * Supports device rendering, selection, zoom, pan, grid snapping, and drag-and-drop
 */
export function NetworkCanvas({
    devices,
    connections,
    onDeviceSelect,
    onDeviceDeselect,
    onCanvasClick,
    onDeviceMove,
    onMultipleDevicesMove,
    onDevicesAlign,
    onConnectionCreate,
    onConnectionDelete,
    onConnectionSelect,
    selectedDeviceIds = [],
    selectedConnectionIds = [],
    className = '',
    width = 800,
    height = 600,
    gridSize = 20,
    showGrid = true,
    zoomLevel = 1,
    onZoomChange,
    canvasBounds = { minX: 0, maxX: 800, minY: 0, maxY: 600 },
    enableCollisionDetection = true,
    enableGridSnapping = true,
    defaultConnectionType = 'ethernet',
}: NetworkCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [isPanning, setIsPanning] = useState(false);
    const [isDraggingDevice, setIsDraggingDevice] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [currentZoom, setCurrentZoom] = useState(zoomLevel);
    const [draggedDeviceId, setDraggedDeviceId] = useState<string | null>(null);
    const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null);
    const [isRectSelecting, setIsRectSelecting] = useState(false);
    const [rectSelectStart, setRectSelectStart] = useState<{ x: number; y: number } | null>(null);
    const [rectSelectEnd, setRectSelectEnd] = useState<{ x: number; y: number } | null>(null);

    // Connection drawing state
    const [isDrawingConnection, setIsDrawingConnection] = useState(false);
    const [connectionSourceDeviceId, setConnectionSourceDeviceId] = useState<string | null>(null);
    const [connectionSourcePortId, setConnectionSourcePortId] = useState<string | null>(null);
    const [connectionPreviewEnd, setConnectionPreviewEnd] = useState<{ x: number; y: number } | null>(null);
    const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
    const [connectionType, setConnectionType] = useState<ConnectionType>(defaultConnectionType);

    const DEVICE_SIZE = 40;
    const DEVICE_RADIUS = DEVICE_SIZE / 2;
    const PORT_SIZE = 8;
    const PORT_RADIUS = PORT_SIZE / 2;

    // Helper: Check if point is within device bounds
    const isPointInDevice = (px: number, py: number, device: DeviceConfig): boolean => {
        const dx = device.position.x - px;
        const dy = device.position.y - py;
        return Math.sqrt(dx * dx + dy * dy) < DEVICE_RADIUS;
    };

    // Helper: Snap position to grid
    const snapToGrid = (pos: number): number => {
        if (!enableGridSnapping) return pos;
        return Math.round(pos / gridSize) * gridSize;
    };

    // Helper: Check if position is within canvas bounds
    const isWithinBounds = (x: number, y: number): boolean => {
        return (
            x - DEVICE_RADIUS >= canvasBounds.minX &&
            x + DEVICE_RADIUS <= canvasBounds.maxX &&
            y - DEVICE_RADIUS >= canvasBounds.minY &&
            y + DEVICE_RADIUS <= canvasBounds.maxY
        );
    };

    // Helper: Check collision with other devices
    const checkCollision = (x: number, y: number, excludeDeviceId?: string): boolean => {
        if (!enableCollisionDetection) return false;
        const minDistance = DEVICE_SIZE + 10; // Minimum distance between devices
        return devices.some((device) => {
            if (excludeDeviceId && device.id === excludeDeviceId) return false;
            const dx = device.position.x - x;
            const dy = device.position.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < minDistance;
        });
    };

    // Helper: Get device at screen position
    const getDeviceAtPosition = (screenX: number, screenY: number): DeviceConfig | undefined => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return undefined;

        const canvasX = (screenX - rect.left - panX) / currentZoom;
        const canvasY = (screenY - rect.top - panY) / currentZoom;

        for (const device of devices) {
            if (isPointInDevice(canvasX, canvasY, device)) {
                return device;
            }
        }
        return undefined;
    };

    // Helper: Get port position on device
    const getPortPosition = (device: DeviceConfig, portId: string): { x: number; y: number } => {
        const portIndex = device.ports?.findIndex(p => p.id === portId) ?? -1;
        if (portIndex === -1 || !device.ports || device.ports.length === 0) {
            // Return center if no ports or port not found
            return { x: device.position.x, y: device.position.y };
        }

        // Distribute ports evenly around the device
        const totalPorts = device.ports.length;
        const angle = (2 * Math.PI * portIndex) / totalPorts - Math.PI / 2; // Start from top
        const radius = DEVICE_RADIUS + PORT_RADIUS + 2;

        return {
            x: device.position.x + Math.cos(angle) * radius,
            y: device.position.y + Math.sin(angle) * radius,
        };
    };

    // Helper: Get port at position
    const getPortAtPosition = (screenX: number, screenY: number): { device: DeviceConfig; port: Port } | undefined => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return undefined;

        const canvasX = (screenX - rect.left - panX) / currentZoom;
        const canvasY = (screenY - rect.top - panY) / currentZoom;

        for (const device of devices) {
            if (!device.ports) continue;

            for (const port of device.ports) {
                const portPos = getPortPosition(device, port.id);
                const dx = portPos.x - canvasX;
                const dy = portPos.y - canvasY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < PORT_RADIUS + 5) { // Extra hit area for easier selection
                    return { device, port };
                }
            }
        }
        return undefined;
    };

    // Helper: Validate connection
    const validateConnection = (
        sourceDevice: DeviceConfig,
        sourcePort: Port,
        targetDevice: DeviceConfig,
        targetPort: Port
    ): { valid: boolean; reason?: string } => {
        // Self-connection check
        if (sourceDevice.id === targetDevice.id) {
            return { valid: false, reason: 'Cannot connect device to itself' };
        }

        // Port already connected check
        if (sourcePort.status === 'connected') {
            return { valid: false, reason: 'Source port is already connected' };
        }
        if (targetPort.status === 'connected') {
            return { valid: false, reason: 'Target port is already connected' };
        }

        // Device status check
        if (sourceDevice.status !== 'online') {
            return { valid: false, reason: 'Source device is offline' };
        }
        if (targetDevice.status !== 'online') {
            return { valid: false, reason: 'Target device is offline' };
        }

        return { valid: true };
    };

    // Helper: Get devices within rectangle
    const getDevicesInRect = (x1: number, y1: number, x2: number, y2: number): DeviceConfig[] => {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        return devices.filter((device) => {
            return (
                device.position.x >= minX &&
                device.position.x <= maxX &&
                device.position.y >= minY &&
                device.position.y <= maxY
            );
        });
    };

    // Helper: Align devices
    const alignDevices = (deviceIds: string[], alignment: string) => {
        if (deviceIds.length < 2) return;

        const devicesToAlign = devices.filter((d) => deviceIds.includes(d.id));
        if (devicesToAlign.length === 0) return;

        let alignmentType: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v' = alignment as any;

        switch (alignmentType) {
            case 'left': {
                const minX = Math.min(...devicesToAlign.map((d) => d.position.x));
                devicesToAlign.forEach((device) => {
                    onDeviceMove?.(device.id, minX, device.position.y);
                });
                break;
            }
            case 'center': {
                const avgX = devicesToAlign.reduce((sum, d) => sum + d.position.x, 0) / devicesToAlign.length;
                devicesToAlign.forEach((device) => {
                    onDeviceMove?.(device.id, avgX, device.position.y);
                });
                break;
            }
            case 'right': {
                const maxX = Math.max(...devicesToAlign.map((d) => d.position.x));
                devicesToAlign.forEach((device) => {
                    onDeviceMove?.(device.id, maxX, device.position.y);
                });
                break;
            }
            case 'top': {
                const minY = Math.min(...devicesToAlign.map((d) => d.position.y));
                devicesToAlign.forEach((device) => {
                    onDeviceMove?.(device.id, device.position.x, minY);
                });
                break;
            }
            case 'middle': {
                const avgY = devicesToAlign.reduce((sum, d) => sum + d.position.y, 0) / devicesToAlign.length;
                devicesToAlign.forEach((device) => {
                    onDeviceMove?.(device.id, device.position.x, avgY);
                });
                break;
            }
            case 'bottom': {
                const maxY = Math.max(...devicesToAlign.map((d) => d.position.y));
                devicesToAlign.forEach((device) => {
                    onDeviceMove?.(device.id, device.position.x, maxY);
                });
                break;
            }
            case 'distribute-h': {
                const sortedByX = [...devicesToAlign].sort((a, b) => a.position.x - b.position.x);
                const minX = sortedByX[0].position.x;
                const maxX = sortedByX[sortedByX.length - 1].position.x;
                const spacing = (maxX - minX) / (sortedByX.length - 1);
                sortedByX.forEach((device, index) => {
                    onDeviceMove?.(device.id, minX + spacing * index, device.position.y);
                });
                break;
            }
            case 'distribute-v': {
                const sortedByY = [...devicesToAlign].sort((a, b) => a.position.y - b.position.y);
                const minY = sortedByY[0].position.y;
                const maxY = sortedByY[sortedByY.length - 1].position.y;
                const spacing = (maxY - minY) / (sortedByY.length - 1);
                sortedByY.forEach((device, index) => {
                    onDeviceMove?.(device.id, device.position.x, minY + spacing * index);
                });
                break;
            }
        }

        onDevicesAlign?.(deviceIds, alignmentType);
    };

    // Draw grid
    const drawGrid = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!showGrid) return;

            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;

            const gridSpacing = gridSize * currentZoom;

            // Draw vertical lines
            for (let x = panX % gridSpacing; x < width; x += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }

            // Draw horizontal lines
            for (let y = panY % gridSpacing; y < height; y += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        },
        [showGrid, gridSize, currentZoom, panX, panY, width, height]
    );

    // Draw devices
    const drawDevices = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            devices.forEach((device) => {
                const x = device.position.x * currentZoom + panX;
                const y = device.position.y * currentZoom + panY;
                const size = DEVICE_SIZE * currentZoom;

                // Draw device background
                const isSelected = selectedDeviceIds.includes(device.id);
                ctx.fillStyle = isSelected ? '#3b82f6' : '#f3f4f6';
                ctx.strokeStyle = isSelected ? '#1e40af' : '#d1d5db';
                ctx.lineWidth = isSelected ? 3 : 2;

                ctx.fillRect(x - size / 2, y - size / 2, size, size);
                ctx.strokeRect(x - size / 2, y - size / 2, size, size);

                // Draw device status indicator
                const statusColor = device.status === 'online' ? '#10b981' : '#ef4444';
                ctx.fillStyle = statusColor;
                ctx.beginPath();
                ctx.arc(x + size / 2 - 5, y - size / 2 + 5, 4, 0, Math.PI * 2);
                ctx.fill();

                // Draw device label
                ctx.fillStyle = '#1f2937';
                ctx.font = `${12 * currentZoom}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(device.name, x, y);
            });
        },
        [devices, selectedDeviceIds, currentZoom, panX, panY]
    );

    // Connection type colors
    const CONNECTION_COLORS: Record<ConnectionType, string> = {
        ethernet: '#3b82f6',   // Blue
        wireless: '#10b981', // Green
        serial: '#f59e0b',     // Amber
    };

    // Draw connections with enhanced visualization
    const drawConnections = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            connections.forEach((connection) => {
                const sourceDevice = devices.find((d) => d.id === connection.sourceDeviceId);
                const targetDevice = devices.find((d) => d.id === connection.targetDeviceId);

                if (!sourceDevice || !targetDevice) return;

                // Get port positions for more accurate connection lines
                const sourcePos = connection.sourcePortId
                    ? getPortPosition(sourceDevice, connection.sourcePortId)
                    : sourceDevice.position;
                const targetPos = connection.targetPortId
                    ? getPortPosition(targetDevice, connection.targetPortId)
                    : targetDevice.position;

                const x1 = sourcePos.x * currentZoom + panX;
                const y1 = sourcePos.y * currentZoom + panY;
                const x2 = targetPos.x * currentZoom + panX;
                const y2 = targetPos.y * currentZoom + panY;

                const isSelected = selectedConnectionIds.includes(connection.id);
                const isHovered = hoveredConnectionId === connection.id;
                const isActive = connection.status === 'active';

                // Draw connection line based on type
                ctx.lineWidth = isSelected || isHovered ? 4 : 2;

                if (connection.type === 'wireless') {
                    // Draw wireless connection with dashed line
                    ctx.strokeStyle = isActive ? CONNECTION_COLORS.wireless : '#9ca3af';
                    ctx.setLineDash([8, 4]);
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Draw wireless signal icon at midpoint
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    ctx.fillStyle = CONNECTION_COLORS.wireless;
                    ctx.beginPath();
                    ctx.arc(midX, midY, 4 * currentZoom, 0, Math.PI * 2);
                    ctx.fill();
                } else if (connection.type === 'serial') {
                    // Draw serial connection with dotted line
                    ctx.strokeStyle = isActive ? CONNECTION_COLORS.serial : '#9ca3af';
                    ctx.setLineDash([2, 3]);
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                } else {
                    // Ethernet - solid line
                    ctx.strokeStyle = isActive ? CONNECTION_COLORS.ethernet : '#9ca3af';
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }

                // Draw glow effect for selected/hovered connections
                if (isSelected || isHovered) {
                    ctx.save();
                    ctx.strokeStyle = isSelected ? '#f59e0b' : '#60a5fa';
                    ctx.lineWidth = isSelected ? 6 : 4;
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    ctx.restore();
                }

                // Draw activity indicator for active connections
                if (isActive && (isSelected || isHovered)) {
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    ctx.fillStyle = '#10b981';
                    ctx.beginPath();
                    ctx.arc(midX, midY, 3 * currentZoom, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        },
        [connections, devices, currentZoom, panX, panY, selectedConnectionIds, hoveredConnectionId]
    );

    // Draw drag preview
    const drawDragPreview = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!dragPreviewPos || !draggedDeviceId) return;

            const draggedDevice = devices.find((d) => d.id === draggedDeviceId);
            if (!draggedDevice) return;

            const x = dragPreviewPos.x * currentZoom + panX;
            const y = dragPreviewPos.y * currentZoom + panY;
            const size = DEVICE_SIZE * currentZoom;

            // Draw semi-transparent preview
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#3b82f6';
            ctx.strokeStyle = '#1e40af';
            ctx.lineWidth = 2;
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
            ctx.strokeRect(x - size / 2, y - size / 2, size, size);
            ctx.globalAlpha = 1;

            // Draw line from original to preview
            const origX = draggedDevice.position.x * currentZoom + panX;
            const origY = draggedDevice.position.y * currentZoom + panY;
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(origX, origY);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.setLineDash([]);
        },
        [dragPreviewPos, draggedDeviceId, devices, currentZoom, panX, panY]
    );

    // Draw selection rectangle
    const drawSelectionRect = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!isRectSelecting || !rectSelectStart || !rectSelectEnd) return;

            const x1 = rectSelectStart.x * currentZoom + panX;
            const y1 = rectSelectStart.y * currentZoom + panY;
            const x2 = rectSelectEnd.x * currentZoom + panX;
            const y2 = rectSelectEnd.y * currentZoom + panY;

            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
            ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        },
        [isRectSelecting, rectSelectStart, rectSelectEnd, currentZoom, panX, panY]
    );

    // Draw connection preview while dragging
    const drawConnectionPreview = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            if (!isDrawingConnection || !connectionSourceDeviceId || !connectionPreviewEnd) return;

            const sourceDevice = devices.find(d => d.id === connectionSourceDeviceId);
            if (!sourceDevice) return;

            const sourcePos = connectionSourcePortId
                ? getPortPosition(sourceDevice, connectionSourcePortId)
                : sourceDevice.position;

            const x1 = sourcePos.x * currentZoom + panX;
            const y1 = sourcePos.y * currentZoom + panY;
            const x2 = connectionPreviewEnd.x * currentZoom + panX;
            const y2 = connectionPreviewEnd.y * currentZoom + panY;

            // Check if hovering over valid target port
            const targetPortInfo = getPortAtPosition(
                x2 * currentZoom + panX + (canvasRef.current?.getBoundingClientRect().left ?? 0),
                y2 * currentZoom + panY + (canvasRef.current?.getBoundingClientRect().top ?? 0)
            );

            let isValidTarget = false;
            if (targetPortInfo && connectionSourcePortId) {
                const sourcePort = sourceDevice.ports?.find(p => p.id === connectionSourcePortId);
                if (sourcePort) {
                    const validation = validateConnection(sourceDevice, sourcePort, targetPortInfo.device, targetPortInfo.port);
                    isValidTarget = validation.valid;
                }
            }

            // Draw preview line with appropriate color
            ctx.strokeStyle = isValidTarget ? '#10b981' : '#f59e0b'; // Green for valid, amber for pending
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw source indicator
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(x1, y1, 6 * currentZoom, 0, Math.PI * 2);
            ctx.fill();

            // Draw target indicator
            if (isValidTarget) {
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(x2, y2, 6 * currentZoom, 0, Math.PI * 2);
                ctx.fill();

                // Draw valid target feedback
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x2, y2, 10 * currentZoom, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(x2, y2, 4 * currentZoom, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        [isDrawingConnection, connectionSourceDeviceId, connectionSourcePortId, connectionPreviewEnd, devices, currentZoom, panX, panY]
    );

    // Draw device ports
    const drawPorts = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            devices.forEach(device => {
                if (!device.ports) return;

                device.ports.forEach(port => {
                    const pos = getPortPosition(device, port.id);
                    const x = pos.x * currentZoom + panX;
                    const y = pos.y * currentZoom + panY;
                    const size = PORT_SIZE * currentZoom;

                    // Port background
                    ctx.fillStyle = port.status === 'connected' ? '#3b82f6' : '#f3f4f6';
                    ctx.strokeStyle = port.status === 'connected' ? '#1e40af' : '#9ca3af';
                    ctx.lineWidth = 1;

                    ctx.beginPath();
                    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Port label (small)
                    ctx.fillStyle = '#6b7280';
                    ctx.font = `${8 * currentZoom}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(port.id, x, y - size);
                });
            });
        },
        [devices, currentZoom, panX, panY]
    );

    // Main canvas draw function
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw grid, connections, devices, ports, drag preview, connection preview, and selection rect
        drawGrid(ctx);
        drawConnections(ctx);
        drawDevices(ctx);
        drawPorts(ctx);
        drawDragPreview(ctx);
        drawConnectionPreview(ctx);
        drawSelectionRect(ctx);
    }, [drawGrid, drawConnections, drawDevices, drawPorts, drawDragPreview, drawConnectionPreview, drawSelectionRect, width, height]);

    // Handle mouse wheel zoom
    const handleWheel = useCallback(
        (e: WheelEvent) => {
            e.preventDefault();

            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.5, Math.min(3, currentZoom * delta));

            setCurrentZoom(newZoom);
            onZoomChange?.(newZoom);
        },
        [currentZoom, onZoomChange]
    );

    // Handle mouse down - device drag, pan, or connection drawing
    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const screenX = e.clientX;
            const screenY = e.clientY;
            const canvasX = (screenX - rect.left - panX) / currentZoom;
            const canvasY = (screenY - rect.top - panY) / currentZoom;

            if (e.button === 2 || e.button === 1) {
                // Right-click or middle-click for pan
                setIsPanning(true);
                setDragStart({ x: screenX, y: screenY });
            } else if (e.button === 0) {
                // Check for Alt/Option key to start connection drawing
                if (e.altKey) {
                    const portInfo = getPortAtPosition(screenX, screenY);
                    if (portInfo && portInfo.port.status !== 'connected') {
                        setIsDrawingConnection(true);
                        setConnectionSourceDeviceId(portInfo.device.id);
                        setConnectionSourcePortId(portInfo.port.id);
                        setConnectionPreviewEnd({ x: canvasX, y: canvasY });
                        return;
                    }
                }

                // Left-click for device selection or drag
                const clickedDevice = getDeviceAtPosition(screenX, screenY);

                if (clickedDevice) {
                    // Check if shift key is pressed for multi-select
                    if (e.shiftKey) {
                        if (selectedDeviceIds.includes(clickedDevice.id)) {
                            onDeviceDeselect?.(clickedDevice.id);
                        } else {
                            onDeviceSelect?.(clickedDevice.id);
                        }
                    } else if (e.ctrlKey || e.metaKey) {
                        // Ctrl/Cmd for multi-select
                        if (selectedDeviceIds.includes(clickedDevice.id)) {
                            onDeviceDeselect?.(clickedDevice.id);
                        } else {
                            onDeviceSelect?.(clickedDevice.id);
                        }
                    } else {
                        // Single select
                        if (!selectedDeviceIds.includes(clickedDevice.id)) {
                            // Deselect all others first
                            selectedDeviceIds.forEach((id) => {
                                if (id !== clickedDevice.id) {
                                    onDeviceDeselect?.(id);
                                }
                            });
                            onDeviceSelect?.(clickedDevice.id);
                        }
                    }

                    // Start drag
                    setIsDraggingDevice(true);
                    setDraggedDeviceId(clickedDevice.id);
                    setDragStart({ x: canvasX, y: canvasY });
                } else {
                    // Check if clicking on a connection line
                    const clickedConnection = getConnectionAtPosition(canvasX, canvasY);
                    if (clickedConnection) {
                        onConnectionSelect?.(clickedConnection.id);
                    } else {
                        // Start rectangle selection
                        setIsRectSelecting(true);
                        setRectSelectStart({ x: canvasX, y: canvasY });
                        setRectSelectEnd({ x: canvasX, y: canvasY });
                    }
                }
            }
        },
        [selectedDeviceIds, currentZoom, panX, panY, onDeviceSelect, onDeviceDeselect, onConnectionSelect, getDeviceAtPosition, getPortAtPosition]
    );

    // Helper: Get connection at position
    function getConnectionAtPosition(canvasX: number, canvasY: number): Connection | undefined {
        const hitRadius = 10 / currentZoom;

        for (const connection of connections) {
            const sourceDevice = devices.find(d => d.id === connection.sourceDeviceId);
            const targetDevice = devices.find(d => d.id === connection.targetDeviceId);
            if (!sourceDevice || !targetDevice) continue;

            const sourcePos = connection.sourcePortId
                ? getPortPosition(sourceDevice, connection.sourcePortId)
                : sourceDevice.position;
            const targetPos = connection.targetPortId
                ? getPortPosition(targetDevice, connection.targetPortId)
                : targetDevice.position;

            // Check distance to line segment
            const distance = pointToLineDistance(
                canvasX, canvasY,
                sourcePos.x, sourcePos.y,
                targetPos.x, targetPos.y
            );

            if (distance < hitRadius) {
                return connection;
            }
        }
        return undefined;
    };

    // Helper: Calculate distance from point to line segment
    const pointToLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // Handle mouse move - pan, drag, or connection preview
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const screenX = e.clientX;
            const screenY = e.clientY;
            const canvasX = (screenX - rect.left - panX) / currentZoom;
            const canvasY = (screenY - rect.top - panY) / currentZoom;

            // Update hover state for connections
            if (!isPanning && !isDraggingDevice && !isDrawingConnection && !isRectSelecting) {
                const hoveredConnection = getConnectionAtPosition(canvasX, canvasY);
                setHoveredConnectionId(hoveredConnection?.id ?? null);
            }

            if (isPanning) {
                const deltaX = screenX - dragStart.x;
                const deltaY = screenY - dragStart.y;

                setPanX((prev) => prev + deltaX);
                setPanY((prev) => prev + deltaY);

                setDragStart({ x: screenX, y: screenY });
            } else if (isDraggingDevice && draggedDeviceId) {
                // Update drag preview position
                let previewX = canvasX;
                let previewY = canvasY;

                // Apply grid snapping
                if (enableGridSnapping) {
                    previewX = snapToGrid(previewX);
                    previewY = snapToGrid(previewY);
                }

                // Check bounds
                if (!isWithinBounds(previewX, previewY)) {
                    // Clamp to bounds
                    previewX = Math.max(canvasBounds.minX + DEVICE_RADIUS, Math.min(canvasBounds.maxX - DEVICE_RADIUS, previewX));
                    previewY = Math.max(canvasBounds.minY + DEVICE_RADIUS, Math.min(canvasBounds.maxY - DEVICE_RADIUS, previewY));
                }

                // Check collision
                if (checkCollision(previewX, previewY, draggedDeviceId)) {
                    // Show collision feedback (red preview)
                    setDragPreviewPos({ x: previewX, y: previewY });
                } else {
                    setDragPreviewPos({ x: previewX, y: previewY });
                }
            } else if (isDrawingConnection && connectionSourceDeviceId) {
                // Update connection preview end position
                setConnectionPreviewEnd({ x: canvasX, y: canvasY });
            } else if (isRectSelecting && rectSelectStart) {
                setRectSelectEnd({ x: canvasX, y: canvasY });
            }
        },
        [isPanning, isDraggingDevice, isDrawingConnection, isRectSelecting, dragStart, draggedDeviceId, rectSelectStart, currentZoom, panX, panY, enableGridSnapping, enableCollisionDetection, canvasBounds, connectionSourceDeviceId]
    );

    // Handle mouse up - finish drag, pan, or connection
    const handleMouseUp = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const screenX = e.clientX;
            const screenY = e.clientY;
            const canvasX = (screenX - rect.left - panX) / currentZoom;
            const canvasY = (screenY - rect.top - panY) / currentZoom;

            if (isPanning) {
                setIsPanning(false);
            } else if (isDraggingDevice && draggedDeviceId && dragPreviewPos) {
                // Finalize device position
                let finalX = dragPreviewPos.x;
                let finalY = dragPreviewPos.y;

                // Apply grid snapping
                if (enableGridSnapping) {
                    finalX = snapToGrid(finalX);
                    finalY = snapToGrid(finalY);
                }

                // Check bounds
                if (isWithinBounds(finalX, finalY) && !checkCollision(finalX, finalY, draggedDeviceId)) {
                    // Valid position - move device
                    if (selectedDeviceIds.length > 1) {
                        // Move all selected devices
                        const draggedDevice = devices.find((d) => d.id === draggedDeviceId);
                        if (draggedDevice) {
                            const deltaX = finalX - draggedDevice.position.x;
                            const deltaY = finalY - draggedDevice.position.y;
                            onMultipleDevicesMove?.(selectedDeviceIds, deltaX, deltaY);
                        }
                    } else {
                        // Move single device
                        onDeviceMove?.(draggedDeviceId, finalX, finalY);
                    }
                }

                setIsDraggingDevice(false);
                setDraggedDeviceId(null);
                setDragPreviewPos(null);
            } else if (isDrawingConnection && connectionSourceDeviceId && connectionSourcePortId) {
                // Finalize connection creation
                const targetPortInfo = getPortAtPosition(screenX, screenY);

                if (targetPortInfo) {
                    const sourceDevice = devices.find(d => d.id === connectionSourceDeviceId);
                    if (sourceDevice) {
                        const sourcePort = sourceDevice.ports?.find(p => p.id === connectionSourcePortId);
                        if (sourcePort) {
                            const validation = validateConnection(sourceDevice, sourcePort, targetPortInfo.device, targetPortInfo.port);
                            if (validation.valid) {
                                // Create connection
                                onConnectionCreate?.(
                                    connectionSourceDeviceId,
                                    connectionSourcePortId,
                                    targetPortInfo.device.id,
                                    targetPortInfo.port.id,
                                    connectionType
                                );
                            }
                        }
                    }
                }

                setIsDrawingConnection(false);
                setConnectionSourceDeviceId(null);
                setConnectionSourcePortId(null);
                setConnectionPreviewEnd(null);
            } else if (isRectSelecting && rectSelectStart && rectSelectEnd) {
                // Finish rectangle selection
                const selectedDevices = getDevicesInRect(rectSelectStart.x, rectSelectStart.y, rectSelectEnd.x, rectSelectEnd.y);

                // Clear previous selection
                selectedDeviceIds.forEach((id) => {
                    if (!selectedDevices.some((d) => d.id === id)) {
                        onDeviceDeselect?.(id);
                    }
                });

                // Select new devices
                selectedDevices.forEach((device) => {
                    if (!selectedDeviceIds.includes(device.id)) {
                        onDeviceSelect?.(device.id);
                    }
                });

                setIsRectSelecting(false);
                setRectSelectStart(null);
                setRectSelectEnd(null);
            } else if (!isDraggingDevice && !isPanning && !isRectSelecting && !isDrawingConnection) {
                // Canvas click
                onCanvasClick?.(canvasX, canvasY);
            }
        },
        [
            isPanning,
            isDraggingDevice,
            isRectSelecting,
            isDrawingConnection,
            draggedDeviceId,
            dragPreviewPos,
            rectSelectStart,
            rectSelectEnd,
            selectedDeviceIds,
            currentZoom,
            panX,
            panY,
            devices,
            connectionSourceDeviceId,
            connectionSourcePortId,
            connectionType,
            enableGridSnapping,
            enableCollisionDetection,
            canvasBounds,
            onDeviceMove,
            onMultipleDevicesMove,
            onConnectionCreate,
            onDeviceSelect,
            onDeviceDeselect,
            onCanvasClick,
            getDevicesInRect,
            getPortAtPosition,
            validateConnection,
        ]
    );

    // Handle keyboard events for connection deletion and shortcuts
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Delete selected connections
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnectionIds.length > 0) {
                e.preventDefault();
                selectedConnectionIds.forEach(id => {
                    onConnectionDelete?.(id);
                });
            }

            // Escape to cancel connection drawing
            if (e.key === 'Escape' && isDrawingConnection) {
                setIsDrawingConnection(false);
                setConnectionSourceDeviceId(null);
                setConnectionSourcePortId(null);
                setConnectionPreviewEnd(null);
            }

            // Change connection type with number keys
            if (isDrawingConnection) {
                if (e.key === '1') setConnectionType('ethernet');
                if (e.key === '2') setConnectionType('wireless');
                if (e.key === '3') setConnectionType('serial');
            }
        },
        [selectedConnectionIds, isDrawingConnection, onConnectionDelete]
    );

    // Attach event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleWheel, handleKeyDown]);

    return (
        <Card className={`w-full ${className}`}>
            <CardContent className="p-0">
                <div ref={containerRef} className="relative overflow-hidden rounded-lg">
                    <canvas
                        ref={canvasRef}
                        width={width}
                        height={height}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onContextMenu={(e) => e.preventDefault()}
                        className="cursor-grab active:cursor-grabbing border border-gray-200"
                    />
                    {/* Zoom indicator */}
                    <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded text-xs text-gray-600 border border-gray-200">
                        {Math.round(currentZoom * 100)}%
                    </div>

                    {/* Connection type selector - visible when drawing connection */}
                    {isDrawingConnection && (
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white rounded shadow-lg border border-gray-200 p-2 flex gap-2 items-center">
                            <span className="text-xs text-gray-500 font-medium">Connection Type:</span>
                            <button
                                onClick={() => setConnectionType('ethernet')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${connectionType === 'ethernet'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                title="Ethernet (1)"
                            >
                                🔌 Ethernet (1)
                            </button>
                            <button
                                onClick={() => setConnectionType('wireless')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${connectionType === 'wireless'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                title="Wireless (2)"
                            >
                                📡 Wireless (2)
                            </button>
                            <button
                                onClick={() => setConnectionType('serial')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${connectionType === 'serial'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                title="Serial (3)"
                            >
                                🔗 Serial (3)
                            </button>
                            <div className="border-l border-gray-300 ml-1" />
                            <button
                                onClick={() => {
                                    setIsDrawingConnection(false);
                                    setConnectionSourceDeviceId(null);
                                    setConnectionSourcePortId(null);
                                    setConnectionPreviewEnd(null);
                                }}
                                className="px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50"
                                title="Cancel (Esc)"
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    )}

                    {/* Connection drawing hint */}
                    {isDrawingConnection && (
                        <div className="absolute bottom-2 left-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs border border-blue-300 max-w-xs">
                            <div className="font-medium">Drawing Connection...</div>
                            <div className="text-blue-600 text-[10px] mt-0.5">
                                Drag to target port • Press 1-3 to change type • Esc to cancel
                            </div>
                        </div>
                    )}

                    {/* Selected connection info */}
                    {selectedConnectionIds.length > 0 && !isDrawingConnection && (
                        <div className="absolute top-2 right-2 bg-white rounded shadow-lg border border-gray-200 p-2">
                            <div className="text-xs text-gray-600">
                                {selectedConnectionIds.length} connection{selectedConnectionIds.length > 1 ? 's' : ''} selected
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">
                                Press Delete to remove
                            </div>
                        </div>
                    )}

                    {/* Alignment tools - visible when multiple devices selected */}
                    {selectedDeviceIds.length > 1 && (
                        <div className="absolute top-2 left-2 bg-white rounded shadow-lg border border-gray-200 p-2 flex gap-1">
                            <button
                                onClick={() => alignDevices(selectedDeviceIds, 'left')}
                                className="p-1 hover:bg-gray-100 rounded text-xs"
                                title="Align Left"
                            >
                                ⬅️
                            </button>
                            <button
                                onClick={() => alignDevices(selectedDeviceIds, 'center')}
                                className="p-1 hover:bg-gray-100 rounded text-xs"
                                title="Align Center"
                            >
                                ↔️
                            </button>
                            <button
                                onClick={() => alignDevices(selectedDeviceIds, 'right')}
                                className="p-1 hover:bg-gray-100 rounded text-xs"
                                title="Align Right"
                            >
                                ➡️
                            </button>
                            <div className="border-l border-gray-300" />
                            <button
                                onClick={() => alignDevices(selectedDeviceIds, 'top')}
                                className="p-1 hover:bg-gray-100 rounded text-xs"
                                title="Align Top"
                            >
                                ⬆️
                            </button>
                            <button
                                onClick={() => alignDevices(selectedDeviceIds, 'middle')}
                                className="p-1 hover:bg-gray-100 rounded text-xs"
                                title="Align Middle"
                            >
                                ↕️
                            </button>
                            <button
                                onClick={() => alignDevices(selectedDeviceIds, 'bottom')}
                                className="p-1 hover:bg-gray-100 rounded text-xs"
                                title="Align Bottom"
                            >
                                ⬇️
                            </button>
                            <div className="border-l border-gray-300" />
                            <button
                                onClick={() => alignDevices(selectedDeviceIds, 'distribute-h')}
                                className="p-1 hover:bg-gray-100 rounded text-xs"
                                title="Distribute Horizontally"
                            >
                                ⊟
                            </button>
                            <button
                                onClick={() => alignDevices(selectedDeviceIds, 'distribute-v')}
                                className="p-1 hover:bg-gray-100 rounded text-xs"
                                title="Distribute Vertically"
                            >
                                ⊞
                            </button>
                        </div>
                    )}

                    {/* Drag hint */}
                    {isDraggingDevice && dragPreviewPos && (
                        <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs border border-blue-300">
                            Dragging... Release to place
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
