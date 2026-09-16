import {
  createSwitchDevice,
  createRouterDevice,
  createPcDevice,
  connectPorts,
  baseProjectData
} from './helpers';
import { createInitialRouterState, createInitialState } from '../initialState';
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const router1State = createInitialRouterState('00:50:00:00:00:B1');
  router1State.hostname = 'Edge-R1';
  if (router1State.ports['gi0/0']) {
    router1State.ports['gi0/0'].ipAddress = '192.168.100.11';
    router1State.ports['gi0/0'].subnetMask = '255.255.255.0';
    router1State.ports['gi0/0'].status = 'connected';
    router1State.ports['gi0/0'].shutdown = false;
  }
  router1State.security = {
    ...router1State.security,
    users: [{ username: 'admin', privilege: 15, password: 'password' }],
    vtyLines: { login: true, transportInput: ['ssh', 'telnet'], execTimeout: { minutes: 15, seconds: 0 } }
  };

  const router2State = createInitialRouterState('00:50:00:00:00:B2');
  router2State.hostname = 'Core-R2';
  if (router2State.ports['gi0/0']) {
    router2State.ports['gi0/0'].ipAddress = '192.168.100.12';
    router2State.ports['gi0/0'].subnetMask = '255.255.255.0';
    router2State.ports['gi0/0'].status = 'connected';
    router2State.ports['gi0/0'].shutdown = false;
  }
  router2State.security = {
    ...router2State.security,
    users: [{ username: 'admin', privilege: 15, password: 'password' }],
    vtyLines: { login: true, transportInput: ['ssh', 'telnet'], execTimeout: { minutes: 15, seconds: 0 } }
  };

  const router3State = createInitialRouterState('00:50:00:00:00:B3');
  router3State.hostname = 'Dist-R3';
  if (router3State.ports['gi0/0']) {
    router3State.ports['gi0/0'].ipAddress = '192.168.100.13';
    router3State.ports['gi0/0'].subnetMask = '255.255.255.0';
    router3State.ports['gi0/0'].status = 'connected';
    router3State.ports['gi0/0'].shutdown = false;
  }
  router3State.security = {
    ...router3State.security,
    users: [{ username: 'admin', privilege: 15, password: 'password' }],
    vtyLines: { login: true, transportInput: ['ssh', 'telnet'], execTimeout: { minutes: 15, seconds: 0 } }
  };

  const switchState = createInitialState('00:11:00:00:00:B1', 'NS-L2-24TT-L');
  switchState.hostname = 'OOBM-Mgmt-SW';

  const pythonStation = createPcDevice('pc-netauto', 'Python-Automation-Node', 380, 50, '192.168.100.10', 1, '192.168.100.1');
  pythonStation.services = {
    http: {
      enabled: true,
      mode: 'simple',
      content: '<h1>Python Network Automation Engine</h1><p>Libraries: Netmiko, NAPALM, Scapy, RESTCONF</p>'
    }
  };

  const devices = [
    pythonStation,
    createSwitchDevice('sw-mgmt', 'OOBM-Mgmt-SW', 380, 190),
    createRouterDevice('r-auto-1', 'Edge-R1', 120, 340, '192.168.100.11'),
    createRouterDevice('r-auto-2', 'Core-R2', 380, 340, '192.168.100.12'),
    createRouterDevice('r-auto-3', 'Dist-R3', 640, 340, '192.168.100.13')
  ];

  const connections: CanvasConnection[] = [];
  connectPorts(devices, connections, 'pc-netauto', 'eth0', 'sw-mgmt', 'fa0/1');
  connectPorts(devices, connections, 'r-auto-1', 'gi0/0', 'sw-mgmt', 'fa0/2');
  connectPorts(devices, connections, 'r-auto-2', 'gi0/0', 'sw-mgmt', 'fa0/3');
  connectPorts(devices, connections, 'r-auto-3', 'gi0/0', 'sw-mgmt', 'fa0/4');

  const notes: CanvasNote[] = [
    {
      id: 'netauto-python-note',
      text: isTr
        ? 'ğŸ Python & AÄŸ Otomasyonu LaboratuvarÄ± (Netmiko / RESTCONF / SSH)\n\n' +
          'ğŸ¯ AmaÃ§ ve Senaryo Ã–zeti:\n' +
          'Python otomasyon istasyonundan OOBM (Out-of-Band Management) anahtarÄ± Ã¼zerinden 3 adet yÃ¶nlendiriciye (Edge-R1, Core-R2, Dist-R3) SSH/Telnet ile baÄŸlanÄ±p toplu konfigÃ¼rasyon ve envanter toplama senaryosu.\n\n' +
          'ğŸ“‹ YÃ¶netim AÄŸ Parametreleri (VLAN 1):\n' +
          'â€¢ Python Ä°stasyonu: 192.168.100.10 /24\n' +
          'â€¢ Edge-R1: 192.168.100.11 (KullanÄ±cÄ±: admin / Åifre: password)\n' +
          'â€¢ Core-R2: 192.168.100.12 (KullanÄ±cÄ±: admin / Åifre: password)\n' +
          'â€¢ Dist-R3: 192.168.100.13 (KullanÄ±cÄ±: admin / Åifre: password)\n\n' +
          'ğŸ§ª DoÄŸrulama ve Test:\n' +
          '1. Python istasyonundan "ping 192.168.100.11" ile yÃ¶nlendirici eriÅŸilebilirliÄŸini test edin.\n' +
          '2. "ssh admin@192.168.100.11" ile SSH baÄŸlantÄ±sÄ± saÄŸlayÄ±p "show ip int brief" Ã§Ä±ktÄ±sÄ±nÄ± alÄ±n.\n' +
          '3. Python betikleri ile tÃ¼m yÃ¶nlendiricilere eÅŸzamanlÄ± VLAN ve rota daÄŸÄ±tÄ±mÄ± simÃ¼le edin.'
        : 'ğŸ Python Network Automation Lab (Netmiko / RESTCONF / SSH)\n\n' +
          'ğŸ¯ Objective & Scenario Overview:\n' +
          'Centralized fleet configuration and automated inventory collection from a Python automation node across 3 routers over Out-of-Band Management (OOBM) switch.\n\n' +
          'ğŸ“‹ Out-of-Band Management Fleet:\n' +
          'â€¢ Python Station: 192.168.100.10 /24\n' +
          'â€¢ Edge-R1: 192.168.100.11 (User: admin / Pass: password)\n' +
          'â€¢ Core-R2: 192.168.100.12 (User: admin / Pass: password)\n' +
          'â€¢ Dist-R3: 192.168.100.13 (User: admin / Pass: password)\n\n' +
          'ğŸ§ª Verification & Testing:\n' +
          '1. Check connectivity from Python station: "ping 192.168.100.11".\n' +
          '2. Test SSH connectivity: "ssh admin@192.168.100.11" and view running configuration.\n' +
          '3. Execute automation commands to push configuration changes across the fleet.',
      x: 50,
      y: 450,
      width: 680,
      height: 310,
      color: 'var(--color-primary-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  return {
    id: 'netauto-python-lab',
    tag: isTr ? 'OTOMASYON' : 'AUTOMATION',
    title: isTr ? 'Python AÄŸ Otomasyonu ve OOBM Filosu' : 'Python Network Automation & OOBM Fleet',
    description: isTr
      ? 'Python otomasyon istasyonu, OOBM anahtarÄ± ve SSH Ã¶zellikli yÃ¶nlendirici filosundan oluÅŸan modern otomasyon laboratuvarÄ±.'
      : 'Modern automation lab with Python workstation, out-of-band management switch, and SSH-enabled router fleet.',
    detail: isTr
      ? 'SSH/Telnet vty kimlik doÄŸrulama, toplu yapÄ±landÄ±rma ve telemetri toplama ortamÄ±.'
      : 'Batch provisioning, SSH/Telnet vty authentication, and telemetry collection testbed.',
    level: 'advanced',
    data: baseProjectData(devices, connections, notes, [
      { id: 'sw-mgmt', state: switchState },
      { id: 'r-auto-1', state: router1State },
      { id: 'r-auto-2', state: router2State },
      { id: 'r-auto-3', state: router3State }
    ])
  };
};

export default example;


