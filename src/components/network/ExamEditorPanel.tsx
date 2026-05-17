'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Plus, Trash2, Save, Wand2, Shield,
  ChevronDown, ChevronUp, AlertCircle, Info,
  Settings, CheckCircle2, Layout, Type, Target
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
  CardHeader,
  CardTitle,
  CardDescription,
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
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { ExamTask, ExamProject } from '@/lib/network/examMode';

type TranslationObject = { tr: string; en: string };

interface ExamEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeExam: ExamProject | null;
  addTask: (task: Partial<ExamTask>) => void;
  updateTask: (id: string, updates: Partial<ExamTask>) => void;
  deleteTask: (id: string) => void;
  updateExamMeta: (updates: Partial<ExamProject>) => void;
  smartBalanceWeights: () => void;
  exportExamFile: (topologyData: any) => void;
  topologyData: any;
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
  smartBalanceWeights,
  exportExamFile,
  topologyData,
  isDark
}: ExamEditorPanelProps) {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  if (!isOpen || !activeExam) return null;

  const isTr = language === 'tr';
  const totalWeight = activeExam.tasks.reduce((sum, t) => sum + (t.weight || 0), 0);

  const topologyDevices: { id: string; name: string; type: string; ports: { id: string; label: string }[] }[] =
    topologyData?.topology?.devices?.map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      ports: d.ports || []
    })) || [];

  const getDevicePorts = (deviceId: string) => {
    const device = topologyDevices.find(d => d.id === deviceId);
    return device?.ports || [];
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
        "fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[550px] lg:w-[600px] max-w-[100vw] z-[100] shadow-2xl flex flex-col transition-all duration-300 transform",
        isOpen ? "translate-x-0" : "translate-x-full",
        isDark ? "bg-slate-900 border-l border-slate-800" : "bg-white border-l border-slate-200"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
      )}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Shield className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {isTr ? 'Sınav Düzenleyici' : 'Exam Editor'}
            </h2>
            <p className="text-[10px] font-medium opacity-60 uppercase tracking-wider">
              {isTr ? 'Öğretmen Modu' : 'Teacher Mode'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6 pb-20">
          {/* Exam Details */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-500" />
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
                    onValueChange={(v: any) => updateExamMeta({ difficulty: v })}
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
                isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"
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
                  <Card key={task.id} className={cn(
                    "overflow-hidden transition-all duration-200",
                    isDark ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200",
                    expandedTaskId === task.id ? "ring-1 ring-purple-500/50" : ""
                  )}>
                    <div
                      className="p-3 flex items-center justify-between cursor-pointer group"
                      onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-slate-500/10 flex items-center justify-center text-[10px] font-bold">
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
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        {expandedTaskId === task.id ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
                      </div>
                    </div>

                    {expandedTaskId === task.id && (
                      <CardContent className="p-3 pt-0 border-t border-slate-700/30 space-y-3">
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
                              onValueChange={(val: any) => updateTask(task.id, { checkType: val })}
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
                              isDark ? "bg-slate-950/30 border-slate-700/50" : "bg-slate-50 border-slate-200"
                            )}>
                              {task.checkType === 'command' && (
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Komut Deseni (Regex)' : 'Command Pattern (Regex)'}</label>
                                  <Input
                                    value={task.checkParams?.commandPattern || ''}
                                    onChange={(e) => updateTask(task.id, {
                                      checkParams: { ...task.checkParams, commandPattern: e.target.value }
                                    })}
                                    className="h-7 text-[11px] font-mono"
                                    placeholder="örn: hostname .+"
                                  />
                                </div>
                              )}

                              {task.checkType === 'config' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">Key</label>
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
                                            <SelectItem value="ports.fa0/1.shutdown">ports.fa0/1.shutdown</SelectItem>
                                            <SelectItem value="ports.fa0/1.vlan">ports.fa0/1.vlan</SelectItem>
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
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">Value</label>
                                      <Input
                                        value={task.checkParams?.configValue || ''}
                                        onChange={(e) => updateTask(task.id, {
                                          checkParams: { ...task.checkParams, configValue: e.target.value }
                                        })}
                                        className="h-7 text-[11px] font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {task.checkType === 'connection' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">Kablo Tipi</label>
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
                                          <SelectItem value="straight">Straight</SelectItem>
                                          <SelectItem value="crossover">Crossover</SelectItem>
                                          <SelectItem value="console">Console</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">Kaynak Cihaz</label>
                                      <Select
                                        value={task.checkParams?.sourceDevice || ''}
                                        onValueChange={(val) => updateTask(task.id, {
                                          checkParams: { ...task.checkParams, sourceDevice: val, sourcePort: '' }
                                        })}
                                      >
                                        <SelectTrigger className="h-7 text-[11px]">
                                          <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {topologyDevices.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name} ({d.id})</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">Kaynak Port</label>
                                      <Select
                                        value={task.checkParams?.sourcePort || ''}
                                        onValueChange={(val) => updateTask(task.id, {
                                          checkParams: { ...task.checkParams, sourcePort: val }
                                        })}
                                      >
                                        <SelectTrigger className="h-7 text-[11px]">
                                          <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getDevicePorts(task.checkParams?.sourceDevice || '').map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>{p.label || p.id}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">Hedef Cihaz</label>
                                      <Select
                                        value={task.checkParams?.targetDevice || ''}
                                        onValueChange={(val) => updateTask(task.id, {
                                          checkParams: { ...task.checkParams, targetDevice: val, targetPort: '' }
                                        })}
                                      >
                                        <SelectTrigger className="h-7 text-[11px]">
                                          <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {topologyDevices.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name} ({d.id})</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold opacity-50 uppercase ml-1">Hedef Port</label>
                                      <Select
                                        value={task.checkParams?.targetPort || ''}
                                        onValueChange={(val) => updateTask(task.id, {
                                          checkParams: { ...task.checkParams, targetPort: val }
                                        })}
                                      >
                                        <SelectTrigger className="h-7 text-[11px]">
                                          <SelectValue placeholder={isTr ? 'Seçin...' : 'Select...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getDevicePorts(task.checkParams?.targetDevice || '').map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>{p.label || p.id}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {task.checkType === 'deviceAccess' && (
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold opacity-50 uppercase ml-1">{isTr ? 'Cihaz Tipi' : 'Device Type'}</label>
                                  <Select
                                    value={task.checkParams?.deviceType || ''}
                                    onValueChange={(val) => updateTask(task.id, {
                                      checkParams: { ...task.checkParams, deviceType: val as 'switch' | 'router' | 'pc' }
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
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                <Info className="w-3 h-3 text-blue-500 opacity-60" />
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
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className={cn(
        "p-4 border-t mt-auto flex items-center justify-between gap-3",
        isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
      )}>
        <div className="flex-1">
          <p className="text-[10px] font-bold opacity-40 mb-1 ml-1 uppercase">
            {isTr ? 'Sınavı Tamamla' : 'Finalize Exam'}
          </p>
          <Button
            className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white gap-2 font-bold shadow-lg shadow-purple-500/20"
            disabled={activeExam.tasks.length === 0 || totalWeight !== 100}
            onClick={() => exportExamFile(topologyData)}
          >
            <Save className="w-4 h-4" />
            {isTr ? 'Sınav Dosyası Olarak Kaydet' : 'Save as Exam File (.exam)'}
          </Button>
        </div>
      </div>
    </div>
  );
}
