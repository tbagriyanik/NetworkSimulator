# 💻 Network CLI Commands Reference

The simulator supports **280+ commands** across multiple configuration modes.

## Keyboard Shortcuts

### General Navigation
| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo last action |
| `Ctrl+Y` | Redo last action |
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
| `ssh [-l username] <host>` | Connect via SSH |
| `ftp [host]` | Open an interactive FTP session with login prompt, file listing, get/put, and quit |
| `mail [address]` | Open a mailbox session with login prompt, inbox listing, send flow, and quit |
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
| `more <filename>` | Display contents of a file |
| `setup` | Enter initial setup dialog |
| `test <type>` | Run diagnostics |
| `configure replace <url>` | Replace running config with file |
| `disconnect` | Disconnect network connection |
| `resume <n>` | Resume a suspended session |
| `suspend` | Suspend current session (Ctrl+Z) |
| `ip route <network> <mask> <next-hop>` | Add static IPv4 route |
| `no ip route <network> <mask|next-hop>` | Remove static IPv4 route |
| `ipv6 route <prefix>/<len> <next-hop>` | Add static IPv6 route |
| `no ipv6 route <prefix>/<len> [next-hop]` | Remove static IPv6 route |
| `debug <type>` | Enable debugging (requires argument, e.g., `debug ip packet`) |
| `no debug <type>` | Disable specific debugging |
| `no debug all` | Disable all debugging |
| `undebug all` | Disable all debugging |
| `undebug` | Disable all debugging (alias) |
| `terminal length <n>` | Set terminal page length |
| `terminal width <n>` | Set terminal width |
| `terminal monitor` | Enable terminal monitoring |
| `terminal no monitor` | Disable terminal monitoring |
| `clear arp-cache` | Clear ARP cache |
| `clear mac address-table` | Clear MAC address table |
| `clear counters` | Clear interface counters |
| `clear line <n>` | Clear a terminal line |
| `clear interface <name>` | Clear interface counters |
| `do <command>` | Execute privileged command from config mode |
| `help` | Display help system information |

### Global Configuration Commands
| Command | Description |
|---------|-------------|
| `hostname <name>` | Set device hostname |
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
| `ftp` service panel | Manage FTP credentials and files in PC services |
| `mail` service panel | Manage mail service settings in PC services |
| `ip ssh version {1\|2}` | Set SSH version |
| `ip ssh time-out <seconds>` | Set SSH timeout |
| `no ip ssh time-out` | Remove SSH timeout |
| `ip dhcp snooping` | Enable DHCP snooping |
| `ip dhcp snooping vlan <list>` | Enable DHCP snooping on VLANs |
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
| `no spanning-tree` | Disable spanning-tree |
| `spanning-tree vlan <id> priority <val>` | Set VLAN STP priority |
| `spanning-tree vlan <id> root` | Set VLAN STP root |
| `spanning-tree portfast default` | Enable PortFast globally |
| `username <name> [privilege <lvl>] [password\|secret] <pass>` | Create user |
| `no username <name>` | Remove user |
| `cdp run` | Enable CDP globally |
| `no cdp run` | Disable CDP |
| `cdp timer <sec>` | Set CDP update interval |
| `cdp holdtime <sec>` | Set CDP hold time |
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
| `snmp-server community <str> {RO\|RW}` | Set SNMP community |
| `snmp-server contact <text>` | Set SNMP contact |
| `snmp-server location <text>` | Set SNMP location |
| `archive` | Enter archive config mode |
| `alias <mode> <name> <cmd>` | Create command alias |
| `no alias <name>` | Remove command alias |
| `macro name <name>` | Define command macro |
| `sdm prefer <template>` | Set SDM template |
| `ip arp inspection vlan <id>` | Enable DAI on VLAN |
| `default interface <name>` | Reset interface to default configuration |
| `mac access-list extended <name>` | Create named MAC access list |
| `class-map [match-all\|match-any] <name>` | Create QoS class map |
| `policy-map <name>` | Create QoS policy map |
| `template <name>` | Enter template configuration mode |
| `access-list <id> <action> <condition>` | Create numbered ACL (1-99 standard, 100-199 extended) |
| `ip access-group <id> {in|out}` | Apply ACL to interface |
| `ip access-list {standard|extended} <name>` | Create named ACL |
| `show access-lists` | Display all access lists |
| `no access-list <id>` | Remove numbered ACL |
| `ip nat inside source {static <local> <global> | list <acl> {pool <name> | interface <intf>} [overload]}` | Configure NAT |
| `ip nat pool <name> <start> <end> {netmask <mask} | prefix-length <len>}` | Define NAT pool |
| `no ip nat ...` | Remove NAT configuration |

