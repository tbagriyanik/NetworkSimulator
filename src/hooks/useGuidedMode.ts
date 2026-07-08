'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  GuidedProject, 
  checkStepCompletion,
  getGuidedProjects,
  getCompletedStepsCount,
  generateGuidedIntegrityHash,
  verifyGuidedIntegrity
} from '@/lib/network/guidedMode';

interface UseGuidedModeReturn {
  // State
  activeProject: GuidedProject | null;
  currentStepIndex: number;
  isGuidedModeActive: boolean;
  isPanelMinimized: boolean;
  lastCompletedStep: string | null;
  
  // Actions
  startGuidedProject: (project: GuidedProject) => void;
  completeStep: (stepId: string) => void;
  uncompleteStep: (stepId: string) => void;
  skipStep: () => void;
  goToStep: (index: number) => void;
  closeGuidedMode: () => void;
  togglePanelMinimize: () => void;
  expandPanel: () => void;
  
  // Context check for auto-completion
  checkStepCompletionWithContext: (context: {
    lastCommand?: string;
    lastOutput?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: unknown;
    deviceStates?: Map<string, unknown>;
    topologyConnections?: unknown[];
    topologyDevices?: unknown[];
  }) => void;
  
  // Step readiness check
  isCurrentStepReady: boolean;
  
  // Helpers
  progress: number;
  completedCount: number;
  totalSteps: number;
  currentPoints: number;
  totalPoints: number;
  isAllCompleted: boolean;
  getAvailableProjects: (language: 'tr' | 'en') => GuidedProject[];
}

// Helper to serialize/deserialize project with dates
const serializeProject = (project: GuidedProject | null): string => {
  if (!project) return '';
  return JSON.stringify(project);
};

const deserializeProject = (json: string): GuidedProject | null => {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    // Convert date strings back to Date objects
    if (parsed.startedAt) parsed.startedAt = new Date(parsed.startedAt);
    if (parsed.steps) {
      parsed.steps = parsed.steps.map((step: unknown) => ({
        ...(step as Record<string, unknown>),
        completedAt: (step as Record<string, unknown>).completedAt ? new Date((step as Record<string, unknown>).completedAt as string) : undefined
      }));
    }
    return parsed;
  } catch {
    return null;
  }
};

const STORAGE_KEY = 'guidedModeState';

