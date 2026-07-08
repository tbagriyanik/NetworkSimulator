# Ağ Topolojisi Görsel Örnekleri - Network Simulator 2026

## 1. Temel Topoloji: Tek Switch ile VLAN Yapıllandırması

```mermaid
graph TB
    subgraph "VLAN 10 - Yönetim"
        PC1["🖥️ PC-1<br/>192.168.10.10/24<br/>Gateway: 192.168.10.1"]
    end

    subgraph "VLAN 20 - Kullanıcı"
        PC2["🖥️ PC-2<br/>192.168.20.10/24<br/>Gateway: 192.168.20.1"]
        PC3["🖥️ PC-3<br/>192.168.20.11/24<br/>Gateway: 192.168.20.1"]
    end

    subgraph "VLAN 30 - Sunucular"
        PC4["🖥️ PC-4 (Sunucu)<br/>192.168.30.10/24<br/>Gateway: 192.168.30.1"]
    end

    SW1["🔀 Cisco WS-C2960-24TT-L<br/>SW1<br/>─────────────<br/>Fa0/1 → VLAN 10 Access<br/>Fa0/2 → VLAN 20 Access<br/>Fa0/3 → VLAN 20 Access<br/>Fa0/4 → VLAN 30 Access<br/>Gi0/1 → Trunk (VLAN 10,20,30)"]

    R1["🌐 Cisco Router<br/>R1<br/>─────────────<br/>Gi0/0.10 → 192.168.10.1/24<br/>Gi0/0.20 → 192.168.20.1/24<br/>Gi0/0.30 → 192.168.30.1/24<br/>Router-on-a-Stick"]

    PC1 -->|"Straight Cable<br/>Fa0/1"| SW1
    PC2 -->|"Straight Cable<br/>Fa0/2"| SW1
    PC3 -->|"Straight Cable<br/>Fa0/3"| SW1
    PC4 -->|"Straight Cable<br/>Fa0/4"| SW1
    SW1 -->|"Trunk (802.1Q)<br/>Gi0/1"| R1

    style PC1 fill:#4CAF50,color:#fff
    style PC2 fill:#2196F3,color:#fff
    style PC3 fill:#2196F3,color:#fff
    style PC4 fill:#FF9800,color:#fff
    style SW1 fill:#9C27B0,color:#fff
    style R1 fill:#F44336,color:#fff
```

---

## 2. Orta Seviye: Statik Yaplama ve Campusa Ağ

```mermaid
graph TB
    subgraph "Yerel Ağ 1 - 192.168.10.0/24"
        PC1["🖥️ PC-1<br/>IP: 192.168.10.10<br/>GW: 192.168.10.1"]
        SW1["🔀 SW1<br/>WS-C2960<br/>────────<br/>Fa0/1-4: VLAN 10<br/>Gi0/1: Uplink"]
    end

    subgraph "Yerel Ağ 2 - 192.168.20.0/24"
        PC2["🖥️ PC-2<br/>IP: 192.168.20.10<br/>GW: 192.168.20.1"]
        SW2["🔀 SW2<br/>WS-C2960<br/>────────<br/>Fa0/1-4: VLAN 20<br/>Gi0/1: Uplink"]
    end

    subgraph "Yönetim Ağı - 10.0.0.0/8"
        PC_MGMT["🖥️ Yönetim PC<br/>IP: 10.0.0.100"]
    end

    subgraph "Yönetim Linkleri"
        R1["🌐 R1<br/>─────────────<br/>Gi0/0: 192.168.10.1/24<br/>Gi0/1: 192.168.20.1/24<br/>Gi0/2: 10.0.0.1/8<br/>─────────────<br/>Statik Yollar:<br/>→ 192.168.20.0/24 via 10.0.0.2<br/>→ 10.0.0.0/8 connected"]

        R2["🌐 R2<br/>─────────────<br/>Gi0/0: 10.0.0.2/8<br/>Gi0/1: 192.168.30.1/24<br/>─────────────<br/>Statik Yollar:<br/>→ 192.168.10.0/24 via 10.0.0.1<br/>→ 192.168.20.0/24 via 10.0.0.1"]
    end

    subgraph "Yedekleme Ağı - 192.168.30.0/24"
        PC3["🖥️ PC-3<br/>IP: 192.168.30.10<br/>GW: 192.168.30.1"]
        SW3["🔀 SW3<br/>WS-C2960"]
        FW["🛡️ Firewall<br/>ASA<br/>────────<br/>Gi0/0: 192.168.30.2<br/>Gi0/1: Outside"]
    end

    PC1 -->|"Copper"| SW1
    PC2 -->|"Copper"| SW2
    SW1 -->|"Crossover"| R1
    SW2 -->|"Crossover"| R1
    R1 -->|"Serial S0/0/0<br/>HDLC"| R2
    R2 -->|"Crossover"| SW3
    SW3 -->|"Copper"| PC3
    SW3 -->|"Copper"| FW
    PC_MGMT -->|"Console"| R1

    style PC1 fill:#4CAF50,color:#fff
    style PC2 fill:#2196F3,color:#fff
    style PC3 fill:#FF9800,color:#fff
    style PC_MGMT fill:#607D8B,color:#fff
    style SW1 fill:#9C27B0,color:#fff
    style SW2 fill:#9C27B0,color:#fff
    style SW3 fill:#9C27B0,color:#fff
    style R1 fill:#F44336,color:#fff
    style R2 fill:#F44336,color:#fff
    style FW fill:#795548,color:#fff
```