### Interface Configuration Commands
| Command | Description |
|---------|-------------|
| `shutdown` | Administratively disable interface |
| `no shutdown` | Enable interface |
| `speed {10\|100\|1000\|auto}` | Set interface speed |
| `duplex {half\|full\|auto}` | Set duplex mode |
| `description <text>` | Set interface description |
| `no description` | Clear description |
| `switchport mode access` | Set access mode |
| `switchport mode trunk` | Set trunk mode |
| `switchport mode dynamic auto` | Set DTP dynamic auto mode |
| `switchport mode dynamic desirable` | Set DTP dynamic desirable mode |
| `switchport mode dot1q-tunnel` | Set dot1q tunnel mode |
| `no switchport mode` | Reset switchport mode |
| `switchport access vlan <id>` | Assign VLAN |
| `no switchport access vlan` | Remove VLAN assignment |
| `switchport trunk native vlan <id>` | Set native VLAN |
| `switchport trunk allowed vlan <list>` | Set allowed VLANs |
| `switchport nonegotiate` | Disable DTP |
| `switchport voice vlan <id>` | Set voice VLAN |
| `switchport port-security` | Enable port security |
| `switchport port-security maximum <n>` | Set max MAC addresses |
| `switchport port-security violation {protect\|restrict\|shutdown}` | Set violation action |
| `switchport port-security mac-address sticky` | Enable sticky MAC |
| `no switchport port-security` | Disable port security |
| `no switchport` | Convert to routed port (L3) |
| `spanning-tree portfast` | Enable PortFast |
| `spanning-tree bpduguard enable` | Enable BPDU Guard |
| `spanning-tree bpduguard disable` | Disable BPDU Guard |
| `spanning-tree cost <cost>` | Set STP cost |
| `spanning-tree priority <prio>` | Set STP priority |
| `no spanning-tree` | Disable spanning-tree on interface |
| `ip address <ip> <mask>` | Assign IP address |
| `ip address <ip>/<prefix>` | Assign IP with CIDR notation |
| `no ip address` | Remove IP address |
| `ip nat {inside | outside}` | Set interface NAT side |
| `no ip nat {inside | outside}` | Remove NAT side |
| `standby <group> ip <virtual-ip>` | Configure HSRP virtual IP |
| `standby <group> priority <prio>` | Set HSRP priority |
| `standby <group> preempt` | Enable HSRP preemption |
| `no standby <group> ...` | Remove HSRP configuration |
| `ip default-gateway <ip>` | Set default gateway (interface) |
| `no ip default-gateway` | Remove default gateway (interface) |
| `ip helper-address <ip>` | Set DHCP relay |
| `no ip helper-address` | Remove DHCP relay |
| `cdp enable` | Enable CDP on interface |
| `no cdp enable` | Disable CDP on interface |
| `channel-group <n> mode {on\|active\|passive}` | Configure EtherChannel |
| `no channel-group` | Remove from channel |
| `access-list <acl>` | Apply access list |
| `no access-list` | Remove access list |
| `debug` / `no debug` | Interface debugging |
| `monitor session <n>` | Configure SPAN/RSPAN |
| `no monitor session` | Remove monitoring |
| `no udld` | Disable UDLD on interface |
| `no ip proxy-arp` | Disable proxy ARP |
| `ip proxy-arp` | Enable proxy ARP |
| `ip directed-broadcast` | Enable directed broadcast forwarding |
| `no ip directed-broadcast` | Disable directed broadcast |
| `keepalive` | Enable keepalive |
| `no keepalive` | Disable keepalive |
| `mtu <size>` | Set interface MTU |
| `channel-protocol {lacp\|pagp}` | Set EtherChannel protocol |
| `priority-queue out` | Enable priority queue on interface |
| `queue-set <n>` | Apply QoS queue set |
| `tx-queue <n>` | Configure transmit queue |
| `power inline consumption <watt>` | Set PoE power limit |
| `encapsulation dot1q <vlan>` | Set 802.1Q encapsulation on subinterface |
| `standby <group> ipv6 <ip>` | Configure HSRP for IPv6 |
| `ip arp inspection limit <pps>` | Set ARP inspection rate limit |
| `no name` | Remove interface name (VLAN) |
| `ipv6 address <ip>/<prefix>` | Assign IPv6 address |
| `ipv6 rip <name> enable` | Enable RIPng on interface |
| `ipv6 ospf <id> area <area>` | Enable OSPFv3 on interface |
| `ipv6 dhcp server <pool-name>` | Enable IPv6 DHCP server on interface |
| `ip verify source` | Enable IP Source Guard |
| `ip dhcp snooping trust` | Set interface as trusted for DHCP |
| `ip arp inspection trust` | Set interface as trusted for DAI |
| `storm-control {broadcast\|multicast\|unicast} level <%>` | Set storm control |
| `power inline {auto\|static\|never}` | Configure PoE |
| `bandwidth <kbps>` | Set interface bandwidth |
| `delay <tens-of-ms>` | Set interface delay |
| `carrier-delay <ms>` | Set carrier delay |
| `load-interval <sec>` | Set load statistics interval |
| `mls qos trust {cos\|dscp}` | Set QoS trust state |
| `mls qos cos <val>` | Set default CoS value |

