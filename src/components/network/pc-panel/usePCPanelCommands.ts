'use client';

import { useCallback } from 'react';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { OutputLine, FtpSession, PythonSession, PcFile, PCActiveTab } from './PCPanel.types';
import { errorHandler, DEVICE_ERRORS } from '@/lib/errors/errorHandler';
import {
  loadFs, saveFs, resolvePath, isDir, listDir, makeDir, removeDir,
  readFile, deleteFile, getNodeDetails,
  copyFile, moveNode, renameNode,
} from './pcFileSystem';
import { executePythonScript, executePythonScriptAsync } from './pcPythonRunner';
import { resolveBatchFilePath, executeBatchScript } from './pcBatchRunner';
import { usePCPanelFtpCommands } from './usePCPanelFtpCommands';
import { handlePcDiagnosticCommand } from './pcDiagnosticCommands';
import { handlePcInterfaceCommand } from './pcInterfaceCommands';
import { handlePcApplicationCommand } from './pcApplicationCommands';

// Per-device previous working directory (cd -). Mirrors the Linux OLDPWD support.
const winPrevDirMap = new Map<string, string>();

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
  pythonSession: PythonSession | null;
  setPythonSession: React.Dispatch<React.SetStateAction<PythonSession | null>>;
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
  addPcArpEntry?: (targetIp: string, targetMac: string, isIot?: boolean) => void;
  removePcArpEntry?: (targetIp: string) => void;
  clearPcArpTable?: () => void;
  openWebPage: (url: string, target?: string) => void;
  setPcHostname: (hostname: string) => void;
  currentPath: string;
  setCurrentPath: React.Dispatch<React.SetStateAction<string>>;
  setEditingFile: React.Dispatch<React.SetStateAction<{ path: string; content: string } | null>>;
  getNtpNow?: () => Date | null;
}

