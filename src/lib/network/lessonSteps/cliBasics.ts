import type { GuidedStep } from '../guidedMode.types';

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