### Wireless (WiFi) Commands
> **Note**: These commands are only valid on Wireless LAN Controllers (WLC) or autonomous Access Points (AP). They are NOT supported on switches.

| Command | Description | Device Type |
|---------|-------------|-------------|
| `dot11 ssid <name>` | Create/enter dot11 SSID config | WLC/AP |
| `wlan <name> <id> <ssid>` | Create WLAN profile | WLC only |
| `wlan shutdown` | Disable WLAN | WLC only |
| `no wlan shutdown` | Enable WLAN (undo shutdown) | WLC only |
| `ap name <name>` | Configure AP name | WLC only |
| `ap auth-mac <mac>` | Add MAC auth filter for AP join | WLC only |
| `ap rf-channel <num>` | Set AP RF channel | WLC only |
| `ap dot11 5-ghz <cmd>` | Configure 5 GHz radio on AP | WLC only |
| `authentication open` | Set open authentication (in ssid-config) | WLC/AP |
| `authentication shared` | Set shared key auth (in ssid-config) | WLC/AP |
| `authentication key-management wpa version <2\|3>` | Set WPA key management (in ssid-config) | WLC/AP |
| `mbssid` | Enable MBSSID (in ssid-config) | WLC/AP |
| `no mbssid` | Disable MBSSID (in ssid-config) | WLC/AP |
| `guest-mode` | Enable guest mode (in ssid-config) | WLC/AP |
| `no guest-mode` | Disable guest mode (in ssid-config) | WLC/AP |
| `ssid <name>` | Set SSID name (in dot11-config) | WLC/AP |
| `no ssid` | Remove SSID (in dot11-config) | WLC/AP |
| `station-role root` | Set AP to root mode | WLC/AP |
| `channel <num>` | Set RF channel (in dot11-config) | WLC/AP |
| `no channel` | Reset to auto channel selection | WLC/AP |
| `speed <rate>` | Set basic data rate (in dot11-config) | WLC/AP |
| `power local <val>` | Set local power level (in dot11-config) | WLC/AP |
| `power client <val>` | Set client power level (in dot11-config) | WLC/AP |
| `world-mode dot11d {1\|-1}` | Enable 802.11d world mode (in dot11-config) | WLC/AP |
| `security wpa psk set-key ascii 0 <password>` | Set WPA PSK key | WLC/AP |
| `no security wpa psk` | Remove WPA PSK key | WLC/AP |
| `wpa-psk <password>` | Set WPA pre-shared key (dot11-config) | WLC/AP |
| `encryption mode ciphers {tkip\|aes\|tkip aes}` | Set encryption cipher (dot11-config) | WLC/AP |
| `mac-filter` | Enable MAC filter (dot11-config) | WLC/AP |
| `interface dot11radio <n>` | Enter dot11 radio interface config | WLC/AP |
| `show wlan summary` | Display WLAN summary | WLC only |
| `show ap summary` | Display AP summary | WLC only |

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
| `transport input {ssh\|telnet\|all\|none}` | Set allowed protocols |
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
| `privilege level <0-15>` | Set privilege level |
| `transport output {ssh\|telnet\|all\|none}` | Set outbound protocols |
| `transport preferred {ssh\|telnet\|none}` | Set preferred protocol |
| `session-limit <n>` | Set max sessions |
| `access-class <n> {in\|out}` | Apply ACL to line |
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
| `ppp authentication {chap\|pap}` | Enable PPP authentication |
| `no ppp authentication` | Disable PPP authentication |
| `ppp pap sent-username <name> password <pass>` | Set PAP credentials |
| `bandwidth <kbps>` | Set serial bandwidth |

