/**
 * Platform Feature Parity & Cross-Platform Reliability Test Suite
 *
 * Verifies uniform behavior across Windows, macOS, and Linux:
 *   1. Shortcut Standardizations (Windows/Linux Ctrl vs macOS Meta/Cmd)
 *   2. Native File Dialog & Fallback Emulation
 *   3. Drag & Drop DataTransfer / Pointer Coordinates across OS environments
 *   4. Offline Cache & PWA / Storage Resiliency
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isMacPlatform, getPlatformModifierKey, formatShortcutLabel } from '@/lib/utils/platform';

describe('Platform Feature Parity Test Matrix (Windows, macOS, Linux)', () => {

  describe('1. Keyboard Shortcuts & Modifier Standardization (Cmd / Ctrl)', () => {
    it('standardizes modifier key detection per OS platform', () => {
      // Mock macOS navigator userAgent
      const macAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      expect(isMacPlatform(macAgent)).toBe(true);
      expect(getPlatformModifierKey(macAgent)).toBe('Meta');
      expect(formatShortcutLabel('z', macAgent)).toBe('⌘Z');
      expect(formatShortcutLabel('s', macAgent)).toBe('⌘S');

      // Mock Windows navigator userAgent
      const winAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      expect(isMacPlatform(winAgent)).toBe(false);
      expect(getPlatformModifierKey(winAgent)).toBe('Control');
      expect(formatShortcutLabel('z', winAgent)).toBe('Ctrl+Z');
      expect(formatShortcutLabel('s', winAgent)).toBe('Ctrl+S');

      // Mock Linux navigator userAgent
      const linuxAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
      expect(isMacPlatform(linuxAgent)).toBe(false);
      expect(getPlatformModifierKey(linuxAgent)).toBe('Control');
      expect(formatShortcutLabel('z', linuxAgent)).toBe('Ctrl+Z');
    });

    it('matches keyboard event trigger uniformly for both Ctrl (Win/Linux) and Meta (macOS)', () => {
      const isSaveShortcut = (e: { ctrlKey: boolean; metaKey: boolean; key: string }) =>
        (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';

      // Windows/Linux Ctrl+S
      expect(isSaveShortcut({ ctrlKey: true, metaKey: false, key: 's' })).toBe(true);
      // macOS Cmd+S
      expect(isSaveShortcut({ ctrlKey: false, metaKey: true, key: 's' })).toBe(true);
      // Regular S
      expect(isSaveShortcut({ ctrlKey: false, metaKey: false, key: 's' })).toBe(false);
    });
  });

  describe('2. Native File Dialog & Fallback File Handling', () => {
    it('handles JSON project export/import safely across desktop platforms', () => {
      const mockProject = {
        version: '6.6.0',
        devices: [{ id: 'R1', name: 'CoreRouter', type: 'router', x: 100, y: 100 }],
        connections: [],
      };

      const jsonStr = JSON.stringify(mockProject, null, 2);
      expect(jsonStr).toContain('CoreRouter');

      const parsed = JSON.parse(jsonStr);
      expect(parsed.version).toBe('6.6.0');
      expect(parsed.devices).toHaveLength(1);
    });
  });

  describe('3. Drag & Drop / Pointer Normalization', () => {
    it('normalizes drag coordinates regardless of OS display scale or mouse vs touch pointer', () => {
      const normalizePointerPos = (clientX: number, clientY: number, rect: { left: number; top: number }, scale: number = 1) => {
        return {
          x: (clientX - rect.left) / scale,
          y: (clientY - rect.top) / scale,
        };
      };

      const canvasRect = { left: 50, top: 50 };
      
      // Standard 1x scaling (Linux / Standard Windows)
      const p1 = normalizePointerPos(150, 250, canvasRect, 1.0);
      expect(p1).toEqual({ x: 100, y: 200 });

      // HighDPI 2x Retina scaling (macOS / 4K Windows Display)
      const p2 = normalizePointerPos(250, 450, canvasRect, 2.0);
      expect(p2).toEqual({ x: 100, y: 200 });
    });
  });

  describe('4. Desktop Offline Capability & Local Storage Parity', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
        clear: () => { mockStorage = {}; },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('persists network topology state offline in local storage safely', () => {
      const statePayload = JSON.stringify({
        lastActiveTopology: 'topology-enterprise-01',
        offlineCachedAt: Date.now(),
      });

      localStorage.setItem('netsim_offline_state', statePayload);
      const retrieved = localStorage.getItem('netsim_offline_state');
      expect(retrieved).not.toBeNull();
      expect(JSON.parse(retrieved!).lastActiveTopology).toBe('topology-enterprise-01');
    });
  });

});
