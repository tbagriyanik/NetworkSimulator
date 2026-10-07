'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const QUICK_COMMANDS: Record<string, string[]> = {
  user: [
    'enable',
    'show ip int brief',
    'show version',
    'show ip route',
    'show ip route summary',
    'ping 192.168.1.1',
  ],
  privileged: [
    'conf t',
    'show run',
    'show ip int brief',
    'show ip route',
    'show ip route summary',
    'show interfaces switchport',
    'show mac address-table',
    'show vlan brief',
    'show vlan id 1',
    'wr',
    'disable',
    'exit',
  ],
  config: [
    'interface GigabitEthernet0/1',
    'int fa0/1',
    'vlan 10',
    'ip dhcp pool POOL1',
    'ip route 0.0.0.0 0.0.0.0 ',
    'router ospf 1',
    'hostname ',
    'exit',
    'end',
  ],
  interface: [
    'no shutdown',
    'ip address 192.168.1.1 255.255.255.0',
    'switchport mode access',
    'switchport access vlan 10',
    'switchport mode trunk',
    'exit',
    'end',
  ],
  'config-if-range': ['switchport mode access', 'switchport access vlan 10', 'no shutdown', 'exit', 'end'],
  line: ['password netsim', 'login', 'transport input ssh', 'exit', 'end'],
  vlan: ['name SALES', 'exit', 'end'],
  'router-config': ['network 192.168.1.0 0.0.0.255 area 0', 'passive-interface default', 'exit', 'end'],
  'dhcp-config': ['network 192.168.1.0 255.255.255.0', 'default-router 192.168.1.1', 'dns-server 8.8.8.8', 'exit', 'end'],
  'config-std-nacl': ['permit any', 'deny any', 'exit', 'end'],
  'config-ext-nacl': ['permit ip any any', 'deny ip any any', 'exit', 'end'],
  pc: ['ipconfig', 'ipconfig /all', 'ping 192.168.1.1', 'tracert 192.168.1.1', 'nslookup google.com', 'telnet ', 'ssh ', 'help', 'cls'],
  iot: ['help', 'cls']
};

const COMMAND_HINTS_TR: Record<string, string> = {
  enable: 'Ayrıcalıklı EXEC moduna geçer (#)',
  'conf t': 'Genel Yapılandırma moduna geçer (Global Config)',
  'no shutdown': 'Arayüzü/hattı aktif hale getirir (UP)',
  'show ip int brief': 'Tüm arayüzlerin IP ve durum özetini listeler',
  'show ip route': 'Yönlendirme tablosunu gösterir',
  'show ip route summary': 'Yönlendirme protokollerinin rota sayı özetini gösterir',
  'show interfaces switchport': 'Tüm anahtar portlarının L2/Trunk/Access modlarını listeler',
  'show mac address-table': 'MAC adres tablosunu görüntüler',
  'show vlan brief': 'VLAN ve port eşleştirmelerini listeler',
  'show vlan id 1': 'VLAN 1 detaylarını ve bağlı portları gösterir',
  'show run': 'Çalışan güncel yapılandırmayı görüntüler',
  wr: 'Yapılandırmayı belleğe kaydeder (write memory)',
  'switchport mode trunk': 'Portu çoklu VLAN taşıyan Trunk moduna alır',
  'switchport mode access': 'Portu tek bir VLAN taşıyan Access moduna alır',
  'switchport access vlan 10': 'Portu VLAN 10 grubuna atar',
  'ip address 192.168.1.1 255.255.255.0': 'Arayüze IP adresi ve alt ağ maskesi atar',
  end: 'Doğrudan Ayrıcalıklı EXEC moduna döner (#)',
  exit: 'Bir önceki moda geri döner',
};

const COMMAND_HINTS_EN: Record<string, string> = {
  enable: 'Enter Privileged EXEC mode (#)',
  'conf t': 'Enter Global Configuration mode',
  'no shutdown': 'Enable the network interface (UP)',
  'show ip int brief': 'Display summary of interface IP and status',
  'show ip route': 'Display routing table',
  'show ip route summary': 'Display routing table protocol summary counts',
  'show interfaces switchport': 'Display switchport L2/Trunk/Access details',
  'show mac address-table': 'Display MAC address forwarding table',
  'show vlan brief': 'List VLAN mappings and member ports',
  'show vlan id 1': 'Show VLAN 1 details and assigned ports',
  'show run': 'Display active running configuration',
  wr: 'Save configuration to NVRAM (write memory)',
  'switchport mode trunk': 'Configure port as VLAN Trunk',
  'switchport mode access': 'Configure port as single-VLAN Access',
  'switchport access vlan 10': 'Assign port to VLAN 10',
  'ip address 192.168.1.1 255.255.255.0': 'Assign IP address and subnet mask',
  end: 'Return directly to Privileged EXEC mode (#)',
  exit: 'Exit current configuration mode',
};

interface QuickCommandsBarProps {
  deviceType?: string;
  mode: string;
  isDark: boolean;
  language?: string;
  onRun: (cmd: string) => void;
}

export function QuickCommandsBar({ deviceType, mode, isDark, language = 'tr', onRun }: QuickCommandsBarProps) {
  const commands = deviceType === 'pc'
    ? QUICK_COMMANDS.pc
    : deviceType === 'iot'
      ? QUICK_COMMANDS.iot
      : QUICK_COMMANDS[mode] || [];

  const hints = language === 'tr' ? COMMAND_HINTS_TR : COMMAND_HINTS_EN;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-1 px-1 no-scrollbar items-center">
      <span className="text-[10px] font-mono font-bold opacity-40 uppercase tracking-wider shrink-0 mr-0.5">Quick:</span>
      {commands.map((cmd) => {
        const trimmed = cmd.trim();
        const tooltip = hints[trimmed] || trimmed;

        return (
          <Button
            key={cmd}
            type="button"
            variant="secondary"
            size="sm"
            title={tooltip}
            className={cn(
              "h-6 px-2.5 text-[10px] font-mono font-semibold tracking-tight whitespace-nowrap rounded-md flex-shrink-0 border shadow-xs transition-colors",
              isDark
                ? "bg-secondary-800/90 border-secondary-700/80 text-secondary-300 hover:bg-secondary-700 hover:text-white"
                : "bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRun(cmd);
            }}
          >
            {trimmed}
          </Button>
        );
      })}
    </div>
  );
}