'use client';

import { useState } from 'react';
import {
  X, Plus, Trash2, Save, Wand2, Shield,
  ChevronDown, ChevronUp, AlertCircle, Info,
  Settings, Target,
  Monitor, FileText, GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { FaultDefinition, FaultType } from '@/lib/network/faults';

type TranslationObject = { tr: string; en: string };

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

  if (!isOpen || !activeExam) return null;

  const isTr = language === 'tr';
  const totalWeight = activeExam.tasks.reduce((sum, t) => sum + (t.weight || 0), 0);

  const topologyDevices: { id: string; name: string; type: string; ports: { id: string; label: string }[] }[] =
    (projectData as { topology?: { devices?: { id: string; name: string; type: string; ports: { id: string; label: string }[] }[] } })?.topology?.devices?.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      ports: d.ports || []
    })) || [];

  const getDevicePorts = (deviceId: string) => {
    const device = topologyDevices.find(d => d.id === deviceId);
    return device?.ports || [];
  };

  const getDeviceLabel = (deviceId: string) => {
    const d = topologyDevices.find((x) => x.id === deviceId);
    return d ? `${d.name} (${d.id})` : deviceId;
  };

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
        isDark ? "border-l border-emerald-500/30" : "border-l border-emerald-500"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        isDark ? "bg-secondary-950/50 border-emerald-500/30" : "bg-secondary-50 border-emerald-500/50"
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
          <Button variant="ghost" size="icon" onClick={onClose}>
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
                  value={activeExam.title}
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
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-500" />
                {isTr ? 'Cihaz Ekle' : 'Add Device'}
              </h3>
              <span className="text-[9px] opacity-40 font-medium">
                {isTr ? 'Topolojiye eklemek için tıklayın' : 'Click to add to topology'}
              </span>
            </div>
            <div className={cn(
              "flex items-center gap-1 p-1.5 rounded-xl border",
              isDark ? "bg-secondary-900/40 border-secondary-700/30" : "bg-emerald-50/50 border-emerald-100/50"
            )}>
              <TooltipWrapper title={isTr ? 'PC Ekle' : 'Add PC'}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-lg text-primary-500 hover:bg-primary-500/10 transition-colors"
                  onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'pc' }))}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z" />
                  </svg>
                </Button>
              </TooltipWrapper>
              <TooltipWrapper title={isTr ? 'L2 Switch Ekle' : 'Add L2 Switch'}>
                 <Button
                   variant="ghost"
                   size="icon"
                   className="w-8 h-8 rounded-lg text-cyan-500 hover:bg-cyan-500/10 transition-colors"
                  onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'switchL2' }))}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </Button>
              </TooltipWrapper>
              <TooltipWrapper title={isTr ? 'L3 Switch Ekle' : 'Add L3 Switch'}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-lg text-violet-500 hover:bg-violet-500/10 transition-colors"
                  onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'switchL3' }))}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </Button>
              </TooltipWrapper>
              <TooltipWrapper title={isTr ? 'Router Ekle' : 'Add Router'}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-lg text-purple-500 hover:bg-purple-500/10 transition-colors"
                  onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'router' }))}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
                  </svg>
                </Button>
              </TooltipWrapper>
              <TooltipWrapper title={isTr ? 'IoT Cihaz Ekle' : 'Add IoT'}>
                 <Button
                   variant="ghost"
                   size="icon"
                   className="w-8 h-8 rounded-lg text-orange-500 hover:bg-orange-500/10 transition-colors"
                  onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'iot' }))}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.247 7.761a6 6 0 0 1 0 8.478" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.075 4.933a10 10 0 0 1 0 14.134" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.925 19.067a10 10 0 0 1 0-14.134" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.753 16.239a6 6 0 0 1 0-8.478" />
                    <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} cx="12" cy="12" r="2" />
                  </svg>
                </Button>
              </TooltipWrapper>
              <TooltipWrapper title={isTr ? 'Firewall Ekle' : 'Add Firewall'}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-lg text-error-500 hover:bg-error-500/10 transition-colors"
                  onClick={() => window.dispatchEvent(new CustomEvent('add-device', { detail: 'firewall' }))}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                </Button>
              </TooltipWrapper>
            </div>
          </section>

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
                        <Wand2 className="w-3.5 h-3.5" />
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
                  <Card
                    key={task.id}
                    data-task-index={index}
                    draggable
                    onDragStart={(e) => {
                      setDraggedTaskId(task.id);
                      e.dataTransfer.effectAllowed = 'move';
                      // For styling during drag
                      setTimeout(() => {
                        const target = e.target as HTMLElement;
                        target.style.opacity = '0.4';
                      }, 0);
                    }}
                    onDragEnd={(e) => {
                      setDraggedTaskId(null);
                      const target = e.target as HTMLElement;
                      target.style.opacity = '1';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedTaskId && draggedTaskId !== task.id) {
                        const fromIndex = activeExam.tasks.findIndex(t => t.id === draggedTaskId);
                        const toIndex = index;
                        if (fromIndex !== -1) {
                          const diff = toIndex - fromIndex;
                          const direction = diff > 0 ? 'down' : 'up';
                          const steps = Math.abs(diff);
                          for (let i = 0; i < steps; i++) {
                            moveTask(draggedTaskId, direction);
                          }
                        }
                      }
                    }}
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      isDark ? "bg-secondary-800/40 border-secondary-700" : "bg-white border-secondary-200",
                      expandedTaskId === task.id ? "ring-1 ring-purple-500/50" : "",
                      draggedTaskId === task.id ? "opacity-40" : "",
                      touchDragInfo?.id === task.id && "ring-2 ring-purple-500 border-purple-500 scale-[1.02] shadow-xl z-10"
                    )}
                  >
                    <div
                      className="p-3 flex items-center justify-between cursor-pointer group"
                      onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-secondary-400 hover:text-purple-500 touch-none"
                          onTouchStart={() => {
                            setTouchDragInfo({ id: task.id, startIndex: index, currentIndex: index });
                          }}
                          onTouchMove={(e) => {
                            if (!touchDragInfo) return;
                            const touch = e.touches[0];
                            const element = document.elementFromPoint(touch.clientX, touch.clientY);
                            const card = element?.closest('[data-task-index]');
                            if (card) {
                              const newIndex = parseInt(card.getAttribute('data-task-index') || '');
                              if (!isNaN(newIndex) && newIndex !== touchDragInfo.currentIndex) {
                                const direction = newIndex > touchDragInfo.currentIndex ? 'down' : 'up';
                                moveTask(touchDragInfo.id, direction);
                                setTouchDragInfo({ ...touchDragInfo, currentIndex: newIndex });
                              }
                            }
                          }}
                          onTouchEnd={() => {
                            setTouchDragInfo(null);
                          }}
                        >
                          <GripVertical className="w-4 h-4" />
                          <span className="text-[10px] font-black opacity-30 select-none">:::</span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-secondary-500/10 flex items-center justify-center text-[10px] font-bold">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold truncate">
                            {isTr ? task.title.tr : task.title.en}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 border-purple-500/30 text-purple-500">
                              {task.checkType}
                            </Badge>
                            <span className="text-[10px] font-bold opacity-40">
                              {task.weight} {isTr ? 'Puan' : 'Pts'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <TooltipWrapper title={isTr ? 'Yukarı Taşı' : 'Move Up'}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-secondary-500 hover:text-purple-500 hover:bg-purple-500/10"
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveTask(task.id, 'up');
                            }}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                        </TooltipWrapper>
                        <TooltipWrapper title={isTr ? 'Aşağı Taşı' : 'Move Down'}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-secondary-500 hover:text-purple-500 hover:bg-purple-500/10"
                            disabled={index === activeExam.tasks.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveTask(task.id, 'down');
                            }}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </TooltipWrapper>
                        <TooltipWrapper title={t.delete}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </TooltipWrapper>
                      </div>
                    </div>

                    {expandedTaskId === task.id && (
                      <CardContent className="p-3 pt-0 border-t border-secondary-700/30 space-y-3">
                        <div className="grid gap-3 pt-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2 space-y-1">
                              <label className="text-[10px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Görev Adı' : 'Task Name'}</label>
                              <Input
                                value={isTr ? task.title.tr : task.title.en}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updates = isTr
                                    ? { title: { ...task.title as TranslationObject, tr: val } }
                                    : { title: { ...task.title as TranslationObject, en: val } };
                                  updateTask(task.id, updates);
                                }}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Ağırlık' : 'Weight'}</label>
                              <Input
                                type="number"
                                value={task.weight}
                                onChange={(e) => updateTask(task.id, { weight: parseInt(e.target.value) || 0 })}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Açıklama' : 'Description'}</label>
                            <Textarea
                              value={isTr ? task.description.tr : task.description.en}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updates = isTr
                                  ? { description: { ...task.description as TranslationObject, tr: val } }
                                  : { description: { ...task.description as TranslationObject, en: val } };
                                updateTask(task.id, updates);
                              }}
                              className="text-xs min-h-[60px]"
                            />
                          </div>

                          <Separator className="my-1 opacity-30" />

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Doğrulama Mantığı' : 'Check Logic'}</label>
                              <Badge variant="secondary" className="text-[9px] h-4">ID: {task.id}</Badge>
                            </div>

                            <Select
                              value={task.checkType}
                              onValueChange={(val: string) => updateTask(task.id, { checkType: val as 'config' | 'command' | 'manual' | 'deviceAccess' | 'connection' })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="command">{isTr ? 'Komut Çalıştırma' : 'Command Execution'}</SelectItem>
                                <SelectItem value="config">{isTr ? 'Yapılandırma Değeri' : 'Config Value'}</SelectItem>
                                <SelectItem value="connection">{isTr ? 'Fiziksel Bağlantı' : 'Physical Connection'}</SelectItem>
                                <SelectItem value="deviceAccess">{isTr ? 'Cihaza Erişim' : 'Device Access'}</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Dynamic Params based on checkType */}
                            <div className={cn(
                              "p-2 rounded-lg border space-y-2",
                              isDark ? "bg-secondary-950/30 border-secondary-700/50" : "bg-secondary-50 border-secondary-200"
                            )}>
                              {task.checkType === 'command' && (
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Komut Deseni (Regex)' : 'Command Pattern (Regex)'}</label>
                                  <div className="flex gap-1">
                                    <Input
                                      value={task.checkParams?.commandPattern || ''}
                                      onChange={(e) => updateTask(task.id, {
                                        checkParams: { ...task.checkParams, commandPattern: e.target.value }
                                      })}
                                      className="h-7 text-[11px] font-mono flex-1 min-w-0"
                                      placeholder="orn: hostname .+"
                                    />
                                    <Select
                                      value=""
                                      onValueChange={(val) => updateTask(task.id, {
                                        checkParams: { ...task.checkParams, commandPattern: val }
                                      })}
                                    >
                                      <SelectTrigger className="h-7 w-[26px] p-0 flex-shrink-0">
                                        <span className="text-[10px] opacity-60">↓</span>
                                      </SelectTrigger>
                                      <SelectContent align="end" className="max-h-[200px]">
                                        <div className="text-[10px] font-bold opacity-50 px-2 py-1">{isTr ? 'Hazır Komutlar' : 'Preset Patterns'}</div>
                                        <SelectItem value="hostname\\s+.+">hostname .+</SelectItem>
                                        <SelectItem value="ip\\s+route\\s+0\\.0\\.0\\.0\\s+0\\.0\\.0\\.0\\s+.+">ip route default</SelectItem>
                                        <SelectItem value="interface\\s+.+">interface .+</SelectItem>
                                        <SelectItem value="vlan\\s+\\d+">vlan number</SelectItem>
                                        <SelectItem value="enable\\s+secret\\s+.+">enable secret .+</SelectItem>
                                        <SelectItem value="line\\s+console\\s+0">line console 0</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}

                              {task.checkType === 'config' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Anahtar' : 'Key'}</label>
                                      <div className="flex gap-1">
                                        <Input
                                          value={task.checkParams?.configKey || ''}
                                          onChange={(e) => updateTask(task.id, {
                                            checkParams: { ...task.checkParams, configKey: e.target.value }
                                          })}
                                          className="h-7 text-[11px] font-mono flex-1 min-w-0"
                                          placeholder="ports.fa0/1.shutdown"
                                        />
                                        <Select
                                          value=""
                                          onValueChange={(val) => updateTask(task.id, {
                                            checkParams: { ...task.checkParams, configKey: val }
                                          })}
                                        >
                                          <SelectTrigger className="h-7 w-[26px] p-0 flex-shrink-0">
                                            <span className="text-[10px] opacity-60">↓</span>
                                          </SelectTrigger>
                                          <SelectContent align="end" className="max-h-[200px]">
                                            <div className="text-[10px] font-bold opacity-50 px-2 py-1">{isTr ? 'Sık kullanılanlar' : 'Suggestions'}</div>
                                            <SelectItem value="security.consoleLine.password">security.consoleLine.password</SelectItem>
                                            <SelectItem value="ports.gi1/0/1.shutdown">ports.gi1/0/1.shutdown (L3)</SelectItem>
                                            <SelectItem value="ports.fa0/1.shutdown">ports.fa0/1.shutdown (L2)</SelectItem>
                                            <SelectItem value="ports.gi1/0/1.vlan">ports.gi1/0/1.vlan (L3)</SelectItem>
                                            <SelectItem value="ports.fa0/1.vlan">ports.fa0/1.vlan (L2)</SelectItem>
                                            <SelectItem value="vlans.10">vlans.10</SelectItem>
                                            <SelectItem value="pc.pc-1.ip">pc.pc-1.ip</SelectItem>
                                            <SelectItem value="pc.pc-2.ip">pc.pc-2.ip</SelectItem>
                                            {topologyDevices.filter(d => d.type === 'router' || d.type === 'switchL3').flatMap(d =>
                                              d.ports.filter(p => p.id !== 'console' && p.id !== 'wlan0').map(p => ({
                                                label: `${d.id}.${p.id}.ipAddress`,
                                                value: `ports.${d.id}.${p.id}.ipAddress`
                                              }))
                                            ).map(item => (
                                              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Değer' : 'Value'}</label>
                                      <div className="flex gap-1">
                                        <Input
                                          value={String(task.checkParams?.configValue ?? '')}
                                          onChange={(e) => updateTask(task.id, {
                                            checkParams: { ...task.checkParams, configValue: e.target.value }
                                          })}
                                          className="h-7 text-[11px] font-mono flex-1 min-w-0"
                                        />
                                        <Select
                                          value=""
                                          onValueChange={(val) => updateTask(task.id, {
                                            checkParams: { ...task.checkParams, configValue: val }
                                          })}
                                        >
                                          <SelectTrigger className="h-7 w-[26px] p-0 flex-shrink-0">
                                            <span className="text-[10px] opacity-60">↓</span>
                                          </SelectTrigger>
                                          <SelectContent align="end">
                                            <div className="text-[10px] font-bold opacity-50 px-2 py-1">{isTr ? 'Sık Değerler' : 'Common Values'}</div>
                                            <SelectItem value="true">true</SelectItem>
                                            <SelectItem value="false">false</SelectItem>
                                            <SelectItem value="up">up</SelectItem>
                                            <SelectItem value="down">down</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                            <SelectItem value="192.168.1.1">192.168.1.1</SelectItem>
                                            <SelectItem value="255.255.255.0">255.255.255.0</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {task.checkType === 'connection' && (
                                <div className="space-y-2">
                                  {(() => {
                                    const sourceDeviceId = task.checkParams?.sourceDevice || '';
                                    const targetDeviceId = task.checkParams?.targetDevice || '';
                                    const sourcePorts = getDevicePorts(sourceDeviceId);
                                    const targetPorts = getDevicePorts(targetDeviceId);
                                    const hasDevices = topologyDevices.length > 0;
                                    const sourceDeviceOptions = topologyDevices.filter(d => d.id !== targetDeviceId);
                                    const targetDeviceOptions = topologyDevices.filter(d => d.id !== sourceDeviceId);
                                    const isValidSourceDevice = sourceDeviceOptions.some(d => d.id === sourceDeviceId);
                                    const isValidTargetDevice = targetDeviceOptions.some(d => d.id === targetDeviceId);
                                    const selectedSourcePort = task.checkParams?.sourcePort;
                                    const selectedTargetPort = task.checkParams?.targetPort;
                                    const isValidSourcePort = sourcePorts.some((p) => p.id === selectedSourcePort);
                                    const isValidTargetPort = targetPorts.some((p) => p.id === selectedTargetPort);

                                    return (
                                      <>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Kablo Tipi' : 'Cable Type'}</label>
                                            <Select
                                              value={task.checkParams?.cableType || ''}
                                              onValueChange={(val) => updateTask(task.id, {
                                                checkParams: { ...task.checkParams, cableType: val as 'straight' | 'crossover' | 'console' }
                                              })}
                                            >
                                              <SelectTrigger className="h-7 text-[11px]">
                                                <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="straight">{isTr ? 'Düz' : 'Straight'}</SelectItem>
                                                <SelectItem value="crossover">{isTr ? 'Çapraz' : 'Crossover'}</SelectItem>
                                                <SelectItem value="console">{isTr ? 'Konsol' : 'Console'}</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Kaynak Cihaz' : 'Source Device'}</label>
                                            <Select
                                              value={isValidSourceDevice ? sourceDeviceId : undefined}
                                              onValueChange={(val) => updateTask(task.id, {
                                                checkParams: { ...task.checkParams, sourceDevice: val, sourcePort: undefined }
                                              })}
                                            >
                                              <SelectTrigger className="h-7 text-[11px]">
                                                <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {!hasDevices && (
                                                  <SelectItem value="__no_devices__" disabled>
                                                    {isTr ? 'Topolojide cihaz yok' : 'No devices in topology'}
                                                  </SelectItem>
                                                )}
                                                {sourceDeviceOptions.map(d => (
                                                  <SelectItem key={d.id} value={d.id}>{d.name} ({d.id})</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Kaynak Port' : 'Source Port'}</label>
                                            <Select
                                              value={isValidSourcePort ? selectedSourcePort : undefined}
                                              onValueChange={(val) => updateTask(task.id, {
                                                checkParams: { ...task.checkParams, sourcePort: val }
                                              })}
                                              disabled={!sourceDeviceId || sourcePorts.length === 0}
                                            >
                                              <SelectTrigger className="h-7 text-[11px]">
                                                <SelectValue placeholder={sourceDeviceId ? (isTr ? 'Port seçin...' : 'Select port...') : (isTr ? 'Önce cihaz seçin' : 'Select device first')} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {sourcePorts.length === 0 && (
                                                  <SelectItem value="__no_ports__" disabled>
                                                    {sourceDeviceId
                                                      ? (isTr ? `${getDeviceLabel(sourceDeviceId)} için port yok` : `No ports for ${getDeviceLabel(sourceDeviceId)}`)
                                                      : (isTr ? 'Önce kaynak cihaz seçin' : 'Select source device first')}
                                                  </SelectItem>
                                                )}
                                                {sourcePorts.map((p) => (
                                                  <SelectItem key={p.id} value={p.id}>{p.label || p.id}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Hedef Cihaz' : 'Target Device'}</label>
                                            <Select
                                              value={isValidTargetDevice ? targetDeviceId : undefined}
                                              onValueChange={(val) => updateTask(task.id, {
                                                checkParams: { ...task.checkParams, targetDevice: val, targetPort: undefined }
                                              })}
                                            >
                                              <SelectTrigger className="h-7 text-[11px]">
                                                <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {!hasDevices && (
                                                  <SelectItem value="__no_devices_target__" disabled>
                                                    {isTr ? 'Topolojide cihaz yok' : 'No devices in topology'}
                                                  </SelectItem>
                                                )}
                                                {targetDeviceOptions.map(d => (
                                                  <SelectItem key={d.id} value={d.id}>{d.name} ({d.id})</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Hedef Port' : 'Target Port'}</label>
                                            <Select
                                              value={isValidTargetPort ? selectedTargetPort : undefined}
                                              onValueChange={(val) => updateTask(task.id, {
                                                checkParams: { ...task.checkParams, targetPort: val }
                                              })}
                                              disabled={!targetDeviceId || targetPorts.length === 0}
                                            >
                                              <SelectTrigger className="h-7 text-[11px]">
                                                <SelectValue placeholder={targetDeviceId ? (isTr ? 'Port seçin...' : 'Select port...') : (isTr ? 'Önce cihaz seçin' : 'Select device first')} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {targetPorts.length === 0 && (
                                                  <SelectItem value="__no_target_ports__" disabled>
                                                    {targetDeviceId
                                                      ? (isTr ? `${getDeviceLabel(targetDeviceId)} için port yok` : `No ports for ${getDeviceLabel(targetDeviceId)}`)
                                                      : (isTr ? 'Önce hedef cihaz seçin' : 'Select target device first')}
                                                  </SelectItem>
                                                )}
                                                {targetPorts.map((p) => (
                                                  <SelectItem key={p.id} value={p.id}>{p.label || p.id}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}

                              {task.checkType === 'deviceAccess' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Cihaz Tipi' : 'Device Type'}</label>
                                      <Select
                                        value={task.checkParams?.deviceType || ''}
                                        onValueChange={(val) => updateTask(task.id, {
                                          checkParams: { ...task.checkParams, deviceType: val as 'switch' | 'router' | 'pc', targetDeviceId: undefined }
                                        })}
                                      >
                                        <SelectTrigger className="h-7 text-[11px]">
                                          <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="switch">{isTr ? 'Switch' : 'Switch'}</SelectItem>
                                          <SelectItem value="router">{isTr ? 'Router' : 'Router'}</SelectItem>
                                          <SelectItem value="pc">PC</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Topolojideki Cihaz' : 'Topology Device'}</label>
                                      <Select
                                        value={task.checkParams?.targetDeviceId || '__any__'}
                                        onValueChange={(val) => updateTask(task.id, {
                                          checkParams: { ...task.checkParams, targetDeviceId: val === '__any__' ? undefined : val }
                                        })}
                                      >
                                        <SelectTrigger className="h-7 text-[11px]">
                                          <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__any__">{isTr ? 'Herhangi biri' : 'Any device'}</SelectItem>
                                          {topologyDevices
                                            .filter((d) => {
                                              if (task.checkParams?.deviceType === 'switch') return d.type === 'switchL2' || d.type === 'switchL3';
                                              if (task.checkParams?.deviceType === 'router') return d.type === 'router';
                                              if (task.checkParams?.deviceType === 'pc') return d.type === 'pc';
                                              return true;
                                            })
                                            .map((d) => (
                                              <SelectItem key={d.id} value={d.id}>{d.name} ({d.id})</SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                <Info className="w-3 h-3 text-primary-500 opacity-60" />
                                <p className="text-[9px] opacity-50 leading-tight">
                                  {isTr ? 'Bu değerler topolojideki cihaz ID\'leri ile eşleşmelidir.' : 'These values must match device IDs in the topology.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Fault Injection (Hata Enjeksiyonu) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" />
                {isTr ? 'Hata Enjeksiyonu' : 'Fault Injection'}
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[11px] gap-1 border-orange-500/50 text-orange-600 hover:bg-orange-500/10" 
                onClick={() => {
                  const newFault: FaultDefinition = {
                    id: `fault-${Date.now()}`,
                    faultType: 'wrongSubnetMask',
                    deviceId: topologyDevices[0]?.id || '',
                    configKey: '',
                    faultValue: null,
                    correctValue: null,
                    description: { tr: 'Yanlış Subnet Mask', en: 'Wrong Subnet Mask' }
                  };
                  updateExamMeta({
                    injectedFaults: [...(activeExam.injectedFaults || []), newFault]
                  });
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                {isTr ? 'Arıza Ekle' : 'Add Fault'}
              </Button>
            </div>

            {(!activeExam.injectedFaults || activeExam.injectedFaults.length === 0) ? (
              <div className={cn(
                "p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center",
                isDark ? "border-orange-900/30 bg-orange-950/10" : "border-orange-200 bg-orange-50/30"
              )}>
                <AlertCircle className="w-8 h-8 opacity-20 mb-2 text-orange-500" />
                <p className="text-xs font-medium opacity-40">
                  {isTr ? 'Sisteme arıza enjekte edilmedi.' : 'No faults injected.'}
                </p>
                <p className="text-[10px] opacity-30 mt-1">
                  {isTr ? 'Öğrenciler için sorun giderme senaryoları oluşturun.' : 'Create troubleshooting scenarios for students.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeExam.injectedFaults.map((fault, index) => (
                  <Card
                    key={fault.id}
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      isDark ? "bg-secondary-800/40 border-orange-900/50" : "bg-orange-50/50 border-orange-200"
                    )}
                  >
                    <div className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] font-bold text-orange-600">
                            F{index + 1}
                          </div>
                          <div className="font-bold text-xs">
                            {isTr ? fault.description.tr : fault.description.en}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-rose-500 hover:bg-rose-500/10"
                          onClick={() => {
                            updateExamMeta({
                              injectedFaults: (activeExam.injectedFaults || []).filter(f => f.id !== fault.id)
                            });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold opacity-50 uppercase ml-1">
                            {isTr ? 'Cihaz' : 'Device'}
                          </label>
                          <Select
                            value={fault.deviceId}
                            onValueChange={(val) => {
                              const newFaults = [...(activeExam.injectedFaults || [])];
                              newFaults[index].deviceId = val;
                              updateExamMeta({ injectedFaults: newFaults });
                            }}
                          >
                            <SelectTrigger className="h-7 text-[11px] border-orange-500/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {topologyDevices.map((d) => (
                                <SelectItem key={d.id} value={d.id}>{d.name} ({d.id})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold opacity-50 uppercase ml-1">
                            {isTr ? 'Arıza Tipi' : 'Fault Type'}
                          </label>
                          <Select
                            value={fault.faultType}
                            onValueChange={(val) => {
                              const newFaults = [...(activeExam.injectedFaults || [])];
                              newFaults[index].faultType = val as FaultType;
                              if (val === 'wrongSubnetMask') {
                                newFaults[index].configKey = 'vlan1.subnet';
                                newFaults[index].faultValue = '255.255.255.0';
                              } else if (val === 'wrongVlan') {
                                newFaults[index].configKey = 'ports.fa0/1.vlan';
                              } else if (val === 'shutdownInterface') {
                                newFaults[index].configKey = 'ports.fa0/1.shutdown';
                                newFaults[index].faultValue = true;
                                newFaults[index].correctValue = false;
                              }
                              updateExamMeta({ injectedFaults: newFaults });
                            }}
                          >
                            <SelectTrigger className="h-7 text-[11px] border-orange-500/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="wrongSubnetMask">{isTr ? 'Yanlış Subnet Maskesi' : 'Wrong Subnet Mask'}</SelectItem>
                              <SelectItem value="wrongVlan">{isTr ? 'Yanlış VLAN Ataması' : 'Wrong VLAN Assignment'}</SelectItem>
                              <SelectItem value="shutdownInterface">{isTr ? 'Kapalı Arayüz' : 'Shutdown Interface'}</SelectItem>
                              <SelectItem value="stpLoop">{isTr ? 'STP Döngüsü / Loop' : 'STP Loop'}</SelectItem>
                              <SelectItem value="wrongAcl">{isTr ? 'Yanlış ACL' : 'Wrong ACL'}</SelectItem>
                              <SelectItem value="custom">{isTr ? 'Özel Konfigürasyon' : 'Custom Config'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-2 mt-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold opacity-50 uppercase ml-1">
                            {isTr ? 'Açıklama' : 'Description'}
                          </label>
                          <Input
                            value={isTr ? fault.description.tr : fault.description.en}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newFaults = [...(activeExam.injectedFaults || [])];
                              newFaults[index].description = isTr 
                                ? { ...newFaults[index].description, tr: val }
                                : { ...newFaults[index].description, en: val };
                              updateExamMeta({ injectedFaults: newFaults });
                            }}
                            className="h-7 text-[11px] border-orange-500/30"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold opacity-50 uppercase ml-1">
                            {isTr ? 'Kontrol Anahtarı (Örn: ports.fa0/1.vlan)' : 'Check Key'}
                          </label>
                          <Input
                            value={fault.configKey || ''}
                            onChange={(e) => {
                              const newFaults = [...(activeExam.injectedFaults || [])];
                              newFaults[index].configKey = e.target.value;
                              updateExamMeta({ injectedFaults: newFaults });
                            }}
                            className="h-7 text-[11px] border-orange-500/30 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
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
