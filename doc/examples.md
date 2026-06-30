# Network Simulator 2026 - Example Projects

This document provides detailed descriptions of all 40 example projects available in the Network Simulator 2026.

## Table of Contents

- [Basic Level](#basic-level)
- [Intermediate Level](#intermediate-level)
- [Advanced Level](#advanced-level)

---

## Basic Level

### 1. Basic Network + Passwords
**ID:** `basic-secure`  
**Tag:** TEMEL  
**Description:** Temel ağ güvenliği için console, VTY ve enable parolaları yapılandırılmıştır.  
**Details:** Şifreler: enable secret: class, enable password: paswd, console: console, vty: vty123  

**Kısa Tanıtım:**
Temel ağ güvenliği için console, VTY ve enable parolaları yapılandırılmıştır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 1 adet PC (PC-1) ekle
   - 1 adet PC (PC-2) ekle (Console için)
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 COM1 -> SW1 Console (Console kablo)

2. **Switch Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - enable secret class
   - enable password paswd
   - service password-encryption
   - line con 0
     password console
     login
     logging synchronous
   - line vty 0 4
     password vty123
     login
     transport input telnet ssh
   - exit

3. **VLAN ve IP Ayarları:**
   - vlan 10
     name VLAN10
   - exit
   - interface vlan 10
     ip address 192.168.10.150 255.255.255.0
     no shutdown
   - exit
   - interface fa0/1
     switchport access vlan 10
     switchport mode access
   - exit

4. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.150
   - PC-2: Console bağlantısı için IP gerekmez

5. **Test:**
   - PC-2 Console terminalinden SW1'e bağlan
   - PC-1 CMD: telnet 192.168.10.150
   - Kullanıcı adı: (yok), Şifre: vty123
   - Enable şifresi: class veya paswd

### 2. Single Switch VLANs
**ID:** `single-vlan`  
**Tag:** VLAN  
**Description:** Tek switch üzerinde VLAN 10 ve 20 ile iki PC erişim portu yapılandırması.  
**Details:** PC-1: VLAN 10 (192.168.10.10), PC-2: VLAN 20 (192.168.20.10)

**Kısa Tanıtım:**
Tek switch üzerinde VLAN 10 ve 20 ile iki PC erişim portu yapılandırması.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 2 adet PC ekle (PC-1, PC-2)
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)

2. **Switch VLAN Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - vlan 20
     name VLAN20
   - exit

3. **Port VLAN Ataması:**
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface fa0/2
     switchport mode access
     switchport access vlan 20
   - exit

4. **PC IP Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10
   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, VLAN 20

5. **Doğrulama:**
   - show vlan brief (VLAN 10 ve 20'yi gör)
   - show interfaces status (port VLAN atamalarını kontrol et)
   - PC-1 ve PC-2 birbirine ping atamaz (farklı VLAN'lar)

### 3. Router SSH (1 PC + 1 Router)
**ID:** `router-ssh-1pc`  
**Tag:** SSH  
**Description:** PC-1 üzerinden router R1 cihazına SSH ile güvenli bağlantı.  
**Details:** Komut: ssh admin@192.168.1.150, Şifre: 1234  

**Kısa Tanıtım:**
PC-1 üzerinden router R1 cihazına SSH ile güvenli bağlantı.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (R1) ekle
   - 1 adet PC (PC-1) ekle
   - PC-1 Eth0 -> R1 Gi0/0 (Straight kablo)

2. **Router Konfigürasyonu:**
   - R1 terminaline gir: enable, conf t
   - hostname R1
   - ip domain-name lab.local
   - crypto key generate rsa modulus 1024
   - ip ssh version 2
   - username admin privilege 15 secret 1234
   - enable secret 123
   - line vty 0 4
     login local
     transport input ssh
   - exit

3. **Interface Ayarları:**
   - interface gi0/0
     ip address 192.168.1.150 255.255.255.0
     no shutdown
   - exit

4. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0, Gateway 192.168.1.150

5. **Test:**
   - PC-1 CMD: ssh admin@192.168.1.150
   - Şifre: 1234
   - R1> show ssh (SSH bağlantılarını gör)
   - R1> show ip ssh (SSH durumunu kontrol et)

### 4. Router DHCP (2 PCs + 1 Switch + 1 Router)
**ID:** `router-dhcp-2pc`  
**Tag:** DHCP  
**Description:** Router DHCP havuzu üzerinden iki PCye otomatik IP dağıtımı.  
**Details:** R1: ip dhcp pool LAN, network 192.168.1.0 255.255.255.0, default-router 192.168.1.1  

**Kısa Tanıtım:**
Router DHCP havuzu üzerinden iki PCye otomatik IP dağıtımı.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (R1) ekle
   - 1 adet Switch (SW1) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - R1 Gi0/0 -> SW1 Gi0/1 (Crossover kablo)
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)

2. **Router Konfigürasyonu:**
   - R1 terminaline gir: enable, conf t
   - interface gi0/0
     ip address 192.168.10.1 255.255.255.0
     no shutdown
   - exit
   - ip dhcp pool LAN
     network 192.168.10.0 255.255.255.0
     default-router 192.168.10.1
     dns-server 8.8.8.8
   - exit

3. **Switch Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - interface vlan 1
     ip address 192.168.10.2 255.255.255.0
     no shutdown
   - exit
   - interface fa0/1
     switchport mode access
   - exit
   - interface fa0/2
     switchport mode access
   - exit
   - interface gi0/1
     switchport mode access
   - exit

4. **PC Konfigürasyonu:**
   - PC-1: IP mode DHCP
   - PC-2: IP mode DHCP

5. **Test:**
   - PC-1 CMD: ipconfig /renew
   - PC-2 CMD: ipconfig /renew
   - R1> show ip dhcp binding (DHCP atamalarını gör)
   - PC-1 ve PC-2 IP almalı (192.168.10.100+ aralığı)

### 5. MAC Table Lab
**ID:** `mac-table-lab`  
**Tag:** MAC  
**Description:** Switch MAC adres tablosu öğrenme özelliği incelenir.  
**Details:** PC1 MAC: 00-e0-f7-01-a1-b1, PC2 MAC: 97-31-e5-97-a7-03  

**Kısa Tanıtım:**
Switch MAC adres tablosu öğrenme özelliği incelenir.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 2 adet PC (PC1, PC2) ekle
   - 1 adet Router (R2) ekle
   - Cihazları switch'e bağla

2. **Trafik Oluşturma:**
   - PC'lerden ping gönder
   - Router'dan ping gönder

3. **MAC Tablosunu İncele:**
   - SW1 terminaline gir: enable
   - show mac address-table
   - Öğrenilen MAC adreslerini not et

4. **Analiz:**
   - Hangi port'tan hangi MAC adresi öğrenildi?
   - Switch kaynak MAC adreslerini nasıl öğrenir?

### 6. ARP vs MAC Table
**ID:** `mac-arp-lab`  
**Tag:** MAC  
**Description:** ARP ve MAC adres tablosu arasındaki ilişki incelenir.  
**Details:** PC: arp -a, Switch: show mac address-table  

**Kısa Tanıtım:**
ARP ve MAC adres tablosu arasındaki ilişki incelenir.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - PC'ler ve switch arası bağlantıları kur

2. **Trafik Oluşturma:**
   - PC'lerden ping gönder

3. **ARP Cache İncele:**
   - PC terminalinde: arp -a
   - IP-MAC eşleşmelerini gör

4. **MAC Tablosu İncele:**
   - Switch terminalinde: show mac address-table
   - Port-MAC eşleşmelerini gör

5. **Karşılaştırma:**
   - ARP cache (Layer 3: IP -> MAC)
   - MAC tablosu (Layer 2: Port -> MAC)
   - İki tablo arasındaki ilişkiyi anla

### 7. IP Configuration Lab
**ID:** `ip-config-lab`  
**Tag:** IP  
**Description:** IP yapılandırmasının ağ bağlantısı üzerindeki etkisi incelenir.  
**Details:** PC1/PC2: 192.168.1.x/24, PC3: farklı subnet  

**Kısa Tanıtım:**
IP yapılandırmasının ağ bağlantısı üzerindeki etkisi incelenir.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 3 adet PC ekle
   - Switch'e bağla

2. **IP Konfigürasyonu:**
   - PC-1: 192.168.1.10/255.255.255.0
   - PC-2: 192.168.1.20/255.255.255.0
   - PC-3: 192.168.2.10/255.255.255.0 (farklı subnet)

3. **Test:**
   - PC-1 -> PC-2 ping (başarılı)
   - PC-1 -> PC-3 ping (başarısız)

4. **Analiz:**
   - Aynı subnet'teki cihazlar iletişim kurabilir
   - Farklı subnet'teki cihazlar router olmadan iletişim kuramaz

### 8. Native VLAN Configuration
**ID:** `native-vlan-basic`  
**Tag:** NATIVE  
**Description:** İki switch arası native VLAN 99 trunk bağlantısı yapılandırılır.  
**Details:** SW1/SW2: vlan 99, Fa0/24 trunk, switchport trunk native vlan 99  

**Kısa Tanıtım:**
İki switch arası native VLAN 99 trunk bağlantısı yapılandırılır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet Switch (SW1, SW2) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)
   - SW1 Fa0/24 -> SW2 Fa0/24 (Crossover kablo)

2. **SW1 Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - vlan 99
     name NativeVLAN
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 99
   - exit
   - interface fa0/24
     switchport mode trunk
     switchport trunk native vlan 99
   - exit

3. **SW2 Konfigürasyonu:**
   - SW2 terminaline gir: enable, conf t
   - vlan 99
     name NativeVLAN
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 99
   - exit
   - interface fa0/24
     switchport mode trunk
     switchport trunk native vlan 99
   - exit

4. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.99.10, Subnet 255.255.255.0, VLAN 99
   - PC-2: IP 192.168.99.11, Subnet 255.255.255.0, VLAN 99

5. **Test:**
   - show interfaces trunk (trunk ve native VLAN'ı gör)
   - PC-1 ping 192.168.99.11 (PC-2)

### 9. Firewall Basic (ICMP Block)
**ID:** `firewall-basic`  
**Tag:** FIREWALL  
**Description:** ICMP (ping) engellenmiş, diğer tüm trafiğe izin verilmiş basit firewall.  
**Details:** Kural 1: DENY ICMP | Kural 2: ALLOW ANY | PC-1 ping BAŞARISIZ, wget BAŞARILI

**Kısa Tanıtım:**
ICMP (ping) engellenmiş, diğer tüm trafiğe izin verilmiş basit firewall.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Firewall (FW-1) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> FW-1 Gi0/0 (Crossover kablo)
   - FW-1 Gi0/1 -> PC-2 Eth0 (Crossover kablo)

2. **PC IP Konfigürasyonu:**
   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0, Gateway 192.168.1.1
   - PC-2: IP 192.168.1.20, Subnet 255.255.255.0, Gateway 192.168.1.1

3. **Firewall Kuralları:**
   - Kural 1: ICMP (ping) protokolünü DENY olarak yapılandır
   - Kural 2: Tüm trafiğe (ANY) ALLOW kuralı ekle

4. **Test:**
   - PC-1 > ping 192.168.1.20 (BAŞARISIZ - ICMP engelli)
   - PC-1 > wget 192.168.1.20 (BAŞARILI - HTTP izinli)

---

## Intermediate Level

### 10. Two Switch Trunk + VTP
**ID:** `trunk-vtp`  
**Tag:** TRUNK/VTP  
**Description:** İki switch arası trunk bağlantısı ve VTP domain ile VLAN yayılımı sağlanır.  
**Details:** VTP domain: LAB, Gi0/1 trunk, VLAN 10/20 otomatik yayılır  

**Kısa Tanıtım:**
İki switch arası trunk bağlantısı ve VTP domain ile VLAN yayılımı sağlanır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet Switch (SW1, SW2) ekle
   - 1 adet PC (PC-1) ekle
   - PC-1 Eth0 -> SW2 Fa0/1 (Straight kablo)
   - SW1 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)

2. **SW1 Konfigürasyonu (VTP Server):**
   - SW1 terminaline gir: enable, conf t
   - vtp mode server
   - vtp domain LAB
   - vlan 10
     name VLAN10
   - exit
   - vlan 20
     name VLAN20
   - exit
   - interface gi0/1
     switchport mode trunk
   - exit

3. **SW2 Konfigürasyonu (VTP Client):**
   - SW2 terminaline gir: enable, conf t
   - vtp mode client
   - vtp domain LAB
   - interface gi0/1
     switchport mode trunk
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit

4. **Doğrulama:**
   - SW2'de: show vlan brief (VLAN 10 ve 20 otomatik gelmiş olmalı)
   - show vtp status
   - show interface trunk

### 11. ROAS (Router-on-a-Stick)
**ID:** `roas`  
**Tag:** ROAS  
**Description:** Router-on-a-Stick ile tek trunk interface üzerinden inter-VLAN routing.  
**Details:** Router subinterface: Gi0/0.10 (VLAN 10), Gi0/0.20 (VLAN 20)  

**Kısa Tanıtım:**
Router-on-a-Stick ile tek trunk interface üzerinden inter-VLAN routing.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 1 adet Router (R1) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)
   - SW1 Gi0/1 -> R1 Gi0/0 (Crossover kablo)

2. **Switch Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - vlan 20
     name VLAN20
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface fa0/2
     switchport mode access
     switchport access vlan 20
   - exit
   - interface gi0/1
     switchport trunk encapsulation dot1q
     switchport mode trunk
   - exit

3. **Router Konfigürasyonu:**
   - R1 terminaline gir: enable, conf t
   - interface gi0/0
     no shutdown
   - exit
   - interface gi0/0.10
     encapsulation dot1q 10
     ip address 192.168.10.1 255.255.255.0
   - exit
   - interface gi0/0.20
     encapsulation dot1q 20
     ip address 192.168.20.1 255.255.255.0
   - exit

4. **PC IP ve Gateway Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.1, VLAN 10
   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, Gateway 192.168.20.1, VLAN 20

5. **Test:**
   - PC-1 ping 192.168.20.10 (PC-2) - Başarılı (inter-VLAN routing)

### 12. Legacy Inter-VLAN Routing
**ID:** `legacy-routing`  
**Tag:** LEGACY ROUTING  
**Description:** Router iki fiziksel interface ile VLANlara bağlanır, trunk kullanılmaz.  
**Details:** Router Gi0/1: VLAN 10 (192.168.0.1), Gi0/0: VLAN 20 (192.168.1.1)

**Kısa Tanıtım:**
Router iki fiziksel interface ile VLANlara bağlanır, trunk kullanılmaz.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 1 adet Router (R1) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/2 (Straight kablo)
   - PC-2 Eth0 -> SW1 Fa0/12 (Straight kablo)
   - R1 Gi0/1 -> SW1 Fa0/11 (Crossover kablo)
   - R1 Gi0/0 -> SW1 Fa0/1 (Crossover kablo)

2. **Switch Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - vlan 20
     name VLAN20
   - exit
   - interface fa0/2
     switchport mode access
     switchport access vlan 10
   - exit
   - interface fa0/12
     switchport mode access
     switchport access vlan 20
   - exit
   - interface fa0/11
     switchport mode access
     switchport access vlan 10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 20
   - exit

3. **Router Konfigürasyonu:**
   - R1 terminaline gir: enable, conf t
   - interface gi0/1
     ip address 192.168.0.1 255.255.255.0
     no shutdown
   - exit
   - interface gi0/0
     ip address 192.168.1.1 255.255.255.0
     no shutdown
   - exit
   - ip routing (otomatik aktiftir)

4. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.0.2, Subnet 255.255.255.0, Gateway 192.168.0.1, VLAN 10
   - PC-2: IP 192.168.1.2, Subnet 255.255.255.0, Gateway 192.168.1.1, VLAN 20

5. **Test:**
   - PC-1 ping 192.168.1.2 (PC-2) - Başarılı (inter-VLAN routing)

### 13. Port-Security
**ID:** `port-security`  
**Tag:** GÜVENLİK  
**Description:** Switch portunda MAC adres tabanlı güvenlik kısıtlaması yapılandırılmıştır.  
**Details:** Fa0/3: max MAC 1, violation shutdown, MAC: 00-11-22-33-44-55

**Kısa Tanıtım:**
Switch portunda MAC adres tabanlı güvenlik kısıtlaması yapılandırılmıştır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 1 adet PC (PC-1) ekle
   - PC-1 Eth0 -> SW1 Fa0/3 (Straight kablo)

2. **Switch Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - interface fa0/3
     switchport mode access
     switchport port-security
     switchport port-security maximum 1
     switchport port-security violation shutdown
     switchport port-security mac-address sticky
   - exit

3. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0
   - PC-1 MAC adresi otomatik öğrenilir (sticky)

4. **Doğrulama:**
   - show port-security interface fa0/3
   - show port-security address

5. **Test:**
   - PC-1'den trafik gönder (ping)
   - Farklı bir MAC adresi bağlanırsa port shutdown olur

⚠️ Not: Ağı Yenile (F5)

### 14. Wireless Network (WiFi)
**ID:** `wifi-intermediate`  
**Tag:** WiFi  
**Description:** Router access point mode ile kablosuz istemci bağlantısı sağlanır.  
**Details:** SSID: HomeWiFi, Şifre: yok (open), Router AP mode

**Kısa Tanıtım:**
Router access point mode ile kablosuz istemci bağlantısı sağlanır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (R1) ekle (AP mode)
   - 2 adet PC (PC-1, PC-2) ekle (WiFi client)

2. **Router Konfigürasyonu:**
   - R1 wlan0 üzerinde AP modunda SSID: HomeWiFi (open) yayınlar
   - DHCP havuzu (192.168.1.100-150) yapılandırılmıştır

3. **PC WiFi:**
   - PC-1 ve PC-2 kablosuz ağa (SSID match) bağlı

4. **Test:**
   - PC-1 > ping 192.168.1.11 (kablosuz iletişim testi)
   - PC-1 > wget 192.168.1.1 (Wifi kontrol paneli)

⚠️ Not: Ağı Yenile (F5)

### 15. IoT WiFi Lab
**ID:** `iot-wifi-lab`  
**Tag:** IoT  
**Description:** Üç IoT cihazı ve PC DHCP üzerinden açık WiFi ağına bağlanır.  
**Details:** SSID: IoT-Network, DHCP IP desteği, 3 IoT cihazı

**Kısa Tanıtım:**
Üç IoT cihazı ve PC DHCP üzerinden açık WiFi ağına bağlanır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (R1) ekle (AP mode)
   - 3 adet IoT cihazı ekle (Sıcaklık, Nem, Hareket)
   - 1 adet PC (PC-1) ekle

2. **Router Konfigürasyonu:**
   - R1 wlan0 üzerinde AP modunda SSID: IoT-Network (Open) yayınlar
   - DHCP havuzu (192.168.1.100-150)

3. **Bağlantı:**
   - PC-1 ve 3 IoT cihazı kablosuz ağa (DHCP) bağlıdır

4. **Test:**
   - PC-1 > ping 192.168.1.1 ile bağlantıyı test edin
   - PC-1 > wget http://iot-panel ile cihaz kontrol paneline ulaşınız
   - PC-1 üzerinde wget 192.168.1.1 ile WiFi panelinden IoT cihazlarını yönetin

⚠️ Not: Ağı Yenile (F5)

### 16. Greenhouse Sketch (Smart Farm)
**ID:** `greenhouse-iot-lab`  
**Tag:** ÇEVRE  
**Description:** Dört çevresel sensör WPA2 güvenli WiFi ile sera izleme yapar.  
**Details:** SSID: GreenHouse-Network, Şifre: sera (WPA2), 4 sensör

**Kısa Tanıtım:**
Dört çevresel sensör WPA2 güvenli WiFi ile sera izleme yapar.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (R1) ekle (AP mode)
   - 4 IoT Sensör: Sıcaklık (.101), Nem (.102), Işık (.103), Kapı/Hareket (.104)
   - 3 Aktüatör: Isıtıcı (.111), Soğutucu (.112), Lamba (.113)
   - 1 adet PC (PC-1) ekle

2. **Router Konfigürasyonu:**
   - SSID: GreenHouse-Network, WPA2 şifre: sera
   - DHCP havuzu (192.168.2.100-150)

3. **Sensörler ve Aktüatörler:**
   - IoT cihazları WiFi üzerinden bağlanır
   - Sıcaklık sensörü ısıtıcı/soğutucuyu otomatik yönetir
   - Işık sensörü lambayı otomatik yönetir

4. **Test:**
   - PC-1 ile WiFi panelinden (wget 192.168.2.1) sensörleri izleyin
   - IoT Panel: wget http://iot-panel (admin/admin) ile cihazları ve kuralları yönetin

### 17. DNS + HTTP Test
**ID:** `dns-http`  
**Tag:** DNS/HTTP  
**Description:** DNS name resolution ve HTTP web erişimi test edilir.  
**Details:** Test: wget 192.168.1.10, wget a10.com, nslookup a10.com

**Kısa Tanıtım:**
DNS name resolution ve HTTP web erişimi test edilir.

**Adım Adım Proje Yapımı:**
1. **Topoloji:** 1 Router (DNS/HTTP server) ve 1 PC ekleyin.
2. **Router:** HTTP sunucusunu ve DNS kayıtlarını yapılandırın (`ip host a10.com 192.168.1.10`).
3. **Test PC:** `nslookup a10.com` ve `wget a10.com` komutlarını çalıştırın.

### 18. DHCP Distribution Scenario
**ID:** `dhcp-distribution`  
**Tag:** DHCP  
**Description:** DHCP sunucusu otomatik IP dağıtımı yaparken manuel yapılandırma karşılaştırılır.  
**Details:** DHCP sunucusu PC1 ve PC2ye IP atarken PC3 manuel yapılandırma ile kalır.

**Kısa Tanıtım:**
DHCP sunucusu otomatik IP dağıtımı yaparken manuel yapılandırma karşılaştırılır.

**Adım Adım Proje Yapımı:**
1. **Topoloji:** 1 Router (DHCP server), 1 Switch, 3 PC ekleyin.
2. **Router DHCP:** `ip dhcp pool LAN` ile DHCP havuzu oluşturun.
3. **PC'ler:** PC1/PC2 DHCP modunda, PC3 manuel IP ile yapılandırın.
4. **Test:** `ipconfig` ile atanan IP'leri karşılaştırın.

### 19. 2 Switch Trunk Application
**ID:** `trunk-2switch`  
**Tag:** TRUNK  
**Description:** İki switch trunk bağlantısı ile VLAN trafiğini taşır.  
**Details:** SW-1/2: Fa0/1 VLAN100, Fa0/11 VLAN200, Gi0/1 trunk

**Kısa Tanıtım:**
İki switch trunk bağlantısı ile VLAN trafiğini taşır.

**Adım Adım Proje Yapımı:**
1. **Topoloji:** 2 Switch, 2 PC (VLAN 100) ve 2 PC (VLAN 200) ekleyin.
2. **Switch:** VLAN 100 ve 200 oluşturun, access portları atayın, Gi0/1 trunk yapılandırın.
3. **PC'ler:** VLAN 100 PC'leri 192.168.100.x, VLAN 200 PC'leri 192.168.200.x IP alır.
4. **Test:** Aynı VLAN'daki PC'ler birbirine ping atabilir, farklı VLAN'dakiler atamaz.

### 20. ACL Standard
**ID:** `acl-standard-basic`  
**Tag:** ACL  
**Description:** Standard ACL ile temel erişim kontrolü.  
**Details:** access-list 10 deny 192.168.1.0 0.0.0.255, access-list 10 permit any

**Kısa Tanıtım:**
Standard ACL ile temel erişim kontrolü.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 Router (R1), 1 Switch (SW1), 2 PC (PC-1, PC-2) ekleyin.
   - PC-1 ve PC-2'yi SW1'e, SW1'i R1'e bağlayın.
2. **IP Yapılandırması:**
   - PC-1: `192.168.1.10/24`, GW `192.168.1.1`
   - PC-2: `192.168.2.10/24`, GW `192.168.2.1`
   - R1 arayüzleri ilgili ağlara IP alacak şekilde yapılandırın.
3. **ACL Tanımı:**
   - R1 CLI:
   - `access-list 10 deny 192.168.1.0 0.0.0.255`
   - `access-list 10 permit any`
4. **ACL Uygulama:**
   - ACL 10'u hedef ağa yakın çıkış/yön arayüzüne uygulayın:
   - `interface gi0/1`
   - `ip access-group 10 out`
5. **Doğrulama:**
   - `show access-lists`
   - PC-1'den hedef ağa ping test edin (engellenmeli), diğer kaynakları test edin.

### 21. NAT Static
**ID:** `nat-static-basic`  
**Tag:** NAT  
**Description:** Static NAT ile birebir adres eşlemesi.  
**Details:** ip nat inside source static 192.168.1.10 203.0.113.10

**Kısa Tanıtım:**
Static NAT ile birebir adres eşlemesi.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 Router, 1 iç ağ istemcisi/sunucusu, 1 dış ağ test istemcisi kurun.
2. **Inside/Outside Arayüzleri:**
   - İç arayüz: `ip nat inside`
   - Dış arayüz: `ip nat outside`
3. **Static NAT Kuralı:**
   - `ip nat inside source static 192.168.1.10 203.0.113.10`
4. **Yönlendirme:**
   - Gerekli default/static route'ları ekleyin.
5. **Doğrulama:**
    - Dış istemciden `203.0.113.10` adresine erişimi test edin.

### 22. All Services Lab (DNS, HTTP, FTP, MAIL, NTP, DHCP)
**ID:** `all-services-lab`  
**Tag:** SERVICES  
**Description:** A comprehensive lab featuring basic network services (DNS, HTTP, DHCP, FTP, MAIL, NTP) running on PCs.  
**Details:** DNS: 1.10, HTTP: 1.20, DHCP: 1.30, FTP: 1.40, MAIL: 1.50, NTP: 1.60

**Kısa Tanıtım:**
PC'ler üzerinde çalışan temel ağ servislerinin bir arada bulunduğu kapsamlı laboratuvar.

**Adım Adım Proje Yapımı:**
1. **Topoloji:**
   - 1 adet Switch (SW1) ve 6 adet PC (PC-DNS, PC-HTTP, PC-DHCP, PC-FTP, PC-MAIL, PC-NTP) ekleyin.
   - Tüm PC'leri SW1'e bağlayın.
2. **IP Yapılandırması:**
   - PC-DNS: `192.168.1.10/24`
   - PC-HTTP: `192.168.1.20/24`
   - PC-DHCP: `192.168.1.30/24`
   - PC-FTP: `192.168.1.40/24`
   - PC-MAIL: `192.168.1.50/24`
   - PC-NTP: `192.168.1.60/24`
3. **Servis Konfigürasyonu:**
   - Her PC'de ilgili servisi (DNS, HTTP, DHCP, FTP, MAIL, NTP) etkinleştirin.
4. **Test:**
   - PC'ler arası servis erişimini test edin (nslookup, wget, ftp, ping).

---

## Advanced Level

### 23. Inter-VLAN Routing (L3 Switch)
**ID:** `l3-routing`  
**Tag:** L3 ROUTING  
**Description:** L3 switch üzerinde dört VLAN arası routing aktiftir.  
**Details:** VLAN 10: 192.168.10.1, VLAN 20: 192.168.20.1, VLAN 30: 192.168.30.1, VLAN 40: 192.168.40.1

**Kısa Tanıtım:**
L3 switch üzerinde dört VLAN arası routing aktiftir.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet L3 Switch (L3SW1) ekle
   - 4 adet PC ekle (PC-1, PC-2, PC-3, PC-4)
   - PC-1 Eth0 -> L3SW1 Gi1/0/1 (Straight kablo)
   - PC-2 Eth0 -> L3SW1 Gi1/0/2 (Straight kablo)
   - PC-3 Eth0 -> L3SW1 Gi1/0/3 (Straight kablo)
   - PC-4 Eth0 -> L3SW1 Gi1/0/4 (Straight kablo)

2. **L3 Switch Konfigürasyonu:**
   - L3SW1 terminaline gir: enable, conf t
   - ip routing
    - vlan 10
      name VLAN10
    - exit
    - vlan 20
      name VLAN20
    - exit
    - vlan 30
      name VLAN30
    - exit
    - vlan 40
      name VLAN40
    - exit
    - interface vlan 10
      ip address 192.168.10.1 255.255.255.0
      no shutdown
    - exit
    - interface vlan 20
      ip address 192.168.20.1 255.255.255.0
      no shutdown
    - exit
    - interface vlan 30
      ip address 192.168.30.1 255.255.255.0
      no shutdown
    - exit
    - interface vlan 40
      ip address 192.168.40.1 255.255.255.0
      no shutdown
    - exit
   - Access port atamaları (Gi1/0/1-4)

3. **PC'ler:** Her VLAN için bir PC bağlayın, gateway SVI IP'si olsun

4. **Test:**
   - show ip route (routing tablosunu gör)
   - Tüm PC'ler birbirine ping atabilir

### 24. Static Routing Lab
**ID:** `static-routing`  
**Tag:** ROUTING  
**Description:** İki router arası statik yönlendirme ile farklı subnetler arası iletişim.  
**Details:** R1: ip route 192.168.20.0 255.255.255.0 192.168.1.2 | R2: ip route 192.168.10.0 255.255.255.0 192.168.1.1  

**Kısa Tanıtım:**
İki router arası statik yönlendirme ile farklı subnetler arası iletişim.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet Router (R1, R2) ekle
   - 2 adet Switch (SW1, SW2) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)
   - SW1 Gi0/1 -> R1 Gi0/0 (Crossover kablo)
   - R1 Gi0/1 -> R2 Gi0/0 (Crossover kablo)
   - R2 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)

