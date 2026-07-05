/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import type { CanvasConnection } from '@/components/network/networkTopology.types';
import {
  getNextIncompleteStep,
  getCompletedStepsCount,
  getProgressPercentage,
  generateGuidedIntegrityHash,
  verifyGuidedIntegrity,
  checkStepCompletion,
  getGuidedProjects,
  addDeviceGuidedSteps,
  pcCmdGuidedSteps,
  cliBasicsGuidedSteps,
  basicSwitchGuidedSteps,
  basicLanGuidedSteps,
  vlanGuidedSteps,
  routerDhcpGuidedSteps,
  staticRoutingGuidedSteps,
  portSecurityGuidedSteps,
  ripRoutingGuidedSteps,
  servicesGuidedSteps,
  cliGuidedLessons,
  type GuidedStep,
} from '@/lib/network/guidedMode';

describe('guidedMode', () => {
  describe('getNextIncompleteStep', () => {
    it('should return the first incomplete step', () => {
      const steps = [
        { id: 'step-1', completed: true },
        { id: 'step-2', completed: false },
        { id: 'step-3', completed: false },
      ];

      const result = getNextIncompleteStep(steps as any);
      expect(result?.id).toBe('step-2');
    });

    it('should return null when all steps completed', () => {
      const steps = [
        { id: 'step-1', completed: true },
        { id: 'step-2', completed: true },
      ];

      const result = getNextIncompleteStep(steps as any);
      expect(result).toBeNull();
    });

    it('should return null for empty steps array', () => {
      expect(getNextIncompleteStep([])).toBeNull();
    });
  });

  describe('getCompletedStepsCount', () => {
    it('should count completed steps', () => {
      const steps = [
        { id: 'step-1', completed: true },
        { id: 'step-2', completed: false },
        { id: 'step-3', completed: true },
      ];

      expect(getCompletedStepsCount(steps as any)).toBe(2);
    });

    it('should return 0 for no completed steps', () => {
      const steps = [
        { id: 'step-1', completed: false },
        { id: 'step-2', completed: false },
      ];

      expect(getCompletedStepsCount(steps as any)).toBe(0);
    });
  });

  describe('getProgressPercentage', () => {
    it('should calculate correct percentage', () => {
      const steps = [
        { id: 'step-1', completed: true },
        { id: 'step-2', completed: true },
        { id: 'step-3', completed: false },
        { id: 'step-4', completed: false },
      ];

      expect(getProgressPercentage(steps as any)).toBe(50);
    });

    it('should return 0 for empty steps', () => {
      expect(getProgressPercentage([])).toBe(0);
    });

    it('should return 100 when all completed', () => {
      const steps = [
        { id: 'step-1', completed: true },
        { id: 'step-2', completed: true },
      ];

      expect(getProgressPercentage(steps as any)).toBe(100);
    });
  });

  describe('generateGuidedIntegrityHash & verifyGuidedIntegrity', () => {
    it('should generate a consistent hash for the same project', () => {
      const project = {
        id: 'test-project',
        estimatedTimeMinutes: 30,
        steps: [
          { id: 'step-1', points: 10, completed: false, completedAt: null },
          { id: 'step-2', points: 20, completed: true, completedAt: new Date('2024-01-01') },
        ],
        startedAt: null,
        totalPoints: 30,
        integrityHash: undefined,
      };

      const hash1 = generateGuidedIntegrityHash(project as any);
      const hash2 = generateGuidedIntegrityHash(project as any);

      expect(hash1).toBe(hash2);
    });

    it('should verify integrity when hash matches', () => {
      const project: any = {
        id: 'test-project',
        estimatedTimeMinutes: 30,
        steps: [
          { id: 'step-1', points: 10, completed: false, completedAt: null },
        ],
        startedAt: null,
        totalPoints: 10,
        integrityHash: undefined,
      };

      const hash = generateGuidedIntegrityHash(project as any);
      project.integrityHash = hash;

      expect(verifyGuidedIntegrity(project as any)).toBe(true);
    });

    it('should fail verification when data is tampered', () => {
      const original: any = {
        id: 'test-project',
        estimatedTimeMinutes: 30,
        steps: [{ id: 'step-1', points: 10, completed: false, completedAt: null }],
        startedAt: null,
        totalPoints: 10,
      };

      const hash = generateGuidedIntegrityHash(original as any);
      const tampered: any = { ...original, estimatedTimeMinutes: 999 };
      tampered.integrityHash = hash;

      expect(verifyGuidedIntegrity(tampered as any)).toBe(false);
    });

    it('should fail verification when no integrityHash set', () => {
      const project = {
        id: 'test-project',
        estimatedTimeMinutes: 30,
        steps: [],
        startedAt: null,
        totalPoints: 0,
      };

      expect(verifyGuidedIntegrity(project as any)).toBe(false);
    });
  });

  describe('checkStepCompletion', () => {
    const baseStep: any = {
      id: 'test-step',
      order: 1,
      title: { tr: 'Test', en: 'Test' },
      description: { tr: 'Test', en: 'Test' },
      hint: { tr: 'Test', en: 'Test' },
      checkType: 'manual',
      completed: false,
    };

    describe('deviceAccess', () => {
      it('should return true when device type matches', () => {
        const step = { ...baseStep, checkType: 'deviceAccess', checkParams: { deviceType: 'router' } };
        expect(checkStepCompletion(step, { deviceAccessed: 'router' })).toBe(true);
      });

      it('should return false when device type does not match', () => {
        const step = { ...baseStep, checkType: 'deviceAccess', checkParams: { deviceType: 'router' } };
        expect(checkStepCompletion(step, { deviceAccessed: 'switch' })).toBe(false);
      });

      it('should return false when deviceAccessed is null', () => {
        const step = { ...baseStep, checkType: 'deviceAccess', checkParams: { deviceType: 'router' } };
        expect(checkStepCompletion(step, { deviceAccessed: null })).toBe(false);
      });

      it('should verify targetDeviceId when specified', () => {
        const step = {
          ...baseStep,
          checkType: 'deviceAccess',
          checkParams: { deviceType: 'router', targetDeviceId: 'router-1' },
        };
        expect(checkStepCompletion(step, { deviceAccessed: 'router', deviceAccessedId: 'router-1' })).toBe(true);
        expect(checkStepCompletion(step, { deviceAccessed: 'router', deviceAccessedId: 'router-2' })).toBe(false);
      });
    });

    describe('command', () => {
      it('should return true when command matches pattern', () => {
        const step = {
          ...baseStep,
          checkType: 'command',
          checkParams: { commandPattern: 'enable' },
        };
        expect(checkStepCompletion(step, { lastCommand: 'enable' })).toBe(true);
      });

      it('should handle pipe-separated patterns', () => {
        const step = {
          ...baseStep,
          checkType: 'command',
          checkParams: { commandPattern: 'show running-config|show run' },
        };
        expect(checkStepCompletion(step, { lastCommand: 'show running-config' })).toBe(true);
        expect(checkStepCompletion(step, { lastCommand: 'show run' })).toBe(true);
      });

      it('should return false when command does not match', () => {
        const step = {
          ...baseStep,
          checkType: 'command',
          checkParams: { commandPattern: 'enable' },
        };
        expect(checkStepCompletion(step, { lastCommand: 'disable' })).toBe(false);
      });

      it('should verify targetDeviceId when specified', () => {
        const step = {
          ...baseStep,
          checkType: 'command',
          checkParams: { commandPattern: 'configure terminal', targetDeviceId: 'switch-1' },
        };
        expect(checkStepCompletion(step, { lastCommand: 'configure terminal', deviceAccessedId: 'switch-1' })).toBe(true);
        expect(checkStepCompletion(step, { lastCommand: 'configure terminal', deviceAccessedId: 'switch-2' })).toBe(false);
      });

      it('should be case insensitive', () => {
        const step = {
          ...baseStep,
          checkType: 'command',
          checkParams: { commandPattern: 'ENABLE' },
        };
        expect(checkStepCompletion(step, { lastCommand: 'enable' })).toBe(true);
      });
    });

    describe('connection', () => {
      const makeConn = (overrides: Partial<CanvasConnection> = {}): CanvasConnection => ({
        id: 'conn-1',
        sourceDeviceId: 'pc-1',
        sourcePort: 'eth0',
        targetDeviceId: 'switch-1',
        targetPort: 'fa0/1',
        cableType: 'straight',
        active: true,
        ...overrides,
      });

      it('should return true when any active connection exists (no params)', () => {
        const step = { ...baseStep, checkType: 'connection' };
        expect(checkStepCompletion(step, {
          topologyConnections: [makeConn()],
          topologyDevices: [],
        })).toBe(true);
      });

      it('should return false when no connections exist', () => {
        const step = { ...baseStep, checkType: 'connection' };
        expect(checkStepCompletion(step, {
          topologyConnections: [],
          topologyDevices: [],
        })).toBe(false);
      });

      it('should verify specific connection', () => {
        const step = {
          ...baseStep,
          checkType: 'connection',
          checkParams: {
            sourceDevice: 'pc-1',
            sourcePort: 'eth0',
            targetDevice: 'switch-1',
            targetPort: 'fa0/1',
            cableType: 'straight',
          },
        };
        expect(checkStepCompletion(step, {
          topologyConnections: [makeConn()],
          topologyDevices: [],
        })).toBe(true);
      });

      it('should return false when cable type does not match', () => {
        const step = {
          ...baseStep,
          checkType: 'connection',
          checkParams: {
            sourceDevice: 'pc-1',
            targetDevice: 'switch-1',
            cableType: 'crossover',
          },
        };
        expect(checkStepCompletion(step, {
          topologyConnections: [makeConn({ cableType: 'straight' })],
          topologyDevices: [],
        })).toBe(false);
      });

      it('should return false for inactive connections', () => {
        const step = { ...baseStep, checkType: 'connection' };
        expect(checkStepCompletion(step, {
          topologyConnections: [makeConn({ active: false })],
          topologyDevices: [],
        })).toBe(false);
      });

      it('should validate multiple required connections', () => {
        const step = {
          ...baseStep,
          checkType: 'connection',
          checkParams: {
            connections: [
              { sourceDevice: 'pc-1', sourcePort: 'eth0', targetDevice: 'switch-1', targetPort: 'fa0/1' },
              { sourceDevice: 'pc-2', sourcePort: 'eth0', targetDevice: 'switch-1', targetPort: 'fa0/2' },
            ],
          },
        };
        const conns = [
          makeConn({ id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/1' }),
          makeConn({ id: 'c2', sourceDeviceId: 'pc-2', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/2' }),
        ];
        expect(checkStepCompletion(step, { topologyConnections: conns, topologyDevices: [] })).toBe(true);
      });
    });

    describe('config', () => {
      it('should check device-level properties', () => {
        const deviceState = {
          hostname: 'SW-Lab',
          domainName: 'lab.local',
          sshVersion: 2,
          vtpMode: 'client',
          mlsQosEnabled: true,
          ipRouting: true
        };

        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'hostname', configValue: 'SW-Lab' } }, { deviceState: deviceState as any })).toBe(true);
        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'domainName', configValue: 'lab.local' } }, { deviceState: deviceState as any })).toBe(true);
        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'sshVersion', configValue: 2 } }, { deviceState: deviceState as any })).toBe(true);
        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'vtpMode', configValue: 'client' } }, { deviceState: deviceState as any })).toBe(true);
        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'mlsQosEnabled', configValue: true } }, { deviceState: deviceState as any })).toBe(true);
        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'ipRouting', configValue: true } }, { deviceState: deviceState as any })).toBe(true);
      });

      it('should check interface IP configuration', () => {
        const step = {
          ...baseStep,
          checkType: 'config',
          checkParams: { configKey: 'interfaces.gi0/0.ipAddress', configValue: '192.168.1.1' },
        };
        const deviceState = { ports: { 'gi0/0': { ipAddress: '192.168.1.1' } } };
        expect(checkStepCompletion(step, { deviceState: deviceState as any })).toBe(true);
      });

      it('should check interface shutdown state', () => {
        const step = {
          ...baseStep,
          checkType: 'config',
          checkParams: { configKey: 'interfaces.gi0/0.shutdown', configValue: false },
        };
        const deviceState = { ports: { 'gi0/0': { shutdown: false } } };
        expect(checkStepCompletion(step, { deviceState: deviceState as any })).toBe(true);
      });

      it('should check VLAN assignment', () => {
        const step = {
          ...baseStep,
          checkType: 'config',
          checkParams: { configKey: 'interfaces.fa0/1.vlan', configValue: 10 },
        };
        const deviceState = { ports: { 'fa0/1': { accessVlan: 10 } } };
        expect(checkStepCompletion(step, { deviceState: deviceState as any })).toBe(true);
      });

      it('should check VLAN existence', () => {
        const step = {
          ...baseStep,
          checkType: 'config',
          checkParams: { configKey: 'vlans.10', configValue: { name: 'Engineering' } },
        };
        const deviceState = { vlans: { 10: { name: 'Engineering' } } };
        expect(checkStepCompletion(step, { deviceState: deviceState as any })).toBe(true);
      });

      it('should check static routes', () => {
        const step = {
          ...baseStep,
          checkType: 'config',
          checkParams: { configKey: 'staticRoutes', configValue: { destination: '192.168.2.0/24' } },
        };
        const deviceState = { staticRoutes: [{ destination: '192.168.2.0/24', nextHop: '10.0.0.1' }] };
        expect(checkStepCompletion(step, { deviceState: deviceState as any })).toBe(true);
      });

      it('should check DHCP pool configuration', () => {
        const step = {
          ...baseStep,
          checkType: 'config',
          checkParams: { configKey: 'dhcpPools.LAN', configValue: { network: '192.168.1.0', mask: '255.255.255.0' } },
        };
        const deviceState = { dhcpPools: { LAN: { network: '192.168.1.0', mask: '255.255.255.0' } } };
        expect(checkStepCompletion(step, { deviceState: deviceState as any })).toBe(true);
      });

      it('should check routing protocol', () => {
        const step = {
          ...baseStep,
          checkType: 'config',
          checkParams: { configKey: 'routingProtocol', configValue: 'rip' },
        };
        const deviceState = { routingProtocol: 'rip' };
        expect(checkStepCompletion(step, { deviceState: deviceState as any })).toBe(true);
      });

      it('should check PC configuration properties', () => {
        const topologyDevices = [{
          id: 'pc-1',
          ip: '192.168.1.10',
          subnet: '255.255.255.0',
          gateway: '192.168.1.1',
          dns: '8.8.8.8'
        }];

        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'pc.pc-1.ip', configValue: '192.168.1.10' } }, { topologyDevices: topologyDevices as any })).toBe(true);
        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'pc.pc-1.gateway', configValue: '192.168.1.1' } }, { topologyDevices: topologyDevices as any })).toBe(true);
        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'pc.pc-1.dns', configValue: '8.8.8.8' } }, { topologyDevices: topologyDevices as any })).toBe(true);
      });

      it('should check IoT properties', () => {
        const topologyDevices = [{
          id: 'iot-1',
          wifi: { ssid: 'IoT-Network' },
          iot: { sensorType: 'temperature', value: 25 }
        }];

        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'iot.iot-1.ssid', configValue: 'IoT-Network' } }, { topologyDevices: topologyDevices as any })).toBe(true);
        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'iot.iot-1.sensorType', configValue: 'temperature' } }, { topologyDevices: topologyDevices as any })).toBe(true);
        expect(checkStepCompletion({ ...baseStep, checkType: 'config', checkParams: { configKey: 'iot.iot-1.value', configValue: 25 } }, { topologyDevices: topologyDevices as any })).toBe(true);
      });

      it('should check firewall IP', () => {
        const step = {
          ...baseStep,
          checkType: 'config',
          checkParams: { configKey: 'firewall.fw-1.ip', configValue: '10.0.0.1' },
        };
        const topologyDevices = [{ id: 'fw-1', ip: '10.0.0.1' }];
        expect(checkStepCompletion(step, { topologyDevices: topologyDevices as any })).toBe(true);
      });

      it('should check firewall IP in port states', () => {
        const step = {
          ...baseStep,
          checkType: 'config',
          checkParams: { configKey: 'firewall.fw-1.ip', configValue: '10.0.0.1' },
        };
        const deviceState = new Map();
        deviceState.set('fw-1', { ports: { 'gi0/0': { ipAddress: '10.0.0.1' } } });
        const topologyDevices = [{ id: 'fw-1', ip: '0.0.0.0' }];
        expect(checkStepCompletion(step, { deviceState: null as any, deviceStates: deviceState, topologyDevices: topologyDevices as any })).toBe(true);
      });

      it('should return false for unknown config key', () => {
        const step = {
          ...baseStep,
          checkType: 'config',
          checkParams: { configKey: 'unknown.key', configValue: 'test' },
        };
        expect(checkStepCompletion(step, {})).toBe(false);
      });

      it('should return false when configKey is missing', () => {
        const step = { ...baseStep, checkType: 'config', checkParams: {} };
        expect(checkStepCompletion(step, {})).toBe(false);
      });
    });

    describe('ping', () => {
      it('should return true when ping command matches target IP', () => {
        const step = {
          ...baseStep,
          checkType: 'ping',
          checkParams: { toIp: '192.168.1.1' },
        };
        expect(checkStepCompletion(step, { lastCommand: 'ping 192.168.1.1' })).toBe(true);
      });

      it('should return false when ping command is for wrong IP', () => {
        const step = {
          ...baseStep,
          checkType: 'ping',
          checkParams: { toIp: '192.168.1.1' },
        };
        expect(checkStepCompletion(step, { lastCommand: 'ping 10.0.0.1' })).toBe(false);
      });

      it('should verify fromDevice when specified', () => {
        const step = {
          ...baseStep,
          checkType: 'ping',
          checkParams: { toIp: '192.168.1.1', fromDevice: 'pc-1' },
        };
        expect(checkStepCompletion(step, { lastCommand: 'ping 192.168.1.1', deviceAccessedId: 'pc-1' })).toBe(true);
        expect(checkStepCompletion(step, { lastCommand: 'ping 192.168.1.1', deviceAccessedId: 'pc-2' })).toBe(false);
      });
    });

    describe('deviceCount', () => {
      it('should return true when enough devices exist', () => {
        const step = {
          ...baseStep,
          checkType: 'deviceCount',
          checkParams: { deviceType: 'pc', minCount: 2 },
        };
        const topologyDevices = [
          { id: 'pc-1', type: 'pc' },
          { id: 'pc-2', type: 'pc' },
        ];
        expect(checkStepCompletion(step, { topologyDevices: topologyDevices as any })).toBe(true);
      });

      it('should return false when not enough devices exist', () => {
        const step = {
          ...baseStep,
          checkType: 'deviceCount',
          checkParams: { deviceType: 'pc', minCount: 3 },
        };
        const topologyDevices = [
          { id: 'pc-1', type: 'pc' },
        ];
        expect(checkStepCompletion(step, { topologyDevices: topologyDevices as any })).toBe(false);
      });

      it('should count switch types (switchL2, switchL3) as switch', () => {
        const step = {
          ...baseStep,
          checkType: 'deviceCount',
          checkParams: { deviceType: 'switch', minCount: 2 },
        };
        const topologyDevices = [
          { id: 'sw1', type: 'switchL2' },
          { id: 'sw2', type: 'switchL3' },
        ];
        expect(checkStepCompletion(step, { topologyDevices: topologyDevices as any })).toBe(true);
      });
    });

    describe('manual', () => {
      it('should always return true', () => {
        const step = { ...baseStep, checkType: 'manual' };
        expect(checkStepCompletion(step, {})).toBe(true);
      });
    });

    describe('unknown checkType', () => {
      it('should return false', () => {
        const step = { ...baseStep, checkType: 'invalidType' as any };
        expect(checkStepCompletion(step, {})).toBe(false);
      });
    });
  });

  describe('getGuidedProjects', () => {
    it('should return projects with Turkish labels when language is tr', () => {
      const projects = getGuidedProjects('tr');

      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
      projects.forEach(p => {
        expect(p.isGuided).toBe(true);
        expect(Array.isArray(p.steps)).toBe(true);
        expect(typeof p.estimatedTimeMinutes).toBe('number');
        expect(['beginner', 'intermediate', 'advanced']).toContain(p.difficulty);
      });
    });

    it('should return projects with English labels when language is en', () => {
      const projects = getGuidedProjects('en');

      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });

    it('should have valid step data', () => {
      const projects = getGuidedProjects('en');

      for (const project of projects) {
        for (const step of project.steps) {
          expect(step.id).toBeDefined();
          expect(typeof step.order).toBe('number');
          expect(step.title).toHaveProperty('tr');
          expect(step.title).toHaveProperty('en');
          expect(step.description).toHaveProperty('tr');
          expect(step.description).toHaveProperty('en');
          expect(step.hint).toHaveProperty('tr');
          expect(step.hint).toHaveProperty('en');
          expect(['deviceAccess', 'command', 'config', 'connection', 'ping', 'manual', 'deviceCount']).toContain(step.checkType);
        }
      }
    });

    it('should have unique step IDs within each project', () => {
      const projects = getGuidedProjects('en');

      for (const project of projects) {
        const ids = project.steps.map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  });

  describe('static step arrays', () => {
    const stepArrays: Array<{ name: string; steps: GuidedStep[] }> = [
      { name: 'addDeviceGuidedSteps', steps: addDeviceGuidedSteps },
      { name: 'pcCmdGuidedSteps', steps: pcCmdGuidedSteps },
      { name: 'cliBasicsGuidedSteps', steps: cliBasicsGuidedSteps },
      { name: 'basicSwitchGuidedSteps', steps: basicSwitchGuidedSteps },
      { name: 'basicLanGuidedSteps', steps: basicLanGuidedSteps },
      { name: 'vlanGuidedSteps', steps: vlanGuidedSteps },
      { name: 'routerDhcpGuidedSteps', steps: routerDhcpGuidedSteps },
      { name: 'staticRoutingGuidedSteps', steps: staticRoutingGuidedSteps },
      { name: 'portSecurityGuidedSteps', steps: portSecurityGuidedSteps },
      { name: 'ripRoutingGuidedSteps', steps: ripRoutingGuidedSteps },
      { name: 'servicesGuidedSteps', steps: servicesGuidedSteps },
      { name: 'cliGuidedLessons', steps: cliGuidedLessons },
    ];

    stepArrays.forEach(({ name, steps }) => {
      it(`${name} should contain valid steps with sequential order`, () => {
        expect(Array.isArray(steps)).toBe(true);
        expect(steps.length).toBeGreaterThan(0);

        steps.forEach((step: GuidedStep) => {
          expect(step.id).toBeDefined();
          expect(step.title).toHaveProperty('tr');
          expect(step.title).toHaveProperty('en');
          expect(step.description).toHaveProperty('tr');
          expect(step.description).toHaveProperty('en');
          expect(step.hint).toHaveProperty('tr');
          expect(step.hint).toHaveProperty('en');
          expect(typeof step.completed).toBe('boolean');
        });
      });
    });
  });
});