---

## 3. İleri Seviye: OSPF Çoklu Bölge ve Kablosuz Ağ

```mermaid
graph TB
    subgraph "OSPF Bölge 0 - Backbone"
        R1["🌐 R1 - ABR<br/>─────────────<br/>Gi0/0: 10.0.1.1/24<br/>Gi0/1: 10.0.0.1/24<br/>Gi0/2: 172.16.0.1/16<br/>─────────────<br/>OSPF Area 0,1<br/>Router ID: 1.1.1.1"]

        R2["🌐 R2 - ABR<br/>─────────────<br/>Gi0/0: 10.0.0.2/24<br/>Gi0/1: 10.0.2.1/24<br/>─────────────<br/>OSPF Area 0,2<br/>Router ID: 2.2.2.2"]
    end

    subgraph "OSPF Bölge 1 - 192.168.10.0/24"
        SW_L3_1["🔀 SW-L3-1<br/>WS-C3650<br/>─────────────<br/>Gi1/0/1: 192.168.10.1/24<br/>Gi1/1/1: 10.0.1.2/24<br/>─────────────<br/>OSPF Area 1<br/>VLAN 10,20,30"]

        PC1["🖥️ PC-1<br/>VLAN 10<br/>192.168.10.10"]
        PC2["🖥️ PC-2<br/>VLAN 20<br/>192.168.20.10"]
        PC3["🖥️ PC-3<br/>VLAN 30<br/>192.168.30.10"]
    end

    subgraph "OSPF Bölge 2 - 192.168.40.0/24"
        SW_L3_2["🔀 SW-L3-2<br/>WS-C3650<br/>─────────────<br/>Gi1/0/1: 192.168.40.1/24<br/>Gi1/1/1: 10.0.2.2/24<br/>─────────────<br/>OSPF Area 2<br/>VLAN 40,50"]

        PC4["🖥️ PC-4<br/>VLAN 40<br/>192.168.40.10"]
        PC5["🖥️ PC-5<br/>VLAN 50<br/>192.168.50.10"]
    end

    subgraph "Kablosuz Ağ - VLAN 100"
        WLC["📡 WLC<br/>Wireless LAN Controller<br/>────────<br/>VLAN 100: 192.168.100.1"]

        AP1["📶 AP-1<br/>Access Point<br/>SSID: CAMPUS-5G<br/>Ch: 36 (5GHz)<br/>WPA3-Enterprise"]

        AP2["📶 AP-2<br/>Access Point<br/>SSID: CAMPUS-IoT<br/>Ch: 1 (2.4GHz)<br/>WPA2-PSK"]

        IOT1["🌡️ IoT-Sensor<br/>Sıcaklık: 24.5°C<br/>Nem: %65"]
        IOT2["💡 IoT-Aktör<br/>LED: ON<br/>Durum: Aktif"]
        IOT3["🚪 IoT-Kilit<br/>Durum: Kilitli<br/>Son Erişim: 14:32"]
    end

    subgraph "IoT Sensör Ağı"
        IOT_HUB["🔌 IoT Gateway<br/>192.168.100.254"]
    end

    R1 <-->|"Gi0/1-Gi0/0<br/>10.0.0.0/24<br/>OSPF Area 0"| R2
    R1 -->|"Gi0/2-Gi1/1/1<br/>OSPF Area 0→1"| SW_L3_1
    R2 -->|"Gi0/1-Gi1/1/1<br/>OSPF Area 0→2"| SW_L3_2

    SW_L3_1 <-->|"Trunk<br/>VLAN 10,20,30"| PC1
    SW_L3_1 <-->|"Trunk<br/>VLAN 10,20,30"| PC2
    SW_L3_1 <-->|"Trunk<br/>VLAN 10,20,30"| PC3

    SW_L3_2 <-->|"Trunk<br/>VLAN 40,50"| PC4
    SW_L3_2 <-->|"Trunk<br/>VLAN 40,50"| PC5

    WLC -->|"VLAN 100"| AP1
    WLC -->|"VLAN 100"| AP2
    AP1 <-.->|"WiFi 5GHz"| IOT1
    AP2 <-.->|"WiFi 2.4GHz"| IOT2
    AP2 <-.->|"WiFi 2.4GHz"| IOT3
    IOT1 --> IOT_HUB
    IOT2 --> IOT_HUB
    IOT3 --> IOT_HUB
    WLC --> IOT_HUB

    style R1 fill:#F44336,color:#fff
    style R2 fill:#F44336,color:#fff
    style SW_L3_1 fill:#9C27B0,color:#fff
    style SW_L3_2 fill:#9C27B0,color:#fff
    style PC1 fill:#4CAF50,color:#fff
    style PC2 fill:#4CAF50,color:#fff
    style PC3 fill:#4CAF50,color:#fff
    style PC4 fill:#4CAF50,color:#fff
    style PC5 fill:#4CAF50,color:#fff
    style WLC fill:#00BCD4,color:#fff
    style AP1 fill:#00BCD4,color:#fff
    style AP2 fill:#00BCD4,color:#fff
    style IOT1 fill:#FF9800,color:#fff
    style IOT2 fill:#FF9800,color:#fff
    style IOT3 fill:#FF9800,color:#fff
    style IOT_HUB fill:#FF9800,color:#fff
```

