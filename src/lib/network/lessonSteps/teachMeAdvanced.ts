import type { GuidedStep } from '../guidedMode.types';

export const teachMeAdvancedSteps: GuidedStep[] = [
  {
    id: 'tm-adv-enable',
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
    id: 'tm-adv-config',
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
    id: 'tm-adv-1',
    order: 3,
    title: { tr: 'OSPF Başlat', en: 'Start OSPF' },
    description: { tr: 'Router konfigürasyonunda OSPF 1 işlemini başlatın.', en: 'Start OSPF process 1 in router configuration.' },
    hint: { tr: 'router ospf 1', en: 'router ospf 1' },
    checkType: 'command',
    checkParams: { commandPattern: 'router ospf' },
    completed: false,
    points: 10
  },
  {
    id: 'tm-adv-2',
    order: 4,
    title: { tr: 'OSPF Ağı Ekle', en: 'Add OSPF Network' },
    description: { tr: '192.168.1.0 ağını Alan 0 olarak OSPF\'e dahil edin.', en: 'Include 192.168.1.0 network in OSPF as Area 0.' },
    hint: { tr: 'network 192.168.1.0 0.0.0.255 area 0', en: 'network 192.168.1.0 0.0.0.255 area 0' },
    checkType: 'command',
    checkParams: { commandPattern: 'network 192.168.1.0' },
    completed: false,
    points: 20
  },
  {
    id: 'tm-adv-3',
    order: 5,
    title: { tr: 'Moddan Çık', en: 'Exit Mode' },
    description: { tr: 'exit komutu ile OSPF modundan çıkın.', en: 'Exit OSPF mode with exit command.' },
    hint: { tr: 'exit', en: 'exit' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit' },
    completed: false,
    points: 10
  },
  {
    id: 'tm-adv-4',
    order: 6,
    title: { tr: 'ACL Oluştur', en: 'Create ACL' },
    description: { tr: 'Sadece 192.168.1.10 IP\'sine izin veren 10 numaralı standart bir ACL oluşturun.', en: 'Create standard ACL 10 permitting only 192.168.1.10 IP.' },
    hint: { tr: 'access-list 10 permit host 192.168.1.10', en: 'access-list 10 permit host 192.168.1.10' },
    checkType: 'command',
    checkParams: { commandPattern: 'access-list 10 permit' },
    completed: false,
    points: 20
  },
  {
    id: 'tm-adv-exit-config',
    order: 7,
    title: { tr: 'Yapılandırmadan Çık', en: 'Exit Configuration' },
    description: { tr: 'Global konfigürasyon modundan çıkmak için end komutunu çalıştırın.', en: 'Run end command to exit global configuration mode.' },
    hint: { tr: 'end', en: 'end' },
    checkType: 'command',
    checkParams: { commandPattern: 'end' },
    completed: false,
    points: 10
  },
  {
    id: 'tm-adv-5',
    order: 8,
    title: { tr: 'Ayarları Kaydet', en: 'Save Config' },
    description: { tr: 'Yetkili moda dönüp ayarlarınızı kaydedin.', en: 'Return to privileged mode and save your configuration.' },
    hint: { tr: 'copy running-config startup-config', en: 'copy running-config startup-config' },
    checkType: 'command',
    checkParams: { commandPattern: 'copy running-config startup-config' },
    completed: false,
    points: 10
  }
];
