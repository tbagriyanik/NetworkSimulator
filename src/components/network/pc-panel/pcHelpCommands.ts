import type { OutputLine } from './PCPanel.types';

export function handlePcHelpCommand(
  cmd: string,
  args: string[],
  language: string,
  emit: (type: OutputLine['type'], content: string, prompt?: string) => void
): boolean {
  if (cmd !== 'help' && cmd !== '?') return false;

  const isTR = language === 'tr';
  const helpDict: Record<string, string> = isTR ? {
    'IPCONFIG': 'Ağ arayüzlerinin IP, alt ağ maskesi ve ağ geçidi yapılandırmasını gösterir.',
    'PING': 'Hedef IP veya bilgisayara ICMP yankı istekleri göndererek ağ bağlantısını test eder.',
    'TRACERT': 'Hedef adrese giden paketlerin izlediği yönlendirici rotasını görüntüler.',
    'NSLOOKUP': 'DNS sunucusuna bağlanarak alan adı IP adresi karşılığını sorgular.',
    'TELNET': 'Uzak ağ cihazına Telnet protokolü ile terminal bağlantısı kurar.',
    'SSH': 'Uzak ağ cihazına güvenli SSH protokolü ile terminal bağlantısı kurar.',
    'FTP': 'Ağdaki hedef cihaza FTP ile bağlanıp dosya transfer ekranını açar.',
    'NETSTAT': 'Aktif ağ bağlantılarını ve dinlenen port istatistiklerini görüntüler.',
    'NBTSTAT': 'NetBIOS protokol istatistiklerini ve aktif isim tablosunu gösterir.',
    'GETMAC': 'Bilgisayardaki ağ kartlarının MAC (fiziksel) adreslerini görüntüler.',
    'ARP': 'IP-MAC adresi eşleşmelerini içeren ARP önbellek tablosunu gösterir.',
    'CURL': 'Web sunucusundan HTTP isteği göndererek içerik indirir veya görüntüler.',
    'WGET': 'Web sunucusundan dosya veya içerik indirir.',
    'HOSTNAME': 'Bilgisayar adını görüntüler veya yeni bilgisayar adı atar (örn: hostname PC-1).',
    'CD': 'Mevcut dizini gösterir veya değiştirir (örn: cd \\code, cd ..).',
    'DIR': 'Mevcut dizindeki dosya ve klasörlerin listesini görüntüler.',
    'MD': 'Yeni bir klasör/dizin oluşturur.',
    'RD': 'Var olan bir klasörü/dizini siler.',
    'TYPE': 'Metin dosyasının içeriğini ekrana yazdırır.',
    'COPY': 'Dosyayı başka bir konuma veya isimle kopyalar.',
    'MOVE': 'Dosyayı başka bir klasöre taşır.',
    'REN': 'Dosyanın veya klasörün adını değiştirir.',
    'DEL': 'Bir veya daha fazla dosyayı siler.',
    'EDIT': 'Gelişmiş metin düzenleyiciyi açarak dosyayı düzenler.',
    'PYTHON': 'Python betiği çalıştırır veya etkileşimli Python ortamını açar.',
    'VER': 'İşletim sistemi sürüm bilgilerini görüntüler.',
    'CLS': 'Komut satırı ekranındaki tüm yazıları temizler.',
    'EXIT': 'Komut satırı penceresini kapatır.'
  } : {
    'IPCONFIG': 'Displays all current TCP/IP network configuration values.',
    'PING': 'Tests network connectivity to a target IP or hostname using ICMP.',
    'TRACERT': 'Traces the route to a remote target destination.',
    'NSLOOKUP': 'Displays information to diagnose Domain Name System (DNS) infrastructure.',
    'TELNET': 'Connects to a remote network device via Telnet protocol.',
    'SSH': 'Connects securely to a remote network device via SSH.',
    'FTP': 'Connects to remote FTP server and opens file transfer panel.',
    'NETSTAT': 'Displays active TCP connections and listening ports.',
    'NBTSTAT': 'Displays NetBIOS over TCP/IP protocol statistics and name tables.',
    'GETMAC': 'Displays the Media Access Control (MAC) addresses for network adapters.',
    'ARP': 'Displays and modifies the IP-to-Physical address translation tables.',
    'CURL': 'Fetches or displays content from a web server via HTTP requests.',
    'WGET': 'Downloads files or content from a web server.',
    'HOSTNAME': 'Displays or sets the computer hostname (e.g. hostname PC-1).',
    'CD': 'Displays the name of or changes the current directory.',
    'DIR': 'Displays a list of files and subdirectories in a directory.',
    'MD': 'Creates a directory.',
    'RD': 'Removes a directory.',
    'TYPE': 'Displays the contents of a text file.',
    'COPY': 'Copies one or more files to another location.',
    'MOVE': 'Moves one or more files from one directory to another.',
    'REN': 'Renames a file or files.',
    'DEL': 'Deletes one or more files.',
    'EDIT': 'Opens the text editor to create or modify text files.',
    'PYTHON': 'Executes Python scripts or enters interactive Python mode.',
    'VER': 'Displays the OS version information.',
    'CLS': 'Clears the terminal screen.',
    'EXIT': 'Quits the command prompt window.'
  };

  const targetSubCmd = args[0]?.toUpperCase();
  if (targetSubCmd && helpDict[targetSubCmd]) {
    emit('output', `${targetSubCmd}\n  ${helpDict[targetSubCmd]}`);
  } else {
    const header = isTR
      ? `Windows Command Prompt Simülatörü [Sürüm 10.0.19045.3803]\nDesteklenen komutlar ve açıklamaları:\n`
      : `Windows Command Prompt Simulator [Version 10.0.19045.3803]\nSupported commands and descriptions:\n`;
    const lines = Object.entries(helpDict).map(([k, v]) => `  ${k.padEnd(16)} ${v}`);
    emit('output', header + lines.join('\n'));
  }
  return true;
}
