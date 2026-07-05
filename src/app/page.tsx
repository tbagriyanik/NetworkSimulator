'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import { SwitchState, CableInfo, Port } from '@/lib/network/types';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { useNetworkLogic } from '@/hooks/useNetworkLogic';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useDrag } from '@/hooks/useDrag';
import { useMultiTabWarning } from '@/hooks/useMultiTabWarning';
import { useIsMobile, useIsTablet } from '@/hooks/use-breakpoint';
import { useMobileBack } from '@/hooks/useMobileBack';
import { usePanels } from '@/hooks/usePanels';
import { useRefreshReport } from '@/hooks/useRefreshReport';
import { useDeviceSelection } from '@/hooks/useDeviceSelection';
import useAppStore, { useTopologyDevices, useTopologyConnections, useTopologyNotes, useZoom, usePan, useActiveTab, useEnvironment } from '@/lib/store/appStore';
import { ExamTask } from '@/lib/network/examMode';
import { cn, normalizeMAC } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType, FirewallRule } from '@/components/network/networkTopology.types';
import { getPrompt } from '@/lib/network/executor';
import { formatErrorForUser, errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';
import { generateRandomLinkLocalIpv4 } from '@/lib/network/linkLocal';
import { safeParse, safeStringify } from '@/lib/network/serialization';
import { recalculateStp } from '@/lib/network/stp';
import { createInitialState, createInitialRouterState, createInitialFirewallState, createInitialWLCState } from '@/lib/network/initialState';
import type { TerminalOutput } from '@/components/network/Terminal';
import { BOOT_PROGRESS_MARKER } from '@/components/network/Terminal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const NetworkTopology = dynamic(
  () => import('@/components/network/NetworkTopology').then((m) => m.NetworkTopology),
  { ssr: false }
);

import { Network, Monitor, UserKey, X, Power, Filter, RefreshCw, Users, Activity, ShieldCheck, Share2, Layers } from "lucide-react";
import { Button } from '@/components/ui/button';
import { TooltipWrapper } from "@/components/ui/TooltipWrapper";
import { useLanguage, Translations } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

import { generateProjectSummary } from '@/utils/generateSummary';

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
import { AppSkeleton } from '@/components/ui/AppSkeleton';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { useRoom } from '@/contexts/RoomContext';
import { useRoomSync } from '@/hooks/useRoomSync';
import { useToast } from '@/hooks/use-toast';
import { checkFaultResolved } from '@/lib/network/faults';


const PCPanel = dynamic(() => import('@/components/network/PCPanel').then((m) => m.PCPanel));
const RouterPanel = dynamic(() => import('@/components/network/RouterPanel').then((m) => m.RouterPanel));
const UnifiedDevicePanel = dynamic(() => import('@/components/network/UnifiedDevicePanel').then((m) => m.UnifiedDevicePanel));
const LazyAboutModal = dynamic(() => import('@/components/network/LazyAboutModal').then((m) => m.LazyAboutModal));
const ProjectPickerDialog = dynamic(() => import('@/components/network/ProjectPickerDialog').then((m) => m.ProjectPickerDialog));
const GuidedModePanel = dynamic(() => import('@/components/network/GuidedModePanel').then((m) => m.GuidedModePanel));
const ExamModePanel = dynamic(() => import('@/components/network/ExamModePanel').then((m) => m.ExamModePanel));
const FirewallPanel = dynamic(() => import('@/components/network/FirewallPanel').then((m) => m.FirewallPanel));
const EnvironmentSettingsPanel = dynamic(() => import('@/components/network/EnvironmentSettingsPanel').then((m) => m.EnvironmentSettingsPanel));
const OnboardingDialog = dynamic(() => import('@/components/network/OnboardingDialog').then((m) => m.OnboardingDialog));
const ExamEditorPanel = dynamic(() => import('@/components/network/ExamEditorPanel').then((m) => m.ExamEditorPanel));
const RoomJoinDialog = dynamic(() => import('@/components/RoomJoinDialog').then((m) => m.RoomJoinDialog));
const TeacherRoomPanel = dynamic(() => import('@/components/TeacherRoomPanel').then((m) => m.TeacherRoomPanel));
const TimelinePanel = dynamic(() => import('@/components/network/TimelinePanel').then((m) => m.TimelinePanel));
const TroubleshootingPanel = dynamic(() => import('@/components/network/TroubleshootingPanel').then((m) => m.TroubleshootingPanel));

type TabType = 'topology' | 'cmd' | 'terminal' | 'tasks';

// PC Output type for PCPanel
interface PCOutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success';
  content: string;
}

interface TabDefinition {
  id: TabType;
  labelKey: keyof Translations;
  icon: React.ReactNode;
  tasks: readonly unknown[];
  color: string;
  showFor: DeviceType[];
}

const SWITCH_DEVICE_TYPES: DeviceType[] = ['switchL2', 'switchL3'];

const ALL_TABS: TabDefinition[] = [
  {
    id: 'topology',
    labelKey: 'networkTopology',
    icon: <Network className="w-4 h-4" />,
    tasks: topologyTasks,
    color: 'from-accent-500 to-primary-500',
    showFor: ['pc', 'iot', ...SWITCH_DEVICE_TYPES, 'router']
  },
];

const exampleLevelOrder: ExampleProjectLevel[] = ['basic', 'intermediate', 'advanced'];

import { useHistory, ProjectState } from '@/hooks/useHistory';

type RefreshDeviceSummary = {
  id: string;
  name: string;
  type: DeviceType;
  ip: string;
  mac: string;
  gateway: string;
  ipv6: string;
  services: string;
};

const REFRESH_DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  router: 'Router',
  switchL3: 'L3 SW',
  switchL2: 'L2 SW',
  pc: 'PC',
  iot: 'IoT',
  firewall: 'Firewall',
  wlc: 'WLC',
};

const REFRESH_DEVICE_TYPE_ORDER: DeviceType[] = ['router', 'switchL3', 'switchL2', 'pc', 'iot', 'firewall'];

