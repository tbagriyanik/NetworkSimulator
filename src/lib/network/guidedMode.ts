// Rehberli Ders (Guided Lesson) - Adım adım öğrenme sistemi
import { ExampleProject } from './exampleProjects';
import { generateSwitchPorts, generateRouterPorts } from '@/components/network/networkTopology.portGenerators';

export interface GuidedStep {
  id: string;
  order: number;
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  hint: { tr: string; en: string };
  detailedInstructions?: { tr: string[]; en: string[] };
  checkType: 'deviceAccess' | 'command' | 'config' | 'connection' | 'ping' | 'manual';
  checkParams?: {
    deviceType?: 'switch' | 'router' | 'pc';
    commandPattern?: string;
    configKey?: string;
    configValue?: any;
    cableType?: 'straight' | 'crossover' | 'console';
    sourceDevice?: string;
    sourcePort?: string;
    targetDevice?: string;
    targetDeviceId?: string;
    targetPort?: string;
    connections?: Array<{ sourceDevice: string; sourcePort: string; targetDevice: string; targetPort: string }>;
    subnetMask?: string;
    pc1Ip?: string;
    pc2Ip?: string;
    // For ping check
    fromDevice?: string;
    toIp?: string;
    // For specific router/switch checks
    interfaceId?: string;
    vlanId?: number;
    poolName?: string;
  };
  completed: boolean;
  completedAt?: Date;
  points?: number;
}

export interface GuidedProject extends ExampleProject {
  isGuided: true;
  steps: GuidedStep[];
  estimatedTimeMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  startedAt?: Date;
  totalPoints?: number;
}

