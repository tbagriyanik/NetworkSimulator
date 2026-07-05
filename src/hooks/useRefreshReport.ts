'use client';

import { useState, useCallback } from 'react';
import type { DeviceType } from '@/components/network/networkTopology.types';

interface RefreshDeviceSummary {
  id: string;
  name: string;
  type: DeviceType;
  ip: string;
  mac: string;
  gateway: string;
  ipv6: string;
  services: string;
}

interface NetworkSummary {
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
  networkWarnings: string[];
}

export interface RefreshNetworkReport {
  show: boolean;
  title: string;
  dhcpMessages: string[];
  stpMessage: string;
  portSecurityMessage: string;
  topologyMessage: string;
  devices: RefreshDeviceSummary[];
  summary: NetworkSummary;
}

export function useRefreshReport() {
  const [refreshNetworkReport, setRefreshNetworkReport] = useState<RefreshNetworkReport | null>(null);

  const clearRefreshReport = useCallback(() => {
    setRefreshNetworkReport(null);
  }, []);

  return {
    refreshNetworkReport,
    setRefreshNetworkReport,
    clearRefreshReport,
  };
}
