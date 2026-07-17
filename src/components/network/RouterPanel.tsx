'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SwitchState, Port } from '@/lib/network/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
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
  ChevronUp,
  ChevronDown,
  Compass,
  Search,
} from 'lucide-react';
import { cn, normalizeMAC } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import type { CanvasDevice, CanvasConnection } from './networkTopology.types';
import { RouterIcon } from './PCPanelWidgets';
import { getRoutingTable, findRoute, Route } from '@/lib/network/routing';

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
  const { t, language } = useLanguage();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'overview' | 'ports' | 'wifi' | 'dhcp' | 'routes'>('overview');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(`router-panel-collapsed-${deviceId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`router-panel-collapsed-${deviceId}`, JSON.stringify(collapsedSections));
    }
  }, [collapsedSections, deviceId]);

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

  const [routeSearch, setRouteSearch] = useState('');
  const [lookupIp, setLookupIp] = useState('');
  const [lookupResult, setLookupResult] = useState<{
    route: Route | null;
    explanation: string;
    searched: boolean;
  }>({ route: null, explanation: '', searched: false });

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

  const handleRouteLookup = () => {
    if (!lookupIp.trim()) {
      setLookupResult({ route: null, explanation: '', searched: false });
      return;
    }
    const isIpv4 = /^[0-9.]+$/.test(lookupIp);
    const isIpv6 = /^[0-9a-fA-F:]+$/.test(lookupIp);
    if (!isIpv4 && !isIpv6) {
      setLookupResult({
        route: null,
        explanation: language === 'tr' ? 'Geçersiz IP adresi formatı.' : 'Invalid IP address format.',
        searched: true
      });
      return;
    }

    const matchedRoute = findRoute(lookupIp.trim(), routingTable);
    if (matchedRoute) {
      let desc = '';
      if (matchedRoute.type === 'connected') {
        desc = language === 'tr'
          ? `Doğrudan bağlı ağ eşleşmesi. Paket ${matchedRoute.nextHop} arayüzü üzerinden doğrudan iletilecek.`
          : `Directly connected network match. Packet will be forwarded directly via interface ${matchedRoute.nextHop}.`;
      } else if (matchedRoute.destination === '0.0.0.0' || matchedRoute.destination === '::') {
        desc = language === 'tr'
          ? `Özel rota bulunamadı. Varsayılan rota (Default Route) kullanılıyor. Next Hop: ${matchedRoute.nextHop}.`
          : `No specific route found. Using Default Route. Next Hop: ${matchedRoute.nextHop}.`;
      } else {
        const protocol = matchedRoute.type === 'static' ? (language === 'tr' ? 'Statik' : 'Static') : matchedRoute.type.toUpperCase();
        desc = language === 'tr'
          ? `${protocol} yönlendirme kuralı eşleşti (En Uzun Önek Eşleşmesi). Hedefe gitmek için paket şu Next Hop'a iletilecek: ${matchedRoute.nextHop}.`
          : `${protocol} routing rule matched (Longest Prefix Match). Packet will be forwarded to Next Hop: ${matchedRoute.nextHop}.`;
      }
      setLookupResult({
        route: matchedRoute,
        explanation: desc,
        searched: true
      });
    } else {
      setLookupResult({
        route: null,
        explanation: language === 'tr'
          ? 'Hedef ağ bulunamadı. Yönlendirme tablosunda bu IP adresiyle eşleşen bir kural yok ve varsayılan ağ geçidi (0.0.0.0/0) yapılandırılmamış.'
          : 'Destination host unreachable. No matching route in the routing table, and no default gateway (0.0.0.0/0) is configured.',
        searched: true
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-success-500" />;
      case 'notconnect':
        return <XCircle className="w-4 h-4 text-secondary-500" />;
      case 'disabled':
        return <XCircle className="w-4 h-4 text-error-500" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-warning-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-secondary-400" />;
    }
  };

  const getPortLEDColorClass = (port: Port): string => {
    // Handle both Port (from routerState) and CanvasPort (from topology)
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
      className={`liquid-glass-light ${isDark ? '!bg-secondary-950/40 border-emerald-950/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]' : '!bg-white/60 border-emerald-950/80 shadow-[0_8px_28px_rgba(15,23,42,0.12)]'} ${className || ''}`}
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
            aria-controls="routes-panel"
            aria-current={activeTab === 'routes' ? 'page' : undefined}
          >
            <Compass className="w-4 h-4 mr-2" />
            {t.routingTableTab}
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 h-[calc(80vh-140px)]">
          <div className="p-4">
{activeTab === 'overview' && (
               <div id="overview-panel" role="tabpanel" className="space-y-4">
                 {/* Device Info */}
                 <div className={cn("rounded-lg border overflow-hidden", isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200")}>
                   <Collapsible open={!collapsedSections.deviceInfo} onOpenChange={(open) => setCollapsedSections(prev => ({ ...prev, deviceInfo: !open }))}>
                     <CollapsibleTrigger asChild>
                       <div className="p-4 flex items-center justify-between cursor-pointer select-none">
                         <h3 className="font-semibold mb-0 flex items-center gap-2">
                           <Globe className="w-4 h-4" />
                           {t.deviceInformation}
                         </h3>
                         {collapsedSections.deviceInfo ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                       </div>
                     </CollapsibleTrigger>
                     <CollapsibleContent>
                       <div className="px-4 pb-4">
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
                             </p>
                             {routerDevice.status}
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
                     </CollapsibleContent>
                   </Collapsible>
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

{/* IP Interfaces */}
                 <div className={cn("rounded-lg border overflow-hidden", isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200")}>
                   <Collapsible open={!collapsedSections.ipInterfaces} onOpenChange={(open) => setCollapsedSections(prev => ({ ...prev, ipInterfaces: !open }))}>
                     <CollapsibleTrigger asChild>
                       <div className="p-4 flex items-center justify-between cursor-pointer select-none">
                         <h3 className="font-semibold mb-0 flex items-center gap-2">
                           <Network className="w-4 h-4" />
                           {t.ipInterfaces}
                         </h3>
                         {collapsedSections.ipInterfaces ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                       </div>
                     </CollapsibleTrigger>
                     <CollapsibleContent>
                       <div className="px-4 pb-4">
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
                     </CollapsibleContent>
                   </Collapsible>
                 </div>

{/* Port Summary */}
                 <div className={cn("rounded-lg border overflow-hidden", isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200")}>
                   <Collapsible open={!collapsedSections.portSummary} onOpenChange={(open) => setCollapsedSections(prev => ({ ...prev, portSummary: !open }))}>
                     <CollapsibleTrigger asChild>
                       <div className="p-4 flex items-center justify-between cursor-pointer select-none">
                         <h3 className="font-semibold mb-0 flex items-center gap-2">
                           <Activity className="w-4 h-4" />
                           {t.portSummary}
                         </h3>
                         {collapsedSections.portSummary ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                       </div>
                     </CollapsibleTrigger>
                     <CollapsibleContent>
                       <div className="px-4 pb-4">
                         <div className="grid grid-cols-3 gap-3 text-sm">
                           <div className="text-center p-3 rounded bg-success-100 dark:bg-success-900/30">
                             <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                               {ports.filter(p => p.id !== 'wlan0' && !p.shutdown && p.status === 'connected').length}
                             </p>
                             <p className="text-muted-foreground">{t.connectedStatus}</p>
                           </div>
                           <div className="text-center p-3 rounded bg-secondary-100 dark:bg-secondary-900/30">
                             <p className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
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
                     </CollapsibleContent>
                   </Collapsible>
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
              <div id="routes-panel" role="tabpanel" className="space-y-4 animate-in fade-in duration-200">
                {/* Router IP routing status check */}
                {routerState && !routerState.ipRouting && (
                  <div className="p-3 rounded-lg border border-error-500/20 bg-error-500/10 text-error-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {language === 'tr'
                        ? 'IP Yönlendirme kapalı! Cihaz paket yönlendirmesi yapamaz. CLI üzerinden "ip routing" komutunu çalıştırarak aktif edebilirsiniz.'
                        : 'IP Routing is disabled! This device cannot forward packets. You can enable it by running the "ip routing" command in CLI.'}
                    </span>
                  </div>
                )}

                {/* Route Lookup Visual Debugger */}
                <div className={cn("rounded-lg border p-4", isDark ? "bg-secondary-900 border-secondary-800/80" : "bg-secondary-50 border-secondary-200")}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-primary">
                    <Compass className="w-4 h-4 text-purple-500" />
                    {t.routeLookup} (Visual Debugger)
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={lookupIp}
                      onChange={(e) => setLookupIp(e.target.value)}
                      placeholder={language === 'tr' ? 'Hedef IP Adresi (örn: 192.168.1.5)' : 'Target IP Address (e.g. 192.168.1.5)'}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-xs border outline-none",
                        isDark ? "bg-secondary-950 border-secondary-800 text-white focus:border-purple-500" : "bg-white border-secondary-300 text-secondary-900 focus:border-purple-600"
                      )}
                      onKeyDown={(e) => e.key === 'Enter' && handleRouteLookup()}
                    />
                    <Button size="sm" onClick={handleRouteLookup} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4">
                      {language === 'tr' ? 'Sorgula' : 'Lookup'}
                    </Button>
                  </div>

                  {lookupResult.searched && (
                    <div className={cn("mt-3 p-3 rounded-lg text-xs border animate-in zoom-in-95 duration-200", 
                      lookupResult.route
                        ? (isDark ? "bg-success-950/20 border-success-500/20 text-success-300" : "bg-success-50/50 border-success-200 text-success-800")
                        : (isDark ? "bg-error-950/20 border-error-500/20 text-error-300" : "bg-error-50/50 border-error-200 text-error-800")
                    )}>
                      <div className="font-bold flex items-center gap-1.5 mb-1.5">
                        {lookupResult.route ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-success-500" />
                            <span>{language === 'tr' ? 'Rota Eşleşti!' : 'Route Matched!'}</span>
                            <span className="font-mono bg-success-500/10 px-1.5 py-0.5 rounded text-[10px]">
                              {lookupResult.route.destination}
                              {lookupResult.route.subnetMask ? `/${lookupResult.route.subnetMask}` : lookupResult.route.prefixLength ? `/${lookupResult.route.prefixLength}` : ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-error-500" />
                            <span>{language === 'tr' ? 'Eşleşen Rota Yok!' : 'No Matching Route!'}</span>
                          </>
                        )}
                      </div>
                      <p className="opacity-90 leading-relaxed">{lookupResult.explanation}</p>
                    </div>
                  )}
                </div>

                {/* Search & Routing Table list */}
                <div className={cn("rounded-lg border overflow-hidden", isDark ? "bg-secondary-900 border-secondary-800/80" : "bg-secondary-50 border-secondary-200")}>
                  <div className="p-3 border-b border-secondary-200 dark:border-secondary-800/80 flex items-center justify-between gap-3 bg-secondary-100/30 dark:bg-secondary-950/10">
                    <h3 className="font-semibold text-xs flex items-center gap-2 shrink-0">
                      <Network className="w-4 h-4 text-primary" />
                      {t.routingTableTab} ({filteredRoutes.length})
                    </h3>
                    <div className="relative w-48 shrink-0">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={routeSearch}
                        onChange={(e) => setRouteSearch(e.target.value)}
                        placeholder={language === 'tr' ? 'Ara...' : 'Search...'}
                        className={cn(
                          "w-full pl-8 pr-3 py-1.5 rounded-md text-[11px] border outline-none",
                          isDark ? "bg-secondary-950 border-secondary-800 text-white focus:border-purple-500" : "bg-white border-secondary-300 text-secondary-900 focus:border-purple-600"
                        )}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-xs text-left">
                      <thead className={cn("border-b text-[10px] uppercase tracking-wider font-semibold sticky top-0 z-10", isDark ? "bg-secondary-950 border-secondary-800 text-secondary-400" : "bg-secondary-100 border-secondary-200 text-secondary-600")}>
                        <tr>
                          <th className="p-3 w-24">{language === 'tr' ? 'Tip' : 'Type'}</th>
                          <th className="p-3">{language === 'tr' ? 'Hedef Ağ' : 'Destination Network'}</th>
                          <th className="p-3 w-32">{language === 'tr' ? 'Metrik [AD/Metrik]' : 'Metric [AD/Metric]'}</th>
                          <th className="p-3">{language === 'tr' ? 'Sonraki Hop / Arayüz' : 'Next Hop / Interface'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRoutes.length > 0 ? (
                          filteredRoutes.map((route, idx) => {
                            const isSelectedLookup = lookupResult.route && lookupResult.route.destination === route.destination && lookupResult.route.nextHop === route.nextHop;
                            return (
                              <tr
                                key={idx}
                                className={cn(
                                  "border-b last:border-0 transition-colors",
                                  isDark ? "border-secondary-800 hover:bg-secondary-800/40" : "border-secondary-200 hover:bg-secondary-100/50",
                                  isSelectedLookup && (isDark ? "bg-success-950/20 font-semibold" : "bg-success-50 font-semibold")
                                )}
                              >
                                <td className="p-3">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border",
                                    route.type === 'connected'
                                      ? "bg-success-500/10 text-success-500 border-success-500/20"
                                      : route.type === 'static'
                                      ? "bg-primary-500/10 text-primary-500 border-primary-500/20"
                                      : "bg-warning-500/10 text-warning-500 border-warning-500/20"
                                  )}>
                                    {route.type === 'connected' ? (language === 'tr' ? 'Bağlı' : 'Connected') : route.type}
                                  </span>
                                </td>
                                <td className="p-3 font-mono">
                                  {route.destination}
                                  {route.subnetMask ? `/${route.subnetMask}` : route.prefixLength ? `/${route.prefixLength}` : ''}
                                </td>
                                <td className="p-3 text-muted-foreground font-mono">
                                  {route.type === 'connected' ? '0/0' : `[${route.metric ?? 1}/0]`}
                                </td>
                                <td className="p-3 font-semibold font-mono">
                                  {route.nextHop}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-muted-foreground italic">
                              {language === 'tr' ? 'Kayıtlı rota bulunamadı.' : 'No routes found.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DraggableWindowWrapper>
  );
}
