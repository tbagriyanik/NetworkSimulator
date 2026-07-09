'use client';

import { Monitor, X, SettingsIcon } from 'lucide-react';
import { SwitchIcon, RouterIcon } from '@/components/network/PCPanelWidgets';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { cn, normalizeMAC } from '@/lib/utils';

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
  isFocused?: boolean;
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
  isFocused?: boolean;
  handleDeviceDoubleClick: (type: DeviceType, id: string) => void;
  onOpenPanel: (id: string) => void;
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
}

export function PCInfoPopover({ pc, t, language, isDark, onClose, onFocus, zIndex, isFocused = false, handleDeviceDoubleClick, onOpenPanel, topologyDevices, deviceStates }: PCInfoPopoverProps) {
  const { containerRef, handleDragStart, position } = useDrag({
    storageKey: `pc-info-pos-${pc.id}`,
    defaultPosition: { x: 16, y: 96 },
    origin: 'bottom-right',
    disableSnap: true,
  });

  return (
    <div
      ref={containerRef}
      className={cn("hidden md:block fixed animate-scale-in")}
      onPointerDownCapture={onFocus}
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
        zIndex
      }}
    >
      <div className={`rounded-2xl overflow-hidden border shadow-2xl min-w-[200px] max-w-[260px] backdrop-blur-md ${isDark ? (isFocused ? 'bg-secondary-950/40 border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_20px_40px_rgba(0,0,0,0.4)]' : 'bg-secondary-950/40 border-emerald-950/80 shadow-black/40') : (isFocused ? 'bg-white/40 border-emerald-500 shadow-[0_0_0_1px_rgba(34,197,94,0.24),0_20px_40px_rgba(15,23,42,0.12)]' : 'bg-white/40 border-emerald-950/80 shadow-secondary-200/50')}`}>
        <div
          className={`flex items-center justify-between px-3 py-2 border-b select-none cursor-grab active:cursor-grabbing ${isDark ? 'bg-white/5 border-success-500/20' : 'bg-black/5 border-success-500/30'}`}
          onPointerDown={(e) => { onFocus(); handleDragStart(e); }}
        >
          <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing">
            <Monitor className="w-3.5 h-3.5 text-primary-500 pointer-events-none" />
            <span className={`font-semibold text-sm pointer-events-none ${isDark ? 'text-secondary-100' : 'text-secondary-800'}`}>{pc?.name || pc?.id || (language === 'tr' ? 'Bilinmiyor' : 'Unknown')}</span>
          </div>
          <TooltipWrapper title={t.close}>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className={`w-5 h-5 rounded-md bg-error-500 hover:bg-error-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0`}>
              <X className="w-3 h-3 text-white pointer-events-none" />
            </button>
          </TooltipWrapper>
        </div>
        <div className="overflow-hidden cursor-default">
          <div className="p-2 space-y-1 text-xs">
            <TooltipWrapper title={t.copy}>
              <div className="flex justify-between items-center cursor-pointer hover:bg-secondary-500/10 rounded px-1 transition-colors" onClick={() => navigator.clipboard.writeText(pc?.ip || '0.0.0.0')}>
                <span className="opacity-50">{language === 'tr' ? 'IP Adresi' : 'IP'}</span>
                <span className="font-mono text-primary-500">{pc?.ip || '0.0.0.0'}</span>
              </div>
            </TooltipWrapper>
            <TooltipWrapper title={t.copy}>
              <div className="flex justify-between items-center cursor-pointer hover:bg-secondary-500/10 rounded px-1 transition-colors" onClick={() => navigator.clipboard.writeText(pc?.subnet || '255.255.255.0')}>
                <span className="opacity-50">{language === 'tr' ? 'Alt Ağ' : 'Subnet'}</span>
                <span className="font-mono opacity-80">{pc?.subnet || '255.255.255.0'}</span>
              </div>
            </TooltipWrapper>
            <TooltipWrapper title={t.copy}>
              <div className="flex justify-between items-center cursor-pointer hover:bg-secondary-500/10 rounded px-1 transition-colors" onClick={() => navigator.clipboard.writeText(pc?.gateway || '0.0.0.0')}>
                <span className="opacity-50">{language === 'tr' ? 'Ağ Geçidi' : 'GW'}</span>
                <span className="font-mono opacity-80">{pc?.gateway || '0.0.0.0'}</span>
              </div>
            </TooltipWrapper>
            <TooltipWrapper title={t.copy}>
              <div className="flex justify-between items-center cursor-pointer hover:bg-secondary-500/10 rounded px-1 transition-colors" onClick={() => navigator.clipboard.writeText(`${pc?.ipv6 || '2001:db8:acad:1::10'}/${pc?.ipv6Prefix || '64'}`)}>
                <span className="opacity-50">{language === 'tr' ? 'IPv6 Adresi' : 'IPv6'}</span>
                <span className="font-mono opacity-80">{pc?.ipv6 || '2001:db8:acad:1::10'}<span className="opacity-50">/{pc?.ipv6Prefix || '64'}</span></span>
              </div>
            </TooltipWrapper>
            <TooltipWrapper title={t.copy}>
              <div className="flex justify-between items-center cursor-pointer hover:bg-secondary-500/10 rounded px-1 transition-colors" onClick={() => navigator.clipboard.writeText(pc?.macAddress ? normalizeMAC(pc.macAddress) : 'N/A')}>
                <span className="opacity-50">{language === 'tr' ? 'MAC Adresi' : 'MAC'}</span>
                <span className="font-mono opacity-30 text-xs">{pc?.macAddress ? normalizeMAC(pc.macAddress) : (language === 'tr' ? 'Yok' : 'N/A')}</span>
              </div>
            </TooltipWrapper>
            {pc?.wifi && pc.wifi.enabled && (
              <div className="pt-1 border-t border-secondary-500/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="opacity-50">{language === 'tr' ? 'Kablosuz' : 'WiFi'}</span>
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
                  const colorMap: Record<number, string> = { 0: 'text-secondary-400', 1: 'text-error-500', 2: 'text-warning-500', 3: 'text-yellow-500', 4: 'text-success-500', 5: 'text-success-500' };
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
              <div className="pt-1 border-t border-secondary-500/20">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="opacity-50">{t.services}</span>
                  <div className="flex flex-wrap gap-0.5">
                    {pc?.services?.http?.enabled && (
                      <span className="px-1 py-0.5 rounded bg-warning-500/20 text-warning-500 text-xs font-bold border border-warning-500/20">HTTP</span>
                    )}
                    {pc?.services?.dns?.enabled && (
                      <span className="px-1 py-0.5 rounded bg-primary-500/20 text-primary-500 text-xs font-bold border border-primary-500/20">DNS</span>
                    )}
                    {pc?.services?.dhcp?.enabled && (
                      <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-500 text-xs font-bold border border-purple-500/20">DHCP</span>
                    )}
                    {pc?.services?.ftp?.enabled && (
                      <span className="px-1 py-0.5 rounded bg-accent-500/20 text-accent-500 text-xs font-bold border border-accent-500/20">FTP</span>
                    )}
                    {pc?.services?.mail?.enabled && (
                      <span className="px-1 py-0.5 rounded bg-error-500/20 text-error-500 text-xs font-bold border border-error-500/20">MAIL</span>
                    )}
                    {pc?.services?.ntp?.enabled && (
                      <span className="px-1 py-0.5 rounded bg-primary-500/20 text-primary-500 text-xs font-bold border border-primary-500/20">NTP</span>
                    )}
                    {!pc?.services?.http?.enabled && !pc?.services?.dns?.enabled && !pc?.services?.dhcp?.enabled && !pc?.services?.ftp?.enabled && !pc?.services?.mail?.enabled && !pc?.services?.ntp?.enabled && (
                      <span className="text-xs opacity-40 italic">{t.none}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="pt-1 border-t border-secondary-500/20">
              <div className="flex justify-between items-center">
                <span className="opacity-50">{t.ipMode}</span>
                <span className={`text-xs font-bold tracking-wider ${pc?.ipConfigMode === 'dhcp' ? 'text-success-500' : 'opacity-60'}`}>
                  {pc?.ipConfigMode === 'dhcp' ? 'DHCP' : t.static}
                </span>
              </div>
            </div>
          </div>
          <div className={`px-2 py-1.5 border-t ${isDark ? 'border-secondary-700/50' : 'border-secondary-200/50'} flex gap-1.5`}>
            <button
              onClick={() => {
                if (pc?.type && pc?.id) {
                  handleDeviceDoubleClick(pc.type, pc.id);
                }
              }}
              disabled={!pc?.type || !pc?.id}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-accent-700 hover:bg-accent-600 text-white disabled:bg-secondary-700 disabled:text-secondary-500' : 'bg-primary-600 hover:bg-primary-700 text-white disabled:bg-secondary-300 disabled:text-secondary-500'}`}
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
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-secondary-700 hover:bg-secondary-600 text-secondary-200 disabled:bg-secondary-800 disabled:text-secondary-500' : 'bg-secondary-100 hover:bg-secondary-200 text-secondary-700 disabled:bg-secondary-200 disabled:text-secondary-400'}`}
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

export function RouterInfoPopover({ router, routerState, t, isDark, onClose, onFocus, zIndex, handleDeviceDoubleClick, onOpenPanel, topologyConnections }: RouterInfoPopoverProps) {
  const { containerRef, handleDragStart, position } = useDrag({
    storageKey: `router-info-pos-${router.id}`,
    defaultPosition: { x: 16, y: 96 },
    origin: 'bottom-right',
    disableSnap: true,
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
    .filter((p) => p.ipAddress && !p.shutdown)
    .map((p) => `${p.id}: ${p.ipAddress}${p.subnetMask ? `/${p.subnetMask}` : ''}`)
    .slice(0, 3);

  return (
    <div
      ref={containerRef}
      className={cn("hidden md:block fixed animate-scale-in")}
      onPointerDownCapture={onFocus}
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
        zIndex
      }}
    >
      <div className={`rounded-2xl overflow-hidden border shadow-2xl min-w-[200px] max-w-[280px] backdrop-blur-md ${isDark ? 'bg-secondary-950/40 border-success-500/30 shadow-black/40' : 'bg-white/40 border-success-500/50 shadow-secondary-200/50'}`}>
        <div
          className={`flex items-center justify-between px-3 py-2 border-b select-none cursor-grab active:cursor-grabbing ${isDark ? 'bg-white/5 border-success-500/20' : 'bg-black/5 border-success-500/30'}`}
          onPointerDown={(e) => { onFocus(); handleDragStart(e); }}
        >
          <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing">
            {router.type.startsWith('switch') ? <SwitchIcon isL3={router.type === 'switchL3'} className="w-3.5 h-3.5 text-purple-500 pointer-events-none" /> : <RouterIcon className="w-3.5 h-3.5 text-purple-500 pointer-events-none" />}
            <span className={`font-semibold text-sm pointer-events-none ${isDark ? 'text-secondary-100' : 'text-secondary-800'}`}>{router.name || router.id}</span>
          </div>
          <TooltipWrapper title={t.close}>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className={`w-5 h-5 rounded-md bg-error-500 hover:bg-error-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0`}
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
                <span className="text-success-500">{connectedPorts}</span>
                <span className="opacity-50">/{totalPorts}</span>
                <span className="ml-1 opacity-50">{t.connectedShort}</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-50">{t.routing}</span>
              <span className={`text-xs font-bold tracking-wider ${routerState?.ipRouting ? 'text-success-500' : 'text-secondary-500'}`}>
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
                <span className="text-accent-500">{t.active}</span>
              </div>
            )}
            {wifiEnabled && wifiConfig?.ssid && (
              <div className="pt-1 border-t border-secondary-500/20 space-y-1">
                <div className="flex gap-2 text-xs">
                  <span className="opacity-50">SSID:</span>
                  <span className="font-mono font-bold text-accent-500">{wifiConfig.ssid}</span>
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
              <div className="pt-1 border-t border-secondary-500/20">
                <div className="opacity-30 text-xs mb-0.5 uppercase font-bold tracking-tighter">IP Addresses</div>
                {ipAddresses.map((addr: string, i: number) => (
                  <TooltipWrapper key={i} title={t.copy}>
                    <div
                      className="font-mono text-xs opacity-70 truncate cursor-pointer hover:bg-secondary-500/10 rounded px-1 transition-colors"
                      onClick={() => navigator.clipboard.writeText(addr)}
                    >
                      {addr}
                    </div>
                  </TooltipWrapper>
                ))}
              </div>
            )}
          </div>
          <div className={`px-2 py-1.5 border-t ${isDark ? 'border-secondary-700/50' : 'border-secondary-200/50'} flex gap-1.5`}>
            <button
              onClick={() => {
                handleDeviceDoubleClick(router.type, router.id);
              }}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-success-600 hover:bg-success-700 text-white' : 'bg-success-600 hover:bg-success-700 text-white'}`}
            >
              {t.openCLI}
            </button>
            <TooltipWrapper title={t.details}>
              <button
                onClick={() => {
                  onOpenPanel(router.id);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${isDark ? 'bg-secondary-700 hover:bg-secondary-600 text-secondary-200' : 'bg-secondary-100 hover:bg-secondary-200 text-secondary-700'}`}
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
