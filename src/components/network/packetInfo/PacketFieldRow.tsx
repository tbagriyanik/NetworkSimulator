export interface FieldRowProps {
    label: string;
    value: string;
    highlight?: 'changed' | 'same' | 'none';
    isDark: boolean;
    badge?: string;
    badgeColor?: string;
    prevValue?: string;
}

export function PacketFieldRow({ label, value, highlight = 'none', isDark, badge, badgeColor, prevValue }: FieldRowProps) {
    const highlightClass =
        highlight === 'changed'
            ? isDark ? 'text-warning-300' : 'text-warning-600'
            : highlight === 'same'
                ? isDark ? 'text-success-300' : 'text-success-600'
                : isDark ? 'text-secondary-100' : 'text-secondary-800';

    return (
        <tr className={`border-b last:border-0 ${isDark ? 'border-white/8' : 'border-black/6'}`}>
            <td className={`py-1 pr-3 text-xs font-medium whitespace-nowrap w-28 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                {label}
            </td>
            <td className={`py-1 text-xs font-mono ${highlightClass}`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{value}</span>
                    {prevValue && prevValue !== value && (
                        <span className={`text-[10px] font-mono line-through opacity-50 ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>
                            {prevValue}
                        </span>
                    )}
                    {badge && (
                        <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold"
                            style={{ background: badgeColor || 'var(--color-secondary-500)', color: 'white' }}
                        >
                            {badge}
                        </span>
                    )}
                </div>
            </td>
        </tr>
    );
}