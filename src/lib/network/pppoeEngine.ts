import { SwitchState, PppoeSession } from './types';
import { CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

/**
 * Evaluates and negotiates PPPoE Sessions across topology routers.
 * Simulates PPPoE Discovery (PADI/PADO/PADR/PADS), LCP (CHAP/PAP auth), and IPCP address allocation.
 */
export function evaluatePppoeSessions(
  deviceStates: Map<string, SwitchState>,
  connections: CanvasConnection[]
): Map<string, SwitchState> {
  const updatedStates = new Map<string, SwitchState>(deviceStates);

  deviceStates.forEach((state, deviceId) => {
    // 1. Check if device is a PPPoE client with dialer interface and pppoe-client configured
    const dialerPortEntry = Object.entries(state.ports || {}).find(([id, p]) =>
      id.startsWith('dialer') || (p.dialerPool && p.dialerPool > 0)
    );

    if (!dialerPortEntry) return;

    const [dialerId, dialerPort] = dialerPortEntry;
    const dialerPoolNum = dialerPort.dialerPool || 1;

    // Find physical Ethernet interface configured with 'pppoe-client dial-pool-number N'
    const physicalEthEntry = Object.entries(state.ports || {}).find(([, p]) =>

      p.pppoeClientDialPool === dialerPoolNum && !p.shutdown
    );

    if (!physicalEthEntry) return;
    const [physPortId] = physicalEthEntry;

    // Find physical connection to PPPoE Server
    const activeConn = connections.find(
      c => c.active &&
        ((c.sourceDeviceId === deviceId && c.sourcePort === physPortId) ||
          (c.targetDeviceId === deviceId && c.targetPort === physPortId))
    );

    if (!activeConn) return;

    const serverDeviceId = activeConn.sourceDeviceId === deviceId ? activeConn.targetDeviceId : activeConn.sourceDeviceId;
    const serverPortId = activeConn.sourceDeviceId === deviceId ? activeConn.targetPort : activeConn.sourcePort;

    const serverState = updatedStates.get(serverDeviceId);
    if (!serverState) return;

    const serverPort = serverState.ports?.[serverPortId];
    if (!serverPort || serverPort.shutdown) return;

    // Server must have 'pppoe enable' or bba-group enabled
    const hasPppoeServer = Boolean(
      serverPort.pppoeEnableGroup ||
      serverState.runningConfig?.some(l => l.includes('bba-group pppoe') || l.includes('pppoe enable'))
    );

    if (!hasPppoeServer) return;

    // 2. Perform PPPoE Discovery (PADI/PADO/PADR/PADS) & LCP/IPCP Negotiation
    const clientMac = state.macAddress || '0050.56C0.0001';
    const serverMac = serverState.macAddress || '0050.56C0.0002';
    const sessionId = 101;

    // LCP CHAP/PAP Authentication
    const authType = dialerPort.pppAuthentication?.toLowerCase().includes('chap') ? 'CHAP' : 'PAP';
    const isAuthenticated = true;


    // IPCP IP Allocation
    const assignedIp = '100.64.1.2';
    const peerIp = serverPort.ipAddress || '100.64.1.1';
    const primaryDns = '8.8.8.8';

    const session: PppoeSession = {
      sessionId,
      clientDeviceId: deviceId,
      clientInterfaceId: dialerId,
      clientMac,
      serverDeviceId,
      serverInterfaceId: serverPortId,
      serverMac,
      discoveryState: 'ESTABLISHED',
      lcpState: 'Opened',
      authProtocol: authType,
      authenticated: isAuthenticated,
      ipcpState: 'Opened',
      assignedIp,
      peerIp,
      primaryDns,
      uptime: 3600
    };

    // Update Client Dialer Interface with Assigned IP
    const clientPorts = { ...state.ports };
    clientPorts[dialerId] = {
      ...dialerPort,
      ipAddress: assignedIp,
      subnetMask: '255.255.255.255',
      status: 'connected',
      shutdown: false,
    };

    const clientSessions = [...(state.pppoeSessions || []).filter(s => s.sessionId !== sessionId), session];

    updatedStates.set(deviceId, {
      ...state,
      ports: clientPorts,
      pppoeSessions: clientSessions,
      defaultGateway: peerIp
    });

    // Update Server Sessions
    const serverSessions = [...(serverState.pppoeSessions || []).filter(s => s.sessionId !== sessionId), session];
    updatedStates.set(serverDeviceId, {
      ...serverState,
      pppoeSessions: serverSessions
    });
  });

  return updatedStates;
}


