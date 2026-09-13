import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { OutputLine } from './PCPanel.types';
import { checkConnectivity, getWirelessDistance } from '@/lib/network/connectivity';
import { dispatchCapturedPackets } from '../../../utils/packetCapture';
import { getL3Hops } from '@/lib/network/routing';

export interface PcDiagnosticCommandsContext {
  deviceId: string;
  command: string;
  language: string;
  t: Record<string, string>;
  pcDNS: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: { sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string; cableType?: string; active?: boolean }[];
  deviceStates: Map<string, SwitchState> | undefined;
  deviceFromTopology: CanvasDevice | undefined;
  resolveDeviceNameTargetCallback: (raw: string) => { ip: string; label?: string } | null;
  resolveDomainWithDnsServicesCallback: (domain: string) => { address: string; server: { name: string; ip: string } } | null;
  hasGatewayForTargetCallback: (targetIp: string) => boolean;
  isLoopbackTarget: (target: string) => boolean;
  isValidIpv4: (value: string) => boolean;
  isValidIpv6: (value: string) => boolean;
  normalizeLookupTargetCallback: (raw: string) => string;
  addPcArpEntry?: (targetIp: string, targetMac: string, isIot?: boolean) => void;
  emit: (type: OutputLine['type'], content: string, prompt?: string) => void;
  emitMulti: (type: OutputLine['type'], content: string, delayMs?: number) => Promise<void>;
}

