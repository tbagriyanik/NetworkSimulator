import { createInitialRouterState } from '../initialState';
import { createPcDevice, createRouterDevice, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
;

const example = (isTr: boolean): ExampleProject => {
  const wifiDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 220, '192.168.1.10', 1),
    createRouterDevice('router-1', 'R1', 350, 220),
    createPcDevice('pc-2', 'PC-2', 650, 220, '192.168.1.11', 1)
  ];

  wifiDevices[1].wifi = {
    enabled: true,
    ssid: 'HomeWiFi',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'ap'
  };
  wifiDevices[1].ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected' as const,
      ipAddress: '192.168.1.1',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'HomeWiFi',
        security: 'open',
        channel: '2.4GHz',
        mode: 'ap'
      }
    },
    ...wifiDevices[1].ports
  ];
  wifiDevices[0].wifi = {
    enabled: true,
    ssid: 'HomeWiFi',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };
  wifiDevices[2].wifi = {
    enabled: true,
    ssid: 'HomeWiFi',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };

  const wifiConnections: CanvasConnection[] = [];
  const wifiNotes: CanvasNote[] = [
    {
      id: 'wifi-note',
      text: isTr
        ? 'Amaç: Router AP modunda kablosuz ağ oluşturarak PC\'lerin kablosuz bağlanmasını sağlamak.\n\nWiFi Laboratuvarı (Orta Seviye):\n1) R1 (Router) wlan0 üzerinde AP modunda SSID: HomeWiFi yayınlar.\n2) PC-1 ve PC-2 kablosuz ağa (SSID match) bağlıdır.\n3) Tüm cihazlar aynı subnet (192.168.1.x) içindedir.\n4) PC-1 > ping 192.168.1.11 ile kablosuz iletişimi test edin.\n5) PC-1 > wget 192.168.1.1 ile Wifi kontrol panelini görün.\n\n⚠️ Not: Ağı Yenile (F5)'
        : 'WiFi Lab (Intermediate):\n1) R1 (Router) broadcasts SSID: HomeWiFi on wlan0 in AP mode.\n2) PC-1 and PC-2 are connected wirelessly (SSID match).\n3) All devices are on the same subnet (192.168.1.x).\n4) Test wireless connectivity with PC-1 > ping 192.168.1.11.\n5) PC-1 > wget 192.168.1.1 for Wifi control panel.\n\n⚠️ Note: Refresh Network (F5)',
      x: 300,
      y: 400,
      width: 450,
      height: 180,
      color: 'var(--color-warning-500)',
      font: 'verdana',
      fontSize: 16,
      opacity: 0.75
    }
  ];
  const wifiR1State = createInitialRouterState('00:50:00:00:00:08');
  wifiR1State.hostname = 'R1';
  wifiR1State.ports['wlan0'] = {
    ...wifiR1State.ports['wlan0'],
    status: 'connected',
    shutdown: false,
    ipAddress: '192.168.1.1',
    subnetMask: '255.255.255.0',
    wifi: {
      ssid: 'HomeWiFi',
      security: 'open',
      password: '',
      channel: '2.4GHz',
      mode: 'ap'
    }
  };
  if (wifiR1State.ports['wlan0'].wifi) wifiR1State.ports['wlan0'].wifi.mode = 'ap';

  wifiR1State.services = {
    ...wifiR1State.services,
    dhcp: {
      enabled: true,
      pools: [{
        poolName: 'wifi-pool',
        defaultGateway: '192.168.1.1',
        dnsServer: '8.8.8.8',
        startIp: '192.168.1.100',
        subnetMask: '255.255.255.0',
        maxUsers: 50
      }]
    }
  };
  wifiR1State.dhcpPools = {
    'wifi-pool': {
      network: '192.168.1.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.1.1',
      dnsServer: '8.8.8.8'
    }
  };

  wifiR1State.runningConfig = [
    '!',
    'hostname R1',
    '!',
    'interface WLAN0',
    ' ip address 192.168.1.1 255.255.255.0',
    ' no shutdown',
    '!',
    'wlan HomeWiFi 1 HomeWiFi',
    '!',
    'ip dhcp pool wifi-pool',
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
    id: 'wifi-intermediate',
    tag: isTr ? 'WiFi' : 'WiFi',
    title: isTr ? 'Kablosuz Ağ (WiFi)' : 'Wireless Network (WiFi)',
    description: isTr
      ? 'Router access point mode ile kablosuz istemci bağlantısı sağlanır.'
      : 'Router configured as access point for wireless client connectivity.',
    detail: isTr
      ? 'SSID: HomeWiFi, Şifre: yok (open), Router AP mode'
      : 'SSID: HomeWiFi, Password: none (open), Router AP mode',
    level: 'intermediate',
    data: baseProjectData(wifiDevices, wifiConnections, wifiNotes, [
      { id: 'router-1', state: wifiR1State }
    ])
  };
};

export default example;


