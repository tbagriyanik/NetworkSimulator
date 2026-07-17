# 💻 Network CLI Commands Reference

The simulator supports **400+ commands** across multiple configuration modes.

## Keyboard Shortcuts

### General Navigation
| Shortcut | Action |
|----------|--------|
| `Ctrl+A` | Select all devices |
| `Escape` | Cancel current operation / Close modal |
| `Tab` | Auto-complete command in CLI |
| `Arrow Up/Down` | Navigate command history in CLI |
| `Enter` | Execute command / Confirm action |
| `Delete` | Delete selected items |
| `F5` | Refresh network topology |

### Canvas Navigation
| Shortcut | Action |
|----------|--------|
| `Left-click + Drag` | Pan canvas |
| `Middle-click + Drag` | Rectangle selection |
| `Right-click` | Open context menu |
| `Home` | Reset topology view (zoom 1.0, center) |
| `End` | Focus last element |
| `Page Up` / `Page Down` | Scroll canvas vertically |
| `Mouse Wheel` | Zoom in/out |
| `Ctrl + Drag Device` | Snap device to grid (16px grid) |

### Device Operations
| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Copy configuration |
| `Ctrl+V` | Paste configuration |
| `Ctrl+X` | Cut configuration |
| `Ctrl+S` | Save configuration |
| `Ctrl+L` | Clear terminal |
| `Double-click Device` | Open device configuration panel |

## Command Overview

### Desktop Computer Commands
| Command | Description |
|---------|-------------|
| `ipconfig [/all] [/release] [/renew]` | IP configuration |
| `ping <host>` | Test connectivity to host |
| `tracert <host>` | Trace route to destination |
| `netstat` | Display active network connections |
| `nslookup <domain>` | Query DNS for domain mapping |
| `ftp <host>` | Connect to an FTP server |
| `telnet <host> [port]` | Connect via Telnet |
| `ssh -l <username> <host>` | Connect via SSH |
| `curl` / `wget <url>` | View web page content |
| `arp -a` | Display ARP table |
| `hostname` | Display computer name |
| `dir` | List directory contents |
| `ver` | Display OS version |
| `cls` | Clear the screen |
| `help` / `?` | Display command help |

### System & Session Commands (User/Privileged Mode)
| Command | Description | Mode |
|---------|-------------|------|
| `enable` | Enter privileged EXEC mode | User |
| `disable` | Return to user EXEC mode | Privileged |
| `configure terminal` | Enter global configuration mode | Privileged |
| `exit` | Exit current mode/session | All |
| `end` | Return to privileged mode from any sub-mode | All |
| `help` | Display help system information | All |

### Privileged EXEC Commands
| Command | Description |
|---------|-------------|
| `ping <host> [size] [count]` | Test connectivity to host with ICMP |
| `traceroute <host>` | Trace route to destination |
| `telnet <host> [port]` | Connect to remote device via Telnet |
| `ssh -l <username> <host>` | Connect via SSH (with username) |
| `write memory` | Save running configuration to NVRAM |
| `copy running-config startup-config` | Save configuration |
| `copy running-config flash:[:filename]` | Save configuration to flash |
| `copy running-config tftp:` | Upload config to TFTP server |
| `copy flash:[:filename] startup-config` | Restore configuration from flash |
| `copy flash:[:filename] running-config` | Merge flash config into running config |
| `copy startup-config running-config` | Merge startup config into running config |
| `copy tftp: running-config` | Download and merge config from TFTP |
| `copy tftp: flash:` | Download file from TFTP to flash |
| `erase startup-config` | Erase startup configuration |
| `erase nvram:` | Erase NVRAM filesystem |
| `delete flash:vlan.dat` | Delete VLAN database file |
| `delete nvram:` | Delete NVRAM contents |
| `reload` | Reload the device |
| `clock set <hh:mm:ss> <day> <month> <year>` | Set system clock |
| `more <filename>` | ⚠️ Stub - Display contents of a file |
| `setup` | ⚠️ Stub - Enter initial setup dialog |
| `test <type>` | ⚠️ Stub - Run diagnostics |
| `configure replace <url>` | ⚠️ Stub - Replace running config with file |
| `disconnect` | ⚠️ Stub - Disconnect network connection |
| `resume <n>` | ⚠️ Stub - Resume a suspended session |
| `suspend` | ⚠️ Stub - Suspend current Telnet/SSH session (Ctrl+Shift+6 then X) |
| `debug <type>` | Enable debugging (requires argument, e.g., `debug ip packet`) |
| `no debug <type>` | Disable specific debugging |
| `no debug all` | Disable all debugging |
| `undebug all` | Disable all debugging |
| `undebug` | Disable all debugging (alias) |
| `terminal length <n>` | ⚠️ Stub - Set terminal page length |
| `terminal width <n>` | ⚠️ Stub - Set terminal width |
| `terminal monitor` | Enable terminal monitoring |
| `terminal no monitor` | ⚠️ Stub - Disable terminal monitoring |
| `clear arp-cache` | Clear ARP cache |
| `clear mac address-table` | Clear MAC address table |
| `clear counters` | Clear interface counters |
| `clear line <n>` | ⚠️ Stub - Clear a terminal line |
| `clear interface <name>` | ⚠️ Stub - Clear interface counters |
| `do <command>` | Execute privileged command from config mode |
| `help` | Display help system information |
| `show access-lists` | Display all access lists |

