import type { SwitchState } from './types';
import type { NetconfFramePayload } from './forwarding/packetFrame';
import {
  extractNetconfConfig,
  extractNetconfOperationalState,
  applyNetconfEditConfig,
  commitNetconfConfig,
} from './netconfStateSync';

type RuntimeState = SwitchState & { netconfSessions?: Record<string, { established: boolean; lastMessageId: string }> };

export function processNetconfFrame(
  state: SwitchState,
  source: string,
  request: NetconfFramePayload
): { state: SwitchState; response: NetconfFramePayload; error?: string } {
  let next = { ...state } as RuntimeState;
  const session = next.netconfSessions?.[source];
  const established = session?.established === true;

  // RFC 6241: capability exchange handshake to open session
  if (request.operation === 'hello') {
    next.netconfSessions = { ...next.netconfSessions, [source]: { established: true, lastMessageId: request.messageId } };
    return { state: next, response: { messageId: request.messageId, operation: 'hello' } };
  }

  if (!established) {
    return { state, response: { messageId: request.messageId, operation: request.operation }, error: 'no-session' };
  }

  next.netconfSessions = { ...next.netconfSessions, [source]: { established: true, lastMessageId: request.messageId } };

  if (request.operation === 'close-session') {
    next.netconfSessions[source] = { established: false, lastMessageId: request.messageId };
    return { state: next, response: { messageId: request.messageId, operation: 'close-session' } };
  }

  if (request.operation === 'get-config') {
    const configData = extractNetconfConfig(next, request.path);
    return {
      state: next,
      response: {
        messageId: request.messageId,
        operation: 'get-config',
        path: request.path,
        data: configData as Record<string, string | number | boolean>,
      },
    };
  }

  if (request.operation === 'get') {
    const operData = extractNetconfOperationalState(next, request.path);
    return {
      state: next,
      response: {
        messageId: request.messageId,
        operation: 'get',
        path: request.path,
        data: operData as Record<string, string | number | boolean>,
      },
    };
  }

  if (request.operation === 'edit-config' && request.data) {
    (next as SwitchState & { netconfYangData?: Record<string, unknown> }).netconfYangData = {
      ...((next as SwitchState & { netconfYangData?: Record<string, unknown> }).netconfYangData),
      ...request.data,
    };
    const result = applyNetconfEditConfig(next, request.data, request.path);
    next = result.nextState as RuntimeState;
    return {
      state: next,
      response: {
        messageId: request.messageId,
        operation: 'commit',
        path: request.path,
        data: request.data,
      },
    };
  }

  if (request.operation === 'commit') {
    next = commitNetconfConfig(next) as RuntimeState;
    return {
      state: next,
      response: {
        messageId: request.messageId,
        operation: 'commit',
      },
    };
  }

  return {
    state: next,
    response: {
      messageId: request.messageId,
      operation: request.operation,
      path: request.path,
      data: request.data,
    },
  };
}
