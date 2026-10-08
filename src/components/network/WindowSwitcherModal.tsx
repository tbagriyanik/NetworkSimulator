'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import { useWindowStore } from '@/hooks/useWindowStore';
import { useGraphicsQuality } from '@/lib/store/appStore';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { DeviceIcon } from '@/components/network/DeviceIcon';
import type { DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { AppWindow, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WINDOW_CLOSE_BUTTON_CLASS, WINDOW_TITLE_CLASS } from '@/components/ui/windowStandards';

interface WindowSwitcherModalProps {
  topologyDevices?: CanvasDevice[];
  isDark?: boolean;
  language?: 'tr' | 'en';
}

const getDeviceIcon = (type: string) => {
  return <DeviceIcon type={type as DeviceType} size={24} />;
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

    const handleMobileBack = () => {
      closeSwitcher();
    };

    window.addEventListener('mobile-back-pressed', handleMobileBack);
    window.addEventListener('keydown', handleKeyDownCapture, true);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('mobile-back-pressed', handleMobileBack);
      window.removeEventListener('keydown', handleKeyDownCapture, true);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSwitcherOpen, switcherSelectedIndex, displayList, handleSelectWindow, closeSwitcher, stepSwitcher]);

  const graphicsQuality = useGraphicsQuality();
  const isLowGraphics = graphicsQuality === 'low';

  if (!isSwitcherOpen || displayList.length === 0) return null;

  return (
    <div
      role="presentation"
      data-task-switcher="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/20 p-4 transition-opacity duration-150 animate-in fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) closeSwitcher();
      }}
    >
      <div
        className={cn(
          'w-full max-w-3xl p-6 rounded-[1.75rem] border transition-all select-none',
          isLowGraphics
            ? (isDark ? 'bg-secondary-950 border-secondary-800 text-secondary-100 shadow-none' : 'bg-white border-secondary-300 text-secondary-900 shadow-none')
            : (isDark ? 'bg-secondary-950/95 border-white/10 text-secondary-100 shadow-2xl shadow-black/40 backdrop-blur-xl' : 'bg-white/95 border-secondary-200 text-secondary-900 shadow-2xl backdrop-blur-xl')
        )}
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-secondary-200 dark:border-secondary-700/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-success-500/15 border border-success-400/20 shrink-0">
              <AppWindow className="w-4 h-4 sm:w-5 sm:h-5 text-success-500 dark:text-success-400" />
            </div>
            <div>
              <h3 className={WINDOW_TITLE_CLASS(isDark)}>
                {language === 'tr' ? 'Görev Yöneticisi Pencere Listesi' : 'Task Switcher Windows'}
              </h3>
              <p className="text-[11px] text-secondary-500 dark:text-secondary-400 mt-0.5">{language === 'tr' ? 'Açık cihaz pencereleri' : 'Open device windows'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => {
                useMultiWindowStore.getState().splitViewSideBySide();
                closeSwitcher();
              }}
              className="inline-flex items-center gap-1 rounded border border-primary-400/40 bg-primary-500/10 px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 transition-colors hover:bg-primary-500/20"
              title={language === 'tr' ? 'Pencereleri Yan Yana (Bölünmüş Ekran) Yerleştir' : 'Arrange Windows Side-by-Side'}
            >
              {language === 'tr' ? 'Yan Yana' : 'Side-by-Side'}
            </button>
            <button
              type="button"
              onClick={() => {
                useMultiWindowStore.getState().setLayoutMode('tabs');
                closeSwitcher();
              }}
              className="inline-flex items-center gap-1 rounded border border-success-400/40 bg-success-500/10 px-2 py-1 text-xs font-medium text-success-600 dark:text-success-400 transition-colors hover:bg-success-500/20"
              title={language === 'tr' ? 'Sekmeli Görünüm Moduna Geç' : 'Switch to Tabbed Layout'}
            >
              {language === 'tr' ? 'Sekmeli' : 'Tabs'}
            </button>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-success-500/15 text-success-600 dark:text-success-400 border border-success-500/30">
              {displayList.length} {language === 'tr' ? 'Öğe' : 'Items'}
            </span>
            {openWindows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  closeAllDeviceWindows();
                  closeSwitcher();
                }}
                className="inline-flex items-center gap-1 rounded border border-error-500/40 px-2 py-1 text-xs font-medium text-error-500 transition-colors hover:bg-error-500/10"
              >
                <X className="h-3 w-3" />
                <span className="hidden sm:inline">{language === 'tr' ? 'Tümünü kapat' : 'Close all'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={closeSwitcher}
              className={WINDOW_CLOSE_BUTTON_CLASS}
              aria-label={language === 'tr' ? 'Kapat' : 'Close'}
            >
              <X className="h-3.5 w-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Windows List / Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
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
                  'flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer outline-none hover:-translate-y-0.5',
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
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate mt-0.5">{typeLabel}</p>
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
                    className="shrink-0 rounded-md p-1.5 text-secondary-500 transition-colors hover:bg-error-100 dark:hover:bg-error-950/50 hover:text-error-600 dark:hover:text-error-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer / Hints */}
        <div className="mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700/40 flex items-center justify-between text-[11px] text-secondary-500 dark:text-secondary-400">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-800 font-mono text-[10px] text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-700">
              Shift + Tab
            </span>
            <span>{language === 'tr' ? 'Pencere listesini aç / seç' : 'Open / select window'}</span>
          </div>

          <span className="hidden sm:inline italic">
            {language === 'tr'
              ? 'Tıklayabilir veya Shift tuşunu bırakabilirsiniz'
              : 'Click or release Shift to open'}
          </span>
        </div>
      </div>
    </div>
  );
};


