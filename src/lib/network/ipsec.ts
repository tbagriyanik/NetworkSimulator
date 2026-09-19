export interface IpsecSa { peer: string; phase1: 'up'; phase2: 'up'; transformSet: string; establishedAt: number; }
export interface EspPacket {
  protocol: 50;
  spi: string;
  encrypted: boolean;
  originalProtocol: string;
  payload?: unknown;
  sourcePeer?: string;
  destinationPeer?: string;
}
export function establishIpsecSa(peer: string, transformSet: string, now = Date.now()): IpsecSa { return { peer, phase1: 'up', phase2: 'up', transformSet, establishedAt: now }; }
export function encapsulateEsp(protocol: string, sa: IpsecSa, payload?: unknown): EspPacket {
  return { protocol: 50, spi: `${sa.peer}:${sa.transformSet}`, encrypted: true, originalProtocol: protocol, payload, destinationPeer: sa.peer };
}

/** Decapsulates ESP only when the packet belongs to the active SA. */
export function decapsulateEsp(packet: EspPacket, sa: IpsecSa): { protocol: string; payload?: unknown } | undefined {
  if (packet.protocol !== 50 || !packet.encrypted || packet.spi !== `${sa.peer}:${sa.transformSet}` || sa.phase2 !== 'up') return undefined;
  return { protocol: packet.originalProtocol, payload: packet.payload };
}
