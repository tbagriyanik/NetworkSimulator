'use client';

import React, { useMemo, useEffect } from 'react';
import { DragPosition as ModalPosition, DragSize as ModalSize } from '@/hooks/useDrag';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';

import {
    Terminal as TerminalIcon,
    Settings,
    Layers,
    Cpu,
    Globe,
    Printer as PrinterIcon,
    Smartphone,
    Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeviceIcon } from './DeviceIcon';
import { useGraphicsQuality } from '@/lib/store/appStore';
import dynamic from 'next/dynamic';
import type { DeviceType, CanvasDevice, CanvasConnection } from './NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { TerminalOutput } from './Terminal';
import type { Translations } from '@/contexts/LanguageContext';
import type { TaskDefinition, TaskContext } from '@/lib/network/taskDefinitions';

import { UnifiedSettingsTab } from './unified-panel/UnifiedSettingsTab';
import { UnifiedStpTab } from './unified-panel/UnifiedStpTab';

/** Console tab icon per device type (fallback: terminal icon) */
const DEVICE_CONSOLE_TAB_ICONS: Partial<Record<DeviceType, React.ReactNode>> = {
    hub: <DeviceIcon type="hub" size={14} color="var(--color-teal-500)" />,
    cloud: <Globe className="w-3 h-3 text-cyan-400" />,
    printer: <PrinterIcon className="w-3 h-3 text-purple-400" />,
    mobile: <Smartphone className="w-3 h-3 text-sky-400" />,
};

const DhcpPoolManagerModal = dynamic(() => import('./DhcpPoolManagerModal').then(m => m.DhcpPoolManagerModal), { ssr: false });
const NetworkAutomationPanel = dynamic(() => import('./NetworkAutomationPanel').then(m => m.NetworkAutomationPanel), { ssr: false });

const Terminal = dynamic(() => import('./Terminal').then(m => m.Terminal), { ssr: false });
const PrinterDeviceView = dynamic(() => import('./deviceViews/PrinterDeviceView').then(m => m.PrinterDeviceView), { ssr: false });
const MobileDeviceView = dynamic(() => import('./deviceViews/MobileDeviceView').then(m => m.MobileDeviceView), { ssr: false });
const CloudDeviceView = dynamic(() => import('./deviceViews/CloudDeviceView').then(m => m.CloudDeviceView), { ssr: false });
const IotDeviceView = dynamic(() => import('./deviceViews/IotDeviceView').then(m => m.IotDeviceView), { ssr: false });
const PhysicalDeviceView = dynamic(() => import('./PhysicalDeviceView').then(m => m.PhysicalDeviceView), { ssr: false });

