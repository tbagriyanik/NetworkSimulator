import dynamic from 'next/dynamic';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { ExamTask } from '@/lib/network/examMode';
import { BasarilarimPanel } from '@/components/ui/BasarilarimPanel';

const LazyAboutModal = dynamic(() => import('@/components/network/LazyAboutModal').then((m) => m.LazyAboutModal));
const PageModals = dynamic(() => import('@/components/network/panels/PageModals').then((m) => m.PageModals), { ssr: false });

const {
  GuidedModePanel,
  ExamModePanel,
  EnvironmentSettingsPanel,
  ExamEditorPanel,
  TroubleshootingPanel,
  TimelinePanel,
} = {
  // Import concrete modules (not the panels barrel) so the initial bundle
  // stays lean: the barrel merges every panel into one chunk (jsPDF included).
  GuidedModePanel: dynamic(() => import('@/components/network/GuidedModePanel').then((m) => m.GuidedModePanel)),
  ExamModePanel: dynamic(() => import('@/components/network/ExamModePanel').then((m) => m.ExamModePanel)),
  EnvironmentSettingsPanel: dynamic(() => import('@/components/network/EnvironmentSettingsPanel').then((m) => m.EnvironmentSettingsPanel)),
  ExamEditorPanel: dynamic(() => import('@/components/network/ExamEditorPanel').then((m) => m.ExamEditorPanel)),
  TroubleshootingPanel: dynamic(() => import('@/components/network/TroubleshootingPanel').then((m) => m.TroubleshootingPanel)),
  TimelinePanel: dynamic(() => import('@/components/network/TimelinePanel').then((m) => m.TimelinePanel)),
};

interface PageOverlayPanelsProps {
  t: any;
  isDark: boolean;
  language: 'tr' | 'en';
  showAboutModal: boolean;
  setShowAboutModal: (show: boolean) => void;
  isExamActive: boolean;
  setShowOnboarding: (show: boolean) => void;
  setOnboardingStep: (step: number) => void;
  showBasarilarim: boolean;
  setShowBasarilarim: (show: boolean) => void;
  isEnvironmentPanelOpen: boolean;
  setIsEnvironmentPanelOpen: (open: boolean) => void;

  // Guided Mode
  isGuidedModeActive: boolean;
  activeGuidedProject: any;
  guidedStepIndex: number;
  completeStep: (stepId: string) => void;
  uncompleteStep: (stepId: string) => void;
  toggleGuidedMinimize: () => void;
  isGuidedPanelMinimized: boolean;
  lastCompletedStep: string | null;
  isCurrentStepReady: boolean;
  lastCommand: string;
  lastOutput: string;
  showUnifiedDeviceModal: boolean;
  activeDeviceType: string;
  activeDeviceId: string;
  state: any;
  deviceStates: Map<string, SwitchState>;
  topologyConnections: CanvasConnection[];
  topologyDevices: CanvasDevice[];
  checkStepCompletionWithContext: any;

  // Exam Mode
  activeExam: any;
  closeExam: () => void;
  toggleExamPanelMinimize: () => void;
  isExamPanelMinimized: boolean;
  isExamFinished: boolean;
  finishExam: () => void;
  examScore: number;
  checkExamTasks: any;
  isExamLoadedFromFile: boolean;
  toggleEditor: (open?: boolean) => void;
  isEditorOpen: boolean;

  // Troubleshooting Mode
  activeTroubleshootingProject: any;
  showTroubleshootingPanel: boolean;
  setShowTroubleshootingPanel: (show: boolean) => void;
  isTroubleshootingMinimized: boolean;
  setIsTroubleshootingMinimized: (minimized: boolean) => void;

  // Timeline
  historyItems: any[];
  historyIndex: number;
  handleJumpTo: (index: number) => void;
  isTimelineMinimized: boolean;
  toggleTimelineMinimize: () => void;
  isMobile: boolean;

  // Exam Editor
  addTask: any;
  updateTask: any;
  deleteTask: any;
  updateExamMeta: any;
  moveTask: any;
  smartBalanceWeights: any;
  exportExamFile: any;
  getFullProjectData: () => any;

  // Page Modals (warnings/confirmations)
  showWarning: boolean;
  tabCount: number;
  clearCurrentTabData: () => void;
  acknowledgeWarning: () => void;
  confirmDialog: any;
  setConfirmDialog: any;
  saveDialog: any;
  setSaveDialog: any;
  focusActiveTerminalInput: () => void;
}

