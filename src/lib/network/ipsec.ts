export interface IpsecSa {
  peer: string;
  phase1: 'up' | 'down';
  phase2: 'up' | 'down';
  transformSet: string;
  establishedAt: number;
}

export interface EspPacket {
  protocol: 50;
  spi: string;
  encrypted: boolean;
  originalProtocol: string;
  payload?: unknown;
  sourcePeer?: string;
  destinationPeer?: string;
}

export interface GreOverIpsecPacket {
  outerProtocol: 50; // ESP
  esp: EspPacket;
  innerProtocol: 'GRE';
  grePayload: {
    source: string;
    destination: string;
    innerProtocol: string;
    data: unknown;
  };
}

export function establishIpsecSa(peer: string, transformSet: string, now = Date.now()): IpsecSa {
  return { peer, phase1: 'up', phase2: 'up', transformSet, establishedAt: now };
}

export function encapsulateEsp(protocol: string, sa: IpsecSa, payload?: unknown): EspPacket {
  return {
    protocol: 50,
    spi: `${sa.peer}:${sa.transformSet}`,
    encrypted: true,
    originalProtocol: protocol,
    payload,
    destinationPeer: sa.peer,
  };
}

/** Decapsulates ESP only when the packet belongs to the active SA. */
export function decapsulateEsp(packet: EspPacket, sa: IpsecSa): { protocol: string; payload?: unknown } | undefined {
  if (packet.protocol !== 50 || !packet.encrypted || packet.spi !== `${sa.peer}:${sa.transformSet}` || sa.phase2 !== 'up') {
    return undefined;
  }
  return { protocol: packet.originalProtocol, payload: packet.payload };
}

/**
 * Encapsulates payload into GRE and wraps with IPsec ESP (GRE over IPsec).
 */
export function encapsulateGreOverIpsec(
  sa: IpsecSa,
  greSource: string,
  greDestination: string,
  innerProtocol: string,
  data: unknown
): GreOverIpsecPacket {
  const grePayload = {
    source: greSource,
    destination: greDestination,
    innerProtocol,
    data,
  };

  const esp = encapsulateEsp('GRE', sa, grePayload);

  return {
    outerProtocol: 50,
    esp,
    innerProtocol: 'GRE',
    grePayload,
  };
}

/**
 * Decapsulates a GRE over IPsec packet, stripping ESP and GRE headers.
 */
export function decapsulateGreOverIpsec(
  packet: GreOverIpsecPacket,
  sa: IpsecSa
): { source: string; destination: string; protocol: string; data: unknown } | undefined {
  const decapsulatedEsp = decapsulateEsp(packet.esp, sa);
  if (!decapsulatedEsp || decapsulatedEsp.protocol !== 'GRE') {
    return undefined;
  }

  const gre = decapsulatedEsp.payload as {
    source: string;
    destination: string;
    innerProtocol: string;
    data: unknown;
  };

  if (!gre || !gre.source || !gre.destination) {
    return undefined;
  }

  return {
    source: gre.source,
    destination: gre.destination,
    protocol: gre.innerProtocol,
    data: gre.data,
  };
}
