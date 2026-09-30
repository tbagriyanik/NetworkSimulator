import { describe, expect, it } from 'vitest';
import type { SwitchState } from '@/lib/network/types';
import { monitorDeviceStateChanges } from '@/lib/network/monitoringStateSync';
import { emitSyslogEvent } from '@/lib/network/syslog';

describe('SNMP & Syslog Monitoring State Transition Association', () => {
  const prevState: SwitchState = {
    hostname: 'Core-Router-1',
    runningConfig: ['hostname Core-Router-1'],
    ports: {
      'Gi0/0': { id: 'Gi0/0', name: 'Gi0/0', status: 'connected', shutdown: false, vlan: 1, mode: 'access', duplex: 'full', speed: '1000', type: 'gigabitethernet' },
      'Gi0/1': { id: 'Gi0/1', name: 'Gi0/1', status: 'connected', shutdown: false, vlan: 1, mode: 'access', duplex: 'full', speed: '1000', type: 'gigabitethernet' },
    },
    ospfNeighbors: ['10.0.0.2'],
  } as unknown as SwitchState;

  it('detects interface link down transition and emits correlated Syslog and SNMP linkDown trap', () => {
    const nextState: SwitchState = {
      ...prevState,
      ports: {
        ...prevState.ports,
        'Gi0/1': { id: 'Gi0/1', name: 'Gi0/1', status: 'disabled', shutdown: true, vlan: 1, mode: 'access', duplex: 'full', speed: '1000', type: 'gigabitethernet' },
      },
    };

    const res = monitorDeviceStateChanges(prevState, nextState);
    expect(res.generatedSyslogs).toHaveLength(1);
    expect(res.generatedSyslogs[0].mnemonic).toBe('UPDOWN');
    expect(res.generatedSyslogs[0].facility).toBe('LINK');

    expect(res.generatedTraps).toHaveLength(1);
    expect(res.generatedTraps[0].trapType).toBe('linkDown');
    expect(res.generatedTraps[0].oid).toBe('.1.3.6.1.6.3.1.1.5.3');
  });

  it('detects configuration modification and emits %SYS-5-CONFIG_I syslog and configChange trap', () => {
    const nextState: SwitchState = {
      ...prevState,
      hostname: 'Core-Router-Renamed',
      runningConfig: ['hostname Core-Router-Renamed', 'ip domain-name test.com'],
    };

    const res = monitorDeviceStateChanges(prevState, nextState);
    expect(res.generatedSyslogs.some(s => s.mnemonic === 'CONFIG_I')).toBe(true);
    expect(res.generatedTraps.some(t => t.trapType === 'configChange')).toBe(true);
  });

  it('detects OSPF neighbor state transition and emits %OSPF-5-ADJCHG syslog and ospfNbrStateChange trap', () => {
    const nextState: SwitchState = {
      ...prevState,
      ospfNeighbors: [], // Neighbor lost
    };

    const res = monitorDeviceStateChanges(prevState, nextState);
    expect(res.generatedSyslogs.some(s => s.mnemonic === 'ADJCHG')).toBe(true);
    expect(res.generatedTraps.some(t => t.trapType === 'ospfNbrStateChange')).toBe(true);
  });

  it('emits formatted Syslog message using emitSyslogEvent helper', () => {
    const { updatedState, syslog } = emitSyslogEvent(prevState, 'SEC', 2, 'UNAUTHORIZED', 'Unauthorized access attempt');
    expect(syslog.facility).toBe('SEC');
    expect(updatedState.syslogLogs?.some(l => l.includes('%SEC-2-UNAUTHORIZED'))).toBe(true);
  });
});
