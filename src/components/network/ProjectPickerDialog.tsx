'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, FolderOpen, X, BookOpen, Clock, Target, Search } from 'lucide-react';
import type { Translations } from '@/contexts/LanguageContext';
import type { ExampleProject, ExampleProjectLevel } from '@/lib/network/exampleProjects';
import type { GuidedProject } from '@/lib/network/guidedMode';

interface ProjectPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: Translations;
  isDark: boolean;
  language: 'tr' | 'en';
  projectPickerTab: 'all' | 'guided';
  setProjectPickerTab: (tab: 'all' | 'guided') => void;
  projectSearchQuery: string;
  setProjectSearchQuery: (q: string) => void;
  groupedExampleProjects: Record<ExampleProjectLevel, ExampleProject[]>;
  exampleLevelLabels: Record<ExampleProjectLevel, string>;
  exampleLevelHints: Record<ExampleProjectLevel, string>;
  exampleLevelOrder: ExampleProjectLevel[];
  getAvailableProjects: (lang: 'tr' | 'en') => GuidedProject[];
  runWithSaveGuard: (action: () => void) => void;
  resetToEmptyProject: () => void;
  applyExampleProject: (data: any, exampleId?: string) => void;
  startGuidedProject: (project: GuidedProject) => void;
  loadProjectData: (data: unknown) => boolean;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  closeProjectPicker: () => void;
}

