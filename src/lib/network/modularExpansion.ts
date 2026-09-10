import type { CanvasDevice, CanvasPort, CanvasConnection } from '@/components/network/networkTopology.types';
import type { SwitchState, Port } from '@/lib/network/types';

export interface ExpansionModule {
  id: string; // e.g. 'WIC-2T'
  name: string;
  category: 'serial' | 'ethernet' | 'fiber' | 'sfp';
  description: string;
  descriptionTr: string;
  portsCount: number;
  badge: string;
  color: string;
  portGenerator: (slotIndex: number) => {
    canvasPorts: CanvasPort[];
    switchPorts: Port[];
  };
}

export interface DeviceSlotInfo {
  slotIndex: number;
  slotName: string;
  supportedModules: string[]; // Module IDs allowed in this slot
  installedModuleId?: string;
}

export const MODULE_CATALOG: Record<string, ExpansionModule> = {
  'WIC-2T': {
    id: 'WIC-2T',
    name: 'NetSim WIC-2T (2-Port Serial WAN)',
    category: 'serial',
    description: '2-port serial WAN interface card for synchronous leased lines, Frame Relay and HDLC.',
    descriptionTr: '2 portlu seri WAN arayüz kartı (Kiralık hatlar, HDLC ve Frame Relay bağlantıları için).',
    portsCount: 2,
    badge: 'Serial 2T',
    color: '#0284c7', // sky-600
    portGenerator: (slotIndex: number) => {
      const port1Id = `Serial0/${slotIndex}/0`;
      const port2Id = `Serial0/${slotIndex}/1`;

      const canvasPorts: CanvasPort[] = [
        {
          id: port1Id,
          label: `Se0/${slotIndex}/0`,
          status: 'disconnected',
          type: 'serial',
          adminStatus: 'down',
          operStatus: 'down',
          linkStatus: 'disconnected',
          shutdown: true,
          speed: '10',
          duplex: 'full',
        },
        {
          id: port2Id,
          label: `Se0/${slotIndex}/1`,
          status: 'disconnected',
          type: 'serial',
          adminStatus: 'down',
          operStatus: 'down',
          linkStatus: 'disconnected',
          shutdown: true,
          speed: '10',
          duplex: 'full',
        },
      ];

      const switchPorts: Port[] = [
        {
          id: port1Id,
          name: port1Id,
          status: 'disconnected',
          vlan: 1,
          mode: 'routed',
          duplex: 'full',
          speed: '10',
          shutdown: true,
          type: 'serial',
        },
        {
          id: port2Id,
          name: port2Id,
          status: 'disconnected',
          vlan: 1,
          mode: 'routed',
          duplex: 'full',
          speed: '10',
          shutdown: true,
          type: 'serial',
        },
      ];

      return { canvasPorts, switchPorts };
    },
  },

  'HWIC-4ESW': {
    id: 'HWIC-4ESW',
    name: 'NetSim HWIC-4ESW (4-Port 10/100 Switch)',
    category: 'ethernet',
    description: '4-port 10/100BASE-TX Fast Ethernet switch interface card for integrated L2 switching.',
    descriptionTr: '4 portlu 10/100BASE-TX Fast Ethernet entegre switch modülü.',
    portsCount: 4,
    badge: '4-Port SW',
    color: '#10b981', // emerald-500
    portGenerator: (slotIndex: number) => {
      const canvasPorts: CanvasPort[] = [];
      const switchPorts: Port[] = [];

      for (let p = 0; p < 4; p++) {
        const portId = `FastEthernet0/${slotIndex}/${p}`;
        canvasPorts.push({
          id: portId,
          label: `Fa0/${slotIndex}/${p}`,
          status: 'disconnected',
          type: 'fastEthernet',
          adminStatus: 'up',
          operStatus: 'down',
          linkStatus: 'disconnected',
          shutdown: false,
          speed: '100',
          duplex: 'auto',
          vlan: 1,
        });

        switchPorts.push({
          id: portId,
          name: portId,
          status: 'disconnected',
          vlan: 1,
          mode: 'access',
          duplex: 'auto',
          speed: '100',
          shutdown: false,
          type: 'fastethernet',
        });
      }

      return { canvasPorts, switchPorts };
    },
  },

  'SFP-10G': {
    id: 'SFP-10G',
    name: 'NetSim SFP-10G-LR (10G Fiber Uplink)',
    category: 'fiber',
    description: '10 Gigabit Ethernet single-mode optical transceiver module for high-speed core links.',
    descriptionTr: '10G Fiber Optik uplink modülü (Tek modlu yüksek hızlı omurga bağlantıları için).',
    portsCount: 1,
    badge: '10G Fiber',
    color: '#8b5cf6', // purple-500
    portGenerator: (slotIndex: number) => {
      const portId = `TenGigabitEthernet0/${slotIndex}/0`;
      const canvasPorts: CanvasPort[] = [
        {
          id: portId,
          label: `Te0/${slotIndex}/0`,
          status: 'disconnected',
          type: 'tenGigabitEthernet',
          adminStatus: 'up',
          operStatus: 'down',
          linkStatus: 'disconnected',
          shutdown: false,
          speed: '10000',
          duplex: 'full',
        },
      ];

      const switchPorts: Port[] = [
        {
          id: portId,
          name: portId,
          status: 'disconnected',
          vlan: 1,
          mode: 'trunk',
          duplex: 'full',
          speed: '10000',
          shutdown: false,
          type: 'gigabitethernet',
        },
      ];

      return { canvasPorts, switchPorts };
    },
  },

  'NM-1GE': {
    id: 'NM-1GE',
    name: 'NetSim NM-1GE (1-Port Gigabit Ethernet)',
    category: 'ethernet',
    description: '1-port Gigabit Ethernet network module with RJ-45 copper interface.',
    descriptionTr: '1 portlu Gigabit Ethernet RJ-45 ağ genişletme modülü.',
    portsCount: 1,
    badge: '1GE Copper',
    color: '#f59e0b', // amber-500
    portGenerator: (slotIndex: number) => {
      const portId = `GigabitEthernet0/${slotIndex}/0`;
      const canvasPorts: CanvasPort[] = [
        {
          id: portId,
          label: `Gi0/${slotIndex}/0`,
          status: 'disconnected',
          type: 'gigabitEthernet',
          adminStatus: 'up',
          operStatus: 'down',
          linkStatus: 'disconnected',
          shutdown: false,
          speed: '1000',
          duplex: 'auto',
        },
      ];

      const switchPorts: Port[] = [
        {
          id: portId,
          name: portId,
          status: 'disconnected',
          vlan: 1,
          mode: 'routed',
          duplex: 'auto',
          speed: '1000',
          shutdown: false,
          type: 'gigabitethernet',
        },
      ];

      return { canvasPorts, switchPorts };
    },
  },
};

