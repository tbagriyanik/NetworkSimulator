import type { SwitchState } from './types';
import type { CoapFramePayload, MqttFramePayload } from './forwarding/packetFrame';

type AppState = SwitchState & {
  mqttClients?: Record<string, { connected: boolean; subscriptions: string[]; pending?: Record<number, string> }>;
  mqttTopics?: Record<string, string>;
  coapResources?: Record<string, string>;
  coapTransactions?: Record<number, { path: string; retries: number; lastSent: number }>;
};

export function processMqtt(state: SwitchState, payload: MqttFramePayload): { state: SwitchState; response?: MqttFramePayload } {
  const current = state as AppState;
  const next = {
    ...state,
    mqttClients: { ...current.mqttClients },
    mqttTopics: { ...current.mqttTopics },
  } as AppState;
  const clientId = payload.clientId || 'anonymous';
  const client = next.mqttClients![clientId] || { connected: false, subscriptions: [], pending: {} };
  if (payload.type === 'CONNECT') {
    next.mqttClients![clientId] = { ...client, connected: true };
    return { state: next, response: { type: 'CONNACK', clientId } };
  }
  if (!client.connected) return { state: next };
  if (payload.type === 'SUBSCRIBE' && payload.topic) {
    next.mqttClients![clientId] = { ...client, subscriptions: [...new Set([...client.subscriptions, payload.topic])] };
    return { state: next, response: { type: 'SUBACK', clientId, topic: payload.topic } };
  }
  if (payload.type === 'PUBLISH' && payload.topic) {
    next.mqttTopics![payload.topic] = payload.payload || '';
    if (payload.qos === 1 && payload.packetId !== undefined) {
      next.mqttClients![clientId] = { ...client, pending: { ...client.pending, [payload.packetId]: payload.topic } };
      return { state: next, response: { type: 'PUBACK', clientId, packetId: payload.packetId } };
    }
  }
  return { state: next };
}

export function processCoap(state: SwitchState, payload: CoapFramePayload): { state: SwitchState; response: CoapFramePayload } {
  const current = state as AppState;
  const next = {
    ...state,
    coapResources: { ...current.coapResources },
    coapTransactions: { ...current.coapTransactions },
  } as AppState;
  if (payload.code === 'GET') {
    const value = next.coapResources![payload.path];
    next.coapTransactions = { ...next.coapTransactions, [payload.messageId]: { path: payload.path, retries: payload.retry || 0, lastSent: Date.now() } };
    return { state: next, response: { type: 'ACK', code: value === undefined ? '4.04' : '2.05', messageId: payload.messageId, path: payload.path, payload: value, token: payload.token } };
  }
  if (payload.code === 'POST' || payload.code === 'PUT') next.coapResources![payload.path] = payload.payload || '';
  if (payload.code === 'DELETE') delete next.coapResources![payload.path];
  return { state: next, response: { type: 'ACK', code: '2.04', messageId: payload.messageId, path: payload.path } };
}
