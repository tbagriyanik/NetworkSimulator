'use client';

import { useState, useCallback } from 'react';
import type { DeviceType } from '@/components/network/networkTopology.types';

export interface RefreshDeviceSummary {
  id: string;
  name: string;
  type: DeviceType;
  ip: string;
  mac: string;
  gateway: string;
  ipv6: string;
  services: string;
}

export interface RefreshNetworkReport {
  show: boolean;
  title: string;
  dhcpMessages: string[];
  stpMessage: string;
  portSecurityMessage: string;
  topologyMessage: string;
  devices: RefreshDeviceSummary[];
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
