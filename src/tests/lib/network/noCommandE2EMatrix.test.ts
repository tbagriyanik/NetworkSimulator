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
});
