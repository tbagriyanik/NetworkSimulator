import React from 'react';
import { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { RefreshNetworkReport } from '@/hooks/useRefreshReport';

export interface LiveSummary {
  deviceCount: {
    total: number;
    routers: number;
    switches: number;
    pcs: number;
    iot: number;
    firewalls: number;
    wlcs: number;
  };
  activeLinks: number;
  vlanCount: number;
  routingTableSummary: {
    totalRoutes: number;
    connected: number;
    static: number;
    dynamic: number;
  };
  protocolStats: {
    ospf: { count: number; neighbors: number };
    stp: { roots: number; blocked: number };
    hsrp: { active: number; standby: number };
    eigrp: { count: number; neighbors: number };
  };
}

export interface RefreshReportPanelProps {
  refreshNetworkReport: RefreshNetworkReport | null;
  setRefreshNetworkReport: React.Dispatch<React.SetStateAction<RefreshNetworkReport | null>>;
  refreshReportRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  isDark: boolean;
  focusedOverlay: string;
  setFocusedOverlay: (overlay: 'refresh' | 'packet' | 'pc-info' | 'router-info' | 'switch-info') => void;
  language: 'tr' | 'en';
  t: Record<string, string>;
  handleRefreshNetwork: () => void;
  liveSummary: LiveSummary | null;
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  bringElementToFront: (el: HTMLElement) => void;
  isExamActive?: boolean;
}


