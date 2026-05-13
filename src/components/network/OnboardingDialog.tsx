'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Translations } from '@/contexts/LanguageContext';

interface OnboardingStep {
  title: string;
  description: string;
}

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: Translations;
  isDark: boolean;
  onboardingStep: number;
  onboardingSteps: OnboardingStep[];
  closeOnboardingForever: () => void;
  prevOnboarding: () => void;
  nextOnboarding: () => void;
}

export function OnboardingDialog({
  open, onOpenChange, t, isDark,
  onboardingStep, onboardingSteps,
  closeOnboardingForever, prevOnboarding, nextOnboarding,
}: OnboardingDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) closeOnboardingForever();
      }}
    >
      <DialogContent className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} sm:max-w-2xl md:max-w-3xl p-0 overflow-hidden liquid-glass-light`}>
        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${((onboardingStep + 1) / onboardingSteps.length) * 100}%` }}
          />
        </div>

        <DialogHeader className="px-8 pt-6 pb-2 cursor-grab active:cursor-grabbing select-none" data-drag-handle>
          <div className="flex items-center justify-between gap-4 mb-2">
            <DialogTitle className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {onboardingSteps[onboardingStep]?.title}
            </DialogTitle>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${isDark ? 'bg-slate-800 text-cyan-400 border border-slate-700' : 'bg-slate-100 text-cyan-600 border border-slate-200'}`}>
              {onboardingStep + 1} / {onboardingSteps.length}
            </span>
          </div>
          <DialogDescription className={`text-base md:text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {onboardingSteps[onboardingStep]?.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 px-8 py-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 mt-4">
          <Button variant="ghost" onClick={closeOnboardingForever} className="text-xs font-semibold">
            {t.skip}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={prevOnboarding}
              disabled={onboardingStep === 0}
              className="text-xs font-semibold"
            >
              {t.back}
            </Button>
            <Button onClick={nextOnboarding} className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold">
              {onboardingStep >= onboardingSteps.length - 1
                ? t.finish
                : t.next}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
