import { describe, it, expect } from 'vitest';
import { wirelessHandlers } from '@/lib/network/core/wirelessCommands';
import { parseCommand, validateCommand } from '@/lib/network/parser';
import { createInitialState } from '@/lib/network/initialState';
import type { SwitchState } from '@/lib/network/types';

const commandContext = { language: 'en' as const, deviceStates: new Map<string, SwitchState>() };

function makeState(overrides: Partial<SwitchState> = {}): SwitchState {
  return {
    ...createInitialState(),
    ...overrides,
  };
}

describe('wirelessCommands', () => {
  it('should enter AP config mode with ap <name> and store nested AP state', () => {
    const state = makeState({ currentMode: 'config' });
    const result = wirelessHandlers.ap(state, 'ap LAP-1', commandContext);

    expect(result.success).toBe(true);
    expect(result.modeChange).toBe('ap-config');
    expect(state.currentApName).toBe('LAP-1');
    expect(state.wlcAps?.['LAP-1']).toBeDefined();
    expect(state.wlcAps?.['LAP-1'].dot11).toBeDefined();
  });

  it('should validate the real AP command syntax through the parser', () => {
    const state = makeState({ deviceType: 'switch', switchLayer: 'L3' });
    const parsed = parseCommand('ap LAP-1', 'config', state);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const validation = validateCommand(parsed, 'config', state);
    expect(validation.valid).toBe(true);
  });

  it('should accept AP nested commands in ap-config mode', () => {
    const state = makeState({
      currentMode: 'ap-config',
      currentApName: 'LAP-1',
      wlcAps: {
        'LAP-1': {
          name: 'LAP-1',
          macAddress: '0000.0000.0000',
          status: 'disconnected',
          dot11: {},
        },
      },
    });

    const macResult = wirelessHandlers['auth-mac'](state, 'auth-mac aaaa.bbbb.cccc', commandContext);
    expect(macResult.success).toBe(true);
    expect(state.wlcAps?.['LAP-1'].macAddress).toBe('aaaa.bbbb.cccc');

    const channelResult = wirelessHandlers['rf-channel'](state, 'rf-channel 44', commandContext);
    expect(channelResult.success).toBe(true);
    expect(state.wlcAps?.['LAP-1'].rfChannel).toBe(44);
    expect(state.wlcAps?.['LAP-1'].dot11?.['5ghz']?.rfChannel).toBe(44);

    const powerResult = wirelessHandlers['dot11 5ghz'](state, 'dot11 5ghz power-constraint 12', commandContext);
    expect(powerResult.success).toBe(true);
    expect(state.wlcAps?.['LAP-1'].dot11?.['5ghz']?.powerConstraint).toBe(12);
    expect(state.wlcAps?.['LAP-1'].power).toBe('12');
  });

  it('should require real world-mode dot11d syntax', () => {
    const state = makeState({ currentMode: 'config' });

    expect(wirelessHandlers['world-mode dot11d'](state, 'world-mode dot11d country-code TR both', commandContext).success).toBe(true);
    expect(state.worldModeDot11d).toBe('country-code TR both');
  });

  it('should bind SSID under dot11 radio config with ssid <name>', () => {
    const state = makeState({
      currentMode: 'dot11-config',
      currentRadio: '0',
      wirelessConfig: {
        CorpWiFi: {
          name: 'CorpWiFi',
          authentication: 'open',
          keyManagement: 'none',
          wpaVersion: 2,
          presharedKey: '',
          encryption: 'none',
          guestMode: false,
        },
      },
      wirelessRadios: {
        '0': {
          id: '0',
          frequency: '2.4GHz',
          channel: 6,
          power: 'full',
          ssid: '',
          encryption: 'none',
          stationRole: 'root',
          shutdown: false,
        },
      },
    });

    const result = wirelessHandlers.ssid(state, 'ssid CorpWiFi', commandContext);
    expect(result.success).toBe(true);
    expect(state.wirelessRadios?.['0'].ssid).toBe('CorpWiFi');
  });

  it('should validate exit in AP config mode', () => {
    const state = makeState({ deviceType: 'switch', switchLayer: 'L3' });
    const parsed = parseCommand('exit', 'ap-config', state);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const validation = validateCommand(parsed, 'ap-config', state);
    expect(validation.valid).toBe(true);
  });
});
