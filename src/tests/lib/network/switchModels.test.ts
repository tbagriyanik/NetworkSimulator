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
      expect(getSwitchLayer('WS-C2960-24TT-L')).toBe('L2');
      expect(getSwitchLayer('WS-C3650-24PS')).toBe('L3');
      expect(getSwitchLayer('ASA-5506-X')).toBe('FW');
      expect(getSwitchLayer('AIR-CT2504-K9')).toBe('WLC');
    });

    it('should default to L2 for unknown models', () => {
      expect(getSwitchLayer(undefined)).toBe('L2');
      expect(getSwitchLayer('UNKNOWN-MODEL')).toBe('L2');
    });
  });

  describe('getSwitchInfo', () => {
    it('should return info for known models', () => {
      const info = getSwitchInfo('WS-C2960-24TT-L');
      expect(info).toBeDefined();
      expect(info?.name).toContain('Catalyst 2960');
    });

    it('should return undefined for unknown models', () => {
      expect(getSwitchInfo(undefined)).toBeUndefined();
      expect(getSwitchInfo('UNKNOWN')).toBeUndefined();
    });
  });

  describe('isLayer2Switch', () => {
    it('should identify L2 switches', () => {
      expect(isLayer2Switch('WS-C2960-24TT-L')).toBe(true);
      expect(isLayer2Switch('WS-C3650-24PS')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isLayer2Switch(undefined)).toBe(false);
    });
  });

  describe('isLayer3Switch', () => {
    it('should identify L3 switches and routers', () => {
      expect(isLayer3Switch('WS-C3650-24PS')).toBe(true);
      expect(isLayer3Switch('WS-C2960-24TT-L')).toBe(false);
      expect(isLayer3Switch('ISR4451-X')).toBe(true);
    });

    it('should return false for undefined', () => {
      expect(isLayer3Switch(undefined)).toBe(false);
    });
  });

  describe('isRouterModel', () => {
    it('should identify router models by pattern', () => {
      expect(isRouterModel('ISR4451-X')).toBe(true);
      expect(isRouterModel('C1900-SEC')).toBe(true);
      expect(isRouterModel('C2900')).toBe(true);
      expect(isRouterModel('C7200')).toBe(true);
      expect(isRouterModel('ASR1001')).toBe(true);
    });

    it('should return false for switch models', () => {
      expect(isRouterModel('WS-C2960-24TT-L')).toBe(false);
      expect(isRouterModel('WS-C3650-24PS')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRouterModel(undefined)).toBe(false);
    });
  });

  describe('isWLCModel', () => {
    it('should identify WLC models', () => {
      expect(isWLCModel('AIR-CT2504-K9')).toBe(true);
      expect(isWLCModel('AIR-CT5508-K9')).toBe(true);
    });

    it('should return false for non-WLC models', () => {
      expect(isWLCModel('WS-C2960-24TT-L')).toBe(false);
    });
  });

  describe('canAssignIPToPhysicalPort', () => {
    it('should allow IP on L3 switches and routers', () => {
      expect(canAssignIPToPhysicalPort('WS-C3650-24PS')).toBe(true);
      expect(canAssignIPToPhysicalPort('ISR4451-X')).toBe(true);
    });

    it('should deny IP on L2 switches', () => {
      expect(canAssignIPToPhysicalPort('WS-C2960-24TT-L')).toBe(false);
    });

    it('should allow IP on firewall', () => {
      expect(canAssignIPToPhysicalPort('ASA-5506-X')).toBe(true);
    });

    it('should default to true for undefined', () => {
      expect(canAssignIPToPhysicalPort(undefined)).toBe(true);
    });
  });

  describe('getAvailableSwitchModels', () => {
    it('should return all model keys', () => {
      const models = getAvailableSwitchModels();
      expect(models).toEqual(Object.keys(SWITCH_MODELS));
      expect(models).toContain('WS-C2960-24TT-L');
      expect(models).toContain('WS-C3650-24PS');
      expect(models).toContain('ASA-5506-X');
      expect(models).toContain('AIR-CT2504-K9');
    });
  });
});
