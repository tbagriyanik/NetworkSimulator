'use client';

import { useMemo, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import type { ExampleProject, ExampleProjectLevel } from '@/lib/network/exampleProjects';

const ProjectPickerDialog = dynamic(() => import('@/components/network/ProjectPickerDialog').then((m) => m.ProjectPickerDialog));
const OnboardingDialog = dynamic(() => import('@/components/network/OnboardingDialog').then((m) => m.OnboardingDialog));
const TopologyGeneratorDialog = dynamic(() => import('@/components/network/topology/TopologyGeneratorDialog').then(m => m.TopologyGeneratorDialog), { ssr: false });

interface PageDialogsProps {
  t: any;
  isDark: boolean;
  language: 'tr' | 'en';

  // Topology generator
  isGeneratorOpen: boolean;
  setIsGeneratorOpen: (open: boolean) => void;
  handleGeneratedTopology: (data: {
    devices: any[];
    connections: any[];
    deviceStates: Map<string, any>;
    projectName?: string;
    projectDescription?: string;
  }) => void;

  // Project picker
  showProjectPicker: boolean;
  setShowProjectPicker: (show: boolean) => void;
  projectPickerTab: any;
  setProjectPickerTab: (tab: any) => void;
  projectSearchQuery: any;
  setProjectSearchQuery: (query: any) => void;
  groupedExampleProjects: Record<ExampleProjectLevel, ExampleProject[]>;
  exampleLevelOrder: any;
  getAvailableProjects: any;
  getAvailableExams: any;
  resetToEmptyProject: any;
  applyExampleProject: any;
  applyExampleProjectAsTemplate: any;
  handleStartGuidedProject: any;
  startExamFromCatalog: any;
  loadProjectData: any;
  setZoom: (zoom: number) => void;
  setPan: (pan: any) => void;
  handleConvertProjectToExam: any;
  fileInputRef: RefObject<HTMLInputElement | null>;

  // Onboarding
  showOnboarding: boolean;
  onboardingStep: number;
  onboardingSteps: any[];
  closeOnboardingForever: any;
  prevOnboarding: () => void;
  nextOnboarding: () => void;
}

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