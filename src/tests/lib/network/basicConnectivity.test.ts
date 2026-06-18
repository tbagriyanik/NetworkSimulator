import { describe, it, expect } from 'vitest';
import { checkBasicL2Connectivity } from '@/lib/network/basicConnectivity';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

describe('checkBasicL2Connectivity', () => {
  const pc1 = { id: 'PC1', name: 'PC-1', type: 'pc', ip: '192.168.1.10', ports: [{ id: 'eth0', status: 'connected' }] } as unknown as CanvasDevice;
  const pc2 = { id: 'PC2', name: 'PC-2', type: 'pc', ip: '192.168.1.20', ports: [{ id: 'eth0', status: 'connected' }] } as unknown as CanvasDevice;
  const sw1 = { id: 'SW1', name: 'SW1', type: 'switchL2', ports: [] } as unknown as CanvasDevice;

  it('should find direct L2 path between devices on same switch', () => {
    const connections = [
      { id: 'c1', sourceDeviceId: 'PC1', targetDeviceId: 'SW1', sourcePort: 'eth0', targetPort: 'fa0/1', cableType: 'straight', active: true },
      { id: 'c2', sourceDeviceId: 'PC2', targetDeviceId: 'SW1', sourcePort: 'eth0', targetPort: 'fa0/2', cableType: 'straight', active: true },
    ] as unknown as CanvasConnection[];

    const result = checkBasicL2Connectivity('PC1', '192.168.1.20', [pc1, pc2, sw1], connections);
    expect(result.success).toBe(true);
    expect(result.hops).toEqual(['PC-1', 'SW1', 'PC-2']);
  });

  it('should fail when target IP is not found', () => {
    const connections = [] as unknown as CanvasConnection[];
    const result = checkBasicL2Connectivity('PC1', '10.0.0.99', [pc1], connections);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Target device not found');
  });

  it('should fail when no path exists', () => {
    const connections = [] as unknown as CanvasConnection[];
    const result = checkBasicL2Connectivity('PC1', '192.168.1.20', [pc1, pc2], connections);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No L2 path');
  });

  it('should ignore inactive connections', () => {
    const connections = [
      { id: 'c1', sourceDeviceId: 'PC1', targetDeviceId: 'SW1', sourcePort: 'eth0', targetPort: 'fa0/1', cableType: 'straight', active: false },
      { id: 'c2', sourceDeviceId: 'PC2', targetDeviceId: 'SW1', sourcePort: 'eth0', targetPort: 'fa0/2', cableType: 'straight', active: true },
    ] as unknown as CanvasConnection[];

    const result = checkBasicL2Connectivity('PC1', '192.168.1.20', [pc1, pc2, sw1], connections);
    expect(result.success).toBe(false);
  });

  it('should find path through multiple switches', () => {
    const sw2 = { id: 'SW2', name: 'SW2', type: 'switchL2', ports: [] } as unknown as CanvasDevice;
    const connections = [
      { id: 'c1', sourceDeviceId: 'PC1', targetDeviceId: 'SW1', sourcePort: 'eth0', targetPort: 'fa0/1', cableType: 'straight', active: true },
      { id: 'c2', sourceDeviceId: 'SW1', targetDeviceId: 'SW2', sourcePort: 'gi0/1', targetPort: 'gi0/1', cableType: 'crossover', active: true },
      { id: 'c3', sourceDeviceId: 'PC2', targetDeviceId: 'SW2', sourcePort: 'eth0', targetPort: 'fa0/1', cableType: 'straight', active: true },
    ] as unknown as CanvasConnection[];

    const result = checkBasicL2Connectivity('PC1', '192.168.1.20', [pc1, pc2, sw1, sw2], connections);
    expect(result.success).toBe(true);
    expect(result.hops).toEqual(['PC-1', 'SW1', 'SW2', 'PC-2']);
  });
});
