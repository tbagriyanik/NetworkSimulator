import { describe, it, expect } from 'vitest';

describe('Show Commands Suite', () => {
  const switchState = {
    hostname: 'SW1',
    version: '16.9.1',
    uptime: '2 days, 3 hours, 15 minutes',
    ports: {
      'fa0/1': { id: 'fa0/1', status: 'connected', vlan: 1, mode: 'access', duplex: 'full', speed: '100', shutdown: false, type: 'fastethernet' },
      'fa0/2': { id: 'fa0/2', status: 'notconnect', vlan: 1, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'fastethernet' },
      'fa0/3': { id: 'fa0/3', status: 'disabled', vlan: 1, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: true, type: 'fastethernet' },
      'gi0/1': { id: 'gi0/1', status: 'connected', vlan: 1, mode: 'trunk', duplex: 'full', speed: '1000', shutdown: false, type: 'gigabitethernet' },
    },
    macAddressTable: [
      { vlan: 1, mac: '0011.2233.4455', port: 'fa0/1', type: 'dynamic' },
      { vlan: 1, mac: '0011.2233.4466', port: 'fa0/2', type: 'dynamic' },
    ],
    vlanDatabase: [
      { vlanId: 1, name: 'default', status: 'active' },
      { vlanId: 10, name: 'Students', status: 'active' },
      { vlanId: 20, name: 'Faculty', status: 'active' },
    ],
    runningConfig: '! Running config\nhostname SW1\nvlan 10\n name Students\nvlan 20\n name Faculty\ninterface fa0/1\n switchport mode access\n switchport access vlan 1\n!',
  };

  it('should generate show version output', () => {
    const output = `netsim IOS Software, Version ${switchState.version}\nSW1 uptime is ${switchState.uptime}`;
    expect(output).toContain('16.9.1');
    expect(output).toContain('2 days');
  });

  it('should generate show interfaces output', () => {
    const ports = Object.values(switchState.ports);
    const statusLines = ports.map(p => `${p.id} is ${p.status}, line protocol is ${p.shutdown ? 'down' : 'up'}`);
    expect(statusLines[0]).toBe('fa0/1 is connected, line protocol is up');
    expect(statusLines[2]).toBe('fa0/3 is disabled, line protocol is down');
  });

  it('should generate show interfaces trunk', () => {
    const trunkPorts = Object.values(switchState.ports).filter(p => p.mode === 'trunk');
    expect(trunkPorts).toHaveLength(1);
    expect(trunkPorts[0].id).toBe('gi0/1');
  });

  it('should generate show mac address-table', () => {
    const table = switchState.macAddressTable;
    expect(table).toHaveLength(2);
    expect(table[0]).toMatchObject({ vlan: 1, mac: '0011.2233.4455', port: 'fa0/1' });
  });

  it('should generate show vlan brief output', () => {
    const vlans = switchState.vlanDatabase;
    expect(vlans).toHaveLength(3);
    const names = vlans.map(v => v.name);
    expect(names).toContain('Students');
    expect(names).toContain('Faculty');
  });

  it('should generate show running-config output', () => {
    const config = switchState.runningConfig;
    expect(config).toContain('hostname SW1');
    expect(config).toContain('vlan 10');
  });

  it('should filter ports by status', () => {
    const ports = Object.values(switchState.ports);
    expect(ports.filter(p => p.status === 'connected')).toHaveLength(2);
    expect(ports.filter(p => p.status === 'notconnect')).toHaveLength(1);
    expect(ports.filter(p => p.shutdown)).toHaveLength(1);
  });

  it('should show interface counters', () => {
    const counters = { 'fa0/1': { packetsIn: 1500, packetsOut: 3200, errors: 0 } };
    expect(counters['fa0/1'].packetsIn).toBe(1500);
    expect(counters['fa0/1'].errors).toBe(0);
  });

  it('should generate show ip interface brief', () => {
    const brief = Object.values(switchState.ports).map(p => ({
      interface: p.id,
      status: p.status,
      protocol: p.shutdown ? 'down' : 'up',
    }));
    expect(brief).toHaveLength(4);
    expect(brief[3].interface).toBe('gi0/1');
  });
});
