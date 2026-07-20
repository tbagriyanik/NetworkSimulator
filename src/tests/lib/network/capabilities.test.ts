import { describe, it, expect, vi } from 'vitest';
import { getDeviceCapabilities, isWirelessController } from '@/lib/network/capabilities';

vi.mock('@/lib/network/switchModels', () => ({
  isWLCModel: vi.fn((model?: string) => {
    if (model === 'AIR-CT2504-K9') return true;
    return false;
  }),
  canAssignIPToPhysicalPort: vi.fn((model?: string) => {
    if (model === 'WS-C3650-24PS') return true;
    if (model?.includes('ISR')) return true;
    return false;
  }),
}));

describe('getDeviceCapabilities', () => {
  it('should detect router capabilities', () => {
    const result = getDeviceCapabilities({ type: 'router' });
    expect(result.routing).toBe(true);
    expect(result.switching).toBe(false);
    expect(result.firewall).toBe(false);
  });

  it('should detect L2 switch capabilities', () => {
    const result = getDeviceCapabilities({ type: 'switchL2' });
    expect(result.routing).toBe(false);
    expect(result.switching).toBe(true);
    expect(result.firewall).toBe(false);
  });

  it('should detect L3 switch capabilities', () => {
    const result = getDeviceCapabilities({ type: 'switchL3' }, 'WS-C3650-24PS');
    expect(result.routing).toBe(true);
    expect(result.switching).toBe(true);
  });

  it('should detect firewall capabilities', () => {
    const result = getDeviceCapabilities({ type: 'firewall' });
    expect(result.firewall).toBe(true);
    expect(result.routing).toBe(false);
    expect(result.wirelessController).toBe(false);
  });

  it('should detect WLC capabilities', () => {
    const result = getDeviceCapabilities({ type: 'wlc' }, 'AIR-CT2504-K9');
    expect(result.wlc).toBe(true);
    expect(result.wirelessController).toBe(true);
  });

  it('should handle null device', () => {
    const result = getDeviceCapabilities(null);
    expect(result.routing).toBe(false);
    expect(result.switching).toBe(false);
    expect(result.firewall).toBe(false);
  });

  it('should handle undefined device', () => {
    const result = getDeviceCapabilities(undefined);
    expect(result.routing).toBe(false);
  });
});

describe('isWirelessController', () => {
  it('should return true for WLC capabilities', () => {
    const result = isWirelessController({ routing: false, switching: false, firewall: false, wirelessController: true, wlc: true });
    expect(result).toBe(true);
  });

  it('should return false for non-WLC capabilities', () => {
    const result = isWirelessController({ routing: true, switching: false, firewall: false, wirelessController: false, wlc: false });
    expect(result).toBe(false);
  });
});
