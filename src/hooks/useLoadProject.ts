'use client';

import { useCallback } from 'react';
import type { ExamProject } from '@/lib/network/examMode';
import { decryptExamData } from '@/lib/network/examMode';
import { safeParse } from '@/lib/network/serialization';
import { formatErrorForUser, errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';
import { addProjectRecord } from '@/utils/achievementRecords';

export function useLoadProject({
  loadProjectData,
  setHasUnsavedChanges,
  setZoom,
  setPan,
  setProjectName,
  closeGuidedMode,
  closeExam,
  setRefreshNetworkReport,
  setIsExamLoadedFromFile,
  startExamProject,
  hasUnsavedChanges,
  handleSaveProject,
  setSaveDialog,
  language,
  t,
  toast,
}: {
  loadProjectData: (data: unknown) => boolean;
  setHasUnsavedChanges: (v: boolean) => void;
  setZoom: (v: number) => void;
  setPan: (v: { x: number; y: number }) => void;
  setProjectName: (v: string) => void;
  closeGuidedMode: () => void;
  closeExam: () => void;
  setRefreshNetworkReport: (v: null) => void;
  setIsExamLoadedFromFile: (v: boolean) => void;
  startExamProject: (project: ExamProject) => void;
  hasUnsavedChanges: boolean;
  handleSaveProject: () => void;
  setSaveDialog: (v: { show: boolean; message: string; onConfirm: (save: boolean) => void } | null) => void;
  language: string;
  t: Record<string, string>;
  toast: (params: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}) {
  const handleLoadProject = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    closeExam();
    event.target.value = '';

    const doLoad = () => {
      document.body.style.cursor = 'wait';
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let projectData: unknown;

          if (file.name.endsWith('.exam')) {
            projectData = decryptExamData(content);
            if (projectData) {
              const exam = projectData as ExamProject;
              setIsExamLoadedFromFile(true);
              closeGuidedMode();
              startExamProject(exam);
              loadProjectData(exam.data);
              setHasUnsavedChanges(false);
              setProjectName((exam.title as unknown as { en: string }).en);
              document.body.style.cursor = '';
              toast({
                title: language === 'tr' ? 'S\u0131nav Modu Ba\u015Flat\u0131ld\u0131' : 'Exam Mode Started',
                description: (exam.title as unknown as { tr: string; en: string })[language === 'tr' ? 'tr' : 'en'],
              });
              return;
            }
          }

          projectData = safeParse<unknown>(content);
          if (loadProjectData(projectData)) {
            setHasUnsavedChanges(false);
            const loadedName = file.name.replace(/\.[^/.]+$/, '');
            setProjectName(loadedName);
            closeGuidedMode();
            closeExam();
            setRefreshNetworkReport(null);
            addProjectRecord(loadedName);
            document.body.style.cursor = '';
            toast({
              title: `"${loadedName}" ${language === 'tr' ? 'projesi y\u00FCklendi' : 'project loaded'}`,
              description: t.fileImportedSuccessfully,
            });
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
            if (typeof window !== 'undefined') {
              window.scrollTo(0, 0);
            }
          } else {
            document.body.style.cursor = '';
            toast({
              title: t.invalidProjectFile,
              description: t.invalidProjectFile,
              variant: "destructive",
            });
          }
        } catch (error) {
          document.body.style.cursor = '';
          errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'fileUpload', error: String(error) }));
          toast({
            title: t.loadFailed,
            description: formatErrorForUser(error as Error, t.failedLoadProject).userMessage,
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    };

    if (hasUnsavedChanges) {
      setSaveDialog({
        show: true,
        message: t.unsavedChangesConfirm,
        onConfirm: (save: boolean) => {
          setSaveDialog(null);
          if (save) handleSaveProject();
          doLoad();
        }
      });
      return;
    }
    doLoad();
  }, [loadProjectData, setHasUnsavedChanges, t.invalidProjectFile, t.failedLoadProject, language, setZoom, setPan, closeGuidedMode, closeExam, setProjectName, hasUnsavedChanges, handleSaveProject, setSaveDialog, t.unsavedChangesConfirm, startExamProject, toast, setRefreshNetworkReport, setIsExamLoadedFromFile]);

  return handleLoadProject;
}
