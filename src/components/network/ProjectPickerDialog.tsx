'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, FolderOpen, X, BookOpen, Clock, Target, Search, Wand2, Sparkles } from 'lucide-react';
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
  applyExampleProject: (data: any, exampleId?: string) => void;
  startGuidedProject: (project: GuidedProject) => void;
  startExamProject: (project: ExamProject) => void;
  loadProjectData: (data: unknown) => boolean;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  closeProjectPicker: () => void;
  onOpenFile: () => void;
}

export function ProjectPickerDialog({
  open, onOpenChange, t, isDark, language,
  projectPickerTab, setProjectPickerTab,
  projectSearchQuery, setProjectSearchQuery,
  groupedExampleProjects, exampleLevelLabels, exampleLevelHints, exampleLevelOrder,
  getAvailableProjects, getAvailableExams,
  resetToEmptyProject, applyExampleProject,
  startGuidedProject, startExamProject, loadProjectData,
  setZoom, setPan,
  closeProjectPicker,
  onOpenFile,
}: ProjectPickerDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedProjectId(null);
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
      const examProjects = getAvailableExams(language).filter((ep: any) => ep.id !== 'exam-template-blank');
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
    } else if (e.key === 'Enter' && selectedProjectId) {
      e.preventDefault();
      (scrollRef.current?.querySelector(`[data-project-id="${CSS.escape(selectedProjectId)}"]`) as HTMLButtonElement | null)?.click();
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

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) setProjectSearchQuery(''); }}>
      <DialogContent className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} sm:max-w-2xl md:max-w-3xl w-[98vw] max-w-[1400px] h-[95vh] max-h-[1000px] p-0 overflow-hidden flex flex-col shadow-2xl rounded-none md:rounded-3xl liquid-glass-light`}>
        <div className='flex flex-col flex-1 overflow-hidden h-full max-w-full'>
          <div className='p-4 md:p-8 pb-2 md:pb-4 space-y-4'>
            <DialogHeader className='rounded-2xl md:rounded-3xl border border-transparent bg-gradient-to-r p-4 md:p-6 flex items-center justify-between flex-row'>
              <DialogTitle className='text-xl bg-gradient-to-br from-white to-slate-900 bg-clip-text text-transparent break-words'>{t.openNewProject}</DialogTitle>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className={`flex items-center gap-2 text-xs px-3 py-1.5 h-8 ${isDark ? 'text-sky-300 border-sky-700/50 hover:bg-sky-900/30 hover:text-sky-300' : 'text-sky-600 border-sky-300 hover:bg-sky-50 hover:text-sky-700'}`}
                  onClick={() => {
                    closeProjectPicker();
                    onOpenFile();
                  }}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {language === 'tr' ? 'Dosya Aç' : 'Open File'}
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className={`flex items-center gap-2 text-xs px-3 py-1.5 h-8 ${isDark ? 'text-rose-300 border-rose-700/50 hover:bg-rose-900/30 hover:text-rose-300' : 'text-rose-600 border-rose-300 hover:bg-rose-50 hover:text-rose-700'}`}
                  onClick={() => {
                    const examTemplate = getAvailableExams(language).find((ep: any) => ep.id === 'exam-template-blank');
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
                <Button
                  variant='outline'
                  size='sm'
                  className={`flex items-center gap-2 text-xs px-3 py-1.5 h-8 ${isDark ? 'text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-cyan-400' : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-cyan-600'}`}
                  onClick={() => { closeProjectPicker(); resetToEmptyProject(); }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.emptyProject}
                </Button>
              </div>
              <DialogDescription className="sr-only">
                {language === 'tr'
                  ? 'Yeni proje penceresi: boş projeyle başlayın veya hazır örneklerden birini seçin.'
                  : 'New project dialog: start with an empty project or choose one of the ready examples.'}
              </DialogDescription>
            </DialogHeader>

            {/* Tab Buttons */}
            <div className={`flex items-end gap-0.5 md:gap-1 border-b overflow-x-auto flex-nowrap no-scrollbar ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <button
                onClick={() => setProjectPickerTab('all')}
                className={cn(
                  'relative inline-flex items-center gap-1.5 md:gap-2 rounded-t-lg border border-b-0 px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-sm font-semibold transition-all duration-200 ease-out focus-ring-animate flex-shrink-0',
                  projectPickerTab === 'all'
                    ? isDark
                      ? 'bg-slate-900 text-blue-400 border-slate-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
                      : 'bg-white text-blue-600 border-slate-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
                    : isDark
                      ? 'bg-slate-950/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/60'
                      : 'bg-slate-100/80 text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                )}
                role="tab"
                aria-selected={projectPickerTab === 'all'}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="uppercase tracking-wide text-xs">{t.allProjects}</span>
              </button>
              <button
                onClick={() => setProjectPickerTab('guided')}
                className={cn(
                  'relative inline-flex items-center gap-1.5 md:gap-2 rounded-t-lg border border-b-0 px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-sm font-semibold transition-all duration-200 ease-out focus-ring-animate flex-shrink-0',
                  projectPickerTab === 'guided'
                    ? isDark
                      ? 'bg-slate-900 text-emerald-400 border-slate-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
                      : 'bg-white text-emerald-600 border-slate-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
                    : isDark
                      ? 'bg-slate-950/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/60'
                      : 'bg-slate-100/80 text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                )}
                role="tab"
                aria-selected={projectPickerTab === 'guided'}
              >
                <BookOpen className="w-4 h-4" />
                <span className="uppercase tracking-wide text-xs">{t.guidedMode}</span>
              </button>
              <button
                onClick={() => setProjectPickerTab('exam')}
                className={cn(
                  'relative inline-flex items-center gap-1.5 md:gap-2 rounded-t-lg border border-b-0 px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-sm font-semibold transition-all duration-200 ease-out focus-ring-animate flex-shrink-0',
                  projectPickerTab === 'exam'
                    ? isDark
                      ? 'bg-slate-900 text-rose-400 border-slate-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
                      : 'bg-white text-rose-600 border-slate-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
                    : isDark
                      ? 'bg-slate-950/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/60'
                      : 'bg-slate-100/80 text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                )}
                role="tab"
                aria-selected={projectPickerTab === 'exam'}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="uppercase tracking-wide text-xs">{t.exam}</span>
              </button>
            </div>

            {/* Search Box */}
            <div className={`relative rounded-xl border px-4 py-2.5 flex items-center gap-2 ${isDark ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white/50 border-slate-200/60'}`}>
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={projectSearchQuery}
                placeholder={t.searchProjects}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                autoFocus
                className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (selectedProjectId) {
                      e.preventDefault();
                      (scrollRef.current?.querySelector(`[data-project-id="${CSS.escape(selectedProjectId)}"]`) as HTMLButtonElement | null)?.click();
                      return;
                    }
                    const q = projectSearchQuery.trim().toLowerCase();
                    // Search example projects first
                    let firstProject: any = null;
                    for (const level of exampleLevelOrder) {
                      const projects = groupedExampleProjects[level] || [];
                      const filtered = projects.filter(project =>
                        project.title.toLowerCase().includes(q) ||
                        project.description.toLowerCase().includes(q) ||
                        project.tag.toLowerCase().includes(q) ||
                        (project.detail && project.detail.toLowerCase().includes(q))
                      );
                      if (filtered.length > 0) {
                        firstProject = filtered[0];
                        break;
                      }
                    }
                    // If not found, search guided lessons
                    if (!firstProject) {
                      const guided = getAvailableProjects(language).find(proj =>
                        proj.title.toLowerCase().includes(q) ||
                        proj.description.toLowerCase().includes(q) ||
                        proj.tag.toLowerCase().includes(q) ||
                        (proj.detail && proj.detail.toLowerCase().includes(q))
                      );
                      if (guided) {
                        closeProjectPicker();
                        setZoom(1.0);
                        setPan({ x: 0, y: 0 });
                        startGuidedProject(guided);
                        loadProjectData(guided.data);
                        return;
                      }
                    }
                    // If still not found, search exams
                    if (!firstProject) {
                        const exam = getAvailableExams(language)
                          .filter((proj: any) => proj.id !== 'exam-template-blank')
                          .find(proj =>
                          proj.title.toLowerCase().includes(q) ||
                          proj.description.toLowerCase().includes(q) ||
                          proj.tag.toLowerCase().includes(q) ||
                          (proj.detail && proj.detail.toLowerCase().includes(q))
                        );
                        if (exam) {
                          closeProjectPicker();
                          setZoom(1.0);
                          setPan({ x: 0, y: 0 });
                          startExamProject(exam);
                          loadProjectData(exam.data);
                          return;
                        }
                    }
                    if (firstProject) {
                      closeProjectPicker();
                      applyExampleProject(firstProject.data, firstProject.id);
                    } else {
                      closeProjectPicker();
                      resetToEmptyProject();
                    }
                  }
                }}
              />
              {projectSearchQuery && (
                <button
                  onClick={() => setProjectSearchQuery('')}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
            className='flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-12 pb-12 custom-scrollbar focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-inset'
          >
            <div className='flex flex-col gap-12 max-w-full'>
              {/* Guided Mode Projects Section */}
              {projectPickerTab === 'guided' && (
                <div className='flex flex-col gap-8'>
                  <section className='space-y-4 md:space-y-6 w-full'>
                    <div className='flex items-center gap-3 md:gap-4 px-1 md:px-2'>
                      <p className='text-[10px] md:text-xs font-black tracking-[0.3em] md:tracking-[0.4em] text-emerald-500 dark:text-emerald-400 whitespace-nowrap'>
                        {language === 'tr' ? 'Rehberli Dersler' : 'Guided Lessons'}
                      </p>
                      <p className={`text-[10px] md:text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} truncate`}>
                        {language === 'tr' ? 'Adım adım öğrenme deneyimi' : 'Step-by-step learning experience'}
                      </p>
                      <div className={`h-px flex-1 ${isDark ? 'bg-emerald-800/60' : 'bg-emerald-200'}`} />
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
                            className={`group h-auto min-h-[140px] md:min-h-[180px] flex-col items-start gap-3 md:gap-5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 text-left transition-all duration-300 hover:translate-y-[-4px] active:scale-[0.98] ${isDark ? 'border-emerald-800/40 bg-emerald-900/10 hover:bg-emerald-900/30 hover:border-emerald-500/50' : 'border-emerald-200/50 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-500/40'} w-full overflow-hidden shadow-sm hover:shadow-2xl relative ${selectedProjectId === guidedProject.id ? (isDark ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white') : ''}`}
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
                                <div className="flex items-center gap-2">
                                  <Wand2 className="w-4 h-4 text-amber-500" />
                                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                    {t.wizardSupported}
                                  </span>
                                </div>
                                <span className={`font-black text-base md:text-2xl leading-none transition-colors duration-300 break-words ${isDark ? 'group-hover:text-emerald-400 text-emerald-100' : 'group-hover:text-emerald-600 text-black'}`}>
                                  <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'} mr-2`}>{idx + 1}.</span>{guidedProject.title}
                                </span>
                              </div>
                              <span className={`text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 py-1.5 rounded-full whitespace-nowrap border shrink-0 flex-shrink-0 ${isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>
                                {guidedProject.tag}
                              </span>
                            </div>
                            <p className={`text-[11px] md:text-sm leading-relaxed font-medium italic transition-colors whitespace-normal break-words w-full ${isDark ? 'text-slate-300/80 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-800'}`}>
                              {guidedProject.description}
                            </p>

                            <div className='mt-auto pt-3 flex items-center gap-4 w-full border-t border-slate-800/10 dark:border-slate-700/50'>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3" />
                                {guidedProject.estimatedTimeMinutes} {language === 'tr' ? 'dk' : 'min'}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <Target className="w-3 h-3" />
                                {guidedProject.steps.length} {language === 'tr' ? 'adım' : 'steps'}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-amber-500 dark:text-amber-400 font-bold">
                                <Sparkles className="w-3 h-3 fill-current" />
                                {guidedProject.totalPoints || guidedProject.steps.reduce((acc, s) => acc + (s.points || 0), 0)} {t.pts}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 capitalize">
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
                                <div className='w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]' />
                                <span className={`text-[8px] md:text-[11px] font-bold tracking-wide whitespace-normal break-words w-full ${isDark ? 'text-amber-400/80' : 'text-amber-700/80'}`}>
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
                          <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
                      <p className='text-[10px] md:text-xs font-black tracking-[0.3em] md:tracking-[0.4em] text-rose-500 dark:text-rose-400 whitespace-nowrap'>
                        {language === 'tr' ? 'SINAVLAR' : 'EXAMS'}
                      </p>
                      <p className={`text-[10px] md:text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} truncate`}>
                        {language === 'tr' ? 'Bilginizi test edin' : 'Test your knowledge'}
                      </p>
                      <div className={`h-px flex-1 ${isDark ? 'bg-rose-800/60' : 'bg-rose-200'}`} />
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
                            className={`group h-auto min-h-[140px] md:min-h-[180px] flex-col items-start gap-3 md:gap-5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 text-left transition-all duration-300 hover:translate-y-[-4px] active:scale-[0.98] ${isDark ? 'border-rose-800/40 bg-rose-900/10 hover:bg-rose-900/30 hover:border-rose-500/50' : 'border-rose-200/50 bg-rose-50/30 hover:bg-rose-50 hover:border-rose-500/40'} w-full overflow-hidden shadow-sm hover:shadow-2xl relative ${selectedProjectId === examProject.id ? (isDark ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-900' : 'ring-2 ring-rose-500 ring-offset-2 ring-offset-white') : ''}`}
                            onClick={() => {
                              closeProjectPicker();
                              setZoom(1.0);
                              setPan({ x: 0, y: 0 });
                              startExamProject(examProject);
                              loadProjectData(examProject.data);
                            }}
                          >
                            <div className='flex items-center justify-between w-full gap-4 overflow-hidden flex-nowrap'>
                              <span className={`font-black text-base md:text-2xl leading-none transition-colors duration-300 break-words flex-1 min-w-0 ${isDark ? 'group-hover:text-rose-400 text-rose-100' : 'group-hover:text-rose-600 text-black'}`}>
                                <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'} mr-2`}>{idx + 1}.</span>{examProject.title}
                              </span>
                              <span className={`text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 py-1.5 rounded-full whitespace-nowrap border shrink-0 flex-shrink-0 ${isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-600 border-rose-200'}`}>
                                {examProject.tag}
                              </span>
                            </div>
                            <p className={`text-[11px] md:text-sm leading-relaxed font-medium italic transition-colors whitespace-normal break-words w-full ${isDark ? 'text-slate-300/80 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-800'}`}>
                              {examProject.description}
                            </p>

                            <div className='mt-auto pt-3 flex items-center gap-4 w-full border-t border-slate-800/10 dark:border-slate-700/50'>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3" />
                                {examProject.durationMinutes} {language === 'tr' ? 'dk' : 'min'}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <Target className="w-3 h-3" />
                                {examProject.tasks.length} {language === 'tr' ? 'görev' : 'tasks'}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 capitalize">
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
                                <div className='w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.5)]' />
                                <span className={`text-[8px] md:text-[11px] font-bold tracking-wide whitespace-normal break-words w-full ${isDark ? 'text-rose-400/80' : 'text-rose-700/80'}`}>
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
                          <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
                            <p className={`text-[10px] md:text-xs font-black tracking-[0.3em] md:tracking-[0.4em] whitespace-nowrap ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                              {exampleLevelLabels[level]}
                            </p>
                            <p className={`text-[10px] md:text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} truncate`}>
                              {exampleLevelHints[level]}
                            </p>
                            <div className={`h-px flex-1 ${isDark ? 'bg-blue-500/60' : 'bg-blue-400/60'}`} />
                          </div>

                          <div className='grid grid-cols-1 gap-6 w-full max-w-full'>
                            {filteredProjects.map((example) => {
                              const num = projectNumMap.get(example.id) || 0;
                              return (
                                <Button
                                  key={example.id}
                                  data-project-id={example.id}
                                  variant='ghost'
                                  className={`group h-auto min-h-[120px] md:min-h-[160px] flex-col items-start gap-3 md:gap-5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 text-left transition-all duration-300 hover:translate-y-[-4px] active:scale-[0.98] ${isDark ? 'border-slate-800/40 bg-slate-900/20 hover:bg-slate-900/80 hover:border-cyan-500/30' : 'border-slate-200/50 bg-white hover:bg-slate-50 hover:border-blue-500/20'} w-full overflow-hidden shadow-sm hover:shadow-2xl ${selectedProjectId === example.id ? (isDark ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white') : ''}`}
                                  onClick={() => { closeProjectPicker(); applyExampleProject(example.data, example.id); }}
                                >
                                  <div className='flex items-center justify-between w-full gap-4 overflow-hidden flex-nowrap'>
                                    <span className={`font-black text-base md:text-2xl leading-none transition-colors duration-300 break-words flex-1 min-w-0 ${isDark ? 'group-hover:text-cyan-400' : 'group-hover:text-blue-600'}`}><span className={`${isDark ? 'text-slate-500' : 'text-slate-400'} mr-2`}>{num}.</span>{example.title}</span>
                                    <span className={`text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 py-1.5 rounded-full whitespace-nowrap border shrink-0 flex-shrink-0 ${isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{example.tag}</span>
                                  </div>
                                  <p className={`text-[11px] md:text-sm leading-relaxed font-medium italic transition-colors whitespace-normal break-words break-all w-full ${isDark ? 'text-slate-400/80 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-800'}`}>{example.description}</p>
                                  {example.detail && (
                                    <div className='mt-auto pt-2 md:pt-4 flex items-center gap-2 md:gap-3 w-full border-t border-slate-800/10 dark:border-slate-800/50'>
                                      <div className='w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]' />
                                      <span className={`text-[8px] md:text-[11px] font-bold tracking-wide whitespace-normal break-words break-all w-full ${isDark ? 'text-amber-400/80' : 'text-amber-700/80'}`}>{example.detail}</span>
                                    </div>
                                  )}
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
