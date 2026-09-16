import type { tr } from './translations';

export interface PacketResultBannerProps {
    success: boolean | null | undefined;
    isReturn?: boolean;
    errorMessage?: string;
    sourceName?: string;
    targetName?: string;
    sourceIp?: string;
    targetIp?: string;
    isDark: boolean;
    isGlass: boolean;
    t: typeof tr;
}

export function PacketResultBanner({
    success,
    isReturn,
    errorMessage,
    sourceName,
    targetName,
    targetIp,
    isDark,
    isGlass,
    t
}: PacketResultBannerProps) {
    if (success === null || success === undefined) return null;

    if (success) {
        return (
            <div className={`p-3 rounded-xl border mb-3 flex items-start gap-3 ${isGlass
                ? (isDark ? 'border-success-400/30 bg-success-500/15 text-success-200' : 'border-success-400/40 bg-success-500/10 text-success-800')
                : (isDark ? 'border-success-900/60 bg-success-950/60 text-success-300' : 'border-success-200 bg-success-50 text-success-900')
                }`}
                style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
                <div className="w-7 h-7 rounded-full bg-success-500/20 flex items-center justify-center shrink-0 text-success-400 font-bold text-sm">
                    ✓
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm">{t.successTitle}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-success-500/20 text-success-300 border border-success-500/30">
                            {isReturn ? t.returnLabel : t.forwardLabel}
                        </span>
                    </div>
                    <p className="text-xs mt-0.5 opacity-90 font-mono">
                        {t.replyFrom} {targetName ? `${targetName} (${targetIp})` : targetIp}: {t.bytes}=64 {t.timeLabel}&lt;1ms {t.ttlLabel}=64
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-3 rounded-xl border mb-3 flex items-start gap-3 ${isGlass
            ? (isDark ? 'border-error-400/30 bg-error-500/15 text-error-200' : 'border-error-400/40 bg-error-500/10 text-error-800')
            : (isDark ? 'border-error-900/60 bg-error-950/60 text-error-300' : 'border-error-200 bg-error-50 text-error-900')
            }`}
            style={isGlass ? { backdropFilter: 'blur(12px) saturate(180%)' } : undefined}>
            <div className="w-7 h-7 rounded-full bg-error-500/20 flex items-center justify-center shrink-0 text-error-400 font-bold text-sm">
                ✕
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">{t.failTitle}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-error-500/20 text-error-300 border border-error-500/30">
                        {t.requestTimeout}
                    </span>
                </div>
                <p className="text-xs mt-0.5 opacity-90">
                    {errorMessage || `${sourceName || 'Host'} -> ${targetName || 'Target'}: ${t.requestTimeout}`}
                </p>
            </div>
        </div>
    );
}
