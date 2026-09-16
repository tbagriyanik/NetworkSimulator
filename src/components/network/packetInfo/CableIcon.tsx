import { CABLE_COLORS } from '../NetworkTopology/utils/networkTopology.constants';

export function getCableColor(cableType: string) {
    if (cableType === 'crossover') return CABLE_COLORS.crossover.primary;
    if (cableType === 'fiber') return CABLE_COLORS.fiber.primary;
    if (cableType === 'console') return CABLE_COLORS.console.primary;
    if (cableType === 'serial') return CABLE_COLORS.serial.primary;
    if (cableType === 'straight') return CABLE_COLORS.straight.primary;
    return 'var(--color-secondary-400)';
}

// Kablo tipine göre SVG simgesi döndürür
export function CableIcon({ cableType, color, width = 56, isMobile = false }: { cableType: string; color: string; width?: number; isMobile?: boolean }) {
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
    if (cableType === 'serial') {
        // Seri kablo — şimşek/zigzag
        return (
            <svg width={w} height="14" viewBox="0 0 56 14" fill="none">
                <polyline points="2,10 14,3 24,11 34,3 44,11 54,4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <polygon points="54,1 58,4 54,7" fill={color} />
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
