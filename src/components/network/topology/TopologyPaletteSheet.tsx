import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import { CableInfo } from '@/lib/network/types';

interface TopologyPaletteSheetProps {
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  isDark: boolean;
  isTR: boolean;
  t: Record<string, string>;
  addDevice: (type: 'pc' | 'iot' | 'switch' | 'router' | 'firewall' | 'wlc', layer?: 'L2' | 'L3') => void;
  cableInfo: CableInfo;
  onCableChange: (cableInfo: CableInfo) => void;
  DEVICE_ICONS: Record<string, React.ReactNode>;
}

export const TopologyPaletteSheet: React.FC<TopologyPaletteSheetProps> = ({
  isPaletteOpen,
  setIsPaletteOpen,
  isDark,
  isTR,
  t,
  addDevice,
  cableInfo,
  onCableChange,
  DEVICE_ICONS
}) => {
  return (
    <Sheet open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
      <SheetContent
        side="left"
        className={`w-80 border-r ${isDark ? 'border-secondary-800 bg-secondary-900/95' : 'border-secondary-200 bg-white/95'} backdrop-blur-xl p-0`}
      >
        <SheetHeader className={`p-4 border-b ${isDark ? 'border-secondary-800' : 'border-secondary-200'}`}>
          <SheetTitle className={isDark ? 'text-white' : 'text-secondary-900'}>
            {isTR ? 'Palet' : 'Palette'}
          </SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-5rem)]">
          {/* Devices Section */}
          <div className="space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
              {isTR ? 'Cihazlar' : 'Devices'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(['pc', 'switch', 'router', 'firewall', 'wlc', 'iot'] as const).map((type) => (
                <Tooltip key={type}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => type === 'switch' ? addDevice('switch', 'L2') : addDevice(type)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 group ${isDark
                        ? 'border-secondary-800 bg-secondary-800/30 hover:bg-secondary-800/60 hover:border-secondary-700'
                        : 'border-secondary-200 bg-secondary-50 hover:bg-secondary-100 hover:border-secondary-300'
                        }`}
                    >
                      <div className="relative mb-2 transition-transform duration-200 group-hover:scale-110">
                        <div className="absolute inset-0 blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-200" />
                        {DEVICE_ICONS[type]}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200">
                          <Plus className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${isDark ? 'text-secondary-300 group-hover:text-white' : 'text-secondary-600 group-hover:text-secondary-900'}`}>
                        {t[type]}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={isDark ? 'bg-secondary-800 border-secondary-700 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'}>
                    <p className="text-xs font-medium">{t[`${type}Desc`] || `${t.add} ${t[type]}`}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Cables Section */}
          <div className="space-y-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
              {isTR ? 'Kablolar' : 'Cables'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(['straight', 'crossover', 'console', 'serial', 'wireless'] as const).map((type) => (
                <Tooltip key={type}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onCableChange({ ...cableInfo, cableType: type })}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 group ${isDark
                        ? 'border-secondary-800 bg-secondary-800/30 hover:bg-secondary-800/60 hover:border-secondary-700'
                        : 'border-secondary-200 bg-secondary-50 hover:bg-secondary-100 hover:border-secondary-300'
                        }`}
                    >
                      <div className="relative mb-2 transition-transform duration-200 group-hover:scale-110">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-secondary-800' : 'bg-white shadow-sm'}`}>
                          <div className={`w-4 h-4 rounded-sm border-2 ${type === 'console' ? 'border-info-500' :
                            type === 'straight' ? 'border-secondary-900' :
                              type === 'crossover' ? 'border-secondary-500 border-dashed' :
                                type === 'serial' ? 'border-error-500' :
                                  'border-warning-500'
                            }`} />
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium text-center ${isDark ? 'text-secondary-300 group-hover:text-white' : 'text-secondary-600 group-hover:text-secondary-900'}`}>
                        {type === 'console' ? (isTR ? 'Konsol' : 'Console') :
                          type === 'straight' ? (isTR ? 'Düz' : 'Straight') :
                            type === 'crossover' ? (isTR ? 'Çapraz' : 'Crossover') :
                              type === 'serial' ? (isTR ? 'Seri' : 'Serial') :
                                (isTR ? 'Kablosuz' : 'Wireless')}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className={isDark ? 'bg-secondary-800 border-secondary-700 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'}>
                    <p className="text-xs font-medium">
                      {type === 'console' ? (isTR ? 'Yönetim bağlantısı için kullanılır' : 'Used for management connection') :
                        type === 'straight' ? (isTR ? 'Farklı cihaz türleri arasında kullanılır' : 'Used between different device types') :
                          type === 'crossover' ? (isTR ? 'Aynı tür cihazlar arasında kullanılır' : 'Used between same device types') :
                            type === 'serial' ? (isTR ? 'Seri bağlantı için kullanılır' : 'Used for serial connection') :
                              (isTR ? 'Kablosuz bağlantı için kullanılır' : 'Used for wireless connection')}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
