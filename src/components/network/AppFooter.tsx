'use client';

import { useState, useEffect, useRef } from 'react';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { Translations } from '@/contexts/LanguageContext';

import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import { useUiPreferences } from '@/hooks/useUiPreferences';
import { useAppStore } from '@/lib/store/appStore';
import { cn } from '@/lib/utils';
import { Activity, Cpu, HardDrive, Gauge } from 'lucide-react';

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
  const graphicsQuality = useAppStore((state) => state.graphicsQuality);
  const isHighQuality = graphicsQuality === 'high';
  const hasMultipleWindows = useMultiWindowStore((state) => state.openWindows.length >= 2);
  const { preferences } = useUiPreferences();

  // Performance telemetry state for client device (CPU, RAM, FPS)
  const [perfStats, setPerfStats] = useState({
    cpu: 12,
    ram: '4.2',
    fps: 60,
    cores: 4,
    totalRam: '8'
  });

  // Keep device count in a ref so the interval callback never goes stale
  const deviceCountRef = useRef(topologyDevices?.length || 0);
  deviceCountRef.current = topologyDevices?.length || 0;

  // FPS measurement: a lightweight rAF counter increments a ref, and a 1-second
  // setInterval reads it. This avoids doing setState work inside the rAF loop
  // and keeps the animation-frame budget for actual rendering.
  useEffect(() => {
    if (!preferences.showFooter) return;

    let frameCount = 0;
    let animId: number;

    // Lightweight rAF loop: only increments a counter, no React work
    const tick = () => {
      frameCount++;
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    // One-second reporter: reads the counter and updates state
    const intervalId = setInterval(() => {
      const currentFps = Math.min(60, frameCount);
      frameCount = 0;

      const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      const devCount = deviceCountRef.current;
      const usedMemMB = memory
        ? (memory.usedJSHeapSize / (1024 * 1024)).toFixed(1)
        : (45 + Math.round(devCount * 0.8)).toFixed(1);
      const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
      const deviceMem = typeof navigator !== 'undefined'
        ? ((navigator as unknown as { deviceMemory?: number }).deviceMemory || 8)
        : 8;

      // CPU load estimate based on frame-time budget (16.67ms baseline)
      const frameTimeAvg = 1000 / Math.max(1, currentFps);
      const loadRatio = Math.max(0, (frameTimeAvg - 16.67) / 16.67);
      const baseCpu = Math.max(4, Math.min(99, Math.round(8 + loadRatio * 60 + devCount * 0.15)));

      setPerfStats({
        cpu: baseCpu,
        ram: usedMemMB,
        fps: currentFps,
        cores,
        totalRam: String(deviceMem)
      });
    }, 1000);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(intervalId);
    };
  }, [preferences.showFooter]);

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

  const perfTooltipContent = language === 'tr' ? (
    <div className="space-y-1.5 p-1 text-xs font-mono">
      <div className="font-bold text-primary-400 border-b border-secondary-700 pb-1 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-emerald-400" /> Performans
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-secondary-400 flex items-center gap-1"><Cpu className="w-3 h-3" /> İşlemci (CPU):</span>
        <span className="font-semibold text-white">%{perfStats.cpu} ({perfStats.cores} Çekirdek)</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-secondary-400 flex items-center gap-1"><HardDrive className="w-3 h-3" /> Bellek (RAM):</span>
        <span className="font-semibold text-white">{perfStats.ram} MB / {perfStats.totalRam} GB</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-secondary-400 flex items-center gap-1"><Gauge className="w-3 h-3" /> Kare Hızı (FPS):</span>
        <span className={`font-semibold ${perfStats.fps >= 50 ? 'text-emerald-400' : perfStats.fps >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
          {perfStats.fps} FPS
        </span>
      </div>
    </div>
  ) : (
    <div className="space-y-1.5 p-1 text-xs font-mono">
      <div className="font-bold text-primary-400 border-b border-secondary-700 pb-1 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-emerald-400" /> Device Performance Telemetry
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-secondary-400 flex items-center gap-1"><Cpu className="w-3 h-3" /> Processor (CPU):</span>
        <span className="font-semibold text-white">{perfStats.cpu}% ({perfStats.cores} Cores)</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-secondary-400 flex items-center gap-1"><HardDrive className="w-3 h-3" /> Memory (RAM):</span>
        <span className="font-semibold text-white">{perfStats.ram} MB / {perfStats.totalRam} GB</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-secondary-400 flex items-center gap-1"><Gauge className="w-3 h-3" /> Frame Rate (FPS):</span>
        <span className={`font-semibold ${perfStats.fps >= 50 ? 'text-emerald-400' : perfStats.fps >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
          {perfStats.fps} FPS
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Footer */}
      {/* Desktop Footer */}
      <footer
        className={cn(
          "hidden md:block fixed bottom-0 inset-x-0 z-40 border-t min-h-[48px] pb-3 pb-safe transition-colors duration-300",
          isHighQuality
            ? cn(
                "backdrop-blur-xl shadow-lg",
                isDark
                  ? "bg-secondary-950/75 border-secondary-800/80 shadow-black/20"
                  : "bg-white/80 border-secondary-200/80 shadow-primary-500/5"
              )
            : cn(
                isDark
                  ? "bg-secondary-950/95 border-secondary-900"
                  : "bg-white/95 border-secondary-200"
              ),
          (showProjectPicker || showOnboarding) && "hidden"
        )}
      >
        {/* Modern High-Quality Background Fill */}
        {isHighQuality && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10 select-none">
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                isDark
                  ? "bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary-500/10 via-secondary-900/60 to-secondary-950/90"
                  : "bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary-400/10 via-white/70 to-secondary-50/90"
              )}
            />
            <div
              className={cn(
                "absolute -bottom-10 left-1/4 h-24 w-96 rounded-full blur-3xl opacity-35",
                isDark ? "bg-primary-500/20" : "bg-primary-400/20"
              )}
            />
            <div
              className={cn(
                "absolute -bottom-10 right-1/4 h-24 w-96 rounded-full blur-3xl opacity-25",
                isDark ? "bg-accent-500/20" : "bg-accent-400/15"
              )}
            />
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-px",
                isDark
                  ? "bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
                  : "bg-gradient-to-r from-transparent via-primary-500/25 to-transparent"
              )}
            />
          </div>
        )}
        <div className="w-full px-5 py-2 pb-3">
          <div className="flex items-center justify-between gap-4">
            {/* Save Status & Performance Icon */}
            <div className="flex items-center gap-3">
              <TooltipWrapper title={perfTooltipContent}>
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-help transition-colors ${isDark ? 'bg-secondary-900/80 border-secondary-700/60 hover:bg-secondary-800' : 'bg-secondary-100 border-secondary-300 hover:bg-secondary-200'
                    }`}
                >
                  <Activity className={`w-3.5 h-3.5 animate-pulse ${perfStats.fps >= 50 ? 'text-emerald-500' : perfStats.fps >= 30 ? 'text-amber-500' : 'text-rose-500'}`} />
                  <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-secondary-300' : 'text-secondary-700'}`}>
                    {perfStats.fps} FPS
                  </span>
                </div>
              </TooltipWrapper>

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
                  aria-label={t.help}
                  className={`text-[11px] font-medium transition-transform hover:scale-110 ${isDark ? 'text-secondary-400 hover:text-primary-400' : 'text-secondary-600 hover:text-primary-600'}`}
                >
                  {t.tips}
                </button>
                <span className={`text-[11px] ${isDark ? 'text-secondary-300' : 'text-secondary-700'} whitespace-nowrap`}>
                  {activeTab === 'topology' && (
                    <>
                      <button type="button" onClick={() => onShortcut('next-device')} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:ring-1 ${isDark ? 'bg-secondary-700 text-secondary-300 hover:ring-secondary-400' : 'bg-secondary-200 text-secondary-700 hover:ring-secondary-400'}`}>TAB</button>
                      <span className="mx-1">{t.tabToNext}</span>
                      {hasMultipleWindows && (
                        <>
                          <button type="button" onClick={() => onShortcut('windows')} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:ring-1 ${isDark ? 'bg-secondary-700 text-secondary-300 hover:ring-secondary-400' : 'bg-secondary-200 text-secondary-700 hover:ring-secondary-400'}`}>Shift+Tab</button>
                          <span className="mx-1">{language === 'tr' ? 'Pencereler' : 'Windows'}</span>
                          <button type="button" onClick={() => onShortcut('minimize')} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:ring-1 ${isDark ? 'bg-secondary-700 text-secondary-300 hover:ring-secondary-400' : 'bg-secondary-200 text-secondary-700 hover:ring-secondary-400'}`}>Ctrl+M</button>
                          <span className="mx-1">{language === 'tr' ? 'Küçült' : 'Min'}</span>
                        </>
                      )}
                      <button type="button" onClick={() => onShortcut('save')} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:ring-1 ${isDark ? 'bg-secondary-700 text-secondary-300 hover:ring-secondary-400' : 'bg-secondary-200 text-secondary-700 hover:ring-secondary-400'}`}>Ctrl+S</button>
                      <span className="mx-1">{t.saveLabel}</span>
                      <button type="button" onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('trigger-open-device-search')); }} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:ring-1 ${isDark ? 'bg-secondary-700 text-secondary-300 hover:ring-secondary-400' : 'bg-secondary-200 text-secondary-700 hover:ring-secondary-400'}`}>F3</button>
                      <span className="mx-1">{language === 'tr' ? 'Cihaz Ara' : 'Search Device'}</span>
                      <button type="button" onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('trigger-topology-center-selected', { detail: { targetZoom: 1.0 } })); }} className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:ring-1 ${isDark ? 'bg-secondary-700 text-secondary-300 hover:ring-secondary-400' : 'bg-secondary-200 text-secondary-700 hover:ring-secondary-400'}`}>Num ,</button>
                      <span className="mx-1">{language === 'tr' ? 'Ortala %100' : 'Center 100%'}</span>
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
      <footer
        className={cn(
          "md:hidden fixed bottom-0 inset-x-0 z-2 border-t min-h-[44px] pb-3 flex items-center px-3 text-[11px] select-none pb-safe transition-colors duration-300",
          isHighQuality
            ? cn(
                "backdrop-blur-xl shadow-lg",
                isDark
                  ? "bg-secondary-950/75 border-secondary-800/80 text-secondary-300 shadow-black/20"
                  : "bg-white/80 border-secondary-200/80 text-secondary-600 shadow-primary-500/5"
              )
            : cn(
                "backdrop-blur-xl",
                isDark
                  ? "bg-secondary-900/95 border-secondary-800 text-secondary-300"
                  : "bg-white/95 border-secondary-200 text-secondary-600"
              ),
          (showProjectPicker || showOnboarding) && "hidden"
        )}
      >
        {/* Modern High-Quality Background Fill */}
        {isHighQuality && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10 select-none">
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                isDark
                  ? "bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary-500/10 via-secondary-900/60 to-secondary-950/90"
                  : "bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary-400/10 via-white/70 to-secondary-50/90"
              )}
            />
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-px",
                isDark
                  ? "bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
                  : "bg-gradient-to-r from-transparent via-primary-500/25 to-transparent"
              )}
            />
          </div>
        )}
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


