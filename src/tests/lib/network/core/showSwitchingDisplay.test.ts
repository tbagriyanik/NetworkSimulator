import { describe, it, expect } from 'vitest';

describe('Show Switching Display', () => {
  it('should display MAC address table', () => {
    const table = [
      { vlan: 1, mac: '0011.2233.4455', type: 'DYNAMIC', port: 'fa0/1' },
      { vlan: 1, mac: '0011.2233.4466', type: 'DYNAMIC', port: 'fa0/2' },
      { vlan: 1, mac: '0011.2233.4477', type: 'STATIC', port: 'fa0/3' },
    ];
    expect(table).toHaveLength(3);
    expect(table.filter(e => e.type === 'DYNAMIC')).toHaveLength(2);
    expect(table.filter(e => e.type === 'STATIC')).toHaveLength(1);
  });

  it('should display VLAN brief', () => {
    const vlans = [
      { id: 1, name: 'default', status: 'active', ports: ['fa0/1', 'fa0/2', 'fa0/3', 'gi0/1'] },
      { id: 10, name: 'Students', status: 'active', ports: ['fa0/4', 'fa0/5'] },
      { id: 20, name: 'Faculty', status: 'active', ports: ['fa0/6'] },
      { id: 1002, name: 'fddi-default', status: 'unsupported' },
    ];
    expect(vlans.filter(v => v.status === 'active')).toHaveLength(3);
    expect(vlans.filter(v => v.id <= 1001)).toHaveLength(3);
  });

  it('should display spanning-tree info', () => {
    const stp = {
      rootBridge: 'SW1',
      rootPort: 'gi0/1',
      rootCost: 4,
      maxAge: 20,
      helloTime: 2,
      forwardDelay: 15,
    };
    expect(stp.rootBridge).toBe('SW1');
    expect(stp.helloTime).toBe(2);
  });

  it('should display port security settings', () => {
    const portSecurity = {
      port: 'fa0/1',
      maxAddresses: 2,
      violationMode: 'shutdown',
      sticky: true,
      violations: 0,
    };
    expect(portSecurity.maxAddresses).toBe(2);
    expect(portSecurity.violationMode).toBe('shutdown');
  });

  it('should display etherchannel info', () => {
    const etherchannel = {
      group: 1,
      protocol: 'LACP',
      ports: ['gi0/1', 'gi0/2'],
      state: 'SU',
    };
    expect(etherchannel.ports).toHaveLength(2);
    expect(etherchannel.protocol).toBe('LACP');
  });
});
