import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice } from '@/components/network/networkTopology.types';

export interface RestconfResponse {
  status: number;
  statusText: string;
  data: Record<string, unknown>;
  headers: Record<string, string>;
}

/**
 * Dispatches simulated RESTCONF YANG request against target device state.
 */
export function handleRestconfRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  uri: string,
  device: CanvasDevice,
  state: SwitchState | undefined,
  body?: Record<string, unknown>
): RestconfResponse {
  const normalizedUri = uri.trim();

  // 1. GET /restconf/data/ietf-interfaces:interfaces
  if (normalizedUri.includes('ietf-interfaces:interfaces') || normalizedUri.endsWith('/interfaces')) {
    if (method === 'GET') {
      const ifaces = Object.values(state?.ports || {}).map((p) => ({
        name: p.id,
        description: p.description || p.name,
        type: p.type,
        enabled: !p.shutdown,
        'ietf-ip:ipv4': p.ipAddress ? { address: [{ ip: p.ipAddress, netmask: p.subnetMask || '255.255.255.0' }] } : undefined,
        'ietf-ip:ipv6': p.ipv6Address ? { address: [{ ip: p.ipv6Address, prefix: p.ipv6Prefix || 64 }] } : undefined,
        operStatus: p.status === 'connected' ? 'up' : 'down',
      }));

      return {
        status: 200,
        statusText: 'OK',
        data: { 'ietf-interfaces:interfaces': { interface: ifaces } },
        headers: { 'content-type': 'application/yang-data+json' },
      };
    }
  }

  // 2. GET /restconf/data/netsim-native:native (or /native)
  if (normalizedUri.includes('netsim-native:native') || normalizedUri.endsWith('/native')) {
    if (method === 'GET') {
      return {
        status: 200,
        statusText: 'OK',
        data: {
          'netsim-native:native': {
            hostname: state?.hostname || device.name,
            version: state?.version?.nosVersion || '17.3.1',
            ip: {
              routing: state?.ipRouting ?? true,
            },
            router: {
              ospf: state?.ospfProcessId ? [{ id: state.ospfProcessId, routerId: state.ospfRouterId }] : undefined,
            },
          },
        },
        headers: { 'content-type': 'application/yang-data+json' },
      };
    }
  }

  // 3. Fallback for custom endpoints or successful updates
  if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
    return {
      status: 204,
      statusText: 'No Content (Resource Updated via RESTCONF)',
      data: { success: true, updatedUri: uri, payload: body },
      headers: { 'content-type': 'application/yang-data+json' },
    };
  }

  return {
    status: 404,
    statusText: 'Not Found',
    data: {
      'ietf-restconf:errors': {
        error: [
          {
            'error-type': 'application',
            'error-tag': 'invalid-value',
            'error-message': `Resource ${uri} not found on ${device.name}`,
          },
        ],
      },
    },
    headers: { 'content-type': 'application/yang-data+json' },
  };
}

export interface PythonScriptExecutionResult {
  output: string;
  logs: string[];
  success: boolean;
  affectedDevices: string[];
}

/**
 * Lightweight in-browser NetDevOps Python simulation runner.
 * Simulates netmiko / restconf / requests scripts across topology nodes.
 */
export function executeNetDevOpsPythonScript(
  scriptCode: string,
  devices: CanvasDevice[],
  _deviceStates?: Map<string, SwitchState>
): PythonScriptExecutionResult {

  const logs: string[] = [];
  const affectedDevices: string[] = [];

  logs.push('[NetDevOps] Initializing virtual Python 3.11 environment...');
  logs.push('[NetDevOps] Loading libraries: netmiko, requests, urllib3, json...');

  const lines = scriptCode.split('\n').map((l) => l.trim());

  let currentHost = '';
  let inConfigBlock = false;
  const collectedCommands: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;

    // Detect ConnectHandler or host selection
    const matchHost = line.match(/['"]host['"]\s*:\s*['"]([^'"]+)['"]/i) || line.match(/host\s*=\s*['"]([^'"]+)['"]/i);
    if (matchHost) {
      currentHost = matchHost[1];
      if (!affectedDevices.includes(currentHost)) affectedDevices.push(currentHost);
      logs.push(`[Netmiko] Connecting to device "${currentHost}" via SSH (port 22)... OK`);
      logs.push(`[Netmiko] Entering enable mode on "${currentHost}"... OK`);
    }

    // Detect send_command
    const matchCmd = line.match(/send_command\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (matchCmd) {
      const cmd = matchCmd[1];
      logs.push(`[Netmiko CLI] ${currentHost || 'Router'}# ${cmd}`);
      if (cmd.startsWith('show ip int')) {
        logs.push(`Interface              IP-Address      OK? Method Status                Protocol`);
        logs.push(`GigabitEthernet0/0     192.168.1.1     YES manual up                    up`);
        logs.push(`GigabitEthernet0/1     10.0.0.1        YES manual up                    up`);
      } else if (cmd.startsWith('show ip route')) {
        logs.push(`Codes: C - connected, S - static, O - OSPF`);
        logs.push(`Gateway of last resort is not set`);
        logs.push(`C    192.168.1.0/24 is directly connected, GigabitEthernet0/0`);
      } else {
        logs.push(`% Output of "${cmd}" captured successfully.`);
      }
    }

    // Detect send_config_set
    if (line.includes('send_config_set')) {
      inConfigBlock = true;
      logs.push(`[Netmiko] Entering configuration mode on "${currentHost || 'Router'}"...`);
    }

    if (inConfigBlock) {
      const matchConfigLine = line.match(/['"]([^'"]+)['"]/);
      if (matchConfigLine && !line.includes('send_config_set')) {
        collectedCommands.push(matchConfigLine[1]);
        logs.push(`[Netmiko Config] ${currentHost || 'Router'}(config)# ${matchConfigLine[1]}`);
      }
    }
  }

  // If no host was explicitly extracted, apply to all active devices
  if (affectedDevices.length === 0 && devices.length > 0) {
    devices.forEach((d) => affectedDevices.push(d.name || d.id));
    logs.push(`[NetDevOps] Executing batch script across ${devices.length} network topology devices.`);
  }

  logs.push('[NetDevOps] Script execution completed with return code 0.');

  return {
    output: logs.join('\n'),
    logs,
    success: true,
    affectedDevices,
  };
}
