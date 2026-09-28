import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { commandPatterns } from '@/lib/network/parser';
import { createInitialState } from '@/lib/network/initialState';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';

/**
 * NETCONF / MQTT / CoAP control-plane ingress.
 *
 * The regression these guard: `processControlPlaneProtocols` gates on
 * `frame.netconfPayload` / `mqttPayload` / `coapPayload`, and before the CLI
 * ingress commands existed nothing in production constructed a frame carrying
 * one. `netconfSessions`, `mqttClients` and `coapResources` were therefore never
 * written at runtime, leaving the periodic protocol probes dead.
 *
 * These tests assert the state the forwarding engine writes, not the command
 * output string, so they fail if the commands ever bypass the engine again.
 */

type ControlPlaneState = SwitchState & {
  mqttClients?: Record<string, { connected: boolean; subscriptions: string[] }>;
  mqttTopics?: Record<string, string>;
  coapResources?: Record<string, string>;
  netconfSessions?: Record<string, { established: boolean; lastMessageId: string }>;
  netconfYangData?: Record<string, unknown>;
};

const device = {
  id: 'router-1',
  name: 'R1',
  type: 'router',
  ip: '10.0.0.1',
  macAddress: '00:11:22:33:44:55',
  status: 'online',
} as unknown as CanvasDevice;

const devices = [device];
const connections: never[] = [];

function run(state: SwitchState, input: string) {
  return executeCommand(
    state,
    input,
    'en',
    devices,
    connections,
    new Map([['router-1', state]]),
    'router-1'
  );
}

function withNetconfEnabled(): SwitchState {
  const state = createInitialState('00:11:22:33:44:55');
  return { ...state, hostname: 'R1', currentMode: 'privileged', netconfSshEnabled: true, netconfYangEnabled: true };
}

/** Applies a handler's newState the same way useDeviceCommandHandler does. */
function apply(state: SwitchState, result: ReturnType<typeof run>): SwitchState {
  return { ...state, ...result.newState } as SwitchState;
}

describe('command registry wiring', () => {
  const commands = [
    'netconf hello',
    'netconf get',
    'netconf edit-config',
    'netconf close-session',
    'mqtt connect',
    'mqtt subscribe',
    'mqtt publish',
    'coap get',
    'coap put',
    'coap delete',
    'show netconf sessions',
    'show mqtt clients',
    'show mqtt topics',
    'show coap resources',
  ];

  it('every ingress command is registered as a parser pattern', () => {
    const missing = commands.filter((key) => !commandPatterns[key]);
    expect(missing).toEqual([]);
  });

  it('every ingress command is bound to a real handler', async () => {
    const { commandHandlers } = await import('@/lib/network/executor');
    const missing = commands.filter((key) => !commandHandlers[key]);
    expect(missing).toEqual([]);
  });

  it('does not produce the silent no-op on any ingress command', () => {
    const state = withNetconfEnabled();
    for (const input of ['netconf hello 10.0.0.5', 'mqtt connect c1', 'coap put /a b']) {
      const result = run(state, input);
      expect(result.error, `${input} should not error`).toBeUndefined();
    }
  });
});

describe('NETCONF ingress', () => {
  let state: SwitchState;

  beforeEach(() => {
    state = withNetconfEnabled();
  });

  it('hello writes an established session that the probe hook can observe', () => {
    const result = run(state, 'netconf hello 10.0.0.5');
    expect(result.success).toBe(true);

    const next = apply(state, result) as ControlPlaneState;
    expect(next.netconfSessions?.['10.0.0.5']?.established).toBe(true);
    expect(next.netconfSessions?.['10.0.0.5']?.lastMessageId).toBeTruthy();
  });

  it('edit-config mutates the YANG datastore and get reads it back', () => {
    const opened = apply(state, run(state, 'netconf hello 10.0.0.5'));
    const edited = apply(opened, run(opened, 'netconf edit-config 10.0.0.5 /native/interface/Gi0/1 ip:address 10.10.10.1'));
    const stored = (edited as ControlPlaneState).netconfYangData;
    expect(stored?.['ip:address']).toBe('10.10.10.1');

    const got = run(edited, 'netconf get 10.0.0.5');
    expect(got.success).toBe(true);
    expect(got.output).toContain('10.10.10.1');
  });

  it('rejects an odd number of key/value tokens in edit-config', () => {
    const result = run(state, 'netconf edit-config 10.0.0.5 /native/interface/Gi0/1 ip:address');
    expect(result.success).toBe(false);
    expect(result.error).toContain('key value');
  });

  it('close-session clears the established flag', () => {
    const opened = apply(state, run(state, 'netconf hello 10.0.0.5'));
    const closed = apply(opened, run(opened, 'netconf close-session 10.0.0.5'));

    expect((closed as ControlPlaneState).netconfSessions?.['10.0.0.5']?.established).toBe(false);
  });

  it('refuses to inject when the NETCONF SSH server is disabled', () => {
    const disabled = { ...state, netconfSshEnabled: false };
    const result = run(disabled, 'netconf hello 10.0.0.5');

    expect(result.success).toBe(false);
    expect(result.error).toContain('netconf ssh');
    expect((result.newState as ControlPlaneState)?.netconfSessions).toBeUndefined();
  });

  it('get without a session is rejected rather than silently succeeding', () => {
    const result = run(state, 'netconf get 10.0.0.5');
    expect(result.success).toBe(false);
  });
});

