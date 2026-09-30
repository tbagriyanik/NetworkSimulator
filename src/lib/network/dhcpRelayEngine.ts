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

import type { DhcpPayload } from './forwarding/packetFrame';

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

/**
 * Adapter used by the packet forwarding pipeline: relays a simulated DHCP
 * payload (packetFrame's DhcpPayload) by delegating to processDhcpRelay(), so
 * giaddr / Option 82 semantics live in exactly one place.
 *
 * Message directions handled elsewhere; this only covers client → server.
 */
export function relayDhcpPayload(
  payload: DhcpPayload,
  relayInterfaceIp: string,
  dhcpServerIp: string,
  circuitIdInfo?: string,
  remoteIdInfo?: string
): { payload: DhcpPayload; targetDestinationIp: string; log: string } {
  const header: DhcpHeader = {
    op: 'BOOTREQUEST',
    xid: 0,
    ciaddr: '0.0.0.0',
    yiaddr: '0.0.0.0',
    siaddr: '0.0.0.0',
    giaddr: payload.giaddr ?? '0.0.0.0',
    chaddr: payload.clientMac,
    options: {
      messageType: payload.messageType.toUpperCase() as DhcpHeader['options']['messageType'],
      requestedIp: payload.offeredIp,
      option82: payload.option82
        ? { circuitId: payload.option82.agentCircuitId, remoteId: payload.option82.agentRemoteId }
        : undefined
    }
  };

  const result = processDhcpRelay(header, relayInterfaceIp, dhcpServerIp, circuitIdInfo, remoteIdInfo);

  return {
    payload: {
      ...payload,
      giaddr: result.modifiedHeader.giaddr,
      option82: {
        agentCircuitId: result.modifiedHeader.options.option82?.circuitId,
        agentRemoteId: result.modifiedHeader.options.option82?.remoteId
      }
    },
    targetDestinationIp: result.targetDestinationIp,
    log: result.log
  };
}

/**
 * Unwraps a relayed server reply (giaddr owned by this device) for delivery
 * back to the requesting client on the relay interface.
 */
export function unwrapRelayedReply(payload: DhcpPayload): DhcpPayload {
  return { ...payload, giaddr: '0.0.0.0' };
}
