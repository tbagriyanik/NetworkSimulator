import { createInitialRouterState } from '../initialState';
import { createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
;
import type { ExampleProject, ProjectData } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const routerSshDevices = [
    createPcDevice('pc-1', 'PC-1', 80, 220, '192.168.1.10', 1),
    createRouterDevice('router-1', 'R1', 420, 220),
  ];
  const routerSshConnections: CanvasConnection[] = [];
  connectPorts(routerSshDevices, routerSshConnections, 'pc-1', 'eth0', 'router-1', 'gi0/0', 'crossover');
  const routerSshNotes: CanvasNote[] = [
    {
      id: 'router-ssh-note',
      text: isTr
        ? 'Amaç: Router üzerinde SSH yapılandırarak güvenli uzaktan yönetim erişimi sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Router (R1) ekle\n   - 1 adet PC (PC-1) ekle\n   - PC-1 Eth0 -> R1 Gi0/0 (Straight kablo)\n\n2) ROUTER KONFİGÜRASYONU:\n   - R1 terminaline gir: enable, conf t\n   - hostname R1\n   - ip domain-name lab.local\n   - crypto key generate rsa modulus 1024\n   - ip ssh version 2\n   - username admin privilege 15 secret 1234\n   - enable secret 123\n   - line vty 0 4\n     login local\n     transport input ssh\n   - exit\n\n3) INTERFACE AYARLARI:\n   - interface gi0/0\n     ip address 192.168.1.150 255.255.255.0\n     no shutdown\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0, Gateway 192.168.1.150\n\n5) TEST:\n   - PC-1 CMD: ssh admin@192.168.1.150\n   - Şifre: 1234\n   - R1> show ssh (SSH bağlantılarını gör)\n   - R1> show ip ssh (SSH durumunu kontrol et)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Router (R1)\n   - Add 1 PC (PC-1)\n   - Connect PC-1 Eth0 -> R1 Gi0/0 (Straight cable)\n\n2) ROUTER CONFIGURATION:\n   - Enter R1 terminal: enable, conf t\n   - hostname R1\n   - ip domain-name lab.local\n   - crypto key generate rsa modulus 1024\n   - ip ssh version 2\n   - username admin privilege 15 secret 1234\n   - enable secret 123\n   - line vty 0 4\n     login local\n     transport input ssh\n   - exit\n\n3) INTERFACE SETTINGS:\n   - interface gi0/0\n     ip address 192.168.1.150 255.255.255.0\n     no shutdown\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0, Gateway 192.168.1.150\n\n5) TEST:\n   - PC-1 CMD: ssh admin@192.168.1.150\n   - Password: 1234\n   - R1> show ssh (view SSH connections)\n   - R1> show ip ssh (check SSH status)',
      x: 580,
      y: 80,
      width: 480,
      height: 300,
      color: 'var(--color-success-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const routerSshR1 = createInitialRouterState('00:50:00:00:00:04');
  routerSshR1.hostname = 'R1';
  routerSshR1.domainName = 'lab.local';
  routerSshR1.sshVersion = 2;
  routerSshR1.ports['gi0/0'] = {
    ...routerSshR1.ports['gi0/0'],
    ipAddress: '192.168.1.150',
    subnetMask: '255.255.255.0',
    status: 'connected',
    shutdown: false
  };
  routerSshR1.security = {
    ...routerSshR1.security,
    users: [
      { username: 'admin', password: '1234', privilege: 15 },
      { username: 'user', password: '1234', privilege: 15 }
    ],
    enableSecret: '123',
    vtyLines: {
      ...routerSshR1.security.vtyLines,
      login: true,
      loginLocal: true,
      transportInput: ['ssh']
    }
  };
  routerSshR1.runningConfig = [
    '!',
    'hostname R1',
    '!',
    'ip domain-name lab.local',
    'crypto key generate rsa modulus 1024',
    'ip ssh version 2',
    '!',
    'username admin privilege 15 secret 1234',
    'username user privilege 15 secret 1234',
    'enable secret 123',
    '!',
    'interface GigabitEthernet0/0',
    ' ip address 192.168.1.150 255.255.255.0',
    ' no shutdown',
    '!',
    'line vty 0 4',
    ' login local',
    ' transport input ssh',
    '!',
    'end'
  ];
  const routerSshData: ProjectData = {
    ...baseProjectData(routerSshDevices, routerSshConnections, routerSshNotes, [
      { id: 'router-1', state: routerSshR1 }
    ]),
    activeDeviceId: 'router-1',
    activeDeviceType: 'router',
    cableInfo: {
      connected: true,
      cableType: 'straight',
      sourceDevice: 'pc',
      targetDevice: 'router'
    }
  };

  return {
    id: 'router-ssh-1pc',
    tag: 'SSH',
    title: isTr ? 'Router SSH (1 PC + 1 Router)' : 'Router SSH (1 PC + 1 Router)',
    description: isTr
      ? 'PC-1 üzerinden router R1 cihazına SSH ile güvenli bağlantı.'
      : 'Secure SSH connection from PC-1 to router R1.',
    detail: isTr
      ? 'Komut: ssh admin@192.168.1.150, Şifre: 1234'
      : 'Command: ssh admin@192.168.1.150, Password: 1234',
    level: 'basic',
    data: routerSshData
  };
};

export default example;


