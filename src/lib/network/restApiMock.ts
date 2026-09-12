import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { handleRestconfRequest } from '@/lib/network/netdevopsEngine';

export interface RestApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  executionTimeMs: number;
  updatedState?: SwitchState;
  updatedDeviceId?: string;
}

export function handleRestApiRequest(
  method: string,
  url: string,
  _headersInput: Record<string, string> = {},
  _bodyInput?: string,
  topologyDevices: CanvasDevice[] = [],
  deviceStates?: Map<string, SwitchState>,
  topologyConnections: CanvasConnection[] = []
): RestApiResponse {
  const startTime = Date.now();
  const upperMethod = method.toUpperCase().trim();
  let normalizedUrl = url.trim();

  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'Content-Type': 'application/json' },
      data: { error: 'Invalid URL format', url },
      executionTimeMs: Date.now() - startTime,
    };
  }

  const pathname = parsedUrl.pathname.toLowerCase();

  // 1. Controller Authentication API
  if (pathname.includes('/auth/token') || pathname.includes('/system/api/v1/auth/token')) {
    return {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'SESSIONID=intent_session_992182; Path=/; Secure; HttpOnly',
        'x-auth-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.intent_token_2026',
      },
      data: {
        Token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.intent_token_2026_dnac_active',
        idleTimeout: 3600,
        sessionTimeout: 28800,
        role: 'SUPER-ADMIN',
        issuedAt: new Date().toISOString(),
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 2. Controller Intent APIs: Device Count
  if (pathname.includes('/network-device/count')) {
    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      data: {
        response: topologyDevices.length,
        version: '1.0',
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 3. Controller Intent APIs: Network Devices (All or Single)
  if (pathname.includes('/network-device') || pathname.includes('/api/v1/devices')) {
    const devicesList = topologyDevices.map((d, index) => {
      const state = deviceStates?.get(d.id);
      return {
        id: d.id,
        hostname: state?.hostname || d.name || `Device-${d.id}`,
        managementIpAddress: d.ip || `10.0.0.${index + 1}`,
        macAddress: d.macAddress || `00:1A:2B:3C:4D:${(index + 10).toString(16).padStart(2, '0')}`,
        type: d.type === 'router' ? 'NetSim Enterprise Router' : d.type.startsWith('switch') ? 'NetSim Managed Switch' : 'End Host Terminal',
        family: d.type === 'router' ? 'Routers' : d.type.startsWith('switch') ? 'Switches and Hubs' : 'Unified AP',
        role: d.type === 'router' ? 'BORDER_ROUTER' : d.type === 'switchL3' ? 'DISTRIBUTION' : 'ACCESS',
        upTime: '18 days, 04:12:30',
        reachabilityStatus: d.status === 'offline' ? 'Unreachable' : 'Reachable',
        softwareVersion: state?.version?.nosVersion || '17.3.4r',
        serialNumber: `SN-NETSIM-${d.id.toUpperCase()}`,
        platformId: d.type.toUpperCase(),
        portCount: Object.keys(state?.ports || {}).length || d.ports?.length || 4,
      };
    });

    // Single device query if ID present in path
    const idMatch = pathname.match(/\/network-device\/([a-z0-9_-]+)/i);
    if (idMatch && idMatch[1] !== 'count') {
      const targetId = idMatch[1];
      const found = devicesList.find((dev) => dev.id.toLowerCase() === targetId.toLowerCase() || dev.hostname.toLowerCase() === targetId.toLowerCase());
      if (found) {
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' },
          data: { response: found, version: '1.0' },
          executionTimeMs: Date.now() - startTime,
        };
      }
    }

    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json', 'x-controller-version': '2.3.5.3' },
      data: {
        response: devicesList,
        version: '1.0',
        count: devicesList.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 4. Controller Intent APIs: Device Interfaces
  if ((pathname.includes('/dna/intent/api/v1/interface') || pathname === '/interface' || pathname.includes('/api/v1/interface')) && !pathname.includes('restconf')) {
    const interfacesList: Array<Record<string, unknown>> = [];

    topologyDevices.forEach((dev) => {
      const state = deviceStates?.get(dev.id);
      const ports = state?.ports || {};
      
      Object.values(ports).forEach((p) => {
        interfacesList.push({
          deviceId: dev.id,
          deviceName: state?.hostname || dev.name,
          portName: p.name || p.id,
          interfaceType: p.type || 'Physical',
          adminStatus: p.shutdown ? 'DOWN' : 'UP',
          status: p.status === 'connected' ? 'UP' : 'DOWN',
          ipAddress: p.ipAddress || null,
          mask: p.subnetMask || null,
          macAddress: dev.macAddress || '00:1A:2B:3C:4D:00',
          speed: p.speed || '1 Gbps',
          duplex: p.duplex || 'FullDuplex',
          portMode: p.mode || 'access',
          vlanId: p.vlan || 1,
        });
      });
    });

    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      data: {
        response: interfacesList,
        version: '1.0',
        count: interfacesList.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 5. Controller Intent APIs: Physical & Site Topology Graph
  if (pathname.includes('/topology') || pathname.includes('/site-topology') || pathname.includes('/physical-topology')) {
    const nodes = topologyDevices.map((d) => ({
      id: d.id,
      label: deviceStates?.get(d.id)?.hostname || d.name || d.id,
      deviceType: d.type,
      ip: d.ip,
      status: d.status,
      x: d.x,
      y: d.y,
    }));

    const links = topologyConnections.map((c, i) => ({
      id: `link-${i}`,
      source: c.sourceDeviceId,
      sourcePort: c.sourcePort,
      target: c.targetDeviceId,
      targetPort: c.targetPort,
      linkStatus: c.active !== false ? 'UP' : 'DOWN',
      cableType: c.cableType || 'straight',
    }));

    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      data: {
        response: {
          nodes,
          links,
        },
        version: '1.0',
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 6. Controller Intent APIs: Overall Network & Client Health
  if (pathname.includes('/network-health') || pathname.includes('/client-health') || pathname.includes('/api/v1/health')) {
    const totalDevices = topologyDevices.length || 1;
    const onlineDevices = topologyDevices.filter((d) => d.status !== 'offline').length;
    const overallScore = Math.round((onlineDevices / totalDevices) * 100);

    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      data: {
        response: [
          {
            siteId: 'global-site-01',
            siteName: 'Corporate Headquarters',
            networkHealthAverage: overallScore,
            scoreDetail: [
              { scoreCategory: { value: 'ROUTER' }, scoreValue: overallScore, clientCount: onlineDevices },
              { scoreCategory: { value: 'SWITCH' }, scoreValue: Math.max(90, overallScore), clientCount: totalDevices },
              { scoreCategory: { value: 'WIRED_CLIENTS' }, scoreValue: 98, clientCount: 16 },
              { scoreCategory: { value: 'WIRELESS_CLIENTS' }, scoreValue: 92, clientCount: 8 },
            ],
            monitoredDevicesCount: totalDevices,
            healthyDevicesCount: onlineDevices,
          },
        ],
        version: '1.0',
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 7. RESTCONF / YANG Data Endpoint with GET, POST, PUT, PATCH, DELETE
  if (pathname.includes('/restconf/data') || pathname.includes('/api/v1/yang')) {
    // Resolve targeted device from hostname in URL or first active device
    let targetDev = topologyDevices[0];
    const urlHost = parsedUrl.hostname;
    if (urlHost && urlHost !== 'localhost' && urlHost !== '127.0.0.1' && urlHost !== 'controller' && urlHost !== 'dnac') {
      const matchDev = topologyDevices.find(
        (d) => d.id.toLowerCase() === urlHost.toLowerCase() ||
               (d.name && d.name.toLowerCase() === urlHost.toLowerCase()) ||
               (deviceStates?.get(d.id)?.hostname && deviceStates.get(d.id)!.hostname.toLowerCase() === urlHost.toLowerCase())
      );
      if (matchDev) targetDev = matchDev;
    }

    if (!targetDev) {
      targetDev = {
        id: 'R1',
        name: 'Router1',
        type: 'router',
        ip: '',
        x: 0,
        y: 0,
        status: 'online',
        ports: [],
      };
    }

    const curState = deviceStates?.get(targetDev.id);

    let parsedBody: Record<string, unknown> | undefined;
    if (_bodyInput) {
      try {
        parsedBody = JSON.parse(_bodyInput);
      } catch {
        // use raw
      }
    }

    const restconfRes = handleRestconfRequest(
      upperMethod as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      pathname,
      targetDev,
      curState,
      parsedBody
    );

    return {
      status: restconfRes.status,
      statusText: restconfRes.statusText,
      headers: restconfRes.headers,
      data: restconfRes.data,
      executionTimeMs: Date.now() - startTime,
      updatedState: restconfRes.updatedState,
      updatedDeviceId: targetDev.id,
    };
  }

  // 8. Generic Intent / REST API Fallback
  return {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    data: {
      message: 'Intent & REST API Endpoint Executed Successfully',
      method: upperMethod,
      url: normalizedUrl,
      timestamp: new Date().toISOString(),
      activeDevicesCount: topologyDevices.length,
      topologyConnectionsCount: topologyConnections.length,
    },
    executionTimeMs: Date.now() - startTime,
  };
}
