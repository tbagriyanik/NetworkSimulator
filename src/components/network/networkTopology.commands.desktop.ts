import { Monitor, Terminal, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getDesktopCommands(isTR: boolean): CommandDefinition[] {
  return [
    {
      id: 'desktop',
      icon: Monitor,
      title: isTR ? 'Masaüstü Komutları' : 'Desktop Commands',
      type: 'commands',
      cmds: [
        ['ipconfig', isTR ? 'IP yapılandırmasını göster' : 'Show IP configuration'],
        ['ipconfig /all', isTR ? 'Detaylı IP bilgisi' : 'Detailed IP information'],
        ['ipconfig /release', isTR ? 'IP adresini bırak' : 'Release IP address'],
        ['ipconfig /renew', isTR ? 'IP adresini yenile' : 'Renew IP address'],
        ['ping <ip>', isTR ? 'Bağlantı testi' : 'Connection test'],
        ['tracert <ip>', isTR ? 'Rota izleme' : 'Trace route'],
        ['nslookup <domain>', isTR ? 'DNS sorgulama' : 'DNS lookup'],
        ['netstat -an', isTR ? 'Ağ bağlantıları' : 'Network connections'],
        ['arp -a', isTR ? 'ARP tablosu' : 'ARP table'],
      ]
    },
    {
      id: 'python',
      icon: Terminal,
      title: isTR ? 'Python Komutları' : 'Python Commands',
      type: 'commands',
      cmds: [
        ['python3 <file.py>', isTR ? 'Python script çalıştır' : 'Run Python script'],
        ['python3 -c "code"', isTR ? 'Python kodu çalıştır' : 'Execute Python code'],
        ['import socket', isTR ? 'Socket modülü içe aktar' : 'Import socket module'],
        ['import requests', isTR ? 'Requests modülü içe aktar' : 'Import requests module'],
        ['print("Hello")', isTR ? 'Ekrana yazdır' : 'Print to screen'],
        ['input("Name: ")', isTR ? 'Kullanıcı girişi al' : 'Get user input'],
      ]
    }
  ];
}