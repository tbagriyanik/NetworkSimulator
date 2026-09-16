'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import { useWindowStore } from '@/hooks/useWindowStore';
import { useGraphicsQuality } from '@/lib/store/appStore';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { Monitor, Server, Router, Shield, Radio, AppWindow, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WindowSwitcherModalProps {
  topologyDevices?: CanvasDevice[];
  isDark?: boolean;
  language?: 'tr' | 'en';
}

const getDeviceIcon = (type: string) => {
  switch (type) {
    case 'pc':
      return <Monitor className="w-6 h-6 text-cyan-400" />;
    case 'switchL2':
    case 'switchL3':
      return <Server className="w-6 h-6 text-emerald-400" />;
    case 'router':
      return <Router className="w-6 h-6 text-blue-400" />;
    case 'firewall':
      return <Shield className="w-6 h-6 text-amber-400" />;
    case 'wlc':
      return <Radio className="w-6 h-6 text-purple-400" />;
    default:
      return <AppWindow className="w-6 h-6 text-secondary-400" />;
  }
};

const getDeviceTypeName = (type: string, language: 'tr' | 'en') => {
  switch (type) {
    case 'pc':
      return 'PC';
    case 'switchL2':
      return 'L2 Switch';
    case 'switchL3':
      return 'L3 Switch';
    case 'router':
      return 'Router';
    case 'firewall':
      return 'Firewall';
    case 'wlc':
      return 'WLC Controller';
    default:
      return language === 'tr' ? 'Cihaz' : 'Device';
  }
};

export const WindowSwitcherModal: React.FC<WindowSwitcherModalProps> = ({
  topologyDevices = [],
  isDark = true,
  language = 'tr',
}) => {
  const isSwitcherOpen = useMultiWindowStore((state) => state.isSwitcherOpen);
  const switcherSelectedIndex = useMultiWindowStore((state) => state.switcherSelectedIndex);
  const openWindows = useMultiWindowStore((state) => state.openWindows);
  const setSwitcherSelectedIndex = useMultiWindowStore((state) => state.setSwitcherSelectedIndex);
  const stepSwitcher = useMultiWindowStore((state) => state.stepSwitcher);
  const closeSwitcher = useMultiWindowStore((state) => state.closeSwitcher);
  const closeDeviceWindow = useMultiWindowStore((state) => state.closeDeviceWindow);
  const closeAllDeviceWindows = useMultiWindowStore((state) => state.closeAllDeviceWindows);
  const openDeviceWindow = useMultiWindowStore((state) => state.openDeviceWindow);
  const restoreWindow = useMultiWindowStore((state) => state.restoreWindow);
  const isWindowOpen = useMultiWindowStore((state) => state.isWindowOpen);
  const setActiveWindow = useWindowStore((state) => state.setActiveWindow);

  // Keep the shortcut local to the switcher as well as the page shortcut
  // hook. This ensures Shift+Tab is caught even when focus is inside a device
  // terminal or another component that stops keyboard propagation.
  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.key !== 'Tab') return;

      const focusedElement = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      const isWindowInteriorFocused = Boolean(
        focusedElement?.closest('[data-code-editor], [data-modal-content], [data-slot="dialog-content"], [role="dialog"], .dialog-content')
      );
      if (isWindowInteriorFocused) return;

      e.preventDefault();
      e.stopPropagation();

      const store = useMultiWindowStore.getState();
      if (store.isSwitcherOpen) {
        // The modal's dedicated capture listener handles cycling while open.
        return;
      } else {
        store.openSwitcher(useWindowStore.getState().activeWindowId, e.shiftKey);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcut, true);
    return () => window.removeEventListener('keydown', handleGlobalShortcut, true);
  }, [topologyDevices]);

  // If openWindows has items, use openWindows. Otherwise, fall back to topologyDevices.
  const displayList = useMemo(() => {
    if (openWindows.length > 0) {
      return openWindows.map((w) => ({ id: w.id, type: w.type }));
    }
    return topologyDevices.map((d) => ({ id: d.id, type: d.type }));
  }, [openWindows, topologyDevices]);

  const handleSelectWindow = useCallback(
    (deviceId: string, deviceType?: string) => {
      const wasOpen = isWindowOpen(deviceId);
      if (deviceType && !wasOpen) {
        openDeviceWindow(deviceId, deviceType);
      }
      // Selecting an existing window must also expand it when it was collapsed.
      // openDeviceWindow already emits this request for newly opened/existing
      // device windows, but closed-over windows need the explicit restore call.
      if (wasOpen) restoreWindow(deviceId);
      setActiveWindow(deviceId);
      closeSwitcher();
    },
    [isWindowOpen, openDeviceWindow, restoreWindow, setActiveWindow, closeSwitcher]
  );

  // Global listeners while switcher is open:
  // Capture keydown for Tab / Shift+Tab to step selection
  // Release Control / Meta to commit selection and open window
  useEffect(() => {
    if (!isSwitcherOpen) return;

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.code === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        stepSwitcher(e.shiftKey, displayList.length);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeSwitcher();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) {
        const selected = displayList[switcherSelectedIndex];
        if (selected) {
          handleSelectWindow(selected.id, selected.type);
        } else {
          closeSwitcher();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDownCapture, true);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDownCapture, true);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSwitcherOpen, switcherSelectedIndex, displayList, handleSelectWindow, closeSwitcher, stepSwitcher]);

  const graphicsQuality = useGraphicsQuality();
  const isLowGraphics = graphicsQuality === 'low';

  if (!isSwitcherOpen || displayList.length === 0) return null;

  return (
    <div
      data-task-switcher="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/20 p-4 transition-opacity duration-150 animate-in fade-in"
      onClick={() => closeSwitcher()}
    >
      <div
        className={cn(
          'w-full max-w-3xl p-6 rounded-[1.75rem] border transition-all select-none',
          isLowGraphics
            ? (isDark ? 'bg-secondary-950 border-secondary-800 text-secondary-100 shadow-none' : 'bg-white border-secondary-300 text-secondary-900 shadow-none')
            : (isDark ? 'bg-secondary-950/95 border-white/10 text-secondary-100 shadow-2xl shadow-black/40 backdrop-blur-xl' : 'bg-white/95 border-secondary-200 text-secondary-900 shadow-2xl backdrop-blur-xl')
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-secondary-700/40">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/20">
              <AppWindow className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {language === 'tr' ? 'GÃ¶rev YÃ¶neticisi Pencere Listesi' : 'Task Switcher Windows'}
              </h3>
              <p className="text-[11px] text-secondary-400 mt-0.5">{language === 'tr' ? 'AÃ§Ä±k cihaz pencereleri' : 'Open device windows'}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                useMultiWindowStore.getState().splitViewSideBySide();
                closeSwitcher();
              }}
              className="inline-flex items-center gap-1 rounded border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
              title={language === 'tr' ? 'Pencereleri Yan Yana (BÃ¶lÃ¼nmÃ¼ÅŸ Ekran) YerleÅŸtir' : 'Arrange Windows Side-by-Side'}
            >
              {language === 'tr' ? 'Yan Yana (BÃ¶l)' : 'Side-by-Side'}
            </button>
            <button
              type="button"
              onClick={() => {
                useMultiWindowStore.getState().setLayoutMode('tabs');
                closeSwitcher();
              }}
              className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
              title={language === 'tr' ? 'Sekmeli GÃ¶rÃ¼nÃ¼m Moduna GeÃ§' : 'Switch to Tabbed Layout'}
            >
              {language === 'tr' ? 'Sekmeli GÃ¶rÃ¼nÃ¼m' : 'Tabbed View'}
            </button>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {displayList.length} {language === 'tr' ? 'Ã–ÄŸe' : 'Items'}
            </span>
            {openWindows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  closeAllDeviceWindows();
                  closeSwitcher();
                }}
                className="ml-1 inline-flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <X className="h-3 w-3" />
                {language === 'tr' ? 'TÃ¼mÃ¼nÃ¼ kapat' : 'Close all'}
              </button>
            )}
          </div>
        </div>

        {/* Windows List / Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
          {displayList.map((item, index) => {
            const deviceObj = topologyDevices.find((d) => d.id === item.id);
            const name = deviceObj?.name || item.id;
            const typeLabel = getDeviceTypeName(item.type, language);
            const isSelected = index === switcherSelectedIndex;
            const isOpenAlready = isWindowOpen(item.id);

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onMouseEnter={() => setSwitcherSelectedIndex(index)}
                onClick={() => handleSelectWindow(item.id, item.type)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectWindow(item.id, item.type);
                  }
                }}
                className={cn(
                  'flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer outline-none hover:-translate-y-0.5',
                  isSelected
                    ? isDark
                      ? 'bg-emerald-500/20 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                      : 'bg-emerald-50 border-emerald-600 shadow-md ring-1 ring-emerald-600'
                    : isDark
                      ? (isLowGraphics ? 'bg-secondary-900 border-secondary-800' : 'bg-secondary-900/60 border-secondary-800 hover:bg-secondary-800/70 hover:border-secondary-700')
                      : 'bg-secondary-50 border-secondary-200 hover:bg-secondary-100 hover:border-secondary-300'
                )}
              >
                <div
                  className={cn(
                    'p-2.5 rounded-lg border shrink-0',
                    isDark ? 'bg-secondary-900 border-secondary-700/80' : 'bg-white border-secondary-200'
                  )}
                >
                  {getDeviceIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-semibold truncate">{name}</h4>
                  </div>
                  <p className="text-xs text-secondary-400 truncate mt-0.5">{typeLabel}</p>
                </div>
                {isOpenAlready && (
                  <button
                    type="button"
                    aria-label={language === 'tr' ? `${name} penceresini kapat` : `Close ${name} window`}
                    title={language === 'tr' ? 'Pencereyi kapat' : 'Close window'}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDeviceWindow(item.id);
                    }}
                    className="shrink-0 rounded-md p-1.5 text-secondary-500 transition-colors hover:bg-red-100 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer / Hints */}
        <div className="mt-4 pt-3 border-t border-secondary-700/40 flex items-center justify-between text-[11px] text-secondary-400">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-secondary-800 font-mono text-[10px] text-secondary-300">
              Shift + Tab
            </span>
            <span>{language === 'tr' ? 'Pencere listesini aÃ§ / seÃ§' : 'Open / select window'}</span>
          </div>

          <span className="hidden sm:inline italic">
            {language === 'tr'
              ? 'TÄ±klayabilir veya Shift tuÅŸunu bÄ±rakabilirsiniz'
              : 'Click or release Shift to open'}
          </span>
        </div>
      </div>
    </div>
  );
};