2. **R1 Konfigürasyonu:**
   - R1 terminaline gir: enable, conf t
   - interface gi0/0
     ip address 192.168.1.1 255.255.255.0
     no shutdown
   - exit
   - interface gi0/1
     ip address 192.168.10.1 255.255.255.0
     no shutdown
   - exit
   - ip route 192.168.20.0 255.255.255.0 192.168.1.2
   - exit

3. **R2 Konfigürasyonu:**
   - R2 terminaline gir: enable, conf t
   - interface gi0/0
     ip address 192.168.1.2 255.255.255.0
     no shutdown
   - exit
   - interface gi0/1
     ip address 192.168.20.1 255.255.255.0
     no shutdown
   - exit
   - ip route 192.168.10.0 255.255.255.0 192.168.1.1
   - exit

4. **Switch Konfigürasyonu:**
   - SW1 ve SW2: access port yapılandırması

5. **PC IP ve Gateway Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, GW 192.168.10.1
   - PC-2: IP 192.168.20.10, GW 192.168.20.1

6. **Test:**
   - show ip route (statik rotaları gör)
   - PC-1 ping 192.168.20.10 (PC-2)

### 25. EtherChannel Lab
**ID:** `etherchannel`  
**Tag:** ETHERCHANNEL  
**Description:** LACP ile birden fazla link tek bir mantıksal bağlantıda birleştirilir.  
**Details:** Fa0/1-2: channel-group 1 mode active, Po1 trunk  

