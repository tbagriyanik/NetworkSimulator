import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Layers } from 'lucide-react';
import { type BroadcastAnimTarget } from '@/hooks/networkTopology/usePingSequence';
import { cn } from '@/lib/utils';
import { PacketTraceInspector } from './PacketTraceInspector';
import type { PacketProtocolType } from '@/lib/network/forwarding/packetFrame';
import type { PipelineResult } from '@/lib/network/forwarding/packetPipeline';

import { tr, en } from './packetInfo/translations';
import { CableIcon, getCableColor } from './packetInfo/CableIcon';
import { PacketFieldRow as FieldRow } from './packetInfo/PacketFieldRow';
import { MobilePacketTables } from './packetInfo/MobilePacketTables';
import { type HopPacketInfo, buildHopPacketInfos } from './packetInfo/hopPacketTransformer';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { useDrag } from '@/hooks/useDrag';

export type { HopPacketInfo };
export { buildHopPacketInfos };

interface PingPacketInfoPanelProps {
    isVisible: boolean;
    isPaused: boolean;
    hopPacketInfos: HopPacketInfo[];
    currentHopIndex: number;
    totalHops: number;
    onPlay: () => void;
    onPause: () => void;
    onNext: () => void;
    onClose: () => void;
    language: 'tr' | 'en';
    isDark: boolean;
    graphicsQuality?: 'high' | 'low';
    zIndex?: number;
    isMobile?: boolean;
    onFocus?: () => void;
    isFocused?: boolean;
    // Result props
    success?: boolean | null;
    isReturn?: boolean;
    errorMessage?: string;
    sourceName?: string;
    targetName?: string;
    sourceIp?: string;
    targetIp?: string;
    broadcastAnim?: BroadcastAnimTarget[];
    broadcastProgress?: number;
}

function getCableLabel(cableType: string, t: typeof tr) {
    if (cableType === 'wireless') return t.wireless;
    if (cableType === 'crossover') return t.crossover;
    if (cableType === 'fiber') return t.fiber;
    if (cableType === 'console') return t.console;
    if (cableType === 'serial') return t.serial;
    return t.wired;
}

