import type { GuidedStep } from '../guidedMode.types';

export const pcCmdGuidedSteps: GuidedStep[] = [
  {
    id: 'open-pc-cmd',
    order: 1,
    title: { tr: 'CMD\'yi Aç', en: 'Open CMD' },
    description: { tr: 'Bilgisayara çift tıklayarak terminali açın ve "Command Prompt" (Komut İstemi) uygulamasına girin.', en: 'Double-click the computer to open the terminal and enter the "Command Prompt" application.' },
    hint: { tr: 'PC üzerine çift tıklayın, ardından CMD simgesine basın.', en: 'Double-click on the PC, then press the CMD icon.' },
    animationId: 'open-pc-cmd',
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'pc' },
    completed: false,
    points: 5
  },
  {
    id: 'run-ipconfig',
    order: 2,
    title: { tr: 'IP Yapılandırmasını Gör', en: 'View IP Config' },
    description: { tr: 'Bilgisayarın IP adresini görmek için "ipconfig" komutunu yazın.', en: 'Type the "ipconfig" command to see the computer\'s IP address.' },
    hint: { tr: 'Terminalde "ipconfig" yazıp Enter\'a basın.', en: 'Type "ipconfig" in the terminal and press Enter.' },
    animationId: 'pc-ipconfig',
    checkType: 'command',
    checkParams: { commandPattern: 'ipconfig' },
    completed: false,
    points: 10
  },
  {
    id: 'run-help-cmd',
    order: 3,
    title: { tr: 'Yardım Al', en: 'Get Help' },
    description: { tr: 'Kullanabileceğiniz tüm komutları görmek için "help" yazın.', en: 'Type "help" to see all available commands.' },
    hint: { tr: '"help" yazıp Enter\'a basın.', en: 'Type "help" and press Enter.' },
    animationId: 'pc-help',
    checkType: 'command',
    checkParams: { commandPattern: 'help' },
    completed: false,
    points: 5
  }
];
