'use client';

import { Search, Copy, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { cn } from '@/lib/utils';
import type { PCActiveTab } from './PCPanel.types';

interface PCPanelTerminalToolbarProps {
  activeTab: PCActiveTab;
  isDark: boolean;
  t: Record<string, string>;
  isMobile: boolean;
  language: string;
  showCmdSettings: boolean;
  onSearchOpen: () => void;
  onCopyAll: () => void;
  onToggleCmdSettings: () => void;
}

export function PCPanelTerminalToolbar({
  activeTab,
  isDark,
  t,
  isMobile,
  language,
  showCmdSettings,
  onSearchOpen,
  onCopyAll,
  onToggleCmdSettings,
}: PCPanelTerminalToolbarProps) {
  if (activeTab !== 'desktop' && activeTab !== 'terminal') return null;

  return (
    <div className="flex items-center gap-1">
      <TooltipWrapper title={(
        <div className="flex items-center gap-2">
          {t.search}
          {!isMobile && <ShortcutBadge shortcut="Ctrl+F" variant="primary" />}
        </div>
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchOpen}
          className={cn("h-8 w-8 rounded-lg text-secondary-600 hover:text-secondary-900", isDark && "text-secondary-300 hover:text-secondary-100")}
          aria-controls="search-dialog"
          aria-label={t.search}
        >
          <Search className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={t.copy}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCopyAll}
          className={cn("h-8 w-8 rounded-lg text-secondary-600 hover:text-secondary-900", isDark && "text-secondary-300 hover:text-secondary-100")}
          aria-label={t.copy}
        >
          <Copy className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper title={language === 'tr' ? 'Terminal Ayarları' : 'Terminal Settings'}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCmdSettings}
          className={cn("h-8 w-8 rounded-lg text-secondary-600 hover:text-secondary-900", showCmdSettings && "bg-accent", isDark && "text-secondary-300 hover:text-secondary-100")}
          aria-label={language === 'tr' ? 'Terminal Ayarları' : 'Terminal Settings'}
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
        </Button>
      </TooltipWrapper>
    </div>
  );
}