**Kısa Tanıtım:**
LACP ile birden fazla link tek bir mantıksal bağlantıda birleştirilir.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet Switch (SW1, SW2) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)
   - SW1 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)
   - SW1 Gi0/2 -> SW2 Gi0/2 (Crossover kablo)

2. **SW1 Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface range gi0/1-2
     channel-group 1 mode active
   - exit
   - interface port-channel 1
     switchport mode trunk
   - exit

3. **SW2 Konfigürasyonu:**
   - SW2 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface range gi0/1-2
     channel-group 1 mode active
   - exit
   - interface port-channel 1
     switchport mode trunk
   - exit

4. **PC IP Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, VLAN 10
   - PC-2: IP 192.168.10.11, VLAN 10

5. **Test:**
   - show etherchannel summary (EtherChannel durumunu gör)
   - show spanning-tree (STP durumunu kontrol et)
   - PC-1 ping 192.168.10.11 (PC-2)

### 26. STP Redundant Links
**ID:** `stp-redundant`  
**Tag:** STP  
**Description:** Rapid-PVST redundant linklerde loop önlemek için STP kullanır.  
**Details:** SW1: spanning-tree priority 28672 (root)  

**Kısa Tanıtım:**
Rapid-PVST redundant linklerde loop önlemek için STP kullanır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet Switch (SW1, SW2) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)
   - SW1 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)
   - SW1 Gi0/2 -> SW2 Gi0/2 (Crossover kablo)

