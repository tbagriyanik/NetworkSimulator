import type { GuidedStep } from '../guidedMode.types';

export const teachMeBeginnerSteps: GuidedStep[] = [
  {
    id: 'tm-beg-1',
    order: 1,
    title: { tr: 'Cihaza Bağlan', en: 'Connect to Device' },
    description: { tr: 'PC komut satırını açın ve ipconfig komutunu çalıştırın.', en: 'Open PC terminal and run ipconfig command.' },
    hint: { tr: 'ipconfig', en: 'ipconfig' },
    checkType: 'command',
    checkParams: { commandPattern: 'ipconfig' },
    completed: false,
    points: 10
  },
  {
    id: 'tm-beg-2',
    order: 2,
    title: { tr: 'Switch\'e Giriş', en: 'Enter Switch' },
    description: { tr: 'Switch CLI\'ına girin ve enable komutuyla yetkili moda geçin.', en: 'Enter Switch CLI and switch to privileged mode with enable command.' },
    hint: { tr: 'enable', en: 'enable' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 10
  },
  {
    id: 'tm-beg-3',
    order: 3,
    title: { tr: 'Konfigürasyon Modu', en: 'Configuration Mode' },
    description: { tr: 'configure terminal komutuyla global konfigürasyon moduna geçin.', en: 'Switch to global configuration mode using configure terminal command.' },
    hint: { tr: 'configure terminal', en: 'configure terminal' },
    checkType: 'command',
    checkParams: { commandPattern: 'configure terminal' },
    completed: false,
    points: 10
  },
  {
    id: 'tm-beg-4',
    order: 4,
    title: { tr: 'Cihaz Adını Değiştir', en: 'Change Device Name' },
    description: { tr: 'hostname SW1 komutunu kullanarak Switch\'in adını SW1 yapın.', en: 'Change the Switch name to SW1 using the hostname SW1 command.' },
    hint: { tr: 'hostname SW1', en: 'hostname SW1' },
    checkType: 'command',
    checkParams: { commandPattern: 'hostname SW1' },
    completed: false,
    points: 20
  }
];
