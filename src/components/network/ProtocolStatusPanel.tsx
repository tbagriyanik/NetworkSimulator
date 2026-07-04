'use client';

import { useMemo } from 'react';
import { SwitchState } from '@/lib/network/types';
import { CanvasDevice } from '@/components/network/networkTopology.types';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Activity, ShieldCheck, Share2, Layers } from 'lucide-react';

interface ProtocolStatusPanelProps {
  devices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  isDark: boolean;
}

export function ProtocolStatusPanel({ devices, deviceStates, isDark }: ProtocolStatusPanelProps) {
  const { language } = useLanguage();

  const stats = useMemo(() => {
    let ospfCount = 0;
    let ospfNeighbors = 0;
    let stpRootCount = 0;
    let stpBlockedPorts = 0;
    let hsrpActive = 0;
    let hsrpStandby = 0;
    let eigrpCount = 0;
    let eigrpNeighbors = 0;

    deviceStates.forEach((state, deviceId) => {
      // OSPF
      if (state.ospfAreas && Object.keys(state.ospfAreas).length > 0) {
        ospfCount++;
        // Count neighbors - simplified check based on state metadata if available
        // For now, look at dynamic routes or ospf neighbor info
        const neighbors = state.ospfNeighbors || [];
        ospfNeighbors += neighbors.length;
      }

      // STP
      Object.values(state.ports).forEach(port => {
        if (port.spanningTree?.role === 'root') {
          // This device has a root port, so it's not the root itself usually,
          // but let's count root bridges correctly.
        }
        if (port.spanningTree?.state === 'blocking' || port.spanningTree?.role === 'alternate') {
          stpBlockedPorts++;
        }
      });

      // Simplified root bridge detection: if any port is root role, this device is NOT root.
      const hasRootPort = Object.values(state.ports).some(p => p.spanningTree?.role === 'root');
      const isSwitch = devices.find(d => d.id === deviceId)?.type.startsWith('switch');
      if (isSwitch && !hasRootPort && Object.values(state.ports).some(p => p.spanningTree)) {
        stpRootCount++;
      }

      // HSRP
      Object.values(state.ports).forEach(port => {
        if (port.hsrp?.groups) {
          Object.values(port.hsrp.groups).forEach(group => {
            if (group.state === 'Active') hsrpActive++;
            if (group.state === 'Standby') hsrpStandby++;
          });
        }
      });

      // EIGRP
      if (state.eigrpAs) {
        eigrpCount++;
        eigrpNeighbors += (state.eigrpNeighbors || []).length;
      }
    });

    return {
      ospf: { count: ospfCount, neighbors: ospfNeighbors },
      stp: { roots: stpRootCount, blocked: stpBlockedPorts },
      hsrp: { active: hsrpActive, standby: hsrpStandby },
      eigrp: { count: eigrpCount, neighbors: eigrpNeighbors }
    };
  }, [deviceStates, devices]);

  const items = [
    {
      id: 'ospf',
      label: 'OSPF',
      icon: <Activity className="w-3 h-3" />,
      status: stats.ospf.count > 0 ? (stats.ospf.neighbors > 0 ? 'success' : 'warning') : 'idle',
      value: language === 'tr'
        ? `${stats.ospf.neighbors} komşu`
        : `${stats.ospf.neighbors} neighbors`
    },
    {
      id: 'stp',
      label: 'STP',
      icon: <ShieldCheck className="w-3 h-3" />,
      status: stats.stp.roots > 0 ? 'success' : 'idle',
      value: language === 'tr'
        ? `${stats.stp.roots} Root, ${stats.stp.blocked} bloklu`
        : `${stats.stp.roots} Root, ${stats.stp.blocked} blocked`
    },
    {
      id: 'hsrp',
      label: 'HSRP',
      icon: <Layers className="w-3 h-3" />,
      status: stats.hsrp.active > 0 ? 'success' : 'idle',
      value: language === 'tr'
        ? `A: ${stats.hsrp.active}, S: ${stats.hsrp.standby}`
        : `A: ${stats.hsrp.active}, S: ${stats.hsrp.standby}`
    },
    {
      id: 'eigrp',
      label: 'EIGRP',
      icon: <Share2 className="w-3 h-3" />,
      status: stats.eigrp.count > 0 ? (stats.eigrp.neighbors > 0 ? 'success' : 'error') : 'idle',
      value: language === 'tr'
        ? `${stats.eigrp.neighbors} komşu`
        : `${stats.eigrp.neighbors} neighbors`
    }
  ];

  return (
    <div className={cn(
      "flex flex-col gap-1 p-2 rounded-lg border shadow-lg backdrop-blur-md",
      isDark ? "bg-secondary-900/80 border-secondary-800" : "bg-white/80 border-secondary-200"
    )}>
      <div className="text-[10px] font-black tracking-widest opacity-50 uppercase mb-1">
        {language === 'tr' ? 'PROTOKOL DURUMU' : 'PROTOCOL STATUS'}
      </div>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "p-1 rounded-sm",
                item.status === 'success' ? "bg-success-500/20 text-success-500" :
                item.status === 'warning' ? "bg-warning-500/20 text-warning-500" :
                item.status === 'error' ? "bg-error-500/20 text-error-500" :
                "bg-secondary-500/20 text-secondary-500"
              )}>
                {item.icon}
              </div>
              <span className="text-[11px] font-bold">{item.label}</span>
            </div>
            <span className={cn(
              "text-[10px] font-medium",
              isDark ? "text-secondary-400" : "text-secondary-500"
            )}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
