'use client';

import { useState, useEffect, useRef } from 'react';
import { GripHorizontal, Monitor, X, SettingsIcon } from 'lucide-react';
import { SwitchIcon, RouterIcon } from '@/components/network/PCPanelWidgets';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { cn, normalizeMAC } from '@/lib/utils';
import { errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';
import { useDrag } from '@/hooks/useDrag';
import { getWirelessSignalStrength } from '@/lib/network/connectivity';
import type { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { Translations } from '@/contexts/LanguageContext';

interface RouterInfoPopoverProps {
  router: CanvasDevice;
  routerState?: SwitchState;
  t: Translations;
  language: 'tr' | 'en';
  isDark: boolean;
  onClose: () => void;
  onFocus: () => void;
  zIndex: number;
  handleDeviceDoubleClick: (type: DeviceType, id: string) => void;
  onOpenPanel: (id: string) => void;
  topologyConnections: CanvasConnection[];
}

interface PCInfoPopoverProps {
  pc: CanvasDevice;
  t: Translations;
  language: 'tr' | 'en';
  isDark: boolean;
  onClose: () => void;
  onFocus: () => void;
  zIndex: number;
  handleDeviceDoubleClick: (type: DeviceType, id: string) => void;
  onOpenPanel: (id: string) => void;
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
}

export function SwitchInfoPopover({ router, routerState, t, language, isDark, onClose, handleDeviceDoubleClick, onOpenPanel, topologyConnections, onFocus, zIndex }: RouterInfoPopoverProps & { onFocus: () => void; zIndex: number }) {
  const { containerRef, isDragging, handleDragStart, position } = useDrag({
    storageKey: 'switch-info-position',
    defaultPosition: { x: 16, y: 96 },
    origin: 'bottom-right',
  });

  const ports = routerState?.ports ? Object.values(routerState.ports) : (router.ports || []);
  const totalPorts = Math.max(6, ports.length);
  const connectedPorts = topologyConnections?.filter(conn => conn.sourceDeviceId === router.id || conn.targetDeviceId === router.id).length || 0;

  return (
    <div ref={containerRef} className={cn("hidden md:block fixed animate-scale-in")}
      style={{ bottom: `${position.y}px`, right: `${position.x}px`, zIndex }}
      onMouseDown={(e) => { onFocus(); handleDragStart(e); }}>
      <div className="rounded-2xl border shadow-2xl min-w-[200px] max-w-[280px] liquid-glass-strong">
        <div className={`flex items-center justify-between px-3 py-2 border-b cursor-grab select-none ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
          <div className="flex items-center gap-1.5">
            <SwitchIcon className="w-3.5 h-3.5 text-purple-500" />
            <span className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{router.name || router.id}</span>
          </div>
          <TooltipWrapper title={t.close}>
            <button onClick={onClose} className={`w-5 h-5 rounded-md cursor-pointer transition-colors inline-flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10 hover:bg-red-500/80 text-slate-300 hover:text-white border border-white/15' : 'bg-black/8 hover:bg-red-500 text-slate-500 hover:text-white border border-black/10'}`}>
              <X className="w-3 h-3 pointer-events-none" />
            </button>
          </TooltipWrapper>
        </div>
        <div className="overflow-hidden cursor-default">
          <div className="p-2 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="opacity-50">{t.portsShort}</span>
              <span className="font-mono"><span className="text-green-500">{connectedPorts}</span><span className="opacity-50">/{totalPorts}</span><span className="ml-1 opacity-50">{t.connectedShort}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PCInfoPopover({ pc, t, language, isDark, onClose, onFocus, zIndex, handleDeviceDoubleClick, onOpenPanel, topologyDevices, deviceStates }: PCInfoPopoverProps) {
  const { containerRef, isDragging, handleDragStart, position } = useDrag({
    storageKey: 'pc-info-position',
    defaultPosition: { x: 16, y: 96 },
    origin: 'bottom-right',
  });

  return (
    <div
      ref={containerRef}
      className={cn("hidden md:block fixed animate-scale-in")}
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
        zIndex
      }}
      onMouseDown={(e) => { onFocus(); handleDragStart(e); }}
    >
      <div className="rounded-2xl border shadow-2xl min-w-[200px] max-w-[260px] liquid-glass-strong">
        <div className={`flex items-center justify-between px-3 py-2 border-b cursor-grab select-none ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
          <div className="flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-blue-500" />
            <span className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{pc?.name || pc?.id || 'Unknown'}</span>
          </div>
          <TooltipWrapper title={t.close}>
            <button onClick={onClose} className={`w-5 h-5 rounded-md cursor-pointer transition-colors inline-flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10 hover:bg-red-500/80 text-slate-300 hover:text-white border border-white/15' : 'bg-black/8 hover:bg-red-500 text-slate-500 hover:text-white border border-black/10'}`}>
              <X className="w-3 h-3 pointer-events-none" />
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
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-cyan-700 hover:bg-cyan-600 text-white disabled:bg-slate-700 disabled:text-slate-500' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:text-slate-500'}`}
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

export function RouterInfoPopover({ router, routerState, t, language, isDark, onClose, onFocus, zIndex, handleDeviceDoubleClick, onOpenPanel, topologyConnections }: RouterInfoPopoverProps) {
  const { containerRef, isDragging, handleDragStart, position } = useDrag({
    storageKey: 'router-info-position',
    defaultPosition: { x: 16, y: 96 },
    origin: 'bottom-right',
  });

  const ports = routerState?.ports ? Object.values(routerState.ports) : (router.ports || []);
  const totalPorts = Math.max(6, ports.length);
  const connectedPorts = topologyConnections?.filter(conn =>
    conn.sourceDeviceId === router.id || conn.targetDeviceId === router.id
  ).length || 0;
  const dhcpPools = routerState?.dhcpPools ? Object.keys(routerState.dhcpPools).length : 0;
  const wifiEnabled = routerState?.ports?.['wlan0']?.wifi?.mode === 'ap' || router?.wifi?.enabled;
  const wifiConfig = routerState?.ports?.['wlan0']?.wifi || router?.wifi;
  const ipAddresses = ports
    .filter((p: any) => p.ipAddress && !p.shutdown)
    .map((p: any) => `${p.id}: ${p.ipAddress}${p.subnetMask ? `/${p.subnetMask}` : ''}`)
    .slice(0, 3);

  return (
    <div
      ref={containerRef}
      className={cn("hidden md:block fixed animate-scale-in")}
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
        zIndex
      }}
      onMouseDown={(e) => { onFocus(); handleDragStart(e); }}
    >
      <div className="rounded-2xl border shadow-2xl min-w-[200px] max-w-[280px] liquid-glass-strong">
        <div className={`flex items-center justify-between px-3 py-2 border-b cursor-grab select-none ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
          <div className="flex items-center gap-1.5">
            {router.type.startsWith('switch') ? <SwitchIcon isL3={router.type === 'switchL3'} className="w-3.5 h-3.5 text-purple-500" /> : <RouterIcon className="w-3.5 h-3.5 text-purple-500" />}
            <span className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{router.name || router.id}</span>
          </div>
          <TooltipWrapper title={t.close}>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className={`w-5 h-5 rounded-md cursor-pointer transition-colors inline-flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10 hover:bg-red-500/80 text-slate-300 hover:text-white border border-white/15' : 'bg-black/8 hover:bg-red-500 text-slate-500 hover:text-white border border-black/10'}`}
            >
              <X className="w-3 h-3 pointer-events-none" />
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
