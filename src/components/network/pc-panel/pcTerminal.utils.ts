import { loadFs, listDir, isDir, resolvePath } from './pcFileSystem';
import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState, Port } from '@/lib/network/types';
import { expandCommandContext, DESKTOP_COMMANDS } from '../pcPanel.utils';

export function getConsoleDevice({
  deviceId,
  topologyDevices,
  topologyConnections,
}: {
  deviceId: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
}): CanvasDevice | null {
  if (!topologyConnections || !deviceId) return null;
  const connection = topologyConnections.find(conn => {
    if (conn.cableType !== 'console' || conn.active === false) return false;
    const isSource = conn.sourceDeviceId === deviceId;
    const isTarget = conn.targetDeviceId === deviceId;
    if (isSource) {
      const port = conn.sourcePort.toLowerCase();
      return port.startsWith('com') || port === 'console' || port === 'rs232';
    }
    if (isTarget) {
      const port = conn.targetPort.toLowerCase();
      return port.startsWith('com') || port === 'console' || port === 'rs232';
    }
    return false;
  });
  if (!connection) return null;
  const otherId = connection.sourceDeviceId === deviceId ? connection.targetDeviceId : connection.sourceDeviceId;
  return topologyDevices.find(d => d.id === otherId && (d.type === 'switchL2' || d.type === 'switchL3' || d.type === 'router' || d.type === 'wlc' || d.type === 'firewall')) || null;
}

export function getAutocompleteSuggestions({
  value,
  activeTab,
  topologyDevices,
  deviceStates,
  getCommandMode,
  deviceId,
  currentPath,
}: {
  value: string;
  activeTab: 'desktop' | 'terminal' | string;
  topologyDevices: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
  getCommandMode: () => string;
  deviceId?: string;
  currentPath?: string;
}): string[] {
  const isIpv4 = (raw: string) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(raw);
  const collectKnownIps = () => {
    const fromDevices = (topologyDevices || [])
      .map((d) => d.ip)
      .filter((ip): ip is string => !!ip && isIpv4(ip) && ip !== '0.0.0.0' && ip !== '169.254.0.0');
    const fromStates = Array.from(deviceStates?.values() || [])
      .flatMap((s) => Object.values(s.ports || {}).map((p: Port) => (p as { ipAddress?: string }).ipAddress))
      .filter((ip): ip is string => !!ip && isIpv4(ip) && ip !== '0.0.0.0' && ip !== '169.254.0.0');
    return Array.from(new Set([...fromDevices, ...fromStates]));
  };

  const trimmed = value.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const currentWord = value.endsWith(' ') ? '' : (tokens[tokens.length - 1] || '').toLowerCase();
  const expectsIpArg = /^(?:telnet|ssh|ping|curl|wget|ip\s+default-gateway|default-router|dns-server)\s+\S*$/i.test(trimmed)
    || /^(?:telnet|ssh|ping|curl|wget|ip\s+default-gateway|default-router|dns-server)\s*$/i.test(trimmed);

  if (activeTab === 'desktop') {
    const trimmedVal = value.trimStart();
    const parts = trimmedVal.split(/\s+/);
    const firstCmd = parts[0]?.toLowerCase() || '';
    const fileCmds = ['python', 'py', 'python3', 'edit', 'notepad', 'del', 'delete', 'type', 'dir', 'cd', 'chdir', 'rd', 'rmdir', 'md', 'mkdir', 'copy', 'move', 'ren', 'rename', 'call'];
    const isFileCmd = fileCmds.includes(firstCmd);
    const hasSpaceAfterCmd = value.includes(' ');

    if (isFileCmd && hasSpaceAfterCmd && deviceId) {
      const rawArg = value.endsWith(' ') ? '' : (parts[parts.length - 1] || '');
      const fs = loadFs(deviceId);

      let dirPrefix = '';
      let searchPrefix = rawArg;
      let searchDir = currentPath || 'C:\\';

      const lastSlash = Math.max(rawArg.lastIndexOf('/'), rawArg.lastIndexOf('\\'));
      if (lastSlash !== -1) {
        dirPrefix = rawArg.substring(0, lastSlash + 1);
        searchPrefix = rawArg.substring(lastSlash + 1);
        searchDir = resolvePath(currentPath || 'C:\\', rawArg.substring(0, lastSlash));
      }

      if (isDir(fs, searchDir)) {
        const entries = listDir(fs, searchDir);
        const isDirOnly = ['cd', 'chdir', 'rd', 'rmdir'].includes(firstCmd);

        const filtered = entries.filter(entry => {
          const entryPath = resolvePath(searchDir, entry);
          if (isDirOnly && !isDir(fs, entryPath)) return false;
          return entry.toLowerCase().startsWith(searchPrefix.toLowerCase());
        });

        const fileSuggestions = filtered.map(entry => {
          const entryPath = resolvePath(searchDir, entry);
          const trailing = isDir(fs, entryPath) ? '/' : '';
          return `${dirPrefix}${entry}${trailing}`;
        });

        if (fileSuggestions.length > 0) {
          return fileSuggestions.slice(0, 8);
        }
      }
    }

    const batSuggestions: string[] = [];
    if (deviceId && !hasSpaceAfterCmd && currentWord) {
      const fs = loadFs(deviceId);
      const searchDir = currentPath || 'C:\\';
      if (isDir(fs, searchDir)) {
        const entries = listDir(fs, searchDir);
        for (const entry of entries) {
          if (/\.(bat|cmd)$/i.test(entry) && entry.toLowerCase().startsWith(currentWord)) {
            batSuggestions.push(entry);
          }
        }
      }
    }

    const base = Array.from(new Set([
      ...batSuggestions,
      ...DESKTOP_COMMANDS.filter((cmd) => cmd !== '?' && cmd.startsWith(currentWord))
    ])).slice(0, 8);
    const ipSuggestions = collectKnownIps().filter((ip) => ip.toLowerCase().startsWith(currentWord));
    if (expectsIpArg && ipSuggestions.length > 0) return ipSuggestions.slice(0, 8);
    return base;
  }

  const mode = getCommandMode();
  const { candidates, currentWord: ctxCurrentWord } = expandCommandContext(mode, value);
  const suggestions = candidates.filter(
    (opt: string) => opt !== '?' && opt.toLowerCase().startsWith(ctxCurrentWord)
  );
  const ipSuggestions = collectKnownIps().filter((ip) => ip.toLowerCase().startsWith(ctxCurrentWord || currentWord));
  if (expectsIpArg && ipSuggestions.length > 0) return ipSuggestions.slice(0, 8);
  return suggestions.slice(0, 8);
}


