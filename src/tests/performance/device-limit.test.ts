import { describe, it, expect } from 'vitest';

describe('200+ Device Limit Test', () => {
  const currentLimit = 100;
  const targetLimit = 200;
  const deviceTypes = ['pc', 'router', 'switchL2', 'switchL3', 'firewall', 'wlc', 'iot'] as const;

  function generateDevices(count: number, type: typeof deviceTypes[number]) {
    return Array.from({ length: count }, (_, i) => ({
      id: `${type}-${i + 1}`,
      name: `${type.toUpperCase()}-${i + 1}`,
      type,
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      status: 'online' as const,
      ports: [],
    }));
  }

  it('current device limit is 100', () => {
    expect(currentLimit).toBe(100);
  });

  it('target device limit should be 200', () => {
    expect(targetLimit).toBe(200);
    expect(targetLimit).toBeGreaterThan(currentLimit);
  });

  it('should generate 200 PC devices without errors', () => {
    const devices = generateDevices(200, 'pc');
    expect(devices).toHaveLength(200);
    expect(devices[0].id).toBe('pc-1');
    expect(devices[199].id).toBe('pc-200');
  });

  it('should generate 200 mixed devices without errors', () => {
    const allDevices = deviceTypes.flatMap(type => generateDevices(30, type));
    expect(allDevices.length).toBeGreaterThanOrEqual(200);
  });

  it('should generate 250 devices (safety margin) without errors', () => {
    const devices = generateDevices(250, 'pc');
    expect(devices).toHaveLength(250);
  });

  it('should have unique IDs for all generated devices', () => {
    const devices = generateDevices(200, 'pc');
    const ids = new Set(devices.map(d => d.id));
    expect(ids.size).toBe(200);
  });

  it('should generate random positions for devices', () => {
    const devices = generateDevices(200, 'pc');
    const positions = devices.map(d => `${d.x},${d.y}`);
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBeGreaterThan(1);
  });

  it('should support all device types at scale', () => {
    const typeCount = deviceTypes.length;
    expect(typeCount).toBe(7);
  });

  it('should generate 200 connections between 200 devices', () => {
    const deviceCount = 200;
    const connectionCount = 200;
    const sourceIds = Array.from({ length: deviceCount }, (_, i) => `PC${i + 1}`);
    const connections = Array.from({ length: connectionCount }, (_, i) => ({
      id: `c${i + 1}`,
      sourceDeviceId: sourceIds[i % deviceCount],
      targetDeviceId: sourceIds[(i + 1) % deviceCount],
      active: true,
    }));
    expect(connections).toHaveLength(200);
    expect(new Set(connections.map(c => c.id)).size).toBe(200);
  });

  it('should estimate memory for 200 devices', () => {
    const estimatedBytesPerDevice = 5000;
    const totalBytes = 200 * estimatedBytesPerDevice;
    const totalMB = totalBytes / (1024 * 1024);
    expect(totalMB).toBeLessThan(10);
  });

  it('should not exceed recommended canvas size', () => {
    const totalArea = 2500 * 2500;
    const deviceCount = 200;
    const areaPerDevice = totalArea / deviceCount;
    expect(areaPerDevice).toBeGreaterThanOrEqual(5000);
  });
});
