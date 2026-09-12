# Network Simulator — Kapsamlı Uygulama ve Kullanım Rehberi

**Sürüm / Version:** 5.2.0  
**Doküman Tipi:** Kullanım, Mimari, Komut Referansı ve Laboratuvar Kılavuzu  
**Dil:** Türkçe (Turkish)

---

## 📋 İçindekiler

1. [Genel Özellikler](#1-genel-özellikler)
2. [Detaylı Özellikler ve Protokol Kapsamı](#2-detaylı-özellikler-ve-protokol-kapsamı)
3. [CMD (Komut İstemi) ve Batch Scripting Kullanımı](#3-cmd-komut-istemi-ve-batch-scripting-kullanımı)
4. [Linux Shell / Terminal Kullanımı](#4-linux-shell--terminal-kullanımı)
5. [Bash Scripting ve Betik Kodlama](#5-bash-scripting-ve-betik-kodlama)
6. [Python Programlama ve Nesne Yönelimli (OOP) Kodlama](#6-python-programlama-ve-nesne-yönelimli-oop-kodlama)
7. [Uygulama Genel Arayüzü, Pencere Mimarisi ve Kısayollar](#7-uygulama-genel-arayüzü-pencere-mimarisi-ve-kısayollar)
8. [Cihaz Türleri ve Özellikleri](#8-cihaz-türleri-ve-özellikleri)
9. [Kablo Türleri ve Bağlantı Mantığı](#9-kablo-türleri-ve-bağlantı-mantığı)
10. [Konularına Göre Örnek Laboratuvarlar (Temel, Orta, İleri Seviye)](#10-konularına-göre-örnek-laboratuvarlar-temel-orta-ileri-seviye)

---

## 1. Genel Özellikler

Network Simulator; bilgisayar ağları, anahtarlama (switching), yönlendirme (routing), kablosuz ağlar (wireless), IoT (Nesnelerin İnterneti), siber güvenlik ve sistem yönetimi konularını interaktif ve görsel olarak öğretmek için tasarlanmış tarayıcı tabanlı (client-side) tam kapsamlı bir ağ simülatörüdür.

- **%100 İstemci Taraflı (Client-Side) ve Hızlı:** React 19, Next.js 16 ve TypeScript altyapısıyla herhangi bir sunucu kurulumu gerektirmeden tarayıcıda çalışır.
- **11 Tam Donanımlı Cihaz Tipi:** Router, L2/L3 Switch, Firewall, WLC, AP, PC, IoT, Multiport Hub (`hub`), Aktif Bulut WAN Geçidi (`cloud`), Kablosuz Akıllı Telefon (`mobile`) ve Ağ Yazıcısı (`printer`).
- **🧩 NetSim Modüler Donanım Şasisi & Yuva Yönetimi:** Router ve Switch cihazlarında fiziksel yuvalara (Slots) NetSim WIC-2T (Serial), NetSim HWIC-4ESW (Switch), NetSim SFP-10G-LR (Fiber), NetSim NM-1GE (Copper) modülleri takıp çıkarabilme, Donanım Güç Anahtarı (Power Switch) ile sıcak değişim koruması ve dinamik port tablosu.
- **🗺️ İnteraktif Mini-Harita & Subnet Navigatörü:** Sağ alt köşede sürüklenebilir tuval penceresi, "Ekrana Sığdır" (Fit to Screen) ve OSPF/VLAN/Subnet alanlarına anında kamera odaklama (Focus Subnet).
- **🎨 VLAN & OSPF/BGP Alan Renklendirme Overlay'i:** Andrew Monotone Chain 2D konveks zarf algoritması ve SVG yumuşak yumru çizimi ile OSPF Area 0/1, VLAN Bölgeleri, BGP AS ve IP Subnet'lerinin cihazlar arkasında parlayan renkli bulutlarla gösterimi.
- **🖼️ Snapshot & Checkpoint Portal Modalı:** `createPortal(..., document.body)` ile tam ekran bağımsız modal rendering, anlık topoloji durum dondurma, arama, JSON içe/dışa aktarma ve onaylı geri yükleme (Rollback).
- **🩺 "Neden Ping Gitmiyor?" Kök Neden Teşhisi:** L1 fiziksel link/shutdown, L2 VLAN/Trunk/Native VLAN uyumsuzlukları, L3 Subnet & Default Gateway eksikliklerini otomatik tarayıp çözüm önerileri sunan teşhis motoru ve modalı.
- **🌐 BGP / MP-BGP & MPLS LDP Motorları:** Autonomous System (AS) yönlendirmesi, eBGP/iBGP durum makineleri (`Established`), VRF/RD/RT taşıma, LDP oturumları, LFIB etiket takası ve PHP `Implicit-Null` desteği.
- **📱 Sekmeli Paket Analizi & Mobil Geri Tuşu Uyumlu Pencere Mimarisi:** Paket Analizi penceresi içinde entegre sekmeli (Paket Akışı / İzleme Detayları) görünüm, mobil tam ekran responsive düzen ve tüm sürüklenebilir/modal pencerelerin mobil tarayıcı/donanım Geri düğmesi (`mobile-back-pressed` / `popstate`) ve `Escape` tuşu ile sorunsuz kapatılma altyapısı.
- **📋 Fare Seçimi İle Otomatik Panoya Kopyalama (Auto-Copy):** PC CMD, Linux Terminali, Cihaz Konsol Sekmesi ve Ana CLI Terminal pencerelerinde komut geçmişinden fare ile metin seçilip bırakıldığı anda (`onMouseUp`) otomatik panoya (clipboard) kopyalama.
- **☁️ Fonksiyonel Bulut / WAN Geçit Cihazı (`cloud`) & ICMP Ping:** Topolojideki Bulut cihazı `203.0.113.1` genel WAN IP adresi, `eth0..eth3` portları, kamu DNS/WAN IP'leri (`8.8.8.8`, `1.1.1.1`) için hem Web hem de ICMP Ping yönlendirme ve NTP (`pool.ntp.org`) desteği.
- **📱 Mobil Web Tarayıcı & Web Yönetim:** Akıllı telefon cihazında canlı Adres Çubuğu, Hızlı Yer İmleri (`192.168.1.1`, `8.8.8.8`, `http://iot-panel`) ve TCP port 80 denetimi ile Router/WLC Web Yönetimi, Yazıcı Paneli, IoT Kontrol Paneli ve PC HTTP Sunucusu web sayfalarını render eden Web Tarayıcısı.
- **🖨️ Ağ Yazıcısı & Print Server (Web Management, LPD/IPP Packet Capture & Wi-Fi):** Dual-interface Ethernet/Wi-Fi destekli Ağ Yazıcısı. Dahili Web Yönetim Paneli üzerinden LPD, IPP, JetDirect, AirPrint, SNMP ve TLS protokol yetkilendirmesi, Wi-Fi SSID katılımı, tuval sinyal göstergeleri ve canlı Yazdırma Kuyruğu (`printJobs`) yönetimi. Web tarayıcılardan "Belgeyi Yazdır" butonu ile canlı paket yakalama (`PacketCapturePanel`) ekranına LPD/IPP paket akışlarının yansıtılması.
- **Sürükle-Bırak Topoloji Tasarımı:** Cihazları tuval üzerine sürükleyerek saniyeler içinde karmaşık kurumsal ağ topolojileri oluşturabilirsiniz.
- **Yüksek Performanslı Çizim ve Spatial Partitioning:** 100+ cihaz ve yüzlerce kablo bağlantısı içeren büyük ağlarda bile 60 FPS akıcı performans sağlar.
- **Gerçekçi CLI Terminali:** Cihazlarda `User EXEC`, `Privileged EXEC`, `Global Configuration`, `Interface`, `VLAN`, `Router`, `DHCP` ve `ACL` modlarında gerçek zamanlı komut çalıştırma.
- **Canlı Paket Yakalama ve İnceleme (Packet Capture):** Ağdaki paket trafiğini derinlemesine katman katman (L2 Ethernet, L3 IP, L4 TCP/UDP/ICMP/DHCP/DNS/ARP) inceleme imkanı.
- **Rehberli Dersler ve İnteraktif Quiz Motoru:** 19 adet adım adım rehberli laboratuvar dersi, her konuya özel bilgi quiz'leri ve canlı skor puanlama sistemi.
- **High-DPI Türkçe Destekli Sertifika Motoru:** Tamamlanan başarılar için Türkçe karakterleri (`Ş`, `İ`, `Ğ`, `Ç`, `Ö`, `Ü`) kusursuz işleyen yüksek çözünürlüklü PDF sertifika üretimi.
- **Çoklu Kullanıcı ve Sınıf Odaları:** Öğretmenlerin canlı oda açıp öğrencilerin ilerlemesini anlık takip edebildiği oda altyapısı.

---

## 2. Detaylı Özellikler ve Protokol Kapsamı

### 🔄 Anahtarlama (Switching)
- **VLAN Mimarisi:** Standart ve genişletilmiş VLAN tanımlama (VLAN 1–4094), port erişim (`access`) ve taşıyıcı (`trunk`) modları.
- **802.1Q Trunking & Native VLAN:** Etiketli paket iletimi ve etiketlenmemiş Native VLAN yönetimi.
- **DTP (Dynamic Trunking Protocol):** `switchport mode dynamic auto/desirable` ve `switchport nonegotiate` ile otomatik trunk algılama.
- **VTP (VLAN Trunking Protocol):** VTP Server, Client ve Transparent modları; VTP domain ve parola yapılandırması.
- **Spanning Tree Protocol (STP / RSTP / MSTP):** 802.1D STP, 802.1w RSTP ve 802.1s MSTP döngü engelleme, root bridge seçimi, BPDU yönetimi, PortFast, BPDU Guard ve **STP Loop Guard** (`spanning-tree loopguard default` / `spanning-tree guard loop`).
- **EtherChannel (Port Aggregation):** LACP (802.3ad), PAgP ve Static EtherChannel ile çoklu link birleştirme ve bant genişliği artırma.
- **Port Security:** MAC adresi kısıtlama, `sticky` MAC öğrenme, maksimum cihaz sınırı ve ihlal modları (`shutdown`, `restrict`, `protect`).
- **Voice VLAN:** IP telefon trafiği için öncelikli ses VLAN yapılandırması.
- **DHCP Snooping & DAI:** Sahte (rogue) DHCP sunucularını engelleme, `trust` port tanımlama, canlı **DHCP Snooping Binding Table** ve Dynamic ARP Inspection.

### 🌐 Yönlendirme & Politika Motoru (Routing & Policy Engine)
- **Static & Default Routing:** Statik rotalar, varsayılan rotalar (`0.0.0.0 0.0.0.0`), Administrative Distance ve Floating Static yedeği.
- **RIPv2 & RIPng:** Metrik hesabı (hop count), `no auto-summary`, passive-interface.
- **OSPFv2 & OSPFv3:** Single-Area ve Multi-Area OSPF yapılandırması, Router ID, wildcard maskeler, DR/BDR seçimi ve cost hesabı. OSPF area türleri: stub, NSSA, totally-stub.
- **EIGRP & EIGRP for IPv6:** IPv4/IPv6 AS numarası, `ipv6 router eigrp <as>`, router-id tanımı, arayüz bazlı `ipv6 eigrp <as>` aktifleştirme, DUAL IPv6 metric hesaplaması ve `show ipv6 eigrp neighbors/topology` raporlaması.
- **BGP (Border Gateway Protocol):** eBGP ve iBGP komşuluk tanımları, AS path ve prefix duyuruları.
- **Rota Yeniden Dağıtımı (Route Redistribution):** `redistribute <protocol>` ile OSPF, RIP, EIGRP, BGP, static ve connected rotalar arasında çapraz dağıtım.
- **IP & IPv6 Prefix-List:** `ip/ipv6 prefix-list <name> [seq <n>] {permit|deny} <prefix> [ge <ge>] [le <le>]` kural motoru, ön ek eşleme doğrulama ve `show ip/ipv6 prefix-list` çıktısı.
- **Route-Map Politika Motoru:** `route-map <name> {permit|deny} [<seq>]` mod yapılandırması, `match ip/ipv6 address prefix-list`, `match interface`, `set metric`, `set ip/ipv6 next-hop`, `set local-preference` politikaları ve `show route-map` raporlaması.
- **GLBP & FHRP Sanal Yönlendirme:** HSRP, VRRP ve **GLBP (Gateway Load Balancing Protocol)** sanal router grupları (`glbp <group> ip <ip>`, `glbp priority/preempt/weighting`), AVG (Active Virtual Gateway) seçimi, `0007.b400.XXXX` sanal MAC üretimi ve `show glbp [brief]` izlemesi.
- **NetFlow Trafik İletim Motoru:** `ip flow-export destination <ip> <port>`, `ip flow-export version <5|9>`, arayüz `ip flow ingress/egress` ve canlı `show ip cache flow` istatistik izleme ekranı.
- **Inter-VLAN Routing:** Router-on-a-Stick (Sub-interfaces + `encapsulation dot1q`) ve L3 Switch SVI (`interface vlan`) ile VLAN'lar arası yönlendirme.
- **GRE Tünelleme:** `interface Tunnel`, IP adresi, `tunnel source` ve `tunnel destination` ile noktadan noktaya mantıksal tünel kurulumu.
- **IPsec / Crypto:** IKE Phase 1 (ISAKMP SA) ve IKE Phase 2 (IPsec SA), crypto map, tunnel group, `show crypto isakmp sa` / `show crypto ipsec sa`.
- **PPPoE & Dialer:** `interface Dialer`, PPP kapsülleme, CHAP/PAP kimlik doğrulaması.

### 🛡️ Ağ Servisleri, Güvenlik ve Kalite (Services, Security & QoS)
- **DHCP Sunucu & Relay Agent:** Router/Switch üzerinde DHCP havuzu (`ip dhcp pool`), network, default-router, dns-server tanımları ve cross-subnet `ip helper-address` aktarımı.
- **DNS Sunucu:** Domain adı ve IP eşleştirme kayıtları (A, AAAA, CNAME, MX kayıtları), dinamik alan adı çözümlemesi.
- **HTTP / HTTPS Web Server:** Html dosyası barındırma ve PC Web Browser üzerinden web sitelerine erişim.
- **FTP Sunucu:** Dosya yükleme ve indirme işlemleri.
- **Erişim Kontrol Listeleri (ACL):** Standard ACL (1-99), Extended ACL (100-199), Adlandırılmış (Named) ACL'ler ve IPv6 ACL; IP, Port, Protokol (TCP/UDP/ICMP) bazlı trafik filtreleme.
- **802.1X (dot1x):** Port tabanlı ağ erişim kontrolü, EAPOL simülasyonu, RADIUS kimlik doğrulaması, `dot1x port-control {auto|force-authorized|force-unauthorized}`.
- **AAA (RADIUS/TACACS+):** `aaa new-model`, `aaa authentication`, RADIUS/TACACS+ sunucu ve anahtar yapılandırması.
- **NAT / PAT (Network Address Translation):** Static NAT (1-to-1), Dynamic NAT (Pool) ve PAT / Overload (Tek kamu IP'si ile tüm ağı internete çıkarma).
- **Yüksek Erişilebilirlik (FHRP - HSRP, VRRP & GLBP):** HSRP v1/v2, VRRP ve GLBP ile sanal IP/MAC hesabı ve otomatik aktif/yedek/AVG gateway değişimi.
- **IP SLA & Floating Route:** ICMP-echo/jitter probe ve RTT ölçümü ile hat kopmasında otomatik yedek hat rotasına geçiş.
- **QoS (Quality of Service):** `mls qos`, `class-map`, `policy-map`, WFQ, LLQ, CBWFQ trafik sınıflandırma, DSCP/CoS işaretleme ve önceliklendirme.
- **Syslog:** `logging host <ip>`, `logging trap <level>`, `show logging` ile merkezi log yönetimi.
- **SNMP:** Community string, contact/location, SNMP trap ve `show snmp` ile ağ yönetimi protokolü.
- **NTP:** `ntp server <ip>`, `clock timezone`, `show clock` ile zaman senkronizasyonu.
- **ErrDisable Recovery:** `errdisable recovery`, `errdisable recovery cause` ile otomatik kurtarma.
- **UDLD:** Uni-directional Link Detection, `udld`, `udld port`, `show udld` ile tek yönlü bağlantı tespiti.
- **Proxy ARP:** `ip proxy-arp`, `no ip proxy-arp` ile ARP.proxy çözümleme.
- **Directed Broadcast:** `ip directed-broadcast`, `no ip directed-broadcast` ile alt ağ broadcast yönlendirme.
- **PoE (Power over Ethernet):** `power inline`, `power inline consumption` ile ethernet üzerinden güç dağıtımı.
- **SPAN/RSPAN:** `monitor session <n>`, `show monitor` ile port kopyalama ve izleme.
- **Storm Control:** `storm-control broadcast/multicast/unicast level <%>` ile fırtına kontrolü.
- **SDN / YANG:** YANG modülü ayrıştırma, NETCONF/RESTCONF veri deposu, REST API Explorer ile programlanabilir ağ yönetimi.

### 📡 Kablosuz Ağlar & IoT (Wireless & IoT)
- **Wireless Access Point (AP):** 2.4GHz ve 5GHz kablosuz yayın, SSID yapılandırması, WPA2/WPA3 Personal.
- **Wireless LAN Controller (WLC):** Merkezi AP yönetimi, CAPWAP tünellemesi, WPA2/WPA3 Enterprise & RADIUS entegrasyonu.
- **Dot11 Radio Interface:** `interface Dot11Radio 0`, `dot11 ssid`, `guest-mode`, `channel`, `speed`, `station-role`.
- **Multi-SSID:** Çoklu WLAN profilleri (Corp-WiFi, Guest-WiFi, IoT-Network).
- **Wireless MAC Filtering:** SSID bazlı Allow/Deny listeleri.
- **IoT Sensörler ve Aktüatörler:** Sıcaklık, nem, hareket, ışık, ses sensörleri + akıllı lamba, kapı kilidi, röle ve Web tabanlı IoT Kontrol Paneli.

### 📊 İzleme ve Teşhis (Monitoring & Diagnostics)
- **CDP / LLDP:** Discovery Protocol ve Link Layer Discovery Protocol ile komşu keşfi.
- **ARP / NDP:** ARP tablosu yönetimi ve IPv6 Neighbor Discovery Protocol.
- **Packet Capture:** OSI katman katman (L2 Ethernet, L3 IP, L4 TCP/UDP/ICMP) derinlemesine analiz, hex dump ve protokol ağacı.
- **Syslog / SNMP / NTP:** Merkezi log yönetimi, SNMP ile ağ izleme, NTP ile zaman senkronizasyonu.
- **IP SLA:** ICMP-echo/jitter probları, RTT min/avg/max, jitter istatistikleri ve `show ip sla statistics`.

---

## 3. CMD (Komut İstemi) ve Batch Scripting Kullanımı

PC ve Laptop cihazlarında **Desktop > CMD (Komut İstemi)** uygulaması açılarak Windows ortamına uygun komutlar ve yığın (.bat) dosyaları çalıştırılabilir.

### 💻 Temel CMD Ağ ve Sistem Komutları

```cmd
:: Ağ Yapılandırmasını İnceleme ve Yenileme
ipconfig
ipconfig /all
ipconfig /release
ipconfig /renew

:: Bağlantı ve Erişim Testi (Ping)
ping 192.168.1.1
ping 8.8.8.8 -t
ping 192.168.1.10 -n 10 -l 1024

:: Rota İzleme (Traceroute)
tracert 192.168.2.10
tracert www.samplesite.com

:: DNS Çözümleme Sorgusu
nslookup www.lab.com
nslookup www.lab.com 192.168.1.1

:: ARP Tablosu İnceleme ve Temizleme
arp -a
arp -d

:: Rota Tablosu Yönetimi
route print
route add 10.0.0.0 mask 255.0.0.0 192.168.1.1
route delete 10.0.0.0

:: Aktif Soket ve Port Durumları
netstat -an

:: Ekran Temizleme ve Yardım
cls
echo Merhaba Network Simülatörü!
help
```

### 📜 Kullanıcı Tanımlı Batch Yığın Dosyaları (.bat / .cmd)
Dosya Düzenleyici (Editor) üzerinden `.bat` uzantılı betikler yazılıp CMD terminalinde doğrudan çalıştırılabilir:

```cmd
@echo off
rem Ağ Kontrol ve Test Betiği
set TARGET_IP=192.168.1.1
echo %TARGET_IP% adresine baglanti test ediliyor...

ping %TARGET_IP% -n 2
if errorlevel 1 (
    echo HATA: Ağ geçidine ulasilamadi!
) else (
    echo BASARILI: Ağ geçidi aktif ve erisilebilir.
)
```

---

## 4. Linux Shell / Terminal Kullanımı

PC ve Laptop cihazlarındaki **Desktop > Linux Terminal** sekmesinde gelişmiş POSIX uyumlu Linux komutları kullanılabilir.

### 🐧 Temel Linux Komutları

```bash
# Ağ Arayüzleri ve IP Ayarları
ifconfig
ip addr show
ip route show

# Ağ Bağlantı ve Sorgu Araçları
ping -c 4 192.168.1.1
traceroute 192.168.2.10
curl http://192.168.1.10
wget http://192.168.1.10/index.html
dig www.lab.com

# Uzak Ağ Bağlantıları
ssh admin@192.168.1.1
telnet 192.168.1.1 23
ftp 192.168.1.5

# Dosya Yönetimi ve İçerik İnceleme
ls -la
pwd
cd /home/user
cat network.log
head -n 10 network.log
tail -n 20 network.log
less network.log

# Metin Filtreleme ve İstatistik (Pipe ile)
cat network.log | grep "ERROR"
cat network.log | grep -i "failed" | wc -l

# Dosya İzinleri Yönetimi (chmod / chown)
chmod +x test_script.sh
chmod 755 test_script.sh
chmod -x restricted.sh
chown user:user test_script.sh

# Terminal Kısayolları ve Geçmiş
history
clear
# Veya ekranı temizlemek için Ctrl+L tuşlarına basın
```

---

## 5. Bash Scripting ve Betik Kodlama

Linux Terminalinde karmaşık otomasyon, test ve tarama işleri için **Bash Betikleri** yazılabilir ve çalıştırılabilir.

### 📝 Örnek Bash Ağ Tarama ve Otomasyon Betiği (`network_scan.sh`)

```bash
#!/bin/bash
# Ağ İstemcileri Canlılık Tarama Betiği

SUBNET="192.168.1"
echo "=== $SUBNET.0/24 AĞI TARANIYOR ==="

ACTIVE_COUNT=0
INACTIVE_COUNT=0

for i in {1..10}; do
    IP="$SUBNET.$i"
    ping -c 1 -w 1 $IP > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "[+] $IP : CANLI (ONLINE)"
        ACTIVE_COUNT=$((ACTIVE_COUNT + 1))
    else
        echo "[-] $IP : ULAŞILAMIYOR (OFFLINE)"
        INACTIVE_COUNT=$((INACTIVE_COUNT + 1))
    fi
done

echo "-----------------------------------"
echo "Toplam Canlı Cihaz: $ACTIVE_COUNT"
echo "Toplam Kapalı Cihaz: $INACTIVE_COUNT"
```

**Çalıştırma Adımları:**
1. Dosya Düzenleyici'de `network_scan.sh` dosyasını oluşturun.
2. Linux Terminalinde çalıştırma izni verin: `chmod +x network_scan.sh`
3. Betiği çalıştırın: `./network_scan.sh`

---

## 6. Python Programlama ve Nesne Yönelimli (OOP) Kodlama

PC ve Laptop cihazlarında **Desktop > Python IDE** uygulaması açılarak gelişmiş Python betikleri yazılabilir ve simüle edilen Python ortamında çalıştırılabilir.

### 🐍 Desteklenen Python Özellikleri
- **Nesne Yönelimli Programlama (OOP):** `class`, `__init__`, kalıtım (inheritance), `super()`, `isinstance()`.
- **Decorator'lar:** `@property`, `@staticmethod`, `@classmethod` ve kullanıcı tanımlı decorator fonksiyonları.
- **Generator'lar ve İteratörler:** `yield` ve `yield from` ile bellek dostu veri işleme.
- **Standart Modüller:** `json`, `re` (düzenli ifadeler), `os.path`, `math`, `random`, `datetime`, `sys` ve simüle edilmiş `socket` kütüphanesi.

### 🚀 Örnek Python Nesne Yönelimli Ağ Cihazı Sınıfı ve Soket İstemcisi

```python
import math
import random
from datetime import datetime

# 1. Nesne Yönelimli Sınıf Hiyerarşisi
class NetworkDevice:
    def __init__(self, device_id, name, ip_address):
        self.device_id = device_id
        self.name = name
        self._ip_address = ip_address
        self.status = "Offline"

    @property
    def ip_address(self):
        return self._ip_address

    @ip_address.setter
    def ip_address(self, new_ip):
        if "." in new_ip:
            self._ip_address = new_ip
            print(f"[{self.name}] IP adresi {new_ip} olarak güncellendi.")

    def connect(self):
        self.status = "Online"
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {self.name} ({self.ip_address}) ağa bağlandı.")

    @staticmethod
    def calculate_bandwidth(bytes_sent, seconds):
        return (bytes_sent * 8) / (seconds * 1000000) # Mbps

class Router(NetworkDevice):
    def __init__(self, device_id, name, ip_address, routing_protocol="OSPF"):
        super().__init__(device_id, name, ip_address)
        self.routing_protocol = routing_protocol
        self.routes = []

    def add_route(self, destination, next_hop):
        self.routes.append({"dest": destination, "next_hop": next_hop})
        print(f"[{self.name}] Rota Eklendi: {destination} -> {next_hop}")

# 2. Çalıştırma Testi
r1 = Router("r-1", "Merkez-Router", "192.168.1.1")
r1.connect()
r1.add_route("10.0.0.0/24", "192.168.1.2")

speed = Router.calculate_bandwidth(12500000, 2)
print(f"Hesaplanan Hat Hızı: {speed} Mbps")
```

---

## 7. Uygulama Genel Arayüzü, Pencere Mimarisi ve Kısayollar

Simülatör arayüzü, öğrenme ve çalışma verimliliğini en üst düzeye çıkarmak için modüler bileşenlerden oluşur:

### 📐 Arayüz Bölümleri
1. **Üst Araç Çubuğu (Top Bar):** Proje Aç/Kaydet, Topolojiyi Temizle, Geri Al / İleri Al, Zoom Kontrolleri, Paket Yakalama Başlat/Durdur, Odalara Katılma ve Sertifika Görüntüleme.
2. **Sol Cihaz Ekleme Paneli (Device Palette):** Router, Switch, L3 Switch, PC, Laptop, Server, Firewall, Access Point, WLC ve IoT cihazlarının sürüklenebilir listesi.
3. **Orta Çalışma Tuvali (Canvas Grid):** Cihazların konumlandırıldığı, kablo hatlarının çizildiği, canlı paket animasyonlarının aktığı ızgara alanı.
4. **Sağ Yardım & Canlı Durum Paneli:** Rehberli Ders Adımları, Konu Quiz'leri, Topoloji Cihaz Listesi, Canlı Port Durumları ve Skor Paneli.
5. **Modüler Pencere Mimarisi:** Açılan tüm cihaz ve ayar pencereleri ekranda serbestçe sürüklenebilir, simge durumuna küçültülebilir ve kırmızı yuvarlak `X` butonu ile kapatılabilir.

### ⌨️ Klavye Kısayolları

| Kısayol | İşlev / Eylem |
|---|---|
| **Tab** | Tuval üzerindeki bir sonraki cihaza odaklanır. |
| **Shift + Tab** | Ekranda açık olan pencereler arasında sırayla geçiş yapar. |
| **Ctrl + M** | Etkin cihaz penceresini simge durumuna küçültür / büyütür. |
| **Ctrl + Z** | Son yapılan işlemi geri alır (Undo). |
| **Ctrl + Y** | Geri alınan işlemi yeniden uygular (Redo). |
| **Delete / Backspace** | Seçili olan cihazı veya kablo bağlantısını siler. |
| **Ctrl + S** | Mevcut topolojiyi `.json` dosyası olarak bilgisayara indirir. |
| **Ctrl + L** | Terminal (CLI / Linux) ekranını temizler. |
| **Mouse Selection (Fare Seçimi)** | CMD, CLI & Konsol geçmişinden fare ile metin seçip bırakıldığı an OTOMATİK PANOLARA KOPYALAR. |
| **Esc** | Açık olan diyaloğu veya modalı kapatır. |

---

## 8. Cihaz Türleri ve Özellikleri

Simülatörde 9 farklı kategoride cihaz türü bulunmaktadır:

| Cihaz Türü | Açıklama ve Port Kapasitesi | Desteklenen Ana Modlar |
|---|---|---|
| **Router (Yönlendirici)** | NOS tabanlı katman-3 yönlendirici. 4x Gi0/0-Gi0/3, 3x Serial, 1x Console, 1x WLAN0. | Static Route, RIP, OSPF, EIGRP, BGP, NAT, ACL, DHCP Server/Relay, GRE. |
| **L2 Switch (Anahtar)** | Katman-2 anahtarlayıcı. 24x Fa0/1-Fa0/24, 2x Gi0/1-Gi0/2, 1x Console. | VLAN, 802.1Q Trunk, VTP, STP/RSTP, Port Security, EtherChannel, DHCP Snooping. |
| **L3 Switch (Çok Katmanlı Switch)** | Katman-3 anahtarlayıcı. 24x Gi1/0/1-24, 4x Gi1/1/1-4, 1x Console, 1x WLAN0. | SVI (`interface vlan`), IP Routing, OSPF, EtherChannel L3, Inter-VLAN Routing. |
| **PC / Laptop** | Masaüstü ve Dizüstü İstemci Cihazı. Ethernet + WLAN0 portları. | Windows CMD, Linux Bash, Python IDE, Web Browser, WiFi İstemcisi, IP Config. |
| **Server (Sunucu)** | Çok işlevli ağ sunucusu. Ethernet + Console. | HTTP/HTTPS Web Hosting, DNS Server, DHCP Server, FTP Server. |
| **Firewall (Güvenlik Duvarı)** | Güvenlik duvarı cihazı. 4x Ethernet portu. | Zone-based Security, Packet Filtering, Access Rules, NAT/PAT. |
| **Access Point (AP)** | Kablosuz erişim noktası. Ethernet + Wireless Antenna. | 2.4GHz/5GHz SSID yayını, WPA2/WPA3 Personal şifreleme. |
| **WLC (Wireless LAN Controller)** | Kablosuz ağ denetleyicisi. 4x Gi0/0-3 + Management. | Çoklu AP Yönetimi, CAPWAP Tünelleri, Enterprise WPA2/WPA3 & RADIUS. |
| **IoT Cihazları** | Sensör ve Aktüatörler. Wireless / Ethernet. | Sıcaklık/Nem okuma, Hareket algılama, Akıllı Röle Kontrolü. |

---

## 9. Kablo Türleri ve Bağlantı Mantığı

Cihazlar arasındaki fiziksel ve mantıksal bağlantılar 6 farklı kablo türü ile sağlanır:

```
+-----------------------------------------------------------------------+
| Kablo Türü         | Kullanım Alanı ve Uyumlu Cihaz Çiftleri          |
+--------------------+--------------------------------------------------+
| Düz Kablo          | Farklı katman cihazları arasında kullanılır:     |
| (Straight-Through) | - PC / Server  <-->  Switch                      |
|                    | - Switch         <-->  Router                      |
+--------------------+--------------------------------------------------+
| Çapraz Kablo       | Aynı katman cihazları arasında kullanılır:       |
| (Crossover)        | - Switch         <-->  Switch                      |
|                    | - Router         <-->  Router                      |
|                    | - PC             <-->  PC / Router                 |
+--------------------+--------------------------------------------------+
| Konsol Kablosu     | Seri yönetim bağlantısı (Out-of-Band):          |
| (Console Cable)    | - PC COM1        <-->  Cihaz Console Portu         |
+--------------------+--------------------------------------------------+
| Seri Kablo         | Geniş Alan Ağı (WAN) noktadan noktaya hatlar:   |
| (Serial DCE/DTE)   | - Router S0/0/0  <-->  Router S0/0/0             |
+--------------------+--------------------------------------------------+
| Fiber Optik        | Yüksek hızlı omurga ve SFP port bağlantıları:    |
| (Fiber Optic)      | - L3 Switch      <-->  L3 Switch / Core Router    |
+--------------------+--------------------------------------------------+
| Kablosuz Bağlantı  | Havadan sinyal iletilen kablosuz hatlar:         |
| (Wireless / WiFi)  | - AP / WLC       <-->  Laptop / PC / IoT          |
+-----------------------------------------------------------------------+
```

---

## 10. Konularına Göre Örnek Laboratuvarlar

Ağ konularını pekiştirmek için temel, orta ve ileri seviyede yapılandırılmış örnek laboratuvar senaryoları:

### 🟢 10.1 Temel Seviye Laboratuvarlar

#### Lab 1: Temel IP Adresleme ve Ping Testi
- **Amaç:** İki PC'yi bir Switch üzerinden bağlayıp statik IP atayarak ping testini gerçekleştirmek.
- **Topoloji:** `PC-1 (Eth0)` -> `Switch-1 (Fa0/1)`, `PC-2 (Eth0)` -> `Switch-1 (Fa0/2)`
- **Yapılandırma:**
  - PC-1 IP: `192.168.1.10 / 255.255.255.0`
  - PC-2 IP: `192.168.1.20 / 255.255.255.0`
- **Test:** PC-1 CMD -> `ping 192.168.1.20` (Başarılı cevap alınmalıdır).

#### Lab 2: Switch Üzerinde VLAN Oluşturma ve Port Atama
- **Amaç:** Anahtar üzerinde Muhasebe (VLAN 10) ve IK (VLAN 20) departmanlarını ayırmak.
- **CLI Adımları (Switch-1):**
```ios
Switch> enable
Switch# configure terminal
Switch(config)# vlan 10
Switch(config-vlan)# name Muhasebe
Switch(config-vlan)# exit
Switch(config)# vlan 20
Switch(config-vlan)# name IK
Switch(config-vlan)# exit
Switch(config)# interface fa0/1
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# exit
Switch(config)# interface fa0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 20
Switch(config-if)# exit
```

#### Lab 3: Router Üzerinde DHCP Sunucusu Yapılandırma
- **Amaç:** PC'lerin IP adreslerini Router'dan otomatik almasını sağlamak.
- **CLI Adımları (Router-1):**
```ios
Router> enable
Router# conf t
Router(config)# interface gi0/0
Router(config-if)# ip address 192.168.1.1 255.255.255.0
Router(config-if)# no shutdown
Router(config-if)# exit
Router(config)# ip dhcp pool OFIS_LAN
Router(dhcp-config)# network 192.168.1.0 255.255.255.0
Router(dhcp-config)# default-router 192.168.1.1
Router(dhcp-config)# dns-server 8.8.8.8
Router(dhcp-config)# exit
```
- **Test:** PC-1 Masaüstü > IP Ayarları > **DHCP** seçeneğini işaretleyin (`ipconfig /renew`).

---

### 🟡 10.2 Orta Seviye Laboratuvarlar

#### Lab 4: Router-on-a-Stick ile Inter-VLAN Routing
- **Amaç:** Farklı VLAN'lardaki bilgisayarların Router alt arayüzleri (sub-interfaces) üzerinden haberleşmesini sağlamak.
- **Switch-1 Yapılandırması (Trunk Port):**
```ios
Switch(config)# interface gi0/1
Switch(config-if)# switchport mode trunk
```
- **Router-1 Yapılandırması (Sub-Interfaces):**
```ios
Router(config)# interface gi0/0
Router(config-if)# no shutdown
Router(config-if)# exit
Router(config)# interface gi0/0.10
Router(config-subif)# encapsulation dot1Q 10
Router(config-subif)# ip address 192.168.10.1 255.255.255.0
Router(config-subif)# exit
Router(config)# interface gi0/0.20
Router(config-subif)# encapsulation dot1Q 20
Router(config-subif)# ip address 192.168.20.1 255.255.255.0
Router(config-subif)# exit
```

#### Lab 5: Statik Yönlendirme (Static Routing) ve Default Gateway
- **Amaç:** 2 farklı ağdaki Router'lar arasında statik rotalar ile veri iletimi sağlamak.
- **R1 Yapılandırması:** `ip route 192.168.2.0 255.255.255.0 10.0.0.2`
- **R2 Yapılandırması:** `ip route 192.168.1.0 255.255.255.0 10.0.0.1`

#### Lab 6: OSPFv2 Tek Alanlı Yönlendirme (Single-Area OSPF)
- **Amaç:** Router'ların OSPF Protokolü ile rotaları dinamik olarak öğrenmesini sağlamak.
- **R1 CLI Adımları:**
```ios
R1(config)# router ospf 1
R1(config-router)# router-id 1.1.1.1
R1(config-router)# network 192.168.1.0 0.0.0.255 area 0
R1(config-router)# network 10.0.0.0 0.0.0.3 area 0
R1(config-router)# exit
```
- **R2 CLI Adımları:**
```ios
R2(config)# router ospf 1
R2(config-router)# router-id 2.2.2.2
R2(config-router)# network 192.168.2.0 0.0.0.255 area 0
R2(config-router)# network 10.0.0.0 0.0.0.3 area 0
R2(config-router)# exit
```
- **Doğrulama:** `R1# show ip route` ve `R1# show ip ospf neighbor`

#### Lab 7: SOHO Ofis Kablolu ve Kablosuz Ağ Kurulumu
- **Amaç:** Küçük bir ofis için hem kablolu PC'lere DHCP hizmeti vermek hem de Laptop cihazını kablosuz WiFi ağına bağlamak.
- **Adımlar:**
  1. Router-1 üzerinde `gi0/0` arayüzünü `192.168.1.1` olarak ayarlayıp açın.
  2. Router-1 üzerinde `ip dhcp pool OFIS` oluşturup `192.168.1.0/24` ağını ve varsayılan gateway'i tanımlayın.
  3. Laptop (PC-2) cihazında **Masaüstü > WiFi** uygulamasını açıp SSID: `Office-Wifi` ağına bağlanın.
  4. Laptop'tan `ping 192.168.1.10` atarak bağlantıyı doğrulayın.

---

### 🔴 10.3 İleri Seviye Laboratuvarlar

#### Lab 8: L3 Switch SVI & Inter-VLAN Yönlendirme
- **Amaç:** Omurga L3 Switch üzerinde SVI (`interface vlan`) yapılandırarak hat hızında VLAN yönlendirmesi yapmak.
- **L3 Switch CLI Adımları:**
```ios
L3Switch(config)# ip routing
L3Switch(config)# vlan 10
L3Switch(config-vlan)# exit
L3Switch(config)# vlan 20
L3Switch(config-vlan)# exit
L3Switch(config)# interface vlan 10
L3Switch(config-if)# ip address 10.10.10.1 255.255.255.0
L3Switch(config-if)# no shutdown
L3Switch(config-if)# exit
L3Switch(config)# interface vlan 20
L3Switch(config-if)# ip address 10.20.20.1 255.255.255.0
L3Switch(config-if)# no shutdown
L3Switch(config-if)# exit
```

#### Lab 9: HSRP / VRRP Yüksek Erişilebilirlik (FHRP Redundancy)
- **Amaç:** İki adet yedekli Router (R1 Active, R2 Standby) ile kesintisiz varsayılan ağ geçidi sağlamak.
- **R1 (Active Router):**
```ios
R1(config-if)# interface gi0/0
R1(config-if)# ip address 192.168.1.2 255.255.255.0
R1(config-if)# standby 1 ip 192.168.1.1
R1(config-if)# standby 1 priority 110
R1(config-if)# standby 1 preempt
```
- **R2 (Standby Router):**
```ios
R2(config-if)# interface gi0/0
R2(config-if)# ip address 192.168.1.3 255.255.255.0
R2(config-if)# standby 1 ip 192.168.1.1
R2(config-if)# standby 1 priority 100
```
- **Doğrulama:** `show standby brief`

#### Lab 10: Enterprise WLC & CAPWAP Kurumsal Kablosuz Mimarisi
- **Amaç:** WLC denetleyicisi üzerinden Access Point'leri merkezi yönetip WPA2 Enterprise güvenlik politikası uygulamak.
- **Adımlar:**
  1. WLC üzerinde Management IP (`192.168.1.254`) ve WLAN SSID (`Kurumsal-Wifi`) oluşturun.
  2. AP cihazını WLC'ye CAPWAP tüneli ile bağlayın.
  3. İstemci PC'de WPA2-Enterprise RADIUS kullanıcı doğrulaması ile ağa bağlanın.

#### Lab 11: IP SLA Probe ve Floating Static Route ile Otomatik Hat Yedekleme
- **Amaç:** Ana internet hattı kesildiğinde IP SLA takibi ile rotanın otomatik olarak yedek hatta geçmesini sağlamak.
- **CLI Adımları:**
```ios
R1(config)# ip sla 1
R1(config-ip-sla)# icmp-echo 8.8.8.8 source-interface gi0/0
R1(config-ip-sla)# frequency 5
R1(config)# ip sla schedule 1 life forever start-time now
R1(config)# track 1 ip sla 1 reachability
R1(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1 track 1
R1(config)# ip route 0.0.0.0 0.0.0.0 198.51.100.1 10
```

#### Lab 12: BGP & Multi-Area OSPF Omurga Ağı
- **Amaç:** Farklı Özerk Sistemler (AS) arasında eBGP kurup iç ağda Multi-Area OSPF çalıştırmak.
- **R1 (AS 65001 - Enterprise Router):**
```ios
R1(config)# router bgp 65001
R1(config-router)# neighbor 203.0.113.2 remote-as 65002
R1(config-router)# network 192.168.0.0 mask 255.255.0.0
R1(config-router)# exit
```
- **ISP Router (AS 65002):**
```ios
ISP(config)# router bgp 65002
ISP(config-router)# neighbor 203.0.113.1 remote-as 65001
ISP(config-router)# exit
```
- **Doğrulama:** `show ip bgp summary` ve `show ip route bgp`

---

## 📌 Özet ve Ek Kaynaklar

Bu rehber dokümanı, **Network Simulator v4.1.0** sürümünün sunduğu tüm kabiliyetleri, arayüz modüllerini, kodlama ortamlarını ve uygulama senaryolarını detaylandırmaktadır. 

Daha fazla detaylı teknik döküman için projedeki diğer Markdown rehberlerini inceleyebilirsiniz:
- 📖 [Tam Özellik Envanteri (ProjeOzellikleri.md)](file:///f:/netsim2026/networksim/doc/training/ProjeOzellikleri.md)
- 📚 [Network Simulator Kitapçığı (NETWORK_SIMULATOR_KITAPCIK.md)](file:///f:/netsim2026/networksim/doc/training/NETWORK_SIMULATOR_KITAPCIK.md)
- 💻 [CLI Komut Referansı (CLI_COMMANDS.md)](file:///f:/netsim2026/networksim/doc/cli/CLI_COMMANDS.md)
- 🐍 [Python Programlama Rehberi (PYTHON_PROGRAMMING_GUIDE.md)](file:///f:/netsim2026/networksim/doc/getting-started/PYTHON_PROGRAMMING_GUIDE.md)

