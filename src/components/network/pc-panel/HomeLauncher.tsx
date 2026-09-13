'use client';

import { type CSSProperties, useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BatteryCharging, Wifi as WifiIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PCActiveTab } from './PCPanel.types';

export interface LauncherApp {
  tab: PCActiveTab;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  buttonClass: string;
}

interface HomeLauncherProps {
  apps: LauncherApp[];
  isDark: boolean;
  isTablet?: boolean;
  isPoweredOff: boolean;
  mobileVerticalScrollStyle?: CSSProperties;
  onNavigate: (tab: PCActiveTab) => void;
  internalPcHostname?: string;
  pcIP?: string;
  wifiSignalStrength?: number;
}

export function HomeLauncher({
  apps,
  isDark,
  isPoweredOff,
  mobileVerticalScrollStyle,
  onNavigate,
  internalPcHostname = 'PC-Workstation',
}: HomeLauncherProps) {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="@container flex-1 min-h-0 w-full h-full flex flex-col relative select-none"
      style={mobileVerticalScrollStyle}
    >
      {/* ---------------- 1. MOBILE SMARTPHONE VIEW (Telefon Ana Ekranı) ---------------- */}
      <div className="flex @[640px]:hidden flex-1 min-h-0 flex-col relative overflow-hidden rounded-2xl border shadow-2xl bg-gradient-to-b from-slate-950/90 via-slate-900/90 to-slate-950/95 border-white/10 backdrop-blur-xl">
        {/* Phone Ambient Wallpaper Glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-primary-600/25 blur-3xl" />
          <div className="absolute top-1/3 -right-20 w-64 h-64 rounded-full bg-emerald-600/20 blur-3xl" />
          <div className="absolute -bottom-16 left-1/4 w-60 h-60 rounded-full bg-indigo-600/20 blur-3xl" />
        </div>

        {/* Mobile Phone Status Bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-3 pb-1 text-xs font-semibold tracking-wide text-white/90">
          <span className="font-mono text-[13px]">{currentTime || '12:00'}</span>
          {/* Dynamic Island / Speaker Pill */}
          <div className="h-4 w-20 rounded-full bg-black/60 border border-white/15 flex items-center justify-center gap-1.5 px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-mono text-white/70 truncate max-w-[50px]">{internalPcHostname}</span>
          </div>
          <div className="flex items-center gap-2">
            <WifiIcon className="w-3.5 h-3.5 text-emerald-400" />
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Mobile App Grid (Smartphone App Grid) */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
          <div className="grid grid-cols-3 gap-y-4 gap-x-3">
            {apps.map((app) => (
              <button
                key={app.tab}
                type="button"
                onClick={() => onNavigate(app.tab)}
                disabled={isPoweredOff}
                className="group flex flex-col items-center justify-center gap-1.5 text-center active:scale-90 transition-all duration-200 outline-none"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shadow-lg shadow-black/30 group-hover:scale-105 transition-all border border-white/20",
                  app.accent
                )}>
                  <app.icon className="w-7 h-7 drop-shadow-md" />
                </div>
                <span className="text-[11px] font-semibold text-white/90 tracking-tight leading-none truncate max-w-[80px]">
                  {app.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Home Indicator Bar */}
        <div className="relative z-10 p-2">
          <div className="w-28 h-1 bg-white/40 rounded-full mx-auto" />
        </div>
      </div>

      {/* ---------------- 2. TABLET / MID-SCREEN VIEW ---------------- */}
      <div className={cn(
        "hidden @[640px]:flex @[920px]:hidden flex-1 min-h-0 flex-col relative overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-2xl p-6",
        isDark ? "bg-secondary-950/80 border-white/10" : "bg-white/80 border-slate-200"
      )}>
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary-500/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
        </div>

        {/* Tablet Apps Grid */}
        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-3 gap-4 h-full items-stretch">
            {apps.map((app) => (
              <button
                key={app.tab}
                type="button"
                onClick={() => onNavigate(app.tab)}
                disabled={isPoweredOff}
                className={cn(
                  "group flex flex-col items-center justify-center text-center p-4 rounded-2xl border backdrop-blur-md transition-all active:scale-[0.98]",
                  app.buttonClass,
                  isDark ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/10" : "bg-white/80 hover:bg-white border-slate-200"
                )}
              >
                <div className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shadow-md transition-shadow mb-2",
                  app.accent
                )}>
                  <app.icon className="w-7 h-7" />
                </div>
                <div className="text-sm font-bold tracking-tight truncate w-full">{app.label}</div>
                <div className="text-xs opacity-70 font-medium truncate w-full">{app.subtitle}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- 3. PC DESKTOP VIEW (Büyük Ekran & PC Masaüstü) ---------------- */}
      <div className={cn(
        "hidden @[920px]:flex flex-1 min-h-0 flex-col relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl",
        isDark ? "bg-slate-950/70 border-white/10" : "bg-slate-50/70 border-slate-200"
      )}>
        {/* Desktop Wallpaper Graphic / Ambient Canvas */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={cn(
            "absolute inset-0 transition-all",
            isDark
              ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950/80 to-slate-950"
              : "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/50 via-white/80 to-slate-100/90"
          )} />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* Desktop Canvas (Desktop Icons Grid) */}
        <div className="relative z-10 flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
          <div className="grid grid-cols-4 @[1100px]:grid-cols-6 gap-6 items-start">
            {apps.map((app) => (
              <button
                key={app.tab}
                type="button"
                onClick={() => onNavigate(app.tab)}
                disabled={isPoweredOff}
                className={cn(
                  "group flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all duration-200 hover:bg-white/10 dark:hover:bg-white/5 border border-transparent hover:border-white/15 hover:shadow-lg focus:ring-2 focus:ring-primary/50 outline-none active:scale-95",
                  isPoweredOff && "opacity-40 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shadow-lg group-hover:scale-110 transition-transform mb-2 border border-white/20",
                  app.accent
                )}>
                  <app.icon className="w-8 h-8 drop-shadow" />
                </div>
                <span className={cn(
                  "text-xs font-semibold tracking-tight px-2 py-0.5 rounded group-hover:bg-black/30 text-center truncate max-w-[110px]",
                  isDark ? "text-white" : "text-slate-800"
                )}>
                  {app.label}
                </span>
                <span className={cn("text-[10px] opacity-60 truncate max-w-[100px]", isDark ? "text-slate-400" : "text-slate-500")}>
                  {app.subtitle}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
