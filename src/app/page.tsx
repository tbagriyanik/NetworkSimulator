'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import { CableInfo } from '@/lib/network/types';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { useNetworkLogic } from '@/hooks/useNetworkLogic';
import { usePageNetworkLogic } from '@/hooks/usePageNetworkLogic';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useDrag } from '@/hooks/useDrag';
import { useMultiTabWarning } from '@/hooks/useMultiTabWarning';
import { useLoadProjectData } from '@/hooks/useLoadProjectData';
import { useIsMobile, useIsTablet } from '@/hooks/use-breakpoint';
import { useMobileBack } from '@/hooks/useMobileBack';
import { usePanels } from '@/hooks/usePanels';
import { useRefreshReport } from '@/hooks/useRefreshReport';
import { useDeviceSelection } from '@/hooks/useDeviceSelection';
import { useAppStore, useTopologyDevices, useTopologyConnections, useTopologyNotes, useZoom, usePan, useActiveTab, useEnvironment } from '@/lib/store/appStore';
import { cn } from '@/lib/utils';
import { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/networkTopology.types';
import { getPrompt } from '@/lib/network/executor';
import { createInitialState } from '@/lib/network/initialState';
import { buildRunningConfig } from '@/lib/network/core/configBuilder';
import { addProjectRecord } from '@/utils/achievementRecords';
import type { TerminalOutput } from '@/components/network/Terminal';
import type { PcOutputsSetter } from '@/components/network/pc-panel/PCPanel.types';

const NetworkTopology = dynamic(
  () => import('@/components/network/NetworkTopology').then((m) => m.NetworkTopology),
  { ssr: false }
);

import { NetworkErrorBoundary } from '@/components/network/NetworkErrorBoundary';

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
import type { ExampleProject, ExampleProjectLevel } from '@/lib/network/exampleProjects';
import { useGuidedMode } from '@/hooks/useGuidedMode';
import { useExamMode } from '@/hooks/useExamMode';
import { MultiDeviceWindowManager } from '@/components/network/MultiDeviceWindowManager';
import { WindowSwitcherModal } from '@/components/network/WindowSwitcherModal';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import { useWindowStore } from '@/hooks/useWindowStore';

import { PCInfoPopover, RouterInfoPopover } from '@/components/network/DeviceInfoPopovers';
import { AppHeader } from '@/components/network/AppHeader';
import { AppFooter } from '@/components/network/AppFooter';
import { TopologyToolbar } from '@/components/network/TopologyToolbar';
import { bringElementToFront } from '@/lib/utils/zIndex';
import { AppSkeleton } from '@/components/ui/AppSkeleton';
import { useUiPreferences } from '@/hooks/useUiPreferences';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
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

const { RouterPanel, UnifiedDevicePanel, PCWindow, FirewallWindow, TabletSplitView, RefreshReportPanel } = {
  RouterPanel: dynamic(() => import('@/components/network/panels').then((m) => m.RouterPanel)),
  UnifiedDevicePanel: dynamic(() => import('@/components/network/panels').then((m) => m.UnifiedDevicePanel)),
  PCWindow: dynamic(() => import('@/components/network/panels').then((m) => m.PCWindow), { ssr: false }),
  FirewallWindow: dynamic(() => import('@/components/network/panels').then((m) => m.FirewallWindow), { ssr: false }),
  TabletSplitView: dynamic(() => import('@/components/network/panels').then((m) => m.TabletSplitView), { ssr: false }),
  RefreshReportPanel: dynamic(() => import('@/components/network/panels').then((m) => m.RefreshReportPanel), { ssr: false }),
};

const ProjectPickerDialog = dynamic(() => import('@/components/network/ProjectPickerDialog').then((m) => m.ProjectPickerDialog));
const OnboardingDialog = dynamic(() => import('@/components/network/OnboardingDialog').then((m) => m.OnboardingDialog));
const TopologyGeneratorDialog = dynamic(() => import('@/components/network/topology/TopologyGeneratorDialog').then(m => m.TopologyGeneratorDialog), { ssr: false });

import { TabType, ALL_TABS, exampleLevelOrder } from './page.types';
import { usePageProjectStorage } from './usePageProjectStorage';
import { usePageModalManagement } from './usePageModalManagement';
import { handlePageShortcut } from './pageKeyboardShortcuts';
import { usePageTopologyCallbacks } from './usePageTopologyCallbacks';

// Modular Hooks & Sub-components
import { usePageHistoryManager } from './usePageHistoryManager';
import { usePageSyncEffects } from './usePageSyncEffects';
import { usePageInitialLoad } from './usePageInitialLoad';
import { PageOverlayPanels } from './PageOverlayPanels';

export default function Home({ initialProjectId }: { initialProjectId?: string }) {
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
  const [topologyKey, setTopologyKey] = useState(0);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [lastOutput, setLastOutput] = useState<string>('');

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showBasarilarim, setShowBasarilarim] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  usePWA();

  const [sessionStart] = useState(() => Date.now());
  const [focusedOverlay, setFocusedOverlay] = useState<'refresh' | 'packet' | 'pc-info' | 'router-info' | 'switch-info'>('packet');

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

  const [cableInfo, setCableInfo] = useState<CableInfo>({
    connected: true,
    cableType: 'straight',
    sourceDevice: 'pc',
    targetDevice: 'switchL2',
  });
  const [, setLastTaskEvent] = useState<{ type: 'completed' | 'failed'; taskName: string; timestamp: number } | null>(null);
  const [isPingPanelOpen, setIsPingPanelOpen] = useState(false);
  const [isExamLoadedFromFile, setIsExamLoadedFromFile] = useState(false);
  const [isTimelineMinimized, setIsTimelineMinimized] = useState(false);
  const toggleTimelineMinimize = useCallback(() => setIsTimelineMinimized(prev => !prev), []);
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

  const [saveDialog, setSaveDialog] = useState<{
    show: boolean;
    message: string;
    onConfirm: (save: boolean) => void;
  } | null>(null);

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

  const [groupedExampleProjects, setGroupedExampleProjects] = useState<Record<ExampleProjectLevel, ExampleProject[]>>(
    () => ({ basic: [], intermediate: [], advanced: [] })
  );

  useEffect(() => {
    import('@/lib/network/exampleProjects').then(({ exampleProjects }) => {
      const grouping: Record<ExampleProjectLevel, ExampleProject[]> = { basic: [], intermediate: [], advanced: [] };
      exampleProjects(language).forEach((project) => grouping[project.level].push(project));
      setGroupedExampleProjects(grouping);
    });
  }, [language]);

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

  const topologyDevices = useTopologyDevices();
  const topologyConnections = useTopologyConnections();
  const topologyNotes = useTopologyNotes();
  const zoom = useZoom();
  const pan = usePan();
  const activeTab = useActiveTab();
  const environment = useEnvironment();

  const helpLevel = useAppStore(state => state.helpLevel);
  const setHelpLevel = useAppStore((state) => state.setHelpLevel);

  const setDevices = useAppStore((state) => state.setDevices);
  const setConnections = useAppStore((state) => state.setConnections);
  const setNotes = useAppStore((state) => state.setNotes);
  const setZoom = useAppStore((state) => state.setZoom);
  const setPan = useAppStore((state) => state.setPan);
  const graphicsQuality = useAppStore((state) => state.graphicsQuality);
  const setGraphicsQuality = useAppStore((state) => state.setGraphicsQuality);

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

  const pcDrag = useDrag({ mode: 'drag-resize', storageKey: 'pc-modal-position', defaultSize: { width: 800, height: 600 }, disableSnap: true });
  const firewallDrag = useDrag({ mode: 'drag-resize', storageKey: 'firewall-modal-position', defaultSize: { width: 600, height: 500 }, disableSnap: true });
  const unifiedDrag = useDrag({ mode: 'drag-resize', storageKey: 'unified-modal-position', defaultSize: { width: 800, height: 600 }, disableSnap: true });
  const routerDrag = useDrag({ mode: 'drag-resize', storageKey: 'router-modal-position', defaultSize: { width: 800, height: 600 }, disableSnap: true });

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

  const handleDeviceDoubleClick = useCallback((device: DeviceType, deviceId: string) => {
    const { openDeviceWindow, restoreWindow } = useMultiWindowStore.getState();

    if (device === 'pc') {
      setShowPCDeviceId(deviceId);
      getOrCreatePCOutputs(deviceId, topologyDevices);
      setPcPanelInitialTab('home');
      openDeviceWindow(deviceId, 'pc', 'home');
    } else if (device === 'iot' || device === 'router' || device === 'switchL2' || device === 'switchL3' || device === 'wlc' || device === 'hub' || device === 'cloud' || device === 'printer' || device === 'mobile' || device === 'firewall') {
      const deviceObj = topologyDevices?.find(d => d.id === deviceId);
      const deviceState = getOrCreateDeviceState(deviceId, device, deviceObj?.name, deviceObj?.macAddress, deviceObj?.switchModel, deviceObj?.services);
      getOrCreateDeviceOutputs(deviceId, deviceState);

      setActiveDeviceId(deviceId);
      setActiveDeviceType(device);
      setUnifiedDeviceActiveTab('console');
      openDeviceWindow(deviceId, device, 'console');
    }

    restoreWindow(deviceId);
    useWindowStore.getState().setActiveWindow(deviceId);
  }, [getOrCreateDeviceState, getOrCreateDeviceOutputs, topologyDevices, setShowPCDeviceId, setActiveDeviceId, setActiveDeviceType, setPcPanelInitialTab, setUnifiedDeviceActiveTab, setActiveFirewallId, setShowFirewallPanel]);

  const handleDeviceDelete = useDeviceDelete({
    showPCDeviceId, showRouterDeviceId, activeDeviceId, selectedDevice, setShowPCPanel, setShowPCDeviceId, setShowRouterPanel,
    setShowRouterDeviceId, setSelectedDevice, setActiveDeviceId, setActiveDeviceType, setTopologyConnections, setDeviceStates,
    setDeviceOutputs, setPcOutputs, setTopologyDevices, setActiveTab, setHasUnsavedChanges,
  });

  const handleDeviceRename = useCallback((deviceId: string, newName: string) => {
    setDeviceStates(prev => {
      const state = prev.get(deviceId);
      if (!state) return prev;
      const updated = { ...state, hostname: newName };
      updated.runningConfig = buildRunningConfig(updated);
      return new Map(prev).set(deviceId, updated);
    });
  }, [setDeviceStates]);

  const handleUpdateHistory = useCallback((deviceId: string, history: string[]) => {
    setDeviceStates(prev => {
      const state = prev.get(deviceId);
      if (state) {
        return new Map(prev).set(deviceId, { ...state, commandHistory: history });
      }
      return prev;
    });
  }, [setDeviceStates]);

  const handleUpdatePCHistory = useCallback((deviceId: string, history: string[]) => {
    setPcHistories(prev => new Map(prev).set(deviceId, history));
  }, [setPcHistories]);

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
    deviceStates: Map<string, any>;
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
  }, []);

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
  }, [activeGuidedProject, activeExam, toggleEditor, setProjectName, guidedStepIndex, topologyDevices, setFocusDeviceId, focusDeviceInTopology]);

  const isDark = (effectiveTheme ?? theme) === 'dark';
  const isRoomEnabled = process.env.NEXT_PUBLIC_IS_ROOM_ENABLED === 'true';

  return (
    <AppErrorBoundary fallbackTitle={t.applicationError}>
      <div className={cn("h-dvh w-full flex flex-col relative transition-colors duration-700 overflow-x-hidden", isAppLoading ? 'bg-secondary-950' : (isDark ? 'bg-secondary-950' : 'bg-secondary-50'))}>
        {!isAppLoading && (
          <div className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-20 transition-opacity duration-1000">
            <div className="absolute inset-0 mesh-gradient animate-liquid blur-[100px] scale-150 rotate-12" />
            <div className="absolute inset-0 bg-white/40 dark:bg-secondary-950/40" />
          </div>
        )}

        {/* App Loading Screen */}
        {isAppLoading && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-secondary-950">
            <div className="flex flex-col items-center animate-scale-in">
              <div className="relative mb-8">
                <div className="p-2 animate-glitch">
                  <Image src="/app.png" alt="Logo" width={64} height={64} className="w-16 h-16 object-contain" priority />
                </div>
                <div className="absolute inset-0 p-4 rounded-2xl bg-error-500/30 animate-glitch-skew mix-blend-screen" />
                <div className="absolute inset-0 p-4 rounded-2xl bg-primary-500/30 animate-glitch mix-blend-screen" style={{ animationDelay: '0.1s' }} />
              </div>

              <h1 className="text-3xl font-black tracking-tighter text-white glitch-text mb-2 text-center" data-text="NETWORK SIMULATOR">
                NETWORK SIMULATOR
              </h1>

              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-bold tracking-widest text-accent-500">
                  {t.initializingSystem}
                </span>
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%]" />
          </div>
        )}

        {/* Skeleton Loading State */}
        {showSkeleton && !isAppLoading && (
          <div className="fixed inset-0 z-[9998] bg-background">
            <AppSkeleton />
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col flex-1 animate-fade-in w-full max-w-[1920px] mx-auto">
          <AppHeader
            t={t}
            isDark={isDark}
            theme={theme}
            language={language}
            isPingPanelOpen={isPingPanelOpen}
            isExamActive={isExamActive}
            setLanguage={setLanguage}
            setTheme={setTheme}
            graphicsQuality={graphicsQuality}
            setGraphicsQuality={setGraphicsQuality}
            activeDeviceType={activeDeviceType}
            activeDeviceId={activeDeviceId}
            totalScore={totalScore}
            maxScore={maxScore}
            topologyDevices={topologyDevices}
            deviceStates={deviceStates}
            handleNewProject={handleNewProject}
            handleSaveProject={handleSaveProject}
            handleLoadProject={handleLoadProject}
            fileInputRef={fileInputRef}
            showMobileMenu={showMobileMenu}
            setShowMobileMenu={setShowMobileMenu}
            setShowProjectPicker={setShowProjectPicker}
            setShowOnboarding={setShowOnboarding}
            setOnboardingStep={setOnboardingStep}
            handleRefreshNetwork={handleRefreshNetwork}
            setIsEnvironmentPanelOpen={setIsEnvironmentPanelOpen}
            isGuidedModeActive={isGuidedModeActive}
            isPanelMinimized={isPanelMinimized}
            expandPanel={expandPanel}
            setShowAboutModal={setShowAboutModal}
            showBasarilarim={showBasarilarim}
            setShowBasarilarim={setShowBasarilarim}
            helpLevel={helpLevel}
            setHelpLevel={useAppStore.getState().setHelpLevel}
          />

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

          <UnifiedDevicePanel
            isOpen={showUnifiedDeviceModal && !isTablet}
            onOpenChange={setShowUnifiedDeviceModal}
            activeTab={unifiedDeviceActiveTab}
            onTabChange={setUnifiedDeviceActiveTab}
            deviceId={activeDeviceId}
            deviceType={activeDeviceType}
            deviceStates={deviceStates}
            topologyDevices={topologyDevices}
            topologyConnections={topologyConnections}
            handleCommand={handleCommand}
            handleClearTerminal={handleClearTerminal}
            handleUpdateHistory={handleUpdateHistory}
            confirmDialog={confirmDialog}
            setConfirmDialog={setConfirmDialog}
            t={t}
            theme={theme}
            language={language}
            helpLevel={helpLevel}
            isDark={isDark}
            isExecutingCommand={isExecutingCommand}
            output={output}
            prompt={prompt}
            state={state}
            activeDeviceTasks={activeDeviceTasks}
            taskContext={taskContext}
            modalPosition={unifiedDrag.position}
            modalSize={unifiedDrag.size}
            handlePointerDown={unifiedDrag.handlePointerDown}
            handleResizeStart={unifiedDrag.handleResizeStart}
          />

          <FirewallWindow
            showFirewallPanel={showFirewallPanel}
            setShowFirewallPanel={setShowFirewallPanel}
            activeFirewallId={activeFirewallId}
            topologyDevices={topologyDevices}
            t={t}
            theme={theme}
            isDark={isDark}
            isTR={isTR}
            firewallActiveTab={firewallActiveTab}
            setFirewallActiveTab={setFirewallActiveTab}
            deviceStates={deviceStates}
            deviceOutputs={deviceOutputs}
            handleExecuteCommand={handleExecuteCommand}
            handleUpdateHistory={handleUpdateHistory}
            setConfirmDialog={setConfirmDialog}
            confirmDialog={confirmDialog}
            toggleDevicePower={toggleDevicePower}
            updateDeviceConfig={updateDeviceConfig}
            firewallDrag={firewallDrag}
          />

          <PCWindow
            showPCPanel={showPCPanel}
            setShowPCPanel={setShowPCPanel}
            isTablet={isTablet}
            showPCDeviceId={showPCDeviceId}
            topologyDevices={topologyDevices}
            topologyConnections={topologyConnections}
            cableInfo={cableInfo}
            pcPanelInitialTab={pcPanelInitialTab}
            deviceStates={deviceStates}
            deviceOutputs={deviceOutputs}
            pcOutputs={pcOutputs}
            setPcOutputs={setPcOutputs as PcOutputsSetter}
            pcHistories={pcHistories}
            handleUpdatePCHistory={handleUpdatePCHistory}
            handleExecuteCommand={handleExecuteCommand}
            handlePCPanelNavigateWrapper={handlePCPanelNavigateWrapper}
            handleDeviceDelete={handleDeviceDelete}
            focusedOverlay={focusedOverlay}
            isDark={isDark}
            t={t}
            toggleDevicePower={toggleDevicePower}
            pcDrag={pcDrag}
          />

          <MultiDeviceWindowManager
            topologyDevices={topologyDevices}
            topologyConnections={topologyConnections}
            cableInfo={cableInfo}
            deviceStates={deviceStates}
            deviceOutputs={deviceOutputs}
            pcOutputs={pcOutputs}
            setPcOutputs={setPcOutputs as PcOutputsSetter}
            pcHistories={pcHistories}
            handleUpdatePCHistory={handleUpdatePCHistory}
            handleUpdateHistory={handleUpdateHistory}
            handleExecuteCommand={handleExecuteCommand}
            handleDeviceDelete={handleDeviceDelete}
            isDark={isDark}
            language={language}
            theme={theme}
            t={t}
            toggleDevicePower={toggleDevicePower}
            updateDeviceConfig={updateDeviceConfig}
            confirmDialog={confirmDialog}
            setConfirmDialog={setConfirmDialog}
            isTablet={isTablet}
          />

          <WindowSwitcherModal
            topologyDevices={topologyDevices}
            isDark={isDark}
            language={language}
          />

          <RouterPanel
            deviceId={showRouterDeviceId}
            isVisible={showRouterPanel && !isTablet}
            onClose={() => setShowRouterPanel(false)}
            topologyDevices={topologyDevices || undefined}
            topologyConnections={topologyConnections}
            deviceStates={deviceStates}
            modalPosition={routerDrag.position}
            modalSize={routerDrag.size}
            handlePointerDown={routerDrag.handlePointerDown}
            handleResizeStart={routerDrag.handleResizeStart}
            className={focusedOverlay === 'router-info' ? "border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]" : "border-emerald-950/80"}
          />

          <main className={cn(
            "overflow-hidden flex flex-col min-h-0 pt-14 sm:pt-16",
            preferences.showFooter ? "h-[calc(100vh-44px)]" : "h-screen",
            activeTab === 'topology' ? 'md:pt-[116px]' : 'md:pt-16',
            isTablet && (showPCPanel || showUnifiedDeviceModal || showRouterPanel) && "flex-row md:pt-16"
          )}>
            <div className={cn(
              "w-full flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-500",
              isTablet && (showPCPanel || showUnifiedDeviceModal || showRouterPanel) && "w-full sm:w-1/2 flex-none border-r border-secondary-200/50 dark:border-secondary-800/50"
            )}>
              <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'topology' ? 'flex' : 'hidden'} print:flex`}>
                {activeTab === 'topology' && (
                  <TopologyToolbar
                    isPingPanelOpen={isPingPanelOpen}
                    t={t}
                    isDark={isDark}
                    language={language}
                    topologyDevices={topologyDevices}
                    deviceStates={deviceStates}
                    activeDeviceId={activeDeviceId}
                    activeDeviceType={activeDeviceType}
                    cableInfo={cableInfo}
                    deviceSearchQuery={deviceSearchQuery}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    hasHydrated={hasHydrated}
                    isExamActive={isExamActive}
                    setDeviceSearchQuery={setDeviceSearchQuery}
                    setCableInfo={setCableInfo}
                    setZoom={setZoom}
                    setPan={setPan}
                    handleDeviceSelectFromMenu={handleDeviceSelectFromMenu}
                    handleUndo={handleUndo}
                    handleRedo={handleRedo}
                    handleRefreshNetwork={handleRefreshNetwork}
                    setIsEnvironmentPanelOpen={setIsEnvironmentPanelOpen}
                    onOpenStudentJoin={isRoomEnabled ? () => setShowRoomJoinDialog(true) : undefined}
                    onOpenTeacherPanel={isRoomEnabled && !studentRoomCode ? () => setShowTeacherPanel(true) : undefined}
                  />
                )}

                <div ref={topologyContainerRef} className="flex-1 w-full h-full min-h-0 overflow-hidden relative">
                  <NetworkErrorBoundary fallbackTitle="Topoloji Tuvali Yüklenirken Bir Hata Oluştu">
                    <NetworkTopology
                      onPingPanelOpenChange={setIsPingPanelOpen}
                      key={topologyKey}
                      cableInfo={cableInfo}
                      onCableChange={setCableInfo}
                      selectedDevice={selectedDevice}
                      onDeviceSelect={handleDeviceSelectFromCanvas}
                      onDeviceDoubleClick={handleDeviceDoubleClick}
                      onDeviceDelete={handleDeviceDelete}
                      onDeviceRename={handleDeviceRename}
                      initialDevices={topologyDevices || undefined}
                      initialConnections={topologyConnections || undefined}
                      initialNotes={topologyNotes || undefined}
                      isActive={activeTab === 'topology'}
                      activeDeviceId={activeDeviceId}
                      deviceStates={deviceStates}
                      onDeviceStatesChange={setDeviceStates}
                      zoom={zoom}
                      onZoomChange={setZoom}
                      pan={pan}
                      onPanChange={setPan}
                      canUndo={canUndo}
                      canRedo={canRedo}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      onRefreshNetwork={handleRefreshNetwork}
                      focusDeviceId={focusDeviceId}
                      isExamActive={isExamActive}
                      isExamEditorOpen={isEditorOpen}
                      onOpenTasks={(deviceId: string) => {
                        setActiveDeviceId(deviceId);
                        const device = topologyDevices?.find(d => d.id === deviceId);
                        if (!device || device.type === 'pc') return;
                        setActiveDeviceType(device.type);
                        setUnifiedDeviceActiveTab('settings');
                        setShowUnifiedDeviceModal(true);
                      }}
                      clearSelectionTrigger={clearSelectionTrigger}
                      onPacketPanelFocus={() => setFocusedOverlay('packet')}
                      packetPanelZIndex={focusedOverlay === 'packet' ? 35 : 30}
                      onAction={commitAction}
                    />
                  </NetworkErrorBoundary>

                  {preferences.showDevicePopovers && (() => {
                    const activeDevice = activeDeviceId
                      ? topologyDevices?.find(d => d.id === activeDeviceId) ?? null
                      : null;
                    const isPcDevice = activeDevice?.type === 'pc' || activeDeviceId?.startsWith('pc-');
                    return isPcDevice && activeDevice ? (
                      <PCInfoPopover
                        pc={activeDevice}
                        t={t}
                        language={language}
                        isDark={isDark}
                        isFocused={focusedOverlay === 'pc-info'}
                        onClose={() => {
                          setSelectedDevice(null);
                          setActiveDeviceId('');
                        }}
                        onFocus={() => setFocusedOverlay('pc-info')}
                        zIndex={focusedOverlay === 'pc-info' ? 36 : 25}
                        handleDeviceDoubleClick={handleDeviceDoubleClick}
                        onOpenPanel={(id) => handleDeviceDoubleClick('pc', id)}
                        onOpenSettings={(id) => {
                          setShowPCDeviceId(id);
                          getOrCreatePCOutputs(id, topologyDevices);
                          setPcPanelInitialTab('settings');
                          useMultiWindowStore.getState().openDeviceWindow(id, 'pc', 'settings');
                        }}
                        topologyDevices={topologyDevices}
                        deviceStates={deviceStates}
                      />
                    ) : null;
                  })()}

                  {preferences.showDevicePopovers && activeDeviceId && (activeDeviceId.startsWith('router-') || topologyDevices?.find(d => d.id === activeDeviceId)?.type === 'router') && topologyDevices && (
                    <RouterInfoPopover
                      router={topologyDevices.find(d => d.id === activeDeviceId) as CanvasDevice}
                      routerState={deviceStates.get(activeDeviceId)}
                      t={t}
                      language={language}
                      isDark={isDark}
                      isFocused={focusedOverlay === 'router-info'}
                      onClose={() => {
                        setSelectedDevice(null);
                        setActiveDeviceId('');
                      }}
                      onFocus={() => setFocusedOverlay('router-info')}
                      zIndex={focusedOverlay === 'router-info' ? 36 : 25}
                      handleDeviceDoubleClick={handleDeviceDoubleClick}
                      onOpenPanel={(id) => handleDeviceDoubleClick('router', id)}
                      onOpenSettings={(id) => {
                        setActiveDeviceId(id);
                        const device = topologyDevices?.find(d => d.id === id);
                        if (device) setActiveDeviceType(device.type);
                        setUnifiedDeviceActiveTab('settings');
                        useMultiWindowStore.getState().openDeviceWindow(id, device?.type || 'router', 'settings');
                      }}
                      topologyConnections={topologyConnections}
                    />
                  )}
                </div>
              </div>
            </div>

            <TabletSplitView
              isDark={isDark}
              isTablet={isTablet}
              showPCPanel={showPCPanel}
              setShowPCPanel={setShowPCPanel}
              showUnifiedDeviceModal={showUnifiedDeviceModal}
              setShowUnifiedDeviceModal={setShowUnifiedDeviceModal}
              showRouterPanel={showRouterPanel}
              setShowRouterPanel={setShowRouterPanel}
              unifiedDeviceActiveTab={unifiedDeviceActiveTab}
              setUnifiedDeviceActiveTab={setUnifiedDeviceActiveTab}
              activeDeviceId={activeDeviceId}
              activeDeviceType={activeDeviceType}
              deviceStates={deviceStates}
              topologyDevices={topologyDevices}
              topologyConnections={topologyConnections}
              handleCommand={handleCommand}
              handleClearTerminal={handleClearTerminal}
              toggleDevicePower={toggleDevicePower}
              handleUpdateHistory={handleUpdateHistory}
              confirmDialog={confirmDialog}
              setConfirmDialog={setConfirmDialog}
              t={t}
              theme={theme}
              language={language}
              helpLevel={helpLevel}
              isExecutingCommand={isExecutingCommand}
              output={output}
              prompt={prompt}
              state={state}
              activeDeviceTasks={activeDeviceTasks}
              taskContext={taskContext}
              showPCDeviceId={showPCDeviceId}
              cableInfo={cableInfo}
              pcPanelInitialTab={pcPanelInitialTab}
              deviceOutputs={deviceOutputs}
              pcOutputs={pcOutputs}
              setPcOutputs={setPcOutputs as PcOutputsSetter}
              pcHistories={pcHistories}
              handleUpdatePCHistory={handleUpdatePCHistory}
              handleExecuteCommand={handleExecuteCommand}
              handlePCPanelNavigateWrapper={handlePCPanelNavigateWrapper}
              handleDeviceDelete={handleDeviceDelete}
              showRouterDeviceId={showRouterDeviceId}
              focusedOverlay={focusedOverlay}
            />

            <RefreshReportPanel
              refreshNetworkReport={refreshNetworkReport}
              setRefreshNetworkReport={setRefreshNetworkReport}
              refreshReportRef={refreshReportRef}
              isMobile={isMobile}
              isDark={isDark}
              focusedOverlay={focusedOverlay}
              setFocusedOverlay={setFocusedOverlay}
              language={language}
              t={t}
              handleRefreshNetwork={handleRefreshNetwork}
              liveSummary={liveSummary}
              topologyDevices={topologyDevices}
              deviceStates={deviceStates}
              bringElementToFront={bringElementToFront}
              isExamActive={isExamActive}
            />
          </main>

          {preferences.showFooter && (
            <AppFooter
              t={t}
              isDark={isDark}
              language={language}
              activeTab={activeTab}
              hasUnsavedChanges={hasUnsavedChanges}
              lastSaveTime={lastSaveTime}
              projectName={projectName}
              topologyDevices={topologyDevices}
              showProjectPicker={showProjectPicker}
              showOnboarding={showOnboarding}
              setShowAboutModal={setShowAboutModal}
              onShortcut={(shortcut) => handlePageShortcut(shortcut, topologyDevices, activeDeviceId, handleDeviceSelectFromMenu)}
            />
          )}

          <PageOverlayPanels
            t={t}
            isDark={isDark}
            language={language}
            showAboutModal={showAboutModal}
            setShowAboutModal={setShowAboutModal}
            isExamActive={isExamActive}
            setShowOnboarding={setShowOnboarding}
            setOnboardingStep={setOnboardingStep}
            showBasarilarim={showBasarilarim}
            setShowBasarilarim={setShowBasarilarim}
            isEnvironmentPanelOpen={isEnvironmentPanelOpen}
            setIsEnvironmentPanelOpen={setIsEnvironmentPanelOpen}

            isGuidedModeActive={isGuidedModeActive}
            activeGuidedProject={activeGuidedProject}
            guidedStepIndex={guidedStepIndex}
            completeStep={completeStep}
            uncompleteStep={uncompleteStep}
            toggleGuidedMinimize={togglePanelMinimize}
            isGuidedPanelMinimized={isPanelMinimized}
            lastCompletedStep={lastCompletedStep}
            isCurrentStepReady={isCurrentStepReady}
            lastCommand={lastCommand}
            lastOutput={lastOutput}
            showUnifiedDeviceModal={showUnifiedDeviceModal}
            activeDeviceType={activeDeviceType}
            activeDeviceId={activeDeviceId}
            state={state}
            deviceStates={deviceStates}
            topologyConnections={topologyConnections}
            topologyDevices={topologyDevices}
            checkStepCompletionWithContext={checkStepCompletionWithContext}

            activeExam={activeExam}
            closeExam={closeExam}
            toggleExamPanelMinimize={toggleExamPanelMinimize}
            isExamPanelMinimized={isExamPanelMinimized}
            isExamFinished={isExamFinished}
            finishExam={finishExam}
            examScore={examScore}
            checkExamTasks={checkExamTasks}
            isExamLoadedFromFile={isExamLoadedFromFile}
            toggleEditor={toggleEditor}
            isEditorOpen={isEditorOpen}

            activeTroubleshootingProject={activeTroubleshootingProject}
            showTroubleshootingPanel={showTroubleshootingPanel}
            setShowTroubleshootingPanel={setShowTroubleshootingPanel}
            isTroubleshootingMinimized={isTroubleshootingMinimized}
            setIsTroubleshootingMinimized={setIsTroubleshootingMinimized}

            historyItems={historyItems}
            historyIndex={historyIndex}
            handleJumpTo={handleJumpTo}
            isTimelineMinimized={isTimelineMinimized}
            toggleTimelineMinimize={toggleTimelineMinimize}
            isMobile={isMobile}

            addTask={addTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            updateExamMeta={updateExamMeta}
            moveTask={moveTask}
            smartBalanceWeights={smartBalanceWeights}
            exportExamFile={exportExamFile}
            getFullProjectData={getFullProjectData}

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
        </div>
      </div>
    </AppErrorBoundary>
  );
}
