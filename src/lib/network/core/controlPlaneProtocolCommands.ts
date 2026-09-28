// Control-plane application protocol ingress: NETCONF, MQTT and CoAP.
//
// These three engines (`netconfTransport.ts`, `applicationProtocols.ts`) were
// previously only reachable from tests: `processControlPlaneProtocols` gates on
// `frame.netconfPayload` / `frame.mqttPayload` / `frame.coapPayload`, and nothing
// in production code ever constructed a frame carrying one of those fields. As a
// result `netconfSessions`, `mqttClients` and `coapResources` were never written
// at runtime, which made the periodic protocol probes in
// `usePeriodicNetworkPackets.ts` dead code.
//
// The commands below close that gap. Each one builds a real `NetworkPacketFrame`
// with the correct L4 port and pushes it through the same
// `processControlPlaneProtocols` seam the forwarding engine uses, so the state
// mutation, the response frame and the periodic probes all light up through one
// code path.
//
// Scope note: these remain command-level simulations. Frames are synthesised
// in-process, not serialised to XML (`netconfTransport.ts` consumes a plain
// object) and never touch a socket, so they are not interoperable with external
// collectors or managers. `realismLevel: 'sim-only'` is surfaced deliberately.

import type { SwitchState, CommandResult } from '../types';
import type { CommandContext, CommandHandler } from './commandTypes';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type {
  NetworkPacketFrame,
  PacketProtocolType,
  MqttFramePayload,
  CoapFramePayload,
  NetconfFramePayload,
} from '../forwarding/packetFrame';
import { processControlPlaneProtocols } from '../forwarding/commonForwardingEngine';
import { cliModeError } from './cliErrors';

/** IANA-assigned ports used by the three protocols. */
const NETCONF_PORT = 830;
const MQTT_PORT = 1883;
const COAP_PORT = 5683;

/**
 * Protocol engines write their per-device feature flags onto the shared
 * `SwitchState` at runtime without declaring them on it. The probe hook in
 * `usePeriodicNetworkPackets.ts` asserts the same shape; keeping the two in
 * sync avoids casting every read through `unknown`.
 */
type ControlPlaneState = SwitchState & {
  mqttClients?: Record<string, { connected: boolean; subscriptions: string[]; pending?: Record<number, string> }>;
  mqttTopics?: Record<string, string>;
  coapResources?: Record<string, string>;
  coapTransactions?: Record<number, { path: string; retries: number; lastSent: number }>;
  netconfSessions?: Record<string, { established: boolean; lastMessageId: string }>;
  netconfYangData?: Record<string, unknown>;
};

/** Monotonic counters for NETCONF message-id and CoAP message-id fields. */
let netconfMessageId = 1000;
let coapMessageId = 2000;

function nextNetconfMessageId(): string {
  netconfMessageId += 1;
  return String(netconfMessageId);
}

function nextCoapMessageId(): number {
  coapMessageId += 1;
  return coapMessageId;
}

/**
 * The CLI runs against a device whose `CanvasDevice` the handler does not
 * receive directly. `sourceDeviceId` is the strongest signal, hostname is the
 * fallback, and a single-device topology degrades to the only device present.
 */
function resolveDevice(ctx: CommandContext, state: SwitchState): CanvasDevice | undefined {
  const devices = ctx.devices;
  if (!devices || devices.length === 0) return undefined;

  if (ctx.sourceDeviceId) {
    const byId = devices.find((device) => device.id === ctx.sourceDeviceId);
    if (byId) return byId;
  }
  if (state.hostname) {
    const byName = devices.find((device) => device.name === state.hostname);
    if (byName) return byName;
  }
  return devices[0];
}

/**
 * Derives a stable locally-administered unicast MAC (02:00:xx:xx:xx), an
 * ephemeral source port and a documentation-range source IP (RFC 5737
 * TEST-NET-2) from the client identity, so repeated commands from the same
 * client keep the same L2/L3/L4 identity the way a real host would.
 */
function clientEndpoint(clientId: string): { mac: string; port: number; ip: string } {
  let hash = 0;
  for (let i = 0; i < clientId.length; i += 1) {
    hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0;
  }
  const octets = [2, 0, (hash >>> 8) & 0xfe, (hash >>> 16) & 0xff, (hash & 0xff) | 0x01];
  const mac = octets.map((part) => part.toString(16).padStart(2, '0')).join(':');
  return { mac, port: 49152 + (hash % 16000), ip: `198.51.100.${1 + (hash % 254)}` };
}

