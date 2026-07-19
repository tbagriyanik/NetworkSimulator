import type { GuidedStep } from '../guidedMode.types';

export const teachMeIntermediateSteps: GuidedStep[] = [
  {
    id: 'tm-int-1',
    order: 1,
    title: { tr: 'Router Yetkili Mod', en: 'Router Privileged Mode' },
    description: { tr: 'Router CLI\'ına girin ve yetkili moda geçin.', en: 'Enter Router CLI and switch to privileged mode.' },
    hint: { tr: 'enable', en: 'enable' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 10
  },
  {
    id: 'tm-int-2',
    order: 2,
    title: { tr: 'Router Konfigürasyon', en: 'Router Configuration' },
    description: { tr: 'Global konfigürasyon moduna geçin.', en: 'Switch to global configuration mode.' },
    hint: { tr: 'configure terminal', en: 'configure terminal' },
    checkType: 'command',
    checkParams: { commandPattern: 'configure terminal' },
    completed: false,
    points: 10
  },
  {
    id: 'tm-int-3',
    order: 3,
    title: { tr: 'Arayüze Gir', en: 'Enter Interface' },
    description: { tr: 'GigabitEthernet 0/0 arayüzünün konfigürasyonuna girin.', en: 'Enter configuration of GigabitEthernet 0/0 interface.' },
    hint: { tr: 'interface gi0/0', en: 'interface gi0/0' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi0/0' },
    completed: false,
    points: 10
  },
  {
    id: 'tm-int-4',
    order: 4,
    title: { tr: 'IP Adresi Ata', en: 'Assign IP Address' },
    description: { tr: 'Arayüze 192.168.1.1 IP adresini atayın.', en: 'Assign 192.168.1.1 IP address to the interface.' },
    hint: { tr: 'ip address 192.168.1.1 255.255.255.0', en: 'ip address 192.168.1.1 255.255.255.0' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip address 192.168.1.1' },
    completed: false,
    points: 20
  },
  {
    id: 'tm-int-5',
    order: 5,
    title: { tr: 'Arayüzü Aç', en: 'Bring Interface Up' },
    description: { tr: 'no shutdown komutu ile arayüzü aktif hale getirin.', en: 'Activate the interface using no shutdown command.' },
    hint: { tr: 'no shutdown', en: 'no shutdown' },
    checkType: 'command',
    checkParams: { commandPattern: 'no shutdown' },
    completed: false,
    points: 10
  }
];
