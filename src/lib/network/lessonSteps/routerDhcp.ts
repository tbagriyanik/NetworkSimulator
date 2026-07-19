import type { GuidedStep } from '../guidedMode.types';

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
    animationId: 'dhcp-flow',
    checkType: 'config',
    checkParams: { configKey: 'dhcpPools.LAN.defaultRouter', configValue: '192.168.1.1' },
    completed: false,
    points: 10
  }
];
