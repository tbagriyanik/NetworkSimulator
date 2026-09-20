'use client';

import dynamic from 'next/dynamic';

import { cn } from '@/lib/utils';
import type { PcOutputsSetter } from '@/components/network/pc-panel/PCPanel.types';

import { AppHeader } from '@/components/network/AppHeader';
import { AppFooter } from '@/components/network/AppFooter';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { AppLoadingScreen } from './sections/AppLoadingScreen';

const { TabletSplitView, RefreshReportPanel } = {
  // Import concrete modules (not the panels barrel) so the initial bundle
  // stays lean: the barrel also re-exports certificate panels which pull in jsPDF.
  TabletSplitView: dynamic(() => import('@/components/network/TabletSplitView').then((m) => m.TabletSplitView), { ssr: false }),
  RefreshReportPanel: dynamic(() => import('@/components/network/RefreshReportPanel').then((m) => m.RefreshReportPanel), { ssr: false }),
};

import { exampleLevelOrder } from './page.types';
import { handlePageShortcut } from './pageKeyboardShortcuts';

// Modular Sub-components
import { PageOverlayPanels } from './PageOverlayPanels';
import { PageDialogs } from './PageDialogs';
import { PagePanelWindows } from './PagePanelWindows';
import { TopologySection } from './sections/TopologySection';
import { usePageController } from './usePageController';
import { useAppStore } from '@/lib/store/appStore';
import { StoryModePanel } from '@/components/network/StoryModePanel';
import { useEffect, useState } from 'react';

