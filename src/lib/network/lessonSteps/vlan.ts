import type { GuidedStep } from '../guidedMode.types';

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
