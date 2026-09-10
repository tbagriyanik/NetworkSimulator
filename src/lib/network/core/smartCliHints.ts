export interface CliHint {
  pattern: RegExp;
  template: string;
  example: string;
  explanation: { tr: string; en: string };
  missingArgs?: string[];
}

export const SMART_CLI_HINTS: CliHint[] = [
  {
    pattern: /^ip\s+address$/i,
    template: 'ip address <IP_ADRESI> <ALT_AG_MASKESI>',
    example: 'ip address 192.168.1.1 255.255.255.0',
    explanation: {
      tr: 'IP adresi ve subnet maskesi birlikte girilmelidir.',
      en: 'Both IP address and subnet mask are required.'
    },
    missingArgs: ['<IP_ADRESI>', '<ALT_AG_MASKESI>']
  },
  {
    pattern: /^ip\s+address\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/i,
    template: 'ip address <IP_ADRESI> <ALT_AG_MASKESI>',
    example: 'ip address 192.168.1.1 255.255.255.0',
    explanation: {
      tr: 'Eksik parametre: Alt ağ maskesi (Subnet Mask) belirtilmelidir.',
      en: 'Incomplete parameter: Subnet mask is required.'
    },
    missingArgs: ['<ALT_AG_MASKESI>']
  },
  {
    pattern: /^ip\s+route$/i,
    template: 'ip route <HEDEF_AG> <ALT_AG_MASKESI> <NEXT_HOP_IP | CIKIS_ARAYUZU>',
    example: 'ip route 192.168.2.0 255.255.255.0 10.0.0.2',
    explanation: {
      tr: 'Statik rota için hedef ağ, maske ve sonraki sekme (Next-hop) IP adresi gereklidir.',
      en: 'Static route requires destination network, mask, and next-hop IP.'
    },
    missingArgs: ['<HEDEF_AG>', '<ALT_AG_MASKESI>', '<NEXT_HOP>']
  },
  {
    pattern: /^ip\s+route\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/i,
    template: 'ip route <HEDEF_AG> <ALT_AG_MASKESI> <NEXT_HOP_IP | CIKIS_ARAYUZU>',
    example: 'ip route 192.168.2.0 255.255.255.0 10.0.0.2',
    explanation: {
      tr: 'Statik rota için sonraki sekme (Next-hop) IP adresi veya çıkış arayüzü gereklidir.',
      en: 'Static route requires next-hop IP address or exit interface.'
    },
    missingArgs: ['<NEXT_HOP_IP | CIKIS_ARAYUZU>']
  },
  {
    pattern: /^router\s+ospf$/i,
    template: 'router ospf <PROCESS_ID>',
    example: 'router ospf 1',
    explanation: {
      tr: 'OSPF yönlendirmesi için 1-65535 arasında bir Process ID belirtilmelidir.',
      en: 'Specify a Process ID (1-65535) for OSPF routing.'
    },
    missingArgs: ['<PROCESS_ID>']
  },
  {
    pattern: /^network$/i,
    template: 'network <IP_BLOGU> <WILDCARD_MASK> area <AREA_ID>',
    example: 'network 192.168.1.0 0.0.0.255 area 0',
    explanation: {
      tr: 'OSPF network komutunda wildcard mask ve area numarası belirtilmelidir.',
      en: 'Specify wildcard mask and area number in OSPF network command.'
    },
    missingArgs: ['<IP_BLOGU>', '<WILDCARD_MASK>', 'area <AREA_ID>']
  },
  {
    pattern: /^switchport\s+mode$/i,
    template: 'switchport mode <access | trunk | dynamic>',
    example: 'switchport mode trunk',
    explanation: {
      tr: 'Switch port modu (access veya trunk) seçilmelidir.',
      en: 'Select switch port mode (access or trunk).'
    },
    missingArgs: ['<access | trunk>']
  },
  {
    pattern: /^switchport\s+access\s+vlan$/i,
    template: 'switchport access vlan <VLAN_ID>',
    example: 'switchport access vlan 10',
    explanation: {
      tr: 'Porta atanacak VLAN ID (1-4094) numarası girilmelidir.',
      en: 'Specify VLAN ID (1-4094) for this access port.'
    },
    missingArgs: ['<VLAN_ID>']
  },
  {
    pattern: /^interface$/i,
    template: 'interface <ARAYUZ_ADI> (örn: FastEthernet0/1, GigabitEthernet0/0)',
    example: 'interface GigabitEthernet0/0',
    explanation: {
      tr: 'Yapılandırılacak arayüz adı ve port numarası belirtilmelidir.',
      en: 'Specify interface name and number to configure.'
    },
    missingArgs: ['<INTERFACE_NAME>']
  },
  {
    pattern: /^encapsulation\s+dot1q$/i,
    template: 'encapsulation dot1Q <VLAN_ID>',
    example: 'encapsulation dot1Q 10',
    explanation: {
      tr: 'Router sub-interface için 802.1Q VLAN etiket numarası girilmelidir.',
      en: 'Specify 802.1Q VLAN ID for router sub-interface.'
    },
    missingArgs: ['<VLAN_ID>']
  }
];

export function getSmartCliHint(input: string): CliHint | null {
  const trimmed = input.trim();
  for (const hint of SMART_CLI_HINTS) {
    if (hint.pattern.test(trimmed)) {
      return hint;
    }
  }
  return null;
}
