import type { GuidedStep } from '../guidedMode.types';

export const portSecurityGuidedSteps: GuidedStep[] = [
  {
    id: 'ps-open-terminal',
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
    id: 'ps-enable',
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
    id: 'ps-conf-t',
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
    id: 'ps-int-fa01',
    order: 4,
    title: { tr: 'Arayüz Seçimi', en: 'Interface Selection' },
    description: { tr: 'FastEthernet 0/1 arayüzüne girin', en: 'Enter FastEthernet 0/1 interface' },
    hint: { tr: '"int fa0/1" yazın.', en: 'Type "int fa0/1".' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface fa0/1' },
    completed: false,
    points: 5
  },
  {
    id: 'ps-mode-access',
    order: 5,
    title: { tr: 'Erişim Modu', en: 'Access Mode' },
    description: { tr: 'Portu access moduna alın', en: 'Set port to access mode' },
    hint: { tr: '"switchport mode access" yazın.', en: 'Type "switchport mode access".' },
    checkType: 'config',
    checkParams: { configKey: 'ports.fa0/1.mode', configValue: 'access' },
    completed: false,
    points: 5
  },
  {
    id: 'ps-enable-feat',
    order: 6,
    title: { tr: 'Güvenliği Aç', en: 'Enable Security' },
    description: { tr: 'Port güvenliğini etkinleştirin', en: 'Enable port security' },
    hint: { tr: '"switchport port-security" yazın.', en: 'Type "switchport port-security".' },
    checkType: 'config',
    checkParams: { configKey: 'ports.fa0/1.portSecurity.enabled', configValue: true },
    completed: false,
    points: 10
  },
  {
    id: 'ps-sticky-mac',
    order: 7,
    title: { tr: 'Sticky MAC', en: 'Sticky MAC' },
    description: { tr: 'MAC adreslerini kalıcı öğrenmeyi açın', en: 'Enable sticky MAC address learning' },
    hint: { tr: '"switchport port-security mac-address sticky" yazın.', en: 'Type "switchport port-security mac-address sticky".' },
    checkType: 'command',
    checkParams: { commandPattern: 'mac-address sticky' },
    completed: false,
    points: 10
  },
  {
    id: 'ps-max-1',
    order: 8,
    title: { tr: 'Maksimum MAC', en: 'Max MAC' },
    description: { tr: 'Maksimum 1 MAC adresine izin verin', en: 'Allow maximum 1 MAC address' },
    hint: { tr: '"switchport port-security maximum 1" yazın.', en: 'Type "switchport port-security maximum 1".' },
    checkType: 'command',
    checkParams: { commandPattern: 'maximum 1' },
    completed: false,
    points: 10
  }
];
