import { useEffect } from 'react';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { isSwitchDeviceType } from '@/app/refreshNetworkUtils';
import type { TabType } from '@/app/page.types';
import { recalculateStp } from '@/lib/network/stp';

interface UseNetworkEventListenersParams {
  setDeviceStates: React.Dispatch<React.SetStateAction<Map<string, SwitchState>>>;
  deviceStates: Map<string, SwitchState>;
  activeTabRef: React.MutableRefObject<string>;
  setActiveTab: (tab: TabType) => void;
}

export function useNetworkEventListeners(params: UseNetworkEventListenersParams) {
  const { setDeviceStates, deviceStates, activeTabRef, setActiveTab } = params;

  useEffect(() => {
    const handleVtpPropagation = (e: Event) => {
      const customEvent = e as CustomEvent<{
        deviceId: string;
        topologyDevices: CanvasDevice[];
        topologyConnections: CanvasConnection[];
        deviceStates: Map<string, SwitchState>;
      }>;
      const { topologyDevices: eventDevices, topologyConnections: eventConnections, deviceStates: eventStates } = customEvent.detail;

      if (!eventDevices || !eventConnections || !eventStates) return;

      const byId = new Map(eventDevices.map((d: CanvasDevice) => [d.id, d]));
      const nextStates = new Map(eventStates);

      for (const conn of eventConnections) {
        if (!conn.active) continue;
        const a = byId.get(conn.sourceDeviceId);
        const b = byId.get(conn.targetDeviceId);
        if (!a || !b) continue;
        if (!isSwitchDeviceType(a.type) || !isSwitchDeviceType(b.type)) continue;

        const aState = nextStates.get(a.id);
        const bState = nextStates.get(b.id);
        if (!aState || !bState) continue;

        const aPort = aState.ports?.[conn.sourcePort];
        const bPort = bState.ports?.[conn.targetPort];
        const aIsTrunk = !!aPort && !aPort.shutdown && aPort.mode === 'trunk';
        const bIsTrunk = !!bPort && !bPort.shutdown && bPort.mode === 'trunk';
        if (!aIsTrunk || !bIsTrunk) continue;

        const aMode = aState.vtpMode || 'server';
        const bMode = bState.vtpMode || 'server';
        const aDomain = (aState.vtpDomain || '').trim();
        const bDomain = (bState.vtpDomain || '').trim();
        if (!aDomain || !bDomain) continue;
        if (aDomain !== bDomain) continue;

        const aRev = aState.vtpRevision || 0;
        const bRev = bState.vtpRevision || 0;

        if (aMode === 'server' && bMode === 'client' && aRev >= bRev) {
          nextStates.set(b.id, { ...bState, vlans: { ...(aState.vlans || {}) }, vtpRevision: aRev });
        } else if (bMode === 'server' && aMode === 'client' && bRev >= aRev) {
          nextStates.set(a.id, { ...aState, vlans: { ...(bState.vlans || {}) }, vtpRevision: bRev });
        }
      }

      setDeviceStates(nextStates);
    };
    window.addEventListener('vtp-propagation-needed', handleVtpPropagation);

    const handleSTPRecalculation = (event: Event) => {
      const { topologyConnections: updatedConnections } = (event as CustomEvent).detail;
      if (updatedConnections) {
        const allUpdatedStates = recalculateStp(deviceStates, updatedConnections);
        setDeviceStates(allUpdatedStates);
      }
    };
    window.addEventListener('stp-recalculation-needed', handleSTPRecalculation as EventListener);

    const handleBeforePrint = () => {
      if (activeTabRef.current !== 'topology') {
        setActiveTab('topology');
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      window.removeEventListener('vtp-propagation-needed', handleVtpPropagation);
      window.removeEventListener('stp-recalculation-needed', handleSTPRecalculation);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [setDeviceStates, deviceStates, activeTabRef, setActiveTab]);
}
