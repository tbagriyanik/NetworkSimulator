import React from 'react';
import { Button } from '@/components/ui/button';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { Trash2, Palette } from 'lucide-react';
import { triggerHapticFeedback, cn } from '@/lib/utils';
import type { OutputLine } from './PCPanel.types';
import { TERMINAL_COLOR_THEMES, type TerminalColorTheme } from '../terminal/terminalThemes';
import { safeSetItem } from '@/lib/storage/safeStorage';

interface CommandLineSettingsBarProps {
  showCmdSettings: boolean;
  fontSize: number;
  handleFontSizeChange: (val: number) => void;
  activeTerminalTab: 'cmd' | 'linux';
  colorTheme?: TerminalColorTheme;
  setColorTheme?: (theme: TerminalColorTheme) => void;
  language?: string;
  setPcOutput: (output: OutputLine[]) => void;
  setLinuxOutput: (output: OutputLine[]) => void;
  t: Record<string, string>;
}

export const CommandLineSettingsBar: React.FC<CommandLineSettingsBarProps> = ({
  showCmdSettings,
  fontSize,
  handleFontSizeChange,
  activeTerminalTab,
  colorTheme = 'default',
  setColorTheme,
  language = 'tr',
  setPcOutput,
  setLinuxOutput,
  t
}) => {
  if (!showCmdSettings) return null;
  const themeList = Object.values(TERMINAL_COLOR_THEMES);

  return (
    <div className="px-3 md:px-4 py-2 border-b bg-muted/30 flex flex-wrap items-center gap-3 md:gap-4 animate-in slide-in-from-top-2 shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-[160px]">
        <label className="text-[10px] font-black tracking-widest text-muted-foreground whitespace-nowrap">
          {t.fontSizeLabel}: {fontSize}px
        </label>
        <input
          type="range" min="10" max="20" value={fontSize}
          aria-label={t.fontSizeLabel}
          onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
          className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        {fontSize !== 13 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              triggerHapticFeedback('light');
              handleFontSizeChange(13);
            }}
            className="h-7 text-[10px] font-bold text-muted-foreground hover:text-foreground px-2"
            title={t.reset || 'Reset'}
          >
            {t.reset || 'Reset (13px)'}
          </Button>
        )}
      </div>

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
                    triggerHapticFeedback('light');
                    setColorTheme(item.id);
                    safeSetItem('pc-terminal-color-theme', item.id);
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
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          triggerHapticFeedback('light');
          if (activeTerminalTab === 'cmd') {
            setPcOutput([]);
          } else {
            setLinuxOutput([]);
          }
        }}
        className="h-7 text-[10px] font-black tracking-widest text-error-500 gap-1.5"
      >
        <Trash2 className="w-3 h-3" />
        {t.clearTerminalBtn}
        <ShortcutBadge shortcut="Ctrl+L" variant="danger" className="scale-75 origin-right" />
      </Button>
    </div>
  );
};

