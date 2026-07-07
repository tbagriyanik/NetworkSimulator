'use client';

import { useState, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Wrench,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExampleProject } from '@/lib/network/exampleProjects';
import { SwitchState } from '@/lib/network/types';
import { checkFaultResolved, FaultDefinition } from '@/lib/network/faults';
import { ExamTask } from '@/lib/network/examMode';
import { bringElementToFront } from '@/lib/utils/zIndex';
import { generateCertificate } from '@/lib/utils/certificateGenerator';

interface TroubleshootingPanelProps {
  project: ExampleProject | null;
  deviceStates: Map<string, SwitchState> | undefined;
  tasks?: ExamTask[];
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
}

export function TroubleshootingPanel({
  project,
  deviceStates,
  tasks = [],
  onClose,
  onMinimize,
  isMinimized
}: TroubleshootingPanelProps) {
  const { t, language } = useLanguage();
  const { theme } = useLanguage() as any; // ThemeContext is not directly here, but let's check useLanguage or just use the same logic

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef(position);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelStartPos = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    panelStartPos.current = { ...positionRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    const nextPos = {
      x: panelStartPos.current.x + dx,
      y: panelStartPos.current.y + dy
    };
    positionRef.current = nextPos;
    if (panelRef.current) {
      panelRef.current.style.transform = `translate3d(${nextPos.x}px, ${nextPos.y}px, 0)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    setPosition(positionRef.current);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_err) {}
  };

  if (!project || ((!project.injectedFaults || project.injectedFaults.length === 0) && tasks.length === 0)) {
    return null;
  }

  const faults = project.injectedFaults || [];

  const getResolvedStatus = (fault: FaultDefinition) => {
    if (!deviceStates) return false;
    const state = deviceStates.get(fault.deviceId);
    if (!state) return false;
    return checkFaultResolved(state, fault);
  };

  const resolvedFaultsCount = faults.filter(f => getResolvedStatus(f)).length;
  const completedTasksCount = tasks.filter(t => t.completed).length;
  
  const totalItems = faults.length + tasks.length;
  const totalResolved = resolvedFaultsCount + completedTasksCount;
  const progressPercentage = totalItems > 0 ? Math.round((totalResolved / totalItems) * 100) : 100;
  const allResolved = totalItems > 0 && totalResolved === totalItems;

  const handleDownloadCertificate = async () => {
    if (!project) return;
    const studentName = prompt(language === 'tr' ? 'Sertifika için adınızı girin:' : 'Enter your name for the certificate:') || 'Student';

    await generateCertificate({
      studentName,
      projectTitle: typeof project.title === 'string' ? project.title : (project.title as Record<string, string>)[language] || (project.title as Record<string, string>).en,
      score: totalResolved,
      totalScore: totalItems,
      date: new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US'),
      language
    });
  };

  return (
    <div
      ref={panelRef}
      onPointerDownCapture={() => bringElementToFront(panelRef.current)}
      className={cn(
        "absolute right-4 top-20 z-[70] backdrop-blur-2xl transition-all duration-300 flex flex-col overflow-hidden rounded-xl",
        "bg-white/90 border-secondary-200 shadow-xl text-secondary-900",
        "dark:bg-secondary-950/30 dark:border-white/10 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] dark:text-white",
        isMinimized ? "w-72 h-14" : "w-80 max-h-[80vh]",
        isDragging ? "transition-none" : "transition-transform"
      )}
      style={{ 
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none'
      }}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-3 select-none shrink-0 border-b",
          "cursor-grab active:cursor-grabbing",
          allResolved
            ? "bg-success-50/80 border-success-200 dark:bg-success-950/40 dark:border-success-900/50"
            : "bg-warning-50/80 border-warning-200 dark:bg-warning-950/40 dark:border-warning-900/50"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2">
          <Wrench className={cn("w-4 h-4", allResolved ? "text-success-500 dark:text-success-400" : "text-warning-500 dark:text-warning-400")} />
          <span className={cn(
            "font-semibold text-sm tracking-wide",
            "text-secondary-900 dark:text-secondary-100"
          )}>
            {language === 'tr' ? 'Arıza Giderme' : 'Troubleshooting'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-secondary-400 mr-2">
            {totalResolved}/{totalItems}
          </span>
          <button
            onClick={onMinimize}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
            title={isMinimized ? t.expand : t.minimize}
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-error-500/20 hover:text-error-400 rounded-md transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-secondary-200 dark:bg-secondary-900 shrink-0 relative overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-500 ease-out",
            allResolved ? "bg-success-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-warning-500"
          )}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Content */}
      {!isMinimized && (
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className={cn(
              "text-sm leading-relaxed mb-4 text-secondary-600 dark:text-secondary-400"
            )}>
              {typeof project.title === 'string' 
                ? project.title 
                : (project.title as Record<string, string>)[language] || (project.title as Record<string, string>).en}
            </div>

            <div className="space-y-4">
              {faults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    {language === 'tr' ? 'Arızalar' : 'Faults'}
                  </h4>
                  {faults.map((fault, index) => {
                    const isResolved = getResolvedStatus(fault);
                    const faultDescription = fault.description ? fault.description[language] || fault.description.en : `Fault ${index + 1}`;
                    
                    return (
                      <div 
                        key={fault.id || index}
                        className={cn(
                          "p-3 rounded-lg border transition-all duration-300",
                          isResolved 
                            ? "bg-success-50/50 border-success-200 text-success-700 dark:bg-success-950/20 dark:border-success-900/50 dark:text-success-400"
                            : "bg-white border-secondary-100 text-secondary-700 dark:bg-secondary-900/50 dark:border-secondary-800 dark:text-secondary-300"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isResolved ? (
                              <CheckCircle2 className="w-4 h-4 text-success-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] rounded-full" />
                            ) : (
                              <Circle className="w-4 h-4 text-secondary-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={cn(
                              "text-sm font-medium",
                              isResolved
                                ? "line-through opacity-70 text-success-700 dark:text-success-300"
                                : "text-secondary-900 dark:text-secondary-200"
                            )}>
                              {faultDescription}
                            </div>
                            {fault.hint && !isResolved && (
                              <div className="text-xs mt-1 italic text-warning-700 dark:text-warning-300/80">
                                İpucu: {fault.hint[language] || fault.hint.en}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tasks.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-semibold text-primary-500/80 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    {language === 'tr' ? 'Hedefli Görevler' : 'Targeted Tasks'}
                  </h4>
                  {tasks.map((task, index) => {
                    const isResolved = task.completed;
                    
                    return (
                      <div 
                        key={task.id || index}
                        className={cn(
                          "p-3 rounded-lg border transition-all duration-300",
                          isResolved 
                            ? "bg-primary-50/50 border-primary-200 text-primary-700 dark:bg-primary-950/20 dark:border-primary-900/50 dark:text-primary-400"
                            : "bg-white border-secondary-100 text-secondary-700 dark:bg-secondary-900/50 dark:border-secondary-800 dark:text-secondary-300"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isResolved ? (
                              <CheckCircle2 className="w-4 h-4 text-primary-500 shadow-[0_0_10px_rgba(99,102,241,0.4)] rounded-full" />
                            ) : (
                              <Circle className="w-4 h-4 text-secondary-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={cn(
                              "text-sm font-medium",
                              isResolved ? "text-primary-300 line-through opacity-70" : "text-secondary-200"
                            )}>
                              {task.title[language as 'tr' | 'en'] || task.title.en}
                            </div>
                            <div className={cn("text-[11px] mt-1", isResolved ? "text-primary-400/60" : "text-secondary-400")}>
                              {task.description[language as 'tr' | 'en'] || task.description.en}
                            </div>
                            {task.hint && !isResolved && (
                              <div className="text-xs text-warning-300/80 mt-1.5 italic">
                                İpucu: {task.hint[language as 'tr' | 'en'] || task.hint.en}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {allResolved && (
              <div className="mt-6 p-4 rounded-lg bg-success-950/40 border border-success-900/50 text-center animate-in fade-in zoom-in duration-500">
                <div className="text-success-400 font-bold mb-1">
                  {language === 'tr' ? 'Tebrikler!' : 'Congratulations!'}
                </div>
                <div className="text-success-300/80 text-sm mb-4">
                  {language === 'tr' ? 'Tüm görevleri ve arızaları başarıyla tamamladınız.' : 'You successfully completed all tasks and faults.'}
                </div>
                <button
                  onClick={handleDownloadCertificate}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-success-600 hover:bg-success-700 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-success-900/40"
                >
                  <Award className="w-5 h-5" />
                  {language === 'tr' ? 'Sertifikayı İndir' : 'Download Certificate'}
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}


