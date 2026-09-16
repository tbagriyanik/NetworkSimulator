import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { OutputLine, FtpSession, PCActiveTab } from './PCPanel.types';
import { checkConnectivity } from '@/lib/network/connectivity';
import { dispatchCapturedPackets } from '../../../utils/packetCapture';
import { handleRestApiRequest } from '@/lib/network/restApiMock';

export interface PcApplicationCommandsContext {
  deviceId: string;
  language: string;
  t: Record<string, string>;
  topologyDevices: CanvasDevice[];
  topologyConnections: { sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string; cableType?: string; active?: boolean }[];
  deviceStates: Map<string, SwitchState> | undefined;
  setConnectedDeviceId: React.Dispatch<React.SetStateAction<string | null>>;
  setConsoleConnectionTime: React.Dispatch<React.SetStateAction<number>>;
  setIsConsoleConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTab: React.Dispatch<React.SetStateAction<PCActiveTab>>;
  onNavigate?: (tab: PCActiveTab) => void;
  onExecuteDeviceCommand?: (deviceId: string, command: string) => Promise<unknown>;
  openWebPage: (url: string, target?: string) => void;
  resolveDeviceNameTargetCallback: (raw: string) => { ip: string; label?: string } | null;
  resolveDomainWithDnsServicesCallback: (domain: string) => { address: string; server: { name: string; ip: string } } | null;
  isValidIpv4: (value: string) => boolean;
  isValidIpv6: (value: string) => boolean;
  isLoopbackTarget: (target: string) => boolean;
  addPcArpEntry?: (targetIp: string, targetMac: string, isIot?: boolean) => void;
  setFtpSession: React.Dispatch<React.SetStateAction<FtpSession | null>>;
  setIsFtpFilePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  emit: (type: OutputLine['type'], content: string, prompt?: string) => void;
  emitMulti: (type: OutputLine['type'], content: string, delayMs?: number) => Promise<void>;
}