describe('MQTT ingress', () => {
  let state: SwitchState;

  beforeEach(() => {
    const initial = createInitialState('00:11:22:33:44:55');
    state = { ...initial, hostname: 'R1', currentMode: 'privileged' };
  });

  it('connect marks the client connected', () => {
    const next = apply(state, run(state, 'mqtt connect sensor-1')) as ControlPlaneState;
    expect(next.mqttClients?.['sensor-1']?.connected).toBe(true);
  });

  it('subscribe records the topic on the connected client', () => {
    const connected = apply(state, run(state, 'mqtt connect sensor-1'));
    const next = apply(connected, run(connected, 'mqtt subscribe sensor-1 factory/temp')) as ControlPlaneState;

    expect(next.mqttClients?.['sensor-1']?.subscriptions).toContain('factory/temp');
  });

  it('publish at QoS 0 stores the retained topic and reports no ack', () => {
    const connected = apply(state, run(state, 'mqtt connect sensor-1'));
    const result = run(connected, 'mqtt publish sensor-1 factory/temp 24.5C');

    expect(result.success).toBe(true);
    const next = apply(connected, result) as ControlPlaneState;
    expect(next.mqttTopics?.['factory/temp']).toBe('24.5C');
  });

  it('publish at QoS 1 is acknowledged with PUBACK', () => {
    const connected = apply(state, run(state, 'mqtt connect sensor-1'));
    const result = run(connected, 'mqtt publish sensor-1 factory/temp 24.5C qos 1');

    expect(result.success).toBe(true);
    expect(result.output).toContain('PUBACK');
  });

  it('keeps spaces in the payload and still parses a trailing qos', () => {
    const connected = apply(state, run(state, 'mqtt connect sensor-1'));
    const result = run(connected, 'mqtt publish sensor-1 a/b hello world qos 0');
    const next = apply(connected, result) as ControlPlaneState;

    expect(next.mqttTopics?.['a/b']).toBe('hello world');
  });

  it('rejects QoS 2 because the simulated broker has no PUBREC handshake', () => {
    const connected = apply(state, run(state, 'mqtt connect sensor-1'));
    const result = run(connected, 'mqtt publish sensor-1 a/b v qos 2');

    expect(result.success).toBe(false);
    expect(result.error).toContain('QoS');
  });

  it('rejects publish from an unconnected client', () => {
    const result = run(state, 'mqtt publish ghost a/b v');
    expect(result.success).toBe(false);
    expect(result.error).toContain('mqtt connect');
  });
});

describe('CoAP ingress', () => {
  let state: SwitchState;

  beforeEach(() => {
    const initial = createInitialState('00:11:22:33:44:55');
    state = { ...initial, hostname: 'R1', currentMode: 'privileged' };
  });

  it('put creates a resource and get returns it', () => {
    const written = apply(state, run(state, 'coap put /actuator/relay1 state=ON'));
    expect((written as ControlPlaneState).coapResources?.['/actuator/relay1']).toBe('state=ON');

    const read = run(written, 'coap get /actuator/relay1');
    expect(read.output).toContain('2.05');
    expect(read.output).toContain('state=ON');
  });

  it('post also stores a resource', () => {
    const written = apply(state, run(state, 'coap post /sensors/temp 24.5'));
    expect((written as ControlPlaneState).coapResources?.['/sensors/temp']).toBe('24.5');
  });

  it('get on a missing path reports 4.04 rather than failing the command', () => {
    const result = run(state, 'coap get /missing');
    expect(result.success).toBe(true);
    expect(result.output).toContain('4.04');
  });

  it('delete removes the resource and a later get returns 4.04', () => {
    const written = apply(state, run(state, 'coap put /a b'));
    const deleted = apply(written, run(written, 'coap delete /a'));

    expect((deleted as ControlPlaneState).coapResources?.['/a']).toBeUndefined();
    expect(run(deleted, 'coap get /a').output).toContain('4.04');
  });
});

describe('inspection commands', () => {
  it('show netconf sessions reports the live session', () => {
    let state = withNetconfEnabled();
    state = apply(state, run(state, 'netconf hello 10.0.0.5'));

    const result = run(state, 'show netconf sessions');
    expect(result.output).toContain('10.0.0.5');
    expect(result.output).toContain('established');
  });

  it('show mqtt clients lists the connected client', () => {
    let state = createInitialState('00:11:22:33:44:55');
    state = { ...state, hostname: 'R1', currentMode: 'privileged' };
    state = apply(state, run(state, 'mqtt connect sensor-1'));

    const result = run(state, 'show mqtt clients');
    expect(result.output).toContain('sensor-1');
    expect(result.output).toContain('connected');
  });

  it('show coap resources lists stored resources', () => {
    let state = createInitialState('00:11:22:33:44:55');
    state = { ...state, hostname: 'R1', currentMode: 'privileged' };
    state = apply(state, run(state, 'coap put /a b'));

    expect(run(state, 'show coap resources').output).toContain('/a');
  });
});

describe('mode and context guards', () => {
  it('rejects ingress commands outside privileged mode', () => {
    const userState = { ...createInitialState('00:11:22:33:44:55'), hostname: 'R1', currentMode: 'user' as const };
    for (const input of ['mqtt connect c1', 'coap get /a', 'netconf hello 10.0.0.5']) {
      expect(run(userState, input).success, input).toBe(false);
    }
  });

  it('reports a clear error when no device context is available', () => {
    const state = { ...createInitialState('00:11:22:33:44:55'), hostname: 'R1', currentMode: 'privileged' as const };
    const result = executeCommand(state, 'mqtt connect c1', 'en');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Device context unavailable');
  });
});
