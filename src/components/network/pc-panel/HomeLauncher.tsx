import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
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
  isPoweredOff: boolean;
  mobileVerticalScrollStyle?: CSSProperties;
  onNavigate: (tab: PCActiveTab) => void;
}

export function HomeLauncher({
  apps,
  isDark,
  isPoweredOff,
  mobileVerticalScrollStyle,
  onNavigate,
}: HomeLauncherProps) {
  return (
    <div
      className="flex-1 min-h-0"
      style={mobileVerticalScrollStyle}
    >
      <div className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl md:rounded-[2rem] border shadow-[0_12px_40px_rgba(15,23,42,0.08)]",
        isDark ? "border-white/10 bg-secondary-950/60" : "border-white/80 bg-white/70 backdrop-blur-md"
      )}>
        {/* Subtle background ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={cn(
            "absolute inset-0 transition-all",
            isDark
              ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-900/25 via-secondary-950/80 to-secondary-950"
              : "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/40 via-white/90 to-slate-50/90"
          )} />
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* Content container */}
        <div className="relative flex flex-1 flex-col h-full overflow-y-auto p-2.5 sm:p-4 md:p-8 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3.5 md:gap-5 h-full flex-1 items-stretch py-1">
            {apps.map((app) => (
              <button
                key={app.tab}
                onClick={() => onNavigate(app.tab)}
                disabled={isPoweredOff}
                className={cn(
                  "group relative flex flex-col items-center justify-center text-center transition-all duration-300 disabled:opacity-40 select-none",
                  // Mobile specific styling
                  "min-h-[84px] sm:min-h-[100px] md:min-h-[150px]",
                  "p-2.5 sm:p-3 md:p-5",
                  "gap-1.5 sm:gap-2 md:gap-3",
                  "rounded-xl sm:rounded-[1.25rem] md:rounded-[1.5rem]",
                  "border backdrop-blur-md shadow-sm hover:shadow-xl active:scale-[0.98]",
                  app.buttonClass,
                  isDark
                    ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/10"
                    : "bg-white/80 hover:bg-white border-secondary-200/80"
                )}
              >
                {/* Icon wrapper with soft glow effect */}
                <div className={cn(
                  "flex items-center justify-center rounded-xl md:rounded-[1.25rem] bg-gradient-to-br text-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
                  "h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16",
                  app.accent
                )}>
                  <app.icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
                </div>

                {/* Title & subtitle */}
                <div className="space-y-0.5 max-w-full overflow-hidden">
                  <div className="text-xs sm:text-sm font-bold md:text-base leading-tight tracking-tight truncate">
                    {app.label}
                  </div>
                  <div className={cn(
                    "text-[10px] sm:text-[11px] leading-tight md:text-xs line-clamp-1 opacity-80 font-medium",
                    isDark ? "text-secondary-400" : "text-secondary-500"
                  )}>
                    {app.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

