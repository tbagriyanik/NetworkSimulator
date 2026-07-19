import type { GuidedStep } from '../guidedMode.types';

export const staticRoutingGuidedSteps: GuidedStep[] = [
  {
    id: 'static-open-terminal',
    order: 1,
    title: { tr: 'R1 Terminali', en: 'R1 Terminal' },
    description: { tr: 'R1 router terminalini açın', en: 'Open R1 router terminal' },
    hint: { tr: 'R1 üzerine çift tıklayın.', en: 'Double-click on R1.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'router', targetDeviceId: 'router-1' },
    completed: false,
    points: 5
  },
  {
    id: 'static-enable',
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
    id: 'static-conf-t',
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
    id: 'static-r1-route-add',
    order: 4,
    title: { tr: 'R1 Rota Ekle', en: 'R1 Add Route' },
    description: { tr: '192.168.2.0 ağına giden rotayı ekleyin', en: 'Add route to 192.168.2.0 network' },
    hint: { tr: '"ip route 192.168.2.0 255.255.255.0 10.0.0.2" yazın.', en: 'Type "ip route 192.168.2.0 255.255.255.0 10.0.0.2".' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-1', configKey: 'staticRoutes', configValue: { destination: '192.168.2.0' } },
    completed: false,
    points: 15
  },
  {
    id: 'static-r2-open',
    order: 5,
    title: { tr: 'R2 Terminali', en: 'R2 Terminal' },
    description: { tr: 'R2 router terminalini açın', en: 'Open R2 router terminal' },
    hint: { tr: 'R2 üzerine çift tıklayın.', en: 'Double-click on R2.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'router', targetDeviceId: 'router-2' },
    completed: false,
    points: 5
  },
  {
    id: 'static-r2-route-add',
    order: 6,
    title: { tr: 'R2 Rota Ekle', en: 'R2 Add Route' },
    description: { tr: '192.168.1.0 ağına giden rotayı ekleyin', en: 'Add route to 192.168.1.0 network' },
    hint: { tr: '"ip route 192.168.1.0 255.255.255.0 10.0.0.1" yazın.', en: 'Type "ip route 192.168.1.0 255.255.255.0 10.0.0.1".' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-2', configKey: 'staticRoutes', configValue: { destination: '192.168.1.0' } },
    completed: false,
    points: 15
  }
];
