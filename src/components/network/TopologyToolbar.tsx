'use client';

import { useState, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardNavigation';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Undo2, Redo2, Search, X, Cable, LineSquiggle, Leaf, Plug, TrendingUpDown, Users, UserKey, Activity, Stethoscope, LayoutGrid, Camera, Layers, Sparkles, CircleDot, Grid, RotateCcw, RefreshCw } from 'lucide-react';
import type { Translations } from '@/contexts/LanguageContext';
import type { CanvasDevice, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState, CableType, CableInfo } from '@/lib/network/types';
import { useAppStore } from '@/lib/store/appStore';
import { cn } from '@/lib/utils';
import { ViewVisibilityMenu } from './ViewVisibilityMenu';
import { DeviceIcon } from './DeviceIcon';
import { NetworkDiagnosticsModal } from './NetworkDiagnosticsModal';
import { SnapshotManagerModal } from './SnapshotManagerModal';
import { applyAutoLayout, type LayoutAlgorithm } from '@/lib/network/autoLayoutEngine';
import { useUiPreferences } from '@/hooks/useUiPreferences';
import { getDeviceCenter } from '@/components/network/NetworkTopology/utils/networkTopology.helpers';

interface TopologyToolbarProps {
  t: Translations;
  isDark: boolean;
  language?: 'tr' | 'en';
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  activeDeviceId: string;
  activeDeviceType: DeviceType;
  cableInfo: CableInfo;
  deviceSearchQuery: string;
  canUndo: boolean;
  canRedo: boolean;
  hasHydrated: boolean;
  isExamActive: boolean;
  setDeviceSearchQuery: (q: string) => void;
  setCableInfo: (info: CableInfo) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  resetView?: () => void;
  handleDeviceSelectFromMenu: (type: DeviceType, id?: string, model?: string, name?: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleRefreshNetwork: () => void;
  setIsEnvironmentPanelOpen: (open: boolean) => void;
  onOpenStudentJoin?: () => void;
  onOpenTeacherPanel?: () => void;
  isPingPanelOpen?: boolean;
}

function truncateWithEllipsis(text: string | undefined | null, maxLength: number) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

const TOOLBAR_ITEMS: Array<{ type: DeviceType; labelKey: keyof Translations; colorClass: string }> = [
  { type: 'pc', labelKey: 'addPC', colorClass: 'text-primary-500 hover:bg-primary-500/10' },
  { type: 'switchL2', labelKey: 'addL2Switch', colorClass: 'text-accent-500 hover:bg-accent-500/10' },
  { type: 'switchL3', labelKey: 'addL3Switch', colorClass: 'text-purple-500 hover:bg-purple-500/10' },
  { type: 'router', labelKey: 'addRouter', colorClass: 'text-purple-500 hover:bg-purple-500/10' },
  { type: 'firewall', labelKey: 'addFirewall', colorClass: 'text-error-500 hover:bg-error-500/10' },
  { type: 'wlc', labelKey: 'addWLC', colorClass: 'text-yellow-500 hover:bg-yellow-500/10' },
  { type: 'hub', labelKey: 'addHub', colorClass: 'text-cyan-500 hover:bg-cyan-500/10' },
  { type: 'cloud', labelKey: 'addCloud', colorClass: 'text-sky-500 hover:bg-sky-500/10' },
  { type: 'mobile', labelKey: 'addMobile', colorClass: 'text-emerald-500 hover:bg-emerald-500/10' },
  { type: 'printer', labelKey: 'addPrinter', colorClass: 'text-amber-500 hover:bg-amber-500/10' },
  { type: 'iot', labelKey: 'addIoT', colorClass: 'text-warning-500 hover:bg-warning-500/10' },
];

export function TopologyToolbar({
  t, isDark, language = 'tr',
  topologyDevices, deviceStates,
  activeDeviceId, activeDeviceType,
  cableInfo, deviceSearchQuery,
  canUndo, canRedo, hasHydrated: _hasHydrated,
  isExamActive,
  setDeviceSearchQuery, setCableInfo,
  setZoom, setPan, resetView,
  handleDeviceSelectFromMenu,
  handleUndo, handleRedo,
  handleRefreshNetwork, setIsEnvironmentPanelOpen,
  onOpenStudentJoin, onOpenTeacherPanel,
  isPingPanelOpen,
}: TopologyToolbarProps) {
  useUiPreferences();
  const graphicsQuality = useAppStore((state) => state.graphicsQuality);
  const isSimulationMode = useAppStore((state) => state.topology.isSimulationMode);
  const setSimulationMode = useAppStore((state) => state.setSimulationMode);
  const topologyZoom = useAppStore((state) => state.topology.zoom);

  const isHighQuality = graphicsQuality === 'high';
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<'all' | 'pc' | 'sw' | 'router'>('all');
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const preAutoLayoutDevicesRef = useRef<CanvasDevice[] | null>(null);

  const applyLayoutAlgorithm = (algorithm: LayoutAlgorithm) => {
    if (topologyDevices.length === 0) return;
    if (!preAutoLayoutDevicesRef.current) {
      preAutoLayoutDevicesRef.current = JSON.parse(JSON.stringify(topologyDevices));
    }
    const store = useAppStore.getState();
    const connections = store.topology.connections || [];
    const updated = applyAutoLayout(topologyDevices, connections, { algorithm });
    store.setDevices(updated);
  };

  const restoreOriginalLayout = () => {
    if (preAutoLayoutDevicesRef.current && preAutoLayoutDevicesRef.current.length > 0) {
      useAppStore.getState().setDevices(preAutoLayoutDevicesRef.current);
      preAutoLayoutDevicesRef.current = null;
    } else {
      handleUndo();
    }
  };

  const availableCategoryCounts = useMemo(() => {
    const counts = { all: topologyDevices.length, pc: 0, sw: 0, router: 0 };
    topologyDevices.forEach((dev) => {
      if (['pc', 'mobile', 'printer', 'iot', 'server'].includes(dev.type)) {
        counts.pc++;
      } else if (['switchL2', 'switchL3', 'hub', 'wlc'].includes(dev.type)) {
        counts.sw++;
      } else if (['router', 'firewall', 'cloud'].includes(dev.type)) {
        counts.router++;
      }
    });
    return counts;
  }, [topologyDevices]);

  const toolbarGlowClass = isHighQuality
    ? 'drop-shadow-[0_0_2px_rgba(34,211,238,0.15)] dark:drop-shadow-[0_0_2px_rgba(34,211,238,0.12)]'
    : '';

  const handleResetView = () => {
    if (resetView) {
      resetView();
    } else {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    }
  };

  useKeyboardShortcuts([
    {
      key: 'Home',
      handler: handleResetView,
      description: 'Reset topology view',
    },
    {
      key: 's',
      handler: () => {
        const current = useAppStore.getState().topology.isSimulationMode;
        setSimulationMode(!current);
      },
      description: 'Toggle simulation mode',
    },
  ]);

  return (
    <div className={cn("fixed top-14 sm:top-16 left-0 right-0 z-30 px-2 sm:px-4 py-1 sm:py-1.5 border-b backdrop-blur-md flex items-center gap-1.5 sm:gap-3 overflow-x-auto", isDark ? "bg-secondary-900/95 border-secondary-800" : "bg-white/95 border-secondary-200 shadow-sm")}>
      {/* Reset View Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={t.resetView}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${isDark
              ? 'text-accent-400 hover:text-secondary-300 hover:bg-accent-400/10'
              : 'text-accent-600 hover:text-secondary-600 hover:bg-accent-600/10'
              }`}
            onClick={handleResetView}
          >
            <svg className={`w-4 h-4 ${toolbarGlowClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>{t.resetView}</span>
          <ShortcutBadge shortcut="Home" variant="default" />
        </TooltipContent>
      </Tooltip>

      {/* Refresh Network Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={t.refreshNetworkF5 || 'Ağı Yenile (F5)'}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${isDark
              ? 'text-pink-400 hover:text-pink-300 hover:bg-pink-400/10'
              : 'text-pink-600 hover:text-pink-700 hover:bg-pink-600/10'
              }`}
            onClick={handleRefreshNetwork}
          >
            <RefreshCw className={`w-4 h-4 ${toolbarGlowClass}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>{t.refreshNetworkF5 || (language === 'tr' ? 'Ağı Yenile' : 'Refresh Network')}</span>
          <ShortcutBadge shortcut="F5" variant="default" />
        </TooltipContent>
      </Tooltip>

      {/* Active Device Dropdown */}
      <DropdownMenu
        open={isDeviceDropdownOpen}
        onOpenChange={(open) => {
          setIsDeviceDropdownOpen(open);
          if (!open) {
            setDeviceSearchQuery('');
            setDeviceTypeFilter('all');
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`w-36 sm:w-48 flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg border transition-all shrink-0 ${isDark
              ? 'bg-secondary-900 border-secondary-800 text-secondary-300 hover:text-white hover:border-secondary-600'
              : 'bg-white border-secondary-200 text-secondary-700 hover:text-secondary-900 hover:border-secondary-400'
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
                        ? 'bg-error-500'
                        : status === 'online'
                          ? 'bg-success-400'
                          : 'bg-warning-400';
                    const statusLabel =
                      status === 'offline'
                        ? t.offline
                        : status === 'online'
                          ? t.online
                          : t.unknown;
                    return (
                      <>
                        <TooltipWrapper title={statusLabel}>
                          <span className="w-2 h-2 rounded-full mr-0.5">
                            <span className={`block w-2 h-2 rounded-full ${statusColor} shadow-[0_0_2px_rgba(45,212,191,0.3)]`} />
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
                  <Plus className={`w-4 h-4 text-secondary-500 ${toolbarGlowClass}`} />
                  <span className="text-sm font-bold text-secondary-500">
                    {t.selectDeviceDropdown}
                  </span>
                </>
              )}
            </div>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`${isDark ? 'bg-secondary-900 !border-secondary-800' : 'bg-white !border-secondary-200'} w-64 sm:w-72 pt-2`}>
          {topologyDevices.length > 0 && (
            <>
              {/* Search Box */}
              <div className="px-2 pt-1 pb-1">
                <div className="relative">
                  <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-secondary-400 pointer-events-none ${toolbarGlowClass}`} />
                  <Input
                    value={deviceSearchQuery}
                    onChange={e => setDeviceSearchQuery(e.target.value)}
                    placeholder={t.searchShort}
                    aria-label={t.searchShort}
                    className="h-7 pl-6 pr-7 text-xs"
                    autoFocus
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setDeviceSearchQuery('');
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        const q = deviceSearchQuery.toLowerCase().trim();
                        const firstMatch = topologyDevices.find((device) => {
                          if (deviceTypeFilter === 'pc') {
                            if (!['pc', 'mobile', 'printer', 'iot'].includes(device.type)) return false;
                          } else if (deviceTypeFilter === 'sw') {
                            if (!['switchL2', 'switchL3', 'hub', 'wlc'].includes(device.type)) return false;
                          } else if (deviceTypeFilter === 'router') {
                            if (!['router', 'firewall', 'cloud'].includes(device.type)) return false;
                          }
                          if (!q) return true;
                          const state = deviceStates.get(device.id);
                          const name = (state?.hostname || device.name).toLowerCase();
                          const type = device.type.toLowerCase();
                          const mac = (device.macAddress || state?.macAddress || '').toLowerCase();
                          const ip = (device.ip || '').toLowerCase();
                          const portIps = state?.ports
                            ? Object.values(state.ports).map((p: { ipAddress?: string }) => p.ipAddress?.toLowerCase() || '')
                            : [];
                          const vlanMatches = state?.vlans
                            ? Object.keys(state.vlans).some(v => v.includes(q) || `vlan${v}`.includes(q) || `vlan ${v}`.includes(q))
                            : false;
                          return (
                            name.includes(q) ||
                            type.includes(q) ||
                            mac.includes(q) ||
                            ip.includes(q) ||
                            portIps.some(pIp => pIp.includes(q)) ||
                            vlanMatches
                          );
                        });

                        if (firstMatch) {
                          if (typeof window !== 'undefined') {
                            const canvasW = window.innerWidth;
                            const canvasH = window.innerHeight;
                            const center = getDeviceCenter(firstMatch);
                            const zoomLevel = topologyZoom || 1.0;
                            const targetPanX = canvasW / 2 - center.x * zoomLevel;
                            const targetPanY = canvasH / 2 - center.y * zoomLevel;
                            setPan({ x: targetPanX, y: targetPanY });
                            window.dispatchEvent(new CustomEvent('focus-device', { detail: { deviceId: firstMatch.id } }));
                          }
                          handleDeviceSelectFromMenu(firstMatch.type, firstMatch.id, firstMatch.switchModel, firstMatch.name);
                          setDeviceSearchQuery('');
                          setIsDeviceDropdownOpen(false);
                        }
                      }
                    }}
                  />
                  {deviceSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDeviceSearchQuery('')}
                      title={language === 'tr' ? 'Aramayı Temizle (ESC)' : 'Clear Search (ESC)'}
                      aria-label={language === 'tr' ? 'Aramayı Temizle' : 'Clear Search'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
                    >
                      <X className={`w-3 h-3 ${toolbarGlowClass}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Smart Type Filter Pills with dynamic device counts */}
              <div className="px-2 pt-1 pb-1.5 flex flex-wrap gap-1">
                {[
                  { id: 'all', label: `${t.filterAll || (language === 'tr' ? 'Tümü' : 'All')} (${availableCategoryCounts.all})` },
                  ...(availableCategoryCounts.pc > 0 ? [{ id: 'pc', label: `PC (${availableCategoryCounts.pc})` }] : []),
                  ...(availableCategoryCounts.sw > 0 ? [{ id: 'sw', label: `SW (${availableCategoryCounts.sw})` }] : []),
                  ...(availableCategoryCounts.router > 0 ? [{ id: 'router', label: `Router (${availableCategoryCounts.router})` }] : []),
                ].map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeviceTypeFilter(filter.id as 'all' | 'pc' | 'sw' | 'router');
                    }}
                    className={cn(
                      'flex-1 min-w-[36px] py-0.5 px-1 text-[10px] font-bold rounded transition-all text-center border whitespace-nowrap',
                      deviceTypeFilter === filter.id
                        ? 'bg-primary-500 text-white border-primary-500 shadow-xs'
                        : isDark
                          ? 'bg-secondary-800/80 text-secondary-300 border-secondary-700 hover:bg-secondary-700 hover:text-white'
                          : 'bg-secondary-100 text-secondary-700 border-secondary-200 hover:bg-secondary-200 hover:text-secondary-900'
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <ScrollArea className={topologyDevices.length > 0 ? "h-56" : "h-auto"}>
            {topologyDevices.length > 0 ? (
              (() => {
                const filtered = topologyDevices
                  .filter((device) => {
                    // Filter by device type category
                    if (deviceTypeFilter === 'pc') {
                      if (!['pc', 'mobile', 'printer', 'iot'].includes(device.type)) return false;
                    } else if (deviceTypeFilter === 'sw') {
                      if (!['switchL2', 'switchL3', 'hub', 'wlc'].includes(device.type)) return false;
                    } else if (deviceTypeFilter === 'router') {
                      if (!['router', 'firewall', 'cloud'].includes(device.type)) return false;
                    }

                    // Filter by search query
                    if (!deviceSearchQuery.trim()) return true;
                    const q = deviceSearchQuery.toLowerCase().trim();
                    const state = deviceStates.get(device.id);
                    const name = (state?.hostname || device.name).toLowerCase();
                    const type = device.type.toLowerCase();
                    const mac = (device.macAddress || state?.macAddress || '').toLowerCase();
                    const ip = (device.ip || '').toLowerCase();
                    const portIps = state?.ports
                      ? Object.values(state.ports).map((p: { ipAddress?: string }) => p.ipAddress?.toLowerCase() || '')
                      : [];
                    const vlanMatches = state?.vlans
                      ? Object.keys(state.vlans).some(v => v.includes(q) || `vlan${v}`.includes(q) || `vlan ${v}`.includes(q))
                      : false;

                    return (
                      name.includes(q) ||
                      type.includes(q) ||
                      mac.includes(q) ||
                      ip.includes(q) ||
                      portIps.some(pIp => pIp.includes(q)) ||
                      vlanMatches
                    );
                  });

                if (filtered.length === 0) {
                  return (
                    <div className="p-4 text-center text-[11px] text-secondary-500 italic">
                      {t.noResultsFound}
                    </div>
                  );
                }

                const selectAndFocusDevice = (device: CanvasDevice) => {
                  // Pan & Center canvas camera on target device
                  if (typeof window !== 'undefined') {
                    const canvasW = window.innerWidth;
                    const canvasH = window.innerHeight;
                    const center = getDeviceCenter(device);
                    const zoomLevel = topologyZoom || 1.0;
                    const targetPanX = canvasW / 2 - center.x * zoomLevel;
                    const targetPanY = canvasH / 2 - center.y * zoomLevel;
                    setPan({ x: targetPanX, y: targetPanY });
                    window.dispatchEvent(new CustomEvent('focus-device', { detail: { deviceId: device.id } }));
                  }
                  handleDeviceSelectFromMenu(device.type, device.id, device.switchModel, device.name);
                  setDeviceSearchQuery('');
                };

                return filtered.map((device) => {
                  const currentDeviceState = deviceStates.get(device.id);
                  const displayName = currentDeviceState?.hostname || device.name;
                  const status = device.status || 'online';
                  const statusColor =
                    status === 'offline'
                      ? 'bg-error-500'
                      : status === 'online'
                        ? 'bg-success-400'
                        : 'bg-warning-400';

                  return (
                    <DropdownMenuItem
                      key={device.id}
                      className={`flex items-center justify-between py-1.5 px-2 cursor-pointer ${activeDeviceId === device.id ? 'bg-purple-500/10 text-purple-400 font-semibold' : ''}`}
                      onClick={() => selectAndFocusDevice(device)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
                        <DeviceIcon
                          type={device.type}
                          switchModel={device.switchModel}
                          className="w-4 h-4 shrink-0"
                        />
                        <span className="text-xs font-bold truncate">{displayName}</span>
                      </div>
                      <span className="text-[10px] opacity-50 capitalize shrink-0 ml-2">{device.type}</span>
                    </DropdownMenuItem>
                  );
                });
              })()
            ) : (
              <div className="p-3 text-center text-[11px] text-secondary-500 italic">
                {t.noDevicesInTopology}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Device Buttons - Compact 2-Row grid - hidden during exam */}
      {!isExamActive && (
        <div className={`grid grid-rows-2 grid-flow-col auto-cols-max items-center gap-0.5 p-0.5 rounded-lg border shrink-0 ${isDark ? 'bg-secondary-900/40 border-secondary-700/30' : 'bg-primary-50/50 border-primary-100/50'}`}>
          {TOOLBAR_ITEMS.map((item) => (
            <Tooltip key={item.type}>
              <TooltipTrigger asChild>
                <Button
                  aria-label={t[item.labelKey] as string}
                  variant="ghost"
                  size="icon"
                  className={cn("h-7 w-7 p-1 flex items-center justify-center rounded-md transition-colors", item.colorClass)}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('add-device', { detail: item.type }));
                    }
                  }}
                >
                  <DeviceIcon type={item.type} size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                {t[item.labelKey]}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Cable Type Buttons */}
      <div className={`flex items-center gap-0.5 p-1 rounded-xl border shrink-0 ${isDark ? 'bg-secondary-900/40 border-secondary-700/30' : 'bg-primary-50/50 border-primary-100/50'}`}>
        {(['straight', 'crossover', 'serial', 'console'] as CableType[]).map((type) => {
          const colorMap: Record<string, string> = {
            straight: cableInfo.cableType === type ? 'text-primary-400' : 'text-primary-500 hover:text-primary-400',
            crossover: cableInfo.cableType === type ? 'text-warning-400' : 'text-warning-500 hover:text-warning-400',
            serial: cableInfo.cableType === type ? 'text-success-400' : 'text-success-500 hover:text-success-400',
            console: cableInfo.cableType === type ? 'text-accent-400' : 'text-accent-500 hover:text-accent-400',
          };
          const cableLabelMap: Record<string, string> = {
            straight: t.straightCable,
            crossover: t.crossoverCable,
            serial: t.serialCable,
            console: t.consoleCable,
          };
          const cableIconMap: Partial<Record<CableType, ReactNode>> = {
            straight: <Cable className={`w-full h-full ${toolbarGlowClass}`} />,
            crossover: <LineSquiggle className={`w-full h-full ${toolbarGlowClass}`} />,
            serial: <Plug className={`w-full h-full ${toolbarGlowClass}`} />,
            console: <TrendingUpDown className={`w-full h-full ${toolbarGlowClass}`} />,
          };
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <Button
                  aria-label={cableLabelMap[type]}
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 p-0.5 flex items-center justify-center font-bold transition-all
                  ${cableInfo.cableType === type
                      ? isDark ? 'bg-secondary-700/80' : 'bg-secondary-200/80'
                      : ''
                    }
                  ${colorMap[type] || colorMap.console}`}
                  onClick={() => setCableInfo({ ...cableInfo, cableType: type })}
                >
                  {cableIconMap[type] ?? cableIconMap.console}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {cableLabelMap[type]}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Action Tools Group */}
      <div className={`flex items-center gap-0 p-1 rounded-xl border shrink-0 ${isDark ? 'bg-secondary-900/40 border-secondary-700/30' : 'bg-primary-50/50 border-primary-100/50'}`}>
        {/* Connect Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={t.connectDevices}
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-accent-500 hover:bg-accent-500/10"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const event = new CustomEvent('trigger-topology-connect');
                  window.dispatchEvent(event);
                }
              }}
            >
              <svg className={`w-4 h-4 ${toolbarGlowClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              aria-label={t.ping}
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-warning-500 hover:bg-warning-500/10"
              disabled={isPingPanelOpen}
              onClick={() => {
                const event = new CustomEvent('toggle-ping-mode');
                window.dispatchEvent(event);
              }}
            >
              <svg className={`w-4 h-4 ${toolbarGlowClass}`} fill="none" stroke="Turquoise" viewBox="0 0 24 24">
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
              aria-label={t.addNote}
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-secondary-500 hover:bg-secondary-500/10"
              onClick={() => {
                const event = new CustomEvent('add-note');
                window.dispatchEvent(event);
              }}
            >
              <svg className={`w-4 h-4 ${toolbarGlowClass}`} fill="none" stroke="orange" viewBox="0 0 24 24">
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
              aria-label={t.environmentSettings}
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-success-500 hover:bg-success-500/10"
              onClick={() => setIsEnvironmentPanelOpen(true)}
            >
              <Leaf className={`w-4 h-4 ${toolbarGlowClass}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.environmentSettings}</TooltipContent>
        </Tooltip>

        {/* Simulation Mode Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={t.simulationMode}
              variant="ghost"
              size="icon"
              className={`h-8 w-8 p-0 transition-all ${isSimulationMode
                ? 'text-error-500 bg-error-500/10 hover:bg-error-500/20 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                : 'text-secondary-500 hover:bg-secondary-500/10'}`}
              onClick={() => setSimulationMode(!isSimulationMode)}
            >
              <Activity className={`w-4 h-4 ${toolbarGlowClass}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            <span>{t.simulationMode}</span>
            <ShortcutBadge shortcut="S" variant="danger" />
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Auxiliary Tools: Auto-Layout, Diagnostics, Snapshots */}
      <div className={`flex items-center gap-0.5 p-1 rounded-xl border shrink-0 ${isDark ? 'bg-secondary-900/40 border-secondary-700/30' : 'bg-primary-50/50 border-primary-100/50'}`}>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={t.autoLayout || 'Otomatik Hizala'}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-indigo-400 hover:bg-indigo-500/10"
                >
                  <LayoutGrid className={`w-4 h-4 ${toolbarGlowClass}`} />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent className="z-50">{t.autoLayout || 'Otomatik Hizala'}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className={`${isDark ? 'bg-secondary-900 !border-secondary-800' : 'bg-white !border-secondary-200'} w-52`}>
            <DropdownMenuLabel className="text-[11px] font-bold tracking-widest text-secondary-500 py-1.5 px-2">
              {t.autoLayoutHeader || 'Otomatik Hizalama Düzeni'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 py-2 px-2.5 cursor-pointer text-xs font-semibold"
              onSelect={() => applyLayoutAlgorithm('hierarchical')}
            >
              <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="flex flex-col">
                <span>{t.layoutHierarchical || 'Hiyerarşik (Katmanlı)'}</span>
                <span className="text-[10px] text-secondary-500 font-normal">{t.layoutHierarchicalDesc || 'Core, Switch ve PC katmanları'}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 py-2 px-2.5 cursor-pointer text-xs font-semibold"
              onSelect={() => applyLayoutAlgorithm('star')}
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span>{t.layoutStar || 'Yıldız (Star)'}</span>
                <span className="text-[10px] text-secondary-500 font-normal">{t.layoutStarDesc || 'Merkezi bir cihaz etrafında'}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 py-2 px-2.5 cursor-pointer text-xs font-semibold"
              onSelect={() => applyLayoutAlgorithm('ring')}
            >
              <CircleDot className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="flex flex-col">
                <span>{t.layoutRing || 'Halka (Ring)'}</span>
                <span className="text-[10px] text-secondary-500 font-normal">{t.layoutRingDesc || 'Dairesel dikey halka dizilimi'}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 py-2 px-2.5 cursor-pointer text-xs font-semibold"
              onSelect={() => applyLayoutAlgorithm('grid')}
            >
              <Grid className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span>{t.layoutGrid || 'Izgara (Grid)'}</span>
                <span className="text-[10px] text-secondary-500 font-normal">{t.layoutGridDesc || 'Düzenli matris düzeni'}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 py-2 px-2.5 cursor-pointer text-xs font-semibold text-rose-400 hover:text-rose-300"
              onSelect={() => restoreOriginalLayout()}
            >
              <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="flex flex-col">
                <span>{t.restoreOriginalLayout || 'Eski Haline Geri Al'}</span>
                <span className="text-[10px] opacity-70 font-normal">{t.restoreOriginalLayoutDesc || 'İlk konumlara dön'}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={t.networkDiagnostics || 'Ağ Teşhisi ve Sorun Giderme'}
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-cyan-400 hover:bg-cyan-500/10"
              onClick={() => setIsDiagnosticsOpen(true)}
            >
              <Stethoscope className={`w-4 h-4 ${toolbarGlowClass}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="z-50">{t.networkDiagnostics || 'Ağ Teşhisi ve Sorun Giderme'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={t.snapshotManager || 'Anlık Görüntü (Snapshot) Yöneticisi'}
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => setIsSnapshotModalOpen(true)}
            >
              <Camera className={`w-4 h-4 ${toolbarGlowClass}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="z-50">{t.snapshotManager || 'Anlık Görüntü (Snapshot) Yöneticisi'}</TooltipContent>
        </Tooltip>

        <ViewVisibilityMenu isDark={isDark} />
      </div>

      {/* Undo / Redo */}
      <div className={`flex items-center gap-0 p-1 rounded-xl border shrink-0 ${isDark ? 'bg-secondary-900/40 border-secondary-700/30' : 'bg-primary-50/50 border-primary-100/50'}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button
                aria-label={t.undo || 'Geri Al'}
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-secondary-400 hover:bg-secondary-500/10 disabled:opacity-30"
                disabled={!canUndo}
                onClick={handleUndo}
              >
                <Undo2 className={`w-4 h-4 ${toolbarGlowClass}`} />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2 z-50">
            <span>{t.undo || 'Geri Al'}</span>
            <ShortcutBadge shortcut="Ctrl+Z" variant="default" />
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button
                aria-label={t.redo || 'Yinele'}
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-secondary-400 hover:bg-secondary-500/10 disabled:opacity-30"
                disabled={!canRedo}
                onClick={handleRedo}
              >
                <Redo2 className={`w-4 h-4 ${toolbarGlowClass}`} />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2 z-50">
            <span>{t.redo || 'Yinele'}</span>
            <ShortcutBadge shortcut="Ctrl+Y" variant="default" />
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Classroom Teacher / Student Actions - Right aligned grouped buttons */}
      {(onOpenStudentJoin || onOpenTeacherPanel) && (
        <div className={`ml-auto flex items-center gap-0.5 p-1 rounded-xl border shrink-0 ${isDark ? 'bg-secondary-900/40 border-secondary-700/30' : 'bg-primary-50/50 border-primary-100/50'}`}>
          {onOpenStudentJoin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={t.studentJoin || "Sınıfa Katıl"}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                  onClick={onOpenStudentJoin}
                >
                  <Users className={`w-4 h-4 ${toolbarGlowClass}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t.studentJoinTooltip || "Canlı Sınıf Oturumuna Öğrenci Olarak Katıl"}</TooltipContent>
            </Tooltip>
          )}

          {onOpenTeacherPanel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={t.teacherPanel || "Öğretmen Paneli"}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-purple-400 hover:bg-purple-500/10 shrink-0"
                  onClick={onOpenTeacherPanel}
                >
                  <UserKey className={`w-4 h-4 ${toolbarGlowClass}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t.teacherPanelTooltip || "Canlı Sınıf Yönetim Paneli"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Diagnostics & Snapshot Modals */}
      {isDiagnosticsOpen && (
        <NetworkDiagnosticsModal
          open={isDiagnosticsOpen}
          onOpenChange={setIsDiagnosticsOpen}
          devices={topologyDevices}
          connections={[]}
          deviceStates={deviceStates}
          isDark={isDark}
          language={language}
        />
      )}

      {isSnapshotModalOpen && (
        <SnapshotManagerModal
          isOpen={isSnapshotModalOpen}
          onClose={() => setIsSnapshotModalOpen(false)}
          devices={topologyDevices}
          connections={[]}
          deviceStates={deviceStates ? Object.fromEntries(deviceStates) : undefined}
          isDark={isDark}
          language={language}
          isExamActive={isExamActive}
        />
      )}
    </div>
  );
}
