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
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border shadow-[0_12px_40px_rgba(15,23,42,0.08)]",
        isDark ? "border-white/10 bg-secondary-950/45" : "border-white/80 bg-white/55"
      )}>
        <div className="pointer-events-none absolute inset-0">
          <div className={cn(
            "absolute inset-0",
            isDark
              ? "bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.56))]"
              : "bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(239,246,255,0.84))]"
          )} />
        </div>
        <div className="relative flex flex-1 flex-col overflow-y-auto p-3 md:p-8 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-5 py-2">
            {apps.map((app) => (
              <button
                key={app.tab}
                onClick={() => onNavigate(app.tab)}
                disabled={isPoweredOff}
                className={cn(
                  "group flex min-h-[85px] flex-col items-center justify-center gap-2 rounded-[1.25rem] border p-2 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl disabled:opacity-40 md:min-h-[150px] md:p-5 md:gap-3 md:rounded-[1.5rem]",
                  app.buttonClass,
                  isDark ? "hover:bg-white/10" : "hover:bg-white"
                )}
              >
                <div className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-105 md:h-16 md:w-16 md:rounded-[1.25rem]",
                  app.accent
                )}>
                  <app.icon className="h-6 w-6 md:h-8 md:w-8" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold md:text-base">{app.label}</div>
                  <div className={cn("text-[11px] leading-4 md:text-xs", isDark ? "text-secondary-400" : "text-secondary-500")}>
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