interface FrameSpec {
  protocol: PacketProtocolType;
  srcMac: string;
  srcIp: string;
  srcPort: number;
  dstPort: number;
  length: number;
  info: string;
}

type InjectionResult =
  | { ok: true; updatedState: SwitchState; response?: NetworkPacketFrame }
  | { ok: false; error: string };

/**
 * Builds a control-plane frame for `device` and runs it through the production
 * forwarding seam. The frame is never put on a wire — it is handed straight to
 * `processControlPlaneProtocols`, which is exactly how the periodic pipeline
 * would deliver it had a real client sent one.
 */
function injectFrame(
  state: SwitchState,
  ctx: CommandContext,
  spec: FrameSpec,
  payload: Partial<NetworkPacketFrame>
): InjectionResult {
  const device = resolveDevice(ctx, state);
  if (!device) {
    return {
      ok: false,
      error: ctx.language === 'tr'
        ? '% Cihaz bağlamı bulunamadı; topoloji yüklenmemiş olabilir'
        : '% Device context unavailable; topology may not be loaded',
    };
  }

  const frame: NetworkPacketFrame = {
    id: `cli-cp-${spec.dstPort}-${spec.srcIp}-${Date.now()}`,
    timestamp: Date.now(),
    ingressDeviceId: device.id,
    dstMac: device.macAddress || 'ff:ff:ff:ff:ff:ff',
    etherType: '0x0800',
    dstIp: device.ip,
    ...spec,
    ...payload,
  };
  // `dstIp` is required on a routed control-plane frame, but CanvasDevice.ip is
  // optional, so fall back to the loopback when the device has no address.
  frame.dstIp = frame.dstIp || '127.0.0.1';

  const result = processControlPlaneProtocols(frame, device, state);
  if (!result.handled || !result.updatedState) {
    return {
      ok: false,
      error: ctx.language === 'tr'
        ? `%/ ${spec.dstPort} portu için protokol işleyicisi devreye girmedi`
        : `% No protocol handler engaged for port ${spec.dstPort}`,
    };
  }
  if (result.rejected) {
    return {
      ok: false,
      error: ctx.language === 'tr'
        ? '%/<rpc-error> session-not-established: işlem açık bir NETCONF oturumu gerektirir'
        : '% <rpc-error> session-not-established: operation requires an established NETCONF session',
    };
  }
  return { ok: true, updatedState: result.updatedState, response: result.responseFrame };
}

function netconfGuard(state: SwitchState, ctx: CommandContext): CommandResult | undefined {
  if (state.currentMode !== 'privileged') return { success: false, error: cliModeError() };
  if (!state.netconfSshEnabled) {
    return {
      success: false,
      error: ctx.language === 'tr'
        ? '% NETCONF SSH sunucusu devre dışı; önce "conf t" -> "netconf ssh" çalıştırın'
        : '% NETCONF SSH server is disabled; run "conf t" then "netconf ssh" first',
    };
  }
  return undefined;
}

function formatNetconfData(data: Record<string, unknown> | undefined): string {
  if (!data) return '';
  const entries = Object.entries(data);
  if (entries.length === 0) return '';
  return `\n  data: ${entries.map(([key, value]) => `${key}=${String(value)}`).join(', ')}`;
}

// --- NETCONF RPC injection -------------------------------------------------

