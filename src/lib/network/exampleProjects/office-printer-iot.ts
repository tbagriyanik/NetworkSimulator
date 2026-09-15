import {
  createSwitchDevice,
  createRouterDevice,
  createPcDevice,
  createPrinterDevice,
  createIotDevice,
  createMobileDevice,
  connectPorts,
  baseProjectData
} from './helpers';
import { createInitialRouterState, createInitialState } from '../initialState';
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const routerState = createInitialRouterState('00:50:00:00:00:A1');
  routerState.hostname = 'Gateway-R1';
  if (routerState.ports['gi0/0']) {
    routerState.ports['gi0/0'].ipAddress = '192.168.1.1';
    routerState.ports['gi0/0'].subnetMask = '255.255.255.0';
    routerState.ports['gi0/0'].status = 'connected';
    routerState.ports['gi0/0'].shutdown = false;
  }
  routerState.services = {
    ...routerState.services,
    dhcp: {
      enabled: true,
      pools: [
        {
          poolName: 'OfficePool',
          startIp: '192.168.1.100',
          subnetMask: '255.255.255.0',
          defaultGateway: '192.168.1.1',
          dnsServer: '8.8.8.8',
          maxUsers: 100
        }
      ]
    }
  };

  const switchState = createInitialState('00:11:00:00:00:A1', 'NS-L2-24TT-L');
  switchState.hostname = 'Office-SW1';

  const devices = [
    createRouterDevice('router-1', 'Gateway-R1', 380, 50, '192.168.1.1'),
    createSwitchDevice('switch-1', 'Office-SW1', 380, 180),
    createPrinterDevice('printer-1', 'Floor1-Printer', 100, 320, '192.168.1.20', '192.168.1.1'),
    createIotDevice('iot-temp', 'HVAC-Temp-Sensor', 280, 320, 'temperature'),
    createPcDevice('pc-admin', 'Admin-Workstation', 480, 320, '192.168.1.101', 1, '192.168.1.1'),
    createMobileDevice('mob-tablet', 'Staff-Tablet', 680, 320, '192.168.1.150', { ssid: 'Office-WiFi', security: 'wpa2', password: 'officepassword' }, '192.168.1.1')
  ];

  // Configure IoT IP & status
  devices[3].ip = '192.168.1.30';
  devices[3].subnet = '255.255.255.0';
  devices[3].gateway = '192.168.1.1';
  devices[3].services = {
    http: {
      enabled: true,
      mode: 'simple',
      content: '<h1>Office Climate Sensor</h1><p>Temperature: 22.5°C | Status: Optimal</p>'
    }
  };

  const connections: CanvasConnection[] = [];
  connectPorts(devices, connections, 'router-1', 'gi0/0', 'switch-1', 'fa0/1');
  connectPorts(devices, connections, 'printer-1', 'eth0', 'switch-1', 'fa0/2');
  connectPorts(devices, connections, 'iot-temp', 'eth0', 'switch-1', 'fa0/3');
  connectPorts(devices, connections, 'pc-admin', 'eth0', 'switch-1', 'fa0/4');

  const notes: CanvasNote[] = [
    {
      id: 'office-printer-iot-note',
      text: isTr
        ? '🏢 Modern Ofis: Ağ Yazıcısı, Akıllı IoT Sensör & Mobil Cihaz Entegrasyonu\n\n' +
          '🎯 Amaç ve Senaryo Özeti:\n' +
          'Modern ofis ortamında kablolu iş istasyonları, ağ yazıcısı (JetDirect/LPD), HVAC çevre denetim IoT sensörü ve mobil tablet cihazlarının ortak ağ mimarisinde çalışmasını test etme.\n\n' +
          '📋 Cihaz Yapılandırması:\n' +
          '• Gateway-R1 (192.168.1.1) DHCP Havuzu: OfficePool (192.168.1.100 - .200)\n' +
          '• Floor1-Printer (192.168.1.20): Ağ Yazıcı Arayüzü & HTTP Yönetim Konsolu\n' +
          '• HVAC-Temp-Sensor (192.168.1.30): Sıcaklık & İklim Sensörü\n' +
          '• Admin-Workstation (192.168.1.101): Ofis Yöneticisi PC\n' +
          '• Staff-Tablet (192.168.1.150): Kablosuz Mobil Tablet\n\n' +
          '🧪 Doğrulama ve Test:\n' +
          '1. Admin PC üzerinden "ping 192.168.1.20" ile yazıcıya erişimi test edin.\n' +
          '2. Admin PC web tarayıcısı veya "curl 192.168.1.20" ile yazıcı durum sayfasını görüntüleyin.\n' +
          '3. "curl 192.168.1.30" ile IoT sensörünün iklim telemetri verilerini okuyun.'
        : '🏢 Modern Office: Network Printer, Smart IoT Sensor & Mobile Device Integration\n\n' +
          '🎯 Objective & Scenario Overview:\n' +
          'Validate enterprise office convergence with dedicated network printers, environment IoT telemetry, wired workstations, and mobile devices over standard TCP/IP architecture.\n\n' +
          '📋 Device Configurations:\n' +
          '• Gateway-R1 (192.168.1.1) DHCP Pool: OfficePool (192.168.1.100 - .200)\n' +
          '• Floor1-Printer (192.168.1.20): Dedicated Network Printer & HTTP Web Console\n' +
          '• HVAC-Temp-Sensor (192.168.1.30): Climate Telemetry Sensor\n' +
          '• Admin-Workstation (192.168.1.101): Administrator PC\n' +
          '• Staff-Tablet (192.168.1.150): Mobile Endpoint Client\n\n' +
          '🧪 Verification & Testing:\n' +
          '1. Ping the network printer: "ping 192.168.1.20" from Admin-Workstation.\n' +
          '2. Query printer status via HTTP: "curl 192.168.1.20".\n' +
          '3. Read telemetry from the HVAC sensor: "curl 192.168.1.30".',
      x: 50,
      y: 430,
      width: 680,
      height: 310,
      color: 'var(--color-primary-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  return {
    id: 'office-printer-iot',
    tag: isTr ? 'OFİS & IOT' : 'OFFICE & IOT',
    title: isTr ? 'Ofis Ağı: Yazıcı, IoT Sensör ve Tablet' : 'Office Network: Printer, IoT Sensor & Tablet',
    description: isTr
      ? 'Ağ yazıcısı, IoT ortam sensörü, masaüstü PC ve mobil cihazların entegre çalıştığı ofis ağı laboratuvarı.'
      : 'Modern office lab integrating dedicated network printer, IoT environmental sensor, desktop PC and mobile tablet.',
    detail: isTr
      ? 'Yazıcı web konsolu, IoT telemetrisi ve DHCP ağ geçidi ile tam uçtan uca ofis topolojisi.'
      : 'End-to-end office convergence with printer web UI, IoT telemetry, and central router gateway.',
    level: 'intermediate',
    data: baseProjectData(devices, connections, notes, [
      { id: 'router-1', state: routerState },
      { id: 'switch-1', state: switchState }
    ])
  };
};

export default example;
