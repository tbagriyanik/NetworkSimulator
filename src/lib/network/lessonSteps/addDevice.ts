import type { GuidedStep } from '../guidedMode.types';

export const addDeviceGuidedSteps: GuidedStep[] = [
  {
    id: 'add-pc-step',
    order: 1,
    title: { tr: 'Bilgisayar Ekle', en: 'Add a Computer' },
    description: { tr: 'Araç çubuğundan PC simgesine tıklayarak topolojiye bir bilgisayar ekleyin.', en: 'Add a computer to the topology by clicking the PC icon from the toolbar.' },
    hint: { tr: 'Üst menüdeki bilgisayar simgesine bir kez tıklayın.', en: 'Click the computer icon in the top menu once.' },
    animationId: 'add-pc',
    checkType: 'deviceCount',
    checkParams: { deviceType: 'pc', minCount: 1 },
    completed: false,
    points: 10
  },
  {
    id: 'add-switch-step',
    order: 2,
    title: { tr: 'Switch Ekle', en: 'Add a Switch' },
    description: { tr: 'Şimdi ağımıza bir Switch (anahtar) ekleyelim.', en: 'Now add a Switch to our network.' },
    hint: { tr: 'Yeşil renkli Switch simgesine tıklayın.', en: 'Click the green Switch icon.' },
    animationId: 'add-switch',
    checkType: 'deviceCount',
    checkParams: { deviceType: 'switch', minCount: 1 },
    completed: false,
    points: 10
  },
  {
    id: 'connect-devices-step',
    order: 3,
    title: { tr: 'Cihazları Bağla', en: 'Connect Devices' },
    description: { tr: 'Düz (Straight) kabloyu seçin ve PC ile Switch arasında bağlantı kurun.', en: 'Select the Straight-through cable and establish a connection between the PC and the Switch.' },
    hint: { tr: 'Kabloyu seçin, PC\'ye tıklayın (Eth0), ardından Switch\'e tıklayın (Fa0/1).', en: 'Select the cable, click the PC (Eth0), then click the Switch (Fa0/1).' },
    animationId: 'connect-cable',
    checkType: 'connection',
    checkParams: { cableType: 'straight' },
    completed: false,
    points: 20
  }
];
