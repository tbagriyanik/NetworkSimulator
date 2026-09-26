'use client';

import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardNavigation';
import { Undo2, Redo2, Cable, LineSquiggle, Leaf, Plug, TrendingUpDown, Users, UserKey, Activity, Stethoscope, Camera, RefreshCw } from 'lucide-react';
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
import { TopologyDeviceDropdown } from './topology-toolbar/TopologyDeviceDropdown';
import { TopologyAutoLayoutMenu } from './topology-toolbar/TopologyAutoLayoutMenu';

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

const TOOLBAR_ITEMS: Array<{ type: DeviceType; labelKey: keyof Translations; colorClass: string }> = [
  { type: 'pc', labelKey: 'addPC', colorClass: 'text-primary-400 hover:bg-primary-400/10' },
  { type: 'switchL2', labelKey: 'addL2Switch', colorClass: 'text-accent-400 hover:bg-accent-400/10' },
  { type: 'switchL3', labelKey: 'addL3Switch', colorClass: 'text-purple-400 hover:bg-purple-400/10' },
  { type: 'router', labelKey: 'addRouter', colorClass: 'text-purple-400 hover:bg-purple-400/10' },
  { type: 'firewall', labelKey: 'addFirewall', colorClass: 'text-error-400 hover:bg-error-400/10' },
  { type: 'wlc', labelKey: 'addWLC', colorClass: 'text-yellow-400 hover:bg-yellow-400/10' },
  { type: 'hub', labelKey: 'addHub', colorClass: 'text-cyan-400 hover:bg-cyan-400/10' },
  { type: 'cloud', labelKey: 'addCloud', colorClass: 'text-sky-400 hover:bg-sky-400/10' },
  { type: 'mobile', labelKey: 'addMobile', colorClass: 'text-emerald-400 hover:bg-emerald-400/10' },
  { type: 'printer', labelKey: 'addPrinter', colorClass: 'text-amber-400 hover:bg-amber-400/10' },
  { type: 'iot', labelKey: 'addIoT', colorClass: 'text-warning-400 hover:bg-warning-400/10' },
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
      <TopologyDeviceDropdown
        t={t}
        isDark={isDark}
        language={language}
        topologyDevices={topologyDevices}
        deviceStates={deviceStates}
        activeDeviceId={activeDeviceId}
        activeDeviceType={activeDeviceType}
        deviceSearchQuery={deviceSearchQuery}
        setDeviceSearchQuery={setDeviceSearchQuery}
        setPan={setPan}
        handleDeviceSelectFromMenu={handleDeviceSelectFromMenu}
        toolbarGlowClass={toolbarGlowClass}
        topologyZoom={topologyZoom}
      />

      {/* Device Buttons - Compact 2-Row grid - hidden during exam */}
      {!isExamActive && (
        <div className={`grid grid-rows-2 grid-flow-col auto-cols-max items-center gap-0.5 p-1 rounded-xl border shrink-0 transition-colors ${isDark ? 'bg-secondary-950/70 border-secondary-700/50 shadow-inner' : 'bg-primary-100/60 border-primary-200/70 shadow-xs'}`}>
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
                  <DeviceIcon type={item.type} size={15} color="currentColor" />
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
        <TopologyAutoLayoutMenu
          t={t}
          isDark={isDark}
          toolbarGlowClass={toolbarGlowClass}
          onApplyLayout={applyLayoutAlgorithm}
          onRestoreOriginalLayout={restoreOriginalLayout}
        />

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

      {/* Classroom Teacher / Student Actions */}
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
