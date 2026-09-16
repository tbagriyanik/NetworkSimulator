import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { SwitchState, Port } from '@/lib/network/types';
import { isDhcpPoolCompatibleForClient } from '@/components/network/pc-panel/pcBrowser.utils';
import { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

describe('DHCP Relay (ip helper-address)', () => {
  it('should add and remove helper-address on interface via CLI', () => {
    let state = {
      hostname: 'Router1',
      deviceType: 'router',
      currentMode: 'interface',
      currentInterface: 'GigabitEthernet0/0',
      ports: {
        'GigabitEthernet0/0': { ipAddress: '192.168.1.1', subnetMask: '255.255.255.0' } as Port
      }
    } as unknown as SwitchState;

    // Add helper address
    let res = executeCommand(state, 'ip helper-address 10.0.0.100');
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['GigabitEthernet0/0']?.helperAddresses).toContain('10.0.0.100');

    // Add second helper address
    state = { ...state, ...res.newState };
    res = executeCommand(state, 'ip helper-address 10.0.0.101');
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['GigabitEthernet0/0']?.helperAddresses).toEqual(['10.0.0.100', '10.0.0.101']);

    // Remove helper address
    state = { ...state, ...res.newState };
    res = executeCommand(state, 'no ip helper-address');
    expect(res.success).toBe(true);
    expect(res.newState?.ports?.['GigabitEthernet0/0']?.helperAddresses).toEqual([]);
  });

  it('should allow cross-subnet DHCP pool compatibility when ip helper-address is configured', () => {
    const clientDevice = {
      id: 'pc-1',
      name: 'PC-1',
      type: 'pc',
      x: 100,
      y: 100
    } as unknown as CanvasDevice;

    const serverDevice = {
      id: 'server-1',
      name: 'DHCP-Server',
      type: 'pc',
      ip: '10.0.0.100',
      x: 500,
      y: 100
    } as unknown as CanvasDevice;

    const connections = [
      { sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'router-1', targetPort: 'Gi0/0' },
      { sourceDeviceId: 'router-1', sourcePort: 'Gi0/1', targetDeviceId: 'server-1', targetPort: 'eth0' }
    ] as unknown as CanvasConnection[];

    const deviceStates = new Map<string, SwitchState>();
    deviceStates.set('router-1', {
      hostname: 'Router1',
      currentMode: 'user',
      ports: {
        'Gi0/0': { ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', helperAddresses: ['10.0.0.100'] } as Port,
        'Gi0/1': { ipAddress: '10.0.0.1', subnetMask: '255.255.255.0' } as Port
      }
    } as unknown as SwitchState);

    const isCompatible = isDhcpPoolCompatibleForClient({
      poolGateway: '192.168.1.1',
      poolStartIp: '192.168.1.10',
      poolSubnetMask: '255.255.255.0',
      serverDevice,
      clientDevice,
      deviceStates,
      topologyConnections: connections,
      isValidIpv4: (ip: string) => /^\d+\.\d+\.\d+\.\d+$/.test(ip),
      getDeviceWifiConfig: () => undefined
    });

    expect(isCompatible).toBe(true);
  });
});