export function useGuidedMode(): UseGuidedModeReturn {
  const isInitializedRef = useRef(false);

  // Initialize with default values to avoid hydration mismatch
  const [activeProject, setActiveProject] = useState<GuidedProject | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [lastCompletedStep, setLastCompletedStep] = useState<string | null>(null);
  const [isCurrentStepReady, setIsCurrentStepReady] = useState(false);

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    const savedProject = localStorage.getItem(STORAGE_KEY);
    const savedStepIndex = localStorage.getItem(`${STORAGE_KEY}_stepIndex`);
    const savedMinimized = localStorage.getItem(`${STORAGE_KEY}_minimized`);

    if (savedProject) {
      const deserialized = deserializeProject(savedProject);
      if (deserialized) {
        // Verify integrity before loading
        if (deserialized.integrityHash && !verifyGuidedIntegrity(deserialized)) {
          console.error('Guided mode integrity compromised! Resetting progress...');
          // Tampering detected, don't load the saved state
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(`${STORAGE_KEY}_stepIndex`);
          localStorage.removeItem(`${STORAGE_KEY}_minimized`);
          isInitializedRef.current = true;
          return;
        }
        setActiveProject(deserialized);
      }
    }
    if (savedStepIndex) {
      setCurrentStepIndex(parseInt(savedStepIndex, 10));
    }
    if (savedMinimized) {
      setIsPanelMinimized(savedMinimized === 'true');
    }

    isInitializedRef.current = true;
  }, []);

  // Save to localStorage whenever state changes (only after mount and initialization)
  useEffect(() => {
    if (!isInitializedRef.current) return;

    if (activeProject) {
      localStorage.setItem(STORAGE_KEY, serializeProject(activeProject));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeProject]);

  useEffect(() => {
    if (!isInitializedRef.current) return;
    localStorage.setItem(`${STORAGE_KEY}_stepIndex`, currentStepIndex.toString());
  }, [currentStepIndex]);

  useEffect(() => {
    if (!isInitializedRef.current) return;
    localStorage.setItem(`${STORAGE_KEY}_minimized`, isPanelMinimized.toString());
  }, [isPanelMinimized]);

  const isGuidedModeActive = activeProject !== null;

  // Calculate derived state
  const progress = useMemo(() => {
    if (!activeProject || activeProject.steps.length === 0) return 0;
    return Math.round((getCompletedStepsCount(activeProject.steps) / activeProject.steps.length) * 100);
  }, [activeProject]);

  const completedCount = useMemo(() => {
    if (!activeProject) return 0;
    return getCompletedStepsCount(activeProject.steps);
  }, [activeProject]);

  const totalSteps = useMemo(() => {
    return activeProject?.steps.length || 0;
  }, [activeProject]);

  const totalPoints = useMemo(() => {
    if (!activeProject) return 0;
    return activeProject.steps.reduce((acc, step) => acc + (step.points || 0), 0);
  }, [activeProject]);

  const currentPoints = useMemo(() => {
    if (!activeProject) return 0;
    return activeProject.steps
      .filter(s => s.completed)
      .reduce((acc, step) => acc + (step.points || 0), 0);
  }, [activeProject]);

  const isAllCompleted = useMemo(() => {
    if (!activeProject) return false;
    return completedCount === totalSteps;
  }, [activeProject, completedCount, totalSteps]);

  // Auto-advance to next incomplete step when steps change
  useEffect(() => {
    if (!activeProject) return;
    
    // Find the next incomplete step
    const nextIndex = activeProject.steps.findIndex(s => !s.completed);
    if (nextIndex !== -1 && nextIndex !== currentStepIndex) {
      setTimeout(() => setCurrentStepIndex(nextIndex), 0);
      setTimeout(() => setIsCurrentStepReady(false), 0); // Reset readiness when moving to new step
    }
  }, [activeProject?.steps, activeProject, currentStepIndex]);

  const startGuidedProject = useCallback((project: GuidedProject) => {
    // Reset all steps to incomplete
    const freshProject: GuidedProject = {
      ...project,
      steps: project.steps.map(s => ({ ...s, completed: false, completedAt: undefined })),
      startedAt: new Date()
    };
    freshProject.integrityHash = generateGuidedIntegrityHash(freshProject);
    setActiveProject(freshProject);
    setCurrentStepIndex(0);
    setIsPanelMinimized(false);
    setLastCompletedStep(null);
    setIsCurrentStepReady(false);
  }, []);

  const completeStep = useCallback((stepId: string) => {
    if (!activeProject) return;

    let points = 0;
    setActiveProject(prev => {
      if (!prev) return null;

      const step = prev.steps.find(s => s.id === stepId);
      points = step?.points || 0;

      const updatedSteps = prev.steps.map(s =>
        s.id === stepId ? { ...s, completed: true, completedAt: new Date() } : s
      );

      const updated: GuidedProject = {
        ...prev,
        steps: updatedSteps
      };
      updated.integrityHash = generateGuidedIntegrityHash(updated);
      return updated;
    });

    setLastCompletedStep(stepId);

    // Auto-expand panel when step completes
    setIsPanelMinimized(false);

    // Dispatch celebration event with points
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('guided-step-completed', { detail: { points } }));
    }
  }, [activeProject]);

  const uncompleteStep = useCallback((stepId: string) => {
    if (!activeProject) return;

    setActiveProject(prev => {
      if (!prev) return null;
      
      const stepIndex = prev.steps.findIndex(s => s.id === stepId);
      const updatedSteps = prev.steps.map((s, idx) => {
        // Uncomplete this step and all subsequent steps
        if (idx >= stepIndex) {
          return { ...s, completed: false };
        }
        return s;
      });
      
      // Move current index to the uncompleted step
      setCurrentStepIndex(stepIndex);
      
      const updated: GuidedProject = {
        ...prev,
        steps: updatedSteps
      };
      updated.integrityHash = generateGuidedIntegrityHash(updated);
      return updated;
    });

    setLastCompletedStep(null);
    setIsCurrentStepReady(false);
  }, [activeProject]);

  const skipStep = useCallback(() => {
    if (!activeProject) return;
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < activeProject.steps.length) {
      setCurrentStepIndex(nextIndex);
    }
  }, [activeProject, currentStepIndex]);

  const goToStep = useCallback((index: number) => {
    if (!activeProject) return;
    if (index >= 0 && index < activeProject.steps.length) {
      setCurrentStepIndex(index);
    }
  }, [activeProject]);

  const closeGuidedMode = useCallback(() => {
    setActiveProject(null);
    setCurrentStepIndex(0);
    setIsPanelMinimized(false);
    setLastCompletedStep(null);
  }, []);

  const togglePanelMinimize = useCallback(() => {
    setIsPanelMinimized(prev => !prev);
  }, []);

  const expandPanel = useCallback(() => {
    setIsPanelMinimized(false);
  }, []);

  const checkStepCompletionWithContext = useCallback((context: {
    lastCommand?: string;
    lastOutput?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: unknown;
    deviceStates?: Map<string, unknown>;
    topologyConnections?: unknown[];
    topologyDevices?: unknown[];
  }) => {
    if (!activeProject) {
      setIsCurrentStepReady(false);
      return;
    }

    const currentStep = activeProject.steps[currentStepIndex];
    if (!currentStep || currentStep.completed) {
      setIsCurrentStepReady(false);
      return;
    }

    const shouldComplete = checkStepCompletion(currentStep, context as Parameters<typeof checkStepCompletion>[1]);
    setIsCurrentStepReady(shouldComplete);
    
    if (shouldComplete) {
      completeStep(currentStep.id);
    }
  }, [activeProject, currentStepIndex, completeStep, setIsCurrentStepReady]);

  const getAvailableProjects = useCallback((language: 'tr' | 'en') => {
    return getGuidedProjects(language);
  }, []);

  return {
    activeProject,
    currentStepIndex,
    isGuidedModeActive,
    isPanelMinimized,
    lastCompletedStep,
    startGuidedProject,
    completeStep,
    uncompleteStep,
    skipStep,
    goToStep,
    closeGuidedMode,
    togglePanelMinimize,
    expandPanel,
    checkStepCompletionWithContext,
    isCurrentStepReady,
    progress,
    completedCount,
    totalSteps,
    currentPoints,
    totalPoints,
    isAllCompleted,
    getAvailableProjects
  };
}


