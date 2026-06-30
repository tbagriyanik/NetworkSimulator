'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { SwitchState, Port } from '@/lib/network/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  X,
  Wifi,
  WifiOff,
  Network,
  Server,
  ShieldCheck,
  Activity,
  Globe,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn, normalizeMAC } from '@/lib/utils';
import type { CanvasDevice } from './networkTopology.types';
import { RouterIcon } from './PCPanelWidgets';

interface RouterPanelProps {
  deviceId: string;
  isVisible: boolean;
  onClose: () => void;
  topologyDevices?: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
  modalPosition?: { x: number; y: number };
  modalSize?: { width: number; height: number };
  handlePointerDown?: (e: React.PointerEvent, id: string) => void;
  handleResizeStart?: (e: React.PointerEvent, direction: string, id: string) => void;
  className?: string;
}

interface DhcpPoolInfo {
  poolName: string;
  network?: string;
  subnetMask?: string;
  defaultRouter?: string;
  dnsServer?: string;
  leaseTime?: string;
  domainName?: string;
}

export function RouterPanel({
  deviceId,
  isVisible,
  onClose,
  topologyDevices = [],
  deviceStates,
  modalPosition = { x: 0, y: 0 },
  modalSize = { width: 896, height: 600 },
  handlePointerDown,
  handleResizeStart,
  className,
}: RouterPanelProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'overview' | 'ports' | 'wifi' | 'dhcp'>('overview');

  // Get router device from topology
  const routerDevice = useMemo(() =>
    topologyDevices.find(d => d.id === deviceId && (d.type === 'router' || d.type === 'switchL3')),
    [deviceId, topologyDevices]
  );

  // Get router state from deviceStates
  const routerState = useMemo(() =>
    deviceStates?.get(deviceId),
    [deviceId, deviceStates]
  );

  // Get ports from router state or topology
  const ports = useMemo(() => {
    if (routerState?.ports) {
      return Object.values(routerState.ports);
    }
    return routerDevice?.ports || [];
  }, [routerState, routerDevice]);

  // Get DHCP pools from router state
  const dhcpPools = useMemo(() => {
    if (routerState?.dhcpPools) {
      return Object.entries(routerState.dhcpPools).map(([name, pool]) => ({
        poolName: name,
        ...(pool as Record<string, unknown>)
      } as DhcpPoolInfo));
    }
    return [];
  }, [routerState]);

  // Get WiFi configuration
  const wifiConfig = useMemo(() => {
    // Check device topology wifi config
    if (routerDevice?.wifi) {
      return routerDevice.wifi;
    }
    // Check device state for wlan0 port wifi config
    if (routerState?.ports?.['wlan0']?.wifi) {
      return routerState.ports['wlan0'].wifi;
    }
    return null;
  }, [routerDevice, routerState]);

  // Get interfaces with IP addresses
  const interfacesWithIP = useMemo(() => {
    const result: Array<{ id: string; ip: string; subnet: string; status: string }> = [];

    if (routerState?.ports) {
      Object.entries(routerState.ports).forEach(([id, port]) => {
        if (port.ipAddress && !port.shutdown) {
          result.push({
            id,
            ip: port.ipAddress,
            subnet: port.subnetMask || '',
            status: port.status
          });
        }
      });
    }

    return result;
  }, [routerState]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-success-500" />;
      case 'notconnect':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'disabled':
        return <XCircle className="w-4 h-4 text-error-500" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPortLEDColorClass = (port: Port): string => {
    // Handle both Port (from routerState) and CanvasPort (from topology)
    const isShutdown = port.shutdown ?? false;
    const status = port.status ?? 'notconnect';
    const isSTPBlocked = port.spanningTree?.state === 'blocking' || port.spanningTree?.role === 'alternate';

    if (isShutdown) return 'bg-gray-500';
    if (status === 'blocked' || isSTPBlocked) return 'bg-orange-500';
    if (status === 'connected') return 'bg-success-500';
    if (status === 'notconnect') return 'bg-white';
    return 'bg-gray-400';
  };

  if (!isVisible || !routerDevice) {
    return null;
  }

  return (
    <Dialog open={isVisible} onOpenChange={(open) => {
      if (!open) onClose();
    }} modal={false}>
      <DialogContent
        className={cn(
          "p-0 flex flex-col top-auto left-auto translate-x-0 translate-y-0 liquid-glass-light",
          isDark ? "bg-secondary-950/80 border-green-500/40" : "bg-white/70 border-green-500",
          className
        )}
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        data-modal-content
        style={{
          position: 'absolute',
          left: isMobile ? 0 : modalPosition.x,
          top: isMobile ? 0 : modalPosition.y,
          width: isMobile ? '100vw' : `${modalSize.width}px`,
          height: isMobile ? '100vh' : `${modalSize.height}px`,
          maxWidth: 'none',
          maxHeight: isMobile ? '100vh' : '80vh',
          borderRadius: isMobile ? 0 : '1rem',
          borderWidth: 3,
          borderStyle: 'dashed',
        }}
      >
        <div className="relative flex flex-col h-full overflow-hidden rounded-2xl shadow-2xl">
        <DialogHeader
          className={cn(
            "p-4 border-b cursor-grab active:cursor-grabbing select-none touch-none min-h-[52px]",
            isDark ? "border-green-500/30 bg-secondary-900/75" : "border-green-500/60 bg-white/80"
          )}
          data-modal-header
          onPointerDown={(e) => handlePointerDown?.(e, 'router')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${routerDevice.status === 'online' ? 'bg-success-500 animate-pulse' : 'bg-error-500'}`}
                  >
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {routerDevice.status === 'online' ? (language === 'tr' ? 'Çevrimiçi' : 'Online') : (language === 'tr' ? 'Çevrimdışı' : 'Offline')}
                </TooltipContent>
              </Tooltip>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <RouterIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {routerDevice.name || deviceId}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {t.routerInfoPanel}
                </p>
              </div>
            </div>
            <button
              className="w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors inline-flex items-center justify-center focus:outline-none disabled:pointer-events-none"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b" role="tablist" aria-label={language === 'tr' ? 'Router panel sekmeleri' : 'Router panel tabs'}>
          <Button
            variant="ghost"
            className={cn(
              "flex-1 rounded-none border-b-2",
              activeTab === 'overview'
                ? "border-purple-500 text-purple-600 dark:text-purple-400"
                : "border-transparent text-muted-foreground"
            )}
            onClick={() => setActiveTab('overview')}
            role="tab"
            aria-selected={activeTab === 'overview'}
            aria-controls="overview-panel"
            aria-current={activeTab === 'overview' ? 'page' : undefined}
          >
            <Activity className="w-4 h-4 mr-2" />
            {t.overview}
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "flex-1 rounded-none border-b-2",
              activeTab === 'ports'
                ? "border-purple-500 text-purple-600 dark:text-purple-400"
                : "border-transparent text-muted-foreground"
            )}
            onClick={() => setActiveTab('ports')}
            role="tab"
            aria-selected={activeTab === 'ports'}
            aria-controls="ports-panel"
            aria-current={activeTab === 'ports' ? 'page' : undefined}
          >
            <Network className="w-4 h-4 mr-2" />
            {t.ports}
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "flex-1 rounded-none border-b-2",
              activeTab === 'wifi'
                ? "border-purple-500 text-purple-600 dark:text-purple-400"
                : "border-transparent text-muted-foreground"
            )}
            onClick={() => setActiveTab('wifi')}
            role="tab"
            aria-selected={activeTab === 'wifi'}
            aria-controls="wifi-panel"
            aria-current={activeTab === 'wifi' ? 'page' : undefined}
          >
            <Wifi className="w-4 h-4 mr-2" />
            WiFi
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "flex-1 rounded-none border-b-2",
              activeTab === 'dhcp'
                ? "border-purple-500 text-purple-600 dark:text-purple-400"
                : "border-transparent text-muted-foreground"
            )}
            onClick={() => setActiveTab('dhcp')}
            role="tab"
            aria-selected={activeTab === 'dhcp'}
            aria-controls="dhcp-panel"
            aria-current={activeTab === 'dhcp' ? 'page' : undefined}
          >
            <Server className="w-4 h-4 mr-2" />
            DHCP
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 h-[calc(80vh-140px)]">
          <div className="p-4">
            {activeTab === 'overview' && (
              <div id="overview-panel" role="tabpanel" className="space-y-4">
                {/* Device Info */}
                <div className={cn(
                  "p-4 rounded-lg border",
                  isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200"
                )}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {t.deviceInformation}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t.deviceNameLabel}:</span>
                      <p className="font-medium">{routerDevice.name || deviceId}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.macAddress}:</span>
                      <p className="font-medium">{normalizeMAC(routerDevice.macAddress || routerState?.macAddress || '-')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.status}:</span>
                      <p className="font-medium flex items-center gap-1">
                        {routerDevice.status === 'online' ? (
                          <CheckCircle2 className="w-4 h-4 text-success-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-error-500" />
                        )}
                        {routerDevice.status}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.ipRouting}:</span>
                      <p className="font-medium">{routerState?.ipRouting ? (
                        <span className="text-success-500">{t.active}</span>
                      ) : (
                        <span className="text-error-500">{t.suspended}</span>
                      )}</p>
                    </div>
                  </div>
                </div>

                {/* IP Interfaces */}
                <div className={cn(
                  "p-4 rounded-lg border",
                  isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200"
                )}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    {t.ipInterfaces}
                  </h3>
                  {interfacesWithIP.length > 0 ? (
                    <div className="space-y-2">
                      {interfacesWithIP.map((iface) => (
                        <div key={iface.id} className="flex items-center justify-between p-2 rounded bg-secondary-100 dark:bg-secondary-900">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(iface.status)}
                            <span className="font-medium">{iface.id}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">IP: </span>
                            <span className="font-mono">{iface.ip}</span>
                            {iface.subnet && (
                              <>
                                <span className="text-muted-foreground ml-2">/</span>
                                <span className="font-mono">{iface.subnet}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t.noIpInterfaces}
                    </p>
                  )}
                </div>

                {/* Port Summary */}
                <div className={cn(
                  "p-4 rounded-lg border",
                  isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200"
                )}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    {t.portSummary}
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center p-3 rounded bg-success-100 dark:bg-success-900/30">
                      <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                        {ports.filter(p => p.id !== 'wlan0' && !p.shutdown && p.status === 'connected').length}
                      </p>
                      <p className="text-muted-foreground">{t.connectedStatus}</p>
                    </div>
                    <div className="text-center p-3 rounded bg-gray-100 dark:bg-gray-900/30">
                      <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                        {ports.filter(p => p.id !== 'wlan0' && !p.shutdown && p.status === 'notconnect').length}
                      </p>
                      <p className="text-muted-foreground">{t.disconnectedStatus}</p>
                    </div>
                    <div className="text-center p-3 rounded bg-error-100 dark:bg-error-900/30">
                      <p className="text-2xl font-bold text-error-600 dark:text-error-400">
                        {ports.filter(p => p.shutdown).length}
                      </p>
                      <p className="text-muted-foreground">{t.shutdownStatus}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ports' && (
              <div id="ports-panel" role="tabpanel" className="space-y-2">
                {ports.map((port) => (
                  <div
                    key={port.id}
                    className={cn(
                      "p-3 rounded-lg border flex items-center justify-between",
                      isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", getPortLEDColorClass(port as Port))} />
                      <div>
                        <p className="font-medium">{port.id}</p>
                        {port.description && (
                          <p className="text-xs text-muted-foreground">{port.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(port.status)}
                        <span className="text-muted-foreground">{port.status}</span>
                      </div>
                      {port.ipAddress && (
                        <div className="font-mono">
                          {port.ipAddress}
                          {port.subnetMask && `/${port.subnetMask}`}
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        {port.speed}/{port.duplex}
                      </div>
                      {port.shutdown && (
                        <span className="text-xs text-error-500 font-medium">
                          {t.shutdownStatus.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'wifi' && (
              <div id="wifi-panel" role="tabpanel" className="space-y-4">
                {wifiConfig ? (
                  <>
                    <div className={cn(
                      "p-4 rounded-lg border",
                      isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          {(wifiConfig as { enabled?: boolean }).enabled || wifiConfig.mode === 'ap' ? (
                            <Wifi className="w-4 h-4 text-success-500" />
                          ) : (
                            <WifiOff className="w-4 h-4 text-gray-500" />
                          )}
                          {t.wifiStatus}
                        </h3>
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          (wifiConfig as { enabled?: boolean }).enabled || wifiConfig.mode === 'ap'
                            ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                        )}>
                          {(wifiConfig as { enabled?: boolean }).enabled || wifiConfig.mode === 'ap'
                            ? t.active
                            : t.suspended
                          }
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t.wifiSsid}:</span>
                          <p className="font-medium">{wifiConfig.ssid || '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t.modeLabel}</span>
                          <p className="font-medium capitalize">{wifiConfig.mode || '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t.wifiChannel}:</span>
                          <p className="font-medium">{wifiConfig.channel || '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t.wifiSecurity}:</span>
                          <p className="font-medium flex items-center gap-1">
                            {wifiConfig.security !== 'open' ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              <Unlock className="w-3 h-3" />
                            )}
                            {wifiConfig.security || 'open'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {wifiConfig.security !== 'open' && wifiConfig.password && (
                      <div className={cn(
                        "p-4 rounded-lg border",
                        isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200"
                      )}>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          {t.wifiPassword}
                        </h3>
                        <p className="font-mono text-sm">••••••••</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={cn(
                    "p-8 rounded-lg border text-center",
                    isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200"
                  )}>
                    <WifiOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {t.noWifiConfig}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dhcp' && (
              <div id="dhcp-panel" role="tabpanel" className="space-y-4">
                {dhcpPools.length > 0 ? (
                  dhcpPools.map((pool) => (
                    <div
                      key={pool.poolName}
                      className={cn(
                        "p-4 rounded-lg border",
                        isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200"
                      )}
                    >
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        {pool.poolName}
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {pool.network && (
                          <div>
                            <span className="text-muted-foreground">{language === 'tr' ? 'Ağ:' : 'Network:'}</span>
                            <p className="font-mono font-medium">{pool.network}</p>
                          </div>
                        )}
                        {pool.subnetMask && (
                          <div>
                            <span className="text-muted-foreground">{t.subnetMask}:</span>
                            <p className="font-mono font-medium">{pool.subnetMask}</p>
                          </div>
                        )}
                        {pool.defaultRouter && (
                          <div>
                            <span className="text-muted-foreground">{t.gateway}:</span>
                            <p className="font-mono font-medium">{pool.defaultRouter}</p>
                          </div>
                        )}
                        {pool.dnsServer && (
                          <div>
                            <span className="text-muted-foreground">{t.dnsServer}:</span>
                            <p className="font-mono font-medium">{pool.dnsServer}</p>
                          </div>
                        )}
                        {pool.leaseTime && (
                          <div>
                            <span className="text-muted-foreground">{language === 'tr' ? 'Kira Süresi:' : 'Lease Time:'}</span>
                            <p className="font-medium">{pool.leaseTime}</p>
                          </div>
                        )}
                        {pool.domainName && (
                          <div>
                            <span className="text-muted-foreground">{language === 'tr' ? 'Domain Adı:' : 'Domain Name:'}</span>
                            <p className="font-medium">{pool.domainName}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={cn(
                    "p-8 rounded-lg border text-center",
                    isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200"
                  )}>
                    <Server className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {t.dhcpPoolConfig}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t.dhcpCliConfig}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
          {/* Resize handles */}
          {!isMobile && handleResizeStart && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none bg-transparent hover:bg-purple-500/10" onPointerDown={(e) => handleResizeStart(e, 'w', 'router')} />
              <div className="absolute -right-[5px] top-0 bottom-0 w-[10px] cursor-ew-resize select-none touch-none rounded-r-lg bg-transparent hover:bg-purple-500/20" onPointerDown={(e) => handleResizeStart(e, 'e', 'router')} />
              <div className="absolute -top-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-t-lg bg-transparent hover:bg-purple-500/20" onPointerDown={(e) => handleResizeStart(e, 'n', 'router')} />
              <div className="absolute -bottom-[5px] left-[10px] right-8 z-20 h-[10px] cursor-ns-resize select-none touch-none rounded-b-lg bg-transparent hover:bg-purple-500/20" onPointerDown={(e) => handleResizeStart(e, 's', 'router')} />
              <div className="absolute -left-[5px] -top-[5px] z-20 h-[10px] w-[10px] cursor-nw-resize select-none touch-none bg-transparent hover:bg-purple-500/20" onPointerDown={(e) => handleResizeStart(e, 'nw', 'router')} />
              <div className="absolute -right-[5px] -top-[5px] z-20 h-[10px] w-[10px] cursor-ne-resize select-none touch-none bg-transparent hover:bg-purple-500/20" onPointerDown={(e) => handleResizeStart(e, 'ne', 'router')} />
              <div className="absolute -left-[5px] -bottom-[5px] z-20 h-[10px] w-[10px] cursor-sw-resize select-none touch-none bg-transparent hover:bg-purple-500/20" onPointerDown={(e) => handleResizeStart(e, 'sw', 'router')} />
              <div className="absolute -bottom-2 -right-2 z-20 h-7 w-7 cursor-se-resize select-none touch-none rounded-tl-lg rounded-br-lg border border-purple-400/30 bg-purple-500/30 text-purple-100/80 hover:bg-purple-500/30 hover:text-white flex items-center justify-center" onPointerDown={(e) => handleResizeStart(e, 'se', 'router')}>
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 13L13 6" /><path d="M9.5 13L13 9.5" /><path d="M12.5 13L13 12.5" />
                </svg>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