---

## 4. Gerçek Dünya Senaryosu: Hastane Ağı

```mermaid
graph TB
    subgraph "Internet"
        INET["🌍 Internet<br/>WAN"]
    end

    subgraph "Güvenlik Katmanı"
        FW["🛡️ ASA Firewall<br/>─────────────<br/>Outside: 203.0.113.1<br/>Inside: 10.0.0.1<br/>DMZ: 172.16.0.1<br/>─────────────<br/>NAT, ACL, IPS<br/>VPN Gateway"]
    end

    subgraph "DMZ - 172.16.0.0/24"
        WEB["🌐 Web Sunucusu<br/>172.16.0.10<br/>Apache/Nginx"]
        MAIL["📧 Mail Sunucusu<br/>172.16.0.11<br/>Postfix"]
        DNS["🔍 DNS Sunucusu<br/>172.16.0.12<br/>BIND"]
    end

    subgraph "Çekirdek Ağ - 10.0.0.0/8"
        CORE_SW["🔀 Core Switch<br/>WS-C3650 L3<br/>─────────────<br/>VLAN 10: Yönetim<br/>VLAN 20: Tıbbi Cihazlar<br/>VLAN 30: Hasta WiFi<br/>VLAN 40: Personel<br/>VLAN 50: IP Telefon<br/>─────────────<br/>OSPF Area 0"]

        R_CORE["🌐 Core Router<br/>─────────────<br/>Gi0/0: 10.0.0.1<br/>Gi0/1: 172.16.0.1<br/>Gi0/2: 203.0.113.1<br/>─────────────<br/>BGP AS 65000"]
    end

    subgraph "Tıbbi Cihaz Ağı - VLAN 20"
        MRI["🏥 MRI Cihazı<br/>10.20.1.10<br/>DICOM"]
        CT["🏥 CT Tarama<br/>10.20.1.11<br/>HL7 FHIR"]
        MONITOR["🏥 hasta Monitörü<br/>10.20.1.20<br/>Real-time"]
        PUMP["🏥 İlaç Pompası<br/>10.20.1.30<br/>HL7"]
    end

    subgraph "Personel Ağı - VLAN 40"
        DOC_PC1["🖥️ Doktor PC-1<br/>10.40.1.10<br/>EHR Sistemi"]
        DOC_PC2["🖥️ Doktor PC-2<br/>10.40.1.11<br/>EHR Sistemi"]
        NURSE["🖥️ Hemşire İstasyonu<br/>10.40.1.20<br/>HIS"]
    end

    subgraph "Hasta WiFi - VLAN 30"
        WIFI_AP["📶 WiFi AP<br/>SSID: HASTANE-MISAFIR<br/>WPA2-PSK<br/>Bandwidth: 10Mbps/user"]

        PATIENT1["📱 Hasta Cihazı 1"]
        PATIENT2["📱 Hasta Cihazı 2"]
        VISITOR["📱 Ziyaretçi"]
    end

    subgraph "IP Telefon - VLAN 50"
        IP_PHONE1["📞 IP Telefon 1<br/>Ext: 1001"]
        IP_PHONE2["📞 IP Telefon 2<br/>Ext: 1002"]
        PBX["🎙️ IP PBX<br/>10.50.1.1<br/>SIP Server"]
    end

    subgraph "Güvenlik Sistemi"
        CCTV["📷 CCTV Kamera<br/>10.60.1.10<br/>VLAN 60"]
        ACCESS["🔐 Kartlı Geçiş<br/>10.60.1.20<br/>VLAN 60"]
        ALARM["🚨 Alarm Paneli<br/>10.60.1.30<br/>VLAN 60"]
    end

    INET <-->|"IPSec VPN"| FW
    FW <-->|"Trunk"| R_CORE
    R_CORE <-->|"Trunk"| CORE_SW

    FW --> WEB
    FW --> MAIL
    FW --> DNS

    CORE_SW <-->|"Access VLAN 20"| MRI
    CORE_SW <-->|"Access VLAN 20"| CT
    CORE_SW <-->|"Access VLAN 20"| MONITOR
    CORE_SW <-->|"Access VLAN 20"| PUMP

    CORE_SW <-->|"Access VLAN 40"| DOC_PC1
    CORE_SW <-->|"Access VLAN 40"| DOC_PC2
    CORE_SW <-->|"Access VLAN 40"| NURSE

    CORE_SW <-->|"Trunk VLAN 30"| WIFI_AP
    WIFI_AP <-.->|"WiFi"| PATIENT1
    WIFI_AP <-.->|"WiFi"| PATIENT2
    WIFI_AP <-.->|"WiFi"| VISITOR

    CORE_SW <-->|"Access VLAN 50"| PBX
    PBX <-->|"SIP"| IP_PHONE1
    PBX <-->|"SIP"| IP_PHONE2

    CORE_SW <-->|"Access VLAN 60"| CCTV
    CORE_SW <-->|"Access VLAN 60"| ACCESS
    CORE_SW <-->|"Access VLAN 60"| ALARM

    style INET fill:#607D8B,color:#fff
    style FW fill:#795548,color:#fff
    style WEB fill:#009688,color:#fff
    style MAIL fill:#009688,color:#fff
    style DNS fill:#009688,color:#fff
    style CORE_SW fill:#9C27B0,color:#fff
    style R_CORE fill:#F44336,color:#fff
    style MRI fill:#E91E63,color:#fff
    style CT fill:#E91E63,color:#fff
    style MONITOR fill:#E91E63,color:#fff
    style PUMP fill:#E91E63,color:#fff
    style DOC_PC1 fill:#4CAF50,color:#fff
    style DOC_PC2 fill:#4CAF50,color:#fff
    style NURSE fill:#4CAF50,color:#fff
    style WIFI_AP fill:#00BCD4,color:#fff
    style PATIENT1 fill:#FFC107,color:#000
    style PATIENT2 fill:#FFC107,color:#000
    style VISITOR fill:#FFC107,color:#000
    style IP_PHONE1 fill:#3F51B5,color:#fff
    style IP_PHONE2 fill:#3F51B5,color:#fff
    style PBX fill:#3F51B5,color:#fff
    style CCTV fill:#FF5722,color:#fff
    style ACCESS fill:#FF5722,color:#fff
    style ALARM fill:#FF5722,color:#fff
```