2. **SW1 Konfigürasyonu (ROOT BRIDGE):**
   - SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface range gi0/1-2
     switchport mode trunk
   - exit
   - spanning-tree mode rapid-pvst
   - spanning-tree vlan 10 priority 28672
   - exit

3. **SW2 Konfigürasyonu:**
   - SW2 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface range gi0/1-2
     switchport mode trunk
   - exit
   - spanning-tree mode rapid-pvst
   - exit

4. **PC IP Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, VLAN 10
   - PC-2: IP 192.168.10.11, VLAN 10

5. **Test:**
   - show spanning-tree (STP durumunu gör)
   - SW1 Gi0/2 bloke olmalı (BLK)
   - Gi0/1 kablo kesilirse Gi0/2 otomatik aktif olur

⚠️ Not: Ağı Yenile (F5)

### 27. STP Triangle Topology
**ID:** `stp-triangle`  
**Tag:** STP  
**Description:** Üç switch triangle topolojisinde STP bir portu bloke eder.  
**Details:** SW1 Fa0/1 bloke (STP), SW2 root  

**Kısa Tanıtım:**
Üç switch triangle topolojisinde STP bir portu bloke eder.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 3 adet Switch (SW1, SW2, SW3) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/24 (Straight kablo)
   - PC-2 Eth0 -> SW2 Fa0/24 (Straight kablo)
   - SW1 Fa0/1 -> SW3 Fa0/1 (Crossover kablo)
   - SW1 Fa0/2 -> SW2 Fa0/1 (Crossover kablo)
   - SW2 Fa0/2 -> SW3 Fa0/2 (Crossover kablo)

