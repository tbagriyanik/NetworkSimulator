'use client';

import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import { SwitchState, CableInfo } from '@/lib/network/types';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { useNetworkLogic } from '@/hooks/useNetworkLogic';
import { useProjectPersistence } from '@/hooks/useProjectPersistence';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useDrag } from '@/hooks/useDrag';
import { useMultiTabWarning } from '@/hooks/useMultiTabWarning';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileBack } from '@/hooks/useMobileBack';
import { usePanels } from '@/hooks/usePanels';
import { useRefreshReport } from '@/hooks/useRefreshReport';
import { useDeviceSelection } from '@/hooks/useDeviceSelection';
import useAppStore, { useTopologyDevices, useTopologyConnections, useTopologyNotes, useZoom, usePan, useActiveTab, useEnvironment } from '@/lib/store/appStore';
import { cn, normalizeMAC } from '@/lib/utils';
import { logger, getFromStorage, setToStorage } from '@/lib/logger';
import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType, CanvasPortStatus } from '@/components/network/networkTopology.types';
import { getPrompt } from '@/lib/network/executor';
import { formatErrorForUser, errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';
import { generateRandomLinkLocalIpv4 } from '@/lib/network/linkLocal';
import { safeParse, safeStringify } from '@/lib/network/serialization';
import { calculatePVST } from '@/lib/network/core/showCommands';
import { createInitialState } from '@/lib/network/initialState';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NetworkTopology = dynamic(
  () => import('@/components/network/NetworkTopology').then((m) => m.NetworkTopology),
  { ssr: false }
);
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Menu, Plus, Save, FolderOpen, Languages, Sun, Moon, Network, ShieldCheck, Database, Info, File, Layers, Terminal as TerminalIcon, Undo2, Redo2, Link2, Pencil, StickyNote, Sparkles, Cloud, Search, Monitor, X, Compass, Leaf, Server, GripHorizontal, Square, Minus, Strikethrough, Cable, Usb, BookOpen, Target, Clock, GraduationCap, Settings as SettingsIcon, Power, Filter, RefreshCw } from "lucide-react";
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { TooltipWrapper } from "@/components/ui/TooltipWrapper";
import { ShortcutBadge } from "@/components/ui/ShortcutBadge";
import { useLanguage, Translations } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from "@/hooks/use-toast";

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
import { exampleProjects, type ExampleProject, type ExampleProjectLevel } from '@/lib/network/exampleProjects';
import { getGuidedProjects, type GuidedProject } from '@/lib/network/guidedMode';
import { getExamProjects, type ExamProject } from '@/lib/network/examMode';
import { buildRunningConfig } from '@/lib/network/core/configBuilder';
import { performanceMonitor } from '@/lib/performance/monitoring';
import { useGuidedMode } from '@/hooks/useGuidedMode';
import { useExamMode } from '@/hooks/useExamMode';

import { DeviceIcon } from '@/components/network/DeviceIcon';
import { PCInfoPopover, SwitchInfoPopover, RouterInfoPopover } from '@/components/network/DeviceInfoPopovers';
import { AppHeader } from '@/components/network/AppHeader';
import { AppFooter } from '@/components/network/AppFooter';
import { TopologyToolbar } from '@/components/network/TopologyToolbar';
import { AppSkeleton } from '@/components/ui/AppSkeleton';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { SwitchModel } from '@/lib/network/switchModels';

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
  tasks: any[];
  color: string;
  showFor: DeviceType[];
}

const SWITCH_DEVICE_TYPES: DeviceType[] = ['switchL2', 'switchL3'];
const isSwitchDeviceType = (type?: DeviceType) => type === 'switchL2' || type === 'switchL3';

