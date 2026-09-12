'use client';

import type { CanvasDevice } from '@/components/network/networkTopology.types';
import type { Translations } from '@/contexts/LanguageContext';

import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import { useUiPreferences } from '@/hooks/useUiPreferences';

interface AppFooterProps {
  t: Translations;
  isDark: boolean;
  language: 'tr' | 'en';
  activeTab: string;
  hasUnsavedChanges: boolean;
  lastSaveTime: string | null;
  projectName: string;
  topologyDevices: CanvasDevice[];
  showProjectPicker: boolean;
  showOnboarding: boolean;
  setShowAboutModal: (v: boolean) => void;
  onShortcut: (shortcut: 'next-device' | 'windows' | 'minimize' | 'save') => void;
}

export function AppFooter({
  t, isDark, language, activeTab,
  hasUnsavedChanges, lastSaveTime, projectName,
  topologyDevices, showProjectPicker, showOnboarding,
  setShowAboutModal, onShortcut
}: AppFooterProps) {
  const hasOpenWindows = useMultiWindowStore((state) => state.openWindows.length > 0);
  const { preferences } = useUiPreferences();

  if (!preferences.showFooter) {
    return null;
  }

  const getDeviceCountLabel = (count: number) => (
    language === 'tr' ? 'Cihaz' : (count === 1 ? 'Device' : 'Devices')
  );

  const getDeviceCountText = (count: number) => {
    if (count <= 0) {
      return '';
    }

    return `${count} ${getDeviceCountLabel(count)}`;
  };

  return (
    <>
      {/* Desktop Footer */}
      <footer className={`hidden md:block fixed bottom-0 inset-x-0 z-40 border-t transition-all min-h-[48px] pb-3 pb-safe ${isDark ? 'bg-secondary-950/95 border-secondary-900' : 'bg-white/95 border-secondary-200'
        } ${showProjectPicker || showOnboarding ? 'hidden' : ''}`}>
        <div className="w-full px-5 py-2 pb-3">
          <div className="flex items-center justify-between gap-4">
            {/* Save Status */}
            <div className="flex items-center gap-3">
              <TooltipWrapper title={hasUnsavedChanges ? t.unsaved : t.saved}>
                <div
                  role="status"
                  aria-label={hasUnsavedChanges ? t.unsaved : t.saved}
                  className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isDark ? 'bg-secondary-900/50 border-secondary-800' : 'bg-secondary-50 border-secondary-200'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-warning-500' : 'bg-success-500'
                    }`} />
                  {lastSaveTime && (
                    <span className={`text-[11px] ${isDark ? 'text-secondary-300' : 'text-secondary-500'}`}>
                      <span className="w-[100px] inline-block text-left truncate">
                        {t.lastSavedAt + lastSaveTime}
                      </span>
                      {projectName !== 'Untitled' && (
                        <>
                          <span className="font-medium w-[120px] inline-block text-left truncate">{projectName}</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </TooltipWrapper>

              {/* Quick Hints */}
              <div className={`hidden md:flex items-center gap-2 whitespace-nowrap`}>
                <button
                  type="button"
                  onClick={() => setShowAboutModal(true)}
                  aria-label={t.contactTitle}
                  className={`text-[11px] font-medium transition-transform hover:scale-110 ${isDark ? 'text-secondary-400 hover:text-primary-400' : 'text-secondary-600 hover:text-primary-600'}`}
                >
                  {t.tips}
                </button>
                <span className={`text-[11px] ${isDark ? 'text-secondary-300' : 'text-secondary-700'} whitespace-nowrap`}>
                  {activeTab === 'topology' && (
                    <>
                      <button type="button" onClick={() => onShortcut('next-device')} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:ring-1 ${isDark ? 'bg-secondary-700 text-secondary-300 hover:ring-secondary-400' : 'bg-secondary-200 text-secondary-700 hover:ring-secondary-400'}`}>TAB</button>
                      <span className="mx-1">{t.tabToNext}</span>
                      {hasOpenWindows && (
                        <>
                          <button type="button" onClick={() => onShortcut('windows')} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:ring-1 ${isDark ? 'bg-secondary-700 text-secondary-300 hover:ring-secondary-400' : 'bg-secondary-200 text-secondary-700 hover:ring-secondary-400'}`}>Shift+Tab</button>
                          <span className="mx-1">{language === 'tr' ? 'Pencereler' : 'Windows'}</span>
                          <button type="button" onClick={() => onShortcut('minimize')} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:ring-1 ${isDark ? 'bg-secondary-700 text-secondary-300 hover:ring-secondary-400' : 'bg-secondary-200 text-secondary-700 hover:ring-secondary-400'}`}>Ctrl+M</button>
                          <span className="mx-1">{language === 'tr' ? 'Küçült' : 'Min'}</span>
                        </>
                      )}
                      <button type="button" onClick={() => onShortcut('save')} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:ring-1 ${isDark ? 'bg-secondary-700 text-secondary-300 hover:ring-secondary-400' : 'bg-secondary-200 text-secondary-700 hover:ring-secondary-400'}`}>Ctrl+S</button>
                      <span className="mx-1">{t.saveLabel}</span>
                      {(topologyDevices?.length || 0) > 0 && (
                        <>
                          <span className={`mx-2 ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>|</span>
                          <span className={`text-[11px] ${isDark ? 'text-secondary-400' : 'text-secondary-600'}`}>
                            {getDeviceCountText(topologyDevices?.length || 0)}
                          </span>
                        </>
                      )}
                      <div className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                        <span className="font-semibold">{language === 'tr' ? 'Sol Tık' : 'LeftMB'}</span>:{t.pan}
                        <span className="mx-1">·</span>
                        <span className="font-semibold">{language === 'tr' ? 'Orta Tuş' : 'MidMB'}</span>:{t.boxSelect}
                        <span className="mx-1">·</span>
                        <span className="font-semibold">{language === 'tr' ? 'Sağ Tık' : 'RightMB'}</span>:{t.menu}
                        <span className="mx-1">·</span>
                        <span className="font-semibold">{language === 'tr' ? 'Tekerlek' : 'Wheel'}</span>:{language === 'tr' ? 'Yakınlaştır' : 'Zoom'}
                      </div>
                    </>
                  )}
                  {activeTab === 'cmd' && (
                    <span className="text-[11px] italic">{t.clickIconsToRun}</span>
                  )}
                </span>
              </div>

            </div>

          </div>
        </div>
      </footer>

      {/* Mobile Footer — status bar / informational messages */}
      <footer className={`md:hidden fixed bottom-0 inset-x-0 z-2 border-t backdrop-blur-xl transition-all min-h-[44px] pb-3 flex items-center px-3 text-[11px] select-none pb-safe ${isDark ? 'bg-secondary-900/95 border-secondary-800 text-secondary-300' : 'bg-white/95 border-secondary-200 text-secondary-600'
        } ${showProjectPicker || showOnboarding ? 'hidden' : ''}`}>
        <div className="w-full flex items-center justify-between gap-2 overflow-hidden">
          {/* Status & Device count */}
          <div className="flex items-center gap-2 truncate">
            <span className={`w-2 h-2 rounded-full shrink-0 ${hasUnsavedChanges ? 'bg-warning-400 animate-pulse' : 'bg-success-400'}`} />
            <span className="truncate font-medium">
              {hasUnsavedChanges ? t.unsaved : t.saved}
            </span>
            {projectName && (
              <>
                <span className="opacity-30">|</span>
                <span className="truncate font-semibold max-w-[100px] sm:max-w-[150px]" title={projectName}>
                  {projectName}
                </span>
              </>
            )}
            {(topologyDevices?.length || 0) > 0 && (
              <>
                <span className="opacity-30">|</span>
                <span className="truncate opacity-80">
                  {getDeviceCountText(topologyDevices?.length || 0)}
                </span>
              </>
            )}
          </div>

        </div>
      </footer>
    </>
  );
}
