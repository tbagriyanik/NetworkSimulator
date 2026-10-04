import type { SdnQuizQuestion } from './sdnQuiz';

export const coreLessonQuizzes: Record<string, SdnQuizQuestion[]> = {
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
        en: 'Which key is used in CLI for contextual help and available commands?'
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
  ]
};
