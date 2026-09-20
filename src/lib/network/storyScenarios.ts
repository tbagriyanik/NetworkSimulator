import type { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

export interface StoryChoiceOption {
  label: string;
  labelEn?: string;
  bonusPoints: number;
  effectText: string;
  effectTextEn?: string;
}

export interface StoryChoice {
  question: string;
  questionEn?: string;
  options: StoryChoiceOption[];
}

export interface IncidentEvent {
  title: string;
  titleEn?: string;
  detail: string;
  detailEn?: string;
  urgency: 'normal' | 'critical' | 'bonus';
}

export interface StoryStep {
  id: string;
  title: string;
  titleEn?: string;
  level: 'Başlangıç' | 'Orta' | 'İleri' | 'Uzman';
  levelEn?: string;
  narrative: string;
  narrativeEn?: string;
  objective: string;
  objectiveEn?: string;
  hint: string;
  hintEn?: string;
  learn: string;
  learnEn?: string;
  points: number;
  incidentEvent?: IncidentEvent;
  choice?: StoryChoice;
  check: (
    devices: CanvasDevice[],
    connections: CanvasConnection[],
    deviceStates?: Map<string, SwitchState>
  ) => boolean;
}

export interface StoryCampaign {
  id: string;
  title: string;
  titleEn?: string;
  badge: string;
  badgeEn?: string;
  category: 'Basit' | 'Orta' | 'İleri';
  description: string;
  descriptionEn?: string;
  role: string;
  roleEn?: string;
  iconName: string;
  steps: StoryStep[];
}

const isValidIpv4 = (value: unknown): boolean =>
  typeof value === 'string' &&
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(value.trim());

const hasConfiguredIp = (device: CanvasDevice, deviceStates?: Map<string, SwitchState>): boolean => {
  if (isValidIpv4(device?.ip)) return true;
  const state = deviceStates?.get(device?.id);
  if (!state) return false;
  return Object.values(state.ports ?? {}).some((port) => isValidIpv4(port?.ipAddress));
};

const hasConfiguredPcNetwork = (device: CanvasDevice): boolean =>
  isValidIpv4(device.ip) &&
  isValidIpv4(device.subnet) &&
  (device.ipConfigMode === 'static' || device.ipConfigMode === 'dhcp');

export const STORY_CAMPAIGNS: StoryCampaign[] = [
  {
    id: 'smart_office_iot',
    title: 'Akıllı Ofis & IoT Kurulumu',
    titleEn: 'Smart Office & IoT Setup',
    badge: 'KURUMSAL DÖNÜŞÜM',
    badgeEn: 'ENTERPRISE TRANSFORMATION',
    category: 'Basit',
    description: 'Hızla büyüyen bir teknoloji şirketi için yüksek hızlı, modern kablolu/kablosuz ve IoT destekli ağ kurun.',
    descriptionEn: 'Build a high-speed modern wired/wireless and IoT-enabled network for a fast-growing tech company.',
    role: 'Baş Ağ Mimarı',
    roleEn: 'Lead Network Architect',
    iconName: 'Cpu',
    steps: [
      {
        id: 'so_1',
        title: 'Ağ Omurgası Oluşturma',
        titleEn: 'Creating Network Backbone',
        level: 'Başlangıç',
        levelEn: 'Beginner',
        narrative: 'Ofis çalışanlarının ve cihazların toplanacağı ana omurga Switch cihazını sahaya yerleştir.',
        narrativeEn: 'Deploy the main backbone Switch on site where office employees and devices will connect.',
        objective: 'Çalışma alanına bir L2 veya L3 Switch ekle.',
        objectiveEn: 'Add an L2 or L3 Switch to the workspace.',
        hint: 'Cihaz listesinden Switch L2 veya Switch L3 seçerek ekle.',
        hintEn: 'Select and add Switch L2 or Switch L3 from the device list.',
        learn: 'Switchler yerel ağdaki (LAN) tüm cihazların yüksek hızda haberleşmesini sağlar.',
        learnEn: 'Switches enable high-speed communication between all devices on the local area network (LAN).',
        points: 100,
        check: (devices) => devices.some((d) => d.type === 'switchL2' || d.type === 'switchL3'),
      },
      {
        id: 'so_2',
        title: 'İstemci Bilgisayarları',
        titleEn: 'Client Workstations',
        level: 'Başlangıç',
        levelEn: 'Beginner',
        narrative: 'Ofisteki mühendislik ekibi için ilk çalışma bilgisayarını topolojiye yerleştir.',
        narrativeEn: 'Place the first workstation on the topology for the office engineering team.',
        objective: 'Çalışma alanına en az 1 PC ekle.',
        objectiveEn: 'Add at least 1 PC to the workspace.',
        hint: 'Paletten PC simgesine tıklayıp kanvasa yerleştir.',
        hintEn: 'Click the PC icon in the palette and place it onto the canvas.',
        learn: 'Uç cihazlar ağ servislerini kullanan veya sunan son düğümlerdir.',
        learnEn: 'Endpoints are end nodes that consume or provide network services.',
        points: 110,
        check: (devices) => devices.some((d) => d.type === 'pc'),
      },
      {
        id: 'so_3',
        title: 'Fiziksel Kablolama',
        titleEn: 'Physical Cabling',
        level: 'Başlangıç',
        levelEn: 'Beginner',
        narrative: 'PC ile Switch arasında kesintisiz Gigabit kablo bağlantısını kur.',
        narrativeEn: 'Establish an uninterrupted Gigabit cable connection between the PC and the Switch.',
        objective: 'PC ve Switch arasında bağlantı sağla.',
        objectiveEn: 'Connect the PC to the Switch.',
        hint: 'Kablo aracını seçip PC portu ile Switch portunu birleştir.',
        hintEn: 'Select the cable tool and join a PC port with a Switch port.',
        learn: 'Doğru kablolama fiziksel katman (Layer 1) hatalarını engeller.',
        learnEn: 'Proper cabling prevents physical layer (Layer 1) errors.',
        points: 130,
        check: (devices, connections) =>
          devices.some((d) => d.type === 'pc') &&
          devices.some((d) => d.type === 'switchL2' || d.type === 'switchL3') &&
          connections.length >= 1,
      },
      {
        id: 'so_4',
        title: 'Akıllı Bina Sensörü (IoT)',
        titleEn: 'Smart Building Sensor (IoT)',
        level: 'Orta',
        levelEn: 'Intermediate',
        narrative: 'Ofis iklimlendirme ve güvenlik takibi için topolojiye bir IoT cihazı dahil et.',
        narrativeEn: 'Include an IoT device on the topology for climate control and security monitoring.',
        objective: 'Topolojiye en az 1 IoT cihazı ekle.',
        objectiveEn: 'Add at least 1 IoT device to the topology.',
        hint: 'Cihaz menüsünden IoT cihazını seçip çalışma alanına ekle.',
        hintEn: 'Select the IoT device from the device menu and add it to the workspace.',
        learn: 'IoT cihazları hafif ağ protokolleri ile ortam verilerini merkezi sisteme aktarır.',
        learnEn: 'IoT devices transmit environmental data to central systems via lightweight network protocols.',
        points: 170,
        incidentEvent: {
          title: 'SENSÖR BİLDİRİMİ',
          titleEn: 'SENSOR NOTIFICATION',
          detail: 'Sıcaklık ve nem sensörü ilk veri paketini göndermeye hazır.',
          detailEn: 'Temperature and humidity sensor is ready to send its first data packet.',
          urgency: 'normal',
        },
        check: (devices) => devices.some((d) => d.type === 'iot'),
      },
      {
        id: 'so_5',
        title: 'İnternet Ağ Geçidi & DHCP',
        titleEn: 'Internet Gateway & DHCP',
        level: 'İleri',
        levelEn: 'Advanced',
        narrative: 'Ofisin dış dünyaya açılması ve otomatik IP dağıtımı için bir Router ekle.',
        narrativeEn: 'Add a Router to connect the office to the internet and handle automatic IP distribution.',
        objective: 'Topolojiye Router ekle ve Switch’e bağla.',
        objectiveEn: 'Add a Router to the topology and connect it to the Switch.',
        hint: 'Router cihazını yerleştir ve kabloyla Switch’e bağla.',
        hintEn: 'Place the Router and connect it to the Switch with a cable.',
        learn: 'Routerlar farklı IP blokları arasındaki yönlendirmeyi ve DHCP servislerini barındırır.',
        learnEn: 'Routers perform routing between different IP subnets and host DHCP services.',
        points: 210,
        check: (devices, connections) =>
          devices.some((d) => d.type === 'router') && connections.length >= 2,
      },
      {
        id: 'so_6',
        title: 'Eksiksiz Akıllı Ofis Doğrulaması',
        titleEn: 'Complete Smart Office Verification',
        level: 'Uzman',
        levelEn: 'Expert',
        narrative: 'En az 4 cihaz (PC, IoT, Switch, Router) ve 3 aktif bağlantı ile akıllı ofis altyapısını tamamla.',
        narrativeEn: 'Complete the smart office infrastructure with at least 4 devices (PC, IoT, Switch, Router) and 3 active links.',
        objective: '4 cihaz ve 3 bağlantılı ofis ağını doğrula.',
        objectiveEn: 'Verify office network with 4 devices and 3 links.',
        hint: 'Eksik cihaz veya kablo varsa tamamla.',
        hintEn: 'Complete any missing devices or cables.',
        learn: 'Modüler ofis mimarileri hem kablolu hem IoT yüklerini sorunsuz taşır.',
        learnEn: 'Modular office architectures smoothly carry both wired and IoT traffic loads.',
        points: 280,
        check: (devices, connections) => devices.length >= 4 && connections.length >= 3,
      },
    ],
  },
  {
    id: 'soc_incident_response',
    title: 'Siber Olay Müdahalesi (SOC)',
    titleEn: 'Cyber Incident Response (SOC)',
    badge: 'KRIZ VE GÜVENLİK',
    badgeEn: 'CRISIS & SECURITY',
    category: 'Orta',
    description: 'Şirket ağında Anomali tespit edildi! SOC Analisti olarak sızma girişimlerini engelleyin ve ağ güvenliğini restore edin.',
    descriptionEn: 'Anomaly detected in corporate network! As a SOC Analyst, block intrusion attempts and restore security.',
    role: 'Kıdemli SOC Analisti',
    roleEn: 'Senior SOC Analyst',
    iconName: 'ShieldAlert',
    steps: [
      {
        id: 'soc_1',
        title: 'Tehdit İzolasyon Katmanı',
        titleEn: 'Threat Isolation Layer',
        level: 'Başlangıç',
        levelEn: 'Beginner',
        narrative: '[ALARM]: Sistem Odası 404. portta anormallik saptandı. Dış erişimi denetlemek için topolojiye ilk Firewall korumasını yerleştir.',
        narrativeEn: '[ALERT]: Anomaly detected on server room port 404. Deploy initial Firewall protection to inspect external traffic.',
        objective: 'Çalışma alanına bir Firewall cihazı ekle.',
        objectiveEn: 'Add a Firewall device to the workspace.',
        hint: 'Sol cihaz paletinden "Firewall" simgesine tıklayıp kanvasa yerleştir.',
        hintEn: 'Click the "Firewall" icon on the left palette and place it on canvas.',
        learn: 'Firewall, iç ve dış ağlar arasında trafiği filtrelenmiş bir kapı görevi görerek zararlı erişimleri engeller.',
        learnEn: 'Firewalls act as filtered gateways between internal and external networks to block malicious access.',
        points: 120,
        incidentEvent: {
          title: 'ACİL BİLDİRİM',
          titleEn: 'URGENT NOTIFICATION',
          detail: 'Saldırganlar rastgele IP taraması yapıyor. İzolasyon paneli hazırlanmalı!',
          detailEn: 'Attackers are performing random IP scanning. Prepare the isolation panel!',
          urgency: 'critical',
        },
        check: (devices) => devices.some((d) => d.type === 'firewall'),
      },
      {
        id: 'soc_2',
        title: 'Analiz Terminali Bağlantısı',
        titleEn: 'Analysis Terminal Connection',
        level: 'Başlangıç',
        levelEn: 'Beginner',
        narrative: 'Olay yeri incelemesi için analiz bilgisayarını sisteme entegre et ve en az bir aktif bağlantı hattı kur.',
        narrativeEn: 'Integrate analysis computer into the system for forensics investigation and build at least one active link.',
        objective: 'Bir PC ekle ve kabloyla Firewall veya Switch’e bağla.',
        objectiveEn: 'Add a PC and connect it with a cable to Firewall or Switch.',
        hint: 'PC’yi çalışma alanına ekleyip bağlantı modunda portları birleştir.',
        hintEn: 'Add PC to workspace and link ports in connection mode.',
        learn: 'Analiz bilgisayarları ağ pencerelerini dinlemek için izole portlara bağlanır.',
        learnEn: 'Analysis terminals connect to isolated ports to monitor network traffic streams.',
        points: 140,
        choice: {
          question: 'Analiz bilgisayarına nasıl bir erişim politikası uygulanmalı?',
          questionEn: 'What access policy should be applied to the analysis terminal?',
          options: [
            { label: 'Sıkı Kısıtlanmış Erişim', labelEn: 'Strictly Restricted Access', bonusPoints: 30, effectText: 'Minimum ayrıcalık ilkesi uygulandı.', effectTextEn: 'Least privilege principle applied.' },
            { label: 'Geçici Tam Yetkili Erişim', labelEn: 'Temporary Full Access', bonusPoints: 10, effectText: 'Hızlı analiz sağlandı ancak risk artırıldı.', effectTextEn: 'Fast analysis enabled but risk increased.' },
          ],
        },
        check: (devices, connections) =>
          devices.some((d) => d.type === 'pc') && connections.length >= 1,
      },
      {
        id: 'soc_3',
        title: 'Sıkılaştırılmış IP Adresleme',
        titleEn: 'Hardened IP Addressing',
        level: 'Orta',
        levelEn: 'Intermediate',
        narrative: 'Dinamik IP sahteciliğini önlemek için Analiz PC’sine manuel Statik IP ve Alt Ağ Maskesi tanımla.',
        narrativeEn: 'Assign manual Static IP and Subnet Mask on the Analysis PC to prevent dynamic IP spoofing.',
        objective: 'PC üzerinde geçerli IP ve Subnet bilgisi yapılandır.',
        objectiveEn: 'Configure valid IP and Subnet on PC.',
        hint: 'PC’ye tıklayıp Ağ Ayarları sekmesinden Statik IP ve Maske gir (ör. 192.168.1.50).',
        hintEn: 'Click PC and enter Static IP & Mask under Network Settings (e.g. 192.168.1.50).',
        learn: 'Statik IP tanımlaması, kritik analiz cihazlarının IP çakışmasını ve sahtekarlıklarını önler.',
        learnEn: 'Static IP assignment prevents IP conflict and spoofing on critical forensic nodes.',
        points: 160,
        check: (devices) => devices.some((d) => d.type === 'pc' && hasConfiguredPcNetwork(d)),
      },
      {
        id: 'soc_4',
        title: 'Aktif Savunma Kuralları',
        titleEn: 'Active Defense Rules',
        level: 'İleri',
        levelEn: 'Advanced',
        narrative: 'Saldırı paketlerini engellemek üzere Firewall arayüzünde ilk kural kümesini oluştur.',
        narrativeEn: 'Create the first rule set in the Firewall interface to block attack packets.',
        objective: 'Firewall cihazına en az bir kural ekle.',
        objectiveEn: 'Add at least one rule to the Firewall device.',
        hint: 'Firewall penceresini aç, Kurallar sekmesinden yeni kural oluştur.',
        hintEn: 'Open Firewall window and create a new rule under Rules tab.',
        learn: 'Firewall kuralları kaynak IP, hedef IP ve port bazlı paket kontrolü sağlar.',
        learnEn: 'Firewall rules provide packet control based on source IP, destination IP, and port.',
        points: 200,
        incidentEvent: {
          title: 'SALDIRI ENGELENDİ',
          titleEn: 'ATTACK BLOCKED',
          detail: 'Port 8080 üzerinden gelen bağlantı isteği kural veritabanı ile eşleştirildi.',
          detailEn: 'Incoming connection request on port 8080 matched the rule database.',
          urgency: 'bonus',
        },
        check: (devices) =>
          devices.some((d) => d.type === 'firewall' && Array.isArray(d.firewallRules) && d.firewallRules.length > 0),
      },
      {
        id: 'soc_5',
        title: 'Ağ Geçidi & Yönlendirme İzolasyonu',
        titleEn: 'Gateway & Routing Isolation',
        level: 'İleri',
        levelEn: 'Advanced',
        narrative: 'Trafiği güvenli bölgeden kontrol merkezi yönlendiricisine aktarmak için bir Router ekle ve IP ataması yap.',
        narrativeEn: 'Add a Router and configure IP assignment to forward traffic from secured zone to central router.',
        objective: 'Topolojiye bir Router ekle ve en az bir portuna geçerli IP tanımla.',
        objectiveEn: 'Add a Router and configure valid IP on at least one port.',
        hint: 'Router cihazını ekle, port ayarlarına girip arayüz IP’sini aktifleştir.',
        hintEn: 'Add Router, enter port settings, and assign interface IP.',
        learn: 'Router, farklı VLAN ve alt ağlar arasındaki trafiği kontrol altında tutar.',
        learnEn: 'Routers maintain control over traffic moving between different VLANs and subnets.',
        points: 220,
        check: (devices, _, states) =>
          devices.some((d) => d.type === 'router' && hasConfiguredIp(d, states)),
      },
      {
        id: 'soc_6',
        title: 'Tam Güvenlikli SOC Altyapısı',
        titleEn: 'Fully Secured SOC Infrastructure',
        level: 'Uzman',
        levelEn: 'Expert',
        narrative: 'Tüm bileşenleri birleştir: En az 3 cihaz (PC, Router, Firewall) ve en az 3 aktif bağlantı ile operasyonu tamamla.',
        narrativeEn: 'Combine all components: Complete the operation with at least 3 devices (PC, Router, Firewall) and 3 active links.',
        objective: '3 cihazlı ve 3 bağlantılı güvenli SOC topolojisini doğrula.',
        objectiveEn: 'Verify secure SOC topology with 3 devices and 3 links.',
        hint: 'Topolojide cihazların ve kabloların tam bağlı olduğundan emin ol.',
        hintEn: 'Ensure devices and cables are fully connected on the topology.',
        learn: 'Derinlemesine savunma (Defense-in-depth) mimarisi çok katmanlı güvenlik kontrolü gerektirir.',
        learnEn: 'Defense-in-depth architecture requires multi-layered security controls.',
        points: 300,
        check: (devices, connections) => devices.length >= 3 && connections.length >= 3,
      },
    ],
  },
  {
    id: 'disaster_recovery_ha',
    title: 'Felaket Kurtarma & Yedeklilik',
    titleEn: 'Disaster Recovery & High Availability',
    badge: 'YÜKSEK ERİŞİLEBİLİRLİK',
    badgeEn: 'HIGH AVAILABILITY',
    category: 'İleri',
    description: 'Kritik sunucu merkezinde tek nokta arızalarını (SPOF) engellemek için yedekli ağ hatları ve çift router mimarisi kurun.',
    descriptionEn: 'Build redundant network links and dual router architecture to eliminate single points of failure (SPOF).',
    role: 'Altyapı Güvenilirlik Mühendisi (SRE)',
    roleEn: 'Site Reliability Engineer (SRE)',
    iconName: 'RefreshCw',
    steps: [
      {
        id: 'dr_1',
        title: 'Çift Ağ Geçidi Mimarisi',
        titleEn: 'Dual Gateway Architecture',
        level: 'Başlangıç',
        levelEn: 'Beginner',
        narrative: 'Ana router arızalandığında trafiğin kesilmemesi için topolojiye tam 2 adet Router yerleştir.',
        narrativeEn: 'Place 2 Routers on topology to prevent traffic loss if the primary router fails.',
        objective: 'Çalışma alanına 2 adet Router ekle.',
        objectiveEn: 'Add 2 Routers to the workspace.',
        hint: 'Paletten 2 ayrı Router cihazı ekle.',
        hintEn: 'Add 2 separate Router devices from palette.',
        learn: 'Çift router (Active/Standby veya Load Balancing) yüksek erişilebilirlik (HA) sağlar.',
        learnEn: 'Dual routers (Active/Standby or Load Balancing) provide high availability (HA).',
        points: 130,
        check: (devices) => devices.filter((d) => d.type === 'router').length >= 2,
      },
      {
        id: 'dr_2',
        title: 'Yedekli Hat Kablolaması',
        titleEn: 'Redundant Link Cabling',
        level: 'Orta',
        levelEn: 'Intermediate',
        narrative: 'Router’lar arasına ve ortak Switch’e bağlantı hatları çekerek yedekli fiziksel yollar oluştur.',
        narrativeEn: 'Run link cables between Routers and shared Switch to create redundant physical paths.',
        objective: 'En az 3 adet aktif bağlantı kablosu bağla.',
        objectiveEn: 'Connect at least 3 active link cables.',
        hint: 'Cihazlar arasında birden fazla kablo hattı çek.',
        hintEn: 'Run multiple cable lines between devices.',
        learn: 'Yedekli fiziksel hatlar kablo kopması veya port arızasında iletişimin sürmesini sağlar.',
        learnEn: 'Redundant physical links sustain communication during cable breaks or port failures.',
        points: 170,
        check: (_, connections) => connections.length >= 3,
      },
      {
        id: 'dr_3',
        title: 'Arayüz Adresleme',
        titleEn: 'Interface Addressing',
        level: 'Orta',
        levelEn: 'Intermediate',
        narrative: 'Her iki Router üzerinde en az birer arayüzü IP adresleriyle yapılandır.',
        narrativeEn: 'Configure IP addresses on at least one interface on both Routers.',
        objective: 'Router’larda IP adreslerinin tanımlandığını doğrula.',
        objectiveEn: 'Verify IP addresses are assigned on both Routers.',
        hint: 'Her iki router cihazının arayüz ayarlarına IP bilgisi gir.',
        hintEn: 'Configure IP settings on both router interfaces.',
        learn: 'Yedekli geçitlerde her router’ın benzersiz IP ve sanal geçit (VRRP/HSRP) IP’si bulunur.',
        learnEn: 'In redundant gateways, each router has a unique IP and virtual gateway (VRRP/HSRP) IP.',
        points: 210,
        check: (devices, _, states) =>
          devices.filter((d) => d.type === 'router' && hasConfiguredIp(d, states)).length >= 2,
      },
      {
        id: 'dr_4',
        title: 'Merkezi Sunucu Ekleme',
        titleEn: 'Central Server Integration',
        level: 'İleri',
        levelEn: 'Advanced',
        narrative: 'Felaket anında verilerin korunacağı veritabanı sunucusunu (Server/PC) topolojiye dahil et.',
        narrativeEn: 'Include database server (Server/PC) in topology to safeguard data during disasters.',
        objective: 'Topolojiye bir PC/Sunucu ekle ve statik IP ver.',
        objectiveEn: 'Add a PC/Server to topology and assign static IP.',
        hint: 'PC ekleyip IP ve Maske bilgilerini eksiksiz doldur.',
        hintEn: 'Add PC and configure complete IP & Mask details.',
        learn: 'Kritik sunucular sabit IP adresleriyle yedekli geçitleri varsayılan gateway olarak kullanır.',
        learnEn: 'Critical servers use static IP addresses with redundant gateways as default gateway.',
        points: 230,
        check: (devices) => devices.some((d) => d.type === 'pc' && hasConfiguredPcNetwork(d)),
      },
      {
        id: 'dr_5',
        title: 'Yedekli Güvenlik Duvarı',
        titleEn: 'Redundant Firewall',
        level: 'Uzman',
        levelEn: 'Expert',
        narrative: 'Sunucu önünde güvenlik denetimi için bir Firewall ekle ve kuralını tanımla.',
        narrativeEn: 'Add a Firewall in front of server for security inspection and define its rule.',
        objective: 'Firewall ekle ve en az 1 kural yaz.',
        objectiveEn: 'Add Firewall and create at least 1 rule.',
        hint: 'Firewall cihazı ekleyip Kurallar bölümünden kural oluştur.',
        hintEn: 'Add Firewall device and create rule under Rules section.',
        learn: 'Yedekli yapılarda güvenlik duvarları durum bilgisini (Stateful Synchronization) paylaşır.',
        learnEn: 'In redundant setups, firewalls share stateful synchronization info.',
        points: 260,
        check: (devices) =>
          devices.some((d) => d.type === 'firewall' && Array.isArray(d.firewallRules) && d.firewallRules.length > 0),
      },
      {
        id: 'dr_6',
        title: 'HA Altyapı Doğrulaması',
        titleEn: 'HA Infrastructure Verification',
        level: 'Uzman',
        levelEn: 'Expert',
        narrative: 'En az 5 cihaz ve 4 bağlantı hattı ile sıfır kesinti hedefleyen felaket kurtarma ağını tamamla.',
        narrativeEn: 'Complete disaster recovery network aiming for zero downtime with at least 5 devices and 4 links.',
        objective: '5 cihaz ve 4 bağlantı ile topolojiyi doğrula.',
        objectiveEn: 'Verify topology with 5 devices and 4 links.',
        hint: 'Eksik cihaz veya yedekli hatları tamamla.',
        hintEn: 'Complete missing devices or redundant links.',
        learn: 'Tam yedekli altyapılar% 99.999 kesintisizlik (Five Nines) standartlarına ulaşır.',
        learnEn: 'Fully redundant infrastructures reach 99.999% availability (Five Nines) standards.',
        points: 320,
        check: (devices, connections) => devices.length >= 5 && connections.length >= 4,
      },
    ],
  },
];
