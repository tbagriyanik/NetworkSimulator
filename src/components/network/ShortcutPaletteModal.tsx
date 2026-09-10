'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import {
  Search,
  Laptop,
  Router as RouterIcon,
  Network,
  Download,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Command,
} from 'lucide-react';

export interface ShortcutAction {
  id: string;
  title: string;
  category: 'Cihazlar' | 'Düzenleme' | 'Görünüm';
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  onSelect: () => void;
}

export interface ShortcutPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDevice?: (type: 'pc' | 'router' | 'switchL2' | 'switchL3') => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onExport?: () => void;
}

export function ShortcutPaletteModal({
  isOpen,
  onClose,
  onAddDevice,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onExport,
}: ShortcutPaletteModalProps) {
  const [query, setQuery] = useState('');

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const actions: ShortcutAction[] = useMemo(() => [
    {
      id: 'add-pc',
      title: 'Bilgisayar Ekles (PC)',
      category: 'Cihazlar',
      icon: Laptop,
      shortcut: 'Shift+P',
      onSelect: () => { onAddDevice?.('pc'); onClose(); },
    },
    {
      id: 'add-router',
      title: 'Yönlendirici Ekle (Router)',
      category: 'Cihazlar',
      icon: RouterIcon,
      shortcut: 'Shift+R',
      onSelect: () => { onAddDevice?.('router'); onClose(); },
    },
    {
      id: 'add-switch',
      title: 'Anahtar Ekle (L2 Switch)',
      category: 'Cihazlar',
      icon: Network,
      shortcut: 'Shift+S',
      onSelect: () => { onAddDevice?.('switchL2'); onClose(); },
    },
    {
      id: 'undo',
      title: 'Geri Al (Undo)',
      category: 'Düzenleme',
      icon: RotateCcw,
      shortcut: 'Ctrl+Z',
      onSelect: () => { onUndo?.(); onClose(); },
    },
    {
      id: 'redo',
      title: 'Yinele (Redo)',
      category: 'Düzenleme',
      icon: RotateCw,
      shortcut: 'Ctrl+Y',
      onSelect: () => { onRedo?.(); onClose(); },
    },
    {
      id: 'zoom-in',
      title: 'Yakınlaştır',
      category: 'Görünüm',
      icon: ZoomIn,
      shortcut: 'Ctrl++',
      onSelect: () => { onZoomIn?.(); onClose(); },
    },
    {
      id: 'zoom-out',
      title: 'Uzaklaştır',
      category: 'Görünüm',
      icon: ZoomOut,
      shortcut: 'Ctrl+-',
      onSelect: () => { onZoomOut?.(); onClose(); },
    },
    {
      id: 'export',
      title: 'Topolojiyi Dışa Aktar (JSON)',
      category: 'Düzenleme',
      icon: Download,
      shortcut: 'Ctrl+E',
      onSelect: () => { onExport?.(); onClose(); },
    },
  ], [onAddDevice, onUndo, onRedo, onZoomIn, onZoomOut, onExport, onClose]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (action) =>
        action.title.toLowerCase().includes(q) ||
        action.category.toLowerCase().includes(q)
    );
  }, [actions, query]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-background/95 backdrop-blur border-border/80 shadow-2xl">
        <DialogHeader className="p-3 border-b border-border/50 flex flex-row items-center gap-2 space-y-0">
          <Search className="h-4 w-4 text-muted-foreground ml-1" />
          <Input
            placeholder="Hızlı komut veya cihaz ara... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-8 text-sm p-0"
            autoFocus
          />
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
            <Command className="h-3 w-3" /> K
          </div>
        </DialogHeader>

        <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-6">
              Sonuç bulunamadı.
            </p>
          ) : (
            filteredActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onSelect}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent/80 hover:text-accent-foreground transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-muted group-hover:bg-background rounded-md text-foreground transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{action.title}</span>
                      <span className="text-[10px] text-muted-foreground">{action.category}</span>
                    </div>
                  </div>
                  {action.shortcut && (
                    <ShortcutBadge shortcut={action.shortcut} className="text-[10px]" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
