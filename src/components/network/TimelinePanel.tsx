'use client';

import { useRef, useEffect, useState } from 'react';
import { Clock, SkipBack, SkipForward, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, History, Play, Pause, FastForward, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { HistoryEntry } from '@/hooks/useHistory';
import { Button } from '@/components/ui/button';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { bringElementToFront } from '@/lib/utils/zIndex';

interface TimelinePanelProps {
  historyItems: HistoryEntry[];
  historyIndex: number;
  onJumpTo: (index: number) => void;
  isMinimized: boolean;
  onMinimize: () => void;
  isMobile?: boolean;
}

export function TimelinePanel({
  historyItems,
  historyIndex,
  onJumpTo,
  isMinimized,
  onMinimize,
  isMobile = false
}: TimelinePanelProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'high-contrast';
  const panelRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 4>(1);
  const [isFocused, setIsFocused] = useState(false);

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef(position);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const clampPosition = (nextPosition: { x: number; y: number }) => {
    if (typeof window === 'undefined') return nextPosition;
    const panelWidth = isMobile ? Math.min(window.innerWidth - 16, 448) : 576;
    const panelHeight = isMinimized ? 48 : 152;
    const maxX = Math.max(0, window.innerWidth - panelWidth - 8);
    const maxY = Math.max(0, window.innerHeight - panelHeight - 8);
    return {
      x: Math.min(Math.max(nextPosition.x, 0), maxX),
      y: Math.min(Math.max(nextPosition.y, 0), maxY)
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isMobile) return;
    if ((e.target as HTMLElement).closest('button')) return;
    panelRef.current?.focus();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    panelStartPos.current = { ...positionRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isMobile) return;
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    const nextPos = clampPosition({
      x: panelStartPos.current.x + dx,
      y: panelStartPos.current.y + dy
    });
    positionRef.current = nextPos;
    if (panelRef.current) {
      panelRef.current.style.transform = `translate3d(${nextPos.x}px, ${nextPos.y}px, 0)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isMobile) return;
    if (!isDragging) return;
    setIsDragging(false);
    setPosition(positionRef.current);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_err) {}
  };

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

  const getActionLabel = (item: HistoryEntry, index: number) => {
    if (index === 0) return language === 'tr' ? 'Başlangıç Durumu' : 'Initial State';
    if (item.description && item.description !== 'Değişiklik' && item.description !== 'Genel Değişiklik') return item.description;

    // Dinamik olarak eski 'Değişiklik' etiketlerini düzeltme
    if (index > 0) {
      const prevState = historyItems[index - 1].state;
      const curState = item.state;

      // Cihaz ekleme / silme kontrolü
      if (curState.topologyDevices.length > prevState.topologyDevices.length) {
        const newDev = curState.topologyDevices.find(d => !prevState.topologyDevices.some(pd => pd.id === d.id));
        return `Cihaz Eklendi: ${newDev?.name || 'Bilinmiyor'}`;
      } else if (curState.topologyDevices.length < prevState.topologyDevices.length) {
        const removedDev = prevState.topologyDevices.find(d => !curState.topologyDevices.some(pd => pd.id === d.id));
        return `Cihaz Silindi: ${removedDev?.name || 'Bilinmiyor'}`;
      }

      // Bağlantı ekleme / silme kontrolü
      if (curState.topologyConnections.length > prevState.topologyConnections.length) {
        const newConn = curState.topologyConnections.find(c => !prevState.topologyConnections.some(pc => pc.id === c.id));
        if (newConn) {
          const sDev = curState.topologyDevices.find(d => d.id === newConn.sourceDeviceId)?.name || newConn.sourceDeviceId;
          const tDev = curState.topologyDevices.find(d => d.id === newConn.targetDeviceId)?.name || newConn.targetDeviceId;
          return `${sDev} ve ${tDev} arasına bağlantı eklendi`;
        }
      } else if (curState.topologyConnections.length < prevState.topologyConnections.length) {
        const removedConn = prevState.topologyConnections.find(c => !curState.topologyConnections.some(pc => pc.id === c.id));
        if (removedConn) {
          const sDev = prevState.topologyDevices.find(d => d.id === removedConn.sourceDeviceId)?.name || removedConn.sourceDeviceId;
          const tDev = prevState.topologyDevices.find(d => d.id === removedConn.targetDeviceId)?.name || removedConn.targetDeviceId;
          return `${sDev} ve ${tDev} arasındaki bağlantı silindi`;
        }
      }

      // Taşıma veya özellik değişimi
      const movedDev = curState.topologyDevices.find(d => {
        const pd = prevState.topologyDevices.find(old => old.id === d.id);
        return pd && (pd.x !== d.x || pd.y !== d.y);
      });
      if (movedDev) return `${movedDev.name} taşındı (Yeni Konum: ${Math.round(movedDev.x)}, ${Math.round(movedDev.y)})`;

      const changedDev = curState.topologyDevices.find(d => {
        const pd = prevState.topologyDevices.find(old => old.id === d.id);
        return pd && JSON.stringify(pd) !== JSON.stringify(d);
      });
      if (changedDev) {
        const pd = prevState.topologyDevices.find(old => old.id === changedDev.id);
        if (pd && pd.name !== changedDev.name) {
          return `${changedDev.name}: hostname '${changedDev.name}' olarak değiştirildi`;
        }
        return `${changedDev.name} yapılandırması güncellendi`;
      }
    }

    switch (item.operationType) {
      case 'device': return language === 'tr' ? 'Cihaz Yapılandırması' : 'Device Configuration';
      case 'topology': return language === 'tr' ? 'Topoloji Güncellendi' : 'Topology Updated';
      case 'ui': return language === 'tr' ? 'Arayüz Değişikliği' : 'UI Change';
      default: return language === 'tr' ? 'Genel Değişiklik' : 'General Change';
    }
  };

  const togglePlayback = () => setIsPlaying(!isPlaying);

  const changeSpeed = () => {
    setPlaySpeed(prev => prev === 1 ? 2 : prev === 2 ? 4 : 1);
  };

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => clampPosition(prev));
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onJumpTo(Math.max(0, historyIndex - 1));
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onJumpTo(Math.min(historyItems.length - 1, historyIndex + 1));
    }
  };

  // Pencerenin her zaman görünür olması istendiği için historyItems.length <= 1 kontrolü kaldırıldı.

  return (
    <div
      ref={panelRef}
      tabIndex={0}
      onPointerDownCapture={() => bringElementToFront(panelRef.current)}
      className={cn(
        "absolute z-30 liquid-glass-light transition-all duration-300 flex flex-col overflow-hidden rounded-xl outline-none select-none",
        isMobile
          ? (isMinimized ? "left-2 bottom-[72px]" : "left-2 right-2 bottom-[72px]")
          : "sm:left-4 sm:right-auto sm:bottom-20 sm:max-w-none",
        isMinimized ? "w-48 h-12 rounded-full" : "sm:w-[36rem] w-[calc(100vw-1rem)] h-[152px]",
        isDark
          ? isFocused
            ? "bg-secondary-950/40 border border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_8px_32px_0_rgba(0,0,0,0.5)]"
            : "bg-secondary-950/40 border border-emerald-950/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]"
          : isFocused
            ? "bg-white/60 border border-emerald-500 shadow-[0_0_0_1px_rgba(34,197,94,0.24),0_8px_28px_rgba(15,23,42,0.12)]"
            : "bg-white/60 border border-emerald-950/80 shadow-[0_8px_28px_rgba(15,23,42,0.12)]",
        isDragging ? "transition-none" : "transition-transform"
      )}
      style={{
        transform: isMobile ? 'none' : `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: isMobile ? 'auto' : 'none'
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-3 shrink-0 border-b",
          isDark ? "bg-primary-950/20 border-primary-900/30" : "bg-primary-50/80 border-primary-100",
          "cursor-grab active:cursor-grabbing",
          "select-none"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2">
          <History className={cn("w-4 h-4", isDark ? "text-primary-400" : "text-primary-600")} />
          <span className={cn("font-semibold text-sm tracking-wide", isDark ? "text-secondary-100" : "text-secondary-900")}>
            {language === 'tr' ? 'İşlem Geçmişi' : 'Timeline History'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className={cn("p-1 rounded-md transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-secondary-200/70")}
            title={isMinimized ? t.expand : t.minimize}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Playback Controls */}
      {!isMinimized && (
        <div className={cn(
          "flex items-center justify-between gap-2 p-2 shrink-0 border-b",
          isDark ? "border-secondary-800/50 bg-secondary-900/20" : "border-secondary-200 bg-secondary-50/80"
        )}>
          <div className="flex items-center gap-2">
            <TooltipWrapper title={language === 'tr' ? 'Başa Dön' : 'Go to Start'}>
              <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "text-secondary-400 hover:text-secondary-100" : "text-secondary-500 hover:text-secondary-900")} onClick={() => onJumpTo(0)} disabled={historyIndex === 0}>
                <SkipBack className="w-3.5 h-3.5" />
              </Button>
            </TooltipWrapper>
            <TooltipWrapper title={isPlaying ? (language === 'tr' ? 'Duraklat' : 'Pause') : (language === 'tr' ? 'Oynat' : 'Play')}>
              <Button variant="default" size="icon" className="h-8 w-8 bg-primary-600 hover:bg-primary-500 text-white rounded-full shadow-lg shadow-primary-900/20" onClick={togglePlayback} disabled={historyIndex >= historyItems.length - 1 && !isPlaying}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </Button>
            </TooltipWrapper>
            <TooltipWrapper title={language === 'tr' ? 'Sona Git' : 'Go to End'}>
              <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "text-secondary-400 hover:text-secondary-100" : "text-secondary-500 hover:text-secondary-900")} onClick={() => onJumpTo(historyItems.length - 1)} disabled={historyIndex >= historyItems.length - 1}>
                <SkipForward className="w-3.5 h-3.5" />
              </Button>
            </TooltipWrapper>
            <div className={cn("w-px h-4 mx-1", isDark ? "bg-secondary-800" : "bg-secondary-200")} />
            <TooltipWrapper title={language === 'tr' ? 'Hız' : 'Speed'}>
              <Button variant="ghost" size="sm" className={cn("h-7 px-2 text-[10px] font-mono", isDark ? "text-secondary-400 hover:text-primary-400" : "text-secondary-600 hover:text-primary-600")} onClick={changeSpeed}>
                {playSpeed}x <FastForward className="w-3 h-3 ml-1" />
              </Button>
            </TooltipWrapper>
          </div>

          <TooltipWrapper title={language === 'tr' ? 'Geçmişi İndir (TXT)' : 'Download History (TXT)'}>
            <Button variant="ghost" size="icon" className={cn("h-7 w-7", isDark ? "text-secondary-400 hover:text-primary-400" : "text-secondary-500 hover:text-primary-600")} onClick={() => {
              const lines = historyItems.map((item, idx) => `Adım ${idx + 1}: ${getActionLabel(item, idx)}`);
              const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `islem_gecmisi_${new Date().getTime()}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}>
              <Download className="w-3.5 h-3.5" />
            </Button>
          </TooltipWrapper>
        </div>
      )}

      {/* Content */}
      {!isMinimized && (
        <div className={cn("flex-1 flex items-center px-4 overflow-hidden", isDark ? "bg-secondary-950/20" : "bg-white")}>
          <div className="flex-1 overflow-hidden pr-4 relative flex items-center">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 shadow",
                isDark ? "border-primary-500 text-primary-500 bg-primary-950" : "border-primary-500 text-primary-600 bg-primary-50"
              )}>
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col truncate">
                <div className={cn("font-mono text-[10px] mb-0.5", isDark ? "text-secondary-400" : "text-secondary-500")}>
                  {language === 'tr' ? 'Adım' : 'Step'} {historyIndex + 1} / {historyItems.length}
                </div>
                <div className={cn("text-sm font-medium truncate", isDark ? "text-primary-300" : "text-primary-700")}>
                  {historyItems[historyIndex] ? getActionLabel(historyItems[historyIndex], historyIndex) : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Prev/Next Slide Buttons */}
          <div className="flex items-center gap-1 shrink-0 border-l border-secondary-800/50 pl-4 h-full py-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9", isDark ? "text-secondary-400 hover:text-white hover:bg-secondary-800" : "text-secondary-500 hover:text-secondary-900 hover:bg-secondary-100")}
              onClick={() => onJumpTo(historyIndex - 1)}
              disabled={historyIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9", isDark ? "text-secondary-400 hover:text-white hover:bg-secondary-800" : "text-secondary-500 hover:text-secondary-900 hover:bg-secondary-100")}
              onClick={() => onJumpTo(historyIndex + 1)}
              disabled={historyIndex >= historyItems.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
