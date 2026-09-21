import { describe, it, expect } from 'vitest';
import { interfaceBasePatterns } from '@/lib/network/parser/interfaceBasePatterns';
import { interfaceFirewallPatterns } from '@/lib/network/parser/interfaceFirewallPatterns';
import { interfacePortPatterns } from '@/lib/network/parser/interfacePortPatterns';
import { interfaceServicesPatterns } from '@/lib/network/parser/interfaceServicesPatterns';
import { lineVlanPatterns } from '@/lib/network/parser/lineVlanPatterns';
import { modePatterns } from '@/lib/network/parser/modePatterns';
import { routingCorePatterns } from '@/lib/network/parser/routingCorePatterns';
import { routingProtocolsPatterns } from '@/lib/network/parser/routingProtocolsPatterns';
import { routingServicesPatterns } from '@/lib/network/parser/routingServicesPatterns';
import { routingSwitchPatterns } from '@/lib/network/parser/routingSwitchPatterns';
import { showPatterns } from '@/lib/network/parser/showPatterns';
import { systemPatterns } from '@/lib/network/parser/systemPatterns';

describe('Parser Pattern Modules', () => {
  describe('interfaceBasePatterns', () => {
    it('matches interface selection and range', () => {
      const ifPattern = interfaceBasePatterns['interface'].pattern;
      expect(ifPattern.test('interface GigabitEthernet0/1')).toBe(true);
      expect(ifPattern.test('interface Fa0/1')).toBe(true);
      expect(ifPattern.test('interface loopback 0')).toBe(true);
      expect(ifPattern.test('interface range Fa0/1 - 4')).toBe(false);

      const rangePattern = interfaceBasePatterns['interface range'].pattern;
      expect(rangePattern.test('interface range Fa0/1 - 4')).toBe(true);
      expect(rangePattern.test('interface range gi0/1-2')).toBe(true);
    });

    it('matches port state commands (shutdown, no shutdown, speed, duplex, ip address)', () => {
      expect(interfaceBasePatterns['shutdown'].pattern.test('shutdown')).toBe(true);
      expect(interfaceBasePatterns['no shutdown'].pattern.test('no shutdown')).toBe(true);
      expect(interfaceBasePatterns['speed'].pattern.test('speed 1000')).toBe(true);
      expect(interfaceBasePatterns['speed'].pattern.test('speed 99999')).toBe(false);
      expect(interfaceBasePatterns['duplex'].pattern.test('duplex full')).toBe(true);

      const ipPat = interfaceBasePatterns['ip address']?.pattern;
      expect(ipPat?.test('ip address 192.168.1.1 255.255.255.0')).toBe(true);
      expect(ipPat?.test('ip address dhcp')).toBe(true);
    });
  });

  describe('interfaceFirewallPatterns', () => {
    it('matches security-level and nameif', () => {
      const secPattern = interfaceFirewallPatterns['security-level']?.pattern;
      expect(secPattern?.test('security-level 100')).toBe(true);
      expect(secPattern?.test('security-level 0')).toBe(true);
      expect(secPattern?.test('security-level invalid')).toBe(false);

      const nameifPattern = interfaceFirewallPatterns['nameif']?.pattern;
      expect(nameifPattern?.test('nameif inside')).toBe(true);
      expect(nameifPattern?.test('nameif dmz')).toBe(true);
    });

    it('matches switchport mode and access/trunk vlan assignment', () => {
      const modePattern = interfaceFirewallPatterns['switchport mode']?.pattern;
      expect(modePattern?.test('switchport mode access')).toBe(true);
      expect(modePattern?.test('switchport mode trunk')).toBe(true);

      const accessVlan = interfaceFirewallPatterns['switchport access vlan']?.pattern;
      expect(accessVlan?.test('switchport access vlan 10')).toBe(true);

      const trunkVlan = interfaceFirewallPatterns['switchport trunk allowed vlan']?.pattern;
      expect(trunkVlan?.test('switchport trunk allowed vlan 10,20,30')).toBe(true);
      expect(trunkVlan?.test('switchport trunk allowed vlan add 40')).toBe(true);
    });

    it('matches port-security configurations', () => {
      const secPattern = interfaceFirewallPatterns['switchport port-security']?.pattern;
      expect(secPattern?.test('switchport port-security')).toBe(true);

      const maxPattern = interfaceFirewallPatterns['switchport port-security maximum']?.pattern;
      expect(maxPattern?.test('switchport port-security maximum 5')).toBe(true);

      const violPattern = interfaceFirewallPatterns['switchport port-security violation']?.pattern;
      expect(violPattern?.test('switchport port-security violation restrict')).toBe(true);
      expect(violPattern?.test('switchport port-security violation shutdown')).toBe(true);
    });
  });

  describe('interfacePortPatterns', () => {
    it('matches channel-group, storm-control, and ip helper-address', () => {
      const cgPattern = interfacePortPatterns['channel-group']?.pattern;
      expect(cgPattern?.test('channel-group 1 mode active')).toBe(true);
      expect(cgPattern?.test('channel-group 5 mode on')).toBe(true);

      const scPattern = interfacePortPatterns['storm-control']?.pattern;
      expect(scPattern?.test('storm-control broadcast level 50')).toBe(true);

      const helperPat = interfacePortPatterns['ip helper-address']?.pattern;
      expect(helperPat?.test('ip helper-address 192.168.1.254')).toBe(true);
    });

    it('matches multicast PIM and IGMP interface configurations', () => {
      const pimPat = interfacePortPatterns['ip pim']?.pattern;
      expect(pimPat?.test('ip pim sparse-mode')).toBe(true);
      expect(pimPat?.test('ip pim dense-mode')).toBe(true);

      const igmpPat = interfacePortPatterns['ip igmp']?.pattern;
      expect(igmpPat?.test('ip igmp join-group 239.1.1.1')).toBe(true);
      expect(igmpPat?.test('ip igmp version 2')).toBe(true);
    });
  });

  describe('interfaceServicesPatterns', () => {
    it('matches voice vlan, cdp/lldp transmit and dot1x port-control', () => {
      const voicePat = interfaceServicesPatterns['switchport voice vlan']?.pattern;
      expect(voicePat?.test('switchport voice vlan 100')).toBe(true);
      expect(voicePat?.test('switchport voice vlan dot1p')).toBe(true);

      const cdpPat = interfaceServicesPatterns['cdp enable']?.pattern;
      expect(cdpPat?.test('cdp enable')).toBe(true);

      const lldpPat = interfaceServicesPatterns['lldp transmit']?.pattern;
      expect(lldpPat?.test('lldp transmit')).toBe(true);

      const dot1xPat = interfaceServicesPatterns['dot1x port-control']?.pattern;
      expect(dot1xPat?.test('dot1x port-control auto')).toBe(true);
      expect(dot1xPat?.test('dot1x port-control force-authorized')).toBe(true);
    });
  });

  describe('lineVlanPatterns', () => {
    it('matches vlan submode commands (name, state)', () => {
      const namePat = lineVlanPatterns['name']?.pattern;
      expect(namePat?.test('name SALES_DEPARTMENT')).toBe(true);

      const statePat = lineVlanPatterns['state']?.pattern;
      expect(statePat?.test('state active')).toBe(true);
      expect(statePat?.test('state suspend')).toBe(true);
    });
  });

  describe('modePatterns', () => {
    it('matches mode transitions and global commands (configure terminal, enable, exit, end, vlan, hostname, ip route)', () => {
      expect(modePatterns['configure terminal']?.pattern.test('configure terminal')).toBe(true);
      expect(modePatterns['configure terminal']?.pattern.test('conf t')).toBe(true);
      expect(modePatterns['enable']?.pattern.test('enable')).toBe(true);
      expect(modePatterns['exit']?.pattern.test('exit')).toBe(true);
      expect(modePatterns['end']?.pattern.test('end')).toBe(true);

      const vlanPat = modePatterns['vlan']?.pattern;
      expect(vlanPat?.test('vlan 10')).toBe(true);
      expect(vlanPat?.test('vlan 10 name MANAGEMENT')).toBe(true);
      expect(vlanPat?.test('vlan invalid')).toBe(false);

      const hostPat = modePatterns['hostname']?.pattern;
      expect(hostPat?.test('hostname CoreSwitch01')).toBe(true);

      const ipRoute = modePatterns['ip route']?.pattern;
      expect(ipRoute?.test('ip route 0.0.0.0 0.0.0.0 192.168.1.1')).toBe(true);
      expect(ipRoute?.test('ip route 10.0.0.0 255.0.0.0 GigabitEthernet0/1')).toBe(true);
    });
  });

  describe('routingCorePatterns & routingProtocolsPatterns', () => {
    it('matches router ospf, eigrp, rip, and bgp protocol commands', () => {
      const ospfPat = routingCorePatterns['router ospf']?.pattern;
      expect(ospfPat?.test('router ospf 1')).toBe(true);

      const eigrpPat = routingProtocolsPatterns['router eigrp']?.pattern;
      expect(eigrpPat?.test('router eigrp 100')).toBe(true);

      const bgpPat = routingProtocolsPatterns['router bgp']?.pattern;
      expect(bgpPat?.test('router bgp 65000')).toBe(true);

      const ripPat = routingCorePatterns['router rip']?.pattern;
      expect(ripPat?.test('router rip')).toBe(true);
    });
  });

  describe('routingServicesPatterns & routingSwitchPatterns', () => {
    it('matches spanning-tree, vtp, and lldp timers', () => {
      const stpPat = routingSwitchPatterns['spanning-tree mode']?.pattern;
      expect(stpPat?.test('spanning-tree mode rapid-pvst')).toBe(true);
      expect(stpPat?.test('spanning-tree mode mst')).toBe(true);

      const vtpPat = routingServicesPatterns['vtp mode']?.pattern;
      expect(vtpPat?.test('vtp mode server')).toBe(true);
      expect(vtpPat?.test('vtp mode client')).toBe(true);

      const vtpDom = routingServicesPatterns['vtp domain']?.pattern;
      expect(vtpDom?.test('vtp domain LAB_DOMAIN')).toBe(true);
    });
  });

  describe('showPatterns & systemPatterns', () => {
    it('matches show ip route, show ip int brief, show vlan brief', () => {
      expect(showPatterns['show ip route']?.pattern.test('show ip route')).toBe(true);
      expect(showPatterns['show ip interface brief']?.pattern.test('show ip interface brief')).toBe(true);
      expect(showPatterns['show vlan brief']?.pattern.test('show vlan brief')).toBe(true);
      expect(showPatterns['show running-config']?.pattern.test('show running-config')).toBe(true);
    });

    it('matches system global and service commands (ping, write memory, standby, ip dhcp pool)', () => {
      expect(systemPatterns['ping']?.pattern.test('ping 10.0.0.1')).toBe(true);
      expect(systemPatterns['write memory']?.pattern.test('write memory')).toBe(true);
      expect(systemPatterns['copy running-config startup-config']?.pattern.test('copy running-config startup-config')).toBe(true);

      const hsrpPat = systemPatterns['standby ip']?.pattern;
      expect(hsrpPat?.test('standby 1 ip 192.168.1.254')).toBe(true);

      const hsrpPrio = systemPatterns['standby priority']?.pattern;
      expect(hsrpPrio?.test('standby 1 priority 110')).toBe(true);

      const dhcpPat = systemPatterns['ip dhcp pool']?.pattern;
      expect(dhcpPat?.test('ip dhcp pool LAN_POOL')).toBe(true);
    });
  });
});
