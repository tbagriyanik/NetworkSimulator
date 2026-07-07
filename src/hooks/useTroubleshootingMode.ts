import { useState, useMemo, useEffect, useRef } from 'react';
import { SwitchState } from '@/lib/network/types';
import { checkFaultResolved } from '@/lib/network/faults';
import { addGuidedLessonRecord } from '@/utils/achievementRecords';
import { ExamProject } from '@/lib/network/examMode';
import { ExampleProject, ExampleProjectLevel } from '@/lib/network/exampleProjects';

interface UseTroubleshootingModeProps {
  activeExam: ExamProject | null;
  loadedExampleId: string | null;
  exampleLevelOrder: ExampleProjectLevel[];
  groupedExampleProjects: Record<string, ExampleProject[]>;
  deviceStates: Map<string, SwitchState>;
  language: string;
  toast: (props: { title: string; description: string; variant: 'default' | 'destructive' }) => void;
}

export function useTroubleshootingMode({
  activeExam,
  loadedExampleId,
  exampleLevelOrder,
  groupedExampleProjects,
  deviceStates,
  language,
  toast
}: UseTroubleshootingModeProps) {
  const resolvedFaultsProjectRef = useRef<string | null>(null);

  const activeTroubleshootingProject = useMemo(() => {
    if (activeExam && activeExam.injectedFaults && activeExam.injectedFaults.length > 0) {
      return activeExam;
    }

    if (!loadedExampleId) return null;
    for (const level of exampleLevelOrder) {
      const projects = groupedExampleProjects[level as ExampleProjectLevel];
      if (projects) {
        const found = projects.find(p => p.id === loadedExampleId);
        if (found && found.injectedFaults && found.injectedFaults.length > 0) {
          return found;
        }
      }
    }
    return null;
  }, [activeExam, loadedExampleId, groupedExampleProjects, exampleLevelOrder]);

  const [isTroubleshootingMinimized, setIsTroubleshootingMinimized] = useState(false);
  const [showTroubleshootingPanel, setShowTroubleshootingPanel] = useState(true);

  useEffect(() => {
    if (!deviceStates || deviceStates.size === 0) return;
    if (resolvedFaultsProjectRef.current === loadedExampleId) return;

    if (activeTroubleshootingProject) {
      setTimeout(() => setShowTroubleshootingPanel(true), 0);
      let allResolved = true;
      for (const fault of (activeTroubleshootingProject.injectedFaults || [])) {
        const state = deviceStates.get(fault.deviceId);
        if (!state) {
          allResolved = false;
          break;
        }
        if (!checkFaultResolved(state, fault)) {
          allResolved = false;
          break;
        }
      }

      if (allResolved) {
        resolvedFaultsProjectRef.current = loadedExampleId;
        
        // Use setTimeout to avoid calling toast directly in effect, preventing cascading issues
        setTimeout(() => {
          toast({
            title: language === 'tr' ? 'Tebrikler!' : 'Congratulations!',
            description: language === 'tr' ? 'Tüm arızaları başarıyla giderdiniz!' : 'You successfully resolved all faults!',
            variant: 'default',
          });
          
          const projectNameStr = typeof activeTroubleshootingProject.title === 'string' 
            ? activeTroubleshootingProject.title 
            : (activeTroubleshootingProject.title as { tr?: string; en?: string })?.tr || (activeTroubleshootingProject.title as { tr?: string; en?: string })?.en || 'Troubleshooting Project';
            
          addGuidedLessonRecord(projectNameStr, 100, 100);
        }, 100);
      }
    }
  }, [deviceStates, loadedExampleId, activeTroubleshootingProject, language, toast]);

  return {
    isTroubleshootingMinimized,
    setIsTroubleshootingMinimized,
    showTroubleshootingPanel,
    setShowTroubleshootingPanel,
    activeTroubleshootingProject
  };
}
