import { describe, it, expect } from 'vitest';
import { createInitialState, createInitialRouterState } from '@/lib/network/initialState';
import { verifyCliStateEnginePacketChain, ChainVerificationStep } from '@/lib/network/core/cliStateEnginePacketVerifier';

describe("E2E Test Matrix for 'no' Commands", () => {
  const switchBase = createInitialState('00:aa:bb:cc:dd:01', 'NS-L2-24TT-L');
  const routerBase = createInitialRouterState('00:11:22:33:44:55');

  it("1. 'no ip address' removes IP and connected route", () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Configure IP address on Router',
        cliCommands: [
          'enable',
          'configure terminal',
          'interface GigabitEthernet0/0',
          'no shutdown',
          'ip address 192.168.10.1 255.255.255.0'
        ],
        stateInvariants: (s) => s.ports['gi0/0']?.ipAddress === '192.168.10.1'
      },
      {
        name: 'Execute no ip address',
        cliCommands: ['no ip address'],
        stateInvariants: (s) => !s.ports['gi0/0']?.ipAddress
      }
    ];

    const res = verifyCliStateEnginePacketChain(routerBase, steps);
    expect(res.passed).toBe(true);
  });

  it("2. 'shutdown' and 'no shutdown' toggles interface status and line protocol", () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Shutdown port',
        cliCommands: [
          'enable',
          'configure terminal',
          'interface FastEthernet0/1',
          'shutdown'
        ],
        stateInvariants: (s) => s.ports['fa0/1']?.shutdown === true
      },
      {
        name: 'No shutdown port',
        cliCommands: ['no shutdown'],
        stateInvariants: (s) => s.ports['fa0/1']?.shutdown === false
      }
    ];

    const res = verifyCliStateEnginePacketChain(switchBase, steps);
    expect(res.passed).toBe(true);
  });

  it("3. 'no router ospf' clears OSPF process and routes", () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Enable OSPF',
        cliCommands: [
          'enable',
          'configure terminal',
          'router ospf 1',
          'network 10.0.0.0 0.255.255.255 area 0'
        ],
        stateInvariants: (s) => s.ospf?.processId === 1 || s.ospfProcessId === 1 || s.ospfProcessId === '1'
      },
      {
        name: 'Remove OSPF',
        cliCommands: ['exit', 'no router ospf 1'],
        stateInvariants: (s) => !s.ospfProcessId && (!s.ospf || s.ospf.processId === undefined)
      }
    ];

    const res = verifyCliStateEnginePacketChain(routerBase, steps);
    expect(res.passed).toBe(true);
  });

  it("4. 'no ip access-group' removes interface ACL filter", () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Bind ACL to interface',
        cliCommands: [
          'enable',
          'configure terminal',
          'access-list 10 permit 192.168.1.0 0.0.0.255',
          'interface GigabitEthernet0/0',
          'ip access-group 10 in'
        ],
        stateInvariants: (s) => s.ports['gi0/0']?.accessGroupIn === '10'
      },
      {
        name: 'Remove ACL binding',
        cliCommands: ['no ip access-group 10 in'],
        stateInvariants: (s) => !s.ports['gi0/0']?.accessGroupIn
      }
    ];

    const res = verifyCliStateEnginePacketChain(routerBase, steps);
    expect(res.passed).toBe(true);
  });

  it("5. 'no vlan' removes custom VLAN", () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Create VLAN 50',
        cliCommands: [
          'enable',
          'configure terminal',
          'vlan 50'
        ],
        stateInvariants: (s) => !!s.vlans?.[50]
      },
      {
        name: 'Delete VLAN 50',
        cliCommands: ['exit', 'no vlan 50'],
        stateInvariants: (s) => !s.vlans?.[50]
      }
    ];

    const res = verifyCliStateEnginePacketChain(switchBase, steps);
    expect(res.passed).toBe(true);
  });

  it("6. 'no switchport access vlan' resets port to default VLAN 1", () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Assign VLAN 20',
        cliCommands: [
          'enable',
          'configure terminal',
          'interface FastEthernet0/2',
          'switchport mode access',
          'switchport access vlan 20'
        ],
        stateInvariants: (s) => s.ports['fa0/2']?.vlan === 20
      },
      {
        name: 'Reset access vlan',
        cliCommands: ['no switchport access vlan'],
        stateInvariants: (s) => s.ports['fa0/2']?.vlan === 1
      }
    ];

    const res = verifyCliStateEnginePacketChain(switchBase, steps);
    expect(res.passed).toBe(true);
  });

  it("7. FHRP: 'no standby' cleanly removes HSRP group configuration", () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Configure HSRP standby group',
        cliCommands: [
          'enable',
          'configure terminal',
          'interface GigabitEthernet0/0',
          'standby 1 ip 192.168.1.254',
          'standby 1 priority 110',
          'standby 1 preempt'
        ],
        stateInvariants: (s) => s.ports['gi0/0']?.hsrp?.groups?.[1]?.virtualIp === '192.168.1.254' && s.ports['gi0/0']?.hsrp?.groups?.[1]?.preempt === true
      },
      {
        name: 'Remove HSRP standby group',
        cliCommands: ['no standby 1'],
        stateInvariants: (s) => !s.ports['gi0/0']?.hsrp?.groups?.[1]
      }
    ];

    const res = verifyCliStateEnginePacketChain(routerBase, steps);
    expect(res.passed).toBe(true);
  });

  it("8. EtherChannel: 'no channel-group' and 'no interface Port-channel' tear down EtherChannel bundles", () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Configure EtherChannel group 1',
        cliCommands: [
          'enable',
          'configure terminal',
          'interface FastEthernet0/1',
          'channel-group 1 mode active'
        ],
        stateInvariants: (s) => (s.ports['fa0/1']?.channelGroup === 1 || s.ports['FastEthernet0/1']?.channelGroup === 1) && (s.ports['fa0/1']?.channelMode === 'active' || s.ports['FastEthernet0/1']?.channelMode === 'active')
      },
      {
        name: 'Remove channel-group from interface',
        cliCommands: ['no channel-group'],
        stateInvariants: (s) => (s.ports['fa0/1']?.channelGroup === undefined && s.ports['FastEthernet0/1']?.channelGroup === undefined)
      },
      {
        name: 'Create and then remove interface Port-channel 1',
        cliCommands: [
          // The previous step left the CLI in config-if mode. `interface` is a
          // config-mode command, so IOS requires an `exit` first.
          'exit',
          'interface Port-channel 1',
          'exit',
          'no interface Port-channel 1'
        ],
        stateInvariants: (s) => !s.ports['Port-channel1'] && !s.ports['port-channel1'] && !s.ports['po1']
      }
    ];

    const switch8 = createInitialState('00:aa:bb:cc:dd:08', 'NS-L2-24TT-L');
    const res = verifyCliStateEnginePacketChain(switch8, steps);
    const failureMsg = res.stepResults
      .filter(s => !s.overallPass)
      .map(s => `${s.stepName}: cliOk=${s.cliSuccess}, statePass=${s.stateVerification.pass} (${s.stateVerification.reason || ''}), outputs=${JSON.stringify(s.cliOutputs)}`)
      .join(' | ');
    expect(res.passed ? 'PASSED' : failureMsg).toBe('PASSED');
  });

  it("9. NAT: 'no ip nat inside source list ... overload' and static NAT teardown", () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Configure NAT overload and static rule',
        cliCommands: [
          'enable',
          'configure terminal',
          'ip nat pool POOL1 203.0.113.10 203.0.113.20 netmask 255.255.255.0',
          'ip nat inside source list 1 interface GigabitEthernet0/0 overload',
          'ip nat inside source static 192.168.1.50 203.0.113.5'
        ],
        stateInvariants: (s) => !!s.natPools?.['POOL1'] && (s.natDynamicRules?.length ?? 0) > 0 && (s.natStaticTranslations?.length ?? 0) > 0
      },
      {
        name: 'Remove NAT rules and pool',
        cliCommands: [
          'no ip nat inside source list 1 interface GigabitEthernet0/0 overload',
          'no ip nat inside source static 192.168.1.50 203.0.113.5',
          'no ip nat pool POOL1'
        ],
        stateInvariants: (s) => !s.natPools?.['POOL1'] && (s.natDynamicRules?.length ?? 0) === 0 && (s.natStaticTranslations?.length ?? 0) === 0
      }
    ];

    const res = verifyCliStateEnginePacketChain(routerBase, steps);
    expect(res.passed).toBe(true);
  });

  it("10. BGP: 'no neighbor <ip>' and 'no router bgp' remove neighbor and clear BGP state", () => {
    const steps: ChainVerificationStep[] = [
      {
        name: 'Configure BGP router and neighbor',
        cliCommands: [
          'enable',
          'configure terminal',
          'router bgp 65001',
          'neighbor 192.168.1.2 remote-as 65002',
          'neighbor 192.168.1.2 weight 50'
        ],
        stateInvariants: (s) => s.routingProtocol === 'bgp' && (s.bgpNeighbors?.some(n => n.ip === '192.168.1.2') ?? false)
      },
      {
        name: 'Remove neighbor weight and neighbor',
        cliCommands: [
          'no neighbor 192.168.1.2 weight',
          'no neighbor 192.168.1.2'
        ],
        stateInvariants: (s) => !(s.bgpNeighbors?.some(n => n.ip === '192.168.1.2') ?? false)
      },
      {
        name: 'Disable BGP process completely',
        cliCommands: [
          'exit',
          'no router bgp 65001'
        ],
        stateInvariants: (s) => s.routingProtocol === 'none' && (s.bgpNeighbors?.length ?? 0) === 0 && !s.bgpAs
      }
    ];

    const res = verifyCliStateEnginePacketChain(routerBase, steps);
    expect(res.passed).toBe(true);
  });
});

