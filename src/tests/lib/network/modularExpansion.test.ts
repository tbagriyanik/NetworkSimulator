import { describe, it, expect } from 'vitest';
import {
  getDeviceSlots,
  installExpansionModule,
  removeExpansionModule,
} from '@/lib/network/modularExpansion';
import { isModulePort } from '@/lib/network/portUtils';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

describe('Modular Expansion Engine (Slots & WIC Modules)', () => {
  const createMockRouter = (): CanvasDevice => ({
    id: 'router-1',
    type: 'router',
    name: 'Router1',
    ip: '192.168.1.1',
    x: 100,
    y: 100,
    status: 'online',
    ports: [
      {
        id: 'GigabitEthernet0/0',
        label: 'Gi0/0',
        status: 'disconnected',
        type: 'gigabitEthernet',
      },
    ],
  });

  const createMockSwitchState = (): SwitchState => ({
    hostname: 'Router1',
    macAddress: '00:11:22:33:44:55',
    switchModel: 'NS-L2-24TT-L',
    switchLayer: 'L2',
    currentMode: 'user',
    bootTime: Date.now(),
    ipRouting: true,
    ports: {
      'GigabitEthernet0/0': {
        id: 'GigabitEthernet0/0',
        name: 'GigabitEthernet0/0',
        status: 'disconnected',
        vlan: 1,
        mode: 'routed',
        duplex: 'auto',
        speed: '1000',
        shutdown: true,
        type: 'gigabitethernet',
      },
    },
    vlans: {},
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'] },
      vtyLines: { login: false, transportInput: ['all'] },
    },
    runningConfig: [],
    commandHistory: [],
    historyIndex: 0,
    version: { nosVersion: '15.2', modelName: '2911', serialNumber: 'SN123', uptime: '1h' },
    macAddressTable: [],
    arpCache: [],
  });

  it('should list available chassis slots for routers and switches', () => {
    const router = createMockRouter();
    const routerSlots = getDeviceSlots(router);
    expect(routerSlots.length).toBe(3);
    expect(routerSlots[0].slotIndex).toBe(1);
    expect(routerSlots[0].supportedModules).toContain('WIC-2T');
    expect(routerSlots[0].supportedModules).toContain('HWIC-4ESW');

    const switchDev: CanvasDevice = {
      ...router,
      type: 'switchL2',
    };
    const switchSlots = getDeviceSlots(switchDev);
    expect(switchSlots.length).toBe(2);
    expect(switchSlots[0].supportedModules).toContain('SFP-10G');
  });

  it('should install WIC-2T module and add Serial ports dynamically', () => {
    const router = createMockRouter();
    const state = createMockSwitchState();

    const res = installExpansionModule(router, 1, 'WIC-2T', state);

    expect(res.updatedDevice.installedModules?.[1]).toBe('WIC-2T');
    expect(res.newPorts.length).toBe(2);
    expect(res.newPorts[0].id).toBe('Serial0/1/0');
    expect(res.newPorts[1].id).toBe('Serial0/1/1');
    expect(res.newPorts[0].type).toBe('serial');

    expect(res.updatedSwitchState?.ports['Serial0/1/0']).toBeDefined();
    expect(res.updatedSwitchState?.ports['Serial0/1/0'].type).toBe('serial');
  });

  it('should install HWIC-4ESW 4-port switch module', () => {
    const router = createMockRouter();
    const state = createMockSwitchState();

    const res = installExpansionModule(router, 2, 'HWIC-4ESW', state);

    expect(res.updatedDevice.installedModules?.[2]).toBe('HWIC-4ESW');
    expect(res.newPorts.length).toBe(4);
    expect(res.newPorts[0].id).toBe('FastEthernet0/2/0');
    expect(res.newPorts[3].id).toBe('FastEthernet0/2/3');
  });

  it('should remove module and clean up attached connections and ports', () => {
    let router = createMockRouter();
    let state = createMockSwitchState();

    const installRes = installExpansionModule(router, 1, 'WIC-2T', state);
    router = installRes.updatedDevice;
    state = installRes.updatedSwitchState!;

    const connections: CanvasConnection[] = [
      {
        id: 'conn-serial-1',
        sourceDeviceId: router.id,
        sourcePort: 'Serial0/1/0',
        targetDeviceId: 'router-2',
        targetPort: 'Serial0/1/0',
        cableType: 'serial',
        active: true,
      },
      {
        id: 'conn-gi0',
        sourceDeviceId: router.id,
        sourcePort: 'GigabitEthernet0/0',
        targetDeviceId: 'switch-1',
        targetPort: 'GigabitEthernet0/1',
        cableType: 'straight',
        active: true,
      },
    ];

    const removeRes = removeExpansionModule(router, 1, connections, state);

    expect(removeRes.updatedDevice.installedModules?.[1]).toBeUndefined();
    expect(removeRes.updatedDevice.ports.some((p) => p.id.includes('Serial0/1/'))).toBe(false);
    expect(removeRes.removedConnections).toContain('conn-serial-1');
    expect(removeRes.removedConnections).not.toContain('conn-gi0');
  });

  it('should maintain built-in port order when adding module ports', () => {
    const router: CanvasDevice = {
      id: 'router-1',
      type: 'router',
      name: 'Router1',
      ip: '192.168.1.1',
      x: 100,
      y: 100,
      status: 'online',
      ports: [
        { id: 'console', label: 'Console', status: 'disconnected' },
        { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' },
        { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' },
        { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' },
        { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' },
        { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' },
        { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' },
        { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' },
        { id: 'wlan0', label: 'WLAN0', status: 'disconnected', shutdown: true },
      ],
    };

    const res = installExpansionModule(router, 1, 'WIC-2T');

    // Check that built-in ports come first
    const builtInPorts = res.updatedDevice.ports.filter(p => !isModulePort(p.id));
    const modulePorts = res.updatedDevice.ports.filter(p => isModulePort(p.id));

    expect(builtInPorts.length).toBe(9); // All original built-in ports
    expect(modulePorts.length).toBe(2); // 2 module ports

    // Check that built-in ports maintain their original order
    expect(builtInPorts[0].id).toBe('console');
    expect(builtInPorts[1].id).toBe('gi0/0');
    expect(builtInPorts[2].id).toBe('gi0/1');
    expect(builtInPorts[3].id).toBe('gi0/2');
    expect(builtInPorts[4].id).toBe('gi0/3');
    expect(builtInPorts[5].id).toBe('s0/0/0');
    expect(builtInPorts[6].id).toBe('s0/1/0');
    expect(builtInPorts[7].id).toBe('s0/2/0');
    expect(builtInPorts[8].id).toBe('wlan0');

    // Check that module ports come after built-in ports
    expect(res.updatedDevice.ports.indexOf(builtInPorts[8])).toBeLessThan(res.updatedDevice.ports.indexOf(modulePorts[0]));
  });
});
