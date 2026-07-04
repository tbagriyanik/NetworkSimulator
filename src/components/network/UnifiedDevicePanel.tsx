'use client';

import React, { useMemo, useEffect } from 'react';
import { DragPosition as ModalPosition, DragSize as ModalSize } from '@/hooks/useDrag';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
    Terminal as TerminalIcon,
    Settings,
    X,
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
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <DialogContent
                showCloseButton={false}
                onEscapeKeyDown={(e) => e.preventDefault()}
                className={cn(
                    "p-0 overflow-visible flex flex-col top-auto left-auto translate-x-0 translate-y-0 liquid-glass-light",
                    isDark ? "bg-secondary-950/80 border-success-500/30" : "bg-white border-success-500",
                    className
                )}
                data-modal-content
                style={{
                    position: 'fixed',
                    left: isMobile ? 0 : modalPosition.x,
                    top: isMobile ? 0 : modalPosition.y,
                    width: isMobile ? '100vw' : `${modalSize.width}px`,
                    height: isMobile ? '100vh' : `${modalSize.height}px`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    borderRadius: isMobile ? 0 : '1rem',
                    borderWidth: 3,
                    borderStyle: 'dashed',
                    zIndex: 50
                }}
            >
                <div className="relative flex flex-col h-full rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header with Tabs */}
                    <DialogHeader
                        className={cn(
                            "p-0 border-b cursor-grab active:cursor-grabbing select-none touch-none sticky top-0 z-10",
                            isDark ? "border-success-500/30 bg-secondary-900/90" : "border-success-500/50 bg-white"
                        )}
                        data-modal-header
                        onPointerDown={(e) => handlePointerDown(e, 'deviceUnified')}
                    >
                        <div className="flex items-center gap-2 px-2 py-1.5 sm:justify-between sm:px-4 sm:py-2">
                            <Tabs value={activeTab} onValueChange={(v: string) => onTabChange(v as 'console' | 'settings')} className="min-w-0 flex-1 sm:flex-none sm:w-auto">
                                <TabsList className={cn("h-9 p-1 w-full sm:w-auto overflow-x-auto", isDark ? "bg-secondary-800" : "bg-secondary-100")}>
                                    <TabsTrigger value="console" className="flex items-center gap-1.5 px-2 sm:px-3 h-7 whitespace-nowrap text-xs sm:text-sm">
                                        <TerminalIcon className="w-3.5 h-3.5" />
                                        <span>{t.cliInterface}</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="settings" className="flex items-center gap-1.5 px-2 sm:px-3 h-7 whitespace-nowrap text-xs sm:text-sm">
                                        <Settings className="w-3.5 h-3.5" />
                                        <span>{t.quickSettingsAndTasks}</span>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-center px-1 sm:px-4">
                                <div className={cn(
                                    "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full border text-[10px] sm:text-xs font-medium max-w-full truncate",
                                    isDark ? "bg-secondary-800/50 border-secondary-700 text-secondary-300" : "bg-secondary-100 border-secondary-200 text-secondary-600"
                                )}>
                                    <div className={cn("w-2 h-2 rounded-full shrink-0", isOffline ? "bg-error-500" : "bg-success-500")} />
                                    <span className="truncate">{deviceName}</span>
                                    <span className="opacity-50 text-[10px] uppercase">{deviceType}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">

                                <button
                                    className="w-5 h-5 rounded-md bg-error-500 hover:bg-error-600 text-white transition-colors inline-flex items-center justify-center focus:outline-none disabled:pointer-events-none"
                                    title={t.language === 'tr' ? 'Kapat' : 'Close'}
                                    onClick={() => onOpenChange(false)}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                        <DialogTitle className="sr-only">
                            {deviceName} - {activeTab === 'console' ? t.cliInterface : t.quickSettingsAndTasks}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {deviceType} {t.configAndMonitor}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Content */}
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

                    {/* Resize handles - hidden on mobile */}
                    {!isMobile && (
                        <>
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize select-none touch-none hover:bg-primary/20 z-20" onPointerDown={(e) => handleResizeStart(e, 'w', 'deviceUnified')} />
                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize select-none touch-none hover:bg-primary/20 z-20" onPointerDown={(e) => handleResizeStart(e, 'e', 'deviceUnified')} />
                            <div className="absolute left-0 top-0 right-0 h-1.5 cursor-ns-resize select-none touch-none hover:bg-primary/20 z-20" onPointerDown={(e) => handleResizeStart(e, 'n', 'deviceUnified')} />
                            <div className="absolute left-0 bottom-0 right-0 h-1.5 cursor-ns-resize select-none touch-none hover:bg-primary/20 z-20" onPointerDown={(e) => handleResizeStart(e, 's', 'deviceUnified')} />
                            <div className="absolute left-0 top-0 w-5 h-5 cursor-nw-resize select-none touch-none z-30" onPointerDown={(e) => handleResizeStart(e, 'nw', 'deviceUnified')} />
                            <div className="absolute right-0 top-0 w-5 h-5 cursor-ne-resize select-none touch-none z-30" onPointerDown={(e) => handleResizeStart(e, 'ne', 'deviceUnified')} />
                            <div className="absolute left-0 bottom-0 w-5 h-5 cursor-sw-resize select-none touch-none z-30" onPointerDown={(e) => handleResizeStart(e, 'sw', 'deviceUnified')} />
                            <div className="absolute right-0 bottom-0 w-5 h-5 cursor-se-resize select-none touch-none flex items-center justify-center text-secondary-400 hover:text-primary z-30" onPointerDown={(e) => handleResizeStart(e, 'se', 'deviceUnified')}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M11 5L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M11 9L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
