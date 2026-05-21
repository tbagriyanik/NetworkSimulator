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
    id: 'vlan-open-terminal',
    order: 1,
    title: { tr: 'Terminali Aç', en: 'Open Terminal' },
    description: { tr: 'Switch terminalini açın', en: 'Open the switch terminal' },
    hint: { tr: 'Switch üzerine çift tıklayın.', en: 'Double-click on the switch.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'vlan-enable',
    order: 2,
    title: { tr: 'Enable Modu', en: 'Enable Mode' },
    description: { tr: 'Ayrıcalıklı moda geçin', en: 'Enter privileged EXEC mode' },
    hint: { tr: '"enable" yazın.', en: 'Type "enable".' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 5
  },
  {
    id: 'vlan-conf-t',
    order: 3,
    title: { tr: 'Yapılandırma Modu', en: 'Config Mode' },
    description: { tr: 'Global yapılandırma moduna geçin', en: 'Enter global configuration mode' },
    hint: { tr: '"conf t" yazın.', en: 'Type "conf t".' },
    checkType: 'command',
    checkParams: { commandPattern: 'conf' },
    completed: false,
    points: 5
  },
  {
    id: 'vlan-create-10',
    order: 4,
    title: { tr: 'VLAN 10 Oluştur', en: 'Create VLAN 10' },
    description: { tr: 'VLAN 10\'u oluşturun', en: 'Create VLAN 10' },
    hint: { tr: '"vlan 10" yazın.', en: 'Type "vlan 10".' },
    checkType: 'command',
    checkParams: { commandPattern: 'vlan 10' },
    completed: false,
    points: 10
  },
  {
    id: 'vlan-name-10',
    order: 5,
    title: { tr: 'VLAN İsimlendir', en: 'Name VLAN' },
    description: { tr: 'VLAN 10\'a SALES ismini verin', en: 'Name VLAN 10 as SALES' },
    hint: { tr: '"name SALES" yazın.', en: 'Type "name SALES".' },
    checkType: 'config',
    checkParams: { configKey: 'vlans.10.name', configValue: 'SALES' },
    completed: false,
    points: 10
  },
  {
    id: 'vlan-int-fa01',
    order: 6,
    title: { tr: 'Arayüz Seçimi', en: 'Interface Selection' },
    description: { tr: 'FastEthernet 0/1 arayüzüne girin', en: 'Enter FastEthernet 0/1 interface' },
    hint: { tr: '"int fa0/1" yazın.', en: 'Type "int fa0/1".' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface fa0/1' },
    completed: false,
    points: 5
  },
  {
    id: 'vlan-assign-10',
    order: 7,
    title: { tr: 'VLAN Atama', en: 'Assign VLAN' },
    description: { tr: 'Arayüzü VLAN 10\'a atayın', en: 'Assign the interface to VLAN 10' },
    hint: { tr: '"switchport access vlan 10" yazın.', en: 'Type "switchport access vlan 10".' },
    checkType: 'config',
    checkParams: { configKey: 'ports.fa0/1.vlan', configValue: 10 },
    completed: false,
    points: 10
  }
];

// 4. Router DHCP Yapılandırma
export const routerDhcpGuidedSteps: GuidedStep[] = [
  {
    id: 'dhcp-open-terminal',
    order: 1,
    title: { tr: 'Terminali Aç', en: 'Open Terminal' },
    description: { tr: 'Router terminalini açın', en: 'Open the router terminal' },
    hint: { tr: 'Router üzerine çift tıklayın.', en: 'Double-click on the router.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'dhcp-enable',
    order: 2,
    title: { tr: 'Enable Modu', en: 'Enable Mode' },
    description: { tr: 'Ayrıcalıklı moda geçin', en: 'Enter privileged EXEC mode' },
    hint: { tr: '"enable" yazın.', en: 'Type "enable".' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 5
  },
  {
    id: 'dhcp-conf-t',
    order: 3,
    title: { tr: 'Yapılandırma Modu', en: 'Config Mode' },
    description: { tr: 'Global yapılandırma moduna geçin', en: 'Enter global configuration mode' },
    hint: { tr: '"conf t" yazın.', en: 'Type "conf t".' },
    checkType: 'command',
    checkParams: { commandPattern: 'conf' },
    completed: false,
    points: 5
  },
  {
    id: 'dhcp-int-gi00',
    order: 4,
    title: { tr: 'Arayüz Seçimi', en: 'Interface Selection' },
    description: { tr: 'GigabitEthernet 0/0 arayüzüne girin', en: 'Enter GigabitEthernet 0/0 interface' },
    hint: { tr: '"int gi0/0" yazın.', en: 'Type "int gi0/0".' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi0/0' },
    completed: false,
    points: 5
  },
  {
    id: 'dhcp-ip-add',
    order: 5,
    title: { tr: 'IP Adresi Ata', en: 'Assign IP Address' },
    description: { tr: 'Arayüze 192.168.1.1 IP adresi atayın', en: 'Assign 192.168.1.1 IP to the interface' },
    hint: { tr: '"ip address 192.168.1.1 255.255.255.0" yazın.', en: 'Type "ip address 192.168.1.1 255.255.255.0".' },
    checkType: 'config',
    checkParams: { configKey: 'interfaces.gi0/0.ip', configValue: '192.168.1.1' },
    completed: false,
    points: 10
  },
  {
    id: 'dhcp-no-shut',
    order: 6,
    title: { tr: 'Arayüzü Aç', en: 'Enable Interface' },
    description: { tr: 'Arayüzü aktif hale getirin', en: 'Enable the interface' },
    hint: { tr: '"no shutdown" yazın.', en: 'Type "no shutdown".' },
    checkType: 'config',
    checkParams: { configKey: 'interfaces.gi0/0.shutdown', configValue: false },
    completed: false,
    points: 5
  },
  {
    id: 'dhcp-exit-if',
    order: 7,
    title: { tr: 'Arayüzden Çık', en: 'Exit Interface' },
    description: { tr: 'Arayüz yapılandırmasından çıkın', en: 'Exit interface configuration' },
    hint: { tr: '"exit" yazın.', en: 'Type "exit".' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit' },
    completed: false,
    points: 5
  },
  {
    id: 'dhcp-pool-create',
    order: 8,
    title: { tr: 'Havuz Oluştur', en: 'Create Pool' },
    description: { tr: 'LAN isminde bir DHCP havuzu oluşturun', en: 'Create a DHCP pool named LAN' },
    hint: { tr: '"ip dhcp pool LAN" yazın.', en: 'Type "ip dhcp pool LAN".' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp pool LAN' },
    completed: false,
    points: 10
  },
  {
    id: 'dhcp-pool-net-conf',
    order: 9,
    title: { tr: 'Ağ Tanımla', en: 'Define Network' },
    description: { tr: 'Dağıtılacak ağ adresini tanımlayın', en: 'Define the network address to be distributed' },
    hint: { tr: '"network 192.168.1.0 255.255.255.0" yazın.', en: 'Type "network 192.168.1.0 255.255.255.0".' },
    checkType: 'config',
    checkParams: { configKey: 'dhcpPools.LAN.network', configValue: '192.168.1.0' },
    completed: false,
    points: 10
  },
  {
    id: 'dhcp-pool-gw',
    order: 10,
    title: { tr: 'Varsayılan Ağ Geçidi', en: 'Default Gateway' },
    description: { tr: 'Havuz için varsayılan ağ geçidini tanımlayın', en: 'Define the default gateway for the pool' },
    hint: { tr: '"default-router 192.168.1.1" yazın.', en: 'Type "default-router 192.168.1.1".' },
    checkType: 'config',
    checkParams: { configKey: 'dhcpPools.LAN.defaultRouter', configValue: '192.168.1.1' },
    completed: false,
    points: 10
  }
];

// 5. Statik Yönlendirme
export const staticRoutingGuidedSteps: GuidedStep[] = [
  {
    id: 'static-open-terminal',
    order: 1,
    title: { tr: 'R1 Terminali', en: 'R1 Terminal' },
    description: { tr: 'R1 router terminalini açın', en: 'Open R1 router terminal' },
    hint: { tr: 'R1 üzerine çift tıklayın.', en: 'Double-click on R1.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'router', targetDeviceId: 'router-1' },
    completed: false,
    points: 5
  },
  {
    id: 'static-enable',
    order: 2,
    title: { tr: 'Enable Modu', en: 'Enable Mode' },
    description: { tr: 'Ayrıcalıklı moda geçin', en: 'Enter privileged EXEC mode' },
    hint: { tr: '"enable" yazın.', en: 'Type "enable".' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 5
  },
  {
    id: 'static-conf-t',
    order: 3,
    title: { tr: 'Yapılandırma Modu', en: 'Config Mode' },
    description: { tr: 'Global yapılandırma moduna geçin', en: 'Enter global configuration mode' },
    hint: { tr: '"conf t" yazın.', en: 'Type "conf t".' },
    checkType: 'command',
    checkParams: { commandPattern: 'conf' },
    completed: false,
    points: 5
  },
  {
    id: 'static-r1-route-add',
    order: 4,
    title: { tr: 'R1 Rota Ekle', en: 'R1 Add Route' },
    description: { tr: '192.168.2.0 ağına giden rotayı ekleyin', en: 'Add route to 192.168.2.0 network' },
    hint: { tr: '"ip route 192.168.2.0 255.255.255.0 10.0.0.2" yazın.', en: 'Type "ip route 192.168.2.0 255.255.255.0 10.0.0.2".' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-1', configKey: 'staticRoutes', configValue: { destination: '192.168.2.0' } },
    completed: false,
    points: 15
  },
  {
    id: 'static-r2-open',
    order: 5,
    title: { tr: 'R2 Terminali', en: 'R2 Terminal' },
    description: { tr: 'R2 router terminalini açın', en: 'Open R2 router terminal' },
    hint: { tr: 'R2 üzerine çift tıklayın.', en: 'Double-click on R2.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'router', targetDeviceId: 'router-2' },
    completed: false,
    points: 5
  },
  {
    id: 'static-r2-route-add',
    order: 6,
    title: { tr: 'R2 Rota Ekle', en: 'R2 Add Route' },
    description: { tr: '192.168.1.0 ağına giden rotayı ekleyin', en: 'Add route to 192.168.1.0 network' },
    hint: { tr: '"ip route 192.168.1.0 255.255.255.0 10.0.0.1" yazın.', en: 'Type "ip route 192.168.1.0 255.255.255.0 10.0.0.1".' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-2', configKey: 'staticRoutes', configValue: { destination: '192.168.1.0' } },
    completed: false,
    points: 15
  }
];

// 6. Port Güvenliği
export const portSecurityGuidedSteps: GuidedStep[] = [
  {
    id: 'ps-open-terminal',
    order: 1,
    title: { tr: 'Terminali Aç', en: 'Open Terminal' },
    description: { tr: 'Switch terminalini açın', en: 'Open the switch terminal' },
    hint: { tr: 'Switch üzerine çift tıklayın.', en: 'Double-click on the switch.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'ps-enable',
    order: 2,
    title: { tr: 'Enable Modu', en: 'Enable Mode' },
    description: { tr: 'Ayrıcalıklı moda geçin', en: 'Enter privileged EXEC mode' },
    hint: { tr: '"enable" yazın.', en: 'Type "enable".' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 5
  },
  {
    id: 'ps-conf-t',
    order: 3,
    title: { tr: 'Yapılandırma Modu', en: 'Config Mode' },
    description: { tr: 'Global yapılandırma moduna geçin', en: 'Enter global configuration mode' },
    hint: { tr: '"conf t" yazın.', en: 'Type "conf t".' },
    checkType: 'command',
    checkParams: { commandPattern: 'conf' },
    completed: false,
    points: 5
  },
  {
    id: 'ps-int-fa01',
    order: 4,
    title: { tr: 'Arayüz Seçimi', en: 'Interface Selection' },
    description: { tr: 'FastEthernet 0/1 arayüzüne girin', en: 'Enter FastEthernet 0/1 interface' },
    hint: { tr: '"int fa0/1" yazın.', en: 'Type "int fa0/1".' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface fa0/1' },
    completed: false,
    points: 5
  },
  {
    id: 'ps-mode-access',
    order: 5,
    title: { tr: 'Erişim Modu', en: 'Access Mode' },
    description: { tr: 'Portu access moduna alın', en: 'Set port to access mode' },
    hint: { tr: '"switchport mode access" yazın.', en: 'Type "switchport mode access".' },
    checkType: 'config',
    checkParams: { configKey: 'ports.fa0/1.mode', configValue: 'access' },
    completed: false,
    points: 5
  },
  {
    id: 'ps-enable-feat',
    order: 6,
    title: { tr: 'Güvenliği Aç', en: 'Enable Security' },
    description: { tr: 'Port güvenliğini etkinleştirin', en: 'Enable port security' },
    hint: { tr: '"switchport port-security" yazın.', en: 'Type "switchport port-security".' },
    checkType: 'config',
    checkParams: { configKey: 'ports.fa0/1.portSecurity.enabled', configValue: true },
    completed: false,
    points: 10
  },
  {
    id: 'ps-sticky-mac',
    order: 7,
    title: { tr: 'Sticky MAC', en: 'Sticky MAC' },
    description: { tr: 'MAC adreslerini kalıcı öğrenmeyi açın', en: 'Enable sticky MAC address learning' },
    hint: { tr: '"switchport port-security mac-address sticky" yazın.', en: 'Type "switchport port-security mac-address sticky".' },
    checkType: 'command',
    checkParams: { commandPattern: 'mac-address sticky' },
    completed: false,
    points: 10
  },
  {
    id: 'ps-max-1',
    order: 8,
    title: { tr: 'Maksimum MAC', en: 'Max MAC' },
    description: { tr: 'Maksimum 1 MAC adresine izin verin', en: 'Allow maximum 1 MAC address' },
    hint: { tr: '"switchport port-security maximum 1" yazın.', en: 'Type "switchport port-security maximum 1".' },
    checkType: 'command',
    checkParams: { commandPattern: 'maximum 1' },
    completed: false,
    points: 10
  }
];

// 7. RIP Dinamik Yönlendirme
export const ripRoutingGuidedSteps: GuidedStep[] = [
  {
    id: 'rip-open-terminal',
    order: 1,
    title: { tr: 'Terminali Aç', en: 'Open Terminal' },
    description: { tr: 'Router terminalini açın', en: 'Open the router terminal' },
    hint: { tr: 'Router üzerine çift tıklayın.', en: 'Double-click on the router.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'rip-enable',
    order: 2,
    title: { tr: 'Enable Modu', en: 'Enable Mode' },
    description: { tr: 'Ayrıcalıklı moda geçin', en: 'Enter privileged EXEC mode' },
    hint: { tr: '"enable" yazın.', en: 'Type "enable".' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 5
  },
  {
    id: 'rip-conf-t',
    order: 3,
    title: { tr: 'Yapılandırma Modu', en: 'Config Mode' },
    description: { tr: 'Global yapılandırma moduna geçin', en: 'Enter global configuration mode' },
    hint: { tr: '"conf t" yazın.', en: 'Type "conf t".' },
    checkType: 'command',
    checkParams: { commandPattern: 'conf' },
    completed: false,
    points: 5
  },
  {
    id: 'rip-start-proc',
    order: 4,
    title: { tr: 'RIP Başlat', en: 'Start RIP' },
    description: { tr: 'RIP yönlendirme protokolünü başlatın', en: 'Start RIP routing protocol' },
    hint: { tr: '"router rip" yazın.', en: 'Type "router rip".' },
    checkType: 'config',
    checkParams: { configKey: 'routingProtocol', configValue: 'rip' },
    completed: false,
    points: 10
  },
  {
    id: 'rip-version-2',
    order: 5,
    title: { tr: 'RIP Versiyon', en: 'RIP Version' },
    description: { tr: 'Versiyon 2\'yi seçin', en: 'Set version to 2' },
    hint: { tr: '"version 2" yazın.', en: 'Type "version 2".' },
    checkType: 'command',
    checkParams: { commandPattern: 'version 2' },
    completed: false,
    points: 10
  },
  {
    id: 'rip-net-1-add',
    order: 6,
    title: { tr: 'Ağ 1 Ekle', en: 'Add Network 1' },
    description: { tr: '192.168.1.0 ağını ekleyin', en: 'Add 192.168.1.0 network' },
    hint: { tr: '"network 192.168.1.0" yazın.', en: 'Type "network 192.168.1.0".' },
    checkType: 'command',
    checkParams: { commandPattern: 'network 192.168.1.0' },
    completed: false,
    points: 15
  },
  {
    id: 'rip-no-auto',
    order: 7,
    title: { tr: 'Auto-Summary Kapat', en: 'No Auto-Summary' },
    description: { tr: 'Otomatik özetlemeyi kapatın', en: 'Disable automatic summarization' },
    hint: { tr: '"no auto-summary" yazın.', en: 'Type "no auto-summary".' },
    checkType: 'command',
    checkParams: { commandPattern: 'auto-summary' },
    completed: false,
    points: 5
  }
];

// 8. DNS ve HTTP Servisleri
export const servicesGuidedSteps: GuidedStep[] = [
  {
    id: 'srv-open-server',
    order: 1,
    title: { tr: 'Sunucu Paneli', en: 'Server Panel' },
    description: { tr: 'Sunucu cihazını açın', en: 'Open the server device' },
    hint: { tr: 'Server-Web üzerine çift tıklayın.', en: 'Double-click on Server-Web.' },
    checkType: 'deviceAccess',
    checkParams: { targetDeviceId: 'server-1' },
    completed: false,
    points: 5
  },
  {
    id: 'srv-http-enable',
    order: 2,
    title: { tr: 'HTTP Servisi', en: 'HTTP Service' },
    description: { tr: 'HTTP servisini aktif edin', en: 'Enable HTTP service' },
    hint: { tr: 'HTTP sekmesinden "On" seçin.', en: 'Select "On" from HTTP tab.' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'server-1', configKey: 'services.http.enabled', configValue: true },
    completed: false,
    points: 15
  },
  {
    id: 'srv-open-dns',
    order: 3,
    title: { tr: 'DNS Sunucu', en: 'DNS Server' },
    description: { tr: 'DNS sunucusunu açın', en: 'Open the DNS server' },
    hint: { tr: 'DNS-Server üzerine çift tıklayın.', en: 'Double-click on DNS-Server.' },
    checkType: 'deviceAccess',
    checkParams: { targetDeviceId: 'dns-server-1' },
    completed: false,
    points: 5
  },
  {
    id: 'srv-dns-enable',
    order: 4,
    title: { tr: 'DNS Servisi', en: 'DNS Service' },
    description: { tr: 'DNS servisini aktif edin', en: 'Enable DNS service' },
    hint: { tr: 'DNS sekmesinden "On" seçin.', en: 'Select "On" from DNS tab.' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'dns-server-1', configKey: 'services.dns.enabled', configValue: true },
    completed: false,
    points: 15
  },
  {
    id: 'srv-dns-add-rec',
    order: 5,
    title: { tr: 'DNS Kaydı', en: 'DNS Record' },
    description: { tr: 'Kayıt ekleyin (www.lab.com -> 192.168.1.10)', en: 'Add record (www.lab.com -> 192.168.1.10)' },
    hint: { tr: 'İsim ve IP girip "Add" basın.', en: 'Enter name and IP, then press "Add".' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'dns-server-1', configKey: 'services.dns.records', configValue: [{ domain: 'www.lab.com', address: '192.168.1.10' }] },
    completed: false,
    points: 20
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
    },
    {
      id: 'guided-cli-lessons',
      tag: 'CLI',
      title: isTr ? 'Kapsamlı Rehberli Dersler' : 'Comprehensive Guided Lessons',
      description: isTr ? 'Tüm CLI komutlarının pratik uygulaması' : 'Practical application of all CLI commands',
      detail: isTr ? 'Çok aşamalı kapsamlı CLI eğitimi: Temel moddan ileri konulara kadar.' : 'Multi-step comprehensive CLI training: From basic mode to advanced topics.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'switch-1', type: 'switchL2', name: 'SW-Lab', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() as any },
            { id: 'router-1', type: 'router', name: 'R-Lab', x: 600, y: 200, ip: '', status: 'online', ports: generateRouterPorts() as any },
            { id: 'pc-1', type: 'pc', name: 'PC-Lab', x: 100, y: 200, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/1', cableType: 'straight', active: true },
            { id: 'c2', sourceDeviceId: 'switch-1', sourcePort: 'fa0/24', targetDeviceId: 'router-1', targetPort: 'gi0/0', cableType: 'crossover', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: cliGuidedLessons, estimatedTimeMinutes: 240, difficulty: 'intermediate',
      totalPoints: cliGuidedLessons.reduce((acc, s) => acc + (s.points || 0), 0)
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

// CLI Rehberli Dersler - 30 Pratik Ders
export const cliGuidedLessons: GuidedStep[] = [
  // Bölüm 1: Temel Modu Komutları
  {
    id: 'cli-lesson-1-1',
    order: 1,
    title: { tr: 'Ders 1: Modu Değiştirme ve Yardım Sistemi', en: 'Lesson 1: Mode Switching and Help System' },
    description: { tr: 'Enable/disable modları ve yardım komutlarını öğrenin', en: 'Learn enable/disable modes and help commands' },
    hint: { tr: 'enable komutu ile ayrıcalıklı moda geçin', en: 'Use enable command to enter privileged mode' },
    detailedInstructions: {
      tr: ['Herhangi bir cihaza çift tıklayın', 'Terminal panelini açın', 'enable yazıp Enter\'a basın', 'disable yazıp Enter\'a basın', 'help yazıp Enter\'a basın'],
      en: ['Double-click any device', 'Open terminal panel', 'Type enable and press Enter', 'Type disable and press Enter', 'Type help and press Enter']
    },
    checkType: 'command',
    checkParams: { commandPattern: 'enable|disable|help' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-1-2',
    order: 2,
    title: { tr: 'Ders 2: Bağlantı Testi - Ping Komutu', en: 'Lesson 2: Connectivity Test - Ping Command' },
    description: { tr: 'Ping komutu ile ağ bağlantısını test edin', en: 'Test network connectivity with ping command' },
    hint: { tr: 'ping 192.168.1.2 yazıp Enter\'a basın', en: 'Type ping 192.168.1.2 and press Enter' },
    checkType: 'command',
    checkParams: { commandPattern: 'ping' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-1-3a',
    order: 3,
    title: { tr: 'Ders 3a: Konfigürasyonu Görüntüle', en: 'Lesson 3a: View Configuration' },
    description: { tr: 'show running-config komutunu kullanın', en: 'Use show running-config command' },
    hint: { tr: 'show running-config yazıp konfigürasyonu görün', en: 'Type show running-config to view configuration' },
    checkType: 'command',
    checkParams: { commandPattern: 'show running-config' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-1-3b',
    order: 3.5,
    title: { tr: 'Ders 3b: Konfigürasyonu Kaydet', en: 'Lesson 3b: Save Configuration' },
    description: { tr: 'write memory komutunu kullanın', en: 'Use write memory command' },
    hint: { tr: 'write memory yazıp konfigürasyonu kaydedin', en: 'Type write memory to save configuration' },
    checkType: 'command',
    checkParams: { commandPattern: 'write memory|copy running-config startup-config' },
    completed: false,
    points: 10
  },
  // Bölüm 2: Global Konfigürasyon
  {
    id: 'cli-lesson-2-1a',
    order: 4,
    title: { tr: 'Ders 4a: Hostname Ayarla', en: 'Lesson 4a: Set Hostname' },
    description: { tr: 'Hostname komutunu öğrenin', en: 'Learn hostname command' },
    hint: { tr: 'conf t yazıp hostname SW-Lab yazın', en: 'Type conf t then hostname SW-Lab' },
    checkType: 'command',
    checkParams: { commandPattern: 'hostname' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-1b',
    order: 4.5,
    title: { tr: 'Ders 4b: Banner Ayarla', en: 'Lesson 4b: Set Banner' },
    description: { tr: 'Banner komutunu öğrenin', en: 'Learn banner command' },
    hint: { tr: 'banner motd yazıp hoşgeldiniz mesajı yazın', en: 'Type banner motd and enter welcome message' },
    checkType: 'command',
    checkParams: { commandPattern: 'banner' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-1c',
    order: 5,
    title: { tr: 'Ders 4c: Enable Secret Ayarla', en: 'Lesson 4c: Set Enable Secret' },
    description: { tr: 'Enable secret komutunu öğrenin', en: 'Learn enable secret command' },
    hint: { tr: 'enable secret password yazın', en: 'Type enable secret password' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable secret' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-2a',
    order: 6,
    title: { tr: 'Ders 5a: DNS Sunucusu Ayarla', en: 'Lesson 5a: Set DNS Server' },
    description: { tr: 'DNS sunucusu komutunu öğrenin', en: 'Learn DNS server command' },
    hint: { tr: 'ip name-server 8.8.8.8 yazın', en: 'Type ip name-server 8.8.8.8' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip name-server' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-2b',
    order: 6.5,
    title: { tr: 'Ders 5b: Saat Dilimi Ayarla', en: 'Lesson 5b: Set Timezone' },
    description: { tr: 'Saat dilimi komutunu öğrenin', en: 'Learn timezone command' },
    hint: { tr: 'clock timezone UTC 0 yazın', en: 'Type clock timezone UTC 0' },
    checkType: 'command',
    checkParams: { commandPattern: 'clock timezone' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-2c',
    order: 7,
    title: { tr: 'Ders 5c: NTP Sunucusu Ayarla', en: 'Lesson 5c: Set NTP Server' },
    description: { tr: 'NTP sunucusu komutunu öğrenin', en: 'Learn NTP server command' },
    hint: { tr: 'ntp server 192.168.1.1 yazın', en: 'Type ntp server 192.168.1.1' },
    checkType: 'command',
    checkParams: { commandPattern: 'ntp server' },
    completed: false,
    points: 10
  },
  // Bölüm 3: Arayüz Konfigürasyonu
  {
    id: 'cli-lesson-3-1',
    order: 6,
    title: { tr: 'Ders 6: Temel Arayüz Ayarları', en: 'Lesson 6: Basic Interface Settings' },
    description: { tr: 'Arayüz IP adresi ve no shutdown komutlarını kullanın', en: 'Use interface IP address and no shutdown commands' },
    hint: { tr: 'int fa0/1 yazıp no shutdown yazın', en: 'Type int fa0/1 then no shutdown' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface|no shutdown|ip address' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-3-2',
    order: 7,
    title: { tr: 'Ders 7: Arayüz Aralığı Konfigürasyonu', en: 'Lesson 7: Interface Range Configuration' },
    description: { tr: 'Birden fazla arayüzü aynı anda yapılandırın', en: 'Configure multiple interfaces at once' },
    hint: { tr: 'interface range fa0/1 - 5 yazın', en: 'Type interface range fa0/1 - 5' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface range' },
    completed: false,
    points: 15
  },
  // Bölüm 4: VLAN Yönetimi
  {
    id: 'cli-lesson-4-1a',
    order: 8,
    title: { tr: 'Ders 8a: VLAN Oluştur', en: 'Lesson 8a: Create VLAN' },
    description: { tr: 'VLAN oluşturun', en: 'Create a VLAN' },
    hint: { tr: 'vlan 10 yazın', en: 'Type vlan 10' },
    checkType: 'command',
    checkParams: { commandPattern: 'vlan' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-4-1b',
    order: 8.5,
    title: { tr: 'Ders 8b: VLAN İsimlendir', en: 'Lesson 8b: Name VLAN' },
    description: { tr: 'VLAN\'a isim verin', en: 'Give the VLAN a name' },
    hint: { tr: 'name SALES yazın', en: 'Type name SALES' },
    checkType: 'command',
    checkParams: { commandPattern: 'name' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-4-2',
    order: 9,
    title: { tr: 'Ders 9: Arayüzleri VLAN\'a Atama', en: 'Lesson 9: Assigning Interfaces to VLAN' },
    description: { tr: 'Arayüzleri VLAN\'lara atayın', en: 'Assign interfaces to VLANs' },
    hint: { tr: 'switchport access vlan 10 yazın', en: 'Type switchport access vlan 10' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport access vlan' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-4-3',
    order: 10,
    title: { tr: 'Ders 10: Trunk Portları', en: 'Lesson 10: Trunk Ports' },
    description: { tr: 'Trunk portlarını yapılandırın', en: 'Configure trunk ports' },
    hint: { tr: 'switchport mode trunk yazın', en: 'Type switchport mode trunk' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport mode trunk' },
    completed: false,
    points: 15
  },
  // Bölüm 5: Yönlendirme
  {
    id: 'cli-lesson-5-1',
    order: 11,
    title: { tr: 'Ders 11: Statik Yönlendirme', en: 'Lesson 11: Static Routing' },
    description: { tr: 'Statik rotalar ekleyin', en: 'Add static routes' },
    hint: { tr: 'ip route 192.168.2.0 255.255.255.0 192.168.1.2 yazın', en: 'Type ip route 192.168.2.0 255.255.255.0 192.168.1.2' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip route' },
    completed: false,
    points: 20
  },
  {
    id: 'cli-lesson-5-2a',
    order: 12,
    title: { tr: 'Ders 12a: RIP Başlat', en: 'Lesson 12a: Start RIP' },
    description: { tr: 'RIP yönlendirme protokolünü başlatın', en: 'Start RIP routing protocol' },
    hint: { tr: 'router rip yazın', en: 'Type router rip' },
    checkType: 'command',
    checkParams: { commandPattern: 'router rip' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-5-2b',
    order: 12.5,
    title: { tr: 'Ders 12b: Ağ Ekle', en: 'Lesson 12b: Add Network' },
    description: { tr: 'Ağ adresini ekleyin', en: 'Add network address' },
    hint: { tr: 'network 192.168.1.0 yazın', en: 'Type network 192.168.1.0' },
    checkType: 'command',
    checkParams: { commandPattern: 'network' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-5-3a',
    order: 13,
    title: { tr: 'Ders 13a: OSPF Başlat', en: 'Lesson 13a: Start OSPF' },
    description: { tr: 'OSPF yönlendirme protokolünü başlatın', en: 'Start OSPF routing protocol' },
    hint: { tr: 'router ospf 1 yazın', en: 'Type router ospf 1' },
    checkType: 'command',
    checkParams: { commandPattern: 'router ospf' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-5-3b',
    order: 13.5,
    title: { tr: 'Ders 13b: Router ID Ayarla', en: 'Lesson 13b: Set Router ID' },
    description: { tr: 'Router ID\'yi ayarlayın', en: 'Set the router ID' },
    hint: { tr: 'router-id 1.1.1.1 yazın', en: 'Type router-id 1.1.1.1' },
    checkType: 'command',
    checkParams: { commandPattern: 'router-id' },
    completed: false,
    points: 15
  },
  // Bölüm 6: Güvenlik
  {
    id: 'cli-lesson-6-1a',
    order: 14,
    title: { tr: 'Ders 14a: Port Güvenliğini Aç', en: 'Lesson 14a: Enable Port Security' },
    description: { tr: 'Port güvenliğini etkinleştirin', en: 'Enable port security' },
    hint: { tr: 'switchport port-security yazın', en: 'Type switchport port-security' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport port-security' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-6-1b',
    order: 14.5,
    title: { tr: 'Ders 14b: Sticky MAC Ekle', en: 'Lesson 14b: Add Sticky MAC' },
    description: { tr: 'Sticky MAC adresini ekleyin', en: 'Add sticky MAC address' },
    hint: { tr: 'switchport port-security mac-address sticky yazın', en: 'Type switchport port-security mac-address sticky' },
    checkType: 'command',
    checkParams: { commandPattern: 'mac-address sticky' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-6-2a',
    order: 15,
    title: { tr: 'Ders 15a: RSA Anahtarı Oluştur', en: 'Lesson 15a: Generate RSA Key' },
    description: { tr: 'RSA anahtarı oluşturun', en: 'Generate RSA key' },
    hint: { tr: 'crypto key generate rsa yazın', en: 'Type crypto key generate rsa' },
    checkType: 'command',
    checkParams: { commandPattern: 'crypto key generate rsa' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-6-2b',
    order: 15.5,
    title: { tr: 'Ders 15b: SSH Versiyonu Ayarla', en: 'Lesson 15b: Set SSH Version' },
    description: { tr: 'SSH versiyonunu ayarlayın', en: 'Set SSH version' },
    hint: { tr: 'ip ssh version 2 yazın', en: 'Type ip ssh version 2' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip ssh version' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-6-3',
    order: 16,
    title: { tr: 'Ders 16: Kullanıcı Yönetimi', en: 'Lesson 16: User Management' },
    description: { tr: 'Yerel kullanıcılar oluşturun', en: 'Create local users' },
    hint: { tr: 'username admin privilege 15 secret password yazın', en: 'Type username admin privilege 15 secret password' },
    checkType: 'command',
    checkParams: { commandPattern: 'username' },
    completed: false,
    points: 20
  },
  // Bölüm 7: Kablosuz
  {
    id: 'cli-lesson-7-1',
    order: 17,
    title: { tr: 'Ders 17: WLC Konfigürasyonu', en: 'Lesson 17: WLC Configuration' },
    description: { tr: 'Kablosuz LAN Denetleyicisini yapılandırın', en: 'Configure Wireless LAN Controller' },
    hint: { tr: 'wlan MyNetwork 1 MySSID yazın', en: 'Type wlan MyNetwork 1 MySSID' },
    checkType: 'command',
    checkParams: { commandPattern: 'wlan' },
    completed: false,
    points: 20
  },
  {
    id: 'cli-lesson-7-2',
    order: 18,
    title: { tr: 'Ders 18: Access Point Konfigürasyonu', en: 'Lesson 18: Access Point Configuration' },
    description: { tr: 'Access Point\'i yapılandırın', en: 'Configure Access Point' },
    hint: { tr: 'station-role root yazıp SSID ayarlayın', en: 'Type station-role root and set SSID' },
    checkType: 'command',
    checkParams: { commandPattern: 'station-role|ssid' },
    completed: false,
    points: 20
  },
  // Bölüm 8: Hata Ayıklama
  {
    id: 'cli-lesson-8-1a',
    order: 19,
    title: { tr: 'Ders 19a: Debug Başlat', en: 'Lesson 19a: Start Debug' },
    description: { tr: 'Debug komutunu kullanın', en: 'Use debug command' },
    hint: { tr: 'debug ip packet yazın', en: 'Type debug ip packet' },
    checkType: 'command',
    checkParams: { commandPattern: 'debug' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-1b',
    order: 19.5,
    title: { tr: 'Ders 19b: Debug Kapat', en: 'Lesson 19b: Stop Debug' },
    description: { tr: 'Undebug komutunu kullanın', en: 'Use undebug command' },
    hint: { tr: 'undebug all yazın', en: 'Type undebug all' },
    checkType: 'command',
    checkParams: { commandPattern: 'undebug' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-2a',
    order: 20,
    title: { tr: 'Ders 20a: Arayüzleri Göster', en: 'Lesson 20a: Show Interfaces' },
    description: { tr: 'show interfaces komutunu kullanın', en: 'Use show interfaces command' },
    hint: { tr: 'show interfaces yazın', en: 'Type show interfaces' },
    checkType: 'command',
    checkParams: { commandPattern: 'show interfaces' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2b',
    order: 20.5,
    title: { tr: 'Ders 20b: Rotaları Göster', en: 'Lesson 20b: Show Routes' },
    description: { tr: 'show ip route komutunu kullanın', en: 'Use show ip route command' },
    hint: { tr: 'show ip route yazın', en: 'Type show ip route' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip route' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2c',
    order: 21,
    title: { tr: 'Ders 20c: VLAN\'ları Göster', en: 'Lesson 20c: Show VLANs' },
    description: { tr: 'show vlan komutunu kullanın', en: 'Use show vlan command' },
    hint: { tr: 'show vlan yazın', en: 'Type show vlan' },
    checkType: 'command',
    checkParams: { commandPattern: 'show vlan' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-3a',
    order: 22,
    title: { tr: 'Ders 21a: STP Göster', en: 'Lesson 21a: Show STP' },
    description: { tr: 'show spanning-tree komutunu kullanın', en: 'Use show spanning-tree command' },
    hint: { tr: 'show spanning-tree yazın', en: 'Type show spanning-tree' },
    checkType: 'command',
    checkParams: { commandPattern: 'show spanning-tree' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-3b',
    order: 22.5,
    title: { tr: 'Ders 21b: STP Modu Ayarla', en: 'Lesson 21b: Set STP Mode' },
    description: { tr: 'spanning-tree mode komutunu kullanın', en: 'Use spanning-tree mode command' },
    hint: { tr: 'spanning-tree mode rapid-pvst yazın', en: 'Type spanning-tree mode rapid-pvst' },
    checkType: 'command',
    checkParams: { commandPattern: 'spanning-tree mode' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-4a',
    order: 23,
    title: { tr: 'Ders 22a: CDP Komşuları Göster', en: 'Lesson 22a: Show CDP Neighbors' },
    description: { tr: 'show cdp neighbors komutunu kullanın', en: 'Use show cdp neighbors command' },
    hint: { tr: 'show cdp neighbors yazın', en: 'Type show cdp neighbors' },
    checkType: 'command',
    checkParams: { commandPattern: 'show cdp neighbors' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-4b',
    order: 23.5,
    title: { tr: 'Ders 22b: CDP Aç', en: 'Lesson 22b: Enable CDP' },
    description: { tr: 'cdp run komutunu kullanın', en: 'Use cdp run command' },
    hint: { tr: 'cdp run yazın', en: 'Type cdp run' },
    checkType: 'command',
    checkParams: { commandPattern: 'cdp run' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-5',
    order: 23,
    title: { tr: 'Ders 23: DHCP Snooping', en: 'Lesson 23: DHCP Snooping' },
    description: { tr: 'DHCP Snooping\'i yapılandırın', en: 'Configure DHCP Snooping' },
    hint: { tr: 'ip dhcp snooping yazıp ip dhcp snooping vlan 1,10,20 yazın', en: 'Type ip dhcp snooping then ip dhcp snooping vlan 1,10,20' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp snooping' },
    completed: false,
    points: 20
  },
  // Bölüm 9: İleri Konular
  {
    id: 'cli-lesson-9-1',
    order: 24,
    title: { tr: 'Ders 24: DHCP Sunucusu', en: 'Lesson 24: DHCP Server' },
    description: { tr: 'DHCP sunucusunu yapılandırın', en: 'Configure DHCP server' },
    hint: { tr: 'ip dhcp pool LAN yazıp network ve default-router ayarlayın', en: 'Type ip dhcp pool LAN then set network and default-router' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp pool|network|default-router' },
    completed: false,
    points: 20
  },
  {
    id: 'cli-lesson-9-2',
    order: 25,
    title: { tr: 'Ders 25: EtherChannel', en: 'Lesson 25: EtherChannel' },
    description: { tr: 'EtherChannel\'ı yapılandırın', en: 'Configure EtherChannel' },
    hint: { tr: 'channel-group 1 mode active yazın', en: 'Type channel-group 1 mode active' },
    checkType: 'command',
    checkParams: { commandPattern: 'channel-group' },
    completed: false,
    points: 20
  },
  {
    id: 'cli-lesson-9-3',
    order: 26,
    title: { tr: 'Ders 26: QoS Konfigürasyonu', en: 'Lesson 26: QoS Configuration' },
    description: { tr: 'QoS\'u yapılandırın', en: 'Configure QoS' },
    hint: { tr: 'mls qos yazıp mls qos trust cos yazın', en: 'Type mls qos then mls qos trust cos' },
    checkType: 'command',
    checkParams: { commandPattern: 'mls qos' },
    completed: false,
    points: 20
  },
  {
    id: 'cli-lesson-9-4',
    order: 27,
    title: { tr: 'Ders 27: IPv6 Konfigürasyonu', en: 'Lesson 27: IPv6 Configuration' },
    description: { tr: 'IPv6\'yı yapılandırın', en: 'Configure IPv6' },
    hint: { tr: 'ipv6 unicast-routing yazıp ipv6 address ayarlayın', en: 'Type ipv6 unicast-routing then set ipv6 address' },
    checkType: 'command',
    checkParams: { commandPattern: 'ipv6' },
    completed: false,
    points: 20
  },
  {
    id: 'cli-lesson-9-5',
    order: 28,
    title: { tr: 'Ders 28: Sistem Yönetimi', en: 'Lesson 28: System Management' },
    description: { tr: 'Sistem yönetimi komutlarını kullanın', en: 'Use system management commands' },
    hint: { tr: 'show inventory, show environment, show memory yazın', en: 'Type show inventory, show environment, show memory' },
    checkType: 'command',
    checkParams: { commandPattern: 'show inventory|show environment|show memory' },
    completed: false,
    points: 20
  },
  {
    id: 'cli-lesson-9-6',
    order: 29,
    title: { tr: 'Ders 29: Komut Takma Adları', en: 'Lesson 29: Command Aliases' },
    description: { tr: 'Komut takma adları oluşturun', en: 'Create command aliases' },
    hint: { tr: 'alias exec si show interfaces yazın', en: 'Type alias exec si show interfaces' },
    checkType: 'command',
    checkParams: { commandPattern: 'alias' },
    completed: false,
    points: 20
  },
  {
    id: 'cli-lesson-9-7',
    order: 30,
    title: { tr: 'Ders 30: IoT Sensör Konfigürasyonu', en: 'Lesson 30: IoT Sensor Configuration' },
    description: { tr: 'IoT sensörlerini yapılandırın', en: 'Configure IoT sensors' },
    hint: { tr: 'iot sensor temperature yazıp iot name ve iot wifi ayarlayın', en: 'Type iot sensor temperature then set iot name and iot wifi' },
    checkType: 'command',
    checkParams: { commandPattern: 'iot' },
    completed: false,
    points: 20
  }
];
