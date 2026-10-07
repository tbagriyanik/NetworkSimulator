'use client';

import { Button } from '@/components/ui/button';
import { Trash2, Palette } from 'lucide-react';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import type { Translations } from '@/contexts/LanguageContext';
import { safeSetItem } from '@/lib/storage/safeStorage';
import { TERMINAL_COLOR_THEMES, type TerminalColorTheme } from './terminalThemes';
import { cn } from '@/lib/utils';

interface TerminalSettingsBarProps {
  t: Translations;
  fontSize: number;
  setFontSize: (value: number) => void;
  colorTheme?: TerminalColorTheme;
  setColorTheme?: (theme: TerminalColorTheme) => void;
  language?: string;
  onClear: () => void;
}

export function TerminalSettingsBar({
  t,
  fontSize,
  setFontSize,
  colorTheme = 'default',
  setColorTheme,
  language = 'tr',
  onClear
}: TerminalSettingsBarProps) {
  const themeList = Object.values(TERMINAL_COLOR_THEMES);

  return (
    <div className="px-3 md:px-4 py-2 border-b bg-muted/30 flex flex-wrap items-center gap-3 md:gap-4 animate-in slide-in-from-top-2 shrink-0">
      {/* Font Size Control */}
      <div className="flex items-center gap-2 flex-1 min-w-[160px]">
        <label className="text-[10px] font-black tracking-widest text-muted-foreground whitespace-nowrap">
          {t.fontSizeLabel}: {fontSize}px
        </label>
        <input
          type="range" min="10" max="20" value={fontSize}
          aria-label={t.fontSizeLabel}
          onChange={(e) => { const v = parseInt(e.target.value); setFontSize(v); safeSetItem('terminal-font-size', String(v)); }}
          className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        {fontSize !== 13 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFontSize(13); safeSetItem('terminal-font-size', '13'); }}
            className="h-7 text-[10px] font-bold text-muted-foreground hover:text-foreground px-2"
            title={t.reset || 'Reset'}
          >
            {t.reset || 'Reset (13px)'}
          </Button>
        )}
      </div>

      {/* Terminal Color Themes */}
      {setColorTheme && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Palette className="w-3.5 h-3.5 text-muted-foreground mr-0.5" />
          <div className="flex items-center gap-1 bg-background/60 p-0.5 rounded-md border">
            {themeList.map((item) => {
              const isSelected = colorTheme === item.id;
              const label = language === 'tr' ? item.labelTr : item.labelEn;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={label}
                  onClick={() => {
                    setColorTheme(item.id);
                    safeSetItem('terminal-color-theme', item.id);
                  }}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded transition-all select-none",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear Button */}
      <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-[10px] font-black tracking-widest text-error-500 gap-1.5 shrink-0">
        <Trash2 className="w-3 h-3" />
        {t.clearTerminalBtn}
        <ShortcutBadge shortcut="Ctrl+L" variant="danger" className="scale-75 origin-right" />
      </Button>
    </div>
  );
}