### Global Configuration Commands
| Command | Description |
|---------|-------------|
| `hostname <name>` | Set device hostname |
| `no hostname` | Reset hostname to default (Switch) |
| `vlan <id>` | Create/enter VLAN configuration |
| `no vlan <id>` | Delete VLAN |
| `name <name>` | Set VLAN name (in vlan mode) |
| `no name` | Remove VLAN name (in vlan mode only) |
| `state <active\|suspend>` | Set VLAN state |
| `interface <name>` | Enter interface configuration |
| `interface range <range>` | Configure interface range |
| `no interface vlan <id>` | Delete VLAN interface |
| `ip routing` | Enable IP routing (L3 switches) |
| `no ip routing` | Disable IP routing |
| `ip default-gateway <ip>` | Set default gateway |
| `no ip default-gateway` | Remove default gateway |
| `ip domain-name <name>` | Set domain name |
| `no ip domain-name` | Remove domain name |
| `ip domain-lookup` | Enable DNS lookup |
| `no ip domain-lookup` | Disable DNS lookup |
| `ip host <name> <ip>` | Add static hostname-to-IP mapping |
| `no ip host <name>` | Remove static host mapping |
| `ip http server` | Enable HTTP server |
| `no ip http server` | Disable HTTP server |
| `ip ssh version {1\|2}` | Set SSH version |
| `ip ssh time-out <seconds>` | Set SSH timeout |
| `no ip ssh time-out` | Remove SSH timeout |
| `ip dhcp snooping` | Enable DHCP snooping |
| `ip dhcp snooping vlan <ids>` | Enable DHCP snooping on VLANs |
| `no ip dhcp snooping` | Disable DHCP snooping |
| `ip arp inspection` | Enable ARP inspection |
| `service password-encryption` | Encrypt passwords |
| `no service password-encryption` | Disable password encryption |
| `enable secret <password>` | Set enable secret |
| `no enable secret` | Remove enable secret |
| `enable password <password>` | Set enable password |
| `no enable password` | Remove enable password |
| `banner motd #<message>#` | Set MOTD banner |
| `banner login #<message>#` | Set login banner |
| `banner exec #<message>#` | Set exec banner |
| `no banner motd` | Remove MOTD banner |
| `no banner login` | Remove login banner |
| `no banner exec` | Remove exec banner |
| `vtp mode {server\|client\|transparent}` | Set VTP mode |
| `vtp domain <name>` | Set VTP domain |
| `vtp password <password>` | Set VTP password |
| `spanning-tree mode {pvst\|rapid-pvst\|mst}` | Set STP mode |
| `spanning-tree vlan <id> priority <val>` | Set VLAN STP priority |
| `spanning-tree vlan <id> root` | Set VLAN STP root |
| `spanning-tree portfast default` | Enable PortFast globally |
| `spanning-tree bpduguard enable` | Enable BPDU Guard |
| `spanning-tree bpduguard disable` | Disable BPDU Guard |
| `spanning-tree bpduguard` | ⚠️ Stub - Command deprecated |
| `spanning-tree bpduguard` | ⚠️ Stub - BPDU Guard enable/disable removed |
| `no spanning-tree` | Disable spanning-tree |
| `username <name> [privilege <lvl>] [password\|secret] <pass>` | Create user |
| `no username <name>` | Remove user |
| `cdp run` | Enable CDP globally |
| `no cdp run` | Disable CDP |
| `cdp timer <sec>` | ⚠️ Stub - Set CDP update interval |
| `cdp holdtime <sec>` | ⚠️ Stub - Set CDP hold time |
| `mls qos` | Enable MLS QoS |
| `no mls qos` | Disable MLS QoS |
| `router rip` | Enable RIP routing |
| `router ospf [<id>]` | Enable OSPF routing |
| `no router rip` | Disable RIP |
| `no router ospf` | Disable OSPF |
| `ip dhcp pool <name>` | Create DHCP pool / enter dhcp-config mode |
| `no ip dhcp pool <name>` | Remove DHCP pool |
| `ip dhcp excluded-address <low> [<high>]` | Exclude addresses from DHCP |
| `no ip dhcp excluded-address <low> [<high>]` | Remove excluded address range |
| `ntp server <ip>` | Configure NTP server |
| `clock timezone <name> <offset>` | Set timezone |
| `ip name-server <ip>` | Configure DNS server |
| `system mtu <size>` | Set system MTU |
| `errdisable recovery` | Configure errdisable recovery (all causes) |
| `errdisable recovery cause <cause>` | Configure errdisable recovery per cause |
| `ipv6 unicast-routing` | Enable IPv6 routing |
| `no ipv6 unicast-routing` | Disable IPv6 routing |
| `ipv6 dhcp pool <name>` | Create IPv6 DHCP pool / enter dhcp-config mode |
| `no ipv6 dhcp pool <name>` | Remove IPv6 DHCP pool |
| `ipv6 router rip <name>` | Enable RIPng routing process |
| `ipv6 router ospf <id>` | Enable OSPFv3 routing process |
| `no ipv6 router rip <name>` | Disable RIPng |
| `no ipv6 router ospf <id>` | Disable OSPFv3 |
| `crypto key generate rsa` | Generate RSA keys for SSH |
| `ip ssh authentication-retries <n>` | Set SSH retry limit |
| `snmp-server community <str> {RO\|RW}` | ⚠️ Stub - Set SNMP community |
| `snmp-server contact <text>` | ⚠️ Stub - Set SNMP contact |
| `snmp-server location <text>` | ⚠️ Stub - Set SNMP location |
| `archive` | ⚠️ Stub - Enter archive config mode |
| `alias <mode> <name> <cmd>` | Create command alias |
| `no alias <name>` | Remove command alias |
| `macro name <name>` | ⚠️ Stub - Define command macro |
| `sdm prefer <template>` | Set SDM template |
| `ip arp inspection vlan <id>` | Enable DAI on VLAN |
| `default interface <name>` | ⚠️ Stub - Reset interface to default configuration |
| `mac access-list extended <name>` | ⚠️ Stub - Create named MAC access list |
| `class-map [match-all\|match-any] <name>` | ⚠️ Stub - Create QoS class map |
| `policy-map <name>` | ⚠️ Stub - Create QoS policy map |
| `template <name>` | ⚠️ Stub - Enter template configuration mode |
| `access-list <id> <action> <condition>` | Create numbered ACL (1-99 standard, 100-199 extended) |
| `ip access-list {standard|extended} <name>` | Create named ACL |
| `no access-list <id>` | Remove numbered ACL |
| `ip nat inside source {static <local> <global> | list <acl> {pool <name> | interface <intf>} [overload]}` | Configure NAT |
| `ip nat pool <name> <start> <end> {netmask <mask} | prefix-length <len>}` | Define NAT pool |
| `no ip nat ...` | Remove NAT configuration |
| `ip route <network> <mask> <next-hop>` | Add static IPv4 route |
| `no ip route <network> <mask> [next-hop]` | Remove static IPv4 route (next-hop optional if single route) |
| `ipv6 route <prefix>/<len> <next-hop>` | Add static IPv6 route |
| `no ipv6 route <prefix>/<len> [next-hop]` | Remove static IPv6 route |
| `class-map [match-all\|match-any] <name>` | ⚠️ Stub - Create QoS class map |
| `policy-map <name>` | ⚠️ Stub - Create QoS policy map |
| `template <name>` | ⚠️ Stub - Enter template configuration mode |
| `access-list <id> <action> <condition>` | Create numbered ACL (1-99 standard, 100-199 extended) |
| `ip access-list {standard|extended} <name>` | Create named ACL |
| `no access-list <id>` | Remove numbered ACL |
| `ip nat inside source {static <local> <global> | list <acl> {pool <name> | interface <intf>} [overload]}` | Configure NAT |
| `ip nat pool <name> <start> <end> {netmask <mask} | prefix-length <len>}` | Define NAT pool |
| `no ip nat ...` | Remove NAT configuration |
| `ip route <network> <mask> <next-hop>` | Add static IPv4 route |
| `no ip route <network> <mask> [next-hop]` | Remove static IPv4 route (next-hop optional if single route) |
| `ipv6 route <prefix>/<len> <next-hop>` | Add static IPv6 route |
| `no ipv6 route <prefix>/<len> [next-hop]` | Remove static IPv6 route |

