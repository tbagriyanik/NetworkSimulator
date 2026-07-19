import type { GuidedStep } from '../guidedMode.types';

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
