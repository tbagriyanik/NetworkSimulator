import type { GuidedStep } from '../guidedMode.types';

export const basicSwitchGuidedSteps: GuidedStep[] = [
  {
    id: 'connect-pc-to-switch',
    order: 1,
    title: { tr: 'PC\'yi Switch\'e Bağla', en: 'Connect PC to Switch' },
    description: { tr: 'PC-1 cihazını Switch-1\'e kablo ile bağlayın', en: 'Connect PC-1 to Switch-1 using a cable' },
    hint: { tr: 'Straight-Through kablo seçin. PC-1 Eth0 -> Switch-1 Fa0/1', en: 'Select Straight-Through cable. PC-1 Eth0 -> Switch-1 Fa0/1' },
    detailedInstructions: {
      tr: ['Kablo aracını seçin', 'Straight-Through seçin', 'PC-1 Eth0 portuna tıklayın', 'Switch-1 Fa0/1 portuna tıklayın'],
      en: ['Select cable tool', 'Choose Straight-Through', 'Click PC-1 Eth0', 'Click Switch-1 Fa0/1']
    },
    checkType: 'connection',
    checkParams: { cableType: 'straight', sourceDevice: 'pc-1', sourcePort: 'eth0', targetDevice: 'switch-1', targetPort: 'fa0/1' },
    completed: false,
    points: 10
  },
  {
    id: 'open-switch-terminal',
    order: 2,
    title: { tr: 'Switch Terminalini Aç', en: 'Open Switch Terminal' },
    description: { tr: 'Switch cihazına çift tıklayarak terminalini açın', en: 'Double-click the Switch device to open its terminal' },
    hint: { tr: 'Switch-1 üzerine çift tıklayın.', en: 'Double-click on Switch-1.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'enter-enable-mode',
    order: 3,
    title: { tr: 'Enable Moduna Geç', en: 'Enter Enable Mode' },
    description: { tr: 'Ayrıcalıklı moda geçmek için enable komutunu kullanın', en: 'Use the enable command to enter privileged mode' },
    hint: { tr: '"enable" yazıp Enter\'a basın.', en: 'Type "enable" and press Enter.' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable' },
    completed: false,
    points: 5
  },
  {
    id: 'enter-config-mode',
    order: 4,
    title: { tr: 'Yapılandırma Moduna Geç', en: 'Enter Configuration Mode' },
    description: { tr: 'Global yapılandırma moduna geçmek için conf t komutunu kullanın', en: 'Use conf t command to enter global configuration mode' },
    hint: { tr: '"conf t" yazın.', en: 'Type "conf t".' },
    checkType: 'command',
    checkParams: { commandPattern: 'conf' },
    completed: false,
    points: 5
  },
  {
    id: 'configure-hostname',
    order: 5,
    title: { tr: 'Hostname Değiştir', en: 'Change Hostname' },
    description: { tr: 'Switch\'e SW-Lab ismini verin', en: 'Give the Switch the name SW-Lab' },
    hint: { tr: '"hostname SW-Lab" yazın.', en: 'Type "hostname SW-Lab".' },
    checkType: 'command',
    checkParams: { commandPattern: 'hostname' },
    completed: false,
    points: 10
  },
  {
    id: 'activate-port',
    order: 6,
    title: { tr: 'Port Aktifleştir', en: 'Activate a Port' },
    description: { tr: 'FastEthernet 0/1 portunu aktif hale getirin', en: 'Activate the FastEthernet 0/1 port' },
    hint: { tr: 'int fa0/1 -> no shutdown', en: 'int fa0/1 -> no shutdown' },
    checkType: 'config',
    checkParams: { configKey: 'ports.fa0/1.shutdown', configValue: false },
    completed: false,
    points: 15
  },
  {
    id: 'save-config',
    order: 7,
    title: { tr: 'Yapılandırmayı Kaydet', en: 'Save Configuration' },
    description: { tr: 'Yaptığınız değişiklikleri kaydedin', en: 'Save your changes' },
    hint: { tr: 'exit yapıp "write memory" yazın.', en: 'Type exit then "write memory".' },
    checkType: 'command',
    checkParams: { commandPattern: 'write|copy' },
    completed: false,
    points: 10
  }
];
