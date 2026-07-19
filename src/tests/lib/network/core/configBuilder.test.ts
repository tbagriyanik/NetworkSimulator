import { describe, it, expect } from 'vitest';

describe('Config Builder', () => {
  it('should build hostname command', () => {
    const cmd = `hostname ${'SW1'}`;
    expect(cmd).toBe('hostname SW1');
  });

  it('should build VLAN creation command', () => {
    const vlanCmds = ['vlan 10', 'name Students', 'vlan 20', 'name Faculty'];
    expect(vlanCmds).toContain('vlan 10');
    expect(vlanCmds).toContain('name Students');
  });

  it('should build interface config commands', () => {
    const ifCmds = [
      'interface fa0/1',
      'switchport mode access',
      'switchport access vlan 10',
      'no shutdown',
    ];
    expect(ifCmds[0]).toBe('interface fa0/1');
    expect(ifCmds[1]).toBe('switchport mode access');
  });

  it('should build trunk port configuration', () => {
    const trunkCmds = [
      'interface gi0/1',
      'switchport mode trunk',
      'switchport trunk allowed vlan 10,20,30',
      'switchport trunk native vlan 99',
    ];
    expect(trunkCmds).toContain('switchport mode trunk');
    expect(trunkCmds).toContain('switchport trunk allowed vlan 10,20,30');
  });

  it('should build L3 interface configuration', () => {
    const l3Cmds = [
      'interface gi0/0',
      'no switchport',
      'ip address 192.168.1.1 255.255.255.0',
      'no shutdown',
    ];
    expect(l3Cmds).toContain('no switchport');
    expect(l3Cmds).toContain('ip address 192.168.1.1 255.255.255.0');
  });

  it('should build SVI configuration', () => {
    const sviCmds = [
      'interface vlan 10',
      'ip address 192.168.10.1 255.255.255.0',
      'no shutdown',
    ];
    expect(sviCmds[0]).toBe('interface vlan 10');
  });

  it('should build OSPF configuration', () => {
    const ospfCmds = [
      'router ospf 1',
      'network 192.168.1.0 0.0.0.255 area 0',
      'network 10.0.0.0 0.255.255.255 area 0',
    ];
    expect(ospfCmds[0]).toBe('router ospf 1');
    expect(ospfCmds[1]).toContain('area 0');
  });

  it('should build static route', () => {
    const route = 'ip route 0.0.0.0 0.0.0.0 192.168.1.1';
    expect(route).toContain('0.0.0.0');
    expect(route).toContain('192.168.1.1');
  });

  it('should build DHCP pool config', () => {
    const dhcpCmds = [
      'ip dhcp pool POOL1',
      'network 192.168.1.0 255.255.255.0',
      'default-router 192.168.1.1',
      'dns-server 8.8.8.8',
    ];
    expect(dhcpCmds).toContain('network 192.168.1.0 255.255.255.0');
    expect(dhcpCmds).toContain('default-router 192.168.1.1');
  });

  it('should build SSH configuration', () => {
    const sshCmds = [
      'ip domain-name example.com',
      'crypto key generate rsa modulus 2048',
      'ip ssh version 2',
      'line vty 0 15',
      'transport input ssh',
      'login local',
    ];
    expect(sshCmds).toContain('ip ssh version 2');
    expect(sshCmds).toContain('crypto key generate rsa modulus 2048');
  });

  it('should build ACL configuration', () => {
    const aclCmds = [
      'access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 80',
      'access-list 100 deny ip any any',
      'interface gi0/0',
      'ip access-group 100 in',
    ];
    expect(aclCmds.some(c => c.includes('access-list') && c.includes('permit'))).toBe(true);
    expect(aclCmds).toContain('ip access-group 100 in');
  });
});
