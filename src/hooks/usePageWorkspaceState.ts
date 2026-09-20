'use client';

import { useAppStore, useTopologyConnections, useTopologyDevices, useTopologyNotes, useZoom, usePan, useActiveTab, useEnvironment } from '@/lib/store/appStore';

/** Keeps workspace store selectors out of the page orchestration hook. */
export function usePageWorkspaceState() {
  return {
    topologyDevices: useTopologyDevices(), topologyConnections: useTopologyConnections(), topologyNotes: useTopologyNotes(),
    zoom: useZoom(), pan: usePan(), activeTab: useActiveTab(), environment: useEnvironment(),
    helpLevel: useAppStore((state) => state.helpLevel), setHelpLevel: useAppStore((state) => state.setHelpLevel),
    setDevices: useAppStore((state) => state.setDevices), setConnections: useAppStore((state) => state.setConnections), setNotes: useAppStore((state) => state.setNotes),
    setZoom: useAppStore((state) => state.setZoom), setPan: useAppStore((state) => state.setPan),
    graphicsQuality: useAppStore((state) => state.graphicsQuality), setGraphicsQuality: useAppStore((state) => state.setGraphicsQuality),
  };
}
