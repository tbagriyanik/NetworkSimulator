'use client';

import { useCallback } from 'react';
import type { ExamProject } from '@/lib/network/examMode';
import { decryptExamData, verifyExamIntegrity } from '@/lib/network/examMode';
import { safeParse } from '@/lib/network/serialization';
import { formatErrorForUser, errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';
import { addProjectRecord } from '../utils/achievementRecords';

import { useAppStore } from '@/lib/store/appStore';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export function useLoadProject({
  loadProjectData,
  setHasUnsavedChanges,
  setProjectName,
  closeGuidedMode,
  closeExam,
  setRefreshNetworkReport,
  setIsExamLoadedFromFile,
  startExamProject,
  resetToEmptyProject,
  hasUnsavedChanges,
  handleSaveProject,
  setSaveDialog,
  language,
  t,
  toast,
}: {
  loadProjectData: (data: unknown) => boolean;
  setHasUnsavedChanges: (v: boolean) => void;
  setProjectName: (v: string) => void;
  closeGuidedMode: () => void;
  closeExam: () => void;
  setRefreshNetworkReport: (v: null) => void;
  setIsExamLoadedFromFile: (v: boolean) => void;
  startExamProject: (project: ExamProject) => void;
  resetToEmptyProject: () => void;
  hasUnsavedChanges: boolean;
  handleSaveProject: () => void;
  setSaveDialog: (v: { show: boolean; message: string; onConfirm: (save: boolean) => void } | null) => void;
  language: string;
  t: Record<string, string>;
  toast: (params: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}) {
  const setZoom = useAppStore((state) => state.setZoom);
  const setPan = useAppStore((state) => state.setPan);
  const handleLoadProject = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    closeExam();
    event.target.value = '';

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: language === 'tr' ? 'Dosya Çok Büyük' : 'File Too Large',
        description: language === 'tr' ? 'Maksimum yükleme boyutu 10 MB\'dir.' : 'Maximum file load size is 10 MB.',
        variant: 'destructive',
      });
      return;
    }

    const doLoad = () => {
      // Fully tear down the previously loaded project (memory + localStorage)
      // before loading the new one.
      resetToEmptyProject();
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
              
              // Verify exam integrity hash if present
              if (exam.integrityHash && !verifyExamIntegrity(exam)) {
                toast({
                  title: language === 'tr' ? 'Uyarı: Dosya Değiştirilmiş Olabilir' : 'Warning: File Integrity Alert',
                  description: language === 'tr' ? 'Sınav dosyasının bütünlük doğrulaması başarısız oldu.' : 'Exam file integrity check failed.',
                  variant: 'destructive',
                });
              }

              setIsExamLoadedFromFile(true);
              closeGuidedMode();
              startExamProject(exam);
              loadProjectData(exam.data);
              const examTitleStr = typeof exam.title === 'string'
                ? exam.title
                : (language === 'tr' ? exam.title.tr : exam.title.en);

              setHasUnsavedChanges(false);
              setProjectName(examTitleStr);
              toast({
                title: language === 'tr' ? 'Sınav Modu Başlatıldı' : 'Exam Mode Started',
                description: examTitleStr,
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
            toast({
              title: t.invalidProjectFile,
              description: t.invalidProjectFile,
              variant: "destructive",
            });
          }
        } catch (error) {
          const errMessage = error instanceof Error ? error.message : String(error);
          errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'fileUpload', error: errMessage }));
          toast({
            title: t.loadFailed || (language === 'tr' ? 'Yükleme Başarısız' : 'Load Failed'),
            description: formatErrorForUser(error as Error, t.failedLoadProject || (language === 'tr' ? 'Proje dosyası okunamadı' : 'Failed to load project')).userMessage,
            variant: "destructive",
          });
        } finally {
          document.body.style.cursor = '';
        }
      };
      reader.onerror = () => {
        document.body.style.cursor = '';
        toast({
          title: t.loadFailed || (language === 'tr' ? 'Yükleme Başarısız' : 'Load Failed'),
          description: t.failedLoadProject || (language === 'tr' ? 'Proje dosyası okunamadı' : 'Failed to load project'),
          variant: "destructive",
        });
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
  }, [loadProjectData, setHasUnsavedChanges, t.invalidProjectFile, t.failedLoadProject, language, setZoom, setPan, closeGuidedMode, closeExam, setProjectName, hasUnsavedChanges, handleSaveProject, setSaveDialog, t.unsavedChangesConfirm, startExamProject, toast, setRefreshNetworkReport, setIsExamLoadedFromFile, resetToEmptyProject]);

  return handleLoadProject;
}
