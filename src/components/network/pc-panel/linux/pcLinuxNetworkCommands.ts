import type { LinuxExecutorParams } from '../pcLinuxExecutor';

export async function executeLinuxNetworkCommand(
  command: string,
  args: string[],
  cleanCmd: string,
  params: LinuxExecutorParams
): Promise<boolean> {
  const {
    pcIP,
    setPcIP,
    applyDhcpLease,
    pcSubnet,
    pcMAC,
    pcGateway,
    pcDNS,
    pcIPv6,
    wifiEnabled,
    canReachTargetIp,
    resolveDeviceNameTargetCallback,
    addLocalOutput,
    executeCommand,
    buildArpTableOutput
  } = params;

  if (command === 'ifconfig') {
    const ifconfigOut =
      `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${pcIP}  netmask ${pcSubnet}  broadcast ${pcGateway || '0.0.0.0'}
        inet6 ${pcIPv6 || 'fe80::1'}  prefixlen 64  scopeid 0x20<link>
        ether ${pcMAC}  txqueuelen 1000  (Ethernet)
        RX packets 1542  bytes 134210 (134.2 KB)
        TX packets 1204  bytes 105820 (105.8 KB)

${wifiEnabled ? `wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${pcIP}  netmask ${pcSubnet}
        ether ${pcMAC}  txqueuelen 1000  (Wireless)
` : ''}lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)`;
    addLocalOutput('output', ifconfigOut);
    return true;
  }

  if (command === 'dhclient') {
    if (args.includes('-r')) {
      setPcIP?.('0.0.0.0');
      addLocalOutput('success', `DHCP lease released for ${args.find(a => !a.startsWith('-')) || 'eth0'}.`);
    } else {
      const lease = applyDhcpLease?.(true);
      if (lease) {
        setPcIP?.(lease.ip);
        addLocalOutput('success', `DHCP lease renewed for ${args.find(a => !a.startsWith('-')) || 'eth0'}. Current IP: ${lease.ip}`);
      } else addLocalOutput('error', 'dhclient: DHCP server not available');
    }
    return true;
  }

  if (command === 'ip') {
    const sub = args[0]?.toLowerCase();
    if (sub === 'a' || sub === 'addr' || sub === 'address') {
      const ipOut =
        `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
    inet6 ::1/128 scope host
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default
    link/ether ${pcMAC} brd ff:ff:ff:ff:ff:ff
    inet ${pcIP}/${pcSubnet === '255.255.255.0' ? '24' : '16'} brd ${pcGateway || '0.0.0.0'} scope global eth0
    inet6 ${pcIPv6 || 'fe80::1'}/64 scope link`;
      addLocalOutput('output', ipOut);
      return true;
    }
    if (sub === 'route' || sub === 'r') {
      addLocalOutput('output', `default via ${pcGateway} dev eth0 proto dhcp src ${pcIP} metric 100\n127.0.0.0/8 dev lo scope link\n${pcIP.replace(/\.\d+$/, '.0')}/24 dev eth0 proto kernel scope link src ${pcIP}`);
      return true;
    }
    if (sub === 'neigh' || sub === 'n') {
      addLocalOutput('output', `${pcGateway} dev eth0 lladdr 00:1a:2b:3c:4d:5e REACHABLE`);
      return true;
    }
    addLocalOutput('output', 'Usage: ip [ addr | route | neigh ]');
    return true;
  }

  if (command === 'ping') {
    const rawTarget = args.find(a => !a.startsWith('-'));
    if (!rawTarget) {
      addLocalOutput('error', 'ping: usage error: Destination address required');
      return true;
    }
    let targetIp = rawTarget;
    const resolved = resolveDeviceNameTargetCallback(rawTarget);
    if (resolved) targetIp = resolved.ip;

    const isLoopback = targetIp.startsWith('127.') || targetIp === '::1' || targetIp.toLowerCase() === 'localhost';
    const reachable = isLoopback || canReachTargetIp(targetIp);
    if (reachable) {
      const out =
        `PING ${rawTarget} (${targetIp}) 56(84) bytes of data.
64 bytes from ${targetIp}: icmp_seq=1 ttl=64 time=0.82 ms
64 bytes from ${targetIp}: icmp_seq=2 ttl=64 time=0.79 ms
64 bytes from ${targetIp}: icmp_seq=3 ttl=64 time=0.81 ms
64 bytes from ${targetIp}: icmp_seq=4 ttl=64 time=0.76 ms

--- ${rawTarget} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 0.76/0.80/0.84/0.03 ms`;
      addLocalOutput('output', out);
    } else {
      const out =
        `PING ${rawTarget} (${targetIp}) 56(84) bytes of data.
From ${pcIP || '127.0.0.1'} icmp_seq=1 Destination Host Unreachable
From ${pcIP || '127.0.0.1'} icmp_seq=2 Destination Host Unreachable

--- ${rawTarget} ping statistics ---
4 packets transmitted, 0 received, +2 errors, 100% packet loss, time 3008ms`;
      addLocalOutput('error', out);
    }
    return true;
  }

  if (command === 'traceroute' || command === 'tracert') {
    const rawTarget = args.find(a => !a.startsWith('-'));
    if (!rawTarget) {
      addLocalOutput('error', 'traceroute: usage error: Destination required');
      return true;
    }
    let targetIp = rawTarget;
    const resolved = resolveDeviceNameTargetCallback(rawTarget);
    if (resolved) targetIp = resolved.ip;

    const reachable = canReachTargetIp(targetIp);
    if (reachable) {
      const out =
        `traceroute to ${rawTarget} (${targetIp}), 30 hops max, 60 byte packets
 1  ${pcGateway || '192.168.1.1'} (${pcGateway || '192.168.1.1'})  0.892 ms  0.781 ms  0.745 ms
 2  ${targetIp} (${targetIp})  1.234 ms  1.102 ms  1.089 ms`;
      addLocalOutput('output', out);
    } else {
      const out =
        `traceroute to ${rawTarget} (${targetIp}), 30 hops max, 60 byte packets
 1  ${pcGateway || '192.168.1.1'} (${pcGateway || '192.168.1.1'})  0.892 ms  0.781 ms  0.745 ms
 2  * * *
 3  * * *`;
      addLocalOutput('error', out);
    }
    return true;
  }

  if (command === 'nslookup') {
    const domain = args[0] || 'deneme.site';
    const out =
      `Server:		${pcDNS || '8.8.8.8'}
Address:	${pcDNS || '8.8.8.8'}#53

Non-authoritative answer:
Name:	${domain}
Address: 142.250.180.206`;
    addLocalOutput('output', out);
    return true;
  }

  if (command === 'netstat' || command === 'arp') {
    if (command === 'arp' && buildArpTableOutput) {
      addLocalOutput('output', buildArpTableOutput());
    } else {
      addLocalOutput('output', `Address                  HWtype  HWaddress           Flags Mask            Iface\n${pcGateway || '192.168.1.1'}          ether   00:11:22:33:44:55   C                     eth0`);
    }
    return true;
  }

  if (command === 'ftp' || command === 'ssh' || command === 'telnet') {
    if (executeCommand) {
      await executeCommand(cleanCmd);
      return true;
    }
  }

  return false;
}