2. **SW1 Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - spanning-tree mode rapid-pvst
   - spanning-tree vlan 1 priority 32768
   - exit

3. **SW2 Konfigürasyonu (ROOT BRIDGE):**
   - SW2 terminaline gir: enable, conf t
   - spanning-tree mode rapid-pvst
   - spanning-tree vlan 1 priority 28672
   - exit

4. **SW3 Konfigürasyonu:**
   - SW3 terminaline gir: enable, conf t
   - spanning-tree mode rapid-pvst
   - spanning-tree vlan 1 priority 32768
   - exit

5. **Test:**
   - show spanning-tree ile STP durumunu kontrol et
   - Bloke port (SW1 Fa0/1)
   - SW1 Fa0/1 kablo kesilirse otomatik aktif olur

⚠️ Not: Ağı Yenile (F5)

### 28. Campus Network
**ID:** `campus-network`  
**Tag:** CAMPUS  
**Description:** Core router iki access switch arası routing sağlar.  
**Details:** CORE-R1: Gi0/0 VLAN 10, Gi0/1 VLAN 20, ip routing  

**Kısa Tanıtım:**
Core router iki access switch arası routing sağlar.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (CORE-R1) ekle
   - 2 adet Switch (ACC-SW1, ACC-SW2) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> ACC-SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> ACC-SW2 Fa0/1 (Straight kablo)
   - ACC-SW1 Gi0/1 -> CORE-R1 Gi0/0 (Crossover kablo)
   - ACC-SW2 Gi0/1 -> CORE-R1 Gi0/1 (Crossover kablo)

2. **CORE-R1 Konfigürasyonu:**
   - CORE-R1 terminaline gir: enable, conf t
   - interface gi0/0
     ip address 192.168.10.1 255.255.255.0
     no shutdown
   - exit
   - interface gi0/1
     ip address 192.168.20.1 255.255.255.0
     no shutdown
   - exit
   - ip routing
   - exit

3. **ACC-SW1 Konfigürasyonu:**
   - ACC-SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface gi0/1
     switchport mode access
   - exit

4. **ACC-SW2 Konfigürasyonu:**
   - ACC-SW2 terminaline gir: enable, conf t
   - vlan 20
     name VLAN20
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 20
   - exit
   - interface gi0/1
     switchport mode access
   - exit

5. **PC IP Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10
   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20

6. **Test:**
   - PC-1 ping 192.168.20.10 (PC-2)

### 29. STP 3 Switch PVST
**ID:** `stp-3switch-pvst`  
**Tag:** STP  
**Description:** PVST ile her VLAN için farklı root bridge yük dengelemesi sağlanır.  
**Details:** VLAN1 root SW1, VLAN10 root SW2, VLAN20 root SW3  

**Kısa Tanıtım:**
PVST ile her VLAN için farklı root bridge yük dengelemesi sağlanır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 3 adet L3 Switch (SW1, SW2, SW3) ekle
   - 9 adet PC ekle (her switch için 3 PC)
   - Switch'ler arası trunk bağlantıları kur (Gi1/0/1-2)
   - PC'leri ilgili VLAN'lara bağla

2. **VLAN'lar Oluştur:**
   - Her switch'te vlan 1, 10, 20 oluştur