### Router Configuration Commands (RIP/OSPF)
| Command | Description |
|---------|-------------|
| `network <ip> [wildcard] area <id>` | Add network to OSPF area |
| `no network <ip> [wildcard] area <id>` | Remove network from OSPF |
| `network <ip>` | Add RIP network |
| `no network <ip>` | Remove RIP network |
| `router-id <ip>` | Set router ID |
| `no router-id` | Reset router ID to default |
| `passive-interface <intf>` | Set passive interface |
| `no passive-interface <intf>` | Enable routing updates on interface |
| `default-information {originate\|always}` | Control default route |
| `area <id> range <ip> <mask>` | Summarize routes at area boundary |
| `area <id> stub` | Configure area as stub |
| `area <id> nssa` | Configure area as NSSA |
| `neighbor <ip> remote-as <asn>` | Configure BGP neighbor |
| `no neighbor <ip> [remote-as]` | Remove BGP neighbor |

### Router Configuration Commands (EIGRP)
| Command | Description |
|---------|-------------|
| `router eigrp <as>` | Enable EIGRP routing process |
| `no router eigrp <as>` | Disable EIGRP routing process |
| `network <ip> [wildcard]` | Advertise network via EIGRP |
| `no network <ip> [wildcard]` | Remove EIGRP network |
| `eigrp router-id <ip>` | Set EIGRP router ID |
| `no eigrp router-id` | Reset EIGRP router ID |
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
| `ipv6 router rip <name>` | Enter RIPng config mode |
| `ipv6 router ospf <id>` | Enter OSPFv3 config mode |
| `no ipv6 router rip <name>` | Disable RIPng |
| `no ipv6 router ospf <id>` | Disable OSPFv3 |
| `ipv6 ospf <id> area <area>` | Enable OSPFv3 on interface |
| `ipv6 rip <name> enable` | Enable RIPng on interface |

### IPv6 DHCP Pool Configuration Commands (`ipv6-dhcp-config` mode)
| Command | Description |
|---------|-------------|
| `address prefix <prefix>` | Set IPv6 address prefix for clients |
| `no address prefix <prefix>` | Remove address prefix |
| `dns-server <ipv6>` | Set DNS server for clients |
| `domain-name <name>` | Set domain name for clients |

### IoT CLI Commands
> **Note**: These commands are available in global config mode on IoT-capable devices.

| Command | Description |
|---------|-------------|
| `iot sensor <name> pin <n>` | Configure sensor on pin |
| `iot actuator <name> pin <n>` | Configure actuator on pin |
| `iot threshold <name> <value>` | Set sensor threshold |
| `no iot sensor <name>` | Remove sensor config |
| `no iot actuator <name>` | Remove actuator config |
| `iot name <name>` | Set IoT device name |
| `iot wifi <ssid> [password]` | Configure IoT WiFi connection |
| `iot display <text>` | Send text to IoT display |

### Firewall Configuration Commands
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
| `lease <days> [hours] [minutes]` | Set lease duration (or `infinite`) |
| `domain-name <name>` | Set domain name for clients |
| `no domain-name` | Remove domain name |

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
| `show ip interface brief` | Display IP interface summary |
| `show ip interface` | Display IP interface summary (alias) |
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
| `show ipv6 dhcp pool` | Display IPv6 DHCP pools |
| `show ip ospf neighbor` | Display OSPF neighbors |
| `show ip ospf interface` | Display OSPF interface status |
| `show debugging` | Display debugging status |
| `do show <command>` | Execute show command from config mode |
| `show ip dhcp snooping` | Display DHCP snooping |
| `show ip dhcp pool` | Display DHCP pool configuration |
| `show ip dhcp binding` | Display DHCP bindings |
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

## Features
- **Tab Completion**: Auto-complete commands with TAB
- **Command History**: Up/Arrow keys for previous commands
- **Context Help**: Use `?` for command help
- **Error Checking**: Detailed error messages for invalid commands
