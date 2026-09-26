import { loadFs, getNode, resolvePath } from '../pcFileSystem';

export const LINUX_SUGGESTIONS = [
  'ls', 'ls -l', 'ls -la', 'pwd', 'cd', 'cat', 'touch', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'grep', 'wc', 'nano', 'vim', 'vi', 'notepad',
  'ifconfig', 'ip addr', 'dhclient', 'dhclient -r eth0', 'ping', 'traceroute', 'nslookup', 'netstat', 'arp', 'ftp', 'ssh', 'telnet', 'curl', 'wget',
  'whoami', 'hostname', 'hostnamectl', 'uname -a', 'clear', 'history', 'echo', 'sudo', 'help', 'date', 'uptime',
  'for', 'while', 'if', 'python3', 'python'
];

export const FILE_COMMANDS = new Set([
  'cd', 'ls', 'dir', 'cat', 'touch', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'nano', 'vim', 'vi', 'notepad', 'python', 'python3', 'sh', 'bash'
]);

export function getLinuxSuggestions(
  inputVal: string,
  currentPath: string,
  deviceId: string
): string[] {
  const trimmed = inputVal.trimStart();
  const parts = trimmed.split(/\s+/);

  // If typing the command itself (no trailing space yet)
  if (parts.length <= 1 && !inputVal.endsWith(' ')) {
    const typed = parts[0] || '';
    if (!typed) return [];
    return LINUX_SUGGESTIONS.filter(s => s.toLowerCase().startsWith(typed.toLowerCase()));
  }

  const command = parts[0].toLowerCase();
  let effectiveCmd = command;

  // Handle sudo subcommands
  if (command === 'sudo') {
    const subCmd = parts[1]?.toLowerCase();
    if (!subCmd || (parts.length === 2 && !inputVal.endsWith(' '))) {
      const typed = subCmd || '';
      return LINUX_SUGGESTIONS.filter(s => s.toLowerCase().startsWith(typed.toLowerCase()) && s !== 'sudo');
    }
    effectiveCmd = subCmd;
    if (!FILE_COMMANDS.has(subCmd)) {
      return [];
    }
  } else if (!FILE_COMMANDS.has(command)) {
    return [];
  }

  // Determine last argument being typed
  const lastArg = inputVal.endsWith(' ') ? '' : (parts[parts.length - 1] || '');

  // If typing option flags (e.g. -l, -la), offer flag suggestions for ls
  if (lastArg.startsWith('-')) {
    if (effectiveCmd === 'ls') {
      const flags = ['-l', '-la', '-a', '-lh', '-t', '-r', '-S'];
      return flags.filter(f => f.startsWith(lastArg));
    }
    return [];
  }

  // Separate path directory prefix from current filename search query
  let dirPrefix = '';
  let searchPrefix = lastArg;
  let targetSearchDir = currentPath;

  const lastSlashIdx = Math.max(lastArg.lastIndexOf('/'), lastArg.lastIndexOf('\\'));
  if (lastSlashIdx !== -1) {
    dirPrefix = lastArg.substring(0, lastSlashIdx + 1);
    searchPrefix = lastArg.substring(lastSlashIdx + 1);
    const relDir = lastArg.substring(0, lastSlashIdx);
    targetSearchDir = resolvePath(currentPath, relDir);
  }

  const fs = loadFs(deviceId);
  const dirNode = getNode(fs, targetSearchDir);
  if (!dirNode || dirNode.type !== 'dir') return [];

  const isDirOnlyCmd = ['cd', 'chdir', 'mkdir', 'rmdir'].includes(effectiveCmd);
  const candidates: string[] = [];

  Object.entries(dirNode.children).forEach(([name, child]) => {
    if (name.toLowerCase().startsWith(searchPrefix.toLowerCase())) {
      const isDir = child.type === 'dir';
      if (isDir) {
        candidates.push(dirPrefix + name + '/');
      } else if (!isDirOnlyCmd) {
        candidates.push(dirPrefix + name);
      }
    }
  });

  return candidates;
}
