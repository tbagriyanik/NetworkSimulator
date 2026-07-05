'use client';

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
import { DeviceIcon } from '@/components/network/DeviceIcon';
import {   ChevronDown, Plus, Undo2, Redo2, Search, X, Cable, LineSquiggle, Leaf, Plug, TrendingUpDown, Users, UserKey, Activity } from 'lucide-react';
import type { Translations } from '@/contexts/LanguageContext';
import type { CanvasDevice, DeviceType } from '@/components/network/networkTopology.types';
import type { SwitchState, CableType, CableInfo } from '@/lib/network/types';
import { useAppStore } from '@/lib/store/appStore';
import { cn } from '@/lib/utils';

interface TopologyToolbarProps {
  t: Translations;
  isDark: boolean;
  language: 'tr' | 'en';
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
  handleDeviceSelectFromMenu: (type: DeviceType, id?: string, model?: string, name?: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleRefreshNetwork: () => void;
  setIsEnvironmentPanelOpen: (v: boolean) => void;
  onOpenStudentJoin?: () => void;
  onOpenTeacherPanel?: () => void;
  isPingPanelOpen?: boolean;
}

function truncateWithEllipsis(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function TopologyToolbar({
  t, isDark, language,
  topologyDevices, deviceStates,
  activeDeviceId, activeDeviceType,
  cableInfo, deviceSearchQuery,
  canUndo, canRedo, hasHydrated,
  isExamActive,
  setDeviceSearchQuery, setCableInfo,
  setZoom, setPan,
  handleDeviceSelectFromMenu,
  handleUndo, handleRedo,
  handleRefreshNetwork, setIsEnvironmentPanelOpen,
  onOpenStudentJoin, onOpenTeacherPanel,
  isPingPanelOpen,
}: TopologyToolbarProps) {
  const graphicsQuality = useAppStore((state) => state.graphicsQuality);
  const isSimulationMode = useAppStore((state) => state.topology.isSimulationMode);
  const setSimulationMode = useAppStore((state) => state.setSimulationMode);
  const isHighQuality = graphicsQuality === 'high';
  // Register Home key shortcut for reset view
   const toolbarGlowClass = isHighQuality
     ? 'drop-shadow-[0_0_2px_rgba(34,211,238,0.15)] dark:drop-shadow-[0_0_2px_rgba(34,211,238,0.12)]'
     : '';

   useKeyboardShortcuts([
     {
       key: 'Home',
       handler: () => {
         setZoom(1.0);
         setPan({ x: 0, y: 0 });
       },
       description: 'Reset topology view',
     },
   ]);

  return (
    <div className={cn("fixed top-[72px] left-0 right-0 z-30 px-4 py-[5px] pt-3 border-b backdrop-blur-md hidden md:flex items-center gap-3", isDark ? "bg-secondary-900/95 border-secondary-800" : "bg-white/95 border-secondary-200 shadow-sm")}>
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
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
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

      {/* Active Device Dropdown */}
      <DropdownMenu onOpenChange={(open) => { if (!open) setDeviceSearchQuery(''); }}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`w-48 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${isDark
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
        <DropdownMenuContent align="start" className={`${isDark ? 'bg-secondary-900 border-secondary-800' : 'bg-white'} w-48`}>
          <DropdownMenuLabel className="text-[11px] font-bold tracking-widest text-secondary-500 py-2">
            {topologyDevices.length > 0 ? t.selectDevice : t.addDevicesFirst}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {topologyDevices.length > 0 && (
            <div className="px-2 pb-1.5">
              <div className="relative">
                <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-secondary-400 pointer-events-none ${toolbarGlowClass}`} />
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
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
                  >
                    <X className={`w-3 h-3 ${toolbarGlowClass}`} />
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
                      ? 'bg-error-500'
                      : status === 'online'
                        ? 'bg-success-400'
                        : 'bg-warning-400';

                  return (
                    <DropdownMenuItem
                      key={device.id}
                      className={`flex items-center gap-2 py-1.5 cursor-pointer ${activeDeviceId === device.id ? 'bg-purple-500/10 text-purple-400' : ''}`}
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
              <div className="p-3 text-center text-[11px] text-secondary-500 italic">
                {t.noDevicesInTopology}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Device Buttons - hidden during exam */}
      {!isExamActive && (
        <div className={`flex items-center gap-0 p-1 rounded-xl border ${isDark ? 'bg-secondary-900/40 border-secondary-700/30' : 'bg-primary-50/50 border-primary-100/50'}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t.addPC}
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-primary-500 hover:bg-primary-500/10"
                onClick={() => { window.dispatchEvent(new CustomEvent('add-device', { detail: 'pc' })); }}
              >
                  <svg className={`w-8 h-8 ${toolbarGlowClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.addPC}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t.addL2Switch}
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-accent-500 hover:bg-accent-500/10"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const event = new CustomEvent('add-device', { detail: 'switchL2' });
                    window.dispatchEvent(event);
                  }
                }}
              >
                  <svg className={`w-8 h-8 ${toolbarGlowClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.addL2Switch}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t.addL3Switch}
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
                  <svg className={`w-8 h-8 ${toolbarGlowClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.addL3Switch}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t.addRouter}
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
                  <svg className={`w-8 h-8 ${toolbarGlowClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.addRouter}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t.addIoT}
                variant="ghost"
                size="icon"
className="h-8 w-8 p-0 text-warning-500 hover:bg-warning-500/10"
                 onClick={() => {
                   if (typeof window !== 'undefined') {
                     const event = new CustomEvent('add-device', { detail: 'iot' });
                    window.dispatchEvent(event);
                  }
                }}
              >
                  <svg className={`w-8 h-8 ${toolbarGlowClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t.addFirewall}
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-error-500 hover:bg-error-500/10"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const event = new CustomEvent('add-device', { detail: 'firewall' });
                    window.dispatchEvent(event);
                  }
                }}
              >
                <svg className={`w-6 h-6 ${toolbarGlowClass}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4"></path>
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.addFirewall}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t.addWLC}
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-yellow-500 hover:bg-yellow-500/10"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const event = new CustomEvent('add-device', { detail: 'wlc' });
                    window.dispatchEvent(event);
                  }
                }}
              >
                <svg className={`w-8 h-8 ${toolbarGlowClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.addWLC}</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Cable Type Buttons */}
      <div className={`flex items-center rounded-lg border overflow-hidden ${isDark ? 'bg-secondary-800/50 border-secondary-800' : 'bg-secondary-100 border-secondary-200'}`}>
        {(['straight', 'crossover', 'serial', 'console'] as CableType[]).map((type) => {
          const colorMap: Record<string, string> = {
            straight: cableInfo.cableType === type ? 'text-primary-400' : 'text-primary-500 hover:text-primary-400',
            crossover: cableInfo.cableType === type ? 'text-warning-400' : 'text-warning-500 hover:text-warning-400',
            serial: cableInfo.cableType === type ? 'text-success-400' : 'text-success-500 hover:text-success-400',
            console: cableInfo.cableType === type ? 'text-accent-400' : 'text-accent-500 hover:text-accent-400',
          };
          return (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <Button
                aria-label={type === 'straight' ? t.straightCable : type === 'crossover' ? t.crossoverCable : type === 'serial' ? t.serialCable : t.consoleCable}
                variant="ghost"
                size="sm"
                className={`h-8 px-2 flex items-center gap-1 text-xs font-bold
                  ${cableInfo.cableType === type
                    ? isDark ? 'bg-secondary-700/80' : 'bg-secondary-200/80'
                    : ''
                  }
                  ${colorMap[type] || colorMap.console}`}
                onClick={() => setCableInfo({ ...cableInfo, cableType: type })}
              >
                {type === 'straight' ? (
                  <Cable className="w-4 h-4" />
                ) : type === 'crossover' ? (
                  <LineSquiggle className="w-4 h-4" />
                ) : type === 'serial' ? (
                  <Plug className="w-4 h-4" />
                ) : (
                  <TrendingUpDown className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {type === 'straight' ? t.straightCable : type === 'crossover' ? t.crossoverCable : type === 'serial' ? t.serialCable : t.consoleCable}
            </TooltipContent>
          </Tooltip>
          );
        })}
      </div>

      <div className={`w-px h-4 ${isDark ? 'bg-secondary-700' : 'bg-secondary-200'}`} />

      {/* Connect Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={t.connectDevices}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-accent-500 hover:bg-accent-500/10"
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
            className="h-8 w-8 text-warning-500 hover:bg-warning-500/10"
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
            className="h-8 w-8 text-secondary-500 hover:bg-secondary-500/10"
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
            className="h-8 w-8 text-success-500 hover:bg-success-500/10"
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
            className={`h-8 w-8 transition-all ${isSimulationMode
              ? 'text-error-500 bg-error-500/10 hover:bg-error-500/20 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
              : 'text-secondary-500 hover:bg-secondary-500/10'}`}
            onClick={() => setSimulationMode(!isSimulationMode)}
          >
            <Activity className={`w-4 h-4 ${isSimulationMode ? 'animate-pulse' : ''} ${toolbarGlowClass}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>{t.simulationMode}</span>
          <ShortcutBadge shortcut="S" variant="danger" />
        </TooltipContent>
      </Tooltip>

      <div className={`w-px h-4 ${isDark ? 'bg-secondary-700' : 'bg-secondary-200'}`} />

      {/* Undo Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={t.undo}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-secondary-500 hover:bg-secondary-500/10"
            onClick={handleUndo}
            disabled={hasHydrated && !canUndo}
          >
            <Undo2 className={`w-4 h-4 ${toolbarGlowClass} ${!canUndo ? 'opacity-100' : ''}`} />
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
            aria-label={t.redo}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-secondary-500 hover:bg-secondary-500/10"
            onClick={handleRedo}
            disabled={hasHydrated && !canRedo}
          >
            <Redo2 className={`w-4 h-4 ${toolbarGlowClass} ${!canRedo ? 'opacity-100' : ''}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>{t.redo}</span>
          <ShortcutBadge shortcut="Ctrl+Y" variant="primary" />
        </TooltipContent>
      </Tooltip>

      <div className={`w-px h-4 ${isDark ? 'bg-secondary-700' : 'bg-secondary-200'}`} />

      {/* Refresh Network Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={t.refreshNetworkF5}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-pink-500 hover:bg-pink-500/10"
            onClick={handleRefreshNetwork}
          >
            <svg className={`w-4 h-4 ${toolbarGlowClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>{t.refreshNetworkF5}</span>
          <ShortcutBadge shortcut="F5" variant="danger" />
        </TooltipContent>
      </Tooltip>



      <div className="ml-auto flex items-center gap-1">
        {onOpenStudentJoin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t.roomStudentJoin}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-500 hover:bg-primary-500/10 hover:text-primary-600"
                onClick={onOpenStudentJoin}
              >
                <Users className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.roomStudentJoin}</TooltipContent>
          </Tooltip>
        )}
        {onOpenTeacherPanel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t.roomTeacherOpen}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-purple-500 hover:bg-purple-500/10 hover:text-purple-600"
                onClick={onOpenTeacherPanel}
              >
                <UserKey className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.roomTeacherOpen}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
