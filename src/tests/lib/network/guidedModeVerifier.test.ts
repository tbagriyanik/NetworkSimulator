import { describe, it, expect } from 'vitest';
import {
  checkStepCompletion,
  getNextIncompleteStep,
  getCompletedStepsCount,
  getProgressPercentage,
} from '@/lib/network/guidedModeVerifier';
import type { GuidedStep } from '@/lib/network/guidedMode.types';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';

function createMockDevice(overrides: Partial<CanvasDevice> & { id: string; type: CanvasDevice['type']; name: string }): CanvasDevice {
  return {
    ip: '',
    status: 'online',
    ports: [],
    x: 0,
    y: 0,
    ...overrides,
  };
}

function createMockStep(overrides: Partial<GuidedStep> & { id: string; checkType: GuidedStep['checkType'] }): GuidedStep {
  return {
    order: 1,
    title: { tr: '', en: '' },
    description: { tr: '', en: '' },
    hint: { tr: '', en: '' },
    completed: false,
    ...overrides,
  };
}

describe('guidedModeVerifier', () => {
  describe('deviceAccess check', () => {
    it('verifies device type access', () => {
      const step = createMockStep({
        id: 's1',
        title: { tr: 'Cihaza eriş', en: 'Access device' },
        checkType: 'deviceAccess',
        checkParams: { deviceType: 'router' },
      });
      expect(checkStepCompletion(step, { deviceAccessed: 'router' })).toBe(true);
      expect(checkStepCompletion(step, { deviceAccessed: 'switch' })).toBe(false);
    });

    it('verifies specific target device ID access', () => {
      const step = createMockStep({
        id: 's2',
        checkType: 'deviceAccess',
        checkParams: { targetDeviceId: 'router-1' },
      });
      expect(checkStepCompletion(step, { deviceAccessedId: 'router-1' })).toBe(true);
      expect(checkStepCompletion(step, { deviceAccessedId: 'router-2' })).toBe(false);
    });
  });

  describe('command check', () => {
    it('verifies exact and pipe-separated command patterns', () => {
      const step = createMockStep({
        id: 's3',
        checkType: 'command',
        checkParams: { commandPattern: 'show ip interface brief|show ip int br' },
      });
      expect(checkStepCompletion(step, { lastCommand: 'show ip int br' })).toBe(true);
      expect(checkStepCompletion(step, { lastCommand: 'show running-config' })).toBe(false);
    });

    it('rejects commands that resulted in error or ambiguous outputs', () => {
      const step = createMockStep({
        id: 's4',
        checkType: 'command',
        checkParams: { commandPattern: 'configure terminal' },
      });
      expect(checkStepCompletion(step, {
        lastCommand: 'configure terminal',
        lastOutput: '% Invalid input detected at marker',
      })).toBe(false);

      expect(checkStepCompletion(step, {
        lastCommand: 'configure terminal',
        lastOutput: '% Ambiguous command',
      })).toBe(false);

      expect(checkStepCompletion(step, {
        lastCommand: 'configure terminal',
        lastOutput: 'Enter configuration commands, one per line.',
      })).toBe(true);
    });

    it('enforces targetDeviceId on command checks', () => {
      const step = createMockStep({
        id: 's5',
        checkType: 'command',
        checkParams: { commandPattern: 'enable', targetDeviceId: 'switch-1' },
      });
      expect(checkStepCompletion(step, { lastCommand: 'enable', deviceAccessedId: 'switch-1' })).toBe(true);
      expect(checkStepCompletion(step, { lastCommand: 'enable', deviceAccessedId: 'switch-2' })).toBe(false);
    });
  });

  describe('connection check', () => {
    it('verifies single connection between devices regardless of direction', () => {
      const step = createMockStep({
        id: 's6',
        checkType: 'connection',
        checkParams: { sourceDevice: 'pc-1', targetDevice: 'switch-1' },
      });

      const conns: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'switch-1', sourcePort: 'Fa0/1', targetDeviceId: 'pc-1', targetPort: 'Eth0', active: true, cableType: 'straight' },
      ];
      const devs: CanvasDevice[] = [
        createMockDevice({ id: 'pc-1', name: 'PC1', type: 'pc' }),
        createMockDevice({ id: 'switch-1', name: 'SW1', type: 'switchL2' }),
      ];

      expect(checkStepCompletion(step, { topologyConnections: conns, topologyDevices: devs })).toBe(true);
    });

    it('verifies required cable type and specific ports', () => {
      const step = createMockStep({
        id: 's7',
        checkType: 'connection',
        checkParams: {
          connections: [{ sourceDevice: 'pc-1', sourcePort: 'Eth0', targetDevice: 'switch-1', targetPort: 'Fa0/1' }],
          cableType: 'straight',
        },
      });

      const validConns: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'Eth0', targetDeviceId: 'switch-1', targetPort: 'Fa0/1', active: true, cableType: 'straight' },
      ];
      const wrongCableConns: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'Eth0', targetDeviceId: 'switch-1', targetPort: 'Fa0/1', active: true, cableType: 'crossover' },
      ];

      const devs: CanvasDevice[] = [];
      expect(checkStepCompletion(step, { topologyConnections: validConns, topologyDevices: devs })).toBe(true);
      expect(checkStepCompletion(step, { topologyConnections: wrongCableConns, topologyDevices: devs })).toBe(false);
    });
  });

  describe('config check', () => {
    it('verifies switch global configurations (hostname, domainName, ipRouting)', () => {
      const mockState = {
        hostname: 'CoreSwitch',
        domainName: 'lab.local',
        ipRouting: true,
      } as unknown as SwitchState;

      expect(checkStepCompletion(createMockStep({
        id: 'c1',
        checkType: 'config',
        checkParams: { configKey: 'hostname', configValue: 'CoreSwitch' },
      }), { deviceState: mockState })).toBe(true);

      expect(checkStepCompletion(createMockStep({
        id: 'c2',
        checkType: 'config',
        checkParams: { configKey: 'domainName', configValue: 'wrong.local' },
      }), { deviceState: mockState })).toBe(false);

      expect(checkStepCompletion(createMockStep({
        id: 'c3',
        checkType: 'config',
        checkParams: { configKey: 'ipRouting', configValue: true },
      }), { deviceState: mockState })).toBe(true);
    });

    it('verifies interface ports config (ip, shutdown, vlan, mode, security)', () => {
      const mockState = {
        ports: {
          'gigabitethernet0/1': {
            id: 'gigabitethernet0/1',
            ipAddress: '192.168.1.1',
            shutdown: false,
            vlan: 10,
            mode: 'access',
            portSecurity: { enabled: true },
          },
        },
      } as unknown as SwitchState;

      expect(checkStepCompletion(createMockStep({
        id: 'p1',
        checkType: 'config',
        checkParams: { configKey: 'ports.gigabitethernet0/1.ipAddress', configValue: '192.168.1.1' },
      }), { deviceState: mockState })).toBe(true);

      expect(checkStepCompletion(createMockStep({
        id: 'p2',
        checkType: 'config',
        checkParams: { configKey: 'interfaces.gigabitethernet0/1.vlan', configValue: 10 },
      }), { deviceState: mockState })).toBe(true);

      expect(checkStepCompletion(createMockStep({
        id: 'p3',
        checkType: 'config',
        checkParams: { configKey: 'interfaces.gigabitethernet0/1.portSecurity.enabled', configValue: true },
      }), { deviceState: mockState })).toBe(true);
    });

    it('verifies VLAN configurations (existence and name)', () => {
      const mockState = {
        vlans: {
          20: { id: 20, name: 'MANAGEMENT' },
        },
      } as unknown as SwitchState;

      expect(checkStepCompletion(createMockStep({
        id: 'v1',
        checkType: 'config',
        checkParams: { configKey: 'vlans.20' },
      }), { deviceState: mockState })).toBe(true);

      expect(checkStepCompletion(createMockStep({
        id: 'v2',
        checkType: 'config',
        checkParams: { configKey: 'vlans.20.name', configValue: 'MANAGEMENT' },
      }), { deviceState: mockState })).toBe(true);
    });

    it('verifies DHCP pool configurations', () => {
      const mockState = {
        dhcpPools: {
          POOL_CLIENTS: { name: 'POOL_CLIENTS', defaultGateway: '10.0.0.1' },
        },
      } as unknown as SwitchState;

      expect(checkStepCompletion(createMockStep({
        id: 'd1',
        checkType: 'config',
        checkParams: { configKey: 'dhcpPools.POOL_CLIENTS.defaultGateway', configValue: '10.0.0.1' },
      }), { deviceState: mockState })).toBe(true);
    });

    it('verifies PC host configuration from topologyDevices', () => {
      const devs: CanvasDevice[] = [
        createMockDevice({
          id: 'pc-1',
          name: 'PC1',
          type: 'pc',
          ip: '192.168.1.100',
          subnet: '255.255.255.0',
          gateway: '192.168.1.1',
        }),
      ];

      expect(checkStepCompletion(createMockStep({
        id: 'pc1',
        checkType: 'config',
        checkParams: { configKey: 'pc.pc-1.ip', configValue: '192.168.1.100', subnetMask: '255.255.255.0' },
      }), { topologyDevices: devs })).toBe(true);

      expect(checkStepCompletion(createMockStep({
        id: 'pc2',
        checkType: 'config',
        checkParams: { configKey: 'pc.pc-1.gateway', configValue: '192.168.1.1' },
      }), { topologyDevices: devs })).toBe(true);
    });
  });

  describe('ping check', () => {
    it('verifies successful ping output to target IP', () => {
      const step = createMockStep({
        id: 'pi1',
        checkType: 'ping',
        checkParams: { toIp: '192.168.1.1' },
      });

      expect(checkStepCompletion(step, {
        lastCommand: 'ping 192.168.1.1',
        lastOutput: 'Reply from 192.168.1.1: bytes=32 time<1ms TTL=64',
      })).toBe(true);

      expect(checkStepCompletion(step, {
        lastCommand: 'ping 192.168.1.1',
        lastOutput: 'Request timed out. 100% loss',
      })).toBe(false);
    });
  });

  describe('deviceCount and routingConverged checks', () => {
    it('verifies minimum count of specific device types', () => {
      const devs: CanvasDevice[] = [
        createMockDevice({ id: 'sw-1', name: 'SW1', type: 'switchL2' }),
        createMockDevice({ id: 'sw-2', name: 'SW2', type: 'switchL3' }),
        createMockDevice({ id: 'pc-1', name: 'PC1', type: 'pc' }),
      ];

      expect(checkStepCompletion(createMockStep({
        id: 'dc1',
        checkType: 'deviceCount',
        checkParams: { deviceType: 'switch', minCount: 2 },
      }), { topologyDevices: devs })).toBe(true);

      expect(checkStepCompletion(createMockStep({
        id: 'dc2',
        checkType: 'deviceCount',
        checkParams: { deviceType: 'router', minCount: 1 },
      }), { topologyDevices: devs })).toBe(false);
    });

    it('verifies routing convergence when all routers have dynamic routes', () => {
      const map = new Map<string, SwitchState>();
      map.set('r1', { deviceType: 'router', dynamicRoutes: [{ destination: '10.0.0.0', nextHop: '1.1.1.1' }] } as unknown as SwitchState);
      map.set('r2', { deviceType: 'router', dynamicRoutes: [{ destination: '20.0.0.0', nextHop: '1.1.1.2' }] } as unknown as SwitchState);

      const step = createMockStep({
        id: 'rc1',
        checkType: 'routingConverged',
      });
      expect(checkStepCompletion(step, { deviceStates: map })).toBe(true);

      map.set('r3', { deviceType: 'router', dynamicRoutes: [] } as unknown as SwitchState);
      expect(checkStepCompletion(step, { deviceStates: map })).toBe(false);
    });

    it('verifies showOutputMatch and manual check types', () => {
      expect(checkStepCompletion(createMockStep({
        id: 'so1',
        checkType: 'showOutputMatch',
        checkParams: { showCommand: 'show version', matchPattern: 'Network Simulator IOS' },
      }), { lastCommand: 'show version', lastOutput: 'Network Simulator IOS v6.2' })).toBe(true);

      expect(checkStepCompletion(createMockStep({
        id: 'm1',
        checkType: 'manual',
      }), {})).toBe(true);
    });
  });

  describe('step navigation and progress helpers', () => {
    const steps: GuidedStep[] = [
      createMockStep({ id: '1', checkType: 'manual', completed: true }),
      createMockStep({ id: '2', checkType: 'manual', completed: false }),
      createMockStep({ id: '3', checkType: 'manual', completed: false }),
    ];

    it('finds next incomplete step', () => {
      expect(getNextIncompleteStep(steps)?.id).toBe('2');
      expect(getNextIncompleteStep([createMockStep({ id: '1', checkType: 'manual', completed: true })])).toBeNull();
    });

    it('calculates completed steps count and progress percentage', () => {
      expect(getCompletedStepsCount(steps)).toBe(1);
      expect(getProgressPercentage(steps)).toBe(33);
      expect(getProgressPercentage([])).toBe(0);
    });
  });
});
