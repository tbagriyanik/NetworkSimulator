import { describe, it, expect, beforeEach } from 'vitest';
import {
  isRouterAuthenticated,
  setRouterAuthenticated,
  isIotPanelAuthenticated,
  setIotPanelAuthenticated,
  clearAllAdminSessions,
} from '@/lib/network/adminSessionManager';

describe('adminSessionManager', () => {
  beforeEach(() => {
    clearAllAdminSessions();
  });

  describe('Router Authentication', () => {
    it('returns false for unauthenticated router', () => {
      expect(isRouterAuthenticated('router-1')).toBe(false);
    });

    it('sets and gets router authentication state', () => {
      setRouterAuthenticated('router-1', true);
      expect(isRouterAuthenticated('router-1')).toBe(true);
      expect(isRouterAuthenticated('router-2')).toBe(false);

      setRouterAuthenticated('router-1', false);
      expect(isRouterAuthenticated('router-1')).toBe(false);
    });

    it('handles empty deviceId gracefully', () => {
      expect(isRouterAuthenticated('')).toBe(false);
      setRouterAuthenticated('', true);
      expect(isRouterAuthenticated('')).toBe(false);
    });
  });

  describe('IoT Panel Authentication', () => {
    it('returns false for unauthenticated IoT panel', () => {
      expect(isIotPanelAuthenticated()).toBe(false);
    });

    it('sets and gets IoT panel authentication state', () => {
      setIotPanelAuthenticated(true);
      expect(isIotPanelAuthenticated()).toBe(true);

      setIotPanelAuthenticated(false);
      expect(isIotPanelAuthenticated()).toBe(false);
    });
  });

  describe('clearAllAdminSessions', () => {
    it('clears all router and IoT authentication sessions', () => {
      setRouterAuthenticated('router-1', true);
      setRouterAuthenticated('router-2', true);
      setIotPanelAuthenticated(true);

      clearAllAdminSessions();

      expect(isRouterAuthenticated('router-1')).toBe(false);
      expect(isRouterAuthenticated('router-2')).toBe(false);
      expect(isIotPanelAuthenticated()).toBe(false);
    });
  });
});