---

## 5. Kurumsal Kampüs Ağı - Tam Örnek

```mermaid
graph TB
    subgraph "WAN"
        INET["🌍 Internet<br/>ISP"]
        MPLS["🔗 MPLS WAN<br/>Şube Bağlantısı"]
    end

    subgraph "Veri Merkezi"
        DC_FW["🛡️ DC Firewall<br/>Palo Alto"]
        DC_SW["🔀 DC Core<br/>Nexus 9K"]
        SRV_WEB["🌐 Web Server<br/>10.10.1.10"]
        SRV_DB["🗄️ Database<br/>10.10.1.20"]
        SRV_APP["⚙️ App Server<br/>10.10.1.30"]
        SRV_BACKUP["💾 Backup<br/>10.10.1.40"]
    end

    subgraph "Ana Kampüs - Bina A"
        BLDG_A_SW["🔀 Bina-A Switch<br/>WS-C3650 L3"]
        WIFI_A["📶 WiFi AP x4<br/>SSID: CAMPUS-Corp<br/>802.1X RADIUS"]

        OFFICE1["🏢 Ofis 1<br/>PC, Yazıcı<br/>VLAN 100"]
        OFFICE2["🏢 Ofis 2<br/>PC, Telefon<br/>VLAN 100"]
        CONF["📋 Toplantı<br/>Video Konferans<br/>VLAN 200"]
        LAB["🔬 Lab<br/>Test Cihazları<br/>VLAN 300"]
    end

    subgraph "İkincil Kampüs - Bina B"
        BLDG_B_SW["🔀 Bina-B Switch<br/>WS-C3650 L3"]
        WIFI_B["📶 WiFi AP x2<br/>SSID: CAMPUS-Guest<br/>Captive Portal"]

        HALL["🎓 Konferans<br/>200+ Kişi<br/>VLAN 400"]
        LIBRARY["📚 Kütüphane<br/>PC Lab<br/>VLAN 500"]
    end

    subgraph "Stadyum / Etkinlik Alanı"
        EVENT_SW["🔀 Event Switch<br/>PoE+"]
        CAM1["📷 Kamera x8<br/>VLAN 600"]
        SCOREBOARD["📊 Skorboard<br/>VLAN 600"]
        VIP["🎪 VIP Alan<br/>WiFi + TV<br/>VLAN 700"]
    end

    subgraph "Altyapı"
        NTP["🕐 NTP Server<br/>10.10.2.1"]
        SYSLOG["📝 Syslog<br/>10.10.2.2"]
        RADIUS["🔑 RADIUS<br/>10.10.2.3"]
        SNMP["📊 SNMP Monitor<br/>10.10.2.4"]
    end

    INET <--> DC_FW
    MPLS <--> DC_FW
    DC_FW <--> DC_SW

    DC_SW --> SRV_WEB
    DC_SW --> SRV_DB
    DC_SW --> SRV_APP
    DC_SW --> SRV_BACKUP

    DC_SW <-->|"10G Uplink<br/>LACP EtherChannel"| BLDG_A_SW
    DC_SW <-->|"10G Uplink<br/>LACP EtherChannel"| BLDG_B_SW
    DC_SW <-->|"Fiber Uplink"| EVENT_SW

    BLDG_A_SW <--> OFFICE1
    BLDG_A_SW <--> OFFICE2
    BLDG_A_SW <--> CONF
    BLDG_A_SW <--> LAB
    BLDG_A_SW <--> WIFI_A

    BLDG_B_SW <--> HALL
    BLDG_B_SW <--> LIBRARY
    BLDG_B_SW <--> WIFI_B

    EVENT_SW --> CAM1
    EVENT_SW --> SCOREBOARD
    EVENT_SW --> VIP

    DC_SW --> NTP
    DC_SW --> SYSLOG
    DC_SW --> RADIUS
    DC_SW --> SNMP

    style INET fill:#607D8B,color:#fff
    style MPLS fill:#607D8B,color:#fff
    style DC_FW fill:#795548,color:#fff
    style DC_SW fill:#9C27B0,color:#fff
    style SRV_WEB fill:#009688,color:#fff
    style SRV_DB fill:#009688,color:#fff
    style SRV_APP fill:#009688,color:#fff
    style SRV_BACKUP fill:#009688,color:#fff
    style BLDG_A_SW fill:#9C27B0,color:#fff
    style BLDG_B_SW fill:#9C27B0,color:#fff
    style EVENT_SW fill:#9C27B0,color:#fff
    style WIFI_A fill:#00BCD4,color:#fff
    style WIFI_B fill:#00BCD4,color:#fff
    style OFFICE1 fill:#4CAF50,color:#fff
    style OFFICE2 fill:#4CAF50,color:#fff
    style CONF fill:#4CAF50,color:#fff
    style LAB fill:#4CAF50,color:#fff
    style HALL fill:#4CAF50,color:#fff
    style LIBRARY fill:#4CAF50,color:#fff
    style CAM1 fill:#FF5722,color:#fff
    style SCOREBOARD fill:#FF5722,color:#fff
    style VIP fill:#FFC107,color:#000
    style NTP fill:#FF9800,color:#fff
    style SYSLOG fill:#FF9800,color:#fff
    style RADIUS fill:#FF9800,color:#fff
    style SNMP fill:#FF9800,color:#fff
```

