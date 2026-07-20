import { SwitchState } from '@/lib/network/types';
import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

export function computeLiveSummary(
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  states: Map<string, SwitchState>
) {
  if (!devices || !states) return null;
  const allVlans = new Set<number>();
  let totalRoutes = 0, connectedRoutes = 0, staticRoutes = 0, dynamicRoutes = 0;
  let ospfCount = 0, ospfNeighbors = 0;
  let stpRootCount = 0, stpBlockedPorts = 0;
  let hsrpActive = 0, hsrpStandby = 0;
  let eigrpCount = 0, eigrpNeighbors = 0;
  states.forEach((state, deviceId) => {
    if (state.vlans) Object.keys(state.vlans).forEach((vId) => allVlans.add(Number(vId)));
    [state.staticRoutes, state.dynamicRoutes].forEach((routes) => {
      if (!routes) return;
      routes.forEach((r) => {
        totalRoutes++;
        if (r.type === 'connected') connectedRoutes++;
        else if (r.type === 'static') staticRoutes++;
        else if (r.type === 'dynamic') dynamicRoutes++;
      });
    });
    if (state.ospfAreas && state.ospfAreas.length > 0) {
      ospfCount++;
      ospfNeighbors += (state.ospfNeighbors || []).length;
    }
    Object.values(state.ports).forEach(port => {
      if (port.spanningTree?.state === 'blocking' || port.spanningTree?.role === 'alternate') {
        stpBlockedPorts++;
      }
    });
    const hasRootPort = Object.values(state.ports).some(p => p.spanningTree?.role === 'root');
    const device = devices.find(d => d.id === deviceId);
    const isSwitch = device ? device.type.startsWith('switch') : false;
    if (isSwitch && !hasRootPort && Object.values(state.ports).some(p => p.spanningTree)) {
      stpRootCount++;
    }
    Object.values(state.ports).forEach(port => {
      const groups = port.hsrp?.groups;
      if (groups) {
        Object.values(groups).forEach(group => {
          if (group.state === 'Active') hsrpActive++;
          if (group.state === 'Standby') hsrpStandby++;
        });
      }
    });
    if (state.eigrpAs) {
      eigrpCount++;
      eigrpNeighbors += (state.eigrpNeighbors || []).length;
    }
  });
  return {
    deviceCount: {
      total: devices.length,
      routers: devices.filter((d) => d.type === 'router').length,
      switches: devices.filter((d) => d.type === 'switchL2' || d.type === 'switchL3').length,
      pcs: devices.filter((d) => d.type === 'pc').length,
      iot: devices.filter((d) => d.type === 'iot').length,
      firewalls: devices.filter((d) => d.type === 'firewall').length,
      wlcs: devices.filter((d) => d.type === 'wlc').length,
    },
    activeLinks: connections.filter((c) => c.active).length,
    vlanCount: allVlans.size,
    routingTableSummary: { totalRoutes, connected: connectedRoutes, static: staticRoutes, dynamic: dynamicRoutes },
    protocolStats: {
      ospf: { count: ospfCount, neighbors: ospfNeighbors },
      stp: { roots: stpRootCount, blocked: stpBlockedPorts },
      hsrp: { active: hsrpActive, standby: hsrpStandby },
      eigrp: { count: eigrpCount, neighbors: eigrpNeighbors }
    },
  };
}