interface UnifiedDevicePanelProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    activeTab: 'console' | 'settings' | 'stp' | 'physical';
    onTabChange: (tab: 'console' | 'settings' | 'stp' | 'physical') => void;
    deviceId: string;
    deviceType: DeviceType;
    deviceStates: Map<string, SwitchState>;
    topologyDevices: CanvasDevice[];
    topologyConnections: CanvasConnection[];
    onUpdateDevice?: (updatedDevice: CanvasDevice, updatedSwitchState?: SwitchState, removedConnections?: string[]) => void;
    handleCommand: (command: string) => Promise<unknown>;
    handleClearTerminal: () => void;
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
    modalPosition: ModalPosition;
    modalSize: ModalSize;
    handlePointerDown: (e: React.PointerEvent, modalType: string) => void;
    handleResizeStart: (e: React.PointerEvent, direction: string, modalType: string) => void;
    restoreRequest?: number;
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
    onUpdateDevice,
    handleCommand,
    handleClearTerminal,
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
    className,
    restoreRequest
}: UnifiedDevicePanelProps) {
    const graphicsQuality = useGraphicsQuality();

    const [isDhcpModalOpen, setIsDhcpModalOpen] = React.useState(false);
    const [isAutomationWindowOpen, setIsAutomationWindowOpen] = React.useState(false);
    const isNarrow = modalSize.width < 1100;

    useEffect(() => {
        const handleOpenNetdevops = (e: Event) => {
            const customEvent = e as CustomEvent<{ deviceId?: string }>;
            if (!customEvent.detail?.deviceId || customEvent.detail.deviceId === deviceId) {
                setIsAutomationWindowOpen(true);
            }
        };
        window.addEventListener('open-netdevops-window', handleOpenNetdevops);
        return () => window.removeEventListener('open-netdevops-window', handleOpenNetdevops);
    }, [deviceId]);

    const currentDevice = useMemo(() => {
        return topologyDevices?.find(d => d.id === deviceId);
    }, [topologyDevices, deviceId]);

    const deviceName = useMemo(() => {
        const deviceObj = topologyDevices?.find(d => d.id === deviceId);
        const deviceState = deviceStates.get(deviceId);
        const rawName = deviceObj?.name || (deviceState?.hostname !== 'Switch' ? deviceState?.hostname : undefined);
        if (deviceType === 'hub') return rawName || 'Hub';
        if (deviceType === 'cloud') return rawName || 'Cloud';
        return rawName || deviceState?.hostname || deviceObj?.name || deviceId;
    }, [deviceStates, deviceId, deviceType, topologyDevices]);

    const deviceModel = useMemo(() => {
        if (deviceType === 'router') return 'NS-R-4451-X';
        if (deviceType === 'switchL2' || deviceType === 'switchL3') return state?.switchModel || 'NS-L2-24TT-L';
        return '';
    }, [deviceType, state]);

    const isOffline = useMemo(() => {
        return topologyDevices.some(d => d.id === deviceId && d.status === 'offline');
    }, [topologyDevices, deviceId]);
    const hasTaskSystem = deviceType === 'switchL2' || deviceType === 'switchL3' || deviceType === 'router';

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
        return () => {
            window.removeEventListener('mobile-back-pressed', handleMobileBack);
        };
    }, [isOpen, onOpenChange]);

    return (
        <>
        <DraggableWindowWrapper
            id={deviceId || "deviceUnified"}
            className={`${graphicsQuality === 'high' ? `liquid-glass-light ${isDark ? '!bg-secondary-950/90 border-emerald-950/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]' : '!bg-white/90 border-emerald-950/80 shadow-[0_8px_28px_rgba(15,23,42,0.12)]'}` : (isDark ? '!bg-secondary-950 !border-secondary-800' : '!bg-white !border-secondary-200')} ${className || ''}`}
            title={
                deviceType === 'iot' ? (
                    <div className="flex items-center gap-2 px-2">
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border shadow-sm",
                            isDark ? "bg-cyan-950/60 border-cyan-800 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                        )}>
                            <Cpu className="w-4 h-4 text-cyan-400" />
                            <span>{deviceName}</span>
                            <span className="opacity-60 text-[10px] uppercase">({deviceType})</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-2">
                        <Tabs value={activeTab} onValueChange={(v: string) => onTabChange(v as 'console' | 'settings' | 'stp' | 'physical')} className="min-w-0">
                            <TabsList className={cn("h-7 p-0.5", isDark ? "bg-secondary-800" : "bg-secondary-100")}>
                                <TabsTrigger value="console" className="flex items-center gap-1.5 px-2 h-6 text-xs">
                                    {DEVICE_CONSOLE_TAB_ICONS[deviceType] ?? <TerminalIcon className="w-3 h-3" />}
                                    <span className="hidden sm:inline">
                                        {deviceType === 'hub' ? (language === 'tr' ? 'Hub Durumu' : 'Hub Status')
                                            : deviceType === 'cloud' ? (language === 'tr' ? 'Bulut & WAN' : 'Cloud & WAN')
                                                : deviceType === 'printer' ? (language === 'tr' ? 'Yazıcı Kontrol' : 'Printer Control')
                                                    : deviceType === 'mobile' ? (language === 'tr' ? 'Mobil Ekran' : 'Mobile Screen')
                                                        : t.cliInterface}
                                    </span>
                                </TabsTrigger>

                                {deviceType !== 'cloud' && deviceType !== 'printer' && deviceType !== 'mobile' && deviceType !== 'hub' && (
                                    <TabsTrigger value="settings" className="flex items-center gap-1.5 px-2 h-6 text-xs">
                                        <Settings className="w-3 h-3" />
                                        <span className="hidden sm:inline">{t.quickSettingsAndTasks}</span>
                                    </TabsTrigger>
                                )}

                                {(deviceType === 'switchL2' || deviceType === 'switchL3' || deviceType === 'router') && (
                                    <TabsTrigger value="stp" className="flex items-center gap-1.5 px-2 h-6 text-xs">
                                        <Layers className="w-3 h-3 text-warning-500" />
                                        <span className="hidden sm:inline">{deviceType === 'router' ? (language === 'tr' ? 'Ağ & Detaylar' : 'Network & Details') : t.stpTab}</span>
                                    </TabsTrigger>
                                )}

                                {(deviceType === 'switchL2' || deviceType === 'switchL3' || deviceType === 'router' || deviceType === 'firewall') && (
                                    <TabsTrigger value="physical" className="flex items-center gap-1.5 px-2 h-6 text-xs">
                                        <Cpu className="w-3 h-3 text-emerald-400" />
                                        <span className="hidden sm:inline">{language === 'tr' ? 'Fiziksel Görünüm' : 'Physical View'}</span>
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
                            {deviceType !== 'hub' && deviceType !== 'cloud' && (
                                <span className="opacity-50 text-[9px] uppercase">({deviceType})</span>
                            )}
                        </div>
                    </div>
                )
            }
            isOpen={isOpen}
            onClose={() => onOpenChange(false)}
            isDark={isDark}
            modalPosition={modalPosition}
            modalSize={modalSize}
            contentInset
            handlePointerDown={handlePointerDown}
            handleResizeStart={handleResizeStart}
            collapsible
            restoreRequest={restoreRequest}
            headerActions={
                (deviceType === 'switchL2' || deviceType === 'switchL3' || deviceType === 'router') ? (
                    <button
                        onClick={() => setIsAutomationWindowOpen(true)}
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all mr-1.5",
                            isDark
                                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/50"
                                : "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        )}
                        title={language === 'tr' ? "NetDevOps & RESTCONF Otomasyonu Aç" : "Open NetDevOps & RESTCONF Automation"}
                    >
                        <Code className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden md:inline font-mono">NetDevOps/API</span>
                    </button>
                ) : undefined
            }
        >
            <div className="flex-1 overflow-hidden relative">
                <Tabs value={activeTab} className="h-full">
                    <TabsContent value="console" className="h-full m-0 p-0 overflow-hidden">
                        {deviceType === 'hub' ? (
                            <div className="h-full overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                                    <DeviceIcon type="hub" size={28} color="var(--color-teal-500)" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold">Layer-1 Multiport Hub</h3>

                                    <p className="text-xs opacity-70 max-w-md leading-relaxed">
                                        {language === 'tr'
                                            ? 'Bu cihaz Katman-1 (fiziksel katman) çoklu port tekrarlayıcıdır. Yapılandırılamaz (unmanaged) yapıda olduğundan VLAN, MAC adresi tablosu veya CLI komut arayüzü bulunmaz. Gelen sinyalleri tüm bağlı aktif portlara aynen iletir.'
                                            : 'This device is an unmanaged Layer-1 multiport repeater. It has no CLI, VLAN support, or MAC address table. It automatically repeats incoming frames out all connected ports.'}
                                    </p>
                                </div>
                                <div className="w-full max-w-md border border-secondary-800/40 rounded-xl p-4 bg-secondary-900/20 text-left space-y-3">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span>{language === 'tr' ? 'Port Durumu (8x FastEthernet)' : 'Port Status (8x FastEthernet)'}</span>
                                        <span className="text-[10px] text-cyan-400 uppercase font-mono">Unmanaged L1</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(topologyDevices.find(d => d.id === deviceId)?.ports || []).map((port) => (
                                            <div key={port.id} className="flex items-center gap-1.5 p-2 rounded-lg bg-secondary-800/30 border border-secondary-700/30 text-[11px]">
                                                <div className={cn("w-2 h-2 rounded-full shrink-0", isOffline || port.status !== 'connected' ? "bg-secondary-500" : "bg-success-500")} />
                                                <span className="font-mono font-medium">{port.label || port.id}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : deviceType === 'cloud' ? (
                            <CloudDeviceView
                                device={topologyDevices.find(d => d.id === deviceId) || { id: deviceId, type: 'cloud', name: deviceName, x: 0, y: 0, ip: '', status: 'online', ports: [] }}
                                topologyDevices={topologyDevices}
                                topologyConnections={topologyConnections}
                                isDark={isDark}
                                language={language}
                            />
                        ) : deviceType === 'printer' ? (
                            <PrinterDeviceView
                                device={topologyDevices.find(d => d.id === deviceId) || { id: deviceId, type: 'printer', name: deviceName, x: 0, y: 0, ip: '192.168.1.50', status: 'online', ports: [] }}
                                topologyDevices={topologyDevices}
                                topologyConnections={topologyConnections}
                                deviceStates={deviceStates}
                                isDark={isDark}
                                language={language}
                            />
                        ) : deviceType === 'mobile' ? (
                            <MobileDeviceView
                                device={topologyDevices.find(d => d.id === deviceId) || { id: deviceId, type: 'mobile', name: deviceName, x: 0, y: 0, ip: '192.168.1.105', status: 'online', ports: [] }}
                                topologyDevices={topologyDevices}
                                topologyConnections={topologyConnections}
                                deviceStates={deviceStates}
                                isDark={isDark}
                                language={language}
                            />
                        ) : deviceType === 'iot' ? (
                            <IotDeviceView
                                device={topologyDevices.find(d => d.id === deviceId) || { id: deviceId, type: 'iot', name: deviceName, x: 0, y: 0, ip: '192.168.1.100', status: 'online', ports: [] }}
                                topologyDevices={topologyDevices}
                                topologyConnections={topologyConnections}
                                deviceStates={deviceStates}
                                isDark={isDark}
                                language={language}
                            />
                        ) : (
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
                                showPowerButton={false}
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
                        )}
                    </TabsContent>
                    <TabsContent value="settings" className="h-full m-0 p-0 overflow-y-auto custom-scrollbar">
                        <UnifiedSettingsTab
                            deviceId={deviceId}
                            deviceType={deviceType}
                            deviceName={deviceName}
                            deviceModel={deviceModel}
                            deviceStates={deviceStates}
                            topologyDevices={topologyDevices}
                            topologyConnections={topologyConnections}
                            state={state}
                            isDark={isDark}
                            isOffline={isOffline}
                            theme={theme}
                            language={language}
                            t={t}
                            handleCommand={handleCommand}
                            hasTaskSystem={hasTaskSystem}
                            activeDeviceTasks={activeDeviceTasks}
                            taskContext={taskContext}
                            isNarrow={isNarrow}
                        />
                    </TabsContent>

                    <TabsContent value="stp" className="h-full m-0 p-0 overflow-y-auto custom-scrollbar">
                        <UnifiedStpTab
                            deviceId={deviceId}
                            deviceType={deviceType}
                            deviceStates={deviceStates}
                            topologyDevices={topologyDevices}
                            topologyConnections={topologyConnections}
                            isDark={isDark}
                            language={language}
                            handleCommand={handleCommand}
                            setIsAutomationWindowOpen={setIsAutomationWindowOpen}
                        />
                    </TabsContent>

                    <TabsContent value="physical" className="h-full m-0 p-0 overflow-hidden">
                        {currentDevice && (
                            <PhysicalDeviceView
                                device={currentDevice}
                                switchState={state}
                                connections={topologyConnections || []}
                                onUpdateDevice={onUpdateDevice}
                                isDark={isDark}
                                language={language}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </DraggableWindowWrapper>

        {isDhcpModalOpen && (
            <DhcpPoolManagerModal
                open={isDhcpModalOpen}
                onOpenChange={setIsDhcpModalOpen}
                deviceId={deviceId}
                deviceName={deviceName}
                state={state}
                isDark={isDark}
                language={language === 'tr' ? 'tr' : 'en'}
            />
        )}

        {isAutomationWindowOpen && (
            <NetworkAutomationPanel
                isOpen={isAutomationWindowOpen}
                onClose={() => setIsAutomationWindowOpen(false)}
                devices={topologyDevices}
                deviceStates={deviceStates}
                defaultDeviceId={deviceId}
                isDark={isDark}
            />
        )}
        </>
    );
}
