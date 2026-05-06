/**
 * Badge Display Component
 * Visual badge system for achievements and rewards
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';

// ============================================================================
// Badge Types and Data
// ============================================================================

export type BadgeType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'special';
export type BadgeCategory = 'network-basics' | 'advanced-concepts' | 'speed-challenges' | 'creative-builds' | 'troubleshooting';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: BadgeType;
    category: BadgeCategory;
    unlockedAt?: Date;
    rarity: number; // 1-100, higher is rarer
}

export interface BadgeDisplayProps {
    badges: Badge[];
    className?: string;
}

// Badge styling by type
const BADGE_STYLES: Record<BadgeType, { bg: string; border: string; glow: string; label: string }> = {
    bronze: {
        bg: 'bg-gradient-to-br from-amber-700 to-amber-900',
        border: 'border-amber-600',
        glow: 'shadow-amber-500/50',
        label: 'Bronze',
    },
    silver: {
        bg: 'bg-gradient-to-br from-slate-300 to-slate-500',
        border: 'border-slate-400',
        glow: 'shadow-slate-400/50',
        label: 'Silver',
    },
    gold: {
        bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
        border: 'border-yellow-500',
        glow: 'shadow-yellow-400/50',
        label: 'Gold',
    },
    platinum: {
        bg: 'bg-gradient-to-br from-cyan-300 to-cyan-500',
        border: 'border-cyan-400',
        glow: 'shadow-cyan-400/50',
        label: 'Platinum',
    },
    special: {
        bg: 'bg-gradient-to-br from-purple-500 to-pink-500',
        border: 'border-purple-400',
        glow: 'shadow-purple-500/50',
        label: 'Special',
    },
};

// Predefined badges database
export const PREDEFINED_BADGES: Badge[] = [
    // Network Basics - Bronze
    { id: 'first-device', name: 'First Steps', description: 'Add your first device to the network', icon: '👶', type: 'bronze', category: 'network-basics', rarity: 90 },
    { id: 'first-connection', name: 'Connected', description: 'Create your first connection', icon: '🔌', type: 'bronze', category: 'network-basics', rarity: 85 },
    { id: 'first-ping', name: 'Ping Master', description: 'Send your first ping', icon: '📡', type: 'bronze', category: 'network-basics', rarity: 80 },
    { id: 'subnet-savvy', name: 'Subnet Savvy', description: 'Configure a subnet mask correctly', icon: '🕸️', type: 'bronze', category: 'network-basics', rarity: 75 },
    
    // Network Basics - Silver
    { id: 'three-devices', name: 'Growing Network', description: 'Have 3 devices in your network', icon: '🔢', type: 'silver', category: 'network-basics', rarity: 70 },
    { id: 'full-subnet', name: 'Subnet Expert', description: 'Configure a complete subnet', icon: '🎯', type: 'silver', category: 'network-basics', rarity: 60 },
    { id: 'gateway-guru', name: 'Gateway Guru', description: 'Configure 3 different gateways', icon: '🚪', type: 'silver', category: 'network-basics', rarity: 55 },
    
    // Network Basics - Gold
    { id: 'network-architect', name: 'Network Architect', description: 'Build a network with 5+ devices', icon: '🏗️', type: 'gold', category: 'network-basics', rarity: 40 },
    { id: 'connectivity-king', name: 'Connectivity King', description: 'Create 10+ connections', icon: '🔗', type: 'gold', category: 'network-basics', rarity: 35 },
    
    // Advanced Concepts - Bronze
    { id: 'dhcp-enable', name: 'DHCP Starter', description: 'Enable DHCP on a device', icon: '📋', type: 'bronze', category: 'advanced-concepts', rarity: 80 },
    { id: 'ipv6-ready', name: 'IPv6 Ready', description: 'Configure an IPv6 address', icon: '🆕', type: 'bronze', category: 'advanced-concepts', rarity: 75 },
    { id: 'dns-set', name: 'DNS Configured', description: 'Set up DNS servers', icon: '📖', type: 'bronze', category: 'advanced-concepts', rarity: 70 },
    
    // Advanced Concepts - Silver
    { id: 'dhcp-server', name: 'DHCP Server', description: 'Configure DHCP server with range', icon: '📤', type: 'silver', category: 'advanced-concepts', rarity: 55 },
    { id: 'multi-dns', name: 'Redundant DNS', description: 'Configure multiple DNS servers', icon: '📚', type: 'silver', category: 'advanced-concepts', rarity: 50 },
    { id: 'router-config', name: 'Router Admin', description: 'Configure a router with multiple interfaces', icon: '📶', type: 'silver', category: 'advanced-concepts', rarity: 45 },
    
    // Advanced Concepts - Gold
    { id: 'vlan-master', name: 'VLAN Master', description: 'Configure VLANs', icon: '🏷️', type: 'gold', category: 'advanced-concepts', rarity: 30 },
    { id: 'network-segmentation', name: 'Segmentation Pro', description: 'Create 3+ subnets', icon: '📊', type: 'gold', category: 'advanced-concepts', rarity: 25 },
    
    // Advanced Concepts - Platinum
    { id: 'network-engineer', name: 'Network Engineer', description: 'Build a complex enterprise network', icon: '👨‍💻', type: 'platinum', category: 'advanced-concepts', rarity: 10 },
    
    // Speed Challenges - Bronze
    { id: 'quick-builder', name: 'Quick Builder', description: 'Build a network in under 5 minutes', icon: '⚡', type: 'bronze', category: 'speed-challenges', rarity: 70 },
    { id: 'fast-ping', name: 'Fast Ping', description: 'Complete a ping under 2ms', icon: '💨', type: 'bronze', category: 'speed-challenges', rarity: 65 },
    
    // Speed Challenges - Silver
    { id: 'speed-demon', name: 'Speed Demon', description: 'Build a 5-device network in 3 minutes', icon: '🚀', type: 'silver', category: 'speed-challenges', rarity: 45 },
    { id: 'lightning-fast', name: 'Lightning Fast', description: 'Complete a ping under 1ms', icon: '⚡', type: 'silver', category: 'speed-challenges', rarity: 40 },
    
    // Speed Challenges - Gold
    { id: 'turbo-networker', name: 'Turbo Networker', description: 'Build a complex network in 2 minutes', icon: '🏎️', type: 'gold', category: 'speed-challenges', rarity: 20 },
    
    // Creative Builds - Bronze
    { id: 'mesh-network', name: 'Mesh Builder', description: 'Create a mesh topology', icon: '🕸️', type: 'bronze', category: 'creative-builds', rarity: 75 },
    { id: 'star-topology', name: 'Star Gazer', description: 'Create a star topology', icon: '⭐', type: 'bronze', category: 'creative-builds', rarity: 70 },
    
    // Creative Builds - Silver
    { id: 'hybrid-master', name: 'Hybrid Master', description: 'Create a hybrid topology', icon: '🔀', type: 'silver', category: 'creative-builds', rarity: 50 },
    { id: 'redundant-design', name: 'Redundant Design', description: 'Create a network with redundancy', icon: '🔄', type: 'silver', category: 'creative-builds', rarity: 45 },
    
    // Creative Builds - Gold
    { id: 'network-artist', name: 'Network Artist', description: 'Create a visually organized network', icon: '🎨', type: 'gold', category: 'creative-builds', rarity: 30 },
    { id: 'topology-genius', name: 'Topology Genius', description: 'Implement 3+ different topologies', icon: '🧩', type: 'gold', category: 'creative-builds', rarity: 25 },
    
    // Creative Builds - Platinum
    { id: 'master-architect', name: 'Master Architect', description: 'Create a textbook-perfect network design', icon: '👑', type: 'platinum', category: 'creative-builds', rarity: 5 },
    
    // Troubleshooting - Bronze
    { id: 'error-finder', name: 'Error Finder', description: 'Identify a configuration error', icon: '🔍', type: 'bronze', category: 'troubleshooting', rarity: 80 },
    { id: 'fixer', name: 'Fixer', description: 'Fix a broken connection', icon: '🔧', type: 'bronze', category: 'troubleshooting', rarity: 75 },
    
    // Troubleshooting - Silver
    { id: 'debug-pro', name: 'Debug Pro', description: 'Fix 5 configuration errors', icon: '🐛', type: 'silver', category: 'troubleshooting', rarity: 55 },
    { id: 'connectivity-fix', name: 'Connectivity Fix', description: 'Restore network connectivity', icon: '🔌', type: 'silver', category: 'troubleshooting', rarity: 50 },
    
    // Troubleshooting - Gold
    { id: 'network-doctor', name: 'Network Doctor', description: 'Diagnose and fix complex issues', icon: '🏥', type: 'gold', category: 'troubleshooting', rarity: 30 },
    { id: 'packet-detective', name: 'Packet Detective', description: 'Trace packet path issues', icon: '🔎', type: 'gold', category: 'troubleshooting', rarity: 25 },
    
    // Special
    { id: 'first-day', name: 'First Day', description: 'Complete your first day of learning', icon: '📅', type: 'special', category: 'network-basics', rarity: 95 },
    { id: 'week-streak', name: 'Week Warrior', description: '7-day learning streak', icon: '🔥', type: 'special', category: 'network-basics', rarity: 50 },
    { id: 'month-master', name: 'Month Master', description: '30-day learning streak', icon: '📆', type: 'special', category: 'network-basics', rarity: 20 },
    { id: 'perfect-score', name: 'Perfect Score', description: 'Complete all tasks perfectly', icon: '💯', type: 'special', category: 'network-basics', rarity: 10 },
    { id: 'helpful-student', name: 'Helper', description: 'Share your network configuration', icon: '🤝', type: 'special', category: 'network-basics', rarity: 60 },
    { id: 'explorer', name: 'Explorer', description: 'Try all device types', icon: '🧭', type: 'special', category: 'network-basics', rarity: 70 },
    { id: 'level-10', name: 'Max Level', description: 'Reach level 10', icon: '🏆', type: 'special', category: 'network-basics', rarity: 15 },
];

// ============================================================================
// Components
// ============================================================================

interface IndividualBadgeProps {
    badge: Badge;
    unlocked: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const IndividualBadge: React.FC<IndividualBadgeProps> = ({
    badge,
    unlocked,
    size = 'md',
}) => {
    const styles = BADGE_STYLES[badge.type];
    const sizeClasses = {
        sm: 'w-12 h-12 text-lg',
        md: 'w-16 h-16 text-2xl',
        lg: 'w-24 h-24 text-4xl',
    };

    return (
        <TooltipWrapper
            title={`${badge.name} (${styles.label})\n${badge.description}\n${unlocked ? `Unlocked: ${badge.unlockedAt?.toLocaleDateString()}` : 'Locked - Keep learning to unlock!'}`}
        >
            <div
                className={`
                    ${sizeClasses[size]}
                    rounded-full flex items-center justify-center
                    border-4 ${styles.border}
                    ${unlocked ? styles.bg : 'bg-gray-200'}
                    ${unlocked ? `shadow-lg ${styles.glow}` : 'opacity-40 grayscale'}
                    transition-all duration-300 hover:scale-110 cursor-pointer
                `}
            >
                <span className="select-none">{badge.icon}</span>
            </div>
        </TooltipWrapper>
    );
};

interface BadgeGridProps {
    badges: Badge[];
    unlockedIds: string[];
    category?: BadgeCategory;
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({
    badges,
    unlockedIds,
    category,
}) => {
    const filteredBadges = category
        ? badges.filter(b => b.category === category)
        : badges;

    const sortedBadges = [...filteredBadges].sort((a, b) => {
        const aUnlocked = unlockedIds.includes(a.id);
        const bUnlocked = unlockedIds.includes(b.id);
        if (aUnlocked && !bUnlocked) return -1;
        if (!aUnlocked && bUnlocked) return 1;
        return b.rarity - a.rarity;
    });

    return (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {sortedBadges.map((badge) => (
                <div key={badge.id} className="flex flex-col items-center gap-1">
                    <IndividualBadge
                        badge={badge}
                        unlocked={unlockedIds.includes(badge.id)}
                        size="md"
                    />
                    <span className="text-xs text-center text-gray-600 truncate w-full">
                        {badge.name}
                    </span>
                </div>
            ))}
        </div>
    );
};

interface BadgeProgressProps {
    badges: Badge[];
    unlockedIds: string[];
}

export const BadgeProgress: React.FC<BadgeProgressProps> = ({
    badges,
    unlockedIds,
}) => {
    const byType = {
        bronze: badges.filter(b => b.type === 'bronze'),
        silver: badges.filter(b => b.type === 'silver'),
        gold: badges.filter(b => b.type === 'gold'),
        platinum: badges.filter(b => b.type === 'platinum'),
        special: badges.filter(b => b.type === 'special'),
    };

    const unlockedByType = {
        bronze: unlockedIds.filter(id => byType.bronze.some(b => b.id === id)).length,
        silver: unlockedIds.filter(id => byType.silver.some(b => b.id === id)).length,
        gold: unlockedIds.filter(id => byType.gold.some(b => b.id === id)).length,
        platinum: unlockedIds.filter(id => byType.platinum.some(b => b.id === id)).length,
        special: unlockedIds.filter(id => byType.special.some(b => b.id === id)).length,
    };

    return (
        <div className="space-y-3">
            {Object.entries(byType).map(([type, typeBadges]) => (
                <div key={type} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${BADGE_STYLES[type as BadgeType].bg}`} />
                    <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize font-medium">{type}</span>
                            <span className="text-gray-500">
                                {unlockedByType[type as keyof typeof unlockedByType]} / {typeBadges.length}
                            </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${BADGE_STYLES[type as BadgeType].bg} transition-all duration-500`}
                                style={{
                                    width: `${(unlockedByType[type as keyof typeof unlockedByType] / typeBadges.length) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
    badges,
    className = '',
}) => {
    const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>('all');
    const unlockedIds = badges.filter(b => b.unlockedAt).map(b => b.id);

    const categories: { id: BadgeCategory | 'all'; name: string; icon: string }[] = [
        { id: 'all', name: 'All Badges', icon: '🏅' },
        { id: 'network-basics', name: 'Basics', icon: '📚' },
        { id: 'advanced-concepts', name: 'Advanced', icon: '🎓' },
        { id: 'speed-challenges', name: 'Speed', icon: '⚡' },
        { id: 'creative-builds', name: 'Creative', icon: '🎨' },
        { id: 'troubleshooting', name: 'Debug', icon: '🔧' },
    ];

    const totalUnlocked = unlockedIds.length;
    const totalBadges = PREDEFINED_BADGES.length;
    const completionPercentage = Math.round((totalUnlocked / totalBadges) * 100);

    return (
        <Card className={`w-full ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <span>🏅</span>
                    Badge Collection
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress Overview */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                    <div>
                        <div className="text-2xl font-bold text-amber-700">
                            {totalUnlocked} <span className="text-sm font-normal text-amber-600">/ {totalBadges}</span>
                        </div>
                        <div className="text-xs text-amber-600">Badges Unlocked</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-amber-700">{completionPercentage}%</div>
                        <div className="text-xs text-amber-600">Complete</div>
                    </div>
                </div>

                {/* Badge Type Progress */}
                <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-3">Progress by Type</h3>
                    <BadgeProgress badges={PREDEFINED_BADGES} unlockedIds={unlockedIds} />
                </div>

                {/* Category Filter */}
                <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-3">Filter by Category</h3>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`
                                    px-3 py-1 rounded-full text-xs font-medium transition-all
                                    ${selectedCategory === cat.id
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }
                                `}
                            >
                                <span className="mr-1">{cat.icon}</span>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Badge Grid */}
                <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-4">
                        {selectedCategory === 'all' ? 'All Badges' : `${categories.find(c => c.id === selectedCategory)?.name} Badges`}
                    </h3>
                    <BadgeGrid
                        badges={PREDEFINED_BADGES}
                        unlockedIds={unlockedIds}
                        category={selectedCategory === 'all' ? undefined : selectedCategory}
                    />
                </div>

                {/* Rarest Badge */}
                {unlockedIds.length > 0 && (
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold mb-3">🏆 Rarest Badge</h3>
                        {(() => {
                            const unlockedBadges = PREDEFINED_BADGES.filter(b => unlockedIds.includes(b.id));
                            const rarest = unlockedBadges.reduce((min, b) => b.rarity < min.rarity ? b : min, unlockedBadges[0]);
                            if (rarest) {
                                return (
                                    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                                        <IndividualBadge badge={rarest} unlocked={true} size="lg" />
                                        <div>
                                            <div className="font-semibold text-purple-800">{rarest.name}</div>
                                            <div className="text-xs text-purple-600">{rarest.description}</div>
                                            <div className="text-xs text-purple-500 mt-1">Rarity: Top {rarest.rarity}%</div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default BadgeDisplay;