const ALL_TABS: TabDefinition[] = [
  {
    id: 'topology',
    labelKey: 'networkTopology',
    icon: <Network className="w-4 h-4" />,
    tasks: topologyTasks,
    color: 'from-cyan-500 to-blue-500',
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
      setSelectedId(null);
      return;
    }
    if (!selectedId || !devices.some((device) => device.id === selectedId)) {
      setSelectedId(devices[0].id);
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
              ? 'bg-blue-600 border-blue-700 text-white shadow-sm scale-105 z-10'
              : isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800'
              }`}
          >
            {device.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
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
                <tr key={label} className="border-t first:border-t-0 border-slate-200 dark:border-slate-700">
                  <td className="w-24 bg-slate-100 px-2 py-1 font-semibold dark:bg-slate-800">{label}</td>
                  <TooltipWrapper title={copyable ? t.copy : undefined}>
                    <td
                      className={`px-2 py-1 font-mono ${copyable ? 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 rounded' : ''}`}
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

export default function Home() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, effectiveTheme, setTheme } = useTheme();
  const isTR = language === 'tr';

  // Multi-tab warning system
  const { showWarning, tabCount, acknowledgeWarning, clearCurrentTabData } = useMultiTabWarning();

  // Refs moved to top to avoid TDZ errors
  const isApplyingHistoryRef = useRef(false);
  const pendingHistoryActionRef = useRef<'undo' | 'redo' | null>(null);
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
  const { refreshNetworkReport, setRefreshNetworkReport, clearRefreshReport } = useRefreshReport();
  const {
    activeDeviceId, setActiveDeviceId,
    activeDeviceType, setActiveDeviceType,
    selectedDevice, setSelectedDevice,
    clearSelectionTrigger, setClearSelectionTrigger,
    deviceSearchQuery, setDeviceSearchQuery,
    focusDeviceId, setFocusDeviceId,
    clearSelection,
  } = useDeviceSelection();

  const [loadedExampleId, setLoadedExampleId] = useState<string | null>(null);
  const [topologyKey, setTopologyKey] = useState(0);
  // Track last executed command for guided mode
  const [lastCommand, setLastCommand] = useState<string>('');
  const [isAppLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>(
    typeof window !== 'undefined' && localStorage.getItem('lastProjectName') || 'Untitled'
  );
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // Which overlay panel is on top — last clicked wins
  const [focusedOverlay, setFocusedOverlay] = useState<'refresh' | 'packet' | 'pc-info' | 'router-info' | 'switch-info'>('packet');

  // Mobile detection and back button handler
  const isMobile = useIsMobile();
  useMobileBack();

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
    getAvailableProjects
  } = useGuidedMode();

  // Exam Mode hook
  const {
    activeExam,
    isExamActive,
    isPanelMinimized: isExamPanelMinimized,
    startExam: startExamProject,
    finishExam,
    togglePanelMinimize: toggleExamPanelMinimize,
    expandPanel: expandExamPanel,
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

  // Track project name from guided/exam mode
  useEffect(() => {
    if (activeGuidedProject) {
      setProjectName(activeGuidedProject.title);
    } else if (activeExam) {
      setProjectName(activeExam.title);
    }
  }, [activeGuidedProject, activeExam]);

  // Persist project name across refreshes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastProjectName', projectName);
    }
  }, [projectName]);

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
      advanced: t.advancedHint
    }),
    [t]
  );

  const groupedExampleProjects = useMemo(() => {
    const grouping: Record<ExampleProjectLevel, ExampleProject[]> = {
      basic: [],
      intermediate: [],
      advanced: []
    };

    exampleProjects(language).forEach((project) => grouping[project.level].push(project));
    return grouping;
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
    resetAll
  } = useDeviceManager();

  // Zustand store state - using granular selectors to prevent cascading re-renders
  const topologyDevices = useTopologyDevices();
  const topologyConnections = useTopologyConnections();
  const topologyNotes = useTopologyNotes();
  const zoom = useZoom();
  const pan = usePan();
  const activeTab = useActiveTab();
  const environment = useEnvironment();

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

  // Navigation hook (provides history management, device selection, focus)
  const nav = useAppNavigation({
    setActiveTab: (tab) => setActiveTab(tab as any),
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
    switchTabOrTopology, applyDeviceSelection, handleDeviceSelectFromCanvas,
    handleDeviceSelectFromMenu, focusDeviceInTopology,
    navigationHistoryRef, currentNavIndexRef, isInternalNavRef, activeTabRef,
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
    setHasHydrated(true);
  }, []);

  // Bootstrap performance monitoring in development without affecting production UX.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const intervalId = window.setInterval(() => {
      const metrics = performanceMonitor.getMetrics();
      const thresholdStatus = performanceMonitor.checkThresholds();
      (window as any).__netsimPerformance = {
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTopologyDevices((prev) => networkLogic.applyIotAutomationPass(prev));
    }, 250);

    return () => window.clearInterval(interval);
  }, [networkLogic.applyIotAutomationPass, setTopologyDevices]);

  // Function to update device configuration
  const updateDeviceConfig = useCallback((deviceId: string, config: any) => {
    // Update topology devices using functional update to avoid stale closure
    setTopologyDevices(prev =>
      prev.map((d) =>
        d.id === deviceId
          ? {
            ...d,
            ...config,
            iot: config.iot ? { ...d.iot, ...config.iot } : d.iot,
          }
          : d
      )
    );

    // Update deviceStates (CLI hostname)
    if (config.name) {
      setDeviceStates((prev) => {
        const state = prev.get(deviceId);
        if (state) {
          const next = new Map(prev);
          next.set(deviceId, { ...state, hostname: config.name });
          return next;
        }
        return prev;
      });
    }

    // Keep router/switch wlan0 runtime state in sync with web-admin WiFi saves
    if (config.wifi) {
      setDeviceStates((prev) => {
        const state = prev.get(deviceId);
        if (!state || !state.ports?.['wlan0']) return prev;
        const next = new Map(prev);
        next.set(deviceId, {
          ...state,
          ports: {
            ...state.ports,
            wlan0: {
              ...state.ports['wlan0'],
              shutdown: !config.wifi.enabled,
              wifi: {
                ssid: config.wifi.ssid || '',
                security: config.wifi.security || 'open',
                password: config.wifi.password || '',
                channel: config.wifi.channel || '2.4GHz',
                // Keep selected mode even when disabled; shutdown controls operational state.
                mode: config.wifi.mode || 'ap',
              },
            },
          },
        });
        return next;
      });
    }

    // Handle IoT device disconnect - clear IP and WiFi state
    if (config.ip === '' && config.wifi?.enabled === false) {
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

    if (config.firewallRules) {
      setDeviceStates((prev) => {
        const state = prev.get(deviceId);
        if (!state) return prev;
        const updatedState = {
          ...state,
          firewallRules: config.firewallRules,
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
    const handleDeviceUpdate = (event: any) => {
      const { deviceId, config } = event.detail;
      updateDeviceConfig(deviceId, config);
    };

    window.addEventListener('update-topology-device-config', handleDeviceUpdate);
    return () => window.removeEventListener('update-topology-device-config', handleDeviceUpdate);
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
    const handleAddDevice = (event: any) => {
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
          const iotState: any = {
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
          next.set(device.id, iotState);
          return next;
        });
      }
    };

    window.addEventListener('add-topology-device', handleAddDevice);
    return () => window.removeEventListener('add-topology-device', handleAddDevice);
  }, []); // Actions from useAppStore are stable, and functional updates avoid stale data issues.

  // Listen for postMessage from WiFi admin panel to focus device in topology
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
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

      setTopologyConnections((prevConnections) =>
        prevConnections.map((c) => {
          if (c.sourceDeviceId !== deviceId && c.targetDeviceId !== deviceId) return c;
          if (nextStatus === 'offline') return { ...c, active: false };
          const peerId = c.sourceDeviceId === deviceId ? c.targetDeviceId : c.sourceDeviceId;
          const peer = byId.get(peerId);
          return { ...c, active: peer?.status !== 'offline' };
        })
      );

      return nextDevices;
    });
  }, [setTopologyDevices, setTopologyConnections]);

  // Modal drag/resize — unified hook
  const pcDrag = useDrag({ mode: 'drag-resize', storageKey: 'pc-modal-position', defaultSize: { width: 800, height: 600 } });
  const firewallDrag = useDrag({ mode: 'drag-resize', storageKey: 'firewall-modal-position', defaultSize: { width: 600, height: 500 } });
  const unifiedDrag = useDrag({ mode: 'drag-resize', storageKey: 'unified-modal-position', defaultSize: { width: 1200, height: 700 } });

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

  const { pushState, undo, redo, canUndo, canRedo, resetHistory, currentState } = useHistory(getCurrentState());

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
      s: Array.from(initialState.deviceStates.keys()),
      id: initialState.activeDeviceId,
      tab: initialState.activeTab
    });
  }, []); // Run once on mount

  useEffect(() => {
    if (isAppLoading) return;

    const currentState = getCurrentState();
    const stateString = JSON.stringify({
      t: currentState.topologyDevices,
      c: currentState.topologyConnections,
      n: currentState.topologyNotes,
      s: Array.from(currentState.deviceStates.keys()),
      id: currentState.activeDeviceId,
      tab: currentState.activeTab
    });

    if (stateString !== lastPushedStateRef.current) {
      if (isApplyingHistoryRef.current) {
        lastPushedStateRef.current = stateString;
        isApplyingHistoryRef.current = false;
        return;
      }

      // Debounce history pushes
      const timer = setTimeout(() => {
        pushState(currentState, activeTab === 'topology' ? 'topology' : 'ui');
        lastPushedStateRef.current = stateString;
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // If state didn't change but we were applying history, 
      // we still need to clear the flag
      if (isApplyingHistoryRef.current) {
        isApplyingHistoryRef.current = false;
      }
    }
  }, [topologyDevices, topologyConnections, topologyNotes, deviceStates, deviceOutputs, pcOutputs, pcHistories, cableInfo, activeDeviceId, activeDeviceType, zoom, pan, activeTab, isAppLoading, pushState]);

  // Initial App Loading State
  // No longer needed here as it's declared earlier

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
      setTimeout(() => setShowContent(true), 100);
    }, skeletonMs);

    return () => {
      clearTimeout(timer);
      clearTimeout(skeletonTimer);
    };
  }, []);

  // Initialize with empty Map if undefined to prevent SSR errors
  const safeDeviceStates = deviceStates || new Map();
  const safeDeviceOutputs = deviceOutputs || new Map();
  const safePcOutputs = pcOutputs || new Map();
  const safePcHistories = pcHistories || new Map();

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
      setLastTaskEvent(null);
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

  // Per-tab task completion counts for badges
  const completedTasks = isTaskSystemEnabled ? portTasks.filter(task => getTaskStatus(task, state, taskContext)).length +
    vlanTasks.filter(task => getTaskStatus(task, state, taskContext)).length +
    securityTasks.filter(task => getTaskStatus(task, state, taskContext)).length +
    (activeDeviceType !== 'switchL2' ? wirelessTasks.filter(task => getTaskStatus(task, state, taskContext)).length : 0) : 0;

  const { normalizeDeviceType, isValidIpv4, isSameSubnetByMask, getPortAccessVlan, getPeerPortVlan,
    inferEndpointVlan, getServerPoolVlan, hasActivePathBetweenDevices, isDhcpPoolCompatibleForClient,
    buildLinkLocalLease, assignDhcpLeaseForPc, applyLinkLocalToUnconfiguredHosts,
    applyIotAutomationPass: iotAutomationPass } = networkLogic;

  // Persistence hook (provides load/save/autosave operations)
  const persistence = useProjectPersistence({
    t, language, topologyDevices, topologyConnections, topologyNotes,
    deviceStates, deviceOutputs, pcOutputs, pcHistories,
    cableInfo, activeDeviceId, activeDeviceType, activeTab,
    zoom, pan, normalizeDeviceType, applyLinkLocalToUnconfiguredHosts,
    setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories,
    setTopologyDevices: setDevices, setTopologyConnections: setConnections, setTopologyNotes: setNotes,
    setCableInfo, setActiveDeviceId, setActiveDeviceType, setSelectedDevice,
    setActiveTab: (tab: string) => setActiveTab(tab as any), setZoom, setPan,
    setHasUnsavedChanges, setLastSaveTime,
    setShowPCPanel, setShowRouterPanel, setShowUnifiedDeviceModal,
    setRefreshNetworkReport, setIsAppLoading: setIsLoading,
    resetHistory: (state: any) => resetHistory(state),
    setTopologyKey: (fn: (prev: number) => number) => setTopologyKey(fn),
  });

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
    try {
      const saved = localStorage.getItem('draggable_position_refresh-network-report');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const margin = 16;
          const el = refreshReportRef.current;
          const rect = el.getBoundingClientRect();
          el.style.position = 'fixed';
          el.style.left = `${Math.max(margin - rect.width, Math.min(parsed.x, vw - margin))}px`;
          el.style.top = `${Math.max(margin - rect.height, Math.min(parsed.y, vh - margin))}px`;
          el.style.right = 'auto';
          el.style.bottom = 'auto';
          el.style.transform = 'none';
        }
      }
    } catch { /* ignore */ }
  }, [refreshNetworkReport?.show]);

  // Load project from JSON data
  const loadProjectData = useCallback((projectData: unknown, options?: { keepActiveDevice?: boolean }) => {
    try {
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
          const stateItem = safeDevices.find((d: any) => d.id === item.id);
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
      }

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
        setTopologyNotes(safeTopologyNotes);
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

      // Close all overlay panels when loading a project
      setShowPCPanel(false);
      setShowRouterPanel(false);
      setShowUnifiedDeviceModal(false);
      setRefreshNetworkReport(null);

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
      toast({
        variant: 'destructive',
        title: t.invalidProject,
        description: t.corruptedProject,
      });
      return false;
    }
  }, [setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories, setTopologyDevices, setTopologyConnections, setTopologyNotes, setCableInfo, setActiveDeviceId, setActiveDeviceType, setSelectedDevice, setActiveTab, setTopologyKey, setHasUnsavedChanges, resetHistory, toast, setZoom, setPan, language, normalizeDeviceType, applyLinkLocalToUnconfiguredHosts, setShowPCPanel, setShowRouterPanel, setShowUnifiedDeviceModal, setRefreshNetworkReport]);

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    let savedData: string | null = null;
    try { savedData = localStorage.getItem('netsim_autosave'); } catch { /* storage unavailable */ }
    if (savedData) {
      try {
        const projectData = safeParse<unknown>(savedData);
        loadProjectData(projectData, { keepActiveDevice: true });
        // Load last save time from timestamp
        const parsedProject = (projectData && typeof projectData === 'object') ? projectData as Record<string, unknown> : null;
        if (parsedProject?.timestamp) {
          const date = new Date(String(parsedProject.timestamp));
          setLastSaveTime(date.toLocaleTimeString());
        } else {
          setLastSaveTime(new Date().toLocaleTimeString());
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
            setPcOutputs(prev => new Map(prev).set(deviceToRenew.id, updatedOut as any));
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
          let currentTopology = [...topologyDevices];
          let hasOverallChanges = false;
          const assignments: Array<{ name: string, ip: string }> = [];

          for (let i = 0; i < pcDevices.length; i++) {
            const pc = pcDevices[i];
            const lease = assignDhcpLeaseForPc(pc, currentTopology) || buildLinkLocalLease(pc, currentTopology);

            if (lease) {
              const { ip: newIp, subnet, gateway, dns } = lease as any;
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
                  setPcOutputs(prev => new Map(prev).set(pc.id, updatedOut as any));
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
                      <span className="text-blue-400">{asgn.ip}</span>
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
        setLoadedExampleId(null);
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

  // Broadcast to other components (like NetworkTopology)
  const broadcastCloseMenus = useCallback((source: string) => {
    window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source } }));
  }, []);

  const closeLocalMenus = useCallback((exclude?: string) => {
    if (exclude !== 'mobile') setShowMobileMenu(false);
    if (exclude !== 'modal') {
      setConfirmDialog(null);
      setSaveDialog(null);
    }
  }, [setShowMobileMenu, setConfirmDialog, setSaveDialog]);

  const openMobileMenu = useCallback(() => {
    const nextState = !showMobileMenu;
    if (nextState) {
      closeLocalMenus('mobile');
      broadcastCloseMenus('mobile');
    }
    setShowMobileMenu(nextState);
  }, [showMobileMenu, closeLocalMenus, broadcastCloseMenus]);

  const resetTopologyView = useCallback(() => {
    const nextZoom = 1.0;
    const PADDING = 10;
    setZoom(nextZoom);

    if (topologyDevices.length === 0 && topologyNotes.length === 0) {
      setPan({ x: 0, y: 0 });
      return;
    }

    const minDeviceX = topologyDevices.reduce((acc, d) => Math.min(acc, d.x), Infinity);
    const minDeviceY = topologyDevices.reduce((acc, d) => Math.min(acc, d.y), Infinity);
    const minNoteX = topologyNotes.reduce((acc, n) => Math.min(acc, n.x), Infinity);
    const minNoteY = topologyNotes.reduce((acc, n) => Math.min(acc, n.y), Infinity);
    const minX = Math.min(minDeviceX, minNoteX);
    const minY = Math.min(minDeviceY, minNoteY);

    setPan({ x: PADDING - minX * nextZoom, y: PADDING - minY * nextZoom });
  }, [topologyDevices, topologyNotes, setZoom, setPan]);



  // Handle command using active device
  const handleCommand = useCallback(async (command: string) => {
    // Track command for guided mode completion checking
    setLastCommand(command);

    const result = await handleCommandForDevice(
      activeDeviceId,
      command,
      topologyDevices,
      setActiveDeviceId,
      setActiveDeviceType,
      topologyConnections
    );

    if (result?.exitSession) {
      setActiveTab('topology');
    }
  }, [activeDeviceId, handleCommandForDevice, topologyDevices, topologyConnections, setActiveDeviceId, setActiveDeviceType, setActiveTab, setLastCommand]);

  const prompt = getPrompt(state);

  const handleExecuteCommand = useCallback(async (deviceId: string, command: string) => {
    return handleCommandForDevice(
      deviceId,
      command,
      topologyDevices,
      setActiveDeviceId,
      setActiveDeviceType,
      topologyConnections
    );
  }, [handleCommandForDevice, topologyDevices, topologyConnections, setActiveDeviceId, setActiveDeviceType]);

  const handleReset = () => {
    setConfirmDialog({
      show: true,
      message: t.resetConfirm,
      action: 'reset',
      onConfirm: () => {
        setConfirmDialog(null);
        resetAll(topologyDevices);
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    });
  };

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

  // Handle topology change from NetworkTopology component
  const handleTopologyChange = useCallback((devices: CanvasDevice[], connections: CanvasConnection[], notes: CanvasNote[]) => {
    setTopologyDevices(devices);
    setTopologyConnections(connections);
    setTopologyNotes(notes);
    setHasUnsavedChanges(true);

    // Sync port status from topology to deviceStates
    setDeviceStates(prev => {
      const newMap = new Map(prev);
      let changed = false;

      devices.forEach(topoDevice => {
        const state = newMap.get(topoDevice.id);
        if (state && state.ports) {
          const updatedPorts = { ...state.ports };
          let portChanged = false;

          topoDevice.ports.forEach(topoPort => {
            const statePort = updatedPorts[topoPort.id];
            if (statePort) {
              // Translate UI status → simulator status
              // UI 'connected' → simulator 'connected'
              // UI 'disconnected' → simulator 'notconnect'
              const targetSimStatus = topoPort.status === 'connected' ? 'connected' : 'notconnect';
              if (statePort.status !== targetSimStatus) {
                updatedPorts[topoPort.id] = {
                  ...statePort,
                  status: targetSimStatus
                };
                portChanged = true;
              }
            }
          });

          if (portChanged) {
            newMap.set(topoDevice.id, {
              ...state,
              ports: updatedPorts
            });
            changed = true;
          }
        }
      });

      return changed ? newMap : prev;
    });
  }, [setTopologyDevices, setTopologyConnections, setTopologyNotes, setHasUnsavedChanges, setDeviceStates]);

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
        return prev.filter(d => d.id !== deviceId).map(device => {
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
        adjustedPcOutputs.set(iotId, filteredOutput as any);
        adjustedDeviceOutputs.delete(iotId);
      }
    });

    // Optimization: Limit terminal outputs to last 100 lines to reduce file size
    const MAX_SAVED_OUTPUT_LINES = 100;
    const trimOutputs = (outputs: any[]) => {
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
      // Reset cableInfo if no valid devices exist or no connections
      cableInfo: topologyDevices.length > 0 && topologyConnections.length > 0 ? cableInfo : { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
      activeDeviceId: topologyDevices.find(d => d.id === activeDeviceId)?.id || '',
      activeDeviceType
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
  }, [deviceStates, deviceOutputs, pcOutputs, pcHistories, topologyDevices, topologyConnections, topologyNotes, cableInfo, activeDeviceId, activeDeviceType, setHasUnsavedChanges, setLastSaveTime, language, projectName, setProjectName]);

  // Handle Project Saving (Wrapper)
  function handleSaveProject() {
    handleSaveProjectInternal();
  }

  // New project - reset everything
  const resetToEmptyProject = useCallback(() => {
    const usedIps = new Set<string>();
    const pc1LinkLocal = generateRandomLinkLocalIpv4(usedIps);
    usedIps.add(pc1LinkLocal);
    const pc2LinkLocal = generateRandomLinkLocalIpv4(usedIps);
    usedIps.add(pc2LinkLocal);

    // Clear all states and set defaults
    setDeviceStates(new Map());
    setDeviceOutputs(new Map());
    setPcOutputs(new Map());
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
    setTopologyConnections([]);
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
    finishExam();
    setProjectName('Untitled');

    // Close network refresh report if open
    setRefreshNetworkReport(null);

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
    setConfirmDialog({
      show: true,
      message: t.newProjectConfirm,
      action: 'new-project',
      onConfirm: () => {
        setConfirmDialog(null);
        action();
      }
    });
  }, [hasUnsavedChanges, handleSaveProject, setSaveDialog, setConfirmDialog, t.unsavedChangesConfirm, t.newProjectConfirm]);

  function handleNewProject() {
    setProjectSearchQuery(''); // Reset search when opening new project dialog
    setShowProjectPicker(true);
  }

  // Sync hostname changes between Topology and Simulator
  useEffect(() => {
    if (!topologyDevices) return;

    let topologyChanged = false;
    let simulatorChanged = false;
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
      setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
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
      setShowPCPanel(false);
      setShowRouterPanel(false);
      setShowUnifiedDeviceModal(false);
      setShowAboutModal(false);
      setShowProjectPicker(false);
      setShowOnboarding(false);
      window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'back' } }));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setShowMobileMenu, setConfirmDialog, setSaveDialog, setShowPCPanel, setShowRouterPanel, setShowUnifiedDeviceModal, setShowAboutModal, setShowProjectPicker, setShowOnboarding]);

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

  // Helper: tab açıklamaları (tooltip için)
  const getTabDescription = useCallback((tabId: TabType): string => {
    switch (tabId) {
      case 'topology':
        return t.tabDescTopology;
      case 'cmd':
        return t.tabDescCmd;
      case 'terminal':
        return t.tabDescTerminal;
      case 'tasks':
        return t.tabDescTasks;
      default:
        return '';
    }
  }, [t]);

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

  const handleTabHoverGlow = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);

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
          gateway: firstValue(device.gateway, state?.defaultGateway),
          ipv6: firstValue(device.ipv6, portIpv6),
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

    let refreshCount = 0;
    let disconnectedPCs: string[] = [];
    let disconnectedAPs: string[] = [];
    let connectedWirelessClients: string[] = [];
    let activeAPs: string[] = [];
    let dhcpServerActiveCount = 0;
    let dhcpServerNoPoolCount = 0;
    let dhcpClientWithLeaseCount = 0;
    let dhcpClientNoLeaseCount = 0;
    let duplicateIpCount = 0;
    let duplicateMacCount = 0;
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

        refreshCount++;
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
        refreshCount++;
      });

      // 3. VTP propagation (server -> client over trunk)
      const vtpUpdatedStates = propagateVtpVlans(refreshedDevices, releasedDeviceStates, sanitizedConnections);
      let stpUpdatedStates = new Map(vtpUpdatedStates);
      let stpUpdatedCount = 0;

      refreshedDevices.forEach((device) => {
        if (device.type !== 'switchL2' && device.type !== 'switchL3') return;
        const state = stpUpdatedStates.get(device.id);
        if (!state) return;

        stpUpdatedStates = calculatePVST(state, {
          connections: sanitizedConnections,
          devices: refreshedDevices,
          deviceStates: stpUpdatedStates,
        }, device.id) as Map<string, SwitchState>;
        stpUpdatedCount++;
      });

      // 8.5. DHCP Assignment - Do this before showing the refresh panel
      const dhcpClients = refreshedDevices.filter(d => (d.type === 'pc' || d.type === 'iot') && d.ipConfigMode === 'dhcp');
      const dhcpAssignments: Array<{ name: string, ip: string }> = [];
      let finalDevicesForRefresh = [...refreshedDevices];

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
                setPcOutputs(prev => new Map(prev).set(pc.id, updatedOut as any));
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
                    <span className="text-blue-400">{asgn.ip}</span>
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
              status: statePort.status as CanvasPortStatus,
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
        const cliPools = cliPoolEntries.map((pool: any) => {
          const networkPrefix = (pool?.network || '').split('.').slice(0, 3).join('.');
          return {
            startIp: pool?.startIp || (networkPrefix ? `${networkPrefix}.100` : ''),
            maxUsers: Number(pool?.maxUsers || 50),
          };
        }).filter((p: any) => p.startIp);
        const poolCount = topologyPools.length + runtimePools.length + cliPools.length;
        const dhcpEnabled = !!(device.services?.dhcp?.enabled || state?.services?.dhcp?.enabled || cliPoolEntries.length > 0);

        if (dhcpEnabled) {
          if (poolCount > 0) dhcpServerActiveCount++;
          else dhcpServerNoPoolCount++;
        }

        topologyPools.forEach((p) => allDhcpPools.push({ startIp: p.startIp, maxUsers: Number(p.maxUsers || 50) }));
        runtimePools.forEach((p) => allDhcpPools.push({ startIp: p.startIp, maxUsers: Number(p.maxUsers || 50) }));
        cliPools.forEach((p: any) => allDhcpPools.push({ startIp: p.startIp, maxUsers: Number(p.maxUsers || 50) }));
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
      const rememberIdentity = (deviceName: string, ip?: string, mac?: string) => {
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
      };

      iotProcessedDevices.forEach((device) => {
        const state = portSecurityUpdatedStates.get(device.id);
        const deviceName = device.name || device.id;
        rememberIdentity(deviceName, device.ip, device.macAddress);
        Object.values(state?.ports || {}).forEach((port: any) => {
          rememberIdentity(`${deviceName}:${String(port?.id || '')}`, port?.ipAddress, port?.macAddress);
        });
      });
      duplicateIpCount = Array.from(ipOwners.values()).filter((owners) => owners.length > 1).length;
      duplicateMacCount = Array.from(macOwners.values()).filter((owners) => owners.length > 1).length;

      iotProcessedDevices.forEach((device) => {
        if ((device.type !== 'pc' && device.type !== 'iot') || !device.gateway || !isValidIpv4(device.ip) || !isValidIpv4(device.subnet)) return;
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

      // 9. Show detailed notification (delayed if DHCP assignments were made)
      const showRefreshPanel = () => {
        const totalDevices = connectedWirelessClients.length + activeAPs.length + disconnectedPCs.length + disconnectedAPs.length;
        const stpMessage = stpUpdatedCount > 0
          ? `✓ ${t.stpSwitchesUpdated.replace('X', String(stpUpdatedCount))}`
          : '';
        const portSecurityMessage = (portSecurityViolationCount > 0 || portSecurityRecoveredCount > 0)
          ? `🔒 ${t.portSecurityBlocked.replace('X', String(portSecurityViolationCount)).replace('Y', String(portSecurityRecoveredCount))}`
          : '';
        const topologyMessage = invalidCount > 0
          ? `${t.topologyInvalidConnections.replace('X', String(invalidCount))}`
          : '';
        const duplicateIpDetails = Array.from(ipOwners.entries())
          .filter(([, owners]) => owners.length > 1)
          .map(([ip, owners]) => `${ip}: ${owners.join(', ')}`)
          .join('\n');
        const validationMessages = [
          duplicateIpCount > 0
            ? (language === 'tr'
              ? `⚠ Duplicate IP (${duplicateIpCount}):\n${duplicateIpDetails}`
              : `⚠ Duplicate IP (${duplicateIpCount}):\n${duplicateIpDetails}`)
            : '',
          duplicateMacCount > 0 ? `⚠ Duplicate MAC: ${duplicateMacCount}` : '',
          subnetMismatchCount > 0 ? `⚠ Subnet mismatch: ${subnetMismatchCount}` : '',
          invalidGatewayCount > 0 ? `⚠ Invalid gateway: ${invalidGatewayCount}` : '',
          disconnectedLinkCount > 0 ? `⚠ Disconnected link: ${disconnectedLinkCount}` : '',
          loopDetectedCount > 0 ? `⚠ Loop detected` : '',
          vlanInconsistencyCount > 0 ? `⚠ VLAN inconsistency: ${vlanInconsistencyCount}` : '',
        ].filter(Boolean);

        if (totalDevices > 0 || dhcpClients.length > 0) {
          const wifiMessages = [];
          if (connectedWirelessClients.length > 0) {
            wifiMessages.push(language === 'tr'
              ? `✓ ${connectedWirelessClients.length} kablosuz istemci bağlandı`
              : `✓ ${connectedWirelessClients.length} wireless clients connected`);
          }
          if (activeAPs.length > 0) {
            wifiMessages.push(language === 'tr'
              ? `✓ ${activeAPs.length} AP aktif`
              : `✓ ${activeAPs.length} AP active`);
          }
          if (disconnectedPCs.length > 0) {
            wifiMessages.push(language === 'tr'
              ? `⚠ ${disconnectedPCs.length} kablosuz istemci bağlantı yok`
              : `⚠ ${disconnectedPCs.length} wireless clients disconnected`);
          }
          if (disconnectedAPs.length > 0) {
            wifiMessages.push(language === 'tr'
              ? `⚠ ${disconnectedAPs.length} AP istemci yok`
              : `⚠ ${disconnectedAPs.length} AP no clients`);
          }

          // Show combined WiFi status as a single toast
          if (wifiMessages.length > 0) {
            toast({
              title: `📶 ${t.wirelessStatus}`,
              description: wifiMessages.join('\n'),
              duration: 4000,
            });
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
              : `DHCP: ${dhcpServerActiveCount} active servers`,
            language === 'tr'
              ? `${dhcpClientWithLeaseCount} istemci kiraladı`
              : `${dhcpClientWithLeaseCount} clients leased`,
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
            devices: refreshDeviceSummaries
          });
        } else {
          const isDhcpMissing = dhcpServerActiveCount === 0 && dhcpClientWithLeaseCount === 0;
          const dhcpSummary = isDhcpMissing
            ? t.dhcpNotFound
            : (language === 'tr'
              ? `DHCP: ${dhcpServerActiveCount} sunucu aktif, ${dhcpClientWithLeaseCount} lease`
              : `DHCP: ${dhcpServerActiveCount} active servers, ${dhcpClientWithLeaseCount} leases`);

          setRefreshNetworkReport({
            show: true,
            title: t.networkRefreshed,
            dhcpMessages: [
              stpMessage
                ? `${dhcpSummary} • ${stpMessage}`
                : (isDhcpMissing
                  ? dhcpSummary
                  : `${t.noWifiDevices} • ${dhcpSummary}`)
            ],
            stpMessage: '',
            portSecurityMessage: '',
            topologyMessage,
            devices: refreshDeviceSummaries
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
        closeEscLikeWindows();
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
      const { topologyDevices: updatedDevices, topologyConnections: updatedConnections } = (event as CustomEvent).detail;
      if (updatedDevices && updatedConnections) {
        // Create context for STP calculation
        const ctx = {
          connections: updatedConnections,
          devices: updatedDevices,
          deviceStates: deviceStates
        };

        // Perform PVST calculation for all devices
        // We pick an arbitrary device as source for the calculation context, 
        // calculatePVST handles the global update.
        const firstSwitch = updatedDevices.find((d: any) => d.type === 'switchL2' || d.type === 'switchL3');
        if (!firstSwitch) return;

        const firstSwitchState = deviceStates.get(firstSwitch.id);
        if (!firstSwitchState) return;

        const allUpdatedStates = calculatePVST(firstSwitchState, ctx, firstSwitch.id);
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

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const projectData = safeParse<unknown>(e.target?.result as string);
        if (loadProjectData(projectData)) {
          setHasUnsavedChanges(false);
          const loadedName = file.name.replace(/\.[^/.]+$/, '');
          setProjectName(loadedName);
          // Close guided mode panel if open
          closeGuidedMode();
          // Close network refresh report if open
          setRefreshNetworkReport(null);
          toast({
            title: `"${loadedName}" ${language === 'tr' ? 'projesi yüklendi' : 'project is loaded'}`,
            description: t.fileImportedSuccessfully,
          });
          // Reset zoom and pan to top-left
          setZoom(1.0);
          setPan({ x: 0, y: 0 });
          if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
          }
        } else {
          toast({
            title: t.invalidProjectFile,
            description: t.invalidProjectFile,
            variant: "destructive",
          });
        }
      } catch (error) {
        errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'fileUpload', error: String(error) }));
        toast({
          title: t.loadFailed,
          description: formatErrorForUser(error as Error, t.failedLoadProject).userMessage,
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  }, [loadProjectData, setHasUnsavedChanges, t.invalidProjectFile, t.failedLoadProject, language, setZoom, setPan, closeGuidedMode, setProjectName]);

  const applyExampleProject = useCallback((projectData: any, exampleId?: string) => {
    loadProjectData(projectData);
    setRefreshNetworkReport(null);
    if (exampleId) {
      setLoadedExampleId(exampleId);
      // Look up example project title
      for (const level of exampleLevelOrder) {
        const projects = groupedExampleProjects[level];
        if (projects) {
          const found = projects.find(p => p.id === exampleId);
          if (found) {
            setProjectName(found.title);
            break;
          }
        }
      }
    }
    setShowProjectPicker(false);
    // Close guided/exam mode panel if open (unless it's a guided project itself)
    closeGuidedMode();
    finishExam();

    // Reset zoom and pan to top-left
    setZoom(1.0);
    setPan({ x: 0, y: 0 });

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [loadProjectData, setShowProjectPicker, setZoom, setPan, closeGuidedMode, setProjectName, setLoadedExampleId, setRefreshNetworkReport, groupedExampleProjects, exampleLevelOrder]);

  const isDark = (effectiveTheme ?? theme) === 'dark';

  // Helper function to truncate long names with an ellipsis
  const truncateWithEllipsis = useCallback((text: string, maxLength: number) => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }, []);

  return (
    <AppErrorBoundary fallbackTitle={t.applicationError}>
      <div className={cn("h-dvh w-full flex flex-col relative transition-colors duration-700 overflow-x-hidden", isAppLoading ? 'bg-slate-950' : (isDark ? 'bg-slate-950' : 'bg-slate-50'))}>
        {!isAppLoading && (
          <div className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-20 transition-opacity duration-1000">
            <div className="absolute inset-0 mesh-gradient animate-liquid blur-[100px] scale-150 rotate-12" />
            <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/40" />
          </div>
        )}
        {/* App Loading Screen */}
        {isAppLoading && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center animate-scale-in">
              <div className="relative mb-8">
                <div className="p-2 animate-glitch">
                  <Image src="/app.png" alt="Logo" width={64} height={64} className="w-16 h-16 object-contain" priority />
                </div>
                {/* Glitch overlays */}
                <div className="absolute inset-0 p-4 rounded-2xl bg-red-500/30 animate-glitch-skew mix-blend-screen" />
                <div className="absolute inset-0 p-4 rounded-2xl bg-blue-500/30 animate-glitch mix-blend-screen" style={{ animationDelay: '0.1s' }} />
              </div>

              <h1
                className="text-3xl font-black tracking-tighter text-white glitch-text mb-2 text-center"
                data-text="NETWORK SIMULATOR"
              >
                NETWORK SIMULATOR
              </h1>

              <div className="flex items-center gap-2 mt-4">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-xs font-bold tracking-widest text-cyan-500 ">
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
                <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
                  <Monitor className="h-5 w-5" />
                  Multiple Tabs Active
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You have {tabCount} tabs of Network Simulator open. Each tab now saves its own data independently, so you can work in multiple tabs without conflicts.
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      ✅ Each tab has isolated storage
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
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
            startGuidedProject={startGuidedProject}
            startExamProject={startExamProject}
            loadProjectData={loadProjectData}
            setZoom={setZoom}
            setPan={setPan}
            closeProjectPicker={() => setShowProjectPicker(false)}
          />}


          {showOnboarding && <OnboardingDialog
            open={showOnboarding}
            onOpenChange={setShowOnboarding}
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
            <AlertDialogContent className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
              <AlertDialogHeader>
                <AlertDialogTitle className={isDark ? 'text-white' : 'text-slate-900'}>
                  {t.confirmationRequired}
                </AlertDialogTitle>
                <AlertDialogDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  {confirmDialog?.message}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className={isDark ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : ''}>
                  {t.cancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    confirmDialog?.onConfirm();
                    focusActiveTerminalInput();
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
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
            <AlertDialogContent className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
              <AlertDialogHeader>
                <AlertDialogTitle className={isDark ? 'text-white' : 'text-slate-900'}>
                  {t.saveProject}
                </AlertDialogTitle>
                <AlertDialogDescription className={isDark ? 'text-slate-400' : 'text-slate-500'}>
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
                  className={isDark ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : ''}
                >
                  {t.dontSave}
                </Button>
                <AlertDialogAction
                  onClick={() => {
                    saveDialog?.onConfirm(true);
                    focusActiveTerminalInput();
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {t.saveLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Unified Device Panel (CLI + Tasks) */}
          {showUnifiedDeviceModal && <UnifiedDevicePanel
            isOpen={showUnifiedDeviceModal}
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
          />}

          {/* Firewall Configuration Modal */}
          {showFirewallPanel && <Dialog open={showFirewallPanel} onOpenChange={(open) => {
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
                "p-0 overflow-visible flex flex-col top-auto left-auto translate-x-0 translate-y-0 shadow-[0_35px_120px_rgba(15,23,42,0.35)] liquid-glass-light",
                isDark
                  ? "bg-slate-950/80 border-white/10 backdrop-blur-2xl"
                  : "bg-white/70 border-white/70 backdrop-blur-2xl"
              )}
              data-modal-content
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
              }}
            >
              <div className={cn(
                "relative flex flex-col h-full overflow-visible",
                !isMobile ? 'rounded-2xl' : 'rounded-none'
              )}>
                <DialogHeader
                  className={cn(
                    "p-3 sm:p-4 border-b cursor-grab active:cursor-grabbing select-none touch-none sticky top-0 z-10 backdrop-blur-xl",
                    isDark ? "border-white/10 bg-slate-900/75" : "border-white/70 bg-white/80"
                  )}
                  data-modal-header
                  onPointerDown={(e) => firewallDrag.handlePointerDown(e, 'firewall')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <DialogTitle className={cn("font-semibold truncate", isDark ? 'text-white' : 'text-slate-900')}>
                        {isTR ? 'Firewall' : 'Firewall'} - {topologyDevices?.find((d: any) => d.id === activeFirewallId)?.name || activeFirewallId}
                      </DialogTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Power Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-amber-500/20 hover:text-amber-500"
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
                        <Power className={cn("h-3.5 w-3.5", topologyDevices.find(d => d.id === activeFirewallId)?.status === 'offline' ? 'text-red-500' : 'text-green-500')} />
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
                        className="h-6 w-6 hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
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
                      device={topologyDevices.find(d => d.id === activeFirewallId)!}
                      t={t}
                      theme={theme}
                      isDevicePoweredOff={topologyDevices.find(d => d.id === activeFirewallId)?.status === 'offline'}
                      onUpdateRules={(rules) => {
                        updateDeviceConfig(activeFirewallId, { firewallRules: rules });
                      }}
                      deviceStates={deviceStates}
                      deviceOutputs={deviceOutputs}
                      onExecuteCommand={(cmd) => handleExecuteCommand(activeFirewallId!, cmd)}
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
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none bg-transparent hover:bg-red-500/10"
                      onPointerDown={(e) => firewallDrag.handleResizeStart(e, 'w', 'firewall')}
                    />
                    <div
                      className="absolute -right-[5px] top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none rounded-r-lg bg-transparent hover:bg-red-500/20"
                      onPointerDown={(e) => firewallDrag.handleResizeStart(e, 'e', 'firewall')}
                    />
                    <div
                      className="absolute -bottom-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-b-lg bg-transparent hover:bg-red-500/20"
                      onPointerDown={(e) => firewallDrag.handleResizeStart(e, 's', 'firewall')}
                    />
                    <TooltipWrapper title={t.resizeAction}>
                      <div
                        className="absolute -bottom-2 -right-2 z-20 h-7 w-7 cursor-se-resize select-none touch-none rounded-tl-lg rounded-br-lg border border-slate-400/30 bg-slate-500/30 text-slate-100/80 hover:bg-red-500/30 hover:text-white flex items-center justify-center"
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
          </Dialog>}

          {/* PC Terminal Modal */}
          {showPCPanel && <Dialog open={showPCPanel} onOpenChange={setShowPCPanel} modal={false}>
            <DialogContent
              showCloseButton={false}
              onEscapeKeyDown={(e) => e.preventDefault()}
              className={cn(
                "p-0 overflow-visible flex flex-col top-auto left-auto translate-x-0 translate-y-0 shadow-[0_35px_120px_rgba(15,23,42,0.35)] liquid-glass-light",
                isDark
                  ? "bg-slate-950/80 border-white/10 backdrop-blur-2xl"
                  : "bg-white/70 border-white/70 backdrop-blur-2xl"
              )}
              data-modal-content
              style={{
                position: 'fixed',
                left: !isMobile ? pcDrag.position.x : 0,
                top: !isMobile ? pcDrag.position.y : 0,
                width: !isMobile ? `${pcDrag.size.width}px` : '100vw',
                height: !isMobile ? `${pcDrag.size.height}px` : '100vh',
                maxWidth: 'none',
                maxHeight: 'none',
                borderRadius: !isMobile ? '1rem' : 0,
                borderWidth: 3,
              }}
            >
              <div className={cn(
                "relative flex flex-col h-full overflow-visible",
                !isMobile ? 'rounded-2xl' : 'rounded-none'
              )}>
                <DialogHeader
                  className={cn(
                    "p-3 sm:p-4 border-b cursor-grab active:cursor-grabbing select-none touch-none sticky top-0 z-10 backdrop-blur-xl",
                    isDark ? "border-white/10 bg-slate-900/75" : "border-white/70 bg-white/80"
                  )}
                  data-modal-header
                  onPointerDown={(e) => pcDrag.handlePointerDown(e, 'pc')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <DialogTitle className={isDark ? 'text-white font-semibold' : 'text-slate-900 font-semibold'}>
                        {t.pcTerminal} - {topologyDevices?.find((d: any) => d.id === showPCDeviceId)?.name || showPCDeviceId}
                      </DialogTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
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
                    key={`pc-panel-${showPCDeviceId}`}
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
                  />
                </div>
                {/* Resize handles - hidden on mobile */}
                {!isMobile && (
                  <>
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none bg-transparent hover:bg-cyan-500/10"
                      onPointerDown={(e) => pcDrag.handleResizeStart(e, 'w', 'pc')}
                    />
                    <div
                      className="absolute -right-[5px] top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none rounded-r-lg bg-transparent hover:bg-cyan-500/20"
                      onPointerDown={(e) => pcDrag.handleResizeStart(e, 'e', 'pc')}
                    />
                    <div
                      className="absolute -bottom-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-b-lg bg-transparent hover:bg-cyan-500/20"
                      onPointerDown={(e) => pcDrag.handleResizeStart(e, 's', 'pc')}
                    />
                    <TooltipWrapper title={t.resizeAction}>
                      <div
                        className="absolute -bottom-2 -right-2 z-20 h-7 w-7 cursor-se-resize select-none touch-none rounded-tl-lg rounded-br-lg border border-slate-400/30 bg-slate-500/30 text-slate-100/80 hover:bg-cyan-500/30 hover:text-white flex items-center justify-center"
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
          </Dialog>}

          {/* Router Info Panel Modal */}
          {showRouterPanel && <RouterPanel
            deviceId={showRouterDeviceId}
            isVisible={showRouterPanel}
            onClose={() => setShowRouterPanel(false)}
            topologyDevices={topologyDevices || undefined}
            deviceStates={deviceStates}
            cableInfo={cableInfo}
          />}

          {/* Main Content - Fits between header and footer with scroll */}
          <main className={`overflow-hidden flex flex-col min-h-0 h-[calc(100vh-44px)] pt-[72px] ${activeTab === 'topology' ? 'md:pt-[120px]' : 'md:pt-[72px]'}`}>
            <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Tab Content - Always render but hide non-active */}
              <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'topology' ? 'flex' : 'hidden'} print:flex`}>
                {/* Topology Toolbar */}
                {activeTab === 'topology' && (
                  <TopologyToolbar
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
                    setDeviceSearchQuery={setDeviceSearchQuery}
                    setCableInfo={setCableInfo}
                    setZoom={setZoom}
                    setPan={setPan}
                    handleDeviceSelectFromMenu={handleDeviceSelectFromMenu}
                    handleUndo={handleUndo}
                    handleRedo={handleRedo}
                    handleRefreshNetwork={handleRefreshNetwork}
                    setIsEnvironmentPanelOpen={setIsEnvironmentPanelOpen}
                  />
                )}
                {/* Network Topology fills remaining space */}
                <div ref={topologyContainerRef} className="flex-1 w-full h-full min-h-0 overflow-hidden">
                  <NetworkTopology
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
                  />

                  {/* PC Info Popover - Bottom Right Mini Panel */}
                  {activeDeviceId && (activeDeviceId.startsWith('pc-') || topologyDevices?.find(d => d.id === activeDeviceId)?.type === 'pc') && topologyDevices && topologyDevices.find(d => d.id === activeDeviceId) && (
                    <PCInfoPopover
                      pc={topologyDevices.find(d => d.id === activeDeviceId)!}
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

                  {/* Router Info Popover - Bottom Right Mini Panel */}
                  {activeDeviceId && (activeDeviceId.startsWith('router-') || topologyDevices?.find(d => d.id === activeDeviceId)?.type === 'router') && topologyDevices && (
                    <RouterInfoPopover
                      router={topologyDevices.find(d => d.id === activeDeviceId)!}
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

            {/* Network Refresh Report - Top Right Toast */}
            {
              refreshNetworkReport?.show && (
                <div
                  ref={refreshReportRef}
                  data-draggable-id="refresh-network-report"
                  className={`fixed top-20 right-4 w-full max-w-sm rounded-xl border shadow-2xl animate-in slide-in-from-right-full duration-300 backdrop-blur-md select-none ${isDark
                    ? 'bg-zinc-950/40 border-zinc-800/50 text-zinc-100 shadow-black/40'
                    : 'bg-white/40 border-zinc-200/50 text-zinc-900 shadow-zinc-200/50'
                    }`}
                  style={{
                    zIndex: focusedOverlay === 'refresh' ? 35 : 30,
                    // On mobile, ensure it's below header (60px) + some margin
                    ...(isMobile ? { top: '80px' } : {})
                  }}
                  onMouseDown={() => setFocusedOverlay('refresh')}
                >
                  <div
                    className={`flex items-center justify-between px-3 py-2 border-b rounded-t-xl cursor-grab active:cursor-grabbing select-none ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                    data-drag-handle
                  >
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      {refreshNetworkReport.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      <TooltipWrapper title={t.refreshNetwork}>
                        <button
                          onClick={() => { handleRefreshNetwork(); }}
                          className="w-5 h-5 rounded-md bg-blue-500 hover:bg-blue-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
                        >
                          <RefreshCw className="w-3 h-3 text-white pointer-events-none" />
                        </button>
                      </TooltipWrapper>
                      <TooltipWrapper title={t.close}>
                        <button
                          onClick={() => setRefreshNetworkReport(prev => prev ? { ...prev, show: false } : null)}
                          className="w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
                        >
                          <X className="w-3 h-3 text-white pointer-events-none" />
                        </button>
                      </TooltipWrapper>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    {refreshNetworkReport.dhcpMessages.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 opacity-80">
                        {refreshNetworkReport.dhcpMessages.map((msg, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span>{msg}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {refreshNetworkReport.stpMessage && (
                      <div className="text-pink-500 font-medium py-0.5 px-2 bg-pink-500/10 rounded-lg w-fit">
                        {refreshNetworkReport.stpMessage}
                      </div>
                    )}

                    {refreshNetworkReport.portSecurityMessage && (
                      <div className="text-red-500 font-medium py-0.5 px-2 bg-red-500/10 rounded-lg w-fit">
                        {refreshNetworkReport.portSecurityMessage}
                      </div>
                    )}

                    {refreshNetworkReport.topologyMessage && (
                      <div className="text-amber-500 font-medium py-0.5 px-2 bg-amber-500/10 rounded-lg w-fit">
                        {refreshNetworkReport.topologyMessage}
                      </div>
                    )}

                    <div className={`pt-2 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
                      <RefreshDeviceListToast devices={refreshNetworkReport.devices} language={language} />
                    </div>
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
          />

          {showAboutModal && <LazyAboutModal
            isOpen={showAboutModal}
            onClose={() => setShowAboutModal(false)}
            onStartTour={() => {
              setShowAboutModal(false);
              setShowOnboarding(true);
              setOnboardingStep(0);
            }}
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
            deviceAccessed={showUnifiedDeviceModal ? (activeDeviceType === 'switchL2' || activeDeviceType === 'switchL3' ? 'switch' : activeDeviceType === 'router' ? 'router' : 'pc') : null}
            deviceState={state}
            topologyConnections={topologyConnections}
            topologyDevices={topologyDevices}
            onCheckAutoComplete={checkStepCompletionWithContext}
          />}

          {/* Exam Mode Panel */}
          {isExamActive && <ExamModePanel
            project={activeExam}
            onClose={finishExam}
            onMinimize={toggleExamPanelMinimize}
            isMinimized={isExamPanelMinimized}
            score={examScore}
            lastCommand={lastCommand}
            deviceAccessed={showUnifiedDeviceModal ? (activeDeviceType === 'switchL2' || activeDeviceType === 'switchL3' ? 'switch' : activeDeviceType === 'router' ? 'router' : 'pc') : null}
            deviceState={state}
            topologyConnections={topologyConnections}
            topologyDevices={topologyDevices}
            onCheckTasks={checkExamTasks}
          />}
        </div>
      </div>
    </AppErrorBoundary>
  );
}


