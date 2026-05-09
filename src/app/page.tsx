'use client';

import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import dynamic from 'next/dynamic';

import { SwitchState, CableInfo } from '@/lib/network/types';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { useModalDragResize } from '@/hooks/useModalDragResize';
import { useMultiTabWarning } from '@/hooks/useMultiTabWarning';
import useAppStore, { useTopologyDevices, useTopologyConnections, useTopologyNotes, useZoom, usePan, useActiveTab, useEnvironment } from '@/lib/store/appStore';
import { NetworkTopology } from '@/components/network/NetworkTopology';
import { cn, normalizeMAC } from '@/lib/utils';
import { CanvasDevice, CanvasConnection, CanvasNote, DeviceType, CanvasPortStatus } from '@/components/network/networkTopology.types';
import { getPrompt } from '@/lib/network/executor';
import { formatErrorForUser, errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';
import { checkDeviceConnectivity, getDeviceWifiConfig, getWirelessSignalStrength } from '@/lib/network/connectivity';
import { generateRandomLinkLocalIpv4 } from '@/lib/network/linkLocal';
import { processIotRules } from '@/lib/network/iotLogic';
import { calculatePVST } from '@/lib/network/core/showCommands';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Menu, Plus, Save, FolderOpen, Languages, Sun, Moon, Network, ShieldCheck, Database, Info, File, Layers, Terminal as TerminalIcon, Undo2, Redo2, Link2, Pencil, StickyNote, Sparkles, Cloud, Search, Monitor, X, Compass, Leaf, Server, GripHorizontal, Square, Minus, Strikethrough, Cable, Usb, BookOpen, Target, Clock, GraduationCap, Settings as SettingsIcon, Power, Filter } from "lucide-react";
import { RouterIcon, SwitchIcon } from '@/components/network/PCPanelWidgets';

// Existing RouterInfoPopover stays unchanged for routers

// New SwitchInfoPopover component for L2 and L3 switches
function SwitchInfoPopover({ router, routerState, t, language, isDark, onClose, handleDeviceDoubleClick, onOpenPanel, topologyConnections }: RouterInfoPopoverProps) {
  // Reuse the same draggable logic as RouterInfoPopover
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('switch-info-position');
      if (saved) {
        try { return JSON.parse(saved); } catch (err) { errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'parseSwitchInfoPosition', savedValue: saved, error: String(err) })); }
      }
    }
    return { x: 16, y: 96 };
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const positionRef = useRef(position);
  const isDraggingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const [isDraggingUI, setIsDraggingUI] = useState(false);
  useEffect(() => { positionRef.current = position; }, [position]);
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;
    e.preventDefault();
    isDraggingRef.current = true; setIsDraggingUI(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: positionRef.current.x, posY: positionRef.current.y };
    if (containerRef.current) { containerRef.current.style.cursor = 'grabbing'; containerRef.current.style.transition = 'none'; containerRef.current.style.willChange = 'bottom, right'; }
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(() => {
        if (!isDraggingRef.current || !containerRef.current) return;
        const dx = moveEvent.clientX - dragStartRef.current.x;
        const dy = dragStartRef.current.y - moveEvent.clientY;
        const newX = dragStartRef.current.posX - dx;
        const newY = dragStartRef.current.posY + dy;
        containerRef.current.style.right = `${newX}px`;
        containerRef.current.style.bottom = `${newY}px`;
      });
    };
    const handleMouseUp = () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      isDraggingRef.current = false; setIsDraggingUI(false);
      if (containerRef.current) {
        containerRef.current.style.cursor = '';
        containerRef.current.style.transition = '';
        containerRef.current.style.willChange = '';
        const finalX = parseInt(containerRef.current.style.right);
        const finalY = parseInt(containerRef.current.style.bottom);
        const panelWidth = 300; const panelHeight = 500; const margin = 16;
        const safeX = Math.max(margin, Math.min(finalX, window.innerWidth - panelWidth - margin));
        const safeY = Math.max(margin, Math.min(finalY, window.innerHeight - panelHeight - margin));
        const clampedPos = { x: safeX, y: safeY };
        setPosition(clampedPos);
        localStorage.setItem('switch-info-position', JSON.stringify(clampedPos));
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Port data similar to RouterInfoPopover
  const ports = routerState?.ports ? Object.values(routerState.ports) : (router.ports || []);
  const totalPorts = Math.max(6, ports.length);
  const connectedPorts = topologyConnections?.filter(conn => conn.sourceDeviceId === router.id || conn.targetDeviceId === router.id).length || 0;

  return (
    <div ref={containerRef} className={cn("hidden md:block fixed z-[10000] animate-scale-in")}
      style={{ bottom: `${position.y}px`, right: `${position.x}px` }} onMouseDown={handleDragStart}>
      <div className={`rounded-2xl border shadow-2xl backdrop-blur-md min-w-[200px] max-w-[280px] ${isDark ? 'bg-zinc-950/40 border-zinc-800/50 text-zinc-100 shadow-black/40' : 'bg-white/40 border-zinc-200/50 text-zinc-900 shadow-zinc-200/50'}`}>
        <div className={`flex items-center justify-between px-2 py-1.5 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'} ${isDraggingUI ? 'cursor-grabbing' : 'cursor-grab'}`}>
          <div className="flex items-center gap-1.5">
            <GripHorizontal className="w-3 h-3 opacity-30" />
            <SwitchIcon className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs font-black tracking-wider uppercase opacity-30">{router.name || router.id}</span>
          </div>
          <TooltipWrapper title={t.close}>
            <button onClick={onClose} className="w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0">
              <X className="w-3 h-3 text-white pointer-events-none" />
            </button>
          </TooltipWrapper>
        </div>
        <div className="overflow-hidden cursor-default">
          <div className="p-2 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="opacity-50">{t.portsShort}</span>
              <span className="font-mono"><span className="text-green-500">{connectedPorts}</span><span className="opacity-50">/{totalPorts}</span><span className="ml-1 opacity-50">{t.connectedShort}</span></span>
            </div>
            {/* Additional switch‑specific info can be added here */}
          </div>
        </div>
      </div>
    </div>
  );
}

// Update rendering logic for info popovers (replace RouterInfoPopover usage for switches)
// Original block at lines 5526‑5545 will be modified accordingly.


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
import { buildRunningConfig } from '@/lib/network/core/configBuilder';
import { performanceMonitor } from '@/lib/performance/monitoring';
import { useGuidedMode } from '@/hooks/useGuidedMode';

import { DeviceIcon } from '@/components/network/DeviceIcon';
import { GuidedModePanel } from '@/components/network/GuidedModePanel';
import { AppSkeleton } from '@/components/ui/AppSkeleton';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { SwitchModel } from '@/lib/network/switchModels';
import { EnvironmentSettingsPanel } from '@/components/network/EnvironmentSettingsPanel';
import { FirewallPanel } from '@/components/network/FirewallPanel';

