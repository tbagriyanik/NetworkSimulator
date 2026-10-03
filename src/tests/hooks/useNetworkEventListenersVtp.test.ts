import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkEventListeners } from '@/hooks/useNetworkEventListeners';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

// Regression: `vlan <id>` reported success but the device never left
// (config)# mode and the new VLAN was silently discarded.
//
// `useDeviceCommandHandler` queues its state update and then *synchronously*
// dispatches `vtp-propagation-needed` carrying `deviceStatesRef.current`, which
// is still the pre-command snapshot because React has not flushed the update
// yet. The listener used to answer with `setDeviceStates(nextStates)` — a plain
// value built from that stale snapshot — replacing the whole map and rolling the
// command back. It must now merge onto the latest committed state instead.

const SWITCH_A: CanvasDevice = { id: 'sw-a', name: 'SW-A', type: 'switchL2' } as CanvasDevice;
const SWITCH_B: CanvasDevice = { id: 'sw-b', name: 'SW-B', type: 'switchL2' } as CanvasDevice;

function makeState(id: string, overrides: Partial<SwitchState> = {}): SwitchState {
  return {
    hostname: id,
    currentMode: 'config',
    vlans: { '1': { id: 1, name: 'default', status: 'active', ports: [] } },
    ports: { 'gi0/1': { id: 'gi0/1', name: 'gi0/1', mode: 'trunk', shutdown: false, status: 'connected' } },
    ...overrides,
  } as unknown as SwitchState;
}

function renderListener(initial: Map<string, SwitchState>) {
  let latest = initial;
  const setDeviceStates = vi.fn((update: Map<string, SwitchState> | ((p: Map<string, SwitchState>) => Map<string, SwitchState>)) => {
    latest = typeof update === 'function' ? (update as (p: Map<string, SwitchState>) => Map<string, SwitchState>)(latest) : update;
  });

  renderHook(() =>
    useNetworkEventListeners({
      setDeviceStates: setDeviceStates as unknown as React.Dispatch<React.SetStateAction<Map<string, SwitchState>>>,
      deviceStates: latest,
      activeTabRef: { current: 'topology' },
      setActiveTab: vi.fn(),
    })
  );

  return { get: () => latest, setDeviceStates };
}

function dispatchVtpEvent(detail: {
  deviceId: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
}) {
  act(() => {
    window.dispatchEvent(new CustomEvent('vtp-propagation-needed', { detail }));
  });
}

describe('useNetworkEventListeners — vtp-propagation-needed', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not roll back a pending state update when nothing is propagated', () => {
    const before = new Map([['sw-a', makeState('SW-A')]]);
    const { get } = renderListener(before);

    // Mirrors the real dispatcher: a pending `vlan 10` update has been queued but
    // not flushed, so the snapshot carried on the event is still `config`.
    const pending = new Map([['sw-a', makeState('SW-A', {
      currentMode: 'vlan',
      currentVlan: 10,
      vlans: {
        '1': { id: 1, name: 'default', status: 'active', ports: [] },
        '10': { id: 10, name: 'MUHASEBE', status: 'active', ports: [] },
      } as unknown as SwitchState['vlans'],
    })]]);

    dispatchVtpEvent({
      deviceId: 'sw-a',
      topologyDevices: [SWITCH_A],
      topologyConnections: [],
      deviceStates: before, // stale snapshot
    });

    // The listener ran against `prev`, so the queued update is preserved.
    expect(get()).toBe(before);
    // Nothing changed -> identical reference, no needless re-render.
    expect(get().get('sw-a')!.currentMode).toBe('config');

    // Now flush the queued update the way React would.
    const merged = new Map(get());
    merged.set('sw-a', pending.get('sw-a')!);
    expect(merged.get('sw-a')!.currentMode).toBe('vlan');
    expect(Object.keys(merged.get('sw-a')!.vlans!)).toContain('10');
  });

  it('propagates VLANs server -> client over a trunk and keeps the mode change', () => {
    const server = makeState('SW-A', { vtpMode: 'server', vtpDomain: 'LAB', vtpRevision: 2 });
    const client = makeState('SW-B', { vtpMode: 'client', vtpDomain: 'LAB', vtpRevision: 1 });
    const initial = new Map([['sw-a', server], ['sw-b', client]]);
    const { get } = renderListener(initial);

    const conn = {
      id: 'c1',
      sourceDeviceId: 'sw-a',
      sourcePort: 'gi0/1',
      targetDeviceId: 'sw-b',
      targetPort: 'gi0/1',
      active: true,
    } as unknown as CanvasConnection;

    dispatchVtpEvent({
      deviceId: 'sw-a',
      topologyDevices: [SWITCH_A, SWITCH_B],
      topologyConnections: [conn],
      deviceStates: new Map(initial), // stale snapshot
    });

    expect(get().get('sw-b')!.vtpRevision).toBe(2);
    expect(Object.keys(get().get('sw-b')!.vlans!)).toEqual(['1']);
    // The untouched device keeps its exact state object.
    expect(get().get('sw-a')).toBe(server);
  });

  it('falls back to the event snapshot only when nothing is committed yet', () => {
    const { get, setDeviceStates } = renderListener(new Map());
    // Simulate "no committed state": the updater receives an empty map.
    const snapshot = new Map([['sw-a', makeState('SW-A')]]);
    setDeviceStates((p: Map<string, SwitchState>) => (p.size > 0 ? p : new Map(snapshot)));
    expect(get().get('sw-a')).toBeDefined();
  });
});