import { useState } from 'react';
import { Layers, Network, Search, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoutingTable } from '@/lib/network/routing';
import type { DeviceType, CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import dynamic from 'next/dynamic';

const RouterDhcpSection = dynamic(() => import('../RouterDhcpSection').then(m => m.RouterDhcpSection), { ssr: false });

interface UnifiedStpTabProps {
  deviceId: string;
  deviceType: DeviceType;
  deviceStates: Map<string, SwitchState>;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  isDark: boolean;
  language: string;
  handleCommand: (command: string) => Promise<unknown>;
  setIsAutomationWindowOpen: (open: boolean) => void;
}

export function UnifiedStpTab({
  deviceId,
  deviceType,
  deviceStates,
  topologyDevices,
  topologyConnections,
  isDark,
  language,
  handleCommand,
  setIsAutomationWindowOpen,
}: UnifiedStpTabProps) {
  const [selectedVlan, setSelectedVlan] = useState(1);
  const [routeSearch, setRouteSearch] = useState('');

  if (deviceType === 'router') {
    const routingTable = getRoutingTable(deviceId, deviceStates, topologyDevices, topologyConnections);
    const filteredRoutes = routeSearch.trim()
      ? routingTable.filter(r =>
        r.destination.toLowerCase().includes(routeSearch.toLowerCase()) ||
        (r.subnetMask && r.subnetMask.toLowerCase().includes(routeSearch.toLowerCase())) ||
        (r.prefixLength !== undefined && String(r.prefixLength).includes(routeSearch.toLowerCase())) ||
        r.nextHop.toLowerCase().includes(routeSearch.toLowerCase()) ||
        r.type.toLowerCase().includes(routeSearch.toLowerCase())
      )
      : routingTable;

    const routerState = deviceStates.get(deviceId) || ({} as SwitchState);

    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <Network className="w-4 h-4 text-primary" />
              {language === 'tr' ? 'YÃ¶nlendirme Tablosu' : 'Routing Table'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === 'tr' ? 'CihazÄ±n aktif IP rotalarÄ± ve aÄŸ yÃ¶nlendirme bilgileri.' : 'Active IP routes and network forwarding table for this router.'}
            </p>
          </div>
        </div>

        <div className={cn("rounded-lg border overflow-hidden", isDark ? "bg-secondary-900 border-secondary-800/80" : "bg-secondary-50 border-secondary-200")}>
          <div className="p-3 border-b border-secondary-200 dark:border-secondary-800/80 flex items-center justify-between gap-3 bg-secondary-100/30 dark:bg-secondary-950/10">
            <h3 className="font-semibold text-xs flex items-center gap-2 shrink-0">
              <Network className="w-4 h-4 text-primary" />
              {language === 'tr' ? 'Toplam Rota' : 'Total Routes'} ({filteredRoutes.length})
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

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-xs text-left">
              <thead className={cn("border-b text-[10px] uppercase tracking-wider font-semibold sticky top-0 z-10", isDark ? "bg-secondary-950 border-secondary-800 text-secondary-400" : "bg-secondary-100 border-secondary-200 text-secondary-600")}>
                <tr>
                  <th className="p-3 w-24">{language === 'tr' ? 'Tip' : 'Type'}</th>
                  <th className="p-3">{language === 'tr' ? 'Hedef AÄŸ' : 'Destination Network'}</th>
                  <th className="p-3 w-32">{language === 'tr' ? 'Metrik [AD/Metrik]' : 'Metric [AD/Metric]'}</th>
                  <th className="p-3">{language === 'tr' ? 'Sonraki Hop / ArayÃ¼z' : 'Next Hop / Interface'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.length > 0 ? (
                  filteredRoutes.map((route, idx) => (
                    <tr
                      key={`route-${route.type}-${route.destination}-${route.nextHop || route.interfaceId || idx}`}
                      className={cn(
                        "border-b last:border-0 transition-colors",
                        isDark ? "border-secondary-800 hover:bg-secondary-800/40" : "border-secondary-200 hover:bg-secondary-100/50"
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
                          {route.type === 'connected' ? (language === 'tr' ? 'BaÄŸlÄ±' : 'Connected') : route.type}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground italic">
                      {language === 'tr' ? 'KayÄ±tlÄ± rota bulunamadÄ±.' : 'No routes found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <RouterDhcpSection
          state={routerState}
          isDark={isDark}
          language={language}
          onRefresh={() => handleCommand('show ip dhcp binding')}
        />

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <Code className="w-4 h-4 text-emerald-400" />
              <span>{language === 'tr' ? 'NetDevOps & RESTCONF Otomasyonu' : 'NetDevOps & RESTCONF Automation'}</span>
            </div>
            <button
              onClick={() => setIsAutomationWindowOpen(true)}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Code className="w-3.5 h-3.5" />
              <span>{language === 'tr' ? 'AyrÄ± Pencerede AÃ§' : 'Open in Window'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const deviceState = deviceStates.get(deviceId);
  const stpStateMap = deviceState?.stpState || {};
  const vlanIds = Object.keys(stpStateMap).map(Number).sort((a, b) => a - b);
  const currentVlan = vlanIds.includes(selectedVlan) ? selectedVlan : (vlanIds[0] || 1);
  const stpVlanState = stpStateMap[currentVlan];

  if (!stpVlanState) {
    return (
      <div className="p-4 sm:p-6">
        <div className={cn("p-8 rounded-lg border text-center", isDark ? "bg-secondary-800 border-secondary-700" : "bg-secondary-50 border-secondary-200")}>
          <Layers className="w-12 h-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground text-sm font-medium">
            {language === 'tr' ? 'Bu cihazda STP aktif deÄŸil veya henÃ¼z baÅŸlatÄ±lmadÄ±. AÄŸÄ± yenileyiniz. (F5 kÄ±sayolu)' : 'STP is not active or has not initialized on this device. Refresh the network. (F5 shortcut)'}
          </p>
        </div>
      </div>
    );
  }

  const localBridgePriority = stpVlanState.bridgeId.split('.')[0];
  const localBridgeMac = stpVlanState.bridgeId.split('.').slice(1).join('.');

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
            <Layers className="w-4 h-4 text-warning-500" />
            {language === 'tr' ? 'Spanning Tree ProtokolÃ¼' : 'Spanning Tree Protocol'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === 'tr' ? 'CihazÄ±n ve portlarÄ±n Spanning Tree durumlarÄ±nÄ± inceleyin.' : 'Inspect Spanning Tree states of the device and its ports.'}
          </p>
        </div>
        {vlanIds.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">VLAN:</span>
            <select
              value={currentVlan}
              onChange={(e) => setSelectedVlan(Number(e.target.value))}
              className={cn(
                "px-2 py-1 rounded text-xs border outline-none",
                isDark ? "bg-secondary-900 border-secondary-800 text-white" : "bg-white border-secondary-300 text-secondary-900"
              )}
            >
              {vlanIds.map(vid => (
                <option key={vid} value={vid}>VLAN {vid}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={cn(
        "p-4 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between gap-4",
        stpVlanState.isRoot
          ? (isDark ? "bg-warning-950/20 border-warning-500/30 text-warning-200" : "bg-warning-50/70 border-warning-200 text-warning-800")
          : (isDark ? "bg-secondary-900 border-secondary-800/80" : "bg-secondary-50 border-secondary-200")
      )}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            {stpVlanState.isRoot ? (
              <>
                <span className="text-lg">ğŸ‘‘</span>
                <span>{language === 'tr' ? 'Cihaz KÃ¶k KÃ¶prÃ¼ (Root Bridge) Durumunda' : 'This Switch is the Root Bridge'}</span>
              </>
            ) : (
              <span>{language === 'tr' ? 'KÃ¶k KÃ¶prÃ¼ Bilgisi' : 'Root Bridge Information'}</span>
            )}
          </div>
          <p className="text-xs opacity-80 font-mono">
            Root Bridge ID: <span className="font-semibold">{stpVlanState.rootBridgeId}</span>
          </p>
          {!stpVlanState.isRoot && (
            <p className="text-xs opacity-80 font-mono">
              Root Path Cost: <span className="font-semibold text-primary">{stpVlanState.rootCost}</span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-6 border-secondary-700/30">
          <div>
            <span className="opacity-60">{language === 'tr' ? 'KÃ¶prÃ¼ Ã–nceliÄŸi:' : 'Bridge Priority:'}</span>
            <p className="font-semibold">{localBridgePriority}</p>
          </div>
          <div>
            <span className="opacity-60">Bridge MAC:</span>
            <p className="font-semibold text-xs leading-none mt-1">{localBridgeMac}</p>
          </div>
        </div>
      </div>

      <div className={cn("rounded-lg border overflow-hidden", isDark ? "bg-secondary-900 border-secondary-800/80" : "bg-secondary-50 border-secondary-200")}>
        <div className="px-4 py-2.5 border-b border-secondary-800/80 bg-secondary-100/20 dark:bg-secondary-950/10">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {language === 'tr' ? 'Port Rol ve DurumlarÄ±' : 'Port Roles and States'}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className={cn("border-b text-[10px] uppercase tracking-wider font-semibold", isDark ? "bg-secondary-950 border-secondary-800 text-secondary-400" : "bg-secondary-100 border-secondary-200 text-secondary-600")}>
              <tr>
                <th className="p-3">{language === 'tr' ? 'ArayÃ¼z' : 'Interface'}</th>
                <th className="p-3">{language === 'tr' ? 'Rol' : 'Role'}</th>
                <th className="p-3">{language === 'tr' ? 'Durum' : 'State'}</th>
                <th className="p-3">{language === 'tr' ? 'Maliyet' : 'Cost'}</th>
                <th className="p-3">{language === 'tr' ? 'Ã–ncelik' : 'Priority'}</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(stpVlanState.ports).length > 0 ? (
                Object.entries(stpVlanState.ports).map(([portName, portStp]) => {
                  const role = portStp.role;
                  const state = portStp.state;

                  const roleLabels: Record<string, string> = language === 'tr' ? {
                    root: 'KÃ¶k Port (RP)',
                    designated: 'AtanmÄ±ÅŸ Port (DP)',
                    alternate: 'Alternatif Port (AP)',
                    backup: 'Yedek Port (BP)',
                    disabled: 'Devre DÄ±ÅŸÄ±'
                  } : {
                    root: 'Root Port (RP)',
                    designated: 'Designated Port (DP)',
                    alternate: 'Alternate Port (AP)',
                    backup: 'Backup Port (BP)',
                    disabled: 'Disabled'
                  };

                  const stateLabels: Record<string, string> = language === 'tr' ? {
                    forwarding: 'Ä°letiyor (FWD)',
                    blocking: 'Engelliyor (BLK)',
                    learning: 'Ã–ÄŸreniyor (LRN)',
                    listening: 'Dinliyor (LIS)',
                    disabled: 'Devre DÄ±ÅŸÄ±'
                  } : {
                    forwarding: 'Forwarding (FWD)',
                    blocking: 'Blocking (BLK)',
                    learning: 'Learning (LRN)',
                    listening: 'Listening (LIS)',
                    disabled: 'Disabled'
                  };

                  return (
                    <tr key={portName} className={cn("border-b last:border-0 hover:bg-secondary-800/10 dark:hover:bg-secondary-800/30", isDark ? "border-secondary-800" : "border-secondary-200")}>
                      <td className="p-3 font-semibold font-mono">{portName}</td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                          role === 'root'
                            ? "bg-primary-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                            : role === 'designated'
                              ? "bg-success-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : role === 'alternate'
                                ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                                : "bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 border-secondary-500/20"
                        )}>
                          {roleLabels[role] || role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          state === 'forwarding'
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : state === 'blocking'
                              ? "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 animate-pulse"
                              : "bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 border border-secondary-500/20"
                        )}>
                          {stateLabels[state] || state}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{portStp.cost || 19}</td>
                      <td className="p-3 font-mono text-muted-foreground">128</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground italic">
                    {language === 'tr' ? 'STP takibi yapÄ±lan aktif port bulunmuyor.' : 'No ports tracked under STP.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
