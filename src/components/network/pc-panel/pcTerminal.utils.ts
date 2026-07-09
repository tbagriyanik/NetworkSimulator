import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { SwitchState, Port } from '@/lib/network/types';
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
  return topologyDevices.find(d => d.id === otherId && ((d.type === 'switchL2' || d.type === 'switchL3') || d.type === 'router')) || null;
}

export function getAutocompleteSuggestions({
  value,
  activeTab,
  topologyDevices,
  deviceStates,
  getCommandMode,
}: {
  value: string;
  activeTab: 'desktop' | 'terminal' | string;
  topologyDevices: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
  getCommandMode: () => string;
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
    const base = DESKTOP_COMMANDS
      .filter((cmd) => cmd !== '?' && cmd.startsWith(currentWord))
      .slice(0, 8);
    if (!expectsIpArg) return base;
    const ipSuggestions = collectKnownIps().filter((ip) => ip.toLowerCase().startsWith(currentWord));
    return Array.from(new Set([...ipSuggestions, ...base])).slice(0, 8);
  }

  const mode = getCommandMode();
  const { candidates, currentWord: ctxCurrentWord } = expandCommandContext(mode, value);
  const suggestions = candidates.filter(
    (opt: string) => opt !== '?' && opt.toLowerCase().startsWith(ctxCurrentWord)
  );
  if (!expectsIpArg) return suggestions.slice(0, 8);
  const ipSuggestions = collectKnownIps().filter((ip) => ip.toLowerCase().startsWith(ctxCurrentWord || currentWord));
  return Array.from(new Set([...ipSuggestions, ...suggestions])).slice(0, 8);
}
