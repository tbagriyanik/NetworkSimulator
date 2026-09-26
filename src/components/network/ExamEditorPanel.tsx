'use client';

import { useState, useEffect } from 'react';
import {
  X, Plus, Save, Scale, Shield,
  AlertCircle,
  Settings, Target,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExamProject, ExamTask } from '@/lib/network/examMode';
import { getDevicePortsFromTopology, type TopologyDevice } from './examEditor/examUtils';
import { DeviceToolbar } from './examEditor/DeviceToolbar';
import { FaultInjectionCard } from './examEditor/FaultInjectionCard';
import { TaskCard } from './examEditor/TaskCard';

interface ExamEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeExam: ExamProject | null;
  addTask: (task: Partial<ExamTask>) => void;
  updateTask: (id: string, updates: Partial<ExamTask>) => void;
  deleteTask: (id: string) => void;
  updateExamMeta: (updates: Partial<ExamProject>) => void;
  moveTask: (id: string, direction: 'up' | 'down') => void;
  smartBalanceWeights: () => void;
  exportExamFile: (projectData: unknown) => void;
  projectData: unknown;
  isDark: boolean;
}

export function ExamEditorPanel({
  isOpen,
  onClose,
  activeExam,
  addTask,
  updateTask,
  deleteTask,
  updateExamMeta,
  moveTask,
  smartBalanceWeights,
  exportExamFile,
  projectData,
  isDark
}: ExamEditorPanelProps) {
  const { t, language } = useLanguage();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [touchDragInfo, setTouchDragInfo] = useState<{ id: string; startIndex: number; currentIndex: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeExam) return null;

  const isTr = language === 'tr';
  const totalWeight = activeExam.tasks.reduce((sum, t) => sum + (t.weight || 0), 0);

  const topologyDevices: TopologyDevice[] =
    (projectData as { topology?: { devices?: { id: string; name: string; type: string; ports: { id: string; label: string }[] }[] } })?.topology?.devices?.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      ports: d.ports || []
    })) || [];

  const getDevicePorts = (deviceId: string) => getDevicePortsFromTopology(topologyDevices, deviceId);

  const handleAddNewTask = () => {
    const newTask: Partial<ExamTask> = {
      title: { tr: 'Yeni Görev', en: 'New Task' },
      description: { tr: 'Görev açıklaması...', en: 'Task description...' },
      weight: 10,
      checkType: 'command',
      checkParams: { commandPattern: '' }
    };
    addTask(newTask);
  };

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[550px] lg:w-[600px] max-w-[100vw] z-[100] shadow-2xl flex flex-col transition-all duration-300 transform liquid-glass-light",
        isOpen ? "translate-x-0" : "translate-x-full",
        isDark ? "border-l border-success-500/30" : "border-l border-success-500"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        isDark ? "bg-secondary-950/50 border-success-500/30" : "bg-secondary-50 border-success-500/50"
      )}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Shield className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {isTr ? 'Sınav Düzenleyici' : 'Exam Editor'}
            </h2>
            <p className="text-[10px] font-medium opacity-60 tracking-wider">
              {isTr ? 'Öğretmen Modu' : 'Teacher Mode'}
            </p>
          </div>
        </div>
        <TooltipWrapper title={t.close}>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t.close || 'Close'}>
            <X className="w-5 h-5" />
          </Button>
        </TooltipWrapper>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6 pb-32">
          {/* Exam Details */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary-500" />
                {isTr ? 'Genel Bilgiler' : 'General Info'}
              </h3>
              <Badge variant={totalWeight === 100 ? "default" : "destructive"} className="text-[10px]">
                {isTr ? 'Toplam Puan' : 'Total Points'}: {totalWeight}/100
              </Badge>
            </div>

            <div className="grid gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold opacity-50 uppercase ml-1">
                  {isTr ? 'Sınav Başlığı' : 'Exam Title'}
                </label>
                <Input
                  value={typeof activeExam.title === 'string' ? activeExam.title : (isTr ? activeExam.title.tr : activeExam.title.en)}
                  onChange={(e) => {
                    updateExamMeta({ title: e.target.value });
                  }}
                  className="h-9"
                  placeholder={isTr ? "Sınav ismini girin..." : "Enter exam title..."}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold opacity-50 uppercase ml-1">
                    {isTr ? 'Süre (Dakika)' : 'Duration (Mins)'}
                  </label>
                  <Input
                    type="number"
                    value={activeExam.durationMinutes}
                    onChange={(e) => {
                      updateExamMeta({ durationMinutes: parseInt(e.target.value) || 0 });
                    }}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold opacity-50 uppercase ml-1">
                    {isTr ? 'Zorluk' : 'Difficulty'}
                  </label>
                  <Select
                    value={activeExam.difficulty}
                    onValueChange={(v: string) => updateExamMeta({ difficulty: v as 'beginner' | 'intermediate' | 'advanced' })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">{t.levelBasic}</SelectItem>
                      <SelectItem value="intermediate">{t.levelIntermediate}</SelectItem>
                      <SelectItem value="advanced">{t.levelAdvanced}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          {/* Device Add Buttons */}
          <DeviceToolbar isTr={isTr} isDark={isDark} />

          <Separator />

          {/* Tasks List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                {isTr ? 'Görevler ve Puanlama' : 'Tasks & Scoring'}
              </h3>
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={smartBalanceWeights}>
                        <Scale className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isTr ? 'Puanları otomatik dengele' : 'Auto-balance points'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button variant="default" size="sm" className="h-7 text-[11px] gap-1" onClick={handleAddNewTask}>
                  <Plus className="w-3.5 h-3.5" />
                  {isTr ? 'Görev Ekle' : 'Add Task'}
                </Button>
              </div>
            </div>

            {activeExam.tasks.length === 0 ? (
              <div className={cn(
                "p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center",
                isDark ? "border-secondary-800 bg-secondary-900/50" : "border-secondary-100 bg-secondary-50/50"
              )}>
                <AlertCircle className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-xs font-medium opacity-40">
                  {isTr ? 'Henüz görev eklenmedi.' : 'No tasks added yet.'}
                </p>
                <Button variant="link" size="sm" className="mt-2 text-purple-500" onClick={handleAddNewTask}>
                  {isTr ? 'İlk görevi oluştur' : 'Create first task'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeExam.tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    totalTasks={activeExam.tasks.length}
                    expandedTaskId={expandedTaskId}
                    setExpandedTaskId={setExpandedTaskId}
                    draggedTaskId={draggedTaskId}
                    setDraggedTaskId={setDraggedTaskId}
                    touchDragInfo={touchDragInfo}
                    setTouchDragInfo={setTouchDragInfo}
                    moveTask={moveTask}
                    deleteTask={deleteTask}
                    updateTask={updateTask}
                    topologyDevices={topologyDevices}
                    getDevicePorts={getDevicePorts}
                    isTr={isTr}
                    isDark={isDark}
                    t={t as Record<string, string>}
                  />
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Fault Injection */}
          <FaultInjectionCard
            activeExam={activeExam}
            topologyDevices={topologyDevices}
            updateExamMeta={updateExamMeta}
            isTr={isTr}
            isDark={isDark}
          />
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className={cn(
        "p-4 border-t mt-auto flex flex-col gap-3",
        isDark ? "bg-secondary-950/80 border-secondary-800" : "bg-secondary-50 border-secondary-200"
      )}>
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[10px] font-bold opacity-40 mb-1 ml-1 uppercase">
              {isTr ? 'Taslak' : 'Draft'}
            </p>
            <Button
              variant="outline"
              className="w-full h-10 gap-2 font-bold"
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
                window.dispatchEvent(event);
              }}
            >
              <FileText className="w-4 h-4" />
              {isTr ? 'JSON Kaydet' : 'Save JSON'}
            </Button>
          </div>
          <div className="flex-[2]">
            <p className="text-[10px] font-bold opacity-40 mb-1 ml-1 uppercase">
              {isTr ? 'Yayınla' : 'Publish'}
            </p>
            <Button
              className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white gap-2 font-bold shadow-lg shadow-purple-500/20"
              disabled={activeExam.tasks.length === 0 || totalWeight !== 100}
              onClick={() => exportExamFile(projectData)}
            >
              <Save className="w-4 h-4" />
              {isTr ? 'Sınav Dosyası (.exam)' : 'Exam File (.exam)'}
            </Button>
          </div>
        </div>
        <p className="text-[9px] text-center opacity-50 italic">
          {isTr
            ? 'JSON dosyası daha sonra düzenlenebilir, .exam dosyası öğrenciler içindir.'
            : 'JSON files can be edited later, .exam files are for students.'}
        </p>
      </div>
    </div>
  );
}
