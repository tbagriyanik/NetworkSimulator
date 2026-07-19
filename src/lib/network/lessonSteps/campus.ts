import type { GuidedStep } from '../guidedMode.types';

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
