/**
 * Best-effort config-text importer used by `copy tftp://... running-config`.
 *
 * Real IOS *merges* the fetched file into the running configuration rather than
 * replacing it wholesale. This importer follows the same semantics: the
 * directives produced by buildRunningConfig() (hostname, vlans, interface
 * blocks, ip routing, security, banners...) are applied on top of the existing
 * device state, and any line we do not recognize is skipped silently. State
 * that the file never mentions (e.g. ports not present in the config) is left
 * untouched.
 */
import type { SwitchState, Port, Vlan } from '../types';
import { normalizePortId } from '../portUtils';

/** Names that are valid "mode" keywords inside an interface block. */
const SWITCHPORT_MODES: ReadonlyArray<string> = ['access', 'trunk', 'dynamic auto', 'dynamic-auto'];

function parseBanner(line: string): string | undefined {
  // banner motd #text# (delimiter is the first non-space char after "banner motd ")
  const rest = line.replace(/^banner\s+motd\s+/i, '');
  if (!rest) return undefined;
  const delim = rest[0];
  const endIdx = rest.lastIndexOf(delim);
  if (endIdx > 0) {
    return rest.slice(1, endIdx).replace(/\\n/g, '\n');
  }
  return rest.slice(1);
}

function resolvePortKey(rawName: string): string | null {
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase().replace(/\s+/g, '');
  if (/^vlan\d+$/.test(lower)) return lower;
  return normalizePortId(trimmed) || (lower ? lower : null);
}

export interface ConfigImportResult {
  patch: Partial<SwitchState>;
  errors: string[];
}

