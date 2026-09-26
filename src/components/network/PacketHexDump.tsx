import { useMemo } from 'react';
import type { PacketData } from './ProtocolTreeDetails';

interface PacketHexDumpProps {
  packet: PacketData;
  isDark: boolean;
}

export function PacketHexDump({ packet, isDark }: PacketHexDumpProps) {
  // Generate deterministic synthetic byte array matching packet bytes
  const bytes = useMemo(() => {
    const arr: number[] = [];

    // Ethernet II Header (14 bytes)
    // Dst MAC: 00 5E 4D 3C 2B 1A
    arr.push(0x00, 0x5e, 0x4d, 0x3c, 0x2b, 0x1a);
    // Src MAC: 00 1A 2B 3C 4D 5E
    arr.push(0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e);
    // EtherType (0x0800 IPv4 or 0x0806 ARP)
    if (packet.protocol.toUpperCase() === 'ARP') {
      arr.push(0x08, 0x06);
    } else {
      arr.push(0x08, 0x00);
    }

    // IP Header (20 bytes) or ARP
    if (packet.protocol.toUpperCase() !== 'ARP') {
      arr.push(0x45, 0x00, 0x00, 0x3c, 0x1a, 0x2b, 0x40, 0x00, 0x40); // IP header
      // Protocol number (ICMP=1, TCP=6, UDP=17)
      const proto = packet.protocol.toUpperCase();
      const IP_PROTOCOL_NUMBERS: Record<string, number> = { ICMP: 1, TCP: 6, UDP: 17 };
      const pNum = IP_PROTOCOL_NUMBERS[proto] ?? 89;
      arr.push(pNum);
      arr.push(0xa1, 0xb2); // Checksum

      // Source IP bytes
      const srcOctets = packet.sourceIp.split('.').map(n => parseInt(n, 10) || 0);
      arr.push(...(srcOctets.length === 4 ? srcOctets : [192, 168, 1, 1]));

      // Target IP bytes
      const tgtOctets = packet.targetIp.split('.').map(n => parseInt(n, 10) || 0);
      arr.push(...(tgtOctets.length === 4 ? tgtOctets : [192, 168, 1, 2]));
    }

    // Info payload string bytes
    const infoBytes = Array.from(new TextEncoder().encode(packet.info || 'Packet Data Payload'));
    arr.push(...infoBytes);

    // Pad to min 64 bytes
    while (arr.length < 64) {
      arr.push((arr.length * 7) % 256);
    }

    return arr.slice(0, 128); // Cap display at 128 bytes
  }, [packet]);

  // Group bytes into lines of 16 bytes
  const rows = useMemo(() => {
    const result: { offset: string; hex: string[]; ascii: string }[] = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const slice = bytes.slice(i, i + 16);
      const offset = i.toString(16).padStart(4, '0');

      const hex = slice.map(b => b.toString(16).padStart(2, '0'));
      while (hex.length < 16) hex.push('  ');

      const ascii = slice
        .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
        .join('');

      result.push({ offset, hex, ascii });
    }
    return result;
  }, [bytes]);

  return (
    <div className={`p-2 font-mono text-[11px] leading-relaxed custom-scrollbar overflow-auto h-full pr-2 ${isDark ? 'bg-secondary-950 text-emerald-400' : 'bg-slate-900 text-emerald-300'
      }`}>

      {rows.map((row, rIdx) => (
        <div key={rIdx} className="flex items-center gap-3 hover:bg-white/5 px-1 rounded">
          {/* Offset */}
          <span className="opacity-50 select-none text-slate-400 font-bold">{row.offset}</span>

          {/* Hex bytes */}
          <div className="flex items-center gap-1.5 flex-1">
            <span className="space-x-1">
              {row.hex.slice(0, 8).join(' ')}
            </span>
            <span className="opacity-30">|</span>
            <span className="space-x-1">
              {row.hex.slice(8, 16).join(' ')}
            </span>
          </div>

          {/* ASCII View */}
          <span className="opacity-80 text-amber-200 border-l border-white/10 pl-3 min-w-[140px]">
            {row.ascii}
          </span>
        </div>
      ))}
    </div>
  );
}
