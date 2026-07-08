import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ExamProject, type ExamTask, getExamProjects, encryptExamData, generateExamIntegrityHash, verifyExamIntegrity } from '@/lib/network/examMode';
import { checkStepCompletion, type GuidedStep } from '@/lib/network/guidedMode';

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
  addTask: (task: unknown) => void;
  updateTask: (id: string, updates: unknown) => void;
  deleteTask: (id: string) => void;
  updateExamMeta: (updates: Partial<ExamProject>) => void;
  moveTask: (id: string, direction: 'up' | 'down') => void;
  smartBalanceWeights: () => void;
  exportExamFile: (projectData: unknown) => void;
  checkTasks: (context: {
    lastCommand?: string;
    lastOutput?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: unknown;
    deviceStates?: Map<string, unknown>;
    topologyConnections?: unknown[];
    topologyDevices?: unknown[];
  }) => void;
  currentScore: number;
  getAvailableExams: (language: 'tr' | 'en') => ExamProject[];
}

const STORAGE_KEY = 'examModeState';

export function useExamMode(): UseExamModeReturn {
  const isInitializedRef = useRef(false);
  const [activeExam, setActiveExam] = useState<ExamProject | null>(null);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Load from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.startedAt) parsed.startedAt = new Date(parsed.startedAt);
        if (parsed.finishedAt) parsed.finishedAt = new Date(parsed.finishedAt);
        if (parsed.tasks) {
          parsed.tasks = parsed.tasks.map((t: unknown) => ({
            ...(t as Record<string, unknown>),
            completedAt: (t as Record<string, unknown>).completedAt ? new Date((t as Record<string, unknown>).completedAt as string) : undefined
          }));
        }
        // Verify integrity before loading
        if (parsed.integrityHash) {
          const tempProject = { ...parsed };
          if (!verifyExamIntegrity(tempProject as ExamProject)) {
            console.error('Exam integrity compromised! Resetting exam...');
            // Tampering detected, don't load the saved state
            localStorage.removeItem(STORAGE_KEY);
            isInitializedRef.current = true;
            return;
          }
        }
        setActiveExam(parsed);
      } catch (e) {
        console.error('Failed to load exam state', e);
      }
    }
    isInitializedRef.current = true;
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isInitializedRef.current) return;

    if (activeExam) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeExam));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeExam]);

  const startExam = useCallback((project: ExamProject) => {
    const newExam: ExamProject = {
      ...project,
      tasks: project.tasks.map(t => ({ ...t, completed: false, completedAt: undefined })),
      startedAt: new Date()
    };
    newExam.integrityHash = generateExamIntegrityHash(newExam);
    setActiveExam(newExam);
    setIsPanelMinimized(false);
  }, []);

  const finishExam = useCallback(() => {
    setActiveExam(prev => {
      if (!prev || prev.finishedAt) return prev;
      const updated: ExamProject = { ...prev, finishedAt: new Date() };
      updated.integrityHash = generateExamIntegrityHash(updated);
      return updated;
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

  const addTask = useCallback((task: unknown) => {
    setActiveExam(prev => {
      if (!prev) return null;
      const updated: ExamProject = {
        ...prev,
        tasks: [...prev.tasks, { ...(task as Record<string, unknown>), id: `task-${Date.now()}`, completed: false } as ExamTask]
      };
      updated.integrityHash = generateExamIntegrityHash(updated);
      return updated;
    });
  }, []);

  const updateTask = useCallback((id: string, updates: unknown) => {
    setActiveExam(prev => {
      if (!prev) return null;
      const updated: ExamProject = {
        ...prev,
        tasks: prev.tasks.map(t => t.id === id ? { ...t, ...(updates as Record<string, unknown>) } : t)
      };
      updated.integrityHash = generateExamIntegrityHash(updated);
      return updated;
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setActiveExam(prev => {
      if (!prev) return null;
      const updated: ExamProject = {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== id)
      };
      updated.integrityHash = generateExamIntegrityHash(updated);
      return updated;
    });
  }, []);

  const updateExamMeta = useCallback((updates: Partial<ExamProject>) => {
    setActiveExam(prev => {
      if (!prev) return null;
      const updated: ExamProject = { ...prev, ...updates };
      updated.integrityHash = generateExamIntegrityHash(updated);
      return updated;
    });
  }, []);

  const moveTask = useCallback((id: string, direction: 'up' | 'down') => {
    setActiveExam(prev => {
      if (!prev) return prev;
      const index = prev.tasks.findIndex(t => t.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.tasks.length - 1) return prev;

      const newTasks = [...prev.tasks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newTasks[index], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[index]];

      const updated: ExamProject = { ...prev, tasks: newTasks };
      updated.integrityHash = generateExamIntegrityHash(updated);
      return updated;
    });
  }, []);

  const smartBalanceWeights = useCallback(() => {
    setActiveExam(prev => {
      if (!prev || prev.tasks.length === 0) return prev;
      const count = prev.tasks.length;
      const baseWeight = Math.floor(100 / count);
      const remainder = 100 % count;

      const updated: ExamProject = {
        ...prev,
        tasks: prev.tasks.map((t, i) => ({
          ...t,
          weight: i < remainder ? baseWeight + 1 : baseWeight
        }))
      };
      updated.integrityHash = generateExamIntegrityHash(updated);
      return updated;
    });
  }, []);

  const exportExamFile = useCallback((projectData: unknown) => {
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
    lastOutput?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: unknown;
    deviceStates?: Map<string, unknown>;
    topologyConnections?: unknown[];
    topologyDevices?: unknown[];
  }) => {
    if (!activeExam || activeExam.finishedAt) return;

    let changed = false;
    const updatedTasks = activeExam.tasks.map(task => {
      if (task.completed) return task;

      // reuse checkStepCompletion logic from guided mode
      const isCompleted = checkStepCompletion(task as unknown as GuidedStep, context as unknown as Parameters<typeof checkStepCompletion>[1]);
      if (isCompleted) {
        changed = true;
        return { ...task, completed: true, completedAt: new Date() };
      }
      return task;
    });

    if (changed) {
      setActiveExam(prev => {
        if (!prev) return null;
        const updated: ExamProject = { ...prev, tasks: updatedTasks };
        updated.integrityHash = generateExamIntegrityHash(updated);
        return updated;
      });
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
