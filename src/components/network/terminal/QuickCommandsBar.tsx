'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const QUICK_COMMANDS: Record<string, string[]> = {
  user: ['enable', 'show ip int brief', 'show version', 'show ip route', 'ping 192.168.1.1'],
  privileged: ['conf t', 'show run', 'show ip int brief', 'show ip route', 'show mac address-table', 'show vlan brief', 'wr', 'disable', 'exit'],
  config: ['interface GigabitEthernet0/1', 'int fa0/1', 'vlan 10', 'ip dhcp pool POOL1', 'ip route 0.0.0.0 0.0.0.0 ', 'router ospf 1', 'hostname ', 'exit', 'end'],
  interface: ['no shutdown', 'ip address 192.168.1.1 255.255.255.0', 'switchport mode access', 'switchport access vlan 10', 'switchport mode trunk', 'exit', 'end'],
  'config-if-range': ['switchport mode access', 'switchport access vlan 10', 'no shutdown', 'exit', 'end'],
  line: ['password cisco', 'login', 'transport input ssh', 'exit', 'end'],
  vlan: ['name SALES', 'exit', 'end'],
  'router-config': ['network 192.168.1.0 0.0.0.255 area 0', 'passive-interface default', 'exit', 'end'],
  'dhcp-config': ['network 192.168.1.0 255.255.255.0', 'default-router 192.168.1.1', 'dns-server 8.8.8.8', 'exit', 'end'],
  'config-std-nacl': ['permit any', 'deny any', 'exit', 'end'],
  'config-ext-nacl': ['permit ip any any', 'deny ip any any', 'exit', 'end'],
  pc: ['ipconfig', 'ipconfig /all', 'ping 192.168.1.1', 'tracert 192.168.1.1', 'nslookup google.com', 'telnet ', 'ssh ', 'help', 'cls'],
  iot: ['help', 'cls']
};

interface QuickCommandsBarProps {
  deviceType?: string;
  mode: string;
  isDark: boolean;
  onRun: (cmd: string) => void;
}

export function QuickCommandsBar({ deviceType, mode, isDark, onRun }: QuickCommandsBarProps) {
  const commands = deviceType === 'pc'
    ? QUICK_COMMANDS.pc
    : deviceType === 'iot'
      ? QUICK_COMMANDS.iot
      : QUICK_COMMANDS[mode] || [];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-1 px-1 no-scrollbar items-center">
      <span className="text-[10px] font-mono font-bold opacity-40 uppercase tracking-wider shrink-0 mr-0.5">Quick:</span>
      {commands.map((cmd) => {
        const trimmed = cmd.trim();
        let tooltip = trimmed;
        if (trimmed === 'enable') tooltip = 'Ayrıcalıklı EXEC moduna geçer (Privileged EXEC)';
        else if (trimmed === 'conf t') tooltip = 'Genel Yapılandırma moduna geçer (Global Config)';
        else if (trimmed === 'no shutdown') tooltip = 'Bağlantı noktasını / arayüzü aktif hale getirir (UP)';
        else if (trimmed.startsWith('ip address')) tooltip = 'Arayüze IP adresi ve alt ağ maskesi atar';
        else if (trimmed.startsWith('switchport access vlan')) tooltip = 'Portu belirtilen VLAN grubuna bağlar';
        else if (trimmed === 'switchport mode trunk') tooltip = 'Portu tüm VLAN paketlerini taşıyan Trunk moduna alır';
        else if (trimmed === 'show ip int brief') tooltip = 'Tüm arayüzlerin IP ve UP/DOWN durum özetini listeler';
        else if (trimmed === 'show run') tooltip = 'Çalışan güncel sistem yapılandırmasını görüntüler';
        else if (trimmed === 'wr') tooltip = 'Yapılandırmayı kalıcı hafızaya kaydeder (write memory)';

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