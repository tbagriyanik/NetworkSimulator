import type { SwitchState, Port, Vlan } from '@/lib/network/types';
import type { CanvasDevice } from '@/components/network/networkTopology.types';
import { executeCommand } from '@/lib/network/executor';

export interface RestconfResponse {
  status: number;
  statusText: string;
  data: Record<string, unknown>;
  headers: Record<string, string>;
  updatedState?: SwitchState;
}

/**
 * Normalizes port name for robust matching (e.g., 'GigabitEthernet0/0' <=> 'Gi0/0' <=> 'gi0/0')
 */
function findPortInState(ports: Record<string, Port> | undefined, nameOrId: string): Port | undefined {
  if (!ports) return undefined;
  const target = nameOrId.toLowerCase().replace(/[\s\-_/]/g, '');
  
  for (const [key, port] of Object.entries(ports)) {
    const kNorm = key.toLowerCase().replace(/[\s\-_/]/g, '');
    const pNorm = (port.name || port.id || '').toLowerCase().replace(/[\s\-_/]/g, '');
    if (kNorm === target || pNorm === target) return port;
    if (target.startsWith('gi') && (kNorm.startsWith('gi') || pNorm.startsWith('gi'))) {
      const targetNum = target.replace(/^[a-z]+/, '');
      const kNum = kNorm.replace(/^[a-z]+/, '');
      const pNum = pNorm.replace(/^[a-z]+/, '');
      if (targetNum && (targetNum === kNum || targetNum === pNum)) return port;
    }
    if (target.startsWith('fa') && (kNorm.startsWith('fa') || pNorm.startsWith('fa'))) {
      const targetNum = target.replace(/^[a-z]+/, '');
      const kNum = kNorm.replace(/^[a-z]+/, '');
      const pNum = pNorm.replace(/^[a-z]+/, '');
      if (targetNum && (targetNum === kNum || targetNum === pNum)) return port;
    }
  }
  return undefined;
}

/**
 * Dispatches simulated RESTCONF YANG request against target device state.
 * Supports full CRUD operations (GET, POST, PUT, PATCH, DELETE) and produces updated SwitchState.
 */
