import type { OutputLine } from './PCPanel.types';
import {
  loadFs, saveFs, readFile, writeFile, getNode, resolvePath
} from './pcFileSystem';
import { executePythonScript } from './pcPythonRunner';
import { formatLinuxPath, formatWinToUnixPath } from './pcLinuxPathUtils';
import { expandShellVariables, parseGrepFlags, parseLogicalChain, parseOutputRedirection, parseShellAssignment, setShellVariable, splitPipeline, splitShellWords } from './pcLinuxShellParser';
import { executeLinuxFileCommand } from './pcLinuxFileCommands';
import { executeLinuxNetworkCommand } from './linux/pcLinuxNetworkCommands';

export { formatLinuxPath, formatWinToUnixPath } from './pcLinuxPathUtils';
export { getLinuxSuggestions, LINUX_SUGGESTIONS } from './linux/pcLinuxSuggestions';

export interface LinuxExecutorParams {
  deviceId: string;
  internalPcHostname: string;
  setPcHostname?: (name: string) => void;
  setEditingFile?: (file: { path: string; content: string } | null) => void;
  pcIP: string;
  setPcIP?: (ip: string) => void;
  applyDhcpLease?: (force?: boolean) => { ip: string; subnetMask: string; gateway: string; dns: string; serverName: string; poolName: string } | null;
  pcSubnet: string;
  pcMAC: string;
  pcGateway: string;
  pcDNS: string;
  pcIPv6: string;
  wifiEnabled: boolean;
  currentPath: string;
  setCurrentPath: (path: string) => void;
  canReachTargetIp: (targetIp: string) => boolean;
  resolveDeviceNameTargetCallback: (raw: string) => { ip: string; label?: string } | null;
  openWebPage?: (url: string, target?: string) => void;
  addLocalOutput: (type: OutputLine['type'], content: string, prompt?: string) => void;
  setLinuxOutput: React.Dispatch<React.SetStateAction<OutputLine[]>>;
  executeCommand?: (cmdToExecute?: string) => Promise<void>;
  buildArpTableOutput?: () => string;
  linuxHistory?: string[];
  silent?: boolean;
  getNtpNow?: () => Date | null;
  executionDeadline?: number;
}

const UNSUPPORTED_LINUX_COMMANDS = new Set(['type', 'edit', 'ipconfig']);

function isUnsafeRegexPattern(pattern: string): boolean {
  if (pattern.length > 256) return true;
  return /\([^)]*[+*?](?:[^()]|\([^)]*\))*\)[+*?{]/.test(pattern);
}

