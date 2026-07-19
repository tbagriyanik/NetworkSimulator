import { createInitialRouterState } from '../initialState';
import { createPcDevice, createRouterDevice, createIotDevice, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
;

const example = (isTr: boolean): ExampleProject => {
  const iotWifiDevices = [
    createPcDevice('pc-1', 'PC-1', 50, 100, '192.168.1.10', 1),
    createRouterDevice('router-1', 'R1', 300, 100),
    createIotDevice('iot-1', 'IoT-Temp', 50, 280, 'temperature'),
    createIotDevice('iot-2', 'IoT-Humidity', 200, 320, 'humidity'),
    createIotDevice('iot-3', 'IoT-Motion', 350, 280, 'motion')
  ];

  iotWifiDevices[1].wifi = {
    enabled: true,
    ssid: 'IoT-Network',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'ap'
  };
  iotWifiDevices[1].ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected' as const,
      ipAddress: '192.168.1.1',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'IoT-Network',
        security: 'open',
        channel: '2.4GHz',
        mode: 'ap'
      }
    },
    ...iotWifiDevices[1].ports
  ];

  iotWifiDevices[0].wifi = {
    enabled: true,
    ssid: 'IoT-Network',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };
  iotWifiDevices[0].ipConfigMode = 'dhcp';
  iotWifiDevices[0].ip = '0.0.0.0';
  iotWifiDevices[0].subnet = '255.255.255.0';
  iotWifiDevices[0].gateway = '192.168.1.1';

  iotWifiDevices[2].wifi = {
    enabled: true,
    ssid: 'IoT-Network',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };
  iotWifiDevices[2].ipConfigMode = 'dhcp';
  iotWifiDevices[2].ip = '0.0.0.0';
  iotWifiDevices[2].subnet = '255.255.255.0';
  iotWifiDevices[2].gateway = '192.168.1.1';
  iotWifiDevices[2].ports[0].status = 'connected';
  iotWifiDevices[2].ports[0].ipAddress = '0.0.0.0';
  iotWifiDevices[2].ports[0].subnetMask = '255.255.255.0';
  iotWifiDevices[2].ports[0].wifi = { ssid: 'IoT-Network', security: 'open', channel: '2.4GHz', mode: 'client' };

  iotWifiDevices[3].wifi = {
    enabled: true,
    ssid: 'IoT-Network',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };
  iotWifiDevices[3].ipConfigMode = 'dhcp';
  iotWifiDevices[3].ip = '0.0.0.0';
  iotWifiDevices[3].subnet = '255.255.255.0';
  iotWifiDevices[3].gateway = '192.168.1.1';
  iotWifiDevices[3].ports[0].status = 'connected';
  iotWifiDevices[3].ports[0].ipAddress = '0.0.0.0';
  iotWifiDevices[3].ports[0].subnetMask = '255.255.255.0';
  iotWifiDevices[3].ports[0].wifi = { ssid: 'IoT-Network', security: 'open', channel: '2.4GHz', mode: 'client' };

  iotWifiDevices[4].wifi = {
    enabled: true,
    ssid: 'IoT-Network',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };
  iotWifiDevices[4].ipConfigMode = 'dhcp';
  iotWifiDevices[4].ip = '0.0.0.0';
  iotWifiDevices[4].subnet = '255.255.255.0';
  iotWifiDevices[4].gateway = '192.168.1.1';
  iotWifiDevices[4].ports[0].status = 'connected';
  iotWifiDevices[4].ports[0].ipAddress = '0.0.0.0';
  iotWifiDevices[4].ports[0].subnetMask = '255.255.255.0';
  iotWifiDevices[4].ports[0].wifi = { ssid: 'IoT-Network', security: 'open', channel: '2.4GHz', mode: 'client' };

  const iotWifiConnections: CanvasConnection[] = [];
  const iotWifiNotes: CanvasNote[] = [
    {
      id: 'iot-wifi-note',
      text: isTr
        ? 'Amaç: IoT cihazlarını kablosuz ağa bağlayarak sensör verilerini izlemek.\n\nIoT WiFi Laboratuvarı:\n1) R1 (Router) wlan0 üzerinde AP modunda SSID: IoT-Network (Open) yayınlar.\n2) R1 üzerinde DHCP havuzu yapılandırılmıştır (192.168.1.100-150).\n3) PC-1 ve 3 IoT cihazı kablosuz ağa (DHCP) bağlıdır.\n4) PC-1 üzerinde wget 192.168.1.1 ile WiFi panelinden IoT cihazlarını yönetin.\n5) PC-1 > ping 192.168.1.1 ile bağlantıyı test edin.\n6) PC-1 > wget http://iot-panel ile cihaz kontrol paneline ulaşınız.\n\n⚠️ Not: Ağı Yenile (F5)'
        : 'IoT WiFi Lab:\n1) R1 (Router) broadcasts SSID: IoT-Network (Open) on wlan0 in AP mode.\n2) DHCP pool is configured on R1 (192.168.1.100-150).\n3) PC-1 and 3 IoT devices are connected via WiFi (DHCP).\n4) Manage IoT devices from PC-1 WiFi panel via wget 192.168.1.1.\n5) Test connectivity with PC-1 > ping 192.168.1.1.\n6) Access device control panel via PC-1 > wget http://iot-panel\n\n⚠️ Note: Refresh Network (F5)',
      x: 500,
      y: 80,
      width: 450,
      height: 220,
      color: 'var(--color-success-500)',
      font: 'verdana',
      fontSize: 16,
      opacity: 0.75
    }
  ];

  const iotWifiR1State = createInitialRouterState('00:50:00:00:00:09');
  iotWifiR1State.hostname = 'R1';
  iotWifiR1State.ports['wlan0'] = {
    ...iotWifiR1State.ports['wlan0'],
    status: 'connected',
    shutdown: false,
    ipAddress: '192.168.1.1',
    subnetMask: '255.255.255.0',
    wifi: {
      ssid: 'IoT-Network',
      security: 'open',
      password: '',
      channel: '2.4GHz',
      mode: 'ap'
    }
  };
  if (iotWifiR1State.ports['wlan0'].wifi) iotWifiR1State.ports['wlan0'].wifi.mode = 'ap';

  iotWifiR1State.services = {
    ...iotWifiR1State.services,
    dhcp: {
      enabled: true,
      pools: [{
        poolName: 'iot-pool',
        defaultGateway: '192.168.1.1',
        dnsServer: '8.8.8.8',
        startIp: '192.168.1.100',
        subnetMask: '255.255.255.0',
        maxUsers: 50
      }]
    }
  };
  iotWifiR1State.dhcpPools = {
    'iot-pool': {
      network: '192.168.1.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.1.1',
      dnsServer: '8.8.8.8'
    }
  };

  iotWifiR1State.runningConfig = [
    '!',
    'hostname R1',
    '!',
    'interface WLAN0',
    ' ip address 192.168.1.1 255.255.255.0',
    ' no shutdown',
    '!',
    'wlan IoT-Network 1 IoT-Network',
    '!',
    'ip dhcp pool iot-pool',
    ' network 192.168.1.0 255.255.255.0',
    ' default-router 192.168.1.1',
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
    id: 'iot-wifi-lab',
    tag: 'IoT',
    title: isTr ? 'IoT WiFi Laboratuvarı' : 'IoT WiFi Lab',
    description: isTr
      ? 'Üç IoT cihazı ve PC DHCP üzerinden açık WiFi ağına bağlanır.'
      : 'Three IoT devices and PC connect to open WiFi network via DHCP.',
    detail: isTr
      ? 'SSID: IoT-Network, DHCP IP desteği, 3 IoT cihazı'
      : 'SSID: IoT-Network, DHCP IP support, 3 IoT devices',
    level: 'intermediate',
    data: baseProjectData(iotWifiDevices, iotWifiConnections, iotWifiNotes, [
      { id: 'router-1', state: iotWifiR1State }
    ])
  };
};

export default example;


