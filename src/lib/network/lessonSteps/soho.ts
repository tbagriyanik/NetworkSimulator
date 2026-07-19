import type { GuidedStep } from '../guidedMode.types';

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
