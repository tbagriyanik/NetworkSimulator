import { ChevronDown, ChevronUp, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { cn } from '@/lib/utils';
import { ExamTask } from '@/lib/network/examMode';
import { TaskFormFields } from './TaskFormFields';
import type { TopologyDevice } from './examUtils';

type TranslationObject = { tr: string; en: string };

export interface TaskCardProps {
    task: ExamTask;
    index: number;
    totalTasks: number;
    expandedTaskId: string | null;
    setExpandedTaskId: (id: string | null) => void;
    draggedTaskId: string | null;
    setDraggedTaskId: (id: string | null) => void;
    touchDragInfo: { id: string; startIndex: number; currentIndex: number } | null;
    setTouchDragInfo: (info: { id: string; startIndex: number; currentIndex: number } | null) => void;
    moveTask: (id: string, direction: 'up' | 'down') => void;
    deleteTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<ExamTask>) => void;
    topologyDevices: TopologyDevice[];
    getDevicePorts: (deviceId: string) => { id: string; label: string }[];
    isTr: boolean;
    isDark: boolean;
    t: Record<string, string>;
}

export function TaskCard({
    task,
    index,
    totalTasks,
    expandedTaskId,
    setExpandedTaskId,
    draggedTaskId,
    setDraggedTaskId,
    touchDragInfo,
    setTouchDragInfo,
    moveTask,
    deleteTask,
    updateTask,
    topologyDevices,
    getDevicePorts,
    isTr,
    isDark,
    t
}: TaskCardProps) {
    return (
        <Card
            data-task-index={index}
            draggable
            onDragStart={(e) => {
                setDraggedTaskId(task.id);
                e.dataTransfer.effectAllowed = 'move';
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
                    const fromIndex = index;
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
                            disabled={index === totalTasks - 1}
                            onClick={(e) => {
                                e.stopPropagation();
                                moveTask(task.id, 'down');
                            }}
                        >
                            <ChevronDown className="w-4 h-4" />
                        </Button>
                    </TooltipWrapper>
                    <TooltipWrapper title={t.delete || 'Delete'}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-error-500 hover:text-error-600 hover:bg-error-500/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id);
                            }}
                        >
                            <Trash2 className="w-3.5 h-3.5 text-error-500" />
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

                            <TaskFormFields
                                task={task}
                                updateTask={updateTask}
                                topologyDevices={topologyDevices}
                                getDevicePorts={getDevicePorts}
                                isTr={isTr}
                                isDark={isDark}
                            />
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
