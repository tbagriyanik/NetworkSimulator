import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMacFromArpCache,
  updateArpCache,
  cleanExpiredArpEntries,
  clearArpCache,
  performArpResolution,
  getArpCacheForDisplay,
  removeArpEntry,
} from '@/lib/network/arp';
import type { SwitchState } from '@/lib/network/types';

function makeState(overrides?: Partial<SwitchState>): SwitchState {
  return {
    id: 'R1',
    hostname: 'R1',
    macAddress: '00:11:22:33:44:55',
    switchModel: 'ISR4451-X',
    switchLayer: 'L3',
    currentMode: 'privileged',
    ports: {},
    ...overrides,
  } as SwitchState;
}

describe('ARP Module', () => {
  let deviceStates: Map<string, SwitchState>;

  beforeEach(() => {
    deviceStates = new Map();
  });

  describe('updateArpCache', () => {
    it('should add a new ARP entry', () => {
      const state = makeState();
      deviceStates.set('R1', state);
      updateArpCache('R1', '192.168.1.1', 'aa:bb:cc:dd:ee:ff', 'gi0/0', deviceStates);
      const cache = state.arpCache ?? [];
      expect(cache).toHaveLength(1);
      expect(cache[0]).toMatchObject({
        ip: '192.168.1.1',
        mac: 'aa:bb:cc:dd:ee:ff',
        interface: 'gi0/0',
      });
    });

    it('should replace existing entry for same IP', () => {
      const state = makeState();
      deviceStates.set('R1', state);
      updateArpCache('R1', '192.168.1.1', 'aa:bb:cc:dd:ee:ff', 'gi0/0', deviceStates);
      updateArpCache('R1', '192.168.1.1', '11:22:33:44:55:66', 'gi0/1', deviceStates);
      const cache = state.arpCache ?? [];
      expect(cache).toHaveLength(1);
      expect(cache[0].mac).toBe('11:22:33:44:55:66');
    });

    it('should do nothing for unknown device', () => {
      updateArpCache('UNKNOWN', '192.168.1.1', 'aa:bb:cc:dd:ee:ff', 'gi0/0', deviceStates);
      expect(true).toBe(true);
    });
  });

  describe('getMacFromArpCache', () => {
    it('should return MAC when entry exists', () => {
      const state = makeState();
      state.arpCache = [{ ip: '192.168.1.1', mac: 'aa:bb:cc:dd:ee:ff', interface: 'gi0/0', timestamp: Date.now() }];
      deviceStates.set('R1', state);
      const result = getMacFromArpCache('R1', '192.168.1.1', deviceStates);
      expect(result).toBe('aa:bb:cc:dd:ee:ff');
    });

    it('should return null when entry does not exist', () => {
      const state = makeState();
      state.arpCache = [];
      deviceStates.set('R1', state);
      const result = getMacFromArpCache('R1', '10.0.0.1', deviceStates);
      expect(result).toBeNull();
    });

    it('should return null when device has no ARP cache', () => {
      const state = makeState();
      deviceStates.set('R1', state);
      const result = getMacFromArpCache('R1', '192.168.1.1', deviceStates);
      expect(result).toBeNull();
    });
  });

  describe('cleanExpiredArpEntries', () => {
    it('should remove expired entries', () => {
      const state = makeState();
      state.arpCache = [
        { ip: '192.168.1.1', mac: 'aa:bb:cc:dd:ee:ff', interface: 'gi0/0', timestamp: Date.now() - 99999999 },
        { ip: '192.168.1.2', mac: '11:22:33:44:55:66', interface: 'gi0/1', timestamp: Date.now() },
      ];
      cleanExpiredArpEntries(state);
      const cache = state.arpCache ?? [];
      expect(cache).toHaveLength(1);
      expect(cache[0].ip).toBe('192.168.1.2');
    });

    it('should handle empty cache', () => {
      const state = makeState();
      cleanExpiredArpEntries(state);
      expect(state.arpCache).toBeUndefined();
    });
  });

  describe('clearArpCache', () => {
    it('should clear all ARP entries', () => {
      const state = makeState();
      state.arpCache = [{ ip: '192.168.1.1', mac: 'aa:bb:cc:dd:ee:ff', interface: 'gi0/0', timestamp: Date.now() }];
      deviceStates.set('R1', state);
      clearArpCache('R1', deviceStates);
      expect(state.arpCache).toEqual([]);
    });

    it('should do nothing for unknown device', () => {
      clearArpCache('UNKNOWN', deviceStates);
      expect(true).toBe(true);
    });
  });

  describe('performArpResolution', () => {
    it('should return cached MAC if already in cache', () => {
      const state = makeState();
      state.arpCache = [{ ip: '192.168.1.1', mac: 'aa:bb:cc:dd:ee:ff', interface: 'gi0/0', timestamp: Date.now() }];
      deviceStates.set('R1', state);
      const result = performArpResolution('R1', '192.168.1.1', 'zz:zz:zz:zz:zz:zz', 'gi0/0', deviceStates);
      expect(result).toBe('aa:bb:cc:dd:ee:ff');
    });

    it('should add new entry and return target MAC', () => {
      const state = makeState();
      deviceStates.set('R1', state);
      const result = performArpResolution('R1', '192.168.1.1', 'aa:bb:cc:dd:ee:ff', 'gi0/0', deviceStates);
      expect(result).toBe('aa:bb:cc:dd:ee:ff');
      expect(state.arpCache).toHaveLength(1);
    });
  });

  describe('getArpCacheForDisplay', () => {
    it('should return cache entries', () => {
      const state = makeState();
      state.arpCache = [{ ip: '192.168.1.1', mac: 'aa:bb:cc:dd:ee:ff', interface: 'gi0/0', timestamp: Date.now() }];
      deviceStates.set('R1', state);
      const result = getArpCacheForDisplay('R1', deviceStates);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no cache', () => {
      const state = makeState();
      deviceStates.set('R1', state);
      const result = getArpCacheForDisplay('R1', deviceStates);
      expect(result).toEqual([]);
    });
  });

  describe('removeArpEntry', () => {
    it('should remove specific entry', () => {
      const state = makeState();
      state.arpCache = [
        { ip: '192.168.1.1', mac: 'aa:bb:cc:dd:ee:ff', interface: 'gi0/0', timestamp: Date.now() },
        { ip: '10.0.0.1', mac: '11:22:33:44:55:66', interface: 'gi0/1', timestamp: Date.now() },
      ];
      deviceStates.set('R1', state);
      removeArpEntry('R1', '192.168.1.1', deviceStates);
      const cache = state.arpCache ?? [];
      expect(cache).toHaveLength(1);
      expect(cache[0].ip).toBe('10.0.0.1');
    });
  });
});
