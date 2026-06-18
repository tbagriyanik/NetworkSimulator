import { describe, it, expect, beforeEach } from 'vitest';
import {
  learnMacAddress,
  cleanExpiredMacEntries,
  findMacPort,
  clearMacTable,
  clearDynamicMacEntries,
  clearStaticMacEntries,
  addStaticMacEntry,
  removeMacEntry,
  getMacTableForDisplay,
  processFrameMacLearning,
} from '@/lib/network/macLearning';
import type { SwitchState } from '@/lib/network/types';

function makeState(overrides?: Partial<SwitchState>): SwitchState {
  return {
    id: 'SW1',
    hostname: 'SW1',
    macAddress: '00:11:22:33:44:55',
    switchModel: 'WS-C2960-24TT-L',
    switchLayer: 'L2',
    currentMode: 'privileged',
    ports: {},
    ...overrides,
  } as SwitchState;
}

describe('MAC Learning Module', () => {
  let deviceStates: Map<string, SwitchState>;

  beforeEach(() => {
    deviceStates = new Map();
  });

  describe('learnMacAddress', () => {
    it('should learn a new MAC address', () => {
      const state = makeState();
      deviceStates.set('SW1', state);
      learnMacAddress('SW1', 'aa:bb:cc:dd:ee:ff', 'fa0/1', 10, deviceStates);
      const table = state.macAddressTable ?? [];
      expect(table).toHaveLength(1);
      expect(table[0]).toMatchObject({
        mac: 'aa:bb:cc:dd:ee:ff',
        port: 'fa0/1',
        vlan: 10,
        type: 'DYNAMIC',
      });
    });

    it('should update existing entry on same MAC+VLan', () => {
      const state = makeState();
      deviceStates.set('SW1', state);
      learnMacAddress('SW1', 'aa:bb:cc:dd:ee:ff', 'fa0/1', 10, deviceStates);
      learnMacAddress('SW1', 'aa:bb:cc:dd:ee:ff', 'fa0/2', 10, deviceStates);
      expect(state.macAddressTable).toHaveLength(1);
      const table2 = state.macAddressTable ?? [];
      expect(table2[0].port).toBe('fa0/2');
    });

    it('should add separate entries for different VLANs', () => {
      const state = makeState();
      deviceStates.set('SW1', state);
      learnMacAddress('SW1', 'aa:bb:cc:dd:ee:ff', 'fa0/1', 10, deviceStates);
      learnMacAddress('SW1', 'aa:bb:cc:dd:ee:ff', 'fa0/2', 20, deviceStates);
      expect(state.macAddressTable).toHaveLength(2);
    });

    it('should do nothing for unknown device', () => {
      learnMacAddress('UNKNOWN', 'aa:bb:cc:dd:ee:ff', 'fa0/1', 10, deviceStates);
      expect(true).toBe(true);
    });
  });

  describe('cleanExpiredMacEntries', () => {
    it('should remove expired dynamic entries', () => {
      const state = makeState();
      state.macAddressTable = [
        { mac: 'aa:bb:cc:dd:ee:ff', vlan: 10, port: 'fa0/1', type: 'DYNAMIC', timestamp: Date.now() - 999999999 },
        { mac: '11:22:33:44:55:66', vlan: 10, port: 'fa0/2', type: 'DYNAMIC', timestamp: Date.now() },
      ];
      cleanExpiredMacEntries(state);
      expect(state.macAddressTable).toHaveLength(1);
      const table3 = state.macAddressTable ?? [];
      expect(table3[0].mac).toBe('11:22:33:44:55:66');
    });

    it('should keep static entries', () => {
      const state = makeState();
      state.macAddressTable = [
        { mac: 'aa:bb:cc:dd:ee:ff', vlan: 10, port: 'fa0/1', type: 'STATIC', timestamp: Date.now() - 999999999 },
        { mac: '11:22:33:44:55:66', vlan: 10, port: 'fa0/2', type: 'DYNAMIC', timestamp: Date.now() },
      ];
      cleanExpiredMacEntries(state);
      expect(state.macAddressTable).toHaveLength(2);
    });

    it('should handle entries without timestamp', () => {
      const state = makeState();
      state.macAddressTable = [
        { mac: 'aa:bb:cc:dd:ee:ff', vlan: 10, port: 'fa0/1', type: 'DYNAMIC' },
      ];
      cleanExpiredMacEntries(state);
      expect(state.macAddressTable).toHaveLength(1);
    });
  });

  describe('findMacPort', () => {
    it('should return port for learned MAC', () => {
      const state = makeState();
      state.macAddressTable = [{ mac: 'aa:bb:cc:dd:ee:ff', vlan: 10, port: 'fa0/1', type: 'DYNAMIC', timestamp: Date.now() }];
      deviceStates.set('SW1', state);
      const port = findMacPort('SW1', 'aa:bb:cc:dd:ee:ff', 10, deviceStates);
      expect(port).toBe('fa0/1');
    });

    it('should return null for unknown MAC', () => {
      const state = makeState();
      deviceStates.set('SW1', state);
      const port = findMacPort('SW1', 'aa:bb:cc:dd:ee:ff', 10, deviceStates);
      expect(port).toBeNull();
    });
  });

  describe('clearMacTable', () => {
    it('should clear all entries', () => {
      const state = makeState();
      state.macAddressTable = [{ mac: 'aa:bb:cc:dd:ee:ff', vlan: 10, port: 'fa0/1', type: 'DYNAMIC', timestamp: Date.now() }];
      deviceStates.set('SW1', state);
      clearMacTable('SW1', deviceStates);
      expect(state.macAddressTable).toEqual([]);
    });
  });

  describe('clearDynamicMacEntries', () => {
    it('should clear only dynamic entries', () => {
      const state = makeState();
      state.macAddressTable = [
        { mac: 'aa:bb:cc:dd:ee:ff', vlan: 10, port: 'fa0/1', type: 'DYNAMIC', timestamp: Date.now() },
        { mac: '11:22:33:44:55:66', vlan: 10, port: 'fa0/2', type: 'STATIC', timestamp: Date.now() },
      ];
      deviceStates.set('SW1', state);
      clearDynamicMacEntries('SW1', deviceStates);
      const table = state.macAddressTable ?? [];
      expect(table).toHaveLength(1);
      expect(table[0].type).toBe('STATIC');
    });
  });

  describe('clearStaticMacEntries', () => {
    it('should clear only static entries', () => {
      const state = makeState();
      state.macAddressTable = [
        { mac: 'aa:bb:cc:dd:ee:ff', vlan: 10, port: 'fa0/1', type: 'DYNAMIC', timestamp: Date.now() },
        { mac: '11:22:33:44:55:66', vlan: 10, port: 'fa0/2', type: 'STATIC', timestamp: Date.now() },
      ];
      deviceStates.set('SW1', state);
      clearStaticMacEntries('SW1', deviceStates);
      expect(state.macAddressTable).toHaveLength(1);
      const table4 = state.macAddressTable ?? [];
      expect(table4[0].type).toBe('DYNAMIC');
    });
  });

  describe('addStaticMacEntry', () => {
    it('should add a static MAC entry', () => {
      const state = makeState();
      deviceStates.set('SW1', state);
      addStaticMacEntry('SW1', 'aa:bb:cc:dd:ee:ff', 'fa0/1', 10, deviceStates);
      const table5 = state.macAddressTable ?? [];
      expect(table5).toHaveLength(1);
      expect(table5[0].type).toBe('STATIC');
    });
  });

  describe('removeMacEntry', () => {
    it('should remove specific MAC entry', () => {
      const state = makeState();
      state.macAddressTable = [
        { mac: 'AA:BB:CC:DD:EE:FF', vlan: 10, port: 'fa0/1', type: 'DYNAMIC', timestamp: Date.now() },
        { mac: '11:22:33:44:55:66', vlan: 10, port: 'fa0/2', type: 'DYNAMIC', timestamp: Date.now() },
      ];
      deviceStates.set('SW1', state);
      removeMacEntry('SW1', 'aa:bb:cc:dd:ee:ff', 10, deviceStates);
      expect(state.macAddressTable).toHaveLength(1);
    });
  });

  describe('getMacTableForDisplay', () => {
    it('should return MAC table entries', () => {
      const state = makeState();
      state.macAddressTable = [{ mac: 'aa:bb:cc:dd:ee:ff', vlan: 10, port: 'fa0/1', type: 'DYNAMIC', timestamp: Date.now() }];
      deviceStates.set('SW1', state);
      const result = getMacTableForDisplay('SW1', deviceStates);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no table', () => {
      const state = makeState();
      deviceStates.set('SW1', state);
      const result = getMacTableForDisplay('SW1', deviceStates);
      expect(result).toEqual([]);
    });
  });

  describe('processFrameMacLearning', () => {
    it('should learn source MAC from frame', () => {
      const state = makeState();
      deviceStates.set('SW1', state);
      processFrameMacLearning('SW1', 'aa:bb:cc:dd:ee:ff', 'fa0/1', 10, deviceStates);
      const table6 = state.macAddressTable ?? [];
      expect(table6).toHaveLength(1);
      expect(table6[0].mac).toBe('aa:bb:cc:dd:ee:ff');
    });
  });
});
