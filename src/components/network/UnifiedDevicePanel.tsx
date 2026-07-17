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
    activeTab: 'console' | 'settings' | 'stp';
    onTabChange: (tab: 'console' | 'settings' | 'stp') => void;
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

    const [selectedVlan, setSelectedVlan] = React.useState(1);
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
            className={`liquid-glass-light ${isDark ? '!bg-secondary-950/40 border-emerald-950/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]' : '!bg-white/60 border-emerald-950/80 shadow-[0_8px_28px_rgba(15,23,42,0.12)]'} ${className || ''}`}
            title={
                <div className="flex items-center gap-2 px-2">
                    <Tabs value={activeTab} onValueChange={(v: string) => onTabChange(v as 'console' | 'settings' | 'stp')} className="min-w-0">
                        <TabsList className={cn("h-7 p-0.5", isDark ? "bg-secondary-800" : "bg-secondary-100")}>
                            <TabsTrigger value="console" className="flex items-center gap-1.5 px-2 h-6 text-xs">
                                <TerminalIcon className="w-3 h-3" />
                                <span>{t.cliInterface}</span>
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="flex items-center gap-1.5 px-2 h-6 text-xs">
                                <Settings className="w-3 h-3" />
                                <span>{t.quickSettingsAndTasks}</span>
                            </TabsTrigger>
                            {(deviceType === 'switchL2' || deviceType === 'switchL3') && (
                                <TabsTrigger value="stp" className="flex items-center gap-1.5 px-2 h-6 text-xs">
                                    <Layers className="w-3 h-3 text-warning-500" />
                                    <span>{t.stpTab}</span>
                                </TabsTrigger>
                            )}
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

                            <TabsContent value="stp" className="h-full m-0 p-0 overflow-y-auto custom-scrollbar">
                                <div className="p-4 sm:p-6 space-y-6">
                                    {/* VLAN Selector & STP info */}
                                    {(() => {
                                        const deviceState = deviceStates.get(deviceId);
                                        const stpStateMap = deviceState?.stpState || {};
                                        const vlanIds = Object.keys(stpStateMap).map(Number).sort((a, b) => a - b);
                                        const currentVlan = vlanIds.includes(selectedVlan) ? selectedVlan : (vlanIds[0] || 1);
                                        const stpVlanState = stpStateMap[currentVlan];

                                        if (!stpVlanState) {
                                            return (
                                                <div className={cn("p-8 rounded-lg border text-center", isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200")}>
                                                    <Layers className="w-12 h-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
                                                    <p className="text-muted-foreground text-sm font-medium">
                                                        {language === 'tr' ? 'Bu cihazda STP aktif değil veya henüz başlatılmadı.' : 'STP is not active or has not initialized on this device.'}
                                                    </p>
                                                </div>
                                            );
                                        }

                                        const localBridgePriority = stpVlanState.bridgeId.split('.')[0];
                                        const localBridgeMac = stpVlanState.bridgeId.split('.').slice(1).join('.');

                                        return (
                                            <div className="space-y-5">
                                                {/* Header and VLAN Selector */}
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                    <div>
                                                        <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                                            <Layers className="w-4 h-4 text-warning-500" />
                                                            {language === 'tr' ? 'Spanning Tree Protokolü (STP)' : 'Spanning Tree Protocol (STP)'}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {language === 'tr' ? 'Cihazın ve portların Spanning Tree durumlarını inceleyin.' : 'Inspect Spanning Tree states of the device and its ports.'}
                                                        </p>
                                                    </div>
                                                    {vlanIds.length > 1 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">VLAN:</span>
                                                            <select
                                                                value={currentVlan}
                                                                onChange={(e) => setSelectedVlan(Number(e.target.value))}
                                                                className={cn(
                                                                    "px-2 py-1 rounded text-xs border outline-none",
                                                                    isDark ? "bg-secondary-900 border-secondary-800 text-white" : "bg-white border-secondary-300 text-secondary-900"
                                                                )}
                                                            >
                                                                {vlanIds.map(vid => (
                                                                    <option key={vid} value={vid}>VLAN {vid}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Root Bridge Status Card */}
                                                <div className={cn(
                                                    "p-4 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between gap-4",
                                                    stpVlanState.isRoot
                                                        ? (isDark ? "bg-warning-950/20 border-warning-500/30 text-warning-200" : "bg-warning-50/70 border-warning-200 text-warning-800")
                                                        : (isDark ? "bg-secondary-900 border-secondary-800/80" : "bg-secondary-50 border-secondary-200")
                                                )}>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 font-bold text-sm">
                                                            {stpVlanState.isRoot ? (
                                                                <>
                                                                    <span className="text-lg">👑</span>
                                                                    <span>{language === 'tr' ? 'Cihaz Kök Köprü (Root Bridge) Durumunda' : 'This Switch is the Root Bridge'}</span>
                                                                </>
                                                            ) : (
                                                                <span>{language === 'tr' ? 'Kök Köprü Bilgisi' : 'Root Bridge Information'}</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs opacity-80 font-mono">
                                                            Root Bridge ID: <span className="font-semibold">{stpVlanState.rootBridgeId}</span>
                                                        </p>
                                                        {!stpVlanState.isRoot && (
                                                            <p className="text-xs opacity-80 font-mono">
                                                                Root Path Cost: <span className="font-semibold text-primary">{stpVlanState.rootCost}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-6 border-secondary-700/30">
                                                        <div>
                                                            <span className="opacity-60">{language === 'tr' ? 'Köprü Önceliği:' : 'Bridge Priority:'}</span>
                                                            <p className="font-semibold">{localBridgePriority}</p>
                                                        </div>
                                                        <div>
                                                            <span className="opacity-60">Bridge MAC:</span>
                                                            <p className="font-semibold text-xs leading-none mt-1">{localBridgeMac}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Port STP States Table */}
                                                <div className={cn("rounded-lg border overflow-hidden", isDark ? "bg-secondary-900 border-secondary-800/80" : "bg-secondary-50 border-secondary-200")}>
                                                    <div className="px-4 py-2.5 border-b border-secondary-800/80 bg-secondary-100/20 dark:bg-secondary-950/10">
                                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                            {language === 'tr' ? 'Port Rol ve Durumları' : 'Port Roles and States'}
                                                        </h4>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs text-left">
                                                            <thead className={cn("border-b text-[10px] uppercase tracking-wider font-semibold", isDark ? "bg-secondary-950 border-secondary-800 text-secondary-400" : "bg-secondary-100 border-secondary-200 text-secondary-600")}>
                                                                <tr>
                                                                    <th className="p-3">{language === 'tr' ? 'Arayüz' : 'Interface'}</th>
                                                                    <th className="p-3">{language === 'tr' ? 'Rol (Role)' : 'Role'}</th>
                                                                    <th className="p-3">{language === 'tr' ? 'Durum (State)' : 'State'}</th>
                                                                    <th className="p-3">{language === 'tr' ? 'Maliyet (Cost)' : 'Cost'}</th>
                                                                    <th className="p-3">{language === 'tr' ? 'Öncelik' : 'Priority'}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {Object.keys(stpVlanState.ports).length > 0 ? (
                                                                    Object.entries(stpVlanState.ports).map(([portName, portStp]) => {
                                                                        const role = portStp.role;
                                                                        const state = portStp.state;

                                                                        const roleLabels: Record<string, string> = language === 'tr' ? {
                                                                            root: 'Kök Port (RP)',
                                                                            designated: 'Atanmış Port (DP)',
                                                                            alternate: 'Alternatif Port (AP)',
                                                                            backup: 'Yedek Port (BP)',
                                                                            disabled: 'Devre Dışı'
                                                                        } : {
                                                                            root: 'Root Port (RP)',
                                                                            designated: 'Designated Port (DP)',
                                                                            alternate: 'Alternate Port (AP)',
                                                                            backup: 'Backup Port (BP)',
                                                                            disabled: 'Disabled'
                                                                        };

                                                                        const stateLabels: Record<string, string> = language === 'tr' ? {
                                                                            forwarding: 'İletiyor (FWD)',
                                                                            blocking: 'Engelliyor (BLK)',
                                                                            learning: 'Öğreniyor (LRN)',
                                                                            listening: 'Dinliyor (LIS)',
                                                                            disabled: 'Devre Dışı'
                                                                        } : {
                                                                            forwarding: 'Forwarding (FWD)',
                                                                            blocking: 'Blocking (BLK)',
                                                                            learning: 'Learning (LRN)',
                                                                            listening: 'Listening (LIS)',
                                                                            disabled: 'Disabled'
                                                                        };

                                                                        return (
                                                                            <tr key={portName} className={cn("border-b last:border-0 hover:bg-secondary-800/10 dark:hover:bg-secondary-800/30", isDark ? "border-secondary-800" : "border-secondary-200")}>
                                                                                <td className="p-3 font-semibold font-mono">{portName}</td>
                                                                                <td className="p-3">
                                                                                    <span className={cn(
                                                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                                                                        role === 'root'
                                                                                            ? "bg-primary-500/10 text-primary-500 border-primary-500/20"
                                                                                            : role === 'designated'
                                                                                            ? "bg-success-500/10 text-success-500 border-success-500/20"
                                                                                            : role === 'alternate'
                                                                                            ? "bg-warning-500/10 text-warning-500 border-warning-500/20"
                                                                                            : "bg-secondary-500/10 text-secondary-500 border-secondary-500/20"
                                                                                    )}>
                                                                                        {roleLabels[role] || role}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="p-3">
                                                                                    <span className={cn(
                                                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                                                        state === 'forwarding'
                                                                                            ? "bg-success-500/10 text-success-500 border border-success-500/20"
                                                                                            : state === 'blocking'
                                                                                            ? "bg-error-500/10 text-error-500 border border-error-500/20 animate-pulse"
                                                                                            : "bg-secondary-500/10 text-secondary-500 border border-secondary-500/20"
                                                                                    )}>
                                                                                        {stateLabels[state] || state}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="p-3 font-mono text-muted-foreground">{portStp.cost || 19}</td>
                                                                                <td className="p-3 font-mono text-muted-foreground">128</td>
                                                                            </tr>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <tr>
                                                                        <td colSpan={5} className="p-4 text-center text-muted-foreground italic">
                                                                            {language === 'tr' ? 'Port STP bilgisi yok.' : 'No port STP information.'}
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

        </DraggableWindowWrapper>
    );
}
