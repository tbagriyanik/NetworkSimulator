'use client';

import { useState } from 'react';
import { useMode } from '@/contexts/ModeContext';
import { MODE_FEATURES, VALIDATION_RULES } from '@/constants/ui-ux';
import type { DeviceConfig } from '@/types/ui-ux';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { Icon } from './icon';
import { TooltipWrapper } from './TooltipWrapper';

export interface DeviceConfigurationPanelProps {
    device: DeviceConfig;
    onSave?: (device: DeviceConfig) => void;
    onCancel?: () => void;
    className?: string;
}

interface ValidationError {
    field: string;
    message: string;
}

/**
 * Device Configuration Panel Component
 * Allows students to configure device settings with progressive disclosure
 * Basic settings visible by default, advanced settings in expandable section
 */
export function DeviceConfigurationPanel({
    device,
    onSave,
    onCancel,
    className = '',
}: DeviceConfigurationPanelProps) {
    const { mode } = useMode();
    const [config, setConfig] = useState<DeviceConfig>(device);
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Determine if advanced settings should be available
    const advancedSettingsAvailable = MODE_FEATURES[mode].advancedSettings;

    // Validation functions
    const validateIPv4 = (ip: string): boolean => {
        if (!ip) return true; // Optional field
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        return parts.every((part) => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255;
        });
    };

    const validateSubnet = (subnet: string): boolean => {
        if (!subnet) return true;
        return validateIPv4(subnet);
    };

    const validateGateway = (gateway: string): boolean => {
        if (!gateway) return true;
        return validateIPv4(gateway);
    };

    const validateDNS = (dns: string): boolean => {
        if (!dns) return true;
        return validateIPv4(dns);
    };

    const validateDeviceName = (name: string): boolean => {
        return VALIDATION_RULES.deviceName.test(name);
    };

    // Validate all fields
    const validateAll = (): boolean => {
        const newErrors: ValidationError[] = [];

        if (!validateDeviceName(config.name)) {
            newErrors.push({
                field: 'name',
                message: 'Device name must be 1-32 characters (alphanumeric, dash, underscore)',
            });
        }

        if (!validateIPv4(config.network.ipv4 || '')) {
            newErrors.push({
                field: 'ipv4',
                message: 'Invalid IPv4 address format (e.g., 192.168.1.1)',
            });
        }

        if (!validateSubnet(config.network.subnet || '')) {
            newErrors.push({
                field: 'subnet',
                message: 'Invalid subnet mask format (e.g., 255.255.255.0)',
            });
        }

        if (!validateGateway(config.network.gateway || '')) {
            newErrors.push({
                field: 'gateway',
                message: 'Invalid gateway format (e.g., 192.168.1.1)',
            });
        }

        if (config.network.dns) {
            config.network.dns.forEach((dns, index) => {
                if (!validateDNS(dns)) {
                    newErrors.push({
                        field: `dns-${index}`,
                        message: `Invalid DNS server #${index + 1} format`,
                    });
                }
            });
        }

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleSave = () => {
        if (validateAll()) {
            onSave?.(config);
        }
    };

    const handleFieldChange = (field: string, value: string) => {
        setConfig((prev) => ({
            ...prev,
            network: {
                ...prev.network,
                [field]: value,
            },
        }));
        // Clear error for this field
        setErrors((prev) => prev.filter((e) => e.field !== field));
    };

    const handleNameChange = (value: string) => {
        setConfig((prev) => ({
            ...prev,
            name: value,
        }));
        setErrors((prev) => prev.filter((e) => e.field !== 'name'));
    };

    const getFieldError = (field: string): string | undefined => {
        return errors.find((e) => e.field === field)?.message;
    };

    const hasError = (field: string): boolean => {
        return errors.some((e) => e.field === field);
    };

    // Apply preset configuration
    const applyPreset = (preset: 'home' | 'office' | 'lab' | 'reset') => {
        // Clear any existing errors
        setErrors([]);

        switch (preset) {
            case 'home':
                setConfig((prev) => ({
                    ...prev,
                    network: {
                        ...prev.network,
                        ipv4: '192.168.1.10',
                        subnet: '255.255.255.0',
                        gateway: '192.168.1.1',
                        dns: ['192.168.1.1', '8.8.8.8'],
                    },
                }));
                break;
            case 'office':
                setConfig((prev) => ({
                    ...prev,
                    network: {
                        ...prev.network,
                        ipv4: '10.0.0.10',
                        subnet: '255.255.255.0',
                        gateway: '10.0.0.1',
                        dns: ['10.0.0.1', '8.8.8.8'],
                    },
                }));
                break;
            case 'lab':
                setConfig((prev) => ({
                    ...prev,
                    network: {
                        ...prev.network,
                        ipv4: '172.16.0.10',
                        subnet: '255.255.255.0',
                        gateway: '172.16.0.1',
                        dns: ['172.16.0.1', '8.8.8.8'],
                    },
                }));
                break;
            case 'reset':
                setConfig((prev) => ({
                    ...prev,
                    network: {
                        ipv4: '',
                        subnet: '',
                        gateway: '',
                        dns: [],
                    },
                }));
                break;
        }
    };

    return (
        <Card className={`w-full ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Configure Device</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Device Name */}
                <div className="space-y-2">
                    <Label htmlFor="device-name">Device Name</Label>
                    <TooltipWrapper title="Enter a unique name for this device (1-32 characters)">
                        <Input
                            id="device-name"
                            value={config.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g., PC-1, Router-Main"
                            className={hasError('name') ? 'border-red-500' : ''}
                        />
                    </TooltipWrapper>
                    {hasError('name') && <div className="text-xs text-red-500">{getFieldError('name')}</div>}
                </div>

                {/* Preset Configurations */}
                <div className="space-y-2">
                    <Label>Quick Presets</Label>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset('home')}
                            className="text-xs"
                            title="Home Network: 192.168.1.x"
                        >
                            🏠 Home
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset('office')}
                            className="text-xs"
                            title="Office Network: 10.0.0.x"
                        >
                            🏢 Office
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset('lab')}
                            className="text-xs"
                            title="Lab Network: 172.16.0.x"
                        >
                            🔬 Lab
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset('reset')}
                            className="text-xs"
                            title="Clear all settings"
                        >
                            🔄 Reset
                        </Button>
                    </div>
                </div>

                {/* Basic Settings */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-sm">Network Configuration</h3>

                    {/* IPv4 Address */}
                    <div className="space-y-2">
                        <Label htmlFor="ipv4">IPv4 Address</Label>
                        <TooltipWrapper title="Enter the IPv4 address for this device (e.g., 192.168.1.10)">
                            <Input
                                id="ipv4"
                                value={config.network.ipv4 || ''}
                                onChange={(e) => handleFieldChange('ipv4', e.target.value)}
                                placeholder="192.168.1.10"
                                className={hasError('ipv4') ? 'border-red-500' : ''}
                            />
                        </TooltipWrapper>
                        {hasError('ipv4') && <div className="text-xs text-red-500">{getFieldError('ipv4')}</div>}
                    </div>

                    {/* Subnet Mask */}
                    <div className="space-y-2">
                        <Label htmlFor="subnet">Subnet Mask</Label>
                        <TooltipWrapper title="Enter the subnet mask (e.g., 255.255.255.0)">
                            <Input
                                id="subnet"
                                value={config.network.subnet || ''}
                                onChange={(e) => handleFieldChange('subnet', e.target.value)}
                                placeholder="255.255.255.0"
                                className={hasError('subnet') ? 'border-red-500' : ''}
                            />
                        </TooltipWrapper>
                        {hasError('subnet') && <div className="text-xs text-red-500">{getFieldError('subnet')}</div>}
                    </div>

                    {/* Gateway */}
                    <div className="space-y-2">
                        <Label htmlFor="gateway">Default Gateway</Label>
                        <TooltipWrapper title="Enter the default gateway IP address">
                            <Input
                                id="gateway"
                                value={config.network.gateway || ''}
                                onChange={(e) => handleFieldChange('gateway', e.target.value)}
                                placeholder="192.168.1.1"
                                className={hasError('gateway') ? 'border-red-500' : ''}
                            />
                        </TooltipWrapper>
                        {hasError('gateway') && <div className="text-xs text-red-500">{getFieldError('gateway')}</div>}
                    </div>
                </div>

                {/* Advanced Settings */}
                {advancedSettingsAvailable && (
                    <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                        <CollapsibleTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                                <span>Advanced Settings</span>
                                <Icon name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={16} />
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-4">
                            {/* IPv6 Address */}
                            <div className="space-y-2">
                                <Label htmlFor="ipv6">IPv6 Address (Optional)</Label>
                                <TooltipWrapper title="Enter an IPv6 address if needed">
                                    <Input
                                        id="ipv6"
                                        value={config.network.ipv6 || ''}
                                        onChange={(e) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                network: { ...prev.network, ipv6: e.target.value },
                                            }))
                                        }
                                        placeholder="2001:db8::1"
                                    />
                                </TooltipWrapper>
                            </div>

                            {/* DNS Servers */}
                            <div className="space-y-2">
                                <Label>DNS Servers (Optional)</Label>
                                <TooltipWrapper title="Enter DNS server addresses, separated by commas">
                                    <Input
                                        value={config.network.dns?.join(', ') || ''}
                                        onChange={(e) =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                network: {
                                                    ...prev.network,
                                                    dns: e.target.value.split(',').map((s) => s.trim()),
                                                },
                                            }))
                                        }
                                        placeholder="8.8.8.8, 8.8.4.4"
                                    />
                                </TooltipWrapper>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-medium text-sm mb-3">DHCP Configuration</h4>

                                {/* DHCP Enable Toggle */}
                                <div className="flex items-center justify-between mb-3">
                                    <Label htmlFor="dhcp-enabled" className="mb-0">Enable DHCP</Label>
                                    <button
                                        id="dhcp-enabled"
                                        onClick={() =>
                                            setConfig((prev) => ({
                                                ...prev,
                                                network: {
                                                    ...prev.network,
                                                    dhcp: {
                                                        enabled: !(prev.network.dhcp?.enabled ?? false),
                                                        server: prev.network.dhcp?.server ?? false,
                                                        startIP: prev.network.dhcp?.startIP,
                                                        endIP: prev.network.dhcp?.endIP,
                                                        leaseTime: prev.network.dhcp?.leaseTime,
                                                    },
                                                },
                                            }))
                                        }
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                            config.network.dhcp?.enabled ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                        role="switch"
                                        aria-checked={config.network.dhcp?.enabled}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                config.network.dhcp?.enabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* DHCP Server Toggle */}
                                {config.network.dhcp?.enabled && (
                                    <>
                                        <div className="flex items-center justify-between mb-3">
                                            <Label htmlFor="dhcp-server" className="mb-0 text-sm text-gray-600">DHCP Server Mode</Label>
                                            <button
                                                id="dhcp-server"
                                                onClick={() =>
                                                    setConfig((prev) => ({
                                                        ...prev,
                                                        network: {
                                                            ...prev.network,
                                                            dhcp: {
                                                                enabled: prev.network.dhcp?.enabled ?? false,
                                                                server: !(prev.network.dhcp?.server ?? false),
                                                                startIP: prev.network.dhcp?.startIP,
                                                                endIP: prev.network.dhcp?.endIP,
                                                                leaseTime: prev.network.dhcp?.leaseTime,
                                                            },
                                                        },
                                                    }))
                                                }
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                    config.network.dhcp?.server ? 'bg-green-600' : 'bg-gray-300'
                                                }`}
                                                role="switch"
                                                aria-checked={config.network.dhcp?.server}
                                            >
                                                <span
                                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                        config.network.dhcp?.server ? 'translate-x-5' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* DHCP Range - Only show if server mode */}
                                        {config.network.dhcp?.server && (
                                            <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                                                <div className="space-y-2">
                                                    <Label htmlFor="dhcp-start" className="text-sm">DHCP Start IP</Label>
                                                    <TooltipWrapper title="First IP address in the DHCP range">
                                                        <Input
                                                            id="dhcp-start"
                                                            value={config.network.dhcp?.startIP || ''}
                                                            onChange={(e) =>
                                                                setConfig((prev) => ({
                                                                    ...prev,
                                                                    network: {
                                                                        ...prev.network,
                                                                        dhcp: {
                                                                            enabled: prev.network.dhcp?.enabled ?? false,
                                                                            server: prev.network.dhcp?.server ?? false,
                                                                            startIP: e.target.value,
                                                                            endIP: prev.network.dhcp?.endIP,
                                                                            leaseTime: prev.network.dhcp?.leaseTime,
                                                                        },
                                                                    },
                                                                }))
                                                            }
                                                            placeholder="192.168.1.100"
                                                            className="text-sm"
                                                        />
                                                    </TooltipWrapper>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="dhcp-end" className="text-sm">DHCP End IP</Label>
                                                    <TooltipWrapper title="Last IP address in the DHCP range">
                                                        <Input
                                                            id="dhcp-end"
                                                            value={config.network.dhcp?.endIP || ''}
                                                            onChange={(e) =>
                                                                setConfig((prev) => ({
                                                                    ...prev,
                                                                    network: {
                                                                        ...prev.network,
                                                                        dhcp: {
                                                                            enabled: prev.network.dhcp?.enabled ?? false,
                                                                            server: prev.network.dhcp?.server ?? false,
                                                                            startIP: prev.network.dhcp?.startIP,
                                                                            endIP: e.target.value,
                                                                            leaseTime: prev.network.dhcp?.leaseTime,
                                                                        },
                                                                    },
                                                                }))
                                                            }
                                                            placeholder="192.168.1.200"
                                                            className="text-sm"
                                                        />
                                                    </TooltipWrapper>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="dhcp-lease" className="text-sm">Lease Time (hours)</Label>
                                                    <TooltipWrapper title="How long clients keep their IP addresses">
                                                        <Input
                                                            id="dhcp-lease"
                                                            type="number"
                                                            min={1}
                                                            max={168}
                                                            value={config.network.dhcp?.leaseTime || 24}
                                                            onChange={(e) =>
                                                                setConfig((prev) => ({
                                                                    ...prev,
                                                                    network: {
                                                                        ...prev.network,
                                                                        dhcp: {
                                                                            enabled: prev.network.dhcp?.enabled ?? false,
                                                                            server: prev.network.dhcp?.server ?? false,
                                                                            startIP: prev.network.dhcp?.startIP,
                                                                            endIP: prev.network.dhcp?.endIP,
                                                                            leaseTime: parseInt(e.target.value) || 24,
                                                                        },
                                                                    },
                                                                }))
                                                            }
                                                            className="text-sm"
                                                        />
                                                    </TooltipWrapper>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Port Configuration */}
                            {config.ports && config.ports.length > 0 && (
                                <div className="border-t pt-4 mt-4">
                                    <h4 className="font-medium text-sm mb-3">Port Configuration</h4>
                                    <div className="space-y-2">
                                        {config.ports.map((port, index) => (
                                            <div
                                                key={port.id}
                                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-600">
                                                        {port.id}
                                                    </span>
                                                    <span
                                                        className={`text-xs px-2 py-0.5 rounded-full ${
                                                            port.status === 'connected'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-green-100 text-green-700'
                                                        }`}
                                                    >
                                                        {port.status === 'connected' ? '🔌 Connected' : '○ Available'}
                                                    </span>
                                                </div>
                                                <select
                                                    value={port.type}
                                                    onChange={(e) =>
                                                        setConfig((prev) => ({
                                                            ...prev,
                                                            ports: prev.ports?.map((p, i) =>
                                                                i === index
                                                                    ? { ...p, type: e.target.value as 'ethernet' | 'wireless' | 'serial' }
                                                                    : p
                                                            ),
                                                        }))
                                                    }
                                                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                                                >
                                                    <option value="ethernet">🔌 Ethernet</option>
                                                    <option value="wireless">📡 Wireless</option>
                                                    <option value="serial">🔗 Serial</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CollapsibleContent>
                    </Collapsible>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        Save Configuration
                    </Button>
                    <Button onClick={onCancel} variant="outline" className="flex-1">
                        Cancel
                    </Button>
                </div>

                {/* Validation Summary */}
                {errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-sm font-semibold text-red-800 mb-2">Configuration Errors:</div>
                        <ul className="text-xs text-red-700 space-y-1">
                            {errors.map((error, index) => (
                                <li key={index}>• {error.message}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
