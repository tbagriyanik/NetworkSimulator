export interface BroadcastSvgItem {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    x: number;
    y: number;
}

export interface BroadcastAnimationProps {
    broadcastSvgData: BroadcastSvgItem[];
    isGlass: boolean;
    isDark: boolean;
}

export function BroadcastAnimation({ broadcastSvgData, isGlass, isDark }: BroadcastAnimationProps) {
    if (!broadcastSvgData || broadcastSvgData.length === 0) return null;

    return (
        <div className={`p-2.5 rounded-xl border mb-3 relative overflow-hidden ${isGlass
            ? (isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-500/30 bg-amber-500/8')
            : (isDark ? 'border-amber-900/60 bg-amber-950/50' : 'border-amber-200 bg-amber-50')
            }`}
            style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">
                        Layer 2 Broadcast (ARP Flooding)
                    </span>
                </div>
            </div>
            <div className="relative h-20 w-full bg-black/20 rounded-lg overflow-hidden border border-amber-500/20">
                <svg className="w-full h-full" viewBox="0 0 480 120" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="broadcastGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--color-warning-500)" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="var(--color-error-500)" stopOpacity="0.8" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    {broadcastSvgData.map((item, i) => (
                        <g key={i}>
                            <line
                                x1={item.fromX}
                                y1={item.fromY}
                                x2={item.toX}
                                y2={item.toY}
                                stroke="var(--color-warning-500)"
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                                strokeOpacity="0.4"
                            />
                            <circle cx={item.x} cy={item.y} r="6" fill="url(#broadcastGradient)" filter="url(#glow)" />
                                <circle cx={item.x} cy={item.y} r="2" fill="var(--color-background)" />
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
