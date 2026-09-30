import type { SwitchState } from './types';
import type { Route } from './types/routingTypes';

/**
 * Extracts running configuration from SwitchState into NETCONF data format.
 */
export function extractNetconfConfig(state: SwitchState, path?: string): Record<string, unknown> {
  const normPath = (path || '').toLowerCase().trim();

  const interfaceData: Record<string, unknown> = {};
  for (const [portId, port] of Object.entries(state.ports || {})) {
    interfaceData[portId] = {
      name: port.name || portId,
      ipAddress: port.ipAddress || null,
      subnetMask: port.subnetMask || null,
      shutdown: port.shutdown || false,
      status: port.status || 'down',
      description: port.description || '',
      vlan: port.vlan || 1,
      speed: port.speed || 'auto',
      duplex: port.duplex || 'auto',
    };
  }

  const vlanData: Record<string, unknown> = {};
  for (const [vlanId, vlan] of Object.entries(state.vlans || {})) {
    vlanData[vlanId] = {
      id: vlan.id,
      name: vlan.name,
      status: vlan.status || 'active',
      ports: vlan.ports || [],
    };
  }

  const fullConfig: Record<string, unknown> = {
    hostname: state.hostname,
    domainName: state.domainName || '',
    ipRouting: state.ipRouting,
    interfaces: interfaceData,
    vlans: vlanData,
    staticRoutes: state.staticRoutes || [],
    ntpServers: state.ntpServers || [],
    dnsServer: state.dnsServer || '',
    spanningTreeMode: state.spanningTreeMode || 'pvst',
  };

  if (!normPath || normPath === '/' || normPath === 'native' || normPath === 'config') {
    return fullConfig;
  }

  if (normPath.includes('hostname')) {
    return { hostname: state.hostname };
  }
  if (normPath.includes('interface')) {
    return { interfaces: interfaceData };
  }
  if (normPath.includes('vlan')) {
    return { vlans: vlanData };
  }
  if (normPath.includes('route')) {
    return { staticRoutes: state.staticRoutes || [] };
  }
  if (normPath.includes('ntp')) {
    return { ntpServers: state.ntpServers || [] };
  }

  return fullConfig;
}

/**
 * Extracts operational state (statistics, tables, uptime) from SwitchState into NETCONF format.
 */
export function extractNetconfOperationalState(state: SwitchState, path?: string): Record<string, unknown> {
  const config = extractNetconfConfig(state, path);

  const operState: Record<string, unknown> = {
    ...config,
    system: {
      nosVersion: state.version?.nosVersion || '15.2',
      serialNumber: state.version?.serialNumber || 'SN-UNKNOWN',
      uptime: state.version?.uptime || '0m',
      bootTime: state.bootTime,
    },
    macTable: state.macAddressTable || [],
    arpCache: state.arpCache || [],
  };

  return operState;
}

/**
 * Applies NETCONF edit-config modifications directly to target SwitchState configuration.
 */
