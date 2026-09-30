/**
 * DHCP Header definition used by relay processing.
 */
export interface DhcpHeader {
  op: 'BOOTREQUEST' | 'BOOTREPLY';
  xid: number;
  ciaddr: string;
  yiaddr: string;
  siaddr: string;
  giaddr: string;
  chaddr: string;
  options: {
    messageType: 'DISCOVER' | 'OFFER' | 'REQUEST' | 'ACK';
    requestedIp?: string;
    serverIdentifier?: string;
    option82?: {
      circuitId?: string;
      remoteId?: string;
    };
  };
}

/**
 * Result of processing a DHCP relay operation.
 */
export interface RelayProcessingResult {
  forwarded: boolean;
  modifiedHeader: DhcpHeader;
  targetDestinationIp: string;
  log: string;
}

/**
 * DHCP Relay Agent (IP helper-address) & Option 82 processing.
 */
export function processDhcpRelay(
  incomingDhcp: DhcpHeader,
  relayInterfaceIp: string,
  dhcpServerIp: string,
  circuitIdInfo?: string,
  remoteIdInfo?: string
): RelayProcessingResult {
  const modified: DhcpHeader = {
    ...incomingDhcp,
    giaddr: relayInterfaceIp,
    options: {
      ...incomingDhcp.options,
      option82:
        circuitIdInfo || remoteIdInfo
          ? {
              circuitId: circuitIdInfo ?? 'VLAN-1 Port',
              remoteId: remoteIdInfo ?? `RelayAgent-${relayInterfaceIp}`
            }
          : incomingDhcp.options.option82
    }
  };

  return {
    forwarded: true,
    modifiedHeader: modified,
    targetDestinationIp: dhcpServerIp,
    log: `DHCP Relay: giaddr=${relayInterfaceIp}, forwarding to ${dhcpServerIp}`
  };
}
