import { describe, it, expect } from 'vitest';
import { executeCommand } from '../../../lib/network/executor';
import { createInitialState } from '../../../lib/network/initialState';
import type { SwitchState } from '../../../lib/network/types';

describe('Comprehensive Missing CLI Commands Tests (High + Medium + Low)', () => {
  const createBaseState = (): SwitchState => {
    const base = createInitialState('Router-Test', 'NS-L3-24PS');
    return {
      ...base,
      deviceType: 'switchL3',
      currentMode: 'config',
      ipRouting: true,
      ports: {
        ...base.ports,
        'gi0/1': {
          id: 'gi0/1',
          name: 'GigabitEthernet0/1',
          status: 'connected',
          vlan: 1,
          mode: 'routed',
          duplex: 'auto',
          speed: 'auto',
          shutdown: false,
          type: 'gigabitethernet',
          ipAddress: '192.168.1.1',
          subnetMask: '255.255.255.0',
        },
        'tunnel0': {
          id: 'tunnel0',
          name: 'Tunnel0',
          status: 'connected',
          vlan: 1,
          mode: 'routed',
          duplex: 'auto',
          speed: 'auto',
          shutdown: false,
          type: 'tunnel',
          ipAddress: '10.10.10.1',
          subnetMask: '255.255.255.0',
        }
      }
    };
  };

  describe('Faz 1: Yüksek Öncelik (Multicast, STP ve IPSec Tunnel)', () => {
    it('ip multicast-routing global configuration and show ip mroute', () => {
      let state = createBaseState();
      
      // ip multicast-routing
      let res = executeCommand(state, 'ip multicast-routing');
      expect(res.success).toBe(true);
      expect(res.newState?.multicastRoutingEnabled).toBe(true);
      state = { ...state, ...res.newState };

      // show ip mroute
      state.currentMode = 'privileged';
      res = executeCommand(state, 'show ip mroute');
      expect(res.success).toBe(true);
      expect(res.output).toContain('IP Multicast Routing Table');

      // no ip multicast-routing
      state.currentMode = 'config';
      res = executeCommand(state, 'no ip multicast-routing');
      expect(res.success).toBe(true);
      expect(res.newState?.multicastRoutingEnabled).toBe(false);
    });

    it('ip pim sparse-mode / dense-mode on interface and show ip pim', () => {
      let state = createBaseState();
      state.currentMode = 'interface';
      state.currentInterface = 'gi0/1';

      // ip pim sparse-mode
      let res = executeCommand(state, 'ip pim sparse-mode');
      expect(res.success).toBe(true);
      expect(res.newState?.ports?.['gi0/1']?.pimMode).toBe('sparse-mode');
      state = { ...state, ...res.newState };

      // show ip pim interface
      state.currentMode = 'privileged';
      res = executeCommand(state, 'show ip pim interface');
      expect(res.success).toBe(true);
      expect(res.output).toContain('gi0/1');

      // show ip pim neighbor
      res = executeCommand(state, 'show ip pim neighbor');
      expect(res.success).toBe(true);
      expect(res.output).toContain('PIM Neighbor Table');

      // no ip pim
      state.currentMode = 'interface';
      res = executeCommand(state, 'no ip pim');
      expect(res.success).toBe(true);
      expect(res.newState?.ports?.['gi0/1']?.pimMode).toBeUndefined();
    });

    it('ip igmp join-group & version and show ip igmp groups', () => {
      let state = createBaseState();
      state.currentMode = 'interface';
      state.currentInterface = 'gi0/1';

      // ip igmp version 3
      let res = executeCommand(state, 'ip igmp version 3');
      expect(res.success).toBe(true);
      expect(res.newState?.ports?.['gi0/1']?.igmpVersion).toBe(3);
      state = { ...state, ...res.newState };

      // ip igmp join-group 239.1.1.1
      res = executeCommand(state, 'ip igmp join-group 239.1.1.1');
      expect(res.success).toBe(true);
      expect(res.newState?.ports?.['gi0/1']?.igmpGroups).toContain('239.1.1.1');
      state = { ...state, ...res.newState };

      // show ip igmp groups
      state.currentMode = 'privileged';
      res = executeCommand(state, 'show ip igmp groups');
      expect(res.success).toBe(true);
      expect(res.output).toContain('239.1.1.1');

      // no ip igmp join-group
      state.currentMode = 'interface';
      res = executeCommand(state, 'no ip igmp join-group 239.1.1.1');
      expect(res.success).toBe(true);
      expect(res.newState?.ports?.['gi0/1']?.igmpGroups).not.toContain('239.1.1.1');
    });

    it('spanning-tree uplinkfast and backbonefast', () => {
      let state = createBaseState();
      state.deviceType = 'switchL3';
      state.currentMode = 'config';

      // spanning-tree uplinkfast
      let res = executeCommand(state, 'spanning-tree uplinkfast');
      expect(res.success).toBe(true);
      expect(res.newState?.stpUplinkFast).toBe(true);
      state = { ...state, ...res.newState };

      // no spanning-tree uplinkfast
      res = executeCommand(state, 'no spanning-tree uplinkfast');
      expect(res.success).toBe(true);
      expect(res.newState?.stpUplinkFast).toBe(false);

      // spanning-tree backbonefast
      res = executeCommand(state, 'spanning-tree backbonefast');
      expect(res.success).toBe(true);
      expect(res.newState?.stpBackboneFast).toBe(true);
      state = { ...state, ...res.newState };

      // no spanning-tree backbonefast
      res = executeCommand(state, 'no spanning-tree backbonefast');
      expect(res.success).toBe(true);
      expect(res.newState?.stpBackboneFast).toBe(false);
    });

    it('tunnel protection ipsec profile', () => {
      let state = createBaseState();
      state.currentMode = 'interface';
      state.currentInterface = 'tunnel0';

      // tunnel protection ipsec profile IPSEC-PROF
      let res = executeCommand(state, 'tunnel protection ipsec profile IPSEC-PROF');
      expect(res.success).toBe(true);
      expect(res.newState?.ports?.['tunnel0']?.tunnelProtectionProfile).toBe('IPSEC-PROF');
      state = { ...state, ...res.newState };

      // no tunnel protection
      res = executeCommand(state, 'no tunnel protection');
      expect(res.success).toBe(true);
      expect(res.newState?.ports?.['tunnel0']?.tunnelProtectionProfile).toBeUndefined();
    });
  });

  describe('Faz 2: Orta Öncelik (SNMPv3, BGP Advanced, IP SLA Responder, CBAC)', () => {
    it('snmp-server group, user, and host with show snmp user/group', () => {
      let state = createBaseState();
      state.currentMode = 'config';

      // snmp-server group
      let res = executeCommand(state, 'snmp-server group ADMINS v3 priv');
      expect(res.success).toBe(true);
      expect(res.newState?.snmpGroups?.[0]?.name).toBe('ADMINS');
      expect(res.newState?.snmpGroups?.[0]?.secLevel).toBe('priv');
      state = { ...state, ...res.newState };

      // snmp-server user
      res = executeCommand(state, 'snmp-server user netadmin ADMINS v3 auth sha MyAuthPass priv aes MyPrivPass');
      expect(res.success).toBe(true);
      expect(res.newState?.snmpUsers?.[0]?.username).toBe('netadmin');
      state = { ...state, ...res.newState };

      // snmp-server host
      res = executeCommand(state, 'snmp-server host 192.168.1.100 traps version 3 netadmin');
      expect(res.success).toBe(true);
      expect(res.newState?.snmpHosts?.[0]?.host).toBe('192.168.1.100');
      state = { ...state, ...res.newState };

      // show snmp group
      state.currentMode = 'privileged';
      res = executeCommand(state, 'show snmp group');
      expect(res.success).toBe(true);
      expect(res.output).toContain('ADMINS');

      // show snmp user
      res = executeCommand(state, 'show snmp user');
      expect(res.success).toBe(true);
      expect(res.output).toContain('netadmin');
    });

    it('bgp confederation, always-compare-med, and bestpath', () => {
      let state = createBaseState();
      state.currentMode = 'router-config';
      state.routingProtocol = 'bgp';

      // bgp confederation identifier 65000
      let res = executeCommand(state, 'bgp confederation identifier 65000');
      expect(res.success).toBe(true);
      expect(res.newState?.bgpConfederationId).toBe(65000);
      state = { ...state, ...res.newState };

      // bgp confederation peers 65001 65002
      res = executeCommand(state, 'bgp confederation peers 65001 65002');
      expect(res.success).toBe(true);
      expect(res.newState?.bgpConfederationPeers).toEqual([65001, 65002]);
      state = { ...state, ...res.newState };

      // bgp always-compare-med
      res = executeCommand(state, 'bgp always-compare-med');
      expect(res.success).toBe(true);
      expect(res.newState?.bgpAlwaysCompareMed).toBe(true);

      // bgp bestpath as-path ignore
      res = executeCommand(state, 'bgp bestpath as-path ignore');
      expect(res.success).toBe(true);
      expect(res.newState?.bgpBestpathConfig?.asPathIgnore).toBe(true);
    });

    it('ip sla responder', () => {
      let state = createBaseState();
      state.currentMode = 'config';

      // ip sla responder
      let res = executeCommand(state, 'ip sla responder');
      expect(res.success).toBe(true);
      expect(res.newState?.ipSlaResponder).toBe(true);
      state = { ...state, ...res.newState };

      // show ip sla responder
      state.currentMode = 'privileged';
      res = executeCommand(state, 'show ip sla responder');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Enabled');

      // no ip sla responder
      state.currentMode = 'config';
      res = executeCommand(state, 'no ip sla responder');
      expect(res.success).toBe(true);
      expect(res.newState?.ipSlaResponder).toBe(false);
    });

    it('ip inspect (CBAC) global and interface', () => {
      let state = createBaseState();
      state.currentMode = 'config';

      // ip inspect name FW_RULE tcp alert on
      let res = executeCommand(state, 'ip inspect name FW_RULE tcp alert on');
      expect(res.success).toBe(true);
      expect(res.newState?.inspectRules?.['FW_RULE']).toBeDefined();
      state = { ...state, ...res.newState };

      // interface mode: ip inspect FW_RULE in
      state.currentMode = 'interface';
      state.currentInterface = 'gi0/1';
      res = executeCommand(state, 'ip inspect FW_RULE in');
      expect(res.success).toBe(true);
      expect(res.newState?.ports?.['gi0/1']?.inspectRules?.in).toBe('FW_RULE');
      state = { ...state, ...res.newState };

      // show ip inspect config
      state.currentMode = 'privileged';
      res = executeCommand(state, 'show ip inspect config');
      expect(res.success).toBe(true);
      expect(res.output).toContain('FW_RULE');
    });
  });

  describe('Faz 3: Düşük Öncelik (EEM & NETCONF)', () => {
    it('event manager applet with event and action', () => {
      let state = createBaseState();
      state.currentMode = 'config';

      // event manager applet TEST_EEM
      let res = executeCommand(state, 'event manager applet TEST_EEM');
      expect(res.success).toBe(true);
      expect(res.modeChange).toBe('config-applet');
      expect(res.newState?.currentEemApplet).toBe('TEST_EEM');
      state = { ...state, ...res.newState, currentMode: 'config-applet' };

      // event syslog pattern "LINK-3-UPDOWN"
      res = executeCommand(state, 'event syslog pattern LINK-3-UPDOWN');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };

      // action 1.0 syslog msg "Link status changed!"
      res = executeCommand(state, 'action 1.0 syslog msg Link status changed!');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };

      // show event manager applet all
      state.currentMode = 'privileged';
      res = executeCommand(state, 'show event manager applet all');
      expect(res.success).toBe(true);
      expect(res.output).toContain('applet: TEST_EEM');
      expect(res.output).toContain('LINK-3-UPDOWN');
      expect(res.output).toContain('Link status changed');
    });

    it('netconf-yang and netconf ssh', () => {
      let state = createBaseState();
      state.currentMode = 'config';

      // netconf-yang
      let res = executeCommand(state, 'netconf-yang');
      expect(res.success).toBe(true);
      expect(res.newState?.netconfYangEnabled).toBe(true);
      state = { ...state, ...res.newState };

      // netconf ssh
      res = executeCommand(state, 'netconf ssh');
      expect(res.success).toBe(true);
      expect(res.newState?.netconfSshEnabled).toBe(true);
      state = { ...state, ...res.newState };

      // show netconf-yang status
      state.currentMode = 'privileged';
      res = executeCommand(state, 'show netconf-yang status');
      expect(res.success).toBe(true);
      expect(res.output).toContain('running');
      expect(res.output).toContain('port 830');
    });
  });
});
