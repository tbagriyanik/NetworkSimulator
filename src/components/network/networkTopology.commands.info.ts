import { Book, FileText, Network, Globe, Layers, Server, Shield, Eye, Lightbulb, Zap, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getInfoCategories(isTR: boolean): CommandDefinition[] {
  return [
    {
      id: 'knowledge-stp',
      icon: Book,
      title: isTR ? 'Bilgi: STP Nedir?' : 'Knowledge: What is STP?',
      type: 'info',
      cmds: [
        ['Spanning Tree Protocol', isTR ? 'STP (Spanning Tree Protocol), yerel ağlarda (LAN) fiziksel döngüleri (loop) önlemek için kullanılan bir Layer 2 protokolüdür. Eğer ağda yedekli bağlantılar varsa ve STP yoksa, paketler sonsuz bir döngüye girerek ağı kilitleyebilir (Broadcast Storm). STP, bazı portları bloklayarak döngüsüz bir yapı oluşturur.' : 'STP (Spanning Tree Protocol) is a Layer 2 protocol used to prevent physical loops in local area networks (LANs). If there are redundant links in a network without STP, packets can enter an infinite loop, crashing the network (Broadcast Storm). STP creates a loop-free topology by blocking certain ports.'],
      ]
    },
    {
      id: 'knowledge-dhcp',
      icon: FileText,
      title: isTR ? 'Bilgi: DHCP Nedir?' : 'Knowledge: What is DHCP?',
      type: 'info',
      cmds: [
        ['Dynamic Host Configuration Protocol', isTR ? 'DHCP, ağdaki cihazlara otomatik olarak IP adresi, alt ağ maskesi, varsayılan ağ geçidi ve DNS gibi yapılandırma bilgilerini dağıtan bir protokoldür. Bu sayede her cihazı manuel olarak yapılandırma zahmeti ortadan kalkar ve IP çakışmaları önlenir.' : 'DHCP is a protocol that automatically assigns IP addresses, subnet masks, default gateways, and DNS information to devices on a network. This eliminates the need for manual configuration of each device and helps prevent IP address conflicts.'],
      ]
    },
    {
      id: 'knowledge-vlan',
      icon: Network,
      title: isTR ? 'Bilgi: VLAN Nedir?' : 'Knowledge: What is VLAN?',
      type: 'info',
      cmds: [
        ['Virtual Local Area Network', isTR ? 'VLAN, fiziksel bir yerel ağı mantıksal olarak daha küçük parçalara bölen teknolojidir. Aynı switch üzerindeki kullanıcıları farklı VLAN\'lara ayırarak güvenliği artırabilir ve ağ trafiğini (broadcast) optimize edebilirsiniz. Farklı VLAN\'lar arasındaki iletişim için bir Router veya L3 Switch gerekir.' : 'VLAN is a technology that logically partitions a physical LAN into smaller segments. By placing users on the same switch into different VLANs, you can improve security and optimize network traffic (broadcast). Communication between different VLANs requires a Router or L3 Switch.'],
      ]
    },
    {
      id: 'knowledge-nat',
      icon: Globe,
      title: isTR ? 'Bilgi: NAT & PAT Nedir?' : 'Knowledge: What is NAT & PAT?',
      type: 'info',
      cmds: [
        ['Network Address Translation', isTR ? 'NAT, yerel ağdaki özel (private) IP adreslerini (örn. 192.168.x.x) kamuya açık (public) IP adreslerine dönüştürerek internet erişimi sağlar. Statik NAT birebir eşleşme yaparken, PAT (Port Address Translation / Overload) tek bir public IP üzerinden port numaralarını kullanarak binlerce cihazın aynı anda internete çıkmasını sağlar.' : 'NAT translates private IP addresses (e.g. 192.168.x.x) to public IP addresses for internet access. While Static NAT provides 1-to-1 mapping, PAT (Port Address Translation / Overload) uses unique port numbers on a single public IP to allow thousands of internal hosts to access the internet simultaneously.'],
      ]
    },
    {
      id: 'knowledge-etherchannel',
      icon: Layers,
      title: isTR ? 'Bilgi: EtherChannel Nedir?' : 'Knowledge: What is EtherChannel?',
      type: 'info',
      cmds: [
        ['Link Aggregation / Port Channel', isTR ? 'EtherChannel, 2 ila 8 arasındaki fiziksel Ethernet bağlantısını mantıksal tek bir yüksek hızlı hat (Port-Channel) olarak birleştiren teknolojidir. Hem bant genişliğini artırır hem de fiziksel bir kablo koptuğunda kesintisiz veri akışı (yedeklilik) sağlar. Standart LACP (802.3ad) veya özel PAgP protokolleri ile dinamik kurulabilir.' : 'EtherChannel combines 2 to 8 physical Ethernet links into a single logical high-speed link (Port-Channel). It increases aggregate bandwidth and provides seamless failover redundancy if a link drops. It can be negotiated dynamically using standard LACP (802.3ad) or proprietary PAgP.'],
      ]
    },
    {
      id: 'knowledge-hsrp',
      icon: Server,
      title: isTR ? 'Bilgi: HSRP Nedir?' : 'Knowledge: What is HSRP?',
      type: 'info',
      cmds: [
        ['Hot Standby Router Protocol', isTR ? 'HSRP, birinci ağ geçidinin (Default Gateway) arızalanması durumunda ağ erişiminin kesilmemesi için kullanılan bir yedeklilik protokolüdür. İki veya daha fazla router tek bir Sanal IP (Virtual IP) ve Sanal MAC adresi paylaşır. Aktif (Active) router çöktüğünde Bekleyen (Standby) router milisaniyeler içinde görevi devralır.' : 'HSRP is a redundancy protocol designed to ensure uninterrupted default gateway connectivity. Two or more routers share a single Virtual IP and Virtual MAC address. If the Active router fails, the Standby router seamlessly takes over within milliseconds.'],
      ]
    },
    {
      id: 'knowledge-ospf',
      icon: Network,
      title: isTR ? 'Bilgi: OSPF Nedir?' : 'Knowledge: What is OSPF?',
      type: 'info',
      cmds: [
        ['Open Shortest Path First', isTR ? 'OSPF, açık kaynaklı ve popüler bir Link-State (Bağlantı Durumu) dinamik yönlendirme protokolüdür. En kısa rotayı hesaplamak için Dijkstra (SPF) algoritmasını kullanır. Ağ yapılarını alanlara (Area) bölerek ölçeklenebilirlik sağlar (Area 0 omurgadır). Hızlı uyum sağlama (fast convergence) süresi ile büyük ağlarda tercih edilir.' : 'OSPF is an open standard Link-State dynamic routing protocol using Dijkstra\'s Shortest Path First algorithm. It hierarchically partitions networks into Areas (Area 0 being the backbone) for scalability and provides fast convergence in enterprise networks.'],
      ]
    },
    {
      id: 'knowledge-acl',
      icon: Shield,
      title: isTR ? 'Bilgi: ACL (Erişim Listesi) Nedir?' : 'Knowledge: What is ACL?',
      type: 'info',
      cmds: [
        ['Access Control List', isTR ? 'ACL, ağ cihazlarında geçen paketlerin izin verilip (permit) engelleneceğini (deny) belirleyen kurallar dizisidir. Standart ACL (1-99) sadece kaynak IP adresine bakarken; Genişletilmiş ACL (100-199) kaynak IP, hedef IP, protokol (TCP/UDP/ICMP) ve port numaralarına göre detaylı filtreleme yapar. Her ACL sonuna yazılmayan bir "implicit deny" (örtülü engelleme) kuralı dahildir.' : 'ACL is a set of security rules that filter network traffic by specifying permit or deny conditions. Standard ACLs (1-99) evaluate source IP address only; Extended ACLs (100-199) inspect source IP, destination IP, protocol (TCP/UDP/ICMP), and port numbers. Every ACL has an unwritten "implicit deny" rule at the end.'],
      ]
    },
    {
      id: 'knowledge-ipv6',
      icon: Globe,
      title: isTR ? 'Bilgi: IPv6 & SLAAC Nedir?' : 'Knowledge: What is IPv6 & SLAAC?',
      type: 'info',
      cmds: [
        ['IPv6 & Autoconfiguration', isTR ? 'IPv6, 128-bitlik genişletilmiş adres alanı sunan yeni nesil internet protokolüdür. SLAAC (Stateless Address Autoconfiguration) yöntemi sayesinde cihazlar DHCP sunucusuna ihtiyaç duymadan router önek mesajları (RA) ile otomatik IP yapılandırması alırlar. EUI-64 yöntemi ise cihazın 48-bitlik MAC adresinden benzersiz 64-bitlik Host IP\'si üretir.' : 'IPv6 is the next-generation internet protocol providing a 128-bit address space. With SLAAC (Stateless Address Autoconfiguration), devices receive automatic IP configuration directly via router advertisement (RA) messages without a DHCP server. The EUI-64 mechanism derives a unique 64-bit host address from the device\'s 48-bit MAC address.'],
      ]
    },
    {
      id: 'knowledge-simulation',
      icon: Eye,
      title: isTR ? 'Bilgi: Simülatör ve Araç Kullanımı' : 'Knowledge: Simulator Tools',
      type: 'info',
      cmds: [
        ['NetworkSimulator Kullanım İpuçları', isTR ? 'NetworkSimulator tuvalinde cihazları sürükleyip bırakabilir, portlar arası kablo türünü seçerek (Bakır Düz/Çapraz, Fiber, Seri) bağlayabilirsiniz. Alt paneldeki Paket Yakalama (Packet Capture) sekmesi ile paketlerin OSI katman detaylarını inceleyebilir, Güdümlü Mod (Guided Mode) ile adım adım pratik senaryoları çözebilirsiniz.' : 'In NetworkSimulator, drag-and-drop devices onto the canvas and connect them using appropriate cabling (Copper Straight/Cross, Fiber, Serial). Use the Packet Capture tab to inspect OSI layer encapsulation details, or complete interactive exercises via Guided Mode.'],
      ]
    },
    {
      id: 'packet_trace_diagnostics',
      icon: Eye,
      title: isTR ? 'Paket İzleme & Ağ Teşhis Araçları' : 'Packet & Diagnostics Tools',
      type: 'info',
      cmds: [
        [isTR ? 'Paket İzleme Aracı' : 'Packet Inspector', isTR ? 'Paket simülasyonu esnasında "İzleme Detayı" butonuna basarak Katman 1-7 aşamalarını, kararlarını ve çerçeve anlık görüntülerini (frame snapshot) canlı inceleyebilirsiniz.' : 'Click "Trace Details" during packet simulation to inspect Layer 1-7 pipeline stages, decisions, and frame snapshots.'],
        [isTR ? 'ICMP Hata Kodları' : 'ICMP Error Codes', isTR ? 'ACL engellerinde Code 13 (Admin Prohibited), TTL 0 olduğunda Code 0 (Time Exceeded), rotasız paketlerde Code 0 (Unreachable) ICMP yanıtları üretilir.' : 'Generates ICMP Code 13 for ACL drops, Code 0 for TTL exceeded, and Code 0 for network unreachable.'],
        [isTR ? 'Katman-3 TTL Azaltımı' : 'Layer-3 TTL Decrementing', isTR ? 'Tüm Router ve L3 Switch yönlendirme yollarında paket TTL değeri 1 eksiltilir; 0 olan paketler düşürülür.' : 'Decrements packet TTL by 1 at every L3 hop; drops packets when TTL reaches 0.'],
        [isTR ? 'VLAN & Trunk Teşhisleri' : 'VLAN & Trunk Diagnostics', isTR ? 'Topolojideki bağlı trunk portlar arasındaki Native VLAN uyuşmazlıkları ve Allowed-VLAN farkları otomatik tespit edilir.' : 'Automatically diagnoses Native VLAN and Allowed VLAN mismatches on trunk links.'],
        [isTR ? 'LPM Routing Rasyoneli' : 'LPM Routing Rationale', isTR ? 'Yönlendirme kararları En Uzun Önek Eşleşmesi (LPM), Yönetimsel Mesafe (AD) ve Metrik öncelikleri analiz edilerek gerekçelendirilir ve izleme panelinde gösterilir.' : 'Explains routing decisions based on Longest-Prefix Match (LPM), Administrative Distance (AD), and Metric.'],
      ]
    },
    {
      id: 'knowledge-python',
      icon: FileText,
      title: isTR ? 'Bilgi: Python Yorumlayıcısı Nedir?' : 'Knowledge: What is Python Engine?',
      type: 'info',
      cmds: [
        ['Python Engine', isTR ? 'NetworkSimulator PC cihazlarında yerleşik tam teşekküllü bir Python yorumlayıcısı bulunur. CMD terminalinden "python script.py" yazarak veya Dosya Düzenleyici üzerindeki "Çalıştır" butonuyla betiklerinizi çalıştırabilirsiniz. Nesne Yönelimli Programlama (OOP), Decorator\'lar, Generator\'lar (yield), Hata Yakalama (try/except), Dosya Okuma/Yazma (open, read, write) ve ağ soket simülasyonu (socket, json, requests) tam desteklenir.' : 'NetworkSimulator PC devices feature an integrated Python engine. You can execute scripts via CMD using "python script.py" or via the File Editor "Run" button. OOP (classes/inheritance), Decorators, Generators (yield), Exception handling (try/except), File I/O (open, read, write), and network socket simulation (socket, json, requests) are fully supported.'],
      ]
    },
    {
      id: 'network-terms',
      icon: Book,
      title: isTR ? 'Ağ Terimleri' : 'Network Terms',
      type: 'info',
      cmds: [
        ['IP Address', isTR ? 'Ağda cihazı tanımlayan benzersiz sayısal adres (örn: 192.168.1.1)' : 'Unique numerical address identifying a device on a network (e.g., 192.168.1.1)'],
        ['MAC Address', isTR ? 'Ağ kartının fiziksel adresi, 48-bit onaltılı format (örn: 00-1a-2b-3c-4d-5e)' : 'Physical address of network interface, 48-bit hex format (e.g., 00-1a-2b-3c-4d-5e)'],
        ['Gateway', isTR ? 'Farklı ağlara erişim sağlayan cihaz, genellikle router' : 'Device providing access to other networks, typically a router'],
        ['Subnet Mask', isTR ? 'IP adresinin ağ ve host kısımlarını ayıran sayı (örn: 255.255.255.0)' : 'Separates network and host portions of IP address (e.g., 255.255.255.0)'],
        ['Router', isTR ? 'Ağlar arasında veri yönlendiren cihaz' : 'Device that routes data between networks'],
        ['Switch', isTR ? 'Yerel ağda cihazları birbirine bağlayan cihaz' : 'Device connecting devices in a local area network'],
        ['Firewall', isTR ? 'Yetkisiz ağ erişimlerini engelleyen güvenlik sistemi' : 'Security system blocking unauthorized network access'],
        ['Port', isTR ? 'Hizmet ve protokolleri tanımlayan sayısal kimlik (SSH: 22, HTTP: 80, HTTPS: 443)' : 'Numerical identifier for services (SSH: 22, HTTP: 80, HTTPS: 443)'],
        ['Protocol', isTR ? 'Ağ iletişimi için kuralları tanımlayan standart' : 'Standard defining rules for network communication'],
        ['Bandwidth', isTR ? 'Ağ bağlantısının saniye cinsinden veri aktarım kapasitesi (Mbps, Gbps)' : 'Network link capacity measured in data transfer per second (Mbps, Gbps)'],
        ['Ping', isTR ? 'Cihazlar arasındaki iletişim hızı, milisaniye cinsinden' : 'Communication speed between devices, measured in milliseconds'],
        ['Packet', isTR ? 'Ağda iletilen veri biriminin adı' : 'Unit of data transmitted over network'],
        ['VLAN', isTR ? 'Fiziksel ağı mantıksal gruplara bölen sistem' : 'System partitioning physical network into logical groups'],
        ['Proxy', isTR ? 'İstemci ile sunucu arasında aracı görev yapan sunucu' : 'Server acting as intermediary between client and server'],
        ['VPN', isTR ? 'İnternet üzerinden güvenli ve şifreli bağlantı' : 'Secure encrypted connection over the internet'],
        ['Default Gateway', isTR ? 'Yerel ağ dışındaki hedeflere gönderim yapan varsayılan yönlendirici' : 'Router used as the next hop for destinations outside the local network'],
        ['Broadcast Domain', isTR ? 'Yayın paketlerinin ulaşabildiği mantıksal ağ alanı; VLAN’lar yayın alanını böler' : 'Logical area reached by broadcast traffic; VLANs split broadcast domains'],
        ['Collision Domain', isTR ? 'Ethernet çarpışmalarının oluşabildiği ortak bölüm; modern switch portları bunu ayırır' : 'Shared Ethernet segment where collisions can occur; switch ports isolate it'],
        ['Subnet', isTR ? 'Daha büyük bir IP ağının, subnet mask ile ayrılmış alt ağı' : 'A smaller IP network carved from a larger network by a subnet mask'],
        ['CIDR', isTR ? 'Ağ önekini /24 gibi önek uzunluğuyla gösteren sınıfsız adresleme yöntemi' : 'Classless addressing notation that expresses a prefix length such as /24'],
        ['Unicast / Multicast / Broadcast', isTR ? 'Sırasıyla tek hedefe, seçili alıcılara ve aynı ağdaki tüm alıcılara gönderim' : 'Traffic sent to one destination, a subscribed group, or all hosts on a local segment'],
        ['Access Port', isTR ? 'Genellikle tek bir VLAN’a ait uç cihaz switch portu' : 'Edge switch port that normally carries one access VLAN'],
        ['Trunk Port', isTR ? 'Birden fazla VLAN’ı 802.1Q etiketleriyle taşıyan bağlantı portu' : 'Link port that carries multiple VLANs using 802.1Q tags'],
        ['Native VLAN', isTR ? '802.1Q trunk üzerinde etiketsiz taşınan VLAN' : 'VLAN carried untagged across an 802.1Q trunk'],
        ['Routing Table', isTR ? 'Hedef ağ, next-hop ve çıkış arayüzü bilgilerini tutan yönlendirme tablosu' : 'Table containing destination networks, next hops, and outgoing interfaces'],
        ['Next Hop', isTR ? 'Paketi hedef ağa yaklaştıran bir sonraki router adresi' : 'The next router address used to move a packet toward its destination'],
        ['Metric', isTR ? 'Yönlendirme protokolünün yolları karşılaştırmak için kullandığı maliyet değeri' : 'Cost used by a routing protocol to compare candidate paths'],
        ['Convergence', isTR ? 'Yönlendiricilerin ağ değişikliğinden sonra ortak topoloji bilgisine ulaşması' : 'Process by which routers reach a consistent view after a topology change'],
        ['Latency', isTR ? 'Paketin kaynaktan hedefe ulaşması için geçen süre (ms)' : 'Time required for a packet to travel from source to destination (ms)'],
        ['Jitter', isTR ? 'Ardışık paketlerin gecikme değerlerindeki değişim; ses/video için kritiktir' : 'Variation in packet delay; especially important for voice and video'],
        ['Packet Loss', isTR ? 'Gönderilen paketlerin hedefe ulaşmayan oranı' : 'Percentage of transmitted packets that do not reach the destination'],
        ['Duplex', isTR ? 'Bağlantının tek yönlü (half) veya çift yönlü (full) çalışma biçimi' : 'Whether a link operates half-duplex or full-duplex'],
        ['PoE', isTR ? 'Ethernet kablosu üzerinden veriyle birlikte elektrik sağlama' : 'Supplying electrical power over the same Ethernet cable as data'],
        ['FHRP', isTR ? 'HSRP/VRRP gibi, yedekli varsayılan ağ geçidi sağlayan protokoller ailesi' : 'Protocol family such as HSRP/VRRP that provides a redundant default gateway'],
        ['DHCP Relay', isTR ? 'DHCP yayınlarını farklı bir IP ağına DHCP sunucusuna iletme işlevi' : 'Forwarding DHCP broadcasts to a server on another IP network'],
        ['ACL', isTR ? 'Trafiği kaynak, hedef, protokol veya port koşullarına göre izinleyen/engelleyen kural listesi' : 'Rules that permit or deny traffic by source, destination, protocol, or port'],
        ['NAT / PAT', isTR ? 'IP adreslerini; PAT ise aynı genel IP üzerinde portları dönüştürür' : 'NAT translates IP addresses; PAT also multiplexes many hosts through ports'],
        ['QoS Queue', isTR ? 'Çıkış kapasitesi yetmediğinde paketlerin öncelik ve bant genişliğine göre beklediği kuyruk' : 'Egress queue where packets wait according to priority and bandwidth policy'],
        ['LLDP', isTR ? 'Komşu cihaz ve port bilgilerini keşfetmek için kullanılan standart katman-2 protokolü' : 'Standards-based Layer-2 protocol for discovering neighboring devices and ports'],
        ['EAPOL', isTR ? '802.1X kimlik doğrulama mesajlarını Ethernet üzerinde taşıyan çerçeve' : 'Ethernet frame used to carry 802.1X authentication messages'],
        ['RADIUS', isTR ? 'Merkezi kimlik doğrulama, yetkilendirme ve hesaplama (AAA) protokolü' : 'Centralized authentication, authorization, and accounting (AAA) protocol'],
        ['ESP', isTR ? 'IPsec’in veri gizliliği ve bütünlüğü sağlayan Encapsulating Security Payload bileşeni' : 'IPsec Encapsulating Security Payload providing confidentiality and integrity'],
        ['Overlay / Underlay', isTR ? 'Overlay mantıksal sanal ağdır; underlay onu taşıyan fiziksel/IP altyapıdır' : 'Overlay is the logical virtual network; underlay is the physical/IP transport beneath it'],
      ]
    },
    {
      id: 'abbreviations',
      icon: Zap,
      title: isTR ? 'Ağ Kısaltmaları' : 'Network Abbreviations',
      type: 'info',
      cmds: [
        ['DHCP', isTR ? 'Dynamic Host Configuration Protocol - IP adreslerini otomatik olarak atayan protokol' : 'Dynamic Host Configuration Protocol - automatically assigns IP addresses'],
        ['DNS', isTR ? 'Domain Name System - Alan adlarını IP adreslerine çeviren sistem' : 'Domain Name System - converts domain names to IP addresses'],
        ['ARP', isTR ? 'Address Resolution Protocol - IP adresini MAC adresine çeviren protokol' : 'Address Resolution Protocol - converts IP to MAC address'],
        ['TCP', isTR ? 'Transmission Control Protocol - Güvenilir, bağlantı tabanlı protokol' : 'Transmission Control Protocol - reliable, connection-based protocol'],
        ['UDP', isTR ? 'User Datagram Protocol - Hızlı, bağlantısız protokol' : 'User Datagram Protocol - fast, connectionless protocol'],
        ['SSH', isTR ? 'Secure Shell - Güvenli uzak bağlantı protokolü' : 'Secure Shell - secure remote connection protocol'],
        ['HTTP', isTR ? 'HyperText Transfer Protocol - Web sayfaları için protokol' : 'HyperText Transfer Protocol - protocol for web pages'],
        ['HTTPS', isTR ? 'HTTP Secure - şifreli HTTP protokolü' : 'HTTP Secure - encrypted HTTP protocol'],
        ['FTP', isTR ? 'File Transfer Protocol - Dosya aktarımı protokolü' : 'File Transfer Protocol - file transfer protocol'],
        ['SFTP', isTR ? 'SSH File Transfer Protocol - Güvenli dosya aktarımı' : 'SSH File Transfer Protocol - secure file transfer'],
        ['SMTP', isTR ? 'Simple Mail Transfer Protocol - E-posta gönderme protokolü' : 'Simple Mail Transfer Protocol - email sending protocol'],
        ['POP3', isTR ? 'Post Office Protocol 3 - E-posta alma protokolü' : 'Post Office Protocol 3 - email receiving protocol'],
        ['IMAP', isTR ? 'Internet Message Access Protocol - E-posta yönetimi protokolü' : 'Internet Message Access Protocol - email management protocol'],
        ['QoS', isTR ? 'Quality of Service - Hizmet Kalitesi' : 'Quality of Service - network traffic priority'],
        ['MTU', isTR ? 'Maximum Transmission Unit - Maksimum Aktarım Birimi' : 'Maximum Transmission Unit - maximum packet size'],
        ['RFC', isTR ? 'Request for Comments - İnternet standartlarını tanımlayan dokümanlardır' : 'Request for Comments - internet standard documentation'],
        ['CIDR', isTR ? 'Classless Inter-Domain Routing - IP blokları gösterim yöntemi' : 'Classless Inter-Domain Routing - IP notation method'],
        ['ICMP', isTR ? 'Internet Control Message Protocol - Ağ diagnostik protokolü' : 'Internet Control Message Protocol - network diagnostic protocol'],
        ['MAC', isTR ? 'Media Access Control - Ağ kartının fiziksel adresi, 48-bit onaltılı format (örn: 00-1a-2b-3c-4d-5e)' : 'Media Access Control - physical address of network interface, 48-bit hex format (e.g., 00-1a-2b-3c-4d-5e)'],
        ['IP', isTR ? 'Internet Protocol - Ağda cihazı tanımlayan benzersiz sayısal adres (örn: 192.168.1.1)' : 'Internet Protocol - unique numerical address identifying a device on a network (e.g., 192.168.1.1)'],
        ['NAT', isTR ? 'Network Address Translation - Ağ adresi dönüştürme' : 'Network Address Translation - translates private IPs to public'],
        ['ACL', isTR ? 'Access Control List - Erişim kontrol listesi' : 'Access Control List - filters network traffic'],
        ['VPN', isTR ? 'Virtual Private Network - İnternet üzerinden güvenli ve şifreli bağlantı' : 'Virtual Private Network - secure encrypted connection over the internet'],
        ['WLAN', isTR ? 'Wireless Local Area Network - Kablosuz yerel ağ' : 'Wireless Local Area Network - wireless local network'],
        ['SSID', isTR ? 'Service Set Identifier - Kablosuz ağ adı' : 'Service Set Identifier - wireless network name'],
        ['STP', isTR ? 'Spanning Tree Protocol - Ağ halkalarını önleyen protokol' : 'Spanning Tree Protocol - prevents network loops'],
        ['OSPF', isTR ? 'Open Shortest Path First - Dinamik yönlendirme protokolü' : 'Open Shortest Path First - dynamic routing protocol'],
        ['RIP', isTR ? 'Routing Information Protocol - Basit yönlendirme protokolü' : 'Routing Information Protocol - basic routing protocol'],
        ['BGP', isTR ? 'Border Gateway Protocol - Otonom sistemler arası yönlendirme protokolü' : 'Border Gateway Protocol - inter-AS routing protocol'],
        ['SNMP', isTR ? 'Simple Network Management Protocol - Ağ yönetim protokolü' : 'Simple Network Management Protocol - network management protocol'],
        ['NTP', isTR ? 'Network Time Protocol - Ağ zaman senkronizasyon' : 'Network Time Protocol - network time synchronization'],
        ['LDAP', isTR ? 'Lightweight Directory Access Protocol - Kullanıcı dizin hizmeti' : 'Lightweight Directory Access Protocol - directory service protocol'],
        ['SSL/TLS', isTR ? 'Secure Socket Layer / Transport Layer Security - şifreleme protokolü' : 'Secure Socket Layer / Transport Layer Security - encryption protocol'],
        ['L2TP', isTR ? 'Layer 2 Tunneling Protocol - Tünel oluşturma protokolü' : 'Layer 2 Tunneling Protocol - tunneling protocol'],
        ['GRE', isTR ? 'Generic Routing Encapsulation - Jenerik yönlendirme protokolü' : 'Generic Routing Encapsulation - generic tunneling protocol'],
        ['LAN', isTR ? 'Local Area Network - Yerel alan ağı' : 'Local Area Network - local network'],
        ['WAN', isTR ? 'Wide Area Network - Geniş alan ağı' : 'Wide Area Network - geographically distributed network'],
        ['OSI', isTR ? 'Open Systems Interconnection - Yedi katmanlı referans modeli' : 'Open Systems Interconnection - seven-layer reference model'],
        ['TCP/IP', isTR ? 'Transmission Control Protocol / Internet Protocol - İnternet protokol ailesi' : 'Transmission Control Protocol / Internet Protocol - Internet protocol suite'],
        ['VLSM', isTR ? 'Variable Length Subnet Mask - Değişken uzunluklu alt ağ maskesi' : 'Variable Length Subnet Mask - variable-size subnetting'],
        ['FHRP', isTR ? 'First Hop Redundancy Protocol - Yedekli ilk atlama/ağ geçidi protokolü' : 'First Hop Redundancy Protocol - redundant first-hop gateway protocol'],
        ['HSRP', isTR ? 'Hot Standby Router Protocol - varsayılan ağ geçidi yedekliliği' : 'Hot Standby Router Protocol - first-hop gateway redundancy'],
        ['VRRP', isTR ? 'Virtual Router Redundancy Protocol - Standart sanal router yedekliliği' : 'Virtual Router Redundancy Protocol - standards-based virtual router redundancy'],
        ['PAT', isTR ? 'Port Address Translation - Çoklu hostu portlarla tek genel IP üzerinden taşır' : 'Port Address Translation - multiplexes hosts through one public IP using ports'],
        ['RSTP', isTR ? 'Rapid Spanning Tree Protocol - Daha hızlı STP yakınsaması' : 'Rapid Spanning Tree Protocol - faster STP convergence'],
        ['MSTP', isTR ? 'Multiple Spanning Tree Protocol - VLAN gruplarını birden çok STP örneğine eşler' : 'Multiple Spanning Tree Protocol - maps VLAN groups to multiple STP instances'],
        ['LLDP-MED', isTR ? 'LLDP Media Endpoint Discovery - IP telefon ve medya uç noktası keşfi' : 'LLDP Media Endpoint Discovery - discovery for phones and media endpoints'],
        ['EAPOL', isTR ? 'Extensible Authentication Protocol over LAN - 802.1X Ethernet kimlik doğrulama çerçevesi' : 'Extensible Authentication Protocol over LAN - 802.1X Ethernet authentication frames'],
        ['AAA', isTR ? 'Authentication, Authorization, Accounting - Kimlik doğrulama, yetkilendirme ve hesaplama' : 'Authentication, Authorization, Accounting - identity, permission, and audit functions'],
        ['RADIUS', isTR ? 'Remote Authentication Dial-In User Service - AAA ve 802.1X kimlik doğrulama sunucusu' : 'Remote Authentication Dial-In User Service - AAA and 802.1X authentication service'],
        ['TACACS+', isTR ? 'Terminal Access Controller Access-Control System Plus - Yönetim erişimi için AAA protokolü' : 'Terminal Access Controller Access-Control System Plus - AAA protocol for administrative access'],
        ['IPsec', isTR ? 'Internet Protocol Security - IP katmanında güvenli iletişim paketi' : 'Internet Protocol Security - secure communication at the IP layer'],
        ['ESP', isTR ? 'Encapsulating Security Payload - IPsec veri kapsülleme ve şifreleme bileşeni' : 'Encapsulating Security Payload - IPsec payload encapsulation and encryption component'],
        ['IKE', isTR ? 'Internet Key Exchange - IPsec güvenlik ilişkisinin anahtar değişim protokolü' : 'Internet Key Exchange - key exchange protocol for IPsec security associations'],
        ['MSS', isTR ? 'Maximum Segment Size - TCP veri bölümünün en büyük boyutu' : 'Maximum Segment Size - largest TCP payload segment size'],
        ['DSCP', isTR ? 'Differentiated Services Code Point - IP başlığında QoS sınıflandırma değeri' : 'Differentiated Services Code Point - QoS classification value in the IP header'],
        ['LLQ', isTR ? 'Low Latency Queuing - Öncelikli, düşük gecikmeli kuyruklama' : 'Low Latency Queuing - strict priority queue for low latency'],
        ['CBWFQ', isTR ? 'Class-Based Weighted Fair Queuing - Sınıf tabanlı ağırlıklı adil kuyruklama' : 'Class-Based Weighted Fair Queuing - class-based weighted fair scheduling'],
        ['WFQ', isTR ? 'Weighted Fair Queuing - Ağırlıklı adil kuyruklama' : 'Weighted Fair Queuing - weighted fair scheduling'],
        ['SLA', isTR ? 'Service Level Agreement - Hizmet düzeyi taahhüdü; IP SLA ölçümleriyle izlenebilir' : 'Service Level Agreement - service target measurable with IP SLA probes'],
        ['IP SLA', isTR ? 'IP Service Level Agreement - Sentetik trafikle gecikme, jitter ve erişilebilirlik ölçümü' : 'IP Service Level Agreement - synthetic measurement of latency, jitter, and reachability'],
        ['SDN', isTR ? 'Software-Defined Networking - Kontrol düzlemini yazılımla merkezileştiren yaklaşım' : 'Software-Defined Networking - approach that centralizes control in software'],
        ['YANG', isTR ? 'Yet Another Next Generation - Ağ yapılandırma/veri modelleri için dil' : 'Yet Another Next Generation - language for network configuration and data models'],
        ['NETCONF', isTR ? 'Network Configuration Protocol - YANG verisini güvenli RPC ile yönetme protokolü' : 'Network Configuration Protocol - secure RPC protocol for managing YANG data'],
        ['RESTCONF', isTR ? 'RESTful Configuration Protocol - YANG kaynaklarına HTTP/REST erişimi' : 'RESTful Configuration Protocol - HTTP/REST access to YANG resources'],
        ['API', isTR ? 'Application Programming Interface - Uygulamaların birbirleriyle iletişim arayüzü' : 'Application Programming Interface - interface through which software systems communicate'],
        ['MPLS', isTR ? 'Multiprotocol Label Switching - Etiket anahtarlama tabanlı yüksek hızlı iletim protokolü' : 'Multiprotocol Label Switching - label switching high speed forwarding'],
        ['LDP', isTR ? 'Label Distribution Protocol - MPLS etiketlerini komşular arasında dağıtan protokol' : 'Label Distribution Protocol - protocol for distributing MPLS labels'],
        ['LFIB', isTR ? 'Label Forwarding Information Base - MPLS etiket yönlendirme bilgi tablosu' : 'Label Forwarding Information Base - label switching forwarding table'],
        ['MP-BGP', isTR ? 'Multi-Protocol BGP - IPv4/IPv6 yanı sıra VPNv4 etiketli rotaları taşıyan BGP uzantısı' : 'Multi-Protocol BGP - BGP extension carrying VPNv4 and IPv6 routes'],
        ['VRF', isTR ? 'Virtual Routing and Forwarding - Sanal yönlendirme ve iletim tablosu' : 'Virtual Routing and Forwarding - virtual routing instances'],
        ['RD / RT', isTR ? 'Route Distinguisher / Route Target - VPNv4 rota ayrıştırıcı ve hedef etiketleri' : 'Route Distinguisher / Route Target - VPNv4 route uniqueness and import/export targets'],
        ['NBI / SBI', isTR ? 'Northbound/Southbound Interface - Controller’ın uygulama ve altyapı yönündeki arayüzleri' : 'Northbound/Southbound Interface - controller interfaces toward applications and infrastructure'],
      ]
    },
    {
      id: 'tools_diagnostics',
      icon: Lightbulb,
      title: isTR ? 'Teşhis, Otomatik Düzen & DHCP Yönetimi' : 'Diagnostics, Auto Layout & DHCP Management',
      type: 'info',
      cmds: [
        [isTR ? 'Ağ Sorun Neden Analizcisi' : 'Root Cause Analyzer', isTR ? 'İki cihaz arasında ping gitmeme nedenlerini L1/L2/L3/Gateway/VLAN katmanlarında otomatik denetler ve çözüm önerir.' : 'Diagnoses why ping fails across L1/L2/L3/VLAN/Gateway and provides instant suggested fixes.'],
        [isTR ? 'Otomatik Topoloji Düzenleme' : 'Auto Topology Layout', isTR ? 'Karışık topolojileri tek tıkla Hiyerarşik (3-Tier), Yıldız (Star), Halka (Ring) veya Matris (Grid) geometrisinde dizer.' : 'One-click automatic layout for Hierarchical (3-Tier), Star, Ring, or Grid matrices.'],
        [isTR ? 'DHCP Havuz Yönetimi' : 'DHCP Pool Manager', isTR ? 'Router ve Server DHCP havuz doluluk oranlarını, kiralanmış IP-MAC eşleşmelerini görsel tabloda sunar.' : 'Visual overview of DHCP pool capacity, active client IP/MAC leases, and expiration timers.'],
        [isTR ? 'Kablo Etiketleri' : 'Cable Labels', isTR ? 'Görünüm menüsünden kabloların bağlı olduğu port adlarını (Gi0/0, Fa0/1) tuvalde açıp kapatabilirsiniz.' : 'Toggle port names (Gi0/0, Fa0/1) directly on topology canvas cables from View menu.'],
      ]
    },
  ];
}
