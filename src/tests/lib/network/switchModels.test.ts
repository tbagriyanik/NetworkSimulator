import { describe, it, expect } from 'vitest';
import {
  getSwitchLayer,
  getSwitchInfo,
  isLayer2Switch,
  isLayer3Switch,
  isRouterModel,
  isWLCModel,
  canAssignIPToPhysicalPort,
  getAvailableSwitchModels,
  SWITCH_MODELS,
} from '@/lib/network/switchModels';

describe('Switch Models Module', () => {
  describe('getSwitchLayer', () => {
    it('should return correct layer for known models', () => {
      expect(getSwitchLayer('NS-L2-24TT-L')).toBe('L2');
      expect(getSwitchLayer('NS-L3-24PS')).toBe('L3');
      expect(getSwitchLayer('NS-FW-5506')).toBe('FW');
      expect(getSwitchLayer('NS-WLC-2504')).toBe('WLC');
    });

    it('should default to L2 for unknown models', () => {
      expect(getSwitchLayer(undefined)).toBe('L2');
      expect(getSwitchLayer('UNKNOWN-MODEL')).toBe('L2');
    });
  });

  describe('getSwitchInfo', () => {
    it('should return info for known models', () => {
      const info = getSwitchInfo('NS-L2-24TT-L');
      expect(info).toBeDefined();
      expect(info?.name).toContain('Layer 2 Switch');
    });

    it('should return undefined for unknown models', () => {
      expect(getSwitchInfo(undefined)).toBeUndefined();
      expect(getSwitchInfo('UNKNOWN')).toBeUndefined();
    });
  });

  describe('isLayer2Switch', () => {
    it('should identify L2 switches', () => {
      expect(isLayer2Switch('NS-L2-24TT-L')).toBe(true);
      expect(isLayer2Switch('NS-L3-24PS')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isLayer2Switch(undefined)).toBe(false);
    });
  });

  describe('isLayer3Switch', () => {
    it('should identify L3 switches and routers', () => {
      expect(isLayer3Switch('NS-L3-24PS')).toBe(true);
      expect(isLayer3Switch('NS-L2-24TT-L')).toBe(false);
      expect(isLayer3Switch('NS-R-4451-X')).toBe(true);
    });

    it('should return false for undefined', () => {
      expect(isLayer3Switch(undefined)).toBe(false);
    });
  });

  describe('isRouterModel', () => {
    it('should identify router models by pattern', () => {
      expect(isRouterModel('NS-R-4451-X')).toBe(true);
      expect(isRouterModel('NS-R-1900-SEC')).toBe(true);
      expect(isRouterModel('NS-R-2900')).toBe(true);
      expect(isRouterModel('NS-R-7200')).toBe(true);
      expect(isRouterModel('NS-R-1001')).toBe(true);
    });

    it('should return false for switch models', () => {
      expect(isRouterModel('NS-L2-24TT-L')).toBe(false);
      expect(isRouterModel('NS-L3-24PS')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRouterModel(undefined)).toBe(false);
    });
  });

  describe('isWLCModel', () => {
    it('should identify WLC models', () => {
      expect(isWLCModel('NS-WLC-2504')).toBe(true);
      expect(isWLCModel('AIR-CT5508-K9')).toBe(true);
    });

    it('should return false for non-WLC models', () => {
      expect(isWLCModel('NS-L2-24TT-L')).toBe(false);
    });
  });

  describe('canAssignIPToPhysicalPort', () => {
    it('should allow IP on L3 switches and routers', () => {
      expect(canAssignIPToPhysicalPort('NS-L3-24PS')).toBe(true);
      expect(canAssignIPToPhysicalPort('NS-R-4451-X')).toBe(true);
    });

    it('should deny IP on L2 switches', () => {
      expect(canAssignIPToPhysicalPort('NS-L2-24TT-L')).toBe(false);
    });

    it('should allow IP on firewall', () => {
      expect(canAssignIPToPhysicalPort('NS-FW-5506')).toBe(true);
    });

    it('should default to true for undefined', () => {
      expect(canAssignIPToPhysicalPort(undefined)).toBe(true);
    });
  });

  describe('getAvailableSwitchModels', () => {
    it('should return all model keys', () => {
      const models = getAvailableSwitchModels();
      expect(models).toEqual(Object.keys(SWITCH_MODELS));
      expect(models).toContain('NS-L2-24TT-L');
      expect(models).toContain('NS-L3-24PS');
      expect(models).toContain('NS-FW-5506');
      expect(models).toContain('NS-WLC-2504');
    });
  });
});
