'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { Keyboard, Command, MousePointer, Cpu } from 'lucide-react';

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  language: 'tr' | 'en';
}

export function ShortcutsModal({
  open,
  onOpenChange,
  isDark,
  language,
}: ShortcutsModalProps) {
  const isTr = language === 'tr';

  const shortcutGroups = [
    {
      title: isTr ? 'Genel & Proje' : 'General & Project',
      icon: Command,
      shortcuts: [
        { label: isTr ? 'Proje Kaydet' : 'Save Project', key: 'Ctrl+S' },
        { label: isTr ? 'Proje Aç' : 'Open Project', key: 'Ctrl+O' },
        { label: isTr ? 'Son İşlemi Geri Al' : 'Undo', key: 'Ctrl+Z' },
        { label: isTr ? 'İşlemi Yeniden Yap' : 'Redo', key: 'Ctrl+Y' },
        { label: isTr ? 'Kısayol Kılavuzu' : 'Shortcuts Guide', key: 'Shift+?' },
      ],
    },
    {
      title: isTr ? 'Tuval & Görünüm' : 'Canvas & View',
      icon: MousePointer,
      shortcuts: [
        { label: isTr ? 'Görünümü Sıfırla' : 'Reset View', key: 'Alt+R' },
        { label: isTr ? 'Ekrana Sığdır' : 'Zoom to Fit', key: 'Alt+F' },
        { label: isTr ? 'Mini Haritayı Aç/Kapat' : 'Toggle Mini-map', key: 'Alt+M' },
        { label: isTr ? 'Olay Günlüğü Aç/Kapat' : 'Toggle Event Log', key: 'Alt+L' },
        { label: isTr ? 'Yakınlaştır / Uzaklaştır' : 'Zoom In / Out', key: 'Ctrl + Scroll' },
        { label: isTr ? 'Tuvali Kaydır (Pan)' : 'Pan Canvas', key: 'Space + Drag' },
      ],
    },
    {
      title: isTr ? 'Cihaz & Düzenleme' : 'Device & Editing',
      icon: Cpu,
      shortcuts: [
        { label: isTr ? 'Cihazı Sil' : 'Delete Device', key: 'Delete / Backspace' },
        { label: isTr ? 'Cihaz Detaylarını Aç' : 'Open Device Config', key: 'Double Click' },
        { label: isTr ? 'Hizalama Izgarası (Snap)' : 'Snap to Grid', key: 'Ctrl (Basılı Tut / Hold)' },
        { label: isTr ? 'Çoklu Seçim' : 'Multi-Select', key: 'Shift + Click / Box' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-secondary-900 border-secondary-800 text-white' : 'bg-white border-secondary-200 text-secondary-900'}`}>
        <DialogHeader className="flex flex-row items-center gap-3 border-b pb-4 mb-4 dark:border-secondary-800 border-secondary-200">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold">
              {isTr ? 'Klavye & Tuval Kısayolları' : 'Keyboard & Canvas Shortcuts'}
            </DialogTitle>
            <DialogDescription className="text-xs text-secondary-400">
              {isTr ? 'Ağ simülasyonunda hızlı gezinme ve düzenleme kısayolları' : 'Speed up your workflow with shortcut keys'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {shortcutGroups.map((group, gIdx) => {
            const Icon = group.icon;
            return (
              <div
                key={gIdx}
                className={`p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-secondary-950/40 border-secondary-800/60' : 'bg-secondary-50/60 border-secondary-200/80'}`}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-500">
                  <Icon className="w-4 h-4" />
                  <span>{group.title}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {group.shortcuts.map((sc, sIdx) => (
                    <div key={sIdx} className="flex items-center justify-between gap-2 text-xs">
                      <span className={`text-[11px] font-medium leading-tight ${isDark ? 'text-secondary-300' : 'text-secondary-700'}`}>
                        {sc.label}
                      </span>
                      <ShortcutBadge shortcut={sc.key} variant="primary" className="shrink-0 text-[10px]" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
