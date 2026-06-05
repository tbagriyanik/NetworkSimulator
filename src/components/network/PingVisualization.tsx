/**
 * Ping Visualization System
 * Provides animated packet visualization along network paths
 *
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { DeviceConfig, Connection } from '@/types/ui-ux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================================
// Types
// ============================================================================

export interface PingResult {
    id: string;
    sourceDeviceId: string;
    targetDeviceId: string;
    success: boolean;
    responseTime: number; // in ms
    ttl: number;
    packetSize: number;
    timestamp: Date;
    path: string[]; // Device IDs in the path
    errorMessage?: string;
}

export interface PingAnimationState {
    isAnimating: boolean;
    progress: number; // 0-100
    currentHop: number;
    packetPosition: { x: number; y: number };
}

export interface PingVisualizationProps {
    devices: DeviceConfig[];
    connections: Connection[];
    onPingStart?: (sourceId: string, targetId: string) => void;
    onPingComplete?: (result: PingResult) => void;
    className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate shortest path between two devices using Dijkstra's algorithm
 */
export const calculatePath = (
    sourceId: string,
    targetId: string,
    devices: DeviceConfig[],
    connections: Connection[]
): string[] => {
    if (sourceId === targetId) return [sourceId];

    // Build adjacency list
    const adjacency = new Map<string, string[]>();

    devices.forEach(device => {
        adjacency.set(device.id, []);
    });

    connections.forEach(conn => {
        if (conn.status === 'active') {
            const sourceNeighbors = adjacency.get(conn.sourceDeviceId) || [];
            const targetNeighbors = adjacency.get(conn.targetDeviceId) || [];

            if (!sourceNeighbors.includes(conn.targetDeviceId)) {
                sourceNeighbors.push(conn.targetDeviceId);
            }
            if (!targetNeighbors.includes(conn.sourceDeviceId)) {
                targetNeighbors.push(conn.sourceDeviceId);
            }

            adjacency.set(conn.sourceDeviceId, sourceNeighbors);
            adjacency.set(conn.targetDeviceId, targetNeighbors);
        }
    });

    // Dijkstra's algorithm
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    devices.forEach(device => {
        distances.set(device.id, device.id === sourceId ? 0 : Infinity);
        previous.set(device.id, null);
        unvisited.add(device.id);
    });

    while (unvisited.size > 0) {
        // Find unvisited node with minimum distance
        let current: string | null = null;
        let minDistance = Infinity;

        for (const node of unvisited) {
            const dist = distances.get(node) || Infinity;
            if (dist < minDistance) {
                minDistance = dist;
                current = node;
            }
        }

        if (current === null || minDistance === Infinity) break;
        if (current === targetId) break;

        unvisited.delete(current);

        // Update distances to neighbors
        const neighbors = adjacency.get(current) || [];
        for (const neighbor of neighbors) {
            if (unvisited.has(neighbor)) {
                const alt = minDistance + 1; // Each hop costs 1
                if (alt < (distances.get(neighbor) || Infinity)) {
                    distances.set(neighbor, alt);
                    previous.set(neighbor, current);
                }
            }
        }
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = targetId;

    while (current !== null) {
        path.unshift(current);
        current = previous.get(current) || null;
    }

    // If path doesn't start with source, no valid path exists
    if (path[0] !== sourceId) {
        return [];
    }

    return path;
};

/**
 * Simulate ping response with realistic timing
 */
const simulatePing = (
    sourceId: string,
    targetId: string,
    path: string[],
    devices: DeviceConfig[]
): PingResult => {
    const targetDevice = devices.find(d => d.id === targetId);

    // Check if target is offline
    if (targetDevice?.status === 'offline') {
        return {
            id: `ping-${Date.now()}`,
            sourceDeviceId: sourceId,
            targetDeviceId: targetId,
            success: false,
            responseTime: 0,
            ttl: 0,
            packetSize: 32,
            timestamp: new Date(),
            path,
            errorMessage: 'Destination host unreachable',
        };
    }

    // No path found
    if (path.length === 0) {
        return {
            id: `ping-${Date.now()}`,
            sourceDeviceId: sourceId,
            targetDeviceId: targetId,
            success: false,
            responseTime: 0,
            ttl: 0,
            packetSize: 32,
            timestamp: new Date(),
            path: [],
            errorMessage: 'Request timed out',
        };
    }

    // Calculate realistic response time based on path length
    const baseLatency = 1; // 1ms per hop
    const randomVariance = Math.random() * 5; // 0-5ms random variance
    const responseTime = (path.length * baseLatency) + randomVariance;

    // TTL based on path length (typical starting TTL is 64)
    const ttl = Math.max(1, 64 - path.length);

    return {
        id: `ping-${Date.now()}`,
        sourceDeviceId: sourceId,
        targetDeviceId: targetId,
        success: true,
        responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimals
        ttl,
        packetSize: 32,
        timestamp: new Date(),
        path,
    };
};

// ============================================================================
// Components
// ============================================================================

interface PingAnimationProps {
    devices: DeviceConfig[];
    path: string[];
    isPlaying: boolean;
    onComplete?: () => void;
    packetColor?: string;
}

export const PingAnimation: React.FC<PingAnimationProps> = ({
    devices,
    path,
    isPlaying,
    onComplete,
    packetColor = '#3b82f6',
}) => {
    const [progress, setProgress] = useState(0);
    const [packetPosition, setPacketPosition] = useState({ x: 0, y: 0 });
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isPlaying || path.length < 2) {
            setProgress(0);
            return;
        }

        const startTime = Date.now();
        const duration = 2000; // 2 seconds for full animation

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(newProgress);

            // Calculate packet position along the path
            const totalHops = path.length - 1;
            const progressPerHop = 100 / totalHops;
            const currentHopIndex = Math.min(Math.floor(newProgress / progressPerHop), totalHops);
            const hopProgress = (newProgress % progressPerHop) / progressPerHop;

            const sourceDevice = devices.find(d => d.id === path[currentHopIndex]);
            const targetDevice = devices.find(d => d.id === path[currentHopIndex + 1]);

            if (sourceDevice && targetDevice) {
                const x = sourceDevice.position.x + (targetDevice.position.x - sourceDevice.position.x) * hopProgress;
                const y = sourceDevice.position.y + (targetDevice.position.y - sourceDevice.position.y) * hopProgress;
                setPacketPosition({ x, y });
            }

            if (newProgress < 100) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                onComplete?.();
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, path, devices, onComplete]);

    if (!isPlaying || path.length < 2) return null;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Progress bar */}
            <div className="absolute top-4 left-4 right-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-500 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Packet indicator */}
            <div
                className="absolute w-4 h-4 rounded-full shadow-lg z-50"
                style={{
                    left: packetPosition.x,
                    top: packetPosition.y,
                    backgroundColor: packetColor,
                    boxShadow: `0 0 10px ${packetColor}`,
                    transform: 'translate(-50%, -50%)',
                }}
            />

            {/* Path highlight */}
            {path.map((deviceId, index) => {
                if (index === path.length - 1) return null;
                const source = devices.find(d => d.id === deviceId);
                const target = devices.find(d => d.id === path[index + 1]);
                if (!source || !target) return null;

                const isActive = progress >= (index / (path.length - 1)) * 100;

                return (
                    <svg
                        key={`path-${index}`}
                        className="absolute inset-0 w-full h-full"
                        style={{ pointerEvents: 'none' }}
                    >
                        <line
                            x1={source.position.x}
                            y1={source.position.y}
                            x2={target.position.x}
                            y2={target.position.y}
                            stroke={isActive ? packetColor : '#e5e7eb'}
                            strokeWidth={isActive ? 3 : 1}
                            strokeDasharray={isActive ? 'none' : '5,5'}
                            className="transition-all duration-300"
                        />
                    </svg>
                );
            })}
        </div>
    );
};

