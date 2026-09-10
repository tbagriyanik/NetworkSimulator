import { describe, it, expect } from 'vitest';
import { processNatPacket, ageOutNatTranslations } from '@/lib/network/forwarding/natEngine';
import { createInitialState } from '@/lib/network/initialState';
import type { SwitchState, Port } from '@/lib/network/types';

function createMockPort(id: string, ipAddress: string, natSide: 'inside' | 'outside'): Port {
  return {
    id,
    name: id,
    status: 'connected',
    vlan: 1,
    mode: 'routed',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress,
    subnetMask: '255.255.255.0',
    natSide,
  };
}

describe('natEngine (Stateful NAT/PAT & Session Aging Engine)', () => {
  it('performs Dynamic PAT translation from Inside to Outside and records session in natTranslations', () => {
    const state: SwitchState = createInitialState();
    state.ports['Gi0/0'] = createMockPort('Gi0/0', '192.168.1.1', 'inside');
    state.ports['Gi0/1'] = createMockPort('Gi0/1', '203.0.113.1', 'outside');

    state.accessLists = {
      '1': ['permit 192.168.1.0 0.0.0.255']
    };

    state.natDynamicRules = [
      { aclId: '1', interface: 'Gi0/1', overload: true }
    ];

    const res = processNatPacket(
      state,
      'Gi0/0',
      'Gi0/1',
      '192.168.1.50',
      '8.8.8.8',
      45000,
      53,
      'udp'
    );

    expect(res.translated).toBe(true);
    expect(res.newSourceIp).toBe('203.0.113.1');
    expect(res.newSourcePort).toBeDefined();
    expect(res.updatedState?.natTranslations).toBeDefined();
    expect(res.updatedState?.natTranslations?.length).toBe(1);

    const session = res.updatedState?.natTranslations?.[0];
    expect(session?.localIp).toBe('192.168.1.50');
    expect(session?.globalIp).toBe('203.0.113.1');
  });

  it('performs stateful reverse translation for return traffic from Outside to Inside', () => {
    const state: SwitchState = createInitialState();
    state.ports['Gi0/0'] = createMockPort('Gi0/0', '192.168.1.1', 'inside');
    state.ports['Gi0/1'] = createMockPort('Gi0/1', '203.0.113.1', 'outside');

    // Pre-existing session in NAT table
    state.natTranslations = [
      {
        protocol: 'tcp',
        localIp: '192.168.1.20',
        localPort: 5000,
        globalIp: '203.0.113.1',
        globalPort: 1024,
        remoteIp: '198.51.100.5',
        timestamp: Date.now(),
      }
    ];

    const res = processNatPacket(
      state,
      'Gi0/1',
      'Gi0/0',
      '198.51.100.5',
      '203.0.113.1',
      80,
      1024,
      'tcp'
    );

    expect(res.translated).toBe(true);
    expect(res.newTargetIp).toBe('192.168.1.20');
    expect(res.newTargetPort).toBe(5000);
  });

  it('ages out expired NAT sessions based on protocol timeout', () => {
    const state: SwitchState = createInitialState();
    const now = Date.now();
    state.natTranslations = [
      {
        protocol: 'icmp',
        localIp: '192.168.1.10',
        localPort: 0,
        globalIp: '203.0.113.1',
        globalPort: 0,
        timestamp: now - 15000, // 15 seconds ago (ICMP timeout is 10s -> should expire)
      },
      {
        protocol: 'tcp',
        localIp: '192.168.1.15',
        localPort: 1234,
        globalIp: '203.0.113.1',
        globalPort: 1024,
        timestamp: now - 5000, // 5 seconds ago (TCP timeout is 120s -> should remain)
      }
    ];

    const { updatedState, expiredCount } = ageOutNatTranslations(state, now);
    expect(expiredCount).toBe(1);
    expect(updatedState.natTranslations?.length).toBe(1);
    expect(updatedState.natTranslations?.[0].protocol).toBe('tcp');
  });
});