export function cmdNetconfHello(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  const guard = netconfGuard(state, ctx);
  if (guard) return guard;
  const match = input.match(/^netconf\s+hello\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid netconf hello syntax' };

  const clientIp = match[1];
  const endpoint = clientEndpoint(clientIp);
  const messageId = nextNetconfMessageId();
  const payload: NetconfFramePayload = { messageId, operation: 'hello' };

  const injected = injectFrame(
    state,
    ctx,
    {
      protocol: 'TCP',
      srcMac: endpoint.mac,
      srcIp: clientIp,
      srcPort: endpoint.port,
      dstPort: NETCONF_PORT,
      length: 96,
      info: `NETCONF <hello> from ${clientIp} (TCP/${NETCONF_PORT})`,
    },
    { netconfPayload: payload }
  );
  if (!injected.ok) return { success: false, error: injected.error };

  return {
    success: true,
    output: `% NETCONF session established from ${clientIp} (TCP/${NETCONF_PORT}) message-id ${messageId}`,
    newState: injected.updatedState,
    realismLevel: 'sim-only',
  };
}

export function cmdNetconfGet(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  const guard = netconfGuard(state, ctx);
  if (guard) return guard;
  const match = input.match(/^netconf\s+get\s+(\S+)(?:\s+(\S+))?$/i);
  if (!match) return { success: false, error: '% Invalid netconf get syntax' };

  const clientIp = match[1];
  const path = match[2];
  const endpoint = clientEndpoint(clientIp);
  const messageId = nextNetconfMessageId();
  const payload: NetconfFramePayload = { messageId, operation: 'get', path };

  const injected = injectFrame(
    state,
    ctx,
    {
      protocol: 'TCP',
      srcMac: endpoint.mac,
      srcIp: clientIp,
      srcPort: endpoint.port,
      dstPort: NETCONF_PORT,
      length: 128,
      info: `NETCONF <get> from ${clientIp} (TCP/${NETCONF_PORT})`,
    },
    { netconfPayload: payload }
  );
  if (!injected.ok) return { success: false, error: injected.error };

  // The engine rejects a `get` outside an established session, so reaching here
  // means the session is open and the datastore read is legitimate.
  const stored = (injected.updatedState as ControlPlaneState).netconfYangData;
  const data = stored && Object.keys(stored).length > 0
    ? `\n  datastore: ${Object.entries(stored).map(([key, value]) => `${key}=${String(value)}`).join(', ')}`
    : '\n  datastore: <empty>';

  return {
    success: true,
    output: `% NETCONF RPC <get> from ${clientIp} -> <ok>${path ? `\n  path: ${path}` : ''}${data}`,
    newState: injected.updatedState,
    realismLevel: 'sim-only',
  };
}

export function cmdNetconfEditConfig(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  const guard = netconfGuard(state, ctx);
  if (guard) return guard;
  const match = input.match(/^netconf\s+edit-config\s+(\S+)\s+(\S+)\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid netconf edit-config syntax' };

  const [, clientIp, path, rest] = match;

  // Remaining tokens are `key value` pairs; a trailing odd token is a key with
  // no value, which YANG would reject — surface it instead of silently dropping.
  const tokens = rest.split(/\s+/);
  if (tokens.length % 2 !== 0) {
    return { success: false, error: '% netconf edit-config expects "key value" pairs' };
  }
  const data: Record<string, string> = {};
  for (let i = 0; i < tokens.length; i += 2) {
    data[tokens[i]] = tokens[i + 1];
  }

  const endpoint = clientEndpoint(clientIp);
  const messageId = nextNetconfMessageId();
  const payload: NetconfFramePayload = { messageId, operation: 'edit-config', path, data };

  const injected = injectFrame(
    state,
    ctx,
    {
      protocol: 'TCP',
      srcMac: endpoint.mac,
      srcIp: clientIp,
      srcPort: endpoint.port,
      dstPort: NETCONF_PORT,
      length: 208,
      info: `NETCONF <edit-config> from ${clientIp} (TCP/${NETCONF_PORT})`,
    },
    { netconfPayload: payload }
  );
  if (!injected.ok) return { success: false, error: injected.error };

  return {
    success: true,
    output: `% NETCONF RPC <edit-config> from ${clientIp} -> <commit>${formatNetconfData(data)}\n  path: ${path}`,
    newState: injected.updatedState,
    realismLevel: 'sim-only',
  };
}

export function cmdNetconfCloseSession(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  const guard = netconfGuard(state, ctx);
  if (guard) return guard;
  const match = input.match(/^netconf\s+close-session\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid netconf close-session syntax' };

  const clientIp = match[1];
  const endpoint = clientEndpoint(clientIp);
  const messageId = nextNetconfMessageId();
  const payload: NetconfFramePayload = { messageId, operation: 'close-session' };

  const injected = injectFrame(
    state,
    ctx,
    {
      protocol: 'TCP',
      srcMac: endpoint.mac,
      srcIp: clientIp,
      srcPort: endpoint.port,
      dstPort: NETCONF_PORT,
      length: 72,
      info: `NETCONF <close-session> from ${clientIp} (TCP/${NETCONF_PORT})`,
    },
    { netconfPayload: payload }
  );
  if (!injected.ok) return { success: false, error: injected.error };

  const runtime = injected.updatedState as ControlPlaneState;
  const stillOpen = Object.values(runtime.netconfSessions || {}).some((session) => session.established);

  return {
    success: true,
    output: stillOpen
      ? `% NETCONF <close-session> processed for ${clientIp}; other sessions remain open`
      : `% NETCONF session closed for ${clientIp}; no sessions remain`,
    newState: injected.updatedState,
    realismLevel: 'sim-only',
  };
}

// --- MQTT injection --------------------------------------------------------

export function cmdMqttConnect(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'privileged') return { success: false, error: cliModeError() };
  const match = input.match(/^mqtt\s+connect\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid mqtt connect syntax' };

  const clientId = match[1];
  const endpoint = clientEndpoint(clientId);
  const payload: MqttFramePayload = { type: 'CONNECT', clientId };

  const injected = injectFrame(
    state,
    ctx,
    {
      protocol: 'TCP',
      srcMac: endpoint.mac,
      srcIp: endpoint.ip,
      srcPort: endpoint.port,
      dstPort: MQTT_PORT,
      length: 24,
      info: `MQTT CONNECT client "${clientId}" (TCP/${MQTT_PORT})`,
    },
    { mqttPayload: payload }
  );
  if (!injected.ok) return { success: false, error: injected.error };

  return {
    success: true,
    output: `% MQTT CONNECT client "${clientId}" -> CONNACK (TCP/${MQTT_PORT})`,
    newState: injected.updatedState,
    realismLevel: 'sim-only',
  };
}

export function cmdMqttSubscribe(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'privileged') return { success: false, error: cliModeError() };
  const match = input.match(/^mqtt\s+subscribe\s+(\S+)\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid mqtt subscribe syntax' };

  const [, clientId, topic] = match;
  const endpoint = clientEndpoint(clientId);
  const payload: MqttFramePayload = { type: 'SUBSCRIBE', clientId, topic };

  const injected = injectFrame(
    state,
    ctx,
    {
      protocol: 'TCP',
      srcMac: endpoint.mac,
      srcIp: endpoint.ip,
      srcPort: endpoint.port,
      dstPort: MQTT_PORT,
      length: 40,
      info: `MQTT SUBSCRIBE client "${clientId}" topic "${topic}"`,
    },
    { mqttPayload: payload }
  );
  if (!injected.ok) return { success: false, error: injected.error };

  if (!injected.response) {
    return {
      success: false,
      error: ctx.language === 'tr'
        ? `%/ MQTT istemcisi "${clientId}" bağlı değil; önce "mqtt connect ${clientId}" çalıştırın`
        : `% MQTT client "${clientId}" is not connected; run "mqtt connect ${clientId}" first`,
    };
  }

  return {
    success: true,
    output: `% MQTT SUBSCRIBE client "${clientId}" topic "${topic}" -> SUBACK`,
    newState: injected.updatedState,
    realismLevel: 'sim-only',
  };
}

export function cmdMqttPublish(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'privileged') return { success: false, error: cliModeError() };
  const match = input.match(/^mqtt\s+publish\s+(\S+)\s+(\S+)\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid mqtt publish syntax' };

  const [, clientId, topic, rest] = match;
  // The payload may contain spaces, so a trailing `qos N` is peeled off the end
  // rather than parsed as a positional argument.
  const qosMatch = rest.match(/^(.*)\s+qos\s+([012])$/i);
  const messagePayload = qosMatch ? qosMatch[1] : rest;
  const qos = (qosMatch ? Number(qosMatch[2]) : 0) as 0 | 1 | 2;

  if (qos === 2) {
    return {
      success: false,
      error: ctx.language === 'tr'
        ? '% Simüle MQTT broker yalnızca QoS 0 ve QoS 1 uygular (PUBREC/PUBREL el sıkışması yok)'
        : '% Simulated MQTT broker implements QoS 0 and QoS 1 only (no PUBREC/PUBREL handshake)',
    };
  }

  const endpoint = clientEndpoint(clientId);
  const packetId = qos === 0 ? undefined : 1000 + (endpoint.port % 1000);

  const payload: MqttFramePayload = {
    type: 'PUBLISH',
    clientId,
    topic,
    payload: messagePayload,
    qos,
    packetId,
  };

  const injected = injectFrame(
    state,
    ctx,
    {
      protocol: 'TCP',
      srcMac: endpoint.mac,
      srcIp: endpoint.ip,
      srcPort: endpoint.port,
      dstPort: MQTT_PORT,
      length: 32 + messagePayload.length,
      info: `MQTT PUBLISH client "${clientId}" topic "${topic}" qos ${qos}`,
    },
    { mqttPayload: payload }
  );
  if (!injected.ok) return { success: false, error: injected.error };

  if (!injected.response) {
    // QoS 0 is fire-and-forget, and the engine also stays silent for an
    // unconnected client. Distinguish the two by reading the client back.
    const runtime = injected.updatedState as ControlPlaneState;
    const connected = runtime.mqttClients?.[clientId]?.connected;
    if (!connected) {
      return {
        success: false,
        error: ctx.language === 'tr'
          ? `%/ MQTT istemcisi "${clientId}" bağlı değil; önce "mqtt connect ${clientId}" çalıştırın`
          : `% MQTT client "${clientId}" is not connected; run "mqtt connect ${clientId}" first`,
      };
    }
    return {
      success: true,
      output: `% MQTT PUBLISH client "${clientId}" topic "${topic}" qos 0 (fire-and-forget, no acknowledgement)`,
      newState: injected.updatedState,
      realismLevel: 'sim-only',
    };
  }

  return {
    success: true,
    output: `% MQTT PUBLISH client "${clientId}" topic "${topic}" qos ${qos} packet-id ${packetId} -> PUBACK`,
    newState: injected.updatedState,
    realismLevel: 'sim-only',
  };
}

// --- CoAP injection --------------------------------------------------------

function runCoap(
  state: SwitchState,
  ctx: CommandContext,
  code: CoapFramePayload['code'],
  path: string,
  value: string | undefined,
  info: string
): { ok: true; result: CommandResult } | { ok: false; error: string } {
  const endpoint = clientEndpoint(path);
  const messageId = nextCoapMessageId();
  const payload: CoapFramePayload = {
    type: 'CON',
    code,
    messageId,
    path,
    payload: value,
    token: `t${messageId}`,
  };

  const injected = injectFrame(
    state,
    ctx,
    {
      protocol: 'UDP',
      srcMac: endpoint.mac,
      srcIp: endpoint.ip,
      srcPort: endpoint.port,
      dstPort: COAP_PORT,
      length: 48 + (value ? value.length : 0),
      info,
    },
    { coapPayload: payload }
  );
  if (!injected.ok) return { ok: false, error: injected.error };

  const response = injected.response?.coapPayload;
  if (!response) {
    return { ok: false, error: '% CoAP engine returned no response' };
  }
  return {
    ok: true,
    result: {
      success: true,
      output: `% ${info} -> ACK ${response.code}${response.payload !== undefined ? `\n  payload: ${response.payload}` : ''}`,
      newState: injected.updatedState,
      realismLevel: 'sim-only',
    },
  };
}

export function cmdCoapGet(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'privileged') return { success: false, error: cliModeError() };
  const match = input.match(/^coap\s+get\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid coap get syntax' };

  const path = match[1];
  const outcome = runCoap(state, ctx, 'GET', path, undefined, `CoAP CON GET ${path} (UDP/${COAP_PORT})`);
  if (!outcome.ok) return { success: false, error: outcome.error };

  // A 4.04 from the engine is a legitimate protocol answer, not a CLI failure.
  return outcome.result;
}

export function cmdCoapPut(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'privileged') return { success: false, error: cliModeError() };
  const match = input.match(/^coap\s+(put|post)\s+(\S+)\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid coap put syntax' };

  const [, verb, path, value] = match;
  const code: CoapFramePayload['code'] = verb.toLowerCase() === 'post' ? 'POST' : 'PUT';
  const outcome = runCoap(state, ctx, code, path, value, `CoAP CON ${code} ${path} (UDP/${COAP_PORT})`);
  if (!outcome.ok) return { success: false, error: outcome.error };
  return outcome.result;
}

export function cmdCoapDelete(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'privileged') return { success: false, error: cliModeError() };
  const match = input.match(/^coap\s+delete\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid coap delete syntax' };

  const path = match[1];
  const outcome = runCoap(state, ctx, 'DELETE', path, undefined, `CoAP CON DELETE ${path} (UDP/${COAP_PORT})`);
  if (!outcome.ok) return { success: false, error: outcome.error };
  return outcome.result;
}

// --- Inspection ------------------------------------------------------------

export const cmdShowNetconfSessions: CommandHandler = (state, _input, ctx) => {
  if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
    return { success: false, error: cliModeError() };
  }
  const runtime = state as ControlPlaneState;
  const sessions = Object.entries(runtime.netconfSessions || {});

  let output = `netconf-yang status: ${state.netconfYangEnabled ? 'running' : 'disabled'}\n`;
  output += `netconf ssh port ${NETCONF_PORT}: ${state.netconfSshEnabled ? 'listening' : 'disabled'}\n`;
  output += `sessions: ${sessions.length}\n`;

  if (sessions.length > 0) {
    for (const [client, session] of sessions) {
      const status = session.established
        ? (ctx.language === 'tr' ? 'açık' : 'established')
        : (ctx.language === 'tr' ? 'kapalı' : 'closed');
      output += `  ${client}  ${status}  last-message-id ${session.lastMessageId}\n`;
    }
  }

  const datastore = runtime.netconfYangData;
  if (datastore && Object.keys(datastore).length > 0) {
    output += `datastore:\n`;
    for (const [key, value] of Object.entries(datastore)) {
      output += `  ${key} = ${String(value)}\n`;
    }
  }

  return { success: true, output: output.trimEnd(), realismLevel: 'sim-only' };
};

export const cmdShowMqttClients: CommandHandler = (state, _input, ctx) => {
  if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
    return { success: false, error: cliModeError() };
  }
  const runtime = state as ControlPlaneState;
  const clients = Object.entries(runtime.mqttClients || {});

  let output = `MQTT broker on port ${MQTT_PORT}\n`;
  output += `clients: ${clients.length}\n`;

  if (clients.length > 0) {
    for (const [clientId, client] of clients) {
      const status = client.connected
        ? (ctx.language === 'tr' ? 'bağlı' : 'connected')
        : (ctx.language === 'tr' ? 'bağlantı kesildi' : 'disconnected');
      const pending = Object.keys(client.pending || {}).length;
      output += `  ${clientId}  ${status}  subscriptions: ${client.subscriptions.length}  pending: ${pending}\n`;
      for (const topic of client.subscriptions) {
        output += `    topic: ${topic}\n`;
      }
    }
  }

  return { success: true, output: output.trimEnd(), realismLevel: 'sim-only' };
};

export const cmdShowMqttTopics: CommandHandler = (state, _input, _ctx) => {
  if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
    return { success: false, error: cliModeError() };
  }
  const runtime = state as ControlPlaneState;
  const topics = Object.entries(runtime.mqttTopics || {});

  let output = `retained topics: ${topics.length}\n`;
  for (const [topic, value] of topics) {
    output += `  ${topic} = ${value}\n`;
  }
  return { success: true, output: output.trimEnd(), realismLevel: 'sim-only' };
};

