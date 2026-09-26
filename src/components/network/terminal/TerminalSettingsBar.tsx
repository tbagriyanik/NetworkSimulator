'use client';

import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import type { Translations } from '@/contexts/LanguageContext';
import { safeSetItem } from '@/lib/storage/safeStorage';

interface TerminalSettingsBarProps {
  t: Translations;
  fontSize: number;
  setFontSize: (value: number) => void;
  onClear: () => void;
}

export function TerminalSettingsBar({ t, fontSize, setFontSize, onClear }: TerminalSettingsBarProps) {
  return (
    <div className="px-3 md:px-4 py-2 border-b bg-muted/30 flex items-center gap-4 animate-in slide-in-from-top-2 shrink-0">
      <label className="text-[10px] font-black tracking-widest text-muted-foreground whitespace-nowrap">
        {t.fontSizeLabel}: {fontSize}px
      </label>
      <input
        type="range" min="10" max="20" value={fontSize}
        aria-label={t.fontSizeLabel}
        onChange={(e) => { const v = parseInt(e.target.value); setFontSize(v); safeSetItem('terminal-font-size', String(v)); }}
        className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-[10px] font-black tracking-widest text-error-500 gap-1.5">
        <Trash2 className="w-3 h-3" />
        {t.clearTerminalBtn}
        <ShortcutBadge shortcut="Ctrl+L" variant="danger" className="scale-75 origin-right" />
      </Button>
    </div>
  );
}