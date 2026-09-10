import { describe, it, expect } from 'vitest';
import { evaluateIpSlaOperations } from '@/lib/network/ipSlaEngine';
import { cmdIpSla, cmdTrack } from '@/lib/network/core/globalConfigNetworkCommands';
import { cmdShowTrack, cmdShowIpSlaSummary, cmdShowIpSlaConfiguration } from '@/lib/network/core/showRoutingDisplay';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

describe('IP SLA Automated Timer Trigger & Object Tracking', () => {
  it('should run IP SLA probe, update probe statistics and update Track object state to UP when target is reachable', () => {
    let state: any = {
      hostname: 'R1',
      currentMode: 'config',
      ports: {}
    };


    // Configure IP SLA 10 icmp-echo 192.168.1.2 frequency 10
    let res = cmdIpSla(state, 'ip sla 10 icmp-echo 192.168.1.2 frequency 10', {} as any);
    expect(res.success).toBe(true);
    state = { ...state, ...res.newState };

    // Schedule IP SLA 10
    res = cmdIpSla(state, 'ip sla schedule 10 life forever start-time now', {} as any);
    expect(res.success).toBe(true);
    state = { ...state, ...res.newState };

    // Configure track 1 ip sla 10 reachability
    res = cmdTrack(state, 'track 1 ip sla 10 reachability', {} as any);
    expect(res.success).toBe(true);
    state = { ...state, ...res.newState };

    expect(state.ipSlaOperations?.['10']?.running).toBe(true);
    expect(state.ipSlaTracks?.['1']?.operationId).toBe('10');

    // Devices & Connections
    const devices: CanvasDevice[] = [
      { id: 'r1', name: 'R1', type: 'router', x: 0, y: 0, ip: '192.168.1.1', status: 'online', ports: [] },
      { id: 'r2', name: 'R2', type: 'router', x: 100, y: 0, ip: '192.168.1.2', status: 'online', ports: [] }
    ];

    const connections: CanvasConnection[] = [
      {
        id: 'conn1',
        sourceDeviceId: 'r1',
        sourcePort: 'gi0_0',
        targetDeviceId: 'r2',
        targetPort: 'gi0_0',
        cableType: 'straight',
        active: true
      }
    ];

    const states = new Map<string, SwitchState>([
      ['r1', state],
      ['r2', { hostname: 'R2', ports: { gi0_0: { id: 'gi0_0', name: 'Gi0/0', type: 'gigabitethernet', status: 'connected', shutdown: false, ipAddress: '192.168.1.2', subnetMask: '255.255.255.0' } } } as any]
    ]);

    // Run automated timer trigger evaluation
    const slaEval = evaluateIpSlaOperations(states, devices, connections, Date.now());
    const r1Updated = slaEval.updatedStates.get('r1');

    expect(r1Updated).toBeDefined();
    expect(r1Updated?.ipSlaOperations?.['10']?.statistics.attempts).toBe(1);
    expect(r1Updated?.ipSlaOperations?.['10']?.statistics.successes).toBe(1);
    expect(r1Updated?.ipSlaTracks?.['1']?.state).toBe('up');

    // Test show track command
    const showTrackRes = cmdShowTrack(r1Updated!, 'show track 1', {} as any);
    expect(showTrackRes.success).toBe(true);
    expect(showTrackRes.output).toContain('Reachability is Up');

    // Test show ip sla summary command
    const showSummaryRes = cmdShowIpSlaSummary(r1Updated!, 'show ip sla summary', {} as any);
    expect(showSummaryRes.success).toBe(true);
    expect(showSummaryRes.output).toContain('ICMP-ECHO');
    expect(showSummaryRes.output).toContain('OK');

    // Test show ip sla configuration command
    const showConfigRes = cmdShowIpSlaConfiguration(r1Updated!, 'show ip sla configuration', {} as any);
    expect(showConfigRes.success).toBe(true);
    expect(showConfigRes.output).toContain('192.168.1.2');
  });

  it('should decrement HSRP priority when tracked IP SLA target becomes unreachable', () => {
    let state: any = {
      hostname: 'R1',
      currentMode: 'config',
      ports: {
        Gi0_0: {
          id: 'Gi0_0',
          name: 'GigabitEthernet0/0',
          status: 'connected',
          shutdown: false,
          hsrp: {
            groups: {
              '1': {
                groupId: '1',
                virtualIp: '192.168.1.254',
                priority: 110,
                basePriority: 110,
                trackId: '1',
                state: 'Active',
              },
            },
          },
        },
      },
      ipSlaOperations: {
        '10': {
          id: '10',
          target: '10.254.254.254', // Unreachable target
          type: 'icmp-echo',
          frequency: 10,
          running: true,
          statistics: { attempts: 0, successes: 0, failures: 0, samples: [] },
        },
      },
      ipSlaTracks: {
        '1': { operationId: '10', state: 'up', decrement: 20 },
      },
    };

    const devices: CanvasDevice[] = [
      { id: 'r1', name: 'R1', type: 'router', x: 0, y: 0, ip: '192.168.1.1', status: 'online', ports: [] },
    ];
    const connections: CanvasConnection[] = [];
    const states = new Map<string, SwitchState>([['r1', state]]);

    const slaEval = evaluateIpSlaOperations(states, devices, connections, Date.now());
    const r1Updated = slaEval.updatedStates.get('r1');

    expect(r1Updated?.ipSlaTracks?.['1']?.state).toBe('down');
    expect(r1Updated?.ports?.Gi0_0?.hsrp?.groups?.['1']?.priority).toBe(90); // 110 - 20 = 90
  });
});

