'use client';

import React, { useMemo, useState } from 'react';
import { useMode } from '@/contexts/ModeContext';
import { MODE_FEATURES, DEVICE_TYPE_COLORS, TOUCH_TARGET_SIZE } from '@/constants/ui-ux';
import type { DeviceType } from '@/types/ui-ux';
import { Icon } from './icon';
import { Input } from './input';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export interface DevicePaletteProps {
    onDeviceSelect?: (deviceType: DeviceType) => void;
    onDragStart?: (deviceType: DeviceType, e: React.DragEvent<HTMLDivElement>) => void;
    className?: string;
}

/**
 * Device Palette Component
 * Displays available network devices for placement on the canvas
 * Filters devices based on current learning mode
 * Supports drag-and-drop to canvas with visual feedback
 * Includes device preview on hover and search/filter functionality
 * Mobile-optimized with touch targets and bottom sheet adaptation
 *
 * **Validates: Requirements 1.3, 3.1, 6.1**
 */
export function DevicePalette({
    onDeviceSelect,
    onDragStart,
    className = '',
}: DevicePaletteProps) {
    const { mode } = useMode();
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredDevice, setHoveredDevice] = useState<DeviceType | null>(null);

    // Get available device types based on current mode
    const availableDeviceTypes = useMemo(() => {
        const features = MODE_FEATURES[mode];
        return features.deviceTypes as DeviceType[];
    }, [mode]);

    // Device metadata with detailed descriptions for tooltips
    const deviceMetadata: Record<DeviceType, { label: string; icon: string; description: string; details: string }> = {
        pc: {
            label: 'PC',
            icon: 'monitor',
            description: 'Personal Computer',
            details: 'A personal computer that can connect to networks and send/receive data',
        },
        router: {
            label: 'Router',
            icon: 'router',
            description: 'Network Router',
            details: 'Routes data packets between different networks and devices',
        },
        switch: {
            label: 'Switch',
            icon: 'network',
            description: 'Network Switch',
            details: 'Connects multiple devices on the same local network',
        },
        iot: {
            label: 'IoT Device',
            icon: 'wifi',
            description: 'Internet of Things Device',
            details: 'Smart device that connects to networks wirelessly',
        },
        firewall: {
            label: 'Firewall',
            icon: 'shield',
            description: 'Network Firewall',
            details: 'Protects networks by filtering incoming and outgoing traffic',
        },
        loadbalancer: {
            label: 'Load Balancer',
            icon: 'activity',
            description: 'Load Balancer',
            details: 'Distributes network traffic across multiple servers',
        },
    };

    // Filter devices based on search query and available types
    const filteredDevices = useMemo(() => {
        return availableDeviceTypes.filter((deviceType) => {
            const metadata = deviceMetadata[deviceType];
            const query = searchQuery.toLowerCase();
            return (
                metadata.label.toLowerCase().includes(query) ||
                metadata.description.toLowerCase().includes(query) ||
                metadata.details.toLowerCase().includes(query)
            );
        });
    }, [availableDeviceTypes, searchQuery]);

    const handleDeviceClick = (deviceType: DeviceType) => {
        onDeviceSelect?.(deviceType);
    };

    const handleDragStart = (deviceType: DeviceType, e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('deviceType', deviceType);
        e.dataTransfer.setData('application/json', JSON.stringify({ deviceType }));
        onDragStart?.(deviceType, e);
    };

    const handleDragEnd = () => {
        setHoveredDevice(null);
    };

    return (
        <Card className={`w-full ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Device Palette</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search Input */}
                <Input
                    placeholder="Search devices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                    aria-label="Search devices by name or description"
                />

                {/* Device Grid - Responsive layout with mobile touch targets */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {filteredDevices.length > 0 ? (
                        filteredDevices.map((deviceType) => {
                            const metadata = deviceMetadata[deviceType];
                            const color = DEVICE_TYPE_COLORS[deviceType];
                            const isHovered = hoveredDevice === deviceType;

                            return (
                                <Tooltip key={deviceType} delayDuration={200}>
                                    <TooltipTrigger asChild>
                                        <div
                                            draggable
                                            onDragStart={(e) => handleDragStart(deviceType, e)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => handleDeviceClick(deviceType)}
                                            onMouseEnter={() => setHoveredDevice(deviceType)}
                                            onMouseLeave={() => setHoveredDevice(null)}
                                            className="p-3 rounded-lg border-2 cursor-move transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                            style={{
                                                borderColor: isHovered ? color : '#e5e7eb',
                                                backgroundColor: `${color}10`,
                                                minHeight: `${TOUCH_TARGET_SIZE}px`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: isHovered ? `0 4px 12px ${color}40` : 'none',
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`${metadata.label} - ${metadata.description}`}
                                            aria-pressed={isHovered}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleDeviceClick(deviceType);
                                                }
                                            }}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Icon name={metadata.icon} size={24} style={{ color }} />
                                                <div className="text-center">
                                                    <div className="text-sm font-semibold">{metadata.label}</div>
                                                    <div className="text-xs text-gray-500">{metadata.description}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs">
                                        <div className="space-y-1">
                                            <div className="font-semibold">{metadata.label}</div>
                                            <div className="text-sm">{metadata.details}</div>
                                            <div className="text-xs text-gray-400 pt-1">Drag to canvas or click to select</div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })
                    ) : (
                        <div className="col-span-2 md:col-span-3 text-center py-8 text-gray-500">
                            No devices match your search
                        </div>
                    )}
                </div>

                {/* Mode Indicator */}
                <div className="text-xs text-gray-500 pt-2 border-t">
                    Mode: <span className="font-semibold capitalize">{mode}</span>
                    {mode === 'beginner' && ' - Basic devices only'}
                    {mode === 'intermediate' && ' - Standard devices'}
                    {mode === 'advanced' && ' - All devices available'}
                </div>
            </CardContent>
        </Card>
    );
}
