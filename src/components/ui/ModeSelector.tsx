'use client';


import { useMode, LearningMode } from '@/contexts/ModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface ModeSelectorProps {
    className?: string;
    showLabel?: boolean;
}

const MODES = (language: string): Array<{ value: LearningMode; label: string; description: string }> => [
    {
        value: 'beginner',
        label: language === 'tr' ? 'Başlangıç' : 'Beginner',
        description: language === 'tr' ? 'Sınırlı cihazlar, basitleştirilmiş arayüz' : 'Limited devices, simplified interface',
    },
    {
        value: 'intermediate',
        label: language === 'tr' ? 'Orta Seviye' : 'Intermediate',
        description: language === 'tr' ? 'Tüm cihazlar, standart özellikler' : 'All devices, standard features',
    },
    {
        value: 'advanced',
        label: language === 'tr' ? 'İleri Seviye' : 'Advanced',
        description: language === 'tr' ? 'Tüm özellikler, kompakt arayüz' : 'All features, compact interface',
    },
];

export function ModeSelector({ className, showLabel = true }: ModeSelectorProps) {
    const { mode, setMode } = useMode();
    const { language } = useLanguage();

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            {showLabel && (
                <Label className="text-sm font-semibold">{language === 'tr' ? 'Öğrenme Modu' : 'Learning Mode'}</Label>
            )}
            <div className="flex gap-2">
                {MODES(language).map((m) => (
                    <label
                        key={m.value}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <input
                            type="radio"
                            name="learning-mode"
                            value={m.value}
                            checked={mode === m.value}
                            onChange={(e) => setMode(e.target.value as LearningMode)}
                            className="w-4 h-4 cursor-pointer"
                            aria-label={language === 'tr' ? `${m.label} modu: ${m.description}` : `${m.label} mode: ${m.description}`}
                        />
                        <span className="text-sm font-medium">{m.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
