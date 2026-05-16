'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronUp, Menu, Plus, Save, FolderOpen, Languages, Sun, Moon, File, Undo2, Redo2, BookOpen, Leaf, Compass, Info, Sparkles, Cloud
} from 'lucide-react';
import type { Translations } from '@/contexts/LanguageContext';
import type { CanvasDevice, DeviceType } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { RefObject } from 'react';

type TabType = 'topology' | 'cmd' | 'terminal' | 'tasks';

interface AppHeaderProps {
  t: Translations;
  isDark: boolean;
  theme: 'dark' | 'light' | 'high-contrast' | 'auto';
  language: 'tr' | 'en';
  setLanguage: (lang: 'tr' | 'en') => void;
  setTheme: (theme: 'dark' | 'light' | 'high-contrast' | 'auto') => void;
  graphicsQuality: 'high' | 'low';
  setGraphicsQuality: (q: 'high' | 'low') => void;
  activeTab: TabType;
  activeDeviceType: DeviceType;
  activeDeviceId: string;
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  totalScore: number;
  maxScore: number;
  canUndo: boolean;
  canRedo: boolean;
  hasHydrated: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  handleNewProject: () => void;
  handleSaveProject: () => void;
  handleLoadProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  showMobileMenu: boolean;
  setShowMobileMenu: (v: boolean) => void;
  setShowProjectPicker: (v: boolean) => void;
  setShowOnboarding: (v: boolean) => void;
  setOnboardingStep: (v: number) => void;
  handleRefreshNetwork: () => void;
  setIsEnvironmentPanelOpen: (v: boolean) => void;
  isGuidedModeActive: boolean;
  isPanelMinimized: boolean;
  expandPanel: () => void;
  setShowAboutModal: (v: boolean) => void;
}