export const cmdShowCoapResources: CommandHandler = (state, _input, _ctx) => {
  if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
    return { success: false, error: cliModeError() };
  }
  const runtime = state as ControlPlaneState;
  const resources = Object.entries(runtime.coapResources || {});

  let output = `CoAP server on port ${COAP_PORT}\n`;
  output += `resources: ${resources.length}\n`;
  for (const [path, value] of resources) {
    output += `  ${path} = ${value}\n`;
  }
  return { success: true, output: output.trimEnd(), realismLevel: 'sim-only' };
};

/** Ingress handlers (exec mode) and the inspection handlers they feed. */
export const controlPlaneProtocolHandlers: Record<string, CommandHandler> = {
  'netconf hello': cmdNetconfHello,
  'netconf get': cmdNetconfGet,
  'netconf edit-config': cmdNetconfEditConfig,
  'netconf close-session': cmdNetconfCloseSession,
  'mqtt connect': cmdMqttConnect,
  'mqtt subscribe': cmdMqttSubscribe,
  'mqtt publish': cmdMqttPublish,
  'coap get': cmdCoapGet,
  'coap put': cmdCoapPut,
  'coap delete': cmdCoapDelete,
  'show netconf sessions': cmdShowNetconfSessions,
  'show mqtt clients': cmdShowMqttClients,
  'show mqtt topics': cmdShowMqttTopics,
  'show coap resources': cmdShowCoapResources,
};