export async function handlePcDiagnosticCommand(
  cmd: string,
  args: string[],
  ctx: PcDiagnosticCommandsContext
): Promise<boolean> {
  const {
    deviceId,
    command,
    language,
    t,
    pcDNS,
    topologyDevices,
    topologyConnections,
    deviceStates,
    deviceFromTopology,
    resolveDeviceNameTargetCallback,
    resolveDomainWithDnsServicesCallback,
    hasGatewayForTargetCallback,
    isLoopbackTarget,
    isValidIpv4,
    isValidIpv6,
    normalizeLookupTargetCallback,
    addPcArpEntry,
    emit,
    emitMulti,
  } = ctx;

  if (cmd === 'ping') {
    let count = 4;
    let bufferSize = 32;
    let resolveNames = false;
    let continuous = false;
    let ipFamily: '4' | '6' | null = null;
    let target: string | undefined;

    for (let ai = 0; ai < args.length; ai++) {
      const a = args[ai].toLowerCase();
      if (a === '-n') { count = parseInt(args[ai + 1], 10) || 4; ai++; }
      else if (a === '-l') { bufferSize = parseInt(args[ai + 1], 10) || 32; ai++; }
      else if (a === '-w') { ai++; }
      else if (a === '-a') { resolveNames = true; }
      else if (a === '-t') { continuous = true; }
      else if (a === '-6') { ipFamily = '6'; }
      else if (a === '-4') { ipFamily = '4'; }
      else if (target === undefined) { target = args[ai]; }
    }

    if (!target) {
      emit('output', 'Usage: ping [-n count] [-l size] [-w timeout] [-a] [-t] [-4|-6] <target_name_or_address>');
      return true;
    }

    let targetIp = target;
    let dnsResolved = false;
    let hostnameLabel = target;

    const namedResult = resolveDeviceNameTargetCallback(target);
    if (namedResult) {
      targetIp = namedResult.ip;
      dnsResolved = true;
    }

    if (!isValidIpv4(targetIp) && !isValidIpv6(targetIp)) {
      const dnsResult = resolveDomainWithDnsServicesCallback(target);
      if (dnsResult) {
        targetIp = dnsResult.address;
        dnsResolved = true;
      } else {
        emit('output', `Ping request could not find host ${target}. Please check the name and try again.`);
        return true;
      }
    }

    if (ipFamily === '6' && !isValidIpv6(targetIp)) {
      emit('output', 'General failure. This address family is not supported for the request.');
      return true;
    }
    if (ipFamily === '4' && !isValidIpv4(targetIp)) {
      emit('output', 'General failure. This address family is not supported for the request.');
      return true;
    }

    if (resolveNames && (isValidIpv4(targetIp) || isValidIpv6(targetIp))) {
      const matched = topologyDevices.find(d =>
        (d.ip && d.ip.toLowerCase() === targetIp.toLowerCase()) ||
        (d.ipv6 && d.ipv6.toLowerCase() === targetIp.toLowerCase())
      );
      if (matched && matched.name) {
        hostnameLabel = matched.name;
        dnsResolved = true;
      }
    }

    const replyCount = continuous ? Math.max(count, 12) : count;
    const pingTargetDisplay = dnsResolved ? `${hostnameLabel} [${targetIp.toLowerCase()}]` : targetIp.toLowerCase();

    const sendBatch = async (packets: number) => {
      if (isLoopbackTarget(targetIp)) {
        const replies: string[] = [];
        for (let i = 0; i < packets; i++) {
          replies.push(`Reply from 127.0.0.1: bytes=${bufferSize} time<1ms TTL=128`);
        }
        await emitMulti('output', `Pinging ${pingTargetDisplay} with ${bufferSize} bytes of data:\n${replies.join('\n')}\n\nPing statistics for ${pingTargetDisplay}:\n    Packets: Sent = ${packets}, Received = ${packets}, Lost = 0 (0% loss)`, 100);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pc-command-executed', {
            detail: { deviceId, command, output: 'Reply from 127.0.0.1' }
          }));
        }
        return;
      }

      const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'icmp' });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pc-command-executed', {
          detail: { deviceId, command, output: result.success ? 'Reply from' : 'timed out' }
        }));
      }

      dispatchCapturedPackets(result.capturedPackets);

      if (result.success) {
        const targetDevice = result.targetId ? topologyDevices.find(d => d.id === result.targetId) : undefined;
        if (targetDevice && targetDevice.macAddress) {
          addPcArpEntry?.(targetIp, targetDevice.macAddress, targetDevice.type === 'iot');
        }

        const srcDist = getWirelessDistance(deviceFromTopology, topologyDevices, deviceStates);
        const dstDist = getWirelessDistance(targetDevice, topologyDevices, deviceStates);

        const srcWired = srcDist === Infinity;
        const dstWired = dstDist === Infinity;
        const effectiveDist = (srcWired ? 0 : srcDist) + (dstWired ? 0 : dstDist);
        const allWired = srcWired && dstWired;

        const generatePingTime = () => {
          if (allWired) return 0;
          const base = Math.exp(effectiveDist / 130);
          return Math.max(1, Math.round(base * (1 + (Math.random() * 0.16 - 0.08))));
        };

        const formatTime = (ms: number) => ms === 0 ? '<1ms' : `${ms}ms`;

        const replies: string[] = [];
        for (let i = 0; i < packets; i++) {
          const time = generatePingTime();
          replies.push(`Reply from ${targetIp.toLowerCase()}: bytes=${bufferSize} time=${formatTime(time)} TTL=128`);
        }
        await emitMulti('output', `Pinging ${pingTargetDisplay} with ${bufferSize} bytes of data:\n${replies.join('\n')}\n\nPing statistics for ${pingTargetDisplay}:\n    Packets: Sent = ${packets}, Received = ${packets}, Lost = 0 (0% loss)`, 100);
      } else {
        const timeouts = Array(packets).fill('\nRequest timed out.').join('');
        await emitMulti('output', `Pinging ${pingTargetDisplay} with ${bufferSize} bytes of data:${timeouts}\n\nPing statistics for ${pingTargetDisplay}:\n    Packets: Sent = ${packets}, Received = 0, Lost = ${packets} (100% loss)`, 100);
      }
    };

    await sendBatch(replyCount);
    return true;
  }

  if (cmd === 'tracert' || cmd === 'traceroute') {
    let maxHops = 30;
    let resolveNames = true;
    let target: string | undefined;
    for (let ai = 0; ai < args.length; ai++) {
      const a = args[ai].toLowerCase();
      if (a === '-h') { maxHops = parseInt(args[ai + 1], 10) || 30; ai++; }
      else if (a === '-w') { ai++; }
      else if (a === '-d') { resolveNames = false; }
      else if (a === '-4' || a === '-6') { /* address family accepted */ }
      else if (target === undefined) { target = args[ai]; }
    }
    if (!target) {
      emit('output', `Usage: ${cmd} [-d] [-h max_hops] [-w timeout] [-4|-6] <target_name_or_address>`);
      return true;
    }

    let resolvedTarget = target;
    if (!isValidIpv4(target) && !isValidIpv6(target)) {
      const namedResult = resolveDeviceNameTargetCallback(target);
      if (namedResult) {
        resolvedTarget = namedResult.ip;
      } else {
        const dnsResult = resolveDomainWithDnsServicesCallback(target);
        if (dnsResult) {
          resolvedTarget = dnsResult.address;
        }
      }
    }
    const formatHop = (name: string, ip: string) => resolveNames ? `${name} [${ip.toLowerCase()}]` : `[${ip.toLowerCase()}]`;
    if (isLoopbackTarget(resolvedTarget)) {
      await emitMulti('output', `Tracing route to 127.0.0.1 over a maximum of ${maxHops} hops:\n\n  1    <1 ms    <1 ms    <1 ms  localhost [127.0.0.1]\n\nTrace complete.`, 80);
      return true;
    }
    emit('output', `Tracing route to ${target} over a maximum of ${maxHops} hops:\n`);
    const result = checkConnectivity(deviceId, resolvedTarget, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'icmp' });

    dispatchCapturedPackets(result.capturedPackets);

    if (result.success) {
      if (result.targetId) {
        const tracertTarget = topologyDevices.find(d => d.id === result.targetId);
        if (tracertTarget?.macAddress) {
          addPcArpEntry?.(resolvedTarget, tracertTarget.macAddress, tracertTarget.type === 'iot');
        }
      }
      const l3Hops = getL3Hops(deviceId, resolvedTarget, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map());
      const limitedHops = l3Hops && l3Hops.length > 0 ? l3Hops.slice(0, maxHops) : [];
      if (limitedHops.length > 0) {
        let hopOutput = '';
        limitedHops.forEach((hop, index) => {
          hopOutput += `  ${index + 1}    <1 ms    <1 ms    <1 ms  ${formatHop(hop.name, hop.ip)}\n`;
        });
        await emitMulti('output', hopOutput + '\nTrace complete.', 80);
      } else if (result.targetId) {
        const directTarget = topologyDevices.find(d => d.id === result.targetId);
        const directIp = directTarget ? (directTarget.ip || directTarget.ipv6 || resolvedTarget) : resolvedTarget;
        const directName = directTarget?.name || directIp;
        await emitMulti('output', `  1    <1 ms    <1 ms    <1 ms  ${formatHop(directName, directIp)}\n\nTrace complete.`, 80);
      } else {
        await emitMulti('output', `  1    *        *        *     Request timed out.\n\nTrace complete.`, 80);
      }
    } else {
      await emitMulti('output', `  1    *        *        *     Request timed out.\n\nTrace complete.`, 80);
    }
    return true;
  }

  if (cmd === 'nslookup') {
    const typeFlagIdx = args.findIndex(a => /^-type=/i.test(a));
    const queryType = typeFlagIdx !== -1 ? (args[typeFlagIdx].split('=')[1] || 'A').toUpperCase() : 'A';
    const positional = args.filter(a => !a.startsWith("-"));
    const rawTargetDomain = positional[0] ?? '';
    const queryServer = positional[1] ?? pcDNS;
    const targetDomain = rawTargetDomain ? normalizeLookupTargetCallback(rawTargetDomain) : '';
    const isTargetIp = isValidIpv4(targetDomain) || isValidIpv6(targetDomain);

    if (!targetDomain) {
      emit('output', 'Usage: nslookup [-type=A|AAAA|CNAME|MX|NS|PTR|TXT] <domain|ip> [server]');
    } else if (isTargetIp) {
      const reverseMatch = topologyDevices.find(d => d.ip === targetDomain || d.ipv6 === targetDomain);
      if (reverseMatch?.name) {
        await emitMulti('output', `Server:  ${queryServer}\nAddress: ${queryServer}\n\nName:    ${reverseMatch.name}\nAddress: ${targetDomain}`, 80);
      } else {
        await emitMulti('output', `Server:  ${queryServer}\nAddress: ${queryServer}\n\n*** Can't find ${targetDomain}: Non-existent domain`, 80);
      }
    } else if (resolveDeviceNameTargetCallback(targetDomain)) {
      const resolved = resolveDeviceNameTargetCallback(targetDomain) as { ip: string; label: string };
      const devMatch = topologyDevices.find(d => d.name === targetDomain || d.name === resolved.label || d.ip === resolved.ip);
      if (queryType === 'AAAA') {
        const v6 = devMatch?.ipv6 || '::';
        await emitMulti('output', `Server:  local-device\nAddress: 127.0.0.1\n\nName:    ${targetDomain}\nAddress: ${v6}`, 80);
      } else if (queryType === 'CNAME') {
        await emitMulti('output', `Server:  local-device\nAddress: 127.0.0.1\n\n${targetDomain}  canonical name = ${resolved.label || targetDomain}`, 80);
      } else if (queryType === 'MX') {
        await emitMulti('output', `Server:  local-device\nAddress: 127.0.0.1\n\n${targetDomain}  MX preference = 10, mail exchanger = mail.${targetDomain}`, 80);
      } else if (queryType === 'NS') {
        await emitMulti('output', `Server:  local-device\nAddress: 127.0.0.1\n\n${targetDomain}  nameserver = ns.${targetDomain}`, 80);
      } else if (queryType === 'TXT') {
        await emitMulti('output', `Server:  local-device\nAddress: 127.0.0.1\n\n${targetDomain}  text = "v=spf1 -all"`, 80);
      } else if (queryType === 'A') {
        await emitMulti('output', `Server:  local-device\nAddress: 127.0.0.1\n\nName:    ${targetDomain}\nAddress: ${resolved.ip}`, 80);
      } else {
        await emitMulti('output', `Server:  local-device\nAddress: 127.0.0.1\n\n*** Invalid query type: ${queryType}`, 80);
      }
    } else if (!isValidIpv4(queryServer)) {
      emit('error', t.dnsInvalidAddress);
    } else if (!hasGatewayForTargetCallback(queryServer)) {
      emit('error', t.dnsGatewayRequired);
    } else {
      const dnsResult = resolveDomainWithDnsServicesCallback(targetDomain);
      if (dnsResult?.server?.ip) {
        const connectivity = checkConnectivity(deviceId, dnsResult.server.ip, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'udp', port: '53' });
        const dnsPackets = (connectivity.capturedPackets || []).map(p => ({
          ...p,
          protocol: 'DNS',
          info: `DNS Query: ${queryType} ${targetDomain} -> ${dnsResult.address}`
        }));
        dispatchCapturedPackets(dnsPackets);
      }
      if (!dnsResult) {
        await emitMulti('output', `*** DNS request timed out\n*** Can't find ${targetDomain}: Non-existent domain`, 80);
      } else {
        await emitMulti('output', `Server:  ${dnsResult.server.name}\nAddress: ${dnsResult.server.ip}\n\nName:    ${targetDomain}\nAddress: ${dnsResult.address}`, 80);
      }
    }
    return true;
  }

  return false;
}
