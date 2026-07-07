// Rehberli Ders (Guided Lesson) - Adım adım öğrenme sistemi
import { ExampleProject } from './exampleProjects';
import { generateSwitchPorts, generateRouterPorts } from '@/components/network/networkTopology.portGenerators';
import type { CanvasConnection, CanvasDevice } from '@/components/network/networkTopology.types';
import type { SwitchState, Route, Port } from './types';

export interface GuidedStep {
  id: string;
  order: number;
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  hint: { tr: string; en: string };
  detailedInstructions?: { tr: string[]; en: string[] };
  animationId?: string;
  checkType: 'deviceAccess' | 'command' | 'config' | 'connection' | 'ping' | 'manual' | 'deviceCount' | 'faultResolved' | 'routingConverged' | 'showOutputMatch';
  checkParams?: {
    deviceType?: 'switch' | 'router' | 'pc' | 'iot' | 'firewall';
    minCount?: number;
    commandPattern?: string;
    configKey?: string;
    configValue?: unknown;
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
    // For faultResolved
    faultId?: string;
    // For showOutputMatch
    showCommand?: string;
    matchPattern?: string;
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
  integrityHash?: string; // Tamper-proof integrity hash
}

// 0. Cihaz Ekleme ve Bağlantı
export const addDeviceGuidedSteps: GuidedStep[] = [
  {
    id: 'add-pc-step',
    order: 1,
    title: { tr: 'Bilgisayar Ekle', en: 'Add a Computer' },
    description: { tr: 'Araç çubuğundan PC simgesine tıklayarak topolojiye bir bilgisayar ekleyin.', en: 'Add a computer to the topology by clicking the PC icon from the toolbar.' },
    hint: { tr: 'Üst menüdeki bilgisayar simgesine bir kez tıklayın.', en: 'Click the computer icon in the top menu once.' },
    animationId: 'add-pc',
    checkType: 'deviceCount',
    checkParams: { deviceType: 'pc', minCount: 1 },
    completed: false,
    points: 10
  },
  {
    id: 'add-switch-step',
    order: 2,
    title: { tr: 'Switch Ekle', en: 'Add a Switch' },
    description: { tr: 'Şimdi ağımıza bir Switch (anahtar) ekleyelim.', en: 'Now add a Switch to our network.' },
    hint: { tr: 'Yeşil renkli Switch simgesine tıklayın.', en: 'Click the green Switch icon.' },
    animationId: 'add-switch',
    checkType: 'deviceCount',
    checkParams: { deviceType: 'switch', minCount: 1 },
    completed: false,
    points: 10
  },
  {
    id: 'connect-devices-step',
    order: 3,
    title: { tr: 'Cihazları Bağla', en: 'Connect Devices' },
    description: { tr: 'Düz (Straight) kabloyu seçin ve PC ile Switch arasında bağlantı kurun.', en: 'Select the Straight-through cable and establish a connection between the PC and the Switch.' },
    hint: { tr: 'Kabloyu seçin, PC\'ye tıklayın (Eth0), ardından Switch\'e tıklayın (Fa0/1).', en: 'Select the cable, click the PC (Eth0), then click the Switch (Fa0/1).' },
    animationId: 'connect-cable',
    checkType: 'connection',
    checkParams: { cableType: 'straight' },
    completed: false,
    points: 20
  }
];

// 0.1 PC CMD Komutları
export const pcCmdGuidedSteps: GuidedStep[] = [
  {
    id: 'open-pc-cmd',
    order: 1,
    title: { tr: 'CMD\'yi Aç', en: 'Open CMD' },
    description: { tr: 'Bilgisayara çift tıklayarak terminali açın ve "Command Prompt" (Komut İstemi) uygulamasına girin.', en: 'Double-click the computer to open the terminal and enter the "Command Prompt" application.' },
    hint: { tr: 'PC üzerine çift tıklayın, ardından CMD simgesine basın.', en: 'Double-click on the PC, then press the CMD icon.' },
    animationId: 'open-pc-cmd',
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'pc' },
    completed: false,
    points: 5
  },
  {
    id: 'run-ipconfig',
    order: 2,
    title: { tr: 'IP Yapılandırmasını Gör', en: 'View IP Config' },
    description: { tr: 'Bilgisayarın IP adresini görmek için "ipconfig" komutunu yazın.', en: 'Type the "ipconfig" command to see the computer\'s IP address.' },
    hint: { tr: 'Terminalde "ipconfig" yazıp Enter\'a basın.', en: 'Type "ipconfig" in the terminal and press Enter.' },
    animationId: 'pc-ipconfig',
    checkType: 'command',
    checkParams: { commandPattern: 'ipconfig' },
    completed: false,
    points: 10
  },
  {
    id: 'run-help-cmd',
    order: 3,
    title: { tr: 'Yardım Al', en: 'Get Help' },
    description: { tr: 'Kullanabileceğiniz tüm komutları görmek için "help" yazın.', en: 'Type "help" to see all available commands.' },
    hint: { tr: '"help" yazıp Enter\'a basın.', en: 'Type "help" and press Enter.' },
    animationId: 'pc-help',
    checkType: 'command',
    checkParams: { commandPattern: 'help' },
    completed: false,
    points: 5
  }
];

// 0.2 CLI Temelleri
export const cliBasicsGuidedSteps: GuidedStep[] = [
  {
    id: 'open-switch-cli',
    order: 1,
    title: { tr: 'Switch CLI Aç', en: 'Open Switch CLI' },
    description: { tr: 'Switch cihazına çift tıklayarak CLI (Komut Satırı Arayüzü) ekranına girin.', en: 'Double-click the Switch device to enter the CLI (Command Line Interface) screen.' },
    hint: { tr: 'Switch-1 üzerine çift tıklayın.', en: 'Double-click on Switch-1.' },
    animationId: 'open-cli',
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-enable-step',
    order: 2,
    title: { tr: 'Ayrıcalıklı Mod', en: 'Privileged Mode' },
    description: { tr: '"enable" komutu ile ayrıcalıklı moda geçin. Bu modda ayarları görebilirsiniz.', en: 'Switch to privileged mode with the "enable" command. You can see settings in this mode.' },
    hint: { tr: '"enable" yazın.', en: 'Type "enable".' },
    animationId: 'cli-enable',
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-conf-t-step',
    order: 3,
    title: { tr: 'Yapılandırma Modu', en: 'Configuration Mode' },
    description: { tr: 'Cihaz ayarlarını değiştirmek için "configure terminal" komutunu kullanın.', en: 'Use the "configure terminal" command to change device settings.' },
    hint: { tr: '"conf t" yazın.', en: 'Type "conf t".' },
    animationId: 'cli-config',
    checkType: 'command',
    checkParams: { commandPattern: 'conf' },
    completed: false,
    points: 10
  }
];

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

