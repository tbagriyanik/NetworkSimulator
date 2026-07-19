import type { GuidedStep } from '../guidedMode.types';

export const hospitalGuidedSteps: GuidedStep[] = [
  {
    id: 'hosp-vlan-data',
    order: 1,
    title: { tr: 'Hasta Veri VLAN', en: 'Patient Data VLAN' },
    description: { tr: 'Kritik hasta verileri için VLAN 100 oluşturun.', en: 'Create VLAN 100 for critical patient data.' },
    hint: { tr: 'vlan 100 -> name PATIENT-DATA', en: 'vlan 100 -> name PATIENT-DATA' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'vlans.100.name', configValue: 'PATIENT-DATA' },
    completed: false,
    points: 10
  },
  {
    id: 'hosp-vlan-medical',
    order: 2,
    title: { tr: 'Tıbbi Cihaz VLAN', en: 'Medical Device VLAN' },
    description: { tr: 'Tıbbi cihazlar için VLAN 200 oluşturun.', en: 'Create VLAN 200 for medical devices.' },
    hint: { tr: 'vlan 200 -> name MEDICAL-DEVICES', en: 'vlan 200 -> name MEDICAL-DEVICES' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'vlans.200.name', configValue: 'MEDICAL-DEVICES' },
    completed: false,
    points: 10
  },
  {
    id: 'hosp-port-sec',
    order: 3,
    title: { tr: 'Port Güvenliği', en: 'Port Security' },
    description: { tr: 'Veri sızıntısını önlemek için Fa0/1 portunda güvenliği açın.', en: 'Enable port security on Fa0/1 to prevent data leakage.' },
    hint: { tr: 'int fa0/1 -> switchport port-security', en: 'int fa0/1 -> switchport port-security' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'switch-1', configKey: 'ports.fa0/1.portSecurity.enabled', configValue: true },
    completed: false,
    points: 15
  },
  {
    id: 'hosp-acl-restrict',
    order: 4,
    title: { tr: 'Erişim Kısıtlama (ACL)', en: 'Access Restriction (ACL)' },
    description: { tr: 'Tıbbi cihazların internete çıkışını kısıtlayın.', en: 'Restrict medical devices from accessing the internet.' },
    hint: { tr: 'access-list 10 deny any -> ip access-group 10 in', en: 'access-list 10 deny any -> ip access-group 10 in' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'router-1', configKey: 'ports.gi0/0.accessGroupIn', configValue: '10' },
    completed: false,
    points: 20
  },
  {
    id: 'hosp-server-dns',
    order: 5,
    title: { tr: 'Hastane Sunucusu', en: 'Hospital Server' },
    description: { tr: 'Merkezi kayıt sunucusunu (192.168.100.10) ağa tanıtın.', en: 'Introduce the central registry server (192.168.100.10) to the network.' },
    hint: { tr: 'DNS kaydı: records: [{ domain: "hbys.local", address: "192.168.100.10" }]', en: 'DNS record: records: [{ domain: "hbys.local", address: "192.168.100.10" }]' },
    checkType: 'config',
    checkParams: { targetDeviceId: 'server-1', configKey: 'services.dns.records', configValue: [{ domain: 'hbys.local', address: '192.168.100.10' }] },
    completed: false,
    points: 20
  },
  {
    id: 'hosp-ping-server',
    order: 6,
    title: { tr: 'Sunucu Erişimi', en: 'Server Connectivity' },
    description: { tr: 'Hemşire bilgisayarından (PC1) kayıt sunucusuna ping atın.', en: 'Ping the registry server from the nurse station PC (PC1).' },
    hint: { tr: 'PC-1 CMD > ping 192.168.100.10', en: 'PC-1 CMD > ping 192.168.100.10' },
    checkType: 'ping',
    checkParams: { fromDevice: 'pc-1', toIp: '192.168.100.10' },
    completed: false,
    points: 25
  }
];