export function ProjectPickerDialog({
  open, onOpenChange, t, isDark, language,
  projectPickerTab, setProjectPickerTab,
  projectSearchQuery, setProjectSearchQuery,
  groupedExampleProjects, exampleLevelLabels, exampleLevelHints, exampleLevelOrder,
  getAvailableProjects,
  runWithSaveGuard, resetToEmptyProject, applyExampleProject,
  startGuidedProject, loadProjectData,
  setZoom, setPan,
  closeProjectPicker,
}: ProjectPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) setProjectSearchQuery(''); }}>
      <DialogContent className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} sm:max-w-2xl md:max-w-3xl w-[98vw] max-w-[1400px] h-[95vh] max-h-[1000px] p-0 overflow-hidden flex flex-col shadow-2xl rounded-none md:rounded-3xl liquid-glass-light`}>
        <div className='flex flex-col flex-1 overflow-hidden h-full max-w-full'>
          <div className='p-4 md:p-8 pb-2 md:pb-4 space-y-4'>
            <DialogHeader className='rounded-2xl md:rounded-3xl border border-transparent bg-gradient-to-r p-4 md:p-6 flex items-center justify-between flex-row'>
              <DialogTitle className='text-xl bg-gradient-to-br from-white to-slate-900 bg-clip-text text-transparent break-words'>{t.openNewProject}</DialogTitle>
              <Button
                variant='outline'
                size='sm'
                className={`flex items-center gap-2 text-xs px-3 py-1.5 h-8 ${isDark ? 'text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-cyan-400' : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-cyan-600'}`}
                onClick={() => { closeProjectPicker(); runWithSaveGuard(() => { resetToEmptyProject(); }); }}
              >
                <Plus className="w-3.5 h-3.5" />
                {t.emptyProject}
              </Button>
              <DialogDescription className="sr-only">
                {language === 'tr'
                  ? 'Yeni proje penceresi: boş projeyle başlayın veya hazır örneklerden birini seçin.'
                  : 'New project dialog: start with an empty project or choose one of the ready examples.'}
              </DialogDescription>
            </DialogHeader>

            {/* Tab Buttons */}
            <div className={`flex items-end gap-1 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <button
                onClick={() => setProjectPickerTab('all')}
                className={cn(
                  'relative inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-out focus-ring-animate',
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
                <span className="uppercase tracking-wide text-xs">{language === 'tr' ? t.openNewProject : 'All Projects'}</span>
              </button>
              <button
                onClick={() => setProjectPickerTab('guided')}
                className={cn(
                  'relative inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-out focus-ring-animate',
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
                <span className="uppercase tracking-wide text-xs">{language === 'tr' ? 'Rehberli Ders' : 'Guided Lesson'}</span>
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
                    let firstProject: any = null;
                    for (const level of exampleLevelOrder) {
                      const projects = groupedExampleProjects[level] || [];
                      const filtered = projects.filter(project =>
                        project.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        project.description.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        project.tag.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        (project.detail && project.detail.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                      );
                      if (filtered.length > 0) {
                        firstProject = filtered[0];
                        break;
                      }
                    }
                    if (firstProject) {
                      closeProjectPicker();
                      runWithSaveGuard(() => applyExampleProject(firstProject.data));
                    } else {
                      closeProjectPicker();
                      runWithSaveGuard(() => { resetToEmptyProject(); });
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

          <div className='flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-12 pb-12 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent'>
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
                        .filter(guidedProject =>
                          projectSearchQuery.trim() === '' ||
                          guidedProject.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                          guidedProject.description.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                          guidedProject.tag.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                          (guidedProject.detail && guidedProject.detail.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                        )
                        .map((guidedProject: GuidedProject) => (
                          <Button
                            key={guidedProject.id}
                            variant='ghost'
                            className={`group h-auto min-h-[140px] md:min-h-[180px] flex-col items-start gap-3 md:gap-5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 text-left transition-all duration-300 hover:translate-y-[-4px] active:scale-[0.98] ${isDark ? 'border-emerald-800/40 bg-emerald-900/10 hover:bg-emerald-900/30 hover:border-emerald-500/50' : 'border-emerald-200/50 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-500/40'} w-full overflow-hidden shadow-sm hover:shadow-2xl relative`}
                            onClick={() => {
                              closeProjectPicker();
                              runWithSaveGuard(() => {
                                setZoom(1.0);
                                setPan({ x: 0, y: 0 });
                                startGuidedProject(guidedProject);
                                loadProjectData(guidedProject.data);
                              });
                            }}
                          >
                            <div className='flex items-center justify-between w-full gap-4 overflow-hidden flex-nowrap'>
                              <span className={`font-black text-base md:text-2xl leading-none transition-colors duration-300 break-words flex-1 min-w-0 ${isDark ? 'group-hover:text-emerald-400 text-emerald-100' : 'group-hover:text-emerald-600 text-black'}`}>
                                {guidedProject.title}
                              </span>
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
                      {getAvailableProjects(language).filter(guidedProject =>
                        projectSearchQuery.trim() === '' ||
                        guidedProject.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        guidedProject.description.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        guidedProject.tag.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        (guidedProject.detail && guidedProject.detail.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                      ).length === 0 && (
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

              {/* All Projects Section */}
              {projectPickerTab === 'all' && (
                <div className='flex flex-col gap-16'>
                  {exampleLevelOrder.map((level) => {
                    const projects = groupedExampleProjects[level];
                    if (!projects || projects.length === 0) return null;

                    const filteredProjects = projectSearchQuery.trim() === ''
                      ? projects
                      : projects.filter(project =>
                        project.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        project.description.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        project.tag.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                        (project.detail && project.detail.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                      );

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
                          {filteredProjects.map((example) => (
                            <Button
                              key={example.id}
                              variant='ghost'
                              className={`group h-auto min-h-[120px] md:min-h-[160px] flex-col items-start gap-3 md:gap-5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 text-left transition-all duration-300 hover:translate-y-[-4px] active:scale-[0.98] ${isDark ? 'border-slate-800/40 bg-slate-900/20 hover:bg-slate-900/80 hover:border-cyan-500/30' : 'border-slate-200/50 bg-white hover:bg-slate-50 hover:border-blue-500/20'} w-full overflow-hidden shadow-sm hover:shadow-2xl`}
                              onClick={() => { closeProjectPicker(); runWithSaveGuard(() => applyExampleProject(example.data, example.id)); }}
                            >
                              <div className='flex items-center justify-between w-full gap-4 overflow-hidden flex-nowrap'>
                                <span className={`font-black text-base md:text-2xl leading-none transition-colors duration-300 break-words flex-1 min-w-0 ${isDark ? 'group-hover:text-cyan-400' : 'group-hover:text-blue-600'}`}>{example.title}</span>
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
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