// 1. Temel Switch Yapılandırma
export const basicSwitchGuidedSteps: GuidedStep[] = [
  {
    id: 'connect-pc-to-switch',
    order: 1,
    title: { tr: 'PC\'yi Switch\'e Bağla', en: 'Connect PC to Switch' },
    description: { tr: 'PC-1 cihazını Switch-1\'e kablo ile bağlayın', en: 'Connect PC-1 to Switch-1 using a cable' },
    hint: { tr: 'Straight-Through kablo seçin. PC-1 Eth0 -> Switch-1 Fa0/1', en: 'Select Straight-Through cable. PC-1 Eth0 -> Switch-1 Fa0/1' },
    detailedInstructions: {
      tr: ['Kablo aracını seçin', 'Straight-Through seçin', 'PC-1 Eth0 portuna tıklayın', 'Switch-1 Fa0/1 portuna tıklayın'],
      en: ['Select cable tool', 'Choose Straight-Through', 'Click PC-1 Eth0', 'Click Switch-1 Fa0/1']
    },
    checkType: 'connection',
    checkParams: { cableType: 'straight', sourceDevice: 'pc-1', sourcePort: 'eth0', targetDevice: 'switch-1', targetPort: 'fa0/1' },
    completed: false,
    points: 10
  },
  {
    id: 'open-switch-terminal',
    order: 2,
    title: { tr: 'Switch Terminalini Aç', en: 'Open Switch Terminal' },
    description: { tr: 'Switch cihazına çift tıklayarak terminalini açın', en: 'Double-click the Switch device to open its terminal' },
    hint: { tr: 'Switch-1 üzerine çift tıklayın.', en: 'Double-click on Switch-1.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'enter-enable-mode',
    order: 3,
    title: { tr: 'Enable Moduna Geç', en: 'Enter Enable Mode' },
    description: { tr: 'Ayrıcalıklı moda geçmek için enable komutunu kullanın', en: 'Use the enable command to enter privileged mode' },
    hint: { tr: '"enable" yazıp Enter\'a basın.', en: 'Type "enable" and press Enter.' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 5
  },
  {
    id: 'enter-config-mode',
    order: 4,
    title: { tr: 'Yapılandırma Moduna Geç', en: 'Enter Configuration Mode' },
    description: { tr: 'Global yapılandırma moduna geçmek için conf t komutunu kullanın', en: 'Use conf t command to enter global configuration mode' },
    hint: { tr: '"conf t" yazın.', en: 'Type "conf t".' },
    checkType: 'command',
    checkParams: { commandPattern: 'conf' },
    completed: false,
    points: 5
  },
  {
    id: 'configure-hostname',
    order: 5,
    title: { tr: 'Hostname Değiştir', en: 'Change Hostname' },
    description: { tr: 'Switch\'e SW-Lab ismini verin', en: 'Give the Switch the name SW-Lab' },
    hint: { tr: '"hostname SW-Lab" yazın.', en: 'Type "hostname SW-Lab".' },
    checkType: 'command',
    checkParams: { commandPattern: 'hostname' },
    completed: false,
    points: 10
  },
  {
    id: 'activate-port',
    order: 6,
    title: { tr: 'Port Aktifleştir', en: 'Activate a Port' },
    description: { tr: 'FastEthernet 0/1 portunu aktif hale getirin', en: 'Activate the FastEthernet 0/1 port' },
    hint: { tr: 'int fa0/1 -> no shutdown', en: 'int fa0/1 -> no shutdown' },
    checkType: 'config',
    checkParams: { configKey: 'ports.fa0/1.shutdown', configValue: false },
    completed: false,
    points: 15
  },
  {
    id: 'save-config',
    order: 7,
    title: { tr: 'Yapılandırmayı Kaydet', en: 'Save Configuration' },
    description: { tr: 'Yaptığınız değişiklikleri kaydedin', en: 'Save your changes' },
    hint: { tr: 'exit yapıp "write memory" yazın.', en: 'Type exit then "write memory".' },
    checkType: 'command',
    checkParams: { commandPattern: 'write|copy' },
    completed: false,
    points: 10
  }
];

// 2. Temel LAN Kurulumu
export const basicLanGuidedSteps: GuidedStep[] = [
  {
    id: 'lan-connect-devices',
    order: 1,
    title: { tr: 'Fiziksel Bağlantıyı Kurma', en: 'Establish Physical Connection' },
    description: { tr: 'İki bilgisayarı switch\'e bağlayın', en: 'Connect two PCs to the switch' },
    hint: { tr: 'PC-1 -> Fa0/1, PC-2 -> Fa0/2 (Düz kablo)', en: 'PC-1 -> Fa0/1, PC-2 -> Fa0/2 (Straight cable)' },
    checkType: 'connection',
    checkParams: {
      cableType: 'straight',
      connections: [
        { sourceDevice: 'pc-1', sourcePort: 'eth0', targetDevice: 'switch-1', targetPort: 'fa0/1' },
        { sourceDevice: 'pc-2', sourcePort: 'eth0', targetDevice: 'switch-1', targetPort: 'fa0/2' }
      ]
    },
    completed: false,
    points: 10
  },
  {
    id: 'lan-pc0-ip',
    order: 2,
    title: { tr: 'PC0 IP Yapılandırması', en: 'PC0 IP Configuration' },
    description: { tr: 'PC0\'a 192.168.1.10 IP adresi atayın', en: 'Assign 192.168.1.10 IP to PC0' },
    hint: { tr: 'Desktop > IP Config > 192.168.1.10', en: 'Desktop > IP Config > 192.168.1.10' },
    checkType: 'config',
    checkParams: { configKey: 'pc.pc-1.ip', configValue: '192.168.1.10', subnetMask: '255.255.255.0' },
    completed: false,
    points: 10
  },
  {
    id: 'lan-pc1-ip',
    order: 3,
    title: { tr: 'PC1 IP Yapılandırması', en: 'PC1 IP Configuration' },
    description: { tr: 'PC1\'e 192.168.1.20 IP adresi atayın', en: 'Assign 192.168.1.20 IP to PC1' },
    hint: { tr: 'Desktop > IP Config > 192.168.1.20', en: 'Desktop > IP Config > 192.168.1.20' },
    checkType: 'config',
    checkParams: { configKey: 'pc.pc-2.ip', configValue: '192.168.1.20', subnetMask: '255.255.255.0' },
    completed: false,
    points: 10
  },
  {
    id: 'lan-ping-test',
    order: 10,
    title: { tr: 'Ping Testi', en: 'Ping Test' },
    description: { tr: 'PC0\'dan PC1\'e ping atın', en: 'Ping from PC0 to PC1' },
    hint: { tr: 'PC0 CMD > "ping 192.168.1.20"', en: 'PC0 CMD > "ping 192.168.1.20"' },
    checkType: 'ping',
    checkParams: { fromDevice: 'pc-1', toIp: '192.168.1.20' },
    completed: false,
    points: 20
  }
];

// 3. VLAN Yapılandırma
export const vlanGuidedSteps: GuidedStep[] = [
  {
    id: 'vlan-create-vlan10',
    order: 1,
    title: { tr: 'VLAN 10 Oluştur', en: 'Create VLAN 10' },
    description: { tr: 'VLAN 10\'u oluşturun ve SALES ismini verin', en: 'Create VLAN 10 and name it SALES' },
    hint: { tr: 'vlan 10 -> name SALES', en: 'vlan 10 -> name SALES' },
    checkType: 'config',
    checkParams: { configKey: 'vlans.10.name', configValue: 'SALES' },
    completed: false,
    points: 15
  },
  {
    id: 'vlan-assign-port',
    order: 2,
    title: { tr: 'Port VLAN Atama', en: 'Assign Port to VLAN' },
    description: { tr: 'Fa0/1 portunu VLAN 10\'a atayın', en: 'Assign Fa0/1 port to VLAN 10' },
    hint: { tr: 'int fa0/1 -> sw acc vlan 10', en: 'int fa0/1 -> sw acc vlan 10' },
    checkType: 'config',
    checkParams: { configKey: 'ports.fa0/1.vlan', configValue: 10 },
    completed: false,
    points: 20
  }
];

// 4. Router DHCP Yapılandırma
export const routerDhcpGuidedSteps: GuidedStep[] = [
  {
    id: 'dhcp-router-int',
    order: 1,
    title: { tr: 'Router Arayüzü', en: 'Router Interface' },
    description: { tr: 'Gi0/0 arayüzüne 192.168.1.1 IP adresi atayın', en: 'Assign 192.168.1.1 to Gi0/0' },
    hint: { tr: 'int gi0/0 -> ip add 192.168.1.1 255.255.255.0 -> no shut', en: 'int gi0/0 -> ip add 192.168.1.1 255.255.255.0 -> no shut' },
    checkType: 'config',
    checkParams: { configKey: 'interfaces.gi0/0.ip', configValue: '192.168.1.1' },
    completed: false,
    points: 20
  },
  {
    id: 'dhcp-pool-net',
    order: 2,
    title: { tr: 'DHCP Havuzu', en: 'DHCP Pool' },
    description: { tr: 'LAN isminde havuz oluşturun ve 192.168.1.0 ağını tanımlayın', en: 'Create pool LAN and define network 192.168.1.0' },
    hint: { tr: 'ip dhcp pool LAN -> network 192.168.1.0 255.255.255.0', en: 'ip dhcp pool LAN -> network 192.168.1.0 255.255.255.0' },
    checkType: 'config',
    checkParams: { configKey: 'dhcpPools.LAN', configValue: { network: '192.168.1.0', subnetMask: '255.255.255.0' } },
    completed: false,
    points: 30
  }
];

// 5. Statik Yönlendirme
export const staticRoutingGuidedSteps: GuidedStep[] = [
  {
    id: 'static-r1-route',
    order: 1,
    title: { tr: 'R1 Statik Rota', en: 'R1 Static Route' },
    description: { tr: 'R1 üzerinde 192.168.2.0 ağına rota ekleyin', en: 'Configure static route to 192.168.2.0 on R1' },
    hint: { tr: 'ip route 192.168.2.0 255.255.255.0 10.0.0.2', en: 'ip route 192.168.2.0 255.255.255.0 10.0.0.2' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-1', configKey: 'staticRoutes', configValue: { destination: '192.168.2.0' } },
    completed: false,
    points: 25
  },
  {
    id: 'static-r2-route',
    order: 2,
    title: { tr: 'R2 Statik Rota', en: 'R2 Static Route' },
    description: { tr: 'R2 üzerinde 192.168.1.0 ağına rota ekleyin', en: 'Configure static route to 192.168.1.0 on R2' },
    hint: { tr: 'ip route 192.168.1.0 255.255.255.0 10.0.0.1', en: 'ip route 192.168.1.0 255.255.255.0 10.0.0.1' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-2', configKey: 'staticRoutes', configValue: { destination: '192.168.1.0' } },
    completed: false,
    points: 25
  }
];

// 6. Port Güvenliği
export const portSecurityGuidedSteps: GuidedStep[] = [
  {
    id: 'ps-enable',
    order: 1,
    title: { tr: 'Port Güvenliğini Aç', en: 'Enable Port Security' },
    description: { tr: 'Fa0/1 portunda port-security özelliğini açın', en: 'Enable port-security on Fa0/1' },
    hint: { tr: 'int fa0/1 -> sw port-security', en: 'int fa0/1 -> sw port-security' },
    checkType: 'config',
    checkParams: { configKey: 'ports.fa0/1.portSecurity.enabled', configValue: true },
    completed: false,
    points: 25
  },
  {
    id: 'ps-sticky',
    order: 2,
    title: { tr: 'Sticky MAC', en: 'Sticky MAC' },
    description: { tr: 'MAC adreslerini kalıcı (sticky) olarak öğrenmeyi açın', en: 'Enable sticky MAC address learning' },
    hint: { tr: 'sw port-security mac-address sticky', en: 'sw port-security mac-address sticky' },
    checkType: 'command',
    checkParams: { commandPattern: 'mac-address sticky' },
    completed: false,
    points: 25
  }
];

// 7. RIP Dinamik Yönlendirme
export const ripRoutingGuidedSteps: GuidedStep[] = [
  {
    id: 'rip-start',
    order: 1,
    title: { tr: 'RIP Başlat', en: 'Start RIP' },
    description: { tr: 'Router üzerinde RIP protokolünü başlatın', en: 'Start RIP protocol on the router' },
    hint: { tr: '"router rip" yazın.', en: 'Type "router rip".' },
    checkType: 'config',
    checkParams: { configKey: 'routingProtocol', configValue: 'rip' },
    completed: false,
    points: 30
  },
  {
    id: 'rip-net-1',
    order: 2,
    title: { tr: 'Ağ Ekle', en: 'Add Network' },
    description: { tr: '192.168.1.0 ağını RIP\'e ekleyin', en: 'Add network 192.168.1.0 to RIP' },
    hint: { tr: 'network 192.168.1.0', en: 'network 192.168.1.0' },
    checkType: 'command',
    checkParams: { commandPattern: 'network 192.168.1.0' },
    completed: false,
    points: 35
  }
];

// 8. DNS ve HTTP Servisleri
export const servicesGuidedSteps: GuidedStep[] = [
  {
    id: 'srv-http-on',
    order: 1,
    title: { tr: 'HTTP Sunucu', en: 'HTTP Server' },
    description: { tr: 'Sunucu cihazında HTTP servisini aktif edin', en: 'Enable HTTP service on the Server' },
    hint: { tr: 'Server > Desktop > HTTP > On', en: 'Server > Desktop > HTTP > On' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'server-1', configKey: 'services.http.enabled', configValue: true },
    completed: false,
    points: 25
  },
  {
    id: 'srv-dns-rec',
    order: 2,
    title: { tr: 'DNS Kaydı', en: 'DNS Record' },
    description: { tr: 'www.lab.com için 192.168.1.10 adresine kayıt ekleyin', en: 'Add DNS record for www.lab.com to 192.168.1.10' },
    hint: { tr: 'DNS Server > DNS > Add Name/Address', en: 'DNS Server > DNS > Add Name/Address' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'dns-server-1', configKey: 'services.dns.records', configValue: [{ domain: 'www.lab.com', address: '192.168.1.10' }] },
    completed: false,
    points: 35
  }
];

// Rehberli projeleri oluştur
export const getGuidedProjects = (language: 'tr' | 'en'): GuidedProject[] => {
  const isTr = language === 'tr';
  
  const projects: GuidedProject[] = [
    {
      id: 'guided-basic-switch',
      tag: isTr ? 'Temel' : 'Basic',
      title: isTr ? 'Temel Switch Yapılandırma' : 'Basic Switch Configuration',
      description: isTr ? 'Switch hostname, port aktifleştirme ve kaydetme' : 'Switch hostname, port activation and saving',
      detail: isTr ? 'Enable/Config modları, hostname ve no shutdown komutları.' : 'Enable/Config modes, hostname and no shutdown commands.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'switch-1', type: 'switchL2', name: 'Switch-1', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() as any },
            { id: 'pc-1', type: 'pc', name: 'PC-1', x: 100, y: 200, ip: '', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }] }
          ],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: basicSwitchGuidedSteps, estimatedTimeMinutes: 10, difficulty: 'beginner',
      totalPoints: basicSwitchGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-basic-lan',
      tag: 'LAN',
      title: isTr ? 'Temel LAN Kurulumu' : 'Basic LAN Setup',
      description: isTr ? 'İki bilgisayarlı ağ kurma ve ping testi' : 'Set up two-PC network and ping test',
      detail: isTr ? 'IP atama, kablolama ve bağlantı kontrolü.' : 'IP assignment, cabling and connectivity check.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'switch-1', type: 'switchL2', name: 'Switch', x: 400, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() as any },
            { id: 'pc-1', type: 'pc', name: 'PC0', x: 150, y: 100, ip: '', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'PC1', x: 150, y: 300, ip: '', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }] }
          ],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: basicLanGuidedSteps, estimatedTimeMinutes: 15, difficulty: 'beginner',
      totalPoints: basicLanGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-vlan-lab',
      tag: 'VLAN',
      title: isTr ? 'VLAN Yapılandırma' : 'VLAN Configuration',
      description: isTr ? 'VLAN oluşturma ve port atama' : 'VLAN creation and port assignment',
      detail: isTr ? 'Sanal ağlar oluşturma ve mantıksal gruplandırma.' : 'Creating virtual networks and logical grouping.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [{ id: 'switch-1', type: 'switchL2', name: 'Switch-1', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() as any }],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: vlanGuidedSteps, estimatedTimeMinutes: 15, difficulty: 'intermediate',
      totalPoints: vlanGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-router-dhcp',
      tag: 'DHCP',
      title: isTr ? 'Router DHCP Yapılandırma' : 'Router DHCP Configuration',
      description: isTr ? 'Otomatik IP dağıtımı için DHCP havuzu' : 'DHCP pool for automatic IP distribution',
      detail: isTr ? 'Router arayüzü ve DHCP servis ayarları.' : 'Router interface and DHCP service settings.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1', x: 400, y: 200, ip: '', status: 'online', ports: generateRouterPorts() as any },
            { id: 'pc-1', type: 'pc', name: 'PC1', x: 150, y: 200, ip: '', status: 'online', ipConfigMode: 'dhcp', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] }
          ],
          connections: [{ id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'router-1', targetPort: 'gi0/0', cableType: 'crossover', active: true }],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'crossover', sourceDevice: 'pc', targetDevice: 'router' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: routerDhcpGuidedSteps, estimatedTimeMinutes: 10, difficulty: 'intermediate',
      totalPoints: routerDhcpGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-static-routing',
      tag: 'ROUTING',
      title: isTr ? 'Statik Yönlendirme Lab' : 'Static Routing Lab',
      description: isTr ? 'Manuel rotalar ile ağ birleştirme' : 'Connecting networks with manual routes',
      detail: isTr ? 'Routerlar arası iletişim ve ip route komutu.' : 'Inter-router communication and ip route command.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1', x: 300, y: 200, ip: '', status: 'online', ports: [{ id: 'gi0/0', label: 'Gi0/0', status: 'connected' as const }, { id: 'gi0/1', label: 'Gi0/1', status: 'connected' as const }] },
            { id: 'router-2', type: 'router', name: 'R2', x: 600, y: 200, ip: '', status: 'online', ports: [{ id: 'gi0/0', label: 'Gi0/0', status: 'connected' as const }, { id: 'gi0/1', label: 'Gi0/1', status: 'connected' as const }] },
            { id: 'pc-1', type: 'pc', name: 'PC1', x: 100, y: 200, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'PC2', x: 800, y: 200, ip: '192.168.2.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'router-1', targetPort: 'gi0/1', cableType: 'crossover', active: true },
            { id: 'c2', sourceDeviceId: 'router-1', sourcePort: 'gi0/0', targetDeviceId: 'router-2', targetPort: 'gi0/0', cableType: 'crossover', active: true },
            { id: 'c3', sourceDeviceId: 'router-2', sourcePort: 'gi0/1', targetDeviceId: 'pc-2', targetPort: 'eth0', cableType: 'crossover', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'crossover', sourceDevice: 'pc', targetDevice: 'router' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: staticRoutingGuidedSteps, estimatedTimeMinutes: 15, difficulty: 'advanced',
      totalPoints: staticRoutingGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-port-security',
      tag: 'SECURITY',
      title: isTr ? 'Port Güvenliği (Port-Sec)' : 'Port Security Lab',
      description: isTr ? 'MAC sınırı ve ihlal eylemleri' : 'MAC limits and violation actions',
      detail: isTr ? 'Switch portlarını koruma altına alma.' : 'Protecting switch ports.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [{ id: 'switch-1', type: 'switchL2', name: 'SW-Sec', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() as any }],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: portSecurityGuidedSteps, estimatedTimeMinutes: 10, difficulty: 'intermediate',
      totalPoints: portSecurityGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-rip-routing',
      tag: 'RIP',
      title: isTr ? 'RIP Dinamik Yönlendirme' : 'RIP Dynamic Routing',
      description: isTr ? 'Otomatik rota paylaşımı' : 'Automated route sharing',
      detail: isTr ? 'Dinamik yönlendirme temelleri.' : 'Dynamic routing basics.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [{ id: 'router-1', type: 'router', name: 'R1', x: 300, y: 200, ip: '', status: 'online', ports: generateRouterPorts() as any }],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'router' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: ripRoutingGuidedSteps, estimatedTimeMinutes: 10, difficulty: 'intermediate',
      totalPoints: ripRoutingGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-services',
      tag: 'SERVICES',
      title: isTr ? 'DNS ve HTTP Servisleri' : 'DNS & HTTP Services',
      description: isTr ? 'Web sunucu ve isim çözümleme' : 'Web server and name resolution',
      detail: isTr ? 'Servis kurulumu ve istemci testi.' : 'Service setup and client testing.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'server-1', type: 'pc', name: 'Server-Web', x: 400, y: 100, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'dns-server-1', type: 'pc', name: 'DNS-Server', x: 600, y: 100, ip: '192.168.1.5', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'pc-1', type: 'pc', name: 'PC1', x: 100, y: 300, ip: '192.168.1.20', dns: '192.168.1.5', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'sw-1', type: 'switchL2', name: 'SW1', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() as any }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'sw-1', targetPort: 'fa0/1', cableType: 'straight', active: true },
            { id: 'c2', sourceDeviceId: 'server-1', sourcePort: 'eth0', targetDeviceId: 'sw-1', targetPort: 'fa0/2', cableType: 'straight', active: true },
            { id: 'c3', sourceDeviceId: 'dns-server-1', sourcePort: 'eth0', targetDeviceId: 'sw-1', targetPort: 'fa0/3', cableType: 'straight', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'pc-1', activeDeviceType: 'pc', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: servicesGuidedSteps, estimatedTimeMinutes: 15, difficulty: 'intermediate',
      totalPoints: servicesGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    }
  ];

  return projects;
};

