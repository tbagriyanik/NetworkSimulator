export interface SdnQuizQuestion {
  id: string;
  question: { tr: string; en: string } | string;
  choices: { tr: string[]; en: string[] } | string[];
  answer: number;
  explanation: { tr: string; en: string } | string;
  points?: number;
}

export const lessonQuizzes: Record<string, SdnQuizQuestion[]> = {
  pcCmd: [
    {
      id: 'pccmd-1',
      question: {
        tr: 'ipconfig komutunun temel işlevi nedir?',
        en: 'What is the main function of the ipconfig command?'
      },
      choices: {
        tr: [
          'Bilgisayarın IP adresi, alt ağ maskesi ve geçit bilgilerini görüntülemek',
          'Switch konsoluna bağlanmak',
          'Bilgisayarın adını değiştirmek'
        ],
        en: [
          'View computer IP address, subnet mask and gateway information',
          'Connect to Switch console',
          'Change computer hostname'
        ]
      },
      answer: 0,
      explanation: {
        tr: 'ipconfig, ağ bağdaştırıcısının IP yapılandırma detaylarını gösterir.',
        en: 'ipconfig shows network adapter IP configuration details.'
      },
      points: 10
    },
    {
      id: 'pccmd-2',
      question: {
        tr: 'Terminalde kullanılabilecek tüm komutları listelemek için hangisi yazılır?',
        en: 'Which command lists all available terminal commands?'
      },
      choices: {
        tr: ['help', 'show all', 'list'],
        en: ['help', 'show all', 'list']
      },
      answer: 0,
      explanation: {
        tr: 'Komut satırında "help" yazarak tüm geçerli komutlar listelenebilir.',
        en: 'Type "help" in the command prompt to list all valid commands.'
      },
      points: 10
    },
    {
      id: 'pccmd-3',
      question: {
        tr: 'Ağ erişilebilirliğini IP adresiyle test eden komut hangisidir?',
        en: 'Which command tests network reachability to an IP address?'
      },
      choices: {
        tr: ['ping', 'connect', 'tracert'],
        en: ['ping', 'connect', 'tracert']
      },
      answer: 0,
      explanation: {
        tr: 'ping komutu ICMP yankı istekleri göndererek erişilebilirliği test eder.',
        en: 'ping sends ICMP echo requests to test reachability.'
      },
      points: 10
    }
  ],

  basicSwitch: [
    {
      id: 'basicswitch-1',
      question: {
        tr: 'Switch üzerinde yetkili moda (Privileged EXEC) geçmek için hangi komut kullanılır?',
        en: 'Which command is used to enter Privileged EXEC mode on a switch?'
      },
      choices: {
        tr: ['enable', 'configure terminal', 'login'],
        en: ['enable', 'configure terminal', 'login']
      },
      answer: 0,
      explanation: {
        tr: '"enable" komutu kullanıcı modundan yetkili moda geçiş sağlar.',
        en: '"enable" command elevates access from user to privileged mode.'
      },
      points: 10
    },
    {
      id: 'basicswitch-2',
      question: {
        tr: 'Switch cihazına isim vermek için hangi komut kullanılır?',
        en: 'Which command sets the device hostname on a switch?'
      },
      choices: {
        tr: ['hostname <İSİM>', 'name <İSİM>', 'device-name <İSİM>'],
        en: ['hostname <NAME>', 'name <NAME>', 'device-name <NAME>']
      },
      answer: 0,
      explanation: {
        tr: 'Global konfigürasyon modunda "hostname" komutu cihaz adını belirler.',
        en: 'In global config mode, "hostname" command sets the device name.'
      },
      points: 10
    },
    {
      id: 'basicswitch-3',
      question: {
        tr: 'Yapılandırmaları başlangıç hafızasına (NVRAM) kaydetmek için hangi komut kullanılır?',
        en: 'Which command saves running config to NVRAM?'
      },
      choices: {
        tr: ['write memory', 'save config', 'store nvram'],
        en: ['write memory', 'save config', 'store nvram']
      },
      answer: 0,
      explanation: {
        tr: '"write memory" veya "copy running-config startup-config" ayarları kalıcı yapar.',
        en: '"write memory" or "copy running-config startup-config" persists changes.'
      },
      points: 10
    }
  ],

  vlan: [
    {
      id: 'vlan-1',
      question: {
        tr: 'Sanal Yerel Ağ (VLAN) oluşturmanın temel amacı nedir?',
        en: 'What is the main purpose of creating a Virtual LAN (VLAN)?'
      },
      choices: {
        tr: [
          'Ağ trafiğini izole etmek ve yayın (broadcast) alanlarını bölmek',
          'Kablo hızını 10 katına çıkarmak',
          'IP adreslerini otomatik atamak'
        ],
        en: [
          'Isolate network traffic and segment broadcast domains',
          'Multiply cable speed by 10',
          'Automatically assign IP addresses'
        ]
      },
      answer: 0,
      explanation: {
        tr: 'VLAN broadcast etki alanlarını küçülterek güvenlik ve performans sağlar.',
        en: 'VLAN reduces broadcast domains for better security and performance.'
      },
      points: 10
    },
    {
      id: 'vlan-2',
      question: {
        tr: 'Bir switch portunu belirli bir VLAN\'a atamak için hangi komut kullanılır?',
        en: 'Which command assigns a switchport to a specific VLAN?'
      },
      choices: {
        tr: ['switchport access vlan <ID>', 'vlan assign <ID>', 'port vlan <ID>'],
        en: ['switchport access vlan <ID>', 'vlan assign <ID>', 'port vlan <ID>']
      },
      answer: 0,
      explanation: {
        tr: 'Arayüz altında "switchport access vlan X" komutu ile port VLAN\'a bağlanır.',
        en: 'Under interface, "switchport access vlan X" binds the port to VLAN.'
      },
      points: 10
    },
    {
      id: 'vlan-3',
      question: {
        tr: 'Birden fazla VLAN trafiğini tek bir fiziksel hat üzerinden taşımak için hangi port modu kullanılır?',
        en: 'Which port mode carries multiple VLAN traffic over a single link?'
      },
      choices: {
        tr: ['switchport mode trunk', 'switchport mode access', 'switchport mode dynamic'],
        en: ['switchport mode trunk', 'switchport mode access', 'switchport mode dynamic']
      },
      answer: 0,
      explanation: {
        tr: 'Trunk modu, etiketli (802.1Q) paketlerle çoklu VLAN trafiği taşır.',
        en: 'Trunk mode carries tagged (802.1Q) multi-VLAN traffic.'
      },
      points: 10
    }
  ],

  routerDhcp: [
    {
      id: 'routerdhcp-1',
      question: {
        tr: 'Router üzerinde otomatik IP dağıtacak bir DHCP havuzu nasıl başlatılır?',
        en: 'How do you create a DHCP pool on a router?'
      },
      choices: {
        tr: ['ip dhcp pool <HAVUZ_ADI>', 'dhcp server enable', 'service dhcp start'],
        en: ['ip dhcp pool <POOL_NAME>', 'dhcp server enable', 'service dhcp start']
      },
      answer: 0,
      explanation: {
        tr: '"ip dhcp pool <AD>" komutu ile DHCP konfigürasyon moduna geçilir.',
        en: '"ip dhcp pool <NAME>" enters DHCP configuration mode.'
      },
      points: 10
    },
    {
      id: 'routerdhcp-2',
      question: {
        tr: 'DHCP istemcilerine varsayılan geçit (default gateway) adresini tanımlamak için hangi komut kullanılır?',
        en: 'Which command defines default gateway for DHCP clients?'
      },
      choices: {
        tr: ['default-router <IP>', 'gateway-ip <IP>', 'router-address <IP>'],
        en: ['default-router <IP>', 'gateway-ip <IP>', 'router-address <IP>']
      },
      answer: 0,
      explanation: {
        tr: 'DHCP havuzu içinde "default-router" komutu istemcilere gateway bilgisini verir.',
        en: 'Inside DHCP pool, "default-router" specifies gateway IP to clients.'
      },
      points: 10
    },
    {
      id: 'routerdhcp-3',
      question: {
        tr: 'Bir Router arayüzüne IP adresi atadıktan sonra arayüzü aktif etmek için hangi komut yazılmalıdır?',
        en: 'Which command enables a router interface after assigning an IP?'
      },
      choices: {
        tr: ['no shutdown', 'enable interface', 'start port'],
        en: ['no shutdown', 'enable interface', 'start port']
      },
      answer: 0,
      explanation: {
        tr: 'Arayüzler varsayılan olarak kapalıdır; "no shutdown" ile açılır.',
        en: 'Interfaces are shutdown by default; "no shutdown" enables them.'
      },
      points: 10
    }
  ],

  staticRouting: [
    {
      id: 'staticrouting-1',
      question: {
        tr: 'Statik rota tanımlamasında ip route komutundan sonra hangi sıra izlenmelidir?',
        en: 'What is the correct syntax order for ip route command?'
      },
      choices: {
        tr: [
          'ip route <Hedef Ağ IP> <Subnet Mask> <Sonraki Sıçrama IP/Arayüz>',
          'ip route <Sonraki Sıçrama IP> <Hedef Ağ IP> <Subnet Mask>',
          'ip route <Subnet Mask> <Hedef Ağ IP> <Sonraki Sıçrama IP>'
        ],
        en: [
          'ip route <Destination Net> <Subnet Mask> <Next Hop IP/Interface>',
          'ip route <Next Hop IP> <Destination Net> <Subnet Mask>',
          'ip route <Subnet Mask> <Destination Net> <Next Hop IP>'
        ]
      },
      answer: 0,
      explanation: {
        tr: 'Statik rotalar Hedef IP, Ağ Maskesi ve Sonraki Sıçrama sırasıyla tanımlanır.',
        en: 'Static routes follow Destination IP, Subnet Mask, and Next Hop order.'
      },
      points: 10
    },
    {
      id: 'staticrouting-2',
      question: {
        tr: 'Bilinmeyen tüm paketleri belirli bir yönlendiriciye ileten 0.0.0.0 0.0.0.0 rotasına ne ad verilir?',
        en: 'What is the 0.0.0.0 0.0.0.0 route called?'
      },
      choices: {
        tr: ['Varsayılan Rota (Default Route)', 'Dinamik Rota', 'Yerel Rota'],
        en: ['Default Route', 'Dynamic Route', 'Local Route']
      },
      answer: 0,
      explanation: {
        tr: '0.0.0.0 0.0.0.0 yönlendirme tablosunda eşleşmeyen tüm paketleri yakalar.',
        en: '0.0.0.0 0.0.0.0 matches all unmatched destination traffic.'
      },
      points: 10
    },
    {
      id: 'staticrouting-3',
      question: {
        tr: 'Doğrudan bağlı arayüz üzerinden tanımlanan bir statik rotanın Yönetimsel Mesafesi (Administrative Distance - AD) kaçtır?',
        en: 'What is the Administrative Distance (AD) of a directly connected static route?'
      },
      choices: {
        tr: ['1 (veya çıkış arayüzü ile 0/1)', '110', '90'],
        en: ['1 (or 0/1 with exit interface)', '110', '90']
      },
      answer: 0,
      explanation: {
        tr: 'Statik rotaların varsayılan AD değeri 1\'dir.',
        en: 'Static routes have a default Administrative Distance of 1.'
      },
      points: 10
    }
  ],

  portSecurity: [
    {
      id: 'portsecurity-1',
      question: {
        tr: 'Port Security özelliğinde öğrenilen MAC adreslerinin kaydedilmesi için hangi komut kullanılır?',
        en: 'Which command saves sticky learned MAC addresses in port security?'
      },
      choices: {
        tr: ['switchport port-security mac-address sticky', 'mac-address save', 'sticky mac enable'],
        en: ['switchport port-security mac-address sticky', 'mac-address save', 'sticky mac enable']
      },
      answer: 0,
      explanation: {
        tr: '"sticky" parametresi öğrenilen MAC adresini çalışan konfigürasyona ekler.',
        en: '"sticky" parameter appends learned MAC addresses to running-config.'
      },
      points: 10
    },
    {
      id: 'portsecurity-2',
      question: {
        tr: 'Güvenlik ihlali (violation) durumunda varsayılan mod hangisidir?',
        en: 'What is the default port security violation mode?'
      },
      choices: {
        tr: ['shutdown', 'protect', 'restrict'],
        en: ['shutdown', 'protect', 'restrict']
      },
      answer: 0,
      explanation: {
        tr: 'Varsayılan olarak ihlal durumunda port "err-disable" durumuna geçerek kapanır.',
        en: 'By default, violation causes the port to shut down into err-disabled state.'
      },
      points: 10
    },
    {
      id: 'portsecurity-3',
      question: {
        tr: 'Bir porta bağlanabilecek maksimum MAC adresi sayısı hangi komutla belirlenir?',
        en: 'Which command limits the maximum number of MAC addresses allowed on a port?'
      },
      choices: {
        tr: ['switchport port-security maximum <SAYI>', 'port mac-limit <SAYI>', 'security limit <SAYI>'],
        en: ['switchport port-security maximum <NUMBER>', 'port mac-limit <NUMBER>', 'security limit <NUMBER>']
      },
      answer: 0,
      explanation: {
        tr: '"switchport port-security maximum N" komutu portta izin verilen maksimum MAC sayısını sınırlar.',
        en: '"switchport port-security maximum N" sets the allowed MAC limit on a port.'
      },
      points: 10
    }
  ],

  ripRouting: [
    {
      id: 'riprouting-1',
      question: {
        tr: 'RIP yönlendirme protokolünde yol seçim metriği olarak ne kullanılır?',
        en: 'What metric is used by RIP routing protocol?'
      },
      choices: {
        tr: ['Sıçrama Sayısı (Hop Count)', 'Bant Genişliği (Bandwidth)', 'Gecikme (Delay)'],
        en: ['Hop Count', 'Bandwidth', 'Delay']
      },
      answer: 0,
      explanation: {
        tr: 'RIP protokolü paketlerin geçtiği router (sıçrama) sayısını metrik alır.',
        en: 'RIP uses the number of router hops as its metric.'
      },
      points: 10
    },
    {
      id: 'riprouting-2',
      question: {
        tr: 'RIPv2 protokolünün RIPv1\'den temel farkı nedir?',
        en: 'What is the key advantage of RIPv2 over RIPv1?'
      },
      choices: {
        tr: ['Classless / VLSM ve alt ağ maskesi desteği', 'Sınırsız sıçrama sayısı', 'Bant genişliği ölçümü'],
        en: ['Classless / VLSM subnet mask support', 'Unlimited hop count', 'Bandwidth measurement']
      },
      answer: 0,
      explanation: {
        tr: 'RIPv2 yönlendirme güncellemelerinde alt ağ maskesini (VLSM) gönderir.',
        en: 'RIPv2 carries subnet mask (VLSM) information in updates.'
      },
      points: 10
    },
    {
      id: 'riprouting-3',
      question: {
        tr: 'RIP protokolünde bir hedefin erişilemez (unreachable) kabul edildiği maksimum sıçrama sayısı kaçtır?',
        en: 'What is the maximum hop count in RIP after which a network is considered unreachable?'
      },
      choices: {
        tr: ['16 (Maksimum geçerli 15)', '255', '100'],
        en: ['16 (Max valid is 15)', '255', '100']
      },
      answer: 0,
      explanation: {
        tr: 'RIP maksimum 15 sıçramaya kadar çalışır; 16 sıçrama erişilemez sayılır.',
        en: 'RIP supports up to 15 hops; 16 hops is considered infinite and unreachable.'
      },
      points: 10
    }
  ],

  services: [
    {
      id: 'services-1',
      question: {
        tr: 'Ağda alan adlarını (örn. lab.com) IP adreslerine dönüştüren servis hangisidir?',
        en: 'Which service resolves domain names to IP addresses?'
      },
      choices: {
        tr: ['DNS (Domain Name System)', 'HTTP (Hypertext Transfer Protocol)', 'DHCP'],
        en: ['DNS (Domain Name System)', 'HTTP (Hypertext Transfer Protocol)', 'DHCP']
      },
      answer: 0,
      explanation: {
        tr: 'DNS servisi alan adları ile IP adresleri arasındaki eşleşmeyi sağlar.',
        en: 'DNS maps human-readable domain names to numeric IP addresses.'
      },
      points: 10
    },
    {
      id: 'services-2',
      question: {
        tr: 'Web sayfalarının tarayıcılarda güvenli olarak sunulmasını sağlayan protokol ve port hangisidir?',
        en: 'Which protocol and port securely serves web pages to browsers?'
      },
      choices: {
        tr: ['HTTPS (Port 443)', 'HTTP (Port 80)', 'FTP (Port 21)'],
        en: ['HTTPS (Port 443)', 'HTTP (Port 80)', 'FTP (Port 21)']
      },
      answer: 0,
      explanation: {
        tr: 'HTTPS TLS/SSL şifrelemesiyle 443 portu üzerinden güvenli web trafiği sağlar.',
        en: 'HTTPS secures web traffic over port 443 using TLS/SSL.'
      },
      points: 10
    },
    {
      id: 'services-3',
      question: {
        tr: 'Ağ cihazlarının saatlerini senkronize etmek için hangi protokol kullanılır?',
        en: 'Which protocol synchronizes clocks across network devices?'
      },
      choices: {
        tr: ['NTP (Network Time Protocol)', 'SNMP', 'TFTP'],
        en: ['NTP (Network Time Protocol)', 'SNMP', 'TFTP']
      },
      answer: 0,
      explanation: {
        tr: 'NTP (Port 123) tüm ağ cihazlarında zaman birliğini sağlar.',
        en: 'NTP (Port 123) synchronizes time across all network infrastructure.'
      },
      points: 10
    }
  ],

  soho: [
    {
      id: 'soho-1',
      question: {
        tr: 'SOHO router\'larda iç ağdaki cihazların dış internete tek IP ile çıkmasını sağlayan teknoloji nedir?',
        en: 'Which technology allows multiple internal devices to share one public IP in SOHO routers?'
      },
      choices: {
        tr: ['NAT / PAT (Port Address Translation)', 'VLAN', 'STP'],
        en: ['NAT / PAT (Port Address Translation)', 'VLAN', 'STP']
      },
      answer: 0,
      explanation: {
        tr: 'NAT/PAT yerel IP adreslerini port numaralarıyla tek bir genel IP adresine dönüştürür.',
        en: 'NAT/PAT translates multiple private IPs to a single public IP using port numbers.'
      },
      points: 10
    },
    {
      id: 'soho-2',
      question: {
        tr: 'Kablosuz ağ (Wi-Fi) ismi için kullanılan terim hangisidir?',
        en: 'What is the wireless network name referred to as?'
      },
      choices: {
        tr: ['SSID (Service Set Identifier)', 'BSS', 'MAC'],
        en: ['SSID (Service Set Identifier)', 'BSS', 'MAC']
      },
      answer: 0,
      explanation: {
        tr: 'SSID kablosuz yayın yapılan ağın adıdır.',
        en: 'SSID is the broadcast name of the wireless network.'
      },
      points: 10
    },
    {
      id: 'soho-3',
      question: {
        tr: 'Wi-Fi ağlarında 2.4 GHz frekansının 5 GHz frekansına göre temel avantajı nedir?',
        en: 'What is the main advantage of 2.4 GHz Wi-Fi over 5 GHz?'
      },
      choices: {
        tr: ['Daha geniş kapsama alanı ve duvarları daha iyi geçme', 'Daha yüksek maksimum veri hızı', 'Sıfır kanal çakışması'],
        en: ['Greater coverage range and better wall penetration', 'Higher peak data speeds', 'Zero channel interference']
      },
      answer: 0,
      explanation: {
        tr: '2.4 GHz dalgaları daha uzun menzile ve engellerden daha iyi geçişe sahiptir.',
        en: '2.4 GHz signals travel farther and penetrate solid obstacles better.'
      },
      points: 10
    }
  ],

  basicLan: [
    {
      id: 'basiclan-1',
      question: {
        tr: 'Aynı yerel ağdaki (LAN) iki bilgisayarı bağlamak için en uygun cihaz hangisidir?',
        en: 'Which device is most suitable for connecting computers in the same LAN?'
      },
      choices: {
        tr: ['Switch', 'Modem', 'Repeater'],
        en: ['Switch', 'Modem', 'Repeater']
      },
      answer: 0,
      explanation: {
        tr: 'Switch yerel ağdaki cihazların hızlı ve paket çakışmasız iletişimini sağlar.',
        en: 'Switches connect local devices efficiently without collisions.'
      },
      points: 10
    },
    {
      id: 'basiclan-2',
      question: {
        tr: 'Bir cihazdan diğer cihaza paket ulaşıp ulaşmadığını doğrulayan komut hangisidir?',
        en: 'Which command verifies connectivity between two devices?'
      },
      choices: {
        tr: ['ping', 'ipconfig', 'tracert'],
        en: ['ping', 'ipconfig', 'tracert']
      },
      answer: 0,
      explanation: {
        tr: 'ping komutu karşı cihaza erişimi paket göndererek anında doğrular.',
        en: 'ping verifies round-trip reachability to the remote host.'
      },
      points: 10
    },
    {
      id: 'basiclan-3',
      question: {
        tr: 'Switch hangi adres tablosunu kullanarak paketleri hedef porta yönlendirir?',
        en: 'Which address table does a switch use to forward frames to target ports?'
      },
      choices: {
        tr: ['MAC Adres Tablosu (CAM)', 'Yönlendirme (Routing) Tablosu', 'DNS Tablosu'],
        en: ['MAC Address Table (CAM)', 'Routing Table', 'DNS Table']
      },
      answer: 0,
      explanation: {
        tr: 'Switch gelen paketlerin kaynak MAC adreslerini öğrenerek MAC tablosunda tutar.',
        en: 'Switches learn source MAC addresses and populate the CAM / MAC table.'
      },
      points: 10
    }
  ],

  campus: [
    {
      id: 'campus-1',
      question: {
        tr: 'Kampüs ağlarında Switch\'ler arası fiziksel döngüleri (loop) engelleyen protokol hangisidir?',
        en: 'Which protocol prevents switching loops in campus networks?'
      },
      choices: {
        tr: ['STP (Spanning Tree Protocol)', 'VTP', 'RIP'],
        en: ['STP (Spanning Tree Protocol)', 'VTP', 'RIP']
      },
      answer: 0,
      explanation: {
        tr: 'STP yedekli hatlardaki döngüleri tespit ederek yedek portları bloklar.',
        en: 'STP blocks redundant paths to eliminate switching loops.'
      },
      points: 10
    },
    {
      id: 'campus-2',
      question: {
        tr: 'Katman 3 Switch üzerinde VLAN\'lar arası yönlendirme sağlayan sanal arayüze ne ad verilir?',
        en: 'What is the virtual routing interface on a Layer 3 switch called?'
      },
      choices: {
        tr: ['SVI (Switch Virtual Interface)', 'Sub-interface', 'Loopback'],
        en: ['SVI (Switch Virtual Interface)', 'Sub-interface', 'Loopback']
      },
      answer: 0,
      explanation: {
        tr: 'SVI (interface vlan X) L3 Switch üzerinde inter-VLAN routing sağlar.',
        en: 'SVI (interface vlan X) provides inter-VLAN routing on L3 switches.'
      },
      points: 10
    },
    {
      id: 'campus-3',
      question: {
        tr: 'Birden fazla fiziksel bağlantıyı mantıksal tek bir yüksek hızlı hatta birleştiren teknolojiye ne ad verilir?',
        en: 'What technology bundles multiple physical switch links into a single logical channel?'
      },
      choices: {
        tr: ['EtherChannel / Link Aggregation (LACP)', 'Trunking', 'PortFast'],
        en: ['EtherChannel / Link Aggregation (LACP)', 'Trunking', 'PortFast']
      },
      answer: 0,
      explanation: {
        tr: 'EtherChannel (LACP/PAGP) bant genişliğini artırır ve hat yedekliliği sunar.',
        en: 'EtherChannel bundles parallel links for higher throughput and failover.'
      },
      points: 10
    }
  ],

  hospital: [
    {
      id: 'hospital-1',
      question: {
        tr: 'Kritik ağlarda bağlantı kopmasına karşı birden fazla hat kullanılmasına ne ad verilir?',
        en: 'What is using redundant physical links in critical networks called?'
      },
      choices: {
        tr: ['Ağ Yedekliliği (Redundancy)', 'Multicast', 'Broadcast'],
        en: ['Network Redundancy', 'Multicast', 'Broadcast']
      },
      answer: 0,
      explanation: {
        tr: 'Yedeklilik (Redundancy) tek bir hat arızasında sistemin kesintisiz çalışmasını sağlar.',
        en: 'Redundancy ensures uptime if a single link or device fails.'
      },
      points: 10
    },
    {
      id: 'hospital-2',
      question: {
        tr: 'Hassas tıbbi cihaz ağlarını diğer kullanıcı trafiğinden ayırmak için ne kullanılır?',
        en: 'What is used to segment sensitive medical devices from other user traffic?'
      },
      choices: {
        tr: ['VLAN İzolasyonu', 'Hub', 'Düz kablo'],
        en: ['VLAN Segmentation', 'Hub', 'Straight cable']
      },
      answer: 0,
      explanation: {
        tr: 'VLAN farklı departman ve tıbbi cihazları mantıksal olarak izole eder.',
        en: 'VLAN logically isolates departments and medical devices.'
      },
      points: 10
    },
    {
      id: 'hospital-3',
      question: {
        tr: 'Hayati önem taşıyan medikal veri trafiğini önceliklendirmek için hangi teknoloji kullanılır?',
        en: 'Which technology prioritizes time-sensitive medical telemetry and voice traffic?'
      },
      choices: {
        tr: ['QoS (Quality of Service)', 'DHCP Snooping', 'VTP'],
        en: ['QoS (Quality of Service)', 'DHCP Snooping', 'VTP']
      },
      answer: 0,
      explanation: {
        tr: 'QoS kritik paketlere düşük gecikme ve bant genişliği garantisi sunar.',
        en: 'QoS guarantees latency and bandwidth priority for critical data streams.'
      },
      points: 10
    }
  ],

  ecommerce: [
    {
      id: 'ecommerce-1',
      question: {
        tr: 'Dış dünyadaki bir web isteğini iç ağdaki sunucuya yönlendiren NAT türü hangisidir?',
        en: 'Which NAT type forwards incoming external web requests to an internal server?'
      },
      choices: {
        tr: ['Statik NAT / Port Forwarding', 'Dynamic NAT', 'PAT'],
        en: ['Static NAT / Port Forwarding', 'Dynamic NAT', 'PAT']
      },
      answer: 0,
      explanation: {
        tr: 'Statik NAT dış IP/portunu iç sunucunun IP/portuna eşler.',
        en: 'Static NAT maps a public IP/port to an internal server IP/port.'
      },
      points: 10
    },
    {
      id: 'ecommerce-2',
      question: {
        tr: 'Yetkisiz erişimleri ve zararlı trafiği engellemek için kullanılan ağ güvenlik cihazı hangisidir?',
        en: 'Which device filters unauthorized access and malicious network traffic?'
      },
      choices: {
        tr: ['Firewall (Güvenlik Duvarı)', 'Switch', 'Repeater'],
        en: ['Firewall', 'Switch', 'Repeater']
      },
      answer: 0,
      explanation: {
        tr: 'Güvenlik duvarı kurallara göre gelen/giden trafiği denetler.',
        en: 'Firewalls inspect incoming/outgoing traffic based on security rules.'
      },
      points: 10
    },
    {
      id: 'ecommerce-3',
      question: {
        tr: 'Yüksek trafik alan e-ticaret sitelerinde sunucuların yükünü dengeleyen mekanizmaya ne ad verilir?',
        en: 'What distributes incoming user requests across multiple web servers?'
      },
      choices: {
        tr: ['Yük Dengeleme (Load Balancing)', 'Port Mirroring', 'ARP Proxy'],
        en: ['Load Balancing', 'Port Mirroring', 'ARP Proxy']
      },
      answer: 0,
      explanation: {
        tr: 'Load Balancer istekleri sunuculara dağıtarak kesintisiz hizmet sağlar.',
        en: 'Load balancers distribute traffic across a farm of backend servers.'
      },
      points: 10
    }
  ],

  cliBasics: [
    {
      id: 'clibasics-1',
      question: {
        tr: 'CLI\'da yetkili moda geçiş komutu nedir?',
        en: 'Which command enters privileged mode in CLI?'
      },
      choices: {
        tr: ['enable', 'configure', 'admin'],
        en: ['enable', 'configure', 'admin']
      },
      answer: 0,
      explanation: {
        tr: 'enable komutu User EXEC modundan Privileged EXEC moda yükseltir.',
        en: 'enable command elevates from User EXEC to Privileged EXEC mode.'
      },
      points: 10
    },
    {
      id: 'clibasics-2',
      question: {
        tr: 'Bir üst komut moduna geri dönmek veya moddan çıkmak için hangi komut yazılır?',
        en: 'Which command exits to the upper mode in CLI?'
      },
      choices: {
        tr: ['exit', 'back', 'return'],
        en: ['exit', 'back', 'return']
      },
      answer: 0,
      explanation: {
        tr: 'exit komutu mevcut konfigürasyon modundan bir üst seviyeye döner.',
        en: 'exit command returns to the parent configuration mode.'
      },
      points: 10
    },
    {
      id: 'clibasics-3',
      question: {
        tr: 'CLI ortamında mevcut modda kullanılabilecek komutları veya sözdizimini görmek için hangi tuşa basılır?',
        en: 'Which key is used in Cisco CLI for contextual help and available commands?'
      },
      choices: {
        tr: ['?', 'Tab', 'F1'],
        en: ['?', 'Tab', 'F1']
      },
      answer: 0,
      explanation: {
        tr: '"?" karakteri o anki modda geçerli tüm komutları listeler.',
        en: '"?" provides contextual help and syntax assistance.'
      },
      points: 10
    }
  ],

  addDevice: [
    {
      id: 'adddevice-1',
      question: {
        tr: 'Bir bilgisayar ile Switch konsol portunu bağlamak için hangi kablo kullanılır?',
        en: 'Which cable connects a PC serial port to a Switch console port?'
      },
      choices: {
        tr: ['Konsol (Console) Kablosu', 'Düz (Straight) Kablo', 'Çapraz (Crossover) Kablo'],
        en: ['Console Cable', 'Straight Cable', 'Crossover Cable']
      },
      answer: 0,
      explanation: {
        tr: 'Konsol kablosu (Rollover) cihazların ilk yapılandırması için terminal bağlantısı sağlar.',
        en: 'Console cable provides terminal access for out-of-band device setup.'
      },
      points: 10
    },
    {
      id: 'adddevice-2',
      question: {
        tr: 'Farklı türdeki cihazları (örn. PC - Switch) bağlamak için en uygun bakır kablo hangisidir?',
        en: 'Which copper cable connects different device types like PC to Switch?'
      },
      choices: {
        tr: ['Düz (Straight-Through) Kablo', 'Çapraz (Crossover) Kablo', 'Seri Kablo'],
        en: ['Straight-Through Cable', 'Crossover Cable', 'Serial Cable']
      },
      answer: 0,
      explanation: {
        tr: 'Farklı katmandaki cihazlar (PC-Switch) düz kablo ile bağlanır.',
        en: 'Different layer devices (PC-Switch) connect using straight cables.'
      },
      points: 10
    },
    {
      id: 'adddevice-3',
      question: {
        tr: 'Aynı türdeki iki cihazı (örn. Switch - Switch) bağlamak için klasik kablolamada hangi kablo tipi kullanılır?',
        en: 'Which cable type is used in classic cabling between like devices such as Switch to Switch?'
      },
      choices: {
        tr: ['Çapraz (Crossover) Kablo', 'Konsol Kablosu', 'Koaksiyel Kablo'],
        en: ['Crossover Cable', 'Console Cable', 'Coaxial Cable']
      },
      answer: 0,
      explanation: {
        tr: 'Aynı seviye cihazların Tx ve Rx pinlerini eşleştirmek için çapraz kablo kullanılır.',
        en: 'Crossover cables cross send and receive pairs between identical device types.'
      },
      points: 10
    }
  ],

  ospfRouting: [
    {
      id: 'ospf-1',
      question: {
        tr: 'OSPF protokolünde tüm alanların (area) bağlanması zorunlu olan omurga (backbone) alanı hangisidir?',
        en: 'Which backbone area must all OSPF non-backbone areas connect to?'
      },
      choices: {
        tr: ['Area 0', 'Area 1', 'Area 100'],
        en: ['Area 0', 'Area 1', 'Area 100']
      },
      answer: 0,
      explanation: {
        tr: 'OSPF mimarisinde Area 0 merkezi omurga alanıdır.',
        en: 'Area 0 serves as the core backbone in multi-area OSPF.'
      },
      points: 10
    },
    {
      id: 'ospf-2',
      question: {
        tr: 'OSPF en kısa yolu hesaplamak için hangi algoritmayı kullanır?',
        en: 'Which algorithm does OSPF use to calculate the shortest loop-free path?'
      },
      choices: {
        tr: ['Dijkstra SPF (Shortest Path First)', 'Bellman-Ford', 'DUAL'],
        en: ['Dijkstra SPF (Shortest Path First)', 'Bellman-Ford', 'DUAL']
      },
      answer: 0,
      explanation: {
        tr: 'OSPF Dijkstra SPF algoritmasını kullanarak topoloji haritası oluşturur.',
        en: 'OSPF relies on the Dijkstra SPF algorithm to build loop-free shortest paths.'
      },
      points: 10
    },
    {
      id: 'ospf-3',
      question: {
        tr: 'OSPF ağ komutunda 255.255.255.0 alt ağ maskesi yerine hangi wildcard maskesi yazılır?',
        en: 'What wildcard mask corresponds to a 255.255.255.0 subnet mask in OSPF?'
      },
      choices: {
        tr: ['0.0.0.255', '0.255.255.255', '255.255.255.0'],
        en: ['0.0.0.255', '0.255.255.255', '255.255.255.0']
      },
      answer: 0,
      explanation: {
        tr: 'Wildcard maske alt ağ maskesinin tersidir: 255.255.255.255 - 255.255.255.0 = 0.0.0.255.',
        en: 'Wildcard mask is the inverse of the subnet mask (0.0.0.255 for /24).'
      },
      points: 10
    }
  ],

  bgpRouting: [
    {
      id: 'bgp-1',
      question: {
        tr: 'İnternetin omurgasını oluşturan ve Otonom Sistemler (AS) arasında yönlendirme yapan protokol hangisidir?',
        en: 'Which protocol powers the internet backbone by routing between Autonomous Systems (AS)?'
      },
      choices: {
        tr: ['BGP (Border Gateway Protocol)', 'RIP', 'EIGRP'],
        en: ['BGP (Border Gateway Protocol)', 'RIP', 'EIGRP']
      },
      answer: 0,
      explanation: {
        tr: 'BGP global internet yönlendirmesini sağlayan Path Vector protokolüdür.',
        en: 'BGP is the exterior path-vector protocol that routes the global internet.'
      },
      points: 10
    },
    {
      id: 'bgp-2',
      question: {
        tr: 'Farklı iki Otonom Sistem (AS) arasındaki BGP komşuluğuna ne ad verilir?',
        en: 'What is a BGP peering session between two distinct Autonomous Systems called?'
      },
      choices: {
        tr: ['eBGP (External BGP)', 'iBGP (Internal BGP)', 'mBGP'],
        en: ['eBGP (External BGP)', 'iBGP (Internal BGP)', 'mBGP']
      },
      answer: 0,
      explanation: {
        tr: 'Farklı AS\'ler arası oturumlara eBGP (AD=20), aynı AS içi oturumlara iBGP (AD=200) denir.',
        en: 'Inter-AS sessions are eBGP (AD 20), whereas intra-AS sessions are iBGP (AD 200).'
      },
      points: 10
    },
    {
      id: 'bgp-3',
      question: {
        tr: 'BGP protokolü komşuluk kurmak için hangi TCP portunu kullanır?',
        en: 'Which TCP port does BGP use to establish neighbor peering sessions?'
      },
      choices: {
        tr: ['Port 179', 'Port 520', 'Port 80'],
        en: ['Port 179', 'Port 520', 'Port 80']
      },
      answer: 0,
      explanation: {
        tr: 'BGP güvenilir oturum iletişimi için TCP 179 portunu kullanır.',
        en: 'BGP establishes reliable peer connections over TCP port 179.'
      },
      points: 10
    }
  ],

  stpProtocol: [
    {
      id: 'stp-1',
      question: {
        tr: 'STP protokolünde ağdaki en merkezi Switch (Root Bridge) nasıl seçilir?',
        en: 'How is the Root Bridge selected in Spanning Tree Protocol?'
      },
      choices: {
        tr: ['En düşük Bridge ID (Öncelik + MAC adresi)', 'En yüksek IP adresi', 'En çok porta sahip switch'],
        en: ['Lowest Bridge ID (Priority + MAC address)', 'Highest IP address', 'Switch with most ports']
      },
      answer: 0,
      explanation: {
        tr: 'STP en düşük öncelik ve en düşük MAC adresine sahip switch\'i Root Bridge yapar.',
        en: 'STP elects the switch with the lowest Bridge ID (priority + MAC) as Root Bridge.'
      },
      points: 10
    },
    {
      id: 'stp-2',
      question: {
        tr: 'Uç cihazların (PC, Sunucu) bağlı olduğu portların doğrudan iletim (Forwarding) moduna geçmesini sağlayan STP özelliği nedir?',
        en: 'Which STP feature transitions access edge ports immediately to Forwarding state?'
      },
      choices: {
        tr: ['PortFast', 'BPDU Guard', 'Root Guard'],
        en: ['PortFast', 'BPDU Guard', 'Root Guard']
      },
      answer: 0,
      explanation: {
        tr: 'PortFast dinleme/öğrenme aşamalarını atlayarak portu anında aktif eder.',
        en: 'PortFast skips listening/learning states to enable edge host ports immediately.'
      },
      points: 10
    },
    {
      id: 'stp-3',
      question: {
        tr: 'PortFast aktif bir porta istenmeyen bir Switch ve BPDU paketi bağlandığında portu kapatan güvenlik özelliği hangisidir?',
        en: 'Which feature disables a PortFast port if an unexpected BPDU frame is received?'
      },
      choices: {
        tr: ['BPDU Guard', 'Loop Guard', 'UplinkFast'],
        en: ['BPDU Guard', 'Loop Guard', 'UplinkFast']
      },
      answer: 0,
      explanation: {
        tr: 'BPDU Guard rogue switch bağlantılarını önleyerek portu err-disable moduna alır.',
        en: 'BPDU Guard protects topology integrity by shutting down ports receiving rogue BPDUs.'
      },
      points: 10
    }
  ],

  aclSecurity: [
    {
      id: 'acl-1',
      question: {
        tr: 'Standart (Standard) ACL\'ler paketleri neye göre filtreler?',
        en: 'What criterion do Standard Access Control Lists (ACLs) use to filter traffic?'
      },
      choices: {
        tr: ['Sadece Kaynak IP Adresi', 'Kaynak ve Hedef IP Adresi ile Port Numarası', 'Yalnızca MAC Adresi'],
        en: ['Source IP Address only', 'Source and Destination IP plus Port numbers', 'MAC Address only']
      },
      answer: 0,
      explanation: {
        tr: 'Standart ACL (1-99) yalnızca kaynak IP adresine bakar.',
        en: 'Standard ACLs (1-99) inspect only the source IP address.'
      },
      points: 10
    },
    {
      id: 'acl-2',
      question: {
        tr: 'Genişletilmiş (Extended) ACL numaralandırma aralığı hangisidir?',
        en: 'What is the standard numbering range for Extended IPv4 ACLs?'
      },
      choices: {
        tr: ['100 - 199', '1 - 99', '1000 - 1099'],
        en: ['100 - 199', '1 - 99', '1000 - 1099']
      },
      answer: 0,
      explanation: {
        tr: 'Genişletilmiş ACL numaraları 100-199 ve genişletilmiş aralıkta 2000-2699\'dur.',
        en: 'Extended ACLs use numbers 100-199 (and 2000-2699).'
      },
      points: 10
    },
    {
      id: 'acl-3',
      question: {
        tr: 'Tüm ACL kurallarının en altında varsayılan olarak bulunan gizli kural nedir?',
        en: 'What default implicit rule exists at the bottom of every ACL?'
      },
      choices: {
        tr: ['Implicit Deny Any (Eşleşmeyen her şeyi reddet)', 'Implicit Permit Any', 'Redirect Traffic'],
        en: ['Implicit Deny Any (Drop all unmatched packets)', 'Implicit Permit Any', 'Redirect Traffic']
      },
      answer: 0,
      explanation: {
        tr: 'Bir ACL\'de eşleşmeyen tüm paketler gizli deny kuralı ile engellenir.',
        en: 'Any packet not explicitly permitted is dropped by the implicit deny.'
      },
      points: 10
    }
  ],

  natPat: [
    {
      id: 'nat-1',
      question: {
        tr: 'Aynı genel IP adresini farklı port numaralarıyla binlerce iç cihaza paylaştıran teknolojiye ne ad verilir?',
        en: 'What technology maps thousands of private hosts to a single public IP using port numbers?'
      },
      choices: {
        tr: ['PAT (Port Address Translation / NAT Overload)', 'Statik NAT', '1:1 NAT'],
        en: ['PAT (Port Address Translation / NAT Overload)', 'Static NAT', '1:1 NAT']
      },
      answer: 0,
      explanation: {
        tr: 'PAT port numaralarını kullanarak IPv4 adres tasarrufu sağlar.',
        en: 'PAT uses unique layer 4 port numbers to multiplex connections over a single IP.'
      },
      points: 10
    },
    {
      id: 'nat-2',
      question: {
        tr: 'Cisco IOS NAT terminolojisinde iç ağdaki bir cihazın kendi yerel IP adresine ne ad verilir?',
        en: 'In Cisco NAT terminology, what is the private IP address of an internal host called?'
      },
      choices: {
        tr: ['Inside Local', 'Inside Global', 'Outside Global'],
        en: ['Inside Local', 'Inside Global', 'Outside Global']
      },
      answer: 0,
      explanation: {
        tr: 'Inside Local iç ağdaki cihazın gerçek özel IP adresidir (örn. 192.168.1.50).',
        en: 'Inside Local is the private un-translated IP address assigned to an internal host.'
      },
      points: 10
    },
    {
      id: 'nat-3',
      question: {
        tr: 'Bir yönlendirici arayüzünü NAT dış dünyası olarak belirlemek için hangi komut kullanılır?',
        en: 'Which interface command designates an interface as the public NAT interface?'
      },
      choices: {
        tr: ['ip nat outside', 'ip nat inside', 'nat enable public'],
        en: ['ip nat outside', 'ip nat inside', 'nat enable public']
      },
      answer: 0,
      explanation: {
        tr: 'İç arayüz için "ip nat inside", dış internet arayüzü için "ip nat outside" kullanılır.',
        en: '"ip nat inside" marks local LAN while "ip nat outside" marks the public WAN link.'
      },
      points: 10
    }
  ],

  ipv6Addressing: [
    {
      id: 'ipv6-1',
      question: {
        tr: 'IPv6 adresleri kaç bit uzunluğundadır?',
        en: 'How many bits long is an IPv6 address?'
      },
      choices: {
        tr: ['128 bit', '32 bit', '64 bit'],
        en: ['128 bits', '32 bits', '64 bits']
      },
      answer: 0,
      explanation: {
        tr: 'IPv6 adresleri 128 bitlik 8 hextet onaltılık (hexadecimal) bloklardan oluşur.',
        en: 'IPv6 uses 128-bit addresses formatted as hexadecimal hextets.'
      },
      points: 10
    },
    {
      id: 'ipv6-2',
      question: {
        tr: 'IPv6\'da aynı yerel bağlantıdaki (link-local) cihazların haberleşmesi için otomatik türetilen adres öneki nedir?',
        en: 'What prefix denotes an IPv6 Link-Local address?'
      },
      choices: {
        tr: ['FE80::/10', '2000::/3', 'FC00::/7'],
        en: ['FE80::/10', '2000::/3', 'FC00::/7']
      },
      answer: 0,
      explanation: {
        tr: 'FE80::/10 aralığı yönlendirilemeyen link-local iletişim adresleridir.',
        en: 'FE80::/10 defines link-local unicast addresses used for local neighbor discovery.'
      },
      points: 10
    },
    {
      id: 'ipv6-3',
      question: {
        tr: 'IPv6 istemcilerinin DHCP sunucusu olmadan Router Advertisement (RA) ile otomatik IP yapılandırmasına ne ad verilir?',
        en: 'What is the stateless automatic IPv6 configuration mechanism called?'
      },
      choices: {
        tr: ['SLAAC (Stateless Address Autoconfiguration)', 'Stateful DHCPv6', 'NAT64'],
        en: ['SLAAC (Stateless Address Autoconfiguration)', 'Stateful DHCPv6', 'NAT64']
      },
      answer: 0,
      explanation: {
        tr: 'SLAAC istemcilerin Router ilanlarını dinleyerek kendi IPv6 adresini oluşturmasını sağlar.',
        en: 'SLAAC enables hosts to self-configure IPv6 addresses from Router Advertisements.'
      },
      points: 10
    }
  ],

  wirelessWlan: [
    {
      id: 'wlan-1',
      question: {
        tr: 'Merkezi Kablosuz Ağ Denetleyicisi (WLC) ile Access Point\'ler (AP) arasındaki kontrol tüneli protokolü hangisidir?',
        en: 'Which tunneling protocol links lightweight Access Points (APs) to a Wireless LAN Controller (WLC)?'
      },
      choices: {
        tr: ['CAPWAP / LWAPP', 'IPsec', 'GRE'],
        en: ['CAPWAP / LWAPP', 'IPsec', 'GRE']
      },
      answer: 0,
      explanation: {
        tr: 'CAPWAP AP\'ler ile WLC arasında kontrol ve veri trafiğini güvenle kapsüller.',
        en: 'CAPWAP encapsulates control and data frames between lightweight APs and the WLC.'
      },
      points: 10
    },
    {
      id: 'wlan-2',
      question: {
        tr: 'En güncel ve en yüksek güvenlik seviyesini sağlayan Wi-Fi şifreleme standardı hangisidir?',
        en: 'Which modern Wi-Fi encryption standard provides the highest security?'
      },
      choices: {
        tr: ['WPA3', 'WPA2-PSK', 'WEP'],
        en: ['WPA3', 'WPA2-PSK', 'WEP']
      },
      answer: 0,
      explanation: {
        tr: 'WPA3 SAE (Simultaneous Authentication of Equals) ile gelişmiş şifreleme sunar.',
        en: 'WPA3 offers enhanced cryptographic protection via SAE authentication.'
      },
      points: 10
    },
    {
      id: 'wlan-3',
      question: {
        tr: '2.4 GHz bandında birbiriyle çakışmayan (non-overlapping) üç standart kanal hangileridir?',
        en: 'Which three 2.4 GHz channels are non-overlapping in standard North American / European deployments?'
      },
      choices: {
        tr: ['Kanal 1, 6 ve 11', 'Kanal 1, 2 ve 3', 'Kanal 5, 10 ve 15'],
        en: ['Channels 1, 6, and 11', 'Channels 1, 2, and 3', 'Channels 5, 10, and 15']
      },
      answer: 0,
      explanation: {
        tr: '2.4 GHz bandında yalnızca 1, 6 ve 11 numaralı kanallar çakışmasızdır.',
        en: 'Channels 1, 6, and 11 operate with 20MHz spacing without spectral overlap.'
      },
      points: 10
    }
  ],

  qosTraffic: [
    {
      id: 'qos-1',
      question: {
        tr: 'IP başlığındaki QoS önceliklendirme değerini belirleyen 6 bitlik alana ne ad verilir?',
        en: 'Which 6-bit field in the IPv4 header carries QoS classification markings?'
      },
      choices: {
        tr: ['DSCP (Differentiated Services Code Point)', 'CoS', 'TTL'],
        en: ['DSCP (Differentiated Services Code Point)', 'CoS', 'TTL']
      },
      answer: 0,
      explanation: {
        tr: 'DSCP IP paketlerinde Katman 3 QoS sınıflandırması sağlar.',
        en: 'DSCP marks layer 3 packets to govern per-hop forwarding behaviors.'
      },
      points: 10
    },
    {
      id: 'qos-2',
      question: {
        tr: 'Ses (VoIP) gibi gecikmeye duyarlı paketler için uygulanan öncelikli kuyruklama tekniği hangisidir?',
        en: 'Which queuing algorithm provides strict low-latency priority for voice (VoIP) traffic?'
      },
      choices: {
        tr: ['LLQ (Low Latency Queuing)', 'FIFO', 'Round Robin'],
        en: ['LLQ (Low Latency Queuing)', 'FIFO', 'Round Robin']
      },
      answer: 0,
      explanation: {
        tr: 'LLQ kritik ses paketlerini kuyruğun en önüne alarak gecikmeyi minimize eder.',
        en: 'LLQ services strict priority queues ahead of all other traffic to protect voice streams.'
      },
      points: 10
    },
    {
      id: 'qos-3',
      question: {
        tr: 'Trafik kotasını aşan paketleri kuyruklayarak zamana yayan (gecikmeli ileten) QoS mekanizması nedir?',
        en: 'Which QoS mechanism buffers excess packets to smooth bursty traffic to a target rate?'
      },
      choices: {
        tr: ['Trafik Şekillendirme (Traffic Shaping)', 'Trafik Kırpma (Policing)', 'Drop Tail'],
        en: ['Traffic Shaping', 'Traffic Policing', 'Drop Tail']
      },
      answer: 0,
      explanation: {
        tr: 'Traffic Shaping paketleri kuyrukta bekleterek iletirken, Policing aşan paketleri hemen düşürür.',
        en: 'Shaping buffers bursts to avoid drops, while policing immediately drops or re-marks excess rate.'
      },
      points: 10
    }
  ],

  sdnNetdevops: [
    {
      id: 'sdn-1',
      question: {
        tr: 'Yazılım Tanımlı Ağlarda (SDN) Kontrol Düzlemi (Control Plane) ile Veri Düzlemi (Data Plane) arasındaki ilişki nasıldır?',
        en: 'How do the Control Plane and Data Plane interact in Software-Defined Networking (SDN)?'
      },
      choices: {
        tr: [
          'Kontrol Düzlemi merkezi bir yazılım kontrolcüsünde ayrıştırılır; cihazlar sadece veri iletimi yapar',
          'Cihazlar kontrol düzlemini kendi içinde bağımsız işletir',
          'Yalnızca fiziksel kablolar yazılımla kontrol edilir'
        ],
        en: [
          'Control Plane is decoupled and centralized in a software controller; switches only forward data',
          'Devices run control planes completely independently',
          'Only physical cables are controlled by software'
        ]
      },
      answer: 0,
      explanation: {
        tr: 'SDN mantığında karar verici Kontrol Düzlemi merkezi yazılım kontrolcüsüne taşınır.',
        en: 'SDN decouples the decision-making control plane from the underlying forwarding hardware.'
      },
      points: 10
    },
    {
      id: 'sdn-2',
      question: {
        tr: 'SDN Kontrolcüsü ile Ağ Cihazları arasındaki Güney Yönlü Arayüz (Southbound API) protokollerine hangisi örnektir?',
        en: 'Which protocol is an example of a Southbound API linking controllers to physical devices?'
      },
      choices: {
        tr: ['NETCONF / OpenFlow', 'REST API', 'GraphQL'],
        en: ['NETCONF / OpenFlow', 'REST API', 'GraphQL']
      },
      answer: 0,
      explanation: {
        tr: 'Southbound API\'lar (NETCONF, OpenFlow) kontrolcüden cihazlara kural iletir.',
        en: 'Southbound APIs (NETCONF, OpenFlow) allow controllers to program physical network forwarding tables.'
      },
      points: 10
    },
    {
      id: 'sdn-3',
      question: {
        tr: 'Ağ otomasyonunda cihaz yapılandırma modellerini tanımlayan standart veri modelleme dili hangisidir?',
        en: 'Which standard data modeling language defines network device configurations for NETCONF/RESTCONF?'
      },
      choices: {
        tr: ['YANG', 'Python', 'SQL'],
        en: ['YANG', 'Python', 'SQL']
      },
      answer: 0,
      explanation: {
        tr: 'YANG, NETCONF ve RESTCONF protokolleri için veri modelleri tanımlar.',
        en: 'YANG is the standard data modeling language for network device automation.'
      },
      points: 10
    }
  ],

  cybersecurity: [
    {
      id: 'sec-1',
      question: {
        tr: 'Gelen paketleri sadece IP/port bazında değil, TCP bağlantı durumuna (bağlantı kuruldu mu) göre de inceleyen güvenlik duvarı türü nedir?',
        en: 'Which type of firewall tracks active TCP sessions to filter state-aware traffic?'
      },
      choices: {
        tr: ['Durum Bilgisi Tutan (Stateful Inspection) Firewall', 'Paket Filtreleme (Stateless)', 'Hub'],
        en: ['Stateful Inspection Firewall', 'Stateless Packet Filtering', 'Hub']
      },
      answer: 0,
      explanation: {
        tr: 'Stateful firewall bağlantı tablosunu takip ederek giden isteğin yanıtlarına otomatik izin verir.',
        en: 'Stateful firewalls maintain connection tables to permit return traffic for established sessions.'
      },
      points: 10
    },
    {
      id: 'sec-2',
      question: {
        tr: 'Ağda sahte ARP yanıtları göndererek trafiği araya girip dinleyen saldırı türü hangisidir?',
        en: 'Which attack floods fake ARP replies to intercept and eavesdrop local LAN traffic?'
      },
      choices: {
        tr: ['ARP Spoofing / Poisoning (Ortadaki Adam - MITM)', 'SYN Flood', 'Brute Force'],
        en: ['ARP Spoofing / Poisoning (Man-in-the-Middle - MITM)', 'SYN Flood', 'Brute Force']
      },
      answer: 0,
      explanation: {
        tr: 'ARP Spoofing switch ağında araya girerek gizli dinleme sağlar; Dynamic ARP Inspection (DAI) ile önlenir.',
        en: 'ARP poisoning intercepts LAN traffic by poisoning ARP tables; mitigated via DAI.'
      },
      points: 10
    },
    {
      id: 'sec-3',
      question: {
        tr: '"Ağ içindeki veya dışındaki hiçbir kullanıcıya ve cihaza varsayılan olarak güvenilmez" felsefesi nedir?',
        en: 'Which modern security architecture assumes breach and verifies every transaction explicitly?'
      },
      choices: {
        tr: ['Sıfır Güven (Zero Trust)', 'Çevre Güvenliği', 'Açık Ağ'],
        en: ['Zero Trust Architecture', 'Perimeter Security', 'Open Network']
      },
      answer: 0,
      explanation: {
        tr: 'Zero Trust "Asla güvenme, her zaman doğrula" prensibiyle mikro-segmentasyon uygular.',
        en: 'Zero Trust follows "never trust, always verify" with strict continuous authentication.'
      },
      points: 10
    }
  ],

  subnetting: [
    {
      id: 'subnet-1',
      question: {
        tr: '192.168.1.0/24 ağı /26 alt ağlarına bölündüğünde her bir alt ağda kaç adet kullanılabilir (host) IP adresi bulunur?',
        en: 'How many usable host IP addresses exist in each /26 subnet created from a 192.168.1.0/24 network?'
      },
      choices: {
        tr: ['62', '64', '30'],
        en: ['62', '64', '30']
      },
      answer: 0,
      explanation: {
        tr: '32 - 26 = 6 host biti. 2^6 - 2 (Ağ ve Broadcast çıkarılır) = 62 kullanılabilir IP.',
        en: '32 - 26 = 6 host bits. 2^6 - 2 (subtract network and broadcast) = 62 usable hosts.'
      },
      points: 10
    },
    {
      id: 'subnet-2',
      question: {
        tr: 'İki Router arasındaki noktadan noktaya (Point-to-Point) seri bağlantıda IP israfını önlemek için hangi subnet maskesi tercih edilir?',
        en: 'Which subnet prefix is optimal for point-to-point router links to conserve IPv4 space?'
      },
      choices: {
        tr: ['/30 (255.255.255.252) veya /31', '/24 (255.255.255.0)', '/16 (255.255.0.0)'],
        en: ['/30 (255.255.255.252) or /31', '/24 (255.255.255.0)', '/16 (255.255.0.0)']
      },
      answer: 0,
      explanation: {
        tr: '/30 maskesi tam 2 adet kullanılabilir host IP adresi sunar.',
        en: '/30 subnets provide exactly 2 usable host IPs, ideal for router-to-router links.'
      },
      points: 10
    },
    {
      id: 'subnet-3',
      question: {
        tr: '10.0.0.0 - 10.255.255.255, 172.16.0.0 - 172.31.255.255 ve 192.168.0.0 - 192.168.255.255 adres blokları ne tür IP adresleridir?',
        en: 'What type of IPv4 addresses are 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16?'
      },
      choices: {
        tr: ['Özel (Private / RFC 1918) IP Adresleri', 'Genel (Public) İnternet Adresleri', 'Multicast Adresleri'],
        en: ['Private (RFC 1918) IP Addresses', 'Public Internet Addresses', 'Multicast Addresses']
      },
      answer: 0,
      explanation: {
        tr: 'RFC 1918 özel IP adresleri internette doğrudan yönlendirilemez; yerel ağlarda kullanılır.',
        en: 'RFC 1918 addresses are reserved for private internal use and not routable on the public internet.'
      },
      points: 10
    }
  ],

  tcpUdpOsi: [
    {
      id: 'osi-1',
      question: {
        tr: 'TCP protokolünün UDP\'den temel farkı nedir?',
        en: 'What is the primary difference between TCP and UDP at the Transport Layer?'
      },
      choices: {
        tr: [
          'TCP bağlantı yönelimli (bağlantı kurar, onay ve hata denetimi yapar); UDP ise bağlantısız ve hızlıdır',
          'UDP paketlerin ulaşıp ulaşmadığını garanti eder',
          'TCP yalnızca kablosuz ağlarda çalışır'
        ],
        en: [
          'TCP is connection-oriented (reliable delivery, handshakes, acknowledgments); UDP is connectionless and lightweight',
          'UDP guarantees delivery with retransmissions',
          'TCP only works on wireless links'
        ]
      },
      answer: 0,
      explanation: {
        tr: 'TCP 3-Way Handshake (SYN, SYN-ACK, ACK) ile güvenilir oturum kurar; UDP ise onay beklemez.',
        en: 'TCP establishes reliable connections via 3-way handshakes, whereas UDP prioritizes low overhead.'
      },
      points: 10
    },
    {
      id: 'osi-2',
      question: {
        tr: 'OSI modelinde IP adresleme ve yönlendirme kararlarının alındığı katman hangisidir?',
        en: 'At which OSI layer do logical IP addressing and path routing decisions occur?'
      },
      choices: {
        tr: ['Katman 3 (Ağ / Network Katmanı)', 'Katman 2 (Veri Bağlantı / Data Link)', 'Katman 4 (Taşıma / Transport)'],
        en: ['Layer 3 (Network Layer)', 'Layer 2 (Data Link Layer)', 'Layer 4 (Transport Layer)']
      },
      answer: 0,
      explanation: {
        tr: 'IP adresleri ve Router yönlendirmesi Katman 3\'te (Ağ Katmanı) gerçekleşir.',
        en: 'Logical addressing and router forwarding decisions happen at OSI Layer 3 (Network).'
      },
      points: 10
    },
    {
      id: 'osi-3',
      question: {
        tr: 'SSH (Güvenli Uzak Terminal) protokolü varsayılan olarak hangi port numarasını kullanır?',
        en: 'Which well-known port does SSH (Secure Shell) use by default?'
      },
      choices: {
        tr: ['Port 22', 'Port 23 (Telnet)', 'Port 80 (HTTP)'],
        en: ['Port 22', 'Port 23 (Telnet)', 'Port 80 (HTTP)']
      },
      answer: 0,
      explanation: {
        tr: 'SSH şifreli komut satırı yönetimi için TCP 22 portunu kullanır.',
        en: 'SSH operates over TCP port 22 to encrypt remote terminal management sessions.'
      },
      points: 10
    }
  ],

  cliGuidedLessons: [
    {
      id: 'clilessons-1',
      question: {
        tr: 'Birden fazla switch portunu aynı anda yapılandırmak için hangi komut kullanılır?',
        en: 'Which command allows configuring multiple switchports simultaneously?'
      },
      choices: {
        tr: ['interface range FastEthernet0/1 - 10', 'interface multi fa0/1', 'group ports fa0/1'],
        en: ['interface range FastEthernet0/1 - 10', 'interface multi fa0/1', 'group ports fa0/1']
      },
      answer: 0,
      explanation: {
        tr: '"interface range" komutu aralıktaki tüm portlara toplu kural uygular.',
        en: '"interface range" applies configuration commands to a block of ports at once.'
      },
      points: 10
    },
    {
      id: 'clilessons-2',
      question: {
        tr: 'Cisco IOS yapılandırma modundan doğrudan Privileged EXEC moduna (#) dönmek için hangi kısayol kullanılır?',
        en: 'Which command or shortcut returns immediately to Privileged EXEC mode from any submode?'
      },
      choices: {
        tr: ['end (veya Ctrl+Z)', 'exit', 'quit'],
        en: ['end (or Ctrl+Z)', 'exit', 'quit']
      },
      answer: 0,
      explanation: {
        tr: '"end" komutu veya Ctrl+Z hiyerarşide kaç seviye derinde olunursa olunsun doğrudan # moduna döner.',
        en: '"end" or Ctrl+Z jumps straight back to Privileged EXEC mode regardless of config nesting.'
      },
      points: 10
    },
    {
      id: 'clilessons-3',
      question: {
        tr: 'Yapılandırma modundayken "show" komutlarını başına ne ekleyerek çalıştırabilirsiniz?',
        en: 'How can privileged show commands be executed directly from within configuration modes?'
      },
      choices: {
        tr: ['do <KOMUT> (örn: do show ip int br)', 'exec <KOMUT>', 'run <KOMUT>'],
        en: ['do <COMMAND> (e.g. do show ip int br)', 'exec <COMMAND>', 'run <COMMAND>']
      },
      answer: 0,
      explanation: {
        tr: '"do" ön eki konfigürasyon modundan çıkmadan EXEC komutlarını çalıştırmayı sağlar.',
        en: 'Prefixing with "do" executes privileged show commands without exiting config mode.'
      },
      points: 10
    }
  ]
};

