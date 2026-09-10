import type { NetworkPacketFrame } from './packetFrame';
import type { PacketTrace } from './packetPipeline';

export interface PduLayerDetail {
  layer: number; // 1 to 7
  name: string;
  title: string;
  fields: Array<{ label: string; value: string | number; hex?: string }>;
  rawHex?: string;
  notes?: string[];
}

export interface PduDeviceInspection {
  deviceId: string;
  deviceName: string;
  portId?: string;
  inLayers: PduLayerDetail[];
  outLayers?: PduLayerDetail[];
  decisions: string[];
  hexDump: string;
  asciiDump: string;
}

export interface DecodedPduSummary {
  protocol: string;
  summary: string;
  src: string;
  dst: string;
  length: number;
  layers: PduLayerDetail[];
  hexDump: string;
  asciiDump: string;
}

function calculateSimpleChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = (Math.abs(hash) % 65536).toString(16).toUpperCase().padStart(4, '0');
  return `0x${hex}`;
}

export function generatePduHexAndAscii(frame: NetworkPacketFrame): { hexDump: string; asciiDump: string; rawBytes: number[] } {
  const bytes: number[] = [];
  
  // Destination MAC (6 bytes)
  const dstMacParts = (frame.dstMac || 'FFFFFFFFFFFF').replace(/[^0-9A-Fa-f]/g, '').padEnd(12, 'F');
  for (let i = 0; i < 12; i += 2) {
    bytes.push(parseInt(dstMacParts.substring(i, i + 2), 16) || 0);
  }

  // Source MAC (6 bytes)
  const srcMacParts = (frame.srcMac || '000000000000').replace(/[^0-9A-Fa-f]/g, '').padEnd(12, '0');
  for (let i = 0; i < 12; i += 2) {
    bytes.push(parseInt(srcMacParts.substring(i, i + 2), 16) || 0);
  }

  // 802.1Q Tag (if VLAN present)
  if (frame.vlanId && frame.vlanId > 1) {
    bytes.push(0x81, 0x00);
    const vlanWord = ((frame.priority || 0) << 13) | (frame.vlanId & 0x0fff);
    bytes.push((vlanWord >> 8) & 0xff, vlanWord & 0xff);
  }

  // EtherType
  const etherType = frame.etherType || (frame.protocol === 'ARP' ? '0x0806' : '0x0800');
  const ethNum = parseInt(etherType.replace('0x', ''), 16) || 0x0800;
  bytes.push((ethNum >> 8) & 0xff, ethNum & 0xff);

  // Layer 3 (IPv4 / ARP)
  if (frame.srcIp && frame.dstIp) {
    // IPv4 Header (20 bytes minimum)
    bytes.push(0x45); // Version 4, IHL 5
    bytes.push(0x00); // DSCP/ECN
    const totalLen = Math.max(frame.length || 64, 40);
    bytes.push((totalLen >> 8) & 0xff, totalLen & 0xff);
    bytes.push(0x1a, 0x2b); // Identification
    bytes.push(0x40, 0x00); // Flags (Don't Fragment) + Frag Offset
    bytes.push(frame.ttl || 64); // TTL
    
    // IP Protocol
    let protoNum = frame.ipProtocol || 1; // Default ICMP
    if (frame.protocol === 'TCP') protoNum = 6;
    else if (frame.protocol === 'UDP') protoNum = 17;
    else if (frame.protocol === 'OSPF') protoNum = 89;
    else if (frame.protocol === 'EIGRP') protoNum = 88;
    bytes.push(protoNum);

    bytes.push(0xfa, 0xce); // Checksum dummy

    // Src IP (4 bytes)
    const srcParts = frame.srcIp.split('.').map(n => parseInt(n, 10) || 0);
    while (srcParts.length < 4) srcParts.push(0);
    bytes.push(...srcParts.slice(0, 4));

    // Dst IP (4 bytes)
    const dstParts = frame.dstIp.split('.').map(n => parseInt(n, 10) || 0);
    while (dstParts.length < 4) dstParts.push(0);
    bytes.push(...dstParts.slice(0, 4));
  } else if (frame.arpPayload) {
    // ARP Header (28 bytes)
    bytes.push(0x00, 0x01); // Hardware Type: Ethernet
    bytes.push(0x08, 0x00); // Protocol Type: IPv4
    bytes.push(0x06, 0x04); // HW size 6, Proto size 4
    bytes.push(0x00, frame.arpPayload.operation === 'reply' ? 0x02 : 0x01);
    
    // Sender MAC
    const sMac = (frame.arpPayload.senderMac || frame.srcMac).replace(/[^0-9A-Fa-f]/g, '').padEnd(12, '0');
    for (let i = 0; i < 12; i += 2) bytes.push(parseInt(sMac.substring(i, i + 2), 16) || 0);
    
    // Sender IP
    (frame.arpPayload.senderIp || '0.0.0.0').split('.').forEach(s => bytes.push(parseInt(s, 10) || 0));
    
    // Target MAC
    const tMac = (frame.arpPayload.targetMac || frame.dstMac).replace(/[^0-9A-Fa-f]/g, '').padEnd(12, '0');
    for (let i = 0; i < 12; i += 2) bytes.push(parseInt(tMac.substring(i, i + 2), 16) || 0);
    
    // Target IP
    (frame.arpPayload.targetIp || '0.0.0.0').split('.').forEach(s => bytes.push(parseInt(s, 10) || 0));
  }

  // Padding to minimum frame length (64 bytes)
  while (bytes.length < Math.min(frame.length || 64, 128)) {
    bytes.push(0x00);
  }

  // Generate Hex lines and ASCII lines
  const hexLines: string[] = [];
  const asciiLines: string[] = [];
  const fullDumpLines: string[] = [];

  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const offsetHex = i.toString(16).padStart(4, '0');
    
    const hexPart = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ').padEnd(48, ' ');
    const asciiPart = chunk.map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
    
    hexLines.push(`${offsetHex}  ${hexPart}`);
    asciiLines.push(asciiPart);
    fullDumpLines.push(`${offsetHex}   ${hexPart}   |${asciiPart}|`);
  }

  return {
    hexDump: fullDumpLines.join('\n'),
    asciiDump: asciiLines.join('\n'),
    rawBytes: bytes,
  };
}

