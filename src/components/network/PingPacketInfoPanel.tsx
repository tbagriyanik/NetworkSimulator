import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CanvasDevice, CanvasConnection } from './networkTopology.types';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { X } from 'lucide-react';

export interface HopPacketInfo {
    hopIndex: number;
    fromDevice: { id: string; name: string; type: string; ip: string; mac: string };
    toDevice: { id: string; name: string; type: string; ip: string; mac: string };
    cableType: string;
    srcMac: string;
    dstMac: string;
    etherType: string;
    srcIp: string;
    dstIp: string;
    ttl: number;
    protocol: string;
    icmpType: string;
    icmpCode: number;
    icmpSeq: number;
    layer2: string;
    layer3: string;
    layer4: string;
}

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
    // Result props
    success?: boolean | null;
    isReturn?: boolean;
    errorMessage?: string;
    sourceName?: string;
    targetName?: string;
    sourceIp?: string;
    targetIp?: string;
}

const tr = {
    title: 'Paket Analizi',
    hop: 'Hop',
    of: '/',
    play: 'Oynat',
    pause: 'Duraklat',
    next: 'Sonraki Hop',
    close: 'Kapat',
    layer2: 'Katman 2 — Ethernet Çerçevesi',
    layer3: 'Katman 3 — IP Başlığı',
    layer4: 'Katman 4 — ICMP',
    srcMac: 'Kaynak MAC',
    dstMac: 'Hedef MAC',
    etherType: 'EtherType',
    srcIp: 'Kaynak IP',
    dstIp: 'Hedef IP',
    ttl: 'TTL',
    protocol: 'Protokol',
    icmpType: 'ICMP Tipi',
    icmpCode: 'ICMP Kodu',
    icmpSeq: 'Sıra No',
    noHops: 'Henüz hop yok',
    wireless: 'Kablosuz (WiFi)',
    wired: 'Kablolu (Ethernet)',
    crossover: 'Çapraz Kablo',
    fiber: 'Fiber Optik',
    console: 'Konsol',
    changed: 'Değişti',
    macChanged: 'MAC değişti — yönlendirme',
    ipSame: 'IP aynı kaldı — uçtan uca',
    ttlDec: 'TTL azaldı',
    segment: 'Segment',
    via: 'üzerinden',
    paused: 'Duraklatıldı',
    // Result strings
    successTitle: 'Ping Başarılı',
    successReply: 'Yanıt alındı',
    failTitle: 'Ping Başarısız',
    failReason: 'Hata nedeni',
    returnLabel: 'Echo Reply — Geri Dönüş',
    forwardLabel: 'Echo Request — İleri',
    replyFrom: 'Yanıt:',
    bytes: 'bayt',
    ttlLabel: 'TTL',
    timeLabel: 'süre',
    requestTimeout: 'İstek zaman aşımına uğradı',
};

const en = {
    title: 'Packet Analysis',
    hop: 'Hop',
    of: '/',
    play: 'Play',
    pause: 'Pause',
    next: 'Next Hop',
    close: 'Close',
    layer2: 'Layer 2 — Ethernet Frame',
    layer3: 'Layer 3 — IP Header',
    layer4: 'Layer 4 — ICMP',
    srcMac: 'Source MAC',
    dstMac: 'Dest MAC',
    etherType: 'EtherType',
    srcIp: 'Source IP',
    dstIp: 'Dest IP',
    ttl: 'TTL',
    protocol: 'Protocol',
    icmpType: 'ICMP Type',
    icmpCode: 'ICMP Code',
    icmpSeq: 'Seq No',
    noHops: 'No hops yet',
    wireless: 'Wireless (WiFi)',
    wired: 'Wired (Ethernet)',
    crossover: 'Crossover',
    fiber: 'Fiber Optic',
    console: 'Console',
    changed: 'Changed',
    macChanged: 'MAC changed — routing',
    ipSame: 'IP unchanged — end-to-end',
    ttlDec: 'TTL decremented',
    segment: 'Segment',
    via: 'via',
    paused: 'Paused',
    // Result strings
    successTitle: 'Ping Successful',
    successReply: 'Reply received',
    failTitle: 'Ping Failed',
    failReason: 'Reason',
    returnLabel: 'Echo Reply — Return',
    forwardLabel: 'Echo Request — Forward',
    replyFrom: 'Reply from',
    bytes: 'bytes',
    ttlLabel: 'TTL',
    timeLabel: 'time',
    requestTimeout: 'Request timed out',
};

