'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SwitchState, Port } from '@/lib/network/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { secureStorage } from '@/lib/storage/secureStorage';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Wifi,
  WifiOff,
  Network,
  Server,
  ShieldCheck,
  Activity,
  Lock,
  Unlock,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGraphicsQuality } from '@/lib/store/appStore';
import type { CanvasDevice, CanvasConnection } from './NetworkTopology/types/networkTopology.types';
import { RouterIcon } from './PCPanelWidgets';
import { getRoutingTable } from '@/lib/network/routing';

import { RouterOverviewTab } from './router-panel/RouterOverviewTab';
import { RouterRoutesTab } from './router-panel/RouterRoutesTab';

interface RouterPanelProps {
  deviceId: string;
  isVisible: boolean;
  onClose: () => void;
  topologyDevices?: CanvasDevice[];
  topologyConnections?: CanvasConnection[];
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
  topologyConnections = [],
  deviceStates,
  modalPosition = { x: 0, y: 0 },
  modalSize = { width: 896, height: 600 },
  handlePointerDown,
  handleResizeStart,
  className,
}: RouterPanelProps) {
  const graphicsQuality = useGraphicsQuality();
  const { t, language } = useLanguage();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'overview' | 'ports' | 'wifi' | 'dhcp' | 'routes'>('overview');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = secureStorage.getItem(`router-panel-collapsed-${deviceId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      secureStorage.setItem(`router-panel-collapsed-${deviceId}`, JSON.stringify(collapsedSections));
    }
  }, [collapsedSections, deviceId]);

  const routerDevice = useMemo(() =>
    topologyDevices.find(d => d.id === deviceId && (d.type === 'router' || d.type === 'switchL3')),
    [deviceId, topologyDevices]
  );

  const routerState = useMemo(() =>
    deviceStates?.get(deviceId),
    [deviceId, deviceStates]
  );

  const ports = useMemo(() => {
    if (routerState?.ports) {
      return Object.values(routerState.ports);
    }
    return routerDevice?.ports || [];
  }, [routerState, routerDevice]);

  useEffect(() => {
    if (!isVisible) return;
    const handleMobileBack = () => onClose();
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    window.addEventListener('popstate', handleMobileBack);
    return () => {
      window.removeEventListener('mobile-back-pressed', handleMobileBack);
      window.removeEventListener('popstate', handleMobileBack);
    };
  }, [isVisible, onClose]);

  const dhcpPools = useMemo(() => {
    if (routerState?.dhcpPools) {
      return Object.entries(routerState.dhcpPools).map(([name, pool]) => ({
        poolName: name,
        ...(pool as Record<string, unknown>)
      } as DhcpPoolInfo));
    }
    return [];
  }, [routerState]);

  const wifiConfig = useMemo(() => {
    if (routerDevice?.wifi) {
      return routerDevice.wifi;
    }
    if (routerState?.ports?.['wlan0']?.wifi) {
      return routerState.ports['wlan0'].wifi;
    }
    return null;
  }, [routerDevice, routerState]);

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

  const [routeSearch, setRouteSearch] = useState('');

  const routingTable = useMemo(() => {
    if (!deviceStates) return [];
    return getRoutingTable(deviceId, deviceStates, topologyDevices, topologyConnections);
  }, [deviceId, deviceStates, topologyDevices, topologyConnections]);

  const filteredRoutes = useMemo(() => {
    if (!routeSearch.trim()) return routingTable;
    const query = routeSearch.toLowerCase();
    return routingTable.filter(r =>
      r.destination.toLowerCase().includes(query) ||
      (r.subnetMask && r.subnetMask.toLowerCase().includes(query)) ||
      (r.prefixLength !== undefined && String(r.prefixLength).includes(query)) ||
      r.nextHop.toLowerCase().includes(query) ||
      r.type.toLowerCase().includes(query)
    );
  }, [routingTable, routeSearch]);

  const getPortLEDColorClass = (port: Port): string => {
    const isShutdown = port.shutdown ?? false;
    const status = port.status ?? 'notconnect';
    const isSTPBlocked = port.spanningTree?.state === 'blocking' || port.spanningTree?.role === 'alternate';

    if (isShutdown) return 'bg-secondary-500';
    if (status === 'blocked' || isSTPBlocked) return 'bg-warning-500';
    if (status === 'connected') return 'bg-success-500';
    if (status === 'notconnect') return 'bg-white';
    return 'bg-secondary-400';
  };

  if (!isVisible || !routerDevice) {
    return null;
  }

  return (
    <DraggableWindowWrapper
      id="router"
      className={`${graphicsQuality === 'high' ? `liquid-glass-light ${isDark ? '!bg-secondary-950/90 border-emerald-950/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]' : '!bg-white/90 border-emerald-950/80 shadow-[0_8px_28px_rgba(15,23,42,0.12)]'}` : (isDark ? '!bg-secondary-950 !border-secondary-800' : '!bg-white !border-secondary-200')} ${className || ''}`}
      title={
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
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
            <RouterIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <span className="text-sm font-semibold">
              {routerDevice.name || deviceId}
            </span>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              {t.routerInfoPanel}
            </p>
          </div>
        </div>
      }
      isOpen={isVisible}
      onClose={onClose}
      isDark={isDark}
      modalPosition={modalPosition}
      modalSize={modalSize}
      handlePointerDown={handlePointerDown}
      handleResizeStart={handleResizeStart}
    >
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
        >
          <Server className="w-4 h-4 mr-2" />
          DHCP
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "flex-1 rounded-none border-b-2",
            activeTab === 'routes'
              ? "border-purple-500 text-purple-600 dark:text-purple-400"
              : "border-transparent text-muted-foreground"
          )}
          onClick={() => setActiveTab('routes')}
          role="tab"
          aria-selected={activeTab === 'routes'}
        >
          <Compass className="w-4 h-4 mr-2" />
          {t.routingTableTab}
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 h-[calc(80vh-140px)]">
        <div className="p-4">
          {activeTab === 'overview' && (
            <RouterOverviewTab
              routerDevice={routerDevice}
              routerState={routerState}
              deviceId={deviceId}
              ports={ports as Port[]}
              interfacesWithIP={interfacesWithIP}
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
              isDark={isDark}
              t={t}
            />
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
                    <span className="text-muted-foreground">{port.status}</span>
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
                          <WifiOff className="w-4 h-4 text-secondary-500" />
                        )}
                        {t.wifiStatus}
                      </h3>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        (wifiConfig as { enabled?: boolean }).enabled || wifiConfig.mode === 'ap'
                          ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                          : "bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400"
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

          {activeTab === 'routes' && (
            <RouterRoutesTab
              routerState={routerState}
              routingTable={routingTable}
              filteredRoutes={filteredRoutes}
              routeSearch={routeSearch}
              setRouteSearch={setRouteSearch}
              isDark={isDark}
              language={language}
              t={t}
            />
          )}
        </div>
      </ScrollArea>
    </DraggableWindowWrapper>
  );
}
