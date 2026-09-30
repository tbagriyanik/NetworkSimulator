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
        ['ipconfig /flushdns', isTR ? 'DNS önbelleğini temizle' : 'Flush DNS resolver cache'],
        ['ipconfig /displaydns', isTR ? 'DNS önbelleğini görüntüle' : 'Display DNS resolver cache'],
        ['ping <ip> [-t] [-n c]', isTR ? 'Bağlantı testi (ICMP)' : 'Connection test (ICMP)'],
        ['tracert <ip>', isTR ? 'Rota izleme (Hop-by-hop)' : 'Trace route'],
        ['nslookup <domain>', isTR ? 'DNS sorgulama' : 'DNS lookup'],
        ['netstat -an', isTR ? 'Ağ bağlantıları ve portlar' : 'Network connections and ports'],
        ['arp -a', isTR ? 'ARP tablosunu listele' : 'List ARP table'],
        ['nbtstat -n', isTR ? 'NetBIOS isim tablosu' : 'NetBIOS local name table'],
        ['curl <url> / wget <url>', isTR ? 'Web/HTTP içeriği getir' : 'Fetch HTTP web content'],
        ['copy / move / ren', isTR ? 'Dosya kopyalama, taşıma, adlandırma' : 'File copy, move, rename'],
        ['type <file>', isTR ? 'Metin dosyası içeriğini göster' : 'Display text file content'],
        ['script.bat / call <bat>', isTR ? 'Batch yığın dosyasını çalıştır' : 'Execute batch script file'],
      ]
    },
    {
      id: 'python',
      icon: Terminal,
      title: isTR ? 'Python Komutları' : 'Python Commands',
      type: 'commands',
      cmds: [
        ['python <file.py>', isTR ? 'Python script çalıştır' : 'Run Python script'],
        ['python -c "code"', isTR ? 'Python kodu doğrudan çalıştır' : 'Execute Python code directly'],
        ['python', isTR ? 'Etkileşimli Python (REPL) başlat' : 'Launch interactive Python REPL'],
        ['import socket', isTR ? 'Soket ağ programlama simülasyonu' : 'Socket network programming'],
        ['import tkinter / form', isTR ? 'Görsel GUI pencereli form motoru' : 'Visual GUI form window engine'],
        ['import audio / synth', isTR ? 'Web Audio nota & müzik sentezleme' : 'Web Audio note & synth engine'],
        ['import scene3d', isTR ? 'İnteraktif 3D sahne & katı modelleme' : 'Interactive 3D scene & CSG modeler'],
        ['open("log.txt", "w")', isTR ? 'Sanal dosya okuma / yazma I/O' : 'Virtual file I/O operations'],
        ['class Device / @property', isTR ? 'OOP & decorator desteği' : 'OOP & decorator support'],
        ['yield / generator', isTR ? 'Lazy generator döngüleri' : 'Lazy generator loops'],
      ]
    }
  ];
}