'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { ExampleProjectLevel } from '@/lib/network/exampleProjects';
import type { usePageController } from './usePageController';

const ProjectPickerDialog = dynamic(() => import('@/components/network/ProjectPickerDialog').then((m) => m.ProjectPickerDialog));
const OnboardingDialog = dynamic(() => import('@/components/network/OnboardingDialog').then((m) => m.OnboardingDialog));
const TopologyGeneratorDialog = dynamic(() => import('@/components/network/topology/TopologyGeneratorDialog').then(m => m.TopologyGeneratorDialog), { ssr: false });

type PageController = ReturnType<typeof usePageController>;

/**
 * Everything except `exampleLevelOrder` is forwarded verbatim from the page
 * controller in page.tsx, so those types are derived from that controller
 * rather than restated. `exampleLevelOrder` is a module constant in
 * page.types.ts, so it keeps its own (narrow) type.
 */
export type PageDialogsProps = Pick<
  PageController,
  | 't'
  | 'isDark'
  | 'language'
  // Topology generator
  | 'isGeneratorOpen'
  | 'setIsGeneratorOpen'
  | 'handleGeneratedTopology'
  // Project picker
  | 'showProjectPicker'
  | 'setShowProjectPicker'
  | 'projectPickerTab'
  | 'setProjectPickerTab'
  | 'projectSearchQuery'
  | 'setProjectSearchQuery'
  | 'groupedExampleProjects'
  | 'getAvailableProjects'
  | 'getAvailableExams'
  | 'resetToEmptyProject'
  | 'applyExampleProject'
  | 'applyExampleProjectAsTemplate'
  | 'handleStartGuidedProject'
  | 'startExamFromCatalog'
  | 'loadProjectData'
  | 'setZoom'
  | 'setPan'
  | 'handleConvertProjectToExam'
  | 'fileInputRef'
  // Onboarding
  | 'showOnboarding'
  | 'onboardingStep'
  | 'onboardingSteps'
  | 'closeOnboardingForever'
  | 'prevOnboarding'
  | 'nextOnboarding'
> & {
  exampleLevelOrder: ExampleProjectLevel[];
};

export function PageDialogs({
  t,
  isDark,
  language,

  isGeneratorOpen,
  setIsGeneratorOpen,
  handleGeneratedTopology,

  showProjectPicker,
  setShowProjectPicker,
  projectPickerTab,
  setProjectPickerTab,
  projectSearchQuery,
  setProjectSearchQuery,
  groupedExampleProjects,
  exampleLevelOrder,
  getAvailableProjects,
  getAvailableExams,
  resetToEmptyProject,
  applyExampleProject,
  applyExampleProjectAsTemplate,
  handleStartGuidedProject,
  startExamFromCatalog,
  loadProjectData,
  setZoom,
  setPan,
  handleConvertProjectToExam,
  fileInputRef,

  showOnboarding,
  onboardingStep,
  onboardingSteps,
  closeOnboardingForever,
  prevOnboarding,
  nextOnboarding,
}: PageDialogsProps) {
  const exampleLevelLabels = useMemo(() => ({
    basic: t.levelBasic,
    intermediate: t.levelIntermediate,
    advanced: t.levelAdvanced
  }), [t]);

  const exampleLevelHints = useMemo(() => ({
    basic: t.basicHint,
    intermediate: t.intermediateHint,
    advanced: (t as Record<string, string>).advancedHint ?? t.intermediateHint
  }), [t]);

  return (
    <>
      {isGeneratorOpen && (
        <TopologyGeneratorDialog
          open={isGeneratorOpen}
          onOpenChange={setIsGeneratorOpen}
          onGenerate={handleGeneratedTopology}
        />
      )}

      {showProjectPicker && (
        <ProjectPickerDialog
          open={showProjectPicker}
          onOpenChange={setShowProjectPicker}
          t={t}
          isDark={isDark}
          language={language}
          projectPickerTab={projectPickerTab}
          setProjectPickerTab={setProjectPickerTab}
          projectSearchQuery={projectSearchQuery}
          setProjectSearchQuery={setProjectSearchQuery}
          groupedExampleProjects={groupedExampleProjects}
          exampleLevelLabels={exampleLevelLabels}
          exampleLevelHints={exampleLevelHints}
          exampleLevelOrder={exampleLevelOrder}
          getAvailableProjects={getAvailableProjects}
          getAvailableExams={getAvailableExams}
          resetToEmptyProject={resetToEmptyProject}
          applyExampleProject={applyExampleProject}
          applyExampleProjectAsTemplate={applyExampleProjectAsTemplate}
          startGuidedProject={handleStartGuidedProject}
          startExamProject={startExamFromCatalog}
          loadProjectData={loadProjectData}
          setZoom={setZoom}
          setPan={setPan}
          closeProjectPicker={() => setShowProjectPicker(false)}
          onOpenFile={() => fileInputRef.current?.click()}
          onConvertProjectToExam={handleConvertProjectToExam}
        />
      )}

      {showOnboarding && (
        <OnboardingDialog
          open={showOnboarding}
          t={t}
          isDark={isDark}
          onboardingStep={onboardingStep}
          onboardingSteps={onboardingSteps}
          closeOnboardingForever={closeOnboardingForever}
          prevOnboarding={prevOnboarding}
          nextOnboarding={nextOnboarding}
        />
      )}
    </>
  );
}