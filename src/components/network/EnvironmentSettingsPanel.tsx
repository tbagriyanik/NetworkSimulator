'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useEnvironment } from '@/lib/store/appStore';
import { useAppStore, EnvironmentBackground } from '@/lib/store/appStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Leaf, Sun, Droplets, Thermometer, Home, Building2, X, Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnvironmentSettingsPanelProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const BACKGROUND_OPTIONS: { value: EnvironmentBackground; icon: React.ReactNode; labelKey: 'backgroundNone' | 'backgroundHouse' | 'backgroundTwoStoryGarage' | 'backgroundGreenhouse' }[] = [
  { value: 'none', icon: <X className="w-4 h-4" />, labelKey: 'backgroundNone' },
  { value: 'house', icon: <Home className="w-4 h-4" />, labelKey: 'backgroundHouse' },
  { value: 'twoStoryGarage', icon: <Building2 className="w-4 h-4" />, labelKey: 'backgroundTwoStoryGarage' },
  { value: 'greenhouse', icon: <Sprout className="w-4 h-4" />, labelKey: 'backgroundGreenhouse' },
];

export function EnvironmentSettingsPanel({ isOpen, onOpenChange }: EnvironmentSettingsPanelProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { setEnvironment } = useAppStore();
  const environment = useEnvironment();

  const isDark = theme === 'dark';

  React.useEffect(() => {
    if (!isOpen) return;
    const handleMobileBack = () => onOpenChange?.(false);
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    window.addEventListener('popstate', handleMobileBack);
    return () => {
      window.removeEventListener('mobile-back-pressed', handleMobileBack);
      window.removeEventListener('popstate', handleMobileBack);
    };
  }, [isOpen, onOpenChange]);

  const handleBackgroundChange = (background: EnvironmentBackground) => {
    setEnvironment((prev) => ({ ...prev, background }));
  };

  const handleTemperatureChange = (value: number) => {
    setEnvironment((prev) => ({ ...prev, temperature: value }));
  };

  const handleHumidityChange = (value: number) => {
    setEnvironment((prev) => ({ ...prev, humidity: value }));
  };

  const handleLightChange = (value: number) => {
    setEnvironment((prev) => ({ ...prev, light: value }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onOpenChange?.(true)}
            className={cn(
              'h-8 px-3 flex items-center gap-1.5 transition-all',
              isDark
                ? 'text-success-400 hover:text-success-300 hover:bg-secondary-700/50'
                : 'text-success-600 hover:text-success-700 hover:bg-secondary-200/50'
            )}
          >
            <Leaf className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">{t.environmentSettings}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>{t.environmentSettings}</TooltipContent>
      </Tooltip>
      <SheetContent
        side="right"
        overlayClassName="bg-transparent"
        className={cn(
          'w-[320px] p-0 overflow-y-auto custom-scrollbar',
          isDark ? 'bg-secondary-900 border-secondary-700' : 'bg-white border-secondary-200'
        )}
      >
        <SheetHeader className={cn(
          'p-4 border-b',
          isDark ? 'border-secondary-700' : 'border-secondary-200'
        )}>
          <SheetTitle className={cn(
            'text-lg font-bold flex items-center gap-2',
            isDark ? 'text-secondary-100' : 'text-secondary-900'
          )}>
            <Leaf className="w-5 h-5 text-success-400" />
            {t.environmentSettings}
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-6 custom-scrollbar">
          {/* Background Selection */}
          <div className="space-y-3">
            <label className={cn(
              'text-sm font-semibold flex items-center gap-2',
              isDark ? 'text-secondary-200' : 'text-secondary-700'
            )}>
              <Home className="w-4 h-4" />
              {t.environmentBackground}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleBackgroundChange(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                    environment?.background === option.value
                      ? isDark
                        ? 'bg-success-500/20 border-success-500/50 text-success-300'
                        : 'bg-success-50 border-success-200 text-success-700'
                      : isDark
                        ? 'bg-secondary-800 border-secondary-600 text-secondary-300 hover:bg-secondary-700'
                        : 'bg-secondary-50 border-secondary-200 text-secondary-600 hover:bg-secondary-100'
                  )}
                >
                  {option.icon}
                  <span className="text-xs font-medium text-center">
                    {t[option.labelKey]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <label className={cn(
              'text-sm font-semibold flex items-center gap-2',
              isDark ? 'text-secondary-200' : 'text-secondary-700'
            )}>
              <Thermometer className="w-4 h-4 text-warning-400" />
              {t.temperature}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="-20"
                max="50"
                value={environment?.temperature ?? 22}
                onChange={(e) => handleTemperatureChange(Number(e.target.value))}
                className={cn(
                  'w-full h-2 rounded-lg appearance-none cursor-pointer',
                  isDark ? 'bg-secondary-700' : 'bg-secondary-200'
                )}
                style={{
                  background: `linear-gradient(to right,
                    ${isDark ? 'var(--color-primary-500)' : 'var(--color-primary-400)'} 0%,
                    ${isDark ? 'var(--color-primary-500)' : 'var(--color-primary-400)'} ${(((environment?.temperature ?? 22) + 20) / 70) * 100}%,
                    ${isDark ? 'var(--color-secondary-700)' : 'var(--color-secondary-200)'} ${(((environment?.temperature ?? 22) + 20) / 70) * 100}%,
                    ${isDark ? 'var(--color-secondary-700)' : 'var(--color-secondary-200)'} 100%)`
                }}
              />
              <div className={cn(
                'flex justify-between text-xs',
                isDark ? 'text-secondary-500' : 'text-secondary-400'
              )}>
                <span>-20{t.celsius}</span>
                <span className={cn(
                  'font-bold text-base',
                  isDark ? 'text-warning-400' : 'text-warning-600'
                )}>
                  {environment?.temperature ?? 22}{t.celsius}
                </span>
                <span>50{t.celsius}</span>
              </div>
            </div>
          </div>

          {/* Humidity */}
          <div className="space-y-3">
            <label className={cn(
              'text-sm font-semibold flex items-center gap-2',
              isDark ? 'text-secondary-200' : 'text-secondary-700'
            )}>
              <Droplets className="w-4 h-4 text-primary-400" />
              {t.humidity}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={environment?.humidity ?? 50}
                onChange={(e) => handleHumidityChange(Number(e.target.value))}
                className={cn(
                  'w-full h-2 rounded-lg appearance-none cursor-pointer',
                  isDark ? 'bg-secondary-700' : 'bg-secondary-200'
                )}
                style={{
                  background: `linear-gradient(to right, 
                    ${isDark ? 'var(--color-primary-500)' : 'var(--color-primary-400)'} 0%, 
                    ${isDark ? 'var(--color-primary-500)' : 'var(--color-primary-400)'} ${environment?.humidity ?? 50}%, 
                    ${isDark ? 'var(--color-secondary-700)' : 'var(--color-secondary-200)'} ${environment?.humidity ?? 50}%, 
                    ${isDark ? 'var(--color-secondary-700)' : 'var(--color-secondary-200)'} 100%)`
                }}
              />
              <div className={cn(
                'flex justify-between text-xs',
                isDark ? 'text-secondary-500' : 'text-secondary-400'
              )}>
                <span>0{t.percent}</span>
                <span className={cn(
                  'font-bold text-base',
                  isDark ? 'text-primary-400' : 'text-primary-600'
                )}>
                  {environment?.humidity ?? 50}{t.percent}
                </span>
                <span>100{t.percent}</span>
              </div>
            </div>
          </div>

          {/* Light */}
          <div className="space-y-3">
            <label className={cn(
              'text-sm font-semibold flex items-center gap-2',
              isDark ? 'text-secondary-200' : 'text-secondary-700'
            )}>
              <Sun className="w-4 h-4 text-yellow-400" />
              {t.lightLevel}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={environment?.light ?? 70}
                onChange={(e) => handleLightChange(Number(e.target.value))}
                className={cn(
                  'w-full h-2 rounded-lg appearance-none cursor-pointer',
                  isDark ? 'bg-secondary-700' : 'bg-secondary-200'
                )}
                style={{
                  background: `linear-gradient(to right, 
                    ${isDark ? 'var(--color-warning-500)' : 'var(--color-warning-400)'} 0%, 
                    ${isDark ? 'var(--color-warning-500)' : 'var(--color-warning-400)'} ${environment?.light ?? 70}%, 
                    ${isDark ? 'var(--color-secondary-700)' : 'var(--color-secondary-200)'} ${environment?.light ?? 70}%, 
                    ${isDark ? 'var(--color-secondary-700)' : 'var(--color-secondary-200)'} 100%)`
                }}
              />
              <div className={cn(
                'flex justify-between text-xs',
                isDark ? 'text-secondary-500' : 'text-secondary-400'
              )}>
                <span>0{t.percent}</span>
                <span className={cn(
                  'font-bold text-base',
                  isDark ? 'text-yellow-400' : 'text-yellow-600'
                )}>
                  {environment?.light ?? 70}{t.percent}
                </span>
                <span>100{t.percent}</span>
              </div>
            </div>
          </div>

          {/* Environment Info Card */}
          <div className={cn(
            'p-4 rounded-xl border',
            isDark
              ? 'bg-secondary-800/50 border-secondary-600'
              : 'bg-secondary-50 border-secondary-200'
          )}>
            <div className={cn(
              'text-xs font-medium mb-3',
              isDark ? 'text-secondary-300' : 'text-secondary-600'
            )}>
              {t.environmentSettings}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={cn(
                'p-2 rounded-lg',
                isDark ? 'bg-secondary-700/50' : 'bg-white'
              )}>
                <Thermometer className={cn(
                  'w-4 h-4 mx-auto mb-1',
                  isDark ? 'text-warning-300' : 'text-warning-500'
                )} />
                <span className={cn(
                  'text-xs font-bold',
                  isDark ? 'text-secondary-100' : 'text-secondary-700'
                )}>
                  {environment?.temperature ?? 22}{t.celsius}
                </span>
              </div>
              <div className={cn(
                'p-2 rounded-lg',
                isDark ? 'bg-secondary-700/50' : 'bg-white'
              )}>
                <Droplets className={cn(
                  'w-4 h-4 mx-auto mb-1',
                  isDark ? 'text-primary-300' : 'text-primary-500'
                )} />
                <span className={cn(
                  'text-xs font-bold',
                  isDark ? 'text-secondary-100' : 'text-secondary-700'
                )}>
                  {environment?.humidity ?? 50}{t.percent}
                </span>
              </div>
              <div className={cn(
                'p-2 rounded-lg',
                isDark ? 'bg-secondary-700/50' : 'bg-white'
              )}>
                <Sun className={cn(
                  'w-4 h-4 mx-auto mb-1',
                  isDark ? 'text-yellow-300' : 'text-yellow-500'
                )} />
                <span className={cn(
                  'text-xs font-bold',
                  isDark ? 'text-secondary-100' : 'text-secondary-700'
                )}>
                  {environment?.light ?? 70}{t.percent}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