3. **Root Bridge Ayarla:**
   - SW1: spanning-tree vlan 1 priority 24576
   - SW2: spanning-tree vlan 10 priority 24576
   - SW3: spanning-tree vlan 20 priority 24576

4. **Trunk Bağlantıları:**
   - Gi1/0/1 ve Gi1/0/2 trunk mode (dot1q encapsulation)

5. **Test:**
   - show spanning-tree vlan 1
   - show spanning-tree vlan 10
   - show spanning-tree vlan 20
   - Her VLAN farklı root kullanır

### 30. 2 L3 Switch VLAN (AG1/AG2)
**ID:** `l3-switch-2vlan`  
**Tag:** L3 VLAN  
**Description:** İki L3 switch SVI gateway ile VLAN 10 ve 20 arası routing sağlar.  
**Details:** Switch2/4: ip routing, VLAN10 SVI 192.168.10.1, VLAN20 SVI 192.168.20.1  

**Kısa Tanıtım:**
İki L3 switch SVI gateway ile VLAN 10 ve 20 arası routing sağlar.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet L3 Switch (Switch2, Switch4) ekle
   - 8 adet PC ekle (PC4-PC11)
   - Switch2 Gi1/0/5 -> Switch4 Gi1/0/5 (Crossover kablo)
   - PC4-PC5 -> Switch2 Gi1/0/1-2 (VLAN 10)
   - PC6-PC7 -> Switch2 Gi1/0/3-4 (VLAN 20)
   - PC8-PC9 -> Switch4 Gi1/0/1-2 (VLAN 10)
   - PC10-PC11 -> Switch4 Gi1/0/3-4 (VLAN 20)

2. **Switch2 Konfigürasyonu:**
   - Switch2 terminaline gir: enable, conf t
    - vlan 10
      name AG1
    - exit
    - vlan 20
      name AG2
    - exit
    - ip routing
    - interface vlan 10
      ip address 192.168.10.1 255.255.255.0
      no shutdown
    - exit
    - interface vlan 20
      ip address 192.168.20.1 255.255.255.0
      no shutdown
    - exit
    - interface gi1/0/5
      switchport trunk encapsulation dot1q
      switchport mode trunk
    - exit
    - interface range gi1/0/1-2
      switchport mode access
      switchport access vlan 10
    - exit
    - interface range gi1/0/3-4
      switchport mode access
      switchport access vlan 20
    - exit

3. **Switch4 Konfigürasyonu:**
    - Aynı yapılandırma Switch2 ile aynı

4. **PC IP Konfigürasyonu:**
   - VLAN 10 PC'ler: IP 192.168.10.x, GW 192.168.10.1
   - VLAN 20 PC'ler: IP 192.168.20.x, GW 192.168.20.1

5. **Test:**
   - Tüm PC'ler birbirine ping atabilir

### 31. L3 Switch Static Routing
**ID:** `static-l3-routing`  
**Tag:** STATIK ROUTING  
**Description:** Multilayer switchler ve router statik rotalarla ağlar arası iletişim sağlar.  
**Details:** ML1: ip route 192.168.2.0 255.255.255.0 10.0.0.2 | R3: ip route 192.168.1.0 255.255.255.0 10.0.0.1, ip route 192.168.2.0 255.255.255.0 20.0.0.2 | ML2: ip route 192.168.1.0 255.255.255.0 20.0.0.1  

**Kısa Tanıtım:**
Multilayer switchler ve router statik rotalarla ağlar arası iletişim sağlar.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet L3 Switch (ML1, ML2) ekle
   - 1 adet Router (R3) ekle
   - 2 adet L2 Switch (Switch0, Switch1) ekle
   - 4 adet PC ekle
   - Bağlantıları topolojiye göre yapıştır

2. **ML1 Konfigürasyonu:**
   - enable, conf t
   - ip routing
   - interface gi1/0/1
     no switchport
     ip address 10.0.0.1 255.0.0.0
     no shutdown
   - exit
   - interface gi1/0/2
     no switchport
     ip address 192.168.1.1 255.255.255.0
     no shutdown
   - exit
   - ip route 192.168.2.0 255.255.255.0 10.0.0.2

3. **R3 Konfigürasyonu:**
   - enable, conf t
   - interface gi0/0
     ip address 10.0.0.2 255.0.0.0
     no shutdown
   - exit
   - interface gi0/1
     ip address 20.0.0.1 255.0.0.0
     no shutdown
   - exit
   - ip route 192.168.1.0 255.255.255.0 10.0.0.1
   - ip route 192.168.2.0 255.255.255.0 20.0.0.2

4. **ML2 Konfigürasyonu:**
   - enable, conf t
   - ip routing
   - interface gi1/0/1
     no switchport
     ip address 20.0.0.2 255.0.0.0
     no shutdown
   - exit
   - interface gi1/0/2
     no switchport
     ip address 192.168.2.1 255.255.255.0
     no shutdown
   - exit
   - ip route 192.168.1.0 255.255.255.0 20.0.0.1

5. **Test:**
   - show ip route (statik rotaları gör)
   - PC'ler arası ping testi

### 32. RIP Dynamic Routing
**ID:** `rip-dynamic-routing`  
**Tag:** RIP ROUTING  
**Description:** RIP dinamik yönlendirme protokolü otomatik route öğrenimi sağlar.  
**Details:** ML0: router rip, network 192.168.1.0, network 192.168.2.0 | ML1: router rip, network 192.168.2.0, network 192.168.3.0  

**Kısa Tanıtım:**
RIP dinamik yönlendirme protokolü otomatik route öğrenimi sağlar.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet L3 Switch (ML0, ML1) ekle
   - 2 adet L2 Switch (Switch0-L2, Switch3-L2) ekle
   - 4 adet PC (PC0-PC3) ekle
   - PC0-PC1 -> Switch0-L2 Fa0/1-2
   - Switch0-L2 Fa0/24 -> ML0 Gi1/0/23
   - ML0 Gi1/0/24 -> ML1 Gi1/0/24 (Crossover)
   - ML1 Gi1/0/23 -> Switch3-L2 Fa0/24
   - Switch3-L2 Fa0/1-2 -> PC2-PC3

2. **ML0 Konfigürasyonu:**
   - enable, conf t
   - ip routing
   - interface gi1/0/23
     no switchport
     ip address 192.168.1.1 255.255.255.0
     no shutdown
   - exit
   - interface gi1/0/24
     no switchport
     ip address 192.168.2.1 255.255.255.0
     no shutdown
   - exit
   - router rip
     network 192.168.1.0
     network 192.168.2.0
   - exit

3. **ML1 Konfigürasyonu:**
   - enable, conf t
   - ip routing
   - interface gi1/0/24
     no switchport
     ip address 192.168.2.2 255.255.255.0
     no shutdown
   - exit
   - interface gi1/0/23
     no switchport
     ip address 192.168.3.1 255.255.255.0
     no shutdown
   - exit
   - router rip
     network 192.168.2.0
     network 192.168.3.0
   - exit

4. **PC Konfigürasyonu:**
   - PC0-PC1: IP 192.168.1.x, GW 192.168.1.1
   - PC2-PC3: IP 192.168.3.x, GW 192.168.3.1

5. **Test:**
   - show ip route (dinamik rotaları gör)
   - PC0 ping 192.168.3.10 (PC2)

### 33. ACL Extended 
**ID:** `acl-extended-basic`  
**Tag:** ACL  
**Description:** Extended ACL ile protokol/port bazlı filtreleme.  
**Details:** ip access-list extended WEB-FILTER, permit tcp any any eq 80, deny ip any any  