### Interface Configuration Commands
### Interface Configuration Commands

#### Interface Properties

| Command | Description |
|---------|-------------|
| `shutdown` | Administratively disable interface |
| `no shutdown` | Enable interface |
| `speed {10|100|1000|10000|auto}` | Set interface speed |
| `duplex {half|full|auto}` | Set duplex mode |
| `description <text>` | Set interface description |
| `no description` | Clear description |
| `mtu <size>` | Set interface MTU |
| `keepalive` | Enable keepalive |
| `no keepalive` | Disable keepalive |
| `carrier-delay <ms>` | ⚠️ Stub - Set carrier delay |
| `load-interval <sec>` | ⚠️ Stub - Set load statistics interval |

#### Switching Configuration

| Command | Description |
|---------|-------------|
| `switchport mode access` | Set access mode |
| `switchport mode trunk` | Set trunk mode |
| `switchport mode dynamic auto` | Set DTP dynamic auto mode |
| `switchport mode dynamic desirable` | Set DTP dynamic desirable mode |
| `switchport mode dot1q-tunnel` | Set dot1q tunnel mode |
| `no switchport mode` | Reset switchport mode |
| `no switchport` | Convert to routed port (L3) |
| `spanning-tree portfast` | Enable PortFast |
| `spanning-tree portfast default` | Enable PortFast globally |
| `spanning-tree bpduguard enable` | Enable BPDU Guard |
| `spanning-tree bpduguard disable` | Disable BPDU Guard |
| `spanning-tree cost <cost>` | Set STP cost |
| `spanning-tree priority <prio>` | Set STP priority |
| `no spanning-tree` | Disable spanning-tree |
| `spanning-tree vlan <id> priority <val>` | Set VLAN STP priority |
| `spanning-tree vlan <id> root` | Set VLAN STP root |

#### Port Security

| Command | Description |
|---------|-------------|
| `switchport port-security` | Enable port security |
| `switchport port-security maximum <n>` | Set max MAC addresses |
| `switchport port-security violation {protect|restrict|shutdown}` | Set violation action |
| `switchport port-security mac-address sticky` | Enable sticky MAC |
| `no switchport port-security` | Disable port security |
| `switchport port-security aging time <min>` | ⚠️ Stub - Set aging time |
| `switchport port-security aging type <type>` | ⚠️ Stub - Set aging type |
| `switchport port-security mac-address <mac>` | ⚠️ Stub - Set static MAC address |

