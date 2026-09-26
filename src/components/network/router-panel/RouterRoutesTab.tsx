import { useState } from 'react';
import { Compass, Network, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { findRoute, Route } from '@/lib/network/routing';
import type { SwitchState } from '@/lib/network/types';
import type { Translations } from '@/contexts/LanguageContext';

interface RouterRoutesTabProps {
  routerState?: SwitchState;
  routingTable: Route[];
  filteredRoutes: Route[];
  routeSearch: string;
  setRouteSearch: (search: string) => void;
  isDark: boolean;
  language: string;
  t: Translations;
}

export function RouterRoutesTab({
  routerState,
  routingTable,
  filteredRoutes,
  routeSearch,
  setRouteSearch,
  isDark,
  language,
  t,
}: RouterRoutesTabProps) {
  const [lookupIp, setLookupIp] = useState('');
  const [lookupResult, setLookupResult] = useState<{
    route: Route | null;
    explanation: string;
    searched: boolean;
  }>({ route: null, explanation: '', searched: false });

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
        explanation: language === 'tr' ? 'GeÃ§ersiz IP adresi formatÄ±.' : 'Invalid IP address format.',
        searched: true
      });
      return;
    }

    const matchedRoute = findRoute(lookupIp.trim(), routingTable);
    if (matchedRoute) {
      let desc = '';
      if (matchedRoute.type === 'connected') {
        desc = language === 'tr'
          ? `DoÄŸrudan baÄŸlÄ± aÄŸ eÅŸleÅŸmesi. Paket ${matchedRoute.nextHop} arayÃ¼zÃ¼ Ã¼zerinden doÄŸrudan iletilecek.`
          : `Directly connected network match. Packet will be forwarded directly via interface ${matchedRoute.nextHop}.`;
      } else if (matchedRoute.destination === '0.0.0.0' || matchedRoute.destination === '::') {
        desc = language === 'tr'
          ? `Ã–zel rota bulunamadÄ±. VarsayÄ±lan rota (Default Route) kullanÄ±lÄ±yor. Next Hop: ${matchedRoute.nextHop}.`
          : `No specific route found. Using Default Route. Next Hop: ${matchedRoute.nextHop}.`;
      } else {
        const protocol = matchedRoute.type === 'static' ? (language === 'tr' ? 'Statik' : 'Static') : matchedRoute.type.toUpperCase();
        desc = language === 'tr'
          ? `${protocol} yÃ¶nlendirme kuralÄ± eÅŸleÅŸti (En Uzun Ã–nek EÅŸleÅŸmesi). Hedefe gitmek iÃ§in paket ÅŸu Next Hop'a iletilecek: ${matchedRoute.nextHop}.`
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
          ? 'Hedef aÄŸ bulunamadÄ±. YÃ¶nlendirme tablosunda bu IP adresiyle eÅŸleÅŸen bir kural yok ve varsayÄ±lan aÄŸ geÃ§idi (0.0.0.0/0) yapÄ±landÄ±rÄ±lmamÄ±ÅŸ.'
          : 'Destination host unreachable. No matching route in the routing table, and no default gateway (0.0.0.0/0) is configured.',
        searched: true
      });
    }
  };

  return (
    <div id="routes-panel" role="tabpanel" className="space-y-4 animate-in fade-in duration-200">
      {routerState && !routerState.ipRouting && (
        <div className="p-3 rounded-lg border border-error-500/20 bg-error-500/10 text-error-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {language === 'tr'
              ? 'IP YÃ¶nlendirme kapalÄ±! Cihaz paket yÃ¶nlendirmesi yapamaz. CLI Ã¼zerinden "ip routing" komutunu Ã§alÄ±ÅŸtÄ±rarak aktif edebilirsiniz.'
              : 'IP Routing is disabled! This device cannot forward packets. You can enable it by running the "ip routing" command in CLI.'}
          </span>
        </div>
      )}

      {/* Route Lookup Visual Debugger */}
      <div className={cn("rounded-lg border p-4", isDark ? "bg-secondary-900 border-secondary-800/80" : "bg-secondary-50 border-secondary-200")}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-primary">
          <Compass className="w-4 h-4 text-purple-500" />
          {t.routeLookup}
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={lookupIp}
            onChange={(e) => setLookupIp(e.target.value)}
            placeholder={language === 'tr' ? 'Hedef IP Adresi (Ã¶rn: 192.168.1.5)' : 'Target IP Address (e.g. 192.168.1.5)'}
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
                  <span>{language === 'tr' ? 'Rota EÅŸleÅŸti!' : 'Route Matched!'}</span>
                  <span className="font-mono bg-success-500/10 px-1.5 py-0.5 rounded text-[10px]">
                    {lookupResult.route.destination}
                    {lookupResult.route.subnetMask ? `/${lookupResult.route.subnetMask}` : lookupResult.route.prefixLength ? `/${lookupResult.route.prefixLength}` : ''}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-error-500" />
                  <span>{language === 'tr' ? 'EÅŸleÅŸen Rota Yok!' : 'No Matching Route!'}</span>
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
                <th className="p-3">{language === 'tr' ? 'Hedef AÄŸ' : 'Destination Network'}</th>
                <th className="p-3 w-32">{language === 'tr' ? 'Metrik [AD/Metrik]' : 'Metric [AD/Metric]'}</th>
                <th className="p-3">{language === 'tr' ? 'Sonraki Hop / ArayÃ¼z' : 'Next Hop / Interface'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.length > 0 ? (
                filteredRoutes.map((route, idx) => {
                  const isSelectedLookup = lookupResult.route && lookupResult.route.destination === route.destination && lookupResult.route.nextHop === route.nextHop;
                  return (
                    <tr
                      key={`route-${route.type}-${route.destination}-${route.nextHop || route.interfaceId || idx}`}
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
                  );
                })
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
    </div>
  );
}
