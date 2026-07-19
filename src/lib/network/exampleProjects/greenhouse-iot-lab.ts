import { createInitialRouterState } from '../initialState';
import { createPcDevice, createRouterDevice, createIotDevice, baseProjectData } from './helpers';
;
;
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const greenhouseDevices = [
    createPcDevice('pc-1', 'PC-1', 50, 80, '192.168.2.10', 1),
    createRouterDevice('router-1', 'R1', 300, 80),
    createIotDevice('iot-temp', 'Sera-Sicaklik', 30, 300, 'temperature'),
    createIotDevice('iot-hum', 'Sera-Nem', 180, 340, 'humidity'),
    createIotDevice('iot-light', 'Sera-Isik', 330, 300, 'light'),
    createIotDevice('iot-motion', 'Sera-Kapi', 480, 320, 'motion'),
    createIotDevice('iot-heater', 'Sera-Isitici', 120, 470, 'temperature'),
    createIotDevice('iot-cooler', 'Sera-Sogutucu', 300, 470, 'temperature'),
    createIotDevice('iot-lamp', 'Sera-Lamba', 480, 470, 'light')
  ];

  greenhouseDevices[1].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'ap'
  };
  greenhouseDevices[1].ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected',
      vlan: 1,
      ipAddress: '192.168.2.1',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'GreenHouse-Network',
        security: 'wpa2',
        password: 'sera',
        channel: '2.4GHz',
        mode: 'ap'
      }
    },
    {
      id: 'console',
      label: 'Console',
      status: 'disconnected'
    },
    {
      id: 'gi0/0',
      label: 'Gi0/0',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 'gi0/0')?.macAddress
    },
    {
      id: 'gi0/1',
      label: 'Gi0/1',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 'gi0/1')?.macAddress
    },
    {
      id: 'gi0/2',
      label: 'Gi0/2',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 'gi0/2')?.macAddress
    },
    {
      id: 'gi0/3',
      label: 'Gi0/3',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 'gi0/3')?.macAddress
    },
    {
      id: 's0/0/0',
      label: 'S0/0/0',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 's0/0/0')?.macAddress
    },
    {
      id: 's0/1/0',
      label: 'S0/1/0',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 's0/1/0')?.macAddress
    },
    {
      id: 's0/2/0',
      label: 'S0/2/0',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 's0/2/0')?.macAddress
    }
  ];

  greenhouseDevices[0].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[0].ip = '192.168.2.10';
  greenhouseDevices[0].subnet = '255.255.255.0';
  greenhouseDevices[0].gateway = '192.168.2.1';

  greenhouseDevices[2].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[2].ip = '192.168.2.101';
  greenhouseDevices[2].subnet = '255.255.255.0';
  greenhouseDevices[2].gateway = '192.168.2.1';
  greenhouseDevices[2].ports[0].status = 'connected';
  greenhouseDevices[2].ports[0].ipAddress = '192.168.2.101';
  greenhouseDevices[2].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[2].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };

  greenhouseDevices[3].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[3].ip = '192.168.2.102';
  greenhouseDevices[3].subnet = '255.255.255.0';
  greenhouseDevices[3].gateway = '192.168.2.1';
  greenhouseDevices[3].ports[0].status = 'connected';
  greenhouseDevices[3].ports[0].ipAddress = '192.168.2.102';
  greenhouseDevices[3].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[3].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };

  greenhouseDevices[4].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[4].ip = '192.168.2.103';
  greenhouseDevices[4].subnet = '255.255.255.0';
  greenhouseDevices[4].gateway = '192.168.2.1';
  greenhouseDevices[4].ports[0].status = 'connected';
  greenhouseDevices[4].ports[0].ipAddress = '192.168.2.103';
  greenhouseDevices[4].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[4].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };

  greenhouseDevices[5].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[5].ip = '192.168.2.104';
  greenhouseDevices[5].subnet = '255.255.255.0';
  greenhouseDevices[5].gateway = '192.168.2.1';
  greenhouseDevices[5].ports[0].status = 'connected';
  greenhouseDevices[5].ports[0].ipAddress = '192.168.2.104';
  greenhouseDevices[5].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[5].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };

  greenhouseDevices[6].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[6].ip = '192.168.2.111';
  greenhouseDevices[6].subnet = '255.255.255.0';
  greenhouseDevices[6].gateway = '192.168.2.1';
  greenhouseDevices[6].ports[0].status = 'connected';
  greenhouseDevices[6].ports[0].ipAddress = '192.168.2.111';
  greenhouseDevices[6].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[6].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };
  greenhouseDevices[6].iot = {
    ...greenhouseDevices[6].iot,
    sensorType: 'temperature',
    kind: 'heater',
    dataFlowDirection: 'output',
    value: false
  };

  greenhouseDevices[7].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[7].ip = '192.168.2.112';
  greenhouseDevices[7].subnet = '255.255.255.0';
  greenhouseDevices[7].gateway = '192.168.2.1';
  greenhouseDevices[7].ports[0].status = 'connected';
  greenhouseDevices[7].ports[0].ipAddress = '192.168.2.112';
  greenhouseDevices[7].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[7].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };
  greenhouseDevices[7].iot = {
    ...greenhouseDevices[7].iot,
    sensorType: 'temperature',
    kind: 'cooler',
    dataFlowDirection: 'output',
    value: false
  };

  greenhouseDevices[8].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[8].ip = '192.168.2.113';
  greenhouseDevices[8].subnet = '255.255.255.0';
  greenhouseDevices[8].gateway = '192.168.2.1';
  greenhouseDevices[8].ports[0].status = 'connected';
  greenhouseDevices[8].ports[0].ipAddress = '192.168.2.113';
  greenhouseDevices[8].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[8].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };
  greenhouseDevices[8].iot = {
    ...greenhouseDevices[8].iot,
    sensorType: 'light',
    kind: 'lamp',
    dataFlowDirection: 'output',
    value: false
  };

  greenhouseDevices[2].iot = {
    ...greenhouseDevices[2].iot,
    sensorType: 'temperature',
    kind: 'sensor',
    dataFlowDirection: 'input',
    rules: [
      { id: 'gh-temp-hot', condition: 'iot:iot-temp:temperature > 28', action: 'iot-cooler:ON', enabled: true },
      { id: 'gh-temp-cooler-off', condition: 'iot:iot-temp:temperature < 26', action: 'iot-cooler:OFF', enabled: true },
      { id: 'gh-temp-cold', condition: 'iot:iot-temp:temperature < 18', action: 'iot-heater:ON', enabled: true },
      { id: 'gh-temp-heater-off', condition: 'iot:iot-temp:temperature > 20', action: 'iot-heater:OFF', enabled: true }
    ]
  };
  greenhouseDevices[4].iot = {
    ...greenhouseDevices[4].iot,
    sensorType: 'light',
    kind: 'sensor',
    dataFlowDirection: 'input',
    rules: [
      { id: 'gh-light-dark', condition: 'iot:iot-light:light < 45', action: 'iot-lamp:ON', enabled: true },
      { id: 'gh-light-bright', condition: 'iot:iot-light:light > 60', action: 'iot-lamp:OFF', enabled: true }
    ]
  };

  const greenhouseConnections: CanvasConnection[] = [];
  const greenhouseNotes: CanvasNote[] = [
    {
      id: 'greenhouse-note',
      text: isTr
        ? 'Amaç: Güvenli WiFi ağı ile IoT sensörleri ve aktüatörlerle sera ortamını izlemek.\n\nAKILLI SERA KROKISI:\n1) R1 (Router) WPA2 korumalı WiFi ağı: GreenHouse-Network (şifre: sera)\n2) 4 IoT Sensör: Sıcaklık (2.101), Nem (2.102), Işık (2.103), Kapı/Hareket (2.104)\n3) 3 Aktüatör: Isıtıcı (2.111), Soğutucu (2.112), Lamba (2.113)\n4) Basit programlama hazır: sıcaklık ısıtıcı/soğutucuyu, ışık sensörü lambayı otomatik yönetir\n5) PC-1 ile WiFi panelinden (wget 192.168.2.1) sensörleri izleyin\n6) IoT Panel: wget http://iot-panel (admin/admin) ile cihazları ve kuralları yönetin'
        : 'SMART GREENHOUSE SKETCH:\n1) R1 (Router) WPA2 secured WiFi: GreenHouse-Network (password: sera)\n2) 4 IoT Sensors: Temperature (.101), Humidity (.102), Light (.103), Door/Motion (.104)\n3) 3 Actuators: Heater (.111), Cooler (.112), Lamp (.113)\n4) Simple programming is preconfigured: temperature drives heater/cooler, light drives lamp automatically\n5) Monitor sensors from PC-1 via WiFi panel (wget 192.168.2.1)\n6) IoT Panel: wget http://iot-panel (admin/admin) to manage devices and rules',
      x: 500,
      y: 60,
      width: 480,
      height: 220,
      color: 'var(--color-success-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  const greenhouseR1State = createInitialRouterState('00:50:00:00:00:0A');
  greenhouseR1State.hostname = 'R1-SERA';
  greenhouseR1State.ports['wlan0'] = {
    ...greenhouseR1State.ports['wlan0'],
    status: 'connected',
    shutdown: false,
    ipAddress: '192.168.2.1',
    subnetMask: '255.255.255.0',
    wifi: {
      ssid: 'GreenHouse-Network',
      security: 'wpa2',
      password: 'sera',
      channel: '2.4GHz',
      mode: 'ap'
    }
  };
  if (greenhouseR1State.ports['wlan0'].wifi) greenhouseR1State.ports['wlan0'].wifi.mode = 'ap';

  greenhouseR1State.services = {
    ...greenhouseR1State.services,
    dhcp: {
      enabled: true,
      pools: [{
        poolName: 'greenhouse-pool',
        defaultGateway: '192.168.2.1',
        dnsServer: '8.8.8.8',
        startIp: '192.168.2.100',
        subnetMask: '255.255.255.0',
        maxUsers: 50
      }]
    }
  };
  greenhouseR1State.dhcpPools = {
    'greenhouse-pool': {
      network: '192.168.2.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.2.1',
      dnsServer: '8.8.8.8'
    }
  };

  greenhouseR1State.runningConfig = [
    '!',
    'hostname R1-SERA',
    '!',
    'interface WLAN0',
    ' ip address 192.168.2.1 255.255.255.0',
    ' no shutdown',
    '!',
    'wlan GreenHouse-Network 1 GreenHouse-Network',
    'security wpa psk ascii 0 sera',
    '!',
    'ip dhcp pool greenhouse-pool',
    ' network 192.168.2.0 255.255.255.0',
    ' default-router 192.168.2.1',
    ' dns-server 8.8.8.8',
    '!',
    'line con 0',
    'line aux 0',
    'line vty 0 4',
    ' login',
    '!',
    'end'
  ];

  return {
    id: 'greenhouse-iot-lab',
    tag: isTr ? 'ÇEVRE' : 'ENV',
    title: isTr ? '🌱 Sera Krokisi (Akıllı Tarım)' : '🌱 Greenhouse Sketch (Smart Farm)',
    description: isTr
      ? 'Dört çevresel sensör WPA2 güvenli WiFi ile sera izleme yapar.'
      : 'Four environmental sensors use WPA2 WiFi for greenhouse monitoring.',
    detail: isTr
      ? 'SSID: GreenHouse-Network, Şifre: sera (WPA2), 4 sensör'
      : 'SSID: GreenHouse-Network, Password: sera (WPA2), 4 sensors',
    level: 'intermediate',
    data: baseProjectData(greenhouseDevices, greenhouseConnections, greenhouseNotes, [
      { id: 'router-1', state: greenhouseR1State }
    ])
  };
};

export default example;


