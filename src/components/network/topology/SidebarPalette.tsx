'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, Cable, LineSquiggle, Plug, TrendingUpDown } from 'lucide-react';
import type { CableType, CableInfo } from '@/lib/network/types';

interface SidebarPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  language: string;
  t: Record<string, string>;
  deviceIcons: Record<string, React.ReactNode>;
  cableInfo: CableInfo;
  onCableChange: (cableInfo: CableInfo) => void;
  addDevice: (type: 'pc' | 'iot' | 'switch' | 'router' | 'firewall' | 'wlc', layer?: 'L2' | 'L3') => void;
}

export function SidebarPalette({
  isOpen,
  onOpenChange,
  isDark,
  language,
  t,
  deviceIcons,
  cableInfo,
  onCableChange,
  addDevice
}: SidebarPaletteProps) {
  const isTR = language === 'tr';

  const colorMap: Record<string, { active: string; inactive: string; hover: string }> = {
    straight: { active: 'text-blue-400', inactive: 'text-blue-500', hover: 'hover:text-blue-400' },
    crossover: { active: 'text-orange-400', inactive: 'text-orange-500', hover: 'hover:text-orange-400' },
    serial: { active: 'text-lime-400', inactive: 'text-lime-500', hover: 'hover:text-lime-400' },
    console: { active: 'text-cyan-400', inactive: 'text-cyan-500', hover: 'hover:text-cyan-400' },
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'} p-0 palette w-[300px] sm:w-[350px] border-r border-slate-800/20 shadow-2xl transition-all duration-300 custom-scrollbar`}>
        <SheetHeader className="p-6 border-b border-slate-800/50">
          <SheetTitle className="text-lg font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-red-500" />
            {t.addDeviceOrCable}
          </SheetTitle>
        </SheetHeader>
        <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar">
          {/* Devices Section */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 ml-1 uppercase">{t.devices}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { addDevice('pc'); onOpenChange(false); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-blue-500/50'
                }`}
              >
                <div className='text-blue-500'>
                  {deviceIcons.pc}
                </div>
                <span className="text-xs font-bold text-center">
                  {t.addPc}
                </span>
              </button>
              <button
                onClick={() => { addDevice('switch'); onOpenChange(false); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-cyan-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-cyan-500/50'
                }`}
              >
                <div className='text-cyan-500'>
                  {deviceIcons.switchL2 || deviceIcons.switch}
                </div>
                <span className="text-xs font-bold text-center">
                  L2 Switch
                </span>
              </button>
              <button
                onClick={() => { addDevice('switch', 'L3'); onOpenChange(false); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-purple-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-purple-500/50'
                }`}
              >
                <div className='text-purple-500'>
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" style={{ stroke: 'var(--color-warning-500)' }} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-center">
                  L3 Switch
                </span>
              </button>
              <button
                onClick={() => { addDevice('router'); onOpenChange(false); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-purple-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-purple-500/50'
                }`}
              >
                <div className='text-purple-500'>
                  {deviceIcons.router}
                </div>
                <span className="text-xs font-bold text-center">
                  {t.addRouter}
                </span>
              </button>
              <button
                onClick={() => { addDevice('iot'); onOpenChange(false); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-orange-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-orange-500/50'
                }`}
              >
                <div className='text-orange-500'>
                  {deviceIcons.iot}
                </div>
                <span className="text-xs font-bold text-center">
                  IoT
                </span>
              </button>
              <button
                onClick={() => { addDevice('firewall'); onOpenChange(false); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-red-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-red-500/50'
                }`}
              >
                <div className='text-red-500'>
                  {deviceIcons.firewall}
                </div>
                <span className="text-xs font-bold text-center">
                  Firewall
                </span>
              </button>
              <button
                onClick={() => { addDevice('wlc'); onOpenChange(false); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 active:bg-slate-700 hover:border-yellow-500/50' : 'bg-slate-50 border-slate-200 active:bg-slate-100 hover:border-yellow-500/50'
                }`}
              >
                <div className='text-yellow-500'>
                  {deviceIcons.wlc}
                </div>
                <span className="text-xs font-bold text-center">
                  WLC
                </span>
              </button>
            </div>
          </div>

          {/* Cables Section */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 ml-1 uppercase">{t.cableTypes}</p>
            <div className={`flex flex-col gap-2 rounded-xl border p-2 ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-slate-50/50'}`}>
              {(['straight', 'crossover', 'serial', 'console'] as CableType[]).map((type) => {
                const c = colorMap[type] || colorMap.console;
                return (
                  <button
                    key={type}
                    onClick={() => { onCableChange({ ...cableInfo, cableType: type }); onOpenChange(false); }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all border ${
                      isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200/50'
                    } ${
                      cableInfo.cableType === type
                        ? isDark ? 'bg-slate-700/80 border-slate-600' : 'bg-white border-slate-200 shadow-sm'
                        : 'border-transparent'
                    } ${cableInfo.cableType === type ? c.active : `${c.inactive} ${c.hover}`}`}
                  >
                    <div className={`p-2 rounded-md ${cableInfo.cableType === type ? (isDark ? 'bg-slate-800' : 'bg-slate-50') : ''}`}>
                      {type === 'straight' ? (
                        <Cable className="w-5 h-5" />
                      ) : type === 'crossover' ? (
                        <LineSquiggle className="w-5 h-5" />
                      ) : type === 'serial' ? (
                        <Plug className="w-5 h-5" />
                      ) : (
                        <TrendingUpDown className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-bold capitalize">
                        {type === 'straight' ? t.straight : type === 'crossover' ? t.crossover : type === 'serial' ? (isTR ? 'Seri' : 'Serial') : t.console}
                      </span>
                      <span className="text-[9px] opacity-60 text-left">
                        {type === 'straight' ? (isTR ? 'Standart ethernet' : 'Standard ethernet') :
                          type === 'crossover' ? (isTR ? 'Benzer cihazlar arası' : 'Between similar devices') :
                            type === 'serial' ? (isTR ? 'Seri WAN bağlantısı' : 'Serial WAN connection') :
                              (isTR ? 'Yönetim konsol bağlantısı' : 'Management console connection')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