#### Blocking and Isolation

| Command | Description |
|---------|-------------|
| `switchport block {unicast|multicast}` | ⚠️ Stub - Block traffic |
| `switchport protected` | ⚠️ Stub - Protected port |

#### IP Configuration

| Command | Description |
|---------|-------------|
| `ip address <ip> <mask>` | Assign IP address with subnet mask |
| `no ip address` | Remove IP address |
| `ip default-gateway <ip>` | Set default gateway |
| `no ip default-gateway` | Remove default gateway |
| `ip helper-address <ip>` | Set DHCP relay |
| `no ip helper-address` | Remove DHCP relay |
| `ip verify source` | Enable IP Source Guard |

#### NAT Configuration

| Command | Description |
|---------|-------------|
| `ip nat {inside | outside}` | Set interface NAT side |
| `no ip nat {inside | outside}` | Remove NAT side |
| `standby <group> ip <virtual-ip>` | Configure HSRP virtual IP |
| `standby <group> priority <prio>` | Set HSRP priority |
| `standby <group> preempt` | Enable HSRP preemption |
| `no standby <group> ...` | Remove HSRP configuration |

#### Encapsulation Configuration

| Command | Description |
|---------|-------------|
| `encapsulation hdlc` | Set HDLC encapsulation (default) |
| `encapsulation ppp` | Set PPP encapsulation |
| `encapsulation dot1q <vlan>` | Set 802.1Q encapsulation on subinterface |
| `no encapsulation` | Reset to default encapsulation |

#### Serial Configuration

| Command | Description |
|---------|-------------|
| `cdp enable` | Enable CDP on interface |
| `no cdp enable` | Disable CDP on interface |
| `channel-group <n> mode {on|active|passive}` | Configure EtherChannel |
| `no channel-group` | Remove from channel |
| `ppp authentication pap` | Enable PPP authentication |
| `ppp authentication chap` | Enable PPP authentication |
| `no ppp authentication` | Disable PPP authentication |
| `ppp pap sent-username <name> password <pass>` | Set PPP credentials |
| `ip directed-broadcast` | Enable directed broadcast |
| `no ip directed-broadcast` | Disable directed broadcast |
| `ip proxy-arp` | Enable proxy ARP |
| `no ip proxy-arp` | Disable proxy ARP |

#### Quality of Service

| Command | Description |
|---------|-------------|
| `mls qos trust {cos|dscp}` | Set QoS trust state |
| `mls qos cos <val>` | Set default CoS value |
| `priority-queue out` | ⚠️ Stub - Enable priority queue |
| `queue-set <n>` | ⚠️ Stub - Apply QoS queue set |
| `tx-queue <n>` | ⚠️ Stub - Configure transmit queue |
| `storm-control {broadcast|multicast|unicast} level <%>` | Set storm control |

#### Management Commands

| Command | Description |
|---------|-------------|
| `cdp timer <sec>` | ⚠️ Stub - Set CDP update interval |
| `cdp holdtime <sec>` | ⚠️ Stub - Set CDP hold time |
| `clear arp-cache` | Clear ARP cache |
| `clear mac address-table` | Clear MAC address table |
| `clear counters` | Clear interface counters |
| `clear line <n>` | ⚠️ Stub - Clear a terminal line |
| `clear interface <name>` | ⚠️ Stub - Clear interface counters |
| `debug` / `no debug` | Interface debugging |
| `undebug all` | ⚠️ Stub - Disable all debugging |
| `undebug` | ⚠️ Stub - Disable all debugging (alias) |
| `monitor session <n>` | ⚠️ Stub - Configure SPAN/RSPAN |
| `no monitor session` | ⚠️ Stub - Remove monitoring |
| `no udld` | Disable UDLD on interface |

#### Additional Interface Commands

| Command | Description |
|---------|-------------|
| `ip access-group <id> {in|out}` | Apply IPv4 ACL to interface |

### Wireless (WiFi) Commands

> **Note**: These commands are only valid on Wireless LAN Controllers (WLC) or autonomous Access Points (AP). They are NOT supported on switches.

| Command | Description | Device Type |
|---------|-------------|-------------|
| `dot11 ssid <name>` | Create/enter dot11 SSID config | WLC/AP |
| `wlan <name> <id> <ssid>` | Create WLAN profile | WLC only |
| `wlan shutdown` | Disable WLAN | WLC only |
| `no wlan <id>` | Delete WLAN profile | WLC only |
| `no wlan shutdown` | Enable WLAN (undo shutdown) | WLC only |
| `ap name <name>` | Configure AP name | WLC only |
| `ap auth-mac <mac>` | Add MAC auth filter for AP join | WLC only |
| `ap rf-channel <num>` | Set AP RF channel | WLC only |
| `ap dot11 5-ghz <cmd>` | Configure 5 GHz radio on AP | WLC only |

