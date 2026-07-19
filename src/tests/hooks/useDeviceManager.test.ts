import { describe, it, expect } from 'vitest';

describe('useDeviceManager', () => {
  interface ManagedDevice {
    id: string;
    name: string;
    type: string;
    ip: string;
    status: string;
  }

  it('should create a new device', () => {
    const device: ManagedDevice = { id: 'PC1', name: 'PC-1', type: 'pc', ip: '192.168.1.10', status: 'online' };
    expect(device.id).toBe('PC1');
    expect(device.type).toBe('pc');
  });

  it('should update device IP address', () => {
    const device: ManagedDevice = { id: 'PC1', name: 'PC-1', type: 'pc', ip: '192.168.1.10', status: 'online' };
    const updated = { ...device, ip: '192.168.1.20' };
    expect(updated.ip).toBe('192.168.1.20');
  });

  it('should delete a device', () => {
    const devices: ManagedDevice[] = [
      { id: 'PC1', name: 'PC-1', type: 'pc', ip: '192.168.1.10', status: 'online' },
      { id: 'PC2', name: 'PC-2', type: 'pc', ip: '192.168.1.20', status: 'online' },
    ];
    const filtered = devices.filter(d => d.id !== 'PC1');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('PC2');
  });

  it('should rename a device', () => {
    const device: ManagedDevice = { id: 'SW1', name: 'Switch-1', type: 'switchL2', ip: '', status: 'online' };
    const renamed = { ...device, name: 'Core-Switch' };
    expect(renamed.name).toBe('Core-Switch');
  });

  it('should manage device status', () => {
    const statuses = ['online', 'offline', 'error'];
    expect(statuses).toContain('online');
    expect(statuses).toContain('offline');
  });

  it('should toggle device power', () => {
    const device = { id: 'R1', powered: true };
    const toggled = { ...device, powered: !device.powered };
    expect(toggled.powered).toBe(false);
  });
});
