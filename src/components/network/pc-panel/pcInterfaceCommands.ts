import type { OutputLine } from './PCPanel.types';
import { formatMacForArp } from './pcPanelHelpers';
import { errorHandler, DHCP_ERRORS } from '@/lib/errors/errorHandler';

export interface PcInterfaceCommandsContext {
  deviceId: string;
  language: string;
  t: Record<string, string>;
  pcIP: string;
  setPcIP: React.Dispatch<React.SetStateAction<string>>;
  pcSubnet: string;
  pcMAC: string;
  pcGateway: string;
  pcDNS: string;
  pcIPv6: string;
  internalPcHostname: string;
  ipConfigMode: string;
  wifiEnabled: boolean;
  serviceHttpEnabled: boolean;
  serviceDnsEnabled: boolean;
  serviceDhcpEnabled: boolean;
  applyDhcpLeaseRef: React.MutableRefObject<((force?: boolean) => { ip: string; subnetMask: string; gateway: string; dns: string; serverName: string; poolName: string } | null) | null>;
  buildArpTableOutput: () => string;
  addPcArpEntry?: (targetIp: string, targetMac: string, isIot?: boolean) => void;
  removePcArpEntry?: (targetIp: string) => void;
  clearPcArpTable?: () => void;
  isValidIpv4: (value: string) => boolean;
  isValidIpv6: (value: string) => boolean;
  resolveDeviceNameTargetCallback: (raw: string) => { ip: string; label?: string } | null;
  emit: (type: OutputLine['type'], content: string, prompt?: string) => void;
  emitMulti: (type: OutputLine['type'], content: string, delayMs?: number) => Promise<void>;
}