// ---------------------------------------------------------------------------
// Helper: apply a pipe filter to multi-line output
// Supports: find /i "pattern", findstr /i "pattern", grep -i pattern
// ---------------------------------------------------------------------------
function applyPcPipeFilter(output: string, pipeExpr: string): string {
  // find [/i] "term"  OR  findstr [/i] [/v] "term"  OR  grep [-i] [-v] term
  const m = pipeExpr.match(
    /^(?:find(?:str)?|grep)\s+((?:\/[ivIV]\s+)*)("[^"]*"|'[^']*'|\S+)/i
  );
  if (!m) return output; // unrecognised pipe – pass through unchanged

  const flags = m[1].toLowerCase();
  const rawTerm = m[2].replace(/^["']|["']$/g, ''); // strip surrounding quotes
  const caseInsensitive = flags.includes('/i') || flags.includes('-i');
  const invert = flags.includes('/v') || flags.includes('-v');

  const lines = output.split('\n');
  const filtered = lines.filter(line => {
    const haystack = caseInsensitive ? line.toLowerCase() : line;
    const needle = caseInsensitive ? rawTerm.toLowerCase() : rawTerm;
    const found = haystack.includes(needle);
    return invert ? !found : found;
  });
  return filtered.join('\n');
}

const UNSUPPORTED_DOS_COMMANDS = new Set([
  'cat', 'nano', 'vim', 'vi', 'grep', 'chmod', 'chown', 'pwd', 'touch',
  'ifconfig', 'traceroute', 'clear', 'history', 'which', 'whereis',
]);

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
    pythonSession,
    setPythonSession,
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
    addPcArpEntry,
    removePcArpEntry,
    clearPcArpTable,
    openWebPage,
    setPcHostname,
    currentPath,
    setCurrentPath,
    setEditingFile,
    getNtpNow,
  } = params;

  const { executeFtpPut, handleFtpSessionCommand } = usePCPanelFtpCommands({
    deviceId,
    language,
    ftpSession,
    setFtpSession,
    setPcLocalFiles,
    setIsFtpFilePickerOpen,
    topologyDevices,
    topologyConnections,
    deviceStates,
    addLocalOutput,
  });

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
      if (pythonSession) {
        addLocalOutput('command', command, pythonSession.currentPrompt || '>>> ');
        if (command.trim() === 'exit' || command.trim() === 'quit') {
          setPythonSession(null);
          addLocalOutput('error', 'KeyboardInterrupt');
          return;
        }

        const nextInputs = [...pythonSession.inputs, command];
        const res = executePythonScript(pythonSession.code, nextInputs, undefined, deviceId);

        if (res.waitingForInput) {
          setPythonSession({
            ...pythonSession,
            inputs: nextInputs,
            currentPrompt: res.inputPrompt || '>>> ',
          });
          if (res.output) {
            const allLines = res.output.split('\n');
            const newLines = allLines.slice(pythonSession.inputs.length);
            if (newLines.length > 0) {
              addLocalOutput('output', newLines.join('\n'));
            }
          }
        } else {
          setPythonSession(null);
          if (res.error) {
            addLocalOutput('error', res.error);
          } else if (res.output) {
            const allLines = res.output.split('\n');
            const newLines = allLines.slice(pythonSession.inputs.length);
            if (newLines.length > 0) {
              addLocalOutput('output', newLines.join('\n'));
            }
          }
        }
        return;
      }

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

        // --- Pipe detection: split token at first '|' outside quotes ---
        let activeToken = token;
        let pipeExpr: string | null = null;
        let pipeIdx = -1;
        let inDouble = false;
        let inSingle = false;
        for (let pI = 0; pI < token.length; pI++) {
          const ch = token[pI];
          if (ch === '"' && !inSingle) inDouble = !inDouble;
          else if (ch === "'" && !inDouble) inSingle = !inSingle;
          else if (ch === '|' && !inDouble && !inSingle) {
            if (token[pI + 1] === '|') { pI++; continue; }
            pipeIdx = pI;
            break;
          }
        }
        if (pipeIdx !== -1) {
          activeToken = token.slice(0, pipeIdx).trim();
          pipeExpr = token.slice(pipeIdx + 1).trim();
        }

        // Pipe-aware output helpers — filter ALL command output when a pipe expression is present.
        // This means every command automatically supports  cmd | find /i "x"  without per-command changes.
        const emit = (type: OutputLine['type'], content: string, prompt?: string) =>
          addLocalOutput(type, pipeExpr ? applyPcPipeFilter(content, pipeExpr) : content, prompt);
        const emitMulti = async (type: OutputLine['type'], content: string, delayMs?: number) =>
          addMultilineOutput(type, pipeExpr ? applyPcPipeFilter(content, pipeExpr) : content, delayMs);

        const parts = activeToken.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        let cmdSuccess = true;

        if (UNSUPPORTED_DOS_COMMANDS.has(cmd)) {
          cmdSuccess = false;
          emit('error', `'${cmd}' is not recognized as an internal or external command.`);
        } else if (cmd === 'echo') {
          emit('output', args.join(' '));
        } else if (await handlePcInterfaceCommand(cmd, args, {
          deviceId,
          language,
          t,
          pcIP,
          setPcIP,
          pcSubnet,
          pcMAC,
          pcGateway,
          pcDNS,
          pcIPv6,
          internalPcHostname,
          ipConfigMode,
          wifiEnabled,
          serviceHttpEnabled,
          serviceDnsEnabled,
          serviceDhcpEnabled,
          applyDhcpLeaseRef,
          buildArpTableOutput,
          addPcArpEntry,
          removePcArpEntry,
          clearPcArpTable,
          isValidIpv4,
          isValidIpv6,
          resolveDeviceNameTargetCallback,
          emit,
          emitMulti,
        })) {
          // Handled by interface command module
        } else if (await handlePcDiagnosticCommand(cmd, args, {
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
        })) {
          // Handled by diagnostic command module
        } else if (await handlePcApplicationCommand(cmd, args, {
          deviceId,
          language,
          t,
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
          emitMulti,
        })) {
          // Handled by application command module
        } else if (cmd === 'help' || cmd === '?') {
          const isTR = language === 'tr';
          const helpDict: Record<string, string> = isTR ? {
            'IPCONFIG': 'Ağ arayüzlerinin IP, alt ağ maskesi ve ağ geçidi yapılandırmasını gösterir.',
            'PING': 'Hedef IP veya bilgisayara ICMP yankı istekleri göndererek ağ bağlantısını test eder.',
            'TRACERT': 'Hedef adrese giden paketlerin izlediği yönlendirici rotasını görüntüler.',
            'NSLOOKUP': 'DNS sunucusuna bağlanarak alan adı IP adresi karşılığını sorgular.',
            'TELNET': 'Uzak ağ cihazına Telnet protokolü ile terminal bağlantısı kurar.',
            'SSH': 'Uzak ağ cihazına güvenli SSH protokolü ile terminal bağlantısı kurar.',
            'FTP': 'Ağdaki hedef cihaza FTP ile bağlanıp dosya transfer ekranını açar.',
            'NETSTAT': 'Aktif ağ bağlantılarını ve dinlenen port istatistiklerini görüntüler.',
            'NBTSTAT': 'NetBIOS protokol istatistiklerini ve aktif isim tablosunu gösterir.',
            'GETMAC': 'Bilgisayardaki ağ kartlarının MAC (fiziksel) adreslerini görüntüler.',
            'ARP': 'IP-MAC adresi eşleşmelerini içeren ARP önbellek tablosunu gösterir.',
            'CURL': 'Web sunucusundan HTTP isteği göndererek içerik indirir veya görüntüler.',
            'WGET': 'Web sunucusundan dosya veya içerik indirir.',
            'HOSTNAME': 'Bilgisayar adını görüntüler veya yeni bilgisayar adı atar (örn: hostname PC-1).',
            'CD': 'Mevcut dizini gösterir veya değiştirir (örn: cd \\code, cd ..).',
            'DIR': 'Mevcut dizindeki dosya ve klasörlerin listesini görüntüler.',
            'MD': 'Yeni bir klasör/dizin oluşturur.',
            'RD': 'Var olan bir klasörü/dizini siler.',
            'TYPE': 'Metin dosyasının içeriğini ekrana yazdırır.',
            'COPY': 'Dosyayı başka bir konuma veya isimle kopyalar.',
            'MOVE': 'Dosyayı başka bir klasöre taşır.',
            'REN': 'Dosyanın veya klasörün adını değiştirir.',
            'DEL': 'Bir veya daha fazla dosyayı siler.',
            'EDIT': 'Gelişmiş metin düzenleyiciyi açarak dosyayı düzenler.',
            'PYTHON': 'Python betiği çalıştırır veya etkileşimli Python ortamını açar.',
            'VER': 'İşletim sistemi sürüm bilgilerini görüntüler.',
            'CLS': 'Komut satırı ekranındaki tüm yazıları temizler.',
            'EXIT': 'Komut satırı penceresini kapatır.'
          } : {
            'IPCONFIG': 'Displays all current TCP/IP network configuration values.',
            'PING': 'Tests network connectivity to a target IP or hostname using ICMP.',
            'TRACERT': 'Traces the route to a remote target destination.',
            'NSLOOKUP': 'Displays information to diagnose Domain Name System (DNS) infrastructure.',
            'TELNET': 'Connects to a remote network device via Telnet protocol.',
            'SSH': 'Connects securely to a remote network device via SSH.',
            'FTP': 'Connects to remote FTP server and opens file transfer panel.',
            'NETSTAT': 'Displays active TCP connections and listening ports.',
            'NBTSTAT': 'Displays NetBIOS over TCP/IP protocol statistics and name tables.',
            'GETMAC': 'Displays the Media Access Control (MAC) addresses for network adapters.',
            'ARP': 'Displays and modifies the IP-to-Physical address translation tables.',
            'CURL': 'Fetches or displays content from a web server via HTTP requests.',
            'WGET': 'Downloads files or content from a web server.',
            'HOSTNAME': 'Displays or sets the computer hostname (e.g. hostname PC-1).',
            'CD': 'Displays the name of or changes the current directory.',
            'DIR': 'Displays a list of files and subdirectories in a directory.',
            'MD': 'Creates a directory.',
            'RD': 'Removes a directory.',
            'TYPE': 'Displays the contents of a text file.',
            'COPY': 'Copies one or more files to another location.',
            'MOVE': 'Moves one or more files from one directory to another.',
            'REN': 'Renames a file or files.',
            'DEL': 'Deletes one or more files.',
            'EDIT': 'Opens the text editor to create or modify text files.',
            'PYTHON': 'Executes Python scripts or enters interactive Python mode.',
            'VER': 'Displays the OS version information.',
            'CLS': 'Clears the terminal screen.',
            'EXIT': 'Quits the command prompt window.'
          };

          const targetSubCmd = args[0]?.toUpperCase();
          if (targetSubCmd && helpDict[targetSubCmd]) {
            emit('output', `${targetSubCmd}\n  ${helpDict[targetSubCmd]}`);
          } else {
            const header = isTR
              ? `Windows Command Prompt Simülatörü [Sürüm 10.0.19045.3803]\nDesteklenen komutlar ve açıklamaları:\n`
              : `Windows Command Prompt Simulator [Version 10.0.19045.3803]\nSupported commands and descriptions:\n`;
            const lines = Object.entries(helpDict).map(([k, v]) => `  ${k.padEnd(16)} ${v}`);
            emit('output', header + lines.join('\n'));
          }
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
            emit('success', `Hostname set to ${newHostname}`);
          } else {
            emit('output', internalPcHostname);
          }
        } else if (cmd === 'ver') {
          emit('output', `OS [Version 10.0.26200.8037]`);
        } else if (cmd === 'date') {
          const now = getNtpNow ? getNtpNow() : null;
          const effectiveNow = now && !Number.isNaN(now.getTime()) ? now : new Date();
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = days[effectiveNow.getDay()];
          const monthStr = String(effectiveNow.getMonth() + 1).padStart(2, '0');
          const dateStr = String(effectiveNow.getDate()).padStart(2, '0');
          const yearStr = effectiveNow.getFullYear();
          if (args.includes('-u') || args.includes('--utc')) {
            emit('output', effectiveNow.toUTCString());
          } else {
            emit('output', `The current date is: ${dayName} ${monthStr}/${dateStr}/${yearStr}`);
          }
        } else if (cmd === 'time') {
          const now = getNtpNow ? getNtpNow() : null;
          const effectiveNow = now && !Number.isNaN(now.getTime()) ? now : new Date();
          const hours = String(effectiveNow.getHours()).padStart(2, '0');
          const mins = String(effectiveNow.getMinutes()).padStart(2, '0');
          const secs = String(effectiveNow.getSeconds()).padStart(2, '0');
          const ms = String(effectiveNow.getMilliseconds()).slice(0, 2).padStart(2, '0');
          emit('output', `The current time is: ${hours}:${mins}:${secs}.${ms}`);
        } else if (cmd === 'uptime') {
          const now = getNtpNow ? getNtpNow() : null;
          const effectiveNow = now && !Number.isNaN(now.getTime()) ? now : new Date();
          const hours = String(effectiveNow.getHours()).padStart(2, '0');
          const mins = String(effectiveNow.getMinutes()).padStart(2, '0');
          const secs = String(effectiveNow.getSeconds()).padStart(2, '0');
          emit('output', ` ${hours}:${mins}:${secs} up 1 day, 4:20, 1 user, load average: 0.08, 0.03, 0.01`);
        } else if (cmd === 'cd' || cmd === 'chdir') {
          const targetArg = args.join(' ').trim();
          if (targetArg === '-') {
            const prev = winPrevDirMap.get(deviceId);
            if (!prev) {
              emit('error', 'The system cannot find the previous directory path.');
              return;
            }
            winPrevDirMap.set(deviceId, currentPath);
            setCurrentPath(prev);
            emit('output', prev);
          } else if (!targetArg || targetArg === '.') {
            emit('output', currentPath);
          } else {
            const fs = loadFs(deviceId);
            const targetPath = resolvePath(currentPath, targetArg);
            if (isDir(fs, targetPath)) {
              winPrevDirMap.set(deviceId, currentPath);
              setCurrentPath(targetPath);
            } else {
              emit('error', t.pathNotFound);
            }
          }
        } else if (cmd === 'md' || cmd === 'mkdir') {
          const folderName = args.join(' ').trim();
          if (!folderName) {
            emit('output', t.commandSyntaxError);
          } else {
            const fs = loadFs(deviceId);
            const targetPath = resolvePath(currentPath, folderName);
            const success = makeDir(fs, targetPath);
            if (success) {
              saveFs(deviceId, fs);
              emit('success', `Directory ${folderName} created.`);
            } else {
              emit('error', `A subdirectory or file ${folderName} already exists or path is invalid.`);
            }
          }
        } else if (cmd === 'rd' || cmd === 'rmdir') {
          const folderName = args.join(' ').trim();
          if (!folderName) {
            emit('output', t.commandSyntaxError);
          } else {
            const fs = loadFs(deviceId);
            const targetPath = resolvePath(currentPath, folderName);
            const success = removeDir(fs, targetPath);
            if (success) {
              saveFs(deviceId, fs);
              emit('success', `Directory ${folderName} removed.`);
            } else {
              emit('error', 'Directory not empty or cannot be found.');
            }
          }
        } else if (cmd === 'dir' || cmd === 'ls') {
          const fs = loadFs(deviceId);
          const flagArgs = args.filter(arg => /^[-/]/.test(arg));
          const showAll = flagArgs.some(flag => flag.toLowerCase().includes('a'));
          const targetArgs = args.filter(arg => !/^[-/]/.test(arg));
          const targetPath = targetArgs.length > 0 ? resolvePath(currentPath, targetArgs.join(' ')) : currentPath;

          if (!isDir(fs, targetPath)) {
            emit('error', t.pathNotFound);
          } else {
            const allEntries = listDir(fs, targetPath);
            const entries = allEntries.filter(name => showAll || !name.startsWith('.'));
            let totalFiles = 0;
            let totalSize = 0;
            let totalDirs = 2; // '.' and '..'
            const dirLines: string[] = [];

            const formatDate = (isoStr?: string) => {
              if (!isoStr) return '08/25/2026  08:00 AM';
              try {
                const d = new Date(isoStr);
                if (isNaN(d.getTime())) return '08/25/2026  08:00 AM';
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const yyyy = d.getFullYear();
                let hours = d.getHours();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                const hh = String(hours).padStart(2, '0');
                const min = String(d.getMinutes()).padStart(2, '0');
                return `${mm}/${dd}/${yyyy}  ${hh}:${min} ${ampm}`;
              } catch {
                return '08/25/2026  08:00 AM';
              }
            };

            const rootDetails = getNodeDetails(fs, targetPath);
            const parentDetails = getNodeDetails(fs, resolvePath(targetPath, '..'));

            dirLines.push(`${formatDate(rootDetails?.modifiedAt)}    <DIR>          .`);
            dirLines.push(`${formatDate(parentDetails?.modifiedAt)}    <DIR>          ..`);

            for (const entryName of entries) {
              const fullEntryPath = resolvePath(targetPath, entryName);
              const details = getNodeDetails(fs, fullEntryPath);
              if (details) {
                const dateStr = formatDate(details.modifiedAt);
                if (details.type === 'file') {
                  totalFiles++;
                  totalSize += details.size;
                  dirLines.push(`${dateStr}             ${details.size.toString().padStart(12)} ${entryName}`);
                } else {
                  totalDirs++;
                  dirLines.push(`${dateStr}    <DIR>          ${entryName}`);
                }
              }
            }

            const displayDir = targetPath.endsWith('\\') ? targetPath : `${targetPath}\\`;
            const dirOutput = ` Volume in drive C is OS\n Volume Serial Number is 1234-5678\n\n Directory of ${displayDir}\n\n${dirLines.join('\n')}\n               ${totalFiles} File(s)          ${totalSize.toLocaleString()} bytes\n               ${totalDirs} Dir(s)  100,000,000,000 bytes free`;
            emit('output', dirOutput);
          }
        } else if (cmd === 'type' || cmd === 'cat') {
          const fileArgs = args.filter(arg => !/^[-/]/.test(arg));
          if (fileArgs.length === 0) {
            emit('output', t.commandSyntaxError);
          } else {
            const fs = loadFs(deviceId);
            const outputs: string[] = [];
            const missing: string[] = [];
            for (const fileName of fileArgs) {
              const targetPath = resolvePath(currentPath, fileName);
              const content = readFile(fs, targetPath);
              if (content !== null) {
                outputs.push(content);
                continue;
              }
              const isRoot = currentPath === 'C:\\' || currentPath === 'C:';
              const localFile = isRoot ? pcLocalFiles.find(f => f.name.toLowerCase() === fileName.toLowerCase()) : null;
              if (localFile) {
                outputs.push(`[File ${localFile.name} (${localFile.size} bytes)]`);
              } else {
                missing.push(fileName);
              }
            }
            if (outputs.length > 0) emit('output', outputs.join('\n'));
            if (missing.length > 0) {
              emit('error', missing.length === 1 ? t.fileNotFound : `${t.fileNotFound}: ${missing.join(', ')}`);
            }
          }
        } else if (cmd === 'del' || cmd === 'delete' || cmd === 'rm') {
          const fileName = args.join(' ').trim();
          if (!fileName) {
            emit('output', t.commandSyntaxError);
          } else {
            const fs = loadFs(deviceId);
            const targetPath = resolvePath(currentPath, fileName);
            const deletedFS = deleteFile(fs, targetPath);
            const isRoot = currentPath === 'C:\\' || currentPath === 'C:';
            const localFileExists = isRoot && pcLocalFiles.some(f => f.name.toLowerCase() === fileName.toLowerCase());
            if (localFileExists) {
              setPcLocalFiles(prev => prev.filter(f => f.name.toLowerCase() !== fileName.toLowerCase()));
            }
            if (deletedFS || localFileExists) {
              if (deletedFS) saveFs(deviceId, fs);
              emit('success', 'File deleted successfully.');
            } else {
              emit('error', t.fileNotFound);
            }
          }
        } else if (cmd === 'copy') {
          if (args.length < 2) {
            emit('output', t.commandSyntaxError);
          } else {
            const fs = loadFs(deviceId);
            const srcPath = resolvePath(currentPath, args[0]);
            const destPath = resolvePath(currentPath, args[1]);
            const copied = copyFile(fs, srcPath, destPath);
            if (copied) {
              saveFs(deviceId, fs);
              emit('output', t.copySuccess);
            } else {
              emit('error', t.fileNotFound);
            }
          }
        } else if (cmd === 'move') {
          if (args.length < 2) {
            emit('output', t.commandSyntaxError);
          } else {
            const fs = loadFs(deviceId);
            const srcPath = resolvePath(currentPath, args[0]);
            const destPath = resolvePath(currentPath, args[1]);
            const moved = moveNode(fs, srcPath, destPath);
            if (moved) {
              saveFs(deviceId, fs);
              emit('output', t.moveSuccess);
            } else {
              emit('error', t.fileNotFound);
            }
          }
        } else if (cmd === 'ren' || cmd === 'rename') {
          if (args.length < 2) {
            emit('output', t.commandSyntaxError);
          } else {
            const fs = loadFs(deviceId);
            const targetPath = resolvePath(currentPath, args[0]);
            const res = renameNode(fs, targetPath, args[1]);
            if (res.success) {
              saveFs(deviceId, fs);
            } else if (res.error === 'exists') {
              emit('error', t.duplicateFileError);
            } else {
              emit('error', t.fileNotFound);
            }
          }
        } else if (cmd === 'edit' || cmd === 'notepad' || cmd === 'nano' || cmd === 'vim' || cmd === 'vi') {
          const rawFileName = args.join(' ').trim();
          const fileName = rawFileName || (language === 'tr' ? 'yeni_dosya.txt' : 'new_file.txt');
          const fs = loadFs(deviceId);
          const targetPath = resolvePath(currentPath, fileName);
          const existingContent = rawFileName ? (readFile(fs, targetPath) ?? '') : '';
          setEditingFile({ path: targetPath, content: existingContent });
          emit('output', rawFileName ? `Opening editor for ${fileName}...` : (language === 'tr' ? `Boş metin düzenleyicisi açılıyor (${fileName})...` : `Opening empty text editor (${fileName})...`));
        } else if (cmd === 'python' || cmd === 'python3' || cmd === 'py') {
          const firstArg = args[0];
          const streamOutput = (chunk: string, replaceLastLine?: boolean) => {
            if (replaceLastLine) {
              setPcOutput(prev => {
                const newId = `${Date.now()}-${Math.random()}`;
                if (prev.length === 0) return [{ id: newId, type: 'output', content: chunk }];
                const next = [...prev];
                const last = next[next.length - 1];
                next[next.length - 1] = { id: last?.id || newId, type: 'output', content: chunk };
                return next;
              });
            } else {
              emit('output', chunk);
            }
          };

          if (firstArg === '-c' && args.length > 1) {
            const pyCode = args.slice(1).join(' ').replace(/^["']|["']$/g, '');
            const result = await executePythonScriptAsync(pyCode, [], streamOutput, deviceId);
            if (result.waitingForInput) {
              setPythonSession({
                code: pyCode,
                inputs: [],
                currentPrompt: result.inputPrompt || '>>> ',
              });
            } else if (result.error) {
              emit('error', result.error);
            }
          } else if (firstArg) {
            const fs = loadFs(deviceId);
            const targetPath = resolvePath(currentPath, firstArg);
            const fileContent = readFile(fs, targetPath);
            if (fileContent !== null) {
              const result = await executePythonScriptAsync(fileContent, [], streamOutput, deviceId);
              if (result.waitingForInput) {
                setPythonSession({
                  code: fileContent,
                  inputs: [],
                  currentPrompt: result.inputPrompt || '>>> ',
                });
              } else if (result.error) {
                emit('error', result.error);
              }
            } else {
              emit('error', `python: can't open file '${firstArg}': No such file or directory`);
            }
          } else {
            emit('output', 'Python (netsim-embed, Aug 24 2026)\nType "edit <file.py>" to create or edit scripts, or "python <file.py>" to run.');
          }
        } else if (cmd === 'call') {
          const targetScript = args[0] || '';
          const batchArgs = args.slice(1);
          const fs = loadFs(deviceId);
          const resolvedBat = resolveBatchFilePath(fs, currentPath, targetScript);
          if (resolvedBat) {
            const batContent = readFile(fs, resolvedBat);
            if (batContent !== null) {
              await executeBatchScript({
                fs,
                scriptPath: resolvedBat,
                content: batContent,
                args: batchArgs,
                runSingleCommand: (singleCmd) => executeCommand(singleCmd),
                emitOutput: (type, content, prompt) => emit(type, content, prompt),
                clearOutput: () => setPcOutput([]),
              });
            } else {
              cmdSuccess = false;
              emit('error', `The system cannot find the file specified: ${targetScript}`);
            }
          } else {
            cmdSuccess = false;
            emit('error', `The system cannot find the batch file specified: ${targetScript}`);
          }
        } else {
          const fs = loadFs(deviceId);
          const resolvedBat = resolveBatchFilePath(fs, currentPath, parts[0]);
          if (resolvedBat) {
            const batContent = readFile(fs, resolvedBat);
            if (batContent !== null) {
              await executeBatchScript({
                fs,
                scriptPath: resolvedBat,
                content: batContent,
                args,
                runSingleCommand: (singleCmd) => executeCommand(singleCmd),
                emitOutput: (type, content, prompt) => emit(type, content, prompt),
                clearOutput: () => setPcOutput([]),
              });
            } else {
              cmdSuccess = false;
              emit('error', `'${cmd}' is not recognized as an internal or external command.`);
            }
          } else {
            cmdSuccess = false;
            emit('error', `'${cmd}' is not recognized as an internal or external command.`);
          }
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
    addPcArpEntry, removePcArpEntry, clearPcArpTable,
    openWebPage, setPcHostname, executeFtpPut, handleFtpSessionCommand,
    currentPath, setCurrentPath, setEditingFile,
  ]);

  return {
    executeCommand,
    executeFtpPut,
    handleFtpSessionCommand,
  };
}