**Kısa Tanıtım:**
Extended ACL ile protokol/port bazlı filtreleme.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - Router, switch ve en az 2 istemci ekleyin.
2. **Temel IP Ayarları:**
   - İstemcileri farklı segmentlerden erişecek şekilde yapılandırın.
3. **Extended ACL Yazımı:**
   - `ip access-list extended WEB-FILTER`
   - `permit tcp any any eq 80`
   - `deny ip any any`
4. **Arayüze Uygulama:**
   - `interface gi0/0`
   - `ip access-group WEB-FILTER in`
5. **Test:**
   - HTTP (`wget`/web erişimi) başarılı olmalı.
   - Ping ve diğer trafik türleri engellenmeli.
    - `show access-lists` ile sayaçları kontrol edin.

### 34. NAT Dynamic 
**ID:** `nat-dynamic-basic`  
**Tag:** NAT  
**Description:** NAT havuzu ile dinamik çeviri.  
**Details:** ip nat pool OUT 203.0.113.20 203.0.113.30 netmask 255.255.255.0  

**Kısa Tanıtım:**
NAT havuzu ile dinamik çeviri.

**Adım Adım Proje Yapımı:**
1. **NAT Havuzu Tanımı:**
   - `ip nat pool OUT 203.0.113.20 203.0.113.30 netmask 255.255.255.0`
2. **Erişim Listesi:**
   - `access-list 1 permit 192.168.1.0 0.0.0.255`
3. **NAT Eşleme:**
   - `ip nat inside source list 1 pool OUT`
4. **Inside/Outside Arayüz Ataması:**
   - İç arayüzlerde `ip nat inside`, dış arayüzde `ip nat outside`.
5. **Test ve Doğrulama:**
   - İç istemcilerden dış ağa trafik oluşturun.
   - `show ip nat translations` ve `show ip nat statistics` komutlarını kontrol edin.

### 35. NAT PAT 
**ID:** `nat-pat-basic`  
**Tag:** NAT  
**Description:** PAT (NAT overload) ile çoktan-bire çeviri.  
**Details:** ip nat inside source list 1 interface gi0/0 overload  

**Kısa Tanıtım:**
PAT (NAT overload) ile çoktan-bire çeviri.

**Adım Adım Proje Yapımı:**
1. **ACL Tanımı:**
   - `access-list 1 permit 192.168.10.0 0.0.0.255`
2. **PAT Konfigürasyonu:**
   - `ip nat inside source list 1 interface gi0/0 overload`
3. **Arayüz Rolleri:**
   - LAN arayüzü `ip nat inside`
   - WAN arayüzü `ip nat outside`
4. **Yönlendirme:**
   - `ip route 0.0.0.0 0.0.0.0 <upstream-next-hop>`
5. **Doğrulama:**
   - Birden fazla PC’den eşzamanlı web/ping testi yapın.
   - `show ip nat translations` içinde port bazlı eşleşmeleri görün.

### 36. HSRP Redundancy 
**ID:** `hsrp-redundancy-basic`  
**Tag:** HSRP  
**Description:** Varsayılan ağ geçidi yedekliliği için HSRP.  
**Details:** standby 1 ip 192.168.10.254, standby 1 priority 110, standby 1 preempt  

**Kısa Tanıtım:**
Varsayılan ağ geçidi yedekliliği için HSRP.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - Aynı VLAN’a bağlı 2 L3 cihaz ve istemciler ekleyin.
2. **SVI/IP Konfigürasyonu:**
   - Her iki cihazda VLAN arayüzlerine gerçek IP verin.
3. **HSRP Ayarları (Primary):**
   - `standby 1 ip 192.168.10.254`
   - `standby 1 priority 110`
   - `standby 1 preempt`
4. **HSRP Ayarları (Secondary):**
   - Aynı grup ve sanal IP ile daha düşük priority verin.
5. **Failover Testi:**
   - Primary arayüzünü kapatıp gateway erişimini test edin.
   - `show standby brief` ile active/standby durumlarını doğrulayın.

### 37. OSPF Multi-Area (1)
**ID:** `ospf-multi-area-1`  
**Tag:** OSPF  
**Description:** Area 0 ve Area 10 ile çok alanlı OSPF.  
**Details:** router ospf 1, network 10.0.0.0 0.0.0.255 area 0, network 10.0.10.0 0.0.0.255 area 10  

**Kısa Tanıtım:**
Area 0 ve Area 10 ile çok alanlı OSPF.

**Adım Adım Proje Yapımı:**
1. **Router Planı:**
   - En az 3 router ile bir ABR topolojisi kurun.
2. **OSPF Süreci:**
   - `router ospf 1`
3. **Area Atamaları:**
   - Backbone linklerinde `area 0`
   - Uç segmentlerde `area 10`
4. **Arayüz/Network Komutları:**
   - `network 10.0.0.0 0.0.0.255 area 0`
   - `network 10.0.10.0 0.0.0.255 area 10`
5. **Doğrulama:**
   - `show ip ospf neighbor`
   - `show ip route ospf`
   - Farklı alanlardaki istemciler arası ping testi.

### 38. OSPF Multi-Area (2)
**ID:** `ospf-multi-area-2`  
**Tag:** OSPF  
**Description:** ABR üzerinden farklı OSPF alanlarının omurgaya bağlanması.  
**Details:** router ospf 1, area 20 stub, area 10 range 10.10.0.0 255.255.0.0  

**Kısa Tanıtım:**
ABR üzerinden farklı OSPF alanlarının omurgaya bağlanması.

**Adım Adım Proje Yapımı:**
1. **Çok Alanlı Topoloji:**
   - Area 0, Area 10 ve Area 20 içeren yapı oluşturun.
2. **Stub Area Tanımı:**
   - İlgili ABR/area router’da `area 20 stub`.
3. **Özetleme (Summarization):**
   - ABR üzerinde `area 10 range 10.10.0.0 255.255.0.0`.
4. **Komşuluk ve LSA Kontrolü:**
   - `show ip ospf database`
   - `show ip ospf interface brief`
5. **Test:**
   - Stub area’dan dış alanlara erişimi doğrulayın.
   - Routing tablosunda özet rota davranışını kontrol edin.

### 39. EIGRP Basic 
**ID:** `eigrp-basic-1`  
**Tag:** EIGRP  
**Description:** Temel EIGRP komutları ile dinamik yönlendirme kurulumu.  
**Details:** router eigrp 100, network 192.168.1.0 0.0.0.255, no auto-summary  

**Kısa Tanıtım:**
Temel EIGRP komutları ile dinamik yönlendirme kurulumu.

**Adım Adım Proje Yapımı:**
1. **Topoloji Kurulumu:**
   - En az 2 router ve uç ağlar oluşturun.
2. **EIGRP Süreci:**
   - `router eigrp 100`
3. **Ağ Duyuruları:**
   - `network 192.168.1.0 0.0.0.255`
   - Diğer bağlı ağları da ekleyin.
4. **Özetleme Ayarı:**
   - `no auto-summary`
5. **Doğrulama:**
   - `show ip eigrp neighbors`
   - `show ip route eigrp`
   - Uçtan uca ping ile erişim testi.

### 40. IPv6 Advanced Lab (DHCPv6 & OSPFv3)
**ID:** `ipv6-advanced-lab`  
**Tag:** IPv6  
**Description:** IPv6 adresleme, DHCPv6 havuzları ve OSPFv3 dinamik yönlendirme.  
**Details:** ipv6 unicast-routing, ipv6 dhcp pool LAN, address prefix 2001:db8:1::/64, ipv6 router ospf 1  

