import { useState, useCallback, useMemo, useEffect } from 'react';
import { ExamProject, ExamTask, getExamProjects } from '@/lib/network/examMode';
import { checkStepCompletion } from '@/lib/network/guidedMode';

interface UseExamModeReturn {
  activeExam: ExamProject | null;
  isExamActive: boolean;
  isPanelMinimized: boolean;
  startExam: (project: ExamProject) => void;
  finishExam: () => void;
  togglePanelMinimize: () => void;
  expandPanel: () => void;
  checkTasks: (context: {
    lastCommand?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
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
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage after mount
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.startedAt) parsed.startedAt = new Date(parsed.startedAt);
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
    setActiveExam(null);
    setIsPanelMinimized(false);
  }, []);

  const togglePanelMinimize = useCallback(() => {
    setIsPanelMinimized(prev => !prev);
  }, []);

  const expandPanel = useCallback(() => {
    setIsPanelMinimized(false);
  }, []);

  const checkTasks = useCallback((context: {
    lastCommand?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceState?: any;
    topologyConnections?: any[];
    topologyDevices?: any[];
  }) => {
    if (!activeExam) return;

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
    isPanelMinimized,
    startExam,
    finishExam,
    togglePanelMinimize,
    expandPanel,
    checkTasks,
    currentScore,
    getAvailableExams
  };
}
