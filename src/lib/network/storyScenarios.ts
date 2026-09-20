import type { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

export interface StoryChoiceOption {
  label: string;
  bonusPoints: number;
  effectText: string;
}

export interface StoryChoice {
  question: string;
  options: StoryChoiceOption[];
}

export interface IncidentEvent {
  title: string;
  detail: string;
  urgency: 'normal' | 'critical' | 'bonus';
}

export interface StoryStep {
  id: string;
  title: string;
  level: 'Başlangıç' | 'Orta' | 'İleri' | 'Uzman';
  narrative: string;
  objective: string;
  hint: string;
  learn: string;
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
  badge: string;
  description: string;
  role: string;
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
    id: 'soc_incident_response',
    title: 'Siber Olay Müdahalesi (SOC)',
    badge: 'KRIZ VE GÜVENLİK',
    description: 'Şirket ağında Anomali tespit edildi! SOC Analisti olarak sızma girişimlerini engelleyin ve ağ güvenliğini restore edin.',
    role: 'Kıdemli SOC Analisti',
    iconName: 'ShieldAlert',
    steps: [
      {
        id: 'soc_1',
        title: 'Tehdit İzolasyon Katmanı',
        level: 'Başlangıç',
        narrative: '[ALARM]: Sistem Odası 404. portta anormallik saptandı. Dış erişimi denetlemek için topolojiye ilk Firewall korumasını yerleştir.',
        objective: 'Çalışma alanına bir Firewall cihazı ekle.',
        hint: 'Sol cihaz paletinden "Firewall" simgesine tıklayıp kanvasa yerleştir.',
        learn: 'Firewall, iç ve dış ağlar arasında trafiği filtrelenmiş bir kapı görevi görerek zararlı erişimleri engeller.',
        points: 120,
        incidentEvent: {
          title: 'ACİL BİLDİRİM',
          detail: 'Saldırganlar rastgele IP taraması yapıyor. İzolasyon paneli hazırlanmalı!',
          urgency: 'critical',
        },
        check: (devices) => devices.some((d) => d.type === 'firewall'),
      },
      {
        id: 'soc_2',
        title: 'Analiz Terminali Bağlantısı',
        level: 'Başlangıç',
        narrative: 'Olay yeri incelemesi için analiz bilgisayarını sisteme entegre et ve en az bir aktif bağlantı hattı kur.',
        objective: 'Bir PC ekle ve kabloyla Firewall veya Switch’e bağla.',
        hint: 'PC’yi çalışma alanına ekleyip bağlantı modunda portları birleştir.',
        learn: 'Analiz bilgisayarları ağ pencerelerini dinlemek için izole portlara bağlanır.',
        points: 140,
        choice: {
          question: 'Analiz bilgisayarına nasıl bir erişim politikası uygulanmalı?',
          options: [
            { label: 'Sıkı Kısıtlanmış Erişim', bonusPoints: 30, effectText: 'Minimum ayrıcalık ilkesi uygulandı.' },
            { label: 'Geçici Tam Yetkili Erişim', bonusPoints: 10, effectText: 'Hızlı analiz sağlandı ancak risk artırıldı.' },
          ],
        },
        check: (devices, connections) =>
          devices.some((d) => d.type === 'pc') && connections.length >= 1,
      },
      {
        id: 'soc_3',
        title: 'Sıkılaştırılmış IP Adresleme',
        level: 'Orta',
        narrative: 'Dinamik IP sahteciliğini önlemek için Analiz PC’sine manuel Statik IP ve Alt Ağ Maskesi tanımla.',
        objective: 'PC üzerinde geçerli IP ve Subnet bilgisi yapılandır.',
        hint: 'PC’ye tıklayıp Ağ Ayarları sekmesinden Statik IP ve Maske gir (ör. 192.168.1.50).',
        learn: 'Statik IP tanımlaması, kritik analiz cihazlarının IP çakışmasını ve sahtekarlıklarını önler.',
        points: 160,
        check: (devices) => devices.some((d) => d.type === 'pc' && hasConfiguredPcNetwork(d)),
      },
      {
        id: 'soc_4',
        title: 'Aktif Savunma Kuralları',
        level: 'İleri',
        narrative: 'Saldırı paketlerini engellemek üzere Firewall arayüzünde ilk kural kümesini oluştur.',
        objective: 'Firewall cihazına en az bir kural ekle.',
        hint: 'Firewall penceresini aç, Kurallar sekmesinden yeni kural oluştur.',
        learn: 'Firewall kuralları kaynak IP, hedef IP ve port bazlı paket kontrolü sağlar.',
        points: 200,
        incidentEvent: {
          title: 'SALDIRI ENGELENDİ',
          detail: 'Port 8080 üzerinden gelen bağlantı isteği kural veritabanı ile eşleştirildi.',
          urgency: 'bonus',
        },
        check: (devices) =>
          devices.some((d) => d.type === 'firewall' && Array.isArray(d.firewallRules) && d.firewallRules.length > 0),
      },
      {
        id: 'soc_5',
        title: 'Ağ Geçidi & Yönlendirme İzolasyonu',
        level: 'İleri',
        narrative: 'Trafiği güvenli bölgeden kontrol merkezi yönlendiricisine aktarmak için bir Router ekle ve IP ataması yap.',
        objective: 'Topolojiye bir Router ekle ve en az bir portuna geçerli IP tanımla.',
        hint: 'Router cihazını ekle, port ayarlarına girip arayüz IP’sini aktifleştir.',
        learn: 'Router, farklı VLAN ve alt ağlar arasındaki trafiği kontrol altında tutar.',
        points: 220,
        check: (devices, _, states) =>
          devices.some((d) => d.type === 'router' && hasConfiguredIp(d, states)),
      },
      {
        id: 'soc_6',
        title: 'Tam Güvenlikli SOC Altyapısı',
        level: 'Uzman',
        narrative: 'Tüm bileşenleri birleştir: En az 3 cihaz (PC, Router, Firewall) ve en az 3 aktif bağlantı ile operasyonu tamamla.',
        objective: '3 cihazlı ve 3 bağlantılı güvenli SOC topolojisini doğrula.',
        hint: 'Topolojide cihazların ve kabloların tam bağlı olduğundan emin ol.',
        learn: 'Derinlemesine savunma (Defense-in-depth) mimarisi çok katmanlı güvenlik kontrolü gerektirir.',
        points: 300,
        check: (devices, connections) => devices.length >= 3 && connections.length >= 3,
      },
    ],
  },
  {
    id: 'smart_office_iot',
    title: 'Akıllı Ofis & IoT Kurulumu',
    badge: 'KURUMSAL DÖNÜŞÜM',
    description: 'Hızla büyüyen bir teknoloji şirketi için yüksek hızlı, modern kablolu/kablosuz ve IoT destekli ağ kurun.',
    role: 'Baş Ağ Mimarı',
    iconName: 'Cpu',
    steps: [
      {
        id: 'so_1',
        title: 'Ağ Omurgası Oluşturma',
        level: 'Başlangıç',
        narrative: 'Ofis çalışanlarının ve cihazların toplanacağı ana omurga Switch cihazını sahaya yerleştir.',
        objective: 'Çalışma alanına bir L2 veya L3 Switch ekle.',
        hint: 'Cihaz listesinden Switch L2 veya Switch L3 seçerek ekle.',
        learn: 'Switchler yerel ağdaki (LAN) tüm cihazların yüksek hızda haberleşmesini sağlar.',
        points: 100,
        check: (devices) => devices.some((d) => d.type === 'switchL2' || d.type === 'switchL3'),
      },
      {
        id: 'so_2',
        title: 'İstemci Bilgisayarları',
        level: 'Başlangıç',
        narrative: 'Ofisteki mühendislik ekibi için ilk çalışma bilgisayarını topolojiye yerleştir.',
        objective: 'Çalışma alanına en az 1 PC ekle.',
        hint: 'Paletten PC simgesine tıklayıp kanvasa yerleştir.',
        learn: 'Uç cihazlar ağ servislerini kullanan veya sunan son düğümlerdir.',
        points: 110,
        check: (devices) => devices.some((d) => d.type === 'pc'),
      },
      {
        id: 'so_3',
        title: 'Fiziksel Kablolama',
        level: 'Başlangıç',
        narrative: 'PC ile Switch arasında kesintisiz Gigabit kablo bağlantısını kur.',
        objective: 'PC ve Switch arasında bağlantı sağla.',
        hint: 'Kabla aracını seçip PC portu ile Switch portunu birleştir.',
        learn: 'Doğru kablolama fiziksel katman (Layer 1) hatalarını engeller.',
        points: 130,
        check: (devices, connections) =>
          devices.some((d) => d.type === 'pc') &&
          devices.some((d) => d.type === 'switchL2' || d.type === 'switchL3') &&
          connections.length >= 1,
      },
      {
        id: 'so_4',
        title: 'Akıllı Bina Sensörü (IoT)',
        level: 'Orta',
        narrative: 'Ofis iklimlendirme ve güvenlik takibi için topolojiye bir IoT cihazı dahil et.',
        objective: 'Topolojiye en az 1 IoT cihazı ekle.',
        hint: 'Cihaz menüsünden IoT cihazını seçip çalışma alanına ekle.',
        learn: 'IoT cihazları hafif ağ protokolleri ile ortam verilerini merkezi sisteme aktarır.',
        points: 170,
        incidentEvent: {
          title: 'SENSÖR BİLDİRİMİ',
          detail: 'Sıcaklık ve nem sensörü ilk veri paketini göndermeye hazır.',
          urgency: 'normal',
        },
        check: (devices) => devices.some((d) => d.type === 'iot'),
      },
      {
        id: 'so_5',
        title: 'İnternet Ağ Geçidi & DHCP',
        level: 'İleri',
        narrative: 'Ofisin dış dünyaya açılması ve otomatik IP dağıtımı için bir Router ekle.',
        objective: 'Topolojiye Router ekle ve Switch’e bağla.',
        hint: 'Router cihazını yerleştir ve kabloyla Switch’e bağla.',
        learn: 'Routerlar farklı IP blokları arasındaki yönlendirmeyi ve DHCP servislerini barındırır.',
        points: 210,
        check: (devices, connections) =>
          devices.some((d) => d.type === 'router') && connections.length >= 2,
      },
      {
        id: 'so_6',
        title: 'Eksiksiz Akıllı Ofis Doğrulaması',
        level: 'Uzman',
        narrative: 'En az 4 cihaz (PC, IoT, Switch, Router) ve 3 aktif bağlantı ile akıllı ofis altyapısını tamamla.',
        objective: '4 cihaz ve 3 bağlantılı ofis ağını doğrula.',
        hint: 'Eksik cihaz veya kablo varsa tamamla.',
        learn: 'Modüler ofis mimarileri hem kablolu hem IoT yüklerini sorunsuz taşır.',
        points: 280,
        check: (devices, connections) => devices.length >= 4 && connections.length >= 3,
      },
    ],
  },
  {
    id: 'disaster_recovery_ha',
    title: 'Felaket Kurtarma & Yedeklilik',
    badge: 'YÜKSEK ERİŞİLEBİLİRLİK',
    description: 'Kritik sunucu merkezinde tek nokta arızalarını (SPOF) engellemek için yedekli ağ hatları ve çift router mimarisi kurun.',
    role: 'Altyapı Güvenilirlik Mühendisi (SRE)',
    iconName: 'RefreshCw',
    steps: [
      {
        id: 'dr_1',
        title: 'Çift Ağ Geçidi Mimarisi',
        level: 'Başlangıç',
        narrative: 'Ana router arızalandığında trafiğin kesilmemesi için topolojiye tam 2 adet Router yerleştir.',
        objective: 'Çalışma alanına 2 adet Router ekle.',
        hint: 'Paletten 2 ayrı Router cihazı ekle.',
        learn: 'Çift router (Active/Standby veya Load Balancing) yüksek erişilebilirlik (HA) sağlar.',
        points: 130,
        check: (devices) => devices.filter((d) => d.type === 'router').length >= 2,
      },
      {
        id: 'dr_2',
        title: 'Yedekli Hat Kablolaması',
        level: 'Orta',
        narrative: 'Router’lar arasına ve ortak Switch’e bağlantı hatları çekerek yedekli fiziksel yollar oluştur.',
        objective: 'En az 3 adet aktif bağlantı kablosu bağla.',
        hint: 'Cihazlar arasında birden fazla kablo hattı çek.',
        learn: 'Yedekli fiziksel hatlar kablo kopması veya port arızasında iletişimin sürmesini sağlar.',
        points: 170,
        check: (_, connections) => connections.length >= 3,
      },
      {
        id: 'dr_3',
        title: 'Arayüz Adresleme',
        level: 'Orta',
        narrative: 'Her iki Router üzerinde en az birer arayüzü IP adresleriyle yapılandır.',
        objective: 'Router’larda IP adreslerinin tanımlandığını doğrula.',
        hint: 'Her iki router cihazının arayüz ayarlarına IP bilgisi gir.',
        learn: 'Yedekli geçitlerde her router’ın benzersiz IP ve sanal geçit (VRRP/HSRP) IP’si bulunur.',
        points: 210,
        check: (devices, _, states) =>
          devices.filter((d) => d.type === 'router' && hasConfiguredIp(d, states)).length >= 2,
      },
      {
        id: 'dr_4',
        title: 'Merkezi Sunucu Ekleme',
        level: 'İleri',
        narrative: 'Felaket anında verilerin korunacağı veritabanı sunucusunu (Server/PC) topolojiye dahil et.',
        objective: 'Topolojiye bir PC/Sunucu ekle ve statik IP ver.',
        hint: 'PC ekleyip IP ve Maske bilgilerini eksiksiz doldur.',
        learn: 'Kritik sunucular sabit IP adresleriyle yedekli geçitleri varsayılan gateway olarak kullanır.',
        points: 230,
        check: (devices) => devices.some((d) => d.type === 'pc' && hasConfiguredPcNetwork(d)),
      },
      {
        id: 'dr_5',
        title: 'Yedekli Güvenlik Duvarı',
        level: 'Uzman',
        narrative: 'Sunucu önünde güvenlik denetimi için bir Firewall ekle ve kuralını tanımla.',
        objective: 'Firewall ekle ve en az 1 kural yaz.',
        hint: 'Firewall cihazı ekleyip Kurallar bölümünden kural oluştur.',
        learn: 'Yedekli yapılarda güvenlik duvarları durum bilgisini (Stateful Synchronization) paylaşır.',
        points: 260,
        check: (devices) =>
          devices.some((d) => d.type === 'firewall' && Array.isArray(d.firewallRules) && d.firewallRules.length > 0),
      },
      {
        id: 'dr_6',
        title: 'HA Altyapı Doğrulaması',
        level: 'Uzman',
        narrative: 'En az 5 cihaz ve 4 bağlantı hattı ile sıfır kesinti hedefleyen felaket kurtarma ağını tamamla.',
        objective: '5 cihaz ve 4 bağlantı ile topolojiyi doğrula.',
        hint: 'Eksik cihaz veya yedekli hatları tamamla.',
        learn: 'Tam yedekli altyapılar% 99.999 kesintisizlik (Five Nines) standartlarına ulaşır.',
        points: 320,
        check: (devices, connections) => devices.length >= 5 && connections.length >= 4,
      },
    ],
  },
];