export default function Home({ initialProjectId }: { initialProjectId?: string }) {
  const page = usePageController({ initialProjectId });
  const [showStoryMode, setShowStoryMode] = useState(false);
  useEffect(() => {
    const closeForWorkspaceChange = () => setShowStoryMode(false);
    window.addEventListener('new-project-reset', closeForWorkspaceChange);
    window.addEventListener('restore-checkpoint', closeForWorkspaceChange);
    window.addEventListener('network-refresh', closeForWorkspaceChange);
    return () => {
      window.removeEventListener('new-project-reset', closeForWorkspaceChange);
      window.removeEventListener('restore-checkpoint', closeForWorkspaceChange);
      window.removeEventListener('network-refresh', closeForWorkspaceChange);
    };
  }, []);

  return (
    <AppErrorBoundary fallbackTitle={page.t.applicationError}>
      <div className={cn("h-dvh w-full flex flex-col relative transition-colors duration-700 overflow-x-hidden", page.isAppLoading ? 'bg-secondary-950' : (page.isDark ? 'bg-secondary-950' : 'bg-secondary-50'))}>
        {!page.isAppLoading && (
          <div className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-20 transition-opacity duration-1000">
            <div className="absolute inset-0 mesh-gradient animate-liquid blur-[100px] scale-150 rotate-12" />
            <div className="absolute inset-0 bg-white/40 dark:bg-secondary-950/40" />
          </div>
        )}

        {/* App Loading Screen */}
        <AppLoadingScreen isAppLoading={page.isAppLoading} t={page.t} />

        {/* Main Content */}
        <div className="flex flex-col flex-1 animate-fade-in w-full max-w-[1920px] mx-auto">
          <AppHeader
            t={page.t}
            isDark={page.isDark}
            theme={page.theme}
            language={page.language}
            isPingPanelOpen={page.isPingPanelOpen}
            isExamActive={page.isExamActive}
            setLanguage={page.setLanguage}
            setTheme={page.setTheme}
            graphicsQuality={page.graphicsQuality}
            setGraphicsQuality={page.setGraphicsQuality}
            activeDeviceType={page.activeDeviceType}
            activeDeviceId={page.activeDeviceId}
            totalScore={page.totalScore}
            maxScore={page.maxScore}
            topologyDevices={page.topologyDevices}
            deviceStates={page.deviceStates}
            handleNewProject={page.handleNewProject}
            handleSaveProject={page.handleSaveProject}
            handleLoadProject={page.handleLoadProject}
            fileInputRef={page.fileInputRef}
            showMobileMenu={page.showMobileMenu}
            setShowMobileMenu={page.setShowMobileMenu}
            setShowProjectPicker={page.setShowProjectPicker}
            setShowOnboarding={page.setShowOnboarding}
            setOnboardingStep={page.setOnboardingStep}
            handleRefreshNetwork={page.handleRefreshNetwork}
            setIsEnvironmentPanelOpen={page.setIsEnvironmentPanelOpen}
            isGuidedModeActive={page.isGuidedModeActive}
            isPanelMinimized={page.isPanelMinimized}
            expandPanel={page.expandPanel}
            setShowAboutModal={page.setShowAboutModal}
            showBasarilarim={page.showBasarilarim}
            setShowBasarilarim={page.setShowBasarilarim}
            helpLevel={page.helpLevel}
            setHelpLevel={useAppStore.getState().setHelpLevel}
            setShowStoryMode={setShowStoryMode}
          />

          <StoryModePanel open={showStoryMode} onClose={() => setShowStoryMode(false)} topologyDevices={page.topologyDevices} topologyConnections={page.topologyConnections} deviceStates={page.deviceStates} />

          <PageDialogs
            t={page.t}
            isDark={page.isDark}
            language={page.language}
            isGeneratorOpen={page.isGeneratorOpen}
            setIsGeneratorOpen={page.setIsGeneratorOpen}
            handleGeneratedTopology={page.handleGeneratedTopology}
            showProjectPicker={page.showProjectPicker}
            setShowProjectPicker={page.setShowProjectPicker}
            projectPickerTab={page.projectPickerTab}
            setProjectPickerTab={page.setProjectPickerTab}
            projectSearchQuery={page.projectSearchQuery}
            setProjectSearchQuery={page.setProjectSearchQuery}
            groupedExampleProjects={page.groupedExampleProjects}
            exampleLevelOrder={exampleLevelOrder}
            getAvailableProjects={page.getAvailableProjects}
            getAvailableExams={page.getAvailableExams}
            resetToEmptyProject={page.resetToEmptyProject}
            applyExampleProject={page.applyExampleProject}
            applyExampleProjectAsTemplate={page.applyExampleProjectAsTemplate}
            handleStartGuidedProject={page.handleStartGuidedProject}
            startExamFromCatalog={page.startExamFromCatalog}
            loadProjectData={page.loadProjectData}
            setZoom={page.setZoom}
            setPan={page.setPan}
            handleConvertProjectToExam={page.handleConvertProjectToExam}
            fileInputRef={page.fileInputRef}
            showOnboarding={page.showOnboarding}
            onboardingStep={page.onboardingStep}
            onboardingSteps={page.onboardingSteps}
            closeOnboardingForever={page.closeOnboardingForever}
            prevOnboarding={page.prevOnboarding}
            nextOnboarding={page.nextOnboarding}
          />

          <PagePanelWindows
            t={page.t}
            theme={page.theme}
            isDark={page.isDark}
            isTR={page.isTR}
            language={page.language}
            isTablet={page.isTablet}
            helpLevel={page.helpLevel}
            showUnifiedDeviceModal={page.showUnifiedDeviceModal}
            setShowUnifiedDeviceModal={page.setShowUnifiedDeviceModal}
            unifiedDeviceActiveTab={page.unifiedDeviceActiveTab}
            setUnifiedDeviceActiveTab={page.setUnifiedDeviceActiveTab}
            activeDeviceId={page.activeDeviceId}
            activeDeviceType={page.activeDeviceType}
            deviceStates={page.deviceStates}
            deviceOutputs={page.deviceOutputs}
            topologyDevices={page.topologyDevices}
            topologyConnections={page.topologyConnections}
            handleCommand={page.handleCommand}
            handleClearTerminal={page.handleClearTerminal}
            handleUpdateHistory={page.handleUpdateHistory}
            confirmDialog={page.confirmDialog}
            setConfirmDialog={page.setConfirmDialog}
            isExecutingCommand={page.isExecutingCommand}
            output={page.output}
            prompt={page.prompt}
            state={page.state}
            activeDeviceTasks={page.activeDeviceTasks}
            taskContext={page.taskContext}
            unifiedDrag={page.unifiedDrag}
            firewallDrag={page.firewallDrag}
            showFirewallPanel={page.showFirewallPanel}
            setShowFirewallPanel={page.setShowFirewallPanel}
            activeFirewallId={page.activeFirewallId}
            firewallActiveTab={page.firewallActiveTab}
            setFirewallActiveTab={page.setFirewallActiveTab}
            handleExecuteCommand={page.handleExecuteCommand}
            toggleDevicePower={page.toggleDevicePower}
            updateDeviceConfig={page.updateDeviceConfig}
            showPCPanel={page.showPCPanel}
            setShowPCPanel={page.setShowPCPanel}
            showPCDeviceId={page.showPCDeviceId}
            cableInfo={page.cableInfo}
            pcPanelInitialTab={page.pcPanelInitialTab}
            pcOutputs={page.pcOutputs}
            setPcOutputs={page.setPcOutputs as PcOutputsSetter}
            pcHistories={page.pcHistories}
            handleUpdatePCHistory={page.handleUpdatePCHistory}
            handlePCPanelNavigateWrapper={page.handlePCPanelNavigateWrapper}
            handleDeviceDelete={page.handleDeviceDelete}
            focusedOverlay={page.focusedOverlay}
            pcDrag={page.pcDrag}
            showRouterPanel={page.showRouterPanel}
            setShowRouterPanel={page.setShowRouterPanel}
            showRouterDeviceId={page.showRouterDeviceId}
            routerDrag={page.routerDrag}
          />

          <main className={cn(
            "overflow-hidden flex flex-col min-h-0 pt-14 sm:pt-16",
            page.preferences.showFooter ? "h-[calc(100vh-44px)]" : "h-screen",
            page.activeTab === 'topology' ? 'md:pt-[116px]' : 'md:pt-16',
            page.isTablet && (page.showPCPanel || page.showUnifiedDeviceModal || page.showRouterPanel) && "flex-row md:pt-16"
          )}>
            <TopologySection
              preferences={page.preferences}
              activeTab={page.activeTab}
              isTablet={page.isTablet}
              showPCPanel={page.showPCPanel}
              showUnifiedDeviceModal={page.showUnifiedDeviceModal}
              showRouterPanel={page.showRouterPanel}
              isPingPanelOpen={page.isPingPanelOpen}
              t={page.t}
              isDark={page.isDark}
              language={page.language}
              topologyDevices={page.topologyDevices}
              deviceStates={page.deviceStates}
              activeDeviceId={page.activeDeviceId}
              activeDeviceType={page.activeDeviceType}
              cableInfo={page.cableInfo}
              deviceSearchQuery={page.deviceSearchQuery}
              canUndo={page.canUndo}
              canRedo={page.canRedo}
              hasHydrated={page.hasHydrated}
              isExamActive={page.isExamActive}
              setDeviceSearchQuery={page.setDeviceSearchQuery}
              setCableInfo={page.setCableInfo}
              setZoom={page.setZoom}
              setPan={page.setPan}
              handleDeviceSelectFromMenu={page.handleDeviceSelectFromMenu}
              handleUndo={page.handleUndo}
              handleRedo={page.handleRedo}
              handleRefreshNetwork={page.handleRefreshNetwork}
              setIsEnvironmentPanelOpen={page.setIsEnvironmentPanelOpen}
              onOpenStudentJoin={page.onOpenStudentJoin}
              onOpenTeacherPanel={page.onOpenTeacherPanel}
              topologyContainerRef={page.topologyContainerRef}
              topologyKey={page.topologyKey}
              selectedDevice={page.selectedDevice}
              handleDeviceSelectFromCanvas={page.handleDeviceSelectFromCanvas}
              handleDeviceDoubleClick={page.handleDeviceDoubleClick}
              handleDeviceDelete={page.handleDeviceDelete}
              handleDeviceRename={page.handleDeviceRename}
              topologyConnections={page.topologyConnections}
              topologyNotes={page.topologyNotes}
              setDeviceStates={page.setDeviceStates}
              zoom={page.zoom}
              pan={page.pan}
              focusDeviceId={page.focusDeviceId}
              isEditorOpen={page.isEditorOpen}
              setActiveDeviceId={page.setActiveDeviceId}
              setActiveDeviceType={page.setActiveDeviceType}
              setUnifiedDeviceActiveTab={page.setUnifiedDeviceActiveTab}
              setShowUnifiedDeviceModal={page.setShowUnifiedDeviceModal}
              clearSelectionTrigger={page.clearSelectionTrigger}
              setFocusedOverlay={page.setFocusedOverlay}
              focusedOverlay={page.focusedOverlay}
              commitAction={page.commitAction}
              setSelectedDevice={page.setSelectedDevice}
              setShowPCDeviceId={page.setShowPCDeviceId}
              setPcPanelInitialTab={page.setPcPanelInitialTab}
              getOrCreatePCOutputs={page.getOrCreatePCOutputs}
              setIsPingPanelOpen={page.setIsPingPanelOpen}
            />

            <TabletSplitView
              isDark={page.isDark}
              isTablet={page.isTablet}
              showPCPanel={page.showPCPanel}
              setShowPCPanel={page.setShowPCPanel}
              showUnifiedDeviceModal={page.showUnifiedDeviceModal}
              setShowUnifiedDeviceModal={page.setShowUnifiedDeviceModal}
              showRouterPanel={page.showRouterPanel}
              setShowRouterPanel={page.setShowRouterPanel}
              unifiedDeviceActiveTab={page.unifiedDeviceActiveTab}
              setUnifiedDeviceActiveTab={page.setUnifiedDeviceActiveTab}
              activeDeviceId={page.activeDeviceId}
              activeDeviceType={page.activeDeviceType}
              deviceStates={page.deviceStates}
              topologyDevices={page.topologyDevices}
              topologyConnections={page.topologyConnections}
              handleCommand={page.handleCommand}
              handleClearTerminal={page.handleClearTerminal}
              toggleDevicePower={page.toggleDevicePower}
              handleUpdateHistory={page.handleUpdateHistory}
              confirmDialog={page.confirmDialog}
              setConfirmDialog={page.setConfirmDialog}
              t={page.t}
              theme={page.theme}
              language={page.language}
              helpLevel={page.helpLevel}
              isExecutingCommand={page.isExecutingCommand}
              output={page.output}
              prompt={page.prompt}
              state={page.state}
              activeDeviceTasks={page.activeDeviceTasks}
              taskContext={page.taskContext}
              showPCDeviceId={page.showPCDeviceId}
              cableInfo={page.cableInfo}
              pcPanelInitialTab={page.pcPanelInitialTab}
              deviceOutputs={page.deviceOutputs}
              pcOutputs={page.pcOutputs}
              setPcOutputs={page.setPcOutputs as PcOutputsSetter}
              pcHistories={page.pcHistories}
              handleUpdatePCHistory={page.handleUpdatePCHistory}
              handleExecuteCommand={page.handleExecuteCommand}
              handlePCPanelNavigateWrapper={page.handlePCPanelNavigateWrapper}
              handleDeviceDelete={page.handleDeviceDelete}
              showRouterDeviceId={page.showRouterDeviceId}
              focusedOverlay={page.focusedOverlay}
            />

            <RefreshReportPanel
              refreshNetworkReport={page.refreshNetworkReport}
              setRefreshNetworkReport={page.setRefreshNetworkReport}
              refreshReportRef={page.refreshReportRef}
              isMobile={page.isMobile}
              isDark={page.isDark}
              focusedOverlay={page.focusedOverlay}
              setFocusedOverlay={page.setFocusedOverlay}
              language={page.language}
              t={page.t}
              handleRefreshNetwork={page.handleRefreshNetwork}
              liveSummary={page.liveSummary}
              topologyDevices={page.topologyDevices}
              deviceStates={page.deviceStates}
              bringElementToFront={page.bringElementToFront}
              isExamActive={page.isExamActive}
            />
          </main>

          {page.preferences.showFooter && (
            <AppFooter
              t={page.t}
              isDark={page.isDark}
              language={page.language}
              activeTab={page.activeTab}
              hasUnsavedChanges={page.hasUnsavedChanges}
              lastSaveTime={page.lastSaveTime}
              projectName={page.projectName}
              topologyDevices={page.topologyDevices}
              showProjectPicker={page.showProjectPicker}
              showOnboarding={page.showOnboarding}
              setShowAboutModal={page.setShowAboutModal}
              onShortcut={(shortcut) => handlePageShortcut(shortcut, page.topologyDevices, page.activeDeviceId, page.handleDeviceSelectFromMenu)}
            />
          )}

          <PageOverlayPanels
            t={page.t}
            isDark={page.isDark}
            language={page.language}
            showAboutModal={page.showAboutModal}
            setShowAboutModal={page.setShowAboutModal}
            isExamActive={page.isExamActive}
            setShowOnboarding={page.setShowOnboarding}
            setOnboardingStep={page.setOnboardingStep}
            showBasarilarim={page.showBasarilarim}
            setShowBasarilarim={page.setShowBasarilarim}
            isEnvironmentPanelOpen={page.isEnvironmentPanelOpen}
            setIsEnvironmentPanelOpen={page.setIsEnvironmentPanelOpen}

            isGuidedModeActive={page.isGuidedModeActive}
            activeGuidedProject={page.activeGuidedProject}
            guidedStepIndex={page.guidedStepIndex}
            completeStep={page.completeStep}
            uncompleteStep={page.uncompleteStep}
            toggleGuidedMinimize={page.togglePanelMinimize}
            isGuidedPanelMinimized={page.isPanelMinimized}
            lastCompletedStep={page.lastCompletedStep}
            isCurrentStepReady={page.isCurrentStepReady}
            lastCommand={page.lastCommand}
            lastOutput={page.lastOutput}
            showUnifiedDeviceModal={page.showUnifiedDeviceModal}
            activeDeviceType={page.activeDeviceType}
            activeDeviceId={page.activeDeviceId}
            state={page.state}
            deviceStates={page.deviceStates}
            topologyConnections={page.topologyConnections}
            topologyDevices={page.topologyDevices}
            checkStepCompletionWithContext={page.checkStepCompletionWithContext}

            activeExam={page.activeExam}
            closeExam={page.closeExam}
            toggleExamPanelMinimize={page.toggleExamPanelMinimize}
            isExamPanelMinimized={page.isExamPanelMinimized}
            isExamFinished={page.isExamFinished}
            finishExam={page.finishExam}
            examScore={page.examScore}
            checkExamTasks={page.checkExamTasks}
            isExamLoadedFromFile={page.isExamLoadedFromFile}
            toggleEditor={page.toggleEditor}
            isEditorOpen={page.isEditorOpen}

            activeTroubleshootingProject={page.activeTroubleshootingProject}
            showTroubleshootingPanel={page.showTroubleshootingPanel}
            setShowTroubleshootingPanel={page.setShowTroubleshootingPanel}
            isTroubleshootingMinimized={page.isTroubleshootingMinimized}
            setIsTroubleshootingMinimized={page.setIsTroubleshootingMinimized}

            historyItems={page.historyItems}
            historyIndex={page.historyIndex}
            handleJumpTo={page.handleJumpTo}
            isTimelineMinimized={page.isTimelineMinimized}
            toggleTimelineMinimize={page.toggleTimelineMinimize}
            isMobile={page.isMobile}

            addTask={page.addTask}
            updateTask={page.updateTask}
            deleteTask={page.deleteTask}
            updateExamMeta={page.updateExamMeta}
            moveTask={page.moveTask}
            smartBalanceWeights={page.smartBalanceWeights}
            exportExamFile={page.exportExamFile}
            getFullProjectData={page.getFullProjectData}

            showWarning={page.showWarning}
            tabCount={page.tabCount}
            clearCurrentTabData={page.clearCurrentTabData}
            acknowledgeWarning={page.acknowledgeWarning}
            confirmDialog={page.confirmDialog}
            setConfirmDialog={page.setConfirmDialog}
            saveDialog={page.saveDialog}
            setSaveDialog={page.setSaveDialog}
            focusActiveTerminalInput={page.focusActiveTerminalInput}
          />
        </div>
      </div>
    </AppErrorBoundary>
  );
}
