import { describe, it, expect } from 'vitest';
import { BehavioralRegressionEngine, BehavioralTestCase } from '@/lib/network/regression/behavioralRegressionEngine';
import { createInitialState, createInitialRouterState } from '@/lib/network/initialState';
import { SwitchState } from '@/lib/network/types';

describe('Behavioral Regression System', () => {
  const routerBase = createInitialRouterState('00:11:22:33:44:55');
  const switchL2Base = createInitialState('00:aa:bb:cc:dd:01', 'NS-L2-24TT-L');

  it('1. CLI Mode & Context Transitions Matrix', () => {
    const test: BehavioralTestCase = {
      id: 'reg-01',
      name: 'CLI Mode & Context Transitions',
      category: 'cli_mode',
      initialState: routerBase,
      testCommands: [
        'enable',
        'configure terminal',
        'interface GigabitEthernet0/0',
        'exit',
        'router ospf 1',
        'exit',
        'line vty 0 4',
        'end'
      ],
      expectedStateCheck: (state: SwitchState) => {
        return state.currentMode === 'privileged';
      }
    };

    const res = BehavioralRegressionEngine.runTest(test);
    expect(res.passed).toBe(true);
  });

  it('2. Static Routing & Connected Route Insertion', () => {
    const test: BehavioralTestCase = {
      id: 'reg-02',
      name: 'Static Routing Insertion & Show Output',
      category: 'routing',
      initialState: routerBase,
      testCommands: [
        'enable',
        'configure terminal',
        'interface GigabitEthernet0/0',
        'no shutdown',
        'ip address 192.168.1.1 255.255.255.0',
        'exit',
        'ip route 10.0.0.0 255.255.255.0 192.168.1.2',
        'end'
      ],
      expectedStateCheck: (state: SwitchState) => {
        return (
          state.ipRouting === true &&
          (state.staticRoutes ?? []).some(r => r.destination === '10.0.0.0' && r.nextHop === '192.168.1.2')
        );
      },
      expectedShowOutputs: [
        {
          command: 'show ip route',
          contains: ['Codes: C - connected', '10.0.0.0', '192.168.1.2']
        }
      ]
    };

    const res = BehavioralRegressionEngine.runTest(test);
    expect(res.passed).toBe(true);
  });

  it('3. ACL Rule Application & Running Config Verification', () => {
    const test: BehavioralTestCase = {
      id: 'reg-03',
      name: 'ACL Configuration and Verification',
      category: 'acl',
      initialState: routerBase,
      testCommands: [
        'enable',
        'configure terminal',
        'access-list 100 deny ip host 192.168.1.10 any',
        'access-list 100 permit ip any any',
        'interface GigabitEthernet0/0',
        'ip access-group 100 in',
        'end'
      ],
      expectedStateCheck: (state: SwitchState) => {
        return state.ports?.['gi0/0']?.accessGroupIn === '100';
      },
      expectedShowOutputs: [
        {
          command: 'show running-config',
          contains: ['access-list 100 deny', 'ip access-group 100 in']
        }
      ]
    };

    const res = BehavioralRegressionEngine.runTest(test);
    expect(res.passed).toBe(true);
  });

  it('4. Full Suite Runner Execution', () => {
    const suite: BehavioralTestCase[] = [
      {
        id: 'suite-01',
        name: 'VLAN Creation & Membership',
        category: 'switching',
        initialState: switchL2Base,
        testCommands: [
          'enable',
          'configure terminal',
          'vlan 10',
          'name Sales',
          'exit',
          'interface FastEthernet0/1',
          'switchport mode access',
          'switchport access vlan 10',
          'end'
        ],
        expectedStateCheck: (s) => s.vlans?.[10]?.name === 'Sales' && s.ports['fa0/1']?.vlan === 10,
        expectedShowOutputs: [
          {
            command: 'show vlan brief',
            contains: ['10', 'Sales']
          }
        ]
      },
      {
        id: 'suite-02',
        name: 'OSPF Router ID & Process Initialization',
        category: 'routing',
        initialState: routerBase,
        testCommands: [
          'enable',
          'configure terminal',
          'router ospf 1',
          'router-id 1.1.1.1',
          'network 192.168.1.0 0.0.0.255 area 0',
          'end'
        ],
        expectedStateCheck: (s) => s.ospf?.routerId === '1.1.1.1' || s.ospfRouterId === '1.1.1.1' || s.routerId === '1.1.1.1',
        expectedShowOutputs: [
          {
            command: 'show ip ospf',
            contains: ['1.1.1.1']
          }
        ]
      }
    ];

    const suiteRes = BehavioralRegressionEngine.runSuite(suite);
    expect(suiteRes.passed).toBe(true);
    expect(suiteRes.total).toBe(2);
  });
});