function getCableLabel(cableType: string, t: typeof tr) {
    if (cableType === 'wireless') return t.wireless;
    if (cableType === 'crossover') return t.crossover;
    if (cableType === 'fiber') return t.fiber;
    if (cableType === 'console') return t.console;
    return t.wired;
}

function getCableColor(cableType: string) {
    if (cableType === 'crossover') return '#f97316'; // turuncu
    if (cableType === 'fiber') return '#f59e0b';
    if (cableType === 'console') return '#6b7280';
    return '#3b82f6'; // mavi — wireless ve straight (Ethernet)
}

// Kablo tipine göre SVG simgesi döndürür
function CableIcon({ cableType, color, width = 56, isMobile = false }: { cableType: string; color: string; width?: number; isMobile?: boolean }) {
    const w = isMobile ? 32 : width;
    if (cableType === 'wireless') {
        // WiFi dalgaları simgesi
        return (
            <svg width={w} height="16" viewBox="0 0 56 16" fill="none">
                {/* Merkez nokta */}
                <circle cx="28" cy="13" r="2" fill={color} />
                {/* İç dalga */}
                <path d="M22 10 Q28 5 34 10" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
                {/* Dış dalga */}
                <path d="M16 7 Q28 0 40 7" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
            </svg>
        );
    }
    if (cableType === 'crossover') {
        // Çapraz kablo — X geçişli çizgi
        return (
            <svg width={w} height="14" viewBox="0 0 56 14" fill="none">
                <line x1="0" y1="4" x2="24" y2="4" stroke={color} strokeWidth="2" />
                <line x1="24" y1="4" x2="32" y2="10" stroke={color} strokeWidth="2" />
                <line x1="32" y1="10" x2="48" y2="10" stroke={color} strokeWidth="2" />
                <line x1="24" y1="10" x2="32" y2="4" stroke={color} strokeWidth="2" />
                <line x1="0" y1="10" x2="24" y2="10" stroke={color} strokeWidth="2" />
                <line x1="32" y1="4" x2="48" y2="4" stroke={color} strokeWidth="2" />
                <polygon points="48,1 56,4 48,7" fill={color} />
                <polygon points="48,7 56,10 48,13" fill={color} />
            </svg>
        );
    }
    // Düz kablo (straight / fiber / default)
    return (
        <svg width={w} height="12" viewBox="0 0 56 12" fill="none">
            <line x1="0" y1="6" x2="48" y2="6" stroke={color} strokeWidth="2" />
            <polygon points="48,2 56,6 48,10" fill={color} />
        </svg>
    );
}

interface FieldRowProps {
    label: string;
    value: string;
    highlight?: 'changed' | 'same' | 'none';
    isDark: boolean;
    badge?: string;
    badgeColor?: string;
    prevValue?: string;
}

function FieldRow({ label, value, highlight = 'none', isDark, badge, badgeColor, prevValue }: FieldRowProps) {
    const highlightClass =
        highlight === 'changed'
            ? isDark ? 'text-amber-300' : 'text-amber-600'
            : highlight === 'same'
                ? isDark ? 'text-emerald-300' : 'text-emerald-600'
                : isDark ? 'text-slate-100' : 'text-slate-800';

    return (
        <tr className={`border-b last:border-0 ${isDark ? 'border-white/8' : 'border-black/6'}`}>
            <td className={`py-1 pr-3 text-xs font-medium whitespace-nowrap w-28 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {label}
            </td>
            <td className={`py-1 text-xs font-mono ${highlightClass}`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{value}</span>
                    {prevValue && prevValue !== value && (
                        <span className={`text-[10px] font-mono line-through opacity-50 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {prevValue}
                        </span>
                    )}
                    {badge && (
                        <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold"
                            style={{ background: badgeColor || '#6b7280', color: 'white' }}
                        >
                            {badge}
                        </span>
                    )}
                </div>
            </td>
        </tr>
    );
}

