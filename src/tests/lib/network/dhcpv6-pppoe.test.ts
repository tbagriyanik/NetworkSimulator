import { describe, it, expect } from 'vitest';
import { evaluatePppoeSessions } from '@/lib/network/pppoeEngine';
import { evaluateDhcpv6ForDevice } from '@/lib/network/eui64';
import { cmdShowIpv6DhcpBinding, cmdShowIpv6DhcpPool, cmdShowPppoeSession, cmdShowCaller } from '@/lib/network/core/showRoutingDisplay';
import type { SwitchState } from '@/lib/network/types'; 
import type { CommandContext } from '@/lib/network/core/commandTypes';
import type { CanvasConnection } from '@/components/network/networkTopology.types';

describe('DHCPv6 Lease & Identity Association (IA_NA) Simulation', () => {
  it('should lease IPv6 address and store Dhcpv6Binding entry on DHCPv6 server', () => {
    const serverState: any = {
      hostname: 'R1-DHCPv6-Server',
      ipv6DhcpPools: {
        'LAN-POOL': {
          addressPrefix: '2001:db8:1::/64',
          dnsServer: '2001:db8:1::53'
        }
      },
      ports: {
        gi0_0: {
          id: 'gi0_0',
          name: 'GigabitEthernet0/0',
          type: 'gigabitethernet',
          status: 'connected',
          shutdown: false,
          ipv6DhcpServerPool: 'LAN-POOL',
          ipv6Address: '2001:db8:1::1'
        }
      }
    };

    const clientState: any = {
      hostname: 'PC-1',
      macAddress: '0050.56a1.b2c3',
      ports: {}
    };

    const states = new Map<string, SwitchState>([
      ['r1', serverState as SwitchState],
      ['pc1', clientState as SwitchState]
    ]);

    const conns: CanvasConnection[] = [
      {
        id: 'conn1',
        sourceDeviceId: 'pc1',
        sourcePort: 'eth0',
        targetDeviceId: 'r1',
        targetPort: 'gi0_0',
        cableType: 'straight',
        active: true
      }
    ];

    const result = evaluateDhcpv6ForDevice('pc1', states, conns);
    expect(result).not.toBeNull();
    expect(result?.ipv6Address).toContain('2001:db8:1:');


    // Verify Dhcpv6Binding stored on server router
    const updatedServerState = states.get('r1');
    expect(updatedServerState?.dhcpv6Bindings).toBeDefined();
    expect(updatedServerState?.dhcpv6Bindings?.length).toBe(1);

    const binding = updatedServerState?.dhcpv6Bindings?.[0];
    expect(binding?.type).toBe('IA_NA');
    expect(binding?.iaid).toBe('0x00010001');
    expect(binding?.duid).toContain('00:03:00:01:');

    // Verify show ipv6 dhcp binding command output
    const bindingCmd = cmdShowIpv6DhcpBinding(updatedServerState!, 'show ipv6 dhcp binding', {} as CommandContext);
    expect(bindingCmd.success).toBe(true);
    expect(bindingCmd.output).toContain('IA_NA: IAID 0x00010001');
    expect(bindingCmd.output).toContain('2001:db8:1:');


    // Verify show ipv6 dhcp pool shows active clients: 1
    const poolCmd = cmdShowIpv6DhcpPool(updatedServerState!, 'show ipv6 dhcp pool LAN-POOL', {} as CommandContext);
    expect(poolCmd.success).toBe(true);
    expect(poolCmd.output).toContain('Active clients: 1');
  });
});

describe('PPPoE Session & LCP/IPCP Simulation', () => {
  it('should negotiate PPPoE Discovery, LCP, and IPCP to assign IP address to Dialer interface', () => {
    const clientState: any = {
      hostname: 'R-Client',
      macAddress: '0050.56C0.0001',
      ports: {
        gi0_0: {
          id: 'gi0_0',
          name: 'GigabitEthernet0/0',
          type: 'gigabitethernet',
          status: 'connected',
          shutdown: false,
          pppoeClientDialPool: 1
        },
        dialer1: {
          id: 'dialer1',
          name: 'Dialer1',
          type: 'gigabitethernet',
          status: 'connected',
          shutdown: false,
          dialerPool: 1,
          pppAuthentication: 'chap',
          pppChapHostname: 'user@isp.net',
          pppChapPassword: 'secretpassword'
        }
      }
    };

    const serverState: any = {
      hostname: 'R-ISP-Server',
      macAddress: '0050.56C0.0002',
      runningConfig: ['bba-group pppoe ISP-GROUP', 'virtual-template 1'],
      ports: {
        gi0_0: {
          id: 'gi0_0',
          name: 'GigabitEthernet0/0',
          type: 'gigabitethernet',
          status: 'connected',
          shutdown: false,
          pppoeEnableGroup: 'ISP-GROUP',
          ipAddress: '100.64.1.1'
        }
      }
    };

    const states = new Map<string, SwitchState>([
      ['r_client', clientState as SwitchState],
      ['r_server', serverState as SwitchState]
    ]);

    const conns: CanvasConnection[] = [
      {
        id: 'conn1',
        sourceDeviceId: 'r_client',
        sourcePort: 'gi0_0',
        targetDeviceId: 'r_server',
        targetPort: 'gi0_0',
        cableType: 'straight',
        active: true
      }
    ];

    const updatedStates = evaluatePppoeSessions(states, conns);

    const clientRes = updatedStates.get('r_client');
    expect(clientRes?.ports.dialer1.ipAddress).toBe('100.64.1.2');
    expect(clientRes?.pppoeSessions?.length).toBe(1);

    const session = clientRes?.pppoeSessions?.[0];
    expect(session?.discoveryState).toBe('ESTABLISHED');
    expect(session?.lcpState).toBe('Opened');
    expect(session?.ipcpState).toBe('Opened');
    expect(session?.authProtocol).toBe('CHAP');
    expect(session?.assignedIp).toBe('100.64.1.2');
    expect(session?.peerIp).toBe('100.64.1.1');

    // Test show pppoe session command
    const showPppoe = cmdShowPppoeSession(clientRes!, 'show pppoe session', {} as CommandContext);
    expect(showPppoe.success).toBe(true);
    expect(showPppoe.output).toContain('UP (LCP/IPCP Opened)');
    expect(showPppoe.output).toContain('100.64.1.2');

    // Test show caller command
    const showCaller = cmdShowCaller(clientRes!, 'show caller', {} as CommandContext);
    expect(showCaller.success).toBe(true);
    expect(showCaller.output).toContain('user@isp.net');
    expect(showCaller.output).toContain('100.64.1.2');
  });
});
