import { describe, it, expect } from 'vitest';
import { checkConnectivity } from '@/lib/network/connectivity';
import { getPingDiagnostics, checkDeviceConnectivity } from '@/lib/network/connectivity/pingDiagnostics';
import { cmdPing } from '@/lib/network/core/privilegedConnectivity';
import { runRootCauseAnalysis } from '@/lib/network/connectivity/networkTroubleshooter';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { createInitialState } from '@/lib/network/initialState';

describe('IP and MAC Conflict Handling in Ping and Diagnostics', () => {
  const directConnection: CanvasConnection = {
    id: 'conn-1',
    sourceDeviceId: 'pc-1',
    targetDeviceId: 'pc-2',
    sourcePort: 'eth0',
    targetPort: 'eth0',
    cableType: 'crossover',
    active: true,
  };

  it('should fail ping with IP conflict error when two devices have the same IP address', () => {
    const pc1: CanvasDevice = {
      id: 'pc-1',
      name: 'PC-1',
      type: 'pc',
      ip: '192.168.1.10',
      subnet: '255.255.255.0',
      macAddress: '00-50-79-66-68-01',
      ports: [{ id: 'eth0', label: 'FastEthernet0/0', status: 'connected', type: 'fastEthernet' }],
      x: 100,
      y: 100,
      status: 'online',
    };

    const pc2: CanvasDevice = {
      id: 'pc-2',
      name: 'PC-2',
      type: 'pc',
      ip: '192.168.1.10', // SAME IP!
      subnet: '255.255.255.0',
      macAddress: '00-50-79-66-68-02',
      ports: [{ id: 'eth0', label: 'FastEthernet0/0', status: 'connected', type: 'fastEthernet' }],
      x: 300,
      y: 100,
      status: 'online',
    };

    const devices = [pc1, pc2];
    const connections = [directConnection];

    // checkConnectivity from pc-1 to 192.168.1.10
    const trRes = checkConnectivity('pc-1', '192.168.1.10', devices, connections, undefined, 'tr');
    expect(trRes.success).toBe(false);
    expect(trRes.error).toContain('IP adresi çakışması');

    const enRes = checkConnectivity('pc-1', '192.168.1.10', devices, connections, undefined, 'en');
    expect(enRes.success).toBe(false);
    expect(enRes.error).toContain('IP address conflict');

    // getPingDiagnostics
    const trDiag = getPingDiagnostics('pc-1', '192.168.1.10', devices, connections, undefined, 'tr');
    expect(trDiag.success).toBe(false);
    expect(trDiag.reasons[0]).toContain('IP adresi çakışması');

    // checkDeviceConnectivity
    const devConn = checkDeviceConnectivity('pc-1', 'pc-2', devices, connections);
    expect(devConn.success).toBe(false);
    expect(devConn.error).toContain('IP adresi çakışması');

    // Network Troubleshooter (Root Cause Analysis)
    const rootCause = runRootCauseAnalysis('pc-1', 'pc-2', devices, connections);
    expect(rootCause.canCommunicate).toBe(false);
    expect(rootCause.issues.some(i => i.id === 'ip-conflict')).toBe(true);
  });

  it('should fail ping with MAC conflict error when two devices have the same MAC address', () => {
    const pc1: CanvasDevice = {
      id: 'pc-1',
      name: 'PC-1',
      type: 'pc',
      ip: '192.168.1.10',
      subnet: '255.255.255.0',
      macAddress: '00-50-79-66-68-AA',
      ports: [{ id: 'eth0', label: 'FastEthernet0/0', status: 'connected', type: 'fastEthernet' }],
      x: 100,
      y: 100,
      status: 'online',
    };

    const pc2: CanvasDevice = {
      id: 'pc-2',
      name: 'PC-2',
      type: 'pc',
      ip: '192.168.1.20', // Different IP
      subnet: '255.255.255.0',
      macAddress: '00:50:79:66:68:aa', // SAME MAC in colon notation
      ports: [{ id: 'eth0', label: 'FastEthernet0/0', status: 'connected', type: 'fastEthernet' }],
      x: 300,
      y: 100,
      status: 'online',
    };

    const devices = [pc1, pc2];
    const connections = [directConnection];

    // checkConnectivity from pc-1 to 192.168.1.20
    const trRes = checkConnectivity('pc-1', '192.168.1.20', devices, connections, undefined, 'tr');
    expect(trRes.success).toBe(false);
    expect(trRes.error).toContain('MAC adresi çakışması');

    const enRes = checkConnectivity('pc-1', '192.168.1.20', devices, connections, undefined, 'en');
    expect(enRes.success).toBe(false);
    expect(enRes.error).toContain('MAC address conflict');

    // getPingDiagnostics
    const trDiag = getPingDiagnostics('pc-1', '192.168.1.20', devices, connections, undefined, 'tr');
    expect(trDiag.success).toBe(false);
    expect(trDiag.reasons[0]).toContain('MAC adresi çakışması');

    // checkDeviceConnectivity
    const devConn = checkDeviceConnectivity('pc-1', 'pc-2', devices, connections);
    expect(devConn.success).toBe(false);
    expect(devConn.error).toContain('MAC adresi çakışması');

    // Network Troubleshooter (Root Cause Analysis)
    const rootCause = runRootCauseAnalysis('pc-1', 'pc-2', devices, connections);
    expect(rootCause.canCommunicate).toBe(false);
    expect(rootCause.issues.some(i => i.id === 'mac-conflict')).toBe(true);
  });

  it('should fail ping with IP and MAC conflict error when both IP and MAC are identical', () => {
    const pc1: CanvasDevice = {
      id: 'pc-1',
      name: 'PC-1',
      type: 'pc',
      ip: '192.168.1.10',
      subnet: '255.255.255.0',
      macAddress: '00-50-79-66-68-99',
      ports: [{ id: 'eth0', label: 'FastEthernet0/0', status: 'connected', type: 'fastEthernet' }],
      x: 100,
      y: 100,
      status: 'online',
    };

    const pc2: CanvasDevice = {
      id: 'pc-2',
      name: 'PC-2',
      type: 'pc',
      ip: '192.168.1.10', // SAME IP
      subnet: '255.255.255.0',
      macAddress: '00-50-79-66-68-99', // SAME MAC
      ports: [{ id: 'eth0', label: 'FastEthernet0/0', status: 'connected', type: 'fastEthernet' }],
      x: 300,
      y: 100,
      status: 'online',
    };

    const devices = [pc1, pc2];
    const connections = [directConnection];

    const trRes = checkConnectivity('pc-1', '192.168.1.10', devices, connections, undefined, 'tr');
    expect(trRes.success).toBe(false);
    expect(trRes.error).toContain('IP ve MAC adresi çakışması');

    const enRes = checkConnectivity('pc-1', '192.168.1.10', devices, connections, undefined, 'en');
    expect(enRes.success).toBe(false);
    expect(enRes.error).toContain('IP and MAC address conflict');
  });

  it('should fail CLI ping (cmdPing) with Drop Reason indicating the address conflict', () => {
    const pc1: CanvasDevice = {
      id: 'pc-1',
      name: 'PC-1',
      type: 'pc',
      ip: '192.168.1.10',
      subnet: '255.255.255.0',
      macAddress: '00-50-79-66-68-01',
      ports: [{ id: 'eth0', label: 'FastEthernet0/0', status: 'connected', type: 'fastEthernet' }],
      x: 100,
      y: 100,
      status: 'online',
    };

    const pc2: CanvasDevice = {
      id: 'pc-2',
      name: 'PC-2',
      type: 'pc',
      ip: '192.168.1.10', // IP conflict
      subnet: '255.255.255.0',
      macAddress: '00-50-79-66-68-02',
      ports: [{ id: 'eth0', label: 'FastEthernet0/0', status: 'connected', type: 'fastEthernet' }],
      x: 300,
      y: 100,
      status: 'online',
    };

    const dummyState: SwitchState = createInitialState('00:50:79:66:68:01', 'NS-L2-24TT-L');
    dummyState.currentMode = 'privileged';

    const ctx = {
      sourceDeviceId: 'pc-1',
      devices: [pc1, pc2],
      connections: [directConnection],
      deviceStates: new Map<string, SwitchState>(),
      language: 'tr' as const,
    };

    const pingResult = cmdPing(dummyState, 'ping 192.168.1.10', ctx);
    expect(pingResult.success).toBe(false);
    expect(pingResult.output).toContain('IP adresi çakışması');
  });

  it('should succeed ping when devices have unique IPs and unique MACs', () => {
    const pc1: CanvasDevice = {
      id: 'pc-1',
      name: 'PC-1',
      type: 'pc',
      ip: '192.168.1.10',
      subnet: '255.255.255.0',
      macAddress: '00-50-79-66-68-01',
      ports: [{ id: 'eth0', label: 'FastEthernet0/0', status: 'connected', type: 'fastEthernet' }],
      x: 100,
      y: 100,
      status: 'online',
    };

    const pc2: CanvasDevice = {
      id: 'pc-2',
      name: 'PC-2',
      type: 'pc',
      ip: '192.168.1.20',
      subnet: '255.255.255.0',
      macAddress: '00-50-79-66-68-02',
      ports: [{ id: 'eth0', label: 'FastEthernet0/0', status: 'connected', type: 'fastEthernet' }],
      x: 300,
      y: 100,
      status: 'online',
    };

    const devices = [pc1, pc2];
    const connections = [directConnection];

    const result = checkConnectivity('pc-1', '192.168.1.20', devices, connections, undefined, 'tr');
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

