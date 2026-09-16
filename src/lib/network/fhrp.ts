import { SwitchState } from './types';
import { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { useAppStore } from '@/lib/store/appStore';

export function getHsrpVirtualMac(groupId: number, version: number = 1): string {
  const hexGroup = groupId.toString(16).padStart(2, '0');
  if (version === 2) {
    const hexGroup3 = groupId.toString(16).padStart(3, '0');
    return `0000.0c9f.f${hexGroup3}`;
  }
  return `0000.0c07.ac${hexGroup}`;
}

export function getVrrpVirtualMac(groupId: number): string {
  const hexGroup = groupId.toString(16).padStart(2, '0');
  return `0000.5e00.01${hexGroup}`;
}

// Helper to compare IP addresses numerically
function compareIps(ip1?: string, ip2?: string): number {
  if (!ip1 && !ip2) return 0;
  if (!ip1) return -1;
  if (!ip2) return 1;
  const parts1 = ip1.split('.').map(Number);
  const parts2 = ip2.split('.').map(Number);
  for (let i = 0; i < 4; i++) {
    const val1 = parts1[i] ?? 0;
    const val2 = parts2[i] ?? 0;
    if (val1 !== val2) {
      return val1 - val2;
    }
  }
  return 0;
}

interface HInterface {
  deviceId: string;
  portId: string;
  virtualIp: string;
  groupId: number;
  priority: number;
  preempt: boolean;
  physicalIp?: string;
  isOnline: boolean;
}

export function getGlbpVirtualMac(groupId: number, forwarderId: number = 1): string {
  const hexGroup = groupId.toString(16).padStart(2, '0');
  const hexForwarder = forwarderId.toString(16).padStart(2, '0');
  return `0007.b400.${hexGroup}${hexForwarder}`;
}

export function runFhrpElection(deviceStates: Map<string, SwitchState>): Map<string, SwitchState> {
  const nextStates = new Map<string, SwitchState>();
  // Initialize nextStates with copies of all current states
  deviceStates.forEach((state, id) => {
    nextStates.set(id, {
      ...state,
      ports: { ...state.ports }
    });
  });

  const devices: CanvasDevice[] = useAppStore.getState().topology.devices || [];

  // Gather all HSRP / VRRP / GLBP groups
  const hsrpInterfaces: HInterface[] = [];
  const vrrpInterfaces: HInterface[] = [];
  const glbpInterfaces: HInterface[] = [];

  nextStates.forEach((state, deviceId) => {
    const device = devices.find(d => d.id === deviceId);
    const isOnline = device ? device.status !== 'offline' : true;

    Object.entries(state.ports || {}).forEach(([portId, port]) => {
      if (port.hsrp?.groups) {
        Object.entries(port.hsrp.groups).forEach(([gIdStr, groupConfig]) => {
          const groupId = parseInt(gIdStr, 10);
          const virtualIp = groupConfig.virtualIp || groupConfig.ipv6VirtualIp;
          if (virtualIp) {
            hsrpInterfaces.push({
              deviceId,
              portId,
              virtualIp,
              groupId,
              priority: groupConfig.priority ?? 100,
              preempt: !!groupConfig.preempt,
              physicalIp: port.ipAddress || port.ipv6Address,
              isOnline: isOnline && !port.shutdown
            });
          }
        });
      }

      if (port.vrrp?.groups) {
        Object.entries(port.vrrp.groups).forEach(([gIdStr, groupConfig]) => {
          const groupId = parseInt(gIdStr, 10);
          const virtualIp = groupConfig.virtualIp;
          if (virtualIp) {
            vrrpInterfaces.push({
              deviceId,
              portId,
              virtualIp,
              groupId,
              priority: groupConfig.priority ?? 100,
              preempt: groupConfig.preempt ?? true,
              physicalIp: port.ipAddress || port.ipv6Address,
              isOnline: isOnline && !port.shutdown
            });
          }
        });
      }

      if (port.glbp?.groups) {
        Object.entries(port.glbp.groups).forEach(([gIdStr, groupConfig]) => {
          const groupId = parseInt(gIdStr, 10);
          const virtualIp = groupConfig.virtualIp;
          if (virtualIp) {
            glbpInterfaces.push({
              deviceId,
              portId,
              virtualIp,
              groupId,
              priority: groupConfig.priority ?? 100,
              preempt: groupConfig.preempt ?? true,
              physicalIp: port.ipAddress || port.ipv6Address,
              isOnline: isOnline && !port.shutdown
            });
          }
        });
      }
    });
  });

  // Group by (groupId, virtualIp)
  const groupedHsrp = new Map<string, HInterface[]>();
  hsrpInterfaces.forEach(inter => {
    const key = `${inter.groupId}-${inter.virtualIp}`;
    const list = groupedHsrp.get(key) || [];
    list.push(inter);
    groupedHsrp.set(key, list);
  });

  // Run election for each HSRP group
  groupedHsrp.forEach((interfaces) => {
    const online = interfaces.filter(i => i.isOnline);
    const offline = interfaces.filter(i => !i.isOnline);

    offline.forEach(inter => {
      const state = nextStates.get(inter.deviceId);
      if (state) {
        const port = state.ports[inter.portId];
        if (port?.hsrp?.groups?.[inter.groupId]) {
          port.hsrp.groups[inter.groupId] = {
            ...port.hsrp.groups[inter.groupId],
            state: 'Initial'
          };
        }
      }
    });

    if (online.length === 0) return;

    online.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return compareIps(b.physicalIp, a.physicalIp);
    });

    online.forEach((inter, index) => {
      const state = nextStates.get(inter.deviceId);
      if (state) {
        const port = state.ports[inter.portId];
        if (port?.hsrp?.groups?.[inter.groupId]) {
          let roleState: 'Active' | 'Standby' | 'Listen' = 'Listen';
          if (index === 0) {
            roleState = 'Active';
          } else if (index === 1) {
            roleState = 'Standby';
          }

          const groupConf = port.hsrp.groups[inter.groupId];
          const virtualMac = getHsrpVirtualMac(inter.groupId, groupConf.version || 1);
          port.hsrp.groups[inter.groupId] = {
            ...groupConf,
            state: roleState,
            virtualMac
          };
        }
      }
    });
  });

  // Group and election for VRRP
  const groupedVrrp = new Map<string, HInterface[]>();
  vrrpInterfaces.forEach(inter => {
    const key = `${inter.groupId}-${inter.virtualIp}`;
    const list = groupedVrrp.get(key) || [];
    list.push(inter);
    groupedVrrp.set(key, list);
  });

  groupedVrrp.forEach((interfaces) => {
    const online = interfaces.filter(i => i.isOnline);
    const offline = interfaces.filter(i => !i.isOnline);

    offline.forEach(inter => {
      const state = nextStates.get(inter.deviceId);
      if (state) {
        const port = state.ports[inter.portId];
        if (port?.vrrp?.groups?.[inter.groupId]) {
          port.vrrp.groups[inter.groupId] = {
            ...port.vrrp.groups[inter.groupId],
            state: 'Init'
          };
        }
      }
    });

    if (online.length === 0) return;

    online.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return compareIps(b.physicalIp, a.physicalIp);
    });

    online.forEach((inter, index) => {
      const state = nextStates.get(inter.deviceId);
      if (state) {
        const port = state.ports[inter.portId];
        if (port?.vrrp?.groups?.[inter.groupId]) {
          const roleState = index === 0 ? 'Master' : 'Backup';
          const groupConf = port.vrrp.groups[inter.groupId];
          const virtualMac = getVrrpVirtualMac(inter.groupId);
          port.vrrp.groups[inter.groupId] = {
            ...groupConf,
            state: roleState,
            virtualMac
          };
        }
      }
    });
  });

  // Group and election for GLBP (Active Virtual Gateway & Active Virtual Forwarders)
  const groupedGlbp = new Map<string, HInterface[]>();
  glbpInterfaces.forEach(inter => {
    const key = `${inter.groupId}-${inter.virtualIp}`;
    const list = groupedGlbp.get(key) || [];
    list.push(inter);
    groupedGlbp.set(key, list);
  });

  groupedGlbp.forEach((interfaces) => {
    const online = interfaces.filter(i => i.isOnline);
    const offline = interfaces.filter(i => !i.isOnline);

    offline.forEach(inter => {
      const state = nextStates.get(inter.deviceId);
      if (state) {
        const port = state.ports[inter.portId];
        if (port?.glbp?.groups?.[inter.groupId]) {
          port.glbp.groups[inter.groupId] = {
            ...port.glbp.groups[inter.groupId],
            state: 'Listen'
          };
        }
      }
    });

    if (online.length === 0) return;

    online.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return compareIps(b.physicalIp, a.physicalIp);
    });

    online.forEach((inter, index) => {
      const state = nextStates.get(inter.deviceId);
      if (state) {
        const port = state.ports[inter.portId];
        if (port?.glbp?.groups?.[inter.groupId]) {
          const roleState = index === 0 ? 'Active' : (index === 1 ? 'Standby' : 'Listen');
          const groupConf = port.glbp.groups[inter.groupId];
          const avgMac = getGlbpVirtualMac(inter.groupId, 1);

          // Assign AVF MACs to all online routers in group
          const avfMacs: Record<number, string> = {};
          online.forEach((_fInter, fIdx) => {
            avfMacs[fIdx + 1] = getGlbpVirtualMac(inter.groupId, fIdx + 1);
          });

          port.glbp.groups[inter.groupId] = {
            ...groupConf,
            state: roleState,
            avgMac,
            avfMacs
          };
        }
      }
    });
  });

  return nextStates;
}


