import { describe, it, expect } from 'vitest';
import { isRouterModel, isLayer2Switch, isLayer3Switch } from '@/lib/network/switchModels';
import { getDeviceCapabilities } from '@/lib/network/capabilities';
import type { DeviceType } from '@/components/network/networkTopology.types';

describe('Router Identification and Capabilities', () => {
  const routerModels = ['ISR4451-X', 'C1900', 'C2900', 'C7200', 'ASR1001'];
  const l3SwitchModels = ['WS-C3650-24PS'];
  const l2SwitchModels = ['WS-C2960-24TT-L'];

  it('should correctly identify router models', () => {
    routerModels.forEach(model => {
      expect(isRouterModel(model)).toBe(true);
      expect(isLayer2Switch(model)).toBe(false);
      expect(isLayer3Switch(model)).toBe(true); // Routers have L3 capabilities
    });
  });

  it('should correctly identify switch models', () => {
    l3SwitchModels.forEach(model => {
      expect(isRouterModel(model)).toBe(false);
      expect(isLayer2Switch(model)).toBe(false);
      expect(isLayer3Switch(model)).toBe(true);
    });

    l2SwitchModels.forEach(model => {
      expect(isRouterModel(model)).toBe(false);
      expect(isLayer2Switch(model)).toBe(true);
      expect(isLayer3Switch(model)).toBe(false);
    });
  });

  it('should provide routing capability for routers', () => {
    routerModels.forEach(model => {
      const caps = getDeviceCapabilities({ type: 'router' as DeviceType }, model);
      expect(caps.routing).toBe(true);
    });
  });
});
