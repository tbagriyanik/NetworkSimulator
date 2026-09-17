import { describe, it, expect } from 'vitest';
import { parseCommand, validateCommand } from '../../../lib/network/parser';
import { executeCommand } from '../../../lib/network/executor';
import { createInitialState } from '../../../lib/network/initialState';
import { SwitchState } from '../../../lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

describe('Extended CLI Command Audit Fixes Tests', () => {
  const createBaseState = (): SwitchState => {
    const base = createInitialState('Router-Test', 'NS-L3-24PS');
    return {
      ...base,
      currentMode: 'privileged',
      ipRouting: true,
      routingProtocol: 'ospf',
      ospfProcessId: '1',
      ospfRouterId: '10.0.0.1',
      ports: {
        ...base.ports,
        'GigabitEthernet0/0': {
          id: 'gigabitethernet0/0',
          name: 'GigabitEthernet0/0',
          status: 'connected',
          vlan: 1,
          mode: 'routed',
          duplex: 'auto',
          speed: 'auto',
          shutdown: false,
          type: 'gigabitethernet',
          ipAddress: '192.168.1.1',
          subnetMask: '255.255.255.0',
          ospfArea: '0'
        }
      }
    };
  };

  describe('1. OSPF Area Types (Stub, Totally Stubby, NSSA, Totally NSSA)', () => {
    it('should configure and remove area stub and area stub no-summary', () => {
      const state = createBaseState();
      state.currentMode = 'router-config';

      // area 1 stub
      const parsedStub = parseCommand('area 1 stub', 'router-config');
      expect(parsedStub).not.toBeNull();
      if (parsedStub) {
        expect(validateCommand(parsedStub, 'router-config').valid).toBe(true);
      }
      const resStub = executeCommand(state, 'area 1 stub');
      expect(resStub.success).toBe(true);
      expect(resStub.newState?.ospfStubAreas).toContain('1');

      // area 2 stub no-summary
      const parsedTotallyStub = parseCommand('area 2 stub no-summary', 'router-config');
      expect(parsedTotallyStub).not.toBeNull();
      if (parsedTotallyStub) {
        expect(validateCommand(parsedTotallyStub, 'router-config').valid).toBe(true);
      }
      const resTotallyStub = executeCommand(state, 'area 2 stub no-summary');
      expect(resTotallyStub.success).toBe(true);
      expect(resTotallyStub.newState?.ospfTotallyStubAreas).toContain('2');

      // no area 1 stub
      const stateWithStub = { ...state, ospfStubAreas: ['1'], ospfTotallyStubAreas: ['1'] };
      const resNoStub = executeCommand(stateWithStub, 'no area 1 stub');
      expect(resNoStub.success).toBe(true);
      expect(resNoStub.newState?.ospfStubAreas).not.toContain('1');
    });

    it('should configure and remove area nssa and area nssa no-summary', () => {
      const state = createBaseState();
      state.currentMode = 'router-config';

      // area 3 nssa
      const parsedNssa = parseCommand('area 3 nssa', 'router-config');
      expect(parsedNssa).not.toBeNull();
      if (parsedNssa) {
        expect(validateCommand(parsedNssa, 'router-config').valid).toBe(true);
      }
      const resNssa = executeCommand(state, 'area 3 nssa');
      expect(resNssa.success).toBe(true);
      expect(resNssa.newState?.ospfNssaAreas).toContain('3');

      // area 4 nssa no-summary
      const parsedTotallyNssa = parseCommand('area 4 nssa no-summary', 'router-config');
      expect(parsedTotallyNssa).not.toBeNull();
      if (parsedTotallyNssa) {
        expect(validateCommand(parsedTotallyNssa, 'router-config').valid).toBe(true);
      }
      const resTotallyNssa = executeCommand(state, 'area 4 nssa no-summary');
      expect(resTotallyNssa.success).toBe(true);
      expect(resTotallyNssa.newState?.ospfTotallyNssaAreas).toContain('4');

      // no area 3 nssa
      const stateWithNssa = { ...state, ospfNssaAreas: ['3'], ospfTotallyNssaAreas: ['3'] };
      const resNoNssa = executeCommand(stateWithNssa, 'no area 3 nssa');
      expect(resNoNssa.success).toBe(true);
      expect(resNoNssa.newState?.ospfNssaAreas).not.toContain('3');
    });
  });

  describe('2. default-information originate options', () => {
    it('should parse and execute default-information originate with always, metric, metric-type', () => {
      const state = createBaseState();
      state.currentMode = 'router-config';

      const parsed = parseCommand('default-information originate always metric 20 metric-type 1', 'router-config');
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(validateCommand(parsed, 'router-config').valid).toBe(true);
      }

      const res = executeCommand(state, 'default-information originate always metric 20 metric-type 1');
      expect(res.success).toBe(true);
      expect(res.newState?.ospfDefaultOriginate).toEqual({
        enabled: true,
        always: true,
        metric: 20,
        metricType: 1
      });

      // no default-information originate
      const resNo = executeCommand(state, 'no default-information originate');
      expect(resNo.success).toBe(true);
      expect(resNo.newState?.ospfDefaultOriginate).toBeUndefined();
    });
  });

  describe('3. show ip ospf database filters', () => {
    it('should execute show ip ospf database router', () => {
      const state = createBaseState();
      const res = executeCommand(state, 'show ip ospf database router');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Router Link States');
      expect(res.output).toContain('Link State ID: 10.0.0.1');
      expect(res.output).toContain('Advertising Router: 10.0.0.1');
    });

    it('should execute show ip ospf database database-summary', () => {
      const state = createBaseState();
      const res = executeCommand(state, 'show ip ospf database database-summary');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Area 0 database summary');
      expect(res.output).toContain('Process subtotal');
      expect(res.output).toContain('Router');
    });

    it('should execute show ip ospf database external when default-information is enabled', () => {
      const state = createBaseState();
      state.ospfDefaultOriginate = { enabled: true, always: true, metric: 20, metricType: 1 };
      const res = executeCommand(state, 'show ip ospf database external');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Type-5 AS External Link States');
      expect(res.output).toContain('Metric Type: 1');
      expect(res.output).toContain('Metric: 20');
    });

    it('should execute show ip ospf database self-originate', () => {
      const state = createBaseState();
      const res = executeCommand(state, 'show ip ospf database self-originate');
      expect(res.success).toBe(true);
      expect(res.output).toContain('10.0.0.1');
    });
  });

  describe('4. show cdp neighbors detail', () => {
    it('should output rich Cisco details for connected devices', () => {
      const state = createBaseState();
      const devices: CanvasDevice[] = [
        { id: 'dev-1', name: 'R1', type: 'router', x: 0, y: 0, ip: '192.168.1.1', status: 'online', ports: [] },
        { id: 'dev-2', name: 'SW1', type: 'switchL2', x: 100, y: 100, ip: '', status: 'online', ports: [] }
      ];
      const connections: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'dev-1', sourcePort: 'GigabitEthernet0/0', targetDeviceId: 'dev-2', targetPort: 'GigabitEthernet0/1', cableType: 'straight', active: true }
      ];
      const deviceStates = new Map<string, SwitchState>([
        ['dev-1', state],
        ['dev-2', { ...createBaseState(), hostname: 'SW1' }]
      ]);

      const res = executeCommand(state, 'show cdp neighbors detail', 'tr', devices, connections, deviceStates, 'dev-1');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Device ID: SW1');
      expect(res.output).toContain('Entry address(es):');
      expect(res.output).toContain('Platform: NS-L2-24TT-L');
      expect(res.output).toContain('Interface: GigabitEthernet0/0,  Port ID (outgoing port): GigabitEthernet0/1');
      expect(res.output).toContain('Native VLAN: 1');
      expect(res.output).toContain('Total cdp entries displayed : 1');
    });
  });

  describe('5. traceroute extended options', () => {
    it('should parse and execute traceroute with source, numeric, timeout', () => {
      const state = createBaseState();
      const devices: CanvasDevice[] = [
        { id: 'dev-1', name: 'R1', type: 'router', x: 0, y: 0, ip: '192.168.1.1', status: 'online', ports: [] },
        { id: 'dev-2', name: 'R2', type: 'router', x: 100, y: 100, ip: '192.168.1.2', status: 'online', ports: [] }
      ];
      const connections: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'dev-1', sourcePort: 'GigabitEthernet0/0', targetDeviceId: 'dev-2', targetPort: 'GigabitEthernet0/0', cableType: 'straight', active: true }
      ];
      const deviceStates = new Map<string, SwitchState>([
        ['dev-1', state],
        ['dev-2', { ...createBaseState(), hostname: 'R2', ip: '192.168.1.2' }]
      ]);

      const parsed = parseCommand('traceroute 192.168.1.2 source GigabitEthernet0/0 numeric timeout 2 probe 3', 'privileged');
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(validateCommand(parsed, 'privileged').valid).toBe(true);
      }

      const res = executeCommand(state, 'traceroute 192.168.1.2 source GigabitEthernet0/0 numeric timeout 2 probe 3', 'tr', devices, connections, deviceStates, 'dev-1');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Tracing the route to 192.168.1.2 (192.168.1.2)');
      expect(res.output).toContain('Source interface: GigabitEthernet0/0');
    });
  });

  describe('6. ping vrf and extended options', () => {
    it('should parse and execute ping with vrf, source, repeat, timeout, size', () => {
      const state = createBaseState();
      const devices: CanvasDevice[] = [
        { id: 'dev-1', name: 'R1', type: 'router', x: 0, y: 0, ip: '192.168.1.1', status: 'online', ports: [] },
        { id: 'dev-2', name: 'R2', type: 'router', x: 100, y: 100, ip: '192.168.1.2', status: 'online', ports: [] }
      ];
      const connections: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'dev-1', sourcePort: 'GigabitEthernet0/0', targetDeviceId: 'dev-2', targetPort: 'GigabitEthernet0/0', cableType: 'straight', active: true }
      ];
      const deviceStates = new Map<string, SwitchState>([
        ['dev-1', state],
        ['dev-2', { ...createBaseState(), hostname: 'R2', ip: '192.168.1.2' }]
      ]);

      const parsed = parseCommand('ping vrf RED 192.168.1.2 source GigabitEthernet0/0 repeat 10 timeout 3 size 100', 'privileged');
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(validateCommand(parsed, 'privileged').valid).toBe(true);
      }

      const res = executeCommand(state, 'ping vrf RED 192.168.1.2 source GigabitEthernet0/0 repeat 10 timeout 3 size 100', 'tr', devices, connections, deviceStates, 'dev-1');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Sending 10, 100-byte ICMP Echos to 192.168.1.2, timeout is 3 seconds:');
      expect(res.output).toContain('VRF: RED');
      expect(res.output).toContain('Packet sent with a source address of GigabitEthernet0/0');
      expect(res.output).toContain('Success rate is 100 percent (10/10)');
    });
  });
});