| `authentication open` | Set open authentication (in ssid-config) | WLC/AP |
| `authentication shared` | Set shared key auth (in ssid-config) | WLC/AP |
| `authentication key-management wpa version <2|3>` | Set WPA key management (in ssid-config) | WLC/AP |
| `wpa-psk ascii <key>` | Set WPA pre-shared key | WLC/AP |
| `mbssid` | Enable MBSSID (in ssid-config) | WLC/AP |
| `no mbssid` | Disable MBSSID (in ssid-config) | WLC/AP |
| `guest-mode` | Enable guest mode (in ssid-config) | WLC/AP |
| `no guest-mode` | Disable guest mode (in ssid-config) | WLC/AP |
| `ssid <name>` | Set SSID name (in dot11-config) | WLC/AP |
| `no ssid <name>` | Remove SSID (in dot11-config) | WLC/AP |
| `station-role root` | Set AP to root mode | WLC/AP |
| `channel <num>` | Set RF channel (in dot11-config) | WLC/AP |
| `no channel` | Reset to auto channel selection | WLC/AP |
| `speed <rate>` | Set basic data rate (in dot11-config) | WLC/AP |
| `power local <val>` | Set local power level (in dot11-config) | WLC/AP |
| `power client <val>` | Set client power level (in dot11-config) | WLC/AP |
| `world-mode dot11d {1|-1}` | Enable 802.11d world mode (in dot11-config) | WLC/AP |
| `security wpa psk set-key ascii 0 <password>` | Set WPA PSK key (dot11-config) | WLC/AP |
| `no security wpa psk` | Remove WPA PSK key | WLC/AP |
| `encryption mode ciphers {tkip|aes|tkip aes}` | Set encryption cipher (dot11-config) | WLC/AP |
| `mac-filter` | Enable MAC filter (dot11-config) | WLC/AP |
| `interface dot11radio <n>` | Enter dot11 radio interface config | WLC/AP |
| `dot11 channel <num>` | Enter dot11-config and set RF channel (global config) | WLC/AP |
| `dot11 power {local | client} <val>` | Enter dot11-config and set power level (global config) | WLC/AP |
| `dot11 station-role {root | repeater | client}` | Enter dot11-config and set station role (global config) | WLC/AP |
| `dot11 mac-filter` | Enter dot11-config and enable MAC filter (global config) | WLC/AP |
| `show wlan summary` | Display WLAN summary | WLC only |
| `show wlan <id>` | Display specific WLAN details | WLC only |
| `show dot11 associations` | Display wireless client associations | WLC/AP |
| `show dot11 statistics` | Display dot11 radio statistics | WLC/AP |
| `show ap summary` | Display AP summary | WLC only |
| `show ap config {ap-name | all}` | Display AP configuration details | WLC only |
| `show ap join statistics {ap-name | all}` | Display AP join statistics | WLC only |

### Line Configuration Commands

| Command | Description |
|---------|-------------|
| `line console <n>` | Enter console line config |
| `line aux <n>` | Enter auxiliary line config |
| `line vty <start> <end>` | Enter VTY line config |
| `password <password>` | Set line password |
| `no password` | Remove line password |
| `login` | Enable password checking |
| `no login` | Disable password checking |
| `transport input {ssh|telnet|all|none}` | Set allowed protocols |
| `no transport input` | Reset transport input |
| `logging synchronous` | Enable sync logging |
| `no logging synchronous` | Disable sync logging |
| `exec-timeout <min> [sec]` | Set exec timeout |
| `no exec-timeout` | Reset exec timeout |
| `history size <n>` | Set history buffer size |
| `no history` | Disable command history |
| `exec` / `no exec` | Enable/disable EXEC |
| `autocommand <cmd>` | Set auto-command |
| `no autocommand` | Remove auto-command |
| `transport preferred {ssh|telnet|none}` | Set preferred protocol |
| `privilege level <0-15>` | Set privilege level |
| `session-limit <n>` | Set max sessions |
| `access-class <n> {in|out}` | Apply ACL to line |
| `lockable` | Enable line locking |

### Serial / WAN Interface Commands

> **Note**: These commands are valid on serial interfaces (e.g., `Serial0/0/0`, `Serial0/1/0`). DCE/DTE detection is automatic based on the cable connection.

| Command | Description |
|---------|-------------|
| `encapsulation hdlc` | Set HDLC encapsulation (default) |
| `encapsulation ppp` | Set PPP encapsulation |
| `no encapsulation` | Reset to default encapsulation |
| `clock rate <bps>` | Set clock rate on DCE interface |
| `no clock rate` | Remove clock rate setting |
| `ppp authentication {chap|pap}` | Enable PPP authentication |
| `no ppp authentication` | Disable PPP authentication |
| `ppp pap sent-username <name> password <pass>` | Set PPP credentials |
| `bandwidth <kbps>` | Set serial bandwidth |

### Router Configuration Commands (RIP/OSPF)

| Command | Description |
|---------|-------------|
| `router rip` | Enable RIP routing |
| `router ospf [<id>]` | Enable OSPF routing |
| `no router rip` | Disable RIP |
| `no router ospf` | Disable OSPF |
| `network <ip> [wildcard] area <id>` | Add network to OSPF area |
| `no network <ip> [wildcard] area <id>` | Remove network from OSPF |
| `network <ip>` | Add RIP network |
| `no network <ip>` | Remove RIP network |
| `neighbor <ip> remote-as <asn>` | Configure BGP neighbor |
| `no neighbor <ip> [remote-as]` | Remove BGP neighbor |
| `router-id <ip>` | Set router ID |
| `no router-id` | Reset router ID to default |
| `passive-interface <intf>` | Set passive interface |
| `no passive-interface <intf>` | Enable routing updates on interface |
| `default-information {originate|always}` | Control default route |
| `area <id> range <ip> <mask>` | Summarize routes at area boundary |
| `area <id> stub` | Configure area as stub |
| `area <id> nssa` | Configure area as NSSA |