**Kısa Tanıtım:**
IPv6 adresleme, DHCPv6 havuzları ve OSPFv3 dinamik yönlendirme.

**Adım Adım Proje Yapımı:**
1. **Topoloji:** 2 Router ve bağlı PC'ler ekleyin.
2. **Unicast Routing:** `ipv6 unicast-routing` komutu ile IPv6 yönlendirmeyi aktif edin.
3. **Adresleme:** Interface'lere `2001:db8:...` bloklarından IP atayın.
4. **DHCPv6:** İstemciler için DHCPv6 havuzu oluşturun.
5. **OSPFv3:** `ipv6 router ospf 1` ile router'lar arası dinamik rota paylaşımı sağlayın.

---

## Summary

| Level / Seviye | Count / Adet |
|-------|-------|
| Basic / Temel | 9 |
| Intermediate / Orta | 13 |
| Advanced / İleri | 18 |
| **Total Examples** | **40** |
| **Total Project Lines (src/)** | **95,941** |

## Getting Started

To use these examples:
1. Open the Network Simulator 2026.
2. Click on "Example Projects" in the sidebar.
3. Select an example from the list.
4. The example will load with pre-configured devices and connections.
5. Follow the notes provided in the canvas for specific configuration steps.

## Contributing

To add a new example:
1. Define devices in `src/lib/network/exampleProjects.ts`.
2. Configure connections between devices.
3. Set initial states for each device.
4. Add notes explaining the topology and configuration.
5. Add the example to the `exampleProjects` array.
6. Update this documentation.

---

## Grid ve Snap Ayarları

### Grid Noktaları
- **Grid Boyutu:** 16px (küçültülmüş)
- **Grid Noktası Yarıçapı:** 0.5px (daha ince görünüm)

### Snap-to-Grid Özelliği
- **Varsayılan:** Etkin
- **Ctrl + Drag:** Cihazları tam grid'e yapıştırır (16px grid)
- **Kullanım:** Cihazları düzenli bir şekilde hizalamak için Ctrl tuşunu basılı tutarak sürükleyin

---

## Kısayol Güncellemeleri

### Yeni Kısayollar
| Kısayol | İşlem |
|---------|-------|
| `F5` | Ağ topolojisini yenile |
| `Ctrl + Drag` | Cihazı grid'e yapıştır (16px) |
| `Ctrl+X` | Konfigürasyonu kes |
| `Double-click` | Cihaz yapılandırma panelini aç |

---

## DHCP Sunucusu Yapılandırması Örneği

**Amaç:** Router üzerinde DHCP sunucusu yapılandırarak PC'lere otomatik IP ataması yapmak.

### Topoloji Oluşturma
1. **Cihazlar:**
   - 1 adet Router (R1)
   - 1 adet Switch (SW1)
   - 2 adet PC (PC-1, PC-2)

2. **Bağlantılar:**
   - R1 Gi0/0 -> SW1 Gi0/1 (Crossover kablo)
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)

### Router DHCP Yapılandırması

```
R1# enable
R1# configure terminal
R1(config)# interface gi0/0
R1(config-if)# ip address 192.168.10.1 255.255.255.0
R1(config-if)# no shutdown
R1(config-if)# exit
R1(config)# ip dhcp pool LAN
R1(dhcp-config)# network 192.168.10.0 255.255.255.0
R1(dhcp-config)# default-router 192.168.10.1
R1(dhcp-config)# dns-server 8.8.8.8
R1(dhcp-config)# lease 1
R1(dhcp-config)# exit
R1(config)# exit
R1# write memory
```

### Switch Yapılandırması

```
SW1# enable
SW1# configure terminal
SW1(config)# interface vlan 1
SW1(config-if)# ip address 192.168.10.2 255.255.255.0
SW1(config-if)# no shutdown
SW1(config-if)# exit
SW1(config)# interface range fa0/1-2
SW1(config-if-range)# switchport mode access
SW1(config-if-range)# exit
SW1(config)# exit
SW1# write memory
```

### PC Yapılandırması

1. **PC-1 ve PC-2:**
   - IP Yapılandırması: DHCP
   - Terminal'de: `ipconfig /renew` (Windows) veya `dhclient` (Linux)

### Doğrulama

```
R1# show ip dhcp binding
R1# show ip dhcp pool
PC-1# ipconfig (Windows) veya ifconfig (Linux)
PC-2# ipconfig (Windows) veya ifconfig (Linux)
```

### Beklenen Sonuç

- PC-1: 192.168.10.3 (DHCP tarafından atanmış)
- PC-2: 192.168.10.4 (DHCP tarafından atanmış)
- Her PC'nin Gateway: 192.168.10.1
- Her PC'nin DNS: 8.8.8.8

### Sorun Giderme

**Sorun:** İlk otomatik ağ yenilemesinde portlar takılı görünüyor
- **Çözüm:** Elle ağ yenileme (F5) yapın. Sistem portların durumunu doğru şekilde güncelleyecektir.

**Sorun:** PC'ler DHCP IP alamıyor
- Kontrol edin: `show ip dhcp pool` (Router'da pool tanımlı mı?)
- Kontrol edin: `show ip dhcp binding` (Lease atanmış mı?)
- Kontrol edin: Bağlantılar aktif mi? (show interfaces)

**Sorun:** PC'ler birbirine ping atamıyor
- Kontrol edin: Aynı subnet'te mi? (192.168.10.x)
- Kontrol edin: Gateway doğru mu? (192.168.10.1)
- Kontrol edin: Switch port'ları aktif mi? (show interfaces status)

---

## IPv6 Yönlendirme Yapılandırması Örneği (OSPFv3)

**Amaç:** İki router arasında OSPFv3 kullanarak IPv6 bağlantısı sağlamak.

### Topoloji Oluşturma
1. **Cihazlar:**
   - 2 adet Router (R1, R2)
   - 2 adet PC (PC-1, PC-2)

2. **Bağlantılar:**
   - R1 Gi0/1 -> R2 Gi0/1 (Crossover kablo)
   - PC-1 Eth0 -> R1 Gi0/0 (Straight kablo)
   - PC-2 Eth0 -> R2 Gi0/0 (Straight kablo)

### Router-1 Yapılandırması

```
R1# enable
R1# configure terminal
R1(config)# ipv6 unicast-routing
R1(config)# interface gi0/0
R1(config-if)# ipv6 address 2001:db8:1::1/64
R1(config-if)# no shutdown
R1(config-if)# ipv6 ospf 1 area 0
R1(config-if)# exit
R1(config)# interface gi0/1
R1(config-if)# ipv6 address 2001:db8:12::1/64
R1(config-if)# no shutdown
R1(config-if)# ipv6 ospf 1 area 0
R1(config-if)# exit
R1(config)# ipv6 router ospf 1
R1(config-router)# exit
```

### Router-2 Yapılandırması

```
R2# enable
R2# configure terminal
R2(config)# ipv6 unicast-routing
R2(config)# interface gi0/0
R2(config-if)# ipv6 address 2001:db8:2::1/64
R2(config-if)# no shutdown
R2(config-if)# ipv6 ospf 1 area 0
R2(config-if)# exit
R2(config)# interface gi0/1
R2(config-if)# ipv6 address 2001:db8:12::2/64
R2(config-if)# no shutdown
R2(config-if)# ipv6 ospf 1 area 0
R2(config-if)# exit
R2(config)# ipv6 router ospf 1
R2(config-router)# exit
```

### Doğrulama

```
R1# show ipv6 route
R1# show ipv6 interface brief
PC-1# ping 2001:db8:2::10 (PC-2'nin IPv6 adresi)
```