---

## 6. Akıllı Yeşil Serada IoT Topolojisi

```mermaid
graph TB
    subgraph "Bulut Servisleri"
        AWS["☁️ AWS IoT Core<br/>MQTT Broker"]
        DASH["📊 Dashboard<br/>Grafana<br/>Monitoring"]
    end

    subgraph "Yerel Ağ"
        ROUTER["🌐 Router<br/>─────────────<br/>Gi0/0: 192.168.1.1<br/>WLAN0: AP Mode<br/>SSID: GREENHOUSE<br/>─────────────<br/>DHCP Server<br/>NAT Overload"]

        SWITCH["🔀 L2 Switch<br/>WS-C2960<br/>─────────────<br/>Fa0/1: IoT GW<br/>Fa0/2: Kamera<br/>Gi0/1: Uplink"]

        PC["🖥️ Yönetim PC<br/>192.168.1.100<br/>─────────────<br/>Grafana Dashboard<br/>SSH Management"]
    end

    subgraph "IoT Sensör Ağı - 192.168.10.0/24"
        IOT_GW["🔌 IoT Gateway<br/>192.168.10.1<br/>─────────────<br/>Zigbee ↔ WiFi<br/>MQTT Publisher<br/>Local Buffer"]

        subgraph "Sensörler"
            S1["🌡️ Sıcaklık<br/>DHT22<br/>24.5°C<br/>Okuma: 5sn"]
            S2["💧 Nem<br/>DHT22<br/>%65<br/>Okuma: 5sn"]
            S3["☀️ Işık<br/>BH1750<br/>450 lux<br/>Okuma: 10sn"]
            S4["🌱 Toprak Nem<br/>Capacitive<br/>%42<br/>Okuma: 30sn"]
            S5["💨 CO2<br/>MH-Z19<br/>420 ppm<br/>Okuma: 30sn"]
            S6["🔔 Basınç<br/>BMP280<br/>1013 hPa<br/>Okuma: 60sn"]
        end

        subgraph "Aktuatörler"
            A1["🚿 Sulama Vanası<br/>GPIO Relay<br/>Durum: Kapalı<br/>Otomatik: ON"]
            A2["💨 Fan<br/>PWM Control<br/>Hız: %40<br/>Otomatik: ON"]
            A3["💡 LED Aydınlatma<br/>PWM Dimming<br/>Parlaklık: %75<br/>Timer: 06:00-20:00"]
            A4["🔥 Isıtıcı<br/>PID Control<br/>Hedef: 25°C<br/>Durum: Pasif"]
        end
    end

    subgraph "Güvenlik"
        CAM["📷 IP Kamera<br/>192.168.1.20<br/>RTSP Stream<br/>Motion Detection"]
        LOCK["🔐 Elektronik Kilit<br/>192.168.1.30<br/>RFID + PIN"]
    end

    AWS <-->|"HTTPS/MQTT<br/>TLS 1.3"| ROUTER
    DASH <-->|"HTTPS"| AWS

    ROUTER <-->|"Trunk"| SWITCH
    SWITCH <-->|"Copper"| PC
    SWITCH <-->|"Copper"| CAM
    SWITCH <-->|"Copper"| LOCK

    ROUTER <-.->|"WiFi 2.4GHz<br/>WPA2-PSK"| IOT_GW

    IOT_GW <-.->|"Zigbee 3.0"| S1
    IOT_GW <-.->|"Zigbee 3.0"| S2
    IOT_GW <-.->|"Zigbee 3.0"| S3
    IOT_GW <-.->|"Zigbee 3.0"| S4
    IOT_GW <-.->|"Zigbee 3.0"| S5
    IOT_GW <-.->|"Zigbee 3.0"| S6

    IOT_GW <-.->|"Zigbee 3.0"| A1
    IOT_GW <-.->|"Zigbee 3.0"| A2
    IOT_GW <-.->|"Zigbee 3.0"| A3
    IOT_GW <-.->|"Zigbee 3.0"| A4

    style AWS fill:#FF9800,color:#fff
    style DASH fill:#FF9800,color:#fff
    style ROUTER fill:#F44336,color:#fff
    style SWITCH fill:#9C27B0,color:#fff
    style PC fill:#4CAF50,color:#fff
    style IOT_GW fill:#00BCD4,color:#fff
    style S1 fill:#8BC34A,color:#fff
    style S2 fill:#8BC34A,color:#fff
    style S3 fill:#8BC34A,color:#fff
    style S4 fill:#8BC34A,color:#fff
    style S5 fill:#8BC34A,color:#fff
    style S6 fill:#8BC34A,color:#fff
    style A1 fill:#E91E63,color:#fff
    style A2 fill:#E91E63,color:#fff
    style A3 fill:#E91E63,color:#fff
    style A4 fill:#E91E63,color:#fff
    style CAM fill:#FF5722,color:#fff
    style LOCK fill:#FF5722,color:#fff
```

---

## Kısaltmalar

| Kısaltma | Açıklama |
|----------|----------|
| SW | Switch (Anahtarlama Cihazı) |
| R | Router (Yönlendirici) |
| FW | Firewall (Güvenlik Duvarı) |
| AP | Access Point (Erişim Noktası) |
| WLC | Wireless LAN Controller |
| PC | Personal Computer |
| IoT | Internet of Things (Nesnelerin İnterneti) |
| VLAN | Virtual Local Area Network |
| OSPF | Open Shortest Path First |
| STP | Spanning Tree Protocol |
| ACL | Access Control List |
| NAT | Network Address Translation |
| LACP | Link Aggregation Control Protocol |
| PoE | Power over Ethernet |

---

*Bu dosya Network Simulator 2026 uygulaması tarafından desteklenen tüm cihaz türlerini ve ağ yapılandırma senaryolarını görsel olarak göstermektedir.*