// Mobile compact: tabbed Layer 2 / 3 / 4 view
interface MobilePacketTablesProps {
    currentInfo: HopPacketInfo;
    prevInfo: HopPacketInfo | null;
    macChanged: boolean;
    ttlChanged: boolean;
    isDark: boolean;
    isGlass: boolean;
    t: typeof tr;
}

function MobilePacketTables({ currentInfo, prevInfo, macChanged, ttlChanged, isDark, isGlass, t }: MobilePacketTablesProps) {
    const [activeTab, setActiveTab] = React.useState<'l2' | 'l3' | 'l4'>('l2');

    const tabs = [
        { id: 'l2' as const, label: 'L2', color: 'emerald' },
        { id: 'l3' as const, label: 'L3', color: 'purple' },
        { id: 'l4' as const, label: 'L4', color: 'blue' },
    ];

    const tabColors = {
        blue: { active: isDark ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' : 'bg-blue-100 text-blue-700 border-blue-300', inactive: isDark ? 'text-slate-400' : 'text-slate-500' },
        emerald: { active: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300', inactive: isDark ? 'text-slate-400' : 'text-slate-500' },
        purple: { active: isDark ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 'bg-purple-100 text-purple-700 border-purple-300', inactive: isDark ? 'text-slate-400' : 'text-slate-500' },
    };

    const containerCls = {
        blue: isGlass ? (isDark ? 'border-blue-400/20 bg-blue-500/10' : 'border-blue-400/30 bg-blue-500/8') : (isDark ? 'border-blue-900/60 bg-blue-950/50' : 'border-blue-200 bg-blue-50'),
        emerald: isGlass ? (isDark ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-emerald-400/30 bg-emerald-500/8') : (isDark ? 'border-emerald-900/60 bg-emerald-950/50' : 'border-emerald-200 bg-emerald-50'),
        purple: isGlass ? (isDark ? 'border-purple-400/20 bg-purple-500/10' : 'border-purple-400/30 bg-purple-500/8') : (isDark ? 'border-purple-900/60 bg-purple-950/50' : 'border-purple-200 bg-purple-50'),
    };

    return (
        <div>
            {/* Tab bar */}
            <div className="flex gap-1 mb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition-all ${activeTab === tab.id ? tabColors[tab.color as keyof typeof tabColors].active : (isDark ? 'border-transparent text-slate-500' : 'border-transparent text-slate-400')}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {/* Active tab content */}
            {activeTab === 'l2' && (
                <div className={`rounded-xl overflow-hidden border ${containerCls.emerald}`}
                    style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                    <table className="w-full"><tbody>
                        <FieldRow label={t.srcMac} value={currentInfo.srcMac} prevValue={prevInfo?.srcMac} highlight={macChanged ? 'changed' : 'none'} isDark={isDark} badge={macChanged ? t.changed : undefined} badgeColor="#d97706" />
                        <FieldRow label={t.dstMac} value={currentInfo.dstMac} prevValue={prevInfo?.dstMac} highlight={macChanged ? 'changed' : 'none'} isDark={isDark} />
                        <FieldRow label={t.etherType} value={currentInfo.etherType} isDark={isDark} />
                    </tbody></table>
                </div>
            )}
            {activeTab === 'l3' && (
                <div className={`rounded-xl overflow-hidden border ${containerCls.purple}`}
                    style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                    <table className="w-full"><tbody>
                        <FieldRow label={currentInfo.layer3 === 'IPv6' ? (t.srcIp.replace('IP', 'IPv6')) : t.srcIp} value={currentInfo.srcIp} highlight="same" isDark={isDark} />
                        <FieldRow label={currentInfo.layer3 === 'IPv6' ? (t.dstIp.replace('IP', 'IPv6')) : t.dstIp} value={currentInfo.dstIp} highlight="same" isDark={isDark} />
                        <FieldRow label={currentInfo.layer3 === 'IPv6' ? 'Hop Limit' : t.ttl} value={String(currentInfo.ttl)} prevValue={prevInfo ? String(prevInfo.ttl) : undefined} highlight={ttlChanged ? 'changed' : 'none'} isDark={isDark} badge={ttlChanged ? t.ttlDec : undefined} badgeColor="#d97706" />
                        <FieldRow label={t.protocol} value={currentInfo.protocol} isDark={isDark} />
                    </tbody></table>
                </div>
            )}
            {activeTab === 'l4' && (
                <div className={`rounded-xl overflow-hidden border ${containerCls.blue}`}
                    style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                    <table className="w-full"><tbody>
                        <FieldRow label={currentInfo.layer4 === 'ICMPv6' ? 'ICMPv6 Type' : t.icmpType} value={currentInfo.icmpType} isDark={isDark} />
                        <FieldRow label={currentInfo.layer4 === 'ICMPv6' ? 'ICMPv6 Code' : t.icmpCode} value={String(currentInfo.icmpCode)} isDark={isDark} />
                        <FieldRow label={t.icmpSeq} value={String(currentInfo.icmpSeq)} isDark={isDark} />
                    </tbody></table>
                </div>
            )}
        </div>
    );
}

const PING_PANEL_STORAGE_KEY = 'draggable_position_ping-packet-info-panel';
const HEADER_SAFE_TOP = 72;

export function PingPacketInfoPanel({
    isVisible,
    isPaused,
    hopPacketInfos,
    currentHopIndex,
    totalHops,
    onPlay,
    onPause,
    onNext,
    onClose,
    language,
    isDark,
    graphicsQuality = 'high',
    zIndex,
    isMobile = false,
    onFocus,
    success,
    isReturn,
    errorMessage,
    sourceName,
    targetName,
    sourceIp,
    targetIp,
}: PingPacketInfoPanelProps) {
    const t = language === 'tr' ? tr : en;

    // Drag support — use DraggableDialogManager
    const panelRef = React.useRef<HTMLDivElement>(null);
    const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
    const [isDraggingPanel, setIsDraggingPanel] = React.useState(false);

    // Load saved position on mount
    React.useEffect(() => {
        if (typeof window === 'undefined' || isMobile) return;
        try {
            const saved = localStorage.getItem(PING_PANEL_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.x !== undefined && parsed.y !== undefined) {
                    const vw = window.innerWidth;
                    const vh = window.innerHeight;
                    const margin = 16;
                    setPos({
                        x: Math.max(margin - 780, Math.min(parsed.x, vw - margin)),
                        y: Math.max(HEADER_SAFE_TOP, Math.min(parsed.y, vh - margin)),
                    });
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    }, [isMobile]);

    // Show packet tables when paused or done — derived directly from props, no local state
    const showPacketTables = isPaused || success !== null;

    // P = Play/Pause, N = Next Hop, ESC = Close keyboard shortcuts
    React.useEffect(() => {
        if (!isVisible) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if focus is inside an input/textarea
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                if (isPaused) onPlay();
                else onPause();
            } else if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                if (isPaused) onNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, isPaused, onPlay, onPause, onNext, onClose]);

    React.useEffect(() => {
        if (!isDraggingPanel) return;
        const stopDragging = () => {
            setIsDraggingPanel(false);
            if (panelRef.current) {
                panelRef.current.style.cursor = '';
            }
        };
        window.addEventListener('pointerup', stopDragging);
        window.addEventListener('pointercancel', stopDragging);
        return () => {
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
        };
    }, [isDraggingPanel]);

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

    const posStyle: React.CSSProperties = isMobile
        ? { position: 'fixed', bottom: 72, left: 12, right: 12, top: 'auto', transform: 'none' }
        : pos
            ? { position: 'fixed', left: pos.x, top: pos.y, bottom: 'auto', transform: 'none' }
            : { position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)' };

    const isGlass = graphicsQuality === 'high';
    const resolvedZIndex = zIndex ?? 9999;

    return (
        <div
            ref={panelRef}
            data-draggable-id="ping-packet-info-panel"
            className={`flex flex-col rounded-2xl overflow-hidden select-none ${isDraggingPanel ? '' : 'backdrop-blur-md'} ${isDark
                ? 'bg-zinc-950/40 border-zinc-800/50 text-zinc-100 shadow-black/40'
                : 'bg-white/40 border-zinc-200/50 text-zinc-900 shadow-zinc-200/50'
                }`}
            style={{
                ...posStyle,
                width: isMobile ? 'calc(100% - 24px)' : 780,
                maxHeight: isMobile ? 'calc(100dvh - 140px)' : 'none',
                zIndex: resolvedZIndex,
            }}
            onMouseDown={onFocus}
        >
            {/* Header — drag handle */}
            <div
                className={`flex items-center justify-between px-3 py-2 border-b rounded-t-2xl ${isMobile ? 'cursor-default' : 'cursor-grab active:cursor-grabbing select-none'} ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                data-drag-handle
                onPointerDown={(e) => {
                    if (!isMobile) {
                        (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
                        setIsDraggingPanel(true);
                    }
                }}
            >
                {/* Left: icon + title + badges */}
                <div className="flex items-center gap-2.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        className={`flex-shrink-0 ${isSuccess ? 'text-emerald-500' : isFailure ? 'text-red-500' : isReturn ? 'text-amber-400' : 'text-cyan-500'}`}>
                        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {!isMobile && <span className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t.title}</span>}

                    {isReturn ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-amber-900/50 text-amber-300 border border-amber-800/40' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            ↩ {t.returnLabel}
                        </span>
                    ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-800/40' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'}`}>
                            → {t.forwardLabel}
                        </span>
                    )}

                    {!isDone && totalHopCount > 0 && (
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalHopCount }).map((_, i) => (
                                <div key={i} className={`rounded-full transition-all duration-300 ${i === safeIdx ? 'w-4 h-2 bg-cyan-500' : i < safeIdx ? (isDark ? 'w-2 h-2 bg-slate-500' : 'w-2 h-2 bg-slate-400') : (isDark ? 'w-2 h-2 bg-slate-700' : 'w-2 h-2 bg-slate-200')}`} title={`${t.hop} ${i + 1}`} />
                            ))}
                        </div>
                    )}

                    {!isDone && totalHopCount > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${isDark ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {t.hop} {safeIdx + 1}/{totalHopCount}
                        </span>
                    )}

                    {isPaused && !isDone && (
                        <span className={`${isMobile ? 'w-2 h-2 bg-amber-500 rounded-full animate-pulse' : 'text-[10px] px-2 py-0.5 rounded-full font-semibold ' + (isDark ? 'bg-amber-900/50 text-amber-300 border border-amber-800/40' : 'bg-amber-50 text-amber-700 border border-amber-200')}`}>
                            {!isMobile && <>{'⏸ '}{t.paused}</>}
                        </span>
                    )}
                </div>

                {/* Right: play/pause/next + always-visible close button */}
                <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
                    {!isDone && (<>
                        <TooltipProvider>
                            {isPaused ? (
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                        <button onClick={() => { onPlay(); }}
                                            className={`flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${isMobile ? 'w-7 h-7' : 'gap-1.5 px-3 py-1.5'} ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                            {!isMobile && t.play}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" sideOffset={6}>
                                        <span className="flex items-center gap-1.5">
                                            {t.play}
                                            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>P</kbd>
                                        </span>
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                        <button onClick={() => { onPause(); }}
                                            className={`flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${isMobile ? 'w-7 h-7' : 'gap-1.5 px-3 py-1.5'} ${isDark ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                                            </svg>
                                            {!isMobile && t.pause}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" sideOffset={6}>
                                        <span className="flex items-center gap-1.5">
                                            {t.pause}
                                            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>P</kbd>
                                        </span>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <button onClick={onNext} disabled={!isPaused}
                                        className={`flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${isMobile ? 'w-7 h-7' : 'gap-1.5 px-3 py-1.5'} ${isPaused ? (isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white') : (isDark ? 'bg-slate-700/40 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}`}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                            <polygon points="5,3 14,12 5,21" /><rect x="16" y="3" width="3" height="18" />
                                        </svg>
                                        {!isMobile && t.next}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" sideOffset={6}>
                                    <span className="flex items-center gap-1.5">
                                        {t.next}
                                        <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>N</kbd>
                                    </span>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {!isMobile && <div className={`w-px h-5 mx-0.5 ${isDark ? 'bg-white/15' : 'bg-black/15'}`} />}
                    </>)}

                    {/* Close — always visible, rounded square, X always shown */}
                    <TooltipProvider>
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <button
                                    aria-label={t.close}
                                    onClick={onClose}
                                    className="flex items-center justify-center w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 transition-all flex-shrink-0"
                                >
                                    <X className="w-3 h-3 text-white pointer-events-none" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" sideOffset={6}>
                                <span className="flex items-center gap-1.5">
                                    {t.close}
                                    <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>ESC</kbd>
                                </span>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">

            {/* Result banner */}
            {isDone && (
                <div className={`px-5 py-3 flex items-start gap-3 border-b ${isSuccess
                    ? isGlass
                        ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-500/10 border-emerald-500/20')
                        : (isDark ? 'bg-emerald-900/40 border-emerald-800/50' : 'bg-emerald-50 border-emerald-100')
                    : isGlass
                        ? (isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-500/10 border-red-500/20')
                        : (isDark ? 'bg-red-900/40 border-red-800/50' : 'bg-red-50 border-red-100')
                    }`}>
                    {isSuccess ? (
                        <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                    <div className="flex-1 min-w-0">
                        {isSuccess ? (
                            <>
                                <div className={`text-sm font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{t.successTitle}</div>
                                <div className={`text-xs mt-0.5 font-mono ${isDark ? 'text-emerald-400/80' : 'text-emerald-600'}`}>
                                    {language === 'tr' ? `${targetIp || targetName}: bayt=32 TTL=${currentInfo?.ttl ?? 64}` : `Reply from ${targetIp || targetName}: bytes=32 TTL=${currentInfo?.ttl ?? 64}`}
                                </div>
                                <div className={`text-xs mt-0.5 ${isDark ? 'text-emerald-500/70' : 'text-emerald-600/70'}`}>{sourceName} → {targetName} → {sourceName}</div>
                            </>
                        ) : (
                            <>
                                <div className={`text-sm font-bold ${isDark ? 'text-red-300' : 'text-red-700'}`}>{t.failTitle}</div>
                                {errorMessage && <div className={`text-xs mt-0.5 ${isDark ? 'text-red-400/80' : 'text-red-600'}`}>{t.failReason}: {errorMessage}</div>}
                                {currentInfo && (
                                    <div className={`text-xs mt-0.5 font-mono ${isDark ? 'text-red-500/70' : 'text-red-500/70'}`}>
                                        {language === 'tr' ? `${currentInfo.fromDevice.name} → ${currentInfo.toDevice.name} adımında başarısız` : `Failed at ${currentInfo.fromDevice.name} → ${currentInfo.toDevice.name}`}
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
                        : isDark ? 'bg-slate-800/80 border border-slate-700' : 'bg-slate-100 border border-slate-200'
                        }`}>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${currentInfo.fromDevice.type === 'router' ? 'bg-purple-500' : currentInfo.fromDevice.type.startsWith('switch') ? 'bg-teal-500' : 'bg-blue-500'}`} />
                            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{currentInfo.fromDevice.name}</span>
                            {!isMobile && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${isDark ? 'bg-white/10 text-slate-400' : 'bg-black/10 text-slate-500'}`}>{currentInfo.fromDevice.type}</span>}
                        </div>
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                            <CableIcon cableType={currentInfo.cableType} color={getCableColor(currentInfo.cableType)} isMobile={isMobile} />
                            {!isMobile && <span className="text-[10px] font-medium" style={{ color: getCableColor(currentInfo.cableType) }}>{getCableLabel(currentInfo.cableType, t)}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                            {!isMobile && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${isDark ? 'bg-white/10 text-slate-400' : 'bg-black/10 text-slate-500'}`}>{currentInfo.toDevice.type}</span>}
                            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{currentInfo.toDevice.name}</span>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${currentInfo.toDevice.type === 'router' ? 'bg-purple-500' : currentInfo.toDevice.type.startsWith('switch') ? 'bg-teal-500' : 'bg-blue-500'}`} />
                        </div>
                        {macChanged && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-500/15 text-amber-700 border border-amber-500/30'}`}>⚡ {isMobile ? '' : t.macChanged}</span>
                        )}
                        {ipSame && prevInfo && !isMobile && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'}`}>✓ {t.ipSame}</span>
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
                                ? isDark ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-emerald-400/30 bg-emerald-500/8'
                                : isDark ? 'border-emerald-900/60 bg-emerald-950/50' : 'border-emerald-200 bg-emerald-50'}`}
                                style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                                <div className={`px-3 py-1.5 text-[11px] font-bold tracking-wide border-b ${isGlass
                                    ? isDark ? 'bg-emerald-500/15 border-emerald-400/20 text-emerald-400' : 'bg-emerald-500/10 border-emerald-400/20 text-emerald-700'
                                    : isDark ? 'bg-emerald-950/60 border-emerald-900/60 text-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-700'}`}>{t.layer2}</div>
                                <table className="w-full"><tbody>
                                    <FieldRow label={t.srcMac} value={currentInfo.srcMac} prevValue={prevInfo?.srcMac} highlight={macChanged ? 'changed' : 'none'} isDark={isDark} badge={macChanged ? t.changed : undefined} badgeColor="#d97706" />
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
                                    <FieldRow label={currentInfo.layer3 === 'IPv6' ? 'Hop Limit' : t.ttl} value={String(currentInfo.ttl)} prevValue={prevInfo ? String(prevInfo.ttl) : undefined} highlight={ttlChanged ? 'changed' : 'none'} isDark={isDark} badge={ttlChanged ? t.ttlDec : undefined} badgeColor="#d97706" />
                                    <FieldRow label={t.protocol} value={currentInfo.protocol} isDark={isDark} />
                                </tbody></table>
                            </div>
                            <div className={`rounded-xl overflow-hidden border ${isGlass
                                ? isDark ? 'border-blue-400/20 bg-blue-500/10' : 'border-blue-400/30 bg-blue-500/8'
                                : isDark ? 'border-blue-900/60 bg-blue-950/50' : 'border-blue-200 bg-blue-50'}`}
                                style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                                <div className={`px-3 py-1.5 text-[11px] font-bold tracking-wide border-b ${isGlass
                                    ? isDark ? 'bg-blue-500/15 border-blue-400/20 text-blue-400' : 'bg-blue-500/10 border-blue-400/20 text-blue-700'
                                    : isDark ? 'bg-blue-950/60 border-blue-900/60 text-blue-400' : 'bg-blue-100 border-blue-200 text-blue-700'}`}>{currentInfo.layer4 === 'ICMPv6' ? (language === 'tr' ? 'Katman 4 — ICMPv6' : 'Layer 4 — ICMPv6') : t.layer4}</div>
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
                <div className={`px-5 py-8 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.noHops}</div>
            )}
            </div>
        </div >
    );
}

export function buildHopPacketInfos(
    path: string[],
    devices: CanvasDevice[],
    connections: CanvasConnection[],
    initialTTL = 64,
    targetIp?: string
): HopPacketInfo[] {
    if (!path || path.length < 2) return [];

    const sourceDevice = devices.find(d => d.id === path[0]);
    const targetDevice = devices.find(d => d.id === path[path.length - 1]);

    const originalSrcIp = sourceDevice?.ip || sourceDevice?.ipv6 || '0.0.0.0';
    const originalDstIp = targetDevice?.ip || targetDevice?.ipv6 || '0.0.0.0';

    const isIPv6 = (targetIp && targetIp.includes(':')) || originalDstIp.includes(':');

    const getMac = (device: CanvasDevice | undefined, fallback: string): string => {
        if (!device) return fallback;
        if (device.macAddress) return device.macAddress;
        const hash = device.id.replace(/[^a-f0-9]/gi, '').padEnd(12, '0').slice(0, 12);
        return `${hash.slice(0, 2)}:${hash.slice(2, 4)}:${hash.slice(4, 6)}:${hash.slice(6, 8)}:${hash.slice(8, 10)}:${hash.slice(10, 12)}`.toUpperCase();
    };

    // Check if two devices are connected via wireless
    const isWirelessConnection = (fromId: string, toId: string): boolean => {
        const fromDev = devices.find(d => d.id === fromId);
        const toDev = devices.find(d => d.id === toId);

        if (!fromDev || !toDev) return false;

        // Check if connection exists in connections array
        const conn = connections.find(c =>
            (c.sourceDeviceId === fromId && c.targetDeviceId === toId) ||
            (c.sourceDeviceId === toId && c.targetDeviceId === fromId)
        );

        // If there's an explicit connection, use its cableType
        if (conn) {
            return conn.cableType === 'wireless';
        }

        // If no connection in array, check if it could be wireless
        // Only PC/IoT can connect wirelessly to Router/Switch
        const isFromClient = fromDev.type === 'pc' || fromDev.type === 'iot';
        const isToAP = toDev.type === 'router' || toDev.type.startsWith('switch');
        const isToClient = toDev.type === 'pc' || toDev.type === 'iot';
        const isFromAP = fromDev.type === 'router' || fromDev.type.startsWith('switch');

        // Wireless: PC/IoT -> Router/Switch or Router/Switch -> PC/IoT
        if ((isFromClient && isToAP) || (isFromAP && isToClient)) {
            return true;
        }

        return false;
    };

    const infos: HopPacketInfo[] = [];
    let ttl = initialTTL;
    let icmpSeq = 1;

    for (let i = 0; i < path.length - 1; i++) {
        const fromDev = devices.find(d => d.id === path[i]);
        const toDev = devices.find(d => d.id === path[i + 1]);

        const conn = connections.find(c =>
            (c.sourceDeviceId === path[i] && c.targetDeviceId === path[i + 1]) ||
            (c.sourceDeviceId === path[i + 1] && c.targetDeviceId === path[i])
        );

        const isL3Hop = fromDev?.type === 'router' || fromDev?.type === 'switchL3';
        const srcMac = getMac(fromDev, 'AA:BB:CC:DD:EE:FF');
        const dstMac = getMac(toDev, 'FF:EE:DD:CC:BB:AA');

        if (i > 0 && isL3Hop) {
            ttl = Math.max(1, ttl - 1);
        }

        const cableType = conn?.cableType || (isWirelessConnection(path[i], path[i + 1]) ? 'wireless' : 'straight');

        // Calculate hop-specific IP addresses
        // For router hops, use interface IPs; for end devices, use device IPs
        let hopSrcIp = isIPv6 ? (fromDev?.ipv6 || fromDev?.ip || '::') : (fromDev?.ip || '0.0.0.0');
        let hopDstIp = isIPv6 ? (toDev?.ipv6 || toDev?.ip || '::') : (toDev?.ip || '0.0.0.0');

        // Use configured device/interface addresses only; do not synthesize router interface IPs.

        infos.push({
            hopIndex: i,
            fromDevice: {
                id: fromDev?.id || path[i],
                name: fromDev?.name || path[i],
                type: fromDev?.type || 'unknown',
                ip: isIPv6 ? (fromDev?.ipv6 || fromDev?.ip || '::') : (fromDev?.ip || '0.0.0.0'),
                mac: srcMac,
            },
            toDevice: {
                id: toDev?.id || path[i + 1],
                name: toDev?.name || path[i + 1],
                type: toDev?.type || 'unknown',
                ip: isIPv6 ? (toDev?.ipv6 || toDev?.ip || '::') : (toDev?.ip || '0.0.0.0'),
                mac: dstMac,
            },
            cableType,
            srcMac,
            dstMac,
            etherType: isIPv6 ? '0x86DD (IPv6)' : '0x0800 (IPv4)',
            srcIp: hopSrcIp,
            dstIp: hopDstIp,
            ttl,
            protocol: isIPv6 ? 'ICMPv6 (58)' : 'ICMP (1)',
            icmpType: isIPv6 ? 'Echo Request (128)' : 'Echo Request (8)',
            icmpCode: 0,
            icmpSeq: icmpSeq++,
            layer2: 'Ethernet II',
            layer3: isIPv6 ? 'IPv6' : 'IPv4',
            layer4: isIPv6 ? 'ICMPv6' : 'ICMP',
        });
    }

    return infos;
}
