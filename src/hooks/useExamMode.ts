import { useState, useCallback, useMemo, useEffect } from 'react';
import { ExamProject, ExamTask, getExamProjects, encryptExamData } from '@/lib/network/examMode';
import { checkStepCompletion } from '@/lib/network/guidedMode';

interface UseExamModeReturn {
  activeExam: ExamProject | null;
  isExamActive: boolean;
  isExamFinished: boolean;
  isPanelMinimized: boolean;
  isEditorOpen: boolean;
  startExam: (project: ExamProject) => void;
  finishExam: () => void;
  closeExam: () => void;
  togglePanelMinimize: () => void;
  expandPanel: () => void;
  toggleEditor: (open?: boolean) => void;
  addTask: (task: any) => void;
  updateTask: (id: string, updates: any) => void;
  deleteTask: (id: string) => void;
  updateExamMeta: (updates: Partial<ExamProject>) => void;
  moveTask: (id: string, direction: 'up' | 'down') => void;
  smartBalanceWeights: () => void;
  exportExamFile: (projectData: any) => void;
  checkTasks: (context: {
    lastCommand?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: any;
    topologyConnections?: any[];
    topologyDevices?: any[];
  }) => void;
  currentScore: number;
  getAvailableExams: (language: 'tr' | 'en') => ExamProject[];
}

const STORAGE_KEY = 'examModeState';

export function useExamMode(): UseExamModeReturn {
  const [activeExam, setActiveExam] = useState<ExamProject | null>(null);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage after mount
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.startedAt) parsed.startedAt = new Date(parsed.startedAt);
        if (parsed.finishedAt) parsed.finishedAt = new Date(parsed.finishedAt);
        if (parsed.tasks) {
          parsed.tasks = parsed.tasks.map((t: any) => ({
            ...t,
            completedAt: t.completedAt ? new Date(t.completedAt) : undefined
          }));
        }
        setActiveExam(parsed);
      } catch (e) {
        console.error('Failed to load exam state', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isMounted) return;
    if (activeExam) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeExam));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeExam, isMounted]);

  const startExam = useCallback((project: ExamProject) => {
    setActiveExam({
      ...project,
      tasks: project.tasks.map(t => ({ ...t, completed: false, completedAt: undefined })),
      startedAt: new Date()
    });
    setIsPanelMinimized(false);
  }, []);

  const finishExam = useCallback(() => {
    setActiveExam(prev => {
      if (!prev || prev.finishedAt) return prev;
      return { ...prev, finishedAt: new Date() };
    });
    setIsPanelMinimized(false);
  }, []);

  const closeExam = useCallback(() => {
    setActiveExam(null);
    setIsPanelMinimized(false);
  }, []);

  const togglePanelMinimize = useCallback(() => {
    setIsPanelMinimized(prev => !prev);
  }, []);

  const expandPanel = useCallback(() => {
    setIsPanelMinimized(false);
  }, []);

  const toggleEditor = useCallback((open?: boolean) => {
    setIsEditorOpen(prev => open !== undefined ? open : !prev);
  }, []);

  const addTask = useCallback((task: any) => {
    setActiveExam(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: [...prev.tasks, { ...task, id: `task-${Date.now()}`, completed: false }]
      };
    });
  }, []);

  const updateTask = useCallback((id: string, updates: any) => {
    setActiveExam(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      };
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setActiveExam(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== id)
      };
    });
  }, []);

  const updateExamMeta = useCallback((updates: Partial<ExamProject>) => {
    setActiveExam(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []);

  const moveTask = useCallback((id: string, direction: 'up' | 'down') => {
    setActiveExam(prev => {
      if (!prev) return null;
      const index = prev.tasks.findIndex(t => t.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.tasks.length - 1) return prev;

      const newTasks = [...prev.tasks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newTasks[index], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[index]];

      return { ...prev, tasks: newTasks };
    });
  }, []);

  const smartBalanceWeights = useCallback(() => {
    setActiveExam(prev => {
      if (!prev || prev.tasks.length === 0) return prev;
      const count = prev.tasks.length;
      const baseWeight = Math.floor(100 / count);
      const remainder = 100 % count;

      return {
        ...prev,
        tasks: prev.tasks.map((t, i) => ({
          ...t,
          weight: i < remainder ? baseWeight + 1 : baseWeight
        }))
      };
    });
  }, []);

  const exportExamFile = useCallback((projectData: any) => {
    if (!activeExam) return;

    const examData = {
      ...activeExam,
      data: projectData, // Inject current project state (topology + device states)
      isExam: true,
      startedAt: undefined,
      finishedAt: undefined, // Clear session data
      tasks: activeExam.tasks.map(t => ({ ...t, completed: false, completedAt: undefined }))
    };

    const encrypted = encryptExamData(examData);
    const blob = new Blob([encrypted], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const downloadName = typeof activeExam.title === 'string'
      ? activeExam.title.replace(/\s+/g, '_')
      : 'exam_file';
    a.download = `${downloadName}.exam`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeExam]);

  const checkTasks = useCallback((context: {
    lastCommand?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: any;
    topologyConnections?: any[];
    topologyDevices?: any[];
  }) => {
    if (!activeExam || activeExam.finishedAt) return;

    let changed = false;
    const updatedTasks = activeExam.tasks.map(task => {
      if (task.completed) return task;

      // reuse checkStepCompletion logic from guided mode
      const isCompleted = checkStepCompletion(task as any, context);
      if (isCompleted) {
        changed = true;
        return { ...task, completed: true, completedAt: new Date() };
      }
      return task;
    });

    if (changed) {
      setActiveExam(prev => prev ? { ...prev, tasks: updatedTasks } : null);
    }
  }, [activeExam]);

  const currentScore = useMemo(() => {
    if (!activeExam) return 0;
    return activeExam.tasks.reduce((sum, t) => sum + (t.completed ? t.weight : 0), 0);
  }, [activeExam]);

  const getAvailableExams = useCallback((language: 'tr' | 'en') => {
    return getExamProjects(language);
  }, []);

  return {
    activeExam,
    isExamActive: activeExam !== null,
    isExamFinished: activeExam?.finishedAt != null,
    isPanelMinimized,
    startExam,
    finishExam,
    closeExam,
    togglePanelMinimize,
    expandPanel,
    isEditorOpen,
    toggleEditor,
    addTask,
    updateTask,
    deleteTask,
    updateExamMeta,
    moveTask,
    smartBalanceWeights,
    exportExamFile,
    checkTasks,
    currentScore,
    getAvailableExams
  };
}
