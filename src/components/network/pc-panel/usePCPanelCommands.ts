'use client';

import { useCallback } from 'react';
import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { OutputLine, FtpSession, PcFile, PCActiveTab } from './PCPanel.types';
import { checkConnectivity, getWirelessDistance } from '@/lib/network/connectivity';
import { getL3Hops } from '@/lib/network/routing';
import { errorHandler, DHCP_ERRORS, DEVICE_ERRORS } from '@/lib/errors/errorHandler';
import { formatMacForArp } from './pcPanelHelpers';

export interface UsePCPanelCommandsParams {
  activeTabRef: React.MutableRefObject<PCActiveTab>;
  applyDhcpLeaseRef: React.MutableRefObject<((force?: boolean) => { ip: string; subnetMask: string; gateway: string; dns: string; serverName: string; poolName: string } | null) | null>;
  input: string;
  desktopHistory: string[];
  setDesktopHistory: React.Dispatch<React.SetStateAction<string[]>>;
  setDesktopHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  consoleHistory: string[];
  setConsoleHistory: React.Dispatch<React.SetStateAction<string[]>>;
  setConsoleHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  setShowAutocomplete: React.Dispatch<React.SetStateAction<boolean>>;
  setAutocompleteIndex: React.Dispatch<React.SetStateAction<number>>;
  setAutocompleteNavigated: React.Dispatch<React.SetStateAction<boolean>>;
  ftpSession: FtpSession | null;
  setFtpSession: React.Dispatch<React.SetStateAction<FtpSession | null>>;
  pcLocalFiles: PcFile[];
  setPcLocalFiles: React.Dispatch<React.SetStateAction<PcFile[]>>;
  setIsFtpFilePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pcIP: string;
  setPcIP: React.Dispatch<React.SetStateAction<string>>;
  pcSubnet: string;
  pcMAC: string;
  pcGateway: string;
  pcDNS: string;
  pcIPv6: string;
  internalPcHostname: string;
  ipConfigMode: string;
  deviceId: string;
  language: string;
  t: Record<string, string>;
  topologyDevices: CanvasDevice[];
  topologyConnections: { sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string; cableType?: string; active?: boolean }[];
  deviceStates: Map<string, SwitchState> | undefined;
  deviceFromTopology: CanvasDevice | undefined;
  isCmdInputDisabled: boolean;
  isConsoleInputDisabled: boolean;
  connectionErrorText: string;
  isConsoleConnected: boolean;
  connectedDeviceId: string | null;
  setConnectedDeviceId: React.Dispatch<React.SetStateAction<string | null>>;
  setConsoleConnectionTime: React.Dispatch<React.SetStateAction<number>>;
  setIsConsoleConnected: React.Dispatch<React.SetStateAction<boolean>>;
  wifiEnabled: boolean;
  consoleNeedsPassword: boolean;
  consoleConfirmDialog: { show: boolean; message: string } | null;
  consoleReloadPending: boolean;
  serviceHttpEnabled: boolean;
  serviceDnsEnabled: boolean;
  serviceDhcpEnabled: boolean;
  onUpdatePCHistory?: (deviceId: string, history: string[]) => void;
  onExecuteDeviceCommand?: (deviceId: string, command: string) => Promise<unknown>;
  onNavigate?: (tab: PCActiveTab) => void;
  onClose: () => void;
  setActiveTab: React.Dispatch<React.SetStateAction<PCActiveTab>>;
  setPcOutput: React.Dispatch<React.SetStateAction<OutputLine[]>>;
  addLocalOutput: (type: OutputLine['type'], content: string, prompt?: string) => void;
  addMultilineOutput: (type: OutputLine['type'], content: string, delayMs?: number) => Promise<void>;
  resolveDeviceNameTargetCallback: (raw: string) => { ip: string; label?: string } | null;
  resolveDomainWithDnsServicesCallback: (domain: string) => { address: string; server: { name: string; ip: string } } | null;
  hasGatewayForTargetCallback: (targetIp: string) => boolean;
  isLoopbackTarget: (target: string) => boolean;
  isValidIpv4: (value: string) => boolean;
  isValidIpv6: (value: string) => boolean;
  canReachTargetIp: (targetIp: string, options?: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string }) => boolean;
  normalizeLookupTargetCallback: (raw: string) => string;
  buildArpTableOutput: () => string;
  openWebPage: (url: string, target?: string) => void;
  setPcHostname: (hostname: string) => void;
}

