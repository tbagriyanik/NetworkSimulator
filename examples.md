# Network Simulator 2026 - Example Projects

This document provides detailed descriptions of all 39 example projects available in the Network Simulator 2026.

## Table of Contents

- [Basic Level](#basic-level)
- [Intermediate Level](#intermediate-level)
- [Advanced Level](#advanced-level)

---

## Basic Level

### 1. Basic Network + Passwords
**ID:** `basic-secure`  
**Tag:** BASIC  
**Description:** Console, VTY, and enable passwords with 1 PC + 1 switch.  
**Details:** enable secret: class, enable password: paswd, console: console, vty: vty123  

**Kısa Tanıtım:**
Bu örnekte bir switch üzerinde konsol, VTY ve enable parolalarının nasıl yapılandırılacağını öğreneceksiniz. Ayrıca yönetim için VLAN arayüzüne IP atayacaksınız.

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
   - PC-2'den SW1 console'a bağlan
   - Parolaları test et
   - PC-1'den SW1'e telnet bağlantısı dene

### 2. Single Switch VLANs
**ID:** `single-vlan`  
**Tag:** VLAN  
**Description:** VLAN 10/20 with two access PCs.  

**Kısa Tanıtım:**
Tek bir switch üzerinde VLAN oluşturarak PC'leri farklı broadcast domain'lere ayırmayı öğreneceksiniz.

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
**Description:** SSH access from PC-1 to router R1.  
**Details:** Command: ssh admin@192.168.1.150 | password: 1234  

**Kısa Tanıtım:**
Router üzerinde SSH yapılandırarak güvenli uzaktan yönetim erişimi sağlamayı öğreneceksiniz.

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
**Description:** Automatic IP assignment to two PCs via router DHCP pool.  
**Details:** R1: ip dhcp pool LAN, PC-1/PC-2: ipconfig /renew  

**Kısa Tanıtım:**
Router üzerinde DHCP sunucusu yapılandırarak PC'lere otomatik IP ataması yapmayı öğreneceksiniz.

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
   - interface range fa0/1-2
     switchport mode access
   - exit

4. **PC Konfigürasyonu:**
   - PC-1 ve PC-2: DHCP moduna ayarla
   - CMD: ipconfig /renew

5. **Test:**
   - ipconfig (atanan IP'leri gör)
   - PC'ler birbirine ping atabilir

### 5. MAC Table Lab
**ID:** `mac-table-lab`  
**Tag:** MAC  
**Description:** Use show mac address-table on SWITCH-1 to compare the MAC entries for PC1, PC2, and ROUTER-2.  
**Details:** PC1: 00-e0-f7-01-a1-b1, PC2: 97-31-e5-97-a7-03, SW1: 042c.802b.9da9, R2: 4145.c35d.e6d1  

**Kısa Tanıtım:**
Switch MAC adres tablosunun nasıl çalıştığını ve cihazların MAC adreslerinin nasıl öğrenildiğini inceleyeceksiniz.

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
**Description:** Match ARP and show mac address-table output between PCs and SWITCH-1.  
**Details:** PC terminal: arp, arp -a | SWITCH-1#: show mac address-table  

**Kısa Tanıtım:**
ARP cache ve MAC adres tablosu arasındaki farkları ve Layer 2 ile Layer 3 adres eşleşmelerini anlayacaksınız.

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
**Description:** Discover how identical IP/mask on PC1 & PC2 enables connectivity while PC3 differs.  
**Details:** PC1/PC2: 192.168.1.x/255.255.255.0; PC3: different config, ping fails.  

**Kısa Tanıtım:**
IP adresleri ve subnet mask'lerin aynı ağdaki cihazlar arası iletişimi nasıl etkilediğini öğreneceksiniz.

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
**Description:** Basic native VLAN configuration with trunk connection between 2 switches.  
**Details:** VLAN 99 as native.  

**Kısa Tanıtım:**
Trunk bağlantısında native VLAN yapılandırarak etiketsiz trafiğin belirli bir VLAN üzerinden geçmesini sağlamayı öğreneceksiniz.

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
   - Aynı yapılandırma SW1 ile aynı

4. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.99.10, Subnet 255.255.255.0, VLAN 99
   - PC-2: IP 192.168.99.11, Subnet 255.255.255.0, VLAN 99

5. **Test:**
   - PC-1 <-> PC-2 ping

---

## Intermediate Level

### 9. Two Switch Trunk + VTP
**ID:** `trunk-vtp`  
**Tag:** TRUNK/VTP  
**Description:** Gi0/1 trunk, VTP domain LAB, VLAN 10/20 ready.  

**Kısa Tanıtım:**
İki switch arasında VTP kullanarak VLAN bilgilerinin otomatik yayılımını sağlamayı öğreneceksiniz.

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

### 10. ROAS (Router-on-a-Stick)
**ID:** `roas`  
**Tag:** ROAS  
**Description:** Switch trunk + router with ROAS subinterface configuration.  

**Kısa Tanıtım:**
Router-on-a-Stick kullanarak tek bir router interface'i üzerinden farklı VLAN'lar arası routing sağlamayı öğreneceksiniz.

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
   - interface gi1/0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface gi1/0/2
     switchport mode access
     switchport access vlan 20
   - exit
   - interface gi1/0/3
     switchport mode access
     switchport access vlan 30
   - exit
   - interface gi1/0/4
     switchport mode access
     switchport access vlan 40
   - exit

3. **PC IP ve Gateway Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10
   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20
   - PC-3: IP 192.168.30.10, GW 192.168.30.1, VLAN 30
   - PC-4: IP 192.168.40.10, GW 192.168.40.1, VLAN 40

4. **Test:**
   - Tüm PC'ler birbirine ping atabilir

### 20. Static Routing Lab
**ID:** `static-routing`  
**Tag:** ROUTING  
**Description:** 2 routers, 2 switches, 2 PCs, static routes.  
**Details:** R1: ip route 192.168.20.0/24 192.168.2.2.  

**Kısa Tanıtım:**
Router'larda static routing yapılandırarak farklı ağlar arası iletişim sağlamayı öğreneceksiniz.

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

4. **SW1 ve SW2 Konfigürasyonu:**
   - Switch'lerde access port yapılandırması

5. **PC IP ve Gateway Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, GW 192.168.10.1
   - PC-2: IP 192.168.20.10, GW 192.168.20.1

6. **Test:**
   - PC-1 <-> PC-2 ping
   - show ip route

### 21. EtherChannel Lab
**ID:** `etherchannel`  
**Tag:** ETHERCHANNEL  
**Description:** 2 switches, LACP, link aggregation.  
**Details:** channel-group 1 mode active, Po1 trunk.  

**Kısa Tanıtım:**
İki switch arasında EtherChannel (LACP) kullanarak bant genişliğini artırmak ve redundancy sağlamayı öğreneceksiniz.

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
   - PC-1 ve PC-2: IP 192.168.10.x, VLAN 10

5. **Test:**
   - show etherchannel summary
   - PC-1 <-> PC-2 ping

### 22. STP Redundant Links
**ID:** `stp-redundant`  
**Tag:** STP  
**Description:** 2 switches, redundant links, Rapid-PVST.  
**Details:** spanning-tree priority 28672.  

**Kısa Tanıtım:**
STP kullanarak redundant link'lerde loop önlemek ve path sağlamayı öğreneceksiniz.

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
   - PC-1 ve PC-2: IP 192.168.10.x, VLAN 10

5. **Test:**
   - show spanning-tree
   - Bir link kesilirse diğer path aktif olur

### 23. STP Triangle Topology
**ID:** `stp-triangle`  
**Tag:** STP  
**Description:** 3 switches, triangle topology, STP blocking.  
**Details:** SW1: Fa0/1 blocked (orange).  

**Kısa Tanıtım:**
Üç switch arasında triangle topolojide STP kullanarak loop önlemek ve path sağlamayı öğreneceksiniz.

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
   - show spanning-tree
   - Bloke port (SW1 Fa0/1)
   - SW1 Fa0/1 kablo kesilirse otomatik aktif olur

### 24. Campus Network
**ID:** `campus-network`  
**Tag:** CAMPUS  
**Description:** Core router + 2 access switches, routing.  
**Details:** CORE-R1 ip routing, VLAN 10/20.  

**Kısa Tanıtım:**
Campus ağ topolojisinde core router ve access switch'ler kullanarak VLAN'lar arası routing sağlamayı öğreneceksiniz.

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

### 25. STP 3 Switch PVST
**ID:** `stp-3switch-pvst`  
**Tag:** STP  
**Description:** 3 switches, 3 VLANs, different root bridge per VLAN, trunk connections.  
**Details:** VLAN1 root SW1, VLAN10 root SW2, VLAN20 root SW3.  

**Kısa Tanıtım:**
PVST kullanarak her VLAN için ayrı STP instance'ı oluşturarak load balancing sağlamayı öğreneceksiniz.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 3 adet L3 Switch (SW1, SW2, SW3) ekle
   - 9 adet PC ekle (her switch için 3 PC)
   - Switch'ler arası trunk bağlantıları kur
   - PC'leri ilgili VLAN'lara bağla

2. **VLAN'lar Oluştur:**
   - Her switch'te vlan 1, 10, 20 oluştur

3. **Root Bridge Ayarla:**
   - SW1: spanning-tree vlan 1 priority 24576
   - SW2: spanning-tree vlan 10 priority 24576
   - SW3: spanning-tree vlan 20 priority 24576

4. **Trunk Bağlantıları:**
   - Gi0/1 ve Gi0/2 trunk mode

5. **Test:**
   - show spanning-tree vlan 1
   - show spanning-tree vlan 10
   - show spanning-tree vlan 20
   - Her VLAN farklı root kullanır

### 26. 2 L3 Switch VLAN (AG1/AG2)
**ID:** `l3-switch-2vlan`  
**Tag:** L3 VLAN  
**Description:** 2 L3 switches, VLAN 10 (AG1) and VLAN 20 (AG2), SVI gateway, 8 PCs.  
**Details:** Switch2/Switch4: ip routing, VLAN10 SVI 192.168.10.1, VLAN20 SVI 192.168.20.1.  

**Kısa Tanıtım:**
İki L3 switch arasında trunk bağlantısı ile VLAN'lar arası routing sağlamayı öğreneceksiniz.

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
    - Switch4 terminaline gir: enable, conf t
    - Aynı yapılandırma Switch2 ile aynı
 
4. **PC IP Konfigürasyonu:**
   - VLAN 10 PC'ler: IP 192.168.10.x, GW 192.168.10.1
   - VLAN 20 PC'ler: IP 192.168.20.x, GW 192.168.20.1

5. **Test:**
   - Tüm PC'ler birbirine ping atabilir

### 27. L3 Switch Static Routing
**ID:** `static-l3-routing`  
**Tag:** STATIC ROUTING  
**Description:** 2 Multilayer Switches + 1 Router + 2 L2 Switches + 2 PCs.  

**Kısa Tanıtım:**
L3 switch'ler ve router arasında static routing yapılandırarak farklı ağlar arası iletişim sağlamayı öğreneceksiniz.

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
     ip address 192.168.1.1 255.255.255.0
     no shutdown
   - exit
   - interface gi1/0/2
     no switchport
     ip address 10.0.0.1 255.0.0.0
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
   - show ip route
   - Uç PC'ler arası ping

### 28. RIP Dynamic Routing
**ID:** `rip-dynamic-routing`  
**Tag:** RIP ROUTING  
**Description:** 2 Multilayer Switches + 2 L2 Switches + 4 PCs. RIP dynamic routing.  

**Kısa Tanıtım:**
L3 switch'ler arasında RIP dynamic routing yapılandırarak otomatik route öğrenimi sağlamayı öğreneceksiniz.

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

4. **Switch0-L2 ve Switch3-L2 Konfigürasyonu:**
   - VLAN ve access port yapılandırmaları

5. **PC IP Konfigürasyonu:**
   - PC0-PC1: 192.168.1.x subnet
   - PC2-PC3: 192.168.3.x subnet

6. **Test:**
   - show ip route
   - Tüm PC'ler birbirine ping atabilir

### 29. ACL Standard 
**ID:** `acl-standard-basic`  
**Tag:** ACL  
**Description:** Basic access control with standard ACL.  
**Details:** access-list 10 deny 192.168.1.0 0.0.0.255, access-list 10 permit any.  

**Kısa Tanıtım:**
Bu örnekte standard ACL ile belirli bir kaynak ağın erişimi sınırlandırılır.

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

### 30. ACL Extended 
**ID:** `acl-extended-basic`  
**Tag:** ACL  
**Description:** Protocol and port based filtering with extended ACL.  
**Details:** ip access-list extended WEB-FILTER, permit tcp any any eq 80, deny ip any any.  

**Kısa Tanıtım:**
Extended ACL ile sadece HTTP trafiğine izin verip diğer IP trafiği engelleyeceksiniz.

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

### 31. NAT Static 
**ID:** `nat-static-basic`  
**Tag:** NAT  
**Description:** One-to-one address mapping with static NAT.  
**Details:** ip nat inside source static 192.168.1.10 203.0.113.10.  

**Kısa Tanıtım:**
Bu örnekte iç ağdaki bir sunucu, sabit bir genel IP ile dış dünyaya yayınlanır.

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
    - `show ip nat translations` çıktısını kontrol edin.


### 32. NAT Dynamic 
**ID:** `nat-dynamic-basic`  
**Tag:** NAT  
**Description:** Dynamic translation with NAT pool.  
**Details:** ip nat pool OUT 203.0.113.20 203.0.113.30 netmask 255.255.255.0.  

**Kısa Tanıtım:**
Dinamik NAT ile iç ağdaki istemcilere havuzdan geçici genel IP atanır.

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

### 33. NAT PAT 
**ID:** `nat-pat-basic`  
**Tag:** NAT  
**Description:** Many-to-one translation with PAT (NAT overload).  
**Details:** ip nat inside source list 1 interface gi0/0 overload.  

**Kısa Tanıtım:**
PAT (NAT overload) ile birden çok istemci tek dış IP üzerinden internete çıkar.

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

### 34. HSRP Redundancy 
**ID:** `hsrp-redundancy-basic`  
**Tag:** HSRP  
**Description:** HSRP for default gateway redundancy.  
**Details:** standby 1 ip 192.168.10.254, standby 1 priority 110, standby 1 preempt.  

**Kısa Tanıtım:**
HSRP ile iki L3 cihaz arasında sanal gateway oluşturularak kesintisiz ağ geçidi sağlanır.

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

### 35. OSPF Multi-Area 
**ID:** `ospf-multi-area-1`  
**Tag:** OSPF  
**Description:** Multi-area OSPF with Area 0 and Area 10.  
**Details:** router ospf 1, network 10.0.0.0 0.0.0.255 area 0, network 10.0.10.0 0.0.0.255 area 10.  

**Kısa Tanıtım:**
Bu senaryoda backbone (Area 0) ve bir edge area (Area 10) arasında OSPF komşulukları kurulur.

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

### 36. OSPF Multi-Area 
**ID:** `ospf-multi-area-2`  
**Tag:** OSPF  
**Description:** Connecting multiple OSPF areas to backbone via ABR.  
**Details:** router ospf 1, area 20 stub, area 10 range 10.10.0.0 255.255.0.0.  

**Kısa Tanıtım:**
Bu örnekte stub area ve route summarization ile OSPF ölçeklenebilirliği artırılır.

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

### 37. EIGRP Basic 
**ID:** `eigrp-basic-1`  
**Tag:** EIGRP  
**Description:** Dynamic routing setup using basic EIGRP commands.  
**Details:** router eigrp 100, network 192.168.1.0 0.0.0.255, no auto-summary.  

**Kısa Tanıtım:**
EIGRP AS 100 ile temel komşuluk ve rota öğrenimi kurulur.

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

### 38. Firewall Basic (ICMP Block)
**ID:** `firewall-basic`  
**Tag:** FIREWALL  
**Description:** ICMP (ping) blocked, all other traffic allowed simple firewall.  
**Details:** Rule 1: DENY ICMP | Rule 2: ALLOW ANY.  

**Kısa Tanıtım:**
ICMP paketlerinin engellendiği ancak HTTP gibi diğer trafiklerin izin verildiği temel bir firewall senaryosunu inceleyeceksiniz.

**Adım Adım Proje Yapımı:**
1. **Topoloji:** 1 Firewall cihazı, 1 PC ve 1 Router/Sunucu ekleyin.
2. **Kurallar:** 
   - Firewall panelinden ICMP (Ping) protokolünü `DENY` olarak ekleyin.
   - Ardından tüm trafiğe (`ANY`) `ALLOW` kuralı ekleyin.
3. **Test:**
   - PC'den router'a ping atmayı deneyin (Başarısız olmalı).
   - PC'den router'a HTTP (curl/wget) isteği yapın (Başarılı olmalı).

### 39. IPv6 Advanced Lab (DHCPv6 & OSPFv3)
**ID:** `ipv6-advanced-lab`  
**Tag:** IPv6  
**Description:** IPv6 addressing, DHCPv6 pools and OSPFv3 dynamic routing.  
**Details:** ipv6 unicast-routing, ipv6 dhcp pool LAN, address prefix 2001:db8:1::/64, ipv6 router ospf 1.  

**Kısa Tanıtım:**
Gelişmiş IPv6 yapılandırması, DHCPv6 ile otomatik adres dağıtımı ve OSPFv3 yönlendirme protokolünü öğreneceksiniz.

**Adım Adım Proje Yapımı:**
1. **Topoloji:** 2 Router ve bağlı PC'ler ekleyin.
2. **Unicast Routing:** `ipv6 unicast-routing` komutu ile IPv6 yönlendirmeyi aktif edin.
3. **Adresleme:** Interface'lere `2001:db8:...` bloklarından IP atayın.
4. **DHCPv6:** İstemciler için DHCPv6 havuzu oluşturun.
5. **OSPFv3:** `ipv6 router ospf 1` ile router'lar arası dinamik rota paylaşımı sağlayın.

---

## Summary

| Level | Count |
|-------|-------|
| Basic | 11 |
| Intermediate | 11 |
| Advanced | 17 |
| **Total Examples** | **39** |
| **Total Code Lines** | **15,650** |

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