export function PageOverlayPanels({
  t,
  isDark,
  language,
  showAboutModal,
  setShowAboutModal,
  isExamActive,
  setShowOnboarding,
  setOnboardingStep,
  showBasarilarim,
  setShowBasarilarim,
  isEnvironmentPanelOpen,
  setIsEnvironmentPanelOpen,

  // Guided Mode
  isGuidedModeActive,
  activeGuidedProject,
  guidedStepIndex,
  completeStep,
  uncompleteStep,
  toggleGuidedMinimize,
  isGuidedPanelMinimized,
  lastCompletedStep,
  isCurrentStepReady,
  lastCommand,
  lastOutput,
  showUnifiedDeviceModal,
  activeDeviceType,
  activeDeviceId,
  state,
  deviceStates,
  topologyConnections,
  topologyDevices,
  checkStepCompletionWithContext,

  // Exam Mode
  activeExam,
  closeExam,
  toggleExamPanelMinimize,
  isExamPanelMinimized,
  isExamFinished,
  finishExam,
  examScore,
  checkExamTasks,
  isExamLoadedFromFile,
  toggleEditor,
  isEditorOpen,

  // Troubleshooting Mode
  activeTroubleshootingProject,
  showTroubleshootingPanel,
  setShowTroubleshootingPanel,
  isTroubleshootingMinimized,
  setIsTroubleshootingMinimized,

  // Timeline
  historyItems,
  historyIndex,
  handleJumpTo,
  isTimelineMinimized,
  toggleTimelineMinimize,
  isMobile,

  // Exam Editor
  addTask,
  updateTask,
  deleteTask,
  updateExamMeta,
  moveTask,
  smartBalanceWeights,
  exportExamFile,
  getFullProjectData,

  // Page Modals
  showWarning,
  tabCount,
  clearCurrentTabData,
  acknowledgeWarning,
  confirmDialog,
  setConfirmDialog,
  saveDialog,
  setSaveDialog,
  focusActiveTerminalInput,
}: PageOverlayPanelsProps) {
  return (
    <>
      {showAboutModal && (
        <LazyAboutModal
          isOpen={showAboutModal}
          onClose={() => setShowAboutModal(false)}
          isExamActive={isExamActive}
          onStartTour={() => {
            setShowAboutModal(false);
            setShowOnboarding(true);
            setOnboardingStep(0);
          }}
        />
      )}

      {showBasarilarim && (
        <BasarilarimPanel
          t={t}
          language={language}
          isDark={isDark}
          onClose={() => setShowBasarilarim(false)}
          zIndex={60}
        />
      )}

      {isEnvironmentPanelOpen && (
        <EnvironmentSettingsPanel
          isOpen={isEnvironmentPanelOpen}
          onOpenChange={setIsEnvironmentPanelOpen}
        />
      )}

      {/* Guided Mode Panel */}
      {isGuidedModeActive && (
        <GuidedModePanel
          project={activeGuidedProject}
          currentStepIndex={guidedStepIndex}
          onStepComplete={completeStep}
          onStepUncomplete={uncompleteStep}
          onClose={toggleGuidedMinimize}
          onMinimize={toggleGuidedMinimize}
          isMinimized={isGuidedPanelMinimized}
          lastCompletedStep={lastCompletedStep}
          isCurrentStepReady={isCurrentStepReady}
          lastCommand={lastCommand}
          lastOutput={lastOutput}
          deviceAccessed={
            showUnifiedDeviceModal
              ? activeDeviceType === 'switchL2' || activeDeviceType === 'switchL3'
                ? 'switch'
                : activeDeviceType === 'router'
                ? 'router'
                : 'pc'
              : null
          }
          deviceAccessedId={showUnifiedDeviceModal ? activeDeviceId : null}
          deviceState={state}
          deviceStates={deviceStates}
          topologyConnections={topologyConnections}
          topologyDevices={topologyDevices}
          onCheckAutoComplete={checkStepCompletionWithContext}
        />
      )}

      {/* Exam Mode Panel */}
      {isExamActive && !isEditorOpen && (
        <ExamModePanel
          project={activeExam}
          onClose={closeExam}
          onMinimize={toggleExamPanelMinimize}
          isMinimized={isExamPanelMinimized}
          isFinished={isExamFinished}
          onFinish={finishExam}
          score={examScore}
          lastCommand={lastCommand}
          lastOutput={lastOutput}
          deviceAccessed={
            showUnifiedDeviceModal
              ? activeDeviceType === 'switchL2' || activeDeviceType === 'switchL3'
                ? 'switch'
                : activeDeviceType === 'router'
                ? 'router'
                : 'pc'
              : null
          }
          deviceAccessedId={showUnifiedDeviceModal ? activeDeviceId : null}
          deviceState={state}
          deviceStates={deviceStates}
          topologyConnections={topologyConnections}
          topologyDevices={topologyDevices}
          onCheckTasks={checkExamTasks}
          onOpenEditor={!isExamLoadedFromFile ? () => toggleEditor(true) : undefined}
        />
      )}

      {/* Troubleshooting Mode Panel */}
      {activeTroubleshootingProject && showTroubleshootingPanel && (
        <TroubleshootingPanel
          project={activeTroubleshootingProject}
          deviceStates={deviceStates}
          topologyDevices={topologyDevices}
          tasks={'tasks' in activeTroubleshootingProject ? (activeTroubleshootingProject as unknown as { tasks: ExamTask[] }).tasks : []}
          onClose={() => setShowTroubleshootingPanel(false)}
          onMinimize={() => setIsTroubleshootingMinimized(!isTroubleshootingMinimized)}
          isMinimized={isTroubleshootingMinimized}
        />
      )}

      {/* Global Timeline History Panel */}
      <TimelinePanel
        historyItems={historyItems}
        historyIndex={historyIndex}
        onJumpTo={handleJumpTo}
        isMinimized={isTimelineMinimized}
        onMinimize={toggleTimelineMinimize}
        isMobile={isMobile}
      />

      {/* Exam Editor Panel */}
      {isEditorOpen && activeExam && (
        <ExamEditorPanel
          isOpen={isEditorOpen}
          onClose={() => toggleEditor(false)}
          activeExam={activeExam}
          addTask={addTask}
          updateTask={updateTask}
          deleteTask={deleteTask}
          updateExamMeta={updateExamMeta}
          moveTask={moveTask}
          smartBalanceWeights={smartBalanceWeights}
          exportExamFile={(projData: any) => {
            exportExamFile(projData);
          }}
          projectData={getFullProjectData()}
          isDark={isDark}
        />
      )}

      <PageModals
        t={t}
        isDark={isDark}
        showWarning={showWarning}
        tabCount={tabCount}
        clearCurrentTabData={clearCurrentTabData}
        acknowledgeWarning={acknowledgeWarning}
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        saveDialog={saveDialog}
        setSaveDialog={setSaveDialog}
        focusActiveTerminalInput={focusActiveTerminalInput}
      />
    </>
  );
}


