'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import { SwitchState, CableInfo, Port, CommandResult } from '@/lib/network/types';
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
import { ExamTask } from '@/lib/network/examMode';
import { cn, normalizeMAC } from '@/lib/utils';
import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType } from '@/components/network/networkTopology.types';
import { getPrompt } from '@/lib/network/executor';
import { formatErrorForUser, errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';
import { safeParse, safeStringify } from '@/lib/network/serialization';
import { recalculateStp } from '@/lib/network/stp';
import { createInitialState, createInitialRouterState, createInitialFirewallState, createInitialWLCState } from '@/lib/network/initialState';
import type { TerminalOutput } from '@/components/network/Terminal';

const NetworkTopology = dynamic(
  () => import('@/components/network/NetworkTopology').then((m) => m.NetworkTopology),
  { ssr: false }
);

import { UserKey, Users } from "lucide-react";
import { Button } from '@/components/ui/button';
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
import { getGuidedProjects, type GuidedProject } from '@/lib/network/guidedMode';
import { getExamProjects, type ExamProject, type ProjectData, generateExamFromProject } from '@/lib/network/examMode';
import { buildRunningConfig } from '@/lib/network/core/configBuilder';
import { performanceMonitor } from '@/lib/performance/monitoring';
import { useGuidedMode } from '@/hooks/useGuidedMode';
import { useExamMode } from '@/hooks/useExamMode';
import { decryptExamData } from '@/lib/network/examMode';

import { PCInfoPopover, RouterInfoPopover } from '@/components/network/DeviceInfoPopovers';
import { BasarilarimPanel } from '@/components/ui/BasarilarimPanel';
import { addSessionDuration, addGuidedLessonRecord, addExamRecord, addProjectRecord } from '@/utils/achievementRecords';
import { AppHeader } from '@/components/network/AppHeader';
import { AppFooter } from '@/components/network/AppFooter';
import { TopologyToolbar } from '@/components/network/TopologyToolbar';
import { bringElementToFront } from '@/lib/utils/zIndex';
import { AppSkeleton } from '@/components/ui/AppSkeleton';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { useRoom } from '@/contexts/RoomContext';
import { useRoomSync } from '@/hooks/useRoomSync';
import { useToast } from '@/hooks/use-toast';

import { RefreshDeviceSummary, REFRESH_DEVICE_TYPE_ORDER } from '@/components/network/LiveDeviceList';
import { useNetworkSimulation } from '@/hooks/useNetworkSimulation';
import { useTroubleshootingMode } from '@/hooks/useTroubleshootingMode';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useProjectExport } from '@/hooks/useProjectExport';
import { useProjectReset } from '@/hooks/useProjectReset';
import { useAutoDhcpRenewal } from '@/hooks/useAutoDhcpRenewal';
import { usePWA } from '@/hooks/usePWA';
import { computeLiveSummary } from '@/lib/network/liveSummary';



const { RouterPanel, UnifiedDevicePanel, PCWindow, FirewallWindow, GuidedModePanel, ExamModePanel, EnvironmentSettingsPanel, ExamEditorPanel, TroubleshootingPanel, TimelinePanel, TabletSplitView, RefreshReportPanel } = {
  RouterPanel: dynamic(() => import('@/components/network/panels').then((m) => m.RouterPanel)),
  UnifiedDevicePanel: dynamic(() => import('@/components/network/panels').then((m) => m.UnifiedDevicePanel)),
  PCWindow: dynamic(() => import('@/components/network/panels').then((m) => m.PCWindow), { ssr: false }),
  FirewallWindow: dynamic(() => import('@/components/network/panels').then((m) => m.FirewallWindow), { ssr: false }),
  GuidedModePanel: dynamic(() => import('@/components/network/panels').then((m) => m.GuidedModePanel)),
  ExamModePanel: dynamic(() => import('@/components/network/panels').then((m) => m.ExamModePanel)),
  EnvironmentSettingsPanel: dynamic(() => import('@/components/network/panels').then((m) => m.EnvironmentSettingsPanel)),
  ExamEditorPanel: dynamic(() => import('@/components/network/panels').then((m) => m.ExamEditorPanel)),
  TroubleshootingPanel: dynamic(() => import('@/components/network/panels').then((m) => m.TroubleshootingPanel)),
  TimelinePanel: dynamic(() => import('@/components/network/panels').then((m) => m.TimelinePanel)),
  TabletSplitView: dynamic(() => import('@/components/network/panels').then((m) => m.TabletSplitView), { ssr: false }),
  RefreshReportPanel: dynamic(() => import('@/components/network/panels').then((m) => m.RefreshReportPanel), { ssr: false }),
};

const LazyAboutModal = dynamic(() => import('@/components/network/LazyAboutModal').then((m) => m.LazyAboutModal));
const ProjectPickerDialog = dynamic(() => import('@/components/network/ProjectPickerDialog').then((m) => m.ProjectPickerDialog));
const OnboardingDialog = dynamic(() => import('@/components/network/OnboardingDialog').then((m) => m.OnboardingDialog));
const PageModals = dynamic(() => import('@/components/network/panels/PageModals').then((m) => m.PageModals), { ssr: false });

import { TabType, PCOutputLine, ALL_TABS, exampleLevelOrder } from './page.types';
import {
  isSwitchDeviceType, normalizeWifiMode, hasValidIp, isIpInPoolRange,
  firstValue, isWirelessMatch, propagateVtpVlans, validateTopologyConnections,
  releaseDisconnectedPorts,
} from './refreshNetworkUtils';

import { useHistory, ProjectState } from '@/hooks/useHistory';


function serializeState(s: ProjectState) {
  return JSON.stringify({
    t: s.topologyDevices,
    c: s.topologyConnections,
    n: s.topologyNotes,
    s: Array.from(s.deviceStates.entries()),
    o: Array.from(s.deviceOutputs.entries()),
    p: Array.from(s.pcOutputs.entries()),
    id: s.activeDeviceId,
    tab: s.activeTab,
  });
}

