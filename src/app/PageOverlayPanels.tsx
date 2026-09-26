import dynamic from 'next/dynamic';
import { BasarilarimPanel } from '@/components/ui/BasarilarimPanel';
import type { usePageController } from './usePageController';

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

type PageController = ReturnType<typeof usePageController>;

/**
 * Every prop is forwarded verbatim from the page controller in page.tsx, so the
 * types are derived from that controller rather than restated. Roughly twenty
 * props here were `any`, which meant the controller could supply any shape at
 * all — the exam editor callbacks, the guided-mode handlers and the dialog
 * state objects were all unchecked.
 */
export type PageOverlayPanelsProps = Pick<
  PageController,
  | 't'
  | 'isDark'
  | 'language'
  | 'showAboutModal'
  | 'setShowAboutModal'
  | 'isExamActive'
  | 'setShowOnboarding'
  | 'setOnboardingStep'
  | 'showBasarilarim'
  | 'setShowBasarilarim'
  | 'isEnvironmentPanelOpen'
  | 'setIsEnvironmentPanelOpen'
  // Guided Mode
  | 'isGuidedModeActive'
  | 'activeGuidedProject'
  | 'guidedStepIndex'
  | 'completeStep'
  | 'uncompleteStep'
  | 'lastCompletedStep'
  | 'isCurrentStepReady'
  | 'lastCommand'
  | 'lastOutput'
  | 'showUnifiedDeviceModal'
  | 'activeDeviceType'
  | 'activeDeviceId'
  | 'state'
  | 'deviceStates'
  | 'topologyConnections'
  | 'topologyDevices'
  | 'checkStepCompletionWithContext'
  // Exam Mode
  | 'activeExam'
  | 'closeExam'
  | 'toggleExamPanelMinimize'
  | 'isExamPanelMinimized'
  | 'isExamFinished'
  | 'finishExam'
  | 'examScore'
  | 'checkExamTasks'
  | 'isExamLoadedFromFile'
  | 'toggleEditor'
  | 'isEditorOpen'
  // Troubleshooting Mode
  | 'activeTroubleshootingProject'
  | 'showTroubleshootingPanel'
  | 'setShowTroubleshootingPanel'
  | 'isTroubleshootingMinimized'
  | 'setIsTroubleshootingMinimized'
  // Timeline
  | 'historyItems'
  | 'historyIndex'
  | 'handleJumpTo'
  | 'isTimelineMinimized'
  | 'toggleTimelineMinimize'
  | 'isMobile'
  // Exam Editor
  | 'addTask'
  | 'updateTask'
  | 'deleteTask'
  | 'updateExamMeta'
  | 'moveTask'
  | 'smartBalanceWeights'
  | 'exportExamFile'
  | 'getFullProjectData'
  // Page Modals (warnings/confirmations)
  | 'showWarning'
  | 'tabCount'
  | 'clearCurrentTabData'
  | 'acknowledgeWarning'
  | 'confirmDialog'
  | 'setConfirmDialog'
  | 'saveDialog'
  | 'setSaveDialog'
  | 'focusActiveTerminalInput'
> & {
  /**
   * page.tsx renames these two at the call site
   * (`togglePanelMinimize` -> `toggleGuidedMinimize`), so they cannot be picked
   * directly. The mapping is kept here as part of the prop contract.
   */
  toggleGuidedMinimize: PageController['togglePanelMinimize'];
  isGuidedPanelMinimized: PageController['isPanelMinimized'];
};

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
          tasks={'tasks' in activeTroubleshootingProject ? activeTroubleshootingProject.tasks : []}
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
          exportExamFile={exportExamFile}
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


