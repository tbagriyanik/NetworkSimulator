'use client';

import { useRef, useEffect, useState } from 'react';
import { Clock, SkipBack, SkipForward, ChevronDown, ChevronUp, History, Play, Pause, FastForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { HistoryEntry } from '@/hooks/useHistory';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';

interface TimelinePanelProps {
  historyItems: HistoryEntry[];
  historyIndex: number;
  onJumpTo: (index: number) => void;
  isMinimized: boolean;
  onMinimize: () => void;
}

export function TimelinePanel({
  historyItems,
  historyIndex,
  onJumpTo,
  isMinimized,
  onMinimize
}: TimelinePanelProps) {
  const { t, language } = useLanguage();
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 4>(1);

  // Auto-scroll to active item
  useEffect(() => {
    if (!isMinimized && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [historyIndex, isMinimized]);

  // Playback logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      if (historyIndex >= historyItems.length - 1) {
        setTimeout(() => setIsPlaying(false), 0);
        return;
      }
      
      const delay = 1500 / playSpeed;
      interval = setInterval(() => {
        onJumpTo(historyIndex + 1);
      }, delay);
    }
    return () => clearInterval(interval);
  }, [isPlaying, historyIndex, historyItems.length, playSpeed, onJumpTo]);

  if (historyItems.length <= 1) {
    return null; // Don't show timeline if there's no history to traverse
  }

  const getActionLabel = (item: HistoryEntry, index: number) => {
    if (index === 0) return language === 'tr' ? 'Başlangıç Durumu' : 'Initial State';
    switch (item.operationType) {
      case 'device': return language === 'tr' ? 'Cihaz Yapılandırması' : 'Device Configuration';
      case 'topology': return language === 'tr' ? 'Topoloji Değişikliği' : 'Topology Change';
      case 'ui': return language === 'tr' ? 'Arayüz Değişikliği' : 'UI Change';
      default: return language === 'tr' ? 'Genel Değişiklik' : 'General Change';
    }
  };

  const togglePlayback = () => setIsPlaying(!isPlaying);
  
  const changeSpeed = () => {
    setPlaySpeed(prev => prev === 1 ? 2 : prev === 2 ? 4 : 1);
  };

  return (
    <div
      className={cn(
        "absolute bottom-20 left-4 z-40 bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-xl transition-all duration-300 flex flex-col overflow-hidden rounded-xl",
        isMinimized ? "w-64 h-12" : "w-80 h-[28rem]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 shrink-0 border-b bg-indigo-950/20 border-indigo-900/30">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-sm tracking-wide text-zinc-100">
            {language === 'tr' ? 'İşlem Geçmişi' : 'Timeline History'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
            title={isMinimized ? t.expand : t.minimize}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Playback Controls */}
      {!isMinimized && (
        <div className="flex items-center justify-center gap-2 p-2 shrink-0 border-b border-zinc-800/50 bg-zinc-900/20">
          <TooltipWrapper title={language === 'tr' ? 'Başa Dön' : 'Go to Start'}>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-100" onClick={() => onJumpTo(0)} disabled={historyIndex === 0}>
              <SkipBack className="w-3.5 h-3.5" />
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title={isPlaying ? (language === 'tr' ? 'Duraklat' : 'Pause') : (language === 'tr' ? 'Oynat' : 'Play')}>
            <Button variant="default" size="icon" className="h-8 w-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-900/20" onClick={togglePlayback} disabled={historyIndex >= historyItems.length - 1 && !isPlaying}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title={language === 'tr' ? 'Sona Git' : 'Go to End'}>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-100" onClick={() => onJumpTo(historyItems.length - 1)} disabled={historyIndex >= historyItems.length - 1}>
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
          </TooltipWrapper>
          <div className="w-px h-4 bg-zinc-800 mx-1"></div>
          <TooltipWrapper title={language === 'tr' ? 'Hız' : 'Speed'}>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-mono text-zinc-400 hover:text-indigo-400" onClick={changeSpeed}>
              {playSpeed}x <FastForward className="w-3 h-3 ml-1" />
            </Button>
          </TooltipWrapper>
        </div>
      )}

      {/* Content */}
      {!isMinimized && (
        <ScrollArea className="flex-1 p-2">
          <div className="relative pl-4 space-y-4 py-4 before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
            {historyItems.map((item, idx) => {
              const isActive = idx === historyIndex;
              const isFuture = idx > historyIndex;

              return (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div 
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full border-2 bg-zinc-950 shrink-0 z-10 shadow transition-colors duration-200",
                      isActive ? "border-indigo-500 text-indigo-500 bg-indigo-950" : isFuture ? "border-zinc-800 text-zinc-600" : "border-emerald-500 text-emerald-500"
                    )}
                  >
                    {isActive ? <Clock className="w-3 h-3 animate-pulse" /> : <div className={cn("w-1.5 h-1.5 rounded-full", isFuture ? "bg-zinc-700" : "bg-emerald-500")} />}
                  </div>

                  <button
                    ref={isActive ? activeItemRef : null}
                    onClick={() => onJumpTo(idx)}
                    className={cn(
                      "w-[calc(100%-2.5rem)] p-2 rounded-lg border text-left transition-all duration-200 hover:scale-[1.02]",
                      isActive 
                        ? "bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                        : isFuture
                          ? "bg-zinc-900/30 border-zinc-800/50 opacity-60 hover:opacity-100"
                          : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium",
                      isActive ? "text-indigo-300" : isFuture ? "text-zinc-500" : "text-zinc-300"
                    )}>
                      {getActionLabel(item, idx)}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                      {language === 'tr' ? 'Adım' : 'Step'} {idx + 1}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export default TimelinePanel;
