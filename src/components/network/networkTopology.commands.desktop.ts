import { Terminal, LucideIcon } from 'lucide-react';

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
      icon: Terminal,
      title: isTR ? 'Masaüstü Bilgisayar' : 'Desktop Computer',
      type: 'commands',
      cmds: [
        ['ipconfig [/all] [/release] [/renew]', isTR ? 'IP yapılandırması' : 'IP configuration'],
        ['ping <host>', isTR ? 'Bağlantı testi' : 'Test connectivity'],
        ['tracert <host>', isTR ? 'Rota izleme' : 'Trace route'],
        ['netstat', isTR ? 'Ağ istatistikleri' : 'Network statistics'],
        ['nslookup <domain>', isTR ? 'DNS sorgusu' : 'DNS lookup'],
        ['ftp <host>', isTR ? 'FTP bağlantısı' : 'FTP connection'],
        ['telnet <host> [port]', isTR ? 'Telnet bağlantısı' : 'Telnet connection'],
        ['ssh [-l user] <host>', isTR ? 'SSH bağlantısı' : 'SSH connection'],
        ['curl <url>', isTR ? 'Web sayfası içeriğini al (cURL)' : 'Fetch web content (cURL)'],
        ['wget <url>', isTR ? 'Web sayfasını indir / görüntüle (Wget)' : 'Download / view web page (Wget)'],
        ['hostname', isTR ? 'Bilgisayar adı' : 'Computer name'],
        ['dir', isTR ? 'Dosya listesi' : 'Directory listing'],
        ['type <file>', isTR ? 'Dosya içeriğini görüntüle' : 'Display file content'],
        ['copy <src> <dest>', isTR ? 'Dosya kopyala' : 'Copy file'],
        ['move <src> <dest>', isTR ? 'Dosya/klasör taşı' : 'Move file or directory'],
        ['ren <old> <new>', isTR ? 'Yeniden adlandır' : 'Rename file or directory'],
        ['ver', isTR ? 'Versiyon bilgisi' : 'Version info'],
        ['cls', isTR ? 'Ekranı temizle' : 'Clear screen'],
        ['help / ?', isTR ? 'PC komut yardımı' : 'Desktop command help'],
      ]
    },
    {
      id: 'python-commands',
      icon: Terminal,
      title: isTR ? 'Python Yorumlayıcısı & Komutlar' : 'Python Interpreter & Commands',
      type: 'commands',
      cmds: [
        ['python <script.py> [args]', isTR ? 'Python betik dosyasını çalıştır' : 'Run Python script file'],
        ['python -c "<code>"', isTR ? 'Tek satırlık Python kodu çalıştır' : 'Execute inline Python code'],
        ['python', isTR ? 'İnteraktif Python kabuğunu (REPL) başlat' : 'Start interactive Python REPL shell'],
        ['open(file, mode)', isTR ? 'Sanal dosya sisteminde dosya aç (r, w, a, r+)' : 'Open file in virtual filesystem (r, w, a, r+)'],
        ['f.read() / f.write() / f.close()', isTR ? 'Dosya içeriği oku, yaz ve kapat' : 'Read, write and close file stream'],
        ['print(value, ...)', isTR ? 'Ekrana metin/değer yazdır' : 'Print text/value to stdout'],
        ['input([prompt])', isTR ? 'Kullanıcıdan metin girdisi oku' : 'Read input from user'],
        ['len(sequence)', isTR ? 'Dizi/liste/metin uzunluğunu al' : 'Get sequence/list/string length'],
        ['type(object)', isTR ? 'Nesnenin veri tipini döndür' : 'Return data type of object'],
        ['range([start], stop, [step])', isTR ? 'Sayı dizisi üretecini oluştur' : 'Create sequence generator'],
        ['int() / float() / str() / bool()', isTR ? 'Veri tipi dönüştürme fonksiyonları' : 'Data type casting functions'],
        ['list() / dict() / set() / tuple()', isTR ? 'Koleksiyon dönüştürme fonksiyonları' : 'Collection casting functions'],
        ['sum() / min() / max() / abs()', isTR ? 'Matematiksel dâhilî fonksiyonlar' : 'Built-in math utility functions'],
        ['sorted(iterable) / reversed(seq)', isTR ? 'Sıralama ve tersine çevirme' : 'Sorting and reversing iterables'],
        ['import json / math / sys / os / socket', isTR ? 'Dâhilî Python modüllerini içe aktar' : 'Import built-in Python modules'],
        ['exit() / quit()', isTR ? 'İnteraktif REPL kabuğundan çık' : 'Exit interactive REPL shell'],
      ]
    },
  ];
}