/**
 * Returns available chassis slots for a given device type and model.
 */
export function getDeviceSlots(device: CanvasDevice): DeviceSlotInfo[] {
  const isRouter = device.type === 'router' || device.type === 'firewall';
  const isSwitch = device.type === 'switchL2' || device.type === 'switchL3';

  if (isRouter) {
    return [
      {
        slotIndex: 1,
        slotName: 'Slot 0/1 (HWIC / WIC)',
        supportedModules: ['WIC-2T', 'HWIC-4ESW', 'NM-1GE', 'SFP-10G'],
        installedModuleId: device.installedModules?.[1],
      },
      {
        slotIndex: 2,
        slotName: 'Slot 0/2 (HWIC / WIC)',
        supportedModules: ['WIC-2T', 'HWIC-4ESW', 'NM-1GE', 'SFP-10G'],
        installedModuleId: device.installedModules?.[2],
      },
      {
        slotIndex: 3,
        slotName: 'Slot 0/3 (High-Speed NIM / SFP+)',
        supportedModules: ['SFP-10G', 'NM-1GE', 'WIC-2T'],
        installedModuleId: device.installedModules?.[3],
      },
    ];
  }

  if (isSwitch) {
    return [
      {
        slotIndex: 1,
        slotName: 'Uplink Bay 1 (SFP / NM)',
        supportedModules: ['SFP-10G', 'NM-1GE'],
        installedModuleId: device.installedModules?.[1],
      },
      {
        slotIndex: 2,
        slotName: 'Uplink Bay 2 (SFP / NM)',
        supportedModules: ['SFP-10G', 'NM-1GE'],
        installedModuleId: device.installedModules?.[2],
      },
    ];
  }

  return [];
}