### Router Configuration Commands (EIGRP)

| Command | Description |
|---------|-------------|
| `router eigrp <as>` | Enable EIGRP routing process |
| `no router eigrp <as>` | Disable EIGRP routing process |
| `network <ip> [wildcard]` | Advertise network via EIGRP |
| `no network <ip> [wildcard]` | Remove EIGRP network |
| `eigrp router-id <ip>` | Set EIGRP router ID |
| `no eigrp router-id` | Reset EIGRP router ID |
| `auto-summary` | Enable automatic network summarization |
| `no auto-summary` | Disable automatic network summarization |
| `passive-interface <intf>` | Suppress routing updates |
| `no passive-interface <intf>` | Enable routing updates |

### Router Configuration Commands (BGP)

| Command | Description |
|---------|-------------|
| `router bgp <as>` | Enable BGP routing process |
| `no router bgp <as>` | Disable BGP routing process |
| `bgp router-id <ip>` | Set BGP router ID |
| `network <ip> mask <mask>` | Advertise network via BGP |
| `no network <ip> mask <mask>` | Remove BGP network |
| `neighbor <ip> remote-as <asn>` | Configure BGP neighbor |
| `no neighbor <ip>` | Remove BGP neighbor |

### IPv6 Routing (RIPng / OSPFv3)

| Command | Description |
|---------|-------------|
| `ipv6 router rip <name>` | Enter RIPng config mode (optional; for router-specific settings) |
| `ipv6 router ospf <id>` | Enter OSPFv3 config mode (optional; for router-specific settings) |
| `no ipv6 router rip <name>` | Disable RIPng |
| `no ipv6 router ospf <id>` | Disable OSPFv3 |

### IPv6 DHCP Pool Configuration Commands (`ipv6-dhcp-config` mode)

| Command | Description |
|---------|-------------|
| `address prefix <prefix>` | Set IPv6 address prefix for clients |
| `no address prefix <prefix>` | Remove address prefix |
| `dns-server <ipv6>` | Set DNS server for clients |
| `domain-name <name>` | Set domain name for clients |

### Firewall Configuration Commands

> **Note**: These commands are valid on **ASA / Firewall devices only**. They are not available on IOS routers or switches.

| Command | Description |
|---------|-------------|
| `security-level <0-100>` | Set interface security level |
| `nameif <name>` | Set interface name |
| `no nameif` | Remove interface name |
| `same-security-traffic permit inter-interface` | Permit traffic between same-security interfaces |
| `no same-security-traffic permit inter-interface` | Deny same-security traffic |

### DHCP Pool Configuration Commands (`dhcp-config` mode)

| Command | Description |
|---------|-------------|
| `network <address> <mask>` | Set pool network and subnet mask |
| `default-router <ip>` | Set default gateway for clients |
| `no default-router` | Remove default gateway |
| `dns-server <ip>` | Set DNS server for clients |
| `no dns-server` | Remove DNS server |
| `lease {days|infinite}` | Set lease duration (or `infinite`) |
| `domain-name <name>` | Set domain name for clients |
| `no domain-name` | Remove domain name |

#### QoS Configuration

| Command | Description |
|---------|-------------|
| `mls qos trust {cos|dscp}` | Set QoS trust state |
| `mls qos cos <val>` | Set default CoS value |
| `priority-queue out` | ⚠️ Stub - Enable priority queue |
| `queue-set <n>` | ⚠️ Stub - Apply QoS queue set |
| `tx-queue <n>` | ⚠️ Stub - Configure transmit queue |
| `storm-control {broadcast|multicast|unicast} level <%>` | Set storm control |

#### IP Configuration

| Command | Description |
|---------|-------------|
| `ip address <ip> <mask>` | Assign IP address with subnet mask |
| `no ip address` | Remove IP address |
| `ipv6 address <ip>/<prefix>` | Assign IPv6 address |
| `ip default-gateway <ip>` | Set default gateway |
| `no ip default-gateway` | Remove default gateway |
| `ip helper-address <ip>` | Set DHCP relay |
| `no ip helper-address` | Remove DHCP relay |
| `ip verify source` | Enable IP Source Guard |

#### NAT Configuration

| Command | Description |
|---------|-------------|
| `ip nat {inside | outside}` | Set interface NAT side |
| `no ip nat {inside | outside}` | Remove NAT side |
| `standby <group> ip <virtual-ip>` | Configure HSRP virtual IP |
| `standby <group> priority <prio>` | Set HSRP priority |
| `standby <group> preempt` | Enable HSRP preemption |
| `no standby <group> ...` | Remove HSRP configuration |

#### Encapsulation Configuration

| Command | Description |
|---------|-------------|
| `encapsulation hdlc` | Set HDLC encapsulation (default) |
| `encapsulation ppp` | Set PPP encapsulation |
| `encapsulation dot1q <vlan>` | Set 802.1Q encapsulation on subinterface |
| `no encapsulation` | Reset to default encapsulation |

