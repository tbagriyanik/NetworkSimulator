'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { FolderOpen, X, BookOpen, Clock, Target, Search, Sparkles, File, FilePlus } from 'lucide-react';
import type { Translations } from '@/contexts/LanguageContext';
import type { ExampleProject, ExampleProjectLevel } from '@/lib/network/exampleProjects';
import type { GuidedProject } from '@/lib/network/guidedMode';
import type { ExamProject } from '@/lib/network/examMode';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GraduationCap } from 'lucide-react';

interface ProjectPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: Translations;
  isDark: boolean;
  language: 'tr' | 'en';
  projectPickerTab: 'all' | 'guided' | 'exam';
  setProjectPickerTab: (tab: 'all' | 'guided' | 'exam') => void;
  projectSearchQuery: string;
  setProjectSearchQuery: (q: string) => void;
  groupedExampleProjects: Record<ExampleProjectLevel, ExampleProject[]>;
  exampleLevelLabels: Record<ExampleProjectLevel, string>;
  exampleLevelHints: Record<ExampleProjectLevel, string>;
  exampleLevelOrder: ExampleProjectLevel[];
  getAvailableProjects: (lang: 'tr' | 'en') => GuidedProject[];
  getAvailableExams: (lang: 'tr' | 'en') => ExamProject[];
  resetToEmptyProject: () => void;
  applyExampleProject: (data: unknown, exampleId?: string) => void;
  applyExampleProjectAsTemplate: (data: unknown, exampleId?: string) => void;
  startGuidedProject: (project: GuidedProject) => void;
  startExamProject: (project: ExamProject) => void;
  loadProjectData: (data: unknown) => boolean;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  closeProjectPicker: () => void;
  onOpenFile: () => void;
  onConvertProjectToExam: (projectData: unknown) => void;
}

