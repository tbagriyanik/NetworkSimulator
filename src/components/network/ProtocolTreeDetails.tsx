import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export interface PacketData {
  id: string;
  timestamp: number;
  sourceIp: string;
  targetIp: string;
  protocol: string;
  info: string;
  length?: number;
  srcMac?: string;
  dstMac?: string;
}

interface ProtocolTreeDetailsProps {
  packet: PacketData;
  isDark: boolean;
  language: string;
}

interface TreeNodeProps {
  title: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
  isDark: boolean;
}

function TreeNode({ title, children, defaultExpanded = true, isDark }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="select-none text-xs font-mono">
      <div
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1 px-1 py-0.5 cursor-pointer rounded transition-colors ${isDark ? 'hover:bg-secondary-800 text-slate-200' : 'hover:bg-secondary-100 text-slate-800'
          }`}
      >
        {children ? (
          expanded ? (
            <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
          )
        ) : (
          <span className="w-3.5 h-3.5 inline-block shrink-0" />
        )}
        <span className="font-semibold">{title}</span>
      </div>
      {expanded && children && (
        <div className={`pl-5 border-l my-0.5 space-y-0.5 ${isDark ? 'border-secondary-800' : 'border-secondary-200'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

function TreeLeaf({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div className={`px-1 py-0.5 text-[11px] font-mono flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
      <span className="opacity-70">{label}:</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function ProtocolTreeDetails({ packet, isDark, language }: ProtocolTreeDetailsProps) {
  const isTr = language === 'tr';
  const proto = packet.protocol.toUpperCase();
  const dateStr = new Date(packet.timestamp).toISOString();
  const pktLen = packet.length || 64;

  const srcMac = packet.srcMac || '00:1A:2B:3C:4D:5E';
  const dstMac = packet.dstMac || '00:5E:4D:3C:2B:1A';
  const mqttType = packet.info.match(/MQTT\s+(CONNECT|CONNACK|PUBLISH|PUBACK|SUBSCRIBE|SUBACK|UNSUBSCRIBE|UNSUBACK|PINGREQ|PINGRESP|DISCONNECT)/i)?.[1]?.toUpperCase() || 'PUBLISH';
  const mqttTopic = packet.info.match(/(?:topic|konu)\s*[:=]\s*([^,;]+)/i)?.[1]?.trim() || 'sensors/telemetry';
  const mqttClientId = packet.info.match(/(?:client(?:Id| ID)|istemci)\s*[:=]\s*([^,;]+)/i)?.[1]?.trim() || 'netsim-client';
  const mqttQos = packet.info.match(/QoS\s*[:=]?\s*(0|1|2)/i)?.[1] || '0';
  const qosLabel = (qos: string) => `${qos} (${qos === '0' ? 'At most once' : qos === '1' ? 'At least once' : 'Exactly once'})`;

  const isDropped =
    packet.info.toLowerCase().includes('[drop]') ||
    packet.info.toLowerCase().includes('drop') ||
    packet.info.toLowerCase().includes('blocked') ||
    packet.info.toLowerCase().includes('denied') ||
    packet.info.toLowerCase().includes('engellendi');

  return (
    <div className="p-2 space-y-1 custom-scrollbar overflow-auto h-full pr-2">

      {/* Dropped Frame Banner */}
      {isDropped && (
        <div className={`p-2 mb-1.5 rounded border flex items-start gap-2 text-[11px] font-mono ${
          isDark
            ? 'bg-rose-950/40 border-rose-600/50 text-rose-200'
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white shrink-0">
            {isTr ? 'ENGELLENDİ' : 'DROPPED'}
          </span>
          <div className="flex flex-col">
            <span className="font-bold text-xs">
              {isTr ? 'Güvenlik / Filtre Engellemesi (Drop)' : 'Security / Firewall Drop Action'}
            </span>
            <span className="opacity-90 mt-0.5">{packet.info}</span>
          </div>
        </div>
      )}

      {/* Frame Layer */}
      <TreeNode
        title={`Frame: ${pktLen} bytes on wire (${pktLen * 8} bits), ${pktLen} bytes captured${isDropped ? ' [DROPPED]' : ''}`}
        isDark={isDark}
      >
        <TreeLeaf label={isTr ? 'Arayüz İsim/ID' : 'Interface'} value="eth0" isDark={isDark} />
        <TreeLeaf label={isTr ? 'Varış Zamanı' : 'Arrival Time'} value={dateStr} isDark={isDark} />
        <TreeLeaf label={isTr ? 'Çerçeve Uzunluğu' : 'Frame Length'} value={`${pktLen} bytes (${pktLen * 8} bits)`} isDark={isDark} />
        <TreeLeaf label={isTr ? 'Yakalama Uzunluğu' : 'Capture Length'} value={`${pktLen} bytes`} isDark={isDark} />
      </TreeNode>

      {/* Layer 2: Ethernet II */}
      <TreeNode
        title={`Ethernet II, Src: ${srcMac}, Dst: ${dstMac}`}
        isDark={isDark}
      >
        <TreeLeaf label="Destination MAC" value={dstMac} isDark={isDark} />
        <TreeLeaf label="Source MAC" value={srcMac} isDark={isDark} />
        <TreeLeaf label="Type" value={proto === 'ARP' ? 'ARP (0x0806)' : 'IPv4 (0x0800)'} isDark={isDark} />
      </TreeNode>

      {/* Layer 3: IPv4 / ARP / IPv6 */}
      {proto === 'ARP' ? (
        <TreeNode title={`Address Resolution Protocol (${packet.info || 'request/reply'})`} isDark={isDark}>
          <TreeLeaf label="Hardware type" value="Ethernet (1)" isDark={isDark} />
          <TreeLeaf label="Protocol type" value="IPv4 (0x0800)" isDark={isDark} />
          <TreeLeaf label="Hardware size" value="6" isDark={isDark} />
          <TreeLeaf label="Protocol size" value="4" isDark={isDark} />
          <TreeLeaf label="Sender MAC address" value={srcMac} isDark={isDark} />
          <TreeLeaf label="Sender IP address" value={packet.sourceIp} isDark={isDark} />
          <TreeLeaf label="Target MAC address" value={dstMac} isDark={isDark} />
          <TreeLeaf label="Target IP address" value={packet.targetIp} isDark={isDark} />
        </TreeNode>
      ) : (
        <TreeNode
          title={`Internet Protocol Version 4, Src: ${packet.sourceIp}, Dst: ${packet.targetIp}`}
          isDark={isDark}
        >
          <TreeLeaf label="Version" value="4" isDark={isDark} />
          <TreeLeaf label="Header Length" value="20 bytes (5)" isDark={isDark} />
          <TreeLeaf label="Differentiated Services Field" value="0x00 (DSCP: CS0, ECN: Not-ECT)" isDark={isDark} />
          <TreeLeaf label="Total Length" value={`${pktLen - 14}`} isDark={isDark} />
          <TreeLeaf label="Identification" value="0x1a2b (6699)" isDark={isDark} />
          <TreeLeaf label="Flags" value="0x02, Don't fragment" isDark={isDark} />
          <TreeLeaf label="Time to Live (TTL)" value="64" isDark={isDark} />
          <TreeLeaf label="Protocol" value={`${proto} (${proto === 'ICMP' ? 1 : proto === 'TCP' ? 6 : proto === 'UDP' ? 17 : 89})`} isDark={isDark} />
          <TreeLeaf label="Header Checksum" value="0xa1b2 [validation disabled]" isDark={isDark} />
          <TreeLeaf label="Source Address" value={packet.sourceIp} isDark={isDark} />
          <TreeLeaf label="Destination Address" value={packet.targetIp} isDark={isDark} />
        </TreeNode>
      )}

      {/* Layer 4 & Application */}
      {proto === 'ICMP' && (
        <TreeNode title={`Internet Control Message Protocol (${packet.info || 'Echo request'})`} isDark={isDark}>
          <TreeLeaf label="Type" value={packet.info.includes('reply') ? '0 (Echo reply)' : '8 (Echo request)'} isDark={isDark} />
          <TreeLeaf label="Code" value="0" isDark={isDark} />
          <TreeLeaf label="Checksum" value="0x4c5d [correct]" isDark={isDark} />
          <TreeLeaf label="Identifier (BE)" value="0x0001 (1)" isDark={isDark} />
          <TreeLeaf label="Sequence Number (BE)" value="1" isDark={isDark} />
          <TreeLeaf label="Data" value={`${Math.max(0, pktLen - 42)} bytes`} isDark={isDark} />
        </TreeNode>
      )}

      {(proto === 'TCP' || proto === 'HTTP' || proto === 'HTTPS' || proto === 'SSH' || proto === 'MQTT') && (
        <TreeNode title={`Transmission Control Protocol, Src Port: 54321, Dst Port: ${proto === 'HTTP' ? 80 : proto === 'HTTPS' ? 443 : proto === 'SSH' ? 22 : 80}`} isDark={isDark}>
          <TreeLeaf label="Source Port" value="54321" isDark={isDark} />
          <TreeLeaf label="Destination Port" value={proto === 'HTTP' ? '80' : proto === 'HTTPS' ? '443' : proto === 'SSH' ? '22' : '80'} isDark={isDark} />
          <TreeLeaf label="Sequence Number" value="1" isDark={isDark} />
          <TreeLeaf label="Acknowledgment Number" value="1" isDark={isDark} />
          <TreeLeaf label="Flags" value="0x018 (PSH, ACK)" isDark={isDark} />
          <TreeLeaf label="Window" value="64240" isDark={isDark} />
          <TreeLeaf label="Checksum" value="0xe3f1 [valid]" isDark={isDark} />
        </TreeNode>
      )}

      {proto === 'MQTT' && (
        <TreeNode title={`Message Queuing Telemetry Transport (${mqttType})`} isDark={isDark}>
          <TreeLeaf label={isTr ? 'Mesaj Türü' : 'Message Type'} value={mqttType} isDark={isDark} />
          <TreeLeaf label="MQTT Version" value="3.1.1" isDark={isDark} />
          <TreeLeaf label="Client ID" value={mqttClientId} isDark={isDark} />
          <TreeLeaf label="Topic" value={mqttTopic} isDark={isDark} />
          <TreeLeaf label="QoS" value={qosLabel(mqttQos)} isDark={isDark} />
          <TreeLeaf label="Retain" value={/retain/i.test(packet.info) ? 'true' : 'false'} isDark={isDark} />
          <TreeLeaf label="Duplicate" value={/duplicate|dup/i.test(packet.info) ? 'true' : 'false'} isDark={isDark} />
          <TreeLeaf label="Payload" value={packet.info || '{}'} isDark={isDark} />
        </TreeNode>
      )}

      {(proto === 'UDP' || proto === 'DNS' || proto === 'DHCP' || proto === 'NTP') && (
        <TreeNode title={`User Datagram Protocol, Src Port: 68, Dst Port: ${proto === 'DNS' ? 53 : proto === 'NTP' ? 123 : 67}`} isDark={isDark}>
          <TreeLeaf label="Source Port" value="68" isDark={isDark} />
          <TreeLeaf label="Destination Port" value={proto === 'DNS' ? '53' : proto === 'NTP' ? '123' : '67'} isDark={isDark} />
          <TreeLeaf label="Length" value={`${Math.max(8, pktLen - 34)}`} isDark={isDark} />
          <TreeLeaf label="Checksum" value="0x2b4c [zero]" isDark={isDark} />
        </TreeNode>
      )}

      {/* Application Layer payload details */}
      {proto === 'HTTP' && (
        <TreeNode title="Hypertext Transfer Protocol" isDark={isDark}>
          <TreeLeaf label="Request Method" value="GET / HTTP/1.1" isDark={isDark} />
          <TreeLeaf label="Host" value={packet.targetIp} isDark={isDark} />
          <TreeLeaf label="User-Agent" value="NetworkSimulator/3.9" isDark={isDark} />
          <TreeLeaf label="Accept" value="*/*" isDark={isDark} />
        </TreeNode>
      )}

      {packet.info && (
        <TreeNode title={`Packet Info / Summary Payload`} isDark={isDark}>
          <TreeLeaf label={isTr ? 'Özet Bilgi' : 'Info Details'} value={packet.info} isDark={isDark} />
        </TreeNode>
      )}
    </div>
  );
}
