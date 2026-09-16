import { Terminal, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getLinuxCommands(isTR: boolean): CommandDefinition {
  return {
    id: 'linux_commands',
    icon: Terminal,
    title: isTR ? 'Linux Terminal Komutları' : 'Linux Terminal Commands',
    type: 'commands',
    cmds: [
      ['ls [-l] [-la]', isTR ? 'Dizin içeriğini listele (ls -l: detaylı, ls -la: gizli dosyalar)' : 'List directory contents (ls -l: long, ls -la: hidden)'],
      ['pwd', isTR ? 'Mevcut çalışma dizinini göster' : 'Print working directory'],
      ['cd <dizin>', isTR ? 'Dizin değiştir (cd .. bir üst dizin, cd ~ ev dizini)' : 'Change directory (cd .., cd ~)'],
      ['cat <dosya>', isTR ? 'Dosya içeriğini görüntüle' : 'View file content'],
      ['touch <dosya>', isTR ? 'Boş dosya oluştur' : 'Create an empty file'],
      ['mkdir <dizin>', isTR ? 'Yeni klasör/dizin oluştur' : 'Create a new directory'],
      ['rm <dosya>', isTR ? 'Dosya veya klasör sil' : 'Remove file or directory'],
      ['cp <kaynak> <hedef>', isTR ? 'Dosya kopyala' : 'Copy file'],
      ['mv <kaynak> <hedef>', isTR ? 'Dosyayı taşı veya yeniden adlandır' : 'Move or rename file'],
      ['echo "metin" > <dosya>', isTR ? 'Ekrana yazdır veya dosyaya yaz/ekle (>>)' : 'Print text or write/append (>>) to file'],
      ['ifconfig / ip addr', isTR ? 'Ağ arayüzlerini ve IP adreslerini listele' : 'Display network interfaces & IP addresses'],
      ['dhclient eth0', isTR ? 'Linux DHCP adres kiralamasını yenile' : 'Renew the Linux DHCP lease'],
      ['dhclient -r eth0', isTR ? 'Linux DHCP adres kiralamasını bırak' : 'Release the Linux DHCP lease'],
      ['ip route', isTR ? 'Yönlendirme tablosunu görüntüle' : 'Show IP routing table'],
      ['ping <ip/host>', isTR ? 'ICMP ağ bağlantısı testi' : 'Test network connectivity (ICMP)'],
      ['traceroute <ip/host>', isTR ? 'Hedefe giden paket rotasını izle' : 'Trace route to target'],
      ['nslookup <domain>', isTR ? 'DNS sorgulama (alan adı IP karşılığı)' : 'Perform DNS lookup'],
      ['netstat / arp', isTR ? 'Ağ bağlantıları ve ARP tablosu' : 'Network status & ARP table'],
      ['whoami / hostname', isTR ? 'Kullanıcı adı ve bilgisayar adını göster' : 'Print username and system hostname'],
      ['uname -a', isTR ? 'Linux çekirdek ve sistem detaylarını göster' : 'Display Linux kernel and OS details'],
      ['date / uptime', isTR ? 'Sistem saati ve çalışma süresini göster' : 'Display date and system uptime'],
      ['python3 <script.py>', isTR ? 'Python betiği çalıştır' : 'Run Python script'],
      ['clear', isTR ? 'Terminal ekranını temizle' : 'Clear terminal screen'],
      ['help', isTR ? 'Linux dahili komut kılavuzunu göster' : 'Display internal Linux help'],
    ]
  };
}