import { Server, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getPrivilegedCommands(isTR: boolean): CommandDefinition {
  return {
    id: 'privileged',
    icon: Server,
    title: isTR ? 'Privileged EXEC' : 'Privileged EXEC',
    type: 'commands',
    cmds: [
      ['ping <host> [s] [c]', isTR ? 'Bağlantı testi (ICMP)' : 'Ping host (ICMP)', '#'],
      ['traceroute <host>', isTR ? 'Rota izleme' : 'Trace route', '#'],
      ['clock set <hh:mm:ss> <day> <month> <year>', isTR ? 'Sistem saatini ayarla' : 'Set system clock', '#'],
      ['telnet <host> [port]', isTR ? 'Telnet bağlantısı' : 'Telnet connection', '#'],
      ['ssh [-l user] <host>', isTR ? 'SSH bağlantısı' : 'SSH connection', '#'],
      ['write memory', isTR ? 'Yapılandırmayı kaydet' : 'Save configuration', '#'],
      ['copy running-config startup-config', isTR ? 'Yapılandırmayı kaydet' : 'Save config', '#'],
      ['copy running-config flash:', isTR ? 'Flash\'a kaydet' : 'Save to flash', '#'],
      ['copy flash: startup-config', isTR ? 'Flash\'tan geri yükle' : 'Restore from flash', '#'],
      ['delete flash:vlan.dat', isTR ? 'VLAN veritabanı sil' : 'Delete VLAN database', '#'],
      ['erase startup-config', isTR ? 'Startup config sil' : 'Erase startup config', '#'],
      ['erase nvram', isTR ? 'NVRAM dosya sistemini sil' : 'Erase NVRAM', '#'],
      ['reload', isTR ? 'Cihazı yeniden yükle' : 'Reload device', '#'],
      ['ip route <n> <mask> <h>', isTR ? 'Statik rota ekle' : 'Add static route', '#'],
      ['no ip route <n> <mask> <h>', isTR ? 'Statik rotayı sil' : 'Remove static route', '#'],
      ['debug <type>', isTR ? 'Hata ayıklamayı aç' : 'Enable debugging', '#'],
      ['undebug all', isTR ? 'Tüm hataları kapat' : 'Disable all debugging', '#'],
      ['terminal length <0-512>', isTR ? 'Terminal satır uzunluğu' : 'Set terminal length', '#'],
      ['clear arp-cache', isTR ? 'ARP önbelleğini sil' : 'Clear ARP cache', '#'],
      ['clear mac address-table', isTR ? 'MAC tablosunu sil' : 'Clear MAC table', '#'],
      ['clear counters', isTR ? 'Sayaçları sıfırla' : 'Clear counters', '#'],
      ['do <command>', isTR ? 'Ayrıcalıklı komut çalıştır' : 'Execute privileged command', '(config)#'],
      ['more <file>', isTR ? 'Dosya içeriğini göster' : 'Display file contents', '#'],
      ['setup', isTR ? 'Kurulum sihirbazı' : 'Setup wizard', '#'],
      ['test', isTR ? 'Tanılama testi' : 'Diagnostic test', '#'],
      ['disconnect <session>', isTR ? 'Oturumu kes' : 'Disconnect session', '#'],
      ['resume <session>', isTR ? 'Oturuma devam et' : 'Resume session', '#'],
      ['suspend', isTR ? 'Oturumu askıya al' : 'Suspend session', '#'],
      ['copy running-config tftp:', isTR ? 'TFTP\'ye yapılandırma gönder' : 'Copy config to TFTP', '#'],
      ['copy tftp: running-config', isTR ? 'TFTP\'den yapılandırma al' : 'Restore config from TFTP', '#'],
      ['copy startup-config running-config', isTR ? 'Startup config\'u çalıştır' : 'Merge startup to running', '#'],
      ['copy tftp: flash:', isTR ? 'TFTP\'den nOS yükle' : 'Copy nOS from TFTP', '#'],
      ['clear line <n>', isTR ? 'Hattı sıfırla' : 'Clear line', '#'],
      ['clear interface <type/n>', isTR ? 'Arayüz sayaçlarını sıfırla' : 'Clear interface counters', '#'],
      ['terminal monitor', isTR ? 'Log mesajlarını görüntüle' : 'Monitor log messages', '#'],
      ['terminal no monitor', isTR ? 'Log görüntülemeyi kapat' : 'Stop monitoring logs', '#'],
      ['terminal width <n>', isTR ? 'Terminal genişliği' : 'Set terminal width', '#'],
      ['show network health', isTR ? 'Kapsamlı ağ sağlık denetimi raporu' : 'Comprehensive network health audit report', '#'],
      ['netconf <hello|get|edit-config|close-session>', isTR ? 'sim-only: Simüle NETCONF RFC 6241 tarzı kontrol düzlemi oturumu' : 'sim-only: Simulated NETCONF RFC 6241-style control-plane session', '#'],
      ['show netconf sessions', isTR ? 'Aktif NETCONF oturum durumlarını göster' : 'Show active NETCONF sessions', '#'],
      ['mqtt <connect|subscribe|publish>', isTR ? 'sim-only: Simüle MQTT istemci ve konu yönetimi; harici broker yoktur' : 'sim-only: Simulated MQTT client and topic management; no external broker', '#'],
      ['show mqtt <clients|topics>', isTR ? 'MQTT bağlı istemciler ve abonelikler' : 'Show MQTT clients and topic subscriptions', '#'],
      ['coap <get|put|delete>', isTR ? 'sim-only: Simüle CoAP kaynak işlemleri; harici UDP endpoint yoktur' : 'sim-only: Simulated CoAP resource operations; no external UDP endpoint', '#'],
      ['show coap resources', isTR ? 'CoAP kaynak envanteri ve durumları' : 'Show CoAP resource inventory', '#'],
    ]
  };
}
