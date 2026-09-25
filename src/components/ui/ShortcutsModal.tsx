'use client';

import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { Keyboard, Command, MousePointer, Cpu } from 'lucide-react';
import { isMacPlatform, formatShortcutLabel } from '@/lib/utils/platform';

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
  const isMac = isMacPlatform();
  const modText = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onOpenChange]);

  const rawShortcutGroups = [
    {
      title: isTr ? 'Cihaz & Bağlantı' : 'Device & Cabling',
      icon: Cpu,
      shortcuts: [
        { label: isTr ? 'Cihaz Detaylarını Aç' : 'Open Device Config', key: 'Double Click' },
        { label: isTr ? 'Cihazı Sil' : 'Delete Device', key: 'Delete' },
        { label: isTr ? 'Cihazı Yeniden Adlandır' : 'Rename Device', key: 'F2' },
        { label: isTr ? 'Çoklu Seçim' : 'Multi-Select', key: 'Shift + Click / Box' },
        { label: isTr ? 'Hizalama Izgarası (Snap)' : 'Snap to Grid', key: `${modText} (Hold / Basılı)` },
        { label: isTr ? 'Kablo Takarken Gövdeye Tıkla' : 'Auto-Connect Port', key: 'Click Device' },
        { label: isTr ? 'Cihaza Odaklan & Kamera Ortalama' : 'Focus Device', key: 'Enter (Search / Görev)' },
      ],
    },
    {
      title: isTr ? 'Genel & Proje' : 'General & Project',
      icon: Command,
      shortcuts: [
        { label: isTr ? 'İşlemi Yeniden Yap' : 'Redo', key: formatShortcutLabel('Y') },
        { label: isTr ? 'Proje Aç' : 'Open Project', key: formatShortcutLabel('O') },
        { label: isTr ? 'Proje Kaydet' : 'Save Project', key: formatShortcutLabel('S') },
        { label: isTr ? 'Son İşlemi Geri Al' : 'Undo', key: formatShortcutLabel('Z') },
        { label: isTr ? 'Tam Ekrana Geç/Çık' : 'Toggle Fullscreen', key: formatShortcutLabel('F') },
        { label: isTr ? 'Yardım & Kısayol Rehberi' : 'Help & Guide', key: 'F1 / Shift+?' },
        { label: isTr ? 'Yeni Proje' : 'New Project', key: 'Alt+N' },
      ],
    },
    {
      title: isTr ? 'Tuval & Görünüm' : 'Canvas & View',
      icon: MousePointer,
      shortcuts: [
        { label: isTr ? 'Ağ Topolojisini Yenile' : 'Refresh Topology', key: 'F5' },
        { label: isTr ? 'Ekrana Sığdır' : 'Zoom to Fit', key: 'Alt+F' },
        { label: isTr ? 'Görünümü Sıfırla' : 'Reset View', key: 'Alt+R / Home' },
        { label: isTr ? 'Mini Haritayı Aç/Kapat' : 'Toggle Mini-map', key: 'Alt+M' },
        { label: isTr ? 'Olay Günlüğü Aç/Kapat' : 'Toggle Event Log', key: 'Alt+L' },
        { label: isTr ? 'Paket Analizini Oynat/Duraklat' : 'Play/Pause Packet Anim', key: 'P' },
        { label: isTr ? 'Sonraki Hop Adımı' : 'Next Hop Step', key: 'N' },
        { label: isTr ? 'Tuvali Kaydır' : 'Pan Canvas', key: 'Space + Drag' },
        { label: isTr ? 'Yakınlaştır / Uzaklaştır' : 'Zoom In / Out', key: `${modText} + Scroll` },
      ],
    },
    {
      title: isTr ? 'Pencere & Terminal' : 'Window & Terminal',
      icon: Keyboard,
      shortcuts: [
        { label: isTr ? 'Etkin Pencereyi Küçült' : 'Minimize Window', key: formatShortcutLabel('M') },
        { label: isTr ? 'Komut Tamamlama' : 'Auto-Complete', key: 'Tab' },
        { label: isTr ? 'Komut Geçmişi' : 'Command History', key: '↑ / ↓' },
        { label: isTr ? 'Pencere Değiştirici' : 'Window Switcher', key: 'Shift+Tab' },
        { label: isTr ? 'Sağ Tık Yapıştır' : 'Right-Click Paste', key: 'Right Click' },
        { label: isTr ? 'Sonraki Cihaza Odaklan' : 'Focus Next Device', key: 'Tab' },
        { label: isTr ? 'Terminali Temizle' : 'Clear Terminal', key: formatShortcutLabel('L') },
        { label: isTr ? 'Yüzen Pencereyi Daralt/Genişlet' : 'Collapse/Expand Window', key: 'Title Double-Click' },
      ],
    },
  ];

  // Alphabetically sort groups and items based on current active language
  const locale = isTr ? 'tr' : 'en';
  const shortcutGroups = [...rawShortcutGroups]
    .sort((a, b) => a.title.localeCompare(b.title, locale))
    .map((group) => ({
      ...group,
      shortcuts: [...group.shortcuts].sort((a, b) => a.label.localeCompare(b.label, locale)),
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onEscapeKeyDown={() => onOpenChange(false)}
        className={`sm:max-w-7xl md:max-w-[1400px] w-[96vw] max-w-[96vw] rounded-2xl border shadow-2xl p-6 sm:p-8 ${isDark ? 'bg-secondary-900 border-secondary-800 text-white' : 'bg-white border-secondary-200 text-secondary-900'}`}
      >
        <DialogHeader className="flex flex-row items-center gap-3 border-b pb-4 mb-4 dark:border-secondary-800 border-secondary-200">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold">
              {isTr ? 'Klavye & Tuval Kısayolları' : 'Keyboard & Canvas Shortcuts'}
            </DialogTitle>
            <DialogDescription className="text-xs text-secondary-400">
              {isTr ? 'Ağ simülasyonunda hızlı gezinme, cihaz yönetimi ve terminal kısayolları' : 'Speed up your workflow with shortcut keys'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[72vh] overflow-y-auto pr-1">
          {shortcutGroups.map((group, gIdx) => {
            const Icon = group.icon;
            return (
              <div
                key={gIdx}
                className={`p-4 rounded-xl border flex flex-col gap-3.5 ${isDark ? 'bg-secondary-950/40 border-secondary-800/60' : 'bg-secondary-50/60 border-secondary-200/80'}`}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-500 border-b pb-2 dark:border-secondary-800 border-secondary-200/60">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{group.title}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {group.shortcuts.map((sc, sIdx) => (
                    <div key={sIdx} className="flex items-start justify-between gap-3 text-xs">
                      <span className={`text-xs font-medium leading-normal flex-1 ${isDark ? 'text-secondary-300' : 'text-secondary-700'}`}>
                        {sc.label}
                      </span>
                      <ShortcutBadge shortcut={sc.key} variant="primary" className="shrink-0 text-[10px] mt-0.5 whitespace-nowrap" />
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
