'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface DevicePaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  t: Record<string, string>;
  deviceIcons: Record<string, React.ReactNode>;
  addDevice: (type: 'pc' | 'iot' | 'switch' | 'router' | 'firewall' | 'wlc', layer?: 'L2' | 'L3') => void;
}

export function DevicePalette({
  isOpen,
  onOpenChange,
  isDark,
  t,
  deviceIcons,
  addDevice
}: DevicePaletteProps) {
  const items = [
    { type: 'pc', label: 'PC', layer: undefined, icon: deviceIcons.pc },
    { type: 'switch', label: 'L2 SW', layer: 'L2', icon: deviceIcons.switchL2 },
    { type: 'switch', label: 'L3 SW', layer: 'L3', icon: deviceIcons.switchL3 },
    { type: 'router', label: 'Router', layer: undefined, icon: deviceIcons.router },
    { type: 'firewall', label: 'Firewall', layer: undefined, icon: deviceIcons.firewall },
    { type: 'iot', label: 'IoT', layer: undefined, icon: deviceIcons.iot },
    { type: 'wlc', label: 'WLC', layer: undefined, icon: deviceIcons.wlc },
  ] as const;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[2rem] px-6 pb-10 border-t-2 border-primary/20 bg-background/95 backdrop-blur-xl">
        <SheetHeader className="mb-6 pt-2">
          <SheetTitle className="text-center font-black tracking-tighter text-2xl uppercase">
            {t.addDevice}
          </SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {items.map((item) => (
            <button
              key={`${item.type}-${item.layer || ''}`}
              onClick={() => {
                addDevice(item.type, item.layer as 'L2' | 'L3');
                onOpenChange(false);
              }}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${
                isDark ? 'bg-secondary-800/50 hover:bg-secondary-800' : 'bg-secondary-100 hover:bg-secondary-200'
              }`}
            >
              <div className="w-10 h-10 flex items-center justify-center">
                {item.icon}
              </div>
              <span className="text-[10px] font-black tracking-widest uppercase opacity-70">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