/**
 * Installs a module into a device chassis slot.
 */
export function installExpansionModule(
  device: CanvasDevice,
  slotIndex: number,
  moduleId: string,
  switchState?: SwitchState
): {
  updatedDevice: CanvasDevice;
  updatedSwitchState?: SwitchState;
  newPorts: CanvasPort[];
} {
  const moduleDef = MODULE_CATALOG[moduleId];
  if (!moduleDef) {
    throw new Error(`Unknown module: ${moduleId}`);
  }

  // Generate ports for the slot
  const { canvasPorts, switchPorts } = moduleDef.portGenerator(slotIndex);

  // Filter out any previous ports that might have belonged to this slot
  const cleanCanvasPorts = (device.ports || []).filter(
    (p) => !p.id.includes(`0/${slotIndex}/`)
  );

  const updatedInstalledModules = {
    ...device.installedModules,
    [slotIndex]: moduleId,
  };

  const updatedDevice: CanvasDevice = {
    ...device,
    installedModules: updatedInstalledModules,
    ports: [...cleanCanvasPorts, ...canvasPorts],
  };

  let updatedSwitchState = switchState;
  if (switchState) {
    const nextPorts: Record<string, Port> = { ...switchState.ports };
    // Remove old slot ports
    Object.keys(nextPorts).forEach((pid) => {
      if (pid.includes(`0/${slotIndex}/`)) {
        delete nextPorts[pid];
      }
    });
    // Add new ports
    switchPorts.forEach((p) => {
      nextPorts[p.id] = p;
    });

    updatedSwitchState = {
      ...switchState,
      installedModules: updatedInstalledModules,
      ports: nextPorts,
    };
  }

  return {
    updatedDevice,
    updatedSwitchState,
    newPorts: canvasPorts,
  };
}

/**
 * Removes an expansion module from a slot.
 */
export function removeExpansionModule(
  device: CanvasDevice,
  slotIndex: number,
  connections: CanvasConnection[],
  switchState?: SwitchState
): {
  updatedDevice: CanvasDevice;
  updatedSwitchState?: SwitchState;
  removedConnections: string[];
} {
  const currentModuleId = device.installedModules?.[slotIndex];
  if (!currentModuleId) {
    return {
      updatedDevice: device,
      updatedSwitchState: switchState,
      removedConnections: [],
    };
  }

  // Find connections using ports from this slot
  const removedConnections: string[] = [];
  connections.forEach((c) => {
    if (
      (c.sourceDeviceId === device.id && c.sourcePort.includes(`0/${slotIndex}/`)) ||
      (c.targetDeviceId === device.id && c.targetPort.includes(`0/${slotIndex}/`))
    ) {
      removedConnections.push(c.id);
    }
  });

  const updatedInstalledModules = { ...device.installedModules };
  delete updatedInstalledModules[slotIndex];

  const updatedDevice: CanvasDevice = {
    ...device,
    installedModules: updatedInstalledModules,
    ports: (device.ports || []).filter((p) => !p.id.includes(`0/${slotIndex}/`)),
  };

  let updatedSwitchState = switchState;
  if (switchState) {
    const nextPorts: Record<string, Port> = { ...switchState.ports };
    Object.keys(nextPorts).forEach((pid) => {
      if (pid.includes(`0/${slotIndex}/`)) {
        delete nextPorts[pid];
      }
    });

    updatedSwitchState = {
      ...switchState,
      installedModules: updatedInstalledModules,
      ports: nextPorts,
    };
  }

  return {
    updatedDevice,
    updatedSwitchState,
    removedConnections,
  };
}