export function applyNetconfEditConfig(
  state: SwitchState,
  patch: Record<string, string | number | boolean>,
  _path?: string
): { nextState: SwitchState; modifiedFields: string[] } {
  const staticRoutes: Route[] = state.staticRoutes ? [...state.staticRoutes] : [];
  const ntpServers: string[] = state.ntpServers ? [...state.ntpServers] : [];

  const next: SwitchState = {
    ...state,
    ports: { ...state.ports },
    vlans: { ...state.vlans },
    staticRoutes,
    ntpServers,
    runningConfig: state.runningConfig ? [...state.runningConfig] : [],
  };

  const modifiedFields: string[] = [];

  for (const [key, rawValue] of Object.entries(patch)) {
    const normKey = key.toLowerCase().trim();
    const strVal = String(rawValue);

    if (normKey === 'hostname' || normKey.endsWith('/hostname')) {
      next.hostname = strVal;
      modifiedFields.push('hostname');
    } else if (normKey === 'domainname' || normKey.endsWith('/domainname')) {
      next.domainName = strVal;
      modifiedFields.push('domainName');
    } else if (normKey.includes('dnsserver') || normKey.endsWith('/dnsserver')) {
      next.dnsServer = strVal;
      modifiedFields.push('dnsServer');
    } else {
      const combined = `${_path || ''}/${key}`.toLowerCase();
      const targetPortKey = Object.keys(next.ports || {}).find(
        p => combined.includes(p.toLowerCase()) || combined.includes(p.toLowerCase().replace('/', ''))
      );

      if (targetPortKey && next.ports[targetPortKey]) {
        const portObj = { ...next.ports[targetPortKey] };
        if (normKey.includes('ip') || normKey.includes('address')) {
          portObj.ipAddress = strVal;
          modifiedFields.push(`ports.${targetPortKey}.ipAddress`);
        } else if (normKey.includes('mask') || normKey.includes('subnet')) {
          portObj.subnetMask = strVal;
          modifiedFields.push(`ports.${targetPortKey}.subnetMask`);
        } else if (normKey.includes('shutdown') || normKey.includes('enabled')) {
          portObj.shutdown = typeof rawValue === 'boolean' ? !rawValue : strVal === 'true' || strVal === 'shutdown';
          modifiedFields.push(`ports.${targetPortKey}.shutdown`);
        } else if (normKey.includes('description')) {
          portObj.description = strVal;
          modifiedFields.push(`ports.${targetPortKey}.description`);
        }
      }
    }

    if (normKey.includes('vlan/')) {
      // Format e.g. "vlan/10/name"
      const parts = key.split(/[/.]/);
      const vlanIdNum = parseInt(parts[1], 10);
      if (!isNaN(vlanIdNum)) {
        const vlanKey = String(vlanIdNum);
        const existingVlan = next.vlans[vlanKey] || { id: vlanIdNum, name: `VLAN_${vlanIdNum}`, status: 'active', ports: [] };
        if (parts[2]?.toLowerCase() === 'name') {
          existingVlan.name = strVal;
        }
        next.vlans[vlanKey] = { ...existingVlan };
        modifiedFields.push(`vlans.${vlanKey}`);
      }
    } else if (normKey === 'ntp' || normKey === 'ntpserver' || normKey.endsWith('/ntpserver')) {
      if (!ntpServers.includes(strVal)) {
        ntpServers.push(strVal);
        modifiedFields.push('ntpServers');
      }
    } else if (normKey.startsWith('route/')) {
      // Format e.g. "route/10.0.0.0/255.255.255.0/192.168.1.1"
      const parts = key.split('/');
      if (parts.length >= 4) {
        const newRoute: Route = {
          destination: parts[1],
          subnetMask: parts[2],
          nextHop: parts[3],
          type: 'static',
          metric: 1,
        };
        staticRoutes.push(newRoute);
        modifiedFields.push('staticRoutes');
      }
    } else {
      // Fallback: interface/port attribute edit (e.g. "interfaces/interface/gi0%2F0/ip").
      // Kept last so the dedicated vlan/ntp/route branches stay reachable.
      const combined = `${_path || ''}/${key}`.toLowerCase();
      const targetPortKey = Object.keys(next.ports || {}).find(
        p => combined.includes(p.toLowerCase()) || combined.includes(p.toLowerCase().replace('/', ''))
      );

      if (targetPortKey && next.ports[targetPortKey]) {
        const portObj = { ...next.ports[targetPortKey] };
        if (normKey.includes('ip') || normKey.includes('address')) {
          portObj.ipAddress = strVal;
          modifiedFields.push(`ports.${targetPortKey}.ipAddress`);
        } else if (normKey.includes('mask') || normKey.includes('subnet')) {
          portObj.subnetMask = strVal;
          modifiedFields.push(`ports.${targetPortKey}.subnetMask`);
        } else if (normKey.includes('shutdown') || normKey.includes('enabled')) {
          portObj.shutdown = typeof rawValue === 'boolean' ? !rawValue : strVal === 'true' || strVal === 'shutdown';
          modifiedFields.push(`ports.${targetPortKey}.shutdown`);
        } else if (normKey.includes('description')) {
          portObj.description = strVal;
          modifiedFields.push(`ports.${targetPortKey}.description`);
        }
        next.ports[targetPortKey] = portObj;
      }
    }
  }

  // Update runningConfig representation lines
  if (modifiedFields.length > 0) {
    next.runningConfig = [
      `! NETCONF edit-config applied at ${new Date().toISOString()}`,
      `hostname ${next.hostname}`,
      ...(next.domainName ? [`ip domain-name ${next.domainName}`] : []),
      ...(ntpServers.map(s => `ntp server ${s}`)),
    ];
  }

  return { nextState: next, modifiedFields };
}

/**
 * Commits running configuration state to persistent saved configuration.
 */
export function commitNetconfConfig(state: SwitchState): SwitchState {
  const runningStr = JSON.stringify(extractNetconfConfig(state));
  return {
    ...state,
    savedConfig: runningStr,
  };
}
