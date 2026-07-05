'use client';

import { useRef, useEffect, useState } from 'react';
import { Clock, SkipBack, SkipForward, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, History, Play, Pause, FastForward, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { HistoryEntry } from '@/hooks/useHistory';
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

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelStartPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    panelStartPos.current = { ...position };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    setPosition({
      x: panelStartPos.current.x + dx,
      y: panelStartPos.current.y + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
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

  if (historyItems.length <= 1) {
    return null; // Don't show timeline if there's no history to traverse
  }

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
          return `${changedDev.name} yapılandırması değiştirildi (hostname ${changedDev.name})`;
        }
        return `${changedDev.name} yapılandırması değiştirildi (Arayüz/Ayar)`;
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

  return (
    <div
      className={cn(
        "absolute bottom-20 left-4 z-40 bg-secondary-950/30 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 flex flex-col overflow-hidden rounded-xl",
        isMinimized ? "w-64 h-12" : "w-[36rem] h-[9.5rem]"
      )}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-3 shrink-0 border-b bg-primary-950/20 border-primary-900/30",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          "select-none"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary-400" />
          <span className="font-semibold text-sm tracking-wide text-secondary-100">
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
        <div className="flex items-center justify-between gap-2 p-2 shrink-0 border-b border-secondary-800/50 bg-secondary-900/20">
          <div className="flex items-center gap-2">
            <TooltipWrapper title={language === 'tr' ? 'Başa Dön' : 'Go to Start'}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-secondary-400 hover:text-secondary-100" onClick={() => onJumpTo(0)} disabled={historyIndex === 0}>
                <SkipBack className="w-3.5 h-3.5" />
              </Button>
            </TooltipWrapper>
            <TooltipWrapper title={isPlaying ? (language === 'tr' ? 'Duraklat' : 'Pause') : (language === 'tr' ? 'Oynat' : 'Play')}>
              <Button variant="default" size="icon" className="h-8 w-8 bg-primary-600 hover:bg-primary-500 text-white rounded-full shadow-lg shadow-primary-900/20" onClick={togglePlayback} disabled={historyIndex >= historyItems.length - 1 && !isPlaying}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </Button>
            </TooltipWrapper>
            <TooltipWrapper title={language === 'tr' ? 'Sona Git' : 'Go to End'}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-secondary-400 hover:text-secondary-100" onClick={() => onJumpTo(historyItems.length - 1)} disabled={historyIndex >= historyItems.length - 1}>
                <SkipForward className="w-3.5 h-3.5" />
              </Button>
            </TooltipWrapper>
            <div className="w-px h-4 bg-secondary-800 mx-1"></div>
            <TooltipWrapper title={language === 'tr' ? 'Hız' : 'Speed'}>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-mono text-secondary-400 hover:text-primary-400" onClick={changeSpeed}>
                {playSpeed}x <FastForward className="w-3 h-3 ml-1" />
              </Button>
            </TooltipWrapper>
          </div>
          
          <TooltipWrapper title={language === 'tr' ? 'Geçmişi İndir (TXT)' : 'Download History (TXT)'}>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-secondary-400 hover:text-primary-400" onClick={() => {
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
        <div className="flex-1 flex items-center px-4 overflow-hidden bg-secondary-950/20">
          <div className="flex-1 overflow-hidden pr-4 relative flex items-center">
            <div className="flex items-center gap-3">
               <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-primary-500 text-primary-500 bg-primary-950 shrink-0 shadow">
                 <Clock className="w-4 h-4 animate-pulse" />
               </div>
               <div className="flex flex-col truncate">
                 <div className="font-mono text-[10px] text-secondary-400 mb-0.5">
                   {language === 'tr' ? 'Adım' : 'Step'} {historyIndex + 1} / {historyItems.length}
                 </div>
                 <div className="text-sm font-medium text-primary-300 truncate">
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
              className="h-9 w-9 text-secondary-400 hover:text-white hover:bg-secondary-800" 
              onClick={() => onJumpTo(historyIndex - 1)} 
              disabled={historyIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 text-secondary-400 hover:text-white hover:bg-secondary-800" 
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

export default TimelinePanel;
