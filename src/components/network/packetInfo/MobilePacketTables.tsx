import React from 'react';
import type { HopPacketInfo } from './hopPacketTransformer';
import { PacketFieldRow } from './PacketFieldRow';
import type { tr } from './translations';

export interface MobilePacketTablesProps {
    currentInfo: HopPacketInfo;
    prevInfo: HopPacketInfo | null;
    macChanged: boolean;
    ttlChanged: boolean;
    isDark: boolean;
    isGlass: boolean;
    t: typeof tr;
}

export function MobilePacketTables({ currentInfo, prevInfo, macChanged, ttlChanged, isDark, isGlass, t }: MobilePacketTablesProps) {
    const [activeTab, setActiveTab] = React.useState<'l2' | 'l3' | 'l4'>('l2');

    const tabs = [
        { id: 'l2' as const, label: 'L2', color: 'emerald' },
        { id: 'l3' as const, label: 'L3', color: 'purple' },
        { id: 'l4' as const, label: 'L4', color: 'blue' },
    ];

    const tabColors = {
        blue: { active: isDark ? 'bg-primary-500/20 text-primary-300 border-primary-400/30' : 'bg-primary-100 text-primary-700 border-primary-300', inactive: isDark ? 'text-secondary-400' : 'text-secondary-500' },
        emerald: { active: isDark ? 'bg-success-500/20 text-success-300 border-success-400/30' : 'bg-success-100 text-success-700 border-success-300', inactive: isDark ? 'text-secondary-400' : 'text-secondary-500' },
        purple: { active: isDark ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' : 'bg-purple-100 text-purple-700 border-purple-300', inactive: isDark ? 'text-secondary-400' : 'text-secondary-500' },
    };

    const containerCls = {
        blue: isGlass ? (isDark ? 'border-primary-400/20 bg-primary-500/10' : 'border-primary-400/30 bg-primary-500/8') : (isDark ? 'border-primary-900/60 bg-primary-950/50' : 'border-primary-200 bg-primary-50'),
        emerald: isGlass ? (isDark ? 'border-success-400/20 bg-success-500/10' : 'border-success-400/30 bg-success-500/8') : (isDark ? 'border-success-900/60 bg-success-950/50' : 'border-success-200 bg-success-50'),
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
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition-all ${activeTab === tab.id ? tabColors[tab.color as keyof typeof tabColors].active : (isDark ? 'border-transparent text-secondary-500' : 'border-transparent text-secondary-400')}`}
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
                        <PacketFieldRow label={t.srcMac} value={currentInfo.srcMac} prevValue={prevInfo?.srcMac} highlight={macChanged ? 'changed' : 'none'} isDark={isDark} badge={macChanged ? t.changed : undefined} badgeColor="var(--color-warning-600)" />
                        <PacketFieldRow label={t.dstMac} value={currentInfo.dstMac} prevValue={prevInfo?.dstMac} highlight={macChanged ? 'changed' : 'none'} isDark={isDark} />
                        <PacketFieldRow label={t.etherType} value={currentInfo.etherType} isDark={isDark} />
                    </tbody></table>
                </div>
            )}
            {activeTab === 'l3' && (
                <div className={`rounded-xl overflow-hidden border ${containerCls.purple}`}
                    style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                    <table className="w-full"><tbody>
                        <PacketFieldRow label={currentInfo.layer3 === 'IPv6' ? (t.srcIp.replace('IP', 'IPv6')) : t.srcIp} value={currentInfo.srcIp} highlight="same" isDark={isDark} />
                        <PacketFieldRow label={currentInfo.layer3 === 'IPv6' ? (t.dstIp.replace('IP', 'IPv6')) : t.dstIp} value={currentInfo.dstIp} highlight="same" isDark={isDark} />
                        <PacketFieldRow label={currentInfo.layer3 === 'IPv6' ? 'Hop Limit' : t.ttl} value={String(currentInfo.ttl)} prevValue={prevInfo ? String(prevInfo.ttl) : undefined} highlight={ttlChanged ? 'changed' : 'none'} isDark={isDark} badge={ttlChanged ? t.ttlDec : undefined} badgeColor="var(--color-warning-600)" />
                        <PacketFieldRow label={t.protocol} value={currentInfo.protocol} isDark={isDark} />
                    </tbody></table>
                </div>
            )}
            {activeTab === 'l4' && (
                <div className={`rounded-xl overflow-hidden border ${containerCls.blue}`}
                    style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                    <table className="w-full"><tbody>
                        <PacketFieldRow label={currentInfo.layer4 === 'ICMPv6' ? 'ICMPv6 Type' : t.icmpType} value={currentInfo.icmpType} isDark={isDark} />
                        <PacketFieldRow label={currentInfo.layer4 === 'ICMPv6' ? 'ICMPv6 Code' : t.icmpCode} value={String(currentInfo.icmpCode)} isDark={isDark} />
                        <PacketFieldRow label={t.icmpSeq} value={String(currentInfo.icmpSeq)} isDark={isDark} />
                    </tbody></table>
                </div>
            )}
        </div>
    );
}