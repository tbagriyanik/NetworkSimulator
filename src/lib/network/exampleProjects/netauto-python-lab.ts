import {
  createSwitchDevice,
  createRouterDevice,
  createPcDevice,
  connectPorts,
  baseProjectData
} from './helpers';
import { createInitialRouterState, createInitialState } from '../initialState';
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

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
        ? '🐍 Python & Ağ Otomasyonu Laboratuvarı (Netmiko / RESTCONF / SSH)\n\n' +
          '🎯 Amaç ve Senaryo Özeti:\n' +
          'Python otomasyon istasyonundan OOBM (Out-of-Band Management) anahtarı üzerinden 3 adet yönlendiriciye (Edge-R1, Core-R2, Dist-R3) SSH/Telnet ile bağlanıp toplu konfigürasyon ve envanter toplama senaryosu.\n\n' +
          '📋 Yönetim Ağ Parametreleri (VLAN 1):\n' +
          '• Python İstasyonu: 192.168.100.10 /24\n' +
          '• Edge-R1: 192.168.100.11 (Kullanıcı: admin / Şifre: password)\n' +
          '• Core-R2: 192.168.100.12 (Kullanıcı: admin / Şifre: password)\n' +
          '• Dist-R3: 192.168.100.13 (Kullanıcı: admin / Şifre: password)\n\n' +
          '🧪 Doğrulama ve Test:\n' +
          '1. Python istasyonundan "ping 192.168.100.11" ile yönlendirici erişilebilirliğini test edin.\n' +
          '2. "ssh admin@192.168.100.11" ile SSH bağlantısı sağlayıp "show ip int brief" çıktısını alın.\n' +
          '3. Python betikleri ile tüm yönlendiricilere eşzamanlı VLAN ve rota dağıtımı simüle edin.'
        : '🐍 Python Network Automation Lab (Netmiko / RESTCONF / SSH)\n\n' +
          '🎯 Objective & Scenario Overview:\n' +
          'Centralized fleet configuration and automated inventory collection from a Python automation node across 3 routers over Out-of-Band Management (OOBM) switch.\n\n' +
          '📋 Out-of-Band Management Fleet:\n' +
          '• Python Station: 192.168.100.10 /24\n' +
          '• Edge-R1: 192.168.100.11 (User: admin / Pass: password)\n' +
          '• Core-R2: 192.168.100.12 (User: admin / Pass: password)\n' +
          '• Dist-R3: 192.168.100.13 (User: admin / Pass: password)\n\n' +
          '🧪 Verification & Testing:\n' +
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
    title: isTr ? 'Python Ağ Otomasyonu ve OOBM Filosu' : 'Python Network Automation & OOBM Fleet',
    description: isTr
      ? 'Python otomasyon istasyonu, OOBM anahtarı ve SSH özellikli yönlendirici filosundan oluşan modern otomasyon laboratuvarı.'
      : 'Modern automation lab with Python workstation, out-of-band management switch, and SSH-enabled router fleet.',
    detail: isTr
      ? 'SSH/Telnet vty kimlik doğrulama, toplu yapılandırma ve telemetri toplama ortamı.'
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
