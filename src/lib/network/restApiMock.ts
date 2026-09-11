import type { CanvasDevice } from '@/components/network/networkTopology.types';

export interface RestApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  executionTimeMs: number;
}

export function handleRestApiRequest(
  method: string,
  url: string,
  _headersInput: Record<string, string> = {},
  _bodyInput?: string,
  topologyDevices: CanvasDevice[] = []
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

  // DNA Center Authentication API
  if (pathname.includes('/dna/system/api/v1/auth/token') || pathname.includes('/dna/intent/api/v1/auth/token')) {
    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'SESSIONID=dnac_session_123' },
      data: {
        Token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkbmFjX2FkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.dnac_mock_jwt_token',
        idleTimeout: 3600,
        sessionTimeout: 28800,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // DNA Center Intent APIs: Network Devices
  if (pathname.includes('/dna/intent/api/v1/network-device')) {
    const devicesList = topologyDevices.map((d, index) => ({
      id: d.id,
      hostname: d.name || `Device-${d.id}`,
      managementIpAddress: d.ip || `10.0.0.${index + 1}`,
      type: d.type === 'router' ? 'NetSim Router' : d.type.startsWith('switch') ? 'NetSim Switch' : 'Enterprise Host',
      family: d.type === 'router' ? 'Routers' : d.type.startsWith('switch') ? 'Switches and Hubs' : 'Unified AP',
      macAddress: d.macAddress || `00:1A:2B:3C:4D:${(index + 10).toString(16)}`,
      upTime: '14 days, 03:22:15',
      reachabilityStatus: d.status === 'offline' ? 'Unreachable' : 'Reachable',
      softwareVersion: '17.3.4r',
    }));

    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json', 'x-dnac-version': '2.3.5.3' },
      data: {
        response: devicesList,
        version: '1.0',
        count: devicesList.length,
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // DNA Center Intent APIs: Client Health
  if (pathname.includes('/dna/intent/api/v1/client-health')) {
    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      data: {
        response: [
          {
            siteId: 'global-site-01',
            scoreDetail: [
              { scoreCategory: { value: 'WIRED' }, scoreValue: 98 },
              { scoreCategory: { value: 'WIRELESS' }, scoreValue: 92 },
            ],
          },
        ],
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // RESTCONF / YANG Data Endpoint with GET, POST, PUT, DELETE
  if (pathname.includes('/restconf/data') || pathname.includes('/api/v1/yang')) {
    if (upperMethod === 'POST') {
      return {
        status: 201,
        statusText: 'Created',
        headers: { 'Content-Type': 'application/yang-data+json', Location: `${normalizedUrl}/ietf-interfaces:interfaces/interface=GigabitEthernet0/0/1` },
        data: {
          'ietf-interfaces:interfaces': {
            interface: [
              {
                name: 'GigabitEthernet0/0/1',
                description: 'Created via RESTCONF POST automation',
                type: 'iana-if-type:ethernetCsmacd',
                enabled: true,
                'ietf-ip:ipv4': { address: [{ ip: '10.255.255.1', netmask: '255.255.255.0' }] },
              },
            ],
          },
        },
        executionTimeMs: Date.now() - startTime,
      };
    }

    if (upperMethod === 'PUT') {
      return {
        status: 204,
        statusText: 'No Content (Updated)',
        headers: { 'Content-Type': 'application/yang-data+json' },
        data: { message: 'Interface configuration updated via RESTCONF PUT' },
        executionTimeMs: Date.now() - startTime,
      };
    }

    if (upperMethod === 'DELETE') {
      return {
        status: 204,
        statusText: 'No Content (Deleted)',
        headers: { 'Content-Type': 'application/yang-data+json' },
        data: { message: 'Interface deleted via RESTCONF DELETE' },
        executionTimeMs: Date.now() - startTime,
      };
    }

    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/yang-data+json' },
      data: {
        'ietf-interfaces:interfaces': {
          interface: topologyDevices.slice(0, 3).map((d) => ({
            name: `GigabitEthernet0/0/0-${d.name}`,
            type: 'iana-if-type:ethernetCsmacd',
            enabled: d.status !== 'offline',
            'ietf-ip:ipv4': {
              address: [{ ip: d.ip || '192.168.1.1', netmask: d.subnet || '255.255.255.0' }],
            },
          })),
        },
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Generic Mock Fallback Response
  return {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    data: {
      message: 'DNA Center / REST API Intent Endpoint Executed',
      method: upperMethod,
      url: normalizedUrl,
      timestamp: new Date().toISOString(),
      activeDevicesCount: topologyDevices.length,
    },
    executionTimeMs: Date.now() - startTime,
  };
}