export default function Home({ initialProjectId }: { initialProjectId?: string }) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, effectiveTheme, setTheme } = useTheme();
  const isTR = language === 'tr';


  // Multi-tab warning system
  const { showWarning, tabCount, acknowledgeWarning, clearCurrentTabData } = useMultiTabWarning();
  const { toast } = useToast();

  // Refs moved to top to avoid TDZ errors
  const isApplyingHistoryRef = useRef(false);
  const pendingHistoryActionRef = useRef<'undo' | 'redo' | 'jumpTo' | null>(null);
  const lastAppliedHistoryStateRef = useRef<ProjectState | null>(null);
  const lastPushedStateRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevTaskStatusRef = useRef<Map<string, boolean>>(new Map());
  const shownToastsRef = useRef<Set<string>>(new Set());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalHistoryPushedRef = useRef(false);
  const refreshReportRef = useRef<HTMLDivElement>(null);

  // State moved to top to avoid TDZ errors
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

  const [loadedExampleId, setLoadedExampleId] = useState<string | null>(null);
  const [topologyKey, setTopologyKey] = useState(0);
  // Track last executed command and its output for guided mode
  const [lastCommand, setLastCommand] = useState<string>('');
  const [lastOutput, setLastOutput] = useState<string>('');
  const [isAppLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('Untitled');

  // Load project name and loadedExampleId from localStorage on mount
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      const savedName = localStorage.getItem('lastProjectName');
      if (savedName) timer = setTimeout(() => setProjectName(savedName), 0);
    } catch { /* ignore */ }
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      const savedExampleId = localStorage.getItem('lastLoadedExampleId');
      if (savedExampleId) {
        timer = setTimeout(() => setLoadedExampleId(savedExampleId), 0);
      }
    } catch { /* ignore */ }
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      if (loadedExampleId) {
        localStorage.setItem('lastLoadedExampleId', loadedExampleId);
      } else {
        localStorage.removeItem('lastLoadedExampleId');
      }
    } catch { /* ignore */ }
  }, [loadedExampleId]);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showBasarilarim, setShowBasarilarim] = useState(false);

  usePWA();

  // Track session start time for achievement records
  const sessionStartRef = useRef(1715600000000);
  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);

  // Which overlay panel is on top — last clicked wins
  const [focusedOverlay, setFocusedOverlay] = useState<'refresh' | 'packet' | 'pc-info' | 'router-info' | 'switch-info'>('packet');

  // Mobile/Tablet detection and back button handler
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  useMobileBack();

  useEffect(() => {
    const handleMobileBack = () => {
      setRefreshNetworkReport(prev => prev ? { ...prev, show: false } : null);
    };
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack);
  }, []);

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
  const [lastTaskEvent, setLastTaskEvent] = useState<{ type: 'completed' | 'failed'; taskName: string; timestamp: number } | null>(null);
  const [isPingPanelOpen, setIsPingPanelOpen] = useState(false);
  const [isExamLoadedFromFile, setIsExamLoadedFromFile] = useState(false);
  const [isTimelineMinimized, setIsTimelineMinimized] = useState(false);
  const toggleTimelineMinimize = useCallback(() => setIsTimelineMinimized(prev => !prev), []);

  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const resetWorkspaceUiState = useCallback(() => {
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
    
    // Additional resets to prevent old project remnants
    setLastCommand('');
    setLastOutput('');
    setIsPingPanelOpen(false);
    setCableInfo({ connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' });
    setFocusedOverlay('packet');
    setLastTaskEvent(null);
  }, [
    setActiveDeviceId,
    setActiveDeviceType,
    setSelectedDevice,
    setClearSelectionTrigger,
    setShowPCPanel,
    setShowFirewallPanel,
    setActiveFirewallId,
    setFirewallActiveTab,
    setPcPanelInitialTab,
    setShowPCDeviceId,
    setShowRouterPanel,
    setShowRouterDeviceId,
    setShowUnifiedDeviceModal,
    setUnifiedDeviceActiveTab,
    setShowAboutModal,
    setShowMobileMenu,
    setShowProjectPicker,
    setProjectPickerTab,
    setShowOnboarding,
    setOnboardingStep,
    setIsEnvironmentPanelOpen,
    setActiveTab,
    setRefreshNetworkReport,
    setProjectSearchQuery,
    setLoadedExampleId,
    setLastCommand,
    setLastOutput,
    setIsPingPanelOpen,
    setCableInfo,
    setFocusedOverlay,
    setLastTaskEvent
  ]);



  // Persist project name across refreshes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastProjectName', projectName);
    }
  }, [projectName]);

  // Record session duration on unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      if (elapsed >= 10) {
        addSessionDuration(elapsed);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Record guided lesson completion when all steps done
  const prevGuidedRef = useRef(activeGuidedProject);
  const prevAllDoneRef = useRef(false);
  useEffect(() => {
    if (activeGuidedProject && isAllCompleted && !prevAllDoneRef.current) {
      const lessonName = typeof activeGuidedProject.title === 'string' ? activeGuidedProject.title : (activeGuidedProject.title as { tr?: string; en?: string })?.tr || (activeGuidedProject.title as { tr?: string; en?: string })?.en || 'Guided Lesson';
      addGuidedLessonRecord(lessonName, currentPoints, totalPoints);
    }
    prevAllDoneRef.current = !!isAllCompleted;
  }, [isAllCompleted, activeGuidedProject, currentPoints, totalPoints]);

  // Record guided lesson completion on close
  useEffect(() => {
    const prev = prevGuidedRef.current;
    if (prev && !activeGuidedProject && prev.steps.every(s => s.completed)) {
      const lessonName = typeof prev.title === 'string' ? prev.title : (prev.title as { tr?: string; en?: string })?.tr || (prev.title as { tr?: string; en?: string })?.en || 'Guided Lesson';
      const earned = prev.steps.filter(s => s.completed).reduce((sum, s) => sum + (s.points || 0), 0);
      const total = prev.steps.reduce((sum, s) => sum + (s.points || 0), 0);
      addGuidedLessonRecord(lessonName, earned, total);
    }
    prevGuidedRef.current = activeGuidedProject;
  }, [activeGuidedProject]);

  // Record exam completion
  useEffect(() => {
    if (isExamFinished && activeExam) {
      const maxScore = activeExam.tasks.reduce((sum, t) => sum + t.weight, 0);
      const examName = typeof activeExam.title === 'string' ? activeExam.title : (activeExam.title as { tr?: string; en?: string })?.tr || (activeExam.title as { tr?: string; en?: string })?.en || 'Exam';
      addExamRecord(examName, examScore, maxScore || 100);
    }
  }, [isExamFinished, activeExam, examScore]);




  const [saveDialog, setSaveDialog] = useState<{
    show: boolean;
    message: string;
    onConfirm: (save: boolean) => void;
  } | null>(null);

  const exampleLevelLabels = useMemo(
    () => ({
      basic: t.levelBasic,
      intermediate: t.levelIntermediate,
      advanced: t.levelAdvanced
    }),
    [t]
  );

  const exampleLevelHints = useMemo(
    () => ({
      basic: t.basicHint,
      intermediate: t.intermediateHint,
      advanced: (t as Record<string, string>).advancedHint ?? t.intermediateHint
    }),
    [t]
  );

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
    deviceStates,
    setDeviceStates,
    deviceOutputs,
    setDeviceOutputs,
    pcOutputs,
    setPcOutputs,
    pcHistories,
    setPcHistories,
    isLoading: isExecutingCommand,
    confirmDialog,
    setConfirmDialog,
    getOrCreateDeviceState,
    getOrCreateDeviceOutputs,
    getOrCreatePCOutputs,
    handleCommandForDevice,
  } = useDeviceManager();

  // Zustand store state - using granular selectors to prevent cascading re-renders
  const topologyDevices = useTopologyDevices();
  const topologyConnections = useTopologyConnections();
  const topologyNotes = useTopologyNotes();
  const zoom = useZoom();
  const pan = usePan();
  const activeTab = useActiveTab();
  const environment = useEnvironment();

  const helpLevel = useAppStore(state => state.helpLevel);

  const setDevices = useAppStore((state) => state.setDevices);
  const setConnections = useAppStore((state) => state.setConnections);
  const setNotes = useAppStore((state) => state.setNotes);
  const setZoom = useAppStore((state) => state.setZoom);
  const setPan = useAppStore((state) => state.setPan);
  const graphicsQuality = useAppStore((state) => state.graphicsQuality);
  const setGraphicsQuality = useAppStore((state) => state.setGraphicsQuality);

  // Navigation hook (provides history management, device selection, focus)
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
    setActiveTabWithHistory, setDeviceTabWithHistory, handlePCPanelNavigate,
    focusDeviceInTopology,
    activeTabRef,
    pendingFocusDeviceRef, topologyContainerRef,
  } = nav;

  // Network logic functions
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
    setZoom: setZoom,
    focusDeviceInTopology,
    pendingFocusDeviceRef,
    graphicsQuality,
  });

  const {
    isTroubleshootingMinimized,
    setIsTroubleshootingMinimized,
    showTroubleshootingPanel,
    setShowTroubleshootingPanel,
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

  const handleDeviceSelectFromCanvas = useCallback((device: DeviceType, deviceId?: string, switchModel?: string, deviceName?: string, isNew?: boolean, deviceData?: CanvasDevice) => {
    if (device === 'pc') {
      setShowUnifiedDeviceModal(false);
      setShowRouterPanel(false);
      setShowFirewallPanel(false);
    } else if (device === 'switchL2' || device === 'switchL3' || device === 'router' || device === 'firewall' || device === 'wlc') {
      setShowPCPanel(false);
    }
    nav.handleDeviceSelectFromCanvas(device, deviceId, switchModel, deviceName, isNew, deviceData);

    // Call checkStepCompletionWithContext for device access check
    if (deviceId) {
      const accessedType =
        device === 'switchL2' || device === 'switchL3' ? 'switch' :
          device === 'router' ? 'router' :
            device === 'pc' ? 'pc' : null;

      checkStepCompletionWithContext({
        deviceAccessed: accessedType,
        deviceAccessedId: deviceId,
        deviceStates,
        topologyConnections,
        topologyDevices
      });
    }
  }, [nav, setShowUnifiedDeviceModal, setShowRouterPanel, setShowFirewallPanel, setShowPCPanel, checkStepCompletionWithContext, deviceStates, topologyConnections, topologyDevices]);

  const handleDeviceSelectFromMenu = useCallback((device: DeviceType, deviceId?: string, switchModel?: string, deviceName?: string) => {
    if (device === 'pc') {
      setShowUnifiedDeviceModal(false);
      setShowRouterPanel(false);
      setShowFirewallPanel(false);
    } else if (device === 'switchL2' || device === 'switchL3' || device === 'router' || device === 'firewall' || device === 'wlc') {
      setShowPCPanel(false);
    }
    nav.handleDeviceSelectFromMenu(device, deviceId, switchModel, deviceName);

    // Call checkStepCompletionWithContext for device access check
    if (deviceId) {
      const accessedType =
        device === 'switchL2' || device === 'switchL3' ? 'switch' :
          device === 'router' ? 'router' :
            device === 'pc' ? 'pc' : null;

      checkStepCompletionWithContext({
        deviceAccessed: accessedType,
        deviceAccessedId: deviceId,
        deviceStates,
        topologyConnections,
        topologyDevices
      });
    }
  }, [nav, setShowUnifiedDeviceModal, setShowRouterPanel, setShowFirewallPanel, setShowPCPanel, checkStepCompletionWithContext, deviceStates, topologyConnections, topologyDevices]);
  // Wrapper to match PCPanel's single-arg onNavigate signature
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
    if (!isExamActive) {
      setRefreshNetworkReport(prev => prev ? { ...prev, show: false } : null);
    }
    window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'escape' } }));
  }, []);

  useEffect(() => {
    const handleMobileBack = () => {
      closeEscLikeWindows();
      closeAllPanels();
    };
    window.addEventListener('mobile-back-pressed', handleMobileBack as EventListener);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack as EventListener);
  }, [closeAllPanels, closeEscLikeWindows]);

  useEffect(() => {
    const timer = setTimeout(() => setHasHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Bootstrap performance monitoring in development without affecting production UX.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const intervalId = window.setInterval(() => {
      const metrics = performanceMonitor.getMetrics();
      const thresholdStatus = performanceMonitor.checkThresholds();
      (window as unknown as { __netsimPerformance?: unknown }).__netsimPerformance = {
        metrics,
        thresholdStatus,
        timestamp: Date.now(),
      };
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Helper functions for state setters to maintain compatibility
  const setTopologyDevices = setDevices;
  const setTopologyConnections = setConnections;
  const setTopologyNotes = setNotes;

  // Currently active device in terminal

  useNetworkSimulation(deviceStates, setTopologyDevices, networkLogic);

  const liveSummary = useMemo(
    () => computeLiveSummary(topologyDevices, topologyConnections, deviceStates),
    [topologyDevices, topologyConnections, deviceStates]
  );



  useEffect(() => {
    try {
      const appStoreData = localStorage.getItem('network-simulator-storage');
      if (!appStoreData) {
        setGraphicsQuality('high');
      }
    } catch {
      setGraphicsQuality('high');
    }
  }, [setGraphicsQuality]);

  // Reset scroll when topology is reset or project loaded
  useEffect(() => {
    if (topologyContainerRef.current) {
      topologyContainerRef.current.scrollTop = 0;
      topologyContainerRef.current.scrollLeft = 0;
    }
  }, [topologyKey]);

  useEffect(() => {
    let savedData: string | null = null;
    try { savedData = localStorage.getItem('netsim_autosave'); } catch { /* storage unavailable */ }
    if (!savedData) {
      setTopologyDevices([]);
      setTopologyConnections([]);
      setTopologyNotes([]);
    }
  }, []);



  // Modal drag/resize — unified hook
  const pcDrag = useDrag({ mode: 'drag-resize', storageKey: 'pc-modal-position', defaultSize: { width: 800, height: 600 }, disableSnap: true });
  const firewallDrag = useDrag({ mode: 'drag-resize', storageKey: 'firewall-modal-position', defaultSize: { width: 600, height: 500 }, disableSnap: true });
  const unifiedDrag = useDrag({ mode: 'drag-resize', storageKey: 'unified-modal-position', defaultSize: { width: 1200, height: 700 }, disableSnap: true });
  const routerDrag = useDrag({ mode: 'drag-resize', storageKey: 'router-modal-position', defaultSize: { width: 896, height: 600 }, disableSnap: true });

  // Get current state helper
  const getCurrentState = useCallback((): ProjectState => ({
    topologyDevices: Array.isArray(topologyDevices) ? [...topologyDevices] : [],
    topologyConnections: Array.isArray(topologyConnections) ? [...topologyConnections] : [],
    topologyNotes: Array.isArray(topologyNotes) ? [...topologyNotes] : [],
    deviceStates: new Map(deviceStates || []),
    deviceOutputs: new Map(deviceOutputs || []),
    pcOutputs: new Map(pcOutputs || []),
    pcHistories: new Map(pcHistories || []),
    cableInfo: { ...cableInfo },
    activeDeviceId: activeDeviceId || '',
    activeDeviceType: activeDeviceType || 'switchL2',
    zoom,
    pan: { ...pan },
    activeTab
  }), [topologyDevices, topologyConnections, topologyNotes, deviceStates, deviceOutputs, pcOutputs, pcHistories, cableInfo, activeDeviceId, activeDeviceType, zoom, pan, activeTab]);

  const { pushState, undo, redo, canUndo, canRedo, resetHistory, currentState, historyItems, historyIndex, jumpTo, loadHistory } = useHistory(getCurrentState());

  const pendingActionDesc = useRef<string | null>(null);
  const commitAction = useCallback((desc: string) => {
    pendingActionDesc.current = desc;
  }, []);

  // Handle undo/redo execution
  const applyProjectState = useCallback((state: ProjectState) => {
    // We use functional updates to ensure we're using latest state and prevent loops if possible
    // but here we just want to set EVERYTHING at once.
    setTopologyDevices(state.topologyDevices);
    setTopologyConnections(state.topologyConnections);
    setTopologyNotes(state.topologyNotes || []);
    setDeviceStates(new Map(state.deviceStates));
    setDeviceOutputs(new Map(state.deviceOutputs));
    setPcOutputs(new Map(state.pcOutputs));
    setPcHistories(new Map(state.pcHistories || []));
    setCableInfo(state.cableInfo);
    setActiveDeviceId(state.activeDeviceId);
    setActiveDeviceType(state.activeDeviceType);
    setZoom(state.zoom);
    setPan(state.pan);
    if (state.activeTab) {
      setActiveTab(state.activeTab as TabType);
    }
    // setTopologyKey(prev => prev + 1); // Only for resets
  }, [setTopologyDevices, setTopologyConnections, setTopologyNotes, setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories, setCableInfo, setActiveDeviceId, setActiveDeviceType, setZoom, setPan, setActiveTab]);

  const handleUndo = useCallback(() => {
    if (activeTabRef.current !== 'topology') return;
    isApplyingHistoryRef.current = true;
    pendingHistoryActionRef.current = 'undo';
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    if (activeTabRef.current !== 'topology') return;
    isApplyingHistoryRef.current = true;
    pendingHistoryActionRef.current = 'redo';
    redo();
  }, [redo]);

  const handleJumpTo = useCallback((index: number) => {
    isApplyingHistoryRef.current = true;
    pendingHistoryActionRef.current = 'jumpTo';
    jumpTo(index);
  }, [jumpTo]);

  useEffect(() => {
    if (!isApplyingHistoryRef.current) return;
    if (!currentState) return;
    if (lastAppliedHistoryStateRef.current === currentState) return;

    applyProjectState(currentState);
    lastAppliedHistoryStateRef.current = currentState;
  }, [currentState, applyProjectState]);

  // Track changes and push to history
  // We need to debouncing this or use a ref to track if we're in the middle of an undo/redo

  // Initialize lastPushedStateRef with initial state to avoid redundant first push
  useEffect(() => {
    lastPushedStateRef.current = serializeState(getCurrentState());
  }, []); // Run once on mount

  useEffect(() => {
    if (isAppLoading) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const stateString = serializeState(getCurrentState());

    if (stateString !== lastPushedStateRef.current) {
      if (isApplyingHistoryRef.current) {
        lastPushedStateRef.current = stateString;
        isApplyingHistoryRef.current = false;
      } else if (pendingActionDesc.current) {
        // Small timeout ensures all React batch updates are captured
        // We do NOT clear pendingActionDesc.current synchronously to prevent losing actions on rapid re-renders
        timer = setTimeout(() => {
          const s = getCurrentState();
          const freshStateString = serializeState(s);

          if (pendingActionDesc.current) {
            pushState(s, activeTab === 'topology' ? 'topology' : 'ui', pendingActionDesc.current);
            pendingActionDesc.current = null;
          }
          lastPushedStateRef.current = freshStateString;
        }, 150); // Slightly larger debounce to capture all cascading state updates
      } else {
        // Auto-push state changes to history with debounce (coalesces rapid changes like drag)
        timer = setTimeout(() => {
          const freshState = getCurrentState();
          pushState(freshState, activeTab === 'topology' ? 'topology' : 'ui', undefined);
          lastPushedStateRef.current = serializeState(freshState);
        }, 300);
      }
    } else {
      // If state didn't change but we were applying history, 
      // we still need to clear the flag
      if (isApplyingHistoryRef.current) {
        isApplyingHistoryRef.current = false;
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [topologyDevices, topologyConnections, topologyNotes, deviceStates, deviceOutputs, pcOutputs, pcHistories, cableInfo, activeDeviceId, activeDeviceType, zoom, pan, activeTab, isAppLoading, pushState]);

  // Show hourglass cursor during app startup
  useEffect(() => {
    document.body.style.cursor = 'wait';
    return () => { document.body.style.cursor = ''; };
  }, []);

  useEffect(() => {
    if (!isAppLoading) {
      document.body.style.cursor = '';
    }
  }, [isAppLoading]);

  useEffect(() => {
    // Initial loading sequence: short splash, then skeleton, then content.
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const splashMs = prefersReducedMotion ? 300 : 700;
    const skeletonMs = splashMs + 400;

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, splashMs);

    const skeletonTimer = setTimeout(() => {
      setShowSkeleton(false);
    }, skeletonMs);

    return () => {
      clearTimeout(timer);
      clearTimeout(skeletonTimer);
    };
  }, []);



  // Legacy state for compatibility with other panels (uses active device's state)
  const state = useMemo(() => {
    if (!activeDeviceId || activeDeviceId.trim() === '') {
      return createInitialState();
    }
    const activeDevice = (topologyDevices || []).find(d => d.id === activeDeviceId);
    const resolvedType = activeDevice?.type ?? activeDeviceType;
    return getOrCreateDeviceState(activeDeviceId, resolvedType, activeDevice?.name, activeDevice?.macAddress, activeDevice?.switchModel);
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

  // Redundant declaration of activeTab removed (moved higher)
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Task context for task calculations
  const taskContext: TaskContext = {
    cableInfo,
    showPCPanel,
    showRouterPanel,
    selectedDevice,
    language,
    deviceStates,
    topologyConnections,
  };

  // Track task completion changes globally
  useEffect(() => {
    if (!isTaskSystemEnabled) {
      prevTaskStatusRef.current.clear();
      setTimeout(() => setLastTaskEvent(null), 0);
      return;
    }

    activeDeviceTasks.forEach(task => {
      const currentStatus = getTaskStatus(task, state, taskContext);
      const previousStatus = prevTaskStatusRef.current.get(task.id) ?? false;
      const toastKey = `${task.id}-${currentStatus}`;

      // Task completed - show in footer only once
      if (currentStatus && !previousStatus && !shownToastsRef.current.has(toastKey)) {
        const taskName = task.name[language];
        setLastTaskEvent({ type: 'completed', taskName, timestamp: Date.now() });
        shownToastsRef.current.add(toastKey);
        // Remove the failed toast key if it exists
        shownToastsRef.current.delete(`${task.id}-false`);
      }
      // Task failed (was completed but now it's not) - show in footer only once
      else if (!currentStatus && previousStatus && !shownToastsRef.current.has(toastKey)) {
        const taskName = task.name[language];
        setLastTaskEvent({ type: 'failed', taskName, timestamp: Date.now() });
        shownToastsRef.current.add(toastKey);
        // Remove the completed toast key if it exists
        shownToastsRef.current.delete(`${task.id}-true`);
      }

      // Update previous status
      prevTaskStatusRef.current.set(task.id, currentStatus);
    });
  }, [activeDeviceTasks, isTaskSystemEnabled, state, taskContext, language, activeDeviceType]);

  // Calculate total score
  const totalScore = isTaskSystemEnabled ? calculateTaskScore(activeDeviceTasks, state, taskContext) : 0;

  // Calculate max possible score
  const maxScore = activeDeviceTasks.reduce((acc, task) => acc + task.weight, 0);

  // Room sync data
  const completedTaskCount = activeDeviceTasks.filter(t => getTaskStatus(t, state, taskContext)).length;
  const totalTaskCount = activeDeviceTasks.length;
  const currentTaskName = activeDeviceTasks.length > 0
    ? activeDeviceTasks.find(t => !getTaskStatus(t, state, taskContext))?.name[language] ?? activeDeviceTasks[activeDeviceTasks.length - 1].name[language]
    : '';
  const { studentRoomCode, studentDisplayName, setShowRoomJoinDialog, setShowTeacherPanel } = useRoom();
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



  // Persistence: Save to localStorage
  useEffect(() => {
    if (isAppLoading) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      // Get PC and IoT device IDs to filter them out from deviceStates
      // These device types don't need full SwitchState with 24 ports
      const excludedDeviceIds = new Set(
        topologyDevices.filter(d => d.type === 'pc' || d.type === 'iot').map(d => d.id)
      );

      const projectData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        // Filter out PC/IoT device states - they don't need SwitchState with ports
        devices: Array.from(deviceStates.entries())
          .filter(([id]) => !excludedDeviceIds.has(id))
          .map(([id, state]) => ({ id, state })),
        // Filter out entries with empty/invalid IDs
        deviceOutputs: Array.from(deviceOutputs.entries())
          .filter(([id]) => id && id.trim() !== '')
          .map(([id, outputs]) => ({ id, outputs })),
        pcOutputs: Array.from(pcOutputs.entries())
          .filter(([id]) => id && id.trim() !== '')
          .map(([id, outputs]) => ({ id, outputs })),
        pcHistories: Array.from(pcHistories.entries())
          .filter(([id]) => id && id.trim() !== '')
          .map(([id, history]) => ({ id, history })),
        topology: {
          // Filter out devices with empty/invalid IDs
          devices: topologyDevices.filter(d => d.id && d.id.trim() !== ''),
          connections: topologyConnections,
          notes: topologyNotes,
          zoom,
          pan,
        },
        // Reset cableInfo if no valid devices exist
        cableInfo: topologyDevices.length > 0 ? cableInfo : { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: topologyDevices.find(d => d.id === activeDeviceId)?.id || '',
        activeDeviceType,
        activeTab
      };

      try { localStorage.setItem('netsim_autosave', safeStringify(projectData)); } catch { /* storage unavailable */ }
      autosaveTimerRef.current = null;
      setLastSaveTime(new Date().toLocaleTimeString());
      setHasUnsavedChanges(false);
    }, 800);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [deviceStates, deviceOutputs, pcOutputs, pcHistories, topologyDevices, topologyConnections, topologyNotes, cableInfo, activeDeviceId, activeDeviceType, activeTab, isAppLoading, zoom, pan]);

  // Restore saved position for refresh network report
  useEffect(() => {
    if (!refreshNetworkReport?.show || !refreshReportRef.current) return;
    if (isMobile) return; // Mobile'da floating davranışı gereksiz
    try {
      const saved = localStorage.getItem('draggable_position_refresh-network-report');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const el = refreshReportRef.current;
          const rect = el.getBoundingClientRect();
          // Güvenli bölgeye konumla (header altı, ekran dışına taşma koruması)
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

  // Load project from JSON data
  const loadProjectData = useLoadProjectData({
    setDeviceStates,
    setDeviceOutputs,
    setPcOutputs,
    setPcHistories,
    setActiveDeviceId,
    setActiveDeviceType,
    setSelectedDevice,
    setCableInfo,
    setTopologyKey,
    setHasUnsavedChanges,
    resetHistory,
    loadHistory,
    normalizeDeviceType,
    applyLinkLocalToUnconfiguredHosts,
    resetWorkspaceUiState,
    startExamProject,
  });



  // Refresh network connections and WiFi status
  const handleRefreshNetwork = useCallback(() => {
    // Close floating panels on network refresh
    setActiveDeviceId('');
    setSelectedDevice(null);
    window.dispatchEvent(new CustomEvent('network-refresh'));


    const getEffectiveWifi = (device: CanvasDevice): CanvasDevice['wifi'] => {
      const state = deviceStates?.get(device.id);
      const wlan = state?.ports?.['wlan0'];
      const runtimeWifi = wlan?.wifi;
      if (!runtimeWifi) return device.wifi;

      const normalizedMode = normalizeWifiMode(runtimeWifi.mode);
      const enabled = !wlan.shutdown && normalizedMode !== 'disabled';
      const fallbackMode: 'ap' | 'client' = device.type === 'pc' ? 'client' : 'ap';
      const resolvedMode: 'ap' | 'client' = normalizedMode === 'disabled'
        ? (device.wifi?.mode || fallbackMode)
        : (normalizedMode === 'client' ? 'client' : 'ap');
      return {
        ...device.wifi,
        enabled,
        ssid: runtimeWifi.ssid || device.wifi?.ssid || '',
        security: runtimeWifi.security || device.wifi?.security || 'open',
        password: runtimeWifi.password || device.wifi?.password,
        channel: runtimeWifi.channel || device.wifi?.channel || '2.4GHz',
        mode: resolvedMode,
      };
    };
    const getOpenServices = (device: CanvasDevice, state?: SwitchState) => {
      const services = new Set<string>();
      if (device.services?.dhcp?.enabled || state?.services?.dhcp?.enabled) services.add('DHCP');
      if (device.services?.dns?.enabled || state?.services?.dns?.enabled) services.add('DNS');
      if (device.services?.http?.enabled || state?.services?.http?.enabled) services.add('HTTP');
      const effectiveWifi = getEffectiveWifi(device);
      if (effectiveWifi?.enabled) services.add(effectiveWifi.mode === 'ap' ? 'WiFi AP' : 'WiFi Client');
      if (state?.security?.vtyLines?.transportInput?.some((input) => input === 'ssh' || input === 'all')) services.add('SSH');
      if (state?.security?.vtyLines?.transportInput?.some((input) => input === 'telnet' || input === 'all')) services.add('Telnet');
      return Array.from(services).join(', ') || t.none;
    };
    const buildRefreshDeviceSummaries = (devices: CanvasDevice[], states: Map<string, SwitchState>): RefreshDeviceSummary[] => {
      const summaries = devices.map((device) => {
        const state = states.get(device.id);
        const statePorts = Object.values(state?.ports || {});
        const topologyPorts = device.ports || [];
        const portIp = statePorts.find((port) => hasValidIp(port.ipAddress))?.ipAddress
          || topologyPorts.find((port) => hasValidIp(port.ipAddress))?.ipAddress;
        const portMac = statePorts.find((port) => port.macAddress)?.macAddress
          || topologyPorts.find((port) => port.macAddress)?.macAddress;
        const portIpv6 = statePorts.find((port) => port.ipv6Address)?.ipv6Address;

        return {
          id: device.id,
          name: device.name || device.id,
          type: device.type,
          ip: firstValue(device.ip, portIp),
          mac: firstValue(device.macAddress, state?.macAddress, portMac),
          gateway: device.gateway || state?.defaultGateway || '0.0.0.0',
          ipv6: device.ipv6 || portIpv6 || '::',
          services: getOpenServices(device, state),
        };
      });

      return summaries.sort((a, b) => {
        const typeDiff = REFRESH_DEVICE_TYPE_ORDER.indexOf(a.type) - REFRESH_DEVICE_TYPE_ORDER.indexOf(b.type);
        if (typeDiff !== 0) return typeDiff;
        return a.name.localeCompare(b.name, language === 'tr' ? 'tr' : 'en');
      });
    };



    const disconnectedPCs: string[] = [];
    const disconnectedAPs: string[] = [];
    const connectedWirelessClients: string[] = [];
    const activeAPs: string[] = [];
    let dhcpServerActiveCount = 0;
    let dhcpServerNoPoolCount = 0;
    let dhcpClientWithLeaseCount = 0;
    let dhcpClientNoLeaseCount = 0;
    let duplicateIpCount = 0;
    let duplicateMacCount = 0;
    let duplicateIpv6Count = 0;
    let subnetMismatchCount = 0;
    let invalidGatewayCount = 0;
    let disconnectedLinkCount = 0;
    let loopDetectedCount = 0;
    let vlanInconsistencyCount = 0;

    if (topologyDevices && deviceStates) {
      const { sanitizedConnections, invalidCount } = validateTopologyConnections(topologyDevices, topologyConnections);
      const connectionsChanged = sanitizedConnections.some((connection, index) => connection !== topologyConnections[index]);
      if (connectionsChanged) {
        setTopologyConnections(sanitizedConnections);
      }

      const releasedTopology = releaseDisconnectedPorts(topologyDevices, deviceStates, sanitizedConnections);
      let refreshedDevices = releasedTopology.devices.map((device) => ({
        ...device,
        wifi: getEffectiveWifi(device),
      }));
      const releasedDeviceStates = releasedTopology.states;

      // 1. Recalculate wireless associations and persist the effective BSSID.
      refreshedDevices = refreshedDevices.map((device) => {
        if (device.type !== 'pc' && device.type !== 'iot') return device;
        const clientWifi = device.wifi;
        if (!clientWifi?.enabled || clientWifi.mode !== 'client' || !clientWifi.ssid) return device;

        const matchedAp = refreshedDevices.find((ap) =>
          ap.id !== device.id &&
          (ap.type === 'router' || isSwitchDeviceType(ap.type)) &&
          isWirelessMatch(device, ap)
        );

        if (matchedAp) {
          connectedWirelessClients.push(device.name || device.id);
          return {
            ...device,
            wifi: {
              ...clientWifi,
              bssid: matchedAp.id,
            },
          };
        }

        disconnectedPCs.push(device.name || device.id);
        return {
          ...device,
          wifi: {
            ...clientWifi,
            bssid: undefined,
          },
        };
      });

      // 2. Check and update AP connections (router/switch)
      refreshedDevices.filter(d => d.type === 'router' || isSwitchDeviceType(d.type)).forEach(ap => {
        const apWifi = ap.wifi;
        if (!apWifi || apWifi.mode !== 'ap' || !apWifi.ssid) return;

        let hasClient = false;

        // Check if any wireless client is associated with this AP
        refreshedDevices.forEach(pc => {
          if (pc.type !== 'pc' && pc.type !== 'iot') return;
          const pcWifi = pc.wifi;
          if (!pcWifi?.enabled || pcWifi.mode !== 'client') return;
          if (pcWifi.bssid !== ap.id) return;

          hasClient = true;
        });

        if (hasClient) {
          activeAPs.push(ap.name || ap.id);
        } else {
          disconnectedAPs.push(ap.name || ap.id);
        }
      });

      // 3. VTP propagation (server -> client over trunk)
      const vtpUpdatedStates = propagateVtpVlans(refreshedDevices, releasedDeviceStates, sanitizedConnections);

      // 4. STP calculation
      const stpUpdatedStates = recalculateStp(vtpUpdatedStates, sanitizedConnections);
      const stpUpdatedCount = Array.from(vtpUpdatedStates.keys()).filter(id => {
        const d = refreshedDevices.find(dev => dev.id === id);
        return d && (d.type === 'switchL2' || d.type === 'switchL3');
      }).length;

      // 8.5. DHCP Assignment - Do this before showing the refresh panel
      const dhcpClients = refreshedDevices.filter(d => (d.type === 'pc' || d.type === 'iot') && d.ipConfigMode === 'dhcp');
      const dhcpAssignments: Array<{ name: string, ip: string }> = [];
      const finalDevicesForRefresh = [...refreshedDevices];

      if (dhcpClients.length > 0) {
        dhcpClients.forEach(pc => {
          const lease = assignDhcpLeaseForPc(pc, finalDevicesForRefresh, stpUpdatedStates, sanitizedConnections) || buildLinkLocalLease(pc, finalDevicesForRefresh);
          if (lease) {
            const idx = finalDevicesForRefresh.findIndex(d => d.id === pc.id);
            if (idx !== -1) {
              finalDevicesForRefresh[idx] = {
                ...finalDevicesForRefresh[idx],
                ip: lease.ip,
                subnet: lease.subnet,
                gateway: lease.gateway,
                dns: lease.dns
              };
              if (!lease.ip.startsWith('169.254.')) {
                dhcpAssignments.push({ name: pc.name || pc.id, ip: lease.ip });
              }

              // Update PC terminal output
              const pcOut = pcOutputs.get(pc.id);
              if (pcOut) {
                const updatedOut = pcOut.map(line => {
                  if (line.id === '1' || line.content?.includes('IPv4 Address')) {
                    return {
                      ...line,
                      content: `\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ${lease.ip}\n   Subnet Mask . . . . . . . . . . : ${lease.subnet}\n   Default Gateway . . . . . . . . . : ${lease.gateway}\n`
                    };
                  }
                  return line;
                });
                setPcOutputs(prev => new Map(prev).set(pc.id, updatedOut as unknown as PCOutputLine[]));
              }
            }
          }
        });

        // Show combined DHCP toast if any assignments were made
        if (dhcpAssignments.length > 0) {
          toast({
            title: `📝 ${t.dhcpAssignments}`,
            description: (
              <div className="flex flex-col gap-1 text-xs">
                {dhcpAssignments.map((asgn, i) => (
                  <div key={i} className="flex justify-between gap-4">
                    <span className="font-medium">{asgn.name}:</span>
                    <span className="text-primary-400">{asgn.ip}</span>
                  </div>
                ))}
              </div>
            ),
            duration: 4000,
          });
        }
      }

      // 8.6. Port Security Check - Check all switch ports for MAC violations
      const portSecurityUpdatedStates = new Map(stpUpdatedStates);
      let portSecurityViolationCount = 0;
      let portSecurityRecoveredCount = 0;

      sanitizedConnections.forEach(conn => {
        if (!conn.active) return;

        // Find switch device and connected device
        const switchDevice = finalDevicesForRefresh.find(d =>
          (d.type === 'switchL2' || d.type === 'switchL3') &&
          (d.id === conn.sourceDeviceId || d.id === conn.targetDeviceId)
        );
        const connectedDevice = finalDevicesForRefresh.find(d =>
          d.type === 'pc' &&
          (d.id === conn.sourceDeviceId || d.id === conn.targetDeviceId)
        );

        if (!switchDevice || !connectedDevice) return;

        // Determine which port on the switch
        const switchPortId = switchDevice.id === conn.sourceDeviceId ? conn.sourcePort : conn.targetPort;
        const switchState = portSecurityUpdatedStates.get(switchDevice.id);
        if (!switchState) return;

        const switchPort = switchState.ports[switchPortId];
        if (!switchPort?.portSecurity?.enabled) return;

        // Get the connected device's MAC address
        const deviceMac = connectedDevice.macAddress;
        if (!deviceMac) return;

        // Normalize MAC for comparison
        const normalizedDeviceMac = deviceMac.toLowerCase().replace(/[-:.]/g, '');
        const staticMacs = switchPort.staticMacs || [];
        const normalizedStaticMacs = staticMacs.map(m => m.toLowerCase().replace(/[-:.]/g, ''));

        // Check if MAC is in the allowed list
        const isAllowed = normalizedStaticMacs.includes(normalizedDeviceMac);

        const updatedPorts = { ...switchState.ports };

        if (!isAllowed) {
          // Port security violation - block the port
          if (!switchPort.shutdown || switchPort.status !== 'err-disabled') {
            updatedPorts[switchPortId] = {
              ...switchPort,
              shutdown: true,
              status: 'err-disabled',
              portSecurity: switchPort.portSecurity ? {
                ...switchPort.portSecurity,
                violations: (switchPort.portSecurity.violations || 0) + 1
              } : undefined
            };
            portSecurityUpdatedStates.set(switchDevice.id, {
              ...switchState,
              ports: updatedPorts
            });
            portSecurityViolationCount++;
          }
        } else {
          // MAC matches - recover the port if it was err-disabled
          if (switchPort.shutdown && switchPort.status === 'err-disabled') {
            updatedPorts[switchPortId] = {
              ...switchPort,
              shutdown: false,
              status: 'connected',
              portSecurity: switchPort.portSecurity ? {
                ...switchPort.portSecurity
              } : undefined
            };
            portSecurityUpdatedStates.set(switchDevice.id, {
              ...switchState,
              ports: updatedPorts
            });
            portSecurityRecoveredCount++;
          }
        }
      });

      setDeviceStates(portSecurityUpdatedStates);

      // 8.7. Sync STP state and Port Security state from deviceStates to topologyDevices ports
      const stpSyncedDevices = finalDevicesForRefresh.map((device) => {
        const deviceState = portSecurityUpdatedStates.get(device.id);
        if (!deviceState || !deviceState.ports) return device;

        // Update ports with spanningTree state and port security state from deviceState
        const updatedPorts = device.ports.map((port) => {
          const statePort = deviceState.ports[port.id];
          if (statePort) {
            return {
              ...port,
              spanningTree: statePort.spanningTree,
              shutdown: statePort.shutdown,
              portSecurity: statePort.portSecurity
            };
          }
          return port;
        });

        return {
          ...device,
          ports: updatedPorts
        };
      });

      // Update topology devices with STP-synced ports, then run one explicit IoT automation pass for F5 refresh.
      const iotProcessedDevices = iotAutomationPass(stpSyncedDevices);
      setTopologyDevices(iotProcessedDevices);

      const allDhcpPools: Array<{ startIp: string; maxUsers: number }> = [];
      dhcpServerActiveCount = 0;
      dhcpServerNoPoolCount = 0;
      dhcpClientWithLeaseCount = 0;
      dhcpClientNoLeaseCount = 0;

      iotProcessedDevices.forEach((device) => {
        const state = portSecurityUpdatedStates.get(device.id);
        const topologyPools = device.services?.dhcp?.pools || [];
        const runtimePools = state?.services?.dhcp?.pools || [];
        const cliPoolEntries = Object.values(state?.dhcpPools || {});
        const cliPools = cliPoolEntries.map((pool: Record<string, unknown>) => {
          const networkPrefix = ((pool?.network as string) || '').split('.').slice(0, 3).join('.');
          return {
            startIp: (pool?.startIp as string) || (networkPrefix ? `${networkPrefix}.100` : ''),
            maxUsers: Number(pool?.maxUsers || 50),
          };
        }).filter((p: Record<string, unknown>) => p.startIp);
        const poolCount = topologyPools.length + runtimePools.length + cliPools.length;
        const dhcpEnabled = !!(device.services?.dhcp?.enabled || state?.services?.dhcp?.enabled || cliPoolEntries.length > 0);

        if (dhcpEnabled) {
          if (poolCount > 0) dhcpServerActiveCount++;
          else dhcpServerNoPoolCount++;
        }

        topologyPools.forEach((p) => allDhcpPools.push({ startIp: p.startIp, maxUsers: Number(p.maxUsers || 50) }));
        runtimePools.forEach((p) => allDhcpPools.push({ startIp: p.startIp, maxUsers: Number(p.maxUsers || 50) }));
        cliPools.forEach((p: Record<string, unknown>) => allDhcpPools.push({ startIp: p.startIp as string, maxUsers: Number(p.maxUsers || 50) }));
      });

      iotProcessedDevices.forEach((device) => {
        if (device.type !== 'pc' && device.type !== 'iot' || device.ipConfigMode !== 'dhcp') return;
        const state = portSecurityUpdatedStates.get(device.id);
        const runtimeIp = state?.ports?.['eth0']?.ipAddress || state?.ports?.['wlan0']?.ipAddress || '';
        const candidateIp = hasValidIp(device.ip) ? device.ip : runtimeIp;
        const hasLease = !!candidateIp &&
          !candidateIp.startsWith('169.254.') &&
          allDhcpPools.some((pool) => isIpInPoolRange(candidateIp, pool));

        if (hasLease) dhcpClientWithLeaseCount++;
        else dhcpClientNoLeaseCount++;
      });

      const refreshDeviceSummaries = buildRefreshDeviceSummaries(iotProcessedDevices, portSecurityUpdatedStates);

      const ipOwners = new Map<string, string[]>();
      const macOwners = new Map<string, string[]>();
      const ipv6Owners = new Map<string, string[]>();
      const rememberIdentity = (deviceName: string, ip?: string, mac?: string, ipv6?: string) => {
        if (ip && isValidIpv4(ip)) {
          const owners = ipOwners.get(ip) || [];
          owners.push(deviceName);
          ipOwners.set(ip, owners);
        }
        if (mac) {
          const normalized = normalizeMAC(mac || '').toLowerCase();
          if (normalized) {
            const owners = macOwners.get(normalized) || [];
            owners.push(deviceName);
            macOwners.set(normalized, owners);
          }
        }
        if (ipv6 && ipv6.trim()) {
          const normalized = ipv6.trim().toLowerCase();
          const owners = ipv6Owners.get(normalized) || [];
          owners.push(deviceName);
          ipv6Owners.set(normalized, owners);
        }
      };

      iotProcessedDevices.forEach((device) => {
        const state = portSecurityUpdatedStates.get(device.id);
        const deviceName = device.name || device.id;
        rememberIdentity(deviceName, device.ip, device.macAddress, device.ipv6);
        Object.values(state?.ports || {}).forEach((port: Port) => {
          rememberIdentity(`${deviceName}:${String(port?.id || '')}`, port?.ipAddress, port?.macAddress, port?.ipv6Address);
        });
      });
      duplicateIpCount = Array.from(ipOwners.values()).filter((owners) => owners.length > 1).length;
      duplicateMacCount = Array.from(macOwners.values()).filter((owners) => owners.length > 1).length;
      duplicateIpv6Count = Array.from(ipv6Owners.values()).filter((owners) => owners.length > 1).length;

      iotProcessedDevices.forEach((device) => {
        if ((device.type !== 'pc' && device.type !== 'iot') || !device.gateway || !isValidIpv4(device.ip) || !isValidIpv4(device.subnet || '')) return;
        const gateway = device.gateway || '';
        if (!isValidIpv4(gateway) || gateway === '0.0.0.0') {
          invalidGatewayCount++;
          return;
        }
        if (!isSameSubnetByMask(device.ip, gateway, device.subnet)) {
          subnetMismatchCount++;
          invalidGatewayCount++;
        }
      });

      // Disconnected links: endpoints are present but link is inactive or one side admin-down/blocked.
      sanitizedConnections.forEach((connection) => {
        const aState = portSecurityUpdatedStates.get(connection.sourceDeviceId);
        const bState = portSecurityUpdatedStates.get(connection.targetDeviceId);
        const aPort = aState?.ports?.[connection.sourcePort];
        const bPort = bState?.ports?.[connection.targetPort];
        if (!aPort || !bPort) return;
        const aDown = aPort.shutdown || aPort.adminStatus === 'down' || aPort.operStatus === 'down' || aPort.status === 'blocked' || aPort.status === 'err-disabled';
        const bDown = bPort.shutdown || bPort.adminStatus === 'down' || bPort.operStatus === 'down' || bPort.status === 'blocked' || bPort.status === 'err-disabled';
        if (connection.active === false || aDown || bDown) disconnectedLinkCount++;
      });

      const graph = new Map<string, string[]>();
      const addEdge = (a: string, b: string) => {
        graph.set(a, [...(graph.get(a) || []), b]);
        graph.set(b, [...(graph.get(b) || []), a]);
      };
      sanitizedConnections.forEach((connection) => {
        if (connection.active === false) return;
        addEdge(connection.sourceDeviceId, connection.targetDeviceId);
      });
      const visited = new Set<string>();
      const hasCycle = (node: string, parent: string | null): boolean => {
        visited.add(node);
        for (const next of graph.get(node) || []) {
          if (!visited.has(next)) {
            if (hasCycle(next, node)) return true;
          } else if (next !== parent) {
            return true;
          }
        }
        return false;
      };
      for (const node of graph.keys()) {
        if (!visited.has(node) && hasCycle(node, null)) {
          loopDetectedCount = 1;
          break;
        }
      }

      sanitizedConnections.forEach((connection) => {
        if (connection.active === false) return;
        const aState = portSecurityUpdatedStates.get(connection.sourceDeviceId);
        const bState = portSecurityUpdatedStates.get(connection.targetDeviceId);
        const aPort = aState?.ports?.[connection.sourcePort];
        const bPort = bState?.ports?.[connection.targetPort];
        if (!aPort || !bPort) return;
        const aTrunk = aPort.mode === 'trunk';
        const bTrunk = bPort.mode === 'trunk';
        if (aTrunk && bTrunk) {
          if (Number(aPort.nativeVlan || 1) !== Number(bPort.nativeVlan || 1)) vlanInconsistencyCount++;
          return;
        }
        const aVlan = Number(aPort.accessVlan || aPort.vlan || 1);
        const bVlan = Number(bPort.accessVlan || bPort.vlan || 1);
        if (aVlan !== bVlan) vlanInconsistencyCount++;
      });

      // ── Compute network summary ──
      const allVlans = new Set<number>();
      let totalRoutes = 0, connectedRoutes = 0, staticRoutes = 0, dynamicRoutes = 0;
      portSecurityUpdatedStates.forEach((state) => {
        if (state.vlans) Object.keys(state.vlans).forEach((vId) => allVlans.add(Number(vId)));
        [state.staticRoutes, state.dynamicRoutes].forEach((routes) => {
          if (!routes) return;
          routes.forEach((r) => {
            totalRoutes++;
            if (r.type === 'connected') connectedRoutes++;
            else if (r.type === 'static') staticRoutes++;
            else if (r.type === 'dynamic') dynamicRoutes++;
          });
        });
        Object.values(state.ports).forEach((port) => {
          if (port.ipAddress && port.subnetMask) {
            totalRoutes++;
            connectedRoutes++;
          }
        });
      });
      const summaryWarnings: string[] = [];
      if (subnetMismatchCount > 0) summaryWarnings.push(language === 'tr' ? `Alt ağ uyumsuzluğu: ${subnetMismatchCount}` : `Subnet mismatch: ${subnetMismatchCount}`);
      if (invalidGatewayCount > 0) summaryWarnings.push(language === 'tr' ? `Geçersiz ağ geçidi: ${invalidGatewayCount}` : `Invalid gateway: ${invalidGatewayCount}`);
      if (disconnectedLinkCount > 0) summaryWarnings.push(language === 'tr' ? `Kopuk bağlantı: ${disconnectedLinkCount}` : `Disconnected link: ${disconnectedLinkCount}`);
      if (loopDetectedCount > 0) summaryWarnings.push(language === 'tr' ? `Döngü algılandı` : `Loop detected`);
      if (vlanInconsistencyCount > 0) summaryWarnings.push(language === 'tr' ? `VLAN tutarsızlığı: ${vlanInconsistencyCount}` : `VLAN inconsistency: ${vlanInconsistencyCount}`);
      if (duplicateIpCount > 0) summaryWarnings.push(language === 'tr' ? `IP çakışması: ${duplicateIpCount}` : `IP conflict: ${duplicateIpCount}`);
      if (duplicateMacCount > 0) summaryWarnings.push(language === 'tr' ? `MAC çakışması: ${duplicateMacCount}` : `MAC conflict: ${duplicateMacCount}`);
      if (portSecurityViolationCount > 0) summaryWarnings.push(language === 'tr' ? `Port güvenlik ihlali: ${portSecurityViolationCount}` : `Port security violation: ${portSecurityViolationCount}`);
      if (dhcpServerNoPoolCount > 0) summaryWarnings.push(language === 'tr' ? `DHCP havuz yok: ${dhcpServerNoPoolCount}` : `DHCP no pool: ${dhcpServerNoPoolCount}`);
      if (dhcpClientNoLeaseCount > 0) summaryWarnings.push(language === 'tr' ? `DHCP kiralama yok: ${dhcpClientNoLeaseCount}` : `DHCP no lease: ${dhcpClientNoLeaseCount}`);
      const summary = {
        deviceCount: {
          total: iotProcessedDevices.length,
          routers: iotProcessedDevices.filter((d) => d.type === 'router').length,
          switches: iotProcessedDevices.filter((d) => d.type === 'switchL2' || d.type === 'switchL3').length,
          pcs: iotProcessedDevices.filter((d) => d.type === 'pc').length,
          iot: iotProcessedDevices.filter((d) => d.type === 'iot').length,
          firewalls: iotProcessedDevices.filter((d) => d.type === 'firewall').length,
          wlcs: iotProcessedDevices.filter((d) => d.type === 'wlc').length,
        },
        activeLinks: sanitizedConnections.filter((c) => c.active).length,
        vlanCount: allVlans.size,
        routingTableSummary: { totalRoutes, connected: connectedRoutes, static: staticRoutes, dynamic: dynamicRoutes },
        networkWarnings: summaryWarnings,
      };

      // 9. Show detailed notification (delayed if DHCP assignments were made)
      const showRefreshPanel = () => {
        const totalDevices = connectedWirelessClients.length + activeAPs.length + disconnectedPCs.length + disconnectedAPs.length;
        const stpMessage = stpUpdatedCount > 0
          ? `✓ ${language === 'tr' ? t.stpSwitchesUpdated.replace('X', String(stpUpdatedCount)) : `STP: ${stpUpdatedCount} ${stpUpdatedCount === 1 ? 'switch updated' : 'switches updated'}`}`
          : '';
        const portSecurityMessage = (portSecurityViolationCount > 0 || portSecurityRecoveredCount > 0)
          ? `🔒 ${t.portSecurityBlocked.replace('X', String(portSecurityViolationCount)).replace('Y', String(portSecurityRecoveredCount))}`
          : '';
        const topologyMessage = invalidCount > 0
          ? `${language === 'tr' ? t.topologyInvalidConnections.replace('X', String(invalidCount)) : `Topology: ${invalidCount} ${invalidCount === 1 ? 'invalid connection disabled' : 'invalid connections disabled'}`}`
          : '';
        const validationMessages = [
          subnetMismatchCount > 0 ? (language === 'tr' ? `⚠ Alt ağ uyumsuzluğu: ${subnetMismatchCount}` : `⚠ Subnet mismatch: ${subnetMismatchCount}`) : '',
          invalidGatewayCount > 0 ? (language === 'tr' ? `⚠ Geçersiz ağ geçidi: ${invalidGatewayCount}` : `⚠ Invalid gateway: ${invalidGatewayCount}`) : '',
          disconnectedLinkCount > 0 ? (language === 'tr' ? `⚠ Kopuk bağlantı: ${disconnectedLinkCount}` : `⚠ Disconnected link: ${disconnectedLinkCount}`) : '',
          loopDetectedCount > 0 ? (language === 'tr' ? `⚠ Döngü algılandı` : `⚠ Loop detected`) : '',
          vlanInconsistencyCount > 0 ? (language === 'tr' ? `⚠ VLAN tutarsızlığı: ${vlanInconsistencyCount}` : `⚠ VLAN inconsistency: ${vlanInconsistencyCount}`) : '',
        ].filter(Boolean);

        if (totalDevices > 0 || dhcpClients.length > 0) {
          const wifiMessages = [];
          if (connectedWirelessClients.length > 0) {
            wifiMessages.push(language === 'tr'
              ? `✓ ${connectedWirelessClients.length} kablosuz istemci bağlandı`
              : `✓ ${connectedWirelessClients.length} wireless client${connectedWirelessClients.length > 1 ? 's' : ''} connected`);
          }
          if (activeAPs.length > 0) {
            wifiMessages.push(language === 'tr'
              ? `✓ ${activeAPs.length} AP aktif`
              : `✓ ${activeAPs.length} AP active`);
          }
          if (disconnectedPCs.length > 0) {
            wifiMessages.push(language === 'tr'
              ? `⚠ ${disconnectedPCs.length} kablosuz istemcinin bağlantısı yok`
              : `⚠ ${disconnectedPCs.length} wireless client${disconnectedPCs.length > 1 ? 's' : ''} disconnected`);
          }
          if (disconnectedAPs.length > 0) {
            wifiMessages.push(language === 'tr'
              ? `⚠ ${disconnectedAPs.length} AP'nin istemcisi yok`
              : `⚠ ${disconnectedAPs.length} AP no client${disconnectedAPs.length > 1 ? 's' : ''}`);
          }

          // Show combined WiFi status as a single toast
          if (wifiMessages.length > 0) {
            toast({
              title: `📶 ${t.wirelessStatus}`,
              description: wifiMessages.join('\n'),
              duration: 4000,
            });
          }

          // Individual conflict toasts (staggered to respect TOAST_LIMIT=1)
          let conflictToastDelay = 0;
          const showConflictToast = (title: string, description: string) => {
            if (conflictToastDelay === 0) {
              toast({ title, description, duration: 4500, variant: 'destructive' });
            } else {
              setTimeout(() => toast({ title, description, duration: 4500, variant: 'destructive' }), conflictToastDelay);
            }
            conflictToastDelay += 5000;
          };

          if (duplicateIpCount > 0) {
            const dupIpDesc = Array.from(ipOwners.entries())
              .filter(([, owners]) => owners.length > 1)
              .map(([ip, owners]) => `${ip}: ${owners.join(', ')}`)
              .join('\n');
            showConflictToast(t.ipConflict, dupIpDesc);
          }
          if (duplicateMacCount > 0) {
            const dupMacDesc = Array.from(macOwners.entries())
              .filter(([, owners]) => owners.length > 1)
              .map(([mac, owners]) => `${mac}: ${owners.join(', ')}`)
              .join('\n');
            showConflictToast(
              language === 'tr' ? `MAC Çakışması (${duplicateMacCount})` : `MAC Conflict (${duplicateMacCount})`,
              dupMacDesc
            );
          }

          if (duplicateIpv6Count > 0) {
            const dupIpv6Desc = Array.from(ipv6Owners.entries())
              .filter(([, owners]) => owners.length > 1)
              .map(([ipv6, owners]) => `${ipv6}: ${owners.join(', ')}`)
              .join('\n');
            showConflictToast(
              language === 'tr' ? `IPv6 Çakışması (${duplicateIpv6Count})` : `IPv6 Conflict (${duplicateIpv6Count})`,
              dupIpv6Desc
            );
          }

          if (validationMessages.length > 0) {
            toast({
              title: language === 'tr' ? 'Topoloji Doğrulama Uyarıları' : 'Topology Validation Warnings',
              description: validationMessages.join('\n'),
              duration: 5000,
            });
          }

          const dhcpMessages = [
            language === 'tr'
              ? `DHCP: ${dhcpServerActiveCount} sunucu aktif`
              : `DHCP: ${dhcpServerActiveCount} ${dhcpServerActiveCount <= 1 ? 'active server' : 'active servers'}`,
            language === 'tr'
              ? `${dhcpClientWithLeaseCount} istemci kiraladı`
              : `${dhcpClientWithLeaseCount} ${dhcpClientWithLeaseCount <= 1 ? 'client leased' : 'clients leased'}`,
          ];
          if (dhcpServerNoPoolCount > 0) {
            dhcpMessages.push(language === 'tr'
              ? `⚠ ${dhcpServerNoPoolCount} ${t.dhcpNoPool}`
              : `⚠ ${dhcpServerNoPoolCount} ${t.dhcpNoPool}`);
          }
          if (dhcpClientNoLeaseCount > 0) {
            dhcpMessages.push(language === 'tr'
              ? `⚠ ${dhcpClientNoLeaseCount} ${t.dhcpNoLease}`
              : `⚠ ${dhcpClientNoLeaseCount} ${t.dhcpNoLease}`);
          }

          setRefreshNetworkReport({
            show: true,
            title: t.networkStatusUpdated,
            dhcpMessages,
            stpMessage,
            portSecurityMessage,
            topologyMessage,
            devices: refreshDeviceSummaries,
            summary
          });
        } else {
          const isDhcpMissing = dhcpServerActiveCount === 0 && dhcpClientWithLeaseCount === 0;
          const dhcpSummary = isDhcpMissing
            ? ''
            : (language === 'tr'
              ? `DHCP: ${dhcpServerActiveCount} sunucu aktif, ${dhcpClientWithLeaseCount} kiralama`
              : `DHCP: ${dhcpServerActiveCount} ${dhcpServerActiveCount <= 1 ? 'active server' : 'active servers'}, ${dhcpClientWithLeaseCount} ${dhcpClientWithLeaseCount <= 1 ? 'lease' : 'leases'}`);

          setRefreshNetworkReport({
            show: true,
            title: t.networkRefreshed,
            dhcpMessages: [
              stpMessage
                ? `${dhcpSummary} • ${stpMessage}`.replace(/^ • /, '')
                : (isDhcpMissing
                  ? ''
                  : `${t.noWifiDevices} • ${dhcpSummary}`)
            ].filter(msg => msg.trim()),
            stpMessage: '',
            portSecurityMessage: '',
            topologyMessage,
            devices: refreshDeviceSummaries,
            summary
          });
        }
      };

      if (dhcpAssignments.length > 0) {
        setTimeout(showRefreshPanel, 1000); // 1 second delay if DHCP happened
      } else {
        showRefreshPanel();
      }
    }
  }, [iotAutomationPass, assignDhcpLeaseForPc, buildLinkLocalLease, topologyDevices, topologyConnections, deviceStates, setDeviceStates, setTopologyConnections, language, t, pcOutputs]);


  // Auto-renew DHCP for devices with link-local IPs and sequential DHCP toasts
  useAutoDhcpRenewal({
    topologyDevices,
    deviceStates,
    assignDhcpLeaseForPc,
    buildLinkLocalLease,
    setTopologyDevices,
    pcOutputs,
    setPcOutputs,
    loadedExampleId,
    toast,
    language,
    t,
    handleRefreshNetwork,
    setLoadedExampleId
  });

  const {
    onboardingSteps,
    closeOnboardingForever,
    nextOnboarding,
    prevOnboarding
  } = useOnboarding({
    t,
    setShowOnboarding,
    setOnboardingStep,
    onboardingStep
  });

  // Sync active tab when device type changes
  useEffect(() => {
    const currentTabDef = ALL_TABS.find(t => t.id === activeTab);
    if (currentTabDef && !currentTabDef.showFor.includes(activeDeviceType)) {
      // Keep current tab when possible; otherwise fallback to topology
      setActiveTabWithHistory('topology');
    }
  }, [activeDeviceType, activeTab]);




  // Handle command using active device
  const handleCommand = useCallback(async (command: string) => {
    const result = await handleCommandForDevice(
      activeDeviceId,
      command,
      topologyDevices,
      setActiveDeviceId,
      setActiveDeviceType,
      topologyConnections
    ) as CommandResult;

    const currentOutput = (result && typeof result === 'object' && 'output' in result) ? String(result.output) : '';

    setLastCommand(command);
    setLastOutput(currentOutput);

    if (command && command.trim() !== '') {
      const deviceName = topologyDevices?.find(d => d.id === activeDeviceId)?.name || activeDeviceId;
      commitAction(`${deviceName} CLI: ${command}`);
    }

    // Immediate check for guided mode progress
    if (isGuidedModeActive) {
      const currentDeviceState = result && result.newState ? { ...state, ...result.newState } : state;
      let finalDeviceStates = result.deviceStates || result.updatedDeviceStates || deviceStates;

      // If we have a local state change but not a full deviceStates map from the result,
      // merge the local change into a fresh map for validation.
      if (result?.newState && !result.deviceStates && !result.updatedDeviceStates) {
        finalDeviceStates = new Map(deviceStates);
        finalDeviceStates.set(activeDeviceId, { ...state, ...result.newState } as SwitchState);
      }

      checkStepCompletionWithContext({
        lastCommand: command,
        lastOutput: currentOutput,
        deviceAccessed: showUnifiedDeviceModal ? (activeDeviceType === 'switchL2' || activeDeviceType === 'switchL3' ? 'switch' : activeDeviceType === 'router' ? 'router' : 'pc') : null,
        deviceAccessedId: showUnifiedDeviceModal ? activeDeviceId : null,
        deviceState: currentDeviceState,
        deviceStates: finalDeviceStates,
        topologyConnections: topologyConnections,
        topologyDevices: topologyDevices
      });
    }

    if (result?.exitSession) {
      setActiveTab('topology');
    }
    return result;
  }, [activeDeviceId, handleCommandForDevice, topologyDevices, topologyConnections, setActiveDeviceId, setActiveDeviceType, setActiveTab, setLastCommand, setLastOutput, commitAction, isGuidedModeActive, checkStepCompletionWithContext, showUnifiedDeviceModal, activeDeviceType, state, deviceStates]);

  const prompt = getPrompt(state);

  const handleExecuteCommand = useCallback(async (deviceId: string, command: string) => {
    const result = await handleCommandForDevice(
      deviceId,
      command,
      topologyDevices,
      setActiveDeviceId,
      setActiveDeviceType,
      topologyConnections
    ) as CommandResult;

    const currentOutput = (result && typeof result === 'object' && 'output' in result) ? String(result.output) : '';

    setLastCommand(command);
    setLastOutput(currentOutput);

    if (command && command.trim() !== '') {
      const deviceName = topologyDevices?.find(d => d.id === deviceId)?.name || deviceId;
      commitAction(`${deviceName} CLI: ${command}`);
    }

    // Immediate check for guided mode progress
    if (isGuidedModeActive) {
      const deviceObj = topologyDevices?.find(d => d.id === deviceId);
      const devType = deviceObj?.type;
      const currentState = deviceStates.get(deviceId);
      const currentDeviceState = result && result.newState ? { ...currentState, ...result.newState } : currentState;

      if (!currentDeviceState) return result;

      let finalDeviceStates = result.deviceStates || result.updatedDeviceStates || deviceStates;
      if (result?.newState && !result.deviceStates && !result.updatedDeviceStates) {
        finalDeviceStates = new Map(deviceStates);
        finalDeviceStates.set(deviceId, { ...currentState, ...result.newState } as SwitchState);
      }

      checkStepCompletionWithContext({
        lastCommand: command,
        lastOutput: currentOutput,
        deviceAccessed: devType === 'pc' ? 'pc' : (devType === 'router' ? 'router' : (devType === 'switchL2' || devType === 'switchL3' ? 'switch' : null)),
        deviceAccessedId: deviceId,
        deviceState: currentDeviceState,
        deviceStates: finalDeviceStates,
        topologyConnections: topologyConnections,
        topologyDevices: topologyDevices
      });
    }

    return result;
  }, [handleCommandForDevice, topologyDevices, topologyConnections, setActiveDeviceId, setActiveDeviceType, setLastCommand, setLastOutput, commitAction, isGuidedModeActive, checkStepCompletionWithContext, deviceStates]);

  useEffect(() => {
    const handlePcCommandExecuted = (e: Event) => {
      const customEvent = e as CustomEvent<{ deviceId: string; command: string; output?: string }>;
      const { deviceId, command, output } = customEvent.detail;

      setLastCommand(command);
      setLastOutput(output || '');

      if (command && command.trim() !== '') {
        const deviceName = topologyDevices?.find(d => d.id === deviceId)?.name || deviceId;
        commitAction(`${deviceName} CMD: ${command}`);
      }

      if (isGuidedModeActive) {
        checkStepCompletionWithContext({
          lastCommand: command,
          lastOutput: output || '',
          deviceAccessed: 'pc',
          deviceAccessedId: deviceId,
          deviceState: state,
          deviceStates: deviceStates,
          topologyConnections: topologyConnections,
          topologyDevices: topologyDevices
        });
      }
    };

    window.addEventListener('pc-command-executed', handlePcCommandExecuted);
    return () => window.removeEventListener('pc-command-executed', handlePcCommandExecuted);
  }, [topologyDevices, setLastCommand, setLastOutput, commitAction, isGuidedModeActive, checkStepCompletionWithContext, state, deviceStates, topologyConnections]);

  useEffect(() => {
    const handleShowMe = (e: Event) => {
      const { targetDeviceId, hintCommand, commandPattern, checkType, toIp } = (e as CustomEvent).detail;
      let deviceId = targetDeviceId;

      let cleanCommand = '';
      if (checkType === 'ping' && toIp) {
        cleanCommand = `ping ${toIp}`;
      } else if (commandPattern) {
        cleanCommand = String(commandPattern).split('|')[0];
      } else {
        cleanCommand = hintCommand || '';
      }

      // Clean command prefixes from prompts or instructional hints.
      if (cleanCommand.includes('>')) {
        cleanCommand = cleanCommand.split('>').pop() || '';
      } else if (cleanCommand.includes('#')) {
        cleanCommand = cleanCommand.split('#').pop() || '';
      }
      cleanCommand = cleanCommand
        .replace(/^[^:]{1,40}:\s*/i, '')
        .replace(/^type\s+/i, '')
        .replace(/\s+(yazın|yazin)\.?$/i, '')
        .replace(/\s+(and press enter|press enter)\.?$/i, '');
      cleanCommand = cleanCommand.trim();

      if (!deviceId) {
        if (cleanCommand.includes('ipconfig') || cleanCommand.includes('ping') || cleanCommand.includes('ftp') || cleanCommand.includes('tracert')) {
          deviceId = topologyDevices.find(d => d.type === 'pc')?.id;
        } else {
          deviceId = topologyDevices.find(d => d.type === 'switchL2' || d.type === 'switchL3' || d.type === 'router')?.id;
        }
      }

      if (deviceId) {
        const device = topologyDevices.find(d => d.id === deviceId);
        if (device) {
          if (device.type === 'pc') {
            setShowPCDeviceId(deviceId);
            setPcPanelInitialTab('desktop');
            setShowPCPanel(true);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('pc-auto-type', { detail: { deviceId, command: cleanCommand } }));
            }, 600);
          } else {
            setActiveDeviceId(deviceId);
            setActiveDeviceType(device.type);
            setUnifiedDeviceActiveTab('console');
            setShowUnifiedDeviceModal(true);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('terminal-auto-type', { detail: { deviceId, command: cleanCommand } }));
            }, 600);
          }
        }
      }
    };
    window.addEventListener('request-show-me', handleShowMe);
    return () => window.removeEventListener('request-show-me', handleShowMe);
  }, [topologyDevices, setActiveDeviceId, setActiveDeviceType, setShowUnifiedDeviceModal, setActiveTab]);

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

  // Handle device double click (Open terminal or PC panel)
  const handleDeviceDoubleClick = useCallback((device: DeviceType, deviceId: string) => {
    if (device === 'pc') {
      // PC - open Home modal
      setShowUnifiedDeviceModal(false);
      setShowRouterPanel(false);
      setShowFirewallPanel(false);
      setShowPCDeviceId(deviceId);
      getOrCreatePCOutputs(deviceId, topologyDevices);
      setPcPanelInitialTab('home');
      setShowPCPanel(true);
    } else if (device === 'firewall') {
      setShowPCPanel(false);
      setShowUnifiedDeviceModal(false);
      setShowRouterPanel(false);
      setActiveFirewallId(deviceId);
      setShowFirewallPanel(true);
    } else if (device === 'router' || device === 'switchL2' || device === 'switchL3' || device === 'wlc') {
      // Switch, Router, or WLC - set as CLI device and open CLI modal
      setShowPCPanel(false);
      setShowFirewallPanel(false);
      setShowRouterPanel(false);
      const deviceObj = topologyDevices?.find(d => d.id === deviceId);
      const deviceState = getOrCreateDeviceState(deviceId, device, deviceObj?.name, deviceObj?.macAddress, deviceObj?.switchModel);
      getOrCreateDeviceOutputs(deviceId, deviceState);

      setActiveDeviceId(deviceId);
      setActiveDeviceType(device);
      setUnifiedDeviceActiveTab('console');
      setShowUnifiedDeviceModal(true);
    }
  }, [getOrCreateDeviceState, getOrCreateDeviceOutputs, topologyDevices, setDeviceTabWithHistory, setShowPCDeviceId, setActiveDeviceId, setActiveDeviceType]);


  // Handle device deletion - update active device if needed
  const handleDeviceDelete = useCallback((deviceId: string) => {
    // Close PC panel if showing the deleted device
    if (showPCDeviceId === deviceId) {
      setShowPCPanel(false);
      setShowPCDeviceId('pc-1');
    }

    // Close Router panel if showing the deleted device
    if (showRouterDeviceId === deviceId) {
      setShowRouterPanel(false);
      setShowRouterDeviceId('router-1');
    }

    // Close PC info panel if deleted device was the active device
    if (activeDeviceId === deviceId) {
      setSelectedDevice(null);
      setActiveDeviceId('');
    }

    // Reset selected device if deleted
    if (selectedDevice) {
      setSelectedDevice(null);
    }

    // 1. Identify connections and ports to disconnect FIRST (capture current state)
    setTopologyConnections(prevConnections => {
      const connectionsToRemove = prevConnections.filter(conn =>
        conn.sourceDeviceId === deviceId || conn.targetDeviceId === deviceId
      );

      const portsToDisconnect = connectionsToRemove.map(conn => {
        if (conn.sourceDeviceId === deviceId) {
          return { deviceId: conn.targetDeviceId, portId: conn.targetPort };
        } else {
          return { deviceId: conn.sourceDeviceId, portId: conn.sourcePort };
        }
      });

      const remainingConnections = prevConnections.filter(conn =>
        conn.sourceDeviceId !== deviceId && conn.targetDeviceId !== deviceId
      );

      // 2. Release ports on OTHER devices in simulation state (deviceStates)
      setDeviceStates(prev => {
        const newMap = new Map(prev);
        portsToDisconnect.forEach(p => {
          const targetState = newMap.get(p.deviceId);
          if (targetState && targetState.ports) {
            const updatedPorts = { ...targetState.ports };
            const portToReset = updatedPorts[p.portId];
            if (portToReset) {
              updatedPorts[p.portId] = {
                ...portToReset,
                status: 'notconnect'
              };
              newMap.set(p.deviceId, {
                ...targetState,
                ports: updatedPorts
              });
            }
          }
        });
        newMap.delete(deviceId);
        return newMap;
      });

      // 3. Clear other state maps
      setDeviceOutputs(prev => {
        const newMap = new Map(prev);
        newMap.delete(deviceId);
        return newMap;
      });

      setPcOutputs(prev => {
        const newMap = new Map(prev);
        newMap.delete(deviceId);
        return newMap;
      });

      // 4. Update topology: Update ports on remaining devices based on remaining connections
      setTopologyDevices(prev => {
        const nextDevices = prev.filter(d => d.id !== deviceId).map(device => {
          const updatedPorts = device.ports.map(port => {
            const isActuallyConnected = remainingConnections.some(conn =>
              (conn.sourceDeviceId === device.id && conn.sourcePort === port.id) ||
              (conn.targetDeviceId === device.id && conn.targetPort === port.id)
            );
            return {
              ...port,
              status: isActuallyConnected ? 'connected' as const : 'disconnected' as const
            };
          });
          return { ...device, ports: updatedPorts };
        });

        // Trigger STP recalculation when device is deleted
        window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
          detail: { topologyDevices: nextDevices, topologyConnections: remainingConnections }
        }));

        return nextDevices;
      });

      return remainingConnections;
    });

    // If the deleted device was the active one, switch to another device
    if (activeDeviceId === deviceId) {
      setTopologyDevices(prev => {
        const currentDevices = prev.filter(d => d.id !== deviceId);
        if (currentDevices.length > 0) {
          const nextDevice = currentDevices[0];
          setActiveDeviceId(nextDevice.id);
          setActiveDeviceType(nextDevice.type as DeviceType);
          setActiveTab('topology');
        } else {
          setActiveDeviceId('');
          setActiveDeviceType('switchL2');
          setActiveTab('topology');
        }
        return prev;
      });
    }
    setHasUnsavedChanges(true);
  }, [activeDeviceId, showPCDeviceId, selectedDevice, setDeviceStates, setDeviceOutputs, setPcOutputs, setShowPCPanel, setShowPCDeviceId, setSelectedDevice, setActiveDeviceId, setActiveDeviceType, setActiveTab, setHasUnsavedChanges, setTopologyConnections, setTopologyDevices]);

  // Handle device rename - propagate topology label change to deviceStates hostname
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
    deviceStates,
    deviceOutputs,
    pcOutputs,
    pcHistories,
    topologyDevices,
    topologyConnections,
    topologyNotes,
    cableInfo,
    activeDeviceId,
    activeDeviceType,
    historyItems,
    historyIndex,
    activeExam,
    language,
    projectName,
    setProjectName,
    setHasUnsavedChanges,
    setLastSaveTime,
    toast,
    addProjectRecord,
    t
  });

  // Save project to JSON file


  // New project - reset everything
  const { resetToEmptyProject } = useProjectReset({
    setDeviceStates,
    setDeviceOutputs,
    setPcOutputs,
    setPcHistories,
    setTopologyDevices,
    setTopologyConnections,
    setTopologyNotes,
    setActiveDeviceId,
    setActiveDeviceType,
    setSelectedDevice,
    setShowPCPanel,
    setShowRouterPanel,
    setActiveTab,
    setHasUnsavedChanges,
    setTopologyKey,
    setZoom,
    setPan,
    closeGuidedMode,
    closeExam,
    setProjectName,
    setRefreshNetworkReport,
    resetHistory
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

  function handleNewProject() {
    setProjectSearchQuery(''); // Reset search when opening new project dialog
    closeExam();
    resetWorkspaceUiState();
    runWithSaveGuard(() => setShowProjectPicker(true));
  }

  // Sync hostname changes between Topology and Simulator
  useEffect(() => {
    if (!topologyDevices) return;

    let topologyChanged = false;
    const simulatorChanged = false;
    const newDeviceStates = new Map(deviceStates);

    const updatedTopologyDevices = topologyDevices.map(device => {
      if (device.type === 'pc') return device;

      const deviceState = deviceStates.get(device.id);
      if (!deviceState) return device;

      // If simulator has a different hostname than topology, simulator wins (manual change via CLI/Panel)
      if (deviceState.hostname !== device.name) {
        // Special case: if simulator has default generic name and topology has specific name (initial load/create)
        const isDefaultCLIHostname = deviceState.hostname === 'Switch' || deviceState.hostname === 'Router';

        if (isDefaultCLIHostname && !device.name.includes('Router') && !device.name.includes('Switch')) {
          // This shouldn't really happen with current logic but keeping for safety
          // Usually topology has names like Switch-1, Router-1 which are also defaults
        }

        // If the simulator name changed, update topology
        topologyChanged = true;
        return { ...device, name: deviceState.hostname };
      }
      return device;
    });

    if (simulatorChanged) {
      setDeviceStates(newDeviceStates);
    }

    if (topologyChanged) {
      setTopologyDevices(updatedTopologyDevices);
      setTimeout(() => setHasUnsavedChanges(true), 0);
    }
  }, [deviceStates, topologyDevices, setDeviceStates, setTopologyDevices, setHasUnsavedChanges]);

  // Sync services (HTTP, etc.) from deviceStates to topologyDevices
  useEffect(() => {
    if (!topologyDevices) return;

    let topologyChanged = false;

    const updatedTopologyDevices = topologyDevices.map(device => {
      const deviceState = deviceStates.get(device.id);
      if (!deviceState) return device;

      // Check if services state differs
      const currentServices = device.services || {};
      const stateServices = deviceState.services || {};

      // Check HTTP service
      const httpEnabledFromState = stateServices.http?.enabled;
      const httpEnabled = typeof httpEnabledFromState === 'boolean' ? httpEnabledFromState : currentServices.http?.enabled;
      const currentHttpEnabled = currentServices.http?.enabled || false;

      // Only sync when the simulator actually has an opinion; avoid forcing false when state is undefined
      if (typeof httpEnabled === 'boolean' && httpEnabled !== currentHttpEnabled) {
        topologyChanged = true;
        return {
          ...device,
          services: {
            ...currentServices,
            http: {
              ...currentServices.http,
              enabled: httpEnabled,
              content: currentServices.http?.content || ''
            }
          }
        };
      }

      return device;
    });

    if (topologyChanged) {
      setTopologyDevices(updatedTopologyDevices);
      setTimeout(() => setHasUnsavedChanges(true), 0);
    }
  }, [deviceStates, topologyDevices, setTopologyDevices, setHasUnsavedChanges]);

  // Beforeunload event for unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setShowMobileMenu(false);
      setConfirmDialog(null);
      setSaveDialog(null);
      if (!showPCPanel) {
        setShowPCPanel(false);
      }
      setShowRouterPanel(false);
      setShowUnifiedDeviceModal(false);
      setShowAboutModal(false);
      setShowProjectPicker(false);
      setShowOnboarding(false);
      setShowBasarilarim(false);
      window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'back' } }));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showPCPanel, setShowMobileMenu, setConfirmDialog, setSaveDialog, setShowPCPanel, setShowRouterPanel, setShowUnifiedDeviceModal, setShowAboutModal, setShowProjectPicker, setShowOnboarding, setShowBasarilarim]);

  // History pushState for back button tracking
  useEffect(() => {
    const anyModalOpen = showMobileMenu || !!confirmDialog || !!saveDialog || showPCPanel || showFirewallPanel || showRouterPanel || showUnifiedDeviceModal || showAboutModal || showProjectPicker || showOnboarding;
    if (anyModalOpen && !modalHistoryPushedRef.current) {
      window.history.pushState({ modal: true }, '');
      modalHistoryPushedRef.current = true;
    }
    if (!anyModalOpen) {
      modalHistoryPushedRef.current = false;
    }
  }, [showMobileMenu, confirmDialog, saveDialog, showPCPanel, showRouterPanel, showUnifiedDeviceModal, showAboutModal, showProjectPicker, showOnboarding]);




  // Derive visible tabs based on current state
  const tabs = [{ ...ALL_TABS[0], label: t.networkTopology }];

  // Automatically trigger DHCP refresh when wireless clients connect
  useEffect(() => {
    const dhcpClients = topologyDevices.filter(d => (d.type === 'pc' || d.type === 'iot') && d.ipConfigMode === 'dhcp');
    if (dhcpClients.length === 0) return;

    // Check if any client has no valid IP but is connected to WiFi or has a cable
    const needsDhcp = dhcpClients.some(pc => {
      const hasValidIp = (ip: string | undefined) => !!ip && ip !== '0.0.0.0' && !ip.startsWith('169.254.');
      if (hasValidIp(pc.ip)) return false;

      // Check if connected via WiFi
      if (pc.wifi?.enabled && pc.wifi?.ssid && pc.wifi?.bssid) return true;

      // Check if connected via cable
      const isConnectedViaCable = topologyConnections.some(c =>
        c.active !== false && (c.sourceDeviceId === pc.id || c.targetDeviceId === pc.id)
      );
      return isConnectedViaCable;
    });

    if (needsDhcp) {
      const timer = setTimeout(() => {
        handleRefreshNetwork();
      }, 2000); // Debounce refresh by 2 seconds
      return () => clearTimeout(timer);
    }
    return;
  }, [topologyDevices, topologyConnections, handleRefreshNetwork]);

  // Handle key events: ESC to close, ENTER to confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 - Open About Modal (Help)
      if (e.key === 'F1' || e.code === 'F1') {
        e.preventDefault();
        setShowAboutModal(prev => !prev);
        return;
      }

      // F5 - Refresh network connections and WiFi status
      if (e.key === 'F5') {
        e.preventDefault();
        setTopologyKey(prev => prev + 1);
        handleRefreshNetwork();
        return;
      }

      if (e.key === 'Escape') {
        if (!showPCPanel) {
          closeEscLikeWindows();
        }
      }

      // Ctrl Shortcuts
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();

        // Check if an input element is focused
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        const isEditable = tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

        // Print - switch to topology tab first
        if (key === 'p') {
          e.preventDefault();
          if (activeTabRef.current !== 'topology') {
            setActiveTab('topology');
            setTimeout(() => window.print(), 150);
          } else {
            window.print();
          }
        }

        // Only handle undo/redo in topology tab if no input is focused
        if (key === 'z') {
          if (activeTabRef.current === 'topology' && !isEditable) {
            e.preventDefault();
            handleUndo();
          }
        }
        if (key === 'y') {
          if (activeTabRef.current === 'topology' && !isEditable) {
            e.preventDefault();
            handleRedo();
          }
        }
        if (key === 's') {
          e.preventDefault();
          handleSaveProject();
        }
        if (key === 'o') {
          e.preventDefault();
          fileInputRef.current?.click();
        }
        if (key === 'n' && !e.shiftKey) {
          e.preventDefault();
          handleNewProject();
        }
      }

      // Shift Shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'n') {
          e.preventDefault();
          handleNewProject();
        }
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        const isEditable = tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;
        const isWindowFocused = document.hasFocus();
        const isTopologyOnly = activeTabRef.current === 'topology'
          && !showPCPanel
          && !showRouterPanel
          && !showFirewallPanel
          && !showUnifiedDeviceModal
          && !showProjectPicker
          && !showAboutModal
          && !showOnboarding
          && !showMobileMenu;

        if (!isEditable && isTopologyOnly) {
          const isQuoteToggle = e.key === '"' || e.code === 'Quote';
          if (isQuoteToggle) {
            e.preventDefault();
            if (isWindowFocused && isTimelineMinimized) {
              setIsTimelineMinimized(false);
            } else {
              setIsTimelineMinimized(prev => !prev);
            }
            return;
          }
        }
      }

      if (e.key === 'Tab') {
        if (showProjectPicker) {
          return;
        }
        // Tab key navigation - only cycle devices in topology if no panel is open
        // If a panel is open (PC panel, Router panel, etc.), let the panel handle Tab navigation
        if (activeTab === 'topology' && topologyDevices.length > 0 && !showPCPanel && !showRouterPanel && !showUnifiedDeviceModal) {
          e.preventDefault();

          // Cancel current selection if multiple devices are selected or all devices are selected
          if (selectedDevice) {
            setSelectedDevice(null);
            setClearSelectionTrigger(prev => prev + 1);
          }

          const currentIndex = topologyDevices.findIndex(d => d.id === activeDeviceId);
          const direction = e.shiftKey ? -1 : 1;
          const nextIndex = currentIndex === -1
            ? (direction > 0 ? 0 : topologyDevices.length - 1)
            : (currentIndex + direction + topologyDevices.length) % topologyDevices.length;
          const nextDevice = topologyDevices[nextIndex];
          if (nextDevice) {
            setActiveDeviceId(nextDevice.id);
            setActiveDeviceType(nextDevice.type);
          }
        }
      }

      if (e.key === 'Enter') {
        // Skip if already handled by canvas (e.g., multi-select → last device)
        if (e.defaultPrevented) return;
        // Don't handle Enter when any modal/panel is open
        if (showUnifiedDeviceModal || showAboutModal || showPCPanel || showFirewallPanel || showRouterPanel || showProjectPicker || showOnboarding || !!confirmDialog?.show || !!saveDialog?.show) {
          return;
        }
        if (confirmDialog?.show) {
          e.preventDefault();
          confirmDialog.onConfirm();
        } else if (saveDialog?.show) {
          e.preventDefault();
          saveDialog.onConfirm(true);
        } else if (activeTab === 'topology' && activeDeviceId && !activeDeviceId.startsWith('note-')) {
          // Open selected device with Enter key
          e.preventDefault();
          const device = topologyDevices.find(d => d.id === activeDeviceId);
          if (device) {
            // For routers and switches, open CLI terminal modal
            if (device.type === 'router' || device.type === 'switchL2' || device.type === 'switchL3') {
              const deviceState = getOrCreateDeviceState(device.id, device.type, device.name, device.macAddress, device.switchModel);
              getOrCreateDeviceOutputs(device.id, deviceState);
              setActiveDeviceId(device.id);
              setActiveDeviceType(device.type);
              setUnifiedDeviceActiveTab('console');
              setShowUnifiedDeviceModal(true);
            } else {
              handleDeviceDoubleClick(device.type, device.id);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Handle VTP propagation event
    const handleVtpPropagation = (e: Event) => {
      const customEvent = e as CustomEvent<{
        deviceId: string;
        topologyDevices: CanvasDevice[];
        topologyConnections: CanvasConnection[];
        deviceStates: Map<string, SwitchState>;
      }>;
      const { topologyDevices: eventDevices, topologyConnections: eventConnections, deviceStates: eventStates } = customEvent.detail;

      if (!eventDevices || !eventConnections || !eventStates) return;

      // Run VTP propagation logic
      const byId = new Map(eventDevices.map((d: CanvasDevice) => [d.id, d]));
      const nextStates = new Map(eventStates);

      for (const conn of eventConnections) {
        if (!conn.active) continue;
        const a = byId.get(conn.sourceDeviceId);
        const b = byId.get(conn.targetDeviceId);
        if (!a || !b) continue;
        if (!isSwitchDeviceType(a.type) || !isSwitchDeviceType(b.type)) continue;

        const aState = nextStates.get(a.id);
        const bState = nextStates.get(b.id);
        if (!aState || !bState) continue;

        const aPort = aState.ports?.[conn.sourcePort];
        const bPort = bState.ports?.[conn.targetPort];
        const aIsTrunk = !!aPort && !aPort.shutdown && aPort.mode === 'trunk';
        const bIsTrunk = !!bPort && !bPort.shutdown && bPort.mode === 'trunk';
        if (!aIsTrunk || !bIsTrunk) continue;

        const aMode = aState.vtpMode || 'server';
        const bMode = bState.vtpMode || 'server';
        const aDomain = (aState.vtpDomain || '').trim();
        const bDomain = (bState.vtpDomain || '').trim();
        if (!aDomain || !bDomain) continue;
        if (aDomain !== bDomain) continue;

        const aRev = aState.vtpRevision || 0;
        const bRev = bState.vtpRevision || 0;

        // VTP: server pushes VLAN database to client if revision is newer or equal
        if (aMode === 'server' && bMode === 'client' && aRev >= bRev) {
          nextStates.set(b.id, { ...bState, vlans: { ...(aState.vlans || {}) }, vtpRevision: aRev });
        } else if (bMode === 'server' && aMode === 'client' && bRev >= aRev) {
          nextStates.set(a.id, { ...aState, vlans: { ...(bState.vlans || {}) }, vtpRevision: bRev });
        }
      }

      setDeviceStates(nextStates);
    };
    window.addEventListener('vtp-propagation-needed', handleVtpPropagation);

    // Handle STP recalculation when connection is deleted
    const handleSTPRecalculation = (event: Event) => {
      const { topologyConnections: updatedConnections } = (event as CustomEvent).detail;
      if (updatedConnections) {
        // Perform STP calculation for all devices
        const allUpdatedStates = recalculateStp(deviceStates, updatedConnections);
        setDeviceStates(allUpdatedStates);
      }
    };
    window.addEventListener('stp-recalculation-needed', handleSTPRecalculation as EventListener);

    // Handle print dialog (from browser menu or Ctrl+P)
    const handleBeforePrint = () => {
      if (activeTabRef.current !== 'topology') {
        setActiveTab('topology');
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('vtp-propagation-needed', handleVtpPropagation);
      window.removeEventListener('stp-recalculation-needed', handleSTPRecalculation);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [showMobileMenu, confirmDialog, saveDialog, showPCPanel, showRouterPanel, showProjectPicker, handleSaveProject, handleNewProject, handleUndo, handleRedo, tabs, setShowMobileMenu, setConfirmDialog, setSaveDialog, setShowPCPanel, setShowRouterPanel, setShowProjectPicker, setActiveTab, activeTab, topologyDevices, topologyConnections, deviceStates, setDeviceStates, handleDeviceDoubleClick, handleRefreshNetwork, closeEscLikeWindows]);

  // Load project from JSON file
  const handleLoadProject = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Prevent previously active exam session from re-appearing while opening another file/workflow
    closeExam();
    // Reset input
    event.target.value = '';

    const doLoad = () => {
      document.body.style.cursor = 'wait';
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let projectData: unknown;

          // Try decrypting as exam file first if extension matches
          if (file.name.endsWith('.exam')) {
            projectData = decryptExamData(content);
            if (projectData) {
              const exam = projectData as ExamProject;
              setIsExamLoadedFromFile(true);
              closeGuidedMode();
              startExamProject(exam);
              loadProjectData(exam.data);
              setHasUnsavedChanges(false);
              setProjectName((exam.title as unknown as { en: string }).en);
              document.body.style.cursor = '';
              toast({
                title: language === 'tr' ? 'Sınav Modu Başlatıldı' : 'Exam Mode Started',
                description: (exam.title as unknown as { tr: string; en: string })[language === 'tr' ? 'tr' : 'en'],
              });
              return;
            }
          }

          projectData = safeParse<unknown>(content);
          if (loadProjectData(projectData)) {
            setHasUnsavedChanges(false);
            const loadedName = file.name.replace(/\.[^/.]+$/, '');
            setProjectName(loadedName);
            closeGuidedMode();
            closeExam();
            setRefreshNetworkReport(null);
            addProjectRecord(loadedName);
            document.body.style.cursor = '';
            toast({
              title: `"${loadedName}" ${language === 'tr' ? 'projesi yüklendi' : 'project loaded'}`,
              description: t.fileImportedSuccessfully,
            });
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
            if (typeof window !== 'undefined') {
              window.scrollTo(0, 0);
            }
          } else {
            document.body.style.cursor = '';
            toast({
              title: t.invalidProjectFile,
              description: t.invalidProjectFile,
              variant: "destructive",
            });
          }
        } catch (error) {
          document.body.style.cursor = '';
          errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'fileUpload', error: String(error) }));
          toast({
            title: t.loadFailed,
            description: formatErrorForUser(error as Error, t.failedLoadProject).userMessage,
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    };

    if (hasUnsavedChanges) {
      setSaveDialog({
        show: true,
        message: t.unsavedChangesConfirm,
        onConfirm: (save: boolean) => {
          setSaveDialog(null);
          if (save) handleSaveProject();
          doLoad();
        }
      });
      return;
    }
    doLoad();
  }, [loadProjectData, setHasUnsavedChanges, t.invalidProjectFile, t.failedLoadProject, language, setZoom, setPan, closeGuidedMode, closeExam, setProjectName, hasUnsavedChanges, handleSaveProject, setSaveDialog, t.unsavedChangesConfirm, startExamProject]);

  const applyExampleProjectAsTemplate = useCallback((projectData: unknown, exampleId?: string) => {
    const data = (projectData && typeof projectData === 'object') ? projectData as Record<string, unknown> : {};
    const topology = (data.topology && typeof data.topology === 'object') ? data.topology as Record<string, unknown> : {};
    const safeTopologyDevices = Array.isArray(topology.devices) ? topology.devices as CanvasDevice[] : [];
    const safeTopologyConnections = Array.isArray(topology.connections) ? topology.connections : [];
    const safeTopologyNotes = Array.isArray(topology.notes) ? topology.notes as CanvasNote[] : [];

    // Create fresh initial states for each managed device
    const freshDeviceStates: { id: string; state: SwitchState }[] = [];
    safeTopologyDevices.forEach(device => {
      if (device.type === 'switchL2' || device.type === 'switchL3') {
        freshDeviceStates.push({
          id: device.id,
          state: createInitialState(device.macAddress, device.switchModel === 'WS-C3650-24PS' ? 'WS-C3650-24PS' : 'WS-C2960-24TT-L')
        });
      } else if (device.type === 'router') {
        freshDeviceStates.push({
          id: device.id,
          state: createInitialRouterState(device.macAddress)
        });
      } else if (device.type === 'firewall') {
        freshDeviceStates.push({
          id: device.id,
          state: createInitialFirewallState(device.macAddress)
        });
      } else if (device.type === 'wlc') {
        freshDeviceStates.push({
          id: device.id,
          state: createInitialWLCState(device.macAddress)
        });
      }
    });

    // Modify notes to indicate template mode
    const templatePrefix = language === 'tr'
      ? '⚠️ Şablon (Cihazlar yapılandırılmamıştır)\n▸ Aşağıdaki adımları kendiniz uygulayın\n\n'
      : '⚠️ Template (Devices are not configured)\n▸ Apply the steps below yourself\n\n';
    const templateNotes: CanvasNote[] = safeTopologyNotes.length > 0
      ? safeTopologyNotes.map((note: CanvasNote) => ({
        ...note,
        text: note.text.includes('⚠️ Şablon') || note.text.includes('⚠️ Template')
          ? note.text
          : templatePrefix + note.text
      }))
      : [{
        id: 'template-note',
        text: templatePrefix + (language === 'tr'
          ? 'Cihazları yapılandırmak için terminali kullanın.'
          : 'Use the terminal to configure devices.'),
        x: 100, y: 100, width: 350, height: 120,
        color: 'var(--color-warning-400)', font: 'monospace', fontSize: 16, opacity: 0.75
      } as unknown as CanvasNote];

    const templateData: Record<string, unknown> = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      devices: freshDeviceStates,
      deviceOutputs: [],
      pcOutputs: [],
      pcHistories: [],
      topology: {
        devices: safeTopologyDevices,
        connections: safeTopologyConnections,
        notes: templateNotes
      },
      cableInfo: (data.cableInfo && typeof data.cableInfo === 'object') ? data.cableInfo : {
        connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2'
      },
      activeDeviceId: freshDeviceStates[0]?.id || safeTopologyDevices[0]?.id || 'switch-1',
      activeDeviceType: safeTopologyDevices[0]?.type || 'switchL2',
      activeTab: 'topology',
      zoom: 1.0,
      pan: { x: 0, y: 0 }
    };

    loadProjectData(templateData);
    setRefreshNetworkReport(null);
    let loadedTitle = projectName;
    if (exampleId) {
      setLoadedExampleId(exampleId);
      for (const level of exampleLevelOrder) {
        const projects = groupedExampleProjects[level];
        if (projects) {
          const found = projects.find(p => p.id === exampleId);
          if (found) {
            loadedTitle = language === 'tr' ? `${found.title} (Şablon)` : `${found.title} (Template)`;
            setProjectName(loadedTitle);
            break;
          }
        }
      }
    }
    setShowProjectPicker(false);
    closeGuidedMode();
    closeExam();
    addProjectRecord(loadedTitle);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [loadProjectData, setShowProjectPicker, setZoom, setPan, closeGuidedMode, setProjectName, setLoadedExampleId, setRefreshNetworkReport, groupedExampleProjects, exampleLevelOrder, projectName, addProjectRecord, language]);

  const applyExampleProject = useCallback((projectData: unknown, exampleId?: string) => {
    loadProjectData(projectData);
    setRefreshNetworkReport(null);
    let loadedTitle = projectName;
    if (exampleId) {
      setLoadedExampleId(exampleId);
      // Look up example project title
      for (const level of exampleLevelOrder) {
        const projects = groupedExampleProjects[level];
        if (projects) {
          const found = projects.find(p => p.id === exampleId);
          if (found) {
            loadedTitle = found.title;
            setProjectName(found.title);
            break;
          }
        }
      }
    }
    setShowProjectPicker(false);
    // Close guided/exam mode panel if open (unless it's a guided project itself)
    closeGuidedMode();
    closeExam();

    // Record example project as an achievement
    addProjectRecord(loadedTitle);

    // Reset zoom and pan to top-left
    setZoom(1.0);
    setPan({ x: 0, y: 0 });

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [loadProjectData, setShowProjectPicker, setZoom, setPan, closeGuidedMode, setProjectName, setLoadedExampleId, setRefreshNetworkReport, groupedExampleProjects, exampleLevelOrder, projectName, addProjectRecord]);

  const startExamFromCatalog = useCallback((project: ExamProject) => {
    setIsExamLoadedFromFile(false);
    closeGuidedMode();
    startExamProject(project);
  }, [startExamProject, closeGuidedMode]);

  const handleConvertProjectToExam = useCallback((projectData: unknown) => {
    document.body.style.cursor = 'wait';
    closeExam();
    closeGuidedMode();
    resetWorkspaceUiState();
    const exam = generateExamFromProject(projectData as ProjectData, language);
    startExamProject(exam);
    loadProjectData(projectData);
    toggleEditor(true);
    document.body.style.cursor = '';
    toast({
      title: language === 'tr' ? 'Proje Dönüştürüldü' : 'Project Converted',
      description: language === 'tr' ? 'Görevler otomatik olarak çıkarıldı ve Sınav Düzenleyici açıldı.' : 'Tasks were automatically extracted and the Exam Editor was opened.',
    });
  }, [closeExam, closeGuidedMode, language, startExamProject, loadProjectData, toggleEditor, toast, resetWorkspaceUiState]);

  const handleStartGuidedProject = useCallback((project: GuidedProject) => {
    closeExam();
    resetWorkspaceUiState();
    startGuidedProject(project);
  }, [startGuidedProject, closeExam, resetWorkspaceUiState]);

  // Track project name from guided/exam mode
  useEffect(() => {
    if (activeGuidedProject) {
      setTimeout(() => setProjectName(activeGuidedProject.title), 0);

      // Auto-focus target device for the current step to act as a "Wizard pointer"
      if (guidedStepIndex < activeGuidedProject.steps.length) {
        const step = activeGuidedProject.steps[guidedStepIndex];
        const targetId = step.checkParams?.targetDeviceId || step.checkParams?.sourceDevice;
        if (targetId) {
          const device = topologyDevices.find(d => d.id === targetId);
          if (device) {
            setFocusDeviceId(targetId);
            // Pan and zoom to the target device
            focusDeviceInTopology(targetId, 1.0, device);
            // Auto-clear focus after 3 seconds so it doesn't stay locked
            setTimeout(() => setFocusDeviceId(null), 3000);
          }
        }
      }
    } else if (activeExam) {
      setTimeout(() => setProjectName(activeExam.title), 0);
      // Auto-open editor for blank templates
      if (activeExam.isCustom && activeExam.tasks.length === 0) {
        toggleEditor(true);
      }
    }
  }, [activeGuidedProject, activeExam, toggleEditor]);

  // Persistence: Load from URL ID or localStorage on mount
  useEffect(() => {
    if (initialProjectId) {
      // 1. Try example projects (dynamic import — not in initial bundle)
      import('@/lib/network/exampleProjects').then(({ exampleProjects }) => {
        const examples = exampleProjects(language);
        const example = examples.find(p => p.id === initialProjectId);
        if (example) {
          setTimeout(() => applyExampleProject(example.data, example.id), 0);
          return;
        }
      });

      // 2. Try guided projects (Lessons)
      const lessons = getGuidedProjects(language);
      const lesson = lessons.find(p => p.id === initialProjectId);
      if (lesson) {
        setTimeout(() => handleStartGuidedProject(lesson), 0);
        // Note: applyExampleProject or startGuidedProject handles topology loading
        return;
      }

      // 3. Try exams
      const exams = getExamProjects(language);
      const exam = exams.find(p => p.id === initialProjectId);
      if (exam) {
        setTimeout(() => startExamFromCatalog(exam), 0);
        return;
      }
    }

    let savedData: string | null = null;
    try { savedData = localStorage.getItem('netsim_autosave'); } catch { /* storage unavailable */ }
    if (savedData) {
      try {
        const projectData = safeParse<unknown>(savedData);
        setTimeout(() => loadProjectData(projectData, { keepActiveDevice: true }), 0);
        // Load last save time from timestamp
        const parsedProject = (projectData && typeof projectData === 'object') ? projectData as Record<string, unknown> : null;
        if (parsedProject?.timestamp) {
          const date = new Date(String(parsedProject.timestamp));
          setTimeout(() => setLastSaveTime(date.toLocaleTimeString()), 0);
        } else {
          setTimeout(() => setLastSaveTime(new Date().toLocaleTimeString()), 0);
        }
      } catch (e) {
        errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'autosave', error: String(e) }));
      }
    }
  }, [loadProjectData]);

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
                {/* Glitch overlays */}
                <div className="absolute inset-0 p-4 rounded-2xl bg-error-500/30 animate-glitch-skew mix-blend-screen" />
                <div className="absolute inset-0 p-4 rounded-2xl bg-primary-500/30 animate-glitch mix-blend-screen" style={{ animationDelay: '0.1s' }} />
              </div>

              <h1
                className="text-3xl font-black tracking-tighter text-white glitch-text mb-2 text-center"
                data-text="NETWORK SIMULATOR"
              >
                NETWORK SIMULATOR
              </h1>

              <div className="flex items-center gap-2 mt-4">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
                <span className="text-xs font-bold tracking-widest text-accent-500 ">
                  {t.initializingSystem}
                </span>
              </div>
            </div>

            {/* Background scanline effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%]" />
          </div>
        )}

        {/* Skeleton Loading State */}
        {showSkeleton && !isAppLoading && (
          <div className="fixed inset-0 z-[9998] bg-background">
            <AppSkeleton />
          </div>
        )}

        {/* Main Content with transition */}
        <div className="flex flex-col flex-1 animate-fade-in w-full max-w-[1920px] mx-auto">
          {/* Header */}
          <AppHeader
            t={t}
            isDark={isDark}
            theme={theme}
            language={language}
            isPingPanelOpen={isPingPanelOpen}
            setLanguage={setLanguage}
            setTheme={setTheme}
            graphicsQuality={graphicsQuality}
            setGraphicsQuality={setGraphicsQuality}
            activeTab={activeTab}
            activeDeviceType={activeDeviceType}
            activeDeviceId={activeDeviceId}
            topologyDevices={topologyDevices}
            deviceStates={deviceStates}
            totalScore={totalScore}
            maxScore={maxScore}
            canUndo={canUndo}
            canRedo={canRedo}
            hasHydrated={hasHydrated}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
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
            setHelpLevel={(level) => useAppStore.getState().setHelpLevel(level)}
          />

          {showProjectPicker && <ProjectPickerDialog
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
          />}


          {showOnboarding && <OnboardingDialog
            open={showOnboarding}
            t={t}
            isDark={isDark}
            onboardingStep={onboardingStep}
            onboardingSteps={onboardingSteps}
            closeOnboardingForever={closeOnboardingForever}
            prevOnboarding={prevOnboarding}
            nextOnboarding={nextOnboarding}
          />}


          {/* Unified Device Panel (CLI + Tasks) */}
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
            toggleDevicePower={toggleDevicePower}
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

          {/* Firewall Configuration Modal */}
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

          {/* PC Terminal Modal */}
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

          {/* Router Info Panel Modal */}
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

          {/* Main Content - Fits between header and footer with scroll */}
          <main className={cn(
            "overflow-hidden flex flex-col min-h-0 h-[calc(100vh-44px)] pt-[72px]",
            activeTab === 'topology' ? 'md:pt-[130px]' : 'md:pt-[72px]',
            isTablet && (showPCPanel || showUnifiedDeviceModal || showRouterPanel) && "flex-row md:pt-[72px]"
          )}>
            <div className={cn(
              "w-full flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-500",
              isTablet && (showPCPanel || showUnifiedDeviceModal || showRouterPanel) && "w-1/2 flex-none border-r border-secondary-200/50 dark:border-secondary-800/50"
            )}>
              {/* Tab Content - Always render but hide non-active */}
              <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'topology' ? 'flex' : 'hidden'} print:flex`}>
                {/* Topology Toolbar */}
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


                {/* Network Topology fills remaining space */}
                <div ref={topologyContainerRef} className="flex-1 w-full h-full min-h-0 overflow-hidden relative">
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
                      if (device) {
                        setActiveDeviceType(device.type);
                      }
                      setUnifiedDeviceActiveTab('settings');
                      setShowUnifiedDeviceModal(true);
                    }}
                    clearSelectionTrigger={clearSelectionTrigger}
                    onPacketPanelFocus={() => setFocusedOverlay('packet')}
                    packetPanelZIndex={focusedOverlay === 'packet' ? 35 : 30}
                    onAction={commitAction}
                  />

                  {/* PC Info Popover - Bottom Right Mini Panel */}
                  {activeDeviceId && (activeDeviceId.startsWith('pc-') || topologyDevices?.find(d => d.id === activeDeviceId)?.type === 'pc') && topologyDevices && topologyDevices.find(d => d.id === activeDeviceId) && (
                    <PCInfoPopover
                      pc={topologyDevices.find(d => d.id === activeDeviceId) as CanvasDevice}
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
                      onOpenPanel={(id) => {
                        setShowUnifiedDeviceModal(false);
                        setShowRouterPanel(false);
                        setShowFirewallPanel(false);
                        setShowPCDeviceId(id);
                        setPcPanelInitialTab('settings');
                        setShowPCPanel(true);
                      }}
                      topologyDevices={topologyDevices}
                      deviceStates={deviceStates}
                    />
                  )}

                  {activeDeviceId && (activeDeviceId.startsWith('router-') || topologyDevices?.find(d => d.id === activeDeviceId)?.type === 'router') && topologyDevices && (
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
                      onOpenPanel={(id) => {
                        setShowPCPanel(false);
                        setShowUnifiedDeviceModal(false);
                        setShowFirewallPanel(false);
                        setShowRouterDeviceId(id);
                        setShowRouterPanel(true);
                      }}
                      topologyConnections={topologyConnections}
                    />
                  )}
                </div>
              </div>


              {/* Terminal Sekmesi - Removed from inline, now shown as full-screen modal */}

              {/* Tasks Sekmesi - Removed from inline, now shown as modal */}

            </div>

            {/* Tablet Split View Panels (Docked Right) */}
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
              pcHistories={pcHistories}
              handleUpdatePCHistory={handleUpdatePCHistory}
              handleExecuteCommand={handleExecuteCommand}
              handlePCPanelNavigateWrapper={handlePCPanelNavigateWrapper}
              handleDeviceDelete={handleDeviceDelete}
              showRouterDeviceId={showRouterDeviceId}
              focusedOverlay={focusedOverlay}
            />

            {/* Network Refresh Report - Floating panel style on both Desktop and Mobile */}
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
            />
          </main>

          <AppFooter
            t={t}
            isDark={isDark}
            language={language}
            activeTab={activeTab}
            activeDeviceType={activeDeviceType}
            activeDeviceId={activeDeviceId}
            hasUnsavedChanges={hasUnsavedChanges}
            lastSaveTime={lastSaveTime}
            projectName={projectName}
            totalScore={totalScore}
            maxScore={maxScore}
            topologyDevices={topologyDevices}
            lastTaskEvent={lastTaskEvent}
            showProjectPicker={showProjectPicker}
            showOnboarding={showOnboarding}
            handleRefreshNetwork={handleRefreshNetwork}
            setIsEnvironmentPanelOpen={setIsEnvironmentPanelOpen}
          >
            {isRoomEnabled && (
              <>
                <div className={cn("w-px h-4 mx-0.5", isDark ? "bg-secondary-700" : "bg-secondary-300")} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-primary-500 hover:bg-primary-500/10"
                  onClick={() => setShowRoomJoinDialog(true)}
                  aria-label={t.roomStudentJoin}
                >
                  <Users className="w-3.5 h-3.5" />
                </Button>
                {!studentRoomCode && (
                  <>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-purple-500 hover:bg-purple-500/10"
                      onClick={() => setShowTeacherPanel(true)}
                      aria-label={t.roomTeacherOpen}
                    >
                      <UserKey className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </>
            )}
          </AppFooter>



          {showAboutModal && <LazyAboutModal
            isOpen={showAboutModal}
            onClose={() => setShowAboutModal(false)}
            onStartTour={() => {
              setShowAboutModal(false);
              setShowOnboarding(true);
              setOnboardingStep(0);
            }}
          />}

          {showBasarilarim && <BasarilarimPanel
            t={t}
            language={language}
            isDark={isDark}
            onClose={() => setShowBasarilarim(false)}
            zIndex={60}
          />}

          {isEnvironmentPanelOpen && <EnvironmentSettingsPanel
            isOpen={isEnvironmentPanelOpen}
            onOpenChange={setIsEnvironmentPanelOpen}
          />}

          {/* Guided Mode Panel */}
          {isGuidedModeActive && <GuidedModePanel
            project={activeGuidedProject}
            currentStepIndex={guidedStepIndex}
            onStepComplete={completeStep}
            onStepUncomplete={uncompleteStep}
            onClose={togglePanelMinimize}
            onMinimize={togglePanelMinimize}
            isMinimized={isPanelMinimized}
            lastCompletedStep={lastCompletedStep}
            isCurrentStepReady={isCurrentStepReady}
            lastCommand={lastCommand}
            lastOutput={lastOutput}
            deviceAccessed={showUnifiedDeviceModal ? (activeDeviceType === 'switchL2' || activeDeviceType === 'switchL3' ? 'switch' : activeDeviceType === 'router' ? 'router' : 'pc') : null}
            deviceAccessedId={showUnifiedDeviceModal ? activeDeviceId : null}
            deviceState={state}
            deviceStates={deviceStates}
            topologyConnections={topologyConnections}
            topologyDevices={topologyDevices}
            onCheckAutoComplete={checkStepCompletionWithContext}
          />}

          {/* Exam Mode Panel */}
          {isExamActive && !isEditorOpen && <ExamModePanel
            project={activeExam}
            onClose={closeExam}
            onMinimize={toggleExamPanelMinimize}
            isMinimized={isExamPanelMinimized}
            isFinished={isExamFinished}
            onFinish={finishExam}
            score={examScore}
            lastCommand={lastCommand}
            lastOutput={lastOutput}
            deviceAccessed={showUnifiedDeviceModal ? (activeDeviceType === 'switchL2' || activeDeviceType === 'switchL3' ? 'switch' : activeDeviceType === 'router' ? 'router' : 'pc') : null}
            deviceAccessedId={showUnifiedDeviceModal ? activeDeviceId : null}
            deviceState={state}
            deviceStates={deviceStates}
            topologyConnections={topologyConnections}
            topologyDevices={topologyDevices}
            onCheckTasks={checkExamTasks}
            onOpenEditor={!isExamLoadedFromFile ? () => toggleEditor(true) : undefined}
          />}

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
              exportExamFile={(projData) => {
                // Export final student .exam file using current project state
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
        </div>
      </div>
    </AppErrorBoundary>
  );
}
