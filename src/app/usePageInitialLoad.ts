import { useState, useEffect, useRef } from 'react';
import { getGuidedProjects } from '@/lib/network/guidedMode';
import { getExamProjects } from '@/lib/network/examMode';
import { safeParse } from '@/lib/network/serialization';
import { errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';

interface UsePageInitialLoadOptions {
  initialProjectId?: string;
  language: 'tr' | 'en';
  applyExampleProject: (data: any, id: string) => void;
  handleStartGuidedProject: (lesson: any) => void;
  startExamFromCatalog: (exam: any) => void;
  loadProjectData: (data: any, options?: { keepActiveDevice?: boolean }) => void;
  setLastSaveTime: (time: string | null) => void;
}

export function usePageInitialLoad({
  initialProjectId,
  language,
  applyExampleProject,
  handleStartGuidedProject,
  startExamFromCatalog,
  loadProjectData,
  setLastSaveTime,
}: UsePageInitialLoadOptions) {
  const [isAppLoading, setIsLoading] = useState(true);
  // Kept for API compatibility: the skeleton overlay phase was removed to
  // unblock LCP (the extra artificial delay covered no real work).
  const [showSkeleton] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Show hourglass cursor during app startup
  useEffect(() => {
    document.body.style.cursor = 'wait';
    return () => { document.body.style.cursor = ''; };
  }, []);

  useEffect(() => {
    if (!isAppLoading) {
      document.body.style.cursor = '';
    }
  }, [isAppLoading]);

  // Initial loading: finishes immediately on mount so the app opens instantly.
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Persistence: Load from URL ID or localStorage ONCE on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    if (initialProjectId) {
      // 1. Try example projects (dynamic import)
      import('@/lib/network/exampleProjects').then(({ exampleProjects }) => {
        const examples = exampleProjects(language);
        const example = examples.find(p => p.id === initialProjectId);
        if (example) {
          setTimeout(() => applyExampleProject(example.data, example.id), 0);
          return;
        }
      });

      // 2. Try guided projects (Lessons)
      const lessons = getGuidedProjects(language);
      const lesson = lessons.find(p => p.id === initialProjectId);
      if (lesson) {
        setTimeout(() => handleStartGuidedProject(lesson), 0);
        return;
      }

      // 3. Try exams
      const exams = getExamProjects(language);
      const exam = exams.find(p => p.id === initialProjectId);
      if (exam) {
        setTimeout(() => startExamFromCatalog(exam), 0);
        return;
      }
    }

    let savedData: string | null = null;
    try { savedData = localStorage.getItem('netsim_autosave'); } catch { /* storage unavailable */ }
    if (savedData && savedData.trim() !== '' && savedData !== 'undefined' && savedData !== 'null') {
      try {
        const projectData = safeParse<unknown>(savedData);
        if (projectData && typeof projectData === 'object') {
          setTimeout(() => loadProjectData(projectData, { keepActiveDevice: true }), 0);
          const parsedProject = projectData as Record<string, unknown>;
          if (parsedProject?.timestamp) {
            const date = new Date(String(parsedProject.timestamp));
            setTimeout(() => setLastSaveTime(date.toLocaleTimeString()), 0);
          } else {
            setTimeout(() => setLastSaveTime(new Date().toLocaleTimeString()), 0);
          }
        }
      } catch (e) {
        errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'autosave', error: String(e) }));
        try { localStorage.removeItem('netsim_autosave'); } catch { /* ignore */ }
      }
    }
  }, [initialProjectId, language, applyExampleProject, handleStartGuidedProject, startExamFromCatalog, loadProjectData, setLastSaveTime]);

  return {
    isAppLoading,
    showSkeleton,
    hasHydrated,
  };
}
