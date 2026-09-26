import React from 'react';
import { Globe, Network, Activity, ChevronUp, ChevronDown, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn, normalizeMAC } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import type { SwitchState, Port } from '@/lib/network/types';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import type { Translations } from '@/contexts/LanguageContext';

interface RouterOverviewTabProps {
  routerDevice: CanvasDevice;
  routerState?: SwitchState;
  deviceId: string;
  ports: Port[];
  interfacesWithIP: Array<{ id: string; ip: string; subnet: string; status: string }>;
  collapsedSections: Record<string, boolean>;
  setCollapsedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isDark: boolean;
  t: Translations;
}

export function RouterOverviewTab({
  routerDevice,
  routerState,
  deviceId,
  ports,
  interfacesWithIP,
  collapsedSections,
  setCollapsedSections,
  isDark,
  t,
}: RouterOverviewTabProps) {
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

  return (
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
          </CollapsibleContent>
        </Collapsible>
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
  );
}
