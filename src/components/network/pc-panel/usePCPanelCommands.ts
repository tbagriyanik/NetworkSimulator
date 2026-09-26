'use client';

import { useCallback } from 'react';
import type { CanvasConnection, CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { OutputLine, FtpSession, PythonSession, PcFile, PCActiveTab } from './PCPanel.types';
import { errorHandler, DEVICE_ERRORS } from '@/lib/errors/errorHandler';
import { loadFs, readFile, resolvePath } from './pcFileSystem';
import { executePythonScript, executePythonScriptAsync } from './pcPythonRunner';
import { resolveBatchFilePath, executeBatchScript } from './pcBatchRunner';
import { usePCPanelFtpCommands } from './usePCPanelFtpCommands';
import { handlePcDiagnosticCommand } from './pcDiagnosticCommands';
import { handlePcInterfaceCommand } from './pcInterfaceCommands';
import { handlePcApplicationCommand } from './pcApplicationCommands';
import { handlePcHelpCommand } from './pcHelpCommands';
import { handlePcSystemCommand } from './pcSystemCommands';
import { handlePcFsCommand } from './pcFileSystemCommands';

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
  topologyConnections: CanvasConnection[];
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
  const m = pipeExpr.match(
    /^(?:find(?:str)?|grep)\s+((?:\/[ivIV]\s+)*)("[^"]*"|'[^']*'|\S+)/i
  );
  if (!m) return output;

  const flags = m[1].toLowerCase();
  const rawTerm = m[2].replace(/^["']|["']$/g, '');
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
        } else if (handlePcHelpCommand(cmd, args, language, emit)) {
          // Handled by help command module
        } else if (handlePcSystemCommand(cmd, args, { deviceId, internalPcHostname, setPcHostname, getNtpNow, emit })) {
          // Handled by system command module
        } else if (handlePcFsCommand(cmd, args, {
          deviceId,
          language,
          t,
          currentPath,
          setCurrentPath,
          winPrevDirMap,
          pcLocalFiles,
          setPcLocalFiles,
          setEditingFile,
          emit,
        })) {
          // Handled by file system command module
        } else if (cmd === 'cls') {
          setPcOutput([]);
        } else if (cmd === 'exit' || cmd === 'quit') {
          onClose();
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
