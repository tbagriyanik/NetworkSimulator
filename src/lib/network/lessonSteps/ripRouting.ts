import type { GuidedStep } from '../guidedMode.types';

export const ripRoutingGuidedSteps: GuidedStep[] = [
  {
    id: 'rip-open-terminal',
    order: 1,
    title: { tr: 'Terminali Aç', en: 'Open Terminal' },
    description: { tr: 'Router terminalini açın', en: 'Open the router terminal' },
    hint: { tr: 'Router üzerine çift tıklayın.', en: 'Double-click on the router.' },
    checkType: 'deviceAccess',
    checkParams: { deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'rip-enable',
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
    id: 'rip-conf-t',
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
    id: 'rip-start-proc',
    order: 4,
    title: { tr: 'RIP Başlat', en: 'Start RIP' },
    description: { tr: 'RIP yönlendirme protokolünü başlatın', en: 'Start RIP routing protocol' },
    hint: { tr: '"router rip" yazın.', en: 'Type "router rip".' },
    checkType: 'config',
    checkParams: { configKey: 'routingProtocol', configValue: 'rip' },
    completed: false,
    points: 10
  },
  {
    id: 'rip-version-2',
    order: 5,
    title: { tr: 'RIP Versiyon', en: 'RIP Version' },
    description: { tr: 'Versiyon 2\'yi seçin', en: 'Set version to 2' },
    hint: { tr: '"version 2" yazın.', en: 'Type "version 2".' },
    checkType: 'command',
    checkParams: { commandPattern: 'version 2' },
    completed: false,
    points: 10
  },
  {
    id: 'rip-net-1-add',
    order: 6,
    title: { tr: 'Ağ 1 Ekle', en: 'Add Network 1' },
    description: { tr: '192.168.1.0 ağını ekleyin', en: 'Add 192.168.1.0 network' },
    hint: { tr: '"network 192.168.1.0" yazın.', en: 'Type "network 192.168.1.0".' },
    checkType: 'command',
    checkParams: { commandPattern: 'network 192.168.1.0' },
    completed: false,
    points: 15
  },
  {
    id: 'rip-no-auto',
    order: 7,
    title: { tr: 'Auto-Summary Kapat', en: 'No Auto-Summary' },
    description: { tr: 'Otomatik özetlemeyi kapatın', en: 'Disable automatic summarization' },
    hint: { tr: '"no auto-summary" yazın.', en: 'Type "no auto-summary".' },
    checkType: 'command',
    checkParams: { commandPattern: 'auto-summary' },
    completed: false,
    points: 5
  }
];
