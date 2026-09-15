'use client';

import {
  Server, Compass, Layers, RefreshCw, Network, Link2,
  Triangle, Globe, Shield, Lock, GitBranch, Wifi,
  Share2, Radio, LayoutGrid, Cpu, Flame, Smartphone,
  Cloud, Workflow, Printer, Terminal, Database
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Scenario type union
// ---------------------------------------------------------------------------
export type ScenarioType =
  // Basic
  | 'soho'
  | 'star'
  | 'ring'
  | 'full-mesh'
  | 'partial-mesh'
  | 'grid-2d'
  // Advanced Architecture & Data Center
  | 'fat-tree'
  | 'spine-leaf'
  | 'hybrid-enterprise'
  // Wireless & IoT & Automation
  | 'wireless'
  | 'enterprise-wlc'
  | 'iot-smart-home'
  | 'office-printer-iot'
  | 'enterprise-services'
  | 'netauto-python'
  // Switching & LAN
  | 'vlan-trunk'
  | 'etherchannel'
  | 'stp'
  | 'roas'
  // Routing & WAN
  | 'routing'
  | 'ospf'
  | 'triangle'
  | 'multi-area-ospf'
  | 'bgp-dual-homed'
  | 'nat'
  // Security & Edge
  | 'dmz-firewall'
  | 'acl'
  | 'port-security';

export type ScenarioCategory = 'basic' | 'topology' | 'datacenter' | 'wireless' | 'services' | 'switching' | 'routing' | 'security';

// ---------------------------------------------------------------------------
// Scenario metadata
// ---------------------------------------------------------------------------
export interface ScenarioDefinition {
  id: ScenarioType;
  icon: LucideIcon;
  labelTr: string;
  labelEn: string;
  descTr: string;
  descEn: string;
  objectiveTr?: string;
  objectiveEn?: string;
  badgeTr?: string;
  badgeEn?: string;
  /** Whether the pcCount selector should be shown */
  showPcCount: boolean;
  /** Category for grouping in UI */
  category: ScenarioCategory;
}

export const SCENARIOS: ScenarioDefinition[] = [
  // ── Temel & Klasik Ağ Yapıları (Topologies) ───────────────────────────
  {
    id: 'soho',
    icon: Server,
    labelTr: 'SOHO (Küçük Ofis / Ev Ağı)',
    labelEn: 'SOHO (Small Office / Home Office)',
    descTr: '1 Router (DHCP & NAT Gateway), 1 L2 Switch ve istemci bilgisayarlarından oluşan temel yerel ağ.',
    descEn: '1 Router (DHCP & NAT Gateway), 1 L2 Switch, and client PCs forming a foundational local network.',
    objectiveTr: 'DHCP havuzu üzerinden otomatik IP adresi dağıtımı, varsayılan ağ geçidi ve temel yerel ağ iletişimini test etmek.',
    objectiveEn: 'Verify automatic dynamic IP assignment via DHCP pool, default gateway routing, and local LAN connectivity.',
    badgeTr: 'Popüler',
    badgeEn: 'Popular',
    showPcCount: true,
    category: 'basic',
  },
  {
    id: 'star',
    icon: Share2,
    labelTr: 'Yıldız (Star) Topolojisi',
    labelEn: 'Star Topology',
    descTr: 'Merkezi bir omurga anahtar (Switch) etrafına radyal olarak bağlanmış uç iş istasyonları mimarisi.',
    descEn: 'Workstations connected radially to a central backbone switch in a hub-and-spoke star formation.',
    objectiveTr: 'Merkezi anahtarlama mimarisinde MAC adres tablosunun öğrenilmesi ve tek nokta anahtarlama mantığını incelemek.',
    objectiveEn: 'Observe MAC address table learning and single-point central switching architecture behaviour.',
    badgeTr: 'Klasik',
    badgeEn: 'Classic',
    showPcCount: true,
    category: 'topology',
  },
  {
    id: 'ring',
    icon: RefreshCw,
    labelTr: 'Halka (Ring) Topolojisi',
    labelEn: 'Ring Topology',
    descTr: '4 anahtarın kapalı bir dairesel döngü oluşturacak şekilde birbirine bağlandığı yedekli halka ağı.',
    descEn: '4 switches interconnected in a closed loop ring architecture for loop and redundancy analysis.',
    objectiveTr: 'Halka topolojilerinde ağ döngülerini (loop), alternatif rota geçişlerini ve STP engelleme mekanizmasını gözlemlemek.',
    objectiveEn: 'Examine switching loops, alternative failover paths, and STP loop prevention in a ring structure.',
    badgeTr: 'Yedekli',
    badgeEn: 'Redundant',
    showPcCount: true,
    category: 'topology',
  },
  {
    id: 'full-mesh',
    icon: LayoutGrid,
    labelTr: 'Tam Mesh (Full Mesh) Yönlendirme',
    labelEn: 'Full Mesh Routing',
    descTr: '4 Yönlendiricinin tamamının birbirine doğrudan Gigabit/Serial hatlarla bağlı olduğu sıfır kesinti mimarisi.',
    descEn: '4 Routers fully interconnected with direct multi-links providing zero-downtime high availability.',
    objectiveTr: 'Maksimum hata toleransı ve çok yollu dinamik yönlendirme (OSPF multipath) rotalarını test etmek.',
    objectiveEn: 'Test maximum fault-tolerance, dynamic multi-path routing (OSPF ECMP), and link-failure recovery.',
    badgeTr: 'Yüksek Hata Toleransı',
    badgeEn: 'High Availability',
    showPcCount: true,
    category: 'topology',
  },
  {
    id: 'partial-mesh',
    icon: GitBranch,
    labelTr: 'Kısmi Mesh (Partial Mesh)',
    labelEn: 'Partial Mesh Topology',
    descTr: 'Merkez (Core) yönlendiricilerin tam bağlı, şube (Spoke) uçlarının optimize maliyetle bağlandığı kurumsal yapı.',
    descEn: 'Core routers fully meshed while branch spokes are cost-optimized with dual-homing links.',
    objectiveTr: 'Maliyet-performans dengeli kurumsal WAN topolojilerinde yedekli şube erişilebilirliğini doğrulamak.',
    objectiveEn: 'Validate branch redundancy and cost-performance trade-offs in enterprise WAN topologies.',
    badgeTr: 'Optimizasyon',
    badgeEn: 'Optimized',
    showPcCount: true,
    category: 'topology',
  },
  {
    id: 'grid-2d',
    icon: Cpu,
    labelTr: '2D Izgara / Grid (Torus Matris)',
    labelEn: '2D Grid / Matrix Torus',
    descTr: '2x3 matris şeklinde birbirine yatay ve dikey bağlanan 6 anahtar ve süper hesaplama uç noktaları.',
    descEn: '2x3 matrix of 6 interconnected switches simulating HPC supercomputer grid fabric.',
    objectiveTr: 'Yüksek başarımlı hesaplama (HPC) ızgara yapılarında komşu anahtarlar arası paket yönlendirmeyi analiz etmek.',
    objectiveEn: 'Analyze inter-switch coordinate routing and east-west fabric traffic in high-performance computing grids.',
    showPcCount: true,
    category: 'topology',
  },

  // ── Veri Merkezi & İleri Düzey Mimariler ──────────────────────────────
  {
    id: 'spine-leaf',
    icon: Workflow,
    labelTr: 'Spine-Leaf (Clos Veri Merkezi)',
    labelEn: 'Spine-Leaf Data Center Fabric',
    descTr: '2 Spine (L3 Omurga) ve 3 Leaf (Kenar Anahtar) ile sunucular arası öngörülebilir 2-hop gecikmeli modern bulut mimarisi.',
    descEn: '2 Spine L3 cores and 3 Leaf switches forming a predictable low-latency, non-blocking 2-hop Clos fabric.',
    objectiveTr: 'Modern veri merkezlerinde doğu-batı (East-West) sunucu trafiğini, eşit maliyetli çoklu yol yönlendirmesini (ECMP) ve Clos kumaş yapısını simüle etmek.',
    objectiveEn: 'Simulate East-West server-to-server fabric traffic, Equal-Cost Multi-Path (ECMP), and non-blocking Clos data center interconnects.',
    badgeTr: 'Veri Merkezi',
    badgeEn: 'Data Center',
    showPcCount: true,
    category: 'datacenter',
  },
  {
    id: 'fat-tree',
    icon: Layers,
    labelTr: 'Fat-Tree (3 Katmanlı Kurumsal DC)',
    labelEn: 'Fat-Tree (3-Tier Enterprise DC)',
    descTr: 'Çekirdek (Core), Dağıtım (Aggregation) ve Erişim (Access) katmanlarından oluşan geleneksel kurumsal omurga ağı.',
    descEn: 'Core, Aggregation (Distribution), and Access layers structured with redundant uplinks for enterprise campus and server farms.',
    objectiveTr: 'Katmanlı hiyerarşik ağ modelinde omurga bant genişliği toplama, erişim katmanı izolasyonu ve yukarı yönlü (uplink) yedekliliği test etmek.',
    objectiveEn: 'Evaluate hierarchical 3-tier networking, aggregation layer bandwidth oversubscription, and redundant core link distribution.',
    badgeTr: 'Kurumsal',
    badgeEn: 'Enterprise',
    showPcCount: true,
    category: 'datacenter',
  },
  {
    id: 'hybrid-enterprise',
    icon: Cloud,
    labelTr: 'Hibrit Kurumsal Kampüs (Firewall & WLC)',
    labelEn: 'Hybrid Campus Network (Firewall & WLC)',
    descTr: 'Merkez Güvenlik Duvarı (Perimeter FW), Kurumsal WLC Denetleyicisi, Şube WAN Router\'ı, DMZ Web Sunucusu ve Wi-Fi İstemcileri.',
    descEn: 'Perimeter Firewall, Campus WLC, Branch WAN Router, DMZ Web Server farm, and roaming Wi-Fi corporate clients.',
    objectiveTr: 'Kurumsal kampüs ortamında çok bölgeli güvenlik (DMZ/İç Ağ/WAN), kablosuz merkezi yönetim ve şube WAN entegrasyonunu uçtan uca doğrulamak.',
    objectiveEn: 'Validate multi-zone perimeter security (DMZ/LAN/WAN), centralized wireless orchestration with WLC, and remote branch WAN transit.',
    badgeTr: 'Firewall + WLC',
    badgeEn: 'Firewall + WLC',
    showPcCount: true,
    category: 'datacenter',
  },

  // ── Kablosuz & IoT ───────────────────────────────────────────────────
  {
    id: 'wireless',
    icon: Wifi,
    labelTr: 'Ev / Ofis Wi-Fi & AP Ağı',
    labelEn: 'SOHO Wi-Fi & AP Network',
    descTr: '1 Yönlendirici, 1 Switch, 1 Bağımsız Erişim Noktası (AP), kablolu iş istasyonları ve kablosuz mobil dizüstü istemciler.',
    descEn: '1 Router, 1 Switch, 1 Standalone Access Point (AP), wired desktop PCs and wireless 802.11 roaming laptops.',
    objectiveTr: 'Kablolu LAN ile kablosuz (802.11 SSID) ağın köprülenmesi ve karma istemcilerin aynı IP havuzundan haberleşmesini test etmek.',
    objectiveEn: 'Test bridging between wired Ethernet and 802.11 wireless infrastructure, SSID association, and unified subnet host reachability.',
    showPcCount: true,
    category: 'wireless',
  },
  {
    id: 'enterprise-wlc',
    icon: Radio,
    labelTr: 'Kurumsal WLC & Çoklu AP Yönetimi',
    labelEn: 'Enterprise WLC & Multi-AP Management',
    descTr: 'Merkezi WLC-5508 Denetleyicisi, çoklu kat AP\'leri (Floor-1/Floor-2) ve dolaşım yapan (roaming) mobil akıllı cihazlar.',
    descEn: 'Centralized WLC-5508 controller orchestrating multi-floor Access Points and seamless roaming mobile clients.',
    objectiveTr: 'Merkezi kablosuz kontrolcü (WLC) üzerinden çoklu AP yayını, kurumsal SSID güvenliği ve mobil istemci dolaşımını yönetmek.',
    objectiveEn: 'Demonstrate central controller-based wireless AP orchestration, corporate WPA2 authentication, and seamless client roaming.',
    badgeTr: 'WLC',
    badgeEn: 'WLC',
    showPcCount: true,
    category: 'wireless',
  },
  {
    id: 'iot-smart-home',
    icon: Smartphone,
    labelTr: 'Akıllı Ev & IoT Sensör Mesh Ağı',
    labelEn: 'Smart Home & IoT Mesh Network',
    descTr: 'IoT Ağ Geçidi, Akıllı Termostat, Aydınlatma, Güvenlik Kamerası ve Akıllı Hoparlör gibi uç akıllı cihazlar.',
    descEn: 'Dedicated IoT Gateway managing smart climate thermostats, smart lights, surveillance security cams, and voice assistants.',
    objectiveTr: 'Nesnelerin İnterneti (IoT) ekosisteminde sensör verilerinin toplanması, HTTP telemetri panelleri ve IoT cihaz kontrolünü incelemek.',
    objectiveEn: 'Examine sensor telemetry ingestion, local device HTTP control dashboards, and IoT device isolation on dedicated subnets.',
    badgeTr: 'IoT',
    badgeEn: 'IoT',
    showPcCount: true,
    category: 'wireless',
  },
  {
    id: 'office-printer-iot',
    icon: Printer,
    labelTr: 'Ofis Yazıcı & Akıllı Cihazlar',
    labelEn: 'Office Printer & IoT Devices',
    descTr: 'Ağ Yazıcısı (Print Server), İklim Sensörü, Yönetici İş İstasyonu ve Tablet İstemcilerinden oluşan modern ofis yapısı.',
    descEn: 'Network Laser Printer (Print Server), environmental sensor, management workstation, and staff mobile tablets.',
    objectiveTr: 'Ofis ortamlarında paylaşılan ağ yazıcısı web yönetim arayüzü, IoT çevre denetimi ve çoklu istemci erişilebilirliğini test etmek.',
    objectiveEn: 'Verify office peripheral sharing (print server HTTP interface), environmental telemetry, and mixed wired/wireless staff access.',
    badgeTr: 'Yazıcı & Mobil',
    badgeEn: 'Printer & Mobile',
    showPcCount: true,
    category: 'services',
  },
  {
    id: 'enterprise-services',
    icon: Database,
    labelTr: 'Kurumsal Ağ Servisleri (HTTP/DNS/Syslog)',
    labelEn: 'Enterprise Network Services (HTTP/DNS/Syslog)',
    descTr: 'İntranet Web Sunucu, Yetkili DNS Çözümleyici, Syslog & SNMP Telemetri Toplayıcı Sunucu ve DevOps PC İstasyonu.',
    descEn: 'Dedicated Enterprise Intranet Web Server, Authoritative DNS Resolver, Syslog & SNMP Collector, and DevOps Engineer workstation.',
    objectiveTr: 'Kurumsal ağlarda isim çözümleme (DNS A kayıtları), intranet web yayını ve merkezi log/telemetri yönetimini uçtan uca doğrulamak.',
    objectiveEn: 'Validate end-to-end DNS domain resolution (corp.local / log.corp), HTTP intranet hosting, and central syslog telemetry collection.',
    badgeTr: 'Servisler',
    badgeEn: 'Services',
    showPcCount: true,
    category: 'services',
  },
  {
    id: 'netauto-python',
    icon: Terminal,
    labelTr: 'Python Ağ Otomasyonu (Netmiko/NAPALM)',
    labelEn: 'Python Network Automation Lab',
    descTr: 'Python Otomasyon İstasyonu (Netmiko/Scapy/RESTCONF), Bant Dışı Yönetim (OOBM) Anahtarı ve Uzaktan Yönetilen Router Filosu.',
    descEn: 'Python Network Automation Station with OOBM management switch and multi-router target fleet configured with SSH/VTY access.',
    objectiveTr: 'Python betikleriyle ağ cihazlarına SSH/VTY üzerinden bağlanma, otomatik konfigürasyon dağıtımı ve telemetri çekme simülasyonu.',
    objectiveEn: 'Simulate automated fleet configuration provisioning, Netmiko/NAPALM CLI script execution, and out-of-band management workflows.',
    badgeTr: 'Python / DevOps',
    badgeEn: 'Python / DevOps',
    showPcCount: true,
    category: 'services',
  },

  // ── Anahtarlama (Switching) ───────────────────────────────────────────
  {
    id: 'vlan-trunk',
    icon: Network,
    labelTr: 'VLAN & 802.1Q Trunk Segmentasyonu',
    labelEn: 'VLAN & 802.1Q Trunk Segmentation',
    descTr: '2 Switch arasında 802.1Q Trunk omurga hattı ve VLAN 10 (Yönetim) ile VLAN 20 (Satış) mantıksal izolasyonu.',
    descEn: '2 Switches connected via 802.1Q trunk link enforcing logical broadcast isolation between VLAN 10 and VLAN 20.',
    objectiveTr: 'Yerel ağda yayın alanlarını (broadcast domain) bölmek, VLAN etiketleme (tagging) ve trunk geçiş kurallarını test etmek.',
    objectiveEn: 'Analyze broadcast domain separation, 802.1Q tag encapsulation, and same-VLAN inter-switch frame forwarding.',
    showPcCount: true,
    category: 'switching',
  },
  {
    id: 'etherchannel',
    icon: Link2,
    labelTr: 'EtherChannel (LACP Bağlantı Birleştirme)',
    labelEn: 'EtherChannel (LACP Link Aggregation)',
    descTr: '2 Switch arasında 2 adet GigabitEthernet fiziksel hattın Port-Channel 1 mantıksal arayüzünde birleştirilmesi.',
    descEn: '2 Switches bundling multiple physical Gigabit links into a single logical Port-Channel 1 interface with LACP.',
    objectiveTr: 'Bant genişliğini 2 katına çıkarma, yük dengeleme (load-balancing) ve hat arızasında kesintisiz veri aktarımını incelemek.',
    objectiveEn: 'Demonstrate multi-link bandwidth aggregation, active-active load sharing, and physical link failure resilience.',
    showPcCount: true,
    category: 'switching',
  },
  {
    id: 'stp',
    icon: GitBranch,
    labelTr: 'STP (Spanning Tree Protokolü)',
    labelEn: 'STP (Spanning Tree Protocol)',
    descTr: '3 Switch\'in üçgen döngü oluşturduğu, Root Bridge seçimi ve Blocking port ile döngüsüz yedekli ağ yapısı.',
    descEn: '3 Switches in a redundant triangle loop running STP with Root Bridge election and blocking alternate ports.',
    objectiveTr: 'Katman 2 yayın fırtınalarını (broadcast storm) önleme, Root Bridge seçim algoritması ve hat kopmasında STP yakınsamasını test etmek.',
    objectiveEn: 'Prevent Layer 2 broadcast loops, evaluate Root Bridge priority elections, and observe STP convergence upon topology link failure.',
    showPcCount: true,
    category: 'switching',
  },
  {
    id: 'roas',
    icon: Layers,
    labelTr: 'ROAS (Router-on-a-Stick Inter-VLAN)',
    labelEn: 'ROAS (Router-on-a-Stick Inter-VLAN)',
    descTr: '1 Yönlendirici üzerinde alt arayüzler (gi0/0.10, gi0/0.20) ve 802.1Q trunk switch ile VLAN arası yönlendirme.',
    descEn: '1 Router configured with 802.1Q sub-interfaces routing traffic between distinct VLAN segments across a single trunk link.',
    objectiveTr: 'Tek bir fiziksel hat üzerinden sub-interface yapılandırmasıyla farklı VLAN\'lardaki cihazların haberleşmesini sağlamak.',
    objectiveEn: 'Facilitate secure inter-VLAN routing across logical sub-interfaces on a single physical trunk link.',
    showPcCount: false,
    category: 'switching',
  },

  // ── Yönlendirme (Routing & WAN) ───────────────────────────────────────
  {
    id: 'routing',
    icon: Compass,
    labelTr: 'Statik Yönlendirme (Static Routing)',
    labelEn: 'Static Routing over Serial WAN',
    descTr: '2 Yönlendirici (R1 & R2) arasında Serial WAN hattı ve elle tanımlanmış `ip route` statik yönlendirme tabloları.',
    descEn: '2 Routers interconnected via point-to-point Serial WAN link utilizing explicit static route table definitions.',
    objectiveTr: 'Hedef ağlara erişim için statik rotaların (ip route network mask next-hop) nasıl yazıldığını ve çalıştığını öğrenmek.',
    objectiveEn: 'Master manual static route configuration (ip route dest mask next-hop) and next-hop forwarding resolution.',
    showPcCount: true,
    category: 'routing',
  },
  {
    id: 'ospf',
    icon: RefreshCw,
    labelTr: 'OSPF Tek Alan (Single Area 0)',
    labelEn: 'OSPF Single Area 0 Dynamic Routing',
    descTr: '2 Yönlendirici arasında OSPF Link-State protokolü, komşuluk kurma ve dinamik rota tablosu güncellemesi.',
    descEn: '2 Routers running OSPF Area 0 Link-State dynamic routing protocol with automatic adjacency and route exchange.',
    objectiveTr: 'Dinamik yönlendirmede Hello paketleri, OSPF komşuluk durumları (FULL/2-WAY) ve LSA veritabanı senkronizasyonunu test etmek.',
    objectiveEn: 'Observe OSPF Hello handshake, neighbor state transitions (FULL), SPF metric calculation, and dynamic routing updates.',
    showPcCount: true,
    category: 'routing',
  },
  {
    id: 'triangle',
    icon: Triangle,
    labelTr: 'Üçgen OSPF Omurga Ağı (Triangle Mesh)',
    labelEn: 'Triangle Mesh OSPF Backbone',
    descTr: '3 Yönlendirici (R1, R2, R3) arasında tam bağlı üçgen Serial/Gigabit ağ ve yedekli OSPF dinamik rotaları.',
    descEn: '3 Routers interconnected in a full triangle mesh running OSPF dynamic routing with alternate backup paths.',
    objectiveTr: 'Çok yollu yönlendirme mimarisinde bir WAN hattı kesildiğinde OSPF\'in otomatik olarak trafiği alternatif hatta aktarmasını incelemek.',
    objectiveEn: 'Demonstrate dynamic failover, SPF metric recalculation, and traffic re-routing when a backbone WAN link fails.',
    showPcCount: true,
    category: 'routing',
  },
  {
    id: 'multi-area-ospf',
    icon: RefreshCw,
    labelTr: 'Çok Alanlı OSPF (Multi-Area Hierarchy)',
    labelEn: 'Multi-Area OSPF Hierarchy',
    descTr: 'Alan Sınır Yönlendiricileri (ABR), Area 0 (Backbone), Area 1 ve Area 2 şube alanlarını içeren hiyerarşik yönlendirme.',
    descEn: 'Hierarchical OSPF design featuring Area Border Routers (ABRs) bridging Backbone Area 0 with regional Area 1 and Area 2.',
    objectiveTr: 'Büyük ölçekli ağlarda yönlendirme tablosu optimizasyonu, ABR görevleri ve alanlar arası (Inter-Area LSA Type 3) trafik akışını test etmek.',
    objectiveEn: 'Analyze large-scale routing hierarchy, ABR boundary packet handling, and Inter-Area LSA route propagation.',
    badgeTr: 'İleri Seviye',
    badgeEn: 'Advanced',
    showPcCount: true,
    category: 'routing',
  },
  {
    id: 'bgp-dual-homed',
    icon: Globe,
    labelTr: 'BGP Dual-Homed Kurumsal WAN',
    labelEn: 'BGP Dual-Homed Multi-ISP WAN',
    descTr: 'Kurumsal Kenar Yönlendiricisi (AS 65000), iki bağımsız ISP Yönlendiricisine (AS 100 & AS 200) bağlı eBGP mimarisi.',
    descEn: 'Enterprise edge router (AS 65000) dual-homed to two upstream ISP provider routers (AS 100 and AS 200) running eBGP.',
    objectiveTr: 'Dış Ağ Ağ Geçidi Protokolü (eBGP) komşuluklarını, AS-Path seçimini ve ISP kesintisinde çoklu sağlayıcı yedekliliğini test etmek.',
    objectiveEn: 'Test exterior gateway eBGP peering, Autonomous System path policies, and redundant multi-homed ISP internet egress.',
    badgeTr: 'BGP / ISP',
    badgeEn: 'BGP / ISP',
    showPcCount: true,
    category: 'routing',
  },
  {
    id: 'nat',
    icon: Globe,
    labelTr: 'NAT / PAT (Port Address Translation)',
    labelEn: 'NAT / PAT (Port Address Translation)',
    descTr: 'Kenar Yönlendirici (Edge-R1) üzerinde Özel IP bloğunun (192.168.1.0/24) Genel IP\'ye dinamik NAT Overload ile dönüştürülmesi.',
    descEn: 'Edge Router performing dynamic NAT Overload (PAT) mapping private LAN IP space into a single public ISP routable address.',
    objectiveTr: 'İç yerel (Inside Local) adreslerin dış genel (Outside Global) adreslere PAT tablosu üzerinden dinamik çevrilmesini doğrulamak.',
    objectiveEn: 'Verify Port Address Translation (PAT) session tables, private IP obfuscation, and public internet access for private hosts.',
    showPcCount: true,
    category: 'routing',
  },

  // ── Güvenlik & Kenar (Security) ───────────────────────────────────────
  {
    id: 'dmz-firewall',
    icon: Flame,
    labelTr: '3 Bacaklı Güvenlik Duvarı & DMZ Mimarisi',
    labelEn: '3-Zone Stateful Firewall & DMZ Architecture',
    descTr: 'Durumsal Güvenlik Duvarı (Firewall); Dış İnternet (Outside), Arındırılmış Sunucu Bölgesi (DMZ) ve Güvenli İç Ağ (Inside).',
    descEn: 'Stateful Hardware Firewall partitioning traffic across Outside WAN, DMZ Public Web Server, and Protected Inside Corporate LAN.',
    objectiveTr: 'Güvenlik bölgeleri (Zones) oluşturma, DMZ sunucularına dışarıdan sadece HTTP/HTTPS izin verme ve iç ağı dış tehditlerden izole etmek.',
    objectiveEn: 'Enforce perimeter stateful inspection, permit strictly audited HTTP/HTTPS to DMZ servers, and block unauthorized WAN-to-LAN access.',
    badgeTr: 'Firewall',
    badgeEn: 'Firewall',
    showPcCount: true,
    category: 'security',
  },
  {
    id: 'acl',
    icon: Shield,
    labelTr: 'Genişletilmiş ACL Paket Filtreleme',
    labelEn: 'Extended Access Control List (ACL)',
    descTr: 'Kenar Yönlendiricide tanımlı Genişletilmiş ACL 100 ile HTTP web trafiğine izin veren, ICMP ping isteklerini engelleyen güvenlik labı.',
    descEn: 'Router configured with Extended Access List 100 permitting HTTP web requests while strictly denying ICMP and unwanted protocol packets.',
    objectiveTr: 'Katman 3 ve Katman 4 protokol/port bazlı paket filtreleme (Permit/Deny) ve ACL kurallarının doğru arayüze uygulanmasını test etmek.',
    objectiveEn: 'Evaluate Layer 3/Layer 4 protocol and port filtering, rule sequence matching, and interface inbound/outbound access-group binding.',
    showPcCount: true,
    category: 'security',
  },
  {
    id: 'port-security',
    icon: Lock,
    labelTr: 'Port Güvenliği (Sticky MAC & Violation)',
    labelEn: 'Switch Port Security & Violation Actions',
    descTr: 'Switch portlarında Sticky MAC öğrenme, maksimum 1 MAC sınırı ve yetkisiz cihaz takıldığında otomatik port kapatma (Shutdown).',
    descEn: 'Switch Access Ports enforcing Sticky MAC learning, max 1 host limit, and automatic violation err-disable / shutdown protection.',
    objectiveTr: 'Yetkisiz fiziksel cihaz bağlantılarını (Rogue Host) engelleme, MAC adresi sahteciliğine karşı koruma ve port güvenlik ihlalini simüle etmek.',
    objectiveEn: 'Prevent unauthorized rogue hardware insertion, MAC address spoofing attacks, and observe automatic violation port shutdown actions.',
    showPcCount: true,
    category: 'security',
  },
];

// Category labels for UI grouping
export const CATEGORY_LABELS: Record<ScenarioCategory, { tr: string; en: string }> = {
  basic: { tr: 'Temel & Başlangıç', en: 'Basic & Starters' },
  topology: { tr: 'Standart Topolojiler', en: 'Standard Topologies' },
  datacenter: { tr: 'Veri Merkezi & Kurumsal', en: 'Data Center & Enterprise' },
  wireless: { tr: 'Kablosuz & IoT', en: 'Wireless & IoT' },
  services: { tr: 'Servisler & Otomasyon', en: 'Services & Automation' },
  switching: { tr: 'Anahtarlama (L2/L3)', en: 'Switching (L2/L3)' },
  routing: { tr: 'Yönlendirme & WAN', en: 'Routing & WAN' },
  security: { tr: 'Güvenlik & Firewall', en: 'Security & Firewalls' },
};
