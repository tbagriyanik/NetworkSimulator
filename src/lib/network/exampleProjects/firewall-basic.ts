import { createPcDevice, createFirewallDevice, connectPorts, baseProjectData } from './helpers';
;
;
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const firewallRulesBasic = [
    { id: 'rule-1', sourceIp: '*', targetIp: '*', port: '*', protocol: 'icmp' as const, action: 'deny' as const, enabled: true },
    { id: 'rule-2', sourceIp: '*', targetIp: '*', port: '*', protocol: 'any' as const, action: 'allow' as const, enabled: true }
  ];
  const firewallBasicDevices = [
    createPcDevice('pc-1', 'PC-1', 50, 220, '192.168.1.10', 1, '192.168.1.1'),
    createFirewallDevice('firewall-1', 'FW-1', 350, 220, '192.168.1.1', firewallRulesBasic),
    createPcDevice('pc-2', 'PC-2', 650, 220, '192.168.1.20', 1, '192.168.1.1')
  ];
  const firewallBasicConnections: CanvasConnection[] = [];
  const firewallBasicNotes: CanvasNote[] = [
    {
      id: 'firewall-basic-note',
      text: isTr
        ? '🛡️ Firewall Temel Laboratuvarı:\n\n1) PC-1 (192.168.1.10) → FW-1 → PC-2 (192.168.1.20)\n2) ICMP (ping) ENGELLENMİŞ - Rule 1\n3) Diğer tüm trafiğe İZİN VERİLMİŞ - Rule 2\n\nTest:\n• PC-1 > ping 192.168.1.20 (BAŞARISIZ - ICMP engelli)\n• PC-1 > wget 192.168.1.20 (BAŞARILI - HTTP izinli)\n\nKurallar sıralamaya göre işlenir. ICMP deny kuralı eşleşir ve engeller. HTTP/HTTPS gibi diğer protokoller allow kuralına düşer.'
        : '🛡️ Firewall Basic Lab:\n\n1) PC-1 (192.168.1.10) → FW-1 → PC-2 (192.168.1.20)\n2) ICMP (ping) BLOCKED - Rule 1\n3) All other traffic ALLOWED - Rule 2\n\nTest:\n• PC-1 > ping 192.168.1.20 (FAIL - ICMP blocked)\n• PC-1 > wget 192.168.1.20 (SUCCESS - HTTP allowed)\n\nRules are processed in order. ICMP deny rule matches and blocks. Other protocols like HTTP/HTTPS fall through to allow rule.',
      x: 50,
      y: 50,
      width: 550,
      height: 180,
      color: 'var(--color-error-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  connectPorts(firewallBasicDevices, firewallBasicConnections, 'pc-1', 'eth0', 'firewall-1', 'gi0/0', 'crossover');
  connectPorts(firewallBasicDevices, firewallBasicConnections, 'firewall-1', 'gi0/1', 'pc-2', 'eth0', 'crossover');

  return {
    id: 'firewall-basic',
    tag: isTr ? 'FIREWALL' : 'FIREWALL',
    title: isTr ? 'Firewall Temel (ICMP Bloke)' : 'Firewall Basic (ICMP Block)',
    description: isTr
      ? 'ICMP (ping) engellenmiş, diğer tüm trafiğe izin verilmiş basit firewall.'
      : 'Simple firewall with ICMP (ping) blocked, all other traffic allowed.',
    detail: isTr
      ? 'Kural 1: DENY ICMP | Kural 2: ALLOW ANY | PC-1 ping BAŞARISIZ, wget BAŞARILI'
      : 'Rule 1: DENY ICMP | Rule 2: ALLOW ANY | PC-1 ping FAIL, wget SUCCESS',
    level: 'basic',
    data: baseProjectData(firewallBasicDevices, firewallBasicConnections, firewallBasicNotes, [])
  };
};

export default example;