const PCPanel = dynamic(() => import('@/components/network/PCPanel').then((m) => m.PCPanel), { ssr: false });
const RouterPanel = dynamic(() => import('@/components/network/RouterPanel').then((m) => m.RouterPanel), { ssr: false });
const Terminal = dynamic(() => import('@/components/network/Terminal').then((m) => m.Terminal), { ssr: false });
const PortPanel = dynamic(() => import('@/components/network/PortPanel').then((m) => m.PortPanel), { ssr: false });
const VlanPanel = dynamic(() => import('@/components/network/VlanPanel').then((m) => m.VlanPanel), { ssr: false });
const SecurityPanel = dynamic(() => import('@/components/network/SecurityPanel').then((m) => m.SecurityPanel), { ssr: false });
const ConfigPanel = dynamic(() => import('@/components/network/ConfigPanel').then((m) => m.ConfigPanel), { ssr: false });
const TaskCard = dynamic(() => import('@/components/network/TaskCard').then((m) => m.TaskCard), { ssr: false });
const LazyAboutModal = dynamic(() => import('@/components/network/LazyAboutModal').then((m) => m.LazyAboutModal), { ssr: false });

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
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all border ${selectedId === device.id
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
  const navigationHistoryRef = useRef<{ tab: TabType; deviceId?: string; program?: string }[]>([{ tab: 'topology' }]);
  const currentNavIndexRef = useRef(0);
  const isInternalNavRef = useRef(false);
  const activeTabRef = useRef<TabType>('topology');
  const isApplyingHistoryRef = useRef(false);
  const pendingHistoryActionRef = useRef<'undo' | 'redo' | null>(null);
  const lastAppliedHistoryStateRef = useRef<ProjectState | null>(null);
  const lastPushedStateRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topologyContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusDeviceRef = useRef<string | null>(null);
  const prevTaskStatusRef = useRef<Map<string, boolean>>(new Map());
  const shownToastsRef = useRef<Set<string>>(new Set());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalHistoryPushedRef = useRef(false);

  // State moved to top to avoid TDZ errors
  const [activeDeviceId, setActiveDeviceId] = useState<string>('switch-1');
  const [activeDeviceType, setActiveDeviceType] = useState<DeviceType>('switchL2');
  const [loadedExampleId, setLoadedExampleId] = useState<string | null>(null);
  const [topologyKey, setTopologyKey] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType | null>(null);
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState<number>(0);
  // Track last executed command for guided mode
  const [lastCommand, setLastCommand] = useState<string>('');
  const [showPCPanel, setShowPCPanel] = useState(false);
  const [showFirewallPanel, setShowFirewallPanel] = useState(false);
  const [activeFirewallId, setActiveFirewallId] = useState<string | null>(null);
  const [firewallActiveTab, setFirewallActiveTab] = useState<'console' | 'settings'>('console');
  const [pcPanelInitialTab, setPcPanelInitialTab] = useState<'home' | 'desktop' | 'terminal' | 'settings' | 'services' | 'wireless' | 'iot'>('home');
  const [showPCDeviceId, setShowPCDeviceId] = useState<string>('pc-1');
  const [showRouterPanel, setShowRouterPanel] = useState(false);
  const [showRouterDeviceId, setShowRouterDeviceId] = useState<string>('router-1');
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [focusDeviceId, setFocusDeviceId] = useState<string | null>(null);
  const [isAppLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isEnvironmentPanelOpen, setIsEnvironmentPanelOpen] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [projectPickerTab, setProjectPickerTab] = useState<'all' | 'guided'>('all');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [refreshNetworkReport, setRefreshNetworkReport] = useState<{
    show: boolean;
    title: string;
    dhcpMessages: string[];
    stpMessage: string;
    portSecurityMessage: string;
    topologyMessage: string;
    devices: RefreshDeviceSummary[];
  } | null>(null);

  // Which overlay panel is on top — last clicked wins
  const [focusedOverlay, setFocusedOverlay] = useState<'refresh' | 'packet'>('packet');

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [cableInfo, setCableInfo] = useState<CableInfo>({
    connected: true,
    cableType: 'straight',
    sourceDevice: 'pc',
    targetDevice: 'switchL2',
  });
  const [lastTaskEvent, setLastTaskEvent] = useState<{ type: 'completed' | 'failed'; taskName: string; timestamp: number } | null>(null);

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
  const { setDevices, setConnections, setNotes, setZoom, setPan, setActiveTab, graphicsQuality, setGraphicsQuality } = useAppStore();

  const focusDeviceInTopology = useCallback((deviceId?: string, targetZoom?: number, deviceData?: CanvasDevice) => {
    if (!deviceId && !deviceData) return;
    // Pan after any programmatic zoom/pan changes so centering uses fresh layout.
    requestAnimationFrame(() => {
      const rect = topologyContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const targetDevice = deviceData ?? topologyDevices.find((device) => device.id === deviceId);
      if (!targetDevice) return;

      // Use provided targetZoom or read from store
      const currentZoom = targetZoom ?? useAppStore.getState().topology.zoom;

      // Calculate device center based on device type
      const deviceWidth = (targetDevice.type === 'pc' || targetDevice.type === 'iot') ? 90 : targetDevice.type === 'router' ? 90 : 130;
      const portsPerRow = 8;
      const numRows = Math.ceil(targetDevice.ports.length / portsPerRow);
      const deviceHeight = (targetDevice.type === 'pc' || targetDevice.type === 'iot') ? 99 : 80 + numRows * 14 + 5;
      const deviceCenter = {
        x: targetDevice.x + deviceWidth / 2,
        y: targetDevice.y + deviceHeight / 2
      };

      // If device is very close to (0,0), keep (0,0) at top-left and only scroll enough to show the device
      const isNearOrigin = deviceCenter.x < 100 && deviceCenter.y < 100;
      if (isNearOrigin) {
        // Keep (0,0) at top-left, just scroll enough to show the device
        const padding = 20;
        setPan({
          x: padding,
          y: padding,
        });
      } else {
        // Normal centering behavior
        setPan({
          x: rect.width / 2 - deviceCenter.x * currentZoom,
          y: rect.height / 2 - deviceCenter.y * currentZoom,
        });
      }
    });
  }, [topologyDevices, setPan]);

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

  // Custom tab setter with navigation history
  const setActiveTabWithHistory = useCallback((tab: TabType) => {
    if (isInternalNavRef.current) {
      isInternalNavRef.current = false;
      setActiveTab(tab);
      return;
    }

    // Add to history
    const newState = { tab, deviceId: undefined, program: undefined };
    const currentIndex = currentNavIndexRef.current;

    // Remove any forward history
    if (currentIndex < navigationHistoryRef.current.length - 1) {
      navigationHistoryRef.current = navigationHistoryRef.current.slice(0, currentIndex + 1);
    }

    // Don't add duplicate consecutive states
    const lastState = navigationHistoryRef.current[navigationHistoryRef.current.length - 1];
    if (lastState && lastState.tab === tab) {
      setActiveTab(tab);
      return;
    }

    navigationHistoryRef.current.push(newState);
    currentNavIndexRef.current = navigationHistoryRef.current.length - 1;

    // Push to browser history
    window.history.pushState({ tab }, '');
    setActiveTab(tab);
  }, [setActiveTab]);

  // Custom device tab setter with navigation history (for PC terminal)
  const setDeviceTabWithHistory = useCallback((tab: TabType, deviceId: string, deviceType: DeviceType) => {
    // Ensure PC outputs are generated before showing terminal
    if (deviceType === 'pc' && tab === 'cmd') {
      getOrCreatePCOutputs(deviceId, topologyDevices);
    }

    if (isInternalNavRef.current) {
      isInternalNavRef.current = false;
      setActiveDeviceId(deviceId);
      setActiveDeviceType(deviceType);
      setActiveTab(tab);
      return;
    }

    // Add to history
    const newState = { tab, deviceId, program: undefined };
    const currentIndex = currentNavIndexRef.current;

    // Remove any forward history
    if (currentIndex < navigationHistoryRef.current.length - 1) {
      navigationHistoryRef.current = navigationHistoryRef.current.slice(0, currentIndex + 1);
    }

    navigationHistoryRef.current.push(newState);
    currentNavIndexRef.current = navigationHistoryRef.current.length - 1;

    // Push to browser history
    window.history.pushState({ tab, deviceId }, '');

    setActiveDeviceId(deviceId);
    setActiveDeviceType(deviceType);
    setActiveTab(tab);
  }, [setActiveTab, setActiveDeviceId, setActiveDeviceType, getOrCreatePCOutputs]);

  // Handle PCPanel tablet program navigation
  const handlePCPanelNavigate = useCallback((program: string) => {
    if (program === 'home') {
      // Navigate back to topology when going home from tablet
      if (isInternalNavRef.current) {
        isInternalNavRef.current = false;
        return;
      }
      window.history.pushState({ tab: 'topology', deviceId: activeDeviceId }, '');
    } else if (program === 'terminal' || program === 'desktop') {
      // Navigate to CMD terminal tab
      if (isInternalNavRef.current) {
        isInternalNavRef.current = false;
        return;
      }
      window.history.pushState({ tab: 'cmd', deviceId: activeDeviceId, program }, '');
    }
  }, [activeDeviceId]);

  const applyIotAutomationPass = useCallback((devices: CanvasDevice[]) => {
    if (!devices.some((device) => device.type === 'iot' && device.iot?.rules?.some((rule) => rule.enabled !== false))) {
      return devices;
    }

    let nextDevices = devices;
    let didUpdate = false;

    processIotRules(devices, environment, (deviceId, updates) => {
      didUpdate = true;
      nextDevices = nextDevices.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              ...updates,
              iot: updates.iot ? { ...device.iot, ...updates.iot } : device.iot,
            }
          : device
      );
    });

    return didUpdate ? nextDevices : devices;
  }, [environment]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTopologyDevices((prev) => applyIotAutomationPass(prev));
    }, 250);

    return () => window.clearInterval(interval);
  }, [applyIotAutomationPass, setTopologyDevices]);

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

  // Initialize graphics quality to 'high' for first-time visitors
  useEffect(() => {
    const appStoreData = localStorage.getItem('network-simulator-storage');
    if (!appStoreData) {
      // First-time visitor: ensure graphics quality is set to high
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

  // Initialize defaults on mount to avoid hydration mismatch
  useEffect(() => {
    const savedData = localStorage.getItem('netsim_autosave');
    if (!savedData) {
      setTopologyDevices([
        {
          id: 'pc-1',
          type: 'pc',
          name: 'PC-1',
          x: 50,
          y: 50,
          ip: '192.168.1.10',
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
          ip: '192.168.1.20',
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
          ports: [
            { id: 'console', label: 'Console', status: 'disconnected' as const },
            ...Array.from({ length: 24 }, (_, i) => ({ id: `fa0/${i + 1}`, label: `Fa0/${i + 1}`, status: 'disconnected' as const })),
            { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
            { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }
          ]
        }
      ]);
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

  // Modal drag/resize — managed by useModalDragResize hook
  const {
    tasksModalPosition,
    tasksModalSize,
    cliModalPosition,
    cliModalSize,
    pcModalPosition,
    pcModalSize,
    firewallModalPosition,
    firewallModalSize,
    setTasksModalPosition,
    setTasksModalSize,
    setCliModalPosition,
    setCliModalSize,
    setPcModalPosition,
    setPcModalSize,
    setFirewallModalPosition,
    setFirewallModalSize,
    handlePointerDown,
    handleResizeStart,
  } = useModalDragResize({ width: 1200, height: 700 }, graphicsQuality);
  const isTasksNarrow = tasksModalSize.width < 1100;

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
    const activeDevice = (topologyDevices || []).find(d => d.id === activeDeviceId);
    const resolvedType = activeDevice?.type ?? activeDeviceType;
    return getOrCreateDeviceState(activeDeviceId, resolvedType, activeDevice?.name, activeDevice?.macAddress, activeDevice?.switchModel);
  }, [activeDeviceId, activeDeviceType, topologyDevices, deviceStates, getOrCreateDeviceState]);
  const output = getOrCreateDeviceOutputs(activeDeviceId, state);
  const isTaskSystemEnabled = activeDeviceType !== 'pc';
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
  }, [activeDeviceTasks, isTaskSystemEnabled, state, taskContext, language]);

  // Calculate total score
  const totalScore = isTaskSystemEnabled ? calculateTaskScore(activeDeviceTasks, state, taskContext) : 0;

  // Calculate max possible score
  const maxScore = activeDeviceTasks.reduce((acc, task) => acc + task.weight, 0);

  // Per-tab task completion counts for badges
  const completedTasks = isTaskSystemEnabled ? portTasks.filter(task => getTaskStatus(task, state, taskContext)).length +
    vlanTasks.filter(task => getTaskStatus(task, state, taskContext)).length +
    securityTasks.filter(task => getTaskStatus(task, state, taskContext)).length +
    (activeDeviceType !== 'switchL2' ? wirelessTasks.filter(task => getTaskStatus(task, state, taskContext)).length : 0) : 0;

  const normalizeDeviceType = useCallback((type: string): DeviceType => {
    if (type === 'switch') return 'switchL2';
    if (type === 'switchL2' || type === 'switchL3' || type === 'pc' || type === 'iot' || type === 'router' || type === 'firewall') return type;
    return 'pc';
  }, []);

  const isValidIpv4 = useCallback((value?: string) => {
    if (!value) return false;
    const parts = value.split('.');
    if (parts.length !== 4) return false;
    return parts.every((part) => {
      const n = Number(part);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }, []);

  const isSameSubnetByMask = useCallback((left?: string, right?: string, mask?: string) => {
    if (!isValidIpv4(left) || !isValidIpv4(right) || !isValidIpv4(mask)) return false;
    const safeLeft = left as string;
    const safeRight = right as string;
    const safeMask = mask as string;
    const leftParts = safeLeft.split('.').map(Number);
    const rightParts = safeRight.split('.').map(Number);
    const maskParts = safeMask.split('.').map(Number);
    return leftParts.every((part, index) => (part & maskParts[index]) === (rightParts[index] & maskParts[index]));
  }, [isValidIpv4]);

  const getPortAccessVlan = useCallback((port: any) => Number(port?.accessVlan || port?.vlan || 1), []);

  const getPeerPortVlan = useCallback((ownerDeviceId: string, ownerPortId: string, devices: CanvasDevice[]) => {
    const connection = topologyConnections.find((conn) =>
      conn.active !== false &&
      (
        (conn.sourceDeviceId === ownerDeviceId && conn.sourcePort === ownerPortId) ||
        (conn.targetDeviceId === ownerDeviceId && conn.targetPort === ownerPortId)
      )
    );
    if (!connection) return null;

    const peerDeviceId = connection.sourceDeviceId === ownerDeviceId ? connection.targetDeviceId : connection.sourceDeviceId;
    const peerPortId = connection.sourceDeviceId === ownerDeviceId ? connection.targetPort : connection.sourcePort;
    const peerPort = deviceStates?.get(peerDeviceId)?.ports?.[peerPortId];
    if (!peerPort) return null;
    if (peerPort.mode === 'trunk') return 1;
    return getPortAccessVlan(peerPort);
  }, [deviceStates, getPortAccessVlan, topologyConnections]);

  const inferEndpointVlan = useCallback((device: CanvasDevice, devices: CanvasDevice[]) => {
    // For WiFi clients, find the AP and use its wlan0 VLAN
    if (device.wifi?.enabled && device.wifi?.mode === 'client' && device.wifi?.bssid) {
      const ap = devices.find(d => d.id === device.wifi?.bssid);
      if (ap) {
        const apWlan = deviceStates?.get(ap.id)?.ports?.['wlan0'];
        if (apWlan) return getPortAccessVlan(apWlan);
      }
    }

    const connection = topologyConnections.find((conn) =>
      conn.active !== false &&
      (conn.sourceDeviceId === device.id || conn.targetDeviceId === device.id)
    );
    if (!connection) return Number(device.vlan || 1);

    const peerDeviceId = connection.sourceDeviceId === device.id ? connection.targetDeviceId : connection.sourceDeviceId;
    const peerPortId = connection.sourceDeviceId === device.id ? connection.targetPort : connection.sourcePort;
    const peerPort = deviceStates?.get(peerDeviceId)?.ports?.[peerPortId];
    if (!peerPort) return Number(device.vlan || 1);
    if (peerPort.mode === 'trunk') return 1;
    return getPortAccessVlan(peerPort);
  }, [deviceStates, getPortAccessVlan, topologyConnections]);

  const getServerPoolVlan = useCallback((
    serverDevice: CanvasDevice,
    serverState: SwitchState | undefined,
    poolGateway: string,
    poolStartIp: string,
    poolSubnetMask: string,
    devices: CanvasDevice[]
  ) => {
    if (!isValidIpv4(poolSubnetMask)) return null;
    const anchorIp = isValidIpv4(poolGateway) ? poolGateway : poolStartIp;
    if (!isValidIpv4(anchorIp)) return null;

    const ports = serverState?.ports || {};
    for (const [portId, port] of Object.entries(ports)) {
      if (!port?.ipAddress || port.shutdown) continue;
      const effectiveMask = port.subnetMask || poolSubnetMask;
      if (!isValidIpv4(effectiveMask) || !isSameSubnetByMask(port.ipAddress, anchorIp, effectiveMask)) continue;

      const sviMatch = portId.match(/^vlan(\d+)$/i);
      if (sviMatch) return parseInt(sviMatch[1], 10) || 1;
      if (port.mode === 'trunk') return 1;
      if (port.accessVlan || port.vlan) return getPortAccessVlan(port);

      const peerVlan = getPeerPortVlan(serverDevice.id, portId, devices);
      return peerVlan ?? 1;
    }

    if (isSameSubnetByMask(serverDevice.ip, anchorIp, poolSubnetMask)) {
      return inferEndpointVlan(serverDevice, devices);
    }

    return null;
  }, [getPeerPortVlan, getPortAccessVlan, inferEndpointVlan, isSameSubnetByMask, isValidIpv4]);

  const hasActivePathBetweenDevices = useCallback((
    sourceDeviceId: string,
    targetDeviceId: string,
    devices: CanvasDevice[],
    states?: Map<string, SwitchState>,
    connectionsOverride?: CanvasConnection[]
  ) => {
    if (sourceDeviceId === targetDeviceId) return true;

    const byId = new Map(devices.map((device) => [device.id, device]));
    const activeStates = states ?? deviceStates;
    const isDeviceUsable = (deviceId: string) => {
      const device = byId.get(deviceId);
      return !!device && device.status !== 'offline';
    };
    const isPortUsable = (deviceId: string, portId: string) => {
      const statePort = activeStates?.get(deviceId)?.ports?.[portId];
      if (statePort?.shutdown || statePort?.status === 'err-disabled' || statePort?.status === 'disabled') {
        return false;
      }

      const devicePort = byId.get(deviceId)?.ports?.find((port) => port.id === portId);
      return !(devicePort?.shutdown || devicePort?.status === 'err-disabled' || devicePort?.status === 'disabled');
    };

    if (!isDeviceUsable(sourceDeviceId) || !isDeviceUsable(targetDeviceId)) return false;

    const visited = new Set<string>([sourceDeviceId]);
    const queue = [sourceDeviceId];

    const activeConnections = [...(connectionsOverride ?? topologyConnections)];
    // Add established wireless connections to the search path
    devices.forEach(pc => {
      const pcWifi = getDeviceWifiConfig(pc, activeStates);
      if (pcWifi?.enabled && (pcWifi.mode === 'client' || pcWifi.mode === 'sta') && pcWifi.ssid) {
        devices.forEach(ap => {
          if (ap.id === pc.id) return;
          const apWifi = getDeviceWifiConfig(ap, activeStates);
          if (apWifi?.enabled && apWifi.mode === 'ap' && apWifi.ssid === pcWifi.ssid) {
            // Check password/security match
            if ((apWifi.security || 'open') === (pcWifi.security || 'open') &&
              (apWifi.security === 'open' || apWifi.password === pcWifi.password)) {
              activeConnections.push({
                id: `wireless-dhcp-${pc.id}-${ap.id}`,
                sourceDeviceId: pc.id,
                sourcePort: 'wlan0',
                targetDeviceId: ap.id,
                targetPort: 'wlan0',
                cableType: 'wireless',
                active: true
              } as any);
            }
          }
        });
      }
    });

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) continue;
      if (currentId === targetDeviceId) return true;

      for (const connection of activeConnections) {
        if (connection.active === false) continue;

        const isSourceSide = connection.sourceDeviceId === currentId;
        const isTargetSide = connection.targetDeviceId === currentId;
        if (!isSourceSide && !isTargetSide) continue;

        const neighborId = isSourceSide ? connection.targetDeviceId : connection.sourceDeviceId;
        if (visited.has(neighborId) || !isDeviceUsable(neighborId)) continue;
        if (!isPortUsable(connection.sourceDeviceId, connection.sourcePort)) continue;
        if (!isPortUsable(connection.targetDeviceId, connection.targetPort)) continue;

        visited.add(neighborId);
        queue.push(neighborId);
      }
    }

    return false;
  }, [deviceStates, topologyConnections]);

  const isDhcpPoolCompatibleForClient = useCallback((
    pcDevice: CanvasDevice,
    serverDevice: CanvasDevice,
    serverState: SwitchState | undefined,
    poolGateway: string,
    poolStartIp: string,
    poolSubnetMask: string,
    devices: CanvasDevice[],
    activeStates?: Map<string, SwitchState>,
    connectionsOverride?: CanvasConnection[]
  ) => {
    const states = activeStates ?? deviceStates;

    if (!hasActivePathBetweenDevices(pcDevice.id, serverDevice.id, devices, states, connectionsOverride)) {
      return false;
    }

    const clientVlan = inferEndpointVlan(pcDevice, devices);
    const serverVlan = getServerPoolVlan(serverDevice, serverState, poolGateway, poolStartIp, poolSubnetMask, devices);
    return serverVlan !== null && clientVlan === serverVlan;
  }, [deviceStates, getServerPoolVlan, hasActivePathBetweenDevices, inferEndpointVlan]);

  const buildLinkLocalLease = useCallback((pcDevice: CanvasDevice, devices: CanvasDevice[]) => {
    const usedIps = new Set(
      devices
        .filter((d) => d.id !== pcDevice.id && isValidIpv4(d.ip) && d.ip !== '0.0.0.0')
        .map((d) => d.ip as string)
    );
    return {
      ip: generateRandomLinkLocalIpv4(usedIps),
      subnet: '255.255.0.0',
      gateway: '0.0.0.0',
      dns: '0.0.0.0',
    };
  }, [isValidIpv4]);

  const assignDhcpLeaseForPc = useCallback((pcDevice: CanvasDevice, currentDevices: CanvasDevice[], currentStates?: Map<string, SwitchState>, currentConnections?: CanvasConnection[]) => {
    const safeDeviceStates = ensureDeviceStatesMap(currentStates ?? deviceStates);
    const usedIps = () => new Set(currentDevices.filter((d) => d.id !== pcDevice.id && d.ip && d.ip !== '0.0.0.0').map((d) => d.ip));

    for (const serverDevice of currentDevices) {
      if (serverDevice.id === pcDevice.id || serverDevice.type !== 'pc') continue;
      const pools = serverDevice.services?.dhcp?.enabled ? (serverDevice.services?.dhcp?.pools || []) : [];

      for (const pool of pools) {
        if (!pool.startIp || !pool.subnetMask) continue;
        if (!isDhcpPoolCompatibleForClient(pcDevice, serverDevice, undefined, pool.defaultGateway || '', pool.startIp, pool.subnetMask, currentDevices, safeDeviceStates, currentConnections)) {
          continue;
        }

        const startParts = pool.startIp.split('.').map(Number);
        if (startParts.length !== 4) continue;
        const assignedIps = usedIps();
        for (let i = 0; i < (pool.maxUsers || 50); i++) {
          const candidate = `${startParts[0]}.${startParts[1]}.${startParts[2]}.${startParts[3] + i}`;
          if (!assignedIps.has(candidate)) {
            return {
              ip: candidate,
              subnet: pool.subnetMask || '255.255.255.0',
              gateway: pool.defaultGateway || '0.0.0.0',
              dns: pool.dnsServer || '8.8.8.8'
            };
          }
        }
      }
    }

    for (const [deviceId_, state] of safeDeviceStates.entries()) {
      if (deviceId_ === pcDevice.id) continue;
      const serverDevice = currentDevices.find((d) => d.id === deviceId_);
      if (!serverDevice || (serverDevice.type !== 'router' && serverDevice.type !== 'switchL2' && serverDevice.type !== 'switchL3')) continue;

      const cliPools = state.dhcpPools || {};
      for (const poolName in cliPools) {
        const pool = cliPools[poolName];
        if (!pool.network || !pool.subnetMask) continue;
        const networkParts = pool.network.split('.').map(Number);
        if (networkParts.length !== 4) continue;
        const poolGateway = pool.defaultRouter || `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.1`;
        const poolStartIp = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.100`;
        if (!isDhcpPoolCompatibleForClient(pcDevice, serverDevice, state, poolGateway, poolStartIp, pool.subnetMask, currentDevices, safeDeviceStates, currentConnections)) {
          continue;
        }

        const assignedIps = usedIps();
        for (let i = 100; i < 254; i++) {
          const candidate = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${i}`;
          if (!assignedIps.has(candidate)) {
            return {
              ip: candidate,
              subnet: pool.subnetMask || '255.255.255.0',
              gateway: poolGateway,
              dns: pool.dnsServer || '8.8.8.8'
            };
          }
        }
      }

      const pools = state.services?.dhcp?.pools || [];
      for (const pool of pools) {
        if (!pool.startIp || !pool.subnetMask) continue;
        if (!isDhcpPoolCompatibleForClient(pcDevice, serverDevice, state, pool.defaultGateway || '', pool.startIp, pool.subnetMask, currentDevices, safeDeviceStates, currentConnections)) {
          continue;
        }

        const startParts = pool.startIp.split('.').map(Number);
        if (startParts.length !== 4) continue;
        const assignedIps = usedIps();
        for (let i = 0; i < (pool.maxUsers || 50); i++) {
          const candidate = `${startParts[0]}.${startParts[1]}.${startParts[2]}.${startParts[3] + i}`;
          if (!assignedIps.has(candidate)) {
            return {
              ip: candidate,
              subnet: pool.subnetMask || '255.255.255.0',
              gateway: pool.defaultGateway || '0.0.0.0',
              dns: pool.dnsServer || '8.8.8.8'
            };
          }
        }
      }
    }

    return null;
  }, [deviceStates, isDhcpPoolCompatibleForClient]);

  const applyLinkLocalToUnconfiguredHosts = useCallback((devices: CanvasDevice[]) => {
    const usedIps = new Set<string>();
    devices.forEach((device) => {
      if (isValidIpv4(device.ip) && device.ip !== '0.0.0.0') usedIps.add(device.ip);
    });

    return devices.map((device) => {
      if (device.type !== 'pc' && device.type !== 'iot') return device;
      if (isValidIpv4(device.ip) && device.ip !== '0.0.0.0') return device;

      const linkLocalIp = generateRandomLinkLocalIpv4(usedIps);
      usedIps.add(linkLocalIp);
      return {
        ...device,
        ip: linkLocalIp,
        subnet: device.subnet || '255.255.0.0',
        gateway: device.gateway || '0.0.0.0',
        dns: device.dns || '0.0.0.0',
      };
    });
  }, [isValidIpv4]);

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

      localStorage.setItem('netsim_autosave', JSON.stringify(projectData));
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

  // Load project from JSON data
  const loadProjectData = useCallback((projectData: any, options?: { keepActiveDevice?: boolean }) => {
    try {
      const shouldKeepActiveDevice = options?.keepActiveDevice === true;

      // Load device states
      if (projectData.devices && Array.isArray(projectData.devices)) {
        const newDeviceStates = new Map<string, SwitchState>();
        projectData.devices.forEach((item: { id: string; state: SwitchState }) => {
          // Skip devices with empty/invalid IDs
          if (item.id && item.id.trim() !== '') {
            newDeviceStates.set(item.id, item.state);
          }
        });
        setDeviceStates(newDeviceStates);
      }

      // Load device outputs
      if (projectData.deviceOutputs && Array.isArray(projectData.deviceOutputs)) {
        const newDeviceOutputs = new Map<string, TerminalOutput[]>();
        projectData.deviceOutputs.forEach((item: { id: string; outputs: TerminalOutput[] }) => {
          let outputs = item.outputs || [];

          // If banner is in state but not in outputs, prepend it (only for switches/routers)
          const stateItem = projectData.devices?.find((d: any) => d.id === item.id);
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
      } else if (projectData.devices && Array.isArray(projectData.devices)) {
        // If no device outputs provided, generate boot messages for all devices
        const newDeviceOutputs = new Map<string, TerminalOutput[]>();
        projectData.devices.forEach((item: { id: string; state: SwitchState }) => {
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
      if (projectData.pcOutputs && Array.isArray(projectData.pcOutputs)) {
        const newPcOutputs = new Map<string, PCOutputLine[]>();
        projectData.pcOutputs.forEach((item: { id: string; outputs: PCOutputLine[] }) => {
          newPcOutputs.set(item.id, item.outputs || []);
        });
        setPcOutputs(newPcOutputs);
      }

      // Load PC histories
      if (projectData.pcHistories && Array.isArray(projectData.pcHistories)) {
        const newPcHistories = new Map<string, string[]>();
        projectData.pcHistories.forEach((item: { id: string; history: string[] }) => {
          newPcHistories.set(item.id, item.history || []);
        });
        setPcHistories(newPcHistories);
      }

      // Load topology
      if (projectData.topology) {
        // Filter out devices with empty/invalid IDs
        const validDevices = (projectData.topology.devices || []).filter(
          (device: CanvasDevice) => device.id && device.id.trim() !== ''
        );
        const normalizedDevices = applyLinkLocalToUnconfiguredHosts(validDevices.map((device: CanvasDevice) => ({
          ...device,
          type: normalizeDeviceType(device.type),
        })));
        setTopologyDevices(normalizedDevices);
        setTopologyConnections(projectData.topology.connections || []);
        setTopologyNotes(projectData.topology.notes || []);
        if (projectData.topology.zoom) setZoom(projectData.topology.zoom);
        if (projectData.topology.pan) setPan(projectData.topology.pan);
      }

      // Sync STP state from deviceStates to topologyDevices ports
      if (projectData.devices && Array.isArray(projectData.devices) && projectData.topology?.devices) {
        const newDeviceStates = new Map<string, SwitchState>();
        projectData.devices.forEach((item: { id: string; state: SwitchState }) => {
          if (item.id && item.id.trim() !== '') {
            newDeviceStates.set(item.id, item.state);
          }
        });

        const validDevices = (projectData.topology.devices || []).filter(
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
      if (projectData.cableInfo) {
        setCableInfo({
          ...projectData.cableInfo,
          sourceDevice: normalizeDeviceType(projectData.cableInfo.sourceDevice),
          targetDevice: normalizeDeviceType(projectData.cableInfo.targetDevice),
        });
      }

      // Load active device. User-initiated project/file opens should start with info panels closed.
      if (shouldKeepActiveDevice && projectData.activeDeviceId) {
        setActiveDeviceId(projectData.activeDeviceId);
      } else {
        setActiveDeviceId('');
        setSelectedDevice(null);
      }
      if (projectData.activeDeviceType) {
        setActiveDeviceType(normalizeDeviceType(projectData.activeDeviceType));
      }

      // Load active tab
      if (projectData.activeTab) {
        setActiveTab(projectData.activeTab);
      }

      // Close all overlay panels when loading a project
      setShowPCPanel(false);
      setShowRouterPanel(false);
      setShowTerminalModal(false);
      setShowTasksModal(false);
      setRefreshNetworkReport(null);

      // Increment topology key to force remount
      setTopologyKey(prev => prev + 1);
      setHasUnsavedChanges(false);

      // Reset history with the loaded state
      resetHistory({
        topologyDevices: applyLinkLocalToUnconfiguredHosts(
          (projectData.topology?.devices || [])
            .filter((device: CanvasDevice) => device.id && device.id.trim() !== '')
            .map((device: CanvasDevice) => ({
              ...device,
              type: normalizeDeviceType(device.type),
            }))
        ),
        topologyConnections: projectData.topology?.connections || [],
        topologyNotes: projectData.topology?.notes || [],
        deviceStates: new Map(
          projectData.devices
            ?.filter((item: any) => item.id && item.id.trim() !== '')
            ?.map((item: any) => [item.id, item.state]) || []
        ),
        deviceOutputs: new Map(projectData.deviceOutputs?.map((item: any) => [item.id, item.outputs]) || []),
        pcOutputs: new Map(projectData.pcOutputs?.map((item: any) => [item.id, item.outputs]) || []),
        pcHistories: new Map(projectData.pcHistories?.map((item: any) => [item.id, item.history]) || []),
        cableInfo: projectData.cableInfo
          ? {
            ...projectData.cableInfo,
            sourceDevice: normalizeDeviceType(projectData.cableInfo.sourceDevice),
            targetDevice: normalizeDeviceType(projectData.cableInfo.targetDevice),
          }
          : { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: shouldKeepActiveDevice ? (projectData.activeDeviceId || 'switch-1') : '',
        activeDeviceType: normalizeDeviceType(projectData.activeDeviceType || 'switchL2'),
        zoom: projectData.zoom || 1.0,
        pan: projectData.pan || { x: 0, y: 0 },
        activeTab: projectData.activeTab || 'topology'
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
  }, [setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories, setTopologyDevices, setTopologyConnections, setTopologyNotes, setCableInfo, setActiveDeviceId, setActiveDeviceType, setSelectedDevice, setActiveTab, setTopologyKey, setHasUnsavedChanges, resetHistory, toast, setZoom, setPan, language, normalizeDeviceType, applyLinkLocalToUnconfiguredHosts, setShowPCPanel, setShowRouterPanel, setShowTerminalModal, setShowTasksModal, setRefreshNetworkReport]);

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('netsim_autosave');
    if (savedData) {
      try {
        const projectData = JSON.parse(savedData);
        loadProjectData(projectData, { keepActiveDevice: true });
        // Load last save time from timestamp
        if (projectData.timestamp) {
          const date = new Date(projectData.timestamp);
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

  const switchTabOrTopology = useCallback((tabId: TabType) => {
    const targetTab = ALL_TABS.find(tab => tab.id === tabId);
    if (!targetTab) return;

    // Handle tasks tab as modal
    if (tabId === 'tasks') {
      setShowTasksModal(true);
      return;
    }

    // Handle cmd tab as modal
    if (tabId === 'cmd') {
      const deviceObj = topologyDevices?.find(d => d.id === activeDeviceId);
      if (deviceObj && deviceObj.type === 'pc') {
        setShowPCDeviceId(activeDeviceId);
        getOrCreatePCOutputs(activeDeviceId, topologyDevices);
        setShowPCPanel(true);
      }
      return;
    }

    // Handle terminal tab as modal
    if (tabId === 'terminal') {
      // Ensure boot messages are generated before showing terminal
      const deviceObj = topologyDevices?.find(d => d.id === activeDeviceId);
      if (deviceObj && (deviceObj.type === 'router' || deviceObj.type === 'switchL2' || deviceObj.type === 'switchL3')) {
        const deviceState = getOrCreateDeviceState(activeDeviceId, deviceObj.type, deviceObj.name, deviceObj.macAddress, deviceObj.switchModel);
        getOrCreateDeviceOutputs(activeDeviceId, deviceState);
      }
      setShowTerminalModal(true);
      return;
    }

    const deviceVisible = activeDeviceId && topologyDevices.some(d => d.id === activeDeviceId);
    const isCompatible = tabId === 'topology' || (deviceVisible && targetTab.showFor.includes(activeDeviceType));

    setActiveTab(isCompatible ? tabId : 'topology');
  }, [activeDeviceId, activeDeviceType, topologyDevices, setActiveTab, getOrCreatePCOutputs]);

  const pendingDeviceSelectionRef = useRef<{ device: DeviceType; deviceId: string; switchModel?: string; deviceName?: string } | null>(null);

  const applyDeviceSelection = useCallback((device: DeviceType, deviceId?: string, switchModel?: string, deviceName?: string) => {
    if (!deviceId) return;

    // Immediately create device state so sync effects have correct data
    if (device !== 'pc') {
      const deviceObj = topologyDevices?.find(d => d.id === deviceId);
      const modelToUse = switchModel || deviceObj?.switchModel;
      const initialHostname = deviceObj?.name || deviceName;
      const deviceState = getOrCreateDeviceState(deviceId, device, initialHostname, deviceObj?.macAddress, modelToUse);
      getOrCreateDeviceOutputs(deviceId, deviceState);
    }

    // Schedule UI-only state updates outside render cycle
    pendingDeviceSelectionRef.current = { device, deviceId, switchModel, deviceName };
    queueMicrotask(() => {
      const pending = pendingDeviceSelectionRef.current;
      if (!pending) return;
      pendingDeviceSelectionRef.current = null;

      const currentTab = activeTabRef.current;
      const currentTabDef = ALL_TABS.find(t => t.id === currentTab);
      const nextTab: TabType =
        currentTabDef && currentTabDef.showFor.includes(pending.device)
          ? currentTab
          : 'topology';

      setSelectedDevice(pending.device);
      setActiveDeviceId(pending.deviceId);
      setActiveDeviceType(pending.device);
      if (nextTab !== currentTab) {
        setActiveTabWithHistory(nextTab);
      }
    });
  }, [topologyDevices, getOrCreateDeviceState, getOrCreateDeviceOutputs, setSelectedDevice, setActiveDeviceId, setActiveDeviceType, setActiveTabWithHistory]);

  // Topology canvas click: selects device only (no zoom/pan).
  const handleDeviceSelectFromCanvas = useCallback((device: DeviceType, deviceId?: string, switchModel?: string, deviceName?: string, isNew?: boolean, deviceData?: CanvasDevice) => {
    applyDeviceSelection(device, deviceId, switchModel, deviceName);

    // If it's a newly added device, focus on it
    if (isNew && deviceId) {
      if (activeTab === 'topology' && topologyContainerRef.current) {
        setZoom(1.0); // Reset zoom to 100%
        focusDeviceInTopology(deviceId, 1.0, deviceData); // Center on new device
        pendingFocusDeviceRef.current = null;
      } else {
        pendingFocusDeviceRef.current = deviceId;
      }
    }
  }, [activeTab, applyDeviceSelection, focusDeviceInTopology, setZoom]);

  // Device dropdown/menu click: focus the selected device at 100% zoom.
  const handleDeviceSelectFromMenu = useCallback((device: DeviceType, deviceId?: string, switchModel?: string, deviceName?: string) => {
    applyDeviceSelection(device, deviceId, switchModel, deviceName);
    if (!deviceId) return;

    if (activeTab === 'topology' && topologyContainerRef.current) {
      setZoom(1.0); // Reset zoom to 100%
      focusDeviceInTopology(deviceId, 1.0); // Center on selected device with zoom 1.0
      pendingFocusDeviceRef.current = null;
    } else {
      // If not in topology tab or container not ready, queue the focus
      pendingFocusDeviceRef.current = deviceId;
    }
  }, [activeTab, applyDeviceSelection, focusDeviceInTopology, setZoom]);

  useLayoutEffect(() => {
    if (activeTab !== 'topology') return;
    if (!pendingFocusDeviceRef.current) return;
    if (!topologyContainerRef.current) return;
    setZoom(1.0); // Reset zoom to 100%
    focusDeviceInTopology(pendingFocusDeviceRef.current, 1.0); // Center on selected device with zoom 1.0
    pendingFocusDeviceRef.current = null;
  }, [activeTab, focusDeviceInTopology, setZoom]);

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
      setShowTerminalModal(true);
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
    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-project-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setHasUnsavedChanges(false);
    setLastSaveTime(new Date().toLocaleTimeString());
    toast({
      title: t.projectSaved,
      description: t.jsonDownloaded,
    });
  }, [deviceStates, deviceOutputs, pcOutputs, pcHistories, topologyDevices, topologyConnections, topologyNotes, cableInfo, activeDeviceId, activeDeviceType, setHasUnsavedChanges, setLastSaveTime, language]);

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

    // Close guided mode panel if open
    closeGuidedMode();

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
  }, [resetHistory, setDeviceStates, setDeviceOutputs, setPcOutputs, setPcHistories, setTopologyDevices, setTopologyConnections, setTopologyNotes, setActiveDeviceId, setActiveDeviceType, setSelectedDevice, setShowPCPanel, setShowRouterPanel, setActiveTab, setHasUnsavedChanges, setTopologyKey, setZoom, setPan, closeGuidedMode]);

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
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { tab?: TabType; deviceId?: string; program?: string; modal?: boolean } | null;

      // Close modals first
      setShowMobileMenu(false);
      setConfirmDialog(null);
      setSaveDialog(null);
      setShowPCPanel(false);
      setShowRouterPanel(false);
      setShowTerminalModal(false);
      setShowTasksModal(false);
      setShowAboutModal(false);
      setShowProjectPicker(false);
      setShowOnboarding(false);
      window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'back' } }));

      // Handle navigation state
      if (state && state.tab) {
        isInternalNavRef.current = true;

        // Update history index
        currentNavIndexRef.current = Math.max(0, currentNavIndexRef.current - 1);

        // Navigate to the state
        if (state.tab === 'cmd' || state.tab === 'terminal') {
          if (state.deviceId) {
            setActiveDeviceId(state.deviceId);
            setActiveDeviceType(state.deviceId.startsWith('pc') ? 'pc' : state.deviceId.startsWith('router') ? 'router' : 'switchL2');
          }
          setActiveTab(state.tab);
        } else {
          setActiveTab(state.tab);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setShowMobileMenu, setConfirmDialog, setSaveDialog, setShowPCPanel, setShowRouterPanel, setShowTerminalModal, setShowTasksModal, setShowAboutModal, setShowProjectPicker, setShowOnboarding, setActiveTab, setActiveDeviceId, setActiveDeviceType]);

  // History pushState for back button tracking
  useEffect(() => {
    const anyModalOpen = showMobileMenu || !!confirmDialog || !!saveDialog || showPCPanel || showFirewallPanel || showRouterPanel || showTerminalModal || showTasksModal || showAboutModal || showProjectPicker || showOnboarding;
    if (anyModalOpen && !modalHistoryPushedRef.current) {
      window.history.pushState({ modal: true }, '');
      modalHistoryPushedRef.current = true;
    }
    if (!anyModalOpen) {
      modalHistoryPushedRef.current = false;
    }
  }, [showMobileMenu, confirmDialog, saveDialog, showPCPanel, showRouterPanel, showTerminalModal, showTasksModal, showAboutModal, showProjectPicker, showOnboarding]);

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
      const iotProcessedDevices = applyIotAutomationPass(stpSyncedDevices);
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

          const dhcpMessages = [
            language === 'tr'
              ? `DHCP: ${dhcpServerActiveCount} sunucu aktif`
              : `DHCP: ${dhcpServerActiveCount} active servers`,
            language === 'tr'
              ? `${dhcpClientWithLeaseCount} istemci lease aldı`
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
  }, [applyIotAutomationPass, assignDhcpLeaseForPc, buildLinkLocalLease, topologyDevices, topologyConnections, deviceStates, setDeviceStates, setTopologyConnections, language, t, pcOutputs]);

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
        setShowMobileMenu(false);
        setConfirmDialog(null);
        setSaveDialog(null);
        setShowPCPanel(false);
        setShowRouterPanel(false);
        setShowTerminalModal(false);
        setShowTasksModal(false);
        setShowAboutModal(false);
        setShowProjectPicker(false);
        setShowOnboarding(false);
        setRefreshNetworkReport(prev => prev ? { ...prev, show: false } : null);
        window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'escape' } }));
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
        // Tab key navigation - only cycle devices in topology if no panel is open
        // If a panel is open (PC panel, Router panel, etc.), let the panel handle Tab navigation
        if (activeTab === 'topology' && topologyDevices.length > 0 && !showPCPanel && !showRouterPanel && !showTerminalModal) {
          e.preventDefault();

          // Cancel current selection if multiple devices are selected or all devices are selected
          if (selectedDevice) {
            setSelectedDevice(null);
            setClearSelectionTrigger(prev => prev + 1);
          }

          const currentIndex = topologyDevices.findIndex(d => d.id === activeDeviceId);
          const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % topologyDevices.length;
          const nextDevice = topologyDevices[nextIndex];
          if (nextDevice) {
            setActiveDeviceId(nextDevice.id);
            setActiveDeviceType(nextDevice.type);
          }
        }
      }

      if (e.key === 'Enter') {
        // Don't handle Enter when any modal/panel is open
        if (showTasksModal || showTerminalModal || showAboutModal || showPCPanel || showFirewallPanel || showRouterPanel || showProjectPicker || showOnboarding || !!confirmDialog?.show || !!saveDialog?.show) {
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
              setShowTerminalModal(true);
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
  }, [showMobileMenu, confirmDialog, saveDialog, showPCPanel, showRouterPanel, showProjectPicker, handleSaveProject, handleNewProject, handleUndo, handleRedo, tabs, setShowMobileMenu, setConfirmDialog, setSaveDialog, setShowPCPanel, setShowRouterPanel, setShowProjectPicker, setActiveTab, activeTab, topologyDevices, topologyConnections, deviceStates, setDeviceStates, handleDeviceDoubleClick, handleRefreshNetwork]);

  // Load project from JSON file
  const handleLoadProject = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target?.result as string);
        if (loadProjectData(projectData)) {
          setHasUnsavedChanges(false);
          // Close guided mode panel if open
          closeGuidedMode();
          // Close network refresh report if open
          setRefreshNetworkReport(null);
          toast({
            title: t.projectLoaded,
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
  }, [loadProjectData, setHasUnsavedChanges, t.invalidProjectFile, t.failedLoadProject, language, setZoom, setPan, closeGuidedMode]);

  const applyExampleProject = useCallback((projectData: any, exampleId?: string) => {
    loadProjectData(projectData);
    setRefreshNetworkReport(null);
    if (exampleId) {
      setLoadedExampleId(exampleId);
    }
    setShowProjectPicker(false);
    // Close guided mode panel if open (unless it's a guided project itself)
    closeGuidedMode();

    // Reset zoom and pan to top-left
    setZoom(1.0);
    setPan({ x: 0, y: 0 });

    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [loadProjectData, setShowProjectPicker, setZoom, setPan, closeGuidedMode]);

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
                  <img src="/favicon.png" alt="Logo" className="w-16 h-16 object-contain" />
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
          <header className={`liquid-glass sticky top-0 z-50 border-b px-5 py-3 pb-0`}>
            <div className="w-full">
              <div className="flex items-center justify-between">
                {/* Logo & Title */}
                <TooltipWrapper title={t.reloadPage}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.location.reload();
                      }
                    }}
                    className="flex items-center gap-3 p-2"
                  >
                    <div className="p-1 flex items-center justify-center">
                      <img src="/favicon.png" alt="Logo" className="w-7 h-7 object-contain" />
                    </div>
                    <div className="hidden md:flex flex-col">
                      <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent leading-none">
                        {t.title}
                      </h2>
                      <p className="text-xs font-medium mt-1 text-slate-400 dark:text-slate-500">{t.subtitle}</p>
                    </div>
                  </Button>
                </TooltipWrapper>

                {/* Total Score - Desktop - Hidden for PC devices or when no devices exist */}
                {activeDeviceType !== 'pc' && topologyDevices && topologyDevices.length > 0 && activeDeviceId && (
                  <div className="hidden md:flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500">
                          {t.labProgress}
                        </span>
                        <span
                          key={totalScore}
                          className={`text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-full animate-scale-in ${totalScore >= maxScore * 0.7 ? 'bg-emerald-500/10 text-emerald-400' :
                            totalScore >= maxScore * 0.4 ? 'bg-amber-500/10 text-amber-400' :
                              'bg-rose-500/10 text-rose-400'
                            }`}
                        >
                          {Math.round((totalScore / maxScore) * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full overflow-hidden p-[px] bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full progress-fill"
                            style={{ '--progress-width': `${(totalScore / maxScore) * 100}%` } as React.CSSProperties}
                          />
                        </div>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xs font-black tabular-nums text-slate-900 dark:text-white">
                            {totalScore}
                          </span>
                          <span className="text-[10px] font-bold opacity-30 text-slate-500 dark:text-slate-400">
                            /{maxScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Right Controls - Integrated Toolbar */}
                <div className="flex items-center gap-2 sticky top-0 z-10">
                  {/* Unified Toolbar */}
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl border bg-slate-100 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800">
                    {/* Undo/Redo Group */}
                    {activeTab === 'topology' && (
                      <div className="hidden items-center gap-1 sm:hidden">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 ui-hover-surface text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" onClick={handleUndo} disabled={hasHydrated && !canUndo}>
                              <Undo2 className={`w-4 h-4 ${!canUndo ? 'opacity-30' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t.undo}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className={`h-8 w-8 ui-hover-surface ${isDark ? 'text-slate-300 hover:text-blue-400' : 'text-slate-600 hover:text-blue-600'}`} onClick={handleRedo} disabled={hasHydrated && !canRedo}>
                              <Redo2 className={`w-4 h-4 ${!canRedo ? 'opacity-30' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t.redo}</TooltipContent>
                        </Tooltip>
                        <div className="w-px h-4 mx-1 bg-slate-300 hidden md:block dark:bg-slate-700" />
                      </div>
                    )}

                    {/* Project Controls - Desktop only */}
                    <div className="hidden md:flex items-center">
                      <div className="flex items-center rounded-lg border overflow-hidden bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="h-8 w-8 flex items-center justify-center transition-all hover:bg-slate-200/50 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-slate-700/50"
                              onClick={handleNewProject}
                            >
                              <File className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="flex items-center gap-2">
                            <span>{t.newProject}</span>
                            <ShortcutBadge shortcut="Alt+N" variant="primary" />
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={cn("h-8 w-8 flex items-center justify-center transition-all hover:bg-slate-200/50", isDark ? 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50' : 'text-slate-600 hover:text-blue-600')}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <FolderOpen className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="flex items-center gap-2">
                            <span>{t.loadProject}</span>
                            <ShortcutBadge shortcut="Ctrl+O" variant="primary" />
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={cn("h-8 w-8 flex items-center justify-center transition-all hover:bg-slate-200/50", isDark ? 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50' : 'text-slate-600 hover:text-blue-600')}
                              onClick={handleSaveProject}
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="flex items-center gap-2">
                            <span>{t.saveProject}</span>
                            <ShortcutBadge shortcut="Ctrl+S" variant="success" />
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className={cn("h-8 w-8 flex items-center justify-center transition-all hover:bg-slate-200/50", isDark ? 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50' : 'text-slate-500 hover:text-blue-600')} onClick={() => setShowAboutModal(true)}>
                              <Info className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="flex items-center gap-2">
                            <span>{t.contactTitle}</span>
                            <ShortcutBadge shortcut="F1" variant="warning" />
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoadProject} className="hidden" />

                    {/* Info & Settings - Info button moved to Project Controls group */}
                    <div className={`w-px h-4 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-300'} hidden md:block`} />
                    <button
                      onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
                      className={cn("text-[10px] font-bold h-7 px-1.5 flex items-center gap-1 rounded transition-all ui-hover-surface", isDark ? 'text-slate-300 hover:text-purple-300' : 'text-slate-500 hover:text-purple-600')}
                    >
                      <Languages className="w-3.5 h-3.5" />
                      {language.toUpperCase()}
                    </button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={cn("h-7 w-7 rounded flex items-center justify-center transition-all ui-hover-surface", isDark ? 'text-slate-300 hover:text-yellow-300' : 'text-slate-500 hover:text-yellow-600')}
                          onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        >
                          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{isDark ? t.lightMode : t.darkMode}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={cn("h-7 w-7 rounded flex items-center justify-center transition-all ui-hover-surface", graphicsQuality === 'high' ? (isDark ? 'text-slate-300 hover:text-green-300' : 'text-slate-500 hover:text-green-600') : (isDark ? 'text-slate-300 hover:text-orange-300' : 'text-slate-500 hover:text-orange-600'))}
                          onClick={() => setGraphicsQuality(graphicsQuality === 'high' ? 'low' : 'high')}
                        >
                          {graphicsQuality === 'high' ? <Sparkles className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{graphicsQuality !== 'high' ? t.highRes : t.lowRes}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Mobile Menu */}
                <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="md:hidden">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'} p-0 w-72`}>
                    <SheetHeader className="p-4 text-left border-b border-slate-800/50">
                      <SheetTitle className="text-lg font-black flex items-center gap-2">
                        <div className="p-1 flex items-center justify-center">
                          <img src="/favicon.png" alt="Logo" className="w-5 h-5 object-contain" />
                        </div>
                        {t.title}
                      </SheetTitle>
                      <SheetDescription className="sr-only">
                        Main navigation and project controls
                      </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-80px)]">
                      <div className="p-3 space-y-4">
                        {/* Quick actions (primary) */}
                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50 border-slate-200'}`}>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="secondary"
                              className={`justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                              onClick={() => { setShowProjectPicker(true); setShowMobileMenu(false); }}
                            >
                              <File className="w-3.5 h-3.5" /> {t.new}
                            </Button>
                            <Button
                              variant="secondary"
                              className={`justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                              onClick={() => { handleSaveProject(); setShowMobileMenu(false); }}
                            >
                              <Save className="w-3.5 h-3.5" /> {t.saveLabel}
                            </Button>
                            <Button
                              variant="secondary"
                              className={`justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                              onClick={() => { fileInputRef.current?.click(); setShowMobileMenu(false); }}
                            >
                              <FolderOpen className="w-3.5 h-3.5" /> {t.load}
                            </Button>
                            <Button
                              variant="secondary"
                              className={cn("justify-start gap-2 h-9 text-xs font-bold", isDark ? "hover:text-cyan-400" : "hover:text-cyan-600")}
                              onClick={() => { setShowOnboarding(true); setOnboardingStep(0); setShowMobileMenu(false); }}
                            >
                              <Compass className="w-3.5 h-3.5" /> {t.tour}
                            </Button>
                            <Button
                              variant="outline"
                              className={`justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                              onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
                            >
                              <Languages className="w-3.5 h-3.5" />
                              {language === 'tr' ? t.english : t.turkish}
                            </Button>
                            <Button
                              variant="outline"
                              className={`justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                              onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            >
                              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                              {isDark ? t.lightMode : t.darkMode}
                            </Button>

                            {/* Help Button */}
                            <Button
                              variant="outline"
                              className={`w-full justify-start gap-2 h-9 text-xs font-bold ${isDark ? 'hover:text-cyan-400' : 'hover:text-cyan-600'}`}
                              onClick={() => { setShowAboutModal(true); setShowMobileMenu(false); }}
                            >
                              <Info className="w-3.5 h-3.5" />
                              {t.help}
                            </Button>
                          </div>
                        </div>


                        {/* Lab Progress Mobile - Hidden for PC devices or when no devices exist */}
                        {activeDeviceType !== 'pc' && topologyDevices && topologyDevices.length > 0 && activeDeviceId && (
                          <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'} border ${isDark ? 'border-slate-800/50' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold tracking-[0.15em] text-slate-500">{t.labProgress}</span>
                              <span className="text-xs font-bold text-cyan-400">{Math.round((totalScore / maxScore) * 100)}%</span>
                            </div>
                            <div className={`h-1.5 w-full rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden mb-1.5`}>
                              <div
                                className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all duration-500"
                                style={{ width: `${(totalScore / maxScore) * 100}%` }}
                              />
                            </div>
                            <p className={`text-center text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalScore} / {maxScore} {t.pts}</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Desktop Tabs & Device Selector */}
            <div className="flex items-end gap-1 mt-4 pt-1 overflow-x-auto no-scrollbar">
              {/* Mobile-only Quick Action Tools (Add, Zoom & Connect) */}
              <div className="flex md:hidden items-center gap-1.5 mr-auto">
                {activeTab === 'topology' && (
                  <div className="flex items-center gap-1 p-1 rounded-xl border bg-white border-slate-200 shadow-sm dark:bg-slate-900/40 dark:border-slate-800">
                    {/* Add Button (Device, Cable, Note) */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="px-2.5 py-1.5 h-auto text-red-500 hover:bg-red-500/10"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              const event = new CustomEvent('trigger-topology-palette');
                              window.dispatchEvent(event);
                            }
                          }}
                        >
                          <Plus className="w-7 h-7" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.addDeviceOrCable}</TooltipContent>
                    </Tooltip>

                    <div className="w-px h-4 bg-slate-200 mx-0.5 dark:bg-slate-800" />

                    {/* Connect Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-cyan-500 hover:bg-cyan-500/10"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              const event = new CustomEvent('trigger-topology-connect');
                              window.dispatchEvent(event);
                            }
                          }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 0 0 -5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0 -5.656-5.656l-1.1 1.1" />
                          </svg>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.connectDevices}</TooltipContent>
                    </Tooltip>

                    <div className="w-px h-4 bg-slate-200 mx-0.5 dark:bg-slate-800" />

                    {/* Refresh Network Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-pink-500 hover:bg-pink-500/10"
                          onClick={handleRefreshNetwork}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="flex items-center gap-2">
                        <span>{t.refreshNetworkF5}</span>
                        <ShortcutBadge shortcut="F5" variant="danger" />
                      </TooltipContent>
                    </Tooltip>

                    <div className="w-px h-4 bg-slate-200 mx-0.5 dark:bg-slate-800" />

                    {/* Environment Settings Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-emerald-500 hover:bg-emerald-500/10"
                          onClick={() => setIsEnvironmentPanelOpen(true)}
                        >
                          <Leaf className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.environmentSettings}</TooltipContent>
                    </Tooltip>

                    {/* Guided Mode Button - Show only when active but minimized */}
                    {isGuidedModeActive && isPanelMinimized && (
                      <>
                        <div className="w-px h-4 bg-slate-200 mx-0.5 dark:bg-slate-800" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-blue-500 hover:bg-blue-500/10 animate-pulse"
                              onClick={expandPanel}
                            >
                              <BookOpen className="w-5 h-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t.openGuidedLesson}</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>

          <Dialog open={showProjectPicker} onOpenChange={(open) => { setShowProjectPicker(open); if (!open) setProjectSearchQuery(''); }}>
            <DialogContent className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} sm:max-w-2xl md:max-w-3xl w-[98vw] max-w-[1400px] h-[95vh] max-h-[1000px] p-0 overflow-hidden flex flex-col shadow-2xl rounded-none md:rounded-3xl liquid-glass-light`}>
              <div className='flex flex-col flex-1 overflow-hidden h-full max-w-full'>
                <div className='p-4 md:p-8 pb-2 md:pb-4 space-y-4'>
                  <DialogHeader className='rounded-2xl md:rounded-3xl border border-transparent bg-gradient-to-r p-4 md:p-6 flex items-center justify-between flex-row'>
                    <DialogTitle className='text-xl bg-gradient-to-br from-white to-slate-900 bg-clip-text text-transparent break-words'>{t.openNewProject}</DialogTitle>
                    <Button
                      variant='outline'
                      size='sm'
                      className={`flex items-center gap-2 text-xs px-3 py-1.5 h-8 ${isDark ? 'text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-cyan-400' : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-cyan-600'}`}
                      onClick={() => { setShowProjectPicker(false); runWithSaveGuard(() => { resetToEmptyProject(); }); }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t.emptyProject}
                    </Button>
                    <DialogDescription className="sr-only">
                      {language === 'tr'
                        ? 'Yeni proje penceresi: boş projeyle başlayın veya hazır örneklerden birini seçin.'
                        : 'New project dialog: start with an empty project or choose one of the ready examples.'}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Tab Buttons - Modern Style */}
                  <div className={`flex items-end gap-1 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                    <button
                      onClick={() => setProjectPickerTab('all')}
                      className={cn(
                        'relative inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-out focus-ring-animate',
                        projectPickerTab === 'all'
                          ? isDark
                            ? 'bg-slate-900 text-blue-400 border-slate-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
                            : 'bg-white text-blue-600 border-slate-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
                          : isDark
                            ? 'bg-slate-950/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/60'
                            : 'bg-slate-100/80 text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                      )}
                      role="tab"
                      aria-selected={projectPickerTab === 'all'}
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span className="uppercase tracking-wide text-xs">{language === 'tr' ? t.openNewProject : 'All Projects'}</span>
                    </button>
                    <button
                      onClick={() => setProjectPickerTab('guided')}
                      className={cn(
                        'relative inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-out focus-ring-animate',
                        projectPickerTab === 'guided'
                          ? isDark
                            ? 'bg-slate-900 text-emerald-400 border-slate-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
                            : 'bg-white text-emerald-600 border-slate-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
                          : isDark
                            ? 'bg-slate-950/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/60'
                            : 'bg-slate-100/80 text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                      )}
                      role="tab"
                      aria-selected={projectPickerTab === 'guided'}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span className="uppercase tracking-wide text-xs">{language === 'tr' ? 'Rehberli Ders' : 'Guided Lesson'}</span>
                    </button>
                  </div>

                  {/* Search Box */}
                  <div className={`relative rounded-xl border px-4 py-2.5 flex items-center gap-2 ${isDark ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white/50 border-slate-200/60'}`}>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={projectSearchQuery}
                      placeholder={t.searchProjects}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      autoFocus
                      className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          // Find the first filtered project across all levels
                          let firstProject: any = null;
                          for (const level of exampleLevelOrder) {
                            const projects = groupedExampleProjects[level] || [];
                            const filtered = projects.filter(project =>
                              project.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                              project.description.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                              project.tag.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                              (project.detail && project.detail.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                            );
                            if (filtered.length > 0) {
                              firstProject = filtered[0];
                              break;
                            }
                          }

                          if (firstProject) {
                            // If found, open that project
                            setShowProjectPicker(false);
                            runWithSaveGuard(() => applyExampleProject(firstProject.data));
                          } else {
                            // If not found or empty, open empty project
                            setShowProjectPicker(false);
                            runWithSaveGuard(() => { resetToEmptyProject(); });
                          }
                        }
                      }}
                    />
                    {projectSearchQuery && (
                      <button
                        onClick={() => setProjectSearchQuery('')}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className='flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-12 pb-12 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent'>
                  <div className='flex flex-col gap-12 max-w-full'>
                    {/* Guided Mode Projects Section */}
                    {projectPickerTab === 'guided' && (
                      <div className='flex flex-col gap-8'>
                        <section className='space-y-4 md:space-y-6 w-full'>
                          <div className='flex items-center gap-3 md:gap-4 px-1 md:px-2'>
                            <p className='text-[10px] md:text-xs font-black tracking-[0.3em] md:tracking-[0.4em] text-emerald-500 dark:text-emerald-400 whitespace-nowrap'>
                              {language === 'tr' ? 'Rehberli Dersler' : 'Guided Lessons'}
                            </p>
                            <p className={`text-[10px] md:text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} truncate`}>
                              {language === 'tr' ? 'Adım adım öğrenme deneyimi' : 'Step-by-step learning experience'}
                            </p>
                            <div className={`h-px flex-1 ${isDark ? 'bg-emerald-800/60' : 'bg-emerald-200'}`} />
                          </div>

                          <div className='grid grid-cols-1 gap-6 w-full max-w-full'>
                            {getAvailableProjects(language)
                              .filter(guidedProject =>
                                projectSearchQuery.trim() === '' ||
                                guidedProject.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                                guidedProject.description.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                                guidedProject.tag.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                                (guidedProject.detail && guidedProject.detail.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                              )
                              .map((guidedProject) => (
                                <Button
                                  key={guidedProject.id}
                                  variant='ghost'
                                  className={`group h-auto min-h-[140px] md:min-h-[180px] flex-col items-start gap-3 md:gap-5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 text-left transition-all duration-300 hover:translate-y-[-4px] active:scale-[0.98] ${isDark ? 'border-emerald-800/40 bg-emerald-900/10 hover:bg-emerald-900/30 hover:border-emerald-500/50' : 'border-emerald-200/50 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-500/40'} w-full overflow-hidden shadow-sm hover:shadow-2xl relative`}
                                  onClick={() => {
                                    setShowProjectPicker(false);
                                    runWithSaveGuard(() => {
                                      // Reset zoom and pan first
                                      setZoom(1.0);
                                      setPan({ x: 0, y: 0 });
                                      startGuidedProject(guidedProject);
                                      loadProjectData(guidedProject.data);
                                    });
                                  }}
                                >
                                  <div className='flex items-center justify-between w-full gap-4 overflow-hidden flex-nowrap'>
                                    <span className={`font-black text-base md:text-2xl leading-none transition-colors duration-300 break-words flex-1 min-w-0 ${isDark ? 'group-hover:text-emerald-400 text-emerald-100' : 'group-hover:text-emerald-600 text-black'}`}>
                                      {guidedProject.title}
                                    </span>
                                    <span className={`text-[8px] md:text-[10px] font-black tracking-[0.2em] px-3 py-1.5 rounded-full whitespace-nowrap border shrink-0 flex-shrink-0 ${isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>
                                      {guidedProject.tag}
                                    </span>
                                  </div>
                                  <p className={`text-[11px] md:text-sm leading-relaxed font-medium italic transition-colors whitespace-normal break-words w-full ${isDark ? 'text-slate-300/80 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                    {guidedProject.description}
                                  </p>

                                  {/* Info Bar */}
                                  <div className='mt-auto pt-3 flex items-center gap-4 w-full border-t border-slate-800/10 dark:border-slate-700/50'>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                      <Clock className="w-3 h-3" />
                                      {guidedProject.estimatedTimeMinutes} {language === 'tr' ? 'dk' : 'min'}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                      <Target className="w-3 h-3" />
                                      {guidedProject.steps.length} {language === 'tr' ? 'adım' : 'steps'}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                                      <BookOpen className="w-3 h-3" />
                                      {guidedProject.difficulty === 'beginner'
                                        ? (language === 'tr' ? 'Başlangıç' : 'Beginner')
                                        : guidedProject.difficulty === 'intermediate'
                                          ? (language === 'tr' ? 'Orta' : 'Intermediate')
                                          : guidedProject.difficulty === 'advanced'
                                            ? (language === 'tr' ? 'İleri' : 'Advanced')
                                            : guidedProject.difficulty}
                                    </div>
                                  </div>

                                  {guidedProject.detail && (
                                    <div className='pt-2 flex items-center gap-2 w-full'>
                                      <div className='w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]' />
                                      <span className={`text-[8px] md:text-[11px] font-bold tracking-wide whitespace-normal break-words w-full ${isDark ? 'text-amber-400/80' : 'text-amber-700/80'}`}>
                                        {guidedProject.detail}
                                      </span>
                                    </div>
                                  )}
                                </Button>
                              ))}
                            {getAvailableProjects(language).filter(guidedProject =>
                              projectSearchQuery.trim() === '' ||
                              guidedProject.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                              guidedProject.description.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                              guidedProject.tag.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                              (guidedProject.detail && guidedProject.detail.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                            ).length === 0 && (
                                <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  <p className="text-sm">
                                    {language === 'tr' ? 'Aramanızla eşleşen rehberli ders bulunamadı.' : 'No guided lessons found matching your search.'}
                                  </p>
                                </div>
                              )}
                          </div>
                        </section>
                      </div>
                    )}

                    {/* Bottom Section: Examples organized in levels */}
                    {projectPickerTab === 'all' && (
                      <div className='flex flex-col gap-16'>
                        {exampleLevelOrder.map((level) => {
                          const projects = groupedExampleProjects[level];
                          if (!projects || projects.length === 0) return null;

                          // Filter projects based on search query
                          const filteredProjects = projectSearchQuery.trim() === ''
                            ? projects
                            : projects.filter(project =>
                              project.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                              project.description.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                              project.tag.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                              (project.detail && project.detail.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                            );

                          if (filteredProjects.length === 0) return null;

                          return (
                            <section key={level} className='space-y-4 md:space-y-6 w-full'>
                              <div className='flex items-center gap-3 md:gap-4 px-1 md:px-2'>
                                <p className={`text-[10px] md:text-xs font-black tracking-[0.3em] md:tracking-[0.4em] whitespace-nowrap ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                  {exampleLevelLabels[level]}
                                </p>
                                <p className={`text-[10px] md:text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} truncate`}>
                                  {exampleLevelHints[level]}
                                </p>
                                <div className={`h-px flex-1 ${isDark ? 'bg-blue-500/60' : 'bg-blue-400/60'}`} />
                              </div>

                              <div className='grid grid-cols-1 gap-6 w-full max-w-full'>
                                {filteredProjects.map((example) => {
                                  const isBasicLevel = level === 'basic';
                                  return (
                                    <Button
                                      key={example.id}
                                      variant='ghost'
                                      className={`group h-auto min-h-[120px] md:min-h-[160px] flex-col items-start gap-3 md:gap-5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 text-left transition-all duration-300 hover:translate-y-[-4px] active:scale-[0.98] ${isDark ? 'border-slate-800/40 bg-slate-900/20 hover:bg-slate-900/80 hover:border-cyan-500/30' : 'border-slate-200/50 bg-white hover:bg-slate-50 hover:border-blue-500/20'} w-full overflow-hidden shadow-sm hover:shadow-2xl`}
                                      onClick={() => { setShowProjectPicker(false); runWithSaveGuard(() => applyExampleProject(example.data, example.id)); }}
                                    >
                                      <div className='flex items-center justify-between w-full gap-4 overflow-hidden flex-nowrap'>
                                        <span className={`font-black text-base md:text-2xl leading-none transition-colors duration-300 break-words flex-1 min-w-0 ${isDark ? 'group-hover:text-cyan-400' : 'group-hover:text-blue-600'}`}>{example.title}</span>
                                        <span className={`text-[8px] md:text-[10px] font-black  tracking-[0.2em] px-3 py-1.5 rounded-full whitespace-nowrap border shrink-0 flex-shrink-0 ${isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{example.tag}</span>
                                      </div>
                                      <p className={`text-[11px] md:text-sm leading-relaxed font-medium italic transition-colors whitespace-normal break-words break-all w-full ${isDark ? 'text-slate-400/80 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-800'}`}>{example.description}</p>
                                      {example.detail && (
                                        <div className='mt-auto pt-2 md:pt-4 flex items-center gap-2 md:gap-3 w-full border-t border-slate-800/10 dark:border-slate-800/50'>
                                          <div className='w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]' />
                                          <span className={`text-[8px] md:text-[11px] font-bold tracking-wide whitespace-normal break-words break-all w-full ${isDark ? 'text-amber-400/80' : 'text-amber-700/80'}`}>{example.detail}</span>
                                        </div>
                                      )}
                                    </Button>
                                  );
                                })}
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>


          <Dialog
            open={showOnboarding}
            onOpenChange={(open) => {
              if (!open) closeOnboardingForever();
              else setShowOnboarding(true);
            }}
          >
            <DialogContent className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} sm:max-w-2xl md:max-w-3xl p-0 overflow-hidden liquid-glass-light`}>
              {/* Progress Bar */}
              <div className="w-full h-1 bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${((onboardingStep + 1) / onboardingSteps.length) * 100}%` }}
                />
              </div>

              <DialogHeader className="px-8 pt-6 pb-2 cursor-grab active:cursor-grabbing select-none" data-drag-handle>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <DialogTitle className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {onboardingSteps[onboardingStep]?.title}
                  </DialogTitle>
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${isDark ? 'bg-slate-800 text-cyan-400 border border-slate-700' : 'bg-slate-100 text-cyan-600 border border-slate-200'}`}>
                    {onboardingStep + 1} / {onboardingSteps.length}
                  </span>
                </div>
                <DialogDescription className={`text-base md:text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {onboardingSteps[onboardingStep]?.description}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between gap-4 px-8 py-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 mt-4">
                <Button variant="ghost" onClick={closeOnboardingForever} className="text-xs font-semibold">
                  {t.skip}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={prevOnboarding}
                    disabled={onboardingStep === 0}
                    className="text-xs font-semibold"
                  >
                    {t.back}
                  </Button>
                  <Button onClick={nextOnboarding} className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold">
                    {onboardingStep >= onboardingSteps.length - 1
                      ? t.finish
                      : t.next}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>


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

          {/* Tasks Modal */}
          <Dialog open={showTasksModal} onOpenChange={setShowTasksModal} modal={false}>
            <DialogContent
              showCloseButton={false}
              onEscapeKeyDown={(e) => e.preventDefault()}
              className={`bg-white border-slate-200 p-0 overflow-visible flex flex-col top-auto left-auto translate-x-0 translate-y-0 liquid-glass-light`}
              data-modal-content
              style={{
                position: 'fixed',
                left: typeof window !== 'undefined' && window.innerWidth >= 768 ? tasksModalPosition.x : 0,
                top: typeof window !== 'undefined' && window.innerWidth >= 768 ? tasksModalPosition.y : 0,
                width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${tasksModalSize.width}px` : '100vw',
                height: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${tasksModalSize.height}px` : '100vh',
                maxWidth: 'none',
                maxHeight: 'none',
                borderRadius: typeof window !== 'undefined' && window.innerWidth >= 768 ? '1rem' : 0,
                borderWidth: 3,
              }}
            >
              <div className="relative flex flex-col h-full rounded-2xl shadow-2xl overflow-visible">
                <DialogHeader
                  className={cn(
                    "p-3 sm:p-4 border-b cursor-grab active:cursor-grabbing select-none touch-none sticky top-0 z-10",
                    isDark ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-white"
                  )}
                  data-modal-header
                  onPointerDown={(e) => handlePointerDown(e, 'tasks')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <DialogTitle className={isDark ? 'text-white font-semibold' : 'text-slate-900 font-semibold'}>
                        {t.tasks}
                      </DialogTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <TooltipWrapper title={t.switchTerminal}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-slate-300 dark:hover:bg-slate-600"
                          onClick={() => {
                            setShowTasksModal(false);
                            setShowTerminalModal(true);
                          }}
                        >
                          <TerminalIcon className="h-5 w-5" />
                        </Button>
                      </TooltipWrapper>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
                        onClick={() => setShowTasksModal(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <DialogDescription className="sr-only">
                    {t.deviceTasksAndConfig}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  <div className={`grid gap-4 ${isTasksNarrow ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
                    <div className={`${isTasksNarrow ? '' : 'lg:col-span-2'} overflow-y-auto custom-scrollbar`}>
                      <PortPanel
                        ports={state.ports}
                        t={t}
                        theme={theme}
                        deviceName={state.hostname}
                        deviceModel={activeDeviceType === 'router' ? 'ISR 4451 X' : (state.switchModel || 'WS-C2960-24TT-L')}
                        activeDeviceId={activeDeviceId}
                        isDevicePoweredOff={topologyDevices.some(d => d.id === activeDeviceId && d.status === 'offline')}
                        topologyDevices={topologyDevices}
                        onTogglePower={toggleDevicePower}
                        topologyConnections={topologyConnections || undefined}
                      />
                      <VlanPanel
                        vlans={state.vlans}
                        ports={state.ports}
                        deviceName={state.hostname}
                        deviceModel={activeDeviceType === 'router' ? 'ISR 4451 X' : (state.switchModel || 'WS-C2960-24TT-L')}
                        deviceId={activeDeviceId}
                        onTogglePower={toggleDevicePower}
                        onExecuteCommand={handleCommand}
                        t={t}
                        theme={theme}
                        activeDeviceType={activeDeviceType}
                        isDevicePoweredOff={topologyDevices.some(d => d.id === activeDeviceId && d.status === 'offline')}
                      />
                      <SecurityPanel
                        security={state.security}
                        t={t}
                        theme={theme}
                        deviceId={activeDeviceId}
                        isDevicePoweredOff={topologyDevices.some(d => d.id === activeDeviceId && d.status === 'offline')}
                        onTogglePower={toggleDevicePower}
                      />
                    </div>
                    {activeDeviceType !== 'pc' && (
                      <div className="overflow-y-auto custom-scrollbar">
                        <TaskCard
                          tasks={activeDeviceTasks}
                          state={state}
                          context={taskContext}
                          color="from-red-500 to-rose-500"
                          isDark={isDark}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {/* Resize handles - hidden on mobile */}
                {typeof window !== 'undefined' && window.innerWidth >= 768 && (
                  <>
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none bg-transparent hover:bg-cyan-500/10"
                      onPointerDown={(e) => handleResizeStart(e, 'w', 'tasks')}
                    />
                    <div
                      className="absolute right-[-5px] top-0 bottom-0 w-[5px] cursor-ew-resize select-none touch-none rounded-r-lg bg-transparent hover:bg-cyan-500/20"
                      onPointerDown={(e) => handleResizeStart(e, 'e', 'tasks')}
                    />
                    <div
                      className="absolute left-[10px] right-2 bottom-0 h-[10px] cursor-ns-resize select-none touch-none rounded-b-lg bg-transparent hover:bg-cyan-500/20"
                      onPointerDown={(e) => handleResizeStart(e, 's', 'tasks')}
                    />
                    <TooltipWrapper title={t.resizeAction}>
                      <div
                        className="absolute bottom-0 right-0 z-20 h-7 w-7 cursor-se-resize select-none touch-none rounded-tl-lg rounded-br-lg border border-slate-400/30 dark:border-slate-500/30 bg-slate-500/30 text-slate-100/80 hover:bg-cyan-500/30 hover:text-white flex items-center justify-center"
                        onPointerDown={(e) => handleResizeStart(e, 'se', 'tasks')}
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
                "p-0 overflow-visible flex flex-col top-auto left-auto translate-x-0 translate-y-0 shadow-[0_35px_120px_rgba(15,23,42,0.35)] liquid-glass-light",
                isDark
                  ? "bg-slate-950/80 border-white/10 backdrop-blur-2xl"
                  : "bg-white/70 border-white/70 backdrop-blur-2xl"
              )}
              data-modal-content
              style={{
                position: 'fixed',
                left: typeof window !== 'undefined' && window.innerWidth >= 768 ? firewallModalPosition.x : 0,
                top: typeof window !== 'undefined' && window.innerWidth >= 768 ? firewallModalPosition.y : 0,
                width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${firewallModalSize.width}px` : '100vw',
                height: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${firewallModalSize.height}px` : '100vh',
                maxWidth: 'none',
                maxHeight: 'none',
                borderRadius: typeof window !== 'undefined' && window.innerWidth >= 768 ? '1rem' : 0,
                borderWidth: 3,
              }}
            >
              <div className={cn(
                "relative flex flex-col h-full overflow-visible",
                typeof window !== 'undefined' && window.innerWidth >= 768 ? 'rounded-2xl' : 'rounded-none'
              )}>
                <DialogHeader
                  className={cn(
                    "p-3 sm:p-4 border-b cursor-grab active:cursor-grabbing select-none touch-none sticky top-0 z-10 backdrop-blur-xl",
                    isDark ? "border-white/10 bg-slate-900/75" : "border-white/70 bg-white/80"
                  )}
                  data-modal-header
                  onPointerDown={(e) => handlePointerDown(e, 'firewall')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <DialogTitle className={cn("font-semibold truncate", isDark ? 'text-white' : 'text-slate-900')}>
                        {isTR ? 'Firewall' : 'Firewall'} - {topologyDevices?.find((d: any) => d.id === activeFirewallId)?.name || activeFirewallId}
                      </DialogTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Mobile: Power Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:hidden hover:bg-amber-500/20 hover:text-amber-500"
                        onClick={() => {
                          if (activeFirewallId) {
                            console.log('Firewall power toggle:', activeFirewallId, 'Current status:', topologyDevices.find(d => d.id === activeFirewallId)?.status);
                            toggleDevicePower(activeFirewallId);
                          } else {
                            console.log('No active firewall ID');
                          }
                        }}
                        title={t.power}
                      >
                        <Power className={cn("h-3.5 w-3.5", topologyDevices.find(d => d.id === activeFirewallId)?.status === 'offline' ? 'text-red-500' : 'text-green-500')} />
                      </Button>
                      {/* Mobile: Quick Settings Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-7 w-7 sm:hidden", firewallActiveTab === 'settings' ? 'bg-primary/20 text-primary' : 'hover:bg-primary/20')}
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
                {typeof window !== 'undefined' && window.innerWidth >= 768 && (
                  <>
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none bg-transparent hover:bg-red-500/10"
                      onPointerDown={(e) => handleResizeStart(e, 'w', 'firewall')}
                    />
                    <div
                      className="absolute -right-[5px] top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none rounded-r-lg bg-transparent hover:bg-red-500/20"
                      onPointerDown={(e) => handleResizeStart(e, 'e', 'firewall')}
                    />
                    <div
                      className="absolute -bottom-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-b-lg bg-transparent hover:bg-red-500/20"
                      onPointerDown={(e) => handleResizeStart(e, 's', 'firewall')}
                    />
                    <TooltipWrapper title={t.resizeAction}>
                      <div
                        className="absolute -bottom-2 -right-2 z-20 h-7 w-7 cursor-se-resize select-none touch-none rounded-tl-lg rounded-br-lg border border-slate-400/30 bg-slate-500/30 text-slate-100/80 hover:bg-red-500/30 hover:text-white flex items-center justify-center"
                        onPointerDown={(e) => handleResizeStart(e, 'se', 'firewall')}
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
          <Dialog open={showPCPanel} onOpenChange={setShowPCPanel} modal={false}>
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
                left: typeof window !== 'undefined' && window.innerWidth >= 768 ? pcModalPosition.x : 0,
                top: typeof window !== 'undefined' && window.innerWidth >= 768 ? pcModalPosition.y : 0,
                width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${pcModalSize.width}px` : '100vw',
                height: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${pcModalSize.height}px` : '100vh',
                maxWidth: 'none',
                maxHeight: 'none',
                borderRadius: typeof window !== 'undefined' && window.innerWidth >= 768 ? '1rem' : 0,
                borderWidth: 3,
              }}
            >
              <div className={cn(
                "relative flex flex-col h-full overflow-visible",
                typeof window !== 'undefined' && window.innerWidth >= 768 ? 'rounded-2xl' : 'rounded-none'
              )}>
                <DialogHeader
                  className={cn(
                    "p-3 sm:p-4 border-b cursor-grab active:cursor-grabbing select-none touch-none sticky top-0 z-10 backdrop-blur-xl",
                    isDark ? "border-white/10 bg-slate-900/75" : "border-white/70 bg-white/80"
                  )}
                  data-modal-header
                  onPointerDown={(e) => handlePointerDown(e, 'pc')}
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
                    onNavigate={handlePCPanelNavigate}
                    onDeleteDevice={handleDeviceDelete}
                  />
                </div>
                {/* Resize handles - hidden on mobile */}
                {typeof window !== 'undefined' && window.innerWidth >= 768 && (
                  <>
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none bg-transparent hover:bg-cyan-500/10"
                      onPointerDown={(e) => handleResizeStart(e, 'w', 'pc')}
                    />
                    <div
                      className="absolute -right-[5px] top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none rounded-r-lg bg-transparent hover:bg-cyan-500/20"
                      onPointerDown={(e) => handleResizeStart(e, 'e', 'pc')}
                    />
                    <div
                      className="absolute -bottom-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-b-lg bg-transparent hover:bg-cyan-500/20"
                      onPointerDown={(e) => handleResizeStart(e, 's', 'pc')}
                    />
                    <TooltipWrapper title={t.resizeAction}>
                      <div
                        className="absolute -bottom-2 -right-2 z-20 h-7 w-7 cursor-se-resize select-none touch-none rounded-tl-lg rounded-br-lg border border-slate-400/30 bg-slate-500/30 text-slate-100/80 hover:bg-cyan-500/30 hover:text-white flex items-center justify-center"
                        onPointerDown={(e) => handleResizeStart(e, 'se', 'pc')}
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

          {/* Terminal Full-Screen Modal */}
          <Dialog open={showTerminalModal} onOpenChange={setShowTerminalModal} modal={false}>
            <DialogContent
              showCloseButton={false}
              onEscapeKeyDown={(e) => e.preventDefault()}
              className={`bg-white border-slate-200 p-0 overflow-visible flex flex-col top-auto left-auto translate-x-0 translate-y-0 liquid-glass-light`}
              data-modal-content
              style={{
                position: 'fixed',
                left: typeof window !== 'undefined' && window.innerWidth >= 768 ? cliModalPosition.x : 0,
                top: typeof window !== 'undefined' && window.innerWidth >= 768 ? cliModalPosition.y : 0,
                width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${cliModalSize.width}px` : '100vw',
                height: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${cliModalSize.height}px` : '100vh',
                maxWidth: 'none',
                maxHeight: 'none',
                borderRadius: typeof window !== 'undefined' && window.innerWidth >= 768 ? '1rem' : 0,
                borderWidth: 3,
              }}
            >
              <div className="relative flex flex-col h-full rounded-2xl shadow-2xl overflow-visible">
                <DialogHeader
                  className={cn(
                    "p-3 sm:p-4 border-b cursor-grab active:cursor-grabbing select-none touch-none sticky top-0 z-10",
                    isDark ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-white"
                  )}
                  data-modal-header
                  onPointerDown={(e) => handlePointerDown(e, 'cli')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <DialogTitle className={isDark ? 'text-white font-semibold' : 'text-slate-900 font-semibold'}>
                        {t.cliInterface}
                      </DialogTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <TooltipWrapper title={t.switchTasks}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-slate-300 dark:hover:bg-slate-600"
                          onClick={() => {
                            setShowTerminalModal(false);
                            setShowTasksModal(true);
                          }}
                        >
                          <ShieldCheck className="h-3 w-3" />
                        </Button>
                      </TooltipWrapper>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
                        onClick={() => setShowTerminalModal(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <DialogDescription className="sr-only">
                    {t.cliInterface}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden rounded-b-2xl">
                  <Terminal
                    key="cli-terminal"
                    className="h-full"
                    deviceId={activeDeviceId}
                    deviceName={
                      (() => {
                        const deviceState = deviceStates.get(activeDeviceId);
                        return deviceState?.hostname || activeDeviceId;
                      })()
                    }
                    prompt={prompt}
                    state={state}
                    onCommand={handleCommand}
                    onClear={handleClearTerminal}
                    output={output}
                    isLoading={isExecutingCommand}
                    isConnectionError={topologyDevices.some(d => d.id === activeDeviceId && d.status === 'offline')}
                    connectionErrorMessage={t.connectionError}
                    isPoweredOff={topologyDevices.some(d => d.id === activeDeviceId && d.status === 'offline')}
                    onTogglePower={toggleDevicePower}
                    onClose={() => setShowTerminalModal(false)}
                    t={t}
                    theme={theme}
                    language={language}
                    onUpdateHistory={handleUpdateHistory}
                    confirmDialog={confirmDialog}
                    setConfirmDialog={setConfirmDialog}
                    device={topologyDevices.find(d => d.id === activeDeviceId)}
                    devices={topologyDevices}
                    deviceStates={deviceStates}
                    onRequestFocus={() => {
                      requestAnimationFrame(() => {
                        const el = document.querySelector('[data-terminal-input]') as HTMLInputElement | null;
                        const terminal = document.querySelector('[data-terminal-scroll]') as HTMLDivElement | null;
                        if (terminal) {
                          terminal.scrollTop = terminal.scrollHeight;
                        }
                        el?.focus();
                      });
                    }}
                  />
                </div>
                {/* Resize handles - hidden on mobile */}
                {typeof window !== 'undefined' && window.innerWidth >= 768 && (
                  <>
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none bg-transparent hover:bg-cyan-500/10"
                      onPointerDown={(e) => handleResizeStart(e, 'w', 'cli')}
                    />
                    <div
                      className="absolute -right-[5px] top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none rounded-r-lg bg-transparent hover:bg-cyan-500/20"
                      onPointerDown={(e) => handleResizeStart(e, 'e', 'cli')}
                    />
                    <div
                      className="absolute -bottom-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-b-lg bg-transparent hover:bg-cyan-500/20"
                      onPointerDown={(e) => handleResizeStart(e, 's', 'cli')}
                    />
                    <TooltipWrapper title={t.resizeAction}>
                      <div
                        className="absolute -bottom-2 -right-2 z-20 h-7 w-7 cursor-se-resize select-none touch-none rounded-tl-lg rounded-br-lg border border-slate-400/30 bg-slate-500/30 text-slate-100/80 hover:bg-cyan-500/30 hover:text-white flex items-center justify-center"
                        onPointerDown={(e) => handleResizeStart(e, 'se', 'cli')}
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
            isVisible={showRouterPanel}
            onClose={() => setShowRouterPanel(false)}
            topologyDevices={topologyDevices || undefined}
            deviceStates={deviceStates}
            cableInfo={cableInfo}
          />

          {/* Main Content - Fits between header and footer with scroll */}
          <main className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Tab Content - Always render but hide non-active */}
              <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'topology' ? 'flex' : 'hidden'} print:flex`}>
                {/* Topology Toolbar - Fixed at top */}
                {activeTab === 'topology' && (
                  <div className="sticky top-0 z-30 px-4 py-2 border-b backdrop-blur-md bg-background/95 hidden md:flex items-center gap-3">
                    {/* Reset View Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${isDark
                            ? 'text-teal-400 hover:text-slate-300 hover:bg-teal-400/10'
                            : 'text-teal-600 hover:text-slate-600 hover:bg-teal-600/10'
                            }`}
                          onClick={() => {
                            setZoom(1.0);
                            setPan({ x: 0, y: 0 });
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.resetView}</TooltipContent>
                    </Tooltip>
                    {/* Active Device Dropdown */}
                    <DropdownMenu onOpenChange={(open) => { if (!open) setDeviceSearchQuery(''); }}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-600'
                            : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-400'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            {activeDeviceId && (topologyDevices.some(d => d.id === activeDeviceId)) ? (
                              <>
                                {(() => {
                                  const activeTopologyDevice = topologyDevices.find(d => d.id === activeDeviceId);
                                  const status = activeTopologyDevice?.status || 'online';
                                  const statusColor =
                                    status === 'offline'
                                      ? 'bg-rose-500'
                                      : status === 'online'
                                        ? 'bg-emerald-400'
                                        : 'bg-amber-400';
                                  const statusLabel =
                                    language === 'tr'
                                      ? status === 'offline'
                                        ? 'Kapalı'
                                        : status === 'online'
                                          ? 'Çevrimiçi'
                                          : 'Bilinmeyen'
                                      : status === 'offline'
                                        ? 'Offline'
                                        : status === 'online'
                                          ? 'Online'
                                          : 'Unknown';
                                  return (
                                    <>
                                      <TooltipWrapper title={statusLabel}>
                                        <span
                                          className="w-2 h-2 rounded-full mr-0.5"
                                        >
                                          <span className={`block w-2 h-2 rounded-full ${statusColor} shadow-[0_0_6px_rgba(45,212,191,0.8)]`} />
                                        </span>
                                      </TooltipWrapper>
                                      <DeviceIcon
                                        type={activeDeviceType}
                                        switchModel={activeTopologyDevice?.switchModel}
                                        className="w-5 h-5"
                                      />
                                      <span className="text-xs font-bold">
                                        {truncateWithEllipsis(deviceStates.get(activeDeviceId)?.hostname || activeDeviceId, 15)}
                                      </span>
                                    </>
                                  );
                                })()}
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-bold text-slate-500">
                                  {t.selectDeviceDropdown}
                                </span>
                              </>
                            )}
                          </div>
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'} w-48`}>
                        <DropdownMenuLabel className="text-[11px] font-bold  tracking-widest text-slate-500 py-2">
                          {topologyDevices.length > 0 ? t.selectDevice : t.addDevicesFirst}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {topologyDevices.length > 0 && (
                          <div className="px-2 pb-1.5">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                              <Input
                                value={deviceSearchQuery}
                                onChange={e => setDeviceSearchQuery(e.target.value)}
                                placeholder={t.searchShort}
                                className="h-7 pl-6 pr-7 text-xs"
                                autoFocus
                                onKeyDown={e => e.stopPropagation()}
                              />
                              {deviceSearchQuery && (
                                <button
                                  onClick={() => setDeviceSearchQuery('')}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        <ScrollArea className={topologyDevices.length > 0 ? "h-56" : "h-auto"}>
                          {topologyDevices.length > 0 ? (
                            topologyDevices
                              .filter(device => {
                                if (!deviceSearchQuery.trim()) return true;
                                const q = deviceSearchQuery.toLowerCase();
                                const name = (deviceStates.get(device.id)?.hostname || device.name).toLowerCase();
                                return name.includes(q) || device.type.toLowerCase().includes(q);
                              })
                              .map((device) => {
                                const currentDeviceState = deviceStates.get(device.id);
                                const displayName = currentDeviceState?.hostname || device.name;
                                const status = device.status || 'online';
                                const statusColor =
                                  status === 'offline'
                                    ? 'bg-rose-500'
                                    : status === 'online'
                                      ? 'bg-emerald-400'
                                      : 'bg-amber-400';

                                return (
                                  <DropdownMenuItem
                                    key={device.id}
                                    className={`flex items-center gap-2 py-1.5 cursor-pointer ${activeDeviceId === device.id ? 'bg-violet-500/10 text-violet-400' : ''}`}
                                    onClick={() => { handleDeviceSelectFromMenu(device.type, device.id, device.switchModel, device.name); setDeviceSearchQuery(''); }}
                                  >
                                    <div className="flex items-center gap-2 cursor-pointer">
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                                      <DeviceIcon
                                        type={device.type}
                                        switchModel={device.switchModel}
                                        className="w-5 h-5"
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold leading-none">{truncateWithEllipsis(displayName, 12)}</span>
                                        <span className="text-[10px] opacity-50 capitalize">{device.type}</span>
                                      </div>
                                    </div>
                                  </DropdownMenuItem>
                                );
                              })
                          ) : (
                            <div className="p-3 text-center text-[11px] text-slate-500 italic">
                              {t.noDevicesInTopology}
                            </div>
                          )}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Device Buttons */}
                    <div className={`flex items-center gap-0 p-1 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-700/30' : 'bg-blue-50/50 border-blue-100/50'}`}>
                      {/* PC Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-500/10"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                const event = new CustomEvent('add-device', { detail: 'pc' });
                                window.dispatchEvent(event);
                              }
                            }}
                          >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z" />
                            </svg>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t.addPC}</TooltipContent>
                      </Tooltip>
                      {/* L2 Switch Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                const event = new CustomEvent('add-device', { detail: 'switchL2' });
                                window.dispatchEvent(event);
                              }
                            }}
                          >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
                            </svg>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t.addL2Switch}</TooltipContent>
                      </Tooltip>
                      {/* L3 Switch Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-purple-500 hover:bg-purple-500/10"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                const event = new CustomEvent('add-device', { detail: 'switchL3' });
                                window.dispatchEvent(event);
                              }
                            }}
                          >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
                            </svg>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t.addL3Switch}</TooltipContent>
                      </Tooltip>
                      {/* Router Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-purple-500 hover:bg-purple-500/10"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                const event = new CustomEvent('add-device', { detail: 'router' });
                                window.dispatchEvent(event);
                              }
                            }}
                          >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="9" strokeWidth={2} />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
                            </svg>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t.addRouter}</TooltipContent>
                      </Tooltip>
                      {/* IoT Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-cyan-500 hover:bg-cyan-500/10"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                const event = new CustomEvent('add-device', { detail: 'iot' });
                                window.dispatchEvent(event);
                              }
                            }}
                          >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.247 7.761a6 6 0 0 1 0 8.478" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.075 4.933a10 10 0 0 1 0 14.134" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.925 19.067a10 10 0 0 1 0-14.134" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.753 16.239a6 6 0 0 1 0-8.478" />
                              <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} cx="12" cy="12" r="2" />
                            </svg>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t.addIoT}</TooltipContent>
                      </Tooltip>
                      {/* Firewall Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                const event = new CustomEvent('add-device', { detail: 'firewall' });
                                window.dispatchEvent(event);
                              }
                            }}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4"></path>
                            </svg>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t.addFirewall}</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Cable Type Buttons */}
                    <div className={`flex items-center rounded-lg border overflow-hidden ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                      {(['straight', 'crossover', 'console'] as ('straight' | 'crossover' | 'console')[]).map((type) => (
                        <Tooltip key={type}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 px-2 flex items-center gap-1 text-xs font-bold
                                ${cableInfo.cableType === type
                                  ? isDark
                                    ? 'bg-slate-700/80'
                                    : 'bg-slate-200/80'
                                  : ''
                                }
                                ${type === 'straight'
                                  ? (cableInfo.cableType === type ? 'text-blue-400' : 'text-blue-500 hover:text-blue-400')
                                  : type === 'crossover'
                                    ? (cableInfo.cableType === type ? 'text-orange-400' : 'text-orange-500 hover:text-orange-400')
                                    : (cableInfo.cableType === type ? 'text-cyan-400' : 'text-cyan-500 hover:text-cyan-400')
                                }`}
                              onClick={() => setCableInfo({ ...cableInfo, cableType: type })}
                            >
                              {type === 'straight' ? (
                                <Cable className="w-4 h-4" />
                              ) : type === 'crossover' ? (
                                <Strikethrough className="w-4 h-4" />
                              ) : (
                                <Usb className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {type === 'straight'
                              ? t.straightCable
                              : type === 'crossover'
                                ? t.crossoverCable
                                : t.consoleCable}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>

                    <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    {/* Connect Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-cyan-500 hover:bg-cyan-500/10"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              const event = new CustomEvent('trigger-topology-connect');
                              window.dispatchEvent(event);
                            }
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 0 0 -5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0 -5.656-5.656l-1.1 1.1" />
                          </svg>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.connectDevices}</TooltipContent>
                    </Tooltip>

                    {/* Ping Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-500 hover:bg-amber-500/10"
                          onClick={() => {
                            const event = new CustomEvent('toggle-ping-mode');
                            window.dispatchEvent(event);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="Turquoise" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="flex items-center gap-2">
                        <span>{t.ping}</span>
                        <ShortcutBadge shortcut="P" variant="warning" />
                      </TooltipContent>
                    </Tooltip>

                    {/* Add Note Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-slate-500/10"
                          onClick={() => {
                            const event = new CustomEvent('add-note');
                            window.dispatchEvent(event);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="orange" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 0 0 -2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.addNote}</TooltipContent>
                    </Tooltip>



                    {/* Environment Settings Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
                          onClick={() => setIsEnvironmentPanelOpen(true)}
                        >
                          <Leaf className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t.environmentSettings}</TooltipContent>
                    </Tooltip>

                    <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    {/* Undo Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-slate-500/10"
                          onClick={handleUndo}
                          disabled={hasHydrated && !canUndo}
                        >
                          <Undo2 className={`w-4 h-4 ${!canUndo ? 'opacity-100' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="flex items-center gap-2">
                        <span>{t.undo}</span>
                        <ShortcutBadge shortcut="Ctrl+Z" variant="primary" />
                      </TooltipContent>
                    </Tooltip>

                    {/* Redo Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-slate-500/10"
                          onClick={handleRedo}
                          disabled={hasHydrated && !canRedo}
                        >
                          <Redo2 className={`w-4 h-4 ${!canRedo ? 'opacity-100' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="flex items-center gap-2">
                        <span>{t.redo}</span>
                        <ShortcutBadge shortcut="Ctrl+Y" variant="primary" />
                      </TooltipContent>
                    </Tooltip>

                    <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    {/* Refresh Network Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-pink-500 hover:bg-pink-500/10"
                          onClick={handleRefreshNetwork}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="flex items-center gap-2">
                        <span>{t.refreshNetworkF5}</span>
                        <ShortcutBadge shortcut="F5" variant="danger" />
                      </TooltipContent>
                    </Tooltip>

                  </div>
                )}
                {/* Network Topology fills remaining space */}
                <div ref={topologyContainerRef} className="flex-1 w-full h-full min-h-0">
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
                      setShowTasksModal(true);
                    }}
                    clearSelectionTrigger={clearSelectionTrigger}
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
                  {activeDeviceId && (activeDeviceId.startsWith('router-') || topologyDevices?.find(d => d.id === activeDeviceId)?.type === 'router' || topologyDevices?.find(d => d.id === activeDeviceId)?.type === 'switchL3') && topologyDevices && (
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
          </main>

          {/* Network Refresh Report - Top Right Toast */}
          {
            refreshNetworkReport?.show && (
              <div
                data-draggable-id="refresh-network-report"
                className={`fixed top-20 right-4 w-full max-w-sm rounded-xl border shadow-2xl animate-in slide-in-from-right-full duration-300 backdrop-blur-md select-none ${isDark
                  ? 'bg-zinc-950/40 border-zinc-800/50 text-zinc-100 shadow-black/40'
                  : 'bg-white/40 border-zinc-200/50 text-zinc-900 shadow-zinc-200/50'
                  }`}
                style={{
                  zIndex: focusedOverlay === 'refresh' ? 200 : 100,
                }}
                onMouseDown={() => setFocusedOverlay('refresh')}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between cursor-grab active:cursor-grabbing" data-drag-handle>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span className="text-blue-500 text-lg">🔄</span>
                      {refreshNetworkReport.title}
                    </h3>
            <TooltipWrapper title={t.close}>
                      <button
                        onClick={() => setRefreshNetworkReport(prev => prev ? { ...prev, show: false } : null)}
                        className="w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
                      >
                        <X className="w-3 h-3 text-white pointer-events-none" />
                      </button>
                    </TooltipWrapper>
                  </div>

                  <div className="space-y-2 text-xs">
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
              </div>
            )
          }

          {/* Footer - Save Status & Hints */}
          <footer className={`hidden md:block fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-xl transition-all h-[44px] pb-[50px] ${isDark ? 'bg-zinc-950/95 border-zinc-900' : 'bg-white/95 border-zinc-200'
            } ${showProjectPicker || showOnboarding || activeTab === 'terminal' ? 'hidden' : ''}`}>
            <div className="w-full px-5 py-2 pb-[10px]">
              <div className="flex items-center justify-between gap-4">
                {/* Save Status */}
                <div className="flex items-center gap-3">
                  <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${hasUnsavedChanges ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                      <span className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                      {hasUnsavedChanges
                        ? t.unsaved
                        : t.saved}
                    </span>
                    {lastSaveTime && (
                      <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        {t.lastSavedAt + lastSaveTime}
                      </span>
                    )}
                  </div>

                  {/* Quick Hints */}
                  <div className={`hidden md:flex items-center gap-2 whitespace-nowrap`}>
                    <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {t.tips}
                    </span>
                    <span className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'} whitespace-nowrap`}>
                      {activeTab === 'topology' && (
                        <>
                          <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                            }`}>TAB</kbd>
                          <span className="mx-1">{t.tabToNext}</span>
                          <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                            }`}>Ctrl+S</kbd>
                          <span className="mx-1">{t.saveLabel}</span>
                          <span className={`mx-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>|</span>
                          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {topologyDevices?.length || 0} {t.devicesCount}
                          </span>
                          <span className={`mx-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>|</span>
                          {/* Interaction Shortcuts Legend */}
                          <div className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className="font-semibold">LeftMB</span>:{t.pan}
                            <span className="mx-1">·</span>
                            <span className="font-semibold">MidMB</span>:{t.boxSelect}
                            <span className="mx-1">·</span>
                            <span className="font-semibold">RightMB</span>:{t.menu}
                            <span className="mx-1">·</span>
                            <span className="font-semibold">Wheel</span>:Zoom
                          </div>
                        </>
                      )}
                      {(activeTab === 'cmd' || activeTab === 'terminal') && (
                        <span className="text-[11px] italic">{t.clickIconsToRun}</span>
                      )}
                    </span>
                  </div>

                  {/* Task Event Notification - Positioned at top-left of footer */}
                  {lastTaskEvent && Date.now() - lastTaskEvent.timestamp < 5000 && (
                    <div className={`absolute -top-12 left-4 md:flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-lg animate-slide-up z-[10000] ${lastTaskEvent.type === 'completed'
                      ? isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                      : isDark ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                      }`}>
                      <span className={`text-xs font-semibold flex items-center gap-1.5 ${lastTaskEvent.type === 'completed'
                        ? 'text-green-500'
                        : 'text-orange-500'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${lastTaskEvent.type === 'completed'
                          ? 'bg-green-500'
                          : 'bg-orange-500'
                          }`} />
                        {lastTaskEvent.type === 'completed'
                          ? t.taskCompleted
                          : t.taskFailed}
                      </span>
                      <span className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {lastTaskEvent.taskName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Lab Progress - Hidden for PC devices or when no devices exist */}
                {activeDeviceType !== 'pc' && topologyDevices && topologyDevices.length > 0 && activeDeviceId && totalScore > 0 && (
                  <div className={`hidden md:flex items-center gap-2`}>
                    <span className={`text-[11px] font-bold  tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                      {t.labProgress}
                    </span>
                    <div className={`w-20 h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'} overflow-hidden`}>
                      <div
                        className="h-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.5)] transition-all duration-300"
                        style={{ width: `${(totalScore / maxScore) * 100}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                      {Math.round((totalScore / maxScore) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </footer>

          {/* Mobile Footer - Hints */}
          <footer className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-xl transition-all h-[36px] ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
            } ${showProjectPicker || showOnboarding || activeTab === 'terminal' ? 'hidden' : ''}`}>
            <div className="w-full px-3 py-1.5">
              <div className="flex items-center justify-between gap-2">
                {/* Mobile Hints */}
                <div className="flex items-center gap-2">
                  {activeTab === 'topology' && (
                    <>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {language === 'tr' ? 'Çift tık: Terminal' : 'Double tap: Terminal'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {language === 'tr' ? 'Uzun bas: Menü' : 'Long press: Menu'}
                      </span>
                    </>
                  )}
                </div>

                {/* Save Status - Mobile */}
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasUnsavedChanges ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                    }`} />
                  <span className={`text-[10px] font-semibold ${hasUnsavedChanges ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                    {hasUnsavedChanges ? (language === 'tr' ? 'Kaydedilmedi' : 'Unsaved') : (language === 'tr' ? 'Kaydedildi' : 'Saved')}
                  </span>
                </div>
              </div>
            </div>
          </footer>

          <LazyAboutModal
            isOpen={showAboutModal}
            onClose={() => setShowAboutModal(false)}
            onStartTour={() => {
              setShowAboutModal(false);
              setShowOnboarding(true);
              setOnboardingStep(0);
            }}
          />

          <EnvironmentSettingsPanel
            isOpen={isEnvironmentPanelOpen}
            onOpenChange={setIsEnvironmentPanelOpen}
          />

          {/* Guided Mode Panel */}
          <GuidedModePanel
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
            deviceAccessed={showTerminalModal ? (activeDeviceType === 'switchL2' || activeDeviceType === 'switchL3' ? 'switch' : activeDeviceType === 'router' ? 'router' : 'pc') : null}
            deviceState={state}
            topologyConnections={topologyConnections}
            topologyDevices={topologyDevices}
            onCheckAutoComplete={checkStepCompletionWithContext}
          />
        </div >
      </div >
    </AppErrorBoundary >
  );
}

interface PCInfoPopoverProps {
  pc: CanvasDevice;
  t: Translations;
  language: 'tr' | 'en';
  isDark: boolean;
  onClose: () => void;
  handleDeviceDoubleClick: (type: DeviceType, id: string) => void;
  onOpenPanel: (id: string) => void;
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
}

function PCInfoPopover({ pc, t, language, isDark, onClose, handleDeviceDoubleClick, onOpenPanel, topologyDevices, deviceStates }: PCInfoPopoverProps) {
  // Draggable position state
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pc-info-position');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (err) {
          errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'parsePcInfoPosition', savedValue: saved, error: String(err) }));
        }
      }
    }
    return { x: 16, y: 96 }; // default: bottom-24 right-4 = 16px from right, 96px from bottom
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const positionRef = useRef(position);
  const isDraggingRef = useRef(false);
  const [isDraggingUI, setIsDraggingUI] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    // Don't drag if clicking on buttons
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;

    e.preventDefault();
    isDraggingRef.current = true;
    setIsDraggingUI(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y
    };

    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
      containerRef.current.style.transition = 'none';
      containerRef.current.style.willChange = 'bottom, right';
    }

    let animationFrameId: number;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;

      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        if (!isDraggingRef.current || !containerRef.current) return;

        const dx = moveEvent.clientX - dragStartRef.current.x;
        const dy = dragStartRef.current.y - moveEvent.clientY;

        const newX = dragStartRef.current.posX - dx;
        const newY = dragStartRef.current.posY + dy;

        containerRef.current.style.right = `${newX}px`;
        containerRef.current.style.bottom = `${newY}px`;
      });
    };

    const handleMouseUp = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      isDraggingRef.current = false;
      setIsDraggingUI(false);

      if (containerRef.current) {
        containerRef.current.style.cursor = '';
        containerRef.current.style.transition = '';
        containerRef.current.style.willChange = '';

        const finalX = parseInt(containerRef.current.style.right);
        const finalY = parseInt(containerRef.current.style.bottom);

        // Clamp position to safe area
        const panelWidth = 280;
        const panelHeight = 400;
        const margin = 16;
        const safeX = Math.max(margin, Math.min(finalX, window.innerWidth - panelWidth - margin));
        const safeY = Math.max(margin, Math.min(finalY, window.innerHeight - panelHeight - margin));

        const clampedPos = { x: safeX, y: safeY };
        setPosition(clampedPos);
        localStorage.setItem('pc-info-position', JSON.stringify(clampedPos));
      }

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className={cn("hidden md:block fixed z-[10000] animate-scale-in")}
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
      }}
      onMouseDown={handleDragStart}
    >
      <div
        className={`rounded-2xl border shadow-2xl backdrop-blur-md min-w-[200px] max-w-[260px] ${isDark ? 'bg-zinc-950/40 border-zinc-800/50 text-zinc-100 shadow-black/40' : 'bg-white/40 border-zinc-200/50 text-zinc-900 shadow-zinc-200/50'}`}
      >
        <div className={`flex items-center justify-between px-2 py-1.5 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'} ${isDraggingUI ? 'cursor-grabbing' : 'cursor-grab'}`}>
          <div className="flex items-center gap-1.5">
            <GripHorizontal className="w-3 h-3 opacity-30" />
            <Monitor className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-black tracking-wider uppercase opacity-30">{pc?.name || pc?.id || 'Unknown'}</span>
          </div>
          <TooltipWrapper title={t.close}>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
            >
              <X className="w-3 h-3 text-white pointer-events-none" />
            </button>
          </TooltipWrapper>
        </div>
        <div className="overflow-hidden cursor-default">
          <div className="p-2 space-y-1 text-xs">
            <TooltipWrapper title={t.copy}>
              <div className="flex justify-between items-center cursor-pointer hover:bg-slate-500/10 rounded px-1 transition-colors" onClick={() => navigator.clipboard.writeText(pc?.ip || '0.0.0.0')}>
                <span className="opacity-50">IP</span>
                <span className="font-mono text-blue-500">{pc?.ip || '0.0.0.0'}</span>
              </div>
            </TooltipWrapper>
            <TooltipWrapper title={t.copy}>
              <div className="flex justify-between items-center cursor-pointer hover:bg-slate-500/10 rounded px-1 transition-colors" onClick={() => navigator.clipboard.writeText(pc?.subnet || '255.255.255.0')}>
                <span className="opacity-50">Subnet</span>
                <span className="font-mono opacity-80">{pc?.subnet || '255.255.255.0'}</span>
              </div>
            </TooltipWrapper>
            <TooltipWrapper title={t.copy}>
              <div className="flex justify-between items-center cursor-pointer hover:bg-slate-500/10 rounded px-1 transition-colors" onClick={() => navigator.clipboard.writeText(pc?.gateway || '0.0.0.0')}>
                <span className="opacity-50">GW</span>
                <span className="font-mono opacity-80">{pc?.gateway || '0.0.0.0'}</span>
              </div>
            </TooltipWrapper>
            <TooltipWrapper title={t.copy}>
              <div className="flex justify-between items-center cursor-pointer hover:bg-slate-500/10 rounded px-1 transition-colors" onClick={() => navigator.clipboard.writeText(pc?.ipv6 || '::')}>
                <span className="opacity-50">IPv6</span>
                <span className="font-mono opacity-80">{pc?.ipv6 || '::'}</span>
              </div>
            </TooltipWrapper>
            <TooltipWrapper title={t.copy}>
              <div className="flex justify-between items-center cursor-pointer hover:bg-slate-500/10 rounded px-1 transition-colors" onClick={() => navigator.clipboard.writeText(pc?.macAddress ? normalizeMAC(pc.macAddress) : 'N/A')}>
                <span className="opacity-50">MAC</span>
                <span className="font-mono opacity-30 text-xs">{pc?.macAddress ? normalizeMAC(pc.macAddress) : 'N/A'}</span>
              </div>
            </TooltipWrapper>
            {pc?.wifi && pc.wifi.enabled && (
              <div className="pt-1 border-t border-slate-500/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="opacity-50">WiFi</span>
                  <span className="text-xs font-bold text-purple-500">{t.active}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="opacity-50">SSID:</span>
                  <span className="font-mono">{pc?.wifi?.ssid || '-'}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="opacity-50">{t.channelShort}</span>
                  <span className="font-mono">{pc?.wifi?.channel || '-'}</span>
                  <span className="opacity-50">|</span>
                  <span className="font-mono uppercase">{pc?.wifi?.security || '-'}</span>
                </div>
                {(() => {
                  const strength = getWirelessSignalStrength(pc, topologyDevices, deviceStates);
                  const pctMap: Record<number, string> = { 0: '0%', 1: '1%', 2: '25%', 3: '50%', 4: '75%', 5: '100%' };
                  const colorMap: Record<number, string> = { 0: 'text-slate-400', 1: 'text-rose-500', 2: 'text-orange-500', 3: 'text-yellow-500', 4: 'text-emerald-500', 5: 'text-emerald-500' };
                  if (strength === 0) return null;
                  return (
                    <div className="flex justify-between items-center text-xs mt-0.5">
                      <span className="opacity-50">{t.signal}</span>
                      <span className={`font-bold ${colorMap[strength]}`}>{pctMap[strength]}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {pc?.services && (
              <div className="pt-1 border-t border-slate-500/20">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="opacity-50">{t.services}</span>
                  <div className="flex flex-wrap gap-0.5">
                    {pc?.services?.http?.enabled && (
                      <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-500 text-xs font-bold border border-amber-500/20">HTTP</span>
                    )}
                    {pc?.services?.dns?.enabled && (
                      <span className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-500 text-xs font-bold border border-blue-500/20">DNS</span>
                    )}
                    {pc?.services?.dhcp?.enabled && (
                      <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-500 text-xs font-bold border border-purple-500/20">DHCP</span>
                    )}
                    {!pc?.services?.http?.enabled && !pc?.services?.dns?.enabled && !pc?.services?.dhcp?.enabled && (
                      <span className="text-xs opacity-40 italic">{t.none}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="pt-1 border-t border-slate-500/20">
              <div className="flex justify-between items-center">
                <span className="opacity-50">{t.ipMode}</span>
                <span className={`text-xs font-bold tracking-wider ${pc?.ipConfigMode === 'dhcp' ? 'text-green-500' : 'opacity-60'}`}>
                  {pc?.ipConfigMode === 'dhcp' ? 'DHCP' : t.static}
                </span>
              </div>
            </div>
          </div>
          <div className={`px-2 py-1.5 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'} flex gap-1.5`}>
            <button
              onClick={() => {
                if (pc?.type && pc?.id) {
                  handleDeviceDoubleClick(pc.type, pc.id);
                }
              }}
              disabled={!pc?.type || !pc?.id}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-cyan-600 hover:bg-cyan-700 text-white disabled:bg-slate-700 disabled:text-slate-500' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:text-slate-500'}`}
            >
              {t.open}
            </button>
            <button
              onClick={() => {
                if (pc?.id) {
                  onOpenPanel(pc.id);
                }
              }}
              disabled={!pc?.id}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:bg-slate-800 disabled:text-slate-500' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:bg-slate-200 disabled:text-slate-400'}`}
            >
              <TooltipWrapper title={t.details}>
                <SettingsIcon className="w-3 h-3" />
              </TooltipWrapper>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RouterInfoPopoverProps {
  router: CanvasDevice;
  routerState?: SwitchState;
  t: Translations;
  language: 'tr' | 'en';
  isDark: boolean;
  onClose: () => void;
  handleDeviceDoubleClick: (type: DeviceType, id: string) => void;
  onOpenPanel: (id: string) => void;
  topologyConnections: CanvasConnection[];
}

function RouterInfoPopover({ router, routerState, t, language, isDark, onClose, handleDeviceDoubleClick, onOpenPanel, topologyConnections }: RouterInfoPopoverProps) {
  // Draggable position state
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('router-info-position');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (err) {
          errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ operation: 'parseRouterInfoPosition', savedValue: saved, error: String(err) }));
        }
      }
    }
    return { x: 16, y: 96 }; // default: bottom-24 right-4
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const positionRef = useRef(position);
  const isDraggingRef = useRef(false);
  const [isDraggingUI, setIsDraggingUI] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    // Don't drag if clicking on buttons
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;

    e.preventDefault();
    isDraggingRef.current = true;
    setIsDraggingUI(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y
    };

    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
      containerRef.current.style.transition = 'none';
      containerRef.current.style.willChange = 'bottom, right';
    }

    let animationFrameId: number;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;

      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        if (!isDraggingRef.current || !containerRef.current) return;

        const dx = moveEvent.clientX - dragStartRef.current.x;
        const dy = dragStartRef.current.y - moveEvent.clientY;

        const newX = dragStartRef.current.posX - dx;
        const newY = dragStartRef.current.posY + dy;

        containerRef.current.style.right = `${newX}px`;
        containerRef.current.style.bottom = `${newY}px`;
      });
    };

    const handleMouseUp = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      isDraggingRef.current = false;
      setIsDraggingUI(false);

      if (containerRef.current) {
        containerRef.current.style.cursor = '';
        containerRef.current.style.transition = '';
        containerRef.current.style.willChange = '';

        const finalX = parseInt(containerRef.current.style.right);
        const finalY = parseInt(containerRef.current.style.bottom);

        // Clamp position to safe area
        const panelWidth = 300;
        const panelHeight = 500;
        const margin = 16;
        const safeX = Math.max(margin, Math.min(finalX, window.innerWidth - panelWidth - margin));
        const safeY = Math.max(margin, Math.min(finalY, window.innerHeight - panelHeight - margin));

        const clampedPos = { x: safeX, y: safeY };
        setPosition(clampedPos);
        localStorage.setItem('router-info-position', JSON.stringify(clampedPos));
      }

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Get port information
  const ports = routerState?.ports ? Object.values(routerState.ports) : (router.ports || []);
  // Router has 6 ports: 1 console + 4 GigabitEthernet (gi0/0-gi0/3) + 1 WLAN0
  const totalPorts = Math.max(6, ports.length);

  // Use topology connections for most reliable count
  const connectedPorts = topologyConnections?.filter(conn =>
    conn.sourceDeviceId === router.id || conn.targetDeviceId === router.id
  ).length || 0;

  // Get DHCP pools
  const dhcpPools = routerState?.dhcpPools ? Object.keys(routerState.dhcpPools).length : 0;

  // Get WiFi status
  const wifiEnabled = routerState?.ports?.['wlan0']?.wifi?.mode === 'ap' || router?.wifi?.enabled;
  const wifiConfig = routerState?.ports?.['wlan0']?.wifi || router?.wifi;

  // Get IP addresses
  const ipAddresses = ports
    .filter((p: any) => p.ipAddress && !p.shutdown)
    .map((p: any) => `${p.id}: ${p.ipAddress}${p.subnetMask ? `/${p.subnetMask}` : ''}`)
    .slice(0, 3);

  return (
    <div
      ref={containerRef}
      className={cn("hidden md:block fixed z-[10000] animate-scale-in")}
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
      }}
      onMouseDown={handleDragStart}
    >
      <div
        className={`rounded-2xl border shadow-2xl backdrop-blur-md min-w-[200px] max-w-[280px] ${isDark ? 'bg-zinc-950/40 border-zinc-800/50 text-zinc-100 shadow-black/40' : 'bg-white/40 border-zinc-200/50 text-zinc-900 shadow-zinc-200/50'}`}
      >
        <div className={`flex items-center justify-between px-2 py-1.5 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'} ${isDraggingUI ? 'cursor-grabbing' : 'cursor-grab'}`}>
          <div className="flex items-center gap-1.5">
            <GripHorizontal className="w-3 h-3 opacity-30" />
            {router.type.startsWith('switch') ? <SwitchIcon isL3={router.type === 'switchL3'} className="w-3.5 h-3.5 text-purple-500" /> : <RouterIcon className="w-3.5 h-3.5 text-purple-500" />}
            <span className="text-xs font-black tracking-wider uppercase opacity-30">{router.name || router.id}</span>
          </div>
          <TooltipWrapper title={t.close}>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
            >
              <X className="w-3 h-3 text-white pointer-events-none" />
            </button>
          </TooltipWrapper>
        </div>
        <div className="overflow-hidden cursor-default">
          <div className="p-2 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="opacity-50">{t.portsShort}</span>
              <span className="font-mono">
                <span className="text-green-500">{connectedPorts}</span>
                <span className="opacity-50">/{totalPorts}</span>
                <span className="ml-1 opacity-50">{t.connectedShort}</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-50">{t.routing}</span>
              <span className={`text-xs font-bold tracking-wider ${routerState?.ipRouting ? 'text-green-500' : 'text-slate-500'}`}>
                {routerState?.ipRouting ? t.enabled : t.disabled}
              </span>
            </div>
            {wifiEnabled && (
              <div className="flex justify-between items-center">
                <span className="opacity-50 flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <line x1="12" y1="20" x2="12.01" y2="20" />
                  </svg>
                  WiFi
                </span>
                <span className="text-cyan-500">{t.active}</span>
              </div>
            )}
            {wifiEnabled && wifiConfig?.ssid && (
              <div className="pt-1 border-t border-slate-500/20 space-y-1">
                <div className="flex gap-2 text-xs">
                  <span className="opacity-50">SSID:</span>
                  <span className="font-mono font-bold text-cyan-500">{wifiConfig.ssid}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="opacity-50">{t.channelShort}:</span>
                  <span className="font-mono">{wifiConfig.channel || '2.4GHz'}</span>
                  <span className="opacity-50">|</span>
                  <span className="font-mono uppercase">{wifiConfig.security || 'open'}</span>
                </div>
              </div>
            )}
            {dhcpPools > 0 && (
              <div className="flex justify-between items-center">
                <span className="opacity-50">DHCP</span>
                <span className="font-bold text-purple-500">{dhcpPools} {t.pools}</span>
              </div>
            )}
            {ipAddresses.length > 0 && (
              <div className="pt-1 border-t border-slate-500/20">
                <div className="opacity-30 text-xs mb-0.5 uppercase font-bold tracking-tighter">IP Addresses</div>
                {ipAddresses.map((addr: string, i: number) => (
                  <TooltipWrapper key={i} title={t.copy}>
                    <div
                      className="font-mono text-xs opacity-70 truncate cursor-pointer hover:bg-slate-500/10 rounded px-1 transition-colors"
                      onClick={() => navigator.clipboard.writeText(addr)}
                    >
                      {addr}
                    </div>
                  </TooltipWrapper>
                ))}
              </div>
            )}
          </div>
          <div className={`px-2 py-1.5 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'} flex gap-1.5`}>
            <button
              onClick={() => {
                handleDeviceDoubleClick(router.type, router.id);
              }}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
            >
              {t.openCLI}
            </button>
            <TooltipWrapper title={t.details}>
              <button
                onClick={() => {
                  onOpenPanel(router.id);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
              >
                <SettingsIcon className="w-3 h-3" />
              </button>
            </TooltipWrapper>
          </div>
        </div>
      </div>
    </div>
  );
}
