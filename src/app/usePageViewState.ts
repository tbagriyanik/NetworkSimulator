'use client';

import { useState, useCallback, useEffect } from 'react';
import type { CableInfo } from '@/lib/network/types';
import type { ExampleProject, ExampleProjectLevel } from '@/lib/network/exampleProjects';

export function usePageViewState(language: 'tr' | 'en') {
  const [topologyKey, setTopologyKey] = useState(0);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [lastOutput, setLastOutput] = useState<string>('');

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showBasarilarim, setShowBasarilarim] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  const [sessionStart] = useState(() => Date.now());
  const [focusedOverlay, setFocusedOverlay] = useState<'refresh' | 'packet' | 'pc-info' | 'router-info' | 'switch-info'>('packet');

  const [cableInfo, setCableInfo] = useState<CableInfo>({
    connected: true,
    cableType: 'straight',
    sourceDevice: 'pc',
    targetDevice: 'switchL2',
  });
  const [lastTaskEvent, setLastTaskEvent] = useState<{ type: 'completed' | 'failed'; taskName: string; timestamp: number } | null>(null);
  const [isPingPanelOpen, setIsPingPanelOpen] = useState(false);
  const [isExamLoadedFromFile, setIsExamLoadedFromFile] = useState(false);
  const [isTimelineMinimized, setIsTimelineMinimized] = useState(true);
  const toggleTimelineMinimize = useCallback(() => setIsTimelineMinimized(prev => !prev), []);

  const [saveDialog, setSaveDialog] = useState<{
    show: boolean;
    message: string;
    onConfirm: (save: boolean) => void;
  } | null>(null);

  const [groupedExampleProjects, setGroupedExampleProjects] = useState<Record<ExampleProjectLevel, ExampleProject[]>>(
    () => ({ basic: [], intermediate: [], advanced: [] })
  );

  useEffect(() => {
    import('@/lib/network/exampleProjects').then(({ exampleProjects }) => {
      const grouping: Record<ExampleProjectLevel, ExampleProject[]> = { basic: [], intermediate: [], advanced: [] };
      exampleProjects(language).forEach((project) => grouping[project.level].push(project));
      setGroupedExampleProjects(grouping);
    });
  }, [language]);

  return {
    topologyKey,
    setTopologyKey,
    lastCommand,
    setLastCommand,
    lastOutput,
    setLastOutput,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    lastSaveTime,
    setLastSaveTime,
    projectSearchQuery,
    setProjectSearchQuery,
    showBasarilarim,
    setShowBasarilarim,
    isGeneratorOpen,
    setIsGeneratorOpen,
    sessionStart,
    focusedOverlay,
    setFocusedOverlay,
    cableInfo,
    setCableInfo,
    lastTaskEvent,
    setLastTaskEvent,
    isPingPanelOpen,
    setIsPingPanelOpen,
    isExamLoadedFromFile,
    setIsExamLoadedFromFile,
    isTimelineMinimized,
    setIsTimelineMinimized,
    toggleTimelineMinimize,
    saveDialog,
    setSaveDialog,
    groupedExampleProjects,
    setGroupedExampleProjects,
  };
}
