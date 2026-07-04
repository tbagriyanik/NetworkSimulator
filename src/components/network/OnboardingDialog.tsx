'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Translations } from '@/contexts/LanguageContext';

interface OnboardingStep {
  title: string;
  description: string;
}

interface OnboardingDialogProps {
  open: boolean;
  t: Translations;
  isDark: boolean;
  onboardingStep: number;
  onboardingSteps: OnboardingStep[];
  closeOnboardingForever: () => void;
  prevOnboarding: () => void;
  nextOnboarding: () => void;
}

export function OnboardingDialog({
  open, t, isDark,
  onboardingStep, onboardingSteps,
  closeOnboardingForever, prevOnboarding, nextOnboarding,
}: OnboardingDialogProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      if (onboardingStep < onboardingSteps.length - 1) {
        nextOnboarding();
      }
    } else if (isRightSwipe) {
      if (onboardingStep > 0) {
        prevOnboarding();
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) closeOnboardingForever();
      }}
    >
      <DialogContent
        className={`${isDark ? 'bg-secondary-900 border-success-500/30' : 'bg-white border-success-500'} w-[95vw] sm:max-w-2xl md:max-w-3xl p-0 overflow-hidden liquid-glass-light max-h-[90vh] flex flex-col`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress Bar */}
        <div className="w-full h-1 bg-secondary-200 dark:bg-secondary-800">
          <div
            className="h-full bg-gradient-to-r from-accent-500 to-primary-500 transition-all duration-300"
            style={{ width: `${((onboardingStep + 1) / onboardingSteps.length) * 100}%` }}
          />
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <DialogHeader className="px-4 sm:px-8 pt-4 sm:pt-6 pb-2 cursor-default active:cursor-default select-none" data-drag-handle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-2">
              <DialogTitle className={`text-xl sm:text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-secondary-900'}`}>
                {onboardingSteps[onboardingStep]?.title}
              </DialogTitle>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${isDark ? 'bg-secondary-800 text-accent-400 border border-success-500/30' : 'bg-secondary-100 text-accent-600 border border-success-500/50'}`}>
                {onboardingStep + 1} / {onboardingSteps.length}
              </span>
            </div>
            <DialogDescription className={`text-sm sm:text-base md:text-lg leading-relaxed ${isDark ? 'text-secondary-300' : 'text-secondary-600'}`}>
              {onboardingSteps[onboardingStep]?.description}
            </DialogDescription>
          </DialogHeader>
        </ScrollArea>

        <div className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4 sm:py-6 bg-secondary-50/50 dark:bg-secondary-800/30 border-t border-success-500/50 dark:border-success-500/30 mt-auto">
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
            <Button onClick={nextOnboarding} className="bg-accent-600 hover:bg-accent-700 text-white text-xs font-semibold">
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