#### Serial Configuration

| Command | Description |
|---------|-------------|
| `cdp enable` | Enable CDP on interface |
| `no cdp enable` | Disable CDP on interface |
| `channel-group <n> mode {on|active|passive}` | Configure EtherChannel |
| `no channel-group` | Remove from channel |
| `ppp authentication pap` | Enable PPP authentication |
| `ppp authentication chap` | Enable PPP authentication |
| `no ppp authentication` | Disable PPP authentication |
| `ppp pap sent-username <name> password <pass>` | Set PPP credentials |
| `ip directed-broadcast` | Enable directed broadcast |
| `no ip directed-broadcast` | Disable directed broadcast |
| `ip proxy-arp` | Enable proxy ARP |
| `no ip proxy-arp` | Disable proxy ARP |

#### Quality of Service

| Command | Description |
|---------|-------------|
| `mls qos trust {cos|dscp}` | Set QoS trust state |
| `mls qos cos <val>` | Set default CoS value |
| `priority-queue out` | ⚠️ Stub - Enable priority queue |
| `queue-set <n>` | ⚠️ Stub - Apply QoS queue set |
| `tx-queue <n>` | ⚠️ Stub - Configure transmit queue |
| `storm-control {broadcast|multicast|unicast} level <%>` | Set storm control |

#### Management Commands

| Command | Description |
|---------|-------------|
| `cdp timer <sec>` | ⚠️ Stub - Set CDP update interval |
| `cdp holdtime <sec>` | ⚠️ Stub - Set CDP hold time |
| `clear arp-cache` | Clear ARP cache |
| `clear mac address-table` | Clear MAC address table |
| `clear counters` | Clear interface counters |
| `clear line <n>` | ⚠️ Stub - Clear a terminal line |
| `clear interface <name>` | ⚠️ Stub - Clear interface counters |
| `debug` / `no debug` | Interface debugging |
| `undebug all` | ⚠️ Stub - Disable all debugging |
| `undebug` | ⚠️ Stub - Disable all debugging (alias) |
| `monitor session <n>` | ⚠️ Stub - Configure SPAN/RSPAN |
| `no monitor session` | ⚠️ Stub - Remove monitoring |
| `no udld` | Disable UDLD on interface |

#### Additional Interface Commands

| Command | Description |
|---------|-------------|
| `ip access-group <id> {in|out}` | Apply IPv4 ACL to interface |
| `ip dhcp snooping trust` | Set interface as trusted for DHCP |
| `ip arp inspection trust` | Set interface as trusted for DAI |
| `channel-protocol {lacp|pagp}` | ⚠️ Stub - Set EtherChannel protocol |
| `priority-queue out` | ⚠️ Stub - Enable priority queue |
| `queue-set <n>` | ⚠️ Stub - Apply QoS queue set |
| `tx-queue <n>` | ⚠️ Stub - Configure transmit queue |
| `power inline {auto|static}` | ⚠️ Stub - Configure PoE |
| `power inline consumption <watt>` | ⚠️ Stub - Set PoE power limit |
| `keepalive` | Enable keepalive |
| `no keepalive` | Disable keepalive |
| `carrier-delay <ms>` | ⚠️ Stub - Set carrier delay |
| `load-interval <sec>` | ⚠️ Stub - Set statistics interval |
| `ip arp inspection limit <pps>` | ⚠️ Stub - Set ARP inspection rate limit |
| `ipv6 rip <name> enable` | Enable RIPng on interface |
| `ipv6 ospf <id> area <area>` | Enable OSPFv3 on interface |
| `ipv6 dhcp server <pool-name>` | Enable IPv6 DHCP server on interface |
| `ip helper-address <ip>` | Set DHCP relay |
| `no ip helper-address` | Remove DHCP relay |
| `ip verify source` | Enable IP Source Guard |
| `ip directed-broadcast` | Enable directed broadcast |
| `ip proxy-arp` | Enable proxy ARP |
| `ip dhcp snooping trust` | Set interface as trusted for DHCP |
| `ip arp inspection trust` | Set interface as trusted for DAI |
| `ip dhcp excluded-address <ip>` | Exclude addresses from DHCP |
| `ip dhcp excluded-address <low> [<high>]` | Remove excluded address range |