// 9. SOHO (Small Office Home Office) Senaryosu
export const sohoGuidedSteps: GuidedStep[] = [
  {
    id: 'soho-connect-pc',
    order: 1,
    title: { tr: 'PC Bağlantısı', en: 'Connect PC' },
    description: { tr: 'Ofis bilgisayarını switch\'e bağlayın.', en: 'Connect the office PC to the switch.' },
    hint: { tr: 'Düz kablo: PC-1 Eth0 -> Switch-1 Fa0/1', en: 'Straight cable: PC-1 Eth0 -> Switch-1 Fa0/1' },
    checkType: 'connection',
    checkParams: { cableType: 'straight', sourceDevice: 'pc-1', sourcePort: 'eth0', targetDevice: 'switch-1', targetPort: 'fa0/1' },
    completed: false,
    points: 10
  },
  {
    id: 'soho-connect-router',
    order: 2,
    title: { tr: 'Router Bağlantısı', en: 'Connect Router' },
    description: { tr: 'Switch\'i router\'a bağlayarak internet çıkışını hazırlayın.', en: 'Connect the switch to the router to prepare internet access.' },
    hint: { tr: 'Düz kablo: Switch-1 Gi0/1 -> Router-1 Gi0/0', en: 'Straight cable: Switch-1 Gi0/1 -> Router-1 Gi0/0' },
    checkType: 'connection',
    checkParams: { cableType: 'straight', sourceDevice: 'switch-1', sourcePort: 'gi0/1', targetDevice: 'router-1', targetPort: 'gi0/0' },
    completed: false,
    points: 10
  },
  {
    id: 'soho-router-ip',
    order: 3,
    title: { tr: 'Ağ Geçidi IP', en: 'Gateway IP' },
    description: { tr: 'Router arayüzüne yerel ağ geçidi IP adresini (192.168.1.1) atayın.', en: 'Assign the local gateway IP address (192.168.1.1) to the router interface.' },
    hint: { tr: 'int gi0/0 -> ip address 192.168.1.1 255.255.255.0 -> no shut', en: 'int gi0/0 -> ip address 192.168.1.1 255.255.255.0 -> no shut' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-1', configKey: 'interfaces.gi0/0.ip', configValue: '192.168.1.1' },
    completed: false,
    points: 15
  },
  {
    id: 'soho-dhcp',
    order: 4,
    title: { tr: 'Otomatik IP (DHCP)', en: 'Automatic IP (DHCP)' },
    description: { tr: 'Ofis cihazları için DHCP havuzu oluşturun.', en: 'Create a DHCP pool for office devices.' },
    hint: { tr: 'ip dhcp pool OFIS -> network 192.168.1.0 255.255.255.0 -> default-router 192.168.1.1', en: 'ip dhcp pool OFIS -> network 192.168.1.0 255.255.255.0 -> default-router 192.168.1.1' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-1', configKey: 'dhcpPools.OFIS.network', configValue: '192.168.1.0' },
    completed: false,
    points: 15
  },
  {
    id: 'soho-wifi-ssid',
    order: 5,
    title: { tr: 'Misafir WiFi', en: 'Guest WiFi' },
    description: { tr: 'Router üzerinde "Ofis-Wifi" isminde bir kablosuz ağ yayınlayın.', en: 'Broadcast a wireless network named "Office-Wifi" on the router.' },
    hint: { tr: 'Wifi sekmesinden SSID: Office-Wifi, Auth: Open yapın.', en: 'From Wifi tab set SSID: Office-Wifi, Auth: Open.' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-1', configKey: 'ports.wlan0.wifi.ssid', configValue: 'Office-Wifi' },
    completed: false,
    points: 20
  },
  {
    id: 'soho-pc2-wifi',
    order: 6,
    title: { tr: 'Laptop Bağlantısı', en: 'Laptop Connection' },
    description: { tr: 'Laptop (PC-2) cihazını kablosuz ağa bağlayın.', en: 'Connect the Laptop (PC-2) device to the wireless network.' },
    hint: { tr: 'PC-2 > Desktop > Wifi > SSID: Office-Wifi seçin.', en: 'PC-2 > Desktop > Wifi > select SSID: Office-Wifi.' },
    checkType: 'config',
    checkParams: { configKey: 'pc.pc-2.wifi.ssid', configValue: 'Office-Wifi' },
    completed: false,
    points: 15
  },
  {
    id: 'soho-ping-test',
    order: 7,
    title: { tr: 'Erişim Testi', en: 'Connectivity Test' },
    description: { tr: 'Laptop\'tan sabit bilgisayara ping atarak bağlantıyı doğrulayın.', en: 'Verify connectivity by pinging from the Laptop to the desktop PC.' },
    hint: { tr: 'PC-2 CMD > ping 192.168.1.10 (PC-1\'in IP\'si)', en: 'PC-2 CMD > ping 192.168.1.10 (PC-1 IP)' },
    checkType: 'ping',
    checkParams: { fromDevice: 'pc-2', toIp: '192.168.1.10' },
    completed: false,
    points: 15
  }
];

// 10. Okul Kampüsü (School Campus) Senaryosu
export const campusGuidedSteps: GuidedStep[] = [
  {
    id: 'campus-vlan-10',
    order: 1,
    title: { tr: 'İdari VLAN (10)', en: 'Admin VLAN (10)' },
    description: { tr: 'Yönetim birimi için VLAN 10 oluşturun.', en: 'Create VLAN 10 for the administration unit.' },
    hint: { tr: 'vlan 10 -> name ADMIN', en: 'vlan 10 -> name ADMIN' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'vlans.10.name', configValue: 'ADMIN' },
    completed: false,
    points: 10
  },
  {
    id: 'campus-vlan-20',
    order: 2,
    title: { tr: 'Öğrenci VLAN (20)', en: 'Student VLAN (20)' },
    description: { tr: 'Öğrenci laboratuvarları için VLAN 20 oluşturun.', en: 'Create VLAN 20 for student laboratories.' },
    hint: { tr: 'vlan 20 -> name STUDENT', en: 'vlan 20 -> name STUDENT' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'vlans.20.name', configValue: 'STUDENT' },
    completed: false,
    points: 10
  },
  {
    id: 'campus-vlan-30',
    order: 3,
    title: { tr: 'Misafir VLAN (30)', en: 'Guest VLAN (30)' },
    description: { tr: 'Misafir WiFi ağı için VLAN 30 oluşturun.', en: 'Create VLAN 30 for the guest WiFi network.' },
    hint: { tr: 'vlan 30 -> name GUEST', en: 'vlan 30 -> name GUEST' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'vlans.30.name', configValue: 'GUEST' },
    completed: false,
    points: 10
  },
  {
    id: 'campus-assign-pc1',
    order: 4,
    title: { tr: 'PC1 Atama', en: 'Assign PC1' },
    description: { tr: 'PC-1\'i (İdari) VLAN 10\'a atayın.', en: 'Assign PC-1 (Admin) to VLAN 10.' },
    hint: { tr: 'int fa0/1 -> switchport access vlan 10', en: 'int fa0/1 -> switchport access vlan 10' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'ports.fa0/1.vlan', configValue: 10 },
    completed: false,
    points: 15
  },
  {
    id: 'campus-assign-pc2',
    order: 5,
    title: { tr: 'PC2 Atama', en: 'Assign PC2' },
    description: { tr: 'PC-2\'yi (Öğrenci) VLAN 20\'ye atayın.', en: 'Assign PC-2 (Student) to VLAN 20.' },
    hint: { tr: 'int fa0/2 -> switchport access vlan 20', en: 'int fa0/2 -> switchport access vlan 20' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'ports.fa0/2.vlan', configValue: 20 },
    completed: false,
    points: 15
  },
  {
    id: 'campus-router-vlan10',
    order: 6,
    title: { tr: 'R1 VLAN 10 IP', en: 'R1 VLAN 10 IP' },
    description: { tr: 'Router\'ın Gi0/0.10 subinterface\'ine 192.168.10.1 IP adresi verin.', en: 'Assign 192.168.10.1 IP to R1 Gi0/0.10 subinterface.' },
    hint: { tr: 'int gi0/0.10 -> encapsulation dot1q 10 -> ip add 192.168.10.1 255.255.255.0', en: 'int gi0/0.10 -> encapsulation dot1q 10 -> ip add 192.168.10.1 255.255.255.0' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-1', configKey: 'interfaces.gi0/0.10.ip', configValue: '192.168.10.1' },
    completed: false,
    points: 20
  },
  {
    id: 'campus-ping-intervlan',
    order: 7,
    title: { tr: 'VLAN Arası Erişim', en: 'Inter-VLAN Test' },
    description: { tr: 'İdari PC\'den (PC1), Öğrenci PC\'ye (PC2) ping atın.', en: 'Ping from Admin PC (PC1) to Student PC (PC2).' },
    hint: { tr: 'PC-1 CMD > ping 192.168.20.10', en: 'PC-1 CMD > ping 192.168.20.10' },
    checkType: 'ping',
    checkParams: { fromDevice: 'pc-1', toIp: '192.168.20.10' },
    completed: false,
    points: 20
  }
];

// 11. Hastane Ağı (Hospital Network) Senaryosu
export const hospitalGuidedSteps: GuidedStep[] = [
  {
    id: 'hosp-vlan-data',
    order: 1,
    title: { tr: 'Hasta Veri VLAN', en: 'Patient Data VLAN' },
    description: { tr: 'Kritik hasta verileri için VLAN 100 oluşturun.', en: 'Create VLAN 100 for critical patient data.' },
    hint: { tr: 'vlan 100 -> name PATIENT-DATA', en: 'vlan 100 -> name PATIENT-DATA' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'vlans.100.name', configValue: 'PATIENT-DATA' },
    completed: false,
    points: 10
  },
  {
    id: 'hosp-vlan-medical',
    order: 2,
    title: { tr: 'Tıbbi Cihaz VLAN', en: 'Medical Device VLAN' },
    description: { tr: 'Tıbbi cihazlar için VLAN 200 oluşturun.', en: 'Create VLAN 200 for medical devices.' },
    hint: { tr: 'vlan 200 -> name MEDICAL-DEVICES', en: 'vlan 200 -> name MEDICAL-DEVICES' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'vlans.200.name', configValue: 'MEDICAL-DEVICES' },
    completed: false,
    points: 10
  },
  {
    id: 'hosp-port-sec',
    order: 3,
    title: { tr: 'Port Güvenliği', en: 'Port Security' },
    description: { tr: 'Veri sızıntısını önlemek için Fa0/1 portunda güvenliği açın.', en: 'Enable port security on Fa0/1 to prevent data leakage.' },
    hint: { tr: 'int fa0/1 -> switchport port-security', en: 'int fa0/1 -> switchport port-security' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'ports.fa0/1.portSecurity.enabled', configValue: true },
    completed: false,
    points: 15
  },
  {
    id: 'hosp-acl-restrict',
    order: 4,
    title: { tr: 'Erişim Kısıtlama (ACL)', en: 'Access Restriction (ACL)' },
    description: { tr: 'Tıbbi cihazların internete çıkışını kısıtlayın.', en: 'Restrict medical devices from accessing the internet.' },
    hint: { tr: 'access-list 10 deny any -> ip access-group 10 in', en: 'access-list 10 deny any -> ip access-group 10 in' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-1', configKey: 'ports.gi0/0.accessGroupIn', configValue: '10' },
    completed: false,
    points: 20
  },
  {
    id: 'hosp-server-dns',
    order: 5,
    title: { tr: 'Hastane Sunucusu', en: 'Hospital Server' },
    description: { tr: 'Merkezi kayıt sunucusunu (192.168.100.10) ağa tanıtın.', en: 'Introduce the central registry server (192.168.100.10) to the network.' },
    hint: { tr: 'DNS kaydı: records: [{ domain: "hbys.local", address: "192.168.100.10" }]', en: 'DNS record: records: [{ domain: "hbys.local", address: "192.168.100.10" }]' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'server-1', configKey: 'services.dns.records', configValue: [{ domain: 'hbys.local', address: '192.168.100.10' }] },
    completed: false,
    points: 20
  },
  {
    id: 'hosp-ping-server',
    order: 6,
    title: { tr: 'Sunucu Erişimi', en: 'Server Connectivity' },
    description: { tr: 'Hemşire bilgisayarından (PC1) kayıt sunucusuna ping atın.', en: 'Ping the registry server from the nurse station PC (PC1).' },
    hint: { tr: 'PC-1 CMD > ping 192.168.100.10', en: 'PC-1 CMD > ping 192.168.100.10' },
    checkType: 'ping',
    checkParams: { fromDevice: 'pc-1', toIp: '192.168.100.10' },
    completed: false,
    points: 25
  }
];

// 12. E-Ticaret Şirketi (E-Commerce Company) Senaryosu
export const ecommerceGuidedSteps: GuidedStep[] = [
  {
    id: 'ecom-dmz-vlan',
    order: 1,
    title: { tr: 'DMZ VLAN Oluştur', en: 'Create DMZ VLAN' },
    description: { tr: 'Web sunucuları için izole DMZ (VLAN 50) oluşturun.', en: 'Create an isolated DMZ (VLAN 50) for web servers.' },
    hint: { tr: 'vlan 50 -> name DMZ', en: 'vlan 50 -> name DMZ' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'vlans.50.name', configValue: 'DMZ' },
    completed: false,
    points: 10
  },
  {
    id: 'ecom-assign-web',
    order: 2,
    title: { tr: 'Web Sunucu Atama', en: 'Assign Web Server' },
    description: { tr: 'Web sunucusunu DMZ VLAN\'ına atayın.', en: 'Assign the web server to the DMZ VLAN.' },
    hint: { tr: 'int fa0/10 -> switchport access vlan 50', en: 'int fa0/10 -> switchport access vlan 50' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'ports.fa0/10.vlan', configValue: 50 },
    completed: false,
    points: 10
  },
  {
    id: 'ecom-acl-web',
    order: 3,
    title: { tr: 'Web Erişimi (ACL)', en: 'Web Access (ACL)' },
    description: { tr: 'İnternetten sadece HTTP (port 80) trafiğine izin verin.', en: 'Allow only HTTP (port 80) traffic from the internet.' },
    hint: { tr: 'ip access-list extended DMZ-IN -> permit tcp any host 172.16.50.10 eq 80', en: 'ip access-list extended DMZ-IN -> permit tcp any host 172.16.50.10 eq 80' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-1', configKey: 'ports.gi0/0.accessGroupIn', configValue: 'DMZ-IN' },
    completed: false,
    points: 20
  },
  {
    id: 'ecom-nat-static',
    order: 4,
    title: { tr: 'Static NAT', en: 'Static NAT' },
    description: { tr: 'Web sunucusunu dış dünyaya açmak için Static NAT kurun.', en: 'Set up Static NAT to expose the web server to the outside world.' },
    hint: { tr: 'ip nat inside source static 172.16.50.10 203.0.113.10', en: 'ip nat inside source static 172.16.50.10 203.0.113.10' },
    checkType: 'command',
    checkParams: { targetDeviceId: 'router-1', commandPattern: 'ip nat inside source static' },
    completed: false,
    points: 20
  },
  {
    id: 'ecom-internal-vlan',
    order: 5,
    title: { tr: 'İç Ağ VLAN', en: 'Internal VLAN' },
    description: { tr: 'Ofis çalışanları için VLAN 10 oluşturun.', en: 'Create VLAN 10 for office employees.' },
    hint: { tr: 'vlan 10 -> name INTERNAL', en: 'vlan 10 -> name INTERNAL' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'vlans.10.name', configValue: 'INTERNAL' },
    completed: false,
    points: 10
  },
  {
    id: 'ecom-ping-dmz',
    order: 6,
    title: { tr: 'DMZ Test', en: 'DMZ Test' },
    description: { tr: 'İç ağdaki PC\'den (PC1), Web sunucusuna ping atın.', en: 'Ping the web server from the internal PC (PC1).' },
    hint: { tr: 'PC-1 CMD > ping 172.16.50.10', en: 'PC-1 CMD > ping 172.16.50.10' },
    checkType: 'ping',
    checkParams: { fromDevice: 'pc-1', toIp: '172.16.50.10' },
    completed: false,
    points: 30
  }
];

// Rehberli projeleri oluştur
export const getGuidedProjects = (language: 'tr' | 'en'): GuidedProject[] => {
  const isTr = language === 'tr';

  const projects: GuidedProject[] = [
    {
      id: 'guided-add-devices',
      tag: isTr ? 'BAŞLANGIÇ' : 'BEGINNER',
      title: isTr ? 'Cihaz Ekleme ve Bağlantı' : 'Adding Devices & Connection',
      description: isTr ? 'Topolojiye cihaz eklemeyi ve kablo bağlamayı öğrenin' : 'Learn how to add devices and connect cables',
      detail: isTr ? 'Sürükle-bırak cihaz ekleme ve temel ağ bağlantısı.' : 'Drag-drop device addition and basic network connection.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: { devices: [], connections: [], notes: [] },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: '', activeDeviceType: 'pc', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: addDeviceGuidedSteps, estimatedTimeMinutes: 5, difficulty: 'beginner',
      totalPoints: addDeviceGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-pc-cmd',
      tag: 'CMD',
      title: isTr ? 'PC CMD Komutları' : 'PC CMD Commands',
      description: isTr ? 'PC terminalini ve temel komutları keşfedin' : 'Explore PC terminal and basic commands',
      detail: isTr ? 'ipconfig, ping ve help komutlarının kullanımı.' : 'Using ipconfig, ping, and help commands.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
             { id: 'pc-1', type: 'pc', name: 'PC-1', x: 100, y: 100, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
          ],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'pc-1', activeDeviceType: 'pc', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: pcCmdGuidedSteps, estimatedTimeMinutes: 5, difficulty: 'beginner',
      totalPoints: pcCmdGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-cli-basics',
      tag: 'CLI',
      title: isTr ? 'CLI Temelleri' : 'CLI Basics',
      description: isTr ? 'NOS komut satırına giriş yapın' : 'Introduction to NOS command line',
      detail: isTr ? 'Enable ve Global Config modlarına geçiş.' : 'Switching to Enable and Global Config modes.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'switch-1', type: 'switchL2', name: 'SW-1', x: 100, y: 100, ip: '', status: 'online', ports: generateSwitchPorts() }
          ],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'basic', isGuided: true, steps: cliBasicsGuidedSteps, estimatedTimeMinutes: 5, difficulty: 'beginner',
      totalPoints: cliBasicsGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
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
            { id: 'switch-1', type: 'switchL2', name: 'Switch-1', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'PC-1', x: 100, y: 200, ip: '', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
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
            { id: 'switch-1', type: 'switchL2', name: 'Switch', x: 400, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'PC0', x: 150, y: 100, ip: '', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'PC1', x: 150, y: 300, ip: '', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
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
          devices: [{ id: 'switch-1', type: 'switchL2', name: 'Switch-1', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() }],
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
            { id: 'router-1', type: 'router', name: 'R1', x: 400, y: 200, ip: '', status: 'online', ports: generateRouterPorts() },
            { id: 'pc-1', type: 'pc', name: 'PC1', x: 150, y: 200, ip: '', status: 'online', ipConfigMode: 'dhcp', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
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
            { id: 'router-1', type: 'router', name: 'R1', x: 300, y: 200, ip: '', status: 'online', ports: [{ id: 'console', label: 'Console', status: 'disconnected' as const }, { id: 'gi0/0', label: 'Gi0/0', status: 'connected' as const }, { id: 'gi0/1', label: 'Gi0/1', status: 'connected' as const }, { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }, { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const }, { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' as const }, { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' as const }, { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' as const }, { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }] },
            { id: 'router-2', type: 'router', name: 'R2', x: 600, y: 200, ip: '', status: 'online', ports: [{ id: 'console', label: 'Console', status: 'disconnected' as const }, { id: 'gi0/0', label: 'Gi0/0', status: 'connected' as const }, { id: 'gi0/1', label: 'Gi0/1', status: 'connected' as const }, { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }, { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const }, { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' as const }, { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' as const }, { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' as const }, { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }] },
            { id: 'pc-1', type: 'pc', name: 'PC1', x: 100, y: 200, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'PC2', x: 800, y: 200, ip: '192.168.2.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
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
          devices: [{ id: 'switch-1', type: 'switchL2', name: 'SW-Sec', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() }],
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
          devices: [{ id: 'router-1', type: 'router', name: 'R1', x: 300, y: 200, ip: '', status: 'online', ports: generateRouterPorts() }],
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
            { id: 'server-1', type: 'pc', name: 'Server-Web', x: 400, y: 100, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'dns-server-1', type: 'pc', name: 'DNS-Server', x: 600, y: 100, ip: '192.168.1.5', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'pc-1', type: 'pc', name: 'PC1', x: 100, y: 300, ip: '192.168.1.20', dns: '192.168.1.5', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'sw-1', type: 'switchL2', name: 'SW1', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() }
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
      id: 'guided-soho-scenario',
      tag: isTr ? 'SEKTÖREL' : 'INDUSTRY',
      title: isTr ? 'SOHO Ofis Ağ Kurulumu' : 'SOHO Office Network Setup',
      description: isTr ? 'Küçük bir ofis için kablolu ve kablosuz ağ altyapısını sıfırdan kurun' : 'Set up wired and wireless network infrastructure from scratch for a small office',
      detail: isTr ? 'Yönlendirme, DHCP ve WiFi konfigürasyonlarını içeren gerçek dünya senaryosu.' : 'Real-world scenario including routing, DHCP, and WiFi configurations.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'Router-1', x: 400, y: 100, ip: '', status: 'online', ports: generateRouterPorts() },
            { id: 'switch-1', type: 'switchL2', name: 'Switch-1', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'Ofis-PC', x: 200, y: 350, ip: '192.168.1.10', subnet: '255.255.255.0', gateway: '192.168.1.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'Laptop', x: 600, y: 350, ip: '', ipConfigMode: 'dhcp', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' as const }, { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const }] }
          ],
          connections: [], notes: []
        },
        cableInfo: { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'intermediate', isGuided: true, steps: sohoGuidedSteps, estimatedTimeMinutes: 15, difficulty: 'intermediate',
      totalPoints: sohoGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-campus-scenario',
      tag: isTr ? 'SEKTÖREL' : 'INDUSTRY',
      title: isTr ? 'Okul Kampüs Ağı' : 'School Campus Network',
      description: isTr ? 'VLAN segmentasyonu ile okul ağını güvenli hale getirin' : 'Secure the school network with VLAN segmentation',
      detail: isTr ? 'İdari, öğrenci ve misafir birimlerini VLAN\'larla ayırma ve Router-on-a-Stick yapılandırması.' : 'Separating admin, student, and guest units with VLANs and configuring Router-on-a-Stick.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1-Core', x: 400, y: 100, ip: '', status: 'online', ports: generateRouterPorts() },
            { id: 'switch-1', type: 'switchL2', name: 'SW-Main', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'Admin-PC', x: 150, y: 350, ip: '192.168.10.10', subnet: '255.255.255.0', gateway: '192.168.10.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'Student-PC', x: 400, y: 400, ip: '192.168.20.10', subnet: '255.255.255.0', gateway: '192.168.20.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'pc-3', type: 'pc', name: 'Guest-WiFi', x: 650, y: 350, ip: '192.168.30.10', subnet: '255.255.255.0', gateway: '192.168.30.1', status: 'online', ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected' as const }] }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/1', cableType: 'straight', active: true },
            { id: 'c2', sourceDeviceId: 'pc-2', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/2', cableType: 'straight', active: true },
            { id: 'c3', sourceDeviceId: 'switch-1', sourcePort: 'gi0/1', targetDeviceId: 'router-1', targetPort: 'gi0/0', cableType: 'crossover', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: campusGuidedSteps, estimatedTimeMinutes: 20, difficulty: 'advanced',
      totalPoints: campusGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-hospital-scenario',
      tag: isTr ? 'SEKTÖREL' : 'INDUSTRY',
      title: isTr ? 'Hastane Ağ Altyapısı' : 'Hospital Network Infrastructure',
      description: isTr ? 'Yüksek güvenlikli segmentasyon ile hastane ağı oluşturun' : 'Create a hospital network with high-security segmentation',
      detail: isTr ? 'Hasta verilerinin güvenliği, tıbbi cihaz izolasyonu ve ACL kısıtlamaları.' : 'Security of patient data, medical device isolation, and ACL restrictions.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1-Edge', x: 400, y: 100, ip: '', status: 'online', ports: generateRouterPorts() },
            { id: 'switch-1', type: 'switchL2', name: 'SW-Hosp', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'Nurse-PC', x: 150, y: 350, ip: '192.168.100.20', subnet: '255.255.255.0', gateway: '192.168.100.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'server-1', type: 'pc', name: 'Records-Server', x: 400, y: 400, ip: '192.168.100.10', subnet: '255.255.255.0', gateway: '192.168.100.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'iot-1', type: 'iot', name: 'Ekg-Device', x: 650, y: 350, ip: '192.168.200.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/1', cableType: 'straight', active: true },
            { id: 'c2', sourceDeviceId: 'server-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/10', cableType: 'straight', active: true },
            { id: 'c3', sourceDeviceId: 'iot-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/20', cableType: 'straight', active: true },
            { id: 'c4', sourceDeviceId: 'switch-1', sourcePort: 'gi0/1', targetDeviceId: 'router-1', targetPort: 'gi0/0', cableType: 'crossover', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'switch-1', activeDeviceType: 'switchL2', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: hospitalGuidedSteps, estimatedTimeMinutes: 20, difficulty: 'advanced',
      totalPoints: hospitalGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
    },
    {
      id: 'guided-ecommerce-scenario',
      tag: isTr ? 'SEKTÖREL' : 'INDUSTRY',
      title: isTr ? 'E-Ticaret Şirket Ağı' : 'E-Commerce Company Network',
      description: isTr ? 'DMZ ve güvenlik odaklı bir kurumsal ağ tasarlayın' : 'Design a corporate network focused on DMZ and security',
      detail: isTr ? 'Dış dünyaya açık sunucuların (DMZ) izolasyonu, Static NAT ve gelişmiş ACL kuralları.' : 'Isolation of publicly accessible servers (DMZ), Static NAT, and advanced ACL rules.',
      data: {
        version: '1.0', timestamp: new Date().toISOString(), devices: [], deviceOutputs: [], pcOutputs: [], pcHistories: [],
        topology: {
          devices: [
            { id: 'router-1', type: 'router', name: 'R1-Gateway', x: 400, y: 100, ip: '', status: 'online', ports: generateRouterPorts() },
            { id: 'switch-1', type: 'switchL2', name: 'SW-Core', x: 400, y: 250, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'pc-1', type: 'pc', name: 'Office-PC', x: 150, y: 350, ip: '172.16.10.10', subnet: '255.255.255.0', gateway: '172.16.10.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'server-1', type: 'pc', name: 'Web-Server', x: 400, y: 400, ip: '172.16.50.10', subnet: '255.255.255.0', gateway: '172.16.50.1', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] },
            { id: 'pc-2', type: 'pc', name: 'Internet-Client', x: 700, y: 100, ip: '203.0.113.100', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }] }
          ],
          connections: [
            { id: 'c1', sourceDeviceId: 'pc-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/1', cableType: 'straight', active: true },
            { id: 'c2', sourceDeviceId: 'server-1', sourcePort: 'eth0', targetDeviceId: 'switch-1', targetPort: 'fa0/10', cableType: 'straight', active: true },
            { id: 'c3', sourceDeviceId: 'switch-1', sourcePort: 'gi0/1', targetDeviceId: 'router-1', targetPort: 'gi0/1', cableType: 'crossover', active: true },
            { id: 'c4', sourceDeviceId: 'router-1', sourcePort: 'gi0/0', targetDeviceId: 'pc-2', targetPort: 'eth0', cableType: 'crossover', active: true }
          ],
          notes: []
        },
        cableInfo: { connected: true, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: 'router-1', activeDeviceType: 'router', activeTab: 'topology', zoom: 1, pan: { x: 0, y: 0 }
      },
      level: 'advanced', isGuided: true, steps: ecommerceGuidedSteps, estimatedTimeMinutes: 25, difficulty: 'advanced',
      totalPoints: ecommerceGuidedSteps.reduce((acc, s) => acc + (s.points || 0), 0)
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
            { id: 'switch-1', type: 'switchL2', name: 'SW-Lab', x: 300, y: 200, ip: '', status: 'online', ports: generateSwitchPorts() },
            { id: 'router-1', type: 'router', name: 'R-Lab', x: 600, y: 200, ip: '', status: 'online', ports: generateRouterPorts() },
            { id: 'pc-1', type: 'pc', name: 'PC-Lab', x: 100, y: 200, ip: '192.168.1.10', status: 'online', ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }, { id: 'com1', label: 'COM1', status: 'disconnected' as const }] }
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

// Key'i karakter kodları şeklinde tutarak daha zor okunur hale getiriyoruz
// ⚠️ NOT: Bu yalnızca rastgele değişiklikleri yakalamak içindir, güvenlik özelliği değildir.
// ⚠️ NOTE: This only catches accidental changes, NOT a security feature.
const GUIDED_KEY_BYTES = Uint8Array.from([
  71, 85, 73, 68, 69, 68, 95, 77, 79, 68, 69, 95, 83, 69, 67, 85, 82, 73, 84, 89, 95, 75, 69, 89, 95, 50, 48, 50, 54, 95, 83, 85, 80, 69, 82, 83, 69, 67, 85, 82, 69, 68
]);

// UTF-8 string'i Uint8Array'a dönüştüren yardımcı fonksiyon
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Uint8Array'i hex string'e dönüştüren yardımcı fonksiyon
function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
}

// XOR şifrelemesi için yardımcı fonksiyon
function xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

/**
 * Generate integrity hash for guided project
 * Detects accidental changes to critical fields.
 * ⚠️ DISCLAIMER: This uses a client-side fixed XOR key and is NOT
 * cryptographically secure. It catches accidental data corruption or
 * unintended modifications, but does NOT protect against intentional
 * tampering by a determined user with browser DevTools access.
 */
export function generateGuidedIntegrityHash(project: GuidedProject): string {
  const criticalData = {
    id: project.id,
    estimatedTimeMinutes: project.estimatedTimeMinutes,
    steps: project.steps.map(s => ({
      id: s.id,
      points: s.points,
      completed: s.completed,
      completedAt: s.completedAt ? s.completedAt.getTime() : null
    })),
    startedAt: project.startedAt ? project.startedAt.getTime() : null,
    totalPoints: project.totalPoints
  };
  
  const json = JSON.stringify(criticalData);
  const bytes = stringToUint8Array(json);
  const xored = xorBytes(bytes, GUIDED_KEY_BYTES);
  return uint8ArrayToHex(xored);
}

/**
 * Verify if guided project integrity is intact
 * Returns true if no accidental corruption detected.
 * ⚠️ See generateGuidedIntegrityHash disclaimer — this is NOT tamper-proof.
 */
export function verifyGuidedIntegrity(project: GuidedProject): boolean {
  if (!project.integrityHash) return false;
  
  // Create a copy without the integrityHash to generate the hash
  const projectCopy = { ...project, integrityHash: undefined };
  const generatedHash = generateGuidedIntegrityHash(projectCopy as GuidedProject);
  
  return generatedHash === project.integrityHash;
}

// Rehberli ders hook için yardımcı fonksiyonlar
export const checkStepCompletion = (
  step: GuidedStep,
  context: {
    lastCommand?: string;
    lastOutput?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: SwitchState;
    deviceStates?: Map<string, SwitchState>;
    topologyConnections?: CanvasConnection[];
    topologyDevices?: CanvasDevice[];
  }
): boolean => {
  switch (step.checkType) {
    case 'deviceAccess':
      if (context.deviceAccessed !== step.checkParams?.deviceType) return false;
      if (step.checkParams?.targetDeviceId) {
        return context.deviceAccessedId === step.checkParams.targetDeviceId;
      }
      return true;

    case 'command': {
      if (!step.checkParams?.commandPattern || !context.lastCommand) return false;

      // If targetDeviceId is specified, verify it matches the device being accessed
      if (step.checkParams.targetDeviceId && context.deviceAccessedId !== step.checkParams.targetDeviceId) {
        return false;
      }

      const patterns = step.checkParams.commandPattern.split('|');
      const lastCmd = context.lastCommand.toLowerCase().trim();
      return patterns.some(pattern => {
        const pat = pattern.toLowerCase().trim();
        return lastCmd.startsWith(pat) || lastCmd.includes(pat);
      });
    }

    case 'connection': {
      if (!context.topologyConnections || !context.topologyDevices) return false;
      const conns = context.topologyConnections;

      if (step.checkParams?.connections) {
        const requiredConnections = step.checkParams.connections;
        return requiredConnections.every(required => {
          return conns.some((conn: CanvasConnection) => {
            if (!conn.active) return false;
            if (step.checkParams?.cableType) {
              const cableTypeMatch = conn.cableType === step.checkParams.cableType;
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
        return conns.some((conn: CanvasConnection) => {
          if (!conn.active) return false;
          if (params.cableType) {
            const cableTypeMatch = conn.cableType === params.cableType;
            if (!cableTypeMatch) return false;
          }
          const sourceMatch = conn.sourceDeviceId === params.sourceDevice &&
            (!params.sourcePort || conn.sourcePort === params.sourcePort);
          const targetMatch = conn.targetDeviceId === params.targetDevice &&
            (!params.targetPort || conn.targetPort === params.targetPort);
          return sourceMatch && targetMatch;
        });
      }

      return context.topologyConnections.some((conn: CanvasConnection) => conn.active === true);
      }

    case 'config': {
      if (!step.checkParams?.configKey) return false;

      // Determine which state to use: target device or current active device
      let targetState = context.deviceState;
      if (step.checkParams.targetDeviceId && context.deviceStates) {
        targetState = context.deviceStates.get(step.checkParams.targetDeviceId) || targetState;
      }

      if (!targetState && !step.checkParams.configKey.startsWith('pc.') &&
        !step.checkParams.configKey.startsWith('iot.') &&
        !step.checkParams.configKey.startsWith('firewall.') &&
        !step.checkParams.configKey.startsWith('services.')) {
        return false;
      }

      const configKey = step.checkParams.configKey;
      const configValue = step.checkParams.configValue;

      // Device-level properties
      if (configKey === 'hostname') return targetState?.hostname === configValue;
      if (configKey === 'domainName') return targetState?.domainName === configValue;
      if (configKey === 'dnsServer') return targetState?.dnsServer === configValue;
      if (configKey === 'defaultGateway') return targetState?.defaultGateway === configValue;
      if (configKey === 'domainLookup') return targetState?.domainLookup === configValue;
      if (configKey === 'sshVersion') return Number(targetState?.sshVersion) === Number(configValue);
      if (configKey === 'sshTimeout') return Number(targetState?.sshTimeout) === Number(configValue);
      if (configKey === 'vtpMode') return targetState?.vtpMode === configValue;
      if (configKey === 'vtpDomain') return targetState?.vtpDomain === configValue;
      if (configKey === 'mlsQosEnabled') return targetState?.mlsQosEnabled === configValue;
      if (configKey === 'dhcpSnoopingEnabled') return targetState?.dhcpSnoopingEnabled === configValue;
      if (configKey === 'cdpEnabled') return targetState?.cdpEnabled === configValue;
      if (configKey === 'spanningTreeMode') return targetState?.spanningTreeMode === configValue;
      if (configKey === 'spanningTreeEnabled') return targetState?.spanningTreeEnabled === configValue;
      if (configKey === 'spanningTreePortfastDefault') return targetState?.spanningTreePortfastDefault === configValue;
      if (configKey === 'arpInspectionEnabled') return targetState?.arpInspectionEnabled === configValue;
      if (configKey === 'ipRouting') return targetState?.ipRouting === configValue;
      if (configKey === 'autoSummary') return targetState?.autoSummary === configValue;
      if (configKey === 'routerId') return targetState?.routerId === configValue;
      if (configKey === 'ospfRouterId') return targetState?.ospfRouterId === configValue;
      if (configKey === 'eigrpAs') return targetState?.eigrpAs === configValue;
      if (configKey === 'ntpServers') {
        if (Array.isArray(targetState?.ntpServers) && Array.isArray(configValue)) {
          return configValue.every(s => (targetState?.ntpServers as string[]).includes(s));
        }
        return false;
      }

      if (configKey.startsWith('interfaces.') || configKey.startsWith('ports.')) {
        const parts = configKey.split('.');
        const portId = parts[1];
        const property = parts[parts.length - 1];
        const port = targetState?.ports?.[portId] ||
          targetState?.ports?.[portId.toLowerCase()] ||
          targetState?.ports?.[portId.toUpperCase()];

        if (port) {
          if (property === 'ip' || property === 'ipAddress') return port.ipAddress === configValue;
          if (property === 'shutdown') return port.shutdown === configValue;
          if (property === 'vlan') return Number(port.vlan) === Number(configValue) || Number(port.accessVlan) === Number(configValue);
          if (property === 'mode') return port.mode === configValue;
          if (property === 'enabled' && configKey.includes('portSecurity')) return port.portSecurity?.enabled === configValue;

          // Additional port checks
          if (property === 'accessGroupIn') return port.accessGroupIn === configValue;
          if (property === 'accessGroupOut') return port.accessGroupOut === configValue;
          if (property === 'nativeVlan') return Number(port.nativeVlan) === Number(configValue);
          if (property === 'allowedVlans') {
            if (Array.isArray(port.allowedVlans) && Array.isArray(configValue)) {
              return configValue.every(v => (port.allowedVlans as number[]).includes(Number(v)));
            }
            return String(port.allowedVlans) === String(configValue);
          }
          if (property === 'description') return port.description === configValue;
          if (property === 'speed') return port.speed === configValue;
          if (property === 'duplex') return port.duplex === configValue;
          if (property === 'nonegotiate') return port.nonegotiate === configValue;
          if (property === 'voiceVlan') return Number(port.voiceVlan) === Number(configValue);

          // WiFi checks
          if (property === 'ssid' && port.wifi) return port.wifi.ssid === configValue;
          if (property === 'password' && port.wifi) return port.wifi.password === configValue;
          if (property === 'security' && port.wifi) return port.wifi.security === configValue;
        }
      }

      if (configKey.startsWith('vlans.')) {
        const vlanId = configKey.split('.')[1];
        const vlan = targetState?.vlans?.[Number(vlanId)];
        const property = configKey.split('.').pop();
        if (property === 'name') return vlan?.name === configValue;
        return !!vlan;
      }

      if (configKey === 'staticRoutes') {
        const routes = targetState?.staticRoutes || [];
        if (typeof configValue === 'object' && configValue !== null && 'destination' in configValue) {
          return routes.some((r: Route) => r.destination === configValue.destination);
        }
      }

       if (configKey.startsWith('dhcpPools.')) {
         const poolName = configKey.split('.')[1];
         const pool = targetState?.dhcpPools?.[poolName];
         if (!pool) return false;
         if (typeof configValue === 'object' && configValue !== null) {
           return Object.entries(configValue).every(([k, v]) => pool[k as keyof typeof pool] === v);
         }
         return true;
       }

      if (configKey === 'routingProtocol') return targetState?.routingProtocol === configValue;

       if (configKey.startsWith('services.')) {
         const parts = configKey.split('.');
         const serviceName = parts[1];
         const property = parts[2];
         const service = ((targetState?.services as Record<string, unknown>)?.[serviceName] ||
            (context.topologyDevices?.find((d: CanvasDevice) => d.id === step.checkParams?.targetDeviceId)?.services as Record<string, unknown>)?.[serviceName]) as { enabled?: boolean; records?: { domain: string; address: string }[] } | undefined;
         if (!service) return false;
         if (property === 'enabled') return service.enabled === configValue;
         if (property === 'records' && Array.isArray(configValue)) {
           return configValue.every(req =>
             service.records?.some((r: { domain: string; address: string }) => r.domain === req.domain && r.address === req.address)
           );
         }
       }

      if (configKey.startsWith('pc.')) {
        const parts = configKey.split('.');
        const pcId = parts[1];
        const property = parts[parts.length - 1];
        const pcDevice = context.topologyDevices?.find((d: CanvasDevice) => d.id === pcId);
        if (!pcDevice) return false;

        if (property === 'ip') {
          const ipMatch = pcDevice.ip === configValue;
          if (step.checkParams.subnetMask) return ipMatch && pcDevice.subnet === step.checkParams.subnetMask;
          return ipMatch;
        }
        if (property === 'gateway') return pcDevice.gateway === configValue;
        if (property === 'dns') return pcDevice.dns === configValue;
        if (property === 'subnet') return pcDevice.subnet === configValue;
        if (property === 'ipv6') return pcDevice.ipv6 === configValue;
        if (property === 'ipConfigMode') return pcDevice.ipConfigMode === configValue;

        // Fallback for cases where configKey might just be 'pc.pc-1'
        return pcDevice.ip === configValue;
      }

      if (configKey.startsWith('iot.')) {
        const parts = configKey.split('.');
        const iotId = parts[1];
        const property = parts[parts.length - 1];
        const iotDevice = context.topologyDevices?.find((d: CanvasDevice) => d.id === iotId);
        if (!iotDevice) return false;
        if (property === 'ssid') return iotDevice.wifi?.ssid === configValue;
        if (property === 'ip') return iotDevice.ip === configValue;
        if (property === 'sensorType') return iotDevice.iot?.sensorType === configValue;
        if (property === 'kind') return iotDevice.iot?.kind === configValue;
        if (property === 'value') return iotDevice.iot?.value === configValue;
        return false;
      }

      if (configKey.startsWith('firewall.')) {
        const fwId = configKey.split('.')[1];
        const fwDevice = context.topologyDevices?.find((d: CanvasDevice) => d.id === fwId);
        if (!fwDevice) return false;
        const property = configKey.split('.').pop();
        if (property === 'ip') {
          if (fwDevice.ip === configValue) return true;
          const fwState = context.deviceStates?.get(fwId);
          if (fwState?.ports) {
            return Object.values(fwState.ports).some((p: Port) => p.ipAddress === configValue);
          }
          return false;
        }
        return false;
      }

      return false;
      }

    case 'ping': {
      if (!context.lastCommand || !step.checkParams?.toIp) return false;

      // If fromDevice is specified, verify it matches the device being accessed
      if (step.checkParams.fromDevice && context.deviceAccessedId !== step.checkParams.fromDevice) {
        return false;
      }

      const cmd = context.lastCommand.toLowerCase().trim();
      return cmd.startsWith('ping') && cmd.includes(step.checkParams.toIp.toLowerCase());
      }

    case 'deviceCount': {
      if (!context.topologyDevices || !step.checkParams?.deviceType) return false;
      const targetType = step.checkParams.deviceType;
      const minCount = step.checkParams.minCount || 1;

      const count = context.topologyDevices.filter(d => {
        if (targetType === 'switch') return d.type === 'switchL2' || d.type === 'switchL3';
        return d.type === targetType;
      }).length;

      return count >= minCount;
      }

    case 'faultResolved': {
      if (!step.checkParams?.faultId || !step.checkParams?.targetDeviceId || !context.deviceStates) return false;
      const targetDeviceId = step.checkParams.targetDeviceId;
      const deviceState = context.deviceStates.get(targetDeviceId);
      if (!deviceState) return false;

      const configKey = step.checkParams.configKey;
      const correctValue = step.checkParams.configValue;
      if (!configKey) return false;

      const dummyStep: GuidedStep = {
        ...step,
        checkType: 'config',
        checkParams: {
          ...step.checkParams,
          configKey,
          configValue: correctValue
        }
      };
      return checkStepCompletion(dummyStep, context);
    }

    case 'routingConverged': {
      if (!context.deviceStates) return false;
      const routers = Array.from(context.deviceStates.values()).filter(s =>
        s.deviceType === 'router' || s.switchLayer === 'L3'
      );
      if (routers.length < 2) return true;
      return routers.every(r => (r.dynamicRoutes?.length || 0) > 0);
    }

    case 'showOutputMatch': {
      if (!context.lastCommand || !step.checkParams?.showCommand || !step.checkParams?.matchPattern) return false;
      const lastCmd = context.lastCommand.toLowerCase().trim();
      const targetShow = step.checkParams.showCommand.toLowerCase().trim();
      const lastOut = context.lastOutput || '';
      if (lastCmd.startsWith(targetShow)) {
        const pattern = step.checkParams.matchPattern;
        return lastOut.includes(pattern);
      }
      return false;
    }

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

// CLI Rehberli Dersler - 85 Adım

export const cliGuidedLessons: GuidedStep[] = [
  // ===== TÜM SWITCH İŞLEMLERİ (1-52) =====
  // Bölüm 1: Temel Mod Komutları (Switch)
  {
    id: 'cli-lesson-1-1a',
    order: 1,
    title: { tr: 'Enable Komutu', en: 'Enable Command' },
    description: { tr: 'Ayrıcalıklı moda geçmek için enable komutunu kullanın', en: 'Use enable command to enter privileged mode' },
    hint: { tr: 'switch-1: enable yazın', en: 'switch-1: Type enable' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-1-1b',
    order: 2,
    title: { tr: 'Disable Komutu', en: 'Disable Command' },
    description: { tr: 'Kullanıcı moduna dönmek için disable komutunu kullanın', en: 'Use disable command to return to user mode' },
    hint: { tr: 'switch-1: disable yazın', en: 'switch-1: Type disable' },
    checkType: 'command',
    checkParams: { commandPattern: 'disable' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-1-1c',
    order: 3,
    title: { tr: 'Help Komutu', en: 'Help Command' },
    description: { tr: 'Yardım sistemini kullanın', en: 'Use the help system' },
    hint: { tr: 'switch-1: help yazın', en: 'switch-1: Type help' },
    checkType: 'command',
    checkParams: { commandPattern: 'help' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-1-3a',
    order: 4,
    title: { tr: 'Konfigürasyonu Görüntüle', en: 'View Configuration' },
    description: { tr: 'show running-config komutunu kullanın', en: 'Use show running-config command' },
    hint: { tr: 'switch-1: show running-config yazın', en: 'switch-1: Type show running-config' },
    checkType: 'command',
    checkParams: { commandPattern: 'show running-config' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-1-3b',
    order: 5,
    title: { tr: 'Konfigürasyonu Kaydet', en: 'Save Configuration' },
    description: { tr: 'write memory komutunu kullanın', en: 'Use write memory command' },
    hint: { tr: 'switch-1: write memory yazın', en: 'switch-1: Type write memory' },
    checkType: 'command',
    checkParams: { commandPattern: 'write memory' },
    completed: false,
    points: 10
  },
  // Bölüm 2: Global Konfigürasyon (Switch)
  {
    id: 'cli-lesson-2-1a',
    order: 6,
    title: { tr: 'Hostname Ayarla', en: 'Set Hostname' },
    description: { tr: 'Switch\'e SW-Lab ismini verin', en: 'Give the switch the name SW-Lab' },
    hint: { tr: 'switch-1: hostname SW-Lab yazın', en: 'switch-1: Type hostname SW-Lab' },
    checkType: 'command',
    checkParams: { commandPattern: 'hostname SW-Lab' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-1b',
    order: 7,
    title: { tr: 'Banner Ayarla', en: 'Set Banner' },
    description: { tr: 'Banner komutunu kullanın', en: 'Use banner command' },
    hint: { tr: 'switch-1: banner motd yazın', en: 'switch-1: Type banner motd' },
    checkType: 'command',
    checkParams: { commandPattern: 'banner motd' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-1c',
    order: 8,
    title: { tr: 'Enable Secret Ayarla', en: 'Set Enable Secret' },
    description: { tr: 'Enable secret komutunu kullanın', en: 'Learn enable secret command' },
    hint: { tr: 'switch-1: enable secret password yazın', en: 'switch-1: Type enable secret password' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable secret' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-2a',
    order: 9,
    title: { tr: 'DNS Sunucusu Ayarla', en: 'Set DNS Server' },
    description: { tr: 'DNS sunucusu komutunu kullanın', en: 'Learn DNS server command' },
    hint: { tr: 'switch-1: ip name-server 8.8.8.8 yazın', en: 'switch-1: Type ip name-server 8.8.8.8' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip name-server' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-2b',
    order: 10,
    title: { tr: 'Saat Dilimi Ayarla', en: 'Set Timezone' },
    description: { tr: 'Saat dilimi komutunu kullanın', en: 'Learn timezone command' },
    hint: { tr: 'switch-1: clock timezone UTC 0 yazın', en: 'switch-1: Type clock timezone UTC 0' },
    checkType: 'command',
    checkParams: { commandPattern: 'clock timezone' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-2c',
    order: 11,
    title: { tr: 'NTP Sunucusu Ayarla', en: 'Set NTP Server' },
    description: { tr: 'NTP sunucusu komutunu kullanın', en: 'Learn NTP server command' },
    hint: { tr: 'switch-1: ntp server 192.168.1.1 yazın', en: 'switch-1: Type ntp server 192.168.1.1' },
    checkType: 'command',
    checkParams: { commandPattern: 'ntp server' },
    completed: false,
    points: 10
  },
  // Bölüm 3: Arayüz Konfigürasyonu (Switch)
  {
    id: 'cli-lesson-3-1a',
    order: 12,
    title: { tr: 'Arayüz Seçimi', en: 'Interface Selection' },
    description: { tr: 'FastEthernet 0/1 arayüzüne girin', en: 'Enter FastEthernet 0/1 interface' },
    hint: { tr: 'switch-1: interface fa0/1 yazın', en: 'switch-1: Type interface fa0/1' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface fa0/1' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-1b',
    order: 13,
    title: { tr: 'Arayüzü Aktifleştir', en: 'Activate Interface' },
    description: { tr: 'no shutdown komutu ile arayüzü aktif hale getirin', en: 'Use no shutdown to activate the interface' },
    hint: { tr: 'switch-1: no shutdown yazın', en: 'switch-1: Type no shutdown' },
    checkType: 'command',
    checkParams: { commandPattern: 'no shutdown' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-3',
    order: 14,
    title: { tr: 'Port Kapat', en: 'Shutdown Port' },
    description: { tr: 'shutdown komutu ile portu devre dışı bırakın', en: 'Use shutdown to disable the port' },
    hint: { tr: 'switch-1: shutdown yazın', en: 'switch-1: Type shutdown' },
    checkType: 'command',
    checkParams: { commandPattern: 'shutdown' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-4',
    order: 15,
    title: { tr: 'Arayüz Açıklaması', en: 'Interface Description' },
    description: { tr: 'Arayüze açıklama metni ekleyin', en: 'Add a description to the interface' },
    hint: { tr: 'switch-1: description LAN-Port yazın', en: 'switch-1: Type description LAN-Port' },
    checkType: 'command',
    checkParams: { commandPattern: 'description' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-5',
    order: 16,
    title: { tr: 'Port Hızı', en: 'Port Speed' },
    description: { tr: 'Arayüz hızını 100 Mbps olarak ayarlayın', en: 'Set interface speed to 100 Mbps' },
    hint: { tr: 'switch-1: speed 100 yazın', en: 'switch-1: Type speed 100' },
    checkType: 'command',
    checkParams: { commandPattern: 'speed' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-6',
    order: 17,
    title: { tr: 'Port Duplexi', en: 'Port Duplex' },
    description: { tr: 'Arayüz duplex modunu full olarak ayarlayın', en: 'Set interface duplex mode to full' },
    hint: { tr: 'switch-1: duplex full yazın', en: 'switch-1: Type duplex full' },
    checkType: 'command',
    checkParams: { commandPattern: 'duplex' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-2',
    order: 18,
    title: { tr: 'Arayüz Aralığı', en: 'Interface Range' },
    description: { tr: 'Birden fazla arayüzü aynı anda seçin', en: 'Select multiple interfaces at once' },
    hint: { tr: 'switch-1: interface range fa0/1 - 5 yazın', en: 'switch-1: Type interface range fa0/1 - 5' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface range' },
    completed: false,
    points: 15
  },
  // Bölüm 4: VLAN Yönetimi (Switch)
  {
    id: 'cli-lesson-4-1a',
    order: 19,
    title: { tr: 'VLAN Oluştur', en: 'Create VLAN' },
    description: { tr: 'VLAN 10 oluşturun', en: 'Create VLAN 10' },
    hint: { tr: 'switch-1: vlan 10 yazın', en: 'switch-1: Type vlan 10' },
    checkType: 'command',
    checkParams: { commandPattern: 'vlan 10' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-4-1b',
    order: 20,
    title: { tr: 'VLAN İsimlendir', en: 'Name VLAN' },
    description: { tr: 'VLAN\'a SALES ismini verin', en: 'Give the VLAN the name SALES' },
    hint: { tr: 'switch-1: name SALES yazın', en: 'switch-1: Type name SALES' },
    checkType: 'command',
    checkParams: { commandPattern: 'name SALES' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-4-2',
    order: 21,
    title: { tr: 'VLAN Atama', en: 'Assign VLAN' },
    description: { tr: 'Arayüzü VLAN 10\'a atayın', en: 'Assign interface to VLAN 10' },
    hint: { tr: 'switch-1: switchport access vlan 10 yazın', en: 'switch-1: Type switchport access vlan 10' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport access vlan 10' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-4-3',
    order: 22,
    title: { tr: 'Trunk Portu', en: 'Trunk Port' },
    description: { tr: 'fa0/24 için Trunk portu yapılandırın', en: 'Configure trunk port for fa0/24' },
    hint: { tr: 'switch-1: switchport mode trunk yazın', en: 'switch-1: Type switchport mode trunk' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport mode trunk' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-4-4',
    order: 23,
    title: { tr: 'Trunk İzinli VLAN', en: 'Trunk Allowed VLAN' },
    description: { tr: 'Trunk üzerinde izinli VLAN\'ları belirleyin', en: 'Set allowed VLANs on trunk' },
    hint: { tr: 'switch-1: switchport trunk allowed vlan 10,20 yazın', en: 'switch-1: Type switchport trunk allowed vlan 10,20' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport trunk allowed vlan' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-4-5',
    order: 24,
    title: { tr: 'Native VLAN', en: 'Native VLAN' },
    description: { tr: 'Trunk için native VLAN ayarlayın', en: 'Set native VLAN for trunk' },
    hint: { tr: 'switch-1: switchport trunk native vlan 99 yazın', en: 'switch-1: Type switchport trunk native vlan 99' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport trunk native vlan' },
    completed: false,
    points: 10
  },  // Bölüm 5: Güvenlik (Switch)
  {
    id: 'cli-lesson-6-1a',
    order: 25,
    title: { tr: 'Port Güvenliği', en: 'Port Security' },
    description: { tr: 'fa0/1 için Port güvenliğini etkinleştirin', en: 'Enable port security for fa0/1' },
    hint: { tr: 'switch-1: switchport port-security yazın', en: 'switch-1: Type switchport port-security' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport port-security' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-6-1b',
    order: 26,
    title: { tr: 'Sticky MAC', en: 'Sticky MAC' },
    description: { tr: 'MAC adreslerini kalıcı öğrenmeyi açın', en: 'Enable sticky MAC learning' },
    hint: { tr: 'switch-1: switchport port-security mac-address sticky yazın', en: 'switch-1: Type switchport port-security mac-address sticky' },
    checkType: 'command',
    checkParams: { commandPattern: 'mac-address sticky' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-5a',
    order: 27,
    title: { tr: 'DHCP Snooping Aç', en: 'Enable DHCP Snooping' },
    description: { tr: 'DHCP Snooping özelliğini etkinleştirin', en: 'Enable DHCP snooping globally' },
    hint: { tr: 'switch-1: ip dhcp snooping yazın', en: 'switch-1: Type ip dhcp snooping' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp snooping' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-5b',
    order: 28,
    title: { tr: 'DHCP Snooping VLAN', en: 'DHCP Snooping VLAN' },
    description: { tr: 'VLAN\'lar için DHCP Snooping yapılandırın', en: 'Configure DHCP snooping for VLANs' },
    hint: { tr: 'switch-1: ip dhcp snooping vlan 1,10,20 yazın', en: 'switch-1: Type ip dhcp snooping vlan 1,10,20' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp snooping vlan' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-6-1c',
    order: 29,
    title: { tr: 'Hata Kurtarma', en: 'Error Recovery' },
    description: { tr: 'errdisable recovery özelliğini etkinleştirin', en: 'Enable errdisable recovery' },
    hint: { tr: 'switch-1: errdisable recovery cause all yazın', en: 'switch-1: Type errdisable recovery cause all' },
    checkType: 'command',
    checkParams: { commandPattern: 'errdisable recovery' },
    completed: false,
    points: 10
  },
  // Bölüm 6: İleri Switch Konuları
  {
    id: 'cli-lesson-9-2a',
    order: 30,
    title: { tr: 'GigabitEthernet Arayüz', en: 'GigabitEthernet Interface' },
    description: { tr: 'GigabitEthernet 0/1 arayüzüne girin', en: 'Enter GigabitEthernet 0/1 interface' },
    hint: { tr: 'switch-1: interface gi0/1 yazın', en: 'switch-1: Type interface gi0/1' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi0/1' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-2b',
    order: 31,
    title: { tr: 'EtherChannel', en: 'EtherChannel' },
    description: { tr: 'EtherChannel kanal grubu oluşturun', en: 'Create EtherChannel group' },
    hint: { tr: 'switch-1: channel-group 1 mode active yazın', en: 'switch-1: Type channel-group 1 mode active' },
    checkType: 'command',
    checkParams: { commandPattern: 'channel-group' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-3a',
    order: 32,
    title: { tr: 'QoS Etkinleştir', en: 'Enable QoS' },
    description: { tr: 'QoS özelliğini etkinleştirin', en: 'Enable QoS globally' },
    hint: { tr: 'switch-1: mls qos yazın', en: 'switch-1: Type mls qos' },
    checkType: 'command',
    checkParams: { commandPattern: 'mls qos' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-3b',
    order: 33,
    title: { tr: 'QoS Trust', en: 'QoS Trust' },
    description: { tr: 'gi0/1 arayüzde CoS güvenini ayarlayın', en: 'Set CoS trust on interface gi0/1' },
    hint: { tr: 'switch-1: mls qos trust cos yazın', en: 'switch-1: Type mls qos trust cos' },
    checkType: 'command',
    checkParams: { commandPattern: 'mls qos trust' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-2c',
    order: 34,
    title: { tr: 'EtherChannel Göster', en: 'Show EtherChannel' },
    description: { tr: 'EtherChannel durumunu görüntüleyin', en: 'Display EtherChannel status' },
    hint: { tr: 'switch-1: show etherchannel summary yazın', en: 'switch-1: Type show etherchannel summary' },
    checkType: 'command',
    checkParams: { commandPattern: 'show etherchannel summary' },
    completed: false,
    points: 10
  },
  // Bölüm 7: Görüntüleme ve Hata Ayıklama (Switch)
  {
    id: 'cli-lesson-8-2a',
    order: 35,
    title: { tr: 'Arayüzleri Göster', en: 'Show Interfaces' },
    description: { tr: 'show interfaces komutunu kullanın', en: 'Use show interfaces command' },
    hint: { tr: 'switch-1: show interfaces yazın', en: 'switch-1: Type show interfaces' },
    checkType: 'command',
    checkParams: { commandPattern: 'show interfaces' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2c',
    order: 36,
    title: { tr: 'VLAN\'ları Göster', en: 'Show VLANs' },
    description: { tr: 'show vlan komutunu kullanın', en: 'Use show vlan command' },
    hint: { tr: 'switch-1: show vlan yazın', en: 'switch-1: Type show vlan' },
    checkType: 'command',
    checkParams: { commandPattern: 'show vlan' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-3a',
    order: 37,
    title: { tr: 'STP Göster', en: 'Show STP' },
    description: { tr: 'show spanning-tree komutunu kullanın', en: 'Use show spanning-tree command' },
    hint: { tr: 'switch-1: show spanning-tree yazın', en: 'switch-1: Type show spanning-tree' },
    checkType: 'command',
    checkParams: { commandPattern: 'show spanning-tree' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-3b',
    order: 38,
    title: { tr: 'STP Modu Ayarla', en: 'Set STP Mode' },
    description: { tr: 'spanning-tree mode komutunu kullanın', en: 'Use spanning-tree mode command' },
    hint: { tr: 'switch-1: spanning-tree mode rapid-pvst yazın', en: 'switch-1: Type spanning-tree mode rapid-pvst' },
    checkType: 'command',
    checkParams: { commandPattern: 'spanning-tree mode' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-4a',
    order: 39,
    title: { tr: 'CDP Komşuları Göster', en: 'Show CDP Neighbors' },
    description: { tr: 'show cdp neighbors komutunu kullanın', en: 'Use show cdp neighbors command' },
    hint: { tr: 'switch-1: show cdp neighbors yazın', en: 'switch-1: Type show cdp neighbors' },
    checkType: 'command',
    checkParams: { commandPattern: 'show cdp neighbors' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-4b',
    order: 40,
    title: { tr: 'CDP Aç', en: 'Enable CDP' },
    description: { tr: 'cdp run komutunu kullanın', en: 'Use cdp run command' },
    hint: { tr: 'switch-1: cdp run yazın', en: 'switch-1: Type cdp run' },
    checkType: 'command',
    checkParams: { commandPattern: 'cdp run' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-9-5a',
    order: 41,
    title: { tr: 'Envanter Göster', en: 'Show Inventory' },
    description: { tr: 'show inventory komutunu kullanın', en: 'Use show inventory command' },
    hint: { tr: 'switch-1: show inventory yazın', en: 'switch-1: Type show inventory' },
    checkType: 'command',
    checkParams: { commandPattern: 'show inventory' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-5b',
    order: 42,
    title: { tr: 'Ortam Göster', en: 'Show Environment' },
    description: { tr: 'show environment komutunu kullanın', en: 'Use show environment command' },
    hint: { tr: 'switch-1: show environment yazın', en: 'switch-1: Type show environment' },
    checkType: 'command',
    checkParams: { commandPattern: 'show environment' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-5c',
    order: 43,
    title: { tr: 'Bellek Göster', en: 'Show Memory' },
    description: { tr: 'show memory komutunu kullanın', en: 'Use show memory command' },
    hint: { tr: 'switch-1: show memory yazın', en: 'switch-1: Type show memory' },
    checkType: 'command',
    checkParams: { commandPattern: 'show memory' },
    completed: false,
    points: 10
  }, {
    id: 'cli-lesson-8-5c',
    order: 44,
    title: { tr: 'MAC Tablosu Göster', en: 'Show MAC Table' },
    description: { tr: 'show mac address-table komutunu kullanın', en: 'Use show mac address-table command' },
    hint: { tr: 'switch-1: show mac address-table yazın', en: 'switch-1: Type show mac address-table' },
    checkType: 'command',
    checkParams: { commandPattern: 'show mac address-table' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2d',
    order: 45,
    title: { tr: 'VLAN Özeti Göster', en: 'Show VLAN Brief' },
    description: { tr: 'show vlan brief komutunu kullanın', en: 'Use show vlan brief command' },
    hint: { tr: 'switch-1: show vlan brief yazın', en: 'switch-1: Type show vlan brief' },
    checkType: 'command',
    checkParams: { commandPattern: 'show vlan brief' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2e',
    order: 46,
    title: { tr: 'Trunk\'ları Göster', en: 'Show Trunk' },
    description: { tr: 'show interfaces trunk komutunu kullanın', en: 'Use show interfaces trunk command' },
    hint: { tr: 'switch-1: show interfaces trunk yazın', en: 'switch-1: Type show interfaces trunk' },
    checkType: 'command',
    checkParams: { commandPattern: 'show interfaces trunk' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-5d',
    order: 47,
    title: { tr: 'Port Güvenliği Göster', en: 'Show Port Security' },
    description: { tr: 'show port-security komutunu kullanın', en: 'Use show port-security command' },
    hint: { tr: 'switch-1: show port-security yazın', en: 'switch-1: Type show port-security' },
    checkType: 'command',
    checkParams: { commandPattern: 'show port-security' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-4c',
    order: 48,
    title: { tr: 'CDP Komşuları Detay', en: 'Show CDP Details' },
    description: { tr: 'CDP komşu detaylarını görüntüleyin', en: 'Display CDP neighbor details' },
    hint: { tr: 'switch-1: show cdp neighbors detail yazın', en: 'switch-1: Type show cdp neighbors detail' },
    checkType: 'command',
    checkParams: { commandPattern: 'show cdp neighbors detail' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-4d',
    order: 49,
    title: { tr: 'LLDP Komşuları Göster', en: 'Show LLDP Neighbors' },
    description: { tr: 'show lldp neighbors komutunu kullanın', en: 'Use show lldp neighbors command' },
    hint: { tr: 'switch-1: show lldp neighbors yazın', en: 'switch-1: Type show lldp neighbors' },
    checkType: 'command',
    checkParams: { commandPattern: 'show lldp neighbors' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-5d',
    order: 50,
    title: { tr: 'Sürüm Göster', en: 'Show Version' },
    description: { tr: 'show version komutunu kullanın', en: 'Use show version command' },
    hint: { tr: 'switch-1: show version yazın', en: 'switch-1: Type show version' },
    checkType: 'command',
    checkParams: { commandPattern: 'show version' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-5e',
    order: 51,
    title: { tr: 'Saat Göster', en: 'Show Clock' },
    description: { tr: 'show clock komutunu kullanın', en: 'Use show clock command' },
    hint: { tr: 'switch-1: show clock yazın', en: 'switch-1: Type show clock' },
    checkType: 'command',
    checkParams: { commandPattern: 'show clock' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-5f',
    order: 52,
    title: { tr: 'Komut Geçmişi Göster', en: 'Show History' },
    description: { tr: 'show history komutunu kullanın', en: 'Use show history command' },
    hint: { tr: 'switch-1: show history yazın', en: 'switch-1: Type show history' },
    checkType: 'command',
    checkParams: { commandPattern: 'show history' },
    completed: false,
    points: 10
  },
  // ===== PC İŞLEMİ (53) =====
  {
    id: 'cli-lesson-1-2',
    order: 53,
    title: { tr: 'Ping Komutu', en: 'Ping Command' },
    description: { tr: 'Ping komutu ile ağ bağlantısını test edin', en: 'Test network connectivity with ping command' },
    hint: { tr: 'pc-1: ping 192.168.1.2 yazın', en: 'pc-1: Type ping 192.168.1.2' },
    checkType: 'command',
    checkParams: { commandPattern: 'ping' },
    completed: false,
    points: 15
  },
  // ===== TÜM ROUTER İŞLEMLERİ (54-85) =====
  // Bölüm 8: Yönlendirme (Router)
  {
    id: 'cli-lesson-5-1',
    order: 54,
    title: { tr: 'Statik Yönlendirme', en: 'Static Routing' },
    description: { tr: 'Statik rota ekleyin', en: 'Add static route' },
    hint: { tr: 'router-1: ip route 192.168.2.0 255.255.255.0 192.168.1.2 yazın', en: 'router-1: Type ip route 192.168.2.0 255.255.255.0 192.168.1.2' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip route' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-5-2a',
    order: 55,
    title: { tr: 'RIP Başlat', en: 'Start RIP' },
    description: { tr: 'RIP yönlendirme protokolünü başlatın', en: 'Start RIP routing protocol' },
    hint: { tr: 'router-1: router rip yazın', en: 'router-1: Type router rip' },
    checkType: 'command',
    checkParams: { commandPattern: 'router rip' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-2b',
    order: 56,
    title: { tr: 'Ağ Ekle', en: 'Add Network' },
    description: { tr: 'RIP\'e ağ adresini ekleyin', en: 'Add network address to RIP' },
    hint: { tr: 'router-1: network 192.168.1.0 yazın', en: 'router-1: Type network 192.168.1.0' },
    checkType: 'command',
    checkParams: { commandPattern: 'network 192.168.1.0' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-3a',
    order: 57,
    title: { tr: 'OSPF Başlat', en: 'Start OSPF' },
    description: { tr: 'OSPF yönlendirme protokolünü başlatın', en: 'Start OSPF routing protocol' },
    hint: { tr: 'router-1: router ospf 1 yazın', en: 'router-1: Type router ospf 1' },
    checkType: 'command',
    checkParams: { commandPattern: 'router ospf' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-3b',
    order: 58,
    title: { tr: 'Router ID', en: 'Router ID' },
    description: { tr: 'OSPF Router ID\'yi ayarlayın', en: 'Set OSPF router ID' },
    hint: { tr: 'router-1: router-id 1.1.1.1 yazın', en: 'router-1: Type router-id 1.1.1.1' },
    checkType: 'command',
    checkParams: { commandPattern: 'router-id' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-4a',
    order: 59,
    title: { tr: 'Protokolleri Göster', en: 'Show Protocols' },
    description: { tr: 'show ip protocols komutunu kullanın', en: 'Use show ip protocols command' },
    hint: { tr: 'router-1: show ip protocols yazın', en: 'router-1: Type show ip protocols' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip protocols' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-4b',
    order: 60,
    title: { tr: 'OSPF Komşuları Göster', en: 'Show OSPF Neighbors' },
    description: { tr: 'OSPF komşularını görüntüleyin', en: 'Display OSPF neighbors' },
    hint: { tr: 'router-1: show ip ospf neighbor yazın', en: 'router-1: Type show ip ospf neighbor' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip ospf neighbor' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-4c',
    order: 61,
    title: { tr: 'Traceroute', en: 'Traceroute' },
    description: { tr: 'traceroute komutu ile ağ yolunu izleyin', en: 'Use traceroute to trace network path' },
    hint: { tr: 'router-1: traceroute 192.168.2.1 yazın', en: 'router-1: Type traceroute 192.168.2.1' },
    checkType: 'command',
    checkParams: { commandPattern: 'traceroute' },
    completed: false,
    points: 10
  },
  // Bölüm 9: Güvenlik (Router)
  {
    id: 'cli-lesson-6-2a',
    order: 62,
    title: { tr: 'RSA Anahtarı', en: 'RSA Key' },
    description: { tr: 'RSA anahtarı oluşturun', en: 'Generate RSA key' },
    hint: { tr: 'router-1: crypto key generate rsa yazın', en: 'router-1: Type crypto key generate rsa' },
    checkType: 'command',
    checkParams: { commandPattern: 'crypto key generate rsa' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-6-2b',
    order: 63,
    title: { tr: 'SSH Versiyonu', en: 'SSH Version' },
    description: { tr: 'SSH versiyon 2\'yi ayarlayın', en: 'Set SSH version 2' },
    hint: { tr: 'router-1: ip ssh version 2 yazın', en: 'router-1: Type ip ssh version 2' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip ssh version 2' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-6-3',
    order: 64,
    title: { tr: 'Kullanıcı Yönetimi', en: 'User Management' },
    description: { tr: 'Yerel kullanıcı oluşturun', en: 'Create local user' },
    hint: { tr: 'router-1: username admin privilege 15 secret password yazın', en: 'router-1: Type username admin privilege 15 secret password' },
    checkType: 'command',
    checkParams: { commandPattern: 'username' },
    completed: false,
    points: 15
  },  // Bölüm 10: Kablosuz (Router)
  {
    id: 'cli-lesson-7-1',
    order: 65,
    title: { tr: 'WLAN Oluştur', en: 'Create WLAN' },
    description: { tr: 'Kablosuz ağ oluşturun', en: 'Create a wireless network' },
    hint: { tr: 'router-1: wlan MyNetwork 1 MySSID yazın', en: 'router-1: Type wlan MyNetwork 1 MySSID' },
    checkType: 'command',
    checkParams: { commandPattern: 'wlan' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-7-2a',
    order: 66,
    title: { tr: 'Station Role', en: 'Station Role' },
    description: { tr: 'Access Point rolünü ayarlayın', en: 'Set access point role' },
    hint: { tr: 'router-1: station-role root yazın', en: 'router-1: Type station-role root' },
    checkType: 'command',
    checkParams: { commandPattern: 'station-role' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-7-2b',
    order: 67,
    title: { tr: 'SSID Ayarla', en: 'Set SSID' },
    description: { tr: 'Kablosuz ağ SSID\'sini ayarlayın', en: 'Set wireless network SSID' },
    hint: { tr: 'router-1: ssid MySSID yazın', en: 'router-1: Type ssid MySSID' },
    checkType: 'command',
    checkParams: { commandPattern: 'ssid' },
    completed: false,
    points: 10
  },
  // Bölüm 11: Hata Ayıklama (Router)
  {
    id: 'cli-lesson-8-1a',
    order: 68,
    title: { tr: 'Debug Başlat', en: 'Start Debug' },
    description: { tr: 'Debug komutunu kullanın', en: 'Use debug command' },
    hint: { tr: 'router-1: debug ip packet yazın', en: 'router-1: Type debug ip packet' },
    checkType: 'command',
    checkParams: { commandPattern: 'debug ip packet' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-1b',
    order: 69,
    title: { tr: 'Debug Kapat', en: 'Stop Debug' },
    description: { tr: 'Undebug komutunu kullanın', en: 'Use undebug command' },
    hint: { tr: 'router-1: undebug all yazın', en: 'router-1: Type undebug all' },
    checkType: 'command',
    checkParams: { commandPattern: 'undebug all' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2b',
    order: 70,
    title: { tr: 'Rotaları Göster', en: 'Show Routes' },
    description: { tr: 'show ip route komutunu kullanın', en: 'Use show ip route command' },
    hint: { tr: 'router-1: show ip route yazın', en: 'router-1: Type show ip route' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip route' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2f',
    order: 71,
    title: { tr: 'IP Arayüz Özeti', en: 'Show IP Interface Brief' },
    description: { tr: 'show ip interface brief komutunu kullanın', en: 'Use show ip interface brief command' },
    hint: { tr: 'router-1: show ip interface brief yazın', en: 'router-1: Type show ip interface brief' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip interface brief' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2g',
    order: 72,
    title: { tr: 'ARP Tablosu Göster', en: 'Show ARP Table' },
    description: { tr: 'show ip arp komutunu kullanın', en: 'Use show ip arp command' },
    hint: { tr: 'router-1: show ip arp yazın', en: 'router-1: Type show ip arp' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip arp' },
    completed: false,
    points: 10
  },
  // Bölüm 12: İleri Router Konuları
  {
    id: 'cli-lesson-9-1a',
    order: 73,
    title: { tr: 'DHCP Havuzu Oluştur', en: 'Create DHCP Pool' },
    description: { tr: 'DHCP havuzu oluşturun', en: 'Create a DHCP pool' },
    hint: { tr: 'router-1: ip dhcp pool LAN yazın', en: 'router-1: Type ip dhcp pool LAN' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp pool LAN' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-1b',
    order: 74,
    title: { tr: 'DHCP Ağı', en: 'DHCP Network' },
    description: { tr: 'DHCP havuzu için ağ tanımlayın', en: 'Define network for DHCP pool' },
    hint: { tr: 'router-1: network 192.168.1.0 255.255.255.0 yazın', en: 'router-1: Type network 192.168.1.0 255.255.255.0' },
    checkType: 'command',
    checkParams: { commandPattern: 'network 192.168.1.0' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-1c',
    order: 75,
    title: { tr: 'DHCP Varsayılan Ağ Geçidi', en: 'DHCP Default Gateway' },
    description: { tr: 'DHCP havuzu için varsayılan ağ geçidini ayarlayın', en: 'Set default gateway for DHCP pool' },
    hint: { tr: 'router-1: default-router 192.168.1.1 yazın', en: 'router-1: Type default-router 192.168.1.1' },
    checkType: 'command',
    checkParams: { commandPattern: 'default-router 192.168.1.1' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-4a',
    order: 76,
    title: { tr: 'IPv6 Yönlendirme', en: 'IPv6 Routing' },
    description: { tr: 'IPv6 yönlendirmeyi etkinleştirin', en: 'Enable IPv6 routing' },
    hint: { tr: 'router-1: ipv6 unicast-routing yazın', en: 'router-1: Type ipv6 unicast-routing' },
    checkType: 'command',
    checkParams: { commandPattern: 'ipv6 unicast-routing' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-4b',
    order: 77,
    title: { tr: 'IPv6 Arayüz Adresi', en: 'IPv6 Interface Address' },
    description: { tr: 'Arayüze IPv6 adresi atayın', en: 'Assign IPv6 address to interface' },
    hint: { tr: 'router-1: ipv6 address 2001::1/64 yazın', en: 'router-1: Type ipv6 address 2001::1/64' },
    checkType: 'command',
    checkParams: { commandPattern: 'ipv6 address' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-6',
    order: 78,
    title: { tr: 'Komut Takma Adı', en: 'Command Alias' },
    description: { tr: 'Komut takma adı oluşturun', en: 'Create command alias' },
    hint: { tr: 'router-1: alias exec si show interfaces yazın', en: 'router-1: Type alias exec si show interfaces' },
    checkType: 'command',
    checkParams: { commandPattern: 'alias exec' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-9-6b',
    order: 79,
    title: { tr: 'Show Alias', en: 'Show Alias' },
    description: { tr: 'Oluşturulan takma adları görüntüleyin', en: 'Display created aliases' },
    hint: { tr: 'router-1: show alias yazın', en: 'router-1: Type show alias' },
    checkType: 'command',
    checkParams: { commandPattern: 'show alias' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-7a',
    order: 80,
    title: { tr: 'ACL Reddet', en: 'ACL Deny' },
    description: { tr: 'Standart ACL ile bir hostu reddedin', en: 'Deny a host with standard ACL' },
    hint: { tr: 'router-1: access-list 1 deny host 192.168.1.10 yazın', en: 'router-1: Type access-list 1 deny host 192.168.1.10' },
    checkType: 'command',
    checkParams: { commandPattern: 'access-list 1 deny' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-7b',
    order: 81,
    title: { tr: 'ACL İzin Ver', en: 'ACL Permit' },
    description: { tr: 'ACL ile tüm trafiğe izin verin', en: 'Permit all traffic with ACL' },
    hint: { tr: 'router-1: access-list 1 permit any yazın', en: 'router-1: Type access-list 1 permit any' },
    checkType: 'command',
    checkParams: { commandPattern: 'access-list 1 permit' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-7c',
    order: 82,
    title: { tr: 'Arayüz Seçimi', en: 'Interface Selection' },
    description: { tr: 'GigabitEthernet 0/0 arayüzüne girin', en: 'Enter GigabitEthernet 0/0 interface' },
    hint: { tr: 'router-1: interface gi0/0 yazın', en: 'router-1: Type interface gi0/0' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi0/0' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-7d',
    order: 83,
    title: { tr: 'ACL Uygula', en: 'Apply ACL' },
    description: { tr: 'ACL\'yi arayüze uygulayın', en: 'Apply ACL to interface' },
    hint: { tr: 'router-1: ip access-group 1 out yazın', en: 'router-1: Type ip access-group 1 out' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip access-group 1' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-8a',
    order: 84,
    title: { tr: 'Yapılandırmayı Kaydet', en: 'Save Config' },
    description: { tr: 'copy running-config startup-config komutunu kullanın', en: 'Use copy running-config startup-config command' },
    hint: { tr: 'router-1: copy running-config startup-config yazın', en: 'router-1: Type copy running-config startup-config' },
    checkType: 'command',
    checkParams: { commandPattern: 'copy running-config startup-config' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-8b',
    order: 85,
    title: { tr: 'Cihazı Yeniden Başlat', en: 'Reload Device' },
    description: { tr: 'reload komutu ile cihazı yeniden başlatın', en: 'Use reload command to restart the device' },
    hint: { tr: 'router-1: reload yazın', en: 'router-1: Type reload' },
    checkType: 'command',
    checkParams: { commandPattern: 'reload' },
    completed: false,
    points: 10
  }
];

