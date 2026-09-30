export interface DhcpHeader {
  op: 'BOOTREQUEST' | 'BOOTREPLY';
  xid: number;
  ciaddr: string; // Client IP
  yiaddr: string; // Your (assigned) IP
  siaddr: string; // Server IP
  giaddr: string; // Gateway IP (Relay Agent IP)
  chaddr: string; // Client Hardware (MAC) Address
  options: {
    messageType: 'DISCOVER' | 'OFFER' | 'REQUEST' | 'ACK';
    requestedIp?: string;
    serverIdentifier?: string;
    option82?: {
      circuitId?: string; // e.g. "VLAN-10 Fa0/1"
      remoteId?: string;  // e.g. Relay Switch MAC / Hostname
    };
  };
}

export interface RelayProcessingResult {
  forwarded: boolean;
  modifiedHeader: DhcpHeader;
  targetDestinationIp: string;
  log: string;
}

/**
 * DHCP Relay Agent (ip helper-address) & Option 82 İşleme Motoru
 */
export function processDhcpRelay(
  incomingDhcp: DhcpHeader,
  relayInterfaceIp: string,
  dhcpServerIp: string,
  circuitIdInfo?: string,
  remoteIdInfo?: string
): RelayProcessingResult {
  const modified: DhcpHeader = JSON.parse(JSON.stringify(incomingDhcp));

  if (modified.op === 'BOOTREQUEST') {
    // 1. giaddr boşsa, röle arayüz IP'sini yerleştir
    if (!modified.giaddr || modified.giaddr === '0.0.0.0') {
      modified.giaddr = relayInterfaceIp;
    }

    // 2. Option 82 Bilgisi Ekle
    if (circuitIdInfo || remoteIdInfo) {
      modified.options.option82 = {
        circuitId: circuitIdInfo || `VLAN-1 Port`,
        remoteId: remoteIdInfo || `RelayAgent-${relayInterfaceIp}`
      };
    }

    return {
      forwarded: true,
      modifiedHeader: modified,
      targetDestinationIp: dhcpServerIp,
      log: `DHCP Relay: Inserted giaddr=${relayInterfaceIp} & Option82 info, forwarding unicast to DHCP Server ${dhcpServerIp}`
    };
  } else {
    // BOOTREPLY (DHCP Server'dan dönen yanıt)
    const clientTargetIp = modified.giaddr;
    return {
      forwarded: true,
      modifiedHeader: modified,
      targetDestinationIp: clientTargetIp,
      log: `DHCP Relay: Received BOOTREPLY from Server, forwarding to client gateway ${clientTargetIp}`
    };
  }
}
