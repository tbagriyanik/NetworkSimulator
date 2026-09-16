import { createSwitchDevice, createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import { createInitialState, createInitialRouterState } from '../initialState';
import type { CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';

/**
 * HSRP Redundancy Basic
 * Senaryo:
 *   Ä°ki yÃ¶nlendirici (R1 ve R2) HSRP Grubu 1 oluÅŸturarak sanal varsayÄ±lan aÄŸ geÃ§idi (192.168.10.254) olarak hizmet verir.
 *   - R1 (Active Gateway):  IP 192.168.10.2/24, Standby Group 1 (Virtual IP: 192.168.10.254, Priority: 110, Preempt: True)
 *   - R2 (Standby Gateway): IP 192.168.10.3/24, Standby Group 1 (Virtual IP: 192.168.10.254, Priority: 90)
 *   - PC-1 & PC-2: Gateway = 192.168.10.254 (Sanal IP)
 *
 * Test:
 *   1) R1# show standby brief  â†’ R1 'Active' gÃ¶rÃ¼nÃ¼r.
 *   2) R2# show standby brief  â†’ R2 'Standby' gÃ¶rÃ¼nÃ¼r.
 *   3) PC-1: ping 192.168.10.254 â†’ BaÅŸarÄ±lÄ±.
 *   4) Failover: R1 gi0/0 shutdown edildiÄŸinde R2 otomatik 'Active' moda geÃ§er ve ping kesintisiz sÃ¼rer.
 */
const example = (isTr: boolean): ExampleProject => {
  // â”€â”€ Cihazlar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const devices = [
    createPcDevice('pc-1', 'PC-1', 120, 150, '192.168.10.10', 1, '192.168.10.254'),
    createPcDevice('pc-2', 'PC-2', 120, 300, '192.168.10.11', 1, '192.168.10.254'),
    createSwitchDevice('sw1', 'SW1', 320, 225, '192.168.10.250'),
    createRouterDevice('r1', 'R1', 540, 130, '192.168.10.2'),
    createRouterDevice('r2', 'R2', 540, 320, '192.168.10.3')
  ];
  devices[0].ipConfigMode = 'static';
  devices[1].ipConfigMode = 'static';
  devices[2].ipConfigMode = 'static';
  devices[3].ipConfigMode = 'static';
  devices[4].ipConfigMode = 'static';

  // â”€â”€ BaÄŸlantÄ±lar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const connections: CanvasConnection[] = [];
  connectPorts(devices, connections, 'pc-1', 'eth0', 'sw1', 'fa0/1');
  connectPorts(devices, connections, 'pc-2', 'eth0', 'sw1', 'fa0/2');
  connectPorts(devices, connections, 'sw1', 'gi0/1', 'r1', 'gi0/0', 'crossover');
  connectPorts(devices, connections, 'sw1', 'gi0/2', 'r2', 'gi0/0', 'crossover');

  // â”€â”€ Not / Canvas aÃ§Ä±klamasÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const notes: CanvasNote[] = [
    {
      id: 'hsrp-note',
      text: isTr
        ? 'AmaÃ§: HSRP (Hot Standby Router Protocol) ile iki yÃ¶nlendirici (R1 ve R2) arasÄ±nda varsayÄ±lan aÄŸ geÃ§idi (192.168.10.254) yedekliliÄŸi saÄŸlamak.\n\nHSRP YapÄ±landÄ±rmasÄ±:\n  - Sanal Gateway IP (VIP): 192.168.10.254 (Standby Group 1)\n  - R1 (Birincil / Active): IP 192.168.10.2, Ã–ncelik (Priority) 110, Preempt: AÃ§Ä±k\n  - R2 (Yedek / Standby): IP 192.168.10.3, Ã–ncelik (Priority) 90\n\nâœ… TEST ADIMLARI:\n\n1) R1 terminalinde HSRP durumunu kontrol et:\n   R1# show standby brief\n   â†’ R1\'in Active durumda olduÄŸunu doÄŸrula (State: Active)\n\n2) R2 terminalinde HSRP durumunu kontrol et:\n   R2# show standby brief\n   â†’ R2\'nin Standby durumda olduÄŸunu doÄŸrula (State: Standby)\n\n3) PC-1\'den sanal aÄŸ geÃ§idine ping at:\n   ping 192.168.10.254\n   â†’ BaÅŸarÄ±lÄ± olmalÄ±\n\n4) Kesinti Testi (Failover):\n   - R1 terminalinde gi0/0 arayÃ¼zÃ¼nÃ¼ kapat: interface gi0/0 -> shutdown\n   - R2 terminalinde show standby brief Ã§alÄ±ÅŸtÄ±r (R2 Active duruma geÃ§er)\n   - PC-1\'den tekrar ping 192.168.10.254 at -> Trafik kesintisiz devam eder!\n   - R1 arayÃ¼zÃ¼nÃ¼ tekrar aÃ§: interface gi0/0 -> no shutdown (Preempt ile R1 tekrar Active olur).'
        : 'Goal: Configure HSRP (Hot Standby Router Protocol) for default gateway (192.168.10.254) redundancy between R1 and R2.\n\nHSRP Configuration:\n  - Virtual Gateway IP (VIP): 192.168.10.254 (Standby Group 1)\n  - R1 (Primary / Active): IP 192.168.10.2, Priority 110, Preempt: Enabled\n  - R2 (Secondary / Standby): IP 192.168.10.3, Priority 90\n\nâœ… TEST STEPS:\n\n1) Inspect HSRP status on R1:\n   R1# show standby brief\n   â†’ Verify R1 is in Active state\n\n2) Inspect HSRP status on R2:\n   R2# show standby brief\n   â†’ Verify R2 is in Standby state\n\n3) From PC-1, ping virtual gateway:\n   ping 192.168.10.254\n   â†’ Should succeed\n\n4) Failover Test:\n   - Shutdown R1 interface gi0/0: interface gi0/0 -> shutdown\n   - Check R2 status: R2# show standby brief (R2 transitions to Active)\n   - Ping 192.168.10.254 from PC-1 -> Traffic continues seamlessly!\n   - Re-enable R1 interface: interface gi0/0 -> no shutdown (R1 reclaims Active state).',
      x: 730,
      y: 50,
      width: 520,
      height: 480,
      color: 'var(--color-primary-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  // â”€â”€ Router R1 durumu (Active Gateway) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const r1State = createInitialRouterState(devices[3].macAddress);
  r1State.hostname = 'R1';
  r1State.ipRouting = true;
  r1State.ports['gi0/0'] = {
    ...r1State.ports['gi0/0'],
    ipAddress: '192.168.10.2',
    subnetMask: '255.255.255.0',
    status: 'connected',
    shutdown: false,
    hsrp: {
      groups: {
        '1': {
          virtualIp: '192.168.10.254',
          priority: 110,
          preempt: true,
          state: 'Active'
        }
      }
    }
  };
  r1State.runningConfig = [
    '!',
    'hostname R1',
    '!',
    'interface GigabitEthernet0/0',
    ' ip address 192.168.10.2 255.255.255.0',
    ' standby 1 ip 192.168.10.254',
    ' standby 1 priority 110',
    ' standby 1 preempt',
    ' no shutdown',
    '!',
    'end'
  ];

  // â”€â”€ Router R2 durumu (Standby Gateway) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const r2State = createInitialRouterState(devices[4].macAddress);
  r2State.hostname = 'R2';
  r2State.ipRouting = true;
  r2State.ports['gi0/0'] = {
    ...r2State.ports['gi0/0'],
    ipAddress: '192.168.10.3',
    subnetMask: '255.255.255.0',
    status: 'connected',
    shutdown: false,
    hsrp: {
      groups: {
        '1': {
          virtualIp: '192.168.10.254',
          priority: 90,
          preempt: false,
          state: 'Standby'
        }
      }
    }
  };
  r2State.runningConfig = [
    '!',
    'hostname R2',
    '!',
    'interface GigabitEthernet0/0',
    ' ip address 192.168.10.3 255.255.255.0',
    ' standby 1 ip 192.168.10.254',
    ' standby 1 priority 90',
    ' no shutdown',
    '!',
    'end'
  ];

  // â”€â”€ Switch SW1 durumu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sw1State = createInitialState(devices[2].macAddress);
  sw1State.hostname = 'SW1';
  sw1State.ports['fa0/1'] = { ...sw1State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  sw1State.ports['fa0/2'] = { ...sw1State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };
  sw1State.ports['gi0/1'] = { ...sw1State.ports['gi0/1'], vlan: 1, mode: 'access', status: 'connected' };
  sw1State.ports['gi0/2'] = { ...sw1State.ports['gi0/2'], vlan: 1, mode: 'access', status: 'connected' };
  sw1State.runningConfig = [
    '!', 'hostname SW1', '!', 'end'
  ];

  // â”€â”€ Proje tanÄ±mÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return {
    id: 'hsrp-redundancy-basic',
    tag: 'HSRP',
    title: isTr ? 'HSRP Redundancy' : 'HSRP Redundancy',
    description: isTr
      ? 'VarsayÄ±lan aÄŸ geÃ§idi yedekliliÄŸi iÃ§in HSRP.'
      : 'HSRP for default gateway redundancy.',
    detail: 'standby 1 ip 192.168.10.254, standby 1 priority 110, standby 1 preempt',
    level: 'advanced',
    data: baseProjectData(devices, connections, notes, [
      { id: 'r1', state: r1State },
      { id: 'r2', state: r2State },
      { id: 'sw1', state: sw1State }
    ])
  };
};

export default example;


