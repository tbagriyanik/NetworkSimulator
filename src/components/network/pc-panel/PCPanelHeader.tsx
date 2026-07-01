'use client';

import { ArrowLeft, Settings, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { WifiSignalMeter } from '../PCPanelWidgets';
import { cn } from '@/lib/utils';
import type { PCActiveTab } from './PCPanel.types';

interface PCPanelHeaderProps {
  isDark: boolean;
  internalPcHostname: string;
  pcIP: string;
  activeTab: PCActiveTab;
  language: string;
  isPcPoweredOff: boolean;
  wifiSignalStrength: number;
  showCmdSettings: boolean;
  isMobile: boolean;
  ntpPanelTime: Date;
  t: Record<string, string>;
  deviceId: string;
  onGoHome: () => void;
  onNavigateToProgram: (program: PCActiveTab) => void;
  onToggleShowCmdSettings: () => void;
  onTogglePower?: (deviceId: string) => void;
  onClose?: () => void;
  formatTime: (date: Date) => string;
  formatFullDateTime: (date: Date) => string;
}

export function PCPanelHeader({
  isDark,
  internalPcHostname,
  pcIP,
  activeTab,
  language,
  isPcPoweredOff,
  wifiSignalStrength,
  showCmdSettings,
  isMobile,
  ntpPanelTime,
  t,
  deviceId,
  onGoHome,
  onNavigateToProgram,
  onToggleShowCmdSettings,
  onTogglePower,
  onClose,
  formatTime,
  formatFullDateTime,
}: PCPanelHeaderProps) {
  return (
    <div className="shrink-0 px-2 pt-2 md:px-2 md:pt-2">
      <div className={cn(
        "mx-auto flex items-center justify-between gap-2 rounded-xl border px-2 py-1.5 md:px-3 md:py-2 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
        isDark
          ? "border-white/10 bg-secondary-900/70 text-secondary-100"
          : "border-white/60 bg-white/70 text-secondary-900"
      )}>
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0">
            <div className={cn("truncate text-xs md:text-sm font-semibold", isDark ? "text-white" : "text-secondary-900")}>
              {internalPcHostname}
            </div>
            <div className={cn("truncate text-[10px] md:text-xs font-mono", isDark ? "text-accent-300/85" : "text-accent-700/80")}>
              {pcIP}
            </div>
          </div>
          <div className={cn(
            "pointer-events-auto flex items-center gap-1 rounded-full border px-1.5 py-1 md:px-2 md:py-1.5 backdrop-blur-xl shadow-sm ml-auto",
            isDark ? "border-white/10 bg-secondary-900/70" : "border-white/80 bg-white/85"
          )}>
            {activeTab !== 'home' && (
              <TooltipWrapper title={language === 'tr' ? 'Geri' : 'Back'}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onGoHome}
                  className={cn(
                    "h-7 w-7 md:h-9 md:w-9 rounded-full",
                    isDark ? "text-secondary-300 hover:text-accent-300 hover:bg-white/5" : "text-secondary-600 hover:text-accent-700 hover:bg-secondary-100"
                  )}
                  aria-label={language === 'tr' ? 'Geri' : 'Back'}
                >
                  <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
              </TooltipWrapper>
            )}
            <TooltipWrapper title={language === 'tr' ? 'Kablosuz' : 'Wireless'}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigateToProgram('wireless')}
                disabled={isPcPoweredOff}
                className={cn(
                  "relative h-7 w-7 md:h-9 md:w-9 rounded-full",
                  activeTab === 'wireless'
                    ? (isDark ? "bg-accent-500/20 text-accent-300" : "bg-accent-100 text-accent-700")
                    : (isDark ? "text-accent-300 hover:bg-white/5" : "text-accent-700 hover:bg-secondary-100")
                )}
                aria-label={language === 'tr' ? 'Kablosuz' : 'Wireless'}
              >
                <span className="pointer-events-none w-3.5 h-3.5 md:w-4 md:h-4">
                  <WifiSignalMeter strength={wifiSignalStrength} />
                </span>
              </Button>
            </TooltipWrapper>
            <TooltipWrapper title={language === 'tr' ? 'Ayarlar' : 'Settings'}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigateToProgram('settings')}
                disabled={isPcPoweredOff}
                className={cn(
                  "h-7 w-7 md:h-9 md:w-9 rounded-full",
                  activeTab === 'settings'
                    ? (isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700")
                    : (isDark ? "text-violet-300 hover:bg-white/5" : "text-violet-700 hover:bg-secondary-100")
                )}
                aria-label={language === 'tr' ? 'Ayarlar' : 'Settings'}
              >
                <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </TooltipWrapper>
            {isMobile && (
              <TooltipWrapper title={language === 'tr' ? 'Hızlı ayarlar' : 'Quick settings'}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleShowCmdSettings}
                  disabled={isPcPoweredOff}
                  className={cn(
                    "h-7 w-7 rounded-full",
                    showCmdSettings
                      ? (isDark ? "bg-warning-500/20 text-warning-300" : "bg-warning-100 text-warning-700")
                      : (isDark ? "text-warning-300 hover:bg-white/5" : "text-warning-700 hover:bg-secondary-100")
                  )}
                  aria-label={language === 'tr' ? 'Hızlı ayarlar' : 'Quick settings'}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </Button>
              </TooltipWrapper>
            )}
            <TooltipWrapper title={formatFullDateTime(ntpPanelTime)}>
              <div className={cn(
                "rounded-full px-2 py-1 md:px-3 md:py-2 text-[10px] md:text-[11px] font-mono font-semibold tracking-wide cursor-default",
                isDark ? "bg-white/5 text-accent-200" : "bg-secondary-100 text-accent-800"
              )}>
                {formatTime(ntpPanelTime)}
              </div>
            </TooltipWrapper>
            <TooltipWrapper title={t.power}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onGoHome();
                  onTogglePower?.(deviceId);
                }}
                className={cn(
                  "h-7 w-7 md:h-9 md:w-9 rounded-full transition-all",
                  isPcPoweredOff
                    ? 'text-rose-500 hover:text-rose-400 hover:bg-rose-500/10'
                    : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                )}
                aria-label={t.power}
                disabled={!onTogglePower}
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
                </svg>
              </Button>
            </TooltipWrapper>
            {isMobile && (
              <TooltipWrapper title={language === 'tr' ? 'Kapat' : 'Close'}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className={cn(
                    "h-7 w-7 rounded-full",
                    isDark ? "text-rose-400 hover:bg-rose-500/10" : "text-rose-600 hover:bg-rose-500/10"
                  )}
                  aria-label={language === 'tr' ? 'Kapat' : 'Close'}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </TooltipWrapper>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
