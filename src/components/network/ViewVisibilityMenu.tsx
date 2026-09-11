'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, RotateCcw } from 'lucide-react';
import { useUiPreferences } from '@/hooks/useUiPreferences';

interface ViewVisibilityMenuProps {
  isDark?: boolean;
}

export function ViewVisibilityMenu({ isDark = true }: ViewVisibilityMenuProps) {
  const { language } = useLanguage();
  const { preferences, updatePreference, resetPreferences } = useUiPreferences();
  const [open, setOpen] = useState(false);

  const isTr = language === 'tr';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 flex items-center gap-1.5 rounded-lg border text-xs font-semibold transition-all ${isDark
                ? 'bg-secondary-900 border-secondary-800 text-secondary-300 hover:text-white hover:border-secondary-600'
                : 'bg-white border-secondary-200 text-secondary-700 hover:text-secondary-900 hover:border-secondary-400'
                }`}
            >
              <Eye className="w-3.5 h-3.5 text-primary-400" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{isTr ? 'Bölümleri Gizle / Göster' : 'Toggle Sections Visibility'}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        className={`w-56 p-1.5 z-50 ${isDark ? 'bg-secondary-900 border-secondary-800 text-secondary-200' : 'bg-white border-secondary-200 text-secondary-800'}`}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-secondary-400 px-2 py-1">
          {isTr ? 'Arayüz Bölümleri' : 'Interface Sections'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={isDark ? 'bg-secondary-800' : 'bg-secondary-100'} />

        <DropdownMenuCheckboxItem
          checked={preferences.showMinimap}
          onCheckedChange={(checked) => updatePreference('showMinimap', checked)}
          onSelect={(e) => e.preventDefault()}
          className="text-xs cursor-pointer"
        >
          {isTr ? 'Mini Harita' : 'Mini Map'}
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={preferences.showZoomToolbar}
          onCheckedChange={(checked) => updatePreference('showZoomToolbar', checked)}
          onSelect={(e) => e.preventDefault()}
          className="text-xs cursor-pointer"
        >
          {isTr ? 'Büyütme Araç Çubuğu' : 'Zoom Toolbar'}
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={preferences.showEventLogs}
          onCheckedChange={(checked) => updatePreference('showEventLogs', checked)}
          onSelect={(e) => e.preventDefault()}
          className="text-xs cursor-pointer"
        >
          {isTr ? 'İşlem Geçmişi' : 'Activity & Event Logs'}
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={preferences.showFooter}
          onCheckedChange={(checked) => updatePreference('showFooter', checked)}
          onSelect={(e) => e.preventDefault()}
          className="text-xs cursor-pointer"
        >
          {isTr ? 'Alt Bilgi Çubuğu' : 'Footer Bar'}
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={preferences.showDevicePopovers}
          onCheckedChange={(checked) => updatePreference('showDevicePopovers', checked)}
          onSelect={(e) => e.preventDefault()}
          className="text-xs cursor-pointer"
        >
          {isTr ? 'PC / Router Bilgi Pencereleri' : 'Device Info Modals'}
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={preferences.showPortLabels}
          onCheckedChange={(checked) => updatePreference('showPortLabels', checked)}
          onSelect={(e) => e.preventDefault()}
          className="text-xs cursor-pointer"
        >
          {isTr ? 'Kablo & Port Etiketleri' : 'Cable & Port Labels'}
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={preferences.snapToGrid}
          onCheckedChange={(checked) => updatePreference('snapToGrid', checked)}
          onSelect={(e) => e.preventDefault()}
          className="text-xs cursor-pointer"
        >
          {isTr ? 'Izgaraya Hizala (Snap to Grid)' : 'Snap to Grid'}
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator className={isDark ? 'bg-secondary-800' : 'bg-secondary-100'} />

        <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-secondary-400 px-2 py-1">
          {isTr ? 'Bölge Renklendirme (Overlay)' : 'Area Highlighting Overlay'}
        </DropdownMenuLabel>

        {(['none', 'ospf', 'vlan', 'bgp', 'subnet'] as const).map((mode) => (
          <DropdownMenuCheckboxItem
            key={mode}
            checked={(preferences.areaOverlayMode || 'none') === mode}
            onCheckedChange={() => updatePreference('areaOverlayMode', mode)}
            onSelect={(e) => e.preventDefault()}
            className="text-xs cursor-pointer"
          >
            {mode === 'none'
              ? (isTr ? '🚫 Kapalı' : '🚫 Disabled')
              : mode === 'ospf'
              ? (isTr ? '🌐 OSPF Alanları (Areas)' : '🌐 OSPF Areas')
              : mode === 'vlan'
              ? (isTr ? '🏷️ VLAN Bölgeleri' : '🏷️ VLAN Zones')
              : mode === 'bgp'
              ? (isTr ? '🏛️ BGP Otonom Sistemler (AS)' : '🏛️ BGP AS Zones')
              : (isTr ? '📡 IP Alt Ağları (Subnets)' : '📡 IP Subnets')}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator className={isDark ? 'bg-secondary-800' : 'bg-secondary-100'} />

        <div className="flex items-center gap-1 p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              resetPreferences();
            }}
            className="w-full h-7 text-[11px] flex items-center justify-center gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isTr ? 'Varsayılana Sıfırla' : 'Reset to Default'}</span>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