export function PingPacketInfoPanel({
    isVisible,
    isPaused,
    hopPacketInfos,
    currentHopIndex,
    onPlay,
    onPause,
    onNext,
    onClose,
    language,
    isDark,
    graphicsQuality = 'high',
    zIndex: _zIndex,
    isMobile = false,
    onFocus,
    isFocused: _isFocused,
    success,
    isReturn,
    errorMessage,
    sourceName,
    targetName,
    targetIp,
    broadcastAnim,
    broadcastProgress,
}: PingPacketInfoPanelProps) {
    const t = language === 'tr' ? tr : en;
    const [activeTab, setActiveTab] = useState<'flow' | 'trace'>('flow');

    const dragProps = useDrag({
        storageKey: 'pingPacketInfoPanel',
        defaultPosition: typeof window !== 'undefined' ? { x: Math.max(16, (window.innerWidth - 820) / 2), y: window.innerHeight - 440 } : { x: 16, y: 72 },
        defaultSize: { width: 820, height: 420 },
        minSize: { width: 450, height: 300 },
        mode: 'drag-resize'
    });

    const pipelineResult = React.useMemo<PipelineResult | null>(() => {
        if (!hopPacketInfos || hopPacketInfos.length === 0) return null;
        return {
            success: success !== false,
            dropReason: errorMessage || (success === false ? 'Packet delivery failed' : undefined),
            capturedOnLinks: [],
            allTraces: hopPacketInfos.flatMap((hop, idx) => [
                {
                    hopIndex: idx,
                    deviceId: hop.fromDevice.name,
                    deviceName: hop.fromDevice.name,
                    portId: 'Fa0/1',
                    stage: 'ingress-l1' as const,
                    action: 'pass' as const,
                    reason: `Physical link check OK (${hop.cableType})`,
                    frameSnapshot: {
                        id: `frame-${idx}-1`,
                        timestamp: Date.now(),
                        etherType: '0x0800',
                        srcMac: hop.srcMac,
                        dstMac: hop.dstMac,
                        srcIp: hop.srcIp,
                        dstIp: hop.dstIp,
                        protocol: (hop.protocol || 'ICMP') as PacketProtocolType,
                        length: 64,
                        ttl: hop.ttl,
                        ingressPortId: 'Fa0/1',
                        vlanId: 1,
                        info: `${hop.protocol} Echo Request seq ${hop.icmpSeq}`,
                    },
                },
                {
                    hopIndex: idx,
                    deviceId: hop.fromDevice.name,
                    deviceName: hop.fromDevice.name,
                    portId: 'Fa0/1',
                    stage: (hop.fromDevice.type.includes('router') ? 'route-lookup' : 'mac-lookup'),
                    action: 'forward' as const,
                    reason: hop.actionDescription || `Forwarding frame from ${hop.fromDevice.name} to ${hop.toDevice.name}`,
                    frameSnapshot: {
                        id: `frame-${idx}-2`,
                        timestamp: Date.now(),
                        etherType: '0x0800',
                        srcMac: hop.srcMac,
                        dstMac: hop.dstMac,
                        srcIp: hop.srcIp,
                        dstIp: hop.dstIp,
                        protocol: (hop.protocol || 'ICMP') as PacketProtocolType,
                        length: 64,
                        ttl: hop.ttl,
                        ingressPortId: 'Fa0/1',
                        vlanId: 1,
                        info: `${hop.protocol} forwarding`,
                    },
                },
            ]),
            hopResults: hopPacketInfos.map((hop, idx) => ({
                deviceId: hop.fromDevice.name,
                accepted: true,
                trapToControlPlane: false,
                egressPorts: ['Fa0/1'],
                nextDeviceId: hop.toDevice.name,
                traces: [
                    {
                        hopIndex: idx,
                        deviceId: hop.fromDevice.name,
                        deviceName: hop.fromDevice.name,
                        portId: 'Fa0/1',
                        stage: 'ingress-l1' as const,
                        action: 'pass' as const,
                        reason: `Physical link check OK (${hop.cableType})`,
                        frameSnapshot: {
                            id: `frame-${idx}-1`,
                            timestamp: Date.now(),
                            etherType: '0x0800',
                            srcMac: hop.srcMac,
                            dstMac: hop.dstMac,
                            srcIp: hop.srcIp,
                            dstIp: hop.dstIp,
                            protocol: (hop.protocol || 'ICMP') as PacketProtocolType,
                            length: 64,
                            ttl: hop.ttl,
                            ingressPortId: 'Fa0/1',
                            vlanId: 1,
                            info: `${hop.protocol} Echo Request seq ${hop.icmpSeq}`,
                        },
                    },
                    {
                        hopIndex: idx,
                        deviceId: hop.fromDevice.name,
                        deviceName: hop.fromDevice.name,
                        portId: 'Fa0/1',
                        stage: (hop.fromDevice.type.includes('router') ? 'route-lookup' : 'mac-lookup'),
                        action: 'forward' as const,
                        reason: hop.actionDescription || `Forwarding frame from ${hop.fromDevice.name} to ${hop.toDevice.name}`,
                        frameSnapshot: {
                            id: `frame-${idx}-2`,
                            timestamp: Date.now(),
                            etherType: '0x0800',
                            srcMac: hop.srcMac,
                            dstMac: hop.dstMac,
                            srcIp: hop.srcIp,
                            dstIp: hop.dstIp,
                            protocol: (hop.protocol || 'ICMP') as PacketProtocolType,
                            length: 64,
                            ttl: hop.ttl,
                            ingressPortId: 'Fa0/1',
                            vlanId: 1,
                            info: `${hop.protocol} forwarding`,
                        },
                    },
                ],
            })),
        };
    }, [hopPacketInfos, success, errorMessage]);

    const isGlass = graphicsQuality === 'high';
    const hasBroadcastEffect = Boolean(broadcastAnim && broadcastAnim.length > 0 && broadcastProgress !== undefined && broadcastProgress > 0 && broadcastProgress < 1);

    const broadcastSvgData = React.useMemo(() => {
        if (!broadcastAnim || broadcastAnim.length === 0) return [];
        const xs = broadcastAnim.flatMap(bt => [bt.fromX, bt.toX]);
        const ys = broadcastAnim.flatMap(bt => [bt.fromY, bt.toY]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);

        return broadcastAnim.map(bt => {
            const fromX = 40 + ((bt.fromX - minX) / spanX) * 400;
            const fromY = 90 - ((bt.fromY - minY) / spanY) * 60;
            const toX = 40 + ((bt.toX - minX) / spanX) * 400;
            const toY = 90 - ((bt.toY - minY) / spanY) * 60;
            const x = fromX + (toX - fromX) * (broadcastProgress ?? 0);
            const y = fromY + (toY - fromY) * (broadcastProgress ?? 0);
            return { ...bt, fromX: fromX, fromY: fromY, toX: toX, toY: toY, x, y };
        });
    }, [broadcastAnim, broadcastProgress]);

    const [isMinimized, setIsMinimized] = React.useState(false);

    // If it is paused or finished (success is true/false), auto-maximize/expand
    React.useEffect(() => {
        if (isPaused || success === true || success === false) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsMinimized(false);
        }
    }, [isPaused, success]);

    const handlePlay = () => {
        setIsMinimized(true);
        onPlay();
    };

    const handleNext = () => {
        setIsMinimized(true);
        onNext();
    };

    // Show packet tables when paused or done — derived directly from props, no local state
    const showPacketTables = isPaused || success !== null;

    // P = Play/Pause, N = Next Hop, ESC = Close keyboard shortcuts
    React.useEffect(() => {
        if (!isVisible) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                if (isPaused) handlePlay();
                else onPause();
            } else if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                if (isPaused) handleNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, isPaused, handlePlay, onPause, handleNext, onClose]);

    // Mobile back button support
    React.useEffect(() => {
        if (!isVisible || !isMobile) return;
        const handleBackButton = (e: PopStateEvent) => {
            e.preventDefault();
            onClose();
        };
        window.addEventListener('popstate', handleBackButton);
        return () => window.removeEventListener('popstate', handleBackButton);
    }, [isVisible, isMobile, onClose]);

    if (!isVisible) return null;

    const totalHopCount = hopPacketInfos.length;
    const safeIdx = Math.min(Math.max(0, currentHopIndex), Math.max(0, totalHopCount - 1));
    const currentInfo = totalHopCount > 0 ? hopPacketInfos[safeIdx] : null;
    const prevInfo = safeIdx > 0 ? hopPacketInfos[safeIdx - 1] : null;

    const macChanged = prevInfo ? (currentInfo?.srcMac !== prevInfo.srcMac || currentInfo?.dstMac !== prevInfo.dstMac) : false;
    const ipSame = prevInfo ? (currentInfo?.srcIp === prevInfo.srcIp && currentInfo?.dstIp === prevInfo.dstIp) : true;
    const ttlChanged = prevInfo ? currentInfo?.ttl !== prevInfo.ttl : false;

    const isDone = success === true || success === false;
    const isSuccess = success === true;
    const isFailure = success === false;

    const titleContent = (
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                className={`flex-shrink-0 ${isSuccess ? 'text-success-500' : isFailure ? 'text-error-500' : isReturn ? 'text-warning-400' : 'text-accent-500'}`}>
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-semibold text-sm truncate shrink-0">{t.title}</span>

            {isReturn ? (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${isDark ? 'bg-warning-900/50 text-warning-300 border border-warning-800/40' : 'bg-warning-50 text-warning-700 border border-warning-200'}`}>
                    ↩ {isMobile ? '' : t.returnLabel}
                </span>
            ) : (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${isDark ? 'bg-accent-900/50 text-accent-300 border border-accent-800/40' : 'bg-accent-50 text-accent-700 border border-accent-200'}`}>
                    → {isMobile ? '' : t.forwardLabel}
                </span>
            )}

            {!isDone && totalHopCount > 0 && !isMobile && (
                <div className="flex items-center gap-1 shrink-0">
                    {Array.from({ length: totalHopCount }).map((_, i) => (
                        <div key={i} className={`rounded-full transition-all duration-300 ${i === safeIdx ? 'w-4 h-2 bg-accent-500' : i < safeIdx ? (isDark ? 'w-2 h-2 bg-secondary-500' : 'w-2 h-2 bg-secondary-400') : (isDark ? 'w-2 h-2 bg-secondary-700' : 'w-2 h-2 bg-secondary-200')}`} title={`${t.hop} ${i + 1}`} />
                    ))}
                </div>
            )}

            {!isDone && totalHopCount > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold shrink-0 ${isDark ? 'bg-secondary-700/60 text-secondary-300' : 'bg-secondary-100 text-secondary-600'}`}>
                    {t.hop} {safeIdx + 1}/{totalHopCount}
                </span>
            )}

            {isPaused && !isDone && (
                <span className={`${isMobile ? 'w-2 h-2 bg-warning-500 rounded-full animate-pulse shrink-0' : 'text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ' + (isDark ? 'bg-warning-900/50 text-warning-300 border border-warning-800/40' : 'bg-warning-50 text-warning-700 border border-warning-200')}`}>
                    {!isMobile && <>{'⏸ '}{t.paused}</>}
                </span>
            )}
        </div>
    );

    const headerActions = (
        <div className="flex items-center gap-1">
            {!isDone && (
                <>
                    {isPaused ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePlay();
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="p-1.5 rounded bg-success-500 hover:bg-success-600 text-white transition-all shadow-sm flex items-center justify-center active:scale-95"
                            title={t.play}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                        </button>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onPause();
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="p-1.5 rounded bg-warning-500 hover:bg-warning-600 text-white transition-all shadow-sm flex items-center justify-center active:scale-95"
                            title={t.pause}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isPaused) handleNext();
                        }}
                        disabled={!isPaused}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`p-1.5 rounded transition-all shadow-sm flex items-center justify-center ${isPaused ? 'bg-primary-500 hover:bg-primary-600 text-white active:scale-95' : 'bg-secondary-200 dark:bg-secondary-800 text-secondary-400 dark:text-secondary-600 cursor-not-allowed opacity-50'}`}
                        title={t.next}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5,3 14,12 5,21" /><rect x="16" y="3" width="3" height="18" />
                        </svg>
                    </button>
                </>
            )}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(prev => !prev);
                }}
                className={`p-1 rounded transition-colors ${isDark ? 'text-secondary-400 hover:text-white hover:bg-white/10' : 'text-secondary-500 hover:bg-black/5'}`}
                title={isMinimized ? (language === 'tr' ? 'Büyüt' : 'Expand') : (language === 'tr' ? 'Minimize Et' : 'Minimize')}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
        </div>
    );

    return (
        <>
            <DraggableWindowWrapper
                id="pingPacketInfoPanel"
                title={titleContent}
                icon={<div className="w-5 h-5 flex items-center justify-center" />}
                isOpen={isVisible}
                onClose={onClose}
                isDark={isDark}
                modalPosition={{ x: dragProps.position.x, y: dragProps.position.y }}
                modalSize={{ width: dragProps.size.width, height: isMinimized ? 38 : dragProps.size.height }}
                handlePointerDown={dragProps.handlePointerDown}
                handleResizeStart={dragProps.handleResizeStart}
                className={cn(
                    'overflow-hidden',
                    isGlass
                        ? (isDark
                            ? 'liquid-glass-light !bg-secondary-950/90 border-emerald-950/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]'
                            : 'liquid-glass-light !bg-white/90 border-emerald-950/80 shadow-[0_8px_28px_rgba(15,23,42,0.12)]')
                        : (isDark
                            ? '!bg-secondary-950/40 border-emerald-950/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]'
                            : '!bg-white/95 border-emerald-950/80 shadow-[0_8px_28px_rgba(15,23,42,0.10)]'))
                }
                contentClassName="min-h-0"
                mobileFullScreen={false}
                headerActions={headerActions}
                collapsible={false}
                contentInset
                disableResize={isMinimized}
                onHeaderDoubleClick={() => setIsMinimized(prev => !prev)}
            >
                {!isMinimized && (
                    <div className="flex-1 overflow-hidden min-h-0 flex flex-col" onMouseDown={onFocus}>
                        {/* Play/Pause & Tab control bar */}
                        <div className="flex items-center justify-between p-2 border-b shrink-0 dark:border-secondary-800 bg-secondary-50/50 dark:bg-secondary-950/50 gap-2">
                            <div className="flex items-center gap-2">
                                {/* Segmented Tab Switcher */}
                                <div className={`flex items-center p-0.5 rounded-lg border ${isDark ? 'bg-secondary-900/80 border-secondary-800' : 'bg-secondary-200/70 border-secondary-300'
                                    }`}>
                                    <button
                                        onClick={() => setActiveTab('flow')}
                                        className={cn(
                                            "px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                                            activeTab === 'flow'
                                                ? (isDark ? "bg-secondary-800 text-white shadow-sm font-semibold" : "bg-white text-secondary-900 shadow-sm font-semibold")
                                                : (isDark ? "text-secondary-400 hover:text-secondary-200" : "text-secondary-600 hover:text-secondary-900")
                                        )}
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>{t.tabFlow}</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('trace')}
                                        className={cn(
                                            "px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                                            activeTab === 'trace'
                                                ? (isDark ? "bg-sky-900/60 text-sky-200 border border-sky-500/40 shadow-sm font-semibold" : "bg-sky-50 text-sky-800 border border-sky-300 shadow-sm font-semibold")
                                                : (isDark ? "text-secondary-400 hover:text-secondary-200" : "text-secondary-600 hover:text-secondary-900")
                                        )}
                                        title={t.traceDetailsTooltip}
                                    >
                                        <Activity className="w-3.5 h-3.5 text-sky-400" />
                                        <span>{t.tabTrace}</span>
                                        {hopPacketInfos.length > 0 && (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                                {hopPacketInfos.length}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {isPaused && currentInfo?.actionDescription && !isDone && (
                                <div className={`flex-1 mx-2 px-3 py-1.5 rounded-lg border text-[11px] font-medium leading-normal truncate ${isDark
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                    : 'bg-amber-50 border-amber-200 text-amber-900'
                                    }`}>
                                    <span className={`font-bold mr-1.5 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{t.actionLabel}</span>
                                    <span>{currentInfo.actionDescription}</span>
                                </div>
                            )}
                        </div>

                        {activeTab === 'flow' ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                {hasBroadcastEffect && (
                                    <div className={`mx-3 mt-3 rounded-xl border ${isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50'} p-2`}>
                                        <div className={`mb-1.5 flex items-center justify-between gap-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{language === 'tr' ? 'ARP Broadcast' : 'ARP Broadcast'}</span>
                                            <span className="text-[10px] font-mono">ff:ff:ff:ff:ff:ff</span>
                                        </div>
                                        <svg viewBox="0 0 480 120" className="h-24 w-full overflow-visible">
                                            <defs>
                                                <filter id="panel-broadcast-glow" x="-50%" y="-50%" width="200%" height="200%">
                                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                                    <feMerge>
                                                        <feMergeNode in="blur" />
                                                        <feMergeNode in="SourceGraphic" />
                                                    </feMerge>
                                                </filter>
                                            </defs>
                                            <rect x="10" y="18" width="460" height="84" rx="18" fill="var(--color-warning-500)" fillOpacity={isDark ? 0.06 : 0.08} stroke={isDark ? 'var(--color-warning-500)' : 'var(--color-amber-700)'} strokeOpacity={isDark ? 0.35 : 0.28} />
                                            <path d="M 40 60 C 140 30, 180 95, 240 60 S 360 35, 440 60" fill="none" stroke={isDark ? 'var(--color-warning-500)' : 'var(--color-amber-700)'} strokeOpacity={isDark ? 0.28 : 0.22} strokeWidth="2" strokeDasharray="7 9" />
                                            {broadcastSvgData.map((bt, i) => (
                                                <g key={`${bt.targetId}-${i}`}>
                                                    <line x1={bt.fromX} y1={bt.fromY} x2={bt.x} y2={bt.y} stroke={isDark ? 'var(--color-warning-500)' : 'var(--color-amber-700)'} strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" opacity={0.8} />
                                                    <circle cx={bt.x} cy={bt.y} r="7" fill={isDark ? 'var(--color-warning-500)' : 'var(--color-amber-600)'} filter="url(#panel-broadcast-glow)" opacity={0.9} />
                                                    <rect x={bt.x - 10} y={bt.y - 8} width="20" height="16" rx="3" fill={isDark ? 'var(--color-warning-500)' : 'var(--color-amber-600)'} opacity={0.9} />
                                                    <path d={`M ${bt.x - 7} ${bt.y - 2} L ${bt.x} ${bt.y + 5} L ${bt.x + 7} ${bt.y - 2}`} fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                                </g>
                                            ))}
                                        </svg>
                                    </div>
                                )}
                                {/* Result banner */}
                                {isDone && (
                                    <div className={`px-5 py-3 flex items-start gap-3 border-b ${isSuccess
                                        ? isGlass
                                            ? (isDark ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200')
                                            : (isDark ? 'bg-emerald-950/50 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200')
                                        : isGlass
                                            ? (isDark ? 'bg-red-950/60 border-red-500/30' : 'bg-red-50 border-red-200')
                                            : (isDark ? 'bg-red-950/70 border-red-800/60' : 'bg-red-50 border-red-200')
                                        }`}>
                                        {isSuccess ? (
                                            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-red-500/20 dark:bg-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 border border-red-500/40">
                                                <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            {isSuccess ? (
                                                <>
                                                    <div className={`text-sm font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>{t.successTitle}</div>
                                                    <div className={`text-xs mt-0.5 font-mono ${isDark ? 'text-emerald-200/90' : 'text-emerald-700'}`}>
                                                        {language === 'tr' ? `${targetIp || targetName}: bayt=32 TTL=${currentInfo?.ttl ?? 64}` : `Reply from ${targetIp || targetName}: bytes=32 TTL=${currentInfo?.ttl ?? 64}`}
                                                    </div>
                                                    <div className={`text-xs mt-0.5 ${isDark ? 'text-emerald-300/80' : 'text-emerald-600'}`}>{sourceName} → {targetName} → {sourceName}</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className={`text-sm font-bold ${isDark ? 'text-red-300' : 'text-red-800'}`}>{t.failTitle}</div>
                                                    {errorMessage && (
                                                        <div className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                                            <span className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>{t.failReason}:</span>{' '}
                                                            <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{errorMessage}</span>
                                                        </div>
                                                    )}
                                                    {currentInfo && (
                                                        <div className={`text-xs mt-1 font-mono flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                            <span>{language === 'tr' ? `${currentInfo.fromDevice.name} → ${currentInfo.toDevice.name} adımında başarısız` : `Failed at ${currentInfo.fromDevice.name} → ${currentInfo.toDevice.name}`}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Body */}
                                {currentInfo ? (
                                    <div className={isMobile ? 'px-3 py-2 space-y-2' : 'px-5 py-4 space-y-3'}>
                                        {/* Route bar */}
                                        <div className={`flex items-center gap-2 rounded-xl ${isMobile ? 'px-3 py-2' : 'px-4 py-2.5'} ${isGlass
                                            ? isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/8'
                                            : isDark ? 'bg-secondary-800/80 border border-secondary-700' : 'bg-secondary-100 border border-secondary-200'
                                            }`}>
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${currentInfo.fromDevice.type === 'router' ? 'bg-purple-500' : currentInfo.fromDevice.type.startsWith('switch') ? 'bg-accent-500' : 'bg-primary-500'}`} />
                                                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold truncate ${isDark ? 'text-secondary-200' : 'text-secondary-700'}`}>{currentInfo.fromDevice.name}</span>
                                                {!isMobile && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${isDark ? 'bg-white/10 text-secondary-400' : 'bg-black/10 text-secondary-500'}`}>{currentInfo.fromDevice.type}</span>}
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                                                <CableIcon cableType={currentInfo.cableType} color={getCableColor(currentInfo.cableType)} isMobile={isMobile} />
                                                {!isMobile && <span className="text-[10px] font-medium" style={{ color: getCableColor(currentInfo.cableType) }}>{getCableLabel(currentInfo.cableType, t)}</span>}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                                                {!isMobile && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${isDark ? 'bg-white/10 text-secondary-400' : 'bg-black/10 text-secondary-500'}`}>{currentInfo.toDevice.type}</span>}
                                                <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold truncate ${isDark ? 'text-secondary-200' : 'text-secondary-700'}`}>{currentInfo.toDevice.name}</span>
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${currentInfo.toDevice.type === 'router' ? 'bg-purple-500' : currentInfo.toDevice.type.startsWith('switch') ? 'bg-accent-500' : 'bg-primary-500'}`} />
                                            </div>
                                            {macChanged && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${isDark ? 'bg-warning-500/20 text-warning-300 border border-warning-500/30' : 'bg-warning-500/15 text-warning-700 border border-warning-500/30'}`}>⚡ {isMobile ? '' : t.macChanged}</span>
                                            )}
                                            {ipSame && prevInfo && !isMobile && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${isDark ? 'bg-success-500/20 text-success-300 border border-success-500/30' : 'bg-success-500/15 text-success-700 border border-success-500/30'}`}>✓ {t.ipSame}</span>
                                            )}
                                        </div>

                                        {/* Packet tables — 3 col desktop, 1 col mobile (tabs) */}
                                        {showPacketTables && (isMobile ? (
                                            <MobilePacketTables
                                                currentInfo={currentInfo}
                                                prevInfo={prevInfo}
                                                macChanged={macChanged}
                                                ttlChanged={ttlChanged}
                                                isDark={isDark}
                                                isGlass={isGlass}
                                                t={t}
                                            />
                                        ) : (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className={`rounded-xl overflow-hidden border ${isGlass
                                                    ? isDark ? 'border-success-400/20 bg-success-500/10' : 'border-success-400/30 bg-success-500/8'
                                                    : isDark ? 'border-success-900/60 bg-success-950/50' : 'border-success-200 bg-success-50'}`}
                                                    style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                                                    <div className={`px-3 py-1.5 text-[11px] font-bold tracking-wide border-b ${isGlass
                                                        ? isDark ? 'bg-success-500/15 border-success-400/20 text-success-400' : 'bg-success-500/10 border-success-400/20 text-success-700'
                                                        : isDark ? 'bg-success-950/60 border-success-900/60 text-success-400' : 'bg-success-100 border-success-200 text-success-700'}`}>{t.layer2}</div>
                                                    <table className="w-full"><tbody>
                                                        <FieldRow label={t.srcMac} value={currentInfo.srcMac} prevValue={prevInfo?.srcMac} highlight={macChanged ? 'changed' : 'none'} isDark={isDark} badge={macChanged ? t.changed : undefined} badgeColor="var(--color-warning-600)" />
                                                        <FieldRow label={t.dstMac} value={currentInfo.dstMac} prevValue={prevInfo?.dstMac} highlight={macChanged ? 'changed' : 'none'} isDark={isDark} />
                                                        <FieldRow label={t.etherType} value={currentInfo.etherType} isDark={isDark} />
                                                    </tbody></table>
                                                </div>
                                                <div className={`rounded-xl overflow-hidden border ${isGlass
                                                    ? isDark ? 'border-purple-400/20 bg-purple-500/10' : 'border-purple-400/30 bg-purple-500/8'
                                                    : isDark ? 'border-purple-900/60 bg-purple-950/50' : 'border-purple-200 bg-purple-50'}`}
                                                    style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                                                    <div className={`px-3 py-1.5 text-[11px] font-bold tracking-wide border-b ${isGlass
                                                        ? isDark ? 'bg-purple-500/15 border-purple-400/20 text-purple-400' : 'bg-purple-500/10 border-purple-400/20 text-purple-700'
                                                        : isDark ? 'bg-purple-950/60 border-purple-900/60 text-purple-400' : 'bg-purple-100 border-purple-200 text-purple-700'}`}>{currentInfo.layer3 === 'IPv6' ? (language === 'tr' ? 'Katman 3 — IPv6 Başlığı' : 'Layer 3 — IPv6 Header') : t.layer3}</div>
                                                    <table className="w-full"><tbody>
                                                        <FieldRow label={currentInfo.layer3 === 'IPv6' ? (t.srcIp.replace('IP', 'IPv6')) : t.srcIp} value={currentInfo.srcIp} highlight="same" isDark={isDark} />
                                                        <FieldRow label={currentInfo.layer3 === 'IPv6' ? (t.dstIp.replace('IP', 'IPv6')) : t.dstIp} value={currentInfo.dstIp} highlight="same" isDark={isDark} />
                                                        <FieldRow label={currentInfo.layer3 === 'IPv6' ? 'Hop Limit' : t.ttl} value={String(currentInfo.ttl)} prevValue={prevInfo ? String(prevInfo.ttl) : undefined} highlight={ttlChanged ? 'changed' : 'none'} isDark={isDark} badge={ttlChanged ? t.ttlDec : undefined} badgeColor="var(--color-warning-600)" />
                                                        <FieldRow label={t.protocol} value={currentInfo.protocol} isDark={isDark} />
                                                    </tbody></table>
                                                </div>
                                                <div className={`rounded-xl overflow-hidden border ${isGlass
                                                    ? isDark ? 'border-primary-400/20 bg-primary-500/10' : 'border-primary-400/30 bg-primary-500/8'
                                                    : isDark ? 'border-primary-900/60 bg-primary-950/50' : 'border-primary-200 bg-primary-50'}`}
                                                    style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                                                    <div className={`px-3 py-1.5 text-[11px] font-bold tracking-wide border-b ${isGlass
                                                        ? isDark ? 'bg-primary-500/15 border-primary-400/20 text-primary-400' : 'bg-primary-500/10 border-primary-400/20 text-primary-700'
                                                        : isDark ? 'bg-primary-950/60 border-primary-900/60 text-primary-400' : 'bg-primary-100 border-primary-200 text-primary-700'}`}>{currentInfo.layer4 === 'ICMPv6' ? (language === 'tr' ? 'Katman 4 — ICMPv6' : 'Layer 4 — ICMPv6') : t.layer4}</div>
                                                    <table className="w-full"><tbody>
                                                        <FieldRow label={currentInfo.layer4 === 'ICMPv6' ? 'ICMPv6 Type' : t.icmpType} value={currentInfo.icmpType} isDark={isDark} />
                                                        <FieldRow label={currentInfo.layer4 === 'ICMPv6' ? 'ICMPv6 Code' : t.icmpCode} value={String(currentInfo.icmpCode)} isDark={isDark} />
                                                        <FieldRow label={t.icmpSeq} value={String(currentInfo.icmpSeq)} isDark={isDark} />
                                                    </tbody></table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`px-5 py-8 text-center text-sm ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>{t.noHops}</div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                                <PacketTraceInspector embedded={true} pipelineResult={pipelineResult} isDark={isDark} language={language} />
                            </div>
                        )}
                    </div>
                )}
            </DraggableWindowWrapper>
        </>
    );
}

