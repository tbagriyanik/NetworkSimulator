'use client';

import React, { useMemo, useEffect } from 'react';
import { DragPosition as ModalPosition, DragSize as ModalSize } from '@/hooks/useDrag';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';

import {
    Terminal as TerminalIcon,
    Settings,
    ShieldCheck,
    Network,
    Layers,
    Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import type { DeviceType, CanvasDevice, CanvasConnection } from './networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { TerminalOutput } from './Terminal';
import type { Translations } from '@/contexts/LanguageContext';
import type { TaskDefinition, TaskContext } from '@/lib/network/taskDefinitions';


const Terminal = dynamic(() => import('./Terminal').then(m => m.Terminal), { ssr: false });
const PortPanel = dynamic(() => import('./PortPanel').then(m => m.PortPanel), { ssr: false });
const VlanPanel = dynamic(() => import('./VlanPanel').then(m => m.VlanPanel), { ssr: false });
const SecurityPanel = dynamic(() => import('./SecurityPanel').then(m => m.SecurityPanel), { ssr: false });
const TaskCard = dynamic(() => import('./TaskCard').then(m => m.TaskCard), { ssr: false });
const WlcWirelessPanel = dynamic(() => import('./WlcWirelessPanel').then(m => m.WlcWirelessPanel), { ssr: false });

interface UnifiedDevicePanelProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    activeTab: 'console' | 'settings';
    onTabChange: (tab: 'console' | 'settings') => void;
    deviceId: string;
    deviceType: DeviceType;
    deviceStates: Map<string, SwitchState>;
    topologyDevices: CanvasDevice[];
    topologyConnections: CanvasConnection[];
    handleCommand: (command: string) => Promise<unknown>;
    handleClearTerminal: () => void;
    toggleDevicePower: (deviceId: string) => void;
    handleUpdateHistory: (deviceId: string, history: string[]) => void;
    confirmDialog: { show: boolean; message?: string; onConfirm: () => void } | null;
    setConfirmDialog: (dialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null) => void;
    t: Translations;
    theme: string;
    language: string;
    helpLevel: 'beginner' | 'intermediate' | 'exam';
    isDark: boolean;
    isExecutingCommand: boolean;
    output: TerminalOutput[];
    prompt: string;
    state: SwitchState;
    activeDeviceTasks: TaskDefinition[];
    taskContext: TaskContext;
    // Position/Size from parent hook
    modalPosition: ModalPosition;
    modalSize: ModalSize;
    handlePointerDown: (e: React.PointerEvent, modalType: string) => void;
    handleResizeStart: (e: React.PointerEvent, direction: string, modalType: string) => void;
    className?: string;
}

