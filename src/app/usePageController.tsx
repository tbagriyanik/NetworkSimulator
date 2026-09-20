'use client';

import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { useNetworkLogic } from '@/hooks/useNetworkLogic';
import { usePageNetworkLogic } from '@/hooks/usePageNetworkLogic';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useMultiTabWarning } from '@/hooks/useMultiTabWarning';
import { useLoadProjectData } from '@/hooks/useLoadProjectData';
import { useIsMobile, useIsTablet } from '@/hooks/use-breakpoint';
import { useMobileBack } from '@/hooks/useMobileBack';
import { usePanels } from '@/hooks/usePanels';
import { useRefreshReport } from '@/hooks/useRefreshReport';
import { useDeviceSelection } from '@/hooks/useDeviceSelection';
import { useAppStore } from '@/lib/store/appStore';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { getPrompt } from '@/lib/network/executor';
import { createInitialState } from '@/lib/network/initialState';
import { addProjectRecord } from '@/utils/achievementRecords';
import type { TerminalOutput } from '@/components/network/Terminal';
import type { SwitchState } from '@/lib/network/types';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

import {
  topologyTasks,
  portTasks,
  vlanTasks,
  securityTasks,
  wirelessTasks,
  routingTasks,
  dhcpTasks,
  calculateTaskScore,
  TaskContext,
  getTaskStatus
} from '@/lib/network/taskDefinitions';
import { useGuidedMode } from '@/hooks/useGuidedMode';
import { useExamMode } from '@/hooks/useExamMode';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import { useWindowStore } from '@/hooks/useWindowStore';

import { bringElementToFront } from '@/lib/utils/zIndex';
import { useUiPreferences } from '@/hooks/useUiPreferences';
import { useRoom } from '@/contexts/RoomContext';
import { useRoomSync } from '@/hooks/useRoomSync';
import { useToast } from '@/hooks/use-toast';

import { useNetworkSimulation } from '@/hooks/useNetworkSimulation';
import { useTroubleshootingMode } from '@/hooks/useTroubleshootingMode';
import { useProjectApplication } from '@/hooks/useProjectApplication';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRefreshNetwork } from '@/hooks/useRefreshNetwork';
import { useLoadProject } from '@/hooks/useLoadProject';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useProjectExport } from '@/hooks/useProjectExport';
import { useProjectReset } from '@/hooks/useProjectReset';
import { useAutoDhcpRenewal } from '@/hooks/useAutoDhcpRenewal';
import { useProjectAutosave } from '@/hooks/useProjectAutosave';
import { useCommandExecution } from '@/hooks/useCommandExecution';
import { usePageGlobalEvents } from '@/hooks/usePageGlobalEvents';
import { useTaskSync } from '@/hooks/useTaskSync';
import { useDeviceDelete } from '@/hooks/useDeviceDelete';
import { useNetworkEventListeners } from '@/hooks/useNetworkEventListeners';
import { usePWA } from '@/hooks/usePWA';
import { computeLiveSummary } from '@/lib/network/liveSummary';

import { TabType, ALL_TABS, exampleLevelOrder } from './page.types';
import { usePageProjectStorage } from './usePageProjectStorage';
import { usePageModalManagement } from './usePageModalManagement';
import { usePageTopologyCallbacks } from './usePageTopologyCallbacks';

import { usePageHistoryManager } from './usePageHistoryManager';
import { usePageSyncEffects } from './usePageSyncEffects';
import { usePageInitialLoad } from './usePageInitialLoad';
import { usePageViewState } from './usePageViewState';
import { useDeviceEdit } from './useDeviceEdit';
import { usePageWorkspaceState } from '@/hooks/usePageWorkspaceState';
import { usePageModalDrags } from './usePageModalDrags';