export function ProjectPickerDialog({
  open, onOpenChange, t, isDark, language,
  projectPickerTab, setProjectPickerTab,
  projectSearchQuery, setProjectSearchQuery,
  groupedExampleProjects, exampleLevelLabels, exampleLevelHints, exampleLevelOrder,
  getAvailableProjects, getAvailableExams,
  resetToEmptyProject, applyExampleProject, applyExampleProjectAsTemplate,
  startGuidedProject, startExamProject, loadProjectData,
  setZoom, setPan,
  closeProjectPicker,
  onOpenFile,
  onConvertProjectToExam,
}: ProjectPickerDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const convertInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => setSelectedProjectId(null), 0);
  }, [open, projectPickerTab, projectSearchQuery]);

  const visibleProjectIds = useMemo<string[]>(() => {
    const result: string[] = [];
    if (projectPickerTab === 'guided') {
      const q = projectSearchQuery.trim().toLowerCase();
      const guidedProjects = getAvailableProjects(language);
      guidedProjects.forEach((gp) => {
        const match = q === '' ||
          gp.title.toLowerCase().includes(q) ||
          gp.description.toLowerCase().includes(q) ||
          gp.tag.toLowerCase().includes(q) ||
          (gp.detail && gp.detail.toLowerCase().includes(q));
        if (match) result.push(gp.id);
      });
    } else if (projectPickerTab === 'exam') {
      const q = projectSearchQuery.trim().toLowerCase();
      const examProjects = getAvailableExams(language).filter((ep: ExamProject) => ep.id !== 'exam-template-blank');
      examProjects.forEach((ep) => {
        const match = q === '' ||
          ep.title.toLowerCase().includes(q) ||
          ep.description.toLowerCase().includes(q) ||
          ep.tag.toLowerCase().includes(q) ||
          (ep.detail && ep.detail.toLowerCase().includes(q));
        if (match) result.push(ep.id);
      });
    } else {
      const q = projectSearchQuery.trim().toLowerCase();
      let counter = 0;
      for (const lvl of exampleLevelOrder) {
        const projects = groupedExampleProjects[lvl];
        if (!projects) continue;
        for (const project of projects) {
          counter++;
          const match = q === '' ||
            project.title.toLowerCase().includes(q) ||
            project.description.toLowerCase().includes(q) ||
            project.tag.toLowerCase().includes(q) ||
            (project.detail && project.detail.toLowerCase().includes(q)) ||
            String(counter).includes(q);
          if (match) result.push(project.id);
        }
      }
    }
    return result;
  }, [projectPickerTab, projectSearchQuery, language, getAvailableProjects, groupedExampleProjects, exampleLevelOrder]);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (visibleProjectIds.length === 0) return;
      const direction = e.shiftKey ? -1 : 1;
      const currentIdx = selectedProjectId ? visibleProjectIds.indexOf(selectedProjectId) : -1;
      const nextIdx = currentIdx < 0
        ? (direction > 0 ? 0 : visibleProjectIds.length - 1)
        : (currentIdx + direction + visibleProjectIds.length) % visibleProjectIds.length;
      const nextId = visibleProjectIds[nextIdx];
      setSelectedProjectId(nextId);
      scrollRef.current?.querySelector(`[data-project-id="${CSS.escape(nextId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (e.key === 'Enter') {
      const targetId = selectedProjectId || (visibleProjectIds.length > 0 ? visibleProjectIds[0] : null);
      if (targetId) {
        e.preventDefault();
        (scrollRef.current?.querySelector(`[data-project-id="${CSS.escape(targetId)}"]`) as HTMLButtonElement | null)?.click();
      }
    }
  }, [visibleProjectIds, selectedProjectId]);

  useEffect(() => {
    if (!open) return;

    const handleGlobalTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      e.stopPropagation();
      if (visibleProjectIds.length === 0) return;

      const direction = e.shiftKey ? -1 : 1;
      const currentIdx = selectedProjectId ? visibleProjectIds.indexOf(selectedProjectId) : -1;
      const nextIdx = currentIdx < 0
        ? (direction > 0 ? 0 : visibleProjectIds.length - 1)
        : (currentIdx + direction + visibleProjectIds.length) % visibleProjectIds.length;
      const nextId = visibleProjectIds[nextIdx];
      setSelectedProjectId(nextId);
      scrollRef.current?.querySelector(`[data-project-id="${CSS.escape(nextId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    window.addEventListener('keydown', handleGlobalTab, true);
    return () => window.removeEventListener('keydown', handleGlobalTab, true);
  }, [open, visibleProjectIds, selectedProjectId]);

  useEffect(() => {
    if (!open) return;

    const handleGlobalEnter = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'BUTTON' || activeEl.tagName === 'A') && activeEl !== document.body) {
        if (!activeEl.getAttribute('data-project-id')) {
          return;
        }
      }

      const targetId = selectedProjectId || (visibleProjectIds.length > 0 ? visibleProjectIds[0] : null);
      if (targetId) {
        e.preventDefault();
        e.stopPropagation();
        const btn = scrollRef.current?.querySelector(`[data-project-id="${CSS.escape(targetId)}"]`) as HTMLButtonElement | null;
        if (btn) {
          btn.click();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalEnter, true);
    return () => window.removeEventListener('keydown', handleGlobalEnter, true);
  }, [open, visibleProjectIds, selectedProjectId]);

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) setProjectSearchQuery(''); }}>
      <DialogContent className={`${isDark ? 'bg-secondary-900 border-success-500/30' : 'bg-white border-success-500'} sm:max-w-2xl md:max-w-3xl w-[98vw] max-w-[1400px] h-[90vh] md:h-[95vh] max-h-[90vh] md:max-h-[1000px] p-0 overflow-hidden flex flex-col shadow-2xl rounded-none md:rounded-3xl liquid-glass-light`}>
        <div className='flex flex-col flex-1 overflow-hidden h-full max-w-full'>
          <div className='p-4 md:p-8 pb-2 md:pb-4 space-y-4'>
            <DialogHeader className='rounded-2xl md:rounded-3xl border border-transparent bg-gradient-to-r p-4 md:p-6 flex items-start md:items-center justify-between flex-col md:flex-row gap-4'>
              <div className="flex items-center justify-between w-full">
                <DialogTitle className='text-xl bg-gradient-to-br from-white to-secondary-900 bg-clip-text text-transparent break-words'>{t.openNewProject}</DialogTitle>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 h-8 ${isDark ? 'text-secondary-200 border-secondary-700 hover:bg-secondary-800 hover:text-accent-400' : 'text-secondary-700 border-secondary-300 hover:bg-secondary-100 hover:text-accent-600'}`}
                    onClick={() => { closeProjectPicker(); resetToEmptyProject(); }}
                  >
                    <File className="w-3.5 h-3.5" />
                    {t.emptyProject}
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 h-8 ${isDark ? 'text-accent-300 border-accent-700/50 hover:bg-accent-900/30 hover:text-accent-300' : 'text-accent-600 border-accent-300 hover:bg-accent-50 hover:text-accent-700'}`}
                    onClick={() => {
                      closeProjectPicker();
                      onOpenFile();
                    }}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    {language === 'tr' ? 'Dosya Aç' : 'Open File'}
                  </Button>
                </div>
              </div>

              <div className='flex items-center gap-2 w-full md:w-auto justify-end'>
                <Button
                  variant='outline'
                  size='sm'
                  className={`flex-1 md:flex-initial flex items-center gap-2 text-xs px-3 py-1.5 h-8 ${isDark ? 'text-error-300 border-error-700/50 hover:bg-error-900/30 hover:text-error-300' : 'text-error-600 border-error-300 hover:bg-error-50 hover:text-error-700'}`}
                  onClick={() => {
                    const examTemplate = getAvailableExams(language).find((ep: ExamProject) => ep.id === 'exam-template-blank');
                    if (examTemplate) {
                      closeProjectPicker();
                      startExamProject(examTemplate);
                      loadProjectData(examTemplate.data);
                    }
                  }}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  {t.examTemplate}
                </Button>
                <input
                  type="file"
                  ref={convertInputRef}
                  className="hidden"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const projectData = JSON.parse(event.target?.result as string);
                        closeProjectPicker();
                        onConvertProjectToExam(projectData);
                      } catch (err) {
                        logger.error('Failed to parse project data for conversion', err);
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant='outline'
                  size='sm'
                  className={`flex-1 md:flex-initial flex items-center gap-2 text-xs px-3 py-1.5 h-8 ${isDark ? 'text-purple-300 border-purple-700/50 hover:bg-purple-900/30 hover:text-purple-300' : 'text-purple-600 border-purple-300 hover:bg-purple-50 hover:text-purple-700'}`}
                  onClick={() => convertInputRef.current?.click()}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t.convertProjectToExam}
                </Button>
              </div>
              <DialogDescription className="sr-only">
                {language === 'tr'
                  ? 'Yeni proje penceresi: boş projeyle başlayın veya hazır örneklerden birini seçin.'
                  : 'New project dialog: start with an empty project or choose one of the ready examples.'}
              </DialogDescription>
            </DialogHeader>

            {/* Tab Buttons */}
            <div className={`flex items-end gap-0.5 md:gap-1 border-b overflow-x-auto flex-nowrap no-scrollbar ${isDark ? 'border-secondary-700/50' : 'border-secondary-200'}`}>
              <button
                onClick={() => setProjectPickerTab('all')}
                className={cn(
                  'relative inline-flex items-center gap-1.5 md:gap-2 rounded-t-lg border border-b-0 px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-sm font-semibold transition-all duration-200 ease-out focus-ring-animate flex-shrink-0',
                  projectPickerTab === 'all'
                    ? isDark
                      ? 'bg-secondary-900 text-primary-400 border-secondary-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
                      : 'bg-white text-primary-600 border-secondary-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
                    : isDark
                      ? 'bg-secondary-950/40 text-secondary-400 border-transparent hover:text-secondary-200 hover:bg-secondary-900/60'
                      : 'bg-secondary-100/80 text-secondary-500 border-transparent hover:text-secondary-700 hover:bg-secondary-50'
                )}
                role="tab"
                aria-selected={projectPickerTab === 'all'}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="tracking-wide text-xs">{t.allProjects}</span>
              </button>
              <button
                onClick={() => setProjectPickerTab('guided')}
                className={cn(
                  'relative inline-flex items-center gap-1.5 md:gap-2 rounded-t-lg border border-b-0 px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-sm font-semibold transition-all duration-200 ease-out focus-ring-animate flex-shrink-0',
                  projectPickerTab === 'guided'
                    ? isDark
                      ? 'bg-secondary-900 text-success-400 border-secondary-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
                      : 'bg-white text-success-600 border-secondary-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
                    : isDark
                      ? 'bg-secondary-950/40 text-secondary-400 border-transparent hover:text-secondary-200 hover:bg-secondary-900/60'
                      : 'bg-secondary-100/80 text-secondary-500 border-transparent hover:text-secondary-700 hover:bg-secondary-50'
                )}
                role="tab"
                aria-selected={projectPickerTab === 'guided'}
              >
                <BookOpen className="w-4 h-4" />
                <span className="tracking-wide text-xs">{t.guidedMode}</span>
              </button>
              <button
                onClick={() => setProjectPickerTab('exam')}
                className={cn(
                  'relative inline-flex items-center gap-1.5 md:gap-2 rounded-t-lg border border-b-0 px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-sm font-semibold transition-all duration-200 ease-out focus-ring-animate flex-shrink-0',
                  projectPickerTab === 'exam'
                    ? isDark
                      ? 'bg-secondary-900 text-error-400 border-secondary-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
                      : 'bg-white text-error-600 border-secondary-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
                    : isDark
                      ? 'bg-secondary-950/40 text-secondary-400 border-transparent hover:text-secondary-200 hover:bg-secondary-900/60'
                      : 'bg-secondary-100/80 text-secondary-500 border-transparent hover:text-secondary-700 hover:bg-secondary-50'
                )}
                role="tab"
                aria-selected={projectPickerTab === 'exam'}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="tracking-wide text-xs">{t.exam}</span>
              </button>
            </div>

            {/* Search Box */}
            <div className={`relative rounded-xl border px-4 py-2.5 flex items-center gap-2 ${isDark ? 'bg-secondary-900/40 border-secondary-800/60' : 'bg-white/50 border-secondary-200/60'}`}>
              <Search className="w-4 h-4 text-secondary-400" />
              <input
                type="text"
                value={projectSearchQuery}
                placeholder={language === 'tr' ? 'Ara...' : 'Search...'}
                aria-label={t.searchProjects}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                autoFocus
                className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-secondary-500' : 'text-secondary-900 placeholder-secondary-400'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const targetId = selectedProjectId || (visibleProjectIds.length > 0 ? visibleProjectIds[0] : null);
                    if (targetId) {
                      e.preventDefault();
                      (scrollRef.current?.querySelector(`[data-project-id="${CSS.escape(targetId)}"]`) as HTMLButtonElement | null)?.click();
                    }
                  }
                }}
              />
              {projectSearchQuery && (
                <button
                  onClick={() => setProjectSearchQuery('')}
                  className="p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div
            ref={scrollRef}
            tabIndex={0}
            onKeyDown={handleGridKeyDown}
            className='flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-12 pb-12 custom-scrollbar focus:outline-none focus:ring-2 focus:ring-accent-400/50 focus:ring-inset'
          >
            <div className='flex flex-col gap-12 max-w-full'>
              {/* Guided Mode Projects Section */}
              {projectPickerTab === 'guided' && (
                <div className='flex flex-col gap-8'>
                  <section className='space-y-4 md:space-y-6 w-full'>
                    <div className='flex items-center gap-3 md:gap-4 px-1 md:px-2'>
                      <p className='text-[10px] md:text-xs font-black tracking-[0.3em] md:tracking-[0.4em] text-success-500 dark:text-success-400 whitespace-nowrap'>
                        {language === 'tr' ? 'Rehberli Dersler' : 'Guided Lessons'}
                      </p>
                      <p className={`text-[10px] md:text-xs ${isDark ? 'text-secondary-500' : 'text-secondary-500'} truncate`}>
                        {language === 'tr' ? 'Adım adım öğrenme deneyimi' : 'Step-by-step learning experience'}
                      </p>
                      <div className={`h-px flex-1 ${isDark ? 'bg-success-800/60' : 'bg-success-200'}`} />
                    </div>

                    <div className='grid grid-cols-1 gap-6 w-full max-w-full'>
                      {getAvailableProjects(language)
                        .filter((guidedProject, idx) => {
                          const q = projectSearchQuery.trim().toLowerCase();
                          return q === '' ||
                            guidedProject.title.toLowerCase().includes(q) ||
                            guidedProject.description.toLowerCase().includes(q) ||
                            guidedProject.tag.toLowerCase().includes(q) ||
                            (guidedProject.detail && guidedProject.detail.toLowerCase().includes(q)) ||
                            String(idx + 1).includes(q);
                        })
                        .map((guidedProject: GuidedProject, idx) => (
                          <Button
                            key={guidedProject.id}
                            data-project-id={guidedProject.id}
                            variant='ghost'
                            className={`group h-auto min-h-[140px] md:min-h-[180px] flex-col items-start gap-3 md:gap-5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 text-left transition-all duration-300 hover:translate-y-[-4px] active:scale-[0.98] ${isDark ? 'border-success-800/40 bg-success-900/10 hover:bg-success-900/30 hover:border-success-500/50' : 'border-success-200/50 bg-success-50/30 hover:bg-success-50 hover:border-success-500/40'} w-full overflow-hidden shadow-sm hover:shadow-2xl relative ${selectedProjectId === guidedProject.id ? (isDark ? 'ring-2 ring-success-400 ring-offset-2 ring-offset-secondary-900' : 'ring-2 ring-success-500 ring-offset-2 ring-offset-white') : ''}`}
                            onClick={() => {
                              closeProjectPicker();
                              setZoom(1.0);
                              setPan({ x: 0, y: 0 });
                              startGuidedProject(guidedProject);
                              loadProjectData(guidedProject.data);
                            }}
                          >
                            <div className='flex items-center justify-between w-full gap-4 overflow-hidden flex-nowrap'>
                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <span className={`font-black text-base md:text-2xl leading-none transition-colors duration-300 break-words ${isDark ? 'group-hover:text-success-400 text-success-100' : 'group-hover:text-success-600 text-black'}`}>
                                  <span className={`${isDark ? 'text-secondary-500' : 'text-secondary-400'} mr-2`}>{idx + 1}.</span>{guidedProject.title}
                                </span>
                              </div>
                              <span className={`text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 py-1.5 rounded-full whitespace-nowrap border shrink-0 flex-shrink-0 ${isDark ? 'bg-success-500/20 text-success-400 border-success-500/30' : 'bg-success-100 text-success-600 border-success-200'}`}>
                                {guidedProject.tag}
                              </span>
                            </div>
                            <p className={`text-[11px] md:text-sm leading-relaxed font-medium italic transition-colors whitespace-normal break-words w-full ${isDark ? 'text-secondary-300/80 group-hover:text-secondary-200' : 'text-secondary-600 group-hover:text-secondary-800'}`}>
                              {guidedProject.description}
                            </p>

                            <div className='mt-auto pt-3 flex items-center gap-4 w-full border-t border-secondary-800/10 dark:border-secondary-700/50'>
                              <div className="flex items-center gap-1 text-[10px] text-secondary-500 dark:text-secondary-400">
                                <Clock className="w-3 h-3" />
                                {guidedProject.estimatedTimeMinutes} {language === 'tr' ? 'dk' : 'min'}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-secondary-500 dark:text-secondary-400">
                                <Target className="w-3 h-3" />
                                {guidedProject.steps.length} {language === 'tr' ? 'adım' : (guidedProject.steps.length <= 1 ? 'step' : 'steps')}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-warning-500 dark:text-warning-400 font-bold">
                                <Sparkles className="w-3 h-3 fill-current" />
                                {guidedProject.totalPoints || guidedProject.steps.reduce((acc, s) => acc + (s.points || 0), 0)} {t.pts}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-secondary-500 dark:text-secondary-400 capitalize">
                                <BookOpen className="w-3 h-3" />
                                {guidedProject.difficulty === 'beginner'
                                  ? (language === 'tr' ? 'Başlangıç' : 'Beginner')
                                  : guidedProject.difficulty === 'intermediate'
                                    ? (language === 'tr' ? 'Orta' : 'Intermediate')
                                    : guidedProject.difficulty === 'advanced'
                                      ? (language === 'tr' ? 'İleri' : 'Advanced')
                                      : guidedProject.difficulty}
                              </div>
                            </div>

                            {guidedProject.detail && (
                              <div className='pt-2 flex items-center gap-2 w-full'>
                                <div className='w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-warning-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]' />
                                <span className={`text-[8px] md:text-[11px] font-bold tracking-wide whitespace-normal break-words w-full ${isDark ? 'text-warning-400/80' : 'text-warning-700/80'}`}>
                                  {guidedProject.detail}
                                </span>
                              </div>
                            )}
                          </Button>
                        ))}
                      {getAvailableProjects(language).filter((guidedProject) => {
                        const q = projectSearchQuery.trim().toLowerCase();
                        return q === '' ||
                          guidedProject.title.toLowerCase().includes(q) ||
                          guidedProject.description.toLowerCase().includes(q) ||
                          guidedProject.tag.toLowerCase().includes(q) ||
                          (guidedProject.detail && guidedProject.detail.toLowerCase().includes(q));
                      }).length === 0 && (
                          <div className={`text-center py-12 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                            <p className="text-sm">
                              {language === 'tr' ? 'Aramanızla eşleşen rehberli ders bulunamadı.' : 'No guided lessons found matching your search.'}
                            </p>
                          </div>
                        )}
                    </div>
                  </section>
                </div>
              )}

              {/* Exam Mode Projects Section */}
              {projectPickerTab === 'exam' && (
                <div className='flex flex-col gap-8'>
                  <section className='space-y-4 md:space-y-6 w-full'>
                    <div className='flex items-center gap-3 md:gap-4 px-1 md:px-2'>
                      <p className='text-[10px] md:text-xs font-black tracking-[0.3em] md:tracking-[0.4em] text-error-500 dark:text-error-400 whitespace-nowrap'>
                        {language === 'tr' ? 'Sınavlar' : 'Exams'}
                      </p>
                      <p className={`text-[10px] md:text-xs ${isDark ? 'text-secondary-500' : 'text-secondary-500'} truncate`}>
                        {language === 'tr' ? 'Bilginizi test edin' : 'Test your knowledge'}
                      </p>
                      <div className={`h-px flex-1 ${isDark ? 'bg-error-800/60' : 'bg-error-200'}`} />
                    </div>

                    <div className='grid grid-cols-1 gap-6 w-full max-w-full'>
                      {getAvailableExams(language)
                        .filter(ep => ep.id !== 'exam-template-blank')
                        .filter((examProject, idx) => {
                          const q = projectSearchQuery.trim().toLowerCase();
                          return q === '' ||
                            examProject.title.toLowerCase().includes(q) ||
                            examProject.description.toLowerCase().includes(q) ||
                            examProject.tag.toLowerCase().includes(q) ||
                            (examProject.detail && examProject.detail.toLowerCase().includes(q)) ||
                            String(idx + 1).includes(q);
                        })
                        .map((examProject: ExamProject, idx) => (
                          <Button
                            key={examProject.id}
                            data-project-id={examProject.id}
                            variant='ghost'
                            className={`group h-auto min-h-[140px] md:min-h-[180px] flex-col items-start gap-3 md:gap-5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 text-left transition-all duration-300 hover:translate-y-[-4px] active:scale-[0.98] ${isDark ? 'border-error-800/40 bg-error-900/10 hover:bg-error-900/30 hover:border-error-500/50' : 'border-error-200/50 bg-error-50/30 hover:bg-error-50 hover:border-error-500/40'} w-full overflow-hidden shadow-sm hover:shadow-2xl relative ${selectedProjectId === examProject.id ? (isDark ? 'ring-2 ring-error-400 ring-offset-2 ring-offset-secondary-900' : 'ring-2 ring-error-500 ring-offset-2 ring-offset-white') : ''}`}
                            onClick={() => {
                              closeProjectPicker();
                              setZoom(1.0);
                              setPan({ x: 0, y: 0 });
                              startExamProject(examProject);
                              loadProjectData(examProject.data);
                            }}
                          >
                            <div className='flex items-center justify-between w-full gap-4 overflow-hidden flex-nowrap'>
                              <span className={`font-black text-base md:text-2xl leading-none transition-colors duration-300 break-words flex-1 min-w-0 ${isDark ? 'group-hover:text-error-400 text-error-100' : 'group-hover:text-error-600 text-black'}`}>
                                <span className={`${isDark ? 'text-secondary-500' : 'text-secondary-400'} mr-2`}>{idx + 1}.</span>{examProject.title}
                              </span>
                              <span className={`text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 py-1.5 rounded-full whitespace-nowrap border shrink-0 flex-shrink-0 ${isDark ? 'bg-error-500/20 text-error-400 border-error-500/30' : 'bg-error-100 text-error-600 border-error-200'}`}>
                                {examProject.tag}
                              </span>
                            </div>
                            <p className={`text-[11px] md:text-sm leading-relaxed font-medium italic transition-colors whitespace-normal break-words w-full ${isDark ? 'text-secondary-300/80 group-hover:text-secondary-200' : 'text-secondary-600 group-hover:text-secondary-800'}`}>
                              {examProject.description}
                            </p>

                            <div className='mt-auto pt-3 flex items-center gap-4 w-full border-t border-secondary-800/10 dark:border-secondary-700/50'>
                              <div className="flex items-center gap-1 text-[10px] text-secondary-500 dark:text-secondary-400">
                                <Clock className="w-3 h-3" />
                                {examProject.durationMinutes} {language === 'tr' ? 'dk' : 'min'}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-secondary-500 dark:text-secondary-400">
                                <Target className="w-3 h-3" />
                                {examProject.tasks.length} {language === 'tr' ? 'görev' : (examProject.tasks.length <= 1 ? 'task' : 'tasks')}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-secondary-500 dark:text-secondary-400 capitalize">
                                <GraduationCap className="w-3 h-3" />
                                {examProject.difficulty === 'beginner'
                                  ? (language === 'tr' ? 'Başlangıç' : 'Beginner')
                                  : examProject.difficulty === 'intermediate'
                                    ? (language === 'tr' ? 'Orta' : 'Intermediate')
                                    : examProject.difficulty === 'advanced'
                                      ? (language === 'tr' ? 'İleri' : 'Advanced')
                                      : examProject.difficulty}
                              </div>
                            </div>

                            {examProject.detail && (
                              <div className='pt-2 flex items-center gap-2 w-full'>
                                <div className='w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-error-500 shrink-0 shadow-[0_0_3px_rgba(244,63,94,0.2)]' />
                                <span className={`text-[8px] md:text-[11px] font-bold tracking-wide whitespace-normal break-words w-full ${isDark ? 'text-error-400/80' : 'text-error-700/80'}`}>
                                  {examProject.detail}
                                </span>
                              </div>
                            )}
                          </Button>
                        ))}
                      {getAvailableExams(language)
                        .filter(ep => ep.id !== 'exam-template-blank')
                        .filter((examProject) => {
                          const q = projectSearchQuery.trim().toLowerCase();
                          return q === '' ||
                            examProject.title.toLowerCase().includes(q) ||
                            examProject.description.toLowerCase().includes(q) ||
                            examProject.tag.toLowerCase().includes(q) ||
                            (examProject.detail && examProject.detail.toLowerCase().includes(q));
                        }).length === 0 && (
                          <div className={`text-center py-12 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                            <p className="text-sm">
                              {language === 'tr' ? 'Aramanızla eşleşen sınav bulunamadı.' : 'No exams found matching your search.'}
                            </p>
                          </div>
                        )}
                    </div>
                  </section>
                </div>
              )}

              {/* All Projects Section */}
              {projectPickerTab === 'all' && (
                <div className='flex flex-col gap-16'>
                  {(() => {
                    // Precompute global number for each project id
                    const projectNumMap = new Map<string, number>();
                    let counter = 0;
                    for (const lvl of exampleLevelOrder) {
                      const projs = groupedExampleProjects[lvl];
                      if (projs) projs.forEach(p => projectNumMap.set(p.id, ++counter));
                    }
                    return exampleLevelOrder.map((level) => {
                      const projects = groupedExampleProjects[level];
                      if (!projects || projects.length === 0) return null;

                      const q = projectSearchQuery.trim().toLowerCase();
                      const filteredProjects = q === ''
                        ? projects
                        : projects.filter(project => {
                          const num = projectNumMap.get(project.id) || 0;
                          return project.title.toLowerCase().includes(q) ||
                            project.description.toLowerCase().includes(q) ||
                            project.tag.toLowerCase().includes(q) ||
                            (project.detail && project.detail.toLowerCase().includes(q)) ||
                            String(num).includes(q);
                        });

                      if (filteredProjects.length === 0) return null;

                      return (
                        <section key={level} className='space-y-4 md:space-y-6 w-full'>
                          <div className='flex items-center gap-3 md:gap-4 px-1 md:px-2'>
                            <p className={`text-[10px] md:text-xs font-black tracking-[0.3em] md:tracking-[0.4em] whitespace-nowrap ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
                              {exampleLevelLabels[level]}
                            </p>
                            <p className={`text-[10px] md:text-xs ${isDark ? 'text-secondary-500' : 'text-secondary-500'} truncate`}>
                              {exampleLevelHints[level]}
                            </p>
                            <div className={`h-px flex-1 ${isDark ? 'bg-primary-500/60' : 'bg-primary-400/60'}`} />
                          </div>

                          <div className='grid grid-cols-1 gap-6 w-full max-w-full'>
                            {filteredProjects.map((example) => {
                              const num = projectNumMap.get(example.id) || 0;
                              return (
                                  <Button
                                    key={example.id}
                                    data-project-id={example.id}
                                    variant='ghost'
                                    className={`group h-auto min-h-[120px] md:min-h-[160px] flex-col items-start gap-3 md:gap-5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 text-left transition-all duration-300 hover:translate-y-[-4px] active:scale-[0.98] ${isDark ? 'border-secondary-800/40 bg-secondary-900/20 hover:bg-secondary-900/80 hover:border-accent-500/30' : 'border-secondary-200/50 bg-white hover:bg-secondary-50 hover:border-primary-500/20'} w-full overflow-hidden shadow-sm hover:shadow-2xl ${selectedProjectId === example.id ? (isDark ? 'ring-2 ring-accent-400 ring-offset-2 ring-offset-secondary-900' : 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white') : ''}`}
                                    onClick={() => { closeProjectPicker(); applyExampleProject(example.data, example.id); }}
                                  >
                                    <div className='flex items-center justify-between w-full gap-4 overflow-hidden flex-nowrap'>
                                      <span className={`font-black text-base md:text-2xl leading-none transition-colors duration-300 break-words flex-1 min-w-0 ${isDark ? 'group-hover:text-accent-400' : 'group-hover:text-primary-600'}`}><span className={`${isDark ? 'text-secondary-500' : 'text-secondary-400'} mr-2`}>{num}.</span>{example.title}</span>
                                      <span className={`text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 py-1.5 rounded-full whitespace-nowrap border shrink-0 flex-shrink-0 ${isDark ? 'bg-accent-500/10 text-accent-400 border-accent-500/20' : 'bg-primary-50 text-primary-600 border-primary-100'}`}>{example.tag}</span>
                                    </div>
                                    <p className={`text-[11px] md:text-sm leading-relaxed font-medium italic transition-colors whitespace-normal break-words break-all w-full ${isDark ? 'text-secondary-400/80 group-hover:text-secondary-200' : 'text-secondary-600 group-hover:text-secondary-800'}`}>{example.description}</p>
                                    <div className='flex items-center gap-2 w-full pt-2 md:pt-4 border-t border-secondary-800/10 dark:border-secondary-800/50'>
                                      {example.detail && (
                                        <div className='flex-1 min-w-0 flex items-center gap-2 md:gap-3'>
<div className='w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-warning-500 shrink-0 shadow-[0_0_3px_rgba(245,158,11,0.2)]' />
                                          <span className={`text-[8px] md:text-[11px] font-bold tracking-wide whitespace-normal break-words break-all w-full ${isDark ? 'text-warning-400/80' : 'text-warning-700/80'}`}>{example.detail}</span>
                                        </div>
                                      )}
                                      <span
                                        onClick={(e) => { e.stopPropagation(); closeProjectPicker(); applyExampleProjectAsTemplate(example.data, example.id); }}
                                        className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] md:text-xs font-bold px-2 py-1 rounded-lg cursor-pointer transition-colors
                                          ${isDark
                                            ? 'text-success-400 hover:text-success-300 bg-success-900/30 hover:bg-success-900/50 border border-success-700/40'
                                            : 'text-success-600 hover:text-success-700 bg-success-50 hover:bg-success-100 border border-success-200'}`}
                                        title={language === 'tr' ? 'Şablondan Başla (boş ayarlar)' : 'Start from Template (empty settings)'}
                                      >
                                        <FilePlus className="w-3 h-3" />
                                        {language === 'tr' ? 'Şablondan Başla' : 'From Template'}
                                      </span>
                                    </div>
                                  </Button>
                              );
                            })}
                          </div>
                        </section>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
