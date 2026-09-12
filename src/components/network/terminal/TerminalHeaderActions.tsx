'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Copy, Check, Trash2, Download, Settings, Wifi, Type } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { cn } from '@/lib/utils';
import type { Translations } from '@/contexts/LanguageContext';
import type { CanvasDevice } from '../networkTopology.types';

interface TerminalHeaderActionsProps {
  isDark: boolean;
  isMobile: boolean;
  language: string;
  t: Translations;
  fontSize: number;
  setFontSize: (size: number) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  handleCopyAll: () => void;
  exportTerminal: () => void;
  clearTerminalView: () => void;
  wifiSignalStrength: number | null;
  showPowerButton?: boolean;
  isPoweredOff?: boolean;
  onTogglePower?: (deviceId: string) => void;
  deviceId: string;
  onQuickSettings?: () => void;
  onClose?: () => void;
  device?: CanvasDevice;
}

function getSignalIcon(strength: number) {
  if (strength === 0) return null;
  return (
    <div className="flex items-center gap-1">
      <Wifi className={cn(
        "w-4 h-4",
        strength >= 4 ? "text-success-500" :
          strength >= 3 ? "text-yellow-500" :
            strength >= 2 ? "text-warning-500" :
              "text-error-500"
      )} />
      <span className={cn(
        "text-[10px] font-black tracking-wider",
        strength >= 4 ? "text-success-500" :
          strength >= 3 ? "text-yellow-500" :
            strength >= 2 ? "text-warning-500" :
              "text-error-500"
      )}>
        {strength === 5 ? "100%" :
          strength === 4 ? "75%" :
            strength === 3 ? "50%" :
              strength === 2 ? "25%" :
                "1%"}
      </span>
    </div>
  );
}

export function TerminalHeaderActions({
  isDark,
  isMobile,
  language,
  t,
  fontSize,
  setFontSize,
  showSettings,
  setShowSettings,
  setSearchOpen,
  handleCopyAll,
  exportTerminal,
  clearTerminalView,
  wifiSignalStrength,
  showPowerButton = true,
  isPoweredOff = false,
  onTogglePower,
  deviceId,
  onQuickSettings,
  onClose,
  device,
}: TerminalHeaderActionsProps) {
  const [copied, setCopied] = useState(false);
  const btnClass = cn("h-9 w-9 md:h-8 md:w-8 rounded-lg text-secondary-600 hover:text-secondary-900", isDark && "text-secondary-300 hover:text-secondary-100");

  return (
    <div className="flex items-center gap-1">
      {wifiSignalStrength !== null && wifiSignalStrength > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-8 px-2 flex items-center rounded-lg">
              {getSignalIcon(wifiSignalStrength)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {t.wifiSignal}
          </TooltipContent>
        </Tooltip>
      )}
      {wifiSignalStrength !== null && wifiSignalStrength > 0 && (
        <div className={cn("w-px h-4 mx-1", isDark ? "bg-secondary-600" : "bg-border")} />
      )}
      <TooltipWrapper
        ariaLabel={t.search}
        title={
          <div className="flex items-center gap-2">
            {t.search}
            {!isMobile && <ShortcutBadge shortcut="Ctrl+F" variant="primary" />}
          </div>
        }>
        <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className={btnClass} aria-controls="search-dialog">
          <Search className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={copied ? (language === 'tr' ? 'Kopyalandı!' : 'Copied!') : (language === 'tr' ? 'Çıktıyı Kopyala' : (t.copy || 'Copy Output'))}>
        <Button variant="ghost" size="icon" onClick={() => {
          handleCopyAll();
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }} className={cn(btnClass, copied && "text-success-500 hover:text-success-600 bg-success-500/10")}>
          {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={t.exportLabel || (language === 'tr' ? 'Dışa Aktar' : 'Export')}>
        <Button variant="ghost" size="icon" onClick={exportTerminal} className={btnClass}>
          <Download className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={language === 'tr' ? 'Çıktıyı Temizle' : (t.clearTerminalBtn || 'Clear Output')}>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearTerminalView}
          className="h-9 w-9 md:h-8 md:w-8 rounded-lg text-error-500 hover:text-error-600 hover:bg-error-500/10"
          aria-label={language === 'tr' ? 'Çıktıyı Temizle' : (t.clearTerminalBtn || 'Clear')}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={language === 'tr' ? 'Yazı Boyutunu Küçült (A-)' : 'Decrease Font Size (A-)'}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const next = Math.max(10, fontSize - 1);
            setFontSize(next);
            try { localStorage.setItem('terminal-font-size', String(next)); } catch { }
          }}
          className={cn("h-9 w-9 md:h-8 md:w-8 rounded-lg text-secondary-600 hover:text-secondary-900 font-bold text-xs select-none", isDark && "text-secondary-300 hover:text-secondary-100")}
          aria-label="A-"
        >
          A-
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={language === 'tr' ? 'Yazı Boyutunu Büyüt (A+)' : 'Increase Font Size (A+)'}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const next = Math.min(20, fontSize + 1);
            setFontSize(next);
            try { localStorage.setItem('terminal-font-size', String(next)); } catch { }
          }}
          className={cn("h-9 w-9 md:h-8 md:w-8 rounded-lg text-secondary-600 hover:text-secondary-900 font-bold text-xs select-none", isDark && "text-secondary-300 hover:text-secondary-100")}
          aria-label="A+"
        >
          A+
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={t.fontLabel}>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className={cn("h-9 w-9 md:h-8 md:w-8 rounded-lg text-secondary-600 hover:text-secondary-900", showSettings && "bg-accent", isDark && "text-secondary-300 hover:text-secondary-100")}>
          <Type className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
      {showPowerButton && (
        <>
          <div className={cn("w-px h-4 mx-1", isDark ? "bg-secondary-600" : "bg-border")} />
          <TooltipWrapper title={t.power}>
            <Button variant="ghost" size="icon" onClick={() => onTogglePower?.(deviceId)} className={cn("h-9 w-9 md:h-8 md:w-8 rounded-lg", isPoweredOff ? "text-error-500" : "text-success-500")}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
              </svg>
            </Button>
          </TooltipWrapper>
        </>
      )}
      {isMobile && onQuickSettings && (
        <TooltipWrapper title={t.quickSettingsAndTasks}>
          <Button variant="ghost" size="icon" onClick={(e) => {
            e.stopPropagation();
            onQuickSettings();
          }} className={btnClass}>
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Button>
        </TooltipWrapper>
      )}
      {isMobile && (device?.type === 'firewall' || device?.type === 'pc' || device?.type === 'iot') && onClose && (
        <TooltipWrapper title={t.close || 'Close'}>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-error-500 hover:text-white dark:hover:bg-error-600">
            <span className="w-4 h-4" aria-hidden="true" />
          </Button>
        </TooltipWrapper>
      )}
    </div>
  );
}