export function decodePduLayers(
  frame: NetworkPacketFrame,
  traces: PacketTrace[] = [],
  _options?: { isOutbound?: boolean }
): { inLayers: PduLayerDetail[]; outLayers: PduLayerDetail[]; decisions: string[] } {
  const inLayers: PduLayerDetail[] = [];
  const outLayers: PduLayerDetail[] = [];
  const decisions: string[] = [];

  // Layer 1: Physical
  inLayers.push({
    layer: 1,
    name: 'Fiziksel (Physical)',
    title: 'Katman 1 - FastEthernet / GigabitEthernet',
    fields: [
      { label: 'Ingress Port', value: frame.ingressPortId || 'GigabitEthernet0/0' },
      { label: 'Medya Tipi', value: frame.cableType || 'Copper 1000Base-TX (Full Duplex)' },
      { label: 'Frame Boyutu', value: `${frame.length || 64} Bytes` },
      { label: 'Sinyal Durumu', value: 'Taşıyıcı Algılandı (Carrier Detect OK)' },
    ],
    notes: ['Gelen bit akışı elektriksel/optik sinyalden çerçeveye (frame) dönüştürüldü.'],
  });

  // Layer 2: Data Link
  inLayers.push({
    layer: 2,
    name: 'Veri Bağlantısı (Data Link)',
    title: 'Katman 2 - Ethernet II / 802.3',
    fields: [
      { label: 'Kaynak MAC (Src MAC)', value: frame.srcMac || '00:00:00:00:00:00' },
      { label: 'Hedef MAC (Dst MAC)', value: frame.dstMac || 'FF:FF:FF:FF:FF:FF' },
      { label: 'EtherType', value: frame.etherType || (frame.protocol === 'ARP' ? '0x0806 (ARP)' : '0x0800 (IPv4)') },
      { label: 'VLAN ID', value: frame.vlanId ? `VLAN ${frame.vlanId}` : 'VLAN 1 (Untagged)' },
      { label: 'FCS / Checksum', value: calculateSimpleChecksum(frame.srcMac + frame.dstMac) },
    ],
    notes: [
      frame.dstMac?.toLowerCase() === 'ff:ff:ff:ff:ff:ff'
        ? 'Hedef MAC adresi Broadcast (FF:FF:FF:FF:FF:FF) olduğu için çerçeve kabul edildi.'
        : 'Hedef MAC adresi yerel arayüz MAC adresi veya multicast adresiyle eşleşti.',
    ],
  });

  // Layer 3: Network
  if (frame.srcIp || frame.dstIp) {
    inLayers.push({
      layer: 3,
      name: 'Ağ Katmanı (Network)',
      title: 'Katman 3 - Internet Protocol v4/v6',
      fields: [
        { label: 'Kaynak IP (Src IP)', value: frame.srcIp || '0.0.0.0' },
        { label: 'Hedef IP (Dst IP)', value: frame.dstIp || '0.0.0.0' },
        { label: 'TTL (Time to Live)', value: frame.ttl ?? 64 },
        { label: 'Protokol ID', value: frame.ipProtocol ? `${frame.ipProtocol}` : frame.protocol },
        { label: 'Header Checksum', value: calculateSimpleChecksum((frame.srcIp || '') + (frame.dstIp || '')) },
      ],
      notes: [
        `TTL değeri ${frame.ttl ?? 64} > 0. Paket yaşam süresi geçerli.`,
        'Yönlendirme tablosunda hedef IP için en uzun eşleşen önek (Longest Prefix Match) kontrol ediliyor.',
      ],
    });
  } else if (frame.arpPayload) {
    inLayers.push({
      layer: 3,
      name: 'Ağ Katmanı (ARP)',
      title: 'Katman 3 - Address Resolution Protocol',
      fields: [
        { label: 'ARP İşlemi', value: frame.arpPayload.operation === 'request' ? 'Request (1)' : 'Reply (2)' },
        { label: 'Gönderen IP', value: frame.arpPayload.senderIp },
        { label: 'Gönderen MAC', value: frame.arpPayload.senderMac },
        { label: 'Hedef IP', value: frame.arpPayload.targetIp },
        { label: 'Hedef MAC', value: frame.arpPayload.targetMac || '00:00:00:00:00:00 (Bilinmiyor)' },
      ],
      notes: [
        frame.arpPayload.operation === 'request'
          ? `Kimde ${frame.arpPayload.targetIp} adresi varsa MAC adresini ${frame.arpPayload.senderIp}'ye bildirsin sorgusu.`
          : `ARP Cevabı: ${frame.arpPayload.senderIp} adresi ${frame.arpPayload.senderMac} MAC adresindedir.`,
      ],
    });
  }

  // Layer 4: Transport
  if (frame.protocol === 'ICMP') {
    inLayers.push({
      layer: 4,
      name: 'İletim / Kontrol (ICMP)',
      title: 'Katman 4 - Internet Control Message Protocol',
      fields: [
        { label: 'ICMP Tipi', value: frame.info?.includes('Reply') ? '0 (Echo Reply)' : '8 (Echo Request)' },
        { label: 'Kod', value: '0' },
        { label: 'Identifier', value: '0x0001' },
        { label: 'Sequence No', value: '1' },
        { label: 'Checksum', value: calculateSimpleChecksum(frame.info || 'icmp') },
      ],
      notes: ['Echo istek/cevap denetimi gerçekleştirildi.'],
    });
  } else if (frame.protocol === 'TCP' || frame.protocol === 'UDP') {
    inLayers.push({
      layer: 4,
      name: 'İletim (Transport)',
      title: `Katman 4 - ${frame.protocol}`,
      fields: [
        { label: 'Kaynak Port (Src Port)', value: 49152 },
        { label: 'Hedef Port (Dst Port)', value: 80 },
        { label: 'Protokol', value: frame.protocol },
        { label: 'Flags', value: 'SYN / ACK' },
      ],
      notes: ['Soket bağlantı durumu denetlendi.'],
    });
  }
 else if (frame.ospfPayload || frame.protocol === 'OSPF') {
    inLayers.push({
      layer: 4,
      name: 'Yönlendirme Protokolü (OSPF)',
      title: 'Katman 4 - OSPFv2 Header & LSU',
      fields: [
        { label: 'OSPF Versiyon', value: '2' },
        { label: 'Mesaj Tipi', value: '1 (Hello Packet) / 4 (Link State Update)' },
        { label: 'Router ID', value: frame.ospfPayload?.routerId || '1.1.1.1' },
        { label: 'Area ID', value: frame.ospfPayload?.areaId || '0.0.0.0 (Backbone)' },
        { label: 'Checksum', value: '0x882A' },
      ],
      notes: ['OSPF komşuluk durumu Hello timer ve Area ID eşleşmesiyle doğrulandı.'],
    });
  }

  // Layer 7: Application
  if (frame.dhcpPayload || frame.protocol === 'DHCP') {
    inLayers.push({
      layer: 7,
      name: 'Uygulama (Application - DHCP)',
      title: 'Katman 7 - Dynamic Host Configuration Protocol',
      fields: [
        { label: 'DHCP Message Type', value: frame.dhcpPayload?.messageType || 'DISCOVER / OFFER' },
        { label: 'Transaction ID (xid)', value: '0x3903F326' },
        { label: 'Client IP (ciaddr)', value: '0.0.0.0' },
        { label: 'Your (Client) IP (yiaddr)', value: frame.dhcpPayload?.offeredIp || '192.168.1.100' },
      ],
      notes: ['DHCP havuzundan adres tahsisi işlendi.'],
    });
  }

  // OutLayers generation (when device forwards the packet)
  outLayers.push({
    layer: 1,
    name: 'Fiziksel (Physical Egress)',
    title: 'Katman 1 - Çıkış Arayüzü',
    fields: [
      { label: 'Egress Port', value: frame.egressPortId || 'GigabitEthernet0/1' },
      { label: 'Hat Durumu', value: 'UP / FULL-DUPLEX 1000Mbps' },
    ],
    notes: ['Çerçeve çıkış kuyruğuna (TX Queue) aktarılıyor.'],
  });

  outLayers.push({
    layer: 2,
    name: 'Veri Bağlantısı (Data Link Egress)',
    title: 'Katman 2 - Frame Yeniden Kapsülleme',
    fields: [
      { label: 'Yeni Kaynak MAC', value: frame.egressDeviceId ? '00:1A:2B:3C:4D:5E' : (frame.srcMac || '00:00:00:00:00:00') },
      { label: 'Yeni Hedef MAC', value: frame.dstMac || 'FF:FF:FF:FF:FF:FF' },
      { label: 'VLAN Tag', value: frame.vlanId ? `Tag: ${frame.vlanId}` : 'Untagged' },
    ],
    notes: ['Sonraki atlama (Next-hop) ARP tablosundan çözülerek Hedef MAC güncellendi.'],
  });

  if (frame.srcIp && frame.dstIp) {
    outLayers.push({
      layer: 3,
      name: 'Ağ Katmanı (Network Egress)',
      title: 'Katman 3 - TTL Azaltma ve NAT',
      fields: [
        { label: 'Kaynak IP', value: frame.srcIp },
        { label: 'Hedef IP', value: frame.dstIp },
        { label: 'Yeni TTL', value: Math.max(0, (frame.ttl ?? 64) - 1) },
      ],
      notes: [
        `TTL 1 azaltıldı: ${frame.ttl ?? 64} -> ${Math.max(0, (frame.ttl ?? 64) - 1)}.`,
        'IPv4 Checksum yeniden hesaplandı.',
      ],
    });
  }

  // Trace decisions
  if (traces.length > 0) {
    traces.forEach(t => {
      decisions.push(`[${t.stage.toUpperCase()}] ${t.action.toUpperCase()}: ${t.reason}`);
    });
  } else {
    decisions.push('1. Çerçeve fiziksel port üzerinden hatasız alındı.');
    decisions.push('2. Hedef MAC adresi yerel arayüzle eşleşti.');
    decisions.push('3. IPv4 yönlendirme tablosu incelendi, çıkış arayüzü belirlendi.');
    decisions.push('4. TTL değeri 1 azaltılarak paket bir sonraki düğüme iletildi.');
  }

  return { inLayers, outLayers, decisions };
}
