import React from 'react';
import { Button } from '@/components/ui/button';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { Trash2 } from 'lucide-react';
import { triggerHapticFeedback } from '@/lib/utils';
import type { OutputLine } from './PCPanel.types';

interface CommandLineSettingsBarProps {
  showCmdSettings: boolean;
  fontSize: number;
  handleFontSizeChange: (val: number) => void;
  activeTerminalTab: 'cmd' | 'linux';
  setPcOutput: (output: OutputLine[]) => void;
  setLinuxOutput: (output: OutputLine[]) => void;
  t: Record<string, string>;
}


export const CommandLineSettingsBar: React.FC<CommandLineSettingsBarProps> = ({
  showCmdSettings,
  fontSize,
  handleFontSizeChange,
  activeTerminalTab,
  setPcOutput,
  setLinuxOutput,
  t
}) => {
  if (!showCmdSettings) return null;

  return (
    <div className="px-3 md:px-4 py-2 border-b bg-muted/30 flex items-center gap-4 animate-in slide-in-from-top-2 shrink-0">
      <label className="text-[10px] font-black tracking-widest text-muted-foreground whitespace-nowrap">
        {t.fontSizeLabel}: {fontSize}px
      </label>
      <input
        type="range" min="10" max="20" value={fontSize}
        aria-label={t.fontSizeLabel}
        onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
        className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
      />
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