function RefreshDeviceListToast({
  devices,
  language,
}: {
  devices: RefreshDeviceSummary[];
  language: string;
}) {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(devices[0]?.id ?? null);
  const selected = devices.find((device) => device.id === selectedId) || null;
  const isTR = language === 'tr';
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!devices.length) {
      setTimeout(() => setSelectedId(null), 0);
      return;
    }
    if (!selectedId || !devices.some((device) => device.id === selectedId)) {
      setTimeout(() => setSelectedId(devices[0].id), 0);
    }
  }, [devices, selectedId]);

  if (devices.length === 0) {
    return <div>{isTR ? 'Listelenecek cihaz yok.' : 'No devices to list.'}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 pt-1">
        {devices.map((device) => (
          <button
            key={device.id}
            type="button"
            onClick={() => setSelectedId(device.id)}
            className={`w-24 px-2 py-0.5 text-[10px] font-bold rounded transition-all border ${selectedId === device.id
              ? 'bg-primary-600 border-primary-700 text-white shadow-sm scale-105 z-10'
              : isDark
                ? 'bg-secondary-800 border-secondary-700 text-secondary-400 hover:bg-secondary-700 hover:text-secondary-300'
                : 'bg-secondary-100 border-secondary-200 text-secondary-600 hover:bg-secondary-200 hover:text-secondary-800'
              }`}
          >
            {device.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="overflow-hidden rounded-md border border-secondary-200 dark:border-secondary-700">
          <table className="w-full text-[11px]">
            <tbody>
              {([
                [isTR ? 'Cihaz' : 'Device', `${selected.name} (${REFRESH_DEVICE_TYPE_LABELS[selected.type]})`, false],
                ['IP', selected.ip, true],
                ['MAC', selected.mac ? normalizeMAC(selected.mac) : '-', true],
                ['GW', selected.gateway, true],
                ['IPv6', selected.ipv6, true],
                [isTR ? 'Açık hizmetler' : 'Open services', selected.services, false],
              ] as Array<[string, string, boolean]>).map(([label, value, copyable]) => (
                <tr key={label} className="border-t first:border-t-0 border-secondary-200 dark:border-secondary-700">
                  <td className="w-24 bg-secondary-100 px-2 py-1 font-semibold dark:bg-secondary-800">{label}</td>
                  <TooltipWrapper title={copyable ? t.copy : undefined}>
                    <td
                      className={`px-2 py-1 font-mono ${copyable ? 'cursor-pointer hover:bg-secondary-200 dark:hover:bg-secondary-700 rounded' : ''}`}
                      onClick={copyable && value !== '-' ? () => navigator.clipboard.writeText(value) : undefined}
                    >
                      {value}
                    </td>
                  </TooltipWrapper>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LiveDeviceList({
  devices,
  deviceStates,
  language,
}: {
  devices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  language: string;
}) {
  const { t } = useLanguage();

  const hasValidIp = (ip: string | undefined) => !!ip && ip !== '0.0.0.0' && ip !== '169.254.0.0';
  const firstValue = (...values: Array<string | undefined | null>) =>
    values.find((value) => !!value && value !== '0.0.0.0') || '-';
  const normalizeWifiMode = (mode: string | undefined): 'ap' | 'client' | 'disabled' => {
    if (!mode) return 'disabled';
    const normalized = mode.toLowerCase().replace(/^wifi-/, '');
    if (normalized === 'client' || normalized === 'sta') return 'client';
    if (normalized === 'ap') return 'ap';
    return 'disabled';
  };
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
    return { ...device.wifi, enabled, ssid: runtimeWifi.ssid || device.wifi?.ssid || '',
      security: runtimeWifi.security || device.wifi?.security || 'open',
      password: runtimeWifi.password || device.wifi?.password,
      channel: runtimeWifi.channel || device.wifi?.channel || '2.4GHz', mode: resolvedMode };
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

  const liveDevices = useMemo(() => {
    if (!devices || !deviceStates) return [];
    return devices.map((device) => {
      const state = deviceStates.get(device.id);
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
      } as RefreshDeviceSummary;
    }).sort((a, b) => {
      const typeDiff = REFRESH_DEVICE_TYPE_ORDER.indexOf(a.type) - REFRESH_DEVICE_TYPE_ORDER.indexOf(b.type);
      if (typeDiff !== 0) return typeDiff;
      return a.name.localeCompare(b.name, language === 'tr' ? 'tr' : 'en');
    });
  }, [devices, deviceStates, language]);

  return <RefreshDeviceListToast devices={liveDevices} language={language} />;
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

  // Load project name from localStorage on mount
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('lastProjectName');
      if (savedName) setTimeout(() => setProjectName(savedName), 0);
    } catch { /* ignore */ }
  }, []);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showBasarilarim, setShowBasarilarim] = useState(false);

  // PWA Installation state
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Notify components that app can be installed
      window.dispatchEvent(new CustomEvent('pwa-installable'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
  }, []);

  const handleInstallPWA = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  // Listen for manual install triggers
  useEffect(() => {
    window.addEventListener('trigger-pwa-install', handleInstallPWA as EventListener);
    return () => window.removeEventListener('trigger-pwa-install', handleInstallPWA as EventListener);
  }, [handleInstallPWA]);

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
  const [isExamLoadedFromFile, setIsExamLoadedFromFile] = useState(false);
  const [isTimelineMinimized, setIsTimelineMinimized] = useState(true);
  const toggleTimelineMinimize = useCallback(() => setIsTimelineMinimized(prev => !prev), []);

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
      advanced: t.intermediateHint
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

  // Network logic functions (must come after Zustand selectors to avoid TDZ)
  const networkLogic = useNetworkLogic(deviceStates, topologyConnections, environment);

  const setDevices = useAppStore((state) => state.setDevices);
  const setConnections = useAppStore((state) => state.setConnections);
  const setNotes = useAppStore((state) => state.setNotes);
  const setZoom = useAppStore((state) => state.setZoom);
  const setPan = useAppStore((state) => state.setPan);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const graphicsQuality = useAppStore((state) => state.graphicsQuality);
  const setGraphicsQuality = useAppStore((state) => state.setGraphicsQuality);
  const addCapturedPacket = useAppStore((state) => state.addCapturedPacket);

  const [isPingPanelOpen, setIsPingPanelOpen] = useState(false);

  // Global packet capture event listener
  useEffect(() => {
    const handlePacketCaptured = ((e: CustomEvent) => {
      if (e.detail) {
        addCapturedPacket(e.detail);
      }
    }) as EventListener;
    window.addEventListener('packet-captured', handlePacketCaptured);
    return () => window.removeEventListener('packet-captured', handlePacketCaptured);
  }, [addCapturedPacket]);

  // Check if troubleshooting project faults are resolved
  const resolvedFaultsProjectRef = useRef<string | null>(null);

  const activeTroubleshootingProject = useMemo(() => {
    if (activeExam && activeExam.injectedFaults && activeExam.injectedFaults.length > 0) {
      return activeExam;
    }

    if (!loadedExampleId) return null;
    for (const level of exampleLevelOrder) {
      const projects = groupedExampleProjects[level];
      if (projects) {
        const found = projects.find(p => p.id === loadedExampleId);
        if (found && found.injectedFaults && found.injectedFaults.length > 0) {
          return found;
        }
      }
    }
    return null;
  }, [activeExam, loadedExampleId, groupedExampleProjects, exampleLevelOrder]);

  const [isTroubleshootingMinimized, setIsTroubleshootingMinimized] = useState(false);
  const [showTroubleshootingPanel, setShowTroubleshootingPanel] = useState(true);

  useEffect(() => {
    if (!deviceStates || deviceStates.size === 0) return;
    if (resolvedFaultsProjectRef.current === loadedExampleId) return;

    if (activeTroubleshootingProject) {
      setTimeout(() => setShowTroubleshootingPanel(true), 0);
      let allResolved = true;
      for (const fault of (activeTroubleshootingProject.injectedFaults || [])) {
        const state = deviceStates.get(fault.deviceId);
        if (!state) {
          allResolved = false;
          break;
        }
        if (!checkFaultResolved(state, fault)) {
          allResolved = false;
          break;
        }
      }

      if (allResolved) {
        resolvedFaultsProjectRef.current = loadedExampleId;
        
        // Use setTimeout to avoid calling toast directly in effect, preventing cascading issues
        setTimeout(() => {
          toast({
            title: language === 'tr' ? 'Tebrikler!' : 'Congratulations!',
            description: language === 'tr' ? 'Tüm arızaları başarıyla giderdiniz!' : 'You successfully resolved all faults!',
            variant: 'default',
          });
          
          const projectNameStr = typeof activeTroubleshootingProject.title === 'string' 
            ? activeTroubleshootingProject.title 
            : (activeTroubleshootingProject.title as { tr?: string; en?: string })?.tr || (activeTroubleshootingProject.title as { tr?: string; en?: string })?.en || 'Troubleshooting Project';
            
          addGuidedLessonRecord(projectNameStr, 100, 100);
        }, 100);
      }
    }
  }, [deviceStates, loadedExampleId, activeTroubleshootingProject, language, toast]);



  // Project summary note generator
  useEffect(() => {
    const handleGenerateSummaryNote = () => {
      let text = `--- ${language === 'tr' ? 'PROJE ÖZETİ' : 'PROJECT SUMMARY'} ---\n`;
      text += `${language === 'tr' ? 'Proje Adı' : 'Project Name'}: ${projectName}\n`;
      
      if (isGuidedModeActive && activeGuidedProject) {
        text += `\n${language === 'tr' ? 'Rehberli Proje Adımları' : 'Guided Project Steps'}:\n`;
        activeGuidedProject.steps.forEach((step, idx) => {
          const isCompleted = idx < guidedStepIndex;
          const statusChar = isCompleted ? '[x]' : '[ ]';
          text += `${statusChar} ${step.title} (${step.points || 0} ${language === 'tr' ? 'Puan' : 'Pts'})\n`;
        });
        text += `\n${language === 'tr' ? 'İlerleme' : 'Progress'}: ${guidedStepIndex}/${activeGuidedProject.steps.length} ${language === 'tr' ? 'Adım' : 'Steps'} (${currentPoints}/${totalPoints} ${language === 'tr' ? 'Puan' : 'Pts'})\n`;
      } else if (isExamActive && activeExam) {
        text += `\n${language === 'tr' ? 'Sınav Görevleri' : 'Exam Tasks'}:\n`;
        const completedCount = activeExam.tasks.filter(t => t.completed).length;
        activeExam.tasks.forEach((task) => {
          const statusChar = task.completed ? '[x]' : '[ ]';
          const taskDesc = task.description[language] || task.description.en || '';
          text += `${statusChar} ${taskDesc} (${task.weight || 0} ${language === 'tr' ? 'Puan' : 'Pts'})\n`;
        });
        const currentExamPoints = activeExam.tasks.filter(t => t.completed).reduce((acc, t) => acc + (t.weight || 0), 0);
        const totalExamPoints = activeExam.tasks.reduce((acc, t) => acc + (t.weight || 0), 0);
        text += `\n${language === 'tr' ? 'İlerleme' : 'Progress'}: ${completedCount}/${activeExam.tasks.length} ${language === 'tr' ? 'Görev' : 'Tasks'} (${currentExamPoints}/${totalExamPoints} ${language === 'tr' ? 'Puan' : 'Pts'})\n`;
      } else {
        text += `\n${language === 'tr' ? 'Mod' : 'Mode'}: ${language === 'tr' ? 'Serbest Çalışma (Sandbox)' : 'Free Sandbox'}\n`;
      }

      text += `\n--- ${language === 'tr' ? 'AĞ BİLGİLERİ' : 'NETWORK DETAILS'} ---\n`;
      text += `${language === 'tr' ? 'Cihaz Sayısı' : 'Devices'}: ${topologyDevices.length}\n`;
      text += `${language === 'tr' ? 'Bağlantı Sayısı' : 'Connections'}: ${topologyConnections.length}\n`;

      if (topologyDevices.length > 0) {
        const typeOrder = ['pc', 'switchL2', 'switchL3', 'router', 'firewall', 'iot', 'wlc'];
        const sortedTopologyDevices = [...topologyDevices].sort((a, b) => {
          const idxA = typeOrder.indexOf(a.type);
          const idxB = typeOrder.indexOf(b.type);
          const valA = idxA === -1 ? 99 : idxA;
          const valB = idxB === -1 ? 99 : idxB;
          return valA - valB;
        });

        text += `\n${language === 'tr' ? 'Cihaz Listesi' : 'Device List'}:\n`;
        sortedTopologyDevices.forEach(d => {
          text += `- ${d.name} (${d.type.toUpperCase()}) ${d.ip ? `IP: ${d.ip}` : ''} [${d.status === 'offline' ? (language === 'tr' ? 'Çevrimdışı' : 'Offline') : (language === 'tr' ? 'Çevrimiçi' : 'Online')}]\n`;
        });

        text += `\n--- ${language === 'tr' ? 'CİHAZ DETAYLARI' : 'DEVICE DETAILS'} ---\n`;
        sortedTopologyDevices.forEach(d => {
          text += `\n* ${d.name} (${d.type.toUpperCase()}):\n`;
          if (d.type === 'pc' || d.type === 'iot') {
            text += `  - ${language === 'tr' ? 'IP Modu' : 'IP Mode'}: ${d.ipConfigMode === 'dhcp' ? 'DHCP' : 'Static'}\n`;
            if (d.ip) text += `  - IPv4: ${d.ip} / ${d.subnet || '255.255.255.0'}\n`;
            if (d.ipv6) text += `  - IPv6: ${d.ipv6}/${d.ipv6Prefix || '64'}\n`;
            if (d.gateway) text += `  - ${language === 'tr' ? 'Varsayılan Ağ Geçidi' : 'Default Gateway'}: ${d.gateway}\n`;
            if (d.dns) text += `  - DNS: ${d.dns}\n`;
            if (d.wifi?.enabled) {
              text += `  - WiFi: ${d.wifi.ssid} (${d.wifi.mode === 'ap' ? 'AP' : 'Client'}, ${d.wifi.security})\n`;
            }
            const sList: string[] = [];
            if (d.services?.dhcp?.enabled) sList.push('DHCP');
            if (d.services?.dns?.enabled) sList.push('DNS');
            if (d.services?.http?.enabled) sList.push('HTTP');
            if (sList.length > 0) {
              text += `  - ${language === 'tr' ? 'Servisler' : 'Services'}: ${sList.join(', ')}\n`;
            }
          } else {
            const state = deviceStates?.get(d.id);
            if (state) {
              text += `  - Hostname: ${state.hostname || d.name}\n`;
              if (state.defaultGateway) text += `  - ${language === 'tr' ? 'Varsayılan Ağ Geçidi' : 'Default Gateway'}: ${state.defaultGateway}\n`;
              if (state.dnsServer) text += `  - DNS Server: ${state.dnsServer}\n`;
              if (state.domainName) text += `  - Domain: ${state.domainName}\n`;
              
              const activePorts = Object.entries(state.ports).filter(([_, port]) => {
                return port.ipAddress || port.shutdown || port.mode === 'trunk' || (port.accessVlan !== undefined && port.accessVlan !== 1) || port.portSecurity?.enabled;
              });
              
              if (activePorts.length > 0) {
                text += `  - ${language === 'tr' ? 'Port Konfigürasyonları' : 'Port Configurations'}:\n`;
                activePorts.forEach(([portId, port]) => {
                  const portDetails = [];
                  if (port.shutdown) portDetails.push(language === 'tr' ? 'Kapalı' : 'Shutdown');
                  if (port.ipAddress) portDetails.push(`IP: ${port.ipAddress}/${port.subnetMask || '24'}`);
                  if (port.mode === 'trunk') portDetails.push('Trunk');
                  else if (port.accessVlan && port.accessVlan !== 1) portDetails.push(`VLAN: ${port.accessVlan}`);
                  if (port.portSecurity?.enabled) portDetails.push('Port-Security');
                  text += `    * ${portId}: ${portDetails.join(', ') || 'Default'}\n`;
                });
              }
              const vlanIds = Object.keys(state.vlans || {}).filter(v => v !== '1');
              if (vlanIds.length > 0) {
                text += `  - VLANs: ${vlanIds.join(', ')}\n`;
              }
            } else {
              text += `  - ${language === 'tr' ? 'Konfigürasyon' : 'Configuration'}: ${language === 'tr' ? 'Henüz yüklenmedi' : 'Not loaded'}\n`;
            }
          }
        });
      }

      const summary = generateProjectSummary(topologyDevices || [], topologyConnections || [], deviceStates);
      

      if (summary.configs.length > 0) {
        text += `--- ${language === 'tr' ? 'CİHAZ KONFİGÜRASYONLARI' : 'DEVICE CONFIGURATIONS'} ---\n`;
        summary.configs.forEach(config => {
          text += `\n[ ${config.name} (${config.type}) ]\n`;
          text += config.commands + `\n`;
        });
      }
      const id = `note-${Date.now()}`;
      const newNote: CanvasNote = {
        id,
        text,
        x: 150,
        y: 150,
        width: 380,
        height: 320,
        color: 'var(--color-primary-100)', // light blue note color for summary
        opacity: 1,
        font: 'sans-serif',
        fontSize: 12,
      };
      setNotes((prev) => [...prev, newNote]);
      
      toast({
        title: language === 'tr' ? 'Özet Notu Oluşturuldu' : 'Summary Note Created',
        description: language === 'tr' ? 'Proje adımları, ağ ve konfigürasyon özeti not olarak topolojiye eklendi.' : 'Project steps, network and config summary added to the topology as a note.',
        variant: 'default',
      });
    };

    window.addEventListener('trigger-topology-generate-summary-note', handleGenerateSummaryNote);
    return () => window.removeEventListener('trigger-topology-generate-summary-note', handleGenerateSummaryNote);
  }, [
    language,
    projectName,
    isGuidedModeActive,
    activeGuidedProject,
    guidedStepIndex,
    currentPoints,
    totalPoints,
    isExamActive,
    activeExam,
    topologyDevices,
    topologyConnections,
    deviceStates,
    setNotes,
    deviceOutputs,
    pcOutputs
  ]);

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
    handleDeviceSelectFromCanvas,
    handleDeviceSelectFromMenu, focusDeviceInTopology,
    activeTabRef,
    pendingFocusDeviceRef, topologyContainerRef,
  } = nav;
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
    setTimeout(() => setHasHydrated(true), 0);
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

  // Apply graphics quality class to body
  useEffect(() => {
    const body = document.body;

    if (graphicsQuality === 'low') {
      body.classList.add('graphics-low');
      body.classList.remove('graphics-high');
    } else {
      body.classList.add('graphics-high');
      body.classList.remove('graphics-low');
    }
  }, [graphicsQuality]);

  // Helper functions for state setters to maintain compatibility
  const setTopologyDevices = setDevices;
  const setTopologyConnections = setConnections;
  const setTopologyNotes = setNotes;

  // Currently active device in terminal

  const isValidIpv4Address = useCallback((value: string) => {
    const parts = value.trim().split('.');
    return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
  }, []);

  const deviceStatesRef = useRef(deviceStates);
  useEffect(() => { deviceStatesRef.current = deviceStates; }, [deviceStates]);

  const formatLocalDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const advanceNtpDateTime = useCallback((dateValue?: string, timeValue?: string) => {
    const fallback = new Date();
    const baseDate = dateValue || formatLocalDate(fallback);
    const baseTime = timeValue || fallback.toTimeString().slice(0, 8);
    const next = new Date(`${baseDate}T${baseTime}`);
    if (Number.isNaN(next.getTime())) return {
      date: baseDate,
      time: baseTime,
    };
    next.setSeconds(next.getSeconds() + 1);
    return {
      date: formatLocalDate(next),
      time: next.toTimeString().slice(0, 8),
    };
  }, [formatLocalDate]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTopologyDevices((prev) => networkLogic.applyIotAutomationPass(prev));
    }, 250);

    return () => window.clearInterval(interval);
  }, [networkLogic.applyIotAutomationPass, setTopologyDevices]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTopologyDevices((prevDevices) => {
        const devices = prevDevices.map((device) => {
          const devState = deviceStatesRef.current.get(device.id);
          if (devState?.services?.ntp?.enabled && !device.services?.ntp?.enabled) {
            return { ...device, services: { ...device.services, ntp: devState.services.ntp } };
          }
          return { ...device };
        });

        for (const device of devices) {
          const ntp = device.services?.ntp;
          if (!ntp?.enabled) continue;

          const serverIp = ntp.server?.trim();
          const upstreamDevice = serverIp && isValidIpv4Address(serverIp)
            ? devices.find((candidate) => candidate.ip === serverIp && candidate.services?.ntp?.enabled)
            : undefined;
          const upstreamNtp = upstreamDevice?.services?.ntp;

          if (upstreamNtp?.enabled) {
            device.services = {
              ...(device.services || {}),
              ntp: {
                ...ntp,
                enabled: true,
                date: upstreamNtp.date || formatLocalDate(new Date()),
                time: upstreamNtp.time || new Date().toTimeString().slice(0, 8),
              },
            };
            continue;
          }

          const nextTime = advanceNtpDateTime(ntp.date, ntp.time);
          device.services = {
            ...(device.services || {}),
            ntp: {
              ...ntp,
              enabled: true,
              date: nextTime.date,
              time: nextTime.time,
            },
          };
        }

        return devices;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [advanceNtpDateTime, formatLocalDate, isValidIpv4Address, setTopologyDevices]);

  // Live summary metrics computed reactively from store (real-time)
  const liveSummary = useMemo(() => {
    const devices = topologyDevices;
    const states = deviceStates;
    if (!devices || !states) return null;
    const allVlans = new Set<number>();
    let totalRoutes = 0, connectedRoutes = 0, staticRoutes = 0, dynamicRoutes = 0;
    let ospfCount = 0, ospfNeighbors = 0;
    let stpRootCount = 0, stpBlockedPorts = 0;
    let hsrpActive = 0, hsrpStandby = 0;
    let eigrpCount = 0, eigrpNeighbors = 0;
    states.forEach((state, deviceId) => {
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

      // OSPF
      if (state.ospfAreas && state.ospfAreas.length > 0) {
        ospfCount++;
        const neighbors = state.ospfNeighbors || [];
        ospfNeighbors += neighbors.length;
      }

      // STP
      Object.values(state.ports).forEach(port => {
        if (port.spanningTree?.state === 'blocking' || port.spanningTree?.role === 'alternate') {
          stpBlockedPorts++;
        }
      });
      const hasRootPort = Object.values(state.ports).some(p => p.spanningTree?.role === 'root');
      const isSwitch = devices.find(d => d.id === deviceId)?.type.startsWith('switch');
      if (isSwitch && !hasRootPort && Object.values(state.ports).some(p => p.spanningTree)) {
        stpRootCount++;
      }

      // HSRP
      Object.values(state.ports).forEach(port => {
        if (port.hsrp?.groups) {
          Object.values(port.hsrp.groups).forEach(group => {
            if (group.state === 'Active') hsrpActive++;
            if (group.state === 'Standby') hsrpStandby++;
          });
        }
      });

      // EIGRP
      if (state.eigrpAs) {
        eigrpCount++;
        eigrpNeighbors += (state.eigrpNeighbors || []).length;
      }
    });
    return {
      deviceCount: {
        total: devices.length,
        routers: devices.filter((d) => d.type === 'router').length,
        switches: devices.filter((d) => d.type === 'switchL2' || d.type === 'switchL3').length,
        pcs: devices.filter((d) => d.type === 'pc').length,
        iot: devices.filter((d) => d.type === 'iot').length,
        firewalls: devices.filter((d) => d.type === 'firewall').length,
        wlcs: devices.filter((d) => d.type === 'wlc').length,
      },
      activeLinks: topologyConnections.filter((c) => c.active).length,
      vlanCount: allVlans.size,
      routingTableSummary: { totalRoutes, connected: connectedRoutes, static: staticRoutes, dynamic: dynamicRoutes },
      protocolStats: {
        ospf: { count: ospfCount, neighbors: ospfNeighbors },
        stp: { roots: stpRootCount, blocked: stpBlockedPorts },
        hsrp: { active: hsrpActive, standby: hsrpStandby },
        eigrp: { count: eigrpCount, neighbors: eigrpNeighbors }
      },
    };
  }, [topologyDevices, topologyConnections, deviceStates]);

  // Function to update device configuration
  const updateDeviceConfig = useCallback((deviceId: string, config: Record<string, unknown>) => {
    const c = config as Partial<CanvasDevice>;
    // Update topology devices using functional update to avoid stale closure
    setTopologyDevices(prev =>
      prev.map((d) =>
        d.id === deviceId
          ? {
            ...d,
            ...c,
            iot: c.iot ? { ...d.iot, ...c.iot } : d.iot,
          }
          : d
      )
    );

    // Update deviceStates (CLI hostname)
    if (c.name) {
      setDeviceStates((prev) => {
        const state = prev.get(deviceId);
        if (state) {
          const next = new Map(prev);
          next.set(deviceId, { ...state, hostname: c.name as string });
          return next;
        }
        return prev;
      });
    }

    // Keep router/switch wlan0 runtime state in sync with web-admin WiFi saves
    if (c.wifi) {
      setDeviceStates((prev) => {
        const state = prev.get(deviceId);
        if (!state || !state.ports?.['wlan0']) return prev;
        const wifi = c.wifi as NonNullable<CanvasDevice['wifi']>;
        const next = new Map(prev);
        next.set(deviceId, {
          ...state,
          ports: {
            ...state.ports,
            wlan0: {
              ...state.ports['wlan0'],
              shutdown: !wifi.enabled,
              wifi: {
                ssid: wifi.ssid || '',
                security: wifi.security || 'open',
                password: wifi.password || '',
                channel: wifi.channel || '2.4GHz',
                // Keep selected mode even when disabled; shutdown controls operational state.
                mode: wifi.mode || 'ap',
              },
            },
          },
        });
        return next;
      });
    }

    // Handle IoT device disconnect - clear IP and WiFi state
    if (c.ip === '' && c.wifi?.enabled === false) {
      setDeviceStates((prev) => {
        const state = prev.get(deviceId);
        if (!state) return prev;
        const next = new Map(prev);
        next.set(deviceId, {
          ...state,
          ports: {
            ...state.ports,
            wlan0: {
              ...state.ports?.['wlan0'],
              shutdown: true,
              wifi: {
                ssid: '',
                security: 'open',
                password: '',
                channel: '2.4GHz',
                mode: 'client',
              },
            },
          },
        });
        return next;
      });
    }

    if (c.firewallRules) {
      setDeviceStates((prev) => {
        const state = prev.get(deviceId);
        if (!state) return prev;
        const updatedState = {
          ...state,
          firewallRules: c.firewallRules as FirewallRule[],
        };
        updatedState.runningConfig = buildRunningConfig(updatedState);
        const next = new Map(prev);
        next.set(deviceId, updatedState);
        return next;
      });
    }

    // Sync NTP services from topology to deviceStates (Switch/Router)
    if (c.services?.ntp) {
      setDeviceStates((prev) => {
        const state = prev.get(deviceId);
        if (!state) return prev;
        const ntpServer = (c.services as CanvasDevice['services'])?.ntp?.server;
        // Update ntpServers array so buildStartupConfig / applyStartupConfig
        // can restore the NTP server after a page refresh
        let ntpServers = state.ntpServers ? [...state.ntpServers] : [];
        if (ntpServer && !ntpServers.includes(ntpServer)) {
          ntpServers = [ntpServer];
        } else if (ntpServer) {
          ntpServers = [ntpServer]; // keep only the latest server
        }
        const updatedState = {
          ...state,
          ntpServers,
          services: {
            ...state.services,
            ntp: {
              ...state.services?.ntp,
              ...(c.services as CanvasDevice['services'])?.ntp,
              enabled: (c.services as CanvasDevice['services'])?.ntp?.enabled ?? state.services?.ntp?.enabled ?? false,
            },
          },
        };
        updatedState.runningConfig = buildRunningConfig(updatedState);
        const next = new Map(prev);
        next.set(deviceId, updatedState);
        return next;
      });
    }
  }, [setTopologyDevices, setDeviceStates]);

  // Listen for device config updates from PCPanel
  useEffect(() => {
    const handleDeviceUpdate = (event: CustomEvent<{ deviceId: string; config: Record<string, unknown> }>) => {
      const { deviceId, config } = event.detail;
      updateDeviceConfig(deviceId, config);
    };

    window.addEventListener('update-topology-device-config', handleDeviceUpdate as EventListener);
    return () => window.removeEventListener('update-topology-device-config', handleDeviceUpdate as EventListener);
  }, [updateDeviceConfig]);

  useEffect(() => {
    const handleTriggerOpenFirewall = () => {
      // Find the first firewall in the topology
      const firewall = topologyDevices.find(d => d.type === 'firewall');
      if (firewall) {
        setActiveFirewallId(firewall.id);
        setShowFirewallPanel(true);
      } else {
        toast({
          title: t.language === 'tr' ? 'Firewall bulunamadı' : 'Firewall not found',
          description: t.language === 'tr' ? 'Topolojide yapılandırılmış bir firewall bulunmuyor.' : 'No firewall configured in the topology.',
          variant: 'destructive'
        });
      }
    };

    window.addEventListener('trigger-open-firewall', handleTriggerOpenFirewall);
    return () => window.removeEventListener('trigger-open-firewall', handleTriggerOpenFirewall);
  }, [topologyDevices, t.language]);
  useEffect(() => {
    const handleAddDevice = (event: CustomEvent<{ device: CanvasDevice }>) => {
      const { device } = event.detail;
      if (!device) return;

      setTopologyDevices(prev => [...prev, device]);

      setFocusDeviceId(device.id);

      // Focus the newly added device
      if (activeTab === 'topology' && topologyContainerRef.current) {
        setZoom(1.0); // Reset zoom to 100%
        focusDeviceInTopology(device.id, 1.0, device);
        pendingFocusDeviceRef.current = null; // Clear pending focus as it's handled
      } else {
        // If not in topology tab or container not ready, queue the focus
        pendingFocusDeviceRef.current = device.id;
      }

      // Also add device state for IoT devices
      if (device.type === 'iot') {
        setDeviceStates(prev => {
          const next = new Map(prev);
          // Create initial IoT device state with minimal required fields
          const iotState: Record<string, unknown> = {
            hostname: device.name,
            macAddress: device.macAddress || '00-00-00-00-00-00',
            switchModel: 'WS-C2960-24TT-L',
            switchLayer: 'L2' as const,
            currentMode: 'user' as const,
            ports: {
              eth0: {
                id: 'eth0',
                label: 'Eth0',
                status: 'disconnected' as const,
                shutdown: false,
              },
              wlan0: {
                id: 'wlan0',
                label: 'Wlan0',
                status: 'connected' as const,
                shutdown: false,
                wifi: {
                  ssid: device.wifi?.ssid || '',
                  security: device.wifi?.security || 'open',
                  password: device.wifi?.password || '',
                  channel: device.wifi?.channel || '2.4GHz',
                  mode: 'client' as const,
                },
              },
            },
            vlans: {},
            security: {},
            runningConfig: [],
            commandHistory: [],
            historyIndex: -1,
            version: {
              nosVersion: '1.0',
              modelName: 'IoT Device',
              serialNumber: 'N/A',
              uptime: '0d 0h 0m',
            },
            macAddressTable: [],
          };
          next.set(device.id, iotState as unknown as SwitchState);
          return next;
        });
      }
    };

    window.addEventListener('add-topology-device', handleAddDevice as EventListener);
    return () => window.removeEventListener('add-topology-device', handleAddDevice as EventListener);
  }, []); // Actions from useAppStore are stable, and functional updates avoid stale data issues.

  // Listen for postMessage from WiFi admin panel to focus device in topology
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Validate origin to prevent cross-site scripting or data injection from malicious frames.
      // We allow window.location.origin for same-origin messages and 'null' for local srcdoc iframes.
      if (event.origin !== window.location.origin && event.origin !== 'null') {
        return;
      }

      if (event.data && event.data.type === 'router-admin-focus-device') {
        const deviceId = event.data.deviceId;
        if (deviceId) {
          setFocusDeviceId(deviceId);
          // Clear the focus after a short delay to allow re-focusing
          setTimeout(() => setFocusDeviceId(null), 500);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  const toggleDevicePower = useCallback((deviceId: string) => {
    setTopologyDevices((prev) => {
      const current = prev.find(d => d.id === deviceId);
      const nextStatus: 'online' | 'offline' = current?.status === 'offline' ? 'online' : 'offline';
      window.dispatchEvent(new CustomEvent('trigger-topology-toggle-power', {
        detail: {
          deviceId,
          nextStatus,
          deviceType: current?.type,
          switchModel: current?.switchModel
        }
      }));

      // Clear previous outputs/history so fresh boot output is visible
      setDeviceOutputs(prevOutputs => {
        const next = new Map(prevOutputs);
        next.set(deviceId, []);
        return next;
      });
      setPcOutputs(prevOutputs => {
        const next = new Map(prevOutputs);
        next.set(deviceId, []);
        return next;
      });
      setPcHistories(prevHistories => {
        const next = new Map(prevHistories);
        next.set(deviceId, []);
        return next;
      });

      const nextDevices = prev.map((d) => (d.id === deviceId ? { ...d, status: nextStatus } : d));
      const byId = new Map(nextDevices.map(d => [d.id, d] as const));

      setTopologyConnections((prevConnections) => {
        const nextConnections = prevConnections.map((c) => {
          if (c.sourceDeviceId !== deviceId && c.targetDeviceId !== deviceId) return c;
          if (nextStatus === 'offline') return { ...c, active: false };
          const peerId = c.sourceDeviceId === deviceId ? c.targetDeviceId : c.sourceDeviceId;
          const peer = byId.get(peerId);
          return { ...c, active: peer?.status !== 'offline' };
        });

        // Trigger STP recalculation when power status changes
        window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
          detail: { topologyDevices: nextDevices, topologyConnections: nextConnections }
        }));

        return nextConnections;
      });

      return nextDevices;
    });
  }, [setTopologyDevices, setTopologyConnections]);

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

  const { pushState, undo, redo, canUndo, canRedo, resetHistory, currentState, historyItems, historyIndex, jumpTo } = useHistory(getCurrentState());

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
    isApplyingHistoryRef.current = false;
    pendingHistoryActionRef.current = null;
  }, [currentState, applyProjectState]);

  // Track changes and push to history
  // We need to debouncing this or use a ref to track if we're in the middle of an undo/redo

  // Initialize lastPushedStateRef with initial state to avoid redundant first push
  useEffect(() => {
    const initialState = getCurrentState();
    lastPushedStateRef.current = JSON.stringify({
      t: initialState.topologyDevices,
      c: initialState.topologyConnections,
      n: initialState.topologyNotes,
      s: Array.from(initialState.deviceStates.entries()),
      o: Array.from(initialState.deviceOutputs.entries()),
      p: Array.from(initialState.pcOutputs.entries()),
      id: initialState.activeDeviceId,
      tab: initialState.activeTab
    });
  }, []); // Run once on mount

  useEffect(() => {
    if (isAppLoading) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const currentState = getCurrentState();
    const stateString = JSON.stringify({
      t: currentState.topologyDevices,
      c: currentState.topologyConnections,
      n: currentState.topologyNotes,
      s: Array.from(currentState.deviceStates.entries()),
      o: Array.from(currentState.deviceOutputs.entries()),
      p: Array.from(currentState.pcOutputs.entries()),
      id: currentState.activeDeviceId,
      tab: currentState.activeTab
    });

    if (stateString !== lastPushedStateRef.current) {
      if (isApplyingHistoryRef.current) {
        lastPushedStateRef.current = stateString;
        isApplyingHistoryRef.current = false;
      } else if (pendingActionDesc.current) {
        // Only push history if there is an explicit pending action
        const desc = pendingActionDesc.current;
        pendingActionDesc.current = null;
        
        // Small timeout ensures all React batch updates are captured in getCurrentState()
        timer = setTimeout(() => {
          pushState(currentState, activeTab === 'topology' ? 'topology' : 'ui', desc);
          lastPushedStateRef.current = stateString;
        }, 50);
      } else {
        // Just update the ref without pushing to history (removes noise)
        lastPushedStateRef.current = stateString;
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
  const loadProjectData = useCallback((projectData: unknown, options?: { keepActiveDevice?: boolean }) => {
    try {
      // Clear packet capture and simulation states
      useAppStore.setState(state => ({
        topology: {
          ...state.topology,
          capturedPackets: {},
          activeCaptureConnectionId: null,
          isSimulationMode: false
        }
      }));

      const shouldKeepActiveDevice = options?.keepActiveDevice === true;
      const data = (projectData && typeof projectData === 'object') ? projectData as Record<string, unknown> : {};
      const topology = (data.topology && typeof data.topology === 'object') ? data.topology as Record<string, unknown> : {};
      const safeDevices = Array.isArray(data.devices) ? data.devices : [];
      const safeDeviceOutputs = Array.isArray(data.deviceOutputs) ? data.deviceOutputs : [];
      const safePcOutputs = Array.isArray(data.pcOutputs) ? data.pcOutputs : [];
      const safePcHistories = Array.isArray(data.pcHistories) ? data.pcHistories : [];
      const safeTopologyDevices = Array.isArray(topology.devices) ? topology.devices : [];
      const safeTopologyConnections = Array.isArray(topology.connections) ? topology.connections : [];
      const safeTopologyNotes = Array.isArray(topology.notes) ? topology.notes : [];
      const safeCableInfo = (data.cableInfo && typeof data.cableInfo === 'object') ? data.cableInfo as Record<string, unknown> : null;
      const safePan = (data.pan && typeof data.pan === 'object') ? data.pan as Record<string, unknown> : null;
      const safeTopologyPan = (topology.pan && typeof topology.pan === 'object') ? topology.pan as Record<string, unknown> : null;
      const resolvedActiveTab = data.activeTab === 'cmd' || data.activeTab === 'terminal' || data.activeTab === 'tasks' || data.activeTab === 'topology'
        ? data.activeTab
        : 'topology';
      const normalizeCableType = (value: unknown): 'straight' | 'crossover' | 'console' | 'wireless' => {
        if (value === 'straight' || value === 'crossover' || value === 'console' || value === 'wireless') return value;
        if (value === 'cross') return 'crossover';
        if (value === 'rollover') return 'console';
        if (value === 'fiber') return 'wireless';
        return 'straight';
      };

      // Load device states
      if (safeDevices.length > 0) {
        const newDeviceStates = new Map<string, SwitchState>();
        safeDevices.forEach((item: { id: string; state: SwitchState }) => {
          // Skip devices with empty/invalid IDs
          if (item.id && item.id.trim() !== '') {
            newDeviceStates.set(item.id, item.state);
          }
        });
        setDeviceStates(newDeviceStates);
      }

      // Load device outputs
      if (safeDeviceOutputs.length > 0) {
        const newDeviceOutputs = new Map<string, TerminalOutput[]>();
        safeDeviceOutputs.forEach((item: { id: string; outputs: TerminalOutput[] }) => {
          let outputs = item.outputs || [];

          // If banner is in state but not in outputs, prepend it (only for switches/routers)
          const stateItem = safeDevices.find((d: { id: string; state?: SwitchState }) => d.id === item.id);
          if (stateItem?.state?.bannerMOTD && !outputs.some(o => o.content?.includes(stateItem.state.bannerMOTD))) {
            outputs = [
              {
                id: 'banner-load-static',
                type: 'output',
                content: stateItem.state.bannerMOTD + '\n'
              },
              ...outputs
            ];
          }

          newDeviceOutputs.set(item.id, outputs);
        });
        setDeviceOutputs(newDeviceOutputs);
      } else if (safeDevices.length > 0) {
        // If no device outputs provided, generate boot messages for all devices
        const newDeviceOutputs = new Map<string, TerminalOutput[]>();
        safeDevices.forEach((item: { id: string; state: SwitchState }) => {
          const deviceId = item.id;
          const state = item.state;
          const isRouter = deviceId.includes('router');
          const isL3Switch = state?.switchLayer === 'L3' || state?.switchModel?.includes('3650');
          const isPC = deviceId.includes('pc-');
          const isIoT = deviceId.includes('iot-');

          // Skip boot message generation for PC and IoT devices
          if (isPC || isIoT) {
            return;
          }

          // Generate boot messages based on device type
          let bootMessages: TerminalOutput[] = [];
          const suffix = state?.macAddress || deviceId;

          if (isRouter) {
            const syslog = t.syslogStarted;
            bootMessages = [
              {
                id: `boot-1-${suffix}`, type: 'output', content: `

System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
` },
              {
                id: `boot-2-${suffix}`, type: 'output', content: `ISR4451/K9 platform with 4096 K bytes of memory

${syslog}
Load/bootstrap symbols loaded, GOXR initialization
Reading all bootflash vectors
POST: CPU PCIe port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system
` },
              {
                id: `boot-3-${suffix}`, type: 'output', content: `
Booting flash:c1900-universalk9-mz.SPA.154-3.M.bin...OK!
Extracting files from flash:c1900-universalk9-mz.SPA.154-3.M.bin...
  ########## [OK]
  0 bytes remaining in flash device
` },
              ...(state?.bannerMOTD ? [{
                id: `banner-${suffix}`, type: 'output' as const, content: `
${state.bannerMOTD}
` }] : []),
              { id: `boot-ready-${suffix}`, type: 'output', content: BOOT_PROGRESS_MARKER }
            ];
          } else if (isL3Switch) {
            const syslog = t.syslogStarted;
            bootMessages = [
              {
                id: `boot-1-${suffix}`, type: 'output', content: `

System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
` },
              {
                id: `boot-2-${suffix}`, type: 'output', content: `C3650 platform with 131072 K bytes of memory

${syslog}
Load/bootstrap symbols loaded
Reading all bootflash vectors
POST: CPU PCIe port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system
` },
              {
                id: `boot-3-${suffix}`, type: 'output', content: `
Booting flash:C3650-ipbase-mz.152-2.SE4.bin...OK!
Extracting files from flash:C3650-ipbase-mz.152-2.SE4.bin...
  ########## [OK]
  0 bytes remaining in flash device
` },
              ...(state?.bannerMOTD ? [{
                id: `banner-${suffix}`, type: 'output' as const, content: `
${state.bannerMOTD}
` }] : []),
              { id: `boot-ready-${suffix}`, type: 'output', content: BOOT_PROGRESS_MARKER }
            ];
          } else {
            const syslog = t.syslogStarted;
            bootMessages = [
              {
                id: `boot-1-${suffix}`, type: 'output', content: `

System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
` },
              {
                id: `boot-2-${suffix}`, type: 'output', content: `C2960 platform with 65536 K bytes of memory

${syslog}
Load/bootstrap symbols loaded
Reading all bootflash vectors
POST: CPU Ethernet port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system
` },
              {
                id: `boot-3-${suffix}`, type: 'output', content: `
Booting flash:c2960-lanbase-mz.152-2.E6.bin...OK!
Extracting files from flash:c2960-lanbase-mz.152-2.E6.bin...
  ########## [OK]
  0 bytes remaining in flash device
` },
              ...(state?.bannerMOTD ? [{
                id: `banner-${suffix}`, type: 'output' as const, content: `
${state.bannerMOTD}
` }] : []),
              { id: `boot-ready-${suffix}`, type: 'output', content: BOOT_PROGRESS_MARKER }
            ];
          }

          newDeviceOutputs.set(deviceId, bootMessages);
        });
        setDeviceOutputs(newDeviceOutputs);
      }

      // Load PC outputs
      if (safePcOutputs.length > 0) {
        const newPcOutputs = new Map<string, PCOutputLine[]>();
        safePcOutputs.forEach((item: { id: string; outputs: PCOutputLine[] }) => {
          newPcOutputs.set(item.id, item.outputs || []);
        });
        setPcOutputs(newPcOutputs);
      }

      // Load PC histories
      if (safePcHistories.length > 0) {
        const newPcHistories = new Map<string, string[]>();
        safePcHistories.forEach((item: { id: string; history: string[] }) => {
          newPcHistories.set(item.id, item.history || []);
        });
        setPcHistories(newPcHistories);
      } else {
        // Clear PC histories if none provided
        setPcHistories(new Map());
      }

      const resolveNoteOverlap = (notes: CanvasNote[], devices: CanvasDevice[]): CanvasNote[] => {
        const deviceBoxes = devices.map((d) => ({ x: d.x - 50, y: d.y - 35, w: 100, h: 70 }));
        const placed: CanvasNote[] = [];
        const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
          a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

        for (const note of notes) {
          const w = Math.max(160, Number(note.width) || 260);
          const h = Math.max(80, Number(note.height) || 120);
          let x = Number(note.x) || 0;
          let y = Number(note.y) || 0;
          let tries = 0;

          while (tries < 80) {
            const box = { x, y, w, h };
            const collidesDevice = deviceBoxes.some((d) => overlaps(box, d));
            const collidesNote = placed.some((n) => overlaps(box, { x: n.x, y: n.y, w: Math.max(160, Number(n.width) || 260), h: Math.max(80, Number(n.height) || 120) }));
            if (!collidesDevice && !collidesNote) break;
            x += 36;
            if (x > 1200) {
              x = 40;
              y += 28;
            }
            tries += 1;
          }

          placed.push({ ...note, x, y });
        }

        return placed;
      };

      // Load topology
      if (safeTopologyDevices.length > 0 || safeTopologyConnections.length > 0 || safeTopologyNotes.length > 0) {
        // Filter out devices with empty/invalid IDs
        const validDevices = safeTopologyDevices.filter(
          (device: CanvasDevice) => device.id && device.id.trim() !== ''
        );
        const normalizedDevices = applyLinkLocalToUnconfiguredHosts(validDevices.map((device: CanvasDevice) => ({
          ...device,
          type: normalizeDeviceType(device.type),
        })));
        setTopologyDevices(normalizedDevices);
        setTopologyConnections(safeTopologyConnections);
        setTopologyNotes(resolveNoteOverlap(safeTopologyNotes, normalizedDevices));
        if (typeof topology.zoom === 'number') setZoom(topology.zoom);
        if (safeTopologyPan && typeof safeTopologyPan.x === 'number' && typeof safeTopologyPan.y === 'number') setPan({ x: safeTopologyPan.x, y: safeTopologyPan.y });
      } else {
        // Empty project fallback
        setTopologyDevices([]);
        setTopologyConnections([]);
        setTopologyNotes([]);
        setZoom(typeof data.zoom === 'number' ? data.zoom : 1.0);
        setPan(safePan && typeof safePan.x === 'number' && typeof safePan.y === 'number' ? { x: safePan.x, y: safePan.y } : { x: 0, y: 0 });
      }

      // Sync STP state from deviceStates to topologyDevices ports
      if (safeDevices.length > 0 && safeTopologyDevices.length > 0) {
        const newDeviceStates = new Map<string, SwitchState>();
        safeDevices.forEach((item: { id: string; state: SwitchState }) => {
          if (item.id && item.id.trim() !== '') {
            newDeviceStates.set(item.id, item.state);
          }
        });

        const validDevices = safeTopologyDevices.filter(
          (device: CanvasDevice) => device.id && device.id.trim() !== ''
        );
        const normalizedDevices = applyLinkLocalToUnconfiguredHosts(validDevices.map((device: CanvasDevice) => ({
          ...device,
          type: normalizeDeviceType(device.type),
        })));


        // Update ports with spanningTree state from deviceStates
        const stpSyncedDevices = normalizedDevices.map((device) => {
          const deviceState = newDeviceStates.get(device.id);
          if (!deviceState || !deviceState.ports) return device;

          // Update ports with spanningTree state from deviceState
          const updatedPorts = device.ports.map((port) => {
            const statePort = deviceState.ports[port.id];
            if (statePort && statePort.spanningTree) {
              return {
                ...port,
                spanningTree: statePort.spanningTree
              };
            }
            return port;
          });

          return {
            ...device,
            ports: updatedPorts
          };
        });

        setTopologyDevices(stpSyncedDevices);
      }

      // Load cable info
      if (safeCableInfo) {
        setCableInfo({
          connected: typeof safeCableInfo.connected === 'boolean' ? safeCableInfo.connected : false,
          cableType: normalizeCableType(safeCableInfo.cableType),
          sourceDevice: normalizeDeviceType(typeof safeCableInfo.sourceDevice === 'string' ? safeCableInfo.sourceDevice : 'pc'),
          targetDevice: normalizeDeviceType(typeof safeCableInfo.targetDevice === 'string' ? safeCableInfo.targetDevice : 'switchL2'),
        });
      } else {
        setCableInfo({ connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' });
      }

      // Load active device. User-initiated project/file opens should start with info panels closed.
      if (shouldKeepActiveDevice && typeof data.activeDeviceId === 'string' && data.activeDeviceId.trim() !== '') {
        setActiveDeviceId(data.activeDeviceId);
      } else {
        setActiveDeviceId('');
        setSelectedDevice(null);
      }
      setActiveDeviceType(normalizeDeviceType(typeof data.activeDeviceType === 'string' ? data.activeDeviceType : 'switchL2'));

      // Load active tab
      setActiveTab(resolvedActiveTab);

      // Restore exam state if present (for teacher mode editing)
      if (data.examData && typeof data.examData === 'object') {
        const exam = data.examData as { id: string; title: string | { tr: string; en: string }; tasks: unknown[]; durationMinutes: number; difficulty: string; isCustom: boolean };
        startExamProject(({
          ...exam,
          isExam: true,
          data: projectData,
          tag: 'EDIT',
          description: { tr: 'Düzenleniyor...', en: 'Editing...' }
        }) as unknown as ExamProject);
      }

      // Close all overlay panels when loading a project
      setShowPCPanel(false);
      setShowRouterPanel(false);
      setShowUnifiedDeviceModal(false);
      setRefreshNetworkReport(null);

      // Close packet analysis popup explicitly
      window.dispatchEvent(new CustomEvent('network-refresh'));

      // Increment topology key to force remount
      setTopologyKey(prev => prev + 1);
      setHasUnsavedChanges(false);

      // Reset history with the loaded state
      resetHistory({
        topologyDevices: applyLinkLocalToUnconfiguredHosts(
          (safeTopologyDevices || [])
            .filter((device: CanvasDevice) => device.id && device.id.trim() !== '')
            .map((device: CanvasDevice) => ({
              ...device,
              type: normalizeDeviceType(device.type),
            }))
        ),
        topologyConnections: safeTopologyConnections,
        topologyNotes: safeTopologyNotes,
        deviceStates: new Map(
          safeDevices
            ?.filter((item: { id?: string; state?: SwitchState }) => !!item.id && item.id.trim() !== '')
            ?.map((item: { id: string; state: SwitchState }) => [item.id, item.state]) || []
        ),
        deviceOutputs: new Map(safeDeviceOutputs.map((item: { id: string; outputs: TerminalOutput[] }) => [item.id, item.outputs])),
        pcOutputs: new Map(safePcOutputs.map((item: { id: string; outputs: PCOutputLine[] }) => [item.id, item.outputs])),
        pcHistories: new Map(safePcHistories.map((item: { id: string; history: string[] }) => [item.id, item.history])),
        cableInfo: safeCableInfo
          ? {
            connected: typeof safeCableInfo.connected === 'boolean' ? safeCableInfo.connected : false,
            cableType: normalizeCableType(safeCableInfo.cableType),
            sourceDevice: normalizeDeviceType(typeof safeCableInfo.sourceDevice === 'string' ? safeCableInfo.sourceDevice : 'pc'),
            targetDevice: normalizeDeviceType(typeof safeCableInfo.targetDevice === 'string' ? safeCableInfo.targetDevice : 'switchL2'),
          }
          : { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: shouldKeepActiveDevice ? (typeof data.activeDeviceId === 'string' ? data.activeDeviceId : 'switch-1') : '',
        activeDeviceType: normalizeDeviceType(typeof data.activeDeviceType === 'string' ? data.activeDeviceType : 'switchL2'),
        zoom: typeof data.zoom === 'number' ? data.zoom : 1.0,
        pan: safePan && typeof safePan.x === 'number' && typeof safePan.y === 'number' ? { x: safePan.x, y: safePan.y } : { x: 0, y: 0 },
        activeTab: resolvedActiveTab
      });

      return true;
    } catch (error) {
      errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'loadProjectData', error: String(error) }));
      // Clear corrupted autosave data to prevent repeated failures
      try { localStorage.removeItem('netsim_autosave'); } catch { /* ignore */ }
      toast({
        variant: 'destructive',
        title: t.invalidProject,
        description: t.corruptedProject,
      });
      return false;
    }
  }, [setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories, setTopologyDevices, setTopologyConnections, setTopologyNotes, setCableInfo, setActiveDeviceId, setActiveDeviceType, setSelectedDevice, setActiveTab, setTopologyKey, setHasUnsavedChanges, resetHistory, toast, setZoom, setPan, language, normalizeDeviceType, applyLinkLocalToUnconfiguredHosts, setShowPCPanel, setShowRouterPanel, setShowUnifiedDeviceModal, setRefreshNetworkReport]);

  // Persistence: Load from URL ID or localStorage on mount
  useEffect(() => {
    if (initialProjectId) {
      // 1. Try example projects (dynamic import — not in initial bundle)
      import('@/lib/network/exampleProjects').then(({ exampleProjects }) => {
        const examples = exampleProjects(language);
        const example = examples.find(p => p.id === initialProjectId);
        if (example) {
          applyExampleProject(example.data, example.id);
          return;
        }
      });

      // 2. Try guided projects (Lessons)
      const lessons = getGuidedProjects(language);
      const lesson = lessons.find(p => p.id === initialProjectId);
      if (lesson) {
        handleStartGuidedProject(lesson);
        // Note: applyExampleProject or startGuidedProject handles topology loading
        return;
      }

      // 3. Try exams
      const exams = getExamProjects(language);
      const exam = exams.find(p => p.id === initialProjectId);
      if (exam) {
        startExamFromCatalog(exam);
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

  // Auto-renew DHCP for devices with link-local IPs (169.254.x.x) or 0.0.0.0 on page load
  const dhcpRenewalDoneRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (dhcpRenewalDoneRef.current) return;
    if (!topologyDevices || topologyDevices.length === 0 || !deviceStates) return;
    if (!isInitialLoadRef.current) return; // Only run on initial load

    // Find all PC devices with DHCP mode and no valid IP (0.0.0.0 or 169.254.x.x)
    const devicesNeedingDhcpRenewal = topologyDevices.filter(
      (device) =>
        device.type === 'pc' &&
        device.ipConfigMode === 'dhcp' &&
        (!device.ip || device.ip === '0.0.0.0' || device.ip.startsWith('169.254.'))
    );

    if (devicesNeedingDhcpRenewal.length === 0) {
      dhcpRenewalDoneRef.current = true;
      isInitialLoadRef.current = false;
      return;
    }

    // Update devices with DHCP IPs - process sequentially to avoid duplicate IPs
    const updatedDevices = [...topologyDevices];
    let hasChanges = false;

    devicesNeedingDhcpRenewal.forEach(deviceToRenew => {
      const lease = assignDhcpLeaseForPc(deviceToRenew, updatedDevices) || buildLinkLocalLease(deviceToRenew, updatedDevices);
      if (lease) {
        const idx = updatedDevices.findIndex(d => d.id === deviceToRenew.id);
        if (idx !== -1) {
          updatedDevices[idx] = {
            ...updatedDevices[idx],
            ip: lease.ip,
            subnet: lease.subnet,
            gateway: lease.gateway,
            dns: lease.dns
          };
          hasChanges = true;

          // Also update PC terminal output if it exists
          const pcOut = pcOutputs.get(deviceToRenew.id);
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
            setPcOutputs(prev => new Map(prev).set(deviceToRenew.id, updatedOut as unknown as PCOutputLine[]));
          }
        }
      }
    });

    if (hasChanges) {
      setTopologyDevices(updatedDevices);
    }

    dhcpRenewalDoneRef.current = true;
    isInitialLoadRef.current = false;
  }, [assignDhcpLeaseForPc, buildLinkLocalLease, topologyDevices, deviceStates, setTopologyDevices]);

  // Sequential DHCP toasts for "Router DHCP" example
  useEffect(() => {
    if (loadedExampleId === 'router-dhcp-2pc' && topologyDevices.length > 0 && deviceStates.size > 0) {
      const pcDevices = topologyDevices.filter(d => d.type === 'pc' && d.ipConfigMode === 'dhcp');

      if (pcDevices.length > 0) {
        (async () => {
          // Process all PCs and show a single combined toast
          const currentTopology = [...topologyDevices];
          let hasOverallChanges = false;
          const assignments: Array<{ name: string, ip: string }> = [];

          for (let i = 0; i < pcDevices.length; i++) {
            const pc = pcDevices[i];
            const lease = assignDhcpLeaseForPc(pc, currentTopology) || buildLinkLocalLease(pc, currentTopology);

            if (lease) {
              const { ip: newIp, subnet, gateway, dns } = lease as { ip: string; subnet: string; gateway: string; dns: string };
              if (!newIp.startsWith('169.254.')) {
                assignments.push({ name: pc.name || pc.id, ip: newIp });
              }

              // Update device in the working list
              const idx = currentTopology.findIndex(d => d.id === pc.id);
              if (idx !== -1) {
                currentTopology[idx] = {
                  ...currentTopology[idx],
                  ip: newIp,
                  subnet,
                  gateway,
                  dns
                };
                hasOverallChanges = true;

                // Also update PC terminal output if it exists
                const pcOut = pcOutputs.get(pc.id);
                if (pcOut) {
                  const updatedOut = pcOut.map(line => {
                    if (line.id === '1' || line.content?.includes('IPv4 Address')) {
                      return {
                        ...line,
                        content: `\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ${newIp}\n   Subnet Mask . . . . . . . . . . : ${subnet}\n   Default Gateway . . . . . . . . . : ${gateway}\n`
                      };
                    }
                    return line;
                  });
                  setPcOutputs(prev => new Map(prev).set(pc.id, updatedOut as unknown as PCOutputLine[]));
                }
              }
            }
          }

          if (assignments.length > 0) {
            toast({
              title: `📝 ${t.dhcpAssignments}`,
              description: (
                <div className="flex flex-col gap-1 text-xs">
                  {assignments.map((asgn, i) => (
                    <div key={i} className="flex justify-between gap-4">
                      <span className="font-medium">{asgn.name}:</span>
                      <span className="text-primary-400">{asgn.ip}</span>
                    </div>
                  ))}
                </div>
              ),
              duration: 5000,
            });

            // Show refresh panel after a delay
            setTimeout(() => {
              handleRefreshNetwork();
            }, 1000);
          }

          if (hasOverallChanges) {
            setTopologyDevices(currentTopology);
          }
          setLoadedExampleId(null); // Reset after processing
        })();
      } else {
        setTimeout(() => setLoadedExampleId(null), 0);
      }
    }
  }, [assignDhcpLeaseForPc, buildLinkLocalLease, loadedExampleId, topologyDevices, deviceStates, toast, language, setTopologyDevices]);

  // Onboarding: show once per browser
  useEffect(() => {
    try {
      const seen = localStorage.getItem('netsim_onboarding_seen');
      if (!seen) {
        setShowOnboarding(true);
        setOnboardingStep(0);
      }
    } catch (err) {
      errorHandler.logError(STORAGE_ERRORS.LOCAL_STORAGE_UNAVAILABLE({ operation: 'getOnboardingStatus', error: String(err) }));
    }
  }, []);

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
    ) as { exitSession?: boolean };

    setLastCommand(command);
    if (result && typeof result === 'object' && 'output' in result) {
      setLastOutput(String(result.output));
    }

    if (command && command.trim() !== '') {
      const deviceName = topologyDevices?.find(d => d.id === activeDeviceId)?.name || activeDeviceId;
      commitAction(`${deviceName} CLI: ${command}`);
    }

    if (result?.exitSession) {
      setActiveTab('topology');
    }
    return result;
  }, [activeDeviceId, handleCommandForDevice, topologyDevices, topologyConnections, setActiveDeviceId, setActiveDeviceType, setActiveTab, setLastCommand, commitAction]);

  const prompt = getPrompt(state);

  const handleExecuteCommand = useCallback(async (deviceId: string, command: string) => {
    const result = await handleCommandForDevice(
      deviceId,
      command,
      topologyDevices,
      setActiveDeviceId,
      setActiveDeviceType,
      topologyConnections
    );

    setLastCommand(command);
    if (result && typeof result === 'object' && 'output' in result) {
      setLastOutput(String(result.output));
    }
    
    if (command && command.trim() !== '') {
      const deviceName = topologyDevices?.find(d => d.id === deviceId)?.name || deviceId;
      commitAction(`${deviceName} CLI: ${command}`);
    }

    return result;
  }, [handleCommandForDevice, topologyDevices, topologyConnections, setActiveDeviceId, setActiveDeviceType, setLastCommand, setLastOutput, commitAction]);


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
      setShowPCDeviceId(deviceId);
      getOrCreatePCOutputs(deviceId, topologyDevices);
      setPcPanelInitialTab('home');
      setShowPCPanel(true);
    } else if (device === 'firewall') {
      setActiveFirewallId(deviceId);
      setShowFirewallPanel(true);
    } else if (device === 'router' || device === 'switchL2' || device === 'switchL3') {
      // Switch or Router - set as CLI device and open CLI modal
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

  // Save project to JSON file
  const handleSaveProjectInternal = useCallback(() => {
    // Get PC and IoT device IDs to filter them out from deviceStates
    // These device types don't need full SwitchState with ports
    const excludedDeviceIds = new Set(
      topologyDevices.filter(d => d.type === 'pc' || d.type === 'iot').map(d => d.id)
    );

    // Move IoT device outputs from deviceOutputs to pcOutputs
    const iotDeviceIds = new Set(topologyDevices.filter(d => d.type === 'iot').map(d => d.id));
    const adjustedDeviceOutputs = new Map(deviceOutputs);
    const adjustedPcOutputs = new Map(pcOutputs);
    iotDeviceIds.forEach(iotId => {
      const iotOutput = deviceOutputs.get(iotId);
      if (iotOutput) {
        // Filter out password-prompt type which is not compatible with PCOutputLine
        const filteredOutput = iotOutput.filter(o => o.type !== 'password-prompt');
        adjustedPcOutputs.set(iotId, filteredOutput as unknown as PCOutputLine[]);
        adjustedDeviceOutputs.delete(iotId);
      }
    });

    // Optimization: Limit terminal outputs to last 100 lines to reduce file size
    const MAX_SAVED_OUTPUT_LINES = 100;
    const trimOutputs = <T,>(outputs: T[]): T[] => {
      if (outputs.length <= MAX_SAVED_OUTPUT_LINES) return outputs;
      return outputs.slice(-MAX_SAVED_OUTPUT_LINES);
    };

    // Synchronize MAC addresses and port statuses from topology devices to device states
    const syncedDeviceStates = new Map(deviceStates);
    const topologyDeviceIds = new Set(topologyDevices.map(d => d.id));
    topologyDevices.forEach(device => {
      const state = syncedDeviceStates.get(device.id);
      if (state) {
        // Synchronize MAC address
        if (device.macAddress && state.macAddress !== device.macAddress) {
          syncedDeviceStates.set(device.id, { ...state, macAddress: device.macAddress });
        }
        // Synchronize port MAC addresses and statuses
        const updatedPorts = { ...state.ports };
        let portsChanged = false;
        device.ports.forEach(topoPort => {
          const statePort = updatedPorts[topoPort.id];
          if (statePort) {
            // Synchronize port MAC address
            if (topoPort.macAddress && statePort.macAddress !== topoPort.macAddress) {
              updatedPorts[topoPort.id] = { ...statePort, macAddress: topoPort.macAddress };
              portsChanged = true;
            }
            // Synchronize WLAN0 port status specifically
            if (topoPort.id === 'wlan0') {
              const targetStatus = topoPort.shutdown ? 'notconnect' : (topoPort.status === 'connected' ? 'connected' : 'notconnect');
              if (statePort.status !== targetStatus) {
                updatedPorts[topoPort.id] = { ...updatedPorts[topoPort.id], status: targetStatus };
                portsChanged = true;
              }
            }
          }
        });
        if (portsChanged) {
          syncedDeviceStates.set(device.id, { ...state, ports: updatedPorts });
        }
      }
    });

    const projectData = {
      version: '1.1', // Incremented version
      timestamp: new Date().toISOString(),
      // Filter out PC/IoT device states - they don't need SwitchState with ports
      // Also filter out devices that don't exist in topology
      devices: Array.from(syncedDeviceStates.entries())
        .filter(([id]) => !excludedDeviceIds.has(id) && topologyDeviceIds.has(id))
        .map(([id, state]) => ({
          id,
          state: {
            ...state,
            // Optimization: Limit command history
            commandHistory: state.commandHistory.slice(-50),
            // Optimization: Remove temporary UI states if present
            awaitingPassword: undefined,
            passwordContext: undefined,
            awaitingReloadConfirm: undefined
          }
        })),
      // Filter out device outputs for devices that don't exist in topology
      deviceOutputs: Array.from(adjustedDeviceOutputs.entries())
        .filter(([id]) => id && id.trim() !== '' && topologyDeviceIds.has(id))
        .map(([id, outputs]) => ({ id, outputs: trimOutputs(outputs) })),
      pcOutputs: Array.from(adjustedPcOutputs.entries())
        .filter(([id]) => id && id.trim() !== '' && topologyDeviceIds.has(id))
        .map(([id, outputs]) => ({ id, outputs: trimOutputs(outputs) })),
      pcHistories: Array.from(pcHistories.entries())
        .filter(([id]) => id && id.trim() !== '')
        .map(([id, history]) => ({ id, history: history.slice(-50) })),
      topology: {
        // Filter out devices with empty/invalid IDs
        devices: topologyDevices.filter(d => d.id && d.id.trim() !== ''),
        connections: topologyConnections,
        notes: topologyNotes
      },
      cableInfo: topologyDevices.length > 0 && topologyConnections.length > 0 ? cableInfo : { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
      activeDeviceId: topologyDevices.find(d => d.id === activeDeviceId)?.id || '',
      activeDeviceType,
      // Exam metadata included if active (allows continuation of editing)
      ...(activeExam ? {
        examData: {
          id: activeExam.id,
          title: activeExam.title,
          tasks: activeExam.tasks,
          durationMinutes: activeExam.durationMinutes,
          difficulty: activeExam.difficulty,
          isCustom: activeExam.isCustom
        }
      } : {})
    };

    // Optimization: Use no indentation to reduce file size
    const blob = new Blob([safeStringify(projectData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseProjectName = projectName
      .replace(/\.json$/i, '')
      .replace(/-\d{4}-\d{2}-\d{2}$/i, '');
    const sanitizedName = baseProjectName.replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '-').substring(0, 60) || 'network-project';
    const savedFileName = `${sanitizedName}-${new Date().toISOString().slice(0, 10)}.json`;
    a.download = savedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setProjectName(savedFileName);
    setHasUnsavedChanges(false);
    setLastSaveTime(new Date().toLocaleTimeString());
    toast({
      title: t.projectSaved,
      description: t.jsonDownloaded,
    });
  }, [activeExam, deviceStates, deviceOutputs, pcOutputs, pcHistories, topologyDevices, topologyConnections, topologyNotes, cableInfo, activeDeviceId, activeDeviceType, setHasUnsavedChanges, setLastSaveTime, language, projectName, setProjectName]);

  // Handle Project Saving (Wrapper)
  function handleSaveProject() {
    handleSaveProjectInternal();
    addProjectRecord(projectName);
  }

  // Get full project data for exam export
  const getFullProjectData = useCallback(() => {
    // This is essentially the logic from handleSaveProjectInternal but returns data instead of downloading
    const excludedDeviceIds = new Set(
      topologyDevices.filter(d => d.type === 'pc' || d.type === 'iot').map(d => d.id)
    );
    const iotDeviceIds = new Set(topologyDevices.filter(d => d.type === 'iot').map(d => d.id));
    const adjustedDeviceOutputs = new Map(deviceOutputs);
    const adjustedPcOutputs = new Map(pcOutputs);
    iotDeviceIds.forEach(iotId => {
      const iotOutput = deviceOutputs.get(iotId);
      if (iotOutput) {
        const filteredOutput = iotOutput.filter(o => o.type !== 'password-prompt');
        adjustedPcOutputs.set(iotId, filteredOutput as unknown as PCOutputLine[]);
        adjustedDeviceOutputs.delete(iotId);
      }
    });

    const syncedDeviceStates = new Map(deviceStates);
    const topologyDeviceIds = new Set(topologyDevices.map(d => d.id));
    topologyDevices.forEach(device => {
      const state = syncedDeviceStates.get(device.id);
      if (state) {
        if (device.macAddress && state.macAddress !== device.macAddress) {
          syncedDeviceStates.set(device.id, { ...state, macAddress: device.macAddress });
        }
        const updatedPorts = { ...state.ports };
        let portsChanged = false;
        device.ports.forEach(topoPort => {
          const statePort = updatedPorts[topoPort.id];
          if (statePort) {
            if (topoPort.macAddress && statePort.macAddress !== topoPort.macAddress) {
              updatedPorts[topoPort.id] = { ...statePort, macAddress: topoPort.macAddress };
              portsChanged = true;
            }
          }
        });
        if (portsChanged) {
          syncedDeviceStates.set(device.id, { ...state, ports: updatedPorts });
        }
      }
    });

    return {
      version: '1.1',
      timestamp: new Date().toISOString(),
      devices: Array.from(syncedDeviceStates.entries())
        .filter(([id]) => !excludedDeviceIds.has(id) && topologyDeviceIds.has(id))
        .map(([id, state]) => ({
          id,
          state: { ...state, commandHistory: state.commandHistory.slice(-50) }
        })),
      deviceOutputs: Array.from(adjustedDeviceOutputs.entries())
        .filter(([id]) => id && id.trim() !== '' && topologyDeviceIds.has(id))
        .map(([id, outputs]) => ({ id, outputs: outputs.slice(-100) })),
      pcOutputs: Array.from(adjustedPcOutputs.entries())
        .filter(([id]) => id && id.trim() !== '' && topologyDeviceIds.has(id))
        .map(([id, outputs]) => ({ id, outputs: outputs.slice(-100) })),
      pcHistories: Array.from(pcHistories.entries())
        .filter(([id]) => id && id.trim() !== '')
        .map(([id, history]) => ({ id, history: history.slice(-50) })),
      topology: {
        devices: topologyDevices.filter(d => d.id && d.id.trim() !== ''),
        connections: topologyConnections,
        notes: topologyNotes
      },
      cableInfo: topologyDevices.length > 0 && topologyConnections.length > 0 ? cableInfo : { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
      activeDeviceId: topologyDevices.find(d => d.id === activeDeviceId)?.id || '',
      activeDeviceType,
      // Exam metadata included if active (allows continuation of editing)
      ...(activeExam ? {
        examData: {
          id: activeExam.id,
          title: activeExam.title,
          tasks: activeExam.tasks,
          durationMinutes: activeExam.durationMinutes,
          difficulty: activeExam.difficulty,
          isCustom: activeExam.isCustom
        }
      } : {})
    };
  }, [activeExam, deviceStates, deviceOutputs, pcOutputs, pcHistories, topologyDevices, topologyConnections, topologyNotes, cableInfo, activeDeviceId, activeDeviceType]);

  // New project - reset everything
  const resetToEmptyProject = useCallback(() => {
    // Clear packet capture and simulation states (trigger recompile)
    useAppStore.setState(state => ({
      topology: {
        ...state.topology,
        capturedPackets: {},
        activeCaptureConnectionId: null,
        isSimulationMode: false
      }
    }));
    const usedIps = new Set<string>();
    const pc1LinkLocal = generateRandomLinkLocalIpv4(usedIps);
    usedIps.add(pc1LinkLocal);
    const pc2LinkLocal = generateRandomLinkLocalIpv4(usedIps);
    usedIps.add(pc2LinkLocal);

    // Clear all states and set defaults
    setDeviceStates(new Map());
    setDeviceOutputs(new Map());
    setPcOutputs(new Map());
    setPcHistories(new Map());
    setTopologyDevices([
      {
        id: 'pc-1',
        type: 'pc',
        name: 'PC-1',
        x: 50,
        y: 50,
        ip: pc1LinkLocal,
        subnet: '255.255.0.0',
        gateway: '0.0.0.0',
        dns: '0.0.0.0',
        macAddress: '00-e0-f7-01-a1-b1',
        status: 'online',
        ports: [
          { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
          { id: 'com1', label: 'COM1', status: 'disconnected' as const }
        ]
      },
      {
        id: 'pc-2',
        type: 'pc',
        name: 'PC-2',
        x: 50,
        y: 150,
        ip: pc2LinkLocal,
        subnet: '255.255.0.0',
        gateway: '0.0.0.0',
        dns: '0.0.0.0',
        macAddress: '00-e0-f7-01-a1-b2',
        status: 'online',
        ports: [
          { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
          { id: 'com1', label: 'COM1', status: 'disconnected' as const }
        ]
      },
      {
        id: 'switch-1',
        type: 'switchL2',
        name: 'SWITCH-1',
        x: 200,
        y: 50,
        macAddress: '0011.2233.4401',
        ip: '',
        status: 'online',
        switchModel: 'WS-C2960-24TT-L',
        ports: [
          ...Array.from({ length: 24 }, (_, i) => ({ id: `fa0/${i + 1}`, label: `Fa0/${i + 1}`, status: 'disconnected' as const })),
          { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
          { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const },
          { id: 'console', label: 'Console', status: 'disconnected' as const }
        ]
      }
    ]);
    setTopologyConnections([
      {
        id: 'conn-init-1',
        sourceDeviceId: 'pc-1',
        sourcePort: 'eth0',
        targetDeviceId: 'switch-1',
        targetPort: 'fa0/1',
        cableType: 'straight',
        active: true
      }
    ]);
    setTopologyNotes([]);

    // Reset zoom and pan to top-left
    setZoom(1.0);
    setPan({ x: 0, y: 0 });

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }

    // Reset active selections
    setActiveDeviceId('');
    setActiveDeviceType('switchL2');
    setSelectedDevice(null);
    setShowPCPanel(false);
    setShowRouterPanel(false);

    // Close guided/exam mode panel if open
    closeGuidedMode();
    closeExam();
    setProjectName('Untitled');

    // Close network refresh report if open
    setRefreshNetworkReport(null);

    // Close packet analysis popup explicitly
    window.dispatchEvent(new CustomEvent('network-refresh'));

    // Force return to topology
    setActiveTab('topology');
    setHasUnsavedChanges(false);

    // Increment key to force NetworkTopology remount
    setTopologyKey(prev => prev + 1);

    // Reset history with the new initial state
    resetHistory({
      topologyDevices: [
        {
          id: 'pc-1',
          type: 'pc',
          name: 'PC-1',
          x: 50,
          y: 50,
          ip: pc1LinkLocal,
          subnet: '255.255.0.0',
          gateway: '0.0.0.0',
          dns: '0.0.0.0',
          macAddress: '00-e0-f7-01-a1-b1',
          status: 'online',
          ports: [
            { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
            { id: 'com1', label: 'COM1', status: 'disconnected' as const }
          ]
        },
        {
          id: 'switch-1',
          type: 'switchL2',
          name: 'SWITCH-1',
          x: 200,
          y: 50,
          macAddress: '0011.2233.4401',
          ip: '',
          status: 'online',
          switchModel: 'WS-C2960-24TT-L',
          ports: [
            { id: 'console', label: 'Console', status: 'disconnected' as const },
            ...Array.from({ length: 24 }, (_, i) => ({ id: `fa0/${i + 1}`, label: `Fa0/${i + 1}`, status: 'disconnected' as const })),
            { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
            { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }
          ]
        }
      ],
      topologyConnections: [],
      topologyNotes: [],
      deviceStates: new Map(),
      deviceOutputs: new Map(),
      pcOutputs: new Map(),
      pcHistories: new Map(),
      cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
      activeDeviceId: '',
      activeDeviceType: 'switchL2',
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      activeTab: 'topology'
    });
  }, [resetHistory, setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories, setTopologyDevices, setTopologyConnections, setTopologyNotes, setActiveDeviceId, setActiveDeviceType, setSelectedDevice, setShowPCPanel, setShowRouterPanel, setActiveTab, setHasUnsavedChanges, setTopologyKey, setZoom, setPan, closeGuidedMode, setProjectName]);

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


  // Onboarding content + controls
  const onboardingSteps = [
    {
      title: t.tutorialWelcomeTitle,
      description: t.tutorialWelcomeDesc,
    },
    {
      title: t.tutorialTopologyTitle,
      description: t.tutorialTopologyDesc,
    },
    {
      title: t.tutorialCablesTitle,
      description: t.tutorialCablesDesc,
    },
    {
      title: t.tutorialDevicesTitle,
      description: t.tutorialDevicesDesc,
    },
    {
      title: t.tutorialPingTitle,
      description: t.tutorialPingDesc,
    },
    {
      title: t.tutorialWifiTitle,
      description: t.tutorialWifiDesc,
    },
    {
      title: t.tutorialProjectTitle,
      description: t.tutorialProjectDesc,
    },
    {
      title: t.tutorialThemeTitle,
      description: t.tutorialThemeDesc,
    },
    {
      title: t.tutorialReadyTitle,
      description: t.tutorialReadyDesc,
    },
  ];

  const closeOnboardingForever = useCallback(() => {
    try {
      localStorage.setItem('netsim_onboarding_seen', '1');
    } catch (err) {
      errorHandler.logError(STORAGE_ERRORS.LOCAL_STORAGE_UNAVAILABLE({ operation: 'setOnboardingSeen', error: String(err) }));
    }
    setShowOnboarding(false);
  }, [setShowOnboarding]);

  const nextOnboarding = useCallback(() => {
    if (onboardingStep >= onboardingSteps.length - 1) {
      closeOnboardingForever();
      return;
    }
    setOnboardingStep((s) => Math.min(s + 1, onboardingSteps.length - 1));
  }, [onboardingStep, onboardingSteps.length, closeOnboardingForever, setOnboardingStep]);

  const prevOnboarding = useCallback(() => {
    setOnboardingStep((s) => Math.max(0, s - 1));
  }, [setOnboardingStep]);

  // Derive visible tabs based on current state
  const tabs = ALL_TABS.filter(tab => {
    // Topology tab always visible
    if (tab.id === 'topology') return true;

    // cmd tab is now a modal, not a tab
    if (tab.id === 'cmd') return false;

    // Show other tabs only if a device is active and compatible
    return activeDeviceId && (topologyDevices.some(d => d.id === activeDeviceId)) && tab.showFor.includes(activeDeviceType);
  }).map(tab => ({
    ...tab,
    label: t[tab.labelKey as keyof typeof t] as string
  }));

  // Refresh network connections and WiFi status
  const handleRefreshNetwork = useCallback(() => {
    // Close floating panels on network refresh
    setActiveDeviceId('');
    setSelectedDevice(null);
    window.dispatchEvent(new CustomEvent('network-refresh'));

    const isSwitchDeviceType = (type: string) => type === 'switchL2' || type === 'switchL3';
    const normalizeWifiMode = (mode: string | undefined): 'ap' | 'client' | 'disabled' => {
      if (!mode) return 'disabled';
      const normalized = mode.toLowerCase().replace(/^wifi-/, '');
      if (normalized === 'client' || normalized === 'sta') return 'client';
      if (normalized === 'ap') return 'ap';
      return 'disabled';
    };
    const hasValidIp = (ip: string | undefined) => !!ip && ip !== '0.0.0.0' && ip !== '169.254.0.0';
    const ipToNumber = (ip: string): number | null => {
      const parts = ip.split('.').map((p) => Number(p));
      if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
      return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0);
    };
    const isIpInPoolRange = (ip: string, pool: { startIp: string; maxUsers: number }) => {
      const ipNum = ipToNumber(ip);
      const startNum = ipToNumber(pool.startIp);
      if (ipNum === null || startNum === null) return false;
      const maxUsers = Math.max(1, Number(pool.maxUsers || 1));
      return ipNum >= startNum && ipNum < (startNum + maxUsers);
    };
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
    const firstValue = (...values: Array<string | undefined | null>) =>
      values.find((value) => !!value && value !== '0.0.0.0') || '-';
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

    const propagateVtpVlans = (devices: CanvasDevice[], states: Map<string, SwitchState>, connections: CanvasConnection[]) => {
      const byId = new Map(devices.map((d) => [d.id, d]));
      const nextStates = new Map(states);

      for (const conn of connections) {
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

      return nextStates;
    };

    const validateTopologyConnections = (devices: CanvasDevice[], connections: CanvasConnection[]) => {
      const byId = new Map(devices.map((device) => [device.id, device]));
      const usedPorts = new Set<string>();
      let invalidCount = 0;

      const sanitizedConnections = connections.map((connection) => {
        const sourceDevice = byId.get(connection.sourceDeviceId);
        const targetDevice = byId.get(connection.targetDeviceId);
        const sourcePortExists = !!sourceDevice?.ports?.some((port) => port.id === connection.sourcePort);
        const targetPortExists = !!targetDevice?.ports?.some((port) => port.id === connection.targetPort);
        const sourceKey = `${connection.sourceDeviceId}:${connection.sourcePort}`;
        const targetKey = `${connection.targetDeviceId}:${connection.targetPort}`;
        const duplicatePort = usedPorts.has(sourceKey) || usedPorts.has(targetKey);
        const invalid = !sourceDevice ||
          !targetDevice ||
          !sourcePortExists ||
          !targetPortExists ||
          connection.sourceDeviceId === connection.targetDeviceId ||
          duplicatePort;

        if (connection.active !== false) {
          if (invalid) {
            invalidCount++;
          } else {
            usedPorts.add(sourceKey);
            usedPorts.add(targetKey);
          }
        }

        return invalid ? { ...connection, active: false } : connection;
      });

      return { sanitizedConnections, invalidCount };
    };

    const releaseDisconnectedPorts = (devices: CanvasDevice[], states: Map<string, SwitchState>, connections: CanvasConnection[]) => {
      const activePortKeys = new Set<string>();
      connections.forEach((connection) => {
        if (connection.active === false) return;
        activePortKeys.add(`${connection.sourceDeviceId}:${connection.sourcePort}`);
        activePortKeys.add(`${connection.targetDeviceId}:${connection.targetPort}`);
      });

      const nextDevices = devices.map((device) => ({
        ...device,
        ports: device.ports.map((port) => {
          const key = `${device.id}:${port.id}`;
          if (port.shutdown || port.status === 'disabled' || port.status === 'err-disabled') return port;
          if (activePortKeys.has(key)) return { ...port, status: 'connected' as const };
          // Only change to disconnected if it was previously connected
          if (port.status === 'connected') {
            return { ...port, status: 'disconnected' as const };
          }
          return port;
        }),
      }));

      const nextStates = new Map(states);
      devices.forEach((device) => {
        const state = nextStates.get(device.id);
        if (!state?.ports) return;
        const nextPorts = { ...state.ports };
        let changed = false;

        Object.entries(nextPorts).forEach(([portId, port]) => {
          const key = `${device.id}:${portId}`;
          if (port.shutdown || port.status === 'disabled' || port.status === 'err-disabled') return;
          if (activePortKeys.has(key)) {
            if (port.status !== 'connected') {
              nextPorts[portId] = { ...port, status: 'connected' };
              changed = true;
            }
            return;
          }
          // Only change to notconnect if it was previously connected
          if (port.status === 'connected') {
            nextPorts[portId] = {
              ...port,
              status: 'notconnect',
              spanningTree: port.spanningTree
                ? { ...port.spanningTree, state: 'disabled', role: 'disabled' }
                : port.spanningTree,
            };
            changed = true;
          }
        });

        if (changed) {
          nextStates.set(device.id, { ...state, ports: nextPorts });
        }
      });

      return { devices: nextDevices, states: nextStates };
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

      const isWirelessMatch = (client: CanvasDevice, ap: CanvasDevice) => {
        const clientWifi = client.wifi;
        const apWifi = ap.wifi;
        if (!clientWifi?.enabled || clientWifi.mode !== 'client' || !clientWifi.ssid) return false;
        if (!apWifi?.enabled || apWifi.mode !== 'ap' || !apWifi.ssid) return false;
        if (apWifi.ssid !== clientWifi.ssid) return false;
        if (clientWifi.bssid && clientWifi.bssid !== ap.id) return false;

        const apSecurity = apWifi.security || 'open';
        const clientSecurity = clientWifi.security || 'open';
        if (apSecurity !== clientSecurity) return false;
        return apSecurity === 'open' || apWifi.password === clientWifi.password;
      };

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

      // Reset DHCP renewal ref to allow fresh leases on refresh
      dhcpRenewalDoneRef.current = false;

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
            showConflictToast(
              language === 'tr' ? `IP Çakışması (${duplicateIpCount})` : `IP Conflict (${duplicateIpCount})`,
              dupIpDesc
            );
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
      const isSwitchDeviceType = (type: string) => type === 'switchL2' || type === 'switchL3';
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
    const exam = generateExamFromProject(projectData as ProjectData, language);
    startExamProject(exam);
    loadProjectData(projectData);
    toggleEditor(true);
    document.body.style.cursor = '';
    toast({
      title: language === 'tr' ? 'Proje Dönüştürüldü' : 'Project Converted',
      description: language === 'tr' ? 'Görevler otomatik olarak çıkarıldı ve Sınav Düzenleyici açıldı.' : 'Tasks were automatically extracted and the Exam Editor was opened.',
    });
  }, [closeExam, closeGuidedMode, language, startExamProject, loadProjectData, toggleEditor, toast]);

  const handleStartGuidedProject = useCallback((project: GuidedProject) => {
    closeExam();
    startGuidedProject(project);
  }, [startGuidedProject, closeExam]);

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

        {/* Multi-Tab Warning Dialog */}
        {showWarning && (
          <AlertDialog open={showWarning}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-primary-600">
                  <Monitor className="h-5 w-5" />
                  Multiple Tabs Active
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You have {tabCount} tab{tabCount > 1 ? 's' : ''} of Network Simulator open. Each tab now saves its own data independently, so you can work in multiple tabs without conflicts.
                  <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-950/30 rounded-lg">
                    <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
                      ✅ Each tab has isolated storage
                    </p>
                    <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                      Your work in each tab is saved separately
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={clearCurrentTabData}>
                  Clear This Tab
                </AlertDialogCancel>
                <AlertDialogAction onClick={acknowledgeWarning}>
                  Got It
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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


          {/* Global Dialogs (AlertDialog for better z-index and standard behavior) */}
          <AlertDialog open={!!confirmDialog} onOpenChange={(open) => {
            if (!open) {
              setConfirmDialog(null);
              focusActiveTerminalInput();
            }
          }}>
            <AlertDialogContent className={`${isDark ? 'bg-secondary-900 border-success-500/30' : 'bg-white border-success-500/50'}`}>
              <AlertDialogHeader>
                <AlertDialogTitle className={isDark ? 'text-white' : 'text-secondary-900'}>
                  {t.confirmationRequired}
                </AlertDialogTitle>
                <AlertDialogDescription className={isDark ? 'text-secondary-400' : 'text-secondary-500'}>
                  {confirmDialog?.message}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className={isDark ? 'bg-secondary-800 text-white border-secondary-700 hover:bg-secondary-700' : ''}>
                  {t.cancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    confirmDialog?.onConfirm();
                    focusActiveTerminalInput();
                  }}
                  className="bg-accent-600 hover:bg-accent-700 text-white"
                >
                  {t.continue}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={!!saveDialog} onOpenChange={(open) => {
            if (!open) {
              setSaveDialog(null);
              focusActiveTerminalInput();
            }
          }}>
            <AlertDialogContent className={`${isDark ? 'bg-secondary-900 border-success-500/30' : 'bg-white border-success-500/50'}`}>
              <AlertDialogHeader>
                <AlertDialogTitle className={isDark ? 'text-white' : 'text-secondary-900'}>
                  {t.saveProject}
                </AlertDialogTitle>
                <AlertDialogDescription className={isDark ? 'text-secondary-400' : 'text-secondary-500'}>
                  {saveDialog?.message}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    saveDialog?.onConfirm(false);
                    focusActiveTerminalInput();
                  }}
                  className={isDark ? 'bg-secondary-800 text-white border-secondary-700 hover:bg-secondary-700' : ''}
                >
                  {t.dontSave}
                </Button>
                <AlertDialogAction
                  onClick={() => {
                    saveDialog?.onConfirm(true);
                    focusActiveTerminalInput();
                  }}
                  className="bg-accent-600 hover:bg-accent-700 text-white"
                >
                  {t.saveLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
          <Dialog open={showFirewallPanel} onOpenChange={(open) => {
            setShowFirewallPanel(open);
            if (!open) setFirewallActiveTab('console');
          }} modal={false}>
            <DialogContent
              showCloseButton={false}
              onEscapeKeyDown={() => {
                setShowFirewallPanel(false);
                setFirewallActiveTab('console');
              }}
              className={cn(
                "p-0 overflow-visible flex flex-col top-auto left-auto translate-x-0 translate-y-0 shadow-[0_15px_50px_rgba(15,23,42,0.12)] liquid-glass-light",
                isDark
                  ? "bg-secondary-950/80 border-success-500/40 backdrop-blur-xl"
                  : "bg-white/70 border-success-500 backdrop-blur-xl"
              )}
              data-modal-content
              data-disable-snap="true"
              style={{
                position: 'fixed',
                left: !isMobile ? firewallDrag.position.x : 0,
                top: !isMobile ? firewallDrag.position.y : 0,
                width: !isMobile ? `${firewallDrag.size.width}px` : '100vw',
                height: !isMobile ? `${firewallDrag.size.height}px` : '100vh',
                maxWidth: 'none',
                maxHeight: 'none',
                borderRadius: !isMobile ? '1rem' : 0,
                borderWidth: 3,
                borderStyle: 'dashed',
              }}
            >
              <div className={cn(
                "relative flex flex-col h-full overflow-visible",
                !isMobile ? 'rounded-2xl' : 'rounded-none'
              )}>
                <DialogHeader
                  className={cn(
                    "p-3 sm:p-4 border-b cursor-grab active:cursor-grabbing select-none touch-none sticky top-0 z-10 backdrop-blur-xl",
                    isDark ? "border-success-500/30 bg-secondary-900/75" : "border-success-500/60 bg-white/80"
                  )}
                  data-modal-header
                  onPointerDown={(e) => firewallDrag.handlePointerDown(e, 'firewall')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <DialogTitle className={cn("font-semibold truncate", isDark ? 'text-white' : 'text-secondary-900')}>
                        {isTR ? 'Firewall' : 'Firewall'} - {topologyDevices?.find((d: CanvasDevice) => d.id === activeFirewallId)?.name || activeFirewallId}
                      </DialogTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Power Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-warning-500/20 hover:text-warning-500"
                        onClick={() => {
                          if (activeFirewallId) {
                            logger.debug('Firewall power toggle:', activeFirewallId, 'Current status:', topologyDevices.find(d => d.id === activeFirewallId)?.status);
                            toggleDevicePower(activeFirewallId);
                          } else {
                            logger.debug('No active firewall ID');
                          }
                        }}
                        title={t.power}
                      >
                        <Power className={cn("h-3.5 w-3.5", topologyDevices.find(d => d.id === activeFirewallId)?.status === 'offline' ? 'text-error-500' : 'text-success-500')} />
                      </Button>
                      {/* Quick Settings Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-7 w-7", firewallActiveTab === 'settings' ? 'bg-primary/20 text-primary' : 'hover:bg-primary/20')}
                        onClick={() => setFirewallActiveTab(firewallActiveTab === 'settings' ? 'console' : 'settings')}
                        title={t.quickSettings}
                      >
                        <Filter className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-error-500 hover:text-white dark:hover:bg-error-600"
                        onClick={() => {
                          setShowFirewallPanel(false);
                          setFirewallActiveTab('console');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto rounded-b-2xl p-4 custom-scrollbar">
                  {activeFirewallId && (
                    <FirewallPanel
                      device={topologyDevices.find(d => d.id === activeFirewallId) as CanvasDevice}
                      t={t}
                      theme={theme}
                      isDevicePoweredOff={topologyDevices.find(d => d.id === activeFirewallId)?.status === 'offline'}
                      onUpdateRules={(rules) => {
                        updateDeviceConfig(activeFirewallId, { firewallRules: rules });
                      }}
                      deviceStates={deviceStates}
                      deviceOutputs={deviceOutputs}
                      onExecuteCommand={(cmd) => handleExecuteCommand(activeFirewallId as string, cmd)}
                      onUpdateHistory={handleUpdateHistory}
                      setConfirmDialog={setConfirmDialog}
                      confirmDialog={confirmDialog}
                      topologyDevices={topologyDevices}
                      activeTab={firewallActiveTab}
                      onTabChange={setFirewallActiveTab}
                      onTogglePower={toggleDevicePower}
                    />
                  )}
                </div>
                {/* Resize handles - hidden on mobile */}
                {!isMobile && (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none bg-transparent hover:bg-error-500/10" onPointerDown={(e) => firewallDrag.handleResizeStart(e, 'w', 'firewall')} />
                    <div className="absolute -right-[5px] top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none rounded-r-lg bg-transparent hover:bg-error-500/20" onPointerDown={(e) => firewallDrag.handleResizeStart(e, 'e', 'firewall')} />
                    <div className="absolute -top-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-t-lg bg-transparent hover:bg-error-500/20" onPointerDown={(e) => firewallDrag.handleResizeStart(e, 'n', 'firewall')} />
                    <div className="absolute -bottom-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-b-lg bg-transparent hover:bg-error-500/20" onPointerDown={(e) => firewallDrag.handleResizeStart(e, 's', 'firewall')} />
                    <div className="absolute -left-[5px] -top-[5px] z-20 h-[10px] w-[10px] cursor-nw-resize select-none touch-none bg-transparent hover:bg-error-500/20" onPointerDown={(e) => firewallDrag.handleResizeStart(e, 'nw', 'firewall')} />
                    <div className="absolute -right-[5px] -top-[5px] z-20 h-[10px] w-[10px] cursor-ne-resize select-none touch-none bg-transparent hover:bg-error-500/20" onPointerDown={(e) => firewallDrag.handleResizeStart(e, 'ne', 'firewall')} />
                    <div className="absolute -left-[5px] -bottom-[5px] z-20 h-[10px] w-[10px] cursor-sw-resize select-none touch-none bg-transparent hover:bg-error-500/20" onPointerDown={(e) => firewallDrag.handleResizeStart(e, 'sw', 'firewall')} />
                    <TooltipWrapper title={t.resizeAction}>
                      <div
                        className="absolute -bottom-2 -right-2 z-20 h-7 w-7 cursor-se-resize select-none touch-none rounded-tl-lg rounded-br-lg border border-success-500/30 bg-secondary-500/30 text-secondary-100/80 hover:bg-error-500/30 hover:text-white flex items-center justify-center"
                        onPointerDown={(e) => firewallDrag.handleResizeStart(e, 'se', 'firewall')}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M6 13L13 6" />
                          <path d="M9.5 13L13 9.5" />
                          <path d="M12.5 13L13 12.5" />
                        </svg>
                      </div>
                    </TooltipWrapper>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* PC Terminal Modal */}
          <Dialog open={showPCPanel && !isTablet} onOpenChange={setShowPCPanel} modal={false}>
            <DialogContent
              showCloseButton={false}
              onEscapeKeyDown={(e) => e.preventDefault()}
              className={cn(
                "p-0 overflow-visible flex flex-col top-auto left-auto translate-x-0 translate-y-0 shadow-[0_15px_50px_rgba(15,23,42,0.12)] liquid-glass-light",
                isDark
                  ? "bg-secondary-950/80 border-success-500/40 backdrop-blur-xl"
                  : "bg-white/70 border-success-500 backdrop-blur-xl"
              )}
              data-modal-content
              style={{
                position: 'absolute',
                left: !isMobile ? pcDrag.position.x : 0,
                top: !isMobile ? pcDrag.position.y : 0,
                width: !isMobile ? `${pcDrag.size.width}px` : '100vw',
                height: !isMobile ? `${pcDrag.size.height}px` : '100vh',
                maxWidth: 'none',
                maxHeight: 'none',
                borderRadius: !isMobile ? '1rem' : 0,
                borderWidth: 3,
                borderStyle: 'dashed',
              }}
            >
              <div className={cn(
                "relative flex flex-col h-full overflow-visible",
                !isMobile ? 'rounded-2xl' : 'rounded-none'
              )}>
                <DialogHeader
                  className={cn(
                    "p-3 sm:p-4 border-b cursor-grab active:cursor-grabbing select-none touch-none sticky top-0 z-10 backdrop-blur-xl min-h-[48px]",
                    isDark ? "border-success-500/30 bg-secondary-900/75" : "border-success-500/60 bg-white/80"
                  )}
                  data-modal-header
                  onPointerDown={(e) => pcDrag.handlePointerDown(e, 'pc')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <DialogTitle className={isDark ? 'text-white font-semibold' : 'text-secondary-900 font-semibold'}>
                        {t.pcTerminal} - {topologyDevices?.find((d: CanvasDevice) => d.id === showPCDeviceId)?.name || showPCDeviceId}
                      </DialogTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-error-500 hover:text-white dark:hover:bg-error-600"
                        onClick={() => setShowPCPanel(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <DialogDescription className="sr-only">
                    {t.pcTerminal}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden rounded-b-2xl">
                  <PCPanel
                    key="pc-panel"
                    className="h-full min-h-0"
                    deviceId={showPCDeviceId}
                    cableInfo={cableInfo}
                    initialTab={pcPanelInitialTab}
                    isVisible={true}
                    onClose={() => setShowPCPanel(false)}
                    onTogglePower={toggleDevicePower}
                    topologyDevices={topologyDevices || undefined}
                    topologyConnections={topologyConnections || undefined}
                    deviceStates={deviceStates}
                    deviceOutputs={deviceOutputs}
                    pcOutputs={pcOutputs}
                    pcHistories={pcHistories}
                    onUpdatePCHistory={handleUpdatePCHistory}
                    onExecuteDeviceCommand={handleExecuteCommand}
                    onNavigate={handlePCPanelNavigateWrapper}
                    onDeleteDevice={handleDeviceDelete}
                    handleResizeStart={pcDrag.handleResizeStart}
                  />
                </div>
                {/* Resize handles - hidden on mobile */}
                {!isMobile && (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none bg-transparent hover:bg-accent-500/10" onPointerDown={(e) => pcDrag.handleResizeStart(e, 'w', 'pc')} />
                    <div className="absolute -right-[5px] top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none rounded-r-lg bg-transparent hover:bg-accent-500/20" onPointerDown={(e) => pcDrag.handleResizeStart(e, 'e', 'pc')} />
                    <div className="absolute -top-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-t-lg bg-transparent hover:bg-accent-500/20" onPointerDown={(e) => pcDrag.handleResizeStart(e, 'n', 'pc')} />
                    <div className="absolute -bottom-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-b-lg bg-transparent hover:bg-accent-500/20" onPointerDown={(e) => pcDrag.handleResizeStart(e, 's', 'pc')} />
                    <div className="absolute -left-[5px] -top-[5px] z-20 h-[10px] w-[10px] cursor-nw-resize select-none touch-none bg-transparent hover:bg-accent-500/20" onPointerDown={(e) => pcDrag.handleResizeStart(e, 'nw', 'pc')} />
                    <div className="absolute -right-[5px] -top-[5px] z-20 h-[10px] w-[10px] cursor-ne-resize select-none touch-none bg-transparent hover:bg-accent-500/20" onPointerDown={(e) => pcDrag.handleResizeStart(e, 'ne', 'pc')} />
                    <div className="absolute -left-[5px] -bottom-[5px] z-20 h-[10px] w-[10px] cursor-sw-resize select-none touch-none bg-transparent hover:bg-accent-500/20" onPointerDown={(e) => pcDrag.handleResizeStart(e, 'sw', 'pc')} />
                    <TooltipWrapper title={t.resizeAction}>
                      <div
                        className="absolute -bottom-2 -right-2 z-20 h-7 w-7 cursor-se-resize select-none touch-none rounded-tl-lg rounded-br-lg border border-success-500/30 bg-secondary-500/30 text-secondary-100/80 hover:bg-accent-500/30 hover:text-white flex items-center justify-center"
                        onPointerDown={(e) => pcDrag.handleResizeStart(e, 'se', 'pc')}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M6 13L13 6" />
                          <path d="M9.5 13L13 9.5" />
                          <path d="M12.5 13L13 12.5" />
                        </svg>
                      </div>
                    </TooltipWrapper>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Router Info Panel Modal */}
          <RouterPanel
            deviceId={showRouterDeviceId}
            isVisible={showRouterPanel && !isTablet}
            onClose={() => setShowRouterPanel(false)}
            topologyDevices={topologyDevices || undefined}
            deviceStates={deviceStates}
            modalPosition={routerDrag.position}
            modalSize={routerDrag.size}
            handlePointerDown={routerDrag.handlePointerDown}
            handleResizeStart={routerDrag.handleResizeStart}
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
                      onClose={() => {
                        setSelectedDevice(null);
                        setActiveDeviceId('');
                      }}
                      onFocus={() => setFocusedOverlay('pc-info')}
                      zIndex={focusedOverlay === 'pc-info' ? 36 : 25}
                      handleDeviceDoubleClick={handleDeviceDoubleClick}
                      onOpenPanel={(id) => {
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
                      onClose={() => {
                        setSelectedDevice(null);
                        setActiveDeviceId('');
                      }}
                      onFocus={() => setFocusedOverlay('router-info')}
                      zIndex={focusedOverlay === 'router-info' ? 36 : 25}
                      handleDeviceDoubleClick={handleDeviceDoubleClick}
                      onOpenPanel={(id) => {
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
            {isTablet && (showPCPanel || showUnifiedDeviceModal || showRouterPanel) && (
              <div className="w-1/2 h-full bg-background/50 backdrop-blur-md overflow-hidden animate-in slide-in-from-right duration-500 border-l border-primary/10">
                {showUnifiedDeviceModal && (
                  <UnifiedDevicePanel
                    isOpen={true}
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
                    modalPosition={{ x: 0, y: 0 }}
                    modalSize={{ width: 0, height: 0 }}
                    handlePointerDown={() => { }}
                    handleResizeStart={() => { }}
                    className="!static !w-full !h-full !translate-x-0 !translate-y-0 !shadow-none !border-none !rounded-none"
                  />
                )}
                {showPCPanel && (
                  <div className="h-full flex flex-col">
                    <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "bg-secondary-900" : "bg-secondary-50")}>
                      <h2 className="font-bold text-sm truncate">
                        {t.pcTerminal} - {topologyDevices?.find((d: CanvasDevice) => d.id === showPCDeviceId)?.name || showPCDeviceId}
                      </h2>
                      <Button variant="ghost" size="icon" onClick={() => setShowPCPanel(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <PCPanel
                      deviceId={showPCDeviceId}
                      cableInfo={cableInfo}
                      initialTab={pcPanelInitialTab}
                      isVisible={true}
                      onClose={() => setShowPCPanel(false)}
                      onTogglePower={toggleDevicePower}
                      topologyDevices={topologyDevices || undefined}
                      topologyConnections={topologyConnections || undefined}
                      deviceStates={deviceStates}
                      deviceOutputs={deviceOutputs}
                      pcOutputs={pcOutputs}
                      pcHistories={pcHistories}
                      onUpdatePCHistory={handleUpdatePCHistory}
                      onExecuteDeviceCommand={handleExecuteCommand}
                      onNavigate={handlePCPanelNavigateWrapper}
                      onDeleteDevice={handleDeviceDelete}
                      className="!flex-1"
                    />
                  </div>
                )}
                {showRouterPanel && (
                  <div className="h-full flex flex-col">
                    <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "bg-secondary-900" : "bg-secondary-50")}>
                      <h2 className="font-bold text-sm truncate">
                        {t.configure} - {topologyDevices?.find((d: CanvasDevice) => d.id === showRouterDeviceId)?.name || showRouterDeviceId}
                      </h2>
                      <Button variant="ghost" size="icon" onClick={() => setShowRouterPanel(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <RouterPanel
                      deviceId={showRouterDeviceId}
                      isVisible={true}
                      onClose={() => setShowRouterPanel(false)}
                      topologyDevices={topologyDevices || undefined}
                      deviceStates={deviceStates}
                      modalPosition={{ x: 0, y: 0 }}
                      modalSize={{ width: 0, height: 0 }}
                      handlePointerDown={() => { }}
                      handleResizeStart={() => { }}
                      className="!static !w-full !h-full !translate-x-0 !translate-y-0 !shadow-none !border-none !rounded-none"
                    />
                  </div>
                )}
              </div>
            )}


                    {/* Network Refresh Report - Top Right Toast / Full Screen on Mobile */}
            {
              refreshNetworkReport?.show && (
                  <div
                    ref={refreshReportRef}
                    data-draggable-id={isMobile ? undefined : "refresh-network-report"}
                    className={`fixed z-[100] backdrop-blur-md select-none ${isMobile 
                      ? 'inset-0 w-full h-full rounded-none border-0' 
                      : 'top-20 right-4 w-full max-w-sm rounded-xl border shadow-2xl'
                      } animate-in slide-in-from-right-full duration-300 ${isDark
                        ? 'bg-secondary-950/70 border-success-500/30 text-secondary-100 shadow-black/40'
                        : 'bg-white/70 border-success-500/50 text-secondary-900 shadow-secondary-200/50'
                      }`}
                  style={{
                    zIndex: 100,
                    ...(!isMobile ? { maxHeight: 'calc(100vh - 100px)' } : { height: '100vh', maxHeight: '100vh' })
                  }}
                  onMouseDown={() => setFocusedOverlay('refresh')}
                >
                  <div
                    className={`flex items-center justify-between px-3 py-2 border-b ${isMobile ? 'rounded-none' : 'rounded-t-xl'} ${!isMobile ? 'cursor-grab active:cursor-grabbing' : ''} select-none ${isDark ? 'bg-white/5 border-success-500/20' : 'bg-black/5 border-success-500/30'}`}
                    data-drag-handle={isMobile ? undefined : true}
                  >
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      {refreshNetworkReport.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      <TooltipWrapper title={t.refreshNetwork}>
                        <button
                          onClick={() => { handleRefreshNetwork(); }}
                          className="w-5 h-5 rounded-md bg-primary-500 hover:bg-primary-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
                        >
                          <RefreshCw className="w-3 h-3 text-white pointer-events-none" />
                        </button>
                      </TooltipWrapper>
                      <TooltipWrapper title={t.close}>
                        <button
                          onClick={() => setRefreshNetworkReport(prev => prev ? { ...prev, show: false } : null)}
                          className="w-5 h-5 rounded-md bg-error-500 hover:bg-error-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
                        >
                          <X className="w-3 h-3 text-white pointer-events-none" />
                        </button>
                      </TooltipWrapper>
                    </div>
                  </div>

                  <div className="p-2 overflow-y-auto" style={{ maxHeight: isMobile ? 'calc(100vh - 70px)' : 'calc(100vh - 160px)' }}>
                    <Tabs defaultValue="summary" className="w-full">
                      <TabsList className={`w-full grid grid-cols-2 ${isDark ? 'bg-secondary-800/80' : 'bg-secondary-200/80'}`}>
                        <TabsTrigger value="summary" className="text-xs">
                          {language === 'tr' ? 'Özet' : 'Summary'}
                        </TabsTrigger>
                        <TabsTrigger value="devices" className="text-xs">
                          {language === 'tr' ? 'Cihazlar' : 'Devices'} ({refreshNetworkReport.devices.length})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="summary" className="mt-2 space-y-2">
                        {/* Quick status messages */}
                        {refreshNetworkReport.dhcpMessages.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 opacity-80 text-xs">
                            {refreshNetworkReport.dhcpMessages.map((msg, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span>{msg}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {refreshNetworkReport.stpMessage && (
                          <div className="text-pink-500 font-medium py-0.5 px-2 bg-pink-500/10 rounded-lg w-fit text-xs">
                            {refreshNetworkReport.stpMessage}
                          </div>
                        )}
                        {refreshNetworkReport.portSecurityMessage && (
                          <div className="text-error-500 font-medium py-0.5 px-2 bg-error-500/10 rounded-lg w-fit text-xs">
                            {refreshNetworkReport.portSecurityMessage}
                          </div>
                        )}
                        {refreshNetworkReport.topologyMessage && (
                          <div className="text-warning-500 font-medium py-0.5 px-2 bg-warning-500/10 rounded-lg w-fit text-xs">
                            {refreshNetworkReport.topologyMessage}
                          </div>
                        )}

                        {/* Summary grid - live from store, real-time reactive */}
                        {liveSummary && (
                          <>
                            <div className={`grid grid-cols-2 gap-2 text-xs`}>
                              <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'}`}>
                                <div className={`font-semibold mb-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                                  {language === 'tr' ? 'Cihaz Sayısı' : 'Device Count'}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex justify-between">
                                    <span>{language === 'tr' ? 'Toplam' : 'Total'}</span>
                                    <span className="font-bold">{liveSummary.deviceCount.total}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{language === 'tr' ? 'Yönlendirici' : 'Router'}</span>
                                    <span>{liveSummary.deviceCount.routers}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{language === 'tr' ? 'Anahtar' : 'Switch'}</span>
                                    <span>{liveSummary.deviceCount.switches}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>PC</span>
                                    <span>{liveSummary.deviceCount.pcs}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>IoT</span>
                                    <span>{liveSummary.deviceCount.iot}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{language === 'tr' ? 'Güvenlik Duvarı' : 'Firewall'}</span>
                                    <span>{liveSummary.deviceCount.firewalls}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>WLC</span>
                                    <span>{liveSummary.deviceCount.wlcs}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'}`}>
                                  <div className={`font-semibold mb-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                                    {language === 'tr' ? 'Aktif Bağlantılar' : 'Active Links'}
                                  </div>
                                  <div className="text-lg font-bold">
                                    {liveSummary.activeLinks}
                                  </div>
                                </div>

                                <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'}`}>
                                  <div className={`font-semibold mb-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                                    VLAN {language === 'tr' ? 'Sayısı' : 'Count'}
                                  </div>
                                  <div className="text-lg font-bold">
                                    {liveSummary.vlanCount}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Routing table summary */}
                            {liveSummary.routingTableSummary.totalRoutes > 0 && (
                              <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'} text-xs`}>
                                <div className={`font-semibold mb-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                                  {language === 'tr' ? 'Yönlendirme Tablosu Özeti' : 'Routing Table Summary'}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex justify-between">
                                    <span>{language === 'tr' ? 'Toplam rota' : 'Total routes'}</span>
                                    <span className="font-bold">{liveSummary.routingTableSummary.totalRoutes}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{language === 'tr' ? 'Bağlı' : 'Connected'}</span>
                                    <span>{liveSummary.routingTableSummary.connected}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{language === 'tr' ? 'Statik' : 'Static'}</span>
                                    <span>{liveSummary.routingTableSummary.static}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{language === 'tr' ? 'Dinamik' : 'Dynamic'}</span>
                                    <span>{liveSummary.routingTableSummary.dynamic}</span>
                                  </div>
                                  </div>
                              </div>
                            )}

                            {/* Protocol Status */}
                            {liveSummary.protocolStats && (
                              <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'} text-xs`}>
                                <div className={`font-semibold mb-1.5 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                                  {language === 'tr' ? 'Protokol Durumu' : 'Protocol Status'}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`p-0.5 rounded ${liveSummary.protocolStats.ospf.count > 0 ? (liveSummary.protocolStats.ospf.neighbors > 0 ? 'bg-success-500/20 text-success-500' : 'bg-warning-500/20 text-warning-500') : 'bg-secondary-500/20 text-secondary-500'}`}>
                                        <Activity className="w-3 h-3" />
                                      </span>
                                      <span className="font-bold">OSPF</span>
                                    </div>
                                    <span className={`${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                                      {language === 'tr' ? `${liveSummary.protocolStats.ospf.neighbors} komşu` : `${liveSummary.protocolStats.ospf.neighbors} neighbors`}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`p-0.5 rounded ${liveSummary.protocolStats.stp.roots > 0 ? 'bg-success-500/20 text-success-500' : 'bg-secondary-500/20 text-secondary-500'}`}>
                                        <ShieldCheck className="w-3 h-3" />
                                      </span>
                                      <span className="font-bold">STP</span>
                                    </div>
                                    <span className={`${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                                      {language === 'tr' ? `${liveSummary.protocolStats.stp.roots} Root, ${liveSummary.protocolStats.stp.blocked} bloklu` : `${liveSummary.protocolStats.stp.roots} Root, ${liveSummary.protocolStats.stp.blocked} blocked`}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`p-0.5 rounded ${liveSummary.protocolStats.hsrp.active > 0 ? 'bg-success-500/20 text-success-500' : 'bg-secondary-500/20 text-secondary-500'}`}>
                                        <Layers className="w-3 h-3" />
                                      </span>
                                      <span className="font-bold">HSRP</span>
                                    </div>
                                    <span className={`${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                                      A: {liveSummary.protocolStats.hsrp.active}, S: {liveSummary.protocolStats.hsrp.standby}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`p-0.5 rounded ${liveSummary.protocolStats.eigrp.count > 0 ? (liveSummary.protocolStats.eigrp.neighbors > 0 ? 'bg-success-500/20 text-success-500' : 'bg-error-500/20 text-error-500') : 'bg-secondary-500/20 text-secondary-500'}`}>
                                        <Share2 className="w-3 h-3" />
                                      </span>
                                      <span className="font-bold">EIGRP</span>
                                    </div>
                                    <span className={`${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                                      {language === 'tr' ? `${liveSummary.protocolStats.eigrp.neighbors} komşu` : `${liveSummary.protocolStats.eigrp.neighbors} neighbors`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                          </>
                        )}

                        {/* Network warnings - from refresh report */}
                        {refreshNetworkReport.summary.networkWarnings.length > 0 && (
                          <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'} text-xs`}>
                            <div className={`font-semibold mb-1 text-warning-500`}>
                              {language === 'tr' ? 'Ağ Uyarıları' : 'Network Warnings'} ({refreshNetworkReport.summary.networkWarnings.length})
                            </div>
                            <div className="space-y-0.5">
                              {refreshNetworkReport.summary.networkWarnings.map((w, i) => (
                                <div key={i} className="flex items-center gap-1 text-warning-500">
                                  <span>⚠</span>
                                  <span>{w}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {refreshNetworkReport.summary.networkWarnings.length === 0 && (
                          <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'} text-xs text-center ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                            {language === 'tr' ? 'Uyarı yok' : 'No warnings'}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="devices" className="mt-2">
                        <LiveDeviceList devices={topologyDevices} deviceStates={deviceStates} language={language} />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )
            }
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

          <RoomJoinDialog />
          <TeacherRoomPanel />
        </div>
      </div>
    </AppErrorBoundary>
  );
}