export function usePCPanelCommands(params: UsePCPanelCommandsParams) {
  const {
    activeTabRef,
    applyDhcpLeaseRef,
    input,
    desktopHistory,
    setDesktopHistory,
    setDesktopHistoryIndex,
    consoleHistory,
    setConsoleHistory,
    setConsoleHistoryIndex,
    setInput,
    setShowAutocomplete,
    setAutocompleteIndex,
    setAutocompleteNavigated,
    ftpSession,
    setFtpSession,
    pcLocalFiles,
    setPcLocalFiles,
    setIsFtpFilePickerOpen,
    pcIP,
    setPcIP,
    pcSubnet,
    pcMAC,
    pcGateway,
    pcDNS,
    pcIPv6,
    internalPcHostname,
    ipConfigMode,
    deviceId,
    language,
    t,
    topologyDevices,
    topologyConnections,
    deviceStates,
    deviceFromTopology,
    isCmdInputDisabled,
    isConsoleInputDisabled,
    connectionErrorText,
    isConsoleConnected,
    connectedDeviceId,
    setConnectedDeviceId,
    setConsoleConnectionTime,
    setIsConsoleConnected,
    wifiEnabled,
    consoleNeedsPassword,
    consoleConfirmDialog,
    consoleReloadPending,
    serviceHttpEnabled,
    serviceDnsEnabled,
    serviceDhcpEnabled,
    onUpdatePCHistory,
    onExecuteDeviceCommand,
    onNavigate,
    onClose,
    setActiveTab,
    setPcOutput,
    addLocalOutput,
    addMultilineOutput,
    resolveDeviceNameTargetCallback,
    resolveDomainWithDnsServicesCallback,
    hasGatewayForTargetCallback,
    isLoopbackTarget,
    isValidIpv4,
    isValidIpv6,
    canReachTargetIp,
    normalizeLookupTargetCallback,
    buildArpTableOutput,
    openWebPage,
    setPcHostname,
  } = params;

  const executeFtpPut = useCallback((fileName: string) => {
    const session = ftpSession;
    if (!session) return;
    const newFile = { name: fileName, size: 1024, modifiedAt: new Date().toISOString() };
    const nextFiles = [...(session.files || []), newFile];
    setFtpSession({ ...session, files: nextFiles });

    if (session.targetDeviceId) {
      const targetDev = topologyDevices.find(d => d.id === session.targetDeviceId);
      if (targetDev) {
        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: session.targetDeviceId,
            config: {
              services: {
                ...targetDev.services,
                ftp: {
                  ...targetDev.services?.ftp,
                  enabled: true,
                  files: [...((targetDev.services?.ftp?.files || []).filter((f: { name: string }) => f.name !== fileName)), newFile]
                }
              }
            }
          }
        }));
      }
    }

    addLocalOutput('output', `150 Opening BINARY mode data connection for ${fileName}\n226 Transfer complete.`);
  }, [ftpSession, addLocalOutput, topologyDevices, setFtpSession]);

  const handleFtpSessionCommand = useCallback((cmdLine: string) => {
    const session = ftpSession;
    if (!session) return;
    const cmd = cmdLine.trim().toLowerCase();
    if (cmd === 'quit' || cmd === 'bye' || cmd === 'exit') {
      addLocalOutput('output', '221 Goodbye.');
      setFtpSession(null);
      return;
    }
    if (cmd === 'help' || cmd === '?') {
      addLocalOutput('output', 'Commands: put, ls, dir, get <file>, quit, bye, exit');
      return;
    }
    if (cmd === 'ls' || cmd === 'dir') {
      const files = session.files;
      if (!files || files.length === 0) {
        addLocalOutput('output', '(empty)');
      } else {
        const list = files.map(f => `${f.name.padEnd(20)} ${(f.size || 0).toString().padStart(8)} bytes`).join('\n');
        addLocalOutput('output', list);
      }
      return;
    }
    const getMatch = cmdLine.trim().match(/^(get|recv|mget)\s+(.+)/i);
    if (getMatch) {
      const fileName = getMatch[2];
      const serverFile = session.files?.find(f => f.name.toLowerCase() === fileName.toLowerCase());
      const localFile = { name: fileName, size: serverFile?.size || 0, modifiedAt: new Date().toISOString() };
      setPcLocalFiles(prev => {
        const updated = prev.filter(f => f.name !== fileName).concat(localFile);
        try { localStorage.setItem(`pc_files_${deviceId}`, JSON.stringify(updated)); } catch (_e) { /* ignore */ }
        return updated;
      });
      addLocalOutput('output', `150 Opening BINARY mode data connection for ${fileName}\n226 Transfer complete.`);
      return;
    }
    const putMatch = cmdLine.trim().match(/^(put|send|mput)(?:\s+(.+))?$/i);
    if (putMatch) {
      if (putMatch[2]) {
        const fileName = putMatch[2];
        const localFile = pcLocalFiles.find(f => f.name.toLowerCase() === fileName.toLowerCase());
        if (localFile) {
          executeFtpPut(localFile.name);
        } else {
          addLocalOutput('error', `Local file '${fileName}' not found.`);
        }
      } else {
        setIsFtpFilePickerOpen(true);
      }
      return;
    }
    addLocalOutput('output', '200 Command okay.');
  }, [ftpSession, addLocalOutput, topologyDevices, setFtpSession, deviceId, setIsFtpFilePickerOpen, pcLocalFiles, executeFtpPut, setPcLocalFiles]);

  const executeCommand = useCallback(async (cmdToExecute?: string) => {
    const command = (cmdToExecute || input).trim();
    if (!command) return;
    if ((activeTabRef.current === 'desktop' && isCmdInputDisabled) || (activeTabRef.current === 'terminal' && isConsoleInputDisabled)) {
      addLocalOutput('error', connectionErrorText || t.pcConnectionError);
      setInput('');
      return;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pc-command-executed', {
        detail: { deviceId, command }
      }));
    }

    if (activeTabRef.current === 'desktop') {
      if (desktopHistory[0] !== command) {
        const newHistory = [command, ...desktopHistory].slice(0, 50);
        setDesktopHistory(newHistory);
        if (onUpdatePCHistory) onUpdatePCHistory(deviceId, newHistory);
      }
      setDesktopHistoryIndex(-1);
    } else if (activeTabRef.current === 'terminal') {
      if (consoleHistory[0] !== command) {
        const newHistory = [command, ...consoleHistory].slice(0, 50);
        setConsoleHistory(newHistory);
      }
      setConsoleHistoryIndex(-1);
    }
    setInput('');
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
    setAutocompleteNavigated(false);
    if (activeTabRef.current === 'desktop') {
      const baseCmd = command.split(' ')[0].toLowerCase();
      if (ftpSession && baseCmd !== 'ftp') {
        addLocalOutput('command', command, 'ftp>');
        handleFtpSessionCommand(command);
        return;
      }
      addLocalOutput('command', command);

      const tokens = command.split(/(&&|&)/).map(t => t.trim()).filter(Boolean);
      let skipNext = false;
      let skipUntilNextAmpersand = false;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === '&&') continue;
        if (token === '&') {
          skipNext = false;
          skipUntilNextAmpersand = false;
          continue;
        }

        if (skipNext || skipUntilNextAmpersand) {
          const nextOp = i + 1 < tokens.length ? tokens[i + 1] : null;
          if (nextOp === '&&') skipNext = true;
          else if (nextOp === '&') { skipNext = false; skipUntilNextAmpersand = false; }
          else skipUntilNextAmpersand = true;
          continue;
        }

        const parts = token.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        let cmdSuccess = true;

        if (cmd === 'echo') {
          addLocalOutput('output', args.join(' '));
        } else if (cmd === 'ipconfig') {
          if (args.includes('/release')) {
            setPcIP('0.0.0.0');
            addLocalOutput('success', 'IP address released successfully.');
          } else if (args.includes('/renew')) {
            try {
              const lease = applyDhcpLeaseRef.current?.() ?? null;
              if (lease && lease.serverName !== 'link-local') {
                addLocalOutput(
                  'success',
                  `DHCP lease acquired from ${lease.serverName}/${lease.poolName}. New IP: ${lease.ip}`
                );
              } else {
                addLocalOutput('success', `No DHCP server/pool found. Assigned link-local IP: ${lease?.ip || '(pending)'}`);
              }
            } catch (err) {
              addLocalOutput('error', 'DHCP renew failed. Please check network connection.');
              errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'ipconfigRenew', error: String(err) }));
            }
          } else if (args.includes('/all')) {
            const ipConfigModeText = ipConfigMode === 'dhcp' ? 'Yes' : 'No';
            await addMultilineOutput('output', `Windows IP Configuration\n\n   Host Name . . . . . . . . . . . . : ${internalPcHostname}\n   Primary Dns Suffix  . . . . . . . : \n   Node Type . . . . . . . . . . . . : Hybrid\n   IP Routing Enabled. . . . . . . : No\n   WINS Proxy Enabled. . . . . . . . : No\n\nEthernet adapter Ethernet:\n\n   Connection-specific DNS Suffix  . : \n   Description . . . . . . . . . . . : Intel(R) PRO/1000 MT Network Connection\n   Physical Address. . . . . . . . . : ${pcMAC}\n   DHCP Enabled. . . . . . . . . . . : ${ipConfigModeText}\n   Autoconfiguration Enabled . . . . : Yes\n   IPv4 Address. . . . . . . . . . . : ${pcIP}(Preferred)\n   Subnet Mask . . . . . . . . . . . : ${pcSubnet}\n   Default Gateway . . . . . . . . . : ${pcGateway}\n   DNS Servers . . . . . . . . . . . : ${pcDNS}\n   IPv6 Address. . . . . . . . . . . : ${pcIPv6}(Preferred)\n   NetBIOS over Tcpip. . . . . . . . : Enabled\n\n${wifiEnabled ? `Ethernet adapter Wireless Network Connection:\n\n   Connection-specific DNS Suffix  . : \n   Description . . . . . . . . . . . : Intel(R) Wireless WiFi Link 4965AGN\n   Physical Address. . . . . . . . . : ${pcMAC}\n   DHCP Enabled. . . . . . . . . . . : ${ipConfigModeText}\n   Autoconfiguration Enabled . . . . : Yes\n   IPv4 Address. . . . . . . . . . . : ${pcIP}(Preferred)\n   Subnet Mask . . . . . . . . . . . : ${pcSubnet}\n   Default Gateway . . . . . . . . . : ${pcGateway}\n   DNS Servers . . . . . . . . . . . : ${pcDNS}\n   IPv6 Address. . . . . . . . . . . : ${pcIPv6}(Preferred)\n   NetBIOS over Tcpip. . . . . . . . : Enabled\n\n` : ''}`, 80);
          } else {
            await addMultilineOutput('output', `OS IP Configuration\n\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ${pcIP}\n   Subnet Mask . . . . . . . . . . . : ${pcSubnet}\n   Default Gateway . . . . . . . . . : ${pcGateway}\n   IPv6 Address. . . . . . . . . . . : ${pcIPv6}`, 80);
          }
        } else if (cmd === 'ping') {
          const target = args[0];
          if (!target) {
            addLocalOutput('output', 'Usage: ping <target_name_or_address>');
          } else {
            let targetIp = target;
            let dnsResolved = false;

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
                addLocalOutput('output', `Ping request could not find host ${target}. Please check the name and try again.`);
                return;
              }
            }

            if (isLoopbackTarget(targetIp)) {
              const pingTargetDisplay = dnsResolved ? `${target} [127.0.0.1]` : '127.0.0.1';
              await addMultilineOutput('output', `Pinging ${pingTargetDisplay} with 32 bytes of data:\nReply from 127.0.0.1: bytes=32 time<1ms TTL=128\nReply from 127.0.0.1: bytes=32 time<1ms TTL=128\nReply from 127.0.0.1: bytes=32 time<1ms TTL=128\nReply from 127.0.0.1: bytes=32 time<1ms TTL=128\n\nPing statistics for ${pingTargetDisplay}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`, 100);
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

            if (result.capturedPackets && result.capturedPackets.length > 0 && typeof window !== 'undefined') {
              result.capturedPackets.forEach(pkt => {
                window.dispatchEvent(new CustomEvent('packet-captured', { detail: pkt }));
              });
            }

            if (result.success) {
              const pingTargetDisplay = dnsResolved ? `${target} [${targetIp.toLowerCase()}]` : targetIp.toLowerCase();

              const srcDist = getWirelessDistance(deviceFromTopology, topologyDevices, deviceStates);
              const targetDevice = result.targetId ? topologyDevices.find(d => d.id === result.targetId) : undefined;
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

              const time1 = generatePingTime();
              const time2 = generatePingTime();
              const time3 = generatePingTime();
              const time4 = generatePingTime();

              const formatTime = (ms: number) => ms === 0 ? '<1ms' : `${ms}ms`;

              await addMultilineOutput('output', `Pinging ${pingTargetDisplay} with 32 bytes of data:\nReply from ${targetIp.toLowerCase()}: bytes=32 time=${formatTime(time1)} TTL=128\nReply from ${targetIp.toLowerCase()}: bytes=32 time=${formatTime(time2)} TTL=128\nReply from ${targetIp.toLowerCase()}: bytes=32 time=${formatTime(time3)} TTL=128\nReply from ${targetIp.toLowerCase()}: bytes=32 time=${formatTime(time4)} TTL=128\n\nPing statistics for ${pingTargetDisplay}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`, 100);
            } else {
              cmdSuccess = false;
              const pingTargetDisplay = dnsResolved ? `${target} [${targetIp.toLowerCase()}]` : targetIp.toLowerCase();
              const errorMsg = '\nRequest timed out.';
              await addMultilineOutput('output', `Pinging ${pingTargetDisplay} with 32 bytes of data:${errorMsg}${errorMsg}${errorMsg}${errorMsg}\n\nPing statistics for ${pingTargetDisplay}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)`, 100);
            }
          }
        } else if (cmd === 'nslookup') {
          const rawTargetDomain = args[0];
          const targetDomain = rawTargetDomain ? normalizeLookupTargetCallback(rawTargetDomain) : '';
          if (!targetDomain) {
            addLocalOutput('output', 'Usage: nslookup <domain>');
          } else if (resolveDeviceNameTargetCallback(targetDomain)) {
            const resolved = resolveDeviceNameTargetCallback(targetDomain) as { ip: string; label: string };
            await addMultilineOutput(
              'output',
              `Server: local-device\nAddress: 127.0.0.1\n\nName: ${targetDomain}\nAddress: ${resolved.ip}`,
              80
            );
          } else if (!isValidIpv4(pcDNS)) {
            addLocalOutput('error', t.dnsInvalidAddress);
          } else if (!hasGatewayForTargetCallback(pcDNS)) {
            addLocalOutput('error', t.dnsGatewayRequired);
          } else {
            const dnsResult = resolveDomainWithDnsServicesCallback(targetDomain);
            if (!dnsResult) {
              await addMultilineOutput('output', `*** DNS request timed out\n*** Can't find ${targetDomain}: Non-existent domain`, 80);
            } else {
              await addMultilineOutput(
                'output',
                `Server: ${dnsResult.server.name}\nAddress: ${dnsResult.server.ip}\n\nName: ${targetDomain}\nAddress: ${dnsResult.address}`,
                80
              );
            }
          }
        } else if (cmd === 'curl' || cmd === 'wget') {
          const url = args[0];
          if (!url) {
            addLocalOutput('output', `Usage: ${cmd} <url>`);
          } else {
            openWebPage(url, args[1]);
          }
        } else if (cmd === 'telnet' || cmd === 'ssh') {
          const isSsh = cmd === 'ssh';
          const targetSpec = args[0];
          const extraPort = args[1];

          const isSshLoginFlag = isSsh && targetSpec === '-l';
          const sshUserFromFlag = isSshLoginFlag ? (args[1] || '') : '';
          const sshTargetFromFlag = isSshLoginFlag ? (args[2] || '') : '';
          const sshPortFromFlag = isSshLoginFlag ? args[3] : undefined;

          const sshUserFromSpec = isSsh && !isSshLoginFlag && targetSpec?.includes('@')
            ? targetSpec.split('@')[0].trim()
            : '';
          const targetFromSpec = isSsh && !isSshLoginFlag && targetSpec?.includes('@')
            ? targetSpec.split('@').slice(1).join('@').trim()
            : targetSpec;

          const username = isSsh ? ((sshUserFromFlag || sshUserFromSpec) || 'admin') : '';
          const target = isSshLoginFlag ? sshTargetFromFlag : targetFromSpec;
          const port = isSsh
            ? ((sshPortFromFlag || (isSshLoginFlag ? undefined : extraPort)) || '22')
            : (extraPort || '23');
          if (!target) {
            addLocalOutput('output', isSsh
              ? 'Usage: ssh -l <username> <ip> [port]\n       ssh <username>@<ip> [port]'
              : 'Usage: telnet <ip_or_domain> [port]');
            return;
          } else if (isSsh) {
            const isValidUsername = /^[A-Za-z0-9._-]+$/.test(username);
            const isValidTargetIp = isValidIpv4(target);
            if (!isValidUsername) {
              addLocalOutput('error', 'Invalid SSH username format');
              return;
            }
            if (!isValidTargetIp) {
              addLocalOutput('error', `Invalid SSH target IP: ${target}`);
              return;
            }
          }

          let targetIp = target;
          if (!isSsh) {
            const namedResult = resolveDeviceNameTargetCallback(target);
            if (namedResult) {
              targetIp = namedResult.ip;
            }
            if (!isValidIpv4(targetIp) && !isValidIpv6(targetIp)) {
              const dnsResult = resolveDomainWithDnsServicesCallback(target);
              if (dnsResult) {
                targetIp = dnsResult.address;
              } else {
                addLocalOutput('error', `Could not resolve hostname ${target}`);
                return;
              }
            }
          }

          if (isLoopbackTarget(targetIp)) {
            addLocalOutput('success', isSsh
              ? `Trying ${username}@127.0.0.1 ${port} ...\nConnected to 127.0.0.1 as ${username}.`
              : `Trying 127.0.0.1 ${port} ...\nConnected to 127.0.0.1.`);
            return;
          }

          const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port });

          if (result.success && result.targetId) {
            const targetDevice = topologyDevices.find(d => d.id === result.targetId);

            if (targetDevice && ((targetDevice.type === 'switchL2' || targetDevice.type === 'switchL3') || targetDevice.type === 'router')) {
              if (deviceStates) {
                const targetState = deviceStates.get(result.targetId);
                if (targetState?.security?.vtyLines) {
                  const transportInput = targetState.security.vtyLines.transportInput || [];
                  if (isSsh) {
                    const isSshActive = transportInput.includes('all') || transportInput.includes('ssh');
                    if (!isSshActive) {
                      addLocalOutput('error', `Connecting to ${targetIp}...Could not open connection to the host, on port 22: Connect failed`);
                      return;
                    }
                  } else {
                    const isTelnetActive = transportInput.includes('all') || transportInput.includes('telnet');
                    if (!isTelnetActive) {
                      addLocalOutput('error', `Connecting to ${targetIp}...Could not open connection to the host, on port 23: Connect failed`);
                      return;
                    }
                  }
                }
              }

              addLocalOutput('success', isSsh
                ? `Trying ${username}@${targetIp} ${port} ...\nConnected to ${targetIp} as ${username}.`
                : `Trying ${targetIp} ${port} ...\nConnected to ${targetIp}.`);

              setTimeout(() => {
                setConnectedDeviceId(result.targetId as string);
                setConsoleConnectionTime(Date.now());
                setIsConsoleConnected(true);

                if (onExecuteDeviceCommand) {
                  void onExecuteDeviceCommand(
                    result.targetId as string,
                    isSsh ? `__SSH_CONNECT__:${username}` : '__TELNET_CONNECT__'
                  );
                }

                setActiveTab('terminal');
                onNavigate?.('terminal');
              }, 500);
            } else {
              addLocalOutput('error', `Connection refused by ${targetIp}`);
            }
          } else {
            addLocalOutput('error', `Connecting to ${targetIp}... failed: ${result.error || 'Destination unreachable'}`);
          }
        } else if (cmd === 'arp') {
          if (args.length === 0 || (args.length === 1 && args[0].toLowerCase() === '-a')) {
            addLocalOutput('output', buildArpTableOutput());
          } else {
            addLocalOutput('output', 'Usage: arp -a');
          }
        } else if (cmd === 'tracert' || cmd === 'traceroute') {
          const target = args[0];
          if (!target) {
            addLocalOutput('output', `Usage: ${cmd} <target_name_or_address>`);
          } else {
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
            if (isLoopbackTarget(resolvedTarget)) {
              await addMultilineOutput('output', `Tracing route to 127.0.0.1 over a maximum of 30 hops:\n\n  1    <1 ms    <1 ms    <1 ms  localhost [127.0.0.1]\n\nTrace complete.`, 80);
              return;
            }
            addLocalOutput('output', `Tracing route to ${target} over a maximum of 30 hops:\n`);
            const result = checkConnectivity(deviceId, resolvedTarget, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'icmp' });

            if (result.success) {
              const l3Hops = getL3Hops(deviceId, resolvedTarget, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map());
              if (l3Hops && l3Hops.length > 0) {
                let hopOutput = '';
                l3Hops.forEach((hop, index) => {
                  hopOutput += `  ${index + 1}    <1 ms    <1 ms    <1 ms  ${hop.name} [${hop.ip}]\n`;
                });
                await addMultilineOutput('output', hopOutput + '\nTrace complete.', 80);
              } else {
                await addMultilineOutput('output', `  1    *        *        *     Request timed out.\n\nTrace complete.`, 80);
              }
            } else {
              await addMultilineOutput('output', `  1    *        *        *     Request timed out.\n\nTrace complete.`, 80);
            }
          }
        } else if (cmd === 'netstat') {
          let output = '\nActive Connections\n\n  Proto  Local Address          Foreign Address        State\n';
          output += `  TCP    ${pcIP}:135            0.0.0.0:0              LISTENING\n`;
          output += `  TCP    ${pcIP}:445            0.0.0.0:0              LISTENING\n`;

          if (serviceHttpEnabled) output += `  TCP    ${pcIP}:80             0.0.0.0:0              LISTENING\n`;
          if (serviceDnsEnabled) output += `  UDP    ${pcIP}:53             *:*                    \n`;
          if (serviceDhcpEnabled) output += `  UDP    ${pcIP}:67             *:*                    \n`;

          output += `  TCP    ${pcIP}:49664          0.0.0.0:0              LISTENING\n`;
          output += `  TCP    ${pcIP}:49665          0.0.0.0:0              LISTENING\n`;
          await addMultilineOutput('output', output, 60);
        } else if (cmd === 'nbtstat') {
          if (args.includes('-n')) {
            await addMultilineOutput('output', `\nNetBIOS Local Name Table\n\n       Name               Type         Status\n    ---------------------------------------------\n    ${internalPcHostname.toUpperCase().padEnd(15)}  <00>  UNIQUE      Registered\n    WORKGROUP        <00>  GROUP       Registered\n    ${internalPcHostname.toUpperCase().padEnd(15)}  <20>  UNIQUE      Registered\n`, 80);
          } else {
            addLocalOutput('output', 'Usage: nbtstat [-n]');
          }
        } else if (cmd === 'getmac') {
          const mac = formatMacForArp(pcMAC).toUpperCase();
          await addMultilineOutput(
            'output',
            `Physical Address    Transport Name\n=================== ============================================\n${mac.padEnd(19)} \\Device\\Tcpip_{${deviceId.toUpperCase()}}`,
            60
          );
        } else if (cmd === 'ftp') {
          const targetArg = args[0];
          if (!targetArg) {
            addLocalOutput('output', 'Usage: ftp <server_address>');
            return;
          }

          let targetIp = targetArg;
          let dnsResolved = false;
          if (!isValidIpv4(targetArg) && !isValidIpv6(targetArg)) {
            const namedResult = resolveDeviceNameTargetCallback(targetArg);
            if (namedResult) {
              targetIp = namedResult.ip;
              dnsResolved = true;
            } else {
              const dnsResult = resolveDomainWithDnsServicesCallback(targetArg);
              if (dnsResult) {
                targetIp = dnsResult.address;
                dnsResolved = true;
              } else {
                addLocalOutput('error', language === 'tr'
                  ? `DNS sorgusu başarısız: '${targetArg}' çözümlenemedi.`
                  : `Could not resolve hostname '${targetArg}'.`);
                return;
              }
            }
          }

          const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '21' });

          if (result.capturedPackets && result.capturedPackets.length > 0 && typeof window !== 'undefined') {
            result.capturedPackets.forEach(pkt => {
              window.dispatchEvent(new CustomEvent('packet-captured', { detail: pkt }));
            });
          }

          if (!result.success) {
            const err = result.error || '';
            const displayTarget = dnsResolved ? `${targetArg} [${targetIp}]` : targetIp;
            if (/firewall|güvenlik duvarı/i.test(err)) {
              addLocalOutput('error', `${displayTarget}: ${err}`);
            } else if (/acl/i.test(err)) {
              addLocalOutput('error', `${displayTarget}: ${err}`);
            } else if (/ip address/i.test(err)) {
              addLocalOutput('error', language === 'tr'
                ? 'FTP bağlantısı sağlanamadı: Kaynak cihazın IP adresi yok.'
                : 'Could not connect to FTP server: Source device has no IP address.');
            } else {
              addLocalOutput('error', language === 'tr'
                ? `FTP bağlantısı sağlanamadı: ${displayTarget} adresine ulaşılamıyor.`
                : `Could not connect to FTP server at ${displayTarget}: Destination unreachable.`);
            }
            return;
          }
          const targetDevice = result.targetId
            ? topologyDevices.find(d => d.id === result.targetId)
            : topologyDevices.find(d => d.ip === targetIp);
          const deviceByIp = topologyDevices.find(d => d.ip === targetIp);
          const targetDeviceId = targetDevice?.id || deviceByIp?.id;
          const targetState = targetDeviceId
            ? deviceStates?.get(targetDeviceId)
            : undefined;
          const ftpService =
            targetDevice?.services?.ftp?.enabled ? targetDevice.services.ftp :
              deviceByIp?.services?.ftp?.enabled ? deviceByIp.services.ftp :
                targetState?.services?.ftp?.enabled ? targetState.services.ftp :
                  undefined;
          if (!ftpService?.enabled) {
            addLocalOutput('error', language === 'tr'
              ? `FTP bağlantısı sağlanamadı: ${targetIp} üzerinde FTP servisi aktif değil.`
              : `FTP service is not enabled on ${targetIp}.`);
            return;
          }
          const files = ftpService.files || [];
          const resolvedDeviceId = result.targetId || targetDevice?.id || deviceByIp?.id || '';
          setFtpSession({ host: targetArg, targetDeviceId: resolvedDeviceId, files });
          setIsFtpFilePickerOpen(true);
          addLocalOutput('output', `Connected to ${targetArg}.`);
          addLocalOutput('output', '220 FTP server ready.');
          addLocalOutput('success', language === 'tr' ? 'Dosya transfer ekranı açıldı.' : 'File transfer window opened.');
        } else if (cmd === 'help' || cmd === '?') {
          addLocalOutput('output', `Available commands: ipconfig, ping, tracert, traceroute, telnet, ssh, ftp, netstat, nbtstat, getmac, nslookup, curl, wget, arp, hostname, dir, ver, cls, exit, quit`);
        } else if (cmd === 'cls') {
          setPcOutput([]);
        } else if (cmd === 'exit' || cmd === 'quit') {
          onClose();
        } else if (cmd === 'hostname') {
          if (args[0]) {
            const newHostname = args[0].trim().slice(0, 20);
            setPcHostname(newHostname);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('update-topology-device-config', {
                detail: {
                  deviceId,
                  config: { name: newHostname }
                }
              }));
            }
            addLocalOutput('success', `Hostname set to ${newHostname}`);
          } else {
            addLocalOutput('output', internalPcHostname);
          }
        } else if (cmd === 'ver') {
          addLocalOutput('output', `OS [Version 10.0.26200.8037]`);
        } else if (cmd === 'dir') {
          const localFiles = pcLocalFiles;
          let fileLines = '';
          let totalSize = 0;
          if (localFiles.length > 0) {
            fileLines = '\n' + localFiles.map(f => {
              const d = f.modifiedAt ? new Date(f.modifiedAt) : new Date();
              const month = (d.getMonth() + 1).toString().padStart(2, '0');
              const day = d.getDate().toString().padStart(2, '0');
              const year = d.getFullYear();
              const mm = d.getMinutes().toString().padStart(2, '0');
              const ap = d.getHours() >= 12 ? 'PM' : 'AM';
              const h12 = (d.getHours() % 12 || 12).toString().padStart(2, '0');
              totalSize += f.size || 0;
              return `${month}/${day}/${year}  ${h12}:${mm} ${ap}             ${(f.size || 0).toString().padStart(8)} ${f.name}`;
            }).join('\n');
          }
          addLocalOutput('output', ` Volume in drive C is OS\n Volume Serial Number is 1234-5678\n\n Directory of C:\\\n03/27/2026  10:00 AM    <DIR>          .\n03/27/2026  10:00 AM    <DIR>          ..\n${fileLines}\n               ${localFiles.length} File(s)          ${totalSize} bytes\n                2 Dir(s)  100,000,000,000 bytes free`);
        } else {
          cmdSuccess = false;
          addLocalOutput('error', `'${cmd}' is not recognized as an internal or external command.`);
        }

        const nextOp = i + 1 < tokens.length ? tokens[i + 1] : null;
        if (nextOp === '&&' && !cmdSuccess) {
          skipNext = true;
        }
      }
    } else {
      if (!isConsoleConnected) {
        addLocalOutput('error', t.pcNoDeviceConnected);
        return;
      }

      if (consoleNeedsPassword) {
        if (onExecuteDeviceCommand && connectedDeviceId) {
          try {
            await onExecuteDeviceCommand(connectedDeviceId, input);
          } catch (err) {
            errorHandler.logError(DEVICE_ERRORS.DEVICE_OFFLINE(connectedDeviceId, { operation: 'passwordInput', error: String(err) }));
          }
        }
        setInput('');
        return;
      }

      if ((consoleConfirmDialog?.show || consoleReloadPending)) {
        if (!command) {
          if (onExecuteDeviceCommand && connectedDeviceId) {
            try {
              await onExecuteDeviceCommand(connectedDeviceId, 'confirm');
            } catch (err) {
              errorHandler.logError(DEVICE_ERRORS.DEVICE_OFFLINE(connectedDeviceId, { operation: 'confirmDialog', error: String(err) }));
            }
          }
          setInput('');
          return;
        }
        const lowerCmd = command.toLowerCase().trim();
        if (lowerCmd === 'confirm' || lowerCmd === 'y' || lowerCmd === 'yes') {
          if (onExecuteDeviceCommand && connectedDeviceId) {
            try {
              await onExecuteDeviceCommand(connectedDeviceId, 'confirm');
            } catch (err) {
              errorHandler.logError(DEVICE_ERRORS.DEVICE_OFFLINE(connectedDeviceId, { operation: 'confirmResponse', error: String(err) }));
            }
          }
          setInput('');
          return;
        }
      }

      if (onExecuteDeviceCommand && connectedDeviceId) {
        try {
          await onExecuteDeviceCommand(connectedDeviceId, command);
        } catch (err) {
          errorHandler.logError(DEVICE_ERRORS.DEVICE_OFFLINE(connectedDeviceId, { operation: 'executeCommand', command, error: String(err) }));
        }
      }
    }
  }, [
    activeTabRef, applyDhcpLeaseRef, input, desktopHistory, setDesktopHistory, setDesktopHistoryIndex,
    consoleHistory, setConsoleHistory, setConsoleHistoryIndex, setInput, setShowAutocomplete,
    setAutocompleteIndex, setAutocompleteNavigated, ftpSession, setFtpSession,
    pcLocalFiles, setPcLocalFiles, setIsFtpFilePickerOpen,
    pcIP, setPcIP, pcSubnet, pcMAC, pcGateway, pcDNS, pcIPv6,
    internalPcHostname, ipConfigMode, deviceId, language, t,
    topologyDevices, topologyConnections, deviceStates, deviceFromTopology,
    isCmdInputDisabled, isConsoleInputDisabled, connectionErrorText,
    isConsoleConnected, connectedDeviceId, setConnectedDeviceId,
    setConsoleConnectionTime, setIsConsoleConnected,
    wifiEnabled, consoleNeedsPassword, consoleConfirmDialog, consoleReloadPending,
    serviceHttpEnabled, serviceDnsEnabled, serviceDhcpEnabled,
    onUpdatePCHistory, onExecuteDeviceCommand, onNavigate, onClose,
    setActiveTab, setPcOutput, addLocalOutput, addMultilineOutput,
    resolveDeviceNameTargetCallback, resolveDomainWithDnsServicesCallback,
    hasGatewayForTargetCallback, isLoopbackTarget,
    isValidIpv4, isValidIpv6, canReachTargetIp,
    normalizeLookupTargetCallback, buildArpTableOutput,
    openWebPage, setPcHostname, executeFtpPut, handleFtpSessionCommand,
  ]);

  return {
    executeCommand,
    executeFtpPut,
    handleFtpSessionCommand,
  };
}
