import { describe, expect, it } from 'vitest';
import { isSwitchDeviceType, resolveSwitchBootType } from '@/hooks/deviceManager.rules';

describe('device manager rules', () => {
  it('recognizes switch families', () => {
    expect(isSwitchDeviceType('switchL2')).toBe(true);
    expect(isSwitchDeviceType('switchL3')).toBe(true);
    expect(isSwitchDeviceType('router')).toBe(false);
  });
  it('resolves boot type from model', () => {
    expect(resolveSwitchBootType('NS-L3-24PS')).toBe('switchL3');
    expect(resolveSwitchBootType('unknown')).toBe('switchL2');
  });
});