interface PingResultPanelProps {
    results: PingResult[];
    devices: DeviceConfig[];
    onClear?: () => void;
}

export const PingResultPanel: React.FC<PingResultPanelProps> = ({
    results,
    devices,
    onClear,
}) => {
    const { language } = useLanguage();

    const getDeviceName = (deviceId: string) => {
        return devices.find(d => d.id === deviceId)?.name || deviceId;
    };

    const stats = {
        sent: results.length,
        received: results.filter(r => r.success).length,
        lost: results.filter(r => !r.success).length,
        avgTime: results.filter(r => r.success).reduce((sum, r) => sum + r.responseTime, 0) /
            (results.filter(r => r.success).length || 1),
        minTime: Math.min(...results.filter(r => r.success).map(r => r.responseTime) || [0]),
        maxTime: Math.max(...results.filter(r => r.success).map(r => r.responseTime) || [0]),
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{language === 'tr' ? 'Ping Sonuçları' : 'Ping Results'}</CardTitle>
                    {results.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={onClear}>
                            {language === 'tr' ? 'Temizle' : 'Clear'}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {results.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">
                        {language === 'tr' ? 'Henüz ping sonucu yok. Ping göndererek sonuçları görün.' : 'No ping results yet. Start a ping to see results.'}
                    </div>
                ) : (
                    <>
                        {/* Statistics */}
                        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                            <div className="bg-blue-50 rounded p-2">
                                <div className="text-lg font-semibold text-blue-600">
                                    {stats.sent}
                                </div>
                                <div className="text-xs text-blue-500">{language === 'tr' ? 'Gönderilen' : 'Sent'}</div>
                            </div>
                            <div className="bg-green-50 rounded p-2">
                                <div className="text-lg font-semibold text-green-600">
                                    {stats.received}
                                </div>
                                <div className="text-xs text-green-500">{language === 'tr' ? 'Alınan' : 'Received'}</div>
                            </div>
                            <div className="bg-red-50 rounded p-2">
                                <div className="text-lg font-semibold text-red-600">
                                    {stats.lost}
                                </div>
                                <div className="text-xs text-red-500">{language === 'tr' ? 'Kayıp' : 'Lost'}</div>
                            </div>
                        </div>

                        {stats.received > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-4 text-center text-xs">
                                <div>
                                    <span className="text-gray-500">{language === 'tr' ? 'Ort:' : 'Avg:'}</span>{' '}
                                    <span className="font-medium">{stats.avgTime.toFixed(1)}ms</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{language === 'tr' ? 'Min:' : 'Min:'}</span>{' '}
                                    <span className="font-medium">{stats.minTime.toFixed(1)}ms</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{language === 'tr' ? 'Maks:' : 'Max:'}</span>{' '}
                                    <span className="font-medium">{stats.maxTime.toFixed(1)}ms</span>
                                </div>
                            </div>
                        )}

                        {/* Result list */}
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {results.slice(-10).reverse().map((result) => (
                                <div
                                    key={result.id}
                                    className={`flex items-center justify-between p-2 rounded text-sm ${
                                        result.success
                                            ? 'bg-green-50 border border-green-200'
                                            : 'bg-red-50 border border-red-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`w-2 h-2 rounded-full ${
                                                result.success ? 'bg-green-500' : 'bg-red-500'
                                            }`}
                                        />
                                        <span className="text-xs text-gray-600">
                                            {getDeviceName(result.sourceDeviceId)} →{' '}
                                            {getDeviceName(result.targetDeviceId)}
                                        </span>
                                    </div>
                                    <div className="text-xs">
                                        {result.success ? (
                                            <span className="text-green-600 font-medium">
                                                {result.responseTime.toFixed(1)}ms
                                            </span>
                                        ) : (
                                            <span className="text-red-600">
                                                {result.errorMessage || (language === 'tr' ? 'Başarısız' : 'Failed')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

interface PingPacketInfoProps {
    result: PingResult | null;
    devices: DeviceConfig[];
}

export const PingPacketInfo: React.FC<PingPacketInfoProps> = ({
    result,
    devices,
}) => {
    const { language } = useLanguage();

    if (!result) {
        return (
            <Card className="w-full">
                <CardContent className="p-4">
                    <div className="text-sm text-gray-500 text-center">
                        {language === 'tr' ? 'Paket detaylarını görmek için bir ping sonucu seçin' : 'Select a ping result to view packet details'}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getDeviceName = (deviceId: string) => {
        return devices.find(d => d.id === deviceId)?.name || deviceId;
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">{language === 'tr' ? 'Paket Bilgisi' : 'Packet Information'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">{language === 'tr' ? 'Kaynak:' : 'Source:'}</div>
                    <div className="font-medium">{getDeviceName(result.sourceDeviceId)}</div>

                    <div className="text-gray-500">{language === 'tr' ? 'Hedef:' : 'Target:'}</div>
                    <div className="font-medium">{getDeviceName(result.targetDeviceId)}</div>

                    <div className="text-gray-500">{language === 'tr' ? 'Durum:' : 'Status:'}</div>
                    <div className={result.success ? 'text-green-600' : 'text-red-600'}>
                        {result.success ? (language === 'tr' ? '✓ Başarılı' : '✓ Success') : (language === 'tr' ? '✗ Başarısız' : '✗ Failed')}
                    </div>

                    {result.success && (
                        <>
                            <div className="text-gray-500">{language === 'tr' ? 'Yanıt Süresi:' : 'Response Time:'}</div>
                            <div className="font-medium">{result.responseTime.toFixed(2)} ms</div>

                            <div className="text-gray-500">TTL:</div>
                            <div className="font-medium">{result.ttl}</div>

                            <div className="text-gray-500">{language === 'tr' ? 'Paket Boyutu:' : 'Packet Size:'}</div>
                            <div className="font-medium">{result.packetSize} {language === 'tr' ? 'bayt' : (result.packetSize <= 1 ? 'byte' : 'bytes')}</div>
                        </>
                    )}

                    {result.path.length > 0 && (
                        <>
                            <div className="text-gray-500">{language === 'tr' ? 'Yol:' : 'Path:'}</div>
                            <div className="font-medium">{result.path.length} {language === 'tr' ? 'hop' : (result.path.length <= 1 ? 'hop' : 'hops')}</div>
                        </>
                    )}
                </div>

                {result.path.length > 0 && (
                    <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-1">{language === 'tr' ? 'Yönlendirme Yolu:' : 'Routing Path:'}</div>
                        <div className="flex flex-wrap items-center gap-1 text-xs">
                            {result.path.map((deviceId, index) => (
                                <React.Fragment key={deviceId}>
                                    <span className="px-2 py-1 bg-gray-100 rounded">
                                        {getDeviceName(deviceId)}
                                    </span>
                                    {index < result.path.length - 1 && (
                                        <span className="text-gray-400">→</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}

                {result.errorMessage && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-600">
                        {language === 'tr' ? 'Hata:' : 'Error:'} {result.errorMessage}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export const PingVisualization: React.FC<PingVisualizationProps> = ({
    devices,
    connections,
    onPingStart,
    onPingComplete,
    className = '',
}) => {
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [results, setResults] = useState<PingResult[]>([]);
    const [selectedResult, setSelectedResult] = useState<PingResult | null>(null);

    const handlePing = useCallback(() => {
        if (!selectedSource || !selectedTarget) return;

        onPingStart?.(selectedSource, selectedTarget);

        // Calculate path
        const path = calculatePath(selectedSource, selectedTarget, devices, connections);
        setCurrentPath(path);
        setIsAnimating(true);

        // Simulate ping after animation
        setTimeout(() => {
            const result = simulatePing(selectedSource, selectedTarget, path, devices);
            setResults(prev => [...prev, result]);
            setSelectedResult(result);
            setIsAnimating(false);
            onPingComplete?.(result);
        }, 2000);
    }, [selectedSource, selectedTarget, devices, connections, onPingStart, onPingComplete]);

    const clearResults = useCallback(() => {
        setResults([]);
        setSelectedResult(null);
    }, []);

    const onlineDevices = devices.filter(d => d.status === 'online');

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Ping Controls */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Icon name="activity" size={16} />
                        Ping Visualization
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Source Selection */}
                    <div className="space-y-1">
                        <label className="text-sm text-gray-600">Source Device</label>
                        <select
                            value={selectedSource || ''}
                            onChange={(e) => setSelectedSource(e.target.value || null)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            disabled={isAnimating}
                        >
                            <option value="">Select source device...</option>
                            {onlineDevices.map(device => (
                                <option key={device.id} value={device.id}>
                                    {device.name} ({device.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Target Selection */}
                    <div className="space-y-1">
                        <label className="text-sm text-gray-600">Target Device</label>
                        <select
                            value={selectedTarget || ''}
                            onChange={(e) => setSelectedTarget(e.target.value || null)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            disabled={isAnimating}
                        >
                            <option value="">Select target device...</option>
                            {devices.map(device => (
                                <option key={device.id} value={device.id}>
                                    {device.name} ({device.type}) {device.status === 'offline' && '- OFFLINE'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Ping Button */}
                    <Button
                        onClick={handlePing}
                        disabled={!selectedSource || !selectedTarget || isAnimating}
                        className="w-full"
                        variant={isAnimating ? 'outline' : 'default'}
                    >
                        {isAnimating ? (
                            <>
                                <Icon name="loader" size={16} className="animate-spin mr-2" />
                                Pinging...
                            </>
                        ) : (
                            <>
                                <Icon name="activity" size={16} className="mr-2" />
                                Start Ping
                            </>
                        )}
                    </Button>

                    {isAnimating && currentPath.length > 0 && (
                        <div className="text-xs text-blue-600">
                            Path: {currentPath.length} hops
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results Panel */}
            <PingResultPanel
                results={results}
                devices={devices}
                onClear={clearResults}
            />

            {/* Packet Info */}
            <PingPacketInfo
                result={selectedResult}
                devices={devices}
            />

            {/* Animation Overlay - This would be positioned over the network canvas */}
            <PingAnimation
                devices={devices}
                path={currentPath}
                isPlaying={isAnimating}
                onComplete={() => setIsAnimating(false)}
            />
        </div>
    );
};

export default PingVisualization;
