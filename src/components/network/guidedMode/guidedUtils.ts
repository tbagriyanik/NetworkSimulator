export function formatElapsed(totalSec: number) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getDifficultyText(difficulty: string, t: Record<string, string>) {
    switch (difficulty) {
        case 'beginner': return t.beginner;
        case 'intermediate': return t.intermediate;
        case 'advanced': return t.advanced;
        default: return difficulty;
    }
}
