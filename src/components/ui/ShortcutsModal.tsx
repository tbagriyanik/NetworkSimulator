'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { KeyboardLayout } from '@/components/ui/KeyboardLayout';
import { Keyboard, Command, MousePointer, Cpu, List, LayoutGrid } from 'lucide-react';
import { isMacPlatform, formatShortcutLabel } from '@/lib/utils/platform';
import { cn } from '@/lib/utils';

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

  const [activeTab, setActiveTab] = useState('list');
  const [selectedShortcut, setSelectedShortcut] = useState<string | null>(null);

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
        { label: isTr ? 'Cihaz Seçim Menüsü & Arama' : 'Device Menu & Search', key: 'F3' },
        { label: isTr ? 'Cihazı Ortala & %100 Yakınlaştır' : 'Center Device & Zoom 100%', key: 'Num ,' },
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
        { label: isTr ? 'Görünümü Sıfırla' : 'Reset View', key: '0 / Alt+R / Home' },
        { label: isTr ? 'Mini Haritayı Aç/Kapat' : 'Toggle Mini-map', key: 'Alt+M' },
        { label: isTr ? 'Olay Günlüğü Aç/Kapat' : 'Toggle Event Log', key: 'Alt+L' },
        { label: isTr ? 'Paket Analizini Oynat/Duraklat' : 'Play/Pause Packet Anim', key: 'P' },
        { label: isTr ? 'Sonraki Hop Adımı' : 'Next Hop Step', key: 'N' },
        { label: isTr ? 'Tuvali Kaydır' : 'Pan Canvas', key: 'Space + Drag' },
        { label: isTr ? 'Yakınlaştır / Uzaklaştır' : 'Zoom In / Out', key: `+ / - / ${modText}+Scroll` },
      ],
    },
    {
      title: isTr ? 'Pencere & Terminal' : 'Window & Terminal',
      icon: Keyboard,
      shortcuts: [
        { label: isTr ? 'Etkin Pencereyi Küçült' : 'Minimize Window', key: formatShortcutLabel('M') },
        { label: isTr ? 'Satır İptali / Komut Kesme' : 'Cancel Command / Break', key: 'Ctrl+C' },
        { label: isTr ? 'Yapılandırma Modundan Çıkış' : 'Exit Config Mode (End)', key: 'Ctrl+Z' },
        { label: isTr ? 'Komut Tamamlama' : 'Auto-Complete', key: 'Tab' },
        { label: isTr ? 'Komut Geçmişi' : 'Command History', key: '↑ / ↓' },
        { label: isTr ? 'Modal / Pencere Kapat' : 'Close Modal / Window', key: 'ESC / Mobil Back' },
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

  // Flattened, alphabetically sorted shortcut list used by the keyboard tab.
  const allShortcuts = useMemo(
    () =>
      shortcutGroups
        .flatMap((group) => group.shortcuts.map((sc) => ({ ...sc, group: group.title })))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [shortcutGroups, locale]
  );

  /**
   * Maps a human readable shortcut ("Ctrl+S", "Shift + Click", "Alt+F") to the
   * canonical key ids understood by the visual keyboard layout.
   */
  const shortcutToKeyIds = (shortcut: string): string[] => {
    return shortcut
      .split('+')
      .map((part) => part.trim().toLowerCase())
      .flatMap((part) => {
        if (!part) return [];
        switch (part) {
          case 'ctrl':
          case 'control':
          case '⌘':
          case 'cmd':
            return ['ctrl'];
          case 'shift':
            return ['shift'];
          case 'alt':
          case '⌥':
            return ['alt'];
          case 'tab':
            return ['tab'];
          case 'esc':
          case 'escape':
            return ['esc'];
          case 'enter':
          case 'return':
            return ['enter'];
          case 'space':
            return ['space'];
          case 'delete':
          case 'del':
            return ['backspace'];
          case '↑':
            return ['up'];
          case '↓':
            return ['down'];
          default: {
            // Function keys, single characters and literal keys (e.g. f5, s, ,).
            const fn = part.match(/^f(\d{1,2})$/);
            if (fn) return [`f${fn[1]}`];
            return [part];
          }
        }
      });
  };

  const highlightKeys = selectedShortcut ? shortcutToKeyIds(selectedShortcut) : [];

  /**
   * Builds a key → description map so hovering a key on the visual keyboard can
   * show what can be done with it. A key used by several shortcuts collects all
   * of their labels.
   */
  const keyDescriptions = useMemo(() => {
    const map = new Map<string, string[]>();
    allShortcuts.forEach((sc) => {
      shortcutToKeyIds(sc.key).forEach((id) => {
        const list = map.get(id) ?? [];
        if (!list.includes(sc.label)) list.push(sc.label);
        map.set(id, list);
      });
    });
    const result: Record<string, string> = {};
    map.forEach((labels, id) => {
      result[id] = labels.join(' · ');
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allShortcuts]);

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className={cn(
              'mb-4 grid w-full grid-cols-2 sm:w-auto sm:inline-flex',
              isDark ? 'bg-secondary-800 text-secondary-300' : 'bg-secondary-100 text-secondary-600'
            )}
          >
            <TabsTrigger value="list" className="gap-2 cursor-pointer">
              <List className="w-4 h-4" />
              {isTr ? 'Kısayol Listesi' : 'Shortcut List'}
            </TabsTrigger>
            <TabsTrigger value="keyboard" className="gap-2 cursor-pointer">
              <LayoutGrid className="w-4 h-4" />
              {isTr ? 'Klavye Görünümü' : 'Keyboard View'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[62vh] overflow-y-auto pr-1">
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
          </TabsContent>

          <TabsContent value="keyboard" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 max-h-[62vh] overflow-y-auto pr-1">
              <div className="lg:col-span-3 order-2 lg:order-1">
                <KeyboardLayout
                  highlightKeys={highlightKeys}
                  keyDescriptions={keyDescriptions}
                  labels={{
                    highlightHint: isTr
                      ? 'Kısayol seçip tuşların klavyede vurgulanışını görün'
                      : 'Pick a shortcut to see its keys highlighted on the keyboard',
                    selected: isTr ? 'Seçili kısayol' : 'Selected shortcut',
                    emptyKey: isTr ? 'Bu tuşa atanmış bir kısayol yok' : 'No shortcut assigned to this key',
                    modifierLegend: {
                      ctrl: isTr ? 'Ctrl / ⌘ kombinasyonu' : 'Ctrl / ⌘ combination',
                      shift: isTr ? 'Shift kombinasyonu' : 'Shift combination',
                      alt: isTr ? 'Alt / ⌥ kombinasyonu' : 'Alt / ⌥ combination',
                    },
                  }}
                />
              </div>

              <div
                className={`lg:col-span-2 order-1 lg:order-2 rounded-xl border p-3 flex flex-col gap-2 max-h-[62vh] overflow-y-auto ${isDark ? 'bg-secondary-950/40 border-secondary-800/60' : 'bg-secondary-50/60 border-secondary-200/80'}`}
              >
                {allShortcuts.map((sc, idx) => {
                  const isSelected = selectedShortcut === sc.key;
                  return (
                    <button
                      key={`${sc.key}-${idx}`}
                      type="button"
                      onClick={() => setSelectedShortcut(isSelected ? null : sc.key)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-3',
                        isSelected
                          ? isDark
                            ? 'bg-primary-900/50 border-primary-700/60'
                            : 'bg-primary-50 border-primary-300'
                          : isDark
                            ? 'bg-secondary-900/40 border-secondary-800 hover:border-primary-700/60'
                            : 'bg-white border-secondary-200 hover:border-primary-300'
                      )}
                    >
                      <span className={cn('text-xs font-medium leading-normal flex-1', isDark ? 'text-secondary-300' : 'text-secondary-700')}>
                        {sc.label}
                      </span>
                      <ShortcutBadge shortcut={sc.key} variant="primary" className="shrink-0 text-[10px] whitespace-nowrap" />
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
