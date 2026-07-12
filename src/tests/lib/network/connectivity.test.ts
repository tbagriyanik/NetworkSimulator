import { describe, it, expect, vi } from 'vitest';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { checkDeviceConnectivity, getPingDiagnostics, evaluateAcl } from '@/lib/network/connectivity';
import { SwitchState } from '@/lib/network/types';
import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

vi.mock('@/lib/network/networkUtils', () => ({
  ensureDeviceStatesMap: vi.fn((deviceStates) => deviceStates || new Map()),
}));

describe('Connectivity Functions', () => {
  describe('ensureDeviceStatesMap', () => {
    it('should create empty map when undefined is passed', () => {
      const result = ensureDeviceStatesMap(undefined);
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should return the same map when provided', () => {
      const originalMap = new Map([['device1', { id: 'device1' }]]) as unknown as Map<string, import('@/lib/network/types').SwitchState>;
      const result = ensureDeviceStatesMap(originalMap);
      expect(result).toBe(originalMap);
    });
  });

  describe('checkDeviceConnectivity - Basic Network Tests', () => {
    const pc1: CanvasDevice = {
      id: 'PC1',
      name: 'PC1',
      type: 'pc',
      ip: '192.168.1.10',
      vlan: 10,
      ports: [{ id: 'eth0', status: 'connected' }]
    } as unknown as CanvasDevice;

    const pc2: CanvasDevice = {
      id: 'PC2',
      name: 'PC2',
      type: 'pc',
      ip: '192.168.1.20',
      vlan: 10,
      ports: [{ id: 'eth0', status: 'connected' }]
    } as unknown as CanvasDevice;

    const sw1: CanvasDevice = {
      id: 'SW1',
      name: 'SW1',
      type: 'switchL2',
      ports: []
    } as unknown as CanvasDevice;

    const connections: CanvasConnection[] = [
      {
        id: 'c1',
        sourceDeviceId: 'PC1',
        targetDeviceId: 'SW1',
        sourcePort: 'eth0',
        targetPort: 'fa0/1',
        cableType: 'straight',
        active: true
      } as unknown as CanvasConnection,
      {
        id: 'c2',
        sourceDeviceId: 'PC2',
        targetDeviceId: 'SW1',
        sourcePort: 'eth0',
        targetPort: 'fa0/2',
        cableType: 'straight',
        active: true
      } as unknown as CanvasConnection
    ];

    const sw1State: SwitchState = {
      id: 'SW1',
      hostname: 'SW1',
      macAddress: '00:11:22:33:44:55',
      switchModel: 'WS-C2960-24TT-L',
      switchLayer: 'L2',
      currentMode: 'user',
      ports: {
        'fa0/1': { id: 'fa0/1', vlan: 10, mode: 'access', shutdown: false },
        'fa0/2': { id: 'fa0/2', vlan: 10, mode: 'access', shutdown: false }
      }
    } as unknown as SwitchState;

    const deviceStates = new Map([['SW1', sw1State]]);

    it('should allow connectivity between devices in the same VLAN', () => {
      const result = checkDeviceConnectivity('PC1', 'PC2', [pc1, pc2, sw1], connections, deviceStates);
      expect(result.success).toBe(true);
    });

    it('should block connectivity between devices in different VLANs without routing', () => {
      const pc3: CanvasDevice = {
        id: 'PC3',
        name: 'PC3',
        type: 'pc',
        ip: '192.168.1.30',
        vlan: 20,
        ports: [{ id: 'eth0', status: 'connected' }]
      } as unknown as CanvasDevice;

      const connectionsWithPc3 = [
        ...connections,
        {
          id: 'c3',
          sourceDeviceId: 'PC3',
          targetDeviceId: 'SW1',
          sourcePort: 'eth0',
          targetPort: 'fa0/3',
          cableType: 'straight',
          active: true
        } as unknown as CanvasConnection
      ];

      const sw1StateWithPc3: SwitchState = {
        ...sw1State,
        ports: {
          ...sw1State.ports,
          'fa0/3': { id: 'fa0/3', vlan: 20, mode: 'access', shutdown: false }
        }
      } as unknown as SwitchState;

      const deviceStatesWithPc3 = new Map([['SW1', sw1StateWithPc3]]);

      const result = checkDeviceConnectivity('PC1', 'PC3', [pc1, pc2, pc3, sw1], connectionsWithPc3, deviceStatesWithPc3);
      expect(result.success).toBe(false);
      expect(result.error).toContain('VLAN mismatch');
    });

    it('should allow firewall traversal for allowed traffic', () => {
      const firewall: CanvasDevice = {
        id: 'FW1',
        name: 'FW1',
        type: 'firewall',
        ports: [{ id: 'ge0/0', status: 'connected' }, { id: 'ge0/1', status: 'connected' }],
        firewallRules: [
          { id: '1', sourceIp: '192.168.1.10', targetIp: '192.168.1.20', protocol: 'tcp', port: '80', action: 'deny', enabled: true },
          { id: '2', sourceIp: 'any', targetIp: 'any', protocol: 'any', port: 'any', action: 'allow', enabled: true }
        ]
      } as unknown as CanvasDevice;

      const connectionsWithFw: CanvasConnection[] = [
        {
          id: 'c1',
          sourceDeviceId: 'PC1',
          targetDeviceId: 'FW1',
          sourcePort: 'eth0',
          targetPort: 'ge0/0',
          cableType: 'straight',
          active: true
        } as unknown as CanvasConnection,
        {
          id: 'c2',
          sourceDeviceId: 'FW1',
          targetDeviceId: 'PC2',
          sourcePort: 'ge0/1',
          targetPort: 'eth0',
          cableType: 'straight',
          active: true
        } as unknown as CanvasConnection
      ];

      const fwState: SwitchState = {
        id: 'FW1',
        hostname: 'FW1',
        macAddress: '00:11:22:33:44:56',
        switchModel: 'ASA-5506-X',
        switchLayer: 'FW',
        currentMode: 'user',
        ports: {
          'ge0/0': { id: 'ge0/0', shutdown: false },
          'ge0/1': { id: 'ge0/1', shutdown: false }
        },
        firewallRules: firewall.firewallRules
      } as unknown as SwitchState;

      const fwDeviceStates = new Map([['FW1', fwState]]);

      const result = checkDeviceConnectivity('PC1', 'PC2', [pc1, pc2, firewall], connectionsWithFw, fwDeviceStates, { protocol: 'tcp', port: '80' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('firewall');
    });
  });

  describe('getPingDiagnostics', () => {
    const pc1: CanvasDevice = {
      id: 'PC1',
      name: 'PC1',
      type: 'pc',
      ip: '192.168.1.10',
      subnet: '255.255.255.0',
      vlan: 10,
      status: 'online',
      ports: []
    } as unknown as CanvasDevice;

    const pc2: CanvasDevice = {
      id: 'PC2',
      name: 'PC2',
      type: 'pc',
      ip: '192.168.1.20',
      subnet: '255.255.255.0',
      vlan: 10,
      status: 'online',
      ports: []
    } as unknown as CanvasDevice;

    const sw1: CanvasDevice = {
      id: 'SW1',
      name: 'SW1',
      type: 'switchL2',
      ports: []
    } as unknown as CanvasDevice;

    const connections: CanvasConnection[] = [
      {
        id: 'c1',
        sourceDeviceId: 'PC1',
        targetDeviceId: 'SW1',
        sourcePort: 'eth0',
        targetPort: 'fa0/1',
        cableType: 'straight',
        active: true
      } as unknown as CanvasConnection,
      {
        id: 'c2',
        sourceDeviceId: 'SW1',
        targetDeviceId: 'PC2',
        sourcePort: 'fa0/2',
        targetPort: 'eth0',
        cableType: 'straight',
        active: true
      } as unknown as CanvasConnection
    ];

    const sw1State: SwitchState = {
      id: 'SW1',
      hostname: 'SW1',
      macAddress: '00:11:22:33:44:55',
      switchModel: 'WS-C2960-24TT-L',
      switchLayer: 'L2',
      currentMode: 'user',
      ports: {
        'fa0/1': { id: 'fa0/1', vlan: 10, mode: 'access', shutdown: false },
        'fa0/2': { id: 'fa0/2', vlan: 10, mode: 'access', shutdown: false }
      }
    } as unknown as SwitchState;

    const deviceStates = new Map([['SW1', sw1State]]);

    it('should provide detailed diagnostics for successful connectivity', () => {
      const result = getPingDiagnostics('PC1', '192.168.1.20', [pc1, pc2, sw1], connections, deviceStates);
      expect(result.success).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it('should detect subnet compatibility issues', () => {
      const pc3: CanvasDevice = {
        id: 'PC3',
        name: 'PC3',
        type: 'pc',
        ip: '10.0.0.10',
        subnet: '255.255.255.0',
        status: 'online',
        ports: []
      } as unknown as CanvasDevice;

      const result = getPingDiagnostics('PC1', '10.0.0.10', [pc1, pc3, sw1], connections, deviceStates);
      expect(result.success).toBe(false);
      expect(result.reasons.some(r => r.includes('Subnet'))).toBe(true);
    });

    it('should detect missing gateway or subnet compatibility for different subnet', () => {
      const pc2WithDifferentSubnet: CanvasDevice = {
        ...pc2,
        id: 'PC2',
        name: 'PC2',
        ip: '192.168.2.20',
        subnet: '255.255.255.0'
      };
      const result = getPingDiagnostics('PC1', '192.168.2.20', [pc1, pc2WithDifferentSubnet, sw1], connections, deviceStates);
      expect(result.success).toBe(false);
    });
  });

  describe('evaluateAcl', () => {
    const sw1StateStandardAcl: SwitchState = {
      id: 'SW1',
      hostname: 'SW1',
      macAddress: '00:11:22:33:44:55',
      switchModel: 'WS-C2960-24TT-L',
      switchLayer: 'L2',
      currentMode: 'user',
      accessLists: {
        '1': ['permit 192.168.1.10 0.0.0.0', 'deny 192.168.1.20 0.0.0.0']
      }
    } as unknown as SwitchState;

    const sw1StateExtendedAcl: SwitchState = {
      id: 'SW1',
      hostname: 'SW1',
      macAddress: '00:11:22:33:44:55',
      switchModel: 'WS-C2960-24TT-L',
      switchLayer: 'L2',
      currentMode: 'user',
      accessLists: {
        '100': ['permit ip host 192.168.1.10 host 192.168.1.20', 'deny ip host 192.168.1.20 host 192.168.1.10']
      }
    } as unknown as SwitchState;

    it('should permit traffic matching standard ACL rule', () => {
      const result = evaluateAcl('1', sw1StateStandardAcl, '192.168.1.10', '192.168.1.20');
      expect(result).toBe('permit');
    });

    it('should deny traffic matching standard ACL deny rule', () => {
      const result = evaluateAcl('1', sw1StateStandardAcl, '192.168.1.20', '192.168.1.10');
      expect(result).toBe('deny');
    });

    it('should permit traffic matching extended ACL rule', () => {
      const result = evaluateAcl('100', sw1StateExtendedAcl, '192.168.1.10', '192.168.1.20');
      expect(result).toBe('permit');
    });

    it('should deny traffic for non-matching ACL', () => {
      const result = evaluateAcl('1', sw1StateStandardAcl, '10.0.0.10', '10.0.0.20');
      expect(result).toBe('deny');
    });

    it('should correctly evaluate standard named ACL with non-numeric name', () => {
      const stateWithNamedAcl = {
        ...sw1StateStandardAcl,
        accessLists: {
          'MYACL': ['permit 192.168.1.10 0.0.0.0', 'deny 192.168.1.20 0.0.0.0']
        },
        namedAclTypes: {
          'MYACL': 'standard'
        }
      } as unknown as SwitchState;
      const result1 = evaluateAcl('MYACL', stateWithNamedAcl, '192.168.1.10', '192.168.1.20');
      expect(result1).toBe('permit');

      const result2 = evaluateAcl('MYACL', stateWithNamedAcl, '192.168.1.20', '192.168.1.10');
      expect(result2).toBe('deny');
    });
  });
});