// Rehberli ders hook için yardımcı fonksiyonlar
export const checkStepCompletion = (
  step: GuidedStep,
  context: {
    lastCommand?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: any;
    topologyConnections?: any[];
    topologyDevices?: any[];
  }
): boolean => {
  switch (step.checkType) {
    case 'deviceAccess':
      if (context.deviceAccessed !== step.checkParams?.deviceType) return false;
      if (step.checkParams?.targetDeviceId) {
        return context.deviceAccessedId === step.checkParams.targetDeviceId;
      }
      return true;
    
    case 'command':
      if (!step.checkParams?.commandPattern || !context.lastCommand) return false;
      const patterns = step.checkParams.commandPattern.split('|');
      const lastCmd = context.lastCommand!.toLowerCase().trim();
      return patterns.some(pattern => {
        const pat = pattern.toLowerCase().trim();
        return lastCmd.startsWith(pat) || lastCmd.includes(pat);
      });
    
    case 'connection':
      if (!context.topologyConnections || !context.topologyDevices) return false;

      if (step.checkParams?.connections) {
        const requiredConnections = step.checkParams.connections;
        return requiredConnections.every(required => {
          return context.topologyConnections!.some((conn: any) => {
            if (!conn.active) return false;
            if (step.checkParams?.cableType) {
              const cableTypeMatch = conn.cableType === step.checkParams.cableType ||
                                    (step.checkParams.cableType === 'straight' && conn.cableType === 'copper-straight-through');
              if (!cableTypeMatch) return false;
            }
            const sourceMatch = conn.sourceDeviceId === required.sourceDevice &&
                               (!required.sourcePort || conn.sourcePort === required.sourcePort);
            const targetMatch = conn.targetDeviceId === required.targetDevice &&
                               (!required.targetPort || conn.targetPort === required.targetPort);
            return sourceMatch && targetMatch;
          });
        });
      }

      if (step.checkParams?.sourceDevice && step.checkParams?.targetDevice) {
        const params = step.checkParams;
        return context.topologyConnections.some((conn: any) => {
          if (!conn.active) return false;
          if (params.cableType) {
            const cableTypeMatch = conn.cableType === params.cableType ||
                                  (params.cableType === 'straight' && conn.cableType === 'copper-straight-through');
            if (!cableTypeMatch) return false;
          }
          const sourceMatch = conn.sourceDeviceId === params.sourceDevice &&
                             conn.sourcePort === params.sourcePort;
          const targetMatch = conn.targetDeviceId === params.targetDevice &&
                             conn.targetPort === params.targetPort;
          return sourceMatch && targetMatch;
        });
      }

      return context.topologyConnections.some((conn: any) => conn.active === true);
    
    case 'config':
      if (!context.deviceState || !step.checkParams?.configKey) return false;
      
      const configKey = step.checkParams.configKey;
      const configValue = step.checkParams.configValue;

      if (configKey.startsWith('interfaces.') || configKey.startsWith('ports.')) {
        const parts = configKey.split('.');
        const portId = parts[1];
        const property = parts[parts.length - 1];
        const port = context.deviceState.ports?.[portId] ||
                     context.deviceState.ports?.[portId.toLowerCase()] ||
                     context.deviceState.ports?.[portId.toUpperCase()];

        if (port) {
          if (property === 'ip' || property === 'ipAddress') return port.ipAddress === configValue;
          if (property === 'shutdown') return port.shutdown === configValue;
          if (property === 'vlan') return Number(port.vlan) === Number(configValue) || Number(port.accessVlan) === Number(configValue);
          if (property === 'mode') return port.mode === configValue;
          if (property === 'enabled' && configKey.includes('portSecurity')) return port.portSecurity?.enabled === configValue;

          // WiFi checks
          if (property === 'ssid' && port.wifi) return port.wifi.ssid === configValue;
          if (property === 'password' && port.wifi) return port.wifi.password === configValue;
          if (property === 'security' && port.wifi) return port.wifi.security === configValue;
        }
      }
      
      if (configKey.startsWith('vlans.')) {
        const vlanId = configKey.split('.')[1];
        const vlan = context.deviceState.vlans?.[vlanId];
        const property = configKey.split('.').pop();
        if (property === 'name') return vlan?.name === configValue;
        return !!vlan;
      }

      if (configKey === 'staticRoutes') {
        const routes = context.deviceState.staticRoutes || [];
        if (typeof configValue === 'object' && configValue.destination) {
          return routes.some((r: any) => r.destination === configValue.destination);
        }
      }

      if (configKey.startsWith('dhcpPools.')) {
        const poolName = configKey.split('.')[1];
        const pool = context.deviceState.dhcpPools?.[poolName];
        if (!pool) return false;
        if (typeof configValue === 'object') {
          return Object.entries(configValue).every(([k, v]) => pool[k] === v);
        }
        return true;
      }

      if (configKey === 'routingProtocol') return context.deviceState.routingProtocol === configValue;

      if (configKey.startsWith('services.')) {
        const parts = configKey.split('.');
        const serviceName = parts[1];
        const property = parts[2];
        const service = context.deviceState.services?.[serviceName];
        if (!service) return false;
        if (property === 'enabled') return service.enabled === configValue;
        if (property === 'records' && Array.isArray(configValue)) {
          return configValue.every(req =>
            service.records?.some((r: any) => r.domain === req.domain && r.address === req.address)
          );
        }
      }
      
      if (configKey.startsWith('pc.')) {
        const pcId = configKey.split('.')[1];
        const pcDevice = context.topologyDevices?.find((d: any) => d.id === pcId);
        if (!pcDevice) return false;
        const ipMatch = pcDevice.ip === configValue;
        if (step.checkParams.subnetMask) return ipMatch && pcDevice.subnet === step.checkParams.subnetMask;
        return ipMatch;
      }
      return false;

    case 'ping':
      if (!context.lastCommand || !step.checkParams?.toIp) return false;
      const cmd = context.lastCommand.toLowerCase().trim();
      return cmd.startsWith('ping') && cmd.includes(step.checkParams.toIp.toLowerCase());
    
    case 'manual':
      return true;
    
    default:
      return false;
  }
};

export const getNextIncompleteStep = (steps: GuidedStep[]): GuidedStep | null => {
  return steps.find(s => !s.completed) || null;
};

export const getCompletedStepsCount = (steps: GuidedStep[]): number => {
  return steps.filter(s => s.completed).length;
};

export const getProgressPercentage = (steps: GuidedStep[]): number => {
  if (steps.length === 0) return 0;
  return Math.round((getCompletedStepsCount(steps) / steps.length) * 100);
};