export function AppHeader({
  t, isDark, theme, language, setLanguage, setTheme,
  graphicsQuality, setGraphicsQuality,
  activeTab, activeDeviceType, activeDeviceId,
  topologyDevices, deviceStates,
  totalScore, maxScore, canUndo, canRedo, hasHydrated,
  handleUndo, handleRedo, handleNewProject, handleSaveProject, handleLoadProject,
  fileInputRef, showMobileMenu, setShowMobileMenu,
  setShowProjectPicker, setShowOnboarding, setOnboardingStep,
  handleRefreshNetwork, setIsEnvironmentPanelOpen,
  isGuidedModeActive, isPanelMinimized, expandPanel, setShowAboutModal,
}: AppHeaderProps) {
  return (
    <header className={`liquid-glass sticky top-0 z-1 border-b px-5 py-3 pb-0`}>
      <div className="w-full">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <TooltipWrapper title={t.reloadPage}>
            <Button
              variant="ghost"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="flex items-center gap-3 p-2"
            >
              <div className="p-1 flex items-center justify-center">
                <img src="/app.png" alt="Logo" className="w-7 h-7 object-contain" />
              </div>
              <div className="hidden md:flex flex-col">
                <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent leading-none">
                  {t.title}
                </h2>
                <p className="text-xs font-medium mt-1 text-slate-400 dark:text-slate-200">{t.subtitle}</p>
              </div>
            </Button>
          </TooltipWrapper>

          {/* Total Score - Desktop */}
          {activeDeviceType !== 'pc' && topologyDevices && topologyDevices.length > 0 && activeDeviceId && (
            <div className="hidden md:flex items-center gap-4">
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-200">
                    {t.labProgress}
                  </span>
                  <span
                    key={totalScore}
                    className={`text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-full animate-scale-in ${totalScore >= maxScore * 0.7 ? 'bg-emerald-500/10 text-emerald-400' :
                      totalScore >= maxScore * 0.4 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}
                  >
                    {Math.round((totalScore / maxScore) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full overflow-hidden p-[px] bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full progress-fill"
                      style={{ '--progress-width': `${(totalScore / maxScore) * 100}%` } as React.CSSProperties}
                    />
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xs font-black tabular-nums text-slate-900 dark:text-white">
                      {totalScore}
                    </span>
                    <span className="text-[10px] font-bold opacity-30 text-slate-500 dark:text-slate-400">
                      /{maxScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Controls - Integrated Toolbar */}
          <div className="flex items-center gap-2 sticky top-0 z-10">
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl border bg-slate-100 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800">
              {/* Undo/Redo Group */}
              {activeTab === 'topology' && (
                <div className="hidden items-center gap-1 sm:hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 ui-hover-surface text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" onClick={handleUndo} disabled={hasHydrated && !canUndo}>
                        <Undo2 className={`w-4 h-4 ${!canUndo ? 'opacity-30' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t.undo}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className={`h-8 w-8 ui-hover-surface ${isDark ? 'text-slate-300 hover:text-blue-400' : 'text-slate-600 hover:text-blue-600'}`} onClick={handleRedo} disabled={hasHydrated && !canRedo}>
                        <Redo2 className={`w-4 h-4 ${!canRedo ? 'opacity-30' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t.redo}</TooltipContent>
                  </Tooltip>
                  <div className="w-px h-4 mx-1 bg-slate-300 hidden md:block dark:bg-slate-700" />
                </div>
              )}

              {/* Project Controls - Desktop only */}
              <div className="hidden md:flex items-center">
                <div className="flex items-center rounded-lg border overflow-hidden bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button aria-label={t.newProject}
                        className="h-8 w-8 flex items-center justify-center transition-all hover:bg-slate-200/50 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-slate-700/50"
                        onClick={handleNewProject}
                      >
                        <File className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="flex items-center gap-2">
                      <span>{t.newProject}</span>
                      <ShortcutBadge shortcut="Alt+N" variant="primary" />
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button aria-label={t.loadProject}
                        className={cn("h-8 w-8 flex items-center justify-center transition-all hover:bg-slate-200/50", isDark ? 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50' : 'text-slate-600 hover:text-blue-600')}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="flex items-center gap-2">
                      <span>{t.loadProject}</span>
                      <ShortcutBadge shortcut="Ctrl+O" variant="primary" />
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button aria-label={t.saveProject}
                        className={cn("h-8 w-8 flex items-center justify-center transition-all hover:bg-slate-200/50", isDark ? 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50' : 'text-slate-600 hover:text-blue-600')}
                        onClick={handleSaveProject}
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="flex items-center gap-2">
                      <span>{t.saveProject}</span>
                      <ShortcutBadge shortcut="Ctrl+S" variant="success" />
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button aria-label={t.contactTitle} className={cn("h-8 w-8 flex items-center justify-center transition-all hover:bg-slate-200/50", isDark ? 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50' : 'text-slate-500 hover:text-blue-600')} onClick={() => setShowAboutModal(true)}>
                        <Info className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="flex items-center gap-2">
                      <span>{t.contactTitle}</span>
                      <ShortcutBadge shortcut="F1" variant="warning" />
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoadProject} className="hidden" />

              {/* Settings & Theme */}
              <div className={`w-px h-4 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-300'} hidden md:block`} />
              <button
                onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
                className={cn("text-[10px] font-bold h-7 px-1.5 flex items-center gap-1 rounded transition-all ui-hover-surface", isDark ? 'text-slate-300 hover:text-purple-300' : 'text-slate-500 hover:text-purple-600')}
              >
                <Languages className="w-3.5 h-3.5" />
                {language.toUpperCase()}
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={isDark ? t.lightMode : t.darkMode}
                    className={cn("h-7 w-7 rounded flex items-center justify-center transition-all ui-hover-surface", isDark ? 'text-slate-300 hover:text-yellow-300' : 'text-slate-500 hover:text-yellow-600')}
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  >
                    {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isDark ? t.lightMode : t.darkMode}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={graphicsQuality !== 'high' ? t.highRes : t.lowRes}
                    className={cn("h-7 w-7 rounded flex items-center justify-center transition-all ui-hover-surface", graphicsQuality === 'high' ? (isDark ? 'text-slate-300 hover:text-green-300' : 'text-slate-500 hover:text-green-600') : (isDark ? 'text-slate-300 hover:text-orange-300' : 'text-slate-500 hover:text-orange-600'))}
                    onClick={() => setGraphicsQuality(graphicsQuality === 'high' ? 'low' : 'high')}
                  >
                    {graphicsQuality === 'high' ? <Sparkles className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{graphicsQuality !== 'high' ? t.highRes : t.lowRes}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Mobile Menu */}
          <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'} p-0 w-72`}>
              <SheetHeader className="p-4 text-left border-b border-slate-800/50">
                <SheetTitle className="text-lg font-black flex items-center gap-2">
                  <div className="p-1 flex items-center justify-center">
                    <img src="/app.png" alt="Logo" className="w-5 h-5 object-contain" />
                  </div>
                  {t.title}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Main navigation and project controls
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-80px)]">
                <div className="p-3 space-y-4">
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        className={`justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                        onClick={() => { setShowProjectPicker(true); setShowMobileMenu(false); }}
                      >
                        <File className="w-3.5 h-3.5" /> {t.new}
                      </Button>
                      <Button
                        variant="secondary"
                        className={`justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                        onClick={() => { handleSaveProject(); setShowMobileMenu(false); }}
                      >
                        <Save className="w-3.5 h-3.5" /> {t.saveLabel}
                      </Button>
                      <Button
                        variant="secondary"
                        className={`justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                        onClick={() => { fileInputRef.current?.click(); setShowMobileMenu(false); }}
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> {t.load}
                      </Button>
                      <Button
                        variant="secondary"
                        className={cn("justify-start gap-2 h-9 text-xs font-bold", isDark ? "hover:text-cyan-400" : "hover:text-cyan-600")}
                        onClick={() => { setShowOnboarding(true); setOnboardingStep(0); setShowMobileMenu(false); }}
                      >
                        <Compass className="w-3.5 h-3.5" /> {t.tour}
                      </Button>
                      <Button
                        variant="outline"
                        className={`justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                        onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
                      >
                        <Languages className="w-3.5 h-3.5" />
                        {language === 'tr' ? t.english : t.turkish}
                      </Button>
                      <Button
                        variant="outline"
                        className={`justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                      >
                        {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                        {isDark ? t.lightMode : t.darkMode}
                      </Button>
                      <Button
                        variant="outline"
                        className={`w-full justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                        onClick={() => { setShowAboutModal(true); setShowMobileMenu(false); }}
                      >
                        <Info className="w-3.5 h-3.5" />
                        {t.help}
                      </Button>
                    </div>
                  </div>

                  {/* Lab Progress Mobile */}
                  {activeDeviceType !== 'pc' && topologyDevices && topologyDevices.length > 0 && activeDeviceId && (
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'} border ${isDark ? 'border-slate-800/50' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold tracking-[0.15em] text-slate-500">{t.labProgress}</span>
                        <span className="text-xs font-bold text-cyan-400">{Math.round((totalScore / maxScore) * 100)}%</span>
                      </div>
                      <div className={`h-1.5 w-full rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden mb-1.5`}>
                        <div
                          className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all duration-500"
                          style={{ width: `${(totalScore / maxScore) * 100}%` }}
                        />
                      </div>
                      <p className={`text-center text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalScore} / {maxScore} {t.pts}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Tabs & Device Selector */}
      <div className="flex items-end gap-1 mt-4 pt-1 overflow-x-auto no-scrollbar">
        <div className="flex md:hidden items-center gap-1.5 mr-auto">
          {activeTab === 'topology' && (
            <div className="flex items-center gap-1 p-1 rounded-xl border bg-white border-slate-200 shadow-sm dark:bg-slate-900/40 dark:border-slate-800">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={t.addDeviceOrCable}
                    variant="ghost"
                    size="icon"
                    className="px-2.5 py-1.5 h-auto text-red-500 hover:bg-red-500/10"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const event = new CustomEvent('trigger-topology-palette');
                        window.dispatchEvent(event);
                      }
                    }}
                  >
                    <Plus className="w-7 h-7" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.addDeviceOrCable}</TooltipContent>
              </Tooltip>
              <div className="w-px h-4 bg-slate-200 mx-0.5 dark:bg-slate-800" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={t.connectDevices}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-cyan-500 hover:bg-cyan-500/10"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const event = new CustomEvent('trigger-topology-connect');
                        window.dispatchEvent(event);
                      }
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 0 0 -5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0 -5.656-5.656l-1.1 1.1" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.connectDevices}</TooltipContent>
              </Tooltip>
              <div className="w-px h-4 bg-slate-200 mx-0.5 dark:bg-slate-800" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={t.refreshNetworkF5}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-pink-500 hover:bg-pink-500/10"
                    onClick={handleRefreshNetwork}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="flex items-center gap-2">
                  <span>{t.refreshNetworkF5}</span>
                  <ShortcutBadge shortcut="F5" variant="danger" />
                </TooltipContent>
              </Tooltip>
              <div className="w-px h-4 bg-slate-200 mx-0.5 dark:bg-slate-800" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={t.environmentSettings}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-emerald-500 hover:bg-emerald-500/10"
                    onClick={() => setIsEnvironmentPanelOpen(true)}
                  >
                    <Leaf className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.environmentSettings}</TooltipContent>
              </Tooltip>
              {isGuidedModeActive && isPanelMinimized && (
                <>
                  <div className="w-px h-4 bg-slate-200 mx-0.5 dark:bg-slate-800" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        aria-label={t.openGuidedLesson}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-blue-500 hover:bg-blue-500/10 animate-pulse"
                        onClick={expandPanel}
                      >
                        <BookOpen className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t.openGuidedLesson}</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
