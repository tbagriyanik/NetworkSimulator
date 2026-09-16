import {
  createSwitchDevice,
  createPcDevice,
  createFirewallDevice,
  connectPorts,
  baseProjectData
} from './helpers';
import type { ExampleProject, FirewallRule } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const dmzFirewallRules: FirewallRule[] = [
    { id: 'rule-dmz-http', sourceIp: '192.168.1.0/24', targetIp: '172.16.1.10', port: '80', protocol: 'tcp', action: 'allow', enabled: true },
    { id: 'rule-dmz-dns', sourceIp: '192.168.1.0/24', targetIp: '172.16.1.20', port: '53', protocol: 'udp', action: 'allow', enabled: true },
    { id: 'rule-dmz-block-wan', sourceIp: '203.0.113.0/24', targetIp: '192.168.1.0/24', port: '*', protocol: 'any', action: 'deny', enabled: true },
    { id: 'rule-dmz-allow-all', sourceIp: '*', targetIp: '*', port: '*', protocol: 'any', action: 'allow', enabled: true }
  ];

  const devices = [
    createPcDevice('pc-lan-1', 'LAN-Workstation-1', 60, 160, '192.168.1.10', 1, '192.168.1.1'),
    createPcDevice('pc-lan-2', 'LAN-Workstation-2', 60, 320, '192.168.1.20', 1, '192.168.1.1'),
    createSwitchDevice('sw-lan', 'LAN-Core-SW', 240, 240),
    createFirewallDevice('fw-dmz', 'NGFW-Gateway', 440, 240, '192.168.1.1', dmzFirewallRules),
    createSwitchDevice('sw-dmz', 'DMZ-Farm-SW', 640, 140),
    createPcDevice('srv-dmz-web', 'DMZ-Public-Web', 820, 80, '172.16.1.10', 1, '172.16.1.1'),
    createPcDevice('srv-dmz-dns', 'DMZ-Auth-DNS', 820, 200, '172.16.1.20', 1, '172.16.1.1'),
    createPcDevice('pc-wan-tester', 'WAN-External-Host', 640, 380, '203.0.113.50', 1, '203.0.113.1')
  ];

  // Set web service on DMZ Web Server
  devices[5].services = {
    http: {
      enabled: true,
      mode: 'simple',
      content: '<h1>DMZ Enterprise Portal</h1><p>Public-facing Secure Web Server</p>'
    }
  };

  // Set DNS service on DMZ DNS Server
  devices[6].services = {
    dns: {
      enabled: true,
      records: [
        { domain: 'portal.company.local', address: '172.16.1.10' },
        { domain: 'ns1.company.local', address: '172.16.1.20' }
      ]
    }
  };

  const connections: CanvasConnection[] = [];
  connectPorts(devices, connections, 'pc-lan-1', 'eth0', 'sw-lan', 'fa0/2');
  connectPorts(devices, connections, 'pc-lan-2', 'eth0', 'sw-lan', 'fa0/3');
  connectPorts(devices, connections, 'sw-lan', 'fa0/1', 'fw-dmz', 'gi0/0');
  connectPorts(devices, connections, 'fw-dmz', 'gi0/1', 'sw-dmz', 'fa0/1');
  connectPorts(devices, connections, 'sw-dmz', 'fa0/2', 'srv-dmz-web', 'eth0');
  connectPorts(devices, connections, 'sw-dmz', 'fa0/3', 'srv-dmz-dns', 'eth0');

  const notes: CanvasNote[] = [
    {
      id: 'dmz-firewall-note',
      text: isTr
        ? '🛡️ Kurumsal DMZ ve Çok Katmanlı Güvenlik Duvarı Laboratuvarı\n\n' +
        'ğŸ¯ Amaç ve Senaryo Özeti:\n' +
        'İç ağ (LAN 192.168.1.0/24), arındırılmış bölge (DMZ 172.16.1.0/24) ve dış ağ (WAN 203.0.113.0/24) arasındaki güvenlik kurallarını NGFW üzerinde denetleme.\n\n' +
        '📋 Güvenlik Duvarı Filtreleme Kuralları:\n' +
        '1. [ALLOW] LAN (192.168.1.0/24) → DMZ Web (172.16.1.10:80 TCP)\n' +
        '2. [ALLOW] LAN (192.168.1.0/24) → DMZ DNS (172.16.1.20:53 UDP)\n' +
        '3. [DENY] WAN (203.0.113.0/24) → LAN (192.168.1.0/24 ANY)\n' +
        '4. [ALLOW] Tüm diğer izinli yönlendirmeler\n\n' +
        '🧪 Doğrulama ve Test:\n' +
        '1. LAN-Workstation-1 üzerinden "curl 172.16.1.10" ile Web Portala erişin (BAÅARILI).\n' +
        '2. LAN-Workstation-1 üzerinden "nslookup portal.company.local 172.16.1.20" sorgulayın (BAÅARILI).\n' +
        '3. WAN Test cihazından LAN IP adreslerine gelen paketlerin engellendiğini doğrulayın.'
        : '🛡️ Enterprise DMZ & Multi-Tier Firewall Architecture Lab\n\n' +
        'ğŸ¯ Objective & Scenario Overview:\n' +
        'Segment and enforce traffic policies across Internal LAN (192.168.1.0/24), Demilitarized Zone (DMZ 172.16.1.0/24), and External WAN perimeter on NGFW.\n\n' +
        '📋 Firewall Rule Hierarchy:\n' +
        '1. [ALLOW] LAN (192.168.1.0/24) → DMZ Web (172.16.1.10:80 TCP)\n' +
        '2. [ALLOW] LAN (192.168.1.0/24) → DMZ DNS (172.16.1.20:53 UDP)\n' +
        '3. [DENY] WAN (203.0.113.0/24) → LAN (192.168.1.0/24 ANY)\n' +
        '4. [ALLOW] Default transit traffic\n\n' +
        '🧪 Verification & Testing:\n' +
        '1. From LAN-Workstation-1 test Web portal: "curl 172.16.1.10" (SUCCESS).\n' +
        '2. Query DMZ DNS: "nslookup portal.company.local 172.16.1.20" (SUCCESS).\n' +
        '3. Verify inbound WAN scans to LAN clients are filtered by default policy.',
      x: 50,
      y: 470,
      width: 750,
      height: 310,
      color: 'var(--color-error-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  return {
    id: 'dmz-firewall-enterprise',
    tag: isTr ? 'GÜVENLİK' : 'SECURITY',
    title: isTr ? 'Kurumsal DMZ ve Çok Bölgeli Güvenlik Duvarı' : 'Enterprise DMZ & Multi-Zone Firewall',
    description: isTr
      ? 'LAN, DMZ sunucu çiftliği ve WAN bölgeleri arasında durum denetimli güvenlik kurallarını içeren gelişmiş firewall laboratuvarı.'
      : 'Advanced firewall lab featuring LAN, DMZ server farm and WAN security zones with stateful policy rules.',
    detail: isTr
      ? 'HTTP/DNS kural izinleri, DMZ izolasyonu ve dış erişim engelleme politikaları.'
      : 'HTTP/DNS service policies, DMZ server isolation, and ingress filtering.',
    level: 'advanced',
    data: baseProjectData(devices, connections, notes, [])
  };
};

export default example;


