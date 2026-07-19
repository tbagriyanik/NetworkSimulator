import type { ProjectState } from '@/hooks/useHistory';

export function serializeState(s: ProjectState) {
  return JSON.stringify({
    t: s.topologyDevices,
    c: s.topologyConnections,
    n: s.topologyNotes,
    s: Array.from(s.deviceStates.entries()),
    o: Array.from(s.deviceOutputs.entries()),
    p: Array.from(s.pcOutputs.entries()),
    id: s.activeDeviceId,
    tab: s.activeTab,
  });
}