export async function executeLinuxCommand(
  cmdLine: string,
  params: LinuxExecutorParams
): Promise<void> {
  const executionDeadline = params.executionDeadline ?? Date.now() + 3000;
  const checkExecutionTimeout = () => {
    if (Date.now() > executionDeadline) {
      throw new Error('bash: execution timed out (exceeded 3s limit)');
    }
  };
  checkExecutionTimeout();
  const {
    deviceId,
    internalPcHostname,
    setPcHostname,
    setEditingFile,
    currentPath,
    setCurrentPath,
    openWebPage,
    addLocalOutput,
    setLinuxOutput,
  } = params;

  const rawCmd = expandShellVariables(cmdLine.trim(), deviceId, currentPath, internalPcHostname);
  if (!rawCmd) return;

  const isSudo = rawCmd.startsWith('sudo ');
  const cleanCmd = isSudo ? rawCmd.substring(5).trim() : rawCmd;
  const parts = splitShellWords(cleanCmd);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (UNSUPPORTED_LINUX_COMMANDS.has(command)) {
    addLocalOutput('error', `bash: ${command}: command not found`);
    return;
  }

  if (command === 'curl' || command === 'wget') {
    const url = args.find(arg => !arg.startsWith('-'));
    if (!url) {
      addLocalOutput('error', `${command}: missing URL`);
      return;
    }
    openWebPage?.(url);
    addLocalOutput('output', `${command}: connected to ${url}`);
    return;
  }

  const linuxPrompt = `${isSudo ? 'root' : 'user'}@${internalPcHostname.toLowerCase()}:${formatLinuxPath(currentPath)}${isSudo ? '#' : '$'}`;

  // 0. Handle Logical Operators (&& and ||)
  if ((cleanCmd.includes('&&') || cleanCmd.includes('||')) && !params.silent) {
    const chain = parseLogicalChain(cleanCmd);
    if (chain.length > 1) {
      addLocalOutput('command', rawCmd, linuxPrompt);
      let lastSuccess = true;
      for (const stage of chain) {
        if (!stage.command) continue;
        let stageFailed = false;
        const stageAddOutput = (type: OutputLine['type'], content: string, prompt?: string) => {
          if (type === 'error') stageFailed = true;
          addLocalOutput(type, content, prompt);
        };
        await executeLinuxCommand(stage.command, {
          ...params,
          executionDeadline,
          silent: true,
          addLocalOutput: stageAddOutput
        });

        lastSuccess = !stageFailed;
        if (stage.operator === '&&' && !lastSuccess) {
          break;
        }
        if (stage.operator === '||' && lastSuccess) {
          break;
        }
      }
      return;
    }
  }

  // 1. Handle Pipe (|) Pipelines (e.g. ifconfig | grep inet, cat file.txt | grep -i test | wc -l)
  if (cleanCmd.includes('|') && !params.silent) {
    const pipeline = splitPipeline(cleanCmd);
    if (pipeline.length > 1) {
      addLocalOutput('command', rawCmd, linuxPrompt);
      let pipeData = '';

      for (let i = 0; i < pipeline.length; i++) {
        const stageCmd = pipeline[i];
        let stageOutput = '';
        let stageError = '';

        const stageAddOutput = (type: OutputLine['type'], content: string) => {
          if (type === 'error') stageError += (stageError ? '\n' : '') + content;
          else stageOutput += (stageOutput ? '\n' : '') + content;
        };

        const stageParts = splitShellWords(stageCmd);
        const stageName = stageParts[0].toLowerCase();
        const stageArgs = stageParts.slice(1);

        if (stageName === 'grep') {
          const { isCaseInsensitive, isInvert, isLineNumbers, isCountOnly, nonFlags } = parseGrepFlags(stageArgs);
          const patternArg = nonFlags[0] || '';
          const cleanPattern = patternArg.replace(/^["']|["']$/g, '');

          if (!cleanPattern) {
            stageError = 'grep: option requires an argument';
          } else {
            const lines = pipeData.split(/\r?\n/);
            let regex: RegExp;
            try {
              if (isUnsafeRegexPattern(cleanPattern)) throw new Error('unsafe pattern');
              regex = new RegExp(cleanPattern, isCaseInsensitive ? 'i' : '');
            }
            catch { stageError = `grep: invalid regular expression: ${cleanPattern}`; regex = /$a/; }

            const matched: string[] = [];
            lines.forEach((line, idx) => {
              const pass = isInvert ? !regex.test(line) : regex.test(line);
              if (pass) {
                matched.push(isLineNumbers ? `${idx + 1}:${line}` : line);
              }
            });

            if (isCountOnly) {
              stageOutput = matched.length.toString();
            } else {
              stageOutput = matched.join('\n');
            }
          }
        } else if (stageName === 'wc') {
          const lines = pipeData.split(/\r?\n/).filter(l => l.length > 0 || pipeData.includes('\n'));
          if (stageArgs.includes('-l')) {
            stageOutput = lines.length.toString();
          } else {
            const words = pipeData.split(/\s+/).filter(Boolean).length;
            const bytes = pipeData.length;
            stageOutput = `  ${lines.length}  ${words}  ${bytes}`;
          }
        } else {
          await executeLinuxCommand(stageCmd, {
            ...params,
            executionDeadline,
            silent: true,
            addLocalOutput: stageAddOutput
          });
        }

        if (stageError) {
          addLocalOutput('error', stageError);
        }
        pipeData = stageOutput;
      }

      if (pipeData !== '') {
        addLocalOutput('output', pipeData);
      }
      return;
    }
  }

  // 2. Handle Output Redirection (> and >>)
  const redirection = parseOutputRedirection(cleanCmd);
  if (redirection && !cleanCmd.startsWith('echo ')) {
    const targetCmdStr = redirection.command;
    const targetFileArg = redirection.target;
    const isAppend = redirection.operator === '>>';

    if (targetCmdStr && targetFileArg) {
      if (!params.silent) {
        addLocalOutput('command', rawCmd, linuxPrompt);
      }
      let capturedOut = '';
      let capturedErr = '';
      const redirectAddOutput = (type: OutputLine['type'], content: string) => {
        if (type === 'error') capturedErr += (capturedErr ? '\n' : '') + content;
        else capturedOut += (capturedOut ? '\n' : '') + content;
      };

      await executeLinuxCommand(targetCmdStr, {
        ...params,
        executionDeadline,
        silent: true,
        addLocalOutput: redirectAddOutput
      });

      if (capturedErr) {
        addLocalOutput('error', capturedErr);
        return;
      }

      const fs = loadFs(deviceId);
      const targetPath = resolvePath(currentPath, targetFileArg);
      const existingContent = isAppend ? (readFile(fs, targetPath) || '') : '';
      const newContent = isAppend ? (existingContent ? `${existingContent}\n${capturedOut}` : capturedOut) : capturedOut;
      writeFile(fs, targetPath, newContent);
      saveFs(deviceId, fs);
      return;
    }
  }

  // Log command entry
  if (!params.silent) {
    addLocalOutput('command', rawCmd, linuxPrompt);
  }

  if (command === 'clear') {
    setLinuxOutput([]);
    return;
  }

  // Shell variable assignment
  const assignment = parseShellAssignment(cleanCmd);
  if (assignment) {
    setShellVariable(deviceId, assignment.name, assignment.value);
    return;
  }

  if (command === 'export') {
    const exportArg = args[0] || '';
    const exportMatch = parseShellAssignment(exportArg);
    if (exportMatch) {
      setShellVariable(deviceId, exportMatch.name, exportMatch.value);
    }
    return;
  }

  // Handle Bash For Loops
  if (cleanCmd.startsWith('for ')) {
    const forMatch = cleanCmd.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+(.+?)\s*;\s*do\s+(.+?)\s*;\s*done$/i)
      || cleanCmd.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+(.+?)\s*\n\s*do\s*\n\s*(.+?)\s*\n\s*done$/i);

    if (forMatch) {
      const varName = forMatch[1];
      const itemsRaw = forMatch[2].trim();
      const loopBody = forMatch[3].trim();

      let items: string[] = [];
      const rangeMatch = itemsRaw.match(/^\{(\d+)\.\.(\d+)\}$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        for (let n = start; n <= end; n++) items.push(n.toString());
      } else {
        items = itemsRaw.split(/\s+/).filter(Boolean);
      }

      const loopStartTime = Date.now();
      const timeoutMs = 3000;

      for (const item of items) {
        checkExecutionTimeout();
        if (Date.now() - loopStartTime > timeoutMs) {
          addLocalOutput('error', 'bash: loop terminated: execution timed out (exceeded 3s limit)');
          return;
        }
        const subCmd = loopBody.replace(new RegExp(`\\$${varName}\\b|\\$\\{${varName}\\}`, 'g'), item);
        await executeLinuxCommand(subCmd, { ...params, executionDeadline, silent: false });
      }
      return;
    }
  }

  // Handle Bash While Loops
  if (cleanCmd.startsWith('while ')) {
    const whileMatch = cleanCmd.match(/^while\s+(.+?)\s*;\s*do\s+(.+?)\s*;\s*done$/i)
      || cleanCmd.match(/^while\s+(.+?)\s*\n\s*do\s*\n\s*(.+?)\s*\n\s*done$/i);

    if (whileMatch) {
      const rawCondition = whileMatch[1].trim();
      const loopBody = whileMatch[2].trim();

      const loopStartTime = Date.now();
      const timeoutMs = 3000;
      let iterations = 0;
      const maxIterations = 5000;

      const evalBashCond = (condStr: string): boolean => {
        let c = condStr.trim();
        if (c.startsWith('[') && c.endsWith(']')) {
          c = c.slice(1, -1).trim();
        }
        if (c === 'true' || c === '1' || c === ':') return true;
        if (c === 'false' || c === '0' || !c) return false;
        const eqMatch = c.match(/^"?(.*?)"?\s*(==|=|!=)\s*"?(.*?)"?$/);
        if (eqMatch) {
          return eqMatch[2] === '!=' ? eqMatch[1] !== eqMatch[3] : eqMatch[1] === eqMatch[3];
        }
        return true;
      };

      while (evalBashCond(rawCondition)) {
        iterations++;
        checkExecutionTimeout();
        if (Date.now() - loopStartTime > timeoutMs || iterations > maxIterations) {
          addLocalOutput('error', 'bash: loop terminated: execution timed out (exceeded 3s limit)');
          return;
        }
        await executeLinuxCommand(loopBody, { ...params, executionDeadline, silent: false });
      }
      return;
    }
  }

  // Handle Bash If Conditionals
  if (cleanCmd.startsWith('if ')) {
    const ifMatch = cleanCmd.match(/^if\s+\[\s*(.+?)\s*\]\s*;\s*then\s+(.+?)(?:\s*;\s*elif\s+\[\s*(.+?)\s*\]\s*;\s*then\s+(.+?))?(?:\s*;\s*else\s+(.+?))?\s*;\s*fi$/i);
    if (ifMatch) {
      const cond = ifMatch[1].trim();
      const thenBody = ifMatch[2].trim();
      const elifCond = ifMatch[3]?.trim();
      const elifBody = ifMatch[4]?.trim();
      const elseBody = ifMatch[5]?.trim();

      let condResult = false;
      const eqMatch = cond.match(/^"?(.*?)"?\s*(==|=|!=)\s*"?(.*?)"?$/);
      if (eqMatch) {
        const left = eqMatch[1];
        const op = eqMatch[2];
        const right = eqMatch[3];
        if (op === '=' || op === '==') condResult = left === right;
        else if (op === '!=') condResult = left !== right;
      } else if (cond) {
        condResult = cond !== '0' && cond !== 'false';
      }

      let targetCmd = condResult ? thenBody : undefined;
      if (!targetCmd && elifCond) {
        const elifEq = elifCond.match(/^"?(.*?)"?\s*(==|=|!=)\s*"?(.*?)"?$/);
        const elifResult = elifEq ? (elifEq[2] === '!=' ? elifEq[1] !== elifEq[3] : elifEq[1] === elifEq[3]) : elifCond !== '0' && elifCond !== 'false';
        targetCmd = elifResult ? elifBody : elseBody;
      } else if (!targetCmd) targetCmd = elseBody;
      if (targetCmd) {
        await executeLinuxCommand(targetCmd, { ...params, executionDeadline, silent: false });
      }
      return;
    }
  }

  if (command === 'help') {
    const helpText =
      `These shell commands are defined internally. Type 'help' to see this list.

  File System Commands:
    ls [-l] [-la]     List directory contents (long format, hidden files)
    pwd               Print current working directory
    cd <dir>          Change directory (e.g. cd ~, cd .., cd upload)
    cat <file>        Display content of a file
    nano / vim <file> Open file in Notepad text editor
    touch <file>      Create an empty file
    mkdir <dir>       Create a new directory
    rm <file>         Remove file or directory
    cp <src> <dest>   Copy file
    mv <src> <dest>   Move or rename file
    chmod <mode> <f>  Change file mode permissions (e.g. chmod +x, 755)
    grep [-i] [-c]    Search pattern in file or stream (e.g. grep inet, cat f | grep -i test)
    cmd > file        Redirect command output to file (overwrites or >> appends)
    cmd1 | cmd2       Pipe output from cmd1 as input to cmd2 (e.g. ifconfig | grep inet)
    echo "text" > f   Write or append (>>) text to file

  Network Commands:
    ifconfig / ip a   Display network interfaces & IP configurations
    dhclient eth0     Renew DHCP lease
    dhclient -r eth0  Release DHCP lease
    ip route          Display IP routing table
    ping <host>       Send ICMP Echo requests to target IP/hostname
    traceroute <host> Trace network packet route to destination
    nslookup <domain> Perform DNS lookup for domain name
    netstat / arp     Display network statistics & ARP cache
    ftp <server>      Connect to remote FTP server
    ssh <user@host>   Connect securely to remote host via SSH
    telnet <host>     Connect to remote host via Telnet

  System & Execution:
    whoami            Display current user
    hostname <name>   Display or change system hostname (e.g. hostname aa)
    uname [-a]        Print system kernel & OS information
    date / uptime     Print current date & system uptime / load
    history           Display list of previously executed commands
    for i in ...; do  Bash for loop execution (e.g. for i in 1 2 3; do ping -n 1 192.168.1.$i; done)
    if [ cond ]; then Bash conditional branching execution (if/elif/else)
    python3 <file.py> Execute Python script on PC file system
    clear             Clear terminal screen output`;
    addLocalOutput('output', helpText);
    return;
  }

  if (command === 'whoami') {
    addLocalOutput('output', isSudo ? 'root' : 'user');
    return;
  }

  if (command === 'nano' || command === 'vim' || command === 'vi' || command === 'notepad') {
    const rawFileName = args.join(' ').trim();
    const fileName = rawFileName || 'new_file.txt';
    const fs = loadFs(deviceId);
    const targetPath = resolvePath(currentPath, fileName);
    const existingContent = rawFileName ? (readFile(fs, targetPath) ?? '') : '';
    if (setEditingFile) {
      setEditingFile({ path: targetPath, content: existingContent });
    }
    addLocalOutput('output', rawFileName ? `Opening text editor for ${fileName}...` : `Opening empty text editor (${fileName})...`);
    return;
  }

  if (command === 'hostname' || command === 'hostnamectl') {
    const targetName = command === 'hostnamectl' && args[0] === 'set-hostname' ? args[1] : args[0];
    if (targetName) {
      const newHostname = targetName.trim().slice(0, 20);
      if (setPcHostname) {
        setPcHostname(newHostname);
      }
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
    return;
  }

  if (command === 'uname') {
    if (args.includes('-a')) {
      addLocalOutput('output', `Linux ${internalPcHostname.toLowerCase()}`);
    } else {
      addLocalOutput('output', 'Linux');
    }
    return;
  }

  if (command === 'pwd') {
    addLocalOutput('output', formatWinToUnixPath(currentPath));
    return;
  }

  if (command === 'history') {
    const historyList = params.linuxHistory || [];
    if (historyList.length === 0) {
      addLocalOutput('output', '   1  history');
    } else {
      const formatted = [...historyList].reverse().map((hCmd, idx) => ` ${(idx + 1).toString().padStart(4)}  ${hCmd}`).join('\n');
      addLocalOutput('output', formatted);
    }
    return;
  }

  if (command === 'chmod' || command === 'chown') {
    if (args.length < 2) {
      addLocalOutput('error', `${command}: missing operand`);
      return;
    }
    const modeOrOwner = args[0];
    const targetFile = args[1];
    const fs = loadFs(deviceId);
    const targetPath = resolvePath(currentPath, targetFile);
    const node = getNode(fs, targetPath);
    if (!node) {
      addLocalOutput('error', `${command}: cannot access '${targetFile}': No such file or directory`);
      return;
    }

    if (command === 'chmod' && node.type === 'file') {
      const isGrantingX = modeOrOwner.includes('+x') || modeOrOwner === '755' || modeOrOwner === '777' || modeOrOwner === '700' || modeOrOwner === '750';
      const isRemovingX = modeOrOwner.includes('-x') || modeOrOwner === '644' || modeOrOwner === '600' || modeOrOwner === '400';
      if (isGrantingX) {
        node.isExecutable = true;
        saveFs(deviceId, fs);
      } else if (isRemovingX) {
        node.isExecutable = false;
        saveFs(deviceId, fs);
      }
    }
    addLocalOutput('output', '');
    return;
  }

  if (command === 'date') {
    const ntpNow = params.getNtpNow ? params.getNtpNow() : null;
    const now = ntpNow && !Number.isNaN(ntpNow.getTime()) ? ntpNow : new Date();

    if (args.includes('-u') || args.includes('--utc')) {
      addLocalOutput('output', now.toUTCString());
    } else {
      addLocalOutput('output', now.toString());
    }
    return;
  }

  if (command === 'uptime') {
    const ntpNow = params.getNtpNow ? params.getNtpNow() : null;
    const now = ntpNow && !Number.isNaN(ntpNow.getTime()) ? ntpNow : new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
    addLocalOutput('output', ` ${timeStr} up 2:15,  1 user,  load average: 0.04, 0.03, 0.00`);
    return;
  }

  if (executeLinuxFileCommand(command, args, {
    deviceId,
    currentPath,
    setCurrentPath,
    addLocalOutput,
  })) {
    return;
  }

  // Execute Shell / Bash / Direct executable scripts
  if (command === 'bash' || command === 'sh' || command.startsWith('./') || command.startsWith('.\\')) {
    const scriptArg = (command === 'bash' || command === 'sh') ? args[0] : command;
    if (!scriptArg) {
      addLocalOutput('output', `bash`);
      return;
    }

    const fs = loadFs(deviceId);
    const scriptPath = resolvePath(currentPath, scriptArg);
    const node = getNode(fs, scriptPath);

    if (!node) {
      addLocalOutput('error', `bash: ${scriptArg}: No such file or directory`);
      return;
    }

    if (node.type === 'dir') {
      addLocalOutput('error', `bash: ${scriptArg}: Is a directory`);
      return;
    }

    const isDirectExec = command.startsWith('./') || command.startsWith('.\\');
    if (isDirectExec && !isSudo) {
      const hasExecPerm = node.isExecutable !== undefined ? node.isExecutable : (scriptArg.endsWith('.sh') || scriptArg.endsWith('.py'));
      if (!hasExecPerm) {
        addLocalOutput('error', `bash: ${scriptArg}: Permission denied`);
        return;
      }
    }

    const content = node.content.trim();
    if (!content) return;

    const isPython = scriptArg.endsWith('.py') || content.startsWith('#!/usr/bin/env python') || content.startsWith('#!/usr/bin/python');
    if (isPython) {
      const pyArgs = [scriptArg, ...(command === 'bash' || command === 'sh' ? args.slice(1) : args)];
      const pyExecRes = executePythonScript(content, [], undefined, deviceId, pyArgs, Math.max(1, executionDeadline - Date.now()));
      if (pyExecRes.error) addLocalOutput('error', pyExecRes.error);
      else if (pyExecRes.output) addLocalOutput('output', pyExecRes.output);
      return;
    }

    const lines: string[] = [];
    let pending = '';
    for (const sourceLine of content.split(/\r?\n/)) {
      const line = sourceLine.trim();
      if (line.endsWith('\\')) pending += line.slice(0, -1) + ' ';
      else { lines.push(pending + line); pending = ''; }
    }
    if (pending) lines.push(pending);
    for (const line of lines) {
      checkExecutionTimeout();
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      await executeLinuxCommand(trimmedLine, params);
    }
    return;
  }

  // Execute Python scripts
  if (command === 'python' || command === 'python3') {
    const scriptArg = args[0];
    if (!scriptArg) {
      addLocalOutput('output', `Python (main)\nType "exit()" or "quit()" for interactive python.`);
      return;
    }
    if (scriptArg === '-c') {
      const codeToRun = args.slice(1).join(' ').replace(/^["']|["']$/g, '');
      const pyCmdRes = executePythonScript(codeToRun, [], undefined, deviceId, ['-c'], Math.max(1, executionDeadline - Date.now()));
      if (pyCmdRes.error) addLocalOutput('error', pyCmdRes.error);
      else if (pyCmdRes.output) addLocalOutput('output', pyCmdRes.output);
      return;
    }

    const fs = loadFs(deviceId);
    const scriptPath = resolvePath(currentPath, scriptArg);
    const scriptContent = readFile(fs, scriptPath);
    if (scriptContent !== null) {
      const pyFileRes = executePythonScript(scriptContent, [], undefined, deviceId, args, Math.max(1, executionDeadline - Date.now()));
      if (pyFileRes.error) addLocalOutput('error', pyFileRes.error);
      else if (pyFileRes.output) addLocalOutput('output', pyFileRes.output);
    } else {
      addLocalOutput('error', `python: can't open file '${scriptArg}': No such file or directory`);
    }
    return;
  }

  // Network commands delegation
  const handledNetwork = await executeLinuxNetworkCommand(command, args, cleanCmd, params);
  if (handledNetwork) return;

  // Command not recognized
  addLocalOutput('error', `bash: ${command}: command not found`);
}