export function handleRestconfRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  uri: string,
  device: CanvasDevice,
  state: SwitchState | undefined,
  body?: Record<string, unknown>
): RestconfResponse {
  const normalizedUri = uri.trim();
  const upperMethod = method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  const defaultHeaders = {
    'content-type': 'application/yang-data+json',
    'x-restconf-server': 'NetSim-RESTCONF/1.0',
  };

  // 1. Target specific interface URI: /restconf/data/ietf-interfaces:interfaces/interface={name}
  const interfaceMatch = normalizedUri.match(/(?:\/ietf-interfaces:interfaces|\/interfaces)\/interface(?:=|\/)([^?#]+)/i);
  if (interfaceMatch) {
    const ifaceName = decodeURIComponent(interfaceMatch[1]);
    const targetPort = findPortInState(state?.ports, ifaceName);

    if (!targetPort && upperMethod === 'GET') {
      return {
        status: 404,
        statusText: 'Not Found',
        headers: defaultHeaders,
        data: {
          'ietf-restconf:errors': {
            error: [
              {
                'error-type': 'application',
                'error-tag': 'data-missing',
                'error-message': `Interface '${ifaceName}' does not exist on device '${device.name || device.id}'.`,
              },
            ],
          },
        },
      };
    }

    if (upperMethod === 'GET') {
      const p = targetPort!;
      return {
        status: 200,
        statusText: 'OK',
        headers: defaultHeaders,
        data: {
          'ietf-interfaces:interface': {
            name: p.name || p.id,
            description: p.description || `${p.name || p.id} on ${state?.hostname || device.name}`,
            type: p.type || 'iana-if-type:ethernetCsmacd',
            enabled: !p.shutdown,
            'ietf-ip:ipv4': p.ipAddress
              ? { address: [{ ip: p.ipAddress, netmask: p.subnetMask || '255.255.255.0' }] }
              : undefined,
            'ietf-ip:ipv6': p.ipv6Address
              ? { address: [{ ip: p.ipv6Address, prefix: p.ipv6Prefix || 64 }] }
              : undefined,
            operStatus: p.status === 'connected' ? 'up' : 'down',
            speed: p.speed || '1Gbps',
            duplex: p.duplex || 'full',
          },
        },
      };
    }

    if (upperMethod === 'PUT' || upperMethod === 'PATCH' || upperMethod === 'POST') {
      if (!state) {
        return {
          status: 500,
          statusText: 'Internal Server Error',
          headers: defaultHeaders,
          data: { error: 'Device state unavailable' },
        };
      }

      const updatedPorts = { ...state.ports };
      const portKey = targetPort?.id || Object.keys(updatedPorts)[0] || 'Gi0/0';
      const existingPort = updatedPorts[portKey] || {
        id: portKey,
        name: ifaceName,
        status: 'disconnected',
        vlan: 1,
        mode: 'access',
        duplex: 'auto',
        speed: 'auto',
        shutdown: false,
        type: 'gigabitethernet',
      };

      // Extract payload properties
      const ifPayload = (body?.['ietf-interfaces:interface'] || body?.['interface'] || body || {}) as Record<string, unknown>;
      const ipv4Obj = (ifPayload['ietf-ip:ipv4'] || ifPayload['ipv4'] || {}) as Record<string, unknown>;
      const ipv4AddrList = (ipv4Obj['address'] || []) as Array<Record<string, unknown>>;
      const firstIpv4 = ipv4AddrList[0] || {};

      const newIp = (firstIpv4['ip'] as string) || (ifPayload['ip'] as string) || existingPort.ipAddress;
      const newMask = (firstIpv4['netmask'] as string) || (ifPayload['netmask'] as string) || (ifPayload['subnet'] as string) || existingPort.subnetMask;
      const newDescription = (ifPayload['description'] as string) ?? existingPort.description;
      const enabledVal = ifPayload['enabled'];
      const newShutdown = enabledVal !== undefined ? !enabledVal : existingPort.shutdown;

      updatedPorts[portKey] = {
        ...existingPort,
        ipAddress: newIp,
        subnetMask: newMask,
        description: newDescription,
        shutdown: newShutdown,
      };

      const updatedState: SwitchState = {
        ...state,
        ports: updatedPorts,
      };

      return {
        status: 204,
        statusText: 'No Content (Resource Updated via RESTCONF)',
        headers: defaultHeaders,
        data: {
          success: true,
          message: `Interface ${ifaceName} updated successfully via RESTCONF ${upperMethod}.`,
          interface: {
            name: ifaceName,
            ipAddress: newIp,
            subnetMask: newMask,
            enabled: !newShutdown,
            description: newDescription,
          },
        },
        updatedState,
      };
    }

    if (upperMethod === 'DELETE') {
      if (!state || !targetPort) {
        return {
          status: 404,
          statusText: 'Not Found',
          headers: defaultHeaders,
          data: { error: `Interface ${ifaceName} not found` },
        };
      }

      const updatedPorts = { ...state.ports };
      updatedPorts[targetPort.id] = {
        ...targetPort,
        ipAddress: undefined,
        subnetMask: undefined,
        description: '',
      };

      const updatedState: SwitchState = {
        ...state,
        ports: updatedPorts,
      };

      return {
        status: 204,
        statusText: 'No Content (Resource Cleared via RESTCONF)',
        headers: defaultHeaders,
        data: { success: true, message: `Configuration of interface ${ifaceName} removed.` },
        updatedState,
      };
    }
  }

  // 2. Collection URI: /restconf/data/ietf-interfaces:interfaces
  if (normalizedUri.includes('ietf-interfaces:interfaces') || normalizedUri.endsWith('/interfaces')) {
    if (upperMethod === 'GET') {
      const ifaces = Object.values(state?.ports || {}).map((p) => ({
        name: p.name || p.id,
        description: p.description || `${p.name || p.id} on ${state?.hostname || device.name}`,
        type: p.type || 'iana-if-type:ethernetCsmacd',
        enabled: !p.shutdown,
        'ietf-ip:ipv4': p.ipAddress ? { address: [{ ip: p.ipAddress, netmask: p.subnetMask || '255.255.255.0' }] } : undefined,
        'ietf-ip:ipv6': p.ipv6Address ? { address: [{ ip: p.ipv6Address, prefix: p.ipv6Prefix || 64 }] } : undefined,
        operStatus: p.status === 'connected' ? 'up' : 'down',
      }));

      return {
        status: 200,
        statusText: 'OK',
        headers: defaultHeaders,
        data: { 'ietf-interfaces:interfaces': { interface: ifaces } },
      };
    }

    if (upperMethod === 'POST' || upperMethod === 'PATCH') {
      if (!state) {
        return { status: 500, statusText: 'Internal Error', headers: defaultHeaders, data: { error: 'No state' } };
      }

      const ifPayload = (body?.['ietf-interfaces:interface'] || body?.['interface'] || body || {}) as Record<string, unknown>;
      const ifaceName = (ifPayload['name'] as string) || 'GigabitEthernet0/0';
      const targetPort = findPortInState(state.ports, ifaceName);
      const portKey = targetPort?.id || Object.keys(state.ports)[0] || 'Gi0/0';

      const existingPort = state.ports[portKey] || {
        id: portKey,
        name: ifaceName,
        status: 'disconnected',
        vlan: 1,
        mode: 'access',
        duplex: 'auto',
        speed: 'auto',
        shutdown: false,
        type: 'gigabitethernet',
      };

      const ipv4Obj = (ifPayload['ietf-ip:ipv4'] || ifPayload['ipv4'] || {}) as Record<string, unknown>;
      const ipv4AddrList = (ipv4Obj['address'] || []) as Array<Record<string, unknown>>;
      const firstIpv4 = ipv4AddrList[0] || {};

      const newIp = (firstIpv4['ip'] as string) || (ifPayload['ip'] as string) || existingPort.ipAddress;
      const newMask = (firstIpv4['netmask'] as string) || (ifPayload['netmask'] as string) || existingPort.subnetMask;
      const enabledVal = ifPayload['enabled'];
      const newShutdown = enabledVal !== undefined ? !enabledVal : existingPort.shutdown;

      const updatedPorts = {
        ...state.ports,
        [portKey]: {
          ...existingPort,
          ipAddress: newIp,
          subnetMask: newMask,
          shutdown: newShutdown,
          description: (ifPayload['description'] as string) || existingPort.description,
        },
      };

      const updatedState: SwitchState = {
        ...state,
        ports: updatedPorts,
      };

      return {
        status: upperMethod === 'POST' ? 201 : 204,
        statusText: upperMethod === 'POST' ? 'Created' : 'No Content',
        headers: {
          ...defaultHeaders,
          Location: `/restconf/data/ietf-interfaces:interfaces/interface=${encodeURIComponent(ifaceName)}`,
        },
        data: {
          'ietf-interfaces:interfaces': {
            interface: [
              {
                name: ifaceName,
                enabled: !newShutdown,
                'ietf-ip:ipv4': newIp ? { address: [{ ip: newIp, netmask: newMask || '255.255.255.0' }] } : undefined,
              },
            ],
          },
        },
        updatedState,
      };
    }
  }

  // 3. Operational State: /restconf/data/ietf-interfaces:interfaces-state
  if (normalizedUri.includes('ietf-interfaces:interfaces-state') || normalizedUri.endsWith('/interfaces-state')) {
    if (upperMethod === 'GET') {
      const ifacesState = Object.values(state?.ports || {}).map((p) => ({
        name: p.name || p.id,
        type: p.type || 'iana-if-type:ethernetCsmacd',
        adminStatus: p.shutdown ? 'down' : 'up',
        operStatus: p.status === 'connected' ? 'up' : 'down',
        speed: '1000000000',
        statistics: {
          inOctets: Math.floor(Math.random() * 50000) + 12000,
          outOctets: Math.floor(Math.random() * 45000) + 9500,
          inPkts: Math.floor(Math.random() * 500) + 120,
          outPkts: Math.floor(Math.random() * 480) + 110,
          inErrors: 0,
          outErrors: 0,
        },
      }));

      return {
        status: 200,
        statusText: 'OK',
        headers: defaultHeaders,
        data: { 'ietf-interfaces:interfaces-state': { interface: ifacesState } },
      };
    }
  }

  // 4. Native Model URI: /restconf/data/netsim-native:native (or /native)
  if (normalizedUri.includes('netsim-native:native') || normalizedUri.includes('native') || normalizedUri.includes('ietf-system:system')) {
    if (upperMethod === 'GET') {
      const vlansList = Object.entries(state?.vlans || {}).map(([vid, v]) => ({
        id: Number(vid),
        name: typeof v === 'string' ? v : (v as Vlan)?.name || `VLAN${vid}`,
        status: 'active',
      }));

      return {
        status: 200,
        statusText: 'OK',
        headers: defaultHeaders,
        data: {
          'netsim-native:native': {
            hostname: state?.hostname || device.name,
            version: state?.version?.nosVersion || '17.3.1',
            ip: {
              routing: state?.ipRouting ?? true,
            },
            router: {
              ospf: state?.ospfProcessId ? [{ id: state.ospfProcessId, routerId: state.ospfRouterId }] : undefined,
              bgp: state?.bgpAs ? [{ asn: state.bgpAs, routerId: state.routerId }] : undefined,
            },
            vlan: vlansList.length > 0 ? { vlanList: vlansList } : undefined,
            staticRoute: state?.staticRoutes?.map((r) => ({
              prefix: r.network || r.destination,
              mask: r.mask || r.subnetMask,
              nextHop: r.nextHop,
            })),
          },
        },
      };
    }

    if (upperMethod === 'PATCH' || upperMethod === 'PUT' || upperMethod === 'POST') {
      if (!state) {
        return { status: 500, statusText: 'Internal Error', headers: defaultHeaders, data: { error: 'No state' } };
      }

      const nativePayload = (body?.['netsim-native:native'] || body?.['native'] || body || {}) as Record<string, unknown>;
      let updatedState: SwitchState = { ...state };

      if (typeof nativePayload['hostname'] === 'string') {
        updatedState.hostname = nativePayload['hostname'];
      }

      if (nativePayload['ip'] && typeof nativePayload['ip'] === 'object') {
        const ipObj = nativePayload['ip'] as Record<string, unknown>;
        if (typeof ipObj['routing'] === 'boolean') {
          updatedState.ipRouting = ipObj['routing'];
        }
      }

      // VLAN updates
      if (nativePayload['vlan'] && typeof nativePayload['vlan'] === 'object') {
        const vlanObj = nativePayload['vlan'] as Record<string, unknown>;
        const list = (vlanObj['vlanList'] || vlanObj['vlan'] || []) as Array<Record<string, unknown>>;
        if (Array.isArray(list)) {
          const newVlans = { ...updatedState.vlans };
          list.forEach((v) => {
            const vid = Number(v['id'] || v['vlanId']);
            if (vid) {
              newVlans[vid] = {
                id: vid,
                name: (v['name'] as string) || `VLAN${vid}`,
                status: 'active',
                ports: [],
              };
            }
          });
          updatedState.vlans = newVlans;
        }
      }

      return {
        status: 204,
        statusText: 'No Content (Native Config Updated via RESTCONF)',
        headers: defaultHeaders,
        data: {
          success: true,
          updatedUri: uri,
          hostname: updatedState.hostname,
        },
        updatedState,
      };
    }
  }

  // 5. Generic Fallback
  if (upperMethod === 'POST' || upperMethod === 'PATCH' || upperMethod === 'PUT') {
    return {
      status: 204,
      statusText: 'No Content (Resource Updated via RESTCONF)',
      headers: defaultHeaders,
      data: { success: true, updatedUri: uri, payload: body },
    };
  }

  return {
    status: 404,
    statusText: 'Not Found',
    headers: defaultHeaders,
    data: {
      'ietf-restconf:errors': {
        error: [
          {
            'error-type': 'application',
            'error-tag': 'invalid-value',
            'error-message': `Resource '${uri}' not found on device '${device.name || device.id}'.`,
          },
        ],
      },
    },
  };
}

export interface PythonScriptExecutionResult {
  output: string;
  logs: string[];
  success: boolean;
  affectedDevices: string[];
  updatedDeviceStates?: Map<string, SwitchState>;
}

/**
 * Finds a matching device in the topology by ID, Name, Hostname, or IP Address.
 */
function resolveTargetDevice(
  identifier: string,
  devices: CanvasDevice[],
  deviceStates?: Map<string, SwitchState>
): { device: CanvasDevice; state: SwitchState } | undefined {
  const norm = identifier.trim().toLowerCase();
  
  for (const dev of devices) {
    const st = deviceStates?.get(dev.id);
    const dId = dev.id.toLowerCase();
    const dName = (dev.name || '').toLowerCase();
    const dHost = (st?.hostname || '').toLowerCase();
    const dIp = (dev.ip || '').toLowerCase();

    if (dId === norm || dName === norm || dHost === norm || dIp === norm) {
      return { device: dev, state: st || ({} as SwitchState) };
    }
  }

  // Check state map keys directly
  if (deviceStates) {
    for (const [sId, st] of deviceStates.entries()) {
      if (sId.toLowerCase() === norm || (st.hostname && st.hostname.toLowerCase() === norm)) {
        const foundDev: CanvasDevice = devices.find((d) => d.id === sId) || {
          id: sId,
          name: st.hostname || sId,
          type: 'router',
          ip: '',
          x: 0,
          y: 0,
          status: 'online',
          ports: [],
        };
        return { device: foundDev, state: st };
      }
    }
  }

  return undefined;
}

/**
 * Lightweight in-browser NetDevOps Python simulation runner.
 * Simulates Netmiko (ConnectHandler, send_command, send_config_set)
 * and Python Requests against simulated RESTCONF endpoints.
 * Operates on and mutates live SwitchState objects!
 */
export function executeNetDevOpsPythonScript(
  scriptCode: string,
  devices: CanvasDevice[],
  deviceStates?: Map<string, SwitchState>
): PythonScriptExecutionResult {
  const logs: string[] = [];
  const affectedDevices: string[] = [];
  const updatedStates = new Map<string, SwitchState>(deviceStates ? new Map(deviceStates) : new Map());

  logs.push('[NetDevOps Engine] Initializing virtual Python 3 environment...');
  logs.push('[NetDevOps Engine] Loaded modules: netmiko, requests, json, sys, re, time.');

  const lines = scriptCode.split('\n');

  // Track discovered device connection parameters
  const definedDevices: Array<{ host: string; raw: Record<string, string> }> = [];
  let currentActiveHost = '';
  let inConfigListDef = false;
  let configCommandsList: string[] = [];

  // Parse lines
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) continue;

    // Detect print statements
    const printMatch = line.match(/^print\(\s*(?:f?['"](.*)['"]|(.*))\s*\)$/);
    if (printMatch && !line.includes('send_command') && !line.includes('send_config_set')) {
      const printVal = printMatch[1] || printMatch[2];
      if (printVal) {
        logs.push(printVal.replace(/\{dev\['host'\]\}/g, currentActiveHost || 'device'));
      }
    }

    // Detect dictionary definitions for devices e.g. {"host": "R1", "device_type": ...}
    const hostDictMatch = line.match(/['"]host['"]\s*:\s*['"]([^'"]+)['"]/i);
    if (hostDictMatch) {
      const hostVal = hostDictMatch[1];
      if (!definedDevices.some((d) => d.host === hostVal)) {
        definedDevices.push({ host: hostVal, raw: { host: hostVal } });
      }
    }

    // Detect host variable assignment: host = "R1"
    const hostVarMatch = line.match(/^host\s*=\s*['"]([^'"]+)['"]/i);
    if (hostVarMatch) {
      currentActiveHost = hostVarMatch[1];
      if (!affectedDevices.includes(currentActiveHost)) affectedDevices.push(currentActiveHost);
    }

    // Detect commands list definition: commands = [ ... ]
    if (line.match(/^(?:commands|config_commands|cmds)\s*=\s*\[/i)) {
      inConfigListDef = true;
      configCommandsList = [];
      const matches = [...line.matchAll(/['"]([^'"]+)['"]/g)];
      if (matches.length > 0) {
        for (const m of matches) {
          configCommandsList.push(m[1]);
        }
      }
      if (line.includes(']')) {
        inConfigListDef = false;
      }
    } else if (inConfigListDef) {
      const matches = [...line.matchAll(/['"]([^'"]+)['"]/g)];
      for (const m of matches) {
        configCommandsList.push(m[1]);
      }
      if (line.includes(']')) {
        inConfigListDef = false;
      }
    }

    // Detect ConnectHandler initiation
    if (line.includes('ConnectHandler(')) {
      const inlineHost = line.match(/['"]host['"]\s*:\s*['"]([^'"]+)['"]/i);
      if (inlineHost) {
        currentActiveHost = inlineHost[1];
      } else if (definedDevices.length > 0 && !currentActiveHost) {
        currentActiveHost = definedDevices[0].host;
      }

      if (currentActiveHost && !affectedDevices.includes(currentActiveHost)) {
        affectedDevices.push(currentActiveHost);
      }

      logs.push(`[Netmiko] Establishing SSH connection to host "${currentActiveHost || 'Router'}" (port 22)...`);
      logs.push(`[Netmiko] Authenticated successfully. Entering privileged EXEC mode... OK`);
    }

    // Detect send_command: output = net_connect.send_command("...")
    const sendCmdMatch = line.match(/send_command\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (sendCmdMatch) {
      const cliCmd = sendCmdMatch[1];
      const targetHost = currentActiveHost || (devices[0]?.name || devices[0]?.id) || 'R1';
      
      const resolved = resolveTargetDevice(targetHost, devices, updatedStates);
      const devState = resolved?.state || updatedStates.get(targetHost);

      logs.push(`\n[Netmiko CLI] ${devState?.hostname || targetHost}# ${cliCmd}`);

      if (devState) {
        // Execute command using simulator's command executor
        const execRes = executeCommand(
          { ...devState, currentMode: 'privileged' },
          cliCmd,
          'en',
          devices,
          [],
          updatedStates,
          resolved?.device?.id || targetHost
        );

        if (execRes.output) {
          logs.push(execRes.output);
        } else if (execRes.error) {
          logs.push(execRes.error);
        } else {
          logs.push(`% Command '${cliCmd}' executed.`);
        }

        if (execRes.newState && resolved?.device?.id) {
          updatedStates.set(resolved.device.id, { ...devState, ...execRes.newState });
        }
      } else {
        logs.push(`% Host '${targetHost}' not found in topology.`);
      }
    }

    // Detect send_config_set: net_connect.send_config_set(commands)
    if (line.includes('send_config_set')) {
      const targetHost = currentActiveHost || (devices[0]?.name || devices[0]?.id) || 'R1';
      const resolved = resolveTargetDevice(targetHost, devices, updatedStates);
      let curState = resolved?.state || updatedStates.get(targetHost);

      logs.push(`\n[Netmiko Config] Entering global configuration mode on "${curState?.hostname || targetHost}"...`);
      logs.push(`[Netmiko Config] ${curState?.hostname || targetHost}(config)#`);

      if (curState) {
        const isRouterDev = resolved?.device?.type === 'router' || (!resolved?.device?.type && targetHost.toLowerCase().startsWith('r'));
        curState = {
          ...curState,
          currentMode: 'config',
          ...(isRouterDev ? { deviceType: 'router', switchLayer: 'L3' } : {})
        };
      }

      // Determine commands to execute
      const inlineListMatch = line.match(/send_config_set\(\s*\[(.*?)\]\s*\)/i);
      let cmdsToRun = configCommandsList;
      if (inlineListMatch) {
        const inlineCmds = [...inlineListMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
        if (inlineCmds.length > 0) cmdsToRun = inlineCmds;
      }
      if (cmdsToRun.length === 0) {
        cmdsToRun = [
          'interface GigabitEthernet0/0',
          'ip address 192.168.100.1 255.255.255.0',
          'no shutdown',
        ];
      }

      for (const cmd of cmdsToRun) {
        logs.push(`[Netmiko Config] ${curState?.hostname || targetHost}(config)# ${cmd}`);
        if (curState && resolved?.device?.id) {
          const stepRes = executeCommand(
            curState,
            cmd,
            'en',
            devices,
            [],
            updatedStates,
            resolved.device.id
          );

          if (stepRes.newState) {
            curState = { ...curState, ...stepRes.newState };
            updatedStates.set(resolved.device.id, curState);
          }
          if (stepRes.output) {
            logs.push(stepRes.output);
          }
        }
      }

      if (curState && resolved?.device?.id) {
        curState = { ...curState, currentMode: 'privileged', currentInterface: undefined };
        updatedStates.set(resolved.device.id, curState);
      }

      logs.push(`[Netmiko Config] Exiting configuration mode. Changes applied to running-config.`);
    }

    // Detect Python Requests RESTCONF calls
    // e.g. requests.get('https://R1/restconf/data/ietf-interfaces:interfaces', ...)
    const reqMatch = line.match(/requests\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/i);
    if (reqMatch) {
      const httpMethod = reqMatch[1].toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      const rawUrl = reqMatch[2];

      // Parse target device from URL
      let targetDevName = currentActiveHost || devices[0]?.name || 'R1';
      const urlHostMatch = rawUrl.match(/https?:\/\/([^/:]+)/i);
      if (urlHostMatch) {
        targetDevName = urlHostMatch[1];
      }

      const resolved = resolveTargetDevice(targetDevName, devices, updatedStates);
      const targetDev = resolved?.device || devices[0] || {
        id: 'R1',
        name: targetDevName,
        type: 'router',
        x: 0,
        y: 0,
        status: 'online',
        ports: [],
      };
      const curState = resolved?.state || updatedStates.get(targetDev.id);

      // Extract URI path
      const uriPath = rawUrl.replace(/^https?:\/\/[^/]+/, '') || '/restconf/data/ietf-interfaces:interfaces';

      logs.push(`\n[Python Requests] ${httpMethod} ${rawUrl}`);
      logs.push(`[Python Requests] Sending YANG data request to '${targetDev.name || targetDev.id}'...`);

      const restconfRes = handleRestconfRequest(httpMethod, uriPath, targetDev, curState);

      logs.push(`[Python Requests] HTTP/${restconfRes.status} ${restconfRes.statusText}`);
      logs.push(`[Python Requests] Response Body:\n${JSON.stringify(restconfRes.data, null, 2)}`);

      if (restconfRes.updatedState && targetDev.id) {
        updatedStates.set(targetDev.id, restconfRes.updatedState);
        if (!affectedDevices.includes(targetDev.name || targetDev.id)) {
          affectedDevices.push(targetDev.name || targetDev.id);
        }
      }
    }
  }

  // If no host was explicitly extracted, apply to all active devices
  if (affectedDevices.length === 0 && devices.length > 0) {
    devices.forEach((d) => affectedDevices.push(d.name || d.id));
    logs.push(`[NetDevOps Engine] Batch execution verified across ${devices.length} topology nodes.`);
  }

  logs.push('\n[NetDevOps Engine] Process finished with exit code 0 (All operations completed successfully).');

  return {
    output: logs.join('\n'),
    logs,
    success: true,
    affectedDevices,
    updatedDeviceStates: updatedStates,
  };
}