// Fallback topic quizzes for general or beginner/intermediate/advanced steps
export const defaultFallbackQuiz: SdnQuizQuestion[] = [
  ...lessonQuizzes.pcCmd,
  ...lessonQuizzes.basicSwitch,
  ...lessonQuizzes.vlan,
  ...lessonQuizzes.routerDhcp,
  ...lessonQuizzes.staticRouting,
  ...lessonQuizzes.portSecurity,
  ...lessonQuizzes.ripRouting,
  ...lessonQuizzes.services,
  ...lessonQuizzes.soho,
  ...lessonQuizzes.basicLan,
  ...lessonQuizzes.campus,
  ...lessonQuizzes.hospital,
  ...lessonQuizzes.ecommerce,
  ...lessonQuizzes.cliBasics,
  ...lessonQuizzes.addDevice,
  ...lessonQuizzes.ospfRouting,
  ...lessonQuizzes.bgpRouting,
  ...lessonQuizzes.stpProtocol,
  ...lessonQuizzes.aclSecurity,
  ...lessonQuizzes.natPat,
  ...lessonQuizzes.ipv6Addressing,
  ...lessonQuizzes.wirelessWlan,
  ...lessonQuizzes.qosTraffic,
  ...lessonQuizzes.sdnNetdevops,
  ...lessonQuizzes.cybersecurity,
  ...lessonQuizzes.subnetting,
  ...lessonQuizzes.tcpUdpOsi,
  ...lessonQuizzes.cliGuidedLessons
];

function normalizeProjectKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, '');
}

export function getQuizQuestionsForProject(projectId?: string): SdnQuizQuestion[] {
  if (!projectId) return defaultFallbackQuiz;

  // Direct match
  if (lessonQuizzes[projectId] && lessonQuizzes[projectId].length > 0) {
    return lessonQuizzes[projectId];
  }

  // Normalized key match
  const norm = normalizeProjectKey(projectId);
  for (const [k, v] of Object.entries(lessonQuizzes)) {
    if (normalizeProjectKey(k) === norm && v.length > 0) {
      return v;
    }
  }

  // Substring / domain matching
  if (norm.includes('pccmd') || norm.includes('cmd')) return lessonQuizzes.pcCmd;
  if (norm.includes('basicswitch') || norm.includes('switchbasic')) return lessonQuizzes.basicSwitch;
  if (norm.includes('vlan')) return lessonQuizzes.vlan;
  if (norm.includes('dhcp')) return lessonQuizzes.routerDhcp;
  if (norm.includes('static')) return lessonQuizzes.staticRouting;
  if (norm.includes('security') || norm.includes('portsec')) return lessonQuizzes.portSecurity;
  if (norm.includes('rip')) return lessonQuizzes.ripRouting;
  if (norm.includes('service')) return lessonQuizzes.services;
  if (norm.includes('soho')) return lessonQuizzes.soho;
  if (norm.includes('lan') || norm.includes('basiclan')) return lessonQuizzes.basicLan;
  if (norm.includes('campus')) return lessonQuizzes.campus;
  if (norm.includes('hospital')) return lessonQuizzes.hospital;
  if (norm.includes('ecom') || norm.includes('commerce')) return lessonQuizzes.ecommerce;
  if (norm.includes('device') || norm.includes('cable')) return lessonQuizzes.addDevice;
  if (norm.includes('ospf')) return lessonQuizzes.ospfRouting;
  if (norm.includes('bgp')) return lessonQuizzes.bgpRouting;
  if (norm.includes('stp') || norm.includes('spanning')) return lessonQuizzes.stpProtocol;
  if (norm.includes('acl') || norm.includes('accesslist')) return lessonQuizzes.aclSecurity;
  if (norm.includes('nat') || norm.includes('pat')) return lessonQuizzes.natPat;
  if (norm.includes('ipv6')) return lessonQuizzes.ipv6Addressing;
  if (norm.includes('wireless') || norm.includes('wifi') || norm.includes('wlan')) return lessonQuizzes.wirelessWlan;
  if (norm.includes('qos')) return lessonQuizzes.qosTraffic;
  if (norm.includes('sdn') || norm.includes('netdevops')) return lessonQuizzes.sdnNetdevops;
  if (norm.includes('subnet')) return lessonQuizzes.subnetting;
  if (norm.includes('tcp') || norm.includes('udp') || norm.includes('osi')) return lessonQuizzes.tcpUdpOsi;

  if (norm.includes('teachmebeginner') || norm.includes('tmbeg')) {
    return lessonQuizzes.basicSwitch || defaultFallbackQuiz;
  }
  if (norm.includes('teachmeintermediate') || norm.includes('tmint')) {
    return lessonQuizzes.vlan || defaultFallbackQuiz;
  }
  if (norm.includes('teachmeadvanced') || norm.includes('tmadv')) {
    return lessonQuizzes.routerDhcp || defaultFallbackQuiz;
  }
  if (norm.includes('clilesson') || norm.includes('cliguided')) {
    return lessonQuizzes.cliGuidedLessons || lessonQuizzes.cliBasics || defaultFallbackQuiz;
  }

  return defaultFallbackQuiz;
}

export function answerSdnQuiz(
  questionId: string,
  choice: number,
  projectId?: string,
  language: 'tr' | 'en' = 'tr'
): { correct: boolean; explanation: string; points: number } {
  const pool = getQuizQuestionsForProject(projectId);
  const q = pool.find(x => x.id === questionId) || defaultFallbackQuiz.find(x => x.id === questionId);

  if (!q) {
    throw new Error('Unknown quiz question');
  }

  const isCorrect = choice === q.answer;
  const expStr = typeof q.explanation === 'object' ? (q.explanation[language] || q.explanation.tr) : q.explanation;
  const awardedPoints = isCorrect ? (q.points || 10) : 0;

  return {
    correct: isCorrect,
    explanation: expStr,
    points: awardedPoints
  };
}

// Backward compatibility export for sdnQuizQuestions
export const sdnQuizQuestions: Array<{ id: string; question: string; choices: string[]; answer: number; explanation: string }> = defaultFallbackQuiz.map(q => ({
  id: q.id,
  question: typeof q.question === 'object' ? q.question.tr : q.question,
  choices: Array.isArray(q.choices) ? q.choices : q.choices.tr,
  answer: q.answer,
  explanation: typeof q.explanation === 'object' ? q.explanation.tr : q.explanation
}));