export function usePageController({ initialProjectId }: { initialProjectId?: string }) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, effectiveTheme, setTheme } = useTheme();
  const isTR = language === 'tr';

  // Multi-tab warning system
  const { showWarning, tabCount, acknowledgeWarning, clearCurrentTabData } = useMultiTabWarning();
  const { toast } = useToast();
  const { studentRoomCode, studentDisplayName, setShowRoomJoinDialog, setShowTeacherPanel } = useRoom();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalHistoryPushedRef = useRef(false);
  const refreshReportRef = useRef<HTMLDivElement>(null);

  const {
    showPCPanel, setShowPCPanel,
    showFirewallPanel, setShowFirewallPanel,
    activeFirewallId, setActiveFirewallId,
    firewallActiveTab, setFirewallActiveTab,
    pcPanelInitialTab, setPcPanelInitialTab,
    showPCDeviceId, setShowPCDeviceId,
    showRouterPanel, setShowRouterPanel,
    showRouterDeviceId, setShowRouterDeviceId,
    showUnifiedDeviceModal, setShowUnifiedDeviceModal,
    unifiedDeviceActiveTab, setUnifiedDeviceActiveTab,
    showAboutModal, setShowAboutModal,
    showMobileMenu, setShowMobileMenu,
    isEnvironmentPanelOpen, setIsEnvironmentPanelOpen,
    showProjectPicker, setShowProjectPicker,
    projectPickerTab, setProjectPickerTab,
    showOnboarding, setShowOnboarding,
    onboardingStep, setOnboardingStep,
    closeAllPanels,
  } = usePanels();

  const { refreshNetworkReport, setRefreshNetworkReport } = useRefreshReport();
  const {
    activeDeviceId, setActiveDeviceId,
    activeDeviceType, setActiveDeviceType,
    selectedDevice, setSelectedDevice,
    clearSelectionTrigger, setClearSelectionTrigger,
    deviceSearchQuery, setDeviceSearchQuery,
    focusDeviceId, setFocusDeviceId,
  } = useDeviceSelection();

  const { projectName, setProjectName, loadedExampleId, setLoadedExampleId } = usePageProjectStorage();

  const {
    topologyKey,
    setTopologyKey,
    lastCommand,
    setLastCommand,
    lastOutput,
    setLastOutput,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    lastSaveTime,
    setLastSaveTime,
    projectSearchQuery,
    setProjectSearchQuery,
    showBasarilarim,
    setShowBasarilarim,
    isGeneratorOpen,
    setIsGeneratorOpen,
    sessionStart,
    focusedOverlay,
    setFocusedOverlay,
    cableInfo,
    setCableInfo,
    setLastTaskEvent,
    isPingPanelOpen,
    setIsPingPanelOpen,
    isExamLoadedFromFile,
    setIsExamLoadedFromFile,
    isTimelineMinimized,
    setIsTimelineMinimized,
    toggleTimelineMinimize,
    saveDialog,
    setSaveDialog,
    groupedExampleProjects,
  } = usePageViewState(language);

  usePWA();

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  useMobileBack();

  useEffect(() => {
    const handleMobileBack = () => {
      setRefreshNetworkReport(prev => prev ? { ...prev, show: false } : null);
    };
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack);
  }, [setRefreshNetworkReport]);

  // Guided Mode hook
  const {
    activeProject: activeGuidedProject,
    currentStepIndex: guidedStepIndex,
    isGuidedModeActive,
    isPanelMinimized,
    lastCompletedStep,
    startGuidedProject,
    completeStep,
    uncompleteStep,
    closeGuidedMode,
    togglePanelMinimize,
    expandPanel,
    checkStepCompletionWithContext,
    isCurrentStepReady,
    getAvailableProjects,
    isAllCompleted,
    currentPoints,
    totalPoints
  } = useGuidedMode();

  // Exam Mode hook
  const {
    activeExam,
    isExamActive,
    isExamFinished,
    isPanelMinimized: isExamPanelMinimized,
    startExam: startExamProject,
    finishExam,
    closeExam,
    togglePanelMinimize: toggleExamPanelMinimize,
    isEditorOpen,
    toggleEditor,
    addTask,
    updateTask,
    deleteTask,
    updateExamMeta,
    moveTask,
    smartBalanceWeights,
    exportExamFile,
    checkTasks: checkExamTasks,
    currentScore: examScore,
    getAvailableExams
  } = useExamMode();

  const { preferences } = useUiPreferences();

  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const resetWorkspaceUiState = useCallback(() => {
    useMultiWindowStore.getState().closeAllDeviceWindows();
    setActiveDeviceId('');
    setActiveDeviceType('switchL2');
    setSelectedDevice(null);
    setClearSelectionTrigger(prev => prev + 1);
    setShowPCPanel(false);
    setShowFirewallPanel(false);
    setActiveFirewallId(null);
    setFirewallActiveTab('console');
    setPcPanelInitialTab('home');
    setShowPCDeviceId('pc-1');
    setShowRouterPanel(false);
    setShowRouterDeviceId('router-1');
    setShowUnifiedDeviceModal(false);
    setUnifiedDeviceActiveTab('console');
    setShowAboutModal(false);
    setShowMobileMenu(false);
    setShowProjectPicker(false);
    setProjectPickerTab('all');
    setShowOnboarding(false);
    setOnboardingStep(0);
    setIsEnvironmentPanelOpen(false);
    setActiveTab('topology');
    setIsTimelineMinimized(true);
    setRefreshNetworkReport(null);
    setProjectSearchQuery('');
    setLoadedExampleId('');

    setLastCommand('');
    setLastOutput('');
    setIsPingPanelOpen(false);
    setCableInfo({ connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' });
    setFocusedOverlay('packet');
    setLastTaskEvent(null);
  }, [
    setActiveDeviceId, setActiveDeviceType, setSelectedDevice, setClearSelectionTrigger,
    setShowPCPanel, setShowFirewallPanel, setActiveFirewallId, setFirewallActiveTab,
    setPcPanelInitialTab, setShowPCDeviceId, setShowRouterPanel, setShowRouterDeviceId,
    setShowUnifiedDeviceModal, setUnifiedDeviceActiveTab, setShowAboutModal, setShowMobileMenu,
    setShowProjectPicker, setProjectPickerTab, setShowOnboarding, setOnboardingStep,
    setIsEnvironmentPanelOpen, setActiveTab, setRefreshNetworkReport, setProjectSearchQuery,
    setLoadedExampleId, setLastCommand, setLastOutput, setIsPingPanelOpen, setCableInfo,
    setFocusedOverlay, setLastTaskEvent
  ]);

  const {
    deviceStates, setDeviceStates,
    deviceOutputs, setDeviceOutputs,
    pcOutputs, setPcOutputs,
    pcHistories, setPcHistories,
    isLoading: isExecutingCommand,
    confirmDialog, setConfirmDialog,
    getOrCreateDeviceState,
    getOrCreateDeviceOutputs,
    getOrCreatePCOutputs,
    handleCommandForDevice,
  } = useDeviceManager();

  const { topologyDevices, topologyConnections, topologyNotes, zoom, pan, activeTab, environment, helpLevel, setHelpLevel, setDevices, setConnections, setNotes, setZoom, setPan, graphicsQuality, setGraphicsQuality } = usePageWorkspaceState();

  const nav = useAppNavigation({
    setActiveTab: (tab: TabType) => setActiveTab(tab),
    setActiveDeviceId,
    setActiveDeviceType,
    setSelectedDevice,
    setZoom,
    setPan,
    topologyDevices,
    getOrCreatePCOutputs,
    getOrCreateDeviceState,
    getOrCreateDeviceOutputs,
  });
  const {
    setActiveTabWithHistory, handlePCPanelNavigate,
    focusDeviceInTopology, activeTabRef, topologyContainerRef,
  } = nav;

  const networkLogic = useNetworkLogic(deviceStates, topologyConnections, environment);
  const { toggleDevicePower, updateDeviceConfig } = usePageNetworkLogic({
    setDeviceStates,
    topologyDevices,
    setTopologyDevices: setDevices,
    setTopologyConnections: setConnections,
    setDeviceOutputs,
    setPcOutputs,
    setPcHistories,
    setFocusDeviceId,
    setActiveFirewallId,
    setShowFirewallPanel,
    toast,
    t,
    activeTab,
    topologyContainerRef,
    setZoom,
    focusDeviceInTopology,
    pendingFocusDeviceRef: nav.pendingFocusDeviceRef,
    graphicsQuality,
  });

  useEffect(() => {
    const handleOpenPcPanelEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ deviceId?: string; program?: string; targetUrl?: string }>;
      const targetPcId = customEv.detail?.deviceId || topologyDevices.find(d => d.type === 'pc')?.id || 'pc-1';
      if (targetPcId) {
        setShowPCDeviceId(targetPcId);
        getOrCreatePCOutputs(targetPcId, topologyDevices);
        setPcPanelInitialTab('desktop');
        useMultiWindowStore.getState().openDeviceWindow(targetPcId, 'pc', 'desktop');
        useMultiWindowStore.getState().restoreWindow(targetPcId);
        useWindowStore.getState().setActiveWindow(targetPcId);
      }
    };

    window.addEventListener('trigger-open-pc-panel', handleOpenPcPanelEvent);
    return () => window.removeEventListener('trigger-open-pc-panel', handleOpenPcPanelEvent);
  }, [topologyDevices, getOrCreatePCOutputs, setShowPCDeviceId, setPcPanelInitialTab]);

  const {
    isTroubleshootingMinimized, setIsTroubleshootingMinimized,
    showTroubleshootingPanel, setShowTroubleshootingPanel,
    activeTroubleshootingProject
  } = useTroubleshootingMode({
    activeExam,
    loadedExampleId,
    exampleLevelOrder,
    groupedExampleProjects,
    deviceStates,
    language,
    toast
  });

  const { handleDeviceSelectFromCanvas, handleDeviceSelectFromMenu } = usePageTopologyCallbacks({
    selectFromCanvas: nav.handleDeviceSelectFromCanvas,
    selectFromMenu: nav.handleDeviceSelectFromMenu,
    restoreSelectedWindow: (deviceId) => {
      const windowStore = useMultiWindowStore.getState();
      if (windowStore.isWindowOpen(deviceId)) {
        windowStore.restoreWindow(deviceId);
        useWindowStore.getState().setActiveWindow(deviceId);
      }
    },
    closeUnified: setShowUnifiedDeviceModal,
    closeRouter: setShowRouterPanel,
    closeFirewall: setShowFirewallPanel,
    closePC: setShowPCPanel,
    setActiveDeviceId,
    checkStepCompletion: checkStepCompletionWithContext,
    deviceStates,
    topologyConnections,
    topologyDevices,
  });

  const handlePCPanelNavigateWrapper = useCallback((program: string) => {
    handlePCPanelNavigate(program, activeDeviceId);
  }, [handlePCPanelNavigate, activeDeviceId]);

  const closeEscLikeWindows = useCallback(() => {
    setShowMobileMenu(false);
    setConfirmDialog(null);
    setSaveDialog(null);
    setShowPCPanel(false);
    setShowRouterPanel(false);
    setShowUnifiedDeviceModal(false);
    setShowAboutModal(false);
    setShowProjectPicker(false);
    setShowOnboarding(false);
    setShowBasarilarim(false);
    setShowTeacherPanel(false);
    setShowRoomJoinDialog(false);
    setIsGeneratorOpen(false);
    if (!isExamActive) {
      setRefreshNetworkReport(prev => prev ? { ...prev, show: false } : null);
    }
    window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'escape' } }));
  }, [isExamActive, setRefreshNetworkReport, setShowTeacherPanel, setShowRoomJoinDialog, setShowMobileMenu, setConfirmDialog, setSaveDialog, setShowPCPanel, setShowRouterPanel, setShowUnifiedDeviceModal, setShowAboutModal, setShowProjectPicker, setShowOnboarding, setShowBasarilarim, setIsGeneratorOpen]);

  useEffect(() => {
    const handleMobileBack = () => {
      closeEscLikeWindows();
      closeAllPanels();
    };
    window.addEventListener('mobile-back-pressed', handleMobileBack as EventListener);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack as EventListener);
  }, [closeAllPanels, closeEscLikeWindows]);

  usePageModalManagement({
    hasUnsavedChanges,
    modalHistoryPushedRef,
    showMobileMenu,
    confirmDialog,
    saveDialog,
    showPCPanel,
    showFirewallPanel,
    showRouterPanel,
    showUnifiedDeviceModal,
    showAboutModal,
    showProjectPicker,
    showOnboarding,
    setShowMobileMenu,
    setConfirmDialog,
    setSaveDialog,
    setShowPCPanel,
    setShowRouterPanel,
    setShowUnifiedDeviceModal,
    setShowAboutModal,
    setShowProjectPicker,
    setShowOnboarding,
    setShowBasarilarim,
  });

  const setTopologyDevices = setDevices;
  const setTopologyConnections = setConnections;
  const setTopologyNotes = setNotes;

  useNetworkSimulation(deviceStates, setTopologyDevices, networkLogic);

  const liveSummary = useMemo(
    () => computeLiveSummary(topologyDevices, topologyConnections, deviceStates),
    [topologyDevices, topologyConnections, deviceStates]
  );

  useEffect(() => {
    if (topologyContainerRef.current) {
      topologyContainerRef.current.scrollTop = 0;
      topologyContainerRef.current.scrollLeft = 0;
    }
  }, [topologyKey, topologyContainerRef]);

  const { pcDrag, firewallDrag, unifiedDrag, routerDrag } = usePageModalDrags();

  const {
    isAppLoading,
    showSkeleton,
    hasHydrated,
  } = usePageInitialLoad({
    initialProjectId,
    language,
    applyExampleProject: (_data, id) => {
      import('@/lib/network/exampleProjects').then(({ exampleProjects }) => {
        const example = exampleProjects(language).find(p => p.id === id);
        if (example) applyExampleProject(example.data, example.id);
      });
    },
    handleStartGuidedProject: (lesson) => handleStartGuidedProject(lesson),
    startExamFromCatalog: (exam) => startExamFromCatalog(exam),
    loadProjectData: (data, opts) => loadProjectData(data, opts),
    setLastSaveTime,
  });

  const {
    canUndo, canRedo, resetHistory, historyItems, historyIndex, loadHistory,
    handleUndo, handleRedo, handleJumpTo, commitAction,
  } = usePageHistoryManager({
    topologyDevices, topologyConnections, topologyNotes, deviceStates, deviceOutputs, pcOutputs, pcHistories,
    cableInfo, activeDeviceId, activeDeviceType, zoom, pan, activeTab, isAppLoading, activeTabRef,
    setTopologyDevices, setTopologyConnections, setTopologyNotes, setDeviceStates, setDeviceOutputs,
    setPcOutputs, setPcHistories, setCableInfo, setActiveDeviceId, setActiveDeviceType, setZoom, setPan, setActiveTab,
  });

  const state = useMemo(() => {
    if (!activeDeviceId || activeDeviceId.trim() === '') {
      return createInitialState();
    }
    const activeDevice = (topologyDevices || []).find(d => d.id === activeDeviceId);
    const resolvedType = activeDevice?.type ?? activeDeviceType;
    return getOrCreateDeviceState(activeDeviceId, resolvedType, activeDevice?.name, activeDevice?.macAddress, activeDevice?.switchModel, activeDevice?.services);
  }, [activeDeviceId, activeDeviceType, topologyDevices, deviceStates, getOrCreateDeviceState]);

  const output = useMemo(() => {
    if (!activeDeviceId || activeDeviceId.trim() === '') {
      return [] as TerminalOutput[];
    }
    return getOrCreateDeviceOutputs(activeDeviceId, state);
  }, [activeDeviceId, state, getOrCreateDeviceOutputs]);

  const isTaskSystemEnabled = activeDeviceType === 'switchL2' || activeDeviceType === 'switchL3' || activeDeviceType === 'router';
  const activeDeviceTasks = useMemo(
    () => isTaskSystemEnabled
      ? [...topologyTasks, ...portTasks, ...vlanTasks, ...securityTasks, ...dhcpTasks, ...(activeDeviceType === 'router' || activeDeviceType === 'switchL3' ? routingTasks : []), ...(activeDeviceType !== 'switchL2' ? wirelessTasks : [])]
      : [],
    [activeDeviceType, isTaskSystemEnabled]
  );

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab, activeTabRef]);

  const taskContext: TaskContext = {
    cableInfo, showPCPanel, showRouterPanel, selectedDevice, language, deviceStates, topologyConnections,
  };

  useTaskSync({
    isTaskSystemEnabled, activeDeviceTasks, state, taskContext, language, activeDeviceType, setLastTaskEvent,
  });

  const totalScore = isTaskSystemEnabled ? calculateTaskScore(activeDeviceTasks, state, taskContext) : 0;
  const maxScore = activeDeviceTasks.reduce((acc, task) => acc + task.weight, 0);

  const completedTaskCount = activeDeviceTasks.filter(t => getTaskStatus(t, state, taskContext)).length;
  const totalTaskCount = activeDeviceTasks.length;
  const currentTaskName = activeDeviceTasks.length > 0
    ? activeDeviceTasks.find(t => !getTaskStatus(t, state, taskContext))?.name[language] ?? activeDeviceTasks[activeDeviceTasks.length - 1].name[language]
    : '';

  useRoomSync({
    roomCode: studentRoomCode,
    displayName: studentDisplayName,
    currentTask: currentTaskName,
    completedTasks: completedTaskCount,
    totalTasks: totalTaskCount,
    projectFile: projectName !== 'Untitled' ? projectName : undefined,
    durationMinutes: activeExam?.durationMinutes,
  });

  const { normalizeDeviceType, isValidIpv4, isSameSubnetByMask,
    buildLinkLocalLease, assignDhcpLeaseForPc, applyLinkLocalToUnconfiguredHosts,
    applyIotAutomationPass: iotAutomationPass } = networkLogic;

  useProjectAutosave({
    isAppLoading, topologyDevices, topologyConnections, topologyNotes, deviceStates, deviceOutputs, pcOutputs, pcHistories,
    cableInfo, activeDeviceId, activeDeviceType, activeTab, zoom, pan, setLastSaveTime, setHasUnsavedChanges,
  });

  useEffect(() => {
    if (!refreshNetworkReport?.show || !refreshReportRef.current) return;
    if (isMobile) return;
    try {
      const saved = localStorage.getItem('draggable_position_refresh-network-report');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const el = refreshReportRef.current;
          const rect = el.getBoundingClientRect();
          const safeX = Math.max(4, Math.min(parsed.x, vw - rect.width - 4));
          const safeY = Math.max(128, Math.min(parsed.y, vh - rect.height - 4));
          el.style.position = 'fixed';
          el.style.left = `${safeX}px`;
          el.style.top = `${safeY}px`;
          el.style.right = 'auto';
          el.style.bottom = 'auto';
          el.style.transform = 'none';
        }
      }
    } catch { /* ignore */ }
  }, [refreshNetworkReport?.show, isMobile]);

  const loadProjectData = useLoadProjectData({
    setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories, setActiveDeviceId, setActiveDeviceType,
    setSelectedDevice, setCableInfo, setTopologyKey, setHasUnsavedChanges, resetHistory, loadHistory,
    normalizeDeviceType, applyLinkLocalToUnconfiguredHosts, resetWorkspaceUiState, startExamProject,
  });

  const handleRefreshNetwork = useRefreshNetwork({
    setActiveDeviceId, setSelectedDevice, setTopologyConnections, setPcOutputs, setDeviceStates, setTopologyDevices,
    setRefreshNetworkReport, topologyDevices, topologyConnections, deviceStates, pcOutputs, language, t, isValidIpv4,
    isSameSubnetByMask, iotAutomationPass, assignDhcpLeaseForPc, buildLinkLocalLease, toast,
  });

  useAutoDhcpRenewal({
    topologyDevices, deviceStates, assignDhcpLeaseForPc, buildLinkLocalLease, setTopologyDevices, pcOutputs, setPcOutputs,
    loadedExampleId, toast, language, t, handleRefreshNetwork, setLoadedExampleId,
  });

  const { onboardingSteps, closeOnboardingForever, nextOnboarding, prevOnboarding } = useOnboarding({
    t, setShowOnboarding, setOnboardingStep, onboardingStep, isAppLoading, hasHydrated,
  });

  useEffect(() => {
    const currentTabDef = ALL_TABS.find(t => t.id === activeTab);
    if (currentTabDef && !currentTabDef.showFor.includes(activeDeviceType)) {
      setActiveTabWithHistory('topology');
    }
  }, [activeDeviceType, activeTab, setActiveTabWithHistory]);

  const { handleCommand, handleExecuteCommand } = useCommandExecution({
    activeDeviceId, activeDeviceType, topologyDevices, topologyConnections, deviceStates, state, isGuidedModeActive,
    showUnifiedDeviceModal, setActiveDeviceId, setActiveDeviceType, setActiveTab, setLastCommand, setLastOutput, commitAction,
    checkStepCompletionWithContext, handleCommandForDevice,
  });

  const prompt = getPrompt(state);

  usePageGlobalEvents({
    topologyDevices, topologyConnections, deviceStates, state, isGuidedModeActive, setLastCommand, setLastOutput, commitAction,
    checkStepCompletionWithContext, setShowPCDeviceId, setPcPanelInitialTab, setShowPCPanel, setActiveDeviceId, setActiveDeviceType,
    setUnifiedDeviceActiveTab, setShowUnifiedDeviceModal, setActiveTab,
  });

  const handleClearTerminal = () => {
    setDeviceOutputs(prev => {
      const newMap = new Map(prev);
      newMap.set(activeDeviceId, []);
      return newMap;
    });
  };

  const focusActiveTerminalInput = useCallback(() => {
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-terminal-input]') as HTMLInputElement | null;
      const terminal = document.querySelector('[data-terminal-scroll]') as HTMLDivElement | null;
      if (terminal) {
        terminal.scrollTop = terminal.scrollHeight;
      }
      el?.focus();
    });
  }, []);

  const { handleDeviceDoubleClick, handleDeviceRename, handleUpdateHistory, handleUpdatePCHistory } = useDeviceEdit({ topologyDevices, setActiveDeviceId, setActiveDeviceType, setShowPCDeviceId, setPcPanelInitialTab, setUnifiedDeviceActiveTab, setDeviceStates, setPcHistories, getOrCreatePCOutputs, getOrCreateDeviceState, getOrCreateDeviceOutputs, setTopologyDevices });

  const handleDeviceDelete = useDeviceDelete({
    showPCDeviceId, showRouterDeviceId, activeDeviceId, selectedDevice, setShowPCPanel, setShowPCDeviceId, setShowRouterPanel,
    setShowRouterDeviceId, setSelectedDevice, setActiveDeviceId, setActiveDeviceType, setTopologyConnections, setDeviceStates,
    setDeviceOutputs, setPcOutputs, setTopologyDevices, setActiveTab, setHasUnsavedChanges,
  });


  const { handleSaveProject, getFullProjectData } = useProjectExport({
    deviceStates, deviceOutputs, pcOutputs, pcHistories, topologyDevices, topologyConnections, topologyNotes, cableInfo,
    activeDeviceId, activeDeviceType, historyItems, historyIndex, activeExam, language, projectName, setProjectName,
    setHasUnsavedChanges, setLastSaveTime, toast, addProjectRecord, t,
  });

  const { resetToEmptyProject } = useProjectReset({
    setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories, setTopologyDevices, setTopologyConnections,
    setTopologyNotes, setActiveDeviceId, setActiveDeviceType, setSelectedDevice, setShowPCPanel, setShowRouterPanel,
    setActiveTab, setHasUnsavedChanges, setTopologyKey, setZoom, setPan, closeGuidedMode, closeExam, setProjectName,
    setRefreshNetworkReport, resetHistory,
  });

  const runWithSaveGuard = useCallback((action: () => void) => {
    if (hasUnsavedChanges) {
      setSaveDialog({
        show: true,
        message: t.unsavedChangesConfirm,
        onConfirm: (save: boolean) => {
          setSaveDialog(null);
          if (save) {
            handleSaveProject();
          }
          action();
        }
      });
      return;
    }
    action();
  }, [hasUnsavedChanges, handleSaveProject, setSaveDialog, t.unsavedChangesConfirm]);

  const handleGeneratedTopology = useCallback((data: {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    deviceStates: Map<string, SwitchState>;
    projectName?: string;
    projectDescription?: string;
  }) => {
    resetWorkspaceUiState();
    resetToEmptyProject();
    setDevices(data.devices);
    setConnections(data.connections);
    setDeviceStates(data.deviceStates);
    setNotes([]);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    if (data.projectName) {
      setProjectName(data.projectName);
    }

    if (data.projectDescription) {
      localStorage.setItem('lastProjectDescription', data.projectDescription);
    } else {
      localStorage.removeItem('lastProjectDescription');
    }

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('add-summary-note'));
    }, 500);
  }, [resetWorkspaceUiState, resetToEmptyProject, setDevices, setConnections, setDeviceStates, setNotes, setZoom, setPan, setProjectName]);

  useEffect(() => {
    const handleOpenGenerator = () => setIsGeneratorOpen(true);
    window.addEventListener('trigger-topology-generator', handleOpenGenerator);
    return () => window.removeEventListener('trigger-topology-generator', handleOpenGenerator);
  }, [setIsGeneratorOpen]);

  function handleNewProject() {
    setProjectSearchQuery('');
    closeExam();
    resetWorkspaceUiState();
    runWithSaveGuard(() => setShowProjectPicker(true));
  }

  usePageSyncEffects({
    sessionStart, activeGuidedProject, isAllCompleted, currentPoints, totalPoints, isExamFinished, activeExam, examScore,
    isExamActive, helpLevel, setHelpLevel, topologyDevices, deviceStates, setTopologyDevices, setHasUnsavedChanges,
    topologyConnections, handleRefreshNetwork,
  });

  const tabs = [{ ...ALL_TABS[0], label: t.networkTopology }];

  useKeyboardShortcuts({
    showMobileMenu, confirmDialog, saveDialog, showPCPanel, showRouterPanel, showFirewallPanel, showUnifiedDeviceModal,
    showAboutModal, showProjectPicker, showOnboarding, isTimelineMinimized, selectedDevice, activeDeviceId, activeTab,
    topologyDevices, activeTabRef, fileInputRef, handleSaveProject, handleNewProject, handleUndo, handleRedo, handleDeviceDoubleClick,
    handleRefreshNetwork, closeEscLikeWindows, getOrCreateDeviceState, getOrCreateDeviceOutputs, setShowMobileMenu, setShowPCPanel,
    setShowRouterPanel, setShowProjectPicker, setShowAboutModal, setTopologyKey, setIsTimelineMinimized, setClearSelectionTrigger,
    setSelectedDevice, setActiveDeviceId, setActiveDeviceType, setActiveTab, setUnifiedDeviceActiveTab, setShowUnifiedDeviceModal, tabs,
  });

  useNetworkEventListeners({
    setDeviceStates, deviceStates, activeTabRef, setActiveTab,
  });

  const handleLoadProject = useLoadProject({
    loadProjectData: loadProjectData as (data: unknown) => boolean, setHasUnsavedChanges, setProjectName,
    closeGuidedMode, closeExam, setRefreshNetworkReport, setIsExamLoadedFromFile, startExamProject, resetToEmptyProject,
    hasUnsavedChanges, handleSaveProject, setSaveDialog, language, t, toast,
  });

  const {
    applyExampleProjectAsTemplate, applyExampleProject, startExamFromCatalog, handleConvertProjectToExam, handleStartGuidedProject,
  } = useProjectApplication({
    loadProjectData, setShowProjectPicker, setZoom, setPan, setProjectName, setLoadedExampleId, setRefreshNetworkReport,
    closeGuidedMode, closeExam, startExamProject, startGuidedProject, toggleEditor, setIsExamLoadedFromFile, resetWorkspaceUiState,
    resetToEmptyProject, groupedExampleProjects, exampleLevelOrder, projectName, language, toast,
  });

  useEffect(() => {
    if (activeGuidedProject) {
      setTimeout(() => setProjectName(activeGuidedProject.title), 0);

      if (guidedStepIndex < activeGuidedProject.steps.length) {
        const step = activeGuidedProject.steps[guidedStepIndex];
        const targetId = step.checkParams?.targetDeviceId || step.checkParams?.sourceDevice;
        if (targetId) {
          const device = topologyDevices.find(d => d.id === targetId);
          if (device) {
            setFocusDeviceId(targetId);
            focusDeviceInTopology(targetId, 1.0, device);
            setTimeout(() => setFocusDeviceId(null), 3000);
          }
        }
      }
    } else if (activeExam) {
      const examTitleStr = typeof activeExam.title === 'string'
        ? activeExam.title
        : (language === 'tr' ? activeExam.title.tr : activeExam.title.en);
      setTimeout(() => setProjectName(examTitleStr), 0);
      if (activeExam.isCustom && activeExam.tasks.length === 0) {
        toggleEditor(true);
      }
    }
  }, [activeGuidedProject, activeExam, toggleEditor, setProjectName, guidedStepIndex, topologyDevices, setFocusDeviceId, focusDeviceInTopology, language]);

  const isDark = (effectiveTheme ?? theme) === 'dark';
  const isRoomEnabled = process.env.NEXT_PUBLIC_IS_ROOM_ENABLED === 'true';

  return {
    t,
    language,
    setLanguage,
    theme,
    setTheme,
    isDark,
    isAppLoading,
    showSkeleton,
    hasHydrated,
    isPingPanelOpen,
    isExamActive,
    graphicsQuality,
    setGraphicsQuality,
    activeDeviceType,
    activeDeviceId,
    totalScore,
    maxScore,
    topologyDevices,
    deviceStates,
    handleNewProject,
    handleSaveProject,
    handleLoadProject,
    fileInputRef,
    showMobileMenu,
    setShowMobileMenu,
    setShowProjectPicker,
    setShowOnboarding,
    setOnboardingStep,
    handleRefreshNetwork,
    isGuidedModeActive,
    isPanelMinimized,
    expandPanel,
    setShowAboutModal,
    showBasarilarim,
    setShowBasarilarim,
    helpLevel,

    isGeneratorOpen,
    setIsGeneratorOpen,
    handleGeneratedTopology,
    showProjectPicker,
    projectPickerTab,
    setProjectPickerTab,
    projectSearchQuery,
    setProjectSearchQuery,
    groupedExampleProjects,
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
    showOnboarding,
    onboardingStep,
    onboardingSteps,
    closeOnboardingForever,
    prevOnboarding,
    nextOnboarding,

    isTablet,
    isTR,
    showUnifiedDeviceModal,
    setShowUnifiedDeviceModal,
    unifiedDeviceActiveTab,
    setUnifiedDeviceActiveTab,
    deviceOutputs,
    topologyConnections,
    handleCommand,
    handleClearTerminal,
    handleUpdateHistory,
    confirmDialog,
    setConfirmDialog,
    isExecutingCommand,
    output,
    prompt,
    state,
    activeDeviceTasks,
    taskContext,
    unifiedDrag,
    firewallDrag,
    showFirewallPanel,
    setShowFirewallPanel,
    activeFirewallId,
    firewallActiveTab,
    setFirewallActiveTab,
    handleExecuteCommand,
    toggleDevicePower,
    updateDeviceConfig,
    showPCPanel,
    setShowPCPanel,
    showPCDeviceId,
    cableInfo,
    pcPanelInitialTab,
    pcOutputs,
    setPcOutputs,
    pcHistories,
    handleUpdatePCHistory,
    handlePCPanelNavigateWrapper,
    handleDeviceDelete,
    focusedOverlay,
    pcDrag,
    showRouterPanel,
    setShowRouterPanel,
    showRouterDeviceId,
    routerDrag,

    preferences,
    activeTab,
    isPingPanelOpenState: isPingPanelOpen,
    deviceSearchQuery,
    canUndo,
    canRedo,
    setDeviceSearchQuery,
    setCableInfo,
    handleDeviceSelectFromMenu,
    handleUndo,
    handleRedo,
    onOpenStudentJoin: isRoomEnabled ? () => setShowRoomJoinDialog(true) : undefined,
    onOpenTeacherPanel: isRoomEnabled && !studentRoomCode ? () => setShowTeacherPanel(true) : undefined,
    topologyContainerRef,
    topologyKey,
    selectedDevice,
    handleDeviceSelectFromCanvas,
    handleDeviceDoubleClick,
    handleDeviceRename,
    topologyNotes,
    setDeviceStates,
    zoom,
    pan,
    focusDeviceId,
    isEditorOpen,
    setActiveDeviceId,
    setActiveDeviceType,
    clearSelectionTrigger,
    setFocusedOverlay,
    commitAction,
    setSelectedDevice,
    setShowPCDeviceId,
    setPcPanelInitialTab,
    getOrCreatePCOutputs,
    setIsPingPanelOpen,

    refreshNetworkReport,
    setRefreshNetworkReport,
    refreshReportRef,
    isMobile,
    liveSummary,
    bringElementToFront,

    hasUnsavedChanges,
    lastSaveTime,
    projectName,

    showAboutModal,
    isEnvironmentPanelOpen,
    setIsEnvironmentPanelOpen,
    activeGuidedProject,
    guidedStepIndex,
    checkStepCompletionWithContext,
    completeStep,
    uncompleteStep,
    togglePanelMinimize,
    lastCompletedStep,
    isCurrentStepReady,
    lastCommand,
    lastOutput,

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

    activeTroubleshootingProject,
    showTroubleshootingPanel,
    setShowTroubleshootingPanel,
    isTroubleshootingMinimized,
    setIsTroubleshootingMinimized,

    historyItems,
    historyIndex,
    handleJumpTo,
    isTimelineMinimized,
    toggleTimelineMinimize,

    addTask,
    updateTask,
    deleteTask,
    updateExamMeta,
    moveTask,
    smartBalanceWeights,
    exportExamFile,
    getFullProjectData,

    showWarning,
    tabCount,
    clearCurrentTabData,
    acknowledgeWarning,
    saveDialog,
    setSaveDialog,
    focusActiveTerminalInput,
  };
}
