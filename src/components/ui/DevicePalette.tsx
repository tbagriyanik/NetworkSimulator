'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        <Card className={cn("w-full border-none shadow-none bg-transparent", className)}>
            <CardHeader className="pb-4 px-0">
                <CardTitle className="text-xl font-black tracking-tight text-primary uppercase">
                    Device <span className="text-cyan-500">Palette</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-0">
                {/* Search Input - Minimalist */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-primary/30 group-focus-within:text-cyan-500 transition-colors" />
                    </div>
                    <Input
                        placeholder="Filter hardware..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-primary/5 border-primary/5 rounded-2xl focus:bg-transparent transition-all"
                        aria-label="Search devices by name or description"
                    />
                </div>

                {/* Device Grid - Vibrant Minimalist Cards */}
                <div className="grid grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
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
                                          className={cn(
                                            "relative group p-4 rounded-3xl border-2 cursor-grab active:cursor-grabbing transition-all duration-300 active:scale-95 hardware-accelerated",
                                            isHovered ? "shadow-2xl -translate-y-1" : "shadow-sm"
                                          )}
                                          style={{
                                            borderColor: isHovered ? color : 'transparent',
                                            backgroundColor: isHovered ? `${color}15` : 'rgba(var(--primary), 0.03)',
                                            minHeight: `120px`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                          role="button"
                                          tabIndex={0}
                                        >
                                          {/* Accent Glow */}
                                          {isHovered && (
                                            <div
                                              className="absolute inset-0 rounded-3xl blur-xl opacity-20 pointer-events-none transition-opacity"
                                              style={{ backgroundColor: color }}
                                            />
                                          )}

                                          <div className="relative flex flex-col items-center gap-3">
                                            <div
                                              className="p-3 rounded-2xl transition-transform duration-500 group-hover:scale-110"
                                              style={{ backgroundColor: `${color}20` }}
                                            >
                                              <Icon name={metadata.icon} size={28} style={{ color }} />
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xs font-black tracking-widest uppercase mb-1">{metadata.label}</div>
                                                <div className="text-[10px] font-bold opacity-40 uppercase tracking-tighter line-clamp-1">{metadata.description}</div>
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