### Show Commands
| Command | Description |
|---------|-------------|
| `show` | Requires additional keywords (use `show ?`) |
| `show running-config` | Display running configuration |
| `show running-config interface <name>` | Display running config for specific interface |
| `show startup-config` | Display startup configuration |
| `show version` | Display version information |
| `show interfaces` | Display all interfaces |
| `show interfaces trunk` | Display trunk interface information |
| `show interface <name>` | Display specific interface |
| `show ip interface brief` | Display IP interface summary (single-line IP and status overview) |
| `show ip interface` | Display detailed IP interface information (MTU, ACL, NAT, BGP rules, and other L3 features) |
| `show ip protocols` | Display routing protocol configuration |
| `show ip ssh` | Display SSH configuration and status |
| `show ip source binding` | Display IP source guard bindings |
| `show ip verify source` | Display IP source guard verification |
| `show vlan [brief]` | Display VLAN information |
| `show mac address-table` | Display MAC address table |
| `show mac address-table static` | Display static MAC address entries |
| `show cdp neighbors` | Display CDP neighbors |
| `show ip route` | Display IPv4 routing table |
| `show ipv6 route` | Display IPv6 routing table |
| `show ipv6 interface brief` | Display IPv6 interface summary |
| `show clock` | Display system clock |
| `show flash` | Display flash contents |
| `show boot` | Display boot information |
| `show spanning-tree` | Display STP information |
| `show spanning-tree interface <name>` | Display STP information for specific interface |
| `show port-security` | Display port security status |
| `show wireless` | Display wireless status | WLC only |
| `show ssh` | Display SSH status |
| `show hosts` | Display static hostname-to-IP mappings |
| `show sessions` | Display active sessions |
| `show controllers` | Display interface controller status |
| `show redundancy` | Display redundancy/HSRP status |
| `show banner motd` | Display MOTD banner |
| `show class-map` | Display QoS class maps |
| `show policy-map` | Display QoS policy maps |
| `show policy-map interface <name>` | Display policy-map applied to specific interface |
| `show qos interface <name>` | Display QoS interface configuration and statistics |
| `show queuing interface <name>` | Display interface queuing statistics |
| `show ipv6 dhcp pool` | Display IPv6 DHCP pools |
| `show ip eigrp neighbors [<type>]` | Display EIGRP neighbor table |
| `show ip bgp summary` | Display BGP summary |
| `show ip bgp` | Display BGP routing table |
| `show ipv6 rip` | Display IPv6 RIP (RIPng) processes |
| `show ipv6 ospf` | Display OSPFv3 processes |
| `show ip ospf neighbor` | Display OSPF neighbors |
| `show ip ospf interface` | Display OSPF interface status |
| `show debugging` | Display debugging status |
| `do show <command>` | Execute show command from config mode |
| `show ip dhcp snooping` | Display DHCP snooping |
| `show ip dhcp pool` | Display DHCP pool configuration |
| `show ip dhcp binding` | Display DHCP bindings |
| `show nameif` | Display interface names and security levels (Firewall) |
| `show ip access-group` | Display ACL applied to interfaces (Firewall) |
| `show interfaces status` | Display interface status |
| `show cdp` | Display CDP information |
| `show vtp status` | Display VTP status |
| `show vtp password` | Display VTP password |
| `show etherchannel` | Display EtherChannel |
| `show arp` / `show ip arp` | Display ARP table |
| `show mls qos` | Display QoS status |
| `show ip arp inspection` | Display ARP inspection |
| `show access-lists` | Display access lists |
| `show mac access-lists` | Display MAC access lists |
| `show history` | Display command history |
| `show users` | Display logged in users |
| `show environment` | Display hardware status |
| `show inventory` | Display hardware inventory |
| `show errdisable recovery` | Display errdisable status |
| `show errdisable detect` | Display errdisable detection |
| `show storm-control` | Display storm control |
| `show udld` | Display UDLD status |
| `show monitor` | Display SPAN sessions |
| `show processes` | Display CPU processes |
| `show memory` | Display memory usage |
| `show sdm prefer` | Display SDM template |
| `show system mtu` | Display MTU settings |
| `show ntp status` | Display NTP status |
| `show ntp associations` | Display NTP associations |
| `show snmp` | Display SNMP info |
| `show archive` | Display archive status |
| `show alias` | Display command aliases |
| `show diagnostic` | Display diagnostic results |
| `show lldp` | Display LLDP neighbors |
| `show authentication` | Display auth sessions |
| `show ip nat translations` | Display active NAT translations |
| `show ip nat statistics` | Display NAT statistics |
| `show ip ospf` | Display OSPF information and ABR status |
| `show standby [brief]` | Display HSRP status |

## Command Modes
- **User Mode** (`>`) - Basic monitoring commands
- **Privileged Mode** (`#`) - All show/debug commands
- **Config Mode** `(config)#` - Global configuration
- **Interface Mode** `(config-if)#` - Interface configuration (Ethernet, Serial, VLAN)
- **Line Mode** `(config-line)#` - Line configuration (console, VTY)
- **VLAN Mode** `(config-vlan)#` - VLAN configuration
- **Router Config Mode** `(config-router)#` - Routing protocol config (OSPF, RIP, EIGRP, BGP)
- **DHCP Pool Mode** `(dhcp-config)#` - DHCP pool configuration
- **SSID Config Mode** `(config-ssid)#` - SSID security parameters (authentication, guest-mode, mbssid)
- **Dot11 Config Mode** `(config-dot11)#` - Wireless radio/dot11 interface configuration (channel, speed, power, station-role)
- **Standard ACL Mode** `(config-std-nacl)#` - Named standard access-list rules
- **Extended ACL Mode** `(config-ext-nacl)#` - Named extended access-list rules

### ACL Configuration Commands (std/ext-nacl mode)
| Command | Description |
|---------|-------------|
| `permit <condition>` | Add a permit rule |
| `deny <condition>` | Add a deny rule |
| `no permit <condition>` | Remove a permit rule |
| `no deny <condition>` | Remove a deny rule |
| `exit` | Return to global configuration mode |

## Features
- **Tab Completion**: Auto-complete commands with TAB
- **Command History**: Up/Arrow keys for previous commands
- **Context Help**: Use `?` for command help
- **Error Checking**: Detailed error messages for invalid commands