export function UnifiedDevicePanel({
    isOpen,
    onOpenChange,
    activeTab,
    onTabChange,
    deviceId,
    deviceType,
    deviceStates,
    topologyDevices,
    topologyConnections,
    handleCommand,
    handleClearTerminal,
    toggleDevicePower,
    handleUpdateHistory,
    confirmDialog,
    setConfirmDialog,
    t,
    theme,
    language,
    helpLevel,
    isDark,
    isExecutingCommand,
    output,
    prompt,
    state,
    activeDeviceTasks,
    taskContext,
    modalPosition,
    modalSize,
    handlePointerDown,
    handleResizeStart,
    className
}: UnifiedDevicePanelProps) {

    const isNarrow = modalSize.width < 1100;

    const deviceName = useMemo(() => {
        const deviceState = deviceStates.get(deviceId);
        return deviceState?.hostname || deviceId;
    }, [deviceStates, deviceId]);

    const deviceModel = useMemo(() => {
        if (deviceType === 'router') return 'ISR 4451 X';
        return state?.switchModel || 'WS-C2960-24TT-L';
    }, [deviceType, state]);

    const isOffline = useMemo(() => {
        return topologyDevices.some(d => d.id === deviceId && d.status === 'offline');
    }, [topologyDevices, deviceId]);
    const hasTaskSystem = deviceType === 'switchL2' || deviceType === 'switchL3' || deviceType === 'router';

    // Handle focus on terminal
    const focusActiveTerminalInput = () => {
        requestAnimationFrame(() => {
            const el = document.querySelector('input[type="text"], input[type="password"]') as HTMLInputElement | null;
            el?.focus();
        });
    };

    useEffect(() => {
        if (isOpen && activeTab === 'console') {
            focusActiveTerminalInput();
        }
    }, [isOpen, activeTab]);

    useEffect(() => {
        if (!isOpen) return;
        const handleMobileBack = () => onOpenChange(false);
        window.addEventListener('mobile-back-pressed', handleMobileBack);
        window.addEventListener('popstate', handleMobileBack);
        return () => {
            window.removeEventListener('mobile-back-pressed', handleMobileBack);
            window.removeEventListener('popstate', handleMobileBack);
        };
    }, [isOpen, onOpenChange]);

    return (
        <DraggableWindowWrapper
            id="deviceUnified"
            title={
                <div className="flex items-center gap-2 px-2">
                    <Tabs value={activeTab} onValueChange={(v: string) => onTabChange(v as 'console' | 'settings')} className="min-w-0">
                        <TabsList className={cn("h-7 p-0.5", isDark ? "bg-secondary-800" : "bg-secondary-100")}>
                            <TabsTrigger value="console" className="flex items-center gap-1.5 px-2 h-6 text-xs">
                                <TerminalIcon className="w-3 h-3" />
                                <span>{t.cliInterface}</span>
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="flex items-center gap-1.5 px-2 h-6 text-xs">
                                <Settings className="w-3 h-3" />
                                <span>{t.quickSettingsAndTasks}</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium ml-2",
                        isDark ? "bg-secondary-800/50 border-secondary-700 text-secondary-300" : "bg-secondary-100 border-secondary-200 text-secondary-600"
                    )}>
                        <div className={cn("w-2 h-2 rounded-full shrink-0", isOffline ? "bg-error-500" : "bg-success-500")} />
                        <span className="truncate">{deviceName}</span>
                        <span className="opacity-50 text-[9px] uppercase">({deviceType})</span>
                    </div>
                </div>
            }
            isOpen={isOpen}
            onClose={() => onOpenChange(false)}
            isDark={isDark}
            modalPosition={modalPosition}
            modalSize={modalSize}
            handlePointerDown={handlePointerDown}
            handleResizeStart={handleResizeStart}
            className={className}
        >
            <div className="flex-1 overflow-hidden relative">
                <Tabs value={activeTab} className="h-full">
                    <TabsContent value="console" className="h-full m-0 p-0 overflow-hidden">
                        <Terminal
                            key={`unified-terminal-${deviceId}`}
                            className="h-full"
                            deviceId={deviceId}
                            deviceName={deviceName}
                                    prompt={prompt}
                                    state={state}
                                    onCommand={handleCommand}
                                    onClear={handleClearTerminal}
                                    output={output}
                                    isLoading={isExecutingCommand}
                                    isConnectionError={isOffline}
                                    connectionErrorMessage={t.connectionError}
                                    isPoweredOff={isOffline}
                                    onTogglePower={() => toggleDevicePower(deviceId)}
                                    onClose={() => onOpenChange(false)}
                                    onQuickSettings={() => onTabChange('settings')}
                                    t={t}
                                    theme={theme}
                                    language={language}
                                    helpLevel={helpLevel}
                                    onUpdateHistory={handleUpdateHistory}
                                    confirmDialog={confirmDialog}
                                    setConfirmDialog={setConfirmDialog}
                                    device={topologyDevices.find(d => d.id === deviceId)}
                                    devices={topologyDevices}
                                    deviceStates={deviceStates}
                                    onRequestFocus={focusActiveTerminalInput}
                                />
                            </TabsContent>
                            <TabsContent value="settings" className="h-full m-0 p-0 overflow-y-auto custom-scrollbar">
                                <div className="p-4 sm:p-6">
                                    <div className={cn(
                                        "grid gap-6",
                                        isNarrow ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"
                                    )}>
                                        <div className={cn(isNarrow ? "" : "lg:col-span-2", "space-y-6")}>
                                            {deviceType === 'wlc' && (
                                                <WlcWirelessPanel
                                                    state={state}
                                                    isDark={isDark}
                                                    language={language}
                                                    isDevicePoweredOff={isOffline}
                                                    onExecuteCommand={handleCommand as (command: string) => Promise<void>}
                                                />
                                            )}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                                    <Network className="w-4 h-4" />
                                                    {t.portStatus}
                                                </div>
                                                <PortPanel
                                                    ports={state?.ports || {}}
                                                    t={t}
                                                    theme={theme}
                                                    deviceName={deviceName}
                                                    deviceModel={deviceModel}
                                                    activeDeviceId={deviceId}
                                                    isDevicePoweredOff={isOffline}
                                                    topologyDevices={topologyDevices}
                                                    onTogglePower={toggleDevicePower}
                                                    topologyConnections={topologyConnections}
                                                />
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                                    <Layers className="w-4 h-4" />
                                                    {t.vlanManagement}
                                                </div>
                                                <VlanPanel
                                                    vlans={state?.vlans || []}
                                                    ports={state?.ports || {}}
                                                    deviceName={deviceName}
                                                    deviceModel={deviceModel}
                                                    deviceId={deviceId}
                                                    onTogglePower={toggleDevicePower}
                                                    onExecuteCommand={handleCommand as (command: string) => Promise<void>}
                                                    t={t}
                                                    theme={theme}
                                                    activeDeviceType={deviceType}
                                                    isDevicePoweredOff={isOffline}
                                                />
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                                    <ShieldCheck className="w-4 h-4" />
                                                    {t.securityAndAcl}
                                                </div>
                                                <SecurityPanel
                                                    security={state?.security || {}}
                                                    t={t}
                                                    theme={theme}
                                                    isDevicePoweredOff={isOffline}
                                                />
                                            </div>
                                        </div>

                                        {hasTaskSystem && (
                                            <div className="space-y-6">
                                                <div className="space-y-4 sticky top-0">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                                        <Cpu className="w-4 h-4" />
                                                        {t.tasksAndScore}
                                                    </div>
                                                    <TaskCard
                                                        tasks={activeDeviceTasks}
                                                        state={state}
                                                        context={taskContext}
                                                        isDark={isDark}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

        </DraggableWindowWrapper>
    );
}