export async function handlePcApplicationCommand(
  cmd: string,
  args: string[],
  ctx: PcApplicationCommandsContext
): Promise<boolean> {
  const {
    deviceId,
    language,
    topologyDevices,
    topologyConnections,
    deviceStates,
    setConnectedDeviceId,
    setConsoleConnectionTime,
    setIsConsoleConnected,
    setActiveTab,
    onNavigate,
    onExecuteDeviceCommand,
    openWebPage,
    resolveDeviceNameTargetCallback,
    resolveDomainWithDnsServicesCallback,
    isValidIpv4,
    isValidIpv6,
    isLoopbackTarget,
    addPcArpEntry,
    setFtpSession,
    setIsFtpFilePickerOpen,
    emit,
  } = ctx;

  if (cmd === 'curl') {
    let method = 'GET';
    let url = '';
    const reqHeaders: Record<string, string> = {};
    let dataBody = '';

    for (let ai = 0; ai < args.length; ai++) {
      const a = args[ai];
      if (a === '-X' && args[ai + 1]) {
        method = args[ai + 1].toUpperCase();
        ai++;
      } else if (a === '-H' && args[ai + 1]) {
        const parts = args[ai + 1].split(':');
        if (parts.length >= 2) {
          reqHeaders[parts[0].trim()] = parts.slice(1).join(':').trim();
        }
        ai++;
      } else if (a === '-d' && args[ai + 1]) {
        dataBody = args[ai + 1];
        if (method === 'GET') method = 'POST';
        ai++;
      } else if (!url && !a.startsWith('-')) {
        url = a;
      }
    }

    if (!url) {
      emit('output', 'Usage: curl [-X GET|POST|PUT|DELETE] [-H "Header: Value"] [-d "data"] <URL>');
    } else {
      const res = handleRestApiRequest(method, url, reqHeaders, dataBody, topologyDevices);
      const jsonText = JSON.stringify(res.data, null, 2);
      emit('output', `HTTP/1.1 ${res.status} ${res.statusText}\n${jsonText}`);
    }
    return true;
  }

  if (cmd === 'wget') {
    const url = args[0];
    if (!url) {
      emit('output', 'Usage: wget <url>');
    } else {
      openWebPage(url, args[1]);
    }
    return true;
  }

  if (cmd === 'telnet' || cmd === 'ssh') {
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
      emit('output', isSsh
        ? 'Usage: ssh -l <username> <ip> [port]\n       ssh <username>@<ip> [port]'
        : 'Usage: telnet <ip_or_domain> [port]');
      return true;
    } else if (isSsh) {
      const isValidUsername = /^[A-Za-z0-9._-]+$/.test(username);
      const isValidTargetIp = isValidIpv4(target);
      if (!isValidUsername) {
        emit('error', 'Invalid SSH username format');
        return true;
      }
      if (!isValidTargetIp) {
        emit('error', `Invalid SSH target IP: ${target}`);
        return true;
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
          emit('error', `Could not resolve hostname ${target}`);
          return true;
        }
      }
    }

    if (isLoopbackTarget(targetIp)) {
      emit('success', isSsh
        ? `Trying ${username}@127.0.0.1 ${port} ...\nConnected to 127.0.0.1 as ${username}.`
        : `Trying 127.0.0.1 ${port} ...\nConnected to 127.0.0.1.`);
      return true;
    }

    const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port });

    dispatchCapturedPackets(result.capturedPackets);

    if (result.success && result.targetId) {
      const targetDevice = topologyDevices.find(d => d.id === result.targetId);

      if (targetDevice?.macAddress) {
        addPcArpEntry?.(targetIp, targetDevice.macAddress, targetDevice.type === 'iot');
      }

      if (targetDevice && ((targetDevice.type === 'switchL2' || targetDevice.type === 'switchL3') || targetDevice.type === 'router' || targetDevice.type === 'wlc')) {
        if (deviceStates) {
          const targetState = deviceStates.get(result.targetId);
          if (isSsh && (!targetState?.rsaKeys || targetState.sshVersion !== 2 || !targetState.security?.vtyLines?.loginLocal)) {
            emit('error', `Connecting to ${targetIp}...SSH server is not fully configured (RSA, version 2, login local required)`);
            return true;
          }
          if (targetState?.security?.vtyLines) {
            const transportInput = targetState.security.vtyLines.transportInput || [];
            if (isSsh) {
              if (!targetState.rsaKeys) {
                emit('error', `Connecting to ${targetIp}...SSH server has no RSA keys configured`);
                return true;
              }
              if (targetState.sshVersion !== 2) {
                emit('error', `Connecting to ${targetIp}...SSH version 2 is required`);
                return true;
              }
              if (!targetState.security.vtyLines.loginLocal) {
                emit('error', `Connecting to ${targetIp}...VTY is not configured for local login`);
                return true;
              }
              const isSshActive = transportInput.includes('all') || transportInput.includes('ssh');
              if (!isSshActive) {
                emit('error', `Connecting to ${targetIp}...Could not open connection to the host, on port 22: Connect failed`);
                return true;
              }
            } else {
              const isTelnetActive = transportInput.includes('all') || transportInput.includes('telnet');
              if (!isTelnetActive) {
                emit('error', `Connecting to ${targetIp}...Could not open connection to the host, on port 23: Connect failed`);
                return true;
              }
            }
          }
        }

        emit('success', isSsh
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
        emit('error', `Connection refused by ${targetIp}`);
      }
    } else {
      emit('error', `Connecting to ${targetIp}... failed: ${result.error || 'Destination unreachable'}`);
    }
    return true;
  }

  if (cmd === 'ftp') {
    const targetArg = args[0];
    if (!targetArg) {
      emit('output', 'Usage: ftp <server_address>');
      return true;
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
          emit('error', language === 'tr'
            ? `DNS sorgusu başarısız: '${targetArg}' çözümlenemedi.`
            : `Could not resolve hostname '${targetArg}'.`);
          return true;
        }
      }
    }

    const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '21' });

    const ftpPackets = (result.capturedPackets || []).map(p => ({
      ...p,
      protocol: 'FTP',
      info: `FTP: Connect ${targetIp}:21 (220 FTP server ready)`
    }));
    dispatchCapturedPackets(ftpPackets.length > 0 ? ftpPackets : result.capturedPackets);

    if (result.success && result.targetId) {
      const ftpTargetDevice = topologyDevices.find(d => d.id === result.targetId)
        || topologyDevices.find(d => d.ip === targetIp);
      if (ftpTargetDevice?.macAddress) {
        addPcArpEntry?.(targetIp, ftpTargetDevice.macAddress, ftpTargetDevice.type === 'iot');
      }
    }

    if (!result.success) {
      const err = result.error || '';
      const displayTarget = dnsResolved ? `${targetArg} [${targetIp}]` : targetIp;
      if (/firewall|güvenlik duvarı/i.test(err)) {
        emit('error', `${displayTarget}: ${err}`);
      } else if (/acl/i.test(err)) {
        emit('error', `${displayTarget}: ${err}`);
      } else if (/ip address/i.test(err)) {
        emit('error', language === 'tr'
          ? 'FTP bağlantısı sağlanamadı: Kaynak cihazın IP adresi yok.'
          : 'Could not connect to FTP server: Source device has no IP address.');
      } else {
        emit('error', language === 'tr'
          ? `FTP bağlantısı sağlanamadı: ${displayTarget} adresine ulaşılamıyor.`
          : `Could not connect to FTP server at ${displayTarget}: Destination unreachable.`);
      }
      return true;
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
      emit('error', language === 'tr'
        ? `FTP bağlantısı sağlanamadı: ${targetIp} üzerinde FTP servisi aktif değil.`
        : `FTP service is not enabled on ${targetIp}.`);
      return true;
    }
    const files = ftpService.files || [];
    const resolvedDeviceId = result.targetId || targetDevice?.id || deviceByIp?.id || '';
    setFtpSession({ host: targetArg, targetDeviceId: resolvedDeviceId, files });
    setIsFtpFilePickerOpen(true);
    emit('output', `Connected to ${targetArg}.`);
    emit('output', '220 FTP server ready.');
    emit('success', language === 'tr' ? 'Dosya transfer ekranı açıldı.' : 'File transfer window opened.');
    return true;
  }

  return false;
}

