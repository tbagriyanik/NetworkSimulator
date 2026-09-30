/**
 * statefulTcpEngine.ts — Stateful TCP 3-Way Handshake & Teardown Simulator
 *
 * Simulates RFC 793 TCP state transitions and packet flags:
 * - Handshake: SYN -> SYN-ACK -> ACK (ESTABLISHED)
 * - Data Transfer: PSH, ACK
 * - Connection Teardown: FIN-ACK -> FIN-ACK -> ACK or RST
 */

export type TcpState =
  | 'CLOSED'
  | 'LISTEN'
  | 'SYN_SENT'
  | 'SYN_RECEIVED'
  | 'ESTABLISHED'
  | 'FIN_WAIT_1'
  | 'FIN_WAIT_2'
  | 'TIME_WAIT';

export interface TcpSegment {
  step: number;
  sourceIp: string;
  targetIp: string;
  sourcePort: number;
  targetPort: number;
  flags: string[];
  seqNumber: number;
  ackNumber: number;
  windowSize: number;
  info: string;
  protocol: string;
}

export function generateTcpHandshakeSequence(
  sourceIp: string,
  targetIp: string,
  targetPort: number = 80,
  protocolName: string = 'TCP'
): TcpSegment[] {
  const clientPort = 54320 + Math.floor(Math.random() * 1000);
  const clientInitialSeq = 1000;
  const serverInitialSeq = 5000;

  return [
    {
      step: 1,
      sourceIp,
      targetIp,
      sourcePort: clientPort,
      targetPort,
      flags: ['SYN'],
      seqNumber: clientInitialSeq,
      ackNumber: 0,
      windowSize: 64240,
      info: `[SYN] Seq=${clientInitialSeq} Win=64240 Len=0 MSS=1460`,
      protocol: 'TCP',
    },
    {
      step: 2,
      sourceIp: targetIp,
      targetIp: sourceIp,
      sourcePort: targetPort,
      targetPort: clientPort,
      flags: ['SYN', 'ACK'],
      seqNumber: serverInitialSeq,
      ackNumber: clientInitialSeq + 1,
      windowSize: 65535,
      info: `[SYN, ACK] Seq=${serverInitialSeq} Ack=${clientInitialSeq + 1} Win=65535`,
      protocol: 'TCP',
    },
    {
      step: 3,
      sourceIp,
      targetIp,
      sourcePort: clientPort,
      targetPort,
      flags: ['ACK'],
      seqNumber: clientInitialSeq + 1,
      ackNumber: serverInitialSeq + 1,
      windowSize: 64240,
      info: `[ACK] Seq=${clientInitialSeq + 1} Ack=${serverInitialSeq + 1} Win=64240 (Connection Established)`,
      protocol: 'TCP',
    },
    {
      step: 4,
      sourceIp,
      targetIp,
      sourcePort: clientPort,
      targetPort,
      flags: ['PSH', 'ACK'],
      seqNumber: clientInitialSeq + 1,
      ackNumber: serverInitialSeq + 1,
      windowSize: 64240,
      info: `[PSH, ACK] Data Payload Transfer (${protocolName})`,
      protocol: protocolName,
    },
    {
      step: 5,
      sourceIp,
      targetIp,
      sourcePort: clientPort,
      targetPort,
      flags: ['FIN', 'ACK'],
      seqNumber: clientInitialSeq + 250,
      ackNumber: serverInitialSeq + 1,
      windowSize: 64240,
      info: `[FIN, ACK] Client initiate graceful teardown`,
      protocol: 'TCP',
    },
    {
      step: 6,
      sourceIp: targetIp,
      targetIp: sourceIp,
      sourcePort: targetPort,
      targetPort: clientPort,
      flags: ['FIN', 'ACK'],
      seqNumber: serverInitialSeq + 1,
      ackNumber: clientInitialSeq + 251,
      windowSize: 65535,
      info: `[FIN, ACK] Server acknowledge teardown (CLOSED)`,
      protocol: 'TCP',
    },
  ];
}
