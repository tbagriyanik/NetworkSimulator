import type { SdnQuizQuestion } from './sdnQuiz';

export const advancedLessonQuizzes: Record<string, SdnQuizQuestion[]> = {
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
        tr: 'IOS NAT terminolojisinde iç ağdaki bir cihazın kendi yerel IP adresine ne ad verilir?',
        en: 'In NAT terminology, what is the private IP address of an internal host called?'
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
        en: 'Which three 2.4 GHz channels are non-overlapping in standard deployments?'
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
        tr: 'IOS yapılandırma modundan doğrudan Privileged EXEC moduna (#) dönmek için hangi kısayol kullanılır?',
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