export function importConfigWithDiagnostics(state: SwitchState, text: string): ConfigImportResult {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  const ports: Record<string, Port> = { ...state.ports };
  const vlans: Record<string, Vlan> = { ...state.vlans };
  const dirtyPorts = new Set<string>();

  let hostname: string | undefined;
  let securityChanged = false;
  let security = state.security ? { ...state.security } : undefined;
  let bannerMotd: string | undefined;
  let ipRouting: boolean | undefined;
  let ipv6Enabled: boolean | undefined;
  let spanningTreeMode: SwitchState['spanningTreeMode'];
  let vlanChanged = false;

  let currentPortKey: string | null = null;
  let currentVlanId: number | null = null;
  let pendingVlanName = false;

  const portFor = (key: string): Port | null => {
    const existing = ports[key];
    if (!existing) return null;
    if (!dirtyPorts.has(key)) {
      dirtyPorts.add(key);
      ports[key] = { ...existing };
    }
    return ports[key];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '!' || line.startsWith('!')) {
      if (line === '!' || line.startsWith('!')) {
        currentPortKey = null;
        currentVlanId = null;
      }
      continue;
    }
    const isTopLevel = rawLine === line; // no leading whitespace
    const lower = line.toLowerCase();

    if (isTopLevel) {
      // Top-level directive
      currentPortKey = null;
      currentVlanId = null;
      pendingVlanName = false;

      if (lower.startsWith('hostname ')) {
        hostname = line.slice('hostname '.length).trim();
        continue;
      }
      if (lower === 'service password-encryption') {
        if (security) {
          security = { ...security, servicePasswordEncryption: true };
          securityChanged = true;
        }
        continue;
      }
      if (lower === 'no service password-encryption') {
        if (security && security.servicePasswordEncryption) {
          security = { ...security, servicePasswordEncryption: false };
          securityChanged = true;
        }
        continue;
      }
      if (lower.startsWith('enable secret ')) {
        if (security) {
          const body = line.slice('enable secret '.length).trim();
          const [_levelOrHash, ...rest] = body.split(/\s+/);
          if (rest.length > 0) {
            // 'enable secret 5 <hash>' -> encrypted; 'enable secret 0 <pw>' -> plain
            security = { ...security, enableSecret: rest.join(' '), enableSecretEncrypted: _levelOrHash === '5' };
          } else {
            security = { ...security, enableSecret: body, enableSecretEncrypted: false };
          }
          securityChanged = true;
        }
        continue;
      }
      if (lower.startsWith('enable password ')) {
        if (security) {
          const body = line.slice('enable password '.length).trim();
          security = { ...security, enablePassword: body };
          securityChanged = true;
        }
        continue;
      }
      if (lower.startsWith('banner motd ')) {
        const parsed = parseBanner(line);
        if (parsed !== undefined) bannerMotd = parsed;
        continue;
      }
      if (lower === 'ip routing') {
        ipRouting = true;
        continue;
      }
      if (lower === 'no ip routing') {
        ipRouting = false;
        continue;
      }
      if (lower === 'ipv6 unicast-routing') {
        ipv6Enabled = true;
        continue;
      }
      if (lower === 'no ipv6 unicast-routing') {
        ipv6Enabled = false;
        continue;
      }
      if (lower.startsWith('spanning-tree mode ')) {
        const mode = lower.split(/\s+/)[2];
        if (mode === 'mst' || mode === 'pvst' || mode === 'rapid-pvst') {
          spanningTreeMode = mode;
        }
        continue;
      }

      const vlanMatch = lower.match(/^vlan\s+(\d+)$/);
      if (vlanMatch) {
        const id = parseInt(vlanMatch[1], 10);
        currentVlanId = id;
        pendingVlanName = true;
        if (id !== 1 && !vlans[id]) {
          vlans[id] = { id, name: `VLAN${id}`, status: 'active', ports: [] };
          vlanChanged = true;
        }
        continue;
      }

      const ifMatch = lower.match(/^interface\s+(.+)$/);
      if (ifMatch) {
        currentPortKey = resolvePortKey(ifMatch[1]);
        continue;
      }

      // Unknown top-level directive (acl, route-map, line config...) -> skip
      continue;
    }

    // Indented line -> sub-command of the current context.
    if (currentPortKey !== null) {
      const port = portFor(currentPortKey);
      if (!port) continue;

      if (lower.startsWith('description ')) {
        port.description = line.slice('description '.length).trim();
      } else if (lower === 'shutdown') {
        port.shutdown = true;
      } else if (lower === 'no shutdown') {
        port.shutdown = false;
      } else if (lower.startsWith('mtu ')) {
        const mtu = parseInt(lower.split(/\s+/)[1], 10);
        if (!Number.isNaN(mtu) && mtu > 0) port.mtu = mtu;
      } else if (lower.startsWith('speed ')) {
        const value = lower.split(/\s+/)[1];
        if (value && ['auto', '10', '100', '1000', '10000'].includes(value)) {
          port.speed = value as Port['speed'];
        }
      } else if (lower.startsWith('duplex ')) {
        const value = lower.split(/\s+/)[1];
        if (value && ['auto', 'half', 'full'].includes(value)) {
          port.duplex = value as Port['duplex'];
        }
      } else if (lower.startsWith('bandwidth ')) {
        const bw = parseInt(lower.split(/\s+/)[1], 10);
        if (!Number.isNaN(bw) && bw > 0) port.bandwidth = bw;
      } else if (lower.startsWith('ip address ')) {
        const parts = lower.split(/\s+/);
        if (parts.length >= 4) {
          port.ipAddress = parts[2];
          port.subnetMask = parts[3];
        }
      } else if (lower === 'no ip address') {
        port.ipAddress = undefined;
        port.subnetMask = undefined;
      } else if (lower.startsWith('ipv6 address ')) {
        const parts = lower.split(/\s+/);
        if (parts[2] && parts[3]) {
          port.ipv6Address = parts[2];
          port.ipv6Prefix = parseInt(parts[3], 10);
        }
      } else if (lower === 'no switchport') {
        port.mode = 'routed';
        port.isRoutedPort = true;
      } else if (lower.startsWith('switchport mode ')) {
        const value = lower.slice('switchport mode '.length).trim();
        const normalized = value.includes('dynamic auto') ? 'dynamic-auto' : value;
        if (SWITCHPORT_MODES.includes(normalized)) {
          port.mode = normalized as Port['mode'];
        }
      } else if (lower.startsWith('switchport access vlan ')) {
        const vid = parseInt(lower.split(/\s+/)[3], 10);
        if (!Number.isNaN(vid)) {
          port.accessVlan = vid;
          port.vlan = vid;
        }
      } else if (lower.startsWith('switchport trunk native vlan ')) {
        const vid = parseInt(lower.split(/\s+/)[4], 10);
        if (!Number.isNaN(vid)) {
          port.trunkNativeVlan = vid;
          port.nativeVlan = vid;
        }
      } else if (lower === 'spanning-tree portfast') {
        port.spanningTree = { ...port.spanningTree, portfast: true };
      } else if (lower.startsWith('mac-address ')) {
        port.macAddress = line.slice('mac-address '.length).trim();
      } else if (lower.startsWith('ip access-group ')) {
        const parts = lower.split(/\s+/);
        const name = parts[2];
        if (name) {
          if (parts[3] === 'in') port.accessGroupIn = name;
          else if (parts[3] === 'out') port.accessGroupOut = name;
        }
      }
      continue;
    }

    if (currentVlanId !== null && pendingVlanName && lower.startsWith('name ')) {
      const name = line.slice('name '.length).trim();
      if (name && vlans[currentVlanId]) {
        vlans[currentVlanId] = { ...vlans[currentVlanId], name };
        vlanChanged = true;
      }
      pendingVlanName = false;
      continue;
    }
  }

  const patch: Partial<SwitchState> = {};
  if (hostname !== undefined && hostname !== state.hostname) patch.hostname = hostname;
  if (bannerMotd !== undefined && bannerMotd !== state.bannerMOTD) patch.bannerMOTD = bannerMotd;
  if (ipRouting !== undefined && ipRouting !== !!state.ipRouting) patch.ipRouting = ipRouting;
  if (ipv6Enabled !== undefined && ipv6Enabled !== !!state.ipv6Enabled) patch.ipv6Enabled = ipv6Enabled;
  if (spanningTreeMode !== undefined) patch.spanningTreeMode = spanningTreeMode;
  if (securityChanged && security) patch.security = security;
  if (vlanChanged) patch.vlans = vlans;
  if (dirtyPorts.size > 0) patch.ports = ports;
  return { patch, errors };
}

export function applyConfigText(state: SwitchState, text: string): Partial<SwitchState> {
  return importConfigWithDiagnostics(state, text).patch;
}