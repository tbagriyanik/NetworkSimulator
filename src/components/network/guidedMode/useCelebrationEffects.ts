import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export function useCelebrationEffects(language: string, currentStepIndex: number) {
    const triggerStepCelebration = useCallback(() => {
        if (typeof window === 'undefined') return;

        toast({
            title: language === 'tr' ? `${currentStepIndex + 1}. Adım Tamamlandı! 🎉` : `Step ${currentStepIndex + 1} Completed! 🎉`,
            description: language === 'tr' ? 'Harika iş!' : 'Great job!',
        });

        const isGraphicsLow = document.body.classList.contains('graphics-low');
        if (isGraphicsLow) return;

        const emojis = ['🎉', '✨', '🌟', '⭐'];
        for (let i = 0; i < 20; i++) {
            const emoji = document.createElement('div');
            emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            emoji.style.cssText = `
        position: fixed;
        left: ${Math.random() * 100}vw;
        top: 100vh;
        font-size: 24px;
        pointer-events: none;
        z-index: 9999;
        animation: float-up 2s ease-out forwards;
      `;
            document.body.appendChild(emoji);
            setTimeout(() => emoji.remove(), 2000);
        }
    }, [language, currentStepIndex]);

    const triggerLessonCompleteCelebration = useCallback(() => {
        if (typeof window === 'undefined') return;

        toast({
            title: language === 'tr' ? 'Ders Tamamlandı! 🏆' : 'Lesson Completed! 🏆',
            description: language === 'tr' ? 'Tebrikler, tüm adımları tamamladınız!' : 'Congratulations, you completed all steps!',
        });

        const isGraphicsLow = document.body.classList.contains('graphics-low');
        if (isGraphicsLow) return;

        const emojis = ['🎉', '🎊', '✨', '🌟', '⭐', '🏆', '👏'];
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const emoji = document.createElement('div');
                emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                emoji.style.cssText = `
          position: fixed;
          left: ${Math.random() * 100}vw;
          top: 100vh;
          font-size: ${20 + Math.random() * 20}px;
          pointer-events: none;
          z-index: 9999;
          animation: float-up 3s ease-out forwards;
        `;
                document.body.appendChild(emoji);
                setTimeout(() => emoji.remove(), 3000);
            }, i * 50);
        }
    }, [language]);

    return { triggerStepCelebration, triggerLessonCompleteCelebration };
}
