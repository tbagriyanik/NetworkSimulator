import type { GuidedStep } from '../guidedMode.types';

export const servicesGuidedSteps: GuidedStep[] = [
  {
    id: 'srv-open-server',
    order: 1,
    title: { tr: 'Sunucu Paneli', en: 'Server Panel' },
    description: { tr: 'Sunucu cihazını açın', en: 'Open the server device' },
    hint: { tr: 'Server-Web üzerine çift tıklayın.', en: 'Double-click on Server-Web.' },
    checkType: 'deviceAccess',
    checkParams: { targetDeviceId: 'server-1' },
    completed: false,
    points: 5
  },
  {
    id: 'srv-http-enable',
    order: 2,
    title: { tr: 'HTTP Servisi', en: 'HTTP Service' },
    description: { tr: 'HTTP servisini aktif edin', en: 'Enable HTTP service' },
    hint: { tr: 'HTTP sekmesinden "On" seçin.', en: 'Select "On" from HTTP tab.' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'server-1', configKey: 'services.http.enabled', configValue: true },
    completed: false,
    points: 15
  },
  {
    id: 'srv-open-dns',
    order: 3,
    title: { tr: 'DNS Sunucu', en: 'DNS Server' },
    description: { tr: 'DNS sunucusunu açın', en: 'Open the DNS server' },
    hint: { tr: 'DNS-Server üzerine çift tıklayın.', en: 'Double-click on DNS-Server.' },
    checkType: 'deviceAccess',
    checkParams: { targetDeviceId: 'dns-server-1' },
    completed: false,
    points: 5
  },
  {
    id: 'srv-dns-enable',
    order: 4,
    title: { tr: 'DNS Servisi', en: 'DNS Service' },
    description: { tr: 'DNS servisini aktif edin', en: 'Enable DNS service' },
    hint: { tr: 'DNS sekmesinden "On" seçin.', en: 'Select "On" from DNS tab.' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'dns-server-1', configKey: 'services.dns.enabled', configValue: true },
    completed: false,
    points: 15
  },
  {
    id: 'srv-dns-add-rec',
    order: 5,
    title: { tr: 'DNS Kaydı', en: 'DNS Record' },
    description: { tr: 'Kayıt ekleyin (www.lab.com -> 192.168.1.10)', en: 'Add record (www.lab.com -> 192.168.1.10)' },
    hint: { tr: 'İsim ve IP girip "Add" basın.', en: 'Enter name and IP, then press "Add".' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'dns-server-1', configKey: 'services.dns.records', configValue: [{ domain: 'www.lab.com', address: '192.168.1.10' }] },
    completed: false,
    points: 20
  }
];