export async function handlePcInterfaceCommand(
  cmd: string,
  args: string[],
  ctx: PcInterfaceCommandsContext
): Promise<boolean> {
  const {
    deviceId,
    pcIP,
    setPcIP,
    pcSubnet,
    pcMAC,
    pcGateway,
    pcDNS,
    pcIPv6,
    internalPcHostname,
    ipConfigMode,
    wifiEnabled,
    serviceHttpEnabled,
    serviceDnsEnabled,
    serviceDhcpEnabled,
    applyDhcpLeaseRef,
    buildArpTableOutput,
    addPcArpEntry,
    removePcArpEntry,
    clearPcArpTable,
    isValidIpv4,
    isValidIpv6,
    resolveDeviceNameTargetCallback,
    emit,
    emitMulti,
  } = ctx;

  if (cmd === 'ipconfig') {
    if (args.includes('/release')) {
      setPcIP('0.0.0.0');
      emit('success', 'IP address released successfully.');
    } else if (args.includes('/renew')) {
      try {
        const lease = applyDhcpLeaseRef.current?.() ?? null;
        if (lease && lease.serverName !== 'link-local') {
          emit('success', `DHCP lease acquired from ${lease.serverName}/${lease.poolName}. New IP: ${lease.ip}`);
        } else {
          emit('success', `No DHCP server/pool found. Assigned link-local IP: ${lease?.ip || '(pending)'}`);
        }
      } catch (err) {
        emit('error', 'DHCP renew failed. Please check network connection.');
        errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'ipconfigRenew', error: String(err) }));
      }
    } else if (args.includes('/all')) {
      const ipConfigModeText = ipConfigMode === 'dhcp' ? 'Yes' : 'No';
      const ipconfigAllOut = `Windows IP Configuration\n\n   Host Name . . . . . . . . . . . . : ${internalPcHostname}\n   Primary Dns Suffix  . . . . . . . : \n   Node Type . . . . . . . . . . . . : Hybrid\n   IP Routing Enabled. . . . . . . : No\n   WINS Proxy Enabled. . . . . . . . : No\n\nEthernet adapter Ethernet:\n\n   Connection-specific DNS Suffix  . : \n   Description . . . . . . . . . . . : PRO/1000 MT Network Connection\n   Physical Address. . . . . . . . . : ${pcMAC}\n   DHCP Enabled. . . . . . . . . . . : ${ipConfigModeText}\n   Autoconfiguration Enabled . . . . : Yes\n   IPv4 Address. . . . . . . . . . . : ${pcIP}(Preferred)\n   Subnet Mask . . . . . . . . . . . : ${pcSubnet}\n   Default Gateway . . . . . . . . . : ${pcGateway}\n   DNS Servers . . . . . . . . . . . : ${pcDNS}\n   IPv6 Address. . . . . . . . . . . : ${pcIPv6}(Preferred)\n   NetBIOS over Tcpip. . . . . . . . : Enabled\n\n${wifiEnabled ? `Ethernet adapter Wireless Network Connection:\n\n   Connection-specific DNS Suffix  . : \n   Description . . . . . . . . . . . : Wireless WiFi Link 4965AGN\n   Physical Address. . . . . . . . . : ${pcMAC}\n   DHCP Enabled. . . . . . . . . . . : ${ipConfigModeText}\n   Autoconfiguration Enabled . . . . : Yes\n   IPv4 Address. . . . . . . . . . . : ${pcIP}(Preferred)\n   Subnet Mask . . . . . . . . . . . : ${pcSubnet}\n   Default Gateway . . . . . . . . . : ${pcGateway}\n   DNS Servers . . . . . . . . . . . : ${pcDNS}\n   IPv6 Address. . . . . . . . . . . : ${pcIPv6}(Preferred)\n   NetBIOS over Tcpip. . . . . . . . : Enabled\n\n` : ''}`;
      await emitMulti('output', ipconfigAllOut, 80);
    } else {
      const ipconfigOut = `OS IP Configuration\n\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ${pcIP}\n   Subnet Mask . . . . . . . . . . . : ${pcSubnet}\n   Default Gateway . . . . . . . . . : ${pcGateway}\n   IPv6 Address. . . . . . . . . . . : ${pcIPv6}`;
      await emitMulti('output', ipconfigOut, 80);
    }
    return true;
  }

  if (cmd === 'arp') {
    const flag = args[0]?.toLowerCase();
    if (args.length === 0 || flag === '-a' || flag === '-g' || flag === '-v') {
      emit('output', buildArpTableOutput());
    } else if (flag === '-d') {
      const delTarget = args[1];
      if (!delTarget || delTarget === '*') {
        clearPcArpTable?.();
        emit('success', 'The ARP entry was deleted successfully.');
      } else {
        removePcArpEntry?.(delTarget);
        emit('success', `The ARP entry ${delTarget} was deleted successfully.`);
      }
    } else if (flag === '-s') {
      const targetIp = args[1];
      const targetMac = args[2];
      if (!targetIp || !targetMac) {
        emit('output', 'Usage: arp -s <ip> <mac_address>');
      } else {
        addPcArpEntry?.(targetIp, targetMac);
        emit('success', `Static ARP entry ${targetIp} -> ${targetMac} added successfully.`);
      }
    } else {
      emit('output', 'Usage: arp -a\n       arp -g\n       arp -v\n       arp -d [*]\n       arp -s <ip> <mac_address>');
    }
    return true;
  }

  if (cmd === 'netstat') {
    const normFlag = (a: string) => a.replace(/^[-/]/, '').toLowerCase();
    const flagSet = args.filter(a => /^[-/]/.test(a)).map(normFlag);
    const hasFlag = (f: string) => flagSet.includes(f);
    const showAll = hasFlag('a');
    const numericOnly = hasFlag('n');
    const showOpid = hasFlag('o');
    const showRoute = hasFlag('r');
    const showStats = hasFlag('s');
    const showEthernet = hasFlag('e');
    const protoIdx = args.findIndex((a, i) => /^[-/]p$/i.test(a) && args[i + 1] !== undefined);
    const protoFilter = protoIdx !== -1 ? args[protoIdx + 1].toLowerCase() : '';

    if (showRoute) {
      const netAddr = pcSubnet === '255.255.255.0' ? `${pcIP.split('.').slice(0, 3).join('.')}.0` : pcIP;
      const gw = pcGateway || '0.0.0.0';
      await emitMulti('output', `\nRoute Table\n\n  Network Destination    Netmask          Gateway         Interface     Metric\n  ${'0.0.0.0'.padEnd(23)} 0.0.0.0          ${gw.padEnd(15)} ${pcIP.padEnd(15)} 25\n  ${netAddr.padEnd(23)} ${pcSubnet.padEnd(15)} ${gw.padEnd(15)} ${pcIP.padEnd(15)} 291\n  127.0.0.0              255.0.0.0        127.0.0.1        127.0.0.1        331\n  127.0.0.1              255.255.255.255  127.0.0.1        127.0.0.1        331\n`, 60);
    } else if (showStats) {
      await emitMulti('output', `\nIPv4 Statistics\n\n    Packets Received ...................: 12450\n    Received Header Errors .............: 0\n    Received Address Errors ............: 0\n    Packets Sent .......................: 8432\n\nTCP Statistics\n\n    Active Opens .......................: 14\n    Passive Opens ......................: 2\n    Failed Connection Attempts .........: 1\n    Resets .............................: 3\n    Connections Established ............: 12\n\nUDP Statistics\n\n    Datagrams Received .................: 230\n    Datagrams Sent .....................: 215\n`, 60);
    } else if (showEthernet) {
      await emitMulti('output', `\nInterface Statistics\n\n                                Received    Sent\n    Bytes ........................ 12.3 MB    9.8 MB\n    Unicast Packets ............... 10234      7234\n    Non-unicast Packets ........... 512        340\n    Discards ...................... 0          0\n    Errors ........................ 0          0\n    Unknown Protocols ............. 0\n`, 60);
    } else {
      const includeTcp = !protoFilter || protoFilter === 'tcp';
      const includeUdp = !protoFilter || protoFilter === 'udp';
      const pidSuffix = showOpid ? '    PID' : '';
      let netstatOut = `\nActive Connections\n\n  Proto  Local Address          Foreign Address        State${pidSuffix}\n`;
      if (includeTcp) {
        netstatOut += `  TCP    ${pcIP}:135            0.0.0.0:0              LISTENING${showOpid ? '      1234' : ''}\n`;
        netstatOut += `  TCP    ${pcIP}:445            0.0.0.0:0              LISTENING${showOpid ? '      4' : ''}\n`;
        if (serviceHttpEnabled) netstatOut += `  TCP    ${pcIP}:80             0.0.0.0:0              LISTENING${showOpid ? '      876' : ''}\n`;
        if (showAll || numericOnly) {
          netstatOut += `  TCP    ${pcIP}:49664          0.0.0.0:0              LISTENING${showOpid ? '      1234' : ''}\n`;
          netstatOut += `  TCP    ${pcIP}:49665          0.0.0.0:0              LISTENING${showOpid ? '      1234' : ''}\n`;
          netstatOut += `  TCP    ${pcIP}:49666          0.0.0.0:0              LISTENING${showOpid ? '      1234' : ''}\n`;
        }
      }
      if (includeUdp) {
        if (serviceDnsEnabled) netstatOut += `  UDP    ${pcIP}:53             *:*${showOpid ? '                      650' : ''}\n`;
        if (serviceDhcpEnabled) netstatOut += `  UDP    ${pcIP}:67             *:*${showOpid ? '                      652' : ''}\n`;
        if (showAll || numericOnly) {
          netstatOut += `  UDP    ${pcIP}:137            *:*${showOpid ? '                      4' : ''}\n`;
          netstatOut += `  UDP    ${pcIP}:138            *:*${showOpid ? '                      4' : ''}\n`;
        }
      }
      await emitMulti('output', netstatOut, 60);
    }
    return true;
  }

  if (cmd === 'nbtstat') {
    const has = (f: string) => args.some(a => a === f);
    if (has('-n')) {
      await emitMulti('output', `\nNetBIOS Local Name Table\n\n       Name               Type         Status\n    ---------------------------------------------\n    ${internalPcHostname.toUpperCase().padEnd(15)}  <00>  UNIQUE      Registered\n    WORKGROUP        <00>  GROUP       Registered\n    ${internalPcHostname.toUpperCase().padEnd(15)}  <20>  UNIQUE      Registered\n`, 80);
    } else if (has('-RR')) {
      emit('success', `NetBIOS names released and refreshed successfully for ${internalPcHostname}.`);
    } else if (has('-R')) {
      emit('success', 'Successfully purged the NetBIOS name cache and reloaded it from LMHOSTS.');
    } else if (has('-c')) {
      await emitMulti('output', `\nWindows IP Configuration\n\nNetBIOS Remote Cache Name Table\n\n       Name               Type         Host Address    Life [sec]\n    ---------------------------------------------\n    ${internalPcHostname.toUpperCase().padEnd(15)}  <03>  UNIQUE        ${pcIP.padEnd(13)}  900\n`, 80);
    } else if (has('-r')) {
      await emitMulti('output', `\nNetBIOS Names Resolution and Registration Statistics\n\n    Resolutions sent/received ...........: 3/3\n    Registrations sent/received .........: 1/1\n    Renewals sent/received ..............: 0/0\n`, 80);
    } else if (has('-S') || has('-s')) {
      await emitMulti('output', `\nNetBIOS connection table\n\n    Local Name                  In/Out   Remote Host            Input  Output\n    ------------------------------------------------\n    ${internalPcHostname.toUpperCase().padEnd(18)} <00>  Out     <Unknown>                 0      0\n\n`, 80);
    } else if (has('-a') || has('-A') || has('-L')) {
      const flagIdx = args.findIndex(a => a === '-a' || a === '-A' || a === '-L');
      const param = flagIdx !== -1 && args[flagIdx + 1] ? args[flagIdx + 1] : '';
      let targetIp = param;
      if (param && !isValidIpv4(param) && !isValidIpv6(param)) {
        const namedResult = resolveDeviceNameTargetCallback(param);
        if (namedResult) targetIp = namedResult.ip;
      }
      await emitMulti('output', `\nEthernet Adapter Status\n\n    Host Name ............ : ${internalPcHostname}\n    MAC Address .......... : ${formatMacForArp(pcMAC).toUpperCase()}\n    IP Address ........... : ${pcIP}\n    Subnet Mask .......... : ${pcSubnet}\n    Default Gateway ...... : ${pcGateway}\n    DNS Servers .......... : ${pcDNS}\n    Remote Target ........ : ${targetIp || '(unknown)'}\n`, 80);
    } else {
      emit('output', 'Usage: nbtstat [-n] [-c] [-r] [-R] [-RR] [-S] [-s] [-a name] [-A ip] [-L name]');
    }
    return true;
  }

  if (cmd === 'getmac') {
    const mac = formatMacForArp(pcMAC).toUpperCase();
    await emitMulti('output', `Physical Address    Transport Name\n=================== ============================================\n${mac.padEnd(19)} \\Device\\Tcpip_{${deviceId.toUpperCase()}}`, 60);
    return true;
  }

  return false;
}
