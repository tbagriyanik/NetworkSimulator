// Task definitions with descriptions and tips
import { SwitchState, CableInfo } from './types';
import { CanvasConnection, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';

export interface TaskDefinition {
  id: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  tip: { tr: string; en: string };
  weight: number;
  checkFn: (state: SwitchState, context: TaskContext) => boolean;
  icon?: 'wlan0'; // Optional icon identifier
}

export interface TaskContext {
  cableInfo: CableInfo;
  showPCPanel: boolean;
  showRouterPanel: boolean;
  selectedDevice: DeviceType | null;
  language: 'tr' | 'en';
  deviceStates?: Map<string, SwitchState>;
  topologyConnections?: CanvasConnection[];
}

// Topoloji gÃ¶revleri - PUAN YOK (0)
export const topologyTasks: TaskDefinition[] = [
  {
    id: 'pc-access',
    name: { tr: 'PC EriÅŸimi', en: 'PC Access' },
    description: { tr: 'PC terminaline eriÅŸin', en: 'Access the PC terminal' },
    tip: { tr: 'PC\'ye Ã§ift tÄ±klayarak aÃ§Ä±n', en: 'Double-click PC to open' },
    weight: 0,
    checkFn: (_, ctx) => ctx.showPCPanel,
  },
  {
    id: 'switch-access',
    name: { tr: 'Switch EriÅŸimi', en: 'Switch Access' },
    description: { tr: 'Switch terminaline baÄŸlanÄ±n', en: 'Connect to Switch terminal' },
    tip: { tr: 'Switch\'e Ã§ift tÄ±klayarak aÃ§Ä±n', en: 'Double-click Switch to open' },
    weight: 0,
    checkFn: (_, ctx) => ctx.selectedDevice === 'switchL2' || ctx.selectedDevice === 'switchL3' || ctx.selectedDevice === 'router',
  },
];

// Port gÃ¶revleri - TOPLAM: 100
export const portTasks: TaskDefinition[] = [
  {
    id: 'activate-port',
    name: { tr: 'Port AktifleÅŸtir', en: 'Activate Port' },
    description: { tr: 'En az 1 portu aktif hale getirin', en: 'Activate at least 1 port' },
    tip: { tr: 'no shutdown komutu ile port aÃ§Ä±n', en: 'Use no shutdown command to open port' },
    weight: 20,
    checkFn: (state) => Object.values(state.ports || {}).filter(p => !p.shutdown).length > 0,
  },
  {
    id: 'create-trunk',
    name: { tr: 'Trunk Port', en: 'Trunk Port' },
    description: { tr: 'Bir portu trunk moduna alÄ±n', en: 'Set a port to trunk mode' },
    tip: { tr: 'switchport mode trunk komutunu kullanÄ±n', en: 'Use switchport mode trunk command' },
    weight: 25,
    checkFn: (state) => Object.values(state.ports || {}).some(p => p.mode === 'trunk'),
  },
  {
    id: 'add-description',
    name: { tr: 'Port AÃ§Ä±klamasÄ±', en: 'Port Description' },
    description: { tr: 'Portlara aÃ§Ä±klayÄ±cÄ± isim verin', en: 'Add descriptive names to ports' },
    tip: { tr: 'description isim komutu ile ekleyin', en: 'Add with description name command' },
    weight: 20,
    checkFn: (state) => Object.values(state.ports || {}).some(p => !!(p.description?.trim() || p.name?.trim())),
  },
  {
    id: 'configure-speed',
    name: { tr: 'HÄ±z AyarÄ±', en: 'Speed Config' },
    description: { tr: 'Port hÄ±zÄ±nÄ± manuel ayarlayÄ±n', en: 'Manually configure port speed' },
    tip: { tr: 'speed 100 veya speed 1000 kullanÄ±n', en: 'Use speed 100 or speed 1000' },
    weight: 15,
    checkFn: (state) => Object.values(state.ports || {}).some(p => p.speed !== 'auto'),
  },
  {
    id: 'configure-duplex',
    name: { tr: 'Duplex AyarÄ±', en: 'Duplex Config' },
    description: { tr: 'Port duplex ayarÄ±nÄ± yapÄ±n', en: 'Configure port duplex setting' },
    tip: { tr: 'duplex full veya duplex half kullanÄ±n', en: 'Use duplex full or duplex half' },
    weight: 10,
    checkFn: (state) => Object.values(state.ports || {}).some(p => p.duplex !== 'auto'),
  },
  {
    id: 'all-ports-up',
    name: { tr: 'TÃ¼m Portlar Aktif', en: 'All Ports Up' },
    description: { tr: 'TÃ¼m portlarÄ± aktif edin', en: 'Activate all ports' },
    tip: { tr: 'interface range ile toplu iÅŸlem yapÄ±n', en: 'Use interface range for bulk operation' },
    weight: 10,
    checkFn: (state) => Object.values(state.ports || {}).filter(p => !p.shutdown).length === Object.keys(state.ports || {}).length,
  },
];

// VLAN gÃ¶revleri - TOPLAM: 100
export const vlanTasks: TaskDefinition[] = [
  {
    id: 'create-vlan',
    name: { tr: 'VLAN OluÅŸtur', en: 'Create VLAN' },
    description: { tr: 'En az 1 kullanÄ±cÄ± VLAN\'Ä± oluÅŸturun', en: 'Create at least 1 user VLAN' },
    tip: { tr: 'vlan 10 komutu ile yeni VLAN aÃ§Ä±n', en: 'Open new VLAN with vlan 10 command' },
    weight: 20,
    checkFn: (state) => Object.values(state.vlans || {}).filter(v => v.id > 1 && v.id < 1002).length >= 1,
  },
  {
    id: 'name-vlan',
    name: { tr: 'VLAN Ä°simlendir', en: 'Name VLAN' },
    description: { tr: 'VLAN\'lara anlamlÄ± isim verin', en: 'Give meaningful names to VLANs' },
    tip: { tr: 'name Muhasebe komutu ile isimlendirin', en: 'Name with name Accounting command' },
    weight: 15,
    checkFn: (state) => Object.values(state.vlans || {}).some(v => v.id > 1 && v.id < 1002 && v.name !== `VLAN${v.id}`),
  },
  {
    id: 'assign-port',
    name: { tr: 'Port Ata', en: 'Assign Port' },
    description: { tr: 'PortlarÄ± VLAN\'lara atayÄ±n', en: 'Assign ports to VLANs' },
    tip: { tr: 'switchport access vlan 10 komutu ile', en: 'Use switchport access vlan 10 command' },
    weight: 20,
    checkFn: (state) => Object.values(state.ports || {}).filter(p => Number(p.accessVlan || p.vlan || 1) !== 1 && !p.shutdown).length >= 1,
  },
  {
    id: 'multiple-vlans',
    name: { tr: 'Ã‡oklu VLAN', en: 'Multiple VLANs' },
    description: { tr: 'En az 3 farklÄ± VLAN oluÅŸturun', en: 'Create at least 3 different VLANs' },
    tip: { tr: 'Her departman iÃ§in ayrÄ± VLAN aÃ§Ä±n', en: 'Create separate VLAN for each department' },
    weight: 20,
    checkFn: (state) => Object.values(state.vlans || {}).filter(v => v.id > 1 && v.id < 1002).length >= 3,
  },
  {
    id: 'trunk-config',
    name: { tr: 'Trunk YapÄ±landÄ±r', en: 'Configure Trunk' },
    description: { tr: 'Trunk portlarÄ± yapÄ±landÄ±rÄ±n', en: 'Configure trunk ports' },
    tip: { tr: 'Trunk portlar birden fazla VLAN taÅŸÄ±r', en: 'Trunk ports carry multiple VLANs' },
    weight: 15,
    checkFn: (state) => Object.values(state.ports || {}).some(p => p.mode === 'trunk'),
  },
  {
    id: 'all-named',
    name: { tr: 'Tam Ä°simlendirme', en: 'Full Naming' },
    description: { tr: 'TÃ¼m VLAN\'larÄ± isimlendirin', en: 'Name all VLANs' },
    tip: { tr: 'Standart isimlendirme kuralÄ± uygulayÄ±n', en: 'Apply standard naming convention' },
    weight: 10,
    checkFn: (state) => {
      const userVlans = Object.values(state.vlans || {}).filter(v => v.id > 1 && v.id < 1002);
      const namedVlans = userVlans.filter(v => v.name !== `VLAN${v.id}`);
      return userVlans.length > 0 && namedVlans.length === userVlans.length;
    },
  },
];

// GÃ¼venlik gÃ¶revleri - TOPLAM: 100
export const securityTasks: TaskDefinition[] = [
  {
    id: 'enable-secret',
    name: { tr: 'Enable Secret', en: 'Enable Secret' },
    description: { tr: 'Privileged mode iÃ§in ÅŸifre belirleyin', en: 'Set password for privileged mode' },
    tip: { tr: 'enable secret network komutu ile', en: 'Use enable secret network command' },
    weight: 25,
    checkFn: (state) => !!state.security?.enableSecret,
  },
  {
    id: 'console-security',
    name: { tr: 'Console GÃ¼venliÄŸi', en: 'Console Security' },
    description: { tr: 'Console eriÅŸimine ÅŸifre koyun', en: 'Secure console access with password' },
    tip: { tr: 'line console 0 altÄ±nda password kullanÄ±n', en: 'Use password under line console 0' },
    weight: 20,
    checkFn: (state) => state.security?.consoleLine?.login && !!state.security?.consoleLine?.password,
  },
  {
    id: 'vty-security',
    name: { tr: 'VTY GÃ¼venliÄŸi', en: 'VTY Security' },
    description: { tr: 'Uzaktan eriÅŸimi gÃ¼venli hale getirin', en: 'Secure remote access' },
    tip: { tr: 'line vty 0 4 altÄ±nda login local kullanÄ±n', en: 'Use login local under line vty 0 4' },
    weight: 20,
    checkFn: (state) => state.security?.vtyLines?.login && !!state.security?.vtyLines?.password,
  },
  {
    id: 'password-encryption',
    name: { tr: 'Åifre Åifreleme', en: 'Password Encryption' },
    description: { tr: 'Åifreleri ÅŸifreli olarak saklayÄ±n', en: 'Store passwords in encrypted form' },
    tip: { tr: 'service password-encryption komutu ile', en: 'Use service password-encryption command' },
    weight: 15,
    checkFn: (state) => state.security?.servicePasswordEncryption,
  },
  {
    id: 'ssh-only',
    name: { tr: 'SSH EriÅŸimi', en: 'SSH Access' },
    description: { tr: 'Sadece SSH ile eriÅŸime izin verin', en: 'Allow only SSH access' },
    tip: { tr: 'transport input ssh komutu ile', en: 'Use transport input ssh command' },
    weight: 10,
    checkFn: (state) => state.security?.vtyLines?.transportInput?.includes('ssh'),
  },
  {
    id: 'create-user',
    name: { tr: 'KullanÄ±cÄ± OluÅŸtur', en: 'Create User' },
    description: { tr: 'Yerel kullanÄ±cÄ± hesabÄ± oluÅŸturun', en: 'Create local user account' },
    tip: { tr: 'username admin secret network ile', en: 'Use username admin secret network' },
    weight: 10,
    checkFn: (state) => (state.security?.users || []).length > 0,
  },
];

// Kablosuz gÃ¶revler - TOPLAM: 100
// Note: These tasks use WLC/AP CLI commands. For routers/switches, use WiFi Control Panel via HTTP.
export const wirelessTasks: TaskDefinition[] = [
  {
    id: 'wlan-active',
    name: { tr: 'WLAN Aktif', en: 'WLAN Active' },
    description: { tr: 'Kablosuz arayÃ¼zÃ¼ aktif edin', en: 'Activate wireless interface' },
    tip: { tr: 'no shutdown komutunu kullanÄ±n', en: 'Use no shutdown command' },
    weight: 20,
    icon: 'wlan0',
    checkFn: (state, ctx) => {
      // L2 switches don't have wireless support (no WLC)
      if (ctx.selectedDevice === 'switchL2') return false;
      const wlan = state.ports?.['wlan0'];
      return wlan && !wlan.shutdown;
    },
  },
  {
    id: 'wlan-ssid',
    name: { tr: 'SSID YapÄ±landÄ±r', en: 'Configure SSID' },
    description: { tr: 'Kablosuz aÄŸ adÄ± (SSID) belirleyin', en: 'Set wireless network name (SSID)' },
    tip: { tr: 'wlan MySSID 1 MySSID komutunu kullanÄ±n', en: 'Use wlan MySSID 1 MySSID command' },
    weight: 20,
    icon: 'wlan0',
    checkFn: (state, ctx) => {
      // L2 switches don't have wireless support (no WLC)
      if (ctx.selectedDevice === 'switchL2') return false;
      const wlan = state.ports?.['wlan0'];
      return !!wlan?.wifi?.ssid;
    },
  },
  {
    id: 'wlan-security',
    name: { tr: 'WPA2 GÃ¼venliÄŸi', en: 'WPA2 Security' },
    description: { tr: 'Kablosuz aÄŸa WPA2 ÅŸifreleme ekleyin', en: 'Add WPA2 encryption to wireless' },
    tip: { tr: 'security wpa psk set-key ascii 0 password komutunu kullanÄ±n', en: 'Use security wpa psk set-key ascii 0 password command' },
    weight: 30,
    icon: 'wlan0',
    checkFn: (state, ctx) => {
      // L2 switches don't have wireless support (no WLC)
      if (ctx.selectedDevice === 'switchL2') return false;
      const wlan = state.ports?.['wlan0'];
      return !!(wlan?.wifi && wlan.wifi.mode !== 'disabled' && wlan.wifi.security === 'wpa2' && wlan.wifi.password);
    },
  },
  {
    id: 'wlan-connection',
    name: { tr: 'WLAN BaÄŸlantÄ±sÄ±', en: 'WLAN Connection' },
    description: { tr: 'SaÄŸlÄ±klÄ± kablosuz baÄŸlantÄ± kurun', en: 'Establish healthy wireless connection' },
    tip: { tr: 'station-role root komutunu kullanÄ±n', en: 'Use station-role root command' },
    weight: 30,
    icon: 'wlan0',
    checkFn: (state, ctx) => {
      // L2 switches don't have wireless support (no WLC)
      if (ctx.selectedDevice === 'switchL2') return false;
      const wlan = state.ports?.['wlan0'];
      return !!(wlan && !wlan.shutdown && wlan.wifi?.mode === 'ap' && wlan.wifi.ssid);
    },
  },
];

// DHCP gÃ¶revleri - TOPLAM: 100 (Router Ã¼zerinde DHCP sunucusu)
export const dhcpTasks: TaskDefinition[] = [
  {
    id: 'dhcp-pool-created',
    name: { tr: 'DHCP Havuzu OluÅŸtur', en: 'Create DHCP Pool' },
    description: { tr: 'Router Ã¼zerinde bir DHCP havuzu oluÅŸturun', en: 'Create a DHCP pool on the router' },
    tip: { tr: 'ip dhcp pool LAN komutu ile havuz oluÅŸturun', en: 'Create pool with ip dhcp pool LAN command' },
    weight: 25,
    checkFn: (state) => Object.keys(state.dhcpPools || {}).length > 0 || (state.services?.dhcp?.pools?.length || 0) > 0,
  },
  {
    id: 'dhcp-network-config',
    name: { tr: 'DHCP Network TanÄ±mla', en: 'Define DHCP Network' },
    description: { tr: 'DHCP havuzuna aÄŸ ve subnet mask tanÄ±mlayÄ±n', en: 'Define network and subnet mask for DHCP pool' },
    tip: { tr: 'network 192.168.1.0 255.255.255.0 komutunu kullanÄ±n', en: 'Use network 192.168.1.0 255.255.255.0 command' },
    weight: 25,
    checkFn: (state) => {
      const pools = Object.values(state.dhcpPools || {});
      return pools.some(p => p.network && p.subnetMask);
    },
  },
  {
    id: 'dhcp-default-router',
    name: { tr: 'DHCP Gateway Ayarla', en: 'Set DHCP Gateway' },
    description: { tr: 'DHCP havuzuna varsayÄ±lan gateway tanÄ±mlayÄ±n', en: 'Define default gateway for DHCP pool' },
    tip: { tr: 'default-router 192.168.1.1 komutunu kullanÄ±n', en: 'Use default-router 192.168.1.1 command' },
    weight: 25,
    checkFn: (state) => {
      const pools = Object.values(state.dhcpPools || {});
      const servicePools = state.services?.dhcp?.pools || [];
      return pools.some(p => p.defaultRouter) || servicePools.some((p: { defaultGateway?: string }) => p.defaultGateway);
    },
  },
  {
    id: 'dhcp-dns-server',
    name: { tr: 'DHCP DNS Ayarla', en: 'Set DHCP DNS' },
    description: { tr: 'DHCP havuzuna DNS sunucu tanÄ±mlayÄ±n', en: 'Define DNS server for DHCP pool' },
    tip: { tr: 'dns-server 8.8.8.8 komutunu kullanÄ±n', en: 'Use dns-server 8.8.8.8 command' },
    weight: 15,
    checkFn: (state) => {
      const pools = Object.values(state.dhcpPools || {});
      const servicePools = state.services?.dhcp?.pools || [];
      return pools.some(p => p.dnsServer) || servicePools.some((p: { dnsServer?: string }) => p.dnsServer);
    },
  },
  {
    id: 'dhcp-enabled',
    name: { tr: 'DHCP Aktif', en: 'DHCP Enabled' },
    description: { tr: 'DHCP servisini aktif hale getirin', en: 'Enable DHCP service' },
    tip: { tr: 'service dhcp komutu ile servisi aktif edin', en: 'Enable service with service dhcp command' },
    weight: 10,
    checkFn: (state) => state.services?.dhcp?.enabled === true || Object.keys(state.dhcpPools || {}).length > 0,
  },
];

// Routing gÃ¶revleri - TOPLAM: 100 (L3 Switch only)
export const routingTasks: TaskDefinition[] = [
  {
    id: 'enable-ip-routing',
    name: { tr: 'IP Routing', en: 'IP Routing' },
    description: { tr: 'IP routing Ã¶zelliÄŸini aktifleÅŸtirin', en: 'Enable IP routing feature' },
    tip: { tr: 'L3 switch Ã¼zerinde routing komutlarÄ±nÄ± kullanÄ±n', en: 'Use routing commands on L3 switch' },
    weight: 25,
    checkFn: (state) => {
      return state.ipRouting === true;
    },
  },
  {
    id: 'configure-rip',
    name: { tr: 'RIP ProtokolÃ¼', en: 'RIP Protocol' },
    description: { tr: 'RIP routing protokolÃ¼nÃ¼ yapÄ±landÄ±rÄ±n', en: 'Configure RIP routing protocol' },
    tip: { tr: 'router rip komutu ile RIP etkinleÅŸtirin', en: 'Enable RIP with router rip command' },
    weight: 30,
    checkFn: (state) => {
      return state.routingProtocol === 'rip';
    },
  },
  {
    id: 'configure-ospf',
    name: { tr: 'OSPF ProtokolÃ¼', en: 'OSPF Protocol' },
    description: { tr: 'OSPF routing protokolÃ¼nÃ¼ yapÄ±landÄ±rÄ±n', en: 'Configure OSPF routing protocol' },
    tip: { tr: 'router ospf komutu ile OSPF etkinleÅŸtirin', en: 'Enable OSPF with router ospf command' },
    weight: 30,
    checkFn: (state) => {
      return state.routingProtocol === 'ospf';
    },
  },
  {
    id: 'routed-port',
    name: { tr: 'Routed Port', en: 'Routed Port' },
    description: { tr: 'Fiziksel portu routed moduna alÄ±n', en: 'Configure physical port as routed port' },
    tip: { tr: 'no switchport komutu ile L3 port yapÄ±n', en: 'Make L3 port with no switchport command' },
    weight: 15,
    checkFn: (state) => {
      return Object.values(state.ports || {}).some(port => port && port.mode === 'routed' && port.id && !port.id.startsWith('vlan'));
    },
  },
];



// GÃ¶rev hesaplama yardÄ±mcÄ± fonksiyonu
export function calculateTaskScore(tasks: TaskDefinition[], state: SwitchState, context: TaskContext): number {
  return tasks.reduce((acc, task) => {
    const completed = task.checkFn(state, context);
    return acc + (completed ? task.weight : 0);
  }, 0);
}

// GÃ¶rev tamamlanma durumunu kontrol et
export function getTaskStatus(task: TaskDefinition, state: SwitchState, context: TaskContext): boolean {
  return task.checkFn(state, context);
}


