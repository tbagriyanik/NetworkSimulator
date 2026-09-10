import { describe, it, expect } from 'vitest';
import { runRootCauseAnalysis } from '@/lib/network/connectivity/networkTroubleshooter';
import { getSmartCliHint } from '@/lib/network/core/smartCliHints';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

describe('Network Troubleshooter & Root Cause Analysis', () => {
  it('should detect when source device is offline', () => {
    const devices: CanvasDevice[] = [
      { id: 'pc-1', name: 'PC1', type: 'pc', x: 0, y: 0, ip: '192.168.1.10', subnet: '255.255.255.0', status: 'offline', ports: [] },
      { id: 'pc-2', name: 'PC2', type: 'pc', x: 100, y: 0, ip: '192.168.1.20', subnet: '255.255.255.0', status: 'online', ports: [] }
    ];
    const connections: CanvasConnection[] = [
      { id: 'c-1', sourceDeviceId: 'pc-1', targetDeviceId: 'pc-2', sourcePort: 'eth0', targetPort: 'eth0', cableType: 'crossover', active: true }
    ];

    const result = runRootCauseAnalysis('pc-1', 'pc-2', devices, connections);
    expect(result.canCommunicate).toBe(false);
    expect(result.issues.some(i => i.id === 'source-offline')).toBe(true);
  });

  it('should detect missing default gateway on different subnets', () => {
    const devices: CanvasDevice[] = [
      { id: 'pc-1', name: 'PC1', type: 'pc', x: 0, y: 0, ip: '192.168.1.10', subnet: '255.255.255.0', status: 'online', ports: [] },
      { id: 'r-1', name: 'Router1', type: 'router', x: 100, y: 0, ip: '192.168.1.1', subnet: '255.255.255.0', status: 'online', ports: [] },
      { id: 'pc-2', name: 'PC2', type: 'pc', x: 200, y: 0, ip: '192.168.2.10', subnet: '255.255.255.0', status: 'online', ports: [] }
    ];
    const connections: CanvasConnection[] = [
      { id: 'c-1', sourceDeviceId: 'pc-1', targetDeviceId: 'r-1', sourcePort: 'eth0', targetPort: 'Gi0/0', cableType: 'straight', active: true },
      { id: 'c-2', sourceDeviceId: 'r-1', targetDeviceId: 'pc-2', sourcePort: 'Gi0/1', targetPort: 'eth0', cableType: 'straight', active: true }
    ];

    const result = runRootCauseAnalysis('pc-1', 'pc-2', devices, connections);
    expect(result.canCommunicate).toBe(false);
    expect(result.issues.some(i => i.id === 'source-no-gateway')).toBe(true);
  });

  it('should detect when devices are on different subnets with no router', () => {
    const devices: CanvasDevice[] = [
      { id: 'pc-1', name: 'PC1', type: 'pc', x: 0, y: 0, ip: '192.168.1.10', subnet: '255.255.255.0', status: 'online', ports: [] },
      { id: 'pc-2', name: 'PC2', type: 'pc', x: 100, y: 0, ip: '192.168.2.20', subnet: '255.255.255.0', status: 'online', ports: [] }
    ];
    const connections: CanvasConnection[] = [
      { id: 'c-1', sourceDeviceId: 'pc-1', targetDeviceId: 'pc-2', sourcePort: 'eth0', targetPort: 'eth0', cableType: 'crossover', active: true }
    ];

    const result = runRootCauseAnalysis('pc-1', 'pc-2', devices, connections);
    expect(result.canCommunicate).toBe(false);
    expect(result.issues.some(i => i.id === 'diff-subnet-no-router')).toBe(true);
  });
});

describe('Smart CLI Hints Engine', () => {
  it('should provide smart hint for incomplete ip address command', () => {
    const hint1 = getSmartCliHint('ip address');
    expect(hint1).toBeDefined();
    expect(hint1?.template).toContain('<IP_ADRESI>');

    const hint2 = getSmartCliHint('ip address 192.168.1.1');
    expect(hint2).toBeDefined();
    expect(hint2?.missingArgs).toContain('<ALT_AG_MASKESI>');

    const hint3 = getSmartCliHint('ip address 192.168.1.1 255.255.255.0');
    expect(hint3).toBeNull();
  });

  it('should provide smart hint for incomplete ip route command', () => {
    const hint = getSmartCliHint('ip route 192.168.2.0 255.255.255.0');
    expect(hint).toBeDefined();
    expect(hint?.missingArgs).toContain('<NEXT_HOP_IP | CIKIS_ARAYUZU>');
  });

  it('should provide smart hint for incomplete switchport commands', () => {
    const hintMode = getSmartCliHint('switchport mode');
    expect(hintMode).toBeDefined();
    expect(hintMode?.template).toContain('access | trunk');

    const hintVlan = getSmartCliHint('switchport access vlan');
    expect(hintVlan).toBeDefined();
    expect(hintVlan?.template).toContain('<VLAN_ID>');
  });
});
