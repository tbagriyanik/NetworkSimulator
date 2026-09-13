'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Translations } from '@/contexts/LanguageContext';
import { RouterIcon, SwitchIcon } from '../PCPanelWidgets';
import { BootProgressBar, completedBootIds } from './BootProgressBar';
import type { TerminalLine } from './useTerminalOutputSync';

export interface DeviceIconInfo {
  icon: React.ComponentType<{ className?: string; isL3?: boolean }>;
  color: string;
  isL3?: boolean;
}

interface TerminalOutputLinesProps {
  lines: TerminalLine[];
  isPoweredOff: boolean;
  isLoading: boolean;
  isDark: boolean;
  deviceIconInfo: DeviceIconInfo | null;
  currentPrompt: string;
  helpLevel: 'beginner' | 'intermediate' | 'exam';
  language: string;
  t: Translations;
  searchQuery: string;
  onBootDone: (id: string) => void;
}

function renderIcon(info: DeviceIconInfo) {
  if (info.icon === RouterIcon) {
    return <RouterIcon className="w-4 h-4" />;
  } else if (info.icon === SwitchIcon) {
    return <SwitchIcon className="w-4 h-4" isL3={info.isL3} />;
  } else {
    return <info.icon className="w-4 h-4" />;
  }
}

export function TerminalOutputLines({
  lines,
  isPoweredOff,
  isLoading,
  isDark,
  deviceIconInfo,
  currentPrompt,
  helpLevel,
  language,
  t,
  searchQuery,
  onBootDone,
}: TerminalOutputLinesProps) {
  const highlightCommand = (text: string) => {
    if (!text) return text;
    const parts = text.split(/\s+/);
    if (parts.length === 0) return text;

    return (
      <>
        <span className="text-accent-400 font-bold">{parts[0]}</span>
        {parts.length > 1 && (
          <span className="text-secondary-300"> {parts.slice(1).join(' ')}</span>
        )}
      </>
    );
  };

  const highlightText = (text: string) => {
    const q = searchQuery.trim();
    if (!q) return text;
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(safe, 'gi');
    const parts = text.split(re);
    const matches = text.match(re);
    if (!matches) return text;
    const out: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) out.push(<span key={`p-${i}`}>{parts[i]}</span>);
      if (matches[i]) {
        out.push(
          <mark key={`m-${i}`} className={cn('px-0.5 rounded', isDark ? 'bg-accent-500/30 text-accent-200' : 'bg-accent-200 text-secondary-900')}>
            {matches[i]}
          </mark>
        );
      }
    }
    return <>{out}</>;
  };

  if (isPoweredOff) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <svg className="w-16 h-16 text-error-600 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.36 5.64a9 9 0 1 1-12.73 0" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      {lines.filter(line => line != null).map((line) => (
        <div key={line.id} className="break-all animate-in fade-in slide-in-from-left-1 duration-200">
          {line.type === 'command' ? (
            <div className="flex items-start gap-2 text-accent-500 font-bold">
              {deviceIconInfo && (
                <span className={`shrink-0 ${deviceIconInfo.color}`}>
                  {renderIcon(deviceIconInfo)}
                </span>
              )}
              <span className="shrink-0 opacity-40 select-none font-geist-mono">{line.prompt || currentPrompt}</span>
              <span className={isDark ? "text-secondary-100" : "text-secondary-900"}>{highlightCommand(line.content)}</span>
            </div>
          ) : (
            <>
              {line.type === 'output' && (
                <div className={cn(isDark ? 'text-secondary-300' : 'text-secondary-700', "whitespace-pre-wrap")}>
                  <span>
                    {line.content === '\x00BOOT_PROGRESS\x00'
                      ? (completedBootIds.has(line.id)
                        ? <span className={`font-mono font-bold ${isDark ? 'text-success-400' : 'text-success-600'}`}>{'#'.repeat(10)} {t.bootReady}</span>
                        : <BootProgressBar key={line.id} id={line.id} isDark={isDark} readyText={t.bootReady} onDone={(id) => onBootDone(id)} />)
                      : highlightText(line.content)}
                  </span>
                </div>
              )}
              {line.type === 'error' && <span className="text-error-500 font-bold italic">{highlightText(line.content)}</span>}
              {line.type === 'success' && (
                <span className={cn(
                  "font-bold tracking-widest opacity-80",
                  line.realismLevel === 'stub' ? "text-warning-500" :
                    line.realismLevel === 'sim-only' ? "text-primary-500" : "text-accent-500"
                )}>{highlightText(line.content)}</span>
              )}
              {line.type === 'password-prompt' && (
                <div className={cn(isDark ? 'text-secondary-300' : 'text-secondary-700', "whitespace-pre-wrap")}>
                  <span>{highlightText(line.content)}</span>
                </div>
              )}
              {line.hint && (helpLevel === 'beginner' || (helpLevel === 'intermediate' && line.type === 'error')) && (
                <div className={cn(
                  "mt-1 mb-2 p-2 rounded-lg border flex gap-2 animate-in zoom-in-95 duration-300",
                  isDark ? "bg-accent-500/5 border-accent-500/20 text-accent-200" : "bg-accent-50 border-accent-200 text-accent-800"
                )}>
                  <span className="shrink-0">💡</span>
                  <div className="text-[11px] leading-relaxed">
                    <span className="font-black uppercase tracking-tighter mr-1 opacity-70">
                      {t.learningNote}
                    </span>
                    {typeof line.hint === 'string' ? line.hint : (language === 'tr' ? line.hint?.tr : line.hint?.en)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="flex items-center gap-2 text-primary/50 italic py-1 animate-pulse">
          <span className="text-[10px] font-black tracking-widest">{t.processing}...</span>
        </div>
      )}
    </div>
  );
}