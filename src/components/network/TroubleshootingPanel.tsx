'use client';


import {
  CheckCircle2,
  Circle,
  GripHorizontal,
  Wrench,
  ChevronDown,
  ChevronUp,
  X,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExampleProject } from '@/lib/network/exampleProjects';
import { SwitchState } from '@/lib/network/types';
import { checkFaultResolved, FaultDefinition } from '@/lib/network/faults';
import { ExamTask } from '@/lib/network/examMode';

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

  return (
    <div
      className={cn(
        "absolute right-4 top-20 z-40 bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-xl transition-all duration-300 flex flex-col overflow-hidden rounded-xl",
        isMinimized ? "w-72 h-14" : "w-80 max-h-[80vh]"
      )}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-3 select-none cursor-move shrink-0 border-b",
          allResolved ? "bg-emerald-950/40 border-emerald-900/50" : "bg-orange-950/40 border-orange-900/50"
        )}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-zinc-500" />
          <Wrench className={cn("w-4 h-4", allResolved ? "text-emerald-400" : "text-orange-400")} />
          <span className="font-semibold text-sm tracking-wide text-zinc-100">
            {language === 'tr' ? 'Arıza Giderme' : 'Troubleshooting'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-zinc-400 mr-2">
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
            className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-zinc-900 shrink-0 relative overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-500 ease-out",
            allResolved ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-orange-500"
          )}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Content */}
      {!isMinimized && (
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="text-sm text-zinc-400 leading-relaxed mb-4">
              {typeof project.title === 'string' 
                ? project.title 
                : (project.title as Record<string, string>)[language] || (project.title as Record<string, string>).en}
            </div>

            <div className="space-y-4">
              {faults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
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
                            ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400" 
                            : "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isResolved ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] rounded-full" />
                            ) : (
                              <Circle className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={cn(
                              "text-sm font-medium",
                              isResolved ? "text-emerald-300 line-through opacity-70" : "text-zinc-200"
                            )}>
                              {faultDescription}
                            </div>
                            {fault.hint && !isResolved && (
                              <div className="text-xs text-orange-300/80 mt-1 italic">
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
                  <h4 className="text-xs font-semibold text-indigo-500/80 uppercase tracking-wider flex items-center gap-1.5">
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
                            ? "bg-indigo-950/20 border-indigo-900/50 text-indigo-400" 
                            : "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isResolved ? (
                              <CheckCircle2 className="w-4 h-4 text-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)] rounded-full" />
                            ) : (
                              <Circle className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={cn(
                              "text-sm font-medium",
                              isResolved ? "text-indigo-300 line-through opacity-70" : "text-zinc-200"
                            )}>
                              {task.title[language as 'tr' | 'en'] || task.title.en}
                            </div>
                            <div className={cn("text-[11px] mt-1", isResolved ? "text-indigo-400/60" : "text-zinc-400")}>
                              {task.description[language as 'tr' | 'en'] || task.description.en}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {allResolved && (
              <div className="mt-6 p-4 rounded-lg bg-emerald-950/40 border border-emerald-900/50 text-center animate-in fade-in zoom-in duration-500">
                <div className="text-emerald-400 font-bold mb-1">
                  {language === 'tr' ? 'Tebrikler!' : 'Congratulations!'}
                </div>
                <div className="text-emerald-300/80 text-sm">
                  {language === 'tr' ? 'Tüm görevleri ve arızaları başarıyla tamamladınız.' : 'You successfully completed all tasks and faults.'}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export default TroubleshootingPanel;